const http = require('http')
const crypto = require('crypto')
const { spawn } = require('child_process')

const PORT = Number(process.env.PORT || 9000)
const HOST = process.env.HOST || '127.0.0.1'
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || ''
const DEPLOY_DIR = process.env.DEPLOY_DIR || '/srv/vite-app'
const DIST_DIR = process.env.DIST_DIR || '/var/www/vite-app'

function hmacSha256(secret, bodyBuffer) {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(bodyBuffer)
  return `sha256=${hmac.digest('hex')}`
}

function safeEqual(a, b) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

function runDeploy() {
  const cmd = [
    'set -euo pipefail',
    `cd "${DEPLOY_DIR}"`,
    'git fetch --all --prune',
    'git reset --hard origin/main',
    'pnpm install --frozen-lockfile',
    'pnpm run test:ci',
    'pnpm run build',
    `mkdir -p "${DIST_DIR}"`,
    `rsync -a --delete "${DEPLOY_DIR}/dist/" "${DIST_DIR}/"`,
    'systemctl reload nginx || true',
  ].join('\n')

  const child = spawn('bash', ['-lc', cmd], {
    stdio: 'inherit',
    env: process.env,
  })

  child.on('exit', (code) => {
    process.exitCode = code === 0 ? 0 : 1
  })
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook/github') {
    res.statusCode = 404
    res.end('Not Found')
    return
  }

  const signature = req.headers['x-hub-signature-256']
  const event = req.headers['x-github-event']

  const chunks = []
  req.on('data', (d) => chunks.push(d))
  req.on('end', () => {
    const body = Buffer.concat(chunks)

    if (!WEBHOOK_SECRET) {
      res.statusCode = 500
      res.end('Server not configured')
      return
    }

    if (typeof signature !== 'string') {
      res.statusCode = 400
      res.end('Missing signature')
      return
    }

    const expected = hmacSha256(WEBHOOK_SECRET, body)
    if (!safeEqual(signature, expected)) {
      res.statusCode = 401
      res.end('Invalid signature')
      return
    }

    if (event !== 'push') {
      res.statusCode = 200
      res.end('Ignored')
      return
    }

    let payload
    try {
      payload = JSON.parse(body.toString('utf8'))
    } catch {
      res.statusCode = 400
      res.end('Invalid JSON')
      return
    }

    if (payload.ref !== 'refs/heads/main') {
      res.statusCode = 200
      res.end('Ignored branch')
      return
    }

    res.statusCode = 200
    res.end('OK')

    runDeploy()
  })
})

server.listen(PORT, HOST, () => {
  process.stdout.write(`listening on http://${HOST}:${PORT}\n`)
})

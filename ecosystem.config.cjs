module.exports = {
  apps: [
    {
      name: 'github-webhook',
      script: '/srv/vite-app/scripts/webhook-server.cjs',
      exec_mode: 'fork',
      instances: 1,
      env: {
        PORT: '8080',
        HOST: '0.0.0.0',
        WEBHOOK_SECRET: '9m7dZKk1v8nQY3W4aT2sLhP0rXcBfUeVjG6NqS5iM1o',
        DEPLOY_DIR: '/srv/vite-app',
        DIST_DIR: '/var/www/vite-app',
      },
    },
  ],
}

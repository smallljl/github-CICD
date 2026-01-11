# Webhook 端口配置修复指南

## 当前配置状态

- ✅ Webhook 服务器端口：8080 (ecosystem.config.cjs)
- ✅ Nginx 代理端口：8080 (default.conf)
- ⚠️  Nginx 容器外部端口：8080 (docker-compose.yml)

## 端口冲突问题

如果 nginx 容器映射到宿主机 8080，而 webhook 服务器也在宿主机 8080，会有冲突！

## 解决方案（二选一）

### 方案 1：Webhook 服务器用 8080，Nginx 容器用其他端口（推荐）

修改 `docker/docker-compose.yml`：
```yaml
ports:
  - "${NGINX_PORT:-8081}:80"  # 改成 8081 或其他端口
```

然后访问网站用：`http://your-domain:8081`

### 方案 2：Nginx 容器用 8080，Webhook 服务器用 9000

修改 `ecosystem.config.cjs`：
```javascript
PORT: '9000',  // 改回 9000
```

修改 `docker/nginx/default.conf`：
```nginx
proxy_pass http://webhook-host:9000/webhook/github;
```

## 修复步骤

1. **重启 webhook 服务器**（应用新端口）：
```bash
pm2 restart github-webhook
# 或
pm2 delete github-webhook
pm2 start ecosystem.config.cjs
```

2. **重启 nginx 容器**（应用新配置）：
```bash
cd docker
docker-compose restart nginx
# 或
docker-compose down
docker-compose up -d
```

3. **验证端口监听**：
```bash
# 检查 webhook 服务器是否在 8080 监听
netstat -tuln | grep 8080
# 或
ss -tuln | grep 8080
```

4. **测试连接**：
```bash
# 直接测试 webhook 服务器（应该返回 400/401，不是 404）
curl -X POST http://localhost:8080/webhook/github

# 通过 nginx 测试
curl -X POST http://localhost:8080/webhook/github
```

## 常见问题

### 问题 1：还是返回 404

**检查：**
- Webhook 服务器是否运行：`pm2 list`
- 端口是否正确监听：`netstat -tuln | grep 8080`
- 请求方法是否为 POST（不是 GET）
- 路径是否为 `/webhook/github`（精确匹配）

### 问题 2：502 Bad Gateway

**原因：** Nginx 无法连接到 webhook 服务器

**检查：**
- Webhook 服务器是否运行
- 端口是否正确（8080）
- `webhook-host` 解析是否正确（docker-compose.yml 中的 extra_hosts）

### 问题 3：端口被占用

**检查：**
```bash
# Windows
netstat -ano | findstr :8080

# Linux
lsof -i :8080
# 或
ss -tuln | grep 8080
```

**解决：** 停止占用端口的进程，或改用其他端口


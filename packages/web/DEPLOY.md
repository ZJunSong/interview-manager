# InterviewManager Web 部署指南

## 功能清单

### 用户功能
- 用户注册/登录（JWT 认证）
- 面试记录 CRUD（10 阶段时间线）
- 6 种阶段状态（pending/current/pass/fail/rejected/skip）
- 搜索与排序
- 数据导入/导出
- 统计看板

### 管理员功能
- 用户管理（查看/删除/修改角色）
- 全平台数据统计
- 访问管理后台

### 默认账号
- 用户名: `admin`
- 密码: `admin123`

> ⚠️ **首次部署后请立即登录并修改管理员密码！**

---

## 腾讯云部署步骤

### 1. 安装 Docker

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker
```

### 2. 上传代码

```bash
# 在本地打包（排除依赖、构建产物与本地数据，只传源码）
cd InterviewManager
tar -czf interview-manager.tar.gz \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='data' \
  --exclude='.env' \
  .dockerignore \
  package.json pnpm-lock.yaml pnpm-workspace.yaml \
  packages/shared packages/web

# 上传到服务器
scp interview-manager.tar.gz root@your-server-ip:/opt/
```

> `.dockerignore` 必须位于构建上下文根目录（仓库根），务必一并上传。

### 3. 在服务器上解压并配置

```bash
cd /opt
tar -xzf interview-manager.tar.gz
cd packages/web

# 创建 .env 文件（JWT_SECRET 未设置时容器会拒绝启动）
cat > .env << EOF
JWT_SECRET=$(openssl rand -hex 32)
HTTP_PORT=80
EOF
```

### 4. 一键启动

```bash
docker compose up -d --build
```

首次构建约 2-3 分钟，之后重启秒起。

### 5. 访问

```
http://your-server-ip
```

---

## 常用命令

```bash
# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 重新构建（源码更新后执行）
docker compose up -d --build
```

> 更新前端代码后务必用 `--build` 重新构建镜像；`.dockerignore` 已排除本地
> `dist`/`node_modules`，镜像内每次都从源码完整构建，不会再出现"更新不生效"。

---

## 数据备份

数据存储在 Docker volume 中，备份命令：

```bash
# 备份
docker run --rm -v interview-manager-app-data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data

# 恢复
docker run --rm -v interview-manager-app-data:/data -v $(pwd):/backup alpine tar xzf /backup/backup.tar.gz -C /
```

---

## 配置 HTTPS

1. 在腾讯云控制台申请 SSL 证书
2. 将证书文件放到 `nginx/ssl/` 目录：
   - `nginx/ssl/cert.pem`
   - `nginx/ssl/key.pem`
3. 创建 `nginx/default.conf`：
   ```nginx
   server {
       listen 443 ssl;
       ssl_certificate /etc/nginx/ssl/cert.pem;
       ssl_certificate_key /etc/nginx/ssl/key.pem;
       # ... 其他配置
   }
   ```
4. 修改 `docker-compose.yml` 添加 443 端口映射
5. 重启：`docker compose up -d`

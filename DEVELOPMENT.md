# 开发者指南

## 项目结构

```
InterviewManager/
├── packages/
│   ├── desktop/      # Windows桌面版（Electron）
│   ├── web/          # 在线网页版
│   └── shared/       # 共享代码
├── website/          # 官方网站
└── package.json      # 根配置（pnpm workspace）
```

## 环境要求

- Node.js 18+
- pnpm 8+
- Git

## 安装依赖

```bash
# 克隆仓库
git clone https://github.com/your-username/InterviewManager.git
cd InterviewManager

# 安装所有依赖
pnpm install
```

## 开发模式

### 同时启动桌面版和网页版

```bash
pnpm run dev
```

### 单独启动桌面版

```bash
pnpm run desktop:dev
```

### 单独启动网页版

```bash
pnpm run web:dev
```

## 构建

### 构建桌面版安装包

```bash
pnpm run desktop:build
```

产物位置：`packages/desktop/dist-desktop/InterviewManager-Setup-x.x.x.exe`

### 构建网页版

```bash
pnpm run web:build
```

产物位置：`packages/web/dist/`

## 部署

### 部署桌面版

1. 构建安装包：`pnpm run desktop:build`
2. 上传 `dist-desktop/*.exe` 到 GitHub Releases
3. 用户下载安装即可

### 部署网页版

#### 方式一：Docker Compose（推荐）

```bash
cd packages/web

# 复制环境变量配置
cp .env.example .env

# 修改 JWT_SECRET（必须修改！）
# 编辑 .env 文件，设置安全的密钥

# 启动服务
docker compose up -d

# 访问 http://localhost:3001
```

#### 方式二：手动部署

```bash
cd packages/web

# 构建
pnpm run build

# 设置环境变量
export JWT_SECRET=your-secret-key
export PORT=3001
export DATA_DIR=./data
export NODE_ENV=production

# 启动服务器
pnpm run start
```

### 部署官网

官网是纯静态HTML，可部署到任何静态托管服务：

- GitHub Pages
- Vercel
- Netlify
- Cloudflare Pages

直接将 `website/` 目录上传即可。

## 环境变量

### 网页版环境变量

| 变量名 | 必填 | 默认值 | 说明 |
|--------|:----:|--------|------|
| `JWT_SECRET` | ✅ | - | JWT签名密钥（必须修改） |
| `PORT` | ❌ | 3001 | 服务器端口 |
| `DATA_DIR` | ❌ | /app/data | 数据存储目录 |
| `NODE_ENV` | ❌ | production | 运行环境 |

## 常见问题

### Q: pnpm install 失败？

```bash
# 清除缓存
pnpm store prune
rm -rf node_modules
pnpm install
```

### Q: 桌面版构建失败？

确保已安装 Windows 构建工具：

```bash
# 以管理员身份运行
npm install -g windows-build-tools
```

### Q: 网页版Docker构建失败？

检查Dockerfile中的路径配置，确保与docker-compose.yml一致。

## 项目架构

### 共享层（packages/shared）

- `components/` - 10个Vue组件（100%复用）
- `types/` - TypeScript类型定义
- `utils/` - API工具函数
- `styles/` - 全局样式

### 桌面版（packages/desktop）

- `electron/` - Electron主进程
- `server/` - 本地Express服务器
- `src/` - Vue前端

### 网页版（packages/web）

- `server/` - Express服务器 + JWT认证
- `src/` - Vue前端（带登录功能）

### 官网（website）

- `index.html` - 首页
- `download/` - 下载页
- `online/` - 在线使用页
- `docs/` - 文档页
- `donate/` - 打赏页

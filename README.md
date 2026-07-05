# 面试记录管理器 / Interview Manager

![License](https://img.shields.io/badge/license-MIT-blue)
![Vue](https://img.shields.io/badge/Vue-3-42b883)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6)
![Electron](https://img.shields.io/badge/Electron-33-47848f)

轻量级求职面试进度追踪工具，帮你同时管理多家公司的面试流程，用可视化时间线清晰呈现每个阶段的状态。

![mainpage](imgs/mainpage.png)

---

## 🎯 产品版本

| 版本 | 描述 | 数据存储 | 下载/访问 |
|------|------|----------|----------|
| **Windows 桌面版** | 下载安装即用，完全离线 | 本地 `%APPDATA%` | [下载](https://github.com/your-username/InterviewManager/releases/latest) |
| **在线 Web 版** | 浏览器直接使用，多设备同步 | 云端服务器 | [在线使用](https://your-web-app-url.com) |

---

## ✨ 功能特性

- **📊 求职统计看板** — 投递总数、进行中、Offer数、已挂、已拒、面试转化率，一眼看清求职全局
- **📋 卡片式时间线** — 每家公司独立卡片，10 阶段时间线从投递到正式 Offer
- **🎨 6 种阶段状态** — 待处理、当前进行中、通过、未通过、拒绝、已跳过，各有独立视觉样式
- **⚡ 智能推进** — 点击当前阶段节点即可弹出操作面板，通过/未通过/跳过/拒绝一键切换
- **🔍 搜索与排序** — 按公司名或职位搜索，支持按时间、名称、进度排序
- **📝 自动补全** — 内置 35+ 知名科技公司和常见职位名称
- **⌨️ 键盘操作** — Enter、方向键、Escape 完成所有操作
- **💾 数据持久化** — 支持导入导出备份
- **♿ 无障碍** — 键盘焦点环、屏幕阅读器标签
- **🔒 数据安全** — 原子写入防损坏、写入串行化防并发覆盖

---

## 🚀 快速开始

### Windows 桌面版

1. 从 [GitHub Releases](https://github.com/your-username/InterviewManager/releases/latest) 下载安装包
2. 双击 `InterviewManager-Setup-x.x.x.exe` 运行安装程序
3. 按照向导完成安装
4. 双击桌面图标启动应用

**特点：**
- 无需安装 Node.js，双击即用
- 数据存储在本地，完全离线可用
- 无账号要求，隐私完全自主

### 在线 Web 版

1. 访问 [在线使用页面](https://your-web-app-url.com)
2. 注册账号或登录已有账号
3. 开始添加面试记录

**特点：**
- 无需安装，浏览器直接使用
- 多设备同步，随时随地访问
- 数据云端存储，自动备份

### 开发者模式

```bash
git clone https://github.com/your-username/InterviewManager.git
cd InterviewManager
pnpm install
pnpm run dev
```

访问 http://localhost:5173

---

## 📦 项目结构

```
InterviewManager/
├── packages/
│   ├── desktop/          # Windows 桌面版（Electron）
│   │   ├── electron/     # Electron 主进程
│   │   ├── server/       # 本地 Express 服务器
│   │   └── src/          # Vue 前端
│   │
│   ├── web/              # 在线 Web 版
│   │   ├── server/       # Express + 用户认证
│   │   ├── src/          # Vue 前端（支持登录）
│   │   ├── docker-compose.yml
│   │   └── Dockerfile
│   │
│   └── shared/           # 共享代码
│       ├── components/   # Vue 组件（100% 复用）
│       ├── types/        # 类型定义
│       └── utils/        # 工具函数
│
├── website/              # 官网
│   ├── index.html        # 首页
│   ├── download/         # 下载页
│   ├── online/           # 在线使用页
│   ├── docs/             # 使用文档
│   └── donate/           # 打赏页
│
└── src/                  # 原始代码（保持不变）
```

---

## 🛠 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | Vue 3 + Composition API + TypeScript |
| 构建工具 | Vite 6 |
| 后端 | Express 4 + TypeScript |
| 桌面打包 | Electron + electron-builder |
| 用户认证 | JWT + bcrypt |
| 数据库（Web 版） | SQLite |
| 部署 | Docker Compose |
| 安装包分发 | GitHub Releases |

---

## 🔧 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式（同时启动前后端）
pnpm run dev

# 桌面版开发
pnpm run desktop:dev

# Web 版开发
pnpm run web:dev

# 构建桌面版安装包
pnpm run desktop:build

# 构建 Web 版
pnpm run web:build

# 启动 Web 版生产服务器
pnpm run web:start
```

---

## 🐳 Docker 部署

```bash
cd packages/web

# 复制环境变量配置
cp .env.example .env

# 修改 .env 中的 JWT_SECRET

# 启动服务
docker compose up -d

# 访问 http://localhost:3001
```

---

## 📝 数据迁移

### 从桌面版迁移到 Web 版

1. 在桌面版中导出数据（JSON 文件）
2. 在 Web 版中登录账号
3. 使用导入功能，选择"合并"模式

### 从 Web 版迁移到桌面版

1. 在 Web 版中导出数据（JSON 文件）
2. 在桌面版中使用导入功能

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

---

## 📄 许可证

本项目基于 [MIT](LICENSE) 许可证开源。

---

## 💚 支持

如果这个工具对你有帮助，可以请作者喝杯咖啡 ☕

[打赏页面](website/donate/)

---

## English

A lightweight job interview progress tracker that helps you manage multiple company interviews simultaneously with a visual timeline.

### Versions

- **Windows Desktop**: Download from [GitHub Releases](https://github.com/your-username/InterviewManager/releases/latest)
- **Online Web**: [Try it online](https://your-web-app-url.com)

### Features

Statistics dashboard, 10-stage timeline, 6 stage statuses, smart auto-advance, autocomplete for 35+ tech companies, full keyboard navigation, import/export backup.

### Quick Start

```bash
git clone https://github.com/your-username/InterviewManager.git
cd InterviewManager
pnpm install
pnpm run dev
```

Open http://localhost:5173. See the [Chinese documentation](#功能特性) for full details.

# 面试记录管理器 / Interview Manager

![License](https://img.shields.io/badge/license-MIT-blue)
![Vue](https://img.shields.io/badge/Vue-3-42b883)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6)
![Express](https://img.shields.io/badge/Express-4-000000)

一个轻量级的求职面试进度追踪工具，帮助你同时管理多家公司的面试流程，用可视化时间线清晰呈现每个阶段的状态。

![mainpage](imgs/mainpage.png)

---

## 功能特性

- **卡片式总览** — 一目了然地查看所有公司的面试进度
- **10 阶段时间线** — 投递 → 测评 → 笔试 → 简历评估 → 一面 → 二面 → 三面 → HR面 → Offer评估 → 正式 Offer
- **6 种阶段状态** — 待处理、当前进行中、通过、未通过、被拒绝、已跳过，各有独立视觉样式
- **智能推进** — 通过/跳过自动进入下一阶段
- **自动补全** — 内置 35+ 知名科技公司和常见职位名称
- **键盘导航** — 支持 Enter、方向键、Escape 完成所有操作
- **即时反馈** — Toast 通知提示操作结果
- **数据持久化** — 数据保存到本地 JSON 文件，重启不丢失

## 快速开始

### 一键启动（推荐）

**Windows** — 双击 `start.bat`

**Mac/Linux** — 终端运行 `./start.sh`

脚本会自动完成所有事情：检测 Node.js 环境（未安装会自动安装）、安装项目依赖、启动开发服务器。启动成功后访问 http://localhost:5173

> 无需任何技术背景，双击即用。脚本全程中文提示，每一步都有清晰的状态反馈。

### 手动启动（开发者）

```bash
git clone https://github.com/<your-username>/InterviewManager.git
cd InterviewManager
npm install
npm run dev
```

打开浏览器访问 http://localhost:5173

### 生产部署

```bash
npm run build
npm start
```

访问 http://localhost:3001（可通过 `PORT` 环境变量自定义端口）

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | Vue 3 + Composition API + TypeScript |
| 构建工具 | Vite 6 |
| 后端 | Express 4 + TypeScript |
| 数据存储 | 本地 JSON 文件 |
| 样式 | 纯手写 CSS，Apple 风格美学设计 |

## 项目结构

```
├── index.html                  # Vite 入口
├── package.json
├── dev.cjs                     # 开发启动脚本（静默启动前后端）
├── tsconfig.json               # 前端 TypeScript 配置
├── tsconfig.server.json        # 服务端 TypeScript 配置
├── vite.config.ts              # Vite 配置
├── server/                     # 后端 API
│   ├── index.ts                # Express 入口（端口 3001）
│   ├── routes.ts               # REST API 路由
│   ├── data.ts                 # JSON 文件读写
│   └── types.ts                # 数据模型定义
├── src/                        # 前端 Vue 应用
│   ├── main.ts                 # Vue 入口
│   ├── App.vue                 # 根组件
│   ├── api.ts                  # API 客户端
│   ├── types.ts                # 前端类型定义
│   ├── assets/styles/          # 全局样式
│   └── components/             # Vue 组件
├── data/                       # 数据存储目录
│   └── sample.json             # 示例数据
├── docs/                       # 开发文档
├── start.bat                   # Windows 启动入口（调用 start.ps1）
├── start.ps1                   # Windows PowerShell 启动脚本
├── start.sh                    # Mac/Linux 启动脚本
└── LICENSE                     # MIT 许可证
```

## API 文档

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/interviews` | 获取所有面试记录 |
| POST | `/api/interviews` | 新增记录 `{company, position}` |
| PATCH | `/api/interviews/:id/stage` | 更新阶段状态 `{stageIndex, status}` |
| DELETE | `/api/interviews/:id` | 删除记录 |

## 配置

| 环境变量 | 默认值 | 说明 |
|---------|-------|------|
| PORT | 3001 | 服务器端口号 |

## 开发命令

```bash
npm run dev          # 同时启动前后端（开发模式，支持热更新）
npm run build        # 构建生产版本
npm start            # 启动生产服务器
npm run preview      # 构建并启动（一步完成）
```

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

本项目基于 [MIT](LICENSE) 许可证开源。

---

## English

A lightweight job interview progress tracker that helps you manage multiple company interviews simultaneously with a visual timeline.

**Quick Start:**

```bash
git clone https://github.com/<your-username>/InterviewManager.git
cd InterviewManager
npm install
npm run dev
```

Open http://localhost:5173. See the [Chinese documentation](#功能特性) above for full details.

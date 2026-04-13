# 面试记录管理器

一个轻量级的求职面试进度追踪工具，用于管理多家公司的面试流程。

## 功能

- 卡片式展示所有公司的面试进度
- 10 阶段时间线可视化（投递 → 测评 → 笔试 → 简历评估 → 一面 → 二面 → 三面 → HR面 → Offer评估 → 正式 Offer）
- 6 种阶段状态（待处理、当前、通过、未通过、被拒绝、已跳过）及对应视觉样式
- 通过/未通过/跳过/拒绝操作，自动推进下一阶段
- 公司名称和职位自动补全
- 键盘导航（Enter 切换焦点、上下箭头选择、Escape 关闭）
- Toast 通知反馈
- 数据持久化到本地 JSON 文件

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + TypeScript + Vite |
| 后端 | Express + TypeScript |
| 数据 | 本地 JSON 文件 |
| 样式 | 纯手写 CSS，苹果风格美学 |

## 快速开始

```bash
# 安装依赖
npm install

# 启动（同时启动前后端）
npm run dev
```

浏览器访问 http://localhost:5173

## 项目结构

```
├── index.html              # Vite 入口
├── package.json
├── server/                 # 后端 API
│   ├── index.ts            # Express 入口（端口 3001）
│   ├── routes.ts           # REST API 路由
│   ├── data.ts             # JSON 文件读写
│   └── types.ts            # 数据模型
├── src/                    # 前端
│   ├── main.ts             # Vue 入口
│   ├── App.vue             # 根组件
│   ├── api.ts              # API 客户端
│   ├── types.ts            # 前端类型
│   ├── assets/styles/      # 全局样式
│   └── components/         # Vue 组件
└── data/                   # 数据存储（自动创建）
```

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/interviews` | 获取所有面试记录 |
| POST | `/api/interviews` | 新增记录 `{company, position}` |
| PATCH | `/api/interviews/:id/stage` | 更新阶段状态 `{stageIndex, status}` |
| DELETE | `/api/interviews/:id` | 删除记录 |

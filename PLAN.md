# 面试记录管理器 — 建设计划

## Context

用户需要一个面试进度追踪工具，需求文档已在 `REQUIREMENTS.md` 中完整定义。项目为全新绿地开发（greenfield），无任何已有代码。目标是构建一个轻量、极简的 Web 应用，本地运行，数据持久化到本地 JSON 文件。

## 技术选型（已确认）

| 项 | 选择 |
|---|---|
| 前端框架 | Vue 3 + Composition API + `<script setup>` + TypeScript |
| 构建工具 | Vite |
| UI 组件库 | 无，纯手写 CSS（苹果风格） |
| 后端框架 | Express + TypeScript |
| 数据存储 | 本地 JSON 文件 |
| 项目结构 | Monorepo（单一 package.json） |
| 版本控制 | Git |
| 启动方式 | `npm run dev`（concurrently 同时启动前后端） |

## 项目目录结构

```
InterviewManager/
├── index.html                  # Vite 入口 HTML
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .gitignore
├── server/
│   ├── index.ts                # Express 入口（端口 3001）
│   ├── routes.ts               # 4 个 REST API 路由
│   ├── data.ts                 # JSON 文件读写工具
│   └── types.ts                # 数据模型定义（唯一事实来源）
├── src/
│   ├── main.ts                 # Vue 应用入口
│   ├── App.vue                 # 根组件（状态管理中心）
│   ├── types.ts                # 前端类型（镜像后端 types）
│   ├── api.ts                  # API 客户端（fetch 封装）
│   ├── assets/styles/
│   │   └── global.css          # 全局样式、CSS 变量、动画
│   └── components/
│       ├── TopBar.vue          # 置顶栏（标题、图例、新增按钮）
│       ├── InterviewCard.vue   # 公司卡片 + 时间线
│       ├── TimelineNode.vue    # 单个阶段节点（6 种状态样式）
│       ├── ActionPopover.vue   # 阶段操作浮窗（通过/未通过/跳过/拒绝）
│       ├── AddModal.vue        # 新增记录弹窗（含自动补全）
│       ├── ConfirmDialog.vue   # 删除确认对话框
│       ├── Toast.vue           # Toast 通知
│       └── EmptyState.vue      # 空状态提示
└── data/
    └── interviews.json         # 运行时数据（自动生成，不入 Git）
```

## API 设计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/interviews` | 获取所有面试记录 |
| POST | `/api/interviews` | 新增记录 `{company, position}` |
| PATCH | `/api/interviews/:id/stage` | 更新阶段状态 `{stageIndex, status}` |
| DELETE | `/api/interviews/:id` | 删除记录 |

## 实施阶段

### Phase 1: 项目脚手架
- `git init` + `.gitignore`
- `package.json`（依赖：vue, vite, @vitejs/plugin-vue, express, uuid, cors, concurrently, typescript, ts-node, ts-node-dev 及对应 @types）
- `tsconfig.json`（target ES2022, module commonjs, strict）
- `vite.config.ts`（vue 插件 + `/api` 代理到 localhost:3001）
- `index.html` + 目录骨架
- `npm install`

### Phase 2: 后端 API
- `server/types.ts` — 数据模型（STAGE_NAMES, Stage, Interview）
- `server/data.ts` — JSON 文件读写（fs.promises）
- `server/routes.ts` — 4 个 REST 端点 + 状态流转逻辑
- `server/index.ts` — Express 启动入口
- 用 curl 验证所有端点

### Phase 3: 前端基础
- `src/types.ts` — 镜像后端类型 + Toast/前端专用类型
- `src/api.ts` — 4 个 fetch 封装函数
- `src/assets/styles/global.css` — CSS 变量、reset、pulse 动画
- `src/main.ts` — Vue 启动
- `src/App.vue` — 根组件骨架

### Phase 4: 前端组件（按依赖顺序）
1. `Toast.vue` → 2. `TopBar.vue` + `EmptyState.vue` → 3. `TimelineNode.vue` → 4. `InterviewCard.vue` → 5. `ActionPopover.vue` → 6. `AddModal.vue` → 7. `ConfirmDialog.vue`

### Phase 5: 集成串联
- App.vue 完整事件处理（加载、增删改、Escape 键、Toast 管理）
- Popover 定位逻辑（getBoundingClientRect）
- 连接线颜色逻辑（pass → 绿色）

### Phase 6: 验证与打磨
- 端到端手动测试（空状态 → 增删改 → 持久化刷新验证）
- CSS 打磨（动画、毛玻璃、响应式、z-index 层级）
- 边界情况处理（重复公司、最后阶段通过、快速双击）

## 验证方式
1. `npm run dev` 启动前后端
2. 浏览器访问 Vite 开发服务器地址
3. 依次测试：空状态显示 → 新增记录 → 阶段操作（通过/未通过/跳过/拒绝）→ 删除 → 刷新验证数据持久化
4. 测试键盘交互：Enter 切换焦点、上下箭头导航自动补全、Escape 关闭弹窗

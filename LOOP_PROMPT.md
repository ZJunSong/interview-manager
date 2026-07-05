# InterviewManager 双版本重构 - 循环执行 Prompt

> **目标**：将 InterviewManager 重构为两套产品，统一下载/在线使用入口。
> **核心原则**：
> 1. **界面零改动** — 当前 UI 是精心优化过的成果，任何组件的样式、布局、交互、动画、颜色、字体、间距都不允许修改
> 2. **代码完全开源** — MIT 许可证
> 3. **免费使用** — 无付费功能，打赏自愿

---

## 🔒 界面冻结约束（MANDATORY - 每轮必须检查）

### 绝对禁止

- ❌ 修改任何 `.vue` 文件的 `<template>` 结构
- ❌ 修改任何 `.vue` 文件的 `<style>` 样式
- ❌ 修改任何 CSS 文件（`src/assets/styles/`）
- ❌ 修改组件的 props、events、slots 接口
- ❌ 修改颜色值、字体、间距、圆角、阴影
- ❌ 修改动画/过渡效果
- ❌ 修改响应式断点
- ❌ 修改无障碍属性（aria-*, tabindex 等）
- ❌ 修改键盘快捷键行为
- ❌ 修改 Toast 提示文案和样式

### 允许的操作

- ✅ 移动文件到新目录（保持内容不变）
- ✅ 修改 import 路径（适配新目录结构）
- ✅ 修改 API 调用地址（适配不同环境）
- ✅ 在现有组件**外层**添加包裹组件（如登录检查）
- ✅ 在路由层面添加重定向（未登录→登录页）
- ✅ 新增**独立**组件（不修改现有组件）

### 验证方法

每轮完成后，执行以下检查：

```bash
# 1. 对比组件内容（应无差异）
diff -r packages/shared/components/ src/components/

# 2. 对比样式文件（应无差异）
diff -r packages/shared/styles/ src/assets/styles/

# 3. 视觉回归测试（如有 Playwright）
# 截图对比，确保像素级一致
```

---

## 🎯 最终交付物（Definition of Done）

### 产品架构

```
InterviewManager/
├── packages/
│   ├── desktop/          # Win 桌面版（Electron）
│   │   ├── electron/     # Electron 主进程
│   │   ├── server/       # 本地 Express（数据存本地 JSON）
│   │   ├── dist/         # 打包输出（.exe → GitHub Releases）
│   │   └── README.md
│   │
│   ├── web/              # 在线 Web 版
│   │   ├── server/       # Express + 用户认证 + 云端数据
│   │   ├── src/          # Vue 前端（支持登录）
│   │   ├── docker-compose.yml  # Docker 部署配置
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   └── shared/           # 共享代码
│       ├── components/   # Vue 组件（100% 复用）
│       ├── types/        # 类型定义
│       └── utils/        # 工具函数
│
├── website/              # 官网（Landing Page）
│   ├── index.html        # 首页
│   ├── download/         # 下载页（链接到 GitHub Releases）
│   ├── docs/             # 使用文档
│   ├── donate/           # 打赏页（微信截图占位）
│   └── README.md
│
└── README.md             # 项目总说明
```

### 功能清单

| 功能 | 桌面版 | Web 版 | 官网 |
|------|--------|--------|------|
| 面试记录 CRUD | ✅ | ✅ | - |
| 时间线可视化 | ✅ | ✅ | - |
| 搜索/排序 | ✅ | ✅ | - |
| 导入导出 JSON | ✅ | ✅ | - |
| 用户注册/登录 | ❌ | ✅ | - |
| 数据云端同步 | ❌ | ✅ | - |
| JSON 导入到账户 | - | ✅（覆盖/合并） | - |
| JSON 云端导出 | - | ✅ | - |
| 一键下载安装包 | - | - | ✅ |
| 在线使用入口 | - | - | ✅（iframe/跳转） |
| 使用文档 | - | - | ✅ |
| 打赏二维码 | - | - | ✅（占位） |

---

## 🔄 循环执行计划

### Phase 1：项目拆分与共享层（预计 3-4 轮）

**目标**：将现有代码拆分为 monorepo，提取共享层

**界面约束**：此阶段只做文件移动，不修改任何组件内容

#### Round 1.1：初始化 Monorepo 结构
- [ ] 安装 pnpm workspace
- [ ] 创建 `packages/shared`、`packages/desktop`、`packages/web` 目录
- [ ] 配置 `pnpm-workspace.yaml`
- [ ] 移动共享代码到 `packages/shared`
- [ ] 验证：`pnpm install` 无报错

#### Round 1.2：提取共享组件
- [ ] 将 `src/components/*.vue` **原样复制**到 `packages/shared/components/`
- [ ] 将 `src/types.ts` **原样复制**到 `packages/shared/types/`
- [ ] 将 `src/api.ts` **原样复制**到 `packages/shared/utils/`
- [ ] 配置共享包的 `package.json` 和构建
- [ ] **关键验证**：`diff -r packages/shared/components/ src/components/` 应无差异
- [ ] 验证：TypeScript 类型无报错

#### Round 1.3：配置共享样式
- [ ] 将 `src/assets/styles/` **原样复制**到 `packages/shared/styles/`
- [ ] 配置样式导入路径
- [ ] **关键验证**：`diff -r packages/shared/styles/ src/assets/styles/` 应无差异
- [ ] 验证：样式加载正常

---

### Phase 2：桌面版（Electron）（预计 3-4 轮）

**目标**：打包为 Win 安装包，纯本地运行

**界面约束**：桌面版必须与原版界面完全一致，包括窗口标题、图标

#### Round 2.1：Electron 基础框架
- [ ] 在 `packages/desktop` 初始化 Electron 项目
- [ ] 创建 `electron/main.ts` 主进程
- [ ] 创建 `electron/preload.ts` 预加载脚本
- [ ] 配置 `electron-builder` 打包配置
- [ ] 验证：`electron .` 能启动空白窗口

#### Round 2.2：集成现有代码
- [ ] 复用 `packages/shared` 组件（**不修改组件内容**）
- [ ] 配置本地 Express 服务器（端口固定）
- [ ] 配置 Vite 打包为 Electron 渲染进程
- [ ] 实现：启动时自动启动本地服务器
- [ ] **关键验证**：截图对比，桌面版 UI 必须与 Web 版像素级一致
- [ ] 验证：桌面版能正常显示面试界面

#### Round 2.3：数据层本地化
- [ ] 数据存储路径改为用户目录（`%APPDATA%/InterviewManager/`）
- [ ] 实现：首次运行自动创建数据目录
- [ ] 实现：优雅关闭（保存数据后退出）
- [ ] 验证：数据持久化正常

#### Round 2.4：打包 Win 安装包
- [ ] 配置 `electron-builder` 生成 `.exe`
- [ ] 添加应用图标（与原版一致）
- [ ] 配置安装向导（可选）
- [ ] 测试：安装包能在 Win 10/11 正常安装运行
- [ ] 配置 GitHub Release 发布流程
- [ ] 输出：`dist-desktop/InterviewManager-Setup-x.x.x.exe`

---

### Phase 3：Web 版（在线版）（预计 4-5 轮）

**目标**：支持账号登录，数据云端存储

**界面约束**：登录/注册页面是新增组件，现有面试界面保持原样

#### Round 3.1：用户认证系统
- [ ] 设计用户表结构（SQLite/PostgreSQL）
- [ ] 实现注册/登录 API（bcrypt + JWT）
- [ ] 创建登录/注册页面组件（**新增独立组件，不修改现有组件**）
- [ ] 配置 JWT 中间件
- [ ] 验证：注册→登录→获取 token 流程正常

#### Round 3.2：数据云端隔离
- [ ] 修改数据模型：每个用户独立数据
- [ ] 修改 API 路由：所有操作需要认证
- [ ] 实现：用户只能访问自己的数据
- [ ] 验证：多用户数据互不干扰

#### Round 3.3：JSON 导入导出增强
- [ ] 实现：JSON 导入到当前账户（覆盖/合并选项）
  - 合并：保留现有，添加新的（去重）
  - 覆盖：清空现有，完全替换
- [ ] 实现：导出当前账户所有数据为 JSON
- [ ] 创建导入导出 UI（**新增独立组件，不修改现有 TopBar**）
- [ ] 验证：导入导出流程正常

#### Round 3.4：集成共享组件
- [ ] 复用 `packages/shared` 组件（**不修改组件内容**）
- [ ] 添加登录状态检查（路由层面）
- [ ] 未登录时重定向到登录页
- [ ] **关键验证**：登录后的面试界面与原版完全一致
- [ ] 验证：完整流程正常

#### Round 3.5：部署配置（Docker Compose）
- [ ] 创建 `docker-compose.yml`
  ```yaml
  services:
    web:
      build: .
      ports:
        - "3001:3001"
      volumes:
        - ./data:/app/data
      environment:
        - JWT_SECRET=xxx
        - DATABASE_URL=xxx
      restart: unless-stopped
  ```
- [ ] 创建 `Dockerfile`
- [ ] 创建 `.env.example`（环境变量模板）
- [ ] 配置环境变量（数据库、JWT 密钥等）
- [ ] 编写部署文档
- [ ] 验证：`docker compose up` 部署成功

---

### Phase 4：官网（预计 3-4 轮）

**目标**：统一入口，在线使用 + 下载

#### Round 4.1：官网基础框架
- [ ] 创建 `website/` 目录
- [ ] 设计首页布局（Hero + 特性展示）
- [ ] 配置路由（首页、下载、文档、打赏）
- [ ] 实现响应式设计
- [ ] 验证：页面正常显示

#### Round 4.2：下载页（GitHub Releases）
- [ ] 创建下载页
- [ ] 从 GitHub Releases API 动态获取最新版本
- [ ] 显示：版本号、文件大小、更新日志、SHA256 校验码
- [ ] 下载按钮链接到 GitHub Releases（免费 CDN，不消耗服务器带宽）
- [ ] 显示历史版本列表（可选）
- [ ] 验证：点击下载能获取安装包

#### Round 4.3：在线使用入口
- [ ] 创建在线使用页
- [ ] 方案 A：iframe 嵌入 Web 版
- [ ] 方案 B：跳转到 Web 版
- [ ] 配置 CORS 允许嵌入
- [ ] 验证：在线使用流程正常

#### Round 4.4：打赏页
- [ ] 创建打赏页
- [ ] 微信二维码占位（图片区域）
- [ ] 支付宝二维码占位（图片区域）
- [ ] 添加感谢文案
- [ ] 验证：页面显示正常

---

### Phase 5：文档与优化（预计 2-3 轮）

**目标**：完善文档，优化体验

#### Round 5.1：项目文档
- [ ] 重写根 `README.md`
- [ ] 编写桌面版使用文档
- [ ] 编写 Web 版使用文档
- [ ] 编写部署文档
- [ ] 验证：文档完整清晰

#### Round 5.2：用户体验优化
- [ ] 桌面版：添加托盘图标
- [ ] 桌面版：添加系统通知
- [ ] Web 版：添加记忆登录
- [ ] Web 版：添加自动保存
- [ ] 验证：体验流畅

#### Round 5.3：最终测试
- [ ] 桌面版：全流程测试
- [ ] Web 版：全流程测试
- [ ] Web 版：Docker Compose 部署测试
- [ ] 官网：所有链接测试
- [ ] 官网：GitHub Releases 下载链接测试
- [ ] 跨平台兼容性测试
- [ ] 输出：测试报告

---

## 📋 每轮执行检查清单

每次循环执行后，检查：

```markdown
## Round X.X 完成检查

### 🔒 界面冻结检查（最高优先级）
- [ ] 所有 `.vue` 文件的 `<template>` 未被修改
- [ ] 所有 `.vue` 文件的 `<style>` 未被修改
- [ ] 所有 CSS 文件未被修改
- [ ] 颜色值、字体、间距、圆角、阴影完全一致
- [ ] 动画/过渡效果完全一致
- [ ] 键盘快捷键行为完全一致
- [ ] 截图对比无视觉差异

### 代码质量
- [ ] TypeScript 无类型错误
- [ ] ESLint 无警告
- [ ] 无 `as any`、`@ts-ignore`

### 功能验证
- [ ] 新增功能正常工作
- [ ] 现有功能未被破坏
- [ ] 边界情况已处理

### 测试覆盖
- [ ] 单元测试通过
- [ ] 集成测试通过（如有）

### 文档同步
- [ ] README 已更新
- [ ] 代码注释清晰

### Git 提交
- [ ] 提交信息规范
- [ ] 无敏感信息泄露
```

---

## 🛠 技术决策记录

| 决策点 | 选择 | 原因 |
|--------|------|------|
| Monorepo 工具 | pnpm workspace | 轻量、快速、原生支持 |
| 桌面打包 | Electron + electron-builder | 成熟、Win 支持好 |
| 安装包分发 | GitHub Releases | 免费 CDN，不消耗服务器带宽，开源标配 |
| 用户认证 | JWT + bcrypt | 无状态、轻量 |
| 数据库（Web） | SQLite | 轻量、单文件部署 |
| 部署方式 | Docker Compose | 一键部署，环境隔离 |
| 官网框架 | 纯 HTML/CSS/JS | 无需构建、CDN 友好 |
| 共享组件 | pnpm workspace 包 | 代码复用、独立版本 |

---

## ⚠️ 注意事项

1. **界面零改动**：这是最高优先级约束。当前 UI 是精心优化过的成果，任何修改都可能导致视觉回归。移动文件时必须保持内容完全一致，用 `diff` 命令验证。
2. **安装包分发**：使用 GitHub Releases 托管安装包，完全免费，不消耗服务器带宽。官网下载页通过 GitHub API 动态获取最新版本链接。
3. **代码开源**：MIT 许可证，所有代码可查看
4. **免费使用**：无付费功能，打赏自愿
5. **隐私提醒**：Web 版需明确提示数据在服务器
6. **向后兼容**：JSON 导入导出格式保持一致
7. **新增组件**：登录/注册页面、导入导出增强 UI 是新增的独立组件，不修改任何现有组件
8. **路由层面**：登录检查、重定向等逻辑在路由层面实现，不侵入组件内部
9. **部署方式**：Web 版使用 Docker Compose 一键部署，包含服务编排、环境变量、数据持久化

---

## 🚀 快速开始（执行时使用）

```bash
# 1. 初始化 monorepo
cd InterviewManager
pnpm init
# 编辑 package.json 添加 workspaces

# 2. 创建目录结构
mkdir -p packages/{shared,desktop,web}
mkdir -p website

# 3. 移动现有代码到 shared
# （具体步骤见 Round 1.1-1.3）

# 4. 逐轮执行上述计划
# 每完成一轮，运行检查清单
```

---

*最后更新：2026-07-05*
*版本：v1.0.1*
*界面约束版本：v1.0（冻结）*

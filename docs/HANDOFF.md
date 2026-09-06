# InterviewManager 项目进度文档

> **最后更新**: 2026-07-05
> **目的**: 会话交接文档，供 AI 接手后续工作时快速了解当前状态

---

## 一、项目概述

InterviewManager 是一个面试记录管理工具，已重构为 **pnpm monorepo**，包含三个产品：

| 产品 | 技术栈 | 状态 |
|------|--------|------|
| **桌面版** | Electron 33 + electron-builder + Express + JSON | ✅ 完成，12/12 API 测试通过 |
| **网页版** | Vue3 + Express + SQLite (better-sqlite3) + JWT + Docker | ✅ 代码完成，**待部署测试** |
| **官网** | 纯静态 HTML/CSS | ✅ 完成（刚重写完） |

---

## 二、已完成的工作

### 2.1 Monorepo 结构（已完成）

```
InterviewManager/
├── packages/
│   ├── desktop/          # Windows 桌面版（Electron）
│   │   ├── electron/     # Electron 主进程
│   │   ├── server/       # 本地 Express 服务器
│   │   └── src/          # Vue 前端
│   ├── web/              # 在线 Web 版
│   │   ├── server/       # Express + JWT 用户认证 + SQLite
│   │   ├── src/          # Vue 前端（支持登录）
│   │   ├── docker-compose.yml
│   │   └── Dockerfile
│   └── shared/           # 共享代码（10个 Vue 组件，字节级一致）
├── website/              # 官网
│   ├── styles.css        # ✅ 刚重写
│   ├── index.html        # ✅ 刚重写（含产品演示区）
│   ├── download/         # 下载页
│   ├── online/           # 在线使用页
│   ├── docs/index.html   # ✅ 刚重写（含侧边栏导航）
│   └── donate/           # 打赏页
├── docs/                 # 文档
│   ├── TESTING.md        # 测试计划
│   ├── TEST_REPORT.md    # 测试报告
│   └── DEVELOPMENT.md    # 开发部署指南
└── AGENTS.md             # AI 规则（禁用 Oracle，全中文）
```

### 2.2 桌面版（已完成）

- Electron 33 + electron-builder 打包
- Express 服务器 + JSON 持久化（原子写入）
- 系统托盘图标
- **12/12 API 测试全部通过**（health, CRUD, 阶段转换, 导入导出, 校验）

### 2.3 网页版（代码完成，未测试）

- Vue3 + Express + SQLite (better-sqlite3) + JWT/bcrypt 认证
- 每用户数据隔离
- Docker Compose + 多阶段 Dockerfile
- 健康检查端点

### 2.4 官网（刚完成重写）

**styles.css 重写内容：**
- 字体加粗：heading 全部 font-weight: 700，不再纤细
- 新增 `.product-demo` 区块样式：`.demo-window`, `.demo-stats`, `.demo-card`, `.demo-timeline`
- 新增文档侧边栏布局：`.docs-layout`, `.docs-nav`，含滚动高亮
- 间距收紧：section padding 从 100px 调整为 72px

**index.html 重写内容：**
- 新增产品演示区块：模拟桌面窗口 + 6项统计面板 + 3张面试卡片（字节跳动/阿里巴巴/腾讯）+ 完整时间线可视化

**docs/index.html 重写内容：**
- 完全重写，添加侧边栏导航（11个锚点章节）
- 滚动高亮 JS 脚本
- 详细的桌面版/Web版说明、功能表格、快捷键表、FAQ

---

## 三、未完成 / 下一步

### 3.1 🔴 核心待办：Docker 部署测试网页版

**问题**：Windows 上的 Docker Desktop 启动不起来（daemon 无法连接），已决定**切换到 WSL 中直接安装 Docker**。

**你需要做的：**

1. **在 WSL 中安装 Docker**
   ```bash
   # WSL 中执行
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   # 重新登录让组生效
   docker --version
   ```

2. **构建并启动网页版**
   ```bash
   cd /mnt/d/InterviewManager/packages/web
   docker compose up -d --build
   ```

   > **注意**：Dockerfile 的 build context 是 `../..`（monorepo 根目录），docker-compose.yml 中已配置好：
   > ```yaml
   > build:
   >   context: ../..
   >   dockerfile: packages/web/Dockerfile
   > ```
   > 如果 WSL 路径不同，需要确认 context 路径正确。

3. **测试功能清单**
   - [ ] 访问 http://localhost:3001 确认页面加载
   - [ ] 注册新用户（用户名 + 密码）
   - [ ] 登录
   - [ ] 添加面试记录（公司 + 职位）
   - [ ] 更新面试阶段状态（通过/未通过/跳过/拒绝）
   - [ ] 搜索和排序
   - [ ] 导出数据
   - [ ] 导入数据（合并模式 + 覆盖模式）
   - [ ] 退出登录
   - [ ] 用另一个账号登录，确认数据隔离
   - [ ] 访问 /api/interviews/health 确认健康检查

4. **测试完成后**
   - 更新 `docs/TEST_REPORT.md`，补充 Web 版测试结果
   - Git commit + push

### 3.2 可选后续

- [ ] 官网效果验证（本地起个 HTTP server 看页面渲染）
- [ ] 把 GitHub 链接、实际下载 URL 补全到官网各页面
- [ ] 打赏页的二维码替换为真实图片
- [ ] online 页面的 iframe 嵌入实际 Web 版地址

---

## 四、关键技术细节

### better-sqlite3 编译问题

Windows 上 `better-sqlite3` 无法编译（缺少 ClangCL 工具链），报错：
```
The build tools for ClangCL cannot be found
```

**Docker 中不受影响**：Dockerfile 使用 Alpine 长镜像，npm install 时能正常编译 native module。这也是必须用 Docker 测试的原因。

### Dockerfile 结构

```dockerfile
# 多阶段构建
# Stage 1: 构建前端
FROM node:20-alpine AS builder
# 安装 pnpm → 构建 shared → 构建 web 前端

# Stage 2: 生产服务器
FROM node:20-alpine
# 复制 server/ → 安装 better-sqlite3 → 复制前端构建产物
```

### 环境变量

```bash
NODE_ENV=production
PORT=3001
JWT_SECRET=change-this-in-production  # docker-compose.yml 中有默认值
DATA_DIR=/app/data
```

### 共享组件一致性

10 个 Vue 组件在 `packages/shared/components/` 中，桌面版和网页版共用，已通过 `fc /b`（Windows 二进制比较）验证字节级一致。**修改组件时必须保持两个版本一致。**

---

## 五、Git 状态

最近提交：
- `35e7640` — monorepo 重构
- `8d5ce2a` — 项目清理（删除原始根目录文件）
- `8c6b014` — 文档目录重组
- `d965755` — 测试文档
- `e8687ad` — 官网重设计

**本次官网重写尚未 commit**，记得测试完后一起提交。

---

## 六、AI 工作规则

参见 `AGENTS.md`：
1. **禁止使用 Oracle 验证** — 所有验证必须自行完成
2. **全中文输出** — 回复、注释、文档、提交信息全部中文

---

## 七、快速接手指南

给接手的 AI 看这段：

> 项目 monorepo 结构已搭好，桌面版已完成并测试通过，网页版代码完成但**从未部署测试过**。官网刚完成重写（加了产品演示区、加粗了字体、重写了文档页加了侧边栏），**尚未 commit**。
>
> 当前卡点：Docker Desktop 在 Windows 上启动不了。用户已切换到 WSL 安装 Docker。
>
> **你的第一个任务**：在 WSL 中用 `docker compose up -d --build` 启动网页版，然后按照上面的测试清单逐项验证，确保所有功能正常。测试通过后 git commit 官网变更 + 测试报告。

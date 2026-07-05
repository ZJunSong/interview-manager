# 智能体指令

## 规则
1. **禁止使用 Oracle 验证** - 所有验证必须自行完成，不得调用 Oracle 智能体
2. **全中文输出** - 所有回复、注释、文档、提交信息必须使用中文，禁止中英文夹杂

## 项目概述
InterviewManager - 面试管理工具，支持题目收藏、随机抽取、笔记记录。

### 当前状态
重构为 monorepo，包含两个产品版本：
- **桌面版**：Electron + electron-builder → `.exe` 安装包
- **网页版**：Vue3 + Docker Compose + SQLite + JWT 认证

### 常用命令
- `pnpm install` - 安装依赖
- `pnpm -C packages/desktop build` - 构建桌面版
- `pnpm -C packages/web build` - 构建网页版
- `docker compose -f packages/web/docker-compose.yml up` - 启动网页服务器

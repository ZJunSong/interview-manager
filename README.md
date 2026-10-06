# InterviewManager · 面试记录管理器

轻量级求职面试进度追踪工具：同时管理多家公司、多个岗位的面试流程，用可视化时间线清晰呈现每一步。

- **10 阶段时间线**：投递 → 测评 → 笔试 → 简历评估 → 一面 → 二面 → 三面 → HR面 → Offer评估 → 正式offer
- **公司聚合视图**：同公司多部门/多岗位归并为一张卡片，互不干扰
- **点击推进**：点击当前阶段节点即可标记通过 / 未通过 / 拒绝 / 跳过，流程自动流转
- **求职统计**：投递总数、进行中、Offer、已挂、面试转化率一目了然
- **访问追踪**：为公司记录招聘页面链接，访问新鲜度分级提醒（绿 / 黄 / 橙 / 红），不再错过跟进时机
- **智能排序**：按进度 / 最近访问 / 投递时间 / 公司名排序；已挂流程自动沉底，置顶公司固定最前
- **搜索过滤**：按公司名或职位名即时过滤
- **数据导入导出**：JSON 格式一键备份恢复
- **多用户**：注册登录（JWT 认证），数据按用户隔离；内置管理员后台

技术栈：Vue 3 + TypeScript + Express + SQLite（better-sqlite3），单进程单文件数据库，部署极简。

---

## 部署方式

二选一：个人使用推荐**本地部署**（无需服务器），多人多设备使用选择**服务器部署**（Docker）。

### 方式一：本地部署（Node.js 直接运行）

前置要求：[Node.js](https://nodejs.org/) ≥ 22.13（pnpm 由 corepack 自动启用）

```bash
# 1. 获取代码
git clone https://github.com/jovanzhang6/interview-manager.git
cd interview-manager

# 2. 安装依赖
corepack enable
pnpm install

# 3. 构建
pnpm build

# 4. 启动
pnpm start
```

启动后访问 **http://localhost:3001**，注册账号即可使用。

- 数据保存在 `packages/web/data/` 目录（SQLite 单文件 `app.db`）
- **备份 = 复制这个目录**；恢复 = 把目录放回去
- 换端口：`PORT=8080 pnpm start`（Windows PowerShell：`$env:PORT=8080; pnpm start`）

### 方式二：服务器部署（Docker Compose）

前置要求：服务器（1核1G 即可）安装好 Docker

```bash
# 1. 获取代码
git clone https://github.com/jovanzhang6/interview-manager.git
cd interview-manager/packages/web

# 2. 生成配置（JWT_SECRET 缺失时容器会拒绝启动）
cat > .env << EOF
JWT_SECRET=$(openssl rand -hex 32)
HTTP_PORT=80
EOF

# 3. 构建并启动
docker compose up -d --build
```

启动后访问 `http://服务器IP`。

- 首次启动自动创建管理员账号：**admin / admin123**，请立即登录修改密码
- 数据保存在 Docker volume `web_app-data` 中，更新代码 / 重建容器均不影响数据
- 数据备份：

  ```bash
  docker run --rm -v web_app-data:/data -v $(pwd):/backup alpine tar czf /backup/app-data-backup.tar.gz -C /data .
  ```

- 更新版本：

  ```bash
  git pull && docker compose up -d --build
  ```

---

## 数据迁移

从旧版 **Windows 桌面版**迁移：在桌面版中导出 JSON 文件，登录 Web 版后点击工具栏「导入」上传即可。两种导入模式：

- **合并模式**：相同 ID 的记录跳过，只导入新记录（推荐）
- **覆盖模式**：清空当前账号数据后全量导入

导出文件为标准 JSON 数组，直接导入即可，无需转换。

---

## 本地开发

```bash
pnpm install

# 前后端热更新开发模式（后端 :3001，前端 :5173 自动代理）
pnpm dev

# 运行测试（后端接口集成测试 + 前端排序分组单测）
pnpm test
```

目录结构：

```
packages/
├── web/       # Web 版（Vue3 前端 + Express 后端 + SQLite）
│   ├── server/    # 服务端（认证、面试记录、管理员接口）
│   ├── src/       # 前端（视图、组件、分组排序逻辑）
│   └── tests/     # 测试
└── shared/    # 前后端共享类型与组件
```

---

## License

[MIT](LICENSE)

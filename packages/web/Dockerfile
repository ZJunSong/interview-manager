# ============================================
# 阶段 1：安装依赖 + 构建前端 + 编译服务端
# ============================================
FROM node:20 AS builder

WORKDIR /app

# pnpm 11 与本地开发一致（lockfile 为 v9.0 格式，allowBuilds 字段需 pnpm 10+ 才生效）
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate

# 先只复制依赖清单，充分利用 Docker 层缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

# 说明：lockfile 中包含桌面版（desktop）的 importer，但镜像内不复制其 package.json，
# 因此无法使用 --frozen-lockfile；桌面版不在镜像依赖树内，不受影响
RUN pnpm install --no-frozen-lockfile

# 复制源码（.dockerignore 已排除 node_modules / dist / data，杜绝旧产物污染）
COPY packages/shared/ ./packages/shared/
COPY packages/web/ ./packages/web/

WORKDIR /app/packages/web

# 构建前端（dist/index.html + dist/assets/）并编译服务端（dist/server/*.js）
RUN pnpm run build

# 构建产物自检：任一缺失立即中断构建，避免带病镜像
RUN test -f dist/index.html && test -f dist/server/index.js

# ============================================
# 阶段 2：生产镜像
# ============================================
FROM node:20

WORKDIR /app

# 直接复用阶段 1 已装好的依赖（pnpm 的 symlink 均为 /app 内相对路径，拷贝后仍有效），
# 不再二次联网安装：构建更快，且 better-sqlite3 编译产物与运行时 Node 版本严格一致
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/web/node_modules ./packages/web/node_modules

# 前端资产 + 服务端编译产物
COPY --from=builder /app/packages/web/dist ./packages/web/dist

# shared 以 TS 源码形式被前端引用，保留源码以备服务端将来引用
COPY packages/shared/ ./packages/shared/

# 数据目录归属 node 用户，容器以非 root 运行
RUN mkdir -p /app/data && chown -R node:node /app/data

WORKDIR /app/packages/web

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/healthz || exit 1

USER node

CMD ["node", "dist/server/index.js"]

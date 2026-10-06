# ============================================
# 阶段 1：安装依赖 + 构建前端 + 编译服务端
# 基础镜像用 node:22：pnpm 11 要求 Node.js ≥ 22.13（依赖内置 node:sqlite 模块）
# ============================================
FROM node:22 AS builder

WORKDIR /app

# pnpm 11 与 lockfile（v9.0 格式）匹配
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate

# 先只复制依赖清单，充分利用 Docker 层缓存
# pnpm-workspace.yaml 含 allowBuilds 构建批准（better-sqlite3/esbuild），缺失会导致 install 被拒
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --no-frozen-lockfile

# 复制源码（.dockerignore 已排除 node_modules / dist / data，杜绝旧产物污染）
COPY server/ ./server/
COPY src/ ./src/
COPY tests/ ./tests/
COPY index.html vite.config.ts tsconfig.json tsconfig.server.json ./

# 构建前端（dist/index.html + dist/assets/）并编译服务端（dist/server/*.js）
RUN pnpm run build

# 构建产物自检：任一缺失立即中断构建，避免带病镜像
RUN test -f dist/index.html && test -f dist/server/index.js

# ============================================
# 阶段 2：生产镜像
# ============================================
FROM node:22

WORKDIR /app

# 直接复用阶段 1 已装好的依赖（pnpm 的 symlink 均为 /app 内相对路径，拷贝后仍有效），
# 不再二次联网安装：构建更快，且 better-sqlite3 编译产物与运行时 Node 版本严格一致
COPY --from=builder /app/node_modules ./node_modules

# 前端资产 + 服务端编译产物
COPY --from=builder /app/dist ./dist

# 数据目录归属 node 用户，容器以非 root 运行
RUN mkdir -p /app/data && chown -R node:node /app/data

# 入口脚本：以 root 启动自动修正数据目录属主，再降权为 node 运行服务进程
# （postgres/redis 官方镜像同款模式，杜绝数据卷属主不匹配导致的启动失败）
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && which setpriv

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/healthz || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]

CMD ["node", "dist/server/index.js"]

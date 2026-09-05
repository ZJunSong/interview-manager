# ============================================
# Stage 1: Build frontend + compile server
# ============================================
FROM node:20 AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

RUN pnpm install --no-frozen-lockfile

COPY packages/shared/ ./packages/shared/
COPY packages/web/ ./packages/web/

WORKDIR /app/packages/web
# 验证源码是否正确复制
RUN grep -c "lastVisitedAt" src/views/Dashboard.vue || echo "WARNING: source not updated"
# 清除旧构建产物和缓存，确保完全重新构建
RUN rm -rf dist node_modules/.vite /tmp/vite-cache
ENV VITE_CACHE_DIR=/tmp/vite-cache
RUN npx vite build --force
# 验证构建产物
RUN grep -c "lastVisitedAt" dist/assets/*.js || echo "WARNING: build output not updated"
RUN grep -c "visit-fresh" dist/assets/*.js || echo "WARNING: CSS classes not in build"

# 编译服务端 TypeScript → JavaScript
RUN npx tsc -p tsconfig.server.json

# ============================================
# Stage 2: Production
# ============================================
FROM node:20

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

RUN pnpm install --prod --no-frozen-lockfile

# 前端构建产物
COPY --from=builder /app/packages/web/dist ./packages/web/dist
# 服务端编译产物（JS）
COPY --from=builder /app/packages/web/dist/server ./packages/web/dist/server
COPY packages/web/server/ ./packages/web/server/
COPY packages/web/tsconfig.json ./packages/web/
COPY packages/shared/ ./packages/shared/

RUN mkdir -p /app/data

WORKDIR /app/packages/web

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/healthz || exit 1

CMD ["node", "dist/server/index.js"]

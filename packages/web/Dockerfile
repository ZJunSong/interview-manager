# ============================================
# Stage 1: Build frontend
# ============================================
FROM node:20-alpine AS builder

# 安装编译 better-sqlite3 所需的依赖
RUN apk add --no-cache python3 make g++

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

RUN pnpm install --no-frozen-lockfile

COPY packages/shared/ ./packages/shared/
COPY packages/web/ ./packages/web/

WORKDIR /app/packages/web
RUN pnpm run build:client

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine

# 安装编译 better-sqlite3 所需的依赖
RUN apk add --no-cache python3 make g++

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

RUN pnpm install --prod --no-frozen-lockfile

COPY --from=builder /app/packages/web/dist ./packages/web/dist
COPY packages/web/server/ ./packages/web/server/
COPY packages/web/tsconfig.json ./packages/web/
COPY packages/shared/ ./packages/shared/

RUN mkdir -p /app/data

WORKDIR /app/packages/web

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/healthz || exit 1

RUN npm install -g ts-node typescript

CMD ["ts-node", "server/index.ts"]

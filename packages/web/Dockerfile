# ============================================
# Stage 1: Build frontend (Vite + Vue 3)
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace config and package files first (layer cache)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY packages/web/ ./packages/web/

# Build web frontend (Vite handles shared TS sources directly)
WORKDIR /app/packages/web
RUN pnpm run build:client

# ============================================
# Stage 2: Production image
# ============================================
FROM node:20-alpine

WORKDIR /app

# Install pnpm for workspace resolution
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

# Install production dependencies only
RUN pnpm install --prod --no-frozen-lockfile

# Copy built frontend
COPY --from=builder /app/packages/web/dist ./packages/web/dist

# Copy server source (TypeScript, run via ts-node or compile)
COPY packages/web/server/ ./packages/web/server/
COPY packages/web/tsconfig.json ./packages/web/

# Copy shared source (types/utils imported by server)
COPY packages/shared/ ./packages/shared/

# Create data directory for SQLite
RUN mkdir -p /app/data

# Set working directory to web package
WORKDIR /app/packages/web

# Expose port
EXPOSE 3001

# Health check (no auth required)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/healthz || exit 1

# Install ts-node for running TypeScript directly
RUN npm install -g ts-node typescript

# Start server
CMD ["ts-node", "server/index.ts"]

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY packages/web/ ./packages/web/

# Build shared package
WORKDIR /app/packages/shared
RUN pnpm run build || true

# Build web package
WORKDIR /app/packages/web
RUN pnpm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY packages/web/package.json ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built files
COPY --from=builder /app/packages/web/dist ./dist
COPY --from=builder /app/packages/web/server ./server

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "dist/server/index.js"]

# Build stage
FROM node:22-slim AS builder
WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --production

# Runtime stage
FROM node:22-slim
WORKDIR /app

# Create non-root user
RUN groupadd --gid 1001 nodejs && useradd --uid 1001 --gid 1001 -m nodejs

# Copy built app and production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/build build/
COPY --from=builder --chown=nodejs:nodejs /app/node_modules node_modules/
COPY --from=builder --chown=nodejs:nodejs /app/package.json .

# Create data directories
RUN mkdir -p /data/db /data/attachments && chown -R nodejs:nodejs /data

USER nodejs

# Default environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATA_DIR=/data
ENV BODY_SIZE_LIMIT=10M

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "build"]

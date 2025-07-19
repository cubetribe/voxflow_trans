# VoxFlow Node.js API Gateway - Production-Ready Multi-Stage Build
# 
# Stage 1: Build stage with TypeScript compilation
FROM node:18-alpine AS builder

# Install system dependencies needed for native modules compilation
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

WORKDIR /app

# Copy package files first for better Docker layer caching
# This allows npm install to be cached if package.json hasn't changed
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
# Use npm install if package-lock.json doesn't exist, npm ci if it does
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy TypeScript source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript to JavaScript
# This creates the dist/ directory with compiled code
RUN npm run build

# Remove devDependencies to reduce size
RUN npm prune --production

# 
# Stage 2: Production runtime stage
FROM node:18-alpine AS runtime

# Install runtime system dependencies
# curl: Required for health checks
# tini: Proper signal handling for PID 1
RUN apk add --no-cache \
    curl \
    tini

# Create non-root user for security
# Running as root in containers is a security risk
RUN addgroup -g 1001 -S nodejs && \
    adduser -S voxflow -u 1001 -G nodejs

WORKDIR /app

# Change ownership of app directory to non-root user
RUN chown -R voxflow:nodejs /app

# Switch to non-root user
USER voxflow

# Copy built application from builder stage
# Only copy what's needed for runtime
COPY --from=builder --chown=voxflow:nodejs /app/dist ./dist
COPY --from=builder --chown=voxflow:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=voxflow:nodejs /app/package*.json ./

# Create necessary directories with correct permissions
RUN mkdir -p data logs temp

# Expose port
EXPOSE 3000

# Health check with proper timeout and retry configuration
# Uses the correct port and protocol for container environment
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use tini as PID 1 for proper signal handling
# This ensures graceful shutdowns work correctly
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
# Use node directly instead of npm for better signal handling
CMD ["node", "dist/server.js"]
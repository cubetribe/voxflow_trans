# VoxFlow React Frontend - Development-Optimized Container
# Designed for hot-reload development with production capabilities
FROM node:18-alpine

# Install system dependencies
# curl: Health checks
# tini: Signal handling
RUN apk add --no-cache \
    curl \
    tini

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S voxflow -u 1001 -G nodejs

WORKDIR /app

# Change ownership to non-root user
RUN chown -R voxflow:nodejs /app

# Switch to non-root user
USER voxflow

# Copy package files first for better caching
# This layer will be cached if package.json doesn't change
COPY --chown=voxflow:nodejs package*.json ./

# Install dependencies
# Use npm ci for reproducible installs
RUN npm ci

# Copy source code
# This happens after npm install for better layer caching
COPY --chown=voxflow:nodejs . .

# Create necessary directories
RUN mkdir -p dist logs

# Expose Vite development server port
EXPOSE 5173

# Health check for development server
# Vite serves the app and should respond to requests
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5173 || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Development command with hot reload
# --host 0.0.0.0: Bind to all interfaces for Docker
# --port 5173: Explicit port for consistency
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
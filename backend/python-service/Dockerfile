# VoxFlow Python Voxtral Service - Production-Ready Multi-Stage Build
# Optimized for Apple Silicon with MLX support
#
# Stage 1: Build stage with compilation tools
FROM python:3.11-slim AS builder

# Install build dependencies
# git: For pip installs from git repos
# build-essential: For compiling native extensions
# pkg-config: For package configuration
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    pkg-config \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip and install build tools
RUN pip install --no-cache-dir --upgrade \
    pip \
    setuptools \
    wheel

# Copy Docker-specific requirements (without MLX for Linux containers)
COPY requirements-docker.txt .

# Install Python dependencies 
# Modern pip doesn't need --wheel-dir, uses cache automatically
RUN pip install --no-cache-dir -r requirements-docker.txt

#
# Stage 2: Production runtime stage
FROM python:3.11-slim AS runtime

# Install runtime system dependencies
# curl: Health checks
# ffmpeg: Audio processing
# tini: Proper signal handling
# ca-certificates: SSL/TLS certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    libgomp1 \
    tini \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
# ML workloads should not run as root
RUN groupadd -r voxflow && \
    useradd -r -g voxflow -u 1001 \
    --home-dir /app \
    --shell /bin/bash \
    voxflow

WORKDIR /app

# Create necessary directories with proper permissions
RUN mkdir -p \
    data/models \
    data/temp \
    data/logs \
    .cache \
    && chown -R voxflow:voxflow /app

# Switch to non-root user
USER voxflow

# Copy Python dependencies from builder stage
COPY --from=builder --chown=voxflow:voxflow /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder --chown=voxflow:voxflow /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=voxflow:voxflow app/ ./app/
COPY --chown=voxflow:voxflow requirements.txt ./

# Set Python environment variables for production
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Expose port
EXPOSE 8000

# Health check with extended timeout for model loading
# Model loading can take time, especially on first start
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s --retries=5 \
  CMD curl -f http://localhost:8000/health || exit 1

# Use tini as PID 1 for proper signal handling
# Critical for ML workloads that need graceful shutdowns
ENTRYPOINT ["/usr/bin/tini", "--"]

# Start the application with production settings
# --workers 1: Single worker for model consistency
# --worker-class: Async worker for better performance
# --access-logfile: Structured logging
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--access-log", \
     "--log-level", "info"]
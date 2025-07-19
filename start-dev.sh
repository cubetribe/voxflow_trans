#!/bin/bash

# VoxFlow Development Startup Script
# This script starts the complete VoxFlow stack in Docker containers

set -e

echo "🎙️  Starting VoxFlow Development Environment"
echo "=========================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Create environment files if they don't exist
echo "📝 Setting up environment files..."

# Frontend environment
if [ ! -f frontend/.env.local ]; then
    cp frontend/.env.example frontend/.env.local
    echo "✅ Created frontend/.env.local"
fi

# Node.js service environment
if [ ! -f backend/node-service/.env ]; then
    cat > backend/node-service/.env << EOF
PORT=3000
REDIS_URL=redis://redis:6379
DATABASE_URL=sqlite:./data/voxflow.db
PYTHON_SERVICE_URL=http://python-service:8000
JWT_SECRET=dev-secret-key-change-in-production
NODE_ENV=development
EOF
    echo "✅ Created backend/node-service/.env"
fi

# Python service environment
if [ ! -f backend/python-service/.env ]; then
    cat > backend/python-service/.env << EOF
PORT=8000
MODEL_NAME=mistralai/Voxtral-Mini-3B-2507
DEVICE=mps
MAX_AUDIO_LENGTH=1800
CHUNK_SIZE=30
REDIS_URL=redis://redis:6379
ENVIRONMENT=development
EOF
    echo "✅ Created backend/python-service/.env"
fi

echo ""
echo "🐳 Starting Docker containers..."
echo "This may take a few minutes on first run..."

# Build and start all services
docker-compose up --build -d

echo ""
echo "⏳ Waiting for services to become healthy..."

# Wait for services to be healthy
check_service() {
    local service=$1
    local url=$2
    local timeout=60
    local count=0
    
    while [ $count -lt $timeout ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo "✅ $service is ready"
            return 0
        fi
        sleep 2
        count=$((count + 1))
        printf "."
    done
    
    echo "❌ $service failed to start within ${timeout} seconds"
    return 1
}

# Check Redis
echo -n "🔴 Checking Redis..."
if ! check_service "Redis" "http://localhost:6379"; then
    echo "Failed to connect to Redis"
    exit 1
fi

# Check Python Service
echo -n "🐍 Checking Python Service..."
if ! check_service "Python Service" "http://localhost:8000/health"; then
    echo "Failed to connect to Python Service"
    docker-compose logs python-service
    exit 1
fi

# Check Node.js Service
echo -n "🟢 Checking Node.js Service..."
if ! check_service "Node.js Service" "http://localhost:3000/health"; then
    echo "Failed to connect to Node.js Service"
    docker-compose logs node-service
    exit 1
fi

# Check Frontend
echo -n "⚛️  Checking Frontend..."
if ! check_service "Frontend" "http://localhost:5173"; then
    echo "Failed to connect to Frontend"
    docker-compose logs frontend
    exit 1
fi

echo ""
echo "🎉 VoxFlow is now running!"
echo ""
echo "📱 Access your application:"
echo "   Frontend:      http://localhost:5173"
echo "   API Gateway:   http://localhost:3000"
echo "   Python API:    http://localhost:8000"
echo "   Redis:         localhost:6379"
echo ""
echo "📊 Useful commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop all:      docker-compose down"
echo "   Restart:       docker-compose restart"
echo "   Shell access:  docker-compose exec <service> sh"
echo ""
echo "🔧 Development features:"
echo "   ✅ Hot reload enabled for all services"
echo "   ✅ Volume mounts for live code editing"
echo "   ✅ Health checks for service monitoring"
echo "   ✅ Automatic cleanup and restart on failures"
echo ""

# Open browser if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🌐 Opening browser..."
    sleep 3
    open http://localhost:5173
fi

echo "Ready for development! 🚀"
#!/bin/bash

# VoxFlow Native Development Startup Script
# This script starts the complete VoxFlow stack natively (no Docker)

set -e

# Process tracking
REDIS_PID=""
PYTHON_PID=""
NODE_PID=""
FRONTEND_PID=""

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping VoxFlow services..."
    
    if [[ -n "$FRONTEND_PID" ]]; then
        kill $FRONTEND_PID 2>/dev/null || true
        echo "✅ Frontend stopped"
    fi
    
    if [[ -n "$NODE_PID" ]]; then
        kill $NODE_PID 2>/dev/null || true
        echo "✅ Node.js service stopped"
    fi
    
    if [[ -n "$PYTHON_PID" ]]; then
        kill $PYTHON_PID 2>/dev/null || true
        echo "✅ Python service stopped"
    fi
    
    if [[ -n "$REDIS_PID" ]]; then
        kill $REDIS_PID 2>/dev/null || true
        echo "✅ Redis stopped"
    fi
    
    echo "🏁 VoxFlow shutdown complete"
    exit 0
}

# Only trap INT and TERM (not EXIT), so services continue when script ends
trap cleanup INT TERM

# Wechsle ins Script-Verzeichnis (wichtig für relative Pfade)
cd "$(dirname "$0")"

echo "🎙️  VoxFlow - AI Voice Transcription Platform"
echo "============================================="
echo ""
echo "🤖 Was ist VoxFlow?"
echo "   • Professionelle KI-basierte Audio-Transkription"
echo "   • Powered by Mistral's Voxtral-Mini-3B-2507 Model"
echo "   • Optimiert für Apple Silicon (M1/M2/M3/M4)"
echo "   • Unterstützt: MP3, WAV, M4A, WEBM, OGG, FLAC"
echo "   • Batch-Verarbeitung bis 500MB pro Datei"
echo ""
echo "🏗️  Native Architektur:"
echo "   🐍 Python Service (Port 8000) - Voxtral AI Model"
echo "   🟢 Node.js Gateway (Port 3000) - API & WebSocket"
echo "   ⚛️  React Frontend (Port 5173) - Web Interface"
echo "   🔴 Redis Cache (Port 6379) - Performance"
echo ""

# DEBUG-MODUS ABFRAGE (von Environment Variable oder User Input)
if [[ -n "$VOXFLOW_DEBUG_MODE" ]]; then
    # Debug mode set by VoxFlow-Start.command
    DEBUG_MODE="$VOXFLOW_DEBUG_MODE"
    echo "🔧 Debug-Modus: $DEBUG_MODE (von VoxFlow-Start gesetzt)"
else
    # Interactive mode
    read -p "🔧 Debug-Modus aktivieren? (y/n): " DEBUG_MODE
fi

if [[ $DEBUG_MODE == "y" || $DEBUG_MODE == "Y" ]]; then
    echo "🐛 DEBUG-MODUS AKTIV - Detaillierte Logs werden angezeigt"
    DEBUG_ENABLED=true
    set -x  # Bash debug für Commands
else
    DEBUG_ENABLED=false
fi

echo ""
echo "🚀 Starting VoxFlow Native Development Environment"
echo "================================================="

# Check Redis installation
if ! command -v redis-server &> /dev/null; then
    echo "❌ Redis not installed. Installing with Homebrew..."
    if command -v brew &> /dev/null; then
        brew install redis
    else
        echo "❌ Homebrew not found. Please install Redis manually or run: ./install-redis.command"
        exit 1
    fi
fi

# DETAILLIERTE SYSTEM-INFORMATIONEN (im Debug-Modus)
if [[ $DEBUG_ENABLED == true ]]; then
    echo ""
    echo "🔍 SYSTEM-INFORMATIONEN:"
    echo "   macOS: $(sw_vers -productVersion)"
    echo "   Node.js: $(node --version 2>/dev/null || echo 'NICHT INSTALLIERT')"
    echo "   Python: $(python3 --version 2>/dev/null || echo 'NICHT INSTALLIERT')"
    echo "   Redis: $(redis-server --version 2>/dev/null || echo 'NICHT INSTALLIERT')"
    echo "   Verfügbarer RAM: $(sysctl hw.memsize | awk '{print int($2/1024/1024/1024)}')GB"
    echo "   CPU Kerne: $(sysctl hw.ncpu | awk '{print $2}')"
    echo ""
    
    echo "🔍 VERZEICHNIS-CHECKS:"
    echo "   Aktuelles Verzeichnis: $(pwd)"
    if [ -d "frontend" ]; then
        echo "   ✅ Frontend: frontend/ gefunden"
    else
        echo "   ❌ Frontend: frontend/ NICHT gefunden"
        echo "   📂 Verfügbare Verzeichnisse:"
        ls -la | grep "^d" | awk '{print "      " $9}' || true
    fi
    
    if [ -d "backend/node-service" ]; then
        echo "   ✅ Node.js Service: backend/node-service/ gefunden"
        echo "   📦 package.json: $([ -f "backend/node-service/package.json" ] && echo "✅" || echo "❌")"
    else
        echo "   ❌ Node.js Service: backend/node-service/ NICHT gefunden"
    fi
    
    if [ -d "backend/python-service" ]; then
        echo "   ✅ Python Service: backend/python-service/ gefunden"
        echo "   📋 requirements.txt: $([ -f "backend/python-service/requirements.txt" ] && echo "✅" || echo "❌")"
        echo "   🐍 venv: $([ -d "backend/python-service/venv" ] && echo "✅" || echo "❌")"
    else
        echo "   ❌ Python Service: backend/python-service/ NICHT gefunden"
    fi
    echo ""
fi

# Create environment files if they don't exist
echo "📝 Setting up environment files..."

# Frontend environment - check if directory exists first
if [ ! -d "frontend" ]; then
    echo "❌ Frontend directory 'frontend' not found!"
    echo "   Expected: frontend/"
    echo "   Please check your project structure."
    exit 1
fi

# Frontend environment
if [ ! -f frontend/.env.local ]; then
    cat > frontend/.env.local << EOF
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_MAX_FILE_SIZE=500
VITE_CHUNK_SIZE=32
EOF
    echo "✅ Created frontend/.env.local"
fi

# Node.js service environment - check if directory exists first
if [ ! -d "backend/node-service" ]; then
    echo "❌ Node.js service directory 'backend/node-service' not found!"
    echo "   Expected: backend/node-service/"
    echo "   Please check your project structure."
    exit 1
fi

if [ ! -f backend/node-service/.env ]; then
    cat > backend/node-service/.env << EOF
PORT=3000
REDIS_URL=redis://localhost:6379
DATABASE_URL=sqlite:./data/voxflow.db
PYTHON_SERVICE_URL=http://localhost:8000
JWT_SECRET=dev-secret-key-change-in-production
NODE_ENV=development
EOF
    echo "✅ Created backend/node-service/.env"
fi

# Python service environment - check if directory exists first
if [ ! -d "backend/python-service" ]; then
    echo "❌ Python service directory 'backend/python-service' not found!"
    echo "   Expected: backend/python-service/"
    echo "   Please check your project structure."
    exit 1
fi

if [ ! -f backend/python-service/.env ]; then
    cat > backend/python-service/.env << EOF
PORT=8000
MODEL_NAME=mistralai/Voxtral-Mini-3B-2507
DEVICE=mps
MAX_AUDIO_LENGTH=1800
CHUNK_SIZE=30
REDIS_URL=redis://localhost:6379
ENVIRONMENT=development
EOF
    echo "✅ Created backend/python-service/.env"
fi

echo ""
echo "🚀 Starting native services..."
echo "This may take a few minutes on first run..."

# Check dependencies
echo "🔍 Checking dependencies..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.8+ from https://python.org/"
    exit 1
fi

echo "✅ Dependencies check passed"
echo ""

# Port checking function
check_port() {
    local port=$1
    local service_name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $port already in use by another process"
        echo "   Service: $service_name"
        echo "   PID: $(lsof -Pi :$port -sTCP:LISTEN -t)"
        return 1
    fi
    return 0
}

# Service cleanup function
cleanup_service_ports() {
    echo "🧹 Cleaning up potentially conflicting processes..."
    
    # Kill any existing VoxFlow processes
    pkill -f "redis-server.*6379" 2>/dev/null || true
    pkill -f "uvicorn.*8000" 2>/dev/null || true
    pkill -f "npm.*dev.*node-service" 2>/dev/null || true
    pkill -f "npm.*dev.*frontend" 2>/dev/null || true
    pkill -f "vite.*5173" 2>/dev/null || true
    
    # Wait for processes to terminate
    sleep 3
    
    echo "   ✅ Process cleanup completed"
}

# Service startup functions
start_redis() {
    echo "🔴 Starting Redis server..."
    
    # Check if port is available
    if ! check_port 6379 "Redis"; then
        echo "   🧹 Cleaning up existing Redis process..."
        pkill -f "redis-server.*6379" 2>/dev/null || true
        sleep 2
    fi
    
    if pgrep -f redis-server > /dev/null; then
        echo "   ⚠️  Redis already running"
        return 0
    fi
    
    redis-server --port 6379 --daemonize yes --logfile redis.log
    REDIS_PID=$(pgrep -f "redis-server.*6379")
    
    # Wait for Redis to be ready
    local count=0
    while [ $count -lt 10 ]; do
        if redis-cli ping >/dev/null 2>&1; then
            echo "   ✅ Redis ready on port 6379"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    
    echo "   ❌ Redis startup failed"
    return 1
}

start_python_service() {
    echo "🐍 Starting Python Voxtral service..."
    cd backend/python-service
    
    # Check for FAST_START mode
    if [ "$VOXFLOW_FAST_START" = "true" ]; then
        echo "   ⚡ Fast Start Mode - skipping dependency installation"
        if [ ! -d "venv" ]; then
            echo "   ❌ ERROR: venv not found - run VoxFlow-Install.command first"
            return 1
        fi
        if [ ! -f ".deps_installed" ]; then
            echo "   ❌ ERROR: Dependencies not installed - run VoxFlow-Install.command first"
            return 1
        fi
    else
        # Legacy installation mode (for backwards compatibility)
        if [ ! -d "venv" ]; then
            echo "   📦 Creating Python virtual environment..."
            python3 -m venv venv
        fi
        
        if [ ! -f ".deps_installed" ]; then
            echo "   📋 Installing Python dependencies (production-ready)..."
            # Install core dependencies first (Python 3.13 compatible)
            pip install fastapi uvicorn transformers torch torchaudio numpy pydantic pydantic-settings
            # Install Voxtral-specific dependencies
            pip install git+https://github.com/huggingface/transformers.git mistral-common
            # Install audio processing
            pip install soundfile librosa
            # Install logging and utilities
            pip install loguru aiofiles python-multipart
            
            touch .deps_installed
            echo "   ✅ Production dependencies installed successfully"
        fi
    fi
    
    # Activate venv
    source venv/bin/activate
    
    # Test Voxtral before starting service (Production-Ready validation)
    echo "   🎯 Testing Voxtral model functionality..."
    if python test_voxtral_native.py; then
        echo "   ✅ Voxtral test passed - model ready for production"
    else
        echo "   ❌ Voxtral test failed - check configuration"
        echo "   💡 Ensure you're on Apple Silicon with MPS support"
        return 1
    fi
    
    # Start service in background
    echo "   🚀 Starting Voxtral service on port 8000..."
    nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > python_service.log 2>&1 &
    PYTHON_PID=$!
    cd - > /dev/null
    
    # Wait for service to be ready
    local count=0
    while [ $count -lt 30 ]; do
        if curl -s -f "http://localhost:8000/health" > /dev/null 2>&1; then
            echo "   ✅ Python service ready on port 8000"
            return 0
        fi
        sleep 2
        count=$((count + 1))
    done
    
    echo "   ❌ Python service startup failed"
    return 1
}

start_node_service() {
    echo "🟢 Starting Node.js API Gateway..."
    
    # Check if port is available
    if ! check_port 3000 "Node.js API Gateway"; then
        echo "   🧹 Cleaning up existing Node.js process..."
        pkill -f "npm.*dev.*node-service" 2>/dev/null || true
        pkill -f "node.*tsx.*server.ts" 2>/dev/null || true
        sleep 3
    fi
    
    cd backend/node-service
    
    # Check for FAST_START mode
    if [ "$VOXFLOW_FAST_START" = "true" ]; then
        echo "   ⚡ Fast Start Mode - skipping dependency installation"
        if [ ! -d "node_modules" ]; then
            echo "   ❌ ERROR: node_modules not found - run VoxFlow-Install.command first"
            return 1
        fi
        if [ ! -f ".deps_installed" ]; then
            echo "   ❌ ERROR: Dependencies not installed - run VoxFlow-Install.command first"
            return 1
        fi
    else
        # Legacy installation mode (for backwards compatibility)
        if [ ! -d "node_modules" ] || [ ! -f ".deps_installed" ]; then
            echo "   📦 Installing Node.js dependencies..."
            npm install
            touch .deps_installed
        fi
    fi
    
    # Start service in background
    echo "   🚀 Starting API Gateway on port 3000..."
    nohup npm run dev > node_service.log 2>&1 &
    NODE_PID=$!
    cd - > /dev/null
    
    # Wait for service to be ready
    local count=0
    while [ $count -lt 20 ]; do
        if curl -s -f "http://localhost:3000/health" > /dev/null 2>&1; then
            echo "   ✅ Node.js service ready on port 3000"
            return 0
        fi
        sleep 2
        count=$((count + 1))
    done
    
    echo "   ❌ Node.js service startup failed"
    return 1
}

start_frontend() {
    echo "⚛️  Starting React Frontend..."
    
    # Check if port is available
    if ! check_port 5173 "React Frontend"; then
        echo "   🧹 Cleaning up existing Frontend process..."
        pkill -f "npm.*dev.*frontend" 2>/dev/null || true
        pkill -f "vite.*5173" 2>/dev/null || true
        sleep 3
    fi
    
    cd frontend
    
    # Check for FAST_START mode
    if [ "$VOXFLOW_FAST_START" = "true" ]; then
        echo "   ⚡ Fast Start Mode - skipping dependency installation"
        if [ ! -d "node_modules" ]; then
            echo "   ❌ ERROR: node_modules not found - run VoxFlow-Install.command first"
            return 1
        fi
        if [ ! -f ".deps_installed" ]; then
            echo "   ❌ ERROR: Dependencies not installed - run VoxFlow-Install.command first"
            return 1
        fi
    else
        # Legacy installation mode (for backwards compatibility)
        if [ ! -d "node_modules" ] || [ ! -f ".deps_installed" ]; then
            echo "   📦 Installing Frontend dependencies..."
            npm install
            touch .deps_installed
        fi
    fi
    
    # Start frontend in background
    echo "   🚀 Starting Frontend on port 5173..."
    nohup npm run dev > frontend_service.log 2>&1 &
    FRONTEND_PID=$!
    cd - > /dev/null
    
    # Wait for frontend to be ready
    local count=0
    while [ $count -lt 15 ]; do
        if curl -s -f "http://localhost:5173" > /dev/null 2>&1; then
            echo "   ✅ Frontend ready on port 5173"
            return 0
        fi
        sleep 2
        count=$((count + 1))
    done
    
    echo "   ❌ Frontend startup failed"
    return 1
}

# Service health check function
check_service() {
    local service=$1
    local url=$2
    local timeout=60
    local count=0
    
    while [ $count -lt $timeout ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            if [[ $DEBUG_ENABLED == true ]]; then
                response_time=$(curl -s -w "%{time_total}" -o /dev/null "$url")
                echo "✅ $service bereit (${response_time}s Response-Zeit)"
            else
                echo "✅ $service bereit"
            fi
            return 0
        fi
        
        if [[ $DEBUG_ENABLED == true && $((count % 5)) -eq 0 && $count -gt 0 ]]; then
            echo "   🔄 $service: Versuch $count/$timeout..."
        fi
        
        sleep 2
        count=$((count + 1))
        if [[ $DEBUG_ENABLED == false ]]; then
            printf "."
        fi
    done
    
    echo "❌ $service Timeout nach ${timeout}s"
    return 1
}

# Initial cleanup to prevent port conflicts
cleanup_service_ports

# Start all services in sequence
echo "🚀 Starting VoxFlow services in sequence..."

# 1. Start Redis
if ! start_redis; then
    echo "❌ Failed to start Redis"
    cleanup
    exit 1
fi

# 2. Start Python Service
if ! start_python_service; then
    echo "❌ Failed to start Python Service"
    cleanup
    exit 1
fi

# 3. Start Node.js Service  
if ! start_node_service; then
    echo "❌ Failed to start Node.js Service"
    cleanup
    exit 1
fi

# 4. Start Frontend
if ! start_frontend; then
    echo "❌ Failed to start Frontend"
    cleanup
    exit 1
fi

echo ""
echo "🎉 VoxFlow erfolgreich gestartet!"
echo ""
echo "🌐 VERFÜGBARE SERVICES:"
echo "   ┌─ Frontend (Web-Interface)"
echo "   │  └── http://localhost:5173"
echo "   ├─ API Gateway (REST + WebSocket)"  
echo "   │  └── http://localhost:3000"
echo "   ├─ Python AI Service (Voxtral Model)"
echo "   │  └── http://localhost:8000"
echo "   └─ Redis Cache"
echo "      └── localhost:6379"
echo ""
echo "🎯 ERSTE SCHRITTE:"
echo "   1. Browser öffnet automatisch auf http://localhost:5173"
echo "   2. Audio-Datei per Drag & Drop hochladen"
echo "   3. Transcription startet automatisch"
echo "   4. Ergebnis wird in Real-time angezeigt"
echo ""

if [[ $DEBUG_ENABLED == true ]]; then
    echo "🐛 DEBUG-BEFEHLE:"
    echo "   Service-Logs:     tail -f *_service.log"
    echo "   Process-Status:   ps aux | grep -E '(redis|uvicorn|node|vite)'"
    echo "   Port-Check:       lsof -i :3000,8000,5173,6379"
    echo "   Kill-Process:     kill \$PID"
    echo ""
fi

echo "📊 SERVICE-MANAGEMENT:"
echo "   View logs:     tail -f redis.log python_service.log node_service.log frontend_service.log"
echo "   Stop all:      Ctrl+C (cleanup automatisch)"
echo "   Process IDs:"
if [[ -n "$REDIS_PID" ]]; then echo "   Redis:         $REDIS_PID"; fi
if [[ -n "$PYTHON_PID" ]]; then echo "   Python:        $PYTHON_PID"; fi
if [[ -n "$NODE_PID" ]]; then echo "   Node.js:       $NODE_PID"; fi
if [[ -n "$FRONTEND_PID" ]]; then echo "   Frontend:      $FRONTEND_PID"; fi
echo ""
echo "🔧 Native Development Features:"
echo "   ✅ Hot reload enabled for all services"
echo "   ✅ Live file watching and auto-restart"
echo "   ✅ Native Apple Silicon performance"
echo "   ✅ Direct filesystem access"
echo ""

# Browser automatisch öffnen
echo "🌐 Browser wird geöffnet..."
sleep 3
open http://localhost:5173

echo ""
echo "🔄 VoxFlow läuft nativ im Hintergrund..."
echo "🛑 Services stoppen: Ctrl+C (automatisches Cleanup)"
echo "📊 Live-Logs anzeigen: tail -f *_service.log"
echo ""
echo "💡 Terminal offen lassen für Service-Management"
echo "🚪 Zum Beenden: Ctrl+C"
echo ""

# Terminal interaktiv halten (nur wenn direkt aufgerufen)
if [[ -n "$VOXFLOW_FAST_START" ]]; then
    echo "⚡ VoxFlow Services im Hintergrund gestartet (Fast Start Mode)"
    echo "📊 Voxtral Debug-Logs anzeigen: tail -f backend/python-service/python_service.log | grep -E '(transcription|Voxtral|processor)'"
    echo "🛑 Services manuell stoppen: pkill -f 'redis-server.*6379|uvicorn.*8000|npm.*dev'"
    echo ""
    echo "💡 Terminal bleibt für weitere Befehle verfügbar..."
    exit 0
fi

# Interactive mode (nur wenn direkt aufgerufen)
while true; do
    echo "Wähle eine Option:"
    echo "  [l] Live-Logs anzeigen"
    echo "  [s] Service-Status prüfen" 
    echo "  [p] Process-Liste anzeigen"
    echo "  [q] Services stoppen & beenden"
    echo ""
    read -p "Option (l/s/p/q): " choice
    
    case $choice in
        l|L) 
            echo "📊 Live-Logs (Ctrl+C zum Beenden):"
            tail -f redis.log backend/python-service/python_service.log backend/node-service/node_service.log frontend/frontend_service.log 2>/dev/null || echo "Log-Dateien noch nicht verfügbar"
            ;;
        s|S) 
            echo "📋 Service-Status:"
            echo "Redis:    $(redis-cli ping 2>/dev/null || echo 'NOT RUNNING')"
            echo "Python:   $(curl -s http://localhost:8000/health >/dev/null 2>&1 && echo 'RUNNING' || echo 'NOT RUNNING')"
            echo "Node.js:  $(curl -s http://localhost:3000/health >/dev/null 2>&1 && echo 'RUNNING' || echo 'NOT RUNNING')"
            echo "Frontend: $(curl -s http://localhost:5173 >/dev/null 2>&1 && echo 'RUNNING' || echo 'NOT RUNNING')"
            ;;
        p|P)
            echo "🔍 VoxFlow Processes:"
            ps aux | grep -E "(redis-server|uvicorn|node.*dev|vite)" | grep -v grep || echo "Keine VoxFlow Processes gefunden"
            ;;
        q|Q) 
            echo "🛑 Stopping VoxFlow..."
            cleanup
            exit 0
            ;;
        *) echo "Ungültige Option" ;;
    esac
    echo ""
done
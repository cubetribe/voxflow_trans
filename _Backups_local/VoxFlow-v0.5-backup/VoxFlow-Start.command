#!/bin/bash

# VoxFlow Development Startup Script
# This script starts the complete VoxFlow stack in Docker containers

set -e

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
echo "🏗️  Architektur:"
echo "   🐍 Python Service (Port 8000) - Voxtral AI Model"
echo "   🟢 Node.js Gateway (Port 3000) - API & WebSocket"
echo "   ⚛️  React Frontend (Port 5173) - Web Interface"
echo "   🔴 Redis Cache (Port 6379) - Performance"
echo ""

# DEBUG-MODUS ABFRAGE
read -p "🔧 Debug-Modus aktivieren? (y/n): " DEBUG_MODE
if [[ $DEBUG_MODE == "y" || $DEBUG_MODE == "Y" ]]; then
    echo "🐛 DEBUG-MODUS AKTIV - Detaillierte Logs werden angezeigt"
    DEBUG_ENABLED=true
    set -x  # Bash debug für Commands
else
    DEBUG_ENABLED=false
fi

echo ""
echo "🚀 Starting VoxFlow Development Environment"
echo "=========================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# DETAILLIERTE SYSTEM-INFORMATIONEN (im Debug-Modus)
if [[ $DEBUG_ENABLED == true ]]; then
    echo ""
    echo "🔍 SYSTEM-INFORMATIONEN:"
    echo "   macOS: $(sw_vers -productVersion)"
    echo "   Docker: $(docker --version)"
    echo "   Verfügbarer RAM: $(sysctl hw.memsize | awk '{print int($2/1024/1024/1024)}')GB"
    echo "   CPU Kerne: $(sysctl hw.ncpu | awk '{print $2}')"
    echo ""
    
    echo "🔍 VERZEICHNIS-CHECKS:"
    echo "   Aktuelles Verzeichnis: $(pwd)"
    if [ -d "frontend_new/project" ]; then
        echo "   ✅ Frontend: frontend_new/project/ gefunden"
    else
        echo "   ❌ Frontend: frontend_new/project/ NICHT gefunden"
        echo "   📂 Verfügbare Verzeichnisse:"
        ls -la | grep "^d" | awk '{print "      " $9}' || true
    fi
    
    if [ -d "backend/node-service" ]; then
        echo "   ✅ Node.js Service: backend/node-service/ gefunden"
    else
        echo "   ❌ Node.js Service: backend/node-service/ NICHT gefunden"
    fi
    
    if [ -d "backend/python-service" ]; then
        echo "   ✅ Python Service: backend/python-service/ gefunden"
    else
        echo "   ❌ Python Service: backend/python-service/ NICHT gefunden"
    fi
    
    if [ -f "docker-compose.yml" ]; then
        echo "   ✅ Docker Compose: docker-compose.yml gefunden"
    else
        echo "   ❌ Docker Compose: docker-compose.yml NICHT gefunden"
        echo "   📂 Verfügbare Dateien:"
        ls -la *.yml 2>/dev/null | awk '{print "      " $9}' || echo "      Keine .yml Dateien gefunden"
    fi
    echo ""
fi

# Create environment files if they don't exist
echo "📝 Setting up environment files..."

# Frontend environment - check if directory exists first
if [ ! -d "frontend_new/project" ]; then
    echo "❌ Frontend directory 'frontend_new/project' not found!"
    echo "   Expected: frontend_new/project/"
    echo "   Please check your project structure."
    exit 1
fi

# Frontend environment
if [ ! -f frontend_new/project/.env.local ]; then
    # Create .env.local with default values since .env.example might not exist
    cat > frontend_new/project/.env.local << EOF
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_MAX_FILE_SIZE=500
VITE_CHUNK_SIZE=32
EOF
    echo "✅ Created frontend_new/project/.env.local"
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
REDIS_URL=redis://redis:6379
DATABASE_URL=sqlite:./data/voxflow.db
PYTHON_SERVICE_URL=http://python-service:8000
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
REDIS_URL=redis://redis:6379
ENVIRONMENT=development
EOF
    echo "✅ Created backend/python-service/.env"
fi

echo ""
echo "🐳 Starting Docker containers..."
echo "This may take a few minutes on first run..."

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found in current directory!"
    echo "   Expected: docker-compose.yml"
    echo "   Current directory: $(pwd)"
    echo "   Available compose files:"
    ls -la docker-compose*.yml 2>/dev/null || echo "   No docker-compose files found"
    exit 1
fi

# Erweiterte Build-Logik - Requirements-Änderungen erkennen
echo "🔍 Prüfe ob Images neu gebaut werden müssen..."

# Check 1: Existieren Images überhaupt?
if ! docker images | grep -q "voxflow_traskriber"; then
    echo "🏗️ Erste Installation - Building alle Images..."
    docker-compose build --no-cache
    
# Check 2: Dependencies geändert? (requirements-docker.txt neuer als Image)
elif [ "backend/python-service/requirements-docker.txt" -nt "$(docker images --format "table {{.CreatedAt}}" voxflow_traskriber-python-service | tail -n +2 | head -1)" ] 2>/dev/null; then
    echo "📦 Requirements geändert - Rebuilding Python Service..."
    docker-compose build --no-cache python-service
    
# Check 3: Dockerfile geändert?
elif [ "backend/python-service/Dockerfile" -nt "$(docker images --format "table {{.CreatedAt}}" voxflow_traskriber-python-service | tail -n +2 | head -1)" ] 2>/dev/null; then
    echo "🐳 Dockerfile geändert - Rebuilding Python Service..."
    docker-compose build --no-cache python-service
    
else
    echo "✅ Images sind aktuell - kein Build erforderlich"
fi

# Stoppe alte Container falls vorhanden
echo "🛑 Stoppe laufende Container..."
docker-compose down 2>/dev/null || true

# Starte Services
echo "🚀 Starte VoxFlow Services..."
docker-compose up -d

# ERWEITERTE PYTHON SERVICE DEBUG INFO
echo ""
echo "🔍 Checking Python Service Status..."
sleep 5

# Container Status
echo ""
echo "📋 Container Status:"
docker-compose ps python-service

# Die letzten 50 Logs
echo ""
echo "📋 Python Service Logs (Last 50 lines):"
docker-compose logs python-service --tail=50

# Speziell nach Errors suchen
echo ""
echo "❌ Error Details:"
docker-compose logs python-service --tail=100 | grep -E "ERROR|KeyError|Failed|Exception|Traceback" || echo "No specific errors found"

# Health Check Detail
echo ""
echo "🏥 Health Check Details:"
docker inspect $(docker-compose ps -q python-service) --format='{{json .State.Health}}' 2>/dev/null | jq '.' 2>/dev/null || echo "No health check info available"

# Container Resource Usage
echo ""
echo "📊 Container Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep python-service || echo "No stats available"

# Network Connectivity Test
echo ""
echo "🌐 Network Connectivity Test:"
docker exec $(docker-compose ps -q python-service) curl -f http://localhost:8000/health 2>/dev/null && echo "✅ Internal health check OK" || echo "❌ Internal health check FAILED"

# Environment Variables Check
if [[ $DEBUG_ENABLED == true ]]; then
    echo ""
    echo "🔧 Environment Variables:"
    docker exec $(docker-compose ps -q python-service) env | grep -E "MODEL_NAME|DEVICE|PORT|REDIS_URL" || echo "No relevant env vars found"
fi

echo ""
echo "⏳ Waiting for services to become healthy..."

# ERWEITERTE SERVICE-CHECKS MIT DEBUG
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
            # Container Status anzeigen
            docker-compose ps $service 2>/dev/null | tail -n +2 || true
        fi
        
        sleep 2
        count=$((count + 1))
        if [[ $DEBUG_ENABLED == false ]]; then
            printf "."
        fi
    done
    
    echo "❌ $service Timeout nach ${timeout}s"
    if [[ $DEBUG_ENABLED == true ]]; then
        echo "🔧 Debug-Logs für $service:"
        docker-compose logs --tail=10 $service 2>/dev/null || true
    fi
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
    echo "   Live-Logs:        docker-compose logs -f"
    echo "   Service-Status:   docker-compose ps"
    echo "   Container-Shell:  docker-compose exec <service> sh"
    echo "   Resource-Usage:   docker stats"
    echo ""
fi

echo "📊 SERVICE-MANAGEMENT:"
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

# Optional: Pausiere vor Browser-Öffnung im Debug-Modus
if [[ $DEBUG_ENABLED == true ]]; then
    echo ""
    echo "⏸️  Debug Mode: Press Enter to continue to browser..."
    read
fi

# Browser automatisch öffnen
echo "🌐 Browser wird geöffnet..."
sleep 3
open http://localhost:5173

echo ""
echo "🔄 VoxFlow läuft im Hintergrund..."
echo "🛑 Services stoppen: docker-compose down"
echo "📊 Live-Logs anzeigen: docker-compose logs -f"
echo ""
echo "💡 Terminal offen lassen für Service-Management"
echo "🚪 Zum Beenden: Ctrl+C oder Terminal schließen"
echo ""

# Terminal interaktiv halten
while true; do
    echo "Wähle eine Option:"
    echo "  [l] Live-Logs anzeigen"
    echo "  [s] Service-Status prüfen" 
    echo "  [r] Services neu starten"
    echo "  [q] Services stoppen & beenden"
    echo ""
    read -p "Option (l/s/r/q): " choice
    
    case $choice in
        l|L) docker-compose logs -f ;;
        s|S) docker-compose ps ;;
        r|R) docker-compose restart ;;
        q|Q) docker-compose down && echo "✅ VoxFlow gestoppt" && exit 0 ;;
        *) echo "Ungültige Option" ;;
    esac
    echo ""
done
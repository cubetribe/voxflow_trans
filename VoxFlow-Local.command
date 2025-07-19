#!/bin/bash

# VoxFlow Local Development - Mit lokalem Redis oder In-Memory Fallback
# Optimiert für M4 Max Performance

cd "$(dirname "$0")"

echo -ne "\033]0;VoxFlow Local Development\007"

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}🚀 VoxFlow Local Development${NC}"
echo "=================================="
echo -e "${YELLOW}⚡ Optimiert für M4 Max Performance${NC}"
echo ""

# System Info
echo -e "${BLUE}💻 System Check:${NC}"
echo "   Architecture: $(uname -m)"
echo "   macOS: $(sw_vers -productVersion)"
echo "   Available RAM: $(system_profiler SPHardwareDataType | grep "Memory:" | awk '{print $2 " " $3}')"
echo ""

# Docker Check
echo -e "${BLUE}🐳 Docker Status:${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker ist nicht gestartet${NC}"
    echo ""
    echo "Bitte Docker Desktop starten und erneut versuchen."
    read -p "Enter zum Beenden..."
    exit 1
else
    echo -e "${GREEN}✅ Docker läuft${NC}"
fi

# Redis Check (Optional)
echo -e "${BLUE}🔴 Redis Check (Optional):${NC}"
if command -v redis-server &> /dev/null; then
    if pgrep -x "redis-server" > /dev/null; then
        echo -e "${GREEN}✅ Redis läuft lokal (optimal für Performance)${NC}"
        redis_status="running"
    else
        echo -e "${YELLOW}⚠️  Redis installiert, aber nicht gestartet${NC}"
        echo "   Möchten Sie Redis jetzt starten? (empfohlen für beste Performance)"
        read -p "   Redis starten? (y/n): " start_redis
        
        if [[ $start_redis =~ ^[Yy]$ ]]; then
            echo "   Starte Redis..."
            redis-server --daemonize yes --port 6379
            sleep 2
            if pgrep -x "redis-server" > /dev/null; then
                echo -e "${GREEN}✅ Redis erfolgreich gestartet${NC}"
                redis_status="running"
            else
                echo -e "${YELLOW}⚠️  Redis Start fehlgeschlagen - nutze In-Memory Fallback${NC}"
                redis_status="fallback"
            fi
        else
            redis_status="fallback"
        fi
    fi
else
    echo -e "${CYAN}ℹ️  Redis nicht installiert - nutze In-Memory Fallback${NC}"
    echo "   Für optimale Performance: brew install redis"
    redis_status="fallback"
fi

if [ "$redis_status" = "fallback" ]; then
    echo -e "${CYAN}   📝 Info: VoxFlow funktioniert auch ohne Redis (In-Memory Caching)${NC}"
fi

echo ""

# Environment Files
echo -e "${BLUE}📝 Environment Setup:${NC}"

# Frontend
if [ ! -f frontend/.env.local ]; then
    cp frontend/.env.example frontend/.env.local
    echo -e "${GREEN}✅ Frontend .env.local erstellt${NC}"
fi

# Node.js Service
if [ ! -f backend/node-service/.env ]; then
    cat > backend/node-service/.env << 'EOF'
PORT=3000
REDIS_URL=redis://localhost:6379
REDIS_OPTIONAL=true
DATABASE_URL=sqlite:./data/voxflow.db
PYTHON_SERVICE_URL=http://python-service:8000
JWT_SECRET=dev-secret-key-change-in-production
NODE_ENV=development
LOG_LEVEL=debug
EOF
    echo -e "${GREEN}✅ Node.js .env erstellt (mit Redis-Fallback)${NC}"
fi

# Python Service
if [ ! -f backend/python-service/.env ]; then
    cat > backend/python-service/.env << 'EOF'
PORT=8000
MODEL_NAME=mistralai/Voxtral-Mini-3B-2507
DEVICE=mps
MAX_AUDIO_LENGTH=1800
CHUNK_SIZE=30
REDIS_URL=redis://host.docker.internal:6379
REDIS_OPTIONAL=true
ENVIRONMENT=development
LOG_LEVEL=debug
PYTHONUNBUFFERED=1
EOF
    echo -e "${GREEN}✅ Python .env erstellt (mit Redis-Fallback)${NC}"
fi

echo ""
echo -e "${BLUE}🚀 Starte VoxFlow Services...${NC}"
echo -e "${CYAN}   Nutze lokale Konfiguration (ohne Redis Container)${NC}"
echo ""

# Starte mit lokaler Konfiguration (ohne Redis Container)
docker-compose -f docker-compose.local.yml up --build -d

echo ""
echo -e "${BLUE}⏳ Service Initialisierung...${NC}"

# Service Check Funktion
check_service_local() {
    local service_name=$1
    local url=$2
    local timeout=120
    local count=0
    
    echo -e "${CYAN}🔍 Prüfe ${service_name}...${NC}"
    
    while [ $count -lt $timeout ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo -e "   ${GREEN}✅ ${service_name} ist bereit${NC}"
            return 0
        fi
        
        if [ $((count % 20)) -eq 0 ] && [ $count -gt 0 ]; then
            echo -e "   ${YELLOW}⏳ Noch nicht bereit... (${count}s/${timeout}s)${NC}"
            
            # Container Status bei längerer Wartezeit
            container_status=$(docker-compose -f docker-compose.local.yml ps --services 2>/dev/null)
            if [ ! -z "$container_status" ]; then
                echo -e "   ${CYAN}   Container Status:${NC}"
                docker-compose -f docker-compose.local.yml ps 2>/dev/null | grep -E "(python-service|node-service|frontend)" | sed 's/^/      /'
            fi
        fi
        
        sleep 2
        count=$((count + 2))
    done
    
    echo -e "   ${RED}❌ ${service_name} Timeout nach ${timeout}s${NC}"
    return 1
}

# Services prüfen
success=true

if ! check_service_local "Python Service" "http://localhost:8000/health"; then
    echo -e "${RED}❌ Python Service Fehler${NC}"
    docker-compose -f docker-compose.local.yml logs python-service | tail -10 | sed 's/^/   /'
    success=false
fi

echo ""

if ! check_service_local "Node.js Service" "http://localhost:3000/health"; then
    echo -e "${RED}❌ Node.js Service Fehler${NC}"
    docker-compose -f docker-compose.local.yml logs node-service | tail -10 | sed 's/^/   /'
    success=false
fi

echo ""

if ! check_service_local "Frontend" "http://localhost:5173"; then
    echo -e "${RED}❌ Frontend Fehler${NC}"
    docker-compose -f docker-compose.local.yml logs frontend | tail -10 | sed 's/^/   /'
    success=false
fi

echo ""

if [ "$success" = true ]; then
    echo -e "${GREEN}🎉 VoxFlow Local erfolgreich gestartet!${NC}"
    echo ""
    echo -e "${BLUE}🌐 Verfügbare Services:${NC}"
    echo "   🖥️  Frontend:         http://localhost:5173"
    echo "   🔧 API Gateway:      http://localhost:3000"
    echo "   🐍 Python Service:   http://localhost:8000"
    if [ "$redis_status" = "running" ]; then
        echo "   🔴 Redis (lokal):    localhost:6379 ✅"
    else
        echo "   🧠 Caching:         In-Memory (Redis optional)"
    fi
    echo ""
    echo -e "${BLUE}⚡ Performance-Optimierungen:${NC}"
    echo "   ✅ Kein Redis Container (weniger Docker Overhead)"
    echo "   ✅ Lokale Redis-Nutzung oder In-Memory Fallback"
    echo "   ✅ M4 Max optimierte Container"
    echo "   ✅ MLX für Apple Silicon"
    echo ""
    echo -e "${BLUE}📊 Nützliche Befehle:${NC}"
    echo "   Logs anzeigen:       docker-compose -f docker-compose.local.yml logs -f"
    echo "   Services stoppen:    docker-compose -f docker-compose.local.yml down"
    echo "   Redis lokal stoppen: redis-cli shutdown"
    echo ""
    
    # Browser öffnen
    echo -e "${CYAN}🌐 Browser wird geöffnet...${NC}"
    sleep 3
    open http://localhost:5173
    
    echo ""
    echo -e "${YELLOW}💡 Tipps für optimale Performance:${NC}"
    echo "   - Redis lokal installieren: brew install redis"
    echo "   - Redis starten: redis-server"
    echo "   - Mehr Docker RAM zuweisen (6GB+ empfohlen)"
    echo ""
    echo -e "${CYAN}🔴 Zum Beenden: Ctrl+C oder Terminal schließen${NC}"
    echo ""
    
    # Warte auf Benutzer-Unterbrechung
    trap 'echo ""; echo -e "${YELLOW}🛑 VoxFlow wird beendet...${NC}"; docker-compose -f docker-compose.local.yml down; echo -e "${GREEN}✅ VoxFlow beendet${NC}"; exit 0' INT
    
    # Halte Terminal offen
    while true; do
        sleep 30
        # Prüfe Container Status
        if ! docker-compose -f docker-compose.local.yml ps | grep -q "Up"; then
            echo -e "${YELLOW}⚠️  Service Status geändert - prüfe Container${NC}"
            docker-compose -f docker-compose.local.yml ps
        fi
    done
    
else
    echo -e "${RED}❌ VoxFlow Local Start fehlgeschlagen${NC}"
    echo ""
    echo -e "${BLUE}🔧 Debugging:${NC}"
    echo "   Container Status:"
    docker-compose -f docker-compose.local.yml ps | sed 's/^/   /'
    echo ""
    echo "   Alle Logs:"
    docker-compose -f docker-compose.local.yml logs | tail -20 | sed 's/^/   /'
    echo ""
    echo -e "${BLUE}💡 Lösungsvorschläge:${NC}"
    echo "   1. Docker Desktop neu starten"
    echo "   2. Services einzeln starten: docker-compose -f docker-compose.local.yml up python-service"
    echo "   3. Debug-Modus nutzen: ./VoxFlow-Debug.command"
    echo "   4. Vollständige Docker-Version: ./VoxFlow.command"
    echo ""
    read -p "Enter zum Beenden..."
    exit 1
fi
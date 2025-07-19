#!/bin/bash

# VoxFlow Debug Launcher - Für Entwicklung und Debugging
# Zeigt alle Logs und Debug-Informationen in Echtzeit

# Wechsle in das Verzeichnis der Datei
cd "$(dirname "$0")"

# Terminal-Fenster Titel setzen
echo -ne "\033]0;VoxFlow Debug Mode\007"

# Farben für bessere Lesbarkeit
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🔧 VoxFlow Debug Mode${NC}"
echo "============================="
echo -e "${YELLOW}⚠️  Debug-Modus zeigt detaillierte Logs und System-Informationen${NC}"
echo ""

# System-Informationen anzeigen
echo -e "${BLUE}💻 System-Informationen:${NC}"
echo "   macOS Version: $(sw_vers -productVersion)"
echo "   Architektur: $(uname -m)"
echo "   Verfügbarer RAM: $(system_profiler SPHardwareDataType | grep "Memory:" | awk '{print $2 " " $3}')"
echo "   CPU Kerne: $(sysctl -n hw.ncpu)"
echo ""

# Docker-Status prüfen
echo -e "${BLUE}🐳 Docker-Status:${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker ist nicht gestartet${NC}"
    echo ""
    echo "Bitte Docker Desktop starten und dann erneut versuchen."
    read -p "Drücken Sie Enter zum Beenden..."
    exit 1
else
    echo -e "${GREEN}✅ Docker ist aktiv${NC}"
    echo "   Docker Version: $(docker --version)"
    echo "   Docker Compose Version: $(docker-compose --version)"
    echo "   Laufende Container: $(docker ps --format 'table {{.Names}}\t{{.Status}}' | wc -l | xargs echo) $([ $(docker ps -q | wc -l) -gt 0 ] && echo "(aktiv)" || echo "(keine)")"
fi
echo ""

# Aktuelle VoxFlow Container prüfen
echo -e "${BLUE}📦 VoxFlow Container Status:${NC}"
if docker-compose ps | grep -q "voxflow"; then
    docker-compose ps
else
    echo "   Keine VoxFlow Container aktiv"
fi
echo ""

# Environment Files prüfen und erstellen
echo -e "${BLUE}📝 Environment-Konfiguration:${NC}"

check_env_file() {
    local file=$1
    local service=$2
    
    if [ -f "$file" ]; then
        echo -e "   ✅ ${service}: ${file} (existiert)"
        echo -e "${CYAN}      Inhalt:${NC}"
        cat "$file" | sed 's/^/         /' | head -5
        [ $(cat "$file" | wc -l) -gt 5 ] && echo "         ... ($(cat "$file" | wc -l) Zeilen insgesamt)"
    else
        echo -e "   ⚠️  ${service}: ${file} (wird erstellt)"
        return 1
    fi
}

check_env_file "frontend/.env.local" "Frontend"
if [ ! -f frontend/.env.local ]; then
    cp frontend/.env.example frontend/.env.local
    echo -e "   ${GREEN}✅ Frontend .env.local erstellt${NC}"
fi

echo ""

check_env_file "backend/node-service/.env" "Node.js Service"
if [ ! -f backend/node-service/.env ]; then
    cat > backend/node-service/.env << 'EOF'
PORT=3000
REDIS_URL=redis://redis:6379
DATABASE_URL=sqlite:./data/voxflow.db
PYTHON_SERVICE_URL=http://python-service:8000
JWT_SECRET=dev-secret-key-change-in-production
NODE_ENV=development
LOG_LEVEL=debug
DEBUG=voxflow:*
EOF
    echo -e "   ${GREEN}✅ Node.js Service .env erstellt (mit Debug-Flags)${NC}"
fi

echo ""

check_env_file "backend/python-service/.env" "Python Service"  
if [ ! -f backend/python-service/.env ]; then
    cat > backend/python-service/.env << 'EOF'
PORT=8000
MODEL_NAME=mistralai/Voxtral-Mini-3B-2507
DEVICE=mps
MAX_AUDIO_LENGTH=1800
CHUNK_SIZE=30
REDIS_URL=redis://redis:6379
ENVIRONMENT=development
LOG_LEVEL=debug
PYTHONUNBUFFERED=1
EOF
    echo -e "   ${GREEN}✅ Python Service .env erstellt (mit Debug-Flags)${NC}"
fi

echo ""

# Debug Docker Compose File erstellen
echo -e "${BLUE}🔧 Debug-Konfiguration wird vorbereitet...${NC}"

cat > docker-compose.debug.yml << 'EOF'
version: '3.8'

services:
  # Alle Services mit Debug-Einstellungen überschreiben
  redis:
    command: redis-server --loglevel verbose
    
  python-service:
    environment:
      - LOG_LEVEL=debug
      - PYTHONUNBUFFERED=1
      - DEBUG=1
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --log-level debug
    
  node-service:
    environment:
      - NODE_ENV=development
      - LOG_LEVEL=debug
      - DEBUG=voxflow:*
    command: npm run dev -- --inspect=0.0.0.0:9229
    ports:
      - "9229:9229"  # Node.js Debug Port
      
  frontend:
    environment:
      - VITE_LOG_LEVEL=debug
      - VITE_DEBUG_MODE=true
    command: npm run dev -- --host 0.0.0.0 --debug
EOF

echo -e "${GREEN}✅ Debug-Konfiguration erstellt${NC}"
echo ""

echo -e "${BLUE}🚀 Services werden im Debug-Modus gestartet...${NC}"
echo -e "${YELLOW}   (Erste Ausführung kann 5-10 Minuten dauern - Model Download!)${NC}"
echo ""

# Services mit Debug-Konfiguration starten
docker-compose -f docker-compose.yml -f docker-compose.debug.yml up --build -d

echo ""
echo -e "${BLUE}⏳ Warte auf Service-Initialisierung...${NC}"
echo ""

# Detaillierte Service-Checks mit Debug-Output
check_service_debug() {
    local service_name=$1
    local url=$2
    local timeout=180  # Längerer Timeout für Debug
    local count=0
    
    echo -e "${CYAN}🔍 Prüfe ${service_name}...${NC}"
    
    while [ $count -lt $timeout ]; do
        # Curl mit mehr Details
        response=$(curl -s -w "\n%{http_code}\n%{time_total}" "$url" 2>&1)
        http_code=$(echo "$response" | tail -1)
        
        if [ "$http_code" = "200" ]; then
            echo -e "   ${GREEN}✅ ${service_name} ist bereit${NC}"
            echo -e "   ${CYAN}   URL: ${url}${NC}"
            echo -e "   ${CYAN}   Response Zeit: $(echo "$response" | tail -2 | head -1)s${NC}"
            return 0
        else
            # Zeige Container-Status bei Fehlern
            if [ $((count % 20)) -eq 0 ] && [ $count -gt 0 ]; then
                echo -e "   ${YELLOW}⏳ Noch nicht bereit... (${count}s/${timeout}s)${NC}"
                echo -e "   ${CYAN}   HTTP Code: ${http_code}${NC}"
                
                # Docker Container Status
                container_status=$(docker-compose ps --services | grep -E "(redis|python-service|node-service|frontend)" | head -1)
                if [ ! -z "$container_status" ]; then
                    echo -e "   ${CYAN}   Container Status:${NC}"
                    docker-compose ps | grep -E "(redis|python-service|node-service|frontend)" | sed 's/^/      /'
                fi
            fi
        fi
        
        sleep 2
        count=$((count + 2))
    done
    
    echo -e "   ${RED}❌ ${service_name} Timeout nach ${timeout}s${NC}"
    echo -e "   ${CYAN}   Letzte Response: ${response}${NC}"
    return 1
}

# Services in korrekter Reihenfolge prüfen
success=true

if ! check_service_debug "Redis" "http://localhost:6379"; then
    echo -e "${RED}❌ Redis Fehler - Logs:${NC}"
    docker-compose logs redis | tail -10 | sed 's/^/   /'
    success=false
fi

echo ""

if ! check_service_debug "Python Service" "http://localhost:8000/health"; then
    echo -e "${RED}❌ Python Service Fehler - Logs:${NC}"
    docker-compose logs python-service | tail -15 | sed 's/^/   /'
    success=false
fi

echo ""

if ! check_service_debug "Node.js Service" "http://localhost:3000/health"; then
    echo -e "${RED}❌ Node.js Service Fehler - Logs:${NC}"
    docker-compose logs node-service | tail -15 | sed 's/^/   /'
    success=false
fi

echo ""

if ! check_service_debug "Frontend" "http://localhost:5173"; then
    echo -e "${RED}❌ Frontend Fehler - Logs:${NC}"
    docker-compose logs frontend | tail -15 | sed 's/^/   /'
    success=false
fi

echo ""

if [ "$success" = true ]; then
    echo -e "${GREEN}🎉 VoxFlow Debug-Modus erfolgreich gestartet!${NC}"
    echo ""
    echo -e "${BLUE}🌐 Verfügbare Endpoints:${NC}"
    echo "   🖥️  Frontend:           http://localhost:5173"
    echo "   🔧 API Gateway:        http://localhost:3000"
    echo "   🐍 Python Service:     http://localhost:8000"
    echo "   🔴 Redis:              localhost:6379"
    echo "   🔍 Node.js Debugger:   localhost:9229 (für VSCode/Chrome DevTools)"
    echo ""
    echo -e "${BLUE}📊 Debug-Features:${NC}"
    echo "   ✅ Detaillierte Logs für alle Services"
    echo "   ✅ Live-Reload für Code-Änderungen"
    echo "   ✅ Node.js Remote Debugging auf Port 9229"
    echo "   ✅ Python Debug-Modus mit ausführlichen Logs"
    echo "   ✅ Frontend Debug-Modus aktiv"
    echo ""
    echo -e "${BLUE}📋 Debug-Befehle:${NC}"
    echo "   Alle Logs live:       docker-compose logs -f"
    echo "   Service-spezifisch:   docker-compose logs -f <service-name>"
    echo "   Container-Status:     docker-compose ps"
    echo "   In Container:         docker-compose exec <service> sh"
    echo "   Neustart Service:     docker-compose restart <service>"
    echo ""
    
    # Browser öffnen
    echo -e "${CYAN}🌐 Browser wird geöffnet...${NC}"
    sleep 3
    open http://localhost:5173
    
    echo ""
    echo -e "${YELLOW}📺 Live-Logs werden gezeigt (Ctrl+C zum Beenden):${NC}"
    echo "================================================================"
    
    # Live-Logs anzeigen
    trap 'echo ""; echo -e "${YELLOW}🛑 VoxFlow Debug wird beendet...${NC}"; docker-compose -f docker-compose.yml -f docker-compose.debug.yml down; echo -e "${GREEN}✅ Debug-Session beendet${NC}"; exit 0' INT
    
    # Logs von allen Services live anzeigen
    docker-compose -f docker-compose.yml -f docker-compose.debug.yml logs -f --tail=50
    
else
    echo -e "${RED}❌ VoxFlow Debug konnte nicht vollständig gestartet werden${NC}"
    echo ""
    echo -e "${BLUE}🔧 Debug-Informationen:${NC}"
    echo ""
    echo -e "${CYAN}📦 Container Status:${NC}"
    docker-compose ps | sed 's/^/   /'
    echo ""
    echo -e "${CYAN}📋 Vollständige Logs:${NC}"
    docker-compose logs | tail -50 | sed 's/^/   /'
    echo ""
    echo -e "${BLUE}💡 Lösungsvorschläge:${NC}"
    echo "   1. Docker Desktop neu starten"
    echo "   2. Alle Container stoppen: docker-compose down"
    echo "   3. System neu starten (bei hartnäckigen Problemen)"
    echo "   4. Mehr RAM für Docker zuweisen (mindestens 4GB)"
    echo ""
    read -p "Drücken Sie Enter zum Beenden..."
    exit 1
fi
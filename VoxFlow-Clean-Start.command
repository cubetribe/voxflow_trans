#!/bin/bash

# VoxFlow Clean Start Script - Vollständiger Cleanup & Debug-Optionen
# Garantiert sauberen Neustart aller Services

cd "$(dirname "$0")"

# Terminal-Fenster Titel setzen
echo -ne "\033]0;VoxFlow Clean Start\007"

# Farben für bessere Lesbarkeit
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🔧 VoxFlow Startup Script${NC}"
echo "========================="
echo ""

# DEBUG-MODUS ABFRAGE (GANZ AM ANFANG)
read -p "Debug-Modus aktivieren? (y/n): " DEBUG_MODE

if [[ $DEBUG_MODE == "y" || $DEBUG_MODE == "Y" ]]; then
    echo -e "${YELLOW}🐛 DEBUG-MODUS AKTIV - Detaillierte Logs${NC}"
    echo ""
    DEBUG_ENABLED=true
    # Bash debug mode für Script-Debugging
    # set -x  # Uncommenting würde ALLE bash commands zeigen
else
    DEBUG_ENABLED=false
    echo -e "${GREEN}🚀 NORMAL-MODUS - Kompakte Ausgabe${NC}"
    echo ""
fi

# DEBUG-INFORMATIONEN (WENN AKTIVIERT)
if [[ $DEBUG_ENABLED == true ]]; then
    echo -e "${CYAN}🔍 SYSTEM DEBUG INFO:${NC}"
    echo "Aktuelles Verzeichnis: $(pwd)"
    echo "Benutzer: $(whoami)"
    echo "Datum: $(date)"
    echo ""
    
    echo "Port Status (vor Cleanup):"
    lsof -i:3000,5173,8000 2>/dev/null || echo "Alle Ports frei"
    echo ""
    
    echo "Docker Status (vor Cleanup):"
    docker ps | grep -i voxflow 2>/dev/null || echo "Keine VoxFlow Container aktiv"
    echo ""
    
    echo "Node/Python Prozesse (vor Cleanup):"
    ps aux | grep -E "(node|python|uvicorn|vite)" | grep -v grep || echo "Keine relevanten Prozesse"
    echo ""
fi

# VOLLSTÄNDIGER SERVICE-CLEANUP (VOR START)
echo -e "${BLUE}🧹 Vollständiger Service-Cleanup...${NC}"

# 1. Kill alle relevanten Ports
echo "   🔌 Schließe alle Ports (3000, 5173, 5174, 8000)..."
if [[ $DEBUG_ENABLED == true ]]; then
    echo "      Prozesse auf Ports:"
    lsof -ti:3000,5173,5174,8000 2>/dev/null | while read pid; do
        ps -p $pid -o pid,ppid,command 2>/dev/null || true
    done
fi

lsof -ti:3000,5173,5174,8000 | xargs kill -9 2>/dev/null || true
echo "   ✅ Ports bereinigt"

# 2. Kill Docker Container
echo "   🐳 Stoppe alle VoxFlow Docker Container..."
docker-compose down --remove-orphans 2>/dev/null || true
docker kill $(docker ps -q --filter "name=voxflow") 2>/dev/null || true
docker kill $(docker ps -q --filter "name=python-service") 2>/dev/null || true
docker kill $(docker ps -q --filter "name=node-service") 2>/dev/null || true
docker kill $(docker ps -q --filter "name=frontend") 2>/dev/null || true
echo "   ✅ Docker Container gestoppt"

# 3. Kill spezifische Node/Python Prozesse
echo "   🔄 Stoppe alle Node.js/Python/Vite Prozesse..."
pkill -f "node.*dist/server.js" 2>/dev/null || true
pkill -f "uvicorn.*app.main:app" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "python.*main.py" 2>/dev/null || true
echo "   ✅ Prozesse bereinigt"

# 4. Temporäre Dateien bereinigen
echo "   🗑️  Bereinige temporäre Dateien..."
rm -f /tmp/voxflow-*.log 2>/dev/null || true
rm -f /tmp/voxflow-*.pid 2>/dev/null || true
rm -f backend/python-service/temp/* 2>/dev/null || true
rm -f backend/node-service/temp/* 2>/dev/null || true
echo "   ✅ Temporäre Dateien bereinigt"

echo -e "${GREEN}✅ Vollständiger Cleanup abgeschlossen${NC}"
echo ""

# Kurze Pause für System-Stabilisierung
sleep 3

# POST-CLEANUP DEBUG INFO
if [[ $DEBUG_ENABLED == true ]]; then
    echo -e "${CYAN}🔍 POST-CLEANUP STATUS:${NC}"
    echo "Port Status (nach Cleanup):"
    lsof -i:3000,5173,8000 2>/dev/null || echo "Alle Ports frei ✅"
    echo ""
    
    echo "Docker Container (nach Cleanup):"
    docker ps | grep -i voxflow 2>/dev/null || echo "Keine VoxFlow Container ✅"
    echo ""
fi

# SYSTEM-CHECKS
echo -e "${BLUE}🔍 System-Checks...${NC}"

# Node.js Check
if command -v node &> /dev/null; then
    node_version=$(node --version)
    echo "   ✅ Node.js: $node_version"
else
    echo -e "   ${RED}❌ Node.js nicht gefunden${NC}"
    exit 1
fi

# Python Check
if command -v python3 &> /dev/null; then
    python_version=$(python3 --version)
    echo "   ✅ Python: $python_version"
else
    echo -e "   ${RED}❌ Python3 nicht gefunden${NC}"
    exit 1
fi

# Redis Check (Optional)
if command -v redis-server &> /dev/null; then
    echo "   ✅ Redis verfügbar"
    # Redis automatisch starten wenn nicht läuft
    if ! redis-cli ping &> /dev/null; then
        echo "      🔴 Starte Redis..."
        redis-server --daemonize yes --port 6379 2>/dev/null || true
        sleep 2
        if redis-cli ping &> /dev/null; then
            echo "      ✅ Redis gestartet"
        else
            echo "      ⚠️  Redis Start fehlgeschlagen (nutze In-Memory)"
        fi
    else
        echo "      ✅ Redis bereits aktiv"
    fi
else
    echo "   ⚠️  Redis nicht installiert (nutze In-Memory)"
fi

echo ""

# DEPENDENCIES CHECK
echo -e "${BLUE}📦 Dependencies Check...${NC}"

# Backend Dependencies
if [ -d "backend/node-service/node_modules" ]; then
    echo "   ✅ Node.js Dependencies vorhanden"
else
    echo "   📦 Installiere Node.js Dependencies..."
    cd backend/node-service
    if [[ $DEBUG_ENABLED == true ]]; then
        npm install
    else
        npm install > /dev/null 2>&1
    fi
    cd ../..
    echo "   ✅ Node.js Dependencies installiert"
fi

# Python Virtual Environment
if [ -d "backend/python-service/venv" ]; then
    echo "   ✅ Python Virtual Environment vorhanden"
else
    echo "   🐍 Erstelle Python Virtual Environment..."
    cd backend/python-service
    python3 -m venv venv
    echo "   ✅ Python Virtual Environment erstellt"
    cd ../..
fi

# Frontend Dependencies (prüfe beide mögliche Verzeichnisse)
frontend_dir=""
if [ -d "frontend_new/project/node_modules" ]; then
    echo "   ✅ Frontend Dependencies vorhanden (frontend_new/project)"
    frontend_dir="frontend_new/project"
elif [ -d "frontend/node_modules" ]; then
    echo "   ✅ Frontend Dependencies vorhanden (frontend)"
    frontend_dir="frontend"
elif [ -d "frontend_new/project" ]; then
    echo "   📦 Installiere Frontend Dependencies (frontend_new/project)..."
    cd frontend_new/project
    if [[ $DEBUG_ENABLED == true ]]; then
        npm install
    else
        npm install > /dev/null 2>&1
    fi
    cd ../..
    frontend_dir="frontend_new/project"
    echo "   ✅ Frontend Dependencies installiert"
elif [ -d "frontend" ]; then
    echo "   📦 Installiere Frontend Dependencies (frontend)..."
    cd frontend
    if [[ $DEBUG_ENABLED == true ]]; then
        npm install
    else
        npm install > /dev/null 2>&1
    fi
    cd ..
    frontend_dir="frontend"
    echo "   ✅ Frontend Dependencies installiert"
else
    echo -e "   ${RED}❌ Kein Frontend-Verzeichnis gefunden${NC}"
    exit 1
fi

echo ""

# SERVICE-START MIT DEBUG-LOGS
echo -e "${BLUE}🚀 Starte Services...${NC}"

# Python Service starten
echo "   🐍 Starte Python Service..."
cd backend/python-service

if [ ! -f "venv/bin/activate" ]; then
    echo -e "   ${RED}❌ Python Virtual Environment fehlt${NC}"
    exit 1
fi

source venv/bin/activate

if [[ $DEBUG_ENABLED == true ]]; then
    echo "      Debug: Starte uvicorn mit --log-level debug"
    nohup uvicorn app.main:app --reload --port 8000 --log-level debug > /tmp/voxflow-python-debug.log 2>&1 &
    PYTHON_PID=$!
    echo "      Python Service PID: $PYTHON_PID (Debug-Logs: /tmp/voxflow-python-debug.log)"
else
    nohup uvicorn app.main:app --reload --port 8000 > /tmp/voxflow-python.log 2>&1 &
    PYTHON_PID=$!
    echo "      Python Service PID: $PYTHON_PID"
fi

cd ../..
echo "$PYTHON_PID" > /tmp/voxflow-python.pid

# Node.js Service starten
echo "   🟢 Starte Node.js Service..."
cd backend/node-service

if [[ $DEBUG_ENABLED == true ]]; then
    export NODE_ENV=development
    export LOG_LEVEL=debug
    export DEBUG=voxflow:*
    echo "      Debug: NODE_ENV=development, LOG_LEVEL=debug"
    nohup npm run dev > /tmp/voxflow-node-debug.log 2>&1 &
    NODE_PID=$!
    echo "      Node.js Service PID: $NODE_PID (Debug-Logs: /tmp/voxflow-node-debug.log)"
else
    nohup npm run dev > /tmp/voxflow-node.log 2>&1 &
    NODE_PID=$!
    echo "      Node.js Service PID: $NODE_PID"
fi

cd ../..
echo "$NODE_PID" > /tmp/voxflow-node.pid

# Frontend starten
echo "   ⚛️  Starte Frontend..."
cd "$frontend_dir"

if [[ $DEBUG_ENABLED == true ]]; then
    export VITE_LOG_LEVEL=debug
    export VITE_DEBUG_MODE=true
    echo "      Debug: VITE_LOG_LEVEL=debug, Frontend-Verzeichnis: $frontend_dir"
    nohup npm run dev -- --port 5173 --host localhost > /tmp/voxflow-frontend-debug.log 2>&1 &
    FRONTEND_PID=$!
    echo "      Frontend PID: $FRONTEND_PID (Debug-Logs: /tmp/voxflow-frontend-debug.log)"
else
    nohup npm run dev -- --port 5173 --host localhost > /tmp/voxflow-frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "      Frontend PID: $FRONTEND_PID"
fi

# Zurück zum Root-Verzeichnis
if [[ $frontend_dir == "frontend_new/project" ]]; then
    cd ../..
else
    cd ..
fi

echo "$FRONTEND_PID" > /tmp/voxflow-frontend.pid

echo ""

# STATUS-VERIFIKATION MIT TIMEOUT
echo -e "${BLUE}⏳ Warte auf Service-Bereitschaft...${NC}"

# Service Check Funktion
check_service_with_timeout() {
    local service_name=$1
    local url=$2
    local timeout=60
    local count=0
    
    echo -e "${CYAN}🔍 Prüfe ${service_name}...${NC}"
    
    while [ $count -lt $timeout ]; do
        if curl -s -f "$url" >/dev/null 2>&1; then
            response_time=$(curl -s -w "%{time_total}" -o /dev/null "$url" 2>/dev/null)
            echo -e "   ${GREEN}✅ ${service_name} bereit (${response_time}s Response-Zeit)${NC}"
            return 0
        fi
        
        if [[ $DEBUG_ENABLED == true ]]; then
            if [ $((count % 10)) -eq 0 ] && [ $count -gt 0 ]; then
                echo "      Debug: Versuch $count/$timeout für $service_name"
                # HTTP Status Code anzeigen
                http_code=$(curl -s -w "%{http_code}" -o /dev/null "$url" 2>/dev/null || echo "000")
                echo "      HTTP Status: $http_code"
            fi
        else
            if [ $((count % 20)) -eq 0 ] && [ $count -gt 0 ]; then
                echo "      ⏳ ${service_name}: ${count}s/${timeout}s..."
            fi
        fi
        
        sleep 1
        count=$((count + 1))
    done
    
    echo -e "   ${RED}❌ ${service_name} Timeout nach ${timeout}s${NC}"
    
    if [[ $DEBUG_ENABLED == true ]]; then
        echo "      Debug: Letzte curl Antwort für $url:"
        curl -v "$url" 2>&1 | head -10 | sed 's/^/         /'
    fi
    
    return 1
}

# Services in korrekter Reihenfolge prüfen
success=true

# Python Service Check
if ! check_service_with_timeout "Python Service" "http://localhost:8000/health"; then
    success=false
    if [[ $DEBUG_ENABLED == true ]]; then
        echo "      Debug: Python Service Logs:"
        tail -10 /tmp/voxflow-python-debug.log 2>/dev/null | sed 's/^/         /' || echo "         Keine Logs verfügbar"
    fi
fi

echo ""

# Node.js Service Check
if ! check_service_with_timeout "Node.js Service" "http://localhost:3000/health"; then
    success=false
    if [[ $DEBUG_ENABLED == true ]]; then
        echo "      Debug: Node.js Service Logs:"
        tail -10 /tmp/voxflow-node-debug.log 2>/dev/null | sed 's/^/         /' || echo "         Keine Logs verfügbar"
    fi
fi

echo ""

# Frontend Check
if ! check_service_with_timeout "Frontend" "http://localhost:5173"; then
    success=false
    if [[ $DEBUG_ENABLED == true ]]; then
        echo "      Debug: Frontend Logs:"
        tail -10 /tmp/voxflow-frontend-debug.log 2>/dev/null | sed 's/^/         /' || echo "         Keine Logs verfügbar"
    fi
fi

echo ""

# FINAL STATUS
if [ "$success" = true ]; then
    echo -e "${GREEN}🎉 VoxFlow erfolgreich gestartet!${NC}"
    echo ""
    echo -e "${BLUE}🌐 Verfügbare Services:${NC}"
    echo "   🖥️  Frontend:        http://localhost:5173"
    echo "   🔧 API Gateway:     http://localhost:3000"
    echo "   🐍 Python Service:  http://localhost:8000"
    echo "   🔴 Redis:           localhost:6379"
    echo ""
    
    if [[ $DEBUG_ENABLED == true ]]; then
        echo -e "${BLUE}🐛 Debug-Informationen:${NC}"
        echo "   📁 Log-Dateien:"
        echo "      Python:  /tmp/voxflow-python-debug.log"
        echo "      Node.js: /tmp/voxflow-node-debug.log"
        echo "      Frontend:/tmp/voxflow-frontend-debug.log"
        echo ""
        echo "   🔍 PID-Dateien:"
        echo "      Python:  /tmp/voxflow-python.pid ($PYTHON_PID)"
        echo "      Node.js: /tmp/voxflow-node.pid ($NODE_PID)"
        echo "      Frontend:/tmp/voxflow-frontend.pid ($FRONTEND_PID)"
        echo ""
        echo -e "${BLUE}📊 Debug-Befehle:${NC}"
        echo "      Live-Logs Python:  tail -f /tmp/voxflow-python-debug.log"
        echo "      Live-Logs Node.js: tail -f /tmp/voxflow-node-debug.log"
        echo "      Live-Logs Frontend:tail -f /tmp/voxflow-frontend-debug.log"
        echo "      Alle Logs:         tail -f /tmp/voxflow-*-debug.log"
        echo ""
    else
        echo -e "${BLUE}📊 Nützliche Befehle:${NC}"
        echo "      Services stoppen:  kill \$(cat /tmp/voxflow-*.pid)"
        echo "      Logs anzeigen:     tail -f /tmp/voxflow-*.log"
    fi
    
    echo -e "${BLUE}🛑 Services stoppen:${NC}"
    echo "      kill \$(cat /tmp/voxflow-*.pid) && rm /tmp/voxflow-*.pid"
    echo ""
    
    # Browser öffnen
    echo -e "${CYAN}🌐 Browser wird geöffnet...${NC}"
    sleep 3
    open http://localhost:5173
    
    echo ""
    echo -e "${YELLOW}💡 Script läuft weiter - Services bleiben aktiv${NC}"
    echo -e "${YELLOW}   Zum Beenden: Ctrl+C oder Terminal schließen${NC}"
    echo ""
    
    # Signal Handler für sauberen Shutdown
    trap 'echo ""; echo -e "${YELLOW}🛑 Stoppe alle Services...${NC}"; kill $(cat /tmp/voxflow-*.pid 2>/dev/null) 2>/dev/null || true; rm -f /tmp/voxflow-*.pid; echo -e "${GREEN}✅ Alle Services gestoppt${NC}"; exit 0' INT TERM
    
    # Script am Leben halten und gelegentlich Status prüfen
    while true; do
        sleep 30
        
        # Prüfe ob Services noch laufen
        if ! kill -0 $PYTHON_PID 2>/dev/null; then
            echo -e "${RED}⚠️  Python Service beendet${NC}"
        fi
        if ! kill -0 $NODE_PID 2>/dev/null; then
            echo -e "${RED}⚠️  Node.js Service beendet${NC}"
        fi
        if ! kill -0 $FRONTEND_PID 2>/dev/null; then
            echo -e "${RED}⚠️  Frontend Service beendet${NC}"
        fi
    done
    
else
    echo -e "${RED}❌ VoxFlow Start fehlgeschlagen${NC}"
    echo ""
    
    if [[ $DEBUG_ENABLED == true ]]; then
        echo -e "${BLUE}🔧 Detaillierte Debug-Informationen:${NC}"
        echo ""
        echo "Python Service Logs:"
        tail -20 /tmp/voxflow-python-debug.log 2>/dev/null | sed 's/^/   /' || echo "   Keine Python Logs"
        echo ""
        echo "Node.js Service Logs:"
        tail -20 /tmp/voxflow-node-debug.log 2>/dev/null | sed 's/^/   /' || echo "   Keine Node.js Logs"
        echo ""
        echo "Frontend Logs:"
        tail -20 /tmp/voxflow-frontend-debug.log 2>/dev/null | sed 's/^/   /' || echo "   Keine Frontend Logs"
        echo ""
        echo "Prozess Status:"
        ps aux | grep -E "(uvicorn|node|vite)" | grep -v grep | sed 's/^/   /'
        echo ""
        echo "Port Status:"
        lsof -i:3000,5173,8000 | sed 's/^/   /'
    fi
    
    echo -e "${BLUE}💡 Lösungsvorschläge:${NC}"
    echo "   1. Script erneut mit Debug-Modus ausführen: Debug-Modus aktivieren? y"
    echo "   2. Manuelle Service-Prüfung: curl http://localhost:8000/health"
    echo "   3. Dependencies prüfen: Wurden alle npm install erfolgreich ausgeführt?"
    echo "   4. Port-Konflikte prüfen: lsof -i:3000,5173,8000"
    echo ""
    
    # Cleanup bei Fehlern
    echo "🧹 Cleanup fehlgeschlagener Services..."
    kill $(cat /tmp/voxflow-*.pid 2>/dev/null) 2>/dev/null || true
    rm -f /tmp/voxflow-*.pid
    
    read -p "Enter zum Beenden..."
    exit 1
fi
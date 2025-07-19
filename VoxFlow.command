#!/bin/bash

# VoxFlow Launcher - Doppelklick zum Starten
# Diese Datei kann per Doppelklick im Finder ausgeführt werden

# Wechsle in das Verzeichnis der Datei
cd "$(dirname "$0")"

# Terminal-Fenster Titel setzen
echo -ne "\033]0;VoxFlow Startup\007"

echo "🎙️  VoxFlow wird gestartet..."
echo "================================"

# Prüfe ob Docker läuft
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker ist nicht gestartet."
    echo ""
    echo "Bitte Docker Desktop starten und dann erneut versuchen."
    echo ""
    echo "💡 Docker Desktop kann hier heruntergeladen werden:"
    echo "   https://www.docker.com/products/docker-desktop/"
    echo ""
    read -p "Drücken Sie Enter zum Beenden..."
    exit 1
fi

# Environment Files erstellen
echo "📝 Environment-Dateien werden eingerichtet..."

# Frontend
if [ ! -f frontend/.env.local ]; then
    cp frontend/.env.example frontend/.env.local
    echo "✅ Frontend Konfiguration erstellt"
fi

# Node.js Backend
if [ ! -f backend/node-service/.env ]; then
    cat > backend/node-service/.env << 'EOF'
PORT=3000
REDIS_URL=redis://redis:6379
DATABASE_URL=sqlite:./data/voxflow.db
PYTHON_SERVICE_URL=http://python-service:8000
JWT_SECRET=dev-secret-key-change-in-production
NODE_ENV=development
EOF
    echo "✅ Node.js Backend Konfiguration erstellt"
fi

# Python Service
if [ ! -f backend/python-service/.env ]; then
    cat > backend/python-service/.env << 'EOF'
PORT=8000
MODEL_NAME=mistralai/Voxtral-Mini-3B-2507
DEVICE=mps
MAX_AUDIO_LENGTH=1800
CHUNK_SIZE=30
REDIS_URL=redis://redis:6379
ENVIRONMENT=development
EOF
    echo "✅ Python Service Konfiguration erstellt"
fi

echo ""
echo "🐳 Docker Container werden gestartet..."
echo "   (Beim ersten Start kann dies einige Minuten dauern)"
echo ""

# Docker Compose starten
docker-compose up --build -d

echo ""
echo "⏳ Warte auf Service-Start..."

# Hilfsfunktion zum Prüfen der Services
check_service() {
    local service_name=$1
    local url=$2
    local timeout=120
    local count=0
    
    echo -n "   🔄 $service_name wird geprüft"
    
    while [ $count -lt $timeout ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo " ✅"
            return 0
        fi
        sleep 2
        count=$((count + 2))
        echo -n "."
    done
    
    echo " ❌ (Timeout nach ${timeout}s)"
    return 1
}

# Services prüfen
success=true

if ! check_service "Redis" "http://localhost:6379"; then
    echo "❌ Redis konnte nicht gestartet werden"
    success=false
fi

if ! check_service "Python Service" "http://localhost:8000/health"; then
    echo "❌ Python Service konnte nicht gestartet werden"
    echo "📋 Logs anzeigen:"
    docker-compose logs python-service | tail -10
    success=false
fi

if ! check_service "Node.js Service" "http://localhost:3000/health"; then
    echo "❌ Node.js Service konnte nicht gestartet werden"
    echo "📋 Logs anzeigen:"
    docker-compose logs node-service | tail -10
    success=false
fi

if ! check_service "Frontend" "http://localhost:5173"; then
    echo "❌ Frontend konnte nicht gestartet werden"
    echo "📋 Logs anzeigen:"
    docker-compose logs frontend | tail -10
    success=false
fi

if [ "$success" = true ]; then
    echo ""
    echo "🎉 VoxFlow ist erfolgreich gestartet!"
    echo ""
    echo "🌐 Anwendung öffnen:"
    echo "   Frontend:      http://localhost:5173"
    echo "   API Gateway:   http://localhost:3000" 
    echo "   Python API:    http://localhost:8000"
    echo ""
    echo "📱 Browser wird automatisch geöffnet..."
    
    # Browser öffnen
    sleep 3
    open http://localhost:5173
    
    echo ""
    echo "🛠️  Nützliche Befehle:"
    echo "   Logs anzeigen:     docker-compose logs -f"
    echo "   Services stoppen:  docker-compose down"
    echo "   Neustart:          docker-compose restart"
    echo ""
    echo "💡 Dieses Terminal-Fenster kann minimiert, aber nicht geschlossen werden."
    echo "   VoxFlow läuft weiter, solange dieses Fenster offen ist."
    echo ""
    echo "🔴 Zum Beenden von VoxFlow drücken Sie Ctrl+C oder schließen Sie dieses Fenster."
    echo ""
    
    # Warte auf Benutzer-Unterbrechung
    trap 'echo ""; echo "🛑 VoxFlow wird beendet..."; docker-compose down; echo "✅ VoxFlow erfolgreich beendet."; exit 0' INT
    
    # Infinite loop um Terminal offen zu halten
    while true; do
        sleep 60
        # Überprüfe ob Services noch laufen
        if ! docker-compose ps | grep -q "Up"; then
            echo "⚠️  Warnung: Ein oder mehrere Services sind gestoppt."
            echo "   Für Details: docker-compose ps"
        fi
    done
    
else
    echo ""
    echo "❌ VoxFlow konnte nicht vollständig gestartet werden."
    echo ""
    echo "🔧 Fehlerbehebung:"
    echo "   1. Stellen Sie sicher, dass Docker Desktop läuft"
    echo "   2. Überprüfen Sie die Logs: docker-compose logs"
    echo "   3. Versuchen Sie einen Neustart: docker-compose down && docker-compose up --build"
    echo ""
    echo "📞 Support:"
    echo "   GitHub: https://github.com/cubetribe/voxflow_trans/issues"
    echo ""
    read -p "Drücken Sie Enter zum Beenden..."
    exit 1
fi
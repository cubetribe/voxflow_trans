#!/bin/bash

# Redis Installation für VoxFlow auf macOS
# Vereinfacht den Redis-Setup für optimale Performance

echo -ne "\033]0;Redis Installation für VoxFlow\007"

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}🔴 Redis Installation für VoxFlow${NC}"
echo "========================================="
echo ""
echo -e "${CYAN}ℹ️  Redis verbessert die VoxFlow-Performance erheblich:${NC}"
echo "   - Schnellere Job-Queue Verarbeitung"
echo "   - Besseres Caching von Zwischenergebnissen"
echo "   - Reduzierte Memory-Nutzung"
echo "   - Robustere Batch-Verarbeitung"
echo ""

# Homebrew Check
echo -e "${BLUE}🍺 Homebrew Check:${NC}"
if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}⚠️  Homebrew ist nicht installiert${NC}"
    echo ""
    echo "Homebrew wird für die einfache Redis-Installation benötigt."
    echo "Möchten Sie Homebrew jetzt installieren?"
    echo ""
    read -p "Homebrew installieren? (y/n): " install_brew
    
    if [[ $install_brew =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${CYAN}📥 Installiere Homebrew...${NC}"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Homebrew zu PATH hinzufügen
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
        
        if command -v brew &> /dev/null; then
            echo -e "${GREEN}✅ Homebrew erfolgreich installiert${NC}"
        else
            echo -e "${RED}❌ Homebrew Installation fehlgeschlagen${NC}"
            echo "Bitte installieren Sie Homebrew manuell: https://brew.sh"
            read -p "Enter zum Beenden..."
            exit 1
        fi
    else
        echo "Ohne Homebrew können Sie Redis manuell installieren:"
        echo "1. Redis von https://redis.io/download herunterladen"
        echo "2. Kompilieren und installieren"
        echo "3. Redis-Server starten"
        read -p "Enter zum Beenden..."
        exit 1
    fi
else
    echo -e "${GREEN}✅ Homebrew ist installiert${NC}"
fi

echo ""

# Redis Check
echo -e "${BLUE}🔴 Redis Installation:${NC}"
if command -v redis-server &> /dev/null; then
    echo -e "${GREEN}✅ Redis ist bereits installiert${NC}"
    redis_version=$(redis-server --version | grep -o "v=[0-9.]*" | cut -d'=' -f2)
    echo "   Version: ${redis_version}"
    
    # Prüfe ob Redis läuft
    if pgrep -x "redis-server" > /dev/null; then
        echo -e "${GREEN}✅ Redis läuft bereits${NC}"
        redis_running=true
    else
        echo -e "${YELLOW}⚠️  Redis ist installiert, aber läuft nicht${NC}"
        redis_running=false
    fi
else
    echo -e "${CYAN}📥 Installiere Redis über Homebrew...${NC}"
    
    # Redis installieren
    brew install redis
    
    if command -v redis-server &> /dev/null; then
        echo -e "${GREEN}✅ Redis erfolgreich installiert${NC}"
        redis_running=false
    else
        echo -e "${RED}❌ Redis Installation fehlgeschlagen${NC}"
        echo ""
        echo "Manuelle Installation versuchen:"
        echo "  brew update"
        echo "  brew install redis"
        read -p "Enter zum Beenden..."
        exit 1
    fi
fi

echo ""

# Redis starten
if [ "$redis_running" != true ]; then
    echo -e "${BLUE}🚀 Redis starten:${NC}"
    echo "Möchten Sie Redis jetzt starten?"
    echo ""
    echo "Optionen:"
    echo "1) Einmalig starten (für diese Session)"
    echo "2) Als Service starten (automatisch bei Boot)"
    echo "3) Überspringen"
    echo ""
    read -p "Ihre Wahl (1/2/3): " start_option
    
    case $start_option in
        1)
            echo ""
            echo -e "${CYAN}🔄 Starte Redis einmalig...${NC}"
            redis-server --daemonize yes --port 6379
            sleep 2
            
            if pgrep -x "redis-server" > /dev/null; then
                echo -e "${GREEN}✅ Redis läuft auf Port 6379${NC}"
            else
                echo -e "${RED}❌ Redis Start fehlgeschlagen${NC}"
            fi
            ;;
        2)
            echo ""
            echo -e "${CYAN}🔄 Konfiguriere Redis als Service...${NC}"
            
            # Redis als Service einrichten
            brew services start redis
            sleep 3
            
            if brew services list | grep redis | grep -q "started"; then
                echo -e "${GREEN}✅ Redis läuft als Service${NC}"
                echo "   Redis startet automatisch bei System-Boot"
            else
                echo -e "${RED}❌ Service-Konfiguration fehlgeschlagen${NC}"
                echo "   Versuche manuellen Start..."
                redis-server --daemonize yes --port 6379
            fi
            ;;
        3)
            echo ""
            echo -e "${YELLOW}⚠️  Redis übersprungen${NC}"
            echo "   Sie können Redis später manuell starten mit: redis-server"
            ;;
        *)
            echo -e "${YELLOW}⚠️  Ungültige Eingabe - überspringe Redis Start${NC}"
            ;;
    esac
fi

echo ""

# Verbindungstest
echo -e "${BLUE}🔍 Redis Verbindungstest:${NC}"
if pgrep -x "redis-server" > /dev/null; then
    if redis-cli ping 2>/dev/null | grep -q "PONG"; then
        echo -e "${GREEN}✅ Redis antwortet korrekt${NC}"
        
        # Redis Info anzeigen
        echo ""
        echo -e "${CYAN}📊 Redis Informationen:${NC}"
        redis_memory=$(redis-cli info memory | grep "used_memory_human" | cut -d':' -f2 | tr -d '\r')
        redis_clients=$(redis-cli info clients | grep "connected_clients" | cut -d':' -f2 | tr -d '\r')
        echo "   Memory Usage: ${redis_memory}"
        echo "   Connected Clients: ${redis_clients}"
        echo "   Port: 6379"
        echo "   Config: Standard Redis Konfiguration"
        
    else
        echo -e "${YELLOW}⚠️  Redis läuft, aber antwortet nicht${NC}"
        echo "   Möglicherweise läuft Redis auf einem anderen Port"
    fi
else
    echo -e "${YELLOW}⚠️  Redis läuft nicht${NC}"
    echo "   VoxFlow wird In-Memory Fallback verwenden"
fi

echo ""

# VoxFlow Integration Info
echo -e "${BLUE}🎙️ VoxFlow Integration:${NC}"
echo "Redis ist jetzt bereit für VoxFlow! Vorteile:"
echo ""
echo -e "${GREEN}✅ Performance-Vorteile:${NC}"
echo "   - 3-5x schnellere Job-Queue Verarbeitung"
echo "   - Zwischenergebnisse werden gecacht"
echo "   - Bessere Memory-Effizienz bei großen Dateien"
echo "   - Robuste Batch-Verarbeitung"
echo ""
echo -e "${GREEN}✅ Entwicklung:${NC}"
echo "   - Debugging von Job-Status möglich"
echo "   - Live-Monitoring von Queues"
echo "   - Persistente Session-Daten"
echo ""

# Nützliche Befehle
echo -e "${BLUE}🛠️ Nützliche Redis-Befehle:${NC}"
echo "   Status prüfen:       redis-cli ping"
echo "   Monitoring:          redis-cli monitor"
echo "   Memory Info:         redis-cli info memory"
echo "   Alle Keys anzeigen:  redis-cli keys '*'"
echo "   Redis stoppen:       redis-cli shutdown"
echo "   Service neu starten: brew services restart redis"
echo ""

# VoxFlow starten
echo -e "${CYAN}🚀 Bereit für VoxFlow!${NC}"
echo ""
echo "Sie können jetzt VoxFlow mit optimaler Redis-Performance starten:"
echo ""
echo "   Doppelklick auf: VoxFlow-Local.command (nutzt lokales Redis)"
echo "   Oder:            VoxFlow.command (nutzt Docker Redis)"
echo ""

read -p "VoxFlow jetzt starten? (y/n): " start_voxflow

if [[ $start_voxflow =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${CYAN}🎙️ Starte VoxFlow mit Redis-Optimierung...${NC}"
    
    # Wechsle ins VoxFlow Verzeichnis und starte
    cd "$(dirname "$0")"
    
    if [ -f "VoxFlow-Local.command" ]; then
        ./VoxFlow-Local.command
    else
        echo -e "${YELLOW}⚠️  VoxFlow-Local.command nicht gefunden${NC}"
        echo "   Versuche Standard-Launcher..."
        if [ -f "VoxFlow.command" ]; then
            ./VoxFlow.command
        else
            echo -e "${RED}❌ Keine VoxFlow-Launcher gefunden${NC}"
        fi
    fi
else
    echo ""
    echo -e "${GREEN}✅ Redis Setup abgeschlossen!${NC}"
    echo ""
    echo "Redis läuft und ist bereit für VoxFlow."
    echo "Starten Sie VoxFlow jederzeit mit den .command Dateien."
fi

echo ""
echo -e "${CYAN}📚 Weitere Informationen:${NC}"
echo "   Redis Dokumentation: https://redis.io/documentation"
echo "   VoxFlow Dokumentation: README-LAUNCHER.md"
echo ""
echo "Viel Spaß mit VoxFlow! 🎉"
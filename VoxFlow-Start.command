#!/bin/bash

# VoxFlow Native Development Launcher
# Production-ready double-click launcher for macOS
# Optimized for Apple Silicon with comprehensive error handling

set -e

# Wechsle ins Script-Verzeichnis (wichtig für relative Pfade)
cd "$(dirname "$0")"

# Terminal-Konfiguration für bessere Darstellung
export TERM="${TERM:-xterm-256color}"

# Cleanup function für graceful shutdown
cleanup() {
    echo ""
    echo "🛑 VoxFlow-Start wurde beendet"
    echo "💡 Verwende './start-dev.sh' für erweiterte Optionen"
    exit 0
}

# Trap cleanup on script exit
trap cleanup EXIT INT TERM

clear
echo "🎙️  VoxFlow - AI Voice Transcription Platform"
echo "============================================="
echo ""
echo "🤖 Was ist VoxFlow?"
echo "   • Professionelle KI-basierte Audio-Transkription"
echo "   • Powered by Mistral's Voxtral-Mini-3B-2507 Model"
echo "   • Native Apple Silicon Optimierung (M1/M2/M3/M4)"
echo "   • Unterstützt: MP3, WAV, M4A, WEBM, OGG, FLAC"
echo "   • Batch-Verarbeitung bis 500MB pro Datei"
echo ""
echo "🏗️  Native Architektur (kein Docker):"
echo "   🔴 Redis Server (Port 6379) - Native Daemon"
echo "   🐍 Python Voxtral Service (Port 8000) - MPS Optimized"
echo "   🟢 Node.js API Gateway (Port 3000) - Hot Reload"
echo "   ⚛️  React Frontend (Port 5173) - Vite Dev Server"
echo ""

# PRODUCTION-READY SYSTEM CHECKS
echo "🔍 System-Validierung..."

# Check 1: macOS Version
macos_version=$(sw_vers -productVersion)
echo "   ✅ macOS: $macos_version"

# Check 2: Apple Silicon Detection
if [[ $(uname -m) == "arm64" ]]; then
    echo "   ✅ Apple Silicon: $(sysctl -n machdep.cpu.brand_string)"
else
    echo "   ⚠️  Intel-Chip erkannt - Performance kann eingeschränkt sein"
fi

# Check 3: Verfügbarer RAM
ram_gb=$(sysctl hw.memsize | awk '{print int($2/1024/1024/1024)}')
echo "   ✅ Verfügbarer RAM: ${ram_gb}GB"
if [ $ram_gb -lt 8 ]; then
    echo "   ⚠️  Warnung: <8GB RAM - große Dateien können problematisch sein"
fi

# Check 4: Verzeichnis-Struktur
echo "   🔍 Projekt-Struktur..."
project_errors=0

if [ ! -d "frontend" ]; then
    echo "   ❌ Frontend-Verzeichnis 'frontend/' fehlt!"
    project_errors=$((project_errors + 1))
else
    echo "   ✅ Frontend: frontend/"
fi

if [ ! -d "backend/node-service" ]; then
    echo "   ❌ Node.js Service 'backend/node-service/' fehlt!"
    project_errors=$((project_errors + 1))
else
    echo "   ✅ Node.js Service: backend/node-service/"
fi

if [ ! -d "backend/python-service" ]; then
    echo "   ❌ Python Service 'backend/python-service/' fehlt!"
    project_errors=$((project_errors + 1))
else
    echo "   ✅ Python Service: backend/python-service/"
fi

if [ ! -f "start-dev.sh" ]; then
    echo "   ❌ Native Startup-Script 'start-dev.sh' fehlt!"
    project_errors=$((project_errors + 1))
else
    echo "   ✅ Native Startup: start-dev.sh"
fi

# Validierung der Projekt-Struktur
if [ $project_errors -gt 0 ]; then
    echo ""
    echo "❌ FEHLER: Projekt-Struktur unvollständig ($project_errors Probleme)"
    echo "   💡 Lösung: Repository neu klonen oder Struktur reparieren"
    echo "   📂 Erwartete Struktur:"
    echo "      VoxFlow_Traskriber/"
    echo "      ├── frontend/"
    echo "      ├── backend/node-service/"
    echo "      ├── backend/python-service/"
    echo "      └── start-dev.sh"
    echo ""
    read -p "   Drücke Enter zum Beenden..."
    exit 1
fi

echo ""
echo "✅ System-Validierung erfolgreich!"
echo ""

# STARTUP-MODUS AUSWAHL
echo "🚀 Startup-Modus wählen:"
echo "   [1] 🎯 Standard-Start (empfohlen)"
echo "   [2] 🐛 Debug-Modus (erweiterte Logs)"
echo "   [3] 🔧 Erweiterte Optionen (Terminal-Interface)"
echo ""

while true; do
    read -p "   Wähle Option (1-3): " mode_choice
    case $mode_choice in
        1)
            echo "   🎯 Standard-Modus gewählt"
            DEBUG_MODE="n"
            ADVANCED_MODE="false"
            break
            ;;
        2)
            echo "   🐛 Debug-Modus gewählt"
            DEBUG_MODE="y"
            ADVANCED_MODE="false"
            break
            ;;
        3)
            echo "   🔧 Erweiterte Optionen - Terminal-Interface wird gestartet"
            ADVANCED_MODE="true"
            break
            ;;
        *)
            echo "   ❌ Ungültige Option. Bitte 1, 2 oder 3 wählen."
            ;;
    esac
done

echo ""

# PRODUCTION-READY STARTUP
if [[ $ADVANCED_MODE == "true" ]]; then
    echo "🔧 Starte erweiterte Terminal-Interface..."
    echo "   💡 Verwende Ctrl+C zum Beenden"
    echo ""
    sleep 2
    
    # Führe start-dev.sh mit vollem Terminal-Interface aus
    exec ./start-dev.sh
else
    echo "🚀 Starte VoxFlow Native Development Environment..."
    echo "   ⏳ Dies kann beim ersten Start einige Minuten dauern..."
    echo "   🔄 Services werden automatisch gestartet und getestet"
    echo ""
    
    # Führe start-dev.sh mit automatischem Debug-Modus aus
    echo "$DEBUG_MODE" | ./start-dev.sh
fi

# Fallback: Sollte normalerweise nicht erreicht werden
echo ""
echo "💡 VoxFlow-Start abgeschlossen"
echo "   🌐 Frontend sollte bei http://localhost:5173 verfügbar sein"
echo "   🛑 Services stoppen: Verwende Ctrl+C im Terminal"
echo ""
read -p "Drücke Enter zum Beenden..."
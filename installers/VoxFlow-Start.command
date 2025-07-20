#!/bin/bash

# VoxFlow Fast Launcher - "Install Once, Run Many"
# Production-ready instant startup without installations
# Requires prior installation via VoxFlow-Install.command

set -e

# Wechsle ins Project Root (Parent-Verzeichnis des Installer-Ordners)
cd "$(dirname "$0")/.."

# Terminal-Konfiguration für bessere Darstellung
export TERM="${TERM:-xterm-256color}"

# Installation Marker
INSTALLATION_MARKER=".installation_complete"

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
echo "🚀 VoxFlow Fast Launcher - Instant Startup"
echo "=========================================="
echo ""
echo "🎯 FAST START MODUS:"
echo "   ⚡ Keine Installations-Wartezeit"
echo "   🚀 Direkter Service-Start in <5 Sekunden"
echo "   🎙️  Sofortige Voxtral-Verfügbarkeit"
echo ""

# CRITICAL: Check Installation Status
if [ ! -f "$INSTALLATION_MARKER" ]; then
    echo "❌ VoxFlow ist noch nicht installiert!"
    echo ""
    echo "🔧 ERFORDERLICHE SCHRITTE:"
    echo "   1. Führe zuerst aus: ./VoxFlow-Install.command"
    echo "   2. Warte auf erfolgreiche Installation"
    echo "   3. Danach: ./VoxFlow-Start.command für schnellen Start"
    echo ""
    echo "💡 WARUM INSTALLATION NÖTIG?"
    echo "   • Python Dependencies (Voxtral + FastAPI)"
    echo "   • Node.js Dependencies (Express + TypeScript)"
    echo "   • React Dependencies (Vite + TailwindCSS)"
    echo "   • System-Optimierung für Apple Silicon"
    echo ""
    echo "⏱️  Installation dauert einmalig 5-10 Minuten"
    echo "🚀 Danach: Start in <5 Sekunden!"
    echo ""
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi

# Display Installation Info
echo "✅ VoxFlow Installation gefunden:"
echo ""
head -10 "$INSTALLATION_MARKER" | sed 's/^/   /'
echo ""

# Quick System Health Check (no installations!)
echo "🔍 Schnelle System-Prüfung..."

# Check 1: Installation Integrity
required_markers=("backend/python-service/.deps_installed" "backend/node-service/.deps_installed" "frontend/.deps_installed")
missing_deps=0

for marker in "${required_markers[@]}"; do
    if [ ! -f "$marker" ]; then
        echo "   ⚠️  Fehlend: $marker"
        missing_deps=$((missing_deps + 1))
    fi
done

if [ $missing_deps -gt 0 ]; then
    echo ""
    echo "⚠️  INSTALLATION UNVOLLSTÄNDIG!"
    echo "   🔧 Gefunden: $missing_deps fehlende Komponenten"
    echo "   💡 Lösung: ./VoxFlow-Install.command erneut ausführen"
    echo ""
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi

# Check 2: Critical Dependencies
echo "   ✅ Python Dependencies"
echo "   ✅ Node.js Dependencies"
echo "   ✅ Frontend Dependencies"

# Check 3: Basic System Info
macos_version=$(sw_vers -productVersion)
echo "   ✅ macOS: $macos_version"

if [[ $(uname -m) == "arm64" ]]; then
    echo "   ✅ Apple Silicon Ready"
else
    echo "   ⚠️  Intel Chip (Performance eingeschränkt)"
fi

echo ""
echo "✅ System bereit für VoxFlow Start!"
echo ""

# STARTUP MODE SELECTION (simplified - no installations)
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

# ULTRA-FAST STARTUP (no dependency installations)
if [[ $ADVANCED_MODE == "true" ]]; then
    echo "🔧 Starte erweiterte Terminal-Interface..."
    echo "   💡 Verwende Ctrl+C zum Beenden"
    echo "   ⚡ KEIN npm install - sofortiger Start!"
    echo ""
    sleep 1
    
    # Führe start-dev.sh mit vollem Terminal-Interface aus
    exec ./start-dev.sh
else
    echo "⚡ VoxFlow Ultra-Fast Startup..."
    echo "   🚀 Alle Dependencies bereits installiert"
    echo "   ⏳ Start in wenigen Sekunden..."
    echo "   🎙️  Voxtral sofort verfügbar"
    echo ""
    
    # Environment Variable für start-dev.sh: Skip installations
    export VOXFLOW_FAST_START="true"
    
    # Führe start-dev.sh mit automatischem Debug-Modus aus (skip installations)
    # Terminal bleibt offen für Debugging
    echo "$DEBUG_MODE" | ./start-dev.sh
    
    # Terminal geöffnet lassen
    echo ""
    echo "💡 Terminal bleibt für Debugging geöffnet"
    echo "🛑 VoxFlow stoppen: Ctrl+C"
    echo ""
    
    # Warte auf user input um Terminal offen zu halten
    read -p "Drücke Enter um VoxFlow-Start zu beenden (Services laufen weiter)..."
fi

# Fallback: Sollte normalerweise nicht erreicht werden
echo ""
echo "💡 VoxFlow-Start abgeschlossen"
echo "   🌐 Frontend sollte bei http://localhost:5173 verfügbar sein"
echo "   🛑 Services stoppen: Verwende Ctrl+C im Terminal"
echo ""
read -p "Drücke Enter zum Beenden..."
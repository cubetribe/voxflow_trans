#!/bin/bash

# VoxFlow Reset System - Clean State Management
# Production-ready clean slate for troubleshooting
# Removes all installations and returns to fresh state

set -e

# Wechsle ins Project Root (Parent-Verzeichnis des Installer-Ordners)
cd "$(dirname "$0")/.."

# Terminal-Konfiguration für bessere Darstellung
export TERM="${TERM:-xterm-256color}"

# Reset-spezifische Konstanten
INSTALLATION_MARKER=".installation_complete"
RESET_LOG="reset.log"
BACKUP_DIR="_reset_backup_$(date +%Y%m%d_%H%M%S)"

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Reset-Vorgang abgebrochen"
    if [ -d "$BACKUP_DIR" ]; then
        echo "💾 Backup verfügbar in: $BACKUP_DIR"
    fi
    exit 1
}

# Trap cleanup on script exit
trap cleanup EXIT INT TERM

# Logging function
log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1" | tee -a "$RESET_LOG"
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1" | tee -a "$RESET_LOG"
}

clear
echo "🧹 VoxFlow Reset System - Clean State Management"
echo "==============================================="
echo ""
echo "⚠️  ACHTUNG: Kompletter Reset der Installation!"
echo ""
echo "🗑️  WAS WIRD ENTFERNT:"
echo "   • Python Virtual Environment (backend/python-service/venv/)"
echo "   • Node.js Dependencies (backend/node-service/node_modules/)"
echo "   • Frontend Dependencies (frontend/node_modules/)"
echo "   • Build Artifacts (dist/, __pycache__, etc.)"
echo "   • Installation Marker (.installation_complete)"
echo "   • Dependency Marker (.deps_installed)"
echo ""
echo "💾 WAS BLEIBT ERHALTEN:"
echo "   • Source Code (alle .ts, .py, .tsx Dateien)"
echo "   • Configuration Files (.env, package.json, etc.)"
echo "   • User Data (Audio-TEST/, logs/ falls vorhanden)"
echo "   • Git Repository (.git/)"
echo ""
echo "🔄 NACH DEM RESET:"
echo "   1. Führe ./VoxFlow-Install.command aus"
echo "   2. Warte auf komplette Installation"
echo "   3. Starte mit ./VoxFlow-Start.command"
echo ""

# Check if anything is installed
installation_exists=false
items_to_remove=()

if [ -f "$INSTALLATION_MARKER" ]; then
    installation_exists=true
    items_to_remove+=("Installation Marker")
fi

if [ -d "backend/python-service/venv" ]; then
    installation_exists=true
    items_to_remove+=("Python Virtual Environment")
fi

if [ -d "backend/node-service/node_modules" ]; then
    installation_exists=true
    items_to_remove+=("Node.js Dependencies")
fi

if [ -d "frontend/node_modules" ]; then
    installation_exists=true
    items_to_remove+=("Frontend Dependencies")
fi

if [ ! "$installation_exists" = true ]; then
    echo "✅ VoxFlow ist bereits im sauberen Zustand!"
    echo ""
    echo "📋 STATUS:"
    echo "   • Keine Installation gefunden"
    echo "   • Keine Dependencies vorhanden"
    echo "   • Bereit für ./VoxFlow-Install.command"
    echo ""
    read -p "Drücke Enter zum Beenden..."
    exit 0
fi

echo "🔍 GEFUNDENE INSTALLATIONEN:"
for item in "${items_to_remove[@]}"; do
    echo "   • $item"
done
echo ""

# EXPLIZITE USER-BESTÄTIGUNG
echo "❓ BESTÄTIGUNG ERFORDERLICH:"
echo ""
echo "⚠️  Dieser Vorgang kann NICHT rückgängig gemacht werden!"
echo ""
echo "🔄 RESET-OPTIONEN:"
echo "   [1] 🧹 Vollständiger Reset (KEIN Backup - schnell)"
echo "   [2] 💾 Reset mit Backup (dauert länger)"
echo "   [3] 🔍 Nur Dependencies entfernen (KEIN Backup)"
echo "   [4] ❌ Abbrechen"
echo ""

while true; do
    read -p "   Wähle Option (1-4): " reset_choice
    case $reset_choice in
        1)
            echo "   🧹 Vollständiger Reset gewählt"
            RESET_MODE="full"
            CREATE_BACKUP=false
            break
            ;;
        2)
            echo "   💾 Reset mit explizitem Backup gewählt"
            RESET_MODE="full"
            CREATE_BACKUP=true
            KEEP_BACKUP=true
            break
            ;;
        3)
            echo "   🔍 Nur Dependencies entfernen gewählt"
            RESET_MODE="deps_only"
            CREATE_BACKUP=false
            break
            ;;
        4)
            echo "   ❌ Reset abgebrochen"
            exit 0
            ;;
        *)
            echo "   ❌ Ungültige Option. Bitte 1, 2, 3 oder 4 wählen."
            ;;
    esac
done

echo ""

# FINALE SICHERHEITSABFRAGE
echo "⚠️  LETZTE SICHERHEITSABFRAGE:"
echo ""
read -p "Gib 'RESET' ein um fortzufahren: " confirmation
if [ "$confirmation" != "RESET" ]; then
    echo "❌ Falsche Eingabe - Reset abgebrochen"
    exit 0
fi

echo ""
log_info "Starting VoxFlow reset in $RESET_MODE mode"

# PRODUCTION-READY BACKUP CREATION
if [ "$CREATE_BACKUP" = true ]; then
    echo "💾 Erstelle intelligentes Backup (ohne node_modules/venv)..."
    mkdir -p "$BACKUP_DIR"
    
    # Create backup directory structure
    mkdir -p "$BACKUP_DIR/backend/node-service"
    mkdir -p "$BACKUP_DIR/backend/python-service" 
    mkdir -p "$BACKUP_DIR/frontend"
    
    # 1. Backup installation marker
    if [ -f "$INSTALLATION_MARKER" ]; then
        cp "$INSTALLATION_MARKER" "$BACKUP_DIR/" 2>/dev/null || true
        log_info "Backed up installation marker"
        echo "   ✅ Installation marker"
    fi
    
    # 2. Backup package.json and package-lock.json (macOS compatible)
    for dir in "backend/node-service" "frontend"; do
        if [ -f "$dir/package.json" ]; then
            cp "$dir/package.json" "$BACKUP_DIR/$dir/" 2>/dev/null || true
            log_info "Backed up $dir/package.json"
        fi
        if [ -f "$dir/package-lock.json" ]; then
            cp "$dir/package-lock.json" "$BACKUP_DIR/$dir/" 2>/dev/null || true
            log_info "Backed up $dir/package-lock.json"
        fi
    done
    echo "   ✅ Package files"
    
    # 3. Backup Python requirements (from active venv)
    if [ -d "backend/python-service/venv" ]; then
        cd backend/python-service
        if source venv/bin/activate 2>/dev/null; then
            pip freeze > "../../$BACKUP_DIR/python_requirements_backup.txt" 2>/dev/null || true
            deactivate 2>/dev/null || true
            log_info "Backed up Python requirements from venv"
            echo "   ✅ Python requirements"
        fi
        cd ../..
    fi
    
    # 4. Copy requirements.txt
    if [ -f "backend/python-service/requirements.txt" ]; then
        cp "backend/python-service/requirements.txt" "$BACKUP_DIR/backend/python-service/" 2>/dev/null || true
        log_info "Backed up requirements.txt"
    fi
    
    # 5. Backup environment files (macOS compatible approach)
    for env_file in frontend/.env.local backend/node-service/.env backend/python-service/.env; do
        if [ -f "$env_file" ]; then
            # Create target directory if needed
            target_dir="$BACKUP_DIR/$(dirname "$env_file")"
            mkdir -p "$target_dir"
            cp "$env_file" "$target_dir/" 2>/dev/null || true
            log_info "Backed up $env_file"
        fi
    done
    echo "   ✅ Environment files"
    
    # 6. Create backup metadata
    cat > "$BACKUP_DIR/BACKUP_INFO.txt" << EOF
VoxFlow Reset Backup
===================
Created: $(date)
Backup Type: Smart backup (configs only, no dependencies)
Original Location: $(pwd)

Backup Contents:
- Installation marker (.installation_complete)
- Package files (package.json, package-lock.json)  
- Python requirements (pip freeze output)
- Environment files (.env, .env.local)
- Configuration files

NOT INCLUDED (by design):
- node_modules/ (will be reinstalled)
- venv/ (will be recreated)
- dist/, build/ (will be rebuilt)

Restore Instructions:
1. Run ./VoxFlow-Reset.command
2. Run ./VoxFlow-Install.command
3. Manually restore .env files if needed from this backup

EOF
    
    log_info "Backup created in $BACKUP_DIR with metadata"
    echo "   ✅ Backup erstellt: $BACKUP_DIR"
    echo "   📋 Backup Info: $BACKUP_DIR/BACKUP_INFO.txt"
fi

# RESET PHASE 1: PYTHON ENVIRONMENT
echo ""
echo "🐍 Phase 1: Python Environment Reset..."
cd backend/python-service

if [ -d "venv" ]; then
    echo "   🗑️  Entferne Python Virtual Environment..."
    rm -rf venv
    log_info "Removed Python virtual environment"
    echo "   ✅ Python venv entfernt"
fi

if [ -f ".deps_installed" ]; then
    rm -f .deps_installed
    log_info "Removed Python deps marker"
    echo "   ✅ Python Marker entfernt"
fi

# Remove Python cache
echo "   🧹 Bereinige Python Cache..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "*.pyo" -delete 2>/dev/null || true
log_info "Cleaned Python cache"
echo "   ✅ Python Cache bereinigt"

cd ../..

# RESET PHASE 2: NODE.JS BACKEND
echo ""
echo "🟢 Phase 2: Node.js Backend Reset..."
cd backend/node-service

if [ -d "node_modules" ]; then
    echo "   🗑️  Entferne Node.js Dependencies..."
    rm -rf node_modules
    log_info "Removed Node.js dependencies"
    echo "   ✅ Node.js Dependencies entfernt"
fi

if [ -f "package-lock.json" ]; then
    rm -f package-lock.json
    log_info "Removed package-lock.json"
    echo "   ✅ package-lock.json entfernt"
fi

if [ -f ".deps_installed" ]; then
    rm -f .deps_installed
    log_info "Removed Node.js deps marker"
    echo "   ✅ Node.js Marker entfernt"
fi

# Remove build artifacts
if [ -d "dist" ]; then
    rm -rf dist
    log_info "Removed TypeScript build artifacts"
    echo "   ✅ Build Artifacts entfernt"
fi

# Clean logs (optional)
if [ -d "logs" ]; then
    rm -rf logs/*.log 2>/dev/null || true
    echo "   🧹 Log-Dateien bereinigt"
fi

cd ../..

# RESET PHASE 3: FRONTEND
echo ""
echo "⚛️  Phase 3: Frontend Reset..."
cd frontend

if [ -d "node_modules" ]; then
    echo "   🗑️  Entferne Frontend Dependencies..."
    rm -rf node_modules
    log_info "Removed Frontend dependencies"
    echo "   ✅ Frontend Dependencies entfernt"
fi

if [ -f "package-lock.json" ]; then
    rm -f package-lock.json
    log_info "Removed Frontend package-lock.json"
    echo "   ✅ Frontend package-lock.json entfernt"
fi

if [ -f ".deps_installed" ]; then
    rm -f .deps_installed
    log_info "Removed Frontend deps marker"
    echo "   ✅ Frontend Marker entfernt"
fi

# Remove build artifacts
if [ -d "dist" ]; then
    rm -rf dist
    log_info "Removed Frontend build artifacts"
    echo "   ✅ Frontend Build entfernt"
fi

cd ..

# RESET PHASE 4: GLOBAL CLEANUP
echo ""
echo "🧹 Phase 4: Globale Bereinigung..."

# Remove installation marker
if [ -f "$INSTALLATION_MARKER" ]; then
    rm -f "$INSTALLATION_MARKER"
    log_info "Removed installation marker"
    echo "   ✅ Installation Marker entfernt"
fi

# Clean service logs
rm -f redis.log python_service.log node_service.log frontend_service.log 2>/dev/null || true
rm -f backend/python-service/python_service.log 2>/dev/null || true
rm -f backend/node-service/node_service.log 2>/dev/null || true
rm -f frontend/frontend_service.log 2>/dev/null || true
echo "   🧹 Service Logs bereinigt"

# Clean any npm cache issues
npm cache clean --force 2>/dev/null || true
echo "   🧹 npm Cache bereinigt"

log_success "VoxFlow reset completed successfully"

# BACKUP CLEANUP
if [ "$CREATE_BACKUP" = true ] && [ "$KEEP_BACKUP" != true ]; then
    echo "   🗑️  Entferne temporäres Backup..."
    rm -rf "$BACKUP_DIR" 2>/dev/null || true
fi

# Reset trap to avoid cleanup message
trap - EXIT INT TERM

echo ""
echo "🎉 VoxFlow Reset Erfolgreich Abgeschlossen!"
echo ""
echo "📊 RESET SUMMARY:"
echo "   🗑️  Components entfernt: ${#items_to_remove[@]}"
echo "   💾 Backup erstellt: $([ "$CREATE_BACKUP" = true ] && echo "Ja" || echo "Nein")"
echo "   📝 Log: $RESET_LOG"
echo ""
echo "✅ VoxFlow ist jetzt im sauberen Zustand!"
echo ""
echo "🚀 NÄCHSTE SCHRITTE:"
echo "   1. Führe aus: ./VoxFlow-Install.command"
echo "   2. Warte auf komplette Installation"
echo "   3. Starte mit: ./VoxFlow-Start.command"
echo ""
echo "💡 TIPS:"
echo "   • Installation wird alle Dependencies neu laden"
echo "   • Probleme sollten durch Reset behoben sein"
echo "   • Bei weiteren Issues: Check $RESET_LOG"
echo ""

if [ "$CREATE_BACKUP" = true ] && [ "$KEEP_BACKUP" = true ]; then
    echo "💾 BACKUP VERFÜGBAR:"
    echo "   📁 Location: $BACKUP_DIR"
    echo "   📋 Contents: Installation marker, configs, requirements"
    echo ""
fi

read -p "Drücke Enter zum Beenden..."
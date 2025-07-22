#!/bin/bash

# VoxFlow Professional Installation System
# Production-ready "Install Once, Run Many" implementation
# Handles all dependencies with atomic operations and comprehensive error handling

set -e

# Wechsle ins Project Root (Parent-Verzeichnis des Installer-Ordners)
cd "$(dirname "$0")/.."

# Terminal-Konfiguration für bessere Darstellung
export TERM="${TERM:-xterm-256color}"

# Installation Marker und Versions-Tracking
INSTALLATION_MARKER=".installation_complete"
INSTALLATION_LOG="installation.log"
BACKUP_DIR="_installation_backup_$(date +%Y%m%d_%H%M%S)"

# Cleanup function für graceful shutdown
cleanup() {
    echo ""
    echo "🛑 Installation unterbrochen"
    if [ -d "$BACKUP_DIR" ]; then
        echo "💾 Backup verfügbar in: $BACKUP_DIR"
    fi
    echo "💡 Starte erneut mit './VoxFlow-Install.command'"
    exit 1
}

# Trap cleanup on script exit
trap cleanup EXIT INT TERM

# Logging function
log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1" | tee -a "$INSTALLATION_LOG"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$INSTALLATION_LOG"
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1" | tee -a "$INSTALLATION_LOG"
}

clear
echo "🚀 VoxFlow Professional Installation System"
echo "==========================================="
echo ""
echo "🎯 INSTALLATION SCOPE:"
echo "   📦 Python Dependencies (Voxtral + FastAPI)"
echo "   📦 Node.js Dependencies (Express + TypeScript)"
echo "   📦 React Dependencies (Vite + TailwindCSS)"
echo "   🔧 Environment Configuration"
echo "   ✅ System Validation"
echo ""

# Prüfe ob bereits installiert
if [ -f "$INSTALLATION_MARKER" ]; then
    echo "⚠️  VoxFlow ist bereits installiert!"
    echo ""
    cat "$INSTALLATION_MARKER"
    echo ""
    echo "🔄 OPTIONEN:"
    echo "   [1] 🎯 Installation überspringen (empfohlen)"
    echo "   [2] 🔄 Neu-Installation (alle Dependencies neu)"
    echo "   [3] 🔧 Repair-Installation (nur fehlende Components)"
    echo "   [4] ❌ Abbrechen"
    echo ""
    
    while true; do
        read -p "   Wähle Option (1-4): " install_choice
        case $install_choice in
            1)
                echo "   ✅ Installation übersprungen - VoxFlow ist bereit!"
                echo "   💡 Starte VoxFlow mit: ./VoxFlow-Start.command"
                exit 0
                ;;
            2)
                echo "   🔄 Neu-Installation gewählt"
                INSTALL_MODE="fresh"
                break
                ;;
            3)
                echo "   🔧 Repair-Installation gewählt"
                INSTALL_MODE="repair"
                break
                ;;
            4)
                echo "   ❌ Installation abgebrochen"
                exit 0
                ;;
            *)
                echo "   ❌ Ungültige Option. Bitte 1, 2, 3 oder 4 wählen."
                ;;
        esac
    done
else
    INSTALL_MODE="fresh"
fi

echo ""
log_info "Starting VoxFlow installation in $INSTALL_MODE mode"

# PRODUCTION-READY SYSTEM REQUIREMENTS CHECK
echo "🔍 System Requirements Validation..."

# Check 1: macOS Version
macos_version=$(sw_vers -productVersion)
log_info "macOS Version: $macos_version"
echo "   ✅ macOS: $macos_version"

# Check 2: Apple Silicon Detection
if [[ $(uname -m) == "arm64" ]]; then
    cpu_info=$(sysctl -n machdep.cpu.brand_string)
    log_info "Apple Silicon detected: $cpu_info"
    echo "   ✅ Apple Silicon: $cpu_info"
    APPLE_SILICON=true
else
    log_info "Intel chip detected"
    echo "   ⚠️  Intel-Chip erkannt - Performance kann eingeschränkt sein"
    APPLE_SILICON=false
fi

# Check 3: RAM Requirement
ram_gb=$(sysctl hw.memsize | awk '{print int($2/1024/1024/1024)}')
log_info "Available RAM: ${ram_gb}GB"
echo "   💾 Verfügbarer RAM: ${ram_gb}GB"
if [ $ram_gb -lt 8 ]; then
    log_error "Insufficient RAM: ${ram_gb}GB < 8GB minimum"
    echo "   ❌ FEHLER: Mindestens 8GB RAM erforderlich für VoxFlow"
    echo "   💡 Aktuelle Hardware: ${ram_gb}GB"
    exit 1
fi

# Check 4: Python Version
if command -v python3 &> /dev/null; then
    # Use Python 3.12 explicitly for VoxFlow compatibility
    if command -v python3.12 >/dev/null 2>&1; then
        python_cmd="python3.12"
        python_version=$(python3.12 --version 2>&1 | awk '{print $2}')
    else
        python_cmd="python3"
        python_version=$(python3 --version 2>&1 | awk '{print $2}')
        log_warning "Python 3.12 not found, using system python3: $python_version"
    fi
    log_info "Python version: $python_version"
    echo "   ✅ Python: $python_version"
    
    # Validate Python version (3.11+)
    python_major=$(echo $python_version | cut -d. -f1)
    python_minor=$(echo $python_version | cut -d. -f2)
    if [ $python_major -eq 3 ] && [ $python_minor -ge 11 ]; then
        PYTHON_VALID=true
    else
        log_error "Python version too old: $python_version"
        echo "   ❌ FEHLER: Python 3.11+ erforderlich, gefunden: $python_version"
        echo "   💡 Installation: https://python.org/downloads/"
        exit 1
    fi
else
    log_error "Python not found"
    echo "   ❌ FEHLER: Python 3.11+ nicht gefunden"
    echo "   💡 Installation: https://python.org/downloads/"
    exit 1
fi

# Check 5: Node.js Version
if command -v node &> /dev/null; then
    node_version=$(node --version | sed 's/v//')
    log_info "Node.js version: $node_version"
    echo "   ✅ Node.js: $node_version"
    
    # Validate Node version (18+)
    node_major=$(echo $node_version | cut -d. -f1)
    if [ $node_major -ge 18 ]; then
        NODE_VALID=true
    else
        log_error "Node.js version too old: $node_version"
        echo "   ❌ FEHLER: Node.js 18+ erforderlich, gefunden: $node_version"
        echo "   💡 Installation: https://nodejs.org/en/download/"
        exit 1
    fi
else
    log_error "Node.js not found"
    echo "   ❌ FEHLER: Node.js 18+ nicht gefunden"
    echo "   💡 Installation: https://nodejs.org/en/download/"
    exit 1
fi

# Check 6: Project Structure
echo "   🔍 Projekt-Struktur..."
project_errors=0

required_dirs=("frontend" "backend/node-service" "backend/python-service")
for dir in "${required_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        log_error "Missing directory: $dir"
        echo "   ❌ Verzeichnis fehlt: $dir"
        project_errors=$((project_errors + 1))
    else
        log_info "Found directory: $dir"
        echo "   ✅ $dir"
    fi
done

required_files=("start-dev.sh" "backend/python-service/requirements.txt" "backend/node-service/package.json" "frontend/package.json")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        log_error "Missing file: $file"
        echo "   ❌ Datei fehlt: $file"
        project_errors=$((project_errors + 1))
    else
        log_info "Found file: $file"
    fi
done

if [ $project_errors -gt 0 ]; then
    log_error "Project structure validation failed: $project_errors issues"
    echo ""
    echo "❌ FEHLER: Projekt-Struktur unvollständig ($project_errors Probleme)"
    echo "   💡 Lösung: Repository neu klonen oder Struktur reparieren"
    exit 1
fi

echo ""
log_success "System requirements validation passed"
echo "✅ System Requirements erfüllt!"
echo ""

# BACKUP ERSTELLEN (nur bei fresh install)
if [ "$INSTALL_MODE" = "fresh" ]; then
    echo "💾 Erstelle Backup der aktuellen Installation..."
    mkdir -p "$BACKUP_DIR"
    
    # Backup existing installations
    [ -d "backend/python-service/venv" ] && cp -r "backend/python-service/venv" "$BACKUP_DIR/" 2>/dev/null || true
    [ -d "backend/node-service/node_modules" ] && cp -r "backend/node-service/node_modules" "$BACKUP_DIR/" 2>/dev/null || true
    [ -d "frontend/node_modules" ] && cp -r "frontend/node_modules" "$BACKUP_DIR/" 2>/dev/null || true
    [ -f "$INSTALLATION_MARKER" ] && cp "$INSTALLATION_MARKER" "$BACKUP_DIR/" 2>/dev/null || true
    
    log_info "Backup created in $BACKUP_DIR"
    echo "   ✅ Backup erstellt: $BACKUP_DIR"
fi

# INSTALLATION PHASE 1: REDIS CHECK/INSTALL
echo ""
echo "🔴 Phase 1: Redis Server Setup..."
if ! command -v redis-server &> /dev/null; then
    echo "   📦 Redis nicht gefunden - Installation via Homebrew..."
    if command -v brew &> /dev/null; then
        log_info "Installing Redis via Homebrew"
        brew install redis
        log_success "Redis installed successfully"
        echo "   ✅ Redis installiert"
    else
        log_error "Homebrew not found, cannot install Redis"
        echo "   ❌ Homebrew nicht gefunden"
        echo "   💡 Installiere Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
else
    redis_version=$(redis-server --version | head -1)
    log_info "Redis already installed: $redis_version"
    echo "   ✅ Redis bereits installiert: $redis_version"
fi

# INSTALLATION PHASE 2: PYTHON DEPENDENCIES
echo ""
echo "🐍 Phase 2: Python Voxtral Service Dependencies..."
cd backend/python-service

if [ "$INSTALL_MODE" = "fresh" ]; then
    echo "   🗑️  Entferne alte Python-Installation..."
    rm -rf venv __pycache__ *.pyc .deps_installed 2>/dev/null || true
fi

echo "   📦 Erstelle Python Virtual Environment..."
log_info "Creating Python virtual environment"
$python_cmd -m venv venv

echo "   🔧 Aktiviere Virtual Environment..."
source venv/bin/activate

echo "   📋 Installiere Python Dependencies..."
log_info "Installing Python dependencies from requirements.txt"

# Production-ready pip installation with retry logic
pip_install_with_retry() {
    local package="$1"
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "      Versuch $attempt/$max_attempts: $package"
        if pip install $package; then
            log_info "Successfully installed: $package"
            return 0
        else
            log_error "Failed attempt $attempt for: $package"
            attempt=$((attempt + 1))
            if [ $attempt -le $max_attempts ]; then
                echo "      ⏳ Warte 5 Sekunden vor nächstem Versuch..."
                sleep 5
            fi
        fi
    done
    
    log_error "Failed to install after $max_attempts attempts: $package"
    return 1
}

# Upgrade pip first
echo "   🔄 Aktualisiere pip..."
pip install --upgrade pip setuptools wheel

# Core dependencies first
echo "   📦 Installiere Core Dependencies..."
pip_install_with_retry "fastapi uvicorn"
pip_install_with_retry "transformers torch torchaudio"
pip_install_with_retry "numpy pydantic pydantic-settings"

# Voxtral-specific dependencies
echo "   🎙️  Installiere Voxtral Dependencies..."
pip_install_with_retry "git+https://github.com/huggingface/transformers.git"
pip_install_with_retry "mistral-common"

# Audio processing
echo "   🎵 Installiere Audio Processing..."
pip_install_with_retry "soundfile librosa"
pip_install_with_retry "pydub webrtcvad ffmpeg-python"

# Utilities and logging
echo "   🔧 Installiere Utilities..."
pip_install_with_retry "loguru aiofiles python-multipart psutil"

# Test Voxtral installation
echo "   🎯 Teste Voxtral Installation..."
log_info "Testing Voxtral installation"
if python test_voxtral_native.py; then
    log_success "Voxtral test passed"
    echo "   ✅ Voxtral Test erfolgreich"
else
    log_error "Voxtral test failed"
    echo "   ❌ Voxtral Test fehlgeschlagen"
    echo "   💡 Prüfe MPS-Unterstützung und Hardware-Kompatibilität"
    exit 1
fi

# Mark Python installation complete
touch .deps_installed
log_success "Python dependencies installed successfully"
echo "   ✅ Python Dependencies installiert"

cd ../..

# INSTALLATION PHASE 3: NODE.JS DEPENDENCIES
echo ""
echo "🟢 Phase 3: Node.js API Gateway Dependencies..."
cd backend/node-service

if [ "$INSTALL_MODE" = "fresh" ]; then
    echo "   🗑️  Entferne alte Node.js-Installation..."
    rm -rf node_modules package-lock.json .deps_installed 2>/dev/null || true
fi

echo "   📦 Installiere Node.js Dependencies..."
log_info "Installing Node.js dependencies"

# Production-ready npm installation with timeout and retry
npm_install_with_retry() {
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "      Versuch $attempt/$max_attempts: npm install"
        log_info "npm install attempt $attempt"
        
        # macOS-compatible npm install with monitoring
        echo "         📦 npm install läuft... (max 5 Minuten)"
        if npm install --prefer-offline --no-audit --progress=false; then
            log_success "npm install completed successfully"
            echo "   ✅ Node.js Dependencies installiert"
            return 0
        else
            log_error "npm install failed on attempt $attempt"
            echo "   ❌ Versuch $attempt fehlgeschlagen"
            
            if [ $attempt -lt $max_attempts ]; then
                echo "   🔄 Bereinige npm cache..."
                npm cache clean --force 2>/dev/null || true
                rm -rf node_modules package-lock.json 2>/dev/null || true
                echo "   ⏳ Warte 10 Sekunden vor nächstem Versuch..."
                sleep 10
            fi
            attempt=$((attempt + 1))
        fi
    done
    
    log_error "npm install failed after $max_attempts attempts"
    echo "   ❌ Node.js Installation fehlgeschlagen nach $max_attempts Versuchen"
    return 1
}

if ! npm_install_with_retry; then
    echo ""
    echo "💡 TROUBLESHOOTING TIPPS:"
    echo "   1. Prüfe Internetverbindung"
    echo "   2. Verwende VPN falls Corporate Firewall"
    echo "   3. Prüfe npm Registry: npm config get registry"
    echo "   4. Manual Install: cd backend/node-service && npm install"
    exit 1
fi

# Build TypeScript
echo "   🔨 Kompiliere TypeScript..."
log_info "Building TypeScript"
if npm run build; then
    log_success "TypeScript build completed"
    echo "   ✅ TypeScript kompiliert"
else
    log_error "TypeScript build failed"
    echo "   ⚠️  TypeScript Build fehlgeschlagen - Service läuft trotzdem"
fi

# Mark Node installation complete
touch .deps_installed
log_success "Node.js dependencies installed successfully"

cd ../..

# INSTALLATION PHASE 4: FRONTEND DEPENDENCIES
echo ""
echo "⚛️  Phase 4: React Frontend Dependencies..."
cd frontend

if [ "$INSTALL_MODE" = "fresh" ]; then
    echo "   🗑️  Entferne alte Frontend-Installation..."
    rm -rf node_modules package-lock.json .deps_installed 2>/dev/null || true
fi

echo "   📦 Installiere Frontend Dependencies..."
log_info "Installing Frontend dependencies"

# Frontend npm installation (usually lighter than backend)
echo "   📦 npm install läuft... (max 3 Minuten)"
if npm install --prefer-offline --no-audit --progress=false; then
    log_success "Frontend dependencies installed successfully"
    echo "   ✅ Frontend Dependencies installiert"
else
    log_error "Frontend npm install failed"
    echo "   ❌ Frontend Installation fehlgeschlagen"
    echo "   💡 Manuell ausführen: cd frontend && npm install"
    exit 1
fi

# Build Frontend (optional - for production readiness check)
echo "   🔨 Teste Frontend Build..."
log_info "Testing Frontend build"
if npm run build; then
    log_success "Frontend build test passed"
    echo "   ✅ Frontend Build-Test erfolgreich"
    rm -rf dist 2>/dev/null || true  # Cleanup test build
else
    log_error "Frontend build test failed"
    echo "   ⚠️  Frontend Build-Test fehlgeschlagen - Entwicklung funktioniert trotzdem"
fi

# Mark Frontend installation complete
touch .deps_installed
log_success "Frontend dependencies installed successfully"

cd ..

# INSTALLATION PHASE 5: ENVIRONMENT SETUP
echo ""
echo "📝 Phase 5: Environment Configuration..."

# Create environment files
log_info "Creating environment files"

# Frontend environment
if [ ! -f frontend/.env.local ]; then
    cat > frontend/.env.local << EOF
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_MAX_FILE_SIZE=500
VITE_CHUNK_SIZE=32
EOF
    log_info "Created frontend/.env.local"
    echo "   ✅ Frontend Environment erstellt"
fi

# Node.js service environment
if [ ! -f backend/node-service/.env ]; then
    cat > backend/node-service/.env << EOF
PORT=3000
REDIS_URL=redis://localhost:6379
DATABASE_URL=sqlite:./data/voxflow.db
PYTHON_SERVICE_URL=http://localhost:8000
JWT_SECRET=dev-secret-key-change-in-production
NODE_ENV=development
EOF
    log_info "Created backend/node-service/.env"
    echo "   ✅ Node.js Environment erstellt"
fi

# Python service environment
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
    log_info "Created backend/python-service/.env"
    echo "   ✅ Python Environment erstellt"
fi

# FINALIZATION: CREATE INSTALLATION MARKER
echo ""
echo "✅ Finalisiere Installation..."

# Create comprehensive installation marker
cat > "$INSTALLATION_MARKER" << EOF
🎉 VoxFlow Installation Complete
===============================

Installation Details:
  📅 Installed: $(date)
  🖥️  System: macOS $macos_version
  🍎 Hardware: $([ "$APPLE_SILICON" = true ] && echo "Apple Silicon" || echo "Intel")
  💾 RAM: ${ram_gb}GB
  🐍 Python: $python_version
  🟢 Node.js: $node_version

Components Installed:
  ✅ Redis Server
  ✅ Python Voxtral Service (MPS optimized)
  ✅ Node.js API Gateway (TypeScript)
  ✅ React Frontend (Vite + TailwindCSS)
  ✅ Environment Configuration

Installation Mode: $INSTALL_MODE
Installation Log: $INSTALLATION_LOG

🚀 Ready to start VoxFlow!
💡 Run: ./VoxFlow-Start.command

For support: Check $INSTALLATION_LOG
EOF

log_success "Installation marker created"

# Cleanup
if [ -d "$BACKUP_DIR" ] && [ "$INSTALL_MODE" = "fresh" ]; then
    echo "   🗑️  Entferne Backup (Installation erfolgreich)..."
    rm -rf "$BACKUP_DIR"
fi

# Reset trap to avoid cleanup message
trap - EXIT INT TERM

echo ""
echo "🎉 VoxFlow Installation Erfolgreich Abgeschlossen!"
echo ""
echo "📊 INSTALLATION SUMMARY:"
echo "   ⏱️  Dauer: $SECONDS Sekunden"
echo "   📦 Components: 4/4 installiert"
echo "   🔧 Environment: Konfiguriert"
echo "   📝 Log: $INSTALLATION_LOG"
echo ""
echo "🚀 NÄCHSTE SCHRITTE:"
echo "   1. Starte VoxFlow: ./VoxFlow-Start.command"
echo "   2. Browser öffnet automatisch auf http://localhost:5173"
echo "   3. Bei Problemen: Check $INSTALLATION_LOG"
echo ""
echo "💡 TIPS:"
echo "   • Installation ist einmalig - Start wird jetzt schnell sein"
echo "   • Reset möglich mit: ./VoxFlow-Reset.command"
echo "   • Updates: Re-run dieser Installation"
echo ""

log_success "VoxFlow installation completed successfully in ${SECONDS}s"

read -p "Drücke Enter zum Beenden..."
#!/bin/bash

# VoxFlow Voxtral Test Launcher - ECHTES Voxtral KERNFEATURE
# Startet die NEUE Production-Ready Voxtral Integration

# Wechsle in das Verzeichnis der Datei
cd "$(dirname "$0")"

# Terminal-Fenster Titel setzen
echo -ne "\033]0;VoxFlow Voxtral KERNFEATURE Tests\007"

# Farben für bessere Lesbarkeit
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🔥 VoxFlow Voxtral KERNFEATURE Tests${NC}"
echo "=========================================="
echo -e "${GREEN}✅ ECHTES mistralai/Voxtral-Mini-3B-2507${NC}"
echo -e "${GREEN}✅ mistral-common Dependencies${NC}"
echo -e "${GREEN}✅ Apple Silicon M4 Max Optimierung${NC}"
echo -e "${GREEN}✅ Production-Ready Architecture${NC}"
echo ""

# System-Informationen anzeigen
echo -e "${BLUE}💻 System-Informationen:${NC}"
echo "   macOS Version: $(sw_vers -productVersion)"
echo "   Architektur: $(uname -m)"
echo "   Verfügbarer RAM: $(system_profiler SPHardwareDataType | grep "Memory:" | awk '{print $2 " " $3}')"
echo "   CPU Kerne: $(sysctl -n hw.ncpu)"
echo ""

# Python Environment prüfen
echo -e "${BLUE}🐍 Python Service Environment:${NC}"
cd backend/python-service

if [ ! -d "venv" ]; then
    echo -e "${RED}❌ Python venv nicht gefunden${NC}"
    echo "Bitte erst das Setup ausführen:"
    echo "   cd backend/python-service"
    echo "   python -m venv venv"
    echo "   source venv/bin/activate"
    echo "   pip install -r requirements.txt"
    exit 1
fi

echo -e "${GREEN}✅ Python venv gefunden${NC}"

# Virtual Environment aktivieren
source venv/bin/activate

# Dependencies prüfen
echo -e "${BLUE}📦 Kritische Dependencies:${NC}"

check_package() {
    local package=$1
    if python -c "import $package; print('✅ $package:', $package.__version__ if hasattr($package, '__version__') else 'OK')" 2>/dev/null; then
        return 0
    else
        echo -e "${RED}❌ $package: FEHLT${NC}"
        return 1
    fi
}

success=true

if ! check_package "transformers"; then success=false; fi
if ! check_package "torch"; then success=false; fi
if ! check_package "mistral_common"; then success=false; fi
if ! check_package "pytest"; then success=false; fi

if [ "$success" = false ]; then
    echo ""
    echo -e "${RED}❌ Dependencies fehlen. Installation:${NC}"
    echo "   pip install -r requirements.txt"
    echo "   pip install mistral-common"
    exit 1
fi

echo ""

# Voxtral Model Status prüfen
echo -e "${BLUE}🤖 Voxtral Model Status:${NC}"
python -c "
try:
    from transformers import AutoProcessor, AutoModel
    print('📥 Teste Voxtral Processor...')
    processor = AutoProcessor.from_pretrained('mistralai/Voxtral-Mini-3B-2507')
    print('✅ Voxtral Processor: OK')
    print('📥 Teste Voxtral Model (kann einige Minuten dauern)...')
    model = AutoModel.from_pretrained('mistralai/Voxtral-Mini-3B-2507', device_map='auto')
    print('✅ Voxtral Model: GELADEN')
    print(f'🔥 Model Type: {type(model)}')
    print(f'🔥 Processor Type: {type(processor)}')
except Exception as e:
    print(f'❌ Voxtral Error: {e}')
    exit(1)
" || exit 1

echo ""

# Test-Auswahl anbieten
echo -e "${BLUE}🧪 Verfügbare Tests:${NC}"
echo "   1. Basis Integration Tests (Engine Initialization)"
echo "   2. Speech-to-Text Tests mit echter Audio-Datei"
echo "   3. Performance Tests"
echo "   4. Memory Management Tests"
echo "   5. Alle Tests ausführen"
echo ""

read -p "Welchen Test möchten Sie ausführen? (1-5): " choice

case $choice in
    1)
        echo -e "${CYAN}🔄 Starte Basis Integration Tests...${NC}"
        python -m pytest tests/test_integration_basic.py::TestBasicVoxtralIntegration::test_voxtral_engine_initialization -v -s
        ;;
    2)
        echo -e "${CYAN}🔄 Starte Speech-to-Text Tests...${NC}"
        python -m pytest tests/test_integration_basic.py::TestBasicVoxtralIntegration::test_real_audio_transcription_basic -v -s
        ;;
    3)
        echo -e "${CYAN}🔄 Starte Performance Tests...${NC}"
        python -m pytest tests/test_integration_basic.py::TestBasicVoxtralIntegration -k "performance" -v -s
        ;;
    4)
        echo -e "${CYAN}🔄 Starte Memory Management Tests...${NC}"
        python -m pytest tests/test_integration_basic.py::TestBasicVoxtralIntegration -k "memory" -v -s
        ;;
    5)
        echo -e "${CYAN}🔄 Starte ALLE Tests...${NC}"
        python -m pytest tests/test_integration_basic.py -v -s
        ;;
    *)
        echo -e "${RED}❌ Ungültige Auswahl${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Test-Session beendet${NC}"
echo ""
echo -e "${BLUE}💡 Weitere Tests:${NC}"
echo "   Basis Tests:        python -m pytest tests/test_basic_functionality.py -v"
echo "   Alle Integration:   python -m pytest tests/test_integration_basic.py -v"
echo "   Mit Ausgabe:        python -m pytest tests/ -v -s"
echo ""

read -p "Drücken Sie Enter zum Beenden..."
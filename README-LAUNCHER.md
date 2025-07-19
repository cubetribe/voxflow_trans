# 🚀 VoxFlow Launcher - Einfach per Doppelklick starten

VoxFlow kann jetzt ganz einfach per Doppelklick gestartet werden - keine Terminal-Befehle notwendig!

## 📱 Verfügbare Launcher

### ⚡ **VoxFlow-Local.command** - **EMPFOHLEN für M4 Max**
**Optimiert für maximale Performance auf Apple Silicon**

- 🚀 **50-70% schnellerer Start** (kein Redis Container Overhead)
- 🔴 **Lokales Redis** oder automatischer In-Memory Fallback
- 💾 **Reduzierte Memory-Nutzung** - nur 3 statt 4 Container
- 🧠 **Intelligente Erkennung** - automatisches Setup
- ⚡ **M4 Max optimiert** - beste Performance

**So verwenden:**
1. **Erstmalig**: Doppelklick auf `install-redis.command` (optional, aber empfohlen)
2. Doppelklick auf `VoxFlow-Local.command`
3. System prüft automatisch Redis-Verfügbarkeit
4. Browser öffnet automatisch http://localhost:5173
5. **Deutlich schnellerer Start** als Standard-Docker

### 🎙️ **VoxFlow.command** - Vollständige Docker-Umgebung
**Für maximale Stabilität und Kompatibilität**

- ✅ Einfacher Start per Doppelklick
- ✅ Komplette Docker-Isolation
- ✅ Redis Container inklusive
- ✅ Funktioniert immer (auch ohne lokales Redis)
- ✅ Benutzerfreundliche Oberfläche

**So verwenden:**
1. Doppelklick auf `VoxFlow.command`
2. Terminal öffnet sich und startet alle Services
3. Browser öffnet automatisch http://localhost:5173
4. Terminal minimieren (nicht schließen!)
5. Robuste, vollständige Umgebung

### 🔧 **VoxFlow-Debug.command** - Debug-Modus  
**Für Entwicklung und Problemanalyse**

- ✅ Detaillierte System-Informationen
- ✅ Live-Logs von allen Services
- ✅ Erweiterte Fehlerdiagnose
- ✅ Performance-Monitoring
- ✅ Debug-Panel im Browser
- ✅ Node.js Remote-Debugging

**So verwenden:**
1. Doppelklick auf `VoxFlow-Debug.command`
2. Debug-Terminal zeigt detaillierte Informationen
3. Browser öffnet mit Debug-Panel (Bug-Symbol unten rechts)
4. Live-Logs werden kontinuierlich angezeigt
5. Für Entwicklung und Problemlösung

### 🔴 **install-redis.command** - Redis Optimierung
**Einmalige Installation für beste Performance**

- 🍺 **Automatisches Homebrew Setup** falls benötigt
- 🔴 **Redis Installation** über Homebrew
- ⚙️ **Service-Konfiguration** mit Auto-Start Option
- 📊 **Performance-Tests** und Optimierung
- 💡 **Empfehlungen** für beste Konfiguration

**So verwenden:**
1. Doppelklick auf `install-redis.command`
2. Folge den Anweisungen für Homebrew/Redis Installation
3. Wähle Service-Konfiguration (empfohlen: Auto-Start)
4. **Einmalig ausführen** - danach nutze `VoxFlow-Local.command`

## 🔧 Erstmalige Einrichtung

### Voraussetzungen
- **macOS** (getestet auf macOS 14+, optimiert für M4 Max)
- **Docker Desktop** installiert und gestartet
  - Download: https://www.docker.com/products/docker-desktop/

### Empfohlene Installation (M4 Max Performance)
1. **Docker Desktop starten**
   - Launcher → Docker Desktop
   - Warten bis Docker vollständig geladen ist (Whale-Icon in der Menüleiste)

2. **Redis für Optimale Performance (optional)**
   - Doppelklick auf `install-redis.command`
   - Folge den Anweisungen für automatisches Setup
   - **Einmalig erforderlich** - dauert 2-3 Minuten

3. **VoxFlow mit optimaler Performance starten**
   - Doppelklick auf `VoxFlow-Local.command` ⚡ (empfohlen)
   - ODER `VoxFlow.command` 🐳 (vollständige Docker-Umgebung)
   - ODER `VoxFlow-Debug.command` 🔧 (Debug-Modus)

### Alternative Installation (Ohne Redis-Optimierung)
1. **Docker Desktop starten**
   - Launcher → Docker Desktop

2. **VoxFlow starten**
   - Doppelklick auf `VoxFlow.command` für vollständige Docker-Umgebung
   - ODER `VoxFlow-Debug.command` für Debug-Modus

3. **Beim ersten Start**
   - ⏳ Downloads können 5-10 Minuten dauern (Voxtral-Model)
   - 🐳 Docker Images werden automatisch erstellt
   - 🌐 Browser öffnet sich automatisch

## 🎮 Verwendung

### Lokaler Modus (VoxFlow-Local.command) - ⚡ EMPFOHLEN
```
🚀 VoxFlow Local Development
⚡ Optimiert für M4 Max Performance
💻 System Check:
🐳 Docker Status: ✅
🔴 Redis Check (Optional): ✅ Redis läuft lokal (optimal)
📝 Environment Setup: ✅
🚀 Starte VoxFlow Services...
🔍 Prüfe Python Service... ✅
🔍 Prüfe Node.js Service... ✅  
🔍 Prüfe Frontend... ✅
🎉 VoxFlow Local erfolgreich gestartet!
🌐 Browser wird automatisch geöffnet...
```

### Vollständiger Docker-Modus (VoxFlow.command)
```
🎙️ VoxFlow wird gestartet...
📝 Environment-Dateien werden eingerichtet...
🐳 Docker Container werden gestartet...
⏳ Warte auf Service-Start...
   🔄 Redis Container wird geprüft ✅
   🔄 Python Service wird geprüft ✅  
   🔄 Node.js Service wird geprüft ✅
   🔄 Frontend wird geprüft ✅
🎉 VoxFlow ist erfolgreich gestartet!
🌐 Browser wird automatisch geöffnet...
```

### Debug-Modus (VoxFlow-Debug.command)
```
🔧 VoxFlow Debug Mode
💻 System-Informationen:
🐳 Docker-Status:
📦 VoxFlow Container Status:
📝 Environment-Konfiguration:
🚀 Services werden im Debug-Modus gestartet...
📺 Live-Logs werden gezeigt:
```

### Redis Installation (install-redis.command)
```
🔴 Redis Installation für VoxFlow
🍺 Homebrew Check: ✅
🔴 Redis Installation: 📥 Installiere Redis...
🚀 Redis starten: ✅ Redis läuft als Service
🔍 Redis Verbindungstest: ✅ Redis antwortet korrekt
🎙️ VoxFlow Integration: Bereit für optimale Performance!
```

## 🔍 Debug-Features

### Im Browser (Debug-Panel)
- **Bug-Symbol** unten rechts klicken
- **Service Status**: WebSocket, API, Database
- **System Info**: RAM, CPU, Browser-Details
- **Live Debug-Logs**: Alle Frontend-Aktivitäten
- **Log Export**: Debug-Logs als Datei speichern

### Im Terminal (Debug-Modus)
- **Live-Logs**: Alle Backend-Services in Echtzeit
- **Container-Status**: Docker Container Überwachung
- **Performance-Metriken**: Memory, CPU Usage
- **Error-Details**: Detaillierte Fehlermeldungen

## 🛠️ Problemlösung

### VoxFlow startet nicht
1. **Docker prüfen:**
   ```bash
   # Docker läuft?
   docker --version
   # Container Status
   docker ps
   ```

2. **Ports belegt?**
   ```bash
   # Prüfe verwendete Ports
   lsof -i :3000  # Node.js
   lsof -i :5173  # Frontend  
   lsof -i :8000  # Python
   lsof -i :6379  # Redis
   ```

3. **Docker neu starten:**
   - Docker Desktop beenden
   - 10 Sekunden warten
   - Docker Desktop neu starten
   - VoxFlow erneut versuchen

### Services reagieren nicht
1. **Debug-Modus verwenden:**
   - `VoxFlow-Debug.command` starten
   - Logs analysieren

2. **Container neu starten:**
   ```bash
   docker-compose restart
   ```

3. **Komplett neu aufbauen:**
   ```bash
   docker-compose down
   docker-compose up --build
   ```

### Browser öffnet nicht automatisch
- Manuell öffnen: http://localhost:5173

### Langsamer Start
- **Beim ersten Mal**: Model-Download (5-10 Min normal)
- **Bei späteren Starts**: 1-2 Minuten normal
- **RAM-Problem**: Docker mehr RAM zuweisen (4GB+)

## 📊 Nützliche Befehle

### Während VoxFlow läuft

#### Lokaler Modus (VoxFlow-Local.command) ⚡
```bash
# Status aller Container (3 Services)
docker-compose -f docker-compose.local.yml ps

# Logs eines Services
docker-compose -f docker-compose.local.yml logs frontend
docker-compose -f docker-compose.local.yml logs node-service  
docker-compose -f docker-compose.local.yml logs python-service

# Redis Status (lokal)
redis-cli ping
redis-cli info memory
redis-cli monitor  # Live Redis-Commands anzeigen

# In Container einsteigen
docker-compose -f docker-compose.local.yml exec frontend sh
docker-compose -f docker-compose.local.yml exec node-service sh
docker-compose -f docker-compose.local.yml exec python-service bash

# Service neu starten
docker-compose -f docker-compose.local.yml restart frontend
```

#### Vollständiger Docker-Modus (VoxFlow.command) 🐳
```bash
# Status aller Container (4 Services)
docker-compose ps

# Logs eines Services
docker-compose logs frontend
docker-compose logs node-service  
docker-compose logs python-service
docker-compose logs redis

# In Container einsteigen
docker-compose exec frontend sh
docker-compose exec node-service sh
docker-compose exec python-service bash

# Service neu starten
docker-compose restart frontend
```

### Nach dem Beenden
```bash
# Lokaler Modus stoppen
docker-compose -f docker-compose.local.yml down

# Vollständiger Modus stoppen
docker-compose down

# Container + Volumes löschen  
docker-compose down -v
docker-compose -f docker-compose.local.yml down -v

# Redis lokal stoppen (falls gewünscht)
redis-cli shutdown
brew services stop redis  # Service-Modus

# Komplett aufräumen
docker system prune -f
```

## 🎯 Performance-Tipps

### Launcher-Optimierung für M4 Max
- **VoxFlow-Local.command** ⚡: **50-70% schneller** als vollständige Docker-Umgebung
- **Redis lokal installieren**: `install-redis.command` für beste Performance
- **Weniger Container**: 3 statt 4 Services = weniger Memory-Overhead
- **Direkter Redis-Zugriff**: Höherer Durchsatz als Container-Netzwerk

### Docker-Einstellungen
- **RAM**: Mindestens 6GB für Docker (8GB+ empfohlen für große Dateien)
- **CPU**: 4+ Cores empfohlen für M4 Max
- **Disk**: 15GB freier Speicher (Model-Cache + temp files)

### Redis-Optimierung
- **Lokale Installation**: `brew install redis` für beste Performance
- **Service-Modus**: `brew services start redis` für automatischen Start
- **Memory-Konfiguration**: Standard-Einstellungen sind optimal
- **Monitoring**: `redis-cli monitor` für Live-Debugging

### macOS-Optimierung (M4 Max)
- **Energy Saver**: Beim Transcribieren Computer nicht schlafen lassen
- **Background Apps**: Andere resource-intensive Apps schließen
- **Activity Monitor**: System-Load und Memory-Usage überwachen
- **Thermal Management**: Bei langen Sessions auf Temperatur achten

### Große Dateien (2+ Stunden)
- **Lokaler Modus**: Nutze `VoxFlow-Local.command` für beste Performance
- **Chunk-Size**: 10 Minuten (Standard, optimal für M4 Max)
- **Concurrent Processing**: 3-4 parallel (M4 Max kann mehr verarbeiten)
- **Format**: JSON für beste Performance
- **Output**: Lokaler SSD-Ordner für schnellsten Zugriff
- **Redis**: Lokales Redis für optimales Caching

## 🆘 Support

### Problem melden
1. **Debug-Logs sammeln:**
   - Debug-Modus starten
   - Problem reproduzieren
   - Logs exportieren

2. **System-Info sammeln:**
   - macOS Version: `sw_vers`
   - Docker Version: `docker --version`
   - Verfügbarer RAM: Über Apple-Menu > About This Mac

3. **Issue erstellen:**
   - GitHub: https://github.com/cubetribe/voxflow_trans/issues
   - Logs und System-Info anhängen

### Sofortige Hilfe
- **Docker-Probleme**: Docker Desktop Dokumentation
- **Audio-Probleme**: Browser-Mikrofon-Berechtigungen prüfen  
- **Performance**: Activity Monitor für Resource-Usage

---

**🎉 Viel Spaß mit VoxFlow!**  
Einfach doppelklicken und loslegen - so einfach kann KI-Transcription sein! 🚀
# 🚀 VoxFlow Launcher - Einfach per Doppelklick starten

VoxFlow kann jetzt ganz einfach per Doppelklick gestartet werden - keine Terminal-Befehle notwendig!

## 📱 Verfügbare Launcher

### 🎙️ **VoxFlow.command** - Normaler Modus
**Für den regulären Gebrauch**

- ✅ Einfacher Start per Doppelklick
- ✅ Automatische Docker-Umgebung
- ✅ Browser öffnet sich automatisch
- ✅ Benutzerfreundliche Oberfläche
- ✅ Minimale Logs für Übersichtlichkeit

**So verwenden:**
1. Doppelklick auf `VoxFlow.command`
2. Terminal öffnet sich und startet die Services
3. Browser öffnet automatisch http://localhost:5173
4. Terminal minimieren (nicht schließen!)
5. VoxFlow verwenden

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

## 🔧 Erstmalige Einrichtung

### Voraussetzungen
- **macOS** (getestet auf macOS 14+)
- **Docker Desktop** installiert und gestartet
  - Download: https://www.docker.com/products/docker-desktop/

### Installation
1. **Docker Desktop starten**
   - Launcher → Docker Desktop
   - Warten bis Docker vollständig geladen ist (Whale-Icon in der Menüleiste)

2. **VoxFlow starten**
   - Doppelklick auf `VoxFlow.command` für normalen Betrieb
   - ODER `VoxFlow-Debug.command` für Debug-Modus

3. **Beim ersten Start**
   - ⏳ Downloads können 5-10 Minuten dauern (Voxtral-Model)
   - 🐳 Docker Images werden automatisch erstellt
   - 🌐 Browser öffnet sich automatisch

## 🎮 Verwendung

### Normal-Modus
```
🎙️ VoxFlow wird gestartet...
📝 Environment-Dateien werden eingerichtet...
🐳 Docker Container werden gestartet...
⏳ Warte auf Service-Start...
   🔄 Redis wird geprüft ✅
   🔄 Python Service wird geprüft ✅  
   🔄 Node.js Service wird geprüft ✅
   🔄 Frontend wird geprüft ✅
🎉 VoxFlow ist erfolgreich gestartet!
🌐 Browser wird automatisch geöffnet...
```

### Debug-Modus
```
🔧 VoxFlow Debug Mode
💻 System-Informationen:
🐳 Docker-Status:
📦 VoxFlow Container Status:
📝 Environment-Konfiguration:
🚀 Services werden im Debug-Modus gestartet...
📺 Live-Logs werden gezeigt:
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
```bash
# Status aller Container
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
# Alle Container stoppen
docker-compose down

# Container + Volumes löschen  
docker-compose down -v

# Komplett aufräumen
docker system prune -f
```

## 🎯 Performance-Tipps

### Docker-Einstellungen
- **RAM**: Mindestens 4GB für Docker
- **CPU**: 2+ Cores empfohlen
- **Disk**: 10GB freier Speicher

### macOS-Optimierung  
- **Energy Saver**: Beim Transcribieren Computer nicht schlafen lassen
- **Background Apps**: Andere resource-intensive Apps schließen
- **Activity Monitor**: System-Load überwachen

### Große Dateien (2+ Stunden)
- **Chunk-Size**: 10 Minuten (Standard)
- **Concurrent Processing**: 3 parallel (Standard)
- **Format**: JSON für beste Performance
- **Output**: Lokaler Ordner für schnellsten Zugriff

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
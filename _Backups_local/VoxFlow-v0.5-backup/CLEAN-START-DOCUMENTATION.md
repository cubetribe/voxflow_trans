# VoxFlow Clean Start Script - Dokumentation

## 📋 Übersicht

Das `VoxFlow-Clean-Start.command` Script stellt einen vollständigen, robusten Neustart aller VoxFlow Services sicher. Es führt automatischen Cleanup durch und bietet optional detailliertes Debugging.

## 🚀 Schnellstart

```bash
./VoxFlow-Clean-Start.command
```

Das Script fragt interaktiv nach Debug-Modus und führt dann automatisch alle erforderlichen Schritte aus.

## 🔧 Features

### 1. Debug-Modus (Optional)
- **Aktivierung**: Interaktive Abfrage beim Script-Start
- **Detaillierte Logs**: Alle Services mit `--log-level debug`
- **System-Informationen**: Port-Status, Docker-Container, Prozesse
- **Debug-Dateien**: Separate Log-Dateien mit `-debug.log` Suffix

### 2. Vollständiger Cleanup
Vor dem Start werden ALLE bestehenden Services bereinigt:

- **Ports**: 3000, 5173, 5174, 8000 (mit `lsof` und `kill`)
- **Docker**: Alle VoxFlow Container (`docker-compose down`)
- **Prozesse**: Node.js, Python, Uvicorn, Vite (`pkill`)
- **Temporäre Dateien**: Log-Dateien und PID-Dateien

### 3. Automatische Dependencies
- **Node.js**: Überprüfung und Installation in `backend/node-service`
- **Python**: Virtual Environment Erstellung falls nicht vorhanden
- **Frontend**: Auto-Detection zwischen `frontend/` und `frontend_new/project/`
- **Redis**: Automatischer Start falls installiert

### 4. Service-Verifikation
- **HTTP Health Checks**: 60s Timeout pro Service
- **Response-Zeit Messung**: Performance-Monitoring
- **Fehler-Diagnostik**: Detaillierte Logs bei Timeouts
- **Status-Überwachung**: Kontinuierliche Prozess-Checks

## 📁 Verzeichnisstruktur

Das Script erkennt automatisch folgende Frontend-Konfigurationen:
- `frontend/` (Standard)
- `frontend_new/project/` (Alternative)

## 🌐 Service-Endpoints

Nach erfolgreichem Start sind folgende Services verfügbar:

| Service | URL | Beschreibung |
|---------|-----|--------------|
| Frontend | http://localhost:5173 | React/Vite Frontend |
| API Gateway | http://localhost:3000 | Node.js Express Server |
| Python Service | http://localhost:8000 | FastAPI Transcription Service |
| Redis | localhost:6379 | Optional (In-Memory Fallback) |

## 📊 Log-Dateien

### Normal-Modus
- `/tmp/voxflow-python.log`
- `/tmp/voxflow-node.log`
- `/tmp/voxflow-frontend.log`

### Debug-Modus
- `/tmp/voxflow-python-debug.log`
- `/tmp/voxflow-node-debug.log`
- `/tmp/voxflow-frontend-debug.log`

### PID-Tracking
- `/tmp/voxflow-python.pid`
- `/tmp/voxflow-node.pid`
- `/tmp/voxflow-frontend.pid`

## 🛠️ Debugging-Befehle

### Live-Logs anzeigen
```bash
# Alle Services
tail -f /tmp/voxflow-*.log

# Einzelne Services
tail -f /tmp/voxflow-python-debug.log
tail -f /tmp/voxflow-node-debug.log
tail -f /tmp/voxflow-frontend-debug.log
```

### Service-Status prüfen
```bash
# Port-Status
lsof -i:3000,5173,8000

# Prozess-Status
ps aux | grep -E "(uvicorn|node|vite)"

# HTTP-Checks
curl http://localhost:8000/health
curl http://localhost:3000/health
curl http://localhost:5173
```

### Services manuell stoppen
```bash
# Alle Services
kill $(cat /tmp/voxflow-*.pid) && rm /tmp/voxflow-*.pid

# Einzelne Services
kill $(cat /tmp/voxflow-python.pid)
kill $(cat /tmp/voxflow-node.pid)
kill $(cat /tmp/voxflow-frontend.pid)
```

## ⚠️ Troubleshooting

### Services starten nicht
1. **Debug-Modus aktivieren**: Script erneut mit `y` bei Debug-Abfrage
2. **Dependencies prüfen**: Wurden alle `npm install` erfolgreich ausgeführt?
3. **Port-Konflikte**: `lsof -i:3000,5173,8000` für aktive Prozesse
4. **Logs analysieren**: Debug-Log-Dateien auf Fehler prüfen

### Frontend nicht erreichbar
- **Verzeichnis-Check**: Script erkennt automatisch `frontend/` oder `frontend_new/project/`
- **Dependencies**: `npm install` in Frontend-Verzeichnis ausführen
- **Port-Check**: Sicherstellen dass Port 5173 frei ist

### Python Service Probleme
- **Virtual Environment**: Automatisch erstellt in `backend/python-service/venv`
- **Dependencies**: Python-Packages werden NICHT automatisch installiert
- **Port 8000**: Überprüfen ob Port verfügbar ist

### Node.js Service Probleme
- **Dependencies**: Automatische Installation in `backend/node-service`
- **TypeScript**: Build wird NICHT automatisch ausgeführt
- **Port 3000**: Standard API Gateway Port

## 🔄 Script-Ablauf

1. **Initialisierung**
   - Debug-Modus Abfrage
   - System-Informationen (optional)

2. **Cleanup-Phase**
   - Port-Bereinigung
   - Docker-Container stoppen
   - Prozess-Termination
   - Temporäre Dateien löschen

3. **System-Checks**
   - Node.js/Python Verfügbarkeit
   - Redis Setup (optional)

4. **Dependencies**
   - Node.js Packages
   - Python Virtual Environment
   - Frontend Packages

5. **Service-Start**
   - Python Service (Port 8000)
   - Node.js Service (Port 3000)
   - Frontend (Port 5173)

6. **Verifikation**
   - HTTP Health Checks
   - Response-Zeit Messung
   - Error-Reporting

7. **Monitoring**
   - Browser-Start
   - Kontinuierliche Status-Checks
   - Graceful Shutdown Handler

## 🚫 Bekannte Limitationen

- **Python Dependencies**: Werden NICHT automatisch installiert
- **TypeScript Build**: Muss manuell ausgeführt werden bei Änderungen
- **Docker**: Script nutzt native Installation, nicht Docker
- **Database**: SQLite wird vorausgesetzt
- **CORS**: Konfiguration für Port 5173 erforderlich

## 💡 Empfehlungen

1. **Erste Nutzung**: Debug-Modus aktivieren zur Fehlerdiagnose
2. **Development**: Normal-Modus für bessere Performance
3. **Redis**: Installation empfohlen für optimale Performance
4. **Log-Rotation**: Regelmäßige Bereinigung der `/tmp/voxflow-*` Dateien
5. **Monitoring**: Browser DevTools für Frontend-Debugging nutzen

## 🔗 Verwandte Scripts

- `VoxFlow-Local.command`: Docker-basierte lokale Entwicklung
- `VoxFlow.command`: Vollständige Docker-Compose Umgebung
- `VoxFlow-Debug.command`: Detaillierte Debug-Informationen

## 📝 Changelog

### Version 1.0
- Initiale Implementierung
- Vollständiger Cleanup-Mechanismus
- Debug-Modus Integration
- Automatische Dependencies-Erkennung
- Robuste Service-Verifikation
- Graceful Shutdown Handler
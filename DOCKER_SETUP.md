# 🐳 Docker Setup für VoxFlow

Diese Anleitung zeigt, wie Sie VoxFlow in einer vollständig virtualisierten Umgebung mit Docker ausführen können.

## 🚀 Quick Start

### 1. Repository klonen
```bash
git clone https://github.com/cubetribe/voxflow_trans.git
cd voxflow_trans
```

### 2. Environment Dateien erstellen
```bash
# Frontend
cp frontend/.env.example frontend/.env.local

# Node.js Service
cp backend/node-service/.env.example backend/node-service/.env

# Python Service
cp backend/python-service/.env.example backend/python-service/.env
```

### 3. Alle Services starten
```bash
docker-compose up --build
```

### 4. Anwendung öffnen
- Frontend: http://localhost:5173
- API Gateway: http://localhost:3000
- Python Service: http://localhost:8000
- Redis: localhost:6379

## 📋 Services Übersicht

### Frontend (React + Vite)
- **Port**: 5173
- **Container**: `voxflow-frontend`
- **Hot Reload**: ✅ Aktiviert
- **Volume Mount**: `./frontend:/app`

### Node.js API Gateway
- **Port**: 3000  
- **Container**: `voxflow-node-service`
- **TypeScript**: ✅ Aktiviert
- **Hot Reload**: ✅ Aktiviert mit nodemon
- **Volume Mount**: `./backend/node-service:/app`

### Python Voxtral Service
- **Port**: 8000
- **Container**: `voxflow-python-service`
- **FastAPI**: ✅ Auto-reload aktiviert
- **MLX**: ✅ Apple Silicon Support
- **Volume Mount**: `./backend/python-service:/app`

### Redis Cache
- **Port**: 6379
- **Container**: `voxflow-redis`
- **Persistent Data**: ✅ Volume gemountet

## 🛠️ Entwicklung

### Logs anzeigen
```bash
# Alle Services
docker-compose logs -f

# Einzelner Service
docker-compose logs -f frontend
docker-compose logs -f node-service
docker-compose logs -f python-service
```

### Services neu starten
```bash
# Alle Services
docker-compose restart

# Einzelner Service
docker-compose restart frontend
```

### In Container ausführen
```bash
# Frontend (npm Befehle)
docker-compose exec frontend npm install
docker-compose exec frontend npm run lint

# Node.js Service
docker-compose exec node-service npm test
docker-compose exec node-service npm run type-check

# Python Service
docker-compose exec python-service pytest
docker-compose exec python-service black .
```

### Services stoppen
```bash
# Graceful stop
docker-compose down

# Mit Volume cleanup
docker-compose down -v

# Mit Image cleanup
docker-compose down --rmi all
```

## 🔧 Konfiguration

### Environment Variablen

#### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_MAX_FILE_SIZE=500
VITE_CHUNK_SIZE=32
```

#### Node.js Service (.env)
```env
PORT=3000
REDIS_URL=redis://redis:6379
DATABASE_URL=sqlite:./data/voxflow.db
PYTHON_SERVICE_URL=http://python-service:8000
JWT_SECRET=your-secret-key
NODE_ENV=development
```

#### Python Service (.env)
```env
PORT=8000
MODEL_NAME=mistralai/Voxtral-Mini-3B-2507
DEVICE=mps
MAX_AUDIO_LENGTH=1800
CHUNK_SIZE=30
REDIS_URL=redis://redis:6379
ENVIRONMENT=development
```

## 📊 Health Checks

Alle Services haben Health Checks konfiguriert:

```bash
# Service Status prüfen
docker-compose ps

# Health Status
curl http://localhost:3000/health     # Node.js API
curl http://localhost:8000/health     # Python Service
curl http://localhost:5173            # Frontend
```

## 🗃️ Daten-Volumes

### Persistent Volumes
- `redis_data`: Redis Daten
- `python_cache`: Python Model Cache  
- `node_data`: Node.js SQLite Database

### Development Volumes (Bind Mounts)
- `./frontend:/app` - Frontend Source Code
- `./backend/node-service:/app` - Node.js Source Code
- `./backend/python-service:/app` - Python Source Code

## 🐛 Troubleshooting

### Port bereits belegt
```bash
# Ports prüfen
lsof -i :5173  # Frontend
lsof -i :3000  # Node.js
lsof -i :8000  # Python
lsof -i :6379  # Redis

# Andere Docker Container stoppen
docker stop $(docker ps -q)
```

### Container neu builden
```bash
# Einzelner Service
docker-compose build frontend --no-cache

# Alle Services
docker-compose build --no-cache
```

### Dependencies aktualisieren
```bash
# Frontend
docker-compose exec frontend npm install

# Node.js
docker-compose exec node-service npm install

# Python
docker-compose exec python-service pip install -r requirements.txt
```

### Logs debuggen
```bash
# Fehler in Echtzeit verfolgen
docker-compose logs -f --tail=100

# Bestimmte Service Logs
docker-compose logs python-service | grep ERROR
```

## 🚀 Produktion

Für Produktion verwenden Sie:

```bash
# Production Build
docker-compose -f docker-compose.prod.yml up --build -d

# Mit SSL/TLS
docker-compose -f docker-compose.prod.yml -f docker-compose.ssl.yml up -d
```

## 📱 Mobile Development

Für Mobile Testing (z.B. Handy im gleichen Netzwerk):

1. Finden Sie Ihre lokale IP:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. Update Frontend .env.local:
   ```env
   VITE_API_URL=http://192.168.1.100:3000
   VITE_WS_URL=ws://192.168.1.100:3000
   ```

3. Service neu starten:
   ```bash
   docker-compose restart frontend
   ```

## 🔒 Sicherheit

### Entwicklung
- Services sind nur lokal erreichbar
- Keine Produktions-Secrets in .env Dateien
- Volume Mounts nur für Development Code

### Wichtige Hinweise
- ⚠️ Niemals echte Secrets in Repository committen
- ⚠️ .env Dateien sind in .gitignore
- ⚠️ Production Setup benötigt separate Konfiguration

Diese Docker-Umgebung isoliert VoxFlow vollständig von Ihrem System und ermöglicht einfache Entwicklung und Testing.
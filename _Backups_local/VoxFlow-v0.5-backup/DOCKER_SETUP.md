# 🐳 VoxFlow Docker Setup - Vereinfacht nach DEVELOPMENT_RULES.md

## 📁 PROJEKT-STRUKTUR REGEL COMPLIANCE

✅ **NUR EINE docker-compose.yml** für alle Environments  
✅ **Environment-spezifische Configs** über .env Datei  
✅ **YAGNI Prinzip**: Ein funktionierendes Setup > drei nicht-funktionierende  
✅ **M4 Max Local Development** ohne Multi-Environment Complexity

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Copy and configure environment
cp .env.example .env

# Generate security secrets
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env
```

### 2. Development Mode
```bash
# Start all services in development mode
docker-compose up -d

# Watch logs
docker-compose logs -f

# Access services
# Frontend:      http://localhost:5173
# Node.js API:   http://localhost:3000  
# Python API:    http://localhost:8000
# Redis:         localhost:6379
```

### 3. Production Mode
```bash
# Edit .env for production
NODE_ENV=production
ENVIRONMENT=production
DEBUG_MODE=false
HOT_RELOAD=false
LOG_LEVEL=warn

# Start production
docker-compose up -d
```

## ⚙️ Environment Configuration

### 🔧 Development (.env)
```env
NODE_ENV=development
DEBUG_MODE=true
HOT_RELOAD_MODE=rw
LOG_LEVEL=debug
VITE_DEBUG_MODE=true
```

### 🚀 Production (.env)
```env
NODE_ENV=production
DEBUG_MODE=false
HOT_RELOAD_MODE=ro
LOG_LEVEL=warn
VITE_DEBUG_MODE=false
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Node.js       │    │   Python        │
│   React + Vite  │◄──►│   API Gateway   │◄──►│   Voxtral AI    │
│   Port: 5173    │    │   Port: 3000    │    │   Port: 8000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │     Redis       │
                       │   Cache + Jobs  │
                       │   Port: 6379    │
                       └─────────────────┘
```

## 📊 Resource Allocation (Apple Silicon M4 Max)

| Service | Memory Limit | CPU Limit | Purpose |
|---------|-------------|-----------|---------|
| Redis | 1.5GB | 1.0 | Cache + Job Queue |
| Python | 8GB | 4.0 | AI Model + Processing |
| Node.js | 2GB | 2.0 | API Gateway + WebSocket |
| Frontend | 1GB | 1.0 | React Development |

## 🔄 Common Commands

```bash
# Start services
docker-compose up -d

# Restart specific service
docker-compose restart python-service

# View logs
docker-compose logs -f python-service

# Enter container
docker-compose exec python-service bash

# Stop all
docker-compose down

# Clean rebuild
docker-compose down -v && docker-compose build --no-cache && docker-compose up -d
```

## 🐛 Troubleshooting

### Model Loading Issues
```bash
# Check Python service logs
docker-compose logs python-service

# Restart Python service
docker-compose restart python-service
```

### Memory Issues
```bash
# Check container stats
docker stats

# Adjust memory limits in .env
PYTHON_MEMORY_LIMIT=12G
```

### Port Conflicts
```bash
# Change ports in .env
FRONTEND_PORT=3001
NODE_SERVICE_PORT=3002
PYTHON_SERVICE_PORT=8001
REDIS_PORT=6380
```

## 🔐 Security Notes

- **Secrets**: Always generate unique JWT_SECRET and SESSION_SECRET
- **Production**: Disable debug modes and hot-reload
- **Firewall**: Only expose necessary ports in production
- **Updates**: Regularly update base images

## ✅ Health Checks

All services include comprehensive health checks:
- **Redis**: `redis-cli ping`
- **Python**: `GET /health` (extended timeout for model loading)
- **Node.js**: `GET /health`
- **Frontend**: `GET /` (Vite dev server)

## 📝 Environment Variables Reference

See `.env.example` for complete list of configurable variables.

**Key Variables:**
- `NODE_ENV`: development/production
- `DEBUG_MODE`: true/false
- `HOT_RELOAD_MODE`: rw/ro (development/production)
- `DEVICE`: mps/cuda/cpu (AI processing device)
- `MODEL_NAME`: Voxtral model variant
- Memory limits: `*_MEMORY_LIMIT` variables

---

## 🎯 DEVELOPMENT_RULES.md Compliance ✅

✅ **Single docker-compose.yml** - Keine separaten Varianten  
✅ **Environment-driven** - Alles über .env konfigurierbar  
✅ **Production-ready** - Vollständige Services ohne Shortcuts  
✅ **Apple Silicon optimized** - M4 Max Resource Management  
✅ **YAGNI Prinzip** - Weniger Komplexität, mehr Funktionalität
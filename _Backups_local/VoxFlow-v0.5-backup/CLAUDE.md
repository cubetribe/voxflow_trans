# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚫 PROJEKT-REGELN - ABSOLUT VERPFLICHTEND

### VERBOTEN (Keine Ausnahmen):
1. Minimal Working Systems / MVP First
2. Quick-Fixes oder "erstmal zum Laufen bringen"
3. Mock-Daten oder Stub-Services
4. Vereinfachungen oder Feature-Reduktion

### PFLICHT (Immer einhalten):
1. Production-Ready Code von Anfang an
2. Vollständige Implementierungen
3. Comprehensive Error Handling
4. Best Practices ohne Kompromisse

### BEI JEDER ENTSCHEIDUNG:
- Referenziere diese Regeln
- Begründe warum die Lösung production-ready ist
- Keine Shortcuts!

### QUALITÄTS-STANDARDS:
- **TypeScript Strict Mode**: Alle Type-Fehler behoben
- **Error Boundaries**: Graceful degradation auf allen Ebenen
- **Input Validation**: Zod schemas für alle API endpoints
- **Security Headers**: Helmet, CORS, Rate Limiting implementiert
- **Structured Logging**: Winston mit JSON format in Production
- **Health Checks**: Detaillierte Service-Monitoring
- **Testing Requirements**: 90%+ Coverage für business logic
- **Performance**: <200ms für API calls, <2s für file uploads

## Project Overview

VoxFlow is a voice transcription application using Voxtral (Mistral's speech-to-text model) with a dual-service architecture:

- **Node.js API Gateway** (Port 3000): Request routing, authentication, WebSocket management, file handling
- **Python Voxtral Service** (Port 8000): Model loading, audio processing, transcription engine, streaming support

## Development Commands

### Node.js API Gateway
```bash
cd backend/node-service
npm install
npm run dev           # Development server with hot reload
npm run build         # Build TypeScript to dist/
npm start            # Start production server
npm test             # Run unit tests
npm run lint         # ESLint code checking
npm run type-check   # TypeScript type checking
```

### Python Voxtral Service  
```bash
cd backend/python-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Development
uvicorn app.main:app --reload --port 8000

# Production
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker

# Testing and Quality
pytest                    # Run tests
black .                  # Format code
isort .                  # Sort imports
flake8 .                # Lint code
mypy .                  # Type checking
```

### Frontend Development (Current State: Active in frontend_new/project/)
**NOTE: The frontend is actively developed in `frontend_new/project/` - legacy frontend is backed up**

```bash
# Active frontend (production-ready)
cd frontend_new/project
npm install
npm run dev        # Development server (Vite)
npm run build      # Production build
npm run lint       # ESLint checking
npm run type-check # TypeScript checking

# Legacy frontend (backed up in frontend/src_backup_20250719_165420/)
# Use only for reference - DO NOT develop here
```

### Full Stack Development
```bash
# Start all services concurrently
# Terminal 1: Redis (required)
redis-server

# Terminal 2: Python Service
cd backend/python-service && uvicorn app.main:app --reload --port 8000

# Terminal 3: Node.js Gateway
cd backend/node-service && npm run dev

# Terminal 4: Frontend (choose active version)
cd frontend_new/project && npm run dev  # OR
cd frontend && npm run dev
```

### Quick Start Scripts (Launcher Commands)
The project includes production-ready launcher scripts:

```bash
# RECOMMENDED: Enhanced startup experience
./VoxFlow-Start.command     # Interactive startup with debug mode option
./start-dev.sh             # Command-line alternative

# Features of VoxFlow-Start.command:
# - Interactive VoxFlow introduction
# - Optional debug mode with system info
# - Automatic directory validation  
# - Browser auto-launch
# - Service management menu (logs, status, restart)

# Legacy scripts (REMOVED for safety):
# - VoxFlow.command, VoxFlow-Local.command, VoxFlow-Debug.command
# - All removed due to system crash issues

# Redis installation (one-time setup)
./install-redis.command    # Automated Redis installation via Homebrew
```

## Architecture

### Backend Services
- **Node.js Gateway**: Express.js with TypeScript, Socket.io for real-time, Multer for uploads, Bull for job queue, Redis for caching, SQLite for metadata
- **Python Service**: FastAPI, vLLM/Hugging Face Transformers, MLX for Apple Silicon optimization, Pydantic validation, asyncio, FFmpeg integration

### Frontend Stack (Updated)
- **Core**: React 19.1 with TypeScript 5.8+, Vite 7.0, npm
- **UI**: TailwindCSS 4.1, Framer Motion 12.23, Radix UI, Lucide React 0.525
- **Audio**: WaveSurfer.js 7.10, Web Audio API
- **State**: Zustand 5.0, Socket.io-client 4.8, TanStack Query 5.83, Axios 1.10
- **Testing**: Vitest 3.2, Playwright 1.54, Testing Library 16.3

### Data Flow
```
Client Audio → Node.js Gateway → Queue → Python Service → Voxtral Model
                     ↓                           ↓
                  Storage                   Transcription
                     ↓                           ↓
                  Database ← ← ← ← ← ← ← Results
```

## Voxtral Configuration

### Model Setup (Apple Silicon Optimized)
```python
class VoxtralConfig:
    model_name = "mistralai/Voxtral-Mini-3B-2507"  # or Small-24B
    device = "mps"  # Metal Performance Shaders
    precision = "float16"
    max_audio_length = 30 * 60  # 30 minutes
    chunk_size = 30  # seconds
    overlap = 2  # seconds overlap
```

### Audio Processing Pipeline
1. **Input validation** (format, duration, quality assessment)
2. **Preprocessing** (resample to 16kHz, mono conversion, noise reduction, VAD)
3. **Smart chunking** (10-minute segments with 10-second overlap for large files)
4. **Transcription** (concurrent chunk processing with progress tracking)
5. **Post-processing** (segment merging, timestamp adjustment, confidence scoring)
6. **Cleanup** (automatic temporary file removal)

## API Structure

### Node.js Gateway Endpoints
```
# Health and Info
GET    /health                          # Basic health check
GET    /health/detailed                 # Detailed health with dependencies

# File Management
POST   /api/files/upload               # Large file upload with streaming
GET    /api/files/info/:id             # Get file information
DELETE /api/files/:id                  # Remove uploaded file

# Transcription
POST   /api/transcribe/file            # Single file processing
POST   /api/transcribe/batch           # Multi-file batch processing

# Progress Tracking
GET    /api/transcribe/job/:id/progress    # Individual job progress
GET    /api/transcribe/batch/:id/progress  # Batch progress tracking
POST   /api/transcribe/job/:id/cancel     # Cancel job with cleanup

# Configuration
POST   /api/config/output              # Set output preferences
GET    /api/config/current             # Get current configuration

# WebSocket Communication
WebSocket: /socket
  -> audio:chunk              # Client sends audio chunk
  <- transcription:partial    # Server sends partial result
  <- transcription:final      # Server sends final result
  <- progress:update          # Progress updates
  <- error                    # Error notifications
```

### Python Service Endpoints
```
# Core Transcription
POST   /transcribe/file               # Process single uploaded file
POST   /transcribe/batch              # Start batch processing
GET    /transcribe/info/:filename     # Get audio file information

# Job Management
GET    /transcribe/job/:id/progress   # Get detailed job progress
POST   /transcribe/job/:id/cancel     # Cancel active job
GET    /transcribe/batch/:id/progress # Get batch progress

# Model Management
GET    /models/status                 # Model loading status
POST   /models/reload                 # Reload Voxtral model
GET    /models/info                   # Model configuration

# Streaming (WebSocket)
WebSocket: /stream/ws                 # Real-time streaming
POST   /stream/start                  # Start streaming session
POST   /stream/end/:session_id        # End streaming session
GET    /stream/sessions               # List active sessions

# Configuration & Monitoring
POST   /config/output                 # Update output settings
GET    /config/current                # Get current configuration
GET    /config/system-status          # System status and metrics
POST   /config/cleanup/trigger        # Manual cleanup
GET    /config/cleanup/stats          # Cleanup statistics

# Health Monitoring
GET    /health                        # Basic health check
GET    /health/detailed               # Detailed health with metrics
GET    /health/ready                  # Readiness probe
GET    /health/live                   # Liveness probe
```

## Performance Optimizations

### Apple Silicon (M4 Max)
- MLX integration for unified memory architecture
- Neural Engine utilization
- Metal Performance Shaders
- Zero-copy operations and streaming processing

### General Optimizations
- Lazy model loading with caching
- Batch processing for efficiency
- Redis caching with LRU strategy
- Connection pooling and resource management

## Environment Variables

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_MAX_FILE_SIZE=500
VITE_CHUNK_SIZE=32
```

## Current Project State

### Frontend Status
- **Active Frontend**: Production-ready React app in `frontend_new/project/` 
- **Legacy Frontend**: Complete React app backed up in `frontend/src_backup_20250719_165420/`
- **Docker Integration**: Updated docker-compose.yml for frontend_new/project/ structure
- **Path Migration**: All scripts and configs updated for new frontend location

### Backend Status
- **Node.js Service**: Production-ready with comprehensive API endpoints
- **Python Service**: MLX-optimized Voxtral integration for Apple Silicon
- **Database**: SQLite with proper migrations in `backend/node-service/data/`

### Testing Strategy
- **Node.js**: Jest with integration tests in `backend/node-service/tests/`
- **Python**: pytest with async support in `backend/python-service/tests/`
- **Frontend**: Vitest + Playwright (when active frontend is determined)

## Key Development Patterns

### Docker & Dependency Management
- **Dual Requirements Strategy**: 
  - `requirements.txt` - Full dependencies with MLX for native macOS
  - `requirements-docker.txt` - Linux-compatible subset for Docker builds
- **Frontend Path Structure**: All paths point to `frontend_new/project/`
- **Directory Validation**: Scripts validate paths before execution
- **Environment Management**: Automatic .env file creation with defaults

### Large File Processing
- **Chunking Strategy**: 10-minute segments with 10-second overlap
- **Memory Management**: Stream-based processing to handle 2+ hour files
- **Progress Tracking**: Real-time progress with chunk-level granularity
- **Cancellation**: Graceful job cancellation with immediate cleanup
- **Resource Monitoring**: CPU, memory, and disk space monitoring

### Error Handling & Cleanup
- **Automatic Cleanup**: Background service for temporary file management
- **Robust Error Handling**: Cleanup on failures, cancellations, and crashes
- **Circuit Breaker Pattern**: Graceful degradation under load
- **Retry Logic**: Exponential backoff for transient failures
- **Disk Space Management**: Emergency cleanup when space is low

### Testing & Quality
- **Backend**: Jest for Node.js, pytest for Python, comprehensive error scenarios
- **API Testing**: Integration tests for batch processing and large file uploads
- **Performance Testing**: Load testing with large files and concurrent jobs
- **Cleanup Testing**: Verify temporary file cleanup under all conditions

### Deployment & Monitoring
- **Development**: Hot reload for both services, comprehensive logging
- **Production**: PM2 for Node.js, Gunicorn for Python, health monitoring
- **Monitoring**: System metrics, job progress, cleanup statistics
- **Alerts**: Disk space, memory usage, failed job notifications

## Large File Support

### File Size Limits
- **Maximum File Size**: 500MB (configurable)
- **Chunk Processing**: 10-minute segments for efficient memory usage
- **Concurrent Chunks**: Configurable parallel processing (default: 3)
- **Upload Streaming**: Chunked upload for large files

### Supported Formats & Quality
- **Input Formats**: MP3, WAV, M4A, WEBM, OGG, FLAC
- **Output Formats**: JSON, TXT, SRT, VTT with timestamps and confidence
- **Sample Rates**: Up to 48kHz (automatically resampled to 16kHz)
- **Audio Length**: Unlimited (tested with 2+ hour files)

### Browser Requirements
- **Modern Browsers**: Chrome 90+, Safari 15+, Firefox 90+
- **Required APIs**: File API, WebRTC, Web Audio API, MediaRecorder API
- **WebSocket Support**: For real-time progress and streaming

## Security & Privacy

### Data Protection
- **Local Processing**: All transcription happens locally, no cloud dependencies
- **Automatic Cleanup**: Temporary files cleaned after processing
- **Secure Upload**: Encrypted file transfer with integrity checks
- **No Data Retention**: Files deleted immediately after processing

### Access Control
- **API Authentication**: JWT tokens for WebSocket, API keys for REST
- **Rate Limiting**: Configurable request limits per IP/user
- **Input Validation**: Comprehensive file format and size validation
- **CORS Configuration**: Strict origin policies for web security

## Debugging and Troubleshooting

### Single Test Execution
```bash
# Node.js service single test
cd backend/node-service
npm test -- --testNamePattern="specific test name"
npm test tests/integration/api/files.test.ts

# Python service single test  
cd backend/python-service
pytest tests/test_specific_file.py::test_specific_function -v
pytest -k "test_pattern" -v
```

### Production Checks Before Commits
```bash
# MANDATORY: Run these commands before any commit
cd backend/node-service
npm run lint && npm run type-check && npm test

cd backend/python-service  
black . && isort . && flake8 . && mypy . && pytest

cd frontend_new/project
npm run lint && npm run build  # No separate type-check script
```

### Container Debugging
```bash
# Check individual service logs
docker-compose logs -f python-service
docker-compose logs -f node-service
docker-compose logs -f frontend

# Access service shells for debugging
docker-compose exec python-service bash
docker-compose exec node-service sh
docker-compose exec redis redis-cli

# Resource monitoring
docker stats
```

### Model and Service Status
```bash
# Check Python service model status
curl http://localhost:8000/models/status

# Check Node.js service health
curl http://localhost:3000/health/detailed

# Monitor cleanup statistics
curl http://localhost:8000/config/cleanup/stats
```

### Log Locations
```bash
# Service-specific logs
backend/node-service/node_service.log
backend/python-service/python_service.log
frontend_new/project/frontend_service.log

# Application logs within containers
backend/node-service/logs/
backend/python-service/logs/
```

## important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
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

VoxFlow is a production-ready voice transcription platform using Mistral's Voxtral-Mini-3B-2507 model with native Apple Silicon optimization:

- **Node.js API Gateway** (Port 3000): Request routing, authentication, WebSocket management, file handling
- **Python Voxtral Service** (Port 8000): Model loading, audio processing, transcription engine with dynamic token limits
- **React Frontend** (Port 5173): Modern UI with system prompt editor and real-time progress tracking

## 🎯 Version 0.9 Production Improvements

### Critical Fixes Implemented
- **Dynamic Token Limits**: Eliminated text truncation with intelligent token calculation (3 tokens/second + 100 buffer)
- **System Prompt Integration**: AI guidance for specialized transcription contexts with 2000 character validation
- **Improved Generation**: Repetition penalty (1.1), length penalty (1.0), early stopping for quality
- **API Parameter Fixes**: Resolved missing language parameter and Pydantic model validation errors

### 📝 **Version 0.9.1.3 Status - CRITICAL FIXES COMPLETED**
- **Feature Complete**: ✅ Functional chunk-size control implemented and tested
- **Quality Assurance**: ✅ Production-ready validation with real audio files
- **Integration Testing**: ✅ End-to-end validation Frontend → Node.js → Python → Voxtral
- **🔴 CRITICAL FIX**: ✅ Token truncation resolved - 5min audio now fully transcribed 
- **🔧 Math Fix**: ✅ Chunk count calculation corrected (math.ceil vs int)
- **🎨 Progress Panel**: ✅ Real-time WebSocket progress tracking implemented
- **Documentation Updated**: ✅ README.md, CHANGELOG.md, CLAUDE.md updated for v0.9.1.3
- **Git Status**: 🔄 Ready for commit v0.9.1.3 (critical fixes)
- **System Status**: ⚠️ Services stopped due to GPU overload - requires restart

### 🎯 **Version 0.9.1 Implementation Summary**
- **Chunk-Size Control**: Klein(3min) | Mittel(5min) | Groß(10min) selector
- **Backend Integration**: CHUNK_SIZE_MAPPING → ProcessingConfig.chunk_duration_minutes
- **Frontend Enhancement**: Purple highlight 3-button selector in ConfigPanel
- **API Validation**: Zod schema for chunkSizeMode parameter
- **Production Testing**: German audio transcription verified ("Ich habe es nicht verstunden.")
- **Performance**: Processing times 1.57s-2.78s, overlap preserved at 10 seconds

### 🧪 **Version 0.9.1.3 Test Results**
- **TOKEN TRUNCATION FIX**: ✅ 5min German audio fully transcribed (no cutoff at "Lass uns")
- **CHUNK COUNT FIX**: ✅ Correct 2/2 chunk processing instead of 2/1
- **New Token Calculation**: 5 tokens/sec + 300 buffer = 1200 tokens (vs 640 previous)
- **Test Validation**: "Liebe Leserin, lieber Leser..." complete transcription
- **Performance**: Processing stable, proper overlap handling
- **REMAINING ISSUES**: WebSocket status updates, GPU memory cleanup after stop
- **System Recovery**: All services cleanly stopped, ready for restart

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

### Frontend Development (Current State: Active in frontend/)
**NOTE: The frontend is actively developed in `frontend/` - this is the current production location**

```bash
# Active frontend (production-ready)
cd frontend
npm install
npm run dev        # Development server (Vite)
npm run build      # Production build
npm run lint       # ESLint checking
# Note: No separate type-check script - types are checked during build
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

# Terminal 4: Frontend
cd frontend && npm run dev
```

### Quick Start Scripts (Launcher Commands)
The project includes production-ready launcher scripts:

```bash
# RECOMMENDED: Professional two-step installation system
cd installers && ./VoxFlow-Install.command   # One-time installation
cd installers && ./VoxFlow-Start.command     # Ultra-fast daily startup

# Alternative manual startup
./start-dev.sh             # Direct command-line startup

# Features of installer system:
# - VoxFlow-Install.command: Complete dependency installation and validation
# - VoxFlow-Start.command: Instant startup for daily development
# - VoxFlow-Reset.command: Clean slate reset for troubleshooting
# - Comprehensive system validation and error handling
# - Creates .installation_complete marker for fast subsequent startups
```

## Architecture

### Backend Services
- **Node.js Gateway**: Express.js with TypeScript, Socket.io for real-time, Multer for uploads, Bull for job queue, Redis for caching, SQLite for metadata
- **Python Service**: FastAPI, vLLM/Hugging Face Transformers, MLX for Apple Silicon optimization, Pydantic validation, asyncio, FFmpeg integration

### Frontend Stack (Current)
- **Core**: React 18.3 with TypeScript 5.5+, Vite 5.4, npm
- **UI**: TailwindCSS 3.4, Lucide React 0.344
- **Real-time**: Socket.io-client 4.8, React Hot Toast 2.5
- **Build Tools**: Vite 5.4, ESLint 9.9, Autoprefixer

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

### Critical Voxtral Implementation Details
- **Model API**: Uses `VoxtralForConditionalGeneration` from Transformers
- **Required API**: `processor.apply_transcrition_request(audio, format)` - note the typo in "transcrition"
- **Device Setting**: DEVICE=mps mandatory for Apple Silicon (set before any imports)
- **Format Requirements**: Audio and format must be passed as lists to the API
- **Dependencies**: Requires GitHub version of Transformers for latest Voxtral support
- **Dynamic Token Limits**: Calculate based on audio duration (5 tokens/second + 300 buffer, max 2048) - FIXED v0.9.1.3
- **Generation Parameters**: Use repetition_penalty=1.1, length_penalty=1.0, early_stopping=True
- **System Prompts**: Support 2000 character system prompts for specialized transcription contexts

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
- **Active Frontend**: Production-ready React app in `frontend/` with minimal dependencies
- **Native Development**: No Docker - direct Vite dev server on port 5173
- **Simplified Stack**: React 18.3, TailwindCSS 3.4, Socket.io-client, minimal UI dependencies

### Backend Status
- **Node.js Service**: Production-ready with comprehensive API endpoints on port 3000
- **Python Service**: Voxtral-Mini-3B-2507 working natively with MPS optimization on port 8000
- **Redis**: Native daemon process on port 6379 (no Docker containers)
- **Database**: SQLite with proper migrations in `backend/node-service/data/`

### Testing Strategy
- **Node.js**: Jest with integration tests in `backend/node-service/tests/`
- **Python**: pytest with async support + Voxtral native testing via test_voxtral_native.py
- **Frontend**: Vitest + Playwright in `frontend/` for React components and E2E testing
- **Voxtral Integration**: Pre-startup validation with apply_transcrition_request API

## Key Development Patterns

### Native Development & Dependency Management
- **No Docker**: Complete transition to native development for maximum performance
- **Python Virtual Environment**: Full dependency isolation with venv in backend/python-service/
- **Smart Dependency Tracking**: .deps_installed markers prevent redundant installations
- **Frontend Path Structure**: All paths point to `frontend/` (migrated from frontend_new/project/)
- **Directory Validation**: Scripts validate paths before execution  
- **Environment Management**: Automatic .env file creation with localhost URLs
- **Voxtral Integration**: VoxtralForConditionalGeneration with apply_transcrition_request API

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

cd frontend
npm run lint && npm run build  # No separate type-check script
```

### Native Service Debugging
```bash
# Check individual service logs
tail -f backend/python-service/python_service.log
tail -f backend/node-service/node_service.log
tail -f frontend/frontend_service.log

# Process monitoring
ps aux | grep -E "(redis|uvicorn|node|vite)"

# Service startup debugging
cd installers && ./VoxFlow-Start.command  # Interactive debugging
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
frontend/frontend_service.log

# Application logs
backend/node-service/logs/
backend/python-service/logs/
```

## 🚨 **CRITICAL STATUS UPDATE - 2025-07-22**

### GPU OVERLOAD ISSUE
- **Problem**: GPU stuck at 100% usage for 10+ minutes after stopping all VoxFlow services
- **Services Stopped**: ✅ Python (uvicorn), Node.js, Redis, all VoxFlow processes killed
- **GPU Memory**: Still occupied by Voxtral model - requires system restart or manual cleanup
- **System Impact**: M4 Max GPU not releasing memory despite process termination

### COMPLETED FIXES (v0.9.1.3)
1. **🔴 TOKEN TRUNCATION**: Fixed max_new_tokens calculation (87% increase: 640→1200 tokens)
2. **🔧 CHUNK PROCESSING**: Fixed math.ceil() vs int() bug in chunk count calculation  
3. **🎨 PROGRESS PANEL**: Implemented real-time WebSocket progress tracking
4. **✅ VALIDATION**: 5min German audio fully transcribed without truncation

### PENDING CRITICAL TASKS
1. **GPU Memory Cleanup**: Implement torch.mps.empty_cache() on service shutdown
2. **WebSocket Events**: Python→Node.js progress updates missing
3. **Smart Overlap Testing**: Multi-chunk overlap removal validation
4. **Production Commit**: Git commit v0.9.1.3 with all critical fixes

### RESTART RECOMMENDATION
**System restart recommended** to fully clear GPU memory before continuing development.

## important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
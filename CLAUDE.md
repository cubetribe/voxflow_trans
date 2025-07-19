# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VoxFlow is a voice transcription application using Voxtral (Mistral's speech-to-text model) with a dual-service architecture:

- **Node.js API Gateway** (Port 3000): Request routing, authentication, WebSocket management, file handling
- **Python Voxtral Service** (Port 8000): Model loading, audio processing, transcription engine, streaming support

## Development Commands

### Node.js Service
```bash
cd node-service
npm install
npm run dev
```

### Python Service  
```bash
cd python-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development
```bash
cd frontend
pnpm install
pnpm dev           # Development server
pnpm type-check    # TypeScript checking
pnpm lint          # Code linting
pnpm build         # Production build
```

## Architecture

### Backend Services
- **Node.js Gateway**: Express.js with TypeScript, Socket.io for real-time, Multer for uploads, Bull for job queue, Redis for caching, SQLite for metadata
- **Python Service**: FastAPI, vLLM/Hugging Face Transformers, MLX for Apple Silicon optimization, Pydantic validation, asyncio, FFmpeg integration

### Frontend Stack
- **Core**: React 18.3 with TypeScript 5.3+, Vite 5.0, pnpm
- **UI**: TailwindCSS 3.4, Framer Motion, Radix UI, Lucide React
- **Audio**: WaveSurfer.js 7.0, Web Audio API, Tone.js
- **State**: Zustand, Socket.io-client, TanStack Query, Axios

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
1. Input validation (format, duration, quality)
2. Preprocessing (resample to 16kHz, mono conversion, noise reduction, VAD)
3. Smart chunking at silence points with overlap
4. Transcription with streaming/batch modes, language detection, confidence scores

## API Structure

### Node.js Endpoints
```
POST   /api/transcribe/upload     # File upload
POST   /api/transcribe/start      # Start live recording
GET    /api/transcriptions        # List transcriptions
GET    /api/transcription/:id     # Get single transcription
DELETE /api/transcription/:id     # Delete transcription
GET    /api/export/:id/:format    # Export (TXT, SRT, JSON)

WebSocket: /socket
  -> audio:chunk              # Client sends audio chunk
  <- transcription:partial    # Server sends partial result
  <- transcription:final      # Server sends final result
  <- error                    # Error notification
```

### Python FastAPI Endpoints
```
POST   /transcribe/file       # Process uploaded file
POST   /transcribe/stream     # Handle streaming audio
GET    /models/status         # Model loading status
GET    /health               # Service health check
POST   /config/update        # Update model config
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

### Frontend
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_MAX_FILE_SIZE=500MB
VITE_CHUNK_SIZE=32KB
```

## Key Development Patterns

### Error Handling
- Exponential backoff with circuit breaker pattern
- Retry logic for audio, model, network, and system errors
- Graceful degradation for performance issues

### Testing
- Frontend: Vitest for unit tests, React Testing Library, Playwright for E2E, MSW for API mocking
- Backend: Standard Node.js/Python testing frameworks

### Deployment
- Development: PM2 for Node.js, Gunicorn for Python
- Production: Nginx reverse proxy, systemd services, health checks
- Frontend: Static hosting (Vercel/Netlify) with CDN

## Audio Requirements
- Browser support: Chrome 90+, Safari 15+, Firefox 90+
- Required APIs: WebRTC, Web Audio API, MediaRecorder API
- Supported formats: MP3, WAV, M4A, WEBM, OGG

## Security
- API key authentication for REST, JWT for WebSocket
- Rate limiting and IP whitelisting (optional)
- Audio encryption at rest, secure file upload, input validation
# 🚀 Backend - Voxtral Server Architecture

## Architecture Overview

### Services
1. **Node.js API Gateway** (Port 3000)
   - Request Routing
   - Authentication
   - WebSocket Management
   - File Handling

2. **Python Voxtral Service** (Port 8000)
   - Model Loading
   - Audio Processing
   - Transcription Engine
   - Streaming Support

## Tech Stack

### Node.js Service
- **Express.js** mit TypeScript
- **Socket.io** für Real-time
- **Multer** für File Uploads
- **Bull** für Job Queue
- **Redis** für Caching
- **SQLite** für Metadata

### Python Service
- **FastAPI** für REST API
- **vLLM** oder **Hugging Face Transformers**
- **MLX** für Apple Silicon Optimization
- **Pydantic** für Data Validation
- **asyncio** für Async Processing
- **FFmpeg** Integration

## Project Structure

```
backend/
├── node-service/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── audio.controller.ts
│   │   │   ├── transcription.controller.ts
│   │   │   └── health.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── validation.middleware.ts
│   │   ├── services/
│   │   │   ├── audio.service.ts
│   │   │   ├── queue.service.ts
│   │   │   └── storage.service.ts
│   │   ├── sockets/
│   │   │   ├── transcription.socket.ts
│   │   │   └── connection.manager.ts
│   │   ├── utils/
│   │   ├── types/
│   │   ├── config/
│   │   └── app.ts
│   ├── package.json
│   └── tsconfig.json
│
└── python-service/
    ├── app/
    │   ├── api/
    │   │   ├── endpoints/
    │   │   │   ├── transcribe.py
    │   │   │   ├── health.py
    │   │   │   └── models.py
    │   │   └── dependencies.py
    │   ├── core/
    │   │   ├── config.py
    │   │   ├── voxtral_engine.py
    │   │   └── audio_processor.py
    │   ├── models/
    │   │   ├── transcription.py
    │   │   └── audio.py
    │   ├── services/
    │   │   ├── voxtral_service.py
    │   │   ├── streaming_service.py
    │   │   └── preprocessing.py
    │   └── main.py
    ├── requirements.txt
    └── Dockerfile
```

## Voxtral Integration

### Model Setup
```python
# Voxtral Configuration für M4 Max
class VoxtralConfig:
    model_name = "mistralai/Voxtral-Mini-3B-2507"  # oder Small-24B
    device = "mps"  # Metal Performance Shaders für Apple Silicon
    precision = "float16"
    max_audio_length = 30 * 60  # 30 Minuten
    chunk_size = 30  # Sekunden
    overlap = 2  # Sekunden Überlappung
```

### Audio Processing Pipeline
1. **Input Validation**
   - Format Detection
   - Duration Check
   - Quality Assessment

2. **Preprocessing**
   - Resampling zu 16kHz
   - Mono Conversion
   - Noise Reduction (optional)
   - VAD (Voice Activity Detection)

3. **Chunking Strategy**
   - Smart Splitting bei Silence
   - Overlap für Context
   - Batch Processing

4. **Transcription**
   - Streaming Mode für Live Audio
   - Batch Mode für Files
   - Language Detection
   - Confidence Scores

## API Endpoints

### Node.js Gateway

```typescript
// REST Endpoints
POST   /api/transcribe/upload     // File Upload
POST   /api/transcribe/start      // Start Live Recording
GET    /api/transcriptions        // List Transcriptions
GET    /api/transcription/:id     // Get Single Transcription
DELETE /api/transcription/:id     // Delete Transcription
GET    /api/export/:id/:format    // Export (TXT, SRT, JSON)

// WebSocket Events
ws: /socket
  -> audio:chunk              // Client sends audio chunk
  <- transcription:partial    // Server sends partial result
  <- transcription:final      // Server sends final result
  <- error                    // Error notification
```

### Python FastAPI

```python
# Core Endpoints
POST   /transcribe/file       # Process uploaded file
POST   /transcribe/stream     # Handle streaming audio
GET    /models/status         # Model loading status
GET    /health               # Service health check
POST   /config/update        # Update model config
```

## Data Flow

```
Client Audio → Node.js Gateway → Queue → Python Service → Voxtral Model
                     ↓                           ↓
                  Storage                   Transcription
                     ↓                           ↓
                  Database ← ← ← ← ← ← ← Results
```

## Performance Optimizations

### 1. Model Loading
- **Lazy Loading** bei ersten Request
- **Model Caching** im Memory
- **Warm-up Routine** für schnellere erste Inference

### 2. Batching
- Sammle mehrere kurze Requests
- Batch Processing für Effizienz
- Priority Queue für Live Streams

### 3. Caching Strategy
- Redis für häufige Anfragen
- LRU Cache für Transcriptions
- Audio Fingerprinting für Duplikate

### 4. Resource Management
- Connection Pooling
- Memory Limits
- GPU Memory Management
- Graceful Degradation

## Apple Silicon Optimizations

### MLX Integration
```python
# Nutze Apple's ML Framework
import mlx
import mlx.nn as nn
from mlx.utils import tree_map

# Optimierungen für M4 Max
- Unified Memory Architecture
- Neural Engine Utilization
- Metal Performance Shaders
```

### Memory Management
- Efficient Buffer Allocation
- Zero-Copy Operations
- Streaming Processing

## Error Handling

### Retry Logic
- Exponential Backoff
- Circuit Breaker Pattern
- Fallback Mechanisms

### Error Types
1. **Audio Errors**: Invalid format, corrupted file
2. **Model Errors**: OOM, inference failure
3. **Network Errors**: Timeout, connection lost
4. **System Errors**: Disk full, permission denied

## Monitoring & Logging

### Metrics
- Request/Response Times
- Queue Length
- Model Inference Time
- Memory Usage
- Error Rates

### Logging
- Structured Logging (JSON)
- Log Levels
- Request Tracing
- Performance Profiling

## Security

### Authentication
- API Key für REST
- JWT für WebSocket
- Rate Limiting
- IP Whitelisting (optional)

### Data Protection
- Audio Encryption at Rest
- Secure File Upload
- Input Validation
- SQL Injection Prevention

## Deployment

### Development
```bash
# Node.js Service
cd node-service
npm install
npm run dev

# Python Service
cd python-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Production
- PM2 für Node.js
- Gunicorn für Python
- Nginx als Reverse Proxy
- Systemd Services
- Health Checks
- Auto-restart

## Scaling Considerations

### Horizontal Scaling
- Load Balancer
- Multiple Python Workers
- Redis Cluster
- Shared Storage

### Vertical Scaling
- GPU Scheduling
- Memory Allocation
- CPU Affinity
- Process Priority
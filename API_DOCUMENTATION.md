# VoxFlow API Documentation

## Overview

VoxFlow provides a comprehensive REST API and WebSocket interface for audio transcription. The system consists of two main services:

- **Node.js API Gateway** (Port 3000) - Main API interface, file handling, WebSocket
- **Python Voxtral Service** (Port 8000) - AI model processing, transcription engine

## Base URLs

- Development: `http://localhost:3000`
- WebSocket: `ws://localhost:3000`
- Python Service (internal): `http://localhost:8000`

## Authentication

Currently no authentication is required. JWT implementation exists but is not enforced.

Future authentication will use:
```
Authorization: Bearer <token>
```

## REST API Endpoints

### Health Check

#### GET /health
Basic health check
```json
Response: {
  "status": "ok",
  "service": "VoxFlow API Gateway",
  "timestamp": "2024-01-19T15:30:00Z"
}
```

#### GET /health/detailed
Detailed health check with system metrics
```json
Response: {
  "status": "ok|degraded|error",
  "service": "VoxFlow API Gateway",
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": "2024-01-19T15:30:00Z",
  "checks": {
    "database": true,
    "redis": true,
    "pythonService": true
  },
  "system": {
    "memory": {
      "used": 4096,
      "total": 16384,
      "percentage": 25
    },
    "cpu": {
      "load": [1.5, 1.2, 0.9],
      "cores": 8
    },
    "disk": {
      "used": 102400,
      "total": 512000,
      "percentage": 20
    }
  }
}
```

### File Management

#### POST /api/files/upload
Upload audio files for transcription

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `files`: File[] (required)
  - Maximum 10 files per request
  - Maximum 500MB per file
  - Supported formats: `.mp3`, `.wav`, `.m4a`, `.webm`, `.ogg`, `.flac`

**Response:**
```json
{
  "message": "Files uploaded successfully",
  "files": [
    {
      "fileId": "file_1234567890",
      "fileName": "audio.mp3",
      "fileSize": 5242880,
      "uploadedAt": "2024-01-19T15:30:00Z"
    }
  ]
}
```

**Error Responses:**
- `400` - Invalid file type or too many files
- `413` - File too large

#### GET /api/files/info/:id
Get file information

**Response:**
```json
{
  "fileId": "file_1234567890",
  "fileName": "audio.mp3",
  "fileSize": 5242880,
  "mimeType": "audio/mpeg",
  "uploadedAt": "2024-01-19T15:30:00Z",
  "duration": 180.5
}
```

#### DELETE /api/files/:id
Delete uploaded file

**Response:**
```json
{
  "message": "File deleted successfully",
  "fileId": "file_1234567890"
}
```

### Transcription

#### POST /api/transcribe/file
Transcribe a single file

**Request:**
```json
{
  "fileId": "file_1234567890"
}
```

**Response:**
```json
{
  "jobId": "job_9876543210",
  "status": "queued",
  "fileId": "file_1234567890",
  "startedAt": "2024-01-19T15:30:00Z"
}
```

#### POST /api/transcribe/batch
Batch transcription for multiple files

**Request:**
```json
{
  "fileIds": ["file_123", "file_456"],
  "outputDirectory": "/path/to/output",
  "format": "json",
  "includeTimestamps": true,
  "includeConfidence": true,
  "cleanupAfterProcessing": true
}
```

**Parameters:**
- `fileIds`: string[] (1-50 files)
- `outputDirectory`: string
- `format`: "json" | "txt" | "srt" | "vtt"
- `includeTimestamps`: boolean
- `includeConfidence`: boolean
- `cleanupAfterProcessing`: boolean

**Response:**
```json
{
  "batchId": "batch_1234567890",
  "status": "queued",
  "totalFiles": 2,
  "startedAt": "2024-01-19T15:30:00Z"
}
```

### Progress Tracking

#### GET /api/transcribe/job/:id/progress
Get job progress

**Response:**
```json
{
  "jobId": "job_9876543210",
  "status": "processing",
  "progress": 45.5,
  "currentChunk": 5,
  "totalChunks": 10,
  "timeElapsed": 30,
  "timeRemaining": 35,
  "processingSpeed": 1.5,
  "currentText": "This is the current transcription segment...",
  "confidence": 0.94
}
```

**Status Values:**
- `queued` - Job is waiting to start
- `processing` - Job is actively being processed
- `completed` - Job finished successfully
- `failed` - Job encountered an error
- `cancelled` - Job was cancelled by user

#### POST /api/transcribe/job/:id/cancel
Cancel an active job

**Response:**
```json
{
  "message": "Job cancelled successfully",
  "jobId": "job_9876543210"
}
```

### Configuration

#### GET /api/config/current
Get current configuration

**Response:**
```json
{
  "output": {
    "format": "json",
    "includeTimestamps": true,
    "includeConfidence": true,
    "outputDirectory": "/Users/Desktop/VoxFlow Output"
  },
  "processing": {
    "maxConcurrentJobs": 3,
    "chunkSize": 30,
    "cleanupAfterProcessing": true
  }
}
```

#### GET /api/config/cleanup/stats
Get cleanup statistics

**Response:**
```json
{
  "filesDeleted": 150,
  "spaceReclaimed": 1073741824,
  "lastCleanup": "2024-01-19T14:00:00Z",
  "nextCleanup": "2024-01-19T16:00:00Z"
}
```

## WebSocket API (Socket.IO)

### Connection

```javascript
const socket = io('http://localhost:3000', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});
```

### Client → Server Events

#### transcription:start
Start a streaming transcription session

```javascript
socket.emit('transcription:start', {
  sessionId: "session_123",
  config: {
    language: "en",
    format: "json",
    includeTimestamps: true,
    includeConfidence: true
  }
});
```

#### audio:chunk
Send audio chunk for processing

```javascript
socket.emit('audio:chunk', {
  chunk: "base64_encoded_audio_data",
  format: "webm",
  sampleRate: 16000,
  channels: 1,
  sessionId: "session_123"
});
```

#### job:subscribe
Subscribe to job progress updates

```javascript
socket.emit('job:subscribe', {
  jobId: "job_9876543210"
});
```

#### job:unsubscribe
Unsubscribe from job updates

```javascript
socket.emit('job:unsubscribe', {
  jobId: "job_9876543210"
});
```

### Server → Client Events

#### connection:confirmed
Sent when connection is established

```javascript
socket.on('connection:confirmed', (data) => {
  console.log('Connected:', data.message);
});
```

#### job:progress
Real-time job progress updates

```javascript
socket.on('job:progress', (data) => {
  console.log(`Progress: ${data.progress}%`);
  // data: {
  //   jobId: string,
  //   status: string,
  //   progress: number,
  //   currentChunk: number,
  //   totalChunks: number,
  //   timeElapsed: number,
  //   timeRemaining: number
  // }
});
```

#### transcription:result
Transcription results (partial or final)

```javascript
socket.on('transcription:result', (data) => {
  console.log('Result:', data.text);
  // data: {
  //   sessionId: string,
  //   text: string,
  //   segments: Array<{
  //     text: string,
  //     start: number,
  //     end: number,
  //     confidence: number
  //   }>,
  //   isFinal: boolean
  // }
});
```

#### error
Error notifications

```javascript
socket.on('error', (data) => {
  console.error('Error:', data.message);
  // data: {
  //   message: string,
  //   code: string,
  //   details: any
  // }
});
```

## Python Service API (Port 8000)

### Health Endpoints

#### GET /health/detailed
```json
{
  "status": "healthy",
  "timestamp": "2024-01-19T15:30:00Z",
  "uptime": 3600,
  "model": {
    "loaded": true,
    "name": "mistralai/Voxtral-Mini-3B-2507",
    "device": "mps",
    "memoryUsage": 3072
  },
  "system": {
    "cpuPercent": 45.2,
    "memoryUsed": 8192,
    "memoryTotal": 16384,
    "diskUsed": 102400,
    "diskTotal": 512000
  }
}
```

### Model Management

#### GET /models/status
```json
{
  "loaded": true,
  "modelName": "mistralai/Voxtral-Mini-3B-2507",
  "device": "mps",
  "precision": "float16",
  "memoryUsage": 3072,
  "loadTime": 5.2
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "details": {}
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| FILE_TOO_LARGE | 413 | File exceeds 500MB limit |
| INVALID_FILE_TYPE | 400 | Unsupported audio format |
| FILE_NOT_FOUND | 404 | File ID not found |
| TRANSCRIPTION_FAILED | 500 | Processing error |
| JOB_NOT_FOUND | 404 | Job ID not found |
| BATCH_LIMIT_EXCEEDED | 400 | More than 50 files in batch |
| INVALID_CONFIGURATION | 400 | Invalid config parameters |
| SERVICE_UNAVAILABLE | 503 | Python service unreachable |

## Rate Limits

- File uploads: 10 files per request
- Batch processing: 50 files per batch
- WebSocket connections: 100 concurrent per IP
- API requests: 100 per minute per IP

## File Requirements

### Supported Audio Formats
- MP3 (`.mp3`) - audio/mpeg
- WAV (`.wav`) - audio/wav, audio/x-wav
- M4A (`.m4a`) - audio/mp4
- WebM (`.webm`) - audio/webm
- OGG (`.ogg`) - audio/ogg
- FLAC (`.flac`) - audio/flac

### Limitations
- Maximum file size: 500MB
- Maximum duration: 30 minutes (configurable)
- Sample rate: Up to 48kHz (resampled to 16kHz)
- Channels: Mono or stereo (converted to mono)

## Output Formats

### JSON Format
```json
{
  "text": "Full transcription text",
  "segments": [
    {
      "text": "Segment text",
      "start": 0.0,
      "end": 5.2,
      "confidence": 0.95
    }
  ],
  "metadata": {
    "duration": 180.5,
    "language": "en",
    "modelName": "mistralai/Voxtral-Mini-3B-2507"
  }
}
```

### TXT Format
Plain text transcription without timestamps

### SRT Format
```
1
00:00:00,000 --> 00:00:05,200
Segment text with subtitle formatting

2
00:00:05,200 --> 00:00:10,500
Next segment text
```

### VTT Format
```
WEBVTT

00:00:00.000 --> 00:00:05.200
Segment text with WebVTT formatting

00:00:05.200 --> 00:00:10.500
Next segment text
```

## Integration Examples

### JavaScript/TypeScript
```typescript
import axios from 'axios';
import { io } from 'socket.io-client';

// REST API
const api = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 30000
});

// Upload file
const formData = new FormData();
formData.append('files', audioFile);

const { data } = await api.post('/api/files/upload', formData);
const fileId = data.files[0].fileId;

// Start transcription
const job = await api.post('/api/transcribe/file', { fileId });

// WebSocket monitoring
const socket = io('http://localhost:3000');
socket.emit('job:subscribe', { jobId: job.data.jobId });

socket.on('job:progress', (progress) => {
  console.log(`Progress: ${progress.progress}%`);
});
```

### Python
```python
import requests
import socketio

# REST API
BASE_URL = "http://localhost:3000"

# Upload file
with open("audio.mp3", "rb") as f:
    files = {"files": f}
    response = requests.post(f"{BASE_URL}/api/files/upload", files=files)
    file_id = response.json()["files"][0]["fileId"]

# Start transcription
job = requests.post(
    f"{BASE_URL}/api/transcribe/file",
    json={"fileId": file_id}
).json()

# WebSocket monitoring
sio = socketio.Client()
sio.connect(BASE_URL)

@sio.on('job:progress')
def on_progress(data):
    print(f"Progress: {data['progress']}%")

sio.emit('job:subscribe', {'jobId': job['jobId']})
```
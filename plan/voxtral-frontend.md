# 🎯 Frontend - Voxtral Web Application

## Tech Stack

### Core
- **React 18.3** mit TypeScript 5.3+
- **Vite 5.0** als Build Tool
- **pnpm** für Package Management

### UI & Styling
- **TailwindCSS 3.4** für Utility-First Styling
- **Framer Motion** für Animationen
- **Radix UI** für accessible Components
- **Lucide React** für Icons

### Audio & Visualization
- **WaveSurfer.js 7.0** für Waveform Display
- **Web Audio API** für Recording
- **Tone.js** für Audio Effects (optional)

### State & Communication
- **Zustand** für State Management
- **Socket.io-client** für Real-time Updates
- **TanStack Query** für Server State
- **Axios** für HTTP Requests

## Projekt-Struktur

```
frontend/
├── src/
│   ├── components/
│   │   ├── audio/
│   │   │   ├── Recorder.tsx
│   │   │   ├── WaveformDisplay.tsx
│   │   │   └── AudioControls.tsx
│   │   ├── transcription/
│   │   │   ├── TranscriptionView.tsx
│   │   │   ├── LiveTranscript.tsx
│   │   │   └── TranscriptEditor.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Toast.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── Footer.tsx
│   ├── hooks/
│   │   ├── useAudioRecorder.ts
│   │   ├── useTranscription.ts
│   │   ├── useWebSocket.ts
│   │   └── useKeyboardShortcuts.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── audio.service.ts
│   │   ├── transcription.service.ts
│   │   └── websocket.service.ts
│   ├── stores/
│   │   ├── transcriptionStore.ts
│   │   ├── audioStore.ts
│   │   └── uiStore.ts
│   ├── types/
│   │   ├── audio.types.ts
│   │   ├── transcription.types.ts
│   │   └── api.types.ts
│   ├── utils/
│   │   ├── audio.utils.ts
│   │   ├── format.utils.ts
│   │   └── export.utils.ts
│   ├── styles/
│   │   ├── globals.css
│   │   └── themes/
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Key Features Implementation

### 1. Audio Recording Module
```typescript
// Kern-Funktionalität für Audio-Aufnahme
interface AudioRecorderConfig {
  sampleRate: 48000;
  channels: 1;
  mimeType: 'audio/webm;codecs=opus';
  audioBitsPerSecond: 128000;
}
```

### 2. Real-time Streaming
- **MediaRecorder API** für Browser-Recording
- **Chunked Upload** alle 1-2 Sekunden
- **WebSocket** für bidirektionale Kommunikation
- **Backpressure Handling** für stabile Streams

### 3. Transcription Display
- **Streaming Updates** während der Aufnahme
- **Word-level Timestamps** (wenn verfügbar)
- **Confidence Highlighting** 
- **Edit Mode** mit Diff-Tracking

### 4. File Upload System
- **Drag & Drop** mit visueller Feedback
- **Format Support**: MP3, WAV, M4A, WEBM, OGG
- **Progress Tracking** mit Abort-Option
- **Batch Processing** für mehrere Dateien

## Performance Optimizations

### 1. Code Splitting
```typescript
// Lazy Loading für große Components
const TranscriptionEditor = lazy(() => import('./components/TranscriptionEditor'));
const AudioVisualizer = lazy(() => import('./components/AudioVisualizer'));
```

### 2. Memoization Strategy
- React.memo für pure Components
- useMemo für expensive Calculations
- useCallback für Event Handlers

### 3. Web Workers
- Audio Processing in Worker Thread
- Waveform Generation off Main Thread
- Export Processing im Background

### 4. Virtualization
- Virtual Scrolling für lange Transcripts
- Windowing für Performance

## Build & Development

### Development Setup
```bash
# Installation
pnpm install

# Development Server
pnpm dev

# Type Checking
pnpm type-check

# Linting
pnpm lint

# Production Build
pnpm build
```

### Environment Variables
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_MAX_FILE_SIZE=500MB
VITE_CHUNK_SIZE=32KB
```

## Browser Requirements
- Chrome 90+ / Safari 15+ / Firefox 90+
- WebRTC Support
- Web Audio API
- MediaRecorder API

## Security Considerations
- CORS Configuration
- CSP Headers
- Input Sanitization
- XSS Prevention
- Rate Limiting auf Client-Seite

## Testing Strategy
- Vitest für Unit Tests
- React Testing Library
- Playwright für E2E Tests
- MSW für API Mocking

## Deployment
- Static Hosting (Vercel/Netlify)
- CDN für Assets
- Service Worker für Offline Support
- PWA Manifest
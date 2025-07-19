# 📁 VoxFlow Project Structure

This document provides a comprehensive overview of the VoxFlow project structure, helping developers understand the codebase organization and find relevant files quickly.

## 🌳 Root Directory Structure

```
voxflow_trans/
├── 📄 README.md                    # Main project documentation
├── 📄 CONTRIBUTING.md              # Contribution guidelines
├── 📄 LICENSE                      # MIT License
├── 📄 CLAUDE.md                    # Claude Code guidance
├── 📄 CHANGELOG.md                 # Version history
├── 📄 .gitignore                   # Git ignore rules
├── 📄 docker-compose.yml           # Docker orchestration
├── 📄 ecosystem.config.js          # PM2 configuration
├── 📁 backend/                     # Backend services
├── 📁 frontend/                    # React frontend
├── 📁 docs/                        # Additional documentation
├── 📁 .github/                     # GitHub templates and workflows
└── 📁 scripts/                     # Utility scripts
```

## 🔧 Backend Services

### Node.js API Gateway (`backend/node-service/`)

```
backend/node-service/
├── 📄 package.json                 # Dependencies and scripts
├── 📄 tsconfig.json               # TypeScript configuration
├── 📄 .env.example                # Environment variables template
├── 📄 jest.config.js              # Test configuration
├── 📄 ecosystem.config.js         # PM2 process configuration
├── 📁 src/
│   ├── 📄 app.ts                  # Express application setup
│   ├── 📄 server.ts               # Server entry point
│   ├── 📁 controllers/            # Route handlers
│   │   ├── 📄 audio.controller.ts        # Audio upload/processing
│   │   ├── 📄 transcription.controller.ts # Transcription management
│   │   ├── 📄 export.controller.ts       # Export functionality
│   │   ├── 📄 health.controller.ts       # Health checks
│   │   └── 📄 websocket.controller.ts    # WebSocket handlers
│   ├── 📁 middleware/             # Express middleware
│   │   ├── 📄 auth.middleware.ts         # Authentication
│   │   ├── 📄 cors.middleware.ts         # CORS configuration
│   │   ├── 📄 error.middleware.ts        # Error handling
│   │   ├── 📄 validation.middleware.ts   # Request validation
│   │   ├── 📄 rate-limit.middleware.ts   # Rate limiting
│   │   └── 📄 logging.middleware.ts      # Request logging
│   ├── 📁 services/               # Business logic
│   │   ├── 📄 audio.service.ts           # Audio processing
│   │   ├── 📄 transcription.service.ts   # Transcription logic
│   │   ├── 📄 queue.service.ts           # Job queue management
│   │   ├── 📄 storage.service.ts         # File storage
│   │   ├── 📄 cache.service.ts           # Redis caching
│   │   ├── 📄 notification.service.ts    # WebSocket notifications
│   │   └── 📄 python-client.service.ts   # Python service client
│   ├── 📁 models/                 # Data models
│   │   ├── 📄 transcription.model.ts     # Transcription entity
│   │   ├── 📄 audio.model.ts             # Audio file entity
│   │   ├── 📄 user.model.ts              # User entity
│   │   └── 📄 job.model.ts               # Job queue entity
│   ├── 📁 database/               # Database configuration
│   │   ├── 📄 connection.ts              # Database connection
│   │   ├── 📄 migrations/                # Database migrations
│   │   └── 📄 seeds/                     # Test data seeds
│   ├── 📁 sockets/                # WebSocket handling
│   │   ├── 📄 connection.manager.ts      # Connection management
│   │   ├── 📄 transcription.socket.ts    # Transcription events
│   │   ├── 📄 audio.socket.ts            # Audio streaming
│   │   └── 📄 namespace.handlers.ts      # Socket namespaces
│   ├── 📁 utils/                  # Utility functions
│   │   ├── 📄 logger.ts                  # Logging utilities
│   │   ├── 📄 validation.ts              # Validation helpers
│   │   ├── 📄 file.utils.ts              # File manipulation
│   │   ├── 📄 date.utils.ts              # Date formatting
│   │   └── 📄 crypto.utils.ts            # Encryption utilities
│   ├── 📁 types/                  # TypeScript type definitions
│   │   ├── 📄 api.types.ts               # API interfaces
│   │   ├── 📄 socket.types.ts            # WebSocket types
│   │   ├── 📄 queue.types.ts             # Job queue types
│   │   └── 📄 common.types.ts            # Shared types
│   ├── 📁 config/                 # Configuration
│   │   ├── 📄 database.config.ts         # Database settings
│   │   ├── 📄 redis.config.ts            # Redis settings
│   │   ├── 📄 cors.config.ts             # CORS settings
│   │   └── 📄 app.config.ts              # Application settings
│   └── 📁 routes/                 # Route definitions
│       ├── 📄 index.ts                   # Main router
│       ├── 📄 api.routes.ts              # API routes
│       ├── 📄 auth.routes.ts             # Authentication routes
│       └── 📄 health.routes.ts           # Health check routes
├── 📁 tests/                      # Test files
│   ├── 📁 unit/                          # Unit tests
│   ├── 📁 integration/                   # Integration tests
│   ├── 📁 fixtures/                      # Test data
│   └── 📄 setup.ts                       # Test setup
└── 📁 dist/                       # Compiled JavaScript
```

### Python Voxtral Service (`backend/python-service/`)

```
backend/python-service/
├── 📄 requirements.txt            # Python dependencies
├── 📄 requirements-dev.txt        # Development dependencies
├── 📄 pyproject.toml             # Python project configuration
├── 📄 .env.example               # Environment variables template
├── 📄 Dockerfile                 # Docker container definition
├── 📄 gunicorn.conf.py          # Gunicorn configuration
├── 📁 app/
│   ├── 📄 main.py                       # FastAPI application entry
│   ├── 📄 __init__.py
│   ├── 📁 api/                          # API endpoints
│   │   ├── 📄 __init__.py
│   │   ├── 📄 dependencies.py          # Dependency injection
│   │   └── 📁 endpoints/
│   │       ├── 📄 __init__.py
│   │       ├── 📄 transcribe.py        # Transcription endpoints
│   │       ├── 📄 health.py            # Health check endpoints
│   │       ├── 📄 models.py            # Model management endpoints
│   │       └── 📄 streaming.py         # Streaming endpoints
│   ├── 📁 core/                         # Core functionality
│   │   ├── 📄 __init__.py
│   │   ├── 📄 config.py                # Application configuration
│   │   ├── 📄 voxtral_engine.py        # Voxtral model engine
│   │   ├── 📄 audio_processor.py       # Audio processing pipeline
│   │   ├── 📄 model_manager.py         # Model loading/caching
│   │   └── 📄 exceptions.py            # Custom exceptions
│   ├── 📁 services/                     # Business logic services
│   │   ├── 📄 __init__.py
│   │   ├── 📄 voxtral_service.py       # Main transcription service
│   │   ├── 📄 streaming_service.py     # Real-time streaming
│   │   ├── 📄 preprocessing.py         # Audio preprocessing
│   │   ├── 📄 postprocessing.py        # Result postprocessing
│   │   ├── 📄 batch_service.py         # Batch processing
│   │   └── 📄 cache_service.py         # Caching service
│   ├── 📁 models/                       # Data models
│   │   ├── 📄 __init__.py
│   │   ├── 📄 transcription.py         # Transcription models
│   │   ├── 📄 audio.py                 # Audio models
│   │   ├── 📄 streaming.py             # Streaming models
│   │   └── 📄 config.py                # Configuration models
│   ├── 📁 utils/                        # Utility modules
│   │   ├── 📄 __init__.py
│   │   ├── 📄 audio_utils.py           # Audio manipulation
│   │   ├── 📄 file_utils.py            # File operations
│   │   ├── 📄 logging.py               # Logging configuration
│   │   ├── 📄 validation.py            # Input validation
│   │   └── 📄 performance.py           # Performance monitoring
│   └── 📁 ml/                           # Machine learning modules
│       ├── 📄 __init__.py
│       ├── 📄 model_loader.py          # Model loading utilities
│       ├── 📄 inference.py             # Inference pipeline
│       ├── 📄 optimization.py          # Model optimization
│       └── 📄 metrics.py               # Performance metrics
├── 📁 tests/                      # Test files
│   ├── 📄 __init__.py
│   ├── 📁 unit/                         # Unit tests
│   ├── 📁 integration/                  # Integration tests
│   ├── 📁 fixtures/                     # Test fixtures
│   └── 📄 conftest.py                   # Pytest configuration
├── 📁 scripts/                    # Utility scripts
│   ├── 📄 download_models.py           # Model download script
│   ├── 📄 benchmark.py                 # Performance benchmarking
│   └── 📄 setup_dev.py                 # Development setup
└── 📁 data/                       # Data directory
    ├── 📁 models/                       # Model cache
    ├── 📁 temp/                         # Temporary files
    └── 📁 logs/                         # Log files
```

## 🎨 Frontend Application (`frontend/`)

```
frontend/
├── 📄 package.json                # Dependencies and scripts
├── 📄 tsconfig.json              # TypeScript configuration
├── 📄 vite.config.ts             # Vite build configuration
├── 📄 tailwind.config.js         # TailwindCSS configuration
├── 📄 postcss.config.js          # PostCSS configuration
├── 📄 .env.example               # Environment variables template
├── 📄 vitest.config.ts           # Test configuration
├── 📄 playwright.config.ts       # E2E test configuration
├── 📄 index.html                 # HTML entry point
├── 📁 public/                    # Static assets
│   ├── 📄 vite.svg                      # Vite logo
│   ├── 📄 favicon.ico                   # Favicon
│   ├── 📄 manifest.json                 # PWA manifest
│   └── 📁 icons/                        # App icons
├── 📁 src/
│   ├── 📄 main.tsx                      # Application entry point
│   ├── 📄 App.tsx                       # Root component
│   ├── 📄 vite-env.d.ts                 # Vite type definitions
│   ├── 📁 components/                   # React components
│   │   ├── 📁 ui/                       # Base UI components
│   │   │   ├── 📄 Button.tsx
│   │   │   ├── 📄 Card.tsx
│   │   │   ├── 📄 Modal.tsx
│   │   │   ├── 📄 Toast.tsx
│   │   │   ├── 📄 Input.tsx
│   │   │   ├── 📄 Dropdown.tsx
│   │   │   ├── 📄 Progress.tsx
│   │   │   └── 📄 Tooltip.tsx
│   │   ├── 📁 audio/                    # Audio-related components
│   │   │   ├── 📄 Recorder.tsx
│   │   │   ├── 📄 WaveformDisplay.tsx
│   │   │   ├── 📄 AudioControls.tsx
│   │   │   ├── 📄 AudioUpload.tsx
│   │   │   ├── 📄 VolumeVisualizer.tsx
│   │   │   └── 📄 AudioPlayer.tsx
│   │   ├── 📁 transcription/            # Transcription components
│   │   │   ├── 📄 TranscriptionView.tsx
│   │   │   ├── 📄 LiveTranscript.tsx
│   │   │   ├── 📄 TranscriptEditor.tsx
│   │   │   ├── 📄 TranscriptSearch.tsx
│   │   │   ├── 📄 SpeakerLabels.tsx
│   │   │   └── 📄 TimestampView.tsx
│   │   ├── 📁 export/                   # Export functionality
│   │   │   ├── 📄 ExportModal.tsx
│   │   │   ├── 📄 FormatSelector.tsx
│   │   │   ├── 📄 ExportProgress.tsx
│   │   │   └── 📄 ShareOptions.tsx
│   │   ├── 📁 layout/                   # Layout components
│   │   │   ├── 📄 Header.tsx
│   │   │   ├── 📄 Sidebar.tsx
│   │   │   ├── 📄 Footer.tsx
│   │   │   ├── 📄 Navigation.tsx
│   │   │   └── 📄 PageLayout.tsx
│   │   └── 📁 common/                   # Common components
│   │       ├── 📄 Loading.tsx
│   │       ├── 📄 ErrorBoundary.tsx
│   │       ├── 📄 NotFound.tsx
│   │       ├── 📄 ThemeToggle.tsx
│   │       └── 📄 KeyboardShortcuts.tsx
│   ├── 📁 pages/                        # Page components
│   │   ├── 📄 Home.tsx
│   │   ├── 📄 Recording.tsx
│   │   ├── 📄 Transcriptions.tsx
│   │   ├── 📄 Settings.tsx
│   │   └── 📄 About.tsx
│   ├── 📁 hooks/                        # Custom React hooks
│   │   ├── 📄 useAudioRecorder.ts
│   │   ├── 📄 useTranscription.ts
│   │   ├── 📄 useWebSocket.ts
│   │   ├── 📄 useKeyboardShortcuts.ts
│   │   ├── 📄 useLocalStorage.ts
│   │   ├── 📄 useTheme.ts
│   │   └── 📄 useFileUpload.ts
│   ├── 📁 services/                     # API and service clients
│   │   ├── 📄 api.ts                    # Base API client
│   │   ├── 📄 audio.service.ts          # Audio service
│   │   ├── 📄 transcription.service.ts  # Transcription service
│   │   ├── 📄 websocket.service.ts      # WebSocket service
│   │   ├── 📄 export.service.ts         # Export service
│   │   └── 📄 storage.service.ts        # Local storage service
│   ├── 📁 stores/                       # State management
│   │   ├── 📄 transcriptionStore.ts     # Transcription state
│   │   ├── 📄 audioStore.ts             # Audio state
│   │   ├── 📄 uiStore.ts                # UI state
│   │   ├── 📄 settingsStore.ts          # Settings state
│   │   └── 📄 notificationStore.ts      # Notification state
│   ├── 📁 types/                        # TypeScript types
│   │   ├── 📄 audio.types.ts            # Audio-related types
│   │   ├── 📄 transcription.types.ts    # Transcription types
│   │   ├── 📄 api.types.ts              # API response types
│   │   ├── 📄 ui.types.ts               # UI component types
│   │   └── 📄 common.types.ts           # Shared types
│   ├── 📁 utils/                        # Utility functions
│   │   ├── 📄 audio.utils.ts            # Audio processing utilities
│   │   ├── 📄 format.utils.ts           # Formatting utilities
│   │   ├── 📄 export.utils.ts           # Export utilities
│   │   ├── 📄 validation.utils.ts       # Validation helpers
│   │   ├── 📄 date.utils.ts             # Date formatting
│   │   └── 📄 string.utils.ts           # String manipulation
│   ├── 📁 styles/                       # Styling files
│   │   ├── 📄 globals.css               # Global styles
│   │   ├── 📄 components.css            # Component styles
│   │   └── 📁 themes/                   # Theme definitions
│   │       ├── 📄 light.css
│   │       ├── 📄 dark.css
│   │       └── 📄 variables.css
│   └── 📁 assets/                       # Static assets
│       ├── 📁 icons/                    # SVG icons
│       ├── 📁 images/                   # Images
│       └── 📁 audio/                    # Audio samples
├── 📁 tests/                      # Test files
│   ├── 📁 unit/                         # Unit tests
│   ├── 📁 integration/                  # Integration tests
│   ├── 📁 e2e/                          # End-to-end tests
│   ├── 📁 mocks/                        # Test mocks
│   └── 📄 setup.ts                      # Test setup
└── 📁 dist/                       # Production build
```

## 📚 Documentation (`docs/`)

```
docs/
├── 📄 PROJECT_STRUCTURE.md        # This file
├── 📄 API_REFERENCE.md           # API documentation
├── 📄 DEPLOYMENT.md              # Deployment guide
├── 📄 DEVELOPMENT.md             # Development setup
├── 📄 TROUBLESHOOTING.md         # Common issues
├── 📄 PERFORMANCE.md             # Performance optimization
├── 📄 SECURITY.md                # Security considerations
├── 📁 assets/                    # Documentation assets
├── 📁 diagrams/                  # Architecture diagrams
└── 📁 examples/                  # Code examples
```

## ⚙️ Configuration Files

### Root Level Configuration
- **docker-compose.yml** - Multi-container Docker setup
- **ecosystem.config.js** - PM2 process manager configuration
- **.gitignore** - Git ignore patterns for all services

### Backend Configuration
- **tsconfig.json** - TypeScript compiler options
- **jest.config.js** - Testing framework configuration
- **package.json** - Node.js dependencies and scripts
- **requirements.txt** - Python dependencies
- **pyproject.toml** - Python project metadata

### Frontend Configuration
- **vite.config.ts** - Build tool configuration
- **tailwind.config.js** - CSS framework configuration
- **vitest.config.ts** - Unit testing configuration
- **playwright.config.ts** - E2E testing configuration

## 🚀 Build Artifacts

### Development
- **node_modules/** - Node.js dependencies
- **venv/** - Python virtual environment
- **.cache/** - Build caches
- **temp/** - Temporary files

### Production
- **dist/** - Frontend production build
- **build/** - Backend compiled output
- **logs/** - Application logs
- **data/** - Persistent data

## 🔍 Key File Locations

### Entry Points
- Frontend: `frontend/src/main.tsx`
- Node.js API: `backend/node-service/src/server.ts`
- Python Service: `backend/python-service/app/main.py`

### Configuration
- Environment: `.env` files in each service
- Database: `backend/node-service/src/config/database.config.ts`
- API Routes: `backend/node-service/src/routes/`
- WebSocket: `backend/node-service/src/sockets/`

### Core Business Logic
- Transcription: `backend/python-service/app/core/voxtral_engine.py`
- Audio Processing: `backend/python-service/app/core/audio_processor.py`
- Real-time Streaming: `backend/node-service/src/services/queue.service.ts`

### UI Components
- Base Components: `frontend/src/components/ui/`
- Feature Components: `frontend/src/components/{audio,transcription}/`
- Pages: `frontend/src/pages/`

## 🛠️ Development Workflow

### Adding New Features
1. **Backend API**: Add endpoint in `controllers/`, business logic in `services/`
2. **Python Service**: Add endpoints in `api/endpoints/`, logic in `services/`
3. **Frontend**: Add components in `components/`, pages in `pages/`, state in `stores/`

### Common File Patterns
- **Controllers**: Handle HTTP requests, delegate to services
- **Services**: Contain business logic, interact with external services
- **Models**: Define data structures and validation
- **Utils**: Shared utility functions
- **Types**: TypeScript type definitions

This structure provides clear separation of concerns, making the codebase maintainable and easy to navigate for new contributors.
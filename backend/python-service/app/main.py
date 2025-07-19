"""
VoxFlow Python Service - Main FastAPI Application
Handles Voxtral model loading, audio processing, and transcription.
"""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from loguru import logger

from app.core.config import settings
from app.core.voxtral_engine import VoxtralEngine
from app.api.endpoints import health, transcribe, models, streaming, config
from app.utils.logging import setup_logging

# Global engine instance
voxtral_engine: VoxtralEngine = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    global voxtral_engine
    
    # Startup
    logger.info("🚀 Starting VoxFlow Python Service")
    setup_logging()
    
    try:
        # Initialize Voxtral engine
        logger.info("Loading Voxtral model...")
        voxtral_engine = VoxtralEngine(settings)
        await voxtral_engine.initialize()
        logger.info("✅ Voxtral model loaded successfully")
        
        # Store engine in app state
        app.state.voxtral_engine = voxtral_engine
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize Voxtral engine: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down VoxFlow Python Service")
    if voxtral_engine:
        await voxtral_engine.cleanup()


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    
    app = FastAPI(
        title="VoxFlow Python Service",
        description="High-performance voice transcription service powered by Mistral Voxtral",
        version="1.0.0",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Routes
    app.include_router(health.router, prefix="/health", tags=["health"])
    app.include_router(transcribe.router, prefix="/transcribe", tags=["transcription"])
    app.include_router(models.router, prefix="/models", tags=["models"])
    app.include_router(streaming.router, prefix="/stream", tags=["streaming"])
    app.include_router(config.router, prefix="/config", tags=["configuration"])

    # Root endpoint
    @app.get("/")
    async def root():
        return {
            "service": "VoxFlow Python Service",
            "version": "1.0.0",
            "status": "running",
            "model": settings.MODEL_NAME,
            "device": settings.DEVICE,
            "docs": "/docs" if settings.DEBUG else "disabled",
        }

    @app.get("/info")
    async def info():
        """Get service information and capabilities."""
        engine = app.state.voxtral_engine
        return {
            "service": "VoxFlow Python Service",
            "version": "1.0.0",
            "model": {
                "name": settings.MODEL_NAME,
                "loaded": engine.is_loaded if engine else False,
                "device": settings.DEVICE,
                "precision": settings.PRECISION,
            },
            "capabilities": {
                "max_audio_length": settings.MAX_AUDIO_LENGTH,
                "chunk_size": settings.CHUNK_SIZE,
                "sample_rate": settings.SAMPLE_RATE,
                "streaming": True,
                "batch_processing": True,
            },
            "limits": {
                "max_file_size": settings.MAX_FILE_SIZE,
                "max_concurrent": settings.MAX_CONCURRENT_REQUESTS,
            },
        }

    return app


# Create the app instance
app = create_app()

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=1,  # Single worker for model consistency
        log_level=settings.LOG_LEVEL.lower(),
    )
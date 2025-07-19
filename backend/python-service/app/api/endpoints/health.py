"""
Health check endpoints for monitoring service status.
"""

from fastapi import APIRouter, Request
from loguru import logger
import psutil
import time
from typing import Dict, Any

from app.core.config import settings

router = APIRouter()


@router.get("/")
async def health_check() -> Dict[str, Any]:
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "service": "voxflow-python-service",
        "version": "1.0.0",
    }


@router.get("/detailed")
async def detailed_health_check(request: Request) -> Dict[str, Any]:
    """Detailed health check with system metrics and model status."""
    
    # Get Voxtral engine from app state
    engine = getattr(request.app.state, 'voxtral_engine', None)
    
    # System metrics
    cpu_percent = psutil.cpu_percent()
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    # Model status
    model_status = {
        "loaded": engine.is_loaded if engine else False,
        "model_name": settings.MODEL_NAME,
        "device": settings.DEVICE,
        "precision": settings.PRECISION,
    }
    
    if engine and engine.is_loaded:
        model_status.update({
            "load_time": getattr(engine, 'load_time', None),
            "total_inferences": getattr(engine, 'total_inferences', 0),
        })
    
    # Service status
    status = "healthy"
    if cpu_percent > 90:
        status = "degraded"
    elif memory.percent > 90:
        status = "degraded"
    elif not (engine and engine.is_loaded):
        status = "unhealthy"
    
    return {
        "status": status,
        "timestamp": time.time(),
        "service": "voxflow-python-service",
        "version": "1.0.0",
        "system": {
            "cpu_percent": cpu_percent,
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "percent": memory.percent,
                "used": memory.used,
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": (disk.used / disk.total) * 100,
            },
        },
        "model": model_status,
        "config": {
            "max_audio_length": settings.MAX_AUDIO_LENGTH,
            "chunk_size": settings.CHUNK_SIZE,
            "sample_rate": settings.SAMPLE_RATE,
            "max_concurrent": settings.MAX_CONCURRENT_REQUESTS,
        },
    }


@router.get("/ready")
async def readiness_check(request: Request) -> Dict[str, Any]:
    """Readiness check to determine if service can accept requests."""
    
    engine = getattr(request.app.state, 'voxtral_engine', None)
    
    if not engine or not engine.is_loaded:
        return {
            "ready": False,
            "reason": "Model not loaded",
            "timestamp": time.time(),
        }
    
    return {
        "ready": True,
        "timestamp": time.time(),
        "model": settings.MODEL_NAME,
    }


@router.get("/live")
async def liveness_check() -> Dict[str, Any]:
    """Liveness check to determine if service is alive."""
    return {
        "alive": True,
        "timestamp": time.time(),
    }
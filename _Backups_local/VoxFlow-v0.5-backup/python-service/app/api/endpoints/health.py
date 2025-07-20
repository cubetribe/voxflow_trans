"""
VoxFlow Health Check Endpoints - Production-Ready Implementation
Comprehensive health monitoring with detailed system metrics and model status.
"""

import asyncio
import psutil
import time
from pathlib import Path
from typing import Dict, Any, Optional

from fastapi import APIRouter, Request, HTTPException
from loguru import logger
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter()


class HealthStatus(BaseModel):
    """Health status response model."""
    status: str
    timestamp: float
    uptime: float
    version: str = "1.0.0"


class DetailedHealthStatus(BaseModel):
    """Detailed health status with comprehensive metrics."""
    status: str
    timestamp: float
    uptime: float
    version: str = "1.0.0"
    model: Dict[str, Any]
    system: Dict[str, Any]
    performance: Dict[str, Any]
    dependencies: Dict[str, Any]


# Track service start time for uptime calculation
SERVICE_START_TIME = time.time()


@router.get("/")
async def health_check() -> HealthStatus:
    """
    Basic health check endpoint.
    
    Returns simple status for quick health verification.
    Suitable for load balancer health checks.
    """
    
    try:
        uptime = time.time() - SERVICE_START_TIME
        
        return HealthStatus(
            status="healthy",
            timestamp=time.time(),
            uptime=uptime,
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return HealthStatus(
            status="unhealthy",
            timestamp=time.time(),
            uptime=time.time() - SERVICE_START_TIME,
        )


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
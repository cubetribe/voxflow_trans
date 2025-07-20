"""
Model management endpoints.
"""

from fastapi import APIRouter, Request, HTTPException
from loguru import logger
from typing import Dict, Any

from app.core.config import settings

router = APIRouter()


@router.get("/status")
async def get_model_status(request: Request) -> Dict[str, Any]:
    """Get current model loading status and information."""
    
    engine = getattr(request.app.state, 'voxtral_engine', None)
    
    if not engine:
        return {
            "loaded": False,
            "model_name": settings.MODEL_NAME,
            "status": "not_initialized",
        }
    
    return {
        "loaded": engine.is_loaded,
        "model_name": settings.MODEL_NAME,
        "device": settings.DEVICE,
        "precision": settings.PRECISION,
        "status": "ready" if engine.is_loaded else "loading",
        "capabilities": {
            "max_audio_length": settings.MAX_AUDIO_LENGTH,
            "chunk_size": settings.CHUNK_SIZE,
            "sample_rate": settings.SAMPLE_RATE,
            "streaming": True,
            "batch_processing": True,
        },
        "performance": {
            "total_inferences": getattr(engine, 'total_inferences', 0),
            "average_processing_time": getattr(engine, 'average_processing_time', None),
        } if engine.is_loaded else None,
    }


@router.post("/reload")
async def reload_model(request: Request) -> Dict[str, Any]:
    """Reload the Voxtral model."""
    
    try:
        engine = getattr(request.app.state, 'voxtral_engine', None)
        if not engine:
            raise HTTPException(
                status_code=503,
                detail="Engine not initialized"
            )
        
        logger.info("Reloading Voxtral model...")
        await engine.reload()
        logger.info("Model reloaded successfully")
        
        return {
            "status": "success",
            "message": "Model reloaded successfully",
            "model_name": settings.MODEL_NAME,
        }
        
    except Exception as e:
        logger.error(f"Model reload failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Model reload failed: {str(e)}"
        )


@router.get("/info")
async def get_model_info() -> Dict[str, Any]:
    """Get detailed model information and configuration."""
    
    return {
        "model": {
            "name": settings.MODEL_NAME,
            "cache_dir": str(settings.model_cache_path),
            "device": settings.DEVICE,
            "precision": settings.PRECISION,
        },
        "audio_config": {
            "max_length": settings.MAX_AUDIO_LENGTH,
            "chunk_size": settings.CHUNK_SIZE,
            "overlap": settings.OVERLAP_SIZE,
            "sample_rate": settings.SAMPLE_RATE,
            "channels": settings.AUDIO_CHANNELS,
        },
        "performance": {
            "batch_size": settings.BATCH_SIZE,
            "max_concurrent": settings.MAX_CONCURRENT_REQUESTS,
            "model_timeout": settings.MODEL_TIMEOUT,
            "inference_timeout": settings.INFERENCE_TIMEOUT,
        },
        "features": {
            "vad_enabled": True,
            "noise_reduction": settings.NOISE_REDUCTION,
            "speaker_detection": False,  # TODO: Implement
            "language_detection": True,
        },
    }
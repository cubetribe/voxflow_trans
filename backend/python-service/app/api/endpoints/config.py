"""
Configuration management endpoints.
"""

from fastapi import APIRouter, HTTPException
from loguru import logger
from typing import Dict, Any

from app.models.transcription import ConfigurationUpdate, SystemStatus
from app.core.config import settings
from app.services.cleanup_service import cleanup_service

router = APIRouter()


@router.post("/output")
async def update_output_config(
    config_update: ConfigurationUpdate,
) -> Dict[str, Any]:
    """
    Update output configuration settings.
    
    Args:
        config_update: Configuration update request
        
    Returns:
        Updated configuration
    """
    
    try:
        updated_settings = {}
        
        if config_update.output_directory:
            # Validate output directory
            from pathlib import Path
            output_path = Path(config_update.output_directory)
            try:
                output_path.mkdir(parents=True, exist_ok=True)
                updated_settings["output_directory"] = str(output_path.absolute())
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid output directory: {str(e)}"
                )
        
        if config_update.default_format:
            updated_settings["default_format"] = config_update.default_format
        
        if config_update.processing_config:
            updated_settings["processing_config"] = config_update.processing_config.dict()
        
        if config_update.cleanup_settings:
            updated_settings["cleanup_settings"] = config_update.cleanup_settings
        
        logger.info(f"Updated configuration: {updated_settings}")
        
        return {
            "status": "success",
            "message": "Configuration updated successfully",
            "updated_settings": updated_settings,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Configuration update failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Configuration update failed: {str(e)}"
        )


@router.get("/current")
async def get_current_config() -> Dict[str, Any]:
    """Get current configuration settings."""
    
    try:
        # Get cleanup service stats
        cleanup_stats = await cleanup_service.get_cleanup_stats()
        
        return {
            "model": {
                "name": settings.MODEL_NAME,
                "device": settings.DEVICE,
                "precision": settings.PRECISION,
                "cache_dir": str(settings.model_cache_path),
            },
            "processing": {
                "max_audio_length": settings.MAX_AUDIO_LENGTH,
                "chunk_size": settings.CHUNK_SIZE,
                "overlap_size": settings.OVERLAP_SIZE,
                "sample_rate": settings.SAMPLE_RATE,
                "max_concurrent": settings.MAX_CONCURRENT_REQUESTS,
                "noise_reduction": settings.NOISE_REDUCTION,
                "vad_aggressiveness": settings.VAD_AGGRESSIVENESS,
            },
            "files": {
                "max_file_size": settings.MAX_FILE_SIZE,
                "temp_dir": str(settings.temp_path),
                "upload_timeout": settings.UPLOAD_TIMEOUT,
            },
            "cleanup": cleanup_stats,
            "logging": {
                "level": settings.LOG_LEVEL,
                "format": settings.LOG_FORMAT,
                "file": settings.LOG_FILE,
            },
        }
        
    except Exception as e:
        logger.error(f"Failed to get configuration: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get configuration: {str(e)}"
        )


@router.get("/system-status", response_model=SystemStatus)
async def get_system_status(request) -> SystemStatus:
    """Get comprehensive system status."""
    
    try:
        import psutil
        
        # Get engine status
        engine = getattr(request.app.state, 'voxtral_engine', None)
        
        # System resources
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Cleanup stats
        cleanup_stats = await cleanup_service.get_cleanup_stats()
        
        return SystemStatus(
            service_name="VoxFlow Python Service",
            version="1.0.0",
            status="healthy" if engine and engine.is_loaded else "degraded",
            model_loaded=engine.is_loaded if engine else False,
            active_jobs=len(engine.active_jobs) if engine else 0,
            queue_size=0,  # TODO: Implement queue size tracking
            system_resources={
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_used_gb": memory.used / (1024 ** 3),
                "memory_total_gb": memory.total / (1024 ** 3),
                "disk_free_gb": disk.free / (1024 ** 3),
                "disk_used_percent": (disk.used / disk.total) * 100,
            },
            capabilities={
                "max_audio_length_hours": settings.MAX_AUDIO_LENGTH / 3600,
                "chunk_size_minutes": settings.CHUNK_SIZE / 60,
                "max_concurrent_jobs": settings.MAX_CONCURRENT_REQUESTS,
                "supported_formats": ["mp3", "wav", "m4a", "webm", "ogg", "flac"],
                "output_formats": ["json", "txt", "srt", "vtt"],
                "features": {
                    "batch_processing": True,
                    "streaming": True,
                    "large_file_support": True,
                    "automatic_cleanup": True,
                    "progress_tracking": True,
                    "cancellation": True,
                    "noise_reduction": settings.NOISE_REDUCTION,
                    "voice_activity_detection": True,
                },
            },
            configuration={
                "model_name": settings.MODEL_NAME,
                "device": settings.DEVICE,
                "precision": settings.PRECISION,
                "temp_files": cleanup_stats.get("temp_files_count", 0),
                "temp_size_mb": cleanup_stats.get("temp_files_size_mb", 0),
            },
        )
        
    except Exception as e:
        logger.error(f"Failed to get system status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get system status: {str(e)}"
        )


@router.post("/cleanup/trigger")
async def trigger_cleanup() -> Dict[str, Any]:
    """Manually trigger cleanup of temporary files."""
    
    try:
        # Clean up old files
        old_files_cleaned = await cleanup_service.cleanup_old_files(max_age_hours=1)
        
        # Clean up inactive sessions
        inactive_cleaned = await cleanup_service.cleanup_inactive_sessions(max_idle_minutes=5)
        
        total_cleaned = old_files_cleaned + inactive_cleaned
        
        return {
            "status": "success",
            "message": "Cleanup completed",
            "files_cleaned": {
                "old_files": old_files_cleaned,
                "inactive_sessions": inactive_cleaned,
                "total": total_cleaned,
            },
        }
        
    except Exception as e:
        logger.error(f"Manual cleanup failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Manual cleanup failed: {str(e)}"
        )


@router.get("/cleanup/stats")
async def get_cleanup_stats() -> Dict[str, Any]:
    """Get cleanup service statistics."""
    
    try:
        stats = await cleanup_service.get_cleanup_stats()
        
        return {
            "status": "success",
            "cleanup_stats": stats,
        }
        
    except Exception as e:
        logger.error(f"Failed to get cleanup stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get cleanup stats: {str(e)}"
        )
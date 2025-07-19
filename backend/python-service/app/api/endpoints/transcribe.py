"""
Transcription endpoints for file-based audio processing.
"""

from fastapi import APIRouter, Request, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from loguru import logger
from typing import Optional, Dict, Any
import asyncio
import time

from app.models.transcription import (
    TranscriptionRequest, TranscriptionResponse, BatchTranscriptionRequest,
    BatchTranscriptionResponse, JobProgress, FileInfo
)
from app.core.config import settings

router = APIRouter()


@router.post("/file", response_model=TranscriptionResponse)
async def transcribe_file(
    request: Request,
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
    format: str = Form("json"),
    include_timestamps: bool = Form(True),
    include_confidence: bool = Form(True),
) -> TranscriptionResponse:
    """
    Transcribe an uploaded audio file.
    
    Args:
        file: Audio file to transcribe
        language: Target language (auto-detect if not specified)
        format: Response format (json, text, srt)
        include_timestamps: Include word-level timestamps
        include_confidence: Include confidence scores
    
    Returns:
        TranscriptionResponse with transcribed text and metadata
    """
    
    start_time = time.time()
    
    try:
        # Get Voxtral engine
        engine = getattr(request.app.state, 'voxtral_engine', None)
        if not engine or not engine.is_loaded:
            raise HTTPException(
                status_code=503,
                detail="Voxtral model not loaded"
            )
        
        # Validate file
        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="No file provided"
            )
        
        # Check file size
        content = await file.read()
        if len(content) > _parse_file_size(settings.MAX_FILE_SIZE):
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE}"
            )
        
        # Check file format
        file_ext = file.filename.split('.')[-1].lower()
        allowed_formats = ['mp3', 'wav', 'm4a', 'webm', 'ogg', 'flac']
        if file_ext not in allowed_formats:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format. Allowed: {', '.join(allowed_formats)}"
            )
        
        logger.info(f"Processing file: {file.filename}, size: {len(content)} bytes")
        
        # Create transcription request
        transcription_request = TranscriptionRequest(
            audio_data=content,
            filename=file.filename,
            language=language,
            format=format,
            include_timestamps=include_timestamps,
            include_confidence=include_confidence,
        )
        
        # Process transcription
        result = await engine.transcribe_file(transcription_request)
        
        processing_time = time.time() - start_time
        logger.info(f"Transcription completed in {processing_time:.2f}s")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )


@router.post("/url")
async def transcribe_url(
    request: Request,
    url: str,
    language: Optional[str] = None,
    format: str = "json",
    include_timestamps: bool = True,
    include_confidence: bool = True,
) -> TranscriptionResponse:
    """
    Transcribe audio from a URL.
    
    Args:
        url: URL to audio file
        language: Target language (auto-detect if not specified)
        format: Response format (json, text, srt)
        include_timestamps: Include word-level timestamps
        include_confidence: Include confidence scores
    
    Returns:
        TranscriptionResponse with transcribed text and metadata
    """
    
    try:
        # Get Voxtral engine
        engine = getattr(request.app.state, 'voxtral_engine', None)
        if not engine or not engine.is_loaded:
            raise HTTPException(
                status_code=503,
                detail="Voxtral model not loaded"
            )
        
        # Download and process audio from URL
        # TODO: Implement URL audio download and processing
        raise HTTPException(
            status_code=501,
            detail="URL transcription not yet implemented"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"URL transcription failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"URL transcription failed: {str(e)}"
        )


@router.post("/batch", response_model=Dict[str, Any])
async def transcribe_batch(
    request: Request,
    batch_request: BatchTranscriptionRequest,
) -> Dict[str, Any]:
    """
    Start batch transcription of multiple files.
    
    Returns batch job ID for progress tracking.
    """
    
    try:
        # Get Voxtral engine
        engine = getattr(request.app.state, 'voxtral_engine', None)
        if not engine or not engine.is_loaded:
            raise HTTPException(
                status_code=503,
                detail="Voxtral model not loaded"
            )
        
        # Validate output directory
        from pathlib import Path
        output_path = Path(batch_request.output_directory)
        if not output_path.exists():
            try:
                output_path.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot create output directory: {str(e)}"
                )
        
        logger.info(f"Starting batch transcription: {len(batch_request.files)} files")
        
        # Start batch processing
        batch_id = await engine.transcribe_batch(batch_request)
        
        return {
            "batch_id": batch_id,
            "status": "processing",
            "total_files": len(batch_request.files),
            "message": "Batch transcription started",
            "progress_url": f"/transcribe/batch/{batch_id}/progress",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch transcription failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch transcription failed: {str(e)}"
        )


@router.get("/job/{job_id}/progress", response_model=JobProgress)
async def get_job_progress(
    job_id: str,
    request: Request,
) -> JobProgress:
    """Get progress information for a transcription job."""
    
    try:
        engine = getattr(request.app.state, 'voxtral_engine', None)
        if not engine:
            raise HTTPException(
                status_code=503,
                detail="Engine not available"
            )
        
        progress = await engine.get_job_progress(job_id)
        if not progress:
            raise HTTPException(
                status_code=404,
                detail="Job not found"
            )
        
        return progress
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job progress: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get job progress: {str(e)}"
        )


@router.get("/batch/{batch_id}/progress", response_model=BatchTranscriptionResponse)
async def get_batch_progress(
    batch_id: str,
    request: Request,
) -> BatchTranscriptionResponse:
    """Get progress information for a batch transcription job."""
    
    try:
        engine = getattr(request.app.state, 'voxtral_engine', None)
        if not engine:
            raise HTTPException(
                status_code=503,
                detail="Engine not available"
            )
        
        progress = await engine.get_batch_progress(batch_id)
        if not progress:
            raise HTTPException(
                status_code=404,
                detail="Batch job not found"
            )
        
        return progress
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get batch progress: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get batch progress: {str(e)}"
        )


@router.post("/job/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    request: Request,
) -> Dict[str, Any]:
    """Cancel an active transcription job."""
    
    try:
        engine = getattr(request.app.state, 'voxtral_engine', None)
        if not engine:
            raise HTTPException(
                status_code=503,
                detail="Engine not available"
            )
        
        success = await engine.cancel_job(job_id)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Job not found or already completed"
            )
        
        return {
            "job_id": job_id,
            "status": "cancelled",
            "message": "Job cancelled successfully",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel job: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cancel job: {str(e)}"
        )


@router.get("/info/{filename}")
async def get_file_info(
    filename: str,
    request: Request,
    file: UploadFile = File(...),
) -> FileInfo:
    """Get information about an uploaded audio file without processing."""
    
    try:
        # Get Voxtral engine
        engine = getattr(request.app.state, 'voxtral_engine', None)
        if not engine:
            raise HTTPException(
                status_code=503,
                detail="Engine not available"
            )
        
        # Read file content
        content = await file.read()
        
        # Get audio info
        audio_info = await engine.audio_processor.get_audio_info(content, filename)
        
        # Estimate processing time (rough approximation)
        duration_minutes = audio_info.get("duration_minutes", 0)
        estimated_time = duration_minutes * 0.1  # Roughly 1/10th of audio duration
        
        return FileInfo(
            file_id=filename,  # In real implementation, this would be a UUID
            filename=filename,
            file_size=len(content),
            duration_seconds=audio_info.get("duration_seconds"),
            format=audio_info.get("format"),
            sample_rate=audio_info.get("sample_rate"),
            channels=audio_info.get("channels"),
            estimated_processing_time=estimated_time,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get file info: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get file info: {str(e)}"
        )


def _parse_file_size(size_str: str) -> int:
    """Parse file size string (e.g., '500MB') to bytes."""
    size_str = size_str.upper()
    
    if size_str.endswith('KB'):
        return int(size_str[:-2]) * 1024
    elif size_str.endswith('MB'):
        return int(size_str[:-2]) * 1024 * 1024
    elif size_str.endswith('GB'):
        return int(size_str[:-2]) * 1024 * 1024 * 1024
    else:
        return int(size_str)
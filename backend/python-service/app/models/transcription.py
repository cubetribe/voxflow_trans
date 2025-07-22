"""
Pydantic models for transcription requests and responses.
"""

from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import List, Optional, Dict, Any, Union
import numpy as np
from pydantic import BaseModel, Field, validator


class OutputFormat(str, Enum):
    """Supported output formats."""
    JSON = "json"
    TEXT = "txt"
    SRT = "srt"
    VTT = "vtt"


class ProcessingStatus(str, Enum):
    """Processing status enum."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ProcessingConfig(BaseModel):
    """Configuration for audio processing."""
    
    target_sample_rate: int = Field(default=16000, description="Target sample rate")
    chunk_duration_minutes: int = Field(default=10, description="Chunk duration in minutes")
    overlap_seconds: int = Field(default=3, description="Fixed 3-second overlap for optimal performance")
    noise_reduction: bool = Field(default=True, description="Enable noise reduction")
    vad_enabled: bool = Field(default=True, description="Enable voice activity detection")
    max_concurrent_chunks: int = Field(default=3, description="Max concurrent chunk processing")


class AudioChunk(BaseModel):
    """Represents a processed audio chunk."""
    
    index: int = Field(description="Chunk index")
    audio_data: Optional[np.ndarray] = Field(default=None, description="Audio data array")
    file_path: str = Field(description="Path to chunk file")
    start_time: float = Field(description="Start time in seconds")
    duration: float = Field(description="Duration in seconds")
    sample_rate: int = Field(description="Sample rate")
    session_id: str = Field(description="Processing session ID")
    
    class Config:
        arbitrary_types_allowed = True


class TranscriptionSegment(BaseModel):
    """Individual transcription segment with timing."""
    
    start: float = Field(description="Start time in seconds")
    end: float = Field(description="End time in seconds")
    text: str = Field(description="Transcribed text")
    confidence: Optional[float] = Field(default=None, description="Confidence score")
    speaker: Optional[str] = Field(default=None, description="Speaker identifier")


class ChunkResult(BaseModel):
    """Result from processing a single chunk."""
    
    chunk_index: int = Field(description="Chunk index")
    start_time: float = Field(description="Chunk start time")
    duration: float = Field(description="Chunk duration")
    segments: List[TranscriptionSegment] = Field(description="Transcription segments")
    processing_time: float = Field(description="Processing time in seconds")
    confidence: Optional[float] = Field(default=None, description="Overall confidence")
    status: ProcessingStatus = Field(description="Processing status")
    error_message: Optional[str] = Field(default=None, description="Error message if failed")


class TranscriptionRequest(BaseModel):
    """Request for transcribing audio."""
    
    audio_data: Optional[bytes] = Field(default=None, description="Audio file data")
    filename: str = Field(description="Original filename")
    language: Optional[str] = Field(default=None, description="Target language for transcription (auto, de, en, es, fr, it, pt, nl, hi)")
    format: OutputFormat = Field(default=OutputFormat.JSON, description="Output format")
    include_timestamps: bool = Field(default=True, description="Include timestamps")
    include_confidence: bool = Field(default=True, description="Include confidence scores")
    processing_config: Optional[ProcessingConfig] = Field(default=None, description="Processing configuration")
    system_prompt: Optional[str] = Field(default=None, max_length=2000, description="System prompt for AI transcription guidance")
    
    @validator('processing_config', pre=True, always=True)
    def set_default_config(cls, v):
        return v or ProcessingConfig()


class BatchTranscriptionRequest(BaseModel):
    """Request for batch transcription of multiple files."""
    
    files: List[str] = Field(description="List of file identifiers")
    output_directory: str = Field(description="Output directory path")
    format: OutputFormat = Field(default=OutputFormat.TEXT, description="Output format")
    include_timestamps: bool = Field(default=True, description="Include timestamps")
    include_confidence: bool = Field(default=False, description="Include confidence scores")
    processing_config: Optional[ProcessingConfig] = Field(default=None, description="Processing configuration")
    cleanup_after_processing: bool = Field(default=True, description="Cleanup temporary files")
    system_prompt: Optional[str] = Field(default=None, max_length=2000, description="System prompt for AI transcription guidance")
    language: Optional[str] = Field(default=None, description="Target language for transcription (auto, de, en, es, fr, it, pt, nl, hi)")
    
    @validator('processing_config', pre=True, always=True)
    def set_default_config(cls, v):
        return v or ProcessingConfig()


class TranscriptionResponse(BaseModel):
    """Response from transcription processing."""
    
    id: str = Field(description="Transcription job ID")
    filename: str = Field(description="Original filename")
    status: ProcessingStatus = Field(description="Processing status")
    segments: List[TranscriptionSegment] = Field(default=[], description="Transcription segments")
    full_text: str = Field(default="", description="Complete transcribed text")
    language: Optional[str] = Field(default=None, description="Detected/specified language")
    duration: float = Field(description="Audio duration in seconds")
    processing_time: float = Field(description="Total processing time")
    confidence: Optional[float] = Field(default=None, description="Overall confidence score")
    chunk_count: int = Field(default=1, description="Number of chunks processed")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    completed_at: Optional[datetime] = Field(default=None, description="Completion timestamp")
    error_message: Optional[str] = Field(default=None, description="Error message if failed")
    
    # File information
    file_size: Optional[int] = Field(default=None, description="File size in bytes")
    audio_info: Optional[Dict[str, Any]] = Field(default=None, description="Audio file information")
    
    # Two-Phase Processing results
    processing_mode: str = Field(default="transcription-only", description="Processing mode: 'transcription-only' or 'two-phase'")
    analysis: Optional[str] = Field(default=None, description="AI analysis/summary from Phase 2 (Understanding Mode)")
    analysis_confidence: Optional[float] = Field(default=None, description="Confidence score for Phase 2 analysis")


class BatchTranscriptionResponse(BaseModel):
    """Response from batch transcription processing."""
    
    batch_id: str = Field(description="Batch job ID")
    status: ProcessingStatus = Field(description="Overall batch status")
    total_files: int = Field(description="Total number of files")
    completed_files: int = Field(default=0, description="Number of completed files")
    failed_files: int = Field(default=0, description="Number of failed files")
    transcriptions: List[TranscriptionResponse] = Field(default=[], description="Individual transcription results")
    output_directory: str = Field(description="Output directory path")
    processing_config: ProcessingConfig = Field(description="Processing configuration used")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    completed_at: Optional[datetime] = Field(default=None, description="Completion timestamp")
    total_processing_time: Optional[float] = Field(default=None, description="Total processing time")


class JobProgress(BaseModel):
    """Progress information for a transcription job."""
    
    job_id: str = Field(description="Job identifier")
    status: ProcessingStatus = Field(description="Current status")
    progress_percent: float = Field(description="Progress percentage (0-100)")
    current_chunk: Optional[int] = Field(default=None, description="Currently processing chunk")
    total_chunks: Optional[int] = Field(default=None, description="Total number of chunks")
    estimated_remaining_time: Optional[float] = Field(default=None, description="Estimated remaining time in seconds")
    chunks_completed: List[ChunkResult] = Field(default=[], description="Completed chunk results")
    error_message: Optional[str] = Field(default=None, description="Error message if failed")
    can_cancel: bool = Field(default=True, description="Whether job can be cancelled")


class StreamingSession(BaseModel):
    """Real-time streaming transcription session."""
    
    session_id: str = Field(description="Session identifier")
    status: str = Field(description="Session status")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Session creation time")
    last_activity: datetime = Field(default_factory=datetime.utcnow, description="Last activity timestamp")
    partial_text: str = Field(default="", description="Current partial transcription")
    final_segments: List[TranscriptionSegment] = Field(default=[], description="Finalized segments")
    processing_config: ProcessingConfig = Field(description="Processing configuration")


class ConfigurationUpdate(BaseModel):
    """Configuration update request."""
    
    output_directory: Optional[str] = Field(default=None, description="Default output directory")
    default_format: Optional[OutputFormat] = Field(default=None, description="Default output format")
    processing_config: Optional[ProcessingConfig] = Field(default=None, description="Default processing config")
    cleanup_settings: Optional[Dict[str, Any]] = Field(default=None, description="Cleanup configuration")


class FileInfo(BaseModel):
    """Information about an uploaded file."""
    
    file_id: str = Field(description="File identifier")
    filename: str = Field(description="Original filename")
    file_size: int = Field(description="File size in bytes")
    duration_seconds: Optional[float] = Field(default=None, description="Audio duration")
    format: str = Field(description="File format")
    sample_rate: Optional[int] = Field(default=None, description="Sample rate")
    channels: Optional[int] = Field(default=None, description="Number of channels")
    estimated_processing_time: Optional[float] = Field(default=None, description="Estimated processing time")
    upload_timestamp: datetime = Field(default_factory=datetime.utcnow, description="Upload timestamp")


class SystemStatus(BaseModel):
    """System status and capabilities."""
    
    service_name: str = Field(description="Service name")
    version: str = Field(description="Service version")
    status: str = Field(description="Overall status")
    model_loaded: bool = Field(description="Whether model is loaded")
    active_jobs: int = Field(description="Number of active jobs")
    queue_size: int = Field(description="Queue size")
    system_resources: Dict[str, Any] = Field(description="System resource usage")
    capabilities: Dict[str, Any] = Field(description="Service capabilities")
    configuration: Dict[str, Any] = Field(description="Current configuration")
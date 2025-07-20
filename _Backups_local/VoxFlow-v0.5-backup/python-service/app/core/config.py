"""
Configuration settings for the VoxFlow Python Service.
"""

import os
from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Server Configuration
    PORT: int = Field(default=8000, description="Server port")
    HOST: str = Field(default="0.0.0.0", description="Server host")
    WORKERS: int = Field(default=1, description="Number of workers")
    
    # Environment
    ENVIRONMENT: str = Field(default="development", description="Environment name")
    DEBUG: bool = Field(default=True, description="Debug mode")
    
    # Voxtral Model Configuration
    MODEL_NAME: str = Field(
        default="mistralai/Voxtral-Mini-3B-2507",  # KERNFEATURE: Voxtral!
        description="Voxtral model name"
    )
    MODEL_CACHE_DIR: str = Field(
        default="./models",
        description="Model cache directory"
    )
    DEVICE: str = Field(
        default="mps",  # Metal Performance Shaders for Apple Silicon
        description="Compute device (mps, cuda, cpu)"
    )
    PRECISION: str = Field(
        default="float16",
        description="Model precision (float16, float32)"
    )
    MAX_AUDIO_LENGTH: int = Field(
        default=1800,  # 30 minutes
        description="Maximum audio length in seconds"
    )
    CHUNK_SIZE: int = Field(
        default=30,
        description="Audio chunk size in seconds"
    )
    OVERLAP_SIZE: int = Field(
        default=2,
        description="Chunk overlap in seconds"
    )
    
    # Audio Processing
    SAMPLE_RATE: int = Field(
        default=16000,
        description="Target sample rate for audio processing"
    )
    AUDIO_CHANNELS: int = Field(
        default=1,
        description="Number of audio channels (mono)"
    )
    VAD_AGGRESSIVENESS: int = Field(
        default=3,
        description="Voice Activity Detection aggressiveness (0-3)"
    )
    NOISE_REDUCTION: bool = Field(
        default=True,
        description="Enable noise reduction preprocessing"
    )
    
    # Performance
    BATCH_SIZE: int = Field(
        default=1,
        description="Inference batch size"
    )
    MAX_CONCURRENT_REQUESTS: int = Field(
        default=5,
        description="Maximum concurrent transcription requests"
    )
    MODEL_TIMEOUT: int = Field(
        default=300,
        description="Model loading timeout in seconds"
    )
    INFERENCE_TIMEOUT: int = Field(
        default=120,
        description="Inference timeout in seconds"
    )
    
    # Logging
    LOG_LEVEL: str = Field(
        default="INFO",
        description="Logging level"
    )
    LOG_FORMAT: str = Field(
        default="json",
        description="Log format (json, text)"
    )
    LOG_FILE: Optional[str] = Field(
        default="./logs/app.log",
        description="Log file path"
    )
    
    # Cache Configuration
    ENABLE_CACHE: bool = Field(
        default=True,
        description="Enable result caching"
    )
    CACHE_TTL: int = Field(
        default=3600,
        description="Cache TTL in seconds"
    )
    MAX_CACHE_SIZE: int = Field(
        default=1000,
        description="Maximum cache entries"
    )
    
    # Health Check
    HEALTH_CHECK_TIMEOUT: int = Field(
        default=30,
        description="Health check timeout in seconds"
    )
    
    # File Upload
    MAX_FILE_SIZE: str = Field(
        default="500MB",
        description="Maximum file upload size"
    )
    TEMP_DIR: str = Field(
        default="./temp",
        description="Temporary files directory"
    )
    UPLOAD_TIMEOUT: int = Field(
        default=300,
        description="File upload timeout in seconds"
    )
    
    # Redis (optional)
    REDIS_URL: Optional[str] = Field(
        default=None,
        description="Redis connection URL"
    )
    REDIS_PASSWORD: Optional[str] = Field(
        default=None,
        description="Redis password"
    )
    
    # Monitoring
    ENABLE_METRICS: bool = Field(
        default=True,
        description="Enable Prometheus metrics"
    )
    METRICS_PORT: int = Field(
        default=9090,
        description="Metrics server port"
    )
    
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Allow extra environment variables
    
    @property
    def model_cache_path(self) -> Path:
        """Get model cache directory as Path object."""
        return Path(self.MODEL_CACHE_DIR)
    
    @property
    def temp_path(self) -> Path:
        """Get temporary directory as Path object."""
        return Path(self.TEMP_DIR)
    
    @property
    def is_apple_silicon(self) -> bool:
        """Check if running on Apple Silicon."""
        return self.DEVICE == "mps"
    
    @property
    def is_cuda_available(self) -> bool:
        """Check if CUDA device is configured."""
        return self.DEVICE == "cuda"
    
    def ensure_directories(self) -> None:
        """Ensure required directories exist."""
        self.model_cache_path.mkdir(parents=True, exist_ok=True)
        self.temp_path.mkdir(parents=True, exist_ok=True)
        
        if self.LOG_FILE:
            log_dir = Path(self.LOG_FILE).parent
            log_dir.mkdir(parents=True, exist_ok=True)


# Global settings instance
settings = Settings()

# Ensure directories exist
settings.ensure_directories()
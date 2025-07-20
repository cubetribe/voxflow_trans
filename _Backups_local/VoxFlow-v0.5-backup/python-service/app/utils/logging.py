"""
Logging configuration for the VoxFlow Python Service.
"""

import sys
from loguru import logger
from app.core.config import settings


def setup_logging() -> None:
    """Configure loguru logging."""
    
    # Remove default handler
    logger.remove()
    
    # Console handler
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "<level>{message}</level>"
    )
    
    if settings.LOG_FORMAT == "json":
        log_format = (
            "{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}"
        )
    
    logger.add(
        sys.stdout,
        format=log_format,
        level=settings.LOG_LEVEL.upper(),
        colorize=settings.LOG_FORMAT != "json",
        backtrace=True,
        diagnose=True,
    )
    
    # File handler (if configured)
    if settings.LOG_FILE:
        logger.add(
            settings.LOG_FILE,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}",
            level=settings.LOG_LEVEL.upper(),
            rotation="10 MB",
            retention="7 days",
            compression="gz",
            backtrace=True,
            diagnose=True,
        )
    
    logger.info("Logging configured successfully")
"""
Progress Notification Service
Handles real-time progress updates to Node.js service via HTTP callbacks.
"""

import asyncio
from typing import Dict, Any, Optional
from datetime import datetime

import httpx
from loguru import logger

from app.core.config import settings


class ProgressNotifier:
    """
    Service for sending real-time progress notifications to Node.js service.
    Handles retry logic, error handling, and connection management.
    """
    
    def __init__(self):
        self.node_service_url = settings.NODE_SERVICE_URL.rstrip('/')
        self.enabled = settings.ENABLE_PROGRESS_NOTIFICATIONS
        self.timeout = httpx.Timeout(5.0, connect=2.0)  # Quick timeouts for real-time updates
        
        # Rate limiting and retry settings
        self.max_retries = 2
        self.retry_delay = 0.5  # seconds
        
        logger.info(f"ProgressNotifier initialized: enabled={self.enabled}, target={self.node_service_url}")
    
    async def notify_job_progress(
        self,
        job_id: str,
        progress_data: Dict[str, Any],
        retry_count: int = 0
    ) -> bool:
        """
        Send job progress notification to Node.js service.
        
        Args:
            job_id: Unique job identifier
            progress_data: Progress information (progress_percent, current_chunk, etc.)
            retry_count: Current retry attempt
            
        Returns:
            True if notification was sent successfully, False otherwise
        """
        
        if not self.enabled:
            logger.debug(f"Progress notifications disabled - skipping job {job_id}")
            return False
        
        try:
            # Prepare notification payload
            payload = {
                "jobId": job_id,
                "timestamp": datetime.utcnow().isoformat(),
                **progress_data
            }
            
            endpoint = f"{self.node_service_url}/api/internal/progress"
            
            # Send HTTP POST with quick timeout
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    endpoint,
                    json=payload,
                    headers={
                        "Content-Type": "application/json",
                        "User-Agent": "VoxFlow-Python-Service/1.0"
                    }
                )
                
                if response.status_code == 200:
                    logger.debug(f"Progress notification sent successfully: job={job_id}, progress={progress_data.get('progress_percent', 0):.1f}%")
                    return True
                else:
                    logger.warning(f"Progress notification failed with status {response.status_code}: {response.text[:200]}")
                    
                    # Retry for server errors (5xx)
                    if 500 <= response.status_code < 600 and retry_count < self.max_retries:
                        logger.debug(f"Retrying progress notification for job {job_id} (attempt {retry_count + 1}/{self.max_retries})")
                        await asyncio.sleep(self.retry_delay)
                        return await self.notify_job_progress(job_id, progress_data, retry_count + 1)
                    
                    return False
                    
        except httpx.TimeoutException:
            logger.warning(f"Progress notification timeout for job {job_id}")
            # Don't retry on timeout - real-time updates should be fast
            return False
            
        except httpx.ConnectError:
            logger.warning(f"Failed to connect to Node.js service at {self.node_service_url}")
            
            # Retry connection errors once
            if retry_count < 1:
                logger.debug(f"Retrying connection for job {job_id}")
                await asyncio.sleep(self.retry_delay * 2)  # Longer delay for connection issues
                return await self.notify_job_progress(job_id, progress_data, retry_count + 1)
            
            return False
            
        except Exception as e:
            logger.error(f"Unexpected error sending progress notification for job {job_id}: {e}")
            return False
    
    async def notify_job_started(self, job_id: str, job_info: Dict[str, Any]) -> bool:
        """
        Notify that a job has started processing.
        
        Args:
            job_id: Job identifier
            job_info: Job information (filename, duration, etc.)
            
        Returns:
            True if notification sent successfully
        """
        
        progress_data = {
            "status": "started",
            "progress_percent": 0.0,
            **job_info
        }
        
        return await self.notify_job_progress(job_id, progress_data)
    
    async def notify_chunk_completed(
        self,
        job_id: str,
        chunk_index: int,
        total_chunks: int,
        chunk_result: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Notify that a chunk has been completed.
        
        Args:
            job_id: Job identifier
            chunk_index: Completed chunk index (0-based)
            total_chunks: Total number of chunks
            chunk_result: Optional chunk processing result
            
        Returns:
            True if notification sent successfully
        """
        
        progress_percent = ((chunk_index + 1) / total_chunks) * 100
        
        progress_data = {
            "status": "processing",
            "progress_percent": progress_percent,
            "current_chunk": chunk_index + 1,
            "total_chunks": total_chunks,
        }
        
        if chunk_result:
            progress_data.update({
                "chunk_processing_time": chunk_result.get("processing_time"),
                "chunk_confidence": chunk_result.get("confidence"),
                "chunk_text_preview": chunk_result.get("text", "")[:100] if chunk_result.get("text") else None
            })
        
        return await self.notify_job_progress(job_id, progress_data)
    
    async def notify_job_completed(
        self,
        job_id: str,
        result: Dict[str, Any]
    ) -> bool:
        """
        Notify that a job has completed successfully.
        
        Args:
            job_id: Job identifier
            result: Transcription result
            
        Returns:
            True if notification sent successfully
        """
        
        progress_data = {
            "status": "completed",
            "progress_percent": 100.0,
            "processing_time": result.get("processing_time"),
            "total_segments": result.get("segments", 0) if isinstance(result.get("segments"), int) else len(result.get("segments", [])),
            "full_text_length": len(result.get("full_text", "")),
            "confidence": result.get("confidence")
        }
        
        return await self.notify_job_progress(job_id, progress_data)
    
    async def notify_job_failed(
        self,
        job_id: str,
        error_message: str,
        progress_percent: Optional[float] = None
    ) -> bool:
        """
        Notify that a job has failed.
        
        Args:
            job_id: Job identifier
            error_message: Error description
            progress_percent: Current progress when failure occurred
            
        Returns:
            True if notification sent successfully
        """
        
        progress_data = {
            "status": "failed",
            "error_message": error_message,
            "progress_percent": progress_percent or 0.0
        }
        
        return await self.notify_job_progress(job_id, progress_data)
    
    async def notify_job_cancelled(self, job_id: str) -> bool:
        """
        Notify that a job has been cancelled.
        
        Args:
            job_id: Job identifier
            
        Returns:
            True if notification sent successfully
        """
        
        progress_data = {
            "status": "cancelled",
            "progress_percent": 0.0
        }
        
        return await self.notify_job_progress(job_id, progress_data)
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Check if the Node.js service is reachable for progress notifications.
        
        Returns:
            Health check result with status and response time
        """
        
        if not self.enabled:
            return {
                "status": "disabled",
                "message": "Progress notifications are disabled"
            }
        
        try:
            start_time = datetime.utcnow()
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.node_service_url}/health")
                
            response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            if response.status_code == 200:
                return {
                    "status": "healthy",
                    "response_time_ms": response_time,
                    "node_service_url": self.node_service_url
                }
            else:
                return {
                    "status": "unhealthy",
                    "message": f"Node.js service returned status {response.status_code}",
                    "response_time_ms": response_time
                }
                
        except Exception as e:
            return {
                "status": "unhealthy",
                "message": f"Failed to reach Node.js service: {str(e)}",
                "node_service_url": self.node_service_url
            }


# Global progress notifier instance
progress_notifier = ProgressNotifier()
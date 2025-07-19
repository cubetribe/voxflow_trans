"""
Automatic cleanup service for managing temporary files and cache.
Ensures memory-efficient operation and prevents disk space issues.
"""

import asyncio
import shutil
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Set
import psutil
from loguru import logger

from app.core.config import settings


class CleanupService:
    """
    Manages automatic cleanup of temporary files, cache, and resources.
    """
    
    def __init__(self):
        self.active_sessions: Set[str] = set()
        self.session_last_activity: Dict[str, float] = {}
        self.protected_files: Dict[str, Set[Path]] = {}
        self.cleanup_tasks: Dict[str, asyncio.Task] = {}
        self._running = False
        
    async def start(self) -> None:
        """Start the cleanup service."""
        if self._running:
            return
            
        self._running = True
        logger.info("Starting cleanup service")
        
        # Start background cleanup task
        asyncio.create_task(self._background_cleanup_loop())
        
    async def stop(self) -> None:
        """Stop the cleanup service."""
        self._running = False
        
        # Cancel all cleanup tasks
        for task in self.cleanup_tasks.values():
            if not task.done():
                task.cancel()
                
        self.cleanup_tasks.clear()
        logger.info("Cleanup service stopped")
        
    def register_session(self, session_id: str) -> None:
        """Register a new processing session."""
        self.active_sessions.add(session_id)
        self.session_last_activity[session_id] = time.time()
        self.protected_files[session_id] = set()
        
        logger.debug(f"Registered session: {session_id}")
        
    def update_session_activity(self, session_id: str) -> None:
        """Update last activity time for a session."""
        if session_id in self.active_sessions:
            self.session_last_activity[session_id] = time.time()
            
    def protect_file(self, session_id: str, file_path: Path) -> None:
        """Protect a file from cleanup during active session."""
        if session_id in self.protected_files:
            self.protected_files[session_id].add(file_path)
            
    async def cleanup_session(self, session_id: str, force: bool = False) -> int:
        """
        Clean up all files and resources for a session.
        
        Args:
            session_id: Session to clean up
            force: Force cleanup even if session is active
            
        Returns:
            Number of files cleaned up
        """
        
        if not force and session_id in self.active_sessions:
            logger.warning(f"Attempted to cleanup active session: {session_id}")
            return 0
            
        cleaned_count = 0
        
        try:
            # Remove session from active tracking
            self.active_sessions.discard(session_id)
            self.session_last_activity.pop(session_id, None)
            
            # Clean up session directory
            session_dir = settings.temp_path / session_id
            if session_dir.exists():
                cleaned_count = await self._remove_directory_contents(session_dir)
                
                # Remove the directory itself if empty
                try:
                    if not any(session_dir.iterdir()):
                        await asyncio.to_thread(session_dir.rmdir)
                except Exception as e:
                    logger.warning(f"Failed to remove session directory {session_dir}: {e}")
            
            # Clean up protected files tracking
            self.protected_files.pop(session_id, None)
            
            # Cancel any pending cleanup tasks for this session
            if session_id in self.cleanup_tasks:
                task = self.cleanup_tasks.pop(session_id)
                if not task.done():
                    task.cancel()
                    
            logger.info(f"Cleaned up session {session_id}: {cleaned_count} files removed")
            
        except Exception as e:
            logger.error(f"Error during session cleanup {session_id}: {e}")
            
        return cleaned_count
        
    async def schedule_delayed_cleanup(
        self, 
        session_id: str, 
        delay_seconds: int = 300
    ) -> None:
        """
        Schedule cleanup of a session after a delay.
        Useful for cleaning up after successful processing.
        """
        
        async def delayed_cleanup():
            try:
                await asyncio.sleep(delay_seconds)
                await self.cleanup_session(session_id)
            except asyncio.CancelledError:
                logger.debug(f"Delayed cleanup cancelled for session: {session_id}")
            except Exception as e:
                logger.error(f"Error in delayed cleanup for session {session_id}: {e}")
                
        # Cancel existing cleanup task if any
        if session_id in self.cleanup_tasks:
            self.cleanup_tasks[session_id].cancel()
            
        # Schedule new cleanup
        self.cleanup_tasks[session_id] = asyncio.create_task(delayed_cleanup())
        logger.debug(f"Scheduled cleanup for session {session_id} in {delay_seconds} seconds")
        
    async def cleanup_inactive_sessions(self, max_idle_minutes: int = 30) -> int:
        """Clean up sessions that have been inactive for too long."""
        
        current_time = time.time()
        max_idle_seconds = max_idle_minutes * 60
        inactive_sessions = []
        
        for session_id, last_activity in self.session_last_activity.items():
            if current_time - last_activity > max_idle_seconds:
                inactive_sessions.append(session_id)
                
        total_cleaned = 0
        for session_id in inactive_sessions:
            cleaned = await self.cleanup_session(session_id, force=True)
            total_cleaned += cleaned
            
        if total_cleaned > 0:
            logger.info(f"Cleaned up {len(inactive_sessions)} inactive sessions, {total_cleaned} files")
            
        return total_cleaned
        
    async def cleanup_old_files(self, max_age_hours: int = 24) -> int:
        """Clean up old temporary files that may have been orphaned."""
        
        if not settings.temp_path.exists():
            return 0
            
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        cleaned_count = 0
        
        try:
            for item in settings.temp_path.iterdir():
                try:
                    # Check if item is old enough to clean
                    item_age = current_time - item.stat().st_mtime
                    
                    if item_age > max_age_seconds:
                        if item.is_file():
                            await asyncio.to_thread(item.unlink)
                            cleaned_count += 1
                        elif item.is_dir():
                            # Check if it's an active session
                            if item.name not in self.active_sessions:
                                dir_cleaned = await self._remove_directory_contents(item)
                                cleaned_count += dir_cleaned
                                
                                # Remove directory if empty
                                try:
                                    if not any(item.iterdir()):
                                        await asyncio.to_thread(item.rmdir)
                                except Exception:
                                    pass
                                    
                except Exception as e:
                    logger.warning(f"Failed to check/clean item {item}: {e}")
                    
        except Exception as e:
            logger.error(f"Error during old files cleanup: {e}")
            
        if cleaned_count > 0:
            logger.info(f"Cleaned up {cleaned_count} old files")
            
        return cleaned_count
        
    async def check_disk_space(self, min_free_gb: float = 1.0) -> bool:
        """
        Check if there's sufficient disk space.
        Trigger emergency cleanup if space is low.
        """
        
        try:
            disk_usage = psutil.disk_usage(settings.temp_path)
            free_gb = disk_usage.free / (1024 ** 3)
            
            if free_gb < min_free_gb:
                logger.warning(f"Low disk space: {free_gb:.2f}GB free, minimum: {min_free_gb}GB")
                
                # Emergency cleanup
                await self.emergency_cleanup()
                
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"Error checking disk space: {e}")
            return True  # Assume OK if we can't check
            
    async def emergency_cleanup(self) -> int:
        """
        Emergency cleanup when disk space is critically low.
        Removes all non-active session files.
        """
        
        logger.warning("Performing emergency cleanup due to low disk space")
        
        total_cleaned = 0
        
        # Clean up all old files aggressively
        total_cleaned += await self.cleanup_old_files(max_age_hours=1)  # Clean files older than 1 hour
        
        # Clean up inactive sessions aggressively
        total_cleaned += await self.cleanup_inactive_sessions(max_idle_minutes=5)  # Clean sessions idle for 5 minutes
        
        # Clean up any remaining non-protected files
        if settings.temp_path.exists():
            for item in settings.temp_path.iterdir():
                if item.is_file():
                    try:
                        await asyncio.to_thread(item.unlink)
                        total_cleaned += 1
                    except Exception:
                        pass
                elif item.is_dir() and item.name not in self.active_sessions:
                    try:
                        cleaned = await self._remove_directory_contents(item)
                        total_cleaned += cleaned
                        await asyncio.to_thread(item.rmdir)
                    except Exception:
                        pass
                        
        logger.warning(f"Emergency cleanup completed: {total_cleaned} files removed")
        
        return total_cleaned
        
    async def get_cleanup_stats(self) -> Dict[str, any]:
        """Get statistics about cleanup service status."""
        
        temp_size = 0
        temp_files = 0
        
        if settings.temp_path.exists():
            for item in settings.temp_path.rglob('*'):
                if item.is_file():
                    try:
                        temp_size += item.stat().st_size
                        temp_files += 1
                    except Exception:
                        pass
                        
        disk_usage = psutil.disk_usage(settings.temp_path) if settings.temp_path.exists() else None
        
        return {
            "active_sessions": len(self.active_sessions),
            "protected_files": sum(len(files) for files in self.protected_files.values()),
            "temp_files_count": temp_files,
            "temp_files_size_mb": temp_size / (1024 * 1024),
            "scheduled_cleanups": len(self.cleanup_tasks),
            "disk_usage": {
                "total_gb": disk_usage.total / (1024 ** 3) if disk_usage else 0,
                "free_gb": disk_usage.free / (1024 ** 3) if disk_usage else 0,
                "used_percent": (disk_usage.used / disk_usage.total) * 100 if disk_usage else 0,
            } if disk_usage else None,
        }
        
    async def _remove_directory_contents(self, directory: Path) -> int:
        """Remove all contents of a directory."""
        
        cleaned_count = 0
        
        if not directory.exists():
            return 0
            
        try:
            for item in directory.rglob('*'):
                if item.is_file():
                    try:
                        await asyncio.to_thread(item.unlink)
                        cleaned_count += 1
                    except Exception as e:
                        logger.warning(f"Failed to remove file {item}: {e}")
                        
            # Remove empty subdirectories
            for item in sorted(directory.rglob('*'), key=lambda p: len(p.parts), reverse=True):
                if item.is_dir() and item != directory:
                    try:
                        if not any(item.iterdir()):
                            await asyncio.to_thread(item.rmdir)
                    except Exception:
                        pass
                        
        except Exception as e:
            logger.error(f"Error removing directory contents {directory}: {e}")
            
        return cleaned_count
        
    async def _background_cleanup_loop(self) -> None:
        """Background loop for periodic cleanup tasks."""
        
        logger.info("Started background cleanup loop")
        
        while self._running:
            try:
                # Check disk space every 5 minutes
                await self.check_disk_space()
                
                # Clean up inactive sessions every 10 minutes
                await self.cleanup_inactive_sessions()
                
                # Clean up old files every hour
                await self.cleanup_old_files()
                
                # Wait before next cleanup cycle
                await asyncio.sleep(300)  # 5 minutes
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in background cleanup loop: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying
                
        logger.info("Background cleanup loop stopped")


# Global cleanup service instance
cleanup_service = CleanupService()
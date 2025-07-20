"""
KRITISCH: Resource monitoring service to prevent system freezes.
Monitors GPU memory (MPS), system memory, and provides emergency shutdown.
"""

import asyncio
import os
import psutil
import threading
import time
from typing import Dict, Any, Optional
from loguru import logger

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning("PyTorch not available - GPU monitoring disabled")


class ResourceMonitor:
    """Monitors system resources and enforces safety limits."""
    
    def __init__(self, config):
        self.config = config
        self.monitoring = False
        self.monitor_thread: Optional[threading.Thread] = None
        self.shutdown_callback = None
        
        # Resource metrics
        self.current_metrics = {
            "memory_gb": 0.0,
            "memory_percent": 0.0,
            "gpu_memory_gb": 0.0,
            "gpu_memory_percent": 0.0,
            "cpu_percent": 0.0,
            "emergency_triggered": False
        }
        
    def set_shutdown_callback(self, callback):
        """Set callback function for emergency shutdown."""
        self.shutdown_callback = callback
        
    def get_gpu_memory_usage(self) -> Dict[str, float]:
        """Get GPU memory usage for Apple Silicon MPS."""
        if not TORCH_AVAILABLE or not torch.backends.mps.is_available():
            return {"gpu_memory_gb": 0.0, "gpu_memory_percent": 0.0}
            
        try:
            # Apple Silicon MPS memory monitoring
            if hasattr(torch.mps, 'current_allocated_memory'):
                allocated = torch.mps.current_allocated_memory() / (1024**3)  # GB
                # Estimate total GPU memory (Apple Silicon unified memory)
                total_system_gb = psutil.virtual_memory().total / (1024**3)
                # Assume GPU can use up to 50% of unified memory
                estimated_gpu_total = total_system_gb * 0.5
                gpu_percent = (allocated / estimated_gpu_total) * 100 if estimated_gpu_total > 0 else 0
                
                return {
                    "gpu_memory_gb": allocated,
                    "gpu_memory_percent": gpu_percent
                }
        except Exception as e:
            logger.warning(f"Failed to get GPU memory usage: {e}")
            
        return {"gpu_memory_gb": 0.0, "gpu_memory_percent": 0.0}
    
    def get_system_metrics(self) -> Dict[str, float]:
        """Get current system resource metrics."""
        try:
            # System memory
            memory = psutil.virtual_memory()
            memory_gb = memory.used / (1024**3)
            memory_percent = memory.percent
            
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # GPU memory
            gpu_metrics = self.get_gpu_memory_usage()
            
            return {
                "memory_gb": memory_gb,
                "memory_percent": memory_percent,
                "cpu_percent": cpu_percent,
                **gpu_metrics
            }
        except Exception as e:
            logger.error(f"Failed to get system metrics: {e}")
            return self.current_metrics
    
    def check_safety_limits(self, metrics: Dict[str, float]) -> bool:
        """Check if resources exceed safety limits."""
        violations = []
        
        # Memory check
        if metrics["memory_gb"] > self.config.MAX_MEMORY_GB:
            violations.append(f"Memory: {metrics['memory_gb']:.1f}GB > {self.config.MAX_MEMORY_GB}GB")
            
        # GPU memory check (critical for Apple Silicon)
        if metrics["gpu_memory_gb"] > 4.0:  # 4GB GPU memory limit
            violations.append(f"GPU Memory: {metrics['gpu_memory_gb']:.1f}GB > 4.0GB")
            
        # CPU check
        if metrics["cpu_percent"] > self.config.MAX_CPU_PERCENT:
            violations.append(f"CPU: {metrics['cpu_percent']:.1f}% > {self.config.MAX_CPU_PERCENT}%")
            
        if violations:
            logger.error(f"🚨 SAFETY LIMITS EXCEEDED: {', '.join(violations)}")
            return False
            
        return True
    
    def emergency_shutdown(self, reason: str):
        """Trigger emergency shutdown."""
        logger.critical(f"🔴 EMERGENCY SHUTDOWN: {reason}")
        self.current_metrics["emergency_triggered"] = True
        
        try:
            # Clear GPU memory
            if TORCH_AVAILABLE and torch.backends.mps.is_available():
                if hasattr(torch.mps, 'empty_cache'):
                    torch.mps.empty_cache()
                    logger.info("🧹 GPU cache cleared")
                    
            # Call shutdown callback if set
            if self.shutdown_callback:
                logger.info("🛑 Calling shutdown callback")
                self.shutdown_callback()
                
        except Exception as e:
            logger.error(f"Failed during emergency shutdown: {e}")
            
        # Force exit if needed
        if self.config.EMERGENCY_SHUTDOWN_ENABLED:
            logger.critical("💥 FORCE EXIT - System Protection")
            os._exit(1)
    
    def monitor_loop(self):
        """Main monitoring loop."""
        logger.info(f"🔍 Resource monitoring started (interval: {self.config.MEMORY_CHECK_INTERVAL}s)")
        
        while self.monitoring:
            try:
                # Get current metrics
                metrics = self.get_system_metrics()
                self.current_metrics.update(metrics)
                
                # Log metrics every 30 seconds
                if int(time.time()) % 30 == 0:
                    logger.info(
                        f"📊 Resources: "
                        f"RAM: {metrics['memory_gb']:.1f}GB ({metrics['memory_percent']:.1f}%), "
                        f"GPU: {metrics['gpu_memory_gb']:.1f}GB, "
                        f"CPU: {metrics['cpu_percent']:.1f}%"
                    )
                
                # Check safety limits
                if not self.check_safety_limits(metrics):
                    self.emergency_shutdown("Resource limits exceeded")
                    break
                    
                time.sleep(self.config.MEMORY_CHECK_INTERVAL)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(5)  # Slower retry on error
    
    def start_monitoring(self):
        """Start resource monitoring in background thread."""
        if self.monitoring:
            logger.warning("Resource monitoring already running")
            return
            
        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.monitor_thread.start()
        logger.info("✅ Resource monitoring thread started")
        
    def stop_monitoring(self):
        """Stop resource monitoring."""
        self.monitoring = False
        if self.monitor_thread and self.monitor_thread.is_alive():
            self.monitor_thread.join(timeout=5)
        logger.info("🛑 Resource monitoring stopped")
        
    def get_current_metrics(self) -> Dict[str, Any]:
        """Get current resource metrics."""
        return self.current_metrics.copy()
        
    def force_gpu_cleanup(self):
        """Force GPU memory cleanup."""
        if TORCH_AVAILABLE and torch.backends.mps.is_available():
            try:
                if hasattr(torch.mps, 'empty_cache'):
                    torch.mps.empty_cache()
                    logger.info("🧹 GPU cache cleared manually")
                return True
            except Exception as e:
                logger.error(f"Failed to clear GPU cache: {e}")
        return False


# Global resource monitor instance
_resource_monitor: Optional[ResourceMonitor] = None


def get_resource_monitor(config=None) -> ResourceMonitor:
    """Get global resource monitor instance."""
    global _resource_monitor
    if _resource_monitor is None and config is not None:
        _resource_monitor = ResourceMonitor(config)
    return _resource_monitor


def cleanup_resources():
    """Emergency resource cleanup."""
    global _resource_monitor
    if _resource_monitor:
        _resource_monitor.force_gpu_cleanup()
        _resource_monitor.stop_monitoring()
#!/usr/bin/env python3
"""
KRITISCHER SICHERHEITS-TEST für Voxtral
Testet mit allen Safety-Limits aktiviert um System-Freeze zu verhindern.
"""

import asyncio
import os
import sys
import time
import psutil
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings
from app.services.resource_monitor import ResourceMonitor, cleanup_resources
from app.core.voxtral_engine import VoxtralEngine
from app.models.transcription import ProcessingConfig
from loguru import logger

async def safe_voxtral_test(audio_file_path: str):
    """Safely test Voxtral with all safety measures enabled."""
    
    print("🛡️ SICHERHEITS-TEST für Voxtral")
    print("="*50)
    
    # 1. Validate input file
    if not os.path.exists(audio_file_path):
        print(f"❌ Audio file not found: {audio_file_path}")
        return False
    
    file_size_mb = os.path.getsize(audio_file_path) / (1024 * 1024)
    print(f"📁 Audio file: {audio_file_path}")
    print(f"📊 File size: {file_size_mb:.1f} MB")
    
    # 2. Check if file size is safe
    if file_size_mb > 50:  # 50MB max for safety
        print(f"❌ File too large for safety test: {file_size_mb:.1f}MB > 50MB")
        return False
    
    # 3. Initialize resource monitor
    print(f"🔧 Safety limits: Max {settings.MAX_MEMORY_GB}GB RAM, Max {settings.MAX_AUDIO_LENGTH}s audio")
    
    resource_monitor = ResourceMonitor(settings)
    
    # Set emergency callback
    emergency_triggered = False
    def emergency_callback():
        nonlocal emergency_triggered
        emergency_triggered = True
        print("🚨 EMERGENCY SHUTDOWN TRIGGERED!")
    
    resource_monitor.set_shutdown_callback(emergency_callback)
    resource_monitor.start_monitoring()
    
    try:
        print("🚀 Starting Voxtral engine...")
        
        # 4. Initialize Voxtral engine
        config = ProcessingConfig()
        engine = VoxtralEngine(config)
        
        print("📥 Loading model...")
        start_time = time.time()
        
        # 5. Monitor resources during model loading
        initial_metrics = resource_monitor.get_current_metrics()
        print(f"🔍 Initial resources: RAM: {initial_metrics['memory_gb']:.1f}GB, GPU: {initial_metrics['gpu_memory_gb']:.1f}GB")
        
        await engine.initialize()
        
        load_time = time.time() - start_time
        print(f"✅ Model loaded in {load_time:.1f}s")
        
        # 6. Check resources after loading
        post_load_metrics = resource_monitor.get_current_metrics()
        print(f"📊 Post-load resources: RAM: {post_load_metrics['memory_gb']:.1f}GB, GPU: {post_load_metrics['gpu_memory_gb']:.1f}GB")
        
        # 7. Read audio file
        print(f"📖 Reading audio file...")
        with open(audio_file_path, 'rb') as f:
            audio_data = f.read()
        
        print(f"🎵 Audio data size: {len(audio_data)} bytes")
        
        # 8. CRITICAL: Test transcription with monitoring
        print("🎯 Starting transcription (MONITORED)...")
        
        transcription_start = time.time()
        
        # Monitor resources every second during transcription
        async def resource_monitor_task():
            while True:
                await asyncio.sleep(1)
                metrics = resource_monitor.get_current_metrics()
                print(f"⏱️ Resources: RAM: {metrics['memory_gb']:.1f}GB, GPU: {metrics['gpu_memory_gb']:.1f}GB, CPU: {metrics['cpu_percent']:.1f}%")
                
                if emergency_triggered:
                    print("🛑 Emergency triggered - stopping monitor")
                    break
        
        # Start monitoring task
        monitor_task = asyncio.create_task(resource_monitor_task())
        
        try:
            # Create processing config with safety limits
            processing_config = ProcessingConfig(
                target_sample_rate=16000,
                chunk_duration_minutes=1,  # 1 minute chunks max
                overlap_seconds=2,
                noise_reduction=False,  # Disable for faster processing
                vad_enabled=False  # Disable for simpler processing
            )
            
            # Process audio with safety limits
            results = []
            async for chunk in engine.audio_processor.process_large_file(
                audio_data, 
                os.path.basename(audio_file_path), 
                processing_config
            ):
                print(f"📝 Processing chunk {chunk.index}: {chunk.duration:.1f}s")
                results.append(chunk)
                
                # Check for emergency after each chunk
                if emergency_triggered:
                    print("🚨 Emergency triggered - stopping transcription")
                    break
            
            transcription_time = time.time() - transcription_start
            
            # Cancel monitor task
            monitor_task.cancel()
            
            if emergency_triggered:
                print("❌ Test FAILED - Emergency shutdown triggered")
                return False
            
            print(f"✅ Transcription completed in {transcription_time:.1f}s")
            print(f"📊 Processed {len(results)} chunks")
            
            # 9. Final resource check
            final_metrics = resource_monitor.get_current_metrics()
            print(f"📈 Final resources: RAM: {final_metrics['memory_gb']:.1f}GB, GPU: {final_metrics['gpu_memory_gb']:.1f}GB")
            
            print("🎉 TEST SUCCESSFUL - No system freeze!")
            return True
            
        except Exception as e:
            monitor_task.cancel()
            print(f"❌ Transcription failed: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False
        
    finally:
        # 10. Cleanup
        print("🧹 Cleaning up resources...")
        resource_monitor.stop_monitoring()
        cleanup_resources()
        print("✅ Cleanup completed")

def main():
    """Main entry point."""
    if len(sys.argv) != 2:
        print("Usage: python safe_voxtral_test.py <audio_file>")
        print("Example: python safe_voxtral_test.py /path/to/test.wav")
        sys.exit(1)
    
    audio_file = sys.argv[1]
    
    print(f"🔊 Testing with audio file: {audio_file}")
    
    # Run async test
    success = asyncio.run(safe_voxtral_test(audio_file))
    
    if success:
        print("\n✅ VOXTRAL TEST PASSED - Safe to use!")
        sys.exit(0)
    else:
        print("\n❌ VOXTRAL TEST FAILED - DO NOT USE without fixes!")
        sys.exit(1)

if __name__ == "__main__":
    main()
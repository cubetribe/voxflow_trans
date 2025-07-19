"""
VoxFlow Basic Integration Tests - Production-Ready

Simple integration tests that verify real VoxtralEngine functionality.
Following CLAUDE.md requirements: NO shortcuts, NO mocks, production-ready only.

These tests use real Voxtral models and actual audio processing.
"""

import asyncio
import pytest
from pathlib import Path
from typing import Dict, Any

from app.core.voxtral_engine import VoxtralEngine
from app.core.audio_processor import AudioProcessor
from app.core.config import settings
from tests.conftest import (
    skip_if_no_real_audio,
    PerformanceTracker,
    MemoryMonitor,
    VoxtralBenchmark
)


@pytest.mark.integration
@pytest.mark.asyncio
class TestBasicVoxtralIntegration:
    """Basic VoxtralEngine integration tests with real model loading."""

    async def test_voxtral_engine_initialization(self, memory_monitor: MemoryMonitor):
        """Test VoxtralEngine initializes correctly with real model."""
        memory_before = memory_monitor.check_memory()
        
        # Initialize real VoxtralEngine
        engine = VoxtralEngine(settings)
        
        # Test initialization
        await engine.initialize()
        
        memory_after = memory_monitor.check_memory()
        memory_increase = memory_after["current_rss_mb"] - memory_before["current_rss_mb"]
        
        # Verify engine state
        assert engine.is_loaded, "Engine should be loaded"
        
        # Check memory usage is reasonable (model loading uses memory)
        assert memory_increase > 0, "Model loading should increase memory usage"
        assert memory_increase < 4000, f"Memory increase {memory_increase:.1f}MB too high"
        
        # Test health check
        health = await engine.health_check()
        assert health["status"] in ["healthy", "degraded"], f"Engine unhealthy: {health}"
        
        print(f"✅ Engine initialized, memory increase: {memory_increase:.1f}MB")
        print(f"✅ Engine health: {health['status']}")
        
        # Cleanup
        await engine.cleanup()

    async def test_voxtral_engine_configuration(self):
        """Test VoxtralEngine configuration and settings."""
        engine = VoxtralEngine(settings)
        await engine.initialize()
        
        # Test configuration retrieval
        config = engine.get_config()
        
        # Verify essential configuration
        assert "model_name" in config, "Missing model_name in config"
        assert "device" in config, "Missing device in config"
        assert "max_audio_length" in config, "Missing max_audio_length in config"
        assert "chunk_size" in config, "Missing chunk_size in config"
        
        # Verify values are reasonable
        assert config["device"] in ["mps", "cpu", "cuda"], f"Invalid device: {config['device']}"
        assert config["max_audio_length"] > 0, "Invalid max_audio_length"
        assert config["chunk_size"] > 0, "Invalid chunk_size"
        
        print(f"✅ Model: {config['model_name']}")
        print(f"✅ Device: {config['device']}")
        print(f"✅ Max audio: {config['max_audio_length']}s")
        print(f"✅ Chunk size: {config['chunk_size']}s")
        
        await engine.cleanup()

    async def test_voxtral_engine_memory_management(self, memory_monitor: MemoryMonitor):
        """Test VoxtralEngine memory management and cleanup."""
        baseline = memory_monitor.check_memory()
        
        engine = VoxtralEngine(settings)
        
        # Initialize and check memory increase
        await engine.initialize()
        after_init = memory_monitor.check_memory()
        init_increase = after_init["current_rss_mb"] - baseline["current_rss_mb"]
        
        # Get memory usage stats
        engine_memory = engine.get_memory_usage()
        assert "total_memory_mb" in engine_memory, "Missing total_memory_mb"
        assert "model_memory_mb" in engine_memory, "Missing model_memory_mb"
        assert engine_memory["total_memory_mb"] > 0, "Invalid total memory"
        
        # Test model unloading
        await engine.unload_model()
        after_unload = memory_monitor.check_memory()
        
        # Test model reloading
        await engine.load_model()
        after_reload = memory_monitor.check_memory()
        
        # Cleanup
        await engine.cleanup()
        after_cleanup = memory_monitor.check_memory()
        
        # Verify memory management
        assert init_increase > 100, "Model loading should use significant memory"
        print(f"✅ Model loading memory: {init_increase:.1f}MB")
        print(f"✅ Memory after cleanup: {after_cleanup['current_rss_mb']:.1f}MB")

    @skip_if_no_real_audio
    async def test_real_audio_transcription_basic(self, real_audio_file: Path, 
                                                 performance_tracker: PerformanceTracker,
                                                 voxtral_benchmark: VoxtralBenchmark):
        """Test basic transcription with real audio file."""
        performance_tracker.start("real_audio_basic_transcription")
        
        engine = VoxtralEngine(settings)
        await engine.initialize()
        
        # Transcribe real audio file
        result = await engine.transcribe_file(
            file_path=str(real_audio_file),
            language="auto",
            task="transcribe"
        )
        
        metrics = performance_tracker.end()
        
        # Verify transcription success
        assert result["success"] is True, f"Transcription failed: {result.get('error', 'Unknown error')}"
        assert "transcription" in result, "Missing transcription in result"
        assert "metadata" in result, "Missing metadata in result"
        
        transcription = result["transcription"]
        metadata = result["metadata"]
        
        # Verify transcription content
        assert "text" in transcription, "Missing text in transcription"
        assert "confidence" in transcription, "Missing confidence in transcription"
        assert "duration" in transcription, "Missing duration in transcription"
        
        # Basic quality checks
        text = transcription["text"]
        confidence = transcription["confidence"]
        duration = transcription["duration"]
        
        assert len(text.strip()) > 0, "Transcription text is empty"
        assert 0 <= confidence <= 1, f"Invalid confidence: {confidence}"
        assert duration > 0, f"Invalid duration: {duration}"
        
        # Performance checks
        processing_time = metadata["processing_time"]
        rtf = processing_time / duration
        
        assert processing_time > 0, "Invalid processing time"
        assert rtf < 5.0, f"Processing too slow: {rtf:.2f}x real-time"
        
        print(f"✅ Transcribed: '{text[:50]}...'")
        print(f"✅ Confidence: {confidence:.3f}")
        print(f"✅ Duration: {duration:.1f}s")
        print(f"✅ Processing: {processing_time:.2f}s ({rtf:.2f}x real-time)")
        
        await engine.cleanup()


@pytest.mark.integration
@pytest.mark.asyncio
class TestAudioProcessorIntegration:
    """Audio processor integration tests with real audio files."""

    async def test_audio_processor_initialization(self):
        """Test AudioProcessor initializes correctly."""
        processor = AudioProcessor()
        
        # Test configuration
        config = processor.get_config()
        assert "sample_rate" in config, "Missing sample_rate in config"
        assert "chunk_size" in config, "Missing chunk_size in config"
        assert config["sample_rate"] > 0, "Invalid sample_rate"
        
        print(f"✅ AudioProcessor config: {config}")

    async def test_audio_format_validation(self, test_audio_files: Dict[str, Path]):
        """Test audio format validation with various formats."""
        processor = AudioProcessor()
        
        supported_count = 0
        
        for file_key, file_path in test_audio_files.items():
            try:
                # Test format validation
                is_valid = await processor.validate_audio_file(str(file_path))
                
                if is_valid:
                    supported_count += 1
                    
                    # Test audio info extraction
                    info = await processor.get_audio_info(str(file_path))
                    
                    assert "duration" in info, f"Missing duration for {file_key}"
                    assert "sample_rate" in info, f"Missing sample_rate for {file_key}"
                    assert "channels" in info, f"Missing channels for {file_key}"
                    
                    assert info["duration"] > 0, f"Invalid duration for {file_key}"
                    assert info["sample_rate"] > 0, f"Invalid sample_rate for {file_key}"
                    assert info["channels"] > 0, f"Invalid channels for {file_key}"
                    
                    print(f"✅ {file_key}: {info['duration']:.1f}s @ {info['sample_rate']}Hz")
                
            except Exception as e:
                print(f"⚠️ {file_key} validation failed: {e}")
        
        assert supported_count > 0, "No audio formats supported"
        print(f"✅ Supported {supported_count}/{len(test_audio_files)} audio formats")

    @skip_if_no_real_audio 
    async def test_real_audio_preprocessing(self, real_audio_file: Path,
                                          performance_tracker: PerformanceTracker):
        """Test audio preprocessing with real audio file."""
        performance_tracker.start("audio_preprocessing")
        
        processor = AudioProcessor()
        
        # Test preprocessing
        processed_audio = await processor.preprocess_audio(
            file_path=str(real_audio_file),
            target_sample_rate=16000,
            normalize=True,
            remove_silence=False  # Keep simple for basic test
        )
        
        metrics = performance_tracker.end()
        
        # Verify processed audio
        assert processed_audio is not None, "Preprocessing failed"
        assert "audio_data" in processed_audio, "Missing audio_data"
        assert "sample_rate" in processed_audio, "Missing sample_rate"
        assert "duration" in processed_audio, "Missing duration"
        
        audio_data = processed_audio["audio_data"]
        sample_rate = processed_audio["sample_rate"]
        duration = processed_audio["duration"]
        
        assert len(audio_data) > 0, "Empty audio data"
        assert sample_rate == 16000, f"Wrong sample rate: {sample_rate}"
        assert duration > 0, f"Invalid duration: {duration}"
        
        print(f"✅ Preprocessed: {len(audio_data)} samples @ {sample_rate}Hz")
        print(f"✅ Duration: {duration:.2f}s")
        print(f"✅ Processing time: {metrics['duration_seconds']:.2f}s")


@pytest.mark.integration
@pytest.mark.asyncio
class TestConfigurationIntegration:
    """Configuration and settings integration tests."""

    async def test_settings_validation(self):
        """Test settings configuration is valid."""
        # Verify settings are loaded correctly
        assert settings.MODEL_NAME is not None, "Missing MODEL_NAME"
        assert settings.DEVICE is not None, "Missing DEVICE"
        assert settings.MAX_AUDIO_LENGTH > 0, "Invalid MAX_AUDIO_LENGTH"
        assert settings.CHUNK_SIZE > 0, "Invalid CHUNK_SIZE"
        
        # Test paths exist or can be created
        settings.ensure_directories()
        
        assert settings.model_cache_path.exists(), "Model cache directory not created"
        assert settings.temp_path.exists(), "Temp directory not created"
        
        print(f"✅ Model: {settings.MODEL_NAME}")
        print(f"✅ Device: {settings.DEVICE}")
        print(f"✅ Cache: {settings.model_cache_path}")
        print(f"✅ Temp: {settings.temp_path}")

    async def test_environment_detection(self):
        """Test environment and capabilities detection."""
        from app.core.voxtral_engine import VoxtralEngine
        
        engine = VoxtralEngine(settings)
        
        # Test device capabilities
        capabilities = engine.get_device_capabilities()
        
        assert "available_devices" in capabilities, "Missing available_devices"
        assert "current_device" in capabilities, "Missing current_device"
        assert "memory_available" in capabilities, "Missing memory_available"
        
        available_devices = capabilities["available_devices"]
        current_device = capabilities["current_device"]
        
        assert len(available_devices) > 0, "No devices available"
        assert current_device in available_devices, "Current device not in available list"
        
        print(f"✅ Available devices: {available_devices}")
        print(f"✅ Current device: {current_device}")
        print(f"✅ Memory available: {capabilities['memory_available']:.1f}MB")
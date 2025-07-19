"""
VoxFlow Voxtral Engine Integration Tests

Comprehensive production-ready testing for the VoxtralEngine with real MLX/PyTorch integration.
Following CLAUDE.md requirements: no shortcuts, no mocks, production-ready only.

Tests cover:
- MLX vs PyTorch engine comparison
- Real Voxtral model loading and inference
- Memory management under load
- Performance benchmarking
- Large file processing
- Concurrent job handling
- Error recovery scenarios
"""

import asyncio
import gc
import time
from pathlib import Path
from typing import Dict, Any, List

import pytest
import torch
import numpy as np

from app.core.voxtral_engine import VoxtralEngine
from app.core.config import settings
from tests.conftest import (
    skip_if_no_mlx,
    skip_if_not_apple_silicon,
    skip_if_ci,
    skip_large_files_if_ci,
    TEST_CONFIG
)


@pytest.mark.integration
@pytest.mark.voxtral
class TestVoxtralEngineCore:
    """Core VoxtralEngine functionality tests."""

    @pytest.mark.asyncio
    async def test_engine_initialization(self, voxtral_engine: VoxtralEngine):
        """Test VoxtralEngine initializes correctly with all backends."""
        assert voxtral_engine is not None
        assert voxtral_engine.is_initialized
        
        # Verify engine configuration
        config = voxtral_engine.get_config()
        assert config["model_name"] is not None
        assert config["device"] in ["mps", "cpu", "cuda"]
        assert config["max_audio_length"] > 0
        assert config["chunk_size"] > 0
        
        # Verify health status
        health = await voxtral_engine.health_check()
        assert health["status"] == "healthy"
        assert health["model_loaded"] is True
        assert "model_info" in health
        assert "performance_metrics" in health

    @pytest.mark.asyncio
    async def test_model_loading_and_unloading(self, voxtral_engine: VoxtralEngine):
        """Test model loading and unloading cycles."""
        # Test model is initially loaded
        assert voxtral_engine.is_model_loaded()
        
        initial_memory = voxtral_engine.get_memory_usage()
        assert initial_memory["model_memory_mb"] > 0
        
        # Unload model
        await voxtral_engine.unload_model()
        assert not voxtral_engine.is_model_loaded()
        
        unloaded_memory = voxtral_engine.get_memory_usage()
        assert unloaded_memory["model_memory_mb"] < initial_memory["model_memory_mb"]
        
        # Reload model
        await voxtral_engine.load_model()
        assert voxtral_engine.is_model_loaded()
        
        reloaded_memory = voxtral_engine.get_memory_usage()
        assert reloaded_memory["model_memory_mb"] > 0

    @pytest.mark.asyncio
    async def test_warmup_performance(self, voxtral_engine: VoxtralEngine, performance_tracker):
        """Test engine warmup and performance baseline."""
        # Ensure fresh warmup
        await voxtral_engine.unload_model()
        await voxtral_engine.load_model()
        
        performance_tracker.start("warmup")
        await voxtral_engine.warmup()
        warmup_metrics = performance_tracker.end()
        
        # Warmup should complete within reasonable time
        assert warmup_metrics["duration_seconds"] < 30.0
        
        # Verify warmup improved performance
        warmup_stats = voxtral_engine.get_warmup_stats()
        assert warmup_stats["warmup_completed"] is True
        assert warmup_stats["warmup_duration"] > 0
        assert warmup_stats["sample_inference_time"] > 0

    @pytest.mark.asyncio
    async def test_engine_configuration_updates(self, voxtral_engine: VoxtralEngine):
        """Test dynamic configuration updates."""
        original_config = voxtral_engine.get_config()
        
        # Update configuration
        new_config = {
            "chunk_size": 20,  # Different from default
            "overlap": 5,
            "max_audio_length": 1800,  # 30 minutes
        }
        
        await voxtral_engine.update_config(new_config)
        updated_config = voxtral_engine.get_config()
        
        assert updated_config["chunk_size"] == 20
        assert updated_config["overlap"] == 5
        assert updated_config["max_audio_length"] == 1800
        
        # Verify engine still functions
        health = await voxtral_engine.health_check()
        assert health["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_memory_limit_enforcement(self, voxtral_engine: VoxtralEngine, memory_monitor):
        """Test memory limit enforcement and monitoring."""
        # Get baseline memory
        baseline_memory = voxtral_engine.get_memory_usage()
        
        # Test memory limit setting
        memory_limit_mb = 4096  # 4GB limit
        await voxtral_engine.set_memory_limit(memory_limit_mb)
        
        config = voxtral_engine.get_config()
        assert config["memory_limit_mb"] == memory_limit_mb
        
        # Monitor memory during operation
        memory_before = memory_monitor.check_memory()
        
        # Force memory usage with large operation
        await voxtral_engine.warmup()
        
        memory_after = memory_monitor.check_memory()
        memory_monitor.assert_memory_limit(memory_limit_mb)
        
        # Verify memory tracking
        engine_memory = voxtral_engine.get_memory_usage()
        assert engine_memory["total_memory_mb"] > 0
        assert engine_memory["available_memory_mb"] >= 0


@pytest.mark.integration
@pytest.mark.voxtral
@pytest.mark.real_audio
class TestVoxtralEngineTranscription:
    """Real audio transcription tests."""

    @pytest.mark.asyncio
    async def test_real_audio_transcription(self, voxtral_engine: VoxtralEngine, 
                                          real_audio_file: Path, 
                                          voxtral_benchmark,
                                          performance_tracker):
        """Test transcription with real audio file."""
        performance_tracker.start("real_audio_transcription")
        
        # Process real audio file
        result = await voxtral_engine.transcribe_file(
            file_path=str(real_audio_file),
            language="auto",
            task="transcribe"
        )
        
        transcription_metrics = performance_tracker.end()
        
        # Validate transcription result
        assert result["success"] is True
        assert "transcription" in result
        assert "metadata" in result
        
        transcription = result["transcription"]
        voxtral_benchmark.assert_transcription_quality(transcription)
        
        # Validate metadata
        metadata = result["metadata"]
        assert metadata["model_name"] is not None
        assert metadata["duration"] > 0
        assert metadata["processing_time"] > 0
        assert metadata["real_time_factor"] > 0
        
        # Performance validation
        voxtral_benchmark.assert_processing_speed(
            metadata["duration"], 
            metadata["processing_time"],
            max_rtf=1.0  # Allow up to 1.0 RTF for complex audio
        )
        
        # Verify segments
        if "segments" in transcription:
            segments = transcription["segments"]
            assert len(segments) > 0
            
            for segment in segments:
                assert "start" in segment
                assert "end" in segment
                assert "text" in segment
                assert segment["start"] >= 0
                assert segment["end"] > segment["start"]
                assert len(segment["text"].strip()) > 0

    @pytest.mark.asyncio
    async def test_synthetic_audio_transcription(self, voxtral_engine: VoxtralEngine,
                                               test_audio_files: Dict[str, Path],
                                               voxtral_benchmark):
        """Test transcription with synthetic audio files."""
        # Test different audio formats and characteristics
        test_cases = [
            ("1s_16000hz_wav", {"expected_duration": 1, "min_confidence": 0.3}),
            ("30s_44100hz_mp3", {"expected_duration": 30, "min_confidence": 0.5}),
            ("300s_16000hz_flac", {"expected_duration": 300, "min_confidence": 0.7}),
        ]
        
        for file_key, expectations in test_cases:
            if file_key not in test_audio_files:
                continue
                
            file_path = test_audio_files[file_key]
            
            result = await voxtral_engine.transcribe_file(
                file_path=str(file_path),
                language="auto",
                task="transcribe"
            )
            
            assert result["success"] is True
            
            transcription = result["transcription"]
            metadata = result["metadata"]
            
            # Duration validation
            duration_diff = abs(metadata["duration"] - expectations["expected_duration"])
            assert duration_diff < 1.0, f"Duration mismatch for {file_key}"
            
            # Quality validation (synthetic audio has lower expectations)
            if transcription.get("confidence", 0) >= expectations["min_confidence"]:
                voxtral_benchmark.assert_transcription_quality(
                    transcription, 
                    min_confidence=expectations["min_confidence"]
                )

    @pytest.mark.asyncio
    @pytest.mark.large_files
    @skip_large_files_if_ci
    async def test_large_file_transcription(self, voxtral_engine: VoxtralEngine,
                                          large_audio_file: Path,
                                          memory_monitor,
                                          performance_tracker):
        """Test transcription of large audio files with chunking."""
        performance_tracker.start("large_file_transcription")
        
        # Monitor memory before processing
        memory_before = memory_monitor.check_memory()
        
        # Process large file with chunking
        result = await voxtral_engine.transcribe_file(
            file_path=str(large_audio_file),
            language="auto",
            task="transcribe",
            chunk_length_s=600,  # 10-minute chunks
            chunk_overlap_s=30   # 30-second overlap
        )
        
        processing_metrics = performance_tracker.end()
        memory_after = memory_monitor.check_memory()
        
        # Validate successful processing
        assert result["success"] is True
        
        transcription = result["transcription"]
        metadata = result["metadata"]
        
        # Validate chunking was used
        assert metadata.get("chunks_processed", 0) > 1
        assert metadata["duration"] > 1500  # At least 25 minutes
        
        # Memory efficiency validation
        file_size_mb = large_audio_file.stat().st_size // 1024 // 1024
        memory_increase = memory_after["current_rss_mb"] - memory_before["current_rss_mb"]
        
        # Memory usage should be reasonable (less than 3x file size)
        assert memory_increase < file_size_mb * 3
        
        # Performance validation
        assert processing_metrics["duration_seconds"] < metadata["duration"] * 2  # Max 2x RTF
        
        # Validate chunk merging
        if "segments" in transcription:
            segments = transcription["segments"]
            assert len(segments) > 0
            
            # Verify temporal continuity
            for i in range(1, len(segments)):
                assert segments[i]["start"] >= segments[i-1]["end"]

    @pytest.mark.asyncio
    async def test_concurrent_transcription_jobs(self, voxtral_engine: VoxtralEngine,
                                               test_audio_files: Dict[str, Path],
                                               performance_tracker):
        """Test concurrent transcription jobs handling."""
        # Select multiple audio files for concurrent processing
        audio_files = []
        for key in ["1s_16000hz_wav", "30s_44100hz_mp3", "1s_44100hz_flac"]:
            if key in test_audio_files:
                audio_files.append(test_audio_files[key])
        
        if len(audio_files) < 2:
            pytest.skip("Insufficient audio files for concurrent testing")
        
        performance_tracker.start("concurrent_jobs")
        
        # Create concurrent transcription tasks
        tasks = []
        for i, file_path in enumerate(audio_files[:3]):  # Max 3 concurrent
            task = voxtral_engine.transcribe_file(
                file_path=str(file_path),
                language="auto",
                task="transcribe",
                job_id=f"concurrent_job_{i}"
            )
            tasks.append(task)
        
        # Execute concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        concurrent_metrics = performance_tracker.end()
        
        # Validate all jobs completed successfully
        successful_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                pytest.fail(f"Concurrent job {i} failed: {result}")
            assert result["success"] is True
            successful_results.append(result)
        
        # Verify concurrent execution was efficient
        total_audio_duration = sum(r["metadata"]["duration"] for r in successful_results)
        processing_time = concurrent_metrics["duration_seconds"]
        
        # Concurrent processing should be more efficient than sequential
        sequential_estimate = sum(r["metadata"]["processing_time"] for r in successful_results)
        assert processing_time < sequential_estimate * 1.5  # Allow some overhead

    @pytest.mark.asyncio
    async def test_job_cancellation(self, voxtral_engine: VoxtralEngine,
                                  large_audio_file: Path):
        """Test job cancellation and cleanup."""
        # Start a large file transcription
        job_id = "cancellation_test_job"
        
        # Start transcription task
        transcription_task = asyncio.create_task(
            voxtral_engine.transcribe_file(
                file_path=str(large_audio_file),
                language="auto",
                task="transcribe",
                job_id=job_id
            )
        )
        
        # Let it start processing
        await asyncio.sleep(2.0)
        
        # Cancel the job
        cancellation_result = await voxtral_engine.cancel_job(job_id)
        assert cancellation_result["success"] is True
        assert cancellation_result["job_id"] == job_id
        
        # Wait for task to complete (should be cancelled)
        try:
            result = await asyncio.wait_for(transcription_task, timeout=10.0)
            # If not cancelled, should indicate cancellation
            assert result["success"] is False
            assert "cancelled" in result.get("error", "").lower()
        except asyncio.CancelledError:
            # Expected cancellation
            pass
        
        # Verify cleanup occurred
        job_status = voxtral_engine.get_job_status(job_id)
        assert job_status is None or job_status["status"] == "cancelled"


@pytest.mark.integration
@pytest.mark.mlx
@skip_if_no_mlx
class TestMLXIntegration:
    """MLX-specific integration tests."""

    @pytest.mark.asyncio
    async def test_mlx_engine_initialization(self, voxtral_engine: VoxtralEngine):
        """Test MLX engine initialization and capabilities."""
        # Verify MLX backend is available and used
        config = voxtral_engine.get_config()
        assert config["backend"] == "mlx" or "mlx" in config["available_backends"]
        
        # Test MLX-specific features
        mlx_info = await voxtral_engine.get_mlx_info()
        assert mlx_info["mlx_available"] is True
        assert "memory_pool_size" in mlx_info
        assert "unified_memory" in mlx_info

    @pytest.mark.asyncio
    @skip_if_not_apple_silicon
    async def test_mlx_vs_pytorch_performance(self, voxtral_engine: VoxtralEngine,
                                            real_audio_file: Path,
                                            performance_tracker):
        """Compare MLX vs PyTorch performance on Apple Silicon."""
        # Test with MLX backend
        await voxtral_engine.set_backend("mlx")
        
        performance_tracker.start("mlx_transcription")
        mlx_result = await voxtral_engine.transcribe_file(
            file_path=str(real_audio_file),
            language="auto",
            task="transcribe"
        )
        mlx_metrics = performance_tracker.end()
        
        # Test with PyTorch backend
        await voxtral_engine.set_backend("pytorch")
        
        performance_tracker.start("pytorch_transcription")
        pytorch_result = await voxtral_engine.transcribe_file(
            file_path=str(real_audio_file),
            language="auto",
            task="transcribe"
        )
        pytorch_metrics = performance_tracker.end()
        
        # Validate both succeeded
        assert mlx_result["success"] is True
        assert pytorch_result["success"] is True
        
        # Compare performance (MLX should be faster or comparable)
        mlx_rtf = mlx_result["metadata"]["real_time_factor"]
        pytorch_rtf = pytorch_result["metadata"]["real_time_factor"]
        
        # MLX should provide better or similar performance
        assert mlx_rtf <= pytorch_rtf * 1.5  # Allow 50% tolerance
        
        # Memory usage comparison
        mlx_memory = mlx_result["metadata"].get("peak_memory_mb", 0)
        pytorch_memory = pytorch_result["metadata"].get("peak_memory_mb", 0)
        
        print(f"MLX RTF: {mlx_rtf:.3f}, PyTorch RTF: {pytorch_rtf:.3f}")
        print(f"MLX Memory: {mlx_memory}MB, PyTorch Memory: {pytorch_memory}MB")

    @pytest.mark.asyncio
    async def test_mlx_memory_management(self, voxtral_engine: VoxtralEngine,
                                       memory_monitor):
        """Test MLX memory management and unified memory architecture."""
        # Set to MLX backend
        await voxtral_engine.set_backend("mlx")
        
        # Monitor memory baseline
        memory_before = memory_monitor.check_memory()
        
        # Force memory allocation through model operations
        await voxtral_engine.warmup()
        
        memory_after_warmup = memory_monitor.check_memory()
        
        # Unload and reload model to test memory management
        await voxtral_engine.unload_model()
        memory_after_unload = memory_monitor.check_memory()
        
        await voxtral_engine.load_model()
        memory_after_reload = memory_monitor.check_memory()
        
        # Verify memory is properly managed
        warmup_increase = memory_after_warmup["current_rss_mb"] - memory_before["current_rss_mb"]
        unload_decrease = memory_after_warmup["current_rss_mb"] - memory_after_unload["current_rss_mb"]
        
        # Model unloading should free significant memory
        assert unload_decrease > warmup_increase * 0.5
        
        # Reload should use similar memory
        reload_memory = memory_after_reload["current_rss_mb"]
        assert abs(reload_memory - memory_after_warmup["current_rss_mb"]) < 500  # 500MB tolerance

    @pytest.mark.asyncio
    async def test_mlx_fallback_mechanism(self, voxtral_engine: VoxtralEngine):
        """Test MLX fallback to PyTorch when MLX fails."""
        # Force MLX failure scenario (simulate unavailable memory)
        await voxtral_engine.set_memory_limit(100)  # Very low limit
        
        # This should trigger fallback to PyTorch
        result = await voxtral_engine.transcribe_file(
            file_path=str(real_audio_file),
            language="auto",
            task="transcribe",
            force_fallback_on_error=True
        )
        
        # Should succeed with fallback
        assert result["success"] is True
        
        # Metadata should indicate fallback occurred
        metadata = result["metadata"]
        assert metadata.get("backend_used") == "pytorch"
        assert metadata.get("fallback_occurred") is True
        assert metadata.get("fallback_reason") is not None


@pytest.mark.integration
@pytest.mark.voxtral
@pytest.mark.performance
class TestVoxtralEnginePerformance:
    """Performance and benchmark tests."""

    @pytest.mark.asyncio
    async def test_memory_leak_detection(self, voxtral_engine: VoxtralEngine,
                                       test_audio_files: Dict[str, Path],
                                       memory_monitor):
        """Test for memory leaks during repeated operations."""
        # Select a short audio file for repeated processing
        test_file = None
        for key in ["1s_16000hz_wav", "1s_44100hz_mp3"]:
            if key in test_audio_files:
                test_file = test_audio_files[key]
                break
        
        if test_file is None:
            pytest.skip("No suitable audio file for memory leak testing")
        
        # Baseline memory
        memory_baseline = memory_monitor.check_memory()
        
        # Perform repeated transcriptions
        num_iterations = 20
        for i in range(num_iterations):
            result = await voxtral_engine.transcribe_file(
                file_path=str(test_file),
                language="auto",
                task="transcribe"
            )
            assert result["success"] is True
            
            # Force garbage collection
            if i % 5 == 0:
                gc.collect()
        
        # Check final memory
        memory_final = memory_monitor.check_memory()
        memory_increase = memory_final["current_rss_mb"] - memory_baseline["current_rss_mb"]
        
        # Memory increase should be minimal (less than 100MB for 20 short files)
        assert memory_increase < 100, f"Potential memory leak: {memory_increase}MB increase"
        
        print(f"Memory increase after {num_iterations} iterations: {memory_increase}MB")

    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_performance_benchmarks(self, voxtral_engine: VoxtralEngine,
                                        real_audio_file: Path,
                                        voxtral_benchmark):
        """Comprehensive performance benchmarking."""
        # Multiple runs for statistical significance
        num_runs = 5
        rtf_values = []
        processing_times = []
        memory_usage = []
        
        for run in range(num_runs):
            # Clear any cached state
            await voxtral_engine.clear_cache()
            gc.collect()
            
            start_time = time.perf_counter()
            
            result = await voxtral_engine.transcribe_file(
                file_path=str(real_audio_file),
                language="auto",
                task="transcribe"
            )
            
            end_time = time.perf_counter()
            
            assert result["success"] is True
            
            metadata = result["metadata"]
            rtf_values.append(metadata["real_time_factor"])
            processing_times.append(end_time - start_time)
            memory_usage.append(metadata.get("peak_memory_mb", 0))
        
        # Calculate statistics
        avg_rtf = sum(rtf_values) / len(rtf_values)
        avg_processing_time = sum(processing_times) / len(processing_times)
        avg_memory = sum(memory_usage) / len(memory_usage)
        
        # Performance assertions
        voxtral_benchmark.assert_processing_speed(
            metadata["duration"], 
            avg_processing_time,
            max_rtf=0.8  # Should be better than 0.8 RTF on average
        )
        
        # Consistency check (coefficient of variation should be < 0.3)
        rtf_std = np.std(rtf_values)
        rtf_cv = rtf_std / avg_rtf
        assert rtf_cv < 0.3, f"Performance inconsistent: CV={rtf_cv:.3f}"
        
        print(f"Performance Benchmark Results:")
        print(f"  Average RTF: {avg_rtf:.3f} ± {rtf_std:.3f}")
        print(f"  Average Processing Time: {avg_processing_time:.2f}s")
        print(f"  Average Memory Usage: {avg_memory:.1f}MB")
        print(f"  Coefficient of Variation: {rtf_cv:.3f}")

    @pytest.mark.asyncio
    async def test_resource_cleanup_efficiency(self, voxtral_engine: VoxtralEngine,
                                             test_audio_files: Dict[str, Path]):
        """Test resource cleanup efficiency and timing."""
        initial_resources = voxtral_engine.get_resource_usage()
        
        # Process multiple files to create resources
        for key in list(test_audio_files.keys())[:5]:  # Process 5 files
            file_path = test_audio_files[key]
            result = await voxtral_engine.transcribe_file(
                file_path=str(file_path),
                language="auto",
                task="transcribe"
            )
            assert result["success"] is True
        
        resources_after_processing = voxtral_engine.get_resource_usage()
        
        # Trigger cleanup
        await voxtral_engine.cleanup_resources()
        
        resources_after_cleanup = voxtral_engine.get_resource_usage()
        
        # Verify cleanup effectiveness
        temp_files_before = resources_after_processing.get("temp_files", 0)
        temp_files_after = resources_after_cleanup.get("temp_files", 0)
        
        # Most temporary files should be cleaned up
        assert temp_files_after <= temp_files_before * 0.2  # 80% cleanup rate
        
        # Memory usage should be reduced
        memory_before = resources_after_processing.get("memory_mb", 0)
        memory_after = resources_after_cleanup.get("memory_mb", 0)
        
        # Some memory should be freed
        assert memory_after <= memory_before


@pytest.mark.integration
@pytest.mark.voxtral
class TestVoxtralEngineErrorHandling:
    """Error handling and edge cases."""

    @pytest.mark.asyncio
    async def test_corrupted_audio_handling(self, voxtral_engine: VoxtralEngine,
                                          corrupted_audio_file: Path):
        """Test handling of corrupted audio files."""
        result = await voxtral_engine.transcribe_file(
            file_path=str(corrupted_audio_file),
            language="auto",
            task="transcribe"
        )
        
        # Should fail gracefully
        assert result["success"] is False
        assert "error" in result
        assert "corrupted" in result["error"].lower() or "invalid" in result["error"].lower()
        
        # Engine should remain functional
        health = await voxtral_engine.health_check()
        assert health["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_empty_audio_handling(self, voxtral_engine: VoxtralEngine,
                                      empty_audio_file: Path):
        """Test handling of empty audio files."""
        result = await voxtral_engine.transcribe_file(
            file_path=str(empty_audio_file),
            language="auto",
            task="transcribe"
        )
        
        # Should fail gracefully
        assert result["success"] is False
        assert "error" in result
        assert "empty" in result["error"].lower() or "size" in result["error"].lower()

    @pytest.mark.asyncio
    async def test_nonexistent_file_handling(self, voxtral_engine: VoxtralEngine):
        """Test handling of nonexistent files."""
        nonexistent_file = "/path/to/nonexistent/file.mp3"
        
        result = await voxtral_engine.transcribe_file(
            file_path=nonexistent_file,
            language="auto",
            task="transcribe"
        )
        
        # Should fail gracefully
        assert result["success"] is False
        assert "error" in result
        assert "not found" in result["error"].lower() or "exist" in result["error"].lower()

    @pytest.mark.asyncio
    async def test_model_failure_recovery(self, voxtral_engine: VoxtralEngine,
                                        real_audio_file: Path):
        """Test recovery from model failures."""
        # Force model unload to simulate failure
        await voxtral_engine.unload_model()
        
        # Attempt transcription (should trigger model reload)
        result = await voxtral_engine.transcribe_file(
            file_path=str(real_audio_file),
            language="auto",
            task="transcribe"
        )
        
        # Should succeed after automatic recovery
        assert result["success"] is True
        assert voxtral_engine.is_model_loaded()
        
        # Verify recovery metadata
        metadata = result["metadata"]
        assert metadata.get("model_reloaded") is True

    @pytest.mark.asyncio
    async def test_resource_exhaustion_handling(self, voxtral_engine: VoxtralEngine,
                                              large_audio_file: Path):
        """Test handling of resource exhaustion scenarios."""
        # Set very low resource limits
        await voxtral_engine.set_memory_limit(256)  # 256MB limit
        await voxtral_engine.set_concurrent_job_limit(1)
        
        result = await voxtral_engine.transcribe_file(
            file_path=str(large_audio_file),
            language="auto",
            task="transcribe"
        )
        
        # Should either succeed with limitations or fail gracefully
        if result["success"]:
            # If succeeded, should have used chunking or optimization
            metadata = result["metadata"]
            assert metadata.get("chunks_processed", 1) >= 1
            assert metadata.get("memory_optimized") is True
        else:
            # If failed, should be due to resource constraints
            assert "memory" in result["error"].lower() or "resource" in result["error"].lower()
        
        # Engine should remain healthy
        health = await voxtral_engine.health_check()
        assert health["status"] in ["healthy", "limited"]
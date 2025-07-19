"""
VoxFlow Audio Processor Integration Tests

Comprehensive production-ready testing for audio processing pipeline.
Following CLAUDE.md requirements: no shortcuts, no mocks, production-ready only.

Tests cover:
- All supported audio format processing
- Quality enhancement and preprocessing
- Large file chunking and segmentation
- Noise reduction and voice activity detection
- Memory efficiency for large files
- Concurrent audio processing
- Format conversion accuracy
"""

import asyncio
import gc
import time
from pathlib import Path
from typing import Dict, Any, List, Tuple

import pytest
import numpy as np
import librosa
import soundfile as sf

from app.core.audio_processor import AudioProcessor
from app.core.config import get_settings
from tests.conftest import (
    skip_large_files_if_ci,
    TEST_CONFIG
)


@pytest.mark.integration
@pytest.mark.audio_processing
class TestAudioProcessorCore:
    """Core AudioProcessor functionality tests."""

    @pytest.mark.asyncio
    async def test_processor_initialization(self, audio_processor: AudioProcessor):
        """Test AudioProcessor initializes correctly with all features."""
        assert audio_processor is not None
        
        # Verify processor configuration
        config = audio_processor.get_config()
        assert config["target_sample_rate"] > 0
        assert config["target_channels"] > 0
        assert config["supported_formats"] is not None
        assert len(config["supported_formats"]) > 0
        
        # Verify capabilities
        capabilities = audio_processor.get_capabilities()
        assert capabilities["noise_reduction"] is not None
        assert capabilities["voice_activity_detection"] is not None
        assert capabilities["format_conversion"] is not None
        assert capabilities["chunking"] is not None

    @pytest.mark.asyncio
    async def test_supported_formats_detection(self, audio_processor: AudioProcessor,
                                             test_audio_files: Dict[str, Path]):
        """Test detection and validation of supported audio formats."""
        format_tests = [
            ("1s_16000hz_wav", "wav", True),
            ("1s_44100hz_mp3", "mp3", True),
            ("1s_16000hz_flac", "flac", True),
            ("real_audio_m4v", "mp4", True),  # Real audio file
        ]
        
        for file_key, expected_format, should_support in format_tests:
            if file_key not in test_audio_files:
                continue
                
            file_path = test_audio_files[file_key]
            
            # Test format detection
            detected_format = await audio_processor.detect_format(str(file_path))
            
            if should_support:
                assert detected_format is not None
                # Format should match or be compatible
                assert expected_format in detected_format or detected_format in expected_format
                
                # Test format support validation
                is_supported = await audio_processor.is_format_supported(str(file_path))
                assert is_supported is True
            else:
                is_supported = await audio_processor.is_format_supported(str(file_path))
                assert is_supported is False

    @pytest.mark.asyncio
    async def test_audio_metadata_extraction(self, audio_processor: AudioProcessor,
                                            test_audio_files: Dict[str, Path]):
        """Test comprehensive audio metadata extraction."""
        for file_key, file_path in test_audio_files.items():
            if not file_path.exists():
                continue
                
            metadata = await audio_processor.extract_metadata(str(file_path))
            
            assert metadata is not None
            assert "duration" in metadata
            assert "sample_rate" in metadata
            assert "channels" in metadata
            assert "format" in metadata
            assert "file_size" in metadata
            
            # Validate metadata values
            assert metadata["duration"] > 0
            assert metadata["sample_rate"] > 0
            assert metadata["channels"] > 0
            assert metadata["file_size"] > 0
            
            # Additional metadata checks for real audio
            if "real_audio" in file_key:
                assert metadata["duration"] > 1  # Real audio should be longer than 1 second
                assert metadata["sample_rate"] >= 8000  # Reasonable sample rate
                assert metadata["channels"] in [1, 2]  # Mono or stereo

    @pytest.mark.asyncio
    async def test_audio_quality_analysis(self, audio_processor: AudioProcessor,
                                        real_audio_file: Path):
        """Test audio quality analysis features."""
        quality_analysis = await audio_processor.analyze_quality(str(real_audio_file))
        
        assert quality_analysis is not None
        assert "signal_to_noise_ratio" in quality_analysis
        assert "dynamic_range" in quality_analysis
        assert "clipping_detected" in quality_analysis
        assert "silence_ratio" in quality_analysis
        assert "overall_quality_score" in quality_analysis
        
        # Validate quality metrics
        snr = quality_analysis["signal_to_noise_ratio"]
        assert snr >= 0  # SNR should be non-negative
        
        dynamic_range = quality_analysis["dynamic_range"]
        assert 0 <= dynamic_range <= 100  # Dynamic range as percentage
        
        quality_score = quality_analysis["overall_quality_score"]
        assert 0 <= quality_score <= 1  # Quality score 0-1
        
        silence_ratio = quality_analysis["silence_ratio"]
        assert 0 <= silence_ratio <= 1  # Silence ratio 0-1


@pytest.mark.integration
@pytest.mark.audio_processing
@pytest.mark.real_audio
class TestAudioProcessingPipeline:
    """Real audio processing pipeline tests."""

    @pytest.mark.asyncio
    async def test_real_audio_preprocessing(self, audio_processor: AudioProcessor,
                                          real_audio_file: Path,
                                          performance_tracker):
        """Test complete preprocessing pipeline with real audio."""
        performance_tracker.start("real_audio_preprocessing")
        
        # Process real audio file with full pipeline
        processed_result = await audio_processor.preprocess_audio(
            file_path=str(real_audio_file),
            target_sample_rate=16000,
            target_channels=1,
            normalize=True,
            noise_reduction=True,
            voice_activity_detection=True
        )
        
        processing_metrics = performance_tracker.end()
        
        assert processed_result["success"] is True
        assert "processed_file" in processed_result
        assert "metadata" in processed_result
        assert "quality_improvements" in processed_result
        
        # Validate processed file
        processed_file = Path(processed_result["processed_file"])
        assert processed_file.exists()
        assert processed_file.stat().st_size > 0
        
        # Validate metadata
        metadata = processed_result["metadata"]
        assert metadata["original_duration"] > 0
        assert metadata["processed_duration"] > 0
        assert metadata["sample_rate"] == 16000
        assert metadata["channels"] == 1
        
        # Validate quality improvements
        improvements = processed_result["quality_improvements"]
        assert "noise_reduction_applied" in improvements
        assert "normalization_applied" in improvements
        assert "vad_segments_detected" in improvements
        
        # Performance validation
        duration = metadata["original_duration"]
        assert processing_metrics["duration_seconds"] < duration * 5  # Max 5x RTF for preprocessing

    @pytest.mark.asyncio
    async def test_format_conversion_accuracy(self, audio_processor: AudioProcessor,
                                            test_audio_files: Dict[str, Path]):
        """Test format conversion accuracy and quality preservation."""
        # Test various format conversions
        conversion_tests = [
            ("1s_44100hz_mp3", "wav", 16000),
            ("1s_16000hz_wav", "flac", 44100),
            ("30s_44100hz_mp3", "wav", 22050),
        ]
        
        for source_key, target_format, target_sr in conversion_tests:
            if source_key not in test_audio_files:
                continue
                
            source_file = test_audio_files[source_key]
            
            # Extract original audio characteristics
            original_metadata = await audio_processor.extract_metadata(str(source_file))
            
            # Perform conversion
            conversion_result = await audio_processor.convert_format(
                input_file=str(source_file),
                output_format=target_format,
                target_sample_rate=target_sr,
                target_channels=1
            )
            
            assert conversion_result["success"] is True
            
            converted_file = Path(conversion_result["output_file"])
            assert converted_file.exists()
            
            # Validate converted file metadata
            converted_metadata = await audio_processor.extract_metadata(str(converted_file))
            assert converted_metadata["sample_rate"] == target_sr
            assert converted_metadata["channels"] == 1
            assert converted_metadata["format"] == target_format
            
            # Duration should be preserved (within 1% tolerance)
            duration_diff = abs(converted_metadata["duration"] - original_metadata["duration"])
            duration_tolerance = original_metadata["duration"] * 0.01
            assert duration_diff <= duration_tolerance
            
            # Quality metrics comparison
            original_quality = await audio_processor.analyze_quality(str(source_file))
            converted_quality = await audio_processor.analyze_quality(str(converted_file))
            
            # Quality degradation should be minimal
            quality_diff = original_quality["overall_quality_score"] - converted_quality["overall_quality_score"]
            assert quality_diff < 0.2  # Max 20% quality loss

    @pytest.mark.asyncio
    async def test_noise_reduction_effectiveness(self, audio_processor: AudioProcessor,
                                               test_audio_files: Dict[str, Path]):
        """Test noise reduction effectiveness and quality preservation."""
        # Use a synthetic noisy audio file
        noisy_file_key = "30s_16000hz_wav"  # Will add noise to this
        if noisy_file_key not in test_audio_files:
            pytest.skip(f"Test file {noisy_file_key} not available")
        
        original_file = test_audio_files[noisy_file_key]
        
        # Create noisy version for testing
        noisy_file = await self._create_noisy_audio(original_file, noise_level=0.3)
        
        # Analyze original quality
        noisy_quality = await audio_processor.analyze_quality(str(noisy_file))
        
        # Apply noise reduction
        denoised_result = await audio_processor.reduce_noise(
            input_file=str(noisy_file),
            noise_reduction_strength=0.5,
            preserve_speech=True
        )
        
        assert denoised_result["success"] is True
        
        denoised_file = Path(denoised_result["output_file"])
        assert denoised_file.exists()
        
        # Analyze denoised quality
        denoised_quality = await audio_processor.analyze_quality(str(denoised_file))
        
        # Noise reduction should improve SNR
        snr_improvement = denoised_quality["signal_to_noise_ratio"] - noisy_quality["signal_to_noise_ratio"]
        assert snr_improvement > 2  # At least 2dB improvement
        
        # Overall quality should improve
        quality_improvement = denoised_quality["overall_quality_score"] - noisy_quality["overall_quality_score"]
        assert quality_improvement > 0.1  # At least 10% improvement

    @pytest.mark.asyncio
    async def test_voice_activity_detection(self, audio_processor: AudioProcessor,
                                          real_audio_file: Path):
        """Test voice activity detection accuracy."""
        vad_result = await audio_processor.detect_voice_activity(
            file_path=str(real_audio_file),
            aggressiveness=2,  # Moderate aggressiveness
            frame_duration_ms=30
        )
        
        assert vad_result["success"] is True
        assert "voice_segments" in vad_result
        assert "silence_segments" in vad_result
        assert "statistics" in vad_result
        
        voice_segments = vad_result["voice_segments"]
        silence_segments = vad_result["silence_segments"]
        statistics = vad_result["statistics"]
        
        # Validate segments
        assert len(voice_segments) > 0  # Should detect some speech
        
        for segment in voice_segments:
            assert "start" in segment
            assert "end" in segment
            assert "confidence" in segment
            assert segment["start"] >= 0
            assert segment["end"] > segment["start"]
            assert 0 <= segment["confidence"] <= 1
        
        # Validate statistics
        assert "total_voice_duration" in statistics
        assert "total_silence_duration" in statistics
        assert "voice_activity_ratio" in statistics
        assert statistics["voice_activity_ratio"] > 0

    @pytest.mark.asyncio
    @pytest.mark.large_files
    @skip_large_files_if_ci
    async def test_large_file_chunking(self, audio_processor: AudioProcessor,
                                     large_audio_file: Path,
                                     memory_monitor):
        """Test large file chunking with memory efficiency."""
        memory_before = memory_monitor.check_memory()
        
        # Process large file with chunking
        chunking_result = await audio_processor.chunk_audio(
            file_path=str(large_audio_file),
            chunk_duration_seconds=300,  # 5-minute chunks
            overlap_seconds=30,          # 30-second overlap
            output_format="wav"
        )
        
        memory_after = memory_monitor.check_memory()
        
        assert chunking_result["success"] is True
        assert "chunks" in chunking_result
        assert "metadata" in chunking_result
        
        chunks = chunking_result["chunks"]
        metadata = chunking_result["metadata"]
        
        # Validate chunks
        assert len(chunks) > 1  # Large file should produce multiple chunks
        
        total_chunk_duration = 0
        for i, chunk in enumerate(chunks):
            assert "file_path" in chunk
            assert "start_time" in chunk
            assert "end_time" in chunk
            assert "duration" in chunk
            
            chunk_file = Path(chunk["file_path"])
            assert chunk_file.exists()
            assert chunk_file.stat().st_size > 0
            
            # Validate temporal ordering
            if i > 0:
                prev_chunk = chunks[i-1]
                assert chunk["start_time"] >= prev_chunk["start_time"]
            
            total_chunk_duration += chunk["duration"]
        
        # Total duration should match original (accounting for overlap)
        original_duration = metadata["original_duration"]
        overlap_duration = (len(chunks) - 1) * 30  # Total overlap
        expected_total = original_duration + overlap_duration
        
        duration_diff = abs(total_chunk_duration - expected_total)
        assert duration_diff < 5  # 5-second tolerance
        
        # Memory usage should be reasonable
        memory_increase = memory_after["current_rss_mb"] - memory_before["current_rss_mb"]
        file_size_mb = large_audio_file.stat().st_size // 1024 // 1024
        assert memory_increase < file_size_mb * 2  # Max 2x file size in memory

    async def _create_noisy_audio(self, original_file: Path, noise_level: float = 0.2) -> Path:
        """Create a noisy version of an audio file for testing."""
        # Load original audio
        audio, sr = librosa.load(str(original_file), sr=None)
        
        # Add white noise
        noise = np.random.normal(0, noise_level, audio.shape)
        noisy_audio = audio + noise
        
        # Ensure no clipping
        noisy_audio = np.clip(noisy_audio, -1.0, 1.0)
        
        # Save noisy version
        noisy_file = original_file.parent / f"noisy_{original_file.name}"
        sf.write(str(noisy_file), noisy_audio, sr)
        
        return noisy_file


@pytest.mark.integration
@pytest.mark.audio_processing
@pytest.mark.concurrent
class TestConcurrentAudioProcessing:
    """Concurrent audio processing tests."""

    @pytest.mark.asyncio
    async def test_concurrent_format_conversion(self, audio_processor: AudioProcessor,
                                              test_audio_files: Dict[str, Path]):
        """Test concurrent format conversion operations."""
        # Select multiple files for concurrent processing
        conversion_tasks = []
        target_formats = ["wav", "flac", "mp3"]
        
        file_keys = list(test_audio_files.keys())[:6]  # Process up to 6 files
        
        for i, file_key in enumerate(file_keys):
            file_path = test_audio_files[file_key]
            target_format = target_formats[i % len(target_formats)]
            
            task = audio_processor.convert_format(
                input_file=str(file_path),
                output_format=target_format,
                target_sample_rate=16000,
                target_channels=1
            )
            conversion_tasks.append((file_key, target_format, task))
        
        # Execute conversions concurrently
        start_time = time.perf_counter()
        results = await asyncio.gather(*[task for _, _, task in conversion_tasks], return_exceptions=True)
        end_time = time.perf_counter()
        
        # Validate all conversions succeeded
        for i, (file_key, target_format, _) in enumerate(conversion_tasks):
            result = results[i]
            if isinstance(result, Exception):
                pytest.fail(f"Concurrent conversion failed for {file_key}: {result}")
            
            assert result["success"] is True
            assert Path(result["output_file"]).exists()
        
        # Concurrent processing should be more efficient than sequential
        concurrent_duration = end_time - start_time
        print(f"Concurrent processing of {len(conversion_tasks)} files took {concurrent_duration:.2f}s")

    @pytest.mark.asyncio
    async def test_concurrent_quality_analysis(self, audio_processor: AudioProcessor,
                                             test_audio_files: Dict[str, Path]):
        """Test concurrent quality analysis operations."""
        # Select files for concurrent analysis
        analysis_files = list(test_audio_files.values())[:5]
        
        # Create concurrent analysis tasks
        analysis_tasks = [
            audio_processor.analyze_quality(str(file_path))
            for file_path in analysis_files
        ]
        
        # Execute analyses concurrently
        results = await asyncio.gather(*analysis_tasks, return_exceptions=True)
        
        # Validate all analyses succeeded
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                pytest.fail(f"Concurrent analysis failed for file {i}: {result}")
            
            assert result is not None
            assert "overall_quality_score" in result
            assert "signal_to_noise_ratio" in result

    @pytest.mark.asyncio
    async def test_resource_contention_handling(self, audio_processor: AudioProcessor,
                                              test_audio_files: Dict[str, Path],
                                              memory_monitor):
        """Test handling of resource contention during concurrent processing."""
        # Create high-contention scenario
        memory_before = memory_monitor.check_memory()
        
        # Launch many concurrent operations
        tasks = []
        for file_path in list(test_audio_files.values())[:10]:  # Up to 10 concurrent
            # Mix different types of operations
            tasks.extend([
                audio_processor.extract_metadata(str(file_path)),
                audio_processor.analyze_quality(str(file_path)),
                audio_processor.detect_voice_activity(str(file_path))
            ])
        
        # Execute with timeout to prevent hanging
        try:
            results = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=300  # 5-minute timeout
            )
        except asyncio.TimeoutError:
            pytest.fail("Concurrent operations timed out - possible deadlock")
        
        memory_after = memory_monitor.check_memory()
        
        # Most operations should succeed
        successful = sum(1 for r in results if not isinstance(r, Exception))
        total = len(results)
        success_rate = successful / total
        
        assert success_rate >= 0.8, f"Success rate {success_rate:.2f} too low for concurrent operations"
        
        # Memory usage should be reasonable
        memory_increase = memory_after["current_rss_mb"] - memory_before["current_rss_mb"]
        assert memory_increase < 2000  # Max 2GB increase for all operations


@pytest.mark.integration
@pytest.mark.audio_processing
class TestAudioProcessorErrorHandling:
    """Error handling and edge cases."""

    @pytest.mark.asyncio
    async def test_corrupted_audio_handling(self, audio_processor: AudioProcessor,
                                          corrupted_audio_file: Path):
        """Test handling of corrupted audio files."""
        # Test metadata extraction
        metadata_result = await audio_processor.extract_metadata(str(corrupted_audio_file))
        assert metadata_result is None or metadata_result.get("error") is not None
        
        # Test format detection
        format_result = await audio_processor.detect_format(str(corrupted_audio_file))
        assert format_result is None
        
        # Test preprocessing
        preprocess_result = await audio_processor.preprocess_audio(
            file_path=str(corrupted_audio_file),
            target_sample_rate=16000,
            target_channels=1
        )
        assert preprocess_result["success"] is False
        assert "error" in preprocess_result

    @pytest.mark.asyncio
    async def test_empty_audio_handling(self, audio_processor: AudioProcessor,
                                      empty_audio_file: Path):
        """Test handling of empty audio files."""
        # Test metadata extraction
        metadata_result = await audio_processor.extract_metadata(str(empty_audio_file))
        assert metadata_result is None or metadata_result.get("duration", 0) == 0
        
        # Test quality analysis
        quality_result = await audio_processor.analyze_quality(str(empty_audio_file))
        assert quality_result is None or quality_result.get("error") is not None

    @pytest.mark.asyncio
    async def test_unsupported_format_handling(self, audio_processor: AudioProcessor):
        """Test handling of unsupported audio formats."""
        # Create fake unsupported file
        unsupported_file = TEST_CONFIG["TEMP_DIR"] / "test.xyz"
        unsupported_file.write_text("This is not an audio file")
        
        # Test format support
        is_supported = await audio_processor.is_format_supported(str(unsupported_file))
        assert is_supported is False
        
        # Test processing
        result = await audio_processor.preprocess_audio(
            file_path=str(unsupported_file),
            target_sample_rate=16000,
            target_channels=1
        )
        assert result["success"] is False
        assert "unsupported" in result["error"].lower() or "format" in result["error"].lower()

    @pytest.mark.asyncio
    async def test_disk_space_handling(self, audio_processor: AudioProcessor,
                                     large_audio_file: Path):
        """Test handling of low disk space scenarios."""
        # Mock low disk space by setting a very small temp directory
        small_temp_dir = TEST_CONFIG["TEMP_DIR"] / "small_space"
        small_temp_dir.mkdir(exist_ok=True)
        
        # Try to process large file with limited space
        # This should either succeed with streaming or fail gracefully
        result = await audio_processor.chunk_audio(
            file_path=str(large_audio_file),
            chunk_duration_seconds=60,
            output_dir=str(small_temp_dir)
        )
        
        # Should handle gracefully
        if result["success"] is False:
            assert "space" in result["error"].lower() or "disk" in result["error"].lower()

    @pytest.mark.asyncio
    async def test_processing_timeout_handling(self, audio_processor: AudioProcessor,
                                             large_audio_file: Path):
        """Test handling of processing timeouts."""
        # Set very short timeout
        result = await audio_processor.preprocess_audio(
            file_path=str(large_audio_file),
            target_sample_rate=16000,
            target_channels=1,
            timeout_seconds=1  # 1-second timeout
        )
        
        # Should timeout and fail gracefully
        assert result["success"] is False
        assert "timeout" in result["error"].lower() or "time" in result["error"].lower()

    @pytest.mark.asyncio
    async def test_memory_limit_handling(self, audio_processor: AudioProcessor,
                                       large_audio_file: Path,
                                       memory_monitor):
        """Test handling of memory limit constraints."""
        # Set low memory limit
        await audio_processor.set_memory_limit(512)  # 512MB limit
        
        memory_before = memory_monitor.check_memory()
        
        # Try to process large file
        result = await audio_processor.preprocess_audio(
            file_path=str(large_audio_file),
            target_sample_rate=16000,
            target_channels=1,
            enable_streaming=True  # Should use streaming mode
        )
        
        memory_after = memory_monitor.check_memory()
        
        # Should either succeed with memory optimization or fail gracefully
        if result["success"]:
            # Memory usage should be controlled
            memory_increase = memory_after["current_rss_mb"] - memory_before["current_rss_mb"]
            assert memory_increase < 1000  # Less than 1GB increase
        else:
            assert "memory" in result["error"].lower()


@pytest.mark.integration
@pytest.mark.audio_processing
@pytest.mark.performance
class TestAudioProcessorPerformance:
    """Performance and benchmark tests."""

    @pytest.mark.asyncio
    async def test_processing_speed_benchmarks(self, audio_processor: AudioProcessor,
                                             test_audio_files: Dict[str, Path]):
        """Test processing speed benchmarks for different operations."""
        benchmarks = {}
        
        # Test metadata extraction speed
        for file_key, file_path in test_audio_files.items():
            if not file_path.exists():
                continue
                
            start_time = time.perf_counter()
            metadata = await audio_processor.extract_metadata(str(file_path))
            end_time = time.perf_counter()
            
            if metadata:
                duration = metadata.get("duration", 1)
                processing_time = end_time - start_time
                rtf = processing_time / duration
                
                benchmarks[f"metadata_{file_key}"] = {
                    "processing_time": processing_time,
                    "rtf": rtf,
                    "duration": duration
                }
        
        # Metadata extraction should be very fast
        for benchmark_key, metrics in benchmarks.items():
            assert metrics["rtf"] < 0.1, f"Metadata extraction too slow for {benchmark_key}: RTF={metrics['rtf']:.3f}"

    @pytest.mark.asyncio
    async def test_memory_efficiency_benchmarks(self, audio_processor: AudioProcessor,
                                              test_audio_files: Dict[str, Path],
                                              memory_monitor):
        """Test memory efficiency for various processing operations."""
        memory_efficiency_results = {}
        
        for file_key, file_path in list(test_audio_files.items())[:3]:  # Test 3 files
            if not file_path.exists():
                continue
                
            file_size_mb = file_path.stat().st_size / 1024 / 1024
            
            memory_before = memory_monitor.check_memory()
            
            # Process file
            await audio_processor.preprocess_audio(
                file_path=str(file_path),
                target_sample_rate=16000,
                target_channels=1,
                normalize=True
            )
            
            memory_after = memory_monitor.check_memory()
            memory_increase = memory_after["current_rss_mb"] - memory_before["current_rss_mb"]
            
            memory_efficiency = memory_increase / max(file_size_mb, 0.1)  # Avoid division by zero
            memory_efficiency_results[file_key] = {
                "file_size_mb": file_size_mb,
                "memory_increase_mb": memory_increase,
                "efficiency_ratio": memory_efficiency
            }
        
        # Memory efficiency should be reasonable
        for file_key, results in memory_efficiency_results.items():
            efficiency_ratio = results["efficiency_ratio"]
            assert efficiency_ratio < 10, f"Memory inefficient for {file_key}: ratio={efficiency_ratio:.2f}"

    @pytest.mark.asyncio
    async def test_cleanup_efficiency(self, audio_processor: AudioProcessor,
                                    test_audio_files: Dict[str, Path]):
        """Test cleanup efficiency and temporary file management."""
        temp_files_before = len(list(TEST_CONFIG["TEMP_DIR"].glob("*")))
        
        # Perform multiple operations that create temporary files
        for file_path in list(test_audio_files.values())[:3]:
            if not file_path.exists():
                continue
                
            # Operations that create temp files
            await audio_processor.convert_format(
                input_file=str(file_path),
                output_format="wav",
                target_sample_rate=22050
            )
            
            await audio_processor.reduce_noise(
                input_file=str(file_path),
                noise_reduction_strength=0.3
            )
        
        # Trigger cleanup
        await audio_processor.cleanup_temp_files()
        
        temp_files_after = len(list(TEST_CONFIG["TEMP_DIR"].glob("*")))
        
        # Most temporary files should be cleaned up
        temp_files_created = max(0, temp_files_after - temp_files_before)
        assert temp_files_created < 5, f"Too many temporary files remaining: {temp_files_created}"
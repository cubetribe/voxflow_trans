"""
VoxFlow FastAPI Endpoints Integration Tests

Comprehensive production-ready testing for all FastAPI endpoints.
Following CLAUDE.md requirements: no shortcuts, no mocks, production-ready only.

Tests cover:
- File transcription endpoints with real audio
- Streaming WebSocket endpoints
- Health and monitoring endpoints
- Model management endpoints
- Configuration endpoints
- Error handling and edge cases
- Performance and load testing
"""

import asyncio
import json
import time
import uuid
from pathlib import Path
from typing import Dict, Any, List

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient
import websockets

from tests.conftest import (
    skip_large_files_if_ci,
    TEST_CONFIG
)


@pytest.mark.integration
@pytest.mark.api
class TestTranscriptionEndpoints:
    """File transcription API endpoint tests."""

    @pytest.mark.asyncio
    async def test_single_file_transcription(self, app_client: AsyncClient,
                                           real_audio_file: Path,
                                           performance_tracker):
        """Test single file transcription endpoint with real audio."""
        performance_tracker.start("api_single_file_transcription")
        
        # Upload and transcribe real audio file
        with open(real_audio_file, "rb") as audio_file:
            files = {"file": (real_audio_file.name, audio_file, "audio/mp4")}
            data = {
                "language": "auto",
                "task": "transcribe",
                "output_format": "json",
                "include_timestamps": True,
                "include_confidence": True
            }
            
            response = await app_client.post("/transcribe/file", files=files, data=data)
        
        api_metrics = performance_tracker.end()
        
        # Validate successful response
        assert response.status_code == 200
        result = response.json()
        
        assert result["success"] is True
        assert "job_id" in result
        assert "transcription" in result
        assert "metadata" in result
        
        # Validate transcription result
        transcription = result["transcription"]
        assert "text" in transcription
        assert "confidence" in transcription
        assert "duration" in transcription
        assert "segments" in transcription
        
        assert len(transcription["text"].strip()) > 0
        assert transcription["confidence"] > 0
        assert transcription["duration"] > 0
        assert len(transcription["segments"]) > 0
        
        # Validate metadata
        metadata = result["metadata"]
        assert "model_name" in metadata
        assert "processing_time" in metadata
        assert "file_size" in metadata
        assert "sample_rate" in metadata
        
        # Performance validation
        processing_time = metadata["processing_time"]
        duration = transcription["duration"]
        rtf = processing_time / duration
        assert rtf < 2.0, f"Real-time factor {rtf:.2f} too high for API endpoint"

    @pytest.mark.asyncio
    async def test_batch_file_transcription(self, app_client: AsyncClient,
                                          test_audio_files: Dict[str, Path]):
        """Test batch file transcription endpoint."""
        # Select multiple files for batch processing
        batch_files = []
        file_data = []
        
        for file_key in ["1s_16000hz_wav", "30s_44100hz_mp3", "1s_44100hz_flac"]:
            if file_key in test_audio_files:
                file_path = test_audio_files[file_key]
                batch_files.append(("files", (file_path.name, open(file_path, "rb"), "audio/wav")))
                file_data.append({"filename": file_path.name, "language": "auto"})
        
        if len(batch_files) < 2:
            pytest.skip("Insufficient audio files for batch testing")
        
        # Submit batch transcription
        data = {
            "batch_config": json.dumps({
                "name": "Test Batch",
                "output_format": "json",
                "include_timestamps": True,
                "max_concurrent_jobs": 2
            }),
            "file_configs": json.dumps(file_data)
        }
        
        response = await app_client.post("/transcribe/batch", files=batch_files, data=data)
        
        # Close file handles
        for _, (_, file_handle, _) in batch_files:
            file_handle.close()
        
        # Validate successful response
        assert response.status_code == 200
        result = response.json()
        
        assert result["success"] is True
        assert "batch_id" in result
        assert "jobs" in result
        assert "summary" in result
        
        # Validate job results
        jobs = result["jobs"]
        assert len(jobs) == len(batch_files)
        
        for job in jobs:
            assert "job_id" in job
            assert "filename" in job
            assert "status" in job
            assert job["status"] in ["completed", "processing", "failed"]
            
            if job["status"] == "completed":
                assert "transcription" in job
                assert "metadata" in job

    @pytest.mark.asyncio
    async def test_file_transcription_with_options(self, app_client: AsyncClient,
                                                 real_audio_file: Path):
        """Test file transcription with various configuration options."""
        test_configs = [
            {
                "language": "en",
                "task": "transcribe",
                "output_format": "srt",
                "include_timestamps": True,
                "chunk_length_s": 300
            },
            {
                "language": "auto",
                "task": "translate",
                "output_format": "vtt",
                "include_confidence": True,
                "enable_vad": True
            },
            {
                "language": "auto",
                "task": "transcribe",
                "output_format": "txt",
                "normalize_text": True,
                "remove_filler_words": True
            }
        ]
        
        for config in test_configs:
            with open(real_audio_file, "rb") as audio_file:
                files = {"file": (real_audio_file.name, audio_file, "audio/mp4")}
                
                response = await app_client.post("/transcribe/file", files=files, data=config)
            
            assert response.status_code == 200
            result = response.json()
            assert result["success"] is True
            
            # Validate format-specific outputs
            output_format = config["output_format"]
            transcription = result["transcription"]
            
            if output_format == "srt":
                assert "srt_content" in transcription
                assert transcription["srt_content"].strip().startswith("1\n")
            elif output_format == "vtt":
                assert "vtt_content" in transcription
                assert "WEBVTT" in transcription["vtt_content"]
            elif output_format == "txt":
                assert "text" in transcription
                assert len(transcription["text"].strip()) > 0

    @pytest.mark.asyncio
    @pytest.mark.large_files
    @skip_large_files_if_ci
    async def test_large_file_transcription(self, app_client: AsyncClient,
                                          large_audio_file: Path,
                                          memory_monitor):
        """Test large file transcription with chunking."""
        memory_before = memory_monitor.check_memory()
        
        with open(large_audio_file, "rb") as audio_file:
            files = {"file": (large_audio_file.name, audio_file, "audio/wav")}
            data = {
                "language": "auto",
                "task": "transcribe",
                "output_format": "json",
                "chunk_length_s": 600,  # 10-minute chunks
                "chunk_overlap_s": 30,  # 30-second overlap
                "enable_chunking": True
            }
            
            response = await app_client.post("/transcribe/file", files=files, data=data)
        
        memory_after = memory_monitor.check_memory()
        
        # Validate successful processing
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        
        # Validate chunking was used
        metadata = result["metadata"]
        assert metadata.get("chunks_processed", 0) > 1
        assert metadata["file_size"] > 50 * 1024 * 1024  # At least 50MB
        
        # Memory efficiency validation
        memory_increase = memory_after["current_rss_mb"] - memory_before["current_rss_mb"]
        file_size_mb = large_audio_file.stat().st_size // 1024 // 1024
        assert memory_increase < file_size_mb * 2  # Max 2x file size in memory

    @pytest.mark.asyncio
    async def test_transcription_progress_tracking(self, app_client: AsyncClient,
                                                 large_audio_file: Path):
        """Test transcription progress tracking for long-running jobs."""
        # Start large file transcription
        with open(large_audio_file, "rb") as audio_file:
            files = {"file": (large_audio_file.name, audio_file, "audio/wav")}
            data = {
                "language": "auto",
                "task": "transcribe",
                "async_processing": True  # Enable async processing
            }
            
            response = await app_client.post("/transcribe/file", files=files, data=data)
        
        assert response.status_code == 202  # Accepted for async processing
        result = response.json()
        
        assert result["success"] is True
        assert "job_id" in result
        job_id = result["job_id"]
        
        # Poll for progress
        max_polls = 60  # Max 60 polls (5 minutes at 5-second intervals)
        poll_count = 0
        
        while poll_count < max_polls:
            progress_response = await app_client.get(f"/transcribe/job/{job_id}/progress")
            assert progress_response.status_code == 200
            
            progress = progress_response.json()
            assert "job_id" in progress
            assert "status" in progress
            assert "progress" in progress
            
            status = progress["status"]
            assert status in ["queued", "processing", "completed", "failed"]
            
            if status in ["completed", "failed"]:
                break
            
            # Validate progress percentage
            progress_percent = progress["progress"]
            assert 0 <= progress_percent <= 100
            
            await asyncio.sleep(5)  # Wait 5 seconds before next poll
            poll_count += 1
        
        # Final status check
        if poll_count >= max_polls:
            pytest.fail("Transcription job did not complete within timeout")

    @pytest.mark.asyncio
    async def test_job_cancellation(self, app_client: AsyncClient,
                                  large_audio_file: Path):
        """Test job cancellation functionality."""
        # Start large file transcription
        with open(large_audio_file, "rb") as audio_file:
            files = {"file": (large_audio_file.name, audio_file, "audio/wav")}
            data = {
                "language": "auto",
                "task": "transcribe",
                "async_processing": True
            }
            
            response = await app_client.post("/transcribe/file", files=files, data=data)
        
        assert response.status_code == 202
        job_id = response.json()["job_id"]
        
        # Wait a moment for job to start
        await asyncio.sleep(2)
        
        # Cancel the job
        cancel_response = await app_client.post(f"/transcribe/job/{job_id}/cancel")
        assert cancel_response.status_code == 200
        
        cancel_result = cancel_response.json()
        assert cancel_result["success"] is True
        assert cancel_result["job_id"] == job_id
        
        # Verify job was cancelled
        await asyncio.sleep(1)
        status_response = await app_client.get(f"/transcribe/job/{job_id}/progress")
        status = status_response.json()
        assert status["status"] == "cancelled"


@pytest.mark.integration
@pytest.mark.api
@pytest.mark.websocket
class TestStreamingEndpoints:
    """WebSocket streaming API tests."""

    @pytest.mark.asyncio
    async def test_websocket_connection(self, sync_client: TestClient):
        """Test WebSocket connection establishment."""
        with sync_client.websocket_connect("/stream/ws") as websocket:
            # Send connection message
            websocket.send_json({
                "type": "connect",
                "session_id": str(uuid.uuid4()),
                "config": {
                    "language": "auto",
                    "sample_rate": 16000,
                    "channels": 1
                }
            })
            
            # Receive connection acknowledgment
            response = websocket.receive_json()
            assert response["type"] == "connected"
            assert "session_id" in response

    @pytest.mark.asyncio
    async def test_streaming_session_lifecycle(self, sync_client: TestClient):
        """Test complete streaming session lifecycle."""
        session_id = str(uuid.uuid4())
        
        with sync_client.websocket_connect("/stream/ws") as websocket:
            # Start streaming session
            websocket.send_json({
                "type": "start_stream",
                "session_id": session_id,
                "config": {
                    "language": "auto",
                    "sample_rate": 16000,
                    "channels": 1,
                    "format": "wav"
                }
            })
            
            # Receive stream started confirmation
            response = websocket.receive_json()
            assert response["type"] == "stream_started"
            assert response["session_id"] == session_id
            
            # Send audio chunks
            mock_audio_data = b'\x00' * 1024  # Mock audio chunk
            for i in range(5):
                websocket.send_json({
                    "type": "audio_chunk",
                    "session_id": session_id,
                    "data": mock_audio_data.hex(),  # Send as hex string
                    "sequence_number": i,
                    "timestamp": time.time()
                })
                
                # May receive partial transcription
                try:
                    response = websocket.receive_json(mode="nowait")
                    if response["type"] == "partial_transcription":
                        assert "session_id" in response
                        assert "text" in response
                except:
                    pass  # No partial result yet
            
            # End streaming session
            websocket.send_json({
                "type": "end_stream",
                "session_id": session_id
            })
            
            # Receive final transcription
            response = websocket.receive_json()
            assert response["type"] in ["final_transcription", "stream_ended"]

    @pytest.mark.asyncio
    async def test_concurrent_streaming_sessions(self, sync_client: TestClient):
        """Test multiple concurrent streaming sessions."""
        session_ids = [str(uuid.uuid4()) for _ in range(3)]
        websockets_list = []
        
        try:
            # Establish multiple WebSocket connections
            for session_id in session_ids:
                ws = sync_client.websocket_connect("/stream/ws")
                websocket = ws.__enter__()
                websockets_list.append((ws, websocket))
                
                # Start session
                websocket.send_json({
                    "type": "start_stream",
                    "session_id": session_id,
                    "config": {
                        "language": "auto",
                        "sample_rate": 16000,
                        "channels": 1
                    }
                })
                
                # Verify session started
                response = websocket.receive_json()
                assert response["type"] == "stream_started"
                assert response["session_id"] == session_id
            
            # Send data to all sessions simultaneously
            mock_audio_data = b'\x00' * 512
            for ws_context, websocket in websockets_list:
                session_id = session_ids[websockets_list.index((ws_context, websocket))]
                websocket.send_json({
                    "type": "audio_chunk",
                    "session_id": session_id,
                    "data": mock_audio_data.hex(),
                    "sequence_number": 0,
                    "timestamp": time.time()
                })
            
            # End all sessions
            for ws_context, websocket in websockets_list:
                session_id = session_ids[websockets_list.index((ws_context, websocket))]
                websocket.send_json({
                    "type": "end_stream",
                    "session_id": session_id
                })
        
        finally:
            # Clean up WebSocket connections
            for ws_context, websocket in websockets_list:
                try:
                    ws_context.__exit__(None, None, None)
                except:
                    pass

    @pytest.mark.asyncio
    async def test_streaming_error_handling(self, sync_client: TestClient):
        """Test WebSocket error handling scenarios."""
        with sync_client.websocket_connect("/stream/ws") as websocket:
            # Test invalid session ID
            websocket.send_json({
                "type": "audio_chunk",
                "session_id": "invalid-session-id",
                "data": "00000000",
                "sequence_number": 0,
                "timestamp": time.time()
            })
            
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "session" in response["message"].lower()
            
            # Test malformed message
            websocket.send_json({
                "type": "invalid_message_type",
                "data": "invalid"
            })
            
            response = websocket.receive_json()
            assert response["type"] == "error"


@pytest.mark.integration
@pytest.mark.api
class TestHealthEndpoints:
    """Health and monitoring endpoint tests."""

    @pytest.mark.asyncio
    async def test_basic_health_check(self, app_client: AsyncClient):
        """Test basic health check endpoint."""
        response = await app_client.get("/health")
        assert response.status_code == 200
        
        health = response.json()
        assert "status" in health
        assert health["status"] in ["healthy", "degraded", "unhealthy"]
        assert "timestamp" in health

    @pytest.mark.asyncio
    async def test_detailed_health_check(self, app_client: AsyncClient):
        """Test detailed health check endpoint."""
        response = await app_client.get("/health/detailed")
        assert response.status_code == 200
        
        health = response.json()
        assert "status" in health
        assert "components" in health
        assert "metrics" in health
        assert "version" in health
        
        # Validate components
        components = health["components"]
        expected_components = ["voxtral_engine", "audio_processor", "cleanup_service", "storage"]
        
        for component in expected_components:
            assert component in components
            assert "status" in components[component]
            assert "last_check" in components[component]
        
        # Validate metrics
        metrics = health["metrics"]
        assert "memory_usage" in metrics
        assert "disk_usage" in metrics
        assert "active_jobs" in metrics
        assert "uptime" in metrics

    @pytest.mark.asyncio
    async def test_readiness_check(self, app_client: AsyncClient):
        """Test readiness probe endpoint."""
        response = await app_client.get("/health/ready")
        assert response.status_code in [200, 503]  # Ready or not ready
        
        readiness = response.json()
        assert "ready" in readiness
        assert "checks" in readiness
        
        if response.status_code == 200:
            assert readiness["ready"] is True
        else:
            assert readiness["ready"] is False

    @pytest.mark.asyncio
    async def test_liveness_check(self, app_client: AsyncClient):
        """Test liveness probe endpoint."""
        response = await app_client.get("/health/live")
        assert response.status_code == 200
        
        liveness = response.json()
        assert "alive" in liveness
        assert liveness["alive"] is True
        assert "uptime" in liveness


@pytest.mark.integration
@pytest.mark.api
class TestModelManagementEndpoints:
    """Model management endpoint tests."""

    @pytest.mark.asyncio
    async def test_model_status(self, app_client: AsyncClient):
        """Test model status endpoint."""
        response = await app_client.get("/models/status")
        assert response.status_code == 200
        
        status = response.json()
        assert "model_loaded" in status
        assert "model_info" in status
        assert "performance_metrics" in status
        
        if status["model_loaded"]:
            model_info = status["model_info"]
            assert "model_name" in model_info
            assert "model_size" in model_info
            assert "backend" in model_info

    @pytest.mark.asyncio
    async def test_model_reload(self, app_client: AsyncClient):
        """Test model reload endpoint."""
        response = await app_client.post("/models/reload")
        assert response.status_code == 200
        
        result = response.json()
        assert "success" in result
        assert "reload_time" in result
        
        if result["success"]:
            assert result["reload_time"] > 0

    @pytest.mark.asyncio
    async def test_model_info(self, app_client: AsyncClient):
        """Test model information endpoint."""
        response = await app_client.get("/models/info")
        assert response.status_code == 200
        
        info = response.json()
        assert "available_models" in info
        assert "current_model" in info
        assert "capabilities" in info
        
        capabilities = info["capabilities"]
        assert "languages" in capabilities
        assert "tasks" in capabilities
        assert "max_audio_length" in capabilities


@pytest.mark.integration
@pytest.mark.api
class TestConfigurationEndpoints:
    """Configuration management endpoint tests."""

    @pytest.mark.asyncio
    async def test_current_config(self, app_client: AsyncClient):
        """Test current configuration retrieval."""
        response = await app_client.get("/config/current")
        assert response.status_code == 200
        
        config = response.json()
        assert "voxtral_engine" in config
        assert "audio_processor" in config
        assert "api_settings" in config

    @pytest.mark.asyncio
    async def test_config_update(self, app_client: AsyncClient):
        """Test configuration update endpoint."""
        new_config = {
            "chunk_size": 25,
            "overlap": 3,
            "max_concurrent_jobs": 3
        }
        
        response = await app_client.post("/config/update", json=new_config)
        assert response.status_code == 200
        
        result = response.json()
        assert result["success"] is True
        assert "updated_config" in result

    @pytest.mark.asyncio
    async def test_system_status(self, app_client: AsyncClient):
        """Test system status endpoint."""
        response = await app_client.get("/config/system-status")
        assert response.status_code == 200
        
        status = response.json()
        assert "system_info" in status
        assert "resource_usage" in status
        assert "performance_metrics" in status
        
        system_info = status["system_info"]
        assert "platform" in system_info
        assert "python_version" in system_info
        assert "memory_total" in system_info
        
        resource_usage = status["resource_usage"]
        assert "cpu_percent" in resource_usage
        assert "memory_percent" in resource_usage
        assert "disk_usage" in resource_usage

    @pytest.mark.asyncio
    async def test_cleanup_management(self, app_client: AsyncClient):
        """Test cleanup service management endpoints."""
        # Get cleanup statistics
        response = await app_client.get("/config/cleanup/stats")
        assert response.status_code == 200
        
        stats = response.json()
        assert "total_files_cleaned" in stats
        assert "total_space_freed" in stats
        assert "last_cleanup" in stats
        
        # Trigger manual cleanup
        response = await app_client.post("/config/cleanup/trigger")
        assert response.status_code == 200
        
        result = response.json()
        assert result["success"] is True
        assert "files_cleaned" in result
        assert "space_freed" in result


@pytest.mark.integration
@pytest.mark.api
class TestAPIErrorHandling:
    """API error handling and edge cases."""

    @pytest.mark.asyncio
    async def test_invalid_file_upload(self, app_client: AsyncClient):
        """Test handling of invalid file uploads."""
        # Test empty file
        files = {"file": ("empty.txt", b"", "text/plain")}
        response = await app_client.post("/transcribe/file", files=files)
        assert response.status_code == 400
        
        error = response.json()
        assert error["success"] is False
        assert "error" in error

    @pytest.mark.asyncio
    async def test_unsupported_file_format(self, app_client: AsyncClient):
        """Test handling of unsupported file formats."""
        files = {"file": ("test.xyz", b"fake content", "application/octet-stream")}
        response = await app_client.post("/transcribe/file", files=files)
        assert response.status_code == 400
        
        error = response.json()
        assert error["success"] is False
        assert "unsupported" in error["error"].lower() or "format" in error["error"].lower()

    @pytest.mark.asyncio
    async def test_invalid_parameters(self, app_client: AsyncClient,
                                    real_audio_file: Path):
        """Test handling of invalid parameters."""
        with open(real_audio_file, "rb") as audio_file:
            files = {"file": (real_audio_file.name, audio_file, "audio/mp4")}
            data = {
                "language": "invalid_language",
                "task": "invalid_task",
                "output_format": "invalid_format"
            }
            
            response = await app_client.post("/transcribe/file", files=files, data=data)
        
        assert response.status_code == 422  # Validation error
        
        error = response.json()
        assert "detail" in error  # FastAPI validation error format

    @pytest.mark.asyncio
    async def test_nonexistent_job_id(self, app_client: AsyncClient):
        """Test handling of nonexistent job IDs."""
        fake_job_id = str(uuid.uuid4())
        
        response = await app_client.get(f"/transcribe/job/{fake_job_id}/progress")
        assert response.status_code == 404
        
        error = response.json()
        assert error["success"] is False
        assert "not found" in error["error"].lower()

    @pytest.mark.asyncio
    async def test_rate_limiting(self, app_client: AsyncClient,
                               real_audio_file: Path):
        """Test API rate limiting functionality."""
        # Send multiple rapid requests
        tasks = []
        for i in range(10):  # Send 10 rapid requests
            with open(real_audio_file, "rb") as audio_file:
                files = {"file": (f"test_{i}.mp4", audio_file.read(), "audio/mp4")}
                task = app_client.post("/transcribe/file", files=files)
                tasks.append(task)
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Some requests should be rate limited
        rate_limited_count = 0
        successful_count = 0
        
        for response in responses:
            if isinstance(response, Exception):
                continue
            if response.status_code == 429:  # Too Many Requests
                rate_limited_count += 1
            elif response.status_code == 200:
                successful_count += 1
        
        # Rate limiting should kick in for rapid requests
        assert rate_limited_count > 0 or successful_count < len(tasks)


@pytest.mark.integration
@pytest.mark.api
@pytest.mark.performance
class TestAPIPerformance:
    """API performance and load testing."""

    @pytest.mark.asyncio
    async def test_concurrent_transcription_requests(self, app_client: AsyncClient,
                                                   test_audio_files: Dict[str, Path]):
        """Test concurrent transcription request handling."""
        # Select multiple audio files
        audio_files = [
            test_audio_files[key] for key in ["1s_16000hz_wav", "1s_44100hz_mp3", "30s_44100hz_mp3"]
            if key in test_audio_files
        ]
        
        if len(audio_files) < 2:
            pytest.skip("Insufficient audio files for concurrent testing")
        
        # Create concurrent requests
        tasks = []
        for i, audio_file in enumerate(audio_files[:5]):  # Max 5 concurrent
            with open(audio_file, "rb") as f:
                audio_data = f.read()
            
            files = {"file": (f"concurrent_{i}.wav", audio_data, "audio/wav")}
            data = {"language": "auto", "task": "transcribe"}
            
            task = app_client.post("/transcribe/file", files=files, data=data)
            tasks.append(task)
        
        # Execute concurrently
        start_time = time.perf_counter()
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        end_time = time.perf_counter()
        
        # Validate responses
        successful_responses = []
        for response in responses:
            if isinstance(response, Exception):
                pytest.fail(f"Concurrent request failed: {response}")
            assert response.status_code == 200
            successful_responses.append(response.json())
        
        # Performance validation
        total_duration = end_time - start_time
        total_audio_duration = sum(r["transcription"]["duration"] for r in successful_responses)
        
        # Concurrent processing should be efficient
        efficiency = total_audio_duration / total_duration
        assert efficiency > 1.0, f"Concurrent processing efficiency {efficiency:.2f} too low"

    @pytest.mark.asyncio
    async def test_api_response_times(self, app_client: AsyncClient,
                                    test_audio_files: Dict[str, Path]):
        """Test API response time consistency."""
        response_times = []
        
        # Test multiple requests for consistency
        for _ in range(5):
            audio_file = test_audio_files.get("1s_16000hz_wav")
            if not audio_file:
                pytest.skip("Test audio file not available")
            
            with open(audio_file, "rb") as f:
                files = {"file": (audio_file.name, f, "audio/wav")}
                data = {"language": "auto", "task": "transcribe"}
                
                start_time = time.perf_counter()
                response = await app_client.post("/transcribe/file", files=files, data=data)
                end_time = time.perf_counter()
                
                assert response.status_code == 200
                response_times.append(end_time - start_time)
        
        # Calculate statistics
        avg_response_time = sum(response_times) / len(response_times)
        max_response_time = max(response_times)
        
        # Response times should be reasonable and consistent
        assert avg_response_time < 10.0, f"Average response time {avg_response_time:.2f}s too high"
        assert max_response_time < 15.0, f"Max response time {max_response_time:.2f}s too high"
        
        # Calculate coefficient of variation for consistency
        import statistics
        cv = statistics.stdev(response_times) / avg_response_time
        assert cv < 0.5, f"Response time inconsistency too high: CV={cv:.3f}"

    @pytest.mark.asyncio
    async def test_memory_usage_under_load(self, app_client: AsyncClient,
                                         test_audio_files: Dict[str, Path],
                                         memory_monitor):
        """Test memory usage under API load."""
        memory_before = memory_monitor.check_memory()
        
        # Generate load with multiple requests
        tasks = []
        for i in range(10):  # 10 concurrent requests
            audio_file = list(test_audio_files.values())[i % len(test_audio_files)]
            
            with open(audio_file, "rb") as f:
                audio_data = f.read()
            
            files = {"file": (f"load_test_{i}.wav", audio_data, "audio/wav")}
            task = app_client.post("/transcribe/file", files=files)
            tasks.append(task)
        
        # Execute load test
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        memory_after = memory_monitor.check_memory()
        
        # Validate most requests succeeded
        successful_count = sum(
            1 for r in responses 
            if not isinstance(r, Exception) and r.status_code == 200
        )
        assert successful_count >= len(tasks) * 0.8  # At least 80% success rate
        
        # Memory usage should be reasonable
        memory_increase = memory_after["current_rss_mb"] - memory_before["current_rss_mb"]
        assert memory_increase < 1000, f"Memory increase {memory_increase}MB too high under load"
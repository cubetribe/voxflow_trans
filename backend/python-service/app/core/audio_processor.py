"""
Advanced Audio Processing Pipeline with Chunking Support for Large Files.
Optimized for 2+ hour audio files with automatic cleanup.
"""

import asyncio
import tempfile
import uuid
from pathlib import Path
from typing import List, Optional, Tuple, AsyncGenerator, Dict, Any
import numpy as np
from pydub import AudioSegment
from pydub.silence import split_on_silence
import librosa
import soundfile as sf
import webrtcvad
from loguru import logger

from app.core.config import settings
from app.models.transcription import AudioChunk, ProcessingConfig


class AudioProcessor:
    """
    Advanced audio processor with support for large files and intelligent chunking.
    """
    
    def __init__(self):
        self.vad = webrtcvad.Vad(settings.VAD_AGGRESSIVENESS)
        self.temp_files: Dict[str, List[Path]] = {}
        
    async def process_large_file(
        self,
        audio_data: bytes,
        filename: str,
        config: ProcessingConfig
    ) -> AsyncGenerator[AudioChunk, None]:
        """
        Process large audio files by splitting into manageable chunks.
        
        Args:
            audio_data: Raw audio bytes
            filename: Original filename
            config: Processing configuration
            
        Yields:
            AudioChunk: Processed audio chunks with metadata
        """
        
        session_id = str(uuid.uuid4())
        self.temp_files[session_id] = []
        
        try:
            logger.info(f"Processing large file: {filename}, size: {len(audio_data)} bytes")
            
            # Create temporary file for processing
            temp_path = await self._save_temp_file(audio_data, filename, session_id)
            
            # Load and analyze audio
            audio_segment = AudioSegment.from_file(temp_path)
            duration_minutes = len(audio_segment) / 1000 / 60
            
            logger.info(f"Audio duration: {duration_minutes:.2f} minutes")
            
            if duration_minutes <= config.chunk_duration_minutes:
                # Small file, process directly
                chunk = await self._process_single_chunk(
                    audio_segment, 0, session_id, config
                )
                yield chunk
            else:
                # Large file, split into chunks
                async for chunk in self._process_chunked_file(
                    audio_segment, session_id, config
                ):
                    yield chunk
                    
        except Exception as e:
            logger.error(f"Error processing file {filename}: {e}")
            raise
        finally:
            # Cleanup temporary files
            await self._cleanup_session(session_id)
    
    async def _process_chunked_file(
        self,
        audio_segment: AudioSegment,
        session_id: str,
        config: ProcessingConfig
    ) -> AsyncGenerator[AudioChunk, None]:
        """Split large audio into chunks and process each."""
        
        chunk_duration_ms = config.chunk_duration_minutes * 60 * 1000  # 10 minutes in ms
        overlap_ms = config.overlap_seconds * 1000  # 10 seconds in ms
        
        total_duration = len(audio_segment)
        chunk_count = 0
        
        for start_ms in range(0, total_duration, chunk_duration_ms - overlap_ms):
            end_ms = min(start_ms + chunk_duration_ms, total_duration)
            
            # Extract chunk with overlap
            chunk_audio = audio_segment[start_ms:end_ms]
            
            # Skip very short chunks unless it's the final chunk (to preserve ending)
            is_final_chunk = end_ms >= total_duration
            if len(chunk_audio) < 5000 and not is_final_chunk:  # Less than 5 seconds
                continue
            
            # Process even very short final chunks to preserve the ending
            if is_final_chunk and len(chunk_audio) < 1000:  # Less than 1 second
                logger.info(f"Processing final chunk {chunk_count} (very short): {start_ms/1000:.1f}s - {end_ms/1000:.1f}s ({len(chunk_audio)}ms)")
            else:
                logger.info(f"Processing chunk {chunk_count}: {start_ms/1000:.1f}s - {end_ms/1000:.1f}s")
            
            # Process individual chunk
            chunk = await self._process_single_chunk(
                chunk_audio, chunk_count, session_id, config, start_ms / 1000
            )
            
            yield chunk
            chunk_count += 1
    
    async def _process_single_chunk(
        self,
        audio_segment: AudioSegment,
        chunk_index: int,
        session_id: str,
        config: ProcessingConfig,
        start_time_seconds: float = 0.0
    ) -> AudioChunk:
        """Process a single audio chunk."""
        
        # Normalize audio properties
        audio_segment = self._normalize_audio(audio_segment, config)
        
        # Apply noise reduction if enabled
        if config.noise_reduction:
            audio_segment = await self._reduce_noise(audio_segment)
        
        # Apply Voice Activity Detection
        if config.vad_enabled:
            audio_segment = await self._apply_vad(audio_segment)
        
        # Convert to numpy array for processing
        audio_array = np.array(audio_segment.get_array_of_samples())
        if audio_segment.channels == 2:
            audio_array = audio_array.reshape((-1, 2)).mean(axis=1)
        
        # Normalize to [-1, 1]
        audio_array = audio_array.astype(np.float32) / 32768.0
        
        # Save processed chunk temporarily
        chunk_path = await self._save_processed_chunk(
            audio_array, chunk_index, session_id, config.target_sample_rate
        )
        
        return AudioChunk(
            index=chunk_index,
            audio_data=audio_array,
            file_path=str(chunk_path),
            start_time=start_time_seconds,
            duration=len(audio_segment) / 1000.0,
            sample_rate=config.target_sample_rate,
            session_id=session_id,
        )
    
    def _normalize_audio(
        self, 
        audio_segment: AudioSegment, 
        config: ProcessingConfig
    ) -> AudioSegment:
        """Normalize audio to standard format."""
        
        # Convert to mono
        if audio_segment.channels > 1:
            audio_segment = audio_segment.set_channels(1)
        
        # Resample to target sample rate
        if audio_segment.frame_rate != config.target_sample_rate:
            audio_segment = audio_segment.set_frame_rate(config.target_sample_rate)
        
        # Normalize volume
        return audio_segment.normalize()
    
    async def _reduce_noise(self, audio_segment: AudioSegment) -> AudioSegment:
        """Apply noise reduction using spectral gating."""
        
        # Convert to numpy for processing
        audio_array = np.array(audio_segment.get_array_of_samples())
        sample_rate = audio_segment.frame_rate
        
        # Simple noise reduction using librosa
        audio_float = audio_array.astype(np.float32) / 32768.0
        
        # Spectral gating for noise reduction
        stft = librosa.stft(audio_float)
        magnitude = np.abs(stft)
        
        # Estimate noise floor from first 0.5 seconds
        noise_duration = min(int(0.5 * sample_rate / 512), magnitude.shape[1])
        noise_floor = np.median(magnitude[:, :noise_duration], axis=1, keepdims=True)
        
        # Apply spectral gating
        gate_threshold = noise_floor * 2.0
        mask = magnitude > gate_threshold
        stft_cleaned = stft * mask
        
        # Convert back to audio
        audio_cleaned = librosa.istft(stft_cleaned)
        audio_cleaned = (audio_cleaned * 32768).astype(np.int16)
        
        return AudioSegment(
            audio_cleaned.tobytes(),
            frame_rate=sample_rate,
            sample_width=2,
            channels=1
        )
    
    async def _apply_vad(self, audio_segment: AudioSegment) -> AudioSegment:
        """Apply Voice Activity Detection to remove silence."""
        
        # Use pydub's silence detection for simplicity
        chunks = split_on_silence(
            audio_segment,
            min_silence_len=1000,  # 1 second
            silence_thresh=audio_segment.dBFS - 14,
            keep_silence=200  # Keep 200ms of silence
        )
        
        if not chunks:
            return audio_segment
        
        # Combine non-silent chunks
        result = chunks[0]
        for chunk in chunks[1:]:
            result += AudioSegment.silent(duration=100) + chunk  # Add small gap
        
        return result
    
    async def _save_temp_file(
        self, 
        audio_data: bytes, 
        filename: str, 
        session_id: str
    ) -> Path:
        """Save uploaded audio data to temporary file."""
        
        temp_dir = settings.temp_path / session_id
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        # Determine file extension
        file_ext = Path(filename).suffix.lower()
        if not file_ext:
            file_ext = '.wav'
        
        temp_path = temp_dir / f"original{file_ext}"
        
        # Write file in thread to avoid blocking
        await asyncio.to_thread(self._write_file, temp_path, audio_data)
        
        self.temp_files[session_id].append(temp_path)
        logger.debug(f"Saved temporary file: {temp_path}")
        
        return temp_path
    
    async def _save_processed_chunk(
        self,
        audio_array: np.ndarray,
        chunk_index: int,
        session_id: str,
        sample_rate: int
    ) -> Path:
        """Save processed audio chunk."""
        
        temp_dir = settings.temp_path / session_id
        chunk_path = temp_dir / f"chunk_{chunk_index:04d}.wav"
        
        await asyncio.to_thread(
            sf.write,
            chunk_path,
            audio_array,
            sample_rate
        )
        
        self.temp_files[session_id].append(chunk_path)
        logger.debug(f"Saved processed chunk: {chunk_path}")
        
        return chunk_path
    
    async def _cleanup_session(self, session_id: str) -> None:
        """Clean up all temporary files for a session."""
        
        if session_id not in self.temp_files:
            return
        
        files_to_delete = self.temp_files[session_id]
        deleted_count = 0
        
        for file_path in files_to_delete:
            try:
                if file_path.exists():
                    await asyncio.to_thread(file_path.unlink)
                    deleted_count += 1
            except Exception as e:
                logger.warning(f"Failed to delete {file_path}: {e}")
        
        # Remove session directory if empty
        try:
            session_dir = settings.temp_path / session_id
            if session_dir.exists() and not any(session_dir.iterdir()):
                await asyncio.to_thread(session_dir.rmdir)
        except Exception as e:
            logger.warning(f"Failed to remove session directory: {e}")
        
        # Remove session from tracking
        del self.temp_files[session_id]
        
        logger.info(f"Cleaned up {deleted_count} temporary files for session {session_id}")
    
    async def get_audio_info(self, audio_data: bytes, filename: str) -> Dict[str, Any]:
        """Get audio file information without processing."""
        
        with tempfile.NamedTemporaryFile(suffix=Path(filename).suffix) as temp_file:
            await asyncio.to_thread(temp_file.write, audio_data)
            await asyncio.to_thread(temp_file.flush)
            
            audio_segment = AudioSegment.from_file(temp_file.name)
            
            return {
                "filename": filename,
                "duration_seconds": len(audio_segment) / 1000.0,
                "duration_minutes": len(audio_segment) / 1000.0 / 60.0,
                "sample_rate": audio_segment.frame_rate,
                "channels": audio_segment.channels,
                "bit_depth": audio_segment.sample_width * 8,
                "file_size_bytes": len(audio_data),
                "estimated_chunks": max(1, int(len(audio_segment) / 1000.0 / 60.0 / 10)),  # 10-minute chunks
                "format": Path(filename).suffix.lower().lstrip('.'),
            }
    
    def _write_file(self, path: Path, data: bytes) -> None:
        """Write file synchronously (for use with asyncio.to_thread)."""
        with open(path, 'wb') as f:
            f.write(data)
    
    async def cleanup_old_sessions(self, max_age_hours: int = 24) -> int:
        """Clean up old session directories."""
        
        if not settings.temp_path.exists():
            return 0
        
        import time
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        cleaned_count = 0
        
        for session_dir in settings.temp_path.iterdir():
            if not session_dir.is_dir():
                continue
            
            # Check directory age
            dir_age = current_time - session_dir.stat().st_mtime
            if dir_age > max_age_seconds:
                try:
                    # Remove all files in directory
                    for file_path in session_dir.rglob('*'):
                        if file_path.is_file():
                            await asyncio.to_thread(file_path.unlink)
                    
                    # Remove directory
                    await asyncio.to_thread(session_dir.rmdir)
                    cleaned_count += 1
                    
                except Exception as e:
                    logger.warning(f"Failed to clean up old session {session_dir}: {e}")
        
        if cleaned_count > 0:
            logger.info(f"Cleaned up {cleaned_count} old session directories")
        
        return cleaned_count
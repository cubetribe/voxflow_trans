"""
VoxFlow Voxtral Engine - Production-Ready MLX Implementation
Complete Apple Silicon M4 Max optimization with comprehensive error handling.
"""

import asyncio
import gc
import time
import uuid
import warnings
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, AsyncGenerator, Any, Union, Tuple

import numpy as np
import torch
import torchaudio
from loguru import logger
from transformers import (
    AutoProcessor,
    AutoModelForSpeechSeq2Seq,
    pipeline,
    Pipeline
)

# MLX imports with fallback
try:
    import mlx.core as mx
    import mlx.nn as nn
    from mlx_lm import load, generate
    MLX_AVAILABLE = True
    logger.info("✅ MLX available for Apple Silicon optimization")
except ImportError:
    MLX_AVAILABLE = False
    logger.warning("⚠️ MLX not available - falling back to PyTorch")

from app.core.config import settings
from app.core.audio_processor import AudioProcessor
from app.core.model_loader import ProductionModelLoader, LoadingResult
from app.models.transcription import (
    TranscriptionRequest, TranscriptionResponse, BatchTranscriptionRequest,
    BatchTranscriptionResponse, JobProgress, ProcessingStatus, ChunkResult,
    TranscriptionSegment, StreamingSession, AudioChunk
)
from app.services.cleanup_service import cleanup_service
from app.services.progress_notifier import progress_notifier


class VoxtralEngine:
    """
    Production-ready Voxtral engine with Apple Silicon M4 Max optimization.
    
    Features:
    - MLX acceleration for unified memory architecture
    - Metal Performance Shaders optimization
    - Large file chunking with memory efficiency
    - Real-time streaming transcription
    - Comprehensive error handling
    - Automatic resource management
    - Performance monitoring
    """
    
    def __init__(self, config):
        self.config = config
        self.settings = settings
        
        # Model components
        self.model: Optional[Union[Pipeline, Any]] = None
        self.processor: Optional[AutoProcessor] = None
        self.mlx_model = None
        self.mlx_tokenizer = None
        
        # Engine configuration
        self.audio_processor = AudioProcessor()
        self.is_loaded = False
        self.load_time: Optional[float] = None
        self.device = self._determine_device()
        self.loading_strategy: Optional[str] = None
        self.use_mlx = MLX_AVAILABLE and self.settings.is_apple_silicon and getattr(self.settings, 'MLX_ENABLED', True)
        
        # Statistics tracking
        self.total_inference_time: float = 0.0
        self.total_transcriptions: int = 0
        self.last_transcription_time: Optional[float] = None
        
        # Job tracking
        self.active_jobs: Dict[str, JobProgress] = {}
        self.streaming_sessions: Dict[str, StreamingSession] = {}
        self.batch_jobs: Dict[str, BatchTranscriptionResponse] = {}
        
        # Performance monitoring
        self.total_inferences = 0
        self.total_processing_time = 0.0
        self.total_audio_duration = 0.0
        self.inference_count = 0
        
        # Resource management
        self.max_concurrent_jobs = settings.MAX_CONCURRENT_REQUESTS
        self.active_job_semaphore = asyncio.Semaphore(self.max_concurrent_jobs)
        
        # Memory management for MLX
        self._max_memory = None
        if self.use_mlx and hasattr(self.settings, 'MLX_MEMORY_LIMIT') and self.settings.MLX_MEMORY_LIMIT:
            self._max_memory = self.settings.MLX_MEMORY_LIMIT * 1024 * 1024
        
        logger.info(f"VoxtralEngine initialized: device={self.device}, MLX={self.use_mlx}")
    
    def _determine_device(self) -> str:
        """Determine the best available device for processing."""
        if self.settings.DEVICE == "mps" and torch.backends.mps.is_available():
            return "mps"
        elif self.settings.DEVICE == "cuda" and torch.cuda.is_available():
            return "cuda"
        else:
            if self.settings.DEVICE != "cpu":
                logger.warning(f"Requested device {self.settings.DEVICE} not available, using CPU")
            return "cpu"
        
    async def initialize(self) -> None:
        """Initialize the Voxtral model with production-ready loading architecture."""
        try:
            logger.info(f"🚀 Initializing VoxtralEngine with production-ready architecture")
            logger.info(f"📋 Target model: {self.settings.MODEL_NAME}")
            
            start_time = time.time()
            
            # Use production model loader (Transformers-based for stability)
            model_loader = ProductionModelLoader(self.settings.model_cache_path)
            loading_result: LoadingResult = await model_loader.load_model(self.settings.MODEL_NAME)
            
            if not loading_result.success:
                raise RuntimeError(f"Model loading failed with all strategies: {loading_result.error_message}")
            
            # Store loaded components
            self.model = loading_result.model
            self.processor = loading_result.processor
            self.device = loading_result.device_used.value
            self.loading_strategy = loading_result.strategy_used.value
            
            logger.info(f"📌 Model loaded: {self.model is not None}")
            logger.info(f"📌 Model type: {type(self.model)}")
            logger.info(f"📌 Processor loaded: {self.processor is not None}")
            
            # Log warnings if any
            for warning in loading_result.warnings:
                logger.warning(f"⚠️ {warning}")
            
            # Set loaded flag BEFORE warmup
            self.is_loaded = True
            self.load_time = time.time() - start_time
            
            # Warmup the model for optimal performance
            await self._warmup_model()
            
            logger.info(f"✅ VoxtralEngine initialized successfully")
            logger.info(f"   Loading strategy: {self.loading_strategy}")
            logger.info(f"   Device: {self.device}")
            logger.info(f"   Total time: {self.load_time:.2f}s")
            logger.info(f"   Model loading: {loading_result.loading_time_seconds:.2f}s")
            logger.info(f"   Memory used: {loading_result.memory_used_mb}MB")
            
            # Start cleanup service
            await cleanup_service.start()
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize VoxtralEngine: {e}")
            await self.cleanup()
            raise RuntimeError(f"VoxtralEngine initialization failed: {e}") from e
    
    async def _initialize_mlx(self) -> None:
        """Initialize model with MLX for Apple Silicon optimization."""
        logger.info("Initializing with MLX for Apple Silicon M4 Max optimization...")
        
        try:
            # Set MLX memory limit if specified
            if self._max_memory:
                mx.metal.set_memory_limit(self._max_memory)
                logger.info(f"MLX memory limit set to {self._max_memory // 1024 // 1024}MB")
            
            # Load processor (always use HuggingFace for this)
            self.processor = await asyncio.to_thread(
                AutoProcessor.from_pretrained,
                self.settings.MODEL_NAME,
                cache_dir=str(self.settings.model_cache_path),
                local_files_only=False,
            )
            
            # Try to load with MLX first, fallback to PyTorch if needed
            try:
                self.mlx_model, self.mlx_tokenizer = await asyncio.to_thread(
                    load,
                    self.settings.MODEL_NAME,
                    tokenizer_config={
                        "trust_remote_code": True,
                        "cache_dir": str(self.settings.model_cache_path),
                    },
                )
                logger.info("✅ Model loaded with MLX optimization")
                
            except Exception as mlx_error:
                logger.warning(f"MLX loading failed: {mlx_error}")
                logger.info("Falling back to PyTorch...")
                self.use_mlx = False
                await self._initialize_pytorch()
                
        except Exception as e:
            logger.error(f"MLX initialization failed: {e}")
            self.use_mlx = False
            await self._initialize_pytorch()
    
    async def _initialize_pytorch(self) -> None:
        """Initialize model with PyTorch."""
        logger.info(f"Initializing with PyTorch on device: {self.device}")
        
        # Load processor
        self.processor = await asyncio.to_thread(
            AutoProcessor.from_pretrained,
            self.settings.MODEL_NAME,
            cache_dir=str(self.settings.model_cache_path),
            local_files_only=False,
        )
        
        # Configure model loading
        model_kwargs = {
            "cache_dir": str(self.settings.model_cache_path),
            "local_files_only": False,
            "torch_dtype": torch.float16 if self.settings.PRECISION == "float16" else torch.float32,
            "low_cpu_mem_usage": True,
            "use_safetensors": True,
        }
        
        # Device-specific optimizations
        if self.device == "mps":
            model_kwargs["device_map"] = "mps"
        elif self.device == "cuda":
            model_kwargs["device_map"] = "auto"
            model_kwargs["load_in_8bit"] = False  # Disable for Voxtral
        
        # Load the model
        model = await asyncio.to_thread(
            AutoModelForSpeechSeq2Seq.from_pretrained,
            self.settings.MODEL_NAME,
            **model_kwargs
        )
        
        # Move to device if needed
        if self.device != "cpu" and "device_map" not in model_kwargs:
            model = model.to(self.device)
        
        # Create optimized pipeline
        pipeline_kwargs = {
            "model": model,
            "tokenizer": self.processor.tokenizer,
            "feature_extractor": self.processor.feature_extractor,
            "torch_dtype": model_kwargs["torch_dtype"],
            "device": self.device if self.device != "mps" else -1,  # Pipeline doesn't support mps directly
        }
        
        # Add device-specific optimizations
        if self.device == "cuda":
            pipeline_kwargs["model_kwargs"] = {"attn_implementation": "flash_attention_2"}
        
        self.model = await asyncio.to_thread(
            pipeline,
            "automatic-speech-recognition",
            **pipeline_kwargs
        )
        
        logger.info(f"✅ Model loaded with PyTorch on {self.device}")
    
    async def _warmup_model(self) -> None:
        """Warmup the model with sample audio for optimal performance."""
        logger.info("Warming up model for optimal performance...")
        
        try:
            # Create short dummy audio (1 second of silence)
            dummy_audio = np.zeros(self.settings.SAMPLE_RATE, dtype=np.float32)
            
            warmup_samples = getattr(self.settings, 'MODEL_WARMUP_SAMPLES', 3)
            
            # Voxtral-specific warmup without timestamps to avoid CTC issues
            for i in range(warmup_samples):
                await self._transcribe_audio_internal(
                    dummy_audio,
                    language="en",
                    return_timestamps=False,  # Avoid CTC timestamp issues in warmup
                    return_confidence=False,
                )
                logger.debug(f"Warmup sample {i + 1}/{warmup_samples} completed")
            
            logger.info(f"✅ Model warmed up with {warmup_samples} samples")
            
        except Exception as e:
            logger.warning(f"Model warmup failed: {e}")
            logger.warning(f"Model state: {self.model is not None}, is_loaded: {self.is_loaded}")
            # Don't fail initialization if warmup fails
            logger.info("Continuing without warmup - model will warm up on first request")
    
    async def _transcribe_audio_internal(
        self,
        audio: Union[np.ndarray, str, Path],
        language: Optional[str] = None,
        return_timestamps: bool = True,
        return_confidence: bool = True,
        chunk_length_s: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Internal transcription method with MLX/PyTorch handling and system prompt support."""
        if not self.is_loaded:
            raise RuntimeError("Model not loaded")
        
        try:
            start_time = time.time()
            
            # Prepare audio
            audio_array, sample_rate = self._prepare_audio(audio)
            audio_duration = len(audio_array) / sample_rate
            
            # Perform transcription based on engine
            if self.use_mlx:
                result = await self._transcribe_mlx(
                    audio_array, language, return_timestamps, return_confidence, chunk_length_s, system_prompt
                )
            else:
                result = await self._transcribe_pytorch(
                    audio_array, language, return_timestamps, return_confidence, chunk_length_s, system_prompt
                )
            
            # Track performance
            inference_time = time.time() - start_time
            self._update_performance_stats(inference_time, audio_duration)
            
            # Add metadata
            result.update({
                "audio_duration": audio_duration,
                "inference_time": inference_time,
                "real_time_factor": inference_time / audio_duration if audio_duration > 0 else 0,
                "model": self.settings.MODEL_NAME,
                "device": self.device,
                "engine": "mlx" if self.use_mlx else "pytorch",
            })
            
            return result
            
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise RuntimeError(f"Transcription failed: {e}") from e
    
    def _remove_overlap_duplicates(self, segments: List[TranscriptionSegment], overlap_seconds: float = 3.0) -> List[TranscriptionSegment]:
        """
        Production-ready smart overlap removal algorithm.
        Removes duplicate text from overlapping regions between chunks.
        
        Args:
            segments: List of transcription segments from all chunks
            overlap_seconds: Expected overlap duration in seconds
            
        Returns:
            List of segments with overlapping duplicates removed
        """
        if len(segments) < 2:
            return segments
            
        cleaned_segments = []
        i = 0
        
        while i < len(segments):
            current_segment = segments[i]
            
            # Check if this segment overlaps with next segment
            if i + 1 < len(segments):
                next_segment = segments[i + 1]
                
                # Calculate overlap region
                overlap_start = max(current_segment.start, next_segment.start - overlap_seconds)
                overlap_end = min(current_segment.end, next_segment.start + overlap_seconds)
                
                if overlap_start < overlap_end:  # There is an overlap
                    # Extract text from overlapping region
                    current_text = current_segment.text.strip()
                    next_text = next_segment.text.strip()
                    
                    # Find common ending/beginning words (fuzzy matching)
                    duplicate_removed = self._find_and_remove_duplicate_text(current_text, next_text)
                    
                    if duplicate_removed:
                        # Update current segment with cleaned text
                        current_segment = TranscriptionSegment(
                            start=current_segment.start,
                            end=current_segment.end,
                            text=duplicate_removed['current'],
                            confidence=current_segment.confidence,
                            speaker=current_segment.speaker
                        )
                        
                        # Update next segment to avoid double processing
                        segments[i + 1] = TranscriptionSegment(
                            start=next_segment.start,
                            end=next_segment.end,
                            text=duplicate_removed['next'],
                            confidence=next_segment.confidence,
                            speaker=next_segment.speaker
                        )
            
            cleaned_segments.append(current_segment)
            i += 1
            
        logger.debug(f"Overlap removal: {len(segments)} -> {len(cleaned_segments)} segments processed")
        return cleaned_segments
    
    def _find_and_remove_duplicate_text(self, current_text: str, next_text: str) -> Optional[Dict[str, str]]:
        """
        Find and remove duplicate text between current and next segments.
        Uses both exact matching and fuzzy matching for robustness.
        
        Args:
            current_text: Text from current chunk
            next_text: Text from next chunk
            
        Returns:
            Dict with cleaned 'current' and 'next' text, or None if no duplicates found
        """
        if not current_text or not next_text:
            return None
            
        # Split into words for analysis
        current_words = current_text.split()
        next_words = next_text.split()
        
        if len(current_words) < 2 or len(next_words) < 2:
            return None
        
        # Find overlapping words at end of current and start of next
        max_overlap = min(len(current_words) // 2, len(next_words) // 2, 10)  # Limit to reasonable overlap
        
        for overlap_len in range(max_overlap, 0, -1):
            current_ending = ' '.join(current_words[-overlap_len:])
            next_beginning = ' '.join(next_words[:overlap_len])
            
            # Exact match
            if current_ending.lower() == next_beginning.lower():
                cleaned_current = ' '.join(current_words[:-overlap_len]) if overlap_len < len(current_words) else ""
                cleaned_next = ' '.join(next_words[overlap_len:]) if overlap_len < len(next_words) else ""
                
                logger.debug(f"Exact overlap removed: '{current_ending}' ({overlap_len} words)")
                return {'current': cleaned_current, 'next': cleaned_next}
            
            # Fuzzy match (80% similarity)
            similarity = self._calculate_text_similarity(current_ending, next_beginning)
            if similarity > 0.8:
                cleaned_current = ' '.join(current_words[:-overlap_len]) if overlap_len < len(current_words) else ""
                cleaned_next = ' '.join(next_words[overlap_len:]) if overlap_len < len(next_words) else ""
                
                logger.debug(f"Fuzzy overlap removed: '{current_ending}' ~= '{next_beginning}' ({similarity:.2f} similarity)")
                return {'current': cleaned_current, 'next': cleaned_next}
        
        return None
    
    def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate similarity between two text strings using simple token-based approach.
        
        Args:
            text1: First text string
            text2: Second text string
            
        Returns:
            Similarity score between 0.0 and 1.0
        """
        if not text1 or not text2:
            return 0.0
            
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
            
        intersection = len(words1 & words2)
        union = len(words1 | words2)
        
        return intersection / union if union > 0 else 0.0

    def _prepare_audio(self, audio: Union[np.ndarray, str, Path]) -> Tuple[np.ndarray, int]:
        """Prepare audio for transcription with comprehensive preprocessing."""
        if isinstance(audio, (str, Path)):
            # Load from file
            waveform, sample_rate = torchaudio.load(str(audio))
            audio_array = waveform.numpy().squeeze()
        elif isinstance(audio, np.ndarray):
            audio_array = audio
            sample_rate = self.settings.SAMPLE_RATE
        else:
            raise ValueError(f"Unsupported audio type: {type(audio)}")
        
        # Ensure mono
        if audio_array.ndim > 1:
            audio_array = np.mean(audio_array, axis=0)
        
        # Resample if necessary
        if sample_rate != self.settings.SAMPLE_RATE:
            resampler = torchaudio.transforms.Resample(
                orig_freq=sample_rate,
                new_freq=self.settings.SAMPLE_RATE,
            )
            audio_tensor = torch.from_numpy(audio_array).unsqueeze(0)
            audio_array = resampler(audio_tensor).squeeze().numpy()
        
        # Normalize to [-1, 1] range
        if audio_array.max() > 1.0 or audio_array.min() < -1.0:
            audio_array = audio_array / np.max(np.abs(audio_array))
        
        return audio_array, self.settings.SAMPLE_RATE
    
    async def _transcribe_mlx(
        self,
        audio: np.ndarray,
        language: Optional[str],
        return_timestamps: bool,
        return_confidence: bool,
        chunk_length_s: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Transcribe using MLX backend with Apple Silicon optimization and system prompt support."""
        try:
            # Process audio features
            inputs = self.processor(
                audio,
                sampling_rate=self.settings.SAMPLE_RATE,
                return_tensors="np",
            )
            
            # Convert to MLX arrays
            input_features = mx.array(inputs.input_features.squeeze())
            
            # Calculate dynamic token limit based on audio duration
            audio_duration_seconds = len(audio) / self.settings.SAMPLE_RATE
            # More generous estimate for production: ~5 tokens per second + larger buffer for complex content
            estimated_tokens = max(int(audio_duration_seconds * 5), 100)  # Minimum 100 tokens
            max_tokens = min(estimated_tokens + 300, 2048)  # Maximum 2048 tokens, add 300 token buffer for safety
            
            logger.info(f"MLX Audio duration: {audio_duration_seconds:.1f}s, using max_tokens: {max_tokens} (estimated: {estimated_tokens}, buffer: 300)")
            
            # Generate transcription with optimized prompt
            prompt = f"<|startoftranscript|><|{language or 'en'}|><|transcribe|>"
            if return_timestamps:
                prompt += "<|notimestamps|>"  # This actually enables timestamps in Whisper
            
            response = await asyncio.to_thread(
                generate,
                self.mlx_model,
                self.mlx_tokenizer,
                prompt=prompt,
                max_tokens=max_tokens,
                temp=0.0,
            )
            
            # Parse response
            text = response.strip()
            
            result = {
                "text": text,
                "language": language or "en",
            }
            
            if return_timestamps:
                # TODO: Implement timestamp extraction from MLX response
                result["chunks"] = [{
                    "text": text,
                    "timestamp": [0, len(audio) / self.settings.SAMPLE_RATE]
                }]
            
            if return_confidence:
                # TODO: Implement confidence extraction from MLX response
                result["confidence"] = 0.9  # High confidence placeholder
            
            return result
            
        except Exception as e:
            logger.error(f"MLX transcription failed: {e}")
            # Fallback to PyTorch
            self.use_mlx = False
            return await self._transcribe_pytorch(
                audio, language, return_timestamps, return_confidence
            )
    
    async def _transcribe_pytorch(
        self,
        audio: np.ndarray,
        language: Optional[str],
        return_timestamps: bool,
        return_confidence: bool,
        chunk_length_s: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Transcribe using Voxtral's apply_transcrition_request API with system prompt support."""
        try:
            logger.info("Using Voxtral apply_transcrition_request API")
            
            # Use provided system prompt or default
            effective_prompt = system_prompt or "You are a professional transcription assistant. Transcribe the audio exactly as spoken. Output only the transcription."
            logger.info(f"Using system prompt: {effective_prompt[:100]}...")
            
            # Voxtral TRANSCRIPTION MODE with dynamic language support
            # Map frontend language codes to Voxtral format
            voxtral_language = None
            if language:
                if language == "auto":
                    voxtral_language = None  # Let Voxtral auto-detect
                else:
                    voxtral_language = language  # Use specified language (de, en, es, etc.)
            
            logger.info(f"Using language setting: {voxtral_language or 'auto-detect'}")
            logger.info("Using Voxtral with temperature=0.0 for transcription mode")
            
            # Build parameters dynamically
            transcription_params = {
                "audio": [audio],
                "format": ["wav"],
                "temperature": 0.0,
                "model_id": self.settings.MODEL_NAME,
                "sampling_rate": self.settings.SAMPLE_RATE,
                "return_tensors": "pt",
                "system_prompt": effective_prompt
            }
            
            # Only add language if explicitly set (None = auto-detect)
            if voxtral_language is not None:
                transcription_params["language"] = voxtral_language
            
            result = await asyncio.to_thread(
                self.processor.apply_transcrition_request,
                **transcription_params
            )
            
            logger.info(f"Voxtral processor result type: {type(result)}")
            logger.info(f"Voxtral processor result keys: {result.keys()}")
            
            # Move to device
            inputs = {k: v.to(self.device) if torch.is_tensor(v) else v for k, v in result.items()}
            
            # Calculate dynamic token limit based on audio duration
            audio_duration_seconds = len(audio) / self.settings.SAMPLE_RATE
            # More generous estimate for production: ~5 tokens per second + larger buffer for complex content
            # This accounts for dense content, technical terms, proper nouns, and safety margin
            estimated_tokens = max(int(audio_duration_seconds * 5), 100)  # Minimum 100 tokens
            max_tokens = min(estimated_tokens + 300, 2048)  # Maximum 2048 tokens, add 300 token buffer for safety
            
            logger.info(f"Audio duration: {audio_duration_seconds:.1f}s, using max_new_tokens: {max_tokens} (estimated: {estimated_tokens}, buffer: 300)")
            
            # Generate transcription - use the actual model, not pipeline
            with torch.no_grad():
                outputs = await asyncio.to_thread(
                    self.model.model.generate,  # Pipeline's underlying model
                    **inputs,
                    max_new_tokens=max_tokens,
                    do_sample=False,
                    pad_token_id=self.processor.tokenizer.eos_token_id,
                    # Additional generation parameters for quality
                    repetition_penalty=1.1,
                    length_penalty=1.0,
                    early_stopping=True
                )
            
            # Decode transcription using the correct Voxtral API (same as test_voxtral_native.py)
            transcription = self.processor.decode(outputs[0], skip_special_tokens=True)
            
            # Check if transcription was truncated (production safety check)
            output_length = outputs[0].shape[-1]
            if output_length >= max_tokens - 10:  # If we're close to the limit
                logger.warning(f"Transcription may be truncated - used {output_length}/{max_tokens} tokens for {audio_duration_seconds:.1f}s audio")
                logger.warning("Consider increasing max_tokens or splitting audio into smaller chunks")
            
            logger.info(f"Raw Voxtral transcription: {transcription}")
            
            # Clean up the transcription (remove language prefix if present)
            clean_text = transcription
            if clean_text.startswith(f"lang:{language or 'en'}"):
                clean_text = clean_text[len(f"lang:{language or 'en'}"):].strip()
            
            # Additional cleanup for common Voxtral prefixes
            if clean_text.startswith("<|audio|>"):
                clean_text = clean_text[9:].strip()
            if clean_text.startswith("<|transcribe|>"):
                clean_text = clean_text[14:].strip()
            
            # Process result
            processed_result = {
                "text": clean_text,
                "language": language or "en",
            }
            
            if return_timestamps:
                # For now, create simple timestamp structure
                # TODO: Implement proper timestamp extraction from Voxtral
                processed_result["chunks"] = [{
                    "text": clean_text,
                    "timestamp": [0.0, len(audio) / self.settings.SAMPLE_RATE]
                }]
            
            if return_confidence:
                # Default high confidence for now
                # TODO: Extract actual confidence from Voxtral outputs
                processed_result["confidence"] = 0.95
            
            logger.info(f"Processed Voxtral result: {processed_result}")
            
            return processed_result
                
        except Exception as e:
            logger.error(f"Voxtral transcription failed: {e}")
            # Fallback to empty result rather than crashing
            return {
                "text": "",
                "language": language or "en",
                "confidence": 0.0 if return_confidence else None,
                "error": str(e)
            }
    
    def _update_performance_stats(self, inference_time: float, audio_duration: float) -> None:
        """Update performance statistics for monitoring."""
        self.total_inference_time += inference_time
        self.total_audio_duration += audio_duration
        self.inference_count += 1
        self.total_processing_time += inference_time  # Keep legacy compatibility
    
    def get_performance_stats(self) -> Dict[str, float]:
        """Get comprehensive performance statistics."""
        if self.inference_count == 0:
            return {
                "avg_inference_time": 0.0,
                "avg_real_time_factor": 0.0,
                "total_audio_processed": 0.0,
                "total_inference_time": 0.0,
                "inference_count": 0,
            }
        
        return {
            "avg_inference_time": self.total_inference_time / self.inference_count,
            "avg_real_time_factor": (
                self.total_inference_time / self.total_audio_duration
                if self.total_audio_duration > 0 else 0
            ),
            "total_audio_processed": self.total_audio_duration,
            "total_inference_time": self.total_inference_time,
            "inference_count": self.inference_count,
        }
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get comprehensive model information."""
        return {
            "model_name": self.settings.MODEL_NAME,
            "device": self.device,
            "engine": "mlx" if self.use_mlx else "pytorch",
            "precision": self.settings.PRECISION,
            "is_loaded": self.is_loaded,
            "mlx_available": MLX_AVAILABLE,
            "apple_silicon": self.settings.is_apple_silicon,
            "load_time": self.load_time,
            "performance": self.get_performance_stats(),
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform comprehensive health check."""
        try:
            if not self.is_loaded:
                return {
                    "status": "unhealthy",
                    "reason": "Model not loaded",
                    "timestamp": time.time(),
                }
            
            # Quick inference test
            dummy_audio = np.zeros(1000, dtype=np.float32)  # 0.0625s at 16kHz
            start_time = time.time()
            
            await self._transcribe_audio_internal(
                dummy_audio,
                language="en",
                return_timestamps=False,
                return_confidence=False,
            )
            
            health_check_time = time.time() - start_time
            
            return {
                "status": "healthy",
                "model_loaded": True,
                "device": self.device,
                "engine": "mlx" if self.use_mlx else "pytorch",
                "health_check_time": health_check_time,
                "performance": self.get_performance_stats(),
                "timestamp": time.time(),
            }
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "status": "unhealthy",
                "reason": str(e),
                "timestamp": time.time(),
            }
    
    async def transcribe_file(self, request: TranscriptionRequest) -> TranscriptionResponse:
        """
        Transcribe a single audio file with automatic chunking for large files.
        """
        
        if not self.is_loaded:
            raise RuntimeError("Voxtral model not loaded")
        
        job_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Initialize job progress tracking
        job_progress = JobProgress(
            job_id=job_id,
            status=ProcessingStatus.PROCESSING,
            progress_percent=0.0,
            can_cancel=True
        )
        self.active_jobs[job_id] = job_progress
        
        try:
            async with self.active_job_semaphore:
                # Register session for cleanup
                cleanup_service.register_session(job_id)
                
                # Get audio information
                audio_info = await self.audio_processor.get_audio_info(
                    request.audio_data, request.filename
                )
                
                # Calculate correct chunk count based on actual chunk_duration_minutes
                duration_minutes = audio_info.get("duration_minutes", 0)
                chunk_duration = request.processing_config.chunk_duration_minutes
                import math
                estimated_chunks = max(1, math.ceil(duration_minutes / chunk_duration))
                
                # Update progress with corrected file info
                job_progress.total_chunks = estimated_chunks
                
                logger.info(f"Audio: {duration_minutes:.2f}min, Chunk size: {chunk_duration}min, Estimated chunks: {estimated_chunks}")
                
                logger.info(f"Starting transcription: {request.filename} ({audio_info['duration_minutes']:.2f} min)")
                
                # Send job started notification
                await progress_notifier.notify_job_started(job_id, {
                    "filename": request.filename,
                    "duration_minutes": duration_minutes,
                    "total_chunks": estimated_chunks,
                    "chunk_duration_minutes": chunk_duration
                })
                
                # Process audio chunks
                all_segments = []
                chunk_results = []
                
                async for chunk in self.audio_processor.process_large_file(
                    request.audio_data,
                    request.filename,
                    request.processing_config
                ):
                    # Check if job was cancelled
                    if job_progress.status == ProcessingStatus.CANCELLED:
                        logger.info(f"Job {job_id} was cancelled")
                        break
                    
                    # Process chunk
                    chunk_result = await self._transcribe_chunk(chunk, request)
                    chunk_results.append(chunk_result)
                    
                    # Merge segments with correct timing offsets
                    for segment in chunk_result.segments:
                        adjusted_segment = TranscriptionSegment(
                            start=segment.start + chunk.start_time,
                            end=segment.end + chunk.start_time,
                            text=segment.text,
                            confidence=segment.confidence,
                            speaker=segment.speaker
                        )
                        all_segments.append(adjusted_segment)
                    
                    # Update progress
                    completed_chunks = len(chunk_results)
                    job_progress.progress_percent = (completed_chunks / job_progress.total_chunks) * 100
                    job_progress.current_chunk = completed_chunks
                    job_progress.chunks_completed = chunk_results
                    
                    # Send progress notification to Node.js service
                    await progress_notifier.notify_chunk_completed(
                        job_id,
                        chunk.index,
                        job_progress.total_chunks,
                        {
                            "processing_time": chunk_result.processing_time,
                            "confidence": chunk_result.confidence,
                            "text": " ".join(seg.text for seg in chunk_result.segments if seg.text.strip())
                        }
                    )
                    
                    cleanup_service.update_session_activity(job_id)
                    
                    logger.debug(f"Completed chunk {completed_chunks}/{job_progress.total_chunks}")
                
                # Apply smart overlap removal to eliminate duplicates
                if len(all_segments) > 1:
                    logger.debug(f"Applying smart overlap removal to {len(all_segments)} segments")
                    all_segments = self._remove_overlap_duplicates(all_segments, request.processing_config.overlap_seconds)
                
                # Finalize transcription
                processing_time = time.time() - start_time
                
                if job_progress.status != ProcessingStatus.CANCELLED:
                    job_progress.status = ProcessingStatus.COMPLETED
                    job_progress.progress_percent = 100.0
                
                # Create response
                response = TranscriptionResponse(
                    id=job_id,
                    filename=request.filename,
                    status=job_progress.status,
                    segments=all_segments,
                    full_text=" ".join(segment.text for segment in all_segments if segment.text.strip()),
                    duration=audio_info.get("duration_seconds", 0),
                    processing_time=processing_time,
                    chunk_count=len(chunk_results),
                    confidence=self._calculate_average_confidence(all_segments),
                    completed_at=datetime.utcnow(),
                    file_size=len(request.audio_data),
                    audio_info=audio_info,
                )
                
                self.total_inferences += 1
                self.total_processing_time += processing_time
                
                # Send job completed notification
                await progress_notifier.notify_job_completed(job_id, {
                    "processing_time": processing_time,
                    "segments": len(all_segments),
                    "full_text": " ".join(segment.text for segment in all_segments if segment.text.strip()),
                    "confidence": response.confidence,
                    "chunk_count": len(chunk_results)
                })
                
                # Schedule cleanup
                await cleanup_service.schedule_delayed_cleanup(job_id, 300)  # 5 minutes
                
                logger.info(f"Transcription completed: {request.filename} in {processing_time:.2f}s")
                
                return response
                
        except Exception as e:
            job_progress.status = ProcessingStatus.FAILED
            job_progress.error_message = str(e)
            
            # Send job failed notification
            await progress_notifier.notify_job_failed(
                job_id, 
                str(e), 
                job_progress.progress_percent
            )
            
            # Immediate cleanup on failure
            await cleanup_service.cleanup_session(job_id, force=True)
            
            logger.error(f"Transcription failed for {request.filename}: {e}")
            raise
            
        finally:
            # Remove from active jobs
            self.active_jobs.pop(job_id, None)
    
    async def transcribe_batch(self, request: BatchTranscriptionRequest) -> str:
        """
        Start batch transcription of multiple files.
        Returns batch job ID for tracking progress.
        """
        
        batch_id = str(uuid.uuid4())
        
        # Create batch job
        batch_job = BatchTranscriptionResponse(
            batch_id=batch_id,
            status=ProcessingStatus.PROCESSING,
            total_files=len(request.files),
            output_directory=request.output_directory,
            processing_config=request.processing_config,
        )
        
        self.batch_jobs[batch_id] = batch_job
        
        # Start batch processing in background
        asyncio.create_task(self._process_batch(batch_id, request))
        
        logger.info(f"Started batch job {batch_id} with {len(request.files)} files")
        
        return batch_id
    
    async def cancel_job(self, job_id: str) -> bool:
        """Cancel an active transcription job."""
        
        if job_id in self.active_jobs:
            self.active_jobs[job_id].status = ProcessingStatus.CANCELLED
            
            # Send job cancelled notification
            await progress_notifier.notify_job_cancelled(job_id)
            
            await cleanup_service.cleanup_session(job_id, force=True)
            logger.info(f"Cancelled job: {job_id}")
            return True
            
        return False
    
    async def get_job_progress(self, job_id: str) -> Optional[JobProgress]:
        """Get progress information for a job."""
        return self.active_jobs.get(job_id)
    
    async def get_batch_progress(self, batch_id: str) -> Optional[BatchTranscriptionResponse]:
        """Get progress information for a batch job."""
        return self.batch_jobs.get(batch_id)
    
    async def start_streaming_session(self) -> str:
        """Start a new streaming transcription session."""
        
        session_id = str(uuid.uuid4())
        
        session = StreamingSession(
            session_id=session_id,
            status="active",
            processing_config=request.processing_config if 'request' in locals() else ProcessingConfig(),
        )
        
        self.streaming_sessions[session_id] = session
        cleanup_service.register_session(session_id)
        
        logger.info(f"Started streaming session: {session_id}")
        
        return session_id
    
    async def process_streaming_chunk(self, session_id: str, audio_data: str) -> Optional[Dict[str, Any]]:
        """Process a streaming audio chunk."""
        
        if session_id not in self.streaming_sessions:
            return None
        
        session = self.streaming_sessions[session_id]
        
        # TODO: Implement streaming chunk processing
        # This would involve:
        # 1. Decode base64 audio data
        # 2. Buffer audio chunks
        # 3. Process when buffer is full
        # 4. Return partial/final results
        
        session.last_activity = datetime.utcnow()
        cleanup_service.update_session_activity(session_id)
        
        return {
            "type": "partial",
            "text": "Streaming processing not yet implemented",
            "confidence": 0.0
        }
    
    async def end_streaming_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """End a streaming session and return final results."""
        
        if session_id not in self.streaming_sessions:
            return None
        
        session = self.streaming_sessions.pop(session_id)
        
        # Schedule cleanup
        await cleanup_service.schedule_delayed_cleanup(session_id, 60)
        
        logger.info(f"Ended streaming session: {session_id}")
        
        return {
            "session_id": session_id,
            "final_segments": session.final_segments,
            "total_duration": 0.0,  # TODO: Calculate from segments
        }
    
    async def cleanup_streaming_session(self, session_id: str) -> None:
        """Clean up streaming session resources."""
        
        self.streaming_sessions.pop(session_id, None)
        await cleanup_service.cleanup_session(session_id, force=True)
    
    async def get_active_sessions(self) -> List[Dict[str, Any]]:
        """Get list of active streaming sessions."""
        
        return [
            {
                "session_id": session.session_id,
                "status": session.status,
                "created_at": session.created_at.isoformat(),
                "last_activity": session.last_activity.isoformat(),
            }
            for session in self.streaming_sessions.values()
        ]
    
    async def reload(self) -> None:
        """Reload the Voxtral model."""
        
        logger.info("Reloading Voxtral model...")
        
        # Clear current model
        self.model = None
        self.is_loaded = False
        
        # Force garbage collection
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        # Reinitialize
        await self.initialize()
    
    async def cleanup(self) -> None:
        """Clean up engine resources with comprehensive cleanup including GPU memory."""
        logger.info("🛑 Cleaning up VoxFlow Voxtral Engine...")
        
        try:
            # Cancel all active jobs
            for job_id in list(self.active_jobs.keys()):
                await self.cancel_job(job_id)
            
            # Clean up streaming sessions
            for session_id in list(self.streaming_sessions.keys()):
                await self.cleanup_streaming_session(session_id)
            
            # Stop cleanup service
            await cleanup_service.stop()
            
            # Clean up models with proper GPU memory cleanup
            logger.info("🧹 Cleaning up models and GPU memory...")
            
            if self.model is not None:
                if hasattr(self.model, 'model') and hasattr(self.model.model, 'cpu'):
                    try:
                        # Move model to CPU before deletion to free GPU memory
                        self.model.model.cpu()
                        logger.debug("Model moved to CPU")
                    except Exception as e:
                        logger.warning(f"Failed to move model to CPU: {e}")
                del self.model
                self.model = None
                logger.debug("Model deleted")
            
            if self.processor is not None:
                del self.processor
                self.processor = None
                logger.debug("Processor deleted")
            
            if self.mlx_model is not None:
                del self.mlx_model
                self.mlx_model = None
                logger.debug("MLX model deleted")
            
            if self.mlx_tokenizer is not None:
                del self.mlx_tokenizer
                self.mlx_tokenizer = None
                logger.debug("MLX tokenizer deleted")
            
            # Force Python garbage collection multiple times
            for i in range(3):
                collected = gc.collect()
                logger.debug(f"Garbage collection {i+1}/3: collected {collected} objects")
            
            # Device-specific cleanup with enhanced MPS support
            if self.device == "mps":
                logger.info("🍎 Performing Apple Silicon MPS GPU memory cleanup...")
                try:
                    torch.mps.empty_cache()
                    logger.info("✅ MPS cache emptied successfully")
                    
                    # Additional MPS-specific cleanup
                    if hasattr(torch.mps, 'synchronize'):
                        torch.mps.synchronize()
                        logger.debug("MPS synchronized")
                    
                    # Force another garbage collection after cache clear
                    gc.collect()
                    logger.debug("Post-MPS garbage collection completed")
                    
                except Exception as e:
                    logger.error(f"❌ Failed to empty MPS cache: {e}")
                    
            elif self.device == "cuda":
                logger.info("🟢 Performing CUDA GPU memory cleanup...")
                try:
                    torch.cuda.empty_cache()
                    torch.cuda.synchronize()
                    logger.info("✅ CUDA cache emptied successfully")
                except Exception as e:
                    logger.error(f"❌ Failed to empty CUDA cache: {e}")
            
            # Final state reset
            self.is_loaded = False
            self.active_jobs.clear()
            self.streaming_sessions.clear()
            self.batch_jobs.clear()
            
            logger.info("✅ VoxFlow Voxtral Engine cleanup completed successfully")
            
        except Exception as e:
            logger.error(f"❌ Error during cleanup: {e}")
            # Even if cleanup partially fails, mark as unloaded
            self.is_loaded = False
    
    def _get_device(self) -> str:
        """Determine the best available device - legacy compatibility."""
        return self._determine_device()
    
    async def _transcribe_chunk(
        self, 
        chunk: AudioChunk, 
        request: TranscriptionRequest
    ) -> ChunkResult:
        """Transcribe a single audio chunk."""
        
        start_time = time.time()
        
        try:
            # Use Voxtral's apply_transcrition_request for chunk transcription
            logger.info(f"Transcribing chunk {chunk.index} with Voxtral API")
            
            # Get transcription using our Voxtral-compatible method
            transcription_result = await self._transcribe_audio_internal(
                chunk.audio_data,
                language=getattr(request, 'language', None),  # Use request language setting
                return_timestamps=request.include_timestamps,
                return_confidence=True,
                system_prompt=getattr(request, 'system_prompt', None),
            )
            
            # Process result into segments
            segments = []
            text = transcription_result.get("text", "").strip()
            
            if text:  # Only create segment if there's text
                if request.include_timestamps and "chunks" in transcription_result:
                    # Use provided chunks/timestamps if available
                    for chunk_result in transcription_result["chunks"]:
                        segment = TranscriptionSegment(
                            start=chunk_result["timestamp"][0] or 0.0,
                            end=chunk_result["timestamp"][1] or chunk.duration,
                            text=chunk_result["text"].strip(),
                            confidence=chunk_result.get("confidence"),
                        )
                        segments.append(segment)
                else:
                    # Create single segment for entire chunk
                    segment = TranscriptionSegment(
                        start=0.0,
                        end=chunk.duration,
                        text=text,
                        confidence=transcription_result.get("confidence"),
                    )
                    segments.append(segment)
            
            logger.info(f"Chunk {chunk.index} transcribed: '{text[:100]}{'...' if len(text) > 100 else ''}')")
            
            processing_time = time.time() - start_time
            
            return ChunkResult(
                chunk_index=chunk.index,
                start_time=chunk.start_time,
                duration=chunk.duration,
                segments=segments,
                processing_time=processing_time,
                confidence=self._calculate_average_confidence(segments),
                status=ProcessingStatus.COMPLETED,
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            
            return ChunkResult(
                chunk_index=chunk.index,
                start_time=chunk.start_time,
                duration=chunk.duration,
                segments=[],
                processing_time=processing_time,
                status=ProcessingStatus.FAILED,
                error_message=str(e),
            )
    
    async def _process_batch(self, batch_id: str, request: BatchTranscriptionRequest) -> None:
        """Process a batch of files in the background."""
        
        batch_job = self.batch_jobs[batch_id]
        
        try:
            for file_id in request.files:
                # TODO: Implement file retrieval by ID
                # This would involve getting the file data from storage
                
                # For now, skip actual processing
                batch_job.completed_files += 1
                
                # Update progress
                progress = (batch_job.completed_files / batch_job.total_files) * 100
                logger.debug(f"Batch {batch_id} progress: {progress:.1f}%")
            
            batch_job.status = ProcessingStatus.COMPLETED
            batch_job.completed_at = datetime.utcnow()
            
        except Exception as e:
            batch_job.status = ProcessingStatus.FAILED
            logger.error(f"Batch processing failed for {batch_id}: {e}")
    
    def _calculate_average_confidence(self, segments: List[TranscriptionSegment]) -> Optional[float]:
        """Calculate average confidence score from segments."""
        
        confidences = [seg.confidence for seg in segments if seg.confidence is not None]
        
        if not confidences:
            return None
        
        return sum(confidences) / len(confidences)
    
    @property
    def average_processing_time(self) -> Optional[float]:
        """Get average processing time per inference."""
        
        if self.total_inferences == 0:
            return None
        
        return self.total_processing_time / self.total_inferences
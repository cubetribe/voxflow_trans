# VoxFlow vLLM Voxtral Model Loader - Production-Ready Implementation
# Specialized for Mistral's Voxtral audio transcription models
# Follows production standards from CLAUDE.md

import asyncio
import logging
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import torch
import torchaudio
from vllm import LLM, SamplingParams
from vllm.model_executor.models.interfaces import SupportsMultiModal
from mistral_common.protocol.instruct.messages import UserMessage
from mistral_common.protocol.instruct.request import ChatCompletionRequest
from mistral_common.tokens.tokenizers.mistral import MistralTokenizer

from app.utils.logging import get_logger
from app.core.exceptions import VoxFlowError

logger = get_logger(__name__)


class VoxtralVLLMError(VoxFlowError):
    """Voxtral-specific vLLM errors"""
    pass


class VoxtralVLLMLoader:
    """
    Production-Ready vLLM Voxtral Model Loader
    
    Implements Mistral's Voxtral audio transcription models using vLLM
    for optimized inference performance and memory management.
    
    Features:
    - Memory-efficient model loading with vLLM
    - Audio preprocessing pipeline
    - Production-ready error handling
    - Comprehensive logging and monitoring
    - Graceful resource cleanup
    """
    
    def __init__(
        self,
        model_name: str = "mistralai/Voxtral-Mini-3B-2507",
        device: str = "auto",
        max_model_len: int = 32768,
        gpu_memory_utilization: float = 0.9,
        enforce_eager: bool = True,
        disable_custom_all_reduce: bool = True
    ):
        """
        Initialize VoxtralVLLMLoader
        
        Args:
            model_name: Voxtral model identifier
            device: Target device (auto, cuda, cpu)
            max_model_len: Maximum sequence length
            gpu_memory_utilization: GPU memory usage fraction
            enforce_eager: Use eager execution for stability
            disable_custom_all_reduce: Disable custom all-reduce for compatibility
        """
        self.model_name = model_name
        self.device = device
        self.max_model_len = max_model_len
        self.gpu_memory_utilization = gpu_memory_utilization
        self.enforce_eager = enforce_eager
        self.disable_custom_all_reduce = disable_custom_all_reduce
        
        self.llm: Optional[LLM] = None
        self.tokenizer: Optional[MistralTokenizer] = None
        self.sampling_params: Optional[SamplingParams] = None
        self.is_initialized = False
        
        logger.info(f"🚀 VoxtralVLLMLoader initialized for {model_name}")
    
    async def initialize(self) -> None:
        """
        Initialize vLLM model and tokenizer
        
        Raises:
            VoxtralVLLMError: If initialization fails
        """
        try:
            logger.info(f"🔧 Initializing vLLM for Voxtral model: {self.model_name}")
            
            # Validate model name
            if "voxtral" not in self.model_name.lower():
                raise VoxtralVLLMError(f"Invalid Voxtral model name: {self.model_name}")
            
            # Configure vLLM parameters for production
            vllm_kwargs = {
                "model": self.model_name,
                "tokenizer": self.model_name,
                "max_model_len": self.max_model_len,
                "gpu_memory_utilization": self.gpu_memory_utilization,
                "enforce_eager": self.enforce_eager,
                "disable_custom_all_reduce": self.disable_custom_all_reduce,
                "trust_remote_code": True,  # Required for Voxtral
                "dtype": "float16",  # Memory optimization
            }
            
            # Initialize vLLM model
            logger.info("📦 Loading vLLM model...")
            self.llm = LLM(**vllm_kwargs)
            
            # Verify multimodal support
            if not isinstance(self.llm.llm_engine.model_executor.driver_worker.model_runner.model, SupportsMultiModal):
                raise VoxtralVLLMError(f"Model {self.model_name} does not support multimodal inputs")
            
            # Initialize tokenizer
            logger.info("🔤 Loading Mistral tokenizer...")
            self.tokenizer = MistralTokenizer.from_model(self.model_name)
            
            # Configure sampling parameters for transcription
            self.sampling_params = SamplingParams(
                temperature=0.0,  # Deterministic for transcription
                max_tokens=1024,  # Sufficient for most transcriptions
                stop_token_ids=[self.tokenizer.instruct_tokenizer.tokenizer.eos_id]
            )
            
            self.is_initialized = True
            logger.info("✅ VoxtralVLLMLoader initialization complete")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize VoxtralVLLMLoader: {str(e)}")
            raise VoxtralVLLMError(f"Initialization failed: {str(e)}") from e
    
    def _preprocess_audio(self, audio_path: str) -> torch.Tensor:
        """
        Preprocess audio file for Voxtral input
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Preprocessed audio tensor
            
        Raises:
            VoxtralVLLMError: If audio processing fails
        """
        try:
            logger.debug(f"🎵 Preprocessing audio: {audio_path}")
            
            # Load audio with torchaudio
            waveform, sample_rate = torchaudio.load(audio_path)
            
            # Convert to mono if stereo
            if waveform.shape[0] > 1:
                waveform = torch.mean(waveform, dim=0, keepdim=True)
                logger.debug("🔄 Converted stereo to mono")
            
            # Resample to 16kHz (Voxtral standard)
            target_sample_rate = 16000
            if sample_rate != target_sample_rate:
                resampler = torchaudio.transforms.Resample(
                    orig_freq=sample_rate,
                    new_freq=target_sample_rate
                )
                waveform = resampler(waveform)
                logger.debug(f"🔄 Resampled from {sample_rate}Hz to {target_sample_rate}Hz")
            
            # Normalize audio
            waveform = waveform / torch.max(torch.abs(waveform))
            
            # Convert to float32 for vLLM
            waveform = waveform.float()
            
            logger.debug(f"✅ Audio preprocessed: shape={waveform.shape}, dtype={waveform.dtype}")
            return waveform
            
        except Exception as e:
            logger.error(f"❌ Audio preprocessing failed: {str(e)}")
            raise VoxtralVLLMError(f"Audio preprocessing failed: {str(e)}") from e
    
    def _create_chat_request(self, audio_tensor: torch.Tensor, prompt: str = "Transcribe this audio:") -> ChatCompletionRequest:
        """
        Create Mistral chat completion request with audio
        
        Args:
            audio_tensor: Preprocessed audio tensor
            prompt: Transcription prompt
            
        Returns:
            Chat completion request
        """
        try:
            # Convert tensor to the format expected by Mistral
            audio_data = {
                "type": "audio",
                "audio": audio_tensor.numpy().tolist(),
                "sample_rate": 16000
            }
            
            # Create user message with audio
            user_message = UserMessage(
                content=[
                    {"type": "text", "text": prompt},
                    audio_data
                ]
            )
            
            # Create chat completion request
            request = ChatCompletionRequest(
                messages=[user_message],
                model=self.model_name
            )
            
            return request
            
        except Exception as e:
            logger.error(f"❌ Failed to create chat request: {str(e)}")
            raise VoxtralVLLMError(f"Chat request creation failed: {str(e)}") from e
    
    async def transcribe_audio(
        self,
        audio_path: str,
        prompt: str = "Transcribe this audio:",
        language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribe audio file using Voxtral
        
        Args:
            audio_path: Path to audio file
            prompt: Transcription prompt
            language: Target language (optional)
            
        Returns:
            Transcription result with metadata
            
        Raises:
            VoxtralVLLMError: If transcription fails
        """
        if not self.is_initialized:
            raise VoxtralVLLMError("VoxtralVLLMLoader not initialized")
        
        try:
            logger.info(f"🎙️ Starting transcription: {audio_path}")
            
            # Preprocess audio
            audio_tensor = self._preprocess_audio(audio_path)
            
            # Create chat request
            if language:
                prompt = f"Transcribe this audio in {language}:"
            
            chat_request = self._create_chat_request(audio_tensor, prompt)
            
            # Tokenize the request
            tokenized = self.tokenizer.encode_chat_completion(chat_request)
            
            # Generate transcription
            logger.debug("🔄 Generating transcription...")
            outputs = self.llm.generate(
                prompt_token_ids=[tokenized.tokens],
                sampling_params=self.sampling_params
            )
            
            # Extract transcription
            if not outputs or not outputs[0].outputs:
                raise VoxtralVLLMError("No transcription output generated")
            
            transcription = outputs[0].outputs[0].text.strip()
            
            # Prepare result
            result = {
                "text": transcription,
                "language": language or "auto",
                "model": self.model_name,
                "confidence": 1.0,  # vLLM doesn't provide confidence scores
                "metadata": {
                    "audio_duration": audio_tensor.shape[-1] / 16000,  # Duration in seconds
                    "sample_rate": 16000,
                    "prompt": prompt,
                    "tokens_generated": len(outputs[0].outputs[0].token_ids)
                }
            }
            
            logger.info(f"✅ Transcription complete: {len(transcription)} characters")
            return result
            
        except Exception as e:
            logger.error(f"❌ Transcription failed: {str(e)}")
            raise VoxtralVLLMError(f"Transcription failed: {str(e)}") from e
    
    async def transcribe_audio_stream(
        self,
        audio_chunks: List[torch.Tensor],
        prompt: str = "Transcribe this audio:",
        language: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Transcribe audio stream chunks
        
        Args:
            audio_chunks: List of audio tensor chunks
            prompt: Transcription prompt
            language: Target language (optional)
            
        Returns:
            List of transcription results
        """
        if not self.is_initialized:
            raise VoxtralVLLMError("VoxtralVLLMLoader not initialized")
        
        results = []
        
        try:
            logger.info(f"🎙️ Starting streaming transcription: {len(audio_chunks)} chunks")
            
            for i, chunk in enumerate(audio_chunks):
                logger.debug(f"🔄 Processing chunk {i+1}/{len(audio_chunks)}")
                
                # Save chunk to temporary file
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                    temp_path = temp_file.name
                    torchaudio.save(temp_path, chunk.unsqueeze(0), 16000)
                
                try:
                    # Transcribe chunk
                    result = await self.transcribe_audio(temp_path, prompt, language)
                    result["chunk_index"] = i
                    results.append(result)
                finally:
                    # Cleanup temp file
                    os.unlink(temp_path)
            
            logger.info(f"✅ Streaming transcription complete: {len(results)} chunks processed")
            return results
            
        except Exception as e:
            logger.error(f"❌ Streaming transcription failed: {str(e)}")
            raise VoxtralVLLMError(f"Streaming transcription failed: {str(e)}") from e
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get model information and status
        
        Returns:
            Model information dictionary
        """
        return {
            "model_name": self.model_name,
            "device": self.device,
            "is_initialized": self.is_initialized,
            "max_model_len": self.max_model_len,
            "gpu_memory_utilization": self.gpu_memory_utilization,
            "supports_multimodal": True,
            "framework": "vLLM",
            "model_type": "voxtral"
        }
    
    async def cleanup(self) -> None:
        """
        Cleanup resources and free memory
        """
        try:
            logger.info("🧹 Cleaning up VoxtralVLLMLoader resources...")
            
            if self.llm:
                # vLLM cleanup
                del self.llm
                self.llm = None
            
            if self.tokenizer:
                del self.tokenizer
                self.tokenizer = None
            
            self.sampling_params = None
            self.is_initialized = False
            
            # Force garbage collection
            import gc
            gc.collect()
            
            # Clear CUDA cache if available
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            logger.info("✅ VoxtralVLLMLoader cleanup complete")
            
        except Exception as e:
            logger.error(f"❌ Cleanup failed: {str(e)}")
    
    def __del__(self):
        """Destructor to ensure cleanup"""
        if self.is_initialized:
            asyncio.create_task(self.cleanup())


# Factory function for easy instantiation
def create_voxtral_loader(
    model_name: str = "mistralai/Voxtral-Mini-3B-2507",
    **kwargs
) -> VoxtralVLLMLoader:
    """
    Factory function to create VoxtralVLLMLoader instance
    
    Args:
        model_name: Voxtral model name
        **kwargs: Additional configuration parameters
        
    Returns:
        Configured VoxtralVLLMLoader instance
    """
    return VoxtralVLLMLoader(model_name=model_name, **kwargs)
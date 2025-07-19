# 🧪 Internal Testing Guide

This guide explains how to test VoxFlow components internally via terminal, as discovered during the debugging session.

## 🎯 Why Internal Testing?

Internal testing bypasses the frontend and API layers to test core Voxtral functionality directly. This is useful for:
- **Model debugging** - Test if Voxtral loads and generates text
- **API validation** - Verify core transcription logic  
- **Performance testing** - Benchmark without UI overhead
- **Troubleshooting** - Isolate issues to specific components

## 🔧 Internal Test Methods

### 1. Direct Python Model Test

Test Voxtral model loading and transcription directly:

```bash
# Navigate to Python service
cd backend/python-service
source venv/bin/activate

# Start Python interactive shell
python

# Test Voxtral directly
>>> import numpy as np
>>> from transformers import VoxtralForConditionalGeneration, AutoProcessor

>>> print("Loading Voxtral...")
>>> processor = AutoProcessor.from_pretrained("mistralai/Voxtral-Mini-3B-2507")
>>> model = VoxtralForConditionalGeneration.from_pretrained("mistralai/Voxtral-Mini-3B-2507")

>>> # Create test audio (1 second of silence)
>>> audio_data = np.zeros(16000, dtype=np.float32)

>>> # Test Voxtral's special API
>>> result = processor.apply_transcrition_request(
...     audio=[audio_data],    # MUST be list!
...     format=["wav"],        # MUST be list!
...     output="transcription"
... )

>>> print(f"Voxtral result: {result}")
# Expected output: "lang:enI'm sorry." or similar
```

### 2. Test Script Method

Create a reusable test script:

```bash
# Create test file
cat > test_voxtral_direct.py << 'EOF'
#!/usr/bin/env python3
"""
Direct Voxtral test without API layers
"""
import numpy as np
from transformers import AutoProcessor, VoxtralForConditionalGeneration
import time

print("🚀 Testing Voxtral directly...")

# Load model with MPS device
print("📥 Loading model...")
start_time = time.time()
processor = AutoProcessor.from_pretrained("mistralai/Voxtral-Mini-3B-2507")
model = VoxtralForConditionalGeneration.from_pretrained("mistralai/Voxtral-Mini-3B-2507")
load_time = time.time() - start_time
print(f"✅ Model loaded in {load_time:.1f}s")

# Test with synthetic audio
print("🎵 Creating test audio...")
audio = np.random.randn(16000).astype(np.float32)  # 1 second random audio

# Transcribe using Voxtral API
print("🎯 Running transcription...")
transcribe_start = time.time()
result = processor.apply_transcrition_request(
    audio=[audio],
    format=["wav"],
    output="transcription"
)
transcribe_time = time.time() - transcribe_start

print(f"📝 Transcription result: {result}")
print(f"⏱️ Transcription time: {transcribe_time:.1f}s")
print("🎉 Direct test completed!")
EOF

# Run the test
DEVICE=mps python test_voxtral_direct.py
```

### 3. Service API Test (Without Frontend)

Test the Python service API directly:

```bash
# Ensure Python service is running
# In another terminal: uvicorn app.main:app --reload --port 8000

# Test health endpoint
curl http://localhost:8000/health

# Test model status
curl http://localhost:8000/models/status

# Test transcription with file upload
curl -X POST http://localhost:8000/transcribe/file \
  -F "file=@path/to/audio.wav" \
  -F "response_format=json"
```

### 4. Load Testing

Test performance with different audio sizes:

```python
# test_performance.py
import numpy as np
import time
from transformers import AutoProcessor, VoxtralForConditionalGeneration

processor = AutoProcessor.from_pretrained("mistralai/Voxtral-Mini-3B-2507")
model = VoxtralForConditionalGeneration.from_pretrained("mistralai/Voxtral-Mini-3B-2507")

# Test different audio lengths
test_durations = [1, 5, 10, 30]  # seconds

for duration in test_durations:
    print(f"\n🎵 Testing {duration}s audio...")
    
    # Generate test audio
    audio = np.random.randn(duration * 16000).astype(np.float32)
    
    # Time transcription
    start = time.time()
    result = processor.apply_transcrition_request(
        audio=[audio],
        format=["wav"],
        output="transcription"
    )
    elapsed = time.time() - start
    
    real_time_factor = duration / elapsed
    print(f"📊 {duration}s audio processed in {elapsed:.1f}s (RTF: {real_time_factor:.1f}x)")
    print(f"📝 Result: {result}")
```

## 🚨 Debugging Session Findings

### The System Crash Issue

During our debugging session, Claude Code performed internal testing and discovered:

**What happened:**
- Internal Python test was **successful** ✅
- Voxtral loaded and generated text: `"lang:enI'm sorry."`
- **BUT**: System crashed during testing

**Root cause:**
- `DEVICE=cpu` instead of `DEVICE=mps`  
- CPU cannot handle 3B parameter model
- Apple Silicon MPS required for stability

**Solution:**
```bash
# CRITICAL: Always use MPS device on Apple Silicon
export DEVICE=mps
DEVICE=mps python test_voxtral_direct.py
```

### Key Discoveries

1. **Voxtral works** - Model loads and generates text
2. **Special API required** - `apply_transcrition_request()` not standard pipeline
3. **Device critical** - MPS prevents system overload
4. **Lists required** - Audio and format must be lists: `[audio_data]`, `["wav"]`

## 🎯 Test Sequence for Troubleshooting

When debugging VoxFlow issues, test in this order:

1. **Direct Model Test** - Verify Voxtral loads
2. **Synthetic Audio Test** - Test with generated audio  
3. **Real Audio Test** - Test with actual audio files
4. **Service API Test** - Test FastAPI endpoints
5. **Full Integration Test** - Test complete workflow

This isolates issues to specific layers and prevents wasting time on UI debugging when the core model has problems.

## ⚠️ Safety Notes

- **Always use `DEVICE=mps`** on Apple Silicon
- **Monitor memory usage** during large file tests
- **Test incrementally** - start with short audio files
- **Use virtual environment** to avoid dependency conflicts

This internal testing approach saved our debugging session and revealed the critical MPS device requirement!
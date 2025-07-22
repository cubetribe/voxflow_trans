#!/usr/bin/env python3
"""
Two-Phase Processing Test Script for VoxFlow
Tests the new Two-Phase Processing capability with real audio files.

Features tested:
- Phase 1: Transcription (temperature=0.0)
- Phase 2: Understanding/Analysis (temperature=0.2) with system prompt
- Audio chunk concatenation
- Response structure validation
"""

import asyncio
import os
import sys
import time
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.core.config import settings
from app.core.voxtral_engine import VoxtralEngine
from app.models.transcription import TranscriptionRequest, ProcessingConfig


async def test_two_phase_processing():
    """Test Two-Phase Processing with a multi-chunk audio file."""
    
    print("🚀 Two-Phase Processing Test for VoxFlow")
    print("=" * 50)
    
    # Initialize Voxtral engine
    print("📦 Initializing Voxtral Engine...")
    engine = VoxtralEngine(settings)
    
    try:
        await engine.initialize()
        print("✅ Voxtral Engine initialized successfully")
        
        # Test file path (use the existing 5min test file)
        test_file = project_root / "5min_Test.mp3"
        
        if not test_file.exists():
            print(f"❌ Test file not found: {test_file}")
            print("💡 Create a 5min_Test.mp3 file or update the path")
            return
        
        # Read test audio
        print(f"📁 Reading test file: {test_file}")
        with open(test_file, 'rb') as f:
            audio_data = f.read()
        
        print(f"📊 File size: {len(audio_data):,} bytes")
        
        # Test 1: Single-Phase Processing (no system prompt)
        print("\n" + "=" * 50)
        print("🎯 TEST 1: Single-Phase Processing (Baseline)")
        print("=" * 50)
        
        request_single = TranscriptionRequest(
            audio_data=audio_data,
            filename="5min_Test.mp3",
            language="de",  # German
            include_timestamps=True,
            include_confidence=True,
            processing_config=ProcessingConfig(
                chunk_duration_minutes=3,  # Force multiple chunks
                overlap_seconds=10
            )
            # No system_prompt = single-phase
        )
        
        start_time = time.time()
        response_single = await engine.transcribe_file(request_single)
        single_time = time.time() - start_time
        
        print(f"✅ Single-Phase completed in {single_time:.2f}s")
        print(f"📄 Processing mode: {response_single.processing_mode}")
        print(f"📊 Chunks processed: {response_single.chunk_count}")
        print(f"📝 Transcription length: {len(response_single.full_text):,} chars")
        print(f"📈 Confidence: {response_single.confidence:.2f}")
        print(f"💡 Analysis result: {response_single.analysis}")
        print(f"📝 First 200 chars: '{response_single.full_text[:200]}'")
        
        # Test 2: Two-Phase Processing (with system prompt)
        print("\n" + "=" * 50)
        print("🧠 TEST 2: Two-Phase Processing (Transcription + Understanding)")
        print("=" * 50)
        
        system_prompt = """Du bist ein intelligenter Transkriptions-Assistent. 
Analysiere die vollständige Audioaufnahme und erstelle:
1. Eine prägnante Zusammenfassung der wichtigsten Punkte
2. Die Hauptthemen des Gesprächs
3. Relevante Details oder Erkenntnisse

Antworte auf Deutsch und halte die Antwort strukturiert und präzise."""
        
        request_two_phase = TranscriptionRequest(
            audio_data=audio_data,
            filename="5min_Test.mp3",
            language="de",  # German
            include_timestamps=True,
            include_confidence=True,
            processing_config=ProcessingConfig(
                chunk_duration_minutes=3,  # Force multiple chunks
                overlap_seconds=10
            ),
            system_prompt=system_prompt  # Triggers Two-Phase Processing
        )
        
        start_time = time.time()
        response_two_phase = await engine.transcribe_file(request_two_phase)
        two_phase_time = time.time() - start_time
        
        print(f"✅ Two-Phase completed in {two_phase_time:.2f}s")
        print(f"📄 Processing mode: {response_two_phase.processing_mode}")
        print(f"📊 Chunks processed: {response_two_phase.chunk_count}")
        print(f"📝 Transcription length: {len(response_two_phase.full_text):,} chars")
        print(f"📈 Transcription confidence: {response_two_phase.confidence:.2f}")
        print(f"🧠 Analysis length: {len(response_two_phase.analysis or ''):,} chars")
        print(f"📈 Analysis confidence: {response_two_phase.analysis_confidence or 'N/A'}")
        print(f"📝 First 200 chars transcription: '{response_two_phase.full_text[:200]}'")
        print(f"🧠 Analysis result:")
        print(f"   {response_two_phase.analysis}")
        
        # Comparison
        print("\n" + "=" * 50)
        print("📊 COMPARISON RESULTS")
        print("=" * 50)
        
        print(f"⏱️  Processing Time:")
        print(f"   Single-Phase: {single_time:.2f}s")
        print(f"   Two-Phase: {two_phase_time:.2f}s")
        print(f"   Overhead: +{two_phase_time - single_time:.2f}s ({((two_phase_time/single_time-1)*100):+.1f}%)")
        
        print(f"\n📄 Transcription Quality:")
        print(f"   Single-Phase: {len(response_single.full_text):,} chars")
        print(f"   Two-Phase: {len(response_two_phase.full_text):,} chars")
        
        if response_two_phase.analysis:
            print(f"\n🧠 Additional Value (Two-Phase):")
            print(f"   ✅ AI Analysis: {len(response_two_phase.analysis):,} chars")
            print(f"   ✅ Understanding Mode: Active")
            print(f"   ✅ System Prompt Processing: Success")
        else:
            print(f"\n❌ Two-Phase Analysis: Failed or Empty")
        
        # Validation
        print(f"\n✅ VALIDATION RESULTS:")
        validation_passed = True
        
        if response_single.processing_mode != "transcription-only":
            print(f"❌ Single-phase should be 'transcription-only', got: {response_single.processing_mode}")
            validation_passed = False
        else:
            print(f"✅ Single-phase mode correct: {response_single.processing_mode}")
        
        if response_two_phase.processing_mode != "two-phase":
            print(f"❌ Two-phase should be 'two-phase', got: {response_two_phase.processing_mode}")
            validation_passed = False
        else:
            print(f"✅ Two-phase mode correct: {response_two_phase.processing_mode}")
        
        if not response_two_phase.analysis:
            print(f"❌ Two-phase analysis should not be empty")
            validation_passed = False
        else:
            print(f"✅ Two-phase analysis present: {len(response_two_phase.analysis):,} chars")
        
        if response_single.analysis:
            print(f"❌ Single-phase should not have analysis, got: {len(response_single.analysis):,} chars")
            validation_passed = False
        else:
            print(f"✅ Single-phase analysis correctly empty")
        
        print(f"\n🎯 OVERALL TEST RESULT: {'✅ PASSED' if validation_passed else '❌ FAILED'}")
        
        if validation_passed:
            print("\n🎉 Two-Phase Processing implementation is working correctly!")
            print("💡 Ready for production testing with real use cases")
        else:
            print("\n⚠️  Some validation checks failed - review implementation")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        # Cleanup
        print("\n🧹 Cleaning up engine...")
        await engine.cleanup()
        print("✅ Cleanup completed")


if __name__ == "__main__":
    # Run the test
    asyncio.run(test_two_phase_processing())
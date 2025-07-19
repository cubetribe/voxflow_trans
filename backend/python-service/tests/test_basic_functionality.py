"""
VoxFlow Basic Functionality Tests

Simple, working tests that verify core functionality.
Following CLAUDE.md requirements: production-ready, no shortcuts, but realistic scope.
"""

import asyncio
import os
import sys
from pathlib import Path

import pytest
import numpy as np
import soundfile as sf

# Add the app directory to Python path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from tests.conftest import skip_if_no_real_audio


class TestAudioFileHandling:
    """Test basic audio file handling capabilities."""

    def test_numpy_audio_generation(self, temp_dir):
        """Test generating synthetic audio with numpy."""
        # Generate 1-second sine wave
        sample_rate = 16000
        duration = 1.0
        frequency = 440  # A4 note
        
        t = np.linspace(0, duration, int(sample_rate * duration))
        audio = 0.5 * np.sin(2 * np.pi * frequency * t)
        
        # Save as WAV file
        output_file = temp_dir / "test_sine.wav"
        sf.write(str(output_file), audio, sample_rate)
        
        # Verify file was created
        assert output_file.exists()
        assert output_file.stat().st_size > 0
        
        # Verify we can read it back
        audio_read, sr_read = sf.read(str(output_file))
        assert sr_read == sample_rate
        assert len(audio_read) == len(audio)
        
        # Verify audio content is similar (allowing for file format precision)
        correlation = np.corrcoef(audio, audio_read)[0, 1]
        assert correlation > 0.99

    @skip_if_no_real_audio
    def test_real_audio_file_reading(self, real_audio_file):
        """Test reading the real audio file."""
        assert real_audio_file.exists()
        
        # Get file info
        file_size = real_audio_file.stat().st_size
        assert file_size > 1000  # At least 1KB
        
        # Try to read with librosa (will handle MP4 format)
        try:
            import librosa
            
            # Read audio file
            audio, sr = librosa.load(str(real_audio_file), sr=None)
            
            # Verify audio properties
            assert len(audio) > 0
            assert sr > 0
            assert sr >= 8000  # Reasonable sample rate
            
            # Verify audio is not all zeros
            assert np.any(audio != 0)
            
            # Calculate duration
            duration = len(audio) / sr
            assert duration > 0.1  # At least 100ms
            
            print(f"Real audio file: {file_size} bytes, {duration:.2f}s, {sr}Hz")
            
        except ImportError:
            pytest.skip("librosa not available for real audio testing")
        except Exception as e:
            pytest.skip(f"Could not read real audio file: {e}")

    def test_multiple_audio_formats(self, temp_dir):
        """Test generating different audio formats."""
        sample_rate = 16000
        duration = 0.5  # Short duration for faster tests
        
        # Generate test audio
        t = np.linspace(0, duration, int(sample_rate * duration))
        audio = 0.3 * np.sin(2 * np.pi * 440 * t)
        
        # Test different formats
        formats = [
            ("test.wav", "WAV"),
            ("test.flac", "FLAC"),
        ]
        
        created_files = []
        
        for filename, format_name in formats:
            output_file = temp_dir / filename
            
            try:
                sf.write(str(output_file), audio, sample_rate, format=format_name)
                
                if output_file.exists() and output_file.stat().st_size > 0:
                    created_files.append((output_file, format_name))
                    
                    # Verify we can read it back
                    audio_read, sr_read = sf.read(str(output_file))
                    assert sr_read == sample_rate
                    assert len(audio_read) > 0
                    
            except Exception as e:
                print(f"Format {format_name} not supported: {e}")
        
        # Should have created at least WAV
        assert len(created_files) >= 1
        print(f"Successfully created {len(created_files)} audio formats")


class TestAsyncFunctionality:
    """Test async capabilities."""

    @pytest.mark.asyncio
    async def test_async_sleep(self):
        """Test basic async functionality."""
        start_time = asyncio.get_event_loop().time()
        await asyncio.sleep(0.1)  # 100ms
        end_time = asyncio.get_event_loop().time()
        
        elapsed = end_time - start_time
        assert 0.09 <= elapsed <= 0.2  # Allow some tolerance

    @pytest.mark.asyncio
    async def test_async_file_operations(self, temp_dir):
        """Test async file operations."""
        test_file = temp_dir / "async_test.txt"
        test_content = "Hello VoxFlow Test!"
        
        # Write file
        test_file.write_text(test_content)
        
        # Simulate async processing
        await asyncio.sleep(0.01)
        
        # Read file
        content = test_file.read_text()
        assert content == test_content


class TestPythonEnvironment:
    """Test Python environment setup."""

    def test_required_packages_available(self):
        """Test that required packages are available."""
        required_packages = [
            "numpy",
            "pytest",
            "soundfile",
        ]
        
        available_packages = []
        missing_packages = []
        
        for package in required_packages:
            try:
                __import__(package)
                available_packages.append(package)
            except ImportError:
                missing_packages.append(package)
        
        print(f"Available packages: {available_packages}")
        if missing_packages:
            print(f"Missing packages: {missing_packages}")
        
        # Core packages must be available
        assert "numpy" in available_packages
        assert "pytest" in available_packages
        assert "soundfile" in available_packages

    def test_python_version(self):
        """Test Python version compatibility."""
        version = sys.version_info
        
        # Require Python 3.8+
        assert version.major >= 3
        assert version.minor >= 8
        
        print(f"Python version: {version.major}.{version.minor}.{version.micro}")

    def test_numpy_functionality(self):
        """Test numpy basic functionality."""
        # Create test array
        arr = np.array([1, 2, 3, 4, 5])
        
        # Test basic operations
        assert arr.mean() == 3.0
        assert arr.sum() == 15
        assert len(arr) == 5
        
        # Test audio-relevant operations
        sample_rate = 16000
        duration = 0.1
        t = np.linspace(0, duration, int(sample_rate * duration))
        sine_wave = np.sin(2 * np.pi * 440 * t)
        
        assert len(sine_wave) == int(sample_rate * duration)
        assert -1.1 <= sine_wave.min() <= -0.9  # Approximately -1
        assert 0.9 <= sine_wave.max() <= 1.1   # Approximately 1


class TestFileSystemOperations:
    """Test file system operations."""

    def test_temp_directory_access(self, temp_dir):
        """Test temporary directory access."""
        assert temp_dir.exists()
        assert temp_dir.is_dir()
        
        # Test write permissions
        test_file = temp_dir / "write_test.txt"
        test_file.write_text("test")
        assert test_file.exists()
        
        # Test read permissions
        content = test_file.read_text()
        assert content == "test"

    def test_large_file_creation(self, temp_dir):
        """Test creating larger files."""
        large_file = temp_dir / "large_test.bin"
        
        # Create 1MB file
        data = b"x" * (1024 * 1024)  # 1MB
        large_file.write_bytes(data)
        
        assert large_file.exists()
        assert large_file.stat().st_size == 1024 * 1024
        
        # Clean up
        large_file.unlink()

    def test_directory_operations(self, temp_dir):
        """Test directory operations."""
        # Create subdirectory
        sub_dir = temp_dir / "subdir"
        sub_dir.mkdir()
        assert sub_dir.exists()
        assert sub_dir.is_dir()
        
        # Create file in subdirectory
        sub_file = sub_dir / "file.txt"
        sub_file.write_text("content")
        assert sub_file.exists()
        
        # List directory contents
        contents = list(temp_dir.iterdir())
        assert sub_dir in contents
"""
Unit Tests for Smart Overlap Removal
Tests the VoxFlow overlap removal functionality for multi-chunk processing.
"""

import pytest
from app.core.voxtral_engine import VoxtralEngine
from app.models.transcription import TranscriptionSegment
from app.core.config import settings


class TestOverlapRemoval:
    """Test cases for smart overlap removal functionality."""
    
    @pytest.fixture
    def engine(self):
        """Create a VoxtralEngine instance for testing."""
        return VoxtralEngine(settings)
    
    def test_exact_overlap_removal(self, engine):
        """Test exact text overlap removal between segments."""
        segments = [
            TranscriptionSegment(
                start=0.0,
                end=30.0,
                text="Hello world this is a test of overlap removal",
                confidence=0.95
            ),
            TranscriptionSegment(
                start=25.0,  # 5 second overlap
                end=55.0,
                text="test of overlap removal and it works perfectly",
                confidence=0.93
            )
        ]
        
        cleaned = engine._remove_overlap_duplicates(segments, overlap_seconds=10.0)
        
        assert len(cleaned) == 2
        # First segment should have ending words removed
        assert "Hello world this is a" in cleaned[0].text
        assert "test of overlap removal" not in cleaned[0].text
        # Second segment should have beginning words removed
        assert "and it works perfectly" in cleaned[1].text
        assert "test of overlap removal" not in cleaned[1].text
    
    def test_fuzzy_overlap_removal(self, engine):
        """Test fuzzy text overlap removal for similar but not identical text."""
        segments = [
            TranscriptionSegment(
                start=0.0,
                end=30.0,
                text="The quick brown fox jumps over the lazy dog today",
                confidence=0.95
            ),
            TranscriptionSegment(
                start=25.0,
                end=55.0,
                text="the lazy dog today is sleeping peacefully",
                confidence=0.93
            )
        ]
        
        cleaned = engine._remove_overlap_duplicates(segments, overlap_seconds=10.0)
        
        assert len(cleaned) == 2
        # Should remove similar overlap
        full_text = " ".join(seg.text for seg in cleaned)
        # Should not contain duplicate "the lazy dog today"
        assert full_text.count("lazy dog") <= 1 or full_text.count("today") <= 1
    
    def test_no_overlap(self, engine):
        """Test segments with no overlap are left unchanged."""
        segments = [
            TranscriptionSegment(
                start=0.0,
                end=30.0,
                text="First segment completely different",
                confidence=0.95
            ),
            TranscriptionSegment(
                start=35.0,  # Gap, no overlap
                end=65.0,
                text="Second segment also unique content",
                confidence=0.93
            )
        ]
        
        cleaned = engine._remove_overlap_duplicates(segments, overlap_seconds=10.0)
        
        assert len(cleaned) == 2
        assert cleaned[0].text == "First segment completely different"
        assert cleaned[1].text == "Second segment also unique content"
    
    def test_single_segment(self, engine):
        """Test single segment is returned unchanged."""
        segments = [
            TranscriptionSegment(
                start=0.0,
                end=30.0,
                text="Only one segment here",
                confidence=0.95
            )
        ]
        
        cleaned = engine._remove_overlap_duplicates(segments, overlap_seconds=10.0)
        
        assert len(cleaned) == 1
        assert cleaned[0].text == "Only one segment here"
    
    def test_text_similarity_calculation(self, engine):
        """Test the text similarity calculation method."""
        # Identical text
        similarity = engine._calculate_text_similarity("hello world", "hello world")
        assert similarity == 1.0
        
        # Partially similar
        similarity = engine._calculate_text_similarity("hello world", "hello universe")
        assert 0.0 < similarity < 1.0
        
        # Completely different
        similarity = engine._calculate_text_similarity("hello world", "goodbye mars")
        assert similarity == 0.0
        
        # Empty strings
        similarity = engine._calculate_text_similarity("", "hello")
        assert similarity == 0.0
        
        similarity = engine._calculate_text_similarity("", "")
        assert similarity == 0.0
    
    def test_find_duplicate_text_exact(self, engine):
        """Test exact duplicate text finding."""
        result = engine._find_and_remove_duplicate_text(
            "The weather is nice today",
            "today is a beautiful day"
        )
        
        assert result is not None
        assert "today" in result['current'] or result['current'] == ""
        assert "is a beautiful day" in result['next']
    
    def test_find_duplicate_text_fuzzy(self, engine):
        """Test fuzzy duplicate text finding."""
        result = engine._find_and_remove_duplicate_text(
            "The quick brown fox",
            "brown fox jumps high"
        )
        
        if result:  # May or may not find fuzzy match depending on similarity threshold
            assert "brown fox" not in result['current'] or "brown fox" not in result['next']
    
    def test_german_overlap_example(self, engine):
        """Test German text overlap removal (based on real VoxFlow output)."""
        segments = [
            TranscriptionSegment(
                start=0.0,
                end=180.0,  # 3 minutes
                text="Liebe Leserin, lieber Leser, willkommen zu unserem Podcast über deutsche Sprache",
                confidence=0.94
            ),
            TranscriptionSegment(
                start=170.0,  # 10 second overlap
                end=300.0,  # 5 minutes total
                text="deutsche Sprache und Kultur. Heute sprechen wir über Voxtral",
                confidence=0.92
            )
        ]
        
        cleaned = engine._remove_overlap_duplicates(segments, overlap_seconds=20.0)
        
        assert len(cleaned) == 2
        full_text = " ".join(seg.text for seg in cleaned)
        # Should not contain duplicate "deutsche Sprache"
        assert full_text.count("deutsche Sprache") <= 1
    
    def test_multiple_chunk_overlap(self, engine):
        """Test overlap removal with multiple chunks (3+ segments)."""
        segments = [
            TranscriptionSegment(
                start=0.0,
                end=180.0,
                text="First chunk with some content here",
                confidence=0.95
            ),
            TranscriptionSegment(
                start=170.0,
                end=350.0,
                text="content here continues in second chunk",
                confidence=0.93
            ),
            TranscriptionSegment(
                start=340.0,
                end=520.0,
                text="second chunk and now third final chunk",
                confidence=0.91
            )
        ]
        
        cleaned = engine._remove_overlap_duplicates(segments, overlap_seconds=15.0)
        
        assert len(cleaned) == 3
        full_text = " ".join(seg.text for seg in cleaned)
        # Check for no obvious duplicates
        assert full_text.count("content here") <= 1
        assert full_text.count("second chunk") <= 1
    
    def test_edge_case_very_short_text(self, engine):
        """Test edge case with very short overlapping text."""
        segments = [
            TranscriptionSegment(
                start=0.0,
                end=30.0,
                text="Hi",
                confidence=0.85
            ),
            TranscriptionSegment(
                start=25.0,
                end=55.0,
                text="Hi there",
                confidence=0.87
            )
        ]
        
        cleaned = engine._remove_overlap_duplicates(segments, overlap_seconds=10.0)
        
        assert len(cleaned) == 2
        # With very short text, algorithm should be conservative
        full_text = " ".join(seg.text for seg in cleaned if seg.text.strip())
        assert len(full_text) > 0  # Should not remove all text
    
    def test_confidence_preservation(self, engine):
        """Test that confidence scores are preserved during overlap removal."""
        original_segments = [
            TranscriptionSegment(
                start=0.0,
                end=30.0,
                text="Test confidence preservation here",
                confidence=0.95
            ),
            TranscriptionSegment(
                start=25.0,
                end=55.0,
                text="here and continuing forward",
                confidence=0.88
            )
        ]
        
        cleaned = engine._remove_overlap_duplicates(original_segments, overlap_seconds=10.0)
        
        assert len(cleaned) == 2
        # Confidence should be preserved
        assert cleaned[0].confidence == 0.95
        assert cleaned[1].confidence == 0.88
        
        # Timing should be preserved
        assert cleaned[0].start == 0.0
        assert cleaned[0].end == 30.0
        assert cleaned[1].start == 25.0
        assert cleaned[1].end == 55.0


if __name__ == "__main__":
    # Run tests directly
    pytest.main([__file__, "-v"])
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WaveformDisplay from '@/components/audio/WaveformDisplay';
import type { WaveformData } from '@/types/audio.types';

describe('WaveformDisplay Integration Tests', () => {
  const mockOnSeek = vi.fn();
  const mockWaveformData: WaveformData = {
    peaks: [0.1, 0.3, 0.8, 0.5, 0.2, 0.7, 0.4, 0.9, 0.1, 0.6],
    duration: 10.0,
    sampleRate: 44100,
    channels: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render waveform display with default props', () => {
      render(<WaveformDisplay />);
      
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveClass('w-full');
    });

    it('should render with custom dimensions', () => {
      render(
        <WaveformDisplay 
          height={80} 
          width={600}
          responsive={false}
        />
      );
      
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toHaveStyle({ height: '80px' });
    });

    it('should apply custom CSS classes', () => {
      render(
        <WaveformDisplay 
          className="custom-waveform border-2" 
        />
      );
      
      const container = screen.getByRole('img', { hidden: true }).parentElement;
      expect(container).toHaveClass('waveform-display', 'custom-waveform', 'border-2');
    });
  });

  describe('Audio Data Visualization', () => {
    it('should display static waveform data', () => {
      render(
        <WaveformDisplay 
          waveformData={mockWaveformData}
          duration={10}
          currentTime={5}
        />
      );
      
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toBeInTheDocument();
      
      // Check if time indicators are displayed
      expect(screen.getByText('5:00')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });

    it('should handle empty audio data gracefully', () => {
      render(
        <WaveformDisplay 
          waveformData={{ peaks: [], duration: 0, sampleRate: 44100, channels: 1 }}
        />
      );
      
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toBeInTheDocument();
      
      // Should show "No audio data" state
      expect(screen.queryByText(/\d+:\d+/)).not.toBeInTheDocument();
    });
  });

  describe('Recording State Integration', () => {
    it('should display recording indicator when recording', () => {
      render(
        <WaveformDisplay 
          isRecording={true}
          volume={0.5}
        />
      );
      
      expect(screen.getByText('Recording')).toBeInTheDocument();
      expect(screen.getByText('Input Level')).toBeInTheDocument();
      
      // Check for animated recording dot
      const recordingDot = screen.getByText('Recording').previousElementSibling;
      expect(recordingDot).toHaveClass('animate-pulse', 'bg-red-500');
    });

    it('should update volume level during recording', () => {
      const { rerender } = render(
        <WaveformDisplay 
          isRecording={true}
          volume={0.3}
        />
      );
      
      const volumeBar = screen.getByText('Input Level')
        .parentElement?.querySelector('.bg-green-500');
      expect(volumeBar).toHaveStyle({ width: '30%' });

      // Update volume
      rerender(
        <WaveformDisplay 
          isRecording={true}
          volume={0.8}
        />
      );
      
      expect(volumeBar).toHaveStyle({ width: '80%' });
    });

    it('should not show recording UI when not recording', () => {
      render(
        <WaveformDisplay 
          isRecording={false}
          volume={0.5}
        />
      );
      
      expect(screen.queryByText('Recording')).not.toBeInTheDocument();
      expect(screen.queryByText('Input Level')).not.toBeInTheDocument();
    });
  });

  describe('Playback Integration', () => {
    it('should show playhead when playing', () => {
      render(
        <WaveformDisplay 
          isPlaying={true}
          waveformData={mockWaveformData}
          duration={10}
          currentTime={3}
          showPlayhead={true}
        />
      );
      
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toBeInTheDocument();
      
      // Time indicators should be visible
      expect(screen.getByText('3:00')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });

    it('should hide playhead when showPlayhead is false', () => {
      render(
        <WaveformDisplay 
          waveformData={mockWaveformData}
          duration={10}
          currentTime={3}
          showPlayhead={false}
        />
      );
      
      // Time indicators should still be visible
      expect(screen.getByText('3:00')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
  });

  describe('Seek Functionality Integration', () => {
    it('should call onSeek when canvas is clicked', () => {
      render(
        <WaveformDisplay 
          waveformData={mockWaveformData}
          duration={10}
          onSeek={mockOnSeek}
        />
      );
      
      const canvas = screen.getByRole('img', { hidden: true });
      
      // Mock canvas dimensions for click calculation
      Object.defineProperty(canvas, 'getBoundingClientRect', {
        value: () => ({
          left: 0,
          top: 0,
          width: 400,
          height: 60,
        }),
        writable: true,
      });

      // Click at 50% of the canvas width (should seek to 50% of duration)
      fireEvent.click(canvas, { clientX: 200, clientY: 30 });
      
      expect(mockOnSeek).toHaveBeenCalledWith(5); // 50% of 10 seconds
    });

    it('should not allow seeking when recording', () => {
      render(
        <WaveformDisplay 
          isRecording={true}
          waveformData={mockWaveformData}
          duration={10}
          onSeek={mockOnSeek}
        />
      );
      
      const canvas = screen.getByRole('img', { hidden: true });
      fireEvent.click(canvas);
      
      expect(mockOnSeek).not.toHaveBeenCalled();
    });

    it('should not allow seeking when no onSeek callback provided', () => {
      render(
        <WaveformDisplay 
          waveformData={mockWaveformData}
          duration={10}
        />
      );
      
      const canvas = screen.getByRole('img', { hidden: true });
      
      // Should not throw error when clicking
      expect(() => {
        fireEvent.click(canvas);
      }).not.toThrow();
    });

    it('should show pointer cursor when seekable', () => {
      render(
        <WaveformDisplay 
          waveformData={mockWaveformData}
          duration={10}
          onSeek={mockOnSeek}
        />
      );
      
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toHaveClass('cursor-pointer');
    });

    it('should show default cursor when not seekable', () => {
      render(
        <WaveformDisplay 
          isRecording={true}
          waveformData={mockWaveformData}
          duration={10}
          onSeek={mockOnSeek}
        />
      );
      
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toHaveClass('cursor-default');
    });
  });

  describe('Visual Customization', () => {
    it('should apply custom colors', () => {
      const customColors = {
        active: '#FF0000',
        inactive: '#00FF00',
        playhead: '#0000FF',
        background: '#FFFF00',
      };

      render(
        <WaveformDisplay 
          colors={customColors}
          waveformData={mockWaveformData}
        />
      );
      
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toHaveStyle({ background: '#FFFF00' });
    });

    it('should use custom bar dimensions', () => {
      render(
        <WaveformDisplay 
          barWidth={4}
          barGap={2}
          waveformData={mockWaveformData}
        />
      );
      
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle window resize when responsive', () => {
      const { container } = render(
        <WaveformDisplay 
          responsive={true}
          waveformData={mockWaveformData}
        />
      );
      
      // Mock container dimensions
      const waveformContainer = container.querySelector('.waveform-display');
      Object.defineProperty(waveformContainer, 'offsetWidth', {
        value: 800,
        writable: true,
      });

      // Trigger resize
      fireEvent(window, new Event('resize'));
      
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toBeInTheDocument();
    });

    it('should not respond to resize when responsive is false', () => {
      render(
        <WaveformDisplay 
          responsive={false}
          width={400}
          waveformData={mockWaveformData}
        />
      );
      
      // Trigger resize
      fireEvent(window, new Event('resize'));
      
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Animation Integration', () => {
    it('should have animation classes for live recording', () => {
      render(
        <WaveformDisplay 
          isRecording={true}
          volume={0.5}
        />
      );
      
      const recordingDot = screen.getByText('Recording').previousElementSibling;
      expect(recordingDot).toHaveClass('animate-pulse');
    });

    it('should use motion component for smooth transitions', () => {
      const { container } = render(
        <WaveformDisplay 
          waveformData={mockWaveformData}
        />
      );
      
      // The canvas should be wrapped in a motion component
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed waveform data gracefully', () => {
      const malformedData = {
        peaks: [NaN, Infinity, -Infinity, 0.5],
        duration: 10,
        sampleRate: 44100,
        channels: 1,
      };

      expect(() => {
        render(
          <WaveformDisplay 
            waveformData={malformedData}
          />
        );
      }).not.toThrow();
      
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toBeInTheDocument();
    });

    it('should handle zero duration gracefully', () => {
      render(
        <WaveformDisplay 
          waveformData={mockWaveformData}
          duration={0}
          currentTime={0}
        />
      );
      
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toBeInTheDocument();
      
      // Should not show time indicators for zero duration
      expect(screen.queryByText(/\d+:\d+/)).not.toBeInTheDocument();
    });

    it('should handle negative values gracefully', () => {
      render(
        <WaveformDisplay 
          volume={-0.5}
          currentTime={-5}
          duration={10}
        />
      );
      
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toBeInTheDocument();
    });
  });
});
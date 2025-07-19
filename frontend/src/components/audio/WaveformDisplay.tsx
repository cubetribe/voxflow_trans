import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { AudioVisualization, WaveformData } from '@/types/audio.types';

export interface WaveformDisplayProps {
  isRecording?: boolean;
  isPlaying?: boolean;
  volume?: number;
  visualization?: AudioVisualization | null;
  waveformData?: WaveformData;
  currentTime?: number;
  duration?: number;
  height?: number;
  width?: number;
  className?: string;
  onSeek?: (time: number) => void;
  showPlayhead?: boolean;
  responsive?: boolean;
  barWidth?: number;
  barGap?: number;
  colors?: {
    active?: string;
    inactive?: string;
    playhead?: string;
    background?: string;
  };
}

const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  isRecording = false,
  isPlaying = false,
  volume = 0,
  visualization,
  waveformData,
  currentTime = 0,
  duration = 0,
  height = 60,
  width,
  className = '',
  onSeek,
  showPlayhead = true,
  responsive = true,
  barWidth = 2,
  barGap = 1,
  colors = {
    active: '#3B82F6',
    inactive: '#E5E7EB',
    playhead: '#EF4444',
    background: '#F9FAFB',
  },
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: width || 400, height });
  const [audioData, setAudioData] = useState<number[]>([]);
  const [liveVolumeBars, setLiveVolumeBars] = useState<number[]>([]);

  // Handle responsive sizing
  useEffect(() => {
    if (!responsive && width) {
      setDimensions({ width, height });
      return;
    }

    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        setDimensions({ width: containerWidth, height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [responsive, width, height]);

  // Update audio data from waveform or visualization
  useEffect(() => {
    if (waveformData?.peaks) {
      setAudioData(waveformData.peaks);
    } else if (visualization?.waveform?.peaks) {
      setAudioData(visualization.waveform.peaks);
    }
  }, [waveformData, visualization]);

  // Live recording visualization
  useEffect(() => {
    if (isRecording) {
      const numBars = Math.floor(dimensions.width / (barWidth + barGap));
      
      // Add new volume level
      setLiveVolumeBars(prev => {
        const newBars = [...prev, volume];
        return newBars.slice(-numBars); // Keep only the last numBars
      });
    } else {
      setLiveVolumeBars([]);
    }
  }, [volume, isRecording, dimensions.width, barWidth, barGap]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: canvasWidth, height: canvasHeight } = dimensions;
    
    // Set canvas size
    canvas.width = canvasWidth * window.devicePixelRatio;
    canvas.height = canvasHeight * window.devicePixelRatio;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.fillStyle = colors.background || '#F9FAFB';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const centerY = canvasHeight / 2;
    const maxBarHeight = canvasHeight * 0.8;

    if (isRecording && liveVolumeBars.length > 0) {
      // Draw live recording bars
      const barCount = Math.floor(canvasWidth / (barWidth + barGap));
      const startX = Math.max(0, canvasWidth - (liveVolumeBars.length * (barWidth + barGap)));

      liveVolumeBars.forEach((vol, index) => {
        const x = startX + (index * (barWidth + barGap));
        const barHeight = Math.max(2, vol * maxBarHeight);
        
        // Create gradient for live bars
        const gradient = ctx.createLinearGradient(0, centerY - barHeight/2, 0, centerY + barHeight/2);
        gradient.addColorStop(0, '#EF4444'); // Red top
        gradient.addColorStop(0.5, '#F97316'); // Orange middle
        gradient.addColorStop(1, '#22C55E'); // Green bottom
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, centerY - barHeight/2, barWidth, barHeight);
        
        // Add glow effect for current volume
        if (index === liveVolumeBars.length - 1 && vol > 0.1) {
          ctx.shadowColor = '#EF4444';
          ctx.shadowBlur = 10;
          ctx.fillRect(x, centerY - barHeight/2, barWidth, barHeight);
          ctx.shadowBlur = 0;
        }
      });
    } else if (audioData.length > 0) {
      // Draw static waveform
      const barCount = Math.floor(canvasWidth / (barWidth + barGap));
      const dataPointsPerBar = Math.max(1, Math.floor(audioData.length / barCount));
      
      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + barGap);
        
        // Calculate average amplitude for this bar
        const startIdx = i * dataPointsPerBar;
        const endIdx = Math.min(startIdx + dataPointsPerBar, audioData.length);
        let sum = 0;
        
        for (let j = startIdx; j < endIdx; j++) {
          sum += Math.abs(audioData[j]);
        }
        
        const avgAmplitude = sum / (endIdx - startIdx);
        const barHeight = Math.max(2, avgAmplitude * maxBarHeight);
        
        // Determine if this bar is before playhead (played)
        const barTime = (i / barCount) * duration;
        const isPlayed = currentTime > barTime;
        
        ctx.fillStyle = isPlayed ? (colors.active || '#3B82F6') : (colors.inactive || '#E5E7EB');
        ctx.fillRect(x, centerY - barHeight/2, barWidth, barHeight);
      }
      
      // Draw playhead
      if (showPlayhead && duration > 0) {
        const playheadX = (currentTime / duration) * canvasWidth;
        ctx.strokeStyle = colors.playhead || '#EF4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, canvasHeight);
        ctx.stroke();
        
        // Playhead circle
        ctx.fillStyle = colors.playhead || '#EF4444';
        ctx.beginPath();
        ctx.arc(playheadX, centerY, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else {
      // Draw empty state
      const barCount = Math.floor(canvasWidth / (barWidth + barGap));
      
      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + barGap);
        const baseHeight = 4;
        
        ctx.fillStyle = colors.inactive || '#E5E7EB';
        ctx.fillRect(x, centerY - baseHeight/2, barWidth, baseHeight);
      }
      
      // Add text overlay
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(
        isRecording ? 'Speak to see waveform...' : 'No audio data',
        canvasWidth / 2,
        centerY + 20
      );
    }
  }, [
    dimensions,
    audioData,
    liveVolumeBars,
    isRecording,
    currentTime,
    duration,
    showPlayhead,
    barWidth,
    barGap,
    colors,
  ]);

  // Animation loop for live recording
  useEffect(() => {
    if (isRecording || isPlaying) {
      const animate = () => {
        drawWaveform();
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      drawWaveform();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, isPlaying, drawWaveform]);

  // Handle canvas click for seeking
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek || !duration || isRecording) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const seekTime = (x / rect.width) * duration;
    
    onSeek(Math.max(0, Math.min(seekTime, duration)));
  }, [onSeek, duration, isRecording]);

  return (
    <div ref={containerRef} className={`waveform-display ${className}`}>
      <motion.canvas
        ref={canvasRef}
        className={`w-full cursor-${onSeek && !isRecording ? 'pointer' : 'default'} rounded`}
        onClick={handleCanvasClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          height: `${height}px`,
          background: colors.background || '#F9FAFB',
        }}
      />
      
      {/* Time indicators */}
      {duration > 0 && !isRecording && (
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      )}
      
      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center justify-center space-x-2 mt-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-red-600 font-medium">Recording</span>
        </div>
      )}
      
      {/* Volume level indicator for recording */}
      {isRecording && (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-1">Input Level</div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-green-500 h-1 rounded-full transition-all duration-100"
              style={{ width: `${Math.min(volume * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to format time
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default WaveformDisplay;
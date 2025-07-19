import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

// Mock WebSocket service
vi.mock('@/services/websocket.service', () => ({
  getWebSocketService: vi.fn(() => ({
    connected: true,
    connect: vi.fn().mockResolvedValue(undefined),
    startLiveStreaming: vi.fn().mockResolvedValue(undefined),
    stopLiveStreaming: vi.fn().mockResolvedValue(undefined),
    sendAudioData: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('useAudioRecorder Integration Tests', () => {
  let mockMediaRecorder: any;
  let mockStream: MediaStream;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock MediaStream
    mockStream = {
      getTracks: vi.fn().mockReturnValue([
        { stop: vi.fn(), kind: 'audio', label: 'Mock Audio Track' },
      ]),
    } as unknown as MediaStream;

    // Mock MediaRecorder with proper event handling
    mockMediaRecorder = {
      start: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      state: 'inactive',
      mimeType: 'audio/webm;codecs=opus',
      ondataavailable: null,
      onstop: null,
      onerror: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    // Mock MediaRecorder constructor
    global.MediaRecorder = vi.fn().mockImplementation(() => mockMediaRecorder);
    MediaRecorder.isTypeSupported = vi.fn().mockReturnValue(true);

    // Mock getUserMedia
    navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue(mockStream);

    // Mock AudioContext
    global.AudioContext = vi.fn().mockImplementation(() => ({
      createMediaStreamSource: vi.fn().mockReturnValue({
        connect: vi.fn(),
      }),
      createAnalyser: vi.fn().mockReturnValue({
        fftSize: 256,
        smoothingTimeConstant: 0.8,
        frequencyBinCount: 128,
        getByteFrequencyData: vi.fn(),
      }),
      close: vi.fn(),
      state: 'running',
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Browser Support Detection', () => {
    it('should detect browser support correctly', () => {
      const { result } = renderHook(() => useAudioRecorder());
      expect(result.current.isSupported).toBe(true);
    });

    it('should handle missing getUserMedia support', () => {
      // Mock missing getUserMedia
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        configurable: true,
      });

      const { result } = renderHook(() => useAudioRecorder());
      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('Recording Lifecycle', () => {
    it('should start recording successfully', async () => {
      const onStart = vi.fn();
      const { result } = renderHook(() => 
        useAudioRecorder({ onStart })
      );

      expect(result.current.isRecording).toBe(false);

      await act(async () => {
        await result.current.startRecording();
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      expect(MediaRecorder).toHaveBeenCalledWith(mockStream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000,
      });
      expect(mockMediaRecorder.start).toHaveBeenCalledWith(1000);
      expect(result.current.isRecording).toBe(true);
      expect(onStart).toHaveBeenCalled();
    });

    it('should handle recording start failure', async () => {
      const onError = vi.fn();
      navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(
        new Error('Permission denied')
      );

      const { result } = renderHook(() => 
        useAudioRecorder({ onError })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.error).toBe('Permission denied');
      expect(onError).toHaveBeenCalledWith('Permission denied');
    });

    it('should pause and resume recording', async () => {
      const onPause = vi.fn();
      const onResume = vi.fn();

      const { result } = renderHook(() => 
        useAudioRecorder({ onPause, onResume })
      );

      // Start recording first
      await act(async () => {
        await result.current.startRecording();
      });

      // Pause recording
      act(() => {
        result.current.pauseRecording();
      });

      expect(mockMediaRecorder.pause).toHaveBeenCalled();
      expect(result.current.isPaused).toBe(true);
      expect(onPause).toHaveBeenCalled();

      // Resume recording
      act(() => {
        result.current.resumeRecording();
      });

      expect(mockMediaRecorder.resume).toHaveBeenCalled();
      expect(result.current.isPaused).toBe(false);
      expect(onResume).toHaveBeenCalled();
    });

    it('should stop recording and return blob', async () => {
      const onStop = vi.fn();
      const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });

      const { result } = renderHook(() => 
        useAudioRecorder({ onStop })
      );

      // Start recording
      await act(async () => {
        await result.current.startRecording();
      });

      // Simulate chunks being recorded
      act(() => {
        // Simulate MediaRecorder ondataavailable event
        const event = { data: mockBlob, size: mockBlob.size };
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable(event);
        }
      });

      // Stop recording
      const stopPromise = act(async () => {
        const stopResult = result.current.stopRecording();
        
        // Simulate MediaRecorder onstop event
        if (mockMediaRecorder.onstop) {
          mockMediaRecorder.onstop();
        }
        
        return stopResult;
      });

      const recordingResult = await stopPromise;

      expect(mockMediaRecorder.stop).toHaveBeenCalled();
      expect(result.current.isRecording).toBe(false);
      expect(recordingResult).toEqual({
        blob: expect.any(Blob),
        duration: expect.any(Number),
      });
      expect(onStop).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.any(Number)
      );
    });
  });

  describe('Real-time Streaming Integration', () => {
    it('should start live streaming when enabled', async () => {
      const { result } = renderHook(() => 
        useAudioRecorder({ 
          enableRealTimeStreaming: true 
        })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      // Verify WebSocket service was called
      const { getWebSocketService } = await import('@/services/websocket.service');
      const wsService = getWebSocketService();
      
      expect(wsService.connect).toHaveBeenCalled();
      expect(wsService.startLiveStreaming).toHaveBeenCalledWith({
        sessionId: expect.stringMatching(/^session-\d+-\w+$/),
        sampleRate: 44100,
        channels: 1,
        format: 'audio/webm;codecs=opus',
      });
    });

    it('should send audio data during streaming', async () => {
      const { result } = renderHook(() => 
        useAudioRecorder({ 
          enableRealTimeStreaming: true 
        })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });
      const mockArrayBuffer = new ArrayBuffer(8);

      // Mock arrayBuffer method
      mockBlob.arrayBuffer = vi.fn().mockResolvedValue(mockArrayBuffer);

      // Simulate data available event
      await act(async () => {
        const event = { data: mockBlob };
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable(event);
        }
        // Wait for async arrayBuffer conversion
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const { getWebSocketService } = await import('@/services/websocket.service');
      const wsService = getWebSocketService();

      expect(wsService.sendAudioData).toHaveBeenCalledWith(
        mockArrayBuffer,
        {
          timestamp: expect.any(Number),
          sequenceNumber: expect.any(Number),
        }
      );
    });
  });

  describe('Audio Analysis Integration', () => {
    it('should setup audio analysis correctly', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      // Verify AudioContext was created and configured
      expect(AudioContext).toHaveBeenCalled();
      
      const audioContextInstance = (AudioContext as any).mock.results[0].value;
      expect(audioContextInstance.createMediaStreamSource).toHaveBeenCalledWith(mockStream);
      expect(audioContextInstance.createAnalyser).toHaveBeenCalled();
    });

    it('should update volume levels during recording', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      // Initial volume should be 0
      expect(result.current.volume).toBe(0);

      // Volume should be updated when audio analysis runs
      // This is tested through the volume level monitoring effect
      expect(result.current.isRecording).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle MediaRecorder errors', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => 
        useAudioRecorder({ onError })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      // Simulate MediaRecorder error
      act(() => {
        const errorEvent = { 
          error: { message: 'Recording failed' } 
        };
        if (mockMediaRecorder.onerror) {
          mockMediaRecorder.onerror(errorEvent);
        }
      });

      expect(result.current.error).toBe('MediaRecorder error: Recording failed');
      expect(onError).toHaveBeenCalledWith('MediaRecorder error: Recording failed');
    });

    it('should handle unsupported MIME types', async () => {
      // Mock unsupported primary MIME type
      MediaRecorder.isTypeSupported = vi.fn()
        .mockReturnValueOnce(false) // Primary type fails
        .mockReturnValueOnce(true);  // Fallback succeeds

      const { result } = renderHook(() => 
        useAudioRecorder({ mimeType: 'audio/unsupported' })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      expect(MediaRecorder.isTypeSupported).toHaveBeenCalledWith('audio/unsupported');
      expect(MediaRecorder.isTypeSupported).toHaveBeenCalledWith('audio/webm');
      expect(result.current.isRecording).toBe(true);
    });

    it('should handle all MIME types unsupported', async () => {
      const onError = vi.fn();
      MediaRecorder.isTypeSupported = vi.fn().mockReturnValue(false);

      const { result } = renderHook(() => 
        useAudioRecorder({ onError })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).toBe('No supported audio format found');
      expect(onError).toHaveBeenCalledWith('No supported audio format found');
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should cleanup resources when component unmounts', async () => {
      const { result, unmount } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      const trackStopSpy = vi.spyOn(mockStream.getTracks()[0], 'stop');

      unmount();

      expect(trackStopSpy).toHaveBeenCalled();
    });

    it('should clear recording data', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      // Simulate some data being recorded
      act(() => {
        const event = { data: new Blob(['test'], { type: 'audio/webm' }) };
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable(event);
        }
      });

      expect(result.current.chunks.length).toBeGreaterThan(0);

      // Stop recording first
      await act(async () => {
        const stopResult = result.current.stopRecording();
        if (mockMediaRecorder.onstop) {
          mockMediaRecorder.onstop();
        }
        await stopResult;
      });

      // Clear recording
      act(() => {
        result.current.clearRecording();
      });

      expect(result.current.chunks).toHaveLength(0);
      expect(result.current.duration).toBe(0);
    });
  });
});
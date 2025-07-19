import { useState, useRef, useCallback, useEffect } from 'react';
import { getWebSocketService } from '@/services/websocket.service';
import { AudioRecordingState } from '@/types/audio.types';

export interface UseAudioRecorderOptions {
  onStart?: () => void;
  onStop?: (blob: Blob, duration: number) => void;
  onPause?: () => void;
  onResume?: () => void;
  onError?: (error: string) => void;
  enableRealTimeStreaming?: boolean;
  maxDuration?: number; // in seconds
  sampleRate?: number;
  channels?: number;
  bitRate?: number;
  mimeType?: string;
}

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  volume: number;
  chunks: Blob[];
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<{ blob: Blob; duration: number } | null>;
  clearRecording: () => void;
  isSupported: boolean;
  error: string | null;
  permission: PermissionState | null;
}

const DEFAULT_OPTIONS: Required<Omit<UseAudioRecorderOptions, 'onStart' | 'onStop' | 'onPause' | 'onResume' | 'onError'>> = {
  enableRealTimeStreaming: false,
  maxDuration: 3600, // 1 hour
  sampleRate: 44100,
  channels: 1,
  bitRate: 128000,
  mimeType: 'audio/webm;codecs=opus',
};

export const useAudioRecorder = (options: UseAudioRecorderOptions = {}): UseAudioRecorderReturn => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // State
  const [state, setState] = useState<AudioRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    volume: 0,
    chunks: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionState | null>(null);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const totalPausedTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const wsService = getWebSocketService();
  const streamingSessionRef = useRef<string | null>(null);
  
  // Check browser support - MediaRecorder is always available in modern browsers
  const isSupported = !!(navigator.mediaDevices?.getUserMedia);
  
  // Check microphone permission
  useEffect(() => {
    if (!isSupported) return;
    
    const checkPermission = async () => {
      try {
        if (navigator.permissions) {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setPermission(result.state);
          
          result.addEventListener('change', () => {
            setPermission(result.state);
          });
        }
      } catch (error) {
        console.warn('Could not check microphone permission:', error);
      }
    };
    
    checkPermission();
  }, [isSupported]);
  
  // Update duration
  useEffect(() => {
    if (state.isRecording && !state.isPaused) {
      durationIntervalRef.current = setInterval(() => {
        const currentTime = Date.now();
        const elapsed = (currentTime - startTimeRef.current - totalPausedTimeRef.current) / 1000;
        
        setState(prev => ({ ...prev, duration: elapsed }));
        
        // Auto-stop at max duration
        if (elapsed >= opts.maxDuration) {
          stopRecording();
        }
      }, 100);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
    
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [state.isRecording, state.isPaused, opts.maxDuration]);
  
  // Monitor volume levels
  useEffect(() => {
    if (state.isRecording && !state.isPaused && analyserRef.current) {
      const updateVolume = () => {
        if (!analyserRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate volume (RMS)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const volume = Math.min(1, rms / 128); // Normalize to 0-1
        
        setState(prev => ({ ...prev, volume }));
      };
      
      volumeIntervalRef.current = setInterval(updateVolume, 50);
    } else {
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = null;
      }
      setState(prev => ({ ...prev, volume: 0 }));
    }
    
    return () => {
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
      }
    };
  }, [state.isRecording, state.isPaused]);
  
  // Setup audio context and analyser
  const setupAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      source.connect(analyserRef.current);
    } catch (error) {
      console.error('Failed to setup audio analysis:', error);
    }
  }, []);
  
  // Start recording
  const startRecording = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      const errorMsg = 'Audio recording is not supported in this browser';
      setError(errorMsg);
      options.onError?.(errorMsg);
      return;
    }
    
    if (state.isRecording) {
      return;
    }
    
    try {
      setError(null);
      
      // Get user media
      const constraints: MediaStreamConstraints = {
        audio: {
          sampleRate: opts.sampleRate,
          channelCount: opts.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      
      // Setup audio analysis
      setupAudioAnalysis(stream);
      
      // Check if browser supports the desired MIME type
      let mimeType = opts.mimeType;
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Fallback MIME types
        const fallbacks = [
          'audio/webm',
          'audio/mp4',
          'audio/ogg',
          'audio/wav',
        ];
        
        mimeType = fallbacks.find(type => MediaRecorder.isTypeSupported(type)) || '';
        
        if (!mimeType) {
          throw new Error('No supported audio format found');
        }
      }
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: opts.bitRate,
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      // Setup MediaRecorder event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          setState(prev => ({ ...prev, chunks: [...chunksRef.current] }));
          
          // Send to WebSocket for real-time transcription
          if (opts.enableRealTimeStreaming && wsService.connected && streamingSessionRef.current) {
            // Convert blob to ArrayBuffer
            event.data.arrayBuffer().then(buffer => {
              wsService.sendAudioData(buffer, {
                timestamp: Date.now(),
                sequenceNumber: chunksRef.current.length - 1,
              });
            }).catch(console.error);
          }
        }
      };
      
      mediaRecorder.onerror = (event) => {
        const errorMsg = `MediaRecorder error: ${(event as any).error?.message || 'Unknown error'}`;
        setError(errorMsg);
        options.onError?.(errorMsg);
      };
      
      mediaRecorder.onstop = () => {
        // Cleanup will be handled by stopRecording
      };
      
      // Start real-time streaming if enabled
      if (opts.enableRealTimeStreaming) {
        try {
          await wsService.connect();
          const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          streamingSessionRef.current = sessionId;
          
          await wsService.startLiveStreaming({
            sessionId,
            sampleRate: opts.sampleRate,
            channels: opts.channels,
            format: mimeType,
          });
        } catch (wsError) {
          console.warn('Failed to start real-time streaming:', wsError);
          // Continue recording without streaming
        }
      }
      
      // Start recording
      startTimeRef.current = Date.now();
      totalPausedTimeRef.current = 0;
      
      mediaRecorder.start(1000); // Request data every second
      
      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
        startTime: new Date(),
      }));
      
      options.onStart?.();
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start recording';
      setError(errorMsg);
      options.onError?.(errorMsg);
      
      // Cleanup on error
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    }
  }, [isSupported, state.isRecording, opts, options, setupAudioAnalysis, wsService]);
  
  // Pause recording
  const pauseRecording = useCallback(() => {
    if (!state.isRecording || state.isPaused || !mediaRecorderRef.current) {
      return;
    }
    
    mediaRecorderRef.current.pause();
    pausedTimeRef.current = Date.now();
    
    setState(prev => ({ ...prev, isPaused: true, pausedTime: new Date() }));
    options.onPause?.();
  }, [state.isRecording, state.isPaused, options]);
  
  // Resume recording
  const resumeRecording = useCallback(() => {
    if (!state.isRecording || !state.isPaused || !mediaRecorderRef.current) {
      return;
    }
    
    mediaRecorderRef.current.resume();
    
    // Add paused duration to total
    const pausedDuration = Date.now() - pausedTimeRef.current;
    totalPausedTimeRef.current += pausedDuration;
    
    setState(prev => ({ ...prev, isPaused: false, pausedTime: undefined }));
    options.onResume?.();
  }, [state.isRecording, state.isPaused, options]);
  
  // Stop recording
  const stopRecording = useCallback(async (): Promise<{ blob: Blob; duration: number } | null> => {
    if (!state.isRecording || !mediaRecorderRef.current) {
      return null;
    }
    
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      
      mediaRecorder.onstop = () => {
        // Create final blob
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        const finalDuration = state.duration;
        
        // Cleanup
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
        
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        
        // Stop real-time streaming
        if (opts.enableRealTimeStreaming && streamingSessionRef.current) {
          wsService.stopLiveStreaming().catch(console.error);
          streamingSessionRef.current = null;
        }
        
        setState(prev => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          volume: 0,
        }));
        
        mediaRecorderRef.current = null;
        analyserRef.current = null;
        
        options.onStop?.(blob, finalDuration);
        resolve({ blob, duration: finalDuration });
      };
      
      mediaRecorder.stop();
    });
  }, [state.isRecording, state.duration, opts.enableRealTimeStreaming, wsService, options]);
  
  // Clear recording
  const clearRecording = useCallback(() => {
    if (state.isRecording) {
      return; // Cannot clear while recording
    }
    
    chunksRef.current = [];
    setState(prev => ({
      ...prev,
      chunks: [],
      duration: 0,
      startTime: undefined,
      pausedTime: undefined,
    }));
    
    startTimeRef.current = 0;
    totalPausedTimeRef.current = 0;
  }, [state.isRecording]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isRecording) {
        stopRecording();
      }
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
      }
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  return {
    isRecording: state.isRecording,
    isPaused: state.isPaused,
    duration: state.duration,
    volume: state.volume,
    chunks: state.chunks,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    clearRecording,
    isSupported,
    error,
    permission,
  };
};

export default useAudioRecorder;
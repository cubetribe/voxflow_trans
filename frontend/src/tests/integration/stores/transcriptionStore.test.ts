import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTranscriptionStore } from '@/stores/transcriptionStore';
import type { TranscriptionProgress, TranscriptionResult } from '@/types/transcription.types';

// Mock WebSocket service
const mockWsService = {
  connected: false,
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  startLiveStreaming: vi.fn().mockResolvedValue(undefined),
  stopLiveStreaming: vi.fn().mockResolvedValue(undefined),
  sendAudioData: vi.fn(),
  subscribeToJob: vi.fn(),
  unsubscribeFromJob: vi.fn(),
  subscribeToBatch: vi.fn(),
  unsubscribeFromBatch: vi.fn(),
  isConnected: vi.fn(() => mockWsService.connected),
};

// Mock API service
const mockApiService = {
  startLiveSession: vi.fn().mockResolvedValue({
    success: true,
    data: { sessionId: 'test-session-123' },
  }),
  stopLiveSession: vi.fn().mockResolvedValue({ success: true }),
  cancelJob: vi.fn().mockResolvedValue({ success: true }),
};

vi.mock('@/services/websocket.service', () => ({
  getWebSocketService: () => mockWsService,
}));

vi.mock('@/services/api.service', () => ({
  getApiService: () => mockApiService,
}));

describe('TranscriptionStore Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWsService.connected = false;
    
    // Reset store state
    useTranscriptionStore.getState().reset();
  });

  afterEach(() => {
    // Clean up store state
    useTranscriptionStore.getState().reset();
  });

  describe('Store Initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useTranscriptionStore());

      expect(result.current.isLiveTranscribing).toBe(false);
      expect(result.current.liveSessionId).toBeNull();
      expect(result.current.liveTranscript).toBe('');
      expect(result.current.partialTranscript).toBe('');
      expect(result.current.activeJobs).toEqual({});
      expect(result.current.completedJobs).toEqual({});
      expect(result.current.batchJobs).toEqual({});
      expect(result.current.isConnectedToWebSocket).toBe(false);
      expect(result.current.autoSave).toBe(true);
      expect(result.current.realTimeEnabled).toBe(false);
    });
  });

  describe('Live Transcription Integration', () => {
    it('should start live transcription successfully', async () => {
      mockWsService.connected = true;
      mockApiService.startLiveSession.mockResolvedValueOnce({
        success: true,
        data: { sessionId: 'live-session-456' },
      });

      const { result } = renderHook(() => useTranscriptionStore());

      await act(async () => {
        await result.current.startLiveTranscription();
      });

      expect(mockWsService.connect).toHaveBeenCalled();
      expect(mockApiService.startLiveSession).toHaveBeenCalledWith({
        enableRealTime: true,
        language: 'auto',
      });
      expect(mockWsService.startLiveStreaming).toHaveBeenCalledWith({
        sessionId: 'live-session-456',
        sampleRate: 44100,
        channels: 1,
      });

      expect(result.current.isLiveTranscribing).toBe(true);
      expect(result.current.liveSessionId).toBe('live-session-456');
      expect(result.current.connectionError).toBeNull();
    });

    it('should handle live transcription start failure', async () => {
      const startError = new Error('Failed to start session');
      mockApiService.startLiveSession.mockRejectedValueOnce(startError);

      const { result } = renderHook(() => useTranscriptionStore());

      await act(async () => {
        await expect(result.current.startLiveTranscription()).rejects.toThrow('Failed to start session');
      });

      expect(result.current.isLiveTranscribing).toBe(false);
      expect(result.current.connectionError).toBe('Failed to start session');
    });

    it('should stop live transcription successfully', async () => {
      // First start a session
      mockWsService.connected = true;
      const { result } = renderHook(() => useTranscriptionStore());

      await act(async () => {
        await result.current.startLiveTranscription();
      });

      // Then stop it
      await act(async () => {
        await result.current.stopLiveTranscription();
      });

      expect(mockWsService.stopLiveStreaming).toHaveBeenCalled();
      expect(mockApiService.stopLiveSession).toHaveBeenCalledWith('test-session-123');
      expect(result.current.isLiveTranscribing).toBe(false);
      expect(result.current.liveSessionId).toBeNull();
      expect(result.current.partialTranscript).toBe('');
    });

    it('should update live transcript correctly', () => {
      const { result } = renderHook(() => useTranscriptionStore());

      // Add partial transcript
      act(() => {
        result.current.updateLiveTranscript('Hello', false);
      });

      expect(result.current.partialTranscript).toBe('Hello');
      expect(result.current.liveTranscript).toBe('');

      // Finalize the transcript
      act(() => {
        result.current.updateLiveTranscript('Hello world', true);
      });

      expect(result.current.liveTranscript).toBe('Hello world ');
      expect(result.current.partialTranscript).toBe('');

      // Add another partial
      act(() => {
        result.current.updateLiveTranscript('How are', false);
      });

      expect(result.current.partialTranscript).toBe('How are');

      // Finalize again
      act(() => {
        result.current.updateLiveTranscript('How are you?', true);
      });

      expect(result.current.liveTranscript).toBe('Hello world How are you? ');
      expect(result.current.partialTranscript).toBe('');
    });
  });

  describe('Job Management Integration', () => {
    it('should add and update jobs correctly', () => {
      const { result } = renderHook(() => useTranscriptionStore());

      const job: TranscriptionProgress = {
        jobId: 'job-123',
        status: 'processing',
        progress: 0,
        startTime: new Date(),
        fileSize: 1024 * 1024,
        fileName: 'test.mp3',
        estimatedDuration: 300,
      };

      act(() => {
        result.current.addJob(job);
      });

      expect(result.current.activeJobs['job-123']).toEqual(job);

      // Update job progress
      act(() => {
        result.current.updateJob('job-123', { 
          progress: 50,
          currentChunk: 2,
          totalChunks: 4,
        });
      });

      expect(result.current.activeJobs['job-123'].progress).toBe(50);
      expect(result.current.activeJobs['job-123'].currentChunk).toBe(2);
      expect(result.current.activeJobs['job-123'].totalChunks).toBe(4);
    });

    it('should complete jobs and move to completed list', () => {
      const { result } = renderHook(() => useTranscriptionStore());

      const job: TranscriptionProgress = {
        jobId: 'job-456',
        status: 'processing',
        progress: 0,
        startTime: new Date(),
        fileSize: 2048 * 1024,
        fileName: 'interview.wav',
        estimatedDuration: 600,
      };

      const completedResult: TranscriptionResult = {
        jobId: 'job-456',
        text: 'This is the transcribed text',
        confidence: 0.95,
        duration: 120.5,
        segments: [
          {
            start: 0,
            startTime: 0,
            end: 60,
            text: 'First part of transcription',
            confidence: 0.94,
          },
          {
            start: 60,
            startTime: 60,
            end: 120.5,
            text: 'Second part of transcription',
            confidence: 0.96,
          },
        ],
        language: 'en',
        processingTime: 45.2,
        metadata: {
          model: 'voxtral-mini',
          sampleRate: 16000,
          channels: 1,
        },
      };

      // Add job
      act(() => {
        result.current.addJob(job);
      });

      expect(result.current.activeJobs['job-456']).toBeDefined();

      // Complete job
      act(() => {
        result.current.completeJob('job-456', completedResult);
      });

      expect(result.current.activeJobs['job-456']).toBeUndefined();
      expect(result.current.completedJobs['job-456']).toEqual(completedResult);
    });

    it('should cancel jobs via API and remove from active list', async () => {
      const { result } = renderHook(() => useTranscriptionStore());

      const job: TranscriptionProgress = {
        jobId: 'job-789',
        status: 'processing',
        progress: 25,
        startTime: new Date(),
        fileSize: 512 * 1024,
        fileName: 'podcast.m4a',
        estimatedDuration: 180,
      };

      // Add job
      act(() => {
        result.current.addJob(job);
      });

      expect(result.current.activeJobs['job-789']).toBeDefined();

      // Cancel job
      await act(async () => {
        await result.current.cancelJob('job-789');
      });

      expect(mockApiService.cancelJob).toHaveBeenCalledWith('job-789');
      expect(result.current.activeJobs['job-789']).toBeUndefined();
    });

    it('should handle job cancellation failure', async () => {
      const { result } = renderHook(() => useTranscriptionStore());

      const job: TranscriptionProgress = {
        jobId: 'job-error',
        status: 'processing',
        progress: 10,
        startTime: new Date(),
        fileSize: 256 * 1024,
        fileName: 'error-test.mp3',
        estimatedDuration: 90,
      };

      mockApiService.cancelJob.mockRejectedValueOnce(new Error('Cancel failed'));

      act(() => {
        result.current.addJob(job);
      });

      await act(async () => {
        await expect(result.current.cancelJob('job-error')).rejects.toThrow('Cancel failed');
      });

      // Job should still be in active list since cancellation failed
      expect(result.current.activeJobs['job-error']).toBeDefined();
    });

    it('should remove jobs from both active and completed lists', () => {
      const { result } = renderHook(() => useTranscriptionStore());

      const activeJob: TranscriptionProgress = {
        jobId: 'active-job',
        status: 'processing',
        progress: 50,
        startTime: new Date(),
        fileSize: 1024 * 1024,
        fileName: 'active.mp3',
        estimatedDuration: 300,
      };

      const completedResult: TranscriptionResult = {
        jobId: 'completed-job',
        text: 'Completed transcription',
        confidence: 0.98,
        duration: 180,
        segments: [],
        language: 'en',
        processingTime: 30,
        metadata: {
          model: 'voxtral-mini',
          sampleRate: 16000,
          channels: 1,
        },
      };

      // Add jobs
      act(() => {
        result.current.addJob(activeJob);
        result.current.completeJob('completed-job', completedResult);
        result.current.selectJob('completed-job');
      });

      expect(result.current.activeJobs['active-job']).toBeDefined();
      expect(result.current.completedJobs['completed-job']).toBeDefined();
      expect(result.current.selectedJobId).toBe('completed-job');

      // Remove completed job
      act(() => {
        result.current.removeJob('completed-job');
      });

      expect(result.current.completedJobs['completed-job']).toBeUndefined();
      expect(result.current.selectedJobId).toBeNull();

      // Remove active job
      act(() => {
        result.current.removeJob('active-job');
      });

      expect(result.current.activeJobs['active-job']).toBeUndefined();
    });
  });

  describe('WebSocket Event Integration', () => {
    it('should setup WebSocket event listeners on connection', async () => {
      mockWsService.connected = true;
      const { result } = renderHook(() => useTranscriptionStore());

      await act(async () => {
        await result.current.connectWebSocket();
      });

      expect(mockWsService.connect).toHaveBeenCalled();
      expect(mockWsService.on).toHaveBeenCalledWith('connection', expect.any(Function));
      expect(mockWsService.on).toHaveBeenCalledWith('transcription:progress', expect.any(Function));
      expect(mockWsService.on).toHaveBeenCalledWith('transcription:partial', expect.any(Function));
      expect(mockWsService.on).toHaveBeenCalledWith('transcription:final', expect.any(Function));
      expect(mockWsService.on).toHaveBeenCalledWith('job:status', expect.any(Function));

      expect(result.current.isConnectedToWebSocket).toBe(true);
      expect(result.current.connectionError).toBeNull();
    });

    it('should handle WebSocket connection failure', async () => {
      const connectionError = new Error('WebSocket connection failed');
      mockWsService.connect.mockRejectedValueOnce(connectionError);

      const { result } = renderHook(() => useTranscriptionStore());

      await act(async () => {
        await expect(result.current.connectWebSocket()).rejects.toThrow('WebSocket connection failed');
      });

      expect(result.current.isConnectedToWebSocket).toBe(false);
      expect(result.current.connectionError).toBe('WebSocket connection failed');
    });

    it('should subscribe and unsubscribe from job updates', () => {
      mockWsService.connected = true;
      const { result } = renderHook(() => useTranscriptionStore());

      act(() => {
        result.current.subscribeToJob('test-job-123');
      });

      expect(mockWsService.subscribeToJob).toHaveBeenCalledWith('test-job-123');

      act(() => {
        result.current.unsubscribeFromJob('test-job-123');
      });

      expect(mockWsService.unsubscribeFromJob).toHaveBeenCalledWith('test-job-123');
    });

    it('should handle job subscriptions when not connected', () => {
      mockWsService.connected = false;
      mockWsService.isConnected.mockReturnValue(false);

      const { result } = renderHook(() => useTranscriptionStore());

      act(() => {
        result.current.subscribeToJob('test-job-456');
      });

      // Should not call WebSocket methods when not connected
      expect(mockWsService.subscribeToJob).not.toHaveBeenCalled();
    });
  });

  describe('Batch Job Management', () => {
    it('should manage batch jobs correctly', () => {
      const { result } = renderHook(() => useTranscriptionStore());

      const batchJob = {
        id: 'batch-123',
        name: 'Audio File Batch',
        status: 'processing' as const,
        progress: 0,
        totalJobs: 5,
        completedJobs: 0,
        failedJobs: 0,
        startTime: new Date(),
        jobs: ['job-1', 'job-2', 'job-3', 'job-4', 'job-5'],
      };

      // Add batch job
      act(() => {
        result.current.addBatchJob(batchJob);
      });

      expect(result.current.batchJobs['batch-123']).toEqual(batchJob);

      // Update batch progress
      act(() => {
        result.current.updateBatchJob('batch-123', {
          progress: 60,
          completedJobs: 3,
        });
      });

      expect(result.current.batchJobs['batch-123'].progress).toBe(60);
      expect(result.current.batchJobs['batch-123'].completedJobs).toBe(3);

      // Remove batch job
      act(() => {
        result.current.removeBatchJob('batch-123');
      });

      expect(result.current.batchJobs['batch-123']).toBeUndefined();
    });
  });

  describe('UI State Management', () => {
    it('should manage UI settings correctly', () => {
      const { result } = renderHook(() => useTranscriptionStore());

      expect(result.current.autoSave).toBe(true);
      expect(result.current.realTimeEnabled).toBe(false);

      // Toggle auto save
      act(() => {
        result.current.toggleAutoSave();
      });

      expect(result.current.autoSave).toBe(false);

      // Toggle real time
      act(() => {
        result.current.toggleRealTime();
      });

      expect(result.current.realTimeEnabled).toBe(true);

      // Select job
      act(() => {
        result.current.selectJob('test-job-ui');
      });

      expect(result.current.selectedJobId).toBe('test-job-ui');

      // Deselect job
      act(() => {
        result.current.selectJob(null);
      });

      expect(result.current.selectedJobId).toBeNull();
    });
  });

  describe('Store Reset and Cleanup', () => {
    it('should clear completed jobs', () => {
      const { result } = renderHook(() => useTranscriptionStore());

      const completedResult: TranscriptionResult = {
        jobId: 'completed-test',
        text: 'Test transcription',
        confidence: 0.9,
        duration: 60,
        segments: [],
        language: 'en',
        processingTime: 15,
        metadata: {
          model: 'voxtral-mini',
          sampleRate: 16000,
          channels: 1,
        },
      };

      act(() => {
        result.current.completeJob('completed-test', completedResult);
      });

      expect(result.current.completedJobs['completed-test']).toBeDefined();

      act(() => {
        result.current.clearCompleted();
      });

      expect(result.current.completedJobs).toEqual({});
    });

    it('should reset entire store state', () => {
      const { result } = renderHook(() => useTranscriptionStore());

      // Set some state
      act(() => {
        result.current.updateLiveTranscript('test transcript', true);
        result.current.toggleAutoSave();
        result.current.selectJob('test-job');
      });

      expect(result.current.liveTranscript).toBe('test transcript ');
      expect(result.current.autoSave).toBe(false);
      expect(result.current.selectedJobId).toBe('test-job');

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.liveTranscript).toBe('');
      expect(result.current.autoSave).toBe(true);
      expect(result.current.selectedJobId).toBeNull();
      expect(mockWsService.disconnect).toHaveBeenCalled();
    });
  });
});
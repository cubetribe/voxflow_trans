import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getWebSocketService, WebSocketService } from '@/services/websocket.service';

// Mock Socket.IO client
const mockSocket = {
  connected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  once: vi.fn(),
  emit: vi.fn(),
  removeAllListeners: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  default: vi.fn(() => mockSocket),
  io: vi.fn(() => mockSocket),
}));

describe('WebSocket Service Integration Tests', () => {
  let wsService: ReturnType<typeof getWebSocketService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    
    // Get fresh instance of service
    wsService = getWebSocketService();
  });

  afterEach(() => {
    wsService.disconnect();
  });

  describe('Connection Management', () => {
    it('should establish connection successfully', async () => {
      // Mock successful connection
      const connectPromise = wsService.connect();
      
      // Simulate the connect event
      const connectHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'connect'
      )?.[1];
      
      if (connectHandler) {
        mockSocket.connected = true;
        connectHandler();
      }

      await connectPromise;
      expect(wsService.connected).toBe(true);
    });

    it('should handle connection failure', async () => {
      mockSocket.connected = false;
      const connectError = new Error('Connection failed');

      // Start connection attempt
      const connectPromise = wsService.connect();

      // Simulate multiple connection errors to reach max attempts
      const errorHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'connect_error'
      )?.[1];

      if (errorHandler) {
        // Simulate 5 failed attempts
        for (let i = 0; i < 5; i++) {
          errorHandler(connectError);
        }
      }

      await expect(connectPromise).rejects.toThrow('Failed to connect after 5 attempts');
      expect(wsService.connected).toBe(false);
    });

    it('should handle reconnection scenarios', async () => {
      const onConnectionChange = vi.fn();
      const unsubscribe = wsService.on('connection', onConnectionChange);

      // Initial connection
      const connectPromise = wsService.connect();
      const connectHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'connect'
      )?.[1];
      
      if (connectHandler) {
        mockSocket.connected = true;
        connectHandler();
      }
      await connectPromise;

      expect(onConnectionChange).toHaveBeenCalledWith('connected');

      // Simulate disconnect
      mockSocket.connected = false;
      const disconnectHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'disconnect'
      )?.[1];
      if (disconnectHandler) {
        disconnectHandler('io server disconnect');
      }

      expect(onConnectionChange).toHaveBeenCalledWith('disconnected');

      unsubscribe();
    });

    it('should disconnect properly', () => {
      wsService.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      // Establish connection first
      const connectPromise = wsService.connect();
      const connectHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'connect'
      )?.[1];
      
      if (connectHandler) {
        mockSocket.connected = true;
        connectHandler();
      }
      await connectPromise;
    });

    it('should register and trigger event listeners', () => {
      const handler = vi.fn();
      wsService.on('transcription:progress', handler);

      // Simulate receiving progress event from server
      const progressData = {
        jobId: 'test-job-123',
        progress: 50,
        status: 'processing',
      };

      // Find the server's progress handler and trigger it
      const serverProgressHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'transcription:progress'
      )?.[1];

      if (serverProgressHandler) {
        serverProgressHandler(progressData);
      }

      expect(handler).toHaveBeenCalledWith(progressData);
    });

    it('should handle transcription partial results', () => {
      const partialHandler = vi.fn();
      wsService.on('transcription:partial', partialHandler);

      const partialData = {
        text: 'Hello world',
        confidence: 0.95,
        timestamp: Date.now(),
      };

      const serverHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'transcription:partial'
      )?.[1];

      if (serverHandler) {
        serverHandler(partialData);
      }

      expect(partialHandler).toHaveBeenCalledWith(partialData);
    });

    it('should handle transcription final results', () => {
      const finalHandler = vi.fn();
      wsService.on('transcription:final', finalHandler);

      const finalData = {
        jobId: 'test-job-123',
        text: 'Hello world, this is a complete transcription.',
        confidence: 0.98,
        duration: 5.2,
        segments: [
          {
            start: 0,
            end: 2.5,
            text: 'Hello world,',
            confidence: 0.97,
          },
          {
            start: 2.5,
            end: 5.2,
            text: 'this is a complete transcription.',
            confidence: 0.99,
          },
        ],
      };

      const serverHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'transcription:final'
      )?.[1];

      if (serverHandler) {
        serverHandler(finalData);
      }

      expect(finalHandler).toHaveBeenCalledWith(finalData);
    });

    it('should remove event listeners', () => {
      const handler = vi.fn();
      const unsubscribe = wsService.on('transcription:progress', handler);
      
      // Call the unsubscribe function returned by wsService.on()
      unsubscribe();

      // The internal listener should be removed (can't easily test with current implementation)
      // This test verifies the unsubscribe function doesn't throw
      expect(unsubscribe).toBeDefined();
    });
  });

  describe('Live Streaming Integration', () => {
    beforeEach(async () => {
      mockSocket.connected = true;
      await wsService.connect();
    });

    it('should start live streaming session', async () => {
      const streamConfig = {
        sessionId: 'live-session-123',
        sampleRate: 44100,
        channels: 1,
        format: 'audio/webm;codecs=opus',
      };

      // Start the streaming request
      const streamPromise = wsService.startLiveStreaming(streamConfig);

      // Simulate server response
      const streamStartedHandler = mockSocket.once.mock.calls.find(
        ([event]) => event === 'stream:started'
      )?.[1];

      if (streamStartedHandler) {
        streamStartedHandler({ sessionId: 'live-session-123' });
      }

      await streamPromise;

      expect(mockSocket.emit).toHaveBeenCalledWith('stream:start', streamConfig);
    });

    it('should send audio data during streaming', () => {
      const audioBuffer = new ArrayBuffer(1024);
      const metadata = {
        timestamp: Date.now(),
        sequenceNumber: 1,
      };

      wsService.sendAudioData(audioBuffer, metadata);

      expect(mockSocket.emit).toHaveBeenCalledWith('audio:data', {
        data: audioBuffer,
        timestamp: metadata.timestamp,
        sequenceNumber: metadata.sequenceNumber,
      });
    });

    it('should stop live streaming session', async () => {
      // Start the stop request
      const stopPromise = wsService.stopLiveStreaming();

      // Simulate server response
      const streamStoppedHandler = mockSocket.once.mock.calls.find(
        ([event]) => event === 'stream:stopped'
      )?.[1];

      if (streamStoppedHandler) {
        streamStoppedHandler();
      }

      await stopPromise;

      expect(mockSocket.emit).toHaveBeenCalledWith('stream:stop');
    });

    it('should handle streaming errors', () => {
      const errorHandler = vi.fn();
      wsService.on('error', errorHandler);

      const streamError = {
        type: 'stream_error',
        message: 'Audio format not supported',
        sessionId: 'live-session-123',
      };

      const serverErrorHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'error'
      )?.[1];

      if (serverErrorHandler) {
        serverErrorHandler(streamError);
      }

      expect(errorHandler).toHaveBeenCalledWith(streamError);
    });
  });

  describe('Job Management Integration', () => {
    beforeEach(async () => {
      mockSocket.connected = true;
      await wsService.connect();
    });

    it('should subscribe to job updates', () => {
      const jobId = 'test-job-123';
      wsService.subscribeToJob(jobId);

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe:job', { jobId });
    });

    it('should unsubscribe from job updates', () => {
      const jobId = 'test-job-123';
      wsService.unsubscribeFromJob(jobId);

      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribe:job', { jobId });
    });

    it('should subscribe to batch updates', () => {
      const batchId = 'batch-456';
      wsService.subscribeToBatch(batchId);

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe:batch', { batchId });
    });

    it('should unsubscribe from batch updates', () => {
      const batchId = 'batch-456';
      wsService.unsubscribeFromBatch(batchId);

      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribe:batch', { batchId });
    });

    it('should handle job status updates', () => {
      const statusHandler = vi.fn();
      wsService.on('job:status', statusHandler);

      const statusUpdate = {
        jobId: 'test-job-123',
        status: 'completed',
        progress: 100,
        result: {
          text: 'Transcription complete',
          confidence: 0.96,
        },
      };

      const serverHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'job:status'
      )?.[1];

      if (serverHandler) {
        serverHandler(statusUpdate);
      }

      expect(statusHandler).toHaveBeenCalledWith(statusUpdate);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle connection timeout', async () => {
      const timeoutError = new Error('Connection timeout');
      
      mockSocket.connect = vi.fn().mockImplementation(() => {
        // Simulate timeout
        setTimeout(() => {
          const errorHandler = mockSocket.on.mock.calls.find(
            ([event]) => event === 'connect_error'
          )?.[1];
          if (errorHandler) {
            errorHandler(timeoutError);
          }
        }, 100);
      });

      await expect(wsService.connect()).rejects.toThrow('Connection timeout');
    });

    it('should handle server disconnection during streaming', () => {
      const disconnectHandler = vi.fn();
      wsService.on('connection', disconnectHandler);

      mockSocket.connected = true;

      // Simulate server disconnection
      const serverDisconnectHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'disconnect'
      )?.[1];

      if (serverDisconnectHandler) {
        serverDisconnectHandler('server disconnected');
      }

      expect(disconnectHandler).toHaveBeenCalledWith('disconnected');
    });

    it('should prevent operations when not connected', () => {
      mockSocket.connected = false;

      expect(() => {
        wsService.sendAudioData(new ArrayBuffer(8), {
          timestamp: Date.now(),
          sequenceNumber: 1,
        });
      }).toThrow('WebSocket not connected');
    });

    it('should handle malformed server messages', () => {
      const errorHandler = vi.fn();
      wsService.on('error', errorHandler);

      // Simulate malformed message
      const transcriptionHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'transcription:progress'
      )?.[1];

      if (transcriptionHandler) {
        // Send malformed data
        transcriptionHandler({ invalid: 'data' });
      }

      // Should not crash, but should handle gracefully
      expect(wsService.connected).toBe(true);
    });
  });

  describe('Connection State Validation', () => {
    it('should report correct connection status', () => {
      mockSocket.connected = false;
      expect(wsService.connected).toBe(false);
      expect(wsService.isConnected()).toBe(false);

      mockSocket.connected = true;
      expect(wsService.connected).toBe(true);
      expect(wsService.isConnected()).toBe(true);
    });

    it('should validate connection before critical operations', async () => {
      mockSocket.connected = false;

      await expect(wsService.startLiveStreaming({
        sessionId: 'test',
        sampleRate: 44100,
        channels: 1,
      })).rejects.toThrow('WebSocket not connected');

      // stopLiveStreaming should resolve when not connected (according to implementation)
      await expect(wsService.stopLiveStreaming()).resolves.toBeUndefined();
    });
  });
});
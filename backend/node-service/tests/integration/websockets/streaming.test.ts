import { Server } from 'socket.io';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '@/app';
import { setupWebSocketServer } from '@/sockets/websocket.server';
import { TEST_CONFIG } from '../../setup';

describe('WebSocket Streaming Integration Tests', () => {
  let httpServer: any;
  let ioServer: Server;
  let serverPort: number;
  let clientSocket: ClientSocket;

  beforeAll(async () => {
    // Create HTTP server
    const app = await createApp();
    httpServer = createServer(app);
    
    // Setup WebSocket server
    ioServer = setupWebSocketServer(httpServer);
    
    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        serverPort = (httpServer.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Cleanup server
    if (ioServer) {
      ioServer.close();
    }
    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    }
  });

  beforeEach(async () => {
    // Create fresh client connection for each test
    clientSocket = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      autoConnect: false,
    });
  });

  afterEach(async () => {
    // Cleanup client connection
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Connection Management', () => {
    it('should establish WebSocket connection successfully', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, TEST_CONFIG.DEFAULT_TIMEOUT);

        clientSocket.on('connect', () => {
          clearTimeout(timeout);
          expect(clientSocket.connected).toBe(true);
          expect(clientSocket.id).toBeDefined();
          resolve();
        });

        clientSocket.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        clientSocket.connect();
      });
    });

    it('should handle connection authentication', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Authentication timeout'));
        }, TEST_CONFIG.DEFAULT_TIMEOUT);

        clientSocket.on('connect', () => {
          // Send authentication data
          clientSocket.emit('authenticate', {
            sessionId: 'test-session-123',
            timestamp: Date.now(),
          });
        });

        clientSocket.on('authenticated', (data) => {
          clearTimeout(timeout);
          expect(data).toHaveProperty('success', true);
          expect(data).toHaveProperty('sessionId', 'test-session-123');
          resolve();
        });

        clientSocket.on('authentication_error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Authentication failed: ${error.message}`));
        });

        clientSocket.connect();
      });
    });

    it('should handle connection errors gracefully', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Error handling timeout'));
        }, TEST_CONFIG.DEFAULT_TIMEOUT);

        // Connect to invalid port to trigger error
        const errorClient = Client(`http://localhost:${serverPort + 1000}`, {
          transports: ['websocket'],
          timeout: 1000,
        });

        errorClient.on('connect_error', (error) => {
          clearTimeout(timeout);
          expect(error).toBeDefined();
          errorClient.disconnect();
          resolve();
        });

        errorClient.on('connect', () => {
          clearTimeout(timeout);
          errorClient.disconnect();
          reject(new Error('Should not have connected to invalid port'));
        });

        errorClient.connect();
      });
    });

    it('should handle disconnection and cleanup', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Disconnection timeout'));
        }, TEST_CONFIG.DEFAULT_TIMEOUT);

        clientSocket.on('connect', () => {
          // Trigger disconnection
          clientSocket.disconnect();
        });

        clientSocket.on('disconnect', (reason) => {
          clearTimeout(timeout);
          expect(reason).toBeDefined();
          expect(clientSocket.connected).toBe(false);
          resolve();
        });

        clientSocket.connect();
      });
    });
  });

  describe('Real-time Audio Streaming', () => {
    beforeEach(async () => {
      // Establish connection before each streaming test
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, TEST_CONFIG.DEFAULT_TIMEOUT);

        clientSocket.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        clientSocket.connect();
      });
    });

    it('should start streaming session successfully', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Stream start timeout'));
        }, TEST_CONFIG.DEFAULT_TIMEOUT);

        const sessionConfig = {
          sessionId: 'stream-test-001',
          sampleRate: 44100,
          channels: 1,
          format: 'audio/webm;codecs=opus',
          enableRealTime: true,
        };

        clientSocket.on('stream:started', (data) => {
          clearTimeout(timeout);
          expect(data).toHaveProperty('success', true);
          expect(data).toHaveProperty('sessionId', sessionConfig.sessionId);
          expect(data).toHaveProperty('config');
          expect(data.config).toMatchObject({
            sampleRate: sessionConfig.sampleRate,
            channels: sessionConfig.channels,
            format: sessionConfig.format,
          });
          resolve();
        });

        clientSocket.on('stream:error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Stream start failed: ${error.message}`));
        });

        clientSocket.emit('stream:start', sessionConfig);
      });
    });

    it('should handle audio chunk transmission', async () => {
      // First start a streaming session
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Session start timeout')), 5000);

        clientSocket.on('stream:started', () => {
          clearTimeout(timeout);
          resolve();
        });

        clientSocket.emit('stream:start', {
          sessionId: 'chunk-test-001',
          sampleRate: 44100,
          channels: 1,
          format: 'audio/webm;codecs=opus',
        });
      });

      // Then test chunk transmission
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Chunk processing timeout'));
        }, TEST_CONFIG.DEFAULT_TIMEOUT);

        const mockAudioChunk = createMockAudioChunk();
        let chunksReceived = 0;
        const expectedChunks = 3;

        clientSocket.on('transcription:partial', (data) => {
          chunksReceived++;
          expect(data).toHaveProperty('text');
          expect(data).toHaveProperty('confidence');
          expect(data).toHaveProperty('timestamp');
          expect(data).toHaveProperty('sequenceNumber');

          if (chunksReceived === expectedChunks) {
            clearTimeout(timeout);
            resolve();
          }
        });

        clientSocket.on('audio:chunk:error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Chunk processing failed: ${error.message}`));
        });

        // Send multiple audio chunks
        for (let i = 0; i < expectedChunks; i++) {
          setTimeout(() => {
            clientSocket.emit('audio:chunk', {
              sessionId: 'chunk-test-001',
              data: mockAudioChunk,
              sequenceNumber: i,
              timestamp: Date.now(),
            });
          }, i * 500); // Send chunks with 500ms interval
        }
      });
    });

    it('should handle final transcription results', async () => {
      // Start streaming session
      await new Promise<void>((resolve) => {
        clientSocket.on('stream:started', () => resolve());
        clientSocket.emit('stream:start', {
          sessionId: 'final-test-001',
          sampleRate: 44100,
          channels: 1,
        });
      });

      // Test final result
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Final result timeout'));
        }, TEST_CONFIG.LONG_TIMEOUT);

        clientSocket.on('transcription:final', (data) => {
          clearTimeout(timeout);
          
          expect(data).toHaveProperty('sessionId', 'final-test-001');
          expect(data).toHaveProperty('text');
          expect(data).toHaveProperty('confidence');
          expect(data).toHaveProperty('duration');
          expect(data).toHaveProperty('segments');
          expect(data).toHaveProperty('metadata');
          
          // Validate segments structure
          expect(Array.isArray(data.segments)).toBe(true);
          if (data.segments.length > 0) {
            const segment = data.segments[0];
            expect(segment).toHaveProperty('start');
            expect(segment).toHaveProperty('end');
            expect(segment).toHaveProperty('text');
            expect(segment).toHaveProperty('confidence');
          }
          
          // Validate metadata
          expect(data.metadata).toHaveProperty('model');
          expect(data.metadata).toHaveProperty('processingTime');
          expect(data.metadata).toHaveProperty('sampleRate');
          
          resolve();
        });

        // Send complete audio stream and request finalization
        const audioChunk = createMockAudioChunk();
        clientSocket.emit('audio:chunk', {
          sessionId: 'final-test-001',
          data: audioChunk,
          sequenceNumber: 0,
          timestamp: Date.now(),
          isFinal: true,
        });
      });
    });

    it('should stop streaming session correctly', async () => {
      const sessionId = 'stop-test-001';
      
      // Start session
      await new Promise<void>((resolve) => {
        clientSocket.on('stream:started', () => resolve());
        clientSocket.emit('stream:start', { sessionId, sampleRate: 44100, channels: 1 });
      });

      // Stop session
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Stream stop timeout'));
        }, TEST_CONFIG.DEFAULT_TIMEOUT);

        clientSocket.on('stream:stopped', (data) => {
          clearTimeout(timeout);
          expect(data).toHaveProperty('success', true);
          expect(data).toHaveProperty('sessionId', sessionId);
          expect(data).toHaveProperty('statistics');
          
          // Validate session statistics
          expect(data.statistics).toHaveProperty('chunksProcessed');
          expect(data.statistics).toHaveProperty('totalDuration');
          expect(data.statistics).toHaveProperty('avgProcessingTime');
          
          resolve();
        });

        clientSocket.on('stream:error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Stream stop failed: ${error.message}`));
        });

        clientSocket.emit('stream:stop', { sessionId });
      });
    });

    it('should handle multiple concurrent streaming sessions', async () => {
      const sessionIds = ['concurrent-001', 'concurrent-002', 'concurrent-003'];
      const sessionPromises: Promise<void>[] = [];

      sessionIds.forEach(sessionId => {
        const promise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Concurrent session ${sessionId} timeout`));
          }, TEST_CONFIG.LONG_TIMEOUT);

          const client = Client(`http://localhost:${serverPort}`, {
            transports: ['websocket'],
          });

          client.on('connect', () => {
            client.emit('stream:start', {
              sessionId,
              sampleRate: 44100,
              channels: 1,
            });
          });

          client.on('stream:started', (data) => {
            expect(data.sessionId).toBe(sessionId);
            
            // Send audio chunk
            const audioChunk = createMockAudioChunk();
            client.emit('audio:chunk', {
              sessionId,
              data: audioChunk,
              sequenceNumber: 0,
              timestamp: Date.now(),
            });
          });

          client.on('transcription:partial', (data) => {
            expect(data.sessionId || sessionId).toBeDefined();
            
            // Stop session
            client.emit('stream:stop', { sessionId });
          });

          client.on('stream:stopped', () => {
            clearTimeout(timeout);
            client.disconnect();
            resolve();
          });

          client.on('error', (error) => {
            clearTimeout(timeout);
            client.disconnect();
            reject(error);
          });
        });

        sessionPromises.push(promise);
      });

      // Wait for all concurrent sessions to complete
      await Promise.all(sessionPromises);
    });
  });

  describe('Progress Broadcasting', () => {
    beforeEach(async () => {
      return new Promise<void>((resolve) => {
        clientSocket.on('connect', () => resolve());
        clientSocket.connect();
      });
    });

    it('should broadcast job progress updates', async () => {
      const jobId = 'progress-test-job-001';

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Progress update timeout'));
        }, TEST_CONFIG.DEFAULT_TIMEOUT);

        let progressUpdates = 0;

        clientSocket.on('job:progress', (data) => {
          progressUpdates++;
          
          expect(data).toHaveProperty('jobId', jobId);
          expect(data).toHaveProperty('progress');
          expect(data).toHaveProperty('status');
          expect(data).toHaveProperty('timestamp');
          
          expect(data.progress).toBeWithinRange(0, 100);
          expect(['pending', 'processing', 'completed', 'failed']).toContain(data.status);
          
          if (data.status === 'completed' || progressUpdates >= 3) {
            clearTimeout(timeout);
            resolve();
          }
        });

        // Subscribe to job progress
        clientSocket.emit('job:subscribe', { jobId });

        // Simulate job progress (this would normally come from the transcription service)
        setTimeout(() => {
          ioServer.emit('job:progress', {
            jobId,
            progress: 25,
            status: 'processing',
            timestamp: Date.now(),
          });
        }, 100);

        setTimeout(() => {
          ioServer.emit('job:progress', {
            jobId,
            progress: 75,
            status: 'processing',
            timestamp: Date.now(),
          });
        }, 200);

        setTimeout(() => {
          ioServer.emit('job:progress', {
            jobId,
            progress: 100,
            status: 'completed',
            timestamp: Date.now(),
          });
        }, 300);
      });
    });

    it('should handle batch progress updates', async () => {
      const batchId = 'batch-progress-001';

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Batch progress timeout'));
        }, TEST_CONFIG.DEFAULT_TIMEOUT);

        clientSocket.on('batch:progress', (data) => {
          expect(data).toHaveProperty('batchId', batchId);
          expect(data).toHaveProperty('totalFiles');
          expect(data).toHaveProperty('completedFiles');
          expect(data).toHaveProperty('failedFiles');
          expect(data).toHaveProperty('overallProgress');
          expect(data).toHaveProperty('jobs');
          
          expect(data.overallProgress).toBeWithinRange(0, 100);
          expect(Array.isArray(data.jobs)).toBe(true);
          
          if (data.overallProgress === 100) {
            clearTimeout(timeout);
            resolve();
          }
        });

        // Subscribe to batch progress
        clientSocket.emit('batch:subscribe', { batchId });

        // Simulate batch progress
        ioServer.emit('batch:progress', {
          batchId,
          totalFiles: 3,
          completedFiles: 2,
          failedFiles: 0,
          overallProgress: 67,
          jobs: [
            { id: 'job-1', status: 'completed', progress: 100 },
            { id: 'job-2', status: 'completed', progress: 100 },
            { id: 'job-3', status: 'processing', progress: 50 },
          ],
        });

        setTimeout(() => {
          ioServer.emit('batch:progress', {
            batchId,
            totalFiles: 3,
            completedFiles: 3,
            failedFiles: 0,
            overallProgress: 100,
            jobs: [
              { id: 'job-1', status: 'completed', progress: 100 },
              { id: 'job-2', status: 'completed', progress: 100 },
              { id: 'job-3', status: 'completed', progress: 100 },
            ],
          });
        }, 500);
      });
    });

    it('should handle subscription management', async () => {
      const jobId = 'subscription-test-001';

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Subscription test timeout'));
        }, TEST_CONFIG.DEFAULT_TIMEOUT);

        let progressReceived = false;

        clientSocket.on('job:progress', () => {
          progressReceived = true;
        });

        clientSocket.on('subscription:confirmed', (data) => {
          expect(data).toHaveProperty('jobId', jobId);
          expect(data).toHaveProperty('subscribed', true);
          
          // Send progress update
          ioServer.emit('job:progress', {
            jobId,
            progress: 50,
            status: 'processing',
            timestamp: Date.now(),
          });
          
          setTimeout(() => {
            // Unsubscribe
            clientSocket.emit('job:unsubscribe', { jobId });
          }, 100);
        });

        clientSocket.on('subscription:removed', (data) => {
          expect(data).toHaveProperty('jobId', jobId);
          expect(data).toHaveProperty('subscribed', false);
          expect(progressReceived).toBe(true);
          
          clearTimeout(timeout);
          resolve();
        });

        // Subscribe to job
        clientSocket.emit('job:subscribe', { jobId });
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      return new Promise<void>((resolve) => {
        clientSocket.on('connect', () => resolve());
        clientSocket.connect();
      });
    });

    it('should handle invalid audio data gracefully', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Error handling timeout'));
        }, TEST_CONFIG.DEFAULT_TIMEOUT);

        clientSocket.on('stream:started', () => {
          // Send invalid audio data
          clientSocket.emit('audio:chunk', {
            sessionId: 'error-test-001',
            data: 'invalid-audio-data',
            sequenceNumber: 0,
            timestamp: Date.now(),
          });
        });

        clientSocket.on('audio:chunk:error', (error) => {
          clearTimeout(timeout);
          expect(error).toHaveProperty('message');
          expect(error).toHaveProperty('sessionId', 'error-test-001');
          expect(error.message).toMatch(/invalid|format|data/i);
          resolve();
        });

        clientSocket.emit('stream:start', {
          sessionId: 'error-test-001',
          sampleRate: 44100,
          channels: 1,
        });
      });
    });

    it('should handle session timeout', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Session timeout test failed'));
        }, TEST_CONFIG.LONG_TIMEOUT);

        clientSocket.on('session:timeout', (data) => {
          clearTimeout(timeout);
          expect(data).toHaveProperty('sessionId', 'timeout-test-001');
          expect(data).toHaveProperty('reason', 'inactivity');
          resolve();
        });

        // Start session but don't send any data (simulate inactivity)
        clientSocket.emit('stream:start', {
          sessionId: 'timeout-test-001',
          sampleRate: 44100,
          channels: 1,
          timeout: 1000, // 1 second timeout for testing
        });
      });
    });

    it('should handle network disconnection and reconnection', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Reconnection test timeout'));
        }, TEST_CONFIG.LONG_TIMEOUT);

        let disconnected = false;
        let reconnected = false;

        clientSocket.on('disconnect', () => {
          disconnected = true;
          
          // Attempt reconnection after short delay
          setTimeout(() => {
            clientSocket.connect();
          }, 100);
        });

        clientSocket.on('connect', () => {
          if (disconnected && !reconnected) {
            reconnected = true;
            clearTimeout(timeout);
            resolve();
          }
        });

        // Force disconnection
        setTimeout(() => {
          clientSocket.disconnect();
        }, 100);
      });
    });
  });

  /**
   * Utility function to create mock audio chunk data
   */
  function createMockAudioChunk(): ArrayBuffer {
    // Create a minimal WebM audio chunk
    const chunkSize = 1024;
    const buffer = new ArrayBuffer(chunkSize);
    const view = new Uint8Array(buffer);
    
    // Fill with pseudo-random audio data
    for (let i = 0; i < chunkSize; i++) {
      view[i] = Math.floor(Math.random() * 256);
    }
    
    return buffer;
  }
});
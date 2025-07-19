import React from 'react';
import { io, Socket } from 'socket.io-client';
import { TranscriptionProgress, TranscriptionWebSocketEvent, TranscriptionEventType } from '@/types/transcription.types';

export class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private isConnecting = false;
  private eventListeners = new Map<string, Set<Function>>();

  constructor(private apiUrl: string = import.meta.env.VITE_WS_URL || 'ws://localhost:3000') {}

  connect(): Promise<void> {
    if (this.socket?.connected || this.isConnecting) {
      return Promise.resolve();
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.apiUrl, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          autoConnect: true,
          reconnection: true,
          reconnectionDelay: this.reconnectInterval,
          reconnectionAttempts: this.maxReconnectAttempts,
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.emit('connection', 'connected');
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
          this.emit('connection', 'disconnected');
          
          if (reason === 'io server disconnect') {
            // Server initiated disconnect, reconnect manually
            this.reconnect();
          }
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.isConnecting = false;
          this.reconnectAttempts++;
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.emit('connection', 'failed');
            reject(new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts`));
          }
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
          this.emit('connection', 'reconnected');
        });

        this.socket.on('reconnect_error', (error) => {
          console.error('WebSocket reconnection error:', error);
        });

        // Transcription event handlers
        this.socket.on('transcription:progress', (data: TranscriptionProgress) => {
          this.emit('transcription:progress', data);
        });

        this.socket.on('transcription:partial', (data: any) => {
          this.emit('transcription:partial', data);
        });

        this.socket.on('transcription:final', (data: any) => {
          this.emit('transcription:final', data);
        });

        this.socket.on('transcription:error', (data: any) => {
          this.emit('transcription:error', data);
        });

        this.socket.on('batch:progress', (data: any) => {
          this.emit('batch:progress', data);
        });

        this.socket.on('job:status', (data: any) => {
          this.emit('job:status', data);
        });

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }

  private reconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        if (!this.socket?.connected) {
          this.connect().catch(console.error);
        }
      }, this.reconnectInterval * Math.pow(2, this.reconnectAttempts));
    }
  }

  // Event emission and listening
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  on(event: string, listener: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.eventListeners.delete(event);
        }
      }
    };
  }

  // Transcription specific methods
  subscribeToJob(jobId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:job', { jobId });
    }
  }

  unsubscribeFromJob(jobId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:job', { jobId });
    }
  }

  subscribeToBatch(batchId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:batch', { batchId });
    }
  }

  unsubscribeFromBatch(batchId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:batch', { batchId });
    }
  }

  // Real-time audio streaming
  startAudioStream(sessionId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('audio:stream:start', { sessionId });
    }
  }

  sendAudioChunk(sessionId: string, audioData: ArrayBuffer): void {
    if (this.socket?.connected) {
      this.socket.emit('audio:chunk', {
        sessionId,
        data: audioData,
        timestamp: Date.now()
      });
    }
  }

  stopAudioStream(sessionId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('audio:stream:stop', { sessionId });
    }
  }

  // Job control
  cancelJob(jobId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('job:cancel', { jobId });
    }
  }

  pauseJob(jobId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('job:pause', { jobId });
    }
  }

  resumeJob(jobId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('job:resume', { jobId });
    }
  }

  // Connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionState(): 'connected' | 'disconnected' | 'connecting' | 'reconnecting' {
    if (this.isConnecting) return 'connecting';
    if (this.socket?.connected) return 'connected';
    if (this.reconnectAttempts > 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
      return 'reconnecting';
    }
    return 'disconnected';
  }

  // Utility methods
  ping(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const startTime = Date.now();
      
      this.socket.emit('ping', startTime, (response: number) => {
        const latency = Date.now() - startTime;
        resolve(latency);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);
    });
  }
}

// Singleton instance
let webSocketServiceInstance: WebSocketService | null = null;

export const getWebSocketService = (): WebSocketService => {
  if (!webSocketServiceInstance) {
    webSocketServiceInstance = new WebSocketService();
  }
  return webSocketServiceInstance;
};

// React hook for WebSocket
export const useWebSocket = () => {
  const service = getWebSocketService();
  
  const [connectionState, setConnectionState] = React.useState(service.getConnectionState());
  
  React.useEffect(() => {
    const unsubscribe = service.on('connection', (state: string) => {
      setConnectionState(state as any);
    });

    // Connect if not already connected
    if (!service.isConnected()) {
      service.connect().catch(console.error);
    }

    return () => {
      unsubscribe();
    };
  }, [service]);

  return {
    service,
    connectionState,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    isReconnecting: connectionState === 'reconnecting',
  };
};
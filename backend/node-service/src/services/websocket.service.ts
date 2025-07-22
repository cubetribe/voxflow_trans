import { Server } from 'socket.io';

class WebSocketService {
  private io: Server | null = null;

  setSocketServer(io: Server) {
    this.io = io;
  }

  getSocketServer(): Server | null {
    return this.io;
  }

  // Emit service status to all connected clients
  emitServiceStatus(type: string, message: string, details?: string) {
    if (this.io) {
      this.io.broadcastServiceStatus(type, message, details);
    }
  }

  // Emit job progress to specific job subscribers
  emitJobProgress(jobId: string, progress: any) {
    if (this.io) {
      this.io.broadcastJobProgress(jobId, progress);
    }
  }

  // Emit batch progress to specific batch subscribers
  emitBatchProgress(batchId: string, progress: any) {
    if (this.io) {
      this.io.broadcastBatchProgress(batchId, progress);
    }
  }

  // Emit transcription result to specific session
  emitTranscriptionResult(sessionId: string, result: any) {
    if (this.io) {
      this.io.broadcastTranscriptionResult(sessionId, result);
    }
  }
}

export const websocketService = new WebSocketService();
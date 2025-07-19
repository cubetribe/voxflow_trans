import { Server } from 'socket.io';
import { logger } from '@/utils/logger';

export function setupWebSocket(io: Server) {
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Handle audio streaming
    socket.on('audio:chunk', (data) => {
      logger.debug(`Received audio chunk from ${socket.id}`);
      // TODO: Process audio chunk and send to Python service
    });

    // Handle transcription events
    socket.on('transcription:start', (data) => {
      logger.info(`Transcription started by ${socket.id}`);
      // TODO: Initialize transcription session
    });

    socket.on('transcription:stop', () => {
      logger.info(`Transcription stopped by ${socket.id}`);
      // TODO: Finalize transcription session
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
      // TODO: Cleanup any ongoing transcription sessions
    });

    // Send initial connection confirmation
    socket.emit('connection:confirmed', {
      message: 'Connected to VoxFlow API Gateway',
      timestamp: new Date().toISOString(),
    });
  });

  logger.info('WebSocket server configured');
}
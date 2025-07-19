import { Router } from 'express';

export const apiRoutes = Router();

// TODO: Add API routes
apiRoutes.get('/', (req, res) => {
  res.json({
    message: 'VoxFlow API Gateway',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      transcription: '/api/transcribe',
      export: '/api/export',
    },
  });
});

// Transcription routes will be added here
// Export routes will be added here
// WebSocket routes will be added here
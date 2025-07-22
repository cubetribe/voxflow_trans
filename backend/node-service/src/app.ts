import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';

import { config } from '@/config/app.config';
import { errorHandler } from '@/middleware/error.middleware';
import { loggingMiddleware } from '@/middleware/logging.middleware';
import { apiRoutes } from '@/routes/api.routes';
import { healthRoutes } from '@/routes/health.routes';
import { setupWebSocket } from '@/sockets/connection.manager';
import { websocketService } from '@/services/websocket.service';
import { logger } from '@/utils/logger';

export function createApp() {
  const app = express();
  const httpServer = createServer(app);
  
  // WebSocket setup
  const io = new Server(httpServer, {
    cors: {
      origin: config.websocket.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Security middleware
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // CORS configuration
  app.use(cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
      error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Basic middleware - MUST come before rate limiter to parse body
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(loggingMiddleware);
  
  // Rate limiter after body parsing
  app.use('/api', limiter);

  // Routes
  app.use('/health', healthRoutes);
  app.use('/api', apiRoutes);

  // WebSocket setup
  setupWebSocket(io);
  websocketService.setSocketServer(io);

  // Error handling
  app.use(errorHandler);

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Route not found',
      path: req.originalUrl,
    });
  });

  logger.info('Express app created successfully');

  return { app, httpServer, io };
}
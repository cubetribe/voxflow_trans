import { createApp } from './app';
import { config } from '@/config/app.config';
import { logger } from '@/utils/logger';
import { connectDatabase } from '@/config/database.config';
import { connectRedis } from '@/config/redis.config';

async function bootstrap() {
  try {
    // Create app
    const { httpServer } = createApp();

    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected successfully');

    // Start server
    httpServer.listen(config.port, () => {
      logger.info(`🚀 VoxFlow API Gateway running on port ${config.port}`);
      logger.info(`📊 Environment: ${config.nodeEnv}`);
      logger.info(`🔗 Health check: http://localhost:${config.port}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
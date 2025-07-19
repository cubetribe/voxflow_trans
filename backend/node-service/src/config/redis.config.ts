import { createClient } from 'redis';
import { config } from './app.config';
import { logger } from '@/utils/logger';

export const redisClient = createClient({
  url: config.redis.url,
  password: config.redis.password,
});

export async function connectRedis(): Promise<void> {
  try {
    await redisClient.connect();
    logger.info('Redis connection established successfully');
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
}

redisClient.on('error', (error) => {
  logger.error('Redis error:', error);
});

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('disconnect', () => {
  logger.warn('Redis client disconnected');
});
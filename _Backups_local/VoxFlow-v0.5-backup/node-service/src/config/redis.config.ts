import { createClient } from 'redis';
import { config } from './app.config';
import { logger } from '@/utils/logger';

export let redisClient: any = null;
export let isRedisConnected = false;
export let redisOptional = process.env.REDIS_OPTIONAL === 'true';

// In-memory fallback cache
const fallbackCache = new Map<string, any>();

export async function connectRedis(): Promise<void> {
  if (redisOptional) {
    logger.info('Redis is configured as optional - attempting connection with fallback');
  }

  try {
    const clientConfig: {
      url: string;
      password?: string;
    } = {
      url: config.redis.url,
    };
    
    if (config.redis.password) {
      clientConfig.password = config.redis.password;
    }
    
    redisClient = createClient(clientConfig);

    redisClient.on('error', (error: any) => {
      if (redisOptional) {
        logger.warn('Redis error (using in-memory fallback):', error.message);
        isRedisConnected = false;
      } else {
        logger.error('Redis error:', error);
      }
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected successfully');
      isRedisConnected = true;
    });

    redisClient.on('disconnect', () => {
      logger.warn('Redis client disconnected');
      isRedisConnected = false;
    });

    await redisClient.connect();
    isRedisConnected = true;
    logger.info('Redis connection established successfully');
    
  } catch (error) {
    if (redisOptional) {
      logger.warn('Redis connection failed, using in-memory fallback:', error);
      isRedisConnected = false;
      redisClient = null;
    } else {
      logger.error('Redis connection failed:', error);
      throw error;
    }
  }
}

// Wrapper functions with fallback
export async function redisGet(key: string): Promise<string | null> {
  if (isRedisConnected && redisClient) {
    try {
      return await redisClient.get(key);
    } catch (error) {
      if (redisOptional) {
        logger.warn(`Redis get failed for ${key}, using fallback`);
        return fallbackCache.get(key) || null;
      }
      throw error;
    }
  }
  return fallbackCache.get(key) || null;
}

export async function redisSet(key: string, value: string, ttl?: number): Promise<void> {
  if (isRedisConnected && redisClient) {
    try {
      if (ttl) {
        await redisClient.setEx(key, ttl, value);
      } else {
        await redisClient.set(key, value);
      }
      return;
    } catch (error) {
      if (redisOptional) {
        logger.warn(`Redis set failed for ${key}, using fallback`);
      } else {
        throw error;
      }
    }
  }
  
  // Fallback to in-memory
  fallbackCache.set(key, value);
  if (ttl) {
    setTimeout(() => fallbackCache.delete(key), ttl * 1000);
  }
}

export async function redisDel(key: string): Promise<void> {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch (error) {
      if (redisOptional) {
        logger.warn(`Redis del failed for ${key}, using fallback`);
      } else {
        throw error;
      }
    }
  }
  fallbackCache.delete(key);
}

export function getRedisStatus(): { connected: boolean; mode: string; cacheSize?: number } {
  const status: { connected: boolean; mode: string; cacheSize?: number } = {
    connected: isRedisConnected,
    mode: isRedisConnected ? 'redis' : 'in-memory',
  };
  
  if (!isRedisConnected) {
    status.cacheSize = fallbackCache.size;
  }
  
  return status;
}
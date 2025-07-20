/**
 * VoxFlow API Gateway Configuration
 * Strict type-safe configuration with environment validation
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

/**
 * Environment validation schema using Zod
 * Ensures all required environment variables are present and valid
 */
const environmentSchema = z.object({
  // Server Configuration
  PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Database Configuration
  DATABASE_URL: z.string().default('sqlite:./data/voxflow.db'),

  // Redis Configuration
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_OPTIONAL: z.string().transform(Boolean).default('false'),

  // Python Service Configuration
  PYTHON_SERVICE_URL: z.string().url().default('http://localhost:8000'),

  // Authentication
  JWT_SECRET: z.string().min(32).default('your-super-secret-jwt-key-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  SESSION_SECRET: z.string().min(32).optional(),

  // File Upload Configuration
  MAX_FILE_SIZE: z.string().default('500MB'),
  UPLOAD_DIR: z.string().default('./temp'),
  UPLOAD_TIMEOUT: z.string().transform(Number).default('300'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // CORS Configuration
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  CORS_CREDENTIALS: z.string().transform(Boolean).default('true'),

  // WebSocket Configuration
  WS_CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Queue Configuration
  QUEUE_CONCURRENCY: z.string().transform(Number).default('5'),

  // Health Check Configuration
  HEALTH_CHECK_INTERVAL: z.string().transform(Number).default('30000'),

  // Performance Configuration
  REQUEST_TIMEOUT: z.string().transform(Number).default('30'),
});

/**
 * Validate and parse environment variables
 */
const env = environmentSchema.parse(process.env);

/**
 * Type-safe configuration object
 */
export const config = {
  // Server Configuration
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',

  // Database Configuration
  database: {
    url: env.DATABASE_URL,
  },

  // Redis Configuration
  redis: {
    url: env.REDIS_URL,
    password: env.REDIS_PASSWORD,
    optional: env.REDIS_OPTIONAL,
  },

  // Python Service Configuration
  pythonService: {
    url: env.PYTHON_SERVICE_URL,
    timeout: env.REQUEST_TIMEOUT * 1000, // Convert to milliseconds
  },

  // Authentication Configuration
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    sessionSecret: env.SESSION_SECRET || env.JWT_SECRET,
  },

  // File Upload Configuration
  upload: {
    maxFileSize: env.MAX_FILE_SIZE,
    uploadDir: env.UPLOAD_DIR,
    timeout: env.UPLOAD_TIMEOUT * 1000, // Convert to milliseconds
    allowedFormats: ['mp3', 'wav', 'm4a', 'webm', 'ogg', 'flac'] as const,
    mimeTypes: [
      'audio/mpeg',      // MP3
      'audio/wav',       // WAV
      'audio/wave',      // WAV alternative
      'audio/x-wav',     // WAV alternative
      'audio/mp4',       // M4A
      'audio/m4a',       // M4A alternative
      'audio/webm',      // WEBM
      'audio/ogg',       // OGG
      'audio/flac',      // FLAC
    ] as const,
  },

  // Logging Configuration
  logging: {
    level: env.LOG_LEVEL,
    file: './logs/app.log',
    format: env.NODE_ENV === 'production' ? 'json' : 'simple',
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },

  // CORS Configuration
  cors: {
    origin: env.CORS_ORIGIN.split(',').map(origin => origin.trim()),
    credentials: env.CORS_CREDENTIALS,
  },

  // WebSocket Configuration
  websocket: {
    corsOrigin: env.WS_CORS_ORIGIN.split(',').map(origin => origin.trim()),
    timeout: 30000, // 30 seconds
    pingTimeout: 60000, // 1 minute
    pingInterval: 25000, // 25 seconds
  },

  // Queue Configuration
  queue: {
    redisUrl: env.REDIS_URL,
    concurrency: env.QUEUE_CONCURRENCY,
    defaultJobOptions: {
      removeOnComplete: 50,  // Keep last 50 completed jobs
      removeOnFail: 100,     // Keep last 100 failed jobs
      attempts: 3,           // Retry up to 3 times
      backoff: {
        type: 'exponential' as const,
        delay: 2000,         // Start with 2 second delay
      },
    },
  },

  // Health Check Configuration
  health: {
    checkInterval: env.HEALTH_CHECK_INTERVAL,
    timeout: 5000, // 5 seconds timeout for health checks
  },

  // Performance Configuration
  performance: {
    requestTimeout: env.REQUEST_TIMEOUT * 1000,
    bodyLimit: '50mb',
    compression: {
      threshold: 1024, // Only compress responses > 1KB
      level: 6,        // Compression level (1-9)
    },
  },
} as const;

/**
 * Configuration validation
 * Ensures critical configuration is valid at startup
 */
export function validateConfig(): void {
  const errors: string[] = [];

  // Validate JWT secret in production
  if (config.isProduction && config.auth.jwtSecret === 'your-super-secret-jwt-key-change-in-production') {
    errors.push('JWT_SECRET must be changed in production');
  }

  // Validate Redis URL format
  try {
    new URL(config.redis.url);
  } catch {
    errors.push(`Invalid REDIS_URL format: ${config.redis.url}`);
  }

  // Validate Python service URL format
  try {
    new URL(config.pythonService.url);
  } catch {
    errors.push(`Invalid PYTHON_SERVICE_URL format: ${config.pythonService.url}`);
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Export configuration types for type safety
export type Config = typeof config;
export type NodeEnv = typeof config.nodeEnv;
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    url: process.env.DATABASE_URL || 'sqlite:./data/voxflow.db',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
  },

  pythonService: {
    url: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || '500MB',
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    allowedFormats: (process.env.ALLOWED_FORMATS || 'mp3,wav,m4a,webm,ogg,flac').split(','),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  websocket: {
    corsOrigin: process.env.WS_CORS_ORIGIN || 'http://localhost:5173',
  },

  queue: {
    redisUrl: process.env.QUEUE_REDIS_URL || 'redis://localhost:6379',
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5'),
  },

  health: {
    checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
  },
} as const;
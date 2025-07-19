import { config } from 'dotenv';
import { join } from 'path';
import { Database } from 'sqlite3';
import { createClient as createRedisClient } from 'redis';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, existsSync } from 'fs';

// Load test environment variables
config({ path: join(__dirname, '..', '.env.test') });

// Global test configuration
const TEST_CONFIG = {
  // Database configuration
  DATABASE_URL: ':memory:', // In-memory SQLite for fast tests
  TEST_DB_PATH: join(tmpdir(), 'voxflow-test.db'),
  
  // Redis configuration
  REDIS_URL: process.env.REDIS_TEST_URL || 'redis://localhost:6380',
  REDIS_PREFIX: 'voxflow:test:',
  
  // File system configuration
  UPLOAD_DIR: join(tmpdir(), 'voxflow-test-uploads'),
  TEMP_DIR: join(tmpdir(), 'voxflow-test-temp'),
  
  // Service configuration
  PYTHON_SERVICE_URL: 'http://localhost:8001', // Test Python service
  
  // Test timeouts
  DEFAULT_TIMEOUT: 10000,
  LONG_TIMEOUT: 30000,
  
  // Mock configurations
  MOCK_PYTHON_SERVICE: process.env.MOCK_PYTHON_SERVICE === 'true',
  MOCK_REDIS: process.env.MOCK_REDIS === 'true',
};

// Global test state
let testDatabase: Database | null = null;
let testRedisClient: any = null;

/**
 * Setup test environment before all tests
 */
beforeAll(async () => {
  console.log('🚀 Setting up test environment...');
  
  // Create test directories
  setupTestDirectories();
  
  // Setup test database
  await setupTestDatabase();
  
  // Setup test Redis
  await setupTestRedis();
  
  // Setup global mocks
  setupGlobalMocks();
  
  console.log('✅ Test environment setup complete');
}, TEST_CONFIG.LONG_TIMEOUT);

/**
 * Cleanup test environment after all tests
 */
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Cleanup database
  await cleanupTestDatabase();
  
  // Cleanup Redis
  await cleanupTestRedis();
  
  // Cleanup test directories
  cleanupTestDirectories();
  
  console.log('✅ Test environment cleanup complete');
}, TEST_CONFIG.LONG_TIMEOUT);

/**
 * Reset state before each test
 */
beforeEach(async () => {
  // Clear Redis test data
  if (testRedisClient && !TEST_CONFIG.MOCK_REDIS) {
    const keys = await testRedisClient.keys(`${TEST_CONFIG.REDIS_PREFIX}*`);
    if (keys.length > 0) {
      await testRedisClient.del(keys);
    }
  }
  
  // Reset database tables
  if (testDatabase) {
    await resetDatabaseTables();
  }
  
  // Clear test upload directories
  clearTestUploads();
});

/**
 * Setup test directories
 */
function setupTestDirectories(): void {
  const dirs = [TEST_CONFIG.UPLOAD_DIR, TEST_CONFIG.TEMP_DIR];
  
  dirs.forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Setup test database
 */
async function setupTestDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    testDatabase = new Database(TEST_CONFIG.TEST_DB_PATH, (err) => {
      if (err) {
        reject(new Error(`Failed to setup test database: ${err.message}`));
        return;
      }
      
      // Run database migrations for tests
      setupDatabaseSchema()
        .then(() => resolve())
        .catch(reject);
    });
  });
}

/**
 * Setup database schema for tests
 */
async function setupDatabaseSchema(): Promise<void> {
  if (!testDatabase) throw new Error('Test database not initialized');
  
  return new Promise((resolve, reject) => {
    const schema = `
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME,
        status TEXT DEFAULT 'uploaded'
      );
      
      CREATE TABLE IF NOT EXISTS transcription_jobs (
        id TEXT PRIMARY KEY,
        file_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        progress REAL DEFAULT 0,
        result TEXT,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files (id)
      );
      
      CREATE TABLE IF NOT EXISTS batch_jobs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        progress REAL DEFAULT 0,
        total_files INTEGER DEFAULT 0,
        completed_files INTEGER DEFAULT 0,
        failed_files INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
      CREATE INDEX IF NOT EXISTS idx_transcription_jobs_status ON transcription_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);
    `;
    
    testDatabase.exec(schema, (err) => {
      if (err) {
        reject(new Error(`Failed to create test schema: ${err.message}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Setup test Redis connection
 */
async function setupTestRedis(): Promise<void> {
  if (TEST_CONFIG.MOCK_REDIS) {
    // Use in-memory mock for Redis
    testRedisClient = {
      isReady: true,
      connected: true,
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
      flushall: jest.fn(),
      quit: jest.fn(),
    };
    return;
  }
  
  try {
    testRedisClient = createRedisClient({
      url: TEST_CONFIG.REDIS_URL,
    });
    
    testRedisClient.on('error', (err: Error) => {
      console.warn('Test Redis connection error:', err.message);
    });
    
    await testRedisClient.connect();
    
    // Clear any existing test data
    await testRedisClient.flushAll();
    
    console.log('✅ Test Redis connected');
  } catch (error) {
    console.warn('⚠️  Redis not available, using mock:', (error as Error).message);
    
    // Fallback to mock
    testRedisClient = {
      isReady: true,
      connected: true,
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
      flushall: jest.fn(),
      quit: jest.fn(),
    };
  }
}

/**
 * Setup global mocks
 */
function setupGlobalMocks(): void {
  // Mock console methods for cleaner test output
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.error = jest.fn((message: string, ...args: any[]) => {
    if (!message.includes('Test warning') && !message.includes('Expected test error')) {
      originalConsoleError(message, ...args);
    }
  });
  
  console.warn = jest.fn((message: string, ...args: any[]) => {
    if (!message.includes('Test warning')) {
      originalConsoleWarn(message, ...args);
    }
  });
  
  // Mock timers for testing time-dependent functionality
  jest.useFakeTimers({
    doNotFake: ['nextTick', 'setImmediate'],
  });
  
  // Mock file system operations for safety
  const mockFs = {
    createWriteStream: jest.fn(),
    createReadStream: jest.fn(),
    unlink: jest.fn((path: string, callback: Function) => callback(null)),
    stat: jest.fn(),
    mkdir: jest.fn(),
    rmdir: jest.fn(),
  };
  
  // Store original methods for restoration
  (global as any).__TEST_MOCKS__ = {
    fs: mockFs,
    console: { error: console.error, warn: console.warn },
  };
}

/**
 * Reset database tables for clean test state
 */
async function resetDatabaseTables(): Promise<void> {
  if (!testDatabase) return;
  
  return new Promise((resolve, reject) => {
    const resetQueries = [
      'DELETE FROM batch_jobs',
      'DELETE FROM transcription_jobs',
      'DELETE FROM files',
    ];
    
    let completed = 0;
    const total = resetQueries.length;
    
    resetQueries.forEach(query => {
      testDatabase!.run(query, (err) => {
        if (err) {
          reject(new Error(`Failed to reset table: ${err.message}`));
          return;
        }
        
        completed++;
        if (completed === total) {
          resolve();
        }
      });
    });
  });
}

/**
 * Clear test upload directories
 */
function clearTestUploads(): void {
  try {
    if (existsSync(TEST_CONFIG.UPLOAD_DIR)) {
      rmSync(TEST_CONFIG.UPLOAD_DIR, { recursive: true, force: true });
      mkdirSync(TEST_CONFIG.UPLOAD_DIR, { recursive: true });
    }
    
    if (existsSync(TEST_CONFIG.TEMP_DIR)) {
      rmSync(TEST_CONFIG.TEMP_DIR, { recursive: true, force: true });
      mkdirSync(TEST_CONFIG.TEMP_DIR, { recursive: true });
    }
  } catch (error) {
    console.warn('Warning: Failed to clear test uploads:', (error as Error).message);
  }
}

/**
 * Cleanup test database
 */
async function cleanupTestDatabase(): Promise<void> {
  if (testDatabase) {
    return new Promise((resolve) => {
      testDatabase!.close((err) => {
        if (err) {
          console.warn('Warning: Failed to close test database:', err.message);
        }
        testDatabase = null;
        resolve();
      });
    });
  }
}

/**
 * Cleanup test Redis
 */
async function cleanupTestRedis(): Promise<void> {
  if (testRedisClient && !TEST_CONFIG.MOCK_REDIS) {
    try {
      await testRedisClient.flushAll();
      await testRedisClient.quit();
    } catch (error) {
      console.warn('Warning: Failed to cleanup test Redis:', (error as Error).message);
    }
  }
  testRedisClient = null;
}

/**
 * Cleanup test directories
 */
function cleanupTestDirectories(): void {
  try {
    const dirs = [TEST_CONFIG.UPLOAD_DIR, TEST_CONFIG.TEMP_DIR];
    
    dirs.forEach(dir => {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    });
    
    // Also cleanup test database file
    if (existsSync(TEST_CONFIG.TEST_DB_PATH)) {
      rmSync(TEST_CONFIG.TEST_DB_PATH, { force: true });
    }
  } catch (error) {
    console.warn('Warning: Failed to cleanup test directories:', (error as Error).message);
  }
}

// Export test configuration and utilities for use in tests
export {
  TEST_CONFIG,
  testDatabase,
  testRedisClient,
  setupTestDatabase,
  setupTestRedis,
  resetDatabaseTables,
  clearTestUploads,
};

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidTimestamp(): R;
      toBeWithinRange(min: number, max: number): R;
    }
  }
}

// Custom Jest matchers for VoxFlow testing
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);
    
    return {
      message: () => `expected ${received} to be a valid UUID`,
      pass,
    };
  },
  
  toBeValidTimestamp(received: string) {
    const timestamp = new Date(received);
    const pass = timestamp instanceof Date && !isNaN(timestamp.getTime());
    
    return {
      message: () => `expected ${received} to be a valid timestamp`,
      pass,
    };
  },
  
  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    
    return {
      message: () => `expected ${received} to be within range ${min}-${max}`,
      pass,
    };
  },
});
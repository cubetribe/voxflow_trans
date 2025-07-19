import { execSync } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { config } from 'dotenv';

/**
 * Global setup that runs once before all test suites
 * Sets up the test environment, databases, and external dependencies
 */
export default async function globalSetup(): Promise<void> {
  console.log('\n🌍 VoxFlow Test Environment - Global Setup\n');
  
  // Load test environment variables
  config({ path: join(__dirname, '..', '.env.test') });
  
  try {
    // 1. Setup test directories
    await setupTestDirectories();
    
    // 2. Check and setup Redis test instance
    await setupRedisTestInstance();
    
    // 3. Check Python service availability
    await checkPythonServiceAvailability();
    
    // 4. Setup test database
    await setupTestDatabase();
    
    // 5. Install required test dependencies
    await installTestDependencies();
    
    console.log('✅ Global setup completed successfully\n');
    
  } catch (error) {
    console.error('❌ Global setup failed:', (error as Error).message);
    process.exit(1);
  }
}

/**
 * Setup test directories
 */
async function setupTestDirectories(): Promise<void> {
  console.log('📁 Setting up test directories...');
  
  const directories = [
    join(__dirname, '..', 'test-results'),
    join(__dirname, '..', 'coverage'),
    join(__dirname, '..', 'logs', 'test'),
    join(process.cwd(), 'tmp', 'voxflow-test'),
  ];
  
  directories.forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`  ✓ Created directory: ${dir}`);
    }
  });
}

/**
 * Setup Redis test instance
 */
async function setupRedisTestInstance(): Promise<void> {
  console.log('🔴 Setting up Redis test instance...');
  
  const redisTestPort = process.env.REDIS_TEST_PORT || '6380';
  const redisTestUrl = process.env.REDIS_TEST_URL || `redis://localhost:${redisTestPort}`;
  
  try {
    // Check if Redis is available on test port
    execSync(`redis-cli -p ${redisTestPort} ping`, { 
      stdio: 'pipe',
      timeout: 5000 
    });
    
    console.log(`  ✓ Redis test instance running on port ${redisTestPort}`);
    
    // Clear any existing test data
    execSync(`redis-cli -p ${redisTestPort} FLUSHALL`, { 
      stdio: 'pipe' 
    });
    
    console.log('  ✓ Redis test database cleared');
    
  } catch (error) {
    console.log('  ⚠️  Redis test instance not available, using mock mode');
    process.env.MOCK_REDIS = 'true';
  }
}

/**
 * Check Python service availability
 */
async function checkPythonServiceAvailability(): Promise<void> {
  console.log('🐍 Checking Python service availability...');
  
  const pythonServiceUrl = process.env.PYTHON_SERVICE_TEST_URL || 'http://localhost:8001';
  
  try {
    // Check if Python service is running
    const response = await fetch(`${pythonServiceUrl}/health`);
    
    if (response.ok) {
      console.log(`  ✓ Python service available at ${pythonServiceUrl}`);
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
    
  } catch (error) {
    console.log('  ⚠️  Python service not available, using mock mode');
    process.env.MOCK_PYTHON_SERVICE = 'true';
  }
}

/**
 * Setup test database
 */
async function setupTestDatabase(): Promise<void> {
  console.log('🗄️  Setting up test database...');
  
  try {
    // For SQLite, no external setup needed
    // Database will be created in-memory or as temp file during tests
    console.log('  ✓ SQLite test database configuration ready');
    
  } catch (error) {
    throw new Error(`Failed to setup test database: ${(error as Error).message}`);
  }
}

/**
 * Install required test dependencies
 */
async function installTestDependencies(): Promise<void> {
  console.log('📦 Checking test dependencies...');
  
  try {
    // Check if jest-junit is available for CI/CD reporting
    try {
      require.resolve('jest-junit');
      console.log('  ✓ jest-junit available for test reporting');
    } catch {
      console.log('  ⚠️  jest-junit not installed, skipping XML reports');
    }
    
    // Check if sqlite3 is available
    try {
      require.resolve('sqlite3');
      console.log('  ✓ sqlite3 available for database testing');
    } catch {
      throw new Error('sqlite3 package not installed - required for database tests');
    }
    
    // Check if redis client is available
    try {
      require.resolve('redis');
      console.log('  ✓ redis client available for caching tests');
    } catch {
      console.log('  ⚠️  redis client not installed, using mock mode');
      process.env.MOCK_REDIS = 'true';
    }
    
  } catch (error) {
    throw new Error(`Missing test dependencies: ${(error as Error).message}`);
  }
}

/**
 * Utility function to wait for service availability
 */
async function waitForService(
  url: string, 
  timeoutMs: number = 30000,
  intervalMs: number = 1000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch {
      // Service not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  return false;
}

/**
 * Environment validation
 */
function validateTestEnvironment(): void {
  console.log('🔍 Validating test environment...');
  
  const requiredEnvVars = [
    'NODE_ENV',
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Set NODE_ENV to test if not already set
  if (process.env.NODE_ENV !== 'test') {
    process.env.NODE_ENV = 'test';
    console.log('  ✓ NODE_ENV set to test');
  }
  
  console.log('  ✓ Environment validation passed');
}
import { execSync } from 'child_process';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';

/**
 * Global teardown that runs once after all test suites
 * Cleans up test environment, databases, and temporary files
 */
export default async function globalTeardown(): Promise<void> {
  console.log('\n🧹 VoxFlow Test Environment - Global Teardown\n');
  
  try {
    // 1. Cleanup test Redis instance
    await cleanupRedisTestInstance();
    
    // 2. Cleanup test databases
    await cleanupTestDatabases();
    
    // 3. Cleanup temporary files
    await cleanupTemporaryFiles();
    
    // 4. Generate final test reports
    await generateTestReports();
    
    console.log('✅ Global teardown completed successfully\n');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', (error as Error).message);
    // Don't exit with error in teardown to avoid masking test failures
  }
}

/**
 * Cleanup Redis test instance
 */
async function cleanupRedisTestInstance(): Promise<void> {
  console.log('🔴 Cleaning up Redis test instance...');
  
  if (process.env.MOCK_REDIS === 'true') {
    console.log('  ✓ Redis was mocked, no cleanup needed');
    return;
  }
  
  const redisTestPort = process.env.REDIS_TEST_PORT || '6380';
  
  try {
    // Clear test database
    execSync(`redis-cli -p ${redisTestPort} FLUSHALL`, { 
      stdio: 'pipe',
      timeout: 5000 
    });
    
    console.log(`  ✓ Redis test database cleared on port ${redisTestPort}`);
    
  } catch (error) {
    console.log('  ⚠️  Redis cleanup failed:', (error as Error).message);
  }
}

/**
 * Cleanup test databases
 */
async function cleanupTestDatabases(): Promise<void> {
  console.log('🗄️  Cleaning up test databases...');
  
  try {
    // Cleanup SQLite test files
    const testDbPaths = [
      join(process.cwd(), 'tmp', 'voxflow-test.db'),
      join(process.cwd(), 'tests', 'test.db'),
      join(process.cwd(), 'test.db'),
    ];
    
    testDbPaths.forEach(dbPath => {
      if (existsSync(dbPath)) {
        try {
          rmSync(dbPath, { force: true });
          console.log(`  ✓ Removed test database: ${dbPath}`);
        } catch (error) {
          console.log(`  ⚠️  Failed to remove ${dbPath}:`, (error as Error).message);
        }
      }
    });
    
  } catch (error) {
    console.log('  ⚠️  Database cleanup failed:', (error as Error).message);
  }
}

/**
 * Cleanup temporary files and directories
 */
async function cleanupTemporaryFiles(): Promise<void> {
  console.log('📁 Cleaning up temporary files...');
  
  const tempDirectories = [
    join(process.cwd(), 'tmp', 'voxflow-test'),
    join(process.cwd(), 'uploads', 'test'),
    join(process.cwd(), 'temp', 'test'),
    join(process.cwd(), '.jest-cache'),
  ];
  
  tempDirectories.forEach(dir => {
    if (existsSync(dir)) {
      try {
        rmSync(dir, { recursive: true, force: true });
        console.log(`  ✓ Removed directory: ${dir}`);
      } catch (error) {
        console.log(`  ⚠️  Failed to remove ${dir}:`, (error as Error).message);
      }
    }
  });
  
  // Cleanup log files
  const logDirectory = join(process.cwd(), 'logs', 'test');
  if (existsSync(logDirectory)) {
    try {
      rmSync(logDirectory, { recursive: true, force: true });
      console.log('  ✓ Removed test logs');
    } catch (error) {
      console.log('  ⚠️  Failed to remove test logs:', (error as Error).message);
    }
  }
}

/**
 * Generate final test reports
 */
async function generateTestReports(): Promise<void> {
  console.log('📊 Generating test reports...');
  
  try {
    // Coverage report summary
    const coverageDir = join(process.cwd(), 'coverage');
    if (existsSync(coverageDir)) {
      console.log('  ✓ Coverage reports generated in coverage/');
      
      // Try to display coverage summary
      const lcovInfoPath = join(coverageDir, 'lcov-report', 'index.html');
      if (existsSync(lcovInfoPath)) {
        console.log(`  ✓ HTML coverage report: file://${lcovInfoPath}`);
      }
    }
    
    // Test results
    const testResultsDir = join(process.cwd(), 'test-results');
    if (existsSync(testResultsDir)) {
      console.log('  ✓ Test results generated in test-results/');
      
      const junitPath = join(testResultsDir, 'junit.xml');
      if (existsSync(junitPath)) {
        console.log('  ✓ JUnit XML report generated for CI/CD');
      }
    }
    
  } catch (error) {
    console.log('  ⚠️  Report generation failed:', (error as Error).message);
  }
}

/**
 * Performance and resource usage summary
 */
function displayPerformanceSummary(): void {
  console.log('⚡ Performance Summary:');
  
  const memoryUsage = process.memoryUsage();
  console.log(`  Memory Usage:`);
  console.log(`    RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB`);
  console.log(`    Heap Used: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
  console.log(`    Heap Total: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`);
  console.log(`    External: ${Math.round(memoryUsage.external / 1024 / 1024)}MB`);
  
  const uptime = process.uptime();
  console.log(`  Test Suite Duration: ${Math.round(uptime * 1000)}ms`);
}

/**
 * Environment cleanup
 */
function cleanupEnvironment(): void {
  console.log('🔧 Cleaning up environment...');
  
  // Reset environment variables that were set for testing
  delete process.env.MOCK_REDIS;
  delete process.env.MOCK_PYTHON_SERVICE;
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
    console.log('  ✓ Forced garbage collection');
  }
  
  console.log('  ✓ Environment cleanup completed');
}

/**
 * Check for resource leaks
 */
function checkResourceLeaks(): void {
  console.log('🔍 Checking for resource leaks...');
  
  // Check for open handles
  const openHandles = (process as any)._getActiveHandles?.() || [];
  const openRequests = (process as any)._getActiveRequests?.() || [];
  
  if (openHandles.length > 0) {
    console.log(`  ⚠️  ${openHandles.length} open handles detected`);
    // Log handle types for debugging
    const handleTypes = openHandles.map((handle: any) => handle.constructor.name);
    const uniqueTypes = [...new Set(handleTypes)];
    console.log(`     Handle types: ${uniqueTypes.join(', ')}`);
  } else {
    console.log('  ✓ No open handles detected');
  }
  
  if (openRequests.length > 0) {
    console.log(`  ⚠️  ${openRequests.length} open requests detected`);
  } else {
    console.log('  ✓ No open requests detected');
  }
}

// Execute additional cleanup functions
cleanupEnvironment();
displayPerformanceSummary();
checkResourceLeaks();
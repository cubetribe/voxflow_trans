import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file discovery
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  
  // TypeScript configuration
  moduleNameMapping: {
    '@/(.*)': '<rootDir>/src/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/types/**/*.ts',
    '!src/**/*.interface.ts'
  ],
  
  // Coverage thresholds for production-ready code
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Coverage reporting
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageDirectory: 'coverage',
  
  // Test execution configuration
  testTimeout: 30000, // 30 seconds for integration tests
  detectOpenHandles: true,
  forceExit: true,
  
  // Performance optimization
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      diagnostics: {
        ignoreCodes: [1343]
      },
      astTransformers: {
        before: [
          {
            path: 'node_modules/ts-jest/dist/transformers/path-mapping',
            options: {}
          }
        ]
      }
    }]
  },
  
  // Module handling
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  
  // Error handling
  errorOnDeprecated: true,
  verbose: true,
  
  // Custom test reporter for production environments
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      ancestorSeparator: ' › ',
      uniqueOutputName: 'false',
      suiteNameTemplate: '{filepath}',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}'
    }]
  ]
};

export default config;
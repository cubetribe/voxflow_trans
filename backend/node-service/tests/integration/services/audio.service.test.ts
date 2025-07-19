import { AudioService } from '@/services/audio.service';
import { PythonServiceClient } from '@/clients/python.client';
import { DatabaseService } from '@/services/database.service';
import { CleanupService } from '@/services/cleanup.service';
import { TEST_CONFIG } from '../../setup';
import { join } from 'path';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import nock from 'nock';

describe('Audio Service Integration Tests', () => {
  let audioService: AudioService;
  let pythonClient: PythonServiceClient;
  let databaseService: DatabaseService;
  let cleanupService: CleanupService;
  let mockAudioFile: string;
  let mockLargeAudioFile: string;

  beforeAll(async () => {
    // Initialize services
    pythonClient = new PythonServiceClient({
      baseURL: TEST_CONFIG.PYTHON_SERVICE_URL,
      timeout: 30000,
    });

    databaseService = new DatabaseService({
      connectionString: TEST_CONFIG.DATABASE_URL,
    });

    cleanupService = new CleanupService({
      tempDir: TEST_CONFIG.TEMP_DIR,
      uploadDir: TEST_CONFIG.UPLOAD_DIR,
    });

    audioService = new AudioService({
      pythonClient,
      databaseService,
      cleanupService,
      uploadDir: TEST_CONFIG.UPLOAD_DIR,
      tempDir: TEST_CONFIG.TEMP_DIR,
    });

    // Create mock audio files
    await setupMockAudioFiles();
  });

  beforeEach(async () => {
    // Reset nock interceptors
    nock.cleanAll();
    
    // Setup default Python service mocks
    setupPythonServiceMocks();
  });

  afterEach(async () => {
    // Cleanup any created files
    await cleanupService.cleanupTemporaryFiles();
  });

  afterAll(async () => {
    // Final cleanup
    nock.cleanAll();
    nock.restore();
  });

  describe('Single File Processing', () => {
    it('should process a valid audio file successfully', async () => {
      const fileInfo = {
        id: 'test-file-001',
        name: 'test-audio.mp3',
        path: mockAudioFile,
        size: 5000,
        mimeType: 'audio/mpeg',
      };

      const result = await audioService.processAudioFile(fileInfo, {
        format: 'JSON',
        includeTimestamps: true,
        includeConfidence: true,
        language: 'auto',
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('transcriptionResult');
      
      const transcription = result.transcriptionResult;
      expect(transcription).toHaveProperty('text');
      expect(transcription).toHaveProperty('confidence');
      expect(transcription).toHaveProperty('duration');
      expect(transcription).toHaveProperty('segments');
      expect(transcription).toHaveProperty('language');
      expect(transcription).toHaveProperty('metadata');

      // Validate segments
      expect(Array.isArray(transcription.segments)).toBe(true);
      transcription.segments.forEach((segment: any) => {
        expect(segment).toHaveProperty('start');
        expect(segment).toHaveProperty('end');
        expect(segment).toHaveProperty('text');
        expect(segment).toHaveProperty('confidence');
        expect(typeof segment.start).toBe('number');
        expect(typeof segment.end).toBe('number');
        expect(typeof segment.text).toBe('string');
        expect(typeof segment.confidence).toBe('number');
      });

      // Validate metadata
      expect(transcription.metadata).toHaveProperty('model');
      expect(transcription.metadata).toHaveProperty('processingTime');
      expect(transcription.metadata).toHaveProperty('sampleRate');
      expect(transcription.metadata).toHaveProperty('channels');
    });

    it('should handle large file processing with chunking', async () => {
      const largeFileInfo = {
        id: 'test-large-file-001',
        name: 'large-audio.mp3',
        path: mockLargeAudioFile,
        size: 50 * 1024 * 1024, // 50MB
        mimeType: 'audio/mpeg',
      };

      // Mock chunked processing responses
      setupLargeFileProcessingMocks();

      const result = await audioService.processAudioFile(largeFileInfo, {
        format: 'JSON',
        includeTimestamps: true,
        chunkDurationMinutes: 10,
        overlapSeconds: 10,
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('transcriptionResult');
      
      const transcription = result.transcriptionResult;
      expect(transcription).toHaveProperty('chunks');
      expect(Array.isArray(transcription.chunks)).toBe(true);
      expect(transcription.chunks.length).toBeGreaterThan(1);

      // Validate merged result
      expect(transcription).toHaveProperty('text');
      expect(transcription).toHaveProperty('segments');
      expect(transcription.segments.length).toBeGreaterThan(0);

      // Validate chunk processing metadata
      expect(transcription.metadata).toHaveProperty('chunksProcessed');
      expect(transcription.metadata).toHaveProperty('totalProcessingTime');
      expect(transcription.metadata.chunksProcessed).toBeGreaterThan(1);
    });

    it('should handle file format conversion', async () => {
      const fileInfo = {
        id: 'test-conversion-001',
        name: 'test-audio.wav',
        path: mockAudioFile,
        size: 8000,
        mimeType: 'audio/wav',
      };

      const result = await audioService.processAudioFile(fileInfo, {
        format: 'SRT',
        includeTimestamps: true,
        targetSampleRate: 16000,
        channels: 1,
      });

      expect(result).toHaveProperty('success', true);
      
      const transcription = result.transcriptionResult;
      expect(transcription).toHaveProperty('format', 'SRT');
      expect(transcription).toHaveProperty('srtContent');
      expect(typeof transcription.srtContent).toBe('string');
      
      // Validate SRT format
      const srtLines = transcription.srtContent.split('\n');
      expect(srtLines.length).toBeGreaterThan(3); // Minimum SRT structure
      expect(srtLines[0]).toMatch(/^\d+$/); // First line should be a number
    });

    it('should handle processing errors gracefully', async () => {
      // Mock Python service error
      nock(TEST_CONFIG.PYTHON_SERVICE_URL)
        .post('/transcribe/file')
        .reply(500, {
          error: 'Internal processing error',
          message: 'Model failed to load',
        });

      const fileInfo = {
        id: 'test-error-001',
        name: 'error-test.mp3',
        path: mockAudioFile,
        size: 3000,
        mimeType: 'audio/mpeg',
      };

      const result = await audioService.processAudioFile(fileInfo, {
        format: 'JSON',
      });

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toMatch(/processing error|failed/i);
      
      // Ensure cleanup occurred
      expect(result).toHaveProperty('cleanupPerformed', true);
    });

    it('should handle network timeouts', async () => {
      // Mock timeout
      nock(TEST_CONFIG.PYTHON_SERVICE_URL)
        .post('/transcribe/file')
        .delayConnection(35000) // Longer than service timeout
        .reply(200, {});

      const fileInfo = {
        id: 'test-timeout-001',
        name: 'timeout-test.mp3',
        path: mockAudioFile,
        size: 4000,
        mimeType: 'audio/mpeg',
      };

      const startTime = Date.now();
      const result = await audioService.processAudioFile(fileInfo, {
        format: 'JSON',
        timeout: 5000, // 5 second timeout
      });

      const elapsedTime = Date.now() - startTime;
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toMatch(/timeout/i);
      expect(elapsedTime).toBeLessThan(10000); // Should timeout before 10 seconds
    });

    it('should validate audio file integrity', async () => {
      // Create corrupted audio file
      const corruptedFile = join(TEST_CONFIG.TEMP_DIR, 'corrupted.mp3');
      writeFileSync(corruptedFile, 'This is not audio data');

      const fileInfo = {
        id: 'test-corrupted-001',
        name: 'corrupted.mp3',
        path: corruptedFile,
        size: 100,
        mimeType: 'audio/mpeg',
      };

      const result = await audioService.processAudioFile(fileInfo, {
        format: 'JSON',
      });

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toMatch(/invalid|corrupted|format/i);
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple files in batch successfully', async () => {
      const files = [
        {
          id: 'batch-file-001',
          name: 'batch-audio-1.mp3',
          path: mockAudioFile,
          size: 3000,
          mimeType: 'audio/mpeg',
        },
        {
          id: 'batch-file-002',
          name: 'batch-audio-2.mp3',
          path: mockAudioFile,
          size: 3500,
          mimeType: 'audio/mpeg',
        },
        {
          id: 'batch-file-003',
          name: 'batch-audio-3.mp3',
          path: mockAudioFile,
          size: 4000,
          mimeType: 'audio/mpeg',
        },
      ];

      const batchConfig = {
        name: 'Test Batch Processing',
        format: 'JSON',
        includeTimestamps: true,
        includeConfidence: true,
        maxConcurrentJobs: 2,
      };

      const result = await audioService.processBatch(files, batchConfig);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('batchId');
      expect(result).toHaveProperty('jobs');
      expect(result).toHaveProperty('summary');

      const jobs = result.jobs;
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs).toHaveLength(3);

      jobs.forEach((job: any) => {
        expect(job).toHaveProperty('jobId');
        expect(job).toHaveProperty('fileId');
        expect(job).toHaveProperty('status');
        expect(job).toHaveProperty('result');
        expect(['completed', 'failed']).toContain(job.status);
      });

      const summary = result.summary;
      expect(summary).toHaveProperty('totalFiles', 3);
      expect(summary).toHaveProperty('completedFiles');
      expect(summary).toHaveProperty('failedFiles');
      expect(summary).toHaveProperty('totalProcessingTime');
      expect(summary.completedFiles + summary.failedFiles).toBe(3);
    });

    it('should handle partial batch failures gracefully', async () => {
      // Setup mixed success/failure responses
      nock(TEST_CONFIG.PYTHON_SERVICE_URL)
        .post('/transcribe/file')
        .reply(200, getMockTranscriptionResponse())
        .post('/transcribe/file')
        .reply(500, { error: 'Processing failed' })
        .post('/transcribe/file')
        .reply(200, getMockTranscriptionResponse());

      const files = [
        {
          id: 'partial-batch-001',
          name: 'success-1.mp3',
          path: mockAudioFile,
          size: 3000,
          mimeType: 'audio/mpeg',
        },
        {
          id: 'partial-batch-002',
          name: 'failure.mp3',
          path: mockAudioFile,
          size: 3000,
          mimeType: 'audio/mpeg',
        },
        {
          id: 'partial-batch-003',
          name: 'success-2.mp3',
          path: mockAudioFile,
          size: 3000,
          mimeType: 'audio/mpeg',
        },
      ];

      const result = await audioService.processBatch(files, {
        name: 'Partial Failure Batch',
        format: 'JSON',
        continueOnError: true,
      });

      expect(result).toHaveProperty('success', true); // Batch itself succeeds
      expect(result.summary.completedFiles).toBe(2);
      expect(result.summary.failedFiles).toBe(1);

      const failedJob = result.jobs.find((job: any) => job.status === 'failed');
      expect(failedJob).toBeDefined();
      expect(failedJob).toHaveProperty('error');
    });

    it('should enforce concurrent processing limits', async () => {
      const maxConcurrent = 2;
      let activeCalls = 0;
      let maxActiveCalls = 0;

      // Mock Python service with concurrency tracking
      nock(TEST_CONFIG.PYTHON_SERVICE_URL)
        .persist()
        .post('/transcribe/file')
        .reply(function() {
          activeCalls++;
          maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
          
          setTimeout(() => {
            activeCalls--;
          }, 100);
          
          return [200, getMockTranscriptionResponse()];
        });

      const files = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent-test-${i + 1}`,
        name: `concurrent-${i + 1}.mp3`,
        path: mockAudioFile,
        size: 3000,
        mimeType: 'audio/mpeg',
      }));

      const result = await audioService.processBatch(files, {
        name: 'Concurrency Test',
        format: 'JSON',
        maxConcurrentJobs: maxConcurrent,
      });

      expect(result).toHaveProperty('success', true);
      expect(maxActiveCalls).toBeLessThanOrEqual(maxConcurrent);
    });

    it('should provide real-time progress updates', async () => {
      const progressUpdates: any[] = [];
      
      // Mock progress callback
      const onProgress = (progress: any) => {
        progressUpdates.push(progress);
      };

      const files = Array.from({ length: 3 }, (_, i) => ({
        id: `progress-test-${i + 1}`,
        name: `progress-${i + 1}.mp3`,
        path: mockAudioFile,
        size: 3000,
        mimeType: 'audio/mpeg',
      }));

      const result = await audioService.processBatch(files, {
        name: 'Progress Test',
        format: 'JSON',
        onProgress,
      });

      expect(result).toHaveProperty('success', true);
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Validate progress update structure
      progressUpdates.forEach((update, index) => {
        expect(update).toHaveProperty('batchId');
        expect(update).toHaveProperty('completedFiles');
        expect(update).toHaveProperty('totalFiles', 3);
        expect(update).toHaveProperty('overallProgress');
        expect(update.completedFiles).toBeWithinRange(0, 3);
        expect(update.overallProgress).toBeWithinRange(0, 100);
        
        // Progress should be non-decreasing
        if (index > 0) {
          expect(update.completedFiles).toBeGreaterThanOrEqual(
            progressUpdates[index - 1].completedFiles
          );
        }
      });
    });
  });

  describe('Resource Management', () => {
    it('should cleanup temporary files after processing', async () => {
      const fileInfo = {
        id: 'cleanup-test-001',
        name: 'cleanup-test.mp3',
        path: mockAudioFile,
        size: 3000,
        mimeType: 'audio/mpeg',
      };

      // Track temporary files created during processing
      const tempFilesBefore = await cleanupService.getTemporaryFileCount();

      await audioService.processAudioFile(fileInfo, {
        format: 'JSON',
        includeTimestamps: true,
      });

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      const tempFilesAfter = await cleanupService.getTemporaryFileCount();
      expect(tempFilesAfter).toBeLessThanOrEqual(tempFilesBefore);
    });

    it('should handle memory efficiently for large files', async () => {
      const largeFileInfo = {
        id: 'memory-test-001',
        name: 'large-memory-test.mp3',
        path: mockLargeAudioFile,
        size: 100 * 1024 * 1024, // 100MB
        mimeType: 'audio/mpeg',
      };

      const memoryBefore = process.memoryUsage();

      await audioService.processAudioFile(largeFileInfo, {
        format: 'JSON',
        chunkDurationMinutes: 5,
        memoryOptimized: true,
      });

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const memoryAfter = process.memoryUsage();
      const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;

      // Memory increase should be reasonable (less than 50MB for 100MB file)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle disk space monitoring', async () => {
      const fileInfo = {
        id: 'disk-space-test-001',
        name: 'disk-space-test.mp3',
        path: mockAudioFile,
        size: 3000,
        mimeType: 'audio/mpeg',
      };

      // Mock low disk space scenario
      jest.spyOn(cleanupService, 'checkDiskSpace').mockResolvedValue({
        available: 100 * 1024 * 1024, // 100MB available
        total: 1000 * 1024 * 1024, // 1GB total
        used: 900 * 1024 * 1024, // 900MB used
        percentage: 90,
      });

      const result = await audioService.processAudioFile(fileInfo, {
        format: 'JSON',
        checkDiskSpace: true,
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('warnings');
      expect(result.warnings).toContain('Low disk space detected');
    });
  });

  describe('Quality Assurance', () => {
    it('should validate transcription quality', async () => {
      const fileInfo = {
        id: 'quality-test-001',
        name: 'quality-test.mp3',
        path: mockAudioFile,
        size: 3000,
        mimeType: 'audio/mpeg',
      };

      const result = await audioService.processAudioFile(fileInfo, {
        format: 'JSON',
        includeConfidence: true,
        qualityThreshold: 0.8,
      });

      expect(result).toHaveProperty('success', true);
      
      const transcription = result.transcriptionResult;
      expect(transcription).toHaveProperty('qualityScore');
      expect(transcription).toHaveProperty('qualityFlags');
      
      if (transcription.qualityScore < 0.8) {
        expect(Array.isArray(transcription.qualityFlags)).toBe(true);
        expect(transcription.qualityFlags.length).toBeGreaterThan(0);
      }
    });

    it('should handle audio quality analysis', async () => {
      const fileInfo = {
        id: 'audio-quality-test-001',
        name: 'audio-quality-test.mp3',
        path: mockAudioFile,
        size: 3000,
        mimeType: 'audio/mpeg',
      };

      const result = await audioService.processAudioFile(fileInfo, {
        format: 'JSON',
        analyzeAudioQuality: true,
      });

      expect(result).toHaveProperty('success', true);
      
      const transcription = result.transcriptionResult;
      expect(transcription.metadata).toHaveProperty('audioQuality');
      
      const audioQuality = transcription.metadata.audioQuality;
      expect(audioQuality).toHaveProperty('snr'); // Signal-to-noise ratio
      expect(audioQuality).toHaveProperty('clarity');
      expect(audioQuality).toHaveProperty('backgroundNoise');
      expect(audioQuality).toHaveProperty('overallScore');
    });
  });

  /**
   * Setup mock audio files for testing
   */
  async function setupMockAudioFiles(): Promise<void> {
    // Create mock MP3 file
    mockAudioFile = join(TEST_CONFIG.TEMP_DIR, 'mock-audio.mp3');
    const mp3Header = Buffer.from([0xFF, 0xFB, 0x90, 0x00]);
    const audioData = Buffer.alloc(5000);
    writeFileSync(mockAudioFile, Buffer.concat([mp3Header, audioData]));

    // Create mock large audio file
    mockLargeAudioFile = join(TEST_CONFIG.TEMP_DIR, 'mock-large-audio.mp3');
    const largeAudioData = Buffer.alloc(10 * 1024 * 1024); // 10MB
    writeFileSync(mockLargeAudioFile, Buffer.concat([mp3Header, largeAudioData]));
  }

  /**
   * Setup Python service mocks
   */
  function setupPythonServiceMocks(): void {
    // Default successful transcription response
    nock(TEST_CONFIG.PYTHON_SERVICE_URL)
      .persist()
      .post('/transcribe/file')
      .reply(200, getMockTranscriptionResponse());

    // Health check mock
    nock(TEST_CONFIG.PYTHON_SERVICE_URL)
      .persist()
      .get('/health')
      .reply(200, { status: 'healthy', version: '1.0.0' });
  }

  /**
   * Setup mocks for large file processing
   */
  function setupLargeFileProcessingMocks(): void {
    // Mock chunked processing
    nock(TEST_CONFIG.PYTHON_SERVICE_URL)
      .persist()
      .post('/transcribe/chunks')
      .reply(200, {
        success: true,
        chunks: [
          getMockChunkResponse(0, 600),
          getMockChunkResponse(600, 1200),
          getMockChunkResponse(1200, 1800),
        ],
        totalDuration: 1800,
        processingTime: 45.2,
      });
  }

  /**
   * Get mock transcription response
   */
  function getMockTranscriptionResponse(): any {
    return {
      success: true,
      data: {
        text: 'This is a mock transcription result for testing purposes.',
        confidence: 0.95,
        duration: 120.5,
        segments: [
          {
            start: 0,
            end: 30,
            text: 'This is a mock transcription',
            confidence: 0.94,
          },
          {
            start: 30,
            end: 60,
            text: 'result for testing',
            confidence: 0.96,
          },
          {
            start: 60,
            end: 120.5,
            text: 'purposes.',
            confidence: 0.95,
          },
        ],
        language: 'en',
        metadata: {
          model: 'voxtral-mini-3b',
          sampleRate: 16000,
          channels: 1,
          processingTime: 15.3,
          audioQuality: {
            snr: 25.5,
            clarity: 0.88,
            backgroundNoise: 0.12,
            overallScore: 0.92,
          },
        },
      },
    };
  }

  /**
   * Get mock chunk response
   */
  function getMockChunkResponse(startTime: number, endTime: number): any {
    return {
      chunkIndex: Math.floor(startTime / 600),
      startTime,
      endTime,
      text: `Mock chunk transcription from ${startTime} to ${endTime} seconds.`,
      confidence: 0.90 + Math.random() * 0.1,
      segments: [
        {
          start: startTime,
          end: endTime,
          text: `Mock chunk transcription from ${startTime} to ${endTime} seconds.`,
          confidence: 0.90 + Math.random() * 0.1,
        },
      ],
    };
  }
});
import request from 'supertest';
import { Express } from 'express';
import { join } from 'path';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { createApp } from '@/app';
import { TEST_CONFIG } from '../../setup';

describe('Files API Integration Tests', () => {
  let app: Express;
  let testFilePath: string;
  let testAudioBuffer: Buffer;
  
  beforeAll(async () => {
    // Initialize the Express app
    app = await createApp();
    
    // Create test audio file
    testFilePath = join(TEST_CONFIG.UPLOAD_DIR, 'test-audio.mp3');
    testAudioBuffer = createMockAudioFile();
    writeFileSync(testFilePath, testAudioBuffer);
  });

  beforeEach(async () => {
    // Reset any file system state
    await clearTestUploads();
  });

  describe('POST /api/files/upload', () => {
    it('should upload a valid audio file successfully', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .attach('audio', testAudioBuffer, {
          filename: 'test-audio.mp3',
          contentType: 'audio/mpeg',
        })
        .expect(201);

      // Validate response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name', 'test-audio.mp3');
      expect(response.body.data).toHaveProperty('size');
      expect(response.body.data).toHaveProperty('mimeType', 'audio/mpeg');
      expect(response.body.data).toHaveProperty('uploadedAt');
      expect(response.body.data).toHaveProperty('path');

      // Validate UUID format
      expect(response.body.data.id).toBeValidUUID();
      
      // Validate timestamp
      expect(response.body.data.uploadedAt).toBeValidTimestamp();
      
      // Validate file size
      expect(response.body.data.size).toBeWithinRange(1000, 100000);
      
      // Verify file was actually saved
      const filePath = response.body.data.path;
      expect(existsSync(filePath)).toBe(true);
      
      // Verify file content integrity
      const savedBuffer = readFileSync(filePath);
      expect(savedBuffer.equals(testAudioBuffer)).toBe(true);
    });

    it('should handle multiple file formats correctly', async () => {
      const testCases = [
        { filename: 'test.mp3', contentType: 'audio/mpeg', expectedMime: 'audio/mpeg' },
        { filename: 'test.wav', contentType: 'audio/wav', expectedMime: 'audio/wav' },
        { filename: 'test.m4a', contentType: 'audio/mp4', expectedMime: 'audio/mp4' },
        { filename: 'test.ogg', contentType: 'audio/ogg', expectedMime: 'audio/ogg' },
        { filename: 'test.flac', contentType: 'audio/flac', expectedMime: 'audio/flac' },
      ];

      for (const testCase of testCases) {
        const mockBuffer = createMockAudioFile(testCase.contentType);
        
        const response = await request(app)
          .post('/api/files/upload')
          .attach('audio', mockBuffer, {
            filename: testCase.filename,
            contentType: testCase.contentType,
          })
          .expect(201);

        expect(response.body.data.name).toBe(testCase.filename);
        expect(response.body.data.mimeType).toBe(testCase.expectedMime);
        
        // Verify file exists
        expect(existsSync(response.body.data.path)).toBe(true);
      }
    });

    it('should reject unsupported file types', async () => {
      const unsupportedFiles = [
        { filename: 'document.pdf', contentType: 'application/pdf' },
        { filename: 'image.jpg', contentType: 'image/jpeg' },
        { filename: 'video.mp4', contentType: 'video/mp4' },
        { filename: 'text.txt', contentType: 'text/plain' },
      ];

      for (const file of unsupportedFiles) {
        const mockBuffer = Buffer.from('fake content');
        
        const response = await request(app)
          .post('/api/files/upload')
          .attach('file', mockBuffer, {
            filename: file.filename,
            contentType: file.contentType,
          })
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/unsupported|invalid/i);
      }
    });

    it('should enforce file size limits', async () => {
      // Test file too large (simulate 600MB file)
      const largeFileSize = 600 * 1024 * 1024; // 600MB
      const largeBuffer = Buffer.alloc(1000); // Small buffer for testing
      
      const response = await request(app)
        .post('/api/files/upload')
        .attach('audio', largeBuffer, {
          filename: 'large-file.mp3',
          contentType: 'audio/mpeg',
        })
        .field('fileSize', largeFileSize.toString()) // Simulate large file
        .expect(413);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/file size|too large/i);
    });

    it('should validate required fields', async () => {
      // Test missing file
      const response = await request(app)
        .post('/api/files/upload')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/no file|missing file/i);
    });

    it('should handle upload errors gracefully', async () => {
      // Mock disk space error by trying to upload to non-existent directory
      const originalUploadDir = process.env.UPLOAD_DIR;
      process.env.UPLOAD_DIR = '/non/existent/directory';

      const response = await request(app)
        .post('/api/files/upload')
        .attach('audio', testAudioBuffer, {
          filename: 'test-upload-error.mp3',
          contentType: 'audio/mpeg',
        })
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');

      // Restore original upload directory
      process.env.UPLOAD_DIR = originalUploadDir;
    });

    it('should generate unique filenames for duplicate uploads', async () => {
      const filename = 'duplicate-test.mp3';
      
      // Upload first file
      const response1 = await request(app)
        .post('/api/files/upload')
        .attach('audio', testAudioBuffer, {
          filename,
          contentType: 'audio/mpeg',
        })
        .expect(201);

      // Upload second file with same name
      const response2 = await request(app)
        .post('/api/files/upload')
        .attach('audio', testAudioBuffer, {
          filename,
          contentType: 'audio/mpeg',
        })
        .expect(201);

      // Should have different IDs and paths
      expect(response1.body.data.id).not.toBe(response2.body.data.id);
      expect(response1.body.data.path).not.toBe(response2.body.data.path);
      
      // Both files should exist
      expect(existsSync(response1.body.data.path)).toBe(true);
      expect(existsSync(response2.body.data.path)).toBe(true);
    });

    it('should handle concurrent uploads correctly', async () => {
      const concurrentUploads = 5;
      const uploadPromises = [];

      for (let i = 0; i < concurrentUploads; i++) {
        const promise = request(app)
          .post('/api/files/upload')
          .attach('audio', testAudioBuffer, {
            filename: `concurrent-test-${i}.mp3`,
            contentType: 'audio/mpeg',
          });
        
        uploadPromises.push(promise);
      }

      const responses = await Promise.all(uploadPromises);

      // All uploads should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // All should have unique IDs
      const ids = responses.map(r => r.body.data.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(concurrentUploads);

      // All files should exist
      responses.forEach(response => {
        expect(existsSync(response.body.data.path)).toBe(true);
      });
    });
  });

  describe('GET /api/files/info/:id', () => {
    let uploadedFileId: string;
    let uploadedFileData: any;

    beforeEach(async () => {
      // Upload a test file first
      const uploadResponse = await request(app)
        .post('/api/files/upload')
        .attach('audio', testAudioBuffer, {
          filename: 'info-test.mp3',
          contentType: 'audio/mpeg',
        })
        .expect(201);

      uploadedFileId = uploadResponse.body.data.id;
      uploadedFileData = uploadResponse.body.data;
    });

    it('should retrieve file information successfully', async () => {
      const response = await request(app)
        .get(`/api/files/info/${uploadedFileId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      
      const fileInfo = response.body.data;
      expect(fileInfo).toHaveProperty('id', uploadedFileId);
      expect(fileInfo).toHaveProperty('name', 'info-test.mp3');
      expect(fileInfo).toHaveProperty('size');
      expect(fileInfo).toHaveProperty('mimeType', 'audio/mpeg');
      expect(fileInfo).toHaveProperty('uploadedAt');
      expect(fileInfo).toHaveProperty('duration'); // Audio duration analysis
      expect(fileInfo).toHaveProperty('metadata'); // Audio metadata
    });

    it('should return 404 for non-existent file', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .get(`/api/files/info/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/not found/i);
    });

    it('should validate UUID format', async () => {
      const invalidIds = ['invalid-id', '123', 'not-a-uuid'];

      for (const invalidId of invalidIds) {
        const response = await request(app)
          .get(`/api/files/info/${invalidId}`)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/invalid.*id/i);
      }
    });

    it('should include audio analysis metadata', async () => {
      const response = await request(app)
        .get(`/api/files/info/${uploadedFileId}`)
        .expect(200);

      const fileInfo = response.body.data;
      expect(fileInfo.metadata).toHaveProperty('sampleRate');
      expect(fileInfo.metadata).toHaveProperty('channels');
      expect(fileInfo.metadata).toHaveProperty('bitRate');
      expect(fileInfo.duration).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/files/:id', () => {
    let uploadedFileId: string;
    let uploadedFilePath: string;

    beforeEach(async () => {
      // Upload a test file first
      const uploadResponse = await request(app)
        .post('/api/files/upload')
        .attach('audio', testAudioBuffer, {
          filename: 'delete-test.mp3',
          contentType: 'audio/mpeg',
        })
        .expect(201);

      uploadedFileId = uploadResponse.body.data.id;
      uploadedFilePath = uploadResponse.body.data.path;
    });

    it('should delete file successfully', async () => {
      // Verify file exists before deletion
      expect(existsSync(uploadedFilePath)).toBe(true);

      const response = await request(app)
        .delete(`/api/files/${uploadedFileId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');

      // Verify file is deleted from filesystem
      expect(existsSync(uploadedFilePath)).toBe(false);
    });

    it('should return 404 for non-existent file', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app)
        .delete(`/api/files/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate UUID format', async () => {
      const response = await request(app)
        .delete('/api/files/invalid-id')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toMatch(/invalid.*id/i);
    });

    it('should handle file system errors gracefully', async () => {
      // Delete the file manually to simulate file system error
      if (existsSync(uploadedFilePath)) {
        require('fs').unlinkSync(uploadedFilePath);
      }

      const response = await request(app)
        .delete(`/api/files/${uploadedFileId}`)
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should prevent deletion of files being processed', async () => {
      // Mock an ongoing transcription job
      // This would integrate with the job management system
      // For now, we'll simulate by setting file status to 'processing'
      
      const response = await request(app)
        .delete(`/api/files/${uploadedFileId}`)
        .expect(409); // Conflict status

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toMatch(/in use|processing/i);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed requests', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle missing content-type', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .attach('audio', testAudioBuffer, 'test.mp3')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toMatch(/content-type|mime type/i);
    });

    it('should handle empty files', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const response = await request(app)
        .post('/api/files/upload')
        .attach('audio', emptyBuffer, {
          filename: 'empty.mp3',
          contentType: 'audio/mpeg',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toMatch(/empty|size/i);
    });

    it('should handle corrupted audio files', async () => {
      const corruptedBuffer = Buffer.from('This is not audio data');

      const response = await request(app)
        .post('/api/files/upload')
        .attach('audio', corruptedBuffer, {
          filename: 'corrupted.mp3',
          contentType: 'audio/mpeg',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toMatch(/invalid|corrupted|format/i);
    });

    it('should rate limit excessive uploads', async () => {
      const rapidUploads = 20;
      const uploadPromises = [];

      // Attempt rapid uploads
      for (let i = 0; i < rapidUploads; i++) {
        const promise = request(app)
          .post('/api/files/upload')
          .attach('audio', testAudioBuffer, {
            filename: `rapid-test-${i}.mp3`,
            contentType: 'audio/mpeg',
          });
        
        uploadPromises.push(promise);
      }

      const responses = await Promise.allSettled(uploadPromises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(
        (result) => result.status === 'fulfilled' && 
        (result.value as any).status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  /**
   * Utility function to create mock audio file buffer
   */
  function createMockAudioFile(contentType: string = 'audio/mpeg'): Buffer {
    // Create a minimal valid audio file header based on content type
    switch (contentType) {
      case 'audio/mpeg':
        // MP3 header
        return Buffer.concat([
          Buffer.from([0xFF, 0xFB, 0x90, 0x00]), // MP3 frame header
          Buffer.from('Mock MP3 audio data for testing purposes').slice(0, 1000),
          Buffer.alloc(1000, 0x00) // Padding
        ]);
      
      case 'audio/wav':
        // WAV header
        const wavHeader = Buffer.alloc(44);
        wavHeader.write('RIFF', 0);
        wavHeader.writeUInt32LE(1000, 4);
        wavHeader.write('WAVE', 8);
        wavHeader.write('fmt ', 12);
        wavHeader.writeUInt32LE(16, 16);
        wavHeader.writeUInt16LE(1, 20); // PCM
        wavHeader.writeUInt16LE(2, 22); // Channels
        wavHeader.writeUInt32LE(44100, 24); // Sample rate
        return Buffer.concat([wavHeader, Buffer.alloc(1000, 0x00)]);
      
      default:
        return Buffer.concat([
          Buffer.from('Mock audio file'),
          Buffer.alloc(1000, 0x00)
        ]);
    }
  }

  /**
   * Utility function to clear test uploads
   */
  async function clearTestUploads(): Promise<void> {
    // This would integrate with the cleanup service
    // For now, we'll use a simple file system cleanup
    try {
      const testFiles = require('fs').readdirSync(TEST_CONFIG.UPLOAD_DIR);
      testFiles.forEach((file: string) => {
        const filePath = join(TEST_CONFIG.UPLOAD_DIR, file);
        try {
          require('fs').unlinkSync(filePath);
        } catch (error) {
          // Ignore cleanup errors in tests
        }
      });
    } catch (error) {
      // Directory doesn't exist or other error, ignore
    }
  }
});
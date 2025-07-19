import fs from 'fs/promises';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';
import { config } from '@/config/app.config';
import { logger } from '@/utils/logger';
import { cleanupService } from './cleanup.service';

export interface FileUploadResult {
  fileId: string;
  filename: string;
  fileSize: number;
  tempPath: string;
  audioInfo?: any;
}

export interface BatchUploadConfig {
  outputDirectory: string;
  format: 'json' | 'txt' | 'srt' | 'vtt';
  includeTimestamps: boolean;
  includeConfidence: boolean;
  cleanupAfterProcessing: boolean;
}

export class AudioService {
  private uploadedFiles: Map<string, FileUploadResult> = new Map();

  /**
   * Handle large file upload with streaming
   */
  async handleFileUpload(
    fileBuffer: Buffer,
    filename: string,
    options: {
      chunkSize?: number;
      cleanup?: boolean;
    } = {}
  ): Promise<FileUploadResult> {
    
    const fileId = this.generateFileId();
    const { chunkSize = 10 * 1024 * 1024, cleanup = true } = options; // 10MB chunks

    try {
      // Create temporary file for the upload
      const tempFile = await cleanupService.createTempFile({
        prefix: 'upload-',
        suffix: path.extname(filename),
        cleanupDelayMs: cleanup ? 3600000 : 0, // 1 hour if cleanup enabled
      });

      // Write file in chunks to handle large files efficiently
      await this.writeFileInChunks(fileBuffer, tempFile.path, chunkSize);

      // Get audio information from Python service
      const audioInfo = await this.getAudioInfo(tempFile.path, filename);

      const result: FileUploadResult = {
        fileId,
        filename,
        fileSize: fileBuffer.length,
        tempPath: tempFile.path,
        audioInfo,
      };

      // Store file info for later retrieval
      this.uploadedFiles.set(fileId, result);

      logger.info(`File uploaded: ${filename} (${fileBuffer.length} bytes) -> ${fileId}`);

      return result;

    } catch (error) {
      logger.error(`File upload failed for ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Start batch transcription of multiple files
   */
  async startBatchTranscription(
    fileIds: string[],
    config: BatchUploadConfig
  ): Promise<{
    batchId: string;
    message: string;
    progressUrl: string;
  }> {
    
    try {
      // Validate that all files exist
      const files = fileIds.map(id => {
        const file = this.uploadedFiles.get(id);
        if (!file) {
          throw new Error(`File not found: ${id}`);
        }
        return file;
      });

      // Prepare batch request for Python service
      const batchRequest = {
        files: fileIds,
        output_directory: config.outputDirectory,
        format: config.format,
        include_timestamps: config.includeTimestamps,
        include_confidence: config.includeConfidence,
        cleanup_after_processing: config.cleanupAfterProcessing,
        processing_config: {
          chunk_duration_minutes: 10,
          overlap_seconds: 10,
          noise_reduction: true,
          vad_enabled: true,
          max_concurrent_chunks: 3,
        },
      };

      // Send request to Python service
      const response = await axios.post(
        `${config.pythonService.url}/transcribe/batch`,
        batchRequest,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout for batch start
        }
      );

      const { batch_id } = response.data;

      logger.info(`Started batch transcription: ${batch_id} with ${fileIds.length} files`);

      return {
        batchId: batch_id,
        message: 'Batch transcription started successfully',
        progressUrl: `/api/transcribe/batch/${batch_id}/progress`,
      };

    } catch (error: any) {
      logger.error('Batch transcription start failed:', error);
      
      if (error.response) {
        throw new Error(`Python service error: ${error.response.data?.detail || error.message}`);
      } else if (error.request) {
        throw new Error('Python service not available');
      } else {
        throw error;
      }
    }
  }

  /**
   * Get progress for a batch transcription job
   */
  async getBatchProgress(batchId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${config.pythonService.url}/transcribe/batch/${batchId}/progress`,
        { timeout: 10000 }
      );

      return response.data;

    } catch (error: any) {
      logger.error(`Failed to get batch progress for ${batchId}:`, error);
      
      if (error.response?.status === 404) {
        throw new Error('Batch job not found');
      }
      
      throw new Error('Failed to get batch progress');
    }
  }

  /**
   * Get progress for a single transcription job
   */
  async getJobProgress(jobId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${config.pythonService.url}/transcribe/job/${jobId}/progress`,
        { timeout: 10000 }
      );

      return response.data;

    } catch (error: any) {
      logger.error(`Failed to get job progress for ${jobId}:`, error);
      
      if (error.response?.status === 404) {
        throw new Error('Job not found');
      }
      
      throw new Error('Failed to get job progress');
    }
  }

  /**
   * Cancel a transcription job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      await axios.post(
        `${config.pythonService.url}/transcribe/job/${jobId}/cancel`,
        {},
        { timeout: 10000 }
      );

      logger.info(`Cancelled job: ${jobId}`);
      return true;

    } catch (error: any) {
      logger.error(`Failed to cancel job ${jobId}:`, error);
      
      if (error.response?.status === 404) {
        return false; // Job not found
      }
      
      throw new Error('Failed to cancel job');
    }
  }

  /**
   * Transcribe a single file
   */
  async transcribeFile(
    fileId: string,
    options: {
      language?: string;
      format?: string;
      includeTimestamps?: boolean;
      includeConfidence?: boolean;
    } = {}
  ): Promise<any> {
    
    const file = this.uploadedFiles.get(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    try {
      // Read file data
      const fileData = await fs.readFile(file.tempPath);

      // Create form data for upload to Python service
      const formData = new FormData();
      formData.append('file', fileData, file.filename);
      formData.append('language', options.language || 'auto');
      formData.append('format', options.format || 'json');
      formData.append('include_timestamps', String(options.includeTimestamps !== false));
      formData.append('include_confidence', String(options.includeConfidence !== false));

      // Send to Python service
      const response = await axios.post(
        `${config.pythonService.url}/transcribe/file`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 300000, // 5 minutes timeout
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      logger.info(`Transcription completed for file: ${file.filename}`);

      return response.data;

    } catch (error: any) {
      logger.error(`Transcription failed for file ${file.filename}:`, error);
      
      if (error.response) {
        throw new Error(`Transcription error: ${error.response.data?.detail || error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Get file information without processing
   */
  async getFileInfo(fileId: string): Promise<FileUploadResult | null> {
    return this.uploadedFiles.get(fileId) || null;
  }

  /**
   * List all uploaded files
   */
  getUploadedFiles(): FileUploadResult[] {
    return Array.from(this.uploadedFiles.values());
  }

  /**
   * Remove file from tracking and optionally delete
   */
  async removeFile(fileId: string, deleteFile: boolean = true): Promise<boolean> {
    const file = this.uploadedFiles.get(fileId);
    if (!file) {
      return false;
    }

    if (deleteFile) {
      try {
        await cleanupService.cleanupPath(file.tempPath);
      } catch (error) {
        logger.warning(`Failed to delete file ${file.tempPath}:`, error);
      }
    }

    this.uploadedFiles.delete(fileId);
    logger.debug(`Removed file from tracking: ${fileId}`);
    
    return true;
  }

  /**
   * Clean up old uploaded files
   */
  async cleanupOldFiles(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [fileId, file] of this.uploadedFiles.entries()) {
      try {
        const stats = await fs.stat(file.tempPath);
        const age = now - stats.mtime.getTime();

        if (age > maxAgeMs) {
          await this.removeFile(fileId, true);
          cleanedCount++;
        }
      } catch (error) {
        // File might not exist anymore, remove from tracking
        this.uploadedFiles.delete(fileId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} old uploaded files`);
    }

    return cleanedCount;
  }

  /**
   * Get audio information from Python service
   */
  private async getAudioInfo(filePath: string, filename: string): Promise<any> {
    try {
      const fileData = await fs.readFile(filePath);
      
      const formData = new FormData();
      formData.append('file', fileData, filename);

      const response = await axios.get(
        `${config.pythonService.url}/transcribe/info/${encodeURIComponent(filename)}`,
        {
          headers: formData.getHeaders(),
          timeout: 30000,
        }
      );

      return response.data;

    } catch (error) {
      logger.warning(`Failed to get audio info for ${filename}:`, error);
      return null;
    }
  }

  /**
   * Write file in chunks for memory efficiency
   */
  private async writeFileInChunks(
    buffer: Buffer,
    filePath: string,
    chunkSize: number
  ): Promise<void> {
    
    const fileHandle = await fs.open(filePath, 'w');
    
    try {
      let offset = 0;
      
      while (offset < buffer.length) {
        const chunk = buffer.subarray(offset, offset + chunkSize);
        await fileHandle.write(chunk);
        offset += chunkSize;
      }
    } finally {
      await fileHandle.close();
    }
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service statistics
   */
  getStats(): {
    uploadedFiles: number;
    totalSize: number;
    oldestFile?: Date;
  } {
    const files = Array.from(this.uploadedFiles.values());
    const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0);
    
    return {
      uploadedFiles: files.length,
      totalSize,
      oldestFile: files.length > 0 ? new Date(Math.min(...files.map(f => 
        parseInt(f.fileId.split('_')[1])
      ))) : undefined,
    };
  }
}

// Global instance
export const audioService = new AudioService();
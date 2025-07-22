/**
 * VoxFlow API Routes - Complete Production Implementation
 * All transcription, file management, and configuration endpoints
 */

import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { audioService } from '@/services/audio.service';
import { config } from '@/config/app.config';
import { logger } from '@/utils/logger';
import { asyncHandler } from '@/middleware/error.middleware';

export const apiRoutes = Router();

// Configure multer for file uploads
const upload = multer({
  dest: config.upload.uploadDir,
  limits: {
    fileSize: parseFileSize(config.upload.maxFileSize),
    files: 10, // Maximum 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Validate file type
    if (config.upload.mimeTypes.includes(file.mimetype as any)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Supported: ${config.upload.allowedFormats.join(', ')}`));
    }
  },
});

// Validation schemas
const transcriptionRequestSchema = z.object({
  fileId: z.string().min(1),
  systemPrompt: z.string().max(2000).optional(),
  language: z.string().optional(),
  format: z.enum(['json', 'txt', 'srt', 'vtt']).optional(),
  includeTimestamps: z.boolean().optional(),
  includeConfidence: z.boolean().optional(),
  chunkSizeMode: z.enum(['small', 'medium', 'large']).optional(),
});

const batchConfigSchema = z.object({
  outputDirectory: z.string().min(1),
  format: z.enum(['json', 'txt', 'srt', 'vtt']),
  includeTimestamps: z.boolean().default(true),
  includeConfidence: z.boolean().default(true),
  cleanupAfterProcessing: z.boolean().default(true),
  systemPrompt: z.string().max(2000).optional(),
  chunkSizeMode: z.enum(['small', 'medium', 'large']).optional(),
});

const fileIdsSchema = z.object({
  fileIds: z.array(z.string()).min(1).max(50),
});

// Helper function to parse file size
function parseFileSize(sizeStr: string): number {
  const units: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  };
  
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)(B|KB|MB|GB)$/i);
  if (!match || match.length < 3) {
    throw new Error(`Invalid file size format: ${sizeStr}`);
  }
  
  const size = match[1];
  const unit = match[2];
  
  if (!size || !unit) {
    throw new Error(`Invalid file size format: ${sizeStr}`);
  }
  
  const unitKey = unit.toUpperCase();
  const multiplier = units[unitKey];
  if (multiplier === undefined) {
    throw new Error(`Unknown unit: ${unit}`);
  }
  return parseFloat(size) * multiplier;
}

// Validation middleware
function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      } else {
        next(error);
      }
    }
  };
}

// Root API endpoint
apiRoutes.get('/', (req, res) => {
  res.json({
    service: 'VoxFlow API Gateway',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      files: {
        upload: 'POST /api/files/upload',
        info: 'GET /api/files/info/:id',
        delete: 'DELETE /api/files/:id',
      },
      transcription: {
        single: 'POST /api/transcribe/file',
        batch: 'POST /api/transcribe/batch',
        progress: 'GET /api/transcribe/job/:id/progress',
        batchProgress: 'GET /api/transcribe/batch/:id/progress',
        cancel: 'POST /api/transcribe/job/:id/cancel',
      },
      configuration: {
        output: 'POST /api/config/output',
        current: 'GET /api/config/current',
        cleanup: 'GET /api/config/cleanup/stats',
      },
    },
    documentation: '/docs',
  });
});

// File Management Routes
apiRoutes.post('/files/upload', 
  upload.array('files', 10),
  asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      res.status(400).json({
        error: 'No files uploaded',
      });
      return;
    }
    
    try {
      const uploadResults = await Promise.all(
        files.map(file => audioService.handleFileUpload(file))
      );
      
      logger.info(`Successfully uploaded ${files.length} files`, {
        fileIds: uploadResults.map(r => r.fileId),
        totalSize: uploadResults.reduce((sum, r) => sum + r.fileSize, 0),
      });
      
      res.status(201).json({
        message: `Successfully uploaded ${files.length} files`,
        files: uploadResults,
      });
    } catch (error) {
      logger.error('File upload failed:', error);
      res.status(500).json({
        error: 'File upload failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

apiRoutes.get('/files/info/:id', 
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        error: 'File ID is required',
      });
      return;
    }
    
    try {
      const fileInfo = audioService.getFileInfo(id);
      if (!fileInfo) {
        res.status(404).json({
          error: 'File not found',
          fileId: id,
        });
        return;
      }
      
      res.json(fileInfo);
    } catch (error) {
      logger.error(`Failed to get file info for ${id}:`, error);
      res.status(500).json({
        error: 'Failed to get file information',
        fileId: id,
      });
    }
  })
);

apiRoutes.delete('/files/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        error: 'File ID is required',
      });
      return;
    }
    
    try {
      await audioService.deleteFile(id);
      
      logger.info(`File deleted: ${id}`);
      res.json({
        message: 'File deleted successfully',
        fileId: id,
      });
    } catch (error) {
      logger.error(`Failed to delete file ${id}:`, error);
      res.status(500).json({
        error: 'Failed to delete file',
        fileId: id,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

// Transcription Routes
apiRoutes.post('/transcribe/file',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    try {
      const validatedData = transcriptionRequestSchema.parse(req.body);
      
      const { 
        fileId, 
        systemPrompt,
        language,
        format,
        includeTimestamps,
        includeConfidence,
        chunkSizeMode
      } = validatedData;
    
      try {
        // Filter out undefined values for exactOptionalPropertyTypes compatibility
        const options: {
          systemPrompt?: string;
          language?: string;
          format?: string;
          includeTimestamps?: boolean;
          includeConfidence?: boolean;
          chunkSizeMode?: 'small' | 'medium' | 'large';
        } = {};
        
        if (systemPrompt !== undefined) options.systemPrompt = systemPrompt;
        if (language !== undefined) options.language = language;
        if (format !== undefined) options.format = format;
        if (includeTimestamps !== undefined) options.includeTimestamps = includeTimestamps;
        if (includeConfidence !== undefined) options.includeConfidence = includeConfidence;
        if (chunkSizeMode !== undefined) options.chunkSizeMode = chunkSizeMode;
        
        const result = await audioService.transcribeFile(fileId, options);
        
        logger.info(`File transcription response for: ${fileId}`, {
          hasText: !!result.text,
          hasSegments: !!result.segments,
          hasJobId: !!result.jobId,
          keys: Object.keys(result),
        });
        
        res.status(202).json(result);
      } catch (error) {
        logger.error(`File transcription failed for ${fileId}:`, error);
        res.status(500).json({
          error: 'Transcription failed',
          fileId,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } catch (validationError) {
      logger.error('Invalid transcription request:', validationError);
      res.status(400).json({
        error: 'Invalid request data',
        details: validationError instanceof Error ? validationError.message : 'Validation failed',
      });
    }
  })
);

apiRoutes.post('/transcribe/batch',
  validateBody(fileIdsSchema.merge(batchConfigSchema)),
  asyncHandler(async (req: Request, res: Response) => {
    const { fileIds, ...batchConfig } = req.body;
    
    try {
      const result = await audioService.startBatchTranscription(fileIds, batchConfig);
      
      logger.info(`Batch transcription started with ${fileIds.length} files`, {
        batchId: result.batchId,
        fileIds,
      });
      
      res.status(202).json(result);
    } catch (error) {
      logger.error('Batch transcription failed:', error);
      res.status(500).json({
        error: 'Batch transcription failed',
        fileIds,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

apiRoutes.get('/transcribe/job/:id/progress',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        error: 'Job ID is required',
      });
      return;
    }
    
    try {
      const progress = await audioService.getJobProgress(id);
      res.json(progress);
    } catch (error) {
      logger.error(`Failed to get job progress for ${id}:`, error);
      res.status(500).json({
        error: 'Failed to get job progress',
        jobId: id,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

apiRoutes.get('/transcribe/batch/:id/progress',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        error: 'Batch ID is required',
      });
      return;
    }
    
    try {
      const progress = await audioService.getBatchProgress(id);
      res.json(progress);
    } catch (error) {
      logger.error(`Failed to get batch progress for ${id}:`, error);
      res.status(500).json({
        error: 'Failed to get batch progress',
        batchId: id,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

apiRoutes.post('/transcribe/job/:id/cancel',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        error: 'Job ID is required',
      });
      return;
    }
    
    try {
      await audioService.cancelJob(id);
      
      logger.info(`Job cancelled: ${id}`);
      res.json({
        message: 'Job cancelled successfully',
        jobId: id,
      });
    } catch (error) {
      logger.error(`Failed to cancel job ${id}:`, error);
      res.status(500).json({
        error: 'Failed to cancel job',
        jobId: id,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

// Configuration Routes
apiRoutes.get('/config/current',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      upload: {
        maxFileSize: config.upload.maxFileSize,
        allowedFormats: config.upload.allowedFormats,
        uploadDir: config.upload.uploadDir,
      },
      processing: {
        defaultTimeout: config.pythonService.timeout,
        maxConcurrentRequests: config.queue.concurrency,
      },
      output: {
        supportedFormats: ['json', 'txt', 'srt', 'vtt'],
      },
    });
  })
);

apiRoutes.get('/config/cleanup/stats',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const stats = audioService.getStats();
      res.json({
        cleanup: {
          uploadedFiles: stats.uploadedFiles,
          totalSize: stats.totalSize,
          oldestFile: stats.oldestFile,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get cleanup stats:', error);
      res.status(500).json({
        error: 'Failed to get cleanup statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);
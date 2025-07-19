import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { AudioFile, BatchUploadConfig, TranscriptionProgress } from '@/types/audio.types';
import { TranscriptionResult, BatchTranscriptionJob } from '@/types/transcription.types';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    processingTime?: number;
    processed?: number;
  };
}

export interface UploadProgressCallback {
  (progress: number, loaded: number, total: number): void;
}

export class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = import.meta.env.VITE_API_URL || 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 300000, // 5 minutes for large file uploads
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('voxflow-auth-token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('voxflow-auth-token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Health and Status
  async getHealth(): Promise<ApiResponse> {
    const response = await this.api.get('/health');
    return response.data;
  }

  async getDetailedHealth(): Promise<ApiResponse> {
    const response = await this.api.get('/health/detailed');
    return response.data;
  }

  // File Upload
  async uploadFile(
    file: File,
    onProgress?: UploadProgressCallback
  ): Promise<ApiResponse<AudioFile>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.api.post('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress, progressEvent.loaded, progressEvent.total);
        }
      },
    });

    return response.data;
  }

  async getFileInfo(fileId: string): Promise<ApiResponse<AudioFile>> {
    const response = await this.api.get(`/api/files/info/${fileId}`);
    return response.data;
  }

  async deleteFile(fileId: string): Promise<ApiResponse> {
    const response = await this.api.delete(`/api/files/${fileId}`);
    return response.data;
  }

  // Single File Transcription
  async transcribeFile(
    fileId: string,
    options: {
      language?: string;
      format?: string;
      includeTimestamps?: boolean;
      includeConfidence?: boolean;
    } = {}
  ): Promise<ApiResponse<TranscriptionResult>> {
    const response = await this.api.post('/api/transcribe/file', {
      fileId,
      ...options,
    });
    return response.data;
  }

  // Batch Transcription
  async startBatchTranscription(
    fileIds: string[],
    config: BatchUploadConfig
  ): Promise<ApiResponse<{ batchId: string; message: string; progressUrl: string }>> {
    const response = await this.api.post('/api/transcribe/batch', {
      files: fileIds,
      ...config,
    });
    return response.data;
  }

  async getBatchProgress(batchId: string): Promise<ApiResponse<BatchTranscriptionJob>> {
    const response = await this.api.get(`/api/transcribe/batch/${batchId}/progress`);
    return response.data;
  }

  async cancelBatch(batchId: string): Promise<ApiResponse> {
    const response = await this.api.post(`/api/transcribe/batch/${batchId}/cancel`);
    return response.data;
  }

  // Job Management
  async getJobProgress(jobId: string): Promise<ApiResponse<TranscriptionProgress>> {
    const response = await this.api.get(`/api/transcribe/job/${jobId}/progress`);
    return response.data;
  }

  async cancelJob(jobId: string): Promise<ApiResponse> {
    const response = await this.api.post(`/api/transcribe/job/${jobId}/cancel`);
    return response.data;
  }

  async pauseJob(jobId: string): Promise<ApiResponse> {
    const response = await this.api.post(`/api/transcribe/job/${jobId}/pause`);
    return response.data;
  }

  async resumeJob(jobId: string): Promise<ApiResponse> {
    const response = await this.api.post(`/api/transcribe/job/${jobId}/resume`);
    return response.data;
  }

  // Configuration
  async updateOutputConfig(config: Partial<BatchUploadConfig>): Promise<ApiResponse> {
    const response = await this.api.post('/api/config/output', config);
    return response.data;
  }

  async getCurrentConfig(): Promise<ApiResponse<BatchUploadConfig>> {
    const response = await this.api.get('/api/config/current');
    return response.data;
  }

  async getCleanupStats(): Promise<ApiResponse> {
    const response = await this.api.get('/api/config/cleanup/stats');
    return response.data;
  }

  async triggerCleanup(): Promise<ApiResponse> {
    const response = await this.api.post('/api/config/cleanup/trigger');
    return response.data;
  }

  // System Information
  async getSystemStatus(): Promise<ApiResponse> {
    const response = await this.api.get('/api/system/status');
    return response.data;
  }

  async getModelStatus(): Promise<ApiResponse> {
    const response = await this.api.get('/api/models/status');
    return response.data;
  }

  // Transcription Results
  async getTranscriptionResult(jobId: string): Promise<ApiResponse<TranscriptionResult>> {
    const response = await this.api.get(`/api/transcribe/result/${jobId}`);
    return response.data;
  }

  async downloadTranscription(
    jobId: string, 
    format: 'json' | 'txt' | 'srt' | 'vtt' = 'txt'
  ): Promise<Blob> {
    const response = await this.api.get(`/api/transcribe/download/${jobId}`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  }

  // Live Transcription
  async startLiveSession(config: any): Promise<ApiResponse<{ sessionId: string }>> {
    const response = await this.api.post('/api/live/start', config);
    return response.data;
  }

  async stopLiveSession(sessionId: string): Promise<ApiResponse> {
    const response = await this.api.post(`/api/live/stop/${sessionId}`);
    return response.data;
  }

  async getLiveSessionStatus(sessionId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/api/live/status/${sessionId}`);
    return response.data;
  }

  // Error handling helper
  handleApiError(error: AxiosError): never {
    if (error.response) {
      // Server responded with error status
      const responseData = error.response.data as any;
      const message = responseData?.error || responseData?.message || 'Server error';
      throw new Error(`API Error (${error.response.status}): ${message}`);
    } else if (error.request) {
      // Request made but no response received
      throw new Error('Network error: No response from server');
    } else {
      // Something else happened
      throw new Error(`Request error: ${error.message}`);
    }
  }

  // Upload multiple files with progress tracking
  async uploadMultipleFiles(
    files: File[],
    onFileProgress?: (fileIndex: number, progress: number) => void,
    onOverallProgress?: (progress: number) => void
  ): Promise<ApiResponse<AudioFile[]>> {
    const uploadPromises = files.map((file, index) => 
      this.uploadFile(file, (progress) => {
        onFileProgress?.(index, progress);
      })
    );

    let completedFiles = 0;
    const results: AudioFile[] = [];

    for (const [index, promise] of uploadPromises.entries()) {
      try {
        const result = await promise;
        if (result.success && result.data) {
          results.push(result.data);
        }
        completedFiles++;
        onOverallProgress?.(Math.round((completedFiles / files.length) * 100));
      } catch (error) {
        console.error(`Failed to upload file ${index}:`, error);
        // Continue with other files even if one fails
      }
    }

    return {
      success: true,
      data: results,
      meta: {
        total: files.length,
        processed: results.length,
      },
    };
  }

  // Utility method to check if service is available
  async checkServiceAvailability(): Promise<boolean> {
    try {
      await this.getHealth();
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let apiServiceInstance: ApiService | null = null;

export const getApiService = (): ApiService => {
  if (!apiServiceInstance) {
    apiServiceInstance = new ApiService();
  }
  return apiServiceInstance;
};

// Error types for better error handling
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network connection failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
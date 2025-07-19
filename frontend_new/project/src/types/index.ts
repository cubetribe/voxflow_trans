export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  jobId?: string;
  uploadProgress?: number;
  resultPath?: string;
  error?: string;
  chunks?: {
    current: number;
    total: number;
  };
  timeRemaining?: number;
}

export interface SystemStatus {
  model: {
    name: string;
    status: 'loaded' | 'loading' | 'error';
    memoryUsage?: number;
  };
  hardware: {
    name: string;
    status: 'active' | 'idle' | 'error';
    utilization?: number;
  };
  services: {
    total: number;
    healthy: number;
    status: 'healthy' | 'degraded' | 'error';
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface TranscriptionConfig {
  outputFormat: 'json' | 'txt' | 'srt' | 'vtt';
  outputDirectory: string;
  includeTimestamps: boolean;
  chunkSize: number;
  confidenceThreshold: number;
}

export interface ProgressData {
  jobId: string;
  progress: number;
  status: string;
  currentChunk?: number;
  totalChunks?: number;
  timeRemaining?: number;
}
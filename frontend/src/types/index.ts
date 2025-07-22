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
  result?: any; // Transcription result when completed
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
  chunkSizeMode: 'small' | 'medium' | 'large';
  confidenceThreshold: number;
  systemPrompt?: string;
  language?: string;
}

export interface ProgressData {
  jobId: string;
  progress: number;
  status: string;
  currentChunk?: number;
  totalChunks?: number;
  timeRemaining?: number;
}

export interface TranscriptionResult {
  id: string;
  text: string;
  confidence?: number;
  timestamp?: string;
  fileName?: string;
  format?: string;
  systemPromptUsed?: string;
}

export interface TranscriptionRequest {
  fileId: string;
  config: TranscriptionConfig;
  systemPrompt?: string;
}

export interface BatchTranscriptionRequest {
  fileIds: string[];
  config: TranscriptionConfig;
  systemPrompt?: string;
}
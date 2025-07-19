// Transcription-related type definitions for VoxFlow

export interface TranscriptionResult {
  id: string;
  jobId: string;
  fileId: string;
  filename: string;
  text: string;
  language: string;
  confidence: number;
  duration: number;
  segments: TranscriptionSegment[];
  metadata: TranscriptionMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranscriptionSegment {
  id: string;
  text: string;
  start: number;
  startTime: number;
  end: number;
  endTime: number;
  confidence: number;
  speaker?: string;
  words?: TranscriptionWord[];
}

export interface TranscriptionWord {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
  speaker?: string;
}

export interface TranscriptionMetadata {
  modelVersion: string;
  processingTime: number;
  audioQuality: string;
  language: string;
  languageConfidence: number;
  speakerCount?: number;
  voiceActivitySegments: VoiceActivitySegment[];
  processingSettings: TranscriptionSettings;
}

export interface VoiceActivitySegment {
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface TranscriptionSettings {
  language: string;
  enableTimestamps: boolean;
  enableConfidence: boolean;
  enableSpeakerLabels: boolean;
  enablePunctuation: boolean;
  enableWordTimestamps: boolean;
  noiseReduction: boolean;
  format: TranscriptionFormat;
}

export interface TranscriptionJob {
  id: string;
  fileId: string;
  filename: string;
  status: TranscriptionStatus;
  progress: TranscriptionProgress;
  settings: TranscriptionSettings;
  result?: TranscriptionResult;
  error?: TranscriptionError;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: number;
}

export interface TranscriptionProgress {
  jobId: string;
  fileId: string;
  status: TranscriptionStatus;
  progress: number;
  currentChunk?: number;
  totalChunks?: number;
  processedDuration: number;
  totalDuration: number;
  timeElapsed: number;
  timeRemaining?: number;
  throughput?: number;
  error?: string;
  stage: ProcessingStage;
}

export interface TranscriptionError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
}

export interface BatchTranscriptionJob {
  id: string;
  fileIds: string[];
  status: BatchTranscriptionStatus;
  progress: BatchTranscriptionProgress;
  config: BatchTranscriptionConfig;
  jobs: TranscriptionJob[];
  results: TranscriptionResult[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface BatchTranscriptionProgress {
  batchId: string;
  status: BatchTranscriptionStatus;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  overallProgress: number;
  timeElapsed: number;
  timeRemaining?: number;
  currentFile?: string;
  errors: TranscriptionError[];
}

export interface BatchTranscriptionConfig {
  outputDirectory: string;
  format: TranscriptionFormat;
  includeTimestamps: boolean;
  includeConfidence: boolean;
  cleanupAfterProcessing: boolean;
  processingConfig: {
    chunkDurationMinutes: number;
    overlapSeconds: number;
    noiseReduction: boolean;
    vadEnabled: boolean;
    maxConcurrentChunks: number;
  };
}

export interface LiveTranscriptionSession {
  id: string;
  status: LiveTranscriptionStatus;
  settings: LiveTranscriptionSettings;
  segments: TranscriptionSegment[];
  currentSegment?: TranscriptionSegment;
  startTime: Date;
  duration: number;
  isActive: boolean;
}

export interface LiveTranscriptionSettings {
  language: string;
  enableInterimResults: boolean;
  enableTimestamps: boolean;
  enableConfidence: boolean;
  minConfidenceThreshold: number;
  silenceThreshold: number;
  maxSegmentLength: number;
}

export interface ExportOptions {
  format: TranscriptionFormat;
  includeTimestamps: boolean;
  includeConfidence: boolean;
  includeSpeakerLabels: boolean;
  includeMetadata: boolean;
  timeFormat: TimeFormat;
  filename?: string;
  destination?: string;
}

// Enums
export enum TranscriptionStatus {
  QUEUED = 'queued',
  UPLOADING = 'uploading',
  PREPROCESSING = 'preprocessing',
  PROCESSING = 'processing',
  POSTPROCESSING = 'postprocessing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum BatchTranscriptionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  PARTIAL_FAILURE = 'partial_failure',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum LiveTranscriptionStatus {
  IDLE = 'idle',
  STARTING = 'starting',
  ACTIVE = 'active',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  ERROR = 'error'
}

export enum ProcessingStage {
  QUEUED = 'queued',
  UPLOADING = 'uploading',
  CHUNKING = 'chunking',
  TRANSCRIBING = 'transcribing',
  MERGING = 'merging',
  FINALIZING = 'finalizing',
  COMPLETED = 'completed'
}

export enum TranscriptionFormat {
  JSON = 'json',
  TXT = 'txt',
  SRT = 'srt',
  VTT = 'vtt',
  CSV = 'csv'
}

export enum TimeFormat {
  SECONDS = 'seconds',
  MILLISECONDS = 'milliseconds',
  TIMECODE = 'timecode',
  SRT = 'srt'
}

// WebSocket event types
export interface TranscriptionWebSocketEvent {
  type: TranscriptionEventType;
  data: any;
  timestamp: Date;
}

export enum TranscriptionEventType {
  PROGRESS_UPDATE = 'progress_update',
  PARTIAL_RESULT = 'partial_result',
  FINAL_RESULT = 'final_result',
  ERROR = 'error',
  STATUS_CHANGE = 'status_change',
  BATCH_UPDATE = 'batch_update'
}

// Search and filtering
export interface TranscriptionSearchQuery {
  text?: string;
  speaker?: string;
  timeRange?: {
    start: number;
    end: number;
  };
  confidenceThreshold?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface TranscriptionFilter {
  status?: TranscriptionStatus[];
  language?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  durationRange?: {
    min: number;
    max: number;
  };
  confidenceRange?: {
    min: number;
    max: number;
  };
}

// Utility types
export type TranscriptionJobWithFile = TranscriptionJob & {
  file: {
    id: string;
    name: string;
    size: number;
    type: string;
    duration?: number;
    uploadedAt: Date;
  };
};

export type PartialTranscriptionResult = Partial<TranscriptionResult> & {
  id: string;
  fileId: string;
};

// API response types
export interface TranscriptionApiResponse {
  success: boolean;
  data?: TranscriptionResult;
  error?: TranscriptionError;
  meta?: {
    processingTime: number;
    modelVersion: string;
  };
}

export interface BatchTranscriptionApiResponse {
  success: boolean;
  data?: BatchTranscriptionJob;
  error?: TranscriptionError;
  meta?: {
    totalFiles: number;
    estimatedTime: number;
  };
}
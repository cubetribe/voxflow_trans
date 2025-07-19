// Audio-related type definitions for VoxFlow

export interface AudioFile {
  id: string;
  name: string;
  size: number;
  type: string;
  duration?: number;
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
  uploadedAt: Date;
  tempPath?: string;
}

export interface AudioChunk {
  id: string;
  fileId: string;
  startTime: number;
  endTime: number;
  duration: number;
  data: ArrayBuffer;
  processed: boolean;
}

export interface AudioProcessingConfig {
  chunkDurationMinutes: number;
  overlapSeconds: number;
  noiseReduction: boolean;
  vadEnabled: boolean;
  maxConcurrentChunks: number;
  format?: AudioFormat;
}

export interface AudioMetadata {
  fileId: string;
  filename: string;
  fileSize: number;
  duration: number;
  sampleRate: number;
  channels: number;
  bitrate?: number;
  format: string;
  quality: AudioQuality;
}

export interface WaveformData {
  peaks: number[];
  duration: number;
  sampleRate: number;
}

export interface AudioVisualization {
  waveform: WaveformData;
  spectrogram?: SpectrogramData;
  volumeLevels: number[];
  timestamp: number;
}

export interface SpectrogramData {
  data: number[][];
  frequencyBins: number[];
  timeStamps: number[];
}

export interface AudioRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  volume: number;
  chunks: Blob[];
  startTime?: Date;
  pausedTime?: Date;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isLoaded: boolean;
  isLoading: boolean;
}

export interface AudioUploadProgress {
  fileId: string;
  filename: string;
  loaded: number;
  total: number;
  percentage: number;
  speed: number;
  timeRemaining: number;
  status: UploadStatus;
  error?: string;
}

export interface BatchUploadConfig {
  outputDirectory: string;
  format: TranscriptionFormat;
  includeTimestamps: boolean;
  includeConfidence: boolean;
  cleanupAfterProcessing: boolean;
  processingConfig: AudioProcessingConfig;
}

// Enums
export enum AudioFormat {
  MP3 = 'mp3',
  WAV = 'wav',
  M4A = 'm4a',
  WEBM = 'webm',
  OGG = 'ogg',
  FLAC = 'flac'
}

export enum AudioQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  LOSSLESS = 'lossless'
}

export enum UploadStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum TranscriptionFormat {
  JSON = 'json',
  TXT = 'txt',
  SRT = 'srt',
  VTT = 'vtt'
}

// Utility types
export type AudioFileWithProgress = AudioFile & {
  uploadProgress?: AudioUploadProgress;
  transcriptionProgress?: TranscriptionProgress;
};

export type SupportedAudioFormats = keyof typeof AudioFormat;

// Re-export from transcription types for convenience
export interface TranscriptionProgress {
  jobId: string;
  fileId: string;
  status: TranscriptionStatus;
  progress: number;
  currentChunk?: number;
  totalChunks?: number;
  timeElapsed: number;
  timeRemaining?: number;
  error?: string;
}

export enum TranscriptionStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}
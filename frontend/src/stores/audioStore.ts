import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AudioFileWithProgress, TranscriptionProgress, BatchUploadConfig } from '@/types/audio.types';

interface AudioState {
  // Files and Upload
  files: AudioFileWithProgress[];
  isUploading: boolean;
  uploadProgress: Record<string, number>;
  
  // Processing
  isProcessing: boolean;
  activeJobs: string[];
  
  // Configuration
  config: BatchUploadConfig;
  
  // Actions
  addFiles: (files: AudioFileWithProgress[]) => void;
  removeFile: (fileId: string) => void;
  updateFile: (fileId: string, updates: Partial<AudioFileWithProgress>) => void;
  updateUploadProgress: (fileId: string, progress: number) => void;
  updateTranscriptionProgress: (fileId: string, progress: TranscriptionProgress) => void;
  
  // Upload Actions
  startUpload: () => void;
  completeUpload: () => void;
  
  // Processing Actions
  startProcessing: (jobIds: string[]) => void;
  stopProcessing: () => void;
  cancelJob: (jobId: string) => void;
  
  // Configuration Actions
  updateConfig: (config: Partial<BatchUploadConfig>) => void;
  
  // Utility Actions
  clearFiles: () => void;
  reset: () => void;
}

const defaultConfig: BatchUploadConfig = {
  outputDirectory: './transcriptions',
  format: 'json' as const,
  includeTimestamps: true,
  includeConfidence: true,
  cleanupAfterProcessing: true,
  processingConfig: {
    chunkDurationMinutes: 10,
    overlapSeconds: 10,
    noiseReduction: true,
    vadEnabled: true,
    maxConcurrentChunks: 3,
  },
};

export const useAudioStore = create<AudioState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        files: [],
        isUploading: false,
        uploadProgress: {},
        isProcessing: false,
        activeJobs: [],
        config: defaultConfig,

        // File Management
        addFiles: (newFiles) =>
          set((state) => ({
            files: [...state.files, ...newFiles],
          }), false, 'addFiles'),

        removeFile: (fileId) =>
          set((state) => ({
            files: state.files.filter((file) => file.id !== fileId),
            uploadProgress: Object.fromEntries(
              Object.entries(state.uploadProgress).filter(([id]) => id !== fileId)
            ),
            activeJobs: state.activeJobs.filter((id) => id !== fileId),
          }), false, 'removeFile'),

        updateFile: (fileId, updates) =>
          set((state) => ({
            files: state.files.map((file) =>
              file.id === fileId ? { ...file, ...updates } : file
            ),
          }), false, 'updateFile'),

        updateUploadProgress: (fileId, progress) =>
          set((state) => ({
            uploadProgress: {
              ...state.uploadProgress,
              [fileId]: progress,
            },
          }), false, 'updateUploadProgress'),

        updateTranscriptionProgress: (fileId, progress) =>
          set((state) => ({
            files: state.files.map((file) =>
              file.id === fileId
                ? { ...file, transcriptionProgress: progress }
                : file
            ),
          }), false, 'updateTranscriptionProgress'),

        // Upload Management
        startUpload: () =>
          set({ isUploading: true }, false, 'startUpload'),

        completeUpload: () =>
          set({ isUploading: false }, false, 'completeUpload'),

        // Processing Management
        startProcessing: (jobIds) =>
          set((state) => ({
            isProcessing: true,
            activeJobs: [...new Set([...state.activeJobs, ...jobIds])],
          }), false, 'startProcessing'),

        stopProcessing: () =>
          set({ isProcessing: false }, false, 'stopProcessing'),

        cancelJob: (jobId) =>
          set((state) => ({
            activeJobs: state.activeJobs.filter((id) => id !== jobId),
            isProcessing: state.activeJobs.length > 1,
          }), false, 'cancelJob'),

        // Configuration Management
        updateConfig: (configUpdates) =>
          set((state) => ({
            config: { ...state.config, ...configUpdates },
          }), false, 'updateConfig'),

        // Utility Actions
        clearFiles: () =>
          set({
            files: [],
            uploadProgress: {},
            activeJobs: [],
            isUploading: false,
            isProcessing: false,
          }, false, 'clearFiles'),

        reset: () =>
          set({
            files: [],
            isUploading: false,
            uploadProgress: {},
            isProcessing: false,
            activeJobs: [],
            config: defaultConfig,
          }, false, 'reset'),
      }),
      {
        name: 'voxflow-audio-storage',
        partialize: (state) => ({
          config: state.config,
          // Don't persist files and upload states
        }),
      }
    ),
    { name: 'AudioStore' }
  )
);

// Selectors for optimized re-renders
export const useAudioFiles = () => useAudioStore((state) => state.files);
export const useUploadProgress = () => useAudioStore((state) => state.uploadProgress);
export const useProcessingState = () => useAudioStore((state) => ({
  isProcessing: state.isProcessing,
  activeJobs: state.activeJobs,
}));
export const useAudioConfig = () => useAudioStore((state) => state.config);
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { useEffect } from 'react';
import type { TranscriptionResult, TranscriptionProgress, BatchTranscriptionJob } from '@/types/transcription.types';
import { getWebSocketService } from '@/services/websocket.service';
import { getApiService } from '@/services/api.service';

export interface TranscriptionState {
  // Real-time transcription
  isLiveTranscribing: boolean;
  liveSessionId: string | null;
  liveTranscript: string;
  partialTranscript: string;
  
  // Job management
  activeJobs: Record<string, TranscriptionProgress>;
  completedJobs: Record<string, TranscriptionResult>;
  batchJobs: Record<string, BatchTranscriptionJob>;
  
  // UI state
  selectedJobId: string | null;
  isConnectedToWebSocket: boolean;
  connectionError: string | null;
  
  // Settings
  autoSave: boolean;
  realTimeEnabled: boolean;
  
  // Actions
  startLiveTranscription: () => Promise<void>;
  stopLiveTranscription: () => Promise<void>;
  updateLiveTranscript: (transcript: string, isFinal?: boolean) => void;
  
  // Job actions
  addJob: (job: TranscriptionProgress) => void;
  updateJob: (jobId: string, updates: Partial<TranscriptionProgress>) => void;
  completeJob: (jobId: string, result: TranscriptionResult) => void;
  cancelJob: (jobId: string) => Promise<void>;
  removeJob: (jobId: string) => void;
  
  // Batch actions
  addBatchJob: (batchJob: BatchTranscriptionJob) => void;
  updateBatchJob: (batchId: string, updates: Partial<BatchTranscriptionJob>) => void;
  removeBatchJob: (batchId: string) => void;
  
  // WebSocket actions
  connectWebSocket: () => Promise<void>;
  disconnectWebSocket: () => void;
  subscribeToJob: (jobId: string) => void;
  unsubscribeFromJob: (jobId: string) => void;
  subscribeToUpdate: (batchId: string) => void;
  unsubscribeFromBatch: (batchId: string) => void;
  
  // UI actions
  selectJob: (jobId: string | null) => void;
  toggleRealTime: () => void;
  toggleAutoSave: () => void;
  
  // Utility actions
  clearCompleted: () => void;
  reset: () => void;
}

const initialState = {
  isLiveTranscribing: false,
  liveSessionId: null,
  liveTranscript: '',
  partialTranscript: '',
  activeJobs: {},
  completedJobs: {},
  batchJobs: {},
  selectedJobId: null,
  isConnectedToWebSocket: false,
  connectionError: null,
  autoSave: true,
  realTimeEnabled: false,
};

export const useTranscriptionStore = create<TranscriptionState>()(
  devtools((set, get) => ({
      ...initialState,

      // Live transcription
      startLiveTranscription: async () => {
        const wsService = getWebSocketService();
        const apiService = getApiService();
        
        try {
          if (!get().isConnectedToWebSocket) {
            await get().connectWebSocket();
          }
          
          // Start live session with backend
          const response = await apiService.startLiveSession({
            enableRealTime: true,
            language: 'auto',
          });
          
          if (response.success && response.data) {
            const sessionId = (response.data as { sessionId: string }).sessionId;
            
            set({
              isLiveTranscribing: true,
              liveSessionId: sessionId,
              liveTranscript: '',
              partialTranscript: '',
              connectionError: null,
            });
            
            // Start WebSocket streaming
            await wsService.startLiveStreaming({
              sessionId,
              sampleRate: 44100,
              channels: 1,
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to start live transcription';
          set({ connectionError: errorMessage });
          throw error;
        }
      },

      stopLiveTranscription: async () => {
        const wsService = getWebSocketService();
        const apiService = getApiService();
        const { liveSessionId } = get();
        
        try {
          if (liveSessionId) {
            await wsService.stopLiveStreaming();
            await apiService.stopLiveSession(liveSessionId);
          }
          
          set({
            isLiveTranscribing: false,
            liveSessionId: null,
            partialTranscript: '',
          });
        } catch (error) {
          console.error('Error stopping live transcription:', error);
          // Still reset state even if API call fails
          set({
            isLiveTranscribing: false,
            liveSessionId: null,
            partialTranscript: '',
          });
        }
      },

      updateLiveTranscript: (transcript: string, isFinal = false) => {
        if (isFinal) {
          set((state) => ({
            liveTranscript: state.liveTranscript + transcript + ' ',
            partialTranscript: '',
          }));
        } else {
          set({ partialTranscript: transcript });
        }
      },

      // Job management
      addJob: (job: TranscriptionProgress) => {
        set((state: TranscriptionState) => ({
          activeJobs: {
            ...state.activeJobs,
            [job.jobId]: job,
          },
        }));
      },

      updateJob: (jobId: string, updates: Partial<TranscriptionProgress>) => {
        set((state: TranscriptionState) => ({
          activeJobs: {
            ...state.activeJobs,
            [jobId]: {
              ...state.activeJobs[jobId],
              ...updates,
            },
          },
        }));
      },

      completeJob: (jobId: string, result: TranscriptionResult) => {
        set((state: TranscriptionState) => {
          const { [jobId]: completedJob, ...remainingJobs } = state.activeJobs;
          return {
            activeJobs: remainingJobs,
            completedJobs: {
              ...state.completedJobs,
              [jobId]: result,
            },
          };
        });
      },

      cancelJob: async (jobId: string) => {
        const apiService = getApiService();
        
        try {
          await apiService.cancelJob(jobId);
          
          set((state: TranscriptionState) => {
            const { [jobId]: cancelledJob, ...remainingJobs } = state.activeJobs;
            return { activeJobs: remainingJobs };
          });
        } catch (error) {
          console.error('Failed to cancel job:', error);
          throw error;
        }
      },

      removeJob: (jobId: string) => {
        set((state: TranscriptionState) => {
          const { [jobId]: removedActive, ...remainingActive } = state.activeJobs;
          const { [jobId]: removedCompleted, ...remainingCompleted } = state.completedJobs;
          
          return {
            activeJobs: remainingActive,
            completedJobs: remainingCompleted,
            selectedJobId: state.selectedJobId === jobId ? null : state.selectedJobId,
          };
        });
      },

      // Batch job management
      addBatchJob: (batchJob: BatchTranscriptionJob) => {
        set((state: TranscriptionState) => ({
          batchJobs: {
            ...state.batchJobs,
            [batchJob.id]: batchJob,
          },
        }));
      },

      updateBatchJob: (batchId: string, updates: Partial<BatchTranscriptionJob>) => {
        set((state: TranscriptionState) => ({
          batchJobs: {
            ...state.batchJobs,
            [batchId]: {
              ...state.batchJobs[batchId],
              ...updates,
            },
          },
        }));
      },

      removeBatchJob: (batchId: string) => {
        set((state: TranscriptionState) => {
          const { [batchId]: removed, ...remaining } = state.batchJobs;
          return { batchJobs: remaining };
        });
      },

      // WebSocket management
      connectWebSocket: async () => {
        const wsService = getWebSocketService();
        
        try {
          await wsService.connect();
          
          // Setup event listeners after connection
          wsService.on('connection', (state: string) => {
            if (state === 'connected') {
              set({ isConnectedToWebSocket: true, connectionError: null });
            } else {
              set({ isConnectedToWebSocket: false });
            }
          });
          
          wsService.on('transcription:progress', (progress: TranscriptionProgress) => {
            get().updateJob(progress.jobId, progress);
          });
          
          wsService.on('transcription:partial', (data: any) => {
            if (data.text && get().isLiveTranscribing) {
              get().updateLiveTranscript(data.text, false);
            }
          });
          
          wsService.on('transcription:final', (result: any) => {
            if (result.jobId) {
              get().completeJob(result.jobId, result);
            }
            
            if (result.text && get().isLiveTranscribing) {
              get().updateLiveTranscript(result.text, true);
            }
          });
          
          wsService.on('job:status', (data: any) => {
            get().updateJob(data.jobId, { status: data.status });
          });
          
          set({ isConnectedToWebSocket: true, connectionError: null });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to connect to WebSocket';
          set({ connectionError: errorMessage });
          throw error;
        }
      },

      disconnectWebSocket: () => {
        const wsService = getWebSocketService();
        wsService.disconnect();
        set({ isConnectedToWebSocket: false });
      },

      subscribeToJob: (jobId: string) => {
        const wsService = getWebSocketService();
        if (wsService.isConnected()) {
          wsService.subscribeToJob(jobId);
        }
      },

      unsubscribeFromJob: (jobId: string) => {
        const wsService = getWebSocketService();
        if (wsService.isConnected()) {
          wsService.unsubscribeFromJob(jobId);
        }
      },

      subscribeToUpdate: (batchId: string) => {
        const wsService = getWebSocketService();
        if (wsService.isConnected()) {
          wsService.subscribeToBatch(batchId);
        }
      },

      unsubscribeFromBatch: (batchId: string) => {
        const wsService = getWebSocketService();
        if (wsService.isConnected()) {
          wsService.unsubscribeFromBatch(batchId);
        }
      },

      // UI actions
      selectJob: (jobId: string | null) => {
        set({ selectedJobId: jobId });
      },

      toggleRealTime: () => {
        set((state: TranscriptionState) => ({ realTimeEnabled: !state.realTimeEnabled }));
      },

      toggleAutoSave: () => {
        set((state: TranscriptionState) => ({ autoSave: !state.autoSave }));
      },

      // Utility actions
      clearCompleted: () => {
        set({ completedJobs: {} });
      },

      reset: () => {
        const wsService = getWebSocketService();
        wsService.disconnect();
        set(initialState);
      },
  }),
  { name: 'TranscriptionStore' }
));

// Selectors for optimized re-renders
export const useLiveTranscription = () => 
  useTranscriptionStore((state) => ({
    isLiveTranscribing: state.isLiveTranscribing,
    liveTranscript: state.liveTranscript,
    partialTranscript: state.partialTranscript,
    sessionId: state.liveSessionId,
  }));

export const useActiveJobs = () => 
  useTranscriptionStore((state) => state.activeJobs);

export const useCompletedJobs = () => 
  useTranscriptionStore((state) => state.completedJobs);

export const useBatchJobs = () => 
  useTranscriptionStore((state) => state.batchJobs);

export const useWebSocketStatus = () => 
  useTranscriptionStore((state) => ({
    isConnected: state.isConnectedToWebSocket,
    error: state.connectionError,
  }));

export const useTranscriptionSettings = () => 
  useTranscriptionStore((state) => ({
    autoSave: state.autoSave,
    realTimeEnabled: state.realTimeEnabled,
  }));

// Effect hook for auto-connecting WebSocket
export const useAutoConnectWebSocket = () => {
  const { connectWebSocket, isConnectedToWebSocket } = useTranscriptionStore();
  
  useEffect(() => {
    if (!isConnectedToWebSocket) {
      connectWebSocket().catch(console.error);
    }
  }, [connectWebSocket, isConnectedToWebSocket]);
};

// Hook for managing job subscriptions
export const useJobSubscription = (jobId: string | null) => {
  const { subscribeToJob, unsubscribeFromJob, isConnectedToWebSocket } = useTranscriptionStore();
  
  useEffect(() => {
    if (jobId && isConnectedToWebSocket) {
      subscribeToJob(jobId);
      return () => unsubscribeFromJob(jobId);
    }
  }, [jobId, isConnectedToWebSocket, subscribeToJob, unsubscribeFromJob]);
};

export default useTranscriptionStore;
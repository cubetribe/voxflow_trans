import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Pause, Play, Square, Trash2, Save } from 'lucide-react';
import type { AudioVisualization } from '@/types/audio.types';
import { getWebSocketService } from '@/services/websocket.service';
import { getApiService } from '@/services/api.service';
import WaveformDisplay from './WaveformDisplay';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { formatDuration } from '@/utils/format.utils';

export interface AudioRecorderProps {
  onRecordingComplete?: (audioBlob: Blob, duration: number) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onError?: (error: string) => void;
  enableRealTimeTranscription?: boolean;
  className?: string;
  autoSave?: boolean;
  maxDuration?: number; // in seconds
  visualizationEnabled?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onRecordingStart,
  onError,
  enableRealTimeTranscription = false,
  className = '',
  autoSave = false,
  maxDuration = 3600, // 1 hour default
  visualizationEnabled = true,
}) => {
  const {
    isRecording,
    isPaused,
    duration,
    volume,
    chunks,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    clearRecording,
    isSupported,
    error: recorderError,
  } = useAudioRecorder({
    onStart: onRecordingStart,
    onStop: (blob, recordingDuration) => {
      onRecordingComplete?.(blob, recordingDuration);
      if (autoSave) {
        handleSaveRecording(blob);
      }
    },
    onError,
    enableRealTimeStreaming: enableRealTimeTranscription,
    maxDuration,
  });

  const [visualization] = useState<AudioVisualization | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedRecordings, setSavedRecordings] = useState<Array<{ blob: Blob; duration: number; timestamp: Date }>>([]);
  const wsService = getWebSocketService();
  const apiService = getApiService();

  const handleStartRecording = useCallback(async () => {
    try {
      if (enableRealTimeTranscription) {
        await wsService.connect();
      }
      await startRecording();
    } catch (error) {
      onError?.(`Failed to start recording: ${error}`);
    }
  }, [startRecording, enableRealTimeTranscription, wsService, onError]);

  const handleStopRecording = useCallback(async () => {
    try {
      const result = await stopRecording();
      if (enableRealTimeTranscription) {
        // Signal end of stream to WebSocket
        try {
          wsService.stopAudioStream(wsService.getConnectionState());
        } catch (error) {
          console.warn('Failed to stop WebSocket stream:', error);
        }
      }
      return result;
    } catch (error) {
      onError?.(`Failed to stop recording: ${error}`);
    }
  }, [stopRecording, enableRealTimeTranscription, wsService, onError]);

  const handleSaveRecording = useCallback(async (blob: Blob) => {
    if (!blob || blob.size === 0) {
      onError?.('No audio data to save');
      return;
    }

    setIsSaving(true);
    try {
      const file = new File([blob], `recording-${Date.now()}.webm`, {
        type: 'audio/webm',
      });

      const response = await apiService.uploadFile(file, (progress) => {
        // Upload progress could be shown here
        console.log(`Upload progress: ${progress}%`);
      });

      if (response.success && response.data) {
        setSavedRecordings(prev => [
          ...prev,
          { blob, duration, timestamp: new Date() }
        ]);
        console.log('Recording saved successfully:', response.data);
      } else {
        throw new Error(response.error || 'Failed to save recording');
      }
    } catch (error) {
      console.error('Error saving recording:', error);
      onError?.(`Failed to save recording: ${error}`);
    } finally {
      setIsSaving(false);
    }
  }, [apiService, duration, onError]);

  const getRecordButtonColor = () => {
    if (isRecording && !isPaused) return 'bg-red-500 hover:bg-red-600';
    if (isPaused) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-blue-500 hover:bg-blue-600';
  };

  const getRecordButtonIcon = () => {
    if (isRecording && !isPaused) return <Square className="w-6 h-6" />;
    if (isPaused) return <Play className="w-6 h-6" />;
    return <Mic className="w-6 h-6" />;
  };

  const getStatusText = () => {
    if (!isSupported) return 'Audio recording not supported';
    if (recorderError) return `Error: ${recorderError}`;
    if (isRecording && !isPaused) return 'Recording...';
    if (isPaused) return 'Paused';
    if (chunks.length > 0) return 'Recording ready';
    return 'Ready to record';
  };

  const formatRemainingTime = () => {
    const remaining = maxDuration - duration;
    if (remaining <= 0) return '00:00';
    return formatDuration(remaining);
  };

  if (!isSupported) {
    return (
      <div className={`p-6 border-2 border-dashed border-gray-300 rounded-lg text-center ${className}`}>
        <MicOff className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">Audio recording is not supported in this browser.</p>
        <p className="text-sm text-gray-400 mt-2">
          Please use a modern browser with microphone support.
        </p>
      </div>
    );
  }

  return (
    <div className={`audio-recorder ${className}`}>
      {/* Main Recording Interface */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        {/* Status Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              isRecording && !isPaused ? 'bg-red-500 animate-pulse' : 
              isPaused ? 'bg-yellow-500' : 'bg-gray-400'
            }`} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {getStatusText()}
            </span>
          </div>
          
          {enableRealTimeTranscription && (
            <div className="flex items-center space-x-2 text-xs text-blue-600 dark:text-blue-400">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span>Live Transcription</span>
            </div>
          )}
        </div>

        {/* Waveform Visualization */}
        {visualizationEnabled && (
          <div className="mb-6">
            <WaveformDisplay
              isRecording={isRecording && !isPaused}
              volume={volume}
              visualization={visualization}
              height={80}
              className="rounded-lg bg-gray-50 dark:bg-gray-900"
            />
          </div>
        )}

        {/* Time Display */}
        <div className="mb-6 text-center">
          <div className="text-3xl font-mono font-bold text-gray-900 dark:text-white mb-2">
            {formatDuration(duration)}
          </div>
          {maxDuration && (
            <div className="text-sm text-gray-500">
              Remaining: {formatRemainingTime()}
            </div>
          )}
          
          {/* Progress Bar */}
          {maxDuration && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((duration / maxDuration) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center space-x-4">
          {/* Main Record/Stop Button */}
          <motion.button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`w-16 h-16 rounded-full text-white transition-all duration-200 shadow-lg ${
              getRecordButtonColor()
            } ${!isSupported || recorderError ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!isSupported || !!recorderError || duration >= maxDuration}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isRecording ? (isPaused ? 'paused' : 'recording') : 'stopped'}
                initial={{ opacity: 0, rotate: -180 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 180 }}
                transition={{ duration: 0.2 }}
              >
                {getRecordButtonIcon()}
              </motion.div>
            </AnimatePresence>
          </motion.button>

          {/* Pause/Resume Button */}
          {isRecording && (
            <motion.button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="w-12 h-12 rounded-full bg-gray-500 hover:bg-gray-600 text-white transition-all duration-200 shadow-md"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </motion.button>
          )}

          {/* Clear Button */}
          {(chunks.length > 0 && !isRecording) && (
            <motion.button
              onClick={clearRecording}
              className="w-12 h-12 rounded-full bg-gray-400 hover:bg-gray-500 text-white transition-all duration-200 shadow-md"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Clear recording"
            >
              <Trash2 className="w-5 h-5" />
            </motion.button>
          )}

          {/* Save Button */}
          {(chunks.length > 0 && !isRecording && !autoSave) && (
            <motion.button
              onClick={() => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                handleSaveRecording(blob);
              }}
              className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 text-white transition-all duration-200 shadow-md"
              disabled={isSaving}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Save recording"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
            </motion.button>
          )}
        </div>

        {/* Volume Level Indicator */}
        {isRecording && !isPaused && (
          <div className="mt-4">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xs text-gray-500">Volume:</span>
              <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-100"
                  style={{ width: `${Math.min(volume * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-8">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {recorderError && (
          <motion.div
            className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm text-red-700 dark:text-red-400">
              {recorderError}
            </p>
          </motion.div>
        )}

        {/* Real-time Transcription Preview */}
        {enableRealTimeTranscription && isRecording && (
          <motion.div
            className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Live Transcription
              </span>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 min-h-[2rem] italic">
              Transcription will appear here as you speak...
            </div>
          </motion.div>
        )}
      </div>

      {/* Saved Recordings List */}
      {savedRecordings.length > 0 && (
        <motion.div
          className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Recent Recordings
          </h3>
          <div className="space-y-2">
            {savedRecordings.slice(-3).map((recording, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <Mic className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDuration(recording.duration)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {recording.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {Math.round(recording.blob.size / 1024)} KB
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AudioRecorder;
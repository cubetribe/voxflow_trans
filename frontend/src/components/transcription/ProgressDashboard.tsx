import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Square, 
  Download, 
  Eye, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  FileText,
  Zap,
  BarChart3
} from 'lucide-react';
import { useAudioStore } from '@/stores/audioStore';
import { useToast } from '@/components/common/ToastProvider';
import { TranscriptionStatus } from '@/types/transcription.types';
import { formatDuration, formatFileSize, formatPercentage, formatTimeRemaining } from '@/utils/format.utils';

export function ProgressDashboard() {
  const { files, config, startProcessing, stopProcessing, cancelJob, removeFile } = useAudioStore();
  const { addToast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const pendingFiles = files.filter(f => !f.transcriptionProgress || f.transcriptionProgress.status === 'queued');
  const processingFiles = files.filter(f => f.transcriptionProgress?.status === 'processing');
  const completedFiles = files.filter(f => f.transcriptionProgress?.status === 'completed');
  const failedFiles = files.filter(f => f.transcriptionProgress?.status === 'failed');

  const handleStartTranscription = async () => {
    const filesToProcess = selectedFiles.length > 0 
      ? files.filter(f => selectedFiles.includes(f.id))
      : pendingFiles;

    if (filesToProcess.length === 0) {
      addToast({
        type: 'warning',
        message: 'No files selected for transcription'
      });
      return;
    }

    try {
      // This would typically make an API call to start transcription
      const jobIds = filesToProcess.map(f => `job_${f.id}_${Date.now()}`);
      startProcessing(jobIds);
      
      addToast({
        type: 'success',
        message: `Started transcription for ${filesToProcess.length} file${filesToProcess.length > 1 ? 's' : ''}`
      });
      
      setSelectedFiles([]);
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to start transcription'
      });
    }
  };

  const handleCancelJob = async (fileId: string) => {
    try {
      cancelJob(fileId);
      addToast({
        type: 'info',
        message: 'Transcription cancelled'
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to cancel transcription'
      });
    }
  };

  const getStatusIcon = (status?: TranscriptionStatus) => {
    switch (status) {
      case 'processing':
        return <Zap className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'queued':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status?: TranscriptionStatus) => {
    switch (status) {
      case 'processing':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
      case 'completed':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'failed':
        return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      case 'queued':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (files.length === 0) {
    return (
      <motion.div
        className="text-center py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No files uploaded yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Upload some audio files to get started with transcription
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {pendingFiles.length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Processing</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {processingFiles.length}
              </p>
            </div>
            <Zap className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {completedFiles.length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {failedFiles.length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </motion.div>

      {/* Controls */}
      {pendingFiles.length > 0 && (
        <motion.div
          className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <button
            onClick={handleStartTranscription}
            disabled={processingFiles.length > 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            Start Transcription
            {selectedFiles.length > 0 && (
              <span className="ml-1">({selectedFiles.length})</span>
            )}
          </button>

          {processingFiles.length > 0 && (
            <button
              onClick={stopProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop All
            </button>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="selectAll"
              checked={selectedFiles.length === pendingFiles.length && pendingFiles.length > 0}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedFiles(pendingFiles.map(f => f.id));
                } else {
                  setSelectedFiles([]);
                }
              }}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="selectAll" className="text-sm text-gray-600 dark:text-gray-400">
              Select all pending files
            </label>
          </div>
        </motion.div>
      )}

      {/* File List */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <AnimatePresence mode="popLayout">
          {files.map((file) => (
            <motion.div
              key={file.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              layout
            >
              <div className="flex items-center gap-4">
                {/* Selection Checkbox */}
                {(!file.transcriptionProgress || file.transcriptionProgress.status === 'queued') && (
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFiles([...selectedFiles, file.id]);
                      } else {
                        setSelectedFiles(selectedFiles.filter(id => id !== file.id));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                )}

                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {getStatusIcon(file.transcriptionProgress?.status)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </h4>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(file.transcriptionProgress?.status)}`}>
                      {file.transcriptionProgress?.status || 'pending'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span>{formatFileSize(file.size)}</span>
                    {file.duration && <span>{formatDuration(file.duration)}</span>}
                    {file.transcriptionProgress?.timeElapsed && (
                      <span>Elapsed: {formatTimeRemaining(file.transcriptionProgress.timeElapsed)}</span>
                    )}
                    {file.transcriptionProgress?.timeRemaining && (
                      <span>Remaining: {formatTimeRemaining(file.transcriptionProgress.timeRemaining)}</span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {file.transcriptionProgress && file.transcriptionProgress.progress > 0 && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                      <motion.div
                        className="bg-blue-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${file.transcriptionProgress.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}

                  {/* Progress Details */}
                  {file.transcriptionProgress && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        {formatPercentage(file.transcriptionProgress.progress)}
                        {file.transcriptionProgress.currentChunk && file.transcriptionProgress.totalChunks && (
                          <span className="ml-2">
                            (Chunk {file.transcriptionProgress.currentChunk}/{file.transcriptionProgress.totalChunks})
                          </span>
                        )}
                      </span>
                      {(file.transcriptionProgress as any).stage && (
                        <span className="text-gray-600 dark:text-gray-400">
                          {(file.transcriptionProgress as any).stage}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {file.transcriptionProgress?.status === 'processing' && (
                    <button
                      onClick={() => handleCancelJob(file.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Cancel transcription"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  )}

                  {file.transcriptionProgress?.status === 'completed' && (
                    <>
                      <button
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="View transcription"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Download transcription"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => {
                      removeFile(file.id);
                      setSelectedFiles(selectedFiles.filter(id => id !== file.id));
                      addToast({
                        type: 'info',
                        message: `Removed ${file.name}`
                      });
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {file.transcriptionProgress?.error && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        Transcription Failed
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {file.transcriptionProgress.error}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Overall Progress */}
      {processingFiles.length > 0 && (
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Overall Progress
            </h4>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Processing {processingFiles.length} file{processingFiles.length > 1 ? 's' : ''}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {completedFiles.length} / {files.length} completed
              </span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ 
                  width: `${(completedFiles.length / files.length) * 100}%` 
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
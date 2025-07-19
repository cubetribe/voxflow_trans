import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Mic, FileAudio, Settings } from 'lucide-react';
import { MultiFileUpload } from '@/components/audio/MultiFileUpload';
import { TranscriptionConfig } from '@/components/transcription/TranscriptionConfig';
import { ProgressDashboard } from '@/components/transcription/ProgressDashboard';
import { LiveRecording } from '@/components/audio/LiveRecording';
import { useAudioStore } from '@/stores/audioStore';
import { AudioFileWithProgress } from '@/types/audio.types';

type ViewMode = 'upload' | 'live' | 'progress';

export function HomePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [showConfig, setShowConfig] = useState(false);
  const { files, isProcessing } = useAudioStore();

  const hasFiles = files.length > 0;
  const hasActiveJobs = files.some(file => 
    file.transcriptionProgress?.status === 'processing' || 
    file.transcriptionProgress?.status === 'queued'
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero Section */}
      <motion.div
        className="text-center space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Voice Transcription
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Transform your audio files into accurate text with AI-powered transcription.
          Support for large files, batch processing, and real-time streaming.
        </p>
      </motion.div>

      {/* Mode Selector */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setViewMode('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              viewMode === 'upload'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>File Upload</span>
          </button>
          
          <button
            onClick={() => setViewMode('live')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              viewMode === 'live'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Live Recording</span>
          </button>
          
          {(hasFiles || hasActiveJobs) && (
            <button
              onClick={() => setViewMode('progress')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                viewMode === 'progress'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <FileAudio className="w-4 h-4" />
              <span>Progress ({files.length})</span>
              {hasActiveJobs && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              )}
            </button>
          )}
        </div>
      </motion.div>

      {/* Configuration Toggle */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>{showConfig ? 'Hide' : 'Show'} Configuration</span>
        </button>
      </motion.div>

      {/* Configuration Panel */}
      {showConfig && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <TranscriptionConfig />
        </motion.div>
      )}

      {/* Main Content */}
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        {viewMode === 'upload' && (
          <div className="space-y-6">
            <MultiFileUpload />
            {hasFiles && (
              <div className="text-center">
                <button
                  onClick={() => setViewMode('progress')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  <FileAudio className="w-4 h-4" />
                  View Progress & Start Transcription
                </button>
              </div>
            )}
          </div>
        )}

        {viewMode === 'live' && <LiveRecording />}

        {viewMode === 'progress' && <ProgressDashboard />}
      </motion.div>

      {/* Quick Stats */}
      {(hasFiles || isProcessing) && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Files</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {files.length}
                </p>
              </div>
              <FileAudio className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Processing</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {files.filter(f => f.transcriptionProgress?.status === 'processing').length}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {files.filter(f => f.transcriptionProgress?.status === 'completed').length}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <div className="w-4 h-4 bg-green-500 rounded-full" />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
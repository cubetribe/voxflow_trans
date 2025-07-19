import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Mic, 
  FileAudio, 
  Settings, 
  Sparkles,
  Play,
  Pause,
  Download,
  FolderOpen,
  Zap
} from 'lucide-react';
import { EnhancedDropZone } from '@/components/ui/EnhancedDropZone';
import { FileBrowser } from '@/components/ui/FileBrowser';
import { TranscriptionConfig } from '@/components/transcription/TranscriptionConfig';
import { LiveProgressTracker } from '@/components/ui/LiveProgressTracker';
import { LiveRecording } from '@/components/audio/LiveRecording';
import { useAudioStore } from '@/stores/audioStore';
import { AudioFileWithProgress } from '@/types/audio.types';

type ViewMode = 'upload' | 'live' | 'progress' | 'config';

interface FileWithPreview extends File {
  id: string;
  preview?: string;
  duration?: number;
}

export function HomePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [showConfig, setShowConfig] = useState(false);
  const [outputDirectory, setOutputDirectory] = useState('/Users/Desktop/VoxFlow Output');
  const [uploadedFiles, setUploadedFiles] = useState<FileWithPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { files } = useAudioStore();

  const hasFiles = uploadedFiles.length > 0 || files.length > 0;
  const hasActiveJobs = files.some(file => 
    file.transcriptionProgress?.status === 'processing' || 
    file.transcriptionProgress?.status === 'queued'
  );

  const handleFilesAdded = (newFiles: FileWithPreview[]) => {
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const startTranscription = async () => {
    if (uploadedFiles.length === 0) return;
    
    setIsProcessing(true);
    // TODO: Implement actual transcription API call
    console.log('Starting transcription for files:', uploadedFiles);
    console.log('Output directory:', outputDirectory);
    
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      setViewMode('progress');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <motion.div
          className="text-center space-y-6 py-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
              <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
            VoxFlow
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Transform your audio into text with
            <span className="font-semibold text-blue-600 dark:text-blue-400"> AI-powered transcription</span>
          </p>
          
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Voxtral AI Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>Apple Silicon Optimized</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span>500MB+ Files Supported</span>
            </div>
          </div>
        </motion.div>

        {/* Mode Selector */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="glass dark:glass-dark rounded-2xl p-2 shadow-xl border border-white/20 dark:border-gray-700/50">
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => setViewMode('upload')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  viewMode === 'upload'
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
                whileHover={{ scale: viewMode === 'upload' ? 1.05 : 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Upload className="w-5 h-5" />
                <span>Upload Files</span>
              </motion.button>
              
              <motion.button
                onClick={() => setViewMode('live')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  viewMode === 'live'
                    ? 'bg-red-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
                whileHover={{ scale: viewMode === 'live' ? 1.05 : 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Mic className="w-5 h-5" />
                <span>Live Recording</span>
              </motion.button>
              
              {(hasFiles || hasActiveJobs) && (
                <motion.button
                  onClick={() => setViewMode('progress')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                    viewMode === 'progress'
                      ? 'bg-green-600 text-white shadow-lg scale-105'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
                  }`}
                  whileHover={{ scale: viewMode === 'progress' ? 1.05 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FileAudio className="w-5 h-5" />
                  <span>Progress ({uploadedFiles.length + files.length})</span>
                  {hasActiveJobs && (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  )}
                </motion.button>
              )}
              
              <motion.button
                onClick={() => setViewMode('config')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  viewMode === 'config'
                    ? 'bg-purple-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
                whileHover={{ scale: viewMode === 'config' ? 1.05 : 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </motion.button>
            </div>
          </div>
        </motion.div>


        {/* Main Content */}
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <AnimatePresence mode="wait">
            {viewMode === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* File Upload Section */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="glass dark:glass-dark rounded-3xl p-8 shadow-xl border border-white/20 dark:border-gray-700/50">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                        <Upload className="w-6 h-6 text-blue-600" />
                        Upload Audio Files
                      </h2>
                      <EnhancedDropZone onFilesAdded={handleFilesAdded} />
                    </div>
                  </div>
                  
                  {/* Configuration Sidebar */}
                  <div className="space-y-6">
                    {/* Output Directory */}
                    <div className="glass dark:glass-dark rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-700/50">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-purple-600" />
                        Output Directory
                      </h3>
                      <FileBrowser 
                        value={outputDirectory}
                        onChange={setOutputDirectory}
                        placeholder="Choose where to save transcriptions..."
                      />
                    </div>
                    
                    {/* Quick Stats */}
                    {uploadedFiles.length > 0 && (
                      <div className="glass dark:glass-dark rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-700/50">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ready to Process</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Files</span>
                            <span className="font-medium text-gray-900 dark:text-white">{uploadedFiles.length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Total Size</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {(uploadedFiles.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(1)} MB
                            </span>
                          </div>
                          
                          <motion.button
                            onClick={startTranscription}
                            disabled={isProcessing || uploadedFiles.length === 0}
                            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl transition-all shadow-lg"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {isProcessing ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Starting...</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" />
                                <span>Start Transcription</span>
                              </>
                            )}
                          </motion.button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {viewMode === 'live' && (
              <motion.div
                key="live"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass dark:glass-dark rounded-3xl p-8 shadow-xl border border-white/20 dark:border-gray-700/50"
              >
                <LiveRecording />
              </motion.div>
            )}

            {viewMode === 'progress' && (
              <motion.div
                key="progress"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass dark:glass-dark rounded-3xl p-8 shadow-xl border border-white/20 dark:border-gray-700/50"
              >
                <LiveProgressTracker 
                  jobs={files.map(file => ({
                    jobId: file.id,
                    fileName: file.name,
                    status: file.transcriptionProgress?.status || 'queued',
                    progress: file.transcriptionProgress?.progress || 0,
                    currentChunk: file.transcriptionProgress?.currentChunk,
                    totalChunks: file.transcriptionProgress?.totalChunks,
                    estimatedTimeRemaining: file.transcriptionProgress?.timeRemaining,
                    processingSpeed: 1.2,
                    currentText: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
                    confidence: 0.94
                  }))}
                  onJobCancel={(jobId) => console.log('Cancel job:', jobId)}
                  onDownload={(jobId) => console.log('Download:', jobId)}
                />
              </motion.div>
            )}
            
            {viewMode === 'config' && (
              <motion.div
                key="config"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass dark:glass-dark rounded-3xl p-8 shadow-xl border border-white/20 dark:border-gray-700/50"
              >
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                  <Settings className="w-6 h-6 text-purple-600" />
                  Configuration
                </h2>
                <TranscriptionConfig />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      </div>
    </div>
  );
}
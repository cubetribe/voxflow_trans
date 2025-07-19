import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Square, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Activity,
  Download,
  FileText,
  Zap
} from 'lucide-react';

interface ProgressData {
  jobId: string;
  fileName: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentChunk?: number;
  totalChunks?: number;
  estimatedTimeRemaining?: number;
  processingSpeed?: number; // Real-time factor
  currentText?: string;
  confidence?: number;
}

interface LiveProgressTrackerProps {
  jobs: ProgressData[];
  onJobCancel?: (jobId: string) => void;
  onDownload?: (jobId: string) => void;
  className?: string;
}

export function LiveProgressTracker({ 
  jobs, 
  onJobCancel, 
  onDownload,
  className = "" 
}: LiveProgressTrackerProps) {
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  const getStatusColor = (status: ProgressData['status']) => {
    switch (status) {
      case 'queued': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'processing': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'failed': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'cancelled': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const getStatusIcon = (status: ProgressData['status']) => {
    switch (status) {
      case 'queued': return Clock;
      case 'processing': return Activity;
      case 'completed': return CheckCircle;
      case 'failed': return AlertCircle;
      case 'cancelled': return Square;
      default: return Clock;
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatSpeed = (rtf: number) => {
    if (rtf > 1) return `${rtf.toFixed(1)}x faster than real-time`;
    return `${(1/rtf).toFixed(1)}x slower than real-time`;
  };

  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  if (jobs.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400">No active transcription jobs</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Live Progress ({jobs.length})
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span>Real-time updates</span>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {jobs.map((job) => {
            const StatusIcon = getStatusIcon(job.status);
            const isExpanded = expandedJobs.has(job.jobId);
            
            return (
              <motion.div
                key={job.jobId}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="glass-card dark:glass-card-dark rounded-2xl overflow-hidden shadow-lg"
              >
                {/* Job Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => toggleJobExpansion(job.jobId)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${getStatusColor(job.status)}`}>
                      <StatusIcon className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {job.fileName}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {job.status}
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="relative">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <motion.div
                            className={`h-2 rounded-full ${
                              job.status === 'completed' 
                                ? 'bg-green-500' 
                                : job.status === 'failed'
                                ? 'bg-red-500'
                                : 'bg-blue-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${job.progress}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>{job.progress.toFixed(1)}%</span>
                          {job.totalChunks && (
                            <span>{job.currentChunk || 0}/{job.totalChunks} chunks</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {job.status === 'processing' && onJobCancel && (
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            onJobCancel(job.jobId);
                          }}
                          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Square className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </motion.button>
                      )}
                      
                      {job.status === 'completed' && onDownload && (
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownload(job.jobId);
                          }}
                          className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Download className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-gray-200/50 dark:border-gray-700/50"
                    >
                      <div className="p-4 space-y-4">
                        {/* Performance Metrics */}
                        {(job.estimatedTimeRemaining !== undefined || job.processingSpeed !== undefined) && (
                          <div className="grid grid-cols-2 gap-4">
                            {job.estimatedTimeRemaining !== undefined && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">ETA</p>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {formatTime(job.estimatedTimeRemaining)}
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {job.processingSpeed !== undefined && (
                              <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Speed</p>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {formatSpeed(job.processingSpeed)}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Current Text Preview */}
                        {job.currentText && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                Current Transcription
                              </h4>
                              {job.confidence !== undefined && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {(job.confidence * 100).toFixed(1)}% confidence
                                </span>
                              )}
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {job.currentText}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Job Metadata */}
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Job ID: {job.jobId.slice(0, 8)}...</span>
                          <span>Status: {job.status}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Overall Progress Summary */}
      {jobs.length > 1 && (
        <motion.div
          className="glass-card dark:glass-card-dark rounded-2xl p-4 mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Overall Progress
          </h4>
          
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {jobs.filter(j => j.status === 'queued').length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Queued</p>
            </div>
            
            <div>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {jobs.filter(j => j.status === 'processing').length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Processing</p>
            </div>
            
            <div>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {jobs.filter(j => j.status === 'completed').length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
            </div>
            
            <div>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                {jobs.filter(j => j.status === 'failed').length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
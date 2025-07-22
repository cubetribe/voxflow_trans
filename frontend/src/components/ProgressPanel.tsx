import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Activity, Clock, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface ProcessingStatus {
  type: 'idle' | 'service:starting' | 'model:loading' | 'chunk:processing' | 'chunk:completed' | 'merge:running' | 'transcription:complete' | 'error';
  message: string;
  currentChunk?: number;
  totalChunks?: number;
  progress?: number;
  timeElapsed?: number;
  timeRemaining?: number;
  details?: string;
}

interface ProgressPanelProps {
  status: ProcessingStatus;
  isVisible: boolean;
}

const ProgressPanel: React.FC<ProgressPanelProps> = ({ status, isVisible }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible && status.type === 'idle') {
    return null; // Collapsed/Hidden when idle
  }

  const getStatusIcon = () => {
    switch (status.type) {
      case 'service:starting':
      case 'model:loading':
      case 'chunk:processing':
      case 'merge:running':
        return <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />;
      case 'chunk:completed':
      case 'transcription:complete':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Activity className="w-4 h-4 text-blue-400" />;
    }
  };

  const getProgressPercentage = () => {
    if (status.progress !== undefined) {
      return status.progress;
    }
    if (status.currentChunk && status.totalChunks) {
      return Math.round((status.currentChunk / status.totalChunks) * 100);
    }
    return 0;
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = getProgressPercentage();
  const isProcessing = ['service:starting', 'model:loading', 'chunk:processing', 'merge:running'].includes(status.type);

  return (
    <div className="glass-morphism p-4 rounded-xl mb-6 border border-purple-400/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <h3 className="text-sm font-semibold text-white">🔄 Processing Status</h3>
        </div>
        {(status.currentChunk || status.timeElapsed || status.details) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            {isExpanded ? 
              <ChevronUp className="w-4 h-4 text-gray-400" /> : 
              <ChevronDown className="w-4 h-4 text-gray-400" />
            }
          </button>
        )}
      </div>

      {/* Status Text */}
      <div className="mb-3">
        <p className="text-sm text-gray-300">{status.message}</p>
        {status.currentChunk && status.totalChunks && (
          <p className="text-xs text-gray-400 mt-1">
            Processing chunk {status.currentChunk} of {status.totalChunks}
          </p>
        )}
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-400">Progress</span>
            <span className="text-xs text-gray-400">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                isProcessing 
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse' 
                  : 'bg-green-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            >
              {isProcessing && (
                <div className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-slide-right"></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details Section (Expandable) */}
      {isExpanded && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          {status.details && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Current Action:</span>
              <span className="text-xs text-white">{status.details}</span>
            </div>
          )}
          
          {status.timeElapsed !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-gray-400">Time Elapsed:</span>
              </div>
              <span className="text-xs text-white">{formatTime(status.timeElapsed)}</span>
            </div>
          )}
          
          {status.timeRemaining !== undefined && status.timeRemaining > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Estimated Time:</span>
              <span className="text-xs text-white">~{formatTime(status.timeRemaining)} remaining</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgressPanel;
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Copy, 
  Edit3, 
  Save, 
  RefreshCw, 
  Play, 
  Pause, 
  Volume2, 
  Search,
  Filter,
  Settings,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { TranscriptionResult, TranscriptionSegment } from '@/types/transcription.types';
import { useTranscriptionStore, useLiveTranscription } from '@/stores/transcriptionStore';
import { getApiService } from '@/services/api.service';
import { formatDuration } from '@/utils/format.utils';
import { useToast } from '@/components/common/ToastProvider';

export interface TranscriptionViewProps {
  result?: TranscriptionResult;
  isLive?: boolean;
  isEditable?: boolean;
  showTimestamps?: boolean;
  showConfidence?: boolean;
  onSave?: (editedText: string) => void;
  onExport?: (format: 'txt' | 'json' | 'srt' | 'vtt') => void;
  className?: string;
}

const TranscriptionView: React.FC<TranscriptionViewProps> = ({
  result,
  isLive = false,
  isEditable = true,
  showTimestamps = true,
  showConfidence = false,
  onSave,
  onExport,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [filterConfidence, setFilterConfidence] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [showSettings, setShowSettings] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const segmentRefs = useRef<Record<number, HTMLDivElement>>({});
  const { addToast } = useToast();
  const apiService = getApiService();
  
  // Live transcription data
  const { liveTranscript, partialTranscript, isLiveTranscribing } = useLiveTranscription();
  
  // Get transcription text and segments
  const transcriptionText = isLive ? liveTranscript : (result?.text || '');
  const segments = result?.segments || [];
  const confidence = result?.confidence || 0;
  
  // Initialize edited text when result changes
  useEffect(() => {
    if (result?.text && !isEditing) {
      setEditedText(result.text);
    }
  }, [result?.text, isEditing]);
  
  // Auto-scroll to current segment during playback
  useEffect(() => {
    if (isPlaying && selectedSegment !== null && segmentRefs.current[selectedSegment]) {
      segmentRefs.current[selectedSegment].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [selectedSegment, isPlaying]);
  
  // Filter segments based on confidence
  const filteredSegments = segments.filter(segment => {
    if (filterConfidence === 'all') return true;
    
    const conf = segment.confidence || 0;
    switch (filterConfidence) {
      case 'high': return conf >= 0.8;
      case 'medium': return conf >= 0.5 && conf < 0.8;
      case 'low': return conf < 0.5;
      default: return true;
    }
  });
  
  // Highlight search terms
  const highlightText = useCallback((text: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  }, [searchTerm]);
  
  const handleEdit = () => {
    setIsEditing(true);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };
  
  const handleSave = () => {
    setIsEditing(false);
    onSave?.(editedText);
    addToast({
      type: 'success',
      message: 'Transcription saved successfully',
    });
  };
  
  const handleCancel = () => {
    setIsEditing(false);
    setEditedText(result?.text || '');
  };
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcriptionText);
      addToast({
        type: 'success',
        message: 'Transcription copied to clipboard',
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to copy transcription',
      });
    }
  };
  
  const handleExport = async (format: 'txt' | 'json' | 'srt' | 'vtt') => {
    if (!result?.jobId) {
      addToast({
        type: 'error',
        message: 'No transcription to export',
      });
      return;
    }
    
    try {
      const blob = await apiService.downloadTranscription(result.jobId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcription.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addToast({
        type: 'success',
        message: `Transcription exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: `Failed to export transcription: ${error}`,
      });
    }
  };
  
  const handleSegmentClick = (segmentIndex: number, timestamp: number) => {
    setSelectedSegment(segmentIndex);
    setCurrentTime(timestamp);
    // Trigger audio seek if available
    onExport?.('txt'); // Placeholder for seek functionality
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };
  
  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="w-4 h-4" />;
    if (confidence >= 0.5) return <Clock className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };
  
  if (!result && !isLive) {
    return (
      <div className={`transcription-view ${className}`}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Transcription Available
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Start recording or upload an audio file to see transcription results here.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`transcription-view ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isLive ? 'Live Transcription' : 'Transcription Result'}
              </h3>
              
              {isLive && isLiveTranscribing && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                    Recording
                  </span>
                </div>
              )}
              
              {result && (
                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  {result.duration && (
                    <span className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(result.duration)}</span>
                    </span>
                  )}
                  
                  {showConfidence && confidence && (
                    <span className={`flex items-center space-x-1 ${getConfidenceColor(confidence)}`}>
                      {getConfidenceIcon(confidence)}
                      <span>{Math.round(confidence * 100)}%</span>
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-32 pl-8 pr-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute left-2 top-1.5 w-4 h-4 text-gray-400" />
              </div>
              
              {/* Filter */}
              {segments.length > 0 && (
                <select
                  value={filterConfidence}
                  onChange={(e) => setFilterConfidence(e.target.value as any)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All</option>
                  <option value="high">High Confidence</option>
                  <option value="medium">Medium Confidence</option>
                  <option value="low">Low Confidence</option>
                </select>
              )}
              
              {/* Copy */}
              <button
                onClick={handleCopy}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Copy to clipboard"
              >
                <Copy className="w-4 h-4" />
              </button>
              
              {/* Edit */}
              {isEditable && !isLive && (
                <button
                  onClick={isEditing ? handleSave : handleEdit}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  title={isEditing ? 'Save changes' : 'Edit transcription'}
                >
                  {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </button>
              )}
              
              {/* Export */}
              {result && (
                <div className="relative">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    title="Export options"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  
                  <AnimatePresence>
                    {showSettings && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
                      >
                        <div className="p-2">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                            Export as:
                          </div>
                          {['txt', 'json', 'srt', 'vtt'].map((format) => (
                            <button
                              key={format}
                              onClick={() => {
                                handleExport(format as any);
                                setShowSettings(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                            >
                              {format.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              
              {isEditing && (
                <button
                  onClick={handleCancel}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  title="Cancel editing"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {isEditing ? (
            /* Edit Mode */
            <div className="space-y-4">
              <textarea
                ref={textareaRef}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full h-96 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Edit your transcription here..."
              />
              
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{editedText.length} characters</span>
                <div className="space-x-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="space-y-6">
              {/* Main Text */}
              {transcriptionText && (
                <div className="prose dark:prose-invert max-w-none">
                  <div 
                    className="text-gray-900 dark:text-white leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: highlightText(transcriptionText) }}
                  />
                  
                  {/* Live partial transcript */}
                  {isLive && partialTranscript && (
                    <div className="text-gray-500 dark:text-gray-400 italic mt-2">
                      {partialTranscript}
                      <span className="animate-pulse">|</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Segmented View */}
              {showTimestamps && filteredSegments.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                    Timestamped Segments
                  </h4>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredSegments.map((segment, index) => (
                      <motion.div
                        key={index}
                        ref={(el) => {
                          if (el) segmentRefs.current[index] = el;
                        }}
                        className={`flex items-start space-x-4 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedSegment === index
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => handleSegmentClick(index, segment.start)}
                        whileHover={{ scale: 1.01 }}
                      >
                        <div className="flex-shrink-0">
                          <div className="text-xs font-mono text-gray-500 dark:text-gray-400 min-w-[4rem]">
                            {formatDuration(segment.start)}
                          </div>
                          {showConfidence && segment.confidence && (
                            <div className={`text-xs ${getConfidenceColor(segment.confidence)} mt-1`}>
                              {Math.round(segment.confidence * 100)}%
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div 
                            className="text-sm text-gray-900 dark:text-white"
                            dangerouslySetInnerHTML={{ __html: highlightText(segment.text) }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Empty State */}
              {!transcriptionText && !isLive && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No transcription text available
                  </p>
                </div>
              )}
              
              {/* Live waiting state */}
              {isLive && !transcriptionText && !partialTranscript && (
                <div className="text-center py-12">
                  <div className="flex items-center justify-center space-x-3 mb-4">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" />
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Listening for speech...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranscriptionView;
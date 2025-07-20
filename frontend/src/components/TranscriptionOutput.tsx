import React, { useState, useEffect, useRef } from 'react';
import { FileText, Copy, Download, Trash2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface TranscriptionResult {
  id: string;
  text: string;
  confidence?: number;
  timestamp?: string;
  fileName?: string;
  format?: string;
}

interface TranscriptionOutputProps {
  results: TranscriptionResult[];
  onClear: () => void;
}

const TranscriptionOutput: React.FC<TranscriptionOutputProps> = ({ results, onClear }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedFormat, setSelectedFormat] = useState<'txt' | 'json' | 'srt'>('txt');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new results arrive
  useEffect(() => {
    if (textareaRef.current && results.length > 0) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [results]);

  const getAllText = (): string => {
    if (results.length === 0) return '';
    
    switch (selectedFormat) {
      case 'json':
        return JSON.stringify(results, null, 2);
      case 'srt':
        return results.map((result, index) => {
          const startTime = result.timestamp || '00:00:00,000';
          const endTime = '00:00:05,000'; // Placeholder end time
          return `${index + 1}\n${startTime} --> ${endTime}\n${result.text}\n`;
        }).join('\n');
      case 'txt':
      default:
        return results.map(result => result.text).join('\n\n');
    }
  };

  const handleCopyToClipboard = async () => {
    const text = getAllText();
    if (!text.trim()) {
      toast.error('No transcription to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Transcription copied to clipboard!');
    } catch (error) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Transcription copied to clipboard!');
      } catch (fallbackError) {
        toast.error('Failed to copy transcription');
        console.error('Copy failed:', fallbackError);
      }
    }
  };

  const handleExportAsFile = () => {
    const text = getAllText();
    if (!text.trim()) {
      toast.error('No transcription to export');
      return;
    }

    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const fileName = `transcription_${timestamp}.${selectedFormat}`;
      
      const blob = new Blob([text], { 
        type: selectedFormat === 'json' ? 'application/json' : 'text/plain' 
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported as ${fileName}`);
    } catch (error) {
      toast.error('Failed to export transcription');
      console.error('Export failed:', error);
    }
  };

  const handleClearResults = () => {
    if (results.length === 0) {
      toast.error('No transcription to clear');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to clear all transcription results?');
    if (confirmed) {
      onClear();
      toast.success('Transcription results cleared');
    }
  };

  const getStatsText = (): string => {
    if (results.length === 0) return 'No transcriptions';
    
    const totalWords = getAllText().split(/\s+/).filter(word => word.length > 0).length;
    const avgConfidence = results.length > 0 && results.some(r => r.confidence)
      ? (results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length * 100).toFixed(1)
      : null;
    
    let stats = `${results.length} result${results.length > 1 ? 's' : ''} • ${totalWords} words`;
    if (avgConfidence) {
      stats += ` • ${avgConfidence}% confidence`;
    }
    
    return stats;
  };

  return (
    <div className="glass-morphism p-6 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Transcription Output</h3>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <EyeOff className="w-4 h-4 text-gray-400" />
          ) : (
            <Eye className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>
      
      <div className="space-y-4">
        {/* Format Selection */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-300">Format:</label>
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value as 'txt' | 'json' | 'srt')}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="txt">Plain Text</option>
            <option value="json">JSON</option>
            <option value="srt">SRT Subtitles</option>
          </select>
        </div>

        {/* Results Display */}
        <div className={`transition-all duration-300 ${isExpanded ? 'max-h-96' : 'max-h-32'}`}>
          <textarea
            ref={textareaRef}
            value={getAllText()}
            readOnly
            placeholder="Transcription results will appear here..."
            className={`w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none resize-none font-mono text-sm ${
              isExpanded ? 'h-96' : 'h-32'
            }`}
          />
        </div>

        {/* Stats */}
        <div className="text-xs text-gray-400 px-1">
          {getStatsText()}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button 
            onClick={handleCopyToClipboard}
            disabled={results.length === 0}
            className="flex-1 py-2 px-3 bg-white/10 border border-white/20 text-white rounded-lg font-medium hover:bg-white/20 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Copy className="w-4 h-4" />
            <span>Copy</span>
          </button>
          
          <button 
            onClick={handleExportAsFile}
            disabled={results.length === 0}
            className="flex-1 py-2 px-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          
          <button 
            onClick={handleClearResults}
            disabled={results.length === 0}
            className="py-2 px-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TranscriptionOutput;
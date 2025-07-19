import React from 'react';
import { FileAudio, Download, Trash2, Play, Pause, RotateCw } from 'lucide-react';
import { FileItem } from '../types';

interface FileManagerProps {
  files: FileItem[];
  onFileRemove: (fileId: string) => void;
}

const ProgressBar: React.FC<{ progress: number; status: string }> = ({ progress, status }) => {
  const getProgressColor = () => {
    switch (status) {
      case 'completed': return 'from-green-500 to-green-600';
      case 'error': return 'from-red-500 to-red-600';
      case 'processing': return 'from-blue-500 to-purple-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="w-full bg-gray-700 rounded-full h-2">
      <div 
        className={`h-full rounded-full bg-gradient-to-r ${getProgressColor()} transition-all duration-300`}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
};

const FileCard: React.FC<{ 
  file: FileItem; 
  onRemove: () => void;
}> = ({ file, onRemove }) => {
  const getStatusIcon = () => {
    switch (file.status) {
      case 'completed':
        return <Play className="w-5 h-5 text-green-400" />;
      case 'processing':
        return <RotateCw className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'error':
        return <Pause className="w-5 h-5 text-red-400" />;
      default:
        return <FileAudio className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (file.status) {
      case 'pending': return 'Pending';
      case 'uploading': return `Uploading ${file.uploadProgress || 0}%`;
      case 'processing': return file.chunks ? `Chunk ${file.chunks.current}/${file.chunks.total}` : 'Processing';
      case 'completed': return 'Completed';
      case 'error': return file.error || 'Error';
      default: return 'Unknown';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="glass-morphism p-6 rounded-xl">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            {getStatusIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-white font-medium truncate">{file.name}</h4>
            <p className="text-gray-400 text-sm">{formatFileSize(file.size)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          {file.status === 'completed' && file.resultPath && (
            <button className="p-2 hover:bg-green-500/20 rounded-lg transition-colors">
              <Download className="w-4 h-4 text-green-400" />
            </button>
          )}
          <button 
            onClick={onRemove}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Status</span>
          <span className={`font-medium ${
            file.status === 'completed' ? 'text-green-400' :
            file.status === 'error' ? 'text-red-400' :
            file.status === 'processing' ? 'text-blue-400' :
            'text-gray-400'
          }`}>
            {getStatusText()}
          </span>
        </div>
        
        <ProgressBar progress={file.progress} status={file.status} />
        
        {file.status === 'processing' && file.timeRemaining && (
          <div className="text-xs text-gray-400 text-center">
            {file.timeRemaining}s remaining
          </div>
        )}
      </div>
    </div>
  );
};

const FileManager: React.FC<FileManagerProps> = ({ files, onFileRemove }) => {
  if (files.length === 0) {
    return (
      <section className="glass-morphism p-8 rounded-xl text-center">
        <FileAudio className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No Files</h3>
        <p className="text-gray-400">Upload audio files to start transcription</p>
      </section>
    );
  }

  const getStats = () => {
    const completed = files.filter(f => f.status === 'completed').length;
    const processing = files.filter(f => f.status === 'processing').length;
    const errors = files.filter(f => f.status === 'error').length;
    
    return { completed, processing, errors, total: files.length };
  };

  const stats = getStats();

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">File Manager</h2>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-400">Completed: {stats.completed}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-gray-400">Processing: {stats.processing}</span>
          </div>
          {stats.errors > 0 && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-400">Errors: {stats.errors}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {files.map((file) => (
          <FileCard 
            key={file.id} 
            file={file} 
            onRemove={() => onFileRemove(file.id)}
          />
        ))}
      </div>
    </section>
  );
};

export default FileManager;
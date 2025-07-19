import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, X, Music, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAudioStore } from '@/stores/audioStore';
import { useToast } from '@/components/common/ToastProvider';
import { AudioFile, AudioFormat } from '@/types/audio.types';
import { formatFileSize, formatDuration } from '@/utils/format.utils';

const SUPPORTED_FORMATS = ['.mp3', '.wav', '.m4a', '.webm', '.ogg', '.flac'];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_FILES = 10;

export function MultiFileUpload() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { files, addFiles, removeFile, uploadProgress } = useAudioStore();
  const { addToast } = useToast();

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_FORMATS.includes(extension)) {
      return {
        valid: false,
        error: `Unsupported format. Supported: ${SUPPORTED_FORMATS.join(', ')}`
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large. Maximum size: ${formatFileSize(MAX_FILE_SIZE)}`
      };
    }

    return { valid: true };
  };

  const processFiles = useCallback(async (fileList: FileList) => {
    if (files.length + fileList.length > MAX_FILES) {
      addToast({
        type: 'error',
        message: `Maximum ${MAX_FILES} files allowed. Currently have ${files.length} files.`
      });
      return;
    }

    setIsProcessing(true);
    const validFiles: AudioFile[] = [];
    const errors: string[] = [];

    Array.from(fileList).forEach((file) => {
      const validation = validateFile(file);
      
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error}`);
        return;
      }

      // Check for duplicates
      const isDuplicate = files.some(existingFile => 
        existingFile.name === file.name && existingFile.size === file.size
      );

      if (isDuplicate) {
        errors.push(`${file.name}: File already added`);
        return;
      }

      const audioFile: AudioFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
      };

      validFiles.push(audioFile);
    });

    if (errors.length > 0) {
      addToast({
        type: 'warning',
        title: 'Some files were skipped',
        message: errors.join(', '),
        duration: 8000
      });
    }

    if (validFiles.length > 0) {
      addFiles(validFiles);
      addToast({
        type: 'success',
        message: `Added ${validFiles.length} file${validFiles.length > 1 ? 's' : ''} successfully`
      });
    }

    setIsProcessing(false);
  }, [files, addFiles, addToast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [processFiles]);

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'mp3':
      case 'wav':
      case 'flac':
        return <Music className="w-5 h-5 text-blue-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const getUploadStatus = (fileId: string) => {
    const progress = uploadProgress[fileId];
    if (progress === undefined) return 'pending';
    if (progress < 100) return 'uploading';
    return 'completed';
  };

  const getStatusIcon = (fileId: string) => {
    const status = getUploadStatus(fileId);
    switch (status) {
      case 'uploading':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <motion.div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${isProcessing ? 'pointer-events-none opacity-50' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          type="file"
          multiple
          accept={SUPPORTED_FORMATS.join(',')}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />
        
        <div className="space-y-4">
          <motion.div
            className="flex justify-center"
            animate={{ 
              scale: isDragOver ? 1.1 : 1,
              rotate: isDragOver ? 5 : 0 
            }}
            transition={{ duration: 0.2 }}
          >
            <Upload className={`w-12 h-12 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          </motion.div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {isDragOver ? 'Drop files here' : 'Upload Audio Files'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Drag & drop your audio files or click to browse
            </p>
            
            <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>Supported formats:</span>
              {SUPPORTED_FORMATS.map((format) => (
                <span key={format} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                  {format.toUpperCase()}
                </span>
              ))}
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Max file size: {formatFileSize(MAX_FILE_SIZE)} • Max files: {MAX_FILES}
            </p>
          </div>
        </div>

        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600 dark:text-gray-400">Processing files...</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* File List */}
      {files.length > 0 && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Selected Files ({files.length})
            </h4>
            {files.length > 0 && (
              <button
                onClick={() => {
                  useAudioStore.getState().clearFiles();
                  addToast({
                    type: 'info',
                    message: 'All files cleared'
                  });
                }}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  layout
                >
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    {getFileIcon(file.name)}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatFileSize(file.size)}</span>
                      {file.duration && <span>{formatDuration(file.duration)}</span>}
                      <span>{file.type}</span>
                    </div>
                  </div>

                  {/* Upload Progress */}
                  <div className="flex items-center gap-3">
                    {uploadProgress[file.id] !== undefined && (
                      <div className="w-20">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <motion.div
                            className="bg-blue-500 h-2 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress[file.id]}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-xs text-center text-gray-500 mt-1">
                          {uploadProgress[file.id]}%
                        </p>
                      </div>
                    )}

                    {/* Status Icon */}
                    {getStatusIcon(file.id)}

                    {/* Remove Button */}
                    <button
                      onClick={() => {
                        removeFile(file.id);
                        addToast({
                          type: 'info',
                          message: `Removed ${file.name}`
                        });
                      }}
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total: {files.length} files • {formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}
            </div>
            
            {files.some(file => uploadProgress[file.id] !== undefined) && (
              <div className="text-sm text-blue-600 dark:text-blue-400">
                Upload in progress...
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
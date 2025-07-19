import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileAudio, 
  X, 
  CheckCircle,
  AlertCircle,
  Music,
  Play,
  Pause,
  Volume2
} from 'lucide-react';

interface FileWithPreview extends File {
  id: string;
  preview?: string;
  duration?: number;
  waveform?: number[];
}

interface EnhancedDropZoneProps {
  onFilesAdded: (files: FileWithPreview[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedFormats?: string[];
  className?: string;
}

export function EnhancedDropZone({
  onFilesAdded,
  maxFiles = 10,
  maxSize = 500,
  acceptedFormats = ['mp3', 'wav', 'm4a', 'webm', 'ogg', 'flac'],
  className = ""
}: EnhancedDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const validateFile = (file: File): string | null => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (!extension || !acceptedFormats.includes(extension)) {
      return `Unsupported format. Accepted: ${acceptedFormats.join(', ')}`;
    }
    
    if (file.size > maxSize * 1024 * 1024) {
      return `File too large. Maximum size: ${maxSize}MB`;
    }
    
    return null;
  };

  const processFiles = useCallback(async (fileList: FileList) => {
    const newErrors: string[] = [];
    const validFiles: FileWithPreview[] = [];

    // Check total file count
    if (files.length + fileList.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed`);
      setErrors(newErrors);
      return;
    }

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const error = validateFile(file);
      
      if (error) {
        newErrors.push(`${file.name}: ${error}`);
        continue;
      }

      const fileWithPreview: FileWithPreview = {
        ...file,
        id: Math.random().toString(36).substr(2, 9),
      };

      // Get audio duration and create preview
      try {
        const audio = new Audio();
        const objectUrl = URL.createObjectURL(file);
        
        await new Promise((resolve, reject) => {
          audio.onloadedmetadata = () => {
            fileWithPreview.duration = audio.duration;
            fileWithPreview.preview = objectUrl;
            resolve(audio.duration);
          };
          audio.onerror = reject;
          audio.src = objectUrl;
        });

        validFiles.push(fileWithPreview);
      } catch (error) {
        newErrors.push(`${file.name}: Could not process audio file`);
      }
    }

    setErrors(newErrors);
    
    if (validFiles.length > 0) {
      const updatedFiles = [...files, ...validFiles];
      setFiles(updatedFiles);
      onFilesAdded(validFiles);
    }
  }, [files, maxFiles, maxSize, acceptedFormats, onFilesAdded]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      // Clean up object URL
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updated;
    });
    
    // Stop audio if playing
    if (playingId === fileId) {
      setPlayingId(null);
    }
    
    // Clean up audio ref
    if (audioRefs.current[fileId]) {
      delete audioRefs.current[fileId];
    }
  }, [playingId]);

  const togglePlayback = useCallback((file: FileWithPreview) => {
    if (playingId === file.id) {
      // Stop current
      if (audioRefs.current[file.id]) {
        audioRefs.current[file.id].pause();
      }
      setPlayingId(null);
    } else {
      // Stop any other playing audio
      if (playingId && audioRefs.current[playingId]) {
        audioRefs.current[playingId].pause();
      }
      
      // Start new
      if (!audioRefs.current[file.id] && file.preview) {
        const audio = new Audio(file.preview);
        audio.onended = () => setPlayingId(null);
        audioRefs.current[file.id] = audio;
      }
      
      if (audioRefs.current[file.id]) {
        audioRefs.current[file.id].play();
        setPlayingId(file.id);
      }
    }
  }, [playingId]);

  const clearErrors = () => {
    setErrors([]);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Drop Zone */}
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
          isDragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
        }`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFormats.map(f => `.${f}`).join(',')}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <motion.div
            className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
              isDragOver 
                ? 'bg-blue-100 dark:bg-blue-900/50' 
                : 'bg-gray-100 dark:bg-gray-800'
            }`}
            animate={{
              scale: isDragOver ? 1.1 : 1,
              rotate: isDragOver ? 5 : 0,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {isDragOver ? (
              <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            ) : (
              <FileAudio className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            )}
          </motion.div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {isDragOver ? 'Drop files here' : 'Upload Audio Files'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Drag and drop your audio files here, or click to browse
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Supports: {acceptedFormats.join(', ')} • Max {maxSize}MB per file • Up to {maxFiles} files
            </p>
          </div>
          
          <motion.button
            type="button"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Upload className="w-4 h-4" />
            Choose Files
          </motion.button>
        </div>
      </motion.div>

      {/* Error Messages */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Upload Errors
                </h4>
              </div>
              <button
                onClick={clearErrors}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-sm text-red-700 dark:text-red-300">
                  • {error}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Uploaded Files ({files.length})
            </h4>
            
            <div className="space-y-2">
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                    <Music className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatFileSize(file.size)}</span>
                      {file.duration && (
                        <>
                          <span>•</span>
                          <span>{formatDuration(file.duration)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {file.preview && (
                    <button
                      onClick={() => togglePlayback(file)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {playingId === file.id ? (
                        <Pause className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Play className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
import React, { useCallback, useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { FileItem, TranscriptionConfig, TranscriptionResult } from '../types';
import { uploadFile, startTranscription } from '../services/api';

interface HeroSectionProps {
  onFilesAdded: (files: FileItem[]) => void;
  onTranscriptionResult?: (result: TranscriptionResult) => void;
  config: TranscriptionConfig;
}

const SUPPORTED_FORMATS = ['mp3', 'wav', 'm4a', 'webm', 'ogg', 'flac'];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_FILES = 10;

const HeroSection: React.FC<HeroSectionProps> = ({ onFilesAdded, onTranscriptionResult, config }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const validateFile = (file: File): string | null => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !SUPPORTED_FORMATS.includes(extension)) {
      return `Unsupported format. Supported: ${SUPPORTED_FORMATS.join(', ').toUpperCase()}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Max size: 500MB`;
    }
    return null;
  };

  const handleFiles = useCallback((files: FileList) => {
    const fileArray = Array.from(files);
    
    if (fileArray.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    const validFiles: File[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input clicked, files:', e.target.files);
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startProcessing = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to process');
      return;
    }

    const fileItems: FileItem[] = selectedFiles.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      status: 'pending',
      progress: 0,
      uploadProgress: 0
    }));

    onFilesAdded(fileItems);
    setSelectedFiles([]);

    // Start upload and transcription for each file
    for (const fileItem of fileItems) {
      try {
        // Update status to uploading
        fileItem.status = 'uploading';
        
        // Upload file
        const uploadResponse = await uploadFile(fileItem.file, (progress) => {
          fileItem.uploadProgress = progress;
        });

        // Start transcription
        const transcriptionResponse = await startTranscription(uploadResponse.fileId, config);
        console.log('HeroSection: Got transcription response:', transcriptionResponse);
        
        // Check if we got a direct result or a job ID
        if (transcriptionResponse.text || transcriptionResponse.segments) {
          // Direct result - transcription completed synchronously
          console.log('HeroSection: Direct transcription result received');
          fileItem.status = 'completed';
          fileItem.result = transcriptionResponse;
          
          // Add to transcription results if callback provided
          if (onTranscriptionResult) {
            const result: TranscriptionResult = {
              id: fileItem.id,
              text: transcriptionResponse.text || transcriptionResponse.segments?.map((s: any) => s.text).join(' ') || '',
              confidence: transcriptionResponse.confidence,
              timestamp: new Date().toISOString(),
              fileName: fileItem.name,
              systemPromptUsed: config.systemPrompt
            };
            onTranscriptionResult(result);
          }
          
          toast.success(`Transcription completed for ${fileItem.name}`);
        } else if (transcriptionResponse.jobId) {
          // Job ID - async processing
          console.log('HeroSection: Got job ID:', transcriptionResponse.jobId);
          fileItem.jobId = transcriptionResponse.jobId;
          fileItem.status = 'processing';
          toast.success(`Started processing ${fileItem.name}`);
        } else {
          console.error('HeroSection: Invalid response:', transcriptionResponse);
          throw new Error('Invalid transcription response');
        }
      } catch (error) {
        fileItem.status = 'error';
        fileItem.error = error instanceof Error ? error.message : 'Upload failed';
        toast.error(`Failed to process ${fileItem.name}`);
      }
    }
  };

  return (
    <section className="text-center">
      <div className="mb-8">
        <h1 className="text-5xl md:text-6xl font-bold gradient-text mb-4">
          VoxFlow
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Professional AI Voice Transcription
        </p>
      </div>

      <div
        className={`upload-zone glass-morphism p-8 rounded-xl border-2 border-dashed transition-all duration-300 ${
          isDragActive 
            ? 'border-blue-400 bg-blue-500/10 scale-105' 
            : 'border-blue-500/50 hover:border-blue-400 hover:bg-blue-500/5'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setIsDragActive(true)}
        onDragLeave={() => setIsDragActive(false)}
      >
        <div className="space-y-6">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-white" />
          </div>
          
          <div>
            <p className="text-lg text-white mb-2">
              Drag & drop your audio files here
            </p>
            <p className="text-gray-400 text-sm">
              Supports MP3, WAV, M4A, WEBM, OGG, FLAC • Max 500MB per file • Up to 10 files
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <label className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium cursor-pointer hover:from-blue-600 hover:to-purple-700 transition-all duration-200">
              Browse Files
              <input
                type="file"
                multiple
                accept=".mp3,.wav,.m4a,.webm,.ogg,.flac"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-6 glass-morphism p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">
            Selected Files ({selectedFiles.length})
          </h3>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                <div className="flex items-center space-x-3">
                  <File className="w-5 h-5 text-blue-400" />
                  <div className="text-left">
                    <p className="text-white text-sm font-medium">{file.name}</p>
                    <p className="text-gray-400 text-xs">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-red-500/20 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={startProcessing}
            className="mt-4 w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
          >
            Start Transcription
          </button>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
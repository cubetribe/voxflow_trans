import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Square, Pause, Play, Download } from 'lucide-react';
import { useToast } from '@/components/common/ToastProvider';
import { formatDuration } from '@/utils/format.utils';

export function LiveRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  
  const { addToast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm;codecs=opus' 
        });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();
      
      // Start duration timer
      intervalRef.current = setInterval(() => {
        setDuration((Date.now() - startTimeRef.current) / 1000);
      }, 100);

      addToast({
        type: 'success',
        message: 'Recording started'
      });

    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to access microphone. Please check permissions.'
      });
    }
  }, [addToast]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      addToast({
        type: 'info',
        message: 'Recording paused'
      });
    }
  }, [addToast]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Adjust start time to account for pause
      const pauseDuration = Date.now() - startTimeRef.current - (duration * 1000);
      startTimeRef.current = Date.now() - (duration * 1000);
      
      intervalRef.current = setInterval(() => {
        setDuration((Date.now() - startTimeRef.current) / 1000);
      }, 100);

      addToast({
        type: 'success',
        message: 'Recording resumed'
      });
    }
  }, [duration, addToast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && 
        (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      addToast({
        type: 'success',
        message: 'Recording stopped'
      });
    }
  }, [addToast]);

  const downloadRecording = useCallback(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        message: 'Recording downloaded'
      });
    }
  }, [audioBlob, addToast]);

  const transcribeAudio = useCallback(async () => {
    if (!audioBlob) {
      addToast({
        type: 'warning',
        message: 'No recording available to transcribe'
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('language', 'auto');
      formData.append('format', 'json');

      const response = await fetch('/api/transcribe/file', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setTranscription(result.text || '');

      addToast({
        type: 'success',
        message: 'Transcription completed'
      });

    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to transcribe recording'
      });
    }
  }, [audioBlob, addToast]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Recording Controls */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Status Indicator */}
        <div className="mb-6">
          <motion.div
            className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center ${
              isRecording 
                ? 'bg-red-100 dark:bg-red-900/30' 
                : 'bg-gray-100 dark:bg-gray-700'
            }`}
            animate={{
              scale: isRecording && !isPaused ? [1, 1.05, 1] : 1
            }}
            transition={{
              duration: 1,
              repeat: isRecording && !isPaused ? Infinity : 0
            }}
          >
            {isRecording ? (
              <Mic className={`w-12 h-12 ${isPaused ? 'text-yellow-500' : 'text-red-500'}`} />
            ) : (
              <MicOff className="w-12 h-12 text-gray-400" />
            )}
          </motion.div>
        </div>

        {/* Duration Display */}
        <div className="mb-6">
          <p className="text-3xl font-mono font-bold text-gray-900 dark:text-white">
            {formatDuration(duration)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {isRecording 
              ? (isPaused ? 'Recording paused' : 'Recording in progress...') 
              : 'Ready to record'
            }
          </p>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-4">
          {!isRecording ? (
            <motion.button
              onClick={startRecording}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Mic className="w-5 h-5" />
              Start Recording
            </motion.button>
          ) : (
            <>
              {!isPaused ? (
                <motion.button
                  onClick={pauseRecording}
                  className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Pause className="w-5 h-5" />
                  Pause
                </motion.button>
              ) : (
                <motion.button
                  onClick={resumeRecording}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Play className="w-5 h-5" />
                  Resume
                </motion.button>
              )}

              <motion.button
                onClick={stopRecording}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Square className="w-5 h-5" />
                Stop
              </motion.button>
            </>
          )}
        </div>
      </motion.div>

      {/* Recording Actions */}
      {audioBlob && (
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recording Complete
          </h3>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={transcribeAudio}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <Mic className="w-4 h-4" />
              Transcribe
            </button>
            
            <button
              onClick={downloadRecording}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </motion.div>
      )}

      {/* Transcription Result */}
      {transcription && (
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Transcription
          </h3>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-gray-900 dark:text-white leading-relaxed">
              {transcription}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
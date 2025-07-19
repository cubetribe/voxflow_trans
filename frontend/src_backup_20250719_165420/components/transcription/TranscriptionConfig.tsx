import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Folder, FileText, Clock, Volume2, Zap } from 'lucide-react';
import { useAudioStore } from '@/stores/audioStore';
import { TranscriptionFormat } from '@/types/audio.types';

export function TranscriptionConfig() {
  const { config, updateConfig } = useAudioStore();

  const formatOptions = [
    { value: 'json' as TranscriptionFormat, label: 'JSON', description: 'Structured data with metadata' },
    { value: 'txt' as TranscriptionFormat, label: 'Text', description: 'Plain text transcription' },
    { value: 'srt' as TranscriptionFormat, label: 'SRT', description: 'Subtitle format with timestamps' },
    { value: 'vtt' as TranscriptionFormat, label: 'VTT', description: 'Web video text tracks' },
  ];

  return (
    <motion.div
      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Transcription Configuration
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Output Settings */}
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <FileText className="w-4 h-4" />
            Output Settings
          </h4>

          {/* Output Directory */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Folder className="w-4 h-4 inline mr-1" />
              Output Directory
            </label>
            <input
              type="text"
              value={config.outputDirectory}
              onChange={(e) => updateConfig({ outputDirectory: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="./transcriptions"
            />
          </div>

          {/* Output Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Output Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              {formatOptions.map((option) => (
                <label
                  key={option.value}
                  className={`
                    flex flex-col p-3 border rounded-lg cursor-pointer transition-all
                    ${config.format === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="format"
                    value={option.value}
                    checked={config.format === option.value}
                    onChange={(e) => updateConfig({ format: e.target.value as TranscriptionFormat })}
                    className="sr-only"
                  />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {option.description}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Output Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.includeTimestamps}
                onChange={(e) => updateConfig({ includeTimestamps: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Include timestamps
              </span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.includeConfidence}
                onChange={(e) => updateConfig({ includeConfidence: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Include confidence scores
              </span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.cleanupAfterProcessing}
                onChange={(e) => updateConfig({ cleanupAfterProcessing: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Auto-cleanup temporary files
              </span>
            </label>
          </div>
        </div>

        {/* Processing Settings */}
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Zap className="w-4 h-4" />
            Processing Settings
          </h4>

          {/* Chunk Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Chunk Duration (minutes)
            </label>
            <input
              type="range"
              min="5"
              max="30"
              step="5"
              value={config.processingConfig.chunkDurationMinutes}
              onChange={(e) => updateConfig({
                processingConfig: {
                  ...config.processingConfig,
                  chunkDurationMinutes: parseInt(e.target.value)
                }
              })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>5 min</span>
              <span className="font-medium">
                {config.processingConfig.chunkDurationMinutes} minutes
              </span>
              <span>30 min</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Smaller chunks use less memory but may take longer
            </p>
          </div>

          {/* Overlap Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Overlap Duration (seconds)
            </label>
            <input
              type="range"
              min="0"
              max="30"
              step="5"
              value={config.processingConfig.overlapSeconds}
              onChange={(e) => updateConfig({
                processingConfig: {
                  ...config.processingConfig,
                  overlapSeconds: parseInt(e.target.value)
                }
              })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>0s</span>
              <span className="font-medium">
                {config.processingConfig.overlapSeconds} seconds
              </span>
              <span>30s</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Overlap prevents word cuts at chunk boundaries
            </p>
          </div>

          {/* Concurrent Chunks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Concurrent Chunks
            </label>
            <select
              value={config.processingConfig.maxConcurrentChunks}
              onChange={(e) => updateConfig({
                processingConfig: {
                  ...config.processingConfig,
                  maxConcurrentChunks: parseInt(e.target.value)
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={1}>1 chunk (Sequential)</option>
              <option value={2}>2 chunks</option>
              <option value={3}>3 chunks (Recommended)</option>
              <option value={4}>4 chunks</option>
              <option value={6}>6 chunks (High-end)</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              More concurrent chunks = faster processing but higher memory usage
            </p>
          </div>

          {/* Audio Processing Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.processingConfig.noiseReduction}
                onChange={(e) => updateConfig({
                  processingConfig: {
                    ...config.processingConfig,
                    noiseReduction: e.target.checked
                  }
                })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <Volume2 className="w-4 h-4 inline mr-1" />
                Noise reduction
              </span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.processingConfig.vadEnabled}
                onChange={(e) => updateConfig({
                  processingConfig: {
                    ...config.processingConfig,
                    vadEnabled: e.target.checked
                  }
                })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Voice Activity Detection (VAD)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Configuration Summary
        </h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Format:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {config.format.toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Chunks:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {config.processingConfig.chunkDurationMinutes}min
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Parallel:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {config.processingConfig.maxConcurrentChunks}x
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Features:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {[
                config.includeTimestamps && 'Time',
                config.includeConfidence && 'Conf',
                config.processingConfig.noiseReduction && 'NR',
                config.processingConfig.vadEnabled && 'VAD'
              ].filter(Boolean).join(', ') || 'Basic'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
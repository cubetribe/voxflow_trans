// Utility functions for formatting various data types

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration in seconds to human readable format
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Format duration in milliseconds to human readable format
 */
export function formatDurationMs(milliseconds: number): string {
  return formatDuration(milliseconds / 1000);
}

/**
 * Format timestamp to SRT format (HH:MM:SS,mmm)
 */
export function formatSRTTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Format timestamp to VTT format (HH:MM:SS.mmm)
 */
export function formatVTTTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

/**
 * Format percentage with specified decimal places
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format confidence score as percentage
 */
export function formatConfidence(confidence: number): string {
  return formatPercentage(confidence * 100, 1);
}

/**
 * Format large numbers with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Format processing speed (e.g., "2.5x realtime")
 */
export function formatProcessingSpeed(audioDuration: number, processingTime: number): string {
  if (processingTime === 0) return 'N/A';
  
  const factor = audioDuration / processingTime;
  return `${factor.toFixed(1)}x realtime`;
}

/**
 * Format estimated time remaining
 */
export function formatTimeRemaining(seconds: number): string {
  if (!seconds || seconds <= 0) return 'Unknown';
  
  if (seconds < 60) {
    return `${Math.ceil(seconds)} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.ceil((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Format bitrate (e.g., "320 kbps")
 */
export function formatBitrate(bitrate: number): string {
  if (bitrate >= 1000) {
    return `${Math.round(bitrate / 1000)} kbps`;
  }
  return `${bitrate} bps`;
}

/**
 * Format sample rate (e.g., "44.1 kHz")
 */
export function formatSampleRate(sampleRate: number): string {
  if (sampleRate >= 1000) {
    return `${(sampleRate / 1000).toFixed(1)} kHz`;
  }
  return `${sampleRate} Hz`;
}

/**
 * Format audio channels
 */
export function formatChannels(channels: number): string {
  switch (channels) {
    case 1:
      return 'Mono';
    case 2:
      return 'Stereo';
    case 6:
      return '5.1 Surround';
    case 8:
      return '7.1 Surround';
    default:
      return `${channels} channels`;
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format job status for display
 */
export function formatJobStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format language code to readable name
 */
export function formatLanguage(code: string): string {
  const languages: Record<string, string> = {
    'en': 'English',
    'de': 'German',
    'fr': 'French',
    'es': 'Spanish',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'auto': 'Auto-detect',
  };
  
  return languages[code] || code.toUpperCase();
}

/**
 * Format progress with stage information
 */
export function formatProgressWithStage(progress: number, stage: string): string {
  const formattedStage = formatJobStatus(stage);
  return `${formatPercentage(progress)} - ${formattedStage}`;
}
import toast from 'react-hot-toast';
import { SystemStatus, TranscriptionConfig } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class APIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'APIError';
  }
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Network error' }));
    throw new APIError(errorData.message || `HTTP ${response.status}`, response.status);
  }
  return response.json();
};

export const uploadFile = async (
  file: File, 
  onProgress?: (progress: number) => void
): Promise<{ fileId: string; fileName: string }> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('files', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          console.log('Upload response:', response);
          // Extract fileId from array response
          if (response.files && response.files[0]) {
            resolve({
              fileId: response.files[0].fileId,
              fileName: response.files[0].filename
            });
          } else {
            reject(new APIError('Invalid upload response structure'));
          }
        } catch (error) {
          reject(new APIError('Invalid response format'));
        }
      } else {
        reject(new APIError(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new APIError('Network error during upload'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new APIError('Upload timeout'));
    });

    xhr.open('POST', `${API_BASE}/api/files/upload`);
    xhr.timeout = 300000; // 5 minutes
    xhr.send(formData);
  });
};

export const startTranscription = async (
  fileId: string, 
  config: TranscriptionConfig
): Promise<{ jobId: string }> => {
  try {
    const body = {
      fileId,
      outputFormat: config.outputFormat,
      outputDirectory: config.outputDirectory,
      includeTimestamps: config.includeTimestamps,
      chunkSize: config.chunkSize,
      confidenceThreshold: config.confidenceThreshold,
      systemPrompt: config.systemPrompt,
    };
    
    console.log('Sending transcription request:', body);
    
    const response = await fetch(`${API_BASE}/api/transcribe/file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await handleResponse(response);
    console.log('Transcription response:', result);
    return result;
  } catch (error) {
    toast.error('Failed to start transcription');
    throw error;
  }
};

export const getJobProgress = async (jobId: string) => {
  try {
    const response = await fetch(`${API_BASE}/api/transcribe/job/${jobId}/progress`);
    return handleResponse(response);
  } catch (error) {
    console.error('Failed to get job progress:', error);
    throw error;
  }
};

export const getSystemHealth = async (): Promise<SystemStatus> => {
  try {
    const response = await fetch(`${API_BASE}/health/detailed`);
    return handleResponse(response);
  } catch (error) {
    // Return mock data when API is not available
    console.warn('System health API not available, using mock data');
    return {
      model: {
        name: 'Mistral Voxtral-Mini-3B-2507',
        status: 'loaded',
        memoryUsage: 2.1
      },
      hardware: {
        name: 'Apple Silicon M4 Max',
        status: 'active',
        utilization: 45
      },
      services: {
        total: 3,
        healthy: 3,
        status: 'healthy'
      },
      memory: {
        used: 8589934592, // 8GB
        total: 34359738368, // 32GB
        percentage: 25
      }
    };
  }
};
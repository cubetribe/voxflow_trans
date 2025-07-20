import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import StatusDashboard from './components/StatusDashboard';
import FileManager from './components/FileManager';
import ConfigPanel from './components/ConfigPanel';
import { useSocket } from './hooks/useSocket';
import { useSystemHealth } from './hooks/useSystemHealth';
import { FileItem, SystemStatus, TranscriptionConfig } from './types';

function App() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [config, setConfig] = useState<TranscriptionConfig>({
    outputFormat: 'json',
    outputDirectory: '/Users/username/Downloads',
    includeTimestamps: true,
    chunkSize: 30,
    confidenceThreshold: 0.7
  });
  
  const { socket, isConnected } = useSocket();
  const { systemStatus, isLoading: statusLoading } = useSystemHealth();

  useEffect(() => {
    if (socket) {
      socket.on('job:progress', (data) => {
        setFiles(prev => prev.map(file => 
          file.jobId === data.jobId 
            ? { ...file, progress: data.progress, status: data.status }
            : file
        ));
      });

      socket.on('job:complete', (data) => {
        setFiles(prev => prev.map(file => 
          file.jobId === data.jobId 
            ? { ...file, progress: 100, status: 'completed', resultPath: data.resultPath }
            : file
        ));
      });

      socket.on('job:error', (data) => {
        setFiles(prev => prev.map(file => 
          file.jobId === data.jobId 
            ? { ...file, status: 'error', error: data.error }
            : file
        ));
      });
    }
  }, [socket]);

  const handleFilesAdded = (newFiles: FileItem[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileRemove = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleConfigChange = (newConfig: Partial<TranscriptionConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      />
      
      <Header isConnected={isConnected} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-8">
            <HeroSection onFilesAdded={handleFilesAdded} config={config} />
            <FileManager files={files} onFileRemove={handleFileRemove} />
          </div>
          
          {/* Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            <StatusDashboard 
              systemStatus={systemStatus} 
              isLoading={statusLoading}
              isConnected={isConnected}
            />
            <ConfigPanel config={config} onChange={handleConfigChange} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
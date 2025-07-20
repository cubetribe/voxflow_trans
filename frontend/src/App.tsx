import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import StatusDashboard from './components/StatusDashboard';
import FileManager from './components/FileManager';
import ConfigPanel from './components/ConfigPanel';
import SystemPromptPanel from './components/SystemPromptPanel';
import TranscriptionOutput from './components/TranscriptionOutput';
import { useSocket } from './hooks/useSocket';
import { useSystemHealth } from './hooks/useSystemHealth';
import { FileItem, SystemStatus, TranscriptionConfig, TranscriptionResult } from './types';

function App() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [config, setConfig] = useState<TranscriptionConfig>({
    outputFormat: 'json',
    outputDirectory: '/Users/username/Downloads',
    includeTimestamps: true,
    chunkSize: 30,
    confidenceThreshold: 0.7,
    systemPrompt: "Sie sind ein professioneller Transkriptions-Assistent. Transkribieren Sie das Audio exakt wie gesprochen in der ORIGINAL-SPRACHE. Falls Deutsch gesprochen wird, geben Sie die Transkription auf DEUTSCH aus. Achten Sie auf deutsche Grammatik, Umlaute (ä, ö, ü, ß) und regionale Dialekte. Ausgabe: Nur die Transkription in Originalsprache.",
    language: 'de'
  });
  const [transcriptionResults, setTranscriptionResults] = useState<TranscriptionResult[]>([]);
  
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
        
        // Add transcription result if available
        if (data.transcription) {
          const result: TranscriptionResult = {
            id: data.jobId,
            text: data.transcription.text || data.transcription,
            confidence: data.transcription.confidence,
            timestamp: new Date().toISOString(),
            fileName: data.fileName,
            systemPromptUsed: config.systemPrompt
          };
          setTranscriptionResults(prev => [...prev, result]);
        }
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

  const handleSystemPromptChange = (prompt: string) => {
    setConfig(prev => ({ ...prev, systemPrompt: prompt }));
  };

  const handleLanguageChange = (language: string) => {
    setConfig(prev => ({ ...prev, language }));
  };

  const handleClearTranscriptions = () => {
    setTranscriptionResults([]);
  };

  const handleTranscriptionResult = (result: TranscriptionResult) => {
    setTranscriptionResults(prev => [...prev, result]);
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
            <HeroSection 
              onFilesAdded={handleFilesAdded} 
              onTranscriptionResult={handleTranscriptionResult}
              config={config} 
            />
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
            <SystemPromptPanel 
              onPromptChange={handleSystemPromptChange}
              onLanguageChange={handleLanguageChange}
            />
            <TranscriptionOutput 
              results={transcriptionResults}
              onClear={handleClearTranscriptions}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
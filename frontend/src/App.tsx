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
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          {/* Left Column - Main Content (70%) */}
          <div className="lg:col-span-7 voxflow-main-content">
            {/* File Upload Area */}
            <HeroSection 
              onFilesAdded={handleFilesAdded} 
              onTranscriptionResult={handleTranscriptionResult}
              config={config} 
            />
            <FileManager files={files} onFileRemove={handleFileRemove} />
            
            {/* AI Instructions - Full width of left column */}
            <SystemPromptPanel 
              onPromptChange={handleSystemPromptChange}
              onLanguageChange={handleLanguageChange}
            />
            
            {/* Transcription Output - Full width of left column */}
            <TranscriptionOutput 
              results={transcriptionResults}
              onClear={handleClearTranscriptions}
            />
          </div>
          
          {/* Right Column - Sidebar (30%) */}
          <div className="lg:col-span-3 voxflow-sidebar">
            {/* System Status */}
            <StatusDashboard 
              systemStatus={systemStatus} 
              isLoading={statusLoading}
              isConnected={isConnected}
            />
            
            {/* Configuration Panel - Extended */}
            <ConfigPanel config={config} onChange={handleConfigChange} />
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="glass-morphism border-t border-white/10 sticky bottom-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center text-gray-400 text-sm">
            © Dennis Westermann @ aiEX Academy
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
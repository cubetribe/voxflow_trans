import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, X, Activity, Database, Wifi, Server, Eye, EyeOff } from 'lucide-react';
import { useAudioStore } from '@/stores/audioStore';
import { getWebSocketService } from '@/services/websocket.service';
import { getApiService } from '@/services/api.service';

interface DebugInfo {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  data?: any;
}

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugInfo[]>([]);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [apiStatus, setApiStatus] = useState('unknown');
  const [systemInfo, setSystemInfo] = useState<any>({});
  
  const { files, config, isProcessing } = useAudioStore();
  const wsService = getWebSocketService();
  const apiService = getApiService();

  // Debug Logger
  const addDebugLog = (level: DebugInfo['level'], category: string, message: string, data?: any) => {
    const log: DebugInfo = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data
    };
    
    setDebugLogs(prev => [log, ...prev.slice(0, 99)]); // Keep last 100 logs
    
    // Also log to console with styling
    const style = {
      info: 'color: #3b82f6',
      warn: 'color: #f59e0b',
      error: 'color: #ef4444',
      debug: 'color: #6b7280'
    };
    
    console.log(`%c[VoxFlow ${category}] ${message}`, style[level], data || '');
  };

  // Monitor WebSocket status
  useEffect(() => {
    const unsubscribe = wsService.on('connection', (status: string) => {
      setWsStatus(status);
      addDebugLog('info', 'WebSocket', `Connection status: ${status}`);
    });

    return unsubscribe;
  }, [wsService]);

  // Monitor API status
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const available = await apiService.checkServiceAvailability();
        setApiStatus(available ? 'online' : 'offline');
        
        if (available) {
          const health = await apiService.getDetailedHealth();
          addDebugLog('info', 'API', 'Health check successful', health);
        }
      } catch (error) {
        setApiStatus('error');
        addDebugLog('error', 'API', 'Health check failed', error);
      }
    };

    checkApiStatus();
    const interval = setInterval(checkApiStatus, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, [apiService]);

  // Collect system info
  useEffect(() => {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      memory: (navigator as any).deviceMemory || 'unknown',
      cores: navigator.hardwareConcurrency || 'unknown',
      connection: (navigator as any).connection?.effectiveType || 'unknown'
    };
    
    setSystemInfo(info);
    addDebugLog('info', 'System', 'System info collected', info);
  }, []);

  // Monitor audio store changes
  useEffect(() => {
    addDebugLog('debug', 'Store', `Files: ${files.length}, Processing: ${isProcessing}`, {
      files: files.map(f => ({ id: f.id, name: f.name, size: f.size })),
      config
    });
  }, [files, isProcessing, config]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'online':
        return 'text-green-500';
      case 'connecting':
      case 'reconnecting':
        return 'text-yellow-500';
      case 'offline':
      case 'disconnected':
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getLogColor = (level: DebugInfo['level']) => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
      case 'debug':
        return 'text-gray-400';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const exportLogs = () => {
    const logsText = debugLogs.map(log => 
      `[${formatTimestamp(log.timestamp)}] ${log.level.toUpperCase()} ${log.category}: ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}`
    ).join('\n\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voxflow-debug-${new Date().toISOString().slice(0, 19)}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addDebugLog('info', 'Debug', 'Logs exported to file');
  };

  const clearLogs = () => {
    setDebugLogs([]);
    addDebugLog('info', 'Debug', 'Logs cleared');
  };

  if (!import.meta.env.DEV && !import.meta.env.VITE_DEBUG_MODE) {
    return null; // Don't show in production unless explicitly enabled
  }

  return (
    <>
      {/* Debug Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg transition-all ${
          isOpen 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-blue-500 hover:bg-blue-600'
        } text-white`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title={isOpen ? 'Close Debug Panel' : 'Open Debug Panel'}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Bug className="w-5 h-5" />}
      </motion.button>

      {/* Debug Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-40 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute top-4 right-4 w-96 max-h-[calc(100vh-8rem)] bg-gray-900 text-white rounded-lg shadow-2xl pointer-events-auto overflow-hidden"
              initial={{ x: 400, y: 0 }}
              animate={{ x: 0, y: 0 }}
              exit={{ x: 400, y: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Bug className="w-5 h-5" />
                    Debug Panel
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={exportLogs}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                      title="Export Logs"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={clearLogs}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                      title="Clear Logs"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="p-4 border-b border-gray-700">
                <h4 className="text-sm font-medium mb-3">Service Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Wifi className="w-4 h-4" />
                      WebSocket
                    </span>
                    <span className={getStatusColor(wsStatus)}>
                      {wsStatus}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      API
                    </span>
                    <span className={getStatusColor(apiStatus)}>
                      {apiStatus}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Store
                    </span>
                    <span className="text-blue-400">
                      {files.length} files
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Processing
                    </span>
                    <span className={isProcessing ? 'text-yellow-400' : 'text-gray-400'}>
                      {isProcessing ? 'active' : 'idle'}
                    </span>
                  </div>
                </div>
              </div>

              {/* System Info */}
              <div className="p-4 border-b border-gray-700">
                <h4 className="text-sm font-medium mb-3">System Info</h4>
                <div className="text-xs space-y-1 text-gray-300">
                  <div>Platform: {systemInfo.platform}</div>
                  <div>Memory: {systemInfo.memory}GB</div>
                  <div>Cores: {systemInfo.cores}</div>
                  <div>Connection: {systemInfo.connection}</div>
                  <div>Viewport: {systemInfo.viewport?.width}x{systemInfo.viewport?.height}</div>
                </div>
              </div>

              {/* Debug Logs */}
              <div className="flex-1 overflow-hidden">
                <div className="p-4">
                  <h4 className="text-sm font-medium mb-3">
                    Debug Logs ({debugLogs.length})
                  </h4>
                </div>
                
                <div className="max-h-64 overflow-y-auto px-4 pb-4 space-y-2">
                  {debugLogs.map((log, index) => (
                    <div
                      key={index}
                      className="text-xs p-2 bg-gray-800 rounded border border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </span>
                        <span className={`text-xs px-1 rounded ${getLogColor(log.level)}`}>
                          {log.level}
                        </span>
                      </div>
                      
                      <div className="text-yellow-300 font-medium">
                        [{log.category}] {log.message}
                      </div>
                      
                      {log.data && (
                        <details className="mt-1">
                          <summary className="text-gray-400 cursor-pointer text-xs">
                            Show data
                          </summary>
                          <pre className="text-xs text-gray-300 mt-1 overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                  
                  {debugLogs.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No debug logs yet
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
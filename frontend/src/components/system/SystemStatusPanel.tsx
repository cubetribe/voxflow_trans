import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, 
  HardDrive, 
  Wifi, 
  WifiOff, 
  Brain, 
  Activity,
  ChevronDown,
  ChevronUp,
  Circle,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ApiService } from '@/services/api.service';

const apiService = new ApiService();

interface SystemStatus {
  model: {
    loaded: boolean;
    name: string;
    device: string;
    loadTime: number;
    memoryUsage: number;
  };
  hardware: {
    platform: string;
    device: string;
    memory: number;
    cpu: string;
  };
  services: {
    nodeService: boolean;
    pythonService: boolean;
    redis: boolean;
  };
  performance: {
    totalInferences: number;
    avgProcessingTime: number;
    realTimeFactor: number;
  };
}

export function SystemStatusPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Fetch system status
  const { data: nodeHealth } = useQuery({
    queryKey: ['nodeHealth'],
    queryFn: () => apiService.getHealth(),
    refetchInterval: 5000,
  });

  const { data: pythonHealth } = useQuery({
    queryKey: ['pythonHealth'],
    queryFn: () => fetch('http://localhost:8000/health/detailed').then(r => r.json()),
    refetchInterval: 5000,
    retry: false,
  });

  const systemStatus: SystemStatus = {
    model: {
      loaded: pythonHealth?.model?.loaded || false,
      name: pythonHealth?.model?.name || 'mistralai/Voxtral-Mini-3B-2507',
      device: pythonHealth?.model?.device || 'mps',
      loadTime: pythonHealth?.model?.loadTime || 0,
      memoryUsage: pythonHealth?.model?.memoryUsage || 0,
    },
    hardware: {
      platform: 'Apple Silicon M4 Max',
      device: pythonHealth?.model?.device || 'mps',
      memory: 128, // GB
      cpu: 'M4 Max',
    },
    services: {
      nodeService: nodeHealth?.status === 'healthy',
      pythonService: pythonHealth?.status === 'healthy',
      redis: nodeHealth?.services?.redis || false,
    },
    performance: {
      totalInferences: pythonHealth?.performance?.totalInferences || 0,
      avgProcessingTime: pythonHealth?.performance?.avgProcessingTime || 0,
      realTimeFactor: pythonHealth?.performance?.avgRealTimeFactor || 0,
    },
  };

  const StatusIndicator = ({ status, label }: { status: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      {status ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500" />
      )}
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
    </div>
  );

  const MetricCard = ({ 
    icon: Icon, 
    label, 
    value, 
    unit, 
    color = "blue" 
  }: { 
    icon: any; 
    label: string; 
    value: string | number; 
    unit?: string; 
    color?: string;
  }) => (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
      <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/50`}>
        <Icon className={`w-4 h-4 text-${color}-600 dark:text-${color}-400`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {value}{unit && <span className="text-xs text-gray-500 ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  );

  if (!isVisible) {
    return (
      <motion.button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 p-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Activity className="w-5 h-5" />
      </motion.button>
    );
  }

  return (
    <motion.div
      className="fixed bottom-4 right-4 z-50"
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="glass dark:glass-dark rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                System Status
              </h3>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <XCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
            </button>
          </div>
        </div>

        {/* Quick Status Row */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {systemStatus.model.name.split('/')[1]}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {systemStatus.model.loaded ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              )}
              <span className="text-xs text-gray-500">
                {systemStatus.model.device.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <StatusIndicator 
                status={systemStatus.services.nodeService} 
                label="API" 
              />
              <StatusIndicator 
                status={systemStatus.services.pythonService} 
                label="AI" 
              />
              <StatusIndicator 
                status={systemStatus.services.redis} 
                label="Cache" 
              />
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-gray-200/50 dark:border-gray-700/50"
            >
              <div className="p-4 space-y-4">
                {/* Model Information */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    AI Model
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <MetricCard
                      icon={Brain}
                      label="Status"
                      value={systemStatus.model.loaded ? "Loaded" : "Loading"}
                      color="purple"
                    />
                    <MetricCard
                      icon={Activity}
                      label="Load Time"
                      value={systemStatus.model.loadTime.toFixed(1)}
                      unit="s"
                      color="blue"
                    />
                  </div>
                </div>

                {/* Hardware Information */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    Hardware
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <MetricCard
                      icon={Cpu}
                      label="Processor"
                      value="M4 Max"
                      color="green"
                    />
                    <MetricCard
                      icon={HardDrive}
                      label="Memory"
                      value="128"
                      unit="GB"
                      color="orange"
                    />
                  </div>
                </div>

                {/* Performance Metrics */}
                {systemStatus.performance.totalInferences > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Performance
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <MetricCard
                        icon={Activity}
                        label="Inferences"
                        value={systemStatus.performance.totalInferences}
                        color="blue"
                      />
                      <MetricCard
                        icon={Activity}
                        label="RT Factor"
                        value={systemStatus.performance.realTimeFactor.toFixed(2)}
                        unit="x"
                        color="green"
                      />
                    </div>
                  </div>
                )}

                {/* Service Status */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    Services
                  </h4>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Node.js Gateway</span>
                      {systemStatus.services.nodeService ? (
                        <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                      ) : (
                        <Circle className="w-2 h-2 fill-red-500 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Python AI Service</span>
                      {systemStatus.services.pythonService ? (
                        <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                      ) : (
                        <Circle className="w-2 h-2 fill-red-500 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Redis Cache</span>
                      {systemStatus.services.redis ? (
                        <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                      ) : (
                        <Circle className="w-2 h-2 fill-yellow-500 text-yellow-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
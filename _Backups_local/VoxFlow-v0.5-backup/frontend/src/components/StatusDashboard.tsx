import React from 'react';
import { Cpu, HardDrive, Activity, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { SystemStatus } from '../types';

interface StatusDashboardProps {
  systemStatus: SystemStatus | null;
  isLoading: boolean;
  isConnected: boolean;
}

const StatusItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  status: 'healthy' | 'warning' | 'error';
  detail?: string;
}> = ({ icon, label, value, status, detail }) => {
  const statusColors = {
    healthy: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400'
  };

  const StatusIcon = {
    healthy: CheckCircle,
    warning: AlertCircle,
    error: XCircle
  };

  const Icon = StatusIcon[status];

  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="text-blue-400">
          {icon}
        </div>
        <div>
          <p className="text-white text-sm font-medium">{label}</p>
          {detail && <p className="text-gray-400 text-xs">{detail}</p>}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span className={`text-sm ${statusColors[status]}`}>{value}</span>
        <Icon className={`w-4 h-4 ${statusColors[status]}`} />
      </div>
    </div>
  );
};

const StatusDashboard: React.FC<StatusDashboardProps> = ({ 
  systemStatus, 
  isLoading, 
  isConnected 
}) => {
  if (isLoading) {
    return (
      <div className="status-panel glass-morphism p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-white/10 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!isConnected || !systemStatus) {
    return (
      <div className="status-panel glass-morphism p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
        <div className="text-center py-8">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 font-medium">System Disconnected</p>
          <p className="text-gray-400 text-sm mt-2">
            Unable to connect to transcription service
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="status-panel glass-morphism p-6 rounded-xl">
      <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
      <div className="space-y-4">
        <StatusItem
          icon={<Activity className="w-5 h-5" />}
          label="AI Model"
          value={systemStatus?.model?.status === 'loaded' ? 'Ready' : 'Loading'}
          status={systemStatus?.model?.status === 'loaded' ? 'healthy' : systemStatus?.model?.status === 'loading' ? 'warning' : 'error'}
          detail={systemStatus?.model?.name || 'Unknown'}
        />
        
        <StatusItem
          icon={<Cpu className="w-5 h-5" />}
          label="Hardware"
          value={systemStatus?.hardware?.status === 'active' ? 'Active' : 'Idle'}
          status={systemStatus?.hardware?.status === 'error' ? 'error' : 'healthy'}
          detail={systemStatus?.hardware?.name || 'Unknown'}
        />
        
        <StatusItem
          icon={<CheckCircle className="w-5 h-5" />}
          label="Services"
          value={`${systemStatus?.services?.healthy || 0}/${systemStatus?.services?.total || 0}`}
          status={systemStatus?.services?.status || 'error'}
          detail="Node.js • Python • MLX"
        />
        
        <StatusItem
          icon={<HardDrive className="w-5 h-5" />}
          label="Memory"
          value={`${systemStatus?.memory?.percentage || 0}%`}
          status={(systemStatus?.memory?.percentage || 0) > 90 ? 'error' : (systemStatus?.memory?.percentage || 0) > 75 ? 'warning' : 'healthy'}
          detail={`${((systemStatus?.memory?.used || 0) / 1024 / 1024 / 1024).toFixed(1)}GB / ${((systemStatus?.memory?.total || 0) / 1024 / 1024 / 1024).toFixed(1)}GB`}
        />
      </div>
      
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Last updated</span>
          <span className="text-white">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default StatusDashboard;
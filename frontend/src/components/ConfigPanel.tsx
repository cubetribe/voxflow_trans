import React from 'react';
import { Settings, FolderOpen, Clock, Target, Save } from 'lucide-react';
import { TranscriptionConfig } from '../types';
import toast from 'react-hot-toast';

interface ConfigPanelProps {
  config: TranscriptionConfig;
  onChange: (config: Partial<TranscriptionConfig>) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onChange }) => {
  const handleDirectorySelect = async () => {
    try {
      // Use the File System Access API for modern browsers
      if ('showDirectoryPicker' in window) {
        const directoryHandle = await (window as any).showDirectoryPicker();
        onChange({ outputDirectory: directoryHandle.name });
        toast.success('Directory selected successfully!');
      } else {
        // Fallback: prompt user to enter path manually
        const path = prompt('Enter output directory path:', config.outputDirectory);
        if (path && path.trim()) {
          onChange({ outputDirectory: path.trim() });
          toast.success('Directory path updated!');
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast.error('Failed to select directory');
        console.error('Directory selection failed:', error);
      }
    }
  };

  const handleSaveConfiguration = () => {
    // Validate configuration
    if (!config.outputDirectory.trim()) {
      toast.error('Please select an output directory');
      return;
    }
    
    // Save configuration (implement API call here)
    try {
      // TODO: Implement actual save to backend
      localStorage.setItem('voxflow-config', JSON.stringify(config));
      toast.success('Configuration saved successfully!');
    } catch (error) {
      toast.error('Failed to save configuration');
      console.error('Save failed:', error);
    }
  };
  return (
    <div className="glass-morphism p-6 rounded-xl">
      <div className="flex items-center space-x-2 mb-6">
        <Settings className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Configuration</h3>
      </div>
      
      <div className="space-y-6">
        {/* Output Format */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Output Format
          </label>
          <select
            value={config.outputFormat}
            onChange={(e) => onChange({ outputFormat: e.target.value as any })}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="json">JSON</option>
            <option value="txt">Plain Text</option>
          </select>
        </div>

        {/* Output Directory */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Output Directory
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={config.outputDirectory}
              onChange={(e) => onChange({ outputDirectory: e.target.value })}
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="/path/to/output"
            />
            <button 
              onClick={handleDirectorySelect}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors group"
              title="Select output directory"
            >
              <FolderOpen className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
            </button>
          </div>
        </div>

        {/* Timestamps */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-gray-300">Include Timestamps</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.includeTimestamps}
              onChange={(e) => onChange({ includeTimestamps: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>

        {/* Chunk Size */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Chunk Size (seconds)
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="10"
              max="60"
              value={config.chunkSize}
              onChange={(e) => onChange({ chunkSize: parseInt(e.target.value) })}
              className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-white text-sm w-8">{config.chunkSize}s</span>
          </div>
        </div>

        {/* Confidence Threshold */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Target className="w-4 h-4 text-blue-400" />
            <label className="text-sm font-medium text-gray-300">
              Confidence Threshold
            </label>
          </div>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={config.confidenceThreshold}
              onChange={(e) => onChange({ confidenceThreshold: parseFloat(e.target.value) })}
              className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-white text-sm w-8">{config.confidenceThreshold.toFixed(1)}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-white/10">
        <button 
          onClick={handleSaveConfiguration}
          className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Configuration</span>
        </button>
      </div>
    </div>
  );
};

export default ConfigPanel;
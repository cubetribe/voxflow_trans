import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, 
  FolderOpen, 
  Home, 
  ChevronRight, 
  Check,
  X
} from 'lucide-react';

interface FileBrowserProps {
  value: string;
  onChange: (path: string) => void;
  placeholder?: string;
  className?: string;
}

interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
}

export function FileBrowser({ 
  value, 
  onChange, 
  placeholder = "Select output directory...",
  className = "" 
}: FileBrowserProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('/Users');
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock directory listing - in real app, this would call an API
  const loadDirectories = async (path: string) => {
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Mock directory structure
    const mockDirectories: DirectoryItem[] = [
      { name: 'Desktop', path: '/Users/Desktop', isDirectory: true },
      { name: 'Documents', path: '/Users/Documents', isDirectory: true },
      { name: 'Downloads', path: '/Users/Downloads', isDirectory: true },
      { name: 'Music', path: '/Users/Music', isDirectory: true },
      { name: 'Pictures', path: '/Users/Pictures', isDirectory: true },
      { name: 'Videos', path: '/Users/Videos', isDirectory: true },
    ];
    
    if (path.includes('Desktop')) {
      mockDirectories.push(
        { name: 'Projects', path: '/Users/Desktop/Projects', isDirectory: true },
        { name: 'VoxFlow Output', path: '/Users/Desktop/VoxFlow Output', isDirectory: true }
      );
    }
    
    setDirectories(mockDirectories);
    setLoading(false);
  };

  const handleDirectoryClick = (directory: DirectoryItem) => {
    setCurrentPath(directory.path);
    loadDirectories(directory.path);
  };

  const handleSelect = () => {
    onChange(currentPath);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const getDisplayPath = (path: string) => {
    const parts = path.split('/').filter(Boolean);
    if (parts.length <= 2) return path;
    return `.../${parts.slice(-2).join('/')}`;
  };

  const openDirectoryPicker = () => {
    // In a real app, this would use the File System Access API or Electron API
    if (fileInputRef.current) {
      fileInputRef.current.webkitdirectory = true;
      fileInputRef.current.click();
    }
  };

  const handleDirectorySelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Get the directory path from the first file
      const firstFile = files[0];
      const relativePath = firstFile.webkitRelativePath;
      const directoryPath = relativePath.split('/')[0];
      onChange(directoryPath);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      loadDirectories(currentPath);
    }
  }, [isOpen]);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleDirectorySelection}
        style={{ display: 'none' }}
        multiple
      />
      
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 group"
      >
        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/50 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/70 transition-colors">
          <Folder className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Output Directory
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {value ? getDisplayPath(value) : placeholder}
          </p>
        </div>
        
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
      </button>

      {/* Browser Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
          >
            <motion.div
              className="w-full max-w-2xl max-h-[80vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Select Output Directory
                </h3>
                
                <button
                  onClick={handleCancel}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Current Path */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Home className="w-4 h-4" />
                  <span>{currentPath}</span>
                </div>
              </div>

              {/* Directory List */}
              <div className="flex-1 overflow-y-auto max-h-96">
                {loading ? (
                  <div className="flex items-center justify-center p-12">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="p-4 space-y-1">
                    {/* Parent Directory */}
                    {currentPath !== '/Users' && (
                      <button
                        onClick={() => {
                          const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
                          setCurrentPath(parentPath);
                          loadDirectories(parentPath);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                      >
                        <FolderOpen className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">..</span>
                      </button>
                    )}
                    
                    {/* Directories */}
                    {directories.map((directory, index) => (
                      <button
                        key={directory.path}
                        onClick={() => handleDirectoryClick(directory)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-left group"
                      >
                        <Folder className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {directory.name}
                        </span>
                      </button>
                    ))}
                    
                    {directories.length === 0 && !loading && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No directories found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center justify-between">
                  <button
                    onClick={openDirectoryPicker}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    Browse with system dialog
                  </button>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    
                    <button
                      onClick={handleSelect}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Select Directory
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
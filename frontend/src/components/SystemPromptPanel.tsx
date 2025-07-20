import React, { useState, useEffect } from 'react';
import { Brain, RotateCcw, Save, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

interface SystemPromptPanelProps {
  onPromptChange: (prompt: string) => void;
}

const DEFAULT_PROMPT = "You are a professional transcription assistant. Transcribe the audio exactly as spoken. Output only the transcription.";

const PROMPT_PRESETS = [
  {
    name: "Standard Transcription",
    prompt: "You are a professional transcription assistant. Transcribe the audio exactly as spoken. Output only the transcription."
  },
  {
    name: "Meeting Summary",
    prompt: "You are a meeting transcription assistant. Transcribe the audio and provide a brief summary of key points discussed."
  },
  {
    name: "Interview Format", 
    prompt: "You are an interview transcription assistant. Transcribe the audio identifying speakers as 'Interviewer:' and 'Interviewee:' where possible."
  },
  {
    name: "Technical Content",
    prompt: "You are a technical transcription assistant. Transcribe the audio accurately, paying special attention to technical terms, acronyms, and numbers."
  }
];

const SystemPromptPanel: React.FC<SystemPromptPanelProps> = ({ onPromptChange }) => {
  const [prompt, setPrompt] = useState<string>(DEFAULT_PROMPT);
  const [selectedPreset, setSelectedPreset] = useState<string>('Standard Transcription');
  const [characterCount, setCharacterCount] = useState<number>(0);

  // Load saved prompt from localStorage on component mount
  useEffect(() => {
    try {
      const savedPrompt = localStorage.getItem('voxflow-system-prompt');
      if (savedPrompt && savedPrompt.trim()) {
        setPrompt(savedPrompt);
        setCharacterCount(savedPrompt.length);
        onPromptChange(savedPrompt);
      } else {
        setPrompt(DEFAULT_PROMPT);
        setCharacterCount(DEFAULT_PROMPT.length);
        onPromptChange(DEFAULT_PROMPT);
      }
    } catch (error) {
      console.error('Failed to load saved prompt:', error);
      setPrompt(DEFAULT_PROMPT);
      setCharacterCount(DEFAULT_PROMPT.length);
      onPromptChange(DEFAULT_PROMPT);
    }
  }, [onPromptChange]);

  const handlePromptChange = (newPrompt: string) => {
    setPrompt(newPrompt);
    setCharacterCount(newPrompt.length);
    onPromptChange(newPrompt);
    
    // Update preset selection if it matches
    const matchingPreset = PROMPT_PRESETS.find(preset => preset.prompt === newPrompt);
    if (matchingPreset) {
      setSelectedPreset(matchingPreset.name);
    } else {
      setSelectedPreset('Custom');
    }
  };

  const handlePresetChange = (presetName: string) => {
    const preset = PROMPT_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setSelectedPreset(presetName);
      handlePromptChange(preset.prompt);
      toast.success(`Preset "${presetName}" applied`);
    }
  };

  const handleSavePrompt = () => {
    try {
      if (!prompt.trim()) {
        toast.error('Prompt cannot be empty');
        return;
      }

      localStorage.setItem('voxflow-system-prompt', prompt);
      toast.success('System prompt saved successfully!');
    } catch (error) {
      toast.error('Failed to save system prompt');
      console.error('Save failed:', error);
    }
  };

  const handleResetPrompt = () => {
    setPrompt(DEFAULT_PROMPT);
    setCharacterCount(DEFAULT_PROMPT.length);
    setSelectedPreset('Standard Transcription');
    onPromptChange(DEFAULT_PROMPT);
    
    try {
      localStorage.setItem('voxflow-system-prompt', DEFAULT_PROMPT);
      toast.success('System prompt reset to default');
    } catch (error) {
      console.error('Failed to save reset prompt:', error);
    }
  };

  return (
    <div className="glass-morphism p-6 rounded-xl">
      <div className="flex items-center space-x-2 mb-6">
        <Brain className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">AI Instructions</h3>
      </div>
      
      <div className="space-y-6">
        {/* Preset Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <BookOpen className="w-4 h-4 inline mr-1" />
            Prompt Presets
          </label>
          <select
            value={selectedPreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {PROMPT_PRESETS.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
            <option value="Custom">Custom</option>
          </select>
        </div>

        {/* System Prompt Textarea */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-300">
              System Prompt
            </label>
            <span className="text-xs text-gray-400">
              {characterCount} characters
            </span>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder="Enter system prompt instructions..."
            rows={4}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            This prompt will guide how Voxtral processes your audio transcription.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button 
            onClick={handleResetPrompt}
            className="flex-1 py-2 px-4 bg-white/10 border border-white/20 text-white rounded-lg font-medium hover:bg-white/20 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
          
          <button 
            onClick={handleSavePrompt}
            className="flex-1 py-2 px-4 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemPromptPanel;
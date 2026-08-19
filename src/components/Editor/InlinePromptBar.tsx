import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  CornerDownLeft,
  X,
  ChevronDown,
  Loader2,
  Cpu,
} from 'lucide-react';
import { AIService, AIModel } from '../../services/aiService';

interface InlinePromptBarProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string, selectedModelId?: string) => Promise<void>;
  isGenerating?: boolean;
  activeFilePath: string;
  selectedText?: string;
  lineNumber?: number;
}

export const InlinePromptBar: React.FC<InlinePromptBarProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isGenerating = false,
  activeFilePath,
  selectedText,
  lineNumber = 1,
}) => {
  const [prompt, setPrompt] = useState('');
  const [activeModel, setActiveModel] = useState<AIModel>(() => AIService.getActiveModel());
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableModels = AIService.getAllModels();

  useEffect(() => {
    const unsub = AIService.subscribe(() => {
      setActiveModel(AIService.getActiveModel());
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Click outside to close model dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    if (isModelDropdownOpen) {
      window.addEventListener('mousedown', handleClickOutside);
      return () => window.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isModelDropdownOpen]);

  const handleSubmit = async () => {
    if (!prompt.trim() || isGenerating) return;
    await onSubmit(prompt.trim(), activeModel.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="monaco-inline-prompt-bar"
      className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-2xl bg-[#0d0e15]/95 border border-cyan-500/30 rounded-2xl shadow-floating backdrop-blur-2xl text-neutral-200 overflow-visible transition-all animate-fadeIn"
    >
      <div className="flex flex-col p-2.5 gap-2">
        {/* Top bar: Prompt Input & Actions */}
        <div className="flex items-center gap-2.5 px-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 shrink-0">
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={prompt}
            disabled={isGenerating}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedText
                ? `Edit selection (${selectedText.slice(0, 20)}...) with AI directive...`
                : `Cmd+K: Prompt Weave Agent to generate or edit at line ${lineNumber}...`
            }
            className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none disabled:opacity-50"
          />

          {/* Model Selector Trigger */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-700/80 border border-white/[0.08] text-[11px] font-mono text-neutral-300 hover:text-white transition-colors"
              title="Select AI Model"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: activeModel.color || '#00E5FF' }}
              />
              <span className="max-w-[110px] truncate">{activeModel.name.split(' ')[0]}</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {/* Model Dropdown Menu */}
            {isModelDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 max-h-64 overflow-y-auto bg-[#0d0e15] border border-white/[0.1] rounded-xl shadow-2xl p-1.5 space-y-1 z-50 custom-scrollbar">
                <div className="px-2 py-1 text-[10px] font-mono uppercase text-neutral-400 font-bold tracking-wider">
                  Select Weave Agent Model
                </div>
                {availableModels.map((m) => {
                  const isSelected = m.id === activeModel.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        AIService.setActiveModel(m.id);
                        setActiveModel(m);
                        setIsModelDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'hover:bg-neutral-800/60 text-neutral-300'
                      }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-white truncate">{m.name}</span>
                        <span className="text-[10px] text-neutral-400 truncate">{m.badge}</span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                        {m.provider}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit / Cancel Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={!prompt.trim() || isGenerating}
              onClick={handleSubmit}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                prompt.trim() && !isGenerating
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-glow-amber'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
            >
              <span>{isGenerating ? 'Synthesizing...' : 'Generate'}</span>
              <CornerDownLeft className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
              title="Close (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Prompt Chips */}
        {!isGenerating && (
          <div className="flex items-center gap-1.5 px-2 pt-1 border-t border-white/[0.05] overflow-x-auto text-[11px] text-neutral-400 custom-scrollbar">
            <span className="text-neutral-500 text-[10px] uppercase font-mono tracking-wider shrink-0">
              Quick:
            </span>
            <button
              type="button"
              onClick={() => setPrompt('Add dark theme block with Cyan & Amber palettes')}
              className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-cyan-300 transition-colors whitespace-nowrap"
            >
              🎨 Theme Block
            </button>
            <button
              type="button"
              onClick={() => setPrompt('Add asynchronous resource users = fetch("/api/users")')}
              className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-cyan-300 transition-colors whitespace-nowrap"
            >
              ⚡ REST Resource
            </button>
            <button
              type="button"
              onClick={() => setPrompt('Add Reset button with reactive count = 0 handler')}
              className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-cyan-300 transition-colors whitespace-nowrap"
            >
              🔄 Reset Handler
            </button>
            <button
              type="button"
              onClick={() => setPrompt('Refactor layout to responsive HStack with gap: 16')}
              className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-cyan-300 transition-colors whitespace-nowrap"
            >
              📐 HStack Layout
            </button>
          </div>
        )}

        {/* Generating Feedback */}
        {isGenerating && (
          <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-cyan-400 font-mono">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              <span>Weave Agent reasoning on {activeModel.name}...</span>
            </div>
            <span className="text-[10px] text-neutral-500">Target: {activeFilePath.split('/').pop()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default InlinePromptBar;

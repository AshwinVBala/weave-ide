import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Palette,
  Database,
  Zap,
  Maximize2,
  Send,
  Wand2,
} from 'lucide-react';
import { AIService } from '../../services/aiService';

export interface SelectedElementInfo {
  tagName: string;
  innerText?: string;
  className?: string;
  rect?: { top: number; left: number; width: number; height: number };
}

interface PointAndPromptPopoverProps {
  elementInfo: SelectedElementInfo | null;
  onClose: () => void;
  currentCode: string;
  activeFilePath: string;
  onApplyCode: (newCode: string) => void;
}

export const PointAndPromptPopover: React.FC<PointAndPromptPopoverProps> = ({
  elementInfo,
  onClose,
  currentCode,
  activeFilePath,
  onApplyCode,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (elementInfo) {
      setPrompt('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [elementInfo]);

  if (!elementInfo) return null;

  const quickDirectives = [
    {
      label: '🎨 Change theme color',
      directive: `Change styling and colors for ${elementInfo.tagName} using theme tokens`,
      icon: <Palette className="w-3.5 h-3.5 text-amber-400" />,
    },
    {
      label: '🌐 Bind to resource data',
      directive: `Bind ${elementInfo.tagName} to dynamic asynchronous resource data`,
      icon: <Database className="w-3.5 h-3.5 text-cyan-400" />,
    },
    {
      label: '⚡ Add reactive click handler',
      directive: `Add interactive onClick handler with reactive store mutation to ${elementInfo.tagName}`,
      icon: <Zap className="w-3.5 h-3.5 text-emerald-400" />,
    },
    {
      label: '📐 Adjust gap & padding',
      directive: `Adjust gap and padding layout styling on ${elementInfo.tagName}`,
      icon: <Maximize2 className="w-3.5 h-3.5 text-purple-400" />,
    },
  ];

  const handleExecute = async (directiveText: string) => {
    if (!directiveText.trim() || isExecuting) return;

    setIsExecuting(true);
    try {
      const fullPrompt = `For component element <${elementInfo.tagName}>: ${directiveText.trim()}`;
      const res = await AIService.executePrompt(fullPrompt, currentCode, activeFilePath);
      if (res.patch) {
        onApplyCode(res.patch.modifiedCode);
      }
      onClose();
    } catch (err) {
      console.error('Failed to execute point-and-prompt directive:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div
      data-testid="point-and-prompt-popover"
      className="absolute bottom-4 left-4 right-4 z-40 bg-[#121624]/95 border border-cyan-500/40 rounded-2xl shadow-2xl p-3.5 backdrop-blur-2xl text-neutral-200 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-glow-cyan">
            <Wand2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white font-mono">&lt;{elementInfo.tagName}&gt;</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/20">
                AI Directives
              </span>
            </div>
            {elementInfo.innerText && (
              <span className="text-[10px] text-neutral-400 font-mono truncate max-w-[200px] inline-block">
                &ldquo;{elementInfo.innerText.slice(0, 30)}&rdquo;
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
          title="Dismiss Popover"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Directives list */}
      <div className="grid grid-cols-2 gap-1.5 mb-2.5">
        {quickDirectives.map((qd, idx) => (
          <button
            key={idx}
            onClick={() => handleExecute(qd.directive)}
            disabled={isExecuting}
            className="flex items-center gap-2 p-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/60 hover:border-cyan-500/40 text-left transition-colors text-xs text-neutral-300 hover:text-white group"
          >
            {qd.icon}
            <span className="text-[11px] font-medium leading-tight">{qd.label}</span>
          </button>
        ))}
      </div>

      {/* Custom Directive Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleExecute(prompt);
        }}
        className="flex items-center gap-1.5 bg-[#0a0c10] rounded-xl border border-neutral-700 focus-within:border-cyan-500/80 p-1 transition-colors"
      >
        <Sparkles className="w-4 h-4 text-cyan-400 ml-2 animate-pulse shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`Prompt Weave Agent for this <${elementInfo.tagName}>...`}
          className="w-full bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none px-2 py-1"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || isExecuting}
          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
            prompt.trim() && !isExecuting
              ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-glow-cyan'
              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
          }`}
          title="Execute Directive"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};

export default PointAndPromptPopover;

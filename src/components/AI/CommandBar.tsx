import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  FileCode,
  Palette,
  Database,
  RefreshCw,
  Layers,
  Terminal,
  Eye,
  CornerDownLeft,
  X,
  Zap,
} from 'lucide-react';
import { AIService } from '../../services/aiService';

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  currentCode: string;
  activeFilePath: string;
  onApplyCode: (newCode: string) => void;
  onRunFile?: () => void;
  onBuildProject?: () => void;
  onToggleTerminal?: () => void;
  onTogglePreview?: () => void;
  onToggleFileTree?: () => void;
}

interface CommandAction {
  id: string;
  category: 'Compiler & Build' | 'AI Synthesis' | 'Design & Themes' | 'Data & Stores' | 'Studio Navigation';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  prompt?: string;
  action?: () => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  isOpen,
  onClose,
  currentCode,
  activeFilePath,
  onApplyCode,
  onRunFile,
  onBuildProject,
  onToggleTerminal,
  onTogglePreview,
  onToggleFileTree,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commandActions: CommandAction[] = [
    {
      id: 'cmd-run-file',
      category: 'Compiler & Build',
      title: 'Run Active Weave File',
      subtitle: `Execute ${activeFilePath.split('/').pop() || 'main.wv'} with the active Weave runtime (F5)`,
      icon: <CornerDownLeft className="w-4 h-4 text-emerald-400" />,
      action: () => {
        onRunFile?.();
        onClose();
      },
    },
    {
      id: 'cmd-build-release',
      category: 'Compiler & Build',
      title: 'Build Release Target',
      subtitle: 'Compile and validate the current workspace (Ctrl+Shift+B)',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      action: () => {
        onBuildProject?.();
        onClose();
      },
    },
    {
      id: 'ai-add-resource',
      category: 'Data & Stores',
      title: 'Bind REST API Resource',
      subtitle: 'Inject resource users = fetch("...") with async loading states',
      icon: <Database className="w-4 h-4 text-cyan-400" />,
      prompt: 'Add an asynchronous resource fetch for /api/users with loading states',
    },
    {
      id: 'ai-create-theme',
      category: 'Design & Themes',
      title: 'Generate StudioTheme Design Tokens',
      subtitle: 'Create theme block with Amber and Cyan brand color palettes',
      icon: <Palette className="w-4 h-4 text-amber-400" />,
      prompt: 'Create a dark theme with Cyan and Amber accents and apply to layout',
    },
    {
      id: 'ai-scaffold-todo',
      category: 'AI Synthesis',
      title: 'Scaffold Todo App Component',
      subtitle: 'Generate complete Todo component with store, TextField, and buttons',
      icon: <Layers className="w-4 h-4 text-purple-400" />,
      prompt: 'Scaffold a complete interactive TodoApp with reactive state',
    },
    {
      id: 'ai-add-reset',
      category: 'Data & Stores',
      title: 'Add Reactive Reset Handler',
      subtitle: 'Synthesize Reset button with store reset handler (count = 0)',
      icon: <RefreshCw className="w-4 h-4 text-emerald-400" />,
      prompt: 'Add a Reset button with count = 0 reactive handler',
    },
    {
      id: 'nav-toggle-preview',
      category: 'Studio Navigation',
      title: 'Toggle Live Canvas Preview',
      subtitle: 'Open or close the interactive WebAssembly/React preview',
      icon: <Eye className="w-4 h-4 text-sky-400" />,
      action: () => {
        onTogglePreview?.();
        onClose();
      },
    },
    {
      id: 'nav-toggle-terminal',
      category: 'Studio Navigation',
      title: 'Toggle Terminal Overlay Drawer',
      subtitle: 'Open or hide the bottom interactive terminal drawer',
      icon: <Terminal className="w-4 h-4 text-yellow-400" />,
      action: () => {
        onToggleTerminal?.();
        onClose();
      },
    },
    {
      id: 'nav-toggle-files',
      category: 'Studio Navigation',
      title: 'Toggle File Tree Overlay',
      subtitle: 'Open workspace file explorer popover',
      icon: <FileCode className="w-4 h-4 text-indigo-400" />,
      action: () => {
        onToggleFileTree?.();
        onClose();
      },
    },
  ];

  // Filter commands by query
  const filteredCommands = query.trim()
    ? commandActions.filter(
        (c) =>
          c.title.toLowerCase().includes(query.toLowerCase()) ||
          c.subtitle.toLowerCase().includes(query.toLowerCase()) ||
          c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commandActions;

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation inside CommandBar
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? Math.max(0, filteredCommands.length - 1) : prev - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeCurrentSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, query]);

  const executeCurrentSelection = async () => {
    if (isExecuting) return;

    // If there is a selected matching action
    if (filteredCommands.length > 0 && selectedIndex < filteredCommands.length && !query.startsWith('>')) {
      const selected = filteredCommands[selectedIndex];
      if (selected.action) {
        selected.action();
        return;
      }
      if (selected.prompt) {
        setIsExecuting(true);
        try {
          const res = await AIService.executePrompt(selected.prompt, currentCode, activeFilePath);
          if (res.patch) {
            onApplyCode(res.patch.modifiedCode);
          }
          onClose();
        } finally {
          setIsExecuting(false);
        }
        return;
      }
    }

    // Otherwise treat the query as a direct natural language prompt to AI
    if (query.trim()) {
      setIsExecuting(true);
      try {
        const res = await AIService.executePrompt(query.trim(), currentCode, activeFilePath);
        if (res.patch) {
          onApplyCode(res.patch.modifiedCode);
        }
        onClose();
      } finally {
        setIsExecuting(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="global-ai-command-bar"
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-start justify-center pt-24 px-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0f121a]/95 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-neutral-800 gap-3 bg-studio-glass">
          <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or natural language instruction (e.g. 'Add theme block with cyan accents')..."
            className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
            <span>ESC</span>
          </div>
        </div>

        {/* Command list */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    setSelectedIndex(idx);
                    executeCurrentSelection();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-950/40 to-neutral-900 border border-cyan-500/40 text-white shadow-sm'
                      : 'hover:bg-neutral-900/60 text-neutral-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-neutral-800/80 text-neutral-400'
                      }`}
                    >
                      {cmd.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white truncate">{cmd.title}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                          {cmd.category}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400 truncate">{cmd.subtitle}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400">
                        <span>Execute</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-neutral-400 flex flex-col items-center gap-2">
              <Zap className="w-8 h-8 text-amber-400" />
              <div className="text-xs font-semibold text-white">Direct AI Instruction</div>
              <div className="text-[11px] text-neutral-400 max-w-sm">
                Press <strong className="text-cyan-400 font-mono">Enter</strong> to send &ldquo;{query}&rdquo; to the active Weave Agent model to synthesize code.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#0c0e14] border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Sparkles className="w-3 h-3" />
            <span>AI Studio Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandBar;

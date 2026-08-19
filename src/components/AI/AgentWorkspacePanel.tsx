import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  User,
  Send,
  Wrench,
  FileCode,
  Check,
  Copy,
  ChevronDown,
  Cpu,
  X,
  ArrowUpRight,
  GitBranch,
} from 'lucide-react';
import {
  AIService,
  AIModel,
  AVAILABLE_MODELS,
  AIMessage,
  ContextFileChip,
} from '../../services/aiService';

interface AgentWorkspacePanelProps {
  currentCode: string;
  activeFilePath: string;
  onApplyPatch: (newCode: string) => void;
  onOpenFile: (filePath: string) => void;
}

export const AgentWorkspacePanel: React.FC<AgentWorkspacePanelProps> = ({
  currentCode,
  activeFilePath,
  onApplyPatch,
  onOpenFile,
}) => {
  const [messages, setMessages] = useState<AIMessage[]>(AIService.getMessages());
  const [activeModel, setActiveModel] = useState<AIModel>(AIService.getActiveModel());
  const [contextFiles, setContextFiles] = useState<ContextFileChip[]>(AIService.getContextFiles());
  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [copiedPatchId, setCopiedPatchId] = useState<string | null>(null);
  const [appliedPatchId, setAppliedPatchId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync state with AIService subscriptions
  useEffect(() => {
    const unsubscribe = AIService.subscribe(() => {
      setMessages(AIService.getMessages());
      setActiveModel(AIService.getActiveModel());
      setContextFiles(AIService.getContextFiles());
    });
    return unsubscribe;
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll thought stream
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Handle active file context chip automatically
  useEffect(() => {
    if (activeFilePath) {
      const fileName = activeFilePath.split('/').pop() || 'file.wv';
      AIService.addContextFile({
        id: activeFilePath,
        path: activeFilePath,
        name: fileName,
        kind: fileName.includes('Theme') ? 'theme' : fileName.includes('store') ? 'store' : 'component',
        isActive: true,
      });
    }
  }, [activeFilePath]);

  const handleSendPrompt = async (promptToSend?: string) => {
    const prompt = (promptToSend || inputPrompt).trim();
    if (!prompt || isProcessing) return;

    setInputPrompt('');
    setIsProcessing(true);

    try {
      await AIService.executePrompt(prompt, currentCode, activeFilePath);
    } catch (err) {
      console.error('Agent prompt execution failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyPatch = (msgId: string, newCode: string) => {
    onApplyPatch(newCode);
    setAppliedPatchId(msgId);
    setTimeout(() => setAppliedPatchId(null), 3000);
  };

  const handleCopyCode = (msgId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPatchId(msgId);
    setTimeout(() => setCopiedPatchId(null), 2000);
  };

  const quickPrompts = [
    { label: '⚡ Add API Resource', prompt: 'Add an asynchronous resource fetch for /api/users with loading states' },
    { label: '🎨 Create Studio Theme', prompt: 'Create a dark theme with Cyan and Amber accents and apply to layout' },
    { label: '🔄 Add Reset Button', prompt: 'Add a Reset button with count = 0 reactive handler' },
    { label: '📋 Scaffold Todo App', prompt: 'Scaffold a complete interactive TodoApp with reactive state' },
  ];

  return (
    <div
      data-testid="agent-workspace-panel"
      className="flex flex-col h-full w-full bg-studio-card backdrop-blur-xl border-r border-studio-border text-neutral-200 overflow-hidden font-sans select-none"
    >
      {/* 1. Header: Agent identity and Model Swapper */}
      <div className="p-3 border-b border-studio-border flex flex-col gap-2.5 bg-studio-glass">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-cyan-400 flex items-center justify-center text-white shadow-glow-cyan">
                <Bot className="w-3.5 h-3.5 text-black" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0a0c10]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-wide">Weave Agent</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  ONLINE
                </span>
              </div>
            </div>
          </div>

          {/* Model Selector Dropdown Trigger */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              data-testid="agent-model-selector-btn"
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/60 text-xs text-neutral-200 transition-colors shadow-sm"
              title="Select Active AI Reasoning Model"
            >
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span className="font-medium text-[11px] max-w-[110px] truncate">{activeModel.name}</span>
              <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Model Dropdown Menu */}
            {isModelDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#141824] border border-neutral-700 rounded-lg shadow-2xl p-1.5 z-50 flex flex-col gap-1 backdrop-blur-2xl">
                <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-neutral-400 border-b border-neutral-800">
                  Select Reasoning Model
                </div>
                {AVAILABLE_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      AIService.setActiveModel(model.id);
                      setIsModelDropdownOpen(false);
                    }}
                    className={`flex flex-col items-start p-2 rounded text-left transition-colors ${
                      activeModel.id === model.id
                        ? 'bg-cyan-500/15 border border-cyan-500/30 text-white'
                        : 'hover:bg-neutral-800/80 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold">{model.name}</span>
                      <span className="text-[9px] px-1 rounded font-mono bg-neutral-800 text-neutral-400">
                        {model.contextWindow}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">{model.badge}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Context File Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pt-1">
          <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1 shrink-0">
            <GitBranch className="w-2.5 h-2.5 text-amber-400" />
            Context:
          </span>
          {contextFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => onOpenFile(file.path)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-900/80 border border-neutral-700/80 hover:border-cyan-500/50 text-[10px] text-neutral-300 cursor-pointer transition-colors group shrink-0"
              title={`File in AI Context: ${file.path}`}
            >
              <FileCode className="w-2.5 h-2.5 text-cyan-400" />
              <span className="font-mono">{file.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  AIService.removeContextFile(file.path);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity ml-0.5"
                title="Remove from context"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          {contextFiles.length === 0 && (
            <span className="text-[10px] text-neutral-500 italic">No files in active context</span>
          )}
        </div>
      </div>

      {/* 3. Thought Stream & Conversation History */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1.5 ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            {/* Sender identity */}
            <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono px-1">
              {msg.role === 'user' ? (
                <>
                  <span>You</span>
                  <User className="w-3 h-3 text-amber-400" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-cyan-400" />
                  <span className="font-semibold text-cyan-300">Weave Agent</span>
                  {msg.model && <span className="text-neutral-500">• {msg.model}</span>}
                </>
              )}
            </div>

            {/* Bubble Container */}
            <div
              className={`p-3 rounded-xl text-xs max-w-[95%] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-white'
                  : 'bg-[#121622] border border-neutral-700/60 text-neutral-200 shadow-glass'
              }`}
            >
              {/* Message text */}
              {msg.content && (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}

              {/* Thought Stream / Reasoning steps */}
              {msg.reasoningSteps && msg.reasoningSteps.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-neutral-800 flex flex-col gap-1 bg-black/20 p-2 rounded-lg">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 font-semibold">
                    <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
                    <span>Thought Stream & AST Analysis:</span>
                  </div>
                  <ul className="space-y-0.5 text-[11px] text-neutral-400 font-mono pl-3 list-disc">
                    {msg.reasoningSteps.map((step, idx) => (
                      <li key={idx} className="leading-snug">{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tool Calls Log */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {msg.toolCalls.map((tool, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/40 text-[10px] text-cyan-300 font-mono"
                    >
                      <Wrench className="w-2.5 h-2.5 text-cyan-400" />
                      <span>{tool.tool}</span>
                      <span className="text-emerald-400">✓</span>
                    </div>
                  ))}
                </div>
              )}

              {/* AST Diff Code Patch */}
              {msg.patch && (
                <div className="mt-3 border border-neutral-700 rounded-lg overflow-hidden bg-[#0c0e14]">
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-neutral-900 border-b border-neutral-800">
                    <div className="flex items-center gap-1.5">
                      <FileCode className="w-3 h-3 text-amber-400" />
                      <span className="text-[11px] font-mono font-medium text-neutral-300">
                        {msg.patch.filePath}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyCode(msg.id, msg.patch!.modifiedCode)}
                        className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-300 transition-colors flex items-center gap-1"
                        title="Copy Code"
                      >
                        {copiedPatchId === msg.id ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                        <span>{copiedPatchId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={() => handleApplyPatch(msg.id, msg.patch!.modifiedCode)}
                        className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-medium transition-colors flex items-center gap-1 shadow-sm"
                        title="Apply Code Patch to Monaco Editor"
                      >
                        {appliedPatchId === msg.id ? <Check className="w-2.5 h-2.5 text-white" /> : <ArrowUpRight className="w-2.5 h-2.5" />}
                        <span>{appliedPatchId === msg.id ? 'Applied!' : 'Apply Patch'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Diff Snippet */}
                  <div className="p-2 max-h-44 overflow-y-auto font-mono text-[10.5px] leading-relaxed custom-scrollbar">
                    {msg.patch.diffLines?.map((line, idx) => (
                      <div
                        key={idx}
                        className={`px-1 rounded-sm ${
                          line.type === 'add'
                            ? 'bg-emerald-950/40 text-emerald-300'
                            : line.type === 'del'
                            ? 'bg-rose-950/40 text-rose-300 line-through opacity-70'
                            : 'text-neutral-400'
                        }`}
                      >
                        <span className="select-none opacity-40 inline-block w-4">
                          {line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}
                        </span>
                        {line.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-cyan-400 p-2 font-mono bg-cyan-950/20 border border-cyan-800/30 rounded-lg animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Agent reasoning and generating AST diff...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Quick Directive Suggestions */}
      <div className="px-3 py-1.5 border-t border-studio-border bg-studio-glass/60 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSendPrompt(qp.prompt)}
            className="px-2 py-1 rounded-md bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/60 text-[10.5px] text-neutral-300 hover:text-white shrink-0 transition-colors"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* 5. Prompt Input Box */}
      <div className="p-2.5 border-t border-studio-border bg-studio-glass">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt();
          }}
          className="relative flex items-end bg-[#0f121a] rounded-xl border border-neutral-700 focus-within:border-cyan-500/80 transition-colors p-1.5"
        >
          <textarea
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendPrompt();
              }
            }}
            placeholder="Instruct Weave Agent (e.g. 'Add theme block with cyan accents')..."
            rows={2}
            className="w-full bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none resize-none px-2 py-1 custom-scrollbar"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isProcessing}
            data-testid="btn-agent-send-prompt"
            className={`p-2 rounded-lg transition-all shrink-0 ${
              inputPrompt.trim() && !isProcessing
                ? 'bg-gradient-to-r from-amber-500 to-cyan-500 text-black shadow-glow-cyan hover:opacity-90'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            }`}
            title="Send to Weave Agent (Enter)"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-1 px-1">
          <span>Press Enter to send, Shift+Enter for newline</span>
          <span>Cmd+K for Global Command Bar</span>
        </div>
      </div>
    </div>
  );
};

export default AgentWorkspacePanel;

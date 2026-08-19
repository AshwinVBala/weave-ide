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
  X,
  ArrowUpRight,
  GitBranch,
} from 'lucide-react';
import {
  AIService,
  AIMessage,
  ContextFileChip,
} from '../../services/aiService';
import { ModelSelectorDropdown } from './ModelSelectorDropdown';

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
  const [contextFiles, setContextFiles] = useState<ContextFileChip[]>(AIService.getContextFiles());
  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedPatchId, setCopiedPatchId] = useState<string | null>(null);
  const [appliedPatchId, setAppliedPatchId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync state with AIService subscriptions
  useEffect(() => {
    const unsubscribe = AIService.subscribe(() => {
      setMessages(AIService.getMessages());
      setContextFiles(AIService.getContextFiles());
    });
    return unsubscribe;
  }, []);

  // Auto-scroll thought stream
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Handle active file context chip automatically
  useEffect(() => {
    AIService.setActiveContextFile(activeFilePath);
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

  return (
    <div
      data-testid="agent-workspace-panel"
      className="flex flex-col h-full w-full bg-[#08090c] text-[#F9FAFB] overflow-hidden font-sans select-none"
    >
      {/* 1. Header: Ultra-minimalist Stealth Header */}
      <div className="px-3 py-2.5 border-b border-white/[0.05] flex flex-col gap-2 bg-[#08090c]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[#F9FAFB]">
              <Sparkles className="w-3 h-3 text-[#FF9D00]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#F9FAFB]">Weave Agent</span>
            </div>
          </div>

          {/* Dynamic Model Selector Dropdown */}
          <ModelSelectorDropdown align="right" testId="agent-model-selector-btn" />
        </div>

        {/* 2. Context File Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          <span className="text-[10px] text-[#6B7280] font-mono flex items-center gap-1 shrink-0">
            <GitBranch className="w-2.5 h-2.5 text-[#6B7280]" />
            Context:
          </span>
          {contextFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => onOpenFile(file.path)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.15] text-[10px] text-[#6B7280] hover:text-[#F9FAFB] cursor-pointer transition-colors group shrink-0"
              title={`File in AI Context: ${file.path}`}
            >
              <FileCode className="w-2.5 h-2.5 text-[#6B7280] group-hover:text-[#F9FAFB]" />
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
            <span className="text-[10px] text-[#6B7280] italic">No files in active context</span>
          )}
        </div>
      </div>

      {/* 3. Thought Stream & Flat Borderless Conversation Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-1 w-full items-start">
            {/* Sender identity */}
            <div className="flex items-center gap-1 text-[10px] text-[#6B7280] font-mono">
              {msg.role === 'user' ? (
                <>
                  <User className="w-2.5 h-2.5 text-[#6B7280]" />
                  <span>You</span>
                </>
              ) : (
                <>
                  <Bot className="w-2.5 h-2.5 text-[#FF9D00]" />
                  <span className="font-medium text-[#F9FAFB]">Weave Agent</span>
                  {msg.model && <span className="text-[#6B7280]">• {msg.model}</span>}
                </>
              )}
            </div>

            {/* Flat Borderless Stream Content */}
            <div className="w-full select-text">
              {/* Message text */}
              {msg.content && (
                <div
                  className={`text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'text-[#F9FAFB] font-normal'
                      : 'text-[#9CA3AF]'
                  }`}
                >
                  {msg.content}
                </div>
              )}

              {/* Thought Stream / Reasoning steps */}
              {msg.reasoningSteps && msg.reasoningSteps.length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-[#6B7280] font-medium">
                    <Sparkles className="w-2.5 h-2.5 text-[#FF9D00]" />
                    <span>Thought Stream:</span>
                  </div>
                  <ul className="space-y-0.5 text-[11px] text-[#6B7280] font-mono pl-3 list-disc">
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
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-[10px] text-[#6B7280] font-mono"
                    >
                      <Wrench className="w-2.5 h-2.5 text-[#6B7280]" />
                      <span>{tool.tool}</span>
                      <span className="text-emerald-400">✓</span>
                    </div>
                  ))}
                </div>
              )}

              {/* AST Diff Code Patch in soft inline block */}
              {msg.patch && (
                <div className="mt-2.5 border border-white/[0.05] rounded-lg overflow-hidden bg-white/[0.02]">
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-white/[0.02] border-b border-white/[0.04]">
                    <div className="flex items-center gap-1.5">
                      <FileCode className="w-3 h-3 text-[#6B7280]" />
                      <span className="text-[11px] font-mono font-medium text-[#F9FAFB]">
                        {msg.patch.filePath}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyCode(msg.id, msg.patch!.modifiedCode)}
                        className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[10px] text-[#6B7280] hover:text-[#F9FAFB] transition-colors flex items-center gap-1"
                        title="Copy Code"
                      >
                        {copiedPatchId === msg.id ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                        <span>{copiedPatchId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={() => handleApplyPatch(msg.id, msg.patch!.modifiedCode)}
                        className="px-2 py-0.5 rounded bg-[#FF9D00] hover:bg-[#ffaa1a] text-black font-semibold text-[10px] transition-colors flex items-center gap-1"
                        title="Apply Code Patch to Monaco Editor"
                      >
                        {appliedPatchId === msg.id ? <Check className="w-2.5 h-2.5 text-black" /> : <ArrowUpRight className="w-2.5 h-2.5" />}
                        <span>{appliedPatchId === msg.id ? 'Applied!' : 'Apply Patch'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Diff Snippet */}
                  <div className="p-2 max-h-48 overflow-y-auto font-mono text-[10.5px] leading-relaxed custom-scrollbar">
                    {msg.patch.diffLines?.map((line, idx) => (
                      <div
                        key={idx}
                        className={`px-1 rounded-sm ${
                          line.type === 'add'
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : line.type === 'del'
                            ? 'bg-rose-500/10 text-rose-300 line-through opacity-60'
                            : 'text-[#6B7280]'
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
          <div className="flex items-center gap-2 text-xs text-[#FF9D00] p-2 font-mono bg-white/[0.02] border border-white/[0.04] rounded-lg animate-pulse">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-[#FF9D00]" />
            <span>Agent reasoning and generating AST diff...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Single Clean Borderless Prompt Textarea (Destroyed Legacy Pills) */}
      <div className="p-3 border-t border-white/[0.05] bg-[#08090c]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt();
          }}
          className="relative flex items-end bg-transparent"
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
            placeholder="Instruct Weave Agent..."
            rows={2}
            className="w-full bg-transparent text-xs text-[#F9FAFB] placeholder-[#6B7280] focus:outline-none resize-none pr-8 custom-scrollbar border-none outline-none ring-0 focus:ring-0"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isProcessing}
            data-testid="btn-agent-send-prompt"
            className={`p-1.5 rounded-md transition-all shrink-0 mb-0.5 ${
              inputPrompt.trim() && !isProcessing
                ? 'bg-[#FF9D00] text-black hover:bg-[#ffaa1a]'
                : 'text-[#6B7280] hover:text-[#F9FAFB] cursor-not-allowed opacity-40'
            }`}
            title="Send to Weave Agent (Enter)"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="flex items-center justify-between text-[10px] text-[#6B7280] mt-1">
          <span>Enter to send • ⇧Enter for newline</span>
          <span>⌘K for commands</span>
        </div>
      </div>
    </div>
  );
};

export default AgentWorkspacePanel;

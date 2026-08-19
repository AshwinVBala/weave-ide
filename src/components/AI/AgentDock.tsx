import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Bot,
  Check,
  ChevronDown,
  Copy,
  FileCode2,
  GitBranch,
  Plus,
  Send,
  Sparkles,
  Square,
  Trash2,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { AIMessage, AIService, ContextFileChip } from '../../services/aiService';
import { agentRuntimeService } from '../../services/agentRuntimeService';
import { ModelSelectorDropdown } from './ModelSelectorDropdown';

interface AgentDockProps {
  currentCode: string;
  activeFilePath: string;
  onApplyPatch: (newCode: string) => void;
  onOpenFile: (filePath: string) => void;
  onClose: () => void;
}

const SUGGESTIONS = ['Explain this file', 'Add a REST resource', 'Add a polished dark theme'];
const cleanText = (value: string) => value.replace(/\*\*(.*?)\*\*/g, '$1');

export const AgentDock: React.FC<AgentDockProps> = ({
  currentCode,
  activeFilePath,
  onApplyPatch,
  onOpenFile,
  onClose,
}) => {
  const [messages, setMessages] = useState<AIMessage[]>(AIService.getMessages());
  const [contextFiles, setContextFiles] = useState<ContextFileChip[]>(AIService.getContextFiles());
  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedPatchId, setCopiedPatchId] = useState<string | null>(null);
  const [appliedPatchId, setAppliedPatchId] = useState<string | null>(null);
  const [requestController, setRequestController] = useState<AbortController | null>(null);
  const [connectionState, setConnectionState] = useState({ label: 'checking connection', ready: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const visibleMessages = useMemo(() => messages.filter((message) => message.role !== 'system'), [messages]);
  const activeModel = AIService.getActiveModel();

  useEffect(() => AIService.subscribe(() => {
    setMessages(AIService.getMessages());
    setContextFiles(AIService.getContextFiles());
  }), []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  useEffect(() => {
    if (activeFilePath) AIService.setActiveContextFile(activeFilePath);
  }, [activeFilePath]);

  useEffect(() => {
    let disposed = false;
    const inspectConnection = async () => {
      if (activeModel.provider === 'Ollama') {
        setConnectionState({ label: 'local endpoint', ready: true });
        return;
      }
      if (!agentRuntimeService.isAvailable) {
        setConnectionState({ label: 'desktop app required', ready: false });
        return;
      }
      const authMode = AIService.getAuthMode(activeModel.provider);
      try {
        const statuses = await agentRuntimeService.checkProviders();
        const status = statuses.find((entry) => entry.provider === activeModel.provider);
        if (disposed) return;
        if (authMode === 'api_key') {
          setConnectionState({
            label: status?.hasApiKey ? 'API key connected' : 'API key required',
            ready: Boolean(status?.hasApiKey),
          });
        } else if (activeModel.provider === 'Google' && status?.installed) {
          setConnectionState({ label: 'account checked on send', ready: true });
        } else {
          setConnectionState({
            label: status?.authenticated ? 'account connected' : 'connect in Settings',
            ready: Boolean(status?.authenticated),
          });
        }
      } catch {
        if (!disposed) setConnectionState({ label: 'connection unavailable', ready: false });
      }
    };
    inspectConnection();
    const refreshOnFocus = () => inspectConnection();
    const interval = window.setInterval(inspectConnection, 15000);
    window.addEventListener('focus', refreshOnFocus);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [activeModel.id, activeModel.provider]);

  const handleSendPrompt = async (promptToSend?: string) => {
    const prompt = (promptToSend || inputPrompt).trim();
    if (!prompt || isProcessing) return;
    const controller = new AbortController();
    setInputPrompt('');
    setIsProcessing(true);
    setRequestController(controller);
    try {
      await AIService.executePrompt(prompt, currentCode, activeFilePath, controller.signal);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) console.error('Agent request failed:', error);
    } finally {
      setIsProcessing(false);
      setRequestController(null);
      inputRef.current?.focus();
    }
  };

  const handleApplyPatch = (messageId: string, code: string) => {
    onApplyPatch(code);
    setAppliedPatchId(messageId);
    window.setTimeout(() => setAppliedPatchId(null), 2400);
  };

  const handleCopyCode = async (messageId: string, code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedPatchId(messageId);
    window.setTimeout(() => setCopiedPatchId(null), 1800);
  };

  return (
    <div data-testid="agent-dock" className="agent-workspace flex flex-col h-full w-full overflow-hidden text-[#e7e9ee] select-none">
      <div className="agent-header h-12 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="agent-mark w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#f4ad6b]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold text-[#f3f4f7]">Weave Agent</span>
              <span className={`w-1.5 h-1.5 rounded-full ${connectionState.ready ? 'bg-[#68c497] shadow-[0_0_8px_rgba(104,196,151,.45)]' : 'bg-[#d28a65]'}`} />
            </div>
            <span className="text-[9px] text-[#5f6470]">{activeModel.provider} · {connectionState.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => AIService.clearConversation()} className="agent-icon-button" title="New conversation" aria-label="New conversation"><Plus className="w-3.5 h-3.5" /></button>
          <button onClick={() => AIService.clearConversation()} className="agent-icon-button" title="Clear conversation" aria-label="Clear conversation"><Trash2 className="w-3.5 h-3.5" /></button>
          <button onClick={onClose} className="agent-icon-button" title="Close agent" aria-label="Close agent"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-white/[0.045] flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
        <GitBranch className="w-3 h-3 text-[#4f545f] shrink-0" />
        {contextFiles.map((file) => (
          <button key={file.path} onClick={() => onOpenFile(file.path)} className={`context-chip group ${file.isActive ? 'context-chip-active' : ''}`} title={file.path}>
            <FileCode2 className="w-3 h-3" />
            <span className="truncate max-w-[115px]">{file.name}</span>
            <span role="button" aria-label={`Remove ${file.name} from context`} onClick={(event) => { event.stopPropagation(); AIService.removeContextFile(file.path); }} className="opacity-0 group-hover:opacity-100 hover:text-[#e38b8b]">
              <X className="w-2.5 h-2.5" />
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
        <div className="space-y-5">
          {visibleMessages.map((message) => (
            <article key={message.id} className={`message-row ${message.role}`}>
              <div className={`message-avatar ${message.role}`}>
                {message.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-semibold text-[#a8acb6]">{message.role === 'user' ? 'You' : 'Weave'}</span>
                  {message.role === 'assistant' && (message.runtime || message.model) && <span className="text-[9px] text-[#4f545f] truncate">{message.runtime || message.model}</span>}
                </div>
                {message.content && <div className={`message-content ${message.role} ${message.isError ? '!text-[#d99a83]' : ''}`}>{cleanText(message.content)}</div>}

                {message.reasoningSteps && message.reasoningSteps.length > 0 && (
                  <details className="agent-activity mt-2">
                    <summary className="flex items-center gap-1.5 cursor-pointer text-[10px] text-[#646976] hover:text-[#9ba0aa]">
                      <ChevronDown className="w-3 h-3 details-chevron" />
                      <span>Agent activity</span><span className="text-[#3f434c]">{message.reasoningSteps.length} steps</span>
                    </summary>
                    <div className="mt-2 ml-1 pl-3 border-l border-white/[0.07] space-y-1.5">
                      {message.reasoningSteps.map((step, index) => <div key={index} className="text-[10px] leading-relaxed text-[#5f6470]">{step}</div>)}
                      {message.toolCalls?.map((tool, index) => (
                        <div key={`${tool.tool}-${index}`} className="flex items-center gap-1.5 text-[10px] text-[#6e7380]">
                          <Wrench className="w-3 h-3 text-[#f0a35b]" /><span className="font-mono">{tool.tool}</span><Check className="w-3 h-3 text-[#68c497]" />
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {message.patch && (
                  <div className="patch-card mt-3 overflow-hidden">
                    <div className="px-2.5 py-2 flex items-center justify-between border-b border-white/[0.05]">
                      <div className="min-w-0 flex items-center gap-1.5"><FileCode2 className="w-3 h-3 text-[#f0a35b] shrink-0" /><span className="text-[10px] font-mono text-[#aeb2bb] truncate">{message.patch.filePath.split('/').pop()}</span></div>
                      <span className="text-[9px] text-[#68c497]">+{message.patch.diffLines?.filter((line) => line.type === 'add').length || 0}</span>
                    </div>
                    <div className="p-2 max-h-36 overflow-y-auto font-mono text-[9.5px] leading-[1.55] custom-scrollbar">
                      {message.patch.diffLines?.slice(0, 80).map((line, index) => (
                        <div key={index} className={`diff-row ${line.type}`}><span className="inline-block w-3 opacity-50 select-none">{line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' '}</span>{line.text || ' '}</div>
                      ))}
                    </div>
                    <div className="px-2 py-2 flex items-center justify-between border-t border-white/[0.05]">
                      <button onClick={() => handleCopyCode(message.id, message.patch!.modifiedCode)} className="secondary-action">
                        {copiedPatchId === message.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}{copiedPatchId === message.id ? 'Copied' : 'Copy'}
                      </button>
                      <button onClick={() => handleApplyPatch(message.id, message.patch!.modifiedCode)} className="apply-action">
                        {appliedPatchId === message.id ? <Check className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}<span>{appliedPatchId === message.id ? 'Applied' : 'Apply Patch'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}

          {isProcessing && (
            <div className="message-row assistant">
              <div className="message-avatar assistant"><Bot className="w-3.5 h-3.5" /></div>
              <div className="flex-1 pt-1 flex items-center gap-1.5 text-[10px] text-[#7f8490]">
                <span className="thinking-dot" /><span className="thinking-dot [animation-delay:120ms]" /><span className="thinking-dot [animation-delay:240ms]" /><span className="ml-1">Working on the active file…</span>
              </div>
            </div>
          )}

          {visibleMessages.length <= 1 && !isProcessing && (
            <div className="grid gap-1.5 pl-8">
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} onClick={() => handleSendPrompt(suggestion)} className="suggestion-button group">
                  <Sparkles className="w-3 h-3 text-[#f0a35b]" /><span>{suggestion}</span><ArrowUpRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 pt-2 shrink-0">
        <form onSubmit={(event) => { event.preventDefault(); handleSendPrompt(); }} className="composer-shell">
          <textarea
            ref={inputRef}
            value={inputPrompt}
            onChange={(event) => setInputPrompt(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSendPrompt(); } }}
            placeholder="Ask, plan, or edit with Agent…"
            rows={3}
            className="w-full bg-transparent text-[12px] leading-relaxed text-[#e7e9ee] placeholder-[#555a65] focus:outline-none resize-none custom-scrollbar"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <ModelSelectorDropdown align="left" placement="above" testId="agent-dock-model-selector-btn" />
            </div>
            {isProcessing ? (
              <button type="button" onClick={() => requestController?.abort()} className="send-button active" title="Stop generation"><Square className="w-3 h-3 fill-current" /></button>
            ) : (
              <button type="submit" disabled={!inputPrompt.trim()} data-testid="btn-agent-dock-send" className={`send-button ${inputPrompt.trim() ? 'active' : ''}`} title="Send (Enter)"><Send className="w-3.5 h-3.5" /></button>
            )}
          </div>
        </form>
        <div className="px-1 pt-1.5 text-center text-[9px] text-[#40444d]">Agent can make mistakes. Review changes before applying.</div>
      </div>
    </div>
  );
};

export default AgentDock;

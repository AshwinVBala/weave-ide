import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Cpu,
  Bot,
  ChevronDown,
  RefreshCw,
  Sparkles,
  Check,
  Zap,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { AIService, AIModel } from '../../services/aiService';

interface ModelSelectorDropdownProps {
  align?: 'left' | 'right' | 'center';
  placement?: 'auto' | 'above' | 'below';
  buttonClassName?: string;
  testId?: string;
}

export const ModelSelectorDropdown: React.FC<ModelSelectorDropdownProps> = ({
  align = 'center',
  placement = 'auto',
  buttonClassName,
  testId = 'model-selector-btn',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModel, setActiveModel] = useState<AIModel>(() => AIService.getActiveModel());
  const [allModels, setAllModels] = useState<AIModel[]>(() => AIService.getAllModels());
  const [fetchingProvider, setFetchingProvider] = useState<string | null>(null);
  const [fetchStatus, setFetchStatus] = useState<{ provider: string; count: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>('All');

  // Custom model state
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customProvider, setCustomProvider] = useState<AIModel['provider']>('Anthropic');
  const [customModelId, setCustomModelId] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({
    left: 8,
    top: 8,
    width: 360,
    maxHeight: 480,
    opensAbove: false,
  });

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const viewportPadding = 8;
    const menuGap = 6;
    const triggerRect = trigger.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - viewportPadding * 2);
    let left = triggerRect.left;
    if (align === 'center') left = triggerRect.left + triggerRect.width / 2 - width / 2;
    if (align === 'right') left = triggerRect.right - width;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - width - viewportPadding));

    const roomAbove = triggerRect.top - viewportPadding - menuGap;
    const roomBelow = window.innerHeight - triggerRect.bottom - viewportPadding - menuGap;
    const opensAbove = placement === 'above'
      || (placement === 'auto' && roomBelow < 360 && roomAbove > roomBelow);
    const availableHeight = opensAbove ? roomAbove : roomBelow;
    const maxHeight = Math.max(120, Math.min(560, availableHeight));
    const top = opensAbove
      ? Math.max(viewportPadding, triggerRect.top - menuGap - maxHeight)
      : triggerRect.bottom + menuGap;

    setMenuPosition({ left, top, width, maxHeight, opensAbove });
  }, [align, placement]);

  useEffect(() => {
    const unsubscribe = AIService.subscribe(() => {
      setActiveModel(AIService.getActiveModel());
      setAllModels(AIService.getAllModels());
    });
    return () => unsubscribe();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current
        && !dropdownRef.current.contains(target)
        && !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
        setShowCustomInput(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen, updateMenuPosition]);

  const handleSelectModel = (modelId: string) => {
    AIService.setActiveModel(modelId);
    setIsOpen(false);
    setShowCustomInput(false);
  };

  const handleFetchModels = async (provider: AIModel['provider'], e: React.MouseEvent) => {
    e.stopPropagation();
    setFetchingProvider(provider);
    setFetchStatus(null);
    try {
      const discovered = await AIService.fetchLiveModelsForProvider(provider);
      setFetchStatus({ provider, count: discovered.length });
      setTimeout(() => setFetchStatus(null), 4000);
    } catch (err) {
      console.error(`Failed to fetch models for ${provider}:`, err);
    } finally {
      setFetchingProvider(null);
    }
  };

  const handleAddCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customModelId.trim()) return;
    AIService.setCustomModel(customProvider, customModelId.trim());
    setCustomModelId('');
    setShowCustomInput(false);
    setIsOpen(false);
  };

  const providers: { name: AIModel['provider']; color: string; badge: string }[] = [
    { name: 'Anthropic', color: 'text-amber-400', badge: 'Claude 3.7 / 3.5' },
    { name: 'Google', color: 'text-cyan-400', badge: 'Gemini 2.5 / Flash' },
    { name: 'OpenAI', color: 'text-emerald-400', badge: 'GPT-4o / o3' },
    { name: 'Ollama', color: 'text-purple-400', badge: 'DeepSeek / Llama' },
  ];

  const filteredProviders = useMemo(() => {
    if (selectedProviderFilter === 'All') {
      return providers;
    }
    return providers.filter((p) => p.name === selectedProviderFilter);
  }, [selectedProviderFilter]);

  return (
    <div className="relative min-w-0 max-w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        data-testid={testId}
        aria-label="Choose AI model"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={
          buttonClassName ||
          'flex max-w-full min-w-0 items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-xs text-[#F9FAFB] transition-colors shadow-sm'
        }
      >
        <Bot className="w-3.5 h-3.5 text-[#FF9D00]" />
        <span className="font-semibold text-xs text-[#F9FAFB] max-w-[150px] truncate">
          {activeModel.name}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-[#6B7280] transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          data-testid="model-selector-dropdown-menu"
          data-placement={menuPosition.opensAbove ? 'above' : 'below'}
          role="listbox"
          aria-label="AI models"
          style={{
            left: menuPosition.left,
            top: menuPosition.top,
            width: menuPosition.width,
            maxHeight: menuPosition.maxHeight,
          }}
          className="fixed overflow-y-auto bg-[#08090c]/[0.98] border border-white/[0.1] rounded-xl shadow-2xl p-2.5 z-[100] flex flex-col gap-2 backdrop-blur-2xl text-[#F9FAFB] font-sans custom-scrollbar"
        >
          {/* Header */}
          <div className="px-1 py-0.5 text-[10px] uppercase font-bold tracking-wider text-[#6B7280] border-b border-white/[0.05] flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#FF9D00]" />
              Reasoning Models
            </span>
            <span className="text-[#FF9D00] font-mono text-[9px]">Live API Auto-Mapping</span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search models (e.g. claude, 3.7, sonnet, gemini)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-8 pr-7 py-1 text-xs text-[#F9FAFB] placeholder-[#6B7280] focus:outline-none focus:border-[#FF9D00] font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#F9FAFB]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Provider Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar text-[10.5px]">
            {['All', 'Anthropic', 'Google', 'OpenAI', 'Ollama'].map((prov) => {
              const count =
                prov === 'All'
                  ? allModels.length
                  : allModels.filter((m) => m.provider === prov).length;
              const isSelected = selectedProviderFilter === prov;
              return (
                <button
                  key={prov}
                  onClick={() => setSelectedProviderFilter(prov)}
                  className={`px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                    isSelected
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] text-[#6B7280] hover:text-[#F9FAFB] border border-transparent'
                  }`}
                >
                  <span>{prov === 'Anthropic' ? 'Claude' : prov}</span>
                  <span className="text-[9px] opacity-70 font-mono">({count})</span>
                </button>
              );
            })}
          </div>

          {fetchStatus && (
            <div className="px-2 py-1 text-[11px] rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 animate-fadeIn">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>
                Discovered {fetchStatus.count} live {fetchStatus.provider} models!
              </span>
            </div>
          )}

          {/* Grouped Provider Models */}
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto custom-scrollbar pr-0.5">
            {filteredProviders.map((p) => {
              let providerModels = allModels.filter((m) => m.provider === p.name);
              if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                providerModels = providerModels.filter(
                  (m) =>
                    m.name.toLowerCase().includes(query) ||
                    m.modelId.toLowerCase().includes(query) ||
                    m.badge.toLowerCase().includes(query) ||
                    m.description.toLowerCase().includes(query)
                );
              }

              if (providerModels.length === 0) return null;

              const isFetching = fetchingProvider === p.name;

              return (
                <div key={p.name} className="flex flex-col gap-1 bg-white/[0.02] p-1.5 rounded-lg border border-white/[0.05]">
                  <div className="flex items-center justify-between px-1.5 py-0.5 text-[11px] font-semibold text-[#F9FAFB]">
                    <span className={`flex items-center gap-1.5 ${p.color}`}>
                      <Cpu className="w-3 h-3" />
                      {p.name === 'Anthropic' ? 'Anthropic Claude' : p.name}
                    </span>
                    <button
                      onClick={(e) => handleFetchModels(p.name, e)}
                      disabled={isFetching}
                      className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[#6B7280] hover:text-[#FF9D00] border border-white/[0.05] transition-colors"
                      title={`Fetch live models directly from ${p.name} API`}
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${isFetching ? 'animate-spin text-[#FF9D00]' : ''}`} />
                      <span>{isFetching ? 'Fetching...' : 'Fetch Live APIs'}</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    {providerModels.map((model) => {
                      const isSelected = activeModel.id === model.id || activeModel.modelId === model.modelId;
                      return (
                        <button
                          key={model.id}
                          onClick={() => handleSelectModel(model.id)}
                          className={`flex flex-col items-start px-2.5 py-1.5 rounded-lg text-left transition-colors group ${
                            isSelected
                              ? 'bg-amber-500/20 border border-amber-500/40 text-white shadow-sm'
                              : 'hover:bg-white/[0.04] text-[#9CA3AF]'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-semibold flex items-center gap-1.5">
                              {isSelected && <Zap className="w-3 h-3 text-[#FF9D00] shrink-0 fill-[#FF9D00]" />}
                              {model.name}
                            </span>
                            <span
                              className="text-[9px] px-1.5 py-0.2 rounded font-mono font-medium"
                              style={{
                                backgroundColor: `${model.color}15`,
                                color: model.color,
                                border: `1px solid ${model.color}30`,
                              }}
                            >
                              {model.badge}
                            </span>
                          </div>
                          <div className="flex items-center justify-between w-full mt-0.5 text-[10px] text-[#6B7280]">
                            <span className="truncate max-w-[190px] font-mono text-[9.5px] text-[#6B7280]">
                              {model.modelId}
                            </span>
                            {model.contextWindow && (
                              <span className="font-mono text-[9px] text-[#6B7280]">
                                {model.contextWindow} ctx
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Model ID Creator */}
          <div className="mt-0.5 pt-1.5 border-t border-white/[0.05] flex flex-col gap-1.5">
            {!showCustomInput ? (
              <button
                onClick={() => setShowCustomInput(true)}
                className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-[11px] text-[#FF9D00] hover:text-[#ffaa1a] border border-white/[0.05] transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Specify Custom Model ID...</span>
              </button>
            ) : (
              <form onSubmit={handleAddCustomModel} className="flex flex-col gap-1.5 p-2 bg-[#0c0d12] rounded-lg border border-white/[0.08]">
                <div className="text-[10px] font-semibold text-[#F9FAFB]">Custom Provider & Model:</div>
                <div className="flex gap-1">
                  <select
                    value={customProvider}
                    onChange={(e) => setCustomProvider(e.target.value as any)}
                    className="bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-[11px] text-[#F9FAFB] focus:outline-none"
                  >
                    <option value="Anthropic" className="bg-[#08090c] text-white">Anthropic</option>
                    <option value="Google" className="bg-[#08090c] text-white">Google</option>
                    <option value="OpenAI" className="bg-[#08090c] text-white">OpenAI</option>
                    <option value="Ollama" className="bg-[#08090c] text-white">Ollama</option>
                  </select>
                  <input
                    type="text"
                    placeholder="e.g. claude-3-7-sonnet-latest, gemini-2.5-pro, o1..."
                    value={customModelId}
                    onChange={(e) => setCustomModelId(e.target.value)}
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-[#FF9D00] font-mono"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-1.5 mt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(false)}
                    className="px-2 py-0.5 text-[10px] rounded bg-white/[0.04] text-[#6B7280] hover:text-white hover:bg-white/[0.08]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-0.5 text-[10px] rounded bg-[#FF9D00] hover:bg-[#ffaa1a] text-black font-semibold"
                  >
                    Set Model
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

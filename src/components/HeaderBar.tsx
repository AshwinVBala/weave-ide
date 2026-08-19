import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Hammer,
  Save,
  PanelLeft,
  PanelBottom,
  Plus,
  FolderOpen,
  Check,
  Sparkles,
  Command,
  ChevronDown,
  Cpu,
  Bot,
} from 'lucide-react';
import { WeaveLogo } from './Branding/WeaveLogo';
import { isTauriEnvironment } from '../services/fsService';
import {
  AIService,
  AIModel,
  AVAILABLE_MODELS,
} from '../services/aiService';

export interface HeaderBarProps {
  projectName: string;
  activeFileName?: string;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  onSave: () => void;
  onRun: () => void;
  onBuild: () => void;
  onNewFile: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isBottomPanelOpen: boolean;
  onToggleBottomPanel: () => void;
  isPreviewOpen?: boolean;
  onTogglePreview?: () => void;
  onOpenFolder?: () => void;
  onOpenCommandBar?: () => void;
  onToggleFileTreeOverlay?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  projectName,
  activeFileName,
  isSaving,
  hasUnsavedChanges,
  onSave,
  onRun,
  onBuild,
  onNewFile,
  isSidebarOpen,
  onToggleSidebar,
  isBottomPanelOpen,
  onToggleBottomPanel,
  isPreviewOpen,
  onTogglePreview,
  onOpenFolder,
  onOpenCommandBar,
}) => {
  const isTauri = isTauriEnvironment();
  const [activeModel, setActiveModel] = useState<AIModel>(AIService.getActiveModel());
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = AIService.subscribe(() => {
      setActiveModel(AIService.getActiveModel());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      role="banner"
      aria-label="Application Header"
      className="h-11 bg-studio-glass backdrop-blur-xl border-b border-studio-border flex items-center justify-between px-3.5 select-none z-30 shrink-0 text-neutral-200"
    >
      {/* Left side: Logo & Title */}
      <div className="flex items-center space-x-3">
        {/* Brand Logo with Interwoven Loop W */}
        <div className="flex items-center space-x-2 text-editor-text font-semibold text-xs">
          <WeaveLogo size={24} glow={true} animated={false} />
          <span className="font-bold text-white tracking-wide">Weave IDE</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hidden sm:inline">
            STUDIO
          </span>
        </div>

        <div className="h-4 w-px bg-neutral-800 hidden sm:block" />

        {/* Workspace info & File title */}
        <div className="flex items-center space-x-1.5 text-xs text-neutral-400">
          <span className="text-neutral-200 font-medium">{projectName}</span>
          {activeFileName && (
            <>
              <span className="text-neutral-600">/</span>
              <span className="text-cyan-400 font-mono">{activeFileName}</span>
              {hasUnsavedChanges && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="Unsaved changes" />
              )}
            </>
          )}
        </div>

        <button
          onClick={onNewFile}
          className="p-1 text-neutral-400 hover:text-amber-400 rounded-lg transition-colors hidden md:block hover:bg-neutral-800/60"
          title="New Weave File (Ctrl+N)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {onOpenFolder && (
          <button
            onClick={onOpenFolder}
            className="p-1 text-neutral-400 hover:text-amber-400 rounded-lg transition-colors hidden md:block hover:bg-neutral-800/60"
            title="Open Folder"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Middle side: Active Model Selector + Global AI Command Bar Launcher */}
      <div className="flex items-center space-x-2">
        {/* Active Model Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            data-testid="header-model-selector-btn"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/80 text-xs text-neutral-200 transition-colors shadow-sm"
            title="Switch Active AI Reasoning Model"
          >
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-xs text-white max-w-[130px] truncate">{activeModel.name}</span>
            <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Model Dropdown Menu */}
          {isModelDropdownOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-72 bg-[#121624] border border-neutral-700 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 backdrop-blur-2xl">
              <div className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-neutral-400 border-b border-neutral-800 flex items-center justify-between">
                <span>Reasoning Model</span>
                <span className="text-cyan-400 font-mono">Weave Core</span>
              </div>
              {AVAILABLE_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    AIService.setActiveModel(model.id);
                    setIsModelDropdownOpen(false);
                  }}
                  className={`flex flex-col items-start p-2 rounded-lg text-left transition-colors ${
                    activeModel.id === model.id
                      ? 'bg-cyan-500/15 border border-cyan-500/30 text-white'
                      : 'hover:bg-neutral-800/80 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-semibold">{model.name}</span>
                    <span className="text-[9px] px-1 rounded font-mono bg-neutral-800 text-neutral-400">
                      {model.provider}
                    </span>
                  </div>
                  <span className="text-[10.5px] text-neutral-400 mt-0.5">{model.badge}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global AI Command Bar Trigger (Cmd/Ctrl + K) */}
        {onOpenCommandBar && (
          <button
            onClick={onOpenCommandBar}
            data-testid="btn-open-command-bar"
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-900/90 hover:border-cyan-500/50 border border-neutral-700/80 text-neutral-300 hover:text-white transition-all text-xs shadow-sm group"
            title="Global AI Command Bar (Cmd+K / Ctrl+K)"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:animate-pulse" />
            <span className="text-neutral-400 group-hover:text-neutral-200">Prompt Studio</span>
            <div className="flex items-center gap-0.5 text-[10px] font-mono px-1 py-0.2 rounded bg-neutral-800 border border-neutral-700 text-neutral-400">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </div>
          </button>
        )}

        <div className="h-4 w-px bg-neutral-800 hidden md:block" />

        {/* Run & Build Buttons */}
        <button
          onClick={onRun}
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-medium transition-colors shadow-sm"
          title="Run Active File (F5)"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span className="hidden md:inline">Run</span>
        </button>

        <button
          onClick={onBuild}
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 border border-neutral-700/80 rounded-lg text-xs font-medium transition-colors"
          title="Build Release Target (Ctrl+Shift+B)"
        >
          <Hammer className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Build</span>
        </button>

        <button
          onClick={onSave}
          disabled={!hasUnsavedChanges || isSaving}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
            hasUnsavedChanges
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
              : 'bg-neutral-900/40 border-neutral-800 text-neutral-500 opacity-60 cursor-default'
          }`}
          title="Save File (Ctrl+S)"
        >
          {isSaving ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span className="hidden lg:inline">{isSaving ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      {/* Right side: Status Pills & Overlay Toggles */}
      <div className="flex items-center space-x-2">
        {/* Status Pill 1: WASM Worker */}
        <div
          className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-mono hidden xl:flex"
          title="WASM Web Worker Language Client Active"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>WASM Worker</span>
        </div>

        {/* Status Pill 2: Compiler Ready */}
        <div
          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 font-mono hidden lg:flex"
          title={isTauri ? 'Native Weave CLI Ready' : 'WASM In-Memory Compiler Ready'}
        >
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span>Compiler Ready</span>
        </div>

        {/* Status Pill 3: AI Active */}
        <div
          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25 font-mono hidden sm:flex"
          title="Weave AI Agent Online"
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>AI Active</span>
        </div>

        <div className="h-4 w-px bg-neutral-800" />

        {/* Toggle Live Preview Canvas */}
        {onTogglePreview && (
          <button
            onClick={onTogglePreview}
            data-testid="btn-toggle-live-preview"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors ${
              isPreviewOpen
                ? 'text-cyan-300 bg-cyan-500/20 border border-cyan-500/40 font-semibold shadow-glow-cyan'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800 border border-transparent'
            }`}
            title="Toggle Weave Live Preview Canvas"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Preview</span>
          </button>
        )}

        {/* Toggle Sidebar Panel */}
        <button
          onClick={onToggleSidebar}
          className={`p-1.5 rounded-lg transition-colors ${
            isSidebarOpen
              ? 'text-cyan-400 bg-neutral-800/80 border border-neutral-700'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
          title="Toggle Primary Sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        {/* Toggle Bottom Drawer */}
        <button
          onClick={onToggleBottomPanel}
          className={`p-1.5 rounded-lg transition-colors ${
            isBottomPanelOpen
              ? 'text-cyan-400 bg-neutral-800/80 border border-neutral-700'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
          title="Toggle Bottom Terminal Panel"
        >
          <PanelBottom className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default HeaderBar;

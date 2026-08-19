import React from 'react';
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
  Search,
  Bot,
} from 'lucide-react';
import { WeaveLogo } from './Branding/WeaveLogo';
import { ModelSelectorDropdown } from './AI/ModelSelectorDropdown';

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
  onOpenQuickSwitcher?: () => void;
  onToggleFileTreeOverlay?: () => void;
  isAgentPanelOpen?: boolean;
  onToggleAgentPanel?: () => void;
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
  onOpenQuickSwitcher,
  isAgentPanelOpen,
  onToggleAgentPanel,
}) => {
  return (
    <header
      role="banner"
      aria-label="Application Header"
      className="workbench-header h-12 flex items-center justify-between gap-2 overflow-hidden px-3 select-none z-30 shrink-0 text-[#F9FAFB]"
    >
      {/* Left side: Logo & Clean File Reference */}
      <div className="flex flex-1 min-w-0 items-center space-x-3">
        <div className="header-brand flex shrink-0 items-center space-x-2 text-xs">
          <WeaveLogo size={20} glow={false} animated={false} />
          <span className="header-brand-title font-semibold text-[#F9FAFB] tracking-tight">Weave IDE</span>
        </div>

        <div className="header-divider h-3.5 w-px shrink-0 bg-white/[0.06]" />

        {/* Clean Single Workspace / Active File Path */}
        <div className="header-workspace-path flex min-w-0 items-center space-x-1.5 overflow-hidden text-xs text-[#6B7280]">
          <span className="truncate">{projectName}</span>
          {activeFileName && (
            <>
              <span className="text-white/[0.15]">/</span>
              <span className="truncate text-[#F9FAFB] font-mono">{activeFileName}</span>
              {hasUnsavedChanges && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF9D00]" title="Unsaved changes" />
              )}
            </>
          )}
        </div>

        {/* Quick Switcher Trigger (Cmd+P) */}
        {onOpenQuickSwitcher && (
          <button
            onClick={onOpenQuickSwitcher}
            data-testid="header-quick-switcher-btn"
            className="header-search hidden 2xl:flex shrink-0 items-center gap-2 min-w-[180px] px-2.5 py-1 rounded-md bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.06] text-[#747987] hover:text-[#F9FAFB] text-xs transition-colors"
            title="Quick Switcher (Cmd+P)"
          >
            <Search className="w-3 h-3 text-[#6B7280]" />
            <span className="text-[11px]">Search</span>
            <span className="text-[10px] font-mono text-[#6B7280] bg-white/[0.04] px-1 rounded">⌘P</span>
          </button>
        )}

        <button
          onClick={onNewFile}
          className="p-1 text-[#6B7280] hover:text-[#F9FAFB] rounded-md transition-colors hover:bg-white/[0.04]"
          title="New Weave File"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {onOpenFolder && (
          <button
            onClick={onOpenFolder}
            className="p-1 text-[#6B7280] hover:text-[#F9FAFB] rounded-md transition-colors hover:bg-white/[0.04]"
            title="Open Folder"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Middle side: Model Selector & Prompt Launcher */}
      <div className="header-primary-actions flex shrink-0 items-center space-x-2">
        {/* Model Selector Dropdown */}
        <div className="header-model-selector min-w-0">
          <ModelSelectorDropdown align="center" placement="below" testId="header-model-selector-btn" />
        </div>

        {/* Prompt Studio Launcher (Cmd+K) */}
        {onOpenCommandBar && (
          <button
            onClick={onOpenCommandBar}
            data-testid="btn-open-command-bar"
            className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-[#6B7280] hover:text-[#F9FAFB] transition-all text-xs"
            title="Prompt Studio (Cmd+K)"
          >
            <Sparkles className="w-3 h-3 text-[#FF9D00]" />
            <span className="text-xs">Prompt</span>
            <div className="flex items-center gap-0.5 text-[10px] font-mono text-[#6B7280] bg-white/[0.04] px-1 py-0.2 rounded border border-white/[0.05]">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </div>
          </button>
        )}

        <div className="h-3.5 w-px bg-white/[0.06] hidden md:block" />

        {/* Primary CTA: Run Button with Single Warm Accent (#FF9D00) */}
        <button
          onClick={onRun}
          className="flex items-center space-x-1.5 px-3 py-1 bg-[#FF9D00] hover:bg-[#ffaa1a] text-black font-semibold rounded-lg text-xs transition-all shadow-glow-amber active:scale-95"
          title="Run Active File (F5)"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Run</span>
        </button>

        {/* Build CTA: Minimal Stealth Button */}
        <button
          onClick={onBuild}
          className="flex items-center space-x-1 px-2.5 py-1 bg-white/[0.03] hover:bg-white/[0.06] text-[#6B7280] hover:text-[#F9FAFB] border border-white/[0.05] rounded-lg text-xs transition-colors"
          title="Build Release Target (Ctrl+Shift+B)"
        >
          <Hammer className="w-3 h-3" />
          <span className="hidden sm:inline">Build</span>
        </button>

        {/* Save CTA */}
        <button
          onClick={onSave}
          disabled={!hasUnsavedChanges || isSaving}
          className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs transition-colors ${
            hasUnsavedChanges
              ? 'bg-white/[0.06] text-[#F9FAFB] border border-white/[0.1] hover:bg-white/[0.1]'
              : 'text-[#6B7280] opacity-40 cursor-default'
          }`}
          title="Save File (Ctrl+S)"
        >
          {isSaving ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Right side: Clean Floating Panel Toggles */}
      <div className="flex flex-1 min-w-0 items-center justify-end space-x-1.5">
        {onToggleAgentPanel && (
          <button
            onClick={onToggleAgentPanel}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors ${
              isAgentPanelOpen
                ? 'bg-[#f0a35b]/[0.12] text-[#f5b97e] border border-[#f0a35b]/20'
                : 'text-[#747987] hover:text-[#F9FAFB] hover:bg-white/[0.04]'
            }`}
            title="Toggle Agent Panel (Cmd+L)"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Agent</span>
          </button>
        )}

        {/* Toggle Live Preview Canvas */}
        {onTogglePreview && (
          <button
            onClick={onTogglePreview}
            data-testid="btn-toggle-live-preview"
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
              isPreviewOpen
                ? 'bg-white/[0.08] text-[#F9FAFB] font-medium border border-white/[0.08]'
                : 'text-[#6B7280] hover:text-[#F9FAFB] hover:bg-white/[0.04]'
            }`}
            title="Toggle Live Preview"
          >
            <Sparkles className="w-3 h-3 text-[#FF9D00]" />
            <span className="hidden sm:inline text-xs">Preview</span>
          </button>
        )}

        {/* Toggle Sidebar */}
        <button
          onClick={onToggleSidebar}
          className={`p-1.5 rounded-lg transition-colors ${
            isSidebarOpen
              ? 'text-[#F9FAFB] bg-white/[0.06]'
              : 'text-[#6B7280] hover:text-[#F9FAFB] hover:bg-white/[0.04]'
          }`}
          title="Toggle Primary Sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        {/* Toggle Collapsible Terminal Overlay */}
        <button
          onClick={onToggleBottomPanel}
          className={`p-1.5 rounded-lg transition-colors ${
            isBottomPanelOpen
              ? 'text-[#F9FAFB] bg-white/[0.06]'
              : 'text-[#6B7280] hover:text-[#F9FAFB] hover:bg-white/[0.04]'
          }`}
          title="Toggle Terminal Panel"
        >
          <PanelBottom className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default HeaderBar;

import React, { useState, useRef, useCallback } from 'react';
import { SidebarView, FileItem, WorkspaceSettings, LoomStrandInfo } from '../../types';
import { FileExplorer } from './FileExplorer';
import { SettingsPanel } from './SettingsPanel';
import { SearchPanel } from './SearchPanel';
import { LoomMonitorPanel } from './LoomMonitorPanel';
import { AgentWorkspacePanel } from '../AI/AgentWorkspacePanel';

interface SidebarProps {
  activeView: SidebarView;
  onViewChange?: (view: SidebarView) => void;
  rootItem: FileItem | null;
  activeFilePath: string | null;
  settings: WorkspaceSettings;
  strands: LoomStrandInfo[];
  currentCode?: string;
  onApplyPatch?: (newCode: string) => void;
  onFileSelect: (path: string) => void;
  onNavigateToLocation?: (path: string, line: number, column?: number) => void;
  onCreateFile: (parentPath: string, fileName: string) => Promise<void>;
  onCreateFolder: (parentPath: string, folderName: string) => Promise<void>;
  onDeleteEntry: (path: string) => Promise<void>;
  onRenameEntry: (path: string, newName: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onUpdateSettings: (newSettings: Partial<WorkspaceSettings>) => void;
  onOpenWorkspaceDialog?: () => void;
  isLoading?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  rootItem,
  activeFilePath,
  settings,
  strands,
  currentCode = '',
  onApplyPatch = () => {},
  onFileSelect,
  onNavigateToLocation,
  onCreateFile,
  onCreateFolder,
  onDeleteEntry,
  onRenameEntry,
  onRefresh,
  onUpdateSettings,
  onOpenWorkspaceDialog,
  isLoading,
}) => {
  const [width, setWidth] = useState(248);
  const isDragging = useRef(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = Math.min(Math.max(startWidth + (moveEvent.clientX - startX), 200), 550);
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [width]);

  if (!activeView) return null;

  return (
    <div
      className="tool-sidebar relative flex flex-col shrink-0 select-none h-full z-20"
      style={{ width: `${width}px` }}
      data-testid="sidebar-container"
    >
      <div className="h-9 px-3 flex items-center justify-between border-b border-white/[0.045] shrink-0">
        <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[#8b909c]">
          {activeView === 'explorer' ? 'Project' : activeView === 'settings' ? 'Settings' : activeView === 'loom' ? 'Loom' : activeView === 'search' ? 'Search' : 'Agent'}
        </span>
        <span className="text-[9px] tracking-[0.12em] text-[#3f434c]">WEAVE</span>
      </div>

      <div className="flex-1 overflow-hidden h-full">
        {activeView === 'agent' && (
          <AgentWorkspacePanel
            currentCode={currentCode}
            activeFilePath={activeFilePath || ''}
            onApplyPatch={onApplyPatch}
            onOpenFile={onFileSelect}
          />
        )}

        {activeView === 'explorer' && (
          <FileExplorer
            rootItem={rootItem}
            activeFilePath={activeFilePath}
            onFileSelect={onFileSelect}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
            onDeleteEntry={onDeleteEntry}
            onRenameEntry={onRenameEntry}
            onRefresh={onRefresh}
            onOpenWorkspaceDialog={onOpenWorkspaceDialog}
            isLoading={isLoading}
          />
        )}

        {activeView === 'settings' && (
          <SettingsPanel
            settings={settings}
            onUpdateSettings={onUpdateSettings}
          />
        )}

        {activeView === 'search' && (
          <SearchPanel
            onFileSelect={(path, line, column) => {
              if (line && onNavigateToLocation) onNavigateToLocation(path, line, column);
              else onFileSelect(path);
            }}
            workspacePath={rootItem?.path}
          />
        )}

        {activeView === 'loom' && (
          <LoomMonitorPanel strands={strands} />
        )}
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={startResize}
        className="absolute top-0 right-0 w-px h-full cursor-col-resize hover:bg-[#f0a35b]/50 transition-colors z-30"
        title="Drag to resize sidebar"
      />
    </div>
  );
};

export default Sidebar;

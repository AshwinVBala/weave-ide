import React, { useState, useRef, useCallback } from 'react';
import { SidebarView, FileItem, WorkspaceSettings, LoomStrandInfo } from '../../types';
import { FileExplorer } from './FileExplorer';
import { SettingsPanel } from './SettingsPanel';
import { SearchPanel } from './SearchPanel';
import { LoomMonitorPanel } from './LoomMonitorPanel';
import { AgentWorkspacePanel } from '../AI/AgentWorkspacePanel';

interface SidebarProps {
  activeView: SidebarView;
  rootItem: FileItem | null;
  activeFilePath: string | null;
  settings: WorkspaceSettings;
  strands: LoomStrandInfo[];
  currentCode?: string;
  onApplyPatch?: (newCode: string) => void;
  onFileSelect: (path: string) => void;
  onCreateFile: (parentPath: string, fileName: string) => Promise<void>;
  onCreateFolder: (parentPath: string, folderName: string) => Promise<void>;
  onDeleteEntry: (path: string) => Promise<void>;
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
  onCreateFile,
  onCreateFolder,
  onDeleteEntry,
  onRefresh,
  onUpdateSettings,
  onOpenWorkspaceDialog,
  isLoading,
}) => {
  const [width, setWidth] = useState(300);
  const isDragging = useRef(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = Math.min(Math.max(startWidth + (moveEvent.clientX - startX), 220), 700);
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
      className="relative bg-studio-card backdrop-blur-xl border-r border-studio-border flex flex-col shrink-0 select-none h-full shadow-2xl"
      style={{ width: `${width}px` }}
      data-testid="sidebar-container"
    >
      <div className="flex-1 overflow-hidden h-full">
        {activeView === 'agent' && (
          <AgentWorkspacePanel
            currentCode={currentCode}
            activeFilePath={activeFilePath || 'main.wv'}
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
          <SearchPanel onFileSelect={onFileSelect} />
        )}

        {activeView === 'loom' && (
          <LoomMonitorPanel strands={strands} />
        )}
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={startResize}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-cyan-500/60 transition-colors z-30"
        title="Drag to resize sidebar"
      />
    </div>
  );
};

export default Sidebar;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HeaderBar } from './components/HeaderBar';
import { ActivityBar } from './components/ActivityBar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { AgentDock } from './components/AI/AgentDock';
import { EditorTabs } from './components/Editor/EditorTabs';
import { MonacoEditor } from './components/Editor/MonacoEditor';
import { EmptyEditor } from './components/Editor/EmptyEditor';
import { TerminalPanel } from './components/Terminal/TerminalPanel';
import { LivePreview } from './components/LivePreview';
import { CommandBar } from './components/AI/CommandBar';
import { QuickSwitcher } from './components/QuickSwitcher';
import { StatusBar } from './components/StatusBar';
import { fsService } from './services/fsService';
import { WeaveCompilerService } from './services/compilerService';
import { terminalService } from './services/terminalService';
import {
  FileItem,
  EditorTab,
  WorkspaceSettings,
  SidebarView,
  DiagnosticItem,
  LoomStrandInfo,
  BottomPanelTab,
} from './types';

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  tabSize: 4,
  insertSpaces: true,
  wordWrap: 'on',
  minimap: true,
  lineNumbers: 'on',
  theme: 'weave-dark',
  autoSave: false,
  autoSaveDelay: 1000,
  googleAuthMode: 'oauth',
  anthropicAuthMode: 'oauth',
  openaiAuthMode: 'oauth',
};

const WORKSPACE_PATH_KEY = 'weave_workspace_path';
const WORKSPACE_RECENT_FILES_KEY = 'weave_workspace_recent_files';

export const getInitialWorkspacePath = (): string => {
  try {
    const remembered = localStorage.getItem(WORKSPACE_PATH_KEY);
    if (remembered) return remembered;
  } catch {}
  return fsService.isTauri ? '' : '/workspace';
};

const tabIdForPath = (filePath: string) => `tab-${encodeURIComponent(filePath)}`;

const renamedPath = (path: string, sourcePath: string, targetPath: string): string => {
  if (path === sourcePath) return targetPath;
  const separator = sourcePath.includes('\\') ? '\\' : '/';
  return path.startsWith(`${sourcePath}${separator}`)
    ? `${targetPath}${path.slice(sourcePath.length)}`
    : path;
};

const siblingPath = (sourcePath: string, name: string): string => {
  const slashIndex = sourcePath.lastIndexOf('/');
  const backslashIndex = sourcePath.lastIndexOf('\\');
  const separatorIndex = Math.max(slashIndex, backslashIndex);
  if (separatorIndex < 0) return name;
  return `${sourcePath.slice(0, separatorIndex + 1)}${name}`;
};

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

const collectWorkspaceFiles = (root: FileItem): FileItem[] => {
  const files: FileItem[] = [];
  const visit = (item: FileItem) => {
    if (!item.isDir) {
      files.push(item);
      return;
    }
    item.children?.forEach(visit);
  };
  visit(root);
  return files;
};

const chooseWorkspaceStartFile = (root: FileItem, rememberedPath?: string): string | null => {
  const files = collectWorkspaceFiles(root);
  if (rememberedPath && files.some((file) => file.path === rememberedPath)) {
    return rememberedPath;
  }
  const weaveFiles = files.filter((file) => /\.(wv|weave)$/i.test(file.name));
  return (
    weaveFiles.find((file) => /^main\.(wv|weave)$/i.test(file.name)) ||
    weaveFiles[0] ||
    files.find((file) => /\.(md|json|toml|ts|tsx|js|jsx|rs|css|html)$/i.test(file.name)) ||
    null
  )?.path || null;
};

export const App: React.FC = () => {
  const [workspacePath, setWorkspacePath] = useState(getInitialWorkspacePath);
  const [rootItem, setRootItem] = useState<FileItem | null>(null);
  const [activeView, setActiveView] = useState<SidebarView>('explorer');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false); // Collapsible Terminal Overlay
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [settings, setSettings] = useState<WorkspaceSettings>(() => {
    try {
      const saved = localStorage.getItem('weave_workspace_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          googleAuthMode: parsed.googleAuthMode || (parsed.geminiApiKey ? 'api_key' : 'oauth'),
          anthropicAuthMode:
            parsed.anthropicAuthMode || (parsed.anthropicApiKey ? 'api_key' : 'oauth'),
          openaiAuthMode: parsed.openaiAuthMode || (parsed.openaiApiKey ? 'api_key' : 'oauth'),
        };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const handleUpdateSettings = useCallback((newSet: Partial<WorkspaceSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSet };
      try {
        localStorage.setItem('weave_workspace_settings', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const [strands, setStrands] = useState<LoomStrandInfo[]>([]);
  const [gitBranch, setGitBranch] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ lineNumber: number; column: number }>({
    lineNumber: 1,
    column: 1,
  });
  const [navigationTarget, setNavigationTarget] = useState<{
    path: string;
    lineNumber: number;
    column: number;
    requestId: number;
  } | null>(null);
  const [bottomPanelRequest, setBottomPanelRequest] = useState<{
    tab: BottomPanelTab;
    requestId: number;
  } | null>(null);
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);

  // Canvas split ratio (Monaco vs Live Preview)
  const [previewWidthPercent, setPreviewWidthPercent] = useState<number>(40);
  const isResizingCanvas = useRef(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  // Refresh workspace file tree
  const loadWorkspace = useCallback(async (pathOverride?: string): Promise<FileItem | null> => {
    const targetPath = pathOverride || workspacePath;
    if (!targetPath) {
      setRootItem(null);
      setWorkspaceNotice(null);
      return null;
    }
    setIsLoadingWorkspace(true);
    try {
      const tree = await fsService.buildTree(targetPath);
      setRootItem(tree);
      setWorkspaceNotice(null);
      return tree;
    } catch (err) {
      console.error('Failed to load workspace:', err);
      setWorkspaceNotice(`Could not load ${targetPath}: ${errorMessage(err)}`);
      return null;
    } finally {
      setIsLoadingWorkspace(false);
    }
  }, [workspacePath]);

  // Open file in editor tab
  const openFile = useCallback(async (filePath: string) => {
    try {
      const content = await fsService.readFile(filePath);
      const title = filePath.split(/[\\/]/).pop() || 'untitled.wv';
      const ext = title.split('.').pop() || '';
      const language = ext === 'wv' || ext === 'weave' ? 'weave' : ext;
      const tabId = tabIdForPath(filePath);

      const newTab: EditorTab = {
        id: tabId,
        path: filePath,
        title,
        content,
        savedContent: content,
        isDirty: false,
        language,
      };

      setTabs((prev) => {
        const existingIndex = prev.findIndex((t) => t.path === filePath || t.id === tabId);
        if (existingIndex !== -1) {
          const existing = prev[existingIndex];
          if (existing.isDirty || existing.content === content) return prev;
          const next = [...prev];
          next[existingIndex] = {
            ...existing,
            content,
            savedContent: content,
            isDirty: false,
          };
          return next;
        }
        return [...prev, newTab];
      });
      setActiveTabId(tabId);
      setWorkspaceNotice(null);
    } catch (err) {
      console.error('Failed to open file:', err);
      setWorkspaceNotice(`Could not open ${filePath}: ${errorMessage(err)}`);
    }
  }, []);

  const navigateToLocation = useCallback(async (
    filePath: string,
    lineNumber: number,
    column = 1
  ) => {
    await openFile(filePath);
    setNavigationTarget({
      path: filePath,
      lineNumber: Math.max(1, lineNumber),
      column: Math.max(1, column),
      requestId: Date.now(),
    });
  }, [openFile]);

  // Load the selected workspace and restore the last file used in that folder.
  useEffect(() => {
    let disposed = false;
    const initializeWorkspace = async () => {
      setTabs([]);
      setActiveTabId(null);
      if (!workspacePath) {
        setRootItem(null);
        setWorkspaceNotice(null);
        return;
      }
      const tree = await loadWorkspace(workspacePath);
      if (disposed) return;
      if (!tree) {
        const fallbackPath = fsService.isTauri ? '' : '/workspace';
        if (workspacePath !== fallbackPath) {
          try {
            localStorage.removeItem(WORKSPACE_PATH_KEY);
          } catch {}
          setWorkspacePath(fallbackPath);
        }
        return;
      }

      let rememberedPath: string | undefined;
      try {
        const recent = JSON.parse(localStorage.getItem(WORKSPACE_RECENT_FILES_KEY) || '{}');
        rememberedPath = recent[workspacePath];
      } catch {}
      const startFile = chooseWorkspaceStartFile(tree, rememberedPath);
      if (startFile) await openFile(startFile);
    };

    initializeWorkspace();
    return () => {
      disposed = true;
    };
  }, [loadWorkspace, openFile, workspacePath]);

  useEffect(() => {
    let disposed = false;
    const refreshGitBranch = async () => {
      if (!workspacePath) {
        setGitBranch(null);
        return;
      }
      try {
        const branch = await terminalService.getGitBranch(workspacePath);
        if (!disposed) setGitBranch(branch);
      } catch {
        if (!disposed) setGitBranch(null);
      }
    };
    void refreshGitBranch();
    window.addEventListener('focus', refreshGitBranch);
    return () => {
      disposed = true;
      window.removeEventListener('focus', refreshGitBranch);
    };
  }, [workspacePath]);

  useEffect(() => {
    if (!activeTab) return;
    try {
      const recent = JSON.parse(localStorage.getItem(WORKSPACE_RECENT_FILES_KEY) || '{}');
      recent[workspacePath] = activeTab.path;
      localStorage.setItem(WORKSPACE_RECENT_FILES_KEY, JSON.stringify(recent));
    } catch {}
  }, [activeTab?.path, workspacePath]);

  const openWorkspaceFolder = useCallback(async () => {
    try {
      const selectedPath = await fsService.selectWorkspaceFolder();
      if (!selectedPath || selectedPath === workspacePath) return;
      if (tabs.some((tab) => tab.isDirty) && !window.confirm('Open another folder and discard unsaved editor changes?')) {
        return;
      }
      localStorage.setItem(WORKSPACE_PATH_KEY, selectedPath);
      setWorkspacePath(selectedPath);
    } catch (error) {
      console.error('Failed to choose workspace folder:', error);
      setWorkspaceNotice(`Could not open a workspace folder: ${errorMessage(error)}`);
    }
  }, [tabs, workspacePath]);

  // Save active file
  const saveTab = useCallback(async (tabToSave?: EditorTab) => {
    const target = tabToSave || activeTab;
    if (!target) return;

    setIsSaving(true);
    try {
      await fsService.writeFile(target.path, target.content);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === target.id
            ? {
                ...t,
                savedContent: target.content,
                isDirty: t.content !== target.content,
              }
            : t
        )
      );
      if (target.path.endsWith('.wv')) {
        setDiagnostics(await WeaveCompilerService.checkSource(target.content, target.path));
      }
    } catch (err) {
      console.error('Failed to save file:', err);
      setWorkspaceNotice(`Could not save ${target.path}: ${errorMessage(err)}`);
    } finally {
      setTimeout(() => setIsSaving(false), 300);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!settings.autoSave || !activeTab?.isDirty) return;
    const timer = window.setTimeout(() => {
      void saveTab(activeTab);
    }, Math.max(250, settings.autoSaveDelay));
    return () => window.clearTimeout(timer);
  }, [settings.autoSave, settings.autoSaveDelay, activeTab?.id, activeTab?.content, activeTab?.isDirty, saveTab]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!tabs.some((tab) => tab.isDirty)) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tabs]);

  // Close tab
  const closeTab = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const closingTab = tabs.find((tab) => tab.id === id);
    if (closingTab?.isDirty && !window.confirm(`Close ${closingTab.title} without saving?`)) {
      return;
    }
    setTabs((prev) => {
      const remaining = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        const nextActive = remaining[remaining.length - 1];
        setActiveTabId(nextActive ? nextActive.id : null);
      }
      return remaining;
    });
  }, [activeTabId, tabs]);

  // Create new untitled file
  const createNewUntitled = useCallback(() => {
    if (!rootItem) {
      void openWorkspaceFolder();
      return;
    }
    const title = `untitled_${tabs.length + 1}.wv`;
    const sourceDirectory =
      rootItem?.children?.find((item) => item.isDir && item.name === 'src')?.path || workspacePath;
    const path = `${sourceDirectory}/${title}`.replace(/\/+/g, '/');
    const initialContent = `// New Weave Module\nfn main() {\n    // TODO: Write Weave code here\n}\n`;

    fsService.writeFile(path, initialContent)
      .then(async () => {
        await loadWorkspace();
        await openFile(path);
      })
      .catch((error) => {
        setWorkspaceNotice(`Could not create ${path}: ${errorMessage(error)}`);
      });
  }, [tabs.length, rootItem, workspacePath, loadWorkspace, openFile, openWorkspaceFolder]);

  // Run current file
  const runCurrentFile = useCallback(async () => {
    setIsBottomPanelOpen(true);
    setBottomPanelRequest({ tab: 'output', requestId: Date.now() });
    const target = activeTab?.path || (rootItem ? chooseWorkspaceStartFile(rootItem) : null);
    if (!target) {
      setWorkspaceNotice('Open a project folder and select a Weave file before running.');
      return;
    }
    if (activeTab?.isDirty) {
      await saveTab(activeTab);
    }
    const displayTarget = target.startsWith(`${workspacePath}/`)
      ? target.slice(workspacePath.length + 1)
      : target;
    terminalService.addLine('command', `$ weave run ${displayTarget}`);
    const res = await WeaveCompilerService.runFile(target);
    res.output.forEach((line) => {
      terminalService.addLine(res.success ? 'output' : 'error', line);
    });
    setDiagnostics(res.diagnostics);
    setStrands(res.strands);
  }, [activeTab, rootItem, workspacePath, saveTab]);

  // Build project
  const buildProject = useCallback(async () => {
    if (!workspacePath) {
      setWorkspaceNotice('Open a project folder before building.');
      return;
    }
    setIsBottomPanelOpen(true);
    setBottomPanelRequest({ tab: 'output', requestId: Date.now() });
    terminalService.addLine('command', '$ weave build --release');
    const res = await WeaveCompilerService.buildProject(workspacePath);
    res.output.forEach((line) => terminalService.addLine(res.success ? 'output' : 'error', line));
    setDiagnostics(res.diagnostics);
    setStrands(res.strands);
  }, [workspacePath]);

  // Update content of active tab
  const handleEditorChange = useCallback((value: string) => {
    if (!activeTabId) return;
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === activeTabId) {
          const isDirty = value !== t.savedContent;
          return { ...t, content: value, isDirty };
        }
        return t;
      })
    );
  }, [activeTabId]);

  // File Operations
  const handleCreateFile = useCallback(async (parentPath: string, fileName: string) => {
    const fullPath = `${parentPath}/${fileName}`.replace(/\/+/g, '/');
    await fsService.createFile(fullPath);
    await loadWorkspace();
  }, [loadWorkspace]);

  const handleCreateFolder = useCallback(async (parentPath: string, folderName: string) => {
    const fullPath = `${parentPath}/${folderName}`.replace(/\/+/g, '/');
    await fsService.createDir(fullPath);
    await loadWorkspace();
  }, [loadWorkspace]);

  const handleDeleteEntry = useCallback(async (targetPath: string) => {
    await fsService.deleteEntry(targetPath);
    setTabs((prev) => {
      const remaining = prev.filter(
        (tab) => tab.path !== targetPath && !tab.path.startsWith(`${targetPath}/`)
      );
      if (activeTabId && !remaining.some((tab) => tab.id === activeTabId)) {
        setActiveTabId(remaining[remaining.length - 1]?.id || null);
      }
      return remaining;
    });
    await loadWorkspace();
  }, [activeTabId, loadWorkspace]);

  const handleRenameEntry = useCallback(async (sourcePath: string, newName: string) => {
    const targetPath = siblingPath(sourcePath, newName);
    if (targetPath === sourcePath) return;
    const activeRenamedPath = activeTab
      ? renamedPath(activeTab.path, sourcePath, targetPath)
      : null;

    await fsService.renameEntry(sourcePath, targetPath);
    setTabs((prev) =>
      prev.map((tab) => {
        const nextPath = renamedPath(tab.path, sourcePath, targetPath);
        if (nextPath === tab.path) return tab;
        const title = nextPath.split(/[\\/]/).pop() || tab.title;
        return {
          ...tab,
          id: tabIdForPath(nextPath),
          path: nextPath,
          title,
        };
      })
    );
    if (activeTab && activeRenamedPath && activeRenamedPath !== activeTab.path) {
      setActiveTabId(tabIdForPath(activeRenamedPath));
    }
    await loadWorkspace();
  }, [activeTab, loadWorkspace]);

  // Draggable Resizer between Editor and Live Preview
  const startCanvasResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingCanvas.current = true;
    const startX = e.clientX;
    const containerWidth = window.innerWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingCanvas.current) return;
      const deltaX = startX - moveEvent.clientX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      setPreviewWidthPercent((prev) => Math.min(Math.max(prev + deltaPercent, 20), 75));
    };

    const onMouseUp = () => {
      isResizingCanvas.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + P: Quick Switcher
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P') && !e.shiftKey) {
        e.preventDefault();
        setIsQuickSwitcherOpen((prev) => !prev);
      }
      // Cmd/Ctrl + K: Global Command Bar
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandBarOpen((prev) => !prev);
      }
      // Cmd/Ctrl + Shift + B: Build Release
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'B' || e.key === 'b')) {
        e.preventDefault();
        buildProject();
      }
      // Cmd/Ctrl + S: Save
      else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        saveTab();
      }
      // Cmd/Ctrl + B: Toggle Left Panel (Agent Workspace)
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B') && !e.shiftKey) {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
      // Cmd/Ctrl + L: Toggle Agent Dock
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        setIsAgentPanelOpen((prev) => !prev);
      }
      // Cmd/Ctrl + ~ or Cmd/Ctrl + `: Toggle Collapsible Terminal Overlay
      else if ((e.ctrlKey || e.metaKey) && (e.key === '`' || e.key === '~')) {
        e.preventDefault();
        setIsBottomPanelOpen((prev) => !prev);
      }
      // F5: Run
      else if (e.key === 'F5') {
        e.preventDefault();
        runCurrentFile();
      }
      // Cmd/Ctrl + N: New File
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        createNewUntitled();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveTab, runCurrentFile, buildProject, createNewUntitled]);

  return (
    <div className="workbench-shell flex flex-col h-screen w-screen text-editor-text overflow-hidden font-sans select-none">
      {/* Top Application Header */}
      <HeaderBar
        projectName={rootItem?.name || workspacePath.split(/[\\/]/).pop() || 'No Folder'}
        activeFileName={activeTab?.title}
        isSaving={isSaving}
        hasUnsavedChanges={activeTab?.isDirty}
        onSave={() => saveTab()}
        onRun={runCurrentFile}
        onBuild={buildProject}
        onNewFile={createNewUntitled}
        onOpenFolder={openWorkspaceFolder}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isBottomPanelOpen={isBottomPanelOpen}
        onToggleBottomPanel={() => setIsBottomPanelOpen((prev) => !prev)}
        isPreviewOpen={isPreviewOpen}
        onTogglePreview={() => setIsPreviewOpen((prev) => !prev)}
        onOpenCommandBar={() => setIsCommandBarOpen(true)}
        onOpenQuickSwitcher={() => setIsQuickSwitcherOpen(true)}
        isAgentPanelOpen={isAgentPanelOpen}
        onToggleAgentPanel={() => setIsAgentPanelOpen((prev) => !prev)}
      />

      <div className="workbench-main flex-1 flex overflow-hidden relative min-h-0">
        <ActivityBar
          activeView={activeView}
          onViewChange={(view) => {
            if (view === 'agent') {
              setIsAgentPanelOpen((prev) => !prev);
              return;
            }
            setActiveView(view);
            setIsSidebarOpen(view !== null);
          }}
          isBottomPanelOpen={isBottomPanelOpen}
          onToggleBottomPanel={() => setIsBottomPanelOpen((prev) => !prev)}
          onRunCurrentFile={runCurrentFile}
          hasActiveFile={Boolean(activeTab)}
        />

        {isSidebarOpen && (
          <Sidebar
            activeView={activeView}
            onViewChange={setActiveView}
            rootItem={rootItem}
            activeFilePath={activeTab?.path || null}
            settings={settings}
            strands={strands}
            currentCode={activeTab?.content || ''}
            onApplyPatch={handleEditorChange}
            onFileSelect={openFile}
            onNavigateToLocation={navigateToLocation}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeleteEntry={handleDeleteEntry}
            onRenameEntry={handleRenameEntry}
            onRefresh={async () => {
              await loadWorkspace();
            }}
            onOpenWorkspaceDialog={openWorkspaceFolder}
            onUpdateSettings={handleUpdateSettings}
            isLoading={isLoadingWorkspace}
          />
        )}

        <main
          aria-label="Editor workspace"
          className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent"
        >
          <EditorTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onCloseTab={closeTab}
            onNewFileClick={createNewUntitled}
          />

          {workspaceNotice && (
            <div
              role="alert"
              className="mx-2 mt-2 flex items-start justify-between gap-3 rounded border border-red-500/25 bg-red-950/60 px-3 py-2 text-xs text-red-200"
            >
              <span className="break-words">{workspaceNotice}</span>
              <button
                type="button"
                onClick={() => setWorkspaceNotice(null)}
                className="shrink-0 text-red-300 hover:text-white"
                aria-label="Dismiss workspace error"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex-1 min-h-0 relative flex flex-row overflow-hidden">
            {activeTab ? (
              <>
                <div
                  className="h-full flex flex-col min-w-0"
                  style={{
                    width: isPreviewOpen ? `${100 - previewWidthPercent}%` : '100%',
                  }}
                >
                  <MonacoEditor
                    key={activeTab.id}
                    tab={activeTab}
                    settings={settings}
                    onChange={handleEditorChange}
                    onSave={() => saveTab()}
                    onCursorChange={(lineNumber, column) =>
                      setCursorPos({ lineNumber, column })
                    }
                    onDiagnosticsChange={setDiagnostics}
                    navigationTarget={
                      navigationTarget?.path === activeTab.path ? navigationTarget : null
                    }
                    onNavigationHandled={(requestId) => {
                      setNavigationTarget((current) =>
                        current?.requestId === requestId ? null : current
                      );
                    }}
                  />
                </div>

                {isPreviewOpen && (
                  <div
                    onMouseDown={startCanvasResize}
                    className="w-1 h-full bg-white/[0.05] hover:bg-white/[0.15] cursor-col-resize transition-colors z-20 shrink-0 relative group"
                    title="Drag to resize Live Preview"
                  >
                    <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
                  </div>
                )}

                {isPreviewOpen && (
                  <div
                    className="h-full min-w-[300px] flex flex-col shrink-0"
                    style={{ width: `${previewWidthPercent}%` }}
                  >
                    <LivePreview
                      code={activeTab.content}
                      filePath={activeTab.title}
                      onClose={() => setIsPreviewOpen(false)}
                      onApplyCode={handleEditorChange}
                    />
                  </div>
                )}
              </>
            ) : (
              <EmptyEditor
                onNewFile={createNewUntitled}
                onOpenFolder={openWorkspaceFolder}
                onOpenSample={openFile}
                onToggleTerminal={() => setIsBottomPanelOpen(true)}
                samplePath={rootItem ? chooseWorkspaceStartFile(rootItem) : null}
                hasWorkspace={Boolean(rootItem)}
              />
            )}
          </div>
        </main>

        {isAgentPanelOpen && (
          <aside
            className="agent-dock w-[380px] min-w-[320px] max-w-[42vw] shrink-0 overflow-hidden"
            aria-label="Weave Agent"
          >
            <AgentDock
              currentCode={activeTab?.content || ''}
              activeFilePath={activeTab?.path || ''}
              onApplyPatch={handleEditorChange}
              onOpenFile={openFile}
              onClose={() => setIsAgentPanelOpen(false)}
            />
          </aside>
        )}
      </div>

      <StatusBar
        cursorPosition={cursorPos}
        language={activeTab?.language || 'weave'}
        diagnostics={diagnostics}
        settings={settings}
        gitBranch={gitBranch}
        strandCount={strands.length}
        onToggleProblems={() => {
          setIsBottomPanelOpen(true);
          setBottomPanelRequest({ tab: 'problems', requestId: Date.now() });
        }}
        onToggleLoom={() => {
          setActiveView('loom');
          setIsSidebarOpen(true);
        }}
      />

      {/* Floating Quick Switcher Modal (Cmd/Ctrl + P) */}
      <QuickSwitcher
        isOpen={isQuickSwitcherOpen}
        onClose={() => setIsQuickSwitcherOpen(false)}
        onSelectFile={openFile}
        activeFilePath={activeTab?.path}
        workspacePath={workspacePath}
      />

      {/* Floating Global AI Command Bar (Cmd/Ctrl + K) */}
      <CommandBar
        isOpen={isCommandBarOpen}
        onClose={() => setIsCommandBarOpen(false)}
        currentCode={activeTab?.content || ''}
        activeFilePath={activeTab?.path || 'main.wv'}
        onApplyCode={handleEditorChange}
        onRunFile={runCurrentFile}
        onBuildProject={buildProject}
        onToggleTerminal={() => setIsBottomPanelOpen((prev) => !prev)}
        onTogglePreview={() => setIsPreviewOpen((prev) => !prev)}
        onToggleFileTree={() => {
          setIsSidebarOpen(true);
          setActiveView('explorer');
        }}
      />

      {/* Collapsible Floating Terminal Overlay Drawer (Cmd/Ctrl + ~) */}
      <TerminalPanel
        isOpen={isBottomPanelOpen}
        onClose={() => setIsBottomPanelOpen(false)}
        currentFilePath={activeTab?.path || null}
        workspacePath={workspacePath}
        diagnostics={diagnostics}
        strands={strands}
        onDiagnosticsUpdate={setDiagnostics}
        onStrandsUpdate={setStrands}
        onJumpToDiagnostic={(diagnostic) => {
          void navigateToLocation(
            diagnostic.filePath,
            diagnostic.line,
            diagnostic.column
          );
        }}
        requestedTab={bottomPanelRequest}
      />
    </div>
  );
};

export default App;

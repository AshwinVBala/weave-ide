import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HeaderBar } from './components/HeaderBar';
import { ActivityBar } from './components/ActivityBar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { EditorTabs } from './components/Editor/EditorTabs';
import { Breadcrumbs } from './components/Editor/Breadcrumbs';
import { MonacoEditor } from './components/Editor/MonacoEditor';
import { EmptyEditor } from './components/Editor/EmptyEditor';
import { TerminalPanel } from './components/Terminal/TerminalPanel';
import { StatusBar } from './components/StatusBar';
import { LivePreview } from './components/LivePreview';
import { CommandBar } from './components/AI/CommandBar';
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
} from './types';

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  fontSize: 14,
  fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
  tabSize: 4,
  insertSpaces: true,
  wordWrap: 'on',
  minimap: true,
  lineNumbers: 'on',
  theme: 'weave-dark',
  autoSave: false,
  autoSaveDelay: 1000,
  weaveCompilerMode: 'loom-vm',
  weaveOptLevel: 'debug',
  formatOnSave: true,
};

export const App: React.FC = () => {
  const [rootItem, setRootItem] = useState<FileItem | null>(null);
  const [activeView, setActiveView] = useState<SidebarView>('explorer');
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [settings, setSettings] = useState<WorkspaceSettings>(DEFAULT_SETTINGS);
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [strands, setStrands] = useState<LoomStrandInfo[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ lineNumber: number; column: number }>({
    lineNumber: 1,
    column: 1,
  });

  // Canvas split ratio (Monaco vs Live Preview)
  const [previewWidthPercent, setPreviewWidthPercent] = useState<number>(45);
  const isResizingCanvas = useRef(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  // Refresh workspace file tree
  const loadWorkspace = useCallback(async () => {
    setIsLoadingWorkspace(true);
    try {
      const tree = await fsService.buildTree('/workspace');
      setRootItem(tree);
    } catch (err) {
      console.error('Failed to load workspace:', err);
    } finally {
      setIsLoadingWorkspace(false);
    }
  }, []);

  // Open file in editor tab
  const openFile = useCallback(async (filePath: string) => {
    const existing = tabs.find((t) => t.path === filePath);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    try {
      const content = await fsService.readFile(filePath);
      const title = filePath.split('/').pop() || 'untitled.wv';
      const ext = title.split('.').pop() || '';
      const language = ext === 'wv' || ext === 'weave' ? 'weave' : ext;

      const newTab: EditorTab = {
        id: `tab-${Date.now()}-${Math.random()}`,
        path: filePath,
        title,
        content,
        savedContent: content,
        isDirty: false,
        language,
      };

      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  }, [tabs]);

  // Initial load: load workspace and open main.wv
  useEffect(() => {
    loadWorkspace().then(() => {
      openFile('/workspace/src/main.wv');
    });
  }, [loadWorkspace]);

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
            ? { ...t, savedContent: t.content, isDirty: false }
            : t
        )
      );
      if (target.path.endsWith('.wv')) {
        const checkRes = await WeaveCompilerService.runFile(target.path);
        setDiagnostics(checkRes.diagnostics);
      }
    } catch (err) {
      console.error('Failed to save file:', err);
    } finally {
      setTimeout(() => setIsSaving(false), 300);
    }
  }, [activeTab]);

  // Close tab
  const closeTab = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTabs((prev) => {
      const remaining = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        const nextActive = remaining[remaining.length - 1];
        setActiveTabId(nextActive ? nextActive.id : null);
      }
      return remaining;
    });
  }, [activeTabId]);

  // Create new untitled file
  const createNewUntitled = useCallback(() => {
    const title = `untitled_${tabs.length + 1}.wv`;
    const path = `/workspace/src/${title}`;
    const initialContent = `// New Weave Module\nfn main() {\n    // TODO: Write Weave code here\n}\n`;

    fsService.writeFile(path, initialContent).then(() => {
      loadWorkspace();
      openFile(path);
    });
  }, [tabs.length, loadWorkspace, openFile]);

  // Run current file
  const runCurrentFile = useCallback(async () => {
    setIsBottomPanelOpen(true);
    const target = activeTab?.path || '/workspace/src/main.wv';
    if (activeTab?.isDirty) {
      await saveTab(activeTab);
    }
    const displayTarget = target.replace('/workspace/', '');
    terminalService.addLine('command', `$ weave run ${displayTarget}`);
    const res = await WeaveCompilerService.runFile(target);
    res.output.forEach((line) => {
      terminalService.addLine(res.success ? 'output' : 'error', line);
    });
    setDiagnostics(res.diagnostics);
    if (res.strands.length > 0) {
      setStrands(res.strands);
    }
  }, [activeTab, saveTab]);

  // Build project
  const buildProject = useCallback(async () => {
    setIsBottomPanelOpen(true);
    terminalService.addLine('command', '$ weave build --release');
    const res = await WeaveCompilerService.buildProject();
    res.output.forEach((line) => {
      terminalService.addLine('output', line);
    });
  }, []);

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
    setTabs((prev) => prev.filter((t) => !t.path.startsWith(targetPath)));
    await loadWorkspace();
  }, [loadWorkspace]);

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
      setPreviewWidthPercent((prev) => Math.min(Math.max(prev + deltaPercent, 25), 75));
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
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandBarOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'B' || e.key === 'b')) {
        e.preventDefault();
        buildProject();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveTab();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setActiveView((prev) => (prev ? null : 'explorer'));
      } else if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setIsBottomPanelOpen((prev) => !prev);
      } else if (e.key === 'F5') {
        e.preventDefault();
        runCurrentFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNewUntitled();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveTab, runCurrentFile, buildProject, createNewUntitled]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0c10] text-editor-text overflow-hidden font-sans select-none studio-canvas-bg">
      {/* Top Application Header */}
      <HeaderBar
        projectName="weave-workspace"
        activeFileName={activeTab?.title}
        isSaving={isSaving}
        hasUnsavedChanges={activeTab?.isDirty}
        onSave={() => saveTab()}
        onRun={runCurrentFile}
        onBuild={buildProject}
        onNewFile={createNewUntitled}
        isSidebarOpen={Boolean(activeView)}
        onToggleSidebar={() => setActiveView((prev) => (prev ? null : 'explorer'))}
        isBottomPanelOpen={isBottomPanelOpen}
        onToggleBottomPanel={() => setIsBottomPanelOpen((prev) => !prev)}
        isPreviewOpen={isPreviewOpen}
        onTogglePreview={() => setIsPreviewOpen((prev) => !prev)}
        onOpenCommandBar={() => setIsCommandBarOpen(true)}
      />

      {/* Main Center Studio Area: ActivityBar + Sidebar + Editor + Live Preview + Terminal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar
          activeView={activeView}
          onViewChange={setActiveView}
          isBottomPanelOpen={isBottomPanelOpen}
          onToggleBottomPanel={() => setIsBottomPanelOpen((prev) => !prev)}
          onRunCurrentFile={runCurrentFile}
          hasActiveFile={Boolean(activeTab)}
        />

        {/* Primary Sidebar / Agent Workspace */}
        <Sidebar
          activeView={activeView}
          rootItem={rootItem}
          activeFilePath={activeTab?.path || null}
          settings={settings}
          strands={strands}
          currentCode={activeTab?.content || ''}
          onApplyPatch={handleEditorChange}
          onFileSelect={openFile}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
          onDeleteEntry={handleDeleteEntry}
          onRefresh={loadWorkspace}
          onUpdateSettings={(newSet) => setSettings((prev) => ({ ...prev, ...newSet }))}
          isLoading={isLoadingWorkspace}
        />

        {/* Editor and Canvas Split Area */}
        <main
          aria-label="Editor workspace"
          className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent"
        >
          {/* Editor Tab Strip */}
          <EditorTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onCloseTab={closeTab}
            onNewFileClick={createNewUntitled}
          />

          {/* Breadcrumbs */}
          {activeTab && <Breadcrumbs filePath={activeTab.path} />}

          {/* Canvas Area: Monaco Editor + Draggable Resizer + Live Preview */}
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
                  />
                </div>

                {/* Sleek Canvas Draggable Resizer */}
                {isPreviewOpen && (
                  <div
                    onMouseDown={startCanvasResize}
                    className="w-1.5 h-full bg-studio-border hover:bg-cyan-500/80 cursor-col-resize transition-colors z-20 shrink-0 relative group shadow-glow-cyan"
                    title="Drag to resize Live Preview"
                  >
                    <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
                  </div>
                )}

                {/* Live Interactive Preview Canvas */}
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
                onOpenSample={openFile}
                onToggleTerminal={() => setIsBottomPanelOpen(true)}
              />
            )}
          </div>

          {/* Bottom Terminal Panel */}
          <TerminalPanel
            isOpen={isBottomPanelOpen}
            onClose={() => setIsBottomPanelOpen(false)}
            currentFilePath={activeTab?.path || null}
            diagnostics={diagnostics}
            strands={strands}
            onDiagnosticsUpdate={setDiagnostics}
            onStrandsUpdate={setStrands}
          />
        </main>
      </div>

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
        onToggleFileTree={() => setActiveView('explorer')}
      />

      {/* Bottom Status Bar */}
      <StatusBar
        cursorPosition={activeTab ? cursorPos : undefined}
        language={activeTab ? activeTab.language : 'Weave'}
        diagnostics={diagnostics}
        settings={settings}
        onToggleProblems={() => {
          setIsBottomPanelOpen(true);
        }}
        onToggleLoom={() => {
          setActiveView('loom');
        }}
      />
    </div>
  );
};

export default App;

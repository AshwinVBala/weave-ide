import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Terminal as TermIcon,
  AlertTriangle,
  Cpu,
  X,
  Maximize2,
  Minimize2,
  Sparkles,
  ScrollText,
  Trash2,
} from 'lucide-react';
import { BottomPanelTab, DiagnosticItem, LoomStrandInfo } from '../../types';
import { terminalService, TerminalEntry } from '../../services/terminalService';
import { InteractiveTerminal } from './InteractiveTerminal';
import { LoomMonitorPanel } from '../Sidebar/LoomMonitorPanel';

interface TerminalPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilePath: string | null;
  workspacePath?: string;
  diagnostics: DiagnosticItem[];
  strands: LoomStrandInfo[];
  onDiagnosticsUpdate: (diags: DiagnosticItem[]) => void;
  onStrandsUpdate: (strands: LoomStrandInfo[]) => void;
  onJumpToDiagnostic?: (diag: DiagnosticItem) => void;
  requestedTab?: { tab: BottomPanelTab; requestId: number } | null;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  isOpen,
  onClose,
  currentFilePath,
  workspacePath = '/workspace',
  diagnostics,
  strands,
  onDiagnosticsUpdate,
  onStrandsUpdate,
  onJumpToDiagnostic,
  requestedTab,
}) => {
  const [activeTab, setActiveTab] = useState<BottomPanelTab>('terminal');
  const [outputLines, setOutputLines] = useState<TerminalEntry[]>(() =>
    terminalService.getLines()
  );
  const [height, setHeight] = useState(280);
  const [isMaximized, setIsMaximized] = useState(false);
  const isDragging = useRef(false);

  useEffect(() => {
    if (requestedTab) setActiveTab(requestedTab.tab);
  }, [requestedTab]);

  useEffect(() => terminalService.subscribe(setOutputLines), []);

  // Esc closes terminal overlay when opened
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDragging.current) {
        // Only close on Esc if not focused inside an active interactive sub-element that handles Esc
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      const startY = e.clientY;
      const startHeight = height;

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current) return;
        const newHeight = Math.min(
          Math.max(startHeight - (moveEvent.clientY - startY), 160),
          window.innerHeight * 0.85
        );
        setHeight(newHeight);
      };

      const onMouseUp = () => {
        isDragging.current = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [height]
  );

  if (!isOpen) return null;

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[96%] max-w-6xl bg-[#0d0e15]/95 border border-white/[0.09] rounded-2xl shadow-floating backdrop-blur-2xl flex flex-col z-40 overflow-hidden animate-slideUp transition-all duration-150 ${
        isMaximized ? 'h-[85vh] bottom-4' : ''
      }`}
      style={!isMaximized ? { height: `${height}px` } : undefined}
      data-testid="terminal-panel"
    >
      {/* Top resize handle */}
      {!isMaximized && (
        <div
          onMouseDown={startResize}
          className="absolute top-0 left-0 right-0 h-1.5 cursor-row-resize hover:bg-cyan-500/50 transition-colors z-30"
          title="Drag to resize terminal overlay"
        />
      )}

      {/* Header bar and tabs */}
      <div className="flex items-center justify-between px-4 bg-[#090a0f]/90 border-b border-white/[0.07] select-none h-10 shrink-0">
        <div className="flex items-center space-x-1 h-full">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center space-x-1.5 px-3 h-full text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'terminal'
                ? 'border-cyan-400 text-cyan-300 bg-white/[0.04]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <TermIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Interactive Terminal</span>
          </button>

          <button
            onClick={() => setActiveTab('output')}
            className={`flex items-center space-x-1.5 px-3 h-full text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'output'
                ? 'border-sky-400 text-sky-300 bg-white/[0.04]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5 text-sky-400" />
            <span>Output</span>
          </button>

          <button
            onClick={() => setActiveTab('problems')}
            className={`flex items-center space-x-1.5 px-3 h-full text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'problems'
                ? 'border-amber-400 text-amber-400 bg-white/[0.04]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Diagnostics</span>
            {errorCount + warningCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500/20 rounded-full text-[10px] font-mono font-bold text-amber-300">
                {errorCount + warningCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('strands')}
            className={`flex items-center space-x-1.5 px-3 h-full text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'strands'
                ? 'border-emerald-400 text-emerald-400 bg-white/[0.04]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>Loom Concurrency</span>
            <span className="ml-1 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-mono">
              {strands.length} {strands.length === 1 ? 'Strand' : 'Strands'}
            </span>
          </button>
        </div>

        {/* Panel controls */}
        <div className="flex items-center space-x-2">
          {activeTab === 'output' && outputLines.length > 0 && (
            <button
              onClick={() => terminalService.clear()}
              className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              title="Clear Output"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-neutral-500 px-2 py-0.5 rounded bg-white/[0.03]">
            <span>Cmd+~ to toggle</span>
          </div>

          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            title={isMaximized ? 'Restore Panel' : 'Maximize Panel'}
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            title="Close Terminal Overlay (Cmd+~)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden bg-[#090a0f]">
        {activeTab === 'terminal' && (
          <InteractiveTerminal
            currentFilePath={currentFilePath}
            workspacePath={workspacePath}
            onDiagnosticsUpdate={onDiagnosticsUpdate}
            onStrandsUpdate={onStrandsUpdate}
          />
        )}

        {activeTab === 'output' && (
          <div className="h-full overflow-y-auto p-3 custom-scrollbar bg-[#0a0c10] font-mono text-xs">
            {outputLines.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-500 gap-2">
                <ScrollText className="w-7 h-7" />
                <span>No compiler or command output yet.</span>
              </div>
            ) : (
              <div className="space-y-1">
                {outputLines.map((line) => (
                  <div
                    key={line.id}
                    className={`whitespace-pre-wrap leading-relaxed ${
                      line.type === 'command'
                        ? 'text-amber-400 font-semibold'
                        : line.type === 'error'
                          ? 'text-red-400'
                          : line.type === 'success'
                            ? 'text-emerald-400'
                            : line.type === 'info'
                              ? 'text-cyan-400'
                              : 'text-neutral-300'
                    }`}
                  >
                    {line.content.replace(/\x1b\[[0-9;]*m/g, '')}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'problems' && (
          <div className="h-full overflow-y-auto p-4 custom-scrollbar text-xs">
            {diagnostics.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 flex flex-col items-center gap-2">
                <Sparkles className="w-8 h-8 text-emerald-400/80 animate-pulse" />
                <span className="text-sm font-semibold text-white">No compiler diagnostics</span>
                <span className="text-neutral-500 text-xs">
                  No syntax or type errors are currently reported.
                </span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {diagnostics.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => onJumpToDiagnostic?.(d)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/70 hover:bg-neutral-800/80 cursor-pointer border border-white/[0.06] transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      {d.severity === 'error' ? (
                        <span className="w-2 h-2 rounded-full bg-red-400 shrink-0 shadow-sm" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 shadow-sm" />
                      )}
                      <span className="font-mono text-neutral-200">{d.message}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-neutral-400 text-[11px] font-mono shrink-0">
                      <span className="text-neutral-500">{d.code}</span>
                      <span className="text-cyan-400">
                        {d.filePath.split('/').pop()}:{d.line}:{d.column}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'strands' && (
          <div className="h-full overflow-y-auto p-4 custom-scrollbar">
            <LoomMonitorPanel strands={strands} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminalPanel;

import React, { useState, useRef, useCallback } from 'react';
import {
  Terminal as TermIcon,
  AlertTriangle,
  Cpu,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { BottomPanelTab, DiagnosticItem, LoomStrandInfo } from '../../types';
import { InteractiveTerminal } from './InteractiveTerminal';
import { LoomMonitorPanel } from '../Sidebar/LoomMonitorPanel';

interface TerminalPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilePath: string | null;
  diagnostics: DiagnosticItem[];
  strands: LoomStrandInfo[];
  onDiagnosticsUpdate: (diags: DiagnosticItem[]) => void;
  onStrandsUpdate: (strands: LoomStrandInfo[]) => void;
  onJumpToDiagnostic?: (diag: DiagnosticItem) => void;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  isOpen,
  onClose,
  currentFilePath,
  diagnostics,
  strands,
  onDiagnosticsUpdate,
  onStrandsUpdate,
  onJumpToDiagnostic,
}) => {
  const [activeTab, setActiveTab] = useState<BottomPanelTab>('terminal');
  const [height, setHeight] = useState(240);
  const [isMaximized, setIsMaximized] = useState(false);
  const isDragging = useRef(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    const startY = e.clientY;
    const startHeight = height;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const newHeight = Math.min(Math.max(startHeight - (moveEvent.clientY - startY), 120), 600);
      setHeight(newHeight);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [height]);

  if (!isOpen) return null;

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  return (
    <div
      className={`relative bg-editor-panel border-t border-editor-border flex flex-col z-20 shrink-0 ${
        isMaximized ? 'h-[75vh]' : ''
      }`}
      style={!isMaximized ? { height: `${height}px` } : undefined}
      data-testid="terminal-panel"
    >
      {/* Top resize handle */}
      {!isMaximized && (
        <div
          onMouseDown={startResize}
          className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-amber-500/50 transition-colors z-30"
          title="Drag to resize terminal panel"
        />
      )}

      {/* Panel header and tabs */}
      <div className="flex items-center justify-between px-3 bg-editor-sidebar border-b border-editor-border select-none h-9 shrink-0">
        <div className="flex items-center space-x-1 h-full">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center space-x-1.5 px-3 h-full text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'terminal'
                ? 'border-amber-400 text-amber-400 bg-editor-panel'
                : 'border-transparent text-editor-muted hover:text-editor-text'
            }`}
          >
            <TermIcon className="w-3.5 h-3.5" />
            <span>Terminal</span>
          </button>

          <button
            onClick={() => setActiveTab('problems')}
            className={`flex items-center space-x-1.5 px-3 h-full text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'problems'
                ? 'border-amber-400 text-amber-400 bg-editor-panel'
                : 'border-transparent text-editor-muted hover:text-editor-text'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Problems</span>
            {(errorCount > 0 || warningCount > 0) && (
              <span className="ml-1 px-1.5 py-0.2 bg-editor-border rounded-full text-[10px] font-mono font-bold text-amber-400">
                {errorCount + warningCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('strands')}
            className={`flex items-center space-x-1.5 px-3 h-full text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'strands'
                ? 'border-amber-400 text-amber-400 bg-editor-panel'
                : 'border-transparent text-editor-muted hover:text-editor-text'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Loom Strands</span>
            <span className="ml-1 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-mono">
              {strands.length || 3}
            </span>
          </button>
        </div>

        {/* Panel controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 text-editor-muted hover:text-editor-text hover:bg-editor-hover rounded transition-colors"
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
            className="p-1 text-editor-muted hover:text-editor-text hover:bg-editor-hover rounded transition-colors"
            title="Close Panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'terminal' && (
          <InteractiveTerminal
            currentFilePath={currentFilePath}
            onDiagnosticsUpdate={onDiagnosticsUpdate}
            onStrandsUpdate={onStrandsUpdate}
          />
        )}

        {activeTab === 'problems' && (
          <div className="h-full overflow-y-auto p-3 custom-scrollbar text-xs">
            {diagnostics.length === 0 ? (
              <div className="text-center py-8 text-editor-muted">
                No problems detected in workspace. Weave compiler check is clear.
              </div>
            ) : (
              <div className="space-y-1">
                {diagnostics.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => onJumpToDiagnostic?.(d)}
                    className="flex items-center justify-between p-2 rounded bg-editor-bg hover:bg-editor-hover cursor-pointer border border-editor-border transition-colors"
                  >
                    <div className="flex items-center space-x-2 overflow-hidden">
                      {d.severity === 'error' ? (
                        <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      )}
                      <span className="font-mono text-editor-text">{d.message}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-editor-muted text-[11px] font-mono shrink-0">
                      <span>{d.code}</span>
                      <span>
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
          <div className="h-full overflow-y-auto p-3">
            <LoomMonitorPanel strands={strands} />
          </div>
        )}
      </div>
    </div>
  );
};

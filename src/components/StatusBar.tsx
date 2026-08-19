import React from 'react';
import { GitBranch, AlertTriangle, CheckCircle, Cpu } from 'lucide-react';
import { DiagnosticItem, WorkspaceSettings } from '../types';

interface StatusBarProps {
  cursorPosition?: { lineNumber: number; column: number };
  language: string;
  diagnostics: DiagnosticItem[];
  settings: WorkspaceSettings;
  gitBranch?: string | null;
  strandCount?: number;
  onToggleProblems: () => void;
  onToggleLoom: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  cursorPosition,
  language,
  diagnostics,
  settings,
  gitBranch = null,
  strandCount = 0,
  onToggleProblems,
  onToggleLoom,
}) => {
  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  return (
    <footer
      role="contentinfo"
      aria-label="Status Bar"
      className="h-6 overflow-hidden bg-editor-activity border-t border-editor-border flex items-center justify-between gap-3 px-3 text-[11px] text-editor-muted select-none z-30 shrink-0 font-sans"
    >
      {/* Left side items */}
      <div className="status-left flex min-w-0 items-center space-x-3 overflow-hidden">
        {gitBranch && (
          <div
            className="flex items-center space-x-1 hover:text-editor-text"
            title={`Git branch: ${gitBranch}`}
          >
            <GitBranch className="w-3 h-3 text-amber-400" />
            <span className="max-w-36 truncate">{gitBranch}</span>
          </div>
        )}

        <button
          onClick={onToggleProblems}
          className="flex items-center space-x-1 hover:text-editor-text transition-colors"
          title="Click to view problems"
        >
          {errorCount > 0 ? (
            <>
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span className="text-red-400 font-medium">{errorCount}</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span>0</span>
            </>
          )}
          {warningCount > 0 && (
            <>
              <AlertTriangle className="w-3 h-3 text-amber-400 ml-1" />
              <span className="text-amber-400 font-medium">{warningCount}</span>
            </>
          )}
        </button>

        <button
          onClick={onToggleLoom}
          className={`flex items-center space-x-1 transition-colors ${
            strandCount > 0
              ? 'text-emerald-400/90 hover:text-emerald-300'
              : 'text-editor-muted hover:text-editor-text'
          }`}
          title={
            strandCount > 0
              ? `${strandCount} Loom ${strandCount === 1 ? 'strand' : 'strands'} reported by the last run`
              : 'No Loom telemetry reported by the current runtime'
          }
        >
          <Cpu className="w-3 h-3 text-amber-400" />
          <span className="status-loom-label whitespace-nowrap">
            {strandCount > 0
              ? `Loom: ${strandCount} ${strandCount === 1 ? 'strand' : 'strands'}`
              : 'Loom: No telemetry'}
          </span>
        </button>
      </div>

      {/* Right side items */}
      <div className="status-right flex shrink-0 items-center space-x-4 whitespace-nowrap">
        {cursorPosition && (
          <div className="status-cursor hover:text-editor-text">
            <span>
              Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
            </span>
          </div>
        )}

        <div className="status-spaces hover:text-editor-text">
          <span>Spaces: {settings.tabSize}</span>
        </div>

        <div className="status-encoding hover:text-editor-text">
          <span>UTF-8</span>
        </div>

        <div className="status-line-ending hover:text-editor-text">
          <span>LF</span>
        </div>

        <div className="flex items-center space-x-1 text-amber-400 font-medium">
          <span>{language === 'weave' ? 'Weave (.wv)' : language}</span>
        </div>
      </div>
    </footer>
  );
};

import React from 'react';
import { GitBranch, AlertTriangle, CheckCircle, Cpu } from 'lucide-react';
import { DiagnosticItem, WorkspaceSettings } from '../types';

interface StatusBarProps {
  cursorPosition?: { lineNumber: number; column: number };
  language: string;
  diagnostics: DiagnosticItem[];
  settings: WorkspaceSettings;
  onToggleProblems: () => void;
  onToggleLoom: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  cursorPosition,
  language,
  diagnostics,
  settings,
  onToggleProblems,
  onToggleLoom,
}) => {
  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  return (
    <footer
      role="contentinfo"
      aria-label="Status Bar"
      className="h-6 bg-editor-activity border-t border-editor-border flex items-center justify-between px-3 text-[11px] text-editor-muted select-none z-30 shrink-0 font-sans"
    >
      {/* Left side items */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1 hover:text-editor-text cursor-pointer">
          <GitBranch className="w-3 h-3 text-amber-400" />
          <span>main</span>
        </div>

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
          className="flex items-center space-x-1 text-emerald-400/90 hover:text-emerald-300 transition-colors"
          title="Loom Concurrency Engine: 4 Work-stealing Threads"
        >
          <Cpu className="w-3 h-3 text-amber-400" />
          <span>Loom: Online</span>
        </button>
      </div>

      {/* Right side items */}
      <div className="flex items-center space-x-4">
        {cursorPosition && (
          <div className="hover:text-editor-text">
            <span>
              Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
            </span>
          </div>
        )}

        <div className="hover:text-editor-text">
          <span>Spaces: {settings.tabSize}</span>
        </div>

        <div className="hover:text-editor-text">
          <span>UTF-8</span>
        </div>

        <div className="hover:text-editor-text">
          <span>LF</span>
        </div>

        <div className="flex items-center space-x-1 text-amber-400 font-medium">
          <span>{language === 'weave' ? 'Weave (.wv)' : language}</span>
        </div>
      </div>
    </footer>
  );
};

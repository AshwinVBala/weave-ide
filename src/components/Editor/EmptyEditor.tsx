import { FilePlus, Terminal, Sparkles } from 'lucide-react';
import { WeaveLogo } from '../Branding/WeaveLogo';

interface EmptyEditorProps {
  onNewFile: () => void;
  onOpenSample: (path: string) => void;
  onToggleTerminal: () => void;
}

export const EmptyEditor: React.FC<EmptyEditorProps> = ({
  onNewFile,
  onOpenSample,
  onToggleTerminal,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-editor-text select-none bg-editor-bg">
      <div className="max-w-md w-full space-y-6 text-center">
        {/* Weave Icon & Branding */}
        <div className="flex flex-col items-center space-y-3">
          <div className="p-3 rounded-3xl bg-studio-card/80 border border-neutral-700/60 shadow-2xl backdrop-blur-xl flex items-center justify-center">
            <WeaveLogo size={64} glow={true} animated={true} />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">Weave IDE</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                STUDIO
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              High-performance Concurrent Programming Environment
            </p>
          </div>
        </div>

        {/* Quick Start Actions */}
        <div className="bg-editor-sidebar border border-editor-border rounded-xl p-4 space-y-2 text-left shadow-lg">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-editor-muted mb-2 px-1">
            Start Developing
          </div>

          <button
            onClick={onNewFile}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-editor-hover text-xs text-editor-text transition-colors group"
          >
            <FilePlus className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <div className="flex-1">
              <span className="font-medium">New Weave File</span>
              <span className="text-[11px] text-editor-muted block">Create an empty .wv module</span>
            </div>
            <span className="text-[10px] font-mono text-editor-muted">Ctrl+N</span>
          </button>

          <button
            onClick={() => onOpenSample('/workspace/src/main.wv')}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-editor-hover text-xs text-editor-text transition-colors group"
          >
            <Sparkles className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <div className="flex-1">
              <span className="font-medium">Open Loom Concurrency Demo</span>
              <span className="text-[11px] text-editor-muted block">Inspect Strands, Fibers, and Channels</span>
            </div>
            <span className="text-[10px] font-mono text-amber-400">main.wv</span>
          </button>

          <button
            onClick={onToggleTerminal}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-editor-hover text-xs text-editor-text transition-colors group"
          >
            <Terminal className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
            <div className="flex-1">
              <span className="font-medium">Open Integrated Terminal</span>
              <span className="text-[11px] text-editor-muted block">Execute `weave run`, `weave check`</span>
            </div>
            <span className="text-[10px] font-mono text-editor-muted">Ctrl+`</span>
          </button>
        </div>

        {/* Keyboard Shortcuts Cheatsheet */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-editor-muted text-left">
          <div className="flex justify-between px-2 py-1 bg-editor-panel/50 rounded border border-editor-border/40">
            <span>Save File</span>
            <kbd className="font-mono text-editor-text">Ctrl+S</kbd>
          </div>
          <div className="flex justify-between px-2 py-1 bg-editor-panel/50 rounded border border-editor-border/40">
            <span>Run File</span>
            <kbd className="font-mono text-editor-text">F5</kbd>
          </div>
          <div className="flex justify-between px-2 py-1 bg-editor-panel/50 rounded border border-editor-border/40">
            <span>Toggle Sidebar</span>
            <kbd className="font-mono text-editor-text">Ctrl+B</kbd>
          </div>
          <div className="flex justify-between px-2 py-1 bg-editor-panel/50 rounded border border-editor-border/40">
            <span>Find Text</span>
            <kbd className="font-mono text-editor-text">Ctrl+F</kbd>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect } from 'react';
import { Check, X, Sparkles } from 'lucide-react';
import { AIPatch } from '../../services/aiService';

interface InlineDiffReviewProps {
  patch: AIPatch | null;
  onAccept: () => void;
  onReject: () => void;
  filePath?: string;
}

export const InlineDiffReview: React.FC<InlineDiffReviewProps> = ({
  patch,
  onAccept,
  onReject,
  filePath,
}) => {
  useEffect(() => {
    if (!patch) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Enter or Ctrl+Enter to accept
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onAccept();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onReject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [patch, onAccept, onReject]);

  if (!patch) return null;

  const addedLines = patch.diffLines?.filter((l: { type: string }) => l.type === 'add').length || 0;
  const removedLines = patch.diffLines?.filter((l: { type: string }) => l.type === 'del').length || 0;

  return (
    <div
      data-testid="inline-diff-review-bar"
      className="absolute top-4 right-8 z-30 flex items-center gap-3 px-3.5 py-2 bg-[#0d0e15]/95 border border-cyan-500/40 rounded-xl shadow-floating backdrop-blur-2xl text-neutral-200 animate-slideDown"
    >
      {/* Diff Status Indicator */}
      <div className="flex items-center gap-2">
        <div className="p-1 rounded bg-cyan-500/20 text-cyan-400">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white tracking-wide">
              AI Diff Generated
            </span>
            <div className="flex items-center gap-1 text-[10px] font-mono font-semibold">
              <span className="text-emerald-400">+{addedLines}</span>
              <span className="text-rose-400">-{removedLines}</span>
            </div>
          </div>
          <span className="text-[10px] text-neutral-400 truncate max-w-[180px]">
            {patch.summary || `${filePath || 'file'} modified`}
          </span>
        </div>
      </div>

      <div className="h-6 w-[1px] bg-white/[0.08]" />

      {/* Action Buttons: Accept & Reject */}
      <div className="flex items-center gap-2">
        {/* Accept Button (Cmd+Enter) */}
        <button
          type="button"
          onClick={onAccept}
          data-testid="btn-accept-diff"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all shadow-md active:scale-95"
          title="Accept changes (Cmd+Enter / Ctrl+Enter)"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Accept</span>
          <span className="text-[9px] font-mono bg-black/20 px-1 py-0.2 rounded ml-0.5">
            ⌘↵
          </span>
        </button>

        {/* Reject Button (Esc) */}
        <button
          type="button"
          onClick={onReject}
          data-testid="btn-reject-diff"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-rose-500/20 text-neutral-300 hover:text-rose-300 border border-white/[0.08] hover:border-rose-500/30 text-xs transition-all active:scale-95"
          title="Reject changes (Esc)"
        >
          <X className="w-3.5 h-3.5" />
          <span>Reject</span>
          <span className="text-[9px] font-mono text-neutral-400 ml-0.5">Esc</span>
        </button>
      </div>
    </div>
  );
};

export default InlineDiffReview;

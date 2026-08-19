import { Cpu, Zap, RefreshCw } from 'lucide-react';
import { LoomStrandInfo } from '../../types';

interface LoomMonitorPanelProps {
  strands: LoomStrandInfo[];
  onRefreshStrands?: () => void;
}

export const LoomMonitorPanel: React.FC<LoomMonitorPanelProps> = ({
  strands,
  onRefreshStrands,
}) => {
  const hasTelemetry = strands.length > 0;
  const activeStrandCount = strands.filter((strand) =>
    strand.status === 'running' || strand.status === 'blocked'
  ).length;

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-3 space-y-4 text-editor-text select-none">
      <div className="flex items-center justify-between border-b border-editor-border pb-2">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-editor-text">
            Loom Concurrency Monitor
          </h2>
        </div>
        {onRefreshStrands && (
          <button
            onClick={onRefreshStrands}
            className="p-1 text-editor-muted hover:text-amber-400 rounded"
            title="Refresh Loom Stats"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 bg-editor-panel rounded border border-editor-border">
          <div className="text-[11px] text-editor-muted">Runtime Telemetry</div>
          <div
            className={`text-base font-bold font-mono ${
              hasTelemetry ? 'text-emerald-400' : 'text-editor-muted'
            }`}
          >
            {hasTelemetry ? 'Live' : 'Waiting'}
          </div>
          <div className="text-[10px] text-editor-muted mt-0.5">
            {hasTelemetry ? 'Reported by the last run' : 'No runtime metrics received'}
          </div>
        </div>
        <div className="p-2.5 bg-editor-panel rounded border border-editor-border">
          <div className="text-[11px] text-editor-muted">Active Strands</div>
          <div className="text-base font-bold text-sky-400 font-mono">
            {activeStrandCount} {activeStrandCount === 1 ? 'Strand' : 'Strands'}
          </div>
          <div className="text-[10px] text-editor-muted mt-0.5">
            {strands.length} {strands.length === 1 ? 'strand' : 'strands'} reported
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-editor-muted">Reported Strands & Fibers</div>
        {hasTelemetry ? (
          <div className="space-y-2">
            {strands.map((strand) => (
              <div
                key={strand.id}
                className="p-2.5 bg-editor-panel/70 rounded-lg border border-editor-border space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-mono text-xs font-semibold text-editor-text">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>{strand.name}</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      strand.status === 'running'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : strand.status === 'idle'
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'bg-slate-500/20 text-slate-300'
                    }`}
                  >
                    {strand.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 text-[10px] text-editor-muted pt-1 border-t border-editor-border/50">
                  <div>
                    <span className="block text-editor-text font-mono font-medium">
                      {strand.fiberCount}
                    </span>
                    <span>Fibers</span>
                  </div>
                  <div>
                    <span className="block text-editor-text font-mono font-medium">
                      {strand.allocatedMemoryKb} KB
                    </span>
                    <span>Memory</span>
                  </div>
                  <div>
                    <span className="block text-editor-text font-mono font-medium">
                      {strand.executionTimeMs}ms
                    </span>
                    <span>Latency</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-editor-border bg-editor-panel/40 px-4 py-6 text-center">
            <Cpu className="w-6 h-6 mx-auto mb-2 text-editor-muted" />
            <div className="text-xs font-medium text-editor-text">No Loom telemetry</div>
            <p className="mt-1 text-[11px] leading-relaxed text-editor-muted">
              Run a program with a Weave runtime that reports strand metrics to populate this view.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

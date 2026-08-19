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
  const defaultStrands: LoomStrandInfo[] = [
    {
      id: 1,
      name: 'TaskWorker #1',
      status: 'running',
      fiberCount: 4,
      allocatedMemoryKb: 256,
      executionTimeMs: 14,
    },
    {
      id: 2,
      name: 'SensorProducer',
      status: 'idle',
      fiberCount: 2,
      allocatedMemoryKb: 128,
      executionTimeMs: 8,
    },
    {
      id: 3,
      name: 'FilterStrand',
      status: 'completed',
      fiberCount: 1,
      allocatedMemoryKb: 96,
      executionTimeMs: 4,
    },
  ];

  const activeStrands = strands.length > 0 ? strands : defaultStrands;

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

      {/* Loom Status Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 bg-editor-panel rounded border border-editor-border">
          <div className="text-[11px] text-editor-muted">Loom Cores</div>
          <div className="text-base font-bold text-amber-400 font-mono">4 Cores</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Work-stealing active</div>
        </div>
        <div className="p-2.5 bg-editor-panel rounded border border-editor-border">
          <div className="text-[11px] text-editor-muted">Active Strands</div>
          <div className="text-base font-bold text-sky-400 font-mono">
            {activeStrands.length} Strands
          </div>
          <div className="text-[10px] text-editor-muted mt-0.5">Lock-free mailbox</div>
        </div>
      </div>

      {/* Strands List */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-editor-muted">Active Strands & Fibers</div>
        <div className="space-y-2">
          {activeStrands.map((strand) => (
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
                  <span className="block text-editor-text font-mono font-medium">{strand.fiberCount}</span>
                  <span>Fibers</span>
                </div>
                <div>
                  <span className="block text-editor-text font-mono font-medium">{strand.allocatedMemoryKb} KB</span>
                  <span>Memory</span>
                </div>
                <div>
                  <span className="block text-editor-text font-mono font-medium">{strand.executionTimeMs}ms</span>
                  <span>Latency</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

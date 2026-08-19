import React from 'react';
import {
  Bot,
  Files,
  Search,
  Settings,
  Cpu,
  Terminal,
  Play,
} from 'lucide-react';
import { SidebarView } from '../types';
import { WeaveLogo } from './Branding/WeaveLogo';

interface ActivityBarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  isBottomPanelOpen: boolean;
  onToggleBottomPanel: () => void;
  onRunCurrentFile: () => void;
  hasActiveFile: boolean;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeView,
  onViewChange,
  isBottomPanelOpen,
  onToggleBottomPanel,
  onRunCurrentFile,
  hasActiveFile,
}) => {
  const topItems: Array<{ id: NonNullable<SidebarView>; icon: React.ReactNode; label: string; shortcut: string }> = [
    {
      id: 'agent',
      icon: <Bot className="w-5 h-5 text-cyan-400" />,
      label: 'Agent Workspace (AI Studio)',
      shortcut: 'A',
    },
    {
      id: 'explorer',
      icon: <Files className="w-5 h-5" />,
      label: 'Explorer (Ctrl+Shift+E)',
      shortcut: 'E',
    },
    {
      id: 'search',
      icon: <Search className="w-5 h-5" />,
      label: 'Search (Ctrl+Shift+F)',
      shortcut: 'F',
    },
    {
      id: 'loom',
      icon: <Cpu className="w-5 h-5" />,
      label: 'Weave Loom Monitor',
      shortcut: 'L',
    },
    {
      id: 'settings',
      icon: <Settings className="w-5 h-5" />,
      label: 'Workspace Settings (Ctrl+,)',
      shortcut: ',',
    },
  ];

  return (
    <aside
      aria-label="Activity Bar"
      className="w-12 bg-studio-glass backdrop-blur-xl border-r border-studio-border flex flex-col items-center justify-between py-2.5 select-none z-20 shrink-0"
    >
      {/* Top action icons */}
      <div className="flex flex-col items-center space-y-1.5 w-full">
        {/* Weave Brand Logo Icon */}
        <div
          onClick={() => onViewChange('agent')}
          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-105 mb-1"
          title="Weave Studio AI"
        >
          <WeaveLogo size={24} glow={true} animated={false} />
        </div>

        {topItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(isActive ? null : item.id)}
              className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all group ${
                isActive
                  ? 'text-cyan-400 bg-neutral-800/80 border border-neutral-700 shadow-glow-cyan'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-cyan-400 rounded-r shadow-glow-cyan" />
              )}
              {item.icon}
            </button>
          );
        })}

        {/* Quick Run Action */}
        <button
          onClick={onRunCurrentFile}
          disabled={!hasActiveFile}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
            hasActiveFile
              ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 cursor-pointer'
              : 'text-neutral-600 cursor-not-allowed'
          }`}
          title="Run Current Weave File (F5)"
          aria-label="Run Weave File"
        >
          <Play className="w-5 h-5 fill-current" />
        </button>
      </div>

      {/* Bottom utility icons */}
      <div className="flex flex-col items-center space-y-1 w-full">
        <button
          onClick={onToggleBottomPanel}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
            isBottomPanelOpen
              ? 'text-amber-400 bg-neutral-800/80 border border-neutral-700'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
          }`}
          title="Toggle Terminal Panel (Ctrl+`)"
          aria-label="Toggle Terminal Panel"
        >
          <Terminal className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
};

export default ActivityBar;

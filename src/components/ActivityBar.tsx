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
      icon: <Bot className="w-[18px] h-[18px]" />,
      label: 'Agent Workspace (AI Studio)',
      shortcut: 'A',
    },
    {
      id: 'explorer',
      icon: <Files className="w-[18px] h-[18px]" />,
      label: 'Explorer (Ctrl+Shift+E)',
      shortcut: 'E',
    },
    {
      id: 'search',
      icon: <Search className="w-[18px] h-[18px]" />,
      label: 'Search (Ctrl+Shift+F)',
      shortcut: 'F',
    },
    {
      id: 'loom',
      icon: <Cpu className="w-[18px] h-[18px]" />,
      label: 'Weave Loom Monitor',
      shortcut: 'L',
    },
    {
      id: 'settings',
      icon: <Settings className="w-[18px] h-[18px]" />,
      label: 'Workspace Settings (Ctrl+,)',
      shortcut: ',',
    },
  ];

  return (
    <aside
      aria-label="Activity Bar"
      className="activity-rail w-11 flex flex-col items-center justify-between py-2 select-none z-20 shrink-0"
    >
      {/* Top action icons */}
      <div className="flex flex-col items-center gap-1 w-full">
        {topItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(isActive ? null : item.id)}
              className={`relative w-9 h-9 flex items-center justify-center rounded-md transition-all group ${
                isActive
                  ? 'text-[#f3f4f6] bg-white/[0.08]'
                  : 'text-[#656a76] hover:text-white hover:bg-white/[0.045]'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              {isActive && (
                <div className="absolute -left-1 top-2 bottom-2 w-0.5 bg-[#f0a35b] rounded-r" />
              )}
              {item.icon}
            </button>
          );
        })}

        {/* Quick Run Action */}
        <button
          onClick={onRunCurrentFile}
          disabled={!hasActiveFile}
          className={`w-9 h-9 flex items-center justify-center rounded-md transition-all ${
            hasActiveFile
              ? 'text-[#68c497] hover:text-[#7bd6aa] hover:bg-white/[0.045] cursor-pointer'
              : 'text-[#363a43] cursor-not-allowed'
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
          className={`w-9 h-9 flex items-center justify-center rounded-md transition-all ${
            isBottomPanelOpen
              ? 'text-[#f5b97e] bg-white/[0.08]'
              : 'text-[#656a76] hover:text-white hover:bg-white/[0.045]'
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

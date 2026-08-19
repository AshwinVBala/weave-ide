import { X, Plus } from 'lucide-react';
import { EditorTab } from '../../types';
import { FileIcon } from '../Common/FileIcon';

interface EditorTabsProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  onNewFileClick?: () => void;
}

export const EditorTabs: React.FC<EditorTabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewFileClick,
}) => {
  // Guarantee strict single active tab list without duplicate paths
  const uniqueTabs = tabs.filter(
    (tab, index, self) =>
      index === self.findIndex((t) => t.path === tab.path || t.id === tab.id)
  );

  if (uniqueTabs.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label="Editor tabs"
      className="flex items-center bg-[#08090c] border-b border-white/[0.05] overflow-x-auto select-none custom-scrollbar shrink-0 h-9"
    >
      {uniqueTabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-label={tab.title}
            onClick={() => onSelectTab(tab.id)}
            onAuxClick={(e) => {
              if (e.button === 1) {
                onCloseTab(tab.id, e);
              }
            }}
            className={`group flex items-center space-x-2 px-3 py-1.5 h-full border-r border-white/[0.05] text-xs cursor-pointer transition-colors max-w-[200px] shrink-0 ${
              isActive
                ? 'bg-white/[0.04] text-[#F9FAFB] font-medium border-t-2 border-t-[#FF9D00]'
                : 'text-[#6B7280] hover:bg-white/[0.02] hover:text-[#F9FAFB]'
            }`}
          >
            <FileIcon name={tab.title} className="w-3.5 h-3.5" />
            <span className="truncate">{tab.title}</span>

            {/* Dirty indicator or Close button */}
            <div className="flex items-center ml-1">
              {tab.isDirty && (
                <span
                  title="Unsaved changes"
                  className="w-1.5 h-1.5 rounded-full bg-[#FF9D00] group-hover:hidden"
                />
              )}
              <button
                onClick={(e) => onCloseTab(tab.id, e)}
                className={`p-0.5 rounded text-[#6B7280] hover:text-[#F9FAFB] hover:bg-white/[0.08] ${
                  tab.isDirty ? 'hidden group-hover:block' : ''
                }`}
                title="Close tab"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}

      {onNewFileClick && (
        <button
          onClick={onNewFileClick}
          className="p-1.5 ml-1 text-[#6B7280] hover:text-[#F9FAFB] hover:bg-white/[0.04] rounded transition-colors"
          title="New Untitled Weave File"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

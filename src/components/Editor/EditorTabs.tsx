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
  if (tabs.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label="Editor tabs"
      className="flex items-center bg-editor-inactiveTab border-b border-editor-border overflow-x-auto select-none custom-scrollbar shrink-0 h-9"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-label={tab.title}
            onClick={() => onSelectTab(tab.id)}
            onAuxClick={(e) => {
              // Middle click close tab
              if (e.button === 1) {
                onCloseTab(tab.id, e);
              }
            }}
            className={`group flex items-center space-x-2 px-3 py-1.5 h-full border-r border-editor-border text-xs cursor-pointer transition-colors max-w-[200px] shrink-0 ${
              isActive
                ? 'bg-editor-activeTab text-editor-text font-medium border-t-2 border-t-amber-400'
                : 'text-editor-muted hover:bg-editor-hover/50 hover:text-editor-text'
            }`}
          >
            <FileIcon name={tab.title} className="w-3.5 h-3.5" />
            <span className="truncate">{tab.title}</span>

            {/* Dirty indicator or Close button */}
            <div className="flex items-center ml-1">
              {tab.isDirty && (
                <span
                  title="Unsaved changes"
                  className="w-2 h-2 rounded-full bg-amber-400 group-hover:hidden"
                />
              )}
              <button
                onClick={(e) => onCloseTab(tab.id, e)}
                className={`p-0.5 rounded text-editor-muted hover:text-editor-text hover:bg-editor-hover ${
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
          className="p-1.5 ml-1 text-editor-muted hover:text-editor-text hover:bg-editor-hover rounded transition-colors"
          title="New Untitled Weave File"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

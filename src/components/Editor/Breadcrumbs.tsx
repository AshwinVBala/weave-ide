import React from 'react';
import { ChevronRight } from 'lucide-react';
import { FileIcon } from '../Common/FileIcon';

interface BreadcrumbsProps {
  filePath: string | null;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ filePath }) => {
  if (!filePath) return null;

  const parts = filePath.split('/').filter(Boolean);

  return (
    <div className="flex items-center space-x-1 px-3 py-1 bg-editor-bg border-b border-editor-border/60 text-[11px] text-editor-muted select-none">
      {parts.map((segment, idx) => {
        const isLast = idx === parts.length - 1;
        return (
          <React.Fragment key={`${segment}-${idx}`}>
            {idx > 0 && <ChevronRight className="w-3 h-3 text-editor-border shrink-0" />}
            <span
              className={`flex items-center space-x-1 truncate ${
                isLast ? 'text-editor-text font-medium' : 'hover:text-editor-text cursor-pointer'
              }`}
            >
              {isLast && <FileIcon name={segment} className="w-3 h-3 mr-1" />}
              <span>{segment}</span>
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};

import React from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  FileCog,
  File,
  Layers,
} from 'lucide-react';

interface FileIconProps {
  isDir?: boolean;
  isOpen?: boolean;
  extension?: string;
  name?: string;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({
  isDir,
  isOpen,
  extension,
  name = '',
  className = 'w-4 h-4',
}) => {
  if (isDir) {
    return isOpen ? (
      <FolderOpen className={`${className} text-amber-400 shrink-0`} />
    ) : (
      <Folder className={`${className} text-amber-400/80 shrink-0`} />
    );
  }

  const ext = (extension || name.split('.').pop() || '').toLowerCase();

  // Custom Weave language icon (.wv or .weave)
  if (ext === 'wv' || ext === 'weave') {
    return (
      <span className="relative flex items-center justify-center shrink-0" title="Weave Source File">
        <Layers className={`${className} text-amber-400 font-bold`} />
      </span>
    );
  }

  switch (ext) {
    case 'json':
      return <FileJson className={`${className} text-yellow-400 shrink-0`} />;
    case 'toml':
    case 'yaml':
    case 'yml':
    case 'ini':
      return <FileCog className={`${className} text-emerald-400 shrink-0`} />;
    case 'md':
    case 'txt':
    case 'markdown':
      return <FileText className={`${className} text-sky-400 shrink-0`} />;
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'rs':
      return <FileCode className={`${className} text-blue-400 shrink-0`} />;
    default:
      return <File className={`${className} text-slate-400 shrink-0`} />;
  }
};

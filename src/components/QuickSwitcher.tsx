import React, { useState, useEffect, useRef } from 'react';
import { Search, FileCode, CornerDownLeft, Sparkles, Folder, X, Clock } from 'lucide-react';
import { fsService } from '../services/fsService';
import { FileItem } from '../types';

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (filePath: string) => void;
  activeFilePath?: string | null;
  workspacePath?: string;
}

interface FlatFileEntry {
  path: string;
  name: string;
  directory: string;
  isWeave: boolean;
  isRecent?: boolean;
}

export const QuickSwitcher: React.FC<QuickSwitcherProps> = ({
  isOpen,
  onClose,
  onSelectFile,
  activeFilePath,
  workspacePath = '/workspace',
}) => {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<FlatFileEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Discover and flatten all files from workspace tree
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadFiles = async () => {
      try {
        const tree = await fsService.buildTree(workspacePath);
        if (!isMounted || !tree) return;

        const collected: FlatFileEntry[] = [];
        const traverse = (node: FileItem) => {
          if (!node.isDir) {
            const parts = node.path.split('/');
            const name = parts.pop() || node.name;
            const directory = parts.join('/').replace(workspacePath, '') || '/';
            collected.push({
              path: node.path,
              name,
              directory,
              isWeave: name.endsWith('.wv') || name.endsWith('.weave'),
              isRecent: node.path === activeFilePath,
            });
          }
          if (node.children) {
            node.children.forEach(traverse);
          }
        };

        traverse(tree);
        setFiles(collected);
      } catch (err) {
        console.error('Failed to index workspace files for quick switcher:', err);
      }
    };

    loadFiles();
    setQuery('');
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 40);

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeFilePath, workspacePath]);

  // Filtered files
  const filteredFiles = files.filter((f) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.directory.toLowerCase().includes(q) || f.path.toLowerCase().includes(q);
  });

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredFiles.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev === 0 ? Math.max(0, filteredFiles.length - 1) : prev - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredFiles.length > 0 && selectedIndex < filteredFiles.length) {
          onSelectFile(filteredFiles[selectedIndex].path);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredFiles, selectedIndex, onSelectFile, onClose]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="quick-switcher-modal"
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-start justify-center pt-24 px-4 select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#0d0e15]/95 border border-white/[0.08] rounded-2xl shadow-floating overflow-hidden backdrop-blur-2xl text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-white/[0.07] gap-3 bg-studio-glass">
          <Search className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Quick open file by name or path (Cmd+P)..."
            className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
            <span>ESC</span>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
          {filteredFiles.length > 0 ? (
            filteredFiles.map((file, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={file.path}
                  onClick={() => {
                    onSelectFile(file.path);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-950/40 to-neutral-900 border border-cyan-500/30 text-white shadow-sm'
                      : 'hover:bg-neutral-900/60 text-neutral-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg ${
                        file.isWeave
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      <FileCode className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white truncate font-mono">
                          {file.name}
                        </span>
                        {file.isRecent && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> active
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-500 truncate font-mono">
                        {file.directory}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400">
                        <span>Open</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-neutral-400 flex flex-col items-center gap-2">
              <Folder className="w-8 h-8 text-neutral-600" />
              <div className="text-xs font-semibold text-neutral-300">No matching files found</div>
              <div className="text-[11px] text-neutral-500">Try searching for counter.wv, main.wv, or theme files</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#090a0f] border-t border-white/[0.07] flex items-center justify-between text-[11px] text-neutral-500 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>ESC Close</span>
          </div>
          <div className="flex items-center gap-1 text-cyan-400">
            <Sparkles className="w-3 h-3" />
            <span>Anti-Gravity Quick Switcher</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickSwitcher;

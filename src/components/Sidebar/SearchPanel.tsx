import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { fsService } from '../../services/fsService';
import { FileIcon } from '../Common/FileIcon';

interface SearchResult {
  filePath: string;
  line: number;
  content: string;
  matchIndex: number;
}

interface SearchPanelProps {
  onFileSelect: (path: string, line?: number, column?: number) => void;
  workspacePath?: string;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  onFileSelect,
  workspacePath = '/workspace',
}) => {
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setIsSearching(true);
    setSearched(true);
    const searchResults: SearchResult[] = [];

    try {
      const scanDir = async (path: string) => {
        const items = await fsService.listDir(path);
        for (const item of items) {
          if (item.isDir) {
            await scanDir(item.path);
          } else {
            try {
              const text = await fsService.readFile(item.path);
              const lines = text.split('\n');
              lines.forEach((lineText, lineIdx) => {
                const target = caseSensitive ? lineText : lineText.toLowerCase();
                const q = caseSensitive ? query : query.toLowerCase();
                const matchIdx = target.indexOf(q);
                if (matchIdx !== -1) {
                  searchResults.push({
                    filePath: item.path,
                    line: lineIdx + 1,
                    content: lineText.trim(),
                    matchIndex: matchIdx,
                  });
                }
              });
            } catch {
              // Ignore unreadable binary files
            }
          }
        }
      };

      await scanDir(workspacePath);
      setResults(searchResults);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col h-full select-none text-editor-text">
      <div className="px-3 py-2 border-b border-editor-border bg-editor-panel/50">
        <span className="text-xs font-semibold uppercase tracking-wider text-editor-muted">
          Search Workspace
        </span>
      </div>

      <form onSubmit={handleSearch} className="p-3 space-y-2 border-b border-editor-border">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all files..."
            className="w-full bg-editor-bg border border-editor-border rounded px-2.5 py-1.5 text-xs text-editor-text focus:outline-none focus:border-amber-500 pr-14"
          />
          <button
            type="button"
            onClick={() => setCaseSensitive(!caseSensitive)}
            className={`absolute right-7 top-1.5 px-1 py-0.5 text-[10px] font-mono rounded ${
              caseSensitive ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-editor-muted hover:text-editor-text'
            }`}
            title="Match Case"
          >
            Aa
          </button>
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 p-0.5 text-editor-muted hover:text-amber-400"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Search results */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {isSearching && (
          <div className="text-center py-4 text-xs text-editor-muted animate-pulse">
            Searching workspace...
          </div>
        )}

        {!isSearching && searched && results.length === 0 && (
          <div className="text-center py-6 text-xs text-editor-muted">
            No results found for "{query}".
          </div>
        )}

        {!isSearching &&
          results.map((res: SearchResult, idx: number) => (
            <div
              key={`${res.filePath}-${res.line}-${idx}`}
              onClick={() => onFileSelect(res.filePath, res.line, res.matchIndex + 1)}
              className="p-2 bg-editor-panel/40 hover:bg-editor-hover rounded cursor-pointer text-xs space-y-1 transition-colors border border-transparent hover:border-editor-border"
            >
              <div className="flex items-center space-x-1.5 text-editor-muted text-[11px]">
                <FileIcon name={res.filePath.split('/').pop()} className="w-3.5 h-3.5" />
                <span className="truncate font-mono text-editor-text">
                  {res.filePath.startsWith(`${workspacePath}/`)
                    ? res.filePath.slice(workspacePath.length + 1)
                    : res.filePath}
                </span>
                <span>:</span>
                <span className="text-amber-400 font-mono font-semibold">{res.line}</span>
              </div>
              <p className="font-mono text-xs text-editor-text truncate pl-5">
                {res.content}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
};

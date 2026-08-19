import React, { useState, useRef, useEffect } from 'react';
import { WeaveCompilerService } from '../../services/compilerService';
import { terminalService, TerminalEntry } from '../../services/terminalService';
import { fsService } from '../../services/fsService';
import { DiagnosticItem, LoomStrandInfo } from '../../types';

interface InteractiveTerminalProps {
  currentFilePath: string | null;
  onDiagnosticsUpdate?: (diags: DiagnosticItem[]) => void;
  onStrandsUpdate?: (strands: LoomStrandInfo[]) => void;
}

export const InteractiveTerminal: React.FC<InteractiveTerminalProps> = ({
  currentFilePath,
  onDiagnosticsUpdate,
  onStrandsUpdate,
}) => {
  const [lines, setLines] = useState<TerminalEntry[]>(() => terminalService.getLines());
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isRunning, setIsRunning] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to central terminal output stream
  useEffect(() => {
    const unsubscribe = terminalService.subscribe((newLines) => {
      setLines(newLines);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const handleCommand = async (cmdStr: string) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    terminalService.addLine('command', `$ ${trimmed}`);
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    const parts = trimmed.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (cmd === 'clear' || cmd === 'cls') {
      terminalService.clear();
      return;
    }

    if (cmd === 'help') {
      terminalService.addLines([
        { type: 'info', content: 'Available Weave IDE Commands:' },
        { type: 'output', content: '  weave run [file.wv]   - Compile and run Weave program' },
        { type: 'output', content: '  weave check [file.wv] - Typecheck and validate AST' },
        { type: 'output', content: '  weave build           - Compile release binary with Loom' },
        { type: 'output', content: '  weave test            - Execute unit tests' },
        { type: 'output', content: '  ls [dir]              - List files in directory' },
        { type: 'output', content: '  cat <file>            - View contents of file' },
        { type: 'output', content: '  pwd                   - Print current workspace path' },
        { type: 'output', content: '  clear                 - Clear terminal screen' },
      ]);
      return;
    }

    if (cmd === 'pwd') {
      terminalService.addLine('output', '/workspace');
      return;
    }

    if (cmd === 'ls') {
      try {
        const targetDir = args[0] || '/workspace';
        const items = await fsService.listDir(targetDir);
        const listing = items
          .map((i) => (i.isDir ? `${i.name}/` : i.name))
          .join('   ');
        terminalService.addLine('output', listing || '(empty)');
      } catch (err: unknown) {
        terminalService.addLine('error', `ls error: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    if (cmd === 'cat') {
      if (!args[0]) {
        terminalService.addLine('error', 'Usage: cat <file_path>');
        return;
      }
      try {
        const fullPath = args[0].startsWith('/') ? args[0] : `/workspace/${args[0]}`.replace(/\/+/g, '/');
        const content = await fsService.readFile(fullPath);
        terminalService.addLine('output', content);
      } catch (err: unknown) {
        terminalService.addLine('error', `cat error: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    if (cmd === 'weave') {
      const subCmd = args[0] || 'run';
      const targetFile = args[1] || currentFilePath || '/workspace/src/main.wv';

      setIsRunning(true);

      if (subCmd === 'run' || subCmd === 'check') {
        const res = await WeaveCompilerService.runFile(targetFile);
        if (onDiagnosticsUpdate) onDiagnosticsUpdate(res.diagnostics);
        if (onStrandsUpdate && res.strands.length > 0) onStrandsUpdate(res.strands);

        res.output.forEach((line) => {
          terminalService.addLine(res.success ? 'output' : 'error', line);
        });
      } else if (subCmd === 'build') {
        const res = await WeaveCompilerService.buildProject();
        res.output.forEach((line) => {
          terminalService.addLine('output', line);
        });
      } else if (subCmd === 'test') {
        const res = await WeaveCompilerService.testProject();
        res.output.forEach((line) => {
          terminalService.addLine('output', line);
        });
      } else {
        terminalService.addLine('error', `Unknown weave subcommand '${subCmd}'. Try: run, build, test, check.`);
      }

      setIsRunning(false);
      return;
    }

    terminalService.addLine('error', `Command not found: ${cmd}. Type \`help\` for a list of commands.`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setInput(history[nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= history.length) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx] || '');
      }
    }
  };

  // Strip ANSI color escape codes for clean web display or styled spans
  const formatTerminalLine = (text: string) => {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  };

  return (
    <div
      className="flex flex-col h-full bg-[#0a0c10] text-editor-text font-mono text-xs overflow-hidden"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Scrollable output area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        {lines.map((line) => (
          <div
            key={line.id}
            className={`whitespace-pre-wrap leading-relaxed ${
              line.type === 'command'
                ? 'text-amber-400 font-semibold'
                : line.type === 'error'
                ? 'text-red-400'
                : line.type === 'success'
                ? 'text-emerald-400'
                : line.type === 'info'
                ? 'text-cyan-400'
                : 'text-neutral-300'
            }`}
          >
            {formatTerminalLine(line.content)}
          </div>
        ))}
        {isRunning && (
          <div className="flex items-center space-x-2 text-cyan-400 animate-pulse">
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400" />
            <span>Weave compiler executing on Loom engine...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input prompt line */}
      <div className="flex items-center px-3 py-2 bg-[#121620]/90 border-t border-neutral-800">
        <span className="text-amber-400 font-bold mr-2 select-none">weave-ide$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="weave run src/main.wv"
          className="flex-1 bg-transparent border-none outline-none text-neutral-100 font-mono text-xs"
          autoFocus
        />
      </div>
    </div>
  );
};

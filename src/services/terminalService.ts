export interface TerminalEntry {
  id: string;
  type: 'command' | 'output' | 'error' | 'success' | 'info';
  content: string;
  timestamp: number;
}

export interface ShellCommandResult {
  success: boolean;
  exit_code: number;
  stdout: string;
  stderr: string;
}

type TerminalListener = (lines: TerminalEntry[]) => void;

class TerminalService {
  private lines: TerminalEntry[] = [
    {
      id: 'init-1',
      type: 'info',
      content: 'Weave IDE Terminal — compiler backend is detected per command',
      timestamp: Date.now(),
    },
    {
      id: 'init-2',
      type: 'info',
      content: 'Type `help` for commands or click Run (F5) to execute the active .wv file.',
      timestamp: Date.now(),
    },
  ];
  private listeners: Set<TerminalListener> = new Set();

  public getLines(): TerminalEntry[] {
    return this.lines;
  }

  public addLine(type: TerminalEntry['type'], content: string) {
    this.addLines([{ type, content }]);
  }

  public addLines(newEntries: Array<{ type: TerminalEntry['type']; content: string }>) {
    const formatted = newEntries.map((e, idx) => ({
      id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      type: e.type,
      content: e.content,
      timestamp: Date.now(),
    }));
    this.lines = [...this.lines, ...formatted];
    this.notify();
  }

  public clear() {
    this.lines = [];
    this.notify();
  }

  public get canExecuteShell(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
      (window as unknown as { __TAURI__?: unknown }).__TAURI__
    );
  }

  public async executeShellCommand(command: string, cwd: string): Promise<ShellCommandResult> {
    if (!this.canExecuteShell) {
      throw new Error('Shell commands require the Weave desktop app.');
    }
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<ShellCommandResult>('execute_shell_command', { command, cwd });
  }

  public async resolveDirectory(path: string, cwd: string): Promise<string> {
    if (!this.canExecuteShell) throw new Error('Directory resolution requires the desktop app.');
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<string>('resolve_terminal_directory', { path, cwd });
  }

  public async getGitBranch(cwd: string): Promise<string | null> {
    if (!this.canExecuteShell) return null;
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<string | null>('get_git_branch', { cwd });
  }

  public subscribe(listener: TerminalListener): () => void {
    this.listeners.add(listener);
    listener(this.lines);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.lines));
  }
}

export const terminalService = new TerminalService();

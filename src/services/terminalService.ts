export interface TerminalEntry {
  id: string;
  type: 'command' | 'output' | 'error' | 'success' | 'info';
  content: string;
  timestamp: number;
}

type TerminalListener = (lines: TerminalEntry[]) => void;

class TerminalService {
  private lines: TerminalEntry[] = [
    {
      id: 'init-1',
      type: 'info',
      content: 'Weave Interactive Shell v2.4.0 (x86_64-apple-darwin / Loom VM)',
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

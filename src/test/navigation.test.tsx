import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { revealEditorLocation } from '../components/Editor/MonacoEditor';
import { SearchPanel } from '../components/Sidebar/SearchPanel';
import { TerminalPanel } from '../components/Terminal/TerminalPanel';
import { inMemoryFs } from '../services/fsService';

describe('editor location navigation', () => {
  beforeEach(() => inMemoryFs.reset());

  it('moves and reveals the Monaco cursor at the requested source location', () => {
    const editor = {
      setPosition: vi.fn(),
      revealPositionInCenter: vi.fn(),
      focus: vi.fn(),
    };

    revealEditorLocation(editor as never, 12, 7);

    expect(editor.setPosition).toHaveBeenCalledWith({ lineNumber: 12, column: 7 });
    expect(editor.revealPositionInCenter).toHaveBeenCalledWith({ lineNumber: 12, column: 7 });
    expect(editor.focus).toHaveBeenCalled();
  });

  it('sends the exact line and column when a workspace search result is opened', async () => {
    await inMemoryFs.writeFile('/navigation/main.wv', 'first line\n  needle value');
    const onFileSelect = vi.fn();
    render(<SearchPanel workspacePath="/navigation" onFileSelect={onFileSelect} />);

    fireEvent.change(screen.getByPlaceholderText('Search all files...'), {
      target: { value: 'needle' },
    });
    fireEvent.click(screen.getByTitle('Search'));
    fireEvent.click(await screen.findByText('needle value'));

    expect(onFileSelect).toHaveBeenCalledWith('/navigation/main.wv', 2, 3);
  });

  it('opens the requested Diagnostics tab and forwards diagnostic clicks', async () => {
    const onJumpToDiagnostic = vi.fn();
    const diagnostic = {
      id: 'nav-error',
      filePath: '/navigation/main.wv',
      line: 4,
      column: 9,
      message: 'Expected closing brace',
      severity: 'error' as const,
    };
    render(
      <TerminalPanel
        isOpen
        onClose={() => {}}
        currentFilePath="/navigation/main.wv"
        workspacePath="/navigation"
        diagnostics={[diagnostic]}
        strands={[]}
        onDiagnosticsUpdate={() => {}}
        onStrandsUpdate={() => {}}
        onJumpToDiagnostic={onJumpToDiagnostic}
        requestedTab={{ tab: 'problems', requestId: 1 }}
      />
    );

    const error = await screen.findByText('Expected closing brace');
    fireEvent.click(error);
    await waitFor(() => expect(onJumpToDiagnostic).toHaveBeenCalledWith(diagnostic));
  });
});

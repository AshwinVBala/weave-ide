import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { InteractiveTerminal } from '../components/Terminal/InteractiveTerminal';
import { terminalService } from '../services/terminalService';

describe('native IDE terminal', () => {
  beforeEach(() => {
    terminalService.clear();
    vi.mocked(invoke).mockReset();
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      configurable: true,
      value: {},
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
  });

  it('changes directory and executes arbitrary shell commands in that directory', async () => {
    vi.mocked(invoke).mockImplementation(async (command, args) => {
      if (command === 'resolve_terminal_directory') return '/projects/atlas/src';
      if (command === 'execute_shell_command') {
        return {
          success: true,
          exit_code: 0,
          stdout: 'On branch main\n',
          stderr: '',
        };
      }
      throw new Error(`Unexpected command: ${command} ${JSON.stringify(args)}`);
    });
    render(
      <InteractiveTerminal
        currentFilePath="/projects/atlas/src/main.wv"
        workspacePath="/projects/atlas"
      />
    );
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: 'cd src' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith('resolve_terminal_directory', {
        path: 'src',
        cwd: '/projects/atlas',
      })
    );
    await waitFor(() => expect(screen.getByTitle('/projects/atlas/src')).toBeInTheDocument());

    fireEvent.change(input, { target: { value: 'git status --short' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('execute_shell_command', {
        command: 'git status --short',
        cwd: '/projects/atlas/src',
      });
      expect(screen.getByText('On branch main')).toBeInTheDocument();
    });
  });

  it('shows stderr and the real nonzero exit code', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      success: false,
      exit_code: 2,
      stdout: '',
      stderr: 'command failed\n',
    });
    render(
      <InteractiveTerminal currentFilePath={null} workspacePath="/projects/atlas" />
    );
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: 'false' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(await screen.findByText('command failed')).toBeInTheDocument();
    expect(screen.getByText('Process exited with code 2.')).toBeInTheDocument();
  });
});

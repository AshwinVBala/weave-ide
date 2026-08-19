import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { InteractiveTerminal } from '../components/Terminal/InteractiveTerminal';
import { WeaveCompilerService } from '../services/compilerService';

describe('Weave Interactive Terminal & Compiler Tests', () => {
  it('renders terminal prompt and initial banner', () => {
    render(
      <InteractiveTerminal
        currentFilePath="/workspace/src/main.wv"
      />
    );

    expect(screen.getByText(/Weave Interactive Shell/i)).toBeInTheDocument();
    expect(screen.getByText('weave-ide$')).toBeInTheDocument();
  });

  it('compiles and runs Weave source file through WeaveCompilerService', async () => {
    const res = await WeaveCompilerService.runFile('/workspace/src/main.wv');
    expect(res.success).toBe(true);
    expect(res.strands.length).toBeGreaterThan(0);
    expect(res.strands.some((s) => s.name === 'TaskWorker')).toBe(true);
    expect(res.output.some((line) => line.includes('Weave Loom Engine'))).toBe(true);
  });

  it('runs build and test commands through WeaveCompilerService', async () => {
    const buildRes = await WeaveCompilerService.buildProject();
    expect(buildRes.success).toBe(true);
    expect(buildRes.output.some((line) => line.includes('Finished release target'))).toBe(true);

    const testRes = await WeaveCompilerService.testProject();
    expect(testRes.success).toBe(true);
    expect(testRes.output.some((line) => line.includes('3 passed'))).toBe(true);
  });

  it('executes help command in interactive terminal', async () => {
    render(
      <InteractiveTerminal
        currentFilePath="/workspace/src/main.wv"
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'help' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/Available Weave IDE Commands:/i)).toBeInTheDocument();
      expect(screen.getAllByText(/weave run/i).length).toBeGreaterThan(0);
    });
  });

  it('streams external command output to terminal via terminalService', async () => {
    const { terminalService } = await import('../services/terminalService');
    const { act } = await import('@testing-library/react');
    render(
      <InteractiveTerminal
        currentFilePath="/workspace/src/main.wv"
      />
    );

    act(() => {
      terminalService.addLine('command', '$ weave run main.wv');
      terminalService.addLine('output', 'Compiling main.wv on Loom VM...');
      terminalService.addLine('success', 'Program finished with code 0');
    });

    await waitFor(() => {
      expect(screen.getByText('$ weave run main.wv')).toBeInTheDocument();
      expect(screen.getByText('Compiling main.wv on Loom VM...')).toBeInTheDocument();
      expect(screen.getByText('Program finished with code 0')).toBeInTheDocument();
    });
  });
});

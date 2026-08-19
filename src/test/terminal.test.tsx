import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { InteractiveTerminal } from '../components/Terminal/InteractiveTerminal';
import { TerminalPanel } from '../components/Terminal/TerminalPanel';
import { WeaveCompilerService } from '../services/compilerService';
import { inMemoryFs } from '../services/fsService';
import { terminalService } from '../services/terminalService';

describe('Weave Interactive Terminal & Compiler Tests', () => {
  it('renders terminal prompt and initial banner', () => {
    render(
      <InteractiveTerminal
        currentFilePath="/workspace/src/main.wv"
      />
    );

    expect(screen.getByText(/Weave IDE Terminal/i)).toBeInTheDocument();
    expect(screen.getByText('weave-ide$')).toBeInTheDocument();
  });

  it('compiles but does not simulate execution when only browser WASM is available', async () => {
    const res = await WeaveCompilerService.runFile('/workspace/src/main.wv');
    expect(res.success).toBe(false);
    expect(res.strands).toHaveLength(0);
    expect(res.output.some((line) => line.includes('requires the native Weave CLI'))).toBe(true);
  });

  it('runs build and test commands through WeaveCompilerService', async () => {
    const buildRes = await WeaveCompilerService.buildProject();
    expect(buildRes.success).toBe(true);
    expect(buildRes.output.some((line) => line.includes('Compiled'))).toBe(true);

    const testRes = await WeaveCompilerService.testProject();
    expect(testRes.success).toBe(false);
    expect(testRes.output.some((line) => line.includes('cannot execute @test functions yet'))).toBe(true);
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

  it('resolves terminal commands against the selected workspace', async () => {
    await inMemoryFs.writeFile('/projects/atlas/src/entry.wv', 'component Atlas {}');
    await inMemoryFs.writeFile('/projects/atlas/src/with space.wv', 'component Spaced {}');
    render(
      <InteractiveTerminal
        currentFilePath="/projects/atlas/src/entry.wv"
        workspacePath="/projects/atlas"
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'pwd' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await waitFor(() => {
      expect(screen.getByText('/projects/atlas')).toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: 'cat src/entry.wv' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await waitFor(() => {
      expect(screen.getByText('component Atlas {}')).toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: 'cat "src/with space.wv"' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await waitFor(() => {
      expect(screen.getByText('component Spaced {}')).toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: 'cd src' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await waitFor(() => {
      expect(screen.getByTitle('/projects/atlas/src')).toBeInTheDocument();
    });
    fireEvent.change(input, { target: { value: 'pwd' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await waitFor(() => {
      expect(screen.getByText('/projects/atlas/src')).toBeInTheDocument();
    });
  });

  it('routes weave check to typechecking without executing the file', async () => {
    const checkSpy = vi.spyOn(WeaveCompilerService, 'checkFile').mockResolvedValueOnce({
      success: true,
      output: ['typecheck complete'],
      diagnostics: [],
      strands: [],
      executionTimeMs: 1,
      engine: 'wasm',
    });
    const runSpy = vi.spyOn(WeaveCompilerService, 'runFile');
    render(
      <InteractiveTerminal
        currentFilePath="/projects/atlas/src/entry.wv"
        workspacePath="/projects/atlas"
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'weave check src/entry.wv' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(checkSpy).toHaveBeenCalledWith('/projects/atlas/src/entry.wv');
      expect(runSpy).not.toHaveBeenCalled();
      expect(screen.getByText('typecheck complete')).toBeInTheDocument();
    });
    checkSpy.mockRestore();
    runSpy.mockRestore();
  });

  it('runs project commands in the selected workspace', async () => {
    const buildSpy = vi.spyOn(WeaveCompilerService, 'buildProject').mockResolvedValueOnce({
      success: true,
      output: ['workspace build complete'],
      diagnostics: [],
      strands: [],
      executionTimeMs: 1,
      engine: 'wasm',
    });
    render(
      <InteractiveTerminal
        currentFilePath="/projects/atlas/src/entry.wv"
        workspacePath="/projects/atlas"
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'weave build' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await waitFor(() => {
      expect(buildSpy).toHaveBeenCalledWith('/projects/atlas');
      expect(screen.getByText('workspace build complete')).toBeInTheDocument();
    });
    buildSpy.mockRestore();
  });

  it('shows shared compiler logs in the Output tab and can clear them', async () => {
    terminalService.clear();
    terminalService.addLine('command', '$ weave build --release');
    terminalService.addLine('output', 'Compiled atlas successfully');
    render(
      <TerminalPanel
        isOpen
        onClose={() => {}}
        currentFilePath="/projects/atlas/src/entry.wv"
        workspacePath="/projects/atlas"
        diagnostics={[]}
        strands={[]}
        onDiagnosticsUpdate={() => {}}
        onStrandsUpdate={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Output' }));
    expect(screen.getByText('$ weave build --release')).toBeInTheDocument();
    expect(screen.getByText('Compiled atlas successfully')).toBeInTheDocument();
    expect(screen.getByText('0 Strands')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Clear Output'));
    expect(screen.getByText('No compiler or command output yet.')).toBeInTheDocument();
  });
});

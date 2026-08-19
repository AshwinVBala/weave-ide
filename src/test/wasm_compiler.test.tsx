import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { wasmCompilerBridge } from '../services/wasmCompilerBridge';
import { WeaveCompilerService } from '../services/compilerService';
import { MonacoEditor } from '../components/Editor/MonacoEditor';
import { DEFAULT_SETTINGS } from '../App';
import { EditorTab } from '../types';

describe('WASM Language Client & Web Worker Bridge', () => {
  it('initializes WASM bridge and performs diagnostics check', async () => {
    const isReady = await wasmCompilerBridge.initialize();
    expect(isReady).toBe(true);

    const diags = await wasmCompilerBridge.checkDiagnostics(
      'component Counter { var count: Int = 0; }',
      'test.wv'
    );
    expect(Array.isArray(diags)).toBe(true);
  });

  it('parses Weave source code into AST via WASM worker', async () => {
    const code = `
      component App {
        var count: Int = 0;
        ui {
          div {
            button(onclick: fn() { count += 1; }) { "Increment" }
          }
        }
      }
    `;
    const ast = await wasmCompilerBridge.parseSource(code, 'app.wv');
    expect(ast).toBeDefined();
    expect(ast.ok).toBe(true);
    expect(ast.syntax_tree).toBeDefined();
  });

  it('executes Weave code in-memory via WASM Loom VM', async () => {
    const code = 'fn main() { io::println("Hello Weave WASM!"); }';
    const result = await wasmCompilerBridge.executeCode(code, 'main.wv');
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.mode).toBe('wasm');
    expect(result.output.length).toBeGreaterThan(0);
  });
});

describe('Fallback Service Router (Tauri IPC / In-Memory WASM)', () => {
  it('detects native environment status correctly and routes fallback to WASM', async () => {
    const status = await WeaveCompilerService.getNativeStatus();
    expect(status).toBeDefined();
    expect(typeof status.available).toBe('boolean');

    // Run file through the router
    const result = await WeaveCompilerService.runFile('/workspace/examples/counter.wv');
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.output.length).toBeGreaterThan(0);
    expect(['native', 'wasm']).toContain(result.engine);
  });

  it('builds project using the fallback router', async () => {
    const buildResult = await WeaveCompilerService.buildProject();
    expect(buildResult.success).toBe(true);
    expect(buildResult.output.length).toBeGreaterThan(0);
    expect(['native', 'wasm']).toContain(buildResult.engine);
  });

  it('runs tests using the fallback router', async () => {
    const testResult = await WeaveCompilerService.testProject();
    expect(testResult.success).toBe(true);
    expect(testResult.output.length).toBeGreaterThan(0);
    expect(['native', 'wasm']).toContain(testResult.engine);
  });
});

describe('Monaco Editor WASM Diagnostic Integration', () => {
  const sampleTab: EditorTab = {
    id: 'tab-1',
    path: '/workspace/src/counter.wv',
    title: 'counter.wv',
    content: 'component Counter { var count: Int = 0; }',
    savedContent: 'component Counter { var count: Int = 0; }',
    isDirty: false,
    language: 'weave',
  };

  it('renders Monaco Editor and triggers background WASM diagnostics on mount and change', async () => {
    const onDiagMock = vi.fn();
    const onAstMock = vi.fn();
    const onChangeMock = vi.fn();

    render(
      <MonacoEditor
        tab={sampleTab}
        settings={DEFAULT_SETTINGS}
        onChange={onChangeMock}
        onSave={() => {}}
        onDiagnosticsChange={onDiagMock}
        onAstChange={onAstMock}
      />
    );

    expect(screen.getByTestId('monaco-editor-container')).toBeInTheDocument();
    expect(screen.getByTestId('mock-monaco-editor')).toBeInTheDocument();

    // Trigger user typing
    const textarea = screen.getByTestId('monaco-textarea');
    fireEvent.change(textarea, {
      target: { value: 'component Modified { var value: String = "Hello"; }' },
    });

    expect(onChangeMock).toHaveBeenCalledWith('component Modified { var value: String = "Hello"; }');

    await waitFor(
      () => {
        expect(onDiagMock).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );
  });
});

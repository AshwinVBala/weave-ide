import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';
import { fallbackCompileToJs, fallbackCompileToHtml } from '../workers/weaveCompiler.worker';

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.Element.prototype.scrollIntoView = vi.fn();

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Web Worker for JSDOM environment
if (typeof window !== 'undefined' && typeof (window as any).Worker === 'undefined') {
  class MockWorker {
    onmessage: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    postMessage(data: any) {
      setTimeout(() => {
        if (this.onmessage) {
          if (data.type === 'INIT_WASM') {
            this.onmessage({ data: { id: data.id, type: 'INIT_WASM_RESULT', success: true, elapsedMs: 1 } });
          } else if (data.type === 'CHECK_DIAGNOSTICS') {
            this.onmessage({ data: { id: data.id, type: 'CHECK_DIAGNOSTICS_RESULT', success: true, diagnostics: [], elapsedMs: 1 } });
          } else if (data.type === 'PARSE_SOURCE') {
            this.onmessage({
              data: {
                id: data.id,
                type: 'PARSE_SOURCE_RESULT',
                success: true,
                ast: { ok: true, error_count: 0, syntax_tree: 'SourceFile', items: [], diagnostics: [] },
                elapsedMs: 1,
              },
            });
          } else if (data.type === 'EXECUTE_CODE') {
            this.onmessage({
              data: {
                id: data.id,
                type: 'EXECUTE_CODE_RESULT',
                success: true,
                output: ['[WASM VM] Completed execution'],
                diagnostics: [],
                elapsedMs: 1,
              },
            });
          } else if (data.type === 'COMPILE_TO_JS') {
            const jsCode = fallbackCompileToJs(data.code || '');
            this.onmessage({
              data: {
                id: data.id,
                type: 'COMPILE_TO_JS_RESULT',
                success: true,
                jsCode,
                elapsedMs: 1,
              },
            });
          } else if (data.type === 'COMPILE_TO_HTML') {
            const htmlCode = fallbackCompileToHtml(data.code || '', data.title || 'Weave App');
            this.onmessage({
              data: {
                id: data.id,
                type: 'COMPILE_TO_HTML_RESULT',
                success: true,
                htmlCode,
                elapsedMs: 1,
              },
            });
          }
        }
      }, 0);
    }
    terminate() {}
  }
  (window as any).Worker = MockWorker;
  (global as any).Worker = MockWorker;
}

// Mock Monaco Editor React component
vi.mock('@monaco-editor/react', () => {
  const MockEditor = ({
    language,
    value,
    onChange,
  }: {
    language?: string;
    value?: string;
    onChange?: (val: string) => void;
  }) => {
    return React.createElement(
      'div',
      {
        'data-testid': 'mock-monaco-editor',
        'data-language': language,
      },
      React.createElement('textarea', {
        'data-testid': 'monaco-textarea',
        value: value || '',
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange?.(e.target.value),
      })
    );
  };

  return {
    default: MockEditor,
    Editor: MockEditor,
  };
});

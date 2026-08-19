import {
  CompilerWorkerRequest,
  CompilerWorkerResponse,
  DiagnosticItem,
  ExecutionResult,
  WasmParseOutput,
} from '../types';

import { fallbackCompileToHtml, fallbackCompileToJs } from '../workers/weaveCompiler.worker';

type MessageResolver = (value: CompilerWorkerResponse) => void;

class WasmCompilerBridgeService {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, { resolve: MessageResolver; reject: (err: any) => void; timer: any }>();
  private reqCounter = 0;
  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return;
    }

    try {
      this.worker = new Worker(
        new URL('../workers/weaveCompiler.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<CompilerWorkerResponse>) => {
        const response = event.data;
        if (!response || !response.id) return;

        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          clearTimeout(pending.timer);
          this.pendingRequests.delete(response.id);
          pending.resolve(response);
        }
      };

      this.worker.onerror = (err) => {
        console.warn('[WasmCompilerBridge] Worker error:', err);
      };
    } catch (e) {
      console.warn('[WasmCompilerBridge] Failed to create Web Worker:', e);
    }
  }

  /**
   * Initializes the WASM module in the background worker.
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (!this.worker) {
        return true;
      }
      try {
        const res = await this.sendRequest({
          type: 'INIT_WASM',
        });
        this.isInitialized = res.success;
        return this.isInitialized;
      } catch (err) {
        console.warn('[WasmCompilerBridge] WASM initialization failed:', err);
        return false;
      }
    })();

    return this.initPromise;
  }

  /**
   * Sends a typed request to the Web Worker and returns a promise for the response.
   */
  private sendRequest(payload: Omit<CompilerWorkerRequest, 'id'>, timeoutMs = 8000): Promise<CompilerWorkerResponse> {
    const id = `req-${++this.reqCounter}-${Date.now()}`;
    const request: CompilerWorkerRequest = { id, ...payload };

    return new Promise((resolve, reject) => {
      if (!this.worker) {
        // Fallback if worker is not available (e.g. basic test runner)
        let jsCode = '';
        let htmlCode = '';
        if (payload.type === 'COMPILE_TO_JS') {
          jsCode = fallbackCompileToJs(payload.code || '');
        } else if (payload.type === 'COMPILE_TO_HTML') {
          htmlCode = fallbackCompileToHtml(payload.code || '', payload.title || 'Weave App');
        }

        resolve({
          id,
          type: (payload.type + '_RESULT') as any,
          success: true,
          diagnostics: [],
          jsCode,
          htmlCode,
          output: ['[Fallback] Worker unavailable, running in local fallback mode.'],
        });
        return;
      }

      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          resolve({
            id,
            type: 'ERROR',
            success: false,
            error: `Compiler worker request timed out after ${timeoutMs}ms`,
          });
        }
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });
      this.worker.postMessage(request);
    });
  }

  /**
   * Check diagnostics for source code in real-time via the background Web Worker.
   */
  public async checkDiagnostics(code: string, filePath = 'main.wv'): Promise<DiagnosticItem[]> {
    const res = await this.sendRequest({
      type: 'CHECK_DIAGNOSTICS',
      code,
      filePath,
    });
    return res.diagnostics || [];
  }

  /**
   * Parse source code into AST & syntax tree via the background Web Worker.
   */
  public async parseSource(code: string, filePath = 'main.wv'): Promise<WasmParseOutput> {
    const res = await this.sendRequest({
      type: 'PARSE_SOURCE',
      code,
      filePath,
    });
    return (
      res.ast || {
        ok: true,
        error_count: 0,
        syntax_tree: 'SourceFile',
        items: [],
        diagnostics: [],
      }
    );
  }

  /**
   * Validate an execution request in browser mode. This bundle has a compiler, not a VM runtime.
   */
  public async executeCode(code: string, filePath = 'main.wv'): Promise<ExecutionResult> {
    const startTime = performance.now();
    const diagnostics = await this.checkDiagnostics(code, filePath);
    const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === 'error');
    if (!hasErrors) await this.compileToJs(code, filePath);

    return {
      success: false,
      output: hasErrors
        ? ['WASM compilation failed; fix the reported diagnostics before running.']
        : ['Program execution requires the native Weave CLI; browser WASM is compiler-only.'],
      diagnostics,
      executionTimeMs: Math.round(performance.now() - startTime),
      mode: 'wasm',
    };
  }

  /**
   * Transpiles Weave source code into React / TypeScript (TSX/JSX) via the WASM compiler.
   */
  public async compileToJs(code: string, filePath = 'main.wv'): Promise<string> {
    const res = await this.sendRequest({
      type: 'COMPILE_TO_JS',
      code,
      filePath,
    });
    return res.jsCode || '';
  }

  /**
   * Compiles Weave source code into a standalone HTML preview runner page.
   */
  public async compileToHtml(code: string, title = 'Weave App'): Promise<string> {
    const res = await this.sendRequest({
      type: 'COMPILE_TO_HTML',
      code,
      title,
    });
    return res.htmlCode || '';
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}

export const wasmCompilerBridge = new WasmCompilerBridgeService();

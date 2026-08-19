import { fsService, isTauriEnvironment } from './fsService';
import { wasmCompilerBridge } from './wasmCompilerBridge';
import {
  DiagnosticItem,
  LoomStrandInfo,
  NativeWeaveStatus,
  WasmParseOutput,
} from '../types';

export interface CompilationResult {
  success: boolean;
  output: string[];
  diagnostics: DiagnosticItem[];
  strands: LoomStrandInfo[];
  executionTimeMs: number;
  engine: 'native' | 'wasm';
}

export class WeaveCompilerService {
  private static nativeStatusCache: NativeWeaveStatus | null = null;
  private static statusCheckPromise: Promise<NativeWeaveStatus> | null = null;

  private static async collectWorkspaceWeaveFiles(rootPath: string): Promise<string[]> {
    const files: string[] = [];
    const visit = async (directory: string) => {
      const entries = await fsService.listDir(directory);
      for (const entry of entries) {
        if (entry.isDir) {
          await visit(entry.path);
        } else if (/\.(wv|weave)$/i.test(entry.name)) {
          files.push(entry.path);
        }
      }
    };
    await visit(rootPath);
    return files.sort((a, b) => a.localeCompare(b));
  }

  /**
   * Checks if native `weave` CLI binary is available via Tauri IPC.
   */
  public static async getNativeStatus(): Promise<NativeWeaveStatus> {
    if (this.nativeStatusCache) {
      return this.nativeStatusCache;
    }

    if (this.statusCheckPromise) {
      return this.statusCheckPromise;
    }

    this.statusCheckPromise = (async () => {
      if (!isTauriEnvironment()) {
        this.nativeStatusCache = { available: false };
        return this.nativeStatusCache;
      }

      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const status = await invoke<NativeWeaveStatus>('check_native_weave');
        this.nativeStatusCache = status;
        return status;
      } catch (err) {
        console.warn('[WeaveCompilerService] Error checking native weave CLI:', err);
        this.nativeStatusCache = { available: false };
        return this.nativeStatusCache;
      }
    })();

    return this.statusCheckPromise;
  }

  /**
   * Real-time code diagnostic checking using WASM Web Worker (or Native if requested).
   */
  public static async checkSource(code: string, filePath = 'main.wv'): Promise<DiagnosticItem[]> {
    return await wasmCompilerBridge.checkDiagnostics(code, filePath);
  }

  /**
   * Parses source code into AST via WASM Web Worker.
   */
  public static async parseSource(code: string, filePath = 'main.wv'): Promise<WasmParseOutput> {
    return await wasmCompilerBridge.parseSource(code, filePath);
  }

  /**
   * Transpiles Weave source code into React / TypeScript (TSX/JSX) code via WASM compiler.
   */
  public static async compileToJs(code: string, filePath = 'main.wv'): Promise<string> {
    return await wasmCompilerBridge.compileToJs(code, filePath);
  }

  /**
   * Compiles Weave source code into a standalone HTML preview runner page via WASM compiler.
   */
  public static async compileToHtml(code: string, title = 'Weave App'): Promise<string> {
    return await wasmCompilerBridge.compileToHtml(code, title);
  }

  /**
   * Runs a Weave file: uses native `weave` binary if available on disk,
   * otherwise seamlessly falls back to the in-memory WASM compiler.
   */
  public static async runFile(filePath: string, customCode?: string): Promise<CompilationResult> {
    const startTime = performance.now();
    const nativeStatus = await this.getNativeStatus();

    // 1. If Native Weave CLI is available via Tauri IPC and we are in desktop mode
    if (nativeStatus.available && isTauriEnvironment() && !filePath.startsWith('/workspace/mock/')) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const result = await invoke<{
          success: boolean;
          exit_code: number;
          stdout: string;
          stderr: string;
        }>('execute_native_weave', {
          binaryPath: nativeStatus.path,
          subcommand: 'run',
          args: [filePath],
          cwd: null,
        });

        const output: string[] = [];
        output.push(`\x1b[38;2;229;164;67m[Weave Loom Engine (Native CLI)]\x1b[0m Executing ${filePath}...`);
        
        if (result.stdout) {
          output.push(...result.stdout.split('\n').filter((l) => l.length > 0));
        }
        if (result.stderr) {
          output.push(...result.stderr.split('\n').filter((l) => l.length > 0));
        }

        const elapsed = Math.round(performance.now() - startTime);
        output.push(
          result.success
            ? `\x1b[32m✔ Native execution completed in ${elapsed}ms\x1b[0m`
            : `\x1b[31m✘ Native execution failed with exit code ${result.exit_code} in ${elapsed}ms\x1b[0m`
        );

        return {
          success: result.success,
          output,
          diagnostics: [],
          strands: [],
          executionTimeMs: elapsed,
          engine: 'native',
        };
      } catch (nativeErr) {
        console.warn('[WeaveCompilerService] Native execution failed, falling back to WASM:', nativeErr);
      }
    }

    // 2. Browser fallback: compile and typecheck, but do not pretend to execute a runtime.
    try {
      let code = customCode;
      if (code === undefined) {
        code = await fsService.readFile(filePath);
      }

      const output: string[] = [];
      output.push(`\x1b[38;2;229;164;67m[Weave WASM Compiler]\x1b[0m Checking \x1b[1m${filePath}\x1b[0m...`);

      // Run WASM diagnostics & AST generation
      const diagnostics = await wasmCompilerBridge.checkDiagnostics(code, filePath);
      const ast = await wasmCompilerBridge.parseSource(code, filePath);

      if (diagnostics.some((d) => d.severity === 'error')) {
        output.push(`\x1b[31merror: WASM Compilation failed with ${diagnostics.filter((d) => d.severity === 'error').length} error(s)\x1b[0m`);
        for (const d of diagnostics) {
          if (d.severity === 'error') {
            output.push(`  --> ${filePath}:${d.line}:${d.column}: ${d.message}`);
          }
        }
        return {
          success: false,
          output,
          diagnostics,
          strands: [],
          executionTimeMs: Math.round(performance.now() - startTime),
          engine: 'wasm',
        };
      }

      await wasmCompilerBridge.compileToJs(code, filePath);
      const elapsed = Math.round(performance.now() - startTime);
      output.push(
        `\x1b[32m✔ WASM parse, typecheck, and preview compilation passed\x1b[0m: ${ast.items.length} top-level item(s) resolved.`
      );
      output.push(
        '\x1b[33mProgram execution requires the native Weave CLI. The browser WASM bundle is compiler-only.\x1b[0m'
      );

      return {
        success: false,
        output,
        diagnostics,
        strands: [],
        executionTimeMs: elapsed,
        engine: 'wasm',
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        output: [`\x1b[31mError reading or compiling file ${filePath}: ${errMsg}\x1b[0m`],
        diagnostics: [],
        strands: [],
        executionTimeMs: Math.round(performance.now() - startTime),
        engine: 'wasm',
      };
    }
  }

  /** Typechecks a file without executing it. */
  public static async checkFile(filePath: string, customCode?: string): Promise<CompilationResult> {
    const startTime = performance.now();
    const nativeStatus = await this.getNativeStatus();
    if (nativeStatus.available && isTauriEnvironment()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const result = await invoke<{
          success: boolean;
          exit_code: number;
          stdout: string;
          stderr: string;
        }>('execute_native_weave', {
          binaryPath: nativeStatus.path,
          subcommand: 'check',
          args: [filePath],
          cwd: null,
        });
        const output = [result.stdout, result.stderr]
          .filter(Boolean)
          .flatMap((text) => text.split('\n').filter(Boolean));
        const elapsed = Math.round(performance.now() - startTime);
        output.push(
          result.success
            ? `\x1b[32m✔ Typecheck completed in ${elapsed}ms\x1b[0m`
            : `\x1b[31m✘ Typecheck failed with exit code ${result.exit_code}\x1b[0m`
        );
        return {
          success: result.success,
          output,
          diagnostics: [],
          strands: [],
          executionTimeMs: elapsed,
          engine: 'native',
        };
      } catch (error) {
        return {
          success: false,
          output: [`Native typecheck failed: ${error instanceof Error ? error.message : String(error)}`],
          diagnostics: [],
          strands: [],
          executionTimeMs: Math.round(performance.now() - startTime),
          engine: 'native',
        };
      }
    }

    const code = customCode ?? await fsService.readFile(filePath);
    const diagnostics = await wasmCompilerBridge.checkDiagnostics(code, filePath);
    const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    return {
      success: errors.length === 0,
      output: errors.length === 0
        ? ['WASM syntax and type checks passed.']
        : errors.map((diagnostic) => `${filePath}:${diagnostic.line}:${diagnostic.column}: ${diagnostic.message}`),
      diagnostics,
      strands: [],
      executionTimeMs: Math.round(performance.now() - startTime),
      engine: 'wasm',
    };
  }

  /**
   * Builds the project target: routes to native `weave build` if available,
   * otherwise compiles bundle using in-memory WASM compiler.
   */
  public static async buildProject(workspacePath?: string): Promise<CompilationResult> {
    const startTime = performance.now();
    const nativeStatus = await this.getNativeStatus();

    if (nativeStatus.available && isTauriEnvironment()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const result = await invoke<{
          success: boolean;
          exit_code: number;
          stdout: string;
          stderr: string;
        }>('execute_native_weave', {
          binaryPath: nativeStatus.path,
          subcommand: 'build',
          args: ['--release'],
          cwd: workspacePath || null,
        });

        const output: string[] = [
          `\x1b[38;2;229;164;67m[Weave Native Build]\x1b[0m Building ${workspacePath || 'the current workspace'}...`,
        ];
        if (result.stdout) output.push(...result.stdout.split('\n'));
        if (result.stderr) output.push(...result.stderr.split('\n'));

        const elapsed = Math.round(performance.now() - startTime);
        output.push(
          result.success
            ? `\x1b[32m✔ Native build completed in ${elapsed}ms\x1b[0m`
            : `\x1b[31m✘ Native build failed with exit code ${result.exit_code} in ${elapsed}ms\x1b[0m`
        );
        return {
          success: result.success,
          output,
          diagnostics: [],
          strands: [],
          executionTimeMs: elapsed,
          engine: 'native',
        };
      } catch (err) {
        console.warn('[WeaveCompilerService] Native build failed, falling back to WASM:', err);
      }
    }

    const rootPath = workspacePath || '/workspace';
    const output: string[] = [
      `\x1b[38;2;229;164;67m[Weave WASM Build]\x1b[0m Compiling ${rootPath}...`,
    ];
    const diagnostics: DiagnosticItem[] = [];
    try {
      const files = await this.collectWorkspaceWeaveFiles(rootPath);
      if (files.length === 0) {
        return {
          success: false,
          output: [...output, '\x1b[31m✘ No .wv or .weave files were found.\x1b[0m'],
          diagnostics,
          strands: [],
          executionTimeMs: Math.round(performance.now() - startTime),
          engine: 'wasm',
        };
      }

      for (const filePath of files) {
        const code = await fsService.readFile(filePath);
        const fileDiagnostics = await wasmCompilerBridge.checkDiagnostics(code, filePath);
        diagnostics.push(...fileDiagnostics);
        if (fileDiagnostics.some((item) => item.severity === 'error')) {
          output.push(`  \x1b[31m✘ ${filePath}\x1b[0m`);
          continue;
        }
        await wasmCompilerBridge.compileToJs(code, filePath);
        output.push(`  \x1b[32m✔ ${filePath}\x1b[0m`);
      }

      const success = !diagnostics.some((item) => item.severity === 'error');
      const elapsed = Math.round(performance.now() - startTime);
      output.push(
        success
          ? `\x1b[32m✔ Compiled ${files.length} Weave file${files.length === 1 ? '' : 's'} in ${elapsed}ms\x1b[0m`
          : `\x1b[31m✘ Build failed with ${diagnostics.filter((item) => item.severity === 'error').length} error(s) in ${elapsed}ms\x1b[0m`
      );
      return { success, output, diagnostics, strands: [], executionTimeMs: elapsed, engine: 'wasm' };
    } catch (error) {
      const elapsed = Math.round(performance.now() - startTime);
      return {
        success: false,
        output: [...output, `\x1b[31m✘ Build failed: ${error instanceof Error ? error.message : String(error)}\x1b[0m`],
        diagnostics,
        strands: [],
        executionTimeMs: elapsed,
        engine: 'wasm',
      };
    }
  }

  /**
   * Tests the project with the native `weave test` runner when available.
   */
  public static async testProject(workspacePath?: string): Promise<CompilationResult> {
    const startTime = performance.now();
    const nativeStatus = await this.getNativeStatus();

    if (nativeStatus.available && nativeStatus.supports_test && isTauriEnvironment()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const result = await invoke<{
          success: boolean;
          exit_code: number;
          stdout: string;
          stderr: string;
        }>('execute_native_weave', {
          binaryPath: nativeStatus.path,
          subcommand: 'test',
          args: [],
          cwd: workspacePath || null,
        });

        const output: string[] = [
          `\x1b[38;2;229;164;67m[Weave Native Test]\x1b[0m Testing ${workspacePath || 'the current workspace'}...`,
        ];
        if (result.stdout) output.push(...result.stdout.split('\n'));
        if (result.stderr) output.push(...result.stderr.split('\n'));

        const elapsed = Math.round(performance.now() - startTime);
        output.push(
          result.success
            ? `\x1b[32m✔ Native tests completed in ${elapsed}ms\x1b[0m`
            : `\x1b[31m✘ Native tests failed with exit code ${result.exit_code} in ${elapsed}ms\x1b[0m`
        );
        return {
          success: result.success,
          output,
          diagnostics: [],
          strands: [],
          executionTimeMs: elapsed,
          engine: 'native',
        };
      } catch (err) {
        console.warn('[WeaveCompilerService] Native test failed, falling back to WASM:', err);
      }
    }

    const rootPath = workspacePath || '/workspace';
    const output = [
      `\x1b[38;2;229;164;67m[Weave WASM Test Discovery]\x1b[0m Inspecting ${rootPath}...`,
    ];
    if (nativeStatus.available && !nativeStatus.supports_test) {
      output.push(
        '\x1b[33mThe installed Weave CLI does not provide a test runner; using syntax-aware test discovery.\x1b[0m'
      );
    }
    const diagnostics: DiagnosticItem[] = [];
    try {
      const files = await this.collectWorkspaceWeaveFiles(rootPath);
      const discovered: Array<{ filePath: string; name: string }> = [];
      for (const filePath of files) {
        const code = await fsService.readFile(filePath);
        diagnostics.push(...(await wasmCompilerBridge.checkDiagnostics(code, filePath)));
        const testPattern = /(?:^|\n)\s*@test(?:\([^)]*\))?\s*(?:\r?\n\s*)*(?:pub\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)/g;
        for (const match of code.matchAll(testPattern)) {
          discovered.push({ filePath, name: match[1] });
          output.push(`  discovered ${match[1]} (${filePath})`);
        }
      }

      const elapsed = Math.round(performance.now() - startTime);
      const errorCount = diagnostics.filter((item) => item.severity === 'error').length;
      if (errorCount > 0) {
        output.push(`\x1b[31m✘ Test compilation failed with ${errorCount} error(s).\x1b[0m`);
        return { success: false, output, diagnostics, strands: [], executionTimeMs: elapsed, engine: 'wasm' };
      }
      if (discovered.length === 0) {
        output.push('\x1b[33mNo @test functions were found.\x1b[0m');
        return { success: true, output, diagnostics, strands: [], executionTimeMs: elapsed, engine: 'wasm' };
      }

      output.push(
        `\x1b[33mDiscovered and compiled ${discovered.length} test${discovered.length === 1 ? '' : 's'}, but the WASM runtime cannot execute @test functions yet. Install the native Weave CLI to run them.\x1b[0m`
      );
      return { success: false, output, diagnostics, strands: [], executionTimeMs: elapsed, engine: 'wasm' };
    } catch (error) {
      const elapsed = Math.round(performance.now() - startTime);
      return {
        success: false,
        output: [...output, `\x1b[31m✘ Test discovery failed: ${error instanceof Error ? error.message : String(error)}\x1b[0m`],
        diagnostics,
        strands: [],
        executionTimeMs: elapsed,
        engine: 'wasm',
      };
    }
  }
}

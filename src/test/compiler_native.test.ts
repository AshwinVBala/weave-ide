import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { WeaveCompilerService } from '../services/compilerService';

const resetCompilerStatus = () => {
  Reflect.set(WeaveCompilerService, 'nativeStatusCache', null);
  Reflect.set(WeaveCompilerService, 'statusCheckPromise', null);
};

describe('native Weave command routing', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      configurable: true,
      value: {},
    });
    resetCompilerStatus();
  });

  afterEach(() => {
    Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
    resetCompilerStatus();
  });

  it('uses weave run for the Run action instead of starting the dev server', async () => {
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === 'check_native_weave') {
        return {
          available: true,
          path: '/usr/local/bin/weave',
          version: 'weave 0.1.0',
          supports_test: false,
        };
      }
      if (command === 'execute_native_weave') {
        return { success: true, exit_code: 0, stdout: 'done', stderr: '' };
      }
      throw new Error(`Unexpected command: ${command}`);
    });

    const result = await WeaveCompilerService.runFile('/project/main.wv');

    expect(result.success).toBe(true);
    expect(invoke).toHaveBeenCalledWith(
      'execute_native_weave',
      expect.objectContaining({ subcommand: 'run', args: ['/project/main.wv'] })
    );
  });

  it('does not invoke an unsupported native test command', async () => {
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === 'check_native_weave') {
        return {
          available: true,
          path: '/usr/local/bin/weave',
          version: 'weave 0.1.0',
          supports_test: false,
        };
      }
      if (command === 'list_dir') return [];
      throw new Error(`Unexpected command: ${command}`);
    });

    const result = await WeaveCompilerService.testProject('/workspace');

    expect(invoke).not.toHaveBeenCalledWith('execute_native_weave', expect.anything());
    expect(result.output.some((line) => line.includes('does not provide a test runner'))).toBe(true);
  });

  it('routes typechecking through weave check without running the file', async () => {
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === 'check_native_weave') {
        return {
          available: true,
          path: '/usr/local/bin/weave',
          version: 'weave 0.1.0',
          supports_test: false,
        };
      }
      if (command === 'execute_native_weave') {
        return { success: true, exit_code: 0, stdout: 'check passed', stderr: '' };
      }
      throw new Error(`Unexpected command: ${command}`);
    });

    const result = await WeaveCompilerService.checkFile('/project/main.wv');

    expect(result.success).toBe(true);
    expect(invoke).toHaveBeenCalledWith(
      'execute_native_weave',
      expect.objectContaining({ subcommand: 'check', args: ['/project/main.wv'] })
    );
  });
});

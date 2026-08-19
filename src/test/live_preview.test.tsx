import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LivePreview,
  createComponentFromTsx,
  createStandaloneHtmlFromTsx,
} from '../components/LivePreview';
import { App } from '../App';
import { WeaveCompilerService } from '../services/compilerService';
import { fsService } from '../services/fsService';
import { fallbackCompileToJs } from '../workers/weaveCompiler.worker';

const SAMPLE_COUNTER_WV = `component Counter {
    store count = 0;

    ui {
        VStack(gap: 12, padding: 16) {
            Text("Count: " + count);
            HStack(gap: 8) {
                Button("Increment", onClick: fn() {
                    count += 1;
                });
                Button("Decrement", onClick: fn() {
                    count -= 1;
                });
                Button("Reset", onClick: fn() {
                    count = 0;
                });
            }
        }
    }
}`;

describe('Weave LivePreview & React Codegen Pipeline', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('directly instantiates component from fallback compiled JS', () => {
    const js = fallbackCompileToJs(SAMPLE_COUNTER_WV);
    const Comp = createComponentFromTsx(js);
    expect(Comp).not.toBeNull();
    if (!Comp) throw new Error('Comp is null! JS was: ' + js);
    const { getByText } = render(<Comp />);
    expect(getByText(/Count:\s*0/i)).toBeInTheDocument();
  });

  it('creates a self-contained HTML runner without CDN dependencies', () => {
    const tsx = fallbackCompileToJs(SAMPLE_COUNTER_WV);
    const html = createStandaloneHtmlFromTsx(tsx, 'Counter Preview');
    const runtimeScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

    expect(html).toContain('<title>Counter Preview</title>');
    expect(html).not.toContain('unpkg.com');
    expect(html).not.toContain('babel.min.js');
    expect(html).toContain('React.createElement(Counter, null)');
    expect(runtimeScript).toBeDefined();
    if (!runtimeScript) throw new Error('Standalone HTML runtime script was not generated');
    expect(() => new Function(runtimeScript)).not.toThrow();
  });

  it('compiles Weave source code into TSX and renders interactive counter component', async () => {
    render(<LivePreview code={SAMPLE_COUNTER_WV} filePath="counter.wv" debounceMs={10} />);

    // Wait for compilation and component mount
    await waitFor(() => {
      expect(screen.getByText(/Count:\s*0/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Increment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Decrement/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset/i })).toBeInTheDocument();
  });

  it('interactively increments and decrements the counter when buttons are clicked', async () => {
    render(<LivePreview code={SAMPLE_COUNTER_WV} filePath="counter.wv" debounceMs={10} />);

    await waitFor(() => {
      expect(screen.getByText(/Count:\s*0/i)).toBeInTheDocument();
    });

    const incButton = screen.getByRole('button', { name: /Increment/i });
    const decButton = screen.getByRole('button', { name: /Decrement/i });
    const resetButton = screen.getByRole('button', { name: /Reset/i });

    // Click increment
    await act(async () => {
      fireEvent.click(incButton);
    });
    expect(screen.getByText(/Count:\s*1/i)).toBeInTheDocument();

    // Click increment again
    await act(async () => {
      fireEvent.click(incButton);
    });
    expect(screen.getByText(/Count:\s*2/i)).toBeInTheDocument();

    // Click decrement
    await act(async () => {
      fireEvent.click(decButton);
    });
    expect(screen.getByText(/Count:\s*1/i)).toBeInTheDocument();

    // Click reset
    await act(async () => {
      fireEvent.click(resetButton);
    });
    expect(screen.getByText(/Count:\s*0/i)).toBeInTheDocument();
  });

  it('switches between Preview, TSX Code, and HTML runner tabs', async () => {
    render(<LivePreview code={SAMPLE_COUNTER_WV} filePath="counter.wv" debounceMs={10} />);

    await waitFor(() => {
      expect(screen.getByText(/Count:\s*0/i)).toBeInTheDocument();
    });

    // Switch to TSX tab
    const codeTab = screen.getByTestId('tab-code');
    fireEvent.click(codeTab);

    await waitFor(() => {
      const codeBlock = screen.getByTestId('compiled-tsx-code');
      expect(codeBlock).toBeInTheDocument();
      expect(codeBlock.textContent).toContain('export function Counter');
      expect(codeBlock.textContent).toContain('useState');
    });

    // Switch to HTML tab
    const htmlTab = screen.getByTestId('tab-html');
    fireEvent.click(htmlTab);

    await waitFor(() => {
      const iframe = screen.getByTestId('html-preview-iframe');
      expect(iframe).toBeInTheDocument();
    });

    // Switch back to Preview tab
    const previewTab = screen.getByTestId('tab-preview');
    fireEvent.click(previewTab);

    await waitFor(() => {
      expect(screen.getByText(/Count:\s*0/i)).toBeInTheDocument();
    });
  });

  it('displays compilation diagnostics when syntax errors are present', async () => {
    vi.spyOn(WeaveCompilerService, 'checkSource').mockResolvedValueOnce([
      {
        id: 'diag-1',
        filePath: 'counter.wv',
        line: 4,
        column: 5,
        message: 'Expected closing brace',
        severity: 'error',
      },
    ]);

    render(<LivePreview code="component Broken { ui { " filePath="broken.wv" debounceMs={10} />);

    await waitFor(() => {
      expect(screen.getByText(/Compilation Diagnostics/i)).toBeInTheDocument();
      expect(screen.getByText(/Expected closing brace/i)).toBeInTheDocument();
    });
  });

  it('integrates with IDE: opening and editing counter.wv in Monaco updates live preview pane', async () => {
    render(<App />);

    // Wait for initial workspace to load
    await waitFor(() => {
      expect(screen.getByTestId('monaco-textarea')).toBeInTheDocument();
    });

    // The Explorer is the default view. Wait for its real file tree to load.
    await waitFor(() => {
      expect(screen.getByText('counter.wv')).toBeInTheDocument();
    });

    const counterFile = screen.getByText('counter.wv');
    fireEvent.click(counterFile);

    // Ensure Preview Panel is open
    if (!screen.queryByTestId('live-preview-container')) {
      const previewToggle = screen.getByTestId('btn-toggle-live-preview');
      fireEvent.click(previewToggle);
    }

    // Verify preview container is mounted
    await waitFor(() => {
      expect(screen.getByTestId('live-preview-container')).toBeInTheDocument();
    });

    // Verify interactive button in preview
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Increment/i })).toBeInTheDocument();
    }, { timeout: 3000 });

    // Click increment in the preview pane
    const incBtn = screen.getByRole('button', { name: /Increment/i });
    await act(async () => {
      fireEvent.click(incBtn);
    });

    expect(screen.getByText(/Count:\s*1/i)).toBeInTheDocument();
  });

  it('opens distinct workspace files and restores the last active file on startup', async () => {
    localStorage.removeItem('weave_workspace_path');
    localStorage.removeItem('weave_workspace_recent_files');
    const firstRender = render(<App />);

    await waitFor(() => {
      expect((screen.getByTestId('monaco-textarea') as HTMLTextAreaElement).value).toContain(
        'strand TaskWorker'
      );
    });

    fireEvent.click(screen.getByText('geometry.wv'));
    await waitFor(() => {
      expect((screen.getByTestId('monaco-textarea') as HTMLTextAreaElement).value).toContain(
        'struct Vec3'
      );
    });
    expect((screen.getByTestId('monaco-textarea') as HTMLTextAreaElement).value).not.toContain(
      'strand TaskWorker'
    );

    firstRender.unmount();
    render(<App />);
    await waitFor(() => {
      expect((screen.getByTestId('monaco-textarea') as HTMLTextAreaElement).value).toContain(
        'struct Vec3'
      );
    });

    localStorage.removeItem('weave_workspace_recent_files');
  });

  it('auto-saves edits after the configured delay without executing the file', async () => {
    const originalCode = await fsService.readFile('/workspace/src/main.wv');
    localStorage.setItem(
      'weave_workspace_settings',
      JSON.stringify({ autoSave: true, autoSaveDelay: 250 })
    );
    const writeSpy = vi.spyOn(fsService, 'writeFile');
    const runSpy = vi.spyOn(WeaveCompilerService, 'runFile');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('monaco-textarea')).toBeInTheDocument();
    });
    const updatedCode = 'component AutoSaved { ui { Text("saved") } }';
    fireEvent.change(screen.getByTestId('monaco-textarea'), {
      target: { value: updatedCode },
    });

    await waitFor(
      () => {
        expect(writeSpy).toHaveBeenCalledWith('/workspace/src/main.wv', updatedCode);
      },
      { timeout: 1500 }
    );
    expect(runSpy).not.toHaveBeenCalled();

    localStorage.removeItem('weave_workspace_settings');
    writeSpy.mockRestore();
    runSpy.mockRestore();
    await fsService.writeFile('/workspace/src/main.wv', originalCode);
  });

  it('protects a dirty editor tab from accidental closure', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('monaco-textarea')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId('monaco-textarea'), {
      target: { value: 'component UnsavedWork {}' },
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByTitle('Close tab'));
    expect(confirmSpy).toHaveBeenCalledWith('Close main.wv without saving?');
    expect(screen.getByTestId('monaco-textarea')).toHaveValue('component UnsavedWork {}');

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByTitle('Close tab'));
    await waitFor(() => {
      expect(screen.queryByTestId('monaco-textarea')).not.toBeInTheDocument();
    });
    confirmSpy.mockRestore();
  });

  it('compiles and renders components with theme directives and simulated resources', async () => {
    const themeResourceCode = `
theme DarkTheme {
    colors: {
        primary: "#3b82f6";
        bg: "#0f172a";
    };
    spacing: {
        lg: 24;
    };
}

component UserList {
    store title = "User Dashboard";

    ui {
        VStack(gap: 16, padding: DarkTheme.spacing.lg) {
            Text(title);
            Button("Refresh", onClick: fn() {
                title = "Dashboard Refreshed";
            });
        }
    }
}`;

    render(<LivePreview code={themeResourceCode} filePath="users.wv" debounceMs={10} />);

    await waitFor(() => {
      expect(screen.getByText(/User Dashboard/i)).toBeInTheDocument();
    });

    const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
    await act(async () => {
      fireEvent.click(refreshBtn);
    });

    expect(screen.getByText(/Dashboard Refreshed/i)).toBeInTheDocument();
  });

  it('compiles and renders components with resource data fetching and conditionals', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            status: 200,
            json: async () => [{ id: 1, name: 'Alice' }],
          } as any);
        }, 30);
      })
    );

    const resourceCode = `
theme OceanTheme {
    colors: {
        primary: "#0284c7";
        bg: "#f0f9ff";
    };
    spacing: {
        md: 16;
    };
}

component UserFetcher {
    resource users = fetch("https://jsonplaceholder.typicode.com/users");

    ui {
        VStack(gap: OceanTheme.spacing.md, bg: OceanTheme.colors.bg) {
            if (users.loading) {
                Text("Loading users data...");
            } else {
                Text("Users loaded successfully!");
            }
        }
    }
}`;

    render(<LivePreview code={resourceCode} filePath="fetcher.wv" debounceMs={10} />);

    // Initially should show loading state or transition to loaded
    await waitFor(() => {
      const loadingEl = screen.queryByText(/Loading users data\.\.\./i);
      const loadedEl = screen.queryByText(/Users loaded successfully!/i);
      expect(loadingEl || loadedEl).toBeTruthy();
    });

    // Eventually resolves to loaded state
    await waitFor(() => {
      expect(screen.getByText(/Users loaded successfully!/i)).toBeInTheDocument();
    });
  });
});

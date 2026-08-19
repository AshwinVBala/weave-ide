import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App, { getInitialWorkspacePath } from '../App';
import { HeaderBar } from '../components/HeaderBar';
import { ActivityBar } from '../components/ActivityBar';
import { StatusBar } from '../components/StatusBar';
import { DEFAULT_SETTINGS } from '../App';

describe('Weave IDE Layout & Core Component Tests', () => {
  it('starts installed desktop builds without a fake /workspace folder', () => {
    localStorage.removeItem('weave_workspace_path');
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      configurable: true,
      value: {},
    });

    expect(getInitialWorkspacePath()).toBe('');

    Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
  });

  it('renders the top HeaderBar with application branding and action buttons', () => {
    render(
      <HeaderBar
        projectName="weave-workspace"
        activeFileName="main.wv"
        hasUnsavedChanges={false}
        onSave={() => {}}
        onRun={() => {}}
        onBuild={() => {}}
        onNewFile={() => {}}
        isSidebarOpen={true}
        onToggleSidebar={() => {}}
        isBottomPanelOpen={true}
        onToggleBottomPanel={() => {}}
      />
    );

    expect(screen.getByText('Weave IDE')).toBeInTheDocument();
    expect(screen.getByText('weave-workspace')).toBeInTheDocument();
    expect(screen.getByText('main.wv')).toBeInTheDocument();
    expect(screen.getByTitle('Run Active File (F5)')).toBeInTheDocument();
    expect(screen.getByTitle('Build Release Target (Ctrl+Shift+B)')).toBeInTheDocument();
  });

  it('renders the ActivityBar with explorer, search, loom monitor, and settings tabs', () => {
    const handleViewChange = vi.fn();
    render(
      <ActivityBar
        activeView="explorer"
        onViewChange={handleViewChange}
        isBottomPanelOpen={true}
        onToggleBottomPanel={() => {}}
        onRunCurrentFile={() => {}}
        hasActiveFile={true}
      />
    );

    expect(screen.getByLabelText(/explorer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/weave loom monitor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/workspace settings/i)).toBeInTheDocument();

    // Click settings icon
    fireEvent.click(screen.getByLabelText(/workspace settings/i));
    expect(handleViewChange).toHaveBeenCalledWith('settings');
  });

  it('renders real repository and runtime state in the StatusBar', () => {
    render(
      <StatusBar
        cursorPosition={{ lineNumber: 14, column: 22 }}
        language="weave"
        diagnostics={[]}
        settings={DEFAULT_SETTINGS}
        gitBranch="feature/real-workspace"
        strandCount={0}
        onToggleProblems={() => {}}
        onToggleLoom={() => {}}
      />
    );

    expect(screen.getByText('feature/real-workspace')).toBeInTheDocument();
    expect(screen.getByText('Loom: No telemetry')).toBeInTheDocument();
    expect(screen.getByText(/ln 14, col 22/i)).toBeInTheDocument();
    expect(screen.getByText('Weave (.wv)')).toBeInTheDocument();
    expect(screen.getByText('UTF-8')).toBeInTheDocument();
  });

  it('renders the full App workspace and toggles collapsible sidebar', async () => {
    render(<App />);

    await screen.findByTestId('monaco-textarea');

    // App header & workspace branding
    expect(screen.getAllByText('Weave IDE').length).toBeGreaterThan(0);

    // Verify sidebar container is rendered
    expect(screen.getByTestId('sidebar-container')).toBeInTheDocument();

    // Toggle sidebar collapse
    const sidebarToggleBtn = screen.getByTitle('Toggle Primary Sidebar');
    fireEvent.click(sidebarToggleBtn);

    // Sidebar should be collapsed
    expect(screen.queryByTestId('sidebar-container')).not.toBeInTheDocument();

    // Click to reopen sidebar
    fireEvent.click(sidebarToggleBtn);
    expect(screen.getByTestId('sidebar-container')).toBeInTheDocument();
  });

  it('switches between explorer, workspace settings, and loom monitor panels in sidebar', async () => {
    render(<App />);

    // Switch to settings
    const settingsBtn = screen.getByLabelText(/workspace settings/i);
    fireEvent.click(settingsBtn);
    expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    expect(screen.getByText('Editor Configuration')).toBeInTheDocument();
    expect(screen.getByText('Weave Compiler')).toBeInTheDocument();
    expect(await screen.findByText(/Browser WASM backend active|Native CLI connected/)).toBeInTheDocument();

    // Switch to Loom monitor
    const loomBtn = screen.getByLabelText(/weave loom monitor/i);
    fireEvent.click(loomBtn);
    expect(screen.getByText('Loom Concurrency Monitor')).toBeInTheDocument();
    expect(screen.getByText('No Loom telemetry')).toBeInTheDocument();
    expect(screen.queryByText('4 Cores')).not.toBeInTheDocument();

    // Switch back to Explorer
    const explorerBtn = screen.getByLabelText(/explorer/i);
    fireEvent.click(explorerBtn);
    expect(screen.getByText(/Explorer/i)).toBeInTheDocument();
  });
});

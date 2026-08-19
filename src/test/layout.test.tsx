import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';
import { HeaderBar } from '../components/HeaderBar';
import { ActivityBar } from '../components/ActivityBar';
import { StatusBar } from '../components/StatusBar';
import { DEFAULT_SETTINGS } from '../App';

describe('Weave IDE Layout & Core Component Tests', () => {
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

  it('renders the StatusBar with active branch, loom status, and Weave language indicator', () => {
    render(
      <StatusBar
        cursorPosition={{ lineNumber: 14, column: 22 }}
        language="weave"
        diagnostics={[]}
        settings={DEFAULT_SETTINGS}
        onToggleProblems={() => {}}
        onToggleLoom={() => {}}
      />
    );

    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('Loom: Online')).toBeInTheDocument();
    expect(screen.getByText(/ln 14, col 22/i)).toBeInTheDocument();
    expect(screen.getByText('Weave (.wv)')).toBeInTheDocument();
    expect(screen.getByText('UTF-8')).toBeInTheDocument();
  });

  it('renders the full App workspace and toggles collapsible sidebar', async () => {
    render(<App />);

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
    expect(screen.getByText('Weave Compiler & Loom')).toBeInTheDocument();

    // Switch to Loom monitor
    const loomBtn = screen.getByLabelText(/weave loom monitor/i);
    fireEvent.click(loomBtn);
    expect(screen.getByText('Loom Concurrency Monitor')).toBeInTheDocument();
    expect(screen.getByText('4 Cores')).toBeInTheDocument();

    // Switch back to Explorer
    const explorerBtn = screen.getByLabelText(/explorer/i);
    fireEvent.click(explorerBtn);
    expect(screen.getByText(/Explorer/i)).toBeInTheDocument();
  });
});

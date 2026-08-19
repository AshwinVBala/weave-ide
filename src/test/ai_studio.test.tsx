import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WeaveLogo } from '../components/Branding/WeaveLogo';
import { HeaderBar } from '../components/HeaderBar';
import { AgentWorkspacePanel } from '../components/AI/AgentWorkspacePanel';
import { CommandBar } from '../components/AI/CommandBar';
import { PointAndPromptPopover } from '../components/AI/PointAndPromptPopover';
import { AIService } from '../services/aiService';

describe('AI-Centered Studio & Brand Identity Tests', () => {
  it('renders WeaveLogo with glowing Interwoven Loop W paths in Amber and Cyan', () => {
    const { container } = render(<WeaveLogo size={32} glow={true} showText={true} />);

    expect(screen.getByTestId('weave-brand-logo')).toBeInTheDocument();
    expect(screen.getByText('Weave')).toBeInTheDocument();
    expect(screen.getByText('STUDIO')).toBeInTheDocument();

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute('width')).toBe('32');
    expect(svg?.getAttribute('height')).toBe('32');

    // Verify presence of amber and cyan linear gradients
    const defs = container.querySelector('defs');
    expect(defs?.innerHTML).toContain('stop-color="#FF9D00"');
    expect(defs?.innerHTML).toContain('stop-color="#00E5FF"');
  });

  it('renders HeaderBar with Weave logo, active model selector, and status pills', async () => {
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
        isPreviewOpen={false}
        onTogglePreview={() => {}}
        onOpenCommandBar={() => {}}
      />
    );

    // Verify brand title and logo
    expect(screen.getByTestId('weave-brand-logo')).toBeInTheDocument();
    expect(screen.getByText('Weave IDE')).toBeInTheDocument();

    // Verify status pills
    expect(screen.getByText('WASM Worker')).toBeInTheDocument();
    expect(screen.getByText('Compiler Ready')).toBeInTheDocument();
    expect(screen.getByText('AI Active')).toBeInTheDocument();

    // Verify model selector button in header
    const modelBtn = screen.getByTestId('header-model-selector-btn');
    expect(modelBtn).toBeInTheDocument();
    expect(modelBtn).toHaveTextContent(/claude|gemini|gpt|ollama/i);

    // Open model selector dropdown
    fireEvent.click(modelBtn);
    expect(screen.getAllByText('Claude 3.7 Sonnet').length).toBeGreaterThan(0);
    expect(screen.getByText('Gemini 3')).toBeInTheDocument();
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    expect(screen.getByText('Local Ollama')).toBeInTheDocument();
  });

  it('renders AgentWorkspacePanel with context chips, thought stream, and executes prompt', async () => {
    const handleApplyPatch = vi.fn();
    const handleOpenFile = vi.fn();

    const initialCode = `component Counter {\n    store count = 0;\n    ui {\n        VStack {\n            Text("Count: " + count);\n        }\n    }\n}`;

    render(
      <AgentWorkspacePanel
        currentCode={initialCode}
        activeFilePath="/workspace/src/counter.wv"
        onApplyPatch={handleApplyPatch}
        onOpenFile={handleOpenFile}
      />
    );

    // Verify agent workspace elements
    expect(screen.getByTestId('agent-workspace-panel')).toBeInTheDocument();
    expect(screen.getAllByText('Weave Agent').length).toBeGreaterThan(0);

    // Verify context file chip
    expect(screen.getByText('counter.wv')).toBeInTheDocument();

    // Verify thought stream welcome
    expect(screen.getByText(/Thought Stream & AST Analysis/i)).toBeInTheDocument();

    // Execute quick prompt
    const apiPromptBtn = screen.getByText('⚡ Add API Resource');
    fireEvent.click(apiPromptBtn);

    // Wait for agent thought reasoning and AST patch to complete
    await waitFor(() => {
      expect(screen.getByText('Apply Patch')).toBeInTheDocument();
    });

    // Click Apply Patch
    const applyPatchBtn = screen.getByText('Apply Patch');
    fireEvent.click(applyPatchBtn);
    expect(handleApplyPatch).toHaveBeenCalled();
  });

  it('renders Global AI CommandBar (Cmd+K) and filters commands', async () => {
    const handleClose = vi.fn();
    const handleApplyCode = vi.fn();

    render(
      <CommandBar
        isOpen={true}
        onClose={handleClose}
        currentCode="component App {}"
        activeFilePath="main.wv"
        onApplyCode={handleApplyCode}
      />
    );

    expect(screen.getByTestId('global-ai-command-bar')).toBeInTheDocument();
    expect(screen.getByText('Bind REST API Resource')).toBeInTheDocument();
    expect(screen.getByText('Generate StudioTheme Design Tokens')).toBeInTheDocument();
    expect(screen.getByText('Scaffold Todo App Component')).toBeInTheDocument();

    // Search for theme
    const input = screen.getByPlaceholderText(/type a command/i);
    fireEvent.change(input, { target: { value: 'theme' } });

    expect(screen.getByText('Generate StudioTheme Design Tokens')).toBeInTheDocument();
    expect(screen.queryByText('Scaffold Todo App Component')).not.toBeInTheDocument();
  });

  it('renders PointAndPromptPopover for selected elements and executes directives', async () => {
    const handleClose = vi.fn();
    const handleApplyCode = vi.fn();

    render(
      <PointAndPromptPopover
        elementInfo={{
          tagName: 'Button',
          innerText: 'Increment Count',
        }}
        onClose={handleClose}
        currentCode={`component App {\n    store count = 0;\n    ui {\n        Button("Increment Count");\n    }\n}`}
        activeFilePath="main.wv"
        onApplyCode={handleApplyCode}
      />
    );

    expect(screen.getByTestId('point-and-prompt-popover')).toBeInTheDocument();
    expect(screen.getByText('<Button>')).toBeInTheDocument();
    expect(screen.getByText(/Increment Count/i)).toBeInTheDocument();

    // Click directive
    const directiveBtn = screen.getByText('🎨 Change theme color');
    fireEvent.click(directiveBtn);

    await waitFor(() => {
      expect(handleApplyCode).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('AIService manages models, context files, and synthesizes Weave code', async () => {
    // Model switching
    AIService.setActiveModel('gemini-3-pro');
    expect(AIService.getActiveModel().id).toBe('gemini-3-pro');

    // Context files
    AIService.addContextFile({
      id: 'test-store',
      path: '/workspace/src/store.wv',
      name: 'store.wv',
      kind: 'store',
    });
    expect(AIService.getContextFiles().some((f) => f.name === 'store.wv')).toBe(true);

    // Synthesis of resource fetching
    const sampleCode = `component Users {\n    ui {\n        VStack {\n            Text("Users");\n        }\n    }\n}`;
    const result = await AIService.executePrompt('Add resource fetch for /api/users', sampleCode, 'users.wv');

    expect(result.patch).toBeDefined();
    expect(result.patch?.modifiedCode).toContain('resource users = fetch');
    expect(result.reasoningSteps?.length).toBeGreaterThan(0);
    expect(result.toolCalls?.length).toBeGreaterThan(0);
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WeaveLogo } from '../components/Branding/WeaveLogo';
import { HeaderBar } from '../components/HeaderBar';
import { AgentWorkspacePanel } from '../components/AI/AgentWorkspacePanel';
import { CommandBar } from '../components/AI/CommandBar';
import { PointAndPromptPopover } from '../components/AI/PointAndPromptPopover';
import { AIService } from '../services/aiService';
import { agentRuntimeService } from '../services/agentRuntimeService';

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

    // Verify model selector button in header
    const modelBtn = screen.getByTestId('header-model-selector-btn');
    expect(modelBtn).toBeInTheDocument();
    expect(modelBtn).toHaveTextContent(/claude|gemini|gpt|ollama/i);
    expect(modelBtn).toHaveAttribute('aria-label', 'Choose AI model');
    expect(modelBtn).not.toHaveAttribute('title');

    // Open model selector dropdown
    fireEvent.click(modelBtn);
    const modelMenu = screen.getByRole('listbox', { name: 'AI models' });
    expect(modelMenu).toHaveClass('fixed');
    expect(modelMenu).toHaveStyle({ width: '360px' });
    expect(modelMenu.parentElement).toBe(document.body);
    expect(screen.getAllByText(/Claude Opus 5|Claude Sonnet 5/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Gemini 3.1 Pro|Gemini 2.5 Pro/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/GPT-5.3 Codex|GPT-4o/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/DeepSeek-R1/i).length).toBeGreaterThan(0);
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

    // Execute prompt via borderless textarea
    const input = screen.getByPlaceholderText(/Instruct Weave Agent/i);
    fireEvent.change(input, {
      target: { value: 'Add an asynchronous resource fetch for /api/users with loading states' },
    });
    const sendBtn = screen.getByTestId('btn-agent-send-prompt');
    fireEvent.click(sendBtn);

    // Wait for agent thought reasoning and AST patch to complete
    await waitFor(() => {
      expect(screen.getByText('Apply Patch')).toBeInTheDocument();
    });
    expect(screen.getByText(/Thought Stream/i)).toBeInTheDocument();

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
    AIService.setActiveModel('gemini-2-5-pro');
    expect(AIService.getActiveModel().id).toBe('gemini-2-5-pro');

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
    expect(result.runtime).toBe('Test templates');
    expect(result.reasoningSteps?.length).toBeGreaterThan(0);
    expect(result.toolCalls?.length).toBeGreaterThan(0);
  });

  it('keeps AI context on the exact active workspace file without a phantom main file', () => {
    AIService.setActiveContextFile('/projects/atlas/src/counter.wv');

    expect(AIService.getContextFiles()).toEqual([
      expect.objectContaining({
        id: '/projects/atlas/src/counter.wv',
        path: '/projects/atlas/src/counter.wv',
        name: 'counter.wv',
        isActive: true,
      }),
    ]);
    expect(
      AIService.getContextFiles().some((file) => file.path === '/workspace/src/main.wv')
    ).toBe(false);
  });

  it('AIService discovers models dynamically from provider APIs and allows custom model entry', async () => {
    localStorage.setItem(
      'weave_workspace_settings',
      JSON.stringify({ geminiApiKey: 'test-gemini-key' })
    );

    const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        models: [
          {
            name: 'models/gemini-2.5-pro-exp',
            displayName: 'Gemini 2.5 Pro Experimental',
            supportedGenerationMethods: ['generateContent'],
          },
          {
            name: 'models/gemini-2.5-flash',
            displayName: 'Gemini 2.5 Flash',
            supportedGenerationMethods: ['generateContent'],
          },
        ],
      }),
    } as any);

    const discovered = await AIService.fetchLiveModelsForProvider('Google');
    expect(discovered.length).toBeGreaterThanOrEqual(2);
    expect(discovered.some((m) => m.modelId === 'gemini-2.5-pro-exp')).toBe(true);

    // Test custom model entry
    AIService.setCustomModel('Google', 'gemini-custom-fine-tuned');
    expect(AIService.getActiveModel().modelId).toBe('gemini-custom-fine-tuned');

    mockFetch.mockRestore();
    localStorage.removeItem('weave_workspace_settings');
  });

  it('AIService executes live LLM provider call when API key is configured', async () => {
    localStorage.setItem(
      'weave_workspace_settings',
      JSON.stringify({ geminiApiKey: 'test-gemini-key' })
    );

    const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Here is your new component:\n```weave\ncomponent LiveFromGemini {\n    store count = 100;\n}\n```',
                },
              ],
            },
          },
        ],
      }),
    } as any);

    AIService.setActiveModel('gemini-2-5-pro');
    const result = await AIService.executePrompt('Build a gemini component', 'component Empty {}', 'gemini.wv');

    expect(mockFetch).toHaveBeenCalled();
    expect(result.patch?.modifiedCode).toContain('component LiveFromGemini');
    expect(result.reasoningSteps?.some((s) => s.includes('live Google API'))).toBe(true);

    mockFetch.mockRestore();
    localStorage.removeItem('weave_workspace_settings');
  });

  it('falls back to the signed-in account default when a selected model is unavailable', async () => {
    const previousModel = AIService.getActiveModel().id;
    const runtime = vi
      .spyOn(agentRuntimeService, 'execute')
      .mockRejectedValueOnce(
        new Error('The selected OpenAI model is unavailable for this account.')
      )
      .mockResolvedValueOnce(
        '```weave\ncomponent AccountDefault {\n    ui { Text("Ready") }\n}\n```\nUsed the account default.'
      )
      .mockResolvedValueOnce(
        '```weave\ncomponent AccountDefault {\n    ui { Text("Still ready") }\n}\n```\nReused the account default.'
      );

    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      configurable: true,
      value: {},
    });
    localStorage.setItem(
      'weave_workspace_settings',
      JSON.stringify({ openaiAuthMode: 'oauth' })
    );
    AIService.setCustomModel('OpenAI', 'account-unavailable-test-model');

    try {
      const first = await AIService.executePrompt('Update it', 'component Empty {}', 'main.wv');

      expect(runtime).toHaveBeenNthCalledWith(
        1,
        'OpenAI',
        'account-unavailable-test-model',
        expect.any(String)
      );
      expect(runtime).toHaveBeenNthCalledWith(2, 'OpenAI', '', expect.any(String));
      expect(first.runtime).toBe('OpenAI account · provider default');
      expect(first.reasoningSteps).toContain(
        'account-unavailable-test-model (OpenAI) is unavailable for this account; retrying with the provider\'s account default...'
      );

      const second = await AIService.executePrompt('Update it again', 'component Empty {}', 'main.wv');

      expect(runtime).toHaveBeenCalledTimes(3);
      expect(runtime).toHaveBeenNthCalledWith(3, 'OpenAI', '', expect.any(String));
      expect(second.runtime).toBe('OpenAI account · provider default');
    } finally {
      runtime.mockRestore();
      delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
      localStorage.removeItem('weave_workspace_settings');
      AIService.setActiveModel(previousModel);
    }
  });

  it('AIService lists all Claude models matching ant beta:models list and discovers live models from Anthropic API', async () => {
    // Verify default Claude model suite matching ant beta:models list
    const models = AIService.getAllModels();
    const claudeModels = models.filter((m) => m.provider === 'Anthropic');
    expect(claudeModels.length).toBe(10);
    expect(claudeModels.some((m) => m.modelId === 'claude-opus-5')).toBe(true);
    expect(claudeModels.some((m) => m.modelId === 'claude-sonnet-5')).toBe(true);
    expect(claudeModels.some((m) => m.modelId === 'claude-fable-5')).toBe(true);
    expect(claudeModels.some((m) => m.modelId === 'claude-opus-4-8')).toBe(true);
    expect(claudeModels.some((m) => m.modelId === 'claude-opus-4-7')).toBe(true);
    expect(claudeModels.some((m) => m.modelId === 'claude-sonnet-4-6')).toBe(true);
    expect(claudeModels.some((m) => m.modelId === 'claude-opus-4-6')).toBe(true);
    expect(claudeModels.some((m) => m.modelId === 'claude-opus-4-5-20251101')).toBe(true);
    expect(claudeModels.some((m) => m.modelId === 'claude-haiku-4-5-20251001')).toBe(true);
    expect(claudeModels.some((m) => m.modelId === 'claude-sonnet-4-5-20250929')).toBe(true);

    // Mock Anthropic API models endpoint
    localStorage.setItem(
      'weave_workspace_settings',
      JSON.stringify({ anthropicApiKey: 'sk-ant-test-key' })
    );

    const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'claude-opus-5',
            display_name: 'Claude Opus 5',
            type: 'model',
          },
          {
            id: 'claude-sonnet-5',
            display_name: 'Claude Sonnet 5',
            type: 'model',
          },
        ],
      }),
    } as any);

    const discovered = await AIService.fetchLiveModelsForProvider('Anthropic');
    expect(discovered.length).toBeGreaterThanOrEqual(10);
    expect(discovered.some((m) => m.modelId === 'claude-opus-5')).toBe(true);

    mockFetch.mockRestore();
    localStorage.removeItem('weave_workspace_settings');
  });
});

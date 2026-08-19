import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { agentRuntimeService } from '../services/agentRuntimeService';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('account-backed agent runtime', () => {
  beforeEach(() => {
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      configurable: true,
      value: {},
    });
    vi.mocked(invoke).mockReset();
  });

  afterEach(() => {
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it('checks provider connections without reading OAuth tokens', async () => {
    vi.mocked(invoke).mockResolvedValueOnce([
      {
        provider: 'OpenAI',
        installed: true,
        authenticated: true,
        authMode: 'oauth',
        hasApiKey: false,
        detail: 'Connected with ChatGPT.',
      },
    ]);

    const statuses = await agentRuntimeService.checkProviders();
    expect(invoke).toHaveBeenCalledWith('check_agent_providers', undefined);
    expect(statuses[0]).toMatchObject({ provider: 'OpenAI', authMode: 'oauth' });
    expect(JSON.stringify(statuses)).not.toMatch(/token|secret/i);
  });

  it('stores API keys through the native credential manager command', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(
      'OpenAI API key verified and saved in the system credential store.'
    );

    await expect(agentRuntimeService.saveApiKey('OpenAI', 'sk-proj-test')).resolves.toMatch(
      /verified and saved/i
    );
    expect(invoke).toHaveBeenCalledWith('save_provider_api_key', {
      provider: 'OpenAI',
      apiKey: 'sk-proj-test',
    });
  });

  it('routes API-key prompts through the native provider client', async () => {
    vi.mocked(invoke).mockResolvedValueOnce('Updated code from the Responses API');

    await expect(
      agentRuntimeService.executeApi('OpenAI', 'gpt-5.3-codex', 'Update this file')
    ).resolves.toBe('Updated code from the Responses API');
    expect(invoke).toHaveBeenCalledWith('execute_api_prompt', {
      provider: 'OpenAI',
      model: 'gpt-5.3-codex',
      prompt: 'Update this file',
    });
  });

  it('extracts the final Codex message from its JSONL subprocess output', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      success: true,
      exitCode: 0,
      stdout: [
        JSON.stringify({ type: 'thread.started', thread_id: 'test' }),
        JSON.stringify({
          type: 'item.completed',
          item: { type: 'agent_message', text: 'Updated code from Codex' },
        }),
      ].join('\n'),
      stderr: '',
    });

    const response = await agentRuntimeService.execute('OpenAI', 'gpt-5.3-codex', 'Update this file');
    expect(response).toBe('Updated code from Codex');
    expect(invoke).toHaveBeenCalledWith('execute_agent_prompt', {
      provider: 'OpenAI',
      model: 'gpt-5.3-codex',
      prompt: 'Update this file',
    });
  });

  it('surfaces provider authentication failures cleanly', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: 'Please sign in first',
    });

    await expect(
      agentRuntimeService.execute('Anthropic', 'claude-sonnet-5', 'Explain this file')
    ).rejects.toThrow('Claude authentication is missing or expired.');
  });

  it('reduces Claude CLI JSON failures to a safe, concise message', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      success: false,
      exitCode: 1,
      stdout: JSON.stringify({
        type: 'result',
        subtype: 'success',
        is_error: true,
        api_error:
          'Error: 529 Overloaded. This is a server-side issue, usually temporary — try again.',
        session_id: 'should-not-appear',
        total_cost_usd: 0.0123,
        usage: { input_tokens: 1153 },
      }),
      stderr: 'internal CLI diagnostic that should not replace the structured error',
    });

    await expect(
      agentRuntimeService.execute('Anthropic', 'claude-opus-5', 'Hello')
    ).rejects.toThrow('Claude is temporarily overloaded (529).');
  });

  it('recognizes provider-declared errors even when the CLI exits successfully', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      success: true,
      exitCode: 0,
      stdout: JSON.stringify({
        type: 'result',
        is_error: true,
        result: 'Error: 429 rate limit exceeded',
        session_id: 'hidden-session',
      }),
      stderr: '',
    });

    await expect(
      agentRuntimeService.execute('Anthropic', 'claude-opus-5', 'Hello')
    ).rejects.toThrow('Claude has reached its current rate limit.');
  });
});

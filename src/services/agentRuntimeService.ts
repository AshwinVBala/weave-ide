import type { AIModel } from './aiService';

export type AgentProvider = AIModel['provider'];

export interface AgentProviderStatus {
  provider: AgentProvider;
  installed: boolean;
  authenticated: boolean;
  authMode: 'oauth' | 'api_key' | 'local' | 'account' | 'unavailable' | string;
  hasApiKey: boolean;
  executable?: string;
  detail: string;
}

interface AgentExecutionResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

const isTauriEnvironment = () =>
  typeof window !== 'undefined' &&
  Boolean(
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
      (window as unknown as { __TAURI__?: unknown }).__TAURI__
  );

const invoke = async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
  const core = await import('@tauri-apps/api/core');
  return core.invoke<T>(command, args);
};

const providerLabel = (provider: AgentProvider) =>
  provider === 'Anthropic' ? 'Claude' : provider === 'Google' ? 'Google' : provider;

const cleanErrorText = (provider: AgentProvider, value: string): string => {
  const label = providerLabel(provider);
  const cleaned = value
    .replace(/^Error:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (/\b529\b|overloaded/i.test(cleaned)) {
    return `${label} is temporarily overloaded (529).`;
  }
  if (/\b429\b|rate.?limit|too many requests/i.test(cleaned)) {
    return `${label} has reached its current rate limit.`;
  }
  if (/\b401\b|unauthori[sz]ed|not logged in|sign in first|authentication.*(?:expired|failed)/i.test(cleaned)) {
    return `${label} authentication is missing or expired.`;
  }
  if (/model.*(?:not found|unsupported|unavailable)|invalid.*model/i.test(cleaned)) {
    return `The selected ${label} model is unavailable for this account.`;
  }
  if (!cleaned || cleaned.startsWith('{') || cleaned.startsWith('[')) {
    return `${label} could not complete the request.`;
  }
  return cleaned.length > 280 ? `${cleaned.slice(0, 277)}…` : cleaned;
};

const structuredError = (provider: AgentProvider, output: string): string | null => {
  const candidates = [output, ...output.split('\n')].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const payload = JSON.parse(candidate);
      const rawError =
        (typeof payload?.api_error === 'string' && payload.api_error) ||
        (typeof payload?.error === 'string' && payload.error) ||
        (typeof payload?.error?.message === 'string' && payload.error.message) ||
        (typeof payload?.message === 'string' && payload.message) ||
        (payload?.is_error && typeof payload?.result === 'string' && payload.result);
      if (rawError) return cleanErrorText(provider, rawError);
    } catch {}
  }
  return null;
};

const extractProviderError = (
  provider: AgentProvider,
  stdout: string,
  stderr: string,
  exitCode: number
) =>
  structuredError(provider, stdout) ||
  structuredError(provider, stderr) ||
  cleanErrorText(
    provider,
    stderr.trim() || stdout.trim() || `${providerLabel(provider)} exited with code ${exitCode}`
  );

const extractJsonText = (provider: AgentProvider, output: string): string => {
  if (provider === 'OpenAI') {
    let lastMessage = '';
    for (const line of output.split('\n')) {
      try {
        const event = JSON.parse(line);
        const item = event?.item;
        if (item?.type === 'agent_message' && typeof item.text === 'string') {
          lastMessage = item.text;
        }
        if (typeof event?.result === 'string') lastMessage = event.result;
      } catch {}
    }
    return lastMessage || output.trim();
  }

  try {
    const payload = JSON.parse(output);
    if (typeof payload?.result === 'string') return payload.result;
    if (typeof payload?.response === 'string') return payload.response;
    if (typeof payload?.text === 'string') return payload.text;
    if (typeof payload?.message?.content === 'string') return payload.message.content;
  } catch {}

  return output.trim();
};

export const agentRuntimeService = {
  get isAvailable() {
    return isTauriEnvironment();
  },

  async checkProviders(): Promise<AgentProviderStatus[]> {
    if (!isTauriEnvironment()) {
      return (['OpenAI', 'Anthropic', 'Google', 'Ollama'] as AgentProvider[]).map(
        (provider) => ({
          provider,
          installed: false,
          authenticated: false,
          authMode: 'unavailable',
          hasApiKey: false,
          detail: 'Account connections are available in the Weave desktop app.',
        })
      );
    }
    return invoke<AgentProviderStatus[]>('check_agent_providers');
  },

  async connect(provider: AgentProvider): Promise<string> {
    if (!isTauriEnvironment()) {
      throw new Error('Provider sign-in is available in the Weave desktop app.');
    }
    return invoke<string>('launch_agent_login', { provider });
  },

  async saveApiKey(provider: AgentProvider, apiKey: string): Promise<string> {
    if (!isTauriEnvironment()) {
      throw new Error('Secure API-key storage is available in the Weave desktop app.');
    }
    return invoke<string>('save_provider_api_key', { provider, apiKey });
  },

  async deleteApiKey(provider: AgentProvider): Promise<string> {
    if (!isTauriEnvironment()) {
      throw new Error('Secure API-key storage is available in the Weave desktop app.');
    }
    return invoke<string>('delete_provider_api_key', { provider });
  },

  async executeApi(provider: AgentProvider, model: string, prompt: string): Promise<string> {
    if (!isTauriEnvironment()) {
      throw new Error('Secure API-key execution requires the Weave desktop app.');
    }
    return invoke<string>('execute_api_prompt', { provider, model, prompt });
  },

  async execute(
    provider: AgentProvider,
    model: string,
    prompt: string
  ): Promise<string> {
    if (!isTauriEnvironment()) {
      throw new Error('Account-backed agents require the Weave desktop app.');
    }
    const result = await invoke<AgentExecutionResult>('execute_agent_prompt', {
      provider,
      model,
      prompt,
    });
    if (!result.success) {
      throw new Error(extractProviderError(provider, result.stdout, result.stderr, result.exitCode));
    }
    const reportedError = structuredError(provider, result.stdout);
    if (reportedError) throw new Error(reportedError);
    const text = extractJsonText(provider, result.stdout);
    if (!text) throw new Error(`${provider} returned an empty response.`);
    return text;
  },
};

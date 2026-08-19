import { useCallback, useEffect, useState } from 'react';
import { Sliders, Code2, Cpu, RefreshCw, CheckCircle2, ExternalLink, KeyRound } from 'lucide-react';
import { NativeWeaveStatus, WorkspaceSettings } from '../../types';
import { AIService } from '../../services/aiService';
import { WeaveCompilerService } from '../../services/compilerService';
import { isTauriEnvironment } from '../../services/fsService';
import {
  agentRuntimeService,
  AgentProviderStatus,
  AgentProvider,
} from '../../services/agentRuntimeService';

interface SettingsPanelProps {
  settings: WorkspaceSettings;
  onUpdateSettings: (newSettings: Partial<WorkspaceSettings>) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [providers, setProviders] = useState<AgentProviderStatus[]>([]);
  const [checkingProviders, setCheckingProviders] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState<AgentProvider | null>(null);
  const [pendingLoginProvider, setPendingLoginProvider] = useState<AgentProvider | null>(null);
  const [providerNotice, setProviderNotice] = useState('');
  const [apiKeyDrafts, setApiKeyDrafts] = useState<Partial<Record<AgentProvider, string>>>({});
  const [compilerStatus, setCompilerStatus] = useState<NativeWeaveStatus | null>(null);

  const refreshProviders = useCallback(async () => {
    setCheckingProviders(true);
    try {
      const statuses = await agentRuntimeService.checkProviders();
      setProviders(statuses);
      return statuses;
    } catch (error) {
      setProviderNotice(error instanceof Error ? error.message : 'Could not inspect AI accounts.');
    } finally {
      setCheckingProviders(false);
    }
    return [];
  }, []);

  useEffect(() => {
    refreshProviders();
    const refreshOnFocus = () => refreshProviders();
    const interval = window.setInterval(refreshProviders, 15000);
    window.addEventListener('focus', refreshOnFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [refreshProviders]);

  useEffect(() => {
    let disposed = false;
    WeaveCompilerService.getNativeStatus().then((status) => {
      if (!disposed) setCompilerStatus(status);
    });
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!pendingLoginProvider) return;
    let disposed = false;
    let attempts = 0;
    const checkLogin = async () => {
      attempts += 1;
      const statuses = await refreshProviders();
      const status = statuses.find((entry) => entry.provider === pendingLoginProvider);
      if (!disposed && status?.authenticated) {
        setProviderNotice(`${pendingLoginProvider} account connected.`);
        setPendingLoginProvider(null);
      } else if (!disposed && attempts >= 48) {
        setProviderNotice(
          `${pendingLoginProvider} sign-in is still not visible. Finish the browser flow, then use Refresh connections.`
        );
        setPendingLoginProvider(null);
      }
    };
    const interval = window.setInterval(checkLogin, 2500);
    checkLogin();
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [pendingLoginProvider, refreshProviders]);

  const connectProvider = async (provider: AgentProvider) => {
    setConnectingProvider(provider);
    setProviderNotice('');
    try {
      setProviderNotice(await agentRuntimeService.connect(provider));
      if (provider !== 'Google') setPendingLoginProvider(provider);
      window.setTimeout(refreshProviders, 1500);
    } catch (error) {
      setProviderNotice(error instanceof Error ? error.message : `Could not connect ${provider}.`);
    } finally {
      setConnectingProvider(null);
    }
  };

  const saveApiKey = async (provider: AgentProvider) => {
    const apiKey = apiKeyDrafts[provider]?.trim();
    if (!apiKey) {
      setProviderNotice(`Enter a ${provider} API key first.`);
      return;
    }
    setConnectingProvider(provider);
    setProviderNotice('');
    try {
      setProviderNotice(await agentRuntimeService.saveApiKey(provider, apiKey));
      setApiKeyDrafts((current) => ({ ...current, [provider]: '' }));
      await refreshProviders();
    } catch (error) {
      setProviderNotice(error instanceof Error ? error.message : `Could not save ${provider} key.`);
    } finally {
      setConnectingProvider(null);
    }
  };

  const deleteApiKey = async (provider: AgentProvider) => {
    setConnectingProvider(provider);
    setProviderNotice('');
    try {
      setProviderNotice(await agentRuntimeService.deleteApiKey(provider));
      await refreshProviders();
    } catch (error) {
      setProviderNotice(error instanceof Error ? error.message : `Could not remove ${provider} key.`);
    } finally {
      setConnectingProvider(null);
    }
  };

  const providerMeta: Record<AgentProvider, {
    title: string;
    plan: string;
    color: string;
    placeholder?: string;
    modeKey?: 'openaiAuthMode' | 'anthropicAuthMode' | 'googleAuthMode';
    legacyKey?: 'openaiApiKey' | 'anthropicApiKey' | 'geminiApiKey';
  }> = {
    OpenAI: {
      title: 'ChatGPT / Codex',
      plan: 'ChatGPT account or OpenAI developer billing',
      color: '#10a37f',
      placeholder: 'sk-proj-…',
      modeKey: 'openaiAuthMode',
      legacyKey: 'openaiApiKey',
    },
    Anthropic: {
      title: 'Claude',
      plan: 'Claude account or Anthropic Console billing',
      color: '#d49a70',
      placeholder: 'sk-ant-…',
      modeKey: 'anthropicAuthMode',
      legacyKey: 'anthropicApiKey',
    },
    Google: {
      title: 'Google Antigravity',
      plan: 'Google account or Gemini API billing',
      color: '#4f9cf9',
      placeholder: 'AIzaSy…',
      modeKey: 'googleAuthMode',
      legacyKey: 'geminiApiKey',
    },
    Ollama: { title: 'Ollama', plan: 'Local models · no account', color: '#a78bfa' },
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-3 space-y-6 text-editor-text select-none">
      <div className="flex items-center space-x-2 border-b border-editor-border pb-2">
        <Sliders className="w-4 h-4 text-amber-400" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-editor-text">
          Workspace Settings
        </h2>
      </div>

      {/* Editor Preferences */}
      <div className="space-y-3">
        <div className="flex items-center space-x-1.5 text-xs font-medium text-amber-400">
          <Code2 className="w-4 h-4" />
          <span>Editor Configuration</span>
        </div>

        <div className="space-y-3 pl-2 text-xs">
          <div>
            <label className="block text-editor-muted mb-1">Theme</label>
            <div className="relative">
              <select
                value={settings.theme}
                onChange={(e) =>
                  onUpdateSettings({ theme: e.target.value as WorkspaceSettings['theme'] })
                }
                className="w-full bg-editor-bg border border-editor-border rounded px-2.5 py-1.5 text-xs text-editor-text focus:outline-none focus:border-amber-500"
              >
                <option value="weave-dark">Weave Dark (Default)</option>
                <option value="weave-obsidian">Weave Obsidian (OLED)</option>
                <option value="weave-light">Weave Light</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-editor-muted mb-1">Font Size ({settings.fontSize}px)</label>
              <input
                type="range"
                min="11"
                max="24"
                value={settings.fontSize}
                onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </div>
            <div>
              <label className="block text-editor-muted mb-1">Tab Size</label>
              <select
                value={settings.tabSize}
                onChange={(e) => onUpdateSettings({ tabSize: Number(e.target.value) })}
                className="w-full bg-editor-bg border border-editor-border rounded px-2.5 py-1 text-xs text-editor-text"
              >
                <option value={2}>2 Spaces</option>
                <option value={4}>4 Spaces</option>
                <option value={8}>8 Spaces</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.minimap}
                onChange={(e) => onUpdateSettings({ minimap: e.target.checked })}
                className="rounded border-editor-border text-amber-500 focus:ring-0 accent-amber-500"
              />
              <span className="text-editor-text">Show Code Minimap</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => onUpdateSettings({ autoSave: e.target.checked })}
                className="rounded border-editor-border text-amber-500 focus:ring-0 accent-amber-500"
              />
              <span className="text-editor-text">Auto-Save on Change</span>
            </label>

            {settings.autoSave && (
              <label className="flex items-center justify-between gap-3 pl-5 text-editor-muted">
                <span>Auto-save delay</span>
                <select
                  value={settings.autoSaveDelay}
                  onChange={(e) => onUpdateSettings({ autoSaveDelay: Number(e.target.value) })}
                  className="rounded border border-editor-border bg-editor-bg px-2 py-1 text-editor-text"
                >
                  <option value={500}>0.5 seconds</option>
                  <option value={1000}>1 second</option>
                  <option value={2000}>2 seconds</option>
                  <option value={5000}>5 seconds</option>
                </select>
              </label>
            )}

          </div>
        </div>
      </div>

      {/* AI accounts */}
      <div className="space-y-3">
        <div className="flex items-center space-x-1.5 text-xs font-medium text-cyan-400">
          <Cpu className="w-4 h-4" />
          <span>AI Accounts</span>
        </div>
        <p className="pl-2 text-[10px] leading-4 text-editor-muted">
          Choose account limits or developer API billing per provider. OAuth stays in the official
          client; API keys are verified and saved in your system credential store.
        </p>

        <div className="space-y-2 pl-2 text-xs">
          {(Object.keys(providerMeta) as AgentProvider[]).map((provider) => {
            const status = providers.find((entry) => entry.provider === provider);
            const meta = providerMeta[provider];
            const authMode = meta.modeKey
              ? settings[meta.modeKey] || (meta.legacyKey && settings[meta.legacyKey] ? 'api_key' : 'oauth')
              : 'local';
            const connected = authMode === 'api_key' ? Boolean(status?.hasApiKey) : Boolean(status?.authenticated);
            return (
              <div key={provider} className="rounded-lg border border-editor-border bg-editor-bg/60 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-medium text-editor-text">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                      <span>{meta.title}</span>
                      {connected && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                    </div>
                    <div className="mt-0.5 text-[9px] text-editor-muted">{meta.plan}</div>
                  </div>
                  {provider === 'Ollama' ? (
                    <button
                      type="button"
                      onClick={() => AIService.fetchLiveModelsForProvider('Ollama')}
                      className="rounded border border-editor-border px-2 py-1 text-[9px] text-editor-muted hover:text-editor-text"
                    >
                      Discover
                    </button>
                  ) : authMode === 'oauth' ? (
                    <button
                      type="button"
                      disabled={checkingProviders || connectingProvider === provider || !status?.installed}
                      onClick={() => connectProvider(provider)}
                      className="flex items-center gap-1 rounded border border-editor-border bg-editor-panel px-2 py-1 text-[9px] text-editor-text hover:border-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {connectingProvider === provider ? (
                        <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                      ) : (
                        <ExternalLink className="h-2.5 w-2.5" />
                      )}
                      {status?.authenticated && status.authMode === 'oauth'
                        ? 'Reconnect'
                        : provider === 'Google'
                        ? 'Open'
                        : 'Connect'}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] text-editor-muted">
                      <KeyRound className="h-2.5 w-2.5" />
                      {status?.hasApiKey ? 'Key saved' : 'Key needed'}
                    </span>
                  )}
                </div>
                {provider !== 'Ollama' && meta.modeKey && (
                  <div className="mt-2 grid grid-cols-2 rounded-md border border-editor-border bg-editor-panel/60 p-0.5">
                    {(['oauth', 'api_key'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onUpdateSettings({ [meta.modeKey!]: mode })}
                        className={`rounded px-2 py-1 text-[9px] transition-colors ${
                          authMode === mode
                            ? 'bg-editor-active text-editor-text shadow-sm'
                            : 'text-editor-muted hover:text-editor-text'
                        }`}
                      >
                        {mode === 'oauth' ? 'Account' : 'API key'}
                      </button>
                    ))}
                  </div>
                )}
                {authMode === 'api_key' && provider !== 'Ollama' ? (
                  <div className="mt-2 space-y-1.5">
                    <input
                      type="password"
                      autoComplete="off"
                      placeholder={status?.hasApiKey ? 'Enter a replacement key…' : meta.placeholder}
                      value={apiKeyDrafts[provider] || ''}
                      onChange={(event) =>
                        setApiKeyDrafts((current) => ({ ...current, [provider]: event.target.value }))
                      }
                      className="w-full rounded border border-editor-border bg-editor-bg px-2 py-1.5 font-mono text-[10px] text-editor-text focus:border-cyan-500 focus:outline-none"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] leading-3.5 text-editor-muted">
                        {provider === 'Google'
                          ? 'Uses the Gemini API; Antigravity itself only supports account login.'
                          : `Uses ${provider} developer billing and rate limits.`}
                      </span>
                      <div className="flex shrink-0 gap-1">
                        {status?.hasApiKey && (
                          <button
                            type="button"
                            disabled={connectingProvider === provider}
                            onClick={() => deleteApiKey(provider)}
                            className="rounded border border-editor-border px-2 py-1 text-[9px] text-editor-muted hover:text-red-300 disabled:opacity-40"
                          >
                            Remove
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={connectingProvider === provider || !apiKeyDrafts[provider]?.trim()}
                          onClick={() => saveApiKey(provider)}
                          className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[9px] text-cyan-200 hover:bg-cyan-500/15 disabled:opacity-40"
                        >
                          {connectingProvider === provider ? 'Verifying…' : status?.hasApiKey ? 'Replace' : 'Verify & save'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-[9px] leading-3.5 text-editor-muted">
                    {checkingProviders ? 'Checking official client…' : status?.detail || 'Provider status unavailable.'}
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={refreshProviders}
            className="flex items-center gap-1 text-[9px] text-editor-muted hover:text-editor-text"
          >
            <RefreshCw className={`h-2.5 w-2.5 ${checkingProviders ? 'animate-spin' : ''}`} />
            Refresh connections
          </button>
          {providerNotice && (
            <div className="rounded border border-cyan-500/20 bg-cyan-500/5 px-2 py-1.5 text-[9px] leading-3.5 text-cyan-200">
              {providerNotice}
            </div>
          )}

          <div>
            <label className="mb-1 block text-[9px] text-editor-muted">Ollama endpoint</label>
            <input
              type="text"
              value={settings.ollamaEndpoint || 'http://localhost:11434'}
              onChange={(event) => onUpdateSettings({ ollamaEndpoint: event.target.value })}
              className="w-full rounded border border-editor-border bg-editor-bg px-2 py-1.5 font-mono text-[10px] text-editor-text focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Weave compiler capability status */}
      <div className="space-y-3">
        <div className="flex items-center space-x-1.5 text-xs font-medium text-amber-400">
          <Sliders className="w-4 h-4" />
          <span>Weave Compiler</span>
        </div>

        <div className="pl-2 text-xs leading-5 text-editor-muted">
          {!compilerStatus ? (
            <span>Checking local compiler…</span>
          ) : compilerStatus.available ? (
            <>
              <div className="text-emerald-400">Native CLI connected</div>
              <div className="font-mono break-all">{compilerStatus.version || compilerStatus.path}</div>
              <div>
                {compilerStatus.supports_test
                  ? 'Native build, run, and test commands available.'
                  : 'Native build and run available; tests use WASM discovery.'}
              </div>
            </>
          ) : (
            <>
              <div className="text-amber-400">Browser WASM backend active</div>
              <div>Install the Weave CLI to enable native run and build commands.</div>
            </>
          )}
        </div>
      </div>

      {/* Environment info */}
      <div className="pt-4 border-t border-editor-border text-[11px] text-editor-muted space-y-1">
        <div className="flex justify-between">
          <span>Weave Compiler:</span>
          <span className="font-mono text-amber-400 font-semibold">
            {compilerStatus?.version || (compilerStatus ? 'WASM' : 'Checking…')}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Tauri Desktop Host:</span>
          <span className="font-mono text-editor-text">
            {isTauriEnvironment() ? 'Connected' : 'Browser preview'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Monaco Engine:</span>
          <span className="font-mono text-editor-text">v0.52.2</span>
        </div>
      </div>
    </div>
  );
};

import { agentRuntimeService } from './agentRuntimeService';

export interface AIModel {
  id: string;
  name: string;
  provider: 'Anthropic' | 'Google' | 'OpenAI' | 'Ollama';
  badge: string;
  color: string;
  description: string;
  contextWindow?: string;
  speed?: 'Ultra Fast' | 'Fast' | 'Balanced';
  modelId: string;
  isCustom?: boolean;
}

export const DEFAULT_AVAILABLE_MODELS: AIModel[] = [
  // Google Gemini Models (aligned with ai.google.dev API docs)
  {
    id: 'gemini-3-1-pro',
    name: 'Gemini 3.1 Pro (Latest)',
    provider: 'Google',
    badge: 'Frontier Reasoning',
    color: '#00E5FF',
    description: 'Google DeepMind frontier reasoning flagship with 2M context, agentic coding & multimodal intelligence',
    contextWindow: '2M',
    speed: 'Fast',
    modelId: 'gemini-3.1-pro-preview',
  },
  {
    id: 'gemini-3-5-flash',
    name: 'Gemini 3.5 Flash',
    provider: 'Google',
    badge: 'High-Speed Reasoning',
    color: '#00E5FF',
    description: 'Next-gen high-throughput multimodal model with fast adaptive inference and 1M context',
    contextWindow: '1M',
    speed: 'Ultra Fast',
    modelId: 'gemini-3.5-flash',
  },
  {
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash',
    provider: 'Google',
    badge: 'Low Latency',
    color: '#00E5FF',
    description: 'Next-gen low-latency model optimized for real-time IDE code generation and AST edits',
    contextWindow: '1M',
    speed: 'Ultra Fast',
    modelId: 'gemini-3-flash-preview',
  },
  {
    id: 'gemini-3-1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    provider: 'Google',
    badge: 'Ultra Fast',
    color: '#00E5FF',
    description: 'Lightweight high-efficiency model for instant AST completions and token economy',
    contextWindow: '1M',
    speed: 'Ultra Fast',
    modelId: 'gemini-3.1-flash-lite',
  },
  {
    id: 'gemini-2-5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    badge: 'Deep Reasoning',
    color: '#00E5FF',
    description: 'Google flagship reasoning model with multimodal UI comprehension and 2M context window',
    contextWindow: '2M',
    speed: 'Fast',
    modelId: 'gemini-2.5-pro',
  },
  {
    id: 'gemini-2-5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    badge: 'Balanced Multimodal',
    color: '#00E5FF',
    description: 'Ultra-fast reasoning model with low latency and 1M context',
    contextWindow: '1M',
    speed: 'Ultra Fast',
    modelId: 'gemini-2.5-flash',
  },
  {
    id: 'gemini-2-5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    provider: 'Google',
    badge: 'Compact Speed',
    color: '#00E5FF',
    description: 'Lightweight model designed for cost-efficiency and quick suggestions',
    contextWindow: '1M',
    speed: 'Ultra Fast',
    modelId: 'gemini-2.5-flash-lite',
  },

  // Anthropic Claude Models (aligned with ant beta:models list)
  {
    id: 'claude-opus-5',
    name: 'Claude Opus 5',
    provider: 'Anthropic',
    badge: 'Flagship 5 Series',
    color: '#FF9D00',
    description: 'Next-gen Opus 5 flagship model with 1M context, 128k output, citations, code execution & adaptive thinking',
    contextWindow: '1M',
    speed: 'Balanced',
    modelId: 'claude-opus-5',
  },
  {
    id: 'claude-sonnet-5',
    name: 'Claude Sonnet 5',
    provider: 'Anthropic',
    badge: 'Flagship 5 Series',
    color: '#FF9D00',
    description: 'Next-gen Sonnet 5 model with 1M context, 128k output & high-speed reasoning',
    contextWindow: '1M',
    speed: 'Fast',
    modelId: 'claude-sonnet-5',
  },
  {
    id: 'claude-fable-5',
    name: 'Claude Fable 5',
    provider: 'Anthropic',
    badge: 'Creative Reasoning',
    color: '#FF9D00',
    description: 'Specialized Fable 5 model optimized for expressive UI architecture, creative reasoning & adaptive thinking',
    contextWindow: '1M',
    speed: 'Fast',
    modelId: 'claude-fable-5',
  },
  {
    id: 'claude-opus-4-8',
    name: 'Claude Opus 4.8',
    provider: 'Anthropic',
    badge: 'Deep Reasoning',
    color: '#FF9D00',
    description: 'High-capacity Opus 4.8 reasoning model with 1M context window and max effort thinking',
    contextWindow: '1M',
    speed: 'Balanced',
    modelId: 'claude-opus-4-8',
  },
  {
    id: 'claude-opus-4-7',
    name: 'Claude Opus 4.7',
    provider: 'Anthropic',
    badge: 'Deep Reasoning',
    color: '#FF9D00',
    description: 'Opus 4.7 model with 1M context, structured outputs, code execution, and adaptive thinking',
    contextWindow: '1M',
    speed: 'Balanced',
    modelId: 'claude-opus-4-7',
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'Anthropic',
    badge: 'Code Specialist',
    color: '#FF9D00',
    description: 'Sonnet 4.6 high-throughput code synthesis model with 1M context and 128k output',
    contextWindow: '1M',
    speed: 'Fast',
    modelId: 'claude-sonnet-4-6',
  },
  {
    id: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    provider: 'Anthropic',
    badge: 'Deep Reasoning',
    color: '#FF9D00',
    description: 'Opus 4.6 model with 1M context window and advanced context management',
    contextWindow: '1M',
    speed: 'Balanced',
    modelId: 'claude-opus-4-6',
  },
  {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    provider: 'Anthropic',
    badge: 'Deep Analysis',
    color: '#FF9D00',
    description: 'Opus 4.5 release with 200k context, 64k tokens output, citations & thinking',
    contextWindow: '200K',
    speed: 'Balanced',
    modelId: 'claude-opus-4-5-20251101',
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    badge: 'Instant Speed',
    color: '#FF9D00',
    description: 'Haiku 4.5 ultra-fast low latency assistant with 200k context and 64k output',
    contextWindow: '200K',
    speed: 'Ultra Fast',
    modelId: 'claude-haiku-4-5-20251001',
  },
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    badge: 'Code Specialist',
    color: '#FF9D00',
    description: 'Sonnet 4.5 model with 1M context window, 64k output & code execution',
    contextWindow: '1M',
    speed: 'Fast',
    modelId: 'claude-sonnet-4-5-20250929',
  },

  // OpenAI Models (aligned with platform.openai.com API docs)
  {
    id: 'gpt-5-3-codex',
    name: 'GPT-5.3 Codex (Latest)',
    provider: 'OpenAI',
    badge: 'Agentic Coding',
    color: '#10A37F',
    description: 'OpenAI premier developer model optimized for agentic coding workflows, long-horizon refactoring & AST generation',
    contextWindow: '256K',
    speed: 'Fast',
    modelId: 'gpt-5.3-codex',
  },
  {
    id: 'gpt-5-pro',
    name: 'GPT-5 Pro',
    provider: 'OpenAI',
    badge: 'Frontier Intelligence',
    color: '#10A37F',
    description: 'Scaled parallel test-time compute flagship for highly complex reasoning, system architecture & math',
    contextWindow: '256K',
    speed: 'Balanced',
    modelId: 'gpt-5-pro',
  },
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'OpenAI',
    badge: 'Adaptive Thinking',
    color: '#10A37F',
    description: 'Flagship unified foundation model combining high-speed generation with built-in reasoning',
    contextWindow: '256K',
    speed: 'Fast',
    modelId: 'gpt-5',
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'OpenAI',
    badge: 'Fast Reasoning',
    color: '#10A37F',
    description: 'High-throughput, cost-efficient reasoning model for rapid AST analysis and code fixes',
    contextWindow: '128K',
    speed: 'Ultra Fast',
    modelId: 'gpt-5-mini',
  },
  {
    id: 'o3',
    name: 'OpenAI o3',
    provider: 'OpenAI',
    badge: 'Deep STEM Reasoning',
    color: '#10A37F',
    description: 'Advanced chain-of-thought model specialized in deep math, science, and complex algorithmic logic',
    contextWindow: '200K',
    speed: 'Balanced',
    modelId: 'o3',
  },
  {
    id: 'o3-mini',
    name: 'OpenAI o3-mini',
    provider: 'OpenAI',
    badge: 'STEM Reasoning',
    color: '#10A37F',
    description: 'Cost-efficient STEM reasoning model optimized for math and complex algorithmic logic',
    contextWindow: '200K',
    speed: 'Balanced',
    modelId: 'o3-mini',
  },
  {
    id: 'gpt-4-1',
    name: 'GPT-4.1',
    provider: 'OpenAI',
    badge: 'High Accuracy',
    color: '#10A37F',
    description: 'Optimized non-reasoning model built for high-accuracy traditional NLP & codegen',
    contextWindow: '128K',
    speed: 'Fast',
    modelId: 'gpt-4.1',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    badge: 'Omni Vision',
    color: '#10A37F',
    description: 'High-speed flagship code refactoring, styling optimization, and component scaffolding',
    contextWindow: '128K',
    speed: 'Fast',
    modelId: 'gpt-4o',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    badge: 'Fast & Light',
    color: '#10A37F',
    description: 'Fast, compact model for simple queries and UI component templates',
    contextWindow: '128K',
    speed: 'Ultra Fast',
    modelId: 'gpt-4o-mini',
  },

  // Ollama Models
  {
    id: 'local-deepseek-r1',
    name: 'DeepSeek-R1 (Local)',
    provider: 'Ollama',
    badge: 'Offline Privacy',
    color: '#8B5CF6',
    description: 'Local DeepSeek-R1 reasoning model executing with zero network telemetry',
    contextWindow: '64K',
    speed: 'Balanced',
    modelId: 'deepseek-r1:latest',
  },
  {
    id: 'local-llama-3-3',
    name: 'Llama 3.3 (Local)',
    provider: 'Ollama',
    badge: 'Local Open Source',
    color: '#8B5CF6',
    description: 'Meta Llama 3.3 70B instructed model executing on local hardware',
    contextWindow: '128K',
    speed: 'Balanced',
    modelId: 'llama3.3:latest',
  },
  {
    id: 'local-qwen-coder',
    name: 'Qwen 2.5 Coder (Local)',
    provider: 'Ollama',
    badge: 'Coding Specialist',
    color: '#8B5CF6',
    description: 'Specialized open coding model for AST refactoring and synthesis',
    contextWindow: '32K',
    speed: 'Fast',
    modelId: 'qwen2.5-coder:latest',
  },
];

export let AVAILABLE_MODELS: AIModel[] = [...DEFAULT_AVAILABLE_MODELS];

export interface ContextFileChip {
  id: string;
  path: string;
  name: string;
  kind: 'component' | 'store' | 'theme' | 'resource' | 'module';
  sizeBytes?: number;
  isActive?: boolean;
}

export interface AIToolCall {
  tool: string;
  args: Record<string, any>;
  result: string;
  status: 'running' | 'success' | 'failed';
}

export interface AICodePatch {
  filePath: string;
  originalCode: string;
  modifiedCode: string;
  summary: string;
  diffLines?: { type: 'add' | 'del' | 'same'; text: string }[];
}

export type AIPatch = AICodePatch;

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  reasoningSteps?: string[];
  toolCalls?: AIToolCall[];
  patch?: AICodePatch;
  isStreaming?: boolean;
  runtime?: string;
  isError?: boolean;
}

const WEAVE_LANGUAGE_SPEC = `
You are an expert AI pair programmer for Weave, a modern declarative concurrent UI programming language.
Weave syntax reference:
1. Themes:
theme StudioTheme {
    colors: {
        primary: "#00E5FF";
        accent: "#FF9D00";
        bg: "#0a0c10";
        cardBg: "#141824";
        text: "#f8fafc";
    };
    spacing: {
        sm: 8;
        md: 16;
        lg: 24;
    };
}

2. Resources (Async Data Fetching):
resource users = fetch("https://jsonplaceholder.typicode.com/users");

3. Components & Reactive Stores:
component App {
    store count = 0;
    store title = "Weave Studio";

    ui {
        VStack(padding: StudioTheme.spacing.lg, bg: StudioTheme.colors.bg, gap: 16) {
            Text(title)
            if (users.loading) {
                Text("Loading data...")
            } else {
                Text("Data loaded")
            }
            HStack(gap: 8) {
                Button("Increment", onClick: fn() {
                    count += 1;
                })
                Button("Reset", onClick: fn() {
                    count = 0;
                })
            }
            Text("Count: " + count)
        }
    }
}

Rules:
- Output your explanation clearly.
- When generating code, put the full updated Weave code inside a single \`\`\`weave code block.
`;

export class AIService {
  private static readonly allowOfflineTemplates =
    (import.meta as any).env?.MODE === 'test';
  private static readonly accountModelFallbacks = new Set<string>();
  private static activeModel: AIModel = AVAILABLE_MODELS[0];
  private static contextFiles: ContextFileChip[] = [];
  private static messages: AIMessage[] = [
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Choose a model and connect its account or API key, then ask me to explain, debug, or edit this file.',
      timestamp: Date.now() - 60000,
      model: AVAILABLE_MODELS[0].name,
    },
  ];
  private static listeners: Set<() => void> = new Set();

  public static getActiveModel(): AIModel {
    return this.activeModel;
  }

  public static getAllModels(): AIModel[] {
    return [...AVAILABLE_MODELS];
  }

  public static setActiveModel(modelId: string) {
    const found = AVAILABLE_MODELS.find((m) => m.id === modelId || m.modelId === modelId);
    if (found) {
      this.activeModel = found;
      this.notify();
    }
  }

  /**
   * Sets a custom user-defined model ID for any provider
   */
  public static setCustomModel(provider: AIModel['provider'], customModelId: string) {
    const trimmed = customModelId.trim();
    if (!trimmed) return;

    const existing = AVAILABLE_MODELS.find(
      (m) => m.provider === provider && (m.modelId === trimmed || m.id === trimmed)
    );

    if (existing) {
      this.activeModel = existing;
    } else {
      const color =
        provider === 'Google'
          ? '#00E5FF'
          : provider === 'Anthropic'
          ? '#FF9D00'
          : provider === 'OpenAI'
          ? '#10A37F'
          : '#8B5CF6';

      const customModel: AIModel = {
        id: `custom-${provider.toLowerCase()}-${trimmed}`,
        name: `${trimmed} (${provider})`,
        provider,
        badge: 'Custom Model',
        color,
        description: `Custom ${provider} model specified by user`,
        modelId: trimmed,
        isCustom: true,
      };

      AVAILABLE_MODELS = [customModel, ...AVAILABLE_MODELS];
      this.activeModel = customModel;
    }
    this.notify();
  }

  public static getContextFiles(): ContextFileChip[] {
    return [...this.contextFiles];
  }

  public static addContextFile(file: ContextFileChip) {
    if (!this.contextFiles.some((f) => f.path === file.path)) {
      this.contextFiles = [...this.contextFiles, file];
      this.notify();
    }
  }

  public static setActiveContextFile(path: string) {
    const normalizedPath = path.trim();
    if (!normalizedPath) {
      this.contextFiles = [];
      this.notify();
      return;
    }
    const name = normalizedPath.split(/[\\/]/).pop() || 'file.wv';
    this.contextFiles = [
      {
        id: normalizedPath,
        path: normalizedPath,
        name,
        kind: /theme/i.test(name) ? 'theme' : /store/i.test(name) ? 'store' : 'component',
        isActive: true,
      },
    ];
    this.notify();
  }

  public static removeContextFile(path: string) {
    this.contextFiles = this.contextFiles.filter((f) => f.path !== path);
    this.notify();
  }

  public static getMessages(): AIMessage[] {
    return [...this.messages];
  }

  public static clearConversation() {
    this.messages = [
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: 'Choose a connected model, then ask me to explain, edit, debug, or build.',
        timestamp: Date.now(),
        model: this.activeModel.name,
      },
    ];
    this.notify();
  }

  public static subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private static notify() {
    this.listeners.forEach((l) => l());
  }

  /**
   * Retrieves active API keys from localStorage or environment variables
   */
  public static getApiKeys(): {
    gemini?: string;
    anthropic?: string;
    openai?: string;
    ollamaEndpoint?: string;
  } {
    let storedSettings: any = {};
    try {
      const saved = localStorage.getItem('weave_workspace_settings');
      if (saved) storedSettings = JSON.parse(saved);
    } catch {}

    return {
      gemini: storedSettings.geminiApiKey || (import.meta as any).env?.VITE_GEMINI_API_KEY,
      anthropic: storedSettings.anthropicApiKey || (import.meta as any).env?.VITE_ANTHROPIC_API_KEY,
      openai: storedSettings.openaiApiKey || (import.meta as any).env?.VITE_OPENAI_API_KEY,
      ollamaEndpoint: storedSettings.ollamaEndpoint || (import.meta as any).env?.VITE_OLLAMA_URL || 'http://localhost:11434',
    };
  }

  public static getAuthMode(provider: AIModel['provider']): 'oauth' | 'api_key' | 'local' {
    if (provider === 'Ollama') return 'local';
    let storedSettings: any = {};
    try {
      const saved = localStorage.getItem('weave_workspace_settings');
      if (saved) storedSettings = JSON.parse(saved);
    } catch {}

    const modeKey =
      provider === 'OpenAI'
        ? 'openaiAuthMode'
        : provider === 'Anthropic'
        ? 'anthropicAuthMode'
        : 'googleAuthMode';
    const legacyKey =
      provider === 'OpenAI'
        ? storedSettings.openaiApiKey
        : provider === 'Anthropic'
        ? storedSettings.anthropicApiKey
        : storedSettings.geminiApiKey;
    return storedSettings[modeKey] === 'api_key' || (!storedSettings[modeKey] && legacyKey)
      ? 'api_key'
      : 'oauth';
  }

  /**
   * Fetches the dynamic list of available models directly from provider APIs.
   * Auto-maps to the latest models and adds them to AVAILABLE_MODELS.
   */
  public static async fetchLiveModelsForProvider(provider: AIModel['provider']): Promise<AIModel[]> {
    const keys = this.getApiKeys();
    const discovered: AIModel[] = [];

    try {
      if (provider === 'Google' && keys.gemini) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${keys.gemini}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const list = data.models || [];
          for (const m of list) {
            const rawName = m.name?.replace(/^models\//, '') || '';
            const methods = m.supportedGenerationMethods || [];
            if (methods.includes('generateContent') && !rawName.includes('embedding') && !rawName.includes('aqa')) {
              const is3 = rawName.includes('3.1') || rawName.includes('3.5') || rawName.includes('gemini-3');
              const isPro = rawName.includes('pro');
              const isFlash = rawName.includes('flash');
              const isExp = rawName.includes('exp') || rawName.includes('preview');
              discovered.push({
                id: `gemini-${rawName}`,
                name: m.displayName || rawName,
                provider: 'Google',
                badge: is3 ? (isPro ? 'Frontier Reasoning' : 'High-Speed Reasoning') : isExp ? 'Experimental' : isPro ? 'Reasoning Pro' : isFlash ? 'Fast Flash' : 'Google AI',
                color: '#00E5FF',
                description: m.description || `Google Gemini model ${rawName}`,
                contextWindow: m.inputTokenLimit ? `${Math.round(m.inputTokenLimit / 1000)}K` : isPro ? '2M' : '1M',
                speed: isFlash ? 'Ultra Fast' : 'Fast',
                modelId: rawName,
              });
            }
          }
        }

        // Ensure latest canonical Google models are present
        const canonicalGoogle: AIModel[] = [
          {
            id: 'gemini-3-1-pro',
            name: 'Gemini 3.1 Pro (Latest)',
            provider: 'Google',
            badge: 'Frontier Reasoning',
            color: '#00E5FF',
            description: 'Google DeepMind frontier reasoning flagship with 2M context, agentic coding & multimodal intelligence',
            contextWindow: '2M',
            speed: 'Fast',
            modelId: 'gemini-3.1-pro-preview',
          },
          {
            id: 'gemini-3-5-flash',
            name: 'Gemini 3.5 Flash',
            provider: 'Google',
            badge: 'High-Speed Reasoning',
            color: '#00E5FF',
            description: 'Next-gen high-throughput multimodal model with fast adaptive inference and 1M context',
            contextWindow: '1M',
            speed: 'Ultra Fast',
            modelId: 'gemini-3.5-flash',
          },
          {
            id: 'gemini-3-flash',
            name: 'Gemini 3 Flash',
            provider: 'Google',
            badge: 'Low Latency',
            color: '#00E5FF',
            description: 'Next-gen low-latency model optimized for real-time IDE code generation and AST edits',
            contextWindow: '1M',
            speed: 'Ultra Fast',
            modelId: 'gemini-3-flash-preview',
          },
          {
            id: 'gemini-3-1-flash-lite',
            name: 'Gemini 3.1 Flash-Lite',
            provider: 'Google',
            badge: 'Ultra Fast',
            color: '#00E5FF',
            description: 'Lightweight high-efficiency model for instant AST completions and token economy',
            contextWindow: '1M',
            speed: 'Ultra Fast',
            modelId: 'gemini-3.1-flash-lite',
          },
          {
            id: 'gemini-2-5-pro',
            name: 'Gemini 2.5 Pro',
            provider: 'Google',
            badge: 'Deep Reasoning',
            color: '#00E5FF',
            description: 'Google flagship reasoning model with multimodal UI comprehension and 2M context window',
            contextWindow: '2M',
            speed: 'Fast',
            modelId: 'gemini-2.5-pro',
          },
          {
            id: 'gemini-2-5-flash',
            name: 'Gemini 2.5 Flash',
            provider: 'Google',
            badge: 'Balanced Multimodal',
            color: '#00E5FF',
            description: 'Ultra-fast reasoning model with low latency and 1M context',
            contextWindow: '1M',
            speed: 'Ultra Fast',
            modelId: 'gemini-2.5-flash',
          },
        ];
        for (const g of canonicalGoogle) {
          if (!discovered.some((d) => d.modelId === g.modelId)) {
            discovered.push(g);
          }
        }
      } else if (provider === 'OpenAI' && keys.openai) {
        const url = 'https://api.openai.com/v1/models';
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${keys.openai}` },
        });
        if (res.ok) {
          const data = await res.json();
          const list = data.data || [];
          for (const m of list) {
            const id = m.id;
            if (
              id.startsWith('gpt-5') ||
              id.startsWith('gpt-4') ||
              id.startsWith('gpt-3.5') ||
              id.startsWith('o1') ||
              id.startsWith('o3') ||
              id.startsWith('chatgpt')
            ) {
              const isCodex = id.includes('codex');
              const isGpt5 = id.startsWith('gpt-5');
              const isO3 = id.startsWith('o3') || id.startsWith('o1');
              const isMini = id.includes('mini');
              const badge = isCodex
                ? 'Agentic Coding'
                : isGpt5
                ? id.includes('pro')
                  ? 'Frontier Intelligence'
                  : 'Adaptive Thinking'
                : isO3
                ? 'STEM Reasoning'
                : isMini
                ? 'Lightweight'
                : 'Omni Flagship';

              discovered.push({
                id: `openai-${id}`,
                name: id,
                provider: 'OpenAI',
                badge,
                color: '#10A37F',
                description: `OpenAI ${id} model via API`,
                contextWindow: isGpt5 ? '256K' : isO3 ? '200K' : '128K',
                speed: isMini ? 'Ultra Fast' : 'Fast',
                modelId: id,
              });
            }
          }
        }

        // Ensure latest canonical OpenAI models are present
        const canonicalOpenAI: AIModel[] = [
          {
            id: 'gpt-5-3-codex',
            name: 'GPT-5.3 Codex (Latest)',
            provider: 'OpenAI',
            badge: 'Agentic Coding',
            color: '#10A37F',
            description: 'OpenAI premier developer model optimized for agentic coding workflows, long-horizon refactoring & AST generation',
            contextWindow: '256K',
            speed: 'Fast',
            modelId: 'gpt-5.3-codex',
          },
          {
            id: 'gpt-5-pro',
            name: 'GPT-5 Pro',
            provider: 'OpenAI',
            badge: 'Frontier Intelligence',
            color: '#10A37F',
            description: 'Scaled parallel test-time compute flagship for highly complex reasoning, system architecture & math',
            contextWindow: '256K',
            speed: 'Balanced',
            modelId: 'gpt-5-pro',
          },
          {
            id: 'gpt-5',
            name: 'GPT-5',
            provider: 'OpenAI',
            badge: 'Adaptive Thinking',
            color: '#10A37F',
            description: 'Flagship unified foundation model combining high-speed generation with built-in reasoning',
            contextWindow: '256K',
            speed: 'Fast',
            modelId: 'gpt-5',
          },
          {
            id: 'gpt-5-mini',
            name: 'GPT-5 Mini',
            provider: 'OpenAI',
            badge: 'Fast Reasoning',
            color: '#10A37F',
            description: 'High-throughput, cost-efficient reasoning model for rapid AST analysis and code fixes',
            contextWindow: '128K',
            speed: 'Ultra Fast',
            modelId: 'gpt-5-mini',
          },
          {
            id: 'o3',
            name: 'OpenAI o3',
            provider: 'OpenAI',
            badge: 'Deep STEM Reasoning',
            color: '#10A37F',
            description: 'Advanced chain-of-thought model specialized in deep math, science, and complex algorithmic logic',
            contextWindow: '200K',
            speed: 'Balanced',
            modelId: 'o3',
          },
        ];
        for (const o of canonicalOpenAI) {
          if (!discovered.some((d) => d.modelId === o.modelId)) {
            discovered.push(o);
          }
        }
      } else if (provider === 'Ollama') {
        const endpoint = keys.ollamaEndpoint || 'http://localhost:11434';
        const url = `${endpoint}/api/tags`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const list = data.models || [];
          for (const m of list) {
            const name = m.name;
            discovered.push({
              id: `ollama-${name}`,
              name: `${name} (Local)`,
              provider: 'Ollama',
              badge: 'Local Pulled Tag',
              color: '#8B5CF6',
              description: `Locally installed Ollama model ${name} (${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB)`,
              contextWindow: 'Local',
              speed: 'Balanced',
              modelId: name,
            });
          }
        }
      } else if (provider === 'Anthropic') {
        if (keys.anthropic) {
          try {
            const url = 'https://api.anthropic.com/v1/models';
            const res = await fetch(url, {
              headers: {
                'x-api-key': keys.anthropic,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
              },
            });
            if (res.ok) {
              const data = await res.json();
              const list = data.data || [];
              for (const m of list) {
                const id = m.id;
                const displayName = m.display_name || id;
                const is37 = id.includes('3-7') || id.includes('3.7');
                const is35 = id.includes('3-5') || id.includes('3.5');
                const isHaiku = id.includes('haiku');
                const isOpus = id.includes('opus');

                discovered.push({
                  id: `anthropic-${id}`,
                  name: displayName,
                  provider: 'Anthropic',
                  badge: is37
                    ? 'Hybrid Thinking'
                    : is35
                    ? 'Code Specialist'
                    : isOpus
                    ? 'Deep Analysis'
                    : isHaiku
                    ? 'Instant Speed'
                    : 'Claude Model',
                  color: '#FF9D00',
                  description: `Anthropic ${displayName} reasoning model via API`,
                  contextWindow: '200K',
                  speed: isHaiku ? 'Ultra Fast' : isOpus ? 'Balanced' : 'Fast',
                  modelId: id,
                });
              }
            }
          } catch (err) {
            console.warn('Live Anthropic API models endpoint query failed:', err);
          }
        }

        // Ensure models from ant beta:models list are always present
        const canonicalClaude: AIModel[] = [
          {
            id: 'claude-opus-5',
            name: 'Claude Opus 5',
            provider: 'Anthropic',
            badge: 'Flagship 5 Series',
            color: '#FF9D00',
            description: 'Next-gen Opus 5 flagship model with 1M context, 128k output, citations, code execution & adaptive thinking',
            contextWindow: '1M',
            speed: 'Balanced',
            modelId: 'claude-opus-5',
          },
          {
            id: 'claude-sonnet-5',
            name: 'Claude Sonnet 5',
            provider: 'Anthropic',
            badge: 'Flagship 5 Series',
            color: '#FF9D00',
            description: 'Next-gen Sonnet 5 model with 1M context, 128k output & high-speed reasoning',
            contextWindow: '1M',
            speed: 'Fast',
            modelId: 'claude-sonnet-5',
          },
          {
            id: 'claude-fable-5',
            name: 'Claude Fable 5',
            provider: 'Anthropic',
            badge: 'Creative Reasoning',
            color: '#FF9D00',
            description: 'Specialized Fable 5 model optimized for expressive UI architecture, creative reasoning & adaptive thinking',
            contextWindow: '1M',
            speed: 'Fast',
            modelId: 'claude-fable-5',
          },
          {
            id: 'claude-opus-4-8',
            name: 'Claude Opus 4.8',
            provider: 'Anthropic',
            badge: 'Deep Reasoning',
            color: '#FF9D00',
            description: 'High-capacity Opus 4.8 reasoning model with 1M context window and max effort thinking',
            contextWindow: '1M',
            speed: 'Balanced',
            modelId: 'claude-opus-4-8',
          },
          {
            id: 'claude-opus-4-7',
            name: 'Claude Opus 4.7',
            provider: 'Anthropic',
            badge: 'Deep Reasoning',
            color: '#FF9D00',
            description: 'Opus 4.7 model with 1M context, structured outputs, code execution, and adaptive thinking',
            contextWindow: '1M',
            speed: 'Balanced',
            modelId: 'claude-opus-4-7',
          },
          {
            id: 'claude-sonnet-4-6',
            name: 'Claude Sonnet 4.6',
            provider: 'Anthropic',
            badge: 'Code Specialist',
            color: '#FF9D00',
            description: 'Sonnet 4.6 high-throughput code synthesis model with 1M context and 128k output',
            contextWindow: '1M',
            speed: 'Fast',
            modelId: 'claude-sonnet-4-6',
          },
          {
            id: 'claude-opus-4-6',
            name: 'Claude Opus 4.6',
            provider: 'Anthropic',
            badge: 'Deep Reasoning',
            color: '#FF9D00',
            description: 'Opus 4.6 model with 1M context window and advanced context management',
            contextWindow: '1M',
            speed: 'Balanced',
            modelId: 'claude-opus-4-6',
          },
          {
            id: 'claude-opus-4-5-20251101',
            name: 'Claude Opus 4.5',
            provider: 'Anthropic',
            badge: 'Deep Analysis',
            color: '#FF9D00',
            description: 'Opus 4.5 release with 200k context, 64k tokens output, citations & thinking',
            contextWindow: '200K',
            speed: 'Balanced',
            modelId: 'claude-opus-4-5-20251101',
          },
          {
            id: 'claude-haiku-4-5-20251001',
            name: 'Claude Haiku 4.5',
            provider: 'Anthropic',
            badge: 'Instant Speed',
            color: '#FF9D00',
            description: 'Haiku 4.5 ultra-fast low latency assistant with 200k context and 64k output',
            contextWindow: '200K',
            speed: 'Ultra Fast',
            modelId: 'claude-haiku-4-5-20251001',
          },
          {
            id: 'claude-sonnet-4-5-20250929',
            name: 'Claude Sonnet 4.5',
            provider: 'Anthropic',
            badge: 'Code Specialist',
            color: '#FF9D00',
            description: 'Sonnet 4.5 model with 1M context window, 64k output & code execution',
            contextWindow: '1M',
            speed: 'Fast',
            modelId: 'claude-sonnet-4-5-20250929',
          },
        ];

        for (const c of canonicalClaude) {
          if (!discovered.some((d) => d.modelId === c.modelId)) {
            discovered.push(c);
          }
        }
      }
    } catch (err) {
      console.warn(`Failed to dynamically query models for ${provider}:`, err);
    }

    if (discovered.length > 0) {
      // Merge unique models
      const existingIds = new Set(AVAILABLE_MODELS.map((m) => m.modelId));
      const newModels = discovered.filter((m) => !existingIds.has(m.modelId));
      if (newModels.length > 0) {
        AVAILABLE_MODELS = [...newModels, ...AVAILABLE_MODELS];
        this.notify();
      }
    }

    return discovered;
  }

  /**
   * Generates a code patch and response for an agent directive.
   * Uses only the authentication mode explicitly selected by the user.
   * Production builds never fabricate a provider response with local templates.
   */
  public static async executePrompt(
    userPrompt: string,
    currentCode: string,
    filePath = 'main.wv',
    signal?: AbortSignal
  ): Promise<AIMessage> {
    if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
    const userMsgId = `user-${Date.now()}`;
    const userMessage: AIMessage = {
      id: userMsgId,
      role: 'user',
      content: userPrompt,
      timestamp: Date.now(),
    };

    this.messages.push(userMessage);
    this.notify();

    const assistantMsgId = `agent-${Date.now()}`;
    const assistantMessage: AIMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model: this.activeModel.name,
      reasoningSteps: [
        `Target file: ${filePath}`,
        `Provider: ${this.activeModel.provider} • Model ID: ${this.activeModel.modelId}`,
        'Preparing authenticated provider request...',
      ],
      isStreaming: true,
    };

    this.messages.push(assistantMessage);
    this.notify();

    const keys = this.getApiKeys();
    const authMode = this.getAuthMode(this.activeModel.provider);
    const backendFailures: string[] = [];
    const usesAccountRuntime =
      authMode === 'oauth' &&
      agentRuntimeService.isAvailable &&
      this.activeModel.provider !== 'Ollama';

    if (usesAccountRuntime) {
      try {
        assistantMessage.reasoningSteps?.push(
          `Using the signed-in ${this.activeModel.provider} account through its official local agent runtime...`
        );
        this.notify();

        const userContent = `File: ${filePath}\n\nCurrent Weave Code:\n\`\`\`weave\n${currentCode}\n\`\`\`\n\nUser Request: ${userPrompt}\n\nReturn the complete updated file in one \`\`\`weave code block, followed by a concise explanation. Preserve working code unrelated to the request.`;
        const runtimePrompt = `${WEAVE_LANGUAGE_SPEC}\n\n${userContent}`;
        const fallbackKey = `${this.activeModel.provider}:${this.activeModel.modelId}`;
        let usesProviderDefault = this.accountModelFallbacks.has(fallbackKey);
        let rawText: string;

        if (usesProviderDefault) {
          assistantMessage.reasoningSteps?.push(
            `Using the ${this.activeModel.provider} account default because ${this.activeModel.name} is unavailable for this account...`
          );
        }

        try {
          rawText = await agentRuntimeService.execute(
            this.activeModel.provider,
            usesProviderDefault ? '' : this.activeModel.modelId,
            runtimePrompt
          );
        } catch (err: any) {
          const modelUnavailable =
            /selected .* model is unavailable|model.*(?:not found|unsupported|unavailable)|invalid.*model/i.test(
              err?.message || ''
            );
          if (!usesProviderDefault && modelUnavailable) {
            this.accountModelFallbacks.add(fallbackKey);
            usesProviderDefault = true;
            assistantMessage.reasoningSteps?.push(
              `${this.activeModel.name} is unavailable for this account; retrying with the provider's account default...`
            );
            this.notify();
            if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
            rawText = await agentRuntimeService.execute(
              this.activeModel.provider,
              '',
              runtimePrompt
            );
          } else {
            throw err;
          }
        }
        const response = this.parseLlmResponse(rawText, currentCode);
        assistantMessage.reasoningSteps?.push(
          `Received completion using ${this.activeModel.provider} account limits${
            usesProviderDefault ? ' and its account-compatible default model' : ''
          }`
        );
        assistantMessage.content = response.explanation;
        assistantMessage.isStreaming = false;
        assistantMessage.runtime = usesProviderDefault
          ? `${this.activeModel.provider} account · provider default`
          : `${this.activeModel.provider} account`;
        if (response.newCode && response.newCode !== currentCode) {
          assistantMessage.patch = {
            filePath,
            originalCode: currentCode,
            modifiedCode: response.newCode,
            summary: response.summary,
            diffLines: this.generateDiff(currentCode, response.newCode),
          };
        }
        this.notify();
        return assistantMessage;
      } catch (err: any) {
        if (signal?.aborted || err?.name === 'AbortError') {
          this.messages = this.messages.filter((message) => message.id !== assistantMsgId);
          this.notify();
          throw err;
        }
        assistantMessage.reasoningSteps?.push(
          `Account request failed: ${err?.message || 'not connected'}`
        );
        backendFailures.push(err?.message || `${this.activeModel.provider} account is not connected.`);
      }
    } else if (
      authMode === 'oauth' &&
      this.activeModel.provider !== 'Ollama' &&
      !agentRuntimeService.isAvailable
    ) {
      backendFailures.push('Account-backed agents require the Weave desktop app.');
    }

    if (
      authMode === 'api_key' &&
      agentRuntimeService.isAvailable &&
      this.activeModel.provider !== 'Ollama'
    ) {
      try {
        assistantMessage.reasoningSteps?.push(
          `Using the ${this.activeModel.provider} API key stored in the system credential manager...`
        );
        this.notify();
        const userContent = `File: ${filePath}\n\nCurrent Weave Code:\n\`\`\`weave\n${currentCode}\n\`\`\`\n\nUser Request: ${userPrompt}\n\nReturn the complete updated file in one \`\`\`weave code block, followed by a concise explanation. Preserve working code unrelated to the request.`;
        const rawText = await agentRuntimeService.executeApi(
          this.activeModel.provider,
          this.activeModel.modelId,
          `${WEAVE_LANGUAGE_SPEC}\n\n${userContent}`
        );
        const response = this.parseLlmResponse(rawText, currentCode);
        assistantMessage.reasoningSteps?.push(
          `Received completion using ${this.activeModel.provider} API billing`
        );
        assistantMessage.content = response.explanation;
        assistantMessage.isStreaming = false;
        assistantMessage.runtime = `${this.activeModel.provider} API`;
        if (response.newCode && response.newCode !== currentCode) {
          assistantMessage.patch = {
            filePath,
            originalCode: currentCode,
            modifiedCode: response.newCode,
            summary: response.summary,
            diffLines: this.generateDiff(currentCode, response.newCode),
          };
        }
        this.notify();
        return assistantMessage;
      } catch (err: any) {
        assistantMessage.reasoningSteps?.push(
          `API-key request failed: ${err?.message || 'key unavailable'}`
        );
        backendFailures.push(err?.message || `No ${this.activeModel.provider} API key is saved.`);
      }
    } else if (
      authMode === 'api_key' &&
      this.activeModel.provider !== 'Ollama' &&
      !agentRuntimeService.isAvailable &&
      !(
        (this.activeModel.provider === 'Google' && keys.gemini) ||
        (this.activeModel.provider === 'Anthropic' && keys.anthropic) ||
        (this.activeModel.provider === 'OpenAI' && keys.openai)
      )
    ) {
      backendFailures.push('No API key is configured for this provider.');
    }

    let hasLiveApiKey = false;

    if (authMode === 'api_key' && this.activeModel.provider === 'Google' && keys.gemini) hasLiveApiKey = true;
    if (authMode === 'api_key' && this.activeModel.provider === 'Anthropic' && keys.anthropic) hasLiveApiKey = true;
    if (authMode === 'api_key' && this.activeModel.provider === 'OpenAI' && keys.openai) hasLiveApiKey = true;
    if (this.activeModel.provider === 'Ollama') hasLiveApiKey = true;

    if (hasLiveApiKey) {
      try {
        assistantMessage.reasoningSteps?.push(
          `Dispatching prompt to live ${this.activeModel.provider} API (${this.activeModel.modelId})...`
        );
        this.notify();

        const response = await this.callLiveLlm(
          this.activeModel,
          userPrompt,
          currentCode,
          filePath,
          keys,
          signal
        );

        assistantMessage.reasoningSteps?.push('Received live LLM completion response');
        assistantMessage.content = response.explanation;
        assistantMessage.isStreaming = false;
        assistantMessage.runtime =
          this.activeModel.provider === 'Ollama'
            ? 'Ollama local'
            : `${this.activeModel.provider} API`;

        if (response.newCode && response.newCode !== currentCode) {
          assistantMessage.patch = {
            filePath,
            originalCode: currentCode,
            modifiedCode: response.newCode,
            summary: response.summary,
            diffLines: this.generateDiff(currentCode, response.newCode),
          };
        }

        this.notify();
        return assistantMessage;
      } catch (err: any) {
        if (signal?.aborted || err?.name === 'AbortError') {
          this.messages = this.messages.filter((message) => message.id !== assistantMsgId);
          this.notify();
          throw err;
        }
        console.warn('Live LLM request failed:', err);
        assistantMessage.reasoningSteps?.push(
          `Provider request failed: ${err?.message || 'Network error'}`
        );
        backendFailures.push(err?.message || 'The provider request failed.');
      }
    }

    if (signal?.aborted) {
      this.messages = this.messages.filter((message) => message.id !== assistantMsgId);
      this.notify();
      throw new DOMException('Request cancelled', 'AbortError');
    }

    if (!this.allowOfflineTemplates) {
      const failure = backendFailures[backendFailures.length - 1];
      const isTemporaryFailure = Boolean(
        failure && /temporar|overload|\b529\b|rate limit|\b429\b/i.test(failure)
      );
      assistantMessage.content = failure
        ? `I couldn’t reach ${this.activeModel.name}: ${failure} ${
            isTemporaryFailure
              ? 'Try again in a moment.'
              : 'Open Settings → AI Accounts to reconnect or choose API-key mode.'
          } No code was changed.`
        : `${this.activeModel.name} is not connected. Open Settings → AI Accounts and connect an account or save an API key. No code was changed.`;
      assistantMessage.reasoningSteps?.push('Stopped without generating or modifying code.');
      assistantMessage.isStreaming = false;
      assistantMessage.isError = true;
      assistantMessage.runtime = 'Not connected';
      assistantMessage.patch = undefined;
      assistantMessage.toolCalls = [];
      this.notify();
      return assistantMessage;
    }

    // Deterministic templates are test-only. They must never impersonate a provider in production.
    const { newCode, summary, explanation, reasoningSteps, extraTools } = this.synthesizeModification(
      userPrompt,
      currentCode,
      filePath
    );

    assistantMessage.reasoningSteps?.push(...reasoningSteps);
    if (extraTools) {
      assistantMessage.toolCalls = extraTools;
    }
    assistantMessage.content = explanation;
    assistantMessage.isStreaming = false;
    assistantMessage.runtime = 'Test templates';

    if (newCode !== currentCode) {
      assistantMessage.patch = {
        filePath,
        originalCode: currentCode,
        modifiedCode: newCode,
        summary,
        diffLines: this.generateDiff(currentCode, newCode),
      };
    }

    this.notify();
    return assistantMessage;
  }

  /**
   * Calls live LLM APIs across Google, Anthropic, OpenAI, or Ollama
   */
  private static async callLiveLlm(
    model: AIModel,
    prompt: string,
    currentCode: string,
    filePath: string,
    keys: { gemini?: string; anthropic?: string; openai?: string; ollamaEndpoint?: string },
    signal?: AbortSignal
  ): Promise<{ newCode: string; summary: string; explanation: string }> {
    const userContent = `File: ${filePath}\n\nCurrent Weave Code:\n\`\`\`weave\n${currentCode}\n\`\`\`\n\nUser Request: ${prompt}\n\nReturn the complete updated file in one \`\`\`weave code block, followed by a concise explanation. Preserve working code unrelated to the request.`;

    if (model.provider === 'Google') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.modelId}:generateContent?key=${keys.gemini}`;
      const res = await fetch(url, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userContent }] }],
          systemInstruction: { parts: [{ text: WEAVE_LANGUAGE_SPEC }] },
        }),
      });
      if (!res.ok) throw new Error(`Google Gemini error: ${res.status} ${res.statusText}`);
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return this.parseLlmResponse(rawText, currentCode);
    }

    if (model.provider === 'Anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': keys.anthropic || '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: model.modelId,
          max_tokens: 4096,
          system: WEAVE_LANGUAGE_SPEC,
          messages: [{ role: 'user', content: userContent }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic Claude error: ${res.status} ${res.statusText}`);
      const data = await res.json();
      const rawText = data.content?.[0]?.text || '';
      return this.parseLlmResponse(rawText, currentCode);
    }

    if (model.provider === 'OpenAI') {
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${keys.openai}`,
        },
        body: JSON.stringify({
          model: model.modelId,
          instructions: WEAVE_LANGUAGE_SPEC,
          input: userContent,
        }),
      });
      if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${res.statusText}`);
      const data = await res.json();
      const rawText =
        data.output_text ||
        data.output
          ?.flatMap((item: any) => item.content || [])
          .find((item: any) => typeof item.text === 'string')?.text ||
        '';
      return this.parseLlmResponse(rawText, currentCode);
    }

    if (model.provider === 'Ollama') {
      const endpoint = `${keys.ollamaEndpoint || 'http://localhost:11434'}/api/chat`;
      const res = await fetch(endpoint, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.modelId,
          stream: false,
          messages: [
            { role: 'system', content: WEAVE_LANGUAGE_SPEC },
            { role: 'user', content: userContent },
          ],
        }),
      });
      if (!res.ok) throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
      const data = await res.json();
      const rawText = data.message?.content || '';
      return this.parseLlmResponse(rawText, currentCode);
    }

    throw new Error(`Unsupported provider: ${model.provider}`);
  }

  /**
   * Extracts Weave code block and explanation from LLM output
   */
  private static parseLlmResponse(
    rawText: string,
    originalCode: string
  ): { newCode: string; summary: string; explanation: string } {
    const codeMatch =
      rawText.match(/```(?:weave|wv|rust|tsx|typescript)?\n([\s\S]*?)```/) ||
      rawText.match(/```([\s\S]*?)```/);

    const newCode = codeMatch ? codeMatch[1].trim() : originalCode;
    const explanation = rawText.replace(/```[\s\S]*?```/g, '').trim() || 'Code modified successfully.';
    const summary = 'Weave AI code synthesis';

    return {
      newCode: newCode || originalCode,
      summary,
      explanation,
    };
  }

  /**
   * Helper that understands Weave syntax and synthesizes changes offline.
   */
  private static synthesizeModification(
    prompt: string,
    code: string,
    _filePath: string
  ): {
    newCode: string;
    summary: string;
    explanation: string;
    reasoningSteps: string[];
    extraTools?: AIToolCall[];
  } {
    const lower = prompt.toLowerCase();
    let newCode = code;
    let summary = 'Updated Weave Component';
    let explanation = '';
    const reasoningSteps: string[] = [];
    const extraTools: AIToolCall[] = [];

    if (lower.includes('explain') || lower.includes('what does') || lower.includes('walk me through')) {
      const componentNames = [...code.matchAll(/component\s+([A-Za-z_][A-Za-z0-9_]*)/g)].map((match) => match[1]);
      const storeNames = [...code.matchAll(/store\s+([A-Za-z_][A-Za-z0-9_]*)/g)].map((match) => match[1]);
      const actionCount = (code.match(/onClick\s*:/g) || []).length;
      reasoningSteps.push('Parsed component and reactive state declarations');
      reasoningSteps.push('Traced UI primitives and event handlers');
      summary = 'Explained the active Weave file';
      explanation = [
        componentNames.length > 0
          ? `This file defines the ${componentNames.join(', ')} component${componentNames.length > 1 ? 's' : ''}.`
          : 'This file contains Weave module code without a UI component declaration.',
        storeNames.length > 0
          ? `Its reactive state includes ${storeNames.join(', ')}.`
          : 'It does not declare a named reactive store.',
        actionCount > 0
          ? `The UI exposes ${actionCount} event handler${actionCount === 1 ? '' : 's'} that update state and trigger reactive rendering.`
          : 'The current UI has no click handlers.',
      ].join(' ');
    } else if (lower.includes('resource') || lower.includes('fetch') || lower.includes('api') || lower.includes('bind')) {
      reasoningSteps.push('Synthesizing HTTP data fetching primitive resource...');
      reasoningSteps.push('Adding conditional loading and error UI branch...');

      extraTools.push({
        tool: 'inject_resource_block',
        args: { resourceName: 'users', endpoint: 'https://jsonplaceholder.typicode.com/users' },
        result: 'Resource block injected with async state tracking',
        status: 'success',
      });

      if (!code.includes('resource')) {
        const themeOrStart = code.includes('theme')
          ? code.indexOf('component')
          : 0;

        const resourceSnippet = `// REST API Resource for data fetching\nresource users = fetch("https://jsonplaceholder.typicode.com/users");\n\n`;
        newCode = code.slice(0, themeOrStart) + resourceSnippet + code.slice(themeOrStart);
      }

      if (!code.includes('users.loading') && newCode.includes('ui {')) {
        newCode = newCode.replace(
          /ui\s*\{\s*VStack\s*\(([^)]*)\)\s*\{/,
          `ui {\n        VStack($1) {\n            if (users.loading) {\n                Text("Loading data from API...")\n            } else {\n                Text("Data loaded successfully!")\n            }`
        );
      }

      summary = 'Added REST API Resource and reactive data binding';
      explanation = `I have injected an asynchronous \`resource users = fetch(...)\` definition and updated the UI tree with reactive \`if (users.loading)\` branch handling.`;
    } else if (lower.includes('theme') || lower.includes('color') || lower.includes('dark') || lower.includes('neon') || lower.includes('style')) {
      reasoningSteps.push('Defining design token theme block...');
      reasoningSteps.push('Applying theme properties to UI primitives...');

      extraTools.push({
        tool: 'generate_theme_tokens',
        args: { themeName: 'StudioTheme', colors: ['primary: #00E5FF', 'accent: #FF9D00'] },
        result: 'Theme block created and linked to component styles',
        status: 'success',
      });

      const themeSnippet = `theme StudioTheme {
    colors: {
        primary: "#00E5FF";
        accent: "#FF9D00";
        bg: "#0a0c10";
        cardBg: "#141824";
        text: "#f8fafc";
    };
    spacing: {
        sm: 8;
        md: 16;
        lg: 24;
    };
}\n\n`;

      if (!code.includes('theme')) {
        newCode = themeSnippet + code;
      }

      if (newCode.includes('VStack')) {
        newCode = newCode.replace(
          /VStack\s*\([^)]*\)/,
          `VStack(padding: StudioTheme.spacing.lg, bg: StudioTheme.colors.cardBg, gap: StudioTheme.spacing.md)`
        );
      }

      summary = 'Created StudioTheme tokens and styled UI primitives';
      explanation = `I added \`theme StudioTheme\` featuring Cyan (\`#00E5FF\`) and Amber (\`#FF9D00\`) brand palettes and mapped them to the layout styles.`;
    } else if (lower.includes('reset') || lower.includes('counter') || lower.includes('button') || lower.includes('increment')) {
      reasoningSteps.push('Refactoring reactive store mutations...');
      reasoningSteps.push('Verifying compound assignment operators...');

      if (!code.includes('Reset') && code.includes('HStack')) {
        newCode = newCode.replace(
          /HStack\s*\([^)]*\)\s*\{([\s\S]*?)\}/,
          (match) => {
            if (match.includes('Reset')) return match;
            return match.replace(
              /\}\s*$/,
              `    Button("Reset", onClick: fn() {\n                    count = 0;\n                })\n            }`
            );
          }
        );
      }

      summary = 'Updated reactive action handlers and buttons';
      explanation = `I synthesized button event handlers with compound assignments and added action triggers to the component.`;
    } else {
      reasoningSteps.push(`Interpreting directive: "${prompt}"...`);
      reasoningSteps.push('Synthesizing Weave component AST...');

      if (lower.includes('todo') || lower.includes('list')) {
        newCode = `theme TodoTheme {
    colors: {
        primary: "#00E5FF";
        bg: "#0a0c10";
    };
    spacing: {
        lg: 24;
    };
}

component TodoApp {
    store count = 0;

    ui {
        VStack(padding: TodoTheme.spacing.lg, bg: TodoTheme.colors.bg, gap: 16) {
            Text("Weave Todo Studio");
            TextField(placeholder: "What needs to be woven?");
            HStack(gap: 8) {
                Button("Add Task", onClick: fn() {
                    count += 1;
                });
                Button("Clear", onClick: fn() {
                    count = 0;
                });
            }
            Text("Total Tasks: " + count);
        }
    }
}
`;
        summary = 'Generated TodoApp component with store state and input field';
        explanation = `I scaffolded a complete \`TodoApp\` component with responsive layout, \`TextField\`, interactive buttons, and theme integration.`;
      } else {
        if (code.includes('component')) {
          newCode = code.replace(/Text\("([^"]+)"\)/, `Text("$1 ✨ [AI Enhanced]")`);
          summary = `Applied AI enhancements to UI text`;
          explanation = `I analyzed your Weave code and applied the requested modifications to your component structure.`;
        } else {
          newCode = `component App {
    store count = 0;

    ui {
        VStack(gap: 12, padding: 16) {
            Text("Weave Studio Component");
            HStack(gap: 8) {
                Button("Click Me", onClick: fn() {
                    count += 1;
                });
            }
            Text("Count: " + count);
        }
    }
}
`;
          summary = 'Generated base Weave component';
          explanation = `I generated a new interactive Weave component with reactive state.`;
        }
      }
    }

    return {
      newCode,
      summary,
      explanation,
      reasoningSteps,
      extraTools,
    };
  }

  /**
   * Generates line-by-line diff for visualization.
   */
  private static generateDiff(oldCode: string, newCode: string) {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    const diff: { type: 'add' | 'del' | 'same'; text: string }[] = [];

    let i = 0;
    let j = 0;
    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        diff.push({ type: 'same', text: oldLines[i] });
        i++;
        j++;
      } else if (j < newLines.length && (!oldLines.includes(newLines[j]) || i >= oldLines.length)) {
        diff.push({ type: 'add', text: newLines[j] });
        j++;
      } else if (i < oldLines.length) {
        diff.push({ type: 'del', text: oldLines[i] });
        i++;
      }
    }
    return diff.slice(0, 40);
  }
}

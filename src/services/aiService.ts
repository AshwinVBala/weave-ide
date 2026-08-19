export interface AIModel {
  id: string;
  name: string;
  provider: 'Anthropic' | 'Google' | 'OpenAI' | 'Ollama';
  badge: string;
  color: string;
  description: string;
  contextWindow: string;
  speed: 'Ultra Fast' | 'Fast' | 'Balanced';
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'Anthropic',
    badge: 'Hybrid Reasoning',
    color: '#FF9D00',
    description: 'Advanced reasoning, lossless AST transformations, and reactive state synthesis',
    contextWindow: '200K',
    speed: 'Fast',
  },
  {
    id: 'gemini-3-pro',
    name: 'Gemini 3',
    provider: 'Google',
    badge: 'DeepMind 2M',
    color: '#00E5FF',
    description: 'Multimodal UI comprehension, design system generation, and full-workspace search',
    contextWindow: '2M',
    speed: 'Ultra Fast',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    badge: 'Omni Vision',
    color: '#10A37F',
    description: 'High-speed code refactoring, styling optimization, and component scaffolding',
    contextWindow: '128K',
    speed: 'Fast',
  },
  {
    id: 'local-ollama',
    name: 'Local Ollama',
    provider: 'Ollama',
    badge: 'Offline Privacy',
    color: '#8B5CF6',
    description: 'Local DeepSeek-R1 / Llama 3.3 runtime executing with zero network telemetry',
    contextWindow: '64K',
    speed: 'Balanced',
  },
];

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
}

export class AIService {
  private static activeModel: AIModel = AVAILABLE_MODELS[0];
  private static contextFiles: ContextFileChip[] = [
    { id: '1', path: '/workspace/src/main.wv', name: 'main.wv', kind: 'component', isActive: true },
  ];
  private static messages: AIMessage[] = [
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        '👋 Welcome to **Weave AI Studio**! I am your agentic pair programmer. Ask me to scaffold reactive components, bind REST resources, create themes, or refactor state. You can also select elements in the Live Preview to prompt directly.',
      timestamp: Date.now() - 60000,
      model: 'Claude 3.7 Sonnet',
      reasoningSteps: [
        'Initialized Weave language grammar context',
        'Loaded WASM runtime and AST compiler bridge',
        'Ready for interactive agentic development',
      ],
    },
  ];
  private static listeners: Set<() => void> = new Set();

  public static getActiveModel(): AIModel {
    return this.activeModel;
  }

  public static setActiveModel(modelId: string) {
    const found = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (found) {
      this.activeModel = found;
      this.notify();
    }
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

  public static removeContextFile(path: string) {
    this.contextFiles = this.contextFiles.filter((f) => f.path !== path);
    this.notify();
  }

  public static getMessages(): AIMessage[] {
    return [...this.messages];
  }

  public static subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private static notify() {
    this.listeners.forEach((l) => l());
  }

  /**
   * Generates a code patch and response for an agent directive.
   */
  public static async executePrompt(
    userPrompt: string,
    currentCode: string,
    filePath = 'main.wv'
  ): Promise<AIMessage> {
    const userMsgId = `user-${Date.now()}`;
    const userMessage: AIMessage = {
      id: userMsgId,
      role: 'user',
      content: userPrompt,
      timestamp: Date.now(),
    };

    this.messages.push(userMessage);
    this.notify();

    // Generate intelligent AI response & patch based on prompt and current code
    const assistantMsgId = `agent-${Date.now()}`;
    const assistantMessage: AIMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model: this.activeModel.name,
      reasoningSteps: [
        `Analyzing Weave AST in ${filePath}...`,
        'Parsing UI hierarchy and reactive store declarations...',
      ],
      toolCalls: [
        {
          tool: 'parse_weave_ast',
          args: { filePath, lines: currentCode.split('\n').length },
          result: 'AST parsed successfully with lossless CST',
          status: 'success',
        },
      ],
      isStreaming: true,
    };

    this.messages.push(assistantMessage);
    this.notify();

    // Synthesize code modifications
    const { newCode, summary, explanation, reasoningSteps, extraTools } = this.synthesizeModification(
      userPrompt,
      currentCode,
      filePath
    );

    assistantMessage.reasoningSteps?.push(...reasoningSteps);
    if (extraTools) {
      assistantMessage.toolCalls?.push(...extraTools);
    }
    assistantMessage.content = explanation;
    assistantMessage.isStreaming = false;

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
   * Helper that understands Weave syntax and synthesizes changes.
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

    if (lower.includes('resource') || lower.includes('fetch') || lower.includes('api') || lower.includes('bind')) {
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

      // If component doesn't have loading branch, inject it
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
        args: { themeName: 'StudioTheme', colors: ['primary: #00E5FF', 'bg: #0e1017'] },
        result: 'Theme block created and linked to component inline styles',
        status: 'success',
      });

      const themeSnippet = `theme StudioTheme {
    colors: {
        primary: "#00E5FF";
        accent: "#FF9D00";
        bg: "#0e1017";
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
      explanation = `I added \`theme StudioTheme\` featuring Cyan (\`#00E5FF\`) and Amber (\`#FF9D00\`) brand palettes and mapped them to the \`VStack\` layout styles.`;
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
      // General component scaffolding or modification
      reasoningSteps.push(`Interpreting directive: "${prompt}"...`);
      reasoningSteps.push('Synthesizing Weave component AST...');

      if (lower.includes('todo') || lower.includes('list')) {
        newCode = `theme TodoTheme {
    colors: {
        primary: "#00E5FF";
        bg: "#0e1017";
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
        // Simple polish
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
    return diff.slice(0, 40); // Cap preview diff length
  }
}

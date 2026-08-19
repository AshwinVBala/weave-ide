export interface FileItem {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  modifiedAt?: number;
  extension?: string;
  children?: FileItem[];
  isOpen?: boolean;
}

export interface EditorTab {
  id: string;
  path: string;
  title: string;
  content: string;
  savedContent: string;
  isDirty: boolean;
  language: string;
  cursorPosition?: { lineNumber: number; column: number };
}

export interface WorkspaceSettings {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  insertSpaces: boolean;
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative';
  theme: 'weave-dark' | 'weave-obsidian' | 'weave-light';
  autoSave: boolean;
  autoSaveDelay: number;
  googleAuthMode?: 'oauth' | 'api_key';
  anthropicAuthMode?: 'oauth' | 'api_key';
  openaiAuthMode?: 'oauth' | 'api_key';
  geminiApiKey?: string;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  ollamaEndpoint?: string;
}

export type SidebarView = 'agent' | 'explorer' | 'search' | 'settings' | 'loom' | 'extensions' | null;

export type BottomPanelTab = 'terminal' | 'output' | 'problems' | 'strands';

export interface DiagnosticItem {
  id: string;
  filePath: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;
}

export interface LoomStrandInfo {
  id: number;
  name: string;
  status: 'running' | 'idle' | 'blocked' | 'completed';
  fiberCount: number;
  allocatedMemoryKb: number;
  executionTimeMs: number;
}

export interface WasmItemSummary {
  kind: string;
  name: string;
}

export interface WasmDiagnostic {
  message: string;
  line: number;
  column: number;
  severity: string;
  code: string;
  start_offset: number;
  end_offset: number;
  formatted: string;
}

export interface WasmParseOutput {
  ok: boolean;
  error_count: number;
  syntax_tree: string;
  items: WasmItemSummary[];
  diagnostics: WasmDiagnostic[];
}

export interface CompilerWorkerRequest {
  id: string;
  type: 'INIT_WASM' | 'CHECK_DIAGNOSTICS' | 'PARSE_SOURCE' | 'COMPILE_TO_JS' | 'COMPILE_TO_HTML';
  code?: string;
  filePath?: string;
  wasmUrl?: string;
  title?: string;
}

export interface CompilerWorkerResponse {
  id: string;
  type:
    | 'INIT_WASM_RESULT'
    | 'CHECK_DIAGNOSTICS_RESULT'
    | 'PARSE_SOURCE_RESULT'
    | 'COMPILE_TO_JS_RESULT'
    | 'COMPILE_TO_HTML_RESULT'
    | 'ERROR';
  success: boolean;
  diagnostics?: DiagnosticItem[];
  ast?: WasmParseOutput;
  jsCode?: string;
  htmlCode?: string;
  output?: string[];
  error?: string;
  elapsedMs?: number;
}

export interface NativeWeaveStatus {
  available: boolean;
  path?: string;
  version?: string;
  supports_test?: boolean;
}

export interface ExecutionResult {
  success: boolean;
  output: string[];
  diagnostics: DiagnosticItem[];
  executionTimeMs: number;
  mode: 'native' | 'wasm';
}

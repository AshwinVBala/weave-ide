import React, { useRef, useEffect, useState, useCallback } from 'react';
import Editor, { OnMount, BeforeMount, Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { EditorTab, WorkspaceSettings, DiagnosticItem, WasmParseOutput } from '../../types';
import { registerWeaveLanguage } from '../../monaco/registerWeave';
import { WEAVE_LANGUAGE_ID } from '../../monaco/weaveLanguage';
import { wasmCompilerBridge } from '../../services/wasmCompilerBridge';
import { AIService, AIPatch } from '../../services/aiService';
import { InlinePromptBar } from './InlinePromptBar';
import { InlineDiffReview } from './InlineDiffReview';

interface MonacoEditorProps {
  tab: EditorTab;
  settings: WorkspaceSettings;
  onChange: (value: string) => void;
  onSave: () => void;
  onCursorChange?: (lineNumber: number, column: number) => void;
  onDiagnosticsChange?: (diagnostics: DiagnosticItem[]) => void;
  onAstChange?: (ast: WasmParseOutput) => void;
  pendingPatch?: AIPatch | null;
  onAcceptPatch?: () => void;
  onRejectPatch?: () => void;
  navigationTarget?: { lineNumber: number; column: number; requestId: number } | null;
  onNavigationHandled?: (requestId: number) => void;
}

const MONACO_LANGUAGE_BY_EXTENSION: Record<string, string> = {
  wv: WEAVE_LANGUAGE_ID,
  weave: WEAVE_LANGUAGE_ID,
  yaml: 'yaml',
  yml: 'yaml',
  json: 'json',
  jsonc: 'json',
  md: 'markdown',
  markdown: 'markdown',
  toml: 'ini',
  ini: 'ini',
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  xml: 'xml',
  svg: 'xml',
  py: 'python',
  rs: 'rust',
  go: 'go',
  java: 'java',
  c: 'c',
  h: 'cpp',
  cc: 'cpp',
  cpp: 'cpp',
  hpp: 'cpp',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  sql: 'sql',
};

export function getEditorLanguage(filePath: string, fallbackLang = '') {
  const fileName = filePath.split(/[\\/]/).pop()?.toLowerCase() || '';
  if (fileName === 'dockerfile') return 'dockerfile';
  const extension = fileName.includes('.') ? fileName.split('.').pop() || '' : '';
  return MONACO_LANGUAGE_BY_EXTENSION[extension]
    || MONACO_LANGUAGE_BY_EXTENSION[fallbackLang.toLowerCase()]
    || 'plaintext';
}

export const revealEditorLocation = (
  editorInstance: Pick<editor.IStandaloneCodeEditor, 'setPosition' | 'revealPositionInCenter' | 'focus'>,
  lineNumber: number,
  column = 1
) => {
  const position = { lineNumber: Math.max(1, lineNumber), column: Math.max(1, column) };
  editorInstance.setPosition(position);
  editorInstance.revealPositionInCenter(position);
  editorInstance.focus();
};

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  tab,
  settings,
  onChange,
  onSave,
  onCursorChange,
  onDiagnosticsChange,
  onAstChange,
  pendingPatch: externalPatch,
  onAcceptPatch,
  onRejectPatch,
  navigationTarget,
  onNavigationHandled,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const debounceTimerRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const lastNavigationRequestRef = useRef<number | null>(null);

  // Inline Cmd+K Prompt Bar State
  const [isInlinePromptOpen, setIsInlinePromptOpen] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [currentCursorLine, setCurrentCursorLine] = useState(1);
  const [selectedText, setSelectedText] = useState('');

  // Local pending patch state if not controlled externally
  const [localPatch, setLocalPatch] = useState<AIPatch | null>(null);
  const activePatch = externalPatch !== undefined ? externalPatch : localPatch;

  const handleBeforeMount: BeforeMount = (monaco) => {
    monacoRef.current = monaco;
    registerWeaveLanguage(monaco);
  };

  /**
   * Request diagnostics and AST from background WASM Web Worker
   */
  const triggerWasmAnalysis = useCallback(
    async (code: string, filePath: string) => {
      const isWeave = filePath.endsWith('.wv') || filePath.endsWith('.weave');
      if (!isWeave) return;

      try {
        const diags = await wasmCompilerBridge.checkDiagnostics(code, filePath);

        if (monacoRef.current && editorRef.current) {
          const model = editorRef.current.getModel();
          if (model && model.uri.path === filePath) {
            const markers: editor.IMarkerData[] = diags.map((d) => ({
              severity:
                d.severity === 'warning'
                  ? monacoRef.current!.MarkerSeverity.Warning
                  : d.severity === 'info'
                  ? monacoRef.current!.MarkerSeverity.Info
                  : monacoRef.current!.MarkerSeverity.Error,
              message: d.message,
              startLineNumber: d.line || 1,
              startColumn: d.column || 1,
              endLineNumber: d.line || 1,
              endColumn: (d.column || 1) + 8,
              source: 'weave-wasm',
            }));
            monacoRef.current.editor.setModelMarkers(model, 'weave-wasm', markers);
          }
        }

        if (onDiagnosticsChange) {
          onDiagnosticsChange(diags);
        }

        if (onAstChange) {
          const ast = await wasmCompilerBridge.parseSource(code, filePath);
          onAstChange(ast);
        }
      } catch (err) {
        console.warn('[MonacoEditor] WASM real-time analysis error:', err);
      }
    },
    [onDiagnosticsChange, onAstChange]
  );

  /**
   * Updates line decorations for pending AI code diffs
   */
  const updateDiffDecorations = useCallback(
    (patch: AIPatch | null) => {
      if (!editorRef.current || !monacoRef.current) return;

      if (!patch || !patch.modifiedCode) {
        // Clear decorations
        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
        return;
      }

      const originalLines = (patch.originalCode || tab.content).split('\n');
      const modifiedLines = patch.modifiedCode.split('\n');
      const newDecorations: editor.IModelDeltaDecoration[] = [];

      // Identify modified or added line ranges
      const maxLines = Math.max(originalLines.length, modifiedLines.length);
      for (let i = 0; i < maxLines; i++) {
        const origLine = originalLines[i];
        const modLine = modifiedLines[i];

        if (origLine !== modLine) {
          const lineNum = Math.min(i + 1, originalLines.length || 1);
          newDecorations.push({
            range: new monacoRef.current.Range(lineNum, 1, lineNum, 1),
            options: {
              isWholeLine: true,
              className: 'monaco-diff-line-add',
              linesDecorationsClassName: 'monaco-diff-gutter-add',
              overviewRuler: {
                color: '#10b981',
                position: monacoRef.current.editor.OverviewRulerLane.Right,
              },
            },
          });
        }
      }

      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        newDecorations
      );
    },
    [tab.content]
  );

  useEffect(() => {
    updateDiffDecorations(activePatch);
  }, [activePatch, updateDiffDecorations]);

  const applyNavigationTarget = useCallback((target: NonNullable<typeof navigationTarget>) => {
    if (!editorRef.current || lastNavigationRequestRef.current === target.requestId) return;
    lastNavigationRequestRef.current = target.requestId;
    revealEditorLocation(editorRef.current, target.lineNumber, target.column);
    onNavigationHandled?.(target.requestId);
  }, [onNavigationHandled]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    registerWeaveLanguage(monaco);
    monaco.editor.setTheme(settings.theme);

    // Cmd+S / Ctrl+S Save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave();
    });

    // Cmd+K / Ctrl+K Inline AI Prompt Bar
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      const selection = editor.getSelection();
      const model = editor.getModel();
      if (selection && model) {
        const text = model.getValueInRange(selection);
        setSelectedText(text);
      }
      setIsInlinePromptOpen(true);
    });

    // Track cursor changes
    editor.onDidChangeCursorPosition((e) => {
      setCurrentCursorLine(e.position.lineNumber);
      if (onCursorChange) {
        onCursorChange(e.position.lineNumber, e.position.column);
      }
    });

    triggerWasmAnalysis(tab.content, tab.path);
    if (navigationTarget) {
      applyNavigationTarget(navigationTarget);
    } else {
      editor.focus();
    }
  };

  useEffect(() => {
    if (!navigationTarget || !editorRef.current) return;
    applyNavigationTarget(navigationTarget);
  }, [navigationTarget, applyNavigationTarget]);

  // Re-run WASM analysis on content change
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      triggerWasmAnalysis(tab.content, tab.path);
    }, 150);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [tab.content, tab.path, triggerWasmAnalysis]);

  // Handle Inline Cmd+K Prompt Submission
  const handleInlinePromptSubmit = async (promptText: string) => {
    setIsGeneratingCode(true);
    try {
      const response = await AIService.executePrompt(promptText, tab.content, tab.path);
      if (response.patch) {
        setLocalPatch(response.patch);
      }
      setIsInlinePromptOpen(false);
    } catch (err) {
      console.error('Failed to generate inline code:', err);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleAcceptDiff = () => {
    if (onAcceptPatch) {
      onAcceptPatch();
    } else if (localPatch) {
      onChange(localPatch.modifiedCode);
      setLocalPatch(null);
    }
  };

  const handleRejectDiff = () => {
    if (onRejectPatch) {
      onRejectPatch();
    } else if (localPatch) {
      onChange(localPatch.originalCode);
      setLocalPatch(null);
    }
  };

  // Determine Monaco language identifier
  const language = getEditorLanguage(tab.path, tab.language);

  return (
    <div
      className={`flex-1 w-full h-full relative overflow-hidden bg-[#090a0f] ${
        settings.theme === 'weave-obsidian' ? 'weave-editor-obsidian-glow' : ''
      }`}
      data-testid="monaco-editor-container"
      data-editor-theme={settings.theme}
    >
      {/* Inline Cmd+K Floating Prompt Bar */}
      <InlinePromptBar
        isOpen={isInlinePromptOpen}
        onClose={() => setIsInlinePromptOpen(false)}
        onSubmit={handleInlinePromptSubmit}
        isGenerating={isGeneratingCode}
        activeFilePath={tab.path}
        selectedText={selectedText}
        lineNumber={currentCursorLine}
      />

      {/* Inline Live Diff Review Floating Toolbar */}
      {activePatch && (
        <InlineDiffReview
          patch={activePatch}
          onAccept={handleAcceptDiff}
          onReject={handleRejectDiff}
          filePath={tab.path}
        />
      )}

      <Editor
        height="100%"
        width="100%"
        path={tab.path}
        language={language}
        value={tab.content}
        theme={settings.theme}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        onChange={(val) => {
          const newVal = val || '';
          onChange(newVal);
        }}
        options={{
          fontSize: settings.fontSize,
          fontFamily: settings.fontFamily,
          fontLigatures: true,
          tabSize: settings.tabSize,
          insertSpaces: settings.insertSpaces,
          wordWrap: settings.wordWrap,
          minimap: { enabled: settings.minimap },
          lineNumbers: settings.lineNumbers,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          renderLineHighlight: 'all',
          bracketPairColorization: { enabled: true },
          padding: { top: 10, bottom: 10 },
          fixedOverflowWidgets: true,
          renderWhitespace: 'selection',
          guides: {
            indentation: true,
            bracketPairs: true,
          },
        }}
      />
    </div>
  );
};

export default MonacoEditor;

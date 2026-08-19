import React, { useRef, useEffect, useCallback } from 'react';
import Editor, { OnMount, BeforeMount, Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { EditorTab, WorkspaceSettings, DiagnosticItem, WasmParseOutput } from '../../types';
import { registerWeaveLanguage } from '../../monaco/registerWeave';
import { WEAVE_LANGUAGE_ID } from '../../monaco/weaveLanguage';
import { wasmCompilerBridge } from '../../services/wasmCompilerBridge';

interface MonacoEditorProps {
  tab: EditorTab;
  settings: WorkspaceSettings;
  onChange: (value: string) => void;
  onSave: () => void;
  onCursorChange?: (lineNumber: number, column: number) => void;
  onDiagnosticsChange?: (diagnostics: DiagnosticItem[]) => void;
  onAstChange?: (ast: WasmParseOutput) => void;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  tab,
  settings,
  onChange,
  onSave,
  onCursorChange,
  onDiagnosticsChange,
  onAstChange,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const debounceTimerRef = useRef<any>(null);

  const handleBeforeMount: BeforeMount = (monaco) => {
    monacoRef.current = monaco;
    registerWeaveLanguage(monaco);
  };

  /**
   * Request diagnostics and AST from the background WASM Web Worker
   * without blocking the main UI thread.
   */
  const triggerWasmAnalysis = useCallback(
    async (code: string, filePath: string) => {
      const isWeave = filePath.endsWith('.wv') || filePath.endsWith('.weave');
      if (!isWeave) return;

      try {
        // Asynchronously check diagnostics in Web Worker
        const diags = await wasmCompilerBridge.checkDiagnostics(code, filePath);

        // Update Monaco Editor markers
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

        // Asynchronously generate AST in Web Worker
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

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    registerWeaveLanguage(monaco);

    // Set active theme
    monaco.editor.setTheme(settings.theme);

    // Register Save command shortcut (Ctrl+S / Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave();
    });

    // Track cursor changes
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        onCursorChange(e.position.lineNumber, e.position.column);
      }
    });

    // Initial WASM analysis
    triggerWasmAnalysis(tab.content, tab.path);

    editor.focus();
  };

  // Re-run WASM analysis when switching tabs or when content updates
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

  // Determine Monaco language identifier
  const getLanguage = (filePath: string, fallbackLang: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (ext === 'wv' || ext === 'weave') return WEAVE_LANGUAGE_ID;
    if (ext === 'json') return 'json';
    if (ext === 'md') return 'markdown';
    if (ext === 'toml') return 'ini';
    if (ext === 'ts' || ext === 'tsx') return 'typescript';
    if (ext === 'js' || ext === 'jsx') return 'javascript';
    if (ext === 'rs') return 'rust';
    return fallbackLang || 'plaintext';
  };

  const language = getLanguage(tab.path, tab.language);

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden" data-testid="monaco-editor-container">
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
          fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
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

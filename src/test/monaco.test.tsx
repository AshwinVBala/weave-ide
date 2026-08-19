import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WEAVE_LANGUAGE_ID, weaveLanguageTokens } from '../monaco/weaveLanguage';
import { weaveLanguageConfig } from '../monaco/weaveConfiguration';
import { weaveDarkTheme, weaveObsidianTheme, weaveLightTheme } from '../monaco/weaveThemes';
import { registerWeaveLanguage } from '../monaco/registerWeave';
import { getEditorLanguage, MonacoEditor } from '../components/Editor/MonacoEditor';
import { DEFAULT_SETTINGS } from '../App';
import { EditorTab } from '../types';

describe('Monaco Weave (.wv) Language & Tokens Tests', () => {
  it('maps YAML and unknown files to safe bundled editor languages', () => {
    expect(getEditorLanguage('/project/.github/workflows/release.yml', 'yml')).toBe('yaml');
    expect(getEditorLanguage('/project/config.yaml', 'yaml')).toBe('yaml');
    expect(getEditorLanguage('/project/notes.unknown', 'unknown')).toBe('plaintext');
  });

  it('defines the correct Weave language ID and token rules', () => {
    expect(WEAVE_LANGUAGE_ID).toBe('weave');
    expect(weaveLanguageTokens.tokenPostfix).toBe('.wv');

    // Verify key Weave concurrency & actor keywords
    const keywords = weaveLanguageTokens.keywords as string[];
    expect(keywords).toContain('fn');
    expect(keywords).toContain('strand');
    expect(keywords).toContain('loom');
    expect(keywords).toContain('pattern');
    expect(keywords).toContain('weave');
    expect(keywords).toContain('async');
    expect(keywords).toContain('await');
    expect(keywords).toContain('match');

    // Verify Weave primitive and concurrency types
    const types = weaveLanguageTokens.typeKeywords as string[];
    expect(types).toContain('i32');
    expect(types).toContain('f64');
    expect(types).toContain('str');
    expect(types).toContain('String');
    expect(types).toContain('Loom');
    expect(types).toContain('Strand');
    expect(types).toContain('Channel');
    expect(types).toContain('Task');

    // Verify Weave custom stream / pipeline operators
    const ops = weaveLanguageTokens.operators as string[];
    expect(ops).toContain('~>');
    expect(ops).toContain('<~');
    expect(ops).toContain('|>');
    expect(ops).toContain('->');
    expect(ops).toContain('=>');
  });

  it('configures Weave language auto-closing pairs and comments', () => {
    expect(weaveLanguageConfig.comments?.lineComment).toBe('//');
    expect(weaveLanguageConfig.brackets).toEqual([
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ]);
  });

  it('provides rich custom Monaco themes for Weave', () => {
    expect(weaveDarkTheme.rules.some((r) => r.token === 'keyword' && r.foreground === 'e5a443')).toBe(true);
    expect(weaveDarkTheme.rules.some((r) => r.token === 'type' && r.foreground === '56b6c2')).toBe(true);
    expect(weaveDarkTheme.rules.some((r) => r.token === 'annotation' && r.foreground === 'c678dd')).toBe(true);

    expect(weaveObsidianTheme.base).toBe('vs-dark');
    expect(weaveLightTheme.base).toBe('vs');
  });

  it('registers language, Monarch tokenizer, themes, snippets, and hover docs with Monaco', () => {
    const mockMonaco = {
      languages: {
        register: vi.fn(),
        setMonarchTokensProvider: vi.fn(),
        setLanguageConfiguration: vi.fn(),
        registerCompletionItemProvider: vi.fn(),
        registerHoverProvider: vi.fn(),
        CompletionItemKind: { Snippet: 27 },
        CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
      },
      editor: {
        defineTheme: vi.fn(),
        setTheme: vi.fn(),
      },
      Range: class {
        constructor(public startLine: number, public startCol: number, public endLine: number, public endCol: number) {}
      },
    };

    registerWeaveLanguage(mockMonaco as any);

    expect(mockMonaco.languages.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'weave',
        extensions: ['.wv', '.weave'],
      })
    );
    expect(mockMonaco.languages.setMonarchTokensProvider).toHaveBeenCalledWith('weave', weaveLanguageTokens);
    expect(mockMonaco.languages.setLanguageConfiguration).toHaveBeenCalledWith('weave', weaveLanguageConfig);
    expect(mockMonaco.editor.defineTheme).toHaveBeenCalledWith('weave-dark', weaveDarkTheme);
    expect(mockMonaco.editor.defineTheme).toHaveBeenCalledWith('weave-obsidian', weaveObsidianTheme);
    expect(mockMonaco.editor.defineTheme).toHaveBeenCalledWith('weave-light', weaveLightTheme);
    expect(mockMonaco.languages.registerCompletionItemProvider).toHaveBeenCalled();
    expect(mockMonaco.languages.registerHoverProvider).toHaveBeenCalled();
  });

  it('renders MonacoEditor component for .wv files with weave language', () => {
    const sampleTab: EditorTab = {
      id: 'tab-1',
      path: '/workspace/src/main.wv',
      title: 'main.wv',
      content: 'fn main() { io::println("hello"); }',
      savedContent: 'fn main() { io::println("hello"); }',
      isDirty: false,
      language: 'weave',
    };

    render(
      <MonacoEditor
        tab={sampleTab}
        settings={DEFAULT_SETTINGS}
        onChange={() => {}}
        onSave={() => {}}
      />
    );

    const monacoWrapper = screen.getByTestId('mock-monaco-editor');
    expect(monacoWrapper).toBeInTheDocument();
    expect(monacoWrapper).toHaveAttribute('data-language', 'weave');
  });

  it('enables the text glow wrapper only for the Obsidian theme', () => {
    const sampleTab: EditorTab = {
      id: 'tab-glow',
      path: '/workspace/src/glow.wv',
      title: 'glow.wv',
      content: 'component Glow {}',
      savedContent: 'component Glow {}',
      isDirty: false,
      language: 'weave',
    };
    const { rerender } = render(
      <MonacoEditor
        tab={sampleTab}
        settings={{ ...DEFAULT_SETTINGS, theme: 'weave-obsidian' }}
        onChange={() => {}}
        onSave={() => {}}
      />
    );

    const container = screen.getByTestId('monaco-editor-container');
    expect(container).toHaveClass('weave-editor-obsidian-glow');
    expect(container).toHaveAttribute('data-editor-theme', 'weave-obsidian');

    rerender(
      <MonacoEditor
        tab={sampleTab}
        settings={{ ...DEFAULT_SETTINGS, theme: 'weave-dark' }}
        onChange={() => {}}
        onSave={() => {}}
      />
    );
    expect(container).not.toHaveClass('weave-editor-obsidian-glow');
  });
});

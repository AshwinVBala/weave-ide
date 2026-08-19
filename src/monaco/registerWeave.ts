import type { Monaco } from '@monaco-editor/react';
import { WEAVE_LANGUAGE_ID, weaveLanguageTokens } from './weaveLanguage';
import { weaveLanguageConfig } from './weaveConfiguration';
import { weaveDarkTheme, weaveObsidianTheme, weaveLightTheme } from './weaveThemes';

let isRegistered = false;

export function registerWeaveLanguage(monaco: Monaco) {
  if (isRegistered) return;

  // 1. Register language
  monaco.languages.register({
    id: WEAVE_LANGUAGE_ID,
    extensions: ['.wv', '.weave'],
    aliases: ['Weave', 'weave', 'wv'],
    mimetypes: ['text/x-weave'],
  });

  // 2. Set language tokens & configuration
  monaco.languages.setMonarchTokensProvider(WEAVE_LANGUAGE_ID, weaveLanguageTokens);
  monaco.languages.setLanguageConfiguration(WEAVE_LANGUAGE_ID, weaveLanguageConfig);

  // 3. Define themes
  monaco.editor.defineTheme('weave-dark', weaveDarkTheme);
  monaco.editor.defineTheme('weave-obsidian', weaveObsidianTheme);
  monaco.editor.defineTheme('weave-light', weaveLightTheme);

  // 4. Completion Item Provider
  monaco.languages.registerCompletionItemProvider(WEAVE_LANGUAGE_ID, {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions = [
        {
          label: 'fn',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'fn ${1:name}(${2:params}) -> ${3:Result<(), Error>} {\n\t${0}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Declare a standard Weave function',
          range,
        },
        {
          label: 'strand',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'strand ${1:name} {\n\tinput: Channel<${2:i32}>,\n\toutput: Channel<${3:i32}>,\n\trun: async fn(self) {\n\t\t${0}\n\t}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Declare a Weave concurrent Strand actor',
          range,
        },
        {
          label: 'loom',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'loom ${1:MainLoom} {\n\tthreads: ${2:8},\n\tstrands: [${3:WorkerStrand}],\n\torchestrate: fn(self) {\n\t\t${0}\n\t}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Declare a Weave Loom concurrency supervisor',
          range,
        },
        {
          label: 'pattern',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'pattern ${1:Name} {\n\t${2:Variant}(${3:types}),\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Define a Weave algebraic data pattern',
          range,
        },
        {
          label: 'match',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'match ${1:target} {\n\t${2:Pattern} => {\n\t\t${0}\n\t},\n\t_ => {}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Pattern match statement',
          range,
        },
        {
          label: 'weave_pipeline',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'let ${1:result} = ${2:data}\n\t|> ${3:transform_step}\n\t~> ${4:loom_channel};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Create a pipeline stream weaving data through strands',
          range,
        },
        {
          label: 'struct',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'struct ${1:Name} {\n\tpub ${2:field}: ${3:String},\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Declare a struct',
          range,
        },
        {
          label: 'test',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '@test\nfn test_${1:feature}() {\n\tassert!(${2:true});\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Weave unit test',
          range,
        },
      ];

      return { suggestions };
    },
  });

  // 5. Hover Documentation Provider
  monaco.languages.registerHoverProvider(WEAVE_LANGUAGE_ID, {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const docs: Record<string, { title: string; desc: string; signature?: string }> = {
        strand: {
          title: 'Weave Strand Actor',
          desc: 'A lightweight concurrent actor in Weave. Strands communicate exclusively via typed asynchronous channels and lock-free message passing.',
          signature: 'strand <Name> { ... }',
        },
        loom: {
          title: 'Weave Loom Orchestrator',
          desc: 'A high-level runtime supervisor that schedules strands across available CPU hardware threads with work-stealing.',
          signature: 'loom <Name> { ... }',
        },
        pattern: {
          title: 'Weave Pattern Matching',
          desc: 'First-class algebraic data types supporting structural decomposition and exhaustive compiler checking.',
          signature: 'pattern <Name> { ... }',
        },
        weave: {
          title: 'Weave Module / Pipeline',
          desc: 'Combines multiple asynchronous channels and computational strands into a single reactive execution graph.',
          signature: 'weave <Name> { ... }',
        },
        channel: {
          title: 'Weave Asynchronous Channel',
          desc: 'Bounded or unbounded FIFO message buffer for inter-strand data flow.',
          signature: 'Channel<T>',
        },
      };

      const info = docs[word.word];
      if (info) {
        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
          ),
          contents: [
            { value: `**${info.title}**` },
            ...(info.signature ? [{ value: '```weave\n' + info.signature + '\n```' }] : []),
            { value: info.desc },
          ],
        };
      }

      return null;
    },
  });

  isRegistered = true;
}

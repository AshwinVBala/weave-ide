import type { languages } from 'monaco-editor';

export const WEAVE_LANGUAGE_ID = 'weave';

export const weaveLanguageTokens: languages.IMonarchLanguage = {
  defaultToken: 'invalid',
  tokenPostfix: '.wv',

  keywords: [
    'fn',
    'let',
    'mut',
    'const',
    'struct',
    'enum',
    'impl',
    'trait',
    'type',
    'weave',
    'strand',
    'loom',
    'pattern',
    'pub',
    'use',
    'import',
    'export',
    'mod',
    'as',
    'if',
    'else',
    'match',
    'while',
    'for',
    'in',
    'loop',
    'return',
    'yield',
    'break',
    'continue',
    'guard',
    'with',
    'defer',
    'async',
    'await',
    'spawn',
    'channel',
    'select',
    'join',
    'sync',
    'atomic',
    'fiber',
    'barrier',
    'unsafe',
    'ref',
    'move',
    'borrow',
    'pin',
    'box',
    'pure',
    'dyn',
  ],

  typeKeywords: [
    'i8',
    'i16',
    'i32',
    'i64',
    'i128',
    'isize',
    'u8',
    'u16',
    'u32',
    'u64',
    'u128',
    'usize',
    'f32',
    'f64',
    'bool',
    'char',
    'str',
    'String',
    'Loom',
    'Strand',
    'Thread',
    'Fiber',
    'Pattern',
    'Channel',
    'Task',
    'Future',
    'Vec',
    'Map',
    'Set',
    'Option',
    'Result',
    'Context',
    'None',
    'Some',
    'Ok',
    'Err',
    'Self',
  ],

  constants: ['true', 'false', 'null', 'nil', 'self'],

  operators: [
    '=',
    '>',
    '<',
    '!',
    '~',
    '?',
    ':',
    '==',
    '<=',
    '>=',
    '!=',
    '&&',
    '||',
    '++',
    '--',
    '+',
    '-',
    '*',
    '/',
    '&',
    '|',
    '^',
    '%',
    '<<',
    '>>',
    '+=',
    '-=',
    '*=',
    '/=',
    '&=',
    '|=',
    '^=',
    '%=',
    '<<=',
    '>>=',
    '->',
    '=>',
    '<-',
    '::',
    '..',
    '..=',
    '~>',
    '<~',
    '|>',
  ],

  // Common regular expressions
  symbols: /[=><!~?:&|+\-*\/\^%]+/,
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
  digits: /\d+(_+\d+)*/,
  octaldigits: /[0-7]+(_+[0-7]+)*/,
  binarydigits: /[0-1]+(_+[0-1]+)*/,
  hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,

  tokenizer: {
    root: [
      // Identifiers and keywords
      [
        /[a-z_$][\w$]*/,
        {
          cases: {
            '@typeKeywords': 'type',
            '@keywords': 'keyword',
            '@constants': 'constant',
            '@default': 'identifier',
          },
        },
      ],
      [
        /[A-Z][\w$]*/,
        {
          cases: {
            '@typeKeywords': 'type',
            '@default': 'type.identifier',
          },
        },
      ],

      // Annotations / Decorators: @derive, @loom_entry, etc.
      [/@[a-zA-Z_]\w*/, 'annotation'],

      // Whitespace
      { include: '@whitespace' },

      // Delimiters and operators
      [/[{}()\[\]]/, '@brackets'],
      [/[<>](?!@symbols)/, '@brackets'],
      [
        /@symbols/,
        {
          cases: {
            '@operators': 'operator',
            '@default': '',
          },
        },
      ],

      // Numbers
      [/(@digits)[eE]([\-+]?(@digits))?/, 'number.float'],
      [/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, 'number.float'],
      [/0x(@hexdigits)/, 'number.hex'],
      [/0o(@octaldigits)/, 'number.octal'],
      [/0b(@binarydigits)/, 'number.binary'],
      [/(@digits)/, 'number'],

      // Delimiter: after number because of .\d floats
      [/[;,.]/, 'delimiter'],

      // Formatted strings f"..."
      [/f"/, { token: 'string.quote', bracket: '@open', next: '@fstring' }],

      // Raw strings r"..."
      [/r"/, { token: 'string.quote', bracket: '@open', next: '@rstring' }],

      // Regular strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-teminated string
      [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],

      // Characters
      [/'[^\\']'/, 'string.char'],
      [/(')(@escapes)(')/, ['string.char', 'string.escape', 'string.char']],
      [/'/, 'string.invalid'],
    ],

    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/\/\/\/[^\n]*/, 'comment.doc'],
      [/\/\/[^\n]*/, 'comment'],
      [/\/\*/, 'comment', '@comment'],
    ],

    comment: [
      [/[^\/*]+/, 'comment'],
      [/\/\*/, 'comment', '@push'],
      [/\*\//, 'comment', '@pop'],
      [/[\/*]/, 'comment'],
    ],

    string: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
    ],

    fstring: [
      [/[^\\"{]+/, 'string'],
      [/\{/, { token: 'delimiter.curly', bracket: '@open', next: '@fstring_expr' }],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
    ],

    fstring_expr: [
      [/\}/, { token: 'delimiter.curly', bracket: '@close', next: '@pop' }],
      { include: 'root' },
    ],

    rstring: [
      [/[^"]+/, 'string.raw'],
      [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
    ],
  },
};

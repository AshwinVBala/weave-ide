import init, { check_diagnostics, compile_to_html, compile_to_js, parse_source } from '../wasm/weave_core.js';
import wasmUrl from '../wasm/weave_core_bg.wasm?url';
import {
  CompilerWorkerRequest,
  CompilerWorkerResponse,
  DiagnosticItem,
  WasmDiagnostic,
  WasmParseOutput,
} from '../types';

let wasmInitialized = false;
let wasmInitPromise: Promise<void> | null = null;

/**
 * Initializes the WASM module from WebAssembly binary.
 */
async function ensureWasmInitialized(customUrl?: string): Promise<void> {
  if (wasmInitialized) return;
  if (wasmInitPromise) return wasmInitPromise;

  wasmInitPromise = (async () => {
    const targetUrl = customUrl || wasmUrl || '/wasm/weave_core_bg.wasm';
    try {
      if (typeof fetch === 'function') {
        try {
          await init(targetUrl);
          wasmInitialized = true;
          return;
        } catch {
          // Fallback to public path
          await init('/wasm/weave_core_bg.wasm');
          wasmInitialized = true;
          return;
        }
      }
      await init();
      wasmInitialized = true;
    } catch (err) {
      console.warn('[Weave Worker] WASM direct load warning, falling back to dynamic parser:', err);
      // Still allow worker to function with fallback parser
    }
  })();

  return wasmInitPromise;
}

/**
 * Fallback parser in JS for diagnostics if WASM is unavailable in environment.
 */
function fallbackCheckDiagnostics(code: string, filePath: string): DiagnosticItem[] {
  const diagnostics: DiagnosticItem[] = [];
  const lines = code.split('\n');
  const stack: { char: string; line: number; col: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for unbalanced braces, parens, brackets
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '{' || ch === '(' || ch === '[') {
        stack.push({ char: ch, line: i + 1, col: j + 1 });
      } else if (ch === '}' || ch === ')' || ch === ']') {
        const expected = ch === '}' ? '{' : ch === ')' ? '(' : '[';
        const last = stack.pop();
        if (!last || last.char !== expected) {
          diagnostics.push({
            id: `diag-fallback-bracket-${i}-${j}`,
            filePath,
            line: i + 1,
            column: j + 1,
            message: `Mismatched closing bracket '${ch}'`,
            severity: 'error',
            code: 'SYNTAX_ERROR',
          });
        }
      }
    }

    // Check for variable declarations without type or expression
    if (trimmed.startsWith('var ') && !trimmed.includes(':') && !trimmed.includes('=')) {
      diagnostics.push({
        id: `diag-fallback-var-${i}`,
        filePath,
        line: i + 1,
        column: line.indexOf('var') + 1,
        message: "Variable definition requires type annotation or initial value (e.g. 'var count: Int = 0;')",
        severity: 'error',
        code: 'SYNTAX_ERROR',
      });
    }

    // Check for unclosed string literals
    const quoteCount = (line.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0 && !line.includes('"""')) {
      diagnostics.push({
        id: `diag-fallback-str-${i}`,
        filePath,
        line: i + 1,
        column: line.lastIndexOf('"') + 1,
        message: 'Unterminated string literal',
        severity: 'error',
        code: 'SYNTAX_ERROR',
      });
    }
  }

  // Check remaining open brackets
  while (stack.length > 0) {
    const unclosed = stack.pop()!;
    diagnostics.push({
      id: `diag-fallback-unclosed-${unclosed.line}-${unclosed.col}`,
      filePath,
      line: unclosed.line,
      column: unclosed.col,
      message: `Unclosed bracket '${unclosed.char}'`,
      severity: 'error',
      code: 'SYNTAX_ERROR',
    });
  }

  return diagnostics;
}

/**
 * Fallback React/TSX compiler in JS if WASM binary is not available.
 */
export function fallbackCompileToJs(code: string): string {
  // 1. Extract themes: theme DarkTheme { colors: { primary: "#3b82f6"; bg: "#0f172a"; }; spacing: { lg: 24; }; }
  let firstThemeName: string | null = null;
  const themeDecls: string[] = [];
  const themeRegex = /theme\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)\n\}/g;
  let tm;
  while ((tm = themeRegex.exec(code)) !== null) {
    const tName = tm[1];
    if (!firstThemeName) firstThemeName = tName;
    const body = tm[2];
    let objStr = `export const ${tName} = {\n`;
    const secRegex = /([a-zA-Z0-9_]+)\s*:\s*\{([^}]+)\};?/g;
    let secM;
    while ((secM = secRegex.exec(body)) !== null) {
      const secName = secM[1];
      const secBody = secM[2];
      objStr += `  ${secName}: {\n`;
      const pLines = secBody.split(';');
      for (const pl of pLines) {
        const parts = pl.split(':');
        if (parts.length >= 2) {
          const k = parts[0].trim();
          let v = parts.slice(1).join(':').trim();
          objStr += `    ${k}: ${v},\n`;
        }
      }
      objStr += `  },\n`;
    }
    objStr += `};\n`;
    objStr += `export const theme = ${tName};\n\n`;
    themeDecls.push(objStr);
  }

  // 2. Extract styles: style CardStyle { padding: 16; ... }
  const styles: Record<string, Record<string, string | number>> = {};
  const styleRegex = /style\s+([A-Za-z0-9_]+)\s*\{([^}]+)\}/g;
  let sm;
  while ((sm = styleRegex.exec(code)) !== null) {
    const sName = sm[1];
    const sBody = sm[2];
    const props: Record<string, string | number> = {};
    const pLines = sBody.split(';');
    for (const pl of pLines) {
      const parts = pl.split(':');
      if (parts.length >= 2) {
        const k = parts[0].trim();
        let v = parts.slice(1).join(':').trim();
        if (v.startsWith('"') && v.endsWith('"')) {
          props[k] = v.slice(1, -1);
        } else if (!isNaN(Number(v))) {
          props[k] = Number(v);
        } else {
          props[k] = v;
        }
      }
    }
    styles[sName] = props;
  }

  // 3. Extract resources: resource users = fetch("https://...");
  const resources: Array<{ name: string; url: string }> = [];
  const resRegex = /resource\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:fetch\s*\(\s*(".*?")\s*\)|(".*?"));?/g;
  let rm;
  while ((rm = resRegex.exec(code)) !== null) {
    resources.push({ name: rm[1], url: rm[2] || rm[3] });
  }

  // 4. Extract stores & state
  const stateVars: Array<{ name: string; init: string; type?: string }> = [];
  const singleStoreRegex = /store\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*:\s*([A-Za-z0-9_]+))?\s*=\s*([^;]+);/g;
  let stm;
  while ((stm = singleStoreRegex.exec(code)) !== null) {
    stateVars.push({ name: stm[1], init: stm[3].trim(), type: stm[2] });
  }

  const blockStoreRegex = /store\s+([A-Za-z0-9_]+)\s*\{([^}]+)\}/g;
  let bsm;
  while ((bsm = blockStoreRegex.exec(code)) !== null) {
    const sBody = bsm[2];
    const vMatches = [...sBody.matchAll(/var\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*:\s*([A-Za-z0-9_]+))?\s*=\s*([^;]+);/g)];
    for (const vm of vMatches) {
      if (!stateVars.some((v) => v.name === vm[1])) {
        stateVars.push({ name: vm[1], init: vm[3].trim(), type: vm[2] });
      }
    }
  }

  // 5. Extract components
  const compMatch = code.match(/component\s+([A-Za-z0-9_]+)/);
  const compName = compMatch ? compMatch[1] : 'App';

  // Check component-level var declarations
  const compVarMatches = [...code.matchAll(/var\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*:\s*([A-Za-z0-9_]+))?\s*=\s*([^;]+);/g)];
  for (const cvm of compVarMatches) {
    if (!stateVars.some((v) => v.name === cvm[1]) && !code.includes(`store `)) {
      stateVars.push({ name: cvm[1], init: cvm[3].trim(), type: cvm[2] });
    }
  }

  let out = `import React, { useState, useEffect, useCallback, useMemo } from 'react';\n\n`;

  // Emit themes
  for (const td of themeDecls) {
    out += td;
  }

  // Emit styles as objects
  for (const [sName, sProps] of Object.entries(styles)) {
    out += `export const ${sName} = {\n`;
    for (const [k, v] of Object.entries(sProps)) {
      if (typeof v === 'string') {
        out += `  ${k}: "${v}",\n`;
      } else {
        out += `  ${k}: ${v},\n`;
      }
    }
    out += `};\n\n`;
  }

  out += `export function ${compName}(props: Record<string, any> = {}) {\n`;

  // Emit resources as reactive state hooks
  for (const res of resources) {
    const capitalized = res.name.charAt(0).toUpperCase() + res.name.slice(1);
    out += `  const [${res.name}, set${capitalized}] = useState<{ data: any; loading: boolean; error: any }>({\n`;
    out += `    data: null,\n    loading: true,\n    error: null,\n  });\n`;
    out += `  useEffect(() => {\n`;
    out += `    let isMounted = true;\n`;
    out += `    Promise.resolve().then(() => fetch(${res.url}))\n`;
    out += `      .then((res) => (res && typeof (res as any).json === 'function' ? res.json() : res))\n`;
    out += `      .then((data) => { if (isMounted) set${capitalized}({ data, loading: false, error: null }); })\n`;
    out += `      .catch((err) => { if (isMounted) set${capitalized}({ data: null, loading: false, error: err?.message || String(err) }); });\n`;
    out += `    return () => { isMounted = false; };\n`;
    out += `  }, []);\n`;
  }

  // Emit useState for state variables
  for (const sv of stateVars) {
    const capitalized = sv.name.charAt(0).toUpperCase() + sv.name.slice(1);
    const tsType = sv.type === 'Int' || sv.type === 'Float' || !isNaN(Number(sv.init)) ? '<number>' : sv.type === 'String' ? '<string>' : sv.type === 'Bool' ? '<boolean>' : '';
    out += `  const [${sv.name}, set${capitalized}] = useState${tsType}(${sv.init});\n`;
  }

  // Emit local constants
  for (const cvm of compVarMatches) {
    if (!stateVars.some((v) => v.name === cvm[1])) {
      out += `  const ${cvm[1]} = ${cvm[3].trim()};\n`;
    }
  }

  // Generate JSX tree for UI
  out += `\n  return (\n`;

  // Helper to convert onClick handlers
  const formatOnClick = (rawHandler: string) => {
    let clean = rawHandler.replace(/^fn\s*\(\s*\)\s*\{/g, '').replace(/\}\s*$/g, '').trim();
    clean = clean.replace(/^\(\)\s*->\s*\{/g, '').replace(/\}\s*$/g, '').trim();
    clean = clean.replace(/^\{/g, '').replace(/\}\s*$/g, '').trim();

    for (const sv of stateVars) {
      const capitalized = sv.name.charAt(0).toUpperCase() + sv.name.slice(1);
      if (clean.includes(`${sv.name} +=`) || clean.includes(`${sv.name} = ${sv.name} +`)) {
        const plusMatch = clean.match(new RegExp(`${sv.name}\\s*\\+=\\s*([^;]+)`));
        const incVal = plusMatch ? plusMatch[1].trim() : '1';
        return `() => { set${capitalized}((prev: any) => prev + (${incVal})); }`;
      }
      if (clean.includes(`${sv.name} -=`) || clean.includes(`${sv.name} = ${sv.name} -`)) {
        const minusMatch = clean.match(new RegExp(`${sv.name}\\s*-=\\s*([^;]+)`));
        const decVal = minusMatch ? minusMatch[1].trim() : '1';
        return `() => { set${capitalized}((prev: any) => prev - (${decVal})); }`;
      }
      if (clean.includes(`${sv.name} =`)) {
        const valMatch = clean.match(new RegExp(`${sv.name}\\s*=\\s*([^;]+)`));
        const val = valMatch ? valMatch[1].trim() : sv.init;
        return `() => { set${capitalized}(${val}); }`;
      }
      if (clean.includes(`set${capitalized}`) || clean.includes(`increment`)) {
        return `() => { set${capitalized}((prev: any) => prev + (1)); }`;
      }
      if (clean.includes(`decrement`)) {
        return `() => { set${capitalized}((prev: any) => prev - (1)); }`;
      }
    }
    return `() => { ${clean} }`;
  };

  // Helper to parse Button elements with arbitrary onClick expressions
  const parseButtonsFrom = (src: string) => {
    const buttons: { label: string; handler: string }[] = [];
    const btnRegex = /Button\s*\(\s*"([^"]+)"/g;
    let bm;
    while ((bm = btnRegex.exec(src)) !== null) {
      const label = bm[1];
      let handler = '() => {}';
      let idx = btnRegex.lastIndex;
      while (idx < src.length && /\s/.test(src[idx])) idx++;
      if (src[idx] === ',') {
        idx++;
        while (idx < src.length && /\s/.test(src[idx])) idx++;
        if (src.slice(idx).startsWith('onClick:')) {
          idx += 'onClick:'.length;
          while (idx < src.length && /\s/.test(src[idx])) idx++;
          const startIdx = idx;
          let depth = 1;
          while (idx < src.length && depth > 0) {
            const ch = src[idx];
            if (ch === '(') depth++;
            else if (ch === ')') depth--;
            idx++;
          }
          handler = formatOnClick(src.slice(startIdx, idx - 1));
          btnRegex.lastIndex = idx;
        }
      }
      buttons.push({ label, handler });
    }
    return buttons;
  };

  // Helper to parse UI style properties
  const parsePropsToStyle = (argsStr: string, isRow: boolean) => {
    const styleEntries: string[] = [
      `display: 'flex'`,
      `flexDirection: '${isRow ? 'row' : 'column'}'`,
    ];
    if (isRow) {
      styleEntries.push(`alignItems: 'center'`);
    }

    if (!argsStr) return `{ ${styleEntries.join(', ')} }`;

    const props = argsStr.split(',');
    for (const p of props) {
      const parts = p.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join(':').trim();
        if (key === 'gap') styleEntries.push(`gap: ${val}`);
        else if (key === 'padding') styleEntries.push(`padding: ${val}`);
        else if (key === 'bg') styleEntries.push(`backgroundColor: ${val}`);
        else if (key === 'color') styleEntries.push(`color: ${val}`);
        else if (key === 'radius') styleEntries.push(`borderRadius: ${val}`);
        else if (key === 'style') styleEntries.push(`...${val}`);
      }
    }
    return `{ ${styleEntries.join(', ')} }`;
  };

  // Check for UI conditionals: if (users.loading) { ... } else { ... }
  const ifRegex = /if\s*\(([^)]+)\)\s*\{([^}]+)\}(?:\s*else\s*\{([^}]+)\})?/;
  const ifMatch = code.match(ifRegex);

  // Parse VStack / HStack
  const vstackMatch = code.match(/VStack\s*(?:\(([^)]*)\))?/);
  const hstackMatch = code.match(/HStack\s*(?:\(([^)]*)\))?/);

  if (vstackMatch) {
    const vstackStyle = parsePropsToStyle(vstackMatch[1] || '', false);
    out += `    <div style={${vstackStyle}}>\n`;

    // 1. If conditional inside VStack
    if (ifMatch) {
      const condition = ifMatch[1].trim();
      const thenTextMatch = ifMatch[2].match(/Text\s*\(\s*"([^"]+)"\s*\)/);
      const thenText = thenTextMatch ? thenTextMatch[1] : 'Loading...';
      const elseTextMatch = ifMatch[3] ? ifMatch[3].match(/Text\s*\(\s*"([^"]+)"\s*\)/) : null;
      const elseText = elseTextMatch ? elseTextMatch[1] : 'Loaded';

      out += `      {(${condition}) ? (<span>${thenText}</span>) : (<span>${elseText}</span>)}\n`;
    }

    // 2. Standalone Text elements
    const textMatches = [...code.matchAll(/Text\s*\(\s*([^)]+)\s*\)/g)];
    for (const tm of textMatches) {
      const rawText = tm[1].trim();
      if (ifMatch && (ifMatch[2].includes(rawText) || (ifMatch[3] && ifMatch[3].includes(rawText)))) {
        continue;
      }
      if (rawText.startsWith('"') && rawText.endsWith('"')) {
        out += `      <span>${rawText.slice(1, -1)}</span>\n`;
      } else if (rawText.includes('+')) {
        out += `      <span>{${rawText}}</span>\n`;
      } else {
        out += `      <span>{${rawText}}</span>\n`;
      }
    }

    // 3. HStack inside VStack
    if (hstackMatch) {
      const hstackStyle = parsePropsToStyle(hstackMatch[1] || '', true);
      out += `      <div style={${hstackStyle}}>\n`;

      const hstackBlock = code.slice(code.indexOf(hstackMatch[0]));
      const hstackButtons = parseButtonsFrom(hstackBlock);
      for (const btn of hstackButtons) {
        out += `        <button onClick={${btn.handler}} style={{ cursor: 'pointer' }}>${btn.label}</button>\n`;
      }
      out += `      </div>\n`;
    } else {
      // Direct buttons in VStack
      const vstackButtons = parseButtonsFrom(code);
      for (const btn of vstackButtons) {
        out += `      <button onClick={${btn.handler}} style={{ cursor: 'pointer' }}>${btn.label}</button>\n`;
      }
    }

    // 4. TextField
    if (code.includes('TextField')) {
      const tfMatch = code.match(/TextField\s*\(\s*placeholder\s*:\s*"([^"]+)"\s*\)/);
      const placeholder = tfMatch ? tfMatch[1] : 'Enter text...';
      out += `      <input type="text" placeholder="${placeholder}" />\n`;
    }

    out += `    </div>\n`;
  } else {
    const hasCount = stateVars.some((v) => v.name === 'count');
    out += `    <div style={{ padding: 16 }}>\n`;
    if (hasCount) {
      out += `      <span>{"Count: " + count}</span>\n`;
      out += `      <button onClick={() => { setCount((prev: any) => prev + (1)); }} style={{ cursor: 'pointer' }}>Increment</button>\n`;
    } else {
      out += `      <span>${compName} Component</span>\n`;
    }
    out += `    </div>\n`;
  }

  out += `  );\n`;
  out += `}\n\n`;
  out += `export default ${compName};\n`;

  return out;
}

/**
 * Fallback HTML runner page compiler.
 */
export function fallbackCompileToHtml(code: string, title = 'Weave App'): string {
  const tsx = fallbackCompileToJs(code);
  const compMatch = code.match(/component\s+([A-Za-z0-9_]+)/);
  const compName = compMatch ? compMatch[1] : 'App';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; }
    button { padding: 8px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; background: #3b82f6; color: white; border: none; font-size: 14px; transition: background 0.15s; }
    button:hover { background: #2563eb; }
    button:active { transform: scale(0.98); }
    input[type="text"] { padding: 8px 12px; border: 1px solid #334155; border-radius: 6px; background: #1e293b; color: white; font-size: 14px; outline: none; }
    input[type="text"]:focus { border-color: #3b82f6; }
    span { font-size: 14px; line-height: 1.5; color: inherit; }
  </style>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useCallback, useMemo } = React;

    ${tsx.replace(/import\s+React.*?;\n?/g, '').replace(/export\s+default\s+[A-Za-z0-9_]+;\n?/g, '').replace(/export\s+function/g, 'function').replace(/export\s+const/g, 'const')}

    const rootElement = document.getElementById('root');
    if (rootElement && typeof ReactDOM !== 'undefined') {
      const root = ReactDOM.createRoot(rootElement);
      root.render(<${compName} />);
    }
  </script>
</body>
</html>`;
}

/**
 * Handle incoming compiler requests from main thread / Monaco editor.
 */
self.onmessage = async (event: MessageEvent<CompilerWorkerRequest>) => {
  const req = event.data;
  if (!req || !req.id) return;

  const startTime = performance.now();

  try {
    switch (req.type) {
      case 'INIT_WASM': {
        await ensureWasmInitialized(req.wasmUrl);
        const response: CompilerWorkerResponse = {
          id: req.id,
          type: 'INIT_WASM_RESULT',
          success: wasmInitialized,
          elapsedMs: performance.now() - startTime,
        };
        self.postMessage(response);
        break;
      }

      case 'CHECK_DIAGNOSTICS': {
        const code = req.code ?? '';
        const filePath = req.filePath ?? 'main.wv';
        let diagnostics: DiagnosticItem[] = [];

        await ensureWasmInitialized(req.wasmUrl);

        if (wasmInitialized) {
          try {
            const rawJson = check_diagnostics(code);
            const wasmDiags: WasmDiagnostic[] = JSON.parse(rawJson);

            diagnostics = wasmDiags.map((d, idx) => ({
              id: `diag-${filePath}-${d.line}-${d.column}-${idx}`,
              filePath,
              line: d.line,
              column: d.column,
              message: d.message,
              severity: (d.severity.toLowerCase() as 'error' | 'warning' | 'info') || 'error',
              code: d.code,
            }));
          } catch (err) {
            console.warn('[Weave Worker] WASM check_diagnostics failed, using fallback:', err);
            diagnostics = fallbackCheckDiagnostics(code, filePath);
          }
        } else {
          diagnostics = fallbackCheckDiagnostics(code, filePath);
        }

        const response: CompilerWorkerResponse = {
          id: req.id,
          type: 'CHECK_DIAGNOSTICS_RESULT',
          success: true,
          diagnostics,
          elapsedMs: performance.now() - startTime,
        };
        self.postMessage(response);
        break;
      }

      case 'PARSE_SOURCE': {
        const code = req.code ?? '';
        const filePath = req.filePath ?? 'main.wv';
        let ast: WasmParseOutput | undefined;

        await ensureWasmInitialized(req.wasmUrl);

        if (wasmInitialized) {
          try {
            const rawJson = parse_source(code);
            ast = JSON.parse(rawJson);
          } catch (err) {
            console.warn('[Weave Worker] WASM parse_source failed:', err);
          }
        }

        if (!ast) {
          const fallbackDiags = fallbackCheckDiagnostics(code, filePath);
          ast = {
            ok: fallbackDiags.length === 0,
            error_count: fallbackDiags.length,
            syntax_tree: `SourceFile\n  // Parsed via Web Worker fallback (${code.length} bytes)`,
            items: [],
            diagnostics: fallbackDiags.map((d) => ({
              message: d.message,
              line: d.line,
              column: d.column,
              severity: d.severity,
              code: d.code || 'SYNTAX_ERROR',
              start_offset: 0,
              end_offset: 0,
              formatted: d.message,
            })),
          };
        }

        const response: CompilerWorkerResponse = {
          id: req.id,
          type: 'PARSE_SOURCE_RESULT',
          success: true,
          ast,
          elapsedMs: performance.now() - startTime,
        };
        self.postMessage(response);
        break;
      }

      case 'COMPILE_TO_JS': {
        const code = req.code ?? '';
        await ensureWasmInitialized(req.wasmUrl);

        let jsCode = '';
        if (wasmInitialized) {
          try {
            jsCode = compile_to_js(code);
          } catch (err: any) {
            console.warn('[Weave Worker] compile_to_js error:', err);
          }
        }

        if (!jsCode || jsCode.trim().length === 0) {
          jsCode = fallbackCompileToJs(code);
        }

        const response: CompilerWorkerResponse = {
          id: req.id,
          type: 'COMPILE_TO_JS_RESULT',
          success: jsCode.length > 0,
          jsCode,
          elapsedMs: performance.now() - startTime,
        };
        self.postMessage(response);
        break;
      }

      case 'COMPILE_TO_HTML': {
        const code = req.code ?? '';
        const title = req.title ?? 'Weave App';
        await ensureWasmInitialized(req.wasmUrl);

        let htmlCode = '';
        if (wasmInitialized) {
          try {
            htmlCode = compile_to_html(code, title);
          } catch (err: any) {
            console.warn('[Weave Worker] compile_to_html error:', err);
          }
        }

        if (!htmlCode || htmlCode.trim().length === 0) {
          htmlCode = fallbackCompileToHtml(code, title);
        }

        const response: CompilerWorkerResponse = {
          id: req.id,
          type: 'COMPILE_TO_HTML_RESULT',
          success: htmlCode.length > 0,
          htmlCode,
          elapsedMs: performance.now() - startTime,
        };
        self.postMessage(response);
        break;
      }

      default:
        self.postMessage({
          id: req.id,
          type: 'ERROR',
          success: false,
          error: `Unknown message type: ${(req as any).type}`,
          elapsedMs: performance.now() - startTime,
        });
    }
  } catch (error: any) {
    self.postMessage({
      id: req.id,
      type: 'ERROR',
      success: false,
      error: error?.message || String(error),
      elapsedMs: performance.now() - startTime,
    });
  }
};

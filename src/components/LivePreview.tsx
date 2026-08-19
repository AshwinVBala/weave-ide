import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Eye,
  Code2,
  Globe,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  X,
  Crosshair,
} from 'lucide-react';
import { WeaveCompilerService } from '../services/compilerService';
import { DiagnosticItem } from '../types';
import { PointAndPromptPopover, SelectedElementInfo } from './AI/PointAndPromptPopover';

interface LivePreviewProps {
  code: string;
  filePath?: string;
  onClose?: () => void;
  onApplyCode?: (newCode: string) => void;
  debounceMs?: number;
  autoCompile?: boolean;
  className?: string;
}

/**
 * Extracts balanced braces accounting for quotes and nested braces.
 */
function extractBalancedBraces(str: string, startIndex: number): { content: string; endIndex: number } | null {
  if (str[startIndex] !== '{') return null;
  let depth = 0;
  let inString: string | null = null;
  let escape = false;

  for (let i = startIndex; i < str.length; i++) {
    const ch = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (inString) {
      if (ch === inString) inString = null;
    } else {
      if (ch === '"' || ch === "'" || ch === '`') {
        inString = ch;
      } else if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          return {
            content: str.slice(startIndex + 1, i),
            endIndex: i,
          };
        }
      }
    }
  }
  return null;
}

/**
 * Recursively parses a JSX element starting at `startIndex` and transforms it to `React.createElement(...)`.
 */
function parseJsxElement(str: string, startIndex: number): { code: string; endIndex: number } | null {
  if (str[startIndex] !== '<') return null;
  const tagMatch = str.slice(startIndex).match(/^<([A-Za-z0-9_]+)/);
  if (!tagMatch) return null;
  const tagName = tagMatch[1];
  let idx = startIndex + tagMatch[0].length;
  const props: string[] = [];

  // Parse attributes until > or />
  while (idx < str.length) {
    while (idx < str.length && /\s/.test(str[idx])) idx++;
    if (str.slice(idx, idx + 2) === '/>') {
      const tagStr = /^[a-z]/.test(tagName) ? JSON.stringify(tagName) : tagName;
      const propObj = props.length > 0 ? `{ ${props.join(', ')} }` : 'null';
      return { code: `React.createElement(${tagStr}, ${propObj})`, endIndex: idx + 1 };
    }
    if (str[idx] === '>') {
      idx++; // skip >
      break;
    }
    // Parse attr name
    const attrMatch = str.slice(idx).match(/^([A-Za-z0-9_]+)/);
    if (!attrMatch) break;
    const attrName = attrMatch[1];
    idx += attrName.length;
    while (idx < str.length && /\s/.test(str[idx])) idx++;
    if (str[idx] === '=') {
      idx++; // skip =
      while (idx < str.length && /\s/.test(str[idx])) idx++;
      if (str[idx] === '{') {
        const brace = extractBalancedBraces(str, idx);
        if (brace) {
          props.push(`${attrName}: ${brace.content}`);
          idx = brace.endIndex + 1;
        } else {
          idx++;
        }
      } else if (str[idx] === '"' || str[idx] === "'") {
        const quote = str[idx];
        idx++;
        let val = '';
        while (idx < str.length && str[idx] !== quote) {
          if (str[idx] === '\\') {
            val += str[idx];
            idx++;
          }
          val += str[idx];
          idx++;
        }
        idx++; // skip close quote
        props.push(`${attrName}: ${JSON.stringify(val)}`);
      }
    } else {
      props.push(`${attrName}: true`);
    }
  }

  // Parse children until </tagName>
  const children: string[] = [];
  const closeTag = `</${tagName}>`;
  while (idx < str.length) {
    if (str.slice(idx, idx + closeTag.length) === closeTag) {
      idx += closeTag.length;
      break;
    }
    if (str[idx] === '<') {
      const childElem = parseJsxElement(str, idx);
      if (childElem) {
        children.push(childElem.code);
        idx = childElem.endIndex + 1;
        continue;
      }
    }
    if (str[idx] === '{') {
      const brace = extractBalancedBraces(str, idx);
      if (brace) {
        const trimmed = brace.content.trim();
        if (trimmed) {
          const transformedExpr = transformJsxToCreateElement(trimmed);
          children.push(transformedExpr);
        }
        idx = brace.endIndex + 1;
        continue;
      }
    }
    // Raw text
    let text = '';
    while (
      idx < str.length &&
      str[idx] !== '<' &&
      str[idx] !== '{' &&
      str.slice(idx, idx + closeTag.length) !== closeTag
    ) {
      text += str[idx];
      idx++;
    }
    if (text.trim()) {
      children.push(JSON.stringify(text.trim()));
    }
  }

  const tagStr = /^[a-z]/.test(tagName) ? JSON.stringify(tagName) : tagName;
  const propObj = props.length > 0 ? `{ ${props.join(', ')} }` : 'null';
  const childArgs = children.length > 0 ? `, ${children.join(', ')}` : '';
  return { code: `React.createElement(${tagStr}, ${propObj}${childArgs})`, endIndex: idx - 1 };
}

/**
 * Transforms JSX in a source code string to React.createElement calls.
 */
export function transformJsxToCreateElement(source: string): string {
  let result = '';
  let i = 0;
  while (i < source.length) {
    if (source[i] === '<' && /[A-Za-z]/.test(source[i + 1] || '')) {
      const parsed = parseJsxElement(source, i);
      if (parsed) {
        result += parsed.code;
        i = parsed.endIndex + 1;
        continue;
      }
    }
    result += source[i];
    i++;
  }
  return result;
}

function prepareCompiledTsx(tsxCode: string): { code: string; componentName: string } {
  let js = tsxCode.replace(/import\s+React.*?;\s*/g, '');
  js = js.replace(/import\s+.*?from\s+['"].*?['"];\s*/g, '');
  js = js.replace(/:\s*Record<string,\s*any>\s*=\s*\{\}/g, ' = {}');
  js = js.replace(/:\s*React\.CSSProperties/g, '');
  js = js.replace(/useState<[\s\S]*?>\(/g, 'useState(');
  js = js.replace(/props:\s*\{[\s\S]*?\}\s*=\s*\{\}/g, 'props = {}');
  js = js.replace(/\(prev:\s*any\)/g, '(prev)');
  js = js.replace(/\(([a-zA-Z0-9_]+):\s*[a-zA-Z0-9_]+\)/g, '($1)');
  js = js.replace(/catch\s*\(\s*([a-zA-Z0-9_]+)\s*:\s*any\s*\)/g, 'catch ($1)');
  js = js.replace(/as\s+any/g, '');

  const matchExport = js.match(/export\s+default\s+([A-Za-z0-9_]+);/);
  const matchFunc = js.match(/export\s+function\s+([A-Za-z0-9_]+)/);
  const componentName = matchExport ? matchExport[1] : matchFunc ? matchFunc[1] : 'Component';

  js = js.replace(/export\s+default\s+[A-Za-z0-9_]+;\s*/g, '');
  js = js.replace(/export\s+const\s+/g, 'const ');
  js = js.replace(/export\s+function\s+/g, 'function ');
  js = js.replace(/export\s+async\s+function\s+/g, 'async function ');

  return { code: transformJsxToCreateElement(js), componentName };
}

/** Creates a dependency-free HTML runner that works inside the Tauri sandbox. */
export function createStandaloneHtmlFromTsx(tsxCode: string, title = 'Weave App'): string {
  const { code, componentName } = prepareCompiledTsx(tsxCode);
  const safeCode = code.replace(/<\/script/gi, '<\\/script');
  const safeTitle = title.replace(/[<>&"']/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&#39;',
  }[char] || char));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    :root { color-scheme: dark; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    html, body, #root { width: 100%; min-height: 100%; margin: 0; }
    body { background: #08090c; color: #f3f4f6; padding: 24px; }
    #root > div { width: min(100%, 620px); margin: 0 auto; padding: 24px; border-radius: 16px; background: #0d0f17; border: 1px solid rgba(255,255,255,.07); }
    button { background: #2563eb; color: white; border: 0; padding: 8px 16px; border-radius: 8px; font: inherit; font-weight: 600; cursor: pointer; }
    button:hover { background: #1d4ed8; }
    button:active { transform: scale(.98); }
    input { background: #141722; color: white; border: 1px solid rgba(255,255,255,.12); padding: 8px 12px; border-radius: 8px; font: inherit; }
    span { font-size: 16px; line-height: 1.5; }
    #weave-runtime-error { color: #fca5a5; white-space: pre-wrap; font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    (() => {
      const rootElement = document.getElementById('root');
      const hooks = [];
      let hookIndex = 0;
      let pendingEffects = [];
      let renderScheduled = false;

      const React = {
        createElement(type, props, ...children) {
          return { type, props: props || {}, children: children.flat(Infinity) };
        }
      };

      const depsChanged = (previous, next) => !previous || !next || previous.length !== next.length || next.some((value, index) => !Object.is(value, previous[index]));
      const scheduleRender = () => {
        if (renderScheduled) return;
        renderScheduled = true;
        queueMicrotask(() => { renderScheduled = false; render(); });
      };

      function useState(initialValue) {
        const index = hookIndex++;
        if (!(index in hooks)) hooks[index] = typeof initialValue === 'function' ? initialValue() : initialValue;
        const setValue = (nextValue) => {
          const resolved = typeof nextValue === 'function' ? nextValue(hooks[index]) : nextValue;
          if (!Object.is(resolved, hooks[index])) {
            hooks[index] = resolved;
            scheduleRender();
          }
        };
        return [hooks[index], setValue];
      }

      function useEffect(effect, dependencies) {
        const index = hookIndex++;
        const previous = hooks[index];
        if (depsChanged(previous && previous.dependencies, dependencies)) {
          pendingEffects.push(() => {
            if (previous && typeof previous.cleanup === 'function') previous.cleanup();
            hooks[index] = { dependencies, cleanup: effect() };
          });
        }
      }

      function useMemo(factory, dependencies) {
        const index = hookIndex++;
        const previous = hooks[index];
        if (!previous || depsChanged(previous.dependencies, dependencies)) hooks[index] = { dependencies, value: factory() };
        return hooks[index].value;
      }

      function useCallback(callback, dependencies) {
        return useMemo(() => callback, dependencies);
      }

      function renderNode(node) {
        if (node == null || typeof node === 'boolean') return document.createTextNode('');
        if (typeof node === 'string' || typeof node === 'number') return document.createTextNode(String(node));
        if (Array.isArray(node)) {
          const fragment = document.createDocumentFragment();
          node.forEach((child) => fragment.appendChild(renderNode(child)));
          return fragment;
        }
        if (typeof node.type === 'function') return renderNode(node.type({ ...node.props, children: node.children }));

        const element = document.createElement(node.type);
        Object.entries(node.props || {}).forEach(([name, value]) => {
          if (name === 'children' || name === 'key' || value == null || value === false) return;
          if (name === 'style' && typeof value === 'object') Object.assign(element.style, value);
          else if (name.startsWith('on') && typeof value === 'function') element.addEventListener(name.slice(2).toLowerCase(), value);
          else if (name === 'className') element.setAttribute('class', String(value));
          else if (name === 'htmlFor') element.setAttribute('for', String(value));
          else if (name in element) element[name] = value;
          else element.setAttribute(name, value === true ? '' : String(value));
        });
        node.children.forEach((child) => element.appendChild(renderNode(child)));
        return element;
      }

      ${safeCode}

      function render() {
        try {
          hookIndex = 0;
          pendingEffects = [];
          rootElement.replaceChildren(renderNode(React.createElement(${componentName}, null)));
          const effects = pendingEffects;
          pendingEffects = [];
          effects.forEach((run) => run());
        } catch (error) {
          rootElement.innerHTML = '<pre id="weave-runtime-error"></pre>';
          rootElement.firstElementChild.textContent = 'HTML preview failed to render:\\n' + (error && error.stack ? error.stack : String(error));
        }
      }

      render();
    })();
  <\/script>
</body>
</html>`;
}

/**
 * Transforms generated Weave TSX into an executable React Component function.
 */
export function createComponentFromTsx(tsxCode: string): React.ComponentType<any> | null {
  try {
    // 1. Remove import statements
    let js = tsxCode.replace(/import\s+React.*?;\s*/g, '');
    js = js.replace(/import\s+.*?from\s+['"].*?['"];\s*/g, '');

    // 2. Strip TypeScript types
    js = js.replace(/:\s*Record<string,\s*any>\s*=\s*{}/g, ' = {}');
    js = js.replace(/:\s*React\.CSSProperties/g, '');
    js = js.replace(/useState<[\s\S]*?>\(/g, 'useState(');
    js = js.replace(/props:\s*\{[\s\S]*?\}\s*=\s*\{\}/g, 'props = {}');
    js = js.replace(/\(prev:\s*any\)/g, '(prev)');
    js = js.replace(/\(([a-zA-Z0-9_]+):\s*[a-zA-Z0-9_]+\)/g, '($1)');
    js = js.replace(/catch\s*\(\s*([a-zA-Z0-9_]+)\s*:\s*any\s*\)/g, 'catch ($1)');
    js = js.replace(/as\s+any/g, '');

    // 3. Find default exported component or first function name
    const matchExport = js.match(/export\s+default\s+([A-Za-z0-9_]+);/);
    const matchFunc = js.match(/export\s+function\s+([A-Za-z0-9_]+)/);
    const compName = matchExport ? matchExport[1] : matchFunc ? matchFunc[1] : 'Component';

    // 4. Remove export keywords
    js = js.replace(/export\s+default\s+[A-Za-z0-9_]+;\s*/g, '');
    js = js.replace(/export\s+const\s+/g, 'const ');
    js = js.replace(/export\s+function\s+/g, 'function ');
    js = js.replace(/export\s+async\s+function\s+/g, 'async function ');

    // 5. Convert JSX tags to React.createElement
    const transformed = transformJsxToCreateElement(js);

    // 6. Build executable factory
    const factory = new Function(
      'React',
      'useState',
      'useEffect',
      'useCallback',
      'useMemo',
      `${transformed}\nreturn typeof ${compName} !== 'undefined' ? ${compName} : null;`
    );

    const comp = factory(React, useState, useEffect, useCallback, useMemo);
    return comp;
  } catch (err) {
    console.error('[LivePreview] Error instantiating dynamic component:', err, '\nCode was:\n', tsxCode);
    return null;
  }
}

export const LivePreview: React.FC<LivePreviewProps> = ({
  code,
  filePath = 'main.wv',
  onClose,
  onApplyCode = () => {},
  debounceMs = 150,
  autoCompile = true,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'html'>('preview');
  const [compiledJs, setCompiledJs] = useState<string>('');
  const [compiledHtml, setCompiledHtml] = useState<string>('');
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compilationTime, setCompilationTime] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [isDiagnosticsExpanded, setIsDiagnosticsExpanded] = useState<boolean>(false);

  // Point & Prompt Interactive Element Inspection state
  const [isInspectMode, setIsInspectMode] = useState<boolean>(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElementInfo | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);

  // Compile Weave source code using the Web Worker compiler pipeline
  const compileSource = useCallback(
    async (source: string) => {
      if (!source.trim()) {
        setCompiledJs('');
        setCompiledHtml('');
        setDiagnostics([]);
        setRenderError(null);
        return;
      }

      setIsCompiling(true);
      setRenderError(null);
      const startTime = performance.now();

      try {
        // 1. Check diagnostics
        const diags = await WeaveCompilerService.checkSource(source, filePath);
        setDiagnostics(diags);

        // 2. Transpile to TSX/JSX
        const js = await WeaveCompilerService.compileToJs(source, filePath);
        setCompiledJs(js);

        // 3. Generate an offline HTML runner from the same compiled TSX.
        const html = createStandaloneHtmlFromTsx(js, 'Weave Live Preview');
        setCompiledHtml(html);

        setCompilationTime(Math.round(performance.now() - startTime));
      } catch (err: any) {
        console.error('LivePreview compilation failed:', err);
        setRenderError(err?.message || String(err));
      } finally {
        setIsCompiling(false);
      }
    },
    [filePath]
  );

  useEffect(() => {
    if (!autoCompile) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      compileSource(code);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [code, autoCompile, debounceMs, compileSource]);

  // Initial compilation on mount
  useEffect(() => {
    compileSource(code);
  }, []);

  const hasErrors = diagnostics.some((d) => d.severity === 'error');

  // Instantiate dynamic React component
  const DynamicComponent = useMemo(() => {
    if (!compiledJs || hasErrors) return null;
    return createComponentFromTsx(compiledJs);
  }, [compiledJs, reloadKey, hasErrors]);

  const handleCopyCode = () => {
    if (!compiledJs) return;
    navigator.clipboard.writeText(compiledJs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    setReloadKey((prev) => prev + 1);
    compileSource(code);
  };

  // Handle click on rendered elements inside preview
  const handlePreviewElementClick = (e: React.MouseEvent) => {
    if (!isInspectMode) return;
    const target = e.target as HTMLElement;
    if (!target || target === previewContainerRef.current) return;

    // Get tag or element type
    let tagName = target.tagName.toLowerCase();
    if (tagName === 'button') tagName = 'Button';
    else if (tagName === 'span' || tagName === 'p') tagName = 'Text';
    else if (tagName === 'input') tagName = 'TextField';
    else if (tagName === 'div') {
      const isHorizontal = window.getComputedStyle(target).flexDirection === 'row';
      tagName = isHorizontal ? 'HStack' : 'VStack';
    }

    const rect = target.getBoundingClientRect();
    setSelectedElement({
      tagName,
      innerText: target.innerText || (target as HTMLInputElement).value || '',
      className: target.className,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    });
  };

  return (
    <div
      data-testid="live-preview-container"
      className={`flex flex-col bg-[#08090c] border-l border-white/[0.05] text-[#F9FAFB] h-full select-none relative overflow-hidden ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#08090c] border-b border-white/[0.05] text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#FF9D00]" />
          <span className="font-semibold text-[#F9FAFB]">Preview</span>
          <span className="text-[#6B7280] text-[10px] bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.05] font-mono">
            {filePath}
          </span>
          {isCompiling ? (
            <span className="flex items-center gap-1 text-[#FF9D00] text-[11px] font-mono">
              <RefreshCw className="w-3 h-3 animate-spin" /> Compiling...
            </span>
          ) : hasErrors ? (
            <span className="flex items-center gap-1 text-red-400 text-[11px] font-mono">
              <AlertCircle className="w-3 h-3" /> Error
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-mono">
              <CheckCircle2 className="w-3 h-3" /> Ready ({compilationTime}ms)
            </span>
          )}
        </div>

        {/* View Mode Switcher + Point & Prompt Inspector Toggle */}
        <div className="flex items-center gap-2">
          {/* Point & Prompt Toggle */}
          <button
            onClick={() => {
              setIsInspectMode(!isInspectMode);
              if (isInspectMode) setSelectedElement(null);
            }}
            data-testid="btn-toggle-inspect-mode"
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors border ${
              isInspectMode
                ? 'bg-[#FF9D00]/15 text-[#FF9D00] border-[#FF9D00]/30 font-medium'
                : 'bg-white/[0.03] text-[#6B7280] border-white/[0.05] hover:text-[#F9FAFB]'
            }`}
            title="Toggle Point & Prompt Element Inspector"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Point & Prompt</span>
          </button>

          <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.05]">
            <button
              onClick={() => setActiveTab('preview')}
              data-testid="tab-preview"
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs transition-colors ${
                activeTab === 'preview'
                  ? 'bg-white/[0.08] text-[#F9FAFB] font-medium border border-white/[0.08]'
                  : 'text-[#6B7280] hover:text-[#F9FAFB]'
              }`}
              title="Interactive Component Preview"
            >
              <Eye className="w-3 h-3" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              data-testid="tab-code"
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs transition-colors ${
                activeTab === 'code'
                  ? 'bg-white/[0.08] text-[#F9FAFB] font-medium border border-white/[0.08]'
                  : 'text-[#6B7280] hover:text-[#F9FAFB]'
              }`}
              title="View Compiled TSX/JSX"
            >
              <Code2 className="w-3 h-3" />
              <span>TSX</span>
            </button>
            <button
              onClick={() => setActiveTab('html')}
              data-testid="tab-html"
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs transition-colors ${
                activeTab === 'html'
                  ? 'bg-white/[0.08] text-[#F9FAFB] font-medium border border-white/[0.08]'
                  : 'text-[#6B7280] hover:text-[#F9FAFB]'
              }`}
              title="Standalone HTML Runner"
            >
              <Globe className="w-3 h-3" />
              <span>HTML</span>
            </button>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              data-testid="btn-refresh-preview"
              className="p-1 hover:bg-white/[0.06] rounded-md text-[#6B7280] hover:text-[#F9FAFB] transition-colors"
              title="Reload Preview"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/[0.06] rounded-md text-[#6B7280] hover:text-[#F9FAFB] transition-colors ml-1"
                title="Close Preview"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto relative custom-scrollbar bg-[#08090c]">
        {/* Subtle Floating Diagnostic Errors Banner (Non-intrusive, expands on click) */}
        {hasErrors && (
          <div className="absolute bottom-4 left-4 right-4 z-30 flex flex-col gap-1.5 p-2.5 rounded-xl bg-[#14080a]/95 border border-red-500/30 backdrop-blur-xl shadow-floating text-xs">
            <div
              onClick={() => setIsDiagnosticsExpanded(!isDiagnosticsExpanded)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-1.5 text-red-300 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>Compilation Diagnostics ({diagnostics.filter((d) => d.severity === 'error').length} error):</span>
                <span className="text-red-400 font-mono text-[11px] truncate max-w-xs">
                  {diagnostics.find((d) => d.severity === 'error')?.message}
                </span>
              </div>
              <span className="text-[10px] text-red-400/80 font-mono underline ml-2">
                {isDiagnosticsExpanded ? 'Collapse' : 'Expand'}
              </span>
            </div>

            {isDiagnosticsExpanded && (
              <div className="pt-2 border-t border-red-500/20 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                {diagnostics
                  .filter((d) => d.severity === 'error')
                  .map((d, i) => (
                    <div key={i} className="pl-5 text-red-300/90 font-mono text-[11px]">
                      • Line {d.line}:{d.column} - {d.message}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Render Error */}
        {renderError && (
          <div className="bg-amber-950/40 border-b border-amber-800/40 px-4 py-2 text-xs text-amber-200">
            <div className="font-semibold">Runtime Warning:</div>
            <div className="font-mono text-[11px] mt-0.5">{renderError}</div>
          </div>
        )}

        {/* Tab 1: Interactive Component Live Preview */}
        {activeTab === 'preview' && (
          <div className="w-full h-full p-6 flex flex-col items-center justify-start overflow-auto">
            {isInspectMode && (
              <div className="mb-3 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-[#FF9D00] font-mono flex items-center gap-1.5 shadow-sm">
                <Crosshair className="w-3 h-3 text-[#FF9D00]" />
                <span>Point & Prompt Active: Click any component below to prompt AI directives</span>
              </div>
            )}

            <div
              ref={previewContainerRef}
              onClick={handlePreviewElementClick}
              data-testid="interactive-preview-pane"
              className="w-full max-w-lg bg-[#0d0f17] rounded-2xl border border-white/[0.05] shadow-2xl p-6 text-neutral-100 font-sans weave-live-container relative backdrop-blur-md"
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
              }}
            >
              {/* Base Component Styling Injection */}
              <style>{`
                .weave-live-container button {
                  background: #2563eb;
                  color: #ffffff;
                  border: none;
                  padding: 8px 16px;
                  border-radius: 8px;
                  font-size: 14px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.15s ease;
                }
                .weave-live-container button:hover {
                  background: #1d4ed8;
                  box-shadow: 0 0 12px rgba(37, 99, 235, 0.4);
                }
                .weave-live-container button:active {
                  transform: scale(0.98);
                }
                .weave-live-container span {
                  font-size: 16px;
                  font-weight: 500;
                  color: #f3f4f6;
                }
                .weave-live-container input[type="text"] {
                  background: #141722;
                  border: 1px solid rgba(255,255,255,0.1);
                  color: #ffffff;
                  padding: 8px 14px;
                  border-radius: 8px;
                  font-size: 14px;
                  outline: none;
                  transition: border-color 0.15s ease;
                }
                .weave-live-container input[type="text"]:focus {
                  border-color: #ff9d00;
                  box-shadow: 0 0 10px rgba(255, 157, 0, 0.25);
                }
                /* Inspectable elements */
                .weave-live-container button,
                .weave-live-container span,
                .weave-live-container input,
                .weave-live-container div {
                  cursor: pointer;
                }
              `}</style>

              {DynamicComponent ? (
                <DynamicComponent />
              ) : (
                <div className="text-center py-8 text-[#6B7280] text-sm">
                  <span>No visual component rendered. Check your Weave component definition.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Compiled TSX Code Viewer */}
        {activeTab === 'code' && (
          <div className="relative w-full h-full p-4 overflow-auto bg-[#08090c]">
            <button
              onClick={handleCopyCode}
              className="absolute top-6 right-6 flex items-center gap-1 px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-[#F9FAFB] text-xs rounded-lg border border-white/[0.06] transition-colors shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy TSX'}</span>
            </button>
            <pre
              data-testid="compiled-tsx-code"
              className="font-mono text-xs text-neutral-300 leading-relaxed overflow-x-auto select-text p-2"
            >
              {compiledJs || '// Compiling...'}
            </pre>
          </div>
        )}

        {/* Tab 3: Standalone HTML Iframe Runner */}
        {activeTab === 'html' && (
          <div className="w-full h-full bg-white">
            <iframe
              key={`html-${reloadKey}-${compiledHtml.length}`}
              data-testid="html-preview-iframe"
              title="Weave App Sandbox"
              srcDoc={compiledHtml}
              sandbox="allow-scripts allow-modals"
              className="w-full h-full border-none"
            />
          </div>
        )}
      </div>

      {/* Point & Prompt Directive Popover */}
      {selectedElement && activeTab === 'preview' && (
        <PointAndPromptPopover
          elementInfo={selectedElement}
          onClose={() => setSelectedElement(null)}
          currentCode={code}
          activeFilePath={filePath}
          onApplyCode={(newCode) => {
            onApplyCode(newCode);
            setSelectedElement(null);
          }}
        />
      )}
    </div>
  );
};

export default LivePreview;

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  RefreshCw,
  Code2,
  Eye,
  Globe,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  X,
  Crosshair,
} from 'lucide-react';
import { WeaveCompilerService } from '../services/compilerService';
import { DiagnosticItem } from '../types';
import { PointAndPromptPopover, SelectedElementInfo } from './AI/PointAndPromptPopover';

export interface LivePreviewProps {
  code: string;
  filePath?: string;
  autoCompile?: boolean;
  debounceMs?: number;
  className?: string;
  onClose?: () => void;
  onApplyCode?: (newCode: string) => void;
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
  filePath = 'counter.wv',
  autoCompile = true,
  debounceMs = 120,
  className = '',
  onClose,
  onApplyCode = () => {},
}) => {
  const [compiledJs, setCompiledJs] = useState<string>('');
  const [compiledHtml, setCompiledHtml] = useState<string>('');
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compilationTime, setCompilationTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'html'>('preview');
  const [copied, setCopied] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);

  // Point & Prompt Interactive State
  const [isInspectMode, setIsInspectMode] = useState<boolean>(true);
  const [selectedElement, setSelectedElement] = useState<SelectedElementInfo | null>(null);

  const timerRef = useRef<any>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const compileSource = useCallback(async (src: string) => {
    setIsCompiling(true);
    setRenderError(null);
    const start = performance.now();

    try {
      // 1. Check diagnostics
      const diags = await WeaveCompilerService.checkSource(src, filePath);
      setDiagnostics(diags);

      // 2. Transpile to TSX/JSX
      const js = await WeaveCompilerService.compileToJs(src, filePath);
      setCompiledJs(js);

      // 3. Generate HTML runner
      const html = await WeaveCompilerService.compileToHtml(src, 'Weave Live Preview');
      setCompiledHtml(html);

      setCompilationTime(Math.round(performance.now() - start));
    } catch (err: any) {
      setRenderError(err?.message || String(err));
    } finally {
      setIsCompiling(false);
    }
  }, [filePath]);

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
      className={`flex flex-col bg-studio-card backdrop-blur-xl border-l border-studio-border text-neutral-200 h-full select-none relative overflow-hidden shadow-2xl ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-studio-glass border-b border-studio-border text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-bold text-white tracking-wide">Live Preview</span>
          <span className="text-neutral-400 text-[10px] bg-neutral-900/80 px-1.5 py-0.5 rounded-full border border-neutral-700/60 font-mono">
            {filePath}
          </span>
          {isCompiling ? (
            <span className="flex items-center gap-1 text-amber-400 text-[11px] font-mono">
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
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors border ${
              isInspectMode
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-glow-cyan font-medium'
                : 'bg-neutral-900/60 text-neutral-400 border-neutral-700/60 hover:text-white'
            }`}
            title="Toggle Point & Prompt Element Inspector"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Point & Prompt</span>
          </button>

          <div className="flex items-center gap-1 bg-neutral-900/90 p-0.5 rounded-lg border border-neutral-700/80">
            <button
              onClick={() => setActiveTab('preview')}
              data-testid="tab-preview"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors ${
                activeTab === 'preview'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm border border-cyan-500/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Interactive Component Preview"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              data-testid="tab-code"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors ${
                activeTab === 'code'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm border border-cyan-500/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="View Compiled TSX/JSX"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>TSX</span>
            </button>
            <button
              onClick={() => setActiveTab('html')}
              data-testid="tab-html"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors ${
                activeTab === 'html'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm border border-cyan-500/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Standalone HTML Runner"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>HTML</span>
            </button>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              data-testid="btn-refresh-preview"
              className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-300 hover:text-white transition-colors"
              title="Reload Preview"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors ml-1"
                title="Close Preview"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto relative custom-scrollbar">
        {/* Diagnostic Errors Banner */}
        {hasErrors && (
          <div className="bg-red-950/80 border-b border-red-800/80 px-4 py-2.5 text-xs text-red-200 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400" />
              Compilation Diagnostics ({diagnostics.filter((d) => d.severity === 'error').length} error):
            </div>
            {diagnostics
              .filter((d) => d.severity === 'error')
              .map((d, i) => (
                <div key={i} className="pl-5 text-red-300/90 font-mono text-[11px]">
                  • Line {d.line}:{d.column} - {d.message}
                </div>
              ))}
          </div>
        )}

        {/* Render Error */}
        {renderError && (
          <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-2 text-xs text-amber-200">
            <div className="font-semibold">Runtime Warning:</div>
            <div className="font-mono text-[11px] mt-0.5">{renderError}</div>
          </div>
        )}

        {/* Tab 1: Interactive Component Live Preview */}
        {activeTab === 'preview' && (
          <div className="w-full h-full p-6 flex flex-col items-center justify-start overflow-auto studio-canvas-bg">
            {isInspectMode && (
              <div className="mb-3 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-300 font-mono flex items-center gap-1.5 shadow-sm">
                <Crosshair className="w-3 h-3 text-cyan-400" />
                <span>Point & Prompt Active: Click any component below to prompt AI directives</span>
              </div>
            )}

            <div
              ref={previewContainerRef}
              onClick={handlePreviewElementClick}
              data-testid="interactive-preview-pane"
              className="w-full max-w-lg bg-[#141824]/90 rounded-2xl border border-neutral-700/80 shadow-2xl p-6 text-neutral-100 font-sans weave-live-container relative backdrop-blur-md"
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
                  background: #1e2230;
                  border: 1px solid #333d52;
                  color: #ffffff;
                  padding: 8px 14px;
                  border-radius: 8px;
                  font-size: 14px;
                  outline: none;
                  transition: border-color 0.15s ease;
                }
                .weave-live-container input[type="text"]:focus {
                  border-color: #00e5ff;
                  box-shadow: 0 0 10px rgba(0, 229, 255, 0.25);
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
                <div className="text-center py-8 text-neutral-400 text-sm">
                  <span className="text-neutral-500">No visual component rendered. Check your Weave component definition.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Compiled TSX Code Viewer */}
        {activeTab === 'code' && (
          <div className="relative w-full h-full p-4 overflow-auto bg-[#0a0c10]">
            <button
              onClick={handleCopyCode}
              className="absolute top-6 right-6 flex items-center gap-1 px-2.5 py-1 bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 text-xs rounded-lg border border-neutral-700 transition-colors shadow-sm"
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

      {/* Footer Info */}
      <div className="flex items-center justify-between px-4 py-2 bg-studio-glass border-t border-studio-border text-[11px] text-neutral-400 font-mono">
        <div className="flex items-center gap-2">
          <span>Target: <strong className="text-cyan-400">React TSX</strong></span>
          <span>•</span>
          <span>Engine: <strong className="text-amber-400">WASM Compiler</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span>{compiledJs.length} bytes</span>
        </div>
      </div>
    </div>
  );
};

export default LivePreview;

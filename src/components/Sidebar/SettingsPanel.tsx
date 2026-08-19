import { Sliders, Code2, Cpu } from 'lucide-react';
import { WorkspaceSettings } from '../../types';

interface SettingsPanelProps {
  settings: WorkspaceSettings;
  onUpdateSettings: (newSettings: Partial<WorkspaceSettings>) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdateSettings,
}) => {
  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-3 space-y-6 text-editor-text select-none">
      <div className="flex items-center space-x-2 border-b border-editor-border pb-2">
        <Sliders className="w-4 h-4 text-amber-400" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-editor-text">
          Workspace Settings
        </h2>
      </div>

      {/* Editor Preferences */}
      <div className="space-y-3">
        <div className="flex items-center space-x-1.5 text-xs font-medium text-amber-400">
          <Code2 className="w-4 h-4" />
          <span>Editor Configuration</span>
        </div>

        <div className="space-y-3 pl-2 text-xs">
          <div>
            <label className="block text-editor-muted mb-1">Theme</label>
            <div className="relative">
              <select
                value={settings.theme}
                onChange={(e) =>
                  onUpdateSettings({ theme: e.target.value as WorkspaceSettings['theme'] })
                }
                className="w-full bg-editor-bg border border-editor-border rounded px-2.5 py-1.5 text-xs text-editor-text focus:outline-none focus:border-amber-500"
              >
                <option value="weave-dark">Weave Dark (Default)</option>
                <option value="weave-obsidian">Weave Obsidian (OLED)</option>
                <option value="weave-light">Weave Light</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-editor-muted mb-1">Font Size ({settings.fontSize}px)</label>
              <input
                type="range"
                min="11"
                max="24"
                value={settings.fontSize}
                onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </div>
            <div>
              <label className="block text-editor-muted mb-1">Tab Size</label>
              <select
                value={settings.tabSize}
                onChange={(e) => onUpdateSettings({ tabSize: Number(e.target.value) })}
                className="w-full bg-editor-bg border border-editor-border rounded px-2.5 py-1 text-xs text-editor-text"
              >
                <option value={2}>2 Spaces</option>
                <option value={4}>4 Spaces</option>
                <option value={8}>8 Spaces</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.minimap}
                onChange={(e) => onUpdateSettings({ minimap: e.target.checked })}
                className="rounded border-editor-border text-amber-500 focus:ring-0 accent-amber-500"
              />
              <span className="text-editor-text">Show Code Minimap</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => onUpdateSettings({ autoSave: e.target.checked })}
                className="rounded border-editor-border text-amber-500 focus:ring-0 accent-amber-500"
              />
              <span className="text-editor-text">Auto-Save on Change</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.formatOnSave}
                onChange={(e) => onUpdateSettings({ formatOnSave: e.target.checked })}
                className="rounded border-editor-border text-amber-500 focus:ring-0 accent-amber-500"
              />
              <span className="text-editor-text">Format .wv on Save</span>
            </label>
          </div>
        </div>
      </div>

      {/* Weave Compiler & Loom Runtime Options */}
      <div className="space-y-3">
        <div className="flex items-center space-x-1.5 text-xs font-medium text-amber-400">
          <Cpu className="w-4 h-4" />
          <span>Weave Compiler & Loom</span>
        </div>

        <div className="space-y-3 pl-2 text-xs">
          <div>
            <label className="block text-editor-muted mb-1">Compilation Backend</label>
            <select
              value={settings.weaveCompilerMode}
              onChange={(e) =>
                onUpdateSettings({
                  weaveCompilerMode: e.target.value as WorkspaceSettings['weaveCompilerMode'],
                })
              }
              className="w-full bg-editor-bg border border-editor-border rounded px-2.5 py-1.5 text-xs text-editor-text focus:outline-none focus:border-amber-500"
            >
              <option value="loom-vm">Loom VM (Concurrent JIT)</option>
              <option value="llvm-native">Native LLVM Binary</option>
              <option value="wasm">WebAssembly (WASM+WASI)</option>
            </select>
          </div>

          <div>
            <label className="block text-editor-muted mb-1">Optimization Profile</label>
            <select
              value={settings.weaveOptLevel}
              onChange={(e) =>
                onUpdateSettings({
                  weaveOptLevel: e.target.value as WorkspaceSettings['weaveOptLevel'],
                })
              }
              className="w-full bg-editor-bg border border-editor-border rounded px-2.5 py-1.5 text-xs text-editor-text focus:outline-none focus:border-amber-500"
            >
              <option value="debug">Debug (-O0 with Loom Traces)</option>
              <option value="release">Release (-O3 Optimized)</option>
              <option value="speed">Max Speed (Fiber Threadpool Fastpath)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Environment info */}
      <div className="pt-4 border-t border-editor-border text-[11px] text-editor-muted space-y-1">
        <div className="flex justify-between">
          <span>Weave Compiler:</span>
          <span className="font-mono text-amber-400 font-semibold">v2.4.0</span>
        </div>
        <div className="flex justify-between">
          <span>Tauri Desktop Host:</span>
          <span className="font-mono text-editor-text">v2.2.0</span>
        </div>
        <div className="flex justify-between">
          <span>Monaco Engine:</span>
          <span className="font-mono text-editor-text">v0.52.2</span>
        </div>
      </div>
    </div>
  );
};

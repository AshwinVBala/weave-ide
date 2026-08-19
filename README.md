# Weave IDE (`weave-ide`)

A high-performance, cross-platform desktop IDE tailored specifically for the **Weave** concurrent programming language, built with **Tauri 2**, **React 19**, **TypeScript**, **Tailwind CSS**, and **Monaco Editor**.

---

## 🚀 Key Features

1. **Custom Monaco Editor Integration for Weave (`.wv` & `.weave`)**:
   - Custom Monarch lexer and tokenizer highlighting Weave keywords (`strand`, `loom`, `weave`, `pattern`, `async`, `await`, `fn`, `struct`, `match`, etc.).
   - Specialized syntax tokenization for Weave stream and channel operators (`~>`, `<~`, `|>`, `->`, `=>`).
   - Bracket matching, auto-closing pairs, block indentation, and folding rules.
   - Built-in Monaco themes (`weave-dark`, `weave-obsidian`, `weave-light`).
   - Snippets and auto-completions for functions, strand actors, loom threadpools, and pipeline expressions.
   - Rich hover tooltips with type and documentation previews.

2. **Cross-Platform Tauri 2 IPC File System Backend**:
   - Native Rust IPC commands (`list_dir`, `read_file`, `write_file`, `create_file`, `create_dir`, `delete_entry`).
   - Seamless dual-mode file system layer: detects Tauri desktop runtime with automatic fallback to an in-memory virtual file system for web previews and automated tests.

3. **Modern Collapsible IDE Layout**:
   - **Activity Bar**: Quick switching between File Explorer, Workspace Search, Loom Concurrency Monitor, and Settings.
   - **File Explorer**: Recursive directory tree with inline file/folder creation, deletion, and active file tracking.
   - **Search Panel**: Workspace-wide text search across all `.wv` files and modules.
   - **Loom Concurrency Monitor**: Real-time visualization of active strands, lightweight fibers, threadpools, and memory allocations.
   - **Workspace Settings**: Customize editor font size, tab spacing, word wrap, minimap, auto-save, themes, and Weave compiler targets.

4. **Integrated Terminal & Diagnostic Panel**:
   - Resizable bottom panel with tabs for **Terminal**, **Output / Compiler Logs**, **Problems & Diagnostics**, and **Loom Strands**.
   - Interactive CLI shell supporting `weave run`, `weave check`, `weave build`, `weave test`, `cat`, `ls`, `clear`, and `help`.
   - Error marker reporting with file/line/column navigation.

5. **Keyboard Shortcuts**:
   - `Ctrl+S` / `Cmd+S`: Save active file
   - `F5`: Run active Weave file with Loom compiler
   - `Ctrl+Shift+B` / `Cmd+Shift+B`: Build release target
   - `Ctrl+B` / `Cmd+B`: Toggle primary sidebar
   - `Ctrl+\`` / `Cmd+\``: Toggle bottom terminal panel
   - `Ctrl+N` / `Cmd+N`: Create new untitled `.wv` file
   - `Ctrl+W` / `Cmd+W`: Close active editor tab

---

## 🛠️ Project Structure

```
weave-ide/
├── src-tauri/                     # Tauri 2 Desktop Rust Backend
│   ├── Cargo.toml                 # Cargo dependencies (tauri v2, serde, etc.)
│   ├── tauri.conf.json            # Tauri v2 configuration
│   ├── capabilities/              # Tauri v2 security capabilities
│   └── src/
│       ├── main.rs                # Desktop entry point
│       ├── lib.rs                 # Plugin setup & IPC command registration
│       └── fs_commands.rs         # Native file system IPC handlers
├── src/                           # React + TypeScript Frontend
│   ├── components/
│   │   ├── ActivityBar.tsx        # Left tool switcher
│   │   ├── HeaderBar.tsx          # App header & quick actions (Run, Build, Save)
│   │   ├── StatusBar.tsx          # Status indicators (Loom status, Ln/Col, Encoding)
│   │   ├── Common/
│   │   │   ├── FileIcon.tsx       # Custom Weave & filetype badges
│   │   │   └── Modal.tsx          # Modals for new files/folders/deletions
│   │   ├── Editor/
│   │   │   ├── MonacoEditor.tsx   # Monaco editor instance with Weave tokens
│   │   │   ├── EditorTabs.tsx     # Tab strip with dirty state and close buttons
│   │   │   ├── Breadcrumbs.tsx    # File path navigation
│   │   │   └── EmptyEditor.tsx    # Welcome & quick start screen
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx        # Resizable/collapsible sidebar wrapper
│   │   │   ├── FileExplorer.tsx   # Recursive file tree explorer
│   │   │   ├── SearchPanel.tsx    # Workspace search
│   │   │   ├── SettingsPanel.tsx  # Editor & compiler preferences
│   │   │   └── LoomMonitorPanel.tsx # Concurrency strands visualizer
│   │   └── Terminal/
│   │       ├── TerminalPanel.tsx  # Collapsible bottom panel
│   │       └── InteractiveTerminal.tsx # Weave interactive shell & CLI
│   ├── monaco/
│   │   ├── weaveLanguage.ts       # Monarch tokenizer & keywords for .wv
│   │   ├── weaveConfiguration.ts  # Auto-closing brackets & comments
│   │   ├── weaveThemes.ts         # Custom dark/obsidian/light themes
│   │   └── registerWeave.ts       # Monaco registry, snippets & hover docs
│   ├── services/
│   │   ├── fsService.ts           # Dual-mode Tauri IPC / Virtual FS bridge
│   │   ├── compilerService.ts     # Weave runtime & AST diagnostics engine
│   │   └── mockWorkspace.ts       # Preloaded sample Weave project files
│   ├── test/                      # Vitest unit & component test suite
│   │   ├── setup.ts
│   │   ├── layout.test.tsx
│   │   ├── monaco.test.tsx
│   │   ├── fs.test.tsx
│   │   └── terminal.test.tsx
│   ├── types/                     # TypeScript definitions
│   ├── App.tsx                    # Main layout & state orchestrator
│   ├── index.css                  # Tailwind styles & custom scrollbars
│   └── main.tsx                   # React root render
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 🚦 Getting Started

### Prerequisites
- Node.js (v18+)
- Rust & Cargo (1.70+)

### Running Frontend in Dev Mode (Browser Preview)
```bash
npm run dev
```
Open [http://localhost:1420](http://localhost:1420) in your browser.

### Running as Tauri Desktop Application
```bash
npm run tauri dev
```

### Running Automated Test Suite
```bash
npm run test
```

### Building for Production
```bash
npm run build
npm run tauri build
```

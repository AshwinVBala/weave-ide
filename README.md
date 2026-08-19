<p align="center">
  <img src="src-tauri/icons/icon.png" width="96" alt="Weave IDE icon" />
</p>

# Weave IDE

Weave IDE is a native desktop development environment for the Weave programming
language. It combines a Monaco-based editor, live component preview, the Weave
compiler, an interactive terminal, diagnostics, and provider-backed AI assistance
in one Tauri application.

The current release is **0.1.0** and should be treated as a distributable beta.
Local bundles are functional but unsigned; public releases still require platform
signing and notarization.

## What works today

- **Real workspaces:** Open any local folder through the native picker. Create,
  rename, delete, search, edit, and save files without a virtual or hardcoded
  workspace.
- **A full code editor:** Monaco is bundled locally for offline desktop use. Weave
  files have custom syntax highlighting, snippets, completions, hover help,
  diagnostics, bracket handling, and dedicated dark, Obsidian, and light themes.
  Common languages such as YAML, JSON, Markdown, TypeScript, JavaScript, HTML,
  CSS, Python, and Rust are also recognized.
- **Weave live preview:** Compile `.wv` and `.weave` UI components in the
  background and inspect an interactive preview, generated TSX, or standalone
  sandboxed HTML. Point & Prompt can target a rendered element for an AI edit.
- **Bundled compiler:** Desktop installers contain the native `weave` compiler as
  a Tauri sidecar. Users do not need to install a separate compiler to check,
  run, or build Weave projects.
- **Terminal and diagnostics:** Use a real desktop shell, run Weave commands,
  inspect compiler output, navigate problems, and view Loom telemetry when the
  runtime reports it.
- **AI-assisted editing:** Use the right-side Agent, the global Prompt Studio, or
  inline `Cmd/Ctrl+K`. Proposed file changes are shown as patches for review
  before they are applied.
- **Responsive workbench:** The explorer, agent, preview, terminal, header, and
  status bar adapt to compact windows without crushing the editor.

## AI accounts and API keys

Weave IDE does not require every user to supply an API key. Open **Settings → AI
Accounts** and choose an authentication mode per provider.

| Provider | Account mode | API-key mode |
| --- | --- | --- |
| OpenAI | Uses the signed-in `codex` client | OpenAI developer API billing |
| Anthropic | Uses the signed-in `claude` client | Anthropic Console billing |
| Google | Uses the signed-in Antigravity `agy` client | Google AI API billing |
| Ollama | Local runtime; no account required | Not applicable |

Account mode delegates authentication and execution to the provider's official
local client. Weave IDE checks client status but does not read or copy OAuth
tokens. Available models and included usage are determined by the provider and
the user's plan.

In API-key mode, the key is verified against the provider and stored in the
operating-system credential store—not in workspace files or browser storage.
Prompts and selected code are sent only when the user invokes an AI action.

## Install and run

Published installers will appear on the repository's
[Releases page](https://github.com/AshwinVBala/weave-ide/releases). Until a signed
release is published, build the app locally.

### Requirements

- Node.js LTS and npm
- Current stable Rust toolchain with Cargo
- The platform dependencies required by
  [Tauri 2](https://v2.tauri.app/start/prerequisites/)

Clone and start the native app:

```bash
git clone https://github.com/AshwinVBala/weave-ide.git
cd weave-ide
npm ci
npm run tauri dev
```

The first launch presents an **Open Project Folder** action. The selected folder
and most recently opened file are remembered locally.

### Browser-only development

```bash
npm run dev
```

Vite runs at `http://localhost:1420`. Browser mode uses the in-memory sample
workspace and the WASM compiler bridge; native file access, the real shell,
credential storage, provider clients, and the bundled native compiler require
Tauri.

## Everyday commands

| Command | Purpose |
| --- | --- |
| `npm run tauri dev` | Run the complete native IDE in development mode |
| `npm run dev` | Run the browser-only frontend |
| `npm test` | Run the Vitest component and integration suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build` | Type-check and build the frontend |
| `npm run sidecar:build` | Build the vendored Weave compiler for the host target |
| `npm run release:validate` | Validate versions, metadata, icons, CSP, and release files |
| `npm run release:check` | Run the complete frontend, Rust, and compiler release gate |
| `npm run bundle` | Validate and create platform installers |

## Keyboard shortcuts

Use `Cmd` on macOS and `Ctrl` on Windows/Linux.

| Shortcut | Action |
| --- | --- |
| `Cmd/Ctrl+P` | Quick-open a workspace file |
| `Cmd/Ctrl+K` | Open Prompt Studio; inside Monaco, open the inline AI prompt |
| `Cmd/Ctrl+S` | Save the active file |
| `Cmd/Ctrl+B` | Toggle the primary sidebar |
| `Cmd/Ctrl+Shift+B` | Build the current Weave project |
| `Cmd/Ctrl+L` | Toggle the Agent panel |
| `Cmd/Ctrl+\`` | Toggle the terminal and diagnostics panel |
| `Cmd/Ctrl+N` | Create an untitled Weave file |
| `F5` | Run the active Weave file |

## Architecture

```text
weave-ide/
├── src/                         React 19 workbench and services
│   ├── components/              Editor, explorer, preview, terminal, and AI UI
│   ├── monaco/                  Local Monaco setup and Weave language support
│   ├── services/                File, compiler, terminal, and AI bridges
│   ├── workers/                 Browser WASM compiler worker
│   └── test/                    Vitest test suite
├── src-tauri/                   Tauri 2 native host
│   ├── src/fs_commands.rs       Workspace and compiler commands
│   ├── src/terminal_commands.rs Native shell and Git commands
│   ├── src/ai_commands.rs       Provider clients, APIs, and credential storage
│   └── capabilities/            Desktop permission policy
├── vendor/weave-core/           Compiler source embedded into release builds
├── scripts/                     Sidecar build and release validation
└── .github/workflows/           Cross-platform draft release workflow
```

The frontend communicates with the Rust host through a narrow Tauri command
surface. Desktop file failures remain visible rather than silently falling back
to mock data. Browser mocks exist only for frontend development and tests.

## Testing

Run the complete frontend suite:

```bash
npm test
```

Run the same release gate used before packaging:

```bash
npm run release:check
```

Coverage includes workspace state, file operations, native terminal routing,
Monaco language integration, WASM and native compiler paths, live preview,
navigation, responsive workbench components, provider execution, and AI patch
review.

## Building installers

```bash
npm ci
npm run release:check
npm run bundle
```

Artifacts are written to `src-tauri/target/release/bundle/`. The manual
[`Desktop Release`](.github/workflows/release.yml) workflow builds draft artifacts
for macOS Apple Silicon, macOS Intel, Windows, and Linux.

Before a public release, confirm the permanent application identifier and
publisher metadata, then configure Apple and Windows signing credentials.
Automatic updates are intentionally disabled until a permanent HTTPS update
endpoint and protected updater signing key exist. See
[DISTRIBUTION.md](DISTRIBUTION.md) for the release checklist.

## Security notes

- Production builds use an explicit content security policy.
- Monaco, its fonts, and its workers are bundled locally; the editor does not
  depend on a CDN.
- HTML preview runs in a sandboxed iframe.
- API keys use the native OS credential store.
- Provider-account tokens remain inside the providers' official clients.
- AI-generated patches remain reviewable before application.

## Troubleshooting

**A file remains on “Loading…”**

Fully quit any older installed build and install or rebuild the current version.
Current builds package Monaco locally.

**Run or Build cannot find Weave**

Use a desktop bundle produced by `npm run bundle`, or run
`npm run sidecar:build` before a custom Tauri build. Browser mode provides only
the WASM compiler bridge.

**An AI provider says it is disconnected**

Install and sign in to the provider's official client for Account mode, or switch
that provider to API-key mode in Settings. Model access still depends on the
provider account and selected model.

**The preview reports a compile error**

Open the Problems tab for source locations, or switch Preview to TSX/HTML to
inspect generated output. Preview is intended for Weave UI components; arbitrary
HTML files remain editable but are not compiled as Weave components.

## License

Copyright © 2026 Weave IDE contributors. All rights reserved. A final public
distribution license has not yet been selected. The bundled compiler's third-party
license information is recorded in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

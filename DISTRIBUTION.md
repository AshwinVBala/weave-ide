# Weave IDE Distribution Guide

## Release readiness

The repository builds self-contained desktop bundles. The native Weave compiler
is compiled from `vendor/weave-core` and embedded as a per-platform Tauri sidecar,
so end users do not need to install the compiler separately.

Run the complete local release gate:

```bash
npm ci
npm run release:check
npm run bundle
```

Bundles are written below `src-tauri/target/release/bundle/`.

## Before a public release

1. Replace `com.weave.ide` with an identifier controlled by the publisher before
   the first public build. Never change it after customers install the app.
2. Confirm the publisher name, copyright ownership, and final distribution license.
3. Update the version in `package.json`, `src-tauri/Cargo.toml`, and
   `src-tauri/tauri.conf.json`. `npm run release:validate` rejects mismatches.
4. Obtain platform signing credentials:
   - macOS: Developer ID Application certificate and Apple notarization credentials.
   - Windows: an Authenticode certificate or Azure Artifact Signing configuration.
   - Linux: optional GPG signing for AppImage and repository metadata.
5. Run the GitHub `Desktop Release` workflow. It creates a draft release so every
   installer can be smoke-tested before publication.
6. Test installation, first launch, folder selection, editing, saving, preview,
   compiler check/build/run, terminal commands, and AI account/API-key modes on
   clean machines for every target architecture.

## Signing and updates

Unsigned local bundles are suitable for development and internal testing only.
macOS distribution outside the App Store requires signing and notarization;
Windows users will receive SmartScreen warnings without signing.

Automatic updates are intentionally disabled until a permanent HTTPS release
endpoint and Tauri updater signing key are available. Do not enable updater
artifacts without securely backing up that private key.

## External AI providers

Account-mode AI requires the provider's official local client (Codex, Claude, or
Antigravity) to be installed and signed in. API-key mode does not require those
clients; keys are stored in the operating-system credential store. Ollama remains
an optional local installation.

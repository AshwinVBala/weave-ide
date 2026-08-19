import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const packageJson = readJson('package.json');
const tauriConfig = readJson('src-tauri/tauri.conf.json');
const cargoToml = readFileSync(resolve(root, 'src-tauri/Cargo.toml'), 'utf8');
const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const failures = [];

if (packageJson.version !== tauriConfig.version || cargoVersion !== tauriConfig.version) {
  failures.push(
    `Version mismatch: package=${packageJson.version}, tauri=${tauriConfig.version}, cargo=${cargoVersion}`
  );
}
if (tauriConfig.productName !== 'Weave IDE') failures.push('productName must be "Weave IDE".');
if (!tauriConfig.identifier || tauriConfig.identifier === 'com.tauri.dev') {
  failures.push('A stable application identifier is required.');
}
if (!tauriConfig.app?.security?.csp) failures.push('Production CSP must not be disabled.');
if (!tauriConfig.app?.security?.csp?.includes("object-src 'none'")) {
  failures.push("Production CSP must disable object-src.");
}
if (!tauriConfig.bundle?.externalBin?.includes('binaries/weave')) {
  failures.push('The Weave compiler sidecar is not configured for bundling.');
}

for (const icon of tauriConfig.bundle?.icon || []) {
  const path = resolve(root, 'src-tauri', icon);
  if (!existsSync(path) || statSync(path).size < 1024) failures.push(`Invalid bundle icon: ${icon}`);
}

for (const required of [
  'vendor/weave-core/Cargo.toml',
  'vendor/weave-core/src/main.rs',
  'THIRD_PARTY_NOTICES.md',
  'DISTRIBUTION.md',
]) {
  if (!existsSync(resolve(root, required))) failures.push(`Missing release file: ${required}`);
}

if (failures.length) {
  console.error(`Release validation failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Release metadata is consistent for Weave IDE ${tauriConfig.version}.`);

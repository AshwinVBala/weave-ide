import { execFileSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(projectRoot, 'vendor/weave-core/Cargo.toml');
const targetTriple =
  process.env.TAURI_ENV_TARGET_TRIPLE ||
  execFileSync('rustc', ['--print', 'host-tuple'], { encoding: 'utf8' }).trim();

if (!targetTriple || targetTriple === 'universal-apple-darwin') {
  throw new Error(
    'Build each macOS architecture separately; the Weave sidecar cannot be compiled as a universal target in one Cargo invocation.'
  );
}

execFileSync(
  'cargo',
  ['build', '--release', '--locked', '--manifest-path', manifestPath, '--target', targetTriple],
  { cwd: projectRoot, stdio: 'inherit' }
);

const extension = targetTriple.includes('windows') ? '.exe' : '';
const builtBinary = resolve(
  projectRoot,
  `vendor/weave-core/target/${targetTriple}/release/weave${extension}`
);
const bundledBinary = resolve(
  projectRoot,
  `src-tauri/binaries/weave-${targetTriple}${extension}`
);

mkdirSync(dirname(bundledBinary), { recursive: true });
copyFileSync(builtBinary, bundledBinary);
if (!extension) chmodSync(bundledBinary, 0o755);

console.log(`Prepared Weave compiler sidecar: ${bundledBinary}`);

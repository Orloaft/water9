import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildRoot = resolve(process.env.WATER9_DESKTOP_BUILD_DIR ?? `${repoRoot}/.desktop-build`);
const cargoHome = resolve(process.env.CARGO_HOME ?? `${buildRoot}/cargo-home`);
const cargoTargetDir = resolve(process.env.CARGO_TARGET_DIR ?? `${buildRoot}/target`);
const tauriArgs = process.argv.slice(2);

await mkdir(cargoHome, { recursive: true });
await mkdir(cargoTargetDir, { recursive: true });

const env = {
  ...process.env,
  CARGO_HOME: cargoHome,
  CARGO_TARGET_DIR: cargoTargetDir,
};

console.log(`Water9 desktop build dir: ${buildRoot}`);
console.log(`CARGO_HOME=${env.CARGO_HOME}`);
console.log(`CARGO_TARGET_DIR=${env.CARGO_TARGET_DIR}`);

const child = spawn('npx', ['tauri', ...tauriArgs], {
  cwd: repoRoot,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

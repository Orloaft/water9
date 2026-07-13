import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const archiveRoot = process.env.WATER9_SLICE3_OUT_DIR
  ?? '/home/orlovboros/artifacts/managers/water9/swimming-backgrounds-full-implementation-2026-07-13/slice3';
const manifestPath = process.env.WATER9_SLICE3_MANIFEST
  ?? 'runs/swimming-backgrounds-full-implementation-2026-07-13/slice3-artifacts.json';
const previous = JSON.parse(await readFile(manifestPath, 'utf8'));
const previousByPath = new Map((previous.entries ?? []).map((entry) => [entry.relativePath, entry]));

async function walk(directory) {
  const paths = [];
  for (const name of await readdir(directory)) {
    const path = resolve(directory, name);
    const info = await stat(path);
    if (info.isDirectory()) paths.push(...await walk(path));
    else paths.push(path);
  }
  return paths;
}

function verificationRole(path) {
  if (path.endsWith('b4-sustained-25s.json')) return 'strict-sustained-b4-performance-measurement';
  if (path.includes('b4-busy-deep') && path.endsWith('.png')) return 'strict-sustained-b4-runtime-frame';
  if (path.endsWith('save-load.json')) return 'save-load-regression-report';
  if (path.endsWith('controller-sonar.json')) return 'controller-sonar-regression-report';
  if (path.includes('sonar-map-controller') && path.endsWith('.png')) return 'controller-sonar-runtime-frame';
  if (path.endsWith('lighting.json')) return 'lighting-visibility-regression-report';
  if (path.endsWith('depth-continuity.json')) return 'depth-band-continuity-regression-report';
  if (path.endsWith('background-composition.json')) return 'background-composition-regression-report';
  return 'verification-artifact';
}

const entries = [];
for (const absolutePath of (await walk(archiveRoot)).sort()) {
  const relativePath = relative(archiveRoot, absolutePath);
  const bytes = await readFile(absolutePath);
  const prior = previousByPath.get(relativePath) ?? {};
  entries.push({
    relativePath,
    role: relativePath.startsWith('verification/') ? verificationRole(relativePath) : prior.role ?? 'runtime-evidence',
    target: prior.target ?? (relativePath.endsWith('.json') ? 'metadata' : 'canvas'),
    ...Object.fromEntries(Object.entries(prior).filter(([key]) => !['relativePath', 'role', 'target', 'bytes', 'sha256'].includes(key))),
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}

const manifest = {
  ...previous,
  generatedAt: new Date().toISOString(),
  provenance: {
    ...previous.provenance,
    finalizationCommand: 'node tools/finalize_swimming_backgrounds_slice3_manifest.mjs',
    hashAlgorithm: 'sha256',
    captureAndVerificationRoot: archiveRoot,
  },
  summary: {
    ...previous.summary,
    files: entries.length,
    bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
    verificationFiles: entries.filter((entry) => entry.relativePath.startsWith('verification/')).length,
    runtimeErrors: previous.runtimeErrors?.length ?? 0,
  },
  entries,
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, manifestPath, summary: manifest.summary }, null, 2));

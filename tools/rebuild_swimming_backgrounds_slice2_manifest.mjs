import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const repo = '/mnt/nxt-dev/water9';
const artifactRoot = '/home/orlovboros/artifacts/managers/water9/swimming-backgrounds-full-implementation-2026-07-13/slice2';
const manifestPath = resolve(repo, 'runs/swimming-backgrounds-full-implementation-2026-07-13/slice2-artifacts.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const existing = new Map(manifest.artifacts.map((artifact) => [artifact.relativePath, artifact]));
const paths = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else paths.push(path);
  }
}

function inferredRole(relativePath) {
  if (relativePath.startsWith('verification-')) return 'verification-report';
  return 'supporting-evidence';
}

await walk(artifactRoot);
manifest.generatedAt = new Date().toISOString();
manifest.artifacts = [];
for (const path of paths.sort()) {
  const relativePath = relative(artifactRoot, path);
  const prior = existing.get(relativePath) ?? {};
  const bytes = (await stat(path)).size;
  const sha256 = createHash('sha256').update(await readFile(path)).digest('hex');
  manifest.artifacts.push({
    ...prior,
    path,
    relativePath,
    bytes,
    sha256,
    role: prior.role ?? inferredRole(relativePath),
  });
}
manifest.totalBytes = manifest.artifacts.reduce((sum, artifact) => sum + artifact.bytes, 0);
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ manifestPath, artifactCount: manifest.artifacts.length, totalBytes: manifest.totalBytes }, null, 2));

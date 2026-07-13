import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const repo = process.cwd();
const artifactRoot = process.env.WATER9_SLICE1_ARTIFACT_ROOT
  ?? '/home/orlovboros/artifacts/managers/water9/swimming-backgrounds-full-implementation-2026-07-13/slice1';
const outputPath = resolve(repo, 'runs/swimming-backgrounds-full-implementation-2026-07-13/slice1-artifacts.json');

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function roleFor(path) {
  const rel = relative(artifactRoot, path);
  if (rel.startsWith('rejected-')) return 'rejected-comparison-evidence';
  if (rel === 'slice1-visual-evidence.json') return 'normal-play-capture-metrics-and-provenance';
  if (rel === 'b4-canvas-25s-gate.json') return 'settled-b4-canvas-performance-measurement';
  if (rel === 'b4-canvas-25s-gate.log') return 'settled-b4-canvas-performance-log';
  if (rel.endsWith('-grayscale.png') || rel.endsWith('-gray.png')) return 'grayscale-visual-proof';
  if (rel.endsWith('-color.png') || rel.endsWith('-canvas.png')) return 'color-visual-proof';
  if (rel.includes('typescript-baseline')) return 'inherited-typescript-baseline';
  if (rel.includes('typescript-after')) return 'post-change-typescript-result';
  if (rel.includes('lighting-visibility')) return 'lighting-visibility-smoke';
  if (rel.includes('save-load')) return 'save-load-smoke';
  if (rel.includes('presentation')) return 'presentation-smoke';
  return 'supporting-evidence';
}

const evidence = JSON.parse(await readFile(resolve(artifactRoot, 'slice1-visual-evidence.json'), 'utf8'));
const artifacts = [];
for (const path of (await filesUnder(artifactRoot)).sort()) {
  const bytes = await readFile(path);
  artifacts.push({
    path,
    relativePath: relative(artifactRoot, path),
    bytes: (await stat(path)).size,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    role: roleFor(path),
  });
}

const manifest = {
  schema: 'water9/swimming-backgrounds-slice1-artifacts@1',
  generatedAt: new Date().toISOString(),
  repo,
  branch: 'swimming-backgrounds',
  startingHead: '04f9e4d',
  productCommit: 'same commit as this manifest',
  artifactRoot,
  captureMetadata: {
    runtime: 'actual normal-play DeepdiveScene #game canvas with live DOM HUD',
    renderer: 'Canvas',
    viewport: [1440, 900],
    metricRegion: 'Canvas backing store only; live DOM HUD excluded',
    captureGeneratedAt: evidence.generatedAt,
    captureIds: evidence.captures.map(({ id, biome, targetDepth, actualDepth, teleport, activeBandBlend }) => ({
      id, biome, targetDepth, actualDepth, tileX: teleport?.tileX, activeBandBlend,
    })),
  },
  artifacts,
};

await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, artifacts: artifacts.length }, null, 2));

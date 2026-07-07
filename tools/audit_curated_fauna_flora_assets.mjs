import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const generatedDir = resolve(root, 'public/assets/generated');
const runDir = resolve(root, 'runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07');
const inventoryPath = resolve(runDir, 'procedural-quality-inventory.json');

const genericFallbackKeys = new Set([
  'fish-shallow-neutral',
  'fish-shallow-predator',
  'fish-mid-neutral',
  'fish-mid-predator',
  'fish-abyss-predator',
  'flora-shallow-kelp',
  'flora-shallow-anemone',
  'flora-deep-coral',
  'flora-deep-tube',
]);

const floraSliceBuilderOutputs = new Set([
  'terrain-edge-flora-moon-sponge',
  'terrain-edge-flora-sting-anemone',
  'terrain-edge-flora-vent-coral',
  'terrain-edge-flora-ember-bloom',
]);

const envReplacementByTerrainEdge = new Map([
  ['terrain-edge-flora-moon-sponge', 'env-flora-moon-sponge'],
  ['terrain-edge-flora-sting-anemone', 'env-flora-sting-anemone'],
  ['terrain-edge-flora-vent-coral', 'env-flora-vent-coral'],
  ['terrain-edge-flora-ember-bloom', 'env-flora-ember-bloom'],
]);

const knownProceduralDrawnKeys = new Set([
  'fauna-abyss-hatchet-school',
  'fauna-abyss-lantern-swarm',
  'fauna-abyss-static-fry',
  'fauna-abyss-microfish',
  'fauna-abyss-viperfish',
  'fauna-abyss-snipe-eel',
  'flora-oxygen-kelp',
  'flora-oxygen-bulb',
  'biolume-rock-0',
  'biolume-rock-1',
  'biolume-crystal',
]);

const previousProofPath = resolve(root, 'runs/water9-curated-fauna-flora-assets-2026-07-06/normal-play-proof.json');

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function sha256(path) {
  try {
    return createHash('sha256').update(await readFile(path)).digest('hex');
  } catch {
    return null;
  }
}

async function fileInfo(key) {
  const path = resolve(generatedDir, `${key}.png`);
  if (!(await exists(path))) {
    return { exists: false, path: `public/assets/generated/${key}.png`, bytes: 0, sha256: null, dimensions: null };
  }
  const bytes = await readFile(path);
  const dimensions = bytes.toString('ascii', 1, 4) === 'PNG'
    ? { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
    : null;
  return {
    exists: true,
    path: `public/assets/generated/${key}.png`,
    bytes: (await stat(path)).size,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    dimensions,
  };
}

async function gitStatus(path) {
  const rel = path.replace(`${root}/`, '');
  let tracked = false;
  try {
    await execFileAsync('git', ['ls-files', '--error-unmatch', rel], { cwd: root });
    tracked = true;
  } catch {
    tracked = false;
  }
  let short = '';
  try {
    const result = await execFileAsync('git', ['status', '--short', '--', rel], { cwd: root });
    short = result.stdout.trim();
  } catch {
    short = '';
  }
  return {
    tracked,
    short,
    state: !tracked ? 'untracked' : short ? 'modified' : 'clean',
  };
}

function extractRows(source, exportName, kind) {
  const start = source.indexOf(`export const ${exportName}`);
  const end = source.indexOf('};', start);
  if (start < 0 || end < start) throw new Error(`missing ${exportName}`);
  const rows = [];
  let biome = null;
  for (const line of source.slice(start, end).split('\n')) {
    const biomeMatch = line.match(/^\s*([1-4]):\s*\[/);
    if (biomeMatch) biome = Number(biomeMatch[1]);
    const species = line.match(/species:\s*'([^']+)'/)?.[1];
    if (!species) continue;
    rows.push({
      kind,
      biome,
      species,
      assetKey: line.match(/assetKey:\s*'([^']+)'/)?.[1] ?? null,
      hazardous: /hazardous:\s*true/.test(line),
      rare: /rare:\s*true/.test(line),
      hostile: /hostile:\s*true/.test(line),
      radius: Number(line.match(/radius:\s*([0-9.]+)/)?.[1] ?? 0),
    });
  }
  return rows;
}

function fishRuntimeKey(row) {
  if (row.assetKey) return row.assetKey;
  if (!row.hostile) return row.biome === 1 ? 'fish-shallow-neutral' : 'fish-mid-neutral';
  if (row.biome >= 3 || row.radius >= 24) return 'fish-abyss-predator';
  if (row.biome === 2 || row.radius >= 18) return 'fish-mid-predator';
  return 'fish-shallow-predator';
}

function floraGameplayKey(row) {
  const map = {
    'Glass Kelp': 'terrain-edge-flora-glass-kelp',
    'Moon Sponge': 'terrain-edge-flora-moon-sponge',
    'Sting Anemone': 'terrain-edge-flora-sting-anemone',
    'Brine Grass': 'terrain-edge-flora-brine-grass',
    'Vent Coral': 'terrain-edge-flora-vent-coral',
    'Ember Bloom': 'terrain-edge-flora-ember-bloom',
    'Black Fan': 'terrain-edge-flora-black-fan',
    'Lumen Fern': 'terrain-edge-flora-lumen-fern',
    'Crown Polyp': 'terrain-edge-flora-crown-polyps',
    'Oracle Polyp': 'terrain-edge-flora-oracle-tendrils',
    'Needle Garden': 'env-flora-needle-garden',
    'Circuit Kelp': 'env-flora-circuit-kelp',
    'Glass Obelisk': 'env-flora-glass-obelisk',
  };
  return map[row.species] ?? (row.hazardous || row.rare ? 'env-flora-vent-coral' : 'env-flora-moon-sponge');
}

async function sourceManifestNames(path) {
  const manifest = await readJson(resolve(root, path), { assets: [] });
  return new Map((manifest.assets ?? []).map((asset) => [asset.name, { manifest: path, asset }]));
}

const [
  content,
  generatedFiles,
  terrainSourceAssets,
  envSourceAssets,
  sourceArtSlice1Assets,
  explorationManifest,
  previousProof,
] = await Promise.all([
  readFile(resolve(root, 'src/content.ts'), 'utf8'),
  readdir(generatedDir),
  sourceManifestNames('public/assets/source/terrain-edge-accent-source-manifest.json'),
  sourceManifestNames('public/assets/source/environment-cave-wall-source-manifest.json'),
  sourceManifestNames('public/assets/source/fauna-flora-source-art-slice-1-manifest.json'),
  readJson(resolve(root, 'public/assets/generated/exploration-life-2026-07-04/manifest.json'), { entries: [] }),
  readJson(previousProofPath, { captures: [] }),
]);

const generatedSet = new Set(generatedFiles);
const explorationByKey = new Map((explorationManifest.entries ?? []).map((entry) => [entry.id, entry]));
const requiredByPreviousProof = new Set((previousProof.captures ?? []).map((capture) => capture.assetKey).filter(Boolean));
const usageByKey = new Map();

function addUsage(key, usage) {
  if (!usageByKey.has(key)) usageByKey.set(key, []);
  usageByKey.get(key).push(usage);
}

for (const row of extractRows(content, 'biomeFish', 'fauna')) {
  addUsage(fishRuntimeKey(row), {
    kind: 'fauna',
    source: 'src/content.ts:biomeFish',
    biome: row.biome,
    species: row.species,
    role: 'small-fauna',
  });
}

for (const row of extractRows(content, 'biomeFlora', 'flora')) {
  addUsage(floraGameplayKey(row), {
    kind: 'flora',
    source: 'src/content.ts:biomeFlora + src/scene-worldgen.ts:floraGameplayAssetKey',
    biome: row.biome,
    species: row.species,
    role: 'scannable-terrain-edge-flora',
  });
}

for (const [name, entry] of envSourceAssets) {
  if (name.startsWith('env-flora-')) {
    addUsage(name, {
      kind: 'flora',
      source: entry.manifest,
      biome: null,
      species: name.replace(/^env-flora-/, '').split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' '),
      role: 'environment-flora-loaded-runtime',
    });
  }
}

for (const key of ['flora-oxygen-kelp', 'flora-oxygen-bulb', 'terrain-edge-flora-lumen-fern']) {
  addUsage(key, {
    kind: 'flora',
    source: 'src/scene-worldgen.ts:populateBiolumeRoom',
    biome: 'special-room',
    species: key.startsWith('flora-oxygen') ? 'Oxygen Bloom' : 'Lumen Fern',
    role: 'special-room-flora',
  });
}

for (const key of ['biolume-rock-0', 'biolume-rock-1', 'biolume-crystal']) {
  addUsage(key, {
    kind: 'flora',
    source: 'src/scene-worldgen.ts:populateBiolumeRoom',
    biome: 'special-room',
    species: 'Lumen Nodule',
    role: 'special-room-flora',
  });
}

for (const key of ['fauna-abyss-viperfish', 'fauna-abyss-mantle-crawler']) {
  addUsage(key, {
    kind: 'fauna',
    source: 'src/scene-worldgen.ts:populateNestRoom',
    biome: 'special-room',
    species: key === 'fauna-abyss-mantle-crawler' ? 'Mantle Crawler' : 'Abyssal Thresher',
    role: 'special-room-fauna',
  });
}

const rows = [];
for (const [assetKey, usages] of [...usageByKey.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const image = await fileInfo(assetKey);
  const manifestPath = `public/assets/generated/${assetKey}.frames.json`;
  const frameManifest = generatedSet.has(`${assetKey}.frames.json`)
    ? await readJson(resolve(root, manifestPath), null)
    : null;
  const sourceControl = image.exists ? await gitStatus(resolve(root, image.path)) : { tracked: false, short: '', state: 'missing' };
  let provenanceClass = 'unknown_provenance';
  const evidence = [];

  if (!image.exists) {
    provenanceClass = 'runtime_missing_or_untracked';
    evidence.push('runtime PNG is missing');
  } else if (genericFallbackKeys.has(assetKey) || /^fish-/.test(assetKey) || /^flora-(?:shallow|deep)-/.test(assetKey)) {
    provenanceClass = 'generic_fallback_or_placeholder';
    evidence.push('generic fallback key family');
  } else if (frameManifest?.source?.kind?.startsWith('derived-from-existing')) {
    provenanceClass = 'derived_from_existing_bitmap';
    evidence.push(`frames manifest source: ${JSON.stringify(frameManifest.source)}`);
  } else if (explorationByKey.has(assetKey)) {
    provenanceClass = 'derived_from_existing_bitmap';
    const source = explorationByKey.get(assetKey);
    evidence.push(`exploration source alpha: ${source.alpha}`);
    evidence.push(`exploration source image: ${source.source}`);
  } else if (envReplacementByTerrainEdge.has(assetKey)) {
    const envKey = envReplacementByTerrainEdge.get(assetKey);
    const env = await fileInfo(envKey);
    if (env.exists && env.sha256 === image.sha256) {
      provenanceClass = 'derived_from_existing_bitmap';
      evidence.push(`byte-identical replacement from ${env.path}`);
      evidence.push(envSourceAssets.get(envKey)?.manifest ?? 'public/assets/source/environment-cave-wall-source-manifest.json');
    } else {
      provenanceClass = 'procedural_drawn_png';
      evidence.push('listed output of tools/build_flora_slice_assets.py');
    }
  } else if (terrainSourceAssets.has(assetKey)) {
    provenanceClass = 'source_sheet_slice';
    evidence.push(terrainSourceAssets.get(assetKey).manifest);
  } else if (envSourceAssets.has(assetKey)) {
    provenanceClass = 'source_sheet_slice';
    evidence.push(envSourceAssets.get(assetKey).manifest);
  } else if (sourceArtSlice1Assets.has(assetKey)) {
    const source = sourceArtSlice1Assets.get(assetKey);
    provenanceClass = source.asset.kind === 'derived-from-existing-bitmap'
      ? 'derived_from_existing_bitmap'
      : 'source_sheet_slice';
    evidence.push(source.manifest);
    evidence.push(`slice-1 source: ${source.asset.file}`);
    evidence.push(`slice-1 sourceFrom: ${source.asset.sourceFrom}`);
  } else if (knownProceduralDrawnKeys.has(assetKey)) {
    provenanceClass = 'procedural_drawn_png';
    evidence.push('tools/build_small_life_quality_assets.py draws this key with PIL/ImageDraw');
  }

  const riskFlags = [];
  if (provenanceClass === 'procedural_drawn_png') riskFlags.push('procedural_drawn_png');
  if (provenanceClass === 'generic_fallback_or_placeholder') riskFlags.push('generic_fallback_or_placeholder');
  if (provenanceClass === 'unknown_provenance') riskFlags.push('unknown_provenance');
  if (provenanceClass === 'runtime_missing_or_untracked') riskFlags.push('runtime_missing');
  if (sourceControl.state === 'untracked') riskFlags.push('runtime_untracked');
  if (floraSliceBuilderOutputs.has(assetKey)) riskFlags.push('tools_build_flora_slice_assets_output');
  if (requiredByPreviousProof.has(assetKey)) riskFlags.push('required_by_last_proof_pass');

  rows.push({
    assetKey,
    kind: usages.some((usage) => usage.kind === 'fauna') ? 'fauna' : 'flora',
    provenanceClass,
    riskFlags,
    runtimePath: image.path,
    exists: image.exists,
    bytes: image.bytes,
    dimensions: image.dimensions,
    sha256: image.sha256,
    sourceControl,
    frameManifestPath: frameManifest ? manifestPath : null,
    frameCount: frameManifest?.frameCount ?? 1,
    sourceEvidence: evidence,
    usages,
  });
}

const counts = rows.reduce((acc, row) => {
  acc[row.provenanceClass] = (acc[row.provenanceClass] ?? 0) + 1;
  return acc;
}, {});

function severity(row) {
  let score = 0;
  if (row.riskFlags.includes('runtime_missing')) score += 100;
  if (row.riskFlags.includes('generic_fallback_or_placeholder')) score += 80;
  if (row.riskFlags.includes('procedural_drawn_png')) score += 70;
  if (row.riskFlags.includes('unknown_provenance')) score += 55;
  if (row.riskFlags.includes('runtime_untracked')) score += 25;
  if (row.riskFlags.includes('required_by_last_proof_pass')) score += 20;
  if (row.riskFlags.includes('tools_build_flora_slice_assets_output')) score += 15;
  return score;
}

const offenders = rows
  .map((row) => ({ ...row, severity: severity(row) }))
  .filter((row) => row.severity > 0)
  .sort((a, b) => b.severity - a.severity || a.assetKey.localeCompare(b.assetKey));

const blockedAssetQueue = offenders
  .filter((row) => (
    row.riskFlags.includes('procedural_drawn_png')
    || row.riskFlags.includes('generic_fallback_or_placeholder')
    || row.riskFlags.includes('unknown_provenance')
    || row.riskFlags.includes('runtime_missing')
  ))
  .map((row) => ({
    assetKey: row.assetKey,
    kind: row.kind,
    currentPath: row.runtimePath,
    currentClass: row.provenanceClass,
    currentBadEvidence: row.sourceEvidence,
    representativeUsages: row.usages.slice(0, 5),
    desiredSourceContract: row.kind === 'fauna'
      ? `Species-specific painted/generated bitmap source on flat #ff00ff or transparent background for ${row.usages.map((usage) => usage.species).filter(Boolean).join(' / ') || row.assetKey}; ingest source, then derive runtime animation frames from that bitmap.`
      : `Species-specific source-sheet or painted transparent flora cutout for ${row.usages.map((usage) => usage.species).filter(Boolean).join(' / ') || row.assetKey}; no PIL/ImageDraw shape construction.`,
    blockedReason: 'No approved source-derived replacement was found in this cleanup pass; replacing it honestly requires image generation, a source-sheet slice, or human-provided art.',
  }));

const inventory = {
  schema: 'water9/fauna-flora-procedural-quality-inventory@1',
  generatedAt: new Date().toISOString(),
  runDir: runDir.replace(`${root}/`, ''),
  sourceInputs: [
    'src/content.ts',
    'src/scene-worldgen.ts',
    'src/scene-sandbox.ts',
    'src/helpers.ts',
    'public/assets/generated/small-life.manifest.json',
    'public/assets/source/terrain-edge-accent-source-manifest.json',
    'public/assets/source/environment-cave-wall-source-manifest.json',
    'public/assets/source/fauna-flora-source-art-slice-1-manifest.json',
    'public/assets/generated/exploration-life-2026-07-04/manifest.json',
  ],
  counts,
  totals: {
    assets: rows.length,
    fauna: rows.filter((row) => row.kind === 'fauna').length,
    flora: rows.filter((row) => row.kind === 'flora').length,
    offenders: offenders.length,
    blocked: blockedAssetQueue.length,
  },
  requiredByPreviousProof: [...requiredByPreviousProof].sort(),
  repairedThisPass: [
    'terrain-edge-flora-moon-sponge',
    'terrain-edge-flora-sting-anemone',
    'terrain-edge-flora-vent-coral',
    'terrain-edge-flora-ember-bloom',
  ].map((assetKey) => ({
    assetKey,
    replacementSource: `${envReplacementByTerrainEdge.get(assetKey)}.png`,
    classAfterRepair: rows.find((row) => row.assetKey === assetKey)?.provenanceClass ?? null,
  })),
  topOffenders: offenders.slice(0, 30).map((row) => ({
    assetKey: row.assetKey,
    kind: row.kind,
    severity: row.severity,
    provenanceClass: row.provenanceClass,
    riskFlags: row.riskFlags,
    runtimePath: row.runtimePath,
    sourceEvidence: row.sourceEvidence,
    usages: row.usages.slice(0, 5),
  })),
  blockedAssetQueue,
  rows,
};

await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);

const hardFailures = offenders.filter((row) => (
  row.riskFlags.includes('procedural_drawn_png')
  || row.riskFlags.includes('generic_fallback_or_placeholder')
  || row.riskFlags.includes('unknown_provenance')
  || row.riskFlags.includes('runtime_missing')
  || row.riskFlags.includes('runtime_untracked')
));

const result = {
  ok: hardFailures.length === 0,
  inventoryPath: inventoryPath.replace(`${root}/`, ''),
  counts,
  totals: inventory.totals,
  failureCount: hardFailures.length,
  topFailures: hardFailures.slice(0, 12).map((row) => ({
    assetKey: row.assetKey,
    provenanceClass: row.provenanceClass,
    riskFlags: row.riskFlags,
    path: row.runtimePath,
  })),
};

if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));

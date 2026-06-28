#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const generatedDir = path.join(repoRoot, 'public/assets/generated');
const manifestPath = path.join(generatedDir, 'small-life.manifest.json');

function readText(file) {
  return readFileSync(path.join(repoRoot, file), 'utf8');
}

function fileExists(file) {
  return access(file).then(() => true, () => false);
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sectionBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`missing marker ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`missing marker ${endMarker}`);
  return source.slice(start, end);
}

function parseFauna(content) {
  const section = sectionBetween(content, 'export const biomeFish', 'export const biomeFlora');
  const entries = [];
  let biome = null;
  for (const line of section.split('\n')) {
    const biomeMatch = line.match(/^\s*([1-4]):\s*\[/);
    if (biomeMatch) biome = Number(biomeMatch[1]);
    const match = line.match(/\{\s*species:\s*'([^']+)'.*?count:\s*(\d+).*?color:\s*(0x[0-9a-fA-F]+).*?hostile:\s*(true|false).*?pattern:\s*'([^']+)'.*?radius:\s*(\d+).*?assetKey:\s*'([^']+)'/);
    if (match && biome != null) {
      const [, species, count, color, hostile, pattern, radius, assetKey] = match;
      entries.push({
        kind: 'fauna',
        biome,
        species,
        assetKey,
        displayName: species,
        count: Number(count),
        color,
        hostile: hostile === 'true',
        pattern,
        radius: Number(radius),
        runtime: { source: 'src/content.ts:biomeFish', loader: 'SPRITESHEET_BASES', draw: 'drawFish' },
        reviewStatus: [
          'fauna-abyss-hatchet-school',
          'fauna-abyss-lantern-swarm',
          'fauna-abyss-static-fry',
          'fauna-abyss-microfish',
          'fauna-abyss-viperfish',
          'fauna-abyss-goblin-shark',
          'fauna-abyss-snipe-eel',
        ].includes(assetKey)
          ? 'fixed-2026-06-28'
          : 'existing-runtime',
      });
    }
  }
  return entries;
}

function parseFloraAssetMap(helpers) {
  const matches = [...helpers.matchAll(/if \(species\.species === '([^']+)'\) return '([^']+)'/g)];
  return new Map(matches.map(([, species, assetKey]) => [species, assetKey]));
}

function parseFlora(content, helpers) {
  const section = sectionBetween(content, 'export const biomeFlora', '};');
  const floraMap = parseFloraAssetMap(helpers);
  const entries = [];
  let biome = null;
  for (const line of section.split('\n')) {
    const biomeMatch = line.match(/^\s*([1-4]):\s*\[/);
    if (biomeMatch) biome = Number(biomeMatch[1]);
    const match = line.match(/\{\s*species:\s*'([^']+)'.*?count:\s*(\d+).*?color:\s*(0x[0-9a-fA-F]+).*?hazardous:\s*(true|false).*?rare:\s*(true|false).*?radius:\s*(\d+)/);
    if (match && biome != null) {
      const [, species, count, color, hazardous, rare, radius] = match;
      const assetKey = floraMap.get(species);
      if (!assetKey) throw new Error(`no floraAssetKey mapping for ${species}`);
      entries.push({
        kind: 'flora',
        biome,
        species,
        assetKey,
        displayName: species,
        count: Number(count),
        color,
        hazardous: hazardous === 'true',
        rare: rare === 'true',
        radius: Number(radius),
        runtime: { source: 'src/content.ts:biomeFlora + src/helpers.ts:floraAssetKey', loader: 'environmentTextureKeys', draw: 'drawFlora' },
        origin: { mode: 'surface-anchor', defaultFloor: { x: 0.5, y: 0.82 } },
        reviewStatus: ['Brine Grass', 'Vent Coral', 'Black Fan', 'Needle Garden', 'Glass Obelisk'].includes(species)
          ? 'contrast-lift-2026-06-28'
          : 'existing-runtime',
      });
    }
  }
  return entries;
}

function specialBiolumeEntries() {
  return [
    {
      kind: 'flora',
      biome: 'special-room',
      species: 'Oxygen Bloom',
      assetKey: 'flora-oxygen-kelp',
      displayName: 'Oxygen Bloom A',
      radius: 15,
      runtime: { source: 'src/scene-worldgen.ts:populateBiolumeRoom', loader: 'loadGeneratedAssets', draw: 'drawFlora' },
      origin: { mode: 'surface-anchor', defaultFloor: { x: 0.5, y: 0.82 } },
      reviewStatus: 'fixed-2026-06-28',
    },
    {
      kind: 'flora',
      biome: 'special-room',
      species: 'Oxygen Bloom',
      assetKey: 'flora-oxygen-bulb',
      displayName: 'Oxygen Bloom B',
      radius: 15,
      runtime: { source: 'src/scene-worldgen.ts:populateBiolumeRoom', loader: 'loadGeneratedAssets', draw: 'drawFlora' },
      origin: { mode: 'surface-anchor', defaultFloor: { x: 0.5, y: 0.82 } },
      reviewStatus: 'fixed-2026-06-28',
    },
    ...['biolume-rock-0', 'biolume-rock-1', 'biolume-crystal'].map((assetKey) => ({
      kind: 'flora',
      biome: 'special-room',
      species: 'Lumen Nodule',
      assetKey,
      displayName: assetKey === 'biolume-crystal' ? 'Lumen Nodule cluster' : `Lumen Nodule ${assetKey.endsWith('0') ? 'small' : 'ridge'}`,
      radius: 11,
      runtime: { source: 'src/scene-worldgen.ts:populateBiolumeRoom', loader: 'loadGeneratedAssets', draw: 'drawFlora' },
      origin: { mode: 'surface-anchor', defaultFloor: { x: 0.5, y: 0.82 } },
      reviewStatus: 'fixed-2026-06-28',
    })),
  ];
}

function generatedMetadata(entry) {
  const image = `${entry.assetKey}.png`;
  const imagePath = path.join(generatedDir, image);
  const framesManifest = `${entry.assetKey}.frames.json`;
  const framesPath = path.join(generatedDir, framesManifest);
  const metadata = {
    image,
    imagePath: `public/assets/generated/${image}`,
    expectedDisplayWidth: entry.kind === 'fauna'
      ? entry.radius * (entry.hostile ? 3.8 : entry.pattern === 'circle' || entry.pattern === 'glide' ? 3.4 : 3)
      : null,
    minimumCoverage: entry.reviewStatus === 'fixed-2026-06-28' && entry.kind === 'fauna' ? 0.07 : entry.kind === 'fauna' ? 0.015 : 0.08,
    minimumEdgeMarginPx: entry.kind === 'flora' ? 1 : 2,
  };
  if (entry.kind === 'fauna') {
    const frames = JSON.parse(readFileSync(framesPath, 'utf8'));
    metadata.framesManifest = `public/assets/generated/${framesManifest}`;
    metadata.frameCount = frames.frameCount;
    metadata.frameWidth = frames.frameWidth;
    metadata.frameHeight = frames.frameHeight;
    metadata.anchor = frames.anchor;
    metadata.looseFrames = Array.from({ length: frames.frameCount }, (_, index) => `public/assets/generated/${entry.assetKey}-${index}.png`);
    metadata.looseFramePolicy = entry.reviewStatus === 'fixed-2026-06-28' ? 'source-of-packed-sheet' : 'legacy-tolerated';
  }
  return { imagePath, metadata };
}

async function buildManifest() {
  const content = readText('src/content.ts');
  const helpers = readText('src/helpers.ts');
  const entries = [...parseFauna(content), ...parseFlora(content, helpers), ...specialBiolumeEntries()];
  const enriched = [];
  for (const entry of entries) {
    const { imagePath, metadata } = generatedMetadata(entry);
    if (!(await fileExists(imagePath))) throw new Error(`missing image for ${entry.assetKey}: ${imagePath}`);
    enriched.push({ ...entry, asset: metadata });
  }
  return {
    schema: 'water9/small-life-manifest@1',
    generatedBy: 'tools/build_small_life_manifest.mjs',
    scope: 'active biomeFish, biomeFlora, and biolume-room flora runtime assets',
    entries: enriched.sort((a, b) => `${a.kind}:${a.biome}:${a.species}:${a.assetKey}`.localeCompare(`${b.kind}:${b.biome}:${b.species}:${b.assetKey}`)),
  };
}

const check = process.argv.includes('--check');
const manifest = await buildManifest();
const next = stableJson(manifest);
if (check) {
  const current = readFileSync(manifestPath, 'utf8');
  if (current !== next) {
    console.error(`${manifestPath} is stale; run node tools/build_small_life_manifest.mjs`);
    process.exit(1);
  }
  console.log(`small-life manifest up to date (${manifest.entries.length} entries)`);
} else {
  writeFileSync(manifestPath, next);
  console.log(`wrote ${manifestPath} (${manifest.entries.length} entries)`);
}

import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const generatedDir = resolve(root, 'public/assets/generated');
const content = await readFile(resolve(root, 'src/content.ts'), 'utf8');
const manifest = JSON.parse(await readFile(resolve(generatedDir, 'articulated-creatures.parts.json'), 'utf8'));
const generatedFiles = new Set(await readdir(generatedDir));
const failures = [];

function unique(values) {
  return [...new Set(values)].sort();
}

async function requireAsset(owner, texture) {
  try {
    const info = await stat(resolve(generatedDir, `${texture}.png`));
    if (!info.isFile() || info.size < 128) failures.push(`${owner}: ${texture}.png is missing or too small`);
  } catch {
    failures.push(`${owner}: ${texture}.png does not exist`);
  }
}

function framesFor(base) {
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escaped}-(\\d+)\\.png$`);
  return [...generatedFiles]
    .map((file) => file.match(pattern)?.[1])
    .filter(Boolean)
    .map(Number)
    .sort((a, b) => a - b);
}

const fishAssetKeys = unique([...content.matchAll(/assetKey: '([^']+)'/g)].map((match) => match[1]));
for (const key of fishAssetKeys) {
  const frames = framesFor(key);
  if (!frames.length) failures.push(`fish fauna ${key}: no generated frame files found`);
  if (frames.length && frames[0] !== 0) failures.push(`fish fauna ${key}: first generated frame is ${frames[0]}, expected 0`);
}

const itemIcons = unique([...content.matchAll(/icon: '([^']+)'/g)].map((match) => match[1]));
for (const icon of itemIcons) await requireAsset(`shop item ${icon}`, icon);

const directTextureKeys = [
  'diver-swim-0',
  'flora-shallow-kelp',
  'flora-shallow-anemone',
  'flora-deep-tube',
  'flora-deep-coral',
  'sub-tier1',
  'sub-tier2',
  'sub-tier3',
  'barge-platform',
  'vent-base',
  'bobbit-0',
  'nest-egg-0',
];
for (const texture of directTextureKeys) await requireAsset(`sandbox direct texture ${texture}`, texture);

for (const creature of manifest.creatures ?? []) {
  for (const part of creature.parts ?? []) {
    const texture = part.texture?.replace(/\.png$/, '');
    if (texture) await requireAsset(`${creature.id}.${part.id}`, texture);
  }
  for (const overlay of creature.socketOverlays ?? []) {
    const texture = overlay.texture?.replace(/\.png$/, '');
    if (texture) await requireAsset(`${creature.id}.${overlay.id}`, texture);
  }
}

const summary = {
  fishAssetKeys: fishAssetKeys.length,
  itemIcons: itemIcons.length,
  articulatedThreats: manifest.creatures?.length ?? 0,
  directTextureKeys: directTextureKeys.length,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

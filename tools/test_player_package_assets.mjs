import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const distDir = 'dist';
const generatedDir = join(distDir, 'assets/generated');
const failures = [];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, prefix = '') {
  if (!(await exists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) paths.push(...await walk(full, rel));
    else if (entry.isFile()) paths.push(rel);
  }
  return paths;
}

async function mustExist(path) {
  if (!(await exists(path))) failures.push(`missing ${path}`);
}

async function mustNotExist(path) {
  if (await exists(path)) failures.push(`unexpected ${path}`);
}

await mustExist(join(distDir, 'index.html'));
await mustExist(join(distDir, 'assets/audio/menuloop.mp3'));
await mustExist(join(distDir, 'assets/audio/ambienceloop.mp3'));
await mustExist(join(generatedDir, 'articulated-creatures.parts.json'));
await mustExist(join(generatedDir, 'titlebackground.png'));
await mustExist(join(generatedDir, 'water-9-title.svg'));
await mustExist(join(generatedDir, 'diver-idle-0.png'));
await mustExist(join(generatedDir, 'fish-shallow-neutral.png'));
await mustExist(join(generatedDir, 'fish-shallow-neutral.frames.json'));
await mustExist(join(generatedDir, 'parallax-shallow-0.png'));
await mustExist(join(generatedDir, 'ui-panel-wide.png'));
await mustExist(join(generatedDir, 'tile-reef-sand-0.png'));
await mustExist(join(generatedDir, 'fauna-velvet-lantern-cuttle-head-mask.png'));
await mustExist(join(generatedDir, 'submarines.parts.json'));

await mustNotExist(join(distDir, 'review'));
await mustNotExist(join(distDir, 'assets/source'));

const distFiles = await walk(distDir);
const forbiddenDistPaths = distFiles.filter((path) =>
  /(^|\/)(review|source-candidates|source-inbox)(\/|$)/i.test(path)
    || /^assets\/source\//i.test(path),
);
for (const path of forbiddenDistPaths) failures.push(`forbidden path in dist: ${path}`);

const generatedFiles = await walk(generatedDir);
const forbiddenGeneratedFiles = generatedFiles.filter((path) =>
  /\.articulated\.json$/i.test(path)
    || /(?:^|-)source(?:-|\.|$)/i.test(path)
    || /-chroma\.(?:png|jpe?g|webp)$/i.test(path)
    || /-whole-painted(?:-[^.]+)?\.(?:png|jpe?g|webp)$/i.test(path)
    || /-uncropped\.(?:png|jpe?g|webp)$/i.test(path),
);
for (const path of forbiddenGeneratedFiles) failures.push(`pipeline artifact in generated assets: ${path}`);

const manifest = JSON.parse(await readFile(join(generatedDir, 'articulated-creatures.parts.json'), 'utf8'));
const textureRefs = new Set();
for (const creature of manifest.creatures ?? []) {
  for (const part of creature.parts ?? []) {
    for (const key of ['texture', 'detachedTexture', 'damagedTexture']) {
      if (part[key]) textureRefs.add(part[key]);
    }
  }
  for (const overlay of creature.socketOverlays ?? []) {
    for (const key of ['texture', 'severedTexture']) {
      if (overlay[key]) textureRefs.add(overlay[key]);
    }
  }
}
for (const texture of textureRefs) await mustExist(join(generatedDir, texture));

const jsBundles = distFiles.filter((path) => /^assets\/index-.*\.js$/.test(path));
if (jsBundles.length === 0) failures.push('missing built JS bundle');

if (failures.length) {
  console.error('Player package asset smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Player package asset smoke passed for dist.');
console.log(`Checked ${distFiles.length} dist files and ${textureRefs.size} articulated texture references.`);

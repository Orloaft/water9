import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const repoRoot = process.cwd();
const reportArgIndex = process.argv.indexOf('--report');
const reportPath = reportArgIndex >= 0 ? resolve(repoRoot, process.argv[reportArgIndex + 1] ?? '') : '';

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function unique(values) {
  return [...new Set(values)];
}

function entry(assetOrFamily, classification, evidence, rationale = '') {
  return { assetOrFamily, classification, evidence, rationale };
}

function extractBiomeFlora(contentSource) {
  const start = contentSource.indexOf('export const biomeFlora');
  const end = contentSource.indexOf('};', start);
  assert(start >= 0 && end > start, 'Could not locate biomeFlora in src/content.ts');
  const section = contentSource.slice(start, end);
  return unique([...section.matchAll(/species:\s*'([^']+)'/g)].map((match) => match[1]));
}

const files = {
  content: await readFile(resolve(repoRoot, 'src/content.ts'), 'utf8'),
  worldgen: await readFile(resolve(repoRoot, 'src/scene-worldgen.ts'), 'utf8'),
  entities: await readFile(resolve(repoRoot, 'src/scene-entities.ts'), 'utf8'),
  rendering: await readFile(resolve(repoRoot, 'src/scene-rendering.ts'), 'utf8'),
  helpers: await readFile(resolve(repoRoot, 'src/helpers.ts'), 'utf8'),
  types: await readFile(resolve(repoRoot, 'src/types.ts'), 'utf8'),
  playtest: await readFile(resolve(repoRoot, 'src/scene-playtest.ts'), 'utf8'),
  articulated: await readFile(resolve(repoRoot, 'src/articulated.ts'), 'utf8'),
};

const searchableSource = Object.entries(files)
  .map(([name, source]) => `// ${name}\n${source}`)
  .join('\n');

const biomeFloraSpecies = extractBiomeFlora(files.content);
const firstSliceMappings = {
  'Moon Sponge': 'terrain-edge-flora-moon-sponge',
  'Sting Anemone': 'terrain-edge-flora-sting-anemone',
  'Vent Coral': 'terrain-edge-flora-vent-coral',
  'Ember Bloom': 'terrain-edge-flora-ember-bloom',
};
const stampMappings = {
  'terrain-stamp-plant-glass': 'Glass Mat Sprout',
  'terrain-stamp-plant-brine': 'Brine Mat Sprout',
  'terrain-stamp-plant-lumen': 'Lumen Mat Stalk',
  'terrain-stamp-plant-purple': 'Purple Mat Tendril',
};
const brushMappings = {
  'terrain-brush-flora-0': 'Glass Thread Fern',
  'terrain-brush-flora-1': 'Ribbon Mat Frond',
  'terrain-brush-flora-2': 'Wall Lace Anemone',
  'terrain-brush-flora-3': 'Brine Feather Fan',
  'terrain-brush-flora-4': 'Lumen Cup Moss',
  'terrain-brush-flora-5': 'Copper Vein Lichen',
  'terrain-brush-flora-6': 'Needle Mat Fan',
  'terrain-brush-flora-7': 'Abyss Thread Fan',
};
const specialRoomSpecies = ['Oxygen Bloom', 'Lumen Fern', 'Lumen Nodule'];
const fringeKeys = [
  'terrain-stamp-fringe-teal',
  'terrain-stamp-fringe-brine',
  'terrain-stamp-fringe-purple',
  'terrain-stamp-fringe-cyan',
];
const edgeGameplayKeys = [
  'terrain-edge-flora-glass-kelp',
  'terrain-edge-flora-moon-sponge',
  'terrain-edge-flora-sting-anemone',
  'terrain-edge-flora-brine-grass',
  'terrain-edge-flora-vent-coral',
  'terrain-edge-flora-ember-bloom',
  'terrain-edge-flora-black-fan',
  'terrain-edge-flora-lumen-fern',
  'terrain-edge-flora-crown-polyps',
  'terrain-edge-flora-oracle-tendrils',
];
const loadedOnlyEdgeKeys = ['terrain-edge-flora-abyss-sacs', 'terrain-edge-flora-lumen-stalks'];
const specialRoomKeys = ['flora-oxygen-kelp', 'flora-oxygen-bulb', 'terrain-edge-flora-lumen-fern', 'biolume-rock-0', 'biolume-rock-1', 'biolume-crystal'];

assert(files.entities.includes('for (const life of [...this.fish, ...this.flora, ...this.articulatedCreatures])'), 'Scanner target list no longer includes this.flora');
assert(files.worldgen.includes('biomeFlora[state.biome].flatMap((species) => this.makeFloraPatch(species))'), 'Biome flora are no longer created through makeFloraPatch');
assert(files.worldgen.includes("this.flora.push({"), 'Special-room flora no longer push to this.flora');
assert(files.types.includes("'brush'"), 'Flora source union no longer includes brush-derived flora');
assert(files.worldgen.includes('makeBrushFloraTargets'), 'Brush terrain flora are no longer promoted through a stable worldgen source-of-truth');
assert(files.playtest.includes('brushFloraSmokeStage'), 'Brush flora playtest staging hook is missing');

for (const [species, assetKey] of Object.entries(firstSliceMappings)) {
  assert(biomeFloraSpecies.includes(species), `Missing expected first-slice species ${species} in biomeFlora`);
  assert(files.worldgen.includes(`species.species === '${species}') return '${assetKey}'`), `Missing floraGameplayAssetKey mapping for ${species}`, { assetKey });
  assert(files.helpers.includes(`'${assetKey}'`), `Missing environmentTextureKeys loader entry for ${assetKey}`);
  assert(existsSync(resolve(repoRoot, 'public/assets/generated', `${assetKey}.png`)), `Missing generated asset for ${assetKey}`);
}

for (const [assetKey, species] of Object.entries(stampMappings)) {
  assert(files.worldgen.includes(`'${assetKey}'`), `Missing stamp flora asset ${assetKey}`);
  assert(files.worldgen.includes(`species: '${species}'`), `Missing player-facing stamp species ${species}`);
}

for (const [assetKey, species] of Object.entries(brushMappings)) {
  assert(files.worldgen.includes(`'${assetKey}'`), `Missing brush flora asset ${assetKey}`);
  assert(files.worldgen.includes(`species: '${species}'`), `Missing player-facing brush species ${species}`);
  assert(existsSync(resolve(repoRoot, 'public/assets/generated', `${assetKey}.png`)), `Missing generated brush asset for ${assetKey}`);
}

assert(files.rendering.includes('brushFloraPlacementCoveredByGameplayFlora'), 'Brush renderer no longer suppresses converted gameplay flora duplicates');
assert(files.rendering.includes('[0, 1, 4, 6, 7]') && files.rendering.includes('[2, 3, 5, 6, 7]'), 'Brush renderer no longer covers all terrain-brush-flora variants');
assert(files.worldgen.includes('[0, 1, 4, 6, 7]') && files.worldgen.includes('[2, 3, 5, 6, 7]'), 'Brush gameplay source no longer covers all terrain-brush-flora variants');

for (const species of specialRoomSpecies) {
  assert(files.worldgen.includes(`'${species}'`), `Missing scannable special-room flora species ${species}`);
}

assert(files.types.includes("export type EnvironmentPropKind = 'rock' | 'ore' | 'terrainFlora'"), 'EnvironmentPropKind should classify decorative plant stamps as terrainFlora, not flora');
assert(files.worldgen.includes("kind: 'terrainFlora'"), 'Edge decorative plant props are not classified as terrainFlora');
assert(!files.worldgen.includes("kind: 'flora',\n      assetKey: keys[variant]"), 'Decorative edge props are still categorized as flora');
assert(files.worldgen.includes("prop.kind !== 'terrainFlora'"), 'Gameplay flora anchor cleanup no longer removes overlapping terrainFlora props');
assert(!/terrain-brush-flora-[^']*[\s\S]{0,240}this\.flora\.push/.test(files.rendering), 'Terrain brush renderer appears to create scan targets directly');
assert(!/drawTerrainEcologyFringe[\s\S]{0,1200}this\.flora/.test(files.rendering), 'Procedural ecology fringe appears to touch scan targets');

const visualLifeAudit = [
  entry('terrain-brush-flora-0..7', 'interactable_flora', [
    'src/scene-worldgen.ts:makeBrushFloraTargets',
    'src/scene-rendering.ts:brushFloraPlacementCoveredByGameplayFlora',
    'src/scene-playtest.ts:brushFloraSmokeStage',
  ], 'Deterministically generated from the same tile brush rules, capped/thinned, then rendered as Flora scan/sample targets with matching passive brush marks suppressed.'),
  ...Object.keys(brushMappings).map((assetKey) => entry(assetKey, 'interactable_flora', [
    `src/scene-worldgen.ts:brushFloraSpecs -> ${brushMappings[assetKey]}`,
    'public/assets/generated/*.png exists',
  ], 'Player-facing species name, scanner/sampler lifecycle via Flora.')),
  entry('terrain-stamp-plant-*', 'interactable_flora', [
    'src/scene-worldgen.ts:makeStampFloraTargets',
    'src/scene-playtest.ts:stampFloraSmokeStage',
  ], 'Accepted previous slice remains promoted from terrainFlora props into named Flora targets.'),
  ...Object.keys(stampMappings).map((assetKey) => entry(assetKey, 'interactable_flora', [
    `src/scene-worldgen.ts:stampFloraSpecs -> ${stampMappings[assetKey]}`,
  ])),
  entry('terrain-stamp-fringe-*', 'passive_nonlife_texture', [
    'src/helpers.ts:terrainLookForBiome fringeStampPool',
    'src/scene-worldgen.ts:edgeFloraProp isMat = keys[variant].includes("-fringe-")',
    'src/scene-rendering.ts:drawTerrainEcologyFringe uses matColor/fringe ellipses on terrain mask cells',
  ], 'Fringe keys are used as low-alpha edge mats and terrain texture coloration, not discrete plant/animal silhouettes. They have no scan radius, sprite lifecycle, or stable object identity.'),
  ...fringeKeys.map((assetKey) => entry(assetKey, 'passive_nonlife_texture', [
    'src/helpers.ts:fringeStampPool',
    'src/scene-worldgen.ts:edgeFloraProp terrainFlora mat branch',
  ], 'Terrain edge mat/fringe texture; deliberately not a named life target.')),
  entry('terrain-edge-flora-* active gameplay keys', 'interactable_flora', [
    'src/content.ts:biomeFlora',
    'src/scene-worldgen.ts:makeFloraPatch',
    'src/scene-worldgen.ts:floraGameplayAssetKey',
  ], 'Biome Flora species use these terrain-edge assets as scanner/sampler targets.'),
  ...edgeGameplayKeys.map((assetKey) => entry(assetKey, 'interactable_flora', [
    'src/scene-worldgen.ts:floraGameplayAssetKey',
    'src/scene-worldgen.ts:makeFloraPatch',
  ])),
  ...loadedOnlyEdgeKeys.map((assetKey) => entry(assetKey, 'passive_nonlife_texture', [
    'src/helpers.ts:environmentTextureKeys loader entry',
    'No src/scene-worldgen.ts or src/scene-rendering.ts placement use found',
  ], 'Loaded legacy alternate only; this audit found no runtime visual placement path.')),
  entry('env-flora-*', 'interactable_flora', [
    'src/helpers.ts:floraAssetKey',
    'src/content.ts:biomeFlora',
    'src/scene-worldgen.ts:makeFloraPatch fallback',
  ], 'Environment flora cutouts are used by authored biome Flora or sandbox previews, not passive world decoration.'),
  entry('special-room flora', 'interactable_flora', [
    'src/scene-worldgen.ts:populateBiolumeRoom',
    'src/scene-worldgen.ts:findRoomFloraAnchor',
  ], `Assets: ${specialRoomKeys.join(', ')}`),
  entry('fauna-* small fish assets', 'interactable_fauna', [
    'src/content.ts:biomeFish',
    'src/scene-worldgen.ts:makeSchool',
    'src/scene-entities.ts:nearestUnscannedLife scanner includes this.fish',
  ], 'Small fauna assets are Fish scan targets; sampler/combat behavior is owned by existing fauna systems.'),
  entry('fauna-* articulated assets', 'interactable_fauna', [
    'src/articulated.ts manifests',
    'src/scene-worldgen.ts:populateArticulatedCreatures / populateNestRoom',
    'src/scene-entities.ts scanner includes this.articulatedCreatures',
  ], 'Large fauna are articulated scan/combat targets with runtime manifests.'),
  entry('drawTerrainEcologyFringe', 'passive_nonlife_texture', [
    'src/scene-rendering.ts:drawTerrainEcologyFringe',
  ], 'Procedural mask-cell coloration/edge-mat rendering; no discrete flora/fauna silhouette or sprite key.'),
];

const accountedExact = new Set([
  ...Object.keys(stampMappings),
  ...Object.keys(brushMappings),
  ...fringeKeys,
  ...edgeGameplayKeys,
  ...loadedOnlyEdgeKeys,
  ...specialRoomKeys,
]);
const accountedPrefixes = ['env-flora-', 'fauna-'];
const visualLifeKeyPattern = /\b(?:terrain-brush-flora-\d+|terrain-stamp-plant-[a-z0-9-]+|terrain-stamp-fringe-[a-z0-9-]+|terrain-edge-flora-[a-z0-9-]+|env-flora-[a-z0-9-]+|flora-oxygen-[a-z0-9-]+|biolume-(?:rock-\d+|crystal)|fauna-[a-z0-9-]+)\b/g;
const discoveredVisualLifeKeys = unique([...searchableSource.matchAll(visualLifeKeyPattern)].map((match) => match[0])).sort();
const unaccountedVisualLifeKeys = discoveredVisualLifeKeys.filter((key) => (
  !accountedExact.has(key)
  && !accountedPrefixes.some((prefix) => key.startsWith(prefix))
));
assert(unaccountedVisualLifeKeys.length === 0, 'Found unaccounted visual-life-looking asset keys', { unaccountedVisualLifeKeys });

const result = {
  ok: true,
  schema: 'water9/visual-life-scannability-audit@2',
  biomeFloraSpecies,
  firstSliceMappings,
  stampMappings,
  brushMappings,
  specialRoomSpecies,
  discoveredVisualLifeKeys,
  unaccountedVisualLifeKeys,
  visualLifeAudit,
  summary: {
    interactableFlora: visualLifeAudit.filter((row) => row.classification === 'interactable_flora').length,
    interactableFauna: visualLifeAudit.filter((row) => row.classification === 'interactable_fauna').length,
    passiveNonlifeTexture: visualLifeAudit.filter((row) => row.classification === 'passive_nonlife_texture').length,
    needsFix: visualLifeAudit.filter((row) => row.classification === 'needs_fix').length,
  },
};

if (reportPath) await writeFile(reportPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));

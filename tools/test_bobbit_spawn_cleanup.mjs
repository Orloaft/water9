import { readFile } from 'node:fs/promises';

const [
  manifestText,
  worldgen,
  articulated,
  rendering,
  scene,
  helpers,
] = await Promise.all([
  readFile('public/assets/generated/articulated-creatures.parts.json', 'utf8'),
  readFile('src/scene-worldgen.ts', 'utf8'),
  readFile('src/scene-articulated.ts', 'utf8'),
  readFile('src/scene-rendering.ts', 'utf8'),
  readFile('src/scene.ts', 'utf8'),
  readFile('src/helpers.ts', 'utf8'),
]);

const manifest = JSON.parse(manifestText);
const byId = new Map((manifest.creatures ?? []).map((creature) => [creature.id, creature]));
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const bobbit = byId.get('abyssal-mandible-bobbit');
assert(Boolean(bobbit), 'abyssal-mandible-bobbit manifest is missing');
if (bobbit) {
  assert(bobbit.minBiome === 2, `abyssal-mandible-bobbit minBiome expected 2, got ${bobbit.minBiome}`);
  assert(bobbit.spawn?.count >= 1, `abyssal-mandible-bobbit spawn.count expected >= 1, got ${bobbit.spawn?.count}`);
  assert(bobbit.spawn?.minDepth === 900, `abyssal-mandible-bobbit minDepth expected 900, got ${bobbit.spawn?.minDepth}`);
  assert(bobbit.spawn?.maxDepth === 2600, `abyssal-mandible-bobbit maxDepth expected 2600, got ${bobbit.spawn?.maxDepth}`);
  assert(bobbit.combat?.behavior === 'ambusher', `abyssal-mandible-bobbit behavior expected ambusher, got ${bobbit.combat?.behavior}`);
  assert(bobbit.combat?.damageMultiplier === 1.18, `abyssal-mandible-bobbit damageMultiplier expected 1.18, got ${bobbit.combat?.damageMultiplier}`);
}

assert(worldgen.includes('this.reserveBobbitBurrows();'), 'worldgen does not reserve bobbit burrows');
assert(worldgen.includes('this.reserveSignatureEncounters();'), 'worldgen does not reserve signature encounters');
assert(worldgen.includes('this.populateBobbitArticulatedThreats();'), 'worldgen does not populate articulated bobbit threats');
assert(worldgen.includes('if (state.biome < 2) return;'), 'bobbit burrow biome 2+ guard is missing');
assert(worldgen.includes("spawnCreatureId: 'abyssal-mandible-bobbit'"), 'bobbit burrow spawn creature id is missing');
assert(worldgen.includes('this.bobbits = [];'), 'legacy bobbits array is not reset to empty');
assert(!worldgen.includes('this.bobbits = state.biome >= 2 ? this.makeBobbits() : [];'), 'legacy bobbits still spawn by biome');

assert(articulated.includes("const manifest = articulatedCreatureDef('abyssal-mandible-bobbit');"), 'articulated bobbit manifest lookup is missing');
assert(
  articulated.includes(".filter((manifest) => manifest.id !== 'abyssal-mandible-bobbit')") ||
    articulated.includes("if (manifest.id === 'abyssal-mandible-bobbit') continue;"),
  'generic articulated spawn path does not skip burrow bobbit',
);
assert(articulated.includes("phase: 'burrowed'"), 'articulated bobbit burrow runtime is not initialized');
assert(articulated.includes('this.articulatedCreatures.push(creature);'), 'articulated bobbit creature is not pushed into runtime enemies');

assert(!scene.includes('this.updateBobbits(delta, controls);'), 'legacy bobbit update loop is still active');
assert(!rendering.includes('this.drawBobbits(camera);'), 'legacy bobbit draw loop is still active');
assert(!helpers.includes('scene.load.image(`bobbit-${i}`'), 'legacy bobbit sprites are still preloaded by runtime asset loader');

if (failures.length) {
  console.error('Bobbit spawn cleanup smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Bobbit spawn cleanup smoke passed.');
console.log('Legacy bobbit spawn/update/draw/preload paths are inactive.');
console.log('Abyssal mandible bobbit is configured for biome 2 burrow spawning at 900-2600 depth.');

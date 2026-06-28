import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('public/assets/generated/articulated-creatures.parts.json', 'utf8'));
const worldgen = await readFile('src/scene-worldgen.ts', 'utf8');
const playtest = await readFile('src/scene-playtest.ts', 'utf8');
const hud = await readFile('src/hud.ts', 'utf8');
const entities = await readFile('src/scene-entities.ts', 'utf8');

const byId = new Map((manifest.creatures ?? []).map((creature) => [creature.id, creature]));
const failures = [];

function requireCreature(id) {
  const creature = byId.get(id);
  if (!creature) failures.push(`missing articulated creature ${id}`);
  return creature;
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertSpawn(id, biome, countAtLeast = 1) {
  const creature = requireCreature(id);
  if (!creature) return;
  assert(creature.minBiome === biome, `${id} minBiome expected ${biome}, got ${creature.minBiome}`);
  assert((creature.spawn?.count ?? 0) >= countAtLeast, `${id} spawn.count expected >= ${countAtLeast}, got ${creature.spawn?.count}`);
  assert(Number.isFinite(creature.spawn?.minDepth), `${id} spawn.minDepth missing`);
  assert(Number.isFinite(creature.spawn?.maxDepth), `${id} spawn.maxDepth missing`);
}

function assertBuff(id, beforeHp, beforeDamage, expectedHp, expectedDamage) {
  const creature = requireCreature(id);
  if (!creature) return;
  const damage = creature.combat?.damageMultiplier ?? 1;
  assert(creature.hp === expectedHp, `${id} hp expected ${expectedHp}, got ${creature.hp}`);
  assert(damage === expectedDamage, `${id} damageMultiplier expected ${expectedDamage}, got ${damage}`);
  const hpRatio = creature.hp / beforeHp;
  const damageRatio = damage / beforeDamage;
  assert(hpRatio >= 1.2 && hpRatio <= 1.3, `${id} hp ratio ${hpRatio.toFixed(3)} outside 20-30%`);
  assert(damageRatio >= 1.2 && damageRatio <= 1.3, `${id} damage ratio ${damageRatio.toFixed(3)} outside 20-30%`);
}

assertSpawn('abyssal-gulper', 3);
assertSpawn('abyssal-glasshook-skulk', 3, 2);
assertSpawn('abyssal-mandible-bobbit', 2);

assert(worldgen.includes("if (state.biome >= 3) {\n      const gulper = reserveGulperArena(this);"), 'biome 3+ gulper reservation guard missing');
assert(worldgen.includes("if (state.biome >= 3) {\n      this.encounterReservations.push(...reserveSkulkSideTunnels(this));"), 'biome 3+ skulk reservation guard missing');
assert(worldgen.includes('if (state.biome < 2) return;'), 'biome 2+ bobbit burrow guard missing');
assert(worldgen.includes("spawnCreatureId: 'abyssal-mandible-bobbit'"), 'bobbit burrow spawn creature id missing');

assert(hud.includes('articulatedCreatureDefs().filter((manifest) => state.biome >= manifest.minBiome)'), 'logbook articulated scannable roster missing');
assert(entities.includes("target.kind === 'articulated'"), 'scanner articulated target branch missing');
assert(playtest.includes('articulatedManifestRoster'), 'playtest snapshot manifest roster missing');
assert(playtest.includes('spawnableInCurrentBiome'), 'playtest snapshot spawnable flag missing');
assert(playtest.includes('scannableInCurrentBiome'), 'playtest snapshot scannable flag missing');
assert(playtest.includes('contactDamageAtCurrentBiome'), 'playtest snapshot combat damage field missing');

assertBuff('abyssal-serpent', 360, 1.22, 450, 1.52);
assertBuff('abyssal-gulper', 265, 1.25, 330, 1.56);
assertBuff('abyssal-crownmaw', 390, 1.25, 490, 1.56);
assertBuff('abyssal-riftmaw', 225, 1, 280, 1.25);
assertBuff('abyssal-reliquary-wyrm', 270, 1, 340, 1.25);

if (failures.length) {
  console.error('Biome creature balance smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const summary = [
  'Biome creature balance smoke passed.',
  'New biome spawns: abyssal-gulper biome 3, abyssal-glasshook-skulk biome 3, abyssal-mandible-bobbit biome 2.',
  'Buffed: serpent 360/1.22 -> 450/1.52, gulper 265/1.25 -> 330/1.56, crownmaw 390/1.25 -> 490/1.56, riftmaw 225/1 -> 280/1.25, reliquary-wyrm 270/1 -> 340/1.25.',
];
console.log(summary.join('\n'));

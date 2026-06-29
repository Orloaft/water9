import { readFile } from 'node:fs/promises';

const files = {
  constants: await readFile('src/constants.ts', 'utf8'),
  content: await readFile('src/content.ts', 'utf8'),
  helpers: await readFile('src/helpers.ts', 'utf8'),
  economy: await readFile('src/scene-economy.ts', 'utf8'),
  hud: await readFile('src/hud.ts', 'utf8'),
  state: await readFile('src/state.ts', 'utf8'),
  save: await readFile('src/save-load.ts', 'utf8'),
  sub: await readFile('src/scene-sub.ts', 'utf8'),
  playtest: await readFile('src/scene-playtest.ts', 'utf8'),
  measurement: await readFile('tools/measure_progression.mjs', 'utf8'),
};

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

assert(files.constants.includes('export const BARGE_UPGRADE_COST = 7500'), 'Biome 1 barge cost is not 7,500c');
assert(files.helpers.includes('if (state.biome === 2) return 15000'), 'Biome 2 barge cost changed unexpectedly');
assert(files.helpers.includes('return 36000'), 'Biome 3 barge cost is not 36,000c');
assert(files.helpers.includes('export function biomeChartingRequirement'), 'charting requirement helper missing');
assert(files.helpers.includes('requiredScans: 4, requiredDepth: 900, requiredSonarCells: 2400'), 'Biome 1 charting requirement missing');
assert(files.helpers.includes('requiredScans: 5, requiredDepth: 1100, requiredSonarCells: 3200'), 'Biome 2 charting requirement missing');
assert(files.helpers.includes('requiredScans: 6, requiredDepth: 1250, requiredSonarCells: 4200'), 'Biome 3 charting requirement missing');
assert(files.economy.includes('canTravelToNextBiome()'), 'travel guard does not call canTravelToNextBiome');
assert(files.economy.includes('Charting incomplete'), 'travel blocked status copy missing');

assert(files.helpers.includes("kind: 'gulperSurvey'"), 'Gulper Wake Survey quest missing');
assert(files.helpers.includes('reward: 6000'), 'Gulper Wake Survey reward is not 6,000c');
assert(files.helpers.includes('grantsMarlinVoucher: true'), 'Gulper Wake Survey does not grant Marlin voucher');
assert(files.constants.includes('MARLIN_VOUCHER_DISCOUNT = 12000'), 'Marlin voucher discount is not 12,000c');
assert(files.state.includes('marlinVoucherAvailable: false'), 'voucher state missing');
assert(files.save.includes('marlinVoucherAvailable'), 'voucher state not persisted');
assert(files.sub.includes('subEffectiveCost(tier)'), 'sub purchase does not use effective cost');

assert(files.hud.includes('Chart biome'), 'travel button charting label missing');
assert(files.hud.includes('not required for entry'), 'B3 travel Marlin timing copy missing');
assert(files.content.includes('Scout route: best for mapping'), 'Seeker scout copy missing');
assert(files.content.includes('Work route: first mining sub'), 'Marlin work copy missing');
assert(files.hud.includes('Reliquary Vault Route'), 'Biome 4 reliquary route copy missing');
assert(files.playtest.includes('chartingProgress: biomeChartingProgress()'), 'playtest snapshot charting field missing');
assert(files.playtest.includes('marlinEffectiveCost: subEffectiveCost(2)'), 'playtest snapshot Marlin effective cost missing');
assert(files.measurement.includes('chartingRequirement: biomeChartingRequirement(biome)'), 'measurement report lacks charting requirement');
assert(files.measurement.includes('marlinEffectiveCostAfterVoucher'), 'measurement report lacks Marlin voucher economics');

if (failures.length) {
  console.error('Progression tuning smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Progression tuning smoke passed.');

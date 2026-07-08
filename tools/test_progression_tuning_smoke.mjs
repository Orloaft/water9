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

const scanRarityRanks = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

function scanRarityCredits(rarity) {
  if (rarity === 'legendary') return 4200;
  if (rarity === 'epic') return 1800;
  if (rarity === 'rare') return 360;
  if (rarity === 'uncommon') return 140;
  return 60;
}

function scanRewardFor(target, scannerLevel = 0) {
  const rarity = target.rarity;
  const dangerBonus = target.kind === 'articulated'
    ? rarity === 'legendary'
      ? 900
      : rarity === 'epic'
        ? 500
        : 160
    : target.kind === 'fish'
      ? target.hostile ? scanRarityRanks.indexOf(rarity) >= scanRarityRanks.indexOf('epic') ? 240 : 60 : 0
      : target.hazardous ? scanRarityRanks.indexOf(rarity) >= scanRarityRanks.indexOf('epic') ? 240 : 60 : 0;
  return Math.round((scanRarityCredits(rarity) + dangerBonus) * (1 + Math.min(scannerLevel, 4) * 0.08));
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

assert(scanRewardFor({ kind: 'fish', rarity: 'common', hostile: false }) === 60, 'Common scan reward is not 60c');
assert(scanRewardFor({ kind: 'fish', rarity: 'uncommon', hostile: false }) === 140, 'Uncommon scan reward is not 140c');
assert(scanRewardFor({ kind: 'fish', rarity: 'rare', hostile: false }) === 360, 'Plain rare scan reward is not 360c');
assert(scanRewardFor({ kind: 'fish', rarity: 'rare', hostile: true }) === 420, 'Hostile rare scan reward is not 420c');
assert(scanRewardFor({ kind: 'flora', rarity: 'epic', hazardous: true }) === 2040, 'Epic hazardous scan reward is not 2040c');
assert(scanRewardFor({ kind: 'articulated', rarity: 'rare' }) === 520, 'Rare articulated scan reward is not 520c');
assert(scanRewardFor({ kind: 'articulated', rarity: 'epic' }) === 2300, 'Epic articulated scan reward is not 2300c');
assert(scanRewardFor({ kind: 'articulated', rarity: 'legendary' }) === 5100, 'Legendary articulated scan reward is not 5100c');
assert(scanRewardFor({ kind: 'articulated', rarity: 'legendary' }, 4) === Math.round(5100 * 1.32), 'Scanner level 4 is not a 32% scan credit increase');
assert(scanRewardFor({ kind: 'articulated', rarity: 'legendary' }, 7) === Math.round(5100 * 1.32), 'Scanner credit multiplier is not capped at level 4');
assert(files.helpers.includes('Math.min(state.upgrades.scanner, 4) * 0.08'), 'scanReward helper does not use capped +8% scanner credit multiplier');
assert(files.measurement.includes('Math.min(scannerLevel, 4) * 0.08'), 'progression measurement does not mirror capped +8% scanner credit multiplier');
assert(
  /if \(!state\.scannedSpecies\.has\(target\.species\)\) \{\s*state\.scannedSpecies\.add\(target\.species\);\s*state\.credits \+= Math\.round\(scanReward\(target\) \* 0\.45\);/s.test(files.sub),
  'Aux-sub scan payout is not guarded by scannedSpecies',
);

if (failures.length) {
  console.error('Progression tuning smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Progression tuning smoke passed.');

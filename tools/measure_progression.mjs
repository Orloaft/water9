import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import ts from 'typescript';

const outPath = process.env.WATER9_PROGRESSION_REPORT ?? 'public/review/water9-progression-measurement.json';
const seeds = (process.env.WATER9_PROGRESSION_SEEDS ?? '1701,2718,3141,4637,7919')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter(Number.isFinite);

const contentSource = await readFile('src/content.ts', 'utf8');
const constantsSource = await readFile('src/constants.ts', 'utf8');
const helperSource = await readFile('src/helpers.ts', 'utf8');
const worldgenSource = await readFile('src/scene-worldgen.ts', 'utf8');
const articulatedManifest = JSON.parse(await readFile('public/assets/generated/articulated-creatures.parts.json', 'utf8'));

const constants = extractConstants(constantsSource);
const tiles = extractExport(contentSource, 'tiles', constants);
const upgrades = extractExport(contentSource, 'upgrades', constants);
const subDefs = extractExport(contentSource, 'subDefs', constants);
const shopItems = extractExport(contentSource, 'shopItems', constants);
const biomeFish = extractExport(contentSource, 'biomeFish', constants);
const biomeFlora = extractExport(contentSource, 'biomeFlora', constants);

const WORLD_W = constants.WORLD_W;
const WORLD_H = constants.WORLD_H;
const TILE = constants.TILE;
const deepScale = constants.deepScale;
const BASE_OXYGEN = constants.BASE_OXYGEN;
const BARGE_UPGRADE_COST = constants.BARGE_UPGRADE_COST;

function extractConstants(source) {
  const sf = ts.createSourceFile('constants.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const values = { Infinity };
  let changed = true;
  while (changed) {
    changed = false;
    for (const statement of sf.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      const isExport = statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
      if (!isExport) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer || declaration.name.text in values) continue;
        const expression = stripConstAssertion(declaration.initializer.getText(sf));
        try {
          values[declaration.name.text] = Function(...Object.keys(values), `return (${expression});`)(...Object.values(values));
          changed = true;
        } catch {
          // Some constants are structured groups that are not needed by this report.
        }
      }
    }
  }
  return values;
}

function extractExport(source, name, scope) {
  const sf = ts.createSourceFile('content.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  for (const statement of sf.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const isExport = statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (!isExport) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name || !declaration.initializer) continue;
      const expression = stripConstAssertion(declaration.initializer.getText(sf));
      return Function(...Object.keys(scope), `return (${expression});`)(...Object.values(scope));
    }
  }
  throw new Error(`Missing exported content object: ${name}`);
}

function stripConstAssertion(expression) {
  return expression.replace(/\s+as\s+const\b/g, '');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function linear(a, b, t) {
  return a + (b - a) * t;
}

function hash(x, y, s) {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 0.013) * 43758.5453123;
  return n - Math.floor(n);
}

function scaledDepthPx(value) {
  return value * deepScale;
}

function darknessForDepth(depth, biome) {
  if (biome === 1) return clamp((depth - 140) / 1180, 0, 0.9);
  if (biome === 2) return clamp((depth - 95) / 900, 0, 1);
  if (biome === 3) return clamp((depth - 45) / 680, 0, 1);
  return clamp((depth - 20) / 540, 0, 1);
}

function generateTile(x, y, biome, seed) {
  if (y < 7) return 'water';
  if (x <= 1 || x >= WORLD_W - 2 || y >= WORLD_H - 2) return 'bedrock';
  const depth = y * TILE;
  const shallow = clamp(1 - (y - 7) / (52 * deepScale), 0, 1);
  const cave =
    Math.sin(x * 0.31 + seed) * 0.72 +
    Math.cos(y * 0.21 + seed * 0.01) * 0.64 +
    Math.sin((x + y) * 0.12 + seed * 0.04) * 0.42 +
    (hash(x, y, seed) - 0.5) * 1.35;
  const caveThreshold = linear(0.26, 1.04, 1 - shallow);
  if (cave > caveThreshold && y > 8) return 'water';
  if (biome === 4) {
    if (depth > scaledDepthPx(360) && hash(x * 5, y * 7, seed) > 0.94 && (x + y) % 5 !== 0) return 'anchorstone';
    return depth > scaledDepthPx(260) || hash(y, x, seed) > 0.55 ? 'stone' : 'sand';
  }
  if (biome === 3) {
    if (depth > scaledDepthPx(420) && hash(x * 3, y * 5, seed) > 0.93 && (x + y) % 4 !== 0) return 'anchorstone';
    return depth > scaledDepthPx(280) || hash(y, x, seed) > 0.58 ? 'stone' : 'sand';
  }
  if (biome === 2) return depth > scaledDepthPx(360) || hash(y, x, seed) > 0.66 ? 'stone' : 'sand';
  return depth > scaledDepthPx(520) || hash(y, x, seed) > 0.74 ? 'stone' : 'sand';
}

function veinRulesForBiome(biome) {
  if (biome === 4) {
    return [
      { tile: 'ruinCore', minDepth: 1560, minDarkness: 0.88, chance: 0.0009, minSize: 1, maxSize: 2, salt: 97 },
      { tile: 'abyssalCrown', minDepth: 1180, minDarkness: 0.82, chance: 0.0035, minSize: 2, maxSize: 4, salt: 89 },
      { tile: 'sunstone', minDepth: 960, minDarkness: 0.78, chance: 0.007, minSize: 3, maxSize: 6, salt: 83 },
      { tile: 'alienAlloy', minDepth: 540, minDarkness: 0.62, chance: 0.010, minSize: 4, maxSize: 9, salt: 79 },
      { tile: 'cobalt', minDepth: 340, chance: 0.009, minSize: 4, maxSize: 8, salt: 73 },
    ];
  }
  if (biome === 3) {
    return [
      { tile: 'abyssalCrown', minDepth: 1440, minDarkness: 0.84, chance: 0.0012, minSize: 1, maxSize: 2, salt: 71 },
      { tile: 'relic', minDepth: 1120, chance: 0.003, minSize: 2, maxSize: 4, salt: 67 },
      { tile: 'sunstone', minDepth: 1260, chance: 0.006, minSize: 3, maxSize: 6, salt: 61 },
      { tile: 'cobalt', minDepth: 760, chance: 0.009, minSize: 4, maxSize: 8, salt: 59 },
      { tile: 'ruby', minDepth: 300, chance: 0.008, minSize: 5, maxSize: 9, salt: 53 },
    ];
  }
  if (biome === 2) {
    return [
      { tile: 'precursorEngine', minDepth: 1320, minDarkness: 0.78, chance: 0.0009, minSize: 1, maxSize: 2, salt: 47 },
      { tile: 'relic', minDepth: 1040, chance: 0.0028, minSize: 2, maxSize: 4, salt: 43 },
      { tile: 'sunstone', minDepth: 1220, chance: 0.004, minSize: 3, maxSize: 5, salt: 41 },
      { tile: 'cobalt', minDepth: 620, chance: 0.008, minSize: 4, maxSize: 8, salt: 37 },
      { tile: 'quartz', minDepth: 260, chance: 0.009, minSize: 5, maxSize: 10, salt: 31 },
    ];
  }
  return [
    { tile: 'drownedIdol', minDepth: 1420, minDarkness: 0.72, chance: 0.0006, minSize: 1, maxSize: 2, salt: 29 },
    { tile: 'relic', minDepth: 1240, chance: 0.0022, minSize: 2, maxSize: 4, salt: 23 },
    { tile: 'ruby', minDepth: 900, chance: 0.0045, minSize: 3, maxSize: 6, salt: 19 },
    { tile: 'quartz', minDepth: 460, chance: 0.0065, minSize: 4, maxSize: 8, salt: 17 },
    { tile: 'copper', minDepth: 180, chance: 0.008, minSize: 5, maxSize: 10, salt: 13 },
  ];
}

function veinRuleAt(x, y, rules, biome, seed) {
  const depth = y * TILE;
  const depthMeters = Math.max(0, (y - 4) * 6);
  const darkness = darknessForDepth(depthMeters, biome);
  for (const rule of rules) {
    if (depth < scaledDepthPx(rule.minDepth)) continue;
    if (rule.minDarkness !== undefined && darkness < rule.minDarkness) continue;
    const r = hash(x * rule.salt + 11, y * (rule.salt + 6) + 17, seed);
    if (r > 1 - rule.chance) return rule;
  }
  return null;
}

function canHostOre(world, x, y) {
  const tile = world[y]?.[x];
  return tile === 'stone' || tile === 'sand';
}

function growOreVein(world, startX, startY, rule, seed) {
  const span = rule.maxSize - rule.minSize + 1;
  const targetSize = rule.minSize + Math.floor(hash(startX * 53, startY * 59, seed) * span);
  const frontier = [{ x: startX, y: startY }];
  let placed = 0;
  while (frontier.length > 0 && placed < targetSize) {
    const index = Math.floor(hash(startX + placed * 17, startY + frontier.length * 23, seed) * frontier.length) % frontier.length;
    const current = frontier.splice(index, 1)[0];
    if (!canHostOre(world, current.x, current.y)) continue;
    world[current.y][current.x] = rule.tile;
    placed += 1;
    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];
    if (hash(current.x * 31, current.y * 37, seed) > 0.62) {
      neighbors.push({ x: current.x + 1, y: current.y + (hash(current.x, current.y, seed) > 0.5 ? 1 : -1) });
    }
    for (const neighbor of neighbors) {
      if (!canHostOre(world, neighbor.x, neighbor.y)) continue;
      if (hash(neighbor.x * 41 + placed, neighbor.y * 43 + targetSize, seed) < 0.22) continue;
      frontier.push(neighbor);
    }
  }
}

function surveyWorldOre(biome, seed) {
  const world = Array.from({ length: WORLD_H }, (_, y) =>
    Array.from({ length: WORLD_W }, (_, x) => generateTile(x, y, biome, seed)),
  );
  const rules = veinRulesForBiome(biome);
  for (let y = 8; y < WORLD_H - 2; y += 1) {
    for (let x = 2; x < WORLD_W - 2; x += 1) {
      if (!canHostOre(world, x, y)) continue;
      const rule = veinRuleAt(x, y, rules, biome, seed);
      if (rule) growOreVein(world, x, y, rule, seed);
    }
  }
  const tileCounts = {};
  const oreCounts = {};
  let oreValue = 0;
  let waterCells = 0;
  let solidCells = 0;
  let deepestWaterMeters = 0;
  for (let y = 0; y < WORLD_H; y += 1) {
    for (let x = 0; x < WORLD_W; x += 1) {
      const tile = world[y][x];
      tileCounts[tile] = (tileCounts[tile] ?? 0) + 1;
      if (tile === 'water') {
        waterCells += 1;
        deepestWaterMeters = Math.max(deepestWaterMeters, Math.max(0, (y - 4) * 6));
      }
      if (tiles[tile]?.solid) solidCells += 1;
      if ((tiles[tile]?.value ?? 0) > 0) {
        oreCounts[tile] = (oreCounts[tile] ?? 0) + 1;
        oreValue += tiles[tile].value;
      }
    }
  }
  return { seed, waterCells, solidCells, deepestWaterMeters, tileCounts, oreCounts, oreValue };
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp((sorted.length - 1) * p, 0, sorted.length - 1);
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo);
}

function summarizeOreSurveys(biome) {
  const runs = seeds.map((seed) => surveyWorldOre(biome, seed + biome * 1009));
  const mergedCounts = {};
  for (const run of runs) {
    for (const [tile, count] of Object.entries(run.oreCounts)) mergedCounts[tile] = (mergedCounts[tile] ?? 0) + count;
  }
  const values = runs.map((run) => run.oreValue);
  const water = runs.map((run) => run.waterCells);
  return {
    seeds: runs.map((run) => run.seed),
    meanOreValue: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
    p10OreValue: Math.round(percentile(values, 0.1)),
    p90OreValue: Math.round(percentile(values, 0.9)),
    meanWaterCells: Math.round(water.reduce((sum, value) => sum + value, 0) / water.length),
    deepestWaterMeters: Math.round(Math.max(...runs.map((run) => run.deepestWaterMeters))),
    meanOreCounts: Object.fromEntries(Object.entries(mergedCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tile, count]) => [tile, Number((count / runs.length).toFixed(1))])),
  };
}

function upgradeMax(upgrade, biome) {
  if (biome === 4 && upgrade.biome === 1) return upgrade.max + 8;
  if (biome === 3 && upgrade.biome === 1) return upgrade.max + 6;
  if (biome >= 2 && upgrade.biome === 1) return upgrade.max + 3;
  if (biome === 4 && upgrade.biome === 2) return upgrade.max + 3;
  return upgrade.max;
}

function upgradeCost(upgrade, level) {
  return Math.round(upgrade.baseCost * (1 + level * 0.72));
}

function bargeUpgradeCost(biome) {
  if (biome === 1) return BARGE_UPGRADE_COST;
  if (biome === 2) return 15000;
  return 36000;
}

function biomeChartingRequirement(biome) {
  if (biome === 1) return { requiredScans: 4, requiredDepth: 900, requiredSonarCells: 2400, threatProof: 'hostile-or-apex scan' };
  if (biome === 2) return { requiredScans: 5, requiredDepth: 1100, requiredSonarCells: 3200, threatProof: 'apex scan' };
  if (biome === 3) return { requiredScans: 6, requiredDepth: 1250, requiredSonarCells: 4200, threatProof: 'apex scan' };
  return null;
}

function costToBiomeGate(biome) {
  if (biome >= 4) return 0;
  const gateCost = bargeUpgradeCost(biome);
  const newlyUnlocked = upgrades
    .filter((upgrade) => upgrade.biome <= biome)
    .map((upgrade) => {
      const currentCap = biome === 1 ? 0 : upgradeMax(upgrade, biome - 1);
      const targetCap = upgradeMax(upgrade, biome);
      let cost = 0;
      for (let level = currentCap; level < targetCap; level += 1) cost += upgradeCost(upgrade, level);
      return { id: upgrade.id, levels: Math.max(0, targetCap - currentCap), cost };
    })
    .filter((entry) => entry.levels > 0);
  const recommendedUpgradeSpend = newlyUnlocked.reduce((sum, entry) => sum + entry.cost, 0);
  return {
    biome,
    gateCost,
    recommendedUpgradeSpend,
    totalCredits: gateCost + recommendedUpgradeSpend,
    newlyUnlocked,
  };
}

function scanRarityCredits(rarity) {
  if (rarity === 'legendary') return 3600;
  if (rarity === 'epic') return 2100;
  if (rarity === 'rare') return 1150;
  if (rarity === 'uncommon') return 620;
  return 320;
}

const scanRarityRanks = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

function scanRarityRank(rarity) {
  return scanRarityRanks.indexOf(rarity);
}

function promoteScanRarity(rarity) {
  return scanRarityRanks[Math.min(scanRarityRanks.length - 1, scanRarityRank(rarity) + 1)];
}

function capScanRarity(rarity, cap) {
  return scanRarityRanks[Math.min(scanRarityRank(rarity), scanRarityRank(cap))];
}

function fishRarity(species, speciesList) {
  const maxCount = Math.max(...speciesList.map((entry) => entry.count));
  const biomeTop = Math.min(...speciesList.map((entry) => entry.minY));
  const biomeBottom = Math.max(...speciesList.map((entry) => entry.maxY));
  const biomeRange = Math.max(1, biomeBottom - biomeTop);
  const depthShare = Math.max(0.12, Math.min(1, (species.maxY - species.minY) / biomeRange));
  const score = (species.count / maxCount) * (0.7 + depthShare * 0.3);
  const deepStart = (species.minY - biomeTop) / biomeRange;

  if (species.radius >= 29 || (species.hostile && species.radius >= 27 && species.count <= 5)) return 'legendary';

  let rarity = score >= 0.46
    ? 'common'
    : score >= 0.24
      ? 'uncommon'
      : 'rare';

  const largeSpecialist = species.radius >= 22 || (species.hostile && species.radius >= 18);
  const deepSpecialist = deepStart >= 0.62 && score < 0.2;
  const scarceThreat = species.hostile && species.count <= 3 && species.radius >= 12;
  if (largeSpecialist || deepSpecialist || scarceThreat) rarity = promoteScanRarity(rarity);
  if (species.pattern === 'school' && species.count >= 5) rarity = capScanRarity(rarity, 'uncommon');
  if (!species.hostile && species.radius < 18 && species.count >= 3) rarity = capScanRarity(rarity, 'rare');
  return capScanRarity(rarity, 'epic');
}

function floraRarity(species) {
  if (species.rare && species.hazardous) return 'epic';
  if (species.rare || species.count <= 5) return 'rare';
  if (species.hazardous || species.count <= 10 || species.minY >= 760) return 'uncommon';
  return 'common';
}

function scanRewardFor(target, scannerLevel = 0) {
  const rarity = target.rarity;
  const base = scanRarityCredits(rarity);
  const dangerBonus = target.kind === 'articulated'
    ? 720
    : target.kind === 'fish'
      ? target.hostile ? 180 : 0
      : target.hazardous ? 220 : 0;
  return Math.round((base + dangerBonus) * (1 + scannerLevel * 0.16));
}

function scanSurvey(biome) {
  const fish = biomeFish[biome].map((species) => {
    const rarity = fishRarity(species, biomeFish[biome]);
    return {
      kind: 'fish',
      species: species.species,
      rarity,
      hostile: species.hostile,
      count: species.count,
      rewardBase: scanRewardFor({ kind: 'fish', rarity, hostile: species.hostile }),
      rewardScannerMax: scanRewardFor({ kind: 'fish', rarity, hostile: species.hostile }, upgradeMax(upgrades.find((upgrade) => upgrade.id === 'scanner'), biome)),
    };
  });
  const flora = biomeFlora[biome].map((species) => ({
    kind: 'flora',
    species: species.species,
    rarity: floraRarity(species),
    hazardous: species.hazardous,
    count: species.count,
    rewardBase: scanRewardFor({ kind: 'flora', rarity: floraRarity(species), hazardous: species.hazardous }),
    rewardScannerMax: scanRewardFor({ kind: 'flora', rarity: floraRarity(species), hazardous: species.hazardous }, upgradeMax(upgrades.find((upgrade) => upgrade.id === 'scanner'), biome)),
  }));
  const articulated = (articulatedManifest.creatures ?? [])
    .filter((creature) => biome >= creature.minBiome)
    .map((creature) => ({
      kind: 'articulated',
      species: creature.species,
      id: creature.id,
      rarity: creature.rarity,
      count: creature.spawn?.count ?? 0,
      rewardBase: scanRewardFor({ kind: 'articulated', rarity: creature.rarity }),
      rewardScannerMax: scanRewardFor({ kind: 'articulated', rarity: creature.rarity }, upgradeMax(upgrades.find((upgrade) => upgrade.id === 'scanner'), biome)),
    }));
  const entries = [...fish, ...flora, ...articulated];
  return {
    targets: entries.length,
    rewardBaseTotal: entries.reduce((sum, entry) => sum + entry.rewardBase, 0),
    rewardScannerMaxTotal: entries.reduce((sum, entry) => sum + entry.rewardScannerMax, 0),
    topBaseRewards: [...entries].sort((a, b) => b.rewardBase - a.rewardBase).slice(0, 8),
    byRarity: entries.reduce((acc, entry) => {
      acc[entry.rarity] = (acc[entry.rarity] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

function questBoardFor(biome, seed, hasNest = true) {
  const depthTarget = Math.round(linear(360, 1380, biome / 4) + hash(3, biome, seed) * 220);
  const scanTarget = 2 + biome + Math.floor(hash(5, biome, seed) * 3);
  const oreTarget = Math.round((620 + biome * 520 + hash(7, biome, seed) * 380) / 50) * 50;
  const quests = [
    { kind: 'depth', title: 'Pressure Line Survey', reward: 520 + biome * 420, target: depthTarget },
    { kind: 'scan', title: 'Live Catalog Sweep', reward: 640 + biome * 460, target: scanTarget },
    { kind: 'ore', title: 'Ore Purchase Order', reward: 780 + biome * 520, target: oreTarget },
  ];
  if (hasNest && hash(11, biome, seed) < 0.46 + biome * 0.08) {
    quests.push({ kind: 'nest', title: 'Rare: Nest Extermination', reward: 2400 + biome * 1350, target: 1, rare: true });
  }
  if (biome === 3) {
    quests.push({
      kind: 'gulperSurvey',
      title: 'Rare: Gulper Wake Survey',
      reward: 6000,
      target: 1350,
      rare: true,
      grantsMarlinVoucher: true,
      marlinVoucherDiscount: 12000,
    });
  }
  return quests;
}

function questSurvey(biome) {
  const boards = seeds.map((seed) => questBoardFor(biome, seed + biome * 1009));
  const rewards = boards.flat().map((quest) => quest.reward);
  return {
    boards: boards.length,
    meanReward: Math.round(rewards.reduce((sum, reward) => sum + reward, 0) / rewards.length),
    questKinds: boards.flat().reduce((acc, quest) => {
      acc[quest.kind] = (acc[quest.kind] ?? 0) + 1;
      return acc;
    }, {}),
    sampleBoard: boards[0],
  };
}

function tripModel(biome, oreSurvey, scan) {
  const gate = costToBiomeGate(biome);
  if (!gate) return { biome, note: 'No next-biome gate after biome 4.' };
  const cargoUpgrade = Math.min(upgradeMax(upgrades.find((upgrade) => upgrade.id === 'cargo'), biome), biome === 1 ? 2 : biome === 2 ? 5 : 7);
  const cargoSlots = 6 + cargoUpgrade * 4;
  const commonOreValue = Object.entries(oreSurvey.meanOreCounts)
    .map(([tile, count]) => ({ tile, count, value: tiles[tile].value }))
    .filter((entry) => entry.value < 1000)
    .sort((a, b) => b.value - a.value);
  const weightedTopOre = commonOreValue.slice(0, 3).reduce((sum, entry) => sum + entry.value * entry.count, 0)
    / Math.max(1, commonOreValue.slice(0, 3).reduce((sum, entry) => sum + entry.count, 0));
  const oreTripCredits = Math.round(cargoSlots * (weightedTopOre || 50) * 0.82);
  const scanTripCredits = Math.round(scan.rewardBaseTotal * 0.18);
  const questTripCredits = Math.round(questSurvey(biome).meanReward * 0.45);
  const creditsPerTrip = oreTripCredits + scanTripCredits + questTripCredits;
  const tripsToGate = Number((gate.totalCredits / Math.max(1, creditsPerTrip)).toFixed(1));
  const minutesPerTrip = biome === 1 ? 4.5 : biome === 2 ? 6.5 : 8.5;
  return {
    biome,
    gateCredits: gate.gateCost,
    chartingRequirement: biomeChartingRequirement(biome),
    recommendedUpgradeSpend: gate.recommendedUpgradeSpend,
    totalCredits: gate.totalCredits,
    assumedCargoSlots: cargoSlots,
    estimatedCreditsPerTrip: creditsPerTrip,
    creditMix: { oreTripCredits, scanTripCredits, questTripCredits },
    marlinListCost: subDefs.find((sub) => sub.tier === 2)?.cost ?? 0,
    marlinEffectiveCostAfterVoucher: biome === 3 ? Math.max(0, (subDefs.find((sub) => sub.tier === 2)?.cost ?? 0) - 12000) : undefined,
    estimatedTripsToGate: tripsToGate,
    estimatedMinutesToGate: Math.round(tripsToGate * minutesPerTrip),
  };
}

function sourceSmoke() {
  const failures = [];
  if (!helperSource.includes('export function scanReward(target: ScanTarget)')) failures.push('scanReward helper missing');
  if (!helperSource.includes('export function bargeUpgradeCost()')) failures.push('bargeUpgradeCost helper missing');
  if (!worldgenSource.includes('export function populateOreVeins')) failures.push('populateOreVeins worldgen hook missing');
  if (!worldgenSource.includes('export function growOreVein')) failures.push('growOreVein worldgen hook missing');
  if (!Array.isArray(articulatedManifest.creatures) || articulatedManifest.creatures.length === 0) failures.push('articulated manifest has no creatures');
  return { ok: failures.length === 0, failures };
}

const biomes = [1, 2, 3, 4].map((biome) => {
  const ore = summarizeOreSurveys(biome);
  const scan = scanSurvey(biome);
  return {
    biome,
    name: biome === 1 ? 'The Shallows' : biome === 2 ? 'Brine Vent Shelf' : biome === 3 ? 'Midnight Trench' : 'Abyssal Ruins',
    ore,
    scans: scan,
    quests: questSurvey(biome),
    economy: tripModel(biome, ore, scan),
  };
});

const report = {
  ok: true,
  generatedAt: new Date().toISOString(),
  seeds,
  source: {
    formulas: [
      'src/helpers.ts generateTile/veinRulesForBiome/veinRuleAt/hash/darknessForDepth/scanReward/bargeUpgradeCost/upgradeCost/upgradeMax',
      'src/scene-worldgen.ts populateOreVeins/growOreVein',
      'src/content.ts tiles/upgrades/subDefs/shopItems/biomeFish/biomeFlora',
      'public/assets/generated/articulated-creatures.parts.json',
    ],
    smoke: sourceSmoke(),
  },
  constants: {
    worldTiles: { width: WORLD_W, height: WORLD_H },
    baseOxygen: BASE_OXYGEN,
    bargeUpgradeCost: BARGE_UPGRADE_COST,
    subCosts: subDefs.map((sub) => ({ tier: sub.tier, name: sub.name, cost: sub.cost })),
    shopItemCosts: shopItems.map((item) => ({ id: item.id, cost: item.cost })),
  },
  biomes,
};

if (!report.source.smoke.ok) report.ok = false;
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Water9 progression measurement ${report.ok ? 'passed' : 'failed'}.`);
console.log(`Report: ${outPath}`);
console.table(biomes.map((entry) => ({
  biome: entry.biome,
  oreValue: entry.ore.meanOreValue,
  scanBase: entry.scans.rewardBaseTotal,
  gateCredits: entry.economy.totalCredits ?? 0,
  trips: entry.economy.estimatedTripsToGate ?? '',
  minutes: entry.economy.estimatedMinutesToGate ?? '',
})));

if (!report.ok) process.exit(1);

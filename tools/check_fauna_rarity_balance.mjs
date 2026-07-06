#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import ts from 'typescript';

const outPath = process.env.WATER9_FAUNA_RARITY_AUDIT ?? 'runs/water9-fauna-rarity-balance-2026-07-06/fauna-rarity-audit.json';
const ranks = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const contentSource = await readFile('src/content.ts', 'utf8');
const biomeFish = extractExport(contentSource, 'biomeFish');

function extractExport(source, name) {
  const sf = ts.createSourceFile('content.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  for (const statement of sf.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const isExport = statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (!isExport) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name || !declaration.initializer) continue;
      const expression = declaration.initializer.getText(sf).replace(/\s+as\s+const\b/g, '');
      return Function(`return (${expression});`)();
    }
  }
  throw new Error(`Missing exported content object: ${name}`);
}

function rank(rarity) {
  return ranks.indexOf(rarity);
}

function promote(rarity) {
  return ranks[Math.min(ranks.length - 1, rank(rarity) + 1)];
}

function cap(rarity, capRarity) {
  return ranks[Math.min(rank(rarity), rank(capRarity))];
}

function legacyFishRarity(species) {
  if (species.count <= 4 || species.radius >= 29) return 'legendary';
  if (species.count <= 5 || species.radius >= 24 || species.minY >= 1500) return 'epic';
  if (species.count <= 7 || species.hostile || species.minY >= 980) return 'rare';
  if (species.count <= 10 || species.minY >= 520) return 'uncommon';
  return 'common';
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
  if (largeSpecialist || deepSpecialist || scarceThreat) rarity = promote(rarity);
  if (species.pattern === 'school' && species.count >= 5) rarity = cap(rarity, 'uncommon');
  if (!species.hostile && species.radius < 18 && species.count >= 3) rarity = cap(rarity, 'rare');
  return cap(rarity, 'epic');
}

function rarityCounts(entries, selector) {
  const counts = Object.fromEntries(ranks.map((rarity) => [rarity, 0]));
  for (const entry of entries) counts[selector(entry)] += 1;
  return counts;
}

function addCounts(target, counts) {
  for (const rarity of ranks) target[rarity] += counts[rarity];
}

function rarityLabel(rarity) {
  return rarity[0].toUpperCase() + rarity.slice(1);
}

function scanRarityCredits(rarity) {
  if (rarity === 'legendary') return 3600;
  if (rarity === 'epic') return 2100;
  if (rarity === 'rare') return 1150;
  if (rarity === 'uncommon') return 620;
  return 320;
}

function scanReward(species, rarity) {
  return scanRarityCredits(rarity) + (species.hostile ? 180 : 0);
}

function findSpecies(biome, speciesName) {
  const match = biomeFish[biome].find((species) => species.species === speciesName);
  if (!match) throw new Error(`Missing representative species: biome ${biome} ${speciesName}`);
  return match;
}

const byBiome = {};
const totals = {
  species: 0,
  before: Object.fromEntries(ranks.map((rarity) => [rarity, 0])),
  after: Object.fromEntries(ranks.map((rarity) => [rarity, 0])),
};
const entries = [];

for (const [biome, speciesList] of Object.entries(biomeFish)) {
  const afterBySpecies = new Map(speciesList.map((species) => [species, fishRarity(species, speciesList)]));
  const before = rarityCounts(speciesList, legacyFishRarity);
  const after = rarityCounts(speciesList, (species) => afterBySpecies.get(species));
  byBiome[biome] = { species: speciesList.length, before, after };
  totals.species += speciesList.length;
  addCounts(totals.before, before);
  addCounts(totals.after, after);
  for (const species of speciesList) {
    const rarity = afterBySpecies.get(species);
    entries.push({
      biome: Number(biome),
      species: species.species,
      count: species.count,
      minY: species.minY,
      maxY: species.maxY,
      radius: species.radius,
      hostile: species.hostile,
      pattern: species.pattern,
      before: legacyFishRarity(species),
      after: rarity,
      reward: scanReward(species, rarity),
    });
  }
}

const representatives = [
  { biome: 1, species: 'Lantern Fry', expected: 'common' },
  { biome: 1, species: 'Opal Fan Shrimp', expected: 'rare' },
  { biome: 1, species: 'Glimmer Spine Urchin', expected: 'epic' },
  { biome: 2, species: 'Ash Minnow', expected: 'common' },
  { biome: 2, species: 'Moonmask Lionfish', expected: 'epic' },
  { biome: 2, species: 'Blueglass Anthias', expected: 'uncommon' },
  { biome: 3, species: 'Black Swallower', expected: 'legendary' },
  { biome: 3, species: 'Abyssal Thread Eel', expected: 'rare' },
  { biome: 4, species: 'Static Fry', expected: 'common' },
  { biome: 4, species: 'Cinder Maw Dragonfish', expected: 'epic' },
];

const representativeLabels = representatives.map((item) => {
  const species = findSpecies(item.biome, item.species);
  const rarity = fishRarity(species, biomeFish[item.biome]);
  const reward = scanReward(species, rarity);
  return {
    ...item,
    before: legacyFishRarity(species),
    after: rarity,
    reward,
    logLine: `Cataloged ${species.species} (${rarityLabel(rarity)}). Research paid ${reward} credits.`,
  };
});

const failures = [];
const totalLegendaryShare = totals.after.legendary / Math.max(1, totals.species);
if (totalLegendaryShare > 0.08) {
  failures.push(`Legendary share inflated: ${totals.after.legendary}/${totals.species} (${(totalLegendaryShare * 100).toFixed(1)}%)`);
}

for (const [biome, summary] of Object.entries(byBiome)) {
  const maxLegendary = Math.max(1, Math.ceil(summary.species * 0.08));
  if (summary.after.legendary > maxLegendary) {
    failures.push(`Biome ${biome} has ${summary.after.legendary} legendary fauna; expected <= ${maxLegendary}`);
  }
}

for (const entry of entries) {
  if (entry.count >= 5 && entry.pattern === 'school' && rank(entry.after) > rank('uncommon')) {
    failures.push(`High-count school species ${entry.species} in biome ${entry.biome} is ${entry.after}`);
  }
  if (entry.count >= 8 && !entry.hostile && entry.after === 'legendary') {
    failures.push(`High-count common species ${entry.species} in biome ${entry.biome} is legendary`);
  }
}

for (const item of representativeLabels) {
  if (item.after !== item.expected) {
    failures.push(`Representative ${item.species} in biome ${item.biome} expected ${item.expected}, got ${item.after}`);
  }
}

const audit = {
  generatedAt: new Date().toISOString(),
  model: {
    basis: 'per-biome encounter frequency from relative count and depth-band availability, with danger/size/deep-specialist modifiers capped so ordinary fillers cannot become legendary',
    legendaryRule: 'radius >= 29, or hostile radius >= 27 with count <= 5',
    thresholds: {
      common: 'encounterScore >= 0.46',
      uncommon: 'encounterScore >= 0.24',
      rare: 'default low-frequency label',
      epic: 'rare/uncommon promoted by large, dangerous, scarce-threat, or deep-specialist traits',
    },
  },
  byBiome,
  total: totals,
  representativeLabels,
  entries,
  failures,
};

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(audit, null, 2)}\n`);

console.log(`Wrote ${outPath}`);
console.log(`Legendary total: ${totals.before.legendary} -> ${totals.after.legendary} of ${totals.species}`);
for (const [biome, summary] of Object.entries(byBiome)) {
  console.log(`Biome ${biome}: legendary ${summary.before.legendary} -> ${summary.after.legendary}`);
}
if (failures.length > 0) {
  console.error(failures.map((failure) => `FAIL: ${failure}`).join('\n'));
  process.exit(1);
}
console.log('Fauna rarity balance check passed.');

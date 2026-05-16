import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.PLAYTEST_URL ?? 'http://localhost:5175/';
const targetUrl = withPlaytestParam(baseUrl);
const outputPath = process.env.PLAYTEST_OUT ?? 'playtest-report.json';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

async function waitForPlaytestApi() {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 10000 });
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot();
    return Boolean(snap?.world && snap.world.ready !== false);
  }, null, { timeout: 10000 });
}

function withPlaytestParam(url) {
  const parsed = new URL(url);
  parsed.searchParams.set('playtest', '1');
  return parsed.toString();
}

async function command(name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => {
    return window.__AQUA_PLAYTEST__?.command(commandName, commandValue);
  }, [name, value]);
  await page.waitForTimeout(result?.restarting ? 180 : 40);
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot();
    return Boolean(snap?.world && snap.world.ready !== false);
  }, null, { timeout: 10000 });
  return snapshot();
}

async function snapshot() {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot());
}

function summarizeBiome(snap) {
  return {
    biome: snap.state.biome,
    name: snap.state.biomeName,
    reachableDepth: snap.world.reachable.deepestMeters,
    reachableWater: snap.world.reachable.waterCoverage,
    fish: snap.world.entities.fish,
    hostileFish: snap.world.entities.hostileFish,
    vents: snap.world.entities.vents,
    bobbits: snap.world.entities.bobbits,
    bands: snap.world.bands.map((band) => ({
      name: band.name,
      water: band.waterRatio,
      oreBlocks: band.oreBlocks,
      oreValue: band.oreValue,
      unmineable: band.unmineableRatio,
    })),
  };
}

try {
  await page.goto(targetUrl, { waitUntil: 'networkidle' });
  await waitForPlaytestApi();
  await command('start');

  const biomes = [];
  for (const biome of [1, 2, 3, 4]) {
    await command('setBiome', biome);
    await page.waitForFunction((expectedBiome) => {
      return window.__AQUA_PLAYTEST__?.snapshot()?.state?.biome === expectedBiome;
    }, biome);
    biomes.push(summarizeBiome(await snapshot()));
  }

  await command('setBiome', 1);
  await command('setCredits', 250000);
  await command('maxUpgrades');
  await command('buySub', 3);
  await command('dive');
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(1800);
  await page.keyboard.up('ArrowDown');
  await command('teleportDepth', 1200);
  const subSmoke = await snapshot();

  const report = {
    url: targetUrl,
    generatedAt: new Date().toISOString(),
    biomes,
    subSmoke: {
      depth: subSmoke.state.depth,
      hull: subSmoke.state.activeSub?.hull ?? null,
      oxygen: subSmoke.state.activeSub?.oxygen ?? null,
      fuel: subSmoke.state.activeSub?.fuel ?? null,
      piloting: subSmoke.state.activeSub?.piloting ?? false,
      cargoCapacity: subSmoke.state.cargoCapacity,
    },
  };

  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Playtest report written to ${outputPath}`);
  console.table(biomes.map((biome) => ({
    biome: biome.biome,
    name: biome.name,
    reachableDepth: biome.reachableDepth,
    reachableWater: biome.reachableWater,
    fish: biome.fish,
    hostileFish: biome.hostileFish,
    vents: biome.vents,
    bobbits: biome.bobbits,
  })));
} finally {
  await browser.close();
}

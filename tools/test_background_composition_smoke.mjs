import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_COMPOSITION_PORT ?? 5190);
const reportPath = process.env.WATER9_COMPOSITION_REPORT
  ?? 'runs/swimming-backgrounds-full-implementation-2026-07-13/slice2-composition-smoke.json';
const seeds = [101, 202, 303, 404, 505, 606, 707, 808, 909, 1010, 1111, 1212];

async function portAvailable(port) {
  return new Promise((done) => {
    const probe = net.createServer();
    probe.once('error', () => done(false));
    probe.once('listening', () => probe.close(() => done(true)));
    probe.listen(port, host);
  });
}

async function choosePort() {
  const candidates = [...Array.from({ length: 20 }, (_, index) => 5180 + index)]
    .sort((a, b) => Math.abs(a - requestedPort) - Math.abs(b - requestedPort));
  for (const port of candidates) if (await portAvailable(port)) return port;
  throw new Error('no free composition-smoke port in 5180-5199');
}

const port = await choosePort();
const baseUrl = `http://${host}:${port}/`;
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
const serverLogs = [];
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));
const errors = [];
const fail = (text) => errors.push({ type: 'assertion', text });
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {}
    await sleep(120);
  }
  throw new Error('composition-smoke server did not become ready');
}

let browser;
let report;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
  await page.goto(`${baseUrl}?playtest=1&biome=1&seed=101&renderer=canvas`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.snapshot), null, { timeout: 25000 });

  const matrix = await page.evaluate(async (sampleSeeds) => {
    const helpers = await import('/src/helpers.ts');
    const { rng } = await import('/src/rng.ts');
    const width = 1440 / 3.7;
    const height = 900 / 3.7;
    const cutoffs = [120, 520, 1040, 1440];
    const rows = [];
    for (const biome of [1, 2, 3, 4]) {
      for (const seed of sampleSeeds) {
        rng.seed = seed;
        for (const locationX of [0, 480]) {
          const locationY = 760;
          const profile = helpers.environmentVisualProfileFor(biome, 760);
          const first = helpers.environmentAnchorSilhouettesFor(profile, locationX, locationX + width, locationY, locationY + height);
          const revisit = helpers.environmentAnchorSilhouettesFor(profile, locationX, locationX + width, locationY, locationY + height);
          rows.push({
            biome,
            seed,
            locationX,
            budget: helpers.compositionBudgetForBiome(biome),
            assets: helpers.compositionLandmarkAssetsForBiome(biome).map((asset) => ({
              id: asset.id,
              textureKey: asset.textureKey,
              sourceStatus: asset.sourceStatus,
              availableInRuntime: asset.availableInRuntime,
              path: asset.path,
            })),
            first,
            revisit,
          });
        }
        for (const cutoff of cutoffs) {
          const beforeProfile = helpers.environmentVisualProfileFor(biome, cutoff - 1);
          const afterProfile = helpers.environmentVisualProfileFor(biome, cutoff + 1);
          const top = cutoff - height * 0.5;
          const before = helpers.environmentAnchorSilhouettesFor(beforeProfile, 0, width, top, top + height);
          const after = helpers.environmentAnchorSilhouettesFor(afterProfile, 0, width, top, top + height);
          rows.push({ biome, seed, cutoff, before, after, width, height, cutoffRow: true });
        }
      }
    }
    return rows;
  }, seeds);

  let sampledFrames = 0;
  let overlapFrames = 0;
  let maxArea = 0;
  let maxOverlap = 0;
  let revisitMisses = 0;
  let cutoffMisses = 0;
  let chunkIdentityMisses = 0;
  const identityByBiomeSeed = new Map();
  for (const row of matrix) {
    if (row.cutoffRow) {
      const identity = (anchors) => anchors.map((anchor) => `${anchor.stableLocationKey}|${anchor.assetId}|${anchor.compositionRole}`).sort();
      if (JSON.stringify(identity(row.before)) !== JSON.stringify(identity(row.after))) {
        cutoffMisses += 1;
        fail(`B${row.biome} seed ${row.seed} cutoff ${row.cutoff} rerolled identity`);
      }
      continue;
    }
    sampledFrames += 1;
    const dominant = row.first.filter((anchor) => anchor.compositionRole === 'dominant');
    const supporting = row.first.filter((anchor) => anchor.compositionRole === 'supporting');
    if (dominant.length > row.budget.maxDominantLayers) fail(`B${row.biome} dominant slot overflow`);
    if (supporting.length > row.budget.maxSupportingLayers) fail(`B${row.biome} supporting slot overflow`);
    if (row.assets.length < 2 || row.assets.length > 3) fail(`B${row.biome} curated pool count ${row.assets.length} is outside 2..3`);
    if (row.assets.some((asset) => !asset.availableInRuntime || asset.sourceStatus !== 'ready' || !asset.path)) {
      fail(`B${row.biome} curated pool contains a non-resident manifest asset`);
    }
    for (const anchor of row.first) {
      maxArea = Math.max(maxArea, anchor.projectedAreaRatio ?? 1);
      maxOverlap = Math.max(maxOverlap, anchor.corridorOverlapRatio ?? 1);
      if ((anchor.projectedAreaRatio ?? 1) > row.budget.maxProjectedLandmarkAreaRatio + 1e-9) {
        fail(`B${row.biome} area ${(anchor.projectedAreaRatio ?? 1).toFixed(4)} exceeds budget`);
      }
    }
    if (row.first.some((anchor) => (anchor.corridorOverlapRatio ?? 1) > 0)) overlapFrames += 1;
    if (JSON.stringify(row.first) !== JSON.stringify(row.revisit)) {
      revisitMisses += 1;
      fail(`B${row.biome} seed ${row.seed} location ${row.locationX} changed on revisit`);
    }
    const key = `${row.biome}:${row.seed}`;
    const family = row.first.map((anchor) => `${anchor.assetId}:${anchor.compositionRole}`).sort();
    if (identityByBiomeSeed.has(key) && JSON.stringify(identityByBiomeSeed.get(key)) !== JSON.stringify(family)) {
      chunkIdentityMisses += 1;
      fail(`B${row.biome} seed ${row.seed} rerolled across render chunks`);
    }
    identityByBiomeSeed.set(key, family);
  }
  const corridorIntersectionFrequency = overlapFrames / Math.max(1, sampledFrames);
  if (corridorIntersectionFrequency > 0.05) fail(`corridor intersection frequency ${(corridorIntersectionFrequency * 100).toFixed(2)}% exceeds 5%`);

  const residency = [];
  for (const biome of [1, 2, 3, 4]) {
    const runtime = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await runtime.goto(`${baseUrl}?playtest=1&biome=${biome}&seed=202&renderer=canvas`, { waitUntil: 'domcontentloaded' });
    await runtime.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 25000 });
    await runtime.waitForFunction(() => {
      const snapshot = window.__AQUA_PLAYTEST__?.snapshot?.();
      return Boolean(snapshot?.world?.ready !== false && snapshot?.ui?.biomeLoading?.active !== true);
    }, null, { timeout: 45000 });
    await runtime.evaluate(() => window.__AQUA_PLAYTEST__.command('start'));
    await runtime.evaluate(() => window.__AQUA_PLAYTEST__.command('dive'));
    await runtime.evaluate(() => window.__AQUA_PLAYTEST__.command('maxUpgrades'));
    await runtime.evaluate((depth) => window.__AQUA_PLAYTEST__.command('teleportDepth', depth), biome === 1 ? 110 : biome === 2 ? 530 : biome === 3 ? 1050 : 1450);
    await runtime.evaluate(() => window.__AQUA_PLAYTEST__.command('centerCameraOnPlayer'));
    await runtime.waitForTimeout(160);
    const snapshot = await runtime.evaluate(() => window.__AQUA_PLAYTEST__.snapshot());
    const rendered = snapshot.environmentVisualProfile.renderedBitmapAnchors;
    residency.push({ biome, seed: snapshot.seed, anchors: snapshot.environmentVisualProfile.anchors.items, rendered });
    if (!rendered.length) fail(`B${biome} rendered no live bitmap landmark`);
    if (rendered.some((item) => !item.generatedBackgroundTexture || item.sourceDimensions.width <= 0 || item.sourceDimensions.height <= 0)) {
      fail(`B${biome} bitmap residency metadata was incomplete`);
    }
    await runtime.close();
  }

  const renderingSource = await readFile('src/scene-rendering.ts', 'utf8');
  if (/graphics\.fillRect\(view\.x - 24, view\.y - 24/.test(renderingSource)) fail('rejected B4 full-viewport procedural ruin plane remains');
  if (!renderingSource.includes('waterColumnVisibleSpriteBudget')) fail('water-column sprite budget helper is missing');
  if (!renderingSource.includes(".slice(0, 4)")) fail('bounded actionable-threat darkness protection is missing');

  report = {
    schema: 'water9/background-composition-smoke@1',
    generatedAt: new Date().toISOString(),
    ok: errors.length === 0,
    port,
    seeds,
    coverage: { biomes: 4, sampledFrames, cutoffComparisons: matrix.filter((row) => row.cutoffRow).length },
    maxima: { projectedAreaRatio: maxArea, corridorOverlapRatio: maxOverlap },
    gates: {
      landmarkAreaLimit: 0.45,
      corridorIntersectionFrequency,
      revisitMisses,
      cutoffMisses,
      chunkIdentityMisses,
      dominantLimit: 1,
      supportingLimit: 1,
    },
    residency,
    errors,
    serverLogs: serverLogs.join('').slice(-3000),
  };
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  report = { schema: 'water9/background-composition-smoke@1', generatedAt: new Date().toISOString(), ok: false, errors };
} finally {
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await browser?.close().catch(() => {});
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await new Promise((done) => {
      const timer = setTimeout(done, 3000);
      server.once('exit', () => { clearTimeout(timer); done(); });
    });
  }
}

if (!report.ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, reportPath, coverage: report.coverage, maxima: report.maxima, gates: report.gates }, null, 2));

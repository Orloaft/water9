import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_BRUSH_FLORA_OUT_DIR ?? 'runs/water9-interactable-visual-life-followup-2026-07-08';
const reportPath = process.env.WATER9_BRUSH_FLORA_REPORT ?? `${outDir}/interactable-brush-flora-smoke.json`;
const proofPath = process.env.WATER9_BRUSH_FLORA_PROOF ?? `${outDir}/brush-flora-proof.json`;
const host = '127.0.0.1';
const preferredPort = Number(process.env.WATER9_BRUSH_FLORA_PORT ?? 5180);

const cases = [
  { label: 'surface-brush-flora', biome: 1, depth: 80 },
  { label: 'mid-brush-flora', biome: 2, depth: 620 },
  { label: 'deep-brush-flora', biome: 3, depth: 1320 },
  { label: 'abyss-brush-flora', biome: 4, depth: 2180 },
];

await mkdir(outDir, { recursive: true });

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
const errors = [];
const serverLogs = [];
const artifacts = {};

function fail(message) {
  errors.push({ type: 'assertion', text: message });
}

async function portAvailable(port) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 400);
  try {
    const response = await fetch(`http://${host}:${port}/?playtest=1`, { method: 'HEAD', signal: controller.signal });
    return !(response.ok || response.status < 500);
  } catch {
    return true;
  } finally {
    clearTimeout(timeout);
  }
}

async function choosePort() {
  if (process.env.PLAYTEST_URL) return null;
  for (let port = preferredPort; port <= 5199; port += 1) {
    if (port < 5180) continue;
    if (await portAvailable(port)) return port;
  }
  throw new Error('No available dev server port in 5180-5199');
}

const port = await choosePort();
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=1`;

let server = null;
if (!process.env.PLAYTEST_URL) {
  server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
  server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));
}

async function waitForServer(url, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null) throw new Error(`dev server exited before ready with code ${server.exitCode}`);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite may still be binding.
    }
    await sleep(150);
  }
  throw new Error(`dev server was not ready within ${timeoutMs}ms`);
}

async function command(page, name, value) {
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null, [name, value]);
}

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function waitForWorld(page, biome) {
  await page.waitForFunction((expectedBiome) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(
      snap?.world
      && snap.world.ready !== false
      && !snap.ui?.biomeLoading?.active
      && (!expectedBiome || snap.state?.biome === expectedBiome)
    );
  }, biome, { timeout: 50000 });
}

async function holdKey(page, key, holdMs) {
  await page.keyboard.down(key);
  await page.waitForTimeout(holdMs);
  await page.keyboard.up(key);
  await page.waitForTimeout(180);
}

async function capturePair(page, label) {
  const color = `${outDir}/${label}.png`;
  const grayscale = `${outDir}/${label}-grayscale.png`;
  await page.locator('#game canvas').screenshot({ path: color });
  await page.evaluate(() => {
    document.documentElement.style.filter = 'grayscale(1)';
  });
  await page.waitForTimeout(80);
  await page.locator('#game canvas').screenshot({ path: grayscale });
  await page.evaluate(() => {
    document.documentElement.style.filter = '';
  });
  artifacts[label] = { color, grayscale, selector: '#game canvas' };
  return artifacts[label];
}

async function stageBrush(page, index = 0) {
  return command(page, 'brushFloraSmokeStage', { index });
}

let report = {};
if (server) await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) errors.push({ type: 'console', text: message.text() });
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
});

const results = [];

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForWorld(page, 1);
  await command(page, 'clearSave');
  await page.locator('#game').click({ position: { x: 640, y: 400 }, force: true });

  for (const testCase of cases) {
    await command(page, 'setBiome', testCase.biome);
    await waitForWorld(page, testCase.biome);
    await page.waitForTimeout(600);
    await command(page, 'clearProofOverlays');
    await command(page, 'teleportToReachableDepth', testCase.depth);
    const staged = await stageBrush(page, 0);
    if (!staged?.ok) {
      fail(`${testCase.label} could not stage brush flora: ${JSON.stringify(staged)}`);
      continue;
    }
    await page.waitForTimeout(260);
    await command(page, 'selectTool', 'scanner');
    await page.keyboard.down('Space');
    await page.waitForTimeout(560);
    await capturePair(page, `${testCase.label}-scan-target`);
    const targetingSnap = await snapshot(page);
    await page.keyboard.up('Space');
    if (targetingSnap?.player?.scanTarget !== staged.species) {
      fail(`${testCase.label} scanner target mismatch: ${targetingSnap?.player?.scanTarget} vs ${staged.species}`);
    }
    await holdKey(page, 'Space', 2400);
    const afterScan = await snapshot(page);
    if (!afterScan?.state?.scannedSpecies?.includes(staged.species)) {
      fail(`${testCase.label} scan did not record species ${staged.species}`);
    }

    await command(page, 'brushFloraSmokeStage', { assetKey: staged.assetKey, species: staged.species, index: 0 });
    await command(page, 'selectTool', 'sampler');
    await holdKey(page, 'Space', 2700);
    const afterSample = await snapshot(page);
    const sampleCargo = afterSample?.state?.cargoItems?.filter((item) => item.sampleSpecies === staged.species) ?? [];
    const sampledTarget = afterSample?.floraAnchors?.gameplay?.find((flora) => flora.propId === staged.propId);
    if (!afterSample?.state?.sampledSpecies?.includes(staged.species)) {
      fail(`${testCase.label} sampler did not record sampled species ${staged.species}`);
    }
    if (sampleCargo.length < 1) {
      fail(`${testCase.label} sampler did not create cargo for ${staged.species}`);
    }
    if (!sampledTarget?.dead) {
      fail(`${testCase.label} sampler did not destroy brush target ${staged.propId}`);
    }
    await capturePair(page, `${testCase.label}-sample-harvest`);

    results.push({
      label: testCase.label,
      biome: testCase.biome,
      species: staged.species,
      assetKey: staged.assetKey,
      propId: staged.propId,
      source: 'brush',
      scanRecorded: afterScan?.state?.scannedSpecies?.includes(staged.species) ?? false,
      sampleRecorded: afterSample?.state?.sampledSpecies?.includes(staged.species) ?? false,
      targetDestroyed: Boolean(sampledTarget?.dead),
      sampleCargo: sampleCargo.map((item) => ({ name: item.name, value: item.value, kind: item.kind })),
      metadata: afterSample?.floraAnchors?.gameplay?.find((flora) => flora.propId === staged.propId) ?? null,
    });
  }

  await command(page, 'setBiome', 2);
  await waitForWorld(page, 2);
  await page.waitForTimeout(600);
  await command(page, 'clearProofOverlays');
  const supportStage = await stageBrush(page, 1);
  if (!supportStage?.ok) {
    fail(`support removal could not stage brush flora: ${JSON.stringify(supportStage)}`);
  } else {
    await page.waitForTimeout(260);
    await capturePair(page, 'brush-support-removal-before');
    const beforeSupport = await snapshot(page);
    const tangent = { x: -supportStage.surface.normalY, y: supportStage.surface.normalX };
    for (const depthTiles of [0.55, 0.9, 1.25]) {
      for (const lateralTiles of [-0.75, 0, 0.75]) {
        await command(page, 'terrainMineAt', {
          worldX: supportStage.surface.rootX - supportStage.surface.normalX * 24 * depthTiles + tangent.x * 24 * lateralTiles,
          worldY: supportStage.surface.rootY - supportStage.surface.normalY * 24 * depthTiles + tangent.y * 24 * lateralTiles,
          repeats: 12,
        });
      }
    }
    await command(page, 'tickSystems', 0.5);
    await page.waitForTimeout(500);
    await capturePair(page, 'brush-support-removal-after');
    const afterSupport = await snapshot(page);
    const beforeTarget = beforeSupport?.floraAnchors?.gameplay?.find((flora) => flora.propId === supportStage.propId);
    const afterTarget = afterSupport?.floraAnchors?.gameplay?.find((flora) => flora.propId === supportStage.propId);
    const movedDistance = beforeTarget && afterTarget
      ? Math.hypot((afterTarget.x ?? 0) - (beforeTarget.x ?? 0), (afterTarget.y ?? 0) - (beforeTarget.y ?? 0))
      : 0;
    const reanchored = Boolean(
      beforeTarget
      && afterTarget
      && (beforeTarget.tileX !== afterTarget.tileX || beforeTarget.tileY !== afterTarget.tileY || movedDistance > 8)
    );
    const invalidated = Boolean(afterTarget?.dead || afterTarget?.supported === false || reanchored);
    if (!invalidated) {
      fail(`support removal left brush flora apparently anchored in place: ${JSON.stringify({ beforeTarget, afterTarget, movedDistance })}`);
    }
    results.push({
      label: 'brush-support-removal',
      biome: 2,
      species: supportStage.species,
      assetKey: supportStage.assetKey,
      propId: supportStage.propId,
      before: beforeTarget,
      after: afterTarget,
      movedDistance: Math.round(movedDistance * 100) / 100,
      reanchored,
      invalidated,
    });
  }
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  await browser.close().catch(() => {});
  if (server) {
    server.kill('SIGTERM');
    await sleep(500);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
}

report = {
  ok: errors.length === 0,
  baseUrl,
  port,
  cases: results,
  artifacts,
  proofPath,
  errors,
  serverLogs: serverLogs.slice(-20),
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(proofPath, `${JSON.stringify({ artifacts, cases: results }, null, 2)}\n`, 'utf8');

if (errors.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(report, null, 2));

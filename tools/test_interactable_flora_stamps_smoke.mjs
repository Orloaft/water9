import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_STAMP_FLORA_OUT_DIR ?? 'runs/water9-interactable-flora-stamps-2026-07-08';
const reportPath = process.env.WATER9_STAMP_FLORA_REPORT ?? `${outDir}/interactable-flora-stamps-smoke.json`;
const proofPath = process.env.WATER9_STAMP_FLORA_PROOF ?? `${outDir}/proof.json`;
const host = '127.0.0.1';
const preferredPort = Number(process.env.WATER9_STAMP_FLORA_PORT ?? 5180);

const cases = [
  { label: 'surface-b1-glass', biome: 1, assetKeys: ['terrain-stamp-plant-glass', 'terrain-stamp-plant-brine'] },
  { label: 'mid-b2-brine', biome: 2, assetKeys: ['terrain-stamp-plant-brine'] },
  { label: 'deep-b3-lumen-purple', biome: 3, assetKeys: ['terrain-stamp-plant-lumen', 'terrain-stamp-plant-purple'] },
  { label: 'abyss-b4-lumen-purple', biome: 4, assetKeys: ['terrain-stamp-plant-lumen', 'terrain-stamp-plant-purple'] },
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

async function captureViewport(page, label) {
  const path = `${outDir}/${label}.png`;
  await page.screenshot({ path, fullPage: false });
  artifacts[label] = { color: path, selector: 'viewport' };
  return artifacts[label];
}

async function canvasStats(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#game canvas');
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false, width: 0, height: 0, variedSamples: 0, lumaRange: 0 };
    const values = [];
    for (let y = 28; y < canvas.height - 28; y += 41) {
      for (let x = 28; x < canvas.width - 28; x += 41) {
        const [r, g, b, a] = context.getImageData(x, y, 1, 1).data;
        if (a > 0) values.push(Math.round((r + g + b) / 3));
      }
    }
    return {
      exists: true,
      width: canvas.width,
      height: canvas.height,
      variedSamples: new Set(values).size,
      lumaRange: values.length ? Math.max(...values) - Math.min(...values) : 0,
    };
  });
}

async function stageAnyStamp(page, testCase, index = 0) {
  for (const assetKey of testCase.assetKeys) {
    const staged = await command(page, 'stampFloraSmokeStage', { assetKey, index });
    if (staged?.ok) return staged;
  }
  return await command(page, 'stampFloraSmokeStage', { index });
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
    await page.waitForTimeout(700);
    await command(page, 'clearProofOverlays');
    const staged = await stageAnyStamp(page, testCase, 0);
    if (!staged?.ok) {
      fail(`${testCase.label} could not stage stamp flora: ${JSON.stringify(staged)}`);
      continue;
    }
    await page.waitForTimeout(260);
    await command(page, 'selectTool', 'scanner');
    await page.keyboard.down('Space');
    await page.waitForTimeout(520);
    await capturePair(page, `${testCase.label}-scan-target`);
    await captureViewport(page, `${testCase.label}-viewport`);
    const targetingSnap = await snapshot(page);
    await page.keyboard.up('Space');
    await page.waitForTimeout(180);
    if (targetingSnap?.player?.scanTarget !== staged.species) {
      fail(`${testCase.label} scanner target mismatch: ${targetingSnap?.player?.scanTarget} vs ${staged.species}`);
    }
    await holdKey(page, 'Space', 2300);
    const afterScan = await snapshot(page);
    if (!afterScan?.state?.scannedSpecies?.includes(staged.species)) {
      fail(`${testCase.label} scan did not record species ${staged.species}`);
    }
    await capturePair(page, `${testCase.label}-scan-complete`);

    await command(page, 'stampFloraSmokeStage', { assetKey: staged.assetKey, species: staged.species, index: 0 });
    await command(page, 'selectTool', 'sampler');
    await holdKey(page, 'Space', 2600);
    const afterSample = await snapshot(page);
    const sampleCargo = afterSample?.state?.cargoItems?.filter((item) => item.sampleSpecies === staged.species) ?? [];
    if (!afterSample?.state?.sampledSpecies?.includes(staged.species)) {
      fail(`${testCase.label} sampler did not record sampled species ${staged.species}`);
    }
    if (sampleCargo.length < 1) {
      fail(`${testCase.label} sampler did not create cargo for ${staged.species}`);
    }
    await capturePair(page, `${testCase.label}-sample-harvest`);

    results.push({
      label: testCase.label,
      biome: testCase.biome,
      species: staged.species,
      assetKey: staged.assetKey,
      propId: staged.propId,
      scanRecorded: afterScan?.state?.scannedSpecies?.includes(staged.species) ?? false,
      sampleRecorded: afterSample?.state?.sampledSpecies?.includes(staged.species) ?? false,
      sampleCargo: sampleCargo.map((item) => ({ name: item.name, value: item.value, kind: item.kind })),
      canvasStats: await canvasStats(page),
    });
  }

  await command(page, 'setBiome', 1);
  await waitForWorld(page, 1);
  await page.waitForTimeout(700);
  await command(page, 'clearProofOverlays');
  const supportStage = await stageAnyStamp(page, cases[0], 1);
  if (!supportStage?.ok) {
    fail(`support removal could not stage stamp flora: ${JSON.stringify(supportStage)}`);
  } else {
    await page.waitForTimeout(260);
    await capturePair(page, 'support-removal-before');
    const beforeSupport = await snapshot(page);
    await command(page, 'terrainMineAt', {
      worldX: supportStage.surface.supportMineX,
      worldY: supportStage.surface.supportMineY,
      repeats: 12,
    });
    await command(page, 'tickSystems', 0.5);
    await page.waitForTimeout(500);
    await capturePair(page, 'support-removal-after');
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
      fail(`support removal left stamp flora apparently anchored in place: ${JSON.stringify({ beforeTarget, afterTarget, movedDistance })}`);
    }
    results.push({
      label: 'support-removal',
      biome: 1,
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

  report = {
    ok: errors.length === 0,
    baseUrl,
    port,
    cases: results,
    artifacts,
    errors,
  };
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  report = {
    ok: false,
    baseUrl,
    port,
    cases: results,
    artifacts,
    errors,
    serverLogs,
  };
} finally {
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(proofPath, `${JSON.stringify({ artifacts, cases: results, errors }, null, 2)}\n`, 'utf8');
  await browser.close().catch(() => {});
  if (server) {
    server.kill('SIGTERM');
    await sleep(250);
  }
}

console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;

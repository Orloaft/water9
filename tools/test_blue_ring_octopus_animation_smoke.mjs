import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_BLUE_RING_OCTOPUS_OUT_DIR
  ?? '/mnt/nxt-dev/water9/runs/water9-blue-ring-octopus-animation-2026-07-08';
const reportPath = process.env.WATER9_BLUE_RING_OCTOPUS_REPORT
  ?? `${outDir}/blue-ring-octopus-normal-play-smoke.json`;
const host = '127.0.0.1';
const port = Number(process.env.WATER9_BLUE_RING_OCTOPUS_PORT ?? 5197);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=1`;
const assetKey = 'fauna-shallow-blue-ring-octopus';

await mkdir(outDir, { recursive: true });

let server = null;
if (!process.env.PLAYTEST_URL) {
  server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const errors = [];
const serverLogs = [];
server?.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server?.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitForServer(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null) throw new Error(`dev server exited before ready with code ${server.exitCode}`);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite may still be binding the port.
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

async function waitForBiomeReady(page, biome) {
  await page.waitForFunction((expectedBiome) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(
      snap?.world
      && snap.world.ready !== false
      && snap.state?.biome === expectedBiome
      && !snap.ui?.biomeLoading?.active
    );
  }, biome, { timeout: 30000 });
}

async function canvasData(page, mode, crop) {
  return page.$eval('#game canvas', (source, options) => {
    const { mode: readMode, crop: readCrop } = options;
    const copy = document.createElement('canvas');
    const sx = Math.max(0, Math.floor(readCrop?.x ?? 0));
    const sy = Math.max(0, Math.floor(readCrop?.y ?? 0));
    const sw = Math.min(source.width - sx, Math.floor(readCrop?.w ?? source.width));
    const sh = Math.min(source.height - sy, Math.floor(readCrop?.h ?? source.height));
    copy.width = Math.max(1, sw);
    copy.height = Math.max(1, sh);
    const context = copy.getContext('2d', { willReadFrequently: true });
    context.drawImage(source, sx, sy, sw, sh, 0, 0, copy.width, copy.height);
    const image = context.getImageData(0, 0, copy.width, copy.height);
    let minLuma = 255;
    let maxLuma = 0;
    const buckets = new Set();
    for (let i = 0; i < image.data.length; i += 4) {
      const luma = Math.round(image.data[i] * 0.2126 + image.data[i + 1] * 0.7152 + image.data[i + 2] * 0.0722);
      minLuma = Math.min(minLuma, luma);
      maxLuma = Math.max(maxLuma, luma);
      buckets.add(`${Math.floor(image.data[i] / 16)},${Math.floor(image.data[i + 1] / 16)},${Math.floor(image.data[i + 2] / 16)}`);
      if (readMode === 'gray') {
        image.data[i] = luma;
        image.data[i + 1] = luma;
        image.data[i + 2] = luma;
      }
    }
    if (readMode === 'gray') context.putImageData(image, 0, 0);
    return {
      pngBase64: copy.toDataURL('image/png').split(',')[1] ?? '',
      width: copy.width,
      height: copy.height,
      lumaRange: maxLuma - minLuma,
      colorBuckets: buckets.size,
    };
  }, { mode, crop });
}

function targetFromSnapshot(snap) {
  return (snap?.fish ?? []).find((fish) => fish.assetKey === assetKey && !fish.dead) ?? null;
}

function fail(message) {
  errors.push({ type: 'assertion', text: message });
}

if (server) await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
    errors.push({ type: 'console', text: message.text() });
  }
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
});

const proof = {
  canvasColor: `${outDir}/blue-ring-octopus-normal-play-canvas.png`,
  canvasGray: `${outDir}/blue-ring-octopus-normal-play-canvas-grayscale.png`,
  sequence: [0, 1, 2, 3].map((index) => `${outDir}/blue-ring-octopus-normal-play-${index}.png`),
  targetCrops: [0, 1, 2, 3].map((index) => `${outDir}/blue-ring-octopus-normal-play-crop-${index}.png`),
};
const targetSnapshots = [];
const cropStats = [];
const spawnBand = { configMinY: 980, configMaxY: 1860, observedWorldYs: [] };

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await waitForBiomeReady(page, 1);
  await command(page, 'start');
  await command(page, 'clearProofOverlays');
  const review = await command(page, 'faunaBehaviorReview', { assetKey });
  const targets = review?.targets ?? [];
  if (targets.length !== 5) fail(`expected 5 Blue-ring Octopus in biome 1, got ${targets.length}`);
  const worldYs = targets.map((target) => Math.round(target.y));
  spawnBand.observedWorldYs = worldYs;
  const teleport = await command(page, 'teleportToFauna', { assetKey, index: 0, distance: 74 });
  if (!teleport?.ok) fail(`teleportToFauna failed: ${JSON.stringify(teleport)}`);
  await sleep(350);

  for (let index = 0; index < proof.sequence.length; index += 1) {
    await sleep(index === 0 ? 0 : 180);
    const snap = await snapshot(page);
    const target = targetFromSnapshot(snap);
    targetSnapshots.push(target);
    if (!target) {
      fail(`missing ${assetKey} in snapshot ${index}`);
      continue;
    }
    if (!target.screenVisible) fail(`${assetKey} was not screen-visible in snapshot ${index}`);
    const crop = {
      x: Math.round((target.screenX ?? 640) - 52),
      y: Math.round((target.screenY ?? 400) - 52),
      w: 104,
      h: 104,
    };
    await page.locator('#game canvas').screenshot({ path: proof.sequence[index] });
    const cropData = await canvasData(page, 'color', crop);
    cropStats.push({ frame: index, crop, ...cropData, pngBase64: undefined });
    await writeFile(proof.targetCrops[index], Buffer.from(cropData.pngBase64, 'base64'));
    if (cropData.lumaRange < 20 || cropData.colorBuckets < 12) {
      fail(`weak target crop stats in frame ${index}: ${JSON.stringify({ lumaRange: cropData.lumaRange, colorBuckets: cropData.colorBuckets })}`);
    }
  }

  await page.locator('#game canvas').screenshot({ path: proof.canvasColor });
  const gray = await canvasData(page, 'gray', null);
  await writeFile(proof.canvasGray, Buffer.from(gray.pngBase64, 'base64'));
  if (gray.lumaRange < 24 || gray.colorBuckets < 16) fail(`weak grayscale canvas stats: ${JSON.stringify({ lumaRange: gray.lumaRange, colorBuckets: gray.colorBuckets })}`);
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  await writeFile(reportPath, `${JSON.stringify({
    ok: errors.length === 0,
    assetKey,
    proof,
    targetSnapshots,
    spawnBand,
    cropStats,
    errors,
    serverLogs: serverLogs.slice(-20),
  }, null, 2)}\n`);
  await browser.close();
  if (server) server.kill('SIGTERM');
}

if (errors.length) {
  console.error('Water9 Blue-ring Octopus animation smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 Blue-ring Octopus animation smoke passed.');
console.log(`Report: ${reportPath}`);
console.log(`Proof: ${proof.canvasColor}`);
console.log(`Proof grayscale: ${proof.canvasGray}`);

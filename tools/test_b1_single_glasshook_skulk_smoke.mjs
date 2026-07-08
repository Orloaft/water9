import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_B1_GLASSHOOK_OUT_DIR
  ?? '/mnt/nxt-dev/water9/runs/water9-b1-single-glasshook-skulk-2026-07-08';
const reportPath = process.env.WATER9_B1_GLASSHOOK_REPORT
  ?? `${outDir}/b1-single-glasshook-skulk-smoke.json`;
const host = '127.0.0.1';
const port = Number(process.env.WATER9_B1_GLASSHOOK_PORT ?? 5189);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=1`;
const glasshookId = 'abyssal-glasshook-skulk';

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
      && snap.ui?.biomeLoading?.phase !== 'staging'
      && snap.ui?.biomeLoading?.phase !== 'generating'
      && (snap.encounterReservations ?? []).every((reservation) => reservation.biome === expectedBiome),
    );
  }, biome, { timeout: 25000 });
}

function fail(message) {
  errors.push({ type: 'assertion', text: message });
}

async function writeCanvasGrayscale(page, path) {
  const dataUrl = await page.$eval('#game canvas', (canvas) => {
    const source = canvas;
    const copy = document.createElement('canvas');
    copy.width = source.width;
    copy.height = source.height;
    const ctx = copy.getContext('2d');
    ctx.drawImage(source, 0, 0);
    const image = ctx.getImageData(0, 0, copy.width, copy.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const gray = Math.round(image.data[i] * 0.2126 + image.data[i + 1] * 0.7152 + image.data[i + 2] * 0.0722);
      image.data[i] = gray;
      image.data[i + 1] = gray;
      image.data[i + 2] = gray;
    }
    ctx.putImageData(image, 0, 0);
    return copy.toDataURL('image/png');
  });
  await writeFile(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
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

const expectedCounts = new Map([[1, 1], [2, 0], [3, 2], [4, 2]]);
const biomeResults = [];
const proof = {
  color: `${outDir}/b1-glasshook-canvas.png`,
  grayscale: `${outDir}/b1-glasshook-canvas-grayscale.png`,
};

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await waitForBiomeReady(page, 1);

  for (const biome of [1, 2, 3, 4]) {
    if (biome !== 1) await command(page, 'setBiome', biome);
    await waitForBiomeReady(page, biome);
    const snap = await snapshot(page);
    const glasshooks = (snap?.articulatedCreatures ?? []).filter((creature) => creature.id === glasshookId);
    const reservations = (snap?.encounterReservations ?? []).filter((reservation) => reservation.creatureId === glasshookId);
    const result = {
      biome,
      glasshookCount: glasshooks.length,
      expectedCount: expectedCounts.get(biome),
      glasshooks: glasshooks.map((creature) => ({
        x: creature.x,
        y: creature.y,
        depthMeters: creature.naturalSpawn?.depthMeters,
        centerTile: creature.naturalSpawn?.centerTile,
        state: creature.state,
      })),
      reservations,
    };
    biomeResults.push(result);
    if (glasshooks.length !== expectedCounts.get(biome)) {
      fail(`biome ${biome}: expected ${expectedCounts.get(biome)} ${glasshookId}, got ${glasshooks.length}`);
    }
    if (biome === 1 && glasshooks[0]) {
      const depthMeters = glasshooks[0].naturalSpawn?.depthMeters ?? 0;
      if (depthMeters < 500) fail(`biome 1: skulk was too shallow at ${depthMeters}m`);
      if (reservations.length !== 1) fail(`biome 1: expected one glasshook reservation, got ${reservations.length}`);
      const reservationDepth = reservations[0]?.depth?.homeMeters ?? 0;
      if (reservationDepth < 500) fail(`biome 1: glasshook reservation was too shallow at ${reservationDepth}m`);
      await command(page, 'start');
      await command(page, 'teleportToArticulated', { creatureId: glasshookId });
      await command(page, 'focusArticulatedCamera', { creatureId: glasshookId, freeze: true, unpaused: true, maxZoom: 1.05 });
      await page.locator('#game canvas').screenshot({ path: proof.color });
      await writeCanvasGrayscale(page, proof.grayscale);
    }
  }
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  await writeFile(reportPath, `${JSON.stringify({ ok: errors.length === 0, biomeResults, proof, errors, serverLogs: serverLogs.slice(-20) }, null, 2)}\n`);
  await browser.close();
  if (server) server.kill('SIGTERM');
}

if (errors.length) {
  console.error('Water9 B1 single Glasshook Skulk smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 B1 single Glasshook Skulk smoke passed.');
console.log(`Report: ${reportPath}`);
console.log(`Proof: ${proof.color}`);
console.log(`Proof grayscale: ${proof.grayscale}`);

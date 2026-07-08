import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_BARGE_DOCKING_INDICATOR_OUT_DIR
  ?? '/mnt/nxt-dev/water9/runs/water9-barge-docking-indicator-2026-07-08';
const reportPath = process.env.WATER9_BARGE_DOCKING_INDICATOR_REPORT
  ?? `${outDir}/docking-indicator-smoke.json`;
const nearPath = process.env.WATER9_BARGE_DOCKING_INDICATOR_NEAR
  ?? `${outDir}/docking-indicator-near.png`;
const nearGrayPath = process.env.WATER9_BARGE_DOCKING_INDICATOR_NEAR_GRAY
  ?? `${outDir}/docking-indicator-near-gray.png`;
const farPath = process.env.WATER9_BARGE_DOCKING_INDICATOR_FAR
  ?? `${outDir}/docking-indicator-far.png`;

const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_BARGE_DOCKING_INDICATOR_PORT ?? 5187);
const TILE = 24;
const WORLD_W = 104;
const SURFACE_Y = TILE * 4;
const BARGE_DOCK_Y = 64;
const BARGE_DOCKING_ZONE_Y = 72;
const BARGE_DOCKING_HALF_WIDTH = 52;
const DOCK_X = WORLD_W * TILE * 0.5;

await mkdir(outDir, { recursive: true });

let server = null;
const port = process.env.PLAYTEST_URL ? requestedPort : await findOpenPort(requestedPort);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=1`;
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

function canBind(portToCheck) {
  return new Promise((resolveBind) => {
    const probe = createServer();
    probe.once('error', () => resolveBind(false));
    probe.once('listening', () => {
      probe.close(() => resolveBind(true));
    });
    probe.listen(portToCheck, host);
  });
}

async function findOpenPort(start) {
  for (let candidate = Math.max(5180, start); candidate <= 5199; candidate += 1) {
    if (await canBind(candidate)) return candidate;
  }
  throw new Error('No open dev server port in required range 5180-5199');
}

async function waitForServer(url, timeoutMs = 20000) {
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

async function waitForWorld(page) {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false && !snap.ui?.biomeLoading?.active);
  }, null, { timeout: 25000 });
}

async function command(page, name, value) {
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command?.(commandName, commandValue) ?? null, [name, value]);
}

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function startPlaytestRun(page) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 10000 });
  await command(page, 'start');
  await page.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.()?.state?.started === true, null, { timeout: 10000 });
  for (let index = 0; index < 12; index += 1) {
    const snap = await snapshot(page);
    if (!snap?.ui?.radioOpen) break;
    const radioButton = page.locator('button[data-radio-next]').first();
    if (await radioButton.count() > 0 && await radioButton.isVisible({ timeout: 250 }).catch(() => false)) {
      await radioButton.click();
    } else {
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(120);
  }
  await page.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.()?.ui?.radioOpen === false, null, { timeout: 10000 });
  await command(page, 'dive');
}

function screenRectFor(snapshotValue) {
  const camera = snapshotValue.camera;
  const toScreen = (x, y) => ({
    x: Math.round((x - camera.x) * camera.zoom),
    y: Math.round((y - camera.y) * camera.zoom),
  });
  const topLeft = toScreen(DOCK_X - 96, BARGE_DOCK_Y - 24);
  const bottomRight = toScreen(DOCK_X + 96, BARGE_DOCKING_ZONE_Y + 72);
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

async function indicatorStats(page, snapshotValue) {
  const rect = screenRectFor(snapshotValue);
  return page.evaluate((region) => {
    const source = document.querySelector('#game canvas');
    const context = source?.getContext('2d', { willReadFrequently: true });
    if (!source || !context) return { exists: false, onscreen: false, samples: 0, bright: 0, cyanLike: 0, maxLuma: 0, rect: region };
    const x0 = Math.max(0, Math.min(source.width, region.x));
    const y0 = Math.max(0, Math.min(source.height, region.y));
    const x1 = Math.max(0, Math.min(source.width, region.x + region.width));
    const y1 = Math.max(0, Math.min(source.height, region.y + region.height));
    if (x1 <= x0 || y1 <= y0) return { exists: true, onscreen: false, samples: 0, bright: 0, cyanLike: 0, maxLuma: 0, rect: region };
    const data = context.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    let bright = 0;
    let cyanLike = 0;
    let maxLuma = 0;
    for (let index = 0; index < data.length; index += 4) {
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];
      if (a < 32) continue;
      const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
      maxLuma = Math.max(maxLuma, luma);
      if (luma >= 175) bright += 1;
      if (g >= 180 && b >= 185 && r <= 235 && g > r + 16) cyanLike += 1;
    }
    return { exists: true, onscreen: true, samples: data.length / 4, bright, cyanLike, maxLuma, rect: region };
  }, rect);
}

function compactSnapshot(snapshotValue) {
  if (!snapshotValue) return null;
  return {
    state: {
      started: Boolean(snapshotValue.state?.started),
      docked: Boolean(snapshotValue.state?.docked),
      atBoat: Boolean(snapshotValue.state?.atBoat),
      lost: Boolean(snapshotValue.state?.lost),
      depth: snapshotValue.state?.depth ?? null,
      biome: snapshotValue.state?.biome ?? null,
    },
    player: snapshotValue.player ? {
      x: snapshotValue.player.x,
      y: snapshotValue.player.y,
    } : null,
    camera: snapshotValue.camera ? {
      x: snapshotValue.camera.x,
      y: snapshotValue.camera.y,
      width: snapshotValue.camera.width,
      height: snapshotValue.camera.height,
      zoom: snapshotValue.camera.zoom,
    } : null,
    canvas: snapshotValue.canvas ?? null,
    worldReady: snapshotValue.world?.ready ?? true,
  };
}

async function canvasPng(page, mode = 'color') {
  const base64 = await page.evaluate((captureMode) => {
    const source = document.querySelector('#game canvas');
    if (!source) return '';
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d');
    context.drawImage(source, 0, 0);
    if (captureMode === 'gray') {
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < image.data.length; index += 4) {
        const luma = Math.round(image.data[index] * 0.2126 + image.data[index + 1] * 0.7152 + image.data[index + 2] * 0.0722);
        image.data[index] = luma;
        image.data[index + 1] = luma;
        image.data[index + 2] = luma;
      }
      context.putImageData(image, 0, 0);
    }
    return canvas.toDataURL('image/png').split(',')[1] ?? '';
  }, mode);
  return Buffer.from(base64, 'base64');
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

const report = {
  schema: 'water9/barge-docking-indicator-smoke@1',
  baseUrl,
  port,
  nearPath,
  nearGrayPath,
  farPath,
  runtimeIdentity: '#game canvas via Playwright Chromium, normal playtest run after start and Dive',
  constants: {
    dockX: DOCK_X,
    dockY: BARGE_DOCK_Y,
    dockingZoneY: BARGE_DOCKING_ZONE_Y,
    dockingHalfWidth: BARGE_DOCKING_HALF_WIDTH,
  },
};

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await waitForWorld(page);
  await startPlaytestRun(page);
  await command(page, 'teleportDepth', 72);
  await page.waitForTimeout(450);
  const nearSnapshot = await snapshot(page);
  const nearStats = await indicatorStats(page, nearSnapshot);
  await writeFile(nearPath, await canvasPng(page, 'color'));
  await writeFile(nearGrayPath, await canvasPng(page, 'gray'));

  await command(page, 'teleportDepth', 360);
  await page.waitForTimeout(450);
  const farSnapshot = await snapshot(page);
  const farStats = await indicatorStats(page, farSnapshot);
  await writeFile(farPath, await canvasPng(page, 'color'));

  report.near = { snapshot: compactSnapshot(nearSnapshot), indicatorStats: nearStats };
  report.far = { snapshot: compactSnapshot(farSnapshot), indicatorStats: farStats };

  const nearDistance = Math.hypot(nearSnapshot.player.x - DOCK_X, nearSnapshot.player.y - BARGE_DOCK_Y);
  const farDistance = Math.hypot(farSnapshot.player.x - DOCK_X, farSnapshot.player.y - BARGE_DOCK_Y);
  if (!nearSnapshot?.state?.started || nearSnapshot?.state?.docked) fail('near capture was not an undocked normal-play dive');
  if (nearDistance > 250) fail(`near capture was not close enough to the dock throat: ${nearDistance.toFixed(1)}`);
  if (!nearStats.onscreen) fail(`near indicator region was not on screen: ${JSON.stringify(nearStats.rect)}`);
  if (nearStats.cyanLike < 260 || nearStats.bright < 500 || nearStats.maxLuma < 200) {
    fail(`near indicator pixels were too weak: ${JSON.stringify(nearStats)}`);
  }
  if (farDistance <= 250) fail(`far capture was still inside indicator reveal distance: ${farDistance.toFixed(1)}`);
  if (farStats.onscreen && farStats.cyanLike > nearStats.cyanLike * 0.2) {
    fail(`far indicator region still looked active: near=${nearStats.cyanLike}, far=${farStats.cyanLike}`);
  }
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  report.ok = errors.length === 0;
  report.errors = errors;
  report.serverLogs = serverLogs.slice(-20);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
  if (server) server.kill('SIGTERM');
}

if (errors.length) {
  console.error('Water9 barge docking indicator smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 barge docking indicator smoke passed.');
console.log(`Near: ${nearPath}`);
console.log(`Near grayscale: ${nearGrayPath}`);
console.log(`Far: ${farPath}`);
console.log(`Report: ${reportPath}`);

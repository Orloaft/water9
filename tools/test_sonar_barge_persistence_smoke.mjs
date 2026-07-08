import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_SONAR_BARGE_OUT_DIR
  ?? '/mnt/nxt-dev/water9/runs/water9-sonar-barge-persistent-landmark-2026-07-08';
const reportPath = process.env.WATER9_SONAR_BARGE_REPORT
  ?? `${outDir}/sonar-barge-persistence-smoke.json`;
const smallAfterPingPath = process.env.WATER9_SONAR_BARGE_SMALL_AFTER_PING
  ?? `${outDir}/sonar-barge-small-after-ping.png`;
const smallAfterExpiryPath = process.env.WATER9_SONAR_BARGE_SMALL_AFTER_EXPIRY
  ?? `${outDir}/sonar-barge-small-after-expiry.png`;
const bigMapPath = process.env.WATER9_SONAR_BARGE_BIG_MAP
  ?? `${outDir}/sonar-barge-big-map.png`;
const fullPagePath = process.env.WATER9_SONAR_BARGE_FULL_PAGE
  ?? `${outDir}/sonar-barge-full-page.png`;

const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_SONAR_BARGE_PORT ?? 5188);
const baseUrlForPort = (port) => `http://${host}:${port}/?playtest=1&biome=1`;

await mkdir(outDir, { recursive: true });

let server = null;
const port = process.env.PLAYTEST_URL ? requestedPort : await findOpenPort(requestedPort);
const baseUrl = process.env.PLAYTEST_URL ?? baseUrlForPort(port);
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

function fail(message) {
  errors.push({ type: 'assertion', text: message });
}

async function command(page, name, value) {
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command?.(commandName, commandValue) ?? null, [name, value]);
}

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function waitForWorld(page) {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false && !snap.ui?.biomeLoading?.active);
  }, null, { timeout: 25000 });
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
  await page.waitForTimeout(350);
}

async function setGamepad(page, { axes = [0, 0, 0, 0], buttons = [] } = {}) {
  await page.evaluate((state) => window.__setMockGamepad?.(state), { axes, buttons });
}

async function bargeCanvasStats(page, canvasSelector) {
  return page.evaluate((selector) => {
    const TILE = 24;
    const WORLD_W = 104;
    const WORLD_H = 420;
    const BARGE_DOCK_Y = 64;
    const canvas = document.querySelector(selector);
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    if (!canvas || !context || !snap?.player) return null;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const sampleRegion = (cx, cy, radiusX, radiusY) => {
      const x0 = Math.floor(clamp(cx - radiusX, 0, canvas.width - 1));
      const y0 = Math.floor(clamp(cy - radiusY, 0, canvas.height - 1));
      const x1 = Math.ceil(clamp(cx + radiusX, 0, canvas.width - 1));
      const y1 = Math.ceil(clamp(cy + radiusY, 0, canvas.height - 1));
      const image = context.getImageData(x0, y0, Math.max(1, x1 - x0 + 1), Math.max(1, y1 - y0 + 1));
      let bargePixels = 0;
      let cyanPixels = 0;
      let litPixels = 0;
      for (let index = 0; index < image.data.length; index += 4) {
        const r = image.data[index];
        const g = image.data[index + 1];
        const b = image.data[index + 2];
        const a = image.data[index + 3];
        if (a > 120 && r > 185 && g > 145 && b > 80 && r > g && g > b) bargePixels += 1;
        if (a > 120 && g > 170 && b > 185 && r < 170) cyanPixels += 1;
        if (a > 80 && (r > 60 || g > 60 || b > 60)) litPixels += 1;
      }
      const centerPixel = Array.from(context.getImageData(Math.round(cx), Math.round(cy), 1, 1).data);
      return { x0, y0, x1, y1, bargePixels, cyanPixels, litPixels, centerPixel };
    };

    if (selector === '#sonar-map') {
      const size = 224;
      const viewRadius = 26;
      const cell = size / (viewRadius * 2 + 1);
      const centerX = Math.floor(snap.player.x / TILE);
      const centerY = Math.floor(snap.player.y / TILE);
      const bargeTileX = WORLD_W * 0.5;
      const bargeTileY = BARGE_DOCK_Y / TILE;
      const px = (bargeTileX - centerX + viewRadius) * cell;
      const py = (bargeTileY - centerY + viewRadius) * cell;
      return {
        canvas: { width: canvas.width, height: canvas.height },
        expected: { px, py, cell, centerX, centerY, player: snap.player },
        contacts: snap.state?.sonarContacts ?? [],
        sonarPings: snap.ui?.sonarPings ?? 0,
        region: sampleRegion(px, py, 36, 24),
      };
    }

    const zoom = Math.max(0.62, Math.min(2.6, snap.ui?.sonarMapZoom || 1));
    const worldAspect = WORLD_W / WORLD_H;
    const canvasAspect = canvas.width / canvas.height;
    const baseCell = canvasAspect > worldAspect ? canvas.height / WORLD_H : canvas.width / WORLD_W;
    const cell = baseCell * zoom;
    const centerTileX = clamp(snap.player.x / TILE + (snap.ui?.sonarMapPanX ?? 0), 0, WORLD_W);
    const centerTileY = clamp(snap.player.y / TILE + (snap.ui?.sonarMapPanY ?? 0), 0, WORLD_H);
    const originX = canvas.width * 0.5 - centerTileX * cell;
    const originY = canvas.height * 0.5 - centerTileY * cell;
    const px = originX + (WORLD_W * 0.5) * cell;
    const py = originY + (BARGE_DOCK_Y / TILE) * cell;
    return {
      canvas: { width: canvas.width, height: canvas.height },
      expected: { px, py, cell, centerTileX, centerTileY, player: snap.player },
      contacts: snap.state?.sonarContacts ?? [],
      sonarPings: snap.ui?.sonarPings ?? 0,
      region: sampleRegion(px, py, 40, 28),
    };
  }, canvasSelector);
}

async function saveCanvasPng(page, selector, path) {
  const dataUrl = await page.evaluate((canvasSelector) => document.querySelector(canvasSelector)?.toDataURL('image/png') ?? '', selector);
  if (!dataUrl.startsWith('data:image/png;base64,')) throw new Error(`could not capture ${selector}`);
  await writeFile(path, Buffer.from(dataUrl.replace('data:image/png;base64,', ''), 'base64'));
}

if (server) await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

await page.addInitScript(() => {
  const pad = {
    id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)',
    index: 1,
    connected: true,
    mapping: 'standard',
    timestamp: 0,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
    vibrationActuator: null,
  };
  window.__setMockGamepad = ({ axes = [0, 0, 0, 0], buttons = [], connected = true, mapping = 'standard' } = {}) => {
    pad.timestamp += 16;
    pad.connected = connected;
    pad.mapping = mapping;
    pad.axes = axes;
    const buttonStates = new Map(buttons.map((entry) => {
      if (typeof entry === 'number') return [entry, { pressed: true, touched: true, value: 1 }];
      const value = entry.value ?? (entry.pressed ? 1 : 0);
      return [entry.index, { pressed: entry.pressed ?? value > 0.5, touched: entry.touched ?? value > 0.05, value }];
    }));
    pad.buttons = pad.buttons.map((button, index) => {
      const next = buttonStates.get(index);
      return next ? { ...button, ...next } : { ...button, pressed: false, touched: false, value: 0 };
    });
  };
  Object.defineProperty(navigator, 'getGamepads', {
    configurable: true,
    value: () => [null, pad.connected ? pad : null],
  });
});

page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) errors.push({ type: 'console', text: message.text() });
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
});

let report = {};
try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 25000 });
  await waitForWorld(page);
  await startPlaytestRun(page);
  await page.locator('#sonar-map').waitFor({ timeout: 5000 });

  await setGamepad(page, { buttons: [4] });
  await page.waitForTimeout(140);
  await setGamepad(page);
  await page.waitForFunction(() => (window.__AQUA_PLAYTEST__?.snapshot?.()?.ui?.sonarPings ?? 0) > 0, null, { timeout: 3000 });
  await page.waitForTimeout(120);
  const afterPingSnapshot = await snapshot(page);
  const smallAfterPing = await bargeCanvasStats(page, '#sonar-map');
  await saveCanvasPng(page, '#sonar-map', smallAfterPingPath);

  await page.waitForTimeout(15200);
  const afterExpirySnapshot = await snapshot(page);
  const smallAfterExpiry = await bargeCanvasStats(page, '#sonar-map');
  await saveCanvasPng(page, '#sonar-map', smallAfterExpiryPath);

  await page.keyboard.press('KeyM');
  await page.locator('.sonar-map-overlay.is-open #big-sonar-map').waitFor({ timeout: 5000 });
  await page.waitForTimeout(250);
  const bigMap = await bargeCanvasStats(page, '#big-sonar-map');
  await saveCanvasPng(page, '#big-sonar-map', bigMapPath);
  await page.screenshot({ path: fullPagePath, fullPage: false });

  const afterPingBargeContacts = (afterPingSnapshot?.state?.sonarContacts ?? []).filter((contact) => contact.kind === 'barge');
  const afterExpiryBargeContacts = (afterExpirySnapshot?.state?.sonarContacts ?? []).filter((contact) => contact.kind === 'barge');

  if ((afterPingSnapshot?.ui?.sonarPings ?? 0) <= 0) fail('sonar ping did not register near the barge');
  if (afterPingBargeContacts.length > 0) fail('barge was still stored as a transient sonar contact after ping');
  if (afterExpiryBargeContacts.length > 0) fail('barge remained in transient sonar contacts after contact expiry');
  if ((smallAfterPing?.region?.bargePixels ?? 0) < 40) fail('small sonar map did not show the barge landmark immediately after ping');
  if ((smallAfterExpiry?.region?.bargePixels ?? 0) < 40) fail('small sonar map lost the barge landmark after sonar contacts expired');
  if ((bigMap?.region?.bargePixels ?? 0) < 40) fail('big sonar map did not show the persistent barge landmark');

  report = {
    ok: errors.length === 0,
    baseUrl,
    afterPing: {
      sonarPings: afterPingSnapshot?.ui?.sonarPings ?? 0,
      sonarContactKinds: (afterPingSnapshot?.state?.sonarContacts ?? []).map((contact) => contact.kind),
      smallAfterPing,
    },
    afterExpiry: {
      elapsedMs: 15200,
      sonarPings: afterExpirySnapshot?.ui?.sonarPings ?? 0,
      sonarContactKinds: (afterExpirySnapshot?.state?.sonarContacts ?? []).map((contact) => contact.kind),
      smallAfterExpiry,
    },
    bigMap,
    artifacts: {
      smallAfterPingPath,
      smallAfterExpiryPath,
      bigMapPath,
      fullPagePath,
      reportPath,
    },
  };
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  report = { ...report, errors, serverLogs: serverLogs.slice(-20) };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
  if (server) server.kill('SIGTERM');
}

if (errors.length) {
  console.error('Water9 sonar barge persistence smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 sonar barge persistence smoke passed.');
console.log(`Small after ping: ${smallAfterPingPath}`);
console.log(`Small after expiry: ${smallAfterExpiryPath}`);
console.log(`Big map: ${bigMapPath}`);
console.log(`Report: ${reportPath}`);

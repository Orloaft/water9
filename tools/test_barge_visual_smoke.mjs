import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_BARGE_OUT_DIR ?? '/home/orlovboros/projects/manager/runs';
const reportPath = process.env.WATER9_BARGE_REPORT ?? `${outDir}/water9-barge-visual-smoke-2026-06-28.json`;
const screenshotPath = process.env.WATER9_BARGE_SCREENSHOT ?? `${outDir}/water9-barge-visual-smoke-2026-06-28.png`;
const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_BARGE_PORT ?? 5194);

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
  for (let candidate = start; candidate < start + 80; candidate += 1) {
    if (await canBind(candidate)) return candidate;
  }
  throw new Error(`No open port found from ${start} to ${start + 79}`);
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

async function waitForReady(page) {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false);
  }, null, { timeout: 25000 });
}

async function startPlaytestRun(page) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 10000 });
  await page.evaluate(() => window.__AQUA_PLAYTEST__?.command?.('start'));
  await page.waitForFunction(() => document.querySelector('.shell') && !document.querySelector('.shell')?.classList.contains('is-title'), null, { timeout: 10000 });
  for (let i = 0; i < 12; i += 1) {
    const radioButton = page.locator('button[data-radio-next]').first();
    if (await radioButton.count() <= 0 || !(await radioButton.isVisible({ timeout: 250 }).catch(() => false))) break;
    await radioButton.click();
    await page.waitForTimeout(180);
  }
  await page.waitForFunction(() => !document.querySelector('.shell')?.classList.contains('is-radio-modal'), null, { timeout: 10000 });
  await page.waitForTimeout(350);
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

let texture = null;
let bargeStats = null;
let surfaceStats = null;
try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await waitForReady(page);
  await startPlaytestRun(page);
  texture = await page.evaluate(() => new Promise((resolveImage) => {
    const image = new Image();
    image.onload = () => resolveImage({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolveImage(null);
    image.src = `/assets/generated/barge-platform.png?smoke=${Date.now()}`;
  }));
  if (texture?.width !== 600 || texture?.height !== 72) {
    errors.push({ type: 'assertion', text: `barge-platform texture dimensions were ${texture?.width ?? 'n/a'}x${texture?.height ?? 'n/a'}` });
  }
  bargeStats = await page.evaluate(() => new Promise((resolveImage) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let opaque = 0;
      let brightPixels = 0;
      let magentaFringe = 0;
      let dockGapTransparent = 0;
      let dockGapSamples = 0;
      for (let i = 0; i < data.length; i += 4) {
        const pixel = i / 4;
        const x = pixel % canvas.width;
        const y = Math.floor(pixel / canvas.width);
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (x >= 270 && x <= 330 && y >= 48) {
          dockGapSamples += 1;
          if (a <= 8) dockGapTransparent += 1;
        }
        if (a <= 8) continue;
        opaque += 1;
        if (r + g + b > 360) brightPixels += 1;
        if (r > 120 && b > 120 && g < 100 && Math.abs(r - b) < 100) magentaFringe += 1;
      }
      resolveImage({ opaque, brightPixels, magentaFringe, dockGapTransparent, dockGapSamples });
    };
    image.onerror = () => resolveImage(null);
    image.src = `/assets/generated/barge-platform.png?stats=${Date.now()}`;
  }));
  if (!bargeStats || bargeStats.opaque < 26000) {
    errors.push({ type: 'assertion', text: `barge-platform opaque coverage was too low: ${bargeStats?.opaque ?? 'n/a'}` });
  }
  if (bargeStats && bargeStats.brightPixels < 420) {
    errors.push({ type: 'assertion', text: `barge-platform lacks enough high-contrast lighting/detail pixels: ${bargeStats.brightPixels}` });
  }
  if (bargeStats && bargeStats.magentaFringe > 260) {
    errors.push({ type: 'assertion', text: `barge-platform has too much magenta key fringe: ${bargeStats.magentaFringe}` });
  }
  if (bargeStats && bargeStats.dockGapTransparent < bargeStats.dockGapSamples * 0.86) {
    errors.push({ type: 'assertion', text: `barge-platform docking gap is not clearly open: ${JSON.stringify({ dockGapTransparent: bargeStats.dockGapTransparent, dockGapSamples: bargeStats.dockGapSamples })}` });
  }
  surfaceStats = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return null;
    const x = Math.floor(canvas.width * 0.62);
    const sample = (y) => {
      const yy = Math.max(0, Math.min(canvas.height - 1, y));
      const data = context.getImageData(x, yy, 1, 1).data;
      return { x, y: yy, r: data[0], g: data[1], b: data[2], a: data[3], luma: data[0] * 0.2126 + data[1] * 0.7152 + data[2] * 0.0722 };
    };
    let surface = sample(Math.floor(canvas.height * 0.33));
    const scanTop = Math.floor(canvas.height * 0.24);
    const scanBottom = Math.floor(canvas.height * 0.38);
    for (let y = scanTop; y <= scanBottom; y += 2) {
      const candidate = sample(y);
      const cyanEdgeScore = candidate.luma + Math.max(0, candidate.g - candidate.r) * 0.35 + Math.max(0, candidate.b - candidate.r) * 0.2;
      const currentScore = surface.luma + Math.max(0, surface.g - surface.r) * 0.35 + Math.max(0, surface.b - surface.r) * 0.2;
      if (cyanEdgeScore > currentScore) surface = candidate;
    }
    let sky = sample(Math.floor(canvas.height * 0.05));
    let skyBandDelta = 0;
    let previousSky = null;
    const skyYStart = Math.floor(canvas.height * 0.04);
    const skyYEnd = Math.floor(canvas.height * 0.18);
    for (let sx = Math.floor(canvas.width * 0.12); sx <= Math.floor(canvas.width * 0.88); sx += Math.floor(canvas.width * 0.08)) {
      for (let sy = skyYStart; sy <= skyYEnd; sy += 8) {
        const data = context.getImageData(sx, sy, 1, 1).data;
        const candidate = { x: sx, y: sy, r: data[0], g: data[1], b: data[2], a: data[3], luma: data[0] * 0.2126 + data[1] * 0.7152 + data[2] * 0.0722 };
        if (candidate.luma > sky.luma) sky = candidate;
        const unobstructedAtmosphere = candidate.luma >= 45 && candidate.luma <= 210 && candidate.g >= candidate.r - 4 && candidate.b >= candidate.r - 18;
        if (unobstructedAtmosphere) {
          if (previousSky && previousSky.x === sx && candidate.y - previousSky.y <= 10) {
            skyBandDelta = Math.max(skyBandDelta, Math.abs(candidate.luma - previousSky.luma));
          }
          previousSky = candidate;
        } else {
          previousSky = null;
        }
      }
      previousSky = null;
    }
    return {
      sky,
      skyBandDelta,
      surface,
      water: sample(Math.floor(canvas.height * 0.45)),
    };
  });
  if (!surfaceStats) {
    errors.push({ type: 'assertion', text: 'surface composition canvas samples were unavailable' });
  } else {
    if (surfaceStats.sky.luma < surfaceStats.water.luma + 35) {
      errors.push({ type: 'assertion', text: `sky sample was not clearly brighter than water: ${JSON.stringify(surfaceStats)}` });
    }
    if (surfaceStats.surface.luma < surfaceStats.water.luma + 18) {
      errors.push({ type: 'assertion', text: `waterline sample was not a readable bright edge: ${JSON.stringify(surfaceStats)}` });
    }
    if (surfaceStats.water.b < surfaceStats.water.r + 16) {
      errors.push({ type: 'assertion', text: `below-surface sample did not read as blue-green water: ${JSON.stringify(surfaceStats)}` });
    }
    if (surfaceStats.skyBandDelta > 130) {
      errors.push({ type: 'assertion', text: `top-stage lighting has too much visible band contrast: ${JSON.stringify(surfaceStats)}` });
    }
  }
  await page.screenshot({ path: screenshotPath, fullPage: false });
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  await writeFile(reportPath, `${JSON.stringify({ ok: errors.length === 0, texture, bargeStats, surfaceStats, screenshotPath, errors, serverLogs: serverLogs.slice(-20) }, null, 2)}\n`);
  await browser.close();
  if (server) server.kill('SIGTERM');
}

if (errors.length) {
  console.error('Water9 barge visual smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 barge visual smoke passed.');
console.log(`Screenshot: ${screenshotPath}`);
console.log(`Report: ${reportPath}`);

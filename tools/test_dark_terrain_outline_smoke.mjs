import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_DARK_TERRAIN_OUT_DIR ?? '/home/orlovboros/projects/manager/runs';
const reportPath = process.env.WATER9_DARK_TERRAIN_REPORT ?? `${outDir}/water9-dark-terrain-outline-smoke-2026-06-28.json`;
const screenshotPath = process.env.WATER9_DARK_TERRAIN_SCREENSHOT ?? `${outDir}/water9-dark-terrain-outline-smoke-2026-06-28.png`;
const host = '127.0.0.1';
const port = Number(process.env.WATER9_DARK_TERRAIN_PORT ?? 5196);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=4`;

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

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

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
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null, [name, value]);
}

async function waitForWorld(page) {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false);
  }, null, { timeout: 20000 });
}

async function terrainEdgeMetrics(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { available: false, reason: 'missing canvas' };
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { available: false, reason: 'missing 2d context' };
    const width = canvas.width;
    const height = canvas.height;
    const data = ctx.getImageData(0, 0, width, height).data;
    const roi = {
      left: Math.floor(width * 0.18),
      top: Math.floor(height * 0.16),
      right: Math.floor(width * 0.86),
      bottom: Math.floor(height * 0.84),
    };
    const luminance = (x, y) => {
      const index = (y * width + x) * 4;
      return data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
    };
    const longRuns = [];
    for (let y = roi.top; y < roi.bottom; y += 1) {
      let run = 0;
      for (let x = roi.left; x < roi.right - 1; x += 1) {
        const edge = Math.abs(luminance(x, y) - luminance(x + 1, y)) > 22;
        if (edge) run += 1;
        else if (run) {
          if (run >= 24) longRuns.push(run);
          run = 0;
        }
      }
      if (run >= 24) longRuns.push(run);
    }
    for (let x = roi.left; x < roi.right; x += 1) {
      let run = 0;
      for (let y = roi.top; y < roi.bottom - 1; y += 1) {
        const edge = Math.abs(luminance(x, y) - luminance(x, y + 1)) > 22;
        if (edge) run += 1;
        else if (run) {
          if (run >= 24) longRuns.push(run);
          run = 0;
        }
      }
      if (run >= 24) longRuns.push(run);
    }
    return {
      available: true,
      roi,
      longAxisAlignedRuns: longRuns.length,
      maxRun: longRuns.sort((a, b) => b - a)[0] ?? 0,
      topRuns: longRuns.slice(0, 8),
    };
  });
}

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

let report = {};
try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 25000 });
  await waitForWorld(page);
  const review = await command(page, 'lightingVisibilityReview');
  await page.waitForTimeout(250);
  await page.screenshot({ path: screenshotPath });
  const metrics = await terrainEdgeMetrics(page);

  if (!review || review.biome !== 4) fail('dark terrain review did not stage biome 4');
  if ((review?.darkness ?? 0) < 0.9) fail(`review darkness was too low: ${review?.darkness}`);
  if (review?.hardBlockOutlineAlpha !== 0) fail(`hard block outline alpha should be zero, got ${review?.hardBlockOutlineAlpha}`);

  report = {
    ok: errors.length === 0,
    review,
    screenshotPath,
    metrics,
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
  console.error('Water9 dark terrain outline smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 dark terrain outline smoke passed.');
console.log(`Screenshot: ${screenshotPath}`);
console.log(`Report: ${reportPath}`);

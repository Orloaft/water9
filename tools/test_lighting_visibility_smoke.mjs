import { spawn } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.LIGHTING_VISIBILITY_OUT_DIR ?? '/home/orlovboros/projects/manager/runs';
const prefix = 'water9-lighting-visibility-first-slice-2026-06-28';
const reportPath = process.env.LIGHTING_VISIBILITY_REPORT ?? `${outDir}/${prefix}.json`;
const host = '127.0.0.1';
const port = Number(process.env.LIGHTING_VISIBILITY_PORT ?? 5194);

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

function fail(message) {
  errors.push({ type: 'assertion', text: message });
}

async function waitForPlaytest(page, biome) {
  await page.waitForFunction((targetBiome) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(window.__AQUA_PLAYTEST__?.command) && snap?.world?.ready !== false && snap?.state?.biome === targetBiome;
  }, biome, { timeout: 20000 });
}

async function command(page, name, value) {
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null, [name, value]);
}

const base = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1`;
if (server) await waitForServer(`${base}&biome=2`);

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

const captures = [];
try {
  for (const biome of [2, 3, 4]) {
    const url = process.env.PLAYTEST_URL ? `${process.env.PLAYTEST_URL}&biome=${biome}` : `${base}&biome=${biome}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
    await waitForPlaytest(page, biome);
    const review = await command(page, 'lightingVisibilityReview');
    await page.waitForTimeout(180);
    const screenshotPath = `${outDir}/${prefix}-biome-${biome}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const screenshotBytes = (await stat(screenshotPath)).size;
    if (!review) fail(`biome ${biome} returned no lighting visibility review`);
    if ((review?.visibleEdgeTiles ?? 0) < 8) fail(`biome ${biome} staged too few readable edge tiles: ${review?.visibleEdgeTiles ?? 0}`);
    if ((review?.darkness ?? 0) < 0.55) fail(`biome ${biome} review depth was not dark enough: ${review?.darkness ?? 0}`);
    if (!review?.creature?.hostile || (review?.creature?.parts ?? 0) < 1) fail(`biome ${biome} lacked a dangerous articulated visibility subject`);
    if (screenshotBytes < 20000) fail(`biome ${biome} screenshot looks too small/nonvisual: ${screenshotBytes} bytes`);
    captures.push({ biome, screenshotPath, screenshotBytes, review });
  }
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  const report = {
    schema: 'water9/lighting-visibility-smoke@1',
    generatedAt: new Date().toISOString(),
    passed: errors.length === 0,
    captures,
    errors,
    serverLogs: serverLogs.join('').slice(-4000),
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close().catch(() => {});
  server?.kill('SIGTERM');
}

if (errors.length) {
  console.error('Water9 lighting visibility smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 lighting visibility smoke passed.');
console.log(`Report: ${reportPath}`);

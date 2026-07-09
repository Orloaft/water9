import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_MINING_PERF_OUT_DIR ?? 'runs/water9-deeper-performance-implementation-2026-07-09';
const reportPath = process.env.WATER9_MINING_PERF_REPORT ?? `${outDir}/mining-perf-smoke.json`;
const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_MINING_PERF_PORT ?? 5186);

await mkdir(outDir, { recursive: true });

async function portAvailable(port) {
  return new Promise((resolvePort) => {
    const server = net.createServer();
    server.once('error', () => resolvePort(false));
    server.once('listening', () => server.close(() => resolvePort(true)));
    server.listen(port, host);
  });
}

async function choosePort() {
  const candidates = [
    ...Array.from({ length: 5200 - requestedPort }, (_, index) => requestedPort + index),
    ...Array.from({ length: Math.max(0, requestedPort - 5180) }, (_, index) => 5180 + index),
  ].filter((port) => port >= 5180 && port <= 5199);
  for (const port of candidates) if (await portAvailable(port)) return port;
  throw new Error('no free smoke port in 5180-5199');
}

const port = process.env.PLAYTEST_URL ? 0 : await choosePort();
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=1&perf=1&perfHud=0`;
const server = process.env.PLAYTEST_URL ? null : spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
const serverLogs = [];
server?.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server?.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

async function waitForServer(url) {
  const deadline = Date.now() + 25000;
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
  throw new Error('dev server was not ready');
}

async function command(page, name, value) {
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null, [name, value]);
}

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function waitForWorldReady(page) {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false && !snap.ui?.biomeLoading?.active);
  }, null, { timeout: 30000 });
}

async function captureCanvasPair(page, name) {
  const pngPath = `${outDir}/${name}.png`;
  const grayPath = `${outDir}/${name}-gray.png`;
  await page.locator('#game canvas').screenshot({ path: pngPath });
  const grayscaleDataUrl = await page.evaluate(() => {
    const source = document.querySelector('#game canvas');
    if (!source) return null;
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const gray = Math.round(image.data[i] * 0.2126 + image.data[i + 1] * 0.7152 + image.data[i + 2] * 0.0722);
      image.data[i] = gray;
      image.data[i + 1] = gray;
      image.data[i + 2] = gray;
    }
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL('image/png');
  });
  if (grayscaleDataUrl) await writeFile(grayPath, Buffer.from(grayscaleDataUrl.split(',')[1], 'base64'));
  return { pngPath, grayPath: grayscaleDataUrl ? grayPath : null };
}

if (server) await waitForServer(baseUrl);

const errors = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) errors.push({ type: 'console', text: message.text() });
});

let report = {};
try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.(), null, { timeout: 10000 });
  await page.locator('button[data-start-game]').click();
  await page.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.()?.state?.started === true, null, { timeout: 10000 });
  await waitForWorldReady(page);
  for (let index = 0; index < 8; index += 1) {
    const snap = await snapshot(page);
    if (!snap?.ui?.radioOpen) break;
    await page.keyboard.press('Enter');
    await sleep(60);
  }
  const stage = await command(page, 'selectedToolSmokeStage', { mode: 'terrain' });
  await command(page, 'selectTool', 'drill');
  await sleep(180);
  const before = await snapshot(page);
  const beforeShot = await captureCanvasPair(page, 'mining-before-canvas');
  await command(page, 'resetPerfFrameBuffer');
  const target = stage?.target ?? { worldX: before?.player?.x + 40, worldY: before?.player?.y };
  const mining = await command(page, 'terrainMineAt', { worldX: target.worldX, worldY: target.worldY, repeats: 8 });
  await sleep(700);
  const after = await snapshot(page);
  const afterShot = await captureCanvasPair(page, 'mining-after-canvas');
  const perf = (await command(page, 'exportPerfFrameBuffer'))?.perf ?? after?.perf;
  const drawWorld = perf?.metrics?.['draw.world'] ?? null;
  const dirtyContexts = (perf?.frames ?? []).map((frame) => frame.terrain).filter(Boolean);
  const maxDirtyChunks = Math.max(0, ...dirtyContexts.map((entry) => entry.dirtyChunks ?? 0));
  const maxDirtyTiles = Math.max(0, ...dirtyContexts.map((entry) => entry.dirtyTiles ?? 0));
  if (!drawWorld?.samples) errors.push({ type: 'assertion', text: 'draw.world did not record samples' });
  if ((drawWorld?.maxMs ?? 0) > 4) errors.push({ type: 'assertion', text: `draw.world maxMs too high: ${drawWorld?.maxMs}` });
  if (maxDirtyChunks > 12) errors.push({ type: 'assertion', text: `dirty chunk count too high: ${maxDirtyChunks}` });
  report = {
    ok: errors.length === 0,
    url: baseUrl,
    stage,
    before: { state: before?.state, perf: before?.perf },
    mining,
    after: { state: after?.state, perf },
    metrics: { drawWorld, maxDirtyChunks, maxDirtyTiles },
    artifacts: { beforeShot, afterShot },
    errors,
    serverLogs: serverLogs.slice(-20),
  };
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  report = { ok: false, url: baseUrl, errors, serverLogs: serverLogs.slice(-40) };
} finally {
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close().catch(() => {});
  if (server) {
    server.kill('SIGTERM');
    await new Promise((resolveExit) => server.once('exit', resolveExit));
  }
}

if (!report.ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, reportPath, metrics: report.metrics }, null, 2));

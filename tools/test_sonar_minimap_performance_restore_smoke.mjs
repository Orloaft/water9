import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import {
  assertSteadyGameplayCadence,
  finishCadenceProbe,
  installBrowserPerfObservers,
  startCadenceProbe,
} from './perf_assertions.mjs';

const outDir = process.env.WATER9_SONAR_MINIMAP_OUT_DIR ?? 'runs/water9-sonar-minimap-performance-restore-2026-07-09';
const reportPath = process.env.WATER9_SONAR_MINIMAP_REPORT ?? `${outDir}/sonar-minimap-performance-restore-smoke.json`;
const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_SONAR_MINIMAP_PORT ?? 5185);

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
  for (const port of candidates) {
    if (await portAvailable(port)) return port;
  }
  throw new Error('no free smoke port in 5180-5199');
}

const port = process.env.PLAYTEST_URL ? 0 : await choosePort();
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=2&perf=1&perfHud=0`;

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

function fail(message) {
  errors.push({ type: 'assertion', text: message });
}

async function command(page, name, value) {
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null, [name, value]);
}

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function waitForWorldReady(page, timeoutMs = 30000) {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false && !snap.ui?.biomeLoading?.active);
  }, null, { timeout: timeoutMs });
}

async function canvasStats(page, selector) {
  return page.evaluate((canvasSelector) => {
    const canvas = document.querySelector(canvasSelector);
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let alphaPixels = 0;
    let litPixels = 0;
    let grayMin = 255;
    let grayMax = 0;
    for (let i = 0; i < image.data.length; i += 4) {
      const alpha = image.data[i + 3];
      if (alpha <= 0) continue;
      alphaPixels += 1;
      const gray = Math.round(image.data[i] * 0.2126 + image.data[i + 1] * 0.7152 + image.data[i + 2] * 0.0722);
      if (gray > 24) litPixels += 1;
      grayMin = Math.min(grayMin, gray);
      grayMax = Math.max(grayMax, gray);
    }
    return {
      width: canvas.width,
      height: canvas.height,
      cssWidth: Math.round(rect.width),
      cssHeight: Math.round(rect.height),
      alphaPixels,
      litPixels,
      grayRange: grayMax - grayMin,
    };
  }, selector);
}

async function saveCanvasAndGray(page, selector, name) {
  const pngPath = `${outDir}/${name}.png`;
  const grayPath = `${outDir}/${name}-gray.png`;
  const dataUrls = await page.evaluate((canvasSelector) => {
    const source = document.querySelector(canvasSelector);
    if (!source) return null;
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0);
    const png = canvas.toDataURL('image/png');
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const gray = Math.round(image.data[i] * 0.2126 + image.data[i + 1] * 0.7152 + image.data[i + 2] * 0.0722);
      image.data[i] = gray;
      image.data[i + 1] = gray;
      image.data[i + 2] = gray;
    }
    ctx.putImageData(image, 0, 0);
    return { png, gray: canvas.toDataURL('image/png') };
  }, selector);
  if (dataUrls?.png) await writeFile(pngPath, Buffer.from(dataUrls.png.split(',')[1], 'base64'));
  if (dataUrls?.gray) await writeFile(grayPath, Buffer.from(dataUrls.gray.split(',')[1], 'base64'));
  return { pngPath: dataUrls?.png ? pngPath : null, grayPath: dataUrls?.gray ? grayPath : null };
}

async function normalBandProof(page, band) {
  const directDepthValue = Math.round((band.depth / 6) * 24);
  const teleport = band.direct
    ? { ok: true, command: 'teleportDepth', requestedDepthMeters: band.depth, requestedDepthValue: directDepthValue, result: await command(page, 'teleportDepth', directDepthValue) }
    : await command(page, 'teleportToReachableDepth', band.depth);
  await command(page, 'centerCameraOnPlayer');
  await command(page, 'refill');
  await command(page, 'selectTool', 'drill');
  await waitForWorldReady(page);
  await sleep(220);
  await command(page, 'resetPerfFrameBuffer');
  await startCadenceProbe(page, `sonar-minimap-${band.name}`);
  await page.keyboard.down(band.key);
  await sleep(3200);
  await page.keyboard.up(band.key);
  await sleep(300);
  const cadenceProbe = await finishCadenceProbe(page);
  const snap = await snapshot(page);
  const dom = await page.evaluate(() => ({
    bigMapPresent: Boolean(document.querySelector('#big-sonar-map')),
    overlayOpen: document.querySelector('#sonar-map-overlay')?.classList.contains('is-open') ?? false,
    hudMiniMapPresent: Boolean(document.querySelector('#sonar-map')),
    navText: document.querySelector('.navigation-panel')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  }));
  const gameStats = await canvasStats(page, '#game canvas');
  const minimapStats = await canvasStats(page, '#sonar-map');
  const gameArtifacts = await saveCanvasAndGray(page, '#game canvas', `normal-${band.name}-game-canvas`);
  const minimapArtifacts = await saveCanvasAndGray(page, '#sonar-map', `normal-${band.name}-minimap`);
  const drawBigSonarMap = snap?.perf?.metrics?.['draw.bigSonarMap'] ?? null;
  if (!teleport?.ok) fail(`${band.name}: teleportToReachableDepth failed: ${teleport?.reason ?? 'unknown'}`);
  if (snap?.ui?.sonarMapOpen || dom.overlayOpen || dom.bigMapPresent) fail(`${band.name}: ordinary swimming exposed the full sonar map`);
  if (!dom.hudMiniMapPresent) fail(`${band.name}: compact sonar minimap missing from HUD`);
  if (!minimapStats || minimapStats.litPixels < 400 || minimapStats.grayRange < 20) fail(`${band.name}: compact sonar minimap was blank or unreadable`);
  if (!gameStats || gameStats.litPixels < 1000 || gameStats.grayRange < 20) fail(`${band.name}: #game canvas capture was blank or unreadable`);
  if (drawBigSonarMap?.samples) fail(`${band.name}: ordinary swimming called draw.bigSonarMap`);
  if ((cadenceProbe?.independentRaf?.samples ?? 0) < 100) fail(`${band.name}: ordinary swim rAF probe did not collect enough samples`);
  assertSteadyGameplayCadence({
    label: `sonar minimap ${band.name}`,
    independentRaf: cadenceProbe?.independentRaf ?? null,
    perf: snap?.perf,
    longTasks: cadenceProbe?.longTasks ?? [],
    errors,
    minFrames: 100,
  });
  return {
    band,
    teleport,
    state: { depth: snap?.state?.depth, selectedTool: snap?.state?.selectedTool },
    ui: { sonarMapOpen: snap?.ui?.sonarMapOpen, paused: snap?.ui?.paused },
    dom,
    gameStats,
    minimapStats,
    cadenceProbe: cadenceProbe ? { label: cadenceProbe.label, durationMs: cadenceProbe.durationMs } : null,
    raf: cadenceProbe?.independentRaf ?? null,
    drawSonarMap: snap?.perf?.metrics?.['draw.sonarMap'] ?? null,
    drawBigSonarMap,
    artifacts: { game: gameArtifacts, minimap: minimapArtifacts },
  };
}

if (server) await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await installBrowserPerfObservers(page);

page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) errors.push({ type: 'console', text: message.text() });
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
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
    await sleep(80);
  }
  await command(page, 'dive');
  await command(page, 'refill');
  await waitForWorldReady(page);

  const bands = [
    { name: 'surface', depth: 48, key: 'ArrowRight' },
    { name: 'mid', depth: 420, key: 'ArrowDown' },
    { name: 'deep', depth: 960, key: 'ArrowLeft', direct: true },
  ];
  const normalBands = [];
  for (const band of bands) normalBands.push(await normalBandProof(page, band));

  await command(page, 'selectTool', 'sonar');
  await sleep(120);
  await page.keyboard.press('KeyM');
  await page.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.()?.ui?.sonarMapOpen === true, null, { timeout: 5000 });
  await page.locator('.sonar-map-overlay.is-open #big-sonar-map').waitFor({ timeout: 5000 });
  await command(page, 'resetPerfFrameBuffer');
  await startCadenceProbe(page, 'sonar-minimap-full-chart');
  await page.keyboard.down('ArrowRight');
  await sleep(1200);
  await page.keyboard.up('ArrowRight');
  await sleep(350);
  const sonarCadenceProbe = await finishCadenceProbe(page);
  const sonarSnap = await snapshot(page);
  const sonarFullArtifacts = await saveCanvasAndGray(page, '#big-sonar-map', 'sonar-tool-full-chart');
  const sonarBigMetric = sonarSnap?.perf?.metrics?.['draw.bigSonarMap'] ?? null;
  if (!sonarSnap?.ui?.sonarMapOpen || sonarSnap?.state?.selectedTool !== 'sonar') fail('sonar tool did not keep the full chart open');
  if (!sonarBigMetric?.samples) fail('sonar tool full chart did not measure draw.bigSonarMap');
  assertSteadyGameplayCadence({
    label: 'sonar full chart pan',
    independentRaf: sonarCadenceProbe?.independentRaf ?? null,
    perf: sonarSnap?.perf,
    longTasks: sonarCadenceProbe?.longTasks ?? [],
    errors,
    minFrames: 60,
  });

  report = {
    ok: errors.length === 0,
    url: baseUrl,
    normalBands,
    sonarUse: {
      state: { selectedTool: sonarSnap?.state?.selectedTool, sonarMapOpen: sonarSnap?.ui?.sonarMapOpen },
      cadenceProbe: sonarCadenceProbe ? { label: sonarCadenceProbe.label, durationMs: sonarCadenceProbe.durationMs } : null,
      raf: sonarCadenceProbe?.independentRaf ?? null,
      drawSonarMap: sonarSnap?.perf?.metrics?.['draw.sonarMap'] ?? null,
      drawBigSonarMap: sonarBigMetric,
      artifacts: { fullChart: sonarFullArtifacts },
    },
  };
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  report = { ...report, errors, serverLogs: serverLogs.slice(-20) };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close().catch(() => {});
  if (server) {
    server.kill('SIGTERM');
    await new Promise((resolveExit) => server.once('exit', resolveExit));
  }
}

if (errors.length) {
  console.error('Water9 sonar minimap performance restore smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 sonar minimap performance restore smoke passed.');
console.log(`Report: ${reportPath}`);

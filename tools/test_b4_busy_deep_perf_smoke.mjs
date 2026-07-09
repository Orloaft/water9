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
  summarizeMetric as summarizePerfMetric,
} from './perf_assertions.mjs';

const outDir = process.env.WATER9_B4_PERF_OUT_DIR ?? 'runs/water9-b4-performance-implementation-2026-07-09';
const renderer = process.env.WATER9_B4_RENDERER === 'webgl' ? 'webgl' : 'canvas';
const reportPath = process.env.WATER9_B4_PERF_REPORT ?? `${outDir}/b4-busy-deep-${renderer}-perf-smoke.json`;
const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_B4_PERF_PORT ?? 5180);

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
const rendererQuery = renderer === 'webgl' ? '&renderer=webgl' : '';
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=4&perf=1&perfHud=0${rendererQuery}`;
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

function quantile(values, rank) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * rank))] ?? 0;
}

function summarize(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  const avg = finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : 0;
  return {
    samples: finite.length,
    avg: round(avg),
    p50: round(quantile(finite, 0.5)),
    p95: round(quantile(finite, 0.95)),
    p99: round(quantile(finite, 0.99)),
    max: round(finite.length ? Math.max(...finite) : 0),
    over20: countOver(finite, 20),
    over33_34: countOver(finite, 33.34),
    over50: countOver(finite, 50),
  };
}

function countOver(values, threshold) {
  const count = values.filter((value) => value > threshold).length;
  return { count, pct: values.length ? round((count / values.length) * 100) : 0 };
}

function summarizeFrames(frames) {
  const raf = summarize(frames.map((frame) => frame.rafDeltaMs));
  const contactDeltas = frames.map((frame) => frame.terrain?.contactSamplesDelta ?? 0);
  const render = summarize(frames.map((frame) => frame.outer?.renderMs ?? 0));
  const postStepToRender = summarize(frames.map((frame) => frame.outer?.postStepToRenderMs ?? 0));
  const outerFrame = summarize(frames.map((frame) => frame.outer?.frameTotalMs ?? 0));
  const worst = [...frames].sort((a, b) => b.rafDeltaMs - a.rafDeltaMs).slice(0, 20);
  const last = frames[frames.length - 1] ?? null;
  return {
    raf,
    outerFrame,
    render,
    postStepToRender,
    contactSamplesPerFrame: summarize(contactDeltas),
    contactSamplesTotalDelta: contactDeltas.reduce((sum, value) => sum + value, 0),
    dirtyTerrainMax: {
      chunks: frames.reduce((max, frame) => Math.max(max, frame.terrain?.dirtyChunks ?? 0), 0),
      tiles: frames.reduce((max, frame) => Math.max(max, frame.terrain?.dirtyTiles ?? 0), 0),
    },
    sonarLast: last?.sonar ?? null,
    entitiesLast: last?.entities ?? null,
    visibleLast: last?.visible ?? null,
    fishTiersLast: last?.fishTiers ?? null,
    articulatedTiersLast: last?.articulatedTiers ?? null,
    worst,
  };
}

function classify(perf, independentRafSummary) {
  const metrics = perf?.metrics ?? {};
  const rafP95 = independentRafSummary?.p95 ?? Number.POSITIVE_INFINITY;
  const updateP95 = metrics['update.total']?.p95Ms ?? 0;
  const renderP95 = metrics['outer.render']?.p95Ms ?? 0;
  const gapP95 = metrics['outer.postStepToRender']?.p95Ms ?? 0;
  const longTasks = perf?.longTasks ?? [];
  if (rafP95 <= 20 && (independentRafSummary?.over50?.count ?? Number.POSITIVE_INFINITY) === 0) return 'steady';
  if (updateP95 >= 10 || (metrics['update.fish']?.p95Ms ?? 0) >= 3 || (metrics['update.articulated']?.p95Ms ?? 0) >= 2) return 'update-bound-or-entity-bound';
  if (renderP95 >= 8 || gapP95 >= 8) return 'render-bound';
  if (longTasks.some((task) => task.duration >= 50)) return 'gc-browser-or-mixed';
  return 'mixed-or-unenclosed';
}

function round(value) {
  return Math.round(value * 100) / 100;
}

if (server) await waitForServer(baseUrl);

const errors = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await installBrowserPerfObservers(page);
await page.addInitScript(() => {
  window.__water9RafDeltas = [];
  window.__water9RafLast = 0;
  const loop = (time) => {
    if (window.__water9RafLast) window.__water9RafDeltas.push(time - window.__water9RafLast);
    window.__water9RafLast = time;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});
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
  await command(page, 'dive');
  await command(page, 'maxUpgrades');
  await command(page, 'refill');
  const teleport = await command(page, 'teleportToReachableDepth', 1650);
  await command(page, 'teleportToArticulated');
  await command(page, 'refill');
  await command(page, 'clearProofOverlays');
  await sleep(650);
  const startShot = await captureCanvasPair(page, `b4-busy-deep-${renderer}-start-canvas`);
  await command(page, 'resetPerfFrameBuffer');
  await startCadenceProbe(page, `b4-busy-deep-${renderer}`);
  await sleep(80);
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowDown');
  await sleep(3600);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('ArrowDown');
  await sleep(360);
  const cadenceProbe = await finishCadenceProbe(page);
  const perf = (await command(page, 'exportPerfFrameBuffer'))?.perf;
  const endShot = await captureCanvasPair(page, `b4-busy-deep-${renderer}-end-canvas`);
  const frames = perf?.frames ?? [];
  const independentRaf = cadenceProbe?.independentRaf ?? null;
  if (frames.length <= 30) errors.push({ type: 'assertion', text: 'perf frame buffer did not collect enough B4 frame samples' });
  assertSteadyGameplayCadence({
    label: `B4 ${renderer}`,
    independentRaf,
    perf,
    longTasks: cadenceProbe?.longTasks ?? [],
    errors,
  });
  report = {
    ok: errors.length === 0,
    renderer,
    url: baseUrl,
    teleport,
    scenario: {
      name: 'visually-busy-high-entity-deep-area',
      biome: 4,
      depthCommand: 'teleportToReachableDepth(1650)',
      articulatedCommand: 'teleportToArticulated',
      heldKeys: ['ArrowRight', 'ArrowDown'],
      viewport: { width: 1280, height: 800 },
      sonarExpectedOpen: false,
    },
    classification: classify(perf, independentRaf),
    cadenceProbe: cadenceProbe ? { label: cadenceProbe.label, durationMs: cadenceProbe.durationMs } : null,
    independentRaf,
    frameSummary: summarizeFrames(frames),
    metrics: {
      frameTotal: summarizePerfMetric(perf?.metrics?.['frame.total']),
      updateTotal: summarizePerfMetric(perf?.metrics?.['update.total']),
      drawTotal: summarizePerfMetric(perf?.metrics?.['draw.total']),
      drawWorld: summarizePerfMetric(perf?.metrics?.['draw.world']),
      fish: summarizePerfMetric(perf?.metrics?.['update.fish']),
      articulated: summarizePerfMetric(perf?.metrics?.['update.articulated']),
      outerRafDelta: summarizePerfMetric(perf?.metrics?.['outer.rafDelta']),
      outerStep: summarizePerfMetric(perf?.metrics?.['outer.step']),
      outerRender: summarizePerfMetric(perf?.metrics?.['outer.render']),
      outerPostStepToRender: summarizePerfMetric(perf?.metrics?.['outer.postStepToRender']),
      outerFrameTotal: summarizePerfMetric(perf?.metrics?.['outer.frameTotal']),
    },
    longTasks: {
      count: perf?.longTasks?.length ?? 0,
      over50: (perf?.longTasks ?? []).filter((task) => task.duration > 50).length,
      maxDuration: round(Math.max(0, ...(perf?.longTasks ?? []).map((task) => task.duration))),
      recent: perf?.longTasks ?? [],
    },
    screenshot: { start: startShot, end: endShot },
    errors,
    serverLogs: serverLogs.slice(-20),
  };
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  report = { ok: false, renderer, url: baseUrl, errors, serverLogs: serverLogs.slice(-40) };
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
console.log(JSON.stringify({ ok: true, renderer, reportPath, classification: report.classification, independentRaf: report.independentRaf }, null, 2));

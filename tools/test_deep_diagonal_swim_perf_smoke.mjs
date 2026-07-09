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

const outDir = process.env.WATER9_DEEP_SWIM_OUT_DIR ?? 'runs/water9-deeper-performance-implementation-2026-07-09';
const reportPath = process.env.WATER9_DEEP_SWIM_REPORT ?? `${outDir}/deep-diagonal-swim-perf-smoke.json`;
const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_DEEP_SWIM_PORT ?? 5187);

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
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=3&perf=1&perfHud=0`;
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

function summarizeFrames(frames) {
  const sorted = [...frames].sort((a, b) => b.rafDeltaMs - a.rafDeltaMs);
  const worst = sorted.slice(0, 20);
  const avg = frames.length ? frames.reduce((sum, frame) => sum + frame.rafDeltaMs, 0) / frames.length : 0;
  const over50 = frames.filter((frame) => frame.rafDeltaMs > 50).length;
  const p95 = sorted.length ? [...frames].sort((a, b) => a.rafDeltaMs - b.rafDeltaMs)[Math.min(frames.length - 1, Math.floor(frames.length * 0.95))].rafDeltaMs : 0;
  const causeScores = {
    worldViewChange: worst.filter((frame, index) => index > 0 && Math.abs(frame.camera.y - worst[index - 1].camera.y) > 16).length,
    terrainDirtyRedraw: worst.filter((frame) => frame.terrain?.dirtyTiles > 0 || frame.terrain?.dirtyChunks > 0 || frame.drawMs > 12).length,
    entityVolume: worst.filter((frame) => (frame.visible?.fish ?? 0) + (frame.visible?.articulatedParts ?? 0) > 30).length,
    chartOverlay: worst.filter((frame) => frame.sonar?.open).length,
    longTask: worst.filter((frame) => (frame.longTasks ?? []).length > 0).length,
  };
  const dominant = Object.entries(causeScores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';
  return {
    samples: frames.length,
    avgFrameMs: Math.round(avg * 100) / 100,
    p95FrameMs: Math.round(p95 * 100) / 100,
    maxFrameMs: Math.round((worst[0]?.rafDeltaMs ?? 0) * 100) / 100,
    framesOver50: over50,
    dominant,
    causeScores,
    worst,
  };
}

if (server) await waitForServer(baseUrl);

const errors = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await installBrowserPerfObservers(page);
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

  const bands = [];
  for (const depth of [360, 780, 1140, 1500]) {
    const teleport = await command(page, 'teleportToReachableDepth', depth);
    await command(page, 'refill');
    await command(page, 'resetPerfFrameBuffer');
    await sleep(180);
    await captureCanvasPair(page, `deep-diagonal-depth-${depth}-start-canvas`);
    await startCadenceProbe(page, `deep-diagonal-${depth}m`);
    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('ArrowDown');
    await sleep(3600);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('ArrowDown');
    await sleep(300);
    const cadenceProbe = await finishCadenceProbe(page);
    const perf = (await command(page, 'exportPerfFrameBuffer'))?.perf;
    const shot = await captureCanvasPair(page, `deep-diagonal-depth-${depth}-end-canvas`);
    const frames = perf?.frames ?? [];
    assertSteadyGameplayCadence({
      label: `deep diagonal ${depth}m`,
      independentRaf: cadenceProbe?.independentRaf ?? null,
      perf,
      longTasks: cadenceProbe?.longTasks ?? [],
      errors,
    });
    bands.push({
      requestedDepth: depth,
      teleport,
      cadenceProbe: cadenceProbe ? { label: cadenceProbe.label, durationMs: cadenceProbe.durationMs } : null,
      independentRaf: cadenceProbe?.independentRaf ?? null,
      summary: summarizeFrames(frames),
      metrics: {
        frameTotal: perf?.metrics?.['frame.total'] ?? null,
        updateTotal: perf?.metrics?.['update.total'] ?? null,
        drawTotal: perf?.metrics?.['draw.total'] ?? null,
        drawWorld: perf?.metrics?.['draw.world'] ?? null,
        drawBigSonarMap: perf?.metrics?.['draw.bigSonarMap'] ?? null,
        outerRafDelta: perf?.metrics?.['outer.rafDelta'] ?? null,
        outerFrameTotal: perf?.metrics?.['outer.frameTotal'] ?? null,
      },
      screenshot: shot,
    });
  }

  const allWorst = bands.flatMap((band) => band.summary.worst.map((frame) => ({ depth: band.requestedDepth, ...frame })))
    .sort((a, b) => b.rafDeltaMs - a.rafDeltaMs)
    .slice(0, 20);
  if (!bands.every((band) => band.teleport?.ok)) errors.push({ type: 'assertion', text: 'one or more depth teleports failed' });
  if (!bands.every((band) => band.summary.samples >= 180)) errors.push({ type: 'assertion', text: 'one or more depth bands did not collect at least 180 frame samples' });
  report = {
    ok: errors.length === 0,
    url: baseUrl,
    bands,
    worstFrames: allWorst,
    conclusion: allWorst[0]
      ? `Largest sampled hitch is ${allWorst[0].rafDeltaMs}ms at requested depth ${allWorst[0].depth}; dominant band causes: ${bands.map((band) => `${band.requestedDepth}:${band.summary.dominant}`).join(', ')}.`
      : 'No frame samples collected.',
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
console.log(JSON.stringify({ ok: true, reportPath, conclusion: report.conclusion }, null, 2));

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

const outDir = process.env.LOADING_SWIM_PERF_OUT_DIR ?? 'runs/water9-performance-loading-swim-fps-2026-07-09';
const reportPath = process.env.LOADING_SWIM_PERF_REPORT ?? `${outDir}/loading-swim-perf-smoke.json`;
const host = '127.0.0.1';
const requestedPort = Number(process.env.LOADING_SWIM_PERF_PORT ?? 5183);

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
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?perf=1&perfHud=0`;

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

async function waitForServer(url, timeoutMs = 25000) {
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

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function command(page, name, value) {
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null, [name, value]);
}

async function loadingDomState(page) {
  return page.evaluate(() => {
    const overlay = document.querySelector('#biome-loading');
    const radio = document.querySelector('#radio-dialogue');
    const center = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return {
      overlayOpen: overlay?.classList.contains('is-open') ?? false,
      overlayPhase: overlay?.getAttribute('data-phase') ?? null,
      overlayProgress: Number(overlay?.getAttribute('data-progress') ?? 0),
      overlayZIndex: Number(getComputedStyle(overlay).zIndex || 0),
      radioOpen: radio?.classList.contains('is-open') ?? false,
      radioZIndex: Number(getComputedStyle(radio).zIndex || 0),
      topElementId: center?.id || center?.closest('[id]')?.id || '',
      text: overlay?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    };
  });
}

async function startRafProbe(page, durationMs) {
  await page.evaluate((duration) => {
    window.__water9RafProbe = {
      frames: [],
      longFrames: 0,
      maxFrameMs: 0,
      startedAt: performance.now(),
      durationMs: duration,
      complete: false,
    };
    let last = performance.now();
    function tick(now) {
      const delta = now - last;
      last = now;
      window.__water9RafProbe.frames.push(delta);
      if (delta > 50) window.__water9RafProbe.longFrames += 1;
      window.__water9RafProbe.maxFrameMs = Math.max(window.__water9RafProbe.maxFrameMs, delta);
      if (now - window.__water9RafProbe.startedAt < duration) requestAnimationFrame(tick);
      else window.__water9RafProbe.complete = true;
    }
    requestAnimationFrame(tick);
  }, durationMs);
}

async function finishRafProbe(page) {
  await page.waitForFunction(() => window.__water9RafProbe?.complete, null, { timeout: 12000 });
  return page.evaluate(() => {
    const probe = window.__water9RafProbe;
    const frames = probe?.frames ?? [];
    const sorted = [...frames].sort((a, b) => a - b);
    const percentile = (p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0;
    const avg = frames.length ? frames.reduce((sum, frame) => sum + frame, 0) / frames.length : 0;
    return {
      samples: frames.length,
      durationMs: Math.round(performance.now() - (probe?.startedAt ?? performance.now())),
      avgFrameMs: Math.round(avg * 100) / 100,
      p95FrameMs: Math.round(percentile(0.95) * 100) / 100,
      p99FrameMs: Math.round(percentile(0.99) * 100) / 100,
      maxFrameMs: Math.round((probe?.maxFrameMs ?? 0) * 100) / 100,
      longFrames: probe?.longFrames ?? 0,
      over20: frames.filter((frame) => frame > 20).length,
      over33_34: frames.filter((frame) => frame > 33.34).length,
      over50: frames.filter((frame) => frame > 50).length,
    };
  });
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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await installBrowserPerfObservers(page);

page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
    errors.push({ type: 'console', text: message.text() });
  }
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
});

let report = {};
try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.(), null, { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector('#biome-loading')?.classList.contains('is-open'), null, { timeout: 5000 });

  const loadingBeforeStart = await loadingDomState(page);
  await startRafProbe(page, 1800);
  await page.evaluate(() => {
    const button = document.querySelector('[data-start-game]');
    button?.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      isPrimary: true,
      pointerType: 'mouse',
    }));
  });

  const startTransitionSamples = [];
  const transitionDeadline = Date.now() + 8000;
  while (Date.now() < transitionDeadline) {
    const snap = await snapshot(page);
    const dom = await loadingDomState(page);
    startTransitionSamples.push({
      t: Math.round(performance.now()),
      worldReady: snap?.world?.ready !== false,
      started: snap?.state?.started ?? null,
      loading: snap?.ui?.biomeLoading ?? null,
      dom,
    });
    if (snap?.world?.ready !== false && !snap?.ui?.biomeLoading?.active) break;
    await sleep(60);
  }
  const startupRaf = await finishRafProbe(page);
  const readyAfterStart = await snapshot(page);

  const blockedByRadioOnly = startTransitionSamples.some((sample) => (
    sample.started
    && sample.dom.radioOpen
    && !sample.worldReady
    && !sample.dom.overlayOpen
  ));
  const coveredByOverlay = startTransitionSamples.some((sample) => (
    sample.started
    && sample.dom.radioOpen
    && sample.dom.overlayOpen
    && sample.dom.overlayZIndex > sample.dom.radioZIndex
  ));

  for (let i = 0; i < 8; i += 1) {
    const radioOpen = await page.evaluate(() => document.querySelector('#radio-dialogue')?.classList.contains('is-open') ?? false);
    if (!radioOpen) break;
    await page.keyboard.press('Enter');
    await sleep(60);
  }
  await command(page, 'dive');
  const teleport = await command(page, 'teleportToReachableDepth', 640);
  await command(page, 'refill');
  await sleep(900);

  const beforeSwim = await snapshot(page);
  const firstSettledShot = await captureCanvasPair(page, 'loading-first-settled-gameplay-canvas');
  await command(page, 'resetPerfFrameBuffer');
  await startCadenceProbe(page, 'loading-first-settled-swim');
  const path = [
    ['ArrowDown', 1500],
    ['ArrowRight', 1500],
    ['ArrowUp', 1500],
    ['ArrowLeft', 1500],
  ];
  for (const [key, duration] of path) {
    await page.keyboard.down(key);
    await sleep(duration);
    await page.keyboard.up(key);
  }
  await sleep(600);
  const swimCadenceProbe = await finishCadenceProbe(page);
  const swimRaf = swimCadenceProbe?.independentRaf ?? null;
  const afterSwim = await snapshot(page);

  const metrics = afterSwim?.perf?.metrics ?? {};
  const metric = (key) => metrics[key] ?? null;

  if (!loadingBeforeStart.overlayOpen) fail('loading overlay was not visible on the main menu before start');
  if (!coveredByOverlay) fail('start transition did not record the loading overlay covering the opened radio dialogue');
  if (blockedByRadioOnly) fail('radio dialogue was visible without the loading overlay before world readiness');
  if (readyAfterStart?.world?.ready === false || readyAfterStart?.ui?.biomeLoading?.active) fail('world did not reach a non-loading ready state after start');
  // Loading may have one bounded asset/world handoff, but multi-frame doubled
  // cadence or a severe synchronous stall is never accepted silently.
  if ((startupRaf?.maxFrameMs ?? 0) > 250) fail(`startup transition severe frame stall: ${startupRaf?.maxFrameMs}ms`);
  if ((startupRaf?.over50 ?? 0) > 1) fail(`startup transition had ${startupRaf?.over50} frames over 50ms (one bounded handoff allowed)`);
  if ((startupRaf?.over33_34 ?? 0) > 2) fail(`startup transition had sustained doubled frames: ${startupRaf?.over33_34}`);
  if (!teleport?.ok) fail(`teleportToReachableDepth failed: ${teleport?.reason ?? 'unknown'}`);
  for (const key of ['frame.total', 'update.total', 'draw.total', 'draw.sonarMap']) {
    if (!metric(key)?.samples) fail(`perf metric ${key} did not record samples`);
  }
  if (metric('draw.bigSonarMap')?.samples) fail('hidden big sonar map was redrawn during closed-map swimming');
  if ((metric('frame.total')?.p95Ms ?? 0) > 34) fail(`frame.total raw-window p95 too high: ${metric('frame.total')?.p95Ms}`);
  if ((metric('draw.total')?.p95Ms ?? 0) > 26) fail(`draw.total raw-window p95 too high: ${metric('draw.total')?.p95Ms}`);
  assertSteadyGameplayCadence({
    label: 'loading first settled swim',
    independentRaf: swimRaf,
    perf: afterSwim?.perf,
    longTasks: swimCadenceProbe?.longTasks ?? [],
    errors,
  });

  report = {
    ok: errors.length === 0,
    url: baseUrl,
    loadingBeforeStart,
    startTransitionSamples,
    startupRaf,
    readyAfterStart: readyAfterStart?.ui?.biomeLoading ?? null,
    teleport,
    swim: {
      durationMs: swimCadenceProbe?.durationMs ?? 0,
      movementPath: path.map(([key, duration]) => ({ key, durationMs: duration })),
      cadenceProbe: swimCadenceProbe ? { label: swimCadenceProbe.label, durationMs: swimCadenceProbe.durationMs } : null,
      raf: swimRaf,
      before: {
        player: beforeSwim?.player ?? null,
        perf: beforeSwim?.perf ?? null,
        artifacts: firstSettledShot,
      },
      after: {
        player: afterSwim?.player ?? null,
        frameTotal: metric('frame.total'),
        updateTotal: metric('update.total'),
        drawTotal: metric('draw.total'),
        drawSonarMap: metric('draw.sonarMap'),
        drawBigSonarMap: metric('draw.bigSonarMap'),
        drawWorld: metric('draw.world'),
        drawFish: metric('draw.fish'),
        updateFish: metric('update.fish'),
        updateArticulated: metric('update.articulated'),
      },
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
  console.error('Water9 loading/swim perf smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 loading/swim perf smoke passed.');
console.log(`Report: ${reportPath}`);

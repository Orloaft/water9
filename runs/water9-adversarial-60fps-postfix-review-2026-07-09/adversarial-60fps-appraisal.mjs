import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = 'runs/water9-adversarial-60fps-postfix-review-2026-07-09';
const reportPath = `${outDir}/adversarial-60fps-appraisal.json`;
const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_ADVERSARIAL_PORT ?? 5185);
const viewport = { width: 1280, height: 800 };

await mkdir(outDir, { recursive: true });

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

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

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function round(value, places = 2) {
  if (!Number.isFinite(value)) return value ?? null;
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function summarizeDeltas(deltas) {
  const values = deltas.filter((value) => Number.isFinite(value) && value >= 0.05);
  const sorted = [...values].sort((a, b) => a - b);
  const countOver = (threshold) => values.filter((value) => value > threshold).length;
  const pct = (count) => values.length ? round((count / values.length) * 100, 2) : 0;
  const over1667 = countOver(16.67);
  const over20 = countOver(20);
  const over3334 = countOver(33.34);
  const over50 = countOver(50);
  return {
    samples: values.length,
    avgMs: round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)),
    p50Ms: round(percentile(sorted, 0.5)),
    p95Ms: round(percentile(sorted, 0.95)),
    p99Ms: round(percentile(sorted, 0.99)),
    maxMs: round(sorted.at(-1) ?? 0),
    over16_67: { count: over1667, pct: pct(over1667) },
    over20: { count: over20, pct: pct(over20) },
    over33_34: { count: over3334, pct: pct(over3334) },
    over50: { count: over50, pct: pct(over50) },
  };
}

function metricSubset(perf) {
  const wanted = [
    'frame.total',
    'update.total',
    'draw.total',
    'draw.world',
    'update.fish',
    'draw.fish',
    'draw.sonarMap',
    'draw.bigSonarMap',
    'update.articulated',
    'draw.articulated',
    'draw.sub',
    'update.submarine',
  ];
  const metrics = perf?.metrics ?? {};
  return Object.fromEntries(wanted.map((key) => [key, metrics[key] ?? null]));
}

function topMetrics(perf, limit = 12) {
  return Object.entries(perf?.metrics ?? {})
    .map(([key, metric]) => ({ key, ...metric }))
    .filter((metric) => metric.samples)
    .sort((a, b) => (b.maxMs ?? 0) - (a.maxMs ?? 0))
    .slice(0, limit);
}

function perfFrameSummary(perf) {
  const frames = perf?.frames ?? [];
  const raf = summarizeDeltas(frames.map((frame) => frame.rafDeltaMs));
  const maxDirtyChunks = Math.max(0, ...frames.map((frame) => frame.terrain?.dirtyChunks ?? 0));
  const maxDirtyTiles = Math.max(0, ...frames.map((frame) => frame.terrain?.dirtyTiles ?? 0));
  const maxVisibleFish = Math.max(0, ...frames.map((frame) => frame.visible?.fish ?? 0));
  const maxVisibleArticulated = Math.max(0, ...frames.map((frame) => frame.visible?.articulated ?? 0));
  const maxVisibleArticulatedParts = Math.max(0, ...frames.map((frame) => frame.visible?.articulatedParts ?? 0));
  return {
    samples: frames.length,
    raf,
    maxDirtyChunks,
    maxDirtyTiles,
    maxVisibleFish,
    maxVisibleArticulated,
    maxVisibleArticulatedParts,
    longTaskFrames: frames.filter((frame) => (frame.longTasks ?? []).length > 0).length,
    worstFrames: [...frames].sort((a, b) => (b.rafDeltaMs ?? 0) - (a.rafDeltaMs ?? 0)).slice(0, 12),
  };
}

async function waitForServer(url, server) {
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`dev server exited before ready with code ${server.exitCode}`);
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

async function dismissRadio(page) {
  for (let index = 0; index < 10; index += 1) {
    const snap = await snapshot(page);
    if (!snap?.ui?.radioOpen) return;
    await page.keyboard.press('Enter');
    await sleep(80);
  }
}

async function setupStartedPage(browser, baseUrl, biome = 3, pageErrors) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => pageErrors.push({ type: 'pageerror', text: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
      pageErrors.push({ type: 'console', text: message.text() });
    }
  });
  const url = `${baseUrl}/?playtest=1&biome=${biome}&perf=1&perfHud=0`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.(), null, { timeout: 10000 });
  await page.locator('button[data-start-game]').click();
  await page.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.()?.state?.started === true, null, { timeout: 10000 });
  await waitForWorldReady(page);
  await dismissRadio(page);
  await command(page, 'dive');
  await command(page, 'maxUpgrades');
  await command(page, 'refill');
  await dismissRadio(page);
  return { page, url };
}

async function startRafProbe(page, durationMs) {
  await page.evaluate((duration) => {
    window.__water9AdversarialRaf = {
      frames: [],
      startedAt: performance.now(),
      durationMs: duration,
      complete: false,
    };
    let last = performance.now();
    function tick(now) {
      window.__water9AdversarialRaf.frames.push(now - last);
      last = now;
      if (now - window.__water9AdversarialRaf.startedAt < duration) requestAnimationFrame(tick);
      else window.__water9AdversarialRaf.complete = true;
    }
    requestAnimationFrame(tick);
  }, durationMs);
}

async function finishRafProbe(page, timeoutMs) {
  await page.waitForFunction(() => window.__water9AdversarialRaf?.complete, null, { timeout: timeoutMs + 5000 });
  return page.evaluate(() => window.__water9AdversarialRaf?.frames ?? []);
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
  return { color: pngPath, grayscale: grayscaleDataUrl ? grayPath : null };
}

async function holdKeys(page, keys, durationMs) {
  for (const key of keys) await page.keyboard.down(key);
  await sleep(durationMs);
  for (const key of [...keys].reverse()) await page.keyboard.up(key);
}

async function measureScenario(page, options) {
  const {
    name,
    durationMs = 4200,
    inputPath,
    setup,
    capture = false,
    captureName = name,
    notes = '',
  } = options;
  if (setup) await setup();
  await waitForWorldReady(page);
  await dismissRadio(page);
  await command(page, 'refill');
  const before = await snapshot(page);
  await command(page, 'resetPerfFrameBuffer');
  await sleep(180);
  await startRafProbe(page, durationMs);
  if (inputPath) await inputPath();
  else await sleep(durationMs);
  const rafDeltas = await finishRafProbe(page, durationMs);
  await sleep(180);
  const exportResult = await command(page, 'exportPerfFrameBuffer');
  const after = await snapshot(page);
  const artifacts = capture ? await captureCanvasPair(page, captureName) : null;
  const perf = exportResult?.perf ?? after?.perf ?? null;
  return {
    name,
    notes,
    viewport,
    durationMs,
    inputPath: options.inputDescription ?? 'settled/no keyboard input',
    url: page.url(),
    before: {
      state: before?.state ?? null,
      ui: before?.ui ?? null,
      camera: before?.camera ?? null,
      perf: metricSubset(before?.perf),
      terrain: {
        dirtyReason: before?.perf?.terrainDirtyReason ?? null,
        terrainMaskMutations: before?.perf?.terrainMaskMutations ?? null,
        terrainContactSamples: before?.perf?.terrainContactSamples ?? null,
        propRefresh: before?.perf?.propRefresh ?? null,
      },
      visibleCounts: {
        fish: before?.fish?.filter((fish) => fish.screenVisible).length ?? null,
        articulated: before?.articulatedCreatures?.filter((creature) => creature.parts?.some((part) => part.sprite?.screenX >= -80 && part.sprite?.screenX <= viewport.width + 80 && part.sprite?.screenY >= -80 && part.sprite?.screenY <= viewport.height + 80)).length ?? null,
      },
    },
    after: {
      state: after?.state ?? null,
      ui: after?.ui ?? null,
      camera: after?.camera ?? null,
      perf: metricSubset(perf),
      topMetrics: topMetrics(perf),
      perfFrameSummary: perfFrameSummary(perf),
      terrain: {
        dirtyReason: perf?.terrainDirtyReason ?? null,
        terrainMaskMutations: perf?.terrainMaskMutations ?? null,
        terrainContactSamples: perf?.terrainContactSamples ?? null,
        propRefresh: perf?.propRefresh ?? null,
      },
      longTasks: perf?.longTasks ?? [],
      visibleCounts: {
        fish: after?.fish?.filter((fish) => fish.screenVisible).length ?? null,
        articulated: after?.articulatedCreatures?.filter((creature) => creature.parts?.some((part) => part.sprite?.screenX >= -80 && part.sprite?.screenX <= viewport.width + 80 && part.sprite?.screenY >= -80 && part.sprite?.screenY <= viewport.height + 80)).length ?? null,
      },
    },
    raf: {
      summary: summarizeDeltas(rafDeltas),
      deltas: rafDeltas.map((value) => round(value)),
      worst: [...rafDeltas].sort((a, b) => b - a).slice(0, 20).map((value) => round(value)),
    },
    artifacts,
  };
}

const port = await choosePort();
const baseUrl = `http://${host}:${port}`;
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
const serverLogs = [];
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

const errors = [];
const scenarios = [];
let loading = null;

try {
  await waitForServer(`${baseUrl}/?playtest=1&biome=3&perf=1&perfHud=0`, server);
  const browser = await chromium.launch({ headless: true });
  try {
    const loadingErrors = [];
    const loadingPage = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    loadingPage.on('pageerror', (error) => loadingErrors.push({ type: 'pageerror', text: error.message }));
    const loadingUrl = `${baseUrl}/?playtest=1&biome=3&perf=1&perfHud=0`;
    await loadingPage.goto(loadingUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await loadingPage.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.(), null, { timeout: 10000 });
    await startRafProbe(loadingPage, 6000);
    await loadingPage.locator('button[data-start-game]').click();
    await loadingPage.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.()?.state?.started === true, null, { timeout: 10000 });
    await waitForWorldReady(loadingPage);
    await dismissRadio(loadingPage);
    await command(loadingPage, 'dive');
    const loadingDeltas = await finishRafProbe(loadingPage, 6000);
    const loadingSnapshot = await snapshot(loadingPage);
    const loadingPerf = (await command(loadingPage, 'exportPerfFrameBuffer'))?.perf ?? loadingSnapshot?.perf ?? null;
    loading = {
      name: 'loading-start-transition',
      url: loadingUrl,
      viewport,
      durationMs: 6000,
      inputPath: 'click Start, wait for started/worldReady, dismiss initial radio, dive',
      raf: {
        summary: summarizeDeltas(loadingDeltas),
        deltas: loadingDeltas.map((value) => round(value)),
        worst: [...loadingDeltas].sort((a, b) => b - a).slice(0, 20).map((value) => round(value)),
      },
      after: {
        state: loadingSnapshot?.state ?? null,
        ui: loadingSnapshot?.ui ?? null,
        camera: loadingSnapshot?.camera ?? null,
        perf: metricSubset(loadingPerf),
        topMetrics: topMetrics(loadingPerf),
        perfFrameSummary: perfFrameSummary(loadingPerf),
        longTasks: loadingPerf?.longTasks ?? [],
      },
      artifacts: await captureCanvasPair(loadingPage, 'loading-start-transition-canvas'),
      errors: loadingErrors,
    };
    await loadingPage.close();

    const pageErrors = [];
    const { page, url } = await setupStartedPage(browser, baseUrl, 3, pageErrors);

    scenarios.push(await measureScenario(page, {
      name: 'settled-shallow-baseline',
      durationMs: 4200,
      inputDescription: 'teleportToReachableDepth(180), no keys',
      capture: true,
      captureName: 'settled-shallow-baseline-canvas',
      setup: async () => {
        await command(page, 'teleportToReachableDepth', 180);
      },
    }));

    scenarios.push(await measureScenario(page, {
      name: 'shallow-continuous-swim',
      durationMs: 4600,
      inputDescription: 'teleportToReachableDepth(180), hold ArrowRight',
      capture: true,
      captureName: 'shallow-continuous-swim-canvas',
      setup: async () => {
        await command(page, 'teleportToReachableDepth', 180);
      },
      inputPath: async () => holdKeys(page, ['ArrowRight'], 4600),
    }));

    scenarios.push(await measureScenario(page, {
      name: 'mid-depth-continuous-swim',
      durationMs: 4600,
      inputDescription: 'teleportToReachableDepth(780), hold ArrowRight',
      capture: true,
      captureName: 'mid-depth-continuous-swim-canvas',
      setup: async () => {
        await command(page, 'teleportToReachableDepth', 780);
      },
      inputPath: async () => holdKeys(page, ['ArrowRight'], 4600),
    }));

    scenarios.push(await measureScenario(page, {
      name: 'deep-continuous-swim',
      durationMs: 4600,
      inputDescription: 'teleportToReachableDepth(1500), hold ArrowRight',
      capture: true,
      captureName: 'deep-continuous-swim-canvas',
      setup: async () => {
        await command(page, 'teleportToReachableDepth', 1500);
      },
      inputPath: async () => holdKeys(page, ['ArrowRight'], 4600),
    }));

    scenarios.push(await measureScenario(page, {
      name: 'deep-diagonal-multikey-swim',
      durationMs: 5200,
      inputDescription: 'teleportToReachableDepth(1500), hold ArrowRight+ArrowDown',
      capture: true,
      captureName: 'deep-diagonal-multikey-swim-canvas',
      setup: async () => {
        await command(page, 'teleportToReachableDepth', 1500);
      },
      inputPath: async () => holdKeys(page, ['ArrowRight', 'ArrowDown'], 5200),
    }));

    scenarios.push(await measureScenario(page, {
      name: 'sonar-minimap-closed-normal-swim',
      durationMs: 4600,
      inputDescription: 'select drill, teleportToReachableDepth(420), sonar chart closed, hold ArrowRight',
      capture: false,
      setup: async () => {
        await command(page, 'selectTool', 'drill');
        await command(page, 'teleportToReachableDepth', 420);
        await page.keyboard.press('Escape');
      },
      inputPath: async () => holdKeys(page, ['ArrowRight'], 4600),
    }));

    scenarios.push(await measureScenario(page, {
      name: 'sonar-chart-open-after-movement',
      durationMs: 5600,
      inputDescription: 'move at 420m, select sonar, press KeyM to open chart, hold ArrowRight+ArrowDown and KeyE pulse',
      capture: true,
      captureName: 'sonar-chart-open-after-movement-canvas',
      setup: async () => {
        await command(page, 'teleportToReachableDepth', 420);
        await holdKeys(page, ['ArrowRight'], 900);
        await command(page, 'selectTool', 'sonar');
        await page.keyboard.press('KeyM');
        await page.evaluate(() => {
          if (window.__AQUA_PLAYTEST__?.snapshot?.()?.ui?.sonarMapOpen) return;
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM', key: 'm', bubbles: true, cancelable: true }));
        });
        await page.locator('.sonar-map-overlay.is-open #big-sonar-map').waitFor({ timeout: 5000 });
      },
      inputPath: async () => {
        await page.keyboard.down('ArrowRight');
        await page.keyboard.down('ArrowDown');
        await sleep(2400);
        await page.keyboard.up('ArrowRight');
        await page.keyboard.up('ArrowDown');
        await page.keyboard.down('KeyE');
        await sleep(1400);
        await page.keyboard.up('KeyE');
        await sleep(1800);
      },
    }));

    scenarios.push(await measureScenario(page, {
      name: 'mining-terrain-dirty-movement',
      durationMs: 5000,
      inputDescription: 'selectedToolSmokeStage terrain, select drill, terrainMineAt target repeats=10, hold ArrowRight',
      capture: true,
      captureName: 'mining-terrain-dirty-movement-canvas',
      setup: async () => {
        await page.keyboard.press('Escape');
        await command(page, 'selectedToolSmokeStage', { mode: 'terrain' });
        await command(page, 'selectTool', 'drill');
      },
      inputPath: async () => {
        const snap = await snapshot(page);
        const target = snap?.player ? { worldX: snap.player.x + 42, worldY: snap.player.y + 12, repeats: 10 } : { repeats: 10 };
        await command(page, 'terrainMineAt', target);
        await holdKeys(page, ['ArrowRight'], 5000);
      },
    }));

    const busyErrors = [];
    const busy = await setupStartedPage(browser, baseUrl, 4, busyErrors);
    scenarios.push(await measureScenario(busy.page, {
      name: 'visually-busy-high-entity-deep-area',
      durationMs: 5200,
      inputDescription: 'biome=4, teleportToReachableDepth(1650), teleportToArticulated if available, hold ArrowRight+ArrowDown',
      capture: true,
      captureName: 'busy-high-entity-deep-area-canvas',
      setup: async () => {
        await command(busy.page, 'teleportToReachableDepth', 1650);
        await command(busy.page, 'teleportToArticulated', {});
      },
      inputPath: async () => holdKeys(busy.page, ['ArrowRight', 'ArrowDown'], 5200),
    }));
    await busy.page.close();
    await page.close();
    errors.push(...pageErrors, ...busyErrors);
    scenarios.forEach((scenario) => {
      scenario.url = scenario.url || url;
    });
  } finally {
    await browser.close().catch(() => {});
  }
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await new Promise((resolveExit) => server.once('exit', resolveExit));
  }
}

const worstScenarios = [loading, ...scenarios]
  .filter(Boolean)
  .map((scenario) => ({
    name: scenario.name,
    samples: scenario.raf.summary.samples,
    p95Ms: scenario.raf.summary.p95Ms,
    p99Ms: scenario.raf.summary.p99Ms,
    maxMs: scenario.raf.summary.maxMs,
    over20Pct: scenario.raf.summary.over20.pct,
    over33_34Pct: scenario.raf.summary.over33_34.pct,
    perfFrameP95Ms: scenario.after?.perfFrameSummary?.raf?.p95Ms ?? null,
    drawWorldMaxMs: scenario.after?.perf?.['draw.world']?.maxMs ?? null,
    drawBigSonarMapMaxMs: scenario.after?.perf?.['draw.bigSonarMap']?.maxMs ?? null,
    updateFishMaxMs: scenario.after?.perf?.['update.fish']?.maxMs ?? null,
    drawFishMaxMs: scenario.after?.perf?.['draw.fish']?.maxMs ?? null,
    maxDirtyChunks: scenario.after?.perfFrameSummary?.maxDirtyChunks ?? null,
    maxDirtyTiles: scenario.after?.perfFrameSummary?.maxDirtyTiles ?? null,
    longTasks: scenario.after?.longTasks?.length ?? 0,
  }))
  .sort((a, b) => b.p95Ms - a.p95Ms || b.maxMs - a.maxMs);

const finalReport = {
  ok: errors.length === 0,
  startedAt: new Date().toISOString(),
  port,
  baseUrl,
  viewport,
  loading,
  scenarios,
  worstScenarios,
  errors,
  serverLogs: serverLogs.slice(-40),
};

await writeFile(reportPath, `${JSON.stringify(finalReport, null, 2)}\n`);

if (errors.length) {
  console.error(JSON.stringify({ ok: false, reportPath, errors, worstScenarios }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, reportPath, worstScenarios: worstScenarios.slice(0, 6) }, null, 2));

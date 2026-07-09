import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const runDir = '/mnt/nxt-dev/water9/runs/water9-adversarial-60fps-appraisal-2026-07-09';
const rawPath = `${runDir}/adversarial-60fps-results.json`;
const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_60FPS_PORT ?? 5180);
const viewport = { width: 1280, height: 800 };
const deviceScaleFactor = 1;

await mkdir(runDir, { recursive: true });

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

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
    ...Array.from({ length: Math.max(0, 5200 - requestedPort) }, (_, index) => requestedPort + index),
    ...Array.from({ length: Math.max(0, requestedPort - 5180) }, (_, index) => 5180 + index),
  ].filter((port) => port >= 5180 && port <= 5199);
  for (const port of candidates) {
    if (await portAvailable(port)) return port;
  }
  throw new Error('no free dev/smoke port in 5180-5199');
}

const port = process.env.PLAYTEST_URL ? 0 : await choosePort();
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}`;
let server = null;
const serverLogs = [];

if (!process.env.PLAYTEST_URL) {
  server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
  server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));
}

async function waitForServer(url, timeoutMs = 30000) {
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

function scenarioUrl(biome) {
  const url = new URL(baseUrl);
  url.searchParams.set('playtest', '1');
  url.searchParams.set('biome', String(biome));
  url.searchParams.set('perf', '1');
  url.searchParams.set('perfHud', '0');
  return url.toString();
}

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function command(page, name, value) {
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null, [name, value]);
}

async function waitForPlaytest(page) {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false);
  }, null, { timeout: 25000 });
}

async function dismissRadio(page) {
  for (let i = 0; i < 10; i += 1) {
    const snap = await snapshot(page);
    if (!snap?.ui?.radioOpen) return;
    await page.keyboard.press('Enter');
    await sleep(80);
  }
  await command(page, 'clearProofOverlays');
}

async function settle(page, ms = 1200) {
  await sleep(ms);
  await command(page, 'refill');
  await page.evaluate(() => document.querySelector('#game canvas')?.getBoundingClientRect().toJSON?.() ?? null);
}

async function startRunAtDepth(page, scenario) {
  const url = scenarioUrl(scenario.biome);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForPlaytest(page);
  await command(page, 'start');
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false && !snap?.ui?.biomeLoading?.active);
  }, null, { timeout: 25000 });
  await dismissRadio(page);
  await command(page, 'maxUpgrades');
  await command(page, 'refill');
  await command(page, 'dive');
  await command(page, 'clearProofOverlays');
  let setupResult = null;
  if (scenario.setupCommand) setupResult = await command(page, scenario.setupCommand.name, scenario.setupCommand.value);
  if (Number.isFinite(scenario.depthMeters)) {
    setupResult = await command(page, 'teleportToReachableDepth', scenario.depthMeters);
  }
  await command(page, 'centerCameraOnPlayer');
  await command(page, 'refill');
  await settle(page, scenario.settleMs ?? 1400);
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('#game canvas');
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      exists: true,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      backingWidth: canvas.width,
      backingHeight: canvas.height,
    };
  });
  return { url, setupResult, canvasInfo };
}

async function startRafProbe(page, durationMs) {
  await page.evaluate((duration) => {
    window.__water9AdversarialRafProbe = {
      frames: [],
      startedAt: performance.now(),
      durationMs: duration,
      complete: false,
    };
    let last = performance.now();
    function tick(now) {
      const delta = now - last;
      last = now;
      window.__water9AdversarialRafProbe.frames.push(delta);
      if (now - window.__water9AdversarialRafProbe.startedAt < duration) requestAnimationFrame(tick);
      else window.__water9AdversarialRafProbe.complete = true;
    }
    requestAnimationFrame(tick);
  }, durationMs);
}

function summarizeFrames(frames) {
  const sorted = [...frames].sort((a, b) => a - b);
  const pct = (p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] : 0;
  const avg = frames.length ? frames.reduce((sum, frame) => sum + frame, 0) / frames.length : 0;
  const countOver = (threshold) => frames.filter((frame) => frame > threshold).length;
  const percentage = (count) => frames.length ? (count / frames.length) * 100 : 0;
  const over1667 = countOver(16.67);
  const over20 = countOver(20);
  const over3334 = countOver(33.34);
  const over50 = countOver(50);
  return {
    samples: frames.length,
    avg: round(avg),
    p50: round(pct(0.5)),
    p95: round(pct(0.95)),
    p99: round(pct(0.99)),
    max: round(sorted.at(-1) ?? 0),
    over16_67: over1667,
    over16_67Pct: round(percentage(over1667)),
    over20,
    over20Pct: round(percentage(over20)),
    over33_34: over3334,
    over33_34Pct: round(percentage(over3334)),
    over50,
    over50Pct: round(percentage(over50)),
  };
}

async function finishRafProbe(page) {
  await page.waitForFunction(() => window.__water9AdversarialRafProbe?.complete, null, { timeout: 45000 });
  return page.evaluate(() => {
    const probe = window.__water9AdversarialRafProbe;
    return {
      durationMs: Math.round(performance.now() - (probe?.startedAt ?? performance.now())),
      frames: probe?.frames ?? [],
    };
  });
}

async function holdKeys(page, keys, durationMs) {
  for (const key of keys) await page.keyboard.down(key);
  await sleep(durationMs);
  for (const key of [...keys].reverse()) await page.keyboard.up(key);
}

async function runInputPath(page, scenario) {
  if (scenario.kind === 'idle') {
    await sleep(scenario.durationMs);
    return;
  }
  if (scenario.kind === 'path') {
    for (const step of scenario.path) {
      await holdKeys(page, step.keys, step.ms);
      if (step.pauseMs) await sleep(step.pauseMs);
    }
    const remaining = scenario.durationMs - scenario.path.reduce((sum, step) => sum + step.ms + (step.pauseMs ?? 0), 0);
    if (remaining > 0) await sleep(remaining);
    return;
  }
  if (scenario.kind === 'sonar-map') {
    for (const step of scenario.preMovePath ?? []) await holdKeys(page, step.keys, step.ms);
    await page.keyboard.press('KeyM');
    await page.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.()?.ui?.sonarMapOpen === true, null, { timeout: 5000 });
    await holdKeys(page, ['ArrowRight', 'ArrowDown'], Math.floor(scenario.durationMs * 0.55));
    await holdKeys(page, ['KeyE'], Math.floor(scenario.durationMs * 0.2));
    await holdKeys(page, ['ArrowLeft', 'ArrowUp'], Math.floor(scenario.durationMs * 0.2));
    await sleep(Math.max(0, scenario.durationMs * 0.05));
    return;
  }
  if (scenario.kind === 'mining') {
    const start = Date.now();
    await command(page, 'terrainMineAt', { repeats: 4 });
    const driver = holdKeys(page, ['ArrowRight'], scenario.durationMs);
    while (Date.now() - start < scenario.durationMs - 250) {
      await sleep(650);
      await command(page, 'terrainMineAt', { repeats: 3 });
    }
    await driver;
    return;
  }
  await sleep(scenario.durationMs);
}

function importantSnapshot(snap) {
  const metrics = snap?.perf?.metrics ?? {};
  return {
    state: {
      biome: snap?.state?.biome ?? null,
      biomeName: snap?.state?.biomeName ?? null,
      depth: snap?.state?.depth ?? null,
      started: snap?.state?.started ?? null,
      docked: snap?.state?.docked ?? null,
      atBoat: snap?.state?.atBoat ?? null,
      fuel: snap?.state?.fuel ?? null,
      oxygen: snap?.state?.oxygen ?? null,
    },
    ui: {
      sonarMapOpen: snap?.ui?.sonarMapOpen ?? null,
      radioOpen: snap?.ui?.radioOpen ?? null,
      biomeLoading: snap?.ui?.biomeLoading ?? null,
      terrainBreakEffects: snap?.ui?.terrainBreakEffects ?? null,
      sonarPings: snap?.ui?.sonarPings ?? null,
    },
    player: snap?.player ?? null,
    camera: snap?.camera ?? null,
    entityCounts: {
      fish: snap?.fish?.length ?? 0,
      visibleFish: snap?.fish?.filter((fish) => fish.screenVisible).length ?? 0,
      hostileFish: snap?.fish?.filter((fish) => fish.hostile).length ?? 0,
      articulated: snap?.articulatedCreatures?.length ?? 0,
      articulatedParts: snap?.articulatedCreatures?.reduce((sum, creature) => sum + (creature.parts?.length ?? 0), 0) ?? 0,
      flora: snap?.floraAnchors?.gameplay?.length ?? 0,
      hazards: snap?.hazards?.length ?? 0,
      looseItems: snap?.looseItems?.length ?? 0,
      specialRooms: snap?.specialRooms?.length ?? 0,
    },
    lighting: {
      darkness: snap?.environmentVisualProfile?.darkness ?? null,
      activeBand: snap?.environmentVisualProfile?.activeBand ?? null,
      waterColumnVisibleCount: snap?.environmentVisualProfile?.waterColumnLayers?.visibleCount ?? null,
      anchorVisibleCount: snap?.environmentVisualProfile?.anchors?.visibleCount ?? null,
    },
    perf: {
      enabled: snap?.perf?.enabled ?? false,
      frame: snap?.perf?.frame ?? 0,
      terrainDirtyReason: snap?.perf?.terrainDirtyReason ?? '',
      terrainMaskMutations: snap?.perf?.terrainMaskMutations ?? 0,
      terrainContactSamples: snap?.perf?.terrainContactSamples ?? 0,
      propRefresh: snap?.perf?.propRefresh ?? null,
      selectedMetrics: Object.fromEntries(INTERESTING_METRICS.map((key) => [key, metrics[key] ?? null])),
      topAvgMetrics: topMetrics(metrics, 'avgMs', 12),
      topMaxMetrics: topMetrics(metrics, 'maxMs', 12),
    },
  };
}

function metricDeltas(before, after) {
  const beforeMetrics = before?.perf?.metrics ?? {};
  const afterMetrics = after?.perf?.metrics ?? {};
  const keys = [...new Set([...Object.keys(beforeMetrics), ...Object.keys(afterMetrics), ...INTERESTING_METRICS])].sort();
  const deltas = {};
  for (const key of keys) {
    const b = beforeMetrics[key];
    const a = afterMetrics[key];
    if (!a && !b) continue;
    deltas[key] = {
      samplesDelta: (a?.samples ?? 0) - (b?.samples ?? 0),
      before: b ?? null,
      after: a ?? null,
    };
  }
  return deltas;
}

function topMetrics(metrics, field, limit) {
  return Object.values(metrics)
    .filter((metric) => Number.isFinite(metric?.[field]))
    .sort((a, b) => b[field] - a[field])
    .slice(0, limit)
    .map((metric) => ({
      key: metric.key,
      samples: metric.samples,
      avgMs: metric.avgMs,
      maxMs: metric.maxMs,
      lastMs: metric.lastMs,
      context: metric.context ?? {},
    }));
}

const INTERESTING_METRICS = [
  'frame.total',
  'update.total',
  'draw.total',
  'draw.world',
  'draw.parallax',
  'draw.waterColumn',
  'draw.backgroundAnchors',
  'draw.props',
  'draw.terrainBreakEffects',
  'update.fish',
  'draw.fish',
  'update.articulated',
  'draw.articulated',
  'update.sub',
  'draw.sub',
  'draw.darkness',
  'draw.sonarMap',
  'draw.bigSonarMap',
  'worldgen.total',
];

const scenarios = [
  {
    id: 'shallow-settled-baseline',
    label: 'Start/settled shallow gameplay baseline after loading',
    biome: 1,
    depthMeters: 180,
    durationMs: 9000,
    kind: 'idle',
    movement: 'idle after start, dive, reachable shallow teleport, overlays closed',
  },
  {
    id: 'shallow-continuous-swim',
    label: 'Shallow continuous swim with diver movement',
    biome: 1,
    depthMeters: 260,
    durationMs: 10000,
    kind: 'path',
    movement: 'ArrowRight, ArrowDown, ArrowLeft, ArrowUp loop with short turns',
    path: [
      { keys: ['ArrowRight'], ms: 2200 },
      { keys: ['ArrowDown'], ms: 2200 },
      { keys: ['ArrowLeft'], ms: 2200 },
      { keys: ['ArrowUp'], ms: 2200 },
    ],
  },
  {
    id: 'mid-depth-continuous-swim',
    label: 'Mid-depth continuous swim',
    biome: 2,
    depthMeters: 780,
    durationMs: 10000,
    kind: 'path',
    movement: 'ArrowRight/ArrowDown/ArrowLeft/ArrowUp at biome 2 mid-depth',
    path: [
      { keys: ['ArrowRight'], ms: 2500 },
      { keys: ['ArrowDown'], ms: 2500 },
      { keys: ['ArrowLeft'], ms: 2500 },
      { keys: ['ArrowUp'], ms: 1500 },
    ],
  },
  {
    id: 'deep-continuous-swim',
    label: 'Deep continuous swim',
    biome: 3,
    depthMeters: 1360,
    durationMs: 10000,
    kind: 'path',
    movement: 'ArrowRight/ArrowDown/ArrowLeft/ArrowUp at biome 3 deep water',
    path: [
      { keys: ['ArrowRight'], ms: 2500 },
      { keys: ['ArrowDown'], ms: 2500 },
      { keys: ['ArrowLeft'], ms: 2500 },
      { keys: ['ArrowUp'], ms: 1500 },
    ],
  },
  {
    id: 'deep-diagonal-multikey-swim',
    label: 'Diagonal sustained multi-key swim',
    biome: 3,
    depthMeters: 1420,
    durationMs: 10000,
    kind: 'path',
    movement: 'ArrowRight+ArrowDown, ArrowRight+ArrowUp, ArrowLeft+ArrowDown, ArrowLeft+ArrowUp',
    path: [
      { keys: ['ArrowRight', 'ArrowDown'], ms: 2500 },
      { keys: ['ArrowRight', 'ArrowUp'], ms: 2500 },
      { keys: ['ArrowLeft', 'ArrowDown'], ms: 2500 },
      { keys: ['ArrowLeft', 'ArrowUp'], ms: 1500 },
    ],
  },
  {
    id: 'sonar-closed-normal-swim',
    label: 'Sonar/minimap closed normal swim',
    biome: 2,
    depthMeters: 720,
    durationMs: 9000,
    kind: 'path',
    movement: 'Sonar map closed; ArrowRight and ArrowLeft swim',
    path: [
      { keys: ['ArrowRight'], ms: 4000 },
      { keys: ['ArrowLeft'], ms: 4000 },
    ],
  },
  {
    id: 'sonar-map-open-pan-after-movement',
    label: 'Sonar map open while moving/panning after movement',
    biome: 2,
    depthMeters: 760,
    durationMs: 9000,
    kind: 'sonar-map',
    movement: 'Move briefly, press M to open sonar map, hold pan/zoom keys',
    preMovePath: [
      { keys: ['ArrowRight', 'ArrowDown'], ms: 1200 },
    ],
  },
  {
    id: 'mining-terrain-dirty-movement',
    label: 'Mining/terrain-dirty movement',
    biome: 1,
    durationMs: 9000,
    kind: 'mining',
    movement: 'terrainMiningReview staging, repeated terrainMineAt calls while holding ArrowRight',
    setupCommand: { name: 'terrainMiningReview', value: { stage: 'intact' } },
  },
  {
    id: 'busy-high-entity-deep-area',
    label: 'Visually busy/high-entity deep area',
    biome: 3,
    depthMeters: 1280,
    durationMs: 10000,
    kind: 'path',
    movement: 'Biome 3 generated deep area with natural fish/articulated actors, diagonal swim',
    path: [
      { keys: ['ArrowRight', 'ArrowDown'], ms: 2500 },
      { keys: ['ArrowLeft', 'ArrowDown'], ms: 2500 },
      { keys: ['ArrowRight', 'ArrowUp'], ms: 2500 },
      { keys: ['ArrowLeft', 'ArrowUp'], ms: 1500 },
    ],
  },
];

function round(value) {
  return Math.round(value * 100) / 100;
}

function scenarioPass(summary) {
  return summary.p95 <= 20 && summary.p99 <= 33.34 && summary.over50 <= 1;
}

const errors = [];
const browserConsole = [];
const results = {
  status: 'running',
  startedAt: new Date().toISOString(),
  baseUrl,
  port,
  viewport,
  deviceScaleFactor,
  userAgent: '',
  scenarios: [],
  errors,
  serverLogs,
};

try {
  if (server) await waitForServer(baseUrl);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const scenario of scenarios) {
      const page = await browser.newPage({ viewport, deviceScaleFactor });
      if (!results.userAgent) results.userAgent = await page.evaluate(() => navigator.userAgent);
      page.on('pageerror', (error) => errors.push({ scenario: scenario.id, type: 'pageerror', text: error.message }));
      page.on('console', (message) => {
        const text = message.text();
        browserConsole.push({ scenario: scenario.id, type: message.type(), text });
        if (message.type() === 'error' && !text.startsWith('Texture key already in use:')) {
          errors.push({ scenario: scenario.id, type: 'console', text });
        }
      });
      page.on('response', (response) => {
        if (response.status() >= 400) errors.push({ scenario: scenario.id, type: 'response', status: response.status(), url: response.url() });
      });

      const scenarioStartedAt = Date.now();
      let record = { id: scenario.id, label: scenario.label, ok: false };
      try {
        const setup = await startRunAtDepth(page, scenario);
        const before = await snapshot(page);
        await startRafProbe(page, scenario.durationMs);
        await runInputPath(page, scenario);
        const probe = await finishRafProbe(page);
        const after = await snapshot(page);
        const raf = summarizeFrames(probe.frames);
        record = {
          id: scenario.id,
          label: scenario.label,
          ok: scenarioPass(raf),
          url: setup.url,
          viewport,
          deviceScaleFactor,
          durationMs: scenario.durationMs,
          elapsedMs: Date.now() - scenarioStartedAt,
          movement: scenario.movement,
          setupResult: setup.setupResult,
          canvas: setup.canvasInfo,
          raf,
          rawFrameDeltasMs: probe.frames.map((frame) => round(frame)),
          perfBefore: importantSnapshot(before),
          perfAfter: importantSnapshot(after),
          perfMetricDeltas: metricDeltas(before, after),
        };
      } catch (error) {
        record = {
          ...record,
          ok: false,
          error: error?.stack ?? String(error),
          elapsedMs: Date.now() - scenarioStartedAt,
        };
        errors.push({ scenario: scenario.id, type: 'exception', text: record.error });
      } finally {
        results.scenarios.push(record);
        await page.close();
        await writeFile(rawPath, `${JSON.stringify({ ...results, browserConsole: browserConsole.slice(-200) }, null, 2)}\n`);
      }
    }
  } finally {
    await browser.close();
  }
  results.status = errors.length ? 'completed-with-errors' : 'completed';
  results.completedAt = new Date().toISOString();
  results.browserConsole = browserConsole.slice(-200);
  await writeFile(rawPath, `${JSON.stringify(results, null, 2)}\n`);
} finally {
  if (server) server.kill('SIGTERM');
}

const failed = results.scenarios.filter((scenario) => !scenario.ok);
console.log(`Water9 adversarial 60fps appraisal completed: ${results.scenarios.length} scenarios, ${failed.length} not steady by p95/p99/long-frame threshold.`);
for (const scenario of results.scenarios) {
  const raf = scenario.raf;
  console.log(`${scenario.id}: p95 ${raf?.p95}ms p99 ${raf?.p99}ms max ${raf?.max}ms >50ms ${raf?.over50 ?? '?'} (${raf?.over50Pct ?? '?'}%)`);
}
console.log(`Raw results: ${rawPath}`);

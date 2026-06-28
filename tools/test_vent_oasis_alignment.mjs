import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.VENT_OASIS_OUT_DIR ?? '/home/orlovboros/projects/manager/runs';
const reportPath = process.env.VENT_OASIS_REPORT ?? `${outDir}/water9-vent-oasis-alignment-smoke-2026-06-27.json`;
const host = '127.0.0.1';
const port = Number(process.env.VENT_OASIS_PORT ?? 5188);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=3`;

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

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function waitForBiome(page, biome) {
  const deadline = Date.now() + 30000;
  let lastState = null;
  while (Date.now() < deadline) {
    lastState = await page.evaluate((targetBiome) => {
      const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
      return {
        hasSnapshot: Boolean(snap),
        biome: snap?.state?.biome ?? null,
        worldReady: snap?.world?.ready ?? null,
        matches: snap?.world?.ready !== false && snap?.state?.biome === targetBiome,
      };
    }, biome);
    if (lastState.matches) return;
    await sleep(250);
  }
  throw new Error(`playtest biome ${biome} was not ready within 30000ms; last state ${JSON.stringify(lastState)}`);
}

async function waitForPlaytestApi(page) {
  try {
    await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 10000 });
  } catch {
    await page.reload({ waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 10000 });
  }
}

function nearestOxygenBloom(room, flora) {
  let best = null;
  for (const candidate of flora) {
    if (candidate.dead || candidate.species !== 'Oxygen Bloom') continue;
    const dx = candidate.x - room.effectX;
    const dy = candidate.y - room.effectY;
    const distance = Math.hypot(dx, dy);
    if (!best || distance < best.distance) best = { ...candidate, distance };
  }
  return best;
}

if (server) await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() !== 'error') return;
  if (message.text().startsWith('Texture key already in use:')) return;
  errors.push({ type: 'console', text: message.text() });
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
});

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 20000 });
  await waitForPlaytestApi(page);
  await waitForBiome(page, 3);

  const snap = await snapshot(page);
  const hazards = snap?.hazards ?? [];
  const flora = snap?.floraAnchors?.gameplay ?? [];
  const biolumeRooms = (snap?.specialRooms ?? []).filter((room) => room.kind === 'biolume');
  const unsupportedVents = hazards.filter((hazard) => !hazard.supported || hazard.fakeOpenWaterAnchor || hazard.anchorSource !== 'terrain-mask');
  const maxHalfRadius = 58 * 0.5 * 0.72;
  const minHalfRadius = 34 * 0.5 * 0.72;
  const oversizedVents = hazards.filter((hazard) => hazard.radius > maxHalfRadius + 0.75);
  const undersizedVents = hazards.filter((hazard) => hazard.radius < minHalfRadius - 0.75);

  if (!hazards.length) fail('biome 3 generated no steam vents');
  if (unsupportedVents.length) fail(`${unsupportedVents.length} steam vents lacked valid terrain-edge support`);
  if (oversizedVents.length) fail(`${oversizedVents.length} steam vents exceeded the halved maximum radius ${maxHalfRadius.toFixed(2)}`);
  if (undersizedVents.length) fail(`${undersizedVents.length} steam vents fell below the halved minimum radius ${minHalfRadius.toFixed(2)}`);
  if (!biolumeRooms.length) fail('biome 3 generated no biolume room');

  const oasisChecks = biolumeRooms.map((room) => ({
    room,
    nearestOxygenBloom: nearestOxygenBloom(room, flora),
  }));
  const uncenteredOases = oasisChecks.filter((check) => !check.nearestOxygenBloom || check.nearestOxygenBloom.distance > 1.5);
  if (uncenteredOases.length) fail(`${uncenteredOases.length} biolume effect centers were not aligned to an Oxygen Bloom body`);

  const report = {
    schema: 'water9/vent-oasis-alignment-smoke@1',
    generatedAt: new Date().toISOString(),
    url: baseUrl,
    passed: errors.length === 0,
    errors,
    biome: snap?.state?.biome ?? null,
    seed: snap?.seed ?? null,
    counts: {
      hazards: hazards.length,
      unsupportedVents: unsupportedVents.length,
      oversizedVents: oversizedVents.length,
      undersizedVents: undersizedVents.length,
      biolumeRooms: biolumeRooms.length,
      uncenteredOases: uncenteredOases.length,
    },
    radiusExpectation: {
      oldUnscaledRange: [34, 58],
      scale: 0.72,
      expectedHalvedRange: [minHalfRadius, maxHalfRadius],
      actualRange: [
        Math.min(...hazards.map((hazard) => hazard.radius)),
        Math.max(...hazards.map((hazard) => hazard.radius)),
      ],
    },
    sampleVents: hazards.slice(0, 6),
    oasisChecks,
    serverLogs: serverLogs.join('').slice(-4000),
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  server?.kill('SIGTERM');
  process.exit(errors.length === 0 ? 0 : 1);
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  const report = {
    schema: 'water9/vent-oasis-alignment-smoke@1',
    generatedAt: new Date().toISOString(),
    url: baseUrl,
    passed: false,
    errors,
    serverLogs: serverLogs.join('').slice(-4000),
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close().catch(() => {});
  server?.kill('SIGTERM');
  process.exit(1);
}

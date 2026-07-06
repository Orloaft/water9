import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import net from 'node:net';
import { chromium } from 'playwright';

const outDir = process.env.FAUNA_BEHAVIOR_OUT_DIR ?? 'runs/water9-fauna-behavior-first-slice-2026-07-06';
const reportPath = process.env.FAUNA_BEHAVIOR_REPORT ?? `${outDir}/fauna-behavior-slice-metrics.json`;
const host = '127.0.0.1';
const requestedPort = Number(process.env.FAUNA_BEHAVIOR_PORT ?? 5188);
const useProvidedUrl = Boolean(process.env.PLAYTEST_URL);
let port = requestedPort;
let baseUrl = process.env.PLAYTEST_URL ?? '';

await mkdir(outDir, { recursive: true });

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function portAvailable(candidate) {
  return new Promise((resolvePort) => {
    const server = net.createServer();
    server.once('error', () => resolvePort(false));
    server.once('listening', () => {
      server.close(() => resolvePort(true));
    });
    server.listen(candidate, host);
  });
}

async function pickPort() {
  if (await portAvailable(requestedPort)) return requestedPort;
  for (let candidate = 5180; candidate <= 5199; candidate += 1) {
    if (await portAvailable(candidate)) return candidate;
  }
  throw new Error('no available proof port in 5180-5199');
}

let server = null;
const serverLogs = [];
if (!useProvidedUrl) {
  port = await pickPort();
  baseUrl = `http://${host}:${port}/?playtest=1`;
  server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
  server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));
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

const targets = [
  { biome: 1, species: 'Nacre Thorn Clam', expected: 'sessileAttached' },
  { biome: 1, species: 'Glimmer Spine Urchin', expected: 'sessileAttached', proximity: true },
  { biome: 1, species: 'Shellback Garden Eel', expected: 'verticalAnchored' },
  { biome: 1, species: 'Silver Hinge Crab', expected: 'benthicWalker' },
  { biome: 1, species: 'Mantis Shrimp', expected: 'benthicWalker' },
  { biome: 2, species: 'Cinder Vent Clingfish', expected: 'sessileAttached' },
  { biome: 2, species: 'Tripodfish', expected: 'verticalAnchored' },
  { biome: 2, species: 'Sea Spider', expected: 'benthicWalker' },
  { biome: 2, species: 'Tin Plate Searobin', expected: 'benthicWalker' },
];

const errors = [];
const captures = [];

function fail(text) {
  errors.push({ type: 'assertion', text });
}

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function firstTarget(review, species) {
  return review?.targets?.find((target) => target.species === species) ?? null;
}

if (server) await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ type: 'console', text: message.text() });
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
});

async function command(name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => (
    window.__AQUA_PLAYTEST__?.command?.(commandName, commandValue) ?? null
  ), [name, value]);
  await page.waitForTimeout(140);
  return result;
}

async function waitReady() {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false && snap.fish?.length);
  }, null, { timeout: 12000 });
}

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 10000 });
  await command('start');
  await waitReady();

  let currentBiome = 1;
  for (const target of targets) {
    if (target.biome !== currentBiome) {
      await command('setBiome', target.biome);
      currentBiome = target.biome;
      await waitReady();
    }
    await command('clearProofOverlays');
    const teleport = await command('teleportToFauna', { species: target.species, distance: target.proximity ? 42 : 58 });
    await page.waitForTimeout(240);
    const initialReview = await command('faunaBehaviorReview', { species: target.species });
    const initial = firstTarget(initialReview, target.species);
    if (!teleport?.ok || !initial) {
      fail(`${target.species}: could not teleport/review target`);
      continue;
    }

    const waitMs = target.proximity ? 3100 : target.expected === 'benthicWalker' ? 1100 : 700;
    await page.waitForTimeout(waitMs);
    const finalReview = await command('faunaBehaviorReview', { species: target.species });
    const final = firstTarget(finalReview, target.species);
    const screenshotPath = `${outDir}/${slug(target.species)}-canvas.png`;
    await page.locator('#game canvas').screenshot({ path: screenshotPath });
    if (!final) {
      fail(`${target.species}: target disappeared before final review`);
      continue;
    }

    if (final.behaviorClass !== target.expected) fail(`${target.species}: expected ${target.expected}, got ${final.behaviorClass}`);
    if (!final.hasSurface || !final.supported || final.fallbackNoAnchor) fail(`${target.species}: missing supported terrain surface anchor`);
    if (!final.screenVisible) fail(`${target.species}: target was not visible on screen`);
    if (target.expected === 'sessileAttached') {
      const displacement = Math.hypot(final.x - initial.x, final.y - initial.y);
      if (displacement > 10) fail(`${target.species}: sessile displacement ${displacement.toFixed(2)}px exceeded 10px`);
      if (target.species === 'Glimmer Spine Urchin' && final.aggro > 0.2) fail('Glimmer Spine Urchin accumulated fish-style pursuit aggro');
      if (target.species === 'Glimmer Spine Urchin' && final.velocityMagnitude > 1.5) fail(`Glimmer Spine Urchin velocity ${final.velocityMagnitude}px/s indicates pursuit`);
    }
    if (target.expected === 'benthicWalker') {
      if (final.distanceFromSurface > 32) fail(`${target.species}: walker detached from terrain by ${final.distanceFromSurface}px`);
      if (final.velocityMagnitude > 1 && final.normalSpeed > final.tangentSpeed + 6) {
        fail(`${target.species}: walker motion was more normal than tangent`);
      }
    }
    if (target.expected === 'verticalAnchored') {
      const rootShift = Math.hypot(final.rootX - initial.rootX, final.rootY - initial.rootY);
      if (rootShift > 2) fail(`${target.species}: anchored root moved ${rootShift.toFixed(2)}px`);
    }

    captures.push({
      ...target,
      screenshotPath,
      waitMs,
      initial,
      final,
    });
  }

  const report = {
    schema: 'water9/fauna-behavior-slice@1',
    generatedAt: new Date().toISOString(),
    url: baseUrl,
    passed: errors.length === 0,
    errors,
    captures,
    serverLogs: serverLogs.join('').slice(-4000),
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  server?.kill('SIGTERM');
  process.exit(errors.length === 0 ? 0 : 1);
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  const report = {
    schema: 'water9/fauna-behavior-slice@1',
    generatedAt: new Date().toISOString(),
    url: baseUrl,
    passed: false,
    errors,
    captures,
    serverLogs: serverLogs.join('').slice(-4000),
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close().catch(() => {});
  server?.kill('SIGTERM');
  process.exit(1);
}

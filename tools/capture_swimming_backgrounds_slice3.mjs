import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { relative, resolve } from 'node:path';
import { chromium } from 'playwright';

const repo = process.cwd();
const outDir = process.env.WATER9_SLICE3_OUT_DIR
  ?? '/home/orlovboros/artifacts/managers/water9/swimming-backgrounds-full-implementation-2026-07-13/slice3';
const manifestPath = process.env.WATER9_SLICE3_MANIFEST
  ?? 'runs/swimming-backgrounds-full-implementation-2026-07-13/slice3-artifacts.json';
const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_SLICE3_PORT ?? 5188);
const viewport = { width: 1440, height: 900 };
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: repo, encoding: 'utf8' }).trim();
const directions = [
  { id: 'east', keys: ['KeyD'] },
  { id: 'southeast', keys: ['KeyS', 'KeyD'] },
  { id: 'south', keys: ['KeyS'] },
  { id: 'southwest', keys: ['KeyS', 'KeyA'] },
  { id: 'west', keys: ['KeyA'] },
  { id: 'northwest', keys: ['KeyW', 'KeyA'] },
  { id: 'north', keys: ['KeyW'] },
  { id: 'northeast', keys: ['KeyW', 'KeyD'] },
];

await mkdir(outDir, { recursive: true });
await mkdir(resolve(outDir, 'directions'), { recursive: true });
await mkdir(resolve(outDir, 'motion-sequence'), { recursive: true });
await mkdir(resolve(outDir, 'bands'), { recursive: true });

async function portAvailable(port) {
  return new Promise((done) => {
    const probe = net.createServer();
    probe.once('error', () => done(false));
    probe.once('listening', () => probe.close(() => done(true)));
    probe.listen(port, host);
  });
}

async function choosePort() {
  const ports = Array.from({ length: 20 }, (_, index) => 5180 + index)
    .sort((a, b) => Math.abs(a - requestedPort) - Math.abs(b - requestedPort));
  for (const port of ports) if (await portAvailable(port)) return port;
  throw new Error('no free Slice 3 capture port in 5180-5199');
}

const port = await choosePort();
const baseUrl = `http://${host}:${port}/`;
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: repo,
  stdio: ['ignore', 'pipe', 'pipe'],
});
const serverLogs = [];
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {}
    await sleep(120);
  }
  throw new Error('Slice 3 capture server did not become ready');
}

async function command(page, name, value) {
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null, [name, value]);
}

async function telemetry(page) {
  return command(page, 'swimTelemetry');
}

async function waitForWorld(page) {
  await page.waitForFunction(() => {
    const value = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(value?.world?.ready !== false && !value?.ui?.biomeLoading?.active);
  }, null, { timeout: 25000 });
}

async function openRuntime(page, biome = 1, seed = 303) {
  await page.goto(`${baseUrl}?playtest=1&biome=${biome}&seed=${seed}&renderer=canvas`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.snapshot), null, { timeout: 20000 });
  await waitForWorld(page);
  await command(page, 'start');
  await command(page, 'clearProofOverlays');
  await command(page, 'setCameraLead', true);
}

async function stageOpenWater(page, depth = 400) {
  await command(page, 'clearProofOverlays');
  const result = await command(page, 'teleportToCutoffOpenWater', { boundaryDepth: depth, depthMeters: depth });
  if (!result?.ok) throw new Error(`open-water staging failed at ${depth}m: ${JSON.stringify(result)}`);
  await page.waitForTimeout(90);
  return result;
}

async function stageSwimLane(page, direction, depth = 400) {
  await command(page, 'clearProofOverlays');
  const x = (direction.keys.includes('KeyD') ? 1 : 0) - (direction.keys.includes('KeyA') ? 1 : 0);
  const y = (direction.keys.includes('KeyS') ? 1 : 0) - (direction.keys.includes('KeyW') ? 1 : 0);
  const result = await command(page, 'teleportToSwimLane', { x, y, depthMeters: depth });
  if (!result?.ok) throw new Error(`swim-lane staging failed for ${direction.id}: ${JSON.stringify(result)}`);
  await page.waitForTimeout(90);
  return result;
}

async function pressKeys(page, keys) {
  for (const key of keys) await page.keyboard.down(key);
}

async function releaseKeys(page, keys) {
  for (const key of [...keys].reverse()) await page.keyboard.up(key);
}

const entries = [];
const telemetryFrames = [];

async function recordCapture(page, relativePath, role, metadata = {}, target = 'canvas') {
  const absolutePath = resolve(outDir, relativePath);
  const sample = await telemetry(page);
  const locator = target === 'runtime' ? page.locator('.shell') : page.locator('#game canvas');
  await locator.screenshot({ path: absolutePath, type: 'png', animations: 'disabled' });
  telemetryFrames.push({ file: relativePath, role, target, telemetry: sample, ...metadata });
  entries.push({ relativePath, absolutePath, role, target, ...metadata });
  return sample;
}

let browser;
const runtimeErrors = [];
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.addInitScript(() => { window.__WATER9_SUPPRESS_CONTROLLER_STATUS__ = true; });
  page.on('pageerror', (error) => runtimeErrors.push({ type: 'pageerror', text: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
      runtimeErrors.push({ type: 'console', text: message.text() });
    }
  });
  await openRuntime(page, 1, 303);

  for (const direction of directions) {
    await stageSwimLane(page, direction, 400);
    await pressKeys(page, direction.keys);
    const accelerationCaptureMs = 90;
    await page.waitForTimeout(accelerationCaptureMs);
    const acceleration = await recordCapture(page, `directions/${direction.id}-acceleration-canvas.png`, 'eight-direction-acceleration', { direction, expectedPhase: 'acceleration' });
    await recordCapture(page, `directions/${direction.id}-acceleration-runtime.png`, 'eight-direction-acceleration-runtime', { direction, expectedPhase: 'acceleration' }, 'runtime');
    await page.waitForTimeout(Math.max(0, 660 - accelerationCaptureMs));
    const cruise = await recordCapture(page, `directions/${direction.id}-cruise-canvas.png`, 'eight-direction-cruise', { direction, expectedPhase: 'cruise' });
    await recordCapture(page, `directions/${direction.id}-cruise-runtime.png`, 'eight-direction-cruise-runtime', { direction, expectedPhase: 'cruise' }, 'runtime');
    await releaseKeys(page, direction.keys);
    await page.waitForTimeout(70);
    const coast = await recordCapture(page, `directions/${direction.id}-coast-canvas.png`, 'eight-direction-coast', { direction, expectedPhase: 'coast' });
    await recordCapture(page, `directions/${direction.id}-coast-runtime.png`, 'eight-direction-coast-runtime', { direction, expectedPhase: 'coast' }, 'runtime');
    const phases = [acceleration?.player?.motionIntent?.phase, cruise?.player?.motionIntent?.phase, coast?.player?.motionIntent?.phase];
    if (phases[0] !== 'acceleration' || phases[1] !== 'cruise' || phases[2] !== 'coast') {
      runtimeErrors.push({ type: 'capture-phase', text: `${direction.id} phases ${phases.join('/')}` });
    }
  }

  await stageSwimLane(page, directions[0], 400);
  await pressKeys(page, ['KeyD']);
  for (const [index, delay] of [0, 80, 80, 80, 80, 160].entries()) {
    if (delay) await page.waitForTimeout(delay);
    await recordCapture(page, `motion-sequence/acceleration-${String(index).padStart(2, '0')}.png`, 'motion-sequence-acceleration', { sequenceIndex: index });
  }
  await releaseKeys(page, ['KeyD']);
  await pressKeys(page, ['KeyA']);
  for (const [index, delay] of [0, 60, 60, 60, 60, 60].entries()) {
    if (delay) await page.waitForTimeout(delay);
    await recordCapture(page, `motion-sequence/reversal-${String(index).padStart(2, '0')}.png`, 'motion-sequence-reversal', { sequenceIndex: index });
  }
  await releaseKeys(page, ['KeyA']);
  for (const [index, delay] of [0, 60, 60, 60, 80, 140, 260].entries()) {
    if (delay) await page.waitForTimeout(delay);
    await recordCapture(page, `motion-sequence/release-settle-${String(index).padStart(2, '0')}.png`, 'motion-sequence-release-camera-settle', { sequenceIndex: index });
  }

  await stageSwimLane(page, directions[0], 400);
  await pressKeys(page, ['KeyD']);
  await page.waitForTimeout(650);
  await recordCapture(page, 'motion-sequence/no-lead-00-before.png', 'no-lead-before-disable', { leadEnabled: true });
  await command(page, 'setCameraLead', false);
  await recordCapture(page, 'motion-sequence/no-lead-01-immediate.png', 'no-lead-immediate-disable', { leadEnabled: false });
  await page.waitForTimeout(210);
  await recordCapture(page, 'motion-sequence/no-lead-02-settled.png', 'no-lead-settled', { leadEnabled: false });
  await releaseKeys(page, ['KeyD']);
  await command(page, 'setCameraLead', true);

  const bandScenarios = [
    { id: 'surface-b1-110m', biome: 1, seed: 101, depth: 110 },
    { id: 'mid-b2-760m', biome: 2, seed: 202, depth: 760 },
    { id: 'deep-b4-1450m', biome: 4, seed: 303, depth: 1450 },
  ];
  for (const scenario of bandScenarios) {
    await openRuntime(page, scenario.biome, scenario.seed);
    const staged = await stageOpenWater(page, scenario.depth);
    await pressKeys(page, ['KeyD']);
    await page.waitForTimeout(420);
    await recordCapture(page, `bands/${scenario.id}-color-canvas.png`, 'band-readability-color', { ...scenario, staged });
    await recordCapture(page, `bands/${scenario.id}-color-runtime.png`, 'band-readability-color-runtime', { ...scenario, staged }, 'runtime');
    await page.evaluate(() => { document.documentElement.style.filter = 'grayscale(1)'; });
    await recordCapture(page, `bands/${scenario.id}-grayscale-canvas.png`, 'band-readability-grayscale', { ...scenario, staged });
    await recordCapture(page, `bands/${scenario.id}-grayscale-runtime.png`, 'band-readability-grayscale-runtime', { ...scenario, staged }, 'runtime');
    await page.evaluate(() => { document.documentElement.style.filter = ''; });
    await releaseKeys(page, ['KeyD']);
  }

  const identity = await page.evaluate(() => ({
    title: document.title,
    canvasCount: document.querySelectorAll('#game canvas').length,
    hudVisible: Boolean(document.querySelector('.hud')),
    gameCanvasWidth: document.querySelector('#game canvas')?.width ?? 0,
    gameCanvasHeight: document.querySelector('#game canvas')?.height ?? 0,
    url: location.href,
  }));
  const evidence = {
    schema: 'water9/swimming-camera-runtime-evidence@1',
    generatedAt: new Date().toISOString(),
    provenance: {
      branch,
      head,
      renderer: 'Canvas forced by renderer=canvas',
      scene: 'DeepdiveScene normal play',
      viewport,
      identity,
      reviewHarness: false,
      backgroundReview: false,
    },
    frames: telemetryFrames,
    runtimeErrors,
  };
  await writeFile(resolve(outDir, 'runtime-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  entries.push({ relativePath: 'runtime-evidence.json', absolutePath: resolve(outDir, 'runtime-evidence.json'), role: 'synchronized-camera-player-telemetry', target: 'metadata' });

  for (const entry of entries) {
    const bytes = await readFile(entry.absolutePath);
    entry.bytes = bytes.length;
    entry.sha256 = createHash('sha256').update(bytes).digest('hex');
    delete entry.absolutePath;
  }
  const manifest = {
    schema: 'water9/swimming-backgrounds-slice3-artifacts@1',
    generatedAt: new Date().toISOString(),
    archiveRoot: outDir,
    provenance: {
      branch,
      productHeadAtCapture: head,
      source: 'normal-play DeepdiveScene #game canvas and viewport runtime captures',
      command: `node tools/capture_swimming_backgrounds_slice3.mjs`,
      port,
      viewport,
    },
    summary: {
      files: entries.length,
      bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
      directionCanvasFrames: entries.filter((entry) => entry.role.startsWith('eight-direction-') && entry.target === 'canvas').length,
      directionRuntimeFrames: entries.filter((entry) => entry.role.startsWith('eight-direction-') && entry.target === 'runtime').length,
      motionSequenceFrames: entries.filter((entry) => entry.role.startsWith('motion-sequence-') || entry.role.startsWith('no-lead-')).length,
      bandFrames: entries.filter((entry) => entry.role.startsWith('band-readability-')).length,
      runtimeErrors: runtimeErrors.length,
    },
    entries,
    runtimeErrors,
    serverLogs: serverLogs.join('').slice(-3000),
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  if (runtimeErrors.length) throw new Error(`capture completed with ${runtimeErrors.length} runtime/capture errors`);
  console.log(JSON.stringify({ ok: true, manifestPath, archiveRoot: outDir, summary: manifest.summary }, null, 2));
} finally {
  await browser?.close().catch(() => {});
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await new Promise((done) => {
      const timer = setTimeout(done, 3000);
      server.once('exit', () => { clearTimeout(timer); done(); });
    });
  }
}

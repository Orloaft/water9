import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import net from 'node:net';
import { chromium } from 'playwright';

const outDir = 'runs/water9-interaction-edge-fixes-2026-07-06';
const host = '127.0.0.1';
await mkdir(outDir, { recursive: true });

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function portAvailable(port) {
  return new Promise((resolvePort) => {
    const server = net.createServer();
    server.once('error', () => resolvePort(false));
    server.once('listening', () => server.close(() => resolvePort(true)));
    server.listen(port, host);
  });
}

async function pickPort() {
  for (let port = 5180; port <= 5199; port += 1) {
    if (await portAvailable(port)) return port;
  }
  throw new Error('no available port in 5180-5199');
}

const port = await pickPort();
const baseUrl = `http://${host}:${port}/?playtest=1&renderer=canvas&biome=1`;
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
const serverLogs = [];
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

async function waitForServer(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`dev server exited before ready with code ${server.exitCode}`);
    try {
      const response = await fetch(baseUrl, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite may still be binding.
    }
    await sleep(150);
  }
  throw new Error('dev server was not ready');
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
    errors.push({ type: 'console', text: message.text() });
  }
});

async function command(name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => (
    window.__AQUA_PLAYTEST__?.command?.(commandName, commandValue) ?? null
  ), [name, value]);
  await page.waitForTimeout(120);
  return result;
}

async function snapshot() {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function capture(label, grayscale = true) {
  const colorPath = `${outDir}/${label}.png`;
  const grayPath = `${outDir}/${label}-grayscale.png`;
  const canvas = page.locator('#game canvas');
  await canvas.screenshot({ path: colorPath });
  if (grayscale) {
    await canvas.evaluate((node) => { node.style.filter = 'grayscale(1)'; });
    await page.waitForTimeout(60);
    await canvas.screenshot({ path: grayPath });
    await canvas.evaluate((node) => { node.style.filter = ''; });
  }
  return grayscale ? { colorPath, grayPath } : { colorPath };
}

function floraIndexBySpecies(snap, species) {
  return snap?.floraAnchors?.gameplay?.findIndex((flora) => !flora.dead && flora.species === species) ?? -1;
}

async function scanFlora(species, label) {
  let snap = await snapshot();
  let index = floraIndexBySpecies(snap, species);
  if (index < 0) throw new Error(`missing flora species ${species}`);
  await command('teleportToFlora', { index });
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(1850);
  const during = await snapshot();
  await page.keyboard.up('KeyE');
  const images = await capture(label);
  snap = await snapshot();
  const target = snap?.floraAnchors?.gameplay?.find((flora) => flora.species === species);
  return { species, index, duringScanTarget: during?.player?.scanTarget?.species ?? null, scanned: Boolean(target?.scanned), images };
}

async function switchBiome(biome) {
  await command('setBiome', biome);
  await command('start');
  await page.waitForFunction((expectedBiome) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return snap?.state?.biome === expectedBiome && (snap?.floraAnchors?.gameplay?.length ?? 0) > 0;
  }, biome, { timeout: 20000 });
  await page.waitForTimeout(500);
}

try {
  await waitForServer();
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 25000 });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 10000 });
  await command('start');
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.sceneDepths?.actors !== null && snap.sceneDepths?.actors !== undefined);
  }, null, { timeout: 20000 });
  await page.waitForTimeout(2500);

  const oreSetup = await command('interactionEdgeProof', { kind: 'ore', action: 'setup' });
  const oreBefore = await capture('ore-visible-face-before');
  const oreMine = await command('interactionEdgeProof', { kind: 'ore', action: 'mineOre' });
  const oreAfter = await capture('ore-visible-face-after-direct-mine');
  await command('interactionEdgeProof', { kind: 'ore', action: 'setup' });
  const rockControl = await command('interactionEdgeProof', { kind: 'ore', action: 'mineRockControl' });
  const rockControlImage = await capture('ore-adjacent-rock-control-after');

  await switchBiome(1);
  const floraMoon = await scanFlora('Moon Sponge', 'flora-moon-sponge-scan-runtime');
  await switchBiome(2);
  const floraVent = await scanFlora('Vent Coral', 'flora-vent-coral-scan-runtime');

  await switchBiome(1);
  const mantisSetup = await command('interactionEdgeProof', { kind: 'fauna', species: 'Mantis Shrimp', action: 'setup' });
  const mantisBefore = await capture('mantis-shrimp-edge-before');
  const mantisAdvance = await command('interactionEdgeProof', { kind: 'fauna', species: 'Mantis Shrimp', action: 'advance', seconds: 4.2 });
  const mantisAfter = await capture('mantis-shrimp-edge-after-traverse');

  const crabSetup = await command('interactionEdgeProof', { kind: 'fauna', species: 'Silver Hinge Crab', action: 'setup' });
  const crabBefore = await capture('silver-hinge-crab-edge-before');
  const crabAdvance = await command('interactionEdgeProof', { kind: 'fauna', species: 'Silver Hinge Crab', action: 'advance', seconds: 2.2 });
  const crabAfter = await capture('silver-hinge-crab-edge-after-no-vertical-flip');

  const report = {
    ok: errors.length === 0,
    generatedAt: new Date().toISOString(),
    url: baseUrl,
    ore: { setup: oreSetup, mine: oreMine, before: oreBefore, after: oreAfter, rockControl, rockControlImage },
    flora: { moonSponge: floraMoon, ventCoral: floraVent },
    fauna: { mantis: { setup: mantisSetup, before: mantisBefore, advance: mantisAdvance, after: mantisAfter }, crab: { setup: crabSetup, before: crabBefore, advance: crabAdvance, after: crabAfter } },
    errors,
    serverLogs: serverLogs.join('').slice(-4000),
  };
  await writeFile(`${outDir}/interaction-edge-proof.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  server.kill('SIGTERM');
  process.exit(errors.length === 0 ? 0 : 1);
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  await writeFile(`${outDir}/interaction-edge-proof.json`, `${JSON.stringify({ ok: false, errors, serverLogs: serverLogs.join('').slice(-4000) }, null, 2)}\n`);
  await browser.close().catch(() => {});
  server.kill('SIGTERM');
  process.exit(1);
}

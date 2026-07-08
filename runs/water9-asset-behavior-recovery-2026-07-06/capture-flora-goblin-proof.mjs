import { spawn } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import net from 'node:net';
import { chromium } from 'playwright';

const outDir = 'runs/water9-asset-behavior-recovery-2026-07-06';
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

async function waitForServer() {
  const deadline = Date.now() + 25000;
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
const page = await browser.newPage({ viewport: { width: 960, height: 640 }, deviceScaleFactor: 1 });
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
  await page.waitForTimeout(160);
  return result;
}

async function snapshot() {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function waitForSceneReady() {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(
      snap?.world
      && Number.isFinite(snap?.sceneDepths?.actors)
      && Number.isFinite(snap?.sceneDepths?.articulatedBridges),
    );
  }, null, { timeout: 25000 });
  await page.waitForTimeout(700);
}

async function switchBiome(biome) {
  await command('setBiome', biome);
  await page.waitForFunction((expectedBiome) => window.__AQUA_PLAYTEST__?.snapshot?.()?.state?.biome === expectedBiome, biome, { timeout: 25000 });
  await waitForSceneReady();
}

async function capture(label) {
  const colorPath = `${outDir}/${label}.png`;
  const grayPath = `${outDir}/${label}-grayscale.png`;
  const canvas = page.locator('#game canvas');
  await canvas.screenshot({ path: colorPath, timeout: 15000 });
  await canvas.evaluate((node) => { node.style.filter = 'grayscale(1)'; });
  await page.waitForTimeout(80);
  await canvas.screenshot({ path: grayPath, timeout: 15000 });
  await canvas.evaluate((node) => { node.style.filter = ''; });
  return { colorPath, grayPath };
}

function floraIndexBySpecies(snap, species) {
  return snap?.floraAnchors?.gameplay?.findIndex((flora) => !flora.dead && flora.species === species) ?? -1;
}

try {
  await waitForServer();
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 10000 });
  await command('start');
  await waitForSceneReady();

  await switchBiome(1);
  for (let i = 0; i < 6; i += 1) {
    if (!(await snapshot())?.ui?.radioOpen) break;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(180);
  }
  await page.waitForFunction(() => (window.__AQUA_PLAYTEST__?.snapshot?.()?.floraAnchors?.gameplay?.length ?? 0) > 0, null, { timeout: 20000 });
  let snap = await snapshot();
  const floraIndex = floraIndexBySpecies(snap, 'Moon Sponge');
  if (floraIndex < 0) throw new Error('missing Moon Sponge flora target');
  await command('teleportToFlora', { index: floraIndex });
  await page.locator('#game canvas').click({ position: { x: 480, y: 320 } });
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(2600);
  const floraDuring = await snapshot();
  await page.keyboard.up('KeyE');
  const floraImage = await capture('flora-moon-sponge-scan-proof');
  snap = await snapshot();
  const floraAfter = snap?.floraAnchors?.gameplay?.[floraIndex] ?? null;

  await switchBiome(3);
  await command('start');
  await page.waitForFunction(() => (window.__AQUA_PLAYTEST__?.snapshot?.()?.fish?.length ?? 0) > 0, null, { timeout: 20000 });
  const teleport = await command('teleportToFauna', { species: 'Goblin Shark', distance: 82 });
  await page.waitForTimeout(450);
  const goblinImage = await capture('goblin-shark-gameplay-proof');
  snap = await snapshot();
  const goblin = snap?.fish?.find((fish) => fish.species === 'Goblin Shark') ?? null;
  const assetFiles = [
    'fauna-abyss-goblin-shark.png',
    'fauna-abyss-goblin-shark-0.png',
    'fauna-abyss-goblin-shark-1.png',
    'fauna-abyss-goblin-shark-2.png',
    'fauna-abyss-goblin-shark.frames.json',
  ];
  const fileStats = {};
  for (const name of assetFiles) {
    const path = `public/assets/generated/${name}`;
    const response = await page.request.get(`http://${host}:${port}/assets/generated/${name}`);
    const info = await stat(path);
    fileStats[name] = { path, bytes: info.size, httpStatus: response.status(), httpOk: response.ok() };
  }
  const manifest = JSON.parse(await readFile('public/assets/generated/fauna-abyss-goblin-shark.frames.json', 'utf8'));
  const report = {
    ok: errors.length === 0 && Boolean(floraAfter?.scanned) && Boolean(goblin?.assetKey === 'fauna-abyss-goblin-shark'),
    generatedAt: new Date().toISOString(),
    port,
    flora: {
      ok: Boolean(floraAfter?.scanned),
      species: 'Moon Sponge',
      image: floraImage,
      scanTargetDuringHold: floraDuring?.player?.scanTarget ?? '',
      selectedAfterHold: floraAfter,
    },
    goblinShark: {
      ok: Boolean(goblin?.assetKey === 'fauna-abyss-goblin-shark' && fileStats['fauna-abyss-goblin-shark.png'].httpOk),
      teleport,
      image: goblinImage,
      fish: goblin,
      manifest,
      fileStats,
    },
    errors,
    serverLogs: serverLogs.join('').slice(-3000),
  };
  await writeFile(`${outDir}/flora-goblin-proof.json`, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(`${outDir}/goblin-shark-generated-asset-residency.json`, `${JSON.stringify(report.goblinShark, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  server.kill('SIGTERM');
  await new Promise((resolveExit) => server.once('exit', resolveExit));
  process.exit(report.ok ? 0 : 1);
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  await writeFile(`${outDir}/flora-goblin-proof.json`, `${JSON.stringify({ ok: false, port, errors, serverLogs: serverLogs.join('').slice(-3000) }, null, 2)}\n`);
  await browser.close().catch(() => {});
  server.kill('SIGTERM');
  await new Promise((resolveExit) => server.once('exit', resolveExit));
  process.exit(1);
}

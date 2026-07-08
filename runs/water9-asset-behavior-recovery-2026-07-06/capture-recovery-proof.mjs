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

const port = Number(process.env.WATER9_RECOVERY_PORT) || await pickPort();
const baseUrl = `http://${host}:${port}/?playtest=1&renderer=canvas&biome=1`;
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
const serverLogs = [];
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

async function waitForServer(timeoutMs = 25000) {
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

async function waitForSceneReady(timeout = 25000) {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(
      snap?.world
      && Number.isFinite(snap?.sceneDepths?.actors)
      && Number.isFinite(snap?.sceneDepths?.articulatedBridges),
    );
  }, null, { timeout });
  await page.waitForTimeout(650);
}

async function switchBiome(biome) {
  await command('setBiome', biome);
  await page.waitForFunction((expectedBiome) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return snap?.state?.biome === expectedBiome && Boolean(snap?.world);
  }, biome, { timeout: 25000 });
  await waitForSceneReady();
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

async function captureMantisSequence() {
  await switchBiome(1);
  const setup = await command('interactionEdgeProof', { kind: 'fauna', species: 'Mantis Shrimp', action: 'setup' });
  const frames = [];
  for (let i = 0; i < 8; i += 1) {
    if (i > 0) await page.waitForTimeout(70);
    const snap = await snapshot();
    const fish = snap?.fish?.find((candidate) => candidate.species === 'Mantis Shrimp');
    const image = await capture(`mantis-movement-frame-${String(i).padStart(2, '0')}`, true);
    frames.push({
      frame: i,
      timeMs: i * 70,
      image,
      fish: fish ? {
        x: fish.x,
        y: fish.y,
        vx: fish.vx,
        vy: fish.vy,
        anchor: fish.anchor,
        rootX: fish.surface?.rootX ?? null,
        rootY: fish.surface?.rootY ?? null,
        rootDisplacement: fish.rootDisplacement,
        lungeTimer: fish.lungeTimer,
        navReseedCooldown: fish.navReseedCooldown,
        screenVisible: fish.screenVisible,
      } : null,
    });
  }
  return { setup, frames };
}

async function captureBrineTransition() {
  await switchBiome(2);
  const depths = [1320, 1380, 1440, 1500, 1560];
  const captures = [];
  for (const depth of depths) {
    const metadata = await command('backgroundReview', {
      label: `b2-lower-transition-${depth}`,
      depth,
      zoom: 1.05,
      clearWaterWindow: true,
    });
    await page.waitForTimeout(180);
    const image = await capture(`b2-lower-transition-${depth}`, true);
    captures.push({
      depth,
      image,
      activeBand: metadata?.activeBand?.id ?? null,
      blend: metadata?.activeBandBlend ?? null,
      anchors: metadata?.anchors ? {
        count: metadata.anchors.count,
        transitionBlendCounts: metadata.anchors.transitionBlendCounts,
        items: metadata.anchors.items?.slice(0, 6),
      } : null,
      worldSpaceNoise: metadata?.worldSpaceNoise ? {
        visibleCount: metadata.worldSpaceNoise.visibleCount,
        layers: metadata.worldSpaceNoise.layers?.map((layer) => ({
          id: layer.id,
          alpha: layer.alpha,
          depthGate: layer.depthGate,
          assetId: layer.assetId,
        })),
      } : null,
    });
  }
  return captures;
}

async function captureFloraScan() {
  await switchBiome(1);
  await command('start');
  await page.waitForFunction(() => (window.__AQUA_PLAYTEST__?.snapshot?.()?.floraAnchors?.gameplay?.length ?? 0) > 0, null, { timeout: 20000 });
  let snap = await snapshot();
  const index = floraIndexBySpecies(snap, 'Moon Sponge');
  if (index < 0) return { ok: false, reason: 'missing Moon Sponge', before: snap?.floraAnchors?.gameplay?.slice(0, 8) ?? [] };
  await command('teleportToFlora', { index });
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(1850);
  const during = await snapshot();
  await page.keyboard.up('KeyE');
  const image = await capture('flora-moon-sponge-scan-proof', true);
  snap = await snapshot();
  const selected = snap?.floraAnchors?.gameplay?.[index] ?? null;
  return {
    ok: Boolean(selected?.scanned),
    species: 'Moon Sponge',
    index,
    image,
    scanTargetDuringHold: during?.player?.scanTarget ?? '',
    selectedAfterHold: selected,
  };
}

async function captureGoblinShark() {
  await switchBiome(3);
  await command('start');
  await page.waitForFunction(() => (window.__AQUA_PLAYTEST__?.snapshot?.()?.fish?.length ?? 0) > 0, null, { timeout: 20000 });
  const teleport = await command('teleportToFauna', { species: 'Goblin Shark', distance: 82 });
  await page.waitForTimeout(450);
  const image = await capture('goblin-shark-gameplay-proof', true);
  const snap = await snapshot();
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
  const residency = {
    ok: Boolean(goblin && goblin.assetKey === 'fauna-abyss-goblin-shark' && fileStats['fauna-abyss-goblin-shark.png'].httpOk),
    teleport,
    fish: goblin,
    image,
    manifest,
    fileStats,
  };
  await writeFile(`${outDir}/goblin-shark-generated-asset-residency.json`, `${JSON.stringify(residency, null, 2)}\n`);
  return residency;
}

async function verifyRDoesNotRestart() {
  await switchBiome(2);
  await command('setCredits', 321);
  await command('start');
  const before = await snapshot();
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(350);
  const after = await snapshot();
  return {
    ok: before?.state?.biome === 2
      && after?.state?.biome === 2
      && before?.state?.credits === 321
      && after?.state?.credits === 321
      && after?.state?.started === true,
    before: {
      biome: before?.state?.biome,
      credits: before?.state?.credits,
      started: before?.state?.started,
      status: before?.ui?.status,
    },
    after: {
      biome: after?.state?.biome,
      credits: after?.state?.credits,
      started: after?.state?.started,
      status: after?.ui?.status,
    },
  };
}

try {
  await waitForServer();
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 10000 });
  await command('start');
  await waitForSceneReady();

  const rKey = await verifyRDoesNotRestart();
  const mantis = await captureMantisSequence();
  const brineTransition = await captureBrineTransition();
  const flora = await captureFloraScan();
  const goblinShark = await captureGoblinShark();

  const report = {
    ok: errors.length === 0 && rKey.ok && flora.ok && goblinShark.ok,
    generatedAt: new Date().toISOString(),
    url: baseUrl,
    port,
    rKey,
    mantis,
    brineTransition,
    flora,
    goblinShark: {
      ok: goblinShark.ok,
      image: goblinShark.image,
      fish: goblinShark.fish,
      fileStats: goblinShark.fileStats,
      manifest: {
        frameWidth: goblinShark.manifest.frameWidth,
        frameHeight: goblinShark.manifest.frameHeight,
        frameCount: goblinShark.manifest.frameCount,
        source: goblinShark.manifest.source,
      },
    },
    errors,
    serverLogs: serverLogs.join('').slice(-4000),
  };
  await writeFile(`${outDir}/recovery-proof.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  server.kill('SIGTERM');
  await new Promise((resolveExit) => server.once('exit', resolveExit));
  process.exit(report.ok ? 0 : 1);
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  await writeFile(`${outDir}/recovery-proof.json`, `${JSON.stringify({ ok: false, port, errors, serverLogs: serverLogs.join('').slice(-4000) }, null, 2)}\n`);
  await browser.close().catch(() => {});
  server.kill('SIGTERM');
  await new Promise((resolveExit) => server.once('exit', resolveExit));
  process.exit(1);
}

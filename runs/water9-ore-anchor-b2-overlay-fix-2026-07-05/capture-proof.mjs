import { spawn } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const repoDir = '/mnt/nxt-dev/water9';
const outDir = `${repoDir}/runs/water9-ore-anchor-b2-overlay-fix-2026-07-05`;
const host = '127.0.0.1';
const portMin = 5180;
const portMax = 5199;

const b2Scenarios = [
  { label: 'upper-band-504', depthMeters: 504 },
  { label: 'upper-band-510', depthMeters: 510 },
  { label: 'former-mid-start-522', depthMeters: 522 },
  { label: 'former-mid-deep-636', depthMeters: 636 },
  { label: 'former-mid-deep-690', depthMeters: 690 },
  { label: 'former-mid-last-1026', depthMeters: 1026 },
  { label: 'former-mid-last-1038', depthMeters: 1038 },
  { label: 'lower-band-control-1044', depthMeters: 1044 },
  { label: 'transition-deep-control-1440', depthMeters: 1440 },
];

await mkdir(outDir, { recursive: true });

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function portAvailable(port) {
  return new Promise((resolvePort) => {
    const server = net.createServer();
    server.once('error', () => resolvePort(false));
    server.once('listening', () => {
      server.close(() => resolvePort(true));
    });
    server.listen(port, host);
  });
}

async function choosePort() {
  for (let port = portMin; port <= portMax; port += 1) {
    if (await portAvailable(port)) return port;
  }
  throw new Error(`no free port in ${portMin}-${portMax}`);
}

async function waitForServer(url, server, serverLogs, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`dev server exited early with code ${server.exitCode}\n${serverLogs.join('')}`);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite may still be starting.
    }
    await sleep(150);
  }
  throw new Error(`dev server did not become ready\n${serverLogs.join('')}`);
}

async function command(page, name, value) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 20000 });
  const result = await page.evaluate(([commandName, commandValue]) => (
    window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null
  ), [name, value]);
  await page.waitForTimeout(250);
  return result;
}

async function snapshot(page) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.snapshot), null, { timeout: 20000 });
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function waitForWorld(page) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const review = await command(page, 'biomeLoadingReview');
    if (review?.worldReady === true) return;
    await page.waitForTimeout(160);
  }
  throw new Error('world generation did not complete');
}

async function canvasShot(page, fileName) {
  const path = resolve(outDir, fileName);
  const canvas = page.locator('#game canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: 20000 });
  await canvas.screenshot({ path });
  return path;
}

async function grayscaleCanvasShot(page, fileName) {
  const dataUrl = await page.evaluate(() => {
    const source = document.querySelector('#game canvas');
    if (!source) throw new Error('missing #game canvas');
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('missing 2d context');
    context.drawImage(source, 0, 0);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const luma = Math.round(image.data[i] * 0.2126 + image.data[i + 1] * 0.7152 + image.data[i + 2] * 0.0722);
      image.data[i] = luma;
      image.data[i + 1] = luma;
      image.data[i + 2] = luma;
    }
    context.putImageData(image, 0, 0);
    return canvas.toDataURL('image/png');
  });
  const path = resolve(outDir, fileName);
  await writeFile(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
  return path;
}

async function canvasStats(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#game canvas');
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false };
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let samples = 0;
    let lumaSum = 0;
    let chromaSum = 0;
    for (let y = 0; y < canvas.height; y += 8) {
      for (let x = 0; x < canvas.width; x += 8) {
        const i = (y * canvas.width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        lumaSum += r * 0.2126 + g * 0.7152 + b * 0.0722;
        chromaSum += Math.max(r, g, b) - Math.min(r, g, b);
        samples += 1;
      }
    }
    return {
      exists: true,
      width: canvas.width,
      height: canvas.height,
      sampleStride: 8,
      lumaAverage: Number((lumaSum / Math.max(1, samples)).toFixed(3)),
      chromaAverage: Number((chromaSum / Math.max(1, samples)).toFixed(3)),
    };
  });
}

async function fileBytes(path) {
  return (await stat(path)).size;
}

async function tileProbe(page, points) {
  return page.evaluate(async (probePoints) => {
    const mod = await import('/src/game-ref.ts');
    const scene = mod.gameScene?.();
    if (!scene) return [];
    return probePoints.map((point) => {
      const tile = scene.getTile(point.tileX, point.tileY);
      return {
        ...point,
        tile,
        damage: scene.damage?.[point.tileY]?.[point.tileX] ?? null,
      };
    });
  }, points);
}

async function teleportExactMeters(page, depthMeters) {
  return page.evaluate(async (meters) => {
    const { TILE } = await import('/src/constants.ts');
    return window.__AQUA_PLAYTEST__?.command('teleportDepth', (meters / 6) * TILE) ?? null;
  }, depthMeters);
}

async function stageB2DepthForCapture(page, depthMeters) {
  const firstTeleport = await teleportExactMeters(page, depthMeters);
  await page.evaluate(() => {
    window.__AQUA_PLAYTEST__?.command('centerCameraOnPlayer');
    window.__AQUA_PLAYTEST__?.command('clearProofOverlays');
  });
  await page.waitForTimeout(260);
  const captureTeleport = await teleportExactMeters(page, depthMeters);
  await page.evaluate(async () => {
    const mod = await import('/src/game-ref.ts');
    const scene = mod.gameScene?.();
    if (!scene) return;
    scene.player.vx = 0;
    scene.player.vy = 0;
    scene.cameras.main.centerOn(scene.player.x, scene.player.y);
    scene.cameras.main.preRender();
    scene.draw();
  });
  return {
    firstDepth: firstTeleport?.state?.depth ?? null,
    captureDepth: captureTeleport?.state?.depth ?? null,
    firstPlayer: firstTeleport?.player ?? null,
    capturePlayer: captureTeleport?.player ?? null,
  };
}

function oreSummary(snapshotValue) {
  return {
    state: snapshotValue?.state ?? null,
    ui: snapshotValue?.ui ?? null,
    foregroundLayers: snapshotValue?.foregroundLayers ?? null,
    player: snapshotValue?.player ?? null,
    gameplayOre: snapshotValue?.gameplayOre ?? null,
    looseItems: snapshotValue?.looseItems ?? [],
    valuableLooseItems: (snapshotValue?.looseItems ?? []).filter((item) => item.value > 0),
  };
}

function b2Summary(snapshotValue) {
  const profile = snapshotValue?.environmentVisualProfile ?? null;
  return {
    state: snapshotValue?.state ?? null,
    camera: snapshotValue?.camera ?? null,
    activeProfile: profile?.activeProfile ?? null,
    activeBand: profile?.activeBand ?? null,
    darkness: profile?.darkness ?? null,
    overlay: profile?.overlay ?? null,
    worldSpaceNoise: profile?.worldSpaceNoise
      ? {
        alpha: profile.worldSpaceNoise.alpha,
        color: profile.worldSpaceNoise.color,
        postDarknessVeil: profile.worldSpaceNoise.postDarknessVeil,
        visibleLayers: profile.worldSpaceNoise.layers?.filter((layer) => layer.visible || layer.alpha > 0.0008) ?? [],
      }
      : null,
    foregroundLayers: snapshotValue?.foregroundLayers ?? null,
  };
}

const port = await choosePort();
const baseUrl = `http://${host}:${port}/`;
const serverLogs = [];
const server = spawn(resolve(repoDir, 'node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: repoDir,
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

let browser;
try {
  await waitForServer(baseUrl, server, serverLogs);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto(`${baseUrl}?playtest=1&biome=2&renderer=canvas`, { waitUntil: 'load', timeout: 45000 });
  await waitForWorld(page);

  const setup = await command(page, 'miningPolishReview', { stage: 'setup' });
  await command(page, 'clearProofOverlays');
  await page.waitForTimeout(300);
  const beforeOreSnapshot = await snapshot(page);
  const beforeOreShot = await canvasShot(page, 'ore-01-before-adjacent-mining.png');

  const tileSize = 24;
  const adjacentTarget = {
    tileX: setup.target.tileX - 1,
    tileY: setup.target.tileY,
    worldX: (setup.target.tileX - 1) * tileSize + tileSize * 0.5,
    worldY: setup.target.tileY * tileSize + tileSize * 0.5,
    repeats: 4,
  };
  const beforeTiles = await tileProbe(page, [
    { label: 'adjacent-rock', tileX: adjacentTarget.tileX, tileY: adjacentTarget.tileY },
    { label: 'ore-target', tileX: setup.target.tileX, tileY: setup.target.tileY },
  ]);
  const afterAdjacentSnapshot = await command(page, 'terrainMineAt', adjacentTarget);
  await command(page, 'clearProofOverlays');
  await page.waitForTimeout(220);
  const afterAdjacentShot = await canvasShot(page, 'ore-02-after-adjacent-rock-mining.png');
  const afterAdjacentTiles = await tileProbe(page, [
    { label: 'adjacent-rock', tileX: adjacentTarget.tileX, tileY: adjacentTarget.tileY },
    { label: 'ore-target', tileX: setup.target.tileX, tileY: setup.target.tileY },
  ]);

  const oreTarget = {
    tileX: setup.target.tileX,
    tileY: setup.target.tileY,
    worldX: setup.target.worldX,
    worldY: setup.target.worldY,
    repeats: 12,
  };
  const afterOreSnapshot = await command(page, 'terrainMineAt', oreTarget);
  await command(page, 'clearProofOverlays');
  await page.waitForTimeout(300);
  const afterOreShot = await canvasShot(page, 'ore-03-after-direct-ore-break.png');
  const afterOreTiles = await tileProbe(page, [
    { label: 'ore-target', tileX: setup.target.tileX, tileY: setup.target.tileY },
    { label: 'quartz-neighbor', tileX: setup.target.tileX + 1, tileY: setup.target.tileY },
  ]);
  const collectResult = await command(page, 'miningPolishReview', { stage: 'collect' });
  const afterCollectSnapshot = await snapshot(page);

  const b2Captures = [];
  await page.goto(`${baseUrl}?playtest=1&biome=2&renderer=canvas&proof=b2`, { waitUntil: 'load', timeout: 45000 });
  await waitForWorld(page);
  await command(page, 'start');
  await command(page, 'dive');
  await command(page, 'clearProofOverlays');
  for (let index = 0; index < b2Scenarios.length; index += 1) {
    const scenario = b2Scenarios[index];
    const moveResult = await stageB2DepthForCapture(page, scenario.depthMeters);
    const snap = await snapshot(page);
    const actualDepth = snap?.state?.depth ?? scenario.depthMeters;
    const colorName = `b2-${String(index + 1).padStart(2, '0')}-${scenario.label}-depth-${actualDepth}-color.png`;
    const grayName = `b2-${String(index + 1).padStart(2, '0')}-${scenario.label}-depth-${actualDepth}-grayscale.png`;
    const colorPath = await canvasShot(page, colorName);
    const grayscalePath = await grayscaleCanvasShot(page, grayName);
    b2Captures.push({
      captureMode: 'exact-depth-runtime-playtest-teleport',
      ...scenario,
      moveResult,
      actualDepth,
      colorPath,
      colorBytes: await fileBytes(colorPath),
      grayscalePath,
      grayscaleBytes: await fileBytes(grayscalePath),
      canvasStats: await canvasStats(page),
      metrics: b2Summary(snap),
    });
  }

  const proof = {
    schema: 'water9-ore-anchor-b2-overlay-fix-proof@1',
    timestamp: new Date().toISOString(),
    baseUrl,
    port,
    viteWatchIgnoreRequirement: 'vite.config.ts server.watch.ignored includes **/.desktop-build/**',
    ore: {
      setup,
      screenshots: {
        beforeAdjacentMining: beforeOreShot,
        afterAdjacentRockMining: afterAdjacentShot,
        afterDirectOreBreak: afterOreShot,
      },
      beforeAdjacentMining: {
        targetTiles: beforeTiles,
        ...oreSummary(beforeOreSnapshot),
      },
      adjacentRockMining: {
        target: adjacentTarget,
        targetTiles: afterAdjacentTiles,
        ...oreSummary(afterAdjacentSnapshot),
      },
      directOreMining: {
        target: oreTarget,
        targetTiles: afterOreTiles,
        ...oreSummary(afterOreSnapshot),
      },
      collection: {
        result: collectResult,
        ...oreSummary(afterCollectSnapshot),
      },
    },
    biome2: {
      captures: b2Captures,
    },
  };

  const oreTileAfter = afterOreTiles.find((entry) => entry.label === 'ore-target')?.tile;
  const valuableLooseCount = proof.ore.directOreMining.valuableLooseItems.length;
  if (oreTileAfter !== 'water' || valuableLooseCount < 1) {
    throw new Error(`ore proof did not break target ore: tile=${oreTileAfter}, valuableLooseCount=${valuableLooseCount}`);
  }
  for (const capture of b2Captures) {
    const alphas = capture.metrics.foregroundLayers;
    if (capture.actualDepth >= 522 && capture.actualDepth <= 1038 && alphas?.terrainAlpha !== 1) {
      throw new Error(`B2 mid-band terrain alpha expected 1 at ${capture.actualDepth}, saw ${alphas?.terrainAlpha}`);
    }
    if (capture.actualDepth === 1440 && alphas?.terrainAlpha !== 0.48) {
      throw new Error(`transition-deep terrain alpha expected 0.48, saw ${alphas?.terrainAlpha}`);
    }
  }

  const summaryPath = resolve(outDir, 'proof-summary.json');
  await writeFile(summaryPath, `${JSON.stringify(proof, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    port,
    summaryPath,
    ore: {
      beforeVisible: proof.ore.beforeAdjacentMining.gameplayOre?.visibleCount,
      afterAdjacentVisible: proof.ore.adjacentRockMining.gameplayOre?.visibleCount,
      afterOreVisible: proof.ore.directOreMining.gameplayOre?.visibleCount,
      valuableLooseCount,
      oreTileAfter,
    },
    b2: b2Captures.map((capture) => ({
      label: capture.label,
      actualDepth: capture.actualDepth,
      colorPath: capture.colorPath,
      grayscalePath: capture.grayscalePath,
      terrainAlpha: capture.metrics.foregroundLayers?.terrainAlpha,
      terrainEdgesAlpha: capture.metrics.foregroundLayers?.terrainEdgesAlpha,
      oreOverburdenAlpha: capture.metrics.foregroundLayers?.oreOverburdenAlpha,
    })),
  }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await sleep(250);
}

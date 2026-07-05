import { spawn } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = '/mnt/nxt-dev/water9/runs/water9-rootcause-mining-ore-b2-overlay-2026-07-05/b2-overlay-proof';
const host = '127.0.0.1';
const portMin = 5180;
const portMax = 5199;

const scenarios = [
  { label: 'near-surface-normal', targetDepth: 180 },
  { label: 'landmark-good-before-band', targetDepth: 510 },
  { label: 'first-bad-mid-band', targetDepth: 522 },
  { label: 'deep-in-bad-mid-band', targetDepth: 760 },
  { label: 'just-past-mid-band', targetDepth: 1044 },
  { label: 'transition-deep-control', targetDepth: 1440 },
];

const exactDiagnosticScenarios = [
  { label: 'exact-last-bad-mid-band', targetDepth: 1038 },
  { label: 'exact-first-good-lower-after-band', targetDepth: 1044 },
  { label: 'exact-transition-deep-control', targetDepth: 1440 },
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
    if (server.exitCode !== null) {
      throw new Error(`dev server exited early with code ${server.exitCode}\n${serverLogs.join('')}`);
    }
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite may still be binding.
    }
    await sleep(150);
  }
  throw new Error(`dev server did not become ready\n${serverLogs.join('')}`);
}

async function waitForPlaytest(page) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 20000 });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const review = await page.evaluate(() => window.__AQUA_PLAYTEST__?.command('biomeLoadingReview'));
    if (review?.worldReady === true) return;
    await page.waitForTimeout(160);
  }
  throw new Error('world generation did not complete');
}

async function command(page, name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => {
    return window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null;
  }, [name, value]);
  await page.waitForTimeout(500);
  return result;
}

async function teleportExactMeters(page, depthMeters) {
  const result = await page.evaluate(async (meters) => {
    const { TILE } = await import('/src/constants.ts');
    return window.__AQUA_PLAYTEST__?.command('teleportDepth', (meters / 6) * TILE) ?? null;
  }, depthMeters);
  await page.waitForTimeout(500);
  return result;
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
    let terrainLikeSamples = 0;
    for (let y = 0; y < canvas.height; y += 8) {
      for (let x = 0; x < canvas.width; x += 8) {
        const i = (y * canvas.width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
        lumaSum += luma;
        chromaSum += Math.max(r, g, b) - Math.min(r, g, b);
        if (luma < 38 && y > canvas.height * 0.22) terrainLikeSamples += 1;
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
      darkTerrainLikeRatio: Number((terrainLikeSamples / Math.max(1, samples)).toFixed(4)),
    };
  });
}

async function sceneMetrics(page) {
  return page.evaluate(async () => {
    const mod = await import('/src/game-ref.ts');
    const scene = mod.gameScene?.();
    scene?.draw?.();
    const snapshot = window.__AQUA_PLAYTEST__?.snapshot?.() ?? null;
    const profile = snapshot?.environmentVisualProfile ?? null;
    return {
      state: snapshot?.state ?? null,
      camera: snapshot?.camera ?? null,
      activeProfile: profile?.activeProfile ?? null,
      activeBand: profile?.activeBand ?? null,
      darkness: profile?.darkness ?? null,
      overlay: profile?.overlay ?? null,
      worldSpaceNoise: profile?.worldSpaceNoise
        ? {
          alpha: profile.worldSpaceNoise.alpha,
          color: profile.worldSpaceNoise.color,
          layers: profile.worldSpaceNoise.layers,
          postDarknessVeil: profile.worldSpaceNoise.postDarknessVeil,
        }
        : null,
      waterColumnLayers: profile?.waterColumnLayers ?? null,
      backgroundLayers: profile?.layers ?? null,
      anchors: profile?.anchors ?? null,
      renderedBitmapAnchors: profile?.renderedBitmapAnchors ?? null,
      runtimeLayers: scene
        ? {
          terrainAlpha: scene.terrain?.alpha ?? null,
          terrainDepth: scene.terrain?.depth ?? null,
          terrainEdgesAlpha: scene.terrainEdges?.alpha ?? null,
          terrainEdgesDepth: scene.terrainEdges?.depth ?? null,
          oreOverburdenAlpha: scene.oreOverburden?.alpha ?? null,
          oreOverburdenDepth: scene.oreOverburden?.depth ?? null,
          darknessDepth: scene.darkness?.depth ?? null,
          lampGloomDepth: scene.lampGloom?.depth ?? null,
          overlayDepth: scene.overlay?.depth ?? null,
          visibleWaterColumnSprites: (scene.waterColumnLayers ?? [])
            .filter((sprite) => sprite.visible)
            .map((sprite) => ({
              textureKey: sprite.texture?.key ?? '',
              alpha: sprite.alpha,
              depth: sprite.depth,
              tint: `#${Number(sprite.tintTopLeft ?? 0).toString(16).padStart(6, '0')}`,
              blendMode: sprite.getData?.('waterColumnBlendMode') ?? null,
            })),
          visibleParallaxLayers: (scene.parallaxLayers ?? [])
            .filter((sprite) => sprite.visible)
            .map((sprite) => ({
              textureKey: sprite.texture?.key ?? '',
              alpha: sprite.alpha,
              depth: sprite.depth,
              tint: `#${Number(sprite.tintTopLeft ?? 0).toString(16).padStart(6, '0')}`,
            })),
        }
        : null,
    };
  });
}

async function fileBytes(path) {
  return (await stat(path)).size;
}

const port = await choosePort();
const baseUrl = `http://${host}:${port}/`;
const serverLogs = [];
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: '/mnt/nxt-dev/water9',
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

let browser;
try {
  await waitForServer(baseUrl, server, serverLogs);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`${baseUrl}?playtest=1&biome=2`, { waitUntil: 'load', timeout: 45000 });
  await waitForPlaytest(page);
  await command(page, 'start');
  await command(page, 'dive');
  await command(page, 'clearProofOverlays');

  const captures = [];
  for (const scenario of scenarios) {
    const moveResult = await command(page, 'teleportToReachableDepth', scenario.targetDepth);
    if (!moveResult?.ok) throw new Error(`teleport failed for ${scenario.label}: ${JSON.stringify(moveResult)}`);
    await command(page, 'centerCameraOnPlayer');
    await command(page, 'clearProofOverlays');
    await page.waitForTimeout(900);
    const metrics = await sceneMetrics(page);
    const stats = await canvasStats(page);
    const screenshotPath = resolve(outDir, `${scenario.label}-depth-${metrics.state?.depth ?? scenario.targetDepth}.png`);
    await page.locator('#game canvas').screenshot({ path: screenshotPath });
    captures.push({
      captureMode: 'normal-reachable-playtest-teleport',
      ...scenario,
      moveResult,
      screenshotPath,
      screenshotBytes: await fileBytes(screenshotPath),
      canvasStats: stats,
      metrics,
    });
  }

  for (const scenario of exactDiagnosticScenarios) {
    const moveResult = await teleportExactMeters(page, scenario.targetDepth);
    await command(page, 'centerCameraOnPlayer');
    await command(page, 'clearProofOverlays');
    await page.waitForTimeout(900);
    const metrics = await sceneMetrics(page);
    const stats = await canvasStats(page);
    const screenshotPath = resolve(outDir, `${scenario.label}-depth-${metrics.state?.depth ?? scenario.targetDepth}.png`);
    await page.locator('#game canvas').screenshot({ path: screenshotPath });
    captures.push({
      captureMode: 'exact-depth-diagnostic-teleportDepth-no-terrain-edits',
      ...scenario,
      moveResult,
      screenshotPath,
      screenshotBytes: await fileBytes(screenshotPath),
      canvasStats: stats,
      metrics,
    });
  }

  const summaryPath = resolve(outDir, 'b2-overlay-proof-summary.json');
  await writeFile(summaryPath, `${JSON.stringify({
    schema: 'water9-b2-overlay-rootcause-proof@1',
    timestamp: new Date().toISOString(),
    baseUrl,
    port,
    viteWatchIgnoreRequirement: 'vite.config.ts server.watch.ignored includes **/.desktop-build/**',
    captures,
  }, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({ ok: true, baseUrl, summaryPath, captures: captures.map(({ label, screenshotPath, metrics }) => ({
    label,
    screenshotPath,
    depth: metrics.state?.depth,
    band: metrics.activeProfile?.depthBand,
    terrainAlpha: metrics.runtimeLayers?.terrainAlpha,
    terrainEdgesAlpha: metrics.runtimeLayers?.terrainEdgesAlpha,
    oreOverburdenAlpha: metrics.runtimeLayers?.oreOverburdenAlpha,
  })) }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await sleep(250);
}

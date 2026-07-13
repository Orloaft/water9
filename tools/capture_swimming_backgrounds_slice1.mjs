import { execFileSync, spawn } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const repo = process.cwd();
const outDir = process.env.WATER9_SLICE1_OUT_DIR
  ?? '/home/orlovboros/artifacts/managers/water9/swimming-backgrounds-full-implementation-2026-07-13/slice1';
const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_SLICE1_PORT ?? 5192);
const viewport = { width: 1440, height: 900 };
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: repo, encoding: 'utf8' }).trim();

await mkdir(outDir, { recursive: true });

async function portAvailable(port) {
  return new Promise((done) => {
    const probe = net.createServer();
    probe.once('error', () => done(false));
    probe.once('listening', () => probe.close(() => done(true)));
    probe.listen(port, host);
  });
}

async function choosePort() {
  const candidates = [
    ...Array.from({ length: 5200 - requestedPort }, (_, index) => requestedPort + index),
    ...Array.from({ length: Math.max(0, requestedPort - 5180) }, (_, index) => 5180 + index),
  ].filter((port) => port >= 5180 && port <= 5199);
  for (const port of candidates) if (await portAvailable(port)) return port;
  throw new Error('no free Slice 1 capture port in 5180-5199');
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
    if (server.exitCode !== null) throw new Error(`Vite exited ${server.exitCode}`);
    try {
      const response = await fetch(baseUrl, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {}
    await sleep(150);
  }
  throw new Error('Slice 1 capture server did not become ready');
}

async function waitReady(page) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 20000 });
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world?.ready !== false && snap?.ui?.biomeLoading?.active !== true);
  }, null, { timeout: 45000 });
}

async function command(page, name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => (
    window.__AQUA_PLAYTEST__?.command(commandName, commandValue)
  ), [name, value]);
  await page.waitForTimeout(60);
  return result;
}

async function playFieldMetrics(page, snap) {
  return page.evaluate((snapshot) => {
    const canvas = document.querySelector('#game canvas');
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false };
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = image.data;
    const lumaAt = (x, y) => {
      const px = Math.max(0, Math.min(canvas.width - 1, Math.round(x)));
      const py = Math.max(0, Math.min(canvas.height - 1, Math.round(y)));
      const index = (py * canvas.width + px) * 4;
      return pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722;
    };
    let sum = 0;
    let samples = 0;
    let below24 = 0;
    for (let y = 0; y < canvas.height; y += 4) {
      for (let x = 0; x < canvas.width; x += 4) {
        const luma = lumaAt(x, y);
        sum += luma;
        below24 += luma < 24 ? 1 : 0;
        samples += 1;
      }
    }

    const radialEdgeContrast = (cx, cy, innerRadius, outerRadius) => {
      const radialMaxima = [];
      for (let angleIndex = 0; angleIndex < 48; angleIndex += 1) {
        const angle = angleIndex / 48 * Math.PI * 2;
        let previous = lumaAt(cx + Math.cos(angle) * innerRadius, cy + Math.sin(angle) * innerRadius);
        let maxGradient = 0;
        for (let radius = innerRadius + 2; radius <= outerRadius; radius += 2) {
          const current = lumaAt(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
          maxGradient = Math.max(maxGradient, Math.abs(current - previous));
          previous = current;
        }
        radialMaxima.push(maxGradient);
      }
      radialMaxima.sort((a, b) => a - b);
      const p75 = radialMaxima[Math.min(radialMaxima.length - 1, Math.floor(radialMaxima.length * 0.75))] ?? 0;
      return Number(p75.toFixed(2));
    };
    const zoom = snapshot?.camera?.zoom ?? 1;
    const playerX = ((snapshot?.player?.x ?? 0) - (snapshot?.camera?.x ?? 0)) * zoom;
    const playerY = ((snapshot?.player?.y ?? 0) - (snapshot?.camera?.y ?? 0)) * zoom;
    const diverEdgeContrast = radialEdgeContrast(playerX, playerY, 5 * zoom, 22 * zoom);
    const threats = (snapshot?.fish ?? [])
      .filter((fish) => fish.hostile && !fish.dead && (fish.aggroCue > 0.05 || fish.aggro > 0.05) && fish.screenX >= 0 && fish.screenX < canvas.width && fish.screenY >= 0 && fish.screenY < canvas.height)
      .sort((a, b) => Math.hypot(a.screenX - playerX, a.screenY - playerY) - Math.hypot(b.screenX - playerX, b.screenY - playerY))
      .slice(0, 3)
      .map((fish) => ({
        species: fish.species,
        contrast: radialEdgeContrast(
          fish.screenX,
          fish.screenY,
          Math.max(4, fish.radius * zoom * 0.25),
          Math.min(220, Math.max(14, fish.radius * zoom * 1.55)),
        ),
      }));
    const threatEdgeContrast = threats.length ? Math.min(...threats.map((threat) => threat.contrast)) : null;
    return {
      exists: true,
      metricRegion: 'Canvas backing store only; live DOM HUD excluded',
      backing: [canvas.width, canvas.height],
      samples,
      meanLuma: Number((sum / samples).toFixed(2)),
      belowLuma24Pct: Number((below24 / samples * 100).toFixed(2)),
      diverEdgeContrast,
      threatEdgeContrast,
      threats,
      interactionText: { present: false, contrastRatio: null, reason: 'no interaction prompt was staged; transient combat floating text is not interaction text' },
    };
  }, snap);
}

const scenarios = [
  { id: 'b1-110m-cutoff-before', biome: 1, targetDepth: 110, key: 'd', boundary: 120 },
  { id: 'b1-130m-cutoff-after', biome: 1, targetDepth: 130, key: 'a', boundary: 120 },
  { id: 'b2-510m-cutoff-before', biome: 2, targetDepth: 510, key: 'd', boundary: 520 },
  { id: 'b2-530m-cutoff-after', biome: 2, targetDepth: 530, key: 'a', boundary: 520 },
  { id: 'b3-1030m-cutoff-before', biome: 3, targetDepth: 1030, key: 'd', boundary: 1040 },
  { id: 'b3-1050m-cutoff-after', biome: 3, targetDepth: 1050, key: 'a', boundary: 1040 },
  { id: 'b4-1430m-cutoff-before', biome: 4, targetDepth: 1430, key: 'd', boundary: 1440 },
  { id: 'b4-1450m-cutoff-after', biome: 4, targetDepth: 1450, key: 'a', boundary: 1440 },
];

const evidence = {
  schema: 'water9/swimming-backgrounds-slice1-visual-evidence@1',
  generatedAt: new Date().toISOString(),
  repo,
  head,
  branch,
  port,
  renderer: 'canvas',
  viewport,
  source: 'actual normal-play DeepdiveScene; one #game canvas; live DOM HUD; paired open-water cutoff placement; 120 ms live settle; no backgroundReview, pause, terrain edit, or substitute renderer',
  runtimeErrors: [],
  captures: [],
  adjacentPairs: [],
  acceptance: {},
};

let browser;
try {
  await waitForServer();
  let page;
  let currentBiome = 0;
  const pairedTileX = new Map();
  for (const scenario of scenarios) {
    if (scenario.biome !== currentBiome) {
      await page?.close();
      await browser?.close();
      browser = await chromium.launch({ headless: true });
      page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      page.on('pageerror', (error) => evidence.runtimeErrors.push({ type: 'pageerror', biome: scenario.biome, text: error.message }));
      page.on('console', (message) => {
        if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
          evidence.runtimeErrors.push({ type: 'console', biome: scenario.biome, text: message.text() });
        }
      });
      await page.goto(`${baseUrl}?playtest=1&biome=${scenario.biome}&renderer=canvas&perf=1&perfHud=0`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitReady(page);
      await command(page, 'start');
      await command(page, 'dive');
      await command(page, 'clearProofOverlays');
      await command(page, 'maxUpgrades');
      await command(page, 'refill');
      currentBiome = scenario.biome;
    }
    const pairKey = `${scenario.biome}:${scenario.boundary}`;
    const teleport = await command(page, 'teleportToCutoffOpenWater', {
      boundaryDepth: scenario.boundary,
      depthMeters: scenario.targetDepth,
      tileX: pairedTileX.get(pairKey),
    });
    if (teleport?.ok && !pairedTileX.has(pairKey)) pairedTileX.set(pairKey, teleport.tileX);
    await command(page, 'centerCameraOnPlayer');
    await command(page, 'refill');
    await page.waitForTimeout(120);
    const snap = await page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.());
    const colorPath = resolve(outDir, `${scenario.id}-color.png`);
    const grayscalePath = resolve(outDir, `${scenario.id}-grayscale.png`);
    await page.screenshot({ path: colorPath, fullPage: false });
    await page.evaluate(() => { document.documentElement.style.filter = 'grayscale(1)'; });
    await page.screenshot({ path: grayscalePath, fullPage: false });
    await page.evaluate(() => { document.documentElement.style.filter = ''; });
    const dom = await page.evaluate(() => ({
      title: document.title,
      href: location.href,
      canvasCount: document.querySelectorAll('#game canvas').length,
      canvasBounds: document.querySelector('#game canvas')?.getBoundingClientRect().toJSON() ?? null,
      hudVisible: Boolean(document.querySelector('.hud')) && getComputedStyle(document.querySelector('.hud')).display !== 'none',
    }));
    evidence.captures.push({
      ...scenario,
      teleport,
      actualDepth: snap?.state?.depth,
      activeBandBlend: snap?.environmentVisualProfile?.activeProfile?.activeBandBlend,
      visibleWaterSprites: snap?.environmentVisualProfile?.waterColumnLayers?.items?.filter((item) => item.visible).length ?? 0,
      dom,
      playFieldMetrics: await playFieldMetrics(page, snap),
      colorPath,
      colorBytes: (await stat(colorPath)).size,
      grayscalePath,
      grayscaleBytes: (await stat(grayscalePath)).size,
    });
  }
  await page?.close();

  for (let index = 0; index < evidence.captures.length; index += 2) {
    const before = evidence.captures[index];
    const after = evidence.captures[index + 1];
    evidence.adjacentPairs.push({
      boundary: before.boundary,
      biome: before.biome,
      actualDepths: [before.actualDepth, after.actualDepth],
      meanLumaDelta: Number(Math.abs(before.playFieldMetrics.meanLuma - after.playFieldMetrics.meanLuma).toFixed(2)),
      belowLuma24DeltaPct: Number(Math.abs(before.playFieldMetrics.belowLuma24Pct - after.playFieldMetrics.belowLuma24Pct).toFixed(2)),
    });
  }
  const deepFrames = evidence.captures.filter((capture) => capture.targetDepth >= 1030);
  const edgePassFrames = evidence.captures.filter((capture) => (
    capture.playFieldMetrics.diverEdgeContrast >= 25
    && (capture.playFieldMetrics.threatEdgeContrast === null || capture.playFieldMetrics.threatEdgeContrast >= 25)
  )).length;
  evidence.acceptance = {
    deepBelow24Ceiling: {
      targetPct: 80,
      maxObservedPct: Math.max(...deepFrames.map((capture) => capture.playFieldMetrics.belowLuma24Pct)),
      passed: deepFrames.every((capture) => capture.playFieldMetrics.belowLuma24Pct <= 80),
    },
    adjacentMeanLumaDelta: {
      target: 8,
      maxObserved: Math.max(...evidence.adjacentPairs.map((pair) => pair.meanLumaDelta)),
      passed: evidence.adjacentPairs.every((pair) => pair.meanLumaDelta <= 8),
    },
    adjacentBelow24DeltaPct: {
      target: 10,
      maxObserved: Math.max(...evidence.adjacentPairs.map((pair) => pair.belowLuma24DeltaPct)),
      passed: evidence.adjacentPairs.every((pair) => pair.belowLuma24DeltaPct <= 10),
    },
    subjectEdgeContrast: {
      targetLuma: 25,
      targetFramePct: 95,
      passingFrames: edgePassFrames,
      sampledFrames: evidence.captures.length,
      passingFramePct: Number((edgePassFrames / evidence.captures.length * 100).toFixed(2)),
      passed: edgePassFrames / evidence.captures.length >= 0.95,
    },
    interactionText: {
      targetRatio: 4.5,
      presentFrames: evidence.captures.filter((capture) => capture.playFieldMetrics.interactionText.present).length,
      status: evidence.captures.some((capture) => capture.playFieldMetrics.interactionText.present) ? 'UNMEASURED' : 'NOT_PRESENT',
    },
    runtimeIdentity: {
      passed: evidence.runtimeErrors.length === 0 && evidence.captures.every((capture) => (
        capture.dom.title === 'Abyssal Salvage'
        && capture.dom.canvasCount === 1
        && capture.dom.hudVisible
      )),
    },
  };
  evidence.generatedAt = new Date().toISOString();
  evidence.serverLogs = serverLogs.join('').slice(-4000);
  const output = resolve(outDir, 'slice1-visual-evidence.json');
  await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ output, captures: evidence.captures.length, acceptance: evidence.acceptance, runtimeErrors: evidence.runtimeErrors.length }, null, 2));
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

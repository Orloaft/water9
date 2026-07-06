import { spawn, spawnSync } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const repoRoot = '/mnt/nxt-dev/water9';
const outDir = '/mnt/nxt-dev/water9/runs/water9-biome-landmark-transition-audit-2026-07-06/b1';
const host = '127.0.0.1';
const selector = '#game canvas';
const viewport = { width: 1280, height: 800 };
const preferredPort = Number(process.env.B1_AUDIT_PORT ?? 5180);

const scenarios = [
  { key: 'b1-surface-very-shallow-depth119', biome: 1, depth: 119, note: 'B1 surface/very-shallow normal gameplay near first-water' },
  { key: 'b1-mid-depth760', biome: 1, depth: 760, note: 'B1 mid-band normal gameplay' },
  { key: 'b1-lower-before-b2-cutoff-depth1260', biome: 1, depth: 1260, note: 'B1 lower-band normal gameplay before B1->B2/late-run transition handoff' },
];

function git(args) {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  if (result.status !== 0) return `ERROR: ${result.stderr.trim() || result.stdout.trim()}`;
  return result.stdout.trim();
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function isPortAvailable(candidatePort) {
  return new Promise((resolveAvailable) => {
    const probe = createServer();
    probe.once('error', () => resolveAvailable(false));
    probe.once('listening', () => probe.close(() => resolveAvailable(true)));
    probe.listen(candidatePort, host);
  });
}

async function choosePort() {
  for (let port = preferredPort; port <= 5199; port += 1) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`no available proof port in 5180-5199 starting at ${preferredPort}`);
}

async function waitForServer(url, server, logs, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`dev server exited with code ${server.exitCode}\n${logs.join('').slice(-4000)}`);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite is still starting.
    }
    await sleep(150);
  }
  throw new Error(`dev server not ready within ${timeoutMs}ms`);
}

async function waitForPlaytest(page, biome) {
  await page.waitForFunction((targetBiome) => {
    const api = window.__AQUA_PLAYTEST__;
    const snap = api?.snapshot?.();
    return Boolean(api?.command) && snap?.world?.ready !== false && snap?.state?.biome === targetBiome;
  }, biome, { timeout: 30000 });
}

async function command(page, biome, name, value) {
  await waitForPlaytest(page, biome);
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null, [name, value]);
}

async function canvasPng(page, mode) {
  const dataUrl = await page.evaluate(({ sourceSelector, requestedMode }) => {
    const source = document.querySelector(sourceSelector);
    if (!source) throw new Error(`missing ${sourceSelector}`);
    const out = document.createElement('canvas');
    out.width = source.width;
    out.height = source.height;
    const context = out.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('missing output canvas context');
    context.drawImage(source, 0, 0);
    if (requestedMode === 'grayscale') {
      const image = context.getImageData(0, 0, out.width, out.height);
      const data = image.data;
      for (let i = 0; i < data.length; i += 4) {
        const y = Math.round(data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722);
        data[i] = y;
        data[i + 1] = y;
        data[i + 2] = y;
      }
      context.putImageData(image, 0, 0);
    }
    return out.toDataURL('image/png');
  }, { sourceSelector: selector, requestedMode: mode });
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

async function fileBytes(path) {
  try {
    return (await stat(path)).size;
  } catch {
    return 0;
  }
}

async function canvasStats(page) {
  return page.evaluate((sourceSelector) => {
    const canvas = document.querySelector(sourceSelector);
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false, width: 0, height: 0 };
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let samples = 0;
    let lumaMin = 255;
    let lumaMax = 0;
    let lumaSum = 0;
    let lumaSqSum = 0;
    for (let y = 0; y < canvas.height; y += 8) {
      for (let x = 0; x < canvas.width; x += 8) {
        const i = (y * canvas.width + x) * 4;
        const luma = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
        lumaMin = Math.min(lumaMin, luma);
        lumaMax = Math.max(lumaMax, luma);
        lumaSum += luma;
        lumaSqSum += luma * luma;
        samples += 1;
      }
    }
    const mean = samples ? lumaSum / samples : 0;
    const variance = samples ? Math.max(0, lumaSqSum / samples - mean * mean) : 0;
    return {
      exists: true,
      width: canvas.width,
      height: canvas.height,
      samples,
      lumaMin: Number(lumaMin.toFixed(3)),
      lumaMax: Number(lumaMax.toFixed(3)),
      lumaRange: Number((lumaMax - lumaMin).toFixed(3)),
      lumaMean: Number(mean.toFixed(3)),
      lumaStdDev: Number(Math.sqrt(variance).toFixed(3)),
    };
  }, selector);
}

function compactEnvironment(snapshot) {
  const review = snapshot?.environmentVisualProfile;
  const anchors = review?.anchors?.items ?? [];
  return {
    stateBiome: snapshot?.state?.biome,
    stateDepth: snapshot?.state?.depth,
    profile: review?.activeProfile,
    activeBand: review?.activeBand,
    activeBandBlend: review?.activeProfile?.activeBandBlend,
    anchorAssetPool: review?.anchors?.assets?.map((asset) => asset.id),
    anchorCount: anchors.length,
    anchors: anchors.map((anchor) => ({
      id: anchor.id,
      assetId: anchor.assetId,
      textureKey: anchor.textureKey,
      alpha: anchor.alpha,
      x: anchor.x,
      y: anchor.y,
      width: anchor.width,
      height: anchor.height,
      parallaxFactor: anchor.parallaxFactor,
    })),
    layers: review?.layers?.map((layer) => ({
      index: layer.index,
      band: layer.band,
      textureKey: layer.textureKey,
      painterlyAssetId: layer.painterlyAssetId,
      alpha: layer.alpha,
      display: layer.display,
      activeRepeatMode: layer.activeRepeatMode,
    })),
    darkness: review?.darkness,
    waterColumnLayers: review?.worldSpaceNoise?.layers?.map((layer) => ({
      id: layer.id,
      kind: layer.kind,
      assetId: layer.assetId,
      alpha: layer.alpha,
      depthGate: layer.depthGate,
      bandScale: layer.bandScale,
    })),
    postDarknessVeil: review?.worldSpaceNoise?.postDarknessVeil,
    foregroundLayers: snapshot?.foregroundLayers,
    camera: snapshot?.camera,
  };
}

await mkdir(outDir, { recursive: true });
const port = await choosePort();
const baseUrl = `http://${host}:${port}/`;
const logs = [];
const server = spawn('npm', ['run', 'dev', '--', '--port', String(port), '--strictPort'], {
  cwd: repoRoot,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, BROWSER: 'none' },
});
server.stdout.on('data', (chunk) => logs.push(String(chunk)));
server.stderr.on('data', (chunk) => logs.push(String(chunk)));

const browser = await chromium.launch({ headless: true });
const outputs = [];
try {
  await waitForServer(baseUrl, server, logs);
  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
        errors.push({ type: 'console', text: message.text() });
      }
    });
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
    });
    const url = `${baseUrl}?playtest=1&biome=${scenario.biome}&renderer=canvas`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForPlaytest(page, scenario.biome);
    await command(page, scenario.biome, 'start');
    await command(page, scenario.biome, 'dive');
    const move = await command(page, scenario.biome, 'teleportToReachableDepth', scenario.depth);
    await command(page, scenario.biome, 'centerCameraOnPlayer');
    await command(page, scenario.biome, 'clearProofOverlays');
    await page.waitForTimeout(1000);
    const snapshot = await page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
    const colorPath = resolve(outDir, `${scenario.key}-normal-gameplay-canvas.png`);
    const grayscalePath = resolve(outDir, `${scenario.key}-normal-gameplay-canvas-grayscale.png`);
    await writeFile(colorPath, await canvasPng(page, 'color'));
    await writeFile(grayscalePath, await canvasPng(page, 'grayscale'));
    outputs.push({
      ...scenario,
      url,
      selectedPort: port,
      sourceSelector: selector,
      viewport,
      captureMethod: 'Playwright Chromium; normal ?playtest biome route; start+dive; teleportToReachableDepth; centerCameraOnPlayer; no backgroundReview staging before screenshot; direct #game canvas toDataURL.',
      move,
      colorPath,
      grayscalePath,
      colorBytes: await fileBytes(colorPath),
      grayscaleBytes: await fileBytes(grayscalePath),
      canvasStats: await canvasStats(page),
      environment: compactEnvironment(snapshot),
      errors,
    });
    await page.close();
  }
} finally {
  await browser.close();
  server.kill('SIGTERM');
}

const proofPath = resolve(outDir, 'b1-landmark-transition-proof.json');
await writeFile(proofPath, `${JSON.stringify({
  schema: 'water9/b1-landmark-transition-audit@1',
  generatedAt: new Date().toISOString(),
  repoRoot: git(['rev-parse', '--show-toplevel']),
  head: git(['rev-parse', '--short', 'HEAD']),
  selectedPort: port,
  baseUrl,
  outputs,
  serverLogTail: logs.join('').slice(-4000),
}, null, 2)}\n`);
console.log(proofPath);

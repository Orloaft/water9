import { spawn, spawnSync } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const repoRoot = '/mnt/nxt-dev/water9';
const outDir = '/mnt/nxt-dev/water9/runs/water9-b1-signature-landmark-restore-2026-07-06';
const host = '127.0.0.1';
const selector = '#game canvas';
const viewport = { width: 1280, height: 800 };
const preferredPort = Number(process.env.B1_SIGNATURE_PORT ?? 5180);
const signatureAssetId = 'biome-shallows-living-coral-terrace';
const signatureTextureKey = 'water9-biome-landmark-shallows-living-coral-terrace';
const signatureRuntimePath = '/assets/generated/background-phase3/water9-biome-landmark-shallows-living-coral-terrace.png';

const scenarios = [
  {
    key: 'b1-first-water-depth78-surface-signature',
    biome: 1,
    depthMeters: 78,
    teleport: 'exactDepth',
    note: 'B1 first-water/surface below 120m; should show the signature landmark immediately',
    requireSignature: true,
    requireBand: 'surface',
  },
  {
    key: 'b1-mid-depth558-signature',
    biome: 1,
    depthMeters: 640,
    teleport: 'reachableDepth',
    note: 'normal-play upper/mid B1; proves the signature stays readable after the first surface moment',
    requireSignature: true,
  },
  {
    key: 'b2-preservation-depth420',
    biome: 2,
    depthMeters: 420,
    teleport: 'reachableDepth',
    note: 'outside-B1 preservation capture because shared manifest/render metadata changed',
    requireSignature: false,
  },
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

async function runtimeAssetFetch(page) {
  return page.evaluate(async (path) => {
    const response = await fetch(path, { cache: 'no-store' });
    const buffer = await response.arrayBuffer();
    return {
      path,
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type'),
      bytes: buffer.byteLength,
    };
  }, signatureRuntimePath);
}

function compactEnvironment(snapshot) {
  const review = snapshot?.environmentVisualProfile;
  const anchors = review?.anchors?.items ?? [];
  const rendered = review?.renderedBitmapAnchors ?? [];
  const manifestAsset = review?.manifest?.find((asset) => asset.id === signatureAssetId) ?? null;
  return {
    stateBiome: snapshot?.state?.biome,
    stateDepth: snapshot?.state?.depth,
    profile: review?.activeProfile,
    activeBand: review?.activeBand,
    activeBandBlend: review?.activeProfile?.activeBandBlend,
    anchorAssetPool: review?.anchors?.assets?.map((asset) => ({
      id: asset.id,
      textureKey: asset.textureKey,
      path: asset.path,
      sourceStatus: asset.sourceStatus,
      availableInRuntime: asset.availableInRuntime,
    })),
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
    signatureManifest: manifestAsset,
    renderedSignatureSprites: rendered.filter((sprite) => sprite.textureKey === signatureTextureKey),
    renderedBitmapAnchors: rendered.map((sprite) => ({
      textureKey: sprite.textureKey,
      sourceDimensions: sprite.sourceDimensions,
      alpha: sprite.alpha,
      screenBounds: sprite.screenBounds,
      generatedBackgroundTexture: sprite.generatedBackgroundTexture,
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
    camera: snapshot?.camera,
  };
}

function validateScenario(scenario, environment, fetchProof) {
  const failures = [];
  const signatureAnchors = environment.anchors.filter((anchor) => anchor.assetId === signatureAssetId && anchor.textureKey === signatureTextureKey);
  if (scenario.requireBand && environment.activeBand?.id !== scenario.requireBand) {
    failures.push(`expected ${scenario.requireBand} band, saw ${environment.activeBand?.id ?? 'missing'}`);
  }
  if (scenario.requireSignature && signatureAnchors.length < 1) failures.push('signature anchor absent');
  if (!scenario.requireSignature && signatureAnchors.length > 0) failures.push('signature anchor leaked outside B1');
  if (scenario.requireSignature && !environment.renderedSignatureSprites.length) failures.push('signature bitmap sprite absent from renderer');
  if (scenario.requireSignature && !environment.signatureManifest?.availableInRuntime) failures.push('signature manifest entry not runtime-available');
  if (scenario.requireSignature && environment.signatureManifest?.path !== signatureRuntimePath) failures.push(`signature path mismatch: ${environment.signatureManifest?.path ?? 'missing'}`);
  if (scenario.requireSignature && !fetchProof.ok) failures.push(`signature asset fetch failed: ${fetchProof.status}`);
  return failures;
}

await mkdir(outDir, { recursive: true });
const port = await choosePort();
const baseUrl = `http://${host}:${port}/`;
const logs = [];
const server = spawn('npm', ['run', 'dev', '--', '--port', String(port), '--strictPort'], {
  cwd: repoRoot,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, BROWSER: 'none' },
  detached: true,
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
    const move = scenario.teleport === 'exactDepth'
      ? await command(page, scenario.biome, 'teleportDepth', scenario.depthMeters / 6 * 16)
      : await command(page, scenario.biome, 'teleportToReachableDepth', scenario.depthMeters);
    await command(page, scenario.biome, 'centerCameraOnPlayer');
    await command(page, scenario.biome, 'clearProofOverlays');
    await page.waitForTimeout(1200);
    const snapshot = await page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
    const environment = compactEnvironment(snapshot);
    const fetchProof = await runtimeAssetFetch(page);
    const colorPath = resolve(outDir, `${scenario.key}-normal-gameplay-canvas.png`);
    const grayscalePath = resolve(outDir, `${scenario.key}-normal-gameplay-canvas-grayscale.png`);
    await writeFile(colorPath, await canvasPng(page, 'color'));
    await writeFile(grayscalePath, await canvasPng(page, 'grayscale'));
    const validationFailures = validateScenario(scenario, environment, fetchProof);
    outputs.push({
      ...scenario,
      url,
      selectedPort: port,
      sourceSelector: selector,
      viewport,
      captureMethod: 'Playwright Chromium; normal ?playtest biome route; start+dive; playtest movement only; no backgroundReview staging; direct #game canvas toDataURL.',
      move,
      runtimeAssetFetch: fetchProof,
      colorPath,
      grayscalePath,
      colorBytes: await fileBytes(colorPath),
      grayscaleBytes: await fileBytes(grayscalePath),
      canvasStats: await canvasStats(page),
      environment,
      validationFailures,
      errors,
    });
    await page.close();
  }
} finally {
  await browser.close();
  if (server.pid) {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {
      server.kill('SIGTERM');
    }
  }
  await sleep(500);
}

const failures = outputs.flatMap((output) => [
  ...output.validationFailures.map((failure) => `${output.key}: ${failure}`),
  ...output.errors.map((error) => `${output.key}: ${JSON.stringify(error)}`),
]);
const proofPath = resolve(outDir, 'b1-signature-landmark-proof.json');
await writeFile(proofPath, `${JSON.stringify({
  schema: 'water9/b1-signature-landmark-proof@1',
  generatedAt: new Date().toISOString(),
  repoRoot: git(['rev-parse', '--show-toplevel']),
  head: git(['rev-parse', '--short', 'HEAD']),
  signatureAssetId,
  signatureTextureKey,
  signatureRuntimePath,
  selectedPort: port,
  baseUrl,
  outputs,
  failures,
  serverLogTail: logs.join('').slice(-4000),
}, null, 2)}\n`);
console.log(proofPath);
if (failures.length) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exit(1);
}

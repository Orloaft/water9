import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const repoRoot = '/mnt/nxt-dev/water9';
const outDir = resolve(repoRoot, 'runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07');
const host = '127.0.0.1';
const selector = '#game canvas';
const viewport = { width: 1280, height: 800 };

const scenarios = [
  { key: 'surface-fauna-blue-ring-octopus', biome: 1, depth: 'surface', species: 'Blue-ring Octopus', assetKey: 'fauna-shallow-blue-ring-octopus', distance: 44, sourcePath: 'public/assets/source/fauna-flora-source-art-slice-3/fauna-shallow-blue-ring-octopus-source.png' },
  { key: 'surface-fauna-octopus', biome: 1, depth: 'surface', species: 'Tidepool Octopus', assetKey: 'fauna-shallow-octopus', distance: 44, sourcePath: 'public/assets/source/fauna-flora-source-art-slice-3/fauna-shallow-octopus-source.png' },
  { key: 'surface-fauna-comb-jelly', biome: 1, depth: 'surface', species: 'Comb Jelly', assetKey: 'fauna-shallow-comb-jelly', distance: 44, sourcePath: 'public/assets/source/fauna-flora-source-art-slice-3/fauna-shallow-comb-jelly-source.png' },
  { key: 'surface-fauna-glass-ray', biome: 1, depth: 'surface', species: 'Glass Ray', assetKey: 'fauna-shallow-glass-ray', distance: 48, sourcePath: 'public/assets/source/fauna-flora-source-art-slice-3/fauna-shallow-glass-ray-source.png' },
  { key: 'surface-fauna-mantis-shrimp', biome: 1, depth: 'surface', species: 'Mantis Shrimp', assetKey: 'fauna-shallow-mantis-shrimp', distance: 42, sourcePath: 'public/assets/source/fauna-flora-source-art-slice-3/fauna-shallow-mantis-shrimp-source.png' },
  { key: 'surface-fauna-snap-shrimp', biome: 1, depth: 'surface', species: 'Snapping Shrimp', assetKey: 'fauna-shallow-snap-shrimp', distance: 38, sourcePath: 'public/assets/source/fauna-flora-source-art-slice-3/fauna-shallow-snap-shrimp-source.png' },
  { key: 'mid-fauna-sea-spider', biome: 2, depth: 'mid', species: 'Sea Spider', assetKey: 'fauna-deep-sea-spider', distance: 42, sourcePath: 'public/assets/source/fauna-flora-source-art-slice-3/fauna-deep-sea-spider-source.png' },
  { key: 'mid-fauna-tripodfish', biome: 2, depth: 'mid', species: 'Tripodfish', assetKey: 'fauna-deep-tripodfish', distance: 46, sourcePath: 'public/assets/source/fauna-flora-source-art-slice-3/fauna-deep-tripodfish-source.png' },
];

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function portAvailable(port) {
  return new Promise((resolveAvailable) => {
    const server = createServer();
    server.once('error', () => resolveAvailable(false));
    server.once('listening', () => server.close(() => resolveAvailable(true)));
    server.listen(port, host);
  });
}

async function pickPort() {
  for (let port = 5180; port <= 5199; port += 1) {
    if (await portAvailable(port)) return port;
  }
  throw new Error('no available dev server port in 5180-5199');
}

async function waitForServer(baseUrl, server, logs) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`dev server exited with code ${server.exitCode}\n${logs.join('').slice(-4000)}`);
    try {
      const response = await fetch(baseUrl, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite is still starting.
    }
    await sleep(150);
  }
  throw new Error(`dev server was not ready\n${logs.join('').slice(-4000)}`);
}

async function command(page, name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => {
    return window.__AQUA_PLAYTEST__?.command?.(commandName, commandValue) ?? null;
  }, [name, value]);
  await page.waitForTimeout(result?.restarting ? 300 : 140);
  return result;
}

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function setupBiome(page, baseUrl, biome) {
  const url = new URL(baseUrl);
  url.searchParams.set('playtest', '1');
  url.searchParams.set('renderer', 'canvas');
  url.searchParams.set('biome', String(biome));
  await page.goto(url.toString(), { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForFunction((targetBiome) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(window.__AQUA_PLAYTEST__?.command && snap?.world?.ready !== false && snap?.state?.biome === targetBiome);
  }, biome, { timeout: 45000 });
  await command(page, 'start');
  await command(page, 'dive');
  await command(page, 'clearProofOverlays');
}

async function canvasPng(page, grayscale = false) {
  const dataUrl = await page.evaluate(({ sourceSelector, grayscaleMode }) => {
    const source = document.querySelector(sourceSelector);
    if (!source) throw new Error(`missing ${sourceSelector}`);
    if (!grayscaleMode) return source.toDataURL('image/png');
    const out = document.createElement('canvas');
    out.width = source.width;
    out.height = source.height;
    const context = out.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('missing grayscale context');
    context.drawImage(source, 0, 0);
    const image = context.getImageData(0, 0, out.width, out.height);
    for (let index = 0; index < image.data.length; index += 4) {
      const luma = Math.round(image.data[index] * 0.2126 + image.data[index + 1] * 0.7152 + image.data[index + 2] * 0.0722);
      image.data[index] = luma;
      image.data[index + 1] = luma;
      image.data[index + 2] = luma;
    }
    context.putImageData(image, 0, 0);
    return out.toDataURL('image/png');
  }, { sourceSelector: selector, grayscaleMode: grayscale });
  return Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
}

async function canvasMetrics(page) {
  return page.evaluate((sourceSelector) => {
    const canvas = document.querySelector(sourceSelector);
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false };
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let min = 255;
    let max = 0;
    let samples = 0;
    let varied = 0;
    for (let y = 0; y < canvas.height; y += 8) {
      for (let x = 0; x < canvas.width; x += 8) {
        const i = (y * canvas.width + x) * 4;
        const luma = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
        min = Math.min(min, luma);
        max = Math.max(max, luma);
        if (data[i + 3] > 12) varied += 1;
        samples += 1;
      }
    }
    return {
      exists: true,
      width: canvas.width,
      height: canvas.height,
      samples,
      variedSamples: varied,
      lumaMin: Number(min.toFixed(2)),
      lumaMax: Number(max.toFixed(2)),
      lumaRange: Number((max - min).toFixed(2)),
    };
  }, selector);
}

async function fileBytes(path) {
  return (await stat(path)).size;
}

async function sha256(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function writeCapture(page, scenario, target, extra = {}) {
  await page.waitForTimeout(320);
  const colorPath = resolve(outDir, `canvas-${scenario.key}.png`);
  const grayscalePath = resolve(outDir, `canvas-${scenario.key}-grayscale.png`);
  const viewportPath = resolve(outDir, `viewport-${scenario.key}.png`);
  await writeFile(colorPath, await canvasPng(page, false));
  await writeFile(grayscalePath, await canvasPng(page, true));
  await page.screenshot({ path: viewportPath, fullPage: false });
  const runtimePath = `public/assets/generated/${scenario.assetKey}.png`;
  const frameManifestPath = `public/assets/generated/${scenario.assetKey}.frames.json`;
  const snap = await snapshot(page);
  return {
    ...scenario,
    kind: 'fauna',
    colorPath,
    grayscalePath,
    viewportPath,
    runtimePath,
    frameManifestPath,
    runtimeSha256: await sha256(resolve(repoRoot, runtimePath)),
    sourceSha256: await sha256(resolve(repoRoot, scenario.sourcePath)),
    frameManifestSource: JSON.parse(await readFile(resolve(repoRoot, frameManifestPath), 'utf8')).source ?? null,
    colorBytes: await fileBytes(colorPath),
    grayscaleBytes: await fileBytes(grayscalePath),
    viewportBytes: await fileBytes(viewportPath),
    metrics: await canvasMetrics(page),
    target,
    state: snap?.state ?? null,
    camera: snap?.camera ?? null,
    player: snap?.player ?? null,
    ...extra,
  };
}

async function captureFauna(page, baseUrl, scenario) {
  await setupBiome(page, baseUrl, scenario.biome);
  await page.waitForFunction(({ species, assetKey }) => {
    const fish = window.__AQUA_PLAYTEST__?.snapshot?.()?.fish ?? [];
    return fish.some((entry) => entry.species === species && entry.assetKey === assetKey);
  }, { species: scenario.species, assetKey: scenario.assetKey }, { timeout: 30000 });
  const teleport = await command(page, 'teleportToFauna', { species: scenario.species, assetKey: scenario.assetKey, distance: scenario.distance });
  await command(page, 'clearProofOverlays');
  const snap = await snapshot(page);
  const target = snap?.fish?.find((fish) => fish.species === scenario.species && fish.assetKey === scenario.assetKey && fish.screenVisible)
    ?? snap?.fish?.find((fish) => fish.species === scenario.species && fish.assetKey === scenario.assetKey)
    ?? null;
  return writeCapture(page, scenario, target, { teleport });
}

const port = await pickPort();
const baseUrl = `http://${host}:${port}/`;
const server = spawn(resolve(repoRoot, 'node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: repoRoot,
  stdio: ['ignore', 'pipe', 'pipe'],
});
const serverLogs = [];
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  const text = message.text();
  if (message.type() === 'error' && !text.startsWith('Texture key already in use:')) errors.push({ type: 'console', text });
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
});

let ok = false;
try {
  await waitForServer(baseUrl, server, serverLogs);
  const captures = [];
  for (const scenario of scenarios) captures.push(await captureFauna(page, baseUrl, scenario));
  const failures = [];
  for (const capture of captures) {
    if (capture.colorBytes < 25000) failures.push(`${capture.key}: color canvas proof too small (${capture.colorBytes})`);
    if (capture.grayscaleBytes < 20000) failures.push(`${capture.key}: grayscale canvas proof too small (${capture.grayscaleBytes})`);
    if (!capture.metrics.exists || capture.metrics.lumaRange < 20) failures.push(`${capture.key}: weak canvas metrics ${JSON.stringify(capture.metrics)}`);
    if (capture.target?.assetKey !== capture.assetKey) failures.push(`${capture.key}: target not found with expected asset key`);
    if (capture.frameManifestSource?.path !== capture.sourcePath) failures.push(`${capture.key}: frame manifest source path mismatch`);
  }
  if (errors.length) failures.push(`runtime errors: ${JSON.stringify(errors.slice(0, 5))}`);
  const report = {
    ok: failures.length === 0,
    generatedAt: new Date().toISOString(),
    port,
    selector,
    captures,
    failures,
    errors,
    serverLogs: serverLogs.join('').slice(-4000),
  };
  await writeFile(resolve(outDir, 'source-art-slice-3-normal-play-proof.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, port, captures: captures.length, failures }, null, 2));
  ok = report.ok;
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  await writeFile(resolve(outDir, 'source-art-slice-3-normal-play-proof.json'), `${JSON.stringify({ ok: false, port, errors, serverLogs: serverLogs.join('').slice(-4000) }, null, 2)}\n`);
  console.error(JSON.stringify({ ok: false, port, errors }, null, 2));
} finally {
  await browser.close().catch(() => {});
  if (server.exitCode === null) server.kill('SIGTERM');
}

if (!ok) process.exit(1);

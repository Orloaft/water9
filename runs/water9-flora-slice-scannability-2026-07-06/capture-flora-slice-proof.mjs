import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const repoRoot = '/mnt/nxt-dev/water9';
const outDir = resolve(repoRoot, 'runs/water9-flora-slice-scannability-2026-07-06');
const host = '127.0.0.1';
const selector = '#game canvas';
const viewport = { width: 1280, height: 800 };
const surfaceY = 96;

const scannableScenarios = [
  { key: 'b1-moon-sponge', biome: 1, species: 'Moon Sponge', label: 'B1 Moon Sponge replacement', assetKey: 'terrain-edge-flora-moon-sponge' },
  { key: 'b1-sting-anemone', biome: 1, species: 'Sting Anemone', label: 'B1 Sting Anemone replacement', assetKey: 'terrain-edge-flora-sting-anemone' },
  { key: 'b2-vent-coral', biome: 2, species: 'Vent Coral', label: 'B2 Vent Coral replacement', assetKey: 'terrain-edge-flora-vent-coral' },
  { key: 'b2-ember-bloom', biome: 2, species: 'Ember Bloom', label: 'B2 Ember Bloom replacement', assetKey: 'terrain-edge-flora-ember-bloom' },
];

const decorativeScenarios = [
  { key: 'b1-decorative-terrain-flora-comparison', biome: 1, depth: 460, label: 'B1 decorative terrain-flora comparison' },
  { key: 'b2-decorative-terrain-flora-comparison', biome: 2, depth: 760, label: 'B2 decorative terrain-flora comparison' },
];

function git(args) {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : `ERROR: ${result.stderr.trim() || result.stdout.trim()}`;
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function isPortAvailable(port) {
  return new Promise((resolveAvailable) => {
    const server = createServer();
    server.once('error', () => resolveAvailable(false));
    server.once('listening', () => server.close(() => resolveAvailable(true)));
    server.listen(port, host);
  });
}

async function choosePort() {
  for (let port = 5180; port <= 5199; port += 1) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error('no available dev server port in 5180-5199');
}

async function waitForServer(baseUrl, server, logs, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
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
  throw new Error(`dev server was not ready within ${timeoutMs}ms\n${logs.join('').slice(-4000)}`);
}

async function waitForReady(page, biome) {
  await page.waitForFunction((targetBiome) => {
    const api = window.__AQUA_PLAYTEST__;
    const snap = api?.snapshot?.();
    return Boolean(api?.command && snap?.world?.ready !== false && snap?.state?.biome === targetBiome);
  }, biome, { timeout: 45000 });
}

async function command(page, name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => {
    return window.__AQUA_PLAYTEST__?.command?.(commandName, commandValue) ?? null;
  }, [name, value]);
  await page.waitForTimeout(180);
  return result;
}

async function setupPage(browser, baseUrl, biome, errors) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
      errors.push({ type: 'console', text: message.text() });
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
  });
  const url = new URL(baseUrl);
  url.searchParams.set('playtest', '1');
  url.searchParams.set('biome', String(biome));
  url.searchParams.set('renderer', 'canvas');
  await page.goto(url.toString(), { waitUntil: 'networkidle', timeout: 45000 });
  await waitForReady(page, biome);
  await command(page, 'start');
  await command(page, 'dive');
  await command(page, 'clearProofOverlays');
  return { page, url: url.toString() };
}

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

function floraDepth(flora) {
  return Math.round((Number(flora.y) - surfaceY) / 6);
}

function chooseFlora(snapshotData, scenario) {
  const gameplay = (snapshotData?.floraAnchors?.gameplay ?? []).filter((flora) => !flora.dead && flora.hasSurface);
  const candidates = gameplay
    .map((flora, candidateIndex) => {
      const nearestOtherDistance = gameplay.reduce((nearest, other) => {
        if (other === flora) return nearest;
        const dx = Number(other.x) - Number(flora.x);
        const dy = Number(other.y) - Number(flora.y);
        return Math.min(nearest, Math.hypot(dx, dy));
      }, Number.POSITIVE_INFINITY);
      return { ...flora, candidateIndex, depthMeters: floraDepth(flora), nearestOtherDistance };
    })
    .filter((flora) => flora.species === scenario.species);
  const terrainEdgeFirst = [...candidates].sort((a, b) => {
    const assetA = a.assetKey === scenario.assetKey ? 0 : 1;
    const assetB = b.assetKey === scenario.assetKey ? 0 : 1;
    if (assetA !== assetB) return assetA - assetB;
    if (Math.abs(a.nearestOtherDistance - b.nearestOtherDistance) > 1) return b.nearestOtherDistance - a.nearestOtherDistance;
    return a.depthMeters - b.depthMeters;
  });
  return { target: terrainEdgeFirst[0] ?? null, candidates };
}

function selectedFloraFromSnapshot(snapshotData, scenario, selected) {
  const gameplay = snapshotData?.floraAnchors?.gameplay ?? [];
  return gameplay
    .filter((flora) => flora.species === scenario.species && flora.assetKey === scenario.assetKey)
    .map((flora) => ({
      ...flora,
      selectedDistance: Math.hypot(Number(flora.x) - Number(selected.x), Number(flora.y) - Number(selected.y)),
    }))
    .sort((a, b) => a.selectedDistance - b.selectedDistance)[0] ?? null;
}

function activeDecorativeStamps(snapshotData) {
  const active = snapshotData?.terrainLookReview?.stampPools?.activeEnvironment ?? [];
  return active.filter((key) => String(key).startsWith('terrain-stamp-'));
}

async function canvasPng(page, mode = 'color') {
  const dataUrl = await page.evaluate(({ sourceSelector, requestedMode }) => {
    const source = document.querySelector(sourceSelector);
    if (!source) throw new Error(`missing ${sourceSelector}`);
    if (requestedMode !== 'grayscale') return source.toDataURL('image/png');
    const out = document.createElement('canvas');
    out.width = source.width;
    out.height = source.height;
    const context = out.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('missing grayscale context');
    context.drawImage(source, 0, 0);
    const image = context.getImageData(0, 0, out.width, out.height);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      const y = Math.round(data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722);
      data[i] = y;
      data[i + 1] = y;
      data[i + 2] = y;
    }
    context.putImageData(image, 0, 0);
    return out.toDataURL('image/png');
  }, { sourceSelector: selector, requestedMode: mode });
  return Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
}

async function canvasMetrics(page) {
  return page.evaluate((sourceSelector) => {
    const canvas = document.querySelector(sourceSelector);
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false, width: 0, height: 0 };
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let samples = 0;
    let min = 255;
    let max = 0;
    let sum = 0;
    let sumSq = 0;
    for (let y = 0; y < canvas.height; y += 8) {
      for (let x = 0; x < canvas.width; x += 8) {
        const i = (y * canvas.width + x) * 4;
        const luma = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
        min = Math.min(min, luma);
        max = Math.max(max, luma);
        sum += luma;
        sumSq += luma * luma;
        samples += 1;
      }
    }
    const mean = sum / Math.max(1, samples);
    const variance = Math.max(0, sumSq / Math.max(1, samples) - mean * mean);
    return {
      exists: true,
      width: canvas.width,
      height: canvas.height,
      samples,
      lumaMin: Number(min.toFixed(2)),
      lumaMax: Number(max.toFixed(2)),
      lumaRange: Number((max - min).toFixed(2)),
      lumaMean: Number(mean.toFixed(2)),
      lumaStdDev: Number(Math.sqrt(variance).toFixed(2)),
    };
  }, selector);
}

async function fileBytes(path) {
  return (await stat(path)).size;
}

async function writeCapture(page, scenario, extra = {}) {
  await page.waitForTimeout(300);
  const colorPath = resolve(outDir, `canvas-${scenario.key}.png`);
  const grayscalePath = resolve(outDir, `canvas-${scenario.key}-grayscale.png`);
  const viewportPath = resolve(outDir, `viewport-${scenario.key}.png`);
  await writeFile(colorPath, await canvasPng(page, 'color'));
  await writeFile(grayscalePath, await canvasPng(page, 'grayscale'));
  await page.screenshot({ path: viewportPath, fullPage: false });
  const snap = await snapshot(page);
  return {
    key: scenario.key,
    biome: scenario.biome,
    species: scenario.species ?? '',
    assetKey: scenario.assetKey ?? '',
    label: scenario.label,
    colorPath,
    grayscalePath,
    viewportPath,
    colorBytes: await fileBytes(colorPath),
    grayscaleBytes: await fileBytes(grayscalePath),
    viewportBytes: await fileBytes(viewportPath),
    metrics: await canvasMetrics(page),
    state: snap?.state,
    camera: snap?.camera,
    player: snap?.player,
    terrainLookReview: snap?.terrainLookReview,
    decorativeStampEvidence: activeDecorativeStamps(snap),
    visibleScannableFlora: (snap?.floraAnchors?.gameplay ?? [])
      .filter((flora) => !flora.dead && flora.x >= snap.camera.x && flora.x <= snap.camera.x + snap.camera.width && flora.y >= snap.camera.y && flora.y <= snap.camera.y + snap.camera.height)
      .map((flora) => ({
        species: flora.species,
        assetKey: flora.assetKey,
        depthMeters: floraDepth(flora),
        scanned: flora.scanned,
        hazardous: flora.hazardous,
        anchor: flora.anchor,
        supported: flora.supported,
      })),
    ...extra,
  };
}

async function imageDataUrl(path) {
  const data = await readFile(path);
  return `data:image/png;base64,${data.toString('base64')}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function buildContactSheet(browser, captures) {
  const cards = [];
  for (const capture of captures) {
    const color = await imageDataUrl(capture.colorPath);
    const gray = await imageDataUrl(capture.grayscalePath);
    const viewportShot = await imageDataUrl(capture.viewportPath);
    cards.push(`
      <article>
        <h2>${escapeHtml(capture.label)}</h2>
        <p>${escapeHtml(capture.key)} · biome ${capture.biome} · depth ${escapeHtml(capture.state?.depth ?? 'unknown')}m · scan target ${escapeHtml(capture.scanEvidence?.scanTargetAfterHold ?? capture.player?.scanTarget ?? '')}</p>
        <div class="viewport"><img src="${viewportShot}" alt="${escapeHtml(capture.key)} viewport"></div>
        <div class="pair">
          <figure><img src="${color}" alt="${escapeHtml(capture.key)} color"><figcaption>live #game canvas</figcaption></figure>
          <figure><img src="${gray}" alt="${escapeHtml(capture.key)} grayscale"><figcaption>grayscale pass</figcaption></figure>
        </div>
      </article>`);
  }
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Water9 flora slice proof</title>
<style>
body { margin: 0; padding: 24px; background: #071018; color: #edf8fb; font-family: Arial, sans-serif; }
h1 { margin: 0 0 16px; font-size: 26px; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
article { border: 1px solid #274150; border-radius: 4px; padding: 12px; background: #0b1820; }
h2 { margin: 0 0 6px; font-size: 16px; color: #b9f27c; }
p { margin: 0 0 10px; font-size: 12px; line-height: 1.35; color: #aac4cc; }
.viewport img { width: 100%; display: block; border: 1px solid #2a4652; margin-bottom: 8px; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
figure { margin: 0; }
figure img { width: 100%; display: block; border: 1px solid #2a4652; background: #000; }
figcaption { padding-top: 4px; font-size: 11px; color: #8fb0ba; }
</style>
</head>
<body>
<h1>Water9 Flora Slice Runtime Proof</h1>
<div class="grid">${cards.join('\n')}</div>
</body>
</html>`;
  const htmlPath = resolve(outDir, 'flora-slice-runtime-contact-sheet.html');
  const pngPath = resolve(outDir, 'flora-slice-runtime-contact-sheet.png');
  await writeFile(htmlPath, html, 'utf8');
  const page = await browser.newPage({ viewport: { width: 1680, height: 1200 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).toString(), { waitUntil: 'load' });
  await page.screenshot({ path: pngPath, fullPage: true });
  await page.close();
  return { htmlPath, pngPath };
}

await mkdir(outDir, { recursive: true });
const port = await choosePort();
const baseUrl = `http://${host}:${port}/`;
const logs = [];
const server = spawn(resolve(repoRoot, 'node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: repoRoot,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, BROWSER: 'none' },
});
server.stdout.on('data', (chunk) => logs.push(String(chunk)));
server.stderr.on('data', (chunk) => logs.push(String(chunk)));

const browser = await chromium.launch({ headless: true });
const captures = [];
const errors = [];

try {
  await waitForServer(baseUrl, server, logs);

  for (const scenario of scannableScenarios) {
    const { page, url } = await setupPage(browser, baseUrl, scenario.biome, errors);
    const before = await snapshot(page);
    const selected = chooseFlora(before, scenario);
    if (!selected.target) {
      errors.push({ type: 'flora-selection', scenario: scenario.key, text: `no ${scenario.species} target found`, candidates: selected.candidates.length });
      await page.close();
      continue;
    }
    await command(page, 'teleportToFlora', { index: selected.target.candidateIndex });
    await command(page, 'centerCameraOnPlayer');
    await page.keyboard.down('e');
    await page.waitForTimeout(760);
    const duringScan = await snapshot(page);
    await page.waitForTimeout(900);
    const afterHold = await snapshot(page);
    const selectedAfterHold = selectedFloraFromSnapshot(afterHold, scenario, selected.target);
    const capture = await writeCapture(page, scenario, {
      url,
      selectedFlora: selected.target,
      selectedFloraAfterHold: selectedAfterHold,
      selectionCounts: { candidates: selected.candidates.length },
      scanEvidence: {
        requestedScanHoldMs: 1660,
        scanTargetDuringHold: duringScan?.player?.scanTarget ?? '',
        scanTargetAfterHold: afterHold?.player?.scanTarget ?? '',
        selectedScannedAfterHold: selectedAfterHold?.scanned ?? null,
      },
    });
    captures.push(capture);
    await page.keyboard.up('e');
    await page.close();
  }

  for (const scenario of decorativeScenarios) {
    const { page, url } = await setupPage(browser, baseUrl, scenario.biome, errors);
    const move = await command(page, 'teleportToReachableDepth', scenario.depth);
    await command(page, 'centerCameraOnPlayer');
    await command(page, 'clearProofOverlays');
    const capture = await writeCapture(page, scenario, { url, move, purpose: 'decorative-comparison' });
    captures.push(capture);
    await page.close();
  }

  const contactSheet = await buildContactSheet(browser, captures);
  const reportJsonPath = resolve(outDir, 'flora-slice-runtime-proof.json');
  await writeFile(reportJsonPath, `${JSON.stringify({
    schema: 'water9/flora-slice-runtime-proof@1',
    generatedAt: new Date().toISOString(),
    repoRoot,
    gitHead: git(['rev-parse', '--short', 'HEAD']),
    gitStatus: git(['status', '--short']),
    baseUrl,
    port,
    selector,
    viewport,
    captures,
    contactSheet,
    errors,
    serverLogs: logs.join('').slice(-4000),
  }, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ ok: errors.length === 0, outDir, port, captures: captures.length, contactSheet, reportJsonPath, errors }, null, 2));
} finally {
  await browser.close().catch(() => {});
  server.kill('SIGTERM');
  await sleep(350);
  const shutdownPath = resolve(outDir, 'dev-server-shutdown.json');
  await writeFile(shutdownPath, `${JSON.stringify({ port, serverShutdown: server.exitCode !== null || server.killed, exitCode: server.exitCode, signalCode: server.signalCode }, null, 2)}\n`, 'utf8');
}

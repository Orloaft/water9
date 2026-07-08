import { spawn } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const repoRoot = '/mnt/nxt-dev/water9';
const outDir = resolve(repoRoot, 'runs/water9-curated-fauna-flora-assets-2026-07-06');
const host = '127.0.0.1';
const selector = '#game canvas';
const viewport = { width: 1280, height: 800 };
const surfaceY = 96;

const faunaScenarios = [
  { key: 'surface-fauna-lantern-fry', biome: 1, species: 'Lantern Fry', assetKey: 'fauna-shallow-lantern-fry', band: 'surface' },
  { key: 'mid-fauna-gulper-eel', biome: 2, species: 'Gulper Eel', assetKey: 'fauna-deep-gulper-eel', band: 'mid' },
  { key: 'deep-fauna-goblin-shark', biome: 3, species: 'Goblin Shark', assetKey: 'fauna-abyss-goblin-shark', band: 'deep', distance: 46 },
  { key: 'abyss-fauna-mantle-crawler', biome: 4, species: 'Mantle Crawler', assetKey: 'fauna-abyss-mantle-crawler', band: 'abyss', distance: 58 },
];

const floraScenarios = [
  { key: 'surface-flora-sting-anemone', biome: 1, species: 'Sting Anemone', assetKey: 'terrain-edge-flora-sting-anemone', band: 'surface' },
  { key: 'mid-flora-vent-coral', biome: 2, species: 'Vent Coral', assetKey: 'terrain-edge-flora-vent-coral', band: 'mid' },
  { key: 'deep-flora-crown-polyp', biome: 3, species: 'Crown Polyp', assetKey: 'terrain-edge-flora-crown-polyps', band: 'deep' },
  { key: 'abyss-flora-oracle-polyp', biome: 4, species: 'Oracle Polyp', assetKey: 'terrain-edge-flora-oracle-tendrils', band: 'abyss' },
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

async function waitForReady(page, biome) {
  await page.waitForFunction((targetBiome) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(window.__AQUA_PLAYTEST__?.command && snap?.world?.ready !== false && snap?.state?.biome === targetBiome);
  }, biome, { timeout: 45000 });
}

async function command(page, name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => {
    return window.__AQUA_PLAYTEST__?.command?.(commandName, commandValue) ?? null;
  }, [name, value]);
  await page.waitForTimeout(result?.restarting ? 260 : 120);
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
  await waitForReady(page, biome);
  await command(page, 'start');
  await command(page, 'dive');
  await command(page, 'clearProofOverlays');
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
    for (let index = 0; index < image.data.length; index += 4) {
      const luma = Math.round(image.data[index] * 0.2126 + image.data[index + 1] * 0.7152 + image.data[index + 2] * 0.0722);
      image.data[index] = luma;
      image.data[index + 1] = luma;
      image.data[index + 2] = luma;
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
    if (!canvas || !context) return { exists: false };
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let samples = 0;
    let min = 255;
    let max = 0;
    let varied = 0;
    let saturatedGreenPixels = 0;
    for (let y = 0; y < canvas.height; y += 8) {
      for (let x = 0; x < canvas.width; x += 8) {
        const i = (y * canvas.width + x) * 4;
        const luma = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
        min = Math.min(min, luma);
        max = Math.max(max, luma);
        if (data[i + 3] > 12) varied += 1;
        if (data[i + 3] > 64 && data[i + 1] > 150 && data[i] < 45 && data[i + 2] < 90) saturatedGreenPixels += 1;
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
      saturatedGreenPixels,
    };
  }, selector);
}

async function fileBytes(path) {
  return (await stat(path)).size;
}

function pngDimensions(buffer) {
  if (buffer.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function assetMeta(key) {
  const imagePath = resolve(repoRoot, `public/assets/generated/${key}.png`);
  const image = await readFile(imagePath);
  let manifest = null;
  let manifestPath = null;
  try {
    manifestPath = `public/assets/generated/${key}.frames.json`;
    manifest = JSON.parse(await readFile(resolve(repoRoot, manifestPath), 'utf8'));
  } catch {
    manifestPath = null;
  }
  return {
    assetKey: key,
    sourceFile: `public/assets/generated/${key}.png`,
    bytes: image.length,
    dimensions: pngDimensions(image),
    manifestPath,
    frameCount: manifest?.frameCount ?? 1,
    frameWidth: manifest?.frameWidth ?? pngDimensions(image)?.width ?? null,
    frameHeight: manifest?.frameHeight ?? pngDimensions(image)?.height ?? null,
    loadedFromPngAndManifest: Boolean(manifestPath),
    manifestSource: manifest?.source ?? null,
  };
}

async function writeCapture(page, scenario, extra = {}) {
  await page.waitForTimeout(260);
  const colorPath = resolve(outDir, `canvas-${scenario.key}.png`);
  const grayscalePath = resolve(outDir, `canvas-${scenario.key}-grayscale.png`);
  const viewportPath = resolve(outDir, `viewport-${scenario.key}.png`);
  await writeFile(colorPath, await canvasPng(page, 'color'));
  await writeFile(grayscalePath, await canvasPng(page, 'grayscale'));
  await page.screenshot({ path: viewportPath, fullPage: false });
  const snap = await snapshot(page);
  return {
    ...scenario,
    colorPath,
    grayscalePath,
    viewportPath,
    colorBytes: await fileBytes(colorPath),
    grayscaleBytes: await fileBytes(grayscalePath),
    viewportBytes: await fileBytes(viewportPath),
    metrics: await canvasMetrics(page),
    state: snap?.state ?? null,
    camera: snap?.camera ?? null,
    player: snap?.player ?? null,
    visibleFauna: (snap?.fish ?? [])
      .filter((fish) => fish.screenVisible)
      .map((fish) => ({
        species: fish.species,
        assetKey: fish.assetKey,
        behaviorClass: fish.behaviorClass,
        radius: fish.radius,
        screenX: fish.screenX,
        screenY: fish.screenY,
        scanned: fish.scanned,
      })),
    visibleFlora: (snap?.floraAnchors?.gameplay ?? [])
      .filter((flora) => flora.x >= snap.camera.x && flora.x <= snap.camera.x + snap.camera.width && flora.y >= snap.camera.y && flora.y <= snap.camera.y + snap.camera.height)
      .map((flora) => ({
        species: flora.species,
        assetKey: flora.assetKey,
        scanned: flora.scanned,
        hazardous: flora.hazardous,
        supported: flora.supported,
        anchor: flora.anchor,
        depthMeters: Math.round((Number(flora.y) - surfaceY) / 6),
      })),
    ...extra,
  };
}

function floraCandidateIndex(snap, scenario) {
  const candidates = (snap?.floraAnchors?.gameplay ?? []).filter((flora) => !flora.dead && flora.hasSurface);
  const exact = candidates
    .map((flora, index) => ({ flora, index }))
    .filter(({ flora }) => flora.species === scenario.species && flora.assetKey === scenario.assetKey)
    .sort((a, b) => Number(a.flora.y) - Number(b.flora.y));
  return exact[0]?.index ?? -1;
}

await mkdir(outDir, { recursive: true });
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

const captures = [];
const assetKeys = new Set();
let ok = false;

try {
  await waitForServer(baseUrl, server, serverLogs);

  for (const scenario of faunaScenarios) {
    await setupBiome(page, baseUrl, scenario.biome);
    await page.waitForFunction(({ species, assetKey }) => {
      const fish = window.__AQUA_PLAYTEST__?.snapshot?.()?.fish ?? [];
      return fish.some((entry) => entry.species === species && entry.assetKey === assetKey);
    }, { species: scenario.species, assetKey: scenario.assetKey }, { timeout: 30000 });
    const teleport = await command(page, 'teleportToFauna', { species: scenario.species, assetKey: scenario.assetKey, distance: scenario.distance ?? 58 });
    await command(page, 'clearProofOverlays');
    await page.waitForTimeout(300);
    const snap = await snapshot(page);
    const target = snap?.fish?.find((fish) => fish.species === scenario.species && fish.assetKey === scenario.assetKey && fish.screenVisible)
      ?? snap?.fish?.find((fish) => fish.species === scenario.species && fish.assetKey === scenario.assetKey)
      ?? null;
    assetKeys.add(scenario.assetKey);
    captures.push(await writeCapture(page, scenario, { kind: 'fauna', teleport, target }));
  }

  for (const scenario of floraScenarios) {
    await setupBiome(page, baseUrl, scenario.biome);
    await page.waitForFunction(() => (window.__AQUA_PLAYTEST__?.snapshot?.()?.floraAnchors?.gameplay?.length ?? 0) > 0, null, { timeout: 30000 });
    const initial = await snapshot(page);
    const index = floraCandidateIndex(initial, scenario);
    if (index < 0) throw new Error(`no flora candidate for ${scenario.species} ${scenario.assetKey}`);
    const teleport = await command(page, 'teleportToFlora', { index });
    await command(page, 'clearProofOverlays');
    await page.waitForTimeout(180);
    let scanProof = null;
    if (scenario.key === 'mid-flora-vent-coral') {
      await page.keyboard.down('KeyE');
      await page.waitForTimeout(1800);
      scanProof = await snapshot(page);
      await page.screenshot({ path: resolve(outDir, 'viewport-scan-hud-vent-coral.png'), fullPage: false });
      await page.keyboard.up('KeyE');
    }
    const snap = await snapshot(page);
    const visible = (snap?.floraAnchors?.gameplay ?? []).find((flora) => flora.species === scenario.species && flora.assetKey === scenario.assetKey) ?? null;
    assetKeys.add(scenario.assetKey);
    captures.push(await writeCapture(page, scenario, { kind: 'flora', teleport, candidateIndex: index, target: visible, scanProof: scanProof?.player?.scanTarget ? { target: scanProof.player.scanTarget } : null }));
  }

  const metadata = {};
  for (const key of assetKeys) metadata[key] = await assetMeta(key);
  for (const key of ['fish-abyss-predator', 'fauna-abyss-viperfish', 'fauna-abyss-frilled-shark']) {
    metadata[key] = await assetMeta(key);
  }

  const failures = [];
  for (const capture of captures) {
    if (capture.colorBytes < 25000) failures.push(`${capture.key}: canvas color proof too small (${capture.colorBytes})`);
    if (capture.grayscaleBytes < 20000) failures.push(`${capture.key}: grayscale proof too small (${capture.grayscaleBytes})`);
    if (!capture.metrics.exists || capture.metrics.lumaRange < 20) failures.push(`${capture.key}: weak canvas metrics ${JSON.stringify(capture.metrics)}`);
    if (capture.kind === 'fauna' && capture.target?.assetKey !== capture.assetKey) failures.push(`${capture.key}: target fauna not visible with expected asset key`);
    if (capture.kind === 'flora' && capture.target?.assetKey !== capture.assetKey) failures.push(`${capture.key}: target flora not found with expected asset key`);
  }
  if (!captures.some((capture) => capture.key === 'deep-fauna-goblin-shark' && capture.target?.assetKey === 'fauna-abyss-goblin-shark')) failures.push('missing Goblin Shark proof');
  if (!captures.some((capture) => capture.key === 'abyss-fauna-mantle-crawler' && capture.target?.assetKey === 'fauna-abyss-mantle-crawler')) failures.push('missing Mantle Crawler proof');
  if (!captures.some((capture) => capture.kind === 'flora' && capture.scanProof?.target)) failures.push('missing scan HUD proof target');
  if (errors.length) failures.push(`runtime errors: ${JSON.stringify(errors.slice(0, 5))}`);

  const report = {
    ok: failures.length === 0,
    generatedAt: new Date().toISOString(),
    port,
    selector,
    captures,
    assetMetadata: metadata,
    contactSheet: {
      colorPath: resolve(outDir, 'curated-asset-contact-sheet.png'),
      grayscalePath: resolve(outDir, 'curated-asset-contact-sheet-grayscale.png'),
      notes: 'Includes old fish-abyss-predator fallback beside new Goblin Shark, accepted fauna benchmarks, Mantle Crawler, and promoted flora assets.',
    },
    failures,
    errors,
    serverLogs: serverLogs.join('').slice(-4000),
  };
  await writeFile(resolve(outDir, 'normal-play-proof.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, captures: captures.length, failures }, null, 2));
  ok = report.ok;
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  await writeFile(resolve(outDir, 'normal-play-proof.json'), `${JSON.stringify({ ok: false, port, errors, serverLogs: serverLogs.join('').slice(-4000) }, null, 2)}\n`);
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
} finally {
  await page.keyboard.up('KeyE').catch(() => {});
  await browser.close().catch(() => {});
  if (server.exitCode === null) server.kill('SIGTERM');
  await new Promise((resolveExit) => {
    if (server.exitCode !== null) resolveExit();
    else server.once('exit', resolveExit);
  });
}

process.exit(ok ? 0 : 1);

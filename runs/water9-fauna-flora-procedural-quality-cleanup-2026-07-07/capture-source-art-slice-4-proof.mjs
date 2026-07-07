import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const repoRoot = '/mnt/nxt-dev/water9';
const outDir = resolve(repoRoot, 'runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07');
const host = '127.0.0.1';
const selector = '#game canvas';
const viewport = { width: 1280, height: 800 };
const surfaceY = 96;

const faunaScenarios = [
  { key: 'slice4-deep-fauna-ash-minnow', biome: 2, depth: 'mid', species: 'Ash Minnow', assetKey: 'fauna-deep-ash-minnow', distance: 36, sourcePath: 'public/assets/source/fauna-flora-source-art-slice-4/fauna-deep-ash-minnow-source.png' },
  { key: 'slice4-deep-fauna-deep-shrimp', biome: 2, depth: 'mid', species: 'Deep Sea Shrimp', assetKey: 'fauna-deep-deep-shrimp', distance: 36, sourcePath: 'public/assets/source/fauna-flora-source-art-slice-4/fauna-deep-deep-shrimp-source.png' },
  { key: 'slice4-abyss-fauna-mirror-fry', biome: 3, depth: 'abyss', species: 'Mirror Fry', assetKey: 'fauna-abyss-mirror-fry', distance: 36, sourcePath: 'public/assets/source/fauna-flora-source-art-slice-4/fauna-abyss-mirror-fry-source.png' },
  { key: 'slice4-abyss-fauna-hadal-shrimp', biome: 3, depth: 'abyss', species: 'Hadopelagic Shrimp', assetKey: 'fauna-abyss-hadal-shrimp', distance: 38, sourcePath: 'public/assets/source/fauna-flora-source-art-slice-4/fauna-abyss-hadal-shrimp-source.png' },
  { key: 'slice4-abyss-fauna-abyss-jelly', biome: 3, depth: 'abyss', species: 'Abyssal Jelly', assetKey: 'fauna-abyss-abyss-jelly', distance: 42, sourcePath: 'public/assets/source/fauna-flora-source-art-slice-4/fauna-abyss-abyss-jelly-source.png' },
  { key: 'slice4-abyss-fauna-bigfin-squid', biome: 3, depth: 'abyss', species: 'Bigfin Squid', assetKey: 'fauna-abyss-bigfin-squid', distance: 50, sourcePath: 'public/assets/source/fauna-flora-source-art-slice-4/fauna-abyss-bigfin-squid-source.png' },
  { key: 'slice4-abyss-fauna-frilled-shark', biome: 3, depth: 'abyss', species: 'Frilled Shark', assetKey: 'fauna-abyss-frilled-shark', distance: 54, sourcePath: 'public/assets/source/fauna-flora-source-art-slice-4/fauna-abyss-frilled-shark-source.png' },
  { key: 'slice4-abyss-fauna-black-swallower', biome: 3, depth: 'abyss', species: 'Black Swallower', assetKey: 'fauna-abyss-black-swallower', distance: 60, sourcePath: 'public/assets/source/fauna-flora-source-art-slice-4/fauna-abyss-black-swallower-source.png' },
  { key: 'slice4-hadal-fauna-medusa', biome: 4, depth: 'hadal', species: 'Abyssal Medusa', assetKey: 'fauna-abyss-medusa', distance: 44, sourcePath: 'public/assets/source/fauna-flora-source-art-slice-4/fauna-abyss-medusa-source.png' },
  { key: 'slice4-special-fauna-mantle-crawler', biome: 4, depth: 'hadal', species: 'Mantle Crawler', assetKey: 'fauna-abyss-mantle-crawler', distance: 68 },
];

const floraScenarios = [
  { key: 'slice4-surface-flora-moon-sponge', biome: 1, depth: 'surface', species: 'Moon Sponge', assetKey: 'terrain-edge-flora-moon-sponge' },
  { key: 'slice4-surface-flora-sting-anemone', biome: 1, depth: 'surface', species: 'Sting Anemone', assetKey: 'terrain-edge-flora-sting-anemone' },
  { key: 'slice4-mid-flora-vent-coral', biome: 2, depth: 'mid', species: 'Vent Coral', assetKey: 'terrain-edge-flora-vent-coral' },
  { key: 'slice4-mid-flora-ember-bloom', biome: 2, depth: 'mid', species: 'Ember Bloom', assetKey: 'terrain-edge-flora-ember-bloom' },
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

async function frameManifestSource(assetKey) {
  const frameManifestPath = resolve(repoRoot, `public/assets/generated/${assetKey}.frames.json`);
  try {
    return JSON.parse(await readFile(frameManifestPath, 'utf8')).source ?? null;
  } catch {
    return null;
  }
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
  const source = scenario.sourcePath ? await sha256(resolve(repoRoot, scenario.sourcePath)) : null;
  return {
    ...scenario,
    colorPath,
    grayscalePath,
    viewportPath,
    runtimePath,
    frameManifestPath,
    runtimeSha256: await sha256(resolve(repoRoot, runtimePath)),
    sourceSha256: source,
    frameManifestSource: await frameManifestSource(scenario.assetKey),
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
  return writeCapture(page, { ...scenario, kind: 'fauna' }, target, {
    teleport: {
      ok: teleport?.ok !== false,
      reason: teleport?.reason ?? null,
      distance: scenario.distance,
    },
  });
}

function floraCandidateIndex(snap, scenario) {
  const candidates = (snap?.floraAnchors?.gameplay ?? []).filter((flora) => !flora.dead && flora.hasSurface);
  const exact = candidates
    .map((flora, index) => ({ flora, index }))
    .filter(({ flora }) => flora.species === scenario.species && flora.assetKey === scenario.assetKey)
    .sort((a, b) => Number(a.flora.y) - Number(b.flora.y));
  return exact[0]?.index ?? -1;
}

async function captureFlora(page, baseUrl, scenario) {
  await setupBiome(page, baseUrl, scenario.biome);
  await page.waitForFunction(() => (window.__AQUA_PLAYTEST__?.snapshot?.()?.floraAnchors?.gameplay?.length ?? 0) > 0, null, { timeout: 30000 });
  const initial = await snapshot(page);
  const index = floraCandidateIndex(initial, scenario);
  if (index < 0) throw new Error(`no flora candidate for ${scenario.species} ${scenario.assetKey}`);
  await command(page, 'teleportToFlora', { index });
  await command(page, 'clearProofOverlays');
  const snap = await snapshot(page);
  const target = (snap?.floraAnchors?.gameplay ?? [])
    .filter((flora) => flora.species === scenario.species && flora.assetKey === scenario.assetKey)
    .sort((a, b) => Math.abs(a.screenX - viewport.width / 2) - Math.abs(b.screenX - viewport.width / 2))[0] ?? null;
  const capture = await writeCapture(page, { ...scenario, kind: 'flora' }, target, {
    teleport: {
      ok: index >= 0,
      index,
    },
  });
  if (capture.target) {
    capture.target = {
      species: target.species,
      assetKey: target.assetKey,
      hazardous: target.hazardous,
      anchor: target.anchor,
      depthMeters: Math.round((Number(target.y) - surfaceY) / 6),
      screenX: target.screenX,
      screenY: target.screenY,
    };
  }
  return capture;
}

async function makeContactSheet(page, captures, grayscale) {
  const images = await Promise.all(captures.map(async (capture) => ({
    label: `${capture.depth} ${capture.assetKey}`,
    dataUrl: `data:image/png;base64,${(await readFile(grayscale ? capture.grayscalePath : capture.colorPath)).toString('base64')}`,
  })));
  const dataUrl = await page.evaluate(async ({ contactImages }) => {
    const cellW = 320;
    const cellH = 220;
    const cols = 3;
    const rows = Math.ceil(contactImages.length / cols);
    const canvas = document.createElement('canvas');
    canvas.width = cellW * cols;
    canvas.height = cellH * rows;
    const context = canvas.getContext('2d');
    context.fillStyle = '#050b12';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = '12px sans-serif';
    context.textBaseline = 'top';
    for (let index = 0; index < contactImages.length; index += 1) {
      const image = await new Promise((resolveImage, rejectImage) => {
        const img = new Image();
        img.onload = () => resolveImage(img);
        img.onerror = rejectImage;
        img.src = contactImages[index].dataUrl;
      });
      const x = (index % cols) * cellW;
      const y = Math.floor(index / cols) * cellH;
      const scale = Math.min((cellW - 10) / image.width, (cellH - 28) / image.height);
      const w = Math.round(image.width * scale);
      const h = Math.round(image.height * scale);
      context.drawImage(image, x + Math.round((cellW - w) / 2), y + 4, w, h);
      context.fillStyle = '#e6eef8';
      context.fillText(contactImages[index].label, x + 8, y + cellH - 20, cellW - 16);
    }
    return canvas.toDataURL('image/png');
  }, { contactImages: images });
  return Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
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

let ok = false;
try {
  await waitForServer(baseUrl, server, serverLogs);
  const captures = [];
  for (const scenario of faunaScenarios) captures.push(await captureFauna(page, baseUrl, scenario));
  for (const scenario of floraScenarios) captures.push(await captureFlora(page, baseUrl, scenario));
  const failures = [];
  for (const capture of captures) {
    if (capture.colorBytes < 25000) failures.push(`${capture.key}: color canvas proof too small (${capture.colorBytes})`);
    if (capture.grayscaleBytes < 20000) failures.push(`${capture.key}: grayscale canvas proof too small (${capture.grayscaleBytes})`);
    if (!capture.metrics.exists || capture.metrics.lumaRange < 20) failures.push(`${capture.key}: weak canvas metrics ${JSON.stringify(capture.metrics)}`);
    if (capture.target?.assetKey !== capture.assetKey) failures.push(`${capture.key}: target not found with expected asset key`);
    if (capture.sourcePath && capture.frameManifestSource?.path !== capture.sourcePath) failures.push(`${capture.key}: frame manifest source path mismatch`);
  }
  if (errors.length) failures.push(`runtime errors: ${JSON.stringify(errors.slice(0, 5))}`);
  const contactPath = resolve(outDir, 'source-art-slice-4-normal-play-contact.png');
  const contactGrayPath = resolve(outDir, 'source-art-slice-4-normal-play-contact-gray.png');
  await writeFile(contactPath, await makeContactSheet(page, captures, false));
  await writeFile(contactGrayPath, await makeContactSheet(page, captures, true));
  const report = {
    ok: failures.length === 0,
    generatedAt: new Date().toISOString(),
    port,
    selector,
    contactPath,
    contactGrayPath,
    captures,
    failures,
    errors,
    serverLogs: serverLogs.join('').slice(-4000),
  };
  await writeFile(resolve(outDir, 'source-art-slice-4-normal-play-proof.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, port, captures: captures.length, failures, contactPath, contactGrayPath }, null, 2));
  ok = report.ok;
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  await writeFile(resolve(outDir, 'source-art-slice-4-normal-play-proof.json'), `${JSON.stringify({ ok: false, port, errors, serverLogs: serverLogs.join('').slice(-4000) }, null, 2)}\n`);
  console.error(JSON.stringify({ ok: false, port, errors }, null, 2));
} finally {
  await browser.close().catch(() => {});
  if (server.exitCode === null) server.kill('SIGTERM');
  await new Promise((resolveExit) => {
    if (server.exitCode !== null) resolveExit();
    else server.once('exit', resolveExit);
  });
}

if (!ok) process.exit(1);

import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const runDir = resolve('runs/water9-water-column-atmosphere-v1-2026-07-04');
const proofDir = process.env.WATER_COLUMN_PROOF_DIR
  ? resolve(process.env.WATER_COLUMN_PROOF_DIR)
  : resolve(runDir, 'proof');
const sourceSelector = '#game canvas';
const host = '127.0.0.1';
const viewport = { width: 1280, height: 800 };
const portStart = Number(process.env.WATER_COLUMN_PROOF_PORT ?? 5180);
const mode = process.env.WATER_COLUMN_PROOF_MODE ?? 'after';

const targets = [
  { label: 'b1-surface-119', biome: 1, depth: 119, reviewX: 3600 },
  { label: 'b1-upper-180', biome: 1, depth: 180, reviewX: 3600 },
  { label: 'b2-mid-760', biome: 2, depth: 760, reviewX: 4700 },
  { label: 'b3-lower-1260', biome: 3, depth: 1260, reviewX: 5800 },
  { label: 'b4-lower-1260', biome: 4, depth: 1260, reviewX: 6900 },
];

const driftLabels = new Set(['b1-surface-119', 'b2-mid-760']);

function git(args) {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding: 'utf8' });
  if (result.status !== 0) return `ERROR: ${result.stderr.trim() || result.stdout.trim()}`;
  return result.stdout.trim();
}

async function fileBytes(path) {
  try {
    return (await stat(path)).size;
  } catch {
    return 0;
  }
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function isPortAvailable(candidatePort) {
  return new Promise((resolveAvailable) => {
    const probe = createServer();
    probe.once('error', () => resolveAvailable(false));
    probe.once('listening', () => {
      probe.close(() => resolveAvailable(true));
    });
    probe.listen(candidatePort, host);
  });
}

async function choosePort(preferredPort) {
  for (let candidatePort = preferredPort; candidatePort <= 5199; candidatePort += 1) {
    if (await isPortAvailable(candidatePort)) return candidatePort;
  }
  throw new Error(`no available proof port in 5180-5199 starting at ${preferredPort}`);
}

async function waitForServer(url, server, logs, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`dev server exited before ready with code ${server.exitCode}\n${logs.join('').slice(-4000)}`);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite is still binding the selected strict port.
    }
    await sleep(150);
  }
  throw new Error(`dev server was not ready within ${timeoutMs}ms`);
}

async function waitForPlaytest(page, biome) {
  await page.waitForFunction((targetBiome) => {
    const api = window.__AQUA_PLAYTEST__;
    const snap = api?.snapshot?.();
    return Boolean(api?.command) && snap?.world?.ready !== false && snap?.state?.biome === targetBiome;
  }, biome, { timeout: 30000 });
}

async function command(page, biome, commandName, commandValue) {
  await waitForPlaytest(page, biome);
  return page.evaluate(([name, value]) => window.__AQUA_PLAYTEST__?.command(name, value) ?? null, [commandName, commandValue]);
}

async function canvasPng(page, pngMode) {
  const dataUrl = await page.evaluate(({ selector, mode: requestedMode }) => {
    const source = document.querySelector(selector);
    if (!source) throw new Error(`missing ${selector}`);
    const out = document.createElement('canvas');
    out.width = source.width;
    out.height = source.height;
    const context = out.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('missing output canvas context');
    context.drawImage(source, 0, 0);
    if (requestedMode === 'grayscale') {
      const image = context.getImageData(0, 0, out.width, out.height);
      const data = image.data;
      for (let index = 0; index < data.length; index += 4) {
        const luma = Math.round(data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722);
        data[index] = luma;
        data[index + 1] = luma;
        data[index + 2] = luma;
      }
      context.putImageData(image, 0, 0);
    }
    return out.toDataURL('image/png');
  }, { selector: sourceSelector, mode: pngMode });
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

async function canvasStats(page) {
  return page.evaluate((selector) => {
    const canvas = document.querySelector(selector);
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false, width: 0, height: 0 };
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    let samples = 0;
    let lumaMin = 255;
    let lumaMax = 0;
    let lumaSum = 0;
    let lumaSqSum = 0;
    let variedSamples = 0;
    let previous = null;
    for (let y = 0; y < canvas.height; y += 8) {
      for (let x = 0; x < canvas.width; x += 8) {
        const index = (y * canvas.width + x) * 4;
        const luma = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
        lumaMin = Math.min(lumaMin, luma);
        lumaMax = Math.max(lumaMax, luma);
        lumaSum += luma;
        lumaSqSum += luma * luma;
        if (previous !== null && Math.abs(luma - previous) > 4) variedSamples += 1;
        previous = luma;
        samples += 1;
      }
    }
    const lumaMean = samples ? lumaSum / samples : 0;
    const variance = samples ? Math.max(0, lumaSqSum / samples - lumaMean * lumaMean) : 0;
    return {
      exists: true,
      width: canvas.width,
      height: canvas.height,
      samples,
      variedSamples,
      lumaMin: Number(lumaMin.toFixed(3)),
      lumaMax: Number(lumaMax.toFixed(3)),
      lumaRange: Number((lumaMax - lumaMin).toFixed(3)),
      lumaMean: Number(lumaMean.toFixed(3)),
      lumaStdDev: Number(Math.sqrt(variance).toFixed(3)),
    };
  }, sourceSelector);
}

async function captureStill(page, phase, target, suffix, review) {
  const stem = `${phase}-${target.label}${suffix ? `-${suffix}` : ''}`;
  const colorPath = resolve(proofDir, `${stem}-color.png`);
  const grayscalePath = resolve(proofDir, `${stem}-grayscale.png`);
  await writeFile(colorPath, await canvasPng(page, 'color'));
  await writeFile(grayscalePath, await canvasPng(page, 'grayscale'));
  return {
    phase,
    label: target.label,
    biome: target.biome,
    depth: target.depth,
    reviewX: target.reviewX,
    suffix: suffix || null,
    colorPath,
    grayscalePath,
    colorBytes: await fileBytes(colorPath),
    grayscaleBytes: await fileBytes(grayscalePath),
    canvasStats: await canvasStats(page),
    review,
    activeBand: review?.activeProfile?.activeBand ?? review?.activeBand?.id ?? null,
    waterColumnLayers: review?.waterColumnLayers ?? null,
    worldSpaceNoise: review?.worldSpaceNoise ?? null,
  };
}

async function capturePhase(phase, baseUrl, browser) {
  const captures = [];
  for (const target of targets) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    const url = `${baseUrl}?playtest=1&biome=${target.biome}`;
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
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await waitForPlaytest(page, target.biome);
      const review = await command(page, target.biome, 'backgroundReview', {
        label: `${phase}-${target.label}`,
        depth: target.depth,
        reviewX: target.reviewX,
        clearWaterWindow: false,
        zoom: 1,
      });
      await command(page, target.biome, 'clearProofOverlays');
      await page.waitForTimeout(500);
      const primary = await captureStill(page, phase, target, '', review);
      captures.push({ ...primary, url, sourceSelector, viewport, errors });
      if (phase === 'after' && driftLabels.has(target.label)) {
        await page.waitForTimeout(1400);
        const driftReview = await command(page, target.biome, 'backgroundReview', {
          label: `${phase}-${target.label}-drift2`,
          depth: target.depth,
          reviewX: target.reviewX,
          clearWaterWindow: false,
          zoom: 1,
        });
        await command(page, target.biome, 'clearProofOverlays');
        await page.waitForTimeout(180);
        const drift = await captureStill(page, phase, target, 'drift2', driftReview);
        captures.push({ ...drift, url, sourceSelector, viewport, errors });
      }
    } finally {
      await page.close().catch(() => {});
    }
  }
  return captures;
}

async function capturePaired(baseUrl, browser) {
  const baselineCaptures = [];
  const afterCaptures = [];
  for (const target of targets) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    const url = `${baseUrl}?playtest=1&biome=${target.biome}`;
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
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await waitForPlaytest(page, target.biome);
      await page.evaluate(() => { window.__WATER_COLUMN_DISABLED__ = true; });
      const baselineReview = await command(page, target.biome, 'backgroundReview', {
        label: `baseline-${target.label}-water-column-disabled`,
        depth: target.depth,
        reviewX: target.reviewX,
        clearWaterWindow: false,
        zoom: 1,
      });
      await command(page, target.biome, 'clearProofOverlays');
      await page.waitForTimeout(500);
      const baseline = await captureStill(page, 'baseline', target, '', baselineReview);
      baselineCaptures.push({ ...baseline, url, sourceSelector, viewport, errors, comparisonMode: 'same-runtime-water-column-disabled' });

      await page.evaluate(() => { window.__WATER_COLUMN_DISABLED__ = false; });
      const afterReview = await command(page, target.biome, 'backgroundReview', {
        label: `after-${target.label}`,
        depth: target.depth,
        reviewX: target.reviewX,
        clearWaterWindow: false,
        zoom: 1,
      });
      await command(page, target.biome, 'clearProofOverlays');
      await page.waitForTimeout(500);
      const after = await captureStill(page, 'after', target, '', afterReview);
      afterCaptures.push({ ...after, url, sourceSelector, viewport, errors, comparisonMode: 'same-runtime-water-column-enabled' });

      if (driftLabels.has(target.label)) {
        await page.waitForTimeout(1400);
        const driftReview = await command(page, target.biome, 'backgroundReview', {
          label: `after-${target.label}-drift2`,
          depth: target.depth,
          reviewX: target.reviewX,
          clearWaterWindow: false,
          zoom: 1,
        });
        await command(page, target.biome, 'clearProofOverlays');
        await page.waitForTimeout(180);
        const drift = await captureStill(page, 'after', target, 'drift2', driftReview);
        afterCaptures.push({ ...drift, url, sourceSelector, viewport, errors, comparisonMode: 'same-runtime-water-column-enabled' });
      }
    } finally {
      await page.close().catch(() => {});
    }
  }
  return { baselineCaptures, afterCaptures };
}

async function imageDataUrl(path) {
  const bytes = await readFile(path);
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

async function buildContactSheet(browser, baselineCaptures, afterCaptures) {
  const rows = [];
  for (const target of targets) {
    const baseline = baselineCaptures.find((capture) => capture.label === target.label && !capture.suffix);
    const after = afterCaptures.find((capture) => capture.label === target.label && !capture.suffix);
    if (!baseline || !after) continue;
    rows.push({
      label: `${target.label} / biome ${target.biome} / ${target.depth}m`,
      cells: [
        { title: 'before color', src: await imageDataUrl(baseline.colorPath) },
        { title: 'after color', src: await imageDataUrl(after.colorPath) },
        { title: 'before grayscale', src: await imageDataUrl(baseline.grayscalePath) },
        { title: 'after grayscale', src: await imageDataUrl(after.grayscalePath) },
      ],
    });
  }
  const page = await browser.newPage({ viewport: { width: 1680, height: 1680 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; background: #0b1117; color: #d7eef2; font: 14px system-ui, sans-serif; }
    .sheet { padding: 18px; display: grid; gap: 16px; }
    .row { display: grid; grid-template-columns: 120px repeat(4, 1fr); gap: 8px; align-items: start; }
    .label { color: #f4fbff; line-height: 1.3; padding-top: 22px; }
    .cell { display: grid; gap: 4px; }
    .cell span { color: #9bb5bd; }
    img { width: 100%; display: block; background: #000; }
  </style>
</head>
<body>
  <main class="sheet">
    ${rows.map((row) => `<section class="row"><div class="label">${row.label}</div>${row.cells.map((cell) => `<div class="cell"><span>${cell.title}</span><img src="${cell.src}"></div>`).join('')}</section>`).join('')}
  </main>
</body>
</html>`, { waitUntil: 'load' });
  const contactSheetPath = resolve(proofDir, 'contact-sheet.png');
  await page.locator('.sheet').screenshot({ path: contactSheetPath });
  await page.close();
  return contactSheetPath;
}

async function loadPhaseReport(phase) {
  try {
    return JSON.parse(await readFile(resolve(proofDir, `${phase}-captures.json`), 'utf8'));
  } catch {
    return null;
  }
}

await mkdir(proofDir, { recursive: true });

const head = git(['rev-parse', '--short', 'HEAD']);
const gitStatusAtStart = git(['status', '--short']);
const port = await choosePort(portStart);
const baseUrl = `http://${host}:${port}/`;
const serverLogs = [];
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

let browser;
try {
  await waitForServer(baseUrl, server, serverLogs);
  browser = await chromium.launch({ headless: true });
  let baselineReport = await loadPhaseReport('baseline');
  let afterReport = await loadPhaseReport('after');
  if (mode === 'paired') {
    const paired = await capturePaired(baseUrl, browser);
    baselineReport = {
      phase: 'baseline',
      comparisonMode: 'same-runtime-water-column-disabled',
      generatedAt: new Date().toISOString(),
      head,
      gitStatus: gitStatusAtStart,
      port,
      baseUrl,
      sourceSelector,
      viewport,
      captures: paired.baselineCaptures,
      serverLogs: serverLogs.join('').slice(-4000),
    };
    afterReport = {
      phase: 'after',
      comparisonMode: 'same-runtime-water-column-enabled',
      generatedAt: new Date().toISOString(),
      head,
      gitStatus: gitStatusAtStart,
      port,
      baseUrl,
      sourceSelector,
      viewport,
      captures: paired.afterCaptures,
      serverLogs: serverLogs.join('').slice(-4000),
    };
    await writeFile(resolve(proofDir, 'baseline-captures.json'), `${JSON.stringify(baselineReport, null, 2)}\n`);
    await writeFile(resolve(proofDir, 'after-captures.json'), `${JSON.stringify(afterReport, null, 2)}\n`);
  }
  if (mode === 'baseline' || mode === 'all') {
    const captures = await capturePhase('baseline', baseUrl, browser);
    baselineReport = {
      phase: 'baseline',
      generatedAt: new Date().toISOString(),
      head,
      gitStatus: gitStatusAtStart,
      port,
      baseUrl,
      sourceSelector,
      viewport,
      captures,
      serverLogs: serverLogs.join('').slice(-4000),
    };
    await writeFile(resolve(proofDir, 'baseline-captures.json'), `${JSON.stringify(baselineReport, null, 2)}\n`);
  }
  if (mode === 'after' || mode === 'all') {
    const captures = await capturePhase('after', baseUrl, browser);
    afterReport = {
      phase: 'after',
      generatedAt: new Date().toISOString(),
      head,
      gitStatus: gitStatusAtStart,
      port,
      baseUrl,
      sourceSelector,
      viewport,
      captures,
      serverLogs: serverLogs.join('').slice(-4000),
    };
    await writeFile(resolve(proofDir, 'after-captures.json'), `${JSON.stringify(afterReport, null, 2)}\n`);
  }
  let contactSheetPath = null;
  if (baselineReport?.captures?.length && afterReport?.captures?.length) {
    contactSheetPath = await buildContactSheet(browser, baselineReport.captures, afterReport.captures);
  }
  const provenance = {
    schema: 'water9/water-column-atmosphere-proof@1',
    generatedAt: new Date().toISOString(),
    head,
    gitStatusBefore: baselineReport?.gitStatus ?? null,
    gitStatusAfter: git(['status', '--short']),
    selectedPort: port,
    viewport,
    urlBase: baseUrl,
    sourceSelector,
    requiredTargets: targets,
    baseline: baselineReport,
    after: afterReport,
    contactSheetPath,
    runtimeConfirmation: 'Every PNG was derived from the actual Water9 #game canvas with ?playtest=1&biome=N and backgroundReview(clearWaterWindow:false).',
  };
  await writeFile(resolve(proofDir, 'provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`);
  console.log(`Water-column proof ${mode} complete.`);
  console.log(`Proof dir: ${proofDir}`);
  console.log(`Port: ${port}`);
} finally {
  await browser?.close().catch(() => {});
  server.kill('SIGTERM');
  await sleep(250);
  if (server.exitCode === null) server.kill('SIGKILL');
}

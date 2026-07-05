import { spawn, execFileSync } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_NORMAL_BIOME12_OUT_DIR ?? '/home/orlovboros/projects/manager/runs/water9-normal-biome12-background-slice-2026-07-02';
const host = '127.0.0.1';
const port = Number(process.env.WATER9_NORMAL_BIOME12_PORT ?? 5174);
const sourceSelector = '#game canvas';
const scenarios = [
  { biome: 1, label: 'early', depth: 180 },
  { biome: 1, label: 'normal-lower-reachable', depth: 760 },
  { biome: 2, label: 'early', depth: 180 },
  { biome: 2, label: 'normal-lower-reachable', depth: 760 },
];

await mkdir(outDir, { recursive: true });

function git(args) {
  return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8' }).trimEnd();
}

const repoRoot = git(['rev-parse', '--show-toplevel']);
const head = git(['rev-parse', '--short', 'HEAD']);
const gitStatusBefore = git(['status', '--short']);

const server = process.env.PLAYTEST_URL
  ? null
  : spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/`;
const serverLogs = [];
server?.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server?.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitForServer(url, timeoutMs = 24000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null) throw new Error(`dev server exited before ready with code ${server.exitCode}`);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite may still be binding.
    }
    await sleep(150);
  }
  throw new Error(`dev server was not ready within ${timeoutMs}ms\n${serverLogs.join('')}`);
}

async function waitForPlaytest(page) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 20000 });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const review = await page.evaluate(() => window.__AQUA_PLAYTEST__?.command('biomeLoadingReview'));
    if (review?.worldReady === true) return;
    await page.waitForTimeout(160);
  }
  throw new Error('generated world was not ready within 30000ms');
}

async function command(page, name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue), [name, value]);
  await page.waitForTimeout(620);
  return result;
}

async function writeDataUrl(path, dataUrl) {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  await writeFile(path, Buffer.from(base64, 'base64'));
}

async function canvasDerivedPng(page, mode) {
  return page.evaluate(({ requestedMode, selector }) => {
    const source = document.querySelector(selector);
    if (!source) throw new Error(`missing ${selector}`);
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('missing output canvas context');
    context.imageSmoothingEnabled = false;
    context.drawImage(source, 0, 0);
    if (requestedMode === 'grayscale') {
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = image.data;
      for (let i = 0; i < data.length; i += 4) {
        const y = Math.round(data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722);
        data[i] = y;
        data[i + 1] = y;
        data[i + 2] = y;
      }
      context.putImageData(image, 0, 0);
    }
    return {
      dataUrl: canvas.toDataURL('image/png'),
      sourceSelector: selector,
      sourceWidth: source.width,
      sourceHeight: source.height,
      mode: requestedMode,
    };
  }, { requestedMode: mode, selector: sourceSelector });
}

async function canvasStats(page) {
  return page.evaluate((selector) => {
    const canvas = document.querySelector(selector);
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false, width: 0, height: 0 };
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let min = 255;
    let max = 0;
    let sum = 0;
    let samples = 0;
    for (let y = 0; y < canvas.height; y += 8) {
      for (let x = 0; x < canvas.width; x += 8) {
        const i = (y * canvas.width + x) * 4;
        const luma = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
        min = Math.min(min, luma);
        max = Math.max(max, luma);
        sum += luma;
        samples += 1;
      }
    }
    return {
      exists: true,
      selector,
      width: canvas.width,
      height: canvas.height,
      lumaMin: Math.round(min),
      lumaMax: Math.round(max),
      lumaAverage: samples ? Number((sum / samples).toFixed(2)) : 0,
    };
  }, sourceSelector);
}

async function fileBytes(path) {
  return (await stat(path)).size;
}

function withoutDataUrl(derived) {
  const { dataUrl: _dataUrl, ...metadata } = derived;
  return metadata;
}

function snapshotSummary(snapshot) {
  const profile = snapshot?.environmentVisualProfile;
  const anchors = profile?.anchors?.items ?? [];
  const phase11Anchors = anchors.filter((anchor) => String(anchor.assetId ?? '').startsWith('phase11-transition-'));
  return {
    state: snapshot?.state,
    world: profile?.world,
    camera: profile?.camera,
    activeProfile: profile?.activeProfile,
    phase11AnchorCount: phase11Anchors.length,
    phase11Anchors,
    layers: profile?.layers,
    anchorAssets: profile?.anchors?.assets,
  };
}

try {
  await waitForServer(baseUrl);
  const browser = await chromium.launch({ headless: true });
  const outputs = [];

  for (const scenario of scenarios) {
    const url = `${baseUrl}?playtest=1&biome=${scenario.biome}`;
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await page.goto(url);
    await waitForPlaytest(page);
    await command(page, 'start');
    await command(page, 'dive');
    const moveResult = await command(page, 'teleportToReachableDepth', scenario.depth);
    if (!moveResult?.ok) throw new Error(`failed to move biome ${scenario.biome} ${scenario.label}: ${JSON.stringify(moveResult)}`);
    await command(page, 'centerCameraOnPlayer');
    await command(page, 'clearProofOverlays');
    await page.waitForTimeout(900);

    const snapshot = await page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot());
    const stem = `water9-biome${scenario.biome}-${scenario.label}-normal-canvas`;
    const fullColorPath = resolve(outDir, `${stem}-fullcolor.png`);
    const grayscalePath = resolve(outDir, `${stem}-grayscale.png`);
    const fullColor = await canvasDerivedPng(page, 'color');
    await writeDataUrl(fullColorPath, fullColor.dataUrl);
    const grayscale = await canvasDerivedPng(page, 'grayscale');
    await writeDataUrl(grayscalePath, grayscale.dataUrl);
    const stats = await canvasStats(page);

    outputs.push({
      url,
      query: `?playtest=1&biome=${scenario.biome}`,
      biome: scenario.biome,
      requestedDepthMeters: scenario.depth,
      label: scenario.label,
      captureMethod: 'Playwright Chromium; normal ?playtest biome page; start+dive; playtest-only teleportToReachableDepth chooses reachable generated water without terrain edits; direct #game canvas toDataURL; grayscale derived from same canvas pixels in-page',
      moveResult,
      fullColorPath,
      grayscalePath,
      fullColorBytes: await fileBytes(fullColorPath),
      grayscaleBytes: await fileBytes(grayscalePath),
      fullColorDerivedFrom: withoutDataUrl(fullColor),
      grayscaleDerivedFrom: withoutDataUrl(grayscale),
      canvasStats: stats,
      snapshot: snapshotSummary(snapshot),
    });
    await page.close();
  }

  await browser.close();

  const gitStatusAfter = git(['status', '--short']);
  const provenancePath = resolve(outDir, 'water9-normal-biome12-background-slice-provenance.json');
  await writeFile(provenancePath, `${JSON.stringify({
    schema: 'water9-normal-biome12-background-slice-proof@6',
    timestamp: new Date().toISOString(),
    gitHead: head,
    repoRoot,
    sourceSelector,
    baseUrl,
    gitStatusBefore,
    gitStatusAfter,
    commandsRun: [
      `WATER9_NORMAL_BIOME12_OUT_DIR=${outDir} WATER9_NORMAL_BIOME12_PORT=${port} node tools/review_normal_biome12_background_slice.mjs`,
    ],
    captures: outputs,
  }, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({ ok: true, outDir, provenancePath, captures: outputs }, null, 2));
} finally {
  if (server) {
    server.kill('SIGTERM');
    await sleep(250);
  }
}

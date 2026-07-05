import { spawn } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const phaseLabel = process.env.PHASE15_LABEL ?? process.env.PHASE14_LABEL ?? 'phase14';
const phaseTitle = process.env.PHASE15_TITLE ?? process.env.PHASE14_TITLE ?? 'Water9 Phase 14 Foreground Terrain Presentation';
const outDir = process.env.PHASE15_OUT_DIR ?? process.env.PHASE14_OUT_DIR ?? '/home/orlovboros/projects/manager/runs/water9-phase14-foreground-terrain-presentation-2026-07-02';
const host = '127.0.0.1';
const port = Number(process.env.PHASE15_PORT ?? process.env.PHASE14_PORT ?? 5215);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=3`;

await mkdir(outDir, { recursive: true });

let server = null;
if (!process.env.PLAYTEST_URL) {
  server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

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
  await page.waitForTimeout(520);
  return result;
}

async function writeDataUrl(path, dataUrl) {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  await writeFile(path, Buffer.from(base64, 'base64'));
}

async function canvasDerivedPng(page, mode, rect = null, scale = 1) {
  return page.evaluate(({ mode: requestedMode, rect: requestedRect, scale: requestedScale }) => {
    const source = document.querySelector('#game canvas');
    if (!source) throw new Error('missing #game canvas');
    const sx = Math.max(0, Math.floor(requestedRect?.x ?? 0));
    const sy = Math.max(0, Math.floor(requestedRect?.y ?? 0));
    const sw = Math.min(source.width - sx, Math.floor(requestedRect?.width ?? source.width));
    const sh = Math.min(source.height - sy, Math.floor(requestedRect?.height ?? source.height));
    const scaleFactor = Math.max(1, Math.floor(requestedScale || 1));
    const canvas = document.createElement('canvas');
    canvas.width = sw * scaleFactor;
    canvas.height = sh * scaleFactor;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('missing output canvas context');
    context.imageSmoothingEnabled = false;
    context.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
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
      sourceSelector: '#game canvas',
      sourceWidth: source.width,
      sourceHeight: source.height,
      x: sx,
      y: sy,
      width: sw,
      height: sh,
      outputWidth: canvas.width,
      outputHeight: canvas.height,
      mode: requestedMode,
    };
  }, { mode, rect, scale });
}

async function fileBytes(path) {
  return (await stat(path)).size;
}

function proofMetadata(derived) {
  const { dataUrl: _dataUrl, ...metadata } = derived;
  return metadata;
}

async function canvasStats(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#game canvas');
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false, width: 0, height: 0 };
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let min = 255;
    let max = 0;
    let brightBottom = 0;
    let bottomSamples = 0;
    for (let y = 0; y < canvas.height; y += 12) {
      for (let x = 0; x < canvas.width; x += 12) {
        const i = (y * canvas.width + x) * 4;
        const luma = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
        min = Math.min(min, luma);
        max = Math.max(max, luma);
        if (y > canvas.height * 0.52) {
          bottomSamples += 1;
          if (luma > 190) brightBottom += 1;
        }
      }
    }
    return {
      exists: true,
      selector: '#game canvas',
      width: canvas.width,
      height: canvas.height,
      lumaMin: Math.round(min),
      lumaMax: Math.round(max),
      brightBottomRatio: bottomSamples ? Number((brightBottom / bottomSamples).toFixed(4)) : 0,
    };
  });
}

try {
  await waitForServer(baseUrl);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(baseUrl);
  await waitForPlaytest(page);

  const review = await command(page, 'backgroundReview', {
    label: `${phaseLabel}-foreground-terrain-presentation`,
    depth: 1500,
    reviewX: 6900,
    clearWaterWindow: true,
  });

  const fullColorPath = resolve(outDir, `${phaseLabel}-actual-gameplay-full-color.png`);
  const cropPath = resolve(outDir, `${phaseLabel}-actual-gameplay-bottom-terrain-crop-zoom.png`);
  const grayscalePath = resolve(outDir, `${phaseLabel}-actual-gameplay-grayscale.png`);
  const naturalPath = resolve(outDir, `${phaseLabel}-actual-gameplay-natural-terrain-supplement.png`);
  const summaryPath = resolve(outDir, `${phaseLabel}-actual-gameplay-proof-summary.json`);

  await page.locator('#game canvas').screenshot({ path: fullColorPath });
  const crop = await canvasDerivedPng(page, 'color', { x: 0, y: 342, width: 1280, height: 314 }, 2);
  await writeDataUrl(cropPath, crop.dataUrl);
  const grayscale = await canvasDerivedPng(page, 'grayscale');
  await writeDataUrl(grayscalePath, grayscale.dataUrl);
  const stagedStats = await canvasStats(page);

  const naturalReview = await command(page, 'backgroundReview', {
    label: `${phaseLabel}-natural-terrain-supplement`,
    depth: 1500,
    reviewX: 6900,
    clearWaterWindow: false,
  });
  await page.locator('#game canvas').screenshot({ path: naturalPath });
  const naturalStats = await canvasStats(page);

  await writeFile(summaryPath, `${JSON.stringify({
    phase: phaseTitle,
    sourceSelector: '#game canvas',
    fullColor: { path: fullColorPath, bytes: await fileBytes(fullColorPath) },
    bottomTerrainCropZoom: { path: cropPath, bytes: await fileBytes(cropPath), derivedFrom: proofMetadata(crop) },
    grayscale: { path: grayscalePath, bytes: await fileBytes(grayscalePath), derivedFrom: proofMetadata(grayscale) },
    naturalSupplement: { path: naturalPath, bytes: await fileBytes(naturalPath) },
    stagedReview: review,
    naturalReview,
    stagedStats,
    naturalStats,
  }, null, 2)}\n`, 'utf8');

  await browser.close();
  console.log(JSON.stringify({
    ok: true,
    fullColorPath,
    cropPath,
    grayscalePath,
    naturalPath,
    summaryPath,
    stagedStats,
    naturalStats,
  }, null, 2));
} finally {
  if (server) {
    server.kill('SIGTERM');
    await sleep(250);
  }
}

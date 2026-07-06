import { writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const outDir = '/mnt/nxt-dev/water9/runs/water9-biome-landmark-transition-audit-2026-07-06/b4';
const baseUrl = process.env.PLAYTEST_URL ?? 'http://127.0.0.1:5181/';
const selector = '#game canvas';

const scenarios = [
  { key: 'b3-before-b4-lower', biome: 3, depth: 1260, note: 'B3 lower-band baseline before travel to B4' },
  { key: 'b4-entry-surface', biome: 4, depth: 119, note: 'B4 first-water/surface-band entry after biome switch' },
  { key: 'b4-deeper-lower', biome: 4, depth: 1260, note: 'B4 lower band in normal play' },
  { key: 'b4-transition-deep', biome: 4, depth: 1580, note: 'B4 transitionDeep/deeper swim-by band' },
];

function git(args) {
  return execFileSync('git', args, { cwd: '/mnt/nxt-dev/water9', encoding: 'utf8' }).trim();
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
  const result = await page.evaluate(([commandName, commandValue]) => (
    window.__AQUA_PLAYTEST__?.command(commandName, commandValue)
  ), [name, value]);
  await page.waitForTimeout(550);
  return result;
}

async function canvasPng(page, mode) {
  return page.evaluate(({ selector: sourceSelector, mode: requestedMode }) => {
    const source = document.querySelector(sourceSelector);
    if (!source) throw new Error(`missing ${sourceSelector}`);
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('missing canvas context');
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
      width: canvas.width,
      height: canvas.height,
      mode: requestedMode,
      selector: sourceSelector,
    };
  }, { selector, mode });
}

async function writeDataUrl(path, dataUrl) {
  await writeFile(path, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
}

async function canvasStats(page) {
  return page.evaluate((sourceSelector) => {
    const canvas = document.querySelector(sourceSelector);
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false };
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
      width: canvas.width,
      height: canvas.height,
      lumaMin: Math.round(min),
      lumaMax: Math.round(max),
      lumaAverage: Number((sum / Math.max(1, samples)).toFixed(2)),
    };
  }, selector);
}

function compactBackground(review) {
  const anchors = review?.anchors?.items ?? [];
  return {
    biome: review?.biome,
    depth: review?.depth,
    depthBand: review?.depthBand,
    activeBand: review?.activeProfile,
    activeBlend: review?.activeBandBlend,
    anchorAssets: review?.anchors?.assets,
    anchorCount: anchors.length,
    anchors,
    layers: review?.layers?.map((layer) => ({
      index: layer.index,
      band: layer.band,
      textureKey: layer.textureKey,
      painterlyAssetId: layer.painterlyAssetId,
      alpha: layer.alpha,
      display: layer.display,
    })),
    waterColumnLayers: review?.worldSpaceNoise?.layers?.map((layer) => ({
      id: layer.id,
      kind: layer.kind,
      assetId: layer.assetId,
      alpha: layer.alpha,
      depthGate: layer.depthGate,
    })),
    postDarknessVeil: review?.worldSpaceNoise?.postDarknessVeil,
  };
}

const browser = await chromium.launch({ headless: true });
const outputs = [];

try {
  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await page.goto(`${baseUrl}?playtest=1&biome=${scenario.biome}`);
    await waitForPlaytest(page);
    await command(page, 'start');
    await command(page, 'dive');
    const move = await command(page, 'teleportToReachableDepth', scenario.depth);
    await command(page, 'centerCameraOnPlayer');
    await command(page, 'clearProofOverlays');
    await page.waitForTimeout(900);
    const review = await command(page, 'backgroundReview', { label: scenario.key, depth: scenario.depth });
    await page.waitForTimeout(600);
    const color = await canvasPng(page, 'color');
    const grayscale = await canvasPng(page, 'grayscale');
    const colorPath = resolve(outDir, `${scenario.key}-game-canvas.png`);
    const grayscalePath = resolve(outDir, `${scenario.key}-game-canvas-grayscale.png`);
    await writeDataUrl(colorPath, color.dataUrl);
    await writeDataUrl(grayscalePath, grayscale.dataUrl);
    const stats = await canvasStats(page);
    outputs.push({
      ...scenario,
      url: `${baseUrl}?playtest=1&biome=${scenario.biome}`,
      sourceSelector: selector,
      captureMethod: 'Playwright Chromium; normal ?playtest biome route; start+dive; playtest-only teleportToReachableDepth/backgroundReview for repeatable normal-world positioning; direct #game canvas toDataURL',
      move,
      colorPath,
      grayscalePath,
      colorBytes: (await stat(colorPath)).size,
      grayscaleBytes: (await stat(grayscalePath)).size,
      canvas: { color: { ...color, dataUrl: undefined }, grayscale: { ...grayscale, dataUrl: undefined }, stats },
      background: compactBackground(review),
    });
    await page.close();
  }
} finally {
  await browser.close();
}

const proofPath = resolve(outDir, 'b4-landmark-transition-proof.json');
await writeFile(proofPath, `${JSON.stringify({
  schema: 'water9/b4-landmark-transition-audit@1',
  generatedAt: new Date().toISOString(),
  repoRoot: git(['rev-parse', '--show-toplevel']),
  head: git(['rev-parse', '--short', 'HEAD']),
  baseUrl,
  outputs,
}, null, 2)}\n`);
console.log(proofPath);

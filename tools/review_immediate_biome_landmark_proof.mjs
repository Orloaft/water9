import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_IMMEDIATE_LANDMARK_OUT_DIR
  ?? '/mnt/nxt-dev/water9/runs/water9-immediate-biome-landmark-proof-2026-07-04';
const host = '127.0.0.1';
const port = Number(process.env.WATER9_IMMEDIATE_LANDMARK_PORT ?? 5234);
const sourceSelector = '#game canvas';
const firstWaterDepth = Number(process.env.WATER9_IMMEDIATE_LANDMARK_DEPTH ?? 12);

const scenarios = [
  {
    biome: 1,
    biomeName: 'The Shallows',
    expectedAssetId: 'biome-shallows-shell-survey-terrace',
    expectedTextureKey: 'water9-biome-landmark-shallows-shell-survey-terrace',
    filename: 'water9-biome1-first-water-landmark.png',
    reviewX: 3600,
  },
  {
    biome: 2,
    biomeName: 'Brine Chimney Cluster Field',
    expectedAssetId: 'biome-brine-vertical-chimney-gpt',
    expectedTextureKey: 'water9-biome-landmark-brine-vertical-chimney-gpt',
    filename: 'water9-biome2-first-water-landmark.png',
    reviewX: 4700,
  },
  {
    biome: 3,
    biomeName: 'Midnight Trench',
    expectedAssetId: 'biome-midnight-black-coral-ribs',
    expectedTextureKey: 'water9-biome-landmark-midnight-black-coral-ribs',
    filename: 'water9-biome3-first-water-landmark.png',
    reviewX: 5800,
  },
  {
    biome: 4,
    biomeName: 'Ancient Ruins',
    expectedAssetId: 'biome-ruins-vault-causeway-lattice',
    expectedTextureKey: 'water9-biome-landmark-ruins-vault-causeway-lattice',
    filename: 'water9-biome4-first-water-landmark.png',
    reviewX: 6900,
  },
];

await mkdir(outDir, { recursive: true });

function git(args) {
  return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8' }).trimEnd();
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitForServer(url, server, serverLogs, timeoutMs = 24000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null) throw new Error(`dev server exited before ready with code ${server.exitCode}`);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite is still binding.
    }
    await sleep(150);
  }
  throw new Error(`dev server was not ready within ${timeoutMs}ms\n${serverLogs.join('')}`);
}

async function waitForPlaytest(page) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 20000 });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const review = await page.evaluate(() => window.__AQUA_PLAYTEST__?.command('biomeLoadingReview')).catch(() => null);
    if (review?.worldReady === true) return;
    await page.waitForTimeout(160);
  }
  throw new Error('generated world was not ready within 30000ms');
}

async function command(page, name, value) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await page.evaluate(
        ([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue),
        [name, value],
      );
      await page.waitForTimeout(220);
      return result;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(420);
      await waitForPlaytest(page);
    }
  }
  throw lastError;
}

async function fileBytes(path) {
  return (await stat(path)).size;
}

async function saveCanvasPng(page, path) {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.querySelector('#game canvas') ?? document.querySelector('canvas');
    return canvas?.toDataURL('image/png') ?? null;
  });
  if (!dataUrl) throw new Error('canvas was not available for PNG capture');
  await writeFile(path, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
}

function matchingAnchor(review, expectedAssetId) {
  const anchors = review?.anchors?.items ?? [];
  return anchors
    .filter((anchor) => anchor.assetStatus === 'available' && anchor.assetId === expectedAssetId)
    .sort((a, b) => ((b.alpha ?? 0) * (b.width ?? 0) * (b.height ?? 0)) - ((a.alpha ?? 0) * (a.width ?? 0) * (a.height ?? 0)))[0]
    ?? null;
}

function matchingRenderedBitmap(review, expectedTextureKey) {
  const rendered = review?.renderedBitmapAnchors ?? [];
  return rendered
    .filter((sprite) => sprite.generatedBackgroundTexture === true && sprite.textureKey === expectedTextureKey)
    .sort((a, b) => ((b.alpha ?? 0) * (b.width ?? 0) * (b.height ?? 0)) - ((a.alpha ?? 0) * (a.width ?? 0) * (a.height ?? 0)))[0]
    ?? null;
}

function bitmapBackgroundRuntimeProof(review) {
  const layers = review?.layers ?? [];
  const worldSpaceNoiseAlpha = Number(review?.worldSpaceNoise?.alpha ?? 0);
  return {
    worldSpaceNoiseDisabled: worldSpaceNoiseAlpha === 0,
    allScenicLayersUseGeneratedTextures: layers.every((layer) => (
      layer.layerKind === 'scenic'
      && layer.painterlyAssetStatus === 'available'
      && typeof layer.textureKey === 'string'
      && layer.textureKey.startsWith('water9-')
      && !layer.textureKey.startsWith('parallax-')
    )),
    noProceduralLayerKind: layers.every((layer) => layer.layerKind !== 'procedural'),
    noParallaxFallbackTextures: layers.every((layer) => !String(layer.textureKey ?? '').startsWith('parallax-')),
    layers: layers.map((layer) => ({
      index: layer.index,
      textureKey: layer.textureKey,
      painterlyAssetId: layer.painterlyAssetId,
      painterlyAssetStatus: layer.painterlyAssetStatus,
      layerKind: layer.layerKind,
    })),
  };
}

async function canvasRegionStats(page, renderedSprite) {
  if (!renderedSprite?.screenBounds) return null;
  return page.evaluate((bounds) => {
    const canvas = document.querySelector('#game canvas') ?? document.querySelector('canvas');
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    const left = Math.max(0, Math.floor(bounds.x * scaleX));
    const top = Math.max(0, Math.floor(bounds.y * scaleY));
    const right = Math.min(canvas.width, Math.ceil((bounds.x + bounds.width) * scaleX));
    const bottom = Math.min(canvas.height, Math.ceil((bounds.y + bounds.height) * scaleY));
    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);
    if (width < 4 || height < 4) return { exists: true, width, height, samples: 0, variedSamples: 0, lumaRange: 0, alphaCoverage: 0 };
    const data = context.getImageData(left, top, width, height).data;
    let samples = 0;
    let variedSamples = 0;
    let alphaSamples = 0;
    let minLuma = 255;
    let maxLuma = 0;
    const step = Math.max(4, Math.floor(Math.sqrt((width * height) / 900)));
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const offset = (y * width + x) * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const a = data[offset + 3];
        if (a > 8) alphaSamples += 1;
        const luma = Math.round(r * 0.2126 + g * 0.7152 + b * 0.0722);
        minLuma = Math.min(minLuma, luma);
        maxLuma = Math.max(maxLuma, luma);
        if (Math.max(r, g, b) - Math.min(r, g, b) > 10) variedSamples += 1;
        samples += 1;
      }
    }
    return {
      exists: true,
      width,
      height,
      samples,
      variedSamples,
      lumaRange: maxLuma - minLuma,
      alphaCoverage: samples ? alphaSamples / samples : 0,
    };
  }, renderedSprite.screenBounds);
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function writeContactSheet(browser, captures) {
  const contactSheetPath = resolve(outDir, 'water9-immediate-biome-landmark-contact-sheet.png');
  const contactSheetHtmlPath = resolve(outDir, 'water9-immediate-biome-landmark-contact-sheet.html');
  async function pngDataUrl(path) {
    const data = await readFile(path);
    return `data:image/png;base64,${data.toString('base64')}`;
  }
  const cards = (await Promise.all(captures.map(async (capture) => `
    <section>
      <h2>Biome ${capture.biome}: ${htmlEscape(capture.biomeName)}</h2>
      <p>depth ${capture.depth}m / ${htmlEscape(capture.depthBand)} / ${htmlEscape(capture.landmarkId)}</p>
      <img src="${await pngDataUrl(capture.screenshotPath)}" alt="${htmlEscape(capture.filename)}">
    </section>
  `))).join('');
  const html = `<!doctype html>
<meta charset="utf-8">
<style>
  body { margin: 0; padding: 24px; background: #061114; color: #dceff0; font: 18px system-ui, sans-serif; }
  main { display: grid; grid-template-columns: repeat(2, 1fr); gap: 22px 24px; }
  h1 { font-size: 24px; margin: 0 0 18px; }
  h2 { font-size: 19px; margin: 0 0 8px; font-weight: 650; }
  p { margin: 0 0 8px; color: #acc4c8; font-size: 14px; }
  img { width: 100%; border: 1px solid #35535b; background: #020708; display: block; }
</style>
<h1>Water9 Immediate Biome Landmark Proof</h1>
<main>${cards}</main>`;
  await writeFile(contactSheetHtmlPath, html, 'utf8');
  const page = await browser.newPage({ viewport: { width: 1700, height: 1200 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: contactSheetPath, fullPage: true });
  await page.close();
  return {
    path: contactSheetPath,
    htmlPath: contactSheetHtmlPath,
    bytes: await fileBytes(contactSheetPath),
  };
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

try {
  await waitForServer(baseUrl, server, serverLogs);
  const browser = await chromium.launch({ headless: true });
  const captures = [];

  for (const scenario of scenarios) {
    console.error(`[immediate-landmark] start biome ${scenario.biome}`);
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await page.goto(`${baseUrl}?playtest=1&biome=${scenario.biome}`);
    await page.waitForLoadState('domcontentloaded');
    await page.addStyleTag({ content: '.title-screen, #title-screen, #controller-status, #controller-status.is-open { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }' });
    await waitForPlaytest(page);
    const review = await command(page, 'backgroundReview', {
      label: `water9-biome${scenario.biome}-first-water-landmark`,
      depth: firstWaterDepth,
      reviewX: scenario.reviewX,
      clearWaterWindow: true,
      zoom: scenario.biome === 1 || scenario.biome === 4 ? 1.18 : 1.35,
    });
    await page.evaluate(() => {
      document.querySelector('.title-screen')?.remove();
      document.querySelector('#title-screen')?.remove();
      document.querySelector('#controller-status')?.remove();
    });
    await page.waitForTimeout(300);

    const screenshotPath = resolve(outDir, scenario.filename);
    await saveCanvasPng(page, screenshotPath);
    const anchor = matchingAnchor(review, scenario.expectedAssetId);
    const renderedBitmap = matchingRenderedBitmap(review, scenario.expectedTextureKey);
    const pixelStats = await canvasRegionStats(page, renderedBitmap);
    const bitmapRuntimeProof = bitmapBackgroundRuntimeProof(review);
    const capture = {
      biome: scenario.biome,
      biomeName: scenario.biomeName,
      depth: firstWaterDepth,
      depthBand: review?.activeProfile?.activeBand ?? null,
      filename: scenario.filename,
      screenshotPath,
      screenshotBytes: await fileBytes(screenshotPath),
      landmarkId: scenario.expectedAssetId,
      expectedTextureKey: scenario.expectedTextureKey,
      textureKey: renderedBitmap?.textureKey ?? anchor?.textureKey ?? null,
      selectedAnchor: anchor,
      renderedBitmap,
      bitmapRuntimeProof,
      pixelStats,
      pass: Boolean(renderedBitmap)
        && renderedBitmap.crop === null
        && (renderedBitmap.sourceDimensions?.width ?? 0) > 128
        && (renderedBitmap.sourceDimensions?.height ?? 0) > 128
        && renderedBitmap.tint === '#ffffff'
        && bitmapRuntimeProof.worldSpaceNoiseDisabled
        && bitmapRuntimeProof.allScenicLayersUseGeneratedTextures
        && bitmapRuntimeProof.noProceduralLayerKind
        && bitmapRuntimeProof.noParallaxFallbackTextures
        && (renderedBitmap.alpha ?? 0) >= 0.08
        && (renderedBitmap.height ?? 0) >= 180
        && (pixelStats?.samples ?? 0) >= 80
        && (pixelStats?.lumaRange ?? 0) >= 10
        && (pixelStats?.variedSamples ?? 0) >= 8
        && (await fileBytes(screenshotPath)) > 30000,
    };
    captures.push(capture);
    await page.close();
    console.error(`[immediate-landmark] captured biome ${scenario.biome}`);
  }

  const contactSheet = await writeContactSheet(browser, captures);
  await browser.close();

  const provenancePath = resolve(outDir, 'water9-immediate-biome-landmark-proof.json');
  await writeFile(provenancePath, `${JSON.stringify({
    schema: 'water9/immediate-biome-landmark-proof@1',
    timestamp: new Date().toISOString(),
    repoRoot,
    head,
    sourceSelector,
    baseUrl,
    gitStatusBefore,
    gitStatusAfter: git(['status', '--short']),
    contactSheet,
    captures,
    commandsRun: [
      `WATER9_IMMEDIATE_LANDMARK_OUT_DIR=${outDir} WATER9_IMMEDIATE_LANDMARK_PORT=${port} node tools/review_immediate_biome_landmark_proof.mjs`,
    ],
  }, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    ok: captures.every((capture) => capture.pass),
    outDir,
    provenancePath,
    contactSheet,
    captures,
  }, null, 2));
  if (!captures.every((capture) => capture.pass)) process.exitCode = 1;
} finally {
  if (server) {
    server.kill('SIGTERM');
    await sleep(250);
  }
}

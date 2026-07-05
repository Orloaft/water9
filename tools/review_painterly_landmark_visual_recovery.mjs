import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_LANDMARK_VISUAL_RECOVERY_OUT_DIR
  ?? '/mnt/nxt-dev/water9/runs/water9-painterly-landmark-visual-recovery-2026-07-04';
const host = '127.0.0.1';
const sourceSelector = '#game canvas';
const firstWaterDepth = Number(process.env.WATER9_LANDMARK_VISUAL_RECOVERY_DEPTH ?? 12);

const scenarios = [
  {
    biome: 1,
    biomeName: 'The Shallows',
    expectedAssetId: 'biome-shallows-shell-survey-terrace',
    expectedTextureKey: 'water9-biome-landmark-shallows-shell-survey-terrace',
    filename: 'water9-biome1-normal-gameplay-landmark.png',
  },
  {
    biome: 2,
    biomeName: 'Brine Chimney Cluster Field',
    expectedAssetId: 'biome-brine-vertical-chimney-gpt',
    expectedTextureKey: 'water9-biome-landmark-brine-vertical-chimney-gpt',
    filename: 'water9-biome2-normal-gameplay-landmark.png',
  },
  {
    biome: 3,
    biomeName: 'Midnight Trench',
    expectedAssetId: 'biome-midnight-black-coral-ribs',
    expectedTextureKey: 'water9-biome-landmark-midnight-black-coral-ribs',
    filename: 'water9-biome3-normal-gameplay-landmark.png',
  },
  {
    biome: 4,
    biomeName: 'Ancient Ruins',
    expectedAssetId: 'biome-ruins-vault-causeway-lattice',
    expectedTextureKey: 'water9-biome-landmark-ruins-vault-causeway-lattice',
    filename: 'water9-biome4-normal-gameplay-landmark.png',
  },
];

await mkdir(outDir, { recursive: true });

function git(args) {
  return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8' }).trimEnd();
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function portAvailable(port) {
  return new Promise((resolvePort) => {
    const server = net.createServer();
    server.once('error', () => resolvePort(false));
    server.once('listening', () => {
      server.close(() => resolvePort(true));
    });
    server.listen(port, host);
  });
}

async function choosePort() {
  const requested = Number(process.env.WATER9_LANDMARK_VISUAL_RECOVERY_PORT ?? 0);
  const candidates = requested >= 5180 && requested <= 5199
    ? [requested, ...Array.from({ length: 20 }, (_, index) => 5180 + index).filter((port) => port !== requested)]
    : Array.from({ length: 20 }, (_, index) => 5180 + index);
  for (const port of candidates) {
    if (await portAvailable(port)) return port;
  }
  throw new Error('no available port in 5180-5199');
}

async function waitForServer(url, server, serverLogs, timeoutMs = 24000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null) throw new Error(`dev server exited before ready with code ${server.exitCode}\n${serverLogs.join('')}`);
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

async function waitForPlaytest(page, biome) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 20000 });
  await page.waitForFunction((targetBiome) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return snap?.world?.ready !== false && snap?.state?.biome === targetBiome && !snap?.ui?.biomeLoading?.active;
  }, biome, { timeout: 30000 });
}

async function command(page, name, value) {
  const result = await page.evaluate(
    ([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue),
    [name, value],
  );
  await page.waitForTimeout(260);
  return result;
}

async function fileBytes(path) {
  return (await stat(path)).size;
}

async function saveCanvasPng(page, path, grayscale = false) {
  const dataUrl = await page.evaluate((makeGray) => {
    const canvas = document.querySelector('#game canvas') ?? document.querySelector('canvas');
    if (!canvas) return null;
    if (!makeGray) return canvas.toDataURL('image/png');
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(canvas, 0, 0);
    const image = context.getImageData(0, 0, copy.width, copy.height);
    for (let offset = 0; offset < image.data.length; offset += 4) {
      const luma = Math.round(image.data[offset] * 0.2126 + image.data[offset + 1] * 0.7152 + image.data[offset + 2] * 0.0722);
      image.data[offset] = luma;
      image.data[offset + 1] = luma;
      image.data[offset + 2] = luma;
    }
    context.putImageData(image, 0, 0);
    return copy.toDataURL('image/png');
  }, grayscale);
  if (!dataUrl) throw new Error('canvas was not available for PNG capture');
  await writeFile(path, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
}

function matchingRenderedBitmap(snapshot, expectedTextureKey) {
  const rendered = snapshot?.environmentVisualProfile?.renderedBitmapAnchors ?? [];
  return rendered
    .filter((sprite) => sprite.generatedBackgroundTexture === true && sprite.textureKey === expectedTextureKey)
    .sort((a, b) => ((b.alpha ?? 0) * (b.width ?? 0) * (b.height ?? 0)) - ((a.alpha ?? 0) * (a.width ?? 0) * (a.height ?? 0)))[0]
    ?? null;
}

function visibleCoverage(renderedSprite) {
  const bounds = renderedSprite?.screenBounds;
  if (!bounds) return 0;
  const left = Math.max(0, bounds.x);
  const top = Math.max(0, bounds.y);
  const right = Math.min(1280, bounds.x + bounds.width);
  const bottom = Math.min(800, bounds.y + bounds.height);
  return Math.max(0, right - left) * Math.max(0, bottom - top) / (1280 * 800);
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
    if (width < 4 || height < 4) return { exists: true, width, height, samples: 0, variedSamples: 0, lumaRange: 0 };
    const data = context.getImageData(left, top, width, height).data;
    let samples = 0;
    let variedSamples = 0;
    let minLuma = 255;
    let maxLuma = 0;
    const step = Math.max(4, Math.floor(Math.sqrt((width * height) / 1200)));
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const offset = (y * width + x) * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const luma = Math.round(r * 0.2126 + g * 0.7152 + b * 0.0722);
        minLuma = Math.min(minLuma, luma);
        maxLuma = Math.max(maxLuma, luma);
        if (Math.max(r, g, b) - Math.min(r, g, b) > 10) variedSamples += 1;
        samples += 1;
      }
    }
    return { exists: true, width, height, samples, variedSamples, lumaRange: maxLuma - minLuma };
  }, renderedSprite.screenBounds);
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function writeContactSheet(browser, captures, grayscale = false) {
  const suffix = grayscale ? 'grayscale-contact-sheet' : 'contact-sheet';
  const contactSheetPath = resolve(outDir, `water9-painterly-landmark-visual-recovery-${suffix}.png`);
  const contactSheetHtmlPath = resolve(outDir, `water9-painterly-landmark-visual-recovery-${suffix}.html`);
  async function pngDataUrl(path) {
    const data = await readFile(path);
    return `data:image/png;base64,${data.toString('base64')}`;
  }
  const cards = (await Promise.all(captures.map(async (capture) => `
    <section>
      <h2>Biome ${capture.biome}: ${htmlEscape(capture.biomeName)}</h2>
      <p>depth ${capture.depth}m / ${htmlEscape(capture.depthBand)} / ${htmlEscape(capture.landmarkId)}</p>
      <img src="${await pngDataUrl(grayscale ? capture.grayscalePath : capture.screenshotPath)}" alt="${htmlEscape(capture.filename)}">
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
<h1>Water9 Painterly Landmark Visual Recovery ${grayscale ? 'Grayscale' : 'Normal'} Proof</h1>
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
const port = process.env.PLAYTEST_URL ? null : await choosePort();
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
    console.error(`[visual-recovery] start biome ${scenario.biome}`);
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await page.goto(`${baseUrl}?playtest=1&biome=${scenario.biome}`);
    await page.waitForLoadState('domcontentloaded');
    await waitForPlaytest(page, scenario.biome);
    await command(page, 'start');
    await command(page, 'dive');
    const teleport = await command(page, 'teleportToReachableDepth', firstWaterDepth);
    if (!teleport?.ok) throw new Error(`failed to reach water in biome ${scenario.biome}: ${JSON.stringify(teleport)}`);
    await command(page, 'clearProofOverlays');
    await command(page, 'centerCameraOnPlayer');
    await page.waitForTimeout(500);
    const snapshot = await command(page, 'terrainLookReview');
    const renderedBitmap = matchingRenderedBitmap(snapshot, scenario.expectedTextureKey);
    const pixelStats = await canvasRegionStats(page, renderedBitmap);

    const screenshotPath = resolve(outDir, scenario.filename);
    const grayscalePath = resolve(outDir, scenario.filename.replace(/\.png$/, '-grayscale.png'));
    await saveCanvasPng(page, screenshotPath, false);
    await saveCanvasPng(page, grayscalePath, true);
    const coverage = visibleCoverage(renderedBitmap);
    const capture = {
      biome: scenario.biome,
      biomeName: scenario.biomeName,
      depth: snapshot?.state?.depth ?? teleport.depthMeters,
      depthBand: snapshot?.environmentVisualProfile?.activeProfile?.activeBand ?? null,
      filename: scenario.filename,
      screenshotPath,
      grayscalePath,
      screenshotBytes: await fileBytes(screenshotPath),
      grayscaleBytes: await fileBytes(grayscalePath),
      landmarkId: scenario.expectedAssetId,
      expectedTextureKey: scenario.expectedTextureKey,
      renderedBitmap,
      visibleCoverage: coverage,
      pixelStats,
      teleport,
      pass: Boolean(renderedBitmap)
        && renderedBitmap.generatedBackgroundTexture === true
        && renderedBitmap.textureKey === scenario.expectedTextureKey
        && (renderedBitmap.alpha ?? 0) >= 0.82
        && coverage >= 0.52
        && (pixelStats?.lumaRange ?? 0) >= 16
        && (pixelStats?.variedSamples ?? 0) >= 20
        && (await fileBytes(screenshotPath)) > 30000
        && (await fileBytes(grayscalePath)) > 25000,
    };
    captures.push(capture);
    await page.close();
    console.error(`[visual-recovery] captured biome ${scenario.biome}`);
  }

  const contactSheet = await writeContactSheet(browser, captures, false);
  const grayscaleContactSheet = await writeContactSheet(browser, captures, true);
  await browser.close();

  const metadataPath = resolve(outDir, 'water9-painterly-landmark-visual-recovery.json');
  await writeFile(metadataPath, `${JSON.stringify({
    schema: 'water9/painterly-landmark-visual-recovery@1',
    timestamp: new Date().toISOString(),
    repoRoot,
    head,
    sourceSelector,
    baseUrl,
    port,
    gitStatusBefore,
    gitStatusAfter: git(['status', '--short']),
    contactSheet,
    grayscaleContactSheet,
    captures,
    commandsRun: [
      `WATER9_LANDMARK_VISUAL_RECOVERY_OUT_DIR=${outDir} node tools/review_painterly_landmark_visual_recovery.mjs`,
    ],
  }, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    ok: captures.every((capture) => capture.pass),
    outDir,
    metadataPath,
    contactSheet,
    grayscaleContactSheet,
    captures: captures.map((capture) => ({
      biome: capture.biome,
      pass: capture.pass,
      depth: capture.depth,
      visibleCoverage: capture.visibleCoverage,
      pixelStats: capture.pixelStats,
      renderedBitmap: capture.renderedBitmap,
    })),
  }, null, 2));
  if (!captures.every((capture) => capture.pass)) process.exitCode = 1;
} finally {
  if (server) {
    server.kill('SIGTERM');
    await sleep(250);
  }
}

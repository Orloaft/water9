import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_BIOME_LANDMARK_OUT_DIR ?? '/home/orlovboros/projects/manager/runs/water9-landmark-parity-backtrack-2026-07-03/final';
const host = '127.0.0.1';
const port = Number(process.env.WATER9_BIOME_LANDMARK_PORT ?? 5226);
const sourceSelector = '#game canvas';
const scenarios = [
  {
    biome: 1,
    biomeName: 'The Shallows',
    label: 'surface-entry',
    depth: 119,
    reviewX: 3600,
    intended: 'surface exclusion / pre-entry check',
    expectedAssetPrefix: '',
    expectedAnchorCount: 0,
  },
  {
    biome: 1,
    biomeName: 'The Shallows',
    label: 'upper-shell-survey',
    depth: 180,
    reviewX: 3600,
    intended: 'kelp, reef arch, shell/fossil terrace, drowned survey frame',
    expectedAssetPrefix: 'biome-shallows',
  },
  {
    biome: 2,
    biomeName: 'Brine Chimney Cluster Field',
    label: 'mid-vent-sulfide',
    depth: 760,
    reviewX: 4700,
    intended: 'separated vertical brine chimneys, extractor derricks, isolated basin pods, and dark negative space; no wide horizontal shelf',
    expectedAssetPrefix: 'biome-brine',
    disallowedNormalAssetPrefixes: ['phase5-', 'phase7-transition-', 'phase8-transition-', 'phase9-transition-', 'phase10-transition-', 'phase11-transition-'],
    minMatchingMaxAlpha: 0.22,
    minMatchingMaxHeight: 260,
    grayscale: true,
  },
  {
    biome: 3,
    biomeName: 'Midnight Trench',
    label: 'lower-black-coral-ribs',
    depth: 1260,
    reviewX: 5800,
    intended: 'black coral gates, vertical pressure ribs, lantern pits, siphonophore-chain curtains',
    expectedAssetPrefix: 'biome-midnight',
    disallowedNormalAssetPrefixes: ['phase5-', 'phase7-transition-', 'phase8-transition-', 'phase9-transition-', 'phase10-transition-', 'phase11-transition-'],
    minMatchingMaxAlpha: 0.18,
    minMatchingMaxHeight: 360,
    grayscale: true,
  },
  {
    biome: 4,
    biomeName: 'Ancient Ruins',
    label: 'lower-vault-causeway',
    depth: 1260,
    reviewX: 6900,
    intended: 'vault aperture, obelisks, broken causeway, alloy lattice, relic shrine language',
    expectedAssetPrefix: 'biome-ruins',
    disallowedNormalAssetPrefixes: ['phase5-', 'phase7-transition-', 'phase8-transition-', 'phase9-transition-', 'phase10-transition-', 'phase11-transition-'],
    minMatchingMaxAlpha: 0.08,
    minMatchingMaxHeight: 220,
    grayscale: true,
  },
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
    let review = null;
    try {
      review = await page.evaluate(() => window.__AQUA_PLAYTEST__?.command('biomeLoadingReview'));
    } catch (error) {
      if (!String(error?.message ?? error).includes('Execution context was destroyed')) throw error;
      await page.waitForLoadState('domcontentloaded').catch(() => {});
    }
    if (review?.worldReady === true) return;
    await page.waitForTimeout(160);
  }
  throw new Error('generated world was not ready within 30000ms');
}

async function command(page, name, value) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue), [name, value]);
      await page.waitForTimeout(220);
      return result;
    } catch (error) {
      if (!String(error?.message ?? error).includes('Execution context was destroyed') || attempt === 2) throw error;
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await waitForPlaytest(page);
    }
  }
  return null;
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

function anchorLedger(review, scenario) {
  const anchors = review?.anchors?.items ?? [];
  const visibleAssets = anchors
    .filter((anchor) => anchor.assetStatus === 'available')
    .map((anchor) => anchor.assetId)
    .filter(Boolean);
  const matchingAssets = scenario.expectedAssetPrefix
    ? visibleAssets.filter((assetId) => String(assetId).startsWith(scenario.expectedAssetPrefix))
    : [];
  const disallowedAssets = visibleAssets.filter((assetId) => (
    scenario.disallowedNormalAssetPrefixes?.some((prefix) => String(assetId).startsWith(prefix))
  ));
  const biomeSpecificRatio = visibleAssets.length ? matchingAssets.length / visibleAssets.length : 0;
  const matchingAnchors = anchors.filter((anchor) => (
    anchor.assetStatus === 'available'
    && scenario.expectedAssetPrefix
    && String(anchor.assetId).startsWith(scenario.expectedAssetPrefix)
  ));
  const matchingMaxAlpha = matchingAnchors.reduce((max, anchor) => Math.max(max, Number(anchor.alpha) || 0), 0);
  const matchingMaxHeight = matchingAnchors.reduce((max, anchor) => Math.max(max, Number(anchor.height) || 0), 0);
  const visibilityPass = (
    matchingMaxAlpha >= (scenario.minMatchingMaxAlpha ?? 0)
    && matchingMaxHeight >= (scenario.minMatchingMaxHeight ?? 0)
  );
  const expectedPass = typeof scenario.expectedAnchorCount === 'number'
    ? anchors.length === scenario.expectedAnchorCount
    : matchingAssets.length > 0;
  const requireBiomeSpecificDominance = Boolean(scenario.disallowedNormalAssetPrefixes?.length);
  const pass = expectedPass && visibilityPass && disallowedAssets.length === 0 && (!requireBiomeSpecificDominance || biomeSpecificRatio >= 0.75);
  return {
    pass,
    expectedPass,
    visibilityPass,
    anchorCount: anchors.length,
    visibleAssets,
    matchingAssets,
    matchingMaxAlpha: Number(matchingMaxAlpha.toFixed(3)),
    matchingMaxHeight: Number(matchingMaxHeight.toFixed(1)),
    disallowedAssets,
    biomeSpecificRatio: Number(biomeSpecificRatio.toFixed(3)),
    anchors: anchors.map((anchor) => ({
      id: anchor.id,
      assetId: anchor.assetId,
      assetStatus: anchor.assetStatus,
      depthBand: anchor.depthBand,
      alpha: anchor.alpha,
      width: anchor.width,
      height: anchor.height,
      x: anchor.x,
      y: anchor.y,
    })),
  };
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function writeContactSheet(browser, captures) {
  const contactSheetPath = resolve(outDir, 'water9-biome-landmark-final-contact-sheet.png');
  const contactSheetHtmlPath = resolve(outDir, 'water9-biome-landmark-final-contact-sheet.html');
  async function pngDataUrl(path) {
    const data = await readFile(path);
    return `data:image/png;base64,${data.toString('base64')}`;
  }
  const cards = (await Promise.all(captures.map(async (capture) => `
    <section>
      <h2>Biome ${capture.biome} - ${htmlEscape(capture.biomeName)}</h2>
      <p>${htmlEscape(capture.label)} / ${htmlEscape(capture.depthBand)} / ${capture.pass ? 'PASS' : 'FAIL'}</p>
      <img src="${await pngDataUrl(capture.screenshotPath)}" alt="${htmlEscape(capture.label)}">
      <p class="assets">Assets: ${htmlEscape(capture.ledger.visibleAssets.join(', ') || 'none')}</p>
      ${capture.grayscalePath ? `<img src="${await pngDataUrl(capture.grayscalePath)}" alt="${htmlEscape(capture.label)} grayscale">` : ''}
    </section>
  `))).join('');
  const html = `<!doctype html>
<meta charset="utf-8">
<style>
  body { margin: 0; padding: 24px; background: #061114; color: #dceff0; font: 18px system-ui, sans-serif; }
  main { display: grid; grid-template-columns: repeat(2, 1fr); gap: 22px 24px; }
  h1 { font-size: 24px; margin: 0 0 18px; }
  h2 { font-size: 20px; margin: 0 0 8px; font-weight: 650; }
  p { margin: 0 0 8px; color: #acc4c8; }
  .assets { min-height: 38px; font-size: 13px; line-height: 1.3; color: #88a2a8; }
  img { width: 100%; border: 1px solid #35535b; background: #020708; display: block; margin: 8px 0 0; }
</style>
<h1>Water9 Biome Landmark Final Runtime Contact Sheet</h1>
<main>${cards}</main>`;
  await writeFile(contactSheetHtmlPath, html, 'utf8');
  const page = await browser.newPage({ viewport: { width: 1700, height: 2200 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: contactSheetPath, fullPage: true });
  await page.close();
  return {
    path: contactSheetPath,
    htmlPath: contactSheetHtmlPath,
    bytes: await fileBytes(contactSheetPath),
  };
}

try {
  await waitForServer(baseUrl);
  const browser = await chromium.launch({ headless: true });
  const captures = [];

  for (const scenario of scenarios) {
    console.error(`[landmark-review] start biome ${scenario.biome} ${scenario.label}`);
    const url = `${baseUrl}?playtest=1&biome=${scenario.biome}`;
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await waitForPlaytest(page);
    const review = await command(page, 'backgroundReview', {
      label: `water9-biome-landmark-${scenario.label}`,
      depth: scenario.depth,
      reviewX: scenario.reviewX,
      clearWaterWindow: true,
    });
    console.error(`[landmark-review] reviewed biome ${scenario.biome} ${scenario.label}`);
    await command(page, 'clearProofOverlays');
    await page.addStyleTag({ content: '#title-screen { display: none !important; pointer-events: none !important; }' });
    await page.waitForTimeout(900);

    const stem = `water9-biome${scenario.biome}-${scenario.label}-game-canvas`;
    const screenshotPath = resolve(outDir, `${stem}.png`);
    await page.locator(sourceSelector).screenshot({ path: screenshotPath });
    const stats = await canvasStats(page);
    const ledger = anchorLedger(review, scenario);
    const output = {
      biome: scenario.biome,
      biomeName: scenario.biomeName,
      label: scenario.label,
      depth: scenario.depth,
      depthBand: review?.activeProfile?.activeBand,
      intended: scenario.intended,
      screenshotPath,
      screenshotBytes: await fileBytes(screenshotPath),
      sourceSelector,
      pass: ledger.pass,
      caveat: ledger.pass ? '' : 'Expected biome-specific visible anchors must dominate and no normal-band transition/deep fallback assets may be visible.',
      canvasStats: stats,
      review,
      ledger,
    };

    if (scenario.grayscale) {
      const grayscale = await canvasDerivedPng(page, 'grayscale');
      const grayscalePath = resolve(outDir, `${stem}-grayscale.png`);
      await writeDataUrl(grayscalePath, grayscale.dataUrl);
      output.grayscalePath = grayscalePath;
      output.grayscaleBytes = await fileBytes(grayscalePath);
      output.grayscaleDerivedFrom = withoutDataUrl(grayscale);
    }

    captures.push(output);
    await page.close();
    console.error(`[landmark-review] captured biome ${scenario.biome} ${scenario.label}`);
  }

  const contactSheet = await writeContactSheet(browser, captures);
  await browser.close();

  const gitStatusAfter = git(['status', '--short']);
  const provenancePath = resolve(outDir, 'water9-biome-landmark-proof-provenance.json');
  await writeFile(provenancePath, `${JSON.stringify({
    schema: 'water9-biome-landmark-implementation-proof@1',
    timestamp: new Date().toISOString(),
    repoRoot,
    head,
    sourceSelector,
    baseUrl,
    gitStatusBefore,
    gitStatusAfter,
    contactSheet,
    commandsRun: [
      `WATER9_BIOME_LANDMARK_OUT_DIR=${outDir} WATER9_BIOME_LANDMARK_PORT=${port} node tools/review_biome_landmark_implementation.mjs`,
    ],
    captures,
  }, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({ ok: captures.every((capture) => capture.pass), outDir, provenancePath, contactSheet, captures }, null, 2));
} finally {
  if (server) {
    server.kill('SIGTERM');
    await sleep(250);
  }
}

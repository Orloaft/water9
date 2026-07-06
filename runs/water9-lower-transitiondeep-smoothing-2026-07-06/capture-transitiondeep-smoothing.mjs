import { readFile, stat, writeFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const baseUrl = process.env.PLAYTEST_URL ?? 'http://localhost:5180/';
const outDir = resolve('runs/water9-lower-transitiondeep-smoothing-2026-07-06');
const viewport = { width: 1280, height: 800 };
const depths = [
  { key: 'lower-before-blend', depth: 1340 },
  { key: 'blend-entry', depth: 1380 },
  { key: 'cutoff-mid-blend', depth: 1440 },
  { key: 'transition-late-blend', depth: 1500 },
  { key: 'transition-after-blend', depth: 1560 },
];
const biomes = [
  { biome: 2, key: 'b2', label: 'B2 Brine' },
  { biome: 3, key: 'b3', label: 'B3 Midnight' },
  { biome: 4, key: 'b4', label: 'B4 Ruins' },
];

function urlForBiome(biome) {
  const url = new URL(baseUrl);
  url.searchParams.set('playtest', '1');
  url.searchParams.set('biome', String(biome));
  url.searchParams.set('renderer', 'canvas');
  return url.toString();
}

function bufferFromDataUrl(dataUrl) {
  return Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
}

async function fileBytes(path) {
  return (await stat(path)).size;
}

async function imageDataUrl(path) {
  const data = await readFile(path);
  return `data:image/png;base64,${data.toString('base64')}`;
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function waitForReady(page) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 45000 });
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot();
    return Boolean(snap?.world && snap.world.ready !== false);
  }, null, { timeout: 45000 });
}

async function backgroundReview(page, label, depth) {
  const result = await page.evaluate(([reviewLabel, reviewDepth]) => (
    window.__AQUA_PLAYTEST__?.command('backgroundReview', {
      label: reviewLabel,
      depth: reviewDepth,
      reviewX: 1248,
      clearWaterWindow: false,
      zoom: 1,
    })
  ), [label, depth]);
  await page.waitForTimeout(160);
  return result;
}

async function canvasPng(page, mode = 'color') {
  const dataUrl = await page.evaluate((requestedMode) => {
    const canvas = document.querySelector('#game canvas');
    if (!canvas) throw new Error('#game canvas not found');
    if (requestedMode !== 'grayscale') return canvas.toDataURL('image/png');
    const gray = document.createElement('canvas');
    gray.width = canvas.width;
    gray.height = canvas.height;
    const context = gray.getContext('2d');
    if (!context) throw new Error('2d context unavailable');
    context.drawImage(canvas, 0, 0);
    const image = context.getImageData(0, 0, gray.width, gray.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const luma = Math.round(image.data[i] * 0.2126 + image.data[i + 1] * 0.7152 + image.data[i + 2] * 0.0722);
      image.data[i] = luma;
      image.data[i + 1] = luma;
      image.data[i + 2] = luma;
    }
    context.putImageData(image, 0, 0);
    return gray.toDataURL('image/png');
  }, mode);
  return bufferFromDataUrl(dataUrl);
}

async function canvasMetrics(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#game canvas');
    if (!canvas) return { ok: false, reason: '#game canvas not found' };
    const context = canvas.getContext('2d');
    if (!context) return { ok: false, reason: '2d context unavailable' };
    const width = canvas.width;
    const height = canvas.height;
    const data = context.getImageData(0, 0, width, height).data;
    let samples = 0;
    let nonTransparent = 0;
    let lumaSum = 0;
    let minLuma = 255;
    let maxLuma = 0;
    for (let i = 0; i < data.length; i += 16) {
      const alpha = data[i + 3];
      if (alpha > 0) nonTransparent += 1;
      const luma = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
      lumaSum += luma;
      minLuma = Math.min(minLuma, luma);
      maxLuma = Math.max(maxLuma, luma);
      samples += 1;
    }
    return {
      ok: true,
      width,
      height,
      samples,
      nonTransparent,
      meanLuma: Number((lumaSum / Math.max(1, samples)).toFixed(3)),
      lumaRange: Number((maxLuma - minLuma).toFixed(3)),
    };
  });
}

function summarizeAnchors(snapshot) {
  const items = snapshot?.anchors?.items ?? [];
  const rendered = snapshot?.renderedBitmapAnchors ?? [];
  const byRole = {
    outgoingLower: items.filter((item) => item.transitionBlendRole === 'outgoingLower'),
    incomingTransition: items.filter((item) => item.transitionBlendRole === 'incomingTransition'),
    unblended: items.filter((item) => !item.transitionBlendRole),
  };
  return {
    profileCount: snapshot?.anchors?.profileCount ?? 0,
    visibleCount: snapshot?.anchors?.visibleCount ?? 0,
    transitionBlendCounts: snapshot?.anchors?.transitionBlendCounts ?? { outgoingLower: 0, incomingTransition: 0 },
    visibleLandmarkAssetIds: [...new Set(items.map((item) => item.assetId).filter(Boolean))],
    outgoingLowerAssetIds: [...new Set(byRole.outgoingLower.map((item) => item.assetId).filter(Boolean))],
    incomingTransitionAssetIds: [...new Set(byRole.incomingTransition.map((item) => item.assetId).filter(Boolean))],
    incomingTransitionCount: byRole.incomingTransition.length,
    renderedBitmapAssetIds: [...new Set(rendered.map((item) => item.textureKey).filter(Boolean))],
    items: items.map((item) => ({
      id: item.id,
      assetId: item.assetId,
      alpha: item.alpha,
      transitionBlendRole: item.transitionBlendRole,
      transitionBlendAlpha: item.transitionBlendAlpha,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      parallaxFactor: item.parallaxFactor,
    })),
    renderedBitmapAnchors: rendered,
  };
}

async function buildContactSheet(browser, captures) {
  const rows = await Promise.all(captures.map(async (capture) => {
    const color = await imageDataUrl(capture.colorPath);
    const gray = await imageDataUrl(capture.grayscalePath);
    const blend = capture.activeProfile?.activeBandBlend;
    const incomingIds = capture.anchors.incomingTransitionAssetIds.join(', ') || 'none';
    const outgoingIds = capture.anchors.outgoingLowerAssetIds.join(', ') || 'none';
    return `
      <section>
        <h2>${htmlEscape(capture.biomeLabel)} ${capture.depth}m · ${htmlEscape(capture.depthKey)}</h2>
        <p>band ${htmlEscape(capture.activeProfile?.activeBand ?? 'unknown')} · blend ${htmlEscape(blend?.from ?? '?')}→${htmlEscape(blend?.to ?? '?')} ${htmlEscape(blend?.progress ?? '?')} · outgoing ${htmlEscape(capture.anchors.transitionBlendCounts.outgoingLower)} (${htmlEscape(outgoingIds)}) · incoming ${htmlEscape(capture.anchors.transitionBlendCounts.incomingTransition)} (${htmlEscape(incomingIds)})</p>
        <div class="pair">
          <figure><img src="${color}" alt="${htmlEscape(capture.label)} color"><figcaption>color #game canvas</figcaption></figure>
          <figure><img src="${gray}" alt="${htmlEscape(capture.label)} grayscale"><figcaption>grayscale #game canvas</figcaption></figure>
        </div>
      </section>`;
  }));
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Water9 lower to transitionDeep smoothing proof</title>
<style>
body { margin: 0; padding: 24px; background: #0a1116; color: #dcecf1; font-family: Arial, sans-serif; }
h1 { margin: 0 0 16px; font-size: 24px; }
section { margin: 0 0 22px; padding-bottom: 20px; border-bottom: 1px solid #263945; }
h2 { margin: 0 0 6px; font-size: 17px; }
p { margin: 0 0 10px; font-size: 13px; color: #a9c0c9; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
figure { margin: 0; }
img { width: 100%; display: block; border: 1px solid #2a414c; background: #000; }
figcaption { padding-top: 4px; font-size: 12px; color: #88a5af; }
</style>
</head>
<body>
<h1>Water9 lower → transitionDeep smoothing proof</h1>
${rows.join('\n')}
</body>
</html>`;
  const htmlPath = resolve(outDir, 'lower-transitiondeep-smoothing-contact-sheet.html');
  const pngPath = resolve(outDir, 'lower-transitiondeep-smoothing-contact-sheet.png');
  await writeFile(htmlPath, html);
  const page = await browser.newPage({ viewport: { width: 1500, height: 1200 } });
  await page.goto(pathToFileURL(htmlPath).toString(), { waitUntil: 'load' });
  await page.screenshot({ path: pngPath, fullPage: true });
  await page.close();
  return { htmlPath, pngPath };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport });
const runtimeErrors = [];
page.on('pageerror', (error) => runtimeErrors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error') runtimeErrors.push({ type: 'console', text: message.text() });
});
page.on('response', (response) => {
  if (response.status() >= 400) runtimeErrors.push({ type: 'response', status: response.status(), url: response.url() });
});

const captures = [];
for (const biome of biomes) {
  await page.goto(urlForBiome(biome.biome), { waitUntil: 'domcontentloaded' });
  await waitForReady(page);
  for (const target of depths) {
    const label = `${biome.key}-${target.depth}m-${target.key}`;
    const snapshot = await backgroundReview(page, label, target.depth);
    const colorPath = resolve(outDir, `${label}-canvas-color.png`);
    const grayscalePath = resolve(outDir, `${label}-canvas-grayscale.png`);
    await writeFile(colorPath, await canvasPng(page, 'color'));
    await writeFile(grayscalePath, await canvasPng(page, 'grayscale'));
    const metrics = await canvasMetrics(page);
    captures.push({
      label,
      biome: biome.biome,
      biomeLabel: biome.label,
      depth: target.depth,
      depthKey: target.key,
      colorPath,
      colorBytes: await fileBytes(colorPath),
      grayscalePath,
      grayscaleBytes: await fileBytes(grayscalePath),
      metrics,
      activeProfile: snapshot?.activeProfile,
      activeBand: snapshot?.activeBand,
      anchors: summarizeAnchors(snapshot),
      layers: snapshot?.layers?.map((layer) => ({
        index: layer.index,
        painterlyAssetId: layer.painterlyAssetId,
        alpha: layer.alpha,
        band: layer.band,
        textureKey: layer.textureKey,
        activeRepeatMode: layer.activeRepeatMode,
      })),
      darkness: snapshot?.darkness,
      overlay: snapshot?.overlay,
      worldSpaceNoise: {
        alpha: snapshot?.worldSpaceNoise?.alpha,
        layers: snapshot?.worldSpaceNoise?.layers?.map((layer) => ({
          id: layer.id,
          kind: layer.kind,
          alpha: layer.alpha,
          assetId: layer.assetId,
        })),
        postDarknessVeil: snapshot?.worldSpaceNoise?.postDarknessVeil,
      },
    });
  }
}

const contactSheet = await buildContactSheet(browser, captures);
await browser.close();

const proof = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  viewport,
  blendWindow: {
    startDepth: 1360,
    cutoffDepth: 1440,
    endDepth: 1520,
    incomingTransitionAnchorCapDuringBlend: 2,
  },
  captures,
  contactSheet,
  runtimeErrors,
};

const proofPath = resolve(outDir, 'lower-transitiondeep-smoothing-proof.json');
await writeFile(proofPath, JSON.stringify(proof, null, 2));

console.log(JSON.stringify({
  proof: proofPath,
  contactSheet: contactSheet.pngPath,
  captures: captures.length,
  colorCaptures: captures.map((capture) => basename(capture.colorPath)),
  grayscaleCaptures: captures.map((capture) => basename(capture.grayscalePath)),
  runtimeErrors: runtimeErrors.length,
}, null, 2));

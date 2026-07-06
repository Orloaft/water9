import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PLAYTEST_URL ?? 'http://localhost:5180/';
const outDir = path.resolve('runs/water9-biome-landmark-transition-audit-2026-07-06/transitions');
const boundaries = [
  { id: 'b1-to-b2', from: 1, to: 2, depths: [1240, 1280, 1500] },
  { id: 'b2-to-b3', from: 2, to: 3, depths: [1240, 1280, 1500] },
  { id: 'b3-to-b4', from: 3, to: 4, depths: [1240, 1280, 1500] },
];

function urlForBiome(biome) {
  const url = new URL(baseUrl);
  url.searchParams.set('playtest', '1');
  url.searchParams.set('biome', String(biome));
  url.searchParams.set('renderer', 'canvas');
  return url.toString();
}

async function waitForReady(page) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 15000 });
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot();
    return Boolean(snap?.world && snap.world.ready !== false);
  }, null, { timeout: 15000 });
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
  await page.waitForTimeout(120);
  return result;
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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const runtimeErrors = [];
page.on('pageerror', (error) => runtimeErrors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error') runtimeErrors.push({ type: 'console', text: message.text() });
});
page.on('response', (response) => {
  if (response.status() >= 400) runtimeErrors.push({ type: 'response', status: response.status(), url: response.url() });
});

const proof = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  viewport: { width: 1280, height: 800 },
  boundaries: [],
  runtimeErrors,
};

for (const boundary of boundaries) {
  const boundaryProof = { id: boundary.id, from: boundary.from, to: boundary.to, captures: [] };
  for (const biome of [boundary.from, boundary.to]) {
    await page.goto(urlForBiome(biome), { waitUntil: 'domcontentloaded' });
    await waitForReady(page);
    for (const depth of boundary.depths) {
      const label = `${boundary.id}-b${biome}-${depth}m`;
      const snapshot = await backgroundReview(page, label, depth);
      const screenshot = path.join(outDir, `${label}.png`);
      await page.locator('#game canvas').screenshot({ path: screenshot });
      const metrics = await canvasMetrics(page);
      boundaryProof.captures.push({
        label,
        biome,
        depth,
        screenshot,
        metrics,
        activeProfile: snapshot?.activeProfile,
        activeBand: snapshot?.activeBand,
        anchors: {
          profileCount: snapshot?.anchors?.profileCount,
          visibleCount: snapshot?.anchors?.visibleCount,
          assets: snapshot?.anchors?.assets?.map((asset) => asset.id),
          items: snapshot?.anchors?.items?.map((item) => ({
            id: item.id,
            assetId: item.assetId,
            alpha: item.alpha,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            parallaxFactor: item.parallaxFactor,
          })),
        },
        renderedBitmapAnchors: snapshot?.renderedBitmapAnchors,
        layers: snapshot?.layers?.map((layer) => ({
          index: layer.index,
          painterlyAssetId: layer.painterlyAssetId,
          alpha: layer.alpha,
          band: layer.band,
          textureKey: layer.textureKey,
          activeRepeatMode: layer.activeRepeatMode,
        })),
        darkness: snapshot?.darkness,
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
  proof.boundaries.push(boundaryProof);
}

await browser.close();
await writeFile(path.join(outDir, 'transition-canvas-proof.json'), JSON.stringify(proof, null, 2));
console.log(JSON.stringify({
  proof: path.join(outDir, 'transition-canvas-proof.json'),
  screenshots: proof.boundaries.reduce((sum, boundary) => sum + boundary.captures.length, 0),
  runtimeErrors: runtimeErrors.length,
}, null, 2));

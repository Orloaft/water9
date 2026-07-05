import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const baseUrl = process.env.PLAYTEST_URL ?? 'http://127.0.0.1:5175/';
const outDir = process.env.ORE_STRATA_OUT ?? '/home/orlovboros/projects/manager/runs/water9-ore-strata-pocket-2026-07-01';
const tiers = [
  ['copper', 'Copper'],
  ['quartz', 'Quartz'],
  ['ruby', 'Ruby'],
  ['cobalt', 'Cobalt Bloom'],
  ['sunstone', 'Sunstone'],
  ['relic', 'Relic Shard'],
  ['alienAlloy', 'Alien Alloy'],
  ['drownedIdol', 'Drowned Idol'],
  ['precursorEngine', 'Precursor Engine'],
  ['abyssalCrown', 'Abyssal Crown'],
  ['ruinCore', 'Ruin Core'],
];

function withPlaytestParam(url) {
  const parsed = new URL(url);
  parsed.searchParams.set('playtest', '1');
  return parsed.toString();
}

function imageName(tile) {
  return `water9-ore-strata-pocket-${tile}.png`;
}

async function command(page, name, value) {
  await page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue), [name, value]);
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot();
    return Boolean(snap?.world && snap.world.ready !== false);
  }, null, { timeout: 10000 });
  await page.waitForTimeout(260);
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot());
}

async function canvasStats(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false, width: 0, height: 0, variedSamples: 0, lumaRange: 0 };
    let minLuma = 255;
    let maxLuma = 0;
    const seen = new Set();
    for (let y = 40; y < canvas.height - 40; y += 40) {
      for (let x = 40; x < canvas.width - 40; x += 40) {
        const [r, g, b, a] = context.getImageData(x, y, 1, 1).data;
        if (a <= 0) continue;
        const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
        minLuma = Math.min(minLuma, luma);
        maxLuma = Math.max(maxLuma, luma);
        seen.add(`${r >> 4}:${g >> 4}:${b >> 4}`);
      }
    }
    return {
      exists: true,
      width: canvas.width,
      height: canvas.height,
      variedSamples: seen.size,
      lumaRange: Number((maxLuma - minLuma).toFixed(2)),
    };
  });
}

function contactSheetHtml(frames) {
  const cards = frames.map((frame) => `
    <figure>
      <img src="./${imageName(frame.tile)}" alt="${frame.label}">
      <figcaption>${frame.label}</figcaption>
    </figure>
  `).join('\n');
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      margin: 0;
      background: #071018;
      color: #dcecf0;
      font: 18px/1.25 system-ui, sans-serif;
    }
    .sheet {
      box-sizing: border-box;
      width: 1800px;
      padding: 24px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px;
    }
    figure {
      margin: 0;
      background: #0b1821;
      border: 1px solid #203443;
      border-radius: 6px;
      overflow: hidden;
    }
    img {
      display: block;
      width: 100%;
      height: 255px;
      object-fit: cover;
      object-position: center 52%;
    }
    figcaption {
      padding: 10px 12px 12px;
      color: #f5fbff;
      letter-spacing: 0;
    }
  </style>
</head>
<body>
  <main class="sheet">${cards}</main>
</body>
</html>`;
}

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ type: 'console', text: message.text() });
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
});

await page.goto(withPlaytestParam(baseUrl), { waitUntil: 'networkidle' });
await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 10000 });
await page.waitForFunction(() => {
  const snap = window.__AQUA_PLAYTEST__?.snapshot();
  return Boolean(snap?.world && snap.world.ready !== false);
}, null, { timeout: 10000 });

const frames = [];
for (const [tile, label] of tiers) {
  const snapshot = await command(page, 'oreDepositReview', { focusTile: tile });
  const path = resolve(outDir, imageName(tile));
  await page.screenshot({ path, fullPage: false });
  const stats = await canvasStats(page);
  frames.push({
    tile,
    label,
    path,
    status: snapshot?.ui?.status ?? null,
    visibleOreCount: snapshot?.terrainLookReview?.cameraSlice?.visibleOreCount ?? null,
    camera: snapshot?.camera ?? null,
    canvas: stats,
  });
}

await command(page, 'oreDepositReview', { focusTile: 'ruinCore' });
const runtimePath = resolve(outDir, 'water9-ore-strata-pocket-runtime.png');
await page.screenshot({ path: runtimePath, fullPage: false });

const htmlPath = resolve(outDir, 'water9-ore-strata-pocket-contact-sheet.html');
await writeFile(htmlPath, contactSheetHtml(frames));
const sheetPage = await browser.newPage({ viewport: { width: 1800, height: 900 }, deviceScaleFactor: 1 });
await sheetPage.goto(pathToFileURL(htmlPath).toString(), { waitUntil: 'networkidle' });
await sheetPage.screenshot({ path: resolve(outDir, 'water9-ore-strata-pocket-contact-sheet.png'), fullPage: true });

await browser.close();

const failures = [];
if (errors.length) failures.push('runtime browser errors were reported');
for (const frame of frames) {
  if (!frame.canvas.exists || frame.canvas.variedSamples < 8 || frame.canvas.lumaRange < 12) {
    failures.push(`${frame.label}: weak or blank canvas stats ${JSON.stringify(frame.canvas)}`);
  }
  if ((frame.visibleOreCount ?? 0) < tiers.length) failures.push(`${frame.label}: expected mixed all-tier wall in camera, saw ${frame.visibleOreCount} ore tiles`);
}

const report = {
  schema: 'water9/ore-strata-pocket-proof@1',
  generatedAt: new Date().toISOString(),
  url: withPlaytestParam(baseUrl),
  outDir,
  passedRuntime: errors.length === 0,
  passedProof: failures.length === 0,
  errors,
  failures,
  runtimePath,
  contactSheetPath: resolve(outDir, 'water9-ore-strata-pocket-contact-sheet.png'),
  frames,
};

await writeFile(resolve(outDir, 'water9-ore-strata-pocket-proof.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

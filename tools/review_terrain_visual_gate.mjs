import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.PLAYTEST_URL ?? 'http://127.0.0.1:5175/';
const outDir = process.env.TERRAIN_GATE_OUT ?? 'tools/scratch/terrain-visual-gate';
const stages = ['intact', 'damage', 'break', 'after'];

function withPlaytestParam(url) {
  const parsed = new URL(url);
  parsed.searchParams.set('playtest', '1');
  return parsed.toString();
}

async function terrainShapeMetrics(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { available: false, reason: 'missing canvas' };
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { available: false, reason: 'missing 2d context' };
    const width = canvas.width;
    const height = canvas.height;
    const data = ctx.getImageData(0, 0, width, height).data;
    const roi = {
      left: 0,
      top: 96,
      right: Math.min(width, Math.floor(width * 0.78)),
      bottom: Math.min(height - 112, Math.floor(height * 0.9)),
    };
    const dark = (x, y) => {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      return r < 18 && g < 28 && b < 34;
    };
    const horizontalRuns = [];
    const verticalRuns = [];
    for (let y = roi.top; y < roi.bottom - 1; y += 1) {
      let run = 0;
      for (let x = roi.left; x < roi.right; x += 1) {
        const edge = dark(x, y) !== dark(x, y + 1);
        if (edge) run += 1;
        else if (run) {
          horizontalRuns.push(run);
          run = 0;
        }
      }
      if (run) horizontalRuns.push(run);
    }
    for (let x = roi.left; x < roi.right - 1; x += 1) {
      let run = 0;
      for (let y = roi.top; y < roi.bottom; y += 1) {
        const edge = dark(x, y) !== dark(x + 1, y);
        if (edge) run += 1;
        else if (run) {
          verticalRuns.push(run);
          run = 0;
        }
      }
      if (run) verticalRuns.push(run);
    }
    const summarize = (runs) => {
      const sorted = [...runs].sort((a, b) => b - a);
      return {
        count: runs.length,
        max: sorted[0] ?? 0,
        over24: runs.filter((run) => run >= 24).length,
        over48: runs.filter((run) => run >= 48).length,
        top5: sorted.slice(0, 5),
      };
    };
    const horizontal = summarize(horizontalRuns);
    const vertical = summarize(verticalRuns);
    return {
      available: true,
      roi,
      horizontal,
      vertical,
      blockyEdgeScore: horizontal.over48 * 2 + vertical.over48 * 2 + horizontal.over24 + vertical.over24,
    };
  });
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

const results = [];
for (const stage of stages) {
  await page.evaluate((stageName) => window.__AQUA_PLAYTEST__?.command('terrainMiningReview', { stage: stageName }), stage);
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot();
    return Boolean(snap?.world && snap.world.ready !== false);
  }, null, { timeout: 10000 });
  await page.waitForTimeout(stage === 'break' ? 350 : 180);
  const snapshot = await page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot());
  const screenshotPath = `${outDir}/terrain-${stage}.png`;
  await page.screenshot({ path: screenshotPath });
  const visualMetrics = await terrainShapeMetrics(page);
  results.push({
    stage,
    screenshotPath,
    visualMetrics,
    status: snapshot?.status ?? null,
    player: snapshot?.player ?? null,
  });
}

await browser.close();

const visualFailures = results
  .filter((result) => result.visualMetrics?.available && result.visualMetrics.blockyEdgeScore > 48)
  .map((result) => ({
    stage: result.stage,
    blockyEdgeScore: result.visualMetrics.blockyEdgeScore,
    horizontal: result.visualMetrics.horizontal,
    vertical: result.visualMetrics.vertical,
  }));

const report = {
  schema: 'water9/terrain-visual-gate@1',
  url: withPlaytestParam(baseUrl),
  generatedAt: new Date().toISOString(),
  criteria: [
    'solid terrain must read as a dark continuous collision silhouette',
    'open mined space must read as passable water/background',
    'no repeated translucent support blobs or square interior plates',
    'edge brushes enrich exposed boundaries without replacing passability cues',
  ],
  passedRuntime: errors.length === 0,
  passedVisual: visualFailures.length === 0,
  visualFailures,
  errors,
  results,
};

await writeFile(`${outDir}/terrain-visual-gate.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

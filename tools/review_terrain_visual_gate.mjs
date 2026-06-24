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
  results.push({
    stage,
    screenshotPath,
    status: snapshot?.status ?? null,
    player: snapshot?.player ?? null,
  });
}

await browser.close();

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
  errors,
  results,
};

await writeFile(`${outDir}/terrain-visual-gate.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

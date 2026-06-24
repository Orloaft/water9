import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.PLAYTEST_URL ?? 'http://127.0.0.1:5175/';
const outDir = process.env.TERRAIN_PROGRESSIVE_OUT ?? 'tools/scratch/terrain-progressive-mining-review';
const stages = [
  'intact',
  'intact',
  'damage',
  'damage',
  'break',
  'after',
  'after',
  'damage',
  'break',
  'after',
  'after',
];

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

const frames = [];
for (let index = 0; index < stages.length; index += 1) {
  const stage = stages[index];
  await page.evaluate((stageName) => window.__AQUA_PLAYTEST__?.command('terrainMiningReview', { stage: stageName }), stage);
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot();
    return Boolean(snap?.world && snap.world.ready !== false);
  }, null, { timeout: 10000 });
  await page.waitForTimeout(stage === 'break' ? 300 : 160);
  const snapshot = await page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot());
  const path = `${outDir}/${String(index).padStart(2, '0')}-${stage}.png`;
  await page.screenshot({ path });
  frames.push({
    index,
    stage,
    path,
    status: snapshot?.ui?.status ?? null,
    player: snapshot?.player ?? null,
  });
}

await browser.close();

const report = {
  schema: 'water9/terrain-progressive-mining-review@1',
  url: withPlaytestParam(baseUrl),
  generatedAt: new Date().toISOString(),
  passedRuntime: errors.length === 0,
  errors,
  criteria: [
    'drilled openings stay visually passable after break effects settle',
    'large ledge brushes do not pop into newly opened mining wounds',
    'decorative flora remains attached to broad terrain boundaries instead of masking collision shape',
  ],
  frames,
};

await writeFile(`${outDir}/terrain-progressive-mining-review.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

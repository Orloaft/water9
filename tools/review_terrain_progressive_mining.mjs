import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.PLAYTEST_URL ?? 'http://127.0.0.1:5175/';
const outDir = process.env.TERRAIN_PROGRESSIVE_OUT ?? 'tools/scratch/terrain-progressive-mining-review';
const cuts = [
  { dx: 0, dy: 24, repeats: 3 },
  { dx: 18, dy: 24, repeats: 4 },
  { dx: 38, dy: 25, repeats: 4 },
  { dx: -18, dy: 24, repeats: 4 },
  { dx: -38, dy: 25, repeats: 4 },
  { dx: 58, dy: 27, repeats: 4 },
  { dx: 78, dy: 29, repeats: 4 },
  { dx: -58, dy: 27, repeats: 4 },
  { dx: 12, dy: 38, repeats: 3 },
  { dx: 36, dy: 40, repeats: 3 },
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
await page.evaluate(() => window.__AQUA_PLAYTEST__?.command('terrainMiningReview', { stage: 'intact' }));
await page.waitForFunction(() => {
  const snap = window.__AQUA_PLAYTEST__?.snapshot();
  return Boolean(snap?.world && snap.world.ready !== false);
}, null, { timeout: 10000 });
await page.waitForTimeout(180);

let snapshot = await page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot());
let path = `${outDir}/00-intact.png`;
await page.screenshot({ path });
let cropPath = `${outDir}/00-intact-crop.png`;
await page.screenshot({ path: cropPath, clip: { x: 300, y: 330, width: 620, height: 330 } });
frames.push({
  index: 0,
  stage: 'intact',
  path,
  cropPath,
  status: snapshot?.ui?.status ?? null,
  player: snapshot?.player ?? null,
});

for (let index = 0; index < cuts.length; index += 1) {
  snapshot = await page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot());
  const player = snapshot?.player ?? { x: 1248, y: 840 };
  const cut = cuts[index];
  await page.evaluate((payload) => window.__AQUA_PLAYTEST__?.command('terrainMineAt', payload), {
    worldX: player.x + cut.dx,
    worldY: player.y + cut.dy,
    repeats: cut.repeats,
  });
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot();
    return Boolean(snap?.world && snap.world.ready !== false);
  }, null, { timeout: 10000 });
  await page.waitForTimeout(220);
  snapshot = await page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot());
  path = `${outDir}/${String(index + 1).padStart(2, '0')}-actual-cut.png`;
  await page.screenshot({ path });
  cropPath = `${outDir}/${String(index + 1).padStart(2, '0')}-actual-cut-crop.png`;
  await page.screenshot({ path: cropPath, clip: { x: 300, y: 330, width: 620, height: 330 } });
  frames.push({
    index: index + 1,
    stage: 'actual-cut',
    cut,
    path,
    cropPath,
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
    'actual repeated cutter calls remove terrain through the density mask',
    'drilled openings stay visually passable after break effects settle',
    'body-height cutter targets should open a swimmer-sized tunnel instead of a low waist-level groove',
    'edge flora and ore accents stay attached to mask boundaries instead of masking collision shape',
    'no square ledge plates or pasted rock slabs appear after sequential mining cuts',
  ],
  frames,
};

await writeFile(`${outDir}/terrain-progressive-mining-review.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

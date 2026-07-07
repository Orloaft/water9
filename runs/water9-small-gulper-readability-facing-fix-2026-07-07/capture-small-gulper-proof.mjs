import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const outDir = resolve('runs/water9-small-gulper-readability-facing-fix-2026-07-07');
const baseUrl = process.env.WATER9_URL ?? 'http://127.0.0.1:5180/?playtest&biome=4&renderer=canvas';
const phase = process.argv.includes('--after') ? 'after' : 'before';
const indexArg = process.argv.find((arg) => arg.startsWith('--index='));
const targetIndex = indexArg ? Number(indexArg.slice('--index='.length)) : 0;
const distanceArg = process.argv.find((arg) => arg.startsWith('--distance='));
const targetDistance = distanceArg ? Number(distanceArg.slice('--distance='.length)) : 112;
const settleArg = process.argv.find((arg) => arg.startsWith('--settle-ms='));
const settleMs = settleArg ? Number(settleArg.slice('--settle-ms='.length)) : 350;
const pollArg = process.argv.find((arg) => arg.startsWith('--polls='));
const pollCount = pollArg ? Number(pollArg.slice('--polls='.length)) : 75;
const assetKey = 'fauna-exp-cobalt-gulper-fry';

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitForPlaytest(page) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.snapshot && window.__AQUA_PLAYTEST__?.command), null, { timeout: 15000 });
  for (let i = 0; i < 120; i += 1) {
    const snapshot = await page.evaluate(() => window.__AQUA_PLAYTEST__.snapshot());
    if (snapshot?.state?.started !== undefined && Array.isArray(snapshot.fish) && snapshot.fish.length > 0) return snapshot;
    await sleep(100);
  }
  throw new Error('playtest snapshot did not become ready');
}

async function command(page, name, value) {
  return page.evaluate(([cmd, payload]) => window.__AQUA_PLAYTEST__.command(cmd, payload), [name, value]);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await waitForPlaytest(page);
await command(page, 'start');
await command(page, 'refill');

const targetSummary = await command(page, 'faunaBehaviorReview', { assetKey });
const suspects = await Promise.all([
  command(page, 'faunaBehaviorReview', { assetKey: 'fauna-exp-cobalt-gulper-fry' }),
  command(page, 'faunaBehaviorReview', { assetKey: 'fauna-exp-starless-lantern-eel' }),
  command(page, 'faunaBehaviorReview', { assetKey: 'fauna-exp-knifecrest-snipe-eel' }),
  command(page, 'faunaBehaviorReview', { assetKey: 'fauna-exp-anchorfin-eel' }),
  command(page, 'faunaBehaviorReview', { assetKey: 'fauna-deep-gulper-eel' }),
]);

const teleport = await command(page, 'teleportToFauna', { assetKey, index: targetIndex, distance: targetDistance });
await sleep(settleMs);
let snapshot = await page.evaluate(() => window.__AQUA_PLAYTEST__.snapshot());
let target = snapshot.fish.find((fish) => fish.assetKey === assetKey && fish.screenVisible) ?? snapshot.fish.find((fish) => fish.assetKey === assetKey);

for (let i = 0; i < pollCount; i += 1) {
  await sleep(80);
  snapshot = await page.evaluate(() => window.__AQUA_PLAYTEST__.snapshot());
  target = snapshot.fish
    .filter((fish) => fish.assetKey === assetKey)
    .sort((a, b) => {
      const da = Math.hypot(a.x - snapshot.player.x, a.y - snapshot.player.y);
      const db = Math.hypot(b.x - snapshot.player.x, b.y - snapshot.player.y);
      return da - db;
    })[0];
  if (target?.screenVisible && target.aggro > 0.5 && target.velocityMagnitude > 18) break;
}

const behavior = await command(page, 'faunaBehaviorReview', { assetKey });
await page.locator('#game canvas').screenshot({ path: resolve(outDir, `${phase}-cobalt-gulper-game-canvas.png`) });
await page.screenshot({ path: resolve(outDir, `${phase}-cobalt-gulper-viewport.png`), fullPage: false });

const record = {
  phase,
  url: baseUrl,
  targetAssetKey: assetKey,
  targetSpecies: 'Cobalt Gulper Fry',
  targetIndex,
  targetDistance,
  settleMs,
  pollCount,
  teleport,
  preTeleportTargetSummary: targetSummary,
  suspectRuntimeCounts: suspects.map((entry) => ({
    count: entry?.count ?? null,
    first: entry?.targets?.[0] ?? null,
  })),
  snapshot: {
    state: snapshot.state,
    camera: snapshot.camera,
    player: snapshot.player,
    target,
  },
  behavior,
};
await writeFile(resolve(outDir, `${phase}-cobalt-gulper-runtime.json`), `${JSON.stringify(record, null, 2)}\n`);
await browser.close();

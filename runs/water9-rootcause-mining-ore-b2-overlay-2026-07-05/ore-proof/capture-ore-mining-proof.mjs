import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.PLAYTEST_URL ?? 'http://127.0.0.1:5180/?playtest=1&biome=2&renderer=canvas';
const outDir = new URL('./', import.meta.url);

async function command(page, name, value) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 20000 });
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__.command(commandName, commandValue), [name, value]);
}

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function canvasShot(page, name) {
  const canvas = page.locator('#game canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: 20000 });
  await canvas.screenshot({ path: new URL(name, outDir).pathname });
}

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command && document.querySelector('#game canvas')), null, { timeout: 20000 });

  const setup = await command(page, 'miningPolishReview', { stage: 'setup' });
  await command(page, 'clearProofOverlays');
  await page.waitForTimeout(300);
  await canvasShot(page, '01-before-adjacent-mining.png');
  const before = await snapshot(page);

  const tileSize = 24;
  const adjacentTarget = {
    worldX: (setup.target.tileX - 1) * tileSize + tileSize * 0.5,
    worldY: setup.target.tileY * tileSize + tileSize * 0.5,
    repeats: 4,
  };
  const afterAdjacent = await command(page, 'terrainMineAt', adjacentTarget);
  await command(page, 'clearProofOverlays');
  await page.waitForTimeout(180);
  await canvasShot(page, '02-after-mining-adjacent-rock.png');

  const setupMineable = await command(page, 'miningPolishReview', { stage: 'setup' });
  await command(page, 'clearProofOverlays');
  const oreTarget = {
    worldX: setupMineable.target.worldX,
    worldY: setupMineable.target.worldY,
    repeats: 8,
  };
  const afterOre = await command(page, 'terrainMineAt', oreTarget);
  await command(page, 'clearProofOverlays');
  await page.waitForTimeout(180);
  await canvasShot(page, '03-after-mining-visible-ore.png');

  const proof = {
    baseUrl,
    setup,
    before: {
      state: before?.state,
      ui: before?.ui,
      player: before?.player,
      looseItems: before?.looseItems,
      terrainLookReview: before?.terrainLookReview,
    },
    adjacentMining: {
      target: adjacentTarget,
      state: afterAdjacent?.state,
      ui: afterAdjacent?.ui,
      player: afterAdjacent?.player,
      looseItems: afterAdjacent?.looseItems,
      terrainLookReview: afterAdjacent?.terrainLookReview,
    },
    oreMining: {
      setup: setupMineable,
      target: oreTarget,
      state: afterOre?.state,
      ui: afterOre?.ui,
      player: afterOre?.player,
      looseItems: afterOre?.looseItems,
      terrainLookReview: afterOre?.terrainLookReview,
    },
    screenshots: [
      '01-before-adjacent-mining.png',
      '02-after-mining-adjacent-rock.png',
      '03-after-mining-visible-ore.png',
    ],
  };

  await writeFile(new URL('ore-proof.json', outDir), `${JSON.stringify(proof, null, 2)}\n`);
} finally {
  await browser.close();
}

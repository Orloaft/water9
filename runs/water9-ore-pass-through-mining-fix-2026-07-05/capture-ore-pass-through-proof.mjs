import { spawn } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const repoDir = '/mnt/nxt-dev/water9';
const outDir = `${repoDir}/runs/water9-ore-pass-through-mining-fix-2026-07-05`;
const host = '127.0.0.1';
const portMin = 5180;
const portMax = 5199;
const proofSeed = 7;

await mkdir(outDir, { recursive: true });

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function portAvailable(port) {
  return new Promise((resolvePort) => {
    const server = net.createServer();
    server.once('error', () => resolvePort(false));
    server.once('listening', () => {
      server.close(() => resolvePort(true));
    });
    server.listen(port, host);
  });
}

async function choosePort() {
  for (let port = portMin; port <= portMax; port += 1) {
    if (await portAvailable(port)) return port;
  }
  throw new Error(`no free port in ${portMin}-${portMax}`);
}

async function waitForServer(url, server, serverLogs, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`dev server exited early with code ${server.exitCode}\n${serverLogs.join('')}`);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite may still be starting.
    }
    await sleep(150);
  }
  throw new Error(`dev server did not become ready\n${serverLogs.join('')}`);
}

async function command(page, name, value) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 20000 });
  const result = await page.evaluate(([commandName, commandValue]) => (
    window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null
  ), [name, value]);
  await page.waitForTimeout(180);
  return result;
}

async function snapshot(page) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.snapshot), null, { timeout: 20000 });
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function waitForWorld(page) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const review = await command(page, 'biomeLoadingReview');
    if (review?.worldReady === true) return;
    await page.waitForTimeout(140);
  }
  throw new Error('world generation did not complete');
}

async function setProofSeed(page) {
  await page.evaluate(async (seed) => {
    const { rng } = await import('/src/rng.ts');
    rng.seed = seed;
  }, proofSeed);
}

async function setupMiningReview(page) {
  await setProofSeed(page);
  const setup = await command(page, 'miningPolishReview', { stage: 'setup' });
  await command(page, 'clearProofOverlays');
  await page.waitForTimeout(240);
  return setup;
}

async function canvasShot(page, fileName) {
  const path = resolve(outDir, fileName);
  const canvas = page.locator('#game canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: 20000 });
  await canvas.screenshot({ path });
  return {
    path,
    bytes: (await stat(path)).size,
  };
}

async function probeTile(page, target) {
  return page.evaluate(async (probeTarget) => {
    const mod = await import('/src/game-ref.ts');
    const constants = await import('/src/constants.ts');
    const terrain = await import('/src/terrain-mask.ts');
    const stateMod = await import('/src/state.ts');
    const scene = mod.gameScene?.();
    if (!scene) throw new Error('missing game scene');
    const tx = probeTarget.tileX;
    const ty = probeTarget.tileY;
    let solid = 0;
    for (let ly = 0; ly < terrain.TERRAIN_MASK_RES; ly += 1) {
      for (let lx = 0; lx < terrain.TERRAIN_MASK_RES; lx += 1) {
        const sx = tx * terrain.TERRAIN_MASK_RES + lx;
        const sy = ty * terrain.TERRAIN_MASK_RES + ly;
        if (terrain.terrainMaskDensityAt(scene, sx, sy) >= terrain.TERRAIN_MASK_SOLID_THRESHOLD) solid += 1;
      }
    }
    let openCore = 0;
    let coreSamples = 0;
    for (let ly = 2; ly <= 5; ly += 1) {
      for (let lx = 2; lx <= 5; lx += 1) {
        coreSamples += 1;
        const sx = tx * terrain.TERRAIN_MASK_RES + lx;
        const sy = ty * terrain.TERRAIN_MASK_RES + ly;
        if (terrain.terrainMaskDensityAt(scene, sx, sy) < terrain.TERRAIN_MASK_SOLID_THRESHOLD) openCore += 1;
      }
    }
    const centerX = tx * constants.TILE + constants.TILE * 0.5;
    const centerY = ty * constants.TILE + constants.TILE * 0.5;
    const centerSx = Math.floor((centerX / constants.TILE) * terrain.TERRAIN_MASK_RES);
    const centerSy = Math.floor((centerY / constants.TILE) * terrain.TERRAIN_MASK_RES);
    const contact = terrain.terrainMaskContactForAabb(
      scene,
      centerX,
      centerY,
      constants.PLAYER_COLLISION_RADIUS,
      constants.PLAYER_COLLISION_RADIUS,
      { maxSamples: 30 },
    );
    const valuableLooseItems = scene.looseItems.filter((item) => item.value > 0 && !item.collected);
    const cargoValue = stateMod.state.cargo.reduce((sum, item) => sum + item.value, 0);
    return {
      tileX: tx,
      tileY: ty,
      tile: scene.getTile(tx, ty),
      damage: scene.damage?.[ty]?.[tx] ?? null,
      solidRatio: Number((solid / (terrain.TERRAIN_MASK_RES * terrain.TERRAIN_MASK_RES)).toFixed(3)),
      openCoreRatio: Number((openCore / Math.max(1, coreSamples)).toFixed(3)),
      centerDensity: terrain.terrainMaskDensityAt(scene, centerSx, centerSy),
      contact: contact
        ? {
          count: contact.count,
          samples: contact.samples,
          density: Number(contact.density.toFixed(3)),
          nx: Number(contact.nx.toFixed(3)),
          ny: Number(contact.ny.toFixed(3)),
        }
        : null,
      looseValuableCount: valuableLooseItems.length,
      looseValuableItems: valuableLooseItems.map((item) => ({
        id: item.id,
        name: item.name,
        value: item.value,
        x: Number(item.x.toFixed(3)),
        y: Number(item.y.toFixed(3)),
        pickupDelay: Number((item.pickupDelay ?? 0).toFixed(3)),
      })),
      cargoCount: stateMod.state.cargo.length,
      cargoValue,
      status: stateMod.state.status,
    };
  }, target);
}

function copperDeposit(snapshotValue) {
  return snapshotValue?.gameplayOre?.deposits?.find((deposit) => deposit.tile === 'copper') ?? null;
}

function anchorSummary(deposit) {
  if (!deposit) return null;
  return {
    key: deposit.key,
    anchor: deposit.anchor,
    position: deposit.position,
    tileBounds: deposit.tileBounds,
    cells: deposit.cells,
  };
}

function assertStableCopperAnchor(before, after) {
  if (!before || !after) throw new Error('missing copper deposit for adjacent anchor proof');
  if (before.key !== after.key) throw new Error(`copper anchor key changed: ${before.key} -> ${after.key}`);
  if (before.anchor.tileX !== after.anchor.tileX || before.anchor.tileY !== after.anchor.tileY) {
    throw new Error(`copper anchor root moved: ${JSON.stringify(before.anchor)} -> ${JSON.stringify(after.anchor)}`);
  }
  const dx = Math.abs(before.position.worldX - after.position.worldX);
  const dy = Math.abs(before.position.worldY - after.position.worldY);
  if (dx > 0.01 || dy > 0.01) {
    throw new Error(`copper visual position moved by ${dx}, ${dy}`);
  }
}

async function collectLooseOre(page) {
  const before = await probeTile(page, currentTarget);
  const result = await command(page, 'miningPolishReview', { stage: 'collect' });
  await command(page, 'clearProofOverlays');
  await page.waitForTimeout(240);
  const after = await probeTile(page, currentTarget);
  return { result, before, after };
}

let currentTarget = null;

const port = await choosePort();
const baseUrl = `http://${host}:${port}/`;
const serverLogs = [];
const server = spawn(resolve(repoDir, 'node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: repoDir,
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

let browser;
try {
  await waitForServer(baseUrl, server, serverLogs);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto(`${baseUrl}?playtest=1&renderer=canvas`, { waitUntil: 'load', timeout: 45000 });
  await waitForWorld(page);

  const setup = await setupMiningReview(page);
  currentTarget = setup.target;
  const beforeSnapshot = await snapshot(page);
  const beforeProbe = await probeTile(page, currentTarget);
  const beforeShot = await canvasShot(page, 'ore-pass-01-before-visible-ore.png');

  const passThroughMine = {
    worldX: setup.target.worldX - 13,
    worldY: setup.target.worldY - 8,
    repeats: 7,
  };
  await command(page, 'terrainMineAt', passThroughMine);
  await command(page, 'clearProofOverlays');
  await page.waitForTimeout(260);
  const afterMineSnapshot = await snapshot(page);
  const afterMineProbe = await probeTile(page, currentTarget);
  const afterMineShot = await canvasShot(page, 'ore-pass-02-after-offset-mining-no-ghost.png');

  const collection = await collectLooseOre(page);
  const afterCollectSnapshot = await snapshot(page);
  const afterCollectShot = await canvasShot(page, 'ore-pass-03-after-collect-cargo.png');

  const adjacentSetup = await setupMiningReview(page);
  currentTarget = adjacentSetup.target;
  const adjacentBeforeSnapshot = await snapshot(page);
  const adjacentBeforeProbe = await probeTile(page, currentTarget);
  const adjacentMine = {
    tileX: adjacentSetup.target.tileX - 1,
    tileY: adjacentSetup.target.tileY,
    worldX: (adjacentSetup.target.tileX - 1) * 24 + 12,
    worldY: adjacentSetup.target.worldY,
    repeats: 4,
  };
  await command(page, 'terrainMineAt', adjacentMine);
  await command(page, 'clearProofOverlays');
  await page.waitForTimeout(260);
  const adjacentAfterSnapshot = await snapshot(page);
  const adjacentAfterProbe = await probeTile(page, currentTarget);
  const adjacentAfterShot = await canvasShot(page, 'ore-pass-04-adjacent-anchor-regression.png');

  const directSetup = await setupMiningReview(page);
  currentTarget = directSetup.target;
  const directBeforeProbe = await probeTile(page, currentTarget);
  const directMine = {
    worldX: directSetup.target.worldX,
    worldY: directSetup.target.worldY,
    repeats: 12,
  };
  await command(page, 'terrainMineAt', directMine);
  const directAfterMineProbe = await probeTile(page, currentTarget);
  const directCollection = await collectLooseOre(page);

  const adjacentBeforeCopper = copperDeposit(adjacentBeforeSnapshot);
  const adjacentAfterCopper = copperDeposit(adjacentAfterSnapshot);
  assertStableCopperAnchor(adjacentBeforeCopper, adjacentAfterCopper);
  if (beforeProbe.tile !== 'copper') throw new Error(`expected copper before proof mining, got ${beforeProbe.tile}`);
  if (afterMineProbe.tile !== 'water') throw new Error(`opened ore ghost remained after pass-through mining: ${afterMineProbe.tile}`);
  if (afterMineProbe.looseValuableCount < 1) throw new Error('pass-through mining did not spawn a valuable ore item');
  if (collection.after.cargoCount <= collection.before.cargoCount) throw new Error('spawned ore was not collected into cargo');
  if (adjacentAfterProbe.tile !== 'copper') throw new Error(`adjacent terrain mining broke copper unexpectedly: ${adjacentAfterProbe.tile}`);
  if (directAfterMineProbe.tile !== 'water' || directAfterMineProbe.looseValuableCount < 1) {
    throw new Error(`direct ore mining failed to spawn ore: ${JSON.stringify(directAfterMineProbe)}`);
  }
  if (directCollection.after.cargoCount <= directCollection.before.cargoCount) throw new Error('direct ore collect did not increase cargo');

  const proof = {
    schema: 'water9-ore-pass-through-mining-fix-proof@1',
    timestamp: new Date().toISOString(),
    baseUrl,
    port,
    seed: proofSeed,
    screenshots: {
      beforeVisibleOre: beforeShot,
      afterOffsetMiningNoGhost: afterMineShot,
      afterCollectCargo: afterCollectShot,
      adjacentAnchorRegression: adjacentAfterShot,
    },
    passThroughMining: {
      setup,
      mine: passThroughMine,
      before: {
        probe: beforeProbe,
        gameplayOre: beforeSnapshot?.gameplayOre ?? null,
      },
      afterMine: {
        probe: afterMineProbe,
        gameplayOre: afterMineSnapshot?.gameplayOre ?? null,
        looseItems: afterMineSnapshot?.looseItems ?? [],
      },
      collection: {
        ...collection,
        gameplayOre: afterCollectSnapshot?.gameplayOre ?? null,
        looseItems: afterCollectSnapshot?.looseItems ?? [],
      },
    },
    adjacentAnchorRegression: {
      setup: adjacentSetup,
      mine: adjacentMine,
      before: {
        probe: adjacentBeforeProbe,
        copper: anchorSummary(adjacentBeforeCopper),
        gameplayOre: adjacentBeforeSnapshot?.gameplayOre ?? null,
      },
      after: {
        probe: adjacentAfterProbe,
        copper: anchorSummary(adjacentAfterCopper),
        gameplayOre: adjacentAfterSnapshot?.gameplayOre ?? null,
      },
    },
    directOreMining: {
      setup: directSetup,
      mine: directMine,
      before: directBeforeProbe,
      afterMine: directAfterMineProbe,
      collection: directCollection,
    },
  };

  const summaryPath = resolve(outDir, 'proof-summary.json');
  await writeFile(summaryPath, `${JSON.stringify(proof, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    port,
    summaryPath,
    screenshots: proof.screenshots,
    passThroughAfterMine: afterMineProbe,
    adjacentAnchor: {
      before: anchorSummary(adjacentBeforeCopper),
      after: anchorSummary(adjacentAfterCopper),
    },
    directOreAfterMine: directAfterMineProbe,
  }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await sleep(250);
}

import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const outDir = 'runs/water9-weak-fauna-flora-visual-audit-2026-07-07';
const baseUrl = process.env.WATER9_PROOF_URL ?? process.argv[2] ?? 'http://localhost:5180/';
const targetUrl = withPlaytestParam(baseUrl);

const rankedTargets = [
  { assetKey: 'biolume-rock-0', kind: 'flora', biomes: [1, 2, 3, 4] },
  { assetKey: 'biolume-rock-1', kind: 'flora', biomes: [1, 2, 3, 4] },
  { assetKey: 'fauna-abyss-goblin-shark', kind: 'fauna', biomes: [3] },
  { assetKey: 'fauna-deep-barreleye', kind: 'fauna', biomes: [2] },
  { assetKey: 'fauna-deep-gulper-eel', kind: 'fauna', biomes: [2] },
  { assetKey: 'fauna-abyss-black-swallower', kind: 'fauna', biomes: [3] },
  { assetKey: 'fauna-abyss-frilled-shark', kind: 'fauna', biomes: [3] },
  { assetKey: 'fauna-abyss-snipe-eel', kind: 'fauna', biomes: [4] },
  { assetKey: 'fauna-deep-sea-spider', kind: 'fauna', biomes: [2] },
  { assetKey: 'fauna-shallow-lantern-fry', kind: 'fauna', biomes: [1] },
  { assetKey: 'fauna-abyss-hadal-shrimp', kind: 'fauna', biomes: [3] },
  { assetKey: 'fauna-deep-tripodfish', kind: 'fauna', biomes: [2] },
];

const depthBands = [
  { id: 'surface', biome: 1, targetDepth: 360 },
  { id: 'mid', biome: 2, targetDepth: 1080 },
  { id: 'deep', biome: 3, targetDepth: 1740 },
  { id: 'abyss-hadal', biome: 4, targetDepth: 2280 },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const runtimeErrors = [];

page.on('pageerror', (error) => runtimeErrors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error') runtimeErrors.push({ type: 'console', text: message.text() });
});
page.on('response', (response) => {
  if (response.status() >= 400) runtimeErrors.push({ type: 'response', status: response.status(), url: response.url() });
});

try {
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await waitForPlaytestApi();
  const captures = [];

  for (const band of depthBands) {
    await stageBiomeDepth(band.biome, band.targetDepth);
    captures.push(await capture(`runtime-band-${band.id}-biome${band.biome}`, {
      type: 'depth-band',
      targetDepth: band.targetDepth,
    }));
  }

  for (const target of rankedTargets) {
    const proof = await stageTarget(target);
    if (!proof.ok) {
      captures.push({
        type: 'target',
        assetKey: target.assetKey,
        ok: false,
        reason: proof.reason,
        attempts: proof.attempts,
      });
      continue;
    }
    captures.push(await capture(`runtime-target-${slug(target.assetKey)}`, {
      type: 'target',
      assetKey: target.assetKey,
      kind: target.kind,
      stageResult: proof.stageResult,
    }));
  }

  const report = {
    schema: 'water9/weak-sprite-normal-play-proof@1',
    source: 'actual DeepdiveScene normal play with ?playtest=1 commands, not sandbox/review harness',
    baseUrl,
    targetUrl,
    capturedElement: '#game canvas',
    viewportContext: '#app',
    runtimeIdentity: {
      hasAquaPlaytestApi: true,
      canvasSelector: '#game canvas',
      hudSelector: '.hud',
    },
    captures,
    runtimeErrors,
  };
  await writeFile(`${outDir}/normal-play-proof.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    ok: runtimeErrors.length === 0,
    captures: captures.length,
    failedTargets: captures.filter((item) => item.ok === false).length,
    path: `${outDir}/normal-play-proof.json`,
  }, null, 2));
} finally {
  await browser.close();
}

function withPlaytestParam(url) {
  const parsed = new URL(url);
  parsed.searchParams.set('playtest', '1');
  return parsed.toString();
}

function slug(value) {
  return String(value).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

async function waitForPlaytestApi() {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 45000 });
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false);
  }, null, { timeout: 45000 });
}

async function command(name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => {
    return window.__AQUA_PLAYTEST__?.command(commandName, commandValue);
  }, [name, value]);
  await page.waitForTimeout(result?.restarting ? 220 : 80);
  await waitForPlaytestApi();
  return result;
}

async function snapshot() {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function stageBiomeDepth(biome, targetDepth) {
  await command('setBiome', biome);
  await command('clearProofOverlays');
  await command('setCredits', 250000);
  await command('maxUpgrades');
  await command('buySub', 3);
  await command('dive');
  await command('teleportDepth', targetDepth);
  await command('centerCameraOnPlayer');
  await page.waitForTimeout(240);
}

async function stageTarget(target) {
  const attempts = [];
  for (const biome of target.biomes) {
    for (let pass = 0; pass < 3; pass += 1) {
      await stageBiomeDepth(biome, target.kind === 'fauna' ? 1200 : 900);
      const snap = await snapshot();
      if (target.kind === 'fauna') {
        const exists = (snap?.fish ?? []).some((fish) => fish.assetKey === target.assetKey && !fish.dead);
        attempts.push({ biome, pass, exists });
        if (!exists) continue;
        const stageResult = await command('teleportToFauna', { assetKey: target.assetKey, distance: 74 });
        await command('clearProofOverlays');
        await page.waitForTimeout(220);
        return { ok: true, stageResult };
      }
      const flora = (snap?.floraAnchors?.gameplay ?? []).filter((item) => !item.dead && item.hasSurface);
      const index = flora.findIndex((item) => item.assetKey === target.assetKey);
      attempts.push({ biome, pass, exists: index >= 0, index });
      if (index < 0) continue;
      const stageResult = await command('teleportToFlora', { index });
      await command('clearProofOverlays');
      await page.waitForTimeout(220);
      return { ok: true, stageResult };
    }
  }
  return { ok: false, reason: 'asset-not-spawned-in-attempts', attempts };
}

async function capture(name, extra = {}) {
  const snap = await snapshot();
  const canvasPath = `${outDir}/${name}-canvas.png`;
  const viewportPath = `${outDir}/${name}-viewport.png`;
  const canvas = page.locator('#game canvas').first();
  await canvas.screenshot({ path: canvasPath });
  await page.locator('#app').screenshot({ path: viewportPath });
  return {
    ok: true,
    ...extra,
    biome: snap?.state?.biome ?? null,
    biomeName: snap?.state?.biomeName ?? null,
    depth: snap?.state?.depth ?? null,
    screenshotPath: canvasPath,
    viewportPath,
    observedAssetKeys: observedAssetKeys(snap),
    observedFauna: (snap?.fish ?? [])
      .filter((fish) => fish.screenVisible)
      .map((fish) => ({ species: fish.species, assetKey: fish.assetKey, screenX: fish.screenX, screenY: fish.screenY })),
    observedFlora: visibleFlora(snap),
  };
}

function visibleFlora(snap) {
  const camera = snap?.camera;
  if (!camera) return [];
  return (snap?.floraAnchors?.gameplay ?? [])
    .filter((flora) => (
      flora.x >= camera.x
      && flora.x <= camera.x + camera.width
      && flora.y >= camera.y
      && flora.y <= camera.y + camera.height
    ))
    .map((flora) => ({ species: flora.species, assetKey: flora.assetKey, x: flora.x, y: flora.y }));
}

function observedAssetKeys(snap) {
  return [...new Set([
    ...(snap?.fish ?? []).filter((fish) => fish.screenVisible).map((fish) => fish.assetKey),
    ...visibleFlora(snap).map((flora) => flora.assetKey),
  ])].sort();
}

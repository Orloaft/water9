import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const runDir = '/mnt/nxt-dev/water9/runs/water9-fauna-animation-appraisal-2026-07-05';
const captureDir = join(runDir, 'live-canvas-captures');
const baseUrl = process.env.WATER9_URL ?? 'http://127.0.0.1:5180/';
const viewport = { width: 1280, height: 800 };

await mkdir(captureDir, { recursive: true });

const scenarios = [
  {
    id: 'b1-shallow-benchmarks',
    biome: 1,
    depths: [620, 900, 1260],
    targets: ['Reef Squid', 'Nautilus', 'Kelp Arrow Squid', 'Basalt Lantern Seahorse', 'Copperglass Cardinal'],
  },
  {
    id: 'b2-mid-deep-benchmarks',
    biome: 2,
    depths: [760, 1120, 1540],
    targets: ['Glass Squid', 'Velvet Glass Cuttle', 'Saffron Paddle Cuttle', 'Cyan Pulse Lanternfish', 'Blueglass Anthias'],
  },
  {
    id: 'b3-abyss-exp',
    biome: 3,
    depths: [820, 1320, 1860],
    targets: ['Bigfin Squid', 'Abyssal Viperfish', 'Starless Lantern Eel', 'Black Velvet Cusk', 'Bonefin Lantern Shark'],
  },
  {
    id: 'b4-deeper-exp',
    biome: 4,
    depths: [900, 1580, 2180],
    targets: ['Abyss Vampire Squid', 'Snipe Eel', 'Cinder Maw Dragonfish', 'Cathedral Fin Ribbonfish', 'Brineglass Snailfish'],
  },
];

const browser = await chromium.launch({ headless: true });
let page = null;
const runtimeErrors = [];

function attachRuntimeErrorCapture(activePage, scenarioId) {
  activePage.on('pageerror', (error) => runtimeErrors.push({ scenarioId, type: 'pageerror', text: error.message }));
  activePage.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push({ scenarioId, type: 'console', text: message.text() });
  });
  activePage.on('response', (response) => {
    if (response.status() >= 400) runtimeErrors.push({ scenarioId, type: 'response', status: response.status(), url: response.url() });
  });
}

function routeUrl(biome) {
  const url = new URL(baseUrl);
  url.searchParams.set('playtest', '1');
  url.searchParams.set('renderer', 'canvas');
  url.searchParams.set('debug', '1');
  url.searchParams.set('biome', String(biome));
  return url.toString();
}

async function waitForRuntime() {
  await page.waitForSelector('#game canvas', { timeout: 20000 });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 20000 });
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false && snap.camera);
  }, null, { timeout: 20000 });
}

async function command(name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => {
    return window.__AQUA_PLAYTEST__?.command?.(commandName, commandValue) ?? null;
  }, [name, value]);
  await page.waitForTimeout(result?.restarting ? 260 : 80);
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false && snap.camera);
  }, null, { timeout: 20000 });
  return result;
}

async function snapshot() {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

function fishScreen(fish, camera) {
  const zoom = camera?.zoom ?? 1;
  return {
    screenX: (fish.x - (camera?.x ?? 0)) * zoom,
    screenY: (fish.y - (camera?.y ?? 0)) * zoom,
  };
}

function visibleFish(snap, canvasBox, targets = []) {
  const targetSet = new Set(targets);
  return (snap?.fish ?? [])
    .filter((fish) => !fish.dead)
    .map((fish) => {
      const screen = fishScreen(fish, snap.camera);
      const margin = Math.max(28, fish.radius * (snap.camera?.zoom ?? 1) * 4.5);
      const inFrame = screen.screenX >= -margin &&
        screen.screenX <= canvasBox.width + margin &&
        screen.screenY >= -margin &&
        screen.screenY <= canvasBox.height + margin;
      return {
        ...fish,
        ...screen,
        target: targetSet.has(fish.species),
        experimental: String(fish.assetKey).startsWith('fauna-exp-'),
        inFrame,
      };
    })
    .filter((fish) => fish.inFrame)
    .sort((a, b) => Number(b.target) - Number(a.target) || Number(b.experimental) - Number(a.experimental) || b.radius - a.radius);
}

async function captureFrame(label, scenario, depthMeters, frameIndex) {
  const canvas = page.locator('#game canvas').first();
  const canvasBox = await canvas.boundingBox();
  const snap = await snapshot();
  const safe = `${label}-f${String(frameIndex).padStart(2, '0')}`;
  const canvasPath = join(captureDir, `${safe}-canvas.png`);
  const pagePath = join(captureDir, `${safe}-runtime.png`);
  await canvas.screenshot({ path: canvasPath });
  await page.screenshot({ path: pagePath, fullPage: false });
  const fish = visibleFish(snap, canvasBox ?? viewport, scenario.targets);
  return {
    label,
    frameIndex,
    biome: snap?.state?.biome ?? scenario.biome,
    biomeName: snap?.state?.biomeName ?? '',
    routeDepth: depthMeters,
    stateDepth: snap?.state?.depth ?? null,
    seed: snap?.seed ?? null,
    canvasPath,
    pagePath,
    canvasBox,
    camera: snap?.camera ?? null,
    player: snap?.player ?? null,
    visibleFish: fish,
    fishCounts: {
      totalVisible: fish.length,
      targetVisible: fish.filter((entry) => entry.target).length,
      experimentalVisible: fish.filter((entry) => entry.experimental).length,
    },
  };
}

const captures = [];
const route = [];

try {
  for (const scenario of scenarios) {
    page = await browser.newPage({ viewport });
    attachRuntimeErrorCapture(page, scenario.id);
    await page.goto(routeUrl(scenario.biome), { waitUntil: 'domcontentloaded' });
    await waitForRuntime();
    await command('clearProofOverlays');
    await command('start');
    await command('maxUpgrades');
    await command('refill');
    await command('dive');
    await command('clearProofOverlays');

    for (const depth of scenario.depths) {
      const teleport = await command('teleportToReachableDepth', depth);
      await command('centerCameraOnPlayer');
      await command('clearProofOverlays');
      route.push({ scenario: scenario.id, biome: scenario.biome, requestedDepth: depth, teleport });

      const label = `${scenario.id}-d${depth}`;
      const patrolKey = depth % 2 === 0 ? 'ArrowRight' : 'ArrowLeft';
      await page.keyboard.down(patrolKey);
      for (let frame = 0; frame < 8; frame += 1) {
        await page.waitForTimeout(140);
        captures.push(await captureFrame(label, scenario, depth, frame));
      }
      await page.keyboard.up(patrolKey);
      await page.waitForTimeout(160);
    }
    await page.close();
    page = null;
  }
} finally {
  if (page) await page.close().catch(() => {});
  await browser.close();
}

const summary = {
  schema: 'water9/live-canvas-capture@1',
  baseUrl,
  viewport,
  capturedAt: new Date().toISOString(),
  scenarios,
  route,
  captures,
  runtimeErrors,
};

await writeFile(join(runDir, 'live-canvas-raw.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({
  captures: captures.length,
  runtimeErrors: runtimeErrors.length,
  raw: join(runDir, 'live-canvas-raw.json'),
}, null, 2));

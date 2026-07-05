import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const runDir = '/mnt/nxt-dev/water9/runs/water9-fauna-animation-appraisal-2026-07-05';
const captureDir = join(runDir, 'live-canvas-captures');
const baseUrl = process.env.WATER9_URL ?? 'http://127.0.0.1:5180/';
const viewport = { width: 1280, height: 800 };
const worldCenterX = 104 * 24 * 0.5;
const surfaceY = 24 * 4;
const biomeList = (process.env.SUPP_BIOMES ?? '1,2,3,4')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => [1, 2, 3, 4].includes(value));
const outputSuffix = process.env.SUPP_SUFFIX ?? '';

await mkdir(captureDir, { recursive: true });

const targetsByBiome = {
  1: ['Reef Squid', 'Nautilus', 'Kelp Arrow Squid', 'Basalt Lantern Seahorse', 'Copper Banded Seahorse', 'Amber Snout Boxfish'],
  2: ['Glass Squid', 'Velvet Glass Cuttle', 'Saffron Paddle Cuttle', 'Glass Helm Nautilus', 'Cyan Pulse Lanternfish'],
  3: ['Bigfin Squid', 'Abyssal Viperfish', 'Abyssal Thread Eel', 'Starless Lantern Eel', 'Black Velvet Cusk'],
  4: ['Abyss Vampire Squid', 'Snipe Eel', 'Ancient Mask Angler', 'Cinder Maw Dragonfish', 'Cathedral Fin Ribbonfish'],
};

const browser = await chromium.launch({ headless: true });
const runtimeErrors = [];

function routeUrl(biome) {
  const url = new URL(baseUrl);
  url.searchParams.set('playtest', '1');
  url.searchParams.set('renderer', 'canvas');
  url.searchParams.set('debug', '1');
  url.searchParams.set('biome', String(biome));
  return url.toString();
}

async function waitForRuntime(page) {
  await page.waitForSelector('#game canvas', { timeout: 20000 });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.snapshot?.()?.world), null, { timeout: 20000 });
}

async function waitForFishRoster(page) {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Array.isArray(snap?.fish) && snap.fish.length > 0;
  }, null, { timeout: 20000 });
}

async function command(page, name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => {
    return window.__AQUA_PLAYTEST__?.command?.(commandName, commandValue) ?? null;
  }, [name, value]);
  await page.waitForTimeout(result?.restarting ? 260 : 90);
  return result;
}

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

function selectSubjects(snap, biome) {
  const targets = targetsByBiome[biome] ?? [];
  const targetSet = new Set(targets);
  const candidates = (snap.fish ?? [])
    .filter((fish) => targetSet.has(fish.species))
    .map((fish) => ({
      fish,
      depthMeters: Math.max(0, Math.round((fish.y - surfaceY) / 6)),
      score: Math.abs(fish.x - worldCenterX) - (String(fish.assetKey).startsWith('fauna-exp-') ? 35 : 0),
    }))
    .sort((a, b) => a.score - b.score);
  const picked = [];
  const seen = new Set();
  for (const candidate of candidates) {
    if (seen.has(candidate.fish.species)) continue;
    picked.push(candidate);
    seen.add(candidate.fish.species);
    if (picked.length >= 5) break;
  }
  return picked;
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

async function captureFrame(page, label, biome, targetDepth, targets, frameIndex) {
  const canvas = page.locator('#game canvas').first();
  const canvasBox = await canvas.boundingBox();
  const snap = await snapshot(page);
  const safe = `${label}-f${String(frameIndex).padStart(2, '0')}`;
  const canvasPath = join(captureDir, `${safe}-canvas.png`);
  const pagePath = join(captureDir, `${safe}-runtime.png`);
  const dataUrl = await page.evaluate(() => {
    const canvas = document.querySelector('#game canvas');
    return canvas?.toDataURL('image/png') ?? '';
  });
  if (!dataUrl.startsWith('data:image/png;base64,')) throw new Error('canvas export failed');
  await writeFile(canvasPath, Buffer.from(dataUrl.split(',')[1], 'base64'));
  await page.screenshot({ path: pagePath, fullPage: false });
  const fish = visibleFish(snap, canvasBox ?? viewport, targets);
  return {
    label,
    frameIndex,
    biome: snap?.state?.biome ?? biome,
    biomeName: snap?.state?.biomeName ?? '',
    routeDepth: targetDepth,
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
  for (const biome of biomeList) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', (error) => runtimeErrors.push({ biome, type: 'pageerror', text: error.message }));
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push({ biome, type: 'console', text: message.text() });
    });
    page.on('response', (response) => {
      if (response.status() >= 400) runtimeErrors.push({ biome, type: 'response', status: response.status(), url: response.url() });
    });
    await page.goto(routeUrl(biome), { waitUntil: 'domcontentloaded' });
    await waitForRuntime(page);
    await command(page, 'clearProofOverlays');
    await command(page, 'start');
    await command(page, 'maxUpgrades');
    await command(page, 'refill');
    await command(page, 'dive');
    await command(page, 'clearProofOverlays');
    await waitForFishRoster(page);
    const initial = await snapshot(page);
    const subjects = selectSubjects(initial, biome);
    route.push({
      biome,
      seed: initial?.seed ?? null,
      subjects: subjects.map((subject) => ({
        species: subject.fish.species,
        assetKey: subject.fish.assetKey,
        x: subject.fish.x,
        y: subject.fish.y,
        depthMeters: subject.depthMeters,
        centerlineDistance: Math.round(Math.abs(subject.fish.x - worldCenterX)),
      })),
    });
    for (const subject of subjects) {
      const label = `supp-b${biome}-${subject.fish.assetKey}-d${subject.depthMeters}`;
      await command(page, 'teleportDepth', subject.depthMeters * 6);
      await command(page, 'centerCameraOnPlayer');
      await command(page, 'clearProofOverlays');
      const key = subject.fish.x < worldCenterX ? 'ArrowLeft' : 'ArrowRight';
      await page.keyboard.down(key);
      for (let frame = 0; frame < 8; frame += 1) {
        await page.waitForTimeout(140);
        captures.push(await captureFrame(page, label, biome, subject.depthMeters, targetsByBiome[biome], frame));
      }
      await page.keyboard.up(key);
      await page.waitForTimeout(120);
    }
    await page.close();
  }
} finally {
  await browser.close();
}

const summary = {
  schema: 'water9/live-canvas-supplemental@1',
  baseUrl,
  viewport,
  capturedAt: new Date().toISOString(),
  route,
  captures,
  runtimeErrors,
};

const supplementalPath = join(runDir, `live-canvas-supplemental${outputSuffix}.json`);
await writeFile(supplementalPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({
  captures: captures.length,
  runtimeErrors: runtimeErrors.length,
  supplemental: supplementalPath,
}, null, 2));

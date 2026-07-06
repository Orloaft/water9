import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import net from 'node:net';
import { chromium } from 'playwright';

const outDir = process.env.FAUNA_PATHFINDING_OUT_DIR ?? 'runs/water9-fauna-pathfinding-appraisal-2026-07-06/implementation-proof';
const reportPath = process.env.FAUNA_PATHFINDING_REPORT ?? `${outDir}/fauna-pathfinding-smoke.json`;
const host = '127.0.0.1';
const requestedPort = Number(process.env.FAUNA_PATHFINDING_PORT ?? 5189);
const useProvidedUrl = Boolean(process.env.PLAYTEST_URL);
let port = requestedPort;
let baseUrl = process.env.PLAYTEST_URL ?? '';

await mkdir(outDir, { recursive: true });

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function portAvailable(candidate) {
  return new Promise((resolvePort) => {
    const server = net.createServer();
    server.once('error', () => resolvePort(false));
    server.once('listening', () => {
      server.close(() => resolvePort(true));
    });
    server.listen(candidate, host);
  });
}

async function pickPort() {
  if (await portAvailable(requestedPort)) return requestedPort;
  for (let candidate = 5180; candidate <= 5199; candidate += 1) {
    if (await portAvailable(candidate)) return candidate;
  }
  throw new Error('no available proof port in 5180-5199');
}

let server = null;
const serverLogs = [];
if (!useProvidedUrl) {
  port = await pickPort();
  baseUrl = `http://${host}:${port}/?playtest=1`;
  server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
  server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));
}

async function waitForServer(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null) throw new Error(`dev server exited before ready with code ${server.exitCode}`);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite may still be binding.
    }
    await sleep(150);
  }
  throw new Error(`dev server was not ready within ${timeoutMs}ms`);
}

const targets = [
  { id: 'b1-surface-school', biome: 1, species: 'Lantern Fry', band: 'surface', expected: 'legacySwimmer', kind: 'neutral' },
  { id: 'b1-mid-circle', biome: 1, species: 'Nautilus', band: 'mid', expected: 'legacySwimmer', kind: 'neutral' },
  { id: 'b2-mid-glide', biome: 2, species: 'Glass Squid', band: 'mid', expected: 'legacySwimmer', kind: 'neutral' },
  { id: 'b2-hostile-stalk', biome: 2, species: 'Vampire Squid', band: 'deep', expected: 'legacySwimmer', kind: 'hostile', proximity: 46 },
  { id: 'b3-deep-glide', biome: 3, species: 'Bigfin Squid', band: 'deep', expected: 'legacySwimmer', kind: 'neutral' },
  { id: 'b4-neutral-glide', biome: 4, species: 'Abyss Vampire Squid', band: 'mid', expected: 'legacySwimmer', kind: 'neutral' },
  { id: 'b4-hostile-stalk', biome: 4, species: 'Snipe Eel', band: 'deep', expected: 'legacySwimmer', kind: 'hostile', proximity: 44 },
  { id: 'b1-benthic-regression', biome: 1, species: 'Silver Hinge Crab', band: 'deep', expected: 'benthicWalker', kind: 'benthic-regression' },
];

const errors = [];
const captures = [];

function fail(text) {
  errors.push({ type: 'assertion', text });
}

function firstTarget(review, species) {
  return review?.targets?.find((target) => target.species === species) ?? null;
}

function dataUrlToBuffer(dataUrl) {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  return Buffer.from(base64, 'base64');
}

async function canvasDataUrl(page, grayscale = false) {
  return page.evaluate((makeGray) => {
    const source = document.querySelector('#game canvas');
    if (!(source instanceof HTMLCanvasElement)) return null;
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(source, 0, 0);
    if (makeGray) {
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < image.data.length; i += 4) {
        const gray = Math.round(image.data[i] * 0.299 + image.data[i + 1] * 0.587 + image.data[i + 2] * 0.114);
        image.data[i] = gray;
        image.data[i + 1] = gray;
        image.data[i + 2] = gray;
      }
      ctx.putImageData(image, 0, 0);
    }
    return canvas.toDataURL('image/png');
  }, grayscale);
}

async function buildContactSheet(page, items) {
  return page.evaluate(async (sheetItems) => {
    const thumbW = 320;
    const thumbH = 200;
    const gutter = 18;
    const labelH = 34;
    const columns = 2;
    const rows = Math.ceil(sheetItems.length / columns);
    const canvas = document.createElement('canvas');
    canvas.width = columns * thumbW + (columns + 1) * gutter;
    canvas.height = rows * (thumbH + labelH) + (rows + 1) * gutter;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#06131d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '16px sans-serif';
    ctx.textBaseline = 'top';
    for (let i = 0; i < sheetItems.length; i += 1) {
      const item = sheetItems[i];
      const image = new Image();
      image.src = item.dataUrl;
      await image.decode();
      const col = i % columns;
      const row = Math.floor(i / columns);
      const x = gutter + col * (thumbW + gutter);
      const y = gutter + row * (thumbH + labelH + gutter);
      ctx.drawImage(image, x, y, thumbW, thumbH);
      ctx.fillStyle = '#d6f6ff';
      ctx.fillText(`${item.id} | ${item.species}`, x, y + thumbH + 7);
    }
    return canvas.toDataURL('image/png');
  }, items);
}

if (server) await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ type: 'console', text: message.text() });
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
});

async function command(name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => (
    window.__AQUA_PLAYTEST__?.command?.(commandName, commandValue) ?? null
  ), [name, value]);
  await page.waitForTimeout(120);
  return result;
}

async function waitReady(expectedBiome = null) {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false && snap.fish?.length);
  }, null, { timeout: 30000 });
  if (expectedBiome !== null) {
    await page.waitForFunction((biome) => {
      const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
      return snap?.state?.biome === biome && snap?.world?.ready !== false && Boolean(snap?.fish?.length);
    }, expectedBiome, { timeout: 30000 });
  }
}

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 10000 });
  await command('start');
  await waitReady(1);

  let currentBiome = 1;
  for (const target of targets) {
    if (target.biome !== currentBiome) {
      await command('setBiome', target.biome);
      currentBiome = target.biome;
      await waitReady(target.biome);
    }
    await command('clearProofOverlays');
    const teleport = await command('teleportToFauna', { species: target.species, distance: target.proximity ?? 62 });
    await page.waitForTimeout(260);
    const initialReview = await command('faunaBehaviorReview', { species: target.species });
    const initial = firstTarget(initialReview, target.species);
    if (!teleport?.ok || !initial) {
      fail(`${target.id}: could not teleport/review ${target.species}`);
      continue;
    }

    await page.waitForTimeout(target.expected === 'legacySwimmer' ? 3400 : 1200);
    await command('teleportToFauna', { species: target.species, distance: target.proximity ?? 62 });
    await page.waitForTimeout(180);
    const finalReview = await command('faunaBehaviorReview', { species: target.species });
    const final = firstTarget(finalReview, target.species);
    if (!final) {
      fail(`${target.id}: target disappeared before final review`);
      continue;
    }
    const colorDataUrl = await canvasDataUrl(page, false);
    const grayDataUrl = await canvasDataUrl(page, true);
    const colorPath = `${outDir}/${target.id}-canvas-color.png`;
    const grayPath = `${outDir}/${target.id}-canvas-gray.png`;
    await writeFile(colorPath, dataUrlToBuffer(colorDataUrl));
    await writeFile(grayPath, dataUrlToBuffer(grayDataUrl));

    if (final.behaviorClass !== target.expected) fail(`${target.id}: expected ${target.expected}, got ${final.behaviorClass}`);
    if (!final.screenVisible) fail(`${target.id}: final target was not visible`);
    if (target.expected === 'legacySwimmer') {
      const displacement = Math.hypot(final.x - initial.x, final.y - initial.y);
      const bounceDelta = (final.navTerrainBounces ?? 0) - (initial.navTerrainBounces ?? 0);
      const reseedDelta = (final.navReseedCount ?? 0) - (initial.navReseedCount ?? 0);
      if (final.centerTile !== 'water') fail(`${target.id}: center tile ended in ${final.centerTile}`);
      if (bounceDelta > 5) fail(`${target.id}: terrain bounce delta ${bounceDelta} exceeded 5`);
      if (bounceDelta >= 2 && displacement < Math.max(4, final.radius * 0.5)) {
        fail(`${target.id}: repeated bounces with only ${displacement.toFixed(2)}px displacement`);
      }
      if ((final.navRecentTerrainBounces ?? 0) > 2) fail(`${target.id}: recent terrain bounce loop ${final.navRecentTerrainBounces}`);
      if ((final.navHeadingFlipCount ?? 0) > 5) fail(`${target.id}: heading flip count ${final.navHeadingFlipCount}`);
      if (reseedDelta > 3) fail(`${target.id}: local waypoint reseeded ${reseedDelta} times`);
    } else {
      if (!final.hasSurface || !final.supported || final.fallbackNoAnchor) fail(`${target.id}: anchored/benthic regression missing supported surface`);
      if (final.distanceFromSurface > 34) fail(`${target.id}: benthic sample detached by ${final.distanceFromSurface}px`);
    }

    captures.push({
      ...target,
      source: '#game canvas',
      colorPath,
      grayPath,
      initial,
      final,
      deltas: {
        displacement: Number(Math.hypot(final.x - initial.x, final.y - initial.y).toFixed(3)),
        terrainBounces: (final.navTerrainBounces ?? 0) - (initial.navTerrainBounces ?? 0),
        reseeds: (final.navReseedCount ?? 0) - (initial.navReseedCount ?? 0),
        blockedFeelers: (final.navBlockedFeelers ?? 0) - (initial.navBlockedFeelers ?? 0),
      },
      colorDataUrl,
    });
  }

  const snapshot = await page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
  const fallbackRate = snapshot?.legacySwimmerNavigation
    ? snapshot.legacySwimmerNavigation.spawnFallbacks / Math.max(1, snapshot.legacySwimmerNavigation.spawnFallbacks + snapshot.legacySwimmerNavigation.spawnValidated)
    : 0;
  if (fallbackRate > 0.5) fail(`legacy swimmer spawn fallback rate ${(fallbackRate * 100).toFixed(1)}% exceeded 50%`);

  const contactSheetPath = `${outDir}/fauna-pathfinding-contact-sheet.png`;
  const contactSheetDataUrl = await buildContactSheet(page, captures.map(({ id, species, colorDataUrl }) => ({ id, species, dataUrl: colorDataUrl })));
  await writeFile(contactSheetPath, dataUrlToBuffer(contactSheetDataUrl));

  for (const capture of captures) delete capture.colorDataUrl;
  const report = {
    schema: 'water9/fauna-pathfinding-smoke@1',
    generatedAt: new Date().toISOString(),
    url: baseUrl,
    passed: errors.length === 0,
    source: '#game canvas',
    commands: [
      'npx tsc --noEmit --pretty false',
      'npm run build',
      'node tools/test_fish_visual_facing_smoke.mjs',
      'node tools/test_aggro_cue_regression.mjs',
      'node tools/test_fauna_pathfinding_smoke.mjs',
    ],
    errors,
    spawnMetrics: snapshot?.legacySwimmerNavigation ?? null,
    fallbackRate: Number(fallbackRate.toFixed(4)),
    contactSheetPath,
    captures,
    serverLogs: serverLogs.join('').slice(-4000),
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  server?.kill('SIGTERM');
  process.exit(errors.length === 0 ? 0 : 1);
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  const report = {
    schema: 'water9/fauna-pathfinding-smoke@1',
    generatedAt: new Date().toISOString(),
    url: baseUrl,
    passed: false,
    errors,
    captures,
    serverLogs: serverLogs.join('').slice(-4000),
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close().catch(() => {});
  server?.kill('SIGTERM');
  process.exit(1);
}

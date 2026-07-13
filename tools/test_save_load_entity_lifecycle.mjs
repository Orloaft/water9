import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = Number(process.env.WATER9_SAVE_LOAD_ENTITY_PORT ?? 5181);
const outDir = process.env.WATER9_SAVE_LOAD_ENTITY_OUT_DIR ?? resolve('runs/save-load-entity-sprite-corruption-2026-07-13/artifacts');
const reportPath = process.env.WATER9_SAVE_LOAD_ENTITY_REPORT ?? resolve(outDir, 'regression-diagnostics.json');
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=1&renderer=canvas`;

await mkdir(outDir, { recursive: true });

let server = null;
if (!process.env.PLAYTEST_URL) {
  server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const browserErrors = [];
const serverLogs = [];
server?.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server?.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

async function waitForServer(url, timeoutMs = 20_000) {
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

async function command(page, name, value) {
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null, [name, value]);
}

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function waitForSettledWorld(page, expectedBiome) {
  await page.waitForFunction((biome) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    const loading = window.__AQUA_PLAYTEST__?.command?.('biomeLoadingReview');
    return Boolean(
      snap?.world?.ready !== false
      && snap?.state?.biome === biome
      && loading?.worldReady === true
      && !loading?.active
    );
  }, expectedBiome, { timeout: 30_000 });
  await page.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
}

async function waitForBiomeTransition(page, expectedBiome) {
  await page.waitForFunction((biome) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    const loading = window.__AQUA_PLAYTEST__?.command?.('biomeLoadingReview');
    return snap?.state?.biome === biome && (loading?.active === true || loading?.worldReady === false);
  }, expectedBiome, { timeout: 10_000 });
  await waitForSettledWorld(page, expectedBiome);
}

async function waitForLoadComplete(page, loadId) {
  await page.waitForFunction((expectedLoadId) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(
      snap?.world?.ready !== false
      && !snap?.ui?.biomeLoading?.active
      && snap?.state?.saveLoad?.phase === 'complete'
      && snap?.state?.saveLoad?.completedId >= expectedLoadId
    );
  }, loadId, { timeout: 30_000 });
  await page.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
}

async function focusNearestFaunaFloraPair(page) {
  const snap = await snapshot(page);
  const fish = (snap?.fish ?? []).filter((entry) => !entry.dead);
  const flora = (snap?.floraAnchors?.gameplay ?? []).filter((entry) => !entry.dead && entry.hasSurface);
  if (!fish.length || !flora.length) return { ok: false, fish: fish.length, flora: flora.length };
  let best = { floraIndex: 0, fishIndex: 0, distance: Infinity };
  for (let floraIndex = 0; floraIndex < flora.length; floraIndex += 1) {
    for (let fishIndex = 0; fishIndex < fish.length; fishIndex += 1) {
      const distance = Math.hypot(flora[floraIndex].x - fish[fishIndex].x, flora[floraIndex].y - fish[fishIndex].y);
      if (distance < best.distance) best = { floraIndex, fishIndex, distance };
    }
  }
  const result = await command(page, 'teleportToFlora', { index: best.floraIndex });
  await page.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
  return { ok: Boolean(result), ...best, flora: flora[best.floraIndex], fish: fish[best.fishIndex] };
}

async function captureCanvasCheckpoint(page, stem) {
  const canvas = page.locator('#game canvas');
  await canvas.screenshot({ path: resolve(outDir, `${stem}-color.png`) });
  await page.evaluate(() => { document.documentElement.style.filter = 'grayscale(1)'; });
  await page.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(resolveFrame)));
  await canvas.screenshot({ path: resolve(outDir, `${stem}-grayscale.png`) });
  await page.evaluate(() => { document.documentElement.style.filter = ''; });
}

function invalidVisibleSprites(checkpoint) {
  const sprites = [
    ...(checkpoint?.fish ?? []).map((entry) => ({ group: 'fish', id: entry.species, sprite: entry.sprite })),
    ...(checkpoint?.flora ?? []).map((entry) => ({ group: 'flora', id: entry.species, sprite: entry.sprite })),
    ...(checkpoint?.articulated ?? []).flatMap((entry) => entry.parts.map((part) => ({ group: 'articulated', id: `${entry.id}:${part.id}`, sprite: part.sprite }))),
  ].filter((entry) => entry.sprite?.visible);
  return sprites.filter(({ sprite }) => (
    !sprite.active
    || !sprite.textureResident
    || !sprite.attachedToScene
    || !sprite.attachedToDisplayList
    || !sprite.textureKey
    || sprite.textureKey === '__DEFAULT'
    || sprite.textureKey === '__MISSING'
    || sprite.sourceWidth <= 1
    || sprite.sourceHeight <= 1
    || sprite.frameWidth <= 1
    || sprite.frameHeight <= 1
    || sprite.frameCutWidth <= 1
    || sprite.frameCutHeight <= 1
  ));
}

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

if (server) await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

page.on('pageerror', (error) => browserErrors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  const text = message.text();
  if (message.type() === 'error' || (message.type() === 'warning' && /texture|frame|asset|webgl/i.test(text))) {
    browserErrors.push({ type: `console-${message.type()}`, text });
  }
});
page.on('response', (response) => {
  if (response.status() >= 400) browserErrors.push({ type: 'response', status: response.status(), url: response.url() });
});

let report = {};
try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await waitForSettledWorld(page, 1);
  await command(page, 'start');
  await command(page, 'clearProofOverlays');
  await command(page, 'dive');
  const beforeFocus = await focusNearestFaunaFloraPair(page);
  const beforeSave = await command(page, 'entityLifecycleDiagnostics');
  await captureCanvasCheckpoint(page, 'before-save');

  const saveResult = await command(page, 'saveGame');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 10_000 });
  const loadResult = await command(page, 'loadGame');
  await waitForLoadComplete(page, loadResult?.loadId ?? 0);
  const afterLoadFocus = await focusNearestFaunaFloraPair(page);
  const afterLoad = await command(page, 'entityLifecycleDiagnostics');
  await captureCanvasCheckpoint(page, 'after-load-same-biome');

  await command(page, 'storyMilestoneSmokeStage', { milestone: 'b1', mode: 'complete', reset: false });
  await command(page, 'setCredits', 1_000_000);
  await page.waitForSelector('button[data-travel-biome]:not([disabled])', { timeout: 10_000 });
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('button[data-travel-biome]').click();
  await waitForBiomeTransition(page, 2);
  const nextBiomeFocus = await focusNearestFaunaFloraPair(page);
  const nextBiome = await command(page, 'entityLifecycleDiagnostics');
  await captureCanvasCheckpoint(page, 'next-biome');

  const afterLoadInvalid = invalidVisibleSprites(afterLoad);
  const nextBiomeInvalid = invalidVisibleSprites(nextBiome);
  assert(saveResult?.ok, 'save command did not report success');
  assert(loadResult?.ok, 'load command did not report success');
  assert(afterLoad?.counts?.fish > 0, 'post-load saved biome has no fauna');
  assert(afterLoad?.counts?.flora > 0, 'post-load saved biome has no flora');
  assert(afterLoad?.counts?.visibleFish > 0, 'post-load saved biome has no visible fauna');
  assert(afterLoad?.counts?.visibleFlora > 0, 'post-load saved biome has no visible flora');
  assert(afterLoadInvalid.length === 0, `post-load saved biome has ${afterLoadInvalid.length} invalid visible entity sprites`);
  assert(nextBiome?.counts?.fish > 0, 'next biome has no fauna');
  assert(nextBiome?.counts?.flora > 0, 'next biome has no flora');
  assert(nextBiome?.counts?.visibleFish > 0, 'next biome has no visible fauna');
  assert(nextBiome?.counts?.visibleFlora > 0, 'next biome has no visible flora');
  assert(nextBiomeInvalid.length === 0, `next biome has ${nextBiomeInvalid.length} invalid visible entity sprites`);
  assert(browserErrors.length === 0, `browser/runtime produced ${browserErrors.length} relevant errors`);

  report = {
    ok: failures.length === 0,
    sequence: 'normal play: biome 1 dive -> save -> load -> barge travel UI -> biome 2',
    baseUrl,
    saveResult,
    loadResult,
    focus: { beforeSave: beforeFocus, afterLoad: afterLoadFocus, nextBiome: nextBiomeFocus },
    checkpoints: { beforeSave, afterLoad, nextBiome },
    invalidVisibleSprites: { afterLoad: afterLoadInvalid, nextBiome: nextBiomeInvalid },
  };
} catch (error) {
  failures.push(error?.stack ?? String(error));
} finally {
  report = { ...report, ok: failures.length === 0, failures, browserErrors, serverLogs: serverLogs.slice(-30) };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
  if (server) server.kill('SIGTERM');
}

if (failures.length) {
  console.error('Water9 save/load entity lifecycle regression failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 save/load entity lifecycle regression passed.');
console.log(`Report: ${reportPath}`);

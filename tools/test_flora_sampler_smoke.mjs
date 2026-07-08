import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_SAMPLER_OUT_DIR ?? 'runs/water9-full-loop-tools-threats-2026-07-07';
const reportPath = process.env.WATER9_SAMPLER_REPORT ?? `${outDir}/sampler-v1-smoke.json`;
const screenshotPath = process.env.WATER9_SAMPLER_SCREENSHOT ?? `${outDir}/sampler-v1-hud.png`;
const host = '127.0.0.1';
const port = Number(process.env.WATER9_SAMPLER_PORT ?? 5187);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=1`;

await mkdir(outDir, { recursive: true });

let server = null;
if (!process.env.PLAYTEST_URL) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500);
    try {
      const response = await fetch(baseUrl, { method: 'HEAD', signal: controller.signal });
      if (response.ok || response.status < 500) throw new Error(`port ${port} is already serving ${baseUrl}; stop the stale dev server or set WATER9_SAMPLER_PORT`);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    if (String(error?.message ?? error).includes('already serving')) throw error;
  }
  server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const errors = [];
const serverLogs = [];
server?.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server?.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

function fail(message) {
  errors.push({ type: 'assertion', text: message });
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

async function command(page, name, value) {
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null, [name, value]);
}

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function waitForWorld(page) {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false && !snap.ui?.biomeLoading?.active);
  }, null, { timeout: 45000 });
}

async function waitForLoadComplete(page, loadId) {
  await page.waitForFunction((expectedLoadId) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(
      snap?.world
      && snap.world.ready !== false
      && !snap.ui?.biomeLoading?.active
      && snap.state?.saveLoad?.phase === 'complete'
      && snap.state?.saveLoad?.completedId >= expectedLoadId
    );
  }, loadId, { timeout: 20000 });
}

async function holdKey(page, key, holdMs = 1800) {
  await page.keyboard.down(key);
  await page.waitForTimeout(holdMs);
  await page.keyboard.up(key);
  await page.waitForTimeout(160);
}

async function holdSampler(page, holdMs = 2100) {
  await page.keyboard.press('Digit4');
  await page.waitForTimeout(120);
  await holdKey(page, 'Space', holdMs);
  return snapshot(page);
}

if (server) await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) errors.push({ type: 'console', text: message.text() });
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
});

let report = {};
try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 25000 });
  await waitForWorld(page);
  await command(page, 'clearSave');
  await command(page, 'setBiome', 1);
  await page.waitForTimeout(500);
  await waitForWorld(page);
  await page.locator('#game').click({ position: { x: 640, y: 400 }, force: true });

  let snap = await snapshot(page);
  if (snap?.state?.selectedTool !== 'drill') fail(`default selected tool should be drill, got ${snap?.state?.selectedTool}`);
  if (!snap?.state?.unlockedTools?.sampler) fail('sampler should be unlocked for normal play in this slice');
  for (const id of ['flare', 'stun', 'charge']) {
    if (snap?.state?.unlockedTools?.[id]) fail(`${id} should remain locked/coming-soon`);
  }

  const floraStage = await command(page, 'floraSamplerSmokeStage', { mode: 'flora' });
  if (!floraStage?.ok) fail(`flora sampler stage failed: ${JSON.stringify(floraStage)}`);
  const beforeSample = await snapshot(page);
  const scansBefore = beforeSample?.state?.scannedSpecies?.length ?? 0;
  const samplesBefore = beforeSample?.state?.sampledSpecies?.length ?? 0;
  const creditsBefore = beforeSample?.state?.credits ?? 0;
  const cargoBefore = beforeSample?.state?.cargo ?? 0;
  const afterSample = await holdSampler(page);
  const samplesAfter = afterSample?.state?.sampledSpecies?.length ?? 0;
  const scansAfter = afterSample?.state?.scannedSpecies?.length ?? 0;
  const creditsAfter = afterSample?.state?.credits ?? 0;
  const cargoAfter = afterSample?.state?.cargo ?? 0;
  const stagedFloraAfter = afterSample?.floraAnchors?.gameplay?.[0];
  if (afterSample?.state?.selectedTool !== 'sampler') fail(`Digit4 should select sampler, got ${afterSample?.state?.selectedTool}`);
  if (samplesAfter !== samplesBefore + 1) fail(`sampler did not add exactly one sampled species (${samplesBefore} -> ${samplesAfter})`);
  if (scansAfter !== scansBefore) fail(`sampler changed normal scanned species progress (${scansBefore} -> ${scansAfter})`);
  if (creditsAfter !== creditsBefore) fail(`sampler paid immediate credits instead of creating sale cargo (${creditsBefore} -> ${creditsAfter})`);
  if (cargoAfter !== cargoBefore + 1) fail(`sampler did not add exactly one sample cargo (${cargoBefore} -> ${cargoAfter})`);
  if (!stagedFloraAfter?.dead) fail('sampling did not harvest/kill the staged flora');

  const duplicateStage = await command(page, 'floraSamplerSmokeStage', { mode: 'flora' });
  if (!duplicateStage?.ok) fail(`duplicate flora stage failed: ${JSON.stringify(duplicateStage)}`);
  const beforeDuplicate = await snapshot(page);
  const afterDuplicate = await holdSampler(page);
  if ((afterDuplicate?.state?.sampledSpecies?.length ?? 0) !== (beforeDuplicate?.state?.sampledSpecies?.length ?? 0)) fail('duplicate same-species sample incremented sampled species');
  if ((afterDuplicate?.state?.cargo ?? 0) !== (beforeDuplicate?.state?.cargo ?? 0) + 1) fail('duplicate same-species sample did not add sale cargo');
  if ((afterDuplicate?.state?.credits ?? 0) !== (beforeDuplicate?.state?.credits ?? 0)) fail('duplicate same-species sample paid immediate credits');

  for (const mode of ['fish', 'articulated', 'terrain']) {
    const staged = await command(page, 'floraSamplerSmokeStage', { mode });
    if (!staged?.ok) fail(`non-flora stage ${mode} failed: ${JSON.stringify(staged)}`);
    const before = await snapshot(page);
    const after = await holdSampler(page, 1550);
    if ((after?.state?.sampledSpecies?.length ?? 0) !== (before?.state?.sampledSpecies?.length ?? 0)) fail(`sampler affected ${mode} target`);
    if ((after?.state?.credits ?? 0) !== (before?.state?.credits ?? 0)) fail(`sampler paid credits for ${mode} target`);
    if ((after?.state?.cargo ?? 0) !== (before?.state?.cargo ?? 0)) fail(`sampler added cargo for ${mode} target`);
  }

  const scannerStage = await command(page, 'floraSamplerSmokeStage', { mode: 'flora' });
  if (!scannerStage?.ok) fail(`scanner flora stage failed: ${JSON.stringify(scannerStage)}`);
  await page.keyboard.press('Digit2');
  await page.waitForTimeout(120);
  const beforeFloraScan = await snapshot(page);
  await holdKey(page, 'Space', 2600);
  const afterFloraScan = await snapshot(page);
  if ((afterFloraScan?.state?.scannedSpecies?.length ?? 0) <= (beforeFloraScan?.state?.scannedSpecies?.length ?? 0)) fail('scanner selected primary did not scan staged flora');

  const faunaStage = await command(page, 'selectedToolSmokeStage', { mode: 'life' });
  if (!faunaStage?.ok) fail(`scanner fauna stage failed: ${JSON.stringify(faunaStage)}`);
  await page.keyboard.press('Digit2');
  const beforeFaunaScan = await snapshot(page);
  await holdKey(page, 'Space', 2600);
  const afterFaunaScan = await snapshot(page);
  if ((afterFaunaScan?.state?.scannedSpecies?.length ?? 0) <= (beforeFaunaScan?.state?.scannedSpecies?.length ?? 0)) fail('existing scanner path did not scan staged fauna');

  const drillStage = await command(page, 'selectedToolSmokeStage', { mode: 'terrain' });
  if (!drillStage?.ok) fail(`drill terrain stage failed: ${JSON.stringify(drillStage)}`);
  await page.keyboard.press('Digit1');
  const beforeDrill = await snapshot(page);
  await holdKey(page, 'Space', 2600);
  const afterDrill = await snapshot(page);
  if ((afterDrill?.looseItems?.length ?? 0) <= (beforeDrill?.looseItems?.length ?? 0)
    && (afterDrill?.gameplayOre?.visibleOreCount ?? 0) >= (beforeDrill?.gameplayOre?.visibleOreCount ?? 0)) {
    fail('existing drill/mine path did not visibly affect staged ore/terrain');
  }

  const saveStage = await command(page, 'floraSamplerSmokeStage', { mode: 'flora' });
  if (!saveStage?.ok) fail(`save flora stage failed: ${JSON.stringify(saveStage)}`);
  await holdSampler(page);
  const beforeSave = await snapshot(page);
  const saveResult = await command(page, 'saveGame');
  const loadResult = await command(page, 'loadGame');
  if (loadResult?.ok) await waitForLoadComplete(page, loadResult.loadId);
  const afterLoad = await snapshot(page);
  if (!saveResult?.ok) fail(`saveGame failed: ${JSON.stringify(saveResult)}`);
  if (!loadResult?.ok) fail(`loadGame failed: ${JSON.stringify(loadResult)}`);
  if (!afterLoad?.state?.sampledSpecies?.includes(saveStage.species)) fail(`sampled species did not round-trip save/load: ${JSON.stringify({ beforeSave: beforeSave?.state?.sampledSpecies, afterLoad: afterLoad?.state?.sampledSpecies, loadResult })}`);

  await command(page, 'floraSamplerSmokeStage', { mode: 'flora' });
  await page.keyboard.press('Digit4');
  await page.waitForTimeout(120);
  await page.locator('.tool-strip').waitFor({ timeout: 5000 });
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const toolStripText = await page.locator('.tool-strip').innerText().catch(() => '');
  if (!/Sampler/i.test(toolStripText) || !/Drill/i.test(toolStripText) || !/Scanner/i.test(toolStripText)) fail(`tool strip missing sampler/core tools: ${toolStripText}`);

  report = {
    ok: errors.length === 0,
    defaultUnlocks: snap?.state?.unlockedTools,
    firstSample: {
      species: floraStage?.species,
      scansBefore,
      scansAfter,
      samplesBefore,
      samplesAfter,
      creditsBefore,
      creditsAfter,
      cargoBefore,
      cargoAfter,
      floraDead: stagedFloraAfter?.dead,
    },
    duplicate: {
      samplesBefore: beforeDuplicate?.state?.sampledSpecies?.length,
      samplesAfter: afterDuplicate?.state?.sampledSpecies?.length,
      creditsBefore: beforeDuplicate?.state?.credits,
      creditsAfter: afterDuplicate?.state?.credits,
    },
    scanner: {
      floraBefore: beforeFloraScan?.state?.scannedSpecies?.length,
      floraAfter: afterFloraScan?.state?.scannedSpecies?.length,
      faunaBefore: beforeFaunaScan?.state?.scannedSpecies?.length,
      faunaAfter: afterFaunaScan?.state?.scannedSpecies?.length,
    },
    saveLoad: {
      saveResult,
      loadResult,
      beforeSave: beforeSave?.state?.sampledSpecies,
      afterLoad: afterLoad?.state?.sampledSpecies,
    },
    screenshotPath,
    errors,
  };
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  report = { ok: false, errors, screenshotPath };
} finally {
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close().catch(() => {});
  if (server) {
    server.kill('SIGTERM');
    await new Promise((resolveKill) => server.once('exit', resolveKill));
  }
}

if (errors.length) {
  console.error('Water9 flora sampler smoke failed:');
  console.error(JSON.stringify({ reportPath, errors, serverLogs: serverLogs.slice(-12) }, null, 2));
  process.exit(1);
}

console.log('Water9 flora sampler smoke passed.');
console.log(reportPath);

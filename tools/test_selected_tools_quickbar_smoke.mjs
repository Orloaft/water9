import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_TOOLS_OUT_DIR ?? 'runs/water9-full-loop-tools-threats-2026-07-07';
const reportPath = process.env.WATER9_TOOLS_REPORT ?? `${outDir}/tools-v1-smoke.json`;
const screenshotPath = process.env.WATER9_TOOLS_SCREENSHOT ?? `${outDir}/tools-v1-hud.png`;
const host = '127.0.0.1';
const port = Number(process.env.WATER9_TOOLS_PORT ?? 5186);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=1`;

await mkdir(outDir, { recursive: true });

let server = null;
if (!process.env.PLAYTEST_URL) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500);
    try {
      const response = await fetch(baseUrl, { method: 'HEAD', signal: controller.signal });
      if (response.ok || response.status < 500) throw new Error(`port ${port} is already serving ${baseUrl}; stop the stale dev server or set WATER9_TOOLS_PORT`);
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
  }, loadId, { timeout: 45000 });
}

async function holdKey(page, key, holdMs = 700) {
  await page.keyboard.down(key);
  await page.waitForTimeout(holdMs);
  await page.keyboard.up(key);
  await page.waitForTimeout(120);
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
  const drillStage = await command(page, 'selectedToolSmokeStage', { mode: 'life' });
  if (!drillStage?.ok) fail(`selected tool drill stage failed: ${JSON.stringify(drillStage)}`);
  let snap = await snapshot(page);
  const defaultTool = snap?.state?.selectedTool;
  const defaultUnlocks = snap?.state?.unlockedTools;
  if (defaultTool !== 'drill') fail(`default selected tool should be drill, got ${defaultTool}`);
  for (const id of ['drill', 'scanner', 'sonar', 'sampler']) {
    if (!defaultUnlocks?.[id]) fail(`${id} should be unlocked by default`);
  }
  for (const id of ['flare', 'stun', 'charge']) {
    if (defaultUnlocks?.[id]) fail(`${id} should start locked in this slice`);
  }

  const beforeDrill = await snapshot(page);
  await holdKey(page, 'Space', 650);
  const afterDrill = await snapshot(page);
  const drillCutLife = (afterDrill?.fish?.[0]?.hp ?? Infinity) < (beforeDrill?.fish?.[0]?.hp ?? -Infinity)
    || afterDrill?.fish?.[0]?.dead === true;
  if (!drillCutLife) fail('default drill primary did not cut the staged life target');

  await command(page, 'setBiome', 1);
  await page.waitForTimeout(500);
  await waitForWorld(page);
  const lifeStage = await command(page, 'selectedToolSmokeStage', { mode: 'life' });
  if (!lifeStage?.ok) fail(`selected tool life stage failed: ${JSON.stringify(lifeStage)}`);
  await page.keyboard.press('Digit2');
  snap = await snapshot(page);
  if (snap?.state?.selectedTool !== 'scanner') fail(`Digit2 should select scanner, got ${snap?.state?.selectedTool}`);
  const scansBefore = snap?.state?.scannedSpecies?.length ?? 0;
  await page.locator('#game').click({ position: { x: 640, y: 400 }, force: true });
  await page.keyboard.down('Space');
  await page.waitForFunction((previousScanCount) => {
    const scanSnap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return (scanSnap?.state?.scannedSpecies?.length ?? 0) > previousScanCount || scanSnap?.fish?.[0]?.scanned === true;
  }, scansBefore, { timeout: 8000 }).catch(() => null);
  await page.keyboard.up('Space');
  await page.waitForTimeout(120);
  const afterPrimaryScan = await snapshot(page);
  if ((afterPrimaryScan?.state?.scannedSpecies?.length ?? 0) <= scansBefore && !afterPrimaryScan?.fish?.[0]?.scanned) fail('scanner primary action did not scan a nearby life target');

  await command(page, 'selectedToolSmokeStage', { mode: 'life' });
  await page.keyboard.down('e');
  await page.waitForTimeout(320);
  const afterLegacyScanHold = await snapshot(page);
  await page.keyboard.up('e');
  await page.waitForTimeout(120);
  if (!afterLegacyScanHold?.player?.scanTarget) fail('legacy E scanner shortcut did not acquire a scan target');

  await page.keyboard.press('Digit3');
  const beforePrimarySonar = await snapshot(page);
  await holdKey(page, 'Space', 220);
  const afterPrimarySonar = await snapshot(page);
  if ((afterPrimarySonar?.ui?.sonarPings ?? 0) <= (beforePrimarySonar?.ui?.sonarPings ?? 0)) fail('sonar selected primary did not trigger a sonar ping');

  await page.waitForTimeout(1800);
  const beforeLegacySonar = await snapshot(page);
  await page.locator('#game').click({ position: { x: 640, y: 400 }, force: true });
  await holdKey(page, 'q', 180);
  const afterLegacySonar = await snapshot(page);
  if ((afterLegacySonar?.ui?.sonarPings ?? 0) <= (beforeLegacySonar?.ui?.sonarPings ?? 0)) fail('legacy Q sonar shortcut did not trigger a sonar ping');

  await page.keyboard.press('KeyG');
  await page.waitForTimeout(120);
  const afterCargoShortcut = await snapshot(page);
  if (!/cargo slot selected|No cargo|dropped from cargo|used/i.test(afterCargoShortcut?.ui?.status ?? '')) fail(`legacy G cargo shortcut did not reach selected item path: ${afterCargoShortcut?.ui?.status}`);

  await page.keyboard.press('Digit4');
  await page.waitForTimeout(120);
  const afterSamplerSelect = await snapshot(page);
  if (afterSamplerSelect?.state?.selectedTool !== 'sampler') fail(`Digit4 should select unlocked sampler, got ${afterSamplerSelect?.state?.selectedTool}`);

  const beforeLocked = await snapshot(page);
  await page.keyboard.press('Digit5');
  await page.waitForTimeout(120);
  const afterLocked = await snapshot(page);
  if (afterLocked?.state?.selectedTool !== beforeLocked?.state?.selectedTool) fail('locked flare quick-select changed selected tool');
  if (!/not fitted|Keep using/i.test(afterLocked?.ui?.status ?? '')) fail(`locked flare did not show status feedback: ${afterLocked?.ui?.status}`);

  await page.keyboard.press('Digit3');
  await page.waitForTimeout(120);
  const beforeSave = await snapshot(page);
  if (beforeSave?.state?.selectedTool !== 'sonar') fail(`Digit3 should select sonar before save, got ${beforeSave?.state?.selectedTool}`);
  const saveResult = await command(page, 'saveGame');
  await page.keyboard.press('Digit1');
  const beforeLoad = await snapshot(page);
  const loadResult = await command(page, 'loadGame');
  if (loadResult?.ok) await waitForLoadComplete(page, loadResult.loadId);
  const afterLoad = await snapshot(page);
  if (!saveResult?.ok) fail(`saveGame failed: ${JSON.stringify(saveResult)}`);
  if (!loadResult?.ok) fail(`loadGame failed: ${JSON.stringify(loadResult)}`);
  if (beforeLoad?.state?.selectedTool !== 'drill') fail('Digit1 did not select drill before load round-trip');
  if (afterLoad?.state?.selectedTool !== 'sonar') fail(`save/load did not round-trip selected sonar tool, got ${afterLoad?.state?.selectedTool}`);
  if (!afterLoad?.state?.unlockedTools?.scanner || !afterLoad?.state?.unlockedTools?.sampler) fail('save/load did not preserve expected unlocked tool defaults');

  await page.locator('.tool-strip').waitFor({ timeout: 5000 });
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const toolStripText = await page.locator('.tool-strip').innerText().catch(() => '');
  if (!/Drill/i.test(toolStripText) || !/Scanner/i.test(toolStripText) || !/Sonar/i.test(toolStripText) || !/Locked/i.test(toolStripText)) {
    fail(`tool strip did not expose expected ready/locked tools: ${toolStripText}`);
  }

  report = {
    ok: errors.length === 0,
    defaultTool,
    defaultUnlocks,
    drill: { hpBefore: beforeDrill?.fish?.[0]?.hp, hpAfter: afterDrill?.fish?.[0]?.hp, deadAfter: afterDrill?.fish?.[0]?.dead, cutLife: drillCutLife },
    scanner: { scansBefore, scansAfter: afterPrimaryScan?.state?.scannedSpecies?.length, legacyScanTarget: afterLegacyScanHold?.player?.scanTarget },
    sonar: { primaryBefore: beforePrimarySonar?.ui?.sonarPings, primaryAfter: afterPrimarySonar?.ui?.sonarPings, legacyBefore: beforeLegacySonar?.ui?.sonarPings, legacyAfter: afterLegacySonar?.ui?.sonarPings },
    cargoShortcutStatus: afterCargoShortcut?.ui?.status,
    samplerSelect: afterSamplerSelect?.state?.selectedTool,
    lockedTool: { before: beforeLocked?.state?.selectedTool, after: afterLocked?.state?.selectedTool, status: afterLocked?.ui?.status },
    saveLoad: { saveResult, loadResult, beforeLoad: beforeLoad?.state?.selectedTool, afterLoad: afterLoad?.state?.selectedTool },
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
  console.error('Water9 selected tools quickbar smoke failed:');
  console.error(JSON.stringify({ reportPath, errors, serverLogs: serverLogs.slice(-12) }, null, 2));
  process.exit(1);
}

console.log('Water9 selected tools quickbar smoke passed.');
console.log(reportPath);

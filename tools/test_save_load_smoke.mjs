import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_SAVE_LOAD_OUT_DIR ?? '/home/orlovboros/projects/manager/runs';
const reportPath = process.env.WATER9_SAVE_LOAD_REPORT ?? `${outDir}/water9-save-load-smoke-2026-06-28.json`;
const host = '127.0.0.1';
const port = Number(process.env.WATER9_SAVE_LOAD_PORT ?? 5192);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=2`;

await mkdir(outDir, { recursive: true });

let server = null;
if (!process.env.PLAYTEST_URL) {
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

function fail(message) {
  errors.push({ type: 'assertion', text: message });
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
  }, null, { timeout: 20000 });
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
  await command(page, 'setCredits', 4321);
  await command(page, 'maxUpgrades');
  await command(page, 'buySub', 2);
  await command(page, 'dive');
  await command(page, 'teleportDepth', 720);
  await command(page, 'terrainMineAt', { repeats: 4 });
  const beforeSave = await snapshot(page);
  const saveResult = await command(page, 'saveGame');
  await command(page, 'setCredits', 7);
  await command(page, 'setOxygen', 11);
  const mutated = await snapshot(page);
  const loadResult = await command(page, 'loadGame');
  await waitForWorld(page);
  const afterLoad = await snapshot(page);
  await command(page, 'corruptSave');
  const corruptLoad = await command(page, 'loadGame');
  const afterCorrupt = await snapshot(page);
  await command(page, 'clearSave');

  if (!saveResult?.ok) fail('save command did not report success');
  if (!loadResult?.ok) fail('load command did not report success');
  if (beforeSave?.state?.credits !== afterLoad?.state?.credits) fail(`credits did not round-trip: ${beforeSave?.state?.credits} -> ${afterLoad?.state?.credits}`);
  if (beforeSave?.state?.biome !== afterLoad?.state?.biome) fail(`biome did not round-trip: ${beforeSave?.state?.biome} -> ${afterLoad?.state?.biome}`);
  if (beforeSave?.state?.selectedSubTier !== afterLoad?.state?.selectedSubTier) fail('selected sub tier did not round-trip');
  if (beforeSave?.state?.cargoCapacity !== afterLoad?.state?.cargoCapacity) fail('upgrade-derived cargo capacity did not round-trip');
  if (Math.abs((beforeSave?.player?.y ?? 0) - (afterLoad?.player?.y ?? 0)) > 2) fail('player depth/position did not round-trip');
  if (corruptLoad?.ok !== false) fail('corrupt save load should fail gracefully');
  if (!String(afterCorrupt?.ui?.status ?? '').toLowerCase().includes('corrupt')) fail('corrupt save did not set a clear status message');

  report = {
    ok: errors.length === 0,
    saveResult,
    loadResult,
    corruptLoad,
    beforeSave: {
      credits: beforeSave?.state?.credits,
      biome: beforeSave?.state?.biome,
      player: beforeSave?.player,
      cargoCapacity: beforeSave?.state?.cargoCapacity,
      selectedSubTier: beforeSave?.state?.selectedSubTier,
    },
    mutated: {
      credits: mutated?.state?.credits,
      oxygen: mutated?.state?.oxygen,
    },
    afterLoad: {
      credits: afterLoad?.state?.credits,
      biome: afterLoad?.state?.biome,
      player: afterLoad?.player,
      cargoCapacity: afterLoad?.state?.cargoCapacity,
      selectedSubTier: afterLoad?.state?.selectedSubTier,
    },
    afterCorruptStatus: afterCorrupt?.ui?.status ?? null,
  };
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  report = { ...report, errors, serverLogs: serverLogs.slice(-20) };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
  if (server) server.kill('SIGTERM');
}

if (errors.length) {
  console.error('Water9 save/load smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 save/load smoke passed.');
console.log(`Report: ${reportPath}`);

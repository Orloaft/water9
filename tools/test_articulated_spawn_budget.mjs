import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_SPAWN_BUDGET_OUT_DIR ?? '/home/orlovboros/projects/manager/runs';
const reportPath = process.env.WATER9_SPAWN_BUDGET_REPORT ?? `${outDir}/water9-articulated-spawn-budget-smoke-2026-06-28.json`;
const host = '127.0.0.1';
const port = Number(process.env.WATER9_SPAWN_BUDGET_PORT ?? 5193);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=1`;

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

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitForServer(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null) throw new Error(`dev server exited before ready with code ${server.exitCode}`);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite may still be binding the port.
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

async function waitForBiomeReady(page, biome) {
  await page.waitForFunction((expectedBiome) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(
      snap?.world
      && snap.world.ready !== false
      && snap.state?.biome === expectedBiome
      && snap.ui?.biomeLoading?.phase !== 'staging'
      && snap.ui?.biomeLoading?.phase !== 'generating',
    );
  }, biome, { timeout: 25000 });
}

function fail(message) {
  errors.push({ type: 'assertion', text: message });
}

if (server) await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
    errors.push({ type: 'console', text: message.text() });
  }
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
});

const biomeResults = [];
const TILE = 24;
try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await waitForBiomeReady(page, 1);

  for (const biome of [1, 2, 3, 4]) {
    if (biome !== 1) await command(page, 'setBiome', biome);
    await waitForBiomeReady(page, biome);
    const snap = await snapshot(page);
    const count = snap?.world?.entities?.articulated ?? -1;
    const budget = snap?.articulatedManifest?.spawnBudget ?? -1;
    const ids = (snap?.articulatedCreatures ?? []).map((creature) => creature.id);
    const bobbitBurrows = snap?.bobbitBurrows ?? [];
    const bobbitCreatures = (snap?.articulatedCreatures ?? []).filter((creature) => creature.id === 'abyssal-mandible-bobbit');
    const signatures = ids.filter((id) => ['abyssal-mandible-bobbit', 'abyssal-gulper', 'abyssal-reliquary-wyrm', 'abyssal-glasshook-skulk', 'abyssal-crownmaw'].includes(id));
    biomeResults.push({ biome, count, budget, ids, signatures, bobbitBurrows });
    if (snap?.articulatedManifest?.prototypeRuntime !== true) fail(`biome ${biome}: prototype runtime flag was not true`);
    if (!(budget >= 8 && budget <= 10)) fail(`biome ${biome}: expected prototype budget 8-10, got ${budget}`);
    if (count > budget) fail(`biome ${biome}: articulated count ${count} exceeded budget ${budget}`);
    if ((snap?.articulatedCreatures ?? []).length !== count) fail(`biome ${biome}: snapshot count disagrees with world count`);
    if (biome >= 2 && !ids.includes('abyssal-mandible-bobbit')) fail(`biome ${biome}: bobbit signature was not preserved`);
    if (biome >= 2) {
      if (bobbitBurrows.length <= 0) fail(`biome ${biome}: no bobbit burrow reservation was generated`);
      if (bobbitCreatures.length !== bobbitBurrows.length) fail(`biome ${biome}: bobbit creature count ${bobbitCreatures.length} did not match burrows ${bobbitBurrows.length}`);
      for (const burrow of bobbitBurrows) {
        const shaftDepth = burrow.shaft?.bottomY - burrow.shaft?.topY;
        const anchorDrop = burrow.shaft?.anchorY - burrow.shaft?.topY;
        if (!(shaftDepth >= TILE * 16)) fail(`biome ${biome}: bobbit shaft was too shallow: ${shaftDepth}`);
        if (!(anchorDrop >= TILE * 15)) fail(`biome ${biome}: bobbit anchor was not deep below shaft top: ${anchorDrop}`);
        if (!(burrow.approach?.y <= burrow.shaft?.topY - TILE * 2)) fail(`biome ${biome}: bobbit approach was not above the shaft top`);
        if (!(burrow.approach?.y <= burrow.shaft?.anchorY - TILE * 15)) fail(`biome ${biome}: bobbit approach was too close to the deep anchor`);
      }
    }
    if (biome >= 3 && !ids.includes('abyssal-gulper')) fail(`biome ${biome}: gulper signature was not preserved`);
    if (biome >= 4 && !ids.includes('abyssal-reliquary-wyrm')) fail(`biome ${biome}: reliquary wyrm signature was not preserved`);
  }
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  await writeFile(reportPath, `${JSON.stringify({ ok: errors.length === 0, biomeResults, errors, serverLogs: serverLogs.slice(-20) }, null, 2)}\n`);
  await browser.close();
  if (server) server.kill('SIGTERM');
}

if (errors.length) {
  console.error('Water9 articulated spawn budget smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 articulated spawn budget smoke passed.');
console.log(`Report: ${reportPath}`);

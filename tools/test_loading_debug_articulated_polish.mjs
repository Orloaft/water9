import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_POLISH_OUT_DIR ?? '/home/orlovboros/projects/manager/runs';
const reportPath = process.env.WATER9_POLISH_REPORT ?? `${outDir}/water9-loading-debug-articulated-polish-smoke-2026-06-28.json`;
const host = '127.0.0.1';
const port = Number(process.env.WATER9_POLISH_PORT ?? 5192);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=3&perf=1`;

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

function fail(message) {
  errors.push({ type: 'assertion', text: message });
}

async function command(page, name, value) {
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null, [name, value]);
}

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function waitForPlaytest(page) {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false);
  }, null, { timeout: 15000 });
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
  }, biome, { timeout: 20000 });
}

async function loadingState(page) {
  return page.evaluate(() => {
    const overlay = document.querySelector('#biome-loading');
    return {
      exists: Boolean(overlay),
      open: overlay?.classList.contains('is-open') ?? false,
      phase: overlay?.getAttribute('data-phase') ?? null,
      biome: overlay?.getAttribute('data-biome') ?? null,
      progress: Number(overlay?.getAttribute('data-progress') ?? 0),
      text: overlay?.textContent ?? '',
    };
  });
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

let report = {};
try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => document.querySelector('#biome-loading')?.classList.contains('is-open'), null, { timeout: 8000 });
  const initialLoading = await loadingState(page);
  await waitForPlaytest(page);

  await command(page, 'setBiome', 4);
  await page.waitForFunction(() => {
    const overlay = document.querySelector('#biome-loading');
    return overlay?.classList.contains('is-open') && overlay.getAttribute('data-biome') === '4';
  }, null, { timeout: 8000 });
  const biomeTransitionLoading = await loadingState(page);
  await waitForBiomeReady(page, 4);
  const loaded = await snapshot(page);

  await page.waitForFunction(() => Boolean(document.querySelector('#perf-hud [data-perf-hud-toggle]')), null, { timeout: 8000 });
  const perfExpanded = await page.evaluate(() => ({
    collapsed: document.querySelector('#perf-hud')?.getAttribute('data-collapsed'),
    text: document.querySelector('#perf-hud')?.textContent ?? '',
    hidden: document.querySelector('[data-perf-hud-body]')?.hidden ?? null,
  }));
  await page.click('#perf-hud [data-perf-hud-toggle]');
  await page.waitForFunction(() => document.querySelector('#perf-hud')?.getAttribute('data-collapsed') === 'true', null, { timeout: 4000 });
  const perfCollapsed = await page.evaluate(() => ({
    collapsed: document.querySelector('#perf-hud')?.getAttribute('data-collapsed'),
    text: document.querySelector('#perf-hud')?.textContent ?? '',
    hidden: document.querySelector('[data-perf-hud-body]')?.hidden ?? null,
  }));
  await page.click('#perf-hud [data-perf-hud-toggle]');
  await page.waitForFunction(() => document.querySelector('#perf-hud')?.getAttribute('data-collapsed') === 'false', null, { timeout: 4000 });
  const perfReexpanded = await page.evaluate(() => ({
    collapsed: document.querySelector('#perf-hud')?.getAttribute('data-collapsed'),
    text: document.querySelector('#perf-hud')?.textContent ?? '',
    hidden: document.querySelector('[data-perf-hud-body]')?.hidden ?? null,
  }));

  const contact = await command(page, 'articulatedContactPolishReview');

  if (!initialLoading.open || !initialLoading.text.includes('Depth transition')) fail('initial biome loading overlay did not appear');
  if (!biomeTransitionLoading.open || biomeTransitionLoading.biome !== '4') fail('biome transition loading overlay did not appear for biome 4');
  if (loaded?.state?.biome !== 4) fail(`biome transition did not finish in biome 4, got ${loaded?.state?.biome}`);
  if (!loaded?.perf?.metrics?.['worldgen.total']?.samples || loaded.perf.metrics['worldgen.total'].context?.biome !== 4) fail('worldgen.total perf metric did not record for biome 4');
  if (perfExpanded.collapsed !== 'false' || !perfExpanded.text.includes('perf') || perfExpanded.hidden) fail('expanded perf HUD is not readable/detectable');
  if (perfCollapsed.collapsed !== 'true' || !perfCollapsed.hidden) fail('collapsed perf HUD state is not detectable');
  if (perfReexpanded.collapsed !== 'false' || perfReexpanded.hidden) fail('perf HUD did not re-expand');
  if (!contact?.dangerousPartIsDangerous || !(contact?.dangerousDamage > 0)) fail('dangerous articulated part did not damage');
  if (contact?.nonDangerousPartIsDangerous || contact?.nonDangerousDamage !== 0) fail('non-dangerous articulated part overlap caused damage');
  if (!(contact?.repeatedDisplacement >= 0) || contact.repeatedDisplacement > 96) fail(`repeated articulated contact displacement was too large: ${contact?.repeatedDisplacement}`);

  report = {
    ok: errors.length === 0,
    initialLoading,
    biomeTransitionLoading,
    loadedLoading: loaded?.ui?.biomeLoading ?? null,
    perfExpanded,
    perfCollapsed,
    perfReexpanded,
    contact,
    worldgenMetric: loaded?.perf?.metrics?.['worldgen.total'] ?? null,
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
  console.error('Water9 loading/debug/articulated polish smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 loading/debug/articulated polish smoke passed.');
console.log(`Report: ${reportPath}`);

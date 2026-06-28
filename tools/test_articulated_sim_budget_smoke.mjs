import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_ARTICULATED_BUDGET_OUT_DIR ?? '/home/orlovboros/projects/manager/runs';
const reportPath = process.env.WATER9_ARTICULATED_BUDGET_REPORT ?? `${outDir}/water9-articulated-sim-budget-smoke-2026-06-28.json`;
const host = '127.0.0.1';
const port = Number(process.env.WATER9_ARTICULATED_BUDGET_PORT ?? 5195);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=4&perf=1`;

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

async function waitForWorld(page) {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false);
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
  const result = await command(page, 'articulatedBudgetReview');
  if (!result?.visible || !result?.offscreen) fail('budget review did not return visible/offscreen creature data');
  if ((result?.visible?.skippedSteps ?? 1) !== 0) fail(`visible creature skipped full simulation steps: ${result?.visible?.skippedSteps}`);
  if ((result?.visible?.fullSteps ?? 0) < 55) fail(`visible creature did not stay full-rate: ${result?.visible?.fullSteps} full steps`);
  if ((result?.offscreen?.skippedSteps ?? 0) < 35) fail(`offscreen creature was not throttled enough: ${result?.offscreen?.skippedSteps} skipped steps`);
  if ((result?.offscreen?.fullSteps ?? 0) > 14) fail(`offscreen creature ran too many full steps: ${result?.offscreen?.fullSteps}`);
  if (result?.offscreen?.tier !== 'offscreen') fail(`offscreen creature ended in ${result?.offscreen?.tier} tier`);

  report = {
    ok: errors.length === 0,
    result,
    expected: {
      visible: 'full-rate, zero skipped steps',
      offscreen: 'bounded coarse motion with most full articulated work skipped',
    },
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
  console.error('Water9 articulated sim budget smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 articulated sim budget smoke passed.');
console.log(`Report: ${reportPath}`);

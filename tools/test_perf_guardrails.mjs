import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import {
  assertSteadyGameplayCadence,
  finishCadenceProbe,
  installBrowserPerfObservers,
  startCadenceProbe,
} from './perf_assertions.mjs';

const outDir = process.env.PERF_GUARDRAIL_OUT_DIR ?? '/home/orlovboros/projects/manager/runs';
const reportPath = process.env.PERF_GUARDRAIL_REPORT ?? `${outDir}/water9-perf-guardrails-smoke-2026-06-28.json`;
const host = '127.0.0.1';
const port = Number(process.env.PERF_GUARDRAIL_PORT ?? 5191);
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

if (server) await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await installBrowserPerfObservers(page);

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
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 25000 });
  await waitForPlaytest(page);
  await command(page, 'terrainMiningReview', { stage: 'intact' });
  const before = await snapshot(page);
  const startRefresh = before?.perf?.propRefresh?.processed ?? 0;
  const startFullScans = before?.perf?.propRefresh?.fullScans ?? 0;

  await command(page, 'resetPerfFrameBuffer');
  await startCadenceProbe(page, 'perf-guardrails-mining');
  await command(page, 'terrainMineAt', { repeats: 10 });
  await page.waitForTimeout(4200);
  const cadenceProbe = await finishCadenceProbe(page);
  const mined = await snapshot(page);
  const guardrail = await command(page, 'perfGuardrailReview');
  const after = await snapshot(page);

  const processed = guardrail?.localPropRefreshes ?? ((after?.perf?.propRefresh?.processed ?? 0) - startRefresh);
  const fullScans = guardrail?.fullScansDuringLocalRefresh ?? ((after?.perf?.propRefresh?.fullScans ?? 0) - startFullScans);
  const metrics = after?.perf?.metrics ?? {};
  const hasHud = await page.evaluate(() => Boolean(document.querySelector('#perf-hud')?.textContent?.includes('perf')));

  if (!after?.perf?.enabled) fail('perf telemetry is not enabled in playtest/perf mode');
  if (!hasHud) fail('perf HUD did not render');
  for (const key of ['frame.total', 'update.total', 'draw.total', 'draw.world', 'update.fish', 'update.articulated', 'draw.sub']) {
    if (!metrics[key]?.samples) fail(`perf metric ${key} did not record samples`);
  }
  if (fullScans !== 0) fail(`local repeated tile refresh triggered ${fullScans} full environment prop scans`);
  if (processed < 8) fail(`queued local environment prop refresh processed ${processed}, expected at least 8 queued broken-tile refreshes`);
  if ((after?.perf?.terrainMaskMutations ?? 0) <= (before?.perf?.terrainMaskMutations ?? 0)) fail('terrain mask mutation counter did not increase');
  if (!guardrail?.articulatedContact?.count) fail('articulated mask-aware terrain contact did not register');
  if (!guardrail?.subCollision) fail('submarine mask-aware terrain collision did not register');
  if ((guardrail?.perf?.terrainContactSamples ?? 0) <= 0) fail('shared terrain contact sample counter did not increase');
  assertSteadyGameplayCadence({
    label: 'perf guardrails mining',
    independentRaf: cadenceProbe?.independentRaf ?? null,
    perf: after?.perf,
    longTasks: cadenceProbe?.longTasks ?? [],
    errors,
  });

  report = {
    ok: errors.length === 0,
    processedLocalRefreshes: processed,
    fullScansDuringRepeatedMining: fullScans,
    guardrail,
    cadenceProbe: cadenceProbe ? { label: cadenceProbe.label, durationMs: cadenceProbe.durationMs } : null,
    independentRaf: cadenceProbe?.independentRaf ?? null,
    minedPerf: mined?.perf ?? null,
    finalPerf: after?.perf ?? null,
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
  console.error('Water9 perf guardrails smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 perf guardrails smoke passed.');
console.log(`Report: ${reportPath}`);

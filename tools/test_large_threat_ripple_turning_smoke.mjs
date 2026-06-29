import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_RIPPLE_TURN_OUT_DIR ?? '/home/orlovboros/projects/manager/runs';
const reportPath = process.env.WATER9_RIPPLE_TURN_REPORT ?? `${outDir}/water9-large-threat-ripple-turning-smoke-2026-06-29.json`;
const host = '127.0.0.1';
const port = Number(process.env.WATER9_RIPPLE_TURN_PORT ?? 5196);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=4&prototypeThreats=1`;

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

function signsFor(snapshot) {
  return Object.values(snapshot?.scaleYByPart ?? {}).filter((value) => value !== 0).map((value) => Math.sign(value));
}

function uniqueSigns(snapshot) {
  return new Set(signsFor(snapshot));
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
  const result = await command(page, 'largeThreatRippleTurnReview');
  const snapshots = result?.snapshots ?? [];
  const initial = snapshots.find((snapshot) => snapshot.label === 'initial');
  const afterCross = snapshots.find((snapshot) => snapshot.label === 'after-cross');
  const bounded = snapshots.find((snapshot) => snapshot.label === 'bounded-history');

  if (!result?.usesRippleTurning) fail(`selected threat did not use ripple turning: ${result?.id ?? 'missing'}`);
  if ((result?.minBiome ?? 99) > 4) fail(`selected threat ${result?.id ?? 'missing'} is not present in biome 4`);
  if (!result?.smallFishUsesLegacyFacing) fail('small fish appear to be routed through articulated turn runtime');
  if (!initial || !afterCross || !bounded) fail('turn review did not return all expected snapshots');
  if ((bounded?.historySamples ?? 0) > 96) fail(`history buffer exceeded cap: ${bounded?.historySamples}`);
  if ((bounded?.historySamples ?? 0) < 12) fail(`history buffer did not accumulate enough samples: ${bounded?.historySamples}`);

  const initialSigns = uniqueSigns(initial);
  const mixedRippleSnapshot = snapshots.find((snapshot) => uniqueSigns(snapshot).size >= 2);
  const afterSigns = uniqueSigns(mixedRippleSnapshot);
  if (initialSigns.size !== 1) fail(`initial side signs were not coherent: ${[...initialSigns].join(',')}`);
  if (afterSigns.size < 2) fail('mirror side did not ripple; every segment flipped together or no segment changed');
  if (Math.abs(afterCross?.angularVelocity ?? 99) > 1.7) fail(`large threat angular velocity was not mass limited: ${afterCross?.angularVelocity}`);
  if (Math.abs((afterCross?.heading ?? 0) - (initial?.heading ?? 0)) < 0.15) fail('large threat heading did not rotate through the turn');

  report = {
    ok: errors.length === 0,
    result,
    expected: {
      threat: 'large B3/B4 articulated threat',
      turn: 'bounded angular velocity, mixed scaleY signs during delayed ripple',
      smallFish: 'no articulated turn runtime on fish',
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
  console.error('Water9 large threat ripple turning smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 large threat ripple turning smoke passed.');
console.log(`Report: ${reportPath}`);

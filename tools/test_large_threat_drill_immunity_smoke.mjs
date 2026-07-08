import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_THREATS_OUT_DIR ?? 'runs/water9-full-loop-tools-threats-2026-07-07';
const reportPath = process.env.WATER9_THREATS_REPORT ?? `${outDir}/threats-v1-smoke.json`;
const host = '127.0.0.1';
const port = Number(process.env.WATER9_THREATS_PORT ?? 5189);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=4`;

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
  const result = await command(page, 'largeThreatDrillImmunityReview', { creatureId: 'abyssal-crownmaw' });

  if (!result?.ok) fail(`review command failed: ${result?.reason ?? 'missing-result'}`);
  const large = result?.largeThreat;
  const normal = result?.normalFauna;
  if (!large?.classified) fail(`${large?.id ?? 'large threat'} was not classified as a large threat`);
  if (large?.cutter?.after?.hp !== large?.cutter?.before?.hp) fail(`cutter changed large-threat HP: ${large?.cutter?.before?.hp} -> ${large?.cutter?.after?.hp}`);
  if (large?.cutter?.after?.partHp !== large?.cutter?.before?.partHp) fail(`cutter changed large-threat part HP: ${large?.cutter?.before?.partHp} -> ${large?.cutter?.after?.partHp}`);
  if (!String(large?.cutter?.after?.status ?? '').includes('armored hide')) fail(`large-threat cutter feedback did not mention armored hide: ${large?.cutter?.after?.status ?? ''}`);
  if (!(large?.stun?.stunned > 0)) fail(`stun did not apply to large threat: ${large?.stun?.stunned}`);
  if (!(large?.dynamite?.after?.hp < large?.dynamite?.before?.hp)) fail(`dynamite did not damage large threat under explicit blast rule: ${large?.dynamite?.before?.hp} -> ${large?.dynamite?.after?.hp}`);
  if (large?.dynamite?.largeThreatDamageMultiplier !== 1) fail(`large-threat dynamite multiplier expected 1, got ${large?.dynamite?.largeThreatDamageMultiplier}`);
  if (!(normal?.cutter?.after?.hp < normal?.cutter?.before?.hp)) fail(`normal fauna did not take cutter damage: ${normal?.cutter?.before?.hp} -> ${normal?.cutter?.after?.hp}`);

  report = {
    ok: errors.length === 0,
    result,
    expected: {
      largeThreatCutter: 'no HP or part HP loss, armored-hide feedback',
      normalFaunaCutter: 'HP loss still occurs',
      largeThreatStun: 'stunned timer becomes positive',
      largeThreatDynamite: 'explicit blast rule remains damage multiplier 1 and deals HP damage',
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
  console.error('Water9 large threat drill immunity smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 large threat drill immunity smoke passed.');
console.log(`Report: ${reportPath}`);

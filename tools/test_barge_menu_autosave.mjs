import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_BARGE_MENU_AUTOSAVE_OUT_DIR
  ?? '/mnt/nxt-dev/water9/runs/barge-menu-autosave-2026-07-13';
const reportPath = process.env.WATER9_BARGE_MENU_AUTOSAVE_REPORT
  ?? `${outDir}/autosave-smoke.json`;
const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_BARGE_MENU_AUTOSAVE_PORT ?? 5193);
const saveKey = 'water9.save.v1';

await mkdir(outDir, { recursive: true });

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function canBind(port) {
  return new Promise((resolveBind) => {
    const probe = createServer();
    probe.once('error', () => resolveBind(false));
    probe.once('listening', () => probe.close(() => resolveBind(true)));
    probe.listen(port, host);
  });
}

async function findOpenPort(start) {
  for (let candidate = Math.max(5180, start); candidate <= 5199; candidate += 1) {
    if (await canBind(candidate)) return candidate;
  }
  throw new Error('No open dev server port in required range 5180-5199');
}

const errors = [];
const serverLogs = [];
const port = process.env.PLAYTEST_URL ? requestedPort : await findOpenPort(requestedPort);
const serverUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=1`;
const server = process.env.PLAYTEST_URL
  ? null
  : spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

server?.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server?.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

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

function fail(message) {
  errors.push({ type: 'assertion', text: message });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) errors.push({ type: 'console', text: message.text() });
});

let report = {};
try {
  if (server) await waitForServer(serverUrl);
  await page.goto(process.env.PLAYTEST_URL ?? serverUrl, { waitUntil: 'networkidle', timeout: 25000 });
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false && !snap.ui?.biomeLoading?.active);
  }, null, { timeout: 25000 });

  await command(page, 'clearSave');
  await page.evaluate((key) => {
    const originalSetItem = Storage.prototype.setItem;
    let writes = 0;
    Storage.prototype.setItem = function patchedSetItem(storageKey, value) {
      if (storageKey === key) writes += 1;
      return originalSetItem.call(this, storageKey, value);
    };
    window.__bargeMenuAutosaveProbe = {
      writes: () => writes,
      raw: () => window.localStorage.getItem(key),
    };
  }, saveKey);

  await command(page, 'start');
  const startupWrites = await page.evaluate(() => window.__bargeMenuAutosaveProbe.writes());
  await command(page, 'clearProofOverlays');
  await command(page, 'dive');
  await command(page, 'setCredits', 4242);
  await command(page, 'dock');
  const firstRaw = await page.evaluate(() => window.__bargeMenuAutosaveProbe.raw());
  const firstSave = firstRaw ? JSON.parse(firstRaw) : null;
  const firstWrites = await page.evaluate(() => window.__bargeMenuAutosaveProbe.writes());
  const firstDock = await snapshot(page);

  await command(page, 'tickSystems', 1);
  await command(page, 'tickSystems', 1);
  const afterTicksWrites = await page.evaluate(() => window.__bargeMenuAutosaveProbe.writes());

  await command(page, 'setCredits', 7);
  const loadResult = await command(page, 'loadGame');
  await page.waitForFunction((loadId) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(
      snap?.world
      && snap.world.ready !== false
      && !snap.ui?.biomeLoading?.active
      && snap.state?.saveLoad?.phase === 'complete'
      && snap.state?.saveLoad?.completedId >= loadId
    );
  }, loadResult?.loadId ?? 0, { timeout: 25000 });
  const loaded = await snapshot(page);
  const afterLoadRaw = await page.evaluate(() => window.__bargeMenuAutosaveProbe.raw());
  const afterLoadWrites = await page.evaluate(() => window.__bargeMenuAutosaveProbe.writes());

  await command(page, 'dive');
  await command(page, 'setCredits', 7331);
  await command(page, 'dock');
  const secondRaw = await page.evaluate(() => window.__bargeMenuAutosaveProbe.raw());
  const secondSave = secondRaw ? JSON.parse(secondRaw) : null;
  const secondWrites = await page.evaluate(() => window.__bargeMenuAutosaveProbe.writes());

  if (startupWrites !== 0) fail(`startup unexpectedly wrote ${startupWrites} save(s)`);
  if (firstWrites !== 1) fail(`first barge-menu opening wrote ${firstWrites} save(s), expected 1`);
  if (firstSave?.state?.credits !== 4242) fail(`first autosave credits were ${firstSave?.state?.credits}, expected 4242`);
  if (!firstDock?.state?.docked || !firstDock?.state?.atBoat) fail('first docking did not enter the barge-menu state');
  if (afterTicksWrites !== 1) fail(`docked update activity wrote ${afterTicksWrites} save(s), expected 1`);
  if (!loadResult?.ok) fail('autosave load did not report success');
  if (loaded?.state?.credits !== 4242) fail(`autosave load restored ${loaded?.state?.credits} credits, expected 4242`);
  if (afterLoadRaw !== firstRaw) fail('load/startup flow rewrote the autosave slot');
  if (afterLoadWrites !== 1) fail(`load/startup flow wrote ${afterLoadWrites} save(s), expected 1`);
  if (secondWrites !== 2) fail(`second legitimate barge-menu opening wrote ${secondWrites} save(s), expected 2`);
  if (secondSave?.state?.credits !== 7331) fail(`second autosave credits were ${secondSave?.state?.credits}, expected 7331`);

  report = {
    ok: errors.length === 0,
    startupWrites,
    firstOpening: { writes: firstWrites, credits: firstSave?.state?.credits, docked: firstDock?.state?.docked, atBoat: firstDock?.state?.atBoat },
    afterDockedUpdates: { writes: afterTicksWrites },
    restore: { loadResult, credits: loaded?.state?.credits, writes: afterLoadWrites, slotUnchanged: afterLoadRaw === firstRaw },
    secondOpening: { writes: secondWrites, credits: secondSave?.state?.credits },
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
  console.error('Water9 barge-menu autosave smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 barge-menu autosave smoke passed.');
console.log(`Report: ${reportPath}`);

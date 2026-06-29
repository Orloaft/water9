import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_FORWARD_OUTPOST_OUT_DIR ?? '/home/orlovboros/projects/manager/runs';
const reportPath = process.env.WATER9_FORWARD_OUTPOST_REPORT ?? `${outDir}/water9-forward-outpost-quest-smoke-2026-06-29.json`;
const host = '127.0.0.1';
const port = Number(process.env.WATER9_FORWARD_OUTPOST_PORT ?? 5198);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=3`;

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

  const initial = await snapshot(page);
  const quest = initial?.state?.questBoard?.find((entry) => entry.kind === 'forwardOutpost');
  if (!quest) fail('Biome 3 forward outpost quest was not present on the quest board');

  const invalidPlacement = await command(page, 'establishForwardOutpost');
  if (invalidPlacement?.ok !== false) fail('outpost placement without active quest should fail');

  const acceptResult = await command(page, 'acceptForwardOutpostQuest');
  await command(page, 'dive');
  const invalidAfterAccept = await command(page, 'establishForwardOutpost');
  if (invalidAfterAccept?.ok !== false) fail('outpost placement in invalid shallow/non-flora conditions should fail');

  const staged = await command(page, 'stageForwardOutpostSite', 980);
  const establishResult = await command(page, 'establishForwardOutpost');
  const afterEstablish = await snapshot(page);
  const activeQuest = afterEstablish?.state?.questBoard?.find((entry) => entry.id === afterEstablish?.state?.activeQuestId);

  await command(page, 'setOxygen', 40);
  await command(page, 'tickSystems', 1.2);
  const afterRefill = await snapshot(page);
  const saveResult = await command(page, 'saveGame');
  const beforeLoad = await snapshot(page);
  const loadResult = await command(page, 'loadGame');
  await waitForLoadComplete(page, loadResult?.loadId ?? 0);
  const afterLoad = await snapshot(page);
  await command(page, 'clearSave');

  if (!acceptResult?.ok) fail(`accept forward outpost quest failed: ${acceptResult?.reason ?? 'unknown'}`);
  if (!staged?.ok) fail('failed to stage a deterministic forward outpost site');
  if (!establishResult?.ok) fail(`valid forward outpost placement failed: ${establishResult?.reason ?? 'unknown'}`);
  if (!afterEstablish?.state?.forwardOutpost?.active) fail('forward outpost state was not active after placement');
  if (!activeQuest?.completed) fail('forward outpost quest did not complete after valid placement');
  if ((afterRefill?.state?.oxygen ?? 0) <= 40) fail('forward outpost did not refill oxygen inside its radius');
  if (!saveResult?.ok) fail('save after establishing outpost failed');
  if (!loadResult?.ok) fail('load after establishing outpost failed');
  if (!afterLoad?.state?.forwardOutpost?.active) fail('forward outpost did not persist through load');
  if (afterLoad?.state?.forwardOutpost?.depth !== beforeLoad?.state?.forwardOutpost?.depth) fail('forward outpost depth changed across save/load');

  report = {
    ok: errors.length === 0,
    quest: quest ? { id: quest.id, title: quest.title, kind: quest.kind } : null,
    invalidPlacement,
    invalidAfterAccept,
    acceptResult,
    staged,
    establishResult,
    afterEstablish: {
      outpost: afterEstablish?.state?.forwardOutpost ?? null,
      activeQuest,
    },
    afterRefill: {
      oxygen: afterRefill?.state?.oxygen ?? null,
      outpostCharge: afterRefill?.state?.forwardOutpost?.charge ?? null,
    },
    saveResult,
    loadResult,
    afterLoad: {
      outpost: afterLoad?.state?.forwardOutpost ?? null,
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
  console.error('Water9 forward outpost quest smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 forward outpost quest smoke passed.');
console.log(`Report: ${reportPath}`);

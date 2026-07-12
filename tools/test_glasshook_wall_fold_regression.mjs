import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_GLASSHOOK_WALL_OUT_DIR
  ?? 'runs/glasshook-wall-fold-fix-2026-07-12';
const reportPath = process.env.WATER9_GLASSHOOK_WALL_REPORT
  ?? `${outDir}/glasshook-wall-fold-regression.json`;
const host = '127.0.0.1';
const port = Number(process.env.WATER9_GLASSHOOK_WALL_PORT ?? 5197);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=1`;
const capture = process.env.WATER9_GLASSHOOK_WALL_CAPTURE === '1';

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

async function writeCanvas(page, path, grayscale = false) {
  if (grayscale) await page.evaluate(() => { document.documentElement.style.filter = 'grayscale(1)'; });
  const client = await page.context().newCDPSession(page);
  const screenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: false });
  await client.detach();
  await writeFile(path, Buffer.from(screenshot.data, 'base64'));
  if (grayscale) await page.evaluate(() => { document.documentElement.style.filter = ''; });
}

if (server) await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: true });
async function preparePage() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) errors.push({ type: 'console', text: message.text() });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false && snap?.state?.biome === 1);
  }, { timeout: 25000 });
  return page;
}

const results = [];
const proof = {
  captureRequested: capture,
  rightWall: `${outDir}/after-right-wall.png`,
  leftWall: `${outDir}/after-left-wall.png`,
  corner: `${outDir}/after-corner.png`,
  grayscale: `${outDir}/after-right-wall-grayscale.png`,
};

try {
  for (const scenario of ['right-wall', 'left-wall', 'corner']) {
    const page = await preparePage();
    const result = await command(page, 'glasshookWallFoldReview', { scenario, frames: 120 });
    const creature = result?.snapshot?.articulatedCreatures?.find((candidate) => candidate.id === 'abyssal-glasshook-skulk');
    const frames = result?.samples ?? [];
    const contactFrames = frames.filter((frame) => frame.terrainContacts?.length > 0);
    if (!result?.ok) fail(`${scenario}: review command did not succeed`);
    if (result?.biome !== 1) fail(`${scenario}: expected Biome 1, got ${result?.biome}`);
    if (creature?.turn) fail(`${scenario}: Glasshook still uses the history-ripple turn runtime`);
    if (!contactFrames.length) fail(`${scenario}: no terrain contact was recorded at the staged constraint`);
    for (const frame of frames) {
      if ((frame.reversedBends ?? 99) > 0) fail(`${scenario} ${frame.label}: reversed body bend ${frame.reversedBends}`);
      if ((frame.maxNonNeighborOverlap ?? 99) > 0.08) fail(`${scenario} ${frame.label}: non-neighbor overlap ${frame.maxNonNeighborOverlap}`);
      if ((frame.maxJointError ?? 99) > 0.75) fail(`${scenario} ${frame.label}: joint error ${frame.maxJointError}`);
      if ((frame.minChainDot ?? -99) < 0.7) fail(`${scenario} ${frame.label}: chain ordering dot ${frame.minChainDot}`);
    }
    results.push({
      scenario,
      result: {
        ok: result.ok,
        biome: result.biome,
        wall: result.wall,
        samples: frames,
        worst: result.worst,
        runtime: creature ? {
          id: creature.id,
          state: creature.state,
          turn: creature.turn,
          jointSummary: creature.jointSummary,
        } : null,
      },
      contactFrames,
    });
    if (capture) {
      const target = scenario === 'right-wall' ? proof.rightWall : scenario === 'left-wall' ? proof.leftWall : proof.corner;
      await writeCanvas(page, target);
      if (scenario === 'right-wall') await writeCanvas(page, proof.grayscale, true);
    }
    await page.close();
  }
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  await writeFile(reportPath, `${JSON.stringify({ ok: errors.length === 0, results, proof, errors, serverLogs: serverLogs.slice(-20) }, null, 2)}\n`);
  await browser.close();
  if (server) server.kill('SIGTERM');
}

if (errors.length) {
  console.error('Glasshook wall-fold regression failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Glasshook wall-fold regression passed.');
console.log(`Report: ${reportPath}`);

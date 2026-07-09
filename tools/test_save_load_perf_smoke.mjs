import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import {
  assertSteadyGameplayCadence,
  finishCadenceProbe,
  installBrowserPerfObservers,
  startCadenceProbe,
} from './perf_assertions.mjs';

const outDir = process.env.WATER9_SAVE_LOAD_PERF_OUT_DIR ?? 'runs/water9-save-load-perf-2026-07-09';
const reportPath = process.env.WATER9_SAVE_LOAD_PERF_REPORT ?? `${outDir}/save-load-perf-smoke.json`;
const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_SAVE_LOAD_PERF_PORT ?? 5193);

await mkdir(outDir, { recursive: true });

async function portAvailable(port) {
  return new Promise((resolvePort) => {
    const server = net.createServer();
    server.once('error', () => resolvePort(false));
    server.once('listening', () => server.close(() => resolvePort(true)));
    server.listen(port, host);
  });
}

async function choosePort() {
  const candidates = [
    ...Array.from({ length: 5200 - requestedPort }, (_, index) => requestedPort + index),
    ...Array.from({ length: Math.max(0, requestedPort - 5180) }, (_, index) => 5180 + index),
  ].filter((port) => port >= 5180 && port <= 5199);
  for (const port of candidates) if (await portAvailable(port)) return port;
  throw new Error('no free smoke port in 5180-5199');
}

const port = process.env.PLAYTEST_URL ? 0 : await choosePort();
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=2&perf=1&perfHud=0`;
const server = process.env.PLAYTEST_URL ? null : spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
const serverLogs = [];
server?.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server?.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
const errors = [];

async function waitForServer(url, timeoutMs = 25000) {
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

async function waitForWorld(page, timeoutMs = 30000) {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false && !snap.ui?.biomeLoading?.active);
  }, null, { timeout: timeoutMs });
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
  }, loadId, { timeout: 30000 });
}

async function captureCanvasPair(page, name) {
  const pngPath = `${outDir}/${name}.png`;
  const grayPath = `${outDir}/${name}-gray.png`;
  await page.locator('#game canvas').screenshot({ path: pngPath });
  const grayscaleDataUrl = await page.evaluate(() => {
    const source = document.querySelector('#game canvas');
    if (!source) return null;
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const gray = Math.round(image.data[i] * 0.2126 + image.data[i + 1] * 0.7152 + image.data[i + 2] * 0.0722);
      image.data[i] = gray;
      image.data[i + 1] = gray;
      image.data[i + 2] = gray;
    }
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL('image/png');
  });
  if (grayscaleDataUrl) await writeFile(grayPath, Buffer.from(grayscaleDataUrl.split(',')[1], 'base64'));
  return { pngPath, grayPath: grayscaleDataUrl ? grayPath : null };
}

if (server) await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await installBrowserPerfObservers(page);

page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) errors.push({ type: 'console', text: message.text() });
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
});

let report = {};
try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await waitForWorld(page);
  await command(page, 'clearSave');
  await command(page, 'setCredits', 4321);
  await command(page, 'maxUpgrades');
  await command(page, 'buySub', 2);
  await command(page, 'dive');
  await command(page, 'teleportDepth', 720);
  await command(page, 'terrainMineAt', { repeats: 4 });
  await sleep(350);

  const beforeSave = await snapshot(page);
  const beforePerf = (await command(page, 'exportPerfFrameBuffer'))?.perf ?? beforeSave?.perf ?? null;
  const beforeShot = await captureCanvasPair(page, 'save-load-before-save-canvas');
  const saveResult = await command(page, 'saveGame');
  await command(page, 'setCredits', 7);
  await command(page, 'setOxygen', 11);
  const mutated = await snapshot(page);

  await command(page, 'resetPerfFrameBuffer');
  await startCadenceProbe(page, 'save-load-restore-transition');
  const loadResult = await command(page, 'loadGame');
  await waitForLoadComplete(page, loadResult?.loadId ?? 0);
  const restoreCadenceProbe = await finishCadenceProbe(page);
  const afterLoad = await snapshot(page);
  const loadPerf = (await command(page, 'exportPerfFrameBuffer'))?.perf ?? afterLoad?.perf ?? null;
  const afterLoadShot = await captureCanvasPair(page, 'save-load-after-restore-canvas');

  for (let index = 0; index < 8; index += 1) {
    const snap = await snapshot(page);
    if (!snap?.ui?.radioOpen) break;
    await page.keyboard.press('Enter');
    await sleep(60);
  }
  await command(page, 'teleportDepth', 720);
  await sleep(500);
  await command(page, 'resetPerfFrameBuffer');
  await startCadenceProbe(page, 'save-load-after-restore-settled-swim');
  for (const [key, duration] of [['ArrowRight', 1300], ['ArrowDown', 1300], ['ArrowLeft', 1300], ['ArrowUp', 1300]]) {
    await page.keyboard.down(key);
    await sleep(duration);
    await page.keyboard.up(key);
  }
  await sleep(350);
  const settledCadenceProbe = await finishCadenceProbe(page);
  const afterSettled = await snapshot(page);
  const afterPerf = (await command(page, 'exportPerfFrameBuffer'))?.perf ?? afterSettled?.perf ?? null;
  const afterSettledShot = await captureCanvasPair(page, 'save-load-after-settled-swim-canvas');

  if (!saveResult?.ok) fail('save command did not report success');
  if (!loadResult?.ok) fail('load command did not report success');
  if (beforeSave?.state?.credits !== afterLoad?.state?.credits) fail(`credits did not round-trip: ${beforeSave?.state?.credits} -> ${afterLoad?.state?.credits}`);
  if (beforeSave?.state?.biome !== afterLoad?.state?.biome) fail(`biome did not round-trip: ${beforeSave?.state?.biome} -> ${afterLoad?.state?.biome}`);
  if (Math.abs((beforeSave?.player?.y ?? 0) - (afterLoad?.player?.y ?? 0)) > 2) fail('player depth/position did not round-trip');

  const restoreRaf = restoreCadenceProbe?.independentRaf ?? null;
  const restoreLongTasks = restoreCadenceProbe?.longTasks?.filter((task) => task.duration >= 50) ?? [];
  if (!restoreRaf?.samples) fail('save/load restore transition did not record independent rAF samples');
  if ((restoreRaf?.max ?? 0) > 1000) fail(`save/load restore transition had an unbounded frame gap: ${restoreRaf.max}ms`);
  if (restoreLongTasks.some((task) => task.duration >= 1000)) {
    fail(`save/load restore transition had a >=1000ms Long Task; max ${Math.round(Math.max(...restoreLongTasks.map((task) => task.duration))) }ms`);
  }
  assertSteadyGameplayCadence({
    label: 'save/load after restore settled swim',
    independentRaf: settledCadenceProbe?.independentRaf ?? null,
    perf: afterPerf,
    longTasks: settledCadenceProbe?.longTasks ?? [],
    errors,
  });

  report = {
    ok: errors.length === 0,
    url: baseUrl,
    saveResult,
    loadResult,
    beforeSave: {
      credits: beforeSave?.state?.credits,
      biome: beforeSave?.state?.biome,
      player: beforeSave?.player,
      perf: beforePerf,
    },
    mutated: {
      credits: mutated?.state?.credits,
      oxygen: mutated?.state?.oxygen,
    },
    restore: {
      cadenceProbe: restoreCadenceProbe ? { label: restoreCadenceProbe.label, durationMs: restoreCadenceProbe.durationMs } : null,
      independentRaf: restoreRaf,
      longTasks: restoreLongTasks,
      perf: loadPerf,
    },
    afterLoad: {
      credits: afterLoad?.state?.credits,
      biome: afterLoad?.state?.biome,
      player: afterLoad?.player,
    },
    afterSettled: {
      cadenceProbe: settledCadenceProbe ? { label: settledCadenceProbe.label, durationMs: settledCadenceProbe.durationMs } : null,
      independentRaf: settledCadenceProbe?.independentRaf ?? null,
      perf: afterPerf,
    },
    artifacts: {
      beforeShot,
      afterLoadShot,
      afterSettledShot,
    },
    errors,
    serverLogs: serverLogs.slice(-20),
  };
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  report = { ok: false, url: baseUrl, errors, serverLogs: serverLogs.slice(-40) };
} finally {
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close().catch(() => {});
  if (server) {
    server.kill('SIGTERM');
    await new Promise((resolveExit) => server.once('exit', resolveExit));
  }
}

if (!report.ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  reportPath,
  restoreRaf: report.restore?.independentRaf,
  settledRaf: report.afterSettled?.independentRaf,
}, null, 2));

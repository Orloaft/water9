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

const outDir = process.env.WATER9_SONAR_TOOL_OUT_DIR ?? 'runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09';
const reportPath = process.env.WATER9_SONAR_TOOL_REPORT ?? `${outDir}/sonar-tool-overhaul-smoke.json`;
const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_SONAR_TOOL_PORT ?? 5184);

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
  for (const port of candidates) {
    if (await portAvailable(port)) return port;
  }
  throw new Error('no free smoke port in 5180-5199');
}

const port = process.env.PLAYTEST_URL ? 0 : await choosePort();
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=2&perf=1&perfHud=0`;

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

async function waitForServer(url, timeoutMs = 25000) {
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

async function waitForWorldReady(page, timeoutMs = 30000) {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false && !snap.ui?.biomeLoading?.active);
  }, null, { timeout: timeoutMs });
}

async function startRafProbe(page, durationMs) {
  await page.evaluate((duration) => {
    window.__water9RafProbe = {
      frames: [],
      startedAt: performance.now(),
      durationMs: duration,
      complete: false,
    };
    let last = performance.now();
    function tick(now) {
      window.__water9RafProbe.frames.push(now - last);
      last = now;
      if (now - window.__water9RafProbe.startedAt < duration) requestAnimationFrame(tick);
      else window.__water9RafProbe.complete = true;
    }
    requestAnimationFrame(tick);
  }, durationMs);
}

async function finishRafProbe(page) {
  await page.waitForFunction(() => window.__water9RafProbe?.complete, null, { timeout: 16000 });
  return page.evaluate(() => {
    const frames = window.__water9RafProbe?.frames ?? [];
    const sorted = [...frames].sort((a, b) => a - b);
    const percentile = (p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0;
    const avg = frames.length ? frames.reduce((sum, frame) => sum + frame, 0) / frames.length : 0;
    return {
      samples: frames.length,
      avgFrameMs: Math.round(avg * 100) / 100,
      p50FrameMs: Math.round(percentile(0.5) * 100) / 100,
      p95FrameMs: Math.round(percentile(0.95) * 100) / 100,
      p99FrameMs: Math.round(percentile(0.99) * 100) / 100,
      maxFrameMs: Math.round(Math.max(0, ...frames) * 100) / 100,
      framesOver50: frames.filter((frame) => frame > 50).length,
    };
  });
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

async function captureOverlay(page, name) {
  const path = `${outDir}/${name}.png`;
  await page.locator('#sonar-map-overlay').screenshot({ path });
  return path;
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
  await page.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.(), null, { timeout: 10000 });
  await page.locator('button[data-start-game]').click();
  await page.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.()?.state?.started === true, null, { timeout: 10000 });
  await waitForWorldReady(page);
  for (let index = 0; index < 8; index += 1) {
    const snap = await snapshot(page);
    if (!snap?.ui?.radioOpen) break;
    await page.keyboard.press('Enter');
    await sleep(80);
  }
  await command(page, 'dive');
  await command(page, 'teleportDepth', 420);
  const teleport = { ok: true, command: 'teleportDepth', requestedDepthMeters: 420 };
  await command(page, 'refill');
  await waitForWorldReady(page);
  await sleep(300);

  const beforeNormal = await snapshot(page);
  await command(page, 'resetPerfFrameBuffer');
  await startCadenceProbe(page, 'sonar-normal-swim');
  for (const [key, duration] of [['ArrowRight', 1000], ['ArrowDown', 1000], ['ArrowLeft', 1000], ['ArrowUp', 1000]]) {
    await page.keyboard.down(key);
    await sleep(duration);
    await page.keyboard.up(key);
  }
  await sleep(250);
  const normalCadenceProbe = await finishCadenceProbe(page);
  const normalRaf = normalCadenceProbe?.independentRaf ?? null;
  const afterNormal = await snapshot(page);
  const normalDom = await page.evaluate(() => ({
    bigMapPresent: Boolean(document.querySelector('#big-sonar-map')),
    overlayOpen: document.querySelector('#sonar-map-overlay')?.classList.contains('is-open') ?? false,
    hudMiniMapPresent: Boolean(document.querySelector('#sonar-map')),
    navText: document.querySelector('.navigation-panel')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  }));
  const normalCanvas = await captureCanvasPair(page, 'normal-swim-canvas');
  const normalBigMetric = afterNormal?.perf?.metrics?.['draw.bigSonarMap'] ?? null;
  report = {
    partial: 'before-sonar-open',
    url: baseUrl,
    teleport,
    beforeNormal: { state: beforeNormal?.state, ui: beforeNormal?.ui },
    afterNormal: {
      state: afterNormal?.state,
      ui: afterNormal?.ui,
      dom: normalDom,
      raf: normalRaf,
      drawBigSonarMap: normalBigMetric,
      artifacts: normalCanvas,
    },
  };

  const selectSonar = await command(page, 'selectTool', 'sonar');
  await sleep(120);
  await page.keyboard.press('KeyM');
  await page.evaluate(() => {
    if (window.__AQUA_PLAYTEST__?.snapshot?.()?.ui?.sonarMapOpen) return;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM', key: 'm', bubbles: true, cancelable: true }));
  });
  report = {
    ...report,
    partial: 'after-sonar-open-attempt',
    selectSonar,
    afterOpenAttempt: await snapshot(page),
  };
  await page.locator('.sonar-map-overlay.is-open #big-sonar-map').waitFor({ timeout: 5000 });
  await sleep(350);
  const sonarOpen = await snapshot(page);
  const sonarCanvas = await captureCanvasPair(page, 'sonar-tool-open-canvas');
  const sonarOverlayPath = await captureOverlay(page, 'sonar-tool-open-overlay');
  await command(page, 'resetPerfFrameBuffer');
  await startCadenceProbe(page, 'sonar-tool-open-use');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowDown');
  await sleep(2500);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('ArrowDown');
  await page.keyboard.down('KeyE');
  await sleep(1200);
  await page.keyboard.up('KeyE');
  await sleep(900);
  const sonarUseCadenceProbe = await finishCadenceProbe(page);
  const sonarUseRaf = sonarUseCadenceProbe?.independentRaf ?? null;
  const afterSonarUse = await snapshot(page);

  await page.keyboard.press('Escape');
  await sleep(150);
  await page.keyboard.press('KeyP');
  await sleep(150);
  const selectDrill = await command(page, 'selectTool', 'drill');
  await sleep(180);
  const afterDismiss = await snapshot(page);
  const dismissedDom = await page.evaluate(() => ({
    bigMapPresent: Boolean(document.querySelector('#big-sonar-map')),
    overlayOpen: document.querySelector('#sonar-map-overlay')?.classList.contains('is-open') ?? false,
    hudMiniMapPresent: Boolean(document.querySelector('#sonar-map')),
    navText: document.querySelector('.navigation-panel')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  }));
  const dismissedCanvas = await captureCanvasPair(page, 'dismissed-unequipped-canvas');

  const sonarBigMetric = afterSonarUse?.perf?.metrics?.['draw.bigSonarMap'] ?? null;

  if (!teleport?.ok) fail(`teleportToReachableDepth failed: ${teleport?.reason ?? 'unknown'}`);
  if (beforeNormal?.ui?.sonarMapOpen || afterNormal?.ui?.sonarMapOpen || normalDom.overlayOpen || normalDom.bigMapPresent) fail('ordinary swimming exposed the full sonar map');
  if (normalDom.hudMiniMapPresent) fail('ordinary HUD still rendered the sonar minimap canvas');
  if (normalBigMetric?.samples) fail('ordinary swimming called draw.bigSonarMap');
  if (!sonarOpen?.ui?.sonarMapOpen || sonarOpen?.state?.selectedTool !== 'sonar') fail('using sonar did not equip/open the full sonar chart');
  if (!sonarBigMetric?.samples) fail('sonar-use mode did not draw the big sonar map');
  if (afterDismiss?.ui?.sonarMapOpen || dismissedDom.overlayOpen || dismissedDom.bigMapPresent) fail('dismiss/unequip left the full sonar map visible');
  if (afterDismiss?.state?.selectedTool !== 'drill') fail('dismiss/unequip did not return to the drill tool');
  assertSteadyGameplayCadence({
    label: 'sonar normal swim',
    independentRaf: normalRaf,
    perf: afterNormal?.perf,
    longTasks: normalCadenceProbe?.longTasks ?? [],
    errors,
  });
  assertSteadyGameplayCadence({
    label: 'sonar open use',
    independentRaf: sonarUseRaf,
    perf: afterSonarUse?.perf,
    longTasks: sonarUseCadenceProbe?.longTasks ?? [],
    errors,
  });

  report = {
    ok: errors.length === 0,
    url: baseUrl,
    teleport,
    normal: {
      before: { selectedTool: beforeNormal?.state?.selectedTool, sonarMapOpen: beforeNormal?.ui?.sonarMapOpen },
      after: { selectedTool: afterNormal?.state?.selectedTool, sonarMapOpen: afterNormal?.ui?.sonarMapOpen },
      dom: normalDom,
      cadenceProbe: normalCadenceProbe ? { label: normalCadenceProbe.label, durationMs: normalCadenceProbe.durationMs } : null,
      raf: normalRaf,
      drawSonarMap: afterNormal?.perf?.metrics?.['draw.sonarMap'] ?? null,
      drawBigSonarMap: normalBigMetric,
      artifacts: normalCanvas,
    },
    sonarUse: {
      selectSonar,
      open: { selectedTool: sonarOpen?.state?.selectedTool, sonarMapOpen: sonarOpen?.ui?.sonarMapOpen },
      after: { selectedTool: afterSonarUse?.state?.selectedTool, sonarMapOpen: afterSonarUse?.ui?.sonarMapOpen },
      cadenceProbe: sonarUseCadenceProbe ? { label: sonarUseCadenceProbe.label, durationMs: sonarUseCadenceProbe.durationMs } : null,
      raf: sonarUseRaf,
      drawSonarMap: afterSonarUse?.perf?.metrics?.['draw.sonarMap'] ?? null,
      drawBigSonarMap: sonarBigMetric,
      artifacts: { ...sonarCanvas, overlayPath: sonarOverlayPath },
    },
    dismissed: {
      selectDrill,
      state: { selectedTool: afterDismiss?.state?.selectedTool, sonarMapOpen: afterDismiss?.ui?.sonarMapOpen, paused: afterDismiss?.ui?.paused },
      dom: dismissedDom,
      artifacts: dismissedCanvas,
    },
  };
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  report = { ...report, errors, serverLogs: serverLogs.slice(-20) };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close().catch(() => {});
  if (server) {
    server.kill('SIGTERM');
    await new Promise((resolveExit) => server.once('exit', resolveExit));
  }
}

if (errors.length) {
  console.error('Water9 sonar tool overhaul smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 sonar tool overhaul smoke passed.');
console.log(`Report: ${reportPath}`);

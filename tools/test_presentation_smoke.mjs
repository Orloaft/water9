import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_PRESENTATION_OUT_DIR ?? '/home/orlovboros/projects/manager/runs';
const reportPath = process.env.WATER9_PRESENTATION_REPORT ?? `${outDir}/water9-presentation-smoke-2026-06-28.json`;
const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_PRESENTATION_PORT ?? 5198);

await mkdir(outDir, { recursive: true });

let server = null;
const port = process.env.PLAYTEST_URL ? requestedPort : await findOpenPort(requestedPort);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=1`;
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

function canBind(portToCheck) {
  return new Promise((resolveBind) => {
    const probe = createServer();
    probe.once('error', () => resolveBind(false));
    probe.once('listening', () => {
      probe.close(() => resolveBind(true));
    });
    probe.listen(portToCheck, host);
  });
}

async function findOpenPort(start) {
  for (let candidate = start; candidate < start + 80; candidate += 1) {
    if (await canBind(candidate)) return candidate;
  }
  throw new Error(`No open port found from ${start} to ${start + 79}`);
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

async function command(page, name, value) {
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null, [name, value]);
}

async function waitForWorld(page) {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false && !snap.ui?.biomeLoading?.active);
  }, null, { timeout: 25000 });
}

function overlapArea(a, b) {
  if (!a || !b) return 0;
  const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return x * y;
}

async function captureFrame(page, label, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await waitForWorld(page);
  await command(page, 'start');
  await command(page, 'dive');
  await command(page, 'teleportDepth', 420);
  await command(page, 'setOxygen', 18);
  await page.waitForTimeout(600);

  const screenshotPath = `${outDir}/water9-presentation-smoke-${label}-2026-06-28.png`;
  await page.screenshot({ path: screenshotPath, fullPage: false });

  return page.evaluate(() => {
    const selectors = {
      objective: '.objective-panel',
      alert: '.priority-alert',
      sonar: '.sonar-panel',
      hud: '#gauges',
      status: '.status',
      cargo: '.cargo-manifest',
      fps: '#fps-tracker',
      perf: '#perf-hud',
    };
    const rectFor = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        selector,
        visible: style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0,
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 160) ?? '',
      };
    };
    return Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, rectFor(selector)]));
  }).then((rects) => ({ label, viewport, screenshotPath, rects }));
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

const frames = [];
try {
  frames.push(await captureFrame(page, 'desktop', { width: 1280, height: 800 }));
  frames.push(await captureFrame(page, 'narrow', { width: 760, height: 800 }));

  for (const frame of frames) {
    const { rects } = frame;
    if (rects.fps?.visible) errors.push({ type: 'assertion', text: `${frame.label}: FPS tracker visible by default` });
    if (rects.perf?.visible) errors.push({ type: 'assertion', text: `${frame.label}: perf HUD visible by default` });
    for (const key of ['objective', 'alert', 'sonar', 'hud', 'status']) {
      if (!rects[key]?.visible) errors.push({ type: 'assertion', text: `${frame.label}: ${key} panel was not visible` });
    }
    const pairs = [
      ['objective', 'alert'],
      ['objective', 'sonar'],
      ['alert', 'sonar'],
      ['objective', 'hud'],
      ['alert', 'hud'],
      ['sonar', 'hud'],
    ];
    for (const [a, b] of pairs) {
      const area = overlapArea(rects[a], rects[b]);
      if (area > 24) errors.push({ type: 'assertion', text: `${frame.label}: ${a} overlaps ${b} by ${area}px` });
    }
  }
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  await writeFile(reportPath, `${JSON.stringify({ ok: errors.length === 0, frames, errors, serverLogs: serverLogs.slice(-20) }, null, 2)}\n`);
  await browser.close();
  if (server) server.kill('SIGTERM');
}

if (errors.length) {
  console.error('Water9 presentation smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 presentation smoke passed.');
for (const frame of frames) console.log(`Screenshot: ${frame.screenshotPath}`);
console.log(`Report: ${reportPath}`);

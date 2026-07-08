import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import net from 'node:net';
import { chromium } from 'playwright';

const outDir = 'runs/water9-asset-behavior-recovery-2026-07-06';
const host = '127.0.0.1';
await mkdir(outDir, { recursive: true });

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function portAvailable(port) {
  return new Promise((resolvePort) => {
    const server = net.createServer();
    server.once('error', () => resolvePort(false));
    server.once('listening', () => server.close(() => resolvePort(true)));
    server.listen(port, host);
  });
}

async function pickPort() {
  for (let port = 5180; port <= 5199; port += 1) {
    if (await portAvailable(port)) return port;
  }
  throw new Error('no available port in 5180-5199');
}

const port = await pickPort();
const baseUrl = `http://${host}:${port}/?playtest=1&renderer=canvas&biome=1`;
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
const serverLogs = [];
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

async function waitForServer() {
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`dev server exited before ready with code ${server.exitCode}`);
    try {
      const response = await fetch(baseUrl, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite may still be binding.
    }
    await sleep(150);
  }
  throw new Error('dev server was not ready');
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 640 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
    errors.push({ type: 'console', text: message.text() });
  }
});

async function command(name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => (
    window.__AQUA_PLAYTEST__?.command?.(commandName, commandValue) ?? null
  ), [name, value]);
  await page.waitForTimeout(120);
  return result;
}

async function snapshot() {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function capture(label) {
  const colorPath = `${outDir}/${label}.png`;
  const grayPath = `${outDir}/${label}-grayscale.png`;
  const canvas = page.locator('#game canvas');
  await canvas.screenshot({ path: colorPath, timeout: 15000 });
  await canvas.evaluate((node) => { node.style.filter = 'grayscale(1)'; });
  await page.waitForTimeout(60);
  await canvas.screenshot({ path: grayPath, timeout: 15000 });
  await canvas.evaluate((node) => { node.style.filter = ''; });
  return { colorPath, grayPath };
}

try {
  await waitForServer();
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 10000 });
  await command('start');
  await page.waitForTimeout(2500);
  const setup = await command('interactionEdgeProof', { kind: 'fauna', species: 'Mantis Shrimp', action: 'setup' });
  const frames = [];
  for (let i = 0; i < 8; i += 1) {
    if (i > 0) await page.waitForTimeout(70);
    const snap = await snapshot();
    const fish = snap?.fish?.find((candidate) => candidate.species === 'Mantis Shrimp') ?? null;
    const image = await capture(`mantis-movement-frame-${String(i).padStart(2, '0')}`);
    frames.push({
      frame: i,
      timeMs: i * 70,
      image,
      fish: fish ? {
        x: fish.x,
        y: fish.y,
        vx: fish.vx,
        vy: fish.vy,
        anchor: fish.anchor,
        rootX: fish.surface?.rootX ?? null,
        rootY: fish.surface?.rootY ?? null,
        rootDisplacement: fish.rootDisplacement,
        lungeTimer: fish.lungeTimer,
        navReseedCooldown: fish.navReseedCooldown,
        screenVisible: fish.screenVisible,
      } : null,
    });
  }
  const report = { ok: errors.length === 0 && frames.every((frame) => frame.fish?.screenVisible), generatedAt: new Date().toISOString(), port, setup, frames, errors, serverLogs: serverLogs.join('').slice(-3000) };
  await writeFile(`${outDir}/mantis-movement-proof.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  server.kill('SIGTERM');
  await new Promise((resolveExit) => server.once('exit', resolveExit));
  process.exit(report.ok ? 0 : 1);
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  await writeFile(`${outDir}/mantis-movement-proof.json`, `${JSON.stringify({ ok: false, port, errors, serverLogs: serverLogs.join('').slice(-3000) }, null, 2)}\n`);
  await browser.close().catch(() => {});
  server.kill('SIGTERM');
  await new Promise((resolveExit) => server.once('exit', resolveExit));
  process.exit(1);
}

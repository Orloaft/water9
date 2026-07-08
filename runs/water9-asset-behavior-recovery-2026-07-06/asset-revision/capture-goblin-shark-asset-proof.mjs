import { spawn } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import net from 'node:net';
import { chromium } from 'playwright';

const outDir = 'runs/water9-asset-behavior-recovery-2026-07-06/asset-revision';
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
const baseUrl = `http://${host}:${port}/?playtest=1&renderer=canvas&biome=3`;
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
  await page.waitForTimeout(140);
  return result;
}

async function snapshot() {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function waitForSceneReady() {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(
      snap?.world
      && Number.isFinite(snap?.sceneDepths?.actors)
      && Number.isFinite(snap?.sceneDepths?.articulatedBridges),
    );
  }, null, { timeout: 25000 });
  await page.waitForTimeout(700);
}

async function capture(label) {
  const colorPath = `${outDir}/${label}.png`;
  const grayPath = `${outDir}/${label}-grayscale.png`;
  const canvas = page.locator('#game canvas');
  await canvas.screenshot({ path: colorPath, timeout: 15000 });
  await canvas.evaluate((node) => { node.style.filter = 'grayscale(1)'; });
  await page.waitForTimeout(80);
  await canvas.screenshot({ path: grayPath, timeout: 15000 });
  await canvas.evaluate((node) => { node.style.filter = ''; });
  return { colorPath, grayPath };
}

async function assetInspection() {
  return page.evaluate(() => {
    const key = 'fauna-abyss-goblin-shark';
    return new Promise((resolve) => {
      const source = new Image();
      source.onload = () => {
        const width = source.naturalWidth;
        const height = source.naturalHeight;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context || width <= 0 || height <= 0) {
          resolve({ key, sourceLoaded: true, sourceWidth: width, sourceHeight: height, error: 'missing-2d-context' });
          return;
        }
        context.drawImage(source, 0, 0);
      const data = context.getImageData(0, 0, width, height).data;
        let saturatedGreenPixels = 0;
        let opaquePixels = 0;
        let transparentPixels = 0;
        let alphaEdgePixels = 0;
      for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const alpha = data[index + 3];
        if (alpha > 12) opaquePixels += 1;
        else transparentPixels += 1;
        if (alpha > 12 && alpha < 245) alphaEdgePixels += 1;
        if (alpha > 64 && green > 150 && red < 45 && blue < 90) saturatedGreenPixels += 1;
      }
        resolve({
          key,
          sourceLoaded: true,
          sourceWidth: width,
          sourceHeight: height,
          saturatedGreenPixels,
          opaquePixels,
          transparentPixels,
          alphaEdgePixels,
        });
      };
      source.onerror = () => resolve({ key, sourceLoaded: false, error: 'image-load-failed' });
      source.src = '/assets/generated/fauna-abyss-goblin-shark.png';
    });
  });
}

async function screenPixelInspection() {
  return page.locator('#game canvas').evaluate((node) => {
    const context = node.getContext('2d', { willReadFrequently: true });
    if (!context) return { ok: false, reason: 'missing-2d-context' };
    const { width, height } = node;
    const data = context.getImageData(0, 0, width, height).data;
    let saturatedGreenPixels = 0;
    let largestGreenRun = 0;
    for (let y = 0; y < height; y += 1) {
      let run = 0;
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const alpha = data[index + 3];
        const isGreen = alpha > 120 && green > 150 && red < 45 && blue < 90;
        if (isGreen) {
          saturatedGreenPixels += 1;
          run += 1;
          largestGreenRun = Math.max(largestGreenRun, run);
        } else {
          run = 0;
        }
      }
    }
    return { ok: true, width, height, saturatedGreenPixels, largestGreenRun };
  });
}

try {
  await waitForServer();
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 10000 });
  await command('start');
  await waitForSceneReady();
  await command('clearProofOverlays');
  await command('setBiome', 3);
  await page.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.()?.state?.biome === 3, null, { timeout: 25000 });
  await waitForSceneReady();
  await page.keyboard.up('KeyE');
  await page.keyboard.up('KeyR');
  await page.waitForFunction(() => (window.__AQUA_PLAYTEST__?.snapshot?.()?.fish?.some?.((fish) => fish.species === 'Goblin Shark') ?? false), null, { timeout: 20000 });
  const teleport = await command('teleportToFauna', { species: 'Goblin Shark', assetKey: 'fauna-abyss-goblin-shark', distance: 105 });
  await command('clearProofOverlays');
  await page.waitForTimeout(120);
  const image = await capture('goblin-shark-gameplay-proof-clean');
  const snap = await snapshot();
  const goblin = snap?.fish?.find((fish) => fish.species === 'Goblin Shark' && fish.assetKey === 'fauna-abyss-goblin-shark') ?? null;
  const manifest = JSON.parse(await readFile('public/assets/generated/fauna-abyss-goblin-shark.frames.json', 'utf8'));
  const assetFiles = [
    'fauna-abyss-goblin-shark.png',
    'fauna-abyss-goblin-shark-0.png',
    'fauna-abyss-goblin-shark-1.png',
    'fauna-abyss-goblin-shark-2.png',
    'fauna-abyss-goblin-shark.frames.json',
  ];
  const fileStats = {};
  for (const name of assetFiles) {
    const path = `public/assets/generated/${name}`;
    const response = await page.request.get(`http://${host}:${port}/assets/generated/${name}`);
    const info = await stat(path);
    fileStats[name] = { path, bytes: info.size, httpStatus: response.status(), httpOk: response.ok() };
  }
  const textureInspection = await assetInspection();
  const screenInspection = await screenPixelInspection();
  const visualAcceptable = Boolean(
    goblin?.screenVisible
    && goblin.screenX >= 120
    && goblin.screenX <= 840
    && goblin.screenY >= 80
    && goblin.screenY <= 560
    && textureInspection.sourceLoaded
    && textureInspection.saturatedGreenPixels === 0
    && screenInspection.ok
    && screenInspection.saturatedGreenPixels < 100
    && screenInspection.largestGreenRun < 20,
  );
  const report = {
    ok: errors.length === 0 && visualAcceptable,
    generatedAt: new Date().toISOString(),
    port,
    assetKey: 'fauna-abyss-goblin-shark',
    image,
    goblin,
    teleport,
    manifest,
    fileStats,
    textureInspection,
    screenInspection,
    visualAcceptable,
    errors,
    serverLogs: serverLogs.join('').slice(-3000),
  };
  await writeFile(`${outDir}/goblin-shark-runtime-metadata.json`, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(`${outDir}/goblin-shark-source-spritesheet-inspection.json`, `${JSON.stringify({ manifest, textureInspection, fileStats }, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  server.kill('SIGTERM');
  await new Promise((resolveExit) => server.once('exit', resolveExit));
  process.exit(report.ok ? 0 : 1);
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  await writeFile(`${outDir}/goblin-shark-runtime-metadata.json`, `${JSON.stringify({ ok: false, port, errors, serverLogs: serverLogs.join('').slice(-3000) }, null, 2)}\n`);
  await browser.close().catch(() => {});
  server.kill('SIGTERM');
  await new Promise((resolveExit) => server.once('exit', resolveExit));
  process.exit(1);
}

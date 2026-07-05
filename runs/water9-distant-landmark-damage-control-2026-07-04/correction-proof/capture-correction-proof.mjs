import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = resolve('runs/water9-distant-landmark-damage-control-2026-07-04/correction-proof');
const host = '127.0.0.1';
const sourceSelector = '#game canvas';
const viewport = { width: 1280, height: 800 };

const targets = [
  { biome: 1, name: 'The Shallows', label: 'b1-surface-119', depth: 119, reviewX: 3600 },
  { biome: 1, name: 'The Shallows', label: 'b1-upper-180', depth: 180, reviewX: 3600 },
  { biome: 2, name: 'Brine Vent Shelf', label: 'b2-mid-760', depth: 760, reviewX: 4700 },
  { biome: 3, name: 'Midnight Trench', label: 'b3-lower-1260', depth: 1260, reviewX: 5800 },
  { biome: 4, name: 'Ancient Ruins', label: 'b4-lower-1260', depth: 1260, reviewX: 6900 },
];

await mkdir(outDir, { recursive: true });

function git(args) {
  return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8' }).trimEnd();
}

async function fileBytes(path) {
  return (await stat(path)).size;
}

async function isPortFree(port) {
  return new Promise((resolvePort) => {
    const server = net.createServer();
    server.once('error', () => resolvePort(false));
    server.once('listening', () => server.close(() => resolvePort(true)));
    server.listen(port, host);
  });
}

async function choosePort() {
  for (let port = 5180; port <= 5199; port += 1) {
    if (await isPortFree(port)) return port;
  }
  throw new Error('no free localhost port found in 5180-5199');
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitForServer(url, server, logs, timeoutMs = 24000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`dev server exited before ready with code ${server.exitCode}`);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite is still binding.
    }
    await sleep(150);
  }
  throw new Error(`dev server was not ready within ${timeoutMs}ms\n${logs.join('')}`);
}

async function waitForPlaytest(page) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 20000 });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const review = await page.evaluate(() => window.__AQUA_PLAYTEST__?.command('biomeLoadingReview'));
    if (review?.worldReady === true) return;
    await page.waitForTimeout(160);
  }
  throw new Error('generated world was not ready within 30000ms');
}

async function command(page, name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue), [name, value]);
  await page.waitForTimeout(220);
  return result;
}

async function canvasStats(page) {
  return page.evaluate((selector) => {
    const canvas = document.querySelector(selector);
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false, width: 0, height: 0 };
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let min = 255;
    let max = 0;
    let sum = 0;
    let samples = 0;
    for (let y = 0; y < canvas.height; y += 8) {
      for (let x = 0; x < canvas.width; x += 8) {
        const i = (y * canvas.width + x) * 4;
        const luma = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
        min = Math.min(min, luma);
        max = Math.max(max, luma);
        sum += luma;
        samples += 1;
      }
    }
    return {
      exists: true,
      selector,
      width: canvas.width,
      height: canvas.height,
      lumaMin: Math.round(min),
      lumaMax: Math.round(max),
      lumaAverage: samples ? Number((sum / samples).toFixed(2)) : 0,
    };
  }, sourceSelector);
}

async function saveGrayscaleCanvas(page, path) {
  const dataUrl = await page.evaluate((selector) => {
    const canvas = document.querySelector(selector);
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) throw new Error(`missing canvas for selector ${selector}`);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      const luma = Math.round(data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722);
      data[i] = luma;
      data[i + 1] = luma;
      data[i + 2] = luma;
    }
    const gray = document.createElement('canvas');
    gray.width = canvas.width;
    gray.height = canvas.height;
    gray.getContext('2d').putImageData(image, 0, 0);
    return gray.toDataURL('image/png');
  }, sourceSelector);
  await writeFile(path, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function buildContactSheet(browser, captures) {
  const pngDataUrl = async (path) => `data:image/png;base64,${(await readFile(path)).toString('base64')}`;
  const cards = (await Promise.all(captures.map(async (capture) => `
    <section>
      <h2>${htmlEscape(capture.label)}</h2>
      <p>Biome ${capture.biome}: ${htmlEscape(capture.biomeName)} / ${capture.depth} m / ${htmlEscape(capture.review?.activeProfile?.activeBand ?? 'unknown band')}</p>
      <img src="${await pngDataUrl(capture.colorPath)}" alt="${htmlEscape(capture.label)} color canvas">
      <img src="${await pngDataUrl(capture.grayscalePath)}" alt="${htmlEscape(capture.label)} grayscale canvas">
      <p class="meta">Runtime: ${htmlEscape(capture.url)} | canvas ${capture.canvasStats.width}x${capture.canvasStats.height}</p>
      <p class="assets">Visible anchors: ${htmlEscape((capture.review?.anchors?.items ?? []).map((item) => item.assetId).filter(Boolean).join(', ') || 'none')}</p>
    </section>
  `))).join('');
  const html = `<!doctype html>
<meta charset="utf-8">
<style>
  body { margin:0; padding:22px; background:#061114; color:#e2f2f4; font:17px/1.35 system-ui, sans-serif; }
  h1 { font-size:24px; margin:0 0 16px; }
  main { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:20px; }
  section { break-inside:avoid; }
  h2 { font-size:19px; margin:0 0 6px; }
  p { margin:0 0 7px; color:#a9c4c9; }
  img { display:block; width:100%; margin-bottom:8px; background:#020708; border:1px solid #31545d; }
  .meta, .assets { font-size:12px; line-height:1.35; color:#8fa8ad; overflow-wrap:anywhere; }
</style>
<h1>Water9 Distant Landmark Correction Proof</h1>
<main>${cards}</main>`;
  const htmlPath = resolve(outDir, 'correction-proof-contact-sheet.html');
  const path = resolve(outDir, 'correction-proof-contact-sheet.png');
  await writeFile(htmlPath, html, 'utf8');
  const page = await browser.newPage({ viewport: { width: 1700, height: 2200 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path, fullPage: true });
  await page.close();
  return { path, htmlPath, bytes: await fileBytes(path) };
}

const repoRoot = git(['rev-parse', '--show-toplevel']);
if (repoRoot !== '/mnt/nxt-dev/water9') {
  throw new Error(`WRONG_REPO ${repoRoot}`);
}
const head = git(['rev-parse', '--short', 'HEAD']);
const gitStatusBefore = git(['status', '--short']);
const port = await choosePort();
const baseUrl = `http://${host}:${port}/`;
const serverLogs = [];
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

let browser;
const captures = [];
try {
  await waitForServer(baseUrl, server, serverLogs);
  browser = await chromium.launch({ headless: true });
  for (const target of targets) {
    const url = `${baseUrl}?playtest=1&biome=${target.biome}`;
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    await page.goto(url);
    await waitForPlaytest(page);
    const review = await command(page, 'backgroundReview', {
      label: `correction-proof-${target.label}`,
      depth: target.depth,
      reviewX: target.reviewX,
      clearWaterWindow: true,
    });
    await command(page, 'clearProofOverlays');
    await page.waitForTimeout(900);
    const colorPath = resolve(outDir, `${target.label}-color-canvas.png`);
    const grayscalePath = resolve(outDir, `${target.label}-grayscale-canvas.png`);
    await page.locator(sourceSelector).screenshot({ path: colorPath });
    await saveGrayscaleCanvas(page, grayscalePath);
    const stats = await canvasStats(page);
    const domProbe = await page.evaluate(() => ({
      title: document.title,
      href: window.location.href,
      hasPlaytestApi: Boolean(window.__AQUA_PLAYTEST__?.command),
      canvasCount: document.querySelectorAll('#game canvas').length,
      bodyClass: document.body.className,
    }));
    captures.push({
      biome: target.biome,
      biomeName: target.name,
      label: target.label,
      depth: target.depth,
      reviewX: target.reviewX,
      url,
      sourceSelector,
      viewport,
      colorPath,
      colorBytes: await fileBytes(colorPath),
      grayscalePath,
      grayscaleBytes: await fileBytes(grayscalePath),
      canvasStats: stats,
      domProbe,
      review,
    });
    await page.close();
  }
  const contactSheet = await buildContactSheet(browser, captures);
  const provenancePath = resolve(outDir, 'correction-proof-provenance.json');
  await writeFile(provenancePath, JSON.stringify({
    schema: 'water9-distant-landmark-correction-proof/v1',
    timestamp: new Date().toISOString(),
    repoRoot,
    head,
    gitStatusBefore,
    gitStatusAfter: git(['status', '--short']),
    baseUrl,
    selectedPort: port,
    sourceSelector,
    viewport,
    captures,
    contactSheet,
    serverStopped: false,
  }, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'ok', port, captures: captures.map((capture) => ({
    label: capture.label,
    colorPath: capture.colorPath,
    grayscalePath: capture.grayscalePath,
    anchors: capture.review?.anchors?.items?.map((item) => item.assetId).filter(Boolean) ?? [],
  })), provenancePath, contactSheet }, null, 2));
} finally {
  if (browser) await browser.close();
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await new Promise((resolveKill) => server.once('exit', resolveKill));
  }
}

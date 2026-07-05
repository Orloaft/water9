import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const repoRootExpected = '/mnt/nxt-dev/water9';
const outDir = resolve('runs/water9-distant-landmark-known-fix-2026-07-04/proof');
const host = '127.0.0.1';
const sourceSelector = '#game canvas';
const viewport = { width: 1280, height: 800 };

const scenarios = [
  { key: 'b1-surface-119', biome: 1, biomeName: 'The Shallows', label: 'B1 surface 119', depth: 119, reviewX: 3600 },
  { key: 'b1-upper-180', biome: 1, biomeName: 'The Shallows', label: 'B1 upper 180', depth: 180, reviewX: 3600 },
  { key: 'b2-mid-760', biome: 2, biomeName: 'Brine Vent Shelf', label: 'B2 mid 760', depth: 760, reviewX: 4700 },
  { key: 'b3-lower-1260', biome: 3, biomeName: 'Midnight Trench', label: 'B3 lower 1260', depth: 1260, reviewX: 5800 },
  { key: 'b4-lower-1260', biome: 4, biomeName: 'Ancient Ruins', label: 'B4 lower 1260', depth: 1260, reviewX: 6900 },
];

await mkdir(outDir, { recursive: true });

function git(args) {
  return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8' }).trimEnd();
}

async function fileBytes(path) {
  return (await stat(path)).size;
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
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
  const requested = Number(process.env.WATER9_KNOWN_FIX_PORT ?? 0);
  if (requested) {
    if (requested < 5180 || requested > 5199) throw new Error(`port ${requested} outside allowed 5180-5199 range`);
    if (await isPortFree(requested)) return requested;
    throw new Error(`requested port ${requested} is busy`);
  }
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
      // Vite may still be binding.
    }
    await sleep(150);
  }
  throw new Error(`dev server was not ready within ${timeoutMs}ms\n${logs.join('')}`);
}

function log(message) {
  console.error(`[known-fix-proof] ${message}`);
}

async function waitForPlaytest(page) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 20000 });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    let review = null;
    try {
      review = await page.evaluate(() => window.__AQUA_PLAYTEST__?.command('biomeLoadingReview'));
    } catch (error) {
      if (!String(error?.message ?? error).includes('Execution context was destroyed')) throw error;
      await page.waitForLoadState('domcontentloaded').catch(() => {});
    }
    if (review?.worldReady === true) return;
    await page.waitForTimeout(160);
  }
  throw new Error('generated world was not ready within 30000ms');
}

async function command(page, name, value) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      log(`command ${name} start`);
      const result = await page.evaluate(
        ([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue),
        [name, value],
      );
      log(`command ${name} done`);
      await page.waitForTimeout(220);
      return result;
    } catch (error) {
      if (!String(error?.message ?? error).includes('Execution context was destroyed') || attempt === 2) throw error;
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await waitForPlaytest(page);
    }
  }
  return null;
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

async function deriveGrayscale(page, path) {
  const base64 = await page.evaluate((selector) => {
    const source = document.querySelector(selector);
    if (!source) throw new Error(`missing ${selector}`);
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('missing output canvas context');
    context.drawImage(source, 0, 0);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      const y = Math.round(data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722);
      data[i] = y;
      data[i + 1] = y;
      data[i + 2] = y;
    }
    context.putImageData(image, 0, 0);
    return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
  }, sourceSelector);
  await writeFile(path, Buffer.from(base64, 'base64'));
}

function visibleAnchorIds(review) {
  return (review?.anchors?.items ?? [])
    .map((anchor) => anchor.assetId)
    .filter(Boolean);
}

async function buildContactSheet(browser, captures) {
  const pngDataUrl = async (path) => `data:image/png;base64,${(await readFile(path)).toString('base64')}`;
  const cards = (await Promise.all(captures.map(async (capture) => `
    <section>
      <h2>${htmlEscape(capture.label)}</h2>
      <p>Biome ${capture.biome}: ${htmlEscape(capture.biomeName)} / ${capture.depth} m / ${htmlEscape(capture.review?.activeProfile?.activeBand ?? 'unknown')}</p>
      <img src="${await pngDataUrl(capture.colorPath)}" alt="${htmlEscape(capture.label)} color">
      <img src="${await pngDataUrl(capture.grayscalePath)}" alt="${htmlEscape(capture.label)} grayscale">
      <p class="assets">Visible anchors: ${htmlEscape(capture.visibleAnchorIds.join(', ') || 'none')}</p>
    </section>
  `))).join('');
  const html = `<!doctype html>
<meta charset="utf-8">
<style>
  body { margin: 0; padding: 22px; background: #061114; color: #e2f2f4; font: 17px/1.35 system-ui, sans-serif; }
  h1 { font-size: 24px; margin: 0 0 16px; }
  main { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
  section { break-inside: avoid; }
  h2 { font-size: 19px; margin: 0 0 6px; }
  p { margin: 0 0 7px; color: #a9c4c9; }
  img { display: block; width: 100%; background: #020708; border: 1px solid #31545d; margin-top: 8px; }
  .assets { min-height: 34px; font-size: 12px; line-height: 1.35; color: #8fa8ad; overflow-wrap: anywhere; }
</style>
<h1>Water9 Distant Landmark Known Fix Proof</h1>
<main>${cards}</main>`;
  const htmlPath = resolve(outDir, 'water9-distant-landmark-known-fix-contact-sheet.html');
  const path = resolve(outDir, 'water9-distant-landmark-known-fix-contact-sheet.png');
  await writeFile(htmlPath, html, 'utf8');
  const page = await browser.newPage({ viewport: { width: 1700, height: 2500 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path, fullPage: true });
  await page.close();
  return { path, htmlPath, bytes: await fileBytes(path) };
}

const repoRoot = git(['rev-parse', '--show-toplevel']);
if (repoRoot !== repoRootExpected) throw new Error(`WRONG_REPO ${repoRoot}`);
const head = git(['rev-parse', '--short', 'HEAD']);
const gitStatusBefore = git(['status', '--short']);
const port = await choosePort();
const baseUrl = `http://${host}:${port}/`;
const serverLogs = [];
log(`starting Vite on ${baseUrl}`);
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
  log('Vite ready');
  browser = await chromium.launch({ headless: true });
  for (const scenario of scenarios) {
    log(`scenario ${scenario.key} open`);
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    const url = `${baseUrl}?playtest=1&biome=${scenario.biome}`;
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    log(`scenario ${scenario.key} waiting for playtest`);
    await waitForPlaytest(page);
    log(`scenario ${scenario.key} staging backgroundReview`);
    const review = await command(page, 'backgroundReview', {
      label: `water9-distant-landmark-known-fix-${scenario.key}`,
      depth: scenario.depth,
      reviewX: scenario.reviewX,
      clearWaterWindow: true,
    });
    await command(page, 'clearProofOverlays');
    await page.waitForTimeout(900);

    log(`scenario ${scenario.key} writing screenshots`);
    const colorPath = resolve(outDir, `water9-${scenario.key}-canvas.png`);
    const grayscalePath = resolve(outDir, `water9-${scenario.key}-canvas-grayscale.png`);
    await page.locator(sourceSelector).screenshot({ path: colorPath });
    await deriveGrayscale(page, grayscalePath);

    const domProbe = await page.evaluate(() => ({
      title: document.title,
      href: window.location.href,
      hasPlaytestApi: Boolean(window.__AQUA_PLAYTEST__?.command),
      canvasCount: document.querySelectorAll('#game canvas').length,
      bodyClass: document.body.className,
    }));
    captures.push({
      ...scenario,
      url,
      sourceSelector,
      viewport,
      colorPath,
      grayscalePath,
      colorBytes: await fileBytes(colorPath),
      grayscaleBytes: await fileBytes(grayscalePath),
      canvasStats: await canvasStats(page),
      domProbe,
      review,
      visibleAnchorIds: visibleAnchorIds(review),
    });
    await page.close();
    log(`scenario ${scenario.key} done`);
  }

  log('building contact sheet');
  const contactSheet = await buildContactSheet(browser, captures);
  const gitStatusAfter = git(['status', '--short']);
  const notesPath = resolve(outDir, 'water9-distant-landmark-known-fix-provenance.json');
  const notes = {
    schema: 'water9-distant-landmark-known-fix-proof@1',
    timestamp: new Date().toISOString(),
    repoRoot,
    head,
    baseUrl,
    selectedPort: port,
    sourceSelector,
    viewport,
    gitStatusBefore,
    gitStatusAfter,
    viteWatchNote: 'vite.config.ts ignores **/.desktop-build/** via server.watch.ignored',
    commandsRun: [
      `node runs/water9-distant-landmark-known-fix-2026-07-04/capture-known-fix-proof.mjs`,
    ],
    captures,
    contactSheet,
    runtimeConfirmation: 'All color captures are Playwright screenshots of the live Water9 #game canvas from ?playtest=1&biome=N. Grayscale captures are derived from those same canvas pixels.',
  };
  await writeFile(notesPath, `${JSON.stringify(notes, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ ok: true, outDir, notesPath, contactSheet, captures }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await sleep(250);
}

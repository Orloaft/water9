import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = resolve('runs/water9-biome1-organic-landmark-replacement-2026-07-04');
const host = '127.0.0.1';
const selector = '#game canvas';
const viewport = { width: 1280, height: 800 };

const captures = [
  { biome: 1, name: 'The Shallows', label: 'b1-surface-shallow-depth119', depth: 119 },
  { biome: 1, name: 'The Shallows', label: 'b1-upper-shallow-adjacent-depth180', depth: 180 },
  { biome: 2, name: 'Brine Vent Shelf', label: 'b2-preserve-mid-depth760', depth: 760 },
  { biome: 3, name: 'Midnight Trench', label: 'b3-preserve-lower-depth1260', depth: 1260 },
  { biome: 4, name: 'Ancient Ruins', label: 'b4-preserve-lower-depth1260', depth: 1260 },
];

await mkdir(outDir, { recursive: true });

function git(args) {
  return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8' }).trimEnd();
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
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

async function choosePort(start = 5180) {
  if (start < 5180 || start > 5199) throw new Error(`proof port ${start} outside Water9 allowed range 5180-5199`);
  for (let port = start; port <= 5199; port += 1) {
    if (await isPortFree(port)) return port;
  }
  throw new Error('no free localhost port found in Water9 allowed range 5180-5199');
}

async function waitForServer(url, server, logs, timeoutMs = 24000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`dev server exited early with code ${server.exitCode}`);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite may still be binding.
    }
    await sleep(150);
  }
  throw new Error(`server not ready within ${timeoutMs}ms\n${logs.join('')}`);
}

async function waitForPlaytest(page) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 20000 });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const review = await page.evaluate(() => window.__AQUA_PLAYTEST__?.command('biomeLoadingReview'));
    if (review?.worldReady === true) return;
    await page.waitForTimeout(160);
  }
  throw new Error('world not ready');
}

async function command(page, name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue), [name, value]);
  await page.waitForTimeout(300);
  return result;
}

async function canvasStats(page) {
  return page.evaluate((canvasSelector) => {
    const canvas = document.querySelector(canvasSelector);
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false };
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
      width: canvas.width,
      height: canvas.height,
      lumaMin: Math.round(min),
      lumaMax: Math.round(max),
      lumaAverage: Number((sum / Math.max(1, samples)).toFixed(2)),
    };
  }, selector);
}

async function writeCanvasPng(page, path, grayscale = false) {
  const dataUrl = await page.evaluate(({ canvasSelector, grayscale: makeGray }) => {
    const canvas = document.querySelector(canvasSelector);
    if (!canvas) throw new Error(`missing canvas ${canvasSelector}`);
    const output = document.createElement('canvas');
    output.width = canvas.width;
    output.height = canvas.height;
    const context = output.getContext('2d', { willReadFrequently: true });
    context.drawImage(canvas, 0, 0);
    if (makeGray) {
      const image = context.getImageData(0, 0, output.width, output.height);
      for (let i = 0; i < image.data.length; i += 4) {
        const luma = Math.round(image.data[i] * 0.2126 + image.data[i + 1] * 0.7152 + image.data[i + 2] * 0.0722);
        image.data[i] = luma;
        image.data[i + 1] = luma;
        image.data[i + 2] = luma;
      }
      context.putImageData(image, 0, 0);
    }
    return output.toDataURL('image/png');
  }, { canvasSelector: selector, grayscale });
  await writeFile(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function dataUrl(path) {
  return `data:image/png;base64,${(await readFile(path)).toString('base64')}`;
}

function rowTextureSummary(row) {
  const profile = row.snapshot?.environmentVisualProfile;
  return {
    anchorAssetIds: [...new Set((profile?.anchors?.items ?? []).map((item) => item.assetId).filter(Boolean))],
    renderedAnchorTextureKeys: [...new Set((profile?.renderedBitmapAnchors ?? []).map((item) => item.textureKey).filter(Boolean))],
    layerTextureKeys: [...new Set((profile?.layers ?? []).map((item) => item.textureKey).filter(Boolean))],
    layerAssetIds: [...new Set((profile?.layers ?? []).map((item) => item.painterlyAssetId).filter(Boolean))],
  };
}

function b1ForbiddenTextureAbsent(row) {
  const summary = rowTextureSummary(row);
  const joined = [...summary.anchorAssetIds, ...summary.renderedAnchorTextureKeys, ...summary.layerTextureKeys, ...summary.layerAssetIds].join(' ');
  return !joined.includes('phase11-') && !joined.includes('shell-survey') && !joined.includes('reef-arch');
}

async function buildContactSheet(browser, rows) {
  const cards = (await Promise.all(rows.map(async (row) => {
    const summary = rowTextureSummary(row);
    return `<section>
      <h2>Biome ${row.biome}: ${htmlEscape(row.name)} / ${htmlEscape(row.label)}</h2>
      <p>requested ${row.depth} m; actual ${row.teleport?.depthMeters ?? 'unknown'} m; active ${htmlEscape(row.snapshot?.environmentVisualProfile?.activeProfile?.activeBand ?? 'unknown')}</p>
      <img src="${await dataUrl(row.colorPath)}" alt="${htmlEscape(row.label)} color">
      <img src="${await dataUrl(row.grayPath)}" alt="${htmlEscape(row.label)} grayscale">
      <p class="meta">anchor assets: ${htmlEscape(summary.anchorAssetIds.join(', ') || 'none')}</p>
      <p class="meta">rendered anchors: ${htmlEscape(summary.renderedAnchorTextureKeys.join(', ') || 'none')}</p>
      <p class="meta">layers: ${htmlEscape(summary.layerAssetIds.join(', ') || 'none')}</p>
      <p class="meta">layer textures: ${htmlEscape(summary.layerTextureKeys.join(', ') || 'none')}</p>
    </section>`;
  }))).join('');
  const html = `<!doctype html>
<meta charset="utf-8">
<style>
body { margin:0; padding:20px; background:#061114; color:#e8f6f7; font:15px/1.35 system-ui, sans-serif; }
main { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:18px; }
section { break-inside:avoid; }
h1 { margin:0 0 16px; font-size:22px; }
h2 { margin:0 0 6px; font-size:17px; }
p { margin:0 0 7px; color:#adc9cd; }
img { display:block; width:100%; margin:0 0 8px; border:1px solid #31545d; background:#020708; }
.meta { font-size:12px; overflow-wrap:anywhere; color:#91aeb4; }
</style>
<h1>Water9 B1 Organic Landmark Replacement Proof</h1>
<main>${cards}</main>`;
  const htmlPath = resolve(outDir, 'water9-biome1-organic-landmark-replacement-contact-sheet.html');
  const pngPath = resolve(outDir, 'water9-biome1-organic-landmark-replacement-contact-sheet.png');
  await writeFile(htmlPath, html, 'utf8');
  const page = await browser.newPage({ viewport: { width: 1800, height: 2600 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: pngPath, fullPage: true });
  await page.close();
  return { htmlPath, pngPath, bytes: await fileBytes(pngPath) };
}

const repoRoot = git(['rev-parse', '--show-toplevel']);
if (repoRoot !== '/mnt/nxt-dev/water9') throw new Error(`WRONG_REPO ${repoRoot}`);

const head = git(['rev-parse', '--short', 'HEAD']);
const gitStatusBefore = git(['status', '--short']);
const port = await choosePort(Number(process.env.WATER9_B1_ORGANIC_PROOF_PORT ?? 5180));
const baseUrl = `http://${host}:${port}/`;
const logs = [];
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (chunk) => logs.push(String(chunk)));
server.stderr.on('data', (chunk) => logs.push(String(chunk)));

let browser;
const rows = [];

try {
  await waitForServer(baseUrl, server, logs);
  browser = await chromium.launch({ headless: true });
  for (const item of captures) {
    console.log(`capturing ${item.label}`);
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    const url = `${baseUrl}?playtest=1&biome=${item.biome}`;
    await page.goto(url);
    await waitForPlaytest(page);
    await command(page, 'start');
    await command(page, 'teleportDepth', item.depth * 6);
    await command(page, 'centerCameraOnPlayer');
    await command(page, 'clearProofOverlays');
    await page.waitForTimeout(1000);
    const snapshot = await page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.());
    const teleport = {
      ok: true,
      requestedDepthMeters: item.depth,
      depthMeters: snapshot?.state?.depth,
      player: snapshot?.player,
      camera: snapshot?.camera,
    };
    const colorPath = resolve(outDir, `water9-${item.label}-normal-gameplay-canvas.png`);
    const grayPath = resolve(outDir, `water9-${item.label}-normal-gameplay-canvas-grayscale.png`);
    await writeCanvasPng(page, colorPath, false);
    await writeCanvasPng(page, grayPath, true);
    const stats = await canvasStats(page);
    const domProbe = await page.evaluate((canvasSelector) => ({
      href: window.location.href,
      title: document.title,
      hasPlaytestApi: Boolean(window.__AQUA_PLAYTEST__?.command),
      canvasCount: document.querySelectorAll(canvasSelector).length,
      bodyText: document.body.innerText.slice(0, 4000),
    }), selector);
    rows.push({
      ...item,
      url,
      selector,
      viewport,
      teleport,
      snapshot,
      textureSummary: null,
      stats,
      domProbe: {
        ...domProbe,
        containsControllerDebugOverlayText: /Controller disconnected|Reconnect and press any controller button/i.test(domProbe.bodyText),
      },
      colorPath,
      grayPath,
      colorBytes: await fileBytes(colorPath),
      grayBytes: await fileBytes(grayPath),
    });
    rows[rows.length - 1].textureSummary = rowTextureSummary(rows[rows.length - 1]);
    await page.close();
  }
  const contactSheet = await buildContactSheet(browser, rows);
  const gitStatusAfter = git(['status', '--short']);
  const proofPath = resolve(outDir, 'water9-biome1-organic-landmark-replacement-proof.json');
  await writeFile(proofPath, `${JSON.stringify({
    schema: 'water9-biome1-organic-landmark-replacement-proof@1',
    timestamp: new Date().toISOString(),
    repoRoot,
    head,
    gitStatusBefore,
    gitStatusAfter,
    baseUrl,
    port,
    selector,
    requiredProof: {
      b1SurfaceShallowColorGrayscale: rows.filter((row) => row.label === 'b1-surface-shallow-depth119').map((row) => [row.colorPath, row.grayPath]).flat(),
      b1UpperShallowAdjacentColorGrayscale: rows.filter((row) => row.label === 'b1-upper-shallow-adjacent-depth180').map((row) => [row.colorPath, row.grayPath]).flat(),
      b2b4PreservationContactSheet: contactSheet.pngPath,
    },
    b1ForbiddenRuntimeTexturesAbsent: rows.filter((row) => row.biome === 1).every(b1ForbiddenTextureAbsent),
    rows,
    contactSheet,
  }, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ ok: true, proofPath, contactSheet, rows: rows.map((row) => ({
    label: row.label,
    colorPath: row.colorPath,
    grayPath: row.grayPath,
    activeBand: row.snapshot?.environmentVisualProfile?.activeProfile?.activeBand,
    textureSummary: row.textureSummary,
    forbiddenRuntimeTexturesAbsent: row.biome === 1 ? b1ForbiddenTextureAbsent(row) : null,
  })) }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await sleep(350);
}

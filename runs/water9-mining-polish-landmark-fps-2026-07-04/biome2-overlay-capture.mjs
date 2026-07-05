import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const repoRoot = '/mnt/nxt-dev/water9';
const outDir = resolve(repoRoot, 'runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-proof');
const host = '127.0.0.1';
const selector = '#game canvas';
const viewport = { width: 1280, height: 800 };

const scenes = [
  { label: 'b2-entry-barge-surface', kind: 'dock', targetDepthMeters: 0, expectedBand: 'surface', waterColumnDisabled: false },
  { label: 'b2-upper-good-landmark-260m', kind: 'depth', targetDepthMeters: 260, expectedBand: 'upper', waterColumnDisabled: false },
  { label: 'b2-deep-overlay-760m', kind: 'depth', targetDepthMeters: 760, expectedBand: 'mid', waterColumnDisabled: false },
  { label: 'b2-deep-overlay-760m-water-column-off', kind: 'reuse', targetDepthMeters: 760, expectedBand: 'mid', waterColumnDisabled: true },
];

await mkdir(outDir, { recursive: true });

function git(args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trimEnd();
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

async function choosePort() {
  for (let port = 5180; port <= 5199; port += 1) {
    if (await isPortFree(port)) return port;
  }
  throw new Error('no free localhost port in allowed range 5180-5199');
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
  const result = await page.evaluate(([commandName, commandValue]) => (
    window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null
  ), [name, value]);
  await page.waitForTimeout(140);
  return result;
}

async function waitForCanvas(page) {
  await page.waitForFunction((canvasSelector) => Boolean(document.querySelector(canvasSelector)), selector, { timeout: 20000 });
}

async function setWaterColumnDisabled(page, disabled) {
  await page.evaluate((value) => {
    window.__WATER_COLUMN_DISABLED__ = value;
  }, disabled);
  await page.waitForTimeout(260);
}

async function stageScene(page, scene) {
  await waitForPlaytest(page);
  await waitForCanvas(page);
  await command(page, 'start');
  await command(page, 'refill');
  await command(page, 'clearProofOverlays');
  let teleport = null;
  if (scene.kind === 'dock') {
    await command(page, 'dock');
  } else if (scene.kind === 'reuse') {
    // Keep the previous normal-play position to isolate the water-column pass.
  } else if (scene.kind === 'exactDepth') {
    teleport = await command(page, 'teleportDepth', scene.targetDepthMeters * 6);
  } else {
    teleport = await command(page, 'teleportToReachableDepth', scene.targetDepthMeters);
    if (!teleport?.ok) {
      teleport = await command(page, 'teleportDepth', scene.targetDepthMeters * 6);
    }
  }
  await command(page, 'centerCameraOnPlayer');
  await setWaterColumnDisabled(page, scene.waterColumnDisabled);
  await page.waitForTimeout(360);
  await command(page, 'centerCameraOnPlayer');
  return teleport;
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

function summarizeSnapshot(snapshot) {
  const profile = snapshot?.environmentVisualProfile;
  const anchors = profile?.anchors?.items ?? [];
  const rendered = profile?.renderedBitmapAnchors ?? [];
  const water = profile?.waterColumnLayers?.items?.filter((item) => item.visible) ?? [];
  return {
    stateDepth: snapshot?.state?.depth ?? null,
    player: snapshot?.player ?? null,
    camera: snapshot?.camera ?? null,
    activeBand: profile?.activeProfile?.activeBand ?? null,
    activeBandBlend: profile?.activeProfile?.activeBandBlend ?? null,
    darkness: profile?.activeProfile?.darkness ?? null,
    postDarknessVeil: profile?.waterColumnLayers?.postDarknessVeil ?? profile?.activeProfile?.postDarknessVeil ?? null,
    anchorCount: anchors.length,
    renderedAnchorCount: rendered.length,
    anchorAssetIds: [...new Set(anchors.map((item) => item.assetId).filter(Boolean))],
    renderedAnchorTextureKeys: [...new Set(rendered.map((item) => item.textureKey).filter(Boolean))],
    renderedAnchorAlphas: rendered.map((item) => item.alpha),
    renderedAnchorScreenBounds: rendered.map((item) => item.screenBounds),
    waterLayerCount: water.length,
    waterLayers: water.map((item) => ({
      id: item.id,
      assetId: item.assetId,
      alpha: item.alpha,
      spriteAlpha: item.spriteAlpha,
      runtimeTextureKey: item.runtimeTextureKey,
      blendMode: item.spriteBlendMode,
      depthGate: item.depthGate,
      bandScale: item.bandScale,
    })),
    scenicLayers: (profile?.layers ?? []).map((item) => ({
      index: item.index,
      textureKey: item.textureKey,
      painterlyAssetId: item.painterlyAssetId,
      alpha: item.alpha,
      tint: item.tint,
    })),
  };
}

async function canvasStats(page) {
  return page.evaluate((canvasSelector) => {
    const canvas = document.querySelector(canvasSelector);
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false };
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = image;
    let samples = 0;
    let lumaSum = 0;
    let lumaSq = 0;
    let satSum = 0;
    let channelDiffSum = 0;
    for (let y = 0; y < height; y += 6) {
      for (let x = 0; x < width; x += 6) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
        lumaSum += luma;
        lumaSq += luma * luma;
        satSum += max === 0 ? 0 : (max - min) / max;
        channelDiffSum += (Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b)) / 3;
        samples += 1;
      }
    }
    const lumaAverage = lumaSum / Math.max(1, samples);
    return {
      exists: true,
      width,
      height,
      lumaAverage: Number(lumaAverage.toFixed(2)),
      lumaStdDev: Number(Math.sqrt(Math.max(0, lumaSq / Math.max(1, samples) - lumaAverage ** 2)).toFixed(2)),
      saturationAverage: Number((satSum / Math.max(1, samples)).toFixed(4)),
      meanChannelDiff: Number((channelDiffSum / Math.max(1, samples)).toFixed(2)),
    };
  }, selector);
}

async function capture(page, scene) {
  let teleport = null;
  let snapshot = null;
  let summary = null;
  let stats = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    teleport = await stageScene(page, scene);
    await waitForCanvas(page);
    await page.waitForTimeout(420);
    snapshot = await page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
    summary = summarizeSnapshot(snapshot);
    stats = await canvasStats(page);
    const depthOk = scene.kind === 'exactDepth'
      ? Math.abs((summary.stateDepth ?? -9999) - scene.targetDepthMeters) <= 2
      : true;
    const bandOk = scene.expectedBand ? summary.activeBand === scene.expectedBand : true;
    const canvasOk = stats.exists && stats.lumaStdDev > 2;
    const anchorOk = scene.label === 'b2-entry-barge-surface' ? summary.renderedAnchorCount > 0 : true;
    if (depthOk && bandOk && canvasOk && anchorOk) break;
    if (attempt === 3) throw new Error(`failed to stage ${scene.label}; got depth ${summary.stateDepth} band ${summary.activeBand} lumaStdDev ${stats.lumaStdDev} anchors ${summary.renderedAnchorCount}`);
    await page.waitForTimeout(500);
  }
  const stem = `${scene.label}${scene.waterColumnDisabled ? '' : '-water-on'}`;
  const colorPath = resolve(outDir, `${stem}.png`);
  const grayPath = resolve(outDir, `${stem}-grayscale.png`);
  await writeCanvasPng(page, colorPath, false);
  await writeCanvasPng(page, grayPath, true);
  return {
    ...scene,
    selector,
    viewport,
    url: page.url(),
    teleport,
    snapshotSummary: summary,
    canvasStats: stats,
    colorPath,
    grayPath,
    colorBytes: await fileBytes(colorPath),
    grayBytes: await fileBytes(grayPath),
  };
}

async function imageDataUrl(path) {
  return `data:image/png;base64,${(await readFile(path)).toString('base64')}`;
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function buildContactSheet(browser, captures) {
  const cards = (await Promise.all(captures.map(async (captureRow) => {
    const summary = captureRow.snapshotSummary;
    const veil = summary.postDarknessVeil;
    return `<section>
      <h2>${htmlEscape(captureRow.label)}</h2>
      <p>target ${captureRow.targetDepthMeters} m; actual ${summary.stateDepth ?? 'unknown'} m; band ${htmlEscape(summary.activeBand ?? 'unknown')}; water ${captureRow.waterColumnDisabled ? 'off' : 'on'}</p>
      <img src="${await imageDataUrl(captureRow.colorPath)}" alt="${htmlEscape(captureRow.label)} color">
      <img src="${await imageDataUrl(captureRow.grayPath)}" alt="${htmlEscape(captureRow.label)} grayscale">
      <p class="meta">anchors ${summary.renderedAnchorCount}/${summary.anchorCount}: ${htmlEscape(summary.renderedAnchorTextureKeys.join(', ') || 'none')}</p>
      <p class="meta">anchor alpha: ${htmlEscape(summary.renderedAnchorAlphas.join(', ') || 'none')}</p>
      <p class="meta">water layers: ${htmlEscape(summary.waterLayers.map((layer) => `${layer.id}:${layer.alpha}`).join(', ') || 'none')}</p>
      <p class="meta">veil: ${htmlEscape(veil ? JSON.stringify(veil) : 'none')}</p>
      <p class="meta">luma/std/sat/channelDiff: ${captureRow.canvasStats.lumaAverage}/${captureRow.canvasStats.lumaStdDev}/${captureRow.canvasStats.saturationAverage}/${captureRow.canvasStats.meanChannelDiff}</p>
    </section>`;
  }))).join('');
  const html = `<!doctype html>
<meta charset="utf-8">
<style>
body { margin:0; padding:20px; background:#051012; color:#e8f7f2; font:15px/1.35 system-ui, sans-serif; }
main { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:18px; }
section { break-inside:avoid; }
h1 { margin:0 0 14px; font-size:22px; }
h2 { margin:0 0 6px; font-size:17px; }
p { margin:0 0 7px; color:#b0c9c8; }
img { display:block; width:100%; margin:0 0 8px; border:1px solid #31585c; background:#020707; }
.meta { font-size:12px; overflow-wrap:anywhere; color:#93afb0; }
</style>
<h1>Water9 Biome 2 Overlay Scout Proof</h1>
<main>${cards}</main>`;
  const htmlPath = resolve(outDir, 'biome2-overlay-contact-sheet.html');
  const pngPath = resolve(outDir, 'biome2-overlay-contact-sheet.png');
  await writeFile(htmlPath, html, 'utf8');
  const page = await browser.newPage({ viewport: { width: 1800, height: 3200 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: pngPath, fullPage: true });
  await page.close();
  return { htmlPath, pngPath, bytes: await fileBytes(pngPath) };
}

const actualRoot = git(['rev-parse', '--show-toplevel']);
if (actualRoot !== repoRoot) throw new Error(`WRONG_REPO ${actualRoot}`);

const head = git(['rev-parse', '--short', 'HEAD']);
const gitStatusBefore = git(['status', '--short']);
const port = await choosePort();
const baseUrl = `http://${host}:${port}/`;
const logs = [];
const server = spawn(resolve(repoRoot, 'node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: repoRoot,
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (chunk) => logs.push(String(chunk)));
server.stderr.on('data', (chunk) => logs.push(String(chunk)));

let browser;
const errors = [];
const captures = [];

try {
  await waitForServer(baseUrl, server, logs);
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
      errors.push({ type: 'console', text: message.text() });
    }
  });

  await page.goto(`${baseUrl}?playtest=1&biome=2&perf=1`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await waitForPlaytest(page);

  for (const scene of scenes) captures.push(await capture(page, scene));

  await page.close();
  const contactSheet = await buildContactSheet(browser, captures);
  const gitStatusAfter = git(['status', '--short']);
  const proofPath = resolve(outDir, 'biome2-overlay-proof.json');
  const report = {
    schema: 'water9/biome2-overlay-scout-proof@1',
    timestamp: new Date().toISOString(),
    repoRoot,
    head,
    gitStatusBefore,
    gitStatusAfter,
    baseUrl,
    port,
    selector,
    viewport,
    errors,
    serverLogs: logs.slice(-50),
    captures,
    contactSheet,
  };
  await writeFile(proofPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    ok: errors.length === 0,
    proofPath,
    contactSheet,
    port,
    captures: captures.map((item) => ({
      label: item.label,
      colorPath: item.colorPath,
      grayPath: item.grayPath,
      depth: item.snapshotSummary.stateDepth,
      activeBand: item.snapshotSummary.activeBand,
      waterColumnDisabled: item.waterColumnDisabled,
      renderedAnchorTextureKeys: item.snapshotSummary.renderedAnchorTextureKeys,
      renderedAnchorAlphas: item.snapshotSummary.renderedAnchorAlphas,
      waterLayers: item.snapshotSummary.waterLayers,
      stats: item.canvasStats,
    })),
  }, null, 2));
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  const proofPath = resolve(outDir, 'biome2-overlay-proof.failed.json');
  await writeFile(proofPath, `${JSON.stringify({
    schema: 'water9/biome2-overlay-scout-proof@1',
    timestamp: new Date().toISOString(),
    repoRoot,
    head,
    port,
    errors,
    serverLogs: logs.slice(-80),
    captures,
  }, null, 2)}\n`, 'utf8');
  throw error;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await sleep(350);
}

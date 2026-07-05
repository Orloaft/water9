import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = resolve('runs/water9-mining-polish-landmark-fps-2026-07-04');
const host = '127.0.0.1';
const selector = '#game canvas';
const viewport = { width: 1280, height: 800 };
const scenes = [
  { label: 'b1-surface-119', targetDepthMeters: 119 },
  { label: 'b1-upper-180', targetDepthMeters: 180 },
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
  const result = await page.evaluate(([commandName, commandValue]) => (
    window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null
  ), [name, value]);
  await page.waitForTimeout(120);
  return result;
}

async function stageNormalDepth(page, targetDepthMeters) {
  await command(page, 'start');
  await command(page, 'refill');
  await command(page, 'teleportDepth', targetDepthMeters * 6);
  await command(page, 'centerCameraOnPlayer');
  await command(page, 'clearProofOverlays');
  await page.waitForTimeout(260);
  await command(page, 'centerCameraOnPlayer');
}

async function setWaterColumnDisabled(page, disabled) {
  await page.evaluate((value) => {
    window.__WATER_COLUMN_DISABLED__ = value;
  }, disabled);
  await page.waitForTimeout(240);
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
    anchorCount: anchors.length,
    renderedAnchorCount: rendered.length,
    anchorAssetIds: [...new Set(anchors.map((item) => item.assetId).filter(Boolean))],
    renderedAnchorTextureKeys: [...new Set(rendered.map((item) => item.textureKey).filter(Boolean))],
    renderedAnchorScreenBounds: rendered.map((item) => item.screenBounds),
    renderedAnchorAlphas: rendered.map((item) => item.alpha),
    waterLayerCount: water.length,
    waterLayers: water.map((item) => ({
      id: item.id,
      assetId: item.assetId,
      alpha: item.alpha,
      spriteAlpha: item.spriteAlpha,
      tileScaleX: item.tileScaleX,
      tileScaleY: item.tileScaleY,
      runtimeTextureKey: item.runtimeTextureKey,
    })),
    scenicLayers: (profile?.layers ?? []).map((item) => ({
      index: item.index,
      textureKey: item.textureKey,
      painterlyAssetId: item.painterlyAssetId,
      alpha: item.alpha,
      tileScale: item.tileScale,
      activeRepeatMode: item.activeRepeatMode,
      scenicRepeatYViolation: item.scenicRepeatYViolation,
      obviousSingleViewportYRepeat: item.obviousSingleViewportYRepeat,
      yRepeatRiskFromMetadata: item.yRepeatRiskFromMetadata,
    })),
  };
}

async function canvasDiagnostics(page) {
  return page.evaluate((canvasSelector) => {
    const canvas = document.querySelector(canvasSelector);
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false };
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = image;
    const lumaAt = (x, y) => {
      const i = (y * width + x) * 4;
      return data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
    };
    let min = 255;
    let max = 0;
    let sum = 0;
    let sumSq = 0;
    let samples = 0;
    for (let y = 0; y < height; y += 8) {
      for (let x = 0; x < width; x += 8) {
        const luma = lumaAt(x, y);
        min = Math.min(min, luma);
        max = Math.max(max, luma);
        sum += luma;
        sumSq += luma * luma;
        samples += 1;
      }
    }

    const y0 = Math.round(height * 0.08);
    const y1 = Math.round(height * 0.68);
    const x0 = Math.round(width * 0.04);
    const x1 = Math.round(width * 0.96);
    const columnMeans = [];
    for (let x = x0; x < x1; x += 2) {
      let col = 0;
      let n = 0;
      for (let y = y0; y < y1; y += 6) {
        if (x > width * 0.42 && x < width * 0.58 && y > height * 0.33 && y < height * 0.62) continue;
        col += lumaAt(x, y);
        n += 1;
      }
      columnMeans.push({ x, value: col / Math.max(1, n) });
    }
    const rowMeans = [];
    for (let y = y0; y < y1; y += 2) {
      let row = 0;
      let n = 0;
      for (let x = x0; x < x1; x += 6) {
        if (x > width * 0.42 && x < width * 0.58 && y > height * 0.33 && y < height * 0.62) continue;
        row += lumaAt(x, y);
        n += 1;
      }
      rowMeans.push({ y, value: row / Math.max(1, n) });
    }
    const topGradients = (items, key) => items
      .slice(1)
      .map((item, index) => ({
        [key]: item[key],
        delta: Math.abs(item.value - items[index].value),
        from: Number(items[index].value.toFixed(2)),
        to: Number(item.value.toFixed(2)),
      }))
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 8)
      .map((item) => ({ ...item, delta: Number(item.delta.toFixed(2)) }));

    return {
      exists: true,
      width,
      height,
      lumaMin: Math.round(min),
      lumaMax: Math.round(max),
      lumaAverage: Number((sum / Math.max(1, samples)).toFixed(2)),
      lumaStdDev: Number(Math.sqrt(Math.max(0, sumSq / Math.max(1, samples) - (sum / Math.max(1, samples)) ** 2)).toFixed(2)),
      backgroundScanRegion: { x0, x1, y0, y1 },
      strongestVerticalMeanEdges: topGradients(columnMeans, 'x'),
      strongestHorizontalMeanEdges: topGradients(rowMeans, 'y'),
    };
  }, selector);
}

async function measureRaf(page, label, durationMs = 1800) {
  return page.evaluate(async ({ label: measureLabel, duration }) => {
    const deltas = [];
    const start = performance.now();
    let last = await new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
    while (performance.now() - start < duration) {
      const now = await new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
      deltas.push(now - last);
      last = now;
    }
    const sorted = [...deltas].sort((a, b) => a - b);
    const avg = deltas.reduce((sum, value) => sum + value, 0) / Math.max(1, deltas.length);
    const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)))] ?? 0;
    return {
      label: measureLabel,
      frames: deltas.length,
      avgFrameMs: Number(avg.toFixed(2)),
      p95FrameMs: Number(percentile(0.95).toFixed(2)),
      maxFrameMs: Number((sorted[sorted.length - 1] ?? 0).toFixed(2)),
      minFpsApprox: Number((1000 / Math.max(1, sorted[sorted.length - 1] ?? 1)).toFixed(1)),
      avgFpsApprox: Number((1000 / Math.max(1, avg)).toFixed(1)),
    };
  }, { label, duration: durationMs });
}

async function capture(page, scene, waterColumnDisabled) {
  await stageNormalDepth(page, scene.targetDepthMeters);
  await setWaterColumnDisabled(page, waterColumnDisabled);
  const mode = waterColumnDisabled ? 'water-off' : 'water-on';
  const snapshot = await page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
  const summary = summarizeSnapshot(snapshot);
  const colorPath = resolve(outDir, `${scene.label}-${mode}-normal-canvas.png`);
  const grayPath = resolve(outDir, `${scene.label}-${mode}-normal-canvas-grayscale.png`);
  await writeCanvasPng(page, colorPath, false);
  await writeCanvasPng(page, grayPath, true);
  const diagnostics = await canvasDiagnostics(page);
  return {
    ...scene,
    mode,
    waterColumnDisabled,
    url: page.url(),
    selector,
    viewport,
    snapshotSummary: summary,
    diagnostics,
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

async function buildContactSheet(browser, captures, perfMeasures) {
  const cards = (await Promise.all(captures.map(async (captureRow) => {
    const summary = captureRow.snapshotSummary;
    return `<section>
      <h2>${htmlEscape(captureRow.label)} ${htmlEscape(captureRow.mode)}</h2>
      <p>target ${captureRow.targetDepthMeters} m; actual ${summary.stateDepth ?? 'unknown'} m; band ${htmlEscape(summary.activeBand ?? 'unknown')}</p>
      <img src="${await imageDataUrl(captureRow.colorPath)}" alt="${htmlEscape(captureRow.label)} ${htmlEscape(captureRow.mode)} color">
      <img src="${await imageDataUrl(captureRow.grayPath)}" alt="${htmlEscape(captureRow.label)} ${htmlEscape(captureRow.mode)} grayscale">
      <p class="meta">anchors ${summary.renderedAnchorCount}/${summary.anchorCount}: ${htmlEscape(summary.renderedAnchorTextureKeys.join(', ') || 'none')}</p>
      <p class="meta">anchor alpha: ${htmlEscape(summary.renderedAnchorAlphas.join(', ') || 'none')}</p>
      <p class="meta">water layers: ${htmlEscape(summary.waterLayers.map((layer) => `${layer.id}:${layer.alpha}`).join(', ') || 'none')}</p>
      <p class="meta">luma avg/std: ${captureRow.diagnostics.lumaAverage}/${captureRow.diagnostics.lumaStdDev}</p>
    </section>`;
  }))).join('');
  const perf = perfMeasures.map((item) => (
    `<li>${htmlEscape(item.label)}: ${item.avgFpsApprox} avg fps, ${item.avgFrameMs} avg ms, ${item.p95FrameMs} p95 ms, ${item.maxFrameMs} max ms (${item.frames} frames)</li>`
  )).join('');
  const html = `<!doctype html>
<meta charset="utf-8">
<style>
body { margin:0; padding:20px; background:#061114; color:#e8f6f7; font:15px/1.35 system-ui, sans-serif; }
main { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:18px; }
section { break-inside:avoid; }
h1 { margin:0 0 12px; font-size:22px; }
h2 { margin:0 0 6px; font-size:17px; }
p, li { margin:0 0 7px; color:#adc9cd; }
img { display:block; width:100%; margin:0 0 8px; border:1px solid #31545d; background:#020708; }
.meta { font-size:12px; overflow-wrap:anywhere; color:#91aeb4; }
ul { margin:0 0 18px; padding-left:20px; }
</style>
<h1>Water9 B1 Landmark/FPS Scout Proof</h1>
<ul>${perf}</ul>
<main>${cards}</main>`;
  const htmlPath = resolve(outDir, 'landmark-fps-contact-sheet.html');
  const pngPath = resolve(outDir, 'landmark-fps-contact-sheet.png');
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
const port = await choosePort(Number(process.env.WATER9_LANDMARK_FPS_PORT ?? 5180));
const baseUrl = `http://${host}:${port}/`;
const logs = [];
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (chunk) => logs.push(String(chunk)));
server.stderr.on('data', (chunk) => logs.push(String(chunk)));

let browser;
const errors = [];
const captures = [];
const perfMeasures = [];

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
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
  });

  await page.goto(`${baseUrl}?playtest=1&biome=1&perf=1`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await waitForPlaytest(page);

  for (const scene of scenes) {
    captures.push(await capture(page, scene, true));
    captures.push(await capture(page, scene, false));
  }

  await stageNormalDepth(page, 180);
  await setWaterColumnDisabled(page, true);
  perfMeasures.push(await measureRaf(page, 'b1-upper-180-water-off'));
  await stageNormalDepth(page, 180);
  await setWaterColumnDisabled(page, false);
  perfMeasures.push(await measureRaf(page, 'b1-upper-180-water-on'));

  await page.close();
  const contactSheet = await buildContactSheet(browser, captures, perfMeasures);
  const gitStatusAfter = git(['status', '--short']);
  const proofPath = resolve(outDir, 'landmark-fps-proof.json');
  const report = {
    schema: 'water9/landmark-fps-scout-proof@1',
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
    serverLogs: logs.slice(-40),
    perfMeasures,
    captures,
    contactSheet,
  };
  await writeFile(proofPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    ok: errors.length === 0,
    proofPath,
    contactSheet,
    port,
    perfMeasures,
    captures: captures.map((item) => ({
      label: item.label,
      mode: item.mode,
      colorPath: item.colorPath,
      grayPath: item.grayPath,
      stateDepth: item.snapshotSummary.stateDepth,
      activeBand: item.snapshotSummary.activeBand,
      renderedAnchorCount: item.snapshotSummary.renderedAnchorCount,
      waterLayerCount: item.snapshotSummary.waterLayerCount,
    })),
  }, null, 2));
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  const proofPath = resolve(outDir, 'landmark-fps-proof.failed.json');
  await writeFile(proofPath, `${JSON.stringify({
    schema: 'water9/landmark-fps-scout-proof@1',
    timestamp: new Date().toISOString(),
    repoRoot,
    head,
    port,
    errors,
    serverLogs: logs.slice(-80),
    captures,
    perfMeasures,
  }, null, 2)}\n`, 'utf8');
  throw error;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await sleep(350);
}

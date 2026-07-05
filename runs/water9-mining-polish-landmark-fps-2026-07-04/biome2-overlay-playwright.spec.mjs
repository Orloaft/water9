import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { expect, test } from 'playwright/test';

const repoRoot = '/mnt/nxt-dev/water9';
const runDir = resolve(repoRoot, 'runs/water9-mining-polish-landmark-fps-2026-07-04');
const outDir = resolve(runDir, 'biome2-overlay-playwright-proof');
const selector = '#game canvas';
const host = '127.0.0.1';
const viewport = { width: 1280, height: 800 };
const playwrightCommand = 'npx playwright test runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright.spec.mjs --reporter=list --workers=1 --timeout=120000 --output runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright-output';

const scenes = [
  {
    label: 'b2-gate-near-barge-surface',
    finding: 'near-barge',
    targetDepthMeters: 0,
    expectedBand: 'surface',
    stage: 'dock',
    minLumaStdDev: 6,
    minBytes: 120000,
  },
  {
    label: 'b2-gate-good-landmark-reachable-260m',
    finding: 'good-landmark-depth',
    targetDepthMeters: 260,
    expectedBand: 'upper',
    stage: 'reachable',
    minLumaStdDev: 6,
    minBytes: 120000,
  },
  {
    label: 'b2-gate-threshold-mid-530m',
    finding: 'threshold',
    targetDepthMeters: 530,
    expectedBand: 'mid',
    stage: 'reachableImmediate',
    minLumaStdDev: 4,
    minBytes: 120000,
  },
  {
    label: 'b2-gate-deep-overlay-760m',
    finding: 'deep-overlay',
    targetDepthMeters: 760,
    expectedBand: 'mid',
    stage: 'reachableImmediate',
    minLumaStdDev: 4,
    minBytes: 120000,
  },
];

test.setTimeout(120000);

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
      // Vite may still be starting.
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
  await page.waitForTimeout(180);
  return result;
}

async function commandImmediate(page, name, value) {
  return page.evaluate(([commandName, commandValue]) => (
    window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null
  ), [name, value]);
}

async function setWaterColumnDisabled(page, disabled) {
  await page.evaluate((value) => {
    window.__WATER_COLUMN_DISABLED__ = value;
  }, disabled);
  await page.waitForTimeout(260);
}

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

function summarizeSnapshot(raw) {
  const profile = raw?.environmentVisualProfile;
  const anchors = profile?.anchors?.items ?? [];
  const rendered = profile?.renderedBitmapAnchors ?? [];
  const water = profile?.waterColumnLayers?.items?.filter((item) => item.visible) ?? [];
  return {
    stateDepth: raw?.state?.depth ?? null,
    player: raw?.player ?? null,
    camera: raw?.camera ?? null,
    activeBand: profile?.activeProfile?.activeBand ?? null,
    activeBandBlend: profile?.activeProfile?.activeBandBlend ?? null,
    darkness: profile?.activeProfile?.darkness ?? null,
    postDarknessVeil: profile?.waterColumnLayers?.postDarknessVeil ?? profile?.activeProfile?.postDarknessVeil ?? null,
    anchorCount: anchors.length,
    renderedAnchorCount: rendered.length,
    renderedAnchorTextureKeys: [...new Set(rendered.map((item) => item.textureKey).filter(Boolean))],
    renderedAnchorAlphas: rendered.map((item) => item.alpha),
    renderedAnchorScreenBounds: rendered.map((item) => item.screenBounds),
    waterLayerCount: water.length,
    perf: raw?.perf ?? null,
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

async function measureRaf(page, label, durationMs = 1800) {
  return page.evaluate(async ({ label: measureLabel, duration }) => {
    const summarize = () => {
      const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
      return {
        depthMeters: snap?.state?.depth ?? null,
        activeBand: snap?.environmentVisualProfile?.activeProfile?.activeBand ?? null,
      };
    };
    const deltas = [];
    const startScene = summarize();
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
    const max = sorted[sorted.length - 1] ?? 0;
    const framesOver20ms = deltas.filter((value) => value > 20).length;
    const framesOver33ms = deltas.filter((value) => value > 33.34).length;
    const obvious60fpsMiss = avg > 18.5 || percentile(0.95) > 24 || framesOver33ms > 0 || framesOver20ms / Math.max(1, deltas.length) > 0.1;
    const endScene = summarize();
    return {
      label: measureLabel,
      durationMs: duration,
      startScene,
      endScene,
      frames: deltas.length,
      avgFrameMs: Number(avg.toFixed(2)),
      p95FrameMs: Number(percentile(0.95).toFixed(2)),
      p99FrameMs: Number(percentile(0.99).toFixed(2)),
      maxFrameMs: Number(max.toFixed(2)),
      avgFpsApprox: Number((1000 / Math.max(1, avg)).toFixed(1)),
      minFpsApprox: Number((1000 / Math.max(1, max)).toFixed(1)),
      framesOver20ms,
      framesOver33ms,
      over20msPercent: Number(((framesOver20ms / Math.max(1, deltas.length)) * 100).toFixed(1)),
      over33msPercent: Number(((framesOver33ms / Math.max(1, deltas.length)) * 100).toFixed(1)),
      obvious60fpsMiss,
      verdict: obvious60fpsMiss ? 'flagged-obvious-60fps-miss' : 'no-obvious-60fps-miss',
    };
  }, { label, duration: durationMs });
}

async function writeGrayscaleCanvas(page, path) {
  const dataUrl = await page.evaluate((canvasSelector) => {
    const canvas = document.querySelector(canvasSelector);
    if (!canvas) throw new Error(`missing canvas ${canvasSelector}`);
    const output = document.createElement('canvas');
    output.width = canvas.width;
    output.height = canvas.height;
    const context = output.getContext('2d', { willReadFrequently: true });
    context.drawImage(canvas, 0, 0);
    const image = context.getImageData(0, 0, output.width, output.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const luma = Math.round(image.data[i] * 0.2126 + image.data[i + 1] * 0.7152 + image.data[i + 2] * 0.0722);
      image.data[i] = luma;
      image.data[i + 1] = luma;
      image.data[i + 2] = luma;
    }
    context.putImageData(image, 0, 0);
    return output.toDataURL('image/png');
  }, selector);
  await writeFile(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
}

async function stageScene(page, scene) {
  await waitForPlaytest(page);
  await command(page, 'start');
  await command(page, 'refill');
  await command(page, 'clearProofOverlays');
  await setWaterColumnDisabled(page, false);

  let teleport = null;
  let stageUsed = scene.stage;
  if (scene.stage === 'dock') {
    await command(page, 'dock');
  } else if (scene.stage === 'reachable') {
    teleport = await command(page, 'teleportToReachableDepth', scene.targetDepthMeters);
  } else if (scene.stage === 'reachableImmediate') {
    teleport = await commandImmediate(page, 'teleportToReachableDepth', scene.targetDepthMeters);
    await commandImmediate(page, 'centerCameraOnPlayer');
    await commandImmediate(page, 'terrainLookReview');
    stageUsed = 'reachableImmediate';
  } else if (scene.stage === 'exact') {
    teleport = await command(page, 'teleportDepth', scene.targetDepthMeters * 6);
  } else if (scene.stage === 'exactThenReachable') {
    teleport = await commandImmediate(page, 'teleportDepth', scene.targetDepthMeters * 6);
    await commandImmediate(page, 'centerCameraOnPlayer');
    await commandImmediate(page, 'terrainLookReview');
    stageUsed = 'exact';
  }

  if (stageUsed !== 'exact' && stageUsed !== 'reachableImmediate') {
    await command(page, 'centerCameraOnPlayer');
    await page.waitForTimeout(520);
    await command(page, 'centerCameraOnPlayer');
  }

  let summary = summarizeSnapshot(await snapshot(page));
  let stats = await canvasStats(page);
  if (
    scene.stage === 'exactThenReachable'
    && (
      !stats.exists
      || stats.lumaStdDev < scene.minLumaStdDev
      || Math.abs((summary.stateDepth ?? 0) - scene.targetDepthMeters) > 8
    )
  ) {
    teleport = await commandImmediate(page, 'teleportToReachableDepth', scene.targetDepthMeters);
    stageUsed = 'reachableImmediateFallback';
    await commandImmediate(page, 'centerCameraOnPlayer');
    await commandImmediate(page, 'terrainLookReview');
    summary = summarizeSnapshot(await snapshot(page));
    stats = await canvasStats(page);
  }

  return { teleport, stageUsed, snapshotSummary: summary, canvasStats: stats };
}

async function captureScene(page, scene) {
  const staged = await stageScene(page, scene);
  await expect(page.locator(selector)).toBeVisible();

  expect(staged.snapshotSummary.activeBand, `${scene.label} active band`).toBe(scene.expectedBand);
  expect(staged.canvasStats.exists, `${scene.label} canvas exists`).toBe(true);
  expect(staged.canvasStats.width, `${scene.label} canvas width`).toBeGreaterThanOrEqual(960);
  expect(staged.canvasStats.height, `${scene.label} canvas height`).toBeGreaterThanOrEqual(640);
  expect(staged.canvasStats.lumaStdDev, `${scene.label} non-flat canvas`).toBeGreaterThan(scene.minLumaStdDev);

  if (scene.stage === 'exact') {
    expect(Math.abs(staged.snapshotSummary.stateDepth - scene.targetDepthMeters), `${scene.label} exact depth`).toBeLessThanOrEqual(2);
  }
  if (scene.finding === 'near-barge') {
    expect(staged.snapshotSummary.renderedAnchorCount, `${scene.label} landmark visible`).toBeGreaterThan(0);
  }
  if (scene.finding === 'deep-overlay' || scene.finding === 'threshold') {
    expect(staged.snapshotSummary.waterLayerCount, `${scene.label} water layers visible`).toBeGreaterThan(0);
  }

  const colorPath = resolve(outDir, `${scene.label}-water-on.png`);
  const grayPath = resolve(outDir, `${scene.label}-water-on-grayscale.png`);
  await page.locator(selector).screenshot({ path: colorPath });
  await writeGrayscaleCanvas(page, grayPath);
  const frameCadence = await measureRaf(page, scene.label);
  const colorBytes = await fileBytes(colorPath);
  const grayBytes = await fileBytes(grayPath);
  expect(colorBytes, `${scene.label} screenshot bytes`).toBeGreaterThan(scene.minBytes);
  expect(grayBytes, `${scene.label} grayscale bytes`).toBeGreaterThan(20000);

  return {
    ...scene,
    selector,
    viewport,
    waterColumnDisabled: false,
    colorPath,
    grayPath,
    colorBytes,
    grayBytes,
    frameCadence,
    ...staged,
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

async function buildContactSheet(page, captures) {
  const cards = (await Promise.all(captures.map(async (capture) => {
    const summary = capture.snapshotSummary;
    return `<section>
      <h2>${htmlEscape(capture.finding)}: ${htmlEscape(capture.label)}</h2>
      <p>target ${capture.targetDepthMeters} m; actual ${summary.stateDepth ?? 'unknown'} m; band ${htmlEscape(summary.activeBand ?? 'unknown')}; stage ${htmlEscape(capture.stageUsed)}</p>
      <img src="${await imageDataUrl(capture.colorPath)}" alt="${htmlEscape(capture.label)} color">
      <img src="${await imageDataUrl(capture.grayPath)}" alt="${htmlEscape(capture.label)} grayscale">
      <p class="meta">anchors ${summary.renderedAnchorCount}/${summary.anchorCount}: ${htmlEscape(summary.renderedAnchorTextureKeys.join(', ') || 'none')}</p>
      <p class="meta">anchor alpha: ${htmlEscape(summary.renderedAnchorAlphas.join(', ') || 'none')}</p>
      <p class="meta">water layers: ${htmlEscape(summary.waterLayers.map((layer) => `${layer.id}:${layer.alpha}`).join(', ') || 'none')}</p>
      <p class="meta">veil: ${htmlEscape(summary.postDarknessVeil ? JSON.stringify(summary.postDarknessVeil) : 'none')}</p>
      <p class="meta">luma/std/sat/channelDiff: ${capture.canvasStats.lumaAverage}/${capture.canvasStats.lumaStdDev}/${capture.canvasStats.saturationAverage}/${capture.canvasStats.meanChannelDiff}</p>
      <p class="meta">frame cadence: ${capture.frameCadence.avgFpsApprox} avg fps; ${capture.frameCadence.avgFrameMs} avg ms; ${capture.frameCadence.p95FrameMs} p95 ms; ${capture.frameCadence.maxFrameMs} max ms; ${htmlEscape(capture.frameCadence.verdict)}; sampled depth ${capture.frameCadence.startScene.depthMeters ?? 'unknown'}-${capture.frameCadence.endScene.depthMeters ?? 'unknown'} m</p>
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
<h1>Water9 Biome 2 Overlay Playwright Acceptance Gate</h1>
<p>All color images are Playwright element screenshots of live normal-play ${selector}.</p>
<main>${cards}</main>`;
  const htmlPath = resolve(outDir, 'biome2-overlay-playwright-contact-sheet.html');
  const pngPath = resolve(outDir, 'biome2-overlay-playwright-contact-sheet.png');
  await writeFile(htmlPath, html, 'utf8');
  await page.setViewportSize({ width: 1800, height: 3200 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: pngPath, fullPage: true });
  return { htmlPath, pngPath, bytes: await fileBytes(pngPath) };
}

test('captures normal-play biome 2 overlay proof from #game canvas', async ({ page }) => {
  await mkdir(outDir, { recursive: true });

  const actualRoot = git(['rev-parse', '--show-toplevel']);
  expect(actualRoot, 'repo root').toBe(repoRoot);
  const head = git(['rev-parse', '--short', 'HEAD']);
  const gitStatusBefore = git(['status', '--short']);
  const port = await choosePort();
  const baseUrl = `http://${host}:${port}/`;
  const serverLogs = [];
  const browserErrors = [];
  const server = spawn(resolve(repoRoot, 'node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
  server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

  page.on('pageerror', (error) => browserErrors.push({ type: 'pageerror', text: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
      browserErrors.push({ type: 'console', text: message.text() });
    }
  });

  const captures = [];
  try {
    await page.setViewportSize(viewport);
    await waitForServer(baseUrl, server, serverLogs);
    await page.goto(`${baseUrl}?playtest=1&biome=2&perf=1`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await waitForPlaytest(page);

    for (const scene of scenes) {
      captures.push(await captureScene(page, scene));
    }

    const contactSheet = await buildContactSheet(page, captures);
    const gitStatusAfter = git(['status', '--short']);
    const proofPath = resolve(outDir, 'biome2-overlay-playwright-proof.json');
    const report = {
      schema: 'water9/biome2-overlay-playwright-proof@1',
      timestamp: new Date().toISOString(),
      playwrightCommand,
      repoRoot,
      head,
      gitStatusBefore,
      gitStatusAfter,
      port,
      baseUrl,
      selector,
      viewport,
      browserErrors,
      serverLogs: serverLogs.slice(-80),
      captures,
      frameCadenceSummary: captures.map((item) => item.frameCadence),
      contactSheet,
    };
    await writeFile(proofPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({
      ok: true,
      proofPath,
      contactSheet,
      captures: captures.map((item) => ({
        label: item.label,
        finding: item.finding,
        colorPath: item.colorPath,
        grayPath: item.grayPath,
        targetDepthMeters: item.targetDepthMeters,
        actualDepthMeters: item.snapshotSummary.stateDepth,
        activeBand: item.snapshotSummary.activeBand,
        stageUsed: item.stageUsed,
        canvasStats: item.canvasStats,
        frameCadence: item.frameCadence,
        colorBytes: item.colorBytes,
      })),
    }, null, 2));

    expect(browserErrors, 'browser errors').toEqual([]);
  } finally {
    server.kill('SIGTERM');
    await sleep(350);
  }
});

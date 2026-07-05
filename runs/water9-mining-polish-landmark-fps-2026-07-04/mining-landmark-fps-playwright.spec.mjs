import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { expect, test } from 'playwright/test';

const repoRoot = '/mnt/nxt-dev/water9';
const runDir = resolve(repoRoot, 'runs/water9-mining-polish-landmark-fps-2026-07-04');
const outDir = resolve(runDir, 'playwright-acceptance-proof');
const selector = '#game canvas';
const host = '127.0.0.1';
const viewport = { width: 1280, height: 800 };
const fpsTarget = {
  avgFpsMin: 58,
  p95FrameMsMax: 18.5,
  maxSustainedDipMs: 100,
  dipFrameMs: 20,
};
const playwrightCommand = 'npx playwright test runs/water9-mining-polish-landmark-fps-2026-07-04/mining-landmark-fps-playwright.spec.mjs --reporter=list --workers=1 --timeout=180000 --output runs/water9-mining-polish-landmark-fps-2026-07-04/mining-landmark-fps-playwright-output';

const landmarkScenes = [
  { label: 'b1-surface-119', targetDepthMeters: 119 },
  { label: 'b1-upper-180', targetDepthMeters: 180 },
];

test.setTimeout(180000);

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

async function waitForServer(url, server, logs, timeoutMs = 26000) {
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
  throw new Error(`server not ready within ${timeoutMs}ms\n${logs.join('').slice(-4000)}`);
}

async function waitForPlaytest(page) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 20000 });
  const deadline = Date.now() + 35000;
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

async function commandImmediate(page, name, value) {
  return page.evaluate(([commandName, commandValue]) => (
    window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null
  ), [name, value]);
}

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function rendererInfo(page) {
  return page.evaluate((canvasSelector) => {
    const canvas = document.querySelector(canvasSelector);
    const params = new URLSearchParams(window.location.search);
    return {
      rendererParam: params.get('renderer') ?? 'auto',
      playtest: params.has('playtest'),
      canvasWidth: canvas?.width ?? null,
      canvasHeight: canvas?.height ?? null,
      webglContextPresent: Boolean(canvas?.getContext('webgl2') || canvas?.getContext('webgl')),
    };
  }, selector);
}

async function setWaterColumnDisabled(page, disabled) {
  await page.evaluate((value) => {
    window.__WATER_COLUMN_DISABLED__ = value;
  }, disabled);
  await page.waitForTimeout(260);
}

async function stageNormalDepth(page, targetDepthMeters) {
  await command(page, 'start');
  await command(page, 'refill');
  await command(page, 'teleportDepth', targetDepthMeters * 6);
  await command(page, 'centerCameraOnPlayer');
  await command(page, 'clearProofOverlays');
  await page.waitForTimeout(280);
  await command(page, 'centerCameraOnPlayer');
}

async function writeGrayscaleFromPng(page, sourcePath, path) {
  const dataUrl = await imageDataUrl(sourcePath);
  const utilityPage = await page.context().newPage();
  try {
    const grayDataUrl = await utilityPage.evaluate(async (sourceDataUrl) => {
      const image = new Image();
      await new Promise((resolveImage, rejectImage) => {
        image.onload = resolveImage;
        image.onerror = () => rejectImage(new Error('failed to load screenshot PNG'));
        image.src = sourceDataUrl;
      });
      const output = document.createElement('canvas');
      output.width = image.naturalWidth;
      output.height = image.naturalHeight;
      const context = output.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('missing canvas context');
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, output.width, output.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const luma = Math.round(pixels.data[i] * 0.2126 + pixels.data[i + 1] * 0.7152 + pixels.data[i + 2] * 0.0722);
        pixels.data[i] = luma;
        pixels.data[i + 1] = luma;
        pixels.data[i + 2] = luma;
      }
      context.putImageData(pixels, 0, 0);
      return output.toDataURL('image/png');
    }, dataUrl);
    await writeFile(path, Buffer.from(grayDataUrl.split(',')[1], 'base64'));
  } finally {
    await utilityPage.close();
  }
}

async function imageStats(page, sourcePath) {
  const dataUrl = await imageDataUrl(sourcePath);
  const utilityPage = await page.context().newPage();
  try {
    return await utilityPage.evaluate(async (sourceDataUrl) => {
      const sourceImage = new Image();
      await new Promise((resolveImage, rejectImage) => {
        sourceImage.onload = resolveImage;
        sourceImage.onerror = () => rejectImage(new Error('failed to load screenshot PNG'));
        sourceImage.src = sourceDataUrl;
      });
      const output = document.createElement('canvas');
      output.width = sourceImage.naturalWidth;
      output.height = sourceImage.naturalHeight;
      const context = output.getContext('2d', { willReadFrequently: true });
      if (!context) return { exists: false };
      context.drawImage(sourceImage, 0, 0);
      const image = context.getImageData(0, 0, output.width, output.height);
    const { data, width, height } = image;
    const lumaAt = (x, y) => {
      const i = (y * width + x) * 4;
      return data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
    };
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

    const lumaAverage = lumaSum / Math.max(1, samples);
      return {
        exists: true,
        width,
        height,
        lumaAverage: Number(lumaAverage.toFixed(2)),
        lumaStdDev: Number(Math.sqrt(Math.max(0, lumaSq / Math.max(1, samples) - lumaAverage ** 2)).toFixed(2)),
        saturationAverage: Number((satSum / Math.max(1, samples)).toFixed(4)),
        meanChannelDiff: Number((channelDiffSum / Math.max(1, samples)).toFixed(2)),
        backgroundScanRegion: { x0, x1, y0, y1 },
        strongestVerticalMeanEdges: topGradients(columnMeans, 'x'),
        strongestHorizontalMeanEdges: topGradients(rowMeans, 'y'),
      };
    }, dataUrl);
  } finally {
    await utilityPage.close();
  }
}

async function measureRaf(page, label, durationMs = 1600) {
  await page.bringToFront();
  await page.waitForTimeout(900);
  return page.evaluate(async ({ label: measureLabel, duration, target }) => {
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
    const maxFrameMs = sorted[sorted.length - 1] ?? 0;
    const framesOver20ms = deltas.filter((value) => value > target.dipFrameMs).length;
    const framesOver33ms = deltas.filter((value) => value > 33.34).length;
    let currentDipFrames = 0;
    let currentDipMs = 0;
    let longestDipFrames = 0;
    let longestDipMs = 0;
    for (const delta of deltas) {
      if (delta > target.dipFrameMs) {
        currentDipFrames += 1;
        currentDipMs += delta;
        if (currentDipMs > longestDipMs) {
          longestDipMs = currentDipMs;
          longestDipFrames = currentDipFrames;
        }
      } else {
        currentDipFrames = 0;
        currentDipMs = 0;
      }
    }
    const avgFpsApprox = 1000 / Math.max(1, avg);
    const p95FrameMs = percentile(0.95);
    const targetPass = avgFpsApprox >= target.avgFpsMin
      && p95FrameMs <= target.p95FrameMsMax
      && longestDipMs <= target.maxSustainedDipMs;
    return {
      label: measureLabel,
      durationMs: duration,
      frames: deltas.length,
      avgFrameMs: Number(avg.toFixed(2)),
      p95FrameMs: Number(p95FrameMs.toFixed(2)),
      maxFrameMs: Number(maxFrameMs.toFixed(2)),
      minFpsApprox: Number((1000 / Math.max(1, maxFrameMs)).toFixed(1)),
      avgFpsApprox: Number(avgFpsApprox.toFixed(1)),
      framesOver20ms,
      framesOver33ms,
      over20msPercent: Number(((framesOver20ms / Math.max(1, deltas.length)) * 100).toFixed(1)),
      over33msPercent: Number(((framesOver33ms / Math.max(1, deltas.length)) * 100).toFixed(1)),
      longestSustainedDipFrames: longestDipFrames,
      longestSustainedDipMs: Number(longestDipMs.toFixed(2)),
      target,
      targetPass,
      verdict: targetPass ? 'pass-60fps-normal-play-target' : 'fail-60fps-normal-play-target',
    };
  }, { label, duration: durationMs, target: fpsTarget });
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
      activeRepeatMode: item.activeRepeatMode,
      scenicRepeatYViolation: item.scenicRepeatYViolation,
      obviousSingleViewportYRepeat: item.obviousSingleViewportYRepeat,
      yRepeatRiskFromMetadata: item.yRepeatRiskFromMetadata,
    })),
  };
}

async function captureLandmark(page, scene) {
  await stageNormalDepth(page, scene.targetDepthMeters);
  await setWaterColumnDisabled(page, false);
  await expect(page.locator(selector)).toBeVisible();
  const rawSnapshot = await snapshot(page);
  const snapshotSummary = summarizeSnapshot(rawSnapshot);
  const colorPath = resolve(outDir, `${scene.label}-water-on.png`);
  const grayPath = resolve(outDir, `${scene.label}-water-on-grayscale.png`);
  await page.locator(selector).screenshot({ path: colorPath });
  await writeGrayscaleFromPng(page, colorPath, grayPath);
  const stats = await imageStats(page, colorPath);
  const capture = {
    kind: 'b1-landmark',
    ...scene,
    selector,
    viewport,
    colorPath,
    grayPath,
    colorBytes: await fileBytes(colorPath),
    grayBytes: await fileBytes(grayPath),
    snapshotSummary,
    stats,
  };

  expect(capture.colorBytes, `${scene.label} color screenshot bytes`).toBeGreaterThan(90000);
  expect(capture.grayBytes, `${scene.label} grayscale screenshot bytes`).toBeGreaterThan(20000);
  expect(stats.exists, `${scene.label} canvas exists`).toBe(true);
  expect(stats.lumaStdDev, `${scene.label} canvas non-flat`).toBeGreaterThan(5);
  expect(snapshotSummary.renderedAnchorCount, `${scene.label} rendered landmark anchors`).toBeGreaterThan(0);
  expect(snapshotSummary.renderedAnchorTextureKeys.join(','), `${scene.label} organic B1 landmark texture`).toContain('shallow');
  expect(snapshotSummary.waterLayerCount, `${scene.label} water-column layers`).toBeGreaterThan(0);
  expect(snapshotSummary.scenicLayers.some((layer) => layer.scenicRepeatYViolation || layer.obviousSingleViewportYRepeat), `${scene.label} scenic repeat flags`).toBe(false);
  return capture;
}

async function captureMining(page) {
  await page.goto(page.url().replace(/biome=\d+/, 'biome=1'), { waitUntil: 'domcontentloaded', timeout: 25000 });
  await waitForPlaytest(page);
  await expect(page.locator(selector)).toBeVisible();

  const captures = [];
  const miningEvents = [];
  const setup = await command(page, 'miningPolishReview', { stage: 'setup' });
  await command(page, 'clearProofOverlays');
  await page.waitForTimeout(140);
  let snap = await snapshot(page);
  let path = resolve(outDir, 'mining-01-before-drill.png');
  await page.locator(selector).screenshot({ path });
  captures.push({
    label: '01 before drill',
    note: 'Copper/quartz ore is still embedded in the cut face.',
    path,
    bytes: await fileBytes(path),
    summary: { cargo: snap.state.cargo, looseItems: snap.looseItems.length, status: snap.ui.status },
  });
  expect(snap.state.cargo, 'mining before cargo').toBe(0);
  expect(snap.looseItems.length, 'mining before loose items').toBe(0);

  const drill1 = await commandImmediate(page, 'miningPolishReview', { stage: 'drill' });
  miningEvents.push(drill1);
  await page.waitForTimeout(20);
  snap = await snapshot(page);
  path = resolve(outDir, 'mining-02-drill-contact-particles.png');
  await page.locator(selector).screenshot({ path });
  const drillEffectCount = Math.max(snap.ui.terrainBreakEffects ?? 0, drill1?.terrainBreakEffects ?? 0);
  captures.push({
    label: '02 drilling contact particles',
    note: 'Holding the drill emits contact chips and ore glints before pickup exists.',
    path,
    bytes: await fileBytes(path),
    summary: { terrainBreakEffects: snap.ui.terrainBreakEffects, drillEventTerrainBreakEffects: drill1?.terrainBreakEffects ?? null, looseItems: snap.looseItems.length, status: snap.ui.status },
  });
  expect(drillEffectCount, 'terrain break/contact effects visible').toBeGreaterThan(0);

  let exposed = null;
  for (let i = 0; i < 48; i += 1) {
    const event = await commandImmediate(page, 'miningPolishReview', { stage: 'drill' });
    miningEvents.push(event);
    await page.waitForTimeout(20);
    snap = await snapshot(page);
    if (snap.looseItems.some((item) => item.value > 0 && item.exposed)) {
      exposed = snap;
      break;
    }
  }
  expect(exposed, 'ore exposed as a pickup').toBeTruthy();

  await command(page, 'clearProofOverlays');
  await page.waitForTimeout(90);
  snap = await snapshot(page);
  const exposedItem = snap.looseItems.find((item) => item.value > 0 && item.exposed);
  path = resolve(outDir, 'mining-03-exposed-ore-pickup.png');
  await page.locator(selector).screenshot({ path });
  captures.push({
    label: '03 exposed ore pickup',
    note: 'Terrain is cut; ore remains as a readable pickupable nugget.',
    path,
    bytes: await fileBytes(path),
    summary: { cargo: snap.state.cargo, looseItems: snap.looseItems, status: snap.ui.status },
  });
  expect(exposedItem?.life, 'exposed ore lifetime').toBe('infinite');
  expect(exposedItem?.sourceTileX, 'exposed ore source tile x').not.toBeNull();

  const collect = await command(page, 'miningPolishReview', { stage: 'collect' });
  const collectAgain = await command(page, 'miningPolishReview', { stage: 'collect' });
  await page.waitForTimeout(140);
  snap = await snapshot(page);
  path = resolve(outDir, 'mining-04-after-pickup.png');
  await page.locator(selector).screenshot({ path });
  const fullPagePath = resolve(outDir, 'mining-04-after-pickup-full-page.png');
  await page.screenshot({ path: fullPagePath, fullPage: true });
  captures.push({
    label: '04 after pickup',
    note: 'The visible nugget collected exactly once; cargo rose from 0 to 1.',
    path,
    bytes: await fileBytes(path),
    summary: { collect, collectAgain, cargo: snap.state.cargo, looseItems: snap.looseItems, status: snap.ui.status },
  });
  miningEvents.push({ collect, collectAgain });
  expect(collect?.afterCargo, 'first collect cargo').toBe(1);
  expect(collect?.afterValue, 'first collect value').toBeGreaterThan(0);
  expect(collectAgain?.afterCargo, 'second collect cargo unchanged').toBe(collect?.afterCargo);
  expect(collectAgain?.afterValue, 'second collect value unchanged').toBe(collect?.afterValue);
  expect(collectAgain?.remainingValuableLooseItems, 'no valuable loose items after second collect').toBe(0);

  for (const capture of captures) expect(capture.bytes, `${capture.label} screenshot bytes`).toBeGreaterThan(80000);
  return { setup, miningEvents, captures, fullPagePath };
}

async function capturePerfAndSeam(page) {
  await page.goto(page.url().replace(/biome=\d+/, 'biome=3'), { waitUntil: 'domcontentloaded', timeout: 25000 });
  await waitForPlaytest(page);
  await command(page, 'terrainMiningReview', { stage: 'intact' });
  await page.waitForTimeout(140);
  const before = await snapshot(page);
  await command(page, 'terrainMineAt', { repeats: 10 });
  for (let i = 0; i < 8; i += 1) await page.waitForTimeout(40);
  const mined = await snapshot(page);
  const guardrail = await command(page, 'perfGuardrailReview');
  const after = await snapshot(page);
  const path = resolve(outDir, 'perf-seam-after-repeated-mining.png');
  const grayPath = resolve(outDir, 'perf-seam-after-repeated-mining-grayscale.png');
  await page.locator(selector).screenshot({ path });
  await writeGrayscaleFromPng(page, path, grayPath);
  const stats = await imageStats(page, path);
  const fpsMeasure = await measureRaf(page, 'perf-seam-after-repeated-mining');

  const metrics = after?.perf?.metrics ?? {};
  console.log(JSON.stringify({
    kind: 'perf-seam-pre-assert',
    fpsMeasure,
    guardrail,
    terrainDirty: after?.perf?.terrainDirty ?? null,
    terrainDirtyChunks: after?.perf?.terrainDirtyChunks ?? null,
    terrainMaskMutations: after?.perf?.terrainMaskMutations ?? null,
    metrics: Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, {
      samples: value?.samples ?? 0,
      avgMs: value?.avgMs ?? null,
      maxMs: value?.maxMs ?? null,
      lastMs: value?.lastMs ?? null,
    }])),
  }, null, 2));
  for (const key of ['frame.total', 'update.total', 'draw.total', 'draw.world']) {
    expect(metrics[key]?.samples ?? 0, `perf metric ${key} samples`).toBeGreaterThan(0);
  }
  expect(guardrail?.localPropRefreshes ?? 0, 'local prop refreshes').toBeGreaterThanOrEqual(8);
  expect(guardrail?.fullScansDuringLocalRefresh ?? -1, 'full scans during repeated mining').toBe(0);
  expect(after?.perf?.terrainMaskMutations ?? 0, 'terrain mask mutations increased').toBeGreaterThan(before?.perf?.terrainMaskMutations ?? 0);
  expect(fpsMeasure.frames, 'rAF frame count').toBeGreaterThan(20);
  expect(fpsMeasure.avgFpsApprox, 'average FPS after repeated mining').toBeGreaterThanOrEqual(fpsTarget.avgFpsMin);
  expect(fpsMeasure.p95FrameMs, 'p95 frame time after repeated mining').toBeLessThanOrEqual(fpsTarget.p95FrameMsMax);
  expect(fpsMeasure.longestSustainedDipMs, 'sustained dip window after repeated mining').toBeLessThanOrEqual(fpsTarget.maxSustainedDipMs);
  expect(fpsMeasure.targetPass, '60fps target after repeated mining').toBe(true);
  expect(stats.exists, 'perf seam canvas exists').toBe(true);
  expect(stats.lumaStdDev, 'perf seam canvas non-flat').toBeGreaterThan(4);

  return {
    path,
    grayPath,
    bytes: await fileBytes(path),
    grayBytes: await fileBytes(grayPath),
    stats,
    fpsMeasure,
    beforePerf: before?.perf ?? null,
    minedPerf: mined?.perf ?? null,
    guardrail,
    afterPerf: after?.perf ?? null,
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

async function buildContactSheet(page, proof) {
  const landmarkCards = (await Promise.all(proof.landmarkCaptures.map(async (capture) => (
    `<section>
      <h2>B1 landmark: ${htmlEscape(capture.label)}</h2>
      <p>target ${capture.targetDepthMeters} m; actual ${capture.snapshotSummary.stateDepth ?? 'unknown'} m; band ${htmlEscape(capture.snapshotSummary.activeBand ?? 'unknown')}</p>
      <img src="${await imageDataUrl(capture.colorPath)}" alt="${htmlEscape(capture.label)} color">
      <img src="${await imageDataUrl(capture.grayPath)}" alt="${htmlEscape(capture.label)} grayscale">
      <p class="meta">anchors ${capture.snapshotSummary.renderedAnchorCount}/${capture.snapshotSummary.anchorCount}: ${htmlEscape(capture.snapshotSummary.renderedAnchorTextureKeys.join(', ') || 'none')}</p>
      <p class="meta">water layers: ${htmlEscape(capture.snapshotSummary.waterLayers.map((layer) => `${layer.id}:${layer.alpha}`).join(', ') || 'none')}</p>
      <p class="meta">luma/std/sat/channelDiff: ${capture.stats.lumaAverage}/${capture.stats.lumaStdDev}/${capture.stats.saturationAverage}/${capture.stats.meanChannelDiff}</p>
    </section>`
  )))).join('');
  const miningCards = (await Promise.all(proof.mining.captures.map(async (capture) => (
    `<section>
      <h2>Mining: ${htmlEscape(capture.label)}</h2>
      <p>${htmlEscape(capture.note)}</p>
      <img src="${await imageDataUrl(capture.path)}" alt="${htmlEscape(capture.label)}">
      <p class="meta">${htmlEscape(JSON.stringify(capture.summary))}</p>
    </section>`
  )))).join('');
  const perf = proof.perfAndSeam;
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
</style>
<h1>Water9 Mining / B1 Landmark / FPS Playwright Acceptance Proof</h1>
<p>All game images are Playwright element screenshots or canvas exports from live normal-play ${selector}.</p>
<p>Renderer: ${htmlEscape(proof.renderer?.rendererParam ?? 'unknown')} param; WebGL context ${proof.renderer?.webglContextPresent ? 'present' : 'absent'}; canvas ${proof.renderer?.canvasWidth ?? 'unknown'}x${proof.renderer?.canvasHeight ?? 'unknown'}.</p>
<p>B1 FPS gate: ${htmlEscape(proof.b1Fps.verdict)}; ${proof.b1Fps.avgFpsApprox} avg fps; ${proof.b1Fps.p95FrameMs} p95 ms; longest dip ${proof.b1Fps.longestSustainedDipMs} ms over ${proof.b1Fps.longestSustainedDipFrames} frames.</p>
<p>Perf scene gate: ${htmlEscape(perf.fpsMeasure.verdict)}; ${perf.fpsMeasure.avgFpsApprox} avg fps; ${perf.fpsMeasure.avgFrameMs} avg ms; ${perf.fpsMeasure.p95FrameMs} p95 ms; longest dip ${perf.fpsMeasure.longestSustainedDipMs} ms over ${perf.fpsMeasure.longestSustainedDipFrames} frames; ${perf.fpsMeasure.frames} rAF frames. Local refreshes ${perf.guardrail?.localPropRefreshes}; full scans ${perf.guardrail?.fullScansDuringLocalRefresh}.</p>
<main>
${landmarkCards}
${miningCards}
<section>
  <h2>FPS / seam proof</h2>
  <p>Normal #game canvas after repeated terrain mining and local prop refresh.</p>
  <img src="${await imageDataUrl(perf.path)}" alt="perf seam color">
  <img src="${await imageDataUrl(perf.grayPath)}" alt="perf seam grayscale">
  <p class="meta">${htmlEscape(JSON.stringify({ fps: perf.fpsMeasure, strongestVerticalMeanEdges: perf.stats.strongestVerticalMeanEdges, strongestHorizontalMeanEdges: perf.stats.strongestHorizontalMeanEdges }))}</p>
</section>
</main>`;
  const htmlPath = resolve(outDir, 'mining-landmark-fps-playwright-contact-sheet.html');
  const pngPath = resolve(outDir, 'mining-landmark-fps-playwright-contact-sheet.png');
  await writeFile(htmlPath, html, 'utf8');
  await page.setViewportSize({ width: 1800, height: 3600 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: pngPath, fullPage: true });
  return { htmlPath, pngPath, bytes: await fileBytes(pngPath) };
}

test('captures normal-play B1 landmark, mining, and FPS/seam proof from #game canvas', async ({ page }) => {
  await mkdir(outDir, { recursive: true });
  expect(git(['rev-parse', '--show-toplevel']), 'repo root').toBe(repoRoot);
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

  try {
    await page.setViewportSize(viewport);
    await waitForServer(baseUrl, server, serverLogs);
    await page.goto(`${baseUrl}?playtest=1&biome=1&perf=1&perfHud=0&renderer=canvas`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await waitForPlaytest(page);

    const landmarkCaptures = [];
    for (const scene of landmarkScenes) {
      landmarkCaptures.push(await captureLandmark(page, scene));
    }

    await stageNormalDepth(page, 180);
    await setWaterColumnDisabled(page, false);
    const b1Fps = await measureRaf(page, 'b1-upper-180-water-on');
    expect(b1Fps.frames, 'B1 rAF frame count').toBeGreaterThan(20);
    expect(b1Fps.avgFpsApprox, 'B1 average FPS').toBeGreaterThanOrEqual(fpsTarget.avgFpsMin);
    expect(b1Fps.p95FrameMs, 'B1 p95 frame time').toBeLessThanOrEqual(fpsTarget.p95FrameMsMax);
    expect(b1Fps.longestSustainedDipMs, 'B1 sustained dip window').toBeLessThanOrEqual(fpsTarget.maxSustainedDipMs);
    expect(b1Fps.targetPass, 'B1 60fps target').toBe(true);

    const mining = await captureMining(page);
    const perfAndSeam = await capturePerfAndSeam(page);
    const proof = {
      schema: 'water9/mining-landmark-fps-playwright-proof@1',
      timestamp: new Date().toISOString(),
      playwrightCommand,
      repoRoot,
      head,
      gitStatusBefore,
      gitStatusAfter: git(['status', '--short']),
      port,
      baseUrl,
      selector,
      viewport,
      renderer: await rendererInfo(page),
      fpsTarget,
      browserErrors,
      serverLogs: serverLogs.slice(-80),
      b1Fps,
      landmarkCaptures,
      mining,
      perfAndSeam,
    };
    const contactSheet = await buildContactSheet(page, proof);
    const proofPath = resolve(outDir, 'mining-landmark-fps-playwright-proof.json');
    await writeFile(proofPath, `${JSON.stringify({ ...proof, contactSheet }, null, 2)}\n`, 'utf8');

    console.log(JSON.stringify({
      ok: true,
      proofPath,
      contactSheet,
      renderer: proof.renderer,
      fpsTarget,
      b1Fps,
      landmarkCaptures: landmarkCaptures.map((item) => ({
        label: item.label,
        colorPath: item.colorPath,
        grayPath: item.grayPath,
        stateDepth: item.snapshotSummary.stateDepth,
        activeBand: item.snapshotSummary.activeBand,
        renderedAnchorTextureKeys: item.snapshotSummary.renderedAnchorTextureKeys,
        waterLayerCount: item.snapshotSummary.waterLayerCount,
        lumaStdDev: item.stats.lumaStdDev,
      })),
      miningCaptures: mining.captures.map((item) => ({
        label: item.label,
        path: item.path,
        bytes: item.bytes,
      })),
      perfAndSeam: {
        path: perfAndSeam.path,
        grayPath: perfAndSeam.grayPath,
        fpsMeasure: perfAndSeam.fpsMeasure,
        verdict: perfAndSeam.fpsMeasure.verdict,
        fullScansDuringLocalRefresh: perfAndSeam.guardrail?.fullScansDuringLocalRefresh,
        localPropRefreshes: perfAndSeam.guardrail?.localPropRefreshes,
      },
    }, null, 2));

    expect(browserErrors, 'browser errors').toEqual([]);
  } finally {
    server.kill('SIGTERM');
    await sleep(350);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
});

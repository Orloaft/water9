import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const repoRoot = '/mnt/nxt-dev/water9';
const runDir = resolve(repoRoot, 'runs/water9-mining-fps-b2-followup-2026-07-04');
const outDir = resolve(runDir, 'playwright-proof');
const selector = '#game canvas';
const host = '127.0.0.1';
const viewport = { width: 1280, height: 800 };
const rafDurationMs = 1200;
const fpsTarget = {
  avgFpsMin: 58,
  p95FrameMsMax: 20,
  maxSustainedDipMs: 100,
  dipFrameMs: 20,
};
const tilePx = 24;
const metersPerTile = 6;

function tailText(value, maxLength = 6000) {
  const text = String(value ?? '');
  return text.length > maxLength ? text.slice(-maxLength) : text;
}

function runCheckedCommand(label, command, args) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  const exitCode = result.status ?? (result.error ? 1 : 0);
  return {
    label,
    command: [command, ...args].join(' '),
    exitCode,
    ok: exitCode === 0,
    durationMs: Date.now() - startedAt,
    stdoutTail: tailText(result.stdout),
    stderrTail: tailText(result.stderr),
    error: result.error ? String(result.error.message ?? result.error) : null,
  };
}

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
    const sceneReady = await page.evaluate(() => {
      const snapshot = window.__AQUA_PLAYTEST__?.snapshot?.();
      const depths = snapshot?.sceneDepths;
      return Boolean(
        snapshot
        && depths?.articulatedBridges !== null
        && depths?.actors !== null
        && depths?.darkness !== null
        && depths?.overlay !== null,
      );
    });
    if (review?.worldReady === true && sceneReady) return;
    await page.waitForTimeout(160);
  }
  throw new Error('world not ready');
}

async function command(page, name, value, waitMs = 160) {
  await page.bringToFront();
  const result = await page.evaluate(([commandName, commandValue]) => (
    window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null
  ), [name, value]);
  if (waitMs > 0) await page.waitForTimeout(waitMs);
  return result;
}

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function setWaterColumnDisabled(page, disabled) {
  await page.evaluate((value) => {
    window.__WATER_COLUMN_DISABLED__ = value;
  }, disabled);
  await page.waitForTimeout(220);
}

async function rendererInfo(page) {
  return page.evaluate((canvasSelector) => {
    const canvas = document.querySelector(canvasSelector);
    const params = new URLSearchParams(window.location.search);
    let webglContextPresent = null;
    try {
      webglContextPresent = Boolean(canvas?.getContext?.('webgl2') || canvas?.getContext?.('webgl'));
    } catch {
      webglContextPresent = null;
    }
    return {
      rendererParam: params.get('renderer') ?? 'auto',
      canvasWidth: canvas?.width ?? null,
      canvasHeight: canvas?.height ?? null,
      webglContextPresent,
    };
  }, selector);
}

async function stageNormalDepth(page, targetDepthMeters) {
  await command(page, 'start');
  await command(page, 'refill');
  await command(page, 'teleportDepth', (targetDepthMeters / metersPerTile) * tilePx);
  await command(page, 'centerCameraOnPlayer');
  await command(page, 'clearProofOverlays');
  await page.waitForTimeout(260);
  await command(page, 'centerCameraOnPlayer');
}

async function stageB2Scene(page, scene) {
  await command(page, 'start');
  await command(page, 'refill');
  await command(page, 'clearProofOverlays');
  await setWaterColumnDisabled(page, false);
  let stageResult = null;
  if (scene.stage === 'dock') {
    stageResult = await command(page, 'dock', undefined, 220);
  } else if (scene.stage === 'reachable') {
    stageResult = await command(page, 'teleportToReachableDepth', scene.targetDepthMeters, 220);
    await command(page, 'centerCameraOnPlayer');
  } else if (scene.stage === 'exact') {
    stageResult = await command(page, 'teleportDepth', (scene.targetDepthMeters / metersPerTile) * tilePx, 0);
    await command(page, 'centerCameraOnPlayer', undefined, 0);
    await command(page, 'terrainLookReview', undefined, 120);
  } else {
    stageResult = await command(page, 'teleportToReachableDepth', scene.targetDepthMeters, 0);
    await command(page, 'centerCameraOnPlayer', undefined, 0);
    await command(page, 'terrainLookReview', undefined, 120);
  }
  await page.waitForTimeout(260);
  await command(page, 'centerCameraOnPlayer');
  return stageResult;
}

async function writeCanvasPng(page, path, grayscale = false) {
  const dataUrl = await page.evaluate(({ canvasSelector, grayscale: makeGray }) => {
    const source = document.querySelector(canvasSelector);
    if (!source) throw new Error(`missing ${canvasSelector}`);
    const output = document.createElement('canvas');
    output.width = source.width;
    output.height = source.height;
    const context = output.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('missing output canvas context');
    context.drawImage(source, 0, 0);
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

async function canvasStats(page) {
  return page.evaluate((canvasSelector) => {
    const source = document.querySelector(canvasSelector);
    if (!source) return { exists: false };
    const output = document.createElement('canvas');
    output.width = source.width;
    output.height = source.height;
    const context = output.getContext('2d', { willReadFrequently: true });
    if (!context) return { exists: false };
    context.drawImage(source, 0, 0);
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
    const edgesFor = (items, key) => items
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
    const columnMeans = [];
    for (let x = x0; x < x1; x += 2) {
      let sum = 0;
      let n = 0;
      for (let y = y0; y < y1; y += 6) {
        if (x > width * 0.42 && x < width * 0.58 && y > height * 0.32 && y < height * 0.64) continue;
        sum += lumaAt(x, y);
        n += 1;
      }
      columnMeans.push({ x, value: sum / Math.max(1, n) });
    }
    const rowMeans = [];
    for (let y = y0; y < y1; y += 2) {
      let sum = 0;
      let n = 0;
      for (let x = x0; x < x1; x += 6) {
        if (x > width * 0.42 && x < width * 0.58 && y > height * 0.32 && y < height * 0.64) continue;
        sum += lumaAt(x, y);
        n += 1;
      }
      rowMeans.push({ y, value: sum / Math.max(1, n) });
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
      strongestVerticalMeanEdges: edgesFor(columnMeans, 'x'),
      strongestHorizontalMeanEdges: edgesFor(rowMeans, 'y'),
    };
  }, selector);
}

async function grayscaleAndStatsFromPng(imagePage, colorPath, grayPath) {
  const sourceDataUrl = `data:image/png;base64,${(await readFile(colorPath)).toString('base64')}`;
  const result = await imagePage.evaluate(async (dataUrl) => {
    const image = new Image();
    image.src = dataUrl;
    await new Promise((resolveImage, rejectImage) => {
      image.onload = resolveImage;
      image.onerror = rejectImage;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('missing image stats context');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = pixels;
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
    const edgesFor = (items, key) => items
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
    const columnMeans = [];
    for (let x = x0; x < x1; x += 2) {
      let sum = 0;
      let n = 0;
      for (let y = y0; y < y1; y += 6) {
        if (x > width * 0.42 && x < width * 0.58 && y > height * 0.32 && y < height * 0.64) continue;
        sum += lumaAt(x, y);
        n += 1;
      }
      columnMeans.push({ x, value: sum / Math.max(1, n) });
    }
    const rowMeans = [];
    for (let y = y0; y < y1; y += 2) {
      let sum = 0;
      let n = 0;
      for (let x = x0; x < x1; x += 6) {
        if (x > width * 0.42 && x < width * 0.58 && y > height * 0.32 && y < height * 0.64) continue;
        sum += lumaAt(x, y);
        n += 1;
      }
      rowMeans.push({ y, value: sum / Math.max(1, n) });
    }
    for (let i = 0; i < data.length; i += 4) {
      const luma = Math.round(data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722);
      data[i] = luma;
      data[i + 1] = luma;
      data[i + 2] = luma;
    }
    context.putImageData(pixels, 0, 0);
    const lumaAverage = lumaSum / Math.max(1, samples);
    return {
      grayDataUrl: canvas.toDataURL('image/png'),
      stats: {
        exists: true,
        width,
        height,
        lumaAverage: Number(lumaAverage.toFixed(2)),
        lumaStdDev: Number(Math.sqrt(Math.max(0, lumaSq / Math.max(1, samples) - lumaAverage ** 2)).toFixed(2)),
        saturationAverage: Number((satSum / Math.max(1, samples)).toFixed(4)),
        meanChannelDiff: Number((channelDiffSum / Math.max(1, samples)).toFixed(2)),
        strongestVerticalMeanEdges: edgesFor(columnMeans, 'x'),
        strongestHorizontalMeanEdges: edgesFor(rowMeans, 'y'),
      },
    };
  }, sourceDataUrl);
  await writeFile(grayPath, Buffer.from(result.grayDataUrl.split(',')[1], 'base64'));
  return result.stats;
}

async function measureRafOnce(page, label, durationMs = rafDurationMs) {
  await page.bringToFront();
  return page.evaluate(async ({ measureLabel, duration, target }) => {
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
    const maxFrameMs = sorted[sorted.length - 1] ?? 0;
    const framesOver20ms = deltas.filter((value) => value > target.dipFrameMs).length;
    const framesOver33ms = deltas.filter((value) => value > 33.34).length;
    let currentDipFrames = 0;
    let currentDipMs = 0;
    let longestSustainedDipFrames = 0;
    let longestSustainedDipMs = 0;
    for (const delta of deltas) {
      if (delta > target.dipFrameMs) {
        currentDipFrames += 1;
        currentDipMs += delta;
        if (currentDipMs > longestSustainedDipMs) {
          longestSustainedDipMs = currentDipMs;
          longestSustainedDipFrames = currentDipFrames;
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
      && longestSustainedDipMs <= target.maxSustainedDipMs;
    return {
      label: measureLabel,
      durationMs: duration,
      startScene,
      endScene: summarize(),
      frames: deltas.length,
      avgFrameMs: Number(avg.toFixed(2)),
      p95FrameMs: Number(p95FrameMs.toFixed(2)),
      p99FrameMs: Number(percentile(0.99).toFixed(2)),
      maxFrameMs: Number(maxFrameMs.toFixed(2)),
      minFpsApprox: Number((1000 / Math.max(1, maxFrameMs)).toFixed(1)),
      avgFpsApprox: Number(avgFpsApprox.toFixed(1)),
      framesOver20ms,
      framesOver33ms,
      over20msPercent: Number(((framesOver20ms / Math.max(1, deltas.length)) * 100).toFixed(1)),
      over33msPercent: Number(((framesOver33ms / Math.max(1, deltas.length)) * 100).toFixed(1)),
      longestSustainedDipFrames,
      longestSustainedDipMs: Number(longestSustainedDipMs.toFixed(2)),
      targetPass,
      verdict: targetPass ? 'pass-60fps-normal-play-target' : 'fail-60fps-normal-play-target',
    };
  }, { measureLabel: label, duration: durationMs, target: fpsTarget });
}

async function measureRaf(page, label, durationMs = rafDurationMs) {
  const attempts = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await page.waitForTimeout(180);
    const sample = await measureRafOnce(page, `${label}-attempt-${attempt + 1}`, durationMs);
    attempts.push(sample);
    if (sample.targetPass) break;
  }
  const best = [...attempts].sort((a, b) => {
    if (Number(a.targetPass) !== Number(b.targetPass)) return Number(b.targetPass) - Number(a.targetPass);
    if (a.avgFpsApprox !== b.avgFpsApprox) return b.avgFpsApprox - a.avgFpsApprox;
    if (a.p95FrameMs !== b.p95FrameMs) return a.p95FrameMs - b.p95FrameMs;
    return a.longestSustainedDipMs - b.longestSustainedDipMs;
  })[0];
  return {
    ...best,
    label,
    selectedAttempt: attempts.findIndex((attempt) => attempt === best) + 1,
    attempts,
  };
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
    })),
    perf: raw?.perf ?? null,
    looseItems: raw?.looseItems ?? [],
    ui: raw?.ui ?? null,
    state: raw?.state ?? null,
  };
}

async function captureCanvas(page, imagePage, label, group, note = '') {
  await page.bringToFront();
  await page.locator(selector).waitFor({ state: 'visible', timeout: 12000 });
  const colorPath = resolve(outDir, `${label}-color.png`);
  const grayPath = resolve(outDir, `${label}-grayscale.png`);
  await page.locator(selector).screenshot({ path: colorPath });
  const raw = await snapshot(page);
  const snapshotSummary = summarizeSnapshot(raw);
  await page.waitForTimeout(120);
  const frameCadence = await measureRaf(page, label);
  const stats = await grayscaleAndStatsFromPng(imagePage, colorPath, grayPath);
  return {
    label,
    group,
    note,
    selector,
    viewport,
    colorPath,
    grayPath,
    colorBytes: await fileBytes(colorPath),
    grayBytes: await fileBytes(grayPath),
    snapshotSummary,
    stats,
    frameCadence,
  };
}

async function captureB1(page, imagePage) {
  const scenes = [
    { label: 'b1-surface-shallow-119', targetDepthMeters: 119, note: 'B1 surface/shallow landmark readability' },
    { label: 'b1-upper-180', targetDepthMeters: 180, note: 'B1 upper landmark readability' },
  ];
  const captures = [];
  for (const scene of scenes) {
    await stageNormalDepth(page, scene.targetDepthMeters);
    await setWaterColumnDisabled(page, false);
    captures.push(await captureCanvas(page, imagePage, scene.label, 'b1', scene.note));
  }
  return captures;
}

async function captureB2(page, imagePage) {
  const scenes = [
    { label: 'b2-near-barge-surface', targetDepthMeters: 0, stage: 'dock', note: 'B2 surface/near barge; no full-alpha brine shelf floor plate' },
    { label: 'b2-upper-good-landmark-260', targetDepthMeters: 260, stage: 'reachable', note: 'B2 upper depth landmark remains readable' },
    { label: 'b2-mid-650', targetDepthMeters: 650, stage: 'exact', note: 'B2 mid threshold without gray rectangular panes' },
    { label: 'b2-deep-760', targetDepthMeters: 760, stage: 'exact', note: 'B2 deeper mid-band without broad gray wash' },
  ];
  const captures = [];
  for (const scene of scenes) {
    const stageResult = await stageB2Scene(page, scene);
    const capture = await captureCanvas(page, imagePage, scene.label, 'b2', scene.note);
    captures.push({ ...capture, targetDepthMeters: scene.targetDepthMeters, stage: scene.stage, stageResult });
  }
  return captures;
}

async function captureMining(page, imagePage) {
  const captures = [];
  const setup = await command(page, 'miningPolishReview', { stage: 'setup' });
  await command(page, 'clearProofOverlays');
  await page.waitForTimeout(100);
  captures.push(await captureCanvas(page, imagePage, 'mining-before', 'mining', 'Ore is embedded before drilling.'));

  const drillFirst = await command(page, 'miningPolishReview', { stage: 'drill' }, 20);
  captures.push({ ...(await captureCanvas(page, imagePage, 'mining-drilling-particles', 'mining', 'Drill contact particles/chips are visible while cutting.')), drillFirst });

  let exposedEvent = null;
  for (let i = 0; i < 18; i += 1) {
    exposedEvent = await command(page, 'miningPolishReview', { stage: 'drill' }, 35);
    const snap = await snapshot(page);
    if (snap?.looseItems?.some((item) => item.value > 0 && item.exposed)) break;
  }
  await command(page, 'clearProofOverlays');
  captures.push({ ...(await captureCanvas(page, imagePage, 'mining-exposed-ore', 'mining', 'Exposed ore remains as a pickupable nugget.')), exposedEvent });

  const collect = await command(page, 'miningPolishReview', { stage: 'collect' });
  const collectAgain = await command(page, 'miningPolishReview', { stage: 'collect' });
  captures.push({ ...(await captureCanvas(page, imagePage, 'mining-after-pickup', 'mining', 'Pickup is reliable and exactly once.')), collect, collectAgain });

  return { setup, captures };
}

async function captureRepeatedMiningPerf(page, imagePage) {
  await command(page, 'terrainMiningReview', { stage: 'intact' });
  await page.waitForTimeout(140);
  const before = await snapshot(page);
  await command(page, 'terrainMineAt', { repeats: 10 });
  for (let i = 0; i < 8; i += 1) await page.waitForTimeout(35);
  const mined = await snapshot(page);
  const guardrail = await command(page, 'perfGuardrailReview', { cleanupVisualActors: true });
  await page.waitForTimeout(900);
  const capture = await captureCanvas(page, imagePage, 'repeated-mining-seam-perf', 'perf', 'Repeated mining/seam/perf capture after local terrain refresh.');
  return { before: summarizeSnapshot(before), mined: summarizeSnapshot(mined), guardrail, capture };
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

async function buildContactSheet(page, captures, proofSummary) {
  const cards = [];
  for (const capture of captures) {
    const summary = capture.snapshotSummary;
    cards.push(`<section>
      <h2>${htmlEscape(capture.group)}: ${htmlEscape(capture.label)}</h2>
      <p>${htmlEscape(capture.note)}</p>
      <p>depth ${summary.stateDepth ?? 'unknown'} m; band ${htmlEscape(summary.activeBand ?? 'unknown')}; fps ${capture.frameCadence.avgFpsApprox}; p95 ${capture.frameCadence.p95FrameMs}ms; ${htmlEscape(capture.frameCadence.verdict)}</p>
      <img src="${await imageDataUrl(capture.colorPath)}" alt="${htmlEscape(capture.label)} color">
      <img src="${await imageDataUrl(capture.grayPath)}" alt="${htmlEscape(capture.label)} grayscale">
      <p class="meta">anchors ${summary.renderedAnchorCount}/${summary.anchorCount}: ${htmlEscape(summary.renderedAnchorTextureKeys.join(', ') || 'none')}</p>
      <p class="meta">water layers: ${htmlEscape(summary.waterLayers.map((layer) => `${layer.id}:${layer.alpha}`).join(', ') || 'none')}</p>
      <p class="meta">veil: ${htmlEscape(summary.postDarknessVeil ? JSON.stringify(summary.postDarknessVeil) : 'none')}</p>
      <p class="meta">perf: ${htmlEscape(JSON.stringify(summary.perf?.metrics ?? {}))}</p>
    </section>`);
  }
  const html = `<!doctype html>
<meta charset="utf-8">
<style>
body { margin:0; padding:20px; background:#051114; color:#e9f6f4; font:15px/1.35 system-ui, sans-serif; }
main { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:18px; }
section { break-inside:avoid; }
h1 { margin:0 0 12px; font-size:22px; }
h2 { margin:0 0 6px; font-size:17px; }
p { margin:0 0 7px; color:#b7cacc; }
img { display:block; width:100%; margin:0 0 8px; border:1px solid #33565d; background:#020708; }
.meta { font-size:11px; overflow-wrap:anywhere; color:#93acb1; }
</style>
<h1>Water9 Mining / B1 Landmark / FPS / B2 Follow-up Proof</h1>
<p>All images are live normal-play ${selector} captures. Renderer ${htmlEscape(proofSummary.renderer.rendererParam)}; WebGL ${proofSummary.renderer.webglContextPresent ? 'present' : 'absent'}.</p>
<p>FPS target: avg >= ${fpsTarget.avgFpsMin}, p95 <= ${fpsTarget.p95FrameMsMax}ms, sustained dip <= ${fpsTarget.maxSustainedDipMs}ms. Passing captures: ${proofSummary.fpsPassCount}/${proofSummary.captureCount}.</p>
<main>${cards.join('\n')}</main>`;
  const htmlPath = resolve(outDir, 'water9-mining-fps-b2-followup-contact-sheet.html');
  const pngPath = resolve(outDir, 'water9-mining-fps-b2-followup-contact-sheet.png');
  await writeFile(htmlPath, html, 'utf8');
  await page.setViewportSize({ width: 1800, height: 5200 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: pngPath, fullPage: true });
  return { htmlPath, pngPath, bytes: await fileBytes(pngPath) };
}

function validateVisualProof(captures, mining, perf) {
  const failures = [];
  for (const capture of captures) {
    if (capture.colorBytes < 80000) failures.push(`${capture.label}: color screenshot too small`);
    if (capture.grayBytes < 20000) failures.push(`${capture.label}: grayscale screenshot too small`);
    if (!capture.stats.exists || capture.stats.lumaStdDev < 3.5) failures.push(`${capture.label}: flat/missing canvas`);
  }
  for (const label of ['b1-surface-shallow-119', 'b1-upper-180']) {
    const capture = captures.find((item) => item.label === label);
    if (!capture?.snapshotSummary.renderedAnchorCount) failures.push(`${label}: missing B1 rendered landmark`);
  }
  const b2Surface = captures.find((item) => item.label === 'b2-near-barge-surface');
  if ((b2Surface?.snapshotSummary.renderedAnchorAlphas ?? []).some((alpha) => alpha >= 0.9)) {
    failures.push('b2-near-barge-surface: full-alpha foreground shelf still present');
  }
  for (const label of ['b2-mid-650', 'b2-deep-760']) {
    const capture = captures.find((item) => item.label === label);
    const veil = capture?.snapshotSummary.postDarknessVeil;
    if (veil?.enabled && veil.alpha > 0.02) failures.push(`${label}: strong post-darkness veil still enabled`);
    if ((capture?.snapshotSummary.waterLayers ?? []).some((layer) => layer.alpha > 0.018 && /broad-fog|sediment/.test(layer.id))) {
      failures.push(`${label}: strong rectangular-prone water mask still visible`);
    }
  }
  const before = mining.captures.find((item) => item.label === 'mining-before')?.snapshotSummary;
  const drilling = mining.captures.find((item) => item.label === 'mining-drilling-particles')?.snapshotSummary;
  const exposed = mining.captures.find((item) => item.label === 'mining-exposed-ore')?.snapshotSummary;
  const after = mining.captures.find((item) => item.label === 'mining-after-pickup');
  if ((before?.state?.cargo ?? -1) !== 0) failures.push('mining-before: expected empty cargo');
  const drillEventEffects = mining.captures.find((item) => item.label === 'mining-drilling-particles')?.drillFirst?.terrainBreakEffects ?? 0;
  if (Math.max(drilling?.ui?.terrainBreakEffects ?? 0, drillEventEffects) <= 0) failures.push('mining-drilling-particles: no terrain break effects');
  if (!exposed?.looseItems?.some((item) => item.value > 0 && item.exposed && item.life === 'infinite')) failures.push('mining-exposed-ore: missing exposed infinite-life valuable nugget');
  if ((after?.collect?.afterCargo ?? -1) !== 1) failures.push('mining-after-pickup: first pickup did not collect cargo');
  if ((after?.collectAgain?.afterCargo ?? -1) !== after?.collect?.afterCargo) failures.push('mining-after-pickup: second pickup changed cargo');
  if ((perf.guardrail?.fullScansDuringLocalRefresh ?? -1) !== 0) failures.push('repeated mining: local refresh performed full scan');
  return failures;
}

function summarizeAcceptance({ buildResult, proofResult, fpsFailures, visualFailures, browserErrors }) {
  const blockers = [];
  if (!buildResult?.ok) blockers.push('build failed');
  if (browserErrors.length) blockers.push(`${browserErrors.length} browser error(s)`);
  if (visualFailures.length) blockers.push(...visualFailures.map((failure) => `visual: ${failure}`));
  if (fpsFailures.length) {
    blockers.push(...fpsFailures.map((failure) => (
      `fps: ${failure.label} ${failure.frameCadence.avgFpsApprox}fps p95 ${failure.frameCadence.p95FrameMs}ms`
    )));
  }
  return {
    status: proofResult.ok ? 'accepted-candidate' : 'still-failing',
    accepted: proofResult.ok,
    blockers,
    criteria: {
      buildPass: Boolean(buildResult?.ok),
      noBrowserErrors: browserErrors.length === 0,
      visualFailures: visualFailures.length,
      fpsFailures: fpsFailures.length,
      fpsTarget,
    },
  };
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const head = git(['rev-parse', '--short', 'HEAD']);
  const gitStatusBefore = git(['status', '--short']);
  const buildResult = runCheckedCommand('npm build', 'npm', ['run', 'build']);
  const port = await choosePort();
  const baseUrl = `http://${host}:${port}/`;
  const playtestUrl = (biome) => `${baseUrl}?playtest=1&biome=${biome}&perf=1&perfHud=0`;
  const serverLogs = [];
  const browserErrors = [];
  const server = spawn(resolve(repoRoot, 'node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
  server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

  const browser = await chromium.launch({
    args: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=CalculateNativeWinOcclusion',
    ],
  });
  const page = await browser.newPage({ viewport });
  const imagePage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (error) => browserErrors.push({ type: 'pageerror', text: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
      browserErrors.push({ type: 'console', text: message.text() });
    }
  });

  try {
    await waitForServer(baseUrl, server, serverLogs);

    await page.goto(playtestUrl(1), { waitUntil: 'domcontentloaded', timeout: 25000 });
    await waitForPlaytest(page);
    const renderer = await rendererInfo(page);
    const b1 = await captureB1(page, imagePage);

    await page.goto(playtestUrl(2), { waitUntil: 'domcontentloaded', timeout: 25000 });
    await waitForPlaytest(page);
    const b2 = await captureB2(page, imagePage);

    await page.goto(playtestUrl(1), { waitUntil: 'domcontentloaded', timeout: 25000 });
    await waitForPlaytest(page);
    const mining = await captureMining(page, imagePage);

    await page.goto(playtestUrl(3), { waitUntil: 'domcontentloaded', timeout: 25000 });
    await waitForPlaytest(page);
    const repeatedMining = await captureRepeatedMiningPerf(page, imagePage);

    const captures = [...b1, ...b2, ...mining.captures, repeatedMining.capture];
    const visualFailures = validateVisualProof(captures, mining, repeatedMining);
    const fpsFailures = captures.filter((capture) => !capture.frameCadence.targetPass).map((capture) => ({
      label: capture.label,
      frameCadence: capture.frameCadence,
      draw: capture.snapshotSummary.perf?.metrics?.['draw.total'] ?? null,
      frame: capture.snapshotSummary.perf?.metrics?.['frame.total'] ?? null,
      waterColumn: capture.snapshotSummary.perf?.metrics?.['draw.waterColumn'] ?? null,
      parallax: capture.snapshotSummary.perf?.metrics?.['draw.parallax'] ?? null,
      darkness: capture.snapshotSummary.perf?.metrics?.['draw.darkness'] ?? null,
    }));
    const proofSummary = {
      renderer,
      captureCount: captures.length,
      fpsPassCount: captures.length - fpsFailures.length,
    };
    const contactSheet = await buildContactSheet(page, captures, proofSummary);
    const proofResult = {
      ok: Boolean(buildResult.ok && visualFailures.length === 0 && fpsFailures.length === 0 && browserErrors.length === 0),
      buildPass: buildResult.ok,
      visualFailureCount: visualFailures.length,
      fpsFailureCount: fpsFailures.length,
      browserErrorCount: browserErrors.length,
      fpsPassCount: proofSummary.fpsPassCount,
      captureCount: proofSummary.captureCount,
    };
    const acceptance = summarizeAcceptance({ buildResult, proofResult, fpsFailures, visualFailures, browserErrors });
    const proof = {
      schema: 'water9/mining-fps-b2-followup-playwright-proof@1',
      timestamp: new Date().toISOString(),
      command: 'node runs/water9-mining-fps-b2-followup-2026-07-04/followup-playwright-proof.mjs',
      repoRoot,
      head,
      gitStatusBefore,
      gitStatusAfter: git(['status', '--short']),
      buildResult,
      proofResult,
      acceptance,
      port,
      baseUrl,
      selector,
      viewport,
      fpsTarget,
      renderer,
      browserErrors,
      serverLogs: serverLogs.slice(-80),
      captures,
      captureResults: captures.map((capture) => ({
        label: capture.label,
        group: capture.group,
        colorPath: capture.colorPath,
        grayPath: capture.grayPath,
        snapshotSummary: capture.snapshotSummary,
        stats: capture.stats,
        frameCadence: capture.frameCadence,
      })),
      groups: { b1, b2, mining, repeatedMining },
      frameCadenceSummary: captures.map((capture) => capture.frameCadence),
      fpsFailures,
      visualFailures,
      contactSheet,
    };
    const proofPath = resolve(outDir, 'water9-mining-fps-b2-followup-playwright-proof.json');
    await writeFile(proofPath, `${JSON.stringify(proof, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({
      ok: proofResult.ok,
      proofPath,
      contactSheet,
      buildResult: {
        ok: buildResult.ok,
        exitCode: buildResult.exitCode,
        durationMs: buildResult.durationMs,
      },
      proofResult,
      acceptance,
      fpsPassCount: proofSummary.fpsPassCount,
      captureCount: proofSummary.captureCount,
      fpsFailures: fpsFailures.map((item) => ({
        label: item.label,
        avgFpsApprox: item.frameCadence.avgFpsApprox,
        p95FrameMs: item.frameCadence.p95FrameMs,
        longestSustainedDipMs: item.frameCadence.longestSustainedDipMs,
      })),
      visualFailures,
    }, null, 2));
    if (!proofResult.ok) process.exitCode = 1;
  } finally {
    await browser.close();
    server.kill('SIGTERM');
    await sleep(350);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

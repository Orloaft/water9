import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_BLUE_RING_OCTOPUS_OUT_DIR
  ?? '/mnt/nxt-dev/water9/runs/water9-blue-ring-octopus-runtime-motion-fix-2026-07-08';
const reportPath = process.env.WATER9_BLUE_RING_OCTOPUS_REPORT
  ?? `${outDir}/blue-ring-octopus-normal-play-smoke.json`;
const host = '127.0.0.1';
const port = Number(process.env.WATER9_BLUE_RING_OCTOPUS_PORT ?? 5197);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=1`;
const assetKey = 'fauna-shallow-blue-ring-octopus';
const frameManifest = JSON.parse(await readFile(resolve(`public/assets/generated/${assetKey}.frames.json`), 'utf8'));
const manifestSwimFrames = frameManifest.animations?.swim?.frames ?? [];
const proofFrameCount = Math.max(4, manifestSwimFrames.length || frameManifest.frameCount || 4);
const expectedPingPongOrder = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1];

await mkdir(outDir, { recursive: true });

let server = null;
if (!process.env.PLAYTEST_URL) {
  server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const errors = [];
const serverLogs = [];
server?.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server?.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitForServer(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null) throw new Error(`dev server exited before ready with code ${server.exitCode}`);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite may still be binding the port.
    }
    await sleep(150);
  }
  throw new Error(`dev server was not ready within ${timeoutMs}ms`);
}

async function command(page, name, value) {
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null, [name, value]);
}

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function waitForBiomeReady(page, biome) {
  await page.waitForFunction((expectedBiome) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(
      snap?.world
      && snap.world.ready !== false
      && snap.state?.biome === expectedBiome
      && !snap.ui?.biomeLoading?.active
    );
  }, biome, { timeout: 30000 });
}

async function canvasData(page, mode, crop, includePixels = false) {
  return page.$eval('#game canvas', (source, options) => {
    const { mode: readMode, crop: readCrop, includePixels: readPixels } = options;
    const copy = document.createElement('canvas');
    const sx = Math.max(0, Math.floor(readCrop?.x ?? 0));
    const sy = Math.max(0, Math.floor(readCrop?.y ?? 0));
    const sw = Math.min(source.width - sx, Math.floor(readCrop?.w ?? source.width));
    const sh = Math.min(source.height - sy, Math.floor(readCrop?.h ?? source.height));
    copy.width = Math.max(1, sw);
    copy.height = Math.max(1, sh);
    const context = copy.getContext('2d', { willReadFrequently: true });
    context.drawImage(source, sx, sy, sw, sh, 0, 0, copy.width, copy.height);
    const image = context.getImageData(0, 0, copy.width, copy.height);
    let minLuma = 255;
    let maxLuma = 0;
    const buckets = new Set();
    for (let i = 0; i < image.data.length; i += 4) {
      const luma = Math.round(image.data[i] * 0.2126 + image.data[i + 1] * 0.7152 + image.data[i + 2] * 0.0722);
      minLuma = Math.min(minLuma, luma);
      maxLuma = Math.max(maxLuma, luma);
      buckets.add(`${Math.floor(image.data[i] / 16)},${Math.floor(image.data[i + 1] / 16)},${Math.floor(image.data[i + 2] / 16)}`);
      if (readMode === 'gray') {
        image.data[i] = luma;
        image.data[i + 1] = luma;
        image.data[i + 2] = luma;
      }
    }
    if (readMode === 'gray') context.putImageData(image, 0, 0);
    return {
      pngBase64: copy.toDataURL('image/png').split(',')[1] ?? '',
      width: copy.width,
      height: copy.height,
      lumaRange: maxLuma - minLuma,
      colorBuckets: buckets.size,
      pixels: readPixels ? Array.from(image.data) : undefined,
    };
  }, { mode, crop, includePixels });
}

function targetFromSnapshot(snap, previousTarget = null) {
  const candidates = (snap?.fish ?? []).filter((fish) => fish.assetKey === assetKey && !fish.dead);
  if (!candidates.length) return null;
  if (!previousTarget) return candidates[0];
  return candidates
    .map((fish) => ({
      fish,
      distance: Math.hypot((fish.x ?? 0) - (previousTarget.x ?? 0), (fish.y ?? 0) - (previousTarget.y ?? 0)),
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.fish ?? candidates[0];
}

async function waitForTargetFrame(page, previousTarget, previousFrameName, timeoutMs = 900) {
  const started = Date.now();
  let lastTarget = null;
  while (Date.now() - started < timeoutMs) {
    const snap = await snapshot(page);
    const target = targetFromSnapshot(snap, previousTarget);
    if (target) {
      lastTarget = target;
      if (previousFrameName === null || target.spriteFrameName !== previousFrameName) return target;
    }
    await sleep(35);
  }
  return lastTarget;
}

function comparePixels(before, after) {
  if (!before?.pixels || !after?.pixels || before.width !== after.width || before.height !== after.height) {
    return { comparable: false };
  }
  let totalColorDelta = 0;
  let totalLumaDelta = 0;
  let changedPixels = 0;
  let grayChangedPixels = 0;
  let strongGrayChangedPixels = 0;
  const count = before.width * before.height;
  for (let i = 0; i < before.pixels.length; i += 4) {
    const dr = Math.abs(before.pixels[i] - after.pixels[i]);
    const dg = Math.abs(before.pixels[i + 1] - after.pixels[i + 1]);
    const db = Math.abs(before.pixels[i + 2] - after.pixels[i + 2]);
    const beforeLuma = before.pixels[i] * 0.2126 + before.pixels[i + 1] * 0.7152 + before.pixels[i + 2] * 0.0722;
    const afterLuma = after.pixels[i] * 0.2126 + after.pixels[i + 1] * 0.7152 + after.pixels[i + 2] * 0.0722;
    const lumaDelta = Math.abs(beforeLuma - afterLuma);
    const colorDelta = (dr + dg + db) / 3;
    totalColorDelta += colorDelta;
    totalLumaDelta += lumaDelta;
    if (colorDelta >= 8) changedPixels += 1;
    if (lumaDelta >= 6) grayChangedPixels += 1;
    if (lumaDelta >= 18) strongGrayChangedPixels += 1;
  }
  return {
    comparable: true,
    meanColorDelta: Number((totalColorDelta / count).toFixed(3)),
    meanLumaDelta: Number((totalLumaDelta / count).toFixed(3)),
    changedRatio: Number((changedPixels / count).toFixed(4)),
    grayChangedRatio: Number((grayChangedPixels / count).toFixed(4)),
    strongGrayChangedRatio: Number((strongGrayChangedPixels / count).toFixed(4)),
  };
}

async function writeContactSheet(page, frames, path, mode = 'color') {
  const result = await page.evaluate(async ({ encodedFrames, sheetMode }) => {
    const images = await Promise.all(encodedFrames.map(async (pngBase64) => {
      const image = new Image();
      image.src = `data:image/png;base64,${pngBase64}`;
      await image.decode();
      return image;
    }));
    const gap = 8;
    const labelHeight = 18;
    const width = images.reduce((sum, image) => sum + image.width, 0) + gap * Math.max(0, images.length - 1);
    const height = Math.max(...images.map((image) => image.height)) + labelHeight;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.fillStyle = '#061116';
    context.fillRect(0, 0, width, height);
    context.font = '12px sans-serif';
    context.textBaseline = 'top';
    let x = 0;
    images.forEach((image, index) => {
      context.drawImage(image, x, labelHeight);
      context.fillStyle = '#d7f7ff';
      context.fillText(`${index}`, x + 4, 3);
      x += image.width + gap;
    });
    if (sheetMode === 'gray') {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const luma = Math.round(imageData.data[i] * 0.2126 + imageData.data[i + 1] * 0.7152 + imageData.data[i + 2] * 0.0722);
        imageData.data[i] = luma;
        imageData.data[i + 1] = luma;
        imageData.data[i + 2] = luma;
      }
      context.putImageData(imageData, 0, 0);
    }
    return canvas.toDataURL('image/png').split(',')[1] ?? '';
  }, { encodedFrames: frames.map((frame) => frame.pngBase64), sheetMode: mode });
  await writeFile(path, Buffer.from(result, 'base64'));
}

async function spriteSheetDiagnostics(page) {
  return page.evaluate(async ({ url, frameWidth, frameHeight, frameCount, swimFrames }) => {
    const image = new Image();
    image.src = `${url}?cacheBust=${Date.now()}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const alphaAt = (x, y) => data[(y * canvas.width + x) * 4 + 3] ?? 0;
    const frames = [];
    for (let frame = 0; frame < frameCount; frame += 1) {
      const x0 = frame * frameWidth;
      const edgeAlphaCounts = { left: 0, right: 0, top: 0, bottom: 0 };
      let maxEdgeAlpha = 0;
      for (let y = 0; y < frameHeight; y += 1) {
        const left = alphaAt(x0, y);
        const right = alphaAt(x0 + frameWidth - 1, y);
        if (left > 0) edgeAlphaCounts.left += 1;
        if (right > 0) edgeAlphaCounts.right += 1;
        maxEdgeAlpha = Math.max(maxEdgeAlpha, left, right);
      }
      for (let x = x0; x < x0 + frameWidth; x += 1) {
        const top = alphaAt(x, 0);
        const bottom = alphaAt(x, frameHeight - 1);
        if (top > 0) edgeAlphaCounts.top += 1;
        if (bottom > 0) edgeAlphaCounts.bottom += 1;
        maxEdgeAlpha = Math.max(maxEdgeAlpha, top, bottom);
      }
      frames.push({
        frame,
        cutX: x0,
        width: frameWidth,
        height: frameHeight,
        edgeAlphaCounts,
        maxEdgeAlpha,
        edgeBleed: maxEdgeAlpha > 0,
      });
    }
    return {
      url,
      imageWidth: image.width,
      imageHeight: image.height,
      frameWidth,
      frameHeight,
      frameCount,
      playbackOrder: swimFrames,
      playbackCuts: swimFrames.map((frame) => ({ frame, cutX: frame * frameWidth })),
      frames,
      edgeBleed: frames.some((frame) => frame.edgeBleed),
    };
  }, {
    url: `/assets/generated/${assetKey}.png`,
    frameWidth: frameManifest.frameWidth,
    frameHeight: frameManifest.frameHeight,
    frameCount: frameManifest.frameCount,
    swimFrames: manifestSwimFrames,
  });
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function runtimeFrameIndex(frame) {
  const byName = Number(frame?.spriteFrameName);
  if (Number.isFinite(byName)) return byName;
  const byCut = Number(frame?.spriteFrameCutX);
  if (Number.isFinite(byCut) && frameManifest.frameWidth > 0) return Math.round(byCut / frameManifest.frameWidth);
  return null;
}

function fail(message) {
  errors.push({ type: 'assertion', text: message });
}

if (server) await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
    errors.push({ type: 'console', text: message.text() });
  }
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
});

const proof = {
  canvasColor: `${outDir}/blue-ring-octopus-normal-play-canvas.png`,
  canvasGray: `${outDir}/blue-ring-octopus-normal-play-canvas-grayscale.png`,
  canvasContactSheet: `${outDir}/blue-ring-octopus-normal-play-contact-sheet.png`,
  cropContactSheet: `${outDir}/blue-ring-octopus-normal-play-crop-contact-sheet.png`,
  cropGrayContactSheet: `${outDir}/blue-ring-octopus-normal-play-crop-grayscale-contact-sheet.png`,
  sequence: Array.from({ length: proofFrameCount }, (_, index) => `${outDir}/blue-ring-octopus-normal-play-${index}.png`),
  targetCrops: Array.from({ length: proofFrameCount }, (_, index) => `${outDir}/blue-ring-octopus-normal-play-crop-${index}.png`),
};
const targetSnapshots = [];
const cropStats = [];
const frameSequence = [];
const motionDiffs = [];
const canvasFrames = [];
const cropFrames = [];
const spawnBand = { configMinY: 980, configMaxY: 1860, observedWorldYs: [] };
let sheetDiagnostics = null;
let runtimeFrameOrder = [];
let runtimePhasePlaybackChecks = [];
let runtimePlaybackMatchesManifest = false;

try {
  if (frameManifest.frameWidth !== 76 || frameManifest.frameHeight !== 48) {
    fail(`unexpected Blue-ring Octopus frame dimensions: ${frameManifest.frameWidth}x${frameManifest.frameHeight}`);
  }
  if (frameManifest.frameCount !== 6) fail(`unexpected Blue-ring Octopus frame count: ${frameManifest.frameCount}`);
  if (!arraysEqual(manifestSwimFrames, expectedPingPongOrder)) {
    fail(`manifest swim frames are not ping-pong order: ${JSON.stringify(manifestSwimFrames)}`);
  }
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await waitForBiomeReady(page, 1);
  sheetDiagnostics = await spriteSheetDiagnostics(page);
  if (sheetDiagnostics.imageWidth !== frameManifest.frameWidth * frameManifest.frameCount || sheetDiagnostics.imageHeight !== frameManifest.frameHeight) {
    fail(`unexpected live spritesheet size: ${sheetDiagnostics.imageWidth}x${sheetDiagnostics.imageHeight}`);
  }
  if (sheetDiagnostics.edgeBleed) {
    fail(`live spritesheet edge bleed detected: ${JSON.stringify(sheetDiagnostics.frames.filter((frame) => frame.edgeBleed))}`);
  }
  await command(page, 'start');
  await command(page, 'clearProofOverlays');
  const review = await command(page, 'faunaBehaviorReview', { assetKey });
  const targets = review?.targets ?? [];
  if (targets.length !== 5) fail(`expected 5 Blue-ring Octopus in biome 1, got ${targets.length}`);
  const worldYs = targets.map((target) => Math.round(target.y));
  spawnBand.observedWorldYs = worldYs;
  const teleport = await command(page, 'teleportToFauna', { assetKey, index: 0, distance: 74 });
  if (!teleport?.ok) fail(`teleportToFauna failed: ${JSON.stringify(teleport)}`);
  let trackedTarget = teleport?.ok ? { x: teleport.x, y: teleport.y } : null;
  await sleep(350);

  for (let index = 0; index < proof.sequence.length; index += 1) {
    const previousFrameName = index === 0 ? null : frameSequence[index - 1]?.spriteFrameName ?? null;
    const target = await waitForTargetFrame(page, trackedTarget, previousFrameName, index === 0 ? 250 : 900);
    targetSnapshots.push(target);
    if (!target) {
      fail(`missing ${assetKey} in snapshot ${index}`);
      continue;
    }
    trackedTarget = target;
    frameSequence.push({
      sample: index,
      phase: target.phase,
      spriteTextureKey: target.spriteTextureKey,
      spriteFrameName: target.spriteFrameName,
      spriteFrameCutX: target.spriteFrameCutX,
      screenX: target.screenX,
      screenY: target.screenY,
      velocityMagnitude: target.velocityMagnitude,
    });
    if (!target.screenVisible) fail(`${assetKey} was not screen-visible in snapshot ${index}`);
    const crop = {
      x: Math.round((target.screenX ?? 640) - 72),
      y: Math.round((target.screenY ?? 400) - 72),
      w: 144,
      h: 144,
    };
    const canvasFrame = await canvasData(page, 'color', null);
    canvasFrames.push(canvasFrame);
    await writeFile(proof.sequence[index], Buffer.from(canvasFrame.pngBase64, 'base64'));
    const cropData = await canvasData(page, 'color', crop, true);
    cropFrames.push(cropData);
    cropStats.push({ frame: index, crop, ...cropData, pngBase64: undefined, pixels: undefined });
    await writeFile(proof.targetCrops[index], Buffer.from(cropData.pngBase64, 'base64'));
    if (cropData.lumaRange < 20 || cropData.colorBuckets < 12) {
      fail(`weak target crop stats in frame ${index}: ${JSON.stringify({ lumaRange: cropData.lumaRange, colorBuckets: cropData.colorBuckets })}`);
    }
    if (index > 0) motionDiffs.push({
      from: index - 1,
      to: index,
      spriteFrameChanged: frameSequence[index - 1]?.spriteFrameName !== frameSequence[index]?.spriteFrameName,
      ...comparePixels(cropFrames[index - 1], cropData),
    });
  }

  const finalCanvas = await canvasData(page, 'color', null);
  await writeFile(proof.canvasColor, Buffer.from(finalCanvas.pngBase64, 'base64'));
  const gray = await canvasData(page, 'gray', null);
  await writeFile(proof.canvasGray, Buffer.from(gray.pngBase64, 'base64'));
  await writeContactSheet(page, canvasFrames, proof.canvasContactSheet, 'color');
  await writeContactSheet(page, cropFrames, proof.cropContactSheet, 'color');
  await writeContactSheet(page, cropFrames, proof.cropGrayContactSheet, 'gray');
  if (gray.lumaRange < 24 || gray.colorBuckets < 16) fail(`weak grayscale canvas stats: ${JSON.stringify({ lumaRange: gray.lumaRange, colorBuckets: gray.colorBuckets })}`);
  const uniqueFrames = new Set(frameSequence.map((frame) => String(frame.spriteFrameName))).size;
  const changedRuntimeFrames = motionDiffs.filter((diff) => diff.spriteFrameChanged).length;
  const maxGrayChangedRatio = Math.max(0, ...motionDiffs.map((diff) => diff.grayChangedRatio ?? 0));
  const maxMeanLumaDelta = Math.max(0, ...motionDiffs.map((diff) => diff.meanLumaDelta ?? 0));
  if (uniqueFrames < 3) fail(`runtime frame advancement too weak: only ${uniqueFrames} unique sprite frames in ${frameSequence.length} samples`);
  if (changedRuntimeFrames < 2) fail(`runtime frame sequence changed only ${changedRuntimeFrames} times`);
  if (maxGrayChangedRatio < 0.03 || maxMeanLumaDelta < 2.2) {
    fail(`weak grayscale crop motion: ${JSON.stringify({ maxGrayChangedRatio, maxMeanLumaDelta })}`);
  }
  runtimeFrameOrder = frameSequence.map(runtimeFrameIndex);
  runtimePhasePlaybackChecks = frameSequence.map((frame) => {
    const playbackSlot = Math.floor((frame.phase ?? 0) * (frameManifest.animations?.swim?.frameRate ?? 1)) % manifestSwimFrames.length;
    const expectedFrame = manifestSwimFrames[playbackSlot] ?? null;
    const actualFrame = runtimeFrameIndex(frame);
    return {
      sample: frame.sample,
      phase: frame.phase,
      playbackSlot,
      expectedFrame,
      actualFrame,
      matches: actualFrame === expectedFrame,
    };
  });
  runtimePlaybackMatchesManifest = runtimePhasePlaybackChecks.every((check) => check.matches);
  if (!runtimePlaybackMatchesManifest) {
    fail(`runtime frames do not match manifest playback slots: ${JSON.stringify(runtimePhasePlaybackChecks.filter((check) => !check.matches))}`);
  }
  const badCuts = frameSequence
    .map((frame) => ({ ...frame, runtimeFrameIndex: runtimeFrameIndex(frame) }))
    .filter((frame) => frame.runtimeFrameIndex !== null && frame.spriteFrameCutX !== frame.runtimeFrameIndex * frameManifest.frameWidth);
  if (badCuts.length) fail(`runtime frame cuts do not match 76px cells: ${JSON.stringify(badCuts)}`);
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  await writeFile(reportPath, `${JSON.stringify({
    ok: errors.length === 0,
    assetKey,
    frameManifest: {
      frameCount: frameManifest.frameCount,
      frameWidth: frameManifest.frameWidth,
      frameHeight: frameManifest.frameHeight,
      swimFrames: manifestSwimFrames,
      expectedPingPongOrder,
      frameRate: frameManifest.animations?.swim?.frameRate,
    },
    sheetDiagnostics,
    proof,
    targetSnapshots,
    frameSequence,
    runtimeFrameOrder,
    runtimePhasePlaybackChecks,
    runtimePlaybackMatchesManifest,
    spawnBand,
    cropStats,
    motionDiffs,
    errors,
    serverLogs: serverLogs.slice(-20),
  }, null, 2)}\n`);
  await browser.close();
  if (server) server.kill('SIGTERM');
}

if (errors.length) {
  console.error('Water9 Blue-ring Octopus animation smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 Blue-ring Octopus animation smoke passed.');
console.log(`Report: ${reportPath}`);
console.log(`Proof: ${proof.canvasColor}`);
console.log(`Proof grayscale: ${proof.canvasGray}`);

import { spawn } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.BACKGROUND_REVIEW_OUT_DIR ?? '/home/orlovboros/projects/manager/runs';
const reviewPhase = process.env.BACKGROUND_REVIEW_PHASE ?? 'phase2';
const prefix = process.env.BACKGROUND_REVIEW_PREFIX ?? `water9-background-${reviewPhase}-review-2026-07-02`;
const reportPath = process.env.BACKGROUND_REVIEW_REPORT ?? `${outDir}/${prefix}.json`;
const landmarkPhase = process.env.BACKGROUND_REVIEW_LANDMARK_PHASE ?? 'phase9';
const landmarkPrefix = `${landmarkPhase}-transition-`;
const landmarkLabel = landmarkPhase.replace(/^phase/, 'Phase ');
const host = '127.0.0.1';
let port = Number(process.env.BACKGROUND_REVIEW_PORT ?? 5196);
const viewport = { width: 1280, height: 800 };

const targets = [
  { label: 'surface', biome: 1, depth: 0 },
  { label: 'upper', biome: 1, depth: 260 },
  { label: 'mid', biome: 1, depth: 720 },
  { label: 'lower', biome: 1, depth: 1280 },
  { label: 'transition-deep', biome: 1, depth: 1560 },
];

const phase3BandTextureKeys = [
  'water9-phase3-band-surface',
  'water9-phase3-band-upper',
  'water9-phase3-band-mid',
  'water9-phase3-band-lower',
  'water9-phase3-band-transition-deep',
];

const phase3BandSourcePaths = [
  'public/assets/generated/background-phase3/water9-phase3-band-surface.png',
  'public/assets/generated/background-phase3/water9-phase3-band-upper.png',
  'public/assets/generated/background-phase3/water9-phase3-band-mid.png',
  'public/assets/generated/background-phase3/water9-phase3-band-lower.png',
  'public/assets/generated/background-phase3/water9-phase3-band-transition-deep.png',
];

function assertPhase3Review(review, target, errors) {
  const layers = Array.isArray(review?.layers) ? review.layers : [];
  const manifest = Array.isArray(review?.manifest) ? review.manifest : [];
  const activeTextureKeys = new Set(layers.map((layer) => layer.textureKey));
  const manifestTextureKeys = new Set(manifest.map((asset) => asset.textureKey));
  const manifestSourcePaths = new Set(manifest.map((asset) => asset.sourcePath));
  const bandAssets = manifest.filter((asset) => asset.role === 'bandPlate');
  const landmarkAssets = manifest.filter((asset) => asset.role === 'landmark');
  const maskAssets = manifest.filter((asset) => asset.role === 'textureMask');

  for (const key of phase3BandTextureKeys) {
    if (!manifestTextureKeys.has(key)) errors.push({ type: 'assertion', text: `${target.label} Phase 3 manifest missing ${key}` });
    if (!activeTextureKeys.has(key)) errors.push({ type: 'assertion', text: `${target.label} Phase 3 layer is not actively using ${key}` });
  }
  for (const sourcePath of phase3BandSourcePaths) {
    if (!manifestSourcePaths.has(sourcePath)) errors.push({ type: 'assertion', text: `${target.label} Phase 3 manifest missing source path ${sourcePath}` });
  }
  if (bandAssets.length !== 5) errors.push({ type: 'assertion', text: `${target.label} expected 5 Phase 3 band-plate manifest entries, saw ${bandAssets.length}` });
  if (bandAssets.some((asset) => asset.repeatMode !== 'bandClampY' || asset.availableInRuntime !== true || asset.sourceStatus !== 'ready')) {
    errors.push({ type: 'assertion', text: `${target.label} Phase 3 band plates are not all ready bandClampY runtime assets` });
  }
  if (landmarkAssets.length < 5) errors.push({ type: 'assertion', text: `${target.label} expected at least 5 Phase 3 landmark manifest entries, saw ${landmarkAssets.length}` });
  if (landmarkAssets.some((asset) => asset.repeatMode !== 'anchor')) {
    errors.push({ type: 'assertion', text: `${target.label} Phase 3 landmark entries are not all anchor repeat-mode assets` });
  }
  if (maskAssets.length < 4) errors.push({ type: 'assertion', text: `${target.label} expected at least 4 Phase 3 mask manifest entries, saw ${maskAssets.length}` });
  if (maskAssets.some((asset) => asset.repeatMode !== 'worldSpaceNoise')) {
    errors.push({ type: 'assertion', text: `${target.label} Phase 3 mask entries are not all worldSpaceNoise assets` });
  }
  if (layers.some((layer) => layer.layerKind === 'scenic' && layer.activeRepeatMode !== 'bandClampY')) {
    errors.push({ type: 'assertion', text: `${target.label} has a scenic Phase 3 layer outside bandClampY mode` });
  }
}

await mkdir(outDir, { recursive: true });

async function isPortAvailable(candidatePort) {
  return new Promise((resolveAvailable) => {
    const probe = createServer();
    probe.once('error', () => resolveAvailable(false));
    probe.once('listening', () => {
      probe.close(() => resolveAvailable(true));
    });
    probe.listen(candidatePort, host);
  });
}

async function availablePort(preferredPort) {
  for (let candidatePort = preferredPort; candidatePort < preferredPort + 20; candidatePort += 1) {
    if (await isPortAvailable(candidatePort)) return candidatePort;
  }
  throw new Error(`no available background review port found starting at ${preferredPort}`);
}

let server = null;
if (!process.env.PLAYTEST_URL) {
  port = await availablePort(port);
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

async function waitForPlaytest(page, biome) {
  await page.waitForFunction((targetBiome) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(window.__AQUA_PLAYTEST__?.command) && snap?.world?.ready !== false && snap?.state?.biome === targetBiome;
  }, biome, { timeout: 25000 });
}

async function command(page, biome, name, value) {
  await waitForPlaytest(page, biome);
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null, [name, value]);
}

async function screenshotBytes(path) {
  return (await stat(path)).size;
}

async function captureVisualScreenshot(page, path) {
  await page.screenshot({ path, fullPage: false });
  let bytes = await screenshotBytes(path);
  if (bytes < 20000) {
    await page.waitForTimeout(500);
    await page.screenshot({ path, fullPage: false });
    bytes = await screenshotBytes(path);
  }
  return bytes;
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  await new Promise((resolveStop) => {
    server.once('exit', resolveStop);
    server.kill('SIGTERM');
    setTimeout(resolveStop, 2000);
  });
}

const base = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1`;
if (server) await waitForServer(`${base}&biome=1`);

const browser = await chromium.launch({ headless: true });

const captures = [];
const parallaxCaptures = [];
const swimByCaptures = [];
try {
  for (const target of targets) {
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
    if (server) await waitForServer(`${base}&biome=${target.biome}`, 10000);
    const url = process.env.PLAYTEST_URL
      ? `${process.env.PLAYTEST_URL}&biome=${target.biome}`
      : `${base}&biome=${target.biome}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.addStyleTag({ content: 'html.__water9_grayscale canvas { filter: grayscale(1); }' });
      await waitForPlaytest(page, target.biome);
      const review = await command(page, target.biome, 'backgroundReview', {
        label: target.label,
        depth: target.depth,
        clearWaterWindow: true,
      });
      await page.waitForTimeout(220);
      if (!review) errors.push({ type: 'assertion', text: `${target.label} returned no background review` });
      const colorPath = `${outDir}/${prefix}-${target.label}.png`;
      const colorBytes = await captureVisualScreenshot(page, colorPath);
      await page.evaluate(() => document.documentElement.classList.add('__water9_grayscale'));
      await page.waitForTimeout(60);
      const grayscalePath = `${outDir}/${prefix}-${target.label}-grayscale.png`;
      const grayscaleBytes = await captureVisualScreenshot(page, grayscalePath);
      if (colorBytes < 20000) errors.push({ type: 'assertion', text: `${target.label} color screenshot looks too small/nonvisual: ${colorBytes} bytes` });
      if (grayscaleBytes < 20000) errors.push({ type: 'assertion', text: `${target.label} grayscale screenshot looks too small/nonvisual: ${grayscaleBytes} bytes` });
      if (!review?.activeProfile?.id) errors.push({ type: 'assertion', text: `${target.label} missing active profile metadata` });
      if (review?.activeProfile?.biome !== 1) errors.push({ type: 'assertion', text: `${target.label} active profile is not Shallows biome 1` });
      if (!review?.activeProfile?.activeBand) errors.push({ type: 'assertion', text: `${target.label} missing active band metadata` });
      if (!review?.activeBand?.id) errors.push({ type: 'assertion', text: `${target.label} missing active band parameter metadata` });
      if (!review?.repeatModes?.worldSpaceNoise || !review?.repeatModes?.anchors) errors.push({ type: 'assertion', text: `${target.label} missing repeat-mode summary metadata` });
      if (!Array.isArray(review?.layers) || review.layers.length < 1) errors.push({ type: 'assertion', text: `${target.label} missing layer metadata` });
      if (review?.layers?.some((layer) => layer.layerKind === 'scenic' && layer.repeatYEnabled && !layer.seamless)) {
        errors.push({ type: 'assertion', text: `${target.label} has non-seamless scenic layer with repeatY enabled` });
      }
      if (!review?.worldSpaceNoise || review.worldSpaceNoise.repeatMode !== 'worldSpaceNoise') {
        errors.push({ type: 'assertion', text: `${target.label} missing world-space noise metadata` });
      }
      if (!review?.anchors || review.anchors.repeatMode !== 'anchor') {
        errors.push({ type: 'assertion', text: `${target.label} missing anchor metadata` });
      }
      if (reviewPhase === 'phase3') assertPhase3Review(review, target, errors);
      captures.push({
        ...target,
        colorPath,
        grayscalePath,
        colorBytes,
        grayscaleBytes,
        review,
        obviousSingleViewportYRepeat: Boolean(review?.layers?.some((layer) => layer.obviousSingleViewportYRepeat)),
        yRepeatRiskFromMetadata: Boolean(review?.layers?.some((layer) => layer.yRepeatRiskFromMetadata)),
        scenicRepeatYViolation: Boolean(review?.layers?.some((layer) => layer.scenicRepeatYViolation)),
        activeProfile: review?.activeProfile ?? null,
        activeBand: review?.activeProfile?.activeBand ?? null,
        repeatModes: review?.repeatModes ?? null,
        anchorCount: review?.anchors?.profileCount ?? 0,
        visibleAnchorCount: review?.anchors?.visibleCount ?? 0,
        manifestCount: Array.isArray(review?.manifest) ? review.manifest.length : 0,
        activeTextureKeys: Array.isArray(review?.layers) ? review.layers.map((layer) => layer.textureKey) : [],
        bandPlateStatuses: Array.isArray(review?.manifest)
          ? review.manifest.filter((asset) => asset.role === 'bandPlate').map((asset) => ({
            id: asset.id,
            textureKey: asset.textureKey,
            sourcePath: asset.sourcePath,
            sourceStatus: asset.sourceStatus,
            availableInRuntime: asset.availableInRuntime,
          }))
          : [],
        landmarkStatuses: Array.isArray(review?.manifest)
          ? review.manifest.filter((asset) => asset.role === 'landmark').map((asset) => ({
            id: asset.id,
            textureKey: asset.textureKey,
            sourcePath: asset.sourcePath,
            sourceStatus: asset.sourceStatus,
            availableInRuntime: asset.availableInRuntime,
          }))
          : [],
        maskStatuses: Array.isArray(review?.manifest)
          ? review.manifest.filter((asset) => asset.role === 'textureMask').map((asset) => ({
            id: asset.id,
            textureKey: asset.textureKey,
            sourcePath: asset.sourcePath,
            sourceStatus: asset.sourceStatus,
            availableInRuntime: asset.availableInRuntime,
          }))
          : [],
      });
    } finally {
      await page.close().catch(() => {});
    }
  }
  const parallaxPage = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  parallaxPage.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
  parallaxPage.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
      errors.push({ type: 'console', text: message.text() });
    }
  });
  parallaxPage.on('response', (response) => {
    if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
  });
  try {
    if (server) await waitForServer(`${base}&biome=1`, 10000);
    const url = process.env.PLAYTEST_URL
      ? `${process.env.PLAYTEST_URL}&biome=1`
      : `${base}&biome=1`;
    await parallaxPage.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForPlaytest(parallaxPage, 1);
    const scrollTargets = [
      { label: 'transition-deep-parallax-left', reviewX: 1500 },
      { label: 'transition-deep-parallax-center', reviewX: 3000 },
      { label: 'transition-deep-parallax-right', reviewX: 4500 },
    ];
    for (const target of scrollTargets) {
      const review = await command(parallaxPage, 1, 'backgroundReview', {
        label: target.label,
        depth: 1560,
        reviewX: target.reviewX,
        clearWaterWindow: true,
      });
      await parallaxPage.waitForTimeout(220);
      const colorPath = `${outDir}/${prefix}-${target.label}.png`;
      const colorBytes = await captureVisualScreenshot(parallaxPage, colorPath);
      if (colorBytes < 20000) errors.push({ type: 'assertion', text: `${target.label} screenshot looks too small/nonvisual: ${colorBytes} bytes` });
      parallaxCaptures.push({
        ...target,
        depth: 1560,
        colorPath,
        colorBytes,
        review,
        visibleAnchorCount: review?.anchors?.visibleCount ?? 0,
        phase7Anchors: Array.isArray(review?.anchors?.items)
          ? review.anchors.items.filter((anchor) => String(anchor.assetId ?? '').startsWith('phase7-transition-'))
          : [],
        phase8Anchors: Array.isArray(review?.anchors?.items)
          ? review.anchors.items.filter((anchor) => String(anchor.assetId ?? '').startsWith('phase8-transition-'))
          : [],
        phase9Anchors: Array.isArray(review?.anchors?.items)
          ? review.anchors.items.filter((anchor) => String(anchor.assetId ?? '').startsWith('phase9-transition-'))
          : [],
        targetLandmarkAnchors: Array.isArray(review?.anchors?.items)
          ? review.anchors.items.filter((anchor) => String(anchor.assetId ?? '').startsWith(landmarkPrefix))
          : [],
      });
    }
    const swimTargets = [
      { label: 'transition-deep-swimby-01-enter', reviewX: 1100 },
      { label: 'transition-deep-swimby-02-approach', reviewX: 1700 },
      { label: 'transition-deep-swimby-03-near-player', reviewX: 2300 },
      { label: 'transition-deep-swimby-04-crossing', reviewX: 2900 },
      { label: 'transition-deep-swimby-05-passing', reviewX: 3500 },
      { label: 'transition-deep-swimby-06-exit', reviewX: 4100 },
      { label: 'transition-deep-swimby-07-next-landmark', reviewX: 4700 },
    ];
    for (const target of swimTargets) {
      const review = await command(parallaxPage, 1, 'backgroundReview', {
        label: target.label,
        depth: 1560,
        reviewX: target.reviewX,
        clearWaterWindow: true,
      });
      await parallaxPage.waitForTimeout(180);
      const colorPath = `${outDir}/${prefix}-${target.label}.png`;
      const colorBytes = await captureVisualScreenshot(parallaxPage, colorPath);
      if (colorBytes < 20000) errors.push({ type: 'assertion', text: `${target.label} screenshot looks too small/nonvisual: ${colorBytes} bytes` });
      const anchors = Array.isArray(review?.anchors?.items) ? review.anchors.items : [];
      const phase8Anchors = anchors.filter((anchor) => String(anchor.assetId ?? '').startsWith('phase8-transition-'));
      const phase9Anchors = anchors.filter((anchor) => String(anchor.assetId ?? '').startsWith('phase9-transition-'));
      const targetLandmarkAnchors = anchors.filter((anchor) => String(anchor.assetId ?? '').startsWith(landmarkPrefix));
      if (targetLandmarkAnchors.length < 1) errors.push({ type: 'assertion', text: `${target.label} has no visible ${landmarkLabel} landmark anchor` });
      swimByCaptures.push({
        ...target,
        depth: 1560,
        colorPath,
        colorBytes,
        review,
        visibleAnchorCount: review?.anchors?.visibleCount ?? 0,
        phase3Anchors: anchors.filter((anchor) => {
          const id = String(anchor.assetId ?? '');
          return id && !id.startsWith('phase5-') && !id.startsWith('phase7-') && !id.startsWith('phase8-');
        }),
        phase5Anchors: anchors.filter((anchor) => String(anchor.assetId ?? '').startsWith('phase5-')),
        phase7AtmosphereAnchors: anchors.filter((anchor) => String(anchor.assetId ?? '').startsWith('phase7-transition-')),
        phase8LandmarkAnchors: phase8Anchors,
        phase9LandmarkAnchors: phase9Anchors,
        targetLandmarkAnchors,
      });
    }
  } finally {
    await parallaxPage.close().catch(() => {});
  }
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  const report = {
    schema: `water9/background-${reviewPhase}-review@1`,
    generatedAt: new Date().toISOString(),
    reviewPhase,
    landmarkPhase,
    passed: errors.length === 0,
    viewport,
    captures,
    parallaxCaptures,
    swimByCaptures,
    obviousSingleViewportYRepeatInBaseline: captures.some((capture) => capture.obviousSingleViewportYRepeat),
    yRepeatRiskFromMetadataInBaseline: captures.some((capture) => capture.yRepeatRiskFromMetadata),
    scenicRepeatYViolation: captures.some((capture) => capture.scenicRepeatYViolation),
    errors,
    serverLogs: serverLogs.join('').slice(-4000),
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close().catch(() => {});
  await stopServer();
}

if (errors.length) {
  console.error('Water9 background review failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 background review passed.');
console.log(`Report: ${reportPath}`);
process.exit(0);

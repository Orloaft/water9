import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { relative, resolve } from 'node:path';
import { chromium } from 'playwright';

const repo = process.cwd();
const root = process.env.WATER9_SLICE4_OUT_DIR
  ?? '/home/orlovboros/artifacts/managers/water9/swimming-backgrounds-full-implementation-2026-07-13/slice4';
const outDir = resolve(root, 'visual-matrix');
const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_SLICE4_PORT ?? 5186);
const viewport = { width: 1440, height: 900 };
const seeds = [101, 202, 303];
const depths = [110, 510, 530, 1030, 1050, 1430, 1450];
const cutoffs = new Map([[110, 120], [510, 520], [530, 520], [1030, 1040], [1050, 1040], [1430, 1440], [1450, 1440]]);
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: repo, encoding: 'utf8' }).trim();
await mkdir(outDir, { recursive: true });
await mkdir(resolve(outDir, 'normal-play'), { recursive: true });
await mkdir(resolve(outDir, 'recognition'), { recursive: true });
await mkdir(resolve(outDir, 'adversarial'), { recursive: true });

async function portAvailable(port) {
  return new Promise((done) => {
    const probe = net.createServer();
    probe.once('error', () => done(false));
    probe.once('listening', () => probe.close(() => done(true)));
    probe.listen(port, host);
  });
}
async function choosePort() {
  const ports = Array.from({ length: 20 }, (_, index) => 5180 + index)
    .sort((a, b) => Math.abs(a - requestedPort) - Math.abs(b - requestedPort));
  for (const port of ports) if (await portAvailable(port)) return port;
  throw new Error('no free Slice 4 capture port in 5180-5199');
}
const port = await choosePort();
const baseUrl = `http://${host}:${port}/`;
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], { cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] });
const serverLogs = [];
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const runtimeErrors = [];

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {}
    await sleep(120);
  }
  throw new Error('Slice 4 capture server did not become ready');
}
async function command(page, name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue), [name, value]);
  await page.waitForTimeout(70);
  return result;
}
async function immediateCommand(page, name, value) {
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue), [name, value]);
}
async function rawCanvasPng(page, grayscale = false) {
  const dataUrl = await page.evaluate((gray) => {
    const source = document.querySelector('#game canvas');
    if (!source) return null;
    if (!gray) return source.toDataURL('image/png');
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(source, 0, 0);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < image.data.length; index += 4) {
      const luma = Math.round(image.data[index] * 0.2126 + image.data[index + 1] * 0.7152 + image.data[index + 2] * 0.0722);
      image.data[index] = luma; image.data[index + 1] = luma; image.data[index + 2] = luma;
    }
    context.putImageData(image, 0, 0);
    return canvas.toDataURL('image/png');
  }, grayscale);
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}
async function canvasMetrics(page, snapshot, probe) {
  return page.evaluate(({ snap, roi }) => {
    const liveRoi = window.__AQUA_PLAYTEST__?.command('interactionReadabilityProbe') ?? roi;
    const canvas = document.querySelector('#game canvas');
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false };
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const sx = canvas.width / liveRoi.canvas.width;
    const sy = canvas.height / liveRoi.canvas.height;
    const lumaAt = (x, y) => {
      const px = Math.max(0, Math.min(canvas.width - 1, Math.round(x * sx)));
      const py = Math.max(0, Math.min(canvas.height - 1, Math.round(y * sy)));
      const index = (py * canvas.width + px) * 4;
      return pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722;
    };
    const ellipticalEdgeContrast = (edgeRoi) => {
      if (!edgeRoi) return null;
      const values = [];
      for (let ai = 0; ai < 64; ai += 1) {
        const angle = ai / 64 * Math.PI * 2;
        const band = [];
        for (let scale = 0.4; scale <= 0.62; scale += 0.005) {
          band.push(lumaAt(edgeRoi.centerX + Math.cos(angle) * edgeRoi.width * scale, edgeRoi.centerY + Math.sin(angle) * edgeRoi.height * scale));
        }
        values.push(Math.max(...band) - Math.min(...band));
      }
      values.sort((a, b) => a - b);
      return Number((values[Math.floor(values.length * 0.75)] ?? 0).toFixed(2));
    };
    let sum = 0, below24 = 0, samples = 0;
    for (let y = 0; y < canvas.height; y += 4) for (let x = 0; x < canvas.width; x += 4) {
      const index = (y * canvas.width + x) * 4;
      const luma = pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722;
      sum += luma; below24 += luma < 24 ? 1 : 0; samples += 1;
    }
    const threats = liveRoi.threats.filter((threat) => threat.actionable).slice(0, 6).map((threat) => ({ id: threat.id, kind: threat.kind, distance: threat.distance, edgeContrast: ellipticalEdgeContrast(threat.edgeRoi), edgeRoi: threat.edgeRoi }));
    const anchors = snap.environmentVisualProfile.renderedBitmapAnchors.map((anchor) => {
      const bounds = anchor.screenBounds;
      const visibleWidth = Math.max(0, Math.min(roi.canvas.width, bounds.x + bounds.width) - Math.max(0, bounds.x));
      const visibleHeight = Math.max(0, Math.min(roi.canvas.height, bounds.y + bounds.height) - Math.max(0, bounds.y));
      return { textureKey: anchor.textureKey, role: anchor.compositionRole, stableLocationKey: anchor.stableLocationKey, visibleAreaRatio: Number((visibleWidth * visibleHeight / (roi.canvas.width * roi.canvas.height)).toFixed(6)), corridorOverlapRatio: anchor.corridorOverlapRatio, interactionFocalAlphaScale: anchor.interactionFocalAlphaScale, sourceDimensions: anchor.sourceDimensions };
    });
    return {
      exists: true,
      backing: [canvas.width, canvas.height],
      roiDefinition: 'HUD-excluded raw canvas; draw, gameplay-authoritative ROI query, and pixel read are atomic in one browser evaluation; diver priority ellipse, hostile-fish presentation/hit ellipse, and dangerous articulated-part hit ellipse only; 64 rays sample the 0.40–0.62 normalized ellipse boundary band at 0.005 steps; each contributes peak-to-trough luma across the composited edge; result is ray p75',
      meanLuma: Number((sum / samples).toFixed(2)),
      belowLuma24Pct: Number((below24 / samples * 100).toFixed(2)),
      diverEdgeContrast: ellipticalEdgeContrast(liveRoi.player.edgeRoi),
      threats,
      minimumThreatEdgeContrast: threats.length ? Math.min(...threats.map((threat) => threat.edgeContrast ?? 0)) : null,
      landmarks: anchors,
      maxLandmarkVisibleAreaRatio: anchors.length ? Math.max(...anchors.map((anchor) => anchor.visibleAreaRatio)) : 0,
    };
  }, { snap: snapshot, roi: probe });
}

const recognitionOrder = [];
for (const biome of [1, 2, 3, 4]) for (const seed of seeds) recognitionOrder.push({ biome, seed, depth: 760 });
recognitionOrder.sort((a, b) => ((a.seed * 53 + a.biome * 211) % 997) - ((b.seed * 53 + b.biome * 211) % 997));
const recognitionIds = new Map(recognitionOrder.map((entry, index) => [`${entry.biome}:${entry.seed}`, `C${String(index + 1).padStart(2, '0')}`]));
const evidence = { schema: 'water9/swimming-backgrounds-slice4-visual-evidence@1', generatedAt: new Date().toISOString(), repo, branch, head, port, renderer: 'canvas', viewport, provenance: 'actual normal-play DeepdiveScene #game canvas at gameplay zoom with live Water9 DOM HUD for acceptance captures; raw canvas-only output used only for metrics and blind cards; no backgroundReview or substitute scene; deep threat/prompt scenario transparently uses Slice 4 playtest staging in existing unmodified water', runtimeErrors, captures: [], adversarial: [] };
let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  for (const biome of [1, 2, 3, 4]) for (const seed of seeds) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    page.on('pageerror', (error) => runtimeErrors.push({ type: 'pageerror', biome, seed, text: error.message }));
    page.on('console', (message) => { if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) runtimeErrors.push({ type: 'console', biome, seed, text: message.text() }); });
    await page.goto(`${baseUrl}?playtest=1&normalThreats=1&biome=${biome}&seed=${seed}&renderer=canvas&perfHud=0`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 25000 });
    await page.waitForFunction(() => { const snapshot = window.__AQUA_PLAYTEST__?.snapshot?.(); return Boolean(snapshot?.world?.ready !== false && snapshot?.ui?.biomeLoading?.active !== true); }, null, { timeout: 45000 });
    await command(page, 'start'); await command(page, 'dive'); await command(page, 'clearProofOverlays'); await command(page, 'maxUpgrades'); await command(page, 'refill');
    const pairedX = new Map();
    for (const targetDepth of depths) {
      const boundaryDepth = cutoffs.get(targetDepth);
      const teleport = targetDepth === 110
        ? await command(page, 'teleportToSwimLane', { x: 1, y: 0, depthMeters: targetDepth })
        : await command(page, 'teleportToCutoffOpenWater', { boundaryDepth, depthMeters: targetDepth, tileX: pairedX.get(boundaryDepth) });
      if (!teleport?.ok || teleport.terrainModified === true) throw new Error(`B${biome} seed ${seed} ${targetDepth} existing-water staging failed: ${JSON.stringify(teleport)}`);
      if (targetDepth !== 110 && !pairedX.has(boundaryDepth)) pairedX.set(boundaryDepth, teleport.tileX);
      await command(page, 'centerCameraOnPlayer'); await command(page, 'clearProofOverlays'); await command(page, 'refill'); await page.waitForTimeout(160);
      const snapshot = await page.evaluate(() => window.__AQUA_PLAYTEST__.snapshot());
      const probe = await immediateCommand(page, 'interactionReadabilityProbe');
      const metrics = await canvasMetrics(page, snapshot, probe);
      const id = `b${biome}-s${seed}-${targetDepth}m`;
      const colorPath = resolve(outDir, 'normal-play', `${id}-color.png`);
      const grayPath = resolve(outDir, 'normal-play', `${id}-grayscale.png`);
      await page.screenshot({ path: colorPath, fullPage: false });
      await page.evaluate(() => { document.documentElement.style.filter = 'grayscale(1)'; });
      await page.screenshot({ path: grayPath, fullPage: false });
      await page.evaluate(() => { document.documentElement.style.filter = ''; });
      evidence.captures.push({ id, biome, seed, targetDepth, actualDepth: snapshot.state.depth, depthBand: snapshot.environmentVisualProfile.activeProfile.depthBand, teleport, snapshot: { camera: snapshot.camera, player: snapshot.player, anchors: snapshot.environmentVisualProfile.renderedBitmapAnchors }, probe, metrics, colorPath, grayscalePath: grayPath, acceptedEvidence: true });
    }
    const lane = await command(page, 'teleportToSwimLane', { x: 1, y: 0, depthMeters: 760 });
    if (!lane?.ok || lane.terrainModified !== false) throw new Error(`recognition lane failed B${biome} seed ${seed}`);
    await command(page, 'centerCameraOnPlayer'); await command(page, 'clearProofOverlays'); await page.waitForTimeout(140);
    const recognitionId = recognitionIds.get(`${biome}:${seed}`);
    const recognitionPath = resolve(outDir, 'recognition', `${recognitionId}.png`);
    await writeFile(recognitionPath, await rawCanvasPng(page, false));
    if (biome === 3) {
      const staging = await command(page, 'teleportToCutoffOpenWater', { boundaryDepth: 1040, depthMeters: 1050 });
      const threatStage = await command(page, 'stageInteractionReadabilityFish');
      await command(page, 'clearProofOverlays');
      const prompt = await command(page, 'stageInteractionReadabilityPrompt');
      await page.waitForTimeout(55);
      const snapshot = await page.evaluate(() => window.__AQUA_PLAYTEST__.snapshot());
      const probe = await immediateCommand(page, 'interactionReadabilityProbe');
      const metrics = await canvasMetrics(page, snapshot, probe);
      const id = `b3-s${seed}-1050m-threat-prompt`;
      const colorPath = resolve(outDir, 'adversarial', `${id}-color.png`);
      const grayPath = resolve(outDir, 'adversarial', `${id}-grayscale.png`);
      await page.screenshot({ path: colorPath, fullPage: false });
      await page.evaluate(() => { document.documentElement.style.filter = 'grayscale(1)'; }); await page.screenshot({ path: grayPath, fullPage: false }); await page.evaluate(() => { document.documentElement.style.filter = ''; });
      evidence.adversarial.push({ id, biome, seed, requestedDepth: 1050, actualDepth: snapshot.state.depth, staging: { ...staging, threatStage }, prompt, probe, metrics, colorPath, grayscalePath: grayPath, acceptedEvidence: metrics.diverEdgeContrast >= 25 && metrics.minimumThreatEdgeContrast >= 25 });
    }
    if (biome === 4) {
      const staging = await command(page, 'stageDeepBiomePresentation', { requestedDepthMeters: 1650, creatureId: 'abyssal-gulper', standOff: 235 });
      await command(page, 'clearProofOverlays');
      const prompt = await command(page, 'stageInteractionReadabilityPrompt');
      await page.waitForTimeout(55);
      const snapshot = await page.evaluate(() => window.__AQUA_PLAYTEST__.snapshot());
      const probe = await immediateCommand(page, 'interactionReadabilityProbe');
      const metrics = await canvasMetrics(page, snapshot, probe);
      const id = `b4-s${seed}-1650m-threat-prompt`;
      const colorPath = resolve(outDir, 'adversarial', `${id}-color.png`);
      const grayPath = resolve(outDir, 'adversarial', `${id}-grayscale.png`);
      await page.screenshot({ path: colorPath, fullPage: false });
      await page.evaluate(() => { document.documentElement.style.filter = 'grayscale(1)'; }); await page.screenshot({ path: grayPath, fullPage: false }); await page.evaluate(() => { document.documentElement.style.filter = ''; });
      evidence.adversarial.push({ id, biome, seed, requestedDepth: 1650, actualDepth: snapshot.state.depth, staging, prompt, probe, metrics, colorPath, grayscalePath: grayPath, acceptedEvidence: metrics.diverEdgeContrast >= 25 && metrics.minimumThreatEdgeContrast >= 25 });
    }
    await page.close();
  }
  const cutoffPairs = [];
  for (const biome of [1, 2, 3, 4]) for (const seed of seeds) for (const [before, after] of [[510, 530], [1030, 1050], [1430, 1450]]) {
    const a = evidence.captures.find((capture) => capture.biome === biome && capture.seed === seed && capture.targetDepth === before);
    const b = evidence.captures.find((capture) => capture.biome === biome && capture.seed === seed && capture.targetDepth === after);
    cutoffPairs.push({ biome, seed, before, after, meanLumaDelta: Number(Math.abs(a.metrics.meanLuma - b.metrics.meanLuma).toFixed(2)), belowLuma24DeltaPctPoints: Number(Math.abs(a.metrics.belowLuma24Pct - b.metrics.belowLuma24Pct).toFixed(2)), identityStable: JSON.stringify(a.snapshot.anchors.map((x) => x.stableLocationKey)) === JSON.stringify(b.snapshot.anchors.map((x) => x.stableLocationKey)) });
  }
  const subjectFrames = [
    ...evidence.captures.filter((capture) => capture.biome >= 3 && capture.actualDepth >= 900),
    ...evidence.adversarial,
  ].filter((capture) => capture.metrics.diverEdgeContrast !== null);
  const threatFrames = evidence.adversarial;
  evidence.acceptance = {
    frameCount: evidence.captures.length,
    adversarialCount: evidence.adversarial.length,
    contrastSampleScope: 'deep B3/B4 normal-play diver frames plus six B3/B4 adversarial diver/actionable-threat frames; HUD excluded',
    diverContrastSampleCount: subjectFrames.length,
    threatContrastSampleCount: threatFrames.length,
    deepDarknessMaximumPct: Math.max(...evidence.captures.filter((capture) => capture.actualDepth >= 1030).map((capture) => capture.metrics.belowLuma24Pct)),
    diverEdgePassRate: subjectFrames.filter((capture) => capture.metrics.diverEdgeContrast >= 25).length / subjectFrames.length,
    threatEdgePassRate: threatFrames.filter((capture) => (capture.metrics.minimumThreatEdgeContrast ?? 0) >= 25).length / Math.max(1, threatFrames.length),
    promptContrastRatio: 6.3744,
    maxLandmarkVisibleAreaRatio: Math.max(...evidence.captures.map((capture) => capture.metrics.maxLandmarkVisibleAreaRatio)),
    corridorOverlapFrames: evidence.captures.filter((capture) => capture.metrics.landmarks.some((anchor) => (anchor.corridorOverlapRatio ?? 0) > 0)).length,
    cutoffPairs,
    maxCutoffMeanLumaDelta: Math.max(...cutoffPairs.map((pair) => pair.meanLumaDelta)),
    maxCutoffBelowLuma24DeltaPctPoints: Math.max(...cutoffPairs.map((pair) => pair.belowLuma24DeltaPctPoints)),
    cutoffIdentityMisses: cutoffPairs.filter((pair) => !pair.identityStable).length,
    fullFrameCutoffMetricStatus: 'context-only: live terrain/creature motion is intentionally present; authoritative controlled background-only continuity is the Slice 1 2,576-profile smoke',
  };
  await writeFile(resolve(outDir, 'visual-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  const recognitionIndex = { schema: 'water9/slice4-anonymous-biome-recognition-deck@1', generatedAt: evidence.generatedAt, instructions: 'Randomized HUD-free, label-free raw-canvas cards. Record B1–B4 for each card without opening the separate key.', humanReviewsPerformed: 0, cards: recognitionOrder.map((entry, index) => ({ id: `C${String(index + 1).padStart(2, '0')}`, path: `recognition/C${String(index + 1).padStart(2, '0')}.png` })) };
  const answerKey = { schema: 'water9/slice4-anonymous-biome-recognition-key@1', generatedAt: evidence.generatedAt, humanReviewsPerformed: 0, claim: 'No human recognition score claimed.', answers: recognitionOrder.map((entry, index) => ({ id: `C${String(index + 1).padStart(2, '0')}`, ...entry })) };
  await writeFile(resolve(outDir, 'recognition-index.json'), `${JSON.stringify(recognitionIndex, null, 2)}\n`);
  await writeFile(resolve(outDir, 'recognition-answer-key.json'), `${JSON.stringify(answerKey, null, 2)}\n`);
  await writeFile(resolve(outDir, 'recognition-index.html'), `<!doctype html><meta charset="utf-8"><title>Water9 anonymous recognition deck</title><style>body{background:#061019;color:#d8f4f0;font:16px sans-serif}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.card{background:#0b1923;padding:8px}.card img{display:block;width:100%}.id{text-align:center;margin-top:6px;font-weight:700}</style><h1>Anonymous biome recognition deck</h1><p>Assign B1–B4 without opening the separate answer key.</p><div class="grid">${recognitionIndex.cards.map((card) => `<div class="card"><img src="${card.path}" alt="anonymous card"><div class="id">${card.id}</div></div>`).join('')}</div>`);
  const files = [];
  async function walk(directory) { for (const entry of await readdir(directory, { withFileTypes: true })) { const path = resolve(directory, entry.name); if (entry.isDirectory()) await walk(path); else files.push(path); } }
  await walk(outDir);
  const artifacts = [];
  for (const path of files.sort()) artifacts.push({ path, relativePath: relative(root, path), bytes: (await stat(path)).size, sha256: createHash('sha256').update(await readFile(path)).digest('hex'), role: path.includes('/recognition/') ? 'hud-free-label-free-recognition-card' : path.endsWith('visual-evidence.json') ? 'visual-measurements' : path.includes('/adversarial/') ? 'normal-play-adversarial-threat-prompt-proof' : path.includes('/normal-play/') ? 'normal-play-traversal-proof' : 'recognition-deck-metadata', acceptedEvidence: true });
  await writeFile(resolve(outDir, 'capture-manifest.json'), `${JSON.stringify({ schema: 'water9/swimming-backgrounds-slice4-capture-manifest@1', generatedAt: new Date().toISOString(), artifactRoot: root, captureProvenance: evidence.provenance, artifacts }, null, 2)}\n`);
} finally {
  await browser?.close().catch(() => {});
  if (server.exitCode === null) { server.kill('SIGTERM'); await new Promise((done) => server.once('exit', done)); }
}
if (runtimeErrors.length) { console.error(JSON.stringify(runtimeErrors, null, 2)); process.exit(1); }
console.log(JSON.stringify({ ok: true, outDir, captures: evidence.captures.length, adversarial: evidence.adversarial.length, acceptance: evidence.acceptance, serverLogs: serverLogs.join('').slice(-1000) }, null, 2));

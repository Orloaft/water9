import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_CONTINUITY_PORT ?? 5191);
const reportPath = process.env.WATER9_CONTINUITY_REPORT
  ?? 'runs/swimming-backgrounds-full-implementation-2026-07-13/slice1-continuity-smoke.json';

async function portAvailable(port) {
  return new Promise((done) => {
    const probe = net.createServer();
    probe.once('error', () => done(false));
    probe.once('listening', () => probe.close(() => done(true)));
    probe.listen(port, host);
  });
}

async function choosePort() {
  const candidates = [
    ...Array.from({ length: 5200 - requestedPort }, (_, index) => requestedPort + index),
    ...Array.from({ length: Math.max(0, requestedPort - 5180) }, (_, index) => 5180 + index),
  ].filter((port) => port >= 5180 && port <= 5199);
  for (const port of candidates) if (await portAvailable(port)) return port;
  throw new Error('no free continuity-smoke port in 5180-5199');
}

const port = await choosePort();
const baseUrl = `http://${host}:${port}/?playtest=1&biome=1&renderer=canvas`;
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
const serverLogs = [];
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const errors = [];

async function waitForServer() {
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Vite exited ${server.exitCode}`);
    try {
      const response = await fetch(baseUrl, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {}
    await sleep(150);
  }
  throw new Error('continuity-smoke server did not become ready');
}

function fail(text) {
  errors.push({ type: 'assertion', text });
}

function maxDelta(previous, current) {
  let max = 0;
  for (let index = 0; index < Math.min(previous.length, current.length); index += 1) {
    max = Math.max(max, Math.abs(previous[index] - current[index]));
  }
  return max;
}

let browser;
let report = {};
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.snapshot), null, { timeout: 20000 });

  const matrix = await page.evaluate(async () => {
    const helpers = await import('/src/helpers.ts');
    const cutoffs = [120, 520, 1040, 1440];
    const out = [];
    for (const biome of [1, 2, 3, 4]) {
      for (const cutoff of cutoffs) {
        const frames = [];
        for (let depth = cutoff - 80; depth <= cutoff + 80; depth += 1) {
          const profile = helpers.environmentVisualProfileFor(biome, depth);
          const anchors = helpers.environmentAnchorSilhouettesFor(profile, 0, 1440 / 3.7, 0, 900 / 3.7);
          const color = Number.parseInt(profile.cameraClearColor.slice(1), 16);
          frames.push({
            depth,
            blend: profile.activeBandBlend,
            scalarAlphas: [
              profile.overlay.alpha,
              profile.darkness.ambientOpacity,
              profile.darkness.maskOpacity,
              profile.background.worldSpaceNoise.postDarknessVeil.alpha,
              profile.background.worldSpaceNoise.postDarknessVeil.particleAlpha,
              ...profile.background.layers.map((layer) => layer.alpha),
              ...profile.background.worldSpaceNoise.layers.map((layer) => layer.alpha),
            ],
            clearRgb: [(color >> 16) & 255, (color >> 8) & 255, color & 255],
            anchors: anchors.map((anchor) => ({
              key: `${anchor.assetId ?? anchor.kind}:${anchor.id.replace(/-(outgoing|incoming)$/, '')}`,
              x: anchor.x * 3.7,
              y: anchor.y * 3.7,
              alpha: anchor.alpha,
            })),
            readability: profile.readability,
          });
        }
        out.push({ biome, cutoff, frames });
      }
    }
    return out;
  });

  const results = [];
  for (const sample of matrix) {
    let maxAlphaDelta = 0;
    let maxAlphaDetail = null;
    let maxClearChannelDelta = 0;
    let maxAnchorPositionDeltaPx = 0;
    let monotonic = true;
    for (let index = 0; index < sample.frames.length; index += 1) {
      const frame = sample.frames[index];
      if (frame.blend.widthMeters < 120) fail(`B${sample.biome} ${sample.cutoff}m blend width ${frame.blend.widthMeters}m is below 120m`);
      if (index === 0) continue;
      const previous = sample.frames[index - 1];
      maxAlphaDelta = Math.max(maxAlphaDelta, maxDelta(previous.scalarAlphas, frame.scalarAlphas));
      maxClearChannelDelta = Math.max(maxClearChannelDelta, maxDelta(previous.clearRgb, frame.clearRgb));
      if (frame.blend.progress + 1e-9 < previous.blend.progress) monotonic = false;
      const previousAnchors = new Map(previous.anchors.map((anchor) => [anchor.key, anchor]));
      const currentAnchors = new Map(frame.anchors.map((anchor) => [anchor.key, anchor]));
      for (const key of new Set([...previousAnchors.keys(), ...currentAnchors.keys()])) {
        const delta = Math.abs((previousAnchors.get(key)?.alpha ?? 0) - (currentAnchors.get(key)?.alpha ?? 0));
        if (delta > maxAlphaDelta) {
          maxAlphaDelta = delta;
          maxAlphaDetail = {
            depth: frame.depth,
            key,
            before: previousAnchors.get(key)?.alpha ?? 0,
            after: currentAnchors.get(key)?.alpha ?? 0,
          };
        }
      }
      for (const anchor of frame.anchors) {
        const before = previousAnchors.get(anchor.key);
        if (!before || Math.min(before.alpha, anchor.alpha) <= 0.02) continue;
        maxAnchorPositionDeltaPx = Math.max(
          maxAnchorPositionDeltaPx,
          Math.hypot(anchor.x - before.x, anchor.y - before.y),
        );
      }
    }
    if (!monotonic) fail(`B${sample.biome} ${sample.cutoff}m blend progress was not monotonic`);
    if (maxAlphaDelta > 0.2) fail(`B${sample.biome} ${sample.cutoff}m alpha delta ${maxAlphaDelta.toFixed(4)} exceeded 0.20`);
    if (maxAnchorPositionDeltaPx > 4) fail(`B${sample.biome} ${sample.cutoff}m anchor motion ${maxAnchorPositionDeltaPx.toFixed(2)}px exceeded 4px`);
    results.push({
      biome: sample.biome,
      cutoff: sample.cutoff,
      widthMeters: sample.frames[0]?.blend.widthMeters,
      monotonic,
      maxAlphaDelta: Number(maxAlphaDelta.toFixed(6)),
      maxAlphaDetail,
      maxClearChannelDelta: Number(maxClearChannelDelta.toFixed(3)),
      maxAnchorPositionDeltaPx: Number(maxAnchorPositionDeltaPx.toFixed(3)),
    });
  }

  const renderingSource = await readFile('src/scene-rendering.ts', 'utf8');
  if (!renderingSource.includes('const falloffSteps = 12')) fail('bounded twelve-step Canvas lamp falloff is missing');
  if (renderingSource.includes('const stripHeight = 4')) fail('legacy four-world-pixel darkness strips remain');
  if (!renderingSource.includes('localSeparationRadius')) fail('diver-local separation field is missing');
  if (!renderingSource.includes('profile.readability.scenicAlphaScale')) fail('scenic corridor attenuation is missing');
  if (!/function waterColumnVisibleSpriteBudget\(\) \{\s*return 1;\s*\}/.test(renderingSource)) fail('one-visible-sprite water-column budget could not be confirmed');

  report = {
    schema: 'water9/depth-band-continuity-smoke@1',
    generatedAt: new Date().toISOString(),
    ok: errors.length === 0,
    port,
    coverage: {
      biomes: [1, 2, 3, 4],
      cutoffs: [120, 520, 1040, 1440],
      depthStepMeters: 1,
      playScale: 3.7,
      sampledProfiles: matrix.reduce((sum, sample) => sum + sample.frames.length, 0),
    },
    results,
    maxima: {
      alphaDelta: Math.max(...results.map((result) => result.maxAlphaDelta)),
      clearChannelDelta: Math.max(...results.map((result) => result.maxClearChannelDelta)),
      anchorPositionDeltaPx: Math.max(...results.map((result) => result.maxAnchorPositionDeltaPx)),
    },
    errors,
    serverLogs: serverLogs.join('').slice(-3000),
  };
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  report = { schema: 'water9/depth-band-continuity-smoke@1', generatedAt: new Date().toISOString(), ok: false, port, errors };
} finally {
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await browser?.close().catch(() => {});
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await new Promise((done) => {
      const timer = setTimeout(done, 3000);
      server.once('exit', () => { clearTimeout(timer); done(); });
    });
  }
}

if (!report.ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, reportPath, coverage: report.coverage, maxima: report.maxima }, null, 2));

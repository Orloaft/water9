import { spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = 'runs/water9-fauna-pathfinding-appraisal-2026-07-06';
const host = '127.0.0.1';
const requestedPort = Number(process.env.FAUNA_PATHFINDING_PORT ?? 5180);
const maxBiomes = Number(process.env.FAUNA_PATHFINDING_BIOMES ?? 4);
const candidatesPerBiome = Number(process.env.FAUNA_PATHFINDING_CANDIDATES ?? 4);
const sampleMs = Number(process.env.FAUNA_PATHFINDING_SAMPLE_MS ?? 6200);
const intervalMs = Number(process.env.FAUNA_PATHFINDING_INTERVAL_MS ?? 250);

await mkdir(outDir, { recursive: true });

const commandsRun = [
  'git -C /mnt/nxt-dev/water9 rev-parse --short HEAD',
  'sed/rg inspection of package scripts, tools/playtest.mjs, tools/test_fauna_behavior_slice.mjs, src/scene-playtest.ts, src/scene-entities.ts, src/scene-worldgen.ts, src/content.ts',
  `node ${outDir}/fauna_pathfinding_runtime_probe.mjs`,
];
const head = execFileSync('git', ['-C', '/mnt/nxt-dev/water9', 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function portAvailable(candidate) {
  return new Promise((resolvePort) => {
    const server = net.createServer();
    server.once('error', () => resolvePort(false));
    server.once('listening', () => server.close(() => resolvePort(true)));
    server.listen(candidate, host);
  });
}

async function pickPort() {
  if (await portAvailable(requestedPort)) return requestedPort;
  for (let candidate = 5180; candidate <= 5199; candidate += 1) {
    if (await portAvailable(candidate)) return candidate;
  }
  throw new Error('no available proof port in 5180-5199');
}

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function round(value, digits = 3) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function signWithDeadzone(value, threshold) {
  if (!Number.isFinite(value) || Math.abs(value) < threshold) return 0;
  return value < 0 ? -1 : 1;
}

function countFlips(values) {
  let previous = 0;
  let flips = 0;
  for (const value of values) {
    if (value === 0) continue;
    if (previous !== 0 && value !== previous) flips += 1;
    previous = value;
  }
  return flips;
}

function nearestSurfaceDistance(target, snapshot) {
  const anchors = snapshot?.floraAnchors?.terrainSurfaceSamples ?? [];
  let nearest = null;
  for (const anchor of anchors) {
    const distance = Math.hypot((target?.x ?? 0) - anchor.x, (target?.y ?? 0) - anchor.y);
    if (!nearest || distance < nearest.distance) nearest = { distance, anchor };
  }
  return nearest;
}

function chooseCandidates(snapshot, biome) {
  const indexed = new Map();
  const candidates = [];
  for (const fish of snapshot.fish ?? []) {
    const behaviorClass = fish.behaviorClass ?? 'legacySwimmer';
    if (fish.dead || fish.hostile || behaviorClass !== 'legacySwimmer') continue;
    const key = `${fish.species}|${behaviorClass}`;
    const index = indexed.get(key) ?? 0;
    indexed.set(key, index + 1);
    candidates.push({
      biome,
      species: fish.species,
      assetKey: fish.assetKey,
      pattern: fish.pattern,
      behaviorClass,
      index,
      x: fish.x,
      y: fish.y,
      radius: fish.radius,
      depthMeters: Math.max(0, Math.round((fish.y - 128) / 6)),
    });
  }
  candidates.sort((a, b) => a.y - b.y);
  const selected = [];
  const targetFractions = [0.12, 0.36, 0.62, 0.86];
  for (const fraction of targetFractions.slice(0, candidatesPerBiome)) {
    if (!candidates.length) break;
    const targetY = candidates[0].y + (candidates.at(-1).y - candidates[0].y) * fraction;
    const pick = candidates
      .filter((candidate) => !selected.some((existing) => existing.species === candidate.species))
      .sort((a, b) => Math.abs(a.y - targetY) - Math.abs(b.y - targetY))[0]
      ?? candidates.sort((a, b) => Math.abs(a.y - targetY) - Math.abs(b.y - targetY))[0];
    if (pick && !selected.some((existing) => existing.species === pick.species && existing.index === pick.index)) selected.push(pick);
  }
  return selected;
}

async function canvasProbe(page, target) {
  return page.evaluate((point) => {
    const canvas = document.querySelector('#game canvas');
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !point) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    const cx = Math.round(point.screenX * scaleX);
    const cy = Math.round(point.screenY * scaleY);
    const inner = Math.max(10, Math.round((point.radius ?? 10) + 8));
    const outer = Math.max(inner + 24, Math.round((point.radius ?? 10) + 86));
    const rays = 32;
    let nearestHighContrast = null;
    let highContrastSamples = 0;
    let totalSamples = 0;
    let previous = null;
    const sample = (x, y) => {
      if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;
      const data = context.getImageData(x, y, 1, 1).data;
      return {
        r: data[0],
        g: data[1],
        b: data[2],
        luma: data[0] * 0.2126 + data[1] * 0.7152 + data[2] * 0.0722,
      };
    };
    for (let ray = 0; ray < rays; ray += 1) {
      const angle = (Math.PI * 2 * ray) / rays;
      previous = null;
      for (let distance = inner; distance <= outer; distance += 6) {
        const pixel = sample(Math.round(cx + Math.cos(angle) * distance), Math.round(cy + Math.sin(angle) * distance));
        if (!pixel) continue;
        totalSamples += 1;
        if (previous) {
          const colorDistance = Math.hypot(pixel.r - previous.r, pixel.g - previous.g, pixel.b - previous.b);
          const lumaDelta = Math.abs(pixel.luma - previous.luma);
          if (colorDistance > 32 || lumaDelta > 20) {
            highContrastSamples += 1;
            nearestHighContrast = nearestHighContrast === null ? distance : Math.min(nearestHighContrast, distance);
          }
        }
        previous = pixel;
      }
    }
    return {
      nearestHighContrastPx: nearestHighContrast,
      highContrastRatio: totalSamples ? highContrastSamples / totalSamples : 0,
      totalSamples,
    };
  }, target);
}

async function saveCanvas(page, baseName) {
  const canvasPath = `${outDir}/${baseName}-canvas.png`;
  const grayPath = `${outDir}/${baseName}-canvas-gray.png`;
  await page.locator('#game canvas').screenshot({ path: canvasPath });
  const grayDataUrl = await page.evaluate(() => {
    const source = document.querySelector('#game canvas');
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d');
    context.drawImage(source, 0, 0);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      const luma = Math.round(data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722);
      data[i] = luma;
      data[i + 1] = luma;
      data[i + 2] = luma;
    }
    context.putImageData(image, 0, 0);
    return canvas.toDataURL('image/png');
  });
  await writeFile(grayPath, Buffer.from(grayDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
  return { canvasPath, grayPath };
}

function analyzeSeries(samples) {
  const usable = samples.filter((sample) => sample.target);
  const velocities = [];
  for (let i = 1; i < usable.length; i += 1) {
    const previous = usable[i - 1];
    const current = usable[i];
    const dt = Math.max(0.001, (current.t - previous.t) / 1000);
    velocities.push({
      vx: (current.target.x - previous.target.x) / dt,
      vy: (current.target.y - previous.target.y) / dt,
      speed: Math.hypot(current.target.x - previous.target.x, current.target.y - previous.target.y) / dt,
    });
  }
  const xs = usable.map((sample) => sample.target.x);
  const ys = usable.map((sample) => sample.target.y);
  const bbox = {
    x: round(Math.min(...xs)),
    y: round(Math.min(...ys)),
    width: round(Math.max(...xs) - Math.min(...xs)),
    height: round(Math.max(...ys) - Math.min(...ys)),
  };
  const net = usable.length >= 2
    ? Math.hypot(usable.at(-1).target.x - usable[0].target.x, usable.at(-1).target.y - usable[0].target.y)
    : 0;
  const path = velocities.reduce((total, velocity, index) => {
    const previous = usable[index];
    const current = usable[index + 1];
    return total + Math.hypot(current.target.x - previous.target.x, current.target.y - previous.target.y);
  }, 0);
  const xSigns = velocities.map((velocity) => signWithDeadzone(velocity.vx, 5));
  const ySigns = velocities.map((velocity) => signWithDeadzone(velocity.vy, 5));
  const derivedFacingSigns = xSigns.map((sign) => signWithDeadzone(sign, 0.5));
  const nearestSurfacePx = Math.min(...usable.map((sample) => sample.nearestSurface?.distance ?? Infinity));
  const nearestCanvasHighContrastPx = Math.min(...usable.map((sample) => sample.canvasProbe?.nearestHighContrastPx ?? Infinity));
  const maxReportedSpeed = Math.max(0, ...usable.map((sample) => sample.target.velocityMagnitude ?? 0));
  const suspicious =
    usable.length >= 14 &&
    (countFlips(xSigns) + countFlips(ySigns) >= 5 || countFlips(derivedFacingSigns) >= 4) &&
    bbox.width <= 86 &&
    bbox.height <= 74 &&
    net <= 42 &&
    path >= Math.max(90, net * 3) &&
    (nearestSurfacePx <= 130 || nearestCanvasHighContrastPx <= 48);
  return {
    sampleCount: usable.length,
    durationMs: usable.length >= 2 ? usable.at(-1).t - usable[0].t : 0,
    bbox,
    netDisplacementPx: round(net),
    pathLengthPx: round(path),
    pathToNetRatio: round(path / Math.max(1, net)),
    xVelocitySignFlips: countFlips(xSigns),
    yVelocitySignFlips: countFlips(ySigns),
    derivedFacingFlips: countFlips(derivedFacingSigns),
    nearestSurfaceAnchorPx: Number.isFinite(nearestSurfacePx) ? round(nearestSurfacePx) : null,
    nearestCanvasHighContrastPx: Number.isFinite(nearestCanvasHighContrastPx) ? round(nearestCanvasHighContrastPx) : null,
    maxReportedVelocityMagnitude: round(maxReportedSpeed),
    suspicious,
  };
}

async function waitForServer(url, server, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`dev server exited before ready with code ${server.exitCode}`);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite may still be binding the port.
    }
    await sleep(150);
  }
  throw new Error('dev server was not ready in time');
}

const port = await pickPort();
const baseUrl = `http://${host}:${port}/?playtest=1`;
const serverLogs = [];
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

const errors = [];
const observations = [];
let browser;
try {
  await waitForServer(baseUrl, server);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push({ type: 'console', text: message.text() });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
  });

  async function command(name, value) {
    const result = await page.evaluate(([commandName, commandValue]) => {
      return window.__AQUA_PLAYTEST__?.command?.(commandName, commandValue) ?? null;
    }, [name, value]);
    await page.waitForTimeout(result?.restarting ? 220 : 80);
    return result;
  }

  async function snapshot() {
    return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
  }

  async function waitReady(expectedBiome) {
    await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 32000 });
    await page.waitForFunction((biome) => {
      const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
      return Boolean(snap?.world && snap.world.ready !== false && snap.fish?.length && (!biome || snap.state?.biome === biome));
    }, expectedBiome, { timeout: 32000 });
  }

  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 25000 });
  await waitReady(null);
  await command('start');
  await waitReady(1);
  await command('maxUpgrades');
  await command('refill');

  for (let biome = 1; biome <= maxBiomes; biome += 1) {
    if (biome !== 1) {
      await command('setBiome', biome);
      await waitReady(biome);
      await command('maxUpgrades');
      await command('refill');
    }
    await command('clearProofOverlays');
    const initialSnapshot = await snapshot();
    const candidates = chooseCandidates(initialSnapshot, biome);
    for (const candidate of candidates) {
      const label = `b${biome}-${slug(candidate.species)}-${candidate.index}`;
      await command('maxUpgrades');
      await command('refill');
      const teleport = await command('teleportToFauna', {
        species: candidate.species,
        behaviorClass: 'legacySwimmer',
        index: candidate.index,
        distance: 46,
      });
      await command('clearProofOverlays');
      await page.waitForTimeout(180);
      const samples = [];
      const start = Date.now();
      let lastTarget = null;
      while (Date.now() - start <= sampleMs) {
        const review = await command('faunaBehaviorReview', {
          species: candidate.species,
          behaviorClass: 'legacySwimmer',
        });
        const snap = await snapshot();
        let target = null;
        if (review?.targets?.length) {
          const expected = lastTarget ?? teleport ?? candidate;
          target = [...review.targets].sort((a, b) => {
            const ad = Math.hypot(a.x - expected.x, a.y - expected.y);
            const bd = Math.hypot(b.x - expected.x, b.y - expected.y);
            return ad - bd;
          })[0];
        }
        let screenTarget = null;
        if (target && snap?.fish?.length) {
          screenTarget = [...snap.fish]
            .filter((fish) => fish.species === candidate.species && !fish.dead && (fish.behaviorClass ?? 'legacySwimmer') === 'legacySwimmer')
            .sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y))[0] ?? null;
        }
        const probeInput = screenTarget
          ? { screenX: screenTarget.screenX, screenY: screenTarget.screenY, radius: screenTarget.radius }
          : null;
        const canvas = probeInput ? await canvasProbe(page, probeInput) : null;
        const nearestSurface = target ? nearestSurfaceDistance(target, snap) : null;
        samples.push({
          t: Date.now() - start,
          target,
          screen: screenTarget ? {
            screenX: screenTarget.screenX,
            screenY: screenTarget.screenY,
            screenVisible: screenTarget.screenVisible,
          } : null,
          nearestSurface: nearestSurface ? {
            distance: round(nearestSurface.distance),
            anchor: nearestSurface.anchor,
          } : null,
          canvasProbe: canvas ? {
            nearestHighContrastPx: round(canvas.nearestHighContrastPx),
            highContrastRatio: round(canvas.highContrastRatio),
            totalSamples: canvas.totalSamples,
          } : null,
        });
        if (target) lastTarget = target;
        await page.waitForTimeout(intervalMs);
      }
      const analysis = analyzeSeries(samples);
      const evidence = await saveCanvas(page, label);
      observations.push({
        ...candidate,
        teleport,
        evidence,
        analysis,
        samples,
      });
    }
  }
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  await browser?.close().catch(() => {});
  server.kill('SIGTERM');
}

const reproduced = observations.some((observation) => observation.analysis.suspicious);
const ranked = [...observations].sort((a, b) => {
  if (a.analysis.suspicious !== b.analysis.suspicious) return a.analysis.suspicious ? -1 : 1;
  const score = (entry) =>
    entry.analysis.xVelocitySignFlips +
    entry.analysis.yVelocitySignFlips +
    entry.analysis.derivedFacingFlips +
    Math.min(8, entry.analysis.pathToNetRatio ?? 0) -
    Math.min(4, (entry.analysis.nearestSurfaceAnchorPx ?? 200) / 80);
  return score(b) - score(a);
});
const report = {
  schema: 'water9/fauna-pathfinding-runtime-proof@1',
  generatedAt: new Date().toISOString(),
  head,
  port,
  baseUrl,
  commandsRun,
  reproduced,
  errors,
  observations,
  rankedSummary: ranked.map((entry) => ({
    biome: entry.biome,
    species: entry.species,
    pattern: entry.pattern,
    depthMeters: entry.depthMeters,
    evidence: entry.evidence,
    analysis: entry.analysis,
  })),
  serverLogs: serverLogs.join('').slice(-4000),
};
await writeFile(`${outDir}/fauna-pathfinding-runtime-metrics.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  head,
  port,
  observed: observations.length,
  reproduced,
  suspicious: observations.filter((observation) => observation.analysis.suspicious).map((observation) => `${observation.species} b${observation.biome}`),
  errors: errors.length,
  metrics: `${outDir}/fauna-pathfinding-runtime-metrics.json`,
}, null, 2));
process.exit(errors.length ? 1 : 0);

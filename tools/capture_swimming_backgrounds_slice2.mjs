import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { basename, relative, resolve } from 'node:path';
import { chromium } from 'playwright';

const repo = process.cwd();
const outDir = process.env.WATER9_SLICE2_OUT_DIR
  ?? '/home/orlovboros/artifacts/managers/water9/swimming-backgrounds-full-implementation-2026-07-13/slice2';
const manifestPath = process.env.WATER9_SLICE2_MANIFEST
  ?? 'runs/swimming-backgrounds-full-implementation-2026-07-13/slice2-artifacts.json';
const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_SLICE2_PORT ?? 5192);
const viewport = { width: 1440, height: 900 };
const seeds = [101, 202, 303];
const representativeDepths = [110, 760, 1450];
const regressionScenarios = [
  { biome: 3, seed: 202, depth: 1030, regression: 'B3-1030' },
  { biome: 3, seed: 202, depth: 1050, regression: 'B3-1050' },
  { biome: 4, seed: 202, depth: 1430, regression: 'B4-1430' },
];
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: repo, encoding: 'utf8' }).trim();

await mkdir(outDir, { recursive: true });
await mkdir(resolve(outDir, 'recognition'), { recursive: true });

async function portAvailable(port) {
  return new Promise((done) => {
    const probe = net.createServer();
    probe.once('error', () => done(false));
    probe.once('listening', () => probe.close(() => done(true)));
    probe.listen(port, host);
  });
}

async function choosePort() {
  const ports = [...Array.from({ length: 20 }, (_, index) => 5180 + index)]
    .sort((a, b) => Math.abs(a - requestedPort) - Math.abs(b - requestedPort));
  for (const port of ports) if (await portAvailable(port)) return port;
  throw new Error('no free Slice 2 capture port in 5180-5199');
}

const port = await choosePort();
const baseUrl = `http://${host}:${port}/`;
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: repo,
  stdio: ['ignore', 'pipe', 'pipe'],
});
const serverLogs = [];
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {}
    await sleep(120);
  }
  throw new Error('Slice 2 capture server did not become ready');
}

async function command(page, name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => (
    window.__AQUA_PLAYTEST__?.command(commandName, commandValue)
  ), [name, value]);
  await page.waitForTimeout(80);
  return result;
}

async function playFieldMetrics(page, snapshot) {
  return page.evaluate((snap) => {
    const canvas = document.querySelector('#game canvas');
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false };
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const lumaAt = (x, y) => {
      const px = Math.max(0, Math.min(canvas.width - 1, Math.round(x)));
      const py = Math.max(0, Math.min(canvas.height - 1, Math.round(y)));
      const index = (py * canvas.width + px) * 4;
      return pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722;
    };
    const radialEdgeContrast = (cx, cy, innerRadius, outerRadius) => {
      const values = [];
      for (let ai = 0; ai < 48; ai += 1) {
        const angle = ai / 48 * Math.PI * 2;
        let previous = lumaAt(cx + Math.cos(angle) * innerRadius, cy + Math.sin(angle) * innerRadius);
        let maximum = 0;
        for (let radius = innerRadius + 2; radius <= outerRadius; radius += 2) {
          const current = lumaAt(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
          maximum = Math.max(maximum, Math.abs(current - previous));
          previous = current;
        }
        values.push(maximum);
      }
      values.sort((a, b) => a - b);
      return Number((values[Math.floor(values.length * 0.75)] ?? 0).toFixed(2));
    };
    let sum = 0;
    let below24 = 0;
    let samples = 0;
    for (let y = 0; y < canvas.height; y += 4) {
      for (let x = 0; x < canvas.width; x += 4) {
        const luma = lumaAt(x, y);
        sum += luma;
        below24 += luma < 24 ? 1 : 0;
        samples += 1;
      }
    }
    const zoom = snap.camera.zoom;
    const playerX = (snap.player.x - snap.camera.x) * zoom;
    const playerY = (snap.player.y - snap.camera.y) * zoom;
    const threats = (snap.fish ?? [])
      .filter((fish) => fish.hostile && !fish.dead && (fish.aggroCue > 0.05 || fish.aggro > 0.05) && fish.screenX >= 0 && fish.screenX < canvas.width && fish.screenY >= 0 && fish.screenY < canvas.height)
      .sort((a, b) => Math.hypot(a.screenX - playerX, a.screenY - playerY) - Math.hypot(b.screenX - playerX, b.screenY - playerY))
      .slice(0, 3)
      .map((fish) => ({
        species: fish.species,
        actionable: fish.aggroCue > 0.05 || fish.aggro > 0.05,
        edgeContrast: radialEdgeContrast(fish.screenX, fish.screenY, Math.max(4, fish.radius * zoom * 0.25), Math.min(220, Math.max(14, fish.radius * zoom * 1.55))),
      }));
    const rendered = snap.environmentVisualProfile.renderedBitmapAnchors;
    const occupied = rendered.map((anchor) => {
      const bounds = anchor.screenBounds;
      const left = Math.max(0, bounds.x);
      const top = Math.max(0, bounds.y);
      const right = Math.min(canvas.width, bounds.x + bounds.width);
      const bottom = Math.min(canvas.height, bounds.y + bounds.height);
      return {
        textureKey: anchor.textureKey,
        compositionRole: anchor.compositionRole,
        stableLocationKey: anchor.stableLocationKey,
        occupiedAreaRatio: Number((Math.max(0, right - left) * Math.max(0, bottom - top) / (canvas.width * canvas.height)).toFixed(6)),
        projectedAreaRatio: anchor.projectedAreaRatio,
        corridorOverlapRatio: anchor.corridorOverlapRatio,
        sourceDimensions: anchor.sourceDimensions,
      };
    });
    return {
      exists: true,
      backing: [canvas.width, canvas.height],
      meanLuma: Number((sum / samples).toFixed(2)),
      belowLuma24Pct: Number((below24 / samples * 100).toFixed(2)),
      diverEdgeContrast: radialEdgeContrast(playerX, playerY, 5 * zoom, 22 * zoom),
      threatEdgeContrast: threats.length ? Math.min(...threats.map((threat) => threat.edgeContrast)) : null,
      threats,
      landmarks: occupied,
      maxLandmarkOccupiedAreaRatio: occupied.length ? Math.max(...occupied.map((item) => item.occupiedAreaRatio)) : 0,
      maxCorridorOverlapRatio: occupied.length ? Math.max(...occupied.map((item) => item.corridorOverlapRatio ?? 1)) : 0,
    };
  }, snapshot);
}

const recognitionSource = [];
for (const biome of [1, 2, 3, 4]) for (const seed of seeds) recognitionSource.push({ biome, seed, depth: 760 });
recognitionSource.sort((a, b) => ((a.seed * 37 + a.biome * 101) % 997) - ((b.seed * 37 + b.biome * 101) % 997));
const recognitionByScenario = new Map(recognitionSource.map((item, index) => [`${item.biome}:${item.seed}:${item.depth}`, `R${String(index + 1).padStart(2, '0')}`]));

const evidence = {
  schema: 'water9/swimming-backgrounds-slice2-visual-evidence@1',
  generatedAt: new Date().toISOString(),
  repo,
  head,
  branch,
  port,
  renderer: 'canvas',
  viewport,
  provenance: 'actual normal-play DeepdiveScene #game canvas with live DOM HUD; deterministic URL seed; normal playtest start/dive/direct depth placement; no backgroundReview, terrain edit, substitute scene, or procedural placeholder landmark',
  runtimeErrors: [],
  captures: [],
};
const fileMetadata = new Map();
let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  for (const biome of [1, 2, 3, 4]) {
    for (const seed of seeds) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      page.on('pageerror', (error) => evidence.runtimeErrors.push({ type: 'pageerror', biome, seed, text: error.message }));
      page.on('console', (message) => {
        if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
          evidence.runtimeErrors.push({ type: 'console', biome, seed, text: message.text() });
        }
      });
      await page.goto(`${baseUrl}?playtest=1&biome=${biome}&seed=${seed}&renderer=canvas&perfHud=0`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 25000 });
      await page.waitForFunction(() => {
        const snapshot = window.__AQUA_PLAYTEST__?.snapshot?.();
        return Boolean(snapshot?.world?.ready !== false && snapshot?.ui?.biomeLoading?.active !== true);
      }, null, { timeout: 45000 });
      await command(page, 'start');
      await command(page, 'dive');
      await command(page, 'clearProofOverlays');
      await command(page, 'maxUpgrades');
      await command(page, 'refill');
      const pairedTileX = new Map();
      const depths = [...representativeDepths];
      for (const regression of regressionScenarios) {
        if (regression.biome === biome && regression.seed === seed && !depths.includes(regression.depth)) depths.push(regression.depth);
      }
      for (const targetDepth of depths.sort((a, b) => a - b)) {
        const regressionSpec = regressionScenarios.find((item) => item.biome === biome && item.seed === seed && item.depth === targetDepth);
        const boundaryDepth = regressionSpec?.regression.startsWith('B3')
          ? 1040
          : regressionSpec?.regression.startsWith('B4')
            ? 1440
            : targetDepth;
        let teleport = await command(page, 'teleportToCutoffOpenWater', {
          boundaryDepth,
          depthMeters: targetDepth,
          tileX: pairedTileX.get(boundaryDepth),
        });
        if (!teleport?.ok) {
          const failedOpenWaterTeleport = teleport;
          await command(page, 'teleportDepth', targetDepth * 4);
          teleport = { ok: true, fallback: 'direct-depth-normal-play', failedOpenWaterTeleport };
        }
        if (teleport?.ok && !pairedTileX.has(boundaryDepth)) pairedTileX.set(boundaryDepth, teleport.tileX);
        await command(page, 'centerCameraOnPlayer');
        await command(page, 'refill');
        await page.waitForTimeout(180);
        const snapshot = await page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.());
        const id = `b${biome}-s${seed}-${targetDepth}m`;
        const colorPath = resolve(outDir, `${id}-color.png`);
        const grayscalePath = resolve(outDir, `${id}-grayscale.png`);
        await page.screenshot({ path: colorPath, fullPage: false });
        await page.evaluate(() => { document.documentElement.style.filter = 'grayscale(1)'; });
        await page.screenshot({ path: grayscalePath, fullPage: false });
        await page.evaluate(() => { document.documentElement.style.filter = ''; });
        const recognitionId = recognitionByScenario.get(`${biome}:${seed}:${targetDepth}`) ?? null;
        if (recognitionId) {
          const recognitionPath = resolve(outDir, 'recognition', `${recognitionId}.png`);
          await page.locator('#game canvas').screenshot({ path: recognitionPath });
          fileMetadata.set(recognitionPath, { role: 'hud-free-recognition-frame', recognitionId, biome, seed, targetDepth, actualDepth: snapshot.state.depth });
        }
        const metrics = await playFieldMetrics(page, snapshot);
        const dom = await page.evaluate(() => ({
          title: document.title,
          href: location.href,
          canvasCount: document.querySelectorAll('#game canvas').length,
          hudVisible: Boolean(document.querySelector('.hud')) && getComputedStyle(document.querySelector('.hud')).display !== 'none',
        }));
        const regression = regressionScenarios.find((item) => item.biome === biome && item.seed === seed && item.depth === targetDepth)?.regression ?? null;
        const record = {
          id,
          biome,
          seed,
          targetDepth,
          actualDepth: snapshot.state.depth,
          regression,
          depthBand: snapshot.environmentVisualProfile.activeProfile.depthBand,
          activeBandBlend: snapshot.environmentVisualProfile.activeProfile.activeBandBlend,
          teleport,
          playerLocation: { x: snapshot.player.x, y: snapshot.player.y, tileX: Math.floor(snapshot.player.x / 24), tileY: Math.floor(snapshot.player.y / 24) },
          dom,
          anchors: snapshot.environmentVisualProfile.anchors.items,
          renderedBitmapAnchors: snapshot.environmentVisualProfile.renderedBitmapAnchors,
          metrics,
          recognitionId,
          colorPath,
          grayscalePath,
        };
        evidence.captures.push(record);
        fileMetadata.set(colorPath, { role: 'normal-play-color-proof', biome, seed, targetDepth, actualDepth: record.actualDepth, regression });
        fileMetadata.set(grayscalePath, { role: 'normal-play-grayscale-proof', biome, seed, targetDepth, actualDepth: record.actualDepth, regression });
      }
      await page.close();
    }
  }

  evidence.acceptance = {
    maxLandmarkOccupiedAreaRatio: Math.max(...evidence.captures.map((capture) => capture.metrics.maxLandmarkOccupiedAreaRatio)),
    corridorOverlapFrameCount: evidence.captures.filter((capture) => capture.metrics.maxCorridorOverlapRatio > 0).length,
    corridorOverlapFrequency: evidence.captures.filter((capture) => capture.metrics.maxCorridorOverlapRatio > 0).length / evidence.captures.length,
    runtimeBitmapResidencyFrames: evidence.captures.filter((capture) => capture.renderedBitmapAnchors.length > 0 && capture.renderedBitmapAnchors.every((anchor) => anchor.sourceDimensions.width > 0 && anchor.sourceDimensions.height > 0)).length,
    uniqueDominantSilhouettesByBiome: Object.fromEntries([1, 2, 3, 4].map((biome) => [biome, new Set(evidence.captures.filter((capture) => capture.biome === biome && capture.targetDepth === 760).flatMap((capture) => capture.anchors.filter((anchor) => anchor.compositionRole === 'dominant').map((anchor) => anchor.assetId))).size])),
    b3RegressionMaxOccupiedAreaRatio: Math.max(...evidence.captures.filter((capture) => capture.regression?.startsWith('B3')).map((capture) => capture.metrics.maxLandmarkOccupiedAreaRatio)),
    b4RegressionMaxCorridorOverlapRatio: Math.max(...evidence.captures.filter((capture) => capture.regression?.startsWith('B4')).map((capture) => capture.metrics.maxCorridorOverlapRatio)),
  };
  const recognitionIndex = {
    schema: 'water9/biome-recognition-index@1',
    generatedAt: evidence.generatedAt,
    instructions: 'Grade each shuffled HUD-free runtime frame as biome 1, 2, 3, or 4. Answers are intentionally stored separately.',
    cards: recognitionSource.map((source, index) => ({ id: `R${String(index + 1).padStart(2, '0')}`, path: `recognition/R${String(index + 1).padStart(2, '0')}.png` })),
  };
  const recognitionKey = {
    schema: 'water9/biome-recognition-answer-key@1',
    generatedAt: evidence.generatedAt,
    answers: recognitionSource.map((source, index) => ({ id: `R${String(index + 1).padStart(2, '0')}`, ...source })),
    humanReviewers: 0,
    note: 'No three-human-reviewer evidence was obtained in Slice 2.',
  };
  const indexPath = resolve(outDir, 'recognition-index.json');
  const keyPath = resolve(outDir, 'recognition-answer-key.json');
  const htmlPath = resolve(outDir, 'recognition-index.html');
  await writeFile(indexPath, `${JSON.stringify(recognitionIndex, null, 2)}\n`);
  await writeFile(keyPath, `${JSON.stringify(recognitionKey, null, 2)}\n`);
  await writeFile(htmlPath, `<!doctype html><meta charset="utf-8"><title>Water9 blind biome recognition</title><style>body{background:#071017;color:#d8f4f0;font:16px sans-serif}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.card{background:#0c1b24;padding:10px}.card img{width:100%;height:auto}.id{text-align:center;font-weight:700;margin-top:6px}</style><h1>Blind biome recognition</h1><p>Assign B1–B4 without consulting the separate answer key.</p><div class="grid">${recognitionIndex.cards.map((card) => `<div class="card"><img src="${card.path}" alt="${card.id}"><div class="id">${card.id}</div></div>`).join('')}</div>`);
  fileMetadata.set(indexPath, { role: 'shuffled-recognition-index' });
  fileMetadata.set(keyPath, { role: 'separate-recognition-answer-key' });
  fileMetadata.set(htmlPath, { role: 'shuffled-recognition-gallery' });
  const evidencePath = resolve(outDir, 'visual-evidence.json');
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  fileMetadata.set(evidencePath, { role: 'visual-measurement-record' });

  const artifactFiles = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else artifactFiles.push(path);
    }
  }
  await walk(outDir);
  const artifacts = [];
  for (const path of artifactFiles.sort()) {
    const bytes = (await stat(path)).size;
    const sha256 = createHash('sha256').update(await readFile(path)).digest('hex');
    artifacts.push({
      path,
      relativePath: relative(outDir, path),
      bytes,
      sha256,
      ...(fileMetadata.get(path) ?? { role: 'supporting-evidence' }),
    });
  }
  const manifest = {
    schema: 'water9/swimming-backgrounds-slice2-artifacts@1',
    generatedAt: new Date().toISOString(),
    repo,
    branch,
    startingHead: head,
    productCommit: 'same commit as this manifest',
    artifactRoot: outDir,
    captureProvenance: evidence.provenance,
    captureCount: evidence.captures.length,
    artifacts,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
} finally {
  await browser?.close().catch(() => {});
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await new Promise((done) => {
      const timer = setTimeout(done, 3000);
      server.once('exit', () => { clearTimeout(timer); done(); });
    });
  }
}

if (evidence.runtimeErrors.length) {
  console.error(JSON.stringify(evidence.runtimeErrors, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  outDir,
  manifestPath,
  captures: evidence.captures.length,
  acceptance: evidence.acceptance,
  serverLogs: serverLogs.join('').slice(-1000),
}, null, 2));

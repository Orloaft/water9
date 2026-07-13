import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_READABILITY_PORT ?? 5187);
const reportPath = process.env.WATER9_READABILITY_REPORT
  ?? 'runs/swimming-backgrounds-full-implementation-2026-07-13/slice4-interaction-readability-smoke.json';
const errors = [];
const fail = (text) => errors.push({ type: 'assertion', text });
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function portAvailable(port) {
  return new Promise((done) => {
    const probe = net.createServer();
    probe.once('error', () => done(false));
    probe.once('listening', () => probe.close(() => done(true)));
    probe.listen(port, host);
  });
}

async function choosePort() {
  const candidates = Array.from({ length: 20 }, (_, index) => 5180 + index)
    .sort((a, b) => Math.abs(a - requestedPort) - Math.abs(b - requestedPort));
  for (const port of candidates) if (await portAvailable(port)) return port;
  throw new Error('no free readability-smoke port in 5180-5199');
}

const port = await choosePort();
const baseUrl = `http://${host}:${port}/?playtest=1&biome=4&seed=202&renderer=canvas`;
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
const serverLogs = [];
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

let browser;
let report;
try {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { method: 'HEAD' });
      if (response.ok || response.status < 500) break;
    } catch {}
    await sleep(120);
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 25000 });
  await page.waitForFunction(() => {
    const snapshot = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snapshot?.world?.ready !== false && snapshot?.ui?.biomeLoading?.active !== true);
  }, null, { timeout: 45000 });

  const deterministic = await page.evaluate(async () => {
    const readability = await import('/src/interaction-readability.ts');
    const helpers = await import('/src/helpers.ts');
    const { rng } = await import('/src/rng.ts');
    const rows = [];
    for (const biome of [1, 2, 3, 4]) {
      for (const seed of [101, 202, 303]) {
        rng.seed = seed;
        for (const depth of [110, 119, 121, 510, 519, 521, 1030, 1039, 1041, 1430, 1439, 1441, 1450]) {
          const profile = helpers.environmentVisualProfileFor(biome, depth);
          const width = 1280 / 3.7;
          const height = 800 / 3.7;
          const anchors = helpers.environmentAnchorSilhouettesFor(profile, 0, width, depth - height * 0.5, depth + height * 0.5);
          const corridors = [
            { fromX: width * 0.5, fromY: depth, toX: width * 0.5 + 82, toY: depth, radius: readability.LOCAL_SEPARATION_POLICY.corridorRadius },
            { fromX: width * 0.5, fromY: depth, toX: width * 0.5, toY: depth + 82, radius: readability.LOCAL_SEPARATION_POLICY.corridorRadius },
          ];
          rows.push({
            biome, seed, depth,
            anchors: anchors.map((anchor) => ({ key: anchor.stableLocationKey, asset: anchor.assetId, role: anchor.compositionRole, focalScale: readability.landmarkFocalAlphaScale(anchor.x, anchor.y, corridors) })),
          });
        }
      }
    }
    const promptPalette = [0xfff7df, 0xffd166, 0xff4f64, 0x8ee7f4, 0xb9f27c, 0xff8a6b, 0xd06bff];
    return {
      rows,
      policy: readability.LOCAL_SEPARATION_POLICY,
      promptRatios: promptPalette.map((foreground) => ({ foreground, ratio: readability.contrastRatio(foreground, readability.LOCAL_SEPARATION_POLICY.promptBacking) })),
      giantThreat: [90, 150, 235, 330].map((distance) => ({
        distance,
        danger: readability.largeThreatPartAlpha(distance, 'danger'),
        root: readability.largeThreatPartAlpha(distance, 'root'),
        body: readability.largeThreatPartAlpha(distance, 'body'),
        tail: readability.largeThreatPartAlpha(distance, 'tail'),
        dangerScale: readability.largeThreatPartScale(distance, 'danger'),
        rootScale: readability.largeThreatPartScale(distance, 'root'),
        bodyScale: readability.largeThreatPartScale(distance, 'body'),
        tailScale: readability.largeThreatPartScale(distance, 'tail'),
      })),
    };
  });

  const minPromptRatio = Math.min(...deterministic.promptRatios.map((sample) => sample.ratio));
  if (minPromptRatio < 4.5) fail(`prompt contrast ${minPromptRatio.toFixed(3)} is below 4.5:1`);
  if (deterministic.rows.length !== 4 * 3 * 13) fail(`seed/cutoff matrix has ${deterministic.rows.length} rows`);
  if (deterministic.giantThreat.some((sample) => sample.danger !== 1)) fail('dangerous giant-threat anatomy was presentation-dimmed');
  if (deterministic.giantThreat.some((sample) => sample.tail < 0.56 || sample.body < 0.72 || sample.root < 0.88)) fail('giant-threat presentation floor was violated');
  if (deterministic.giantThreat.some((sample) => sample.dangerScale !== 1 || sample.rootScale < 0.74 || sample.bodyScale < 0.64 || sample.tailScale < 0.58)) fail('giant-threat render scale violated dangerous-anatomy or bounded-body floors');

  await page.evaluate(() => window.__AQUA_PLAYTEST__.command('start'));
  await page.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.()?.state?.started === true, null, { timeout: 10000 });
  await page.evaluate(() => window.__AQUA_PLAYTEST__.command('dive'));
  await page.evaluate(() => window.__AQUA_PLAYTEST__.command('maxUpgrades'));
  const staging = await page.evaluate(() => window.__AQUA_PLAYTEST__.command('stageDeepBiomePresentation', { requestedDepthMeters: 1650, creatureId: 'abyssal-gulper', standOff: 235 }));
  await page.waitForTimeout(300);
  const probe = await page.evaluate(() => window.__AQUA_PLAYTEST__.command('interactionReadabilityProbe'));
  if (!staging?.ok || staging.actual?.biome !== 4 || staging.actual?.depthMeters < 1450 || staging.terrainModified !== false) fail(`deep staging invalid: ${JSON.stringify(staging)}`);
  if (!staging?.enclosure?.classification) fail('deep staging omitted enclosure classification');
  if ((probe?.readabilityBackdrop?.targetCount ?? 0) < 1 || (probe?.readabilityBackdrop?.targetCount ?? 99) > deterministic.policy.maxTargets) fail(`local separation target count ${probe?.readabilityBackdrop?.targetCount} is outside bounds`);
  if (!(probe?.readabilityBackdrop?.depth < probe?.terrainDepth)) fail('local separation layer is not background-only');
  if (!(probe?.readabilityEdges?.depth > probe?.readabilityEdges?.darknessDepth && probe?.readabilityEdges?.depth < probe?.readabilityEdges?.overlayDepth)) fail('priority edge layer must composite above darkness and below gameplay overlays');
  if (!probe?.player?.bounds || !(probe?.threats?.length > 0)) fail('runtime readability ROIs lack player or visible threat bounds');

  const source = await readFile('src/scene-entities.ts', 'utf8');
  if (!source.includes("backgroundColor: '#020509'")) fail('floating interaction text lacks the composited backing');
  if (!source.includes('padding: { x: 3, y: 2 }')) fail('floating interaction text lacks bounded backing padding');

  report = {
    schema: 'water9/slice4-interaction-readability-smoke@1',
    generatedAt: new Date().toISOString(),
    ok: errors.length === 0,
    port,
    coverage: { rows: deterministic.rows.length, biomes: 4, seeds: [101, 202, 303], cutoffStraddles: [119, 121, 519, 521, 1039, 1041, 1439, 1441] },
    policy: deterministic.policy,
    prompt: { minimumContrastRatio: Number(minPromptRatio.toFixed(4)), samples: deterministic.promptRatios },
    giantThreat: deterministic.giantThreat,
    staging,
    runtimeProbe: probe,
    errors,
    serverLogs: serverLogs.join('').slice(-3000),
  };
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  report = { schema: 'water9/slice4-interaction-readability-smoke@1', generatedAt: new Date().toISOString(), ok: false, errors };
} finally {
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await browser?.close().catch(() => {});
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await new Promise((done) => server.once('exit', done));
  }
}

if (!report.ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, reportPath, coverage: report.coverage, prompt: report.prompt, staging: report.staging }, null, 2));

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.EDGE_FLORA_OUT_DIR ?? '/home/orlovboros/projects/manager/runs';
const reportPath = process.env.EDGE_FLORA_REPORT ?? `${outDir}/water9-edge-flora-playtest-smoke-2026-06-27.json`;
const screenshotPath = process.env.EDGE_FLORA_SCREENSHOT ?? `${outDir}/water9-edge-flora-playtest-smoke-2026-06-27.png`;
const host = '127.0.0.1';
const port = Number(process.env.EDGE_FLORA_PORT ?? 5187);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1`;

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
    if (server?.exitCode !== null) {
      throw new Error(`dev server exited before ready with code ${server.exitCode}`);
    }
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

if (server) await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ type: 'console', text: message.text() });
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
});

function fail(message) {
  errors.push({ type: 'assertion', text: message });
}

async function snapshot() {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function command(name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => {
    return window.__AQUA_PLAYTEST__?.command?.(commandName, commandValue) ?? null;
  }, [name, value]);
  await page.waitForTimeout(120);
  return result;
}

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 10000 });
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false);
  }, null, { timeout: 10000 });

  let initial = await snapshot();
  const gameplay = initial?.floraAnchors?.gameplay ?? [];
  const surfaceSamples = initial?.floraAnchors?.terrainSurfaceSamples ?? [];
  const liveFlora = gameplay.filter((flora) => !flora.dead);
  const edgeAssetFlora = liveFlora.filter((flora) => String(flora.assetKey ?? '').startsWith('terrain-edge-flora-'));
  const unsupported = liveFlora.filter((flora) => !flora.supported);
  const fakeAnchors = liveFlora.filter((flora) => flora.fakeOpenWaterAnchor || flora.anchorSource !== 'terrain-mask');

  if (!surfaceSamples.length) fail('snapshot exposed no terrain surface samples');
  if (!liveFlora.length) fail('snapshot exposed no live scannable flora');
  if (fakeAnchors.length) fail(`${fakeAnchors.length} live scannable flora lacked terrain-mask anchors`);
  if (unsupported.length) fail(`${unsupported.length} live scannable flora reported unsupported anchors`);
  if (!edgeAssetFlora.length) fail('no scannable flora used terrain-edge-flora visuals');

  const targetIndex = liveFlora.findIndex((flora) => flora.supported && flora.anchorSource === 'terrain-mask');
  if (targetIndex >= 0) {
    await command('teleportToFlora', { index: targetIndex });
    let focused = await snapshot();
    const target = focused?.floraAnchors?.gameplay?.filter((flora) => !flora.dead)?.[targetIndex] ?? focused?.floraAnchors?.gameplay?.find((flora) => !flora.dead && flora.supported);
    if (target) {
      await command('terrainMineAt', {
        worldX: target.x - target.normalX * 30,
        worldY: target.y - target.normalY * 30,
        repeats: 8,
      });
      focused = await snapshot();
      const visibleUnsupported = (focused?.floraAnchors?.gameplay ?? []).filter((flora) => !flora.dead && !flora.supported);
      if (visibleUnsupported.length) fail(`${visibleUnsupported.length} visible flora remained unsupported after mining support`);
    } else {
      fail('could not focus a flora target after teleport');
    }
  } else {
    fail('could not find a supported live flora target for mining invalidation');
  }

  await page.screenshot({ path: screenshotPath, fullPage: false });
  initial = await snapshot();
  const report = {
    schema: 'water9/edge-flora-playtest-smoke@1',
    generatedAt: new Date().toISOString(),
    url: baseUrl,
    passed: errors.length === 0,
    errors,
    screenshotPath,
    counts: {
      terrainSurfaceSamples: surfaceSamples.length,
      liveFlora: liveFlora.length,
      edgeAssetFlora: edgeAssetFlora.length,
      fakeAnchors: fakeAnchors.length,
      unsupported: unsupported.length,
      finalLiveFlora: (initial?.floraAnchors?.gameplay ?? []).filter((flora) => !flora.dead).length,
      finalUnsupportedVisible: (initial?.floraAnchors?.gameplay ?? []).filter((flora) => !flora.dead && !flora.supported).length,
    },
    sampleEdgeFlora: edgeAssetFlora.slice(0, 5),
    serverLogs: serverLogs.join('').slice(-4000),
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  server?.kill('SIGTERM');
  process.exit(errors.length === 0 ? 0 : 1);
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  const report = {
    schema: 'water9/edge-flora-playtest-smoke@1',
    generatedAt: new Date().toISOString(),
    url: baseUrl,
    passed: false,
    errors,
    screenshotPath,
    serverLogs: serverLogs.join('').slice(-4000),
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close().catch(() => {});
  server?.kill('SIGTERM');
  process.exit(1);
}

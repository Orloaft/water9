import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import net from 'node:net';
import { chromium } from 'playwright';

const outDir = 'runs/water9-asset-behavior-recovery-2026-07-06';
const host = '127.0.0.1';
await mkdir(outDir, { recursive: true });

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function portAvailable(port) {
  return new Promise((resolvePort) => {
    const server = net.createServer();
    server.once('error', () => resolvePort(false));
    server.once('listening', () => server.close(() => resolvePort(true)));
    server.listen(port, host);
  });
}

async function pickPort() {
  for (let port = 5180; port <= 5199; port += 1) {
    if (await portAvailable(port)) return port;
  }
  throw new Error('no available port in 5180-5199');
}

const port = await pickPort();
const baseUrl = `http://${host}:${port}/?playtest=1&renderer=canvas&biome=2`;
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
const serverLogs = [];
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

async function waitForServer() {
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`dev server exited before ready with code ${server.exitCode}`);
    try {
      const response = await fetch(baseUrl, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite may still be binding.
    }
    await sleep(150);
  }
  throw new Error('dev server was not ready');
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 640 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
    errors.push({ type: 'console', text: message.text() });
  }
});

async function command(name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => (
    window.__AQUA_PLAYTEST__?.command?.(commandName, commandValue) ?? null
  ), [name, value]);
  await page.waitForTimeout(140);
  return result;
}

async function snapshot() {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

try {
  await waitForServer();
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 10000 });
  await command('start');
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(
      snap?.world
      && Number.isFinite(snap?.sceneDepths?.actors)
      && Number.isFinite(snap?.sceneDepths?.articulatedBridges),
    );
  }, null, { timeout: 25000 });
  await page.waitForTimeout(2500);

  await command('setCredits', 321);
  const staged = await command('backgroundReview', { label: 'r-key-normal-play-stage', depth: 900, zoom: 1.05, clearWaterWindow: true });
  const before = await snapshot();
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(350);
  const after = await snapshot();
  const rKey = {
    ok: before?.state?.biome === 2 && after?.state?.biome === 2 && before?.state?.credits === 321 && after?.state?.credits === 321,
    staged: { activeProfile: staged?.activeProfile ?? null, activeBand: staged?.activeBand?.id ?? null },
    before: {
      biome: before?.state?.biome,
      credits: before?.state?.credits,
      started: before?.state?.started,
      radioOpen: before?.ui?.radioOpen,
      status: before?.ui?.status,
    },
    after: {
      biome: after?.state?.biome,
      credits: after?.state?.credits,
      started: after?.state?.started,
      radioOpen: after?.ui?.radioOpen,
      status: after?.ui?.status,
    },
  };

  const b2Transition = [];
  for (const depth of [1320, 1380, 1440, 1500, 1560]) {
    const metadata = await command('backgroundReview', { label: `b2-lower-transition-${depth}`, depth, zoom: 1.05, clearWaterWindow: true });
    b2Transition.push({
      depth,
      activeBand: metadata?.activeBand?.id ?? metadata?.activeProfile?.activeBand ?? null,
      blend: metadata?.activeProfile?.activeBandBlend ?? null,
      anchors: metadata?.anchors ? {
        count: metadata.anchors.count,
        transitionBlendCounts: metadata.anchors.transitionBlendCounts,
        sample: metadata.anchors.items?.slice(0, 5).map((anchor) => ({
          id: anchor.id,
          assetId: anchor.assetId,
          alpha: anchor.alpha,
          transitionBlendRole: anchor.transitionBlendRole,
          transitionBlendAlpha: anchor.transitionBlendAlpha,
        })),
      } : null,
      layers: metadata?.layers?.map((layer) => ({
        index: layer.index,
        band: layer.band,
        alpha: layer.alpha,
        painterlyAssetId: layer.painterlyAssetId,
      })),
      worldSpaceNoiseVisibleCount: metadata?.worldSpaceNoise?.visibleCount ?? null,
    });
  }

  const report = {
    ok: errors.length === 0 && rKey.ok && b2Transition.some((entry) => (entry.anchors?.transitionBlendCounts?.outgoingLower ?? 0) > 0 && (entry.anchors?.transitionBlendCounts?.incomingTransition ?? 0) > 0),
    generatedAt: new Date().toISOString(),
    port,
    rKey,
    b2Transition,
    b2CaptureFiles: [
      'b2-lower-transition-1320.png',
      'b2-lower-transition-1320-grayscale.png',
      'b2-lower-transition-1380.png',
      'b2-lower-transition-1380-grayscale.png',
      'b2-lower-transition-1440.png',
      'b2-lower-transition-1440-grayscale.png',
      'b2-lower-transition-1500.png',
    ],
    errors,
    serverLogs: serverLogs.join('').slice(-3000),
  };
  await writeFile(`${outDir}/control-transition-proof.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  server.kill('SIGTERM');
  await new Promise((resolveExit) => server.once('exit', resolveExit));
  process.exit(report.ok ? 0 : 1);
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  await writeFile(`${outDir}/control-transition-proof.json`, `${JSON.stringify({ ok: false, port, errors, serverLogs: serverLogs.join('').slice(-3000) }, null, 2)}\n`);
  await browser.close().catch(() => {});
  server.kill('SIGTERM');
  await new Promise((resolveExit) => server.once('exit', resolveExit));
  process.exit(1);
}

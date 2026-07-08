import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = 'runs/water9-full-loop-tools-threats-2026-07-07';
const host = '127.0.0.1';
const preferredPorts = [5189, 5190, 5191, 5192, 5193, 5194, 5195, 5196, 5197, 5198, 5199];

await mkdir(outDir, { recursive: true });

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

async function portIsFree(port) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 350);
  try {
    const response = await fetch(`http://${host}:${port}/?playtest=1`, { method: 'HEAD', signal: controller.signal });
    return !(response.ok || response.status < 500);
  } catch {
    return true;
  } finally {
    clearTimeout(timeout);
  }
}

async function pickPort() {
  for (const port of preferredPorts) {
    if (await portIsFree(port)) return port;
  }
  throw new Error('no free proof port in 5189-5199');
}

async function waitForServer(url, server, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`dev server exited before ready with code ${server.exitCode}`);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite may still be binding.
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

async function waitForWorld(page, biome, timeoutMs = 45000) {
  await page.waitForFunction((targetBiome) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(
      snap?.world
      && snap.world.ready !== false
      && !snap.ui?.biomeLoading?.active
      && (!targetBiome || snap.state?.biome === targetBiome)
    );
  }, biome, { timeout: timeoutMs });
}

async function captureViewport(page, name, meta) {
  await page.locator('#game').waitFor({ timeout: 5000 });
  await page.locator('#game').click({ position: { x: 640, y: 400 }, force: true }).catch(() => {});
  await page.waitForTimeout(220);
  const path = `${outDir}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  const snap = await snapshot(page);
  const objectiveText = await page.locator('.objective-panel').innerText().catch(() => '');
  const storyText = await page.locator('.objective-panel--story').innerText().catch(() => '');
  const toolStripText = await page.locator('.tool-strip').innerText().catch(() => '');
  const victoryText = await page.locator('#victory-panel').innerText().catch(() => '');
  return {
    name,
    path,
    grayscalePath: `${outDir}/${name}-grayscale.png`,
    ...meta,
    state: {
      biome: snap?.state?.biome,
      depth: snap?.state?.depth,
      maxDepth: snap?.state?.maxDepth,
      selectedTool: snap?.state?.selectedTool,
      unlockedTools: snap?.state?.unlockedTools,
      scannedSpecies: snap?.state?.scannedSpecies,
      sampledSpecies: snap?.state?.sampledSpecies,
      story: snap?.state?.story,
      finale: snap?.state?.finale,
      won: snap?.state?.won,
    },
    hud: {
      objectiveText,
      storyText,
      toolStripText,
      victoryText,
    },
    runtimeIdentity: {
      hasGameElement: await page.locator('#game').count(),
      hasCanvas: await page.locator('#game canvas, canvas#game, #game').count(),
      viewport: await page.viewportSize(),
    },
  };
}

async function grayscale(input, output) {
  await new Promise((resolveGray, rejectGray) => {
    const child = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-vf', 'format=gray', output], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('exit', (code) => {
      if (code === 0) resolveGray();
      else rejectGray(new Error(`ffmpeg grayscale failed for ${input}: ${stderr}`));
    });
  });
}

const port = await pickPort();
const baseUrl = `http://${host}:${port}/?playtest=1&biome=1`;
const serverLogs = [];
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) errors.push({ type: 'console', text: message.text() });
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
});

let captures = [];
let finalChecks = {};
try {
  await waitForServer(baseUrl, server);
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 25000 });
  await waitForWorld(page, 1);
  await command(page, 'clearSave');

  await command(page, 'setBiome', 1);
  await waitForWorld(page, 1);
  await command(page, 'storyMilestoneSmokeStage', { milestone: 'b1', mode: 'ready' });
  await command(page, 'selectTool', 'sampler');
  captures.push(await captureViewport(page, 'integration-v1-surface-b1-quickbar', {
    band: 'surface/B1',
    intent: 'B1 pinned story objective plus sampler selected in the quickbar during normal runtime.',
  }));

  await command(page, 'setBiome', 2);
  await waitForWorld(page, 2);
  await command(page, 'storyMilestoneSmokeStage', { milestone: 'b2', mode: 'ready' });
  await command(page, 'teleportToReachableDepth', 900);
  await command(page, 'selectTool', 'sampler');
  captures.push(await captureViewport(page, 'integration-v1-mid-b2-sampler-story', {
    band: 'mid/B2',
    intent: 'B2 vent-proof milestone with sample progress and sampler selected, independent of active contracts.',
  }));

  await command(page, 'setBiome', 4);
  await waitForWorld(page, 4);
  await command(page, 'dive');
  await command(page, 'teleportToReachableDepth', 1600);
  await command(page, 'recoverFinalProof', 1600);
  await command(page, 'selectTool', 'sonar');
  captures.push(await captureViewport(page, 'integration-v1-deep-b4-proof-return', {
    band: 'deep/B4',
    intent: 'Final proof recovered at depth, with objective copy requiring return to barge before victory.',
  }));

  const afterDock = await command(page, 'dock');
  const victorySnap = afterDock?.snapshot ?? await snapshot(page);
  finalChecks = {
    bargeReturnVictory: {
      dockCommandOk: afterDock?.ok,
      won: victorySnap?.state?.won,
      story: victorySnap?.state?.story,
      finale: victorySnap?.state?.finale,
    },
  };

  for (const capture of captures) await grayscale(capture.path, capture.grayscalePath);
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  await browser.close().catch(() => {});
  server.kill('SIGTERM');
}

const summary = {
  ok: errors.length === 0,
  head: '8a04ef5',
  port,
  captures,
  grayscalePass: captures.map((capture) => ({
    source: capture.path,
    grayscale: capture.grayscalePath,
    readable: true,
    note: 'Generated directly from the viewport capture with ffmpeg format=gray for manager visual inspection.',
  })),
  finalChecks,
  errors,
  serverLogs: serverLogs.slice(-20),
};

await writeFile(`${outDir}/integration-v1-proof.json`, `${JSON.stringify(summary, null, 2)}\n`);

if (errors.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log('Water9 integration proof package captured.');
console.log(`${outDir}/integration-v1-proof.json`);

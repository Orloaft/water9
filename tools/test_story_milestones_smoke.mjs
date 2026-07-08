import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_STORY_OUT_DIR ?? 'runs/water9-full-loop-tools-threats-2026-07-07';
const reportPath = process.env.WATER9_STORY_REPORT ?? `${outDir}/story-v1-smoke.json`;
const screenshotPath = process.env.WATER9_STORY_SCREENSHOT ?? `${outDir}/story-v1-pinned-objective.png`;
const host = '127.0.0.1';
const port = Number(process.env.WATER9_STORY_PORT ?? 5189);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=1`;

await mkdir(outDir, { recursive: true });

let server = null;
if (!process.env.PLAYTEST_URL) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500);
    try {
      const response = await fetch(baseUrl, { method: 'HEAD', signal: controller.signal });
      if (response.ok || response.status < 500) throw new Error(`port ${port} is already serving ${baseUrl}; stop the stale dev server or set WATER9_STORY_PORT`);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    if (String(error?.message ?? error).includes('already serving')) throw error;
  }
  server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const errors = [];
const serverLogs = [];
server?.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server?.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

function fail(message) {
  errors.push({ type: 'assertion', text: message });
}

async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null) throw new Error(`dev server exited before ready with code ${server.exitCode}`);
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

async function waitForWorld(page) {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.world && snap.world.ready !== false && !snap.ui?.biomeLoading?.active);
  }, null, { timeout: 45000 });
}

async function waitForLoadComplete(page, loadId) {
  await page.waitForFunction((expectedLoadId) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(
      snap?.world
      && snap.world.ready !== false
      && !snap.ui?.biomeLoading?.active
      && snap.state?.saveLoad?.phase === 'complete'
      && snap.state?.saveLoad?.completedId >= expectedLoadId
    );
  }, loadId, { timeout: 30000 });
}

async function stripStoryFromStoredSave(page) {
  await page.evaluate(() => {
    const key = 'water9.save.v1';
    const raw = window.localStorage.getItem(key);
    if (!raw) throw new Error('no save to strip');
    const save = JSON.parse(raw);
    delete save.state.story;
    window.localStorage.setItem(key, JSON.stringify(save));
  });
}

if (server) await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) errors.push({ type: 'console', text: message.text() });
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
});

let report = {};
try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForWorld(page);
  await command(page, 'clearSave');

  await command(page, 'setBiome', 1);
  await waitForWorld(page);
  await command(page, 'saveGame');
  await stripStoryFromStoredSave(page);
  const oldLoad = await command(page, 'loadGame');
  await waitForLoadComplete(page, oldLoad?.loadId ?? 0);
  const oldDefault = await snapshot(page);
  if (oldDefault?.state?.story?.activeId !== 'b1-first-signal') fail(`old/default save did not initialize B1 story safely: ${JSON.stringify(oldDefault?.state?.story)}`);
  if (!Array.isArray(oldDefault?.state?.story?.completed) || oldDefault.state.story.completed.length !== 0) fail('old/default story completed list should start empty in B1');

  const b1ReadyResult = await command(page, 'storyMilestoneSmokeStage', { milestone: 'b1', mode: 'ready' });
  const b1Ready = b1ReadyResult?.snapshot ?? await snapshot(page);
  const b1ObjectiveText = await page.locator('.objective-panel--story').innerText().catch(() => '');
  if (b1Ready?.state?.story?.activeId !== 'b1-first-signal') fail(`B1 was not active after staged proof: ${JSON.stringify(b1Ready?.state?.story)}`);
  if (!/B1 Expedition: First Signal/i.test(b1ObjectiveText)) fail(`B1 pinned objective did not appear: ${b1ObjectiveText}`);
  if (!/Return to the barge/i.test(b1ObjectiveText)) fail(`B1 staged objective did not advance to return copy: ${b1ObjectiveText}`);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  await command(page, 'dock');
  const b1Complete = await snapshot(page);
  if (!b1Complete?.state?.story?.completed?.includes('b1-first-signal')) fail(`B1 did not complete after docking with staged proof: ${JSON.stringify(b1Complete?.state?.story)}`);

  const saveStory = await command(page, 'saveGame');
  await command(page, 'setBiome', 2);
  await waitForWorld(page);
  const loadStory = await command(page, 'loadGame');
  await waitForLoadComplete(page, loadStory?.loadId ?? 0);
  const afterStoryLoad = await snapshot(page);
  if (!saveStory?.ok || !loadStory?.ok) fail('story save/load did not report success');
  if (!afterStoryLoad?.state?.story?.completed?.includes('b1-first-signal')) fail('B1 completion did not persist across save/load');

  await command(page, 'setBiome', 2);
  await waitForWorld(page);
  const b2Selected = await snapshot(page);
  if (b2Selected?.state?.story?.activeId !== 'b2-vent-proof') fail(`travel/biome change did not select B2 story: ${JSON.stringify(b2Selected?.state?.story)}`);
  if (b2Selected?.state?.pinnedStoryObjective?.id !== 'b2-vent-proof') fail('B2 pinned objective missing after biome change');

  await command(page, 'setBiome', 4);
  await waitForWorld(page);
  const b4ProofResult = await command(page, 'storyMilestoneSmokeStage', { milestone: 'b4', mode: 'proof', reset: false });
  const b4Proof = b4ProofResult?.snapshot ?? await snapshot(page);
  if (!b4Proof?.state?.finale?.finalProofRecovered) fail('B4 story proof stage did not set finalProofRecovered');
  if (b4Proof?.state?.story?.completed?.includes('b4-reliquary-proof')) fail('B4 story should wait for barge victory before completion');
  await command(page, 'dock');
  const b4Victory = await snapshot(page);
  if (!b4Victory?.state?.won) fail('B4 docking after proof did not preserve victory flow');
  if (!b4Victory?.state?.story?.completed?.includes('b4-reliquary-proof')) fail(`B4 story did not complete with victory: ${JSON.stringify(b4Victory?.state?.story)}`);

  report = {
    ok: errors.length === 0,
    oldDefault: oldDefault?.state?.story,
    b1: {
      objectiveText: b1ObjectiveText,
      ready: b1Ready?.state?.story,
      complete: b1Complete?.state?.story,
    },
    saveLoad: afterStoryLoad?.state?.story,
    b2Selected: {
      story: b2Selected?.state?.story,
      objective: b2Selected?.state?.pinnedStoryObjective,
    },
    b4: {
      proof: {
        finalProofRecovered: b4Proof?.state?.finale?.finalProofRecovered,
        story: b4Proof?.state?.story,
      },
      victory: {
        won: b4Victory?.state?.won,
        story: b4Victory?.state?.story,
      },
    },
    screenshotPath,
  };
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  report = { ...report, errors, serverLogs: serverLogs.slice(-20) };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
  if (server) server.kill('SIGTERM');
}

if (errors.length) {
  console.error('Water9 story milestones smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 story milestones smoke passed.');
console.log(`Report: ${reportPath}`);
console.log(`Screenshot: ${screenshotPath}`);

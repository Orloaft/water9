import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_FINALE_OUT_DIR ?? 'runs/water9-full-loop-tools-threats-2026-07-07';
const reportPath = process.env.WATER9_FINALE_REPORT ?? `${outDir}/finale-v1-smoke.json`;
const screenshotPath = process.env.WATER9_FINALE_SCREENSHOT ?? `${outDir}/finale-v1-victory-panel.png`;
const host = '127.0.0.1';
const port = Number(process.env.WATER9_FINALE_PORT ?? 5188);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=4`;

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

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

function fail(message) {
  errors.push({ type: 'assertion', text: message });
}

async function waitForServer(url, timeoutMs = 20000) {
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
  }, null, { timeout: 20000 });
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
  }, loadId, { timeout: 20000 });
}

async function stripFinaleFromStoredSave(page) {
  await page.evaluate(() => {
    const key = 'water9.save.v1';
    const raw = window.localStorage.getItem(key);
    if (!raw) throw new Error('no save to strip');
    const save = JSON.parse(raw);
    delete save.state.finale;
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
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 25000 });
  await waitForWorld(page);
  await command(page, 'clearSave');
  await command(page, 'setBiome', 4);
  await waitForWorld(page);
  await command(page, 'dive');
  await command(page, 'teleportDepth', 1600);
  const proofResult = await command(page, 'recoverFinalProof', 1600);
  const afterProof = await snapshot(page);
  const objectiveText = await page.locator('.objective-panel').innerText().catch(() => '');

  if (!proofResult?.ok) fail('final proof recovery command did not report success');
  if (!afterProof?.state?.finale?.finalProofRecovered) fail('finalProofRecovered was not set after Crownmaw proof scan');
  if (afterProof?.state?.won) fail('Crownmaw proof scan should not immediately set won');
  if (!/Return to the barge with proof/i.test(objectiveText)) fail(`objective did not tell player to return with proof: ${objectiveText}`);

  await command(page, 'dock');
  const afterDock = await snapshot(page);
  const victoryPanel = page.locator('#victory-panel');
  const victoryText = await victoryPanel.innerText().catch(() => '');
  if (!afterDock?.state?.won) fail('docking with proof did not set won');
  if (afterDock?.state?.finale?.endingSeen) fail('endingSeen should remain false while victory panel is open');
  if (!/The Drowned Architects/i.test(victoryText)) fail('victory panel title missing');
  if (!/Continue Survey/i.test(victoryText) || !/New Expedition/i.test(victoryText)) fail('victory panel actions missing');
  await victoryPanel.screenshot({ path: screenshotPath });

  const continueResult = await command(page, 'continueSurvey');
  const afterContinue = await snapshot(page);
  const panelStillVisible = await victoryPanel.isVisible().catch(() => false);
  if (!continueResult?.ok) fail('Continue Survey command did not report success');
  if (!afterContinue?.state?.won || !afterContinue?.state?.finale?.endingSeen) fail('Continue Survey should preserve won and set endingSeen');
  if (panelStillVisible) fail('victory panel should close after Continue Survey');

  const saveFinal = await command(page, 'saveGame');
  await command(page, 'setBiome', 1);
  await waitForWorld(page);
  const loadFinal = await command(page, 'loadGame');
  await waitForLoadComplete(page, loadFinal?.loadId ?? 0);
  const afterFinalLoad = await snapshot(page);
  if (!saveFinal?.ok || !loadFinal?.ok) fail('finale save/load did not report success');
  if (!afterFinalLoad?.state?.won) fail('won did not persist through save/load');
  if (!afterFinalLoad?.state?.finale?.finalProofRecovered) fail('finalProofRecovered did not persist through save/load');
  if (!afterFinalLoad?.state?.finale?.endingSeen) fail('endingSeen did not persist through save/load');

  await command(page, 'setBiome', 4);
  await waitForWorld(page);
  await command(page, 'saveGame');
  await stripFinaleFromStoredSave(page);
  const loadOldDefault = await command(page, 'loadGame');
  await waitForLoadComplete(page, loadOldDefault?.loadId ?? 0);
  const oldDefault = await snapshot(page);
  if (oldDefault?.state?.finale?.finalProofRecovered) fail('old non-won save should default finalProofRecovered to false');
  if (oldDefault?.state?.finale?.endingSeen) fail('old save should default endingSeen to false');
  if (!Array.isArray(oldDefault?.state?.finale?.heardRadio) || oldDefault.state.finale.heardRadio.length !== 0) fail('old save should default heardRadio to []');

  report = {
    ok: errors.length === 0,
    proof: {
      finalProofRecovered: afterProof?.state?.finale?.finalProofRecovered,
      won: afterProof?.state?.won,
      objectiveText,
    },
    victory: {
      won: afterDock?.state?.won,
      endingSeen: afterDock?.state?.finale?.endingSeen,
      victoryText,
    },
    continueSurvey: {
      won: afterContinue?.state?.won,
      endingSeen: afterContinue?.state?.finale?.endingSeen,
      panelStillVisible,
    },
    saveLoad: {
      finalProofRecovered: afterFinalLoad?.state?.finale?.finalProofRecovered,
      endingSeen: afterFinalLoad?.state?.finale?.endingSeen,
      oldDefault: oldDefault?.state?.finale,
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
  console.error('Water9 finale victory smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 finale victory smoke passed.');
console.log(`Report: ${reportPath}`);
console.log(`Screenshot: ${screenshotPath}`);

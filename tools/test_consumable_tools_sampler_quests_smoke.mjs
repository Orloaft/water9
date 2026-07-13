import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_CONSUMABLE_OUT_DIR ?? 'runs/water9-consumable-tools-sampler-quests-2026-07-08';
const reportPath = process.env.WATER9_CONSUMABLE_REPORT ?? `${outDir}/consumable-tools-sampler-quests-smoke.json`;
const proofPath = process.env.WATER9_CONSUMABLE_PROOF ?? `${outDir}/proof.json`;
const host = '127.0.0.1';
const preferredPort = Number(process.env.WATER9_CONSUMABLE_PORT ?? 5188);

await mkdir(outDir, { recursive: true });

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
const errors = [];
const serverLogs = [];
const artifacts = {};

function fail(message) {
  errors.push({ type: 'assertion', text: message });
}

async function portAvailable(port) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 400);
  try {
    const response = await fetch(`http://${host}:${port}/?playtest=1`, { method: 'HEAD', signal: controller.signal });
    return !(response.ok || response.status < 500);
  } catch {
    return true;
  } finally {
    clearTimeout(timeout);
  }
}

async function choosePort() {
  if (process.env.PLAYTEST_URL) return null;
  for (let port = preferredPort; port <= 5199; port += 1) {
    if (port < 5180) continue;
    if (await portAvailable(port)) return port;
  }
  throw new Error('No available dev server port in 5180-5199');
}

const port = await choosePort();
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=1`;

let server = null;
if (!process.env.PLAYTEST_URL) {
  server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
  server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));
}

async function waitForServer(url, timeoutMs = 25000) {
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

async function dismissRadio(page) {
  let guard = 0;
  while (await page.locator('#radio-dialogue.is-open button[data-radio-next]').count()) {
    await page.locator('#radio-dialogue.is-open button[data-radio-next]').click();
    await page.waitForTimeout(40);
    guard += 1;
    if (guard > 12) throw new Error('radio dialogue did not close within 12 lines');
  }
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
  }, loadId, { timeout: 25000 });
}

async function holdKey(page, key, holdMs = 900) {
  await page.keyboard.down(key);
  await page.waitForTimeout(holdMs);
  await page.keyboard.up(key);
  await page.waitForTimeout(160);
}

async function holdSampler(page, holdMs = 2200) {
  await page.keyboard.press('Digit4');
  await page.waitForTimeout(120);
  await holdKey(page, 'Space', holdMs);
  return snapshot(page);
}

async function capturePair(page, label, selector = '#game canvas') {
  const color = `${outDir}/${label}.png`;
  const gray = `${outDir}/${label}-grayscale.png`;
  if (selector === '#game canvas') await page.locator(selector).screenshot({ path: color });
  else await page.screenshot({ path: color, fullPage: false });
  await page.evaluate(() => {
    document.documentElement.style.filter = 'grayscale(1)';
  });
  await page.waitForTimeout(80);
  if (selector === '#game canvas') await page.locator(selector).screenshot({ path: gray });
  else await page.screenshot({ path: gray, fullPage: false });
  await page.evaluate(() => {
    document.documentElement.style.filter = '';
  });
  artifacts[label] = { color, grayscale: gray, selector };
}

async function canvasStats(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#game canvas');
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false, width: 0, height: 0, variedSamples: 0, lumaRange: 0 };
    const values = [];
    for (let y = 30; y < canvas.height - 30; y += 38) {
      for (let x = 30; x < canvas.width - 30; x += 38) {
        const [r, g, b, a] = context.getImageData(x, y, 1, 1).data;
        if (a > 0) values.push(Math.round((r + g + b) / 3));
      }
    }
    return {
      exists: true,
      width: canvas.width,
      height: canvas.height,
      variedSamples: new Set(values).size,
      lumaRange: values.length ? Math.max(...values) - Math.min(...values) : 0,
    };
  });
}

let report = {};
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

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForWorld(page);
  await command(page, 'clearSave');
  await command(page, 'setBiome', 1);
  await page.waitForTimeout(500);
  await waitForWorld(page);
  await page.locator('#game').click({ position: { x: 640, y: 400 }, force: true });

  await command(page, 'grantCredits', 1000);
  const buyStun = await command(page, 'buyShopItem', 'stun-grenade');
  if (!buyStun?.ok || !buyStun?.unlockedTools?.stun) fail(`buying stun grenade did not unlock stun tool: ${JSON.stringify(buyStun)}`);
  await command(page, 'dive');
  await page.keyboard.press('Digit6');
  let snap = await snapshot(page);
  if (snap?.state?.selectedTool !== 'stun') fail(`Digit6 did not select stun after purchase, got ${snap?.state?.selectedTool}`);

  const stunStage = await command(page, 'stageStunToolSmoke');
  if (!stunStage?.ok) fail(`stun stage failed: ${JSON.stringify(stunStage)}`);
  snap = await snapshot(page);
  const grenadesBefore = snap?.state?.cargoItems?.filter((item) => item.id === 'stun-grenade').length ?? 0;
  await page.keyboard.press('Digit6');
  await holdKey(page, 'Space', 240);
  const afterStun = await snapshot(page);
  const grenadesAfter = afterStun?.state?.cargoItems?.filter((item) => item.id === 'stun-grenade').length ?? 0;
  if (grenadesBefore !== 1 || grenadesAfter !== 0) fail(`stun tool did not consume exactly one grenade: ${grenadesBefore} -> ${grenadesAfter}`);
  if ((afterStun?.fish?.[0]?.stunned ?? 0) <= 0) fail(`hostile target was not stunned: ${JSON.stringify(afterStun?.fish?.[0])}`);
  await capturePair(page, 'stun-tool-selected-used');
  await holdKey(page, 'Space', 240);
  const afterEmptyStun = await snapshot(page);
  if (!/No stun grenade/i.test(afterEmptyStun?.ui?.status ?? '')) fail(`empty stun tool did not show clear status: ${afterEmptyStun?.ui?.status}`);

  const saleStage = await command(page, 'stageBargeSaleSmoke');
  if (!saleStage?.ok) fail(`sale stage failed: ${JSON.stringify(saleStage)}`);
  await command(page, 'dock');
  await command(page, 'tickSystems', 0.25);
  const afterSale = await snapshot(page);
  const remainingIds = afterSale?.state?.cargoItems?.map((item) => item.id).sort() ?? [];
  for (const id of ['stun-grenade', 'dynamite', 'flare', 'oxygen-tank', 'fuel-tank', 'first-aid-kit', 'antivenom', 'injector-knife']) {
    if (!remainingIds.includes(id)) fail(`sale filtering removed preserved item ${id}; remaining ${remainingIds.join(',')}`);
  }
  for (const id of ['copper', 'relic', 'flora-sample']) {
    if (remainingIds.includes(id)) fail(`sale filtering preserved sale cargo ${id}; remaining ${remainingIds.join(',')}`);
  }
  if ((afterSale?.state?.credits ?? 0) !== saleStage.saleCargoValue) fail(`sale credits mismatch: ${afterSale?.state?.credits} vs ${saleStage.saleCargoValue}`);
  if ((afterSale?.state?.oreSoldCredits ?? 0) !== saleStage.oreSaleValue) fail(`ore sale quest credit included samples or missed ore: ${afterSale?.state?.oreSoldCredits} vs ${saleStage.oreSaleValue}`);

  await command(page, 'setBiome', 1);
  await page.waitForTimeout(500);
  await waitForWorld(page);
  const floraStage = await command(page, 'floraSamplerSmokeStage', { mode: 'flora' });
  if (!floraStage?.ok) fail(`flora stage failed: ${JSON.stringify(floraStage)}`);
  const beforeSample = await snapshot(page);
  const afterSample = await holdSampler(page);
  const sampleItems = afterSample?.state?.cargoItems?.filter((item) => item.id === 'flora-sample') ?? [];
  if ((afterSample?.state?.sampledSpecies?.length ?? 0) !== (beforeSample?.state?.sampledSpecies?.length ?? 0) + 1) fail('sampler harvest did not advance sampled species');
  if ((afterSample?.state?.cargo ?? 0) !== (beforeSample?.state?.cargo ?? 0) + 1 || sampleItems.length < 1) fail(`sampler harvest did not create sample cargo: ${JSON.stringify(afterSample?.state?.cargoItems)}`);
  if (!afterSample?.floraAnchors?.gameplay?.[0]?.dead) fail('sampler harvest did not mark staged gameplay flora dead');
  await capturePair(page, 'sampler-harvest-sample-cargo');

  for (const mode of ['fish', 'articulated', 'terrain']) {
    const staged = await command(page, 'floraSamplerSmokeStage', { mode });
    if (!staged?.ok) fail(`non-flora stage ${mode} failed: ${JSON.stringify(staged)}`);
    const before = await snapshot(page);
    const after = await holdSampler(page, 1500);
    if ((after?.state?.sampledSpecies?.length ?? 0) !== (before?.state?.sampledSpecies?.length ?? 0)) fail(`sampler affected ${mode} sampled species`);
    if ((after?.state?.cargo ?? 0) !== (before?.state?.cargo ?? 0)) fail(`sampler added cargo for ${mode}`);
  }

  const saveResult = await command(page, 'saveGame');
  const loadResult = await command(page, 'loadGame');
  if (loadResult?.ok) await waitForLoadComplete(page, loadResult.loadId);
  const afterLoad = await snapshot(page);
  if (!saveResult?.ok || !loadResult?.ok) fail(`save/load failed after sample harvest: ${JSON.stringify({ saveResult, loadResult })}`);
  if (!afterLoad?.state?.sampledSpecies?.includes(floraStage.species)) fail(`sampled species did not persist through save/load: ${JSON.stringify(afterLoad?.state?.sampledSpecies)}`);
  if (!afterLoad?.state?.cargoItems?.some((item) => item.id === 'flora-sample')) fail('sample cargo did not persist through save/load');

  const sampleQuestBoards = await command(page, 'sampleQuestBoardsSmoke');
  const sampleQuestKinds = sampleQuestBoards?.boards ?? {};
  if (!sampleQuestBoards?.ok) fail(`one or more generated biome boards missed sample quests: ${JSON.stringify(sampleQuestBoards)}`);
  const acceptSample = await command(page, 'acceptSampleQuest');
  if (!acceptSample?.ok) fail(`accept sample quest failed: ${JSON.stringify(acceptSample)}`);
  const questFlora = await command(page, 'floraSamplerSmokeStage', { mode: 'flora' });
  if (!questFlora?.ok) fail(`quest flora stage failed: ${JSON.stringify(questFlora)}`);
  await holdSampler(page);
  const afterQuestSample = await snapshot(page);
  const activeQuest = afterQuestSample?.state?.questBoard?.find((quest) => quest.id === afterQuestSample?.state?.activeQuestId);
  if (!activeQuest?.completed || activeQuest?.kind !== 'sample') fail(`sample quest did not complete from harvest: ${JSON.stringify(activeQuest)}`);
  await dismissRadio(page);
  await command(page, 'dock');
  await command(page, 'claimActiveQuest');
  await page.waitForTimeout(300);
  await page.locator('.barge-menu').waitFor({ timeout: 5000 });
  await page.locator('button[data-barge-tab="quests"]').click();
  await page.waitForTimeout(200);
  await capturePair(page, 'barge-sample-contract-claim', 'page');
  const afterClaim = await snapshot(page);
  const claimedQuest = afterClaim?.state?.questBoard?.find((quest) => quest.kind === 'sample');
  if (!claimedQuest?.claimed) fail(`sample quest was not claimed: ${JSON.stringify(claimedQuest)}`);

  const stats = await canvasStats(page);
  if (!stats.exists || stats.variedSamples < 8 || stats.lumaRange < 12) fail(`weak or blank canvas proof stats: ${JSON.stringify(stats)}`);

  report = {
    ok: errors.length === 0,
    baseUrl,
    port: port ?? 'external',
    commands: {
      build: 'npm run build',
      smoke: 'node tools/test_consumable_tools_sampler_quests_smoke.mjs',
    },
    stun: {
      buyStun,
      stage: stunStage,
      grenadesBefore,
      grenadesAfter,
      stunnedAfter: afterStun?.fish?.[0]?.stunned,
      emptyStatus: afterEmptyStun?.ui?.status,
    },
    sale: {
      saleStage,
      remainingIds,
      creditsAfter: afterSale?.state?.credits,
      oreSoldCreditsAfter: afterSale?.state?.oreSoldCredits,
    },
    sampler: {
      species: floraStage?.species,
      sampleItems,
      beforeCargo: beforeSample?.state?.cargo,
      afterCargo: afterSample?.state?.cargo,
      floraDead: afterSample?.floraAnchors?.gameplay?.[0]?.dead,
      saveResult,
      loadResult,
      afterLoadCargoItems: afterLoad?.state?.cargoItems,
      afterLoadSampledSpecies: afterLoad?.state?.sampledSpecies,
    },
    quests: {
      sampleQuestKinds,
      completedQuest: activeQuest,
      claimedQuest,
    },
    artifacts,
    canvasStats: stats,
    errors,
  };
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  report = { ok: false, baseUrl, port: port ?? 'external', artifacts, errors };
} finally {
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(proofPath, `${JSON.stringify({
    method: 'Playwright normal play captures from #game canvas plus viewport capture for quest board; grayscale companions use CSS grayscale filter before screenshot.',
    baseUrl,
    port: port ?? 'external',
    commands: ['npm run build', 'node tools/test_consumable_tools_sampler_quests_smoke.mjs'],
    artifacts,
    reportPath,
    errors,
  }, null, 2)}\n`);
  await browser.close().catch(() => {});
  if (server) {
    server.kill('SIGTERM');
    await new Promise((resolveKill) => server.once('exit', resolveKill));
  }
}

if (errors.length) {
  console.error('Water9 consumable tools sampler quests smoke failed:');
  console.error(JSON.stringify({ reportPath, proofPath, errors, serverLogs: serverLogs.slice(-12) }, null, 2));
  process.exit(1);
}

console.log('Water9 consumable tools sampler quests smoke passed.');
console.log(reportPath);
console.log(proofPath);

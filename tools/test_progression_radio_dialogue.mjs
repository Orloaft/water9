import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_PROGRESSION_RADIO_OUT_DIR ?? 'runs/progression-radio-dialogue-expansion-2026-07-13/artifacts';
const reportPath = `${outDir}/progression-radio-smoke.json`;
const host = '127.0.0.1';
const port = Number(process.env.WATER9_PROGRESSION_RADIO_PORT ?? 5194);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=1`;

if (port < 5180 || port > 5199) throw new Error(`WATER9_PROGRESSION_RADIO_PORT must be in 5180-5199, received ${port}`);
await mkdir(outDir, { recursive: true });

let server = null;
if (!process.env.PLAYTEST_URL) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500);
    try {
      const response = await fetch(baseUrl, { method: 'HEAD', signal: controller.signal });
      if (response.ok || response.status < 500) throw new Error(`port ${port} is already serving; choose another port in 5180-5199`);
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
const fail = (message) => errors.push({ type: 'assertion', text: message });

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null) throw new Error(`dev server exited before ready with code ${server.exitCode}`);
    try {
      const response = await fetch(baseUrl, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite may still be binding.
    }
    await sleep(150);
  }
  throw new Error('dev server did not become ready');
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
    return Boolean(snap?.world?.ready !== false && !snap?.ui?.biomeLoading?.active);
  }, null, { timeout: 45000 });
}

async function waitForRadio(page, expectedId) {
  await page.waitForFunction((id) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(snap?.ui?.radioOpen && (!id || snap?.state?.progressionRadio?.activeId === id));
  }, expectedId, { timeout: 10000 });
}

async function waitForLoad(page, loadId) {
  await page.waitForFunction((id) => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(
      snap?.world?.ready !== false
      && !snap?.ui?.biomeLoading?.active
      && snap?.state?.saveLoad?.phase === 'complete'
      && snap?.state?.saveLoad?.completedId >= id
    );
  }, loadId, { timeout: 45000 });
}

async function radioUi(page) {
  return page.locator('#radio-dialogue.is-open').evaluate((root) => {
    const panel = root.querySelector('.radio-dialogue__panel');
    const body = root.querySelector('.radio-dialogue__body');
    const button = root.querySelector('button[data-radio-next]');
    const rect = panel?.getBoundingClientRect();
    const buttonRect = button?.getBoundingClientRect();
    return {
      text: root.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      speaker: root.querySelector('strong')?.textContent ?? '',
      role: root.querySelector('span')?.textContent ?? '',
      button: button?.textContent ?? '',
      clipped: !rect || rect.left < 0 || rect.top < 0 || rect.right > innerWidth || rect.bottom > innerHeight
        || !buttonRect || buttonRect.left < 0 || buttonRect.top < 0 || buttonRect.right > innerWidth || buttonRect.bottom > innerHeight
        || (body ? body.scrollHeight > body.clientHeight + 1 : true),
    };
  });
}

async function advanceRadioToClose(page) {
  let guard = 0;
  while (await page.locator('#radio-dialogue.is-open button[data-radio-next]').count()) {
    await page.locator('#radio-dialogue.is-open button[data-radio-next]').click();
    await sleep(40);
    guard += 1;
    if (guard > 12) throw new Error('radio did not close within 12 lines');
  }
}

async function advanceProgressionEvent(page, eventId) {
  let guard = 0;
  while (true) {
    const snap = await snapshot(page);
    if (!snap?.ui?.radioOpen || snap?.state?.progressionRadio?.activeId !== eventId) return;
    await page.locator('#radio-dialogue.is-open button[data-radio-next]').click();
    await sleep(40);
    guard += 1;
    if (guard > 12) throw new Error(`progression radio ${eventId} did not finish within 12 lines`);
  }
}

if (server) await waitForServer();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) errors.push({ type: 'console', text: message.text() });
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
});

const questExpectations = {
  depth: /Pressure line received/i,
  scan: /Catalog sweep is clean/i,
  sample: /Wet lab has the flora sample/i,
  ore: /Assay order filled/i,
  nest: /Nest telemetry just went quiet/i,
  gulperSurvey: /Wake trace confirmed/i,
  forwardOutpost: /Forward pocket is stable/i,
};
const questResults = {};
const arrivalResults = {};
let openingResult = {};
let fifoResult = {};
let saveLoadResult = {};

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForWorld(page);
  await command(page, 'clearSave');

  await command(page, 'start');
  await waitForRadio(page, '');
  const openingFirst = await radioUi(page);
  if (openingFirst.speaker !== 'Dr. Vale' || !/Barge receiver is live/i.test(openingFirst.text)) fail(`opening conversation changed: ${JSON.stringify(openingFirst)}`);
  await page.keyboard.press('Enter');
  await sleep(80);
  const openingSecond = await radioUi(page);
  if (openingSecond.speaker !== 'You') fail(`keyboard advance did not reach diver line: ${JSON.stringify(openingSecond)}`);
  await advanceRadioToClose(page);
  const afterOpening = await snapshot(page);
  if (afterOpening?.ui?.radioOpen) fail('opening radio did not resume normal play after final line');
  openingResult = { first: openingFirst, second: openingSecond, resumed: !afterOpening?.ui?.radioOpen };

  for (const [kind, expected] of Object.entries(questExpectations)) {
    const id = `progression-smoke-${kind}`;
    const eventId = `progression-v1:quest:${id}`;
    const staged = await command(page, 'progressionRadioQuestSmokeStage', { kind, id, reset: true });
    if (staged?.queuedAfterFirst !== 1 || staged?.queuedAfterSecond !== 1) fail(`${kind} completion did not queue exactly once: ${JSON.stringify(staged)}`);
    await waitForRadio(page, eventId);
    const snap = await snapshot(page);
    const ui = await radioUi(page);
    const messages = snap?.state?.progressionRadio?.messages ?? [];
    if (!expected.test(messages[0]?.text ?? '')) fail(`${kind} selected wrong conversation family: ${JSON.stringify(messages)}`);
    if (ui.clipped || !ui.role || !ui.speaker || !/Continue|Resume/.test(ui.button)) fail(`${kind} radio UI is clipped or incomplete: ${JSON.stringify(ui)}`);
    if (!snap?.state?.story?.heardRadio?.includes(eventId)) fail(`${kind} event was not marked heard on delivery`);

    if (kind === 'depth') {
      await page.screenshot({ path: `${outDir}/quest-completion-depth-viewport.png`, fullPage: false });
      await page.locator('#game canvas').screenshot({ path: `${outDir}/quest-completion-depth-canvas.png` });
    }

    await advanceRadioToClose(page);
    const duplicate = await command(page, 'progressionRadioQuestSmokeStage', { kind, id, reset: false });
    await sleep(120);
    const duplicateSnap = await snapshot(page);
    if (duplicate?.queuedAfterFirst !== 0 || duplicateSnap?.ui?.radioOpen) fail(`${kind} replayed after already heard: ${JSON.stringify({ duplicate, duplicateSnap: duplicateSnap?.state?.progressionRadio })}`);
    questResults[kind] = { eventId, lineCount: messages.length, firstSpeaker: ui.speaker, once: true };
  }

  for (const from of [1, 2, 3]) {
    const biome = from + 1;
    const eventId = `progression-v1:arrival:biome-${biome}`;
    const travel = await command(page, 'progressionRadioTravelSmokeStage', { from, reset: true });
    if (travel?.radioOpenBeforeRestartCompletion || travel?.activeBeforeRestartCompletion) fail(`Biome ${biome} arrival opened before restart completed: ${JSON.stringify(travel)}`);
    if (!travel?.queuedIds?.includes(eventId)) fail(`Biome ${biome} arrival was not queued by travel: ${JSON.stringify(travel)}`);
    await waitForWorld(page);
    await waitForRadio(page, eventId);
    const snap = await snapshot(page);
    const ui = await radioUi(page);
    if (snap?.state?.biome !== biome || !snap?.state?.atBoat || !snap?.state?.docked) fail(`Biome ${biome} arrival did not appear at its new barge: ${JSON.stringify(snap?.state)}`);
    if (ui.clipped || !ui.role || !ui.speaker) fail(`Biome ${biome} arrival UI clipped or unlabeled: ${JSON.stringify(ui)}`);

    if (biome === 2) {
      await page.screenshot({ path: `${outDir}/biome-2-arrival-viewport.png`, fullPage: false });
      await page.locator('#game canvas').screenshot({ path: `${outDir}/biome-2-arrival-canvas.png` });
    }

    const lineCount = snap?.state?.progressionRadio?.messages?.length ?? 0;
    await advanceRadioToClose(page);
    const replayTravel = await command(page, 'progressionRadioTravelSmokeStage', { from, reset: false });
    await waitForWorld(page);
    await sleep(300);
    const replaySnap = await snapshot(page);
    if (replayTravel?.queuedIds?.includes(eventId) || replaySnap?.ui?.radioOpen) fail(`Biome ${biome} arrival replayed: ${JSON.stringify({ replayTravel, progression: replaySnap?.state?.progressionRadio })}`);
    arrivalResults[`biome${biome}`] = { eventId, lineCount, postRestart: true, once: true, ui };
  }

  const fifo = await command(page, 'progressionRadioBackToBackSmokeStage');
  const firstId = 'progression-v1:quest:progression-smoke-fifo-scan';
  const secondId = 'progression-v1:quest:progression-smoke-fifo-ore';
  if (JSON.stringify(fifo?.queuedIds) !== JSON.stringify([firstId, secondId])) fail(`FIFO enqueue order changed: ${JSON.stringify(fifo)}`);
  await waitForRadio(page, firstId);
  const fifoFirst = await radioUi(page);
  await advanceProgressionEvent(page, firstId);
  await waitForRadio(page, secondId);
  const fifoSecond = await radioUi(page);
  if (!/Catalog sweep/i.test(fifoFirst.text) || !/Assay order/i.test(fifoSecond.text)) fail(`FIFO delivery order was overwritten: ${JSON.stringify({ fifoFirst, fifoSecond })}`);
  await advanceRadioToClose(page);
  fifoResult = { queuedIds: fifo?.queuedIds, deliveredIds: [firstId, secondId] };

  await command(page, 'progressionRadioBackToBackSmokeStage');
  await waitForRadio(page, firstId);
  const save = await command(page, 'saveGame');
  const load = await command(page, 'loadGame');
  await waitForLoad(page, load?.loadId ?? 0);
  await waitForRadio(page, secondId);
  const loaded = await snapshot(page);
  if (!save?.ok || !load?.ok) fail(`progression radio save/load failed: ${JSON.stringify({ save, load })}`);
  if (!loaded?.state?.story?.heardRadio?.includes(firstId) || loaded?.state?.progressionRadio?.activeId !== secondId) fail(`save/load replayed or lost progression events: ${JSON.stringify(loaded?.state?.progressionRadio)}`);
  if (loaded?.state?.progressionRadio?.queue?.some((event) => event.id === firstId)) fail('save/load restored an already heard event into the queue');
  await advanceRadioToClose(page);
  await command(page, 'saveGame');
  await page.evaluate(() => {
    const key = 'water9.save.v1';
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error('missing save for legacy normalization check');
    const value = JSON.parse(raw);
    delete value.state.progressionRadioQueue;
    localStorage.setItem(key, JSON.stringify(value));
  });
  const legacyLoad = await command(page, 'loadGame');
  await waitForLoad(page, legacyLoad?.loadId ?? 0);
  await sleep(200);
  const legacy = await snapshot(page);
  if (legacy?.ui?.radioOpen || legacy?.state?.progressionRadio?.queue?.length) fail(`legacy save normalization created radio replay/corruption: ${JSON.stringify(legacy?.state?.progressionRadio)}`);
  saveLoadResult = {
    heardPreserved: loaded?.state?.story?.heardRadio?.filter((id) => id.startsWith('progression-v1:')),
    pendingDelivered: secondId,
    legacyQueueDefaulted: legacy?.state?.progressionRadio?.queue?.length === 0,
  };
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
} finally {
  const report = {
    ok: errors.length === 0,
    errors,
    opening: openingResult,
    quests: questResults,
    arrivals: arrivalResults,
    fifo: fifoResult,
    saveLoad: saveLoadResult,
    captures: [
      `${outDir}/quest-completion-depth-viewport.png`,
      `${outDir}/quest-completion-depth-canvas.png`,
      `${outDir}/biome-2-arrival-viewport.png`,
      `${outDir}/biome-2-arrival-canvas.png`,
    ],
    serverLogs,
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await browser.close();
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([new Promise((resolveExit) => server.once('exit', resolveExit)), sleep(2000)]);
  }
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors, reportPath }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, reportPath, questKinds: Object.keys(questResults), arrivals: Object.keys(arrivalResults) }, null, 2));
}

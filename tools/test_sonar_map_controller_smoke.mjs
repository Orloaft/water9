import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = process.env.WATER9_SONAR_CONTROLLER_OUT_DIR ?? '/home/orlovboros/projects/manager/runs';
const reportPath = process.env.WATER9_SONAR_CONTROLLER_REPORT ?? `${outDir}/water9-sonar-map-controller-smoke-2026-06-28.json`;
const screenshotPath = process.env.WATER9_SONAR_CONTROLLER_SCREENSHOT ?? `${outDir}/water9-sonar-map-controller-smoke-2026-06-28.png`;
const host = '127.0.0.1';
const port = Number(process.env.WATER9_SONAR_CONTROLLER_PORT ?? 5199);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=1`;

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

function fail(message) {
  errors.push({ type: 'assertion', text: message });
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

async function setGamepad(page, { axes = [0, 0, 0, 0], buttons = [] } = {}) {
  await page.evaluate((state) => window.__setMockGamepad?.(state), { axes, buttons });
}

async function tapButton(page, index, holdMs = 260) {
  await setGamepad(page, { buttons: [index] });
  await page.waitForTimeout(holdMs);
  await setGamepad(page);
  await page.waitForTimeout(120);
}

if (server) await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

await page.addInitScript(() => {
  const pad = {
    id: 'Mock Xbox Controller',
    index: 0,
    connected: true,
    mapping: 'standard',
    timestamp: 0,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
    vibrationActuator: null,
  };
  window.__setMockGamepad = ({ axes = [0, 0, 0, 0], buttons = [] } = {}) => {
    pad.timestamp += 16;
    pad.axes = axes;
    pad.buttons = pad.buttons.map((button, index) => {
      const pressed = buttons.includes(index);
      return { ...button, pressed, touched: pressed, value: pressed ? 1 : 0 };
    });
  };
  Object.defineProperty(navigator, 'getGamepads', {
    configurable: true,
    value: () => [pad],
  });
});

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
  await page.locator('button[data-start-game]').waitFor({ timeout: 5000 });
  await setGamepad(page);
  await page.waitForTimeout(180);

  await tapButton(page, 0);
  await page.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.()?.state?.started === true, null, { timeout: 8000 });
  for (let index = 0; index < 7; index += 1) {
    const snap = await snapshot(page);
    if (!snap?.ui?.radioOpen) break;
    await tapButton(page, 0);
  }
  await page.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.()?.ui?.radioOpen === false, null, { timeout: 8000 });
  await command(page, 'dive');
  await command(page, 'teleportDepth', 420);
  await page.waitForTimeout(300);

  const beforeMove = await snapshot(page);
  await setGamepad(page, { axes: [0.9, 0, 0, 0] });
  await page.waitForTimeout(650);
  await setGamepad(page);
  const afterMove = await snapshot(page);

  await tapButton(page, 9);
  await page.locator('.pause-menu.is-open').waitFor({ timeout: 5000 });
  const pauseHasMapButton = await page.locator('button[data-sonar-map]').isVisible().catch(() => false);
  await page.locator('button[data-sonar-map]').click();
  await page.locator('.sonar-map-overlay.is-open #big-sonar-map').waitFor({ timeout: 5000 });
  await page.waitForTimeout(200);
  const mapFromPause = await snapshot(page);
  await setGamepad(page, { axes: [0.85, 0.55, 0, 0] });
  await page.waitForTimeout(260);
  await setGamepad(page);
  const mapAfterPan = await snapshot(page);
  await setGamepad(page, { buttons: [5] });
  await page.waitForTimeout(320);
  await setGamepad(page);
  const mapAfterZoom = await snapshot(page);

  const mapPixels = await page.evaluate(() => {
    const canvas = document.querySelector('#big-sonar-map');
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return null;
    const sample = (x, y) => {
      const data = context.getImageData(Math.max(0, Math.min(canvas.width - 1, x)), Math.max(0, Math.min(canvas.height - 1, y)), 1, 1).data;
      return [data[0], data[1], data[2], data[3]];
    };
    const center = sample(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2));
    const corner = sample(18, 18);
    let lit = 0;
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < data.length; i += 4 * 24) {
      if (data[i + 1] > 48 || data[i + 2] > 54 || data[i] > 60) lit += 1;
    }
    return { width: canvas.width, height: canvas.height, center, corner, lit };
  });

  await page.screenshot({ path: screenshotPath, fullPage: false });
  await tapButton(page, 1);
  const afterMapBack = await snapshot(page);
  await tapButton(page, 8);
  const mapFromView = await snapshot(page);
  await tapButton(page, 8);
  const afterViewClose = await snapshot(page);
  await page.keyboard.press('KeyM');
  const mapFromKeyboard = await snapshot(page);
  await page.keyboard.press('Escape');
  const afterKeyboardClose = await snapshot(page);

  if (!beforeMove?.state?.started) fail('controller A did not confirm title/start');
  if (Math.abs((afterMove?.player?.x ?? 0) - (beforeMove?.player?.x ?? 0)) < 8) fail('left stick did not move the diver');
  if ((afterMove?.state?.sonarRevealed ?? 0) <= (beforeMove?.state?.sonarRevealed ?? 0)) fail('passive discovery did not reveal additional sonar cells');
  if (!pauseHasMapButton) fail('pause menu did not expose a Sonar Map button');
  if (!mapFromPause?.ui?.paused || !mapFromPause?.ui?.sonarMapOpen) fail('pause menu Sonar Map button did not open the paused map');
  if (Math.abs((mapAfterPan?.ui?.sonarMapPanX ?? 0) - (mapFromPause?.ui?.sonarMapPanX ?? 0)) < 1
    && Math.abs((mapAfterPan?.ui?.sonarMapPanY ?? 0) - (mapFromPause?.ui?.sonarMapPanY ?? 0)) < 1) fail('controller left stick did not pan the sonar map');
  if ((mapAfterZoom?.ui?.sonarMapZoom ?? 0) <= (mapAfterPan?.ui?.sonarMapZoom ?? 0)) fail('controller right bumper did not zoom the sonar map in');
  if (!mapPixels || mapPixels.width < 900 || mapPixels.height < 500) fail('big sonar map canvas did not render at expected size');
  if ((mapPixels?.lit ?? 0) < 40) fail('big sonar map canvas looked blank');
  if (mapPixels?.corner && (mapPixels.corner[1] > 70 || mapPixels.corner[2] > 85)) fail('big sonar map appears to reveal an undiscovered corner');
  if (!afterMapBack?.ui?.paused || afterMapBack?.ui?.sonarMapOpen) fail('controller B did not close map back to pause');
  if (!mapFromView?.ui?.paused || !mapFromView?.ui?.sonarMapOpen) fail('controller View/Back did not open the sonar map');
  if (afterViewClose?.ui?.sonarMapOpen) fail('controller View/Back did not close the sonar map');
  if (!mapFromKeyboard?.ui?.paused || !mapFromKeyboard?.ui?.sonarMapOpen) fail('keyboard M did not open the sonar map');
  if (!afterKeyboardClose?.ui?.paused || afterKeyboardClose?.ui?.sonarMapOpen) fail('keyboard Escape did not close the sonar map back to pause');

  report = {
    ok: errors.length === 0,
    beforeMove: { player: beforeMove?.player, sonarRevealed: beforeMove?.state?.sonarRevealed },
    afterMove: { player: afterMove?.player, sonarRevealed: afterMove?.state?.sonarRevealed },
    mapFromPause: { paused: mapFromPause?.ui?.paused, sonarMapOpen: mapFromPause?.ui?.sonarMapOpen },
    mapAfterPan: { panX: mapAfterPan?.ui?.sonarMapPanX, panY: mapAfterPan?.ui?.sonarMapPanY, zoom: mapAfterPan?.ui?.sonarMapZoom },
    mapAfterZoom: { panX: mapAfterZoom?.ui?.sonarMapPanX, panY: mapAfterZoom?.ui?.sonarMapPanY, zoom: mapAfterZoom?.ui?.sonarMapZoom },
    afterMapBack: { paused: afterMapBack?.ui?.paused, sonarMapOpen: afterMapBack?.ui?.sonarMapOpen },
    mapFromView: { paused: mapFromView?.ui?.paused, sonarMapOpen: mapFromView?.ui?.sonarMapOpen },
    afterViewClose: { paused: afterViewClose?.ui?.paused, sonarMapOpen: afterViewClose?.ui?.sonarMapOpen },
    mapFromKeyboard: { paused: mapFromKeyboard?.ui?.paused, sonarMapOpen: mapFromKeyboard?.ui?.sonarMapOpen },
    afterKeyboardClose: { paused: afterKeyboardClose?.ui?.paused, sonarMapOpen: afterKeyboardClose?.ui?.sonarMapOpen },
    mapPixels,
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
  console.error('Water9 sonar map/controller smoke failed:');
  for (const error of errors) console.error(`- ${error.text ?? JSON.stringify(error)}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Water9 sonar map/controller smoke passed.');
console.log(`Screenshot: ${screenshotPath}`);
console.log(`Report: ${reportPath}`);

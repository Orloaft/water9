import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseUrl = process.env.REFINED_URL ?? 'http://127.0.0.1:5191/?playtest=1&diverMotionTest=v3a-refined';
const outDir = resolve('runs/diver-v3-a-refinement-2026-07-11/artifacts/canvas');
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const evidence = { url: baseUrl, viewport: [1440, 900], captures: [], consoleErrors: [], pageErrors: [], bitmapProof: {} };
page.on('console', message => { if (message.type() === 'error') evidence.consoleErrors.push(message.text()); });
page.on('pageerror', error => evidence.pageErrors.push(error.message));

async function command(name, value) {
  const result = await page.evaluate(([n, v]) => window.__AQUA_PLAYTEST__?.command(n, v), [name, value]);
  await page.waitForFunction(() => {
    const s = window.__AQUA_PLAYTEST__?.snapshot();
    return Boolean(s?.world && s.world.ready !== false && s.ui?.biomeLoading?.active !== true);
  }, null, { timeout: 20000 });
  return result;
}
async function snapshot() { return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot()); }
async function waitTexture(keys) {
  await page.waitForFunction(expected => expected.includes(window.__AQUA_PLAYTEST__?.snapshot()?.player?.renderedTextureKey), keys, { timeout: 8000 });
}
async function capture(name, note, api = null) {
  const canvas = page.locator('#game canvas');
  const snapshotAtCanvasCapture = await snapshot();
  await canvas.screenshot({ path: resolve(outDir, `${name}-canvas.png`) });
  await page.screenshot({ path: resolve(outDir, `${name}-hud.png`), fullPage: false });
  const snap = await snapshot();
  const metrics = await canvas.evaluate(el => ({ backing: [el.width, el.height], css: [Math.round(el.getBoundingClientRect().width), Math.round(el.getBoundingClientRect().height)] }));
  evidence.captures.push({ name, note, api, canvas: metrics, snapshotAtCanvasCapture, snapshotAfterHudCapture: snap, snapshot: snapshotAtCanvasCapture });
}

await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 15000 });
await command('start');
await command('dive');
await command('clearProofOverlays');

let api = await command('teleportToReachableDepth', 36);
await command('centerCameraOnPlayer');
for (const [index, label] of [[0, 'a'], [1, 'inbetween'], [2, 'b']]) {
  await waitTexture([`diver-v3-refined-r-${index}`]);
  await capture(`surface-hover-${label}`, `Upper/surface band, right-facing hover progression frame ${index}.`, api);
}

api = await command('backgroundReview', { label: 'v3a-refined-mid', depth: 700, clearWaterWindow: true, zoom: 1.65 });
await page.keyboard.down('d');
for (const [index, label] of [[3, 'propulsion'], [4, 'transition-a'], [5, 'cruise'], [6, 'transition-b']]) {
  await waitTexture([`diver-v3-refined-r-${index}`]);
  await capture(`mid-swim-${label}`, `Mid band, right-facing four-drawing swim progression frame ${index}.`, api);
}
await page.keyboard.up('d');

api = await command('backgroundReview', { label: 'v3a-refined-deep', depth: 1500, clearWaterWindow: true, zoom: 1.65 });
await page.keyboard.down('a');
await page.keyboard.down('s');
await waitTexture(['diver-v3-refined-l-4', 'diver-v3-refined-l-5', 'diver-v3-refined-l-6']);
await capture('deep-swim-authored-left', 'Lower/deep band with authored-left lighting and identical registration.', api);
await page.keyboard.up('a');
await page.keyboard.up('s');

api = await command('selectedToolSmokeStage', { mode: 'life' });
await command('centerCameraOnPlayer');
await command('selectTool', 'scanner');
await page.keyboard.down('Space');
await waitTexture(['diver-v3-refined-r-7']);
await capture('scanner-deploy', 'Live target acquired; two-hand deploy and socket-origin cone.', api);
await waitTexture(['diver-v3-refined-r-8']);
await capture('scanner-hold', 'Live target held; both hands operate scanner and cone remains socket-aligned.', api);
await page.keyboard.up('Space');
await waitTexture(['diver-v3-refined-r-9']);
await capture('scanner-recover', 'Live scan released; readable two-hand recovery frame.', api);

async function hashProof(texture, filename) {
  const browserFetch = await page.evaluate(async path => {
    const response = await fetch(path, { cache: 'no-store' });
    const bytes = await response.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return { status: response.status, bytes: bytes.byteLength, sha256: [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, '0')).join('') };
  }, `/assets/generated/${filename}`);
  const local = await readFile(resolve('public/assets/generated', filename));
  const localSha256 = createHash('sha256').update(local).digest('hex');
  return { texture, filename, browserFetch, localBytes: local.length, localSha256, exactMatch: browserFetch.sha256 === localSha256 };
}
evidence.bitmapProof = {
  newInbetween: await hashProof('diver-v3-refined-r-1', 'diver-v3-refined-r-1.png'),
  authoredLeft: await hashProof('diver-v3-refined-l-5', 'diver-v3-refined-l-5.png'),
};
await writeFile(resolve(outDir, 'runtime-capture-metadata.json'), `${JSON.stringify(evidence, null, 2)}\n`);
await browser.close();

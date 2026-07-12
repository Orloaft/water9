import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseUrl = process.env.MINING_URL ?? 'http://127.0.0.1:5192/?playtest=1&diverMotionTest=v3a-refined-mining';
const run = resolve('runs/diver-v3-a-mining-gif-2026-07-11');
const canvasDir = resolve(run, 'artifacts/canvas');
const deliveryDir = resolve(run, 'artifacts/delivery');
const rawDir = process.env.MINING_RAW_DIR ?? '/tmp/water9-diver-v3-mining-gif-frames';
await Promise.all([mkdir(canvasDir, { recursive: true }), mkdir(deliveryDir, { recursive: true }), mkdir(rawDir, { recursive: true })]);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const evidence = { url: baseUrl, viewport: [1440, 900], captures: [], consoleErrors: [], pageErrors: [], bitmapProof: {}, rawFrameDir: rawDir };
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
async function canvasPng() {
  const data = await page.locator('#game canvas').evaluate(el => el.toDataURL('image/png'));
  return Buffer.from(data.split(',')[1], 'base64');
}
async function capture(name, note, deliver = false) {
  const png = await canvasPng();
  const canvasPath = resolve(canvasDir, `${name}-canvas.png`);
  await writeFile(canvasPath, png);
  await page.screenshot({ path: resolve(canvasDir, `${name}-hud.png`), fullPage: false });
  if (deliver) await writeFile(resolve(deliveryDir, `${name}.png`), png);
  const snap = await snapshot();
  const metrics = await page.locator('#game canvas').evaluate(el => ({ backing: [el.width, el.height], css: [Math.round(el.getBoundingClientRect().width), Math.round(el.getBoundingClientRect().height)] }));
  evidence.captures.push({ name, note, canvas: metrics, snapshot: snap });
}
async function rawFrame(index) {
  await writeFile(resolve(rawDir, `frame-${String(index).padStart(4, '0')}.png`), await canvasPng());
}
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

await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 15000 });
await command('start');
await command('dive');
await command('clearProofOverlays');

let api = await command('teleportToReachableDepth', 36);
await command('centerCameraOnPlayer');
await waitTexture(['diver-v3-refined-r-0', 'diver-v3-refined-r-1', 'diver-v3-refined-r-2']);
await capture('surface-hover-right', 'Upper-band normal play, right hover.', false);

api = await command('backgroundReview', { label: 'v3a-refined-mining-mid', depth: 980, clearWaterWindow: true, zoom: 1.65 });
await page.keyboard.down('d');
await waitTexture(['diver-v3-refined-r-3', 'diver-v3-refined-r-4', 'diver-v3-refined-r-5', 'diver-v3-refined-r-6']);
await capture('mid-swim-right', 'Mid-band right swim; accepted refined identity.', true);
let rawIndex = 0;
for (let i = 0; i < 24; i += 1) {
  await rawFrame(rawIndex++);
  await page.waitForTimeout(55);
}
await page.keyboard.up('d');

api = await command('backgroundReview', { label: 'v3a-refined-mining-deep', depth: 1500, clearWaterWindow: true, zoom: 1.65 });
await page.keyboard.down('a');
await waitTexture(['diver-v3-refined-l-3', 'diver-v3-refined-l-4', 'diver-v3-refined-l-5', 'diver-v3-refined-l-6']);
await capture('deep-swim-left', 'Deep-band authored-left swim adjacent to lower-biome context.', true);
await page.keyboard.up('a');

api = await command('miningPolishReview', { stage: 'setup' });
await command('selectTool', 'drill');
const box = await page.locator('#game canvas').boundingBox();
if (!box) throw new Error('game canvas has no bounding box');
await page.mouse.move(box.x + box.width * 0.5 + 20, box.y + box.height * 0.5);
await page.mouse.down();
await waitTexture(['diver-v3-refined-mining-r-10', 'diver-v3-refined-mining-r-11', 'diver-v3-refined-mining-r-12', 'diver-v3-refined-mining-r-13']);
for (const [index, name] of [[10, 'anticipation'], [11, 'contact'], [12, 'recoil'], [13, 'recover']]) {
  await waitTexture([`diver-v3-refined-mining-r-${index}`]);
  await capture(`mine-${name}-right`, `Normal-play ore face; live cooldown mining ${name} frame ${index}.`, index === 11 || index === 12);
}
for (let i = 0; i < 36; i += 1) {
  await rawFrame(rawIndex++);
  await page.waitForTimeout(45);
}
await page.mouse.up();

evidence.bitmapProof = {
  rightContact: await hashProof('diver-v3-refined-mining-r-11', 'diver-v3-refined-mining-r-11.png'),
  authoredLeftRecoil: await hashProof('diver-v3-refined-mining-l-12', 'diver-v3-refined-mining-l-12.png'),
};
evidence.captureApi = api;
evidence.rawFrames = rawIndex;
await writeFile(resolve(canvasDir, 'runtime-capture-metadata.json'), `${JSON.stringify(evidence, null, 2)}\n`);
await browser.close();

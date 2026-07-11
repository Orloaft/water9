import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseUrl = process.env.MOTION_URL ?? 'http://127.0.0.1:5187/?playtest=1&diverMotionTest=v3a';
const outDir = resolve('runs/diver-v3-a-motion-test-2026-07-11/artifacts/canvas');
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
  await page.waitForFunction(expected => expected.includes(window.__AQUA_PLAYTEST__?.snapshot()?.player?.renderedTextureKey), keys, { timeout: 5000 });
}
async function capture(name, note, api = null) {
  const canvas = page.locator('#game canvas');
  await canvas.screenshot({ path: resolve(outDir, `${name}-canvas.png`) });
  await page.screenshot({ path: resolve(outDir, `${name}-hud.png`), fullPage: false });
  const snap = await snapshot();
  const metrics = await canvas.evaluate(el => ({ backing: [el.width, el.height], css: [Math.round(el.getBoundingClientRect().width), Math.round(el.getBoundingClientRect().height)] }));
  evidence.captures.push({ name, note, api, canvas: metrics, snapshot: snap });
}

await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 15000 });
await command('start');
await command('dive');
await command('clearProofOverlays');

let api = await command('teleportToReachableDepth', 36);
await command('centerCameraOnPlayer');
await waitTexture(['diver-v3-motion-0', 'diver-v3-motion-1']);
await capture('surface-hover', 'Normal-play surface band with V3 A hover loop and full HUD identity.', api);

api = await command('backgroundReview', { label: 'v3a-mid', depth: 700, clearWaterWindow: true, zoom: 1.65 });
await page.keyboard.down('d');
await page.waitForTimeout(240);
await waitTexture(['diver-v3-motion-2', 'diver-v3-motion-3']);
await capture('mid-swim', 'Normal-play mid band during authored V3 A propulsion/cruise loop.', api);
await page.keyboard.up('d');

api = await command('backgroundReview', { label: 'v3a-deep', depth: 1500, clearWaterWindow: true, zoom: 1.65 });
await page.keyboard.down('d');
await page.keyboard.down('s');
await page.waitForTimeout(620);
await waitTexture(['diver-v3-motion-2', 'diver-v3-motion-3']);
await capture('deep-swim', 'Normal-play deep band during authored V3 A swim loop.', api);
await page.keyboard.up('d');
await page.keyboard.up('s');

api = await command('selectedToolSmokeStage', { mode: 'life' });
await command('centerCameraOnPlayer');
await command('selectTool', 'scanner');
await page.keyboard.down('Space');
await waitTexture(['diver-v3-motion-5']);
await capture('scanner-hold', 'Normal-play scanner primary held on a live target; two-hand authored hold plus modular scan effect/HUD.', api);
await page.keyboard.up('Space');
await waitTexture(['diver-v3-motion-6']);
await capture('scanner-recover', 'Normal-play one-shot authored scanner recover immediately after primary release.', api);

const browserHash = await page.evaluate(async () => {
  const response = await fetch('/assets/generated/diver-v3-motion-5.png', { cache: 'no-store' });
  const bytes = await response.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return { status: response.status, bytes: bytes.byteLength, sha256: [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, '0')).join('') };
});
const localBytes = await readFile(resolve('public/assets/generated/diver-v3-motion-5.png'));
evidence.bitmapProof = {
  activeTexture: evidence.captures.find(c => c.name === 'scanner-hold')?.snapshot?.player?.renderedTextureKey,
  browserFetch: browserHash,
  localSha256: createHash('sha256').update(localBytes).digest('hex'),
  localBytes: localBytes.length,
  exactMatch: browserHash.sha256 === createHash('sha256').update(localBytes).digest('hex'),
};
await writeFile(resolve(outDir, 'runtime-capture-metadata.json'), `${JSON.stringify(evidence, null, 2)}\n`);
await browser.close();

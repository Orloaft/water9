import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseUrl = process.env.AUDIT_URL ?? 'http://127.0.0.1:5180/?playtest=1';
const outDir = resolve('runs/current-diver-sprite-audit-2026-07-11/artifacts');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const evidence = { url: baseUrl, viewport: [1440, 900], captures: [], consoleErrors: [], pageErrors: [] };

page.on('console', message => {
  if (message.type() === 'error') evidence.consoleErrors.push(message.text());
});
page.on('pageerror', error => evidence.pageErrors.push(error.message));

async function command(name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue), [name, value]);
  if (result?.restarting) await page.waitForTimeout(300);
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot();
    return Boolean(snap?.world && snap.world.ready !== false && snap.ui?.biomeLoading?.active !== true);
  }, null, { timeout: 15000 });
  return result;
}

async function snapshot() {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot());
}

async function capture(filename, note, api = null) {
  await page.screenshot({ path: resolve(outDir, filename), fullPage: false });
  const snap = await snapshot();
  const canvas = await page.locator('#game canvas').evaluate(el => ({
    backing: [el.width, el.height],
    css: [Math.round(el.getBoundingClientRect().width), Math.round(el.getBoundingClientRect().height)],
  }));
  evidence.captures.push({
    filename,
    note,
    api,
    canvas,
    state: snap?.state,
    ui: snap?.ui,
    player: snap?.player,
    camera: snap?.camera,
    parallaxDepthBand: snap?.parallax?.depthBand,
  });
}

await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 15000 });
await page.waitForFunction(() => {
  const snap = window.__AQUA_PLAYTEST__?.snapshot();
  return Boolean(snap?.world && snap.world.ready !== false && snap.ui?.biomeLoading?.active !== true);
}, null, { timeout: 30000 });
await command('start');
await command('dive');
await command('clearProofOverlays');

let api = await command('teleportToReachableDepth', 36);
await command('centerCameraOnPlayer');
await page.waitForTimeout(220);
await capture('runtime-surface-idle-hud.png', 'Normal-play surface band, stationary live idle animation, full Water9 HUD and #game canvas.', api);

api = await command('backgroundReview', { label: 'diver-mid', depth: 700, clearWaterWindow: true, zoom: 1.65 });
await page.keyboard.down('d');
await page.waitForTimeout(120);
await page.keyboard.up('d');
await capture('runtime-mid-swim-hud.png', 'Normal-play mid band during rightward acceleration; live swim selection and full HUD.', api);

api = await command('backgroundReview', { label: 'diver-deep', depth: 1500, clearWaterWindow: true, zoom: 1.65 });
await page.keyboard.down('d');
await page.keyboard.down('s');
await page.waitForTimeout(950);
await capture('runtime-deep-diagonal-boost-hud.png', 'Actual normal renderer/HUD at 1500 m lower/deep band during diagonal top-speed movement; live boost selector.', api);
await page.keyboard.up('d');
await page.keyboard.up('s');

api = await command('miningPolishReview', { stage: 'setup' });
await command('centerCameraOnPlayer');
const drill = await page.evaluate(() => window.__AQUA_PLAYTEST__?.command('miningPolishReview', { stage: 'drill' }));
await capture('runtime-tool-mining-live-frame.png', 'Actual mining action: mine cooldown drives the live baked mine frame while contact effects and HUD remain separate.', { setup: api, drill });

api = await command('selectedToolSmokeStage', { mode: 'life' });
await command('centerCameraOnPlayer');
await command('selectTool', 'scanner');
await page.keyboard.down('Space');
await page.waitForTimeout(360);
await capture('runtime-tool-scanner-live.png', 'Actual scanner primary held on a close life target; diver stays on generic idle while target/effect/HUD carry the read.', api);
await page.keyboard.up('Space');

api = await command('floraSamplerSmokeStage', { mode: 'flora' });
await command('centerCameraOnPlayer');
await command('selectTool', 'sampler');
await page.keyboard.down('Space');
await page.waitForTimeout(360);
await capture('runtime-tool-sampler-live.png', 'Actual sampler primary held on staged close gameplay flora; diver stays generic while target/HUD carry the read.', api);
await page.keyboard.up('Space');

api = await command('selectedToolSmokeStage', { mode: 'life' });
await command('centerCameraOnPlayer');
await command('selectTool', 'sonar');
await page.keyboard.press('KeyQ');
await page.waitForTimeout(60);
await command('clearProofOverlays');
await page.waitForTimeout(40);
await capture('runtime-tool-sonar-ring-live.png', 'Actual sonar activation with chart reclosed quickly so the live world-space ping ring, generic diver, and HUD are visible together.', api);

await writeFile(resolve(outDir, 'runtime-capture-metadata.json'), `${JSON.stringify(evidence, null, 2)}\n`);
await browser.close();

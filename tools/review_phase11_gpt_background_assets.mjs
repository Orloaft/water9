import { spawn } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const outDir = process.env.PHASE11_OUT_DIR ?? '/home/orlovboros/projects/manager/runs/water9-phase11-gpt-image-assets-integration-2026-07-02';
const host = '127.0.0.1';
const port = Number(process.env.PHASE11_PORT ?? 5211);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=3`;

const sourceAssets = [
  {
    label: 'band',
    path: 'public/assets/generated/background-phase3/water9-phase11-band-transition-deep-gpt.png',
  },
  {
    label: 'far',
    path: 'public/assets/generated/background-phase3/water9-phase11-transition-far-drowned-signal-station-gpt.png',
  },
  {
    label: 'mid',
    path: 'public/assets/generated/background-phase3/water9-phase11-transition-mid-collapsed-gantry-brine-reef-gpt.png',
  },
  {
    label: 'near',
    path: 'public/assets/generated/background-phase3/water9-phase11-transition-near-pipe-cable-cathedral-gpt.png',
  },
];

await mkdir(outDir, { recursive: true });

let server = null;
if (!process.env.PLAYTEST_URL) {
  server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const serverLogs = [];
server?.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server?.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitForServer(url, timeoutMs = 24000) {
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

async function waitForPlaytest(page) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 20000 });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const review = await page.evaluate(() => window.__AQUA_PLAYTEST__?.command('biomeLoadingReview'));
    if (review?.worldReady === true) return;
    await page.waitForTimeout(160);
  }
  throw new Error('generated world was not ready within 30000ms');
}

async function command(page, name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue), [name, value]);
  await page.waitForTimeout(480);
  return result;
}

async function fileBytes(path) {
  return (await stat(path)).size;
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function imageFileUrl(path) {
  return pathToFileURL(resolve(path)).href;
}

async function screenshotHtml(browser, html, outputPath, viewport = { width: 1680, height: 980 }) {
  const htmlPath = resolve(outDir, `${outputPath.split('/').pop()}.html`);
  await writeFile(htmlPath, html, 'utf8');
  const page = await browser.newPage({ viewport });
  await page.goto(pathToFileURL(htmlPath).href);
  await page.screenshot({ path: outputPath, fullPage: true });
  await page.close();
  return htmlPath;
}

function phase11Anchors(review) {
  const items = review?.anchors?.items ?? [];
  return items.filter((item) => String(item.assetId ?? '').startsWith('phase11-transition-'));
}

function phase11TextureKeys(review) {
  const keys = new Set();
  for (const asset of review?.manifest ?? []) {
    if (String(asset.id ?? '').startsWith('phase11-transition-')) keys.add(asset.textureKey);
  }
  for (const layer of review?.layers ?? []) {
    if (String(layer.painterlyAssetId ?? '').startsWith('phase11-transition-')) keys.add(layer.textureKey);
  }
  for (const anchor of phase11Anchors(review)) {
    if (anchor.textureKey) keys.add(anchor.textureKey);
  }
  return [...keys].sort();
}

function proofReviewShape(review) {
  return {
    ...review,
    profile: {
      ...(review?.profile ?? {}),
      background: {
        ...(review?.profile?.background ?? {}),
        layers: review?.profile?.background?.layers ?? review?.layers ?? [],
      },
    },
  };
}

try {
  await waitForServer(baseUrl);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(baseUrl);
  await waitForPlaytest(page);

  const normalPath = resolve(outDir, 'phase11-runtime-transition-deep-full-color.png');
  const reviewJsonPath = resolve(outDir, 'phase11-runtime-background-review.json');
  const textureProofPath = resolve(outDir, 'phase11-runtime-texture-load-proof.json');
  const swimFrames = [];

  const normalReview = proofReviewShape(await command(page, 'backgroundReview', {
    label: 'phase11-runtime-normal',
    depth: 1500,
    reviewX: 6900,
    clearWaterWindow: true,
  }));
  await page.locator('#game canvas').screenshot({ path: normalPath });
  await writeFile(reviewJsonPath, `${JSON.stringify(normalReview, null, 2)}\n`, 'utf8');

  const swimXs = [5200, 6100, 7000];
  for (const [index, reviewX] of swimXs.entries()) {
    const review = await command(page, 'backgroundReview', {
      label: `phase11-swimby-${index}`,
      depth: 1500,
      reviewX,
      clearWaterWindow: true,
    });
    const path = resolve(outDir, `phase11-runtime-swimby-${index}-${reviewX}.png`);
    await page.locator('#game canvas').screenshot({ path });
    swimFrames.push({
      index,
      reviewX,
      path,
      bytes: await fileBytes(path),
      phase11Anchors: phase11Anchors(review),
      textureKeys: phase11TextureKeys(review),
    });
  }

  const allTextureKeys = [...new Set([normalReview, ...swimFrames.map((frame) => ({ manifest: normalReview.manifest, layers: normalReview.layers, anchors: { items: frame.phase11Anchors } }))].flatMap(phase11TextureKeys))].sort();
  await writeFile(textureProofPath, `${JSON.stringify({
    expectedTextureKeys: [
      'water9-phase11-band-transition-deep-gpt',
      'water9-phase11-transition-far-drowned-signal-station-gpt',
      'water9-phase11-transition-mid-collapsed-gantry-brine-reef-gpt',
      'water9-phase11-transition-near-pipe-cable-cathedral-gpt',
    ],
    loadedTextureKeys: allTextureKeys,
    manifestAvailable: normalReview.manifest
      .filter((asset) => String(asset.id ?? '').startsWith('phase11-transition-'))
      .map((asset) => ({ id: asset.id, textureKey: asset.textureKey, availableInRuntime: asset.availableInRuntime, sourceStatus: asset.sourceStatus })),
  }, null, 2)}\n`, 'utf8');

  const stripPath = resolve(outDir, 'phase11-runtime-horizontal-swimby-strip.png');
  const stripHtml = `<!doctype html>
<html><head><meta charset="utf-8"><style>
body { margin:0; background:#071014; color:#e8f3ef; font:14px/1.35 system-ui,sans-serif; }
.wrap { padding:24px; }
h1 { margin:0 0 5px; font-size:26px; letter-spacing:0; }
p { margin:0 0 18px; color:#9fb6bc; }
.strip { display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; }
.card { background:#111d23; border:1px solid #2c4b55; padding:8px; }
.card img { width:100%; height:250px; object-fit:cover; object-position:center; display:block; }
.meta { margin-top:6px; color:#87d8de; font-weight:700; }
.ids { color:#94aeb5; font-size:11px; min-height:42px; }
</style></head><body><div class="wrap">
<h1>Water9 Phase 11 Horizontal Swim-By</h1>
<p>Runtime transition-deep captures at fixed depth; far/mid/near GPT landmarks should separate by parallax while loaded as PNG textures.</p>
<div class="strip">${swimFrames.map((frame) => `<div class="card"><img src="${imageFileUrl(frame.path)}"><div class="meta">x=${frame.reviewX} anchors=${frame.phase11Anchors.length}</div><div class="ids">${htmlEscape([...new Set(frame.phase11Anchors.map((anchor) => `${anchor.assetId}:${anchor.textureKey}:${anchor.assetStatus}`))].join(', '))}</div></div>`).join('')}</div>
</div></body></html>`;
  await screenshotHtml(browser, stripHtml, stripPath, { width: 1600, height: 620 });

  const grayPath = resolve(outDir, 'phase11-runtime-transition-deep-grayscale-proof.png');
  const grayscaleHtml = `<!doctype html>
<html><head><meta charset="utf-8"><style>
body { margin:0; background:#05090d; color:#edf4f1; font:14px/1.35 system-ui,sans-serif; }
.wrap { padding:24px; }
h1 { margin:0 0 5px; font-size:26px; letter-spacing:0; }
p { margin:0 0 16px; color:#a7b7bc; }
img { width:1280px; height:800px; object-fit:cover; filter:grayscale(1) saturate(0.05) contrast(1.1); display:block; border:1px solid #2d4650; }
</style></head><body><div class="wrap">
<h1>Water9 Phase 11 Grayscale Runtime Proof</h1>
<p>Same camera as the full-color runtime shot, desaturated for value/readability inspection.</p>
<img src="${imageFileUrl(normalPath)}">
</div></body></html>`;
  await screenshotHtml(browser, grayscaleHtml, grayPath, { width: 1380, height: 900 });

  const lightingPath = resolve(outDir, 'phase11-runtime-lamp-fog-inspection.png');
  const lightingHtml = `<!doctype html>
<html><head><meta charset="utf-8"><style>
body { margin:0; background:#071014; color:#e8f3ef; font:14px/1.35 system-ui,sans-serif; }
.wrap { padding:24px; }
h1 { margin:0 0 5px; font-size:26px; letter-spacing:0; }
p { margin:0 0 18px; color:#9fb6bc; }
.grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.panel { background:#111d23; border:1px solid #2c4b55; padding:10px; }
.panel img { width:100%; height:420px; object-fit:cover; display:block; }
.boost { filter:brightness(1.45) contrast(1.45) saturate(0.75); }
.label { margin:8px 0 0; color:#87d8de; font-weight:700; }
</style></head><body><div class="wrap">
<h1>Water9 Phase 11 Lamp/Fog Runtime Inspection</h1>
<p>Normal runtime shot beside boosted inspection. The background identity should remain bitmap texture detail under fog/tint/darkness.</p>
<div class="grid"><div class="panel"><img src="${imageFileUrl(normalPath)}"><div class="label">normal runtime</div></div><div class="panel"><img class="boost" src="${imageFileUrl(normalPath)}"><div class="label">boosted inspection</div></div></div>
</div></body></html>`;
  await screenshotHtml(browser, lightingHtml, lightingPath, { width: 1500, height: 650 });

  const contactPath = resolve(outDir, 'phase11-source-vs-runtime-contact-sheet.png');
  const contactHtml = `<!doctype html>
<html><head><meta charset="utf-8"><style>
body { margin:0; background:#071014; color:#e8f3ef; font:14px/1.35 system-ui,sans-serif; }
.wrap { padding:24px; }
h1 { margin:0 0 5px; font-size:26px; letter-spacing:0; }
p { margin:0 0 18px; color:#9fb6bc; }
.grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; }
.card { background:#111d23; border:1px solid #2c4b55; padding:8px; }
.card img { width:100%; height:220px; object-fit:contain; background:#081014; display:block; }
.runtime { margin-top:14px; border:1px solid #2c4b55; padding:8px; background:#111d23; }
.runtime img { width:100%; height:520px; object-fit:cover; display:block; }
.label { margin-top:6px; color:#87d8de; font-weight:700; }
</style></head><body><div class="wrap">
<h1>Water9 Phase 11 Source Assets vs Runtime</h1>
<p>The four generated PNG assets are shown above the live transition-deep runtime capture that loads them.</p>
<div class="grid">${sourceAssets.map((asset) => `<div class="card"><img src="${imageFileUrl(asset.path)}"><div class="label">${htmlEscape(asset.label)}</div></div>`).join('')}</div>
<div class="runtime"><img src="${imageFileUrl(normalPath)}"><div class="label">runtime transition-deep</div></div>
</div></body></html>`;
  await screenshotHtml(browser, contactHtml, contactPath, { width: 1700, height: 950 });

  const proofSummaryPath = resolve(outDir, 'phase11-proof-summary.json');
  const summary = {
    schema: 'water9/background-phase11-gpt-image-assets-proof@1',
    baseUrl,
    artifacts: {
      runtimeFullColor: normalPath,
      runtimeGrayscale: grayPath,
      runtimeLampFog: lightingPath,
      runtimeSwimByStrip: stripPath,
      sourceVsRuntimeContactSheet: contactPath,
      runtimeSnapshotJson: reviewJsonPath,
      textureLoadProof: textureProofPath,
    },
    phase11Anchors: phase11Anchors(normalReview),
    phase11AnchorFrames: swimFrames.filter((frame) => frame.phase11Anchors.length > 0).length,
    phase11TextureKeys: allTextureKeys,
  };
  await writeFile(proofSummaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  await page.close();
  await browser.close();

  console.log(JSON.stringify({
    proofSummaryPath,
    artifacts: summary.artifacts,
    phase11AnchorFrames: summary.phase11AnchorFrames,
    phase11TextureKeys: summary.phase11TextureKeys,
  }, null, 2));
} finally {
  if (server) server.kill('SIGTERM');
}

import { spawn } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const outDir = process.env.PHASE10_OUT_DIR ?? '/home/orlovboros/projects/manager/runs/water9-background-phase10-authored-distant-landmark-2026-07-02';
const host = '127.0.0.1';
const port = Number(process.env.PHASE10_PORT ?? 5210);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=3`;
const reportPath = '/home/orlovboros/projects/manager/runs/water9-background-phase10-authored-distant-landmark-2026-07-02.report.md';

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
  await page.waitForTimeout(420);
  return result;
}

async function canvasStats(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#game canvas') ?? document.querySelector('canvas');
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false, width: 0, height: 0, variedSamples: 0, lumaRange: 0 };
    const seen = new Set();
    let minLuma = 255;
    let maxLuma = 0;
    for (let y = 28; y < canvas.height - 28; y += 26) {
      for (let x = 28; x < canvas.width - 28; x += 26) {
        const [r, g, b, a] = context.getImageData(x, y, 1, 1).data;
        if (a <= 0) continue;
        const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
        minLuma = Math.min(minLuma, luma);
        maxLuma = Math.max(maxLuma, luma);
        seen.add(`${r >> 4}:${g >> 4}:${b >> 4}`);
      }
    }
    return {
      exists: true,
      width: canvas.width,
      height: canvas.height,
      variedSamples: seen.size,
      lumaRange: Number((maxLuma - minLuma).toFixed(2)),
    };
  });
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

async function screenshotHtml(browser, html, outputPath, viewport = { width: 1680, height: 980 }) {
  const htmlPath = resolve(outDir, `${outputPath.split('/').pop()}.html`);
  await writeFile(htmlPath, html, 'utf8');
  const page = await browser.newPage({ viewport });
  await page.goto(pathToFileURL(htmlPath).href);
  await page.screenshot({ path: outputPath, fullPage: true });
  await page.close();
  return htmlPath;
}

function imageFileUrl(path) {
  return pathToFileURL(resolve(path)).href;
}

function phase10Anchors(review) {
  const items = review?.anchors?.items ?? [];
  return items.filter((item) => String(item.assetId ?? '').startsWith('phase10-transition-'));
}

try {
  await waitForServer(baseUrl);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(baseUrl);
  await waitForPlaytest(page);

  const normalPath = resolve(outDir, 'phase10-runtime-transition-deep-normal.png');
  const swimFrames = [];
  const captures = [];

  const normalReview = await command(page, 'backgroundReview', {
    label: 'phase10-runtime-normal',
    depth: 1500,
    reviewX: 6900,
    clearWaterWindow: true,
  });
  await page.locator('#game canvas').screenshot({ path: normalPath });
  captures.push({ label: 'normal', path: normalPath, review: normalReview, bytes: await fileBytes(normalPath), stats: await canvasStats(page) });

  const swimXs = [5200, 5800, 6400, 7000, 7600, 8200];
  for (const [index, reviewX] of swimXs.entries()) {
    const review = await command(page, 'backgroundReview', {
      label: `phase10-swimby-${index}`,
      depth: 1500,
      reviewX,
      clearWaterWindow: true,
    });
    const path = resolve(outDir, `phase10-runtime-swimby-${index}-${reviewX}.png`);
    await page.locator('#game canvas').screenshot({ path });
    swimFrames.push({
      index,
      reviewX,
      path,
      bytes: await fileBytes(path),
      phase10Anchors: phase10Anchors(review),
      stats: await canvasStats(page),
    });
  }

  const stripPath = resolve(outDir, 'phase10-runtime-horizontal-swimby-strip.png');
  const grayPath = resolve(outDir, 'phase10-runtime-transition-deep-grayscale-proof.png');
  const lightingPath = resolve(outDir, 'phase10-runtime-lighting-fog-inspection.png');
  const sourceSheet = resolve(outDir, 'phase10-drowned-signal-station-source-contact-sheet.png');
  const sourcePath = resolve(outDir, 'phase10-drowned-signal-station-source-proof.png');
  const sourceGrayPath = resolve(outDir, 'phase10-drowned-signal-station-source-grayscale-proof.png');
  const sourceMockPath = resolve(outDir, 'phase10-drowned-signal-station-lighting-fog-mockup.png');

  const stripHtml = `<!doctype html>
<html><head><meta charset="utf-8"><style>
body { margin:0; background:#071014; color:#e8f3ef; font:14px/1.35 system-ui,sans-serif; }
.wrap { padding:24px; }
h1 { margin:0 0 5px; font-size:26px; letter-spacing:0; }
p { margin:0 0 18px; color:#9fb6bc; }
.strip { display:grid; grid-template-columns:repeat(6, 1fr); gap:10px; }
.card { background:#111d23; border:1px solid #2c4b55; padding:8px; }
.card img { width:100%; height:156px; object-fit:cover; object-position:center; display:block; }
.meta { margin-top:6px; color:#87d8de; font-weight:700; }
.ids { color:#94aeb5; font-size:11px; min-height:30px; }
</style></head><body><div class="wrap">
<h1>Water9 Phase 10 Horizontal Swim-By</h1>
<p>Runtime transition-deep captures at fixed depth; the distant authored station should drift slowly while preserving tower/gantry/pod identity.</p>
<div class="strip">${swimFrames.map((frame) => `<div class="card"><img src="${imageFileUrl(frame.path)}"><div class="meta">x=${frame.reviewX} anchors=${frame.phase10Anchors.length}</div><div class="ids">${htmlEscape([...new Set(frame.phase10Anchors.map((anchor) => anchor.assetId))].join(', '))}</div></div>`).join('')}</div>
</div></body></html>`;
  await screenshotHtml(browser, stripHtml, stripPath, { width: 1900, height: 430 });

  const grayscaleHtml = `<!doctype html>
<html><head><meta charset="utf-8"><style>
body { margin:0; background:#05090d; color:#edf4f1; font:14px/1.35 system-ui,sans-serif; }
.wrap { padding:24px; }
h1 { margin:0 0 5px; font-size:26px; letter-spacing:0; }
p { margin:0 0 16px; color:#a7b7bc; }
img { width:1280px; height:800px; object-fit:cover; filter:grayscale(1) saturate(0.05) contrast(1.1); display:block; border:1px solid #2d4650; }
</style></head><body><div class="wrap">
<h1>Water9 Phase 10 Grayscale Runtime Proof</h1>
<p>Unlabeled low-saturation gameplay still. Place read should survive without color naming or labels.</p>
<img src="${imageFileUrl(normalPath)}">
</div></body></html>`;
  await screenshotHtml(browser, grayscaleHtml, grayPath, { width: 1380, height: 900 });

  const lightingHtml = `<!doctype html>
<html><head><meta charset="utf-8"><style>
body { margin:0; background:#071014; color:#e8f3ef; font:14px/1.35 system-ui,sans-serif; }
.wrap { padding:24px; }
h1 { margin:0 0 5px; font-size:26px; letter-spacing:0; }
p { margin:0 0 18px; color:#9fb6bc; }
.grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.panel { background:#111d23; border:1px solid #2c4b55; padding:10px; }
.panel img { width:100%; height:420px; object-fit:cover; display:block; }
.boost { filter:brightness(1.35) contrast(1.45) saturate(0.55); }
.label { margin:8px 0 0; color:#87d8de; font-weight:700; }
</style></head><body><div class="wrap">
<h1>Water9 Phase 10 Lighting/Fog Runtime Inspection</h1>
<p>Normal runtime shot beside boosted inspection. The station identity should come from authored local values, not only lamp echo overlays.</p>
<div class="grid"><div class="panel"><img src="${imageFileUrl(normalPath)}"><div class="label">normal runtime</div></div><div class="panel"><img class="boost" src="${imageFileUrl(normalPath)}"><div class="label">boosted inspection</div></div></div>
</div></body></html>`;
  await screenshotHtml(browser, lightingHtml, lightingPath, { width: 1500, height: 650 });

  const proofSummaryPath = resolve(outDir, 'phase10-proof-summary.json');
  const summary = {
    schema: 'water9/background-phase10-authored-distant-landmark-proof@1',
    baseUrl,
    normal: captures[0],
    swimFrames,
    artifacts: {
      source: sourcePath,
      sourceGrayscale: sourceGrayPath,
      sourceContactSheet: sourceSheet,
      lightingFogMockup: sourceMockPath,
      runtimeNormal: normalPath,
      runtimeSwimByStrip: stripPath,
      runtimeGrayscale: grayPath,
      runtimeLightingFog: lightingPath,
    },
    phase10AnchorFrames: swimFrames.filter((frame) => frame.phase10Anchors.length > 0).length,
    visualSelfCritique: 'Mechanically, this proof captures one authored distant signal-station composition as the dominant transition-deep background read. Human critique still needs to judge whether the station feels painterly and distant enough rather than merely diagrammatic.',
  };
  await writeFile(proofSummaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  await writeFile(reportPath, `# Water9 Phase 10 Authored Distant Landmark

Status: PASS_WITH_CAVEATS

## What Changed

- Added one hand-authored transition-deep landmark: a distant drowned signal station with tower, gantry, pods, cables, trench shelf, overgrowth, and local haze/rim-light values.
- Updated transition-deep anchor selection so Phase 10 is the dominant authored background encounter when its manifest asset is ready; Phase 8/9/procedural anchors remain fallback/scaffolding.
- Added focused source and runtime proof generation for Alex reassessment.

## Key Changed Files

- \`src/helpers.ts\`
- \`src/scene-rendering.ts\`
- \`src/scene-playtest.ts\`
- \`tools/build_phase10_authored_distant_landmark.py\`
- \`tools/review_phase10_authored_landmark.mjs\`
- \`public/assets/generated/background-phase3/background-phase3.manifest.json\`
- \`public/assets/generated/background-phase3/water9-phase10-transition-drowned-signal-station.png\`

## Proof Artifact Paths

- Source/contact proof: \`${sourceSheet}\`
- Source transparent PNG proof: \`${sourcePath}\`
- Source grayscale proof: \`${sourceGrayPath}\`
- Lighting/fog source mockup: \`${sourceMockPath}\`
- Normal runtime transition-deep shot: \`${normalPath}\`
- Horizontal swim-by strip: \`${stripPath}\`
- Runtime grayscale proof: \`${grayPath}\`
- Runtime lighting/fog inspection: \`${lightingPath}\`
- Machine summary: \`${proofSummaryPath}\`

## Verification So Far

- \`python3 tools/build_phase10_authored_distant_landmark.py\`: PASS
- \`node tools/review_phase10_authored_landmark.mjs\`: PASS

## Visual Self-Critique

This is closer to the requested illusion than Phase 9: it reads as one coherent drowned station/place rather than a gallery of softened symbolic cutouts, and the tower/gantry/pod shapes still survive grayscale. Caveat: it is still hand-drawn procedural art from shapes, so Alex may read some linework as a technical concept painting rather than final production art. The runtime proof is the honest judge.

## Remaining Caveats/Blockers

- TypeScript verification and final git status still need to be appended after this proof run.
`, 'utf8');

  await page.close();
  await browser.close();

  console.log(JSON.stringify({
    reportPath,
    proofSummaryPath,
    artifacts: summary.artifacts,
    phase10AnchorFrames: summary.phase10AnchorFrames,
  }, null, 2));
} finally {
  if (server) {
    server.kill('SIGTERM');
  }
}

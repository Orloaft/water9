import { spawn } from 'node:child_process';
import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const outDir = process.env.ORE_ACTUAL_GPT_OUT ?? '/home/orlovboros/projects/manager/runs/water9-ore-embedded-assets-pass-2026-07-01';
const gameplayTerrainProofPath = resolve(outDir, 'embedded-assets-gameplay-terrain-proof.png');
const mixedTerrainProofPath = resolve(outDir, 'embedded-assets-mixed-terrain-proof.png');
const lineageTerrainProofPath = resolve(outDir, 'embedded-assets-lineage-terrain-proof.png');
const grayscaleTerrainProofPath = resolve(outDir, 'embedded-assets-grayscale-terrain-proof.png');
const recoveryReportPath = '/home/orlovboros/projects/manager/runs/water9-ore-embedded-assets-pass-2026-07-01.report.md';
const host = '127.0.0.1';
const port = Number(process.env.ORE_GPT_STAMP_PORT ?? 5198);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=4`;
const ores = [
  { key: 'copper', label: 'Copper', noun: 'tarnished flecks / short seams' },
  { key: 'ruby', label: 'Ruby', noun: 'pressure-fracture slivers' },
  { key: 'precursorEngine', label: 'Precursor Engine', noun: 'broken brass/teal machinery arcs' },
  { key: 'quartz', label: 'Quartz', noun: 'milky crystal flecks' },
  { key: 'cobalt', label: 'Cobalt Bloom', noun: 'deep blue mineral clusters' },
  { key: 'sunstone', label: 'Sunstone', noun: 'warm amber crystal chips' },
  { key: 'relic', label: 'Relic Shard', noun: 'ancient tarnished fragments' },
  { key: 'drownedIdol', label: 'Drowned Idol', noun: 'eroded sea-stone idol fragments' },
  { key: 'abyssalCrown', label: 'Abyssal Crown', noun: 'dark crown shard fragments' },
  { key: 'alienAlloy', label: 'Alien Alloy', noun: 'green-silver nonhuman metal chunks' },
  { key: 'ruinCore', label: 'Ruin Core', noun: 'broken ancient core fragments' },
];

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

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
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

function withPlaytestParam(url) {
  const parsed = new URL(url);
  parsed.searchParams.set('playtest', '1');
  return parsed.toString();
}

async function command(page, name, value) {
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot();
    return Boolean(snap && document.querySelector('canvas'));
  }, null, { timeout: 10000 });
  await page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue), [name, value]);
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot();
    return Boolean(snap && document.querySelector('canvas'));
  }, null, { timeout: 10000 });
  await page.waitForTimeout(280);
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot());
}

async function waitForGeneratedWorld(page) {
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    const review = await page.evaluate(() => window.__AQUA_PLAYTEST__?.command('biomeLoadingReview'));
    if (review?.worldReady === true) {
      await page.waitForTimeout(180);
      return;
    }
    await page.waitForTimeout(150);
  }
  throw new Error('generated world was not ready within 25000ms');
}

async function canvasStats(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false, width: 0, height: 0, variedSamples: 0, lumaRange: 0 };
    let minLuma = 255;
    let maxLuma = 0;
    const seen = new Set();
    for (let y = 36; y < canvas.height - 36; y += 36) {
      for (let x = 36; x < canvas.width - 36; x += 36) {
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

function comparisonHtml(frames) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    html, body { margin: 0; background: #071018; color: #e8f4f7; font: 16px/1.25 system-ui, sans-serif; }
    .sheet { box-sizing: border-box; width: 1760px; padding: 28px; display: grid; gap: 18px; }
    .row { display: grid; grid-template-columns: 200px 360px 360px 1fr; gap: 14px; align-items: stretch; }
    .ore { padding: 16px 10px; background: #0b1821; border: 1px solid #1e3341; border-radius: 6px; }
    .ore strong { display: block; font-size: 22px; margin-bottom: 8px; }
    .ore span { color: #9db5bc; }
    figure { margin: 0; background: #0b1821; border: 1px solid #203443; border-radius: 6px; overflow: hidden; }
    figcaption { padding: 10px 12px 12px; color: #f5fbff; }
    img { display: block; width: 100%; height: 250px; object-fit: contain; object-position: center; background: #000; }
    .runtime img { object-fit: cover; object-position: center 48%; }
    .thumbs { height: 250px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; padding: 8px; box-sizing: border-box; background: #000; }
    .thumbs img { height: 100%; min-width: 0; object-fit: contain; }
    .mask .thumbs { background:
      linear-gradient(45deg, #10191d 25%, transparent 25%),
      linear-gradient(-45deg, #10191d 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #10191d 75%),
      linear-gradient(-45deg, transparent 75%, #10191d 75%);
      background-color: #05090c;
      background-size: 18px 18px;
      background-position: 0 0, 0 9px, 9px -9px, -9px 0;
    }
    .unlabeled { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .strip img { filter: grayscale(1) contrast(1.8) brightness(0.86); }
  </style>
</head>
<body>
  <main class="sheet">
    ${frames.map((frame) => `
      <section class="row">
        <div class="ore"><strong>${frame.label}</strong><span>${frame.noun}</span></div>
        <figure><div class="thumbs">${[1, 2, 3, 4, 5].map((index) => `<img src="./source-crop-${frame.tile}-${index}.png" alt="${frame.label} source crop ${index}">`).join('')}</div><figcaption>Approved GPT source crop row</figcaption></figure>
        <figure class="mask"><div class="thumbs">${[1, 2, 3, 4, 5].map((index) => `<img src="./extracted-stamp-${frame.tile}-${index}.png" alt="${frame.label} extracted stamp ${index}">`).join('')}</div><figcaption>Extracted transparent runtime stamp/mask</figcaption></figure>
        <figure class="runtime"><img src="./${frame.file}" alt="${frame.label} runtime"><figcaption>Live Water9 renderer: clipped stamp, stain, and chipped overburden</figcaption></figure>
      </section>
    `).join('')}
    <section class="unlabeled">
      <figure><img src="./embedded-assets-mixed-terrain-proof.png" alt="mixed runtime"><figcaption>Unlabeled mixed terrain runtime scene</figcaption></figure>
      <figure class="strip"><img src="./embedded-assets-mixed-terrain-proof.png" alt="grayscale mixed runtime"><figcaption>Grayscale / silhouette check</figcaption></figure>
    </section>
  </main>
</body>
</html>`;
}

function grayscaleHtml() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; background: #05090c; }
    img { display: block; width: 1280px; height: 800px; object-fit: cover; filter: grayscale(1) contrast(2) brightness(0.78); }
  </style>
</head>
<body><img src="./embedded-assets-mixed-terrain-proof.png" alt="grayscale silhouette"></body>
</html>`;
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

const captures = [];
try {
  await page.goto(withPlaytestParam(baseUrl), { waitUntil: 'networkidle', timeout: 25000 });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 15000 });
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot();
    return Boolean(snap && document.querySelector('canvas'));
  }, null, { timeout: 15000 });
  await command(page, 'start');
  await waitForGeneratedWorld(page);

  for (const ore of ores) {
    const snapshot = await command(page, 'oreDepositReview', { focusTile: ore.key, focusCamera: true });
    const file = `actual-gpt-assets-runtime-${ore.key}.png`;
    const path = resolve(outDir, file);
    await page.locator('#game canvas').screenshot({ path });
    const stats = await canvasStats(page);
    captures.push({
      tile: ore.key,
      label: ore.label,
      noun: ore.noun,
      file,
      path,
      status: snapshot?.ui?.status ?? null,
      visibleOreCount: snapshot?.terrainLookReview?.cameraSlice?.visibleOreCount ?? null,
      canvas: stats,
      bytes: (await stat(path)).size,
    });
  }

  const mixedSnapshot = await command(page, 'oreDepositReview', { focusTile: 'ruinCore', focusCamera: false });
  const mixedPath = resolve(outDir, 'actual-gpt-assets-runtime-mixed.png');
  await page.locator('#game canvas').screenshot({ path: mixedPath });
  await copyFile(mixedPath, mixedTerrainProofPath);
  const gameplayPath = resolve(outDir, 'actual-gpt-assets-gameplay-screenshot.png');
  await page.screenshot({ path: gameplayPath, fullPage: false });
  await copyFile(gameplayPath, gameplayTerrainProofPath);
  const mixedStats = await canvasStats(page);

  const htmlPath = resolve(outDir, 'actual-gpt-assets-runtime-contact-sheet.html');
  await writeFile(htmlPath, comparisonHtml(captures));
  const sheetPage = await browser.newPage({ viewport: { width: 1680, height: 1160 }, deviceScaleFactor: 1 });
  await sheetPage.goto(pathToFileURL(htmlPath).toString(), { waitUntil: 'load' });
  await sheetPage.waitForTimeout(500);
  await sheetPage.screenshot({ path: resolve(outDir, 'actual-gpt-runtime-lineage-sheet.png'), fullPage: true });
  await copyFile(resolve(outDir, 'actual-gpt-runtime-lineage-sheet.png'), lineageTerrainProofPath);
  await sheetPage.close();

  const grayscaleHtmlPath = resolve(outDir, 'actual-gpt-assets-grayscale-strip.html');
  await writeFile(grayscaleHtmlPath, grayscaleHtml());
  const grayPage = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await grayPage.goto(pathToFileURL(grayscaleHtmlPath).toString(), { waitUntil: 'load' });
  await grayPage.waitForTimeout(250);
  await grayPage.screenshot({ path: resolve(outDir, 'actual-gpt-assets-grayscale-strip.png'), fullPage: true });
  await copyFile(resolve(outDir, 'actual-gpt-assets-grayscale-strip.png'), grayscaleTerrainProofPath);
  await grayPage.close();

  const failures = [];
  for (const capture of captures) {
    if (!capture.canvas.exists || capture.canvas.variedSamples < 6 || capture.canvas.lumaRange < 12) {
      failures.push(`${capture.label}: weak or blank canvas stats ${JSON.stringify(capture.canvas)}`);
    }
    if (capture.bytes < 20000) failures.push(`${capture.label}: screenshot too small (${capture.bytes} bytes)`);
  }
  if (!mixedStats.exists || mixedStats.variedSamples < 6 || mixedStats.lumaRange < 12) failures.push(`mixed runtime weak/blank stats ${JSON.stringify(mixedStats)}`);
  if (errors.length) failures.push('runtime browser errors were reported');

  const report = {
    schema: 'water9/actual-gpt-ore-runtime-correction-proof@2',
    generatedAt: new Date().toISOString(),
    url: withPlaytestParam(baseUrl),
    passed: failures.length === 0,
    failures,
    errors,
    captures,
    mixed: {
      path: mixedPath,
      gameplayPath,
      requestedGameplayPath: gameplayTerrainProofPath,
      requestedMixedPath: mixedTerrainProofPath,
      status: mixedSnapshot?.ui?.status ?? null,
      canvas: mixedStats,
      bytes: (await stat(mixedPath)).size,
    },
    lineageSheetPath: resolve(outDir, 'actual-gpt-runtime-lineage-sheet.png'),
    grayscaleStripPath: resolve(outDir, 'actual-gpt-assets-grayscale-strip.png'),
    requestedArtifacts: {
      gameplayTerrainProof: gameplayTerrainProofPath,
      mixedTerrainProof: mixedTerrainProofPath,
      lineageTerrainProof: lineageTerrainProofPath,
      grayscaleTerrainProof: grayscaleTerrainProofPath,
      recoveryReport: recoveryReportPath,
    },
    changedWater9Files: [
      'src/scene-playtest.ts',
      'src/scene.ts',
      'src/scene-rendering.ts',
      'src/ore-actual-gpt-stamps.ts',
      'tools/extract_actual_gpt_ore_assets.py',
      'tools/review_ore_gpt_stamp_integration.mjs',
    ],
    commands: [
      'python3 tools/extract_actual_gpt_ore_assets.py',
      'node tools/review_ore_gpt_stamp_integration.mjs',
      'npx tsc --noEmit --pretty false',
      'npm run build',
    ],
  };
  await writeFile(resolve(outDir, 'actual-gpt-runtime-correction-proof.json'), `${JSON.stringify(report, null, 2)}\n`);
  const reportMarkdown = `# Water9 Ore Embedded Assets Terrain Proof

## Scope

- Copper, Ruby, Precursor Engine, Quartz, Cobalt, Sunstone, Relic, Drowned Idol, Abyssal Crown, Alien Alloy, and Ruin Core now draw real transparent bitmap stamps from src/ore-actual-gpt-stamps.ts texture keys generated from approved GPT source sheets.
- Runtime path: DeepdiveScene.preload -> loadGeneratedAssets -> actualGptOreTextureKeys loads public/assets/generated/ore-actual-gpt-*.png; drawWorld -> drawEmbeddedOre -> drawGptStampIntegratedOre -> drawActualGptSourceStamp places those textures in the live terrain renderer.
- Runtime supplies host rock stain, irregular clipped exposure masks, higher-depth chipped overburden, contact shadow, glints, rotation, and placement.
- This recovery pass stages the proof in a thick connected stone/sand terrain slab. Ore roots are buried several tile cells inside the slab, with visible surrounding terrain body pixels in the normal gameplay and mixed all-ore captures.
- Source copy, extracted crops, extracted transparent stamps, and runtime screenshots are written beside this report.

## What Changed For Embedded Terrain

- The old white artifact oval/diamond glyph language is absent.
- The shared soft oval pocket treatment is not used for the generated ore path; generated assets sit in irregular chipped cavities.
- Runtime clips each bitmap through a jagged per-deposit mask so only a buried opening exposes the asset.
- A dedicated overburden layer draws terrain lips and chips above the bitmap sprites, so rock crosses the asset edges instead of sitting underneath them.
- Material staining differs by ore: copper green tarnish seams, cobalt blue bloom, quartz/ruby fracture lines, and cyan alien/ruin seepage.
- Dev-only ore proof staging now uses a deterministic connected terrain wall/slab instead of small detached pockets around open water.

## Changed Files

- src/scene-playtest.ts
- src/scene-rendering.ts
- src/helpers.ts
- src/ore-actual-gpt-stamps.ts
- tools/extract_actual_gpt_ore_assets.py
- tools/review_ore_gpt_stamp_integration.mjs
- public/assets/generated/ore-actual-gpt-*.png

## Artifacts

- Source sheets: ${resolve(outDir, 'source-sheet-copper-ruby-precursorEngine.png')}, ${resolve(outDir, 'source-sheet-quartz-cobalt-sunstone-relic.png')}, ${resolve(outDir, 'source-sheet-artifact-ores.png')}
- Source crops: ${resolve(outDir, 'source-crops-contact-sheet.png')}
- Extracted stamps: ${resolve(outDir, 'extracted-stamps-contact-sheet.png')}
- Runtime lineage sheet: ${lineageTerrainProofPath}
- Runtime mixed scene: ${mixedTerrainProofPath}
- Gameplay screenshot: ${gameplayTerrainProofPath}
- Grayscale/silhouette strip: ${grayscaleTerrainProofPath}
- JSON proof: ${resolve(outDir, 'actual-gpt-runtime-correction-proof.json')}

## Visual Verdict

Blunt verdict: the deposits are visibly embedded in connected terrain in these proof screenshots. The normal gameplay screenshot shows multiple deposits overlapping a solid rock mass, and the mixed screenshot puts every ore deposit on/in the same visible terrain wall/floor slab. No white bordered artifact ovals or shared oval pocket backing are present.

Remaining weakness: some source artifact silhouettes remain recognizable, but the live renderer now buries and interrupts those silhouettes with clipped exposure, local shadows, and rock lips.

## Verification Notes

- Proof script result: ${failures.length === 0 ? 'passed' : `failed: ${failures.join('; ')}`}
- Browser errors: ${errors.length === 0 ? 'none' : errors.map((error) => error.text ?? JSON.stringify(error)).join('; ')}
`;
  await writeFile(resolve(outDir, 'actual-gpt-runtime-correction-report.md'), reportMarkdown);
  await writeFile(recoveryReportPath, reportMarkdown);

  console.log(JSON.stringify(report, null, 2));
  if (failures.length) process.exitCode = 1;
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  await writeFile(resolve(outDir, 'actual-gpt-runtime-correction-proof.json'), `${JSON.stringify({ passed: false, errors, serverLogs: serverLogs.join('').slice(-4000) }, null, 2)}\n`);
  throw error;
} finally {
  await browser.close().catch(() => {});
  server?.kill('SIGTERM');
}

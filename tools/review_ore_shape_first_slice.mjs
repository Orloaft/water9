import { spawn } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const outDir = process.env.ORE_SHAPE_FIRST_OUT ?? '/home/orlovboros/projects/manager/runs/water9-ore-graphic-readability-pass-2026-07-01';
const gameplayProofPath = resolve(outDir, 'graphic-readability-gameplay-proof.png');
const grayscaleProofPath = resolve(outDir, 'graphic-readability-grayscale-proof.png');
const lineageSheetPath = resolve(outDir, 'graphic-readability-contact-lineage-sheet.png');
const reportPath = resolve(outDir, 'graphic-readability-report.md');
const host = '127.0.0.1';
const port = Number(process.env.ORE_SHAPE_FIRST_PORT ?? 5204);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=4`;

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

async function command(page, name, value, options = {}) {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command), null, { timeout: 15000 });
  await page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue), [name, value]);
  if (options.waitForWorld !== false) {
    await page.waitForFunction(() => {
      const snap = window.__AQUA_PLAYTEST__?.snapshot();
      return Boolean(snap?.world && snap.world.ready !== false && document.querySelector('canvas'));
    }, null, { timeout: 15000 });
  }
  await page.waitForTimeout(360);
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
    for (let y = 42; y < canvas.height - 42; y += 42) {
      for (let x = 42; x < canvas.width - 42; x += 42) {
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

function grayscaleHtml() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; background: #05090c; }
    img {
      display: block;
      width: 1280px;
      height: 800px;
      object-fit: cover;
      filter: grayscale(1) contrast(1.35) brightness(1.18);
    }
  </style>
</head>
<body><img src="./graphic-readability-gameplay-proof.png" alt=""></body>
</html>`;
}

function lineageHtml() {
  const deposits = [
    { label: 'Copper', note: 'Large embedded mineral seam plates with high-value contact shadow' },
    { label: 'Ruby', note: 'Three deliberate buried slivers, not a sprayed gem cluster' },
    { label: 'Ruin Core', note: 'Buried circular relic fragment with strong ring/spoke silhouette' },
  ];
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    html, body { margin: 0; background: #071018; color: #e6f2f4; font: 16px/1.25 system-ui, sans-serif; }
    main { box-sizing: border-box; width: 1600px; padding: 26px; display: grid; gap: 18px; }
    .proofs { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    figure { margin: 0; background: #0b1821; border: 1px solid #203443; border-radius: 6px; overflow: hidden; }
    img { display: block; width: 100%; height: 560px; object-fit: cover; object-position: center; background: #000; }
    .gray img { filter: grayscale(1) contrast(1.35) brightness(1.18); }
    figcaption { padding: 10px 12px 12px; color: #f5fbff; }
    .notes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .note { background: #0b1821; border: 1px solid #203443; border-radius: 6px; padding: 14px; }
    strong { display: block; font-size: 20px; margin-bottom: 5px; }
    span { color: #a8bdc4; }
  </style>
</head>
<body>
  <main>
    <section class="proofs">
      <figure><img src="./graphic-readability-gameplay-proof.png" alt="normal gameplay proof"><figcaption>Normal gameplay scale</figcaption></figure>
      <figure class="gray"><img src="./graphic-readability-gameplay-proof.png" alt="grayscale proof"><figcaption>Unlabeled grayscale read</figcaption></figure>
    </section>
    <section class="notes">${deposits.map((deposit) => `<div class="note"><strong>${deposit.label}</strong><span>${deposit.note}</span></div>`).join('')}</section>
  </main>
</body>
</html>`;
}

const errors = [];
if (server) await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) errors.push({ type: 'console', text: message.text() });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push({ type: 'response', status: response.status(), url: response.url() });
  });

  await page.goto(withPlaytestParam(baseUrl), { waitUntil: 'load', timeout: 45000 });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command && document.querySelector('#game canvas')), null, { timeout: 20000 });
  await command(page, 'start', undefined, { waitForWorld: false });
  await waitForGeneratedWorld(page);
  const snapshot = await command(page, 'oreDepositReview', { focusTile: 'ruinCore', focusCamera: false, shapeFirstSlice: true });
  await page.locator('#game canvas').screenshot({ path: gameplayProofPath });
  const stats = await canvasStats(page);
  await page.close();

  const grayscaleHtmlPath = resolve(outDir, 'graphic-readability-grayscale-proof.html');
  await writeFile(grayscaleHtmlPath, grayscaleHtml());
  const grayPage = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await grayPage.goto(pathToFileURL(grayscaleHtmlPath).toString(), { waitUntil: 'load' });
  await grayPage.screenshot({ path: grayscaleProofPath, fullPage: true });
  await grayPage.close();

  const lineageHtmlPath = resolve(outDir, 'graphic-readability-contact-lineage-sheet.html');
  await writeFile(lineageHtmlPath, lineageHtml());
  const sheetPage = await browser.newPage({ viewport: { width: 1600, height: 1040 }, deviceScaleFactor: 1 });
  await sheetPage.goto(pathToFileURL(lineageHtmlPath).toString(), { waitUntil: 'load' });
  await sheetPage.screenshot({ path: lineageSheetPath, fullPage: true });
  await sheetPage.close();

  const gameplayBytes = (await stat(gameplayProofPath)).size;
  const grayscaleBytes = (await stat(grayscaleProofPath)).size;
  const visibleOreCount = snapshot?.terrainLookReview?.cameraSlice?.visibleOreCount ?? null;
  const shapeFirstProof = snapshot?.shapeFirstOreProof ?? null;
  const failures = [];
  if (errors.length) failures.push('runtime browser errors were reported');
  if (!stats.exists || stats.variedSamples < 8 || stats.lumaRange < 12) failures.push(`weak or blank canvas stats ${JSON.stringify(stats)}`);
  if ((visibleOreCount ?? 0) < 3 && (shapeFirstProof?.inFrameDeposits ?? 0) < 3) {
    failures.push(`expected at least 3 visible ore tiles/deposits, saw visibleOreCount=${visibleOreCount}, inFrameDeposits=${shapeFirstProof?.inFrameDeposits ?? null}`);
  }
  if (shapeFirstProof?.expectedDeposits !== 3 || shapeFirstProof?.inFrameDeposits !== 3) {
    failures.push(`shape-first proof deposits not all in frame: ${JSON.stringify(shapeFirstProof)}`);
  }
  if (gameplayBytes < 20000) failures.push(`gameplay proof file is unexpectedly small: ${gameplayBytes} bytes`);
  if (grayscaleBytes < 20000) failures.push(`grayscale proof file is unexpectedly small: ${grayscaleBytes} bytes`);

  const status = failures.length === 0 ? 'ACCEPTED' : 'REJECTED';
  await writeFile(reportPath, `# Water9 Ore Graphic Readability Proof Slice - 2026-07-01

Status: ${status.toLowerCase()}

## Scope

Narrow representative proof only: Copper, Ruby, and Ruin Core staged in one normal gameplay wall. This keeps the embedded shape-first direction but pushes fewer, bigger, more graphic silhouettes with calmer local terrain around the deposits.

## Visual Read

${status === 'ACCEPTED'
  ? 'The slice passes the mechanical proof gate: each deposit is staged in frame as a larger deliberate silhouette, with reduced surrounding clutter and visible value contrast in the unlabeled grayscale proof. Human visual judgment still decides whether the deposits read as mineable targets quickly enough at gameplay scale.'
  : 'REJECTED: the slice failed the proof gate. Do not use color polish to hide the shape problem.'}

## Artifacts

- Normal gameplay: \`${gameplayProofPath}\`
- Unlabeled grayscale: \`${grayscaleProofPath}\`
- Contact/lineage sheet: \`${lineageSheetPath}\`

## Checks

- Runtime browser errors: ${errors.length}
- Visible ore tiles in staged camera slice: ${visibleOreCount}
- Proof deposits in frame: ${shapeFirstProof?.inFrameDeposits ?? null} / ${shapeFirstProof?.expectedDeposits ?? null}
- Proof metric: \`${JSON.stringify(shapeFirstProof)}\`
- Canvas stats: \`${JSON.stringify(stats)}\`
- Gameplay proof bytes: ${gameplayBytes}
- Grayscale proof bytes: ${grayscaleBytes}

${failures.length ? `## Failures\n\n${failures.map((failure) => `- ${failure}`).join('\n')}\n` : ''}
## Implementation Notes

- Copper, Ruby, and Ruin Core use the graphic shape-first runtime drawing in \`src/scene-rendering.ts\`.
- \`oreDepositReview\` accepts \`shapeFirstSlice: true\` to stage only the three proof deposits at gameplay scale.
- The prior dirty generated ore assets and broader stamp experiment files were left intact.
`);

  console.log(JSON.stringify({
    status: status.toLowerCase(),
    outDir,
    gameplayProofPath,
    grayscaleProofPath,
    lineageSheetPath,
    reportPath,
    errors,
    failures,
    stats,
    visibleOreCount,
    shapeFirstProof,
  }, null, 2));
} finally {
  await browser.close();
  if (server) server.kill('SIGTERM');
}

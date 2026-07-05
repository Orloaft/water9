import { spawn } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const outDir = process.env.ORE_GAMEPLAY_RECTIFICATION_OUT
  ?? '/home/orlovboros/projects/manager/runs/water9-ore-tier-representation-2026-07-01';
const reportPath = resolve(outDir, 'report-coverage-final.md');
const host = '127.0.0.1';
const port = Number(process.env.ORE_GAMEPLAY_RECTIFICATION_PORT ?? 5207);
const baseUrl = process.env.PLAYTEST_URL ?? `http://${host}:${port}/?playtest=1&biome=4`;
const expectedOreTiers = [
  'copper',
  'quartz',
  'ruby',
  'cobalt',
  'sunstone',
  'relic',
  'alienAlloy',
  'drownedIdol',
  'precursorEngine',
  'abyssalCrown',
  'ruinCore',
];
const proofGroups = [
  { index: 0, label: 'coverage-final-a' },
  { index: 1, label: 'coverage-final-b' },
  { index: 2, label: 'coverage-final-c' },
];

await mkdir(outDir, { recursive: true });

let server = null;
const serverLogs = [];
if (!process.env.PLAYTEST_URL) {
  server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
  server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitForServer(url, timeoutMs = 25000) {
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
      return Boolean(snap?.world && snap.world.ready !== false && document.querySelector('#game canvas'));
    }, null, { timeout: 15000 });
  }
  await page.waitForTimeout(420);
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot());
}

async function oreCoverageCommand(page, value) {
  const snapshot = await command(page, 'oreDepositReview', value);
  await page.waitForFunction((expectedCount) => {
    const proof = window.__AQUA_PLAYTEST__?.snapshot?.()?.shapeFirstOreProof;
    return proof?.active === true && proof.expectedDeposits === expectedCount && proof.items?.length === expectedCount;
  }, value.expectedCount, { timeout: 15000 });
  await page.waitForTimeout(250);
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot());
}

async function waitForGeneratedWorld(page) {
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    const review = await page.evaluate(() => window.__AQUA_PLAYTEST__?.command('biomeLoadingReview'));
    if (review?.worldReady === true) {
      await page.waitForTimeout(220);
      return;
    }
    await page.waitForTimeout(150);
  }
  throw new Error('generated world was not ready within 25000ms');
}

async function waitForSceneGraphics(page) {
  await page.waitForFunction(() => {
    const snapshot = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(
      snapshot?.sceneDepths
      && snapshot.sceneDepths.articulatedBridges !== null
      && snapshot.sceneDepths.actors !== null
      && snapshot.sceneDepths.darkness !== null
      && snapshot.sceneDepths.overlay !== null
    );
  }, null, { timeout: 15000 });
}

async function canvasStats(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#game canvas');
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false, width: 0, height: 0, variedSamples: 0, lumaRange: 0 };
    let minLuma = 255;
    let maxLuma = 0;
    const seen = new Set();
    for (let y = 40; y < canvas.height - 40; y += 40) {
      for (let x = 40; x < canvas.width - 40; x += 40) {
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

async function cleanPrimaryProofUi(page) {
  await page.evaluate(() => {
    const controllerStatus = document.querySelector('#controller-status');
    if (controllerStatus instanceof HTMLElement) {
      controllerStatus.classList.remove('is-open');
      controllerStatus.setAttribute('aria-hidden', 'true');
      controllerStatus.style.display = 'none';
      controllerStatus.innerHTML = '';
    }
    const status = document.querySelector('.status');
    if (status instanceof HTMLElement && /Ore review:/i.test(status.textContent ?? '')) {
      status.textContent = '';
    }
  });
}

function grayscaleHtml(colorFilename) {
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
      filter: grayscale(1);
    }
  </style>
</head>
<body><img src="./${colorFilename}" alt=""></body>
</html>`;
}

const browserErrors = [];
let result = null;
try {
  if (server) await waitForServer(baseUrl);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    page.on('pageerror', (error) => browserErrors.push({ type: 'pageerror', text: error.message }));
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
        browserErrors.push({ type: 'console', text: message.text() });
      }
    });
    page.on('response', (response) => {
      if (response.status() >= 400) browserErrors.push({ type: 'response', status: response.status(), url: response.url() });
    });

    await page.goto(withPlaytestParam(baseUrl), { waitUntil: 'load', timeout: 45000 });
    await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.command && document.querySelector('#game canvas')), null, { timeout: 20000 });
    await command(page, 'start', undefined, { waitForWorld: false });
    await waitForGeneratedWorld(page);
    await waitForSceneGraphics(page);

    const captures = [];
    for (const group of proofGroups) {
      const colorPath = resolve(outDir, `${group.label}-color.png`);
      const grayscalePath = resolve(outDir, `${group.label}-grayscale.png`);
      const grayscaleHtmlPath = resolve(outDir, `${group.label}-grayscale.html`);
      const expectedGroupTiers = expectedOreTiers.slice(group.index * 4, group.index * 4 + 4);
      const snapshot = await oreCoverageCommand(page, {
        focusTile: 'ruinCore',
        focusCamera: false,
        shapeFirstSlice: true,
        shapeFirstGroup: group.index,
        shapeFirstCameraOffsetY: group.cameraOffsetY ?? 0,
        expectedCount: expectedGroupTiers.length,
      });
      await cleanPrimaryProofUi(page);
      await page.locator('#game canvas').screenshot({ path: colorPath });
      const stats = await canvasStats(page);

      await writeFile(grayscaleHtmlPath, grayscaleHtml(`${group.label}-color.png`));
      const grayPage = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
      await grayPage.goto(pathToFileURL(grayscaleHtmlPath).toString(), { waitUntil: 'load' });
      await grayPage.screenshot({ path: grayscalePath, fullPage: true });
      await grayPage.close();

      const proof = snapshot?.shapeFirstOreProof ?? null;
      const representedTiers = [...new Set((proof?.items ?? [])
        .filter((item) => item.inFrame && item.oreTileCells > 0)
        .map((item) => item.tile))];
      captures.push({
        ...group,
        colorPath,
        grayscalePath,
        visibleOreCount: snapshot?.terrainLookReview?.cameraSlice?.visibleOreCount ?? null,
        proof,
        representedTiers,
        expectedOreTiers: expectedGroupTiers,
        canvas: stats,
        colorBytes: (await stat(colorPath)).size,
        grayscaleBytes: (await stat(grayscalePath)).size,
      });
    }
    await page.close();

    const representedTiers = [...new Set(captures.flatMap((capture) => capture.representedTiers))];
    const missingTiers = expectedOreTiers.filter((tile) => !representedTiers.includes(tile));
    const failures = [];
    if (browserErrors.length) failures.push('runtime browser errors were reported');
    for (const capture of captures) {
      if (capture.proof?.active !== true) failures.push(`${capture.label}: shape proof was not active`);
      if (capture.proof?.expectedDeposits !== capture.expectedOreTiers.length) failures.push(`${capture.label}: expected ${capture.expectedOreTiers.length} deposits but proof reported ${capture.proof?.expectedDeposits ?? 'unknown'}`);
      const missingInCapture = capture.expectedOreTiers.filter((tile) => !capture.representedTiers.includes(tile));
      if (missingInCapture.length) failures.push(`${capture.label}: missing expected in-frame tiers: ${missingInCapture.join(', ')}`);
      if (!capture.canvas.exists || capture.canvas.lumaRange < 12) failures.push(`${capture.label}: weak or blank canvas stats ${JSON.stringify(capture.canvas)}`);
      if (capture.colorBytes < 20000) failures.push(`${capture.label}: color screenshot unexpectedly small: ${capture.colorBytes} bytes`);
      if (capture.grayscaleBytes < 20000) failures.push(`${capture.label}: grayscale screenshot unexpectedly small: ${capture.grayscaleBytes} bytes`);
    }
    if (missingTiers.length) {
      failures.push(`missing in-frame ore tier representation: ${missingTiers.join(', ')}`);
    }

    result = {
      status: failures.length ? 'blocked' : 'accepted',
      overallAccepted: failures.length === 0 && missingTiers.length === 0,
      url: withPlaytestParam(baseUrl),
      captures,
      expectedOreTiers,
      representedTiers,
      missingTiers,
      browserErrors,
      failures,
    };
  } finally {
    await browser.close();
  }
} finally {
  if (server) {
    server.kill('SIGTERM');
    await sleep(250);
  }
}

if (!result) throw new Error(`review did not produce a result. Server logs:\n${serverLogs.join('\n')}`);

const tierLines = result.expectedOreTiers.map((tile) => {
  const cells = result.captures.map((capture) => {
    const item = capture.proof?.items?.find((candidate) => candidate.tile === tile);
    const represented = Boolean(item?.inFrame && item?.oreTileCells > 0);
    const detail = represented
      ? `yes, screen (${item.screenX}, ${item.screenY}), ${item.oreTileCells} ore cells`
      : 'no';
    return `${capture.label}: ${detail}`;
  });
  const representedCapture = result.captures.find((capture) =>
    capture.proof?.items?.some((item) => item.tile === tile && item.inFrame && item.oreTileCells > 0)
  );
  return `- ${tile}: ${representedCapture ? `covered by ${representedCapture.label}` : 'not covered'}; ${cells.join(' | ')}`;
}).join('\n');

const artifactLines = result.captures.flatMap((capture) => [
  `- ${capture.label} color gameplay screenshot: \`${capture.colorPath}\``,
  `- ${capture.label} unlabeled grayscale gameplay screenshot: \`${capture.grayscalePath}\``,
]).join('\n');

const captureEvidenceLines = result.captures.map((capture) => `### ${capture.label}

- Expected group tiers: \`${JSON.stringify(capture.expectedOreTiers)}\`
- Visible ore tile count in camera slice: ${capture.visibleOreCount ?? 'unknown'}
- Shape proof: \`${JSON.stringify(capture.proof)}\`
- Represented tiers in this frame: \`${JSON.stringify(capture.representedTiers)}\`
- Canvas stats: \`${JSON.stringify(capture.canvas)}\`
- Color bytes: ${capture.colorBytes}
- Grayscale bytes: ${capture.grayscaleBytes}`).join('\n\n');

await writeFile(reportPath, `# Water9 Ore Tier Representation - 2026-07-01

Status: ${result.status}

Overall accepted: ${result.overallAccepted ? 'true' : 'false'}

These are actual Water9 runtime gameplay captures from the playtest harness, staged with the HUD and normal game camera. The ore proof uses the compact jagged wall-pocket language across the current value-bearing ore taxonomy, split across grouped camera frames so every discovered tier is visible at gameplay scale.

## Primary Artifacts

${artifactLines}

## Discovered Ore Tiers

${tierLines}

## Runtime Evidence

- URL: \`${result.url}\`
- Capture count: ${result.captures.length}
- Represented tiers: \`${JSON.stringify(result.representedTiers)}\`
- Missing tiers: \`${JSON.stringify(result.missingTiers)}\`
- Browser errors: \`${JSON.stringify(result.browserErrors)}\`
- Mechanical failures: \`${JSON.stringify(result.failures)}\`

${captureEvidenceLines}

## Visual Read

Manual adversarial verdict is intentionally left for the manager after inspecting the generated screenshots. Do not treat this mechanical report as acceptance by itself.
`);

console.log(JSON.stringify({ ...result, reportPath }, null, 2));

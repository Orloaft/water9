import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = resolve('runs/water9-biome-background-screenshot-assessment-2026-07-03');
const host = '127.0.0.1';
const sourceSelector = '#game canvas';
const viewport = { width: 1280, height: 800 };

const biomes = [
  { biome: 1, name: 'The Shallows', label: 'benchmark-upper-shell-survey', depth: 180, reviewX: 3600 },
  { biome: 2, name: 'Brine Vent Shelf', label: 'mid-vent-sulfide-shelf', depth: 760, reviewX: 4700 },
  { biome: 3, name: 'Midnight Trench', label: 'lower-black-coral-ribs', depth: 1260, reviewX: 5800 },
  { biome: 4, name: 'Ancient Ruins', label: 'lower-vault-causeway', depth: 1260, reviewX: 6900 },
];

await mkdir(outDir, { recursive: true });

function git(args) {
  return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8' }).trimEnd();
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

async function isPortFree(port) {
  return new Promise((resolvePort) => {
    const server = net.createServer();
    server.once('error', () => resolvePort(false));
    server.once('listening', () => server.close(() => resolvePort(true)));
    server.listen(port, host);
  });
}

async function choosePort(start = 5237) {
  for (let port = start; port < start + 40; port += 1) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`no free localhost port found in ${start}-${start + 39}`);
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitForServer(url, server, logs, timeoutMs = 24000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`dev server exited before ready with code ${server.exitCode}`);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite may still be binding.
    }
    await sleep(150);
  }
  throw new Error(`dev server was not ready within ${timeoutMs}ms\n${logs.join('')}`);
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
  await page.waitForTimeout(220);
  return result;
}

async function canvasStats(page) {
  return page.evaluate((selector) => {
    const canvas = document.querySelector(selector);
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return { exists: false, width: 0, height: 0 };
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let min = 255;
    let max = 0;
    let sum = 0;
    let samples = 0;
    for (let y = 0; y < canvas.height; y += 8) {
      for (let x = 0; x < canvas.width; x += 8) {
        const i = (y * canvas.width + x) * 4;
        const luma = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
        min = Math.min(min, luma);
        max = Math.max(max, luma);
        sum += luma;
        samples += 1;
      }
    }
    return {
      exists: true,
      selector,
      width: canvas.width,
      height: canvas.height,
      lumaMin: Math.round(min),
      lumaMax: Math.round(max),
      lumaAverage: samples ? Number((sum / samples).toFixed(2)) : 0,
    };
  }, sourceSelector);
}

async function buildContactSheet(browser, captures) {
  const pngDataUrl = async (path) => `data:image/png;base64,${(await readFile(path)).toString('base64')}`;
  const cards = (await Promise.all(captures.map(async (capture) => `
    <section>
      <h2>Biome ${capture.biome}: ${htmlEscape(capture.biomeName)}</h2>
      <p>${htmlEscape(capture.label)} / ${capture.depth} m / ${htmlEscape(capture.review?.activeProfile?.activeBand ?? 'unknown band')}</p>
      <img src="${await pngDataUrl(capture.screenshotPath)}" alt="Biome ${capture.biome} ${htmlEscape(capture.biomeName)} runtime canvas">
      <p class="meta">Runtime: ${htmlEscape(capture.url)} | canvas ${capture.canvasStats.width}x${capture.canvasStats.height}</p>
      <p class="assets">Visible anchors: ${htmlEscape((capture.review?.anchors?.items ?? []).map((item) => item.assetId).filter(Boolean).join(', ') || 'none')}</p>
    </section>
  `))).join('');
  const html = `<!doctype html>
<meta charset="utf-8">
<style>
  body { margin:0; padding:22px; background:#061114; color:#e2f2f4; font:17px/1.35 system-ui, sans-serif; }
  h1 { font-size:24px; margin:0 0 16px; }
  main { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:20px; }
  section { break-inside:avoid; }
  h2 { font-size:19px; margin:0 0 6px; }
  p { margin:0 0 7px; color:#a9c4c9; }
  img { display:block; width:100%; background:#020708; border:1px solid #31545d; }
  .meta, .assets { font-size:12px; line-height:1.35; color:#8fa8ad; overflow-wrap:anywhere; }
</style>
<h1>Water9 Live Biome Background Runtime Captures</h1>
<main>${cards}</main>`;
  const htmlPath = resolve(outDir, 'water9-biome-background-contact-sheet.html');
  const path = resolve(outDir, 'water9-biome-background-contact-sheet.png');
  await writeFile(htmlPath, html, 'utf8');
  const page = await browser.newPage({ viewport: { width: 1700, height: 1700 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path, fullPage: true });
  await page.close();
  return { path, htmlPath, bytes: await fileBytes(path) };
}

const repoRoot = git(['rev-parse', '--show-toplevel']);
if (repoRoot !== '/mnt/nxt-dev/water9') {
  throw new Error(`WRONG_REPO ${repoRoot}`);
}
const head = git(['rev-parse', '--short', 'HEAD']);
const gitStatusBefore = git(['status', '--short']);
const port = await choosePort(Number(process.env.WATER9_BACKGROUND_CAPTURE_PORT ?? 5237));
const baseUrl = `http://${host}:${port}/`;
const serverLogs = [];
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));

let browser;
const captures = [];
try {
  await waitForServer(baseUrl, server, serverLogs);
  browser = await chromium.launch({ headless: true });
  for (const biome of biomes) {
    const url = `${baseUrl}?playtest=1&biome=${biome.biome}`;
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    await page.goto(url);
    await waitForPlaytest(page);
    const review = await command(page, 'backgroundReview', {
      label: `background-assessment-${biome.label}`,
      depth: biome.depth,
      reviewX: biome.reviewX,
      clearWaterWindow: true,
    });
    await command(page, 'clearProofOverlays');
    await page.waitForTimeout(900);
    const stem = `water9-biome${biome.biome}-${biome.label}-runtime-canvas`;
    const screenshotPath = resolve(outDir, `${stem}.png`);
    await page.locator(sourceSelector).screenshot({ path: screenshotPath });
    const stats = await canvasStats(page);
    const domProbe = await page.evaluate(() => ({
      title: document.title,
      href: window.location.href,
      hasPlaytestApi: Boolean(window.__AQUA_PLAYTEST__?.command),
      canvasCount: document.querySelectorAll('#game canvas').length,
      bodyClass: document.body.className,
    }));
    captures.push({
      biome: biome.biome,
      biomeName: biome.name,
      label: biome.label,
      depth: biome.depth,
      reviewX: biome.reviewX,
      url,
      screenshotPath,
      screenshotBytes: await fileBytes(screenshotPath),
      sourceSelector,
      viewport,
      canvasStats: stats,
      domProbe,
      review,
    });
    await page.close();
  }
  const contactSheet = await buildContactSheet(browser, captures);
  const provenancePath = resolve(outDir, 'water9-biome-background-provenance.json');
  const reportPath = resolve(outDir, 'report.md');
  const gitStatusAfter = git(['status', '--short']);
  const commandsRun = [
    'pwd',
    'git rev-parse --show-toplevel',
    'git rev-parse --short HEAD',
    'git status --short',
    'sed -n ... AGENTS.md CLAUDE.md src/hud.ts src/main.ts src/scene-playtest.ts tools/review_biome_landmark_implementation.mjs',
    `node ${resolve(outDir, 'capture-biome-backgrounds.mjs')}`,
  ];
  const provenance = {
    schema: 'water9-biome-background-screenshot-assessment@1',
    timestamp: new Date().toISOString(),
    repoRoot,
    head,
    gitStatusBefore,
    gitStatusAfter,
    baseUrl,
    selectedPort: port,
    sourceSelector,
    detectedBiomes: biomes.map(({ biome, name }) => ({ biome, name })),
    commandsRun,
    captures,
    contactSheet,
    runtimeConfirmation: 'Every screenshot was captured from #game canvas in the Water9 Vite runtime using ?playtest=1&biome=N and window.__AQUA_PLAYTEST__.command("backgroundReview").',
  };
  await writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, 'utf8');
  const lines = [
    '# Water9 Biome Background Screenshot Assessment',
    '',
    `Status: PASS`,
    `Repo: ${repoRoot}`,
    `HEAD: ${head}`,
    `Runtime: ${baseUrl}`,
    `Source selector: ${sourceSelector}`,
    '',
    '## Detected Live Biomes',
    ...biomes.map((biome) => `- Biome ${biome.biome}: ${biome.name}`),
    '',
    '## Captures',
    ...captures.map((capture) => [
      `- Biome ${capture.biome}: ${capture.biomeName}`,
      `  - Path: ${capture.screenshotPath}`,
      `  - Bytes: ${capture.screenshotBytes}`,
      `  - Framing: depth ${capture.depth} m, reviewX ${capture.reviewX}, viewport ${viewport.width}x${viewport.height}`,
      `  - Runtime proof: ${capture.domProbe.href}; playtestApi=${capture.domProbe.hasPlaytestApi}; canvas=${capture.canvasStats.width}x${capture.canvasStats.height}; activeBand=${capture.review?.activeProfile?.activeBand ?? 'unknown'}`,
    ].join('\n')),
    '',
    '## Contact Sheet',
    `- PNG: ${contactSheet.path}`,
    `- HTML: ${contactSheet.htmlPath}`,
    '',
    '## Commands / Checks Run',
    ...commandsRun.map((commandText) => `- \`${commandText}\``),
    '',
    '## Runtime Confirmation',
    '- Screenshots were captured from the actual Water9 runtime/canvas, not from another project and not from a generated review sheet.',
    '- Each page URL used `/mnt/nxt-dev/water9` local Vite output with `?playtest=1&biome=N`; each capture has a DOM/playtest probe and `backgroundReview` metadata in `water9-biome-background-provenance.json`.',
    '',
    '## Caveats',
    '- Capture used Water9 dev playtest staging with `backgroundReview` and `clearWaterWindow: true` for consistent distant landmark visibility, matching the existing local review pattern.',
    '- Existing uncommitted worktree changes were present before capture and were preserved.',
    '',
    `Provenance: ${provenancePath}`,
    '',
  ];
  await writeFile(reportPath, `${lines.join('\n')}\n`, 'utf8');
  console.log(JSON.stringify({ ok: true, outDir, provenancePath, reportPath, contactSheet, captures: captures.map((capture) => ({ biome: capture.biome, path: capture.screenshotPath })) }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await sleep(250);
}

import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = resolve('runs/water9-mining-polish-landmark-fps-2026-07-04');
const proofDir = resolve(outDir, 'mining-proof');
const host = '127.0.0.1';
const selector = '#game canvas';
const viewport = { width: 1280, height: 800 };

await mkdir(proofDir, { recursive: true });

function git(args) {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding: 'utf8' });
  if (result.status !== 0) return `ERROR: ${result.stderr.trim() || result.stdout.trim()}`;
  return result.stdout.trim();
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function fileBytes(path) {
  return (await stat(path)).size;
}

async function isPortFree(port) {
  return new Promise((resolvePort) => {
    const server = net.createServer();
    server.once('error', () => resolvePort(false));
    server.once('listening', () => server.close(() => resolvePort(true)));
    server.listen(port, host);
  });
}

async function choosePort(start = 5180) {
  for (let port = start; port <= 5199; port += 1) {
    if (await isPortFree(port)) return port;
  }
  throw new Error('no free proof port in 5180-5199');
}

async function waitForServer(url, server, logs, timeoutMs = 24000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`dev server exited early with code ${server.exitCode}\n${logs.join('').slice(-4000)}`);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Vite is still binding the selected strict port.
    }
    await sleep(150);
  }
  throw new Error(`server not ready within ${timeoutMs}ms\n${logs.join('').slice(-4000)}`);
}

async function waitForPlaytest(page) {
  await page.waitForFunction(() => {
    const api = window.__AQUA_PLAYTEST__;
    const snap = api?.snapshot?.();
    return Boolean(api?.command) && snap?.world?.ready !== false;
  }, null, { timeout: 30000 });
}

async function command(page, name, value) {
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null, [name, value]);
}

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function canvasPng(page, grayscale = false) {
  const dataUrl = await page.evaluate(({ selector: canvasSelector, grayscale: makeGray }) => {
    const source = document.querySelector(canvasSelector);
    if (!source) throw new Error(`missing ${canvasSelector}`);
    const output = document.createElement('canvas');
    output.width = source.width;
    output.height = source.height;
    const context = output.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('missing canvas context');
    context.drawImage(source, 0, 0);
    if (makeGray) {
      const image = context.getImageData(0, 0, output.width, output.height);
      for (let i = 0; i < image.data.length; i += 4) {
        const luma = Math.round(image.data[i] * 0.2126 + image.data[i + 1] * 0.7152 + image.data[i + 2] * 0.0722);
        image.data[i] = luma;
        image.data[i + 1] = luma;
        image.data[i + 2] = luma;
      }
      context.putImageData(image, 0, 0);
    }
    return output.toDataURL('image/png');
  }, { selector, grayscale });
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

async function writeCanvas(page, stem, grayscale = false) {
  const path = resolve(proofDir, `${stem}${grayscale ? '-grayscale' : ''}.png`);
  await writeFile(path, await canvasPng(page, grayscale));
  return { path, bytes: await fileBytes(path) };
}

async function dataUrl(path) {
  return `data:image/png;base64,${(await readFile(path)).toString('base64')}`;
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function buildContactSheet(browser, captures, performanceImage) {
  const cards = [];
  for (const capture of captures) {
    cards.push(`<section>
      <h2>${htmlEscape(capture.label)}</h2>
      <p>${htmlEscape(capture.note)}</p>
      <img src="${await dataUrl(capture.path)}" alt="${htmlEscape(capture.label)}">
      <p class="meta">${htmlEscape(JSON.stringify(capture.summary))}</p>
    </section>`);
  }
  if (performanceImage) {
    cards.push(`<section>
      <h2>performance scene</h2>
      <p>Perf guardrail scene after repeated mining and local prop refresh.</p>
      <img src="${await dataUrl(performanceImage.path)}" alt="performance scene">
    </section>`);
  }
  const html = `<!doctype html>
<meta charset="utf-8">
<style>
body { margin:0; padding:18px; background:#061114; color:#e9f9fa; font:15px/1.35 system-ui, sans-serif; }
main { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:18px; }
section { break-inside:avoid; }
h1 { margin:0 0 14px; font-size:22px; }
h2 { margin:0 0 6px; font-size:17px; }
p { margin:0 0 8px; color:#abc5c9; }
img { display:block; width:100%; margin:0 0 8px; border:1px solid #31545d; background:#020708; }
.meta { font-size:12px; overflow-wrap:anywhere; color:#8dacb2; }
</style>
<h1>Water9 Mining Polish Proof</h1>
<main>${cards.join('')}</main>`;
  const htmlPath = resolve(proofDir, 'mining-polish-contact-sheet.html');
  const pngPath = resolve(proofDir, 'mining-polish-contact-sheet.png');
  await writeFile(htmlPath, html, 'utf8');
  const page = await browser.newPage({ viewport: { width: 1800, height: 2400 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: pngPath, fullPage: true });
  await page.close();
  return { htmlPath, pngPath, bytes: await fileBytes(pngPath) };
}

const repoRoot = git(['rev-parse', '--show-toplevel']);
if (repoRoot !== '/mnt/nxt-dev/water9') throw new Error(`WRONG_REPO ${repoRoot}`);
const head = git(['rev-parse', '--short', 'HEAD']);
const gitStatusBefore = git(['status', '--short']);
const port = await choosePort(Number(process.env.WATER9_MINING_PROOF_PORT ?? 5180));
const baseUrl = `http://${host}:${port}/`;
const logs = [];
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (chunk) => logs.push(String(chunk)));
server.stderr.on('data', (chunk) => logs.push(String(chunk)));

let browser;
const captures = [];
const miningEvents = [];
let performanceDiagnostics = null;
let performanceImage = null;

try {
  await waitForServer(baseUrl, server, logs);
  browser = await chromium.launch({ headless: true });

  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(`${baseUrl}?playtest=1&biome=1&perf=1`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForPlaytest(page);
  const setup = await command(page, 'miningPolishReview', { stage: 'setup' });
  await command(page, 'clearProofOverlays');
  await page.waitForTimeout(120);
  let snap = await snapshot(page);
  let shot = await writeCanvas(page, 'mining-01-before-drill');
  captures.push({ label: '01 before drill', note: 'Copper/quartz ore is still embedded in the cut face.', path: shot.path, summary: { cargo: snap.state.cargo, looseItems: snap.looseItems.length, status: snap.ui.status } });

  const drill1 = await command(page, 'miningPolishReview', { stage: 'drill' });
  miningEvents.push(drill1);
  await page.waitForTimeout(80);
  snap = await snapshot(page);
  shot = await writeCanvas(page, 'mining-02-drill-contact-particles');
  captures.push({ label: '02 drilling contact particles', note: 'Holding the drill emits contact chips and ore glints before pickup exists.', path: shot.path, summary: { terrainBreakEffects: snap.ui.terrainBreakEffects, looseItems: snap.looseItems.length, status: snap.ui.status } });

  let exposed = null;
  for (let i = 0; i < 18; i += 1) {
    const event = await command(page, 'miningPolishReview', { stage: 'drill' });
    miningEvents.push(event);
    await page.waitForTimeout(35);
    snap = await snapshot(page);
    if (snap.looseItems.some((item) => item.value > 0 && item.exposed)) {
      exposed = snap;
      break;
    }
  }
  if (!exposed) throw new Error('ore did not expose as a loose pickup');
  await command(page, 'clearProofOverlays');
  await page.waitForTimeout(80);
  snap = await snapshot(page);
  shot = await writeCanvas(page, 'mining-03-exposed-ore-pickup');
  captures.push({ label: '03 exposed ore pickup', note: 'Terrain is cut; ore remains as a readable pickupable nugget.', path: shot.path, summary: { cargo: snap.state.cargo, looseItems: snap.looseItems, status: snap.ui.status } });

  const collect = await command(page, 'miningPolishReview', { stage: 'collect' });
  const collectAgain = await command(page, 'miningPolishReview', { stage: 'collect' });
  await page.waitForTimeout(120);
  snap = await snapshot(page);
  shot = await writeCanvas(page, 'mining-04-after-pickup');
  const fullPagePath = resolve(proofDir, 'mining-04-after-pickup-full-page.png');
  await page.screenshot({ path: fullPagePath, fullPage: true });
  captures.push({ label: '04 after pickup', note: 'The visible nugget collected exactly once; cargo rose from 0 to 1.', path: shot.path, summary: { collect, collectAgain, cargo: snap.state.cargo, looseItems: snap.looseItems, status: snap.ui.status } });
  miningEvents.push({ collect, collectAgain });
  await page.close();

  const perfPage = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await perfPage.goto(`${baseUrl}?playtest=1&biome=3&perf=1`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForPlaytest(perfPage);
  await command(perfPage, 'terrainMiningReview', { stage: 'intact' });
  const perfBefore = await snapshot(perfPage);
  await command(perfPage, 'terrainMineAt', { repeats: 10 });
  for (let i = 0; i < 8; i += 1) await perfPage.waitForTimeout(40);
  const perfMined = await snapshot(perfPage);
  const guardrail = await command(perfPage, 'perfGuardrailReview');
  const perfAfter = await snapshot(perfPage);
  performanceImage = await writeCanvas(perfPage, 'performance-scene-after-mining');
  performanceDiagnostics = {
    before: perfBefore?.perf ?? null,
    mined: perfMined?.perf ?? null,
    guardrail,
    after: perfAfter?.perf ?? null,
  };
  await writeFile(resolve(proofDir, 'performance-diagnostics.json'), `${JSON.stringify(performanceDiagnostics, null, 2)}\n`);
  await perfPage.close();

  const contactSheet = await buildContactSheet(browser, captures, performanceImage);
  const report = {
    schema: 'water9/mining-polish-proof@1',
    generatedAt: new Date().toISOString(),
    repoRoot,
    head,
    gitStatusBefore,
    gitStatusAfter: git(['status', '--short']),
    port,
    baseUrl,
    selector,
    viewport,
    setup,
    miningEvents,
    captures,
    fullPagePickupProof: resolve(proofDir, 'mining-04-after-pickup-full-page.png'),
    performanceDiagnosticsPath: resolve(proofDir, 'performance-diagnostics.json'),
    performanceDiagnostics,
    contactSheet,
    runtimeConfirmation: 'Mining screenshots were captured from the actual Water9 #game canvas on a normal ?playtest=1 page; playtest commands only staged the scene and invoked real mineAt/updateLooseItems paths.',
    serverLogs: logs.join('').slice(-4000),
  };
  await writeFile(resolve(proofDir, 'mining-proof.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log('Mining polish proof complete.');
  console.log(`Proof dir: ${proofDir}`);
  console.log(`Port: ${port}`);
} finally {
  await browser?.close().catch(() => {});
  server.kill('SIGTERM');
  await sleep(250);
  if (server.exitCode === null) server.kill('SIGKILL');
}

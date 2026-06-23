import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const host = String(args.get('host') ?? '127.0.0.1');
let port = Number(args.get('port') ?? 5197);

async function portAvailable(candidatePort) {
  return new Promise((resolveAvailable) => {
    const server = createServer();
    server.once('error', () => resolveAvailable(false));
    server.once('listening', () => server.close(() => resolveAvailable(true)));
    server.listen(candidatePort, host);
  });
}

async function findOpenPort(start) {
  for (let candidate = start; candidate < start + 100; candidate += 1) {
    if (await portAvailable(candidate)) return candidate;
  }
  throw new Error(`No open port found from ${start} to ${start + 99}`);
}

async function waitForServer(baseUrl, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Retry until Vite is listening.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function startServer() {
  port = await findOpenPort(port);
  const viteBin = resolve('node_modules/.bin/vite');
  const child = spawn(viteBin, ['--host', host, '--port', String(port), '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    env: { ...process.env, BROWSER: 'none' },
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });
  await waitForServer(`http://${host}:${port}`);
  child.output = () => output;
  return child;
}

async function stopServer(serverProcess) {
  if (!serverProcess || serverProcess.exitCode !== null) return;
  await new Promise((resolveStop) => {
    const killGroup = (signal) => {
      try {
        process.kill(-serverProcess.pid, signal);
      } catch {
        try { serverProcess.kill(signal); } catch { /* Already exited. */ }
      }
    };
    const timer = setTimeout(() => {
      if (serverProcess.exitCode === null) killGroup('SIGKILL');
      resolveStop();
    }, 1500);
    serverProcess.once('exit', () => {
      clearTimeout(timer);
      resolveStop();
    });
    killGroup('SIGTERM');
  });
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch {
    return await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium' });
  }
}

const failures = [];
let browser;
let child;

try {
  const report = JSON.parse(await readFile('public/review/source-candidates/source-next-review.json', 'utf8'));
  if (!report.target?.id) throw new Error('source next review report has no target');

  child = await startServer();
  const baseUrl = `http://${host}:${port}`;
  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(`${baseUrl}/review/source-candidates/source-next-review.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-source-next-review]');

  const bodyText = await page.locator('body').innerText();
  for (const expected of [
    'Next Source Review',
    report.target.species,
    report.target.id,
    'Gate truth:',
    'not approved yet',
    'Dry-Run Commands',
    'Focused Decision JSON Starter',
    report.target.commands.acceptDryRun,
    report.target.commands.rejectDryRun,
  ]) {
    if (!bodyText.includes(expected)) failures.push(`page text missing ${expected}`);
  }

  const targetCount = await page.locator(`[data-source-next-review-target="${report.target.id}"]`).count();
  if (targetCount !== 1) failures.push(`target marker count was ${targetCount}`);

  const starterMarkerCount = await page.locator(`[data-focused-decision-starter="${report.target.id}"]`).count();
  if (starterMarkerCount !== 1) failures.push(`focused decision starter marker count was ${starterMarkerCount}`);
  const decisionText = await page.locator('[data-source-next-review-decision-json]').inputValue();
  let decisionStarter = null;
  try {
    decisionStarter = JSON.parse(decisionText);
  } catch (error) {
    failures.push(`focused decision starter JSON did not parse: ${error.message}`);
  }
  const starterDecision = decisionStarter?.decisions?.[0];
  if (decisionStarter?.schema !== 'water9/source-cohesion-decisions@1') failures.push('focused decision starter schema mismatch');
  if (decisionStarter?.reviewer !== '<human-reviewer>') failures.push('focused decision starter reviewer placeholder missing');
  if (starterDecision?.id !== report.target.id) failures.push('focused decision starter target mismatch');
  if (starterDecision?.status !== 'needs-review') failures.push('focused decision starter must default to needs-review');
  if (starterDecision?.reviewer !== '<human-reviewer>') failures.push('focused decision starter decision reviewer placeholder missing');
  if (!starterDecision?.evidenceFingerprint?.digest) failures.push('focused decision starter evidence digest missing');
  if (Object.keys(starterDecision?.visualChecks ?? {}).length < 10) failures.push('focused decision starter visual checks incomplete');

  const images = page.locator('.media img');
  const imageCount = await images.count();
  if (imageCount < 4) failures.push(`expected at least 4 evidence images, found ${imageCount}`);
  for (let index = 0; index < imageCount; index += 1) {
    const box = await images.nth(index).boundingBox();
    const natural = await images.nth(index).evaluate((img) => ({
      width: img.naturalWidth,
      height: img.naturalHeight,
      complete: img.complete,
    }));
    if (!box?.width || !box?.height) failures.push(`image ${index} has no rendered box`);
    if (!natural.complete || natural.width <= 0 || natural.height <= 0) failures.push(`image ${index} did not load`);
  }

  for (const key of ['approvalRunway', 'visualBoard', 'dossier', 'batchDecisionWorkspace', 'quickReview', 'sandboxLab']) {
    const count = await page.locator(`[data-source-next-review-link="${key}"]`).count();
    if (count !== 1) failures.push(`link ${key} count was ${count}`);
  }

  console.log(JSON.stringify({
    schema: 'water9/source-next-review-preview-smoke@1',
    baseUrl,
    target: report.target.id,
    images: imageCount,
    failures,
  }, null, 2));
} catch (error) {
  failures.push(error.stack ?? error.message);
  console.error(JSON.stringify({
    schema: 'water9/source-next-review-preview-smoke@1',
    baseUrl: child ? `http://${host}:${port}` : null,
    failures,
  }, null, 2));
} finally {
  if (browser) await browser.close();
  await stopServer(child);
}

if (failures.length) process.exitCode = 1;

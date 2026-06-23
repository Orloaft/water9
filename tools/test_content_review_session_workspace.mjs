import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { constants as fsConstants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
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
let port = Number(args.get('port') ?? 5199);

async function readSession() {
  return JSON.parse(await readFile('public/review/content-review-session.json', 'utf8'));
}

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
      // Vite is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 180));
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function startServer() {
  port = await findOpenPort(port);
  const child = spawn('node_modules/.bin/vite', ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });
  try {
    await waitForServer(`http://${host}:${port}`);
  } catch (error) {
    child.kill('SIGTERM');
    throw new Error(`${error.message}\nVite output:\n${output}`);
  }
  return child;
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  await new Promise((resolveStop) => {
    const killGroup = (signal) => {
      try {
        process.kill(-child.pid, signal);
      } catch {
        try { child.kill(signal); } catch { /* Already stopped. */ }
      }
    };
    const timer = setTimeout(() => {
      if (child.exitCode === null) killGroup('SIGKILL');
      resolveStop();
    }, 1500);
    child.once('exit', () => {
      clearTimeout(timer);
      resolveStop();
    });
    killGroup('SIGTERM');
  });
}

async function findBrowserExecutable() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await access(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      // Try the next system browser candidate.
    }
  }
  return null;
}

async function launchBrowser() {
  const executablePath = await findBrowserExecutable();
  const options = { headless: true };
  if (executablePath) {
    options.executablePath = executablePath;
    options.args = ['--no-sandbox', '--disable-dev-shm-usage'];
  }
  return chromium.launch(options);
}

const failures = [];
let child = null;
let browser = null;

try {
  const session = await readSession();
  const first = session.items?.[0];
  if (!first) throw new Error('content review session has no items');

  child = await startServer();
  const baseUrl = `http://${host}:${port}`;
  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(`${baseUrl}/review/content-review-session.html`, { waitUntil: 'domcontentloaded' });

  await page.waitForSelector('[data-review-session-workspace]');
  await page.fill('[data-reviewer]', 'Human Reviewer');
  const controls = page.locator(`[data-decision-controls="${first.id}"]`);
  await controls.locator(`[data-source-status="${first.id}"]`).selectOption('approved');
  await controls.locator(`[data-threat-status="${first.id}"]`).selectOption('accepted');
  await controls.locator(`[data-source-note="${first.id}"]`).fill('The source is approved after checking source, key preview, sandbox preview, and plan preview evidence for a cohesive creature.');
  await controls.locator(`[data-threat-note="${first.id}"]`).fill('The threat is accepted after checking source, contact sheet, phase strip, parity overlay, and paired diver sandbox evidence.');

  await controls.locator('[data-source-check][data-check-field="score"]').evaluateAll((nodes) => {
    for (const node of nodes) {
      node.value = '4';
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await controls.locator('[data-source-check][data-check-field="note"]').evaluateAll((nodes) => {
    for (const node of nodes) {
      const check = node.getAttribute('data-source-check');
      node.value = `${check} is supported by direct source, key preview, sandbox preview, and plan preview evidence with readable anatomy.`;
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  const sourceFailed = controls.locator('[data-source-check][data-check-field="failed"]').first();
  await sourceFailed.evaluate((node) => {
    node.checked = true;
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await controls.locator('[data-threat-check][data-check-field="score"]').evaluateAll((nodes) => {
    for (const node of nodes) {
      node.value = '4';
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await controls.locator('[data-threat-check][data-check-field="note"]').evaluateAll((nodes) => {
    for (const node of nodes) {
      const check = node.getAttribute('data-threat-check');
      node.value = `${check} passes against source, contact, phase, parity, motion, and paired diver sandbox evidence.`;
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  const sourceDecisionFile = JSON.parse(await page.inputValue('[data-source-decision-output]'));
  const threatDecisionFile = JSON.parse(await page.inputValue('[data-threat-decision-output]'));
  const sourceReviewedDecisionFile = JSON.parse(await page.inputValue('[data-source-reviewed-decision-output]'));
  const threatReviewedDecisionFile = JSON.parse(await page.inputValue('[data-threat-reviewed-decision-output]'));
  const sourceDecision = sourceDecisionFile.decisions.find((decision) => decision.id === first.id);
  const threatDecision = threatDecisionFile.decisions.find((decision) => decision.id === first.id);
  const sourceReviewedDecision = sourceReviewedDecisionFile.decisions.find((decision) => decision.id === first.id);
  const threatReviewedDecision = threatReviewedDecisionFile.decisions.find((decision) => decision.id === first.id);

  if (sourceDecisionFile.schema !== 'water9/source-cohesion-decisions@1') failures.push(`source decision schema mismatch: ${sourceDecisionFile.schema ?? 'missing'}`);
  if (threatDecisionFile.schema !== 'water9/content-threat-acceptance-decisions@1') failures.push(`threat decision schema mismatch: ${threatDecisionFile.schema ?? 'missing'}`);
  if (sourceReviewedDecisionFile.schema !== 'water9/source-cohesion-decisions@1') failures.push(`reviewed-only source decision schema mismatch: ${sourceReviewedDecisionFile.schema ?? 'missing'}`);
  if (threatReviewedDecisionFile.schema !== 'water9/content-threat-acceptance-decisions@1') failures.push(`reviewed-only threat decision schema mismatch: ${threatReviewedDecisionFile.schema ?? 'missing'}`);
  if (sourceDecisionFile.reviewer !== 'Human Reviewer') failures.push('source decision reviewer did not update');
  if (threatDecisionFile.reviewer !== 'Human Reviewer') failures.push('threat decision reviewer did not update');
  if (sourceReviewedDecisionFile.reviewer !== 'Human Reviewer') failures.push('reviewed-only source decision reviewer did not update');
  if (threatReviewedDecisionFile.reviewer !== 'Human Reviewer') failures.push('reviewed-only threat decision reviewer did not update');
  if (!sourceDecisionFile.reviewedAt || sourceDecisionFile.reviewedAt === '<ISO-8601 timestamp>') failures.push('source decision reviewedAt was not updated');
  if (!threatDecisionFile.reviewedAt || threatDecisionFile.reviewedAt === '<ISO-8601 timestamp>') failures.push('threat decision reviewedAt was not updated');
  if (!sourceDecision) failures.push(`source output missing ${first.id}`);
  if (!threatDecision) failures.push(`threat output missing ${first.id}`);
  if ((sourceReviewedDecisionFile.decisions ?? []).length !== 1) failures.push(`reviewed-only source decision count was ${sourceReviewedDecisionFile.decisions?.length ?? 'missing'}`);
  if ((threatReviewedDecisionFile.decisions ?? []).length !== 1) failures.push(`reviewed-only threat decision count was ${threatReviewedDecisionFile.decisions?.length ?? 'missing'}`);
  if (!sourceReviewedDecision) failures.push(`reviewed-only source output missing ${first.id}`);
  if (!threatReviewedDecision) failures.push(`reviewed-only threat output missing ${first.id}`);
  if (sourceDecision?.status !== 'approved') failures.push(`source decision status was ${sourceDecision?.status ?? 'missing'}`);
  if (threatDecision?.status !== 'accepted') failures.push(`threat decision status was ${threatDecision?.status ?? 'missing'}`);
  if (sourceReviewedDecision?.status !== 'approved') failures.push(`reviewed-only source decision status was ${sourceReviewedDecision?.status ?? 'missing'}`);
  if (threatReviewedDecision?.status !== 'accepted') failures.push(`reviewed-only threat decision status was ${threatReviewedDecision?.status ?? 'missing'}`);
  if (!String(sourceDecision?.overallNote ?? '').includes('cohesive creature')) failures.push('source decision overall note did not update');
  if (!String(threatDecision?.overallNote ?? '').includes('paired diver sandbox evidence')) failures.push('threat decision overall note did not update');
  if (!sourceDecision?.evidenceFingerprint?.digest) failures.push('source evidence fingerprint missing from export');
  if (!threatDecision?.evidenceFingerprint?.digest) failures.push('threat evidence fingerprint missing from export');
  if (!Array.isArray(sourceDecision?.failedChecks) || sourceDecision.failedChecks.length !== 1) failures.push('source failedChecks did not export checked failure');

  for (const check of Object.keys(sourceDecision?.visualChecks ?? {})) {
    const field = sourceDecision.visualChecks[check];
    if (field.score !== 4) failures.push(`source ${check} score was ${field.score}`);
    if (!String(field.note ?? '').includes('direct source')) failures.push(`source ${check} note did not export`);
    if (typeof field.failed !== 'boolean') failures.push(`source ${check} failed flag did not export`);
  }
  for (const check of Object.keys(threatDecision?.visualChecks ?? {})) {
    const field = threatDecision.visualChecks[check];
    if (field.score !== 4) failures.push(`threat ${check} score was ${field.score}`);
    if (!String(field.note ?? '').includes('paired diver sandbox')) failures.push(`threat ${check} note did not export`);
    if (Object.hasOwn(field, 'failed')) failures.push(`threat ${check} should not export failed flag`);
  }

  const sourceDownloadHref = await page.getAttribute('#source-decision-download', 'href');
  const threatDownloadHref = await page.getAttribute('#threat-decision-download', 'href');
  const sourceReviewedDownloadHref = await page.getAttribute('#source-reviewed-decision-download', 'href');
  const threatReviewedDownloadHref = await page.getAttribute('#threat-reviewed-decision-download', 'href');
  if (!String(sourceDownloadHref ?? '').startsWith('blob:')) failures.push('source decision download link did not receive blob URL');
  if (!String(threatDownloadHref ?? '').startsWith('blob:')) failures.push('threat decision download link did not receive blob URL');
  if (!String(sourceReviewedDownloadHref ?? '').startsWith('blob:')) failures.push('reviewed-only source decision download link did not receive blob URL');
  if (!String(threatReviewedDownloadHref ?? '').startsWith('blob:')) failures.push('reviewed-only threat decision download link did not receive blob URL');
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('water9.contentReviewSession.draft') ?? 'null'));
  if (draft?.targets?.[first.id]?.sourceChecks == null) failures.push('draft did not persist source check fields');
  if (draft?.targets?.[first.id]?.threatChecks == null) failures.push('draft did not persist threat check fields');

  console.log(JSON.stringify({
    schema: 'water9/content-review-session-workspace-smoke@1',
    baseUrl,
    target: first.id,
    sourceChecks: Object.keys(sourceDecision?.visualChecks ?? {}).length,
    threatChecks: Object.keys(threatDecision?.visualChecks ?? {}).length,
    reviewedOnlySource: sourceReviewedDecisionFile.decisions?.length ?? 0,
    reviewedOnlyThreat: threatReviewedDecisionFile.decisions?.length ?? 0,
    failures,
  }, null, 2));
} catch (error) {
  failures.push(error.message);
  console.error(JSON.stringify({
    schema: 'water9/content-review-session-workspace-smoke@1',
    failures,
  }, null, 2));
  process.exitCode = 1;
} finally {
  await browser?.close();
  await stop(child);
}

if (failures.length) process.exitCode = 1;

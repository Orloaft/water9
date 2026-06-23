import { spawn } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

async function readQueue() {
  return JSON.parse(await readFile('public/review/source-candidates/quick-reviews/index.json', 'utf8'));
}

function readUrl(child) {
  let buffer = '';
  return new Promise((resolveUrl, rejectUrl) => {
    const timer = setTimeout(() => rejectUrl(new Error('timed out waiting for source review queue URL')), 15000);
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/URL:\s+(http:\/\/127\.0\.0\.1:\d+\/review\/source-candidates\/quick-reviews\/index\.html)/);
      if (!match) return;
      clearTimeout(timer);
      resolveUrl(match[1]);
    });
    child.stderr.on('data', (chunk) => { buffer += chunk.toString(); });
    child.once('error', (error) => {
      clearTimeout(timer);
      rejectUrl(error);
    });
    child.once('exit', (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timer);
        rejectUrl(new Error(`source review queue preview exited early with code ${code}\n${buffer}`));
      }
    });
  });
}

async function stop(child) {
  if (child.exitCode !== null) return;
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

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
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

async function smokeCommandBuilder(url, first, failures) {
  if (!first.href) return;
  let browser = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const candidateUrl = new URL(first.href, url).toString();
    await page.goto(candidateUrl, { waitUntil: 'domcontentloaded' });
    await page.fill('[data-reviewer]', 'Human Reviewer');
    await page.fill('[data-overall-note]', 'The whole source reads as one cohesive reviewed organism with a clear silhouette and production-ready game read.');
    await page.locator('[data-note]').evaluateAll((nodes) => {
      for (const node of nodes) {
        const check = node.getAttribute('data-note');
        node.value = `${check} passes from direct source inspection with visible cohesive anatomy, clean key margins, and readable attack direction.`;
        node.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await page.click('[data-build-command]');
    const command = await page.inputValue('[data-command-output]');
    for (const expected of [
      `--id ${first.id}`,
      '--status approved',
      "--reviewed-by 'Human Reviewer'",
      '--visual-check whole-creature-cohesion',
      '--score whole-creature-cohesion=4',
      '--visual-note',
      '--source-reviewed',
      '--source-visual-board',
    ]) {
      if (!command.includes(expected)) failures.push(`command builder output missing: ${expected}`);
    }
    const warning = await page.textContent('[data-builder-warning]');
    if (!warning?.includes('Command ready')) failures.push(`command builder warning did not report ready: ${warning ?? 'missing'}`);
  } catch (error) {
    failures.push(`command builder browser smoke failed: ${error.message}`);
  } finally {
    await browser?.close();
  }
}

const failures = [];
const child = spawn(process.execPath, [
  'tools/preview_source_review_queue.mjs',
  '--serve',
  '--no-build',
  '--port',
  '5192',
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
});

try {
  const queue = await readQueue();
  const first = queue.reviews?.[0] ?? {};
  const url = await readUrl(child);
  const response = await fetch(url);
  if (!response.ok) failures.push(`served source review queue returned HTTP ${response.status}`);
  const html = await response.text();
  for (const expected of [
    'Water 9 Source Quick Reviews',
    'Human source-approval review index',
    first.id,
    first.species,
    first.href,
    first.links?.source,
    first.links?.keyPreview,
    first.links?.sandboxScreenshot,
    htmlEscape(first.acceptCommand),
    htmlEscape(first.rejectCommand),
  ].filter(Boolean)) {
    if (!html.includes(expected)) failures.push(`served source review queue HTML is missing: ${expected}`);
  }
  if (first.href) {
    const candidateUrl = new URL(first.href, url).toString();
    const candidateResponse = await fetch(candidateUrl);
    if (!candidateResponse.ok) failures.push(`served source quick review returned HTTP ${candidateResponse.status}`);
    const candidateHtml = await candidateResponse.text();
    for (const expected of [
      'Source Quick Review',
      first.id,
      first.species,
      'Human Review Command Builder',
      'data-review-command-builder',
      'data-build-command',
      'data-copy-command',
      'data-command-output',
      'source approval still requires a human to run it',
      '--source-reviewed',
      '--source-visual-board',
    ].filter(Boolean)) {
      if (!candidateHtml.includes(expected)) failures.push(`served source quick review HTML is missing: ${expected}`);
    }
    await smokeCommandBuilder(url, first, failures);
  }
  console.log(JSON.stringify({
    schema: 'water9/source-review-queue-preview-smoke@1',
    url,
    first: first.id ?? null,
    reviews: queue.reviews?.length ?? 0,
    failures,
  }, null, 2));
} catch (error) {
  failures.push(error.message);
  console.error(JSON.stringify({
    schema: 'water9/source-review-queue-preview-smoke@1',
    url: null,
    first: null,
    reviews: 0,
    failures,
  }, null, 2));
  process.exitCode = 1;
} finally {
  await stop(child);
}

if (failures.length) process.exitCode = 1;

import { spawn } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

async function readRunway() {
  return JSON.parse(await readFile('public/review/source-approval-runway.json', 'utf8'));
}

async function readChecklist() {
  return JSON.parse(await readFile('public/review/source-approval-checklist.json', 'utf8'));
}

function readUrl(child) {
  let buffer = '';
  return new Promise((resolveUrl, rejectUrl) => {
    const timer = setTimeout(() => rejectUrl(new Error('timed out waiting for source approval runway URL')), 15000);
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/URL:\s+(http:\/\/127\.0\.0\.1:\d+\/review\/source-approval-runway\.html(?:#[^\s]+)?)/);
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
        rejectUrl(new Error(`source approval runway preview exited early with code ${code}\n${buffer}`));
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

function includesHtml(html, value) {
  return html.includes(value) || html.includes(htmlEscape(value));
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
  let browser = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.selectOption('[data-candidate]', first.id);
    await page.fill('[data-reviewer]', 'Human Reviewer');
    await page.fill('[data-overall-note]', 'The whole source reads as one cohesive reviewed organism with clear silhouette, clean magenta keying, and usable rigging margins.');
    await page.locator('[data-note]').evaluateAll((nodes) => {
      for (const node of nodes) {
        const check = node.getAttribute('data-note');
        node.value = `${check} passes from direct source inspection with cohesive anatomy, readable gameplay danger, clean key edges, and visible attack direction.`;
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
      'whole-creature-cohesion=',
      '--source-reviewed',
      '--source-visual-board public/review/source-visual-board.json',
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
let first = null;
const runway = await readRunway();
const checklist = await readChecklist();
first = runway.recommended ?? runway.items?.find((item) => item.readyForHumanReview && !item.humanApproved) ?? runway.items?.[0] ?? {};
const checklistFirst = checklist.items?.find((item) => item.id === first.id);
if (checklist.schema !== 'water9/source-approval-checklist@1') failures.push(`checklist schema was ${checklist.schema ?? 'missing'}`);
if (!checklistFirst) failures.push(`checklist missing selected candidate ${first.id ?? 'missing'}`);
if (checklistFirst?.state !== 'awaiting-human-source-approval' && checklistFirst?.state !== 'approved') {
  failures.push(`checklist selected state was ${checklistFirst?.state ?? 'missing'}`);
}

const child = spawn(process.execPath, [
  'tools/preview_source_approval_runway.mjs',
  '--serve',
  '--no-build',
  '--port',
  '5196',
  '--id',
  first.id ?? '',
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
});

try {
  const url = await readUrl(child);
  const response = await fetch(url);
  if (!response.ok) failures.push(`served source approval runway returned HTTP ${response.status}`);
  const html = await response.text();
  for (const expected of [
    'Water 9 Source Approval Runway',
    'Human review queue for source images',
    'Automation can prove readiness; it cannot approve the art',
    'Human Approval Command Builder',
    'data-source-approval-command-builder',
    'data-build-command',
    'data-copy-command',
    'data-command-output',
    'source-approval-checklist.json',
    `data-source-approval-candidate="${first.id}"`,
    first.id,
    first.species,
    first.links?.source,
    first.links?.keyPreview,
    first.links?.sandboxScreenshot,
    first.links?.sandboxLab,
    first.links?.sourceSandboxLive,
    first.links?.runtimeSandboxLive,
    first.links?.planPreview,
    checklistFirst?.links?.source,
    checklistFirst?.links?.keyPreview,
    checklistFirst?.links?.sandboxScreenshot,
    checklistFirst?.links?.sandboxLab,
    checklistFirst?.links?.sourceSandboxLive,
    checklistFirst?.links?.runtimeSandboxLive,
    checklistFirst?.links?.planPreview,
    'Live Sandbox Review',
    'sandbox lab',
    'source + diver',
    'runtime + diver',
    `npm run sandbox:preview -- --id source-${first.id} --with diver --serve --open --visual`,
    `npm run sandbox:preview -- --id ${first.id} --with diver --serve --open --visual`,
    'plan preview',
    `npm run source:accept -- --id ${first.id}`,
    '--source-reviewed',
    '--source-visual-board public/review/source-visual-board.json',
    `npm run articulated:prepare-plan -- --id ${first.id}`,
  ].filter(Boolean)) {
    if (!includesHtml(html, expected)) failures.push(`served source approval runway HTML is missing: ${expected}`);
  }
  await smokeCommandBuilder(url, first, failures);
  console.log(JSON.stringify({
    schema: 'water9/source-approval-runway-preview-smoke@1',
    url,
    first: first.id ?? null,
    candidates: runway.items?.length ?? 0,
    failures,
  }, null, 2));
} catch (error) {
  failures.push(error.message);
  console.error(JSON.stringify({
    schema: 'water9/source-approval-runway-preview-smoke@1',
    url: null,
    first: first?.id ?? null,
    candidates: runway.items?.length ?? 0,
    failures,
  }, null, 2));
  process.exitCode = 1;
} finally {
  await stop(child);
}

if (failures.length) process.exitCode = 1;

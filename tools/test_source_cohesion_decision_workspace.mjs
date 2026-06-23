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
let port = Number(args.get('port') ?? 5197);

async function readTemplate() {
  return JSON.parse(await readFile('public/review/source-candidates/source-cohesion-decision-template.json', 'utf8'));
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
  const template = await readTemplate();
  const first = template.decisions?.[0];
  if (!first) throw new Error('source cohesion decision template has no decisions');

  child = await startServer();
  const baseUrl = `http://${host}:${port}`;
  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(`${baseUrl}/review/source-candidates/source-cohesion-decision-template.html`, { waitUntil: 'domcontentloaded' });

  await page.waitForSelector('[data-decision-workspace]');
  await page.fill('#decision-reviewer', 'Human Reviewer');
  const form = page.locator(`[data-decision-form="${first.id}"]`);
  await form.locator('[data-field="status"]').selectOption('approved');
  await form.locator('[data-field="overallNote"]').fill('The reviewed source reads as one cohesive abyssal creature with clean magenta separation, clear game silhouette, and usable neutral rig margins.');
  await form.locator('[data-check-field="score"]').evaluateAll((nodes) => {
    for (const node of nodes) {
      node.value = '4';
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await form.locator('[data-check-field="note"]').evaluateAll((nodes) => {
    for (const node of nodes) {
      const check = node.getAttribute('data-check');
      node.value = `${check} is supported by direct evidence from the source, key preview, sandbox preview, and plan preview with coherent anatomy and readable attack design.`;
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

	  const outputText = await page.inputValue('[data-decision-output]');
	  const generated = JSON.parse(outputText);
	  const generatedFirst = generated.decisions.find((decision) => decision.id === first.id);
	  const reviewedCount = await page.textContent('[data-progress-count="reviewed"]');
	  const approvedCount = await page.textContent('[data-progress-count="approved"]');

	  if (generated.schema !== 'water9/source-cohesion-decisions@1') failures.push(`generated schema mismatch: ${generated.schema ?? 'missing'}`);
  if (generated.reviewer !== 'Human Reviewer') failures.push('generated reviewer did not update');
  if (generated.policy?.humanAuthored !== true) failures.push('generated policy.humanAuthored missing');
  if (!generated.reviewedAt || generated.reviewedAt === '<ISO-8601 timestamp>') failures.push('generated reviewedAt was not updated');
  if (!generatedFirst) failures.push(`generated output missing ${first.id}`);
  if (generatedFirst?.status !== 'approved') failures.push(`generated ${first.id} status was ${generatedFirst?.status ?? 'missing'}`);
  if (!String(generatedFirst?.overallNote ?? '').includes('cohesive abyssal creature')) failures.push('generated overall note did not update');
	  if (generatedFirst?.evidenceFingerprint?.digest !== first.evidenceFingerprint?.digest) failures.push('generated evidence fingerprint digest did not match template');
	  if (reviewedCount !== '1') failures.push(`reviewed progress count was ${reviewedCount ?? 'missing'}`);
	  if (approvedCount !== '1') failures.push(`approved progress count was ${approvedCount ?? 'missing'}`);
	  for (const check of template.requiredCohesionChecks ?? []) {
    const field = generatedFirst?.visualChecks?.[check];
    if (!field) failures.push(`generated ${first.id} missing check ${check}`);
    if (field && field.score !== 4) failures.push(`generated ${first.id} ${check} score was ${field.score}`);
    if (field && !String(field.note ?? '').includes('direct evidence')) failures.push(`generated ${first.id} ${check} note did not update`);
  }
	  const downloadHref = await page.getAttribute('#decision-download', 'href');
	  if (!String(downloadHref ?? '').startsWith('blob:')) failures.push('decision download link did not receive blob URL');
	  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('water9.sourceCohesionDecisionWorkspace.v1') ?? 'null'));
	  if (draft?.decisions?.[first.id]?.status !== 'approved') failures.push('workspace draft did not persist approved status');
	  await page.selectOption('[data-review-filter]', 'approved');
	  const visibleForms = await page.locator('[data-decision-form]:not([hidden])').count();
	  if (visibleForms !== 1) failures.push(`approved filter showed ${visibleForms} forms`);

	  console.log(JSON.stringify({
    schema: 'water9/source-cohesion-decision-workspace-smoke@1',
    baseUrl,
    candidate: first.id,
    decisions: generated.decisions?.length ?? 0,
    failures,
  }, null, 2));
} catch (error) {
  failures.push(error.message);
  console.error(JSON.stringify({
    schema: 'water9/source-cohesion-decision-workspace-smoke@1',
    failures,
  }, null, 2));
  process.exitCode = 1;
} finally {
  await browser?.close();
  await stop(child);
}

if (failures.length) process.exitCode = 1;

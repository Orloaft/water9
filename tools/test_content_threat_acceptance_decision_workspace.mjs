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
let port = Number(args.get('port') ?? 5198);

async function readTemplate() {
  return JSON.parse(await readFile('public/review/content-threat-acceptance-decision-template.json', 'utf8'));
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
  if (!first) throw new Error('threat acceptance decision template has no decisions');

  child = await startServer();
  const baseUrl = `http://${host}:${port}`;
  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(`${baseUrl}/review/content-threat-acceptance-decision-template.html`, { waitUntil: 'domcontentloaded' });

  await page.waitForSelector('[data-threat-decision-workspace]');
  await page.fill('#threat-decision-reviewer', 'Human Reviewer');
  const form = page.locator(`[data-threat-decision-form="${first.id}"]`);
  await form.locator('[data-field="status"]').selectOption('accepted');
  await form.locator('[data-field="sourceCandidateId"]').fill(first.sourceCandidateId ?? 'brine-crown');
  await form.locator('[data-field="overallNote"]').fill('The threat is accepted after source, contact, phase, parity, motion, and paired sandbox evidence all hold together.');
  await form.locator('[data-check-field="score"]').evaluateAll((nodes) => {
    for (const node of nodes) {
      node.value = '4';
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await form.locator('[data-check-field="note"]').evaluateAll((nodes) => {
    for (const node of nodes) {
      const check = node.getAttribute('data-check');
      node.value = `${check} passes against direct source, rig, motion, and paired diver sandbox evidence with production-readable behavior.`;
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  const generated = JSON.parse(await page.inputValue('[data-threat-decision-output]'));
  const generatedFirst = generated.decisions.find((decision) => decision.id === first.id);
  if (generated.schema !== 'water9/content-threat-acceptance-decisions@1') failures.push(`generated schema mismatch: ${generated.schema ?? 'missing'}`);
  if (generated.reviewer !== 'Human Reviewer') failures.push('generated reviewer did not update');
  if (generated.policy?.humanAuthored !== true) failures.push('generated policy.humanAuthored missing');
  if (!generated.reviewedAt || generated.reviewedAt === '<ISO-8601 timestamp>') failures.push('generated reviewedAt was not updated');
  if (!generatedFirst) failures.push(`generated output missing ${first.id}`);
  if (generatedFirst?.status !== 'accepted') failures.push(`generated ${first.id} status was ${generatedFirst?.status ?? 'missing'}`);
  if (!String(generatedFirst?.overallNote ?? '').includes('paired sandbox evidence')) failures.push('generated overall note did not update');
  if (!String(generatedFirst?.sourceCandidateId ?? '').trim()) failures.push('generated source candidate did not update');
  for (const check of template.requiredChecks ?? []) {
    const field = generatedFirst?.visualChecks?.[check];
    if (!field) failures.push(`generated ${first.id} missing check ${check}`);
    if (field && field.score !== 4) failures.push(`generated ${first.id} ${check} score was ${field.score}`);
    if (field && !String(field.note ?? '').includes('direct source')) failures.push(`generated ${first.id} ${check} note did not update`);
  }
  const downloadHref = await page.getAttribute('#threat-decision-download', 'href');
  if (!String(downloadHref ?? '').startsWith('blob:')) failures.push('threat decision download link did not receive blob URL');

  console.log(JSON.stringify({
    schema: 'water9/content-threat-acceptance-decision-workspace-smoke@1',
    baseUrl,
    rig: first.id,
    decisions: generated.decisions?.length ?? 0,
    failures,
  }, null, 2));
} catch (error) {
  failures.push(error.message);
  console.error(JSON.stringify({
    schema: 'water9/content-threat-acceptance-decision-workspace-smoke@1',
    failures,
  }, null, 2));
  process.exitCode = 1;
} finally {
  await browser?.close();
  await stop(child);
}

if (failures.length) process.exitCode = 1;

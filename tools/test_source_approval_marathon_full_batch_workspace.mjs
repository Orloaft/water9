import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { constants as fsConstants } from 'node:fs';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
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
let port = Number(args.get('port') ?? 5202);
const paths = {
  exportedDecisions: resolve('tools/scratch/source-approval-marathon-full-batch-reviewed-decisions.json'),
  strictReport: resolve('tools/scratch/source-approval-marathon-full-batch-strict-report.json'),
  applyGuardReport: resolve('tools/scratch/source-approval-marathon-full-batch-apply-guard-report.json'),
};

async function readMarathon() {
  return JSON.parse(await readFile('public/review/source-candidates/source-approval-marathon.json', 'utf8'));
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
  const marathon = await readMarathon();
  const items = marathon.items ?? [];
  if (items.length !== 20) throw new Error(`full-batch smoke expects 20 source approval candidates, got ${items.length}`);

  child = await startServer();
  const baseUrl = `http://${host}:${port}`;
  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  await page.goto(`${baseUrl}/review/source-candidates/source-approval-marathon.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-source-approval-marathon]');
  await page.fill('[data-reviewer-name]', 'Full Batch Human Reviewer');

  await page.evaluate((batchItems) => {
    const setValue = (selector, value) => {
      const node = document.querySelector(selector);
      if (!node) throw new Error(`Missing full-batch form control ${selector}`);
      node.value = value;
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
    };
    for (const item of batchItems) {
      setValue(`[data-source-decision-status="${item.id}"]`, 'approved');
      setValue(
        `[data-source-overall-note="${item.id}"]`,
        `Full-batch human reviewer approves ${item.id} after checking source art, magenta key preview, source sandbox, plan preview, contact sheet, phase strip, and sandbox runtime states.`,
      );
      for (const check of Object.keys(item.decisionStarter?.decisions?.[0]?.visualChecks ?? {})) {
        setValue(`[data-source-check-score="${item.id}"][data-check="${CSS.escape(check)}"]`, '4');
        setValue(
          `[data-source-check-note="${item.id}"][data-check="${CSS.escape(check)}"]`,
          `${item.id} ${check} passes: source art, magenta key, source sandbox, plan preview, contact sheet, phase strip, and sandbox runtime evidence support this ${check} review.`,
        );
      }
    }
  }, items);

  await page.click('[data-build-reviewed-decisions]');
  const output = JSON.parse(await page.inputValue('[data-reviewed-decision-output]'));
  const warnings = await page.textContent('[data-reviewed-decision-warnings]');

  if (output.schema !== 'water9/source-cohesion-decisions@1') failures.push(`export schema mismatch: ${output.schema ?? 'missing'}`);
  if (output.reviewer !== 'Full Batch Human Reviewer') failures.push('full-batch export reviewer did not update');
  if ((output.decisions ?? []).length !== items.length) failures.push(`full-batch export decision count was ${output.decisions?.length ?? 'missing'}`);
  if ((output.browserExportWarnings ?? []).length !== 0) failures.push(`full-batch export warnings were not empty: ${output.browserExportWarnings.join('; ')}`);
  if (String(warnings ?? '').trim() !== 'No reviewed decision warnings.') failures.push(`full-batch warning panel did not clear: ${warnings}`);

  const exportedById = new Map((output.decisions ?? []).map((decision) => [decision.id, decision]));
  for (const item of items) {
    const decision = exportedById.get(item.id);
    if (!decision) {
      failures.push(`${item.id}: missing from full-batch export`);
      continue;
    }
    if (decision.status !== 'approved') failures.push(`${item.id}: full-batch status was ${decision.status ?? 'missing'}`);
    if (decision.evidenceFingerprint?.digest !== item.evidenceFingerprintDigest) failures.push(`${item.id}: full-batch evidence fingerprint mismatch`);
    for (const [check, field] of Object.entries(decision.visualChecks ?? {})) {
      if (field.score !== 4) failures.push(`${item.id}: ${check} score was ${field.score}`);
      if (!String(field.note ?? '').includes(item.id) || !String(field.note ?? '').includes(check)) failures.push(`${item.id}: ${check} note missing target/check evidence`);
    }
  }

  output.policy = {
    ...output.policy,
    dryRunOnly: true,
    smokeTestArtifact: true,
  };
  await mkdir(dirname(paths.exportedDecisions), { recursive: true });
  await writeFile(paths.exportedDecisions, `${JSON.stringify(output, null, 2)}\n`);
  const strictApply = spawnSync(process.execPath, [
    'tools/apply_source_cohesion_decisions.mjs',
    '--decisions', paths.exportedDecisions,
    '--report', paths.strictReport,
    '--strict',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
  let strictReport = null;
  try {
    strictReport = JSON.parse(await readFile(paths.strictReport, 'utf8'));
  } catch {
    failures.push('full-batch strict apply report could not be read');
  }
  if (strictApply.status !== 0) failures.push(`full-batch strict apply dry-run exited ${strictApply.status}: ${strictApply.stderr || strictApply.stdout}`);
  if (strictReport?.schema !== 'water9/source-cohesion-decision-run@1') failures.push(`full-batch strict report schema was ${strictReport?.schema ?? 'missing'}`);
  if (strictReport?.strict !== true) failures.push('full-batch strict report strict flag was not true');
  if (strictReport?.applied !== false) failures.push('full-batch strict report must be dry-run');
  if ((strictReport?.decisions ?? -1) !== items.length) failures.push(`full-batch strict decision count was ${strictReport?.decisions ?? 'missing'}`);
  if ((strictReport?.approved ?? -1) !== items.length) failures.push(`full-batch strict approved count was ${strictReport?.approved ?? 'missing'}`);
  if ((strictReport?.rejected ?? -1) !== 0) failures.push(`full-batch strict rejected count was ${strictReport?.rejected ?? 'missing'}`);
  if ((strictReport?.pending ?? -1) !== 0) failures.push(`full-batch strict pending count was ${strictReport?.pending ?? 'missing'}`);
  if ((strictReport?.failures ?? []).length) failures.push(...strictReport.failures.map((failure) => `full-batch strict apply failure: ${failure}`));
  for (const result of strictReport?.results ?? []) {
    if (!String(result.command ?? '').includes('--dry-run')) failures.push(`${result.id}: full-batch strict result must be dry-run`);
    if (!String(result.command ?? '').includes('--source-reviewed')) failures.push(`${result.id}: full-batch strict result missing --source-reviewed`);
    if (!String(result.command ?? '').includes('--source-visual-board public/review/source-visual-board.json')) failures.push(`${result.id}: full-batch strict result missing source visual board evidence`);
  }

  const applyGuard = spawnSync(process.execPath, [
    'tools/apply_source_cohesion_decisions.mjs',
    '--decisions', paths.exportedDecisions,
    '--report', paths.applyGuardReport,
    '--strict',
    '--apply',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
  let applyGuardReport = null;
  try {
    applyGuardReport = JSON.parse(await readFile(paths.applyGuardReport, 'utf8'));
  } catch {
    failures.push('full-batch apply guard report could not be read');
  }
  if (applyGuard.status === 0) failures.push('full-batch dryRunOnly apply guard unexpectedly exited 0');
  if (!String((applyGuardReport?.failures ?? []).join('\n')).includes('decision file policy.dryRunOnly forbids --apply')) {
    failures.push('full-batch dryRunOnly apply guard did not report policy.dryRunOnly forbids --apply');
  }
  if (applyGuardReport?.applyRequested !== true) failures.push('full-batch dryRunOnly apply guard did not record applyRequested true');
  if (applyGuardReport?.applied !== false) failures.push('full-batch dryRunOnly apply guard report should not be applied');
  if ((applyGuardReport?.results ?? []).some((result) => result.applied === true)) failures.push('full-batch dryRunOnly apply guard allowed an applied result');

  console.log(JSON.stringify({
    schema: 'water9/source-approval-marathon-full-batch-workspace-smoke@1',
    baseUrl,
    candidates: items.length,
    exportedDecisions: output.decisions?.length ?? 0,
    strictApproved: strictReport?.approved ?? null,
    applyGuardBlocked: applyGuard.status !== 0,
    applied: strictReport?.applied ?? null,
    failures,
  }, null, 2));
} catch (error) {
  failures.push(error.message);
  console.error(JSON.stringify({
    schema: 'water9/source-approval-marathon-full-batch-workspace-smoke@1',
    failures,
  }, null, 2));
  process.exitCode = 1;
} finally {
  await browser?.close();
  await stop(child);
}

if (failures.length) process.exitCode = 1;

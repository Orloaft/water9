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
let port = Number(args.get('port') ?? 5201);
const paths = {
  exportedDecisions: resolve('tools/scratch/source-approval-marathon-workspace-reviewed-decisions.json'),
  strictReport: resolve('tools/scratch/source-approval-marathon-workspace-strict-report.json'),
  applyGuardReport: resolve('tools/scratch/source-approval-marathon-workspace-apply-guard-report.json'),
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
  const first = marathon.items?.[0];
  const second = marathon.items?.[1];
  const third = marathon.items?.[2];
  if (!first || !second || !third) throw new Error('source approval marathon needs at least three items for reviewed-only export smoke');

  child = await startServer();
  const baseUrl = `http://${host}:${port}`;
  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(`${baseUrl}/review/source-candidates/source-approval-marathon.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-source-approval-marathon]');
  await page.fill('[data-reviewer-name]', 'Human Reviewer');

  await page.locator(`[data-approval-marathon-item="${first.id}"] details`).nth(1).locator('summary').click();
  await page.selectOption(`[data-source-decision-status="${first.id}"]`, 'approved');
  await page.click('[data-build-reviewed-decisions]');
  const incompleteWarnings = await page.textContent('[data-reviewed-decision-warnings]');
  const incompleteOutput = JSON.parse(await page.inputValue('[data-reviewed-decision-output]'));
  if (!String(incompleteWarnings ?? '').includes(`${first.id}: reviewed decision is missing an overall note`)) failures.push('incomplete structured approval did not show missing overall note warning');
  if (!String(incompleteWarnings ?? '').includes('approved whole-creature-cohesion score must be 4-5')) failures.push('incomplete structured approval did not show missing score warning');
  if ((incompleteOutput.browserExportWarnings ?? []).length === 0) failures.push('incomplete structured approval did not export browser warnings');
  await page.fill(
    `[data-source-overall-note="${first.id}"]`,
    'Human reviewer approves this source after inspecting source art, magenta key preview, source sandbox preview, articulation plan preview, risk flags, contact sheet, phase strip, and sandbox runtime states.',
  );
  for (const check of Object.keys(first.decisionStarter?.decisions?.[0]?.visualChecks ?? {})) {
    await page.fill(`[data-source-check-score="${first.id}"][data-check="${check}"]`, '4');
    await page.fill(
      `[data-source-check-note="${first.id}"][data-check="${check}"]`,
      `${check} passes with direct source art, magenta key, source sandbox, plan preview, contact sheet, phase strip, and sandbox runtime evidence for ${first.id}.`,
    );
  }
  await page.click(`[data-sync-source-decision="${first.id}"]`);
  const syncedStarter = JSON.parse(await page.inputValue(`[data-source-decision-starter="${first.id}"]`));
  if (syncedStarter.decisions?.[0]?.status !== 'approved') failures.push('structured decision sync did not update starter status');
  if (syncedStarter.decisions?.[0]?.reviewer !== 'Human Reviewer') failures.push('structured decision sync did not stamp decision reviewer');

  await page.locator(`[data-approval-marathon-item="${second.id}"] details`).nth(1).locator('summary').click();
  await page.selectOption(`[data-source-decision-status="${second.id}"]`, 'rejected');
  await page.fill(
    `[data-source-overall-note="${second.id}"]`,
    'Human reviewer rejects this source after inspecting source art, magenta key preview, source sandbox preview, articulation plan preview, contact sheet, phase strip, and sandbox runtime states.',
  );
  await page.check(`[data-source-check-failed="${second.id}"][data-check="whole-creature-cohesion"]`);
  await page.fill(
    `[data-source-check-note="${second.id}"][data-check="whole-creature-cohesion"]`,
    `The whole source organism for ${second.id} does not read as a single creature; the cohesion breaks across the source art, magenta key preview, source sandbox, plan preview, contact sheet, phase strip, and sandbox runtime states.`,
  );
  await page.click(`[data-sync-source-decision="${second.id}"]`);
  const rejectedStarter = JSON.parse(await page.inputValue(`[data-source-decision-starter="${second.id}"]`));
  if (rejectedStarter.decisions?.[0]?.status !== 'rejected') failures.push('structured rejection sync did not update starter status');
  if (!rejectedStarter.decisions?.[0]?.failedChecks?.includes('whole-creature-cohesion')) failures.push('structured rejection sync did not preserve failed check');

  await page.click('[data-build-reviewed-decisions]');
  const output = JSON.parse(await page.inputValue('[data-reviewed-decision-output]'));
  const exportedApproved = output.decisions?.find((decision) => decision.id === first.id);
  const exportedRejected = output.decisions?.find((decision) => decision.id === second.id);

  if (output.schema !== 'water9/source-cohesion-decisions@1') failures.push(`export schema mismatch: ${output.schema ?? 'missing'}`);
  if (output.reviewer !== 'Human Reviewer') failures.push('export reviewer did not update');
  if (!output.reviewedAt || output.reviewedAt === '<ISO-8601 timestamp>') failures.push('export reviewedAt was not updated');
  if ((output.decisions ?? []).length !== 2) failures.push(`reviewed-only export decision count was ${output.decisions?.length ?? 'missing'}`);
  if ((output.decisions ?? []).some((decision) => decision.id === third.id)) failures.push('reviewed-only export included an untouched needs-review starter');
  if (exportedApproved?.status !== 'approved') failures.push(`exported approved decision status was ${exportedApproved?.status ?? 'missing'}`);
  if (!exportedApproved?.evidenceFingerprint?.digest || exportedApproved.evidenceFingerprint.digest !== first.evidenceFingerprintDigest) failures.push('exported approved evidence fingerprint digest mismatch');
  if (!String(exportedApproved?.overallNote ?? '').includes('Human reviewer approves')) failures.push('exported approved overall note did not persist');
  for (const [check, field] of Object.entries(exportedApproved?.visualChecks ?? {})) {
    if (field.score !== 4) failures.push(`${check} score was ${field.score}`);
    if (!String(field.note ?? '').includes(first.id)) failures.push(`${check} note did not persist target-specific evidence`);
  }
  if (exportedRejected?.status !== 'rejected') failures.push(`exported rejected decision status was ${exportedRejected?.status ?? 'missing'}`);
  if (!exportedRejected?.evidenceFingerprint?.digest || exportedRejected.evidenceFingerprint.digest !== second.evidenceFingerprintDigest) failures.push('exported rejected evidence fingerprint digest mismatch');
  if (!exportedRejected?.failedChecks?.includes('whole-creature-cohesion')) failures.push('exported rejected decision missing failed check');
  if (!String(exportedRejected?.visualChecks?.['whole-creature-cohesion']?.note ?? '').includes(second.id)) failures.push('exported rejected failed-check note did not persist');
  if ((output.browserExportWarnings ?? []).length !== 0) failures.push(`unexpected browser export warnings: ${output.browserExportWarnings.join('; ')}`);
  const finalWarnings = await page.textContent('[data-reviewed-decision-warnings]');
  if (String(finalWarnings ?? '').trim() !== 'No reviewed decision warnings.') failures.push(`final reviewed decision warnings did not clear: ${finalWarnings}`);
  const downloadHref = await page.getAttribute('#reviewed-decision-download', 'href');
  if (!String(downloadHref ?? '').startsWith('blob:')) failures.push('reviewed decision download link did not receive blob URL');

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
    failures.push('strict apply report could not be read');
  }
  if (strictApply.status !== 0) failures.push(`strict apply dry-run exited ${strictApply.status}: ${strictApply.stderr || strictApply.stdout}`);
  if (strictReport?.schema !== 'water9/source-cohesion-decision-run@1') failures.push(`strict apply report schema was ${strictReport?.schema ?? 'missing'}`);
  if (strictReport?.strict !== true) failures.push('strict apply report strict flag was not true');
  if (strictReport?.applied !== false) failures.push('strict apply dry-run report must not be applied');
  if ((strictReport?.decisions ?? -1) !== 2) failures.push(`strict apply decision count was ${strictReport?.decisions ?? 'missing'}`);
  if ((strictReport?.approved ?? -1) !== 1) failures.push(`strict apply approved count was ${strictReport?.approved ?? 'missing'}`);
  if ((strictReport?.rejected ?? -1) !== 1) failures.push(`strict apply rejected count was ${strictReport?.rejected ?? 'missing'}`);
  if ((strictReport?.pending ?? -1) !== 0) failures.push(`strict apply pending count was ${strictReport?.pending ?? 'missing'}`);
  if ((strictReport?.failures ?? []).length) failures.push(...strictReport.failures.map((failure) => `strict apply failure: ${failure}`));
  const strictApprovedResult = strictReport?.results?.find((result) => result.id === first.id);
  const strictRejectedResult = strictReport?.results?.find((result) => result.id === second.id);
  if (!String(strictApprovedResult?.command ?? '').includes('tools/accept_source_candidate.mjs')) failures.push('strict apply approved result missing accept source command');
  if (!String(strictApprovedResult?.command ?? '').includes('--dry-run')) failures.push('strict apply approved result must be dry-run');
  if (!String(strictApprovedResult?.command ?? '').includes('--source-reviewed')) failures.push('strict apply approved result missing --source-reviewed');
  if (!String(strictApprovedResult?.command ?? '').includes('--source-visual-board public/review/source-visual-board.json')) failures.push('strict apply approved result missing source visual board evidence');
  if (!String(strictRejectedResult?.command ?? '').includes('--source-rejected')) failures.push('strict apply rejected result missing --source-rejected');
  if (!String(strictRejectedResult?.command ?? '').includes('--failed-check whole-creature-cohesion')) failures.push('strict apply rejected result missing failed check');
  if (!String(strictRejectedResult?.command ?? '').includes('--dry-run')) failures.push('strict apply rejected result must be dry-run');

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
    failures.push('workspace dryRunOnly apply guard report could not be read');
  }
  if (applyGuard.status === 0) failures.push('workspace dryRunOnly apply guard unexpectedly exited 0');
  if (!String((applyGuardReport?.failures ?? []).join('\n')).includes('decision file policy.dryRunOnly forbids --apply')) {
    failures.push('workspace dryRunOnly apply guard did not report policy.dryRunOnly forbids --apply');
  }
  if (applyGuardReport?.applyRequested !== true) failures.push('workspace dryRunOnly apply guard did not record applyRequested true');
  if (applyGuardReport?.applied !== false) failures.push('workspace dryRunOnly apply guard report should not be applied');
  if ((applyGuardReport?.results ?? []).some((result) => result.applied === true)) failures.push('workspace dryRunOnly apply guard allowed an applied result');

  console.log(JSON.stringify({
    schema: 'water9/source-approval-marathon-workspace-smoke@1',
    baseUrl,
    approvedTarget: first.id,
    rejectedTarget: second.id,
    exportedDecisions: output.decisions?.length ?? 0,
    strictApproved: strictReport?.approved ?? null,
    strictRejected: strictReport?.rejected ?? null,
    applyGuardBlocked: applyGuard.status !== 0,
    visualChecks: Object.keys(exportedApproved?.visualChecks ?? {}).length,
    failures,
  }, null, 2));
} catch (error) {
  failures.push(error.message);
  console.error(JSON.stringify({
    schema: 'water9/source-approval-marathon-workspace-smoke@1',
    failures,
  }, null, 2));
  process.exitCode = 1;
} finally {
  await browser?.close();
  await stop(child);
}

if (failures.length) process.exitCode = 1;

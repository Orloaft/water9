import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { constants as fsConstants, readFileSync } from 'node:fs';
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
  session: resolve('public/review/content-review-session.json'),
  sourceDecisions: resolve('tools/scratch/content-review-session-source-roundtrip.json'),
  sourceReport: resolve('tools/scratch/content-review-session-source-roundtrip-report.json'),
  sourceApplyGuardReport: resolve('tools/scratch/content-review-session-source-roundtrip-apply-guard-report.json'),
  threatDecisions: resolve('tools/scratch/content-review-session-threat-roundtrip.json'),
  threatReport: resolve('tools/scratch/content-review-session-threat-roundtrip-report.json'),
  threatApplyGuardReport: resolve('tools/scratch/content-review-session-threat-roundtrip-apply-guard-report.json'),
};

const sourceVisualNotes = {
  'whole-creature-cohesion': 'The whole source organism reads as a single cohesive creature in the source, key preview, sandbox preview, and plan preview evidence.',
  'part-continuity-cohesion': 'The part continuity, joint anatomy, proportion, and lighting remain consistent across source, key preview, sandbox preview, and plan preview evidence.',
  'readable-silhouette': 'The silhouette outline, readable scale, and overall shape remain clear in the source, key preview, sandbox preview, and plan preview evidence.',
  'no-collage-artifacts': 'The material, palette, and lighting avoid collage artifact or stitched-source problems in the source, key preview, sandbox preview, and plan preview evidence.',
  'non-placeholder-art-direction': 'The production art direction, finished design, and non-placeholder rendering are visible in the source, key preview, sandbox preview, and plan preview evidence.',
  'crop-safe-anatomy': 'The crop margin, joint placement, appendage layout, pivot zones, and anatomy remain safe in the source, key preview, sandbox preview, and plan preview evidence.',
  'clean-magenta-key': 'The magenta key background, pink border cleanup, and extracted edge quality are reviewable in the source, key preview, sandbox preview, and plan preview evidence.',
  'gameplay-read': 'The gameplay danger verb, attack hazard read, and silhouette role are clear in the source, key preview, sandbox preview, and plan preview evidence.',
  'neutral-riggable-pose': 'The neutral pose, riggable pivot layout, and attack frame potential are clear in the source, key preview, sandbox preview, and plan preview evidence.',
  'visible-attack-lane': 'The attack lane direction, mouth or spine strike read, and threat direction are visible in the source, key preview, sandbox preview, and plan preview evidence.',
};

const threatVisualNotes = {
  'single-source-cohesion': 'The source, whole creature, same creature cohesion, and parity evidence match across contact sheet, phase strip, parity overlay, and paired sandbox review.',
  'readable-silhouette': 'The silhouette outline, scale, readable shape, and target profile remain clear across contact sheet, phase strip, parity overlay, and paired sandbox review.',
  'anatomy-cohesion': 'The anatomy, orientation, part layout, jaw, body, tail, and limb relationships stay coherent across contact sheet, phase strip, parity overlay, and paired sandbox review.',
  'production-visual-cohesion': 'The production palette, lighting, material, cohesion, and non-placeholder rendering hold across contact sheet, phase strip, parity overlay, and paired sandbox review.',
  'socket-seams': 'The socket seam, joint overlay, and connection points remain coherent across contact sheet, phase strip, parity overlay, and paired sandbox review.',
  'motion-stability': 'The phase motion, animation frame stability, jitter control, and popping checks pass across contact sheet, phase strip, parity overlay, and paired sandbox review.',
  'sandbox-behavior': 'The sandbox idle, lunge, stunned, diver comparison, behavior, and motion read correctly across contact sheet, phase strip, parity overlay, and paired sandbox review.',
};

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
      // Try the next browser candidate.
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

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function runStrict(commandArgs, reportPath) {
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
  let report = null;
  try {
    report = JSON.parse(readFileSync(reportPath, 'utf8'));
  } catch {
    // Caller inspects stdout/stderr and missing report.
  }
  return { result, report };
}

async function fillChecks(controls, kind, notes) {
  await controls.locator(`[data-${kind}-check][data-check-field="score"]`).evaluateAll((nodes) => {
    for (const node of nodes) {
      node.value = '4';
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await controls.locator(`[data-${kind}-check][data-check-field="note"]`).evaluateAll((nodes, payload) => {
    for (const node of nodes) {
      const check = node.getAttribute(`data-${payload.kind}-check`);
      node.value = payload.notes[check] ?? `${check} has direct review evidence and passes strict visual quality review.`;
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, { kind, notes });
}

const failures = [];
let child = null;
let browser = null;

try {
  const session = JSON.parse(await readFile(paths.session, 'utf8'));
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
  await controls.locator(`[data-source-note="${first.id}"]`).fill(`${first.species} source approval is based on direct inspection of the source, magenta key preview, sandbox preview, and plan preview for a cohesive production creature.`);
  await controls.locator(`[data-threat-note="${first.id}"]`).fill(`${first.species} threat acceptance is based on contact sheet, phase strip, parity overlay, paired diver sandbox, and motion evidence.`);
  await fillChecks(controls, 'source', sourceVisualNotes);
  await fillChecks(controls, 'threat', threatVisualNotes);

  const sourceReviewedDecisionFile = JSON.parse(await page.inputValue('[data-source-reviewed-decision-output]'));
  const threatReviewedDecisionFile = JSON.parse(await page.inputValue('[data-threat-reviewed-decision-output]'));
  sourceReviewedDecisionFile.policy = {
    ...sourceReviewedDecisionFile.policy,
    dryRunOnly: true,
    smokeTestArtifact: true,
  };
  threatReviewedDecisionFile.policy = {
    ...threatReviewedDecisionFile.policy,
    dryRunOnly: true,
    smokeTestArtifact: true,
  };
  if ((sourceReviewedDecisionFile.decisions ?? []).length !== 1) failures.push(`reviewed-only source export contained ${sourceReviewedDecisionFile.decisions?.length ?? 'missing'} decisions`);
  if ((threatReviewedDecisionFile.decisions ?? []).length !== 1) failures.push(`reviewed-only threat export contained ${threatReviewedDecisionFile.decisions?.length ?? 'missing'} decisions`);
  if (sourceReviewedDecisionFile.decisions?.[0]?.id !== first.id) failures.push('reviewed-only source export target mismatch');
  if (threatReviewedDecisionFile.decisions?.[0]?.id !== first.id) failures.push('reviewed-only threat export target mismatch');
  await writeJson(paths.sourceDecisions, sourceReviewedDecisionFile);
  await writeJson(paths.threatDecisions, threatReviewedDecisionFile);

  const sourceRun = runStrict([
    'tools/apply_source_cohesion_decisions.mjs',
    '--decisions', paths.sourceDecisions,
    '--report', paths.sourceReport,
    '--strict',
  ], paths.sourceReport);
  const threatRun = runStrict([
    'tools/apply_content_threat_acceptance_decisions.mjs',
    '--decisions', paths.threatDecisions,
    '--report', paths.threatReport,
    '--strict',
  ], paths.threatReport);
  const threatFailureText = String((threatRun.report?.failures ?? []).join('\n'));
  const threatBlockedBySourceGate = threatRun.result.status !== 0
    && threatFailureText.includes('source candidate')
    && threatFailureText.includes('not approved');

  if (sourceRun.result.status !== 0) failures.push(`source strict roundtrip exited ${sourceRun.result.status}: ${sourceRun.result.stderr || sourceRun.result.stdout}`);
  if (threatRun.result.status !== 0 && !threatBlockedBySourceGate) failures.push(`threat strict roundtrip exited ${threatRun.result.status}: ${threatRun.result.stderr || threatRun.result.stdout}`);
  if (sourceRun.report?.schema !== 'water9/source-cohesion-decision-run@1') failures.push(`source roundtrip report schema is ${sourceRun.report?.schema ?? 'missing'}`);
  if (threatRun.report?.schema !== 'water9/content-threat-acceptance-decision-run@1') failures.push(`threat roundtrip report schema is ${threatRun.report?.schema ?? 'missing'}`);
  if (sourceRun.report?.strict !== true) failures.push('source roundtrip strict flag was not true');
  if (threatRun.report?.strict !== true) failures.push('threat roundtrip strict flag was not true');
  if (sourceRun.report?.applied !== false) failures.push('source roundtrip must stay dry-run');
  if (threatRun.report?.applied !== false) failures.push('threat roundtrip must stay dry-run');
  if (sourceRun.report?.approved !== 1) failures.push(`source roundtrip approved count was ${sourceRun.report?.approved ?? 'missing'}`);
  if (threatRun.report?.accepted !== 1) failures.push(`threat roundtrip accepted count was ${threatRun.report?.accepted ?? 'missing'}`);
  if ((sourceRun.report?.failures ?? []).length) failures.push(...sourceRun.report.failures.map((failure) => `source report failure: ${failure}`));
  if ((threatRun.report?.failures ?? []).length && !threatBlockedBySourceGate) failures.push(...threatRun.report.failures.map((failure) => `threat report failure: ${failure}`));
  if (threatBlockedBySourceGate && !String(threatRun.report?.results?.[0]?.command ?? '').includes('--source-reviewed')) {
    failures.push('source-gated threat roundtrip command missing --source-reviewed');
  }
  if (!String(sourceRun.report?.results?.[0]?.command ?? '').includes('--dry-run')) failures.push('source roundtrip command missing --dry-run');
  if (!String(threatRun.report?.results?.[0]?.command ?? '').includes('--dry-run')) failures.push('threat roundtrip command missing --dry-run');

  const sourceApplyGuard = runStrict([
    'tools/apply_source_cohesion_decisions.mjs',
    '--decisions', paths.sourceDecisions,
    '--report', paths.sourceApplyGuardReport,
    '--strict',
    '--apply',
  ], paths.sourceApplyGuardReport);
  const threatApplyGuard = runStrict([
    'tools/apply_content_threat_acceptance_decisions.mjs',
    '--decisions', paths.threatDecisions,
    '--report', paths.threatApplyGuardReport,
    '--strict',
    '--apply',
  ], paths.threatApplyGuardReport);
  if (sourceApplyGuard.result.status === 0) failures.push('source roundtrip dryRunOnly apply guard unexpectedly exited 0');
  if (threatApplyGuard.result.status === 0) failures.push('threat roundtrip dryRunOnly apply guard unexpectedly exited 0');
  if (!String((sourceApplyGuard.report?.failures ?? []).join('\n')).includes('decision file policy.dryRunOnly forbids --apply')) {
    failures.push('source roundtrip dryRunOnly apply guard did not report policy.dryRunOnly forbids --apply');
  }
  if (!String((threatApplyGuard.report?.failures ?? []).join('\n')).includes('decision file policy.dryRunOnly forbids --apply')) {
    failures.push('threat roundtrip dryRunOnly apply guard did not report policy.dryRunOnly forbids --apply');
  }
  if (sourceApplyGuard.report?.applyRequested !== true) failures.push('source roundtrip apply guard did not record applyRequested true');
  if (threatApplyGuard.report?.applyRequested !== true) failures.push('threat roundtrip apply guard did not record applyRequested true');
  if (sourceApplyGuard.report?.applied !== false) failures.push('source roundtrip apply guard report should not be applied');
  if (threatApplyGuard.report?.applied !== false) failures.push('threat roundtrip apply guard report should not be applied');
  if ((sourceApplyGuard.report?.results ?? []).some((result) => result.applied === true)) failures.push('source roundtrip dryRunOnly apply guard allowed an applied result');
  if ((threatApplyGuard.report?.results ?? []).some((result) => result.applied === true)) failures.push('threat roundtrip dryRunOnly apply guard allowed an applied result');

  console.log(JSON.stringify({
    schema: 'water9/content-review-session-strict-roundtrip-smoke@1',
    baseUrl,
    target: first.id,
    sourceReport: paths.sourceReport,
    threatReport: paths.threatReport,
    sourceApplyGuardReport: paths.sourceApplyGuardReport,
    threatApplyGuardReport: paths.threatApplyGuardReport,
    sourceApproved: sourceRun.report?.approved ?? 0,
    threatAccepted: threatRun.report?.accepted ?? 0,
    sourceApplyGuardBlocked: sourceApplyGuard.result.status !== 0,
    threatApplyGuardBlocked: threatApplyGuard.result.status !== 0,
    threatBlockedBySourceGate,
    failures,
  }, null, 2));
} catch (error) {
  failures.push(error.stack ?? error.message);
  console.error(JSON.stringify({
    schema: 'water9/content-review-session-strict-roundtrip-smoke@1',
    failures,
  }, null, 2));
  process.exitCode = 1;
} finally {
  await browser?.close();
  await stop(child);
}

if (failures.length) process.exitCode = 1;

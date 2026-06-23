import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const paths = {
  template: resolve('public/review/content-threat-acceptance-decision-template.json'),
  decisions: resolve('tools/scratch/content-threat-acceptance-decisions-apply-smoke.json'),
  report: resolve('tools/scratch/content-threat-acceptance-decisions-apply-smoke-report.json'),
  applyGuardReport: resolve('tools/scratch/content-threat-acceptance-decisions-apply-guard-report.json'),
};

const template = JSON.parse(await readFile(paths.template, 'utf8'));
if (template.schema !== 'water9/content-threat-acceptance-decision-template@1') {
  throw new Error(`Unexpected template schema ${template.schema ?? 'missing'}`);
}

const decisions = (template.decisions ?? []).map((decision, index) => ({
  id: decision.id,
  species: decision.species,
  status: index === 0 ? 'prototype' : 'needs-review',
  reviewer: 'Human Reviewer',
  sourceCandidateId: decision.sourceCandidateId ?? '',
  overallNote: `${decision.species} remains a prototype after direct review; this smoke only proves the decision runner can execute content acceptance dry-runs without granting gate credit.`,
  visualChecks: decision.visualChecks,
}));

const acceptedTemplate = (template.decisions ?? []).find((decision) => decision.sourceCandidateId && decision.evidenceFingerprint?.digest) ?? template.decisions?.[0];
const acceptedVisualNotes = {
  'single-source-cohesion': 'The source, whole body, and parity evidence read as the same creature with consistent cohesion.',
  'readable-silhouette': 'The silhouette outline and overall shape stay readable at game scale in the sandbox.',
  'anatomy-cohesion': 'The anatomy, body, jaw, tail, and moving parts keep a coherent orientation.',
  'production-visual-cohesion': 'The production palette, lighting, material, and cohesion do not read as placeholder art.',
  'socket-seams': 'The socket overlay, seam, joint, and visible connection points hold together during review.',
  'motion-stability': 'The phase strip motion avoids jitter, popping, and frame instability during animation.',
  'sandbox-behavior': 'The sandbox idle, lunge, stunned, diver comparison, and behavior remain readable in motion.',
};
function acceptedDecision(overrides = {}) {
  return {
    id: acceptedTemplate.id,
    species: acceptedTemplate.species,
    status: 'accepted',
    reviewer: 'Human Reviewer',
    sourceCandidateId: acceptedTemplate.sourceCandidateId ?? acceptedTemplate.id,
    overallNote: `${acceptedTemplate.species} was reviewed against contact sheet, phase strip, source parity overlay, and paired sandbox evidence before acceptance.`,
    evidenceFingerprint: acceptedTemplate.evidenceFingerprint,
    visualChecks: Object.fromEntries(Object.keys(acceptedVisualNotes).map((check) => [check, { score: 4, note: acceptedVisualNotes[check] }])),
    ...overrides,
  };
}

const decisionFile = {
  schema: 'water9/content-threat-acceptance-decisions@1',
  reviewer: 'Human Reviewer',
  reviewedAt: new Date().toISOString(),
  policy: {
    humanAuthored: true,
    automationCannotAcceptThreats: true,
    inspectSourceContactPhaseParityAndSandbox: true,
    dryRunOnly: true,
    smokeTestArtifact: true,
  },
  decisions,
};

await mkdir(dirname(paths.decisions), { recursive: true });
await writeFile(paths.decisions, `${JSON.stringify(decisionFile, null, 2)}\n`);

const result = spawnSync(process.execPath, [
  'tools/apply_content_threat_acceptance_decisions.mjs',
  '--decisions', paths.decisions,
  '--report', paths.report,
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: 'pipe',
});

let report = null;
try {
  report = JSON.parse(await readFile(paths.report, 'utf8'));
} catch {
  // The command may have failed before writing the report; failures below include stdout/stderr.
}

const failures = [];
if (result.status !== 0) failures.push(`apply command exited ${result.status}: ${result.stderr || result.stdout}`);
if (report?.schema !== 'water9/content-threat-acceptance-decision-run@1') failures.push(`run report schema is ${report?.schema ?? 'missing'}`);
if (report?.strict !== false) failures.push('run report strict flag should be false');
if (report?.applied !== false) failures.push('dry-run report must not be applied');
if (report?.applyRequested !== false) failures.push('dry-run report applyRequested should be false');
if ((report?.decisions ?? -1) !== decisions.length) failures.push('run report decision count mismatch');
if ((report?.prototype ?? -1) !== 1) failures.push('run report prototype count should be one');
if ((report?.accepted ?? -1) !== 0) failures.push('run report accepted count should be zero');
if ((report?.pending ?? -1) !== decisions.length - 1) failures.push('run report pending count mismatch');
if ((report?.failures ?? []).length) failures.push(...report.failures.map((failure) => `run report failure: ${failure}`));
const prototypeResult = report?.results?.find((item) => item.status === 'prototype');
if (!prototypeResult) failures.push('run report missing prototype result');
if (prototypeResult?.applied !== false) failures.push('prototype dry-run result should not be applied');
if (!String(prototypeResult?.command ?? '').includes('tools/accept_articulated_creature.mjs')) failures.push('prototype command missing threat accept tool');
if (!String(prototypeResult?.command ?? '').includes('--dry-run')) failures.push('prototype command missing --dry-run');
if (!String(prototypeResult?.command ?? '').includes('--visual-feedback-ledger')) failures.push('prototype command missing visual feedback ledger guard');
if (String(prototypeResult?.command ?? '').includes('--source-reviewed')) failures.push('prototype command should not include accepted-only evidence flags');

async function runStrictNegative(name, decision, expectedText, extraArgs = []) {
  const decisionPath = resolve(`tools/scratch/content-threat-acceptance-decisions-${name}.json`);
  const reportPath = resolve(`tools/scratch/content-threat-acceptance-decisions-${name}-report.json`);
  await writeFile(decisionPath, `${JSON.stringify({
    schema: 'water9/content-threat-acceptance-decisions@1',
    reviewer: 'Human Reviewer',
    reviewedAt: new Date().toISOString(),
    policy: {
      humanAuthored: true,
      automationCannotAcceptThreats: true,
      inspectSourceContactPhaseParityAndSandbox: true,
    },
    decisions: [decision],
  }, null, 2)}\n`);
  const strictResult = spawnSync(process.execPath, [
    'tools/apply_content_threat_acceptance_decisions.mjs',
    '--decisions', decisionPath,
    '--report', reportPath,
    '--strict',
    ...extraArgs,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
  let strictReport = null;
  try {
    strictReport = JSON.parse(await readFile(reportPath, 'utf8'));
  } catch {
    // Failure to write a report is checked below.
  }
  if (strictResult.status === 0) failures.push(`${name}: strict command should fail`);
  if (strictReport?.schema !== 'water9/content-threat-acceptance-decision-run@1') failures.push(`${name}: strict run report schema is ${strictReport?.schema ?? 'missing'}`);
  if (!String((strictReport?.failures ?? []).join('\n')).includes(expectedText)) {
    failures.push(`${name}: strict failures did not include ${expectedText}`);
  }
}

await runStrictNegative('missing-fingerprint-smoke', (() => {
  const decision = acceptedDecision();
  delete decision.evidenceFingerprint;
  return decision;
})(), 'strict accepted decision requires threat evidence fingerprint digest');

await runStrictNegative('stale-fingerprint-smoke', acceptedDecision({
  evidenceFingerprint: {
    ...acceptedTemplate.evidenceFingerprint,
    digest: 'stale-digest',
  },
}), 'threat evidence fingerprint is stale');

const visualFeedbackLedgerPath = resolve('tools/scratch/content-threat-acceptance-decisions-visual-feedback-blocker.json');
await writeFile(visualFeedbackLedgerPath, `${JSON.stringify({
  schema: 'water9/content-visual-feedback-ledger@1',
  items: [
    {
      id: `${acceptedTemplate.id}-cohesion-rejection-smoke`,
      targetId: acceptedTemplate.id,
      status: 'rejected-needs-cohesion-regeneration',
      severity: 'blocking',
      open: true,
      summary: 'Smoke-test blocker proving accepted threat decisions cannot bypass rejected visual feedback.',
    },
  ],
}, null, 2)}\n`);
await runStrictNegative(
  'visual-feedback-blocker-smoke',
  acceptedDecision(),
  'open blocking visual feedback',
  ['--visual-feedback-ledger', visualFeedbackLedgerPath],
);

const applyGuard = spawnSync(process.execPath, [
  'tools/apply_content_threat_acceptance_decisions.mjs',
  '--decisions', paths.decisions,
  '--report', paths.applyGuardReport,
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
  failures.push('dryRunOnly threat apply guard report could not be read');
}
if (applyGuard.status === 0) failures.push('dryRunOnly threat apply guard unexpectedly exited 0');
if (!String((applyGuardReport?.failures ?? []).join('\n')).includes('decision file policy.dryRunOnly forbids --apply')) {
  failures.push('dryRunOnly threat apply guard did not report policy.dryRunOnly forbids --apply');
}
if (applyGuardReport?.applyRequested !== true) failures.push('dryRunOnly threat apply guard did not record applyRequested true');
if (applyGuardReport?.applied !== false) failures.push('dryRunOnly threat apply guard report should not be applied');
if ((applyGuardReport?.results ?? []).some((result) => result.applied === true)) failures.push('dryRunOnly threat apply guard allowed an applied result');

const summary = {
  schema: 'water9/content-threat-acceptance-decision-apply-smoke@1',
  decisions: decisions.length,
  report: paths.report,
  applyGuardReport: paths.applyGuardReport,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

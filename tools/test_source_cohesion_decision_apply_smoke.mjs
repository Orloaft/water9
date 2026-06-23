import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const paths = {
  template: resolve('public/review/source-candidates/source-cohesion-decision-template.json'),
  decisions: resolve('tools/scratch/source-cohesion-decisions-apply-smoke.json'),
  report: resolve('tools/scratch/source-cohesion-decisions-apply-smoke-report.json'),
  missingFingerprintDecisions: resolve('tools/scratch/source-cohesion-decisions-missing-fingerprint-smoke.json'),
  missingFingerprintReport: resolve('tools/scratch/source-cohesion-decisions-missing-fingerprint-smoke-report.json'),
  staleFingerprintDecisions: resolve('tools/scratch/source-cohesion-decisions-stale-fingerprint-smoke.json'),
  staleFingerprintReport: resolve('tools/scratch/source-cohesion-decisions-stale-fingerprint-smoke-report.json'),
  invalidMediaFingerprintDecisions: resolve('tools/scratch/source-cohesion-decisions-invalid-media-fingerprint-smoke.json'),
  invalidMediaFingerprintReport: resolve('tools/scratch/source-cohesion-decisions-invalid-media-fingerprint-smoke-report.json'),
};

const NOTE_TERMS = {
  'whole-creature-cohesion': 'whole source organism creature cohesion single',
  'part-continuity-cohesion': 'part continuity joint anatomy proportion lighting',
  'readable-silhouette': 'silhouette outline readable scale shape',
  'no-collage-artifacts': 'collage artifact lighting material palette stitched',
  'non-placeholder-art-direction': 'production placeholder art direction design finished',
  'crop-safe-anatomy': 'crop margin joint appendage pivot anatomy',
  'clean-magenta-key': 'magenta key background border pink',
  'gameplay-read': 'gameplay danger verb attack hazard read',
  'neutral-riggable-pose': 'neutral pose riggable pivot attack frame',
  'visible-attack-lane': 'attack lane direction mouth spine strike',
};

function visualChecksFor(decision, requiredChecks) {
  return Object.fromEntries(requiredChecks.map((check) => [
    check,
    {
      score: 4,
      note: `${decision.species} ${check} review cites ${NOTE_TERMS[check] ?? check} from source, key preview, sandbox preview, and plan preview evidence.`,
    },
  ]));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function writeDecisionFile(path, decisionItems) {
  const file = {
    schema: 'water9/source-cohesion-decisions@1',
    reviewer: 'Human Reviewer',
    reviewedAt: new Date().toISOString(),
    policy: {
      humanAuthored: true,
      automationCannotApproveCohesion: true,
      inspectSourceKeySandboxAndPlan: true,
    },
    decisions: decisionItems,
  };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(file, null, 2)}\n`);
}

async function runApplySmoke(decisionsPath, reportPath) {
  const result = spawnSync(process.execPath, [
    'tools/apply_source_cohesion_decisions.mjs',
    '--decisions', decisionsPath,
    '--report', reportPath,
    '--strict',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
  let report = null;
  try {
    report = JSON.parse(await readFile(reportPath, 'utf8'));
  } catch {
    // The command may have failed before writing the report; callers inspect stdout/stderr too.
  }
  return { result, report };
}

const template = JSON.parse(await readFile(paths.template, 'utf8'));
if (template.schema !== 'water9/source-cohesion-decision-template@1') {
  throw new Error(`Unexpected template schema ${template.schema ?? 'missing'}`);
}

const requiredChecks = template.requiredCohesionChecks ?? [];
const decisions = (template.decisions ?? []).map((decision, index) => ({
  id: decision.id,
  species: decision.species,
  status: index === 0 ? 'rejected' : 'approved',
  reviewer: 'Human Reviewer',
  overallNote: index === 0
    ? `${decision.species} is rejected after direct source, magenta key, sandbox, and plan-preview inspection showed whole creature cohesion failure.`
    : `${decision.species} is approved after direct source, magenta key, sandbox, and plan-preview inspection showed cohesive production-ready creature art.`,
  evidenceFingerprint: decision.evidenceFingerprint,
  failedChecks: index === 0 ? ['whole-creature-cohesion'] : [],
  visualChecks: visualChecksFor(decision, requiredChecks),
}));

await writeDecisionFile(paths.decisions, decisions);

const { result, report } = await runApplySmoke(paths.decisions, paths.report);

const failures = [];
if (result.status !== 0) failures.push(`apply command exited ${result.status}: ${result.stderr || result.stdout}`);
if (report?.schema !== 'water9/source-cohesion-decision-run@1') failures.push(`run report schema is ${report?.schema ?? 'missing'}`);
if (report?.strict !== true) failures.push('run report strict flag was not true');
if (report?.applied !== false) failures.push('dry-run report must not be applied');
if ((report?.decisions ?? -1) !== decisions.length) failures.push('run report decision count mismatch');
if ((report?.approved ?? -1) !== decisions.length - 1) failures.push('run report approved count mismatch');
if ((report?.pending ?? -1) !== 0) failures.push('run report pending count should be zero');
if ((report?.rejected ?? -1) !== 1) failures.push('run report rejected count should be one');
if ((report?.failures ?? []).length) failures.push(...report.failures.map((failure) => `run report failure: ${failure}`));
for (const item of report?.results ?? []) {
  const sourceDecision = decisions.find((decision) => decision.id === item.id);
  if (!sourceDecision?.evidenceFingerprint?.digest) failures.push(`${item.id}: smoke decision missing evidence fingerprint digest`);
  if (item.applied !== false) failures.push(`${item.id}: dry-run result should not be applied`);
  if (!String(item.command ?? '').includes('tools/accept_source_candidate.mjs')) failures.push(`${item.id}: result command missing source accept tool`);
  if (!String(item.command ?? '').includes('--dry-run')) failures.push(`${item.id}: result command missing --dry-run`);
  if (!String(item.command ?? '').includes('--source-visual-board public/review/source-visual-board.json')) failures.push(`${item.id}: result command missing source visual board evidence`);
  if (item.status === 'approved' && !String(item.command ?? '').includes('--source-reviewed')) failures.push(`${item.id}: approved result command missing --source-reviewed`);
  if (item.status === 'rejected') {
    if (!String(item.command ?? '').includes('--source-rejected')) failures.push(`${item.id}: rejected result command missing --source-rejected`);
    if (!String(item.command ?? '').includes('--failed-check whole-creature-cohesion')) failures.push(`${item.id}: rejected result command missing failed check`);
    if (!String(item.command ?? '').includes('--visual-note') || !String(item.command ?? '').includes('whole-creature-cohesion=')) failures.push(`${item.id}: rejected result command missing failure visual note`);
  }
}

const missingFingerprintDecision = clone(decisions[1]);
delete missingFingerprintDecision.evidenceFingerprint;
await writeDecisionFile(paths.missingFingerprintDecisions, [missingFingerprintDecision]);
const missingFingerprintRun = await runApplySmoke(paths.missingFingerprintDecisions, paths.missingFingerprintReport);
if (missingFingerprintRun.result.status === 0) failures.push('missing fingerprint decision unexpectedly passed strict apply');
if (!String((missingFingerprintRun.report?.failures ?? []).join('\n')).includes('strict decision requires source cohesion evidence fingerprint')) {
  failures.push('missing fingerprint run did not report strict evidence fingerprint failure');
}

const staleFingerprintDecision = clone(decisions[2]);
staleFingerprintDecision.evidenceFingerprint.digest = 'stale-digest';
await writeDecisionFile(paths.staleFingerprintDecisions, [staleFingerprintDecision]);
const staleFingerprintRun = await runApplySmoke(paths.staleFingerprintDecisions, paths.staleFingerprintReport);
if (staleFingerprintRun.result.status === 0) failures.push('stale fingerprint decision unexpectedly passed strict apply');
if (!String((staleFingerprintRun.report?.failures ?? []).join('\n')).includes('source cohesion evidence fingerprint is stale')) {
  failures.push('stale fingerprint run did not report stale evidence fingerprint failure');
}

const invalidMediaFingerprintDecision = clone(decisions[3]);
invalidMediaFingerprintDecision.evidenceFingerprint.files.source.exists = false;
invalidMediaFingerprintDecision.evidenceFingerprint.files.source.sha256 = null;
await writeDecisionFile(paths.invalidMediaFingerprintDecisions, [invalidMediaFingerprintDecision]);
const invalidMediaFingerprintRun = await runApplySmoke(paths.invalidMediaFingerprintDecisions, paths.invalidMediaFingerprintReport);
if (invalidMediaFingerprintRun.result.status === 0) failures.push('invalid media fingerprint decision unexpectedly passed strict apply');
if (!String((invalidMediaFingerprintRun.report?.failures ?? []).join('\n')).includes('strict decision evidence fingerprint is missing valid source media evidence')) {
  failures.push('invalid media fingerprint run did not report invalid source media evidence failure');
}

const summary = {
  schema: 'water9/source-cohesion-decision-apply-smoke@1',
  decisions: decisions.length,
  report: paths.report,
  negativeCases: {
    missingFingerprintReport: paths.missingFingerprintReport,
    staleFingerprintReport: paths.staleFingerprintReport,
    invalidMediaFingerprintReport: paths.invalidMediaFingerprintReport,
  },
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

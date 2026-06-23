import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import {
  THREAT_EVIDENCE_FINGERPRINT_SCHEMA,
} from './content_threat_evidence_fingerprint.mjs';
import {
  MIN_APPROVAL_NOTE_LENGTH,
  MIN_VISUAL_NOTE_LENGTH,
  distinctReviewNotes,
  meaningfulReviewText,
  reviewEvidenceFailure,
  reviewNoteHasEvidenceTerms,
  reviewTextFailure,
} from './review_text_quality.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const paths = {
  decisions: resolve(String(args.get('decisions') ?? 'public/review/content-threat-acceptance-decision-template.json')),
  review: resolve(String(args.get('review') ?? 'public/review/articulated/review-manifest.json')),
  decisionTemplate: resolve(String(args.get('decision-template') ?? 'public/review/content-threat-acceptance-decision-template.json')),
  visualFeedbackLedger: resolve(String(args.get('visual-feedback-ledger') ?? 'public/review/content-visual-feedback-ledger.json')),
  outReport: resolve(String(args.get('report') ?? 'public/review/content-threat-acceptance-decision-run-report.json')),
};

const APPLY = args.has('apply');
const STRICT = args.has('strict');
const ALLOW_PENDING = args.has('allow-pending') || !STRICT;
const ALLOW_AI_REVIEWER = args.has('allow-ai-reviewer');
const DISALLOWED_REVIEWERS = new Set(['codex', 'assistant', 'ai', 'agent', 'automation', 'bot', 'model', '<human-reviewer>']);
const REQUIRED_CHECKS = [
  'single-source-cohesion',
  'readable-silhouette',
  'anatomy-cohesion',
  'production-visual-cohesion',
  'socket-seams',
  'motion-stability',
  'sandbox-behavior',
];
const RIG_VISUAL_NOTE_TERMS = {
  'single-source-cohesion': ['source', 'cohesion', 'parity', 'whole', 'same creature'],
  'readable-silhouette': ['silhouette', 'outline', 'scale', 'readable', 'shape'],
  'anatomy-cohesion': ['anatomy', 'orientation', 'part', 'jaw', 'body', 'tail', 'limb'],
  'production-visual-cohesion': ['production', 'placeholder', 'palette', 'lighting', 'material', 'cohesion'],
  'socket-seams': ['socket', 'seam', 'joint', 'overlay', 'connection'],
  'motion-stability': ['phase', 'motion', 'jitter', 'popping', 'frame', 'animation'],
  'sandbox-behavior': ['sandbox', 'idle', 'lunge', 'stunned', 'diver', 'behavior', 'motion'],
};

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readJsonOptional(path, fallback) {
  try {
    return { data: JSON.parse(await readFile(path, 'utf8')), error: null };
  } catch (error) {
    return { data: fallback, error };
  }
}

function shellQuote(value) {
  return `'${String(value ?? '').replaceAll("'", "'\\''")}'`;
}

function asDecisionFile(input) {
  if (input.schema === 'water9/content-threat-acceptance-decisions@1') return input;
  if (input.schema === 'water9/content-threat-acceptance-decision-template@1' && input.decisionFileTemplate?.schema === 'water9/content-threat-acceptance-decisions@1') {
    return input.decisionFileTemplate;
  }
  throw new Error(`Unsupported decision schema ${input.schema ?? input.decisionFileTemplate?.schema ?? 'missing'}`);
}

function normalizedNote(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function openVisualBlockersFor(decision, openVisualBlockers) {
  const ids = new Set([decision.id, decision.sourceCandidateId].filter(Boolean));
  return openVisualBlockers.filter((item) => ids.has(item.targetId));
}

function validateDecision(decision, rigIds, currentEvidenceFingerprints, openVisualBlockers) {
  const failures = [];
  const status = String(decision.status ?? 'needs-review');
  const reviewer = String(decision.reviewer ?? decision.reviewedBy ?? '').trim();
  const reviewerKey = reviewer.toLowerCase();
  const note = String(decision.overallNote ?? decision.note ?? '').trim();
  const sourceCandidateId = String(decision.sourceCandidateId ?? '').trim();
  if (!rigIds.has(decision.id)) failures.push(`${decision.id ?? 'unknown'}: decision id is not a registered articulated rig`);
  if (!['needs-review', 'accepted', 'prototype'].includes(status)) failures.push(`${decision.id}: unsupported status ${status}`);
  if (status === 'needs-review') {
    if (!ALLOW_PENDING) failures.push(`${decision.id}: pending decision is not allowed in strict mode`);
    return { status, reviewer, note, sourceCandidateId, failures };
  }

  for (const blocker of openVisualBlockersFor(decision, openVisualBlockers)) {
    failures.push(`${decision.id}: open blocking visual feedback ${blocker.id ?? blocker.status ?? blocker.targetId} must be resolved before threat decision can be ${status}`);
  }

  if (!reviewer || (!ALLOW_AI_REVIEWER && DISALLOWED_REVIEWERS.has(reviewerKey))) {
    failures.push(`${decision.id}: accepted/prototype decision requires a real human reviewer`);
  }
  if (!meaningfulReviewText(note, MIN_APPROVAL_NOTE_LENGTH)) {
    failures.push(`${decision.id}: overall note ${reviewTextFailure('overallNote', MIN_APPROVAL_NOTE_LENGTH)}`);
  }
  if (status === 'prototype') return { status, reviewer, note, sourceCandidateId, failures };

  if (!sourceCandidateId || sourceCandidateId === '<approved-source-candidate-id>') {
    failures.push(`${decision.id}: accepted decision requires sourceCandidateId`);
  }
  if (STRICT) {
    const expectedFingerprint = currentEvidenceFingerprints.get(decision.id);
    const providedFingerprint = decision.evidenceFingerprint;
    if (providedFingerprint?.schema !== THREAT_EVIDENCE_FINGERPRINT_SCHEMA) {
      failures.push(`${decision.id}: strict accepted decision requires threat evidence fingerprint schema`);
    }
    if (!providedFingerprint?.digest) {
      failures.push(`${decision.id}: strict accepted decision requires threat evidence fingerprint digest`);
    } else if (!expectedFingerprint?.digest) {
      failures.push(`${decision.id}: current threat evidence fingerprint is missing; rerun npm run content:threat-decisions`);
    } else if (providedFingerprint.digest !== expectedFingerprint.digest) {
      failures.push(`${decision.id}: threat evidence fingerprint is stale; rerun npm run content:threat-decisions and review current evidence`);
    }
    for (const key of ['contact', 'phase', 'sourceParity', 'sandbox-idle-screenshot', 'sandbox-lunge-screenshot', 'sandbox-stunned-screenshot']) {
      const providedMedia = providedFingerprint?.files?.[key];
      const expectedMedia = expectedFingerprint?.files?.[key];
      if (providedMedia?.exists !== true || !providedMedia?.sha256 || !providedMedia?.size) {
        failures.push(`${decision.id}: strict accepted decision evidence fingerprint is missing valid ${key} media evidence`);
      }
      if (expectedMedia?.exists !== true || !expectedMedia?.sha256 || !expectedMedia?.size) {
        failures.push(`${decision.id}: current threat evidence fingerprint is missing valid ${key} media evidence; rerun npm run content:threat-decisions and paired sandbox visual checks`);
      }
    }
  }
  const seenNotes = new Map();
  for (const check of REQUIRED_CHECKS) {
    const value = decision.visualChecks?.[check];
    if (!value) {
      failures.push(`${decision.id}: missing visual check ${check}`);
      continue;
    }
    const score = Number(value.score);
    const visualNote = String(value.note ?? '').trim();
    if (!Number.isFinite(score) || score < 4 || score > 5) failures.push(`${decision.id}: ${check} score must be 4-5`);
    if (!meaningfulReviewText(visualNote, MIN_VISUAL_NOTE_LENGTH)) failures.push(`${decision.id}: ${check} note ${reviewTextFailure('note', MIN_VISUAL_NOTE_LENGTH)}`);
    if (meaningfulReviewText(visualNote, MIN_VISUAL_NOTE_LENGTH) && !reviewNoteHasEvidenceTerms(visualNote, RIG_VISUAL_NOTE_TERMS[check])) {
      failures.push(`${decision.id}: ${check} note ${reviewEvidenceFailure('note', RIG_VISUAL_NOTE_TERMS[check])}`);
    }
    const normalized = normalizedNote(visualNote);
    if (normalized) {
      const previous = seenNotes.get(normalized);
      if (previous) failures.push(`${decision.id}: ${previous} and ${check} notes are identical`);
      else seenNotes.set(normalized, check);
    }
  }
  const distinct = distinctReviewNotes(
    Object.fromEntries(REQUIRED_CHECKS.map((check) => [check, decision.visualChecks?.[check]?.note ?? ''])),
    REQUIRED_CHECKS,
  );
  if (!distinct.ok) failures.push(`${decision.id}: visual notes must be distinct for each check`);
  return { status, reviewer, note, sourceCandidateId, failures };
}

function acceptArgsFor(decision, validation) {
  const commandArgs = [
    'tools/accept_articulated_creature.mjs',
    '--id', decision.id,
    '--status', validation.status,
    '--reviewed-by', validation.reviewer,
    '--note', validation.note,
    '--visual-feedback-ledger', paths.visualFeedbackLedger,
  ];
  if (validation.sourceCandidateId) commandArgs.push('--source-candidate', validation.sourceCandidateId);
  if (validation.status === 'accepted') {
    if (decision.evidenceFingerprint?.digest) commandArgs.push('--evidence-fingerprint', decision.evidenceFingerprint.digest);
    for (const check of REQUIRED_CHECKS) commandArgs.push('--visual-check', check);
    for (const check of REQUIRED_CHECKS) commandArgs.push('--score', `${check}=${Number(decision.visualChecks[check].score)}`);
    for (const check of REQUIRED_CHECKS) commandArgs.push('--visual-note', `${check}=${String(decision.visualChecks[check].note).trim()}`);
    commandArgs.push('--source-reviewed', '--contact-reviewed', '--phase-reviewed', '--parity-reviewed', '--sandbox-reviewed');
  }
  if (!APPLY) commandArgs.push('--dry-run');
  if (ALLOW_AI_REVIEWER) commandArgs.push('--allow-ai-reviewer');
  return commandArgs;
}

function commandString(commandArgs) {
  return `node ${commandArgs.map((arg) => /[\s'"]/u.test(String(arg)) ? shellQuote(arg) : arg).join(' ')}`;
}

const review = await readJson(paths.review);
if (review.schema !== 'water9/articulated-review@1') throw new Error(`Unexpected articulated review schema ${review.schema ?? 'missing'}`);
const rigIds = new Set((review.creatures ?? []).map((creature) => creature.id));
const decisionInput = await readJson(paths.decisions);
const decisionFile = asDecisionFile(decisionInput);
let decisionTemplate = null;
try {
  decisionTemplate = await readJson(paths.decisionTemplate);
} catch {
  decisionTemplate = null;
}
const currentEvidenceFingerprints = new Map((decisionTemplate?.decisionFileTemplate?.decisions ?? decisionTemplate?.decisions ?? [])
  .filter((decision) => decision?.id)
  .map((decision) => [decision.id, decision.evidenceFingerprint]));
const failures = [];
const visualFeedbackLedger = await readJsonOptional(paths.visualFeedbackLedger, { schema: 'water9/content-visual-feedback-ledger@1', items: [] });
if (visualFeedbackLedger.error) failures.push(`could not read visual feedback ledger ${paths.visualFeedbackLedger}: ${visualFeedbackLedger.error.message}`);
if (visualFeedbackLedger.data?.schema !== 'water9/content-visual-feedback-ledger@1') {
  failures.push(`visual feedback ledger schema is ${visualFeedbackLedger.data?.schema ?? 'missing'}, expected water9/content-visual-feedback-ledger@1`);
}
const openVisualBlockers = (visualFeedbackLedger.data?.items ?? [])
  .filter((item) => item?.open === true && item?.severity === 'blocking');
const fileLevelFailures = [];
if (decisionFile.policy?.humanAuthored !== true) fileLevelFailures.push('decision file policy.humanAuthored must be true');
if (decisionFile.policy?.automationCannotAcceptThreats !== true) fileLevelFailures.push('decision file policy.automationCannotAcceptThreats must be true');
if (decisionFile.policy?.inspectSourceContactPhaseParityAndSandbox !== true) fileLevelFailures.push('decision file policy.inspectSourceContactPhaseParityAndSandbox must be true');
if (APPLY && decisionFile.policy?.dryRunOnly === true) fileLevelFailures.push('decision file policy.dryRunOnly forbids --apply');
failures.push(...fileLevelFailures);
const decisions = Array.isArray(decisionFile.decisions) ? decisionFile.decisions : [];
const seenIds = new Set();
for (const decision of decisions) {
  if (seenIds.has(decision.id)) failures.push(`${decision.id}: duplicate decision id`);
  seenIds.add(decision.id);
}

const results = [];
for (const decision of decisions) {
  const validation = validateDecision(decision, rigIds, currentEvidenceFingerprints, openVisualBlockers);
  failures.push(...validation.failures);
  if (validation.status === 'needs-review') {
    results.push({ id: decision.id, status: validation.status, pending: true, command: null, applied: false, failures: [...fileLevelFailures, ...validation.failures] });
    continue;
  }
  const commandArgs = acceptArgsFor(decision, validation);
  const command = commandString(commandArgs);
  const result = { id: decision.id, status: validation.status, pending: false, command, applied: APPLY && !fileLevelFailures.length, failures: [...fileLevelFailures, ...validation.failures] };
  if (!result.failures.length) {
    const spawned = spawnSync(process.execPath, commandArgs, { encoding: 'utf8', stdio: 'pipe' });
    result.exitCode = spawned.status;
    result.stdout = spawned.stdout.trim();
    result.stderr = spawned.stderr.trim();
    if (spawned.status !== 0) {
      const message = result.stderr || result.stdout || `exit ${spawned.status}`;
      failures.push(`${decision.id}: threat accept command failed: ${message}`);
      result.failures = [`threat accept command failed: ${message}`];
    }
  }
  results.push(result);
}

const summary = {
  schema: 'water9/content-threat-acceptance-decision-run@1',
  generatedAt: new Date().toISOString(),
  report: paths.outReport,
  inputs: {
    decisions: paths.decisions,
    review: paths.review,
    visualFeedbackLedger: paths.visualFeedbackLedger,
  },
  openVisualBlockers: openVisualBlockers.length,
  decisions: decisions.length,
  accepted: results.filter((result) => result.status === 'accepted').length,
  prototype: results.filter((result) => result.status === 'prototype').length,
  pending: results.filter((result) => result.pending).length,
  applyRequested: APPLY,
  applied: APPLY && !fileLevelFailures.length,
  strict: STRICT,
  failures,
  results,
};

await mkdir(dirname(paths.outReport), { recursive: true });
await writeFile(paths.outReport, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exitCode = 1;

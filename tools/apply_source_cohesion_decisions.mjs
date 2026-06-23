import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import {
  MIN_APPROVAL_NOTE_LENGTH,
  MIN_VISUAL_NOTE_LENGTH,
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
  decisions: resolve(String(args.get('decisions') ?? 'public/review/source-candidates/source-cohesion-decision-template.json')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  decisionTemplate: resolve(String(args.get('decision-template') ?? 'public/review/source-candidates/source-cohesion-decision-template.json')),
  outReport: resolve(String(args.get('report') ?? 'public/review/source-candidates/source-cohesion-decision-run-report.json')),
};

const APPLY = args.has('apply');
const STRICT = args.has('strict');
const ALLOW_PENDING = args.has('allow-pending') || !STRICT;
const ALLOW_AI_REVIEWER = args.has('allow-ai-reviewer');
const DISALLOWED_REVIEWERS = new Set(['codex', 'assistant', 'ai', 'agent', 'automation', 'bot', 'model', '<human-reviewer>']);
const REQUIRED_VISUAL_CHECKS = [
  'whole-creature-cohesion',
  'part-continuity-cohesion',
  'readable-silhouette',
  'no-collage-artifacts',
  'non-placeholder-art-direction',
  'crop-safe-anatomy',
  'clean-magenta-key',
  'gameplay-read',
  'neutral-riggable-pose',
  'visible-attack-lane',
];
const SOURCE_VISUAL_NOTE_TERMS = {
  'whole-creature-cohesion': ['whole', 'source', 'organism', 'creature', 'cohesion', 'single'],
  'part-continuity-cohesion': ['part', 'continuity', 'joint', 'anatomy', 'proportion', 'lighting'],
  'readable-silhouette': ['silhouette', 'outline', 'readable', 'scale', 'shape'],
  'no-collage-artifacts': ['collage', 'artifact', 'lighting', 'material', 'palette', 'stitched'],
  'non-placeholder-art-direction': ['production', 'placeholder', 'art direction', 'design', 'finished'],
  'crop-safe-anatomy': ['crop', 'margin', 'joint', 'appendage', 'pivot', 'anatomy'],
  'clean-magenta-key': ['magenta', 'key', 'background', 'border', 'pink'],
  'gameplay-read': ['gameplay', 'danger', 'verb', 'attack', 'hazard', 'read'],
  'neutral-riggable-pose': ['neutral', 'pose', 'riggable', 'pivot', 'attack frame'],
  'visible-attack-lane': ['attack', 'lane', 'direction', 'mouth', 'spine', 'strike'],
};

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function shellQuote(value) {
  return `'${String(value ?? '').replaceAll("'", "'\\''")}'`;
}

function asDecisionFile(input) {
  if (input.schema === 'water9/source-cohesion-decisions@1') return input;
  if (input.schema === 'water9/source-cohesion-decision-template@1' && input.decisionFileTemplate?.schema === 'water9/source-cohesion-decisions@1') {
    return input.decisionFileTemplate;
  }
  throw new Error(`Unsupported decision schema ${input.schema ?? input.decisionFileTemplate?.schema ?? 'missing'}`);
}

function normalizedNote(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function validateDecision(decision, candidateIds, currentEvidenceFingerprints) {
  const failures = [];
  const status = String(decision.status ?? 'needs-review');
  const reviewer = String(decision.reviewer ?? decision.reviewedBy ?? '').trim();
  const reviewerKey = reviewer.toLowerCase();
  const note = String(decision.overallNote ?? decision.note ?? '').trim();
  if (!candidateIds.has(decision.id)) failures.push(`${decision.id ?? 'unknown'}: decision id is not a source candidate`);
  if (!['needs-review', 'approved', 'rejected'].includes(status)) failures.push(`${decision.id}: unsupported status ${status}`);
  if (status === 'needs-review') {
    if (!ALLOW_PENDING) failures.push(`${decision.id}: pending decision is not allowed in strict mode`);
    return { status, reviewer, note, failures };
  }
  if (STRICT) {
    const expectedFingerprint = currentEvidenceFingerprints.get(decision.id);
    const providedFingerprint = decision.evidenceFingerprint;
    if (providedFingerprint?.schema !== 'water9/source-cohesion-evidence-fingerprint@1') {
      failures.push(`${decision.id}: strict decision requires source cohesion evidence fingerprint schema`);
    }
    if (!providedFingerprint?.digest) {
      failures.push(`${decision.id}: strict decision requires source cohesion evidence fingerprint digest`);
    } else if (!expectedFingerprint?.digest) {
      failures.push(`${decision.id}: current source cohesion evidence fingerprint is missing; rerun npm run source:cohesion-decisions`);
    } else if (providedFingerprint.digest !== expectedFingerprint.digest) {
      failures.push(`${decision.id}: source cohesion evidence fingerprint is stale; rerun npm run source:cohesion-decisions and review current evidence`);
    }
    for (const key of ['source', 'keyPreview', 'sandboxScreenshot', 'planPreview']) {
      const providedMedia = providedFingerprint?.files?.[key];
      const expectedMedia = expectedFingerprint?.files?.[key];
      if (providedMedia?.exists !== true || !providedMedia?.sha256 || !providedMedia?.size) {
        failures.push(`${decision.id}: strict decision evidence fingerprint is missing valid ${key} media evidence`);
      }
      if (expectedMedia?.exists !== true || !expectedMedia?.sha256 || !expectedMedia?.size) {
        failures.push(`${decision.id}: current source cohesion evidence fingerprint is missing valid ${key} media evidence; rerun npm run source:cohesion-decisions`);
      }
    }
  }
  if (!reviewer || (!ALLOW_AI_REVIEWER && DISALLOWED_REVIEWERS.has(reviewerKey))) failures.push(`${decision.id}: approved/rejected decision requires a real human reviewer`);
  if (!meaningfulReviewText(note, MIN_APPROVAL_NOTE_LENGTH)) failures.push(`${decision.id}: overall note ${reviewTextFailure('overallNote', MIN_APPROVAL_NOTE_LENGTH)}`);
  if (status === 'rejected') {
    const failedChecks = [...new Set([
      ...(Array.isArray(decision.failedChecks) ? decision.failedChecks : []),
      ...(Array.isArray(decision.failedVisualChecks) ? decision.failedVisualChecks : []),
      ...Object.entries(decision.visualChecks ?? {})
        .filter(([, value]) => value?.failed === true)
        .map(([check]) => check),
    ].map((check) => String(check).trim()).filter(Boolean))];
    if (!failedChecks.length) failures.push(`${decision.id}: rejected decision requires at least one failedChecks entry`);
    for (const check of failedChecks) {
      if (!REQUIRED_VISUAL_CHECKS.includes(check)) {
        failures.push(`${decision.id}: unknown failed check ${check}`);
        continue;
      }
      const visualNote = String(decision.visualChecks?.[check]?.note ?? decision.failureNotes?.[check] ?? '').trim();
      if (!meaningfulReviewText(visualNote, MIN_VISUAL_NOTE_LENGTH)) failures.push(`${decision.id}: ${check} rejection note ${reviewTextFailure('note', MIN_VISUAL_NOTE_LENGTH)}`);
      if (meaningfulReviewText(visualNote, MIN_VISUAL_NOTE_LENGTH) && !reviewNoteHasEvidenceTerms(visualNote, SOURCE_VISUAL_NOTE_TERMS[check])) {
        failures.push(`${decision.id}: ${check} rejection note ${reviewEvidenceFailure('note', SOURCE_VISUAL_NOTE_TERMS[check])}`);
      }
    }
    return { status, reviewer, note, failedChecks, failures };
  }

  const seenNotes = new Map();
  for (const check of REQUIRED_VISUAL_CHECKS) {
    const value = decision.visualChecks?.[check];
    if (!value) {
      failures.push(`${decision.id}: missing visual check ${check}`);
      continue;
    }
    const score = Number(value.score);
    const visualNote = String(value.note ?? '').trim();
    if (!Number.isFinite(score) || score < 4 || score > 5) failures.push(`${decision.id}: ${check} score must be 4-5`);
    if (!meaningfulReviewText(visualNote, MIN_VISUAL_NOTE_LENGTH)) failures.push(`${decision.id}: ${check} note ${reviewTextFailure('note', MIN_VISUAL_NOTE_LENGTH)}`);
    if (meaningfulReviewText(visualNote, MIN_VISUAL_NOTE_LENGTH) && !reviewNoteHasEvidenceTerms(visualNote, SOURCE_VISUAL_NOTE_TERMS[check])) {
      failures.push(`${decision.id}: ${check} note ${reviewEvidenceFailure('note', SOURCE_VISUAL_NOTE_TERMS[check])}`);
    }
    const normalized = normalizedNote(visualNote);
    if (normalized) {
      const previous = seenNotes.get(normalized);
      if (previous) failures.push(`${decision.id}: ${previous} and ${check} notes are identical`);
      else seenNotes.set(normalized, check);
    }
  }
  return { status, reviewer, note, failures };
}

function acceptArgsFor(decision, validation) {
  const status = validation.status;
  const commandArgs = [
    'tools/accept_source_candidate.mjs',
    '--id', decision.id,
    '--status', status,
    '--reviewed-by', validation.reviewer,
    '--note', validation.note,
  ];
  if (status === 'approved') {
    for (const check of REQUIRED_VISUAL_CHECKS) {
      commandArgs.push('--visual-check', check);
    }
    for (const check of REQUIRED_VISUAL_CHECKS) {
      commandArgs.push('--score', `${check}=${Number(decision.visualChecks[check].score)}`);
    }
    for (const check of REQUIRED_VISUAL_CHECKS) {
      commandArgs.push('--visual-note', `${check}=${String(decision.visualChecks[check].note).trim()}`);
    }
    commandArgs.push('--source-reviewed');
    commandArgs.push('--source-visual-board', 'public/review/source-visual-board.json');
  }
  if (status === 'rejected') {
    commandArgs.push('--source-rejected');
    commandArgs.push('--source-visual-board', 'public/review/source-visual-board.json');
    for (const check of validation.failedChecks ?? []) {
      commandArgs.push('--failed-check', check);
      const visualNote = String(decision.visualChecks?.[check]?.note ?? decision.failureNotes?.[check] ?? '').trim();
      commandArgs.push('--visual-note', `${check}=${visualNote}`);
    }
  }
  if (!APPLY) commandArgs.push('--dry-run');
  if (ALLOW_AI_REVIEWER) commandArgs.push('--allow-ai-reviewer');
  return commandArgs;
}

function commandString(commandArgs) {
  return `node ${commandArgs.map((arg) => /[\s'"]/u.test(String(arg)) ? shellQuote(arg) : arg).join(' ')}`;
}

const sourceCandidates = await readJson(paths.sourceCandidates);
if (sourceCandidates.schema !== 'water9/source-candidates@1') {
  throw new Error(`Unexpected source candidate schema ${sourceCandidates.schema ?? 'missing'}`);
}
const candidateIds = new Set((sourceCandidates.candidates ?? []).map((candidate) => candidate.id));
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
const fileLevelFailures = [];
if (decisionFile.policy?.humanAuthored !== true) fileLevelFailures.push('decision file policy.humanAuthored must be true');
if (decisionFile.policy?.automationCannotApproveCohesion !== true) fileLevelFailures.push('decision file policy.automationCannotApproveCohesion must be true');
if (decisionFile.policy?.inspectSourceKeySandboxAndPlan !== true) fileLevelFailures.push('decision file policy.inspectSourceKeySandboxAndPlan must be true');
if (APPLY && decisionFile.policy?.dryRunOnly === true) fileLevelFailures.push('decision file policy.dryRunOnly forbids --apply');
failures.push(...fileLevelFailures);
const decisions = Array.isArray(decisionFile.decisions) ? decisionFile.decisions : [];
const duplicateIds = new Set();
const seenIds = new Set();
for (const decision of decisions) {
  if (seenIds.has(decision.id)) duplicateIds.add(decision.id);
  seenIds.add(decision.id);
}
for (const id of duplicateIds) failures.push(`${id}: duplicate decision id`);

const results = [];
for (const decision of decisions) {
  const validation = validateDecision(decision, candidateIds, currentEvidenceFingerprints);
  failures.push(...validation.failures);
  if (validation.status === 'needs-review') {
    results.push({ id: decision.id, status: validation.status, pending: true, command: null, applied: false, failures: [...fileLevelFailures, ...validation.failures] });
    continue;
  }
  const commandArgs = acceptArgsFor(decision, validation);
  const command = commandString(commandArgs);
  const result = { id: decision.id, status: validation.status, pending: false, command, applied: APPLY && !fileLevelFailures.length, failures: [...fileLevelFailures, ...validation.failures] };
  if (!result.failures.length) {
    const spawned = spawnSync('node', commandArgs, { encoding: 'utf8', stdio: 'pipe' });
    result.exitCode = spawned.status;
    result.stdout = spawned.stdout.trim();
    result.stderr = spawned.stderr.trim();
    if (spawned.status !== 0) {
      failures.push(`${decision.id}: source accept command failed: ${result.stderr || result.stdout || `exit ${spawned.status}`}`);
      result.failures = [`source accept command failed: ${result.stderr || result.stdout || `exit ${spawned.status}`}`];
    }
  }
  results.push(result);
}

const summary = {
  schema: 'water9/source-cohesion-decision-run@1',
  generatedAt: new Date().toISOString(),
  report: paths.outReport,
  inputs: {
    decisions: paths.decisions,
    sourceCandidates: paths.sourceCandidates,
  },
  decisions: decisions.length,
  approved: results.filter((result) => result.status === 'approved').length,
  rejected: results.filter((result) => result.status === 'rejected').length,
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

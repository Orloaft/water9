import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import {
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
  if (args.has(key)) {
    const existing = args.get(key);
    args.set(key, Array.isArray(existing) ? [...existing, value] : [existing, value]);
  } else {
    args.set(key, value);
  }
}

function valuesFor(key) {
  const value = args.get(key);
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function splitValues(values) {
  return values.flatMap((value) => String(value).split(',').map((item) => item.trim()).filter(Boolean));
}

function parseKeyedTextValues(values) {
  const notes = new Map();
  for (const value of values) {
    const text = String(value);
    const separator = text.indexOf('=');
    if (separator <= 0) continue;
    const key = text.slice(0, separator).trim();
    const note = text.slice(separator + 1).trim();
    if (key && note) notes.set(key, note);
  }
  return notes;
}

function parseScoreValues(values) {
  const scores = new Map();
  for (const value of values) {
    const text = String(value);
    const separator = text.indexOf('=');
    if (separator <= 0) continue;
    const key = text.slice(0, separator).trim();
    const score = Number(text.slice(separator + 1).trim());
    if (key && Number.isFinite(score)) scores.set(key, score);
  }
  return scores;
}

function parseLooseValues(values) {
  return splitValues(values).map((value) => String(value).trim()).filter(Boolean);
}

function normalizedReviewNote(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function camelFlag(flag) {
  return flag.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
}

function flagPresent(flag) {
  return args.has(flag) || args.has(camelFlag(flag));
}

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
const MIN_VISUAL_SCORE = 4;
const STATUSES = new Set(['draft', 'needs-review', 'approved', 'rejected', 'rigged']);
const DISALLOWED_REVIEWERS = new Set(['codex', 'assistant', 'ai', 'agent', 'automation', 'bot', 'model']);
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

function usage() {
  console.error('Usage: node tools/accept_source_candidate.mjs --id <candidate-id> --status approved|rejected|needs-review|draft|rigged --reviewed-by <human-reviewer> --note <specific note> --visual-check <check-id>... --score <check-id>=4|5 --visual-note <check-id>=<specific rationale>... --source-reviewed [--source-visual-board public/review/source-visual-board.json] [--rigged-creature <creature-id>]');
  console.error('Rejection of the current source candidate requires --source-rejected, --source-visual-board public/review/source-visual-board.json, and at least one --failed-check <check-id> with a matching --visual-note <check-id>=<specific failure rationale>. Use npm run source:reject-attempt for logging a failed generation attempt or missing artifact.');
  console.error(`Required approval checks: ${REQUIRED_VISUAL_CHECKS.join(', ')}`);
  console.error(`Required visual scores: every approval check needs --score <check-id>=4 or 5`);
  console.error(`Required visual notes: every approval check needs --visual-note <check-id>=... with at least ${MIN_VISUAL_NOTE_LENGTH} characters`);
  console.error('Approval also requires current content plan coverage with a checked articulation plan and plan preview; run npm run content:plan-coverage before approval.');
}

async function sourceExists(path) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size >= 512;
  } catch {
    return false;
  }
}

async function readJsonOrError(path) {
  try {
    return { data: JSON.parse(await readFile(path, 'utf8')), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function evidenceFileOk(path, minSize = 128) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size >= minSize;
  } catch {
    return false;
  }
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function fileFingerprint(path) {
  try {
    const info = await stat(path);
    if (!info.isFile()) return { path, exists: false };
    return { path, exists: true, size: info.size, mtimeMs: Math.round(info.mtimeMs) };
  } catch {
    return { path, exists: false };
  }
}

async function fileShaFingerprint(path) {
  try {
    const info = await stat(path);
    if (!info.isFile()) return { path, exists: false };
    const sha256 = createHash('sha256').update(await readFile(path)).digest('hex');
    return { path, exists: true, size: info.size, mtimeMs: Math.round(info.mtimeMs), sha256 };
  } catch {
    return { path, exists: false };
  }
}

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'candidate';
}

async function candidateFingerprint(candidate) {
  const sourceFile = candidate.source ? await fileFingerprint(resolve(candidate.source)) : null;
  const payload = {
    tool: 'water9-source-candidate-review@2',
    candidate,
    sourceFile,
  };
  return createHash('sha256').update(stableJson(payload)).digest('hex');
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function containsEvery(haystack, needles) {
  const text = String(haystack ?? '');
  return needles.every((needle) => text.includes(String(needle)));
}

async function validateSourceArtContractEvidence(candidate, failures) {
  const fileBase = safeFileName(candidate.id);
  const contractJsonPath = `public/review/source-candidates/art-contracts/${fileBase}.json`;
  const contractMarkdownPath = `public/review/source-candidates/art-contracts/${fileBase}.md`;
  const contract = await readJsonOrError(resolve(contractJsonPath));
  if (contract.error) {
    failures.push(`${candidate.id}: source approval requires a current art contract: ${contract.error.message}; run npm run source:contracts`);
    return null;
  }
  if (contract.data?.schema !== 'water9/source-art-contract@1') {
    failures.push(`${candidate.id}: source art contract schema is ${contract.data?.schema ?? 'missing'}, expected water9/source-art-contract@1`);
  }
  if (contract.data?.id !== candidate.id) {
    failures.push(`${candidate.id}: source art contract id ${contract.data?.id ?? 'missing'} does not match candidate`);
  }
  if (contract.data?.expectedOutput !== `public/assets/generated/fauna-${candidate.id}-whole-source.png`) {
    failures.push(`${candidate.id}: source art contract expectedOutput is missing or stale`);
  }
  if (contract.data?.source && contract.data.source !== candidate.source) {
    failures.push(`${candidate.id}: source art contract source ${contract.data.source} does not match candidate source ${candidate.source}`);
  }
  const requiredRead = asArray(candidate.requiredRead);
  const articulatableParts = asArray(candidate.articulatableParts);
  const promptRisks = asArray(candidate.promptRisks);
  const contractChecks = asArray(candidate.contractReviewChecklist);
  const contractRequiredRead = asArray(contract.data?.requiredRead);
  const contractParts = asArray(contract.data?.articulatableParts);
  const contractRisks = asArray(contract.data?.promptRisks);
  const contractReviewChecks = asArray(contract.data?.contractReviewChecklist);
  if (!containsEvery(contractRequiredRead.join('\n'), requiredRead)) {
    failures.push(`${candidate.id}: source art contract is missing candidate requiredRead entries`);
  }
  if (!containsEvery(contractParts.join('\n'), articulatableParts)) {
    failures.push(`${candidate.id}: source art contract is missing candidate articulatableParts entries`);
  }
  if (!containsEvery(contractRisks.join('\n'), promptRisks)) {
    failures.push(`${candidate.id}: source art contract is missing candidate promptRisks entries`);
  }
  if (!containsEvery(contractReviewChecks.join('\n'), contractChecks)) {
    failures.push(`${candidate.id}: source art contract is missing candidate contractReviewChecklist entries`);
  }
  if (!containsEvery(contract.data?.generationPrompt, [
    ...requiredRead,
    ...contractChecks,
    'One-source proof:',
    'Connection proof:',
    'Style proof:',
    'Proportion proof:',
    'Production proof:',
  ])) {
    failures.push(`${candidate.id}: source art contract generation prompt is missing required cohesion/contract text`);
  }
  if (!(await evidenceFileOk(resolve(contractMarkdownPath), 1024))) {
    failures.push(`${candidate.id}: source art contract markdown is missing or too small`);
  }
  const jsonFingerprint = await fileShaFingerprint(resolve(contractJsonPath));
  const markdownFingerprint = await fileShaFingerprint(resolve(contractMarkdownPath));
  if (!jsonFingerprint.sha256) failures.push(`${candidate.id}: source art contract JSON fingerprint could not be calculated`);
  if (!markdownFingerprint.sha256) failures.push(`${candidate.id}: source art contract markdown fingerprint could not be calculated`);
  return {
    schema: 'water9/source-art-contract-review@1',
    recordedAt: new Date().toISOString(),
    id: candidate.id,
    json: contractJsonPath,
    markdown: contractMarkdownPath,
    jsonFingerprint,
    markdownFingerprint,
    expectedOutput: contract.data?.expectedOutput ?? null,
  };
}

async function validatePlanCoverageEvidence(candidate, failures) {
  const planCoveragePath = resolve(String(args.get('plan-coverage') ?? args.get('planCoverage') ?? 'public/review/content-plan-coverage.json'));
  const planCoverage = await readJsonOrError(planCoveragePath);
  if (planCoverage.error) {
    failures.push(`${candidate.id}: source approval requires content plan coverage: ${planCoverage.error.message}; run npm run content:plan-coverage`);
    return null;
  }
  if (planCoverage.data?.schema !== 'water9/content-plan-coverage@1') {
    failures.push(`${candidate.id}: content plan coverage schema is ${planCoverage.data?.schema ?? 'missing'}, expected water9/content-plan-coverage@1`);
  }
  const item = (planCoverage.data?.items ?? []).find((entry) => entry.id === candidate.id);
  if (!item) {
    failures.push(`${candidate.id}: content plan coverage is missing this candidate; run npm run content:plan-coverage`);
    return null;
  }
  if (item.source !== candidate.source) {
    failures.push(`${candidate.id}: content plan coverage source ${item.source ?? 'missing'} does not match candidate source ${candidate.source ?? 'missing'}`);
  }
  if (item.hasSource !== true) {
    failures.push(`${candidate.id}: content plan coverage does not record a source image`);
  }
  if (item.artifacts?.plan?.exists !== true || !(await evidenceFileOk(resolve(item.artifacts?.plan?.path ?? ''), 1024))) {
    failures.push(`${candidate.id}: articulation plan artifact is missing or too small; run ${item.commands?.mechanicalPrepare ?? 'npm run content:plan-coverage'}`);
  }
  if (item.artifacts?.planPreview?.exists !== true || !(await evidenceFileOk(resolve(item.artifacts?.planPreview?.path ?? ''), 1024))) {
    failures.push(`${candidate.id}: articulation plan preview is missing or too small; run ${item.commands?.planPreview ?? 'npm run content:plan-coverage'}`);
  }
  if (!String(item.commands?.planCheck ?? '').includes('--plan')) {
    failures.push(`${candidate.id}: content plan coverage is missing a plan-check command`);
  }
  if (!String(item.commands?.productionPrepare ?? '').includes(`--id ${candidate.id}`)) {
    failures.push(`${candidate.id}: content plan coverage production prepare command is missing or not target-aware`);
  }
  if (String(item.commands?.productionPrepare ?? '').includes('--allow-unapproved')) {
    failures.push(`${candidate.id}: content plan coverage production prepare command must not use --allow-unapproved`);
  }
  const planFingerprint = item.artifacts?.plan?.path ? await fileShaFingerprint(resolve(item.artifacts.plan.path)) : null;
  const previewFingerprint = item.artifacts?.planPreview?.path ? await fileShaFingerprint(resolve(item.artifacts.planPreview.path)) : null;
  if (!planFingerprint?.sha256) failures.push(`${candidate.id}: articulation plan fingerprint could not be calculated`);
  if (!previewFingerprint?.sha256) failures.push(`${candidate.id}: articulation plan preview fingerprint could not be calculated`);
  return {
    schema: 'water9/source-plan-coverage-review@1',
    recordedAt: new Date().toISOString(),
    id: candidate.id,
    report: String(args.get('plan-coverage') ?? args.get('planCoverage') ?? 'public/review/content-plan-coverage.json'),
    stage: item.stage ?? null,
    runtimeRegistered: item.runtimeRegistered === true,
    runtimeId: item.runtimeId ?? null,
    plan: item.plan ?? item.artifacts?.plan?.path ?? null,
    planPreview: item.planPreview ?? item.artifacts?.planPreview?.path ?? null,
    planFingerprint,
    previewFingerprint,
    commands: {
      planCheck: item.commands?.planCheck ?? null,
      planPreview: item.commands?.planPreview ?? null,
      productionPrepare: item.commands?.productionPrepare ?? null,
    },
  };
}

function pathForPublicUrl(url) {
  if (!url) return null;
  if (String(url).startsWith('/review/')) return resolve('public', String(url).slice(1));
  if (String(url).startsWith('/assets/')) return resolve('public', String(url).slice(1));
  if (String(url).startsWith('public/')) return resolve(String(url));
  return null;
}

async function validateSourceVisualBoardEvidence(candidate, failures) {
  const boardPath = resolve(String(args.get('source-visual-board') ?? args.get('sourceVisualBoard') ?? 'public/review/source-visual-board.json'));
  const board = await readJsonOrError(boardPath);
  if (board.error) {
    failures.push(`${candidate.id}: source approval requires source visual board evidence: ${board.error.message}; run npm run source:visual-board`);
    return null;
  }
  if (board.data?.schema !== 'water9/source-visual-board@1') {
    failures.push(`${candidate.id}: source visual board schema is ${board.data?.schema ?? 'missing'}, expected water9/source-visual-board@1`);
  }
  const boardIds = (board.data?.items ?? []).map((entry) => entry.id).filter(Boolean);
  if (new Set(boardIds).size !== boardIds.length) {
    failures.push(`${candidate.id}: source visual board has duplicate candidate rows`);
  }
  const item = (board.data?.items ?? []).find((entry) => entry.id === candidate.id);
  if (!item) {
    failures.push(`${candidate.id}: source visual board is missing this candidate; run npm run source:visual-board`);
    return null;
  }
  if (item.species !== candidate.species) {
    failures.push(`${candidate.id}: source visual board species ${item.species ?? 'missing'} does not match candidate species ${candidate.species ?? 'missing'}`);
  }
  if (item.readyForHumanReview !== true) {
    failures.push(`${candidate.id}: source visual board does not mark candidate ready for human review`);
  }
  if (!Array.isArray(item.requiredRead) || item.requiredRead.length < 3) {
    failures.push(`${candidate.id}: source visual board required-read evidence is too weak`);
  }
  if (!Array.isArray(item.contractReviewChecklist) || item.contractReviewChecklist.length < 1) {
    failures.push(`${candidate.id}: source visual board is missing contract review checklist`);
  }
  if (!Array.isArray(item.blockers) || !item.blockers.includes('human source approval missing')) {
    failures.push(`${candidate.id}: source visual board must expose missing human approval before approval`);
  }
  const media = item.media ?? {};
  const mediaEvidence = {};
  for (const label of ['source', 'keyPreview', 'sandboxScreenshot', 'planPreview']) {
    const url = media[label];
    if (!url) {
      failures.push(`${candidate.id}: source visual board missing ${label}`);
      continue;
    }
    if (!String(url).includes(candidate.id)) {
      failures.push(`${candidate.id}: source visual board ${label} URL does not contain candidate id`);
    }
    const path = pathForPublicUrl(url);
    if (!path) {
      failures.push(`${candidate.id}: source visual board ${label} URL is not project-local`);
      continue;
    }
    if (!(await evidenceFileOk(path, 512))) {
      failures.push(`${candidate.id}: source visual board ${label} file is missing or too small`);
      continue;
    }
    const stored = item.mediaEvidence?.[label];
    const current = await fileShaFingerprint(path);
    if (!stored?.sha256 || !stored?.size) {
      failures.push(`${candidate.id}: source visual board ${label} is missing stored fingerprint`);
    }
    if (stored?.sha256 && current.sha256 && stored.sha256 !== current.sha256) {
      failures.push(`${candidate.id}: source visual board ${label} sha256 is stale`);
    }
    if (stored?.size && current.size && stored.size !== current.size) {
      failures.push(`${candidate.id}: source visual board ${label} size is stale`);
    }
    mediaEvidence[label] = {
      url,
      path,
      fingerprint: current,
    };
  }
  return {
    schema: 'water9/source-visual-board-review@1',
    recordedAt: new Date().toISOString(),
    id: candidate.id,
    report: String(args.get('source-visual-board') ?? args.get('sourceVisualBoard') ?? 'public/review/source-visual-board.json'),
    state: item.state ?? null,
    readyForHumanReview: item.readyForHumanReview === true,
    media: mediaEvidence,
    requiredReadCount: Array.isArray(item.requiredRead) ? item.requiredRead.length : 0,
    contractReviewChecklistCount: Array.isArray(item.contractReviewChecklist) ? item.contractReviewChecklist.length : 0,
  };
}

async function validateSourceReviewEvidence(candidate, failures) {
  const reviewDir = resolve('public/review/source-candidates');
  const review = await readJsonOrError(resolve(reviewDir, 'review-manifest.json'));
  if (review.error) {
    failures.push(`source approval requires source gallery evidence: ${review.error.message}`);
    return;
  }
  if (review.data?.schema !== 'water9/source-candidate-review@1') {
    failures.push(`source review manifest schema is ${review.data?.schema ?? 'missing'}, expected water9/source-candidate-review@1`);
  }
  const item = (review.data?.candidates ?? []).find((entry) => entry.id === candidate.id);
  if (!item) {
    failures.push(`${candidate.id}: source review manifest is missing this candidate; run npm run source:gallery`);
    return;
  }
  const expectedFingerprint = await candidateFingerprint(candidate);
  if (!item.inputFingerprint) {
    failures.push(`${candidate.id}: source review item is missing inputFingerprint; run npm run source:gallery`);
  } else if (item.inputFingerprint !== expectedFingerprint) {
    failures.push(`${candidate.id}: source review item is stale; run npm run source:gallery before approval`);
  }
  if (!item.source || item.source !== candidate.source) {
    failures.push(`${candidate.id}: source review item source does not match the candidate source`);
  }
  if (!item.sourceThumbFile) {
    failures.push(`${candidate.id}: source review item is missing source thumbnail`);
  } else if (!(await evidenceFileOk(resolve(reviewDir, item.sourceThumbFile), 512))) {
    failures.push(`${candidate.id}: source thumbnail is missing or too small`);
  }
  if (!item.keyPreviewFile) {
    failures.push(`${candidate.id}: source review item is missing chroma key preview`);
  } else if (!(await evidenceFileOk(resolve(reviewDir, item.keyPreviewFile), 1024))) {
    failures.push(`${candidate.id}: chroma key preview is missing or too small`);
  }
}

async function findSandboxReportPaths() {
  const sandboxReportDir = resolve(String(args.get('sandbox-report-dir') ?? 'tools/scratch'));
  const sourcePreviewReportPath = resolve(String(args.get('source-preview-report') ?? 'tools/scratch/source-preview-visuals-report.json'));
  const pathsByName = new Map([[sourcePreviewReportPath, sourcePreviewReportPath]]);
  let entries = [];
  try {
    entries = await readdir(sandboxReportDir, { withFileTypes: true });
  } catch {
    return [...pathsByName.values()];
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (
      !/^sandbox.*report.*\.json$/.test(entry.name)
      && !/^sandbox-visuals.*report.*\.json$/.test(entry.name)
      && !/^[a-z0-9_-]+-visuals-report\.json$/.test(entry.name)
    ) continue;
    const path = resolve(sandboxReportDir, entry.name);
    pathsByName.set(path, path);
  }
  return [...pathsByName.values()].sort();
}

async function validateSourcePreviewEvidence(candidate, failures) {
  const previewId = `source-${candidate.id}`;
  const results = [];
  for (const path of await findSandboxReportPaths()) {
    const report = await readJsonOrError(path);
    if (report.error || report.data?.schema !== 'water9/sandbox-visual-check@1') continue;
    const info = await stat(path).catch(() => null);
    for (const result of report.data.results ?? []) {
      if (result.id === previewId) results.push({ ...result, reportPath: path, reportMtimeMs: info?.mtimeMs ?? 0 });
    }
  }
  const result = results.sort((left, right) => right.reportMtimeMs - left.reportMtimeMs)[0];
  if (!result) {
    failures.push(`${candidate.id}: source preview visual report is missing; run npm run source:preview-check before source approval`);
    return;
  }
  if ((result.failures ?? []).length) {
    failures.push(`${candidate.id}: source preview visual report has failures: ${result.failures.join('; ')}`);
  }
  if (result.snapshot?.entryId !== previewId) {
    failures.push(`${candidate.id}: source preview entryId ${result.snapshot?.entryId ?? 'missing'} does not match ${previewId}`);
  }
  if (result.snapshot?.previewTexture !== previewId) {
    failures.push(`${candidate.id}: source preview texture ${result.snapshot?.previewTexture ?? 'missing'} does not match ${previewId}`);
  }
  if (!result.snapshot?.hasPreviewSprite) {
    failures.push(`${candidate.id}: source preview did not render a preview sprite`);
  }
  const canvas = result.canvas ?? {};
  if (!canvas.exists || Number(canvas.width) <= 0 || Number(canvas.height) <= 0) {
    failures.push(`${candidate.id}: source preview has missing or zero-sized canvas`);
  }
  if (Number(canvas.opaqueSamples ?? 0) < 120 || Number(canvas.variedSamples ?? 0) < 8 || Number(canvas.lumaRange ?? 0) < 12) {
    failures.push(`${candidate.id}: source preview canvas appears blank or underdrawn`);
  }
  if (!result.screenshotPath || !(await evidenceFileOk(resolve(result.screenshotPath), 1024))) {
    failures.push(`${candidate.id}: source preview screenshot is missing or too small`);
  }
}

function compactImageValidationMetric(metric) {
  return {
    id: metric.id,
    source: metric.source,
    sourceFingerprint: metric.sourceFingerprint,
    validationFingerprint: metric.validationFingerprint,
    validator: metric.validator,
    checked: metric.checked === true,
    size: metric.size,
    borderMagenta: metric.borderMagenta,
    backgroundRatio: metric.backgroundRatio,
    subjectBBox: metric.subjectBBox,
    subjectSize: metric.subjectSize,
    innerMagentaRatio: metric.innerMagentaRatio,
    detail: metric.detail,
    connectivity: metric.connectivity,
    failures: Array.isArray(metric.failures) ? metric.failures : [],
  };
}

async function runSourceImageValidation(candidate, failures) {
  const reportPath = `tools/scratch/source-image-validation-${candidate.id}.json`;
  const result = spawnSync(
    'python3',
    [
      'tools/validate_source_candidate_images.py',
      '--manifest', manifestPath,
      '--id', candidate.id,
      '--report', reportPath,
    ],
    { encoding: 'utf8', stdio: 'pipe' },
  );
  let summary = null;
  try {
    summary = JSON.parse(result.stdout || '{}');
  } catch {
    failures.push(`${candidate.id}: source image validation did not return parseable JSON`);
  }
  if (result.status !== 0) {
    const reportedFailures = Array.isArray(summary?.failures) && summary.failures.length
      ? summary.failures.join('; ')
      : String(result.stderr || result.stdout || 'unknown validation failure').trim();
    failures.push(`${candidate.id}: source image validation failed: ${reportedFailures}`);
  }
  if (summary?.schema !== 'water9/source-image-validation@1') {
    failures.push(`${candidate.id}: source image validation schema is ${summary?.schema ?? 'missing'}`);
  }
  if (!String(summary?.generatedAt ?? '').trim()) {
    failures.push(`${candidate.id}: source image validation is missing generatedAt`);
  }
  const metric = summary?.metrics?.find((entry) => entry.id === candidate.id);
  if (!metric) {
    failures.push(`${candidate.id}: source image validation report is missing this candidate`);
    return null;
  }
  if (metric.source !== candidate.source) {
    failures.push(`${candidate.id}: source image validation source ${metric.source ?? 'missing'} does not match candidate source ${candidate.source ?? 'missing'}`);
  }
  if (metric.checked !== true) {
    failures.push(`${candidate.id}: source image validation did not check this source image`);
  }
  if ((metric.failures ?? []).length) {
    failures.push(`${candidate.id}: source image validation metric has failures: ${metric.failures.join('; ')}`);
  }
  if (!metric.sourceFingerprint?.sha256) {
    failures.push(`${candidate.id}: source image validation is missing source sha256 fingerprint`);
  }
  if (!metric.validationFingerprint) {
    failures.push(`${candidate.id}: source image validation is missing validationFingerprint`);
  }
  if (metric.validator?.version !== 'water9/source-image-validation@1') {
    failures.push(`${candidate.id}: source image validation metric has validator version ${metric.validator?.version ?? 'missing'}`);
  }
  const sourceFingerprint = candidate.source ? await fileShaFingerprint(resolve(candidate.source)) : null;
  if (sourceFingerprint?.sha256 && metric.sourceFingerprint?.sha256 && sourceFingerprint.sha256 !== metric.sourceFingerprint.sha256) {
    failures.push(`${candidate.id}: source image validation source sha256 does not match current source image`);
  }
  if (sourceFingerprint?.size && metric.sourceFingerprint?.size && sourceFingerprint.size !== metric.sourceFingerprint.size) {
    failures.push(`${candidate.id}: source image validation source size does not match current source image`);
  }
  const reportFingerprint = await fileShaFingerprint(resolve(reportPath));
  if (!reportFingerprint.sha256) {
    failures.push(`${candidate.id}: source image validation report was not written to ${reportPath}`);
  }
  return {
    schema: summary?.schema ?? 'water9/source-image-validation@1',
    generatedAt: summary?.generatedAt ?? null,
    recordedAt: new Date().toISOString(),
    report: reportPath,
    reportFingerprint,
    sourceFingerprint,
    validationFingerprint: metric.validationFingerprint ?? null,
    validator: metric.validator ?? null,
    metric: compactImageValidationMetric(metric),
  };
}

const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const id = args.get('id');
const status = String(args.get('status') ?? 'approved');
const reviewedBy = args.get('reviewed-by') ?? args.get('reviewedBy');
const reviewerName = typeof reviewedBy === 'string' ? reviewedBy.trim() : reviewedBy;
const reviewerKey = String(reviewerName ?? '').trim().toLowerCase();
const note = args.get('note');
const approvalNote = typeof note === 'string' ? note.trim() : note;
const dryRun = flagPresent('dry-run');
const allowAiReviewer = flagPresent('allow-ai-reviewer');
const riggedCreatureId = args.get('rigged-creature') ?? args.get('riggedCreature');

if (!id || !STATUSES.has(status)) {
  usage();
  process.exit(1);
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const candidates = Array.isArray(manifest.candidates) ? manifest.candidates : [];
const candidate = candidates.find((entry) => entry.id === id);
if (!candidate) {
  console.error(`No source candidate found with id ${id}`);
  process.exit(1);
}

const suppliedVisualChecks = new Set(splitValues([
  ...valuesFor('visual-check'),
  ...valuesFor('visualCheck'),
]));
const unknownVisualChecks = [...suppliedVisualChecks].filter((check) => !REQUIRED_VISUAL_CHECKS.includes(check));
if (unknownVisualChecks.length) {
  usage();
  console.error(`Unknown visual check(s): ${unknownVisualChecks.join(', ')}`);
  process.exit(1);
}
const suppliedVisualNotes = parseKeyedTextValues([
  ...valuesFor('visual-note'),
  ...valuesFor('visualNote'),
  ...valuesFor('check-note'),
  ...valuesFor('checkNote'),
]);
const suppliedVisualScores = parseScoreValues([
  ...valuesFor('score'),
  ...valuesFor('visual-score'),
  ...valuesFor('visualScore'),
]);
const suppliedFailedChecks = new Set(parseLooseValues([
  ...valuesFor('failed-check'),
  ...valuesFor('failedCheck'),
]));
const unknownFailedChecks = [...suppliedFailedChecks].filter((check) => !REQUIRED_VISUAL_CHECKS.includes(check));
if (unknownFailedChecks.length) {
  usage();
  console.error(`Unknown failed check(s): ${unknownFailedChecks.join(', ')}`);
  process.exit(1);
}
const unknownVisualScores = [...suppliedVisualScores.keys()].filter((check) => !REQUIRED_VISUAL_CHECKS.includes(check));
if (unknownVisualScores.length) {
  usage();
  console.error(`Unknown visual score(s): ${unknownVisualScores.join(', ')}`);
  process.exit(1);
}
const unknownVisualNotes = [...suppliedVisualNotes.keys()].filter((check) => !REQUIRED_VISUAL_CHECKS.includes(check));
if (unknownVisualNotes.length) {
  usage();
  console.error(`Unknown visual note(s): ${unknownVisualNotes.join(', ')}`);
  process.exit(1);
}

const accepting = status === 'approved' || status === 'rigged';
const rejecting = status === 'rejected';
const failures = [];
let sourceImageValidation = null;
let sourceArtContract = null;
let planCoverageEvidence = null;
let sourceVisualBoardEvidence = null;

if ((accepting || rejecting) && !reviewerName) failures.push(`${status} source review requires --reviewed-by`);
if ((accepting || rejecting) && !meaningfulReviewText(approvalNote)) failures.push(`${status} source review requires a specific --note; ${reviewTextFailure('--note')}`);
if ((accepting || rejecting) && DISALLOWED_REVIEWERS.has(reviewerKey) && !allowAiReviewer) failures.push('source review needs a human reviewer, not an AI/self reviewer');
if (accepting && candidate.sourceCohesion !== 'single-source') failures.push('sourceCohesion must be single-source before approval');
if (accepting && candidate.backgroundKey !== 'magenta') failures.push('backgroundKey must be magenta before approval');
if ((accepting || rejecting) && !candidate.source) failures.push('source review requires a whole-source image path');
if ((accepting || rejecting) && candidate.source && !(await sourceExists(resolve(candidate.source)))) failures.push(`whole-source image ${candidate.source} is missing or too small`);
if (accepting && !flagPresent('source-reviewed')) failures.push('source approval requires --source-reviewed');
if (rejecting && !flagPresent('source-rejected')) failures.push('source rejection requires --source-rejected to distinguish candidate rejection from rejected generation attempts');
if (rejecting && suppliedFailedChecks.size < 1) failures.push('source rejection requires at least one --failed-check <check-id>');
if (accepting) await validateSourceReviewEvidence(candidate, failures);
if (accepting) await validateSourcePreviewEvidence(candidate, failures);
if (accepting) sourceArtContract = await validateSourceArtContractEvidence(candidate, failures);
if (accepting) planCoverageEvidence = await validatePlanCoverageEvidence(candidate, failures);
if (rejecting) await validateSourceReviewEvidence(candidate, failures);
if (rejecting) await validateSourcePreviewEvidence(candidate, failures);
if (rejecting) sourceArtContract = await validateSourceArtContractEvidence(candidate, failures);
if (rejecting) planCoverageEvidence = await validatePlanCoverageEvidence(candidate, failures);
if (accepting || rejecting) sourceVisualBoardEvidence = await validateSourceVisualBoardEvidence(candidate, failures);
if (accepting) sourceImageValidation = await runSourceImageValidation(candidate, failures);
if (status === 'rigged' && !riggedCreatureId) failures.push('rigged source candidates require --rigged-creature <creature-id>');
for (const check of REQUIRED_VISUAL_CHECKS) {
  if (accepting && !suppliedVisualChecks.has(check)) failures.push(`visual check missing: ${check}`);
  const visualScore = suppliedVisualScores.get(check);
  if (accepting && (!Number.isFinite(visualScore) || visualScore < MIN_VISUAL_SCORE || visualScore > 5)) {
    failures.push(`visual score for ${check} must be ${MIN_VISUAL_SCORE}-5; got ${visualScore ?? 'missing'}`);
  }
  const visualNote = suppliedVisualNotes.get(check);
  if (accepting && !meaningfulReviewText(visualNote, MIN_VISUAL_NOTE_LENGTH)) {
    failures.push(`visual note for ${check} ${reviewTextFailure('rationale', MIN_VISUAL_NOTE_LENGTH)}`);
  }
  if (accepting && meaningfulReviewText(visualNote, MIN_VISUAL_NOTE_LENGTH) && !reviewNoteHasEvidenceTerms(visualNote, SOURCE_VISUAL_NOTE_TERMS[check])) {
    failures.push(`visual note for ${check} ${reviewEvidenceFailure('rationale', SOURCE_VISUAL_NOTE_TERMS[check])}`);
  }
  if (rejecting && suppliedFailedChecks.has(check) && !meaningfulReviewText(visualNote, MIN_VISUAL_NOTE_LENGTH)) {
    failures.push(`failed visual note for ${check} ${reviewTextFailure('failure rationale', MIN_VISUAL_NOTE_LENGTH)}`);
  }
  if (rejecting && suppliedFailedChecks.has(check) && meaningfulReviewText(visualNote, MIN_VISUAL_NOTE_LENGTH) && !reviewNoteHasEvidenceTerms(visualNote, SOURCE_VISUAL_NOTE_TERMS[check])) {
    failures.push(`failed visual note for ${check} ${reviewEvidenceFailure('failure rationale', SOURCE_VISUAL_NOTE_TERMS[check])}`);
  }
}
if (accepting) {
  const seenNotes = new Map();
  for (const check of REQUIRED_VISUAL_CHECKS) {
    const normalized = normalizedReviewNote(suppliedVisualNotes.get(check));
    if (!normalized) continue;
    const previous = seenNotes.get(normalized);
    if (previous) {
      failures.push(`visual notes for ${previous} and ${check} are identical; each check needs check-specific evidence`);
    } else {
      seenNotes.set(normalized, check);
    }
  }
}

if (failures.length) {
  console.error(`Cannot set source candidate ${id} to ${status}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

candidate.status = status;
if (accepting || rejecting) {
  if (status === 'rigged') {
    candidate.riggedCreatureId = riggedCreatureId;
    candidate.riggedAt = candidate.riggedAt ?? new Date().toISOString();
  }
  candidate.review = {
    status,
    decisionType: rejecting ? 'source-candidate-rejection' : 'source-candidate-approval',
    reviewedBy: reviewerName,
    reviewedAt: new Date().toISOString(),
    note: approvalNote,
    visualChecklist: Object.fromEntries(REQUIRED_VISUAL_CHECKS.map((check) => [check, accepting ? suppliedVisualChecks.has(check) : rejecting ? !suppliedFailedChecks.has(check) : false])),
    failedVisualChecks: rejecting ? [...suppliedFailedChecks] : [],
    visualScores: Object.fromEntries(REQUIRED_VISUAL_CHECKS.map((check) => [check, accepting ? suppliedVisualScores.get(check) ?? null : null])),
    visualNotes: Object.fromEntries(REQUIRED_VISUAL_CHECKS.map((check) => [check, accepting || (rejecting && suppliedFailedChecks.has(check)) ? suppliedVisualNotes.get(check) ?? null : null])),
    reviewEvidence: {
      'whole-source': accepting ? flagPresent('source-reviewed') : false,
      'source-rejected': rejecting ? flagPresent('source-rejected') : false,
      'source-preview': accepting || rejecting,
      'source-image-validation': accepting && Boolean(sourceImageValidation),
      'source-art-contract': (accepting || rejecting) && Boolean(sourceArtContract),
      'articulation-plan-preview': (accepting || rejecting) && Boolean(planCoverageEvidence),
      'source-visual-board': (accepting || rejecting) && Boolean(sourceVisualBoardEvidence),
    },
    imageValidation: accepting ? sourceImageValidation : null,
    artContract: accepting ? sourceArtContract : null,
    planCoverage: accepting ? planCoverageEvidence : null,
    sourceVisualBoard: accepting ? sourceVisualBoardEvidence : null,
  };
} else if (status === 'draft' || status === 'needs-review') {
  candidate.review = null;
  candidate.riggedCreatureId = undefined;
  candidate.riggedAt = undefined;
}

if (!dryRun) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ id, status, riggedCreatureId: candidate.riggedCreatureId ?? null, reviewedBy: candidate.review?.reviewedBy ?? null, dryRun }, null, 2));

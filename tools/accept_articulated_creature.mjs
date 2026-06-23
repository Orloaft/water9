import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import {
  MIN_VISUAL_NOTE_LENGTH,
  distinctReviewNotes,
  meaningfulReviewText,
  reviewEvidenceFailure,
  reviewNoteHasEvidenceTerms,
  reviewTextFailure,
} from './review_text_quality.mjs';
import {
  THREAT_EVIDENCE_FINGERPRINT_SCHEMA,
  buildThreatEvidenceFingerprint,
  latestSandboxResultFor,
} from './content_threat_evidence_fingerprint.mjs';

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

function parseScoreValues(values) {
  const scores = new Map();
  for (const value of splitValues(values)) {
    const [rawId, rawScore] = value.split('=');
    const score = Number(rawScore);
    if (rawId && Number.isFinite(score)) scores.set(rawId.trim(), score);
  }
  return scores;
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

function camelFlag(flag) {
  return flag.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
}

function flagPresent(flag) {
  return args.has(flag) || args.has(camelFlag(flag));
}

const REQUIRED_VISUAL_CHECKS = [
  { id: 'single-source-cohesion', label: 'whole source reads as one creature design' },
  { id: 'readable-silhouette', label: 'silhouette is readable at game scale' },
  { id: 'anatomy-cohesion', label: 'parts keep believable anatomy and orientation' },
  { id: 'production-visual-cohesion', label: 'assembled creature reads as production-intent art, not a placeholder prototype' },
  { id: 'socket-seams', label: 'joints and overlays do not reveal broken seams' },
  { id: 'motion-stability', label: 'phase strip motion avoids jitter and frame popping' },
  { id: 'sandbox-behavior', label: 'sandbox preview feels alive and non-placeholder' },
];
const MIN_VISUAL_SCORE = 4;

const REQUIRED_REVIEW_EVIDENCE = [
  { id: 'whole-source', flag: 'source-reviewed', label: 'whole source image was inspected' },
  { id: 'contact-sheet', flag: 'contact-reviewed', label: 'contact sheet was inspected' },
  { id: 'phase-strip', flag: 'phase-reviewed', label: 'phase strip was inspected for jitter and popping' },
  { id: 'source-parity', flag: 'parity-reviewed', label: 'source-parity overlay was inspected against the whole source' },
  { id: 'sandbox-preview', flag: 'sandbox-reviewed', label: 'browser sandbox was inspected in motion' },
];
const REQUIRED_SANDBOX_STATES = ['idle', 'lunge', 'stunned'];

const DISALLOWED_REVIEWERS = new Set(['codex', 'assistant', 'ai', 'agent', 'automation', 'bot', 'model']);
const REQUIRED_SOURCE_VISUAL_CHECKS = [
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
const MIN_SOURCE_VISUAL_SCORE = 4;
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
const RIG_VISUAL_NOTE_TERMS = {
  'single-source-cohesion': ['source', 'cohesion', 'parity', 'whole', 'same creature'],
  'readable-silhouette': ['silhouette', 'outline', 'scale', 'readable', 'shape'],
  'anatomy-cohesion': ['anatomy', 'orientation', 'part', 'jaw', 'body', 'tail', 'limb'],
  'production-visual-cohesion': ['production', 'placeholder', 'palette', 'lighting', 'material', 'cohesion'],
  'socket-seams': ['socket', 'seam', 'joint', 'overlay', 'connection'],
  'motion-stability': ['phase', 'motion', 'jitter', 'popping', 'frame', 'animation'],
  'sandbox-behavior': ['sandbox', 'idle', 'lunge', 'stunned', 'diver', 'behavior', 'motion'],
};

function usage() {
  console.error('Usage: node tools/accept_articulated_creature.mjs --id <creature-id> --status accepted|prototype --reviewed-by <human-reviewer> --source-candidate <candidate-id> --note <specific approval note> --visual-check <check-id>... --score <check-id>=4|5 ... --visual-note <check-id>=<specific rationale>... --source-reviewed --contact-reviewed --phase-reviewed --parity-reviewed --sandbox-reviewed');
  console.error(`Required visual checks: ${REQUIRED_VISUAL_CHECKS.map((check) => check.id).join(', ')}`);
  console.error(`Required visual scores: each required check must have --score <check-id>=4 or 5`);
  console.error(`Required visual notes: each required check must have --visual-note <check-id>=... with at least ${MIN_VISUAL_NOTE_LENGTH} characters`);
  console.error(`Required evidence flags: ${REQUIRED_REVIEW_EVIDENCE.map((check) => `--${check.flag}`).join(' ')}`);
}

function sourceCandidateApproved(candidate) {
  const review = candidate?.review ?? {};
  const reviewer = String(review.reviewedBy ?? '').trim().toLowerCase();
  return Boolean(candidate)
    && (candidate.status === 'approved' || candidate.status === 'rigged')
    && Boolean(String(candidate.source ?? '').trim())
    && review.status === 'approved'
    && candidate.sourceCohesion === 'single-source'
    && candidate.backgroundKey === 'magenta'
    && Boolean(String(review.reviewedBy ?? '').trim())
    && Boolean(String(review.reviewedAt ?? '').trim())
    && !DISALLOWED_REVIEWERS.has(reviewer)
    && meaningfulReviewText(review.note)
    && REQUIRED_SOURCE_VISUAL_CHECKS.every((check) => review.visualChecklist?.[check] === true)
    && REQUIRED_SOURCE_VISUAL_CHECKS.every((check) => Number.isFinite(review.visualScores?.[check]) && review.visualScores[check] >= MIN_SOURCE_VISUAL_SCORE && review.visualScores[check] <= 5)
    && REQUIRED_SOURCE_VISUAL_CHECKS.every((check) => meaningfulReviewText(review.visualNotes?.[check], MIN_VISUAL_NOTE_LENGTH))
    && REQUIRED_SOURCE_VISUAL_CHECKS.every((check) => reviewNoteHasEvidenceTerms(review.visualNotes?.[check], SOURCE_VISUAL_NOTE_TERMS[check]))
    && review.reviewEvidence?.['whole-source'] === true
    && review.reviewEvidence?.['source-preview'] === true
    && review.reviewEvidence?.['source-image-validation'] === true
    && sourceCandidateImageValidationRecorded(candidate);
}

function sourceCandidateImageValidationRecorded(candidate) {
  const validation = candidate?.review?.imageValidation;
  const metric = validation?.metric;
  return validation?.schema === 'water9/source-image-validation@1'
    && Boolean(String(validation.generatedAt ?? '').trim())
    && Boolean(String(validation.report ?? '').trim())
    && Boolean(validation.reportFingerprint?.sha256)
    && Boolean(validation.sourceFingerprint?.sha256)
    && Boolean(validation.validationFingerprint)
    && metric?.id === candidate.id
    && metric?.source === candidate.source
    && metric?.checked === true
    && Boolean(metric?.sourceFingerprint?.sha256)
    && metric.sourceFingerprint.sha256 === validation.sourceFingerprint.sha256
    && metric.validationFingerprint === validation.validationFingerprint
    && Array.isArray(metric?.failures)
    && metric.failures.length === 0;
}

async function loadSourceCandidates() {
  const sourceCandidatesPath = resolve('public/review/source-candidates/source-candidates.json');
  try {
    const manifest = JSON.parse(await readFile(sourceCandidatesPath, 'utf8'));
    const candidates = Array.isArray(manifest.candidates) ? manifest.candidates : [];
    return { path: sourceCandidatesPath, manifest, candidates };
  } catch (error) {
    return { path: sourceCandidatesPath, manifest: null, candidates: [], error };
  }
}

async function readJsonOrError(path) {
  try {
    return { data: JSON.parse(await readFile(path, 'utf8')), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function findSandboxReportPaths() {
  const sandboxReportPath = resolve(String(args.get('sandbox-report') ?? 'tools/scratch/sandbox-visuals-report.json'));
  const sandboxReportDir = resolve(String(args.get('sandbox-report-dir') ?? 'tools/scratch'));
  const pathsByName = new Map([[sandboxReportPath, sandboxReportPath]]);
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

async function loadSandboxReports() {
  const reports = [];
  for (const path of await findSandboxReportPaths()) {
    const evidence = await readJsonOrError(path);
    if (evidence.error) continue;
    if (evidence.data?.schema !== 'water9/sandbox-visual-check@1') continue;
    const info = await optionalStat(path);
    reports.push({ path, data: evidence.data, mtimeMs: info?.mtimeMs ?? 0 });
  }
  return reports;
}

async function evidenceFileOk(path, minSize = 128) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size >= minSize;
  } catch {
    return false;
  }
}

async function optionalStat(path) {
  try {
    return await stat(path);
  } catch {
    return null;
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
  const info = await optionalStat(path);
  if (!info?.isFile()) return { path, exists: false };
  return { path, exists: true, size: info.size, mtimeMs: Math.round(info.mtimeMs) };
}

async function sha256File(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

function qualityHash(quality) {
  return createHash('sha256').update(stableJson(quality ?? null)).digest('hex');
}

async function loadAcceptanceLedger() {
  const path = resolve('public/review/content-acceptance-ledger.json');
  try {
    const data = JSON.parse(await readFile(path, 'utf8'));
    return { path, data };
  } catch {
    return {
      path,
      data: {
        schema: 'water9/content-acceptance-ledger@1',
        targetThreats: 20,
        entries: [],
      },
    };
  }
}

async function loadVisualFeedbackLedger() {
  const path = resolve(String(args.get('visual-feedback-ledger') ?? args.get('visualFeedbackLedger') ?? 'public/review/content-visual-feedback-ledger.json'));
  try {
    const data = JSON.parse(await readFile(path, 'utf8'));
    return { path, data, error: null };
  } catch (error) {
    return {
      path,
      data: {
        schema: 'water9/content-visual-feedback-ledger@1',
        items: [],
      },
      error,
    };
  }
}

function openVisualBlockersFor(ledger, ids) {
  const idSet = new Set(ids.filter(Boolean));
  return (ledger?.data?.items ?? [])
    .filter((item) => item?.open === true && item?.severity === 'blocking' && idSet.has(item.targetId));
}

async function fileShaFingerprint(path) {
  const info = await optionalStat(path);
  if (!info?.isFile()) return { path, exists: false };
  return {
    path,
    exists: true,
    size: info.size,
    mtimeMs: Math.round(info.mtimeMs),
    sha256: await sha256File(path),
  };
}

function textureNamesFor(creature) {
  const names = new Set();
  for (const part of creature?.parts ?? []) {
    for (const key of ['texture', 'damagedTexture', 'detachedTexture']) {
      if (part[key]) names.add(part[key]);
    }
  }
  for (const overlay of creature?.socketOverlays ?? []) {
    for (const key of ['texture', 'severedTexture']) {
      if (overlay[key]) names.add(overlay[key]);
    }
  }
  return [...names].sort();
}

async function creatureEvidenceFingerprint(tool, creature, sourceManifest) {
  const textureFiles = await Promise.all(textureNamesFor(creature).map((file) => fileFingerprint(resolve(generatedDir, file))));
  const sourceFile = sourceManifest?.source ? await fileFingerprint(resolve(sourceManifest.source)) : null;
  const sourceManifestFile = sourceManifest?._file ? await fileFingerprint(resolve(generatedDir, sourceManifest._file)) : null;
  const payload = {
    tool,
    creature,
    sourceManifest,
    sourceFile,
    sourceManifestFile,
    textureFiles,
  };
  return createHash('sha256').update(stableJson(payload)).digest('hex');
}

async function sourceCandidateFingerprint(candidate) {
  const sourceFile = candidate.source ? await fileFingerprint(resolve(candidate.source)) : null;
  const payload = {
    tool: 'water9-source-candidate-review@2',
    candidate,
    sourceFile,
  };
  return createHash('sha256').update(stableJson(payload)).digest('hex');
}

function numberOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

function validateSandboxFraming(label, framing, failures) {
  if (!framing || typeof framing !== 'object' || framing.error) {
    failures.push(`${label} is missing screenshot framing metrics; rerun npm run sandbox:visual -- --ids ${id} --states idle,lunge,stunned --with diver`);
    return;
  }
  if (!framing.bbox) {
    failures.push(`${label} framing could not find a visible subject`);
    return;
  }
  if (numberOrZero(framing.widthRatio) > 0.92) {
    failures.push(`${label} subject is too wide for review framing (${framing.widthRatio})`);
  }
  if (numberOrZero(framing.heightRatio) > 0.84) {
    failures.push(`${label} subject is too tall for review framing (${framing.heightRatio})`);
  }
  if (numberOrZero(framing.areaRatio) > 0.68) {
    failures.push(`${label} subject fills too much viewport area (${framing.areaRatio})`);
  }
}

async function validateReviewEvidence(id, creature, sourceManifest, failures) {
  const reviewDir = resolve('public/review/articulated');
  const reviewManifestPath = resolve(reviewDir, 'review-manifest.json');
  const review = await readJsonOrError(reviewManifestPath);
  if (review.error) {
    failures.push(`review manifest is required before acceptance: ${review.error.message}`);
    return;
  }
  if (review.data?.schema !== 'water9/articulated-review@1') {
    failures.push(`review manifest schema is ${review.data?.schema ?? 'missing'}, expected water9/articulated-review@1`);
  }
  const item = (review.data?.creatures ?? []).find((candidate) => candidate.id === id);
  if (!item) {
    failures.push(`review manifest is missing ${id}; run npm run review:articulated:quick`);
    return;
  }
  const expectedFingerprint = await creatureEvidenceFingerprint('water9-review-gallery@2', creature, sourceManifest);
  if (!item.inputFingerprint) {
    failures.push('review manifest is missing inputFingerprint; rerun npm run review:articulated:quick');
  } else if (item.inputFingerprint !== expectedFingerprint) {
    failures.push('review manifest inputFingerprint is stale; rerun npm run review:articulated:quick');
  }
  if (!item.sourceUrl || !item.sourceThumbFile) failures.push('review manifest must include whole-source URL and thumbnail');
  if (!item.contactFile || !item.phaseFile) failures.push('review manifest must include contact sheet and phase strip files');
  if (!item.sourceParity?.metrics) failures.push('review manifest must include source-parity metrics');
  if ((item.sourceParity?.failures ?? []).length) {
    failures.push(`source-parity review has failures: ${item.sourceParity.failures.join('; ')}`);
  }
  if (!item.autoVisualCohesion) {
    failures.push('review manifest must include automated visual-cohesion audit');
  } else {
    if (item.autoVisualCohesion.status !== 'pass') {
      failures.push(`automated visual-cohesion audit status is ${item.autoVisualCohesion.status ?? 'missing'}, expected pass`);
    }
    if ((item.autoVisualCohesion.failures ?? []).length) {
      failures.push(`automated visual-cohesion audit has failures: ${item.autoVisualCohesion.failures.join('; ')}`);
    }
    if ((item.autoVisualCohesion.partsChecked ?? 0) < (creature.parts?.length ?? 0)) {
      failures.push(`automated visual-cohesion audit checked ${item.autoVisualCohesion.partsChecked ?? 0} parts, expected at least ${creature.parts?.length ?? 0}`);
    }
  }
  if (typeof item.sandboxUrl !== 'string' || !item.sandboxUrl.includes(`sandbox=${encodeURIComponent(creature.id)}`)) {
    failures.push('review manifest must include the creature sandbox URL');
  }
  const requiredFiles = [
    ['whole-source thumbnail', item.sourceThumbFile, 512],
    ['contact sheet', item.contactFile, 1024],
    ['phase strip', item.phaseFile, 1024],
    ['contact thumbnail', item.contactThumbFile, 512],
    ['phase thumbnail', item.phaseThumbFile, 512],
    ['source-parity overlay', item.sourceParityDebugFile, 512],
    ['source-parity thumbnail', item.sourceParityThumbFile, 512],
  ];
  for (const [label, file, minSize] of requiredFiles) {
    if (!file || !(await evidenceFileOk(resolve(reviewDir, file), minSize))) {
      failures.push(`review evidence missing or too small: ${label}`);
    }
  }
}

async function validateSandboxEvidence(id, creature, sourceManifest, failures) {
  const reports = await loadSandboxReports();
  if (!reports.length) {
    failures.push('sandbox visual report is required before acceptance: run npm run sandbox:visual -- --ids ' + id + ' --states idle,lunge,stunned --with diver');
    return;
  }
  const results = reports.flatMap(({ path, data, mtimeMs }) => (data.results ?? []).map((result) => ({ ...result, reportPath: path, reportMtimeMs: mtimeMs })));
  const result = results
    .filter((candidate) => candidate.id === id && candidate.companion === 'diver')
    .sort((left, right) => right.reportMtimeMs - left.reportMtimeMs)[0];
  if (!result) {
    failures.push(`paired diver sandbox visual reports are missing ${id}; run npm run sandbox:visual -- --ids ${id} --states idle,lunge,stunned --with diver`);
    return;
  }
  if (result.companion !== 'diver') {
    failures.push(`sandbox visual report companion is ${result.companion ?? 'missing'}, expected diver`);
  }
  if ((result.failures ?? []).length) {
    failures.push(`sandbox visual report has failures: ${result.failures.join('; ')}`);
  }
  const expectedFingerprint = await creatureEvidenceFingerprint('water9-sandbox-visual@2', creature, sourceManifest);
  if (!result.assetFingerprint) {
    failures.push(`sandbox visual report is missing assetFingerprint; rerun npm run sandbox:visual -- --ids ${id} --states idle,lunge,stunned --with diver`);
  } else if (result.assetFingerprint !== expectedFingerprint) {
    failures.push(`sandbox visual report assetFingerprint is stale; rerun npm run sandbox:visual -- --ids ${id} --states idle,lunge,stunned --with diver`);
  }
  if (result.snapshot?.entryId !== id) {
    failures.push(`sandbox visual snapshot entryId ${result.snapshot?.entryId ?? 'missing'} does not match ${id}`);
  }
  if (result.snapshot?.unresolvedRequest) {
    failures.push(`sandbox visual snapshot has unresolved request ${result.snapshot.unresolvedRequest}`);
  }
  const canvas = result.canvas ?? {};
  if (!canvas.exists || numberOrZero(canvas.width) <= 0 || numberOrZero(canvas.height) <= 0) {
    failures.push('sandbox visual report has missing or zero-sized canvas');
  }
  if (numberOrZero(canvas.opaqueSamples) < 120 || numberOrZero(canvas.variedSamples) < 8 || numberOrZero(canvas.lumaRange) < 12) {
    failures.push('sandbox visual report canvas appears blank or underdrawn');
  }
  if (!result.screenshotPath || !(await evidenceFileOk(resolve(result.screenshotPath), 1024))) {
    failures.push('sandbox visual screenshot is missing or too small');
  }
  const states = Array.isArray(result.states) ? result.states : [];
  const statesByName = new Map(states.map((state) => [state.state, state]));
  for (const stateName of REQUIRED_SANDBOX_STATES) {
    const state = statesByName.get(stateName);
    if (!state) {
      failures.push(`sandbox visual report is missing ${stateName} state evidence; rerun npm run sandbox:visual -- --ids ${id}`);
      continue;
    }
    if ((state.failures ?? []).length) {
      failures.push(`sandbox ${stateName} state has failures: ${state.failures.join('; ')}`);
    }
    if (state.snapshot?.entryId !== id) {
      failures.push(`sandbox ${stateName} snapshot entryId ${state.snapshot?.entryId ?? 'missing'} does not match ${id}`);
    }
    if (state.snapshot?.companion !== 'diver') {
      failures.push(`sandbox ${stateName} snapshot companion is ${state.snapshot?.companion ?? 'missing'}, expected diver`);
    }
    if (state.snapshot?.hasDiver !== true) {
      failures.push(`sandbox ${stateName} snapshot did not render the diver companion`);
    }
    if (state.snapshot?.mode !== stateName) {
      failures.push(`sandbox ${stateName} snapshot mode is ${state.snapshot?.mode ?? 'missing'}`);
    }
    const stateCanvas = state.canvas ?? {};
    if (!stateCanvas.exists || numberOrZero(stateCanvas.width) <= 0 || numberOrZero(stateCanvas.height) <= 0) {
      failures.push(`sandbox ${stateName} state has missing or zero-sized canvas`);
    }
    if (numberOrZero(stateCanvas.opaqueSamples) < 120 || numberOrZero(stateCanvas.variedSamples) < 8 || numberOrZero(stateCanvas.lumaRange) < 12) {
      failures.push(`sandbox ${stateName} state canvas appears blank or underdrawn`);
    }
    if (!state.screenshotPath || !(await evidenceFileOk(resolve(state.screenshotPath), 1024))) {
      failures.push(`sandbox ${stateName} screenshot is missing or too small`);
    }
    validateSandboxFraming(`sandbox ${stateName}`, state.framing, failures);
  }
}

async function validateSourceCandidateReviewEvidence(candidateId, failures) {
  const reviewDir = resolve('public/review/source-candidates');
  const reviewManifestPath = resolve(reviewDir, 'review-manifest.json');
  const review = await readJsonOrError(reviewManifestPath);
  if (review.error) {
    failures.push(`source-candidate review manifest is required before acceptance: ${review.error.message}`);
    return;
  }
  if (review.data?.schema !== 'water9/source-candidate-review@1') {
    failures.push(`source-candidate review manifest schema is ${review.data?.schema ?? 'missing'}, expected water9/source-candidate-review@1`);
  }
  const item = (review.data?.candidates ?? []).find((candidate) => candidate.id === candidateId);
  if (!item) {
    failures.push(`source-candidate review manifest is missing ${candidateId}; run npm run source:gallery`);
    return;
  }
  if (item.approved !== true) {
    failures.push(`source-candidate review item ${candidateId} is not approved in the review packet`);
  }
  const sourceCandidate = sourceCandidateData.candidates.find((candidate) => candidate.id === candidateId);
  if (sourceCandidate) {
    const expectedFingerprint = await sourceCandidateFingerprint(sourceCandidate);
    if (!item.inputFingerprint) {
      failures.push(`source-candidate review item ${candidateId} is missing inputFingerprint; rerun npm run source:gallery`);
    } else if (item.inputFingerprint !== expectedFingerprint) {
      failures.push(`source-candidate review item ${candidateId} is stale; rerun npm run source:gallery`);
    }
  }
  if (!item.source || !item.sourceThumbFile) {
    failures.push(`source-candidate review item ${candidateId} must include source image and thumbnail evidence`);
  }
  if (!item.keyPreviewFile) {
    failures.push(`source-candidate review item ${candidateId} must include chroma key preview evidence`);
  }
  if (item.sourceThumbFile && !(await evidenceFileOk(resolve(reviewDir, item.sourceThumbFile), 512))) {
    failures.push(`source-candidate thumbnail evidence is missing or too small for ${candidateId}`);
  }
  if (item.keyPreviewFile && !(await evidenceFileOk(resolve(reviewDir, item.keyPreviewFile), 1024))) {
    failures.push(`source-candidate chroma key preview is missing or too small for ${candidateId}`);
  }
}

async function validateSourcePreviewEvidence(candidateId, failures) {
  const previewId = `source-${candidateId}`;
  const reports = await loadSandboxReports();
  const results = reports.flatMap(({ path, data, mtimeMs }) => (data.results ?? []).map((result) => ({ ...result, reportPath: path, reportMtimeMs: mtimeMs })));
  const result = results
    .filter((candidate) => candidate.id === previewId)
    .sort((left, right) => right.reportMtimeMs - left.reportMtimeMs)[0];
  if (!result) {
    failures.push(`source candidate ${candidateId} preview visual report is missing; run npm run source:preview-check`);
    return;
  }
  if ((result.failures ?? []).length) {
    failures.push(`source candidate ${candidateId} preview visual report has failures: ${result.failures.join('; ')}`);
  }
  if (result.snapshot?.entryId !== previewId) {
    failures.push(`source candidate ${candidateId} preview entryId ${result.snapshot?.entryId ?? 'missing'} does not match ${previewId}`);
  }
  if (result.snapshot?.previewTexture !== previewId) {
    failures.push(`source candidate ${candidateId} preview texture ${result.snapshot?.previewTexture ?? 'missing'} does not match ${previewId}`);
  }
  if (!result.snapshot?.hasPreviewSprite) {
    failures.push(`source candidate ${candidateId} preview did not render a preview sprite`);
  }
  const canvas = result.canvas ?? {};
  if (!canvas.exists || numberOrZero(canvas.width) <= 0 || numberOrZero(canvas.height) <= 0) {
    failures.push(`source candidate ${candidateId} preview has missing or zero-sized canvas`);
  }
  if (numberOrZero(canvas.opaqueSamples) < 120 || numberOrZero(canvas.variedSamples) < 8 || numberOrZero(canvas.lumaRange) < 12) {
    failures.push(`source candidate ${candidateId} preview canvas appears blank or underdrawn`);
  }
  if (!result.screenshotPath || !(await evidenceFileOk(resolve(result.screenshotPath), 1024))) {
    failures.push(`source candidate ${candidateId} preview screenshot is missing or too small`);
  }
}

async function currentThreatEvidenceFingerprint(id, creature, sourceManifest, sourceCandidate, sourceCandidateManifestPath) {
  const reviewManifestPath = resolve('public/review/articulated/review-manifest.json');
  const review = await readJsonOrError(reviewManifestPath);
  const reviewItem = (review.data?.creatures ?? []).find((candidate) => candidate.id === id) ?? null;
  const sandboxResult = latestSandboxResultFor(id, await loadSandboxReports(), { requireDiver: true });
  return buildThreatEvidenceFingerprint({
    id,
    creature,
    sourceManifest,
    sourceCandidate,
    reviewItem,
    sandboxResult,
    runtimeManifestPath: runtimePath,
    sourceCandidateManifestPath,
    reviewManifestPath,
  });
}

async function validateSourceCandidateImageValidation(candidate, failures) {
  if (!candidate) return;
  if (!sourceCandidateImageValidationRecorded(candidate)) {
    failures.push(`source candidate ${candidate.id} needs locked source-image validation evidence; rerun npm run source:accept after source:image-check`);
    return;
  }
  const validation = candidate.review.imageValidation;
  const reportPath = resolve(validation.report);
  if (!(await evidenceFileOk(reportPath, 512))) {
    failures.push(`source candidate ${candidate.id} source-image validation report is missing or too small: ${validation.report}`);
    return;
  }
  const reportFingerprint = await fileShaFingerprint(reportPath);
  if (reportFingerprint.sha256 && validation.reportFingerprint?.sha256 !== reportFingerprint.sha256) {
    failures.push(`source candidate ${candidate.id} source-image validation report sha256 is stale`);
  }
  if (reportFingerprint.size && validation.reportFingerprint?.size !== reportFingerprint.size) {
    failures.push(`source candidate ${candidate.id} source-image validation report size is stale`);
  }
  const report = await readJsonOrError(reportPath);
  if (report.error) {
    failures.push(`source candidate ${candidate.id} source-image validation report could not be read: ${report.error.message}`);
    return;
  }
  if (report.data?.schema !== 'water9/source-image-validation@1') {
    failures.push(`source candidate ${candidate.id} source-image validation report schema is ${report.data?.schema ?? 'missing'}`);
  }
  const reportMetric = (report.data?.metrics ?? []).find((entry) => entry.id === candidate.id);
  if (!reportMetric) {
    failures.push(`source candidate ${candidate.id} source-image validation report is missing candidate metric`);
  } else {
    if (reportMetric.validationFingerprint !== validation.validationFingerprint) {
      failures.push(`source candidate ${candidate.id} source-image validation metric fingerprint does not match stored review evidence`);
    }
    if (reportMetric.sourceFingerprint?.sha256 !== validation.sourceFingerprint?.sha256) {
      failures.push(`source candidate ${candidate.id} source-image validation report source sha does not match stored review evidence`);
    }
  }
  if (candidate.source) {
    const currentSource = await fileShaFingerprint(resolve(candidate.source));
    if (currentSource.sha256 && validation.sourceFingerprint?.sha256 !== currentSource.sha256) {
      failures.push(`source candidate ${candidate.id} stored source fingerprint sha256 is stale`);
    }
    if (currentSource.size && validation.sourceFingerprint?.size !== currentSource.size) {
      failures.push(`source candidate ${candidate.id} stored source fingerprint size is stale`);
    }
  }
}

const id = args.get('id');
const status = args.get('status') ?? 'accepted';
const reviewedBy = args.get('reviewed-by') ?? args.get('reviewedBy');
const reviewerName = typeof reviewedBy === 'string' ? reviewedBy.trim() : reviewedBy;
const reviewerKey = String(reviewerName ?? '').trim().toLowerCase();
const note = args.get('note');
const approvalNote = typeof note === 'string' ? note.trim() : note;
const dryRun = flagPresent('dry-run');
const allowAiReviewer = flagPresent('allow-ai-reviewer');
const suppliedSourceCandidateId = args.get('source-candidate') ?? args.get('sourceCandidate');
const suppliedEvidenceFingerprint = String(args.get('evidence-fingerprint') ?? args.get('evidenceFingerprint') ?? '').trim();

if (!id || !['accepted', 'prototype'].includes(status)) {
  usage();
  process.exit(1);
}
if (status === 'accepted' && !reviewerName) {
  usage();
  console.error('Accepting a creature requires --reviewed-by with a human reviewer name. Codex should not self-accept visual art.');
  process.exit(1);
}

const generatedDir = resolve('public/assets/generated');
const runtimePath = resolve(generatedDir, 'articulated-creatures.parts.json');
const runtime = JSON.parse(await readFile(runtimePath, 'utf8'));
const creature = runtime.creatures?.find((candidate) => candidate.id === id);
if (!creature) {
  console.error(`No runtime creature found with id ${id}`);
  process.exit(1);
}

const files = await readdir(generatedDir);
let sourcePath = null;
let sourceManifest = null;
for (const file of files.filter((candidate) => candidate.endsWith('.articulated.json'))) {
  const path = resolve(generatedDir, file);
  const data = JSON.parse(await readFile(path, 'utf8'));
  if (data.runtimeCreatureId === id) {
    sourcePath = path;
    sourceManifest = { ...data, _file: file };
    break;
  }
}
if (!sourceManifest || !sourcePath) {
  console.error(`No articulated source manifest found for ${id}`);
  process.exit(1);
}

const runtimeQuality = creature.quality && typeof creature.quality === 'object' ? creature.quality : {};
const sourceQuality = sourceManifest.quality && typeof sourceManifest.quality === 'object' ? sourceManifest.quality : {};
const existingQuality = Object.keys(runtimeQuality).length ? runtimeQuality : sourceQuality;
const accepting = status === 'accepted';
const sourceCandidateId = suppliedSourceCandidateId ?? existingQuality.sourceCandidateId ?? sourceManifest.sourceCandidateId ?? null;
const sourceCandidateData = await loadSourceCandidates();
const sourceCandidate = sourceCandidateId
  ? sourceCandidateData.candidates.find((candidate) => candidate.id === sourceCandidateId)
  : null;
const visualFeedbackLedger = await loadVisualFeedbackLedger();
const openVisualBlockers = openVisualBlockersFor(visualFeedbackLedger, [id, sourceCandidateId]);
const suppliedVisualChecks = new Set(splitValues([
  ...valuesFor('visual-check'),
  ...valuesFor('visualCheck'),
]));
const knownVisualChecks = new Set(REQUIRED_VISUAL_CHECKS.map((check) => check.id));
const unknownVisualChecks = [...suppliedVisualChecks].filter((check) => !knownVisualChecks.has(check));
if (unknownVisualChecks.length) {
  usage();
  console.error(`Unknown visual check(s): ${unknownVisualChecks.join(', ')}`);
  process.exit(1);
}
const suppliedVisualScores = parseScoreValues([
  ...valuesFor('score'),
  ...valuesFor('visual-score'),
  ...valuesFor('visualScore'),
]);
const unknownVisualScores = [...suppliedVisualScores.keys()].filter((check) => !knownVisualChecks.has(check));
if (unknownVisualScores.length) {
  usage();
  console.error(`Unknown visual score(s): ${unknownVisualScores.join(', ')}`);
  process.exit(1);
}
const suppliedVisualNotes = parseKeyedTextValues([
  ...valuesFor('visual-note'),
  ...valuesFor('visualNote'),
  ...valuesFor('check-note'),
  ...valuesFor('checkNote'),
]);
const unknownVisualNotes = [...suppliedVisualNotes.keys()].filter((check) => !knownVisualChecks.has(check));
if (unknownVisualNotes.length) {
  usage();
  console.error(`Unknown visual note(s): ${unknownVisualNotes.join(', ')}`);
  process.exit(1);
}
const visualChecklist = Object.fromEntries(REQUIRED_VISUAL_CHECKS.map((check) => [
  check.id,
  accepting ? suppliedVisualChecks.has(check.id) : false,
]));
const visualScores = Object.fromEntries(REQUIRED_VISUAL_CHECKS.map((check) => [
  check.id,
  accepting ? suppliedVisualScores.get(check.id) ?? null : null,
]));
const visualNotes = Object.fromEntries(REQUIRED_VISUAL_CHECKS.map((check) => [
  check.id,
  accepting ? suppliedVisualNotes.get(check.id) ?? null : null,
]));
const reviewEvidence = Object.fromEntries(REQUIRED_REVIEW_EVIDENCE.map((check) => [
  check.id,
  accepting ? flagPresent(check.flag) : false,
]));
const quality = {
  status,
  sourceCohesion: existingQuality.sourceCohesion ?? null,
  backgroundKey: existingQuality.backgroundKey ?? null,
  reviewedBy: accepting ? reviewerName : null,
  reviewedAt: accepting ? new Date().toISOString() : null,
  acceptanceNote: accepting ? approvalNote : (approvalNote ?? ''),
  sourceCandidateId: sourceCandidateId ?? null,
  visualChecklist,
  visualScores,
  visualNotes,
  reviewEvidence,
};
let currentEvidenceFingerprint = null;

if (openVisualBlockers.length) {
  console.error(`Cannot mark ${id} as ${status}:`);
  for (const blocker of openVisualBlockers) {
    console.error(`- open blocking visual feedback ${blocker.id ?? blocker.status ?? blocker.targetId} must be resolved before this threat can be marked ${status}`);
  }
  process.exit(1);
}

if (accepting) {
  const failures = [];
  if (visualFeedbackLedger.error) {
    failures.push(`could not read visual feedback ledger ${visualFeedbackLedger.path}: ${visualFeedbackLedger.error.message}`);
  }
  if (visualFeedbackLedger.data?.schema !== 'water9/content-visual-feedback-ledger@1') {
    failures.push(`visual feedback ledger schema is ${visualFeedbackLedger.data?.schema ?? 'missing'}, expected water9/content-visual-feedback-ledger@1`);
  }
  if (!quality.sourceCohesion) failures.push('sourceCohesion must be explicitly recorded before acceptance');
  if (!quality.backgroundKey) failures.push('backgroundKey must be explicitly recorded before acceptance');
  if (runtimeQuality.sourceCohesion && sourceQuality.sourceCohesion && runtimeQuality.sourceCohesion !== sourceQuality.sourceCohesion) {
    failures.push(`runtime/source sourceCohesion mismatch: ${runtimeQuality.sourceCohesion} !== ${sourceQuality.sourceCohesion}`);
  }
  if (runtimeQuality.backgroundKey && sourceQuality.backgroundKey && runtimeQuality.backgroundKey !== sourceQuality.backgroundKey) {
    failures.push(`runtime/source backgroundKey mismatch: ${runtimeQuality.backgroundKey} !== ${sourceQuality.backgroundKey}`);
  }
  if (quality.sourceCohesion !== 'single-source') failures.push('sourceCohesion must be single-source');
  if (quality.backgroundKey !== 'magenta') failures.push('backgroundKey must be magenta');
  if (!sourceCandidateId) failures.push('accepted rigs must pass --source-candidate <candidate-id> from the source-candidate review queue');
  if (sourceCandidateData.error) failures.push(`could not read source candidate manifest ${sourceCandidateData.path}: ${sourceCandidateData.error.message}`);
  if (sourceCandidateId && !sourceCandidate) failures.push(`source candidate ${sourceCandidateId} was not found in ${sourceCandidateData.path}`);
  if (sourceCandidate && !sourceCandidateApproved(sourceCandidate)) failures.push(`source candidate ${sourceCandidate.id} is not approved by the source-first review gate`);
  if (sourceCandidate) await validateSourceCandidateImageValidation(sourceCandidate, failures);
  if (sourceCandidate?.riggedCreatureId && sourceCandidate.riggedCreatureId !== id) {
    failures.push(`source candidate ${sourceCandidate.id} is already linked to ${sourceCandidate.riggedCreatureId}`);
  }
  if (sourceCandidate && !sourceCandidate.source) {
    failures.push(`source candidate ${sourceCandidate.id} is missing source image path`);
  } else if (sourceCandidate?.source && !(await evidenceFileOk(resolve(sourceCandidate.source), 512))) {
    failures.push(`source candidate ${sourceCandidate.id} source image is missing or too small: ${sourceCandidate.source}`);
  }
  if (sourceManifest.sourceCandidateId && sourceManifest.sourceCandidateId !== sourceCandidateId) {
    failures.push(`source manifest sourceCandidateId ${sourceManifest.sourceCandidateId} does not match requested ${sourceCandidateId}`);
  }
  if (sourceCandidate?.source && sourceManifest.source && sourceCandidate.source !== sourceManifest.source) {
    failures.push(`source candidate image ${sourceCandidate.source} does not match articulated source image ${sourceManifest.source}`);
  }
  if (sourceCandidateId) await validateSourceCandidateReviewEvidence(sourceCandidateId, failures);
  if (sourceCandidateId) await validateSourcePreviewEvidence(sourceCandidateId, failures);
  if (!sourceManifest.source) failures.push('source manifest needs a whole source image');
  if (!Array.isArray(sourceManifest.parts) || sourceManifest.parts.length < 5) failures.push('source manifest needs at least 5 source parts');
  if (!Array.isArray(sourceManifest.socketOverlays) || sourceManifest.socketOverlays.length < 3) failures.push('source manifest needs at least 3 socket overlays');
  if (DISALLOWED_REVIEWERS.has(reviewerKey) && !allowAiReviewer) {
    failures.push('accepted visual review needs a human reviewer name; pass --allow-ai-reviewer only for deliberate automation tests');
  }
  if (!meaningfulReviewText(approvalNote)) {
    failures.push(`accepted visual review needs a specific --note; ${reviewTextFailure('--note')}`);
  }
  for (const check of REQUIRED_VISUAL_CHECKS) {
    if (quality.visualChecklist[check.id] !== true) failures.push(`visual check missing: ${check.id} (${check.label})`);
    const score = quality.visualScores[check.id];
    if (!Number.isFinite(score) || score < MIN_VISUAL_SCORE || score > 5) {
      failures.push(`visual score for ${check.id} must be ${MIN_VISUAL_SCORE}-5; got ${score ?? 'missing'} (${check.label})`);
    }
    const visualNote = quality.visualNotes[check.id];
    if (!meaningfulReviewText(visualNote, MIN_VISUAL_NOTE_LENGTH)) {
      failures.push(`visual note for ${check.id} ${reviewTextFailure('rationale', MIN_VISUAL_NOTE_LENGTH)} (${check.label})`);
    }
    if (meaningfulReviewText(visualNote, MIN_VISUAL_NOTE_LENGTH) && !reviewNoteHasEvidenceTerms(visualNote, RIG_VISUAL_NOTE_TERMS[check.id])) {
      failures.push(`visual note for ${check.id} ${reviewEvidenceFailure('rationale', RIG_VISUAL_NOTE_TERMS[check.id])} (${check.label})`);
    }
  }
  const noteDistinctness = distinctReviewNotes(quality.visualNotes, REQUIRED_VISUAL_CHECKS.map((check) => check.id));
  if (!noteDistinctness.ok) {
    failures.push(`visual notes must be distinct for each check; duplicate pairs: ${noteDistinctness.duplicates.join(', ') || 'missing notes'}`);
  }
  for (const check of REQUIRED_REVIEW_EVIDENCE) {
    if (quality.reviewEvidence[check.id] !== true) failures.push(`review evidence missing: --${check.flag} (${check.label})`);
  }
  await validateReviewEvidence(id, creature, sourceManifest, failures);
  await validateSandboxEvidence(id, creature, sourceManifest, failures);
  currentEvidenceFingerprint = await currentThreatEvidenceFingerprint(id, creature, sourceManifest, sourceCandidate, sourceCandidateData.path);
  if (currentEvidenceFingerprint.schema !== THREAT_EVIDENCE_FINGERPRINT_SCHEMA) {
    failures.push(`current threat evidence fingerprint schema is ${currentEvidenceFingerprint.schema ?? 'missing'}`);
  }
  if (!suppliedEvidenceFingerprint) {
    failures.push('accepted threat requires --evidence-fingerprint from npm run content:threat-decisions');
  } else if (currentEvidenceFingerprint.digest !== suppliedEvidenceFingerprint) {
    failures.push('accepted threat evidence fingerprint is stale; rerun npm run content:threat-decisions and review current evidence');
  }
  for (const key of ['contact', 'phase', 'sourceParity', 'sandbox-idle-screenshot', 'sandbox-lunge-screenshot', 'sandbox-stunned-screenshot']) {
    const media = currentEvidenceFingerprint.files?.[key];
    if (media?.exists !== true || !media.sha256 || !media.size) {
      failures.push(`current threat evidence fingerprint is missing valid ${key} media evidence`);
    }
  }
  if (failures.length) {
    console.error(`Cannot accept ${id}:`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

creature.quality = quality;
sourceManifest.quality = quality;
sourceManifest.sourceCandidateId = sourceCandidateId ?? null;
if (sourceCandidate && accepting) {
  sourceCandidate.status = 'rigged';
  sourceCandidate.riggedCreatureId = id;
  sourceCandidate.riggedAt = sourceCandidate.riggedAt ?? new Date().toISOString();
}
if (!dryRun) {
  const sourceManifestToWrite = { ...sourceManifest };
  delete sourceManifestToWrite._file;
  await writeFile(runtimePath, JSON.stringify(runtime, null, 2) + '\n');
  await writeFile(sourcePath, JSON.stringify(sourceManifestToWrite, null, 2) + '\n');
  if (sourceCandidate && accepting && sourceCandidateData.manifest) {
    await writeFile(sourceCandidateData.path, JSON.stringify(sourceCandidateData.manifest, null, 2) + '\n');
  }
  if (accepting) {
    const ledger = await loadAcceptanceLedger();
    if (!Array.isArray(ledger.data.entries)) ledger.data.entries = [];
    const entry = {
      schema: 'water9/content-acceptance-ledger-entry@1',
      id,
      species: creature.species ?? id,
      status: 'accepted',
      decision: 'human-approved',
      reviewedBy: quality.reviewedBy,
      reviewedAt: quality.reviewedAt,
      recordedAt: new Date().toISOString(),
      sourceCandidateId: quality.sourceCandidateId,
	      acceptanceNote: quality.acceptanceNote,
	      qualitySha256: qualityHash(quality),
	      evidenceFingerprint: currentEvidenceFingerprint,
	      runtimeManifest: 'public/assets/generated/articulated-creatures.parts.json',
      sourceManifest: `public/assets/generated/${sourceManifest._file}`,
      tool: 'tools/accept_articulated_creature.mjs',
    };
    const existingIndex = ledger.data.entries.findIndex((candidate) => candidate.id === id);
    if (existingIndex >= 0) ledger.data.entries[existingIndex] = entry;
    else ledger.data.entries.push(entry);
    ledger.data.entries.sort((left, right) => String(left.id).localeCompare(String(right.id)));
    await mkdir(dirname(ledger.path), { recursive: true });
    await writeFile(ledger.path, JSON.stringify(ledger.data, null, 2) + '\n');
  }
}
console.log(JSON.stringify({ id, status, reviewedBy: quality.reviewedBy, reviewedAt: quality.reviewedAt, sourceCandidateId: quality.sourceCandidateId, visualChecklist: quality.visualChecklist, reviewEvidence: quality.reviewEvidence, evidenceFingerprint: currentEvidenceFingerprint ? { schema: currentEvidenceFingerprint.schema, digest: currentEvidenceFingerprint.digest } : null, dryRun, sourceManifest: sourcePath }, null, 2));

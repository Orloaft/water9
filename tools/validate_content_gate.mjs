import { readdir, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import {
  MIN_VISUAL_NOTE_LENGTH,
  distinctReviewNotes,
  meaningfulReviewText,
  reviewNoteHasEvidenceTerms,
} from './review_text_quality.mjs';
import {
  rigAcceptedStrict,
  sourceApprovedStrict,
  sourceArtContractRecorded as strictSourceArtContractRecorded,
  sourceImageValidationRecorded as strictSourceImageValidationRecorded,
} from './content_quality_predicates.mjs';
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
  args.set(key, value);
}

const minThreats = Number(args.get('min-threats') ?? 20);
const allowPrototypes = args.has('allow-prototypes');
const requiredStatus = String(args.get('required-status') ?? 'accepted');
const manifestPath = resolve('public/assets/generated/articulated-creatures.parts.json');
const generatedDir = resolve('public/assets/generated');
const reviewDir = resolve(String(args.get('review-dir') ?? 'public/review/articulated'));
const sandboxReportPath = resolve(String(args.get('sandbox-report') ?? 'tools/scratch/sandbox-visuals-report.json'));
const sandboxReportDir = resolve(String(args.get('sandbox-report-dir') ?? 'tools/scratch'));
const sourcePreviewReportPath = resolve(String(args.get('source-preview-report') ?? 'tools/scratch/source-preview-visuals-report.json'));
const sourceCandidatePath = resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json'));
const sourceCandidateReviewDir = resolve(String(args.get('source-candidate-review-dir') ?? 'public/review/source-candidates'));
const acceptanceLedgerPath = resolve(String(args.get('acceptance-ledger') ?? 'public/review/content-acceptance-ledger.json'));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const failures = [];
const acceptanceFailures = [];
const REQUIRED_VISUAL_CHECKS = [
  'single-source-cohesion',
  'readable-silhouette',
  'anatomy-cohesion',
  'production-visual-cohesion',
  'socket-seams',
  'motion-stability',
  'sandbox-behavior',
];
const MIN_VISUAL_SCORE = 4;
const REQUIRED_REVIEW_EVIDENCE = [
  'whole-source',
  'contact-sheet',
  'phase-strip',
  'source-parity',
  'sandbox-preview',
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

async function fileExists(path) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size >= 128;
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

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'candidate';
}

async function fileFingerprint(path) {
  const info = await optionalStat(path);
  if (!info?.isFile()) return { path, exists: false };
  return { path, exists: true, size: info.size, mtimeMs: Math.round(info.mtimeMs) };
}

async function sha256File(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
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

async function readEvidenceJson(label, path) {
  try {
    const data = JSON.parse(await readFile(path, 'utf8'));
    return { data, error: null };
  } catch (error) {
    return { data: null, error: `${label}: could not read JSON: ${error.message}` };
  }
}

async function findSandboxReportPaths() {
  const pathsByName = new Map([
    [sandboxReportPath, sandboxReportPath],
    [sourcePreviewReportPath, sourcePreviewReportPath],
  ]);
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
    const evidence = await readEvidenceJson('sandbox visual report', path);
    if (evidence.error) continue;
    if (evidence.data?.schema !== 'water9/sandbox-visual-check@1') continue;
    const info = await optionalStat(path);
    reports.push({ path, data: evidence.data, mtimeMs: info?.mtimeMs ?? 0 });
  }
  return reports;
}

async function requireEvidenceFile(label, path, minSize = 128) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minSize) failures.push(`${label}: missing or too small`);
  } catch {
    failures.push(`${label}: does not exist`);
  }
}

async function loadSourceManifests() {
  const files = await readdir(generatedDir);
  const manifests = new Map();
  for (const file of files.filter((candidate) => candidate.endsWith('.articulated.json'))) {
    const path = resolve(generatedDir, file);
    const data = JSON.parse(await readFile(path, 'utf8'));
    if (data.runtimeCreatureId) manifests.set(data.runtimeCreatureId, { ...data, _file: file });
  }
  return manifests;
}

function acceptedQuality(quality) {
  if (requiredStatus !== 'accepted') return quality?.status === requiredStatus;
  return rigAcceptedStrict({ quality });
}

function qualityRecordsAgree(runtimeQuality, sourceQuality) {
  if (!runtimeQuality || !sourceQuality) return false;
  for (const key of ['status', 'sourceCohesion', 'backgroundKey', 'reviewedBy', 'reviewedAt', 'acceptanceNote', 'sourceCandidateId']) {
    if (String(runtimeQuality[key] ?? '') !== String(sourceQuality[key] ?? '')) return false;
  }
  return REQUIRED_VISUAL_CHECKS.every((check) => runtimeQuality.visualChecklist?.[check] === sourceQuality.visualChecklist?.[check])
    && REQUIRED_VISUAL_CHECKS.every((check) => String(runtimeQuality.visualScores?.[check] ?? '') === String(sourceQuality.visualScores?.[check] ?? ''))
    && REQUIRED_VISUAL_CHECKS.every((check) => String(runtimeQuality.visualNotes?.[check] ?? '') === String(sourceQuality.visualNotes?.[check] ?? ''))
    && REQUIRED_REVIEW_EVIDENCE.every((check) => runtimeQuality.reviewEvidence?.[check] === sourceQuality.reviewEvidence?.[check]);
}

function acceptedQualityPair(runtimeQuality, sourceQuality) {
  return acceptedQuality(runtimeQuality) && acceptedQuality(sourceQuality) && qualityRecordsAgree(runtimeQuality, sourceQuality);
}

function qualityHash(quality) {
  return createHash('sha256').update(stableJson(quality ?? null)).digest('hex');
}

function ledgerBackedAcceptance(creature, sourceManifest) {
  if (!acceptedQualityPair(creature.quality, sourceManifest?.quality)) return false;
  const entry = acceptanceLedgerById.get(creature.id);
  return Boolean(entry)
    && entry.status === 'accepted'
    && entry.decision === 'human-approved'
    && entry.tool === 'tools/accept_articulated_creature.mjs'
    && entry.qualitySha256 === qualityHash(creature.quality)
    && entry.evidenceFingerprint?.schema === THREAT_EVIDENCE_FINGERPRINT_SCHEMA
    && Boolean(entry.evidenceFingerprint?.digest)
    && String(entry.sourceCandidateId ?? '') === String(creature.quality?.sourceCandidateId ?? '')
    && String(entry.reviewedBy ?? '') === String(creature.quality?.reviewedBy ?? '')
    && String(entry.reviewedAt ?? '') === String(creature.quality?.reviewedAt ?? '')
    && String(entry.acceptanceNote ?? '') === String(creature.quality?.acceptanceNote ?? '');
}

async function validateLedgerForAcceptedCreature(owner, creature, sourceManifest) {
  if (!acceptedQualityPair(creature.quality, sourceManifest?.quality)) return;
  const entry = acceptanceLedgerById.get(creature.id);
  if (!entry) {
    acceptanceFailures.push(`${owner}: accepted quality is missing from human acceptance ledger`);
    return;
  }
  if (entry.schema && entry.schema !== 'water9/content-acceptance-ledger-entry@1') {
    acceptanceFailures.push(`${owner}: acceptance ledger entry schema is ${entry.schema}`);
  }
  if (entry.status !== 'accepted') acceptanceFailures.push(`${owner}: acceptance ledger status is ${entry.status ?? 'missing'}, expected accepted`);
  if (entry.decision !== 'human-approved') acceptanceFailures.push(`${owner}: acceptance ledger decision is ${entry.decision ?? 'missing'}, expected human-approved`);
  if (entry.tool !== 'tools/accept_articulated_creature.mjs') acceptanceFailures.push(`${owner}: acceptance ledger tool must be tools/accept_articulated_creature.mjs`);
  if (!String(entry.recordedAt ?? '').trim()) acceptanceFailures.push(`${owner}: acceptance ledger is missing recordedAt`);
  if (String(entry.sourceCandidateId ?? '') !== String(creature.quality?.sourceCandidateId ?? '')) acceptanceFailures.push(`${owner}: acceptance ledger sourceCandidateId does not match quality`);
  if (String(entry.reviewedBy ?? '') !== String(creature.quality?.reviewedBy ?? '')) acceptanceFailures.push(`${owner}: acceptance ledger reviewedBy does not match quality`);
  if (String(entry.reviewedAt ?? '') !== String(creature.quality?.reviewedAt ?? '')) acceptanceFailures.push(`${owner}: acceptance ledger reviewedAt does not match quality`);
  if (String(entry.acceptanceNote ?? '') !== String(creature.quality?.acceptanceNote ?? '')) acceptanceFailures.push(`${owner}: acceptance ledger acceptanceNote does not match quality`);
  if (entry.qualitySha256 !== qualityHash(creature.quality)) acceptanceFailures.push(`${owner}: acceptance ledger qualitySha256 is stale or missing`);
  if (entry.evidenceFingerprint?.schema !== THREAT_EVIDENCE_FINGERPRINT_SCHEMA) {
    acceptanceFailures.push(`${owner}: acceptance ledger evidenceFingerprint schema is stale or missing`);
  }
  if (!entry.evidenceFingerprint?.digest) {
    acceptanceFailures.push(`${owner}: acceptance ledger evidenceFingerprint digest is missing`);
  } else {
    const sourceCandidate = sourceCandidatesById.get(creature.quality?.sourceCandidateId) ?? null;
    const reviewItem = reviewItemsById.get(creature.id) ?? null;
    const sandboxResult = latestSandboxResultFor(creature.id, sandboxReports, { requireDiver: true });
    const currentFingerprint = await buildThreatEvidenceFingerprint({
      id: creature.id,
      creature,
      sourceManifest,
      sourceCandidate,
      reviewItem,
      sandboxResult,
      runtimeManifestPath: manifestPath,
      sourceCandidateManifestPath: sourceCandidatePath,
      reviewManifestPath: resolve(reviewDir, 'review-manifest.json'),
      generatedDir,
      reviewDir,
    });
    if (entry.evidenceFingerprint.digest !== currentFingerprint.digest) {
      acceptanceFailures.push(`${owner}: acceptance ledger evidenceFingerprint is stale; rerun threat acceptance against current evidence`);
    }
    for (const key of ['contact', 'phase', 'sourceParity', 'sandbox-idle-screenshot', 'sandbox-lunge-screenshot', 'sandbox-stunned-screenshot']) {
      const media = currentFingerprint.files?.[key];
      if (media?.exists !== true || !media.sha256 || !media.size) {
        acceptanceFailures.push(`${owner}: current threat evidence fingerprint is missing valid ${key} media evidence`);
      }
    }
  }
  if (sourceManifest?._file && entry.sourceManifest !== `public/assets/generated/${sourceManifest._file}`) {
    acceptanceFailures.push(`${owner}: acceptance ledger sourceManifest does not match current source manifest`);
  }
}

function sourceCandidateApproved(candidate) {
  return sourceApprovedStrict(candidate);
}

function sourceArtContractRecorded(candidate) {
  return strictSourceArtContractRecorded(candidate);
}

function sourceImageValidationRecorded(candidate) {
  return strictSourceImageValidationRecorded(candidate);
}

function sourceReviewNotesAreDistinct(review) {
  const seen = new Set();
  for (const check of REQUIRED_SOURCE_VISUAL_CHECKS) {
    const normalized = String(review?.visualNotes?.[check] ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!normalized) return false;
    if (seen.has(normalized)) return false;
    seen.add(normalized);
  }
  return true;
}

function numberOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

function validateSandboxFraming(owner, stateName, framing) {
  if (!framing || typeof framing !== 'object' || framing.error) {
    failures.push(`${owner}: sandbox ${stateName} is missing screenshot framing metrics; rerun npm run sandbox:visual -- --ids <creature-id> --states idle,lunge,stunned --with diver`);
    return;
  }
  if (!framing.bbox) {
    failures.push(`${owner}: sandbox ${stateName} framing could not find a visible subject`);
    return;
  }
  if (numberOrZero(framing.widthRatio) > 0.92) {
    failures.push(`${owner}: sandbox ${stateName} subject is too wide for review framing (${framing.widthRatio})`);
  }
  if (numberOrZero(framing.heightRatio) > 0.84) {
    failures.push(`${owner}: sandbox ${stateName} subject is too tall for review framing (${framing.heightRatio})`);
  }
  if (numberOrZero(framing.areaRatio) > 0.68) {
    failures.push(`${owner}: sandbox ${stateName} subject fills too much viewport area (${framing.areaRatio})`);
  }
}

async function validateScreenshotSidecar(owner, stateName, sidecarPath, expected) {
  if (!sidecarPath) {
    failures.push(`${owner}: sandbox ${stateName} is missing screenshot sidecar metadata`);
    return;
  }
  await requireEvidenceFile(`${owner} sandbox ${stateName} sidecar`, resolve(sidecarPath), 128);
  const evidence = await readEvidenceJson(`${owner} sandbox ${stateName} sidecar`, resolve(sidecarPath));
  if (evidence.error) {
    failures.push(evidence.error);
    return;
  }
  const data = evidence.data ?? {};
  if (data.schema !== 'water9/sandbox-screenshot-sidecar@1') {
    failures.push(`${owner}: sandbox ${stateName} sidecar schema is ${data.schema ?? 'missing'}`);
  }
  for (const [key, value] of Object.entries(expected)) {
    if (String(data[key] ?? '') !== String(value)) {
      failures.push(`${owner}: sandbox ${stateName} sidecar ${key} ${data[key] ?? 'missing'} does not match ${value}`);
    }
  }
  if (!String(data.screenshotPath ?? '').trim()) {
    failures.push(`${owner}: sandbox ${stateName} sidecar is missing screenshotPath`);
  } else if (expected.screenshotPath && String(data.screenshotPath) !== String(expected.screenshotPath)) {
    failures.push(`${owner}: sandbox ${stateName} sidecar screenshotPath does not match report screenshotPath`);
  }
}

async function validateAcceptedSourcePreviewEvidence(owner, candidateId) {
  const previewId = `source-${candidateId}`;
  const result = sandboxResultsById.get(previewId);
  const candidate = sourceCandidatesById.get(candidateId);
  if (!result) {
    failures.push(`${owner}: source candidate ${candidateId} needs source preview visual evidence from npm run source:preview-check`);
    return;
  }
  if ((result.failures ?? []).length) {
    failures.push(`${owner}: source candidate ${candidateId} preview visual report has failures: ${result.failures.join('; ')}`);
  }
  if (result.snapshot?.entryId !== previewId) {
    failures.push(`${owner}: source candidate ${candidateId} preview snapshot entryId ${result.snapshot?.entryId ?? 'missing'} does not match ${previewId}`);
  }
  if (result.snapshot?.previewTexture !== previewId) {
    failures.push(`${owner}: source candidate ${candidateId} preview texture ${result.snapshot?.previewTexture ?? 'missing'} does not match ${previewId}`);
  }
  if (!result.snapshot?.hasPreviewSprite) {
    failures.push(`${owner}: source candidate ${candidateId} preview did not render a preview sprite`);
  }
  const canvas = result.canvas ?? {};
  if (!canvas.exists || numberOrZero(canvas.width) <= 0 || numberOrZero(canvas.height) <= 0) {
    failures.push(`${owner}: source candidate ${candidateId} preview has missing or zero-sized canvas`);
  }
  if (numberOrZero(canvas.opaqueSamples) < 120 || numberOrZero(canvas.variedSamples) < 8 || numberOrZero(canvas.lumaRange) < 12) {
    failures.push(`${owner}: source candidate ${candidateId} preview canvas appears blank or underdrawn`);
  }
  if (!result.screenshotPath) {
    failures.push(`${owner}: source candidate ${candidateId} preview is missing screenshotPath`);
  } else {
    await requireEvidenceFile(`${owner} source candidate ${candidateId} preview screenshot`, resolve(result.screenshotPath), 1024);
  }
  const idleState = Array.isArray(result.states) ? result.states.find((state) => state.state === 'idle') : null;
  await validateScreenshotSidecar(owner, `${candidateId} source-preview`, idleState?.sidecarPath, {
    id: previewId,
    kind: 'source',
    state: 'idle',
    reviewStage: 'source-approved',
    qualityStatus: candidate?.status ?? 'rigged',
    screenshotPath: idleState?.screenshotPath ?? result.screenshotPath,
  });
}

async function validateAcceptedKeyPreviewEvidence(owner, candidate, reviewItem) {
  const evidence = reviewItem?.keyPreviewEvidence;
  if (!evidence || typeof evidence !== 'object') {
    failures.push(`${owner}: accepted content needs fingerprinted chroma key preview evidence; rerun npm run source:gallery`);
    return;
  }
  if (evidence.schema !== 'water9/source-key-preview@1') {
    failures.push(`${owner}: chroma key preview evidence schema is ${evidence.schema ?? 'missing'}`);
  }
  if (evidence.id !== candidate.id) failures.push(`${owner}: chroma key preview evidence id ${evidence.id ?? 'missing'} does not match ${candidate.id}`);
  if (evidence.source !== candidate.source) failures.push(`${owner}: chroma key preview evidence source ${evidence.source ?? 'missing'} does not match candidate source ${candidate.source ?? 'missing'}`);
  if (evidence.keyPreviewFile !== reviewItem.keyPreviewFile) failures.push(`${owner}: chroma key preview evidence file ${evidence.keyPreviewFile ?? 'missing'} does not match review item`);
  if (evidence.renderer?.tool !== 'tools/render_source_key_preview.py') failures.push(`${owner}: chroma key preview evidence renderer tool is ${evidence.renderer?.tool ?? 'missing'}`);
  if (Number(evidence.renderer?.magentaThreshold) !== 12) failures.push(`${owner}: chroma key preview evidence magentaThreshold must be 12`);
  if (Number(evidence.renderer?.panelHeight) !== 420) failures.push(`${owner}: chroma key preview evidence panelHeight must be 420`);
  if (!String(evidence.generatedAt ?? '').trim()) failures.push(`${owner}: chroma key preview evidence missing generatedAt`);

  const currentSource = candidate.source ? await fileShaFingerprint(resolve(candidate.source)) : null;
  const currentPreview = reviewItem.keyPreviewFile ? await fileShaFingerprint(resolve(sourceCandidateReviewDir, reviewItem.keyPreviewFile)) : null;
  if (!evidence.sourceFingerprint?.sha256) {
    failures.push(`${owner}: chroma key preview evidence missing source sha256`);
  } else if (evidence.sourceFingerprint.sha256 !== currentSource?.sha256 || evidence.sourceFingerprint.size !== currentSource?.size) {
    failures.push(`${owner}: chroma key preview source fingerprint is stale; rerun npm run source:gallery`);
  }
  if (!evidence.keyPreviewFingerprint?.sha256) {
    failures.push(`${owner}: chroma key preview evidence missing preview sha256`);
  } else if (evidence.keyPreviewFingerprint.sha256 !== currentPreview?.sha256 || evidence.keyPreviewFingerprint.size !== currentPreview?.size) {
    failures.push(`${owner}: chroma key preview fingerprint is stale; rerun npm run source:gallery`);
  }
}

async function validateAcceptedReviewEvidence(owner, creature) {
  if (reviewEvidence.error) {
    failures.push(`${owner}: accepted content needs a fresh review manifest (${reviewEvidence.error})`);
    return;
  }
  if (reviewEvidence.data?.schema !== 'water9/articulated-review@1') {
    failures.push(`${owner}: review manifest schema is ${reviewEvidence.data?.schema ?? 'missing'}`);
  }
  const item = reviewItemsById.get(creature.id);
  if (!item) {
    failures.push(`${owner}: accepted content is missing from review manifest`);
    return;
  }
  if (!acceptedQuality(item.quality)) {
    failures.push(`${owner}: review manifest item is not strictly accepted; rerun npm run review:articulated after acceptance`);
  }
  if (!creature.quality || !qualityRecordsAgree(creature.quality, item.quality)) {
    failures.push(`${owner}: review manifest quality does not match runtime quality; rerun npm run review:articulated after acceptance`);
  }
  const sourceManifest = sourceManifests.get(creature.id);
  const expectedFingerprint = await creatureEvidenceFingerprint('water9-review-gallery@2', creature, sourceManifest);
  if (!item.inputFingerprint) {
    failures.push(`${owner}: review manifest is missing inputFingerprint; rerun npm run review:articulated:quick`);
  } else if (item.inputFingerprint !== expectedFingerprint) {
    failures.push(`${owner}: review manifest inputFingerprint is stale; rerun npm run review:articulated:quick`);
  }
  if (!item.sourceUrl) failures.push(`${owner}: review manifest is missing whole-source URL`);
  if (!item.sourceThumbFile) failures.push(`${owner}: review manifest is missing whole-source thumbnail`);
  if (!item.sourceParity?.metrics) failures.push(`${owner}: review manifest is missing source-parity metrics`);
  if ((item.sourceParity?.failures ?? []).length) {
    failures.push(`${owner}: source parity has failures: ${item.sourceParity.failures.join('; ')}`);
  }
  if (!item.autoVisualCohesion) {
    failures.push(`${owner}: review manifest is missing automated visual-cohesion audit`);
  } else {
    if (item.autoVisualCohesion.status !== 'pass') {
      failures.push(`${owner}: automated visual-cohesion audit status is ${item.autoVisualCohesion.status ?? 'missing'}, expected pass`);
    }
    if ((item.autoVisualCohesion.failures ?? []).length) {
      failures.push(`${owner}: automated visual-cohesion audit has failures: ${item.autoVisualCohesion.failures.join('; ')}`);
    }
    if ((item.autoVisualCohesion.partsChecked ?? 0) < (creature.parts?.length ?? 0)) {
      failures.push(`${owner}: automated visual-cohesion audit checked ${item.autoVisualCohesion.partsChecked ?? 0} parts, expected at least ${creature.parts?.length ?? 0}`);
    }
  }
  if (!item.sourceParityDebugFile) failures.push(`${owner}: review manifest is missing source-parity overlay`);
  if (!item.sourceParityThumbFile) failures.push(`${owner}: review manifest is missing source-parity thumbnail`);
  if (typeof item.sandboxUrl !== 'string' || !item.sandboxUrl.includes(`sandbox=${encodeURIComponent(creature.id)}`)) {
    failures.push(`${owner}: review manifest is missing sandbox URL for this creature`);
  }
  await requireEvidenceFile(`${owner} whole-source thumbnail`, resolve(reviewDir, item.sourceThumbFile ?? `thumbs/${creature.id}-source-thumb.png`), 512);
  await requireEvidenceFile(`${owner} contact sheet`, resolve(reviewDir, item.contactFile ?? `${creature.id}-contact.png`), 1024);
  await requireEvidenceFile(`${owner} phase strip`, resolve(reviewDir, item.phaseFile ?? `${creature.id}-phase.png`), 1024);
  await requireEvidenceFile(`${owner} contact thumbnail`, resolve(reviewDir, item.contactThumbFile ?? `thumbs/${creature.id}-contact-thumb.png`), 512);
  await requireEvidenceFile(`${owner} phase thumbnail`, resolve(reviewDir, item.phaseThumbFile ?? `thumbs/${creature.id}-phase-thumb.png`), 512);
  if (item.sourceParityDebugFile) await requireEvidenceFile(`${owner} source-parity overlay`, resolve(reviewDir, item.sourceParityDebugFile), 512);
  if (item.sourceParityThumbFile) await requireEvidenceFile(`${owner} source-parity thumbnail`, resolve(reviewDir, item.sourceParityThumbFile), 512);
}

async function validateAcceptedSourceCandidate(owner, creature, sourceManifest) {
  const candidateId = creature.quality?.sourceCandidateId ?? sourceManifest?.quality?.sourceCandidateId ?? sourceManifest?.sourceCandidateId;
  if (!candidateId) {
    failures.push(`${owner}: accepted content needs sourceCandidateId linking it to source-first review`);
    return;
  }
  if (sourceCandidateEvidence.error) {
    failures.push(`${owner}: accepted content needs source candidate manifest (${sourceCandidateEvidence.error})`);
    return;
  }
  const candidate = sourceCandidatesById.get(candidateId);
  if (!candidate) {
    failures.push(`${owner}: source candidate ${candidateId} is missing from ${sourceCandidatePath}`);
    return;
  }
  if (!sourceCandidateApproved(candidate)) {
    failures.push(`${owner}: source candidate ${candidateId} is not approved by the source-first gate`);
  }
  if (!sourceImageValidationRecorded(candidate)) {
    failures.push(`${owner}: source candidate ${candidateId} needs stored source-image validation evidence`);
  } else {
    const validation = candidate.review.imageValidation;
    await requireEvidenceFile(`${owner} source candidate ${candidateId} image-validation report`, resolve(validation.report), 512);
    const reportFingerprint = await fileShaFingerprint(resolve(validation.report));
    if (reportFingerprint.sha256 && validation.reportFingerprint?.sha256 !== reportFingerprint.sha256) {
      failures.push(`${owner}: source candidate ${candidateId} image-validation report sha256 is stale`);
    }
    if (reportFingerprint.size && validation.reportFingerprint?.size !== reportFingerprint.size) {
      failures.push(`${owner}: source candidate ${candidateId} image-validation report size is stale`);
    }
    const reportEvidence = await readEvidenceJson(`${owner} source candidate ${candidateId} image-validation report`, resolve(validation.report));
    if (reportEvidence.error) {
      failures.push(reportEvidence.error);
    } else if (reportEvidence.data?.schema !== 'water9/source-image-validation@1') {
      failures.push(`${owner}: source candidate ${candidateId} image-validation report schema is ${reportEvidence.data?.schema ?? 'missing'}`);
    } else {
      const reportMetric = (reportEvidence.data.metrics ?? []).find((entry) => entry.id === candidateId);
      if (!reportMetric) {
        failures.push(`${owner}: source candidate ${candidateId} image-validation report is missing candidate metric`);
      } else {
        if (reportMetric.validationFingerprint !== validation.validationFingerprint) {
          failures.push(`${owner}: source candidate ${candidateId} image-validation metric fingerprint does not match stored review evidence`);
        }
        if (reportMetric.sourceFingerprint?.sha256 !== validation.sourceFingerprint?.sha256) {
          failures.push(`${owner}: source candidate ${candidateId} image-validation report source sha256 does not match stored review evidence`);
        }
      }
    }
    if (candidate.source) {
      const sourcePath = resolve(candidate.source);
      const info = await optionalStat(sourcePath);
      if (info?.isFile()) {
        if (validation.metric.sourceFingerprint.size !== info.size) {
          failures.push(`${owner}: source candidate ${candidateId} image-validation size is stale`);
        }
        const currentSha = await sha256File(sourcePath);
        if (validation.metric.sourceFingerprint.sha256 !== currentSha) {
          failures.push(`${owner}: source candidate ${candidateId} image-validation sha256 is stale`);
        }
        if (validation.sourceFingerprint?.sha256 !== currentSha) {
          failures.push(`${owner}: source candidate ${candidateId} stored source fingerprint sha256 is stale`);
        }
      }
    }
  }
  if (candidate.status !== 'rigged') {
    failures.push(`${owner}: source candidate ${candidateId} status is ${candidate.status ?? 'missing'}, expected rigged`);
  }
  if (candidate.riggedCreatureId !== creature.id) {
    failures.push(`${owner}: source candidate ${candidateId} is linked to ${candidate.riggedCreatureId ?? 'missing'}, expected ${creature.id}`);
  }
  if (!candidate.source) {
    failures.push(`${owner}: source candidate ${candidateId} is missing source image path`);
  } else if (!(await fileExists(resolve(candidate.source)))) {
    failures.push(`${owner}: source candidate ${candidateId} source image ${candidate.source} is missing or too small`);
  }
  if (sourceManifest?.sourceCandidateId !== candidateId) {
    failures.push(`${owner}: source manifest sourceCandidateId ${sourceManifest?.sourceCandidateId ?? 'missing'} does not match ${candidateId}`);
  }
  if (candidate.source && sourceManifest?.source && candidate.source !== sourceManifest.source) {
    failures.push(`${owner}: source candidate image ${candidate.source} does not match articulated source image ${sourceManifest.source}`);
  }
  if (sourceCandidateReviewEvidence.error) {
    failures.push(`${owner}: accepted content needs source-candidate review evidence (${sourceCandidateReviewEvidence.error})`);
    return;
  }
  if (sourceCandidateReviewEvidence.data?.schema !== 'water9/source-candidate-review@1') {
    failures.push(`${owner}: source-candidate review manifest schema is ${sourceCandidateReviewEvidence.data?.schema ?? 'missing'}`);
  }
  const reviewItem = sourceCandidateReviewItemsById.get(candidateId);
  if (!reviewItem) {
    failures.push(`${owner}: source-candidate review manifest is missing ${candidateId}`);
    return;
  }
  if (reviewItem.approved !== true) {
    failures.push(`${owner}: source-candidate review item ${candidateId} is not approved`);
  }
  const expectedFingerprint = await sourceCandidateFingerprint(candidate);
  if (!reviewItem.inputFingerprint) {
    failures.push(`${owner}: source-candidate review item ${candidateId} is missing inputFingerprint`);
  } else if (reviewItem.inputFingerprint !== expectedFingerprint) {
    failures.push(`${owner}: source-candidate review item ${candidateId} is stale; rerun npm run source:gallery`);
  }
  if (reviewItem.source !== candidate.source) {
    failures.push(`${owner}: source-candidate review source ${reviewItem.source ?? 'missing'} does not match candidate source ${candidate.source ?? 'missing'}`);
  }
  if (!reviewItem.sourceThumbFile) {
    failures.push(`${owner}: source-candidate review item is missing source thumbnail`);
  }
  if (!reviewItem.keyPreviewFile) {
    failures.push(`${owner}: source-candidate review item is missing chroma key preview`);
  }
  if (reviewItem.sourceThumbFile) {
    await requireEvidenceFile(`${owner} source-candidate source thumbnail`, resolve(sourceCandidateReviewDir, reviewItem.sourceThumbFile), 512);
  }
  if (reviewItem.keyPreviewFile) {
    await requireEvidenceFile(`${owner} source-candidate chroma key preview`, resolve(sourceCandidateReviewDir, reviewItem.keyPreviewFile), 1024);
    await validateAcceptedKeyPreviewEvidence(owner, candidate, reviewItem);
  }
  await validateAcceptedSourcePreviewEvidence(owner, candidateId);
}

async function validateAcceptedSandboxEvidence(owner, creature) {
  if (sandboxReports.length === 0) {
    failures.push(`${owner}: accepted content needs a paired diver sandbox visual report from npm run sandbox:visual -- --ids ${creature.id} --states idle,lunge,stunned --with diver (${sandboxEvidence.error ?? 'no sandbox reports found'})`);
    return;
  }
  const result = sandboxPairedResultsById.get(creature.id);
  if (!result) {
    failures.push(`${owner}: paired diver sandbox visual reports are missing this creature`);
    return;
  }
  if (result.companion !== 'diver') {
    failures.push(`${owner}: sandbox visual report companion is ${result.companion ?? 'missing'}, expected diver`);
  }
  if ((result.failures ?? []).length) {
    failures.push(`${owner}: sandbox visual report has failures: ${result.failures.join('; ')}`);
  }
  const sourceManifest = sourceManifests.get(creature.id);
  const expectedFingerprint = await creatureEvidenceFingerprint('water9-sandbox-visual@2', creature, sourceManifest);
  if (!result.assetFingerprint) {
    failures.push(`${owner}: sandbox visual report is missing assetFingerprint; rerun npm run sandbox:visual -- --ids ${creature.id} --states idle,lunge,stunned --with diver`);
  } else if (result.assetFingerprint !== expectedFingerprint) {
    failures.push(`${owner}: sandbox visual report assetFingerprint is stale; rerun npm run sandbox:visual -- --ids ${creature.id} --states idle,lunge,stunned --with diver`);
  }
  if (result.snapshot?.entryId !== creature.id) {
    failures.push(`${owner}: sandbox snapshot entryId ${result.snapshot?.entryId ?? 'missing'} does not match accepted creature`);
  }
  if (result.snapshot?.unresolvedRequest) {
    failures.push(`${owner}: sandbox reported unresolved request ${result.snapshot.unresolvedRequest}`);
  }
  const canvas = result.canvas ?? {};
  if (!canvas.exists || numberOrZero(canvas.width) <= 0 || numberOrZero(canvas.height) <= 0) {
    failures.push(`${owner}: sandbox visual report has missing or zero-sized canvas`);
  }
  if (numberOrZero(canvas.opaqueSamples) < 120 || numberOrZero(canvas.variedSamples) < 8 || numberOrZero(canvas.lumaRange) < 12) {
    failures.push(`${owner}: sandbox visual report canvas appears blank or underdrawn`);
  }
  if (!result.screenshotPath) {
    failures.push(`${owner}: sandbox visual report is missing screenshotPath`);
  } else {
    await requireEvidenceFile(`${owner} sandbox screenshot`, resolve(result.screenshotPath), 1024);
    if (!String(result.screenshotPath).includes('__accepted__')) {
      failures.push(`${owner}: accepted sandbox screenshot filename must include __accepted__ review stage`);
    }
  }
  const states = Array.isArray(result.states) ? result.states : [];
  const statesByName = new Map(states.map((state) => [state.state, state]));
  for (const stateName of REQUIRED_SANDBOX_STATES) {
    const state = statesByName.get(stateName);
    if (!state) {
      failures.push(`${owner}: sandbox visual report is missing ${stateName} state evidence`);
      continue;
    }
    if ((state.failures ?? []).length) {
      failures.push(`${owner}: sandbox ${stateName} state has failures: ${state.failures.join('; ')}`);
    }
    if (state.snapshot?.entryId !== creature.id) {
      failures.push(`${owner}: sandbox ${stateName} snapshot entryId ${state.snapshot?.entryId ?? 'missing'} does not match accepted creature`);
    }
    if (state.snapshot?.companion !== 'diver') {
      failures.push(`${owner}: sandbox ${stateName} snapshot companion is ${state.snapshot?.companion ?? 'missing'}, expected diver`);
    }
    if (state.snapshot?.hasDiver !== true) {
      failures.push(`${owner}: sandbox ${stateName} snapshot did not render the diver companion`);
    }
    if (state.snapshot?.mode !== stateName) {
      failures.push(`${owner}: sandbox ${stateName} snapshot mode is ${state.snapshot?.mode ?? 'missing'}`);
    }
    const stateCanvas = state.canvas ?? {};
    if (!stateCanvas.exists || numberOrZero(stateCanvas.width) <= 0 || numberOrZero(stateCanvas.height) <= 0) {
      failures.push(`${owner}: sandbox ${stateName} has missing or zero-sized canvas`);
    }
    if (numberOrZero(stateCanvas.opaqueSamples) < 120 || numberOrZero(stateCanvas.variedSamples) < 8 || numberOrZero(stateCanvas.lumaRange) < 12) {
      failures.push(`${owner}: sandbox ${stateName} canvas appears blank or underdrawn`);
    }
    if (!state.screenshotPath) {
      failures.push(`${owner}: sandbox ${stateName} is missing screenshotPath`);
    } else {
      await requireEvidenceFile(`${owner} sandbox ${stateName} screenshot`, resolve(state.screenshotPath), 1024);
      if (!String(state.screenshotPath).includes('__accepted__')) {
        failures.push(`${owner}: accepted sandbox ${stateName} screenshot filename must include __accepted__ review stage`);
      }
    }
    await validateScreenshotSidecar(owner, stateName, state.sidecarPath, {
      id: creature.id,
      kind: 'articulated',
      state: stateName,
      reviewStage: 'accepted',
      qualityStatus: 'accepted',
      companion: 'diver',
      screenshotPath: state.screenshotPath,
    });
    validateSandboxFraming(owner, stateName, state.framing);
  }
}

const sourceManifests = await loadSourceManifests();
const reviewEvidence = await readEvidenceJson('review manifest', resolve(reviewDir, 'review-manifest.json'));
const sandboxEvidence = await readEvidenceJson('sandbox visual report', sandboxReportPath);
const sandboxReports = await loadSandboxReports();
const sourceCandidateEvidence = await readEvidenceJson('source candidate manifest', sourceCandidatePath);
const sourceCandidateReviewEvidence = await readEvidenceJson('source-candidate review manifest', resolve(sourceCandidateReviewDir, 'review-manifest.json'));
const acceptanceLedgerEvidence = await readEvidenceJson('human acceptance ledger', acceptanceLedgerPath);
const reviewItems = Array.isArray(reviewEvidence.data?.creatures) ? reviewEvidence.data.creatures : [];
const reviewItemsById = new Map(reviewItems.map((item) => [item.id, item]));
const sandboxResults = sandboxReports.flatMap(({ path, data, mtimeMs }) => (data.results ?? []).map((result) => ({ ...result, reportPath: path, reportMtimeMs: mtimeMs })));
const sandboxResultsById = new Map();
const sandboxPairedResultsById = new Map();
for (const result of sandboxResults) {
  if (!result.id) continue;
  const current = sandboxResultsById.get(result.id);
  if (!current || result.reportMtimeMs > current.reportMtimeMs) sandboxResultsById.set(result.id, result);
  if (result.companion === 'diver') {
    const currentPaired = sandboxPairedResultsById.get(result.id);
    if (!currentPaired || result.reportMtimeMs > currentPaired.reportMtimeMs) sandboxPairedResultsById.set(result.id, result);
  }
}
const sourceCandidates = Array.isArray(sourceCandidateEvidence.data?.candidates) ? sourceCandidateEvidence.data.candidates : [];
const sourceCandidatesById = new Map(sourceCandidates.map((candidate) => [candidate.id, candidate]));
const sourceCandidateReviewItems = Array.isArray(sourceCandidateReviewEvidence.data?.candidates) ? sourceCandidateReviewEvidence.data.candidates : [];
const sourceCandidateReviewItemsById = new Map(sourceCandidateReviewItems.map((candidate) => [candidate.id, candidate]));
const acceptanceLedgerEntries = Array.isArray(acceptanceLedgerEvidence.data?.entries) ? acceptanceLedgerEvidence.data.entries : [];
const acceptanceLedgerById = new Map(acceptanceLedgerEntries.map((entry) => [entry.id, entry]));
if (acceptanceLedgerEvidence.error) {
  failures.push(`accepted content needs a human acceptance ledger (${acceptanceLedgerEvidence.error})`);
} else if (acceptanceLedgerEvidence.data?.schema !== 'water9/content-acceptance-ledger@1') {
  failures.push(`human acceptance ledger schema is ${acceptanceLedgerEvidence.data?.schema ?? 'missing'}`);
}

if (manifest.schema !== 'asset-forge/sprite-parts@1') {
  failures.push(`manifest schema is ${manifest.schema ?? 'missing'}, expected asset-forge/sprite-parts@1`);
}

const creatures = Array.isArray(manifest.creatures) ? manifest.creatures : [];
if (allowPrototypes && creatures.length < minThreats) {
  failures.push(`only ${creatures.length}/${minThreats} articulated threats are registered`);
}

const ids = new Set();
const textureRefs = [];
for (const creature of creatures) {
  const owner = creature.id ?? 'unknown-creature';
  if (!creature.id) failures.push(`${owner}: missing id`);
  if (ids.has(creature.id)) failures.push(`${owner}: duplicate id`);
  ids.add(creature.id);
  if (!creature.species) failures.push(`${owner}: missing species`);
  if (!creature.rarity) failures.push(`${owner}: missing scan rarity`);
  if (!Number.isFinite(creature.radius) || creature.radius <= 0) failures.push(`${owner}: radius must be positive`);
  if (!Array.isArray(creature.parts) || creature.parts.length < 5) failures.push(`${owner}: expected at least 5 articulated parts`);
  if (!Array.isArray(creature.socketOverlays) || creature.socketOverlays.length < 3) failures.push(`${owner}: expected at least 3 socket overlays`);

  const partIds = new Set((creature.parts ?? []).map((part) => part.id));
  const roles = new Set();
  for (const part of creature.parts ?? []) {
    const partOwner = `${owner}.${part.id ?? 'unknown-part'}`;
    if (!part.id) failures.push(`${partOwner}: missing id`);
    if (!part.texture || !part.textureKey) failures.push(`${partOwner}: missing texture reference`);
    if (part.texture) textureRefs.push(`${partOwner}:${part.texture}`);
    if (part.damagedTexture) textureRefs.push(`${partOwner}:${part.damagedTexture}`);
    if (part.detachedTexture) textureRefs.push(`${partOwner}:${part.detachedTexture}`);
    if (!part.motion?.kind) failures.push(`${partOwner}: missing motion kind`);
    if (!part.anatomy?.role) failures.push(`${partOwner}: missing anatomy role`);
    else roles.add(part.anatomy.role);
    if (!Array.isArray(part.size) || part.size.some((value) => !Number.isFinite(value) || value <= 0)) {
      failures.push(`${partOwner}: invalid size`);
    }
    if (!Number.isFinite(part.hitRadius) || part.hitRadius <= 0) failures.push(`${partOwner}: invalid hitRadius`);
    if (part.parentId && !partIds.has(part.parentId)) failures.push(`${partOwner}: parentId ${part.parentId} is missing`);
    if (part.parentId && (!part.parentAnchor || !part.anchor)) failures.push(`${partOwner}: joint is missing anchor names`);
  }
  for (const role of ['head', 'torso', 'tail']) {
    if (!roles.has(role)) failures.push(`${owner}: missing anatomy role ${role}`);
  }
  for (const overlay of creature.socketOverlays ?? []) {
    const overlayOwner = `${owner}.${overlay.id ?? 'unknown-socket'}`;
    if (!overlay.texture || !overlay.textureKey) failures.push(`${overlayOwner}: missing texture reference`);
    if (overlay.texture) textureRefs.push(`${overlayOwner}:${overlay.texture}`);
    if (overlay.severedTexture) textureRefs.push(`${overlayOwner}:${overlay.severedTexture}`);
    if (!partIds.has(overlay.parentId)) failures.push(`${overlayOwner}: parentId ${overlay.parentId} is missing`);
    if (!partIds.has(overlay.childId)) failures.push(`${overlayOwner}: childId ${overlay.childId} is missing`);
  }

  const sourceManifest = sourceManifests.get(creature.id);
  const runtimeQuality = creature.quality;
  const sourceQuality = sourceManifest?.quality;
  const quality = runtimeQuality ?? sourceQuality;
  if (!sourceManifest) {
    failures.push(`${owner}: missing articulated source manifest`);
  } else {
    if (sourceManifest.schema !== 'asset-forge/articulated-creature@1') {
      failures.push(`${owner}: source manifest schema is ${sourceManifest.schema ?? 'missing'}`);
    }
    if (!sourceManifest.source) {
      failures.push(`${owner}: source manifest is missing whole-source image`);
    } else if (!(await fileExists(resolve(sourceManifest.source)))) {
      failures.push(`${owner}: whole-source image ${sourceManifest.source} is missing or too small`);
    }
    if (!Array.isArray(sourceManifest.parts) || sourceManifest.parts.length < (creature.parts?.length ?? 0)) {
      failures.push(`${owner}: source manifest does not cover every runtime part`);
    }
  }

  if (!quality) {
    acceptanceFailures.push(`${owner}: missing quality metadata`);
  } else {
    if (quality.status === requiredStatus && !runtimeQuality) {
      acceptanceFailures.push(`${owner}: accepted quality metadata must exist in runtime manifest`);
    }
    if (quality.status === requiredStatus && !sourceQuality) {
      acceptanceFailures.push(`${owner}: accepted quality metadata must exist in source manifest`);
    }
    if (quality.status === requiredStatus && runtimeQuality && sourceQuality && !qualityRecordsAgree(runtimeQuality, sourceQuality)) {
      acceptanceFailures.push(`${owner}: runtime/source accepted quality metadata must match exactly`);
    }
    if (quality.sourceCohesion !== 'single-source') {
      acceptanceFailures.push(`${owner}: quality.sourceCohesion must be single-source`);
    }
    if (quality.backgroundKey !== 'magenta') {
      acceptanceFailures.push(`${owner}: quality.backgroundKey must be magenta`);
    }
    if (quality.status !== requiredStatus) {
      acceptanceFailures.push(`${owner}: quality.status is ${quality.status ?? 'missing'}, expected ${requiredStatus}`);
    }
    if (quality.status === requiredStatus && !quality.reviewedBy) {
      acceptanceFailures.push(`${owner}: accepted quality metadata needs reviewedBy`);
    }
    if (quality.status === requiredStatus && DISALLOWED_REVIEWERS.has(String(quality.reviewedBy ?? '').trim().toLowerCase())) {
      acceptanceFailures.push(`${owner}: accepted quality metadata needs a human reviewer, not ${quality.reviewedBy}`);
    }
    if (quality.status === requiredStatus && !quality.reviewedAt) {
      acceptanceFailures.push(`${owner}: accepted quality metadata needs reviewedAt`);
    }
    if (quality.status === requiredStatus && !meaningfulReviewText(quality.acceptanceNote)) {
      acceptanceFailures.push(`${owner}: accepted quality metadata needs a specific acceptanceNote`);
    }
    if (quality.status === requiredStatus && !quality.sourceCandidateId) {
      acceptanceFailures.push(`${owner}: accepted quality metadata needs sourceCandidateId`);
    }
    if (quality.status === requiredStatus) {
      const visualChecklist = quality.visualChecklist ?? {};
      const visualScores = quality.visualScores ?? {};
      for (const check of REQUIRED_VISUAL_CHECKS) {
        if (visualChecklist[check] !== true) {
          acceptanceFailures.push(`${owner}: quality.visualChecklist.${check} must be true for accepted quality`);
        }
        if (!Number.isFinite(visualScores[check]) || visualScores[check] < MIN_VISUAL_SCORE || visualScores[check] > 5) {
          acceptanceFailures.push(`${owner}: quality.visualScores.${check} must be ${MIN_VISUAL_SCORE}-5 for accepted quality`);
        }
        if (!meaningfulReviewText(quality.visualNotes?.[check], MIN_VISUAL_NOTE_LENGTH)) {
          acceptanceFailures.push(`${owner}: quality.visualNotes.${check} needs a specific review rationale`);
        }
        if (meaningfulReviewText(quality.visualNotes?.[check], MIN_VISUAL_NOTE_LENGTH) && !reviewNoteHasEvidenceTerms(quality.visualNotes?.[check], RIG_VISUAL_NOTE_TERMS[check])) {
          acceptanceFailures.push(`${owner}: quality.visualNotes.${check} must cite relevant evidence terms: ${RIG_VISUAL_NOTE_TERMS[check].join(', ')}`);
        }
      }
      const noteDistinctness = distinctReviewNotes(quality.visualNotes, REQUIRED_VISUAL_CHECKS);
      if (!noteDistinctness.ok) {
        acceptanceFailures.push(`${owner}: accepted quality visual notes must be distinct; duplicate pairs: ${noteDistinctness.duplicates.join(', ') || 'missing notes'}`);
      }
      const reviewEvidence = quality.reviewEvidence ?? {};
      for (const check of REQUIRED_REVIEW_EVIDENCE) {
        if (reviewEvidence[check] !== true) {
          acceptanceFailures.push(`${owner}: quality.reviewEvidence.${check} must be true for accepted quality`);
        }
      }
    }
    if (quality.status === requiredStatus) {
      await validateAcceptedSourceCandidate(owner, creature, sourceManifest);
      await validateAcceptedReviewEvidence(owner, creature);
      await validateAcceptedSandboxEvidence(owner, creature);
      await validateLedgerForAcceptedCreature(owner, creature, sourceManifest);
    }
  }
}

for (const ref of textureRefs) {
  const [owner, texture] = ref.split(':');
  const path = resolve('public/assets/generated', texture);
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < 128) failures.push(`${owner}: texture ${texture} is missing or too small`);
  } catch {
    failures.push(`${owner}: texture ${texture} does not exist`);
  }
}

const acceptedThreats = creatures.filter((creature) => {
  const sourceManifest = sourceManifests.get(creature.id);
  return ledgerBackedAcceptance(creature, sourceManifest);
}).length;

if (!allowPrototypes && acceptedThreats < minThreats) {
  failures.push(`only ${acceptedThreats}/${minThreats} articulated threats are accepted`);
}

if (!allowPrototypes) failures.push(...acceptanceFailures);

const summary = {
  targetThreats: minThreats,
  registeredThreats: creatures.length,
  acceptedThreats,
  prototypeThreats: creatures.length - acceptedThreats,
  allowPrototypes,
  requiredStatus,
  reviewDir,
  sandboxReportPath,
  sandboxReportDir,
  sourcePreviewReportPath,
  sandboxReports: sandboxReports.length,
  sandboxUniqueChecked: sandboxResultsById.size,
  sourceCandidatePath,
  acceptanceLedgerPath,
  acceptanceLedgerEntries: acceptanceLedgerEntries.length,
  failures,
  acceptanceFailures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

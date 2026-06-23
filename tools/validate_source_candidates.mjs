import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { MIN_VISUAL_NOTE_LENGTH, meaningfulReviewText, reviewNoteHasEvidenceTerms } from './review_text_quality.mjs';
import { sourceApprovedStrict, sourcePlanCoverageRecorded, sourceVisualBoardRecorded } from './content_quality_predicates.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const reviewDir = resolve(String(args.get('review-dir') ?? 'public/review/source-candidates'));
const reviewManifestPath = resolve(reviewDir, 'review-manifest.json');
const rejectionPath = resolve(String(args.get('rejections') ?? 'public/review/source-candidates/rejected-attempts.json'));
const runtimeManifestPath = resolve('public/assets/generated/articulated-creatures.parts.json');
const generatedDir = resolve('public/assets/generated');
const failures = [];
const STATUSES = new Set(['draft', 'needs-review', 'approved', 'rejected', 'rigged']);
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

async function readJson(label, path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

async function readOptionalJson(label, path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

async function requireFile(label, path, minSize = 128) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minSize) failures.push(`${label}: missing or too small`);
  } catch {
    failures.push(`${label}: does not exist`);
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

async function candidateFingerprint(candidate) {
  const sourceFile = candidate.source ? await fileFingerprint(resolve(candidate.source)) : null;
  const payload = {
    tool: 'water9-source-candidate-review@2',
    candidate,
    sourceFile,
  };
  return createHash('sha256').update(stableJson(payload)).digest('hex');
}

async function validateKeyPreviewEvidence(owner, candidate, item) {
  const evidence = item?.keyPreviewEvidence;
  if (!evidence || typeof evidence !== 'object') {
    failures.push(`${owner}: review item is missing fingerprinted chroma key preview evidence; run npm run source:gallery`);
    return;
  }
  if (evidence.schema !== 'water9/source-key-preview@1') {
    failures.push(`${owner}: key preview evidence schema is ${evidence.schema ?? 'missing'}`);
  }
  if (evidence.id !== candidate.id) failures.push(`${owner}: key preview evidence id ${evidence.id ?? 'missing'} does not match candidate`);
  if (evidence.source !== candidate.source) failures.push(`${owner}: key preview evidence source ${evidence.source ?? 'missing'} does not match candidate source ${candidate.source ?? 'missing'}`);
  if (evidence.keyPreviewFile !== item.keyPreviewFile) failures.push(`${owner}: key preview evidence file ${evidence.keyPreviewFile ?? 'missing'} does not match review item`);
  if (evidence.renderer?.tool !== 'tools/render_source_key_preview.py') failures.push(`${owner}: key preview evidence renderer tool is ${evidence.renderer?.tool ?? 'missing'}`);
  if (Number(evidence.renderer?.magentaThreshold) !== 12) failures.push(`${owner}: key preview evidence magentaThreshold must be 12`);
  if (Number(evidence.renderer?.panelHeight) !== 420) failures.push(`${owner}: key preview evidence panelHeight must be 420`);
  if (!String(evidence.generatedAt ?? '').trim()) failures.push(`${owner}: key preview evidence missing generatedAt`);

  const currentSource = await fileShaFingerprint(resolve(candidate.source));
  const currentPreview = await fileShaFingerprint(resolve(reviewDir, item.keyPreviewFile));
  if (!evidence.sourceFingerprint?.sha256) {
    failures.push(`${owner}: key preview evidence missing source sha256`);
  } else if (evidence.sourceFingerprint.sha256 !== currentSource.sha256 || evidence.sourceFingerprint.size !== currentSource.size) {
    failures.push(`${owner}: key preview source fingerprint is stale; run npm run source:gallery`);
  }
  if (!evidence.keyPreviewFingerprint?.sha256) {
    failures.push(`${owner}: key preview evidence missing preview sha256`);
  } else if (evidence.keyPreviewFingerprint.sha256 !== currentPreview.sha256 || evidence.keyPreviewFingerprint.size !== currentPreview.size) {
    failures.push(`${owner}: key preview fingerprint is stale; run npm run source:gallery`);
  }
}

function sourceApproved(candidate) {
  return sourceApprovedStrict(candidate);
}

function sourceImageValidationRecorded(candidate) {
  const validation = candidate.review?.imageValidation;
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
    && metric.failures.length === 0
    && Array.isArray(metric?.size)
    && Array.isArray(metric?.subjectBBox)
    && Array.isArray(metric?.subjectSize)
    && Number(metric?.detail?.colorEntropy) >= 3
    && Number(metric?.detail?.quantizedColorBins) >= 64
    && Number(metric?.detail?.edgeDensity) >= 0.015
    && Number(metric?.detail?.averageLocalContrast) >= 1.5
    && Number(metric?.connectivity?.largestComponentRatio) >= 0.75
    && Number(metric?.connectivity?.significantComponents) <= 6;
}

function sourceArtContractRecorded(candidate) {
  const evidence = candidate.review?.artContract;
  const fileBase = safeFileName(candidate.id);
  return evidence?.schema === 'water9/source-art-contract-review@1'
    && evidence.id === candidate.id
    && evidence.json === `public/review/source-candidates/art-contracts/${fileBase}.json`
    && evidence.markdown === `public/review/source-candidates/art-contracts/${fileBase}.md`
    && evidence.expectedOutput === `public/assets/generated/fauna-${candidate.id}-whole-source.png`
    && Boolean(evidence.jsonFingerprint?.sha256)
    && Boolean(evidence.markdownFingerprint?.sha256)
    && Boolean(String(evidence.recordedAt ?? '').trim());
}

async function validateApprovedImageValidation(owner, candidate) {
  if (!sourceImageValidationRecorded(candidate)) {
    failures.push(`${owner}: approved/rigged candidate needs stored source-image validation evidence`);
    return;
  }
  const validation = candidate.review.imageValidation;
  const metric = validation.metric;
  await requireFile(`${owner} source-image validation report`, resolve(validation.report), 512);
  const reportFingerprint = await fileShaFingerprint(resolve(validation.report));
  if (reportFingerprint.sha256 && validation.reportFingerprint?.sha256 !== reportFingerprint.sha256) {
    failures.push(`${owner}: stored source-image validation report sha256 is stale`);
  }
  if (reportFingerprint.size && validation.reportFingerprint?.size !== reportFingerprint.size) {
    failures.push(`${owner}: stored source-image validation report size is stale`);
  }
  const report = await readOptionalJson(`${owner} source-image validation report`, resolve(validation.report));
  if (!report) {
    failures.push(`${owner}: source-image validation report could not be read`);
  } else if (report.schema !== 'water9/source-image-validation@1') {
    failures.push(`${owner}: source-image validation report schema is ${report.schema ?? 'missing'}`);
  } else {
    const reportMetric = (report.metrics ?? []).find((entry) => entry.id === candidate.id);
    if (!reportMetric) {
      failures.push(`${owner}: source-image validation report is missing this candidate metric`);
    } else {
      if (reportMetric.validationFingerprint !== validation.validationFingerprint) {
        failures.push(`${owner}: stored source-image validation fingerprint does not match report metric`);
      }
      if (reportMetric.sourceFingerprint?.sha256 !== validation.sourceFingerprint?.sha256) {
        failures.push(`${owner}: stored source-image validation source sha does not match report metric`);
      }
    }
  }
  if (!candidate.source) return;
  const sourcePath = resolve(candidate.source);
  const info = await optionalStat(sourcePath);
  if (!info?.isFile()) return;
  if (metric.sourceFingerprint.size !== info.size) {
    failures.push(`${owner}: stored source-image validation size is stale`);
  }
  const currentSha = await sha256File(sourcePath);
  if (metric.sourceFingerprint.sha256 !== currentSha) {
    failures.push(`${owner}: stored source-image validation sha256 is stale; rerun npm run source:accept after image changes`);
  }
  if (validation.sourceFingerprint?.sha256 !== currentSha) {
    failures.push(`${owner}: stored source fingerprint sha256 is stale; rerun npm run source:accept after image changes`);
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function containsEvery(haystack, needles) {
  const text = String(haystack ?? '');
  return needles.every((needle) => text.includes(String(needle)));
}

async function validateApprovedArtContract(owner, candidate) {
  if (!sourceArtContractRecorded(candidate)) {
    failures.push(`${owner}: approved/rigged candidate needs stored source art contract evidence`);
    return;
  }
  const evidence = candidate.review.artContract;
  await requireFile(`${owner} source art contract JSON`, resolve(evidence.json), 512);
  await requireFile(`${owner} source art contract markdown`, resolve(evidence.markdown), 1024);
  const jsonFingerprint = await fileShaFingerprint(resolve(evidence.json));
  const markdownFingerprint = await fileShaFingerprint(resolve(evidence.markdown));
  if (jsonFingerprint.sha256 && evidence.jsonFingerprint?.sha256 !== jsonFingerprint.sha256) {
    failures.push(`${owner}: stored source art contract JSON sha256 is stale`);
  }
  if (jsonFingerprint.size && evidence.jsonFingerprint?.size !== jsonFingerprint.size) {
    failures.push(`${owner}: stored source art contract JSON size is stale`);
  }
  if (markdownFingerprint.sha256 && evidence.markdownFingerprint?.sha256 !== markdownFingerprint.sha256) {
    failures.push(`${owner}: stored source art contract markdown sha256 is stale`);
  }
  if (markdownFingerprint.size && evidence.markdownFingerprint?.size !== markdownFingerprint.size) {
    failures.push(`${owner}: stored source art contract markdown size is stale`);
  }
  const contract = await readOptionalJson(`${owner} source art contract`, resolve(evidence.json));
  if (!contract) {
    failures.push(`${owner}: source art contract could not be read`);
    return;
  }
  if (contract.schema !== 'water9/source-art-contract@1') {
    failures.push(`${owner}: source art contract schema is ${contract.schema ?? 'missing'}`);
  }
  if (contract.id !== candidate.id) failures.push(`${owner}: source art contract id does not match candidate`);
  if (contract.expectedOutput !== `public/assets/generated/fauna-${candidate.id}-whole-source.png`) {
    failures.push(`${owner}: source art contract expectedOutput is stale`);
  }
  if (contract.source && contract.source !== candidate.source) {
    failures.push(`${owner}: source art contract source does not match candidate source`);
  }
  if (!containsEvery(asArray(contract.requiredRead).join('\n'), asArray(candidate.requiredRead))) {
    failures.push(`${owner}: source art contract is missing candidate requiredRead entries`);
  }
  if (!containsEvery(asArray(contract.articulatableParts).join('\n'), asArray(candidate.articulatableParts))) {
    failures.push(`${owner}: source art contract is missing candidate articulatableParts entries`);
  }
  if (!containsEvery(asArray(contract.promptRisks).join('\n'), asArray(candidate.promptRisks))) {
    failures.push(`${owner}: source art contract is missing candidate promptRisks entries`);
  }
  if (!containsEvery(asArray(contract.contractReviewChecklist).join('\n'), asArray(candidate.contractReviewChecklist))) {
    failures.push(`${owner}: source art contract is missing candidate contractReviewChecklist entries`);
  }
  if (!containsEvery(contract.generationPrompt, [
    ...asArray(candidate.requiredRead),
    ...asArray(candidate.contractReviewChecklist),
    'One-source proof:',
    'Connection proof:',
    'Style proof:',
    'Proportion proof:',
    'Production proof:',
  ])) {
    failures.push(`${owner}: source art contract generation prompt is missing required cohesion/contract text`);
  }
}

async function validateApprovedPlanCoverage(owner, candidate) {
  if (!sourcePlanCoverageRecorded(candidate)) {
    failures.push(`${owner}: approved/rigged candidate needs stored articulation plan coverage and plan-preview evidence`);
    return;
  }
  const evidence = candidate.review.planCoverage;
  await requireFile(`${owner} articulation plan`, resolve(evidence.plan), 1024);
  await requireFile(`${owner} articulation plan preview`, resolve(evidence.planPreview), 1024);
  await requireFile(`${owner} content plan coverage report`, resolve(evidence.report), 512);
  const planFingerprint = await fileShaFingerprint(resolve(evidence.plan));
  const previewFingerprint = await fileShaFingerprint(resolve(evidence.planPreview));
  if (planFingerprint.sha256 && evidence.planFingerprint?.sha256 !== planFingerprint.sha256) {
    failures.push(`${owner}: stored articulation plan sha256 is stale`);
  }
  if (planFingerprint.size && evidence.planFingerprint?.size !== planFingerprint.size) {
    failures.push(`${owner}: stored articulation plan size is stale`);
  }
  if (previewFingerprint.sha256 && evidence.previewFingerprint?.sha256 !== previewFingerprint.sha256) {
    failures.push(`${owner}: stored articulation plan preview sha256 is stale`);
  }
  if (previewFingerprint.size && evidence.previewFingerprint?.size !== previewFingerprint.size) {
    failures.push(`${owner}: stored articulation plan preview size is stale`);
  }
  const report = await readOptionalJson(`${owner} content plan coverage`, resolve(evidence.report));
  if (!report) {
    failures.push(`${owner}: content plan coverage report could not be read`);
    return;
  }
  if (report.schema !== 'water9/content-plan-coverage@1') {
    failures.push(`${owner}: content plan coverage schema is ${report.schema ?? 'missing'}`);
  }
  const item = (report.items ?? []).find((entry) => entry.id === candidate.id);
  if (!item) {
    failures.push(`${owner}: content plan coverage report is missing this candidate`);
    return;
  }
  if (item.source !== candidate.source) failures.push(`${owner}: content plan coverage source does not match candidate source`);
  if (item.artifacts?.plan?.path !== evidence.plan) failures.push(`${owner}: content plan coverage plan path does not match stored evidence`);
  if (item.artifacts?.planPreview?.path !== evidence.planPreview) failures.push(`${owner}: content plan coverage preview path does not match stored evidence`);
  if (item.artifacts?.plan?.exists !== true) failures.push(`${owner}: content plan coverage plan is not marked present`);
  if (item.artifacts?.planPreview?.exists !== true) failures.push(`${owner}: content plan coverage preview is not marked present`);
}

async function validateApprovedSourceVisualBoard(owner, candidate) {
  if (!sourceVisualBoardRecorded(candidate)) {
    failures.push(`${owner}: approved/rigged candidate needs stored source visual board evidence`);
    return;
  }
  const evidence = candidate.review.sourceVisualBoard;
  await requireFile(`${owner} source visual board report`, resolve(evidence.report), 512);
  const board = await readOptionalJson(`${owner} source visual board`, resolve(evidence.report));
  if (!board) {
    failures.push(`${owner}: source visual board report could not be read`);
    return;
  }
  if (board.schema !== 'water9/source-visual-board@1') failures.push(`${owner}: source visual board schema is ${board.schema ?? 'missing'}`);
  const item = (board.items ?? []).find((entry) => entry.id === candidate.id);
  if (!item) {
    failures.push(`${owner}: source visual board is missing this candidate`);
    return;
  }
  for (const label of ['source', 'keyPreview', 'sandboxScreenshot', 'planPreview']) {
    const stored = evidence.media?.[label];
    const boardStored = item.mediaEvidence?.[label];
    if (!stored?.path) {
      failures.push(`${owner}: stored source visual board media ${label} missing path`);
      continue;
    }
    await requireFile(`${owner} source visual board media ${label}`, resolve(stored.path), 512);
    const current = await fileShaFingerprint(resolve(stored.path));
    if (stored.fingerprint?.sha256 && current.sha256 && stored.fingerprint.sha256 !== current.sha256) failures.push(`${owner}: stored source visual board media ${label} sha256 is stale`);
    if (boardStored?.sha256 && current.sha256 && boardStored.sha256 !== current.sha256) failures.push(`${owner}: board source visual media ${label} sha256 is stale`);
  }
}

function normalizedReviewNote(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function duplicateVisualNotePairs(review) {
  const seen = new Map();
  const duplicates = [];
  for (const check of REQUIRED_VISUAL_CHECKS) {
    const normalized = normalizedReviewNote(review?.visualNotes?.[check]);
    if (!normalized) continue;
    const previous = seen.get(normalized);
    if (previous) duplicates.push(`${previous}/${check}`);
    else seen.set(normalized, check);
  }
  return duplicates;
}

const manifest = await readJson('source candidate manifest', manifestPath);
const reviewManifest = await readJson('source candidate review manifest', reviewManifestPath);
const rejectionManifest = await readOptionalJson('source rejected attempts manifest', rejectionPath);
const runtimeManifest = await readJson('articulated runtime manifest', runtimeManifestPath);
const candidates = Array.isArray(manifest?.candidates) ? manifest.candidates : [];
const reviewItems = Array.isArray(reviewManifest?.candidates) ? reviewManifest.candidates : [];
const reviewById = new Map(reviewItems.map((item) => [item.id, item]));
const runtimeCreatures = Array.isArray(runtimeManifest?.creatures) ? runtimeManifest.creatures : [];
const runtimeIds = new Set(runtimeCreatures.map((creature) => creature.id));
const sourceManifestByRuntimeId = new Map();
try {
  const files = (await import('node:fs/promises')).readdir;
  for (const file of await files(generatedDir)) {
    if (!file.endsWith('.articulated.json')) continue;
    const data = JSON.parse(await readFile(resolve(generatedDir, file), 'utf8'));
    if (data.runtimeCreatureId) sourceManifestByRuntimeId.set(data.runtimeCreatureId, data);
  }
} catch (error) {
  failures.push(`could not read articulated source manifests: ${error.message}`);
}
const ids = new Set();

if (manifest?.schema !== 'water9/source-candidates@1') failures.push(`source candidate manifest schema is ${manifest?.schema ?? 'missing'}`);
if (reviewManifest?.schema !== 'water9/source-candidate-review@1') failures.push(`source candidate review manifest schema is ${reviewManifest?.schema ?? 'missing'}`);
if (reviewManifest && reviewManifest.candidateCount !== candidates.length) failures.push(`review candidateCount ${reviewManifest.candidateCount} does not match manifest ${candidates.length}`);

for (const candidate of candidates) {
  const owner = candidate.id ?? 'unknown-candidate';
  if (!candidate.id) failures.push(`${owner}: missing id`);
  if (candidate.id && ids.has(candidate.id)) failures.push(`${owner}: duplicate id`);
  if (candidate.id) ids.add(candidate.id);
  if (!candidate.species) failures.push(`${owner}: missing species`);
  if (!STATUSES.has(candidate.status)) failures.push(`${owner}: invalid status ${candidate.status ?? 'missing'}`);
  if (candidate.sourceCohesion && candidate.sourceCohesion !== 'single-source') failures.push(`${owner}: sourceCohesion must be single-source`);
  if (candidate.backgroundKey && candidate.backgroundKey !== 'magenta') failures.push(`${owner}: backgroundKey must be magenta`);
  if ((candidate.status === 'needs-review' || candidate.status === 'approved' || candidate.status === 'rigged') && !candidate.source) {
    failures.push(`${owner}: ${candidate.status} candidate needs a whole-source image path`);
  }
  if (candidate.source) await requireFile(`${owner} whole-source image`, resolve(candidate.source), 512);
  if ((candidate.status === 'approved' || candidate.status === 'rigged') && !sourceApproved(candidate)) {
    failures.push(`${owner}: approved/rigged candidate needs human source approval, every source visual check, every source visual score, source-image validation evidence, source art contract evidence, articulation plan-preview evidence, and source visual board evidence`);
  }
  if (candidate.status === 'approved' || candidate.status === 'rigged') {
    await validateApprovedImageValidation(owner, candidate);
    await validateApprovedArtContract(owner, candidate);
    await validateApprovedPlanCoverage(owner, candidate);
    await validateApprovedSourceVisualBoard(owner, candidate);
    const duplicatePairs = duplicateVisualNotePairs(candidate.review);
    if (duplicatePairs.length) failures.push(`${owner}: duplicate visual-note text across checks: ${duplicatePairs.join(', ')}`);
  }
  if (candidate.status === 'rigged') {
    if (!candidate.riggedCreatureId) {
      failures.push(`${owner}: rigged candidate needs riggedCreatureId`);
    } else {
      if (!runtimeIds.has(candidate.riggedCreatureId)) failures.push(`${owner}: riggedCreatureId ${candidate.riggedCreatureId} is missing from runtime manifest`);
      const sourceManifest = sourceManifestByRuntimeId.get(candidate.riggedCreatureId);
      if (!sourceManifest) failures.push(`${owner}: riggedCreatureId ${candidate.riggedCreatureId} has no articulated source manifest`);
      if (sourceManifest && sourceManifest.sourceCandidateId !== candidate.id && sourceManifest.quality?.sourceCandidateId !== candidate.id) {
        failures.push(`${owner}: articulated source manifest for ${candidate.riggedCreatureId} does not link back to this source candidate`);
      }
    }
  }
  const item = reviewById.get(candidate.id);
  if (!item) {
    failures.push(`${owner}: missing from source candidate review manifest; run npm run source:gallery`);
  } else {
    const expectedFingerprint = await candidateFingerprint(candidate);
    if (!item.inputFingerprint) {
      failures.push(`${owner}: review item is missing inputFingerprint; run npm run source:gallery`);
    }
    if ((candidate.status === 'approved' || candidate.status === 'rigged') && item.inputFingerprint !== expectedFingerprint) {
      failures.push(`${owner}: source-candidate review item is stale; rerun npm run source:gallery after approval or source changes`);
    }
    if ((candidate.status === 'approved' || candidate.status === 'rigged') && !item.approved) {
      failures.push(`${owner}: review item is not strictly approved; rerun npm run source:gallery after approval`);
    }
    if (candidate.source && !item.sourceThumbFile) failures.push(`${owner}: review item is missing source thumbnail`);
    if (candidate.source && !item.keyPreviewFile) failures.push(`${owner}: review item is missing chroma key preview`);
    if (item.sourceThumbFile) await requireFile(`${owner} source thumbnail`, resolve(reviewDir, item.sourceThumbFile), 512);
    if (item.keyPreviewFile) await requireFile(`${owner} chroma key preview`, resolve(reviewDir, item.keyPreviewFile), 1024);
    if (candidate.source && item.keyPreviewFile) await validateKeyPreviewEvidence(owner, candidate, item);
    const checklistIds = new Set((item.manualVisualChecklist ?? []).map((check) => check.id));
    for (const check of REQUIRED_VISUAL_CHECKS) {
      if (!checklistIds.has(check)) failures.push(`${owner}: review item missing visual check ${check}`);
    }
  }
}

const reviewIds = new Set(reviewItems.map((item) => item.id));
for (const item of reviewItems) {
  if (!ids.has(item.id)) failures.push(`${item.id}: review item not present in source candidate manifest`);
}

if (rejectionManifest) {
  if (rejectionManifest.schema !== 'water9/source-rejected-attempts@1') {
    failures.push(`source rejected attempts schema is ${rejectionManifest.schema ?? 'missing'}`);
  }
  const attempts = Array.isArray(rejectionManifest.attempts) ? rejectionManifest.attempts : [];
  const attemptIds = new Set();
  for (const attempt of attempts) {
    const owner = attempt.id ?? 'unknown-rejected-attempt';
    if (!attempt.id) failures.push(`${owner}: missing id`);
    if (attempt.id && attemptIds.has(attempt.id)) failures.push(`${owner}: duplicate rejected attempt id`);
    if (attempt.id) attemptIds.add(attempt.id);
    if (!attempt.candidateId || !ids.has(attempt.candidateId)) {
      failures.push(`${owner}: candidateId ${attempt.candidateId ?? 'missing'} is not in source candidates`);
    }
    if (!attempt.species) failures.push(`${owner}: missing species`);
    if (!attempt.rejectedAt) failures.push(`${owner}: missing rejectedAt`);
    if (String(attempt.reason ?? '').trim().length < 24) failures.push(`${owner}: reason must explain the rejection`);
    if (attempt.attemptKind && !['visual-failure', 'missing-artifact', 'tooling-failure'].includes(attempt.attemptKind)) {
      failures.push(`${owner}: attemptKind ${attempt.attemptKind} is invalid`);
    }
    if (attempt.attemptKind === 'visual-failure' && !attempt.copiedImage) failures.push(`${owner}: visual-failure rejected attempt requires copiedImage`);
    if (attempt.attemptKind === 'missing-artifact' && attempt.copiedImage) failures.push(`${owner}: missing-artifact rejected attempt must not include copiedImage`);
    if (attempt.attemptKind === 'visual-failure') {
      if (!attempt.originalImageFingerprint?.sha256) failures.push(`${owner}: visual-failure attempt missing original image sha256`);
      if (!attempt.copiedImageFingerprint?.sha256) failures.push(`${owner}: visual-failure attempt missing copied image sha256`);
    }
    if (attempt.copiedImage) await requireFile(`${owner} rejected image`, resolve(attempt.copiedImage), 512);
  }
}

const summary = {
  candidates: candidates.length,
  approvedCandidates: candidates.filter(sourceApproved).length,
  reviewItems: reviewItems.length,
  rejectedAttempts: rejectionManifest?.attempts?.length ?? 0,
  reviewDir,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

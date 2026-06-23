import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const manifestPath = resolve(root, 'public/review/sandbox/manifest.json');
const htmlPath = resolve(root, 'public/review/sandbox/index.html');
const labHtmlPath = resolve(root, 'public/review/sandbox/lab.html');
const articulatedReviewPath = resolve(root, 'public/review/articulated/review-manifest.json');
const sourceCandidatePath = resolve(root, 'public/review/source-candidates/source-candidates.json');
const reviewEvidencePath = resolve(root, 'public/review/content-review-evidence-matrix.json');
const contentPath = resolve(root, 'src/content.ts');
const failures = [];

function fail(message) {
  failures.push(message);
}

function unique(values) {
  return [...new Set(values)].sort();
}

function sectionBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) return '';
  const end = endMarker ? source.indexOf(endMarker, start + startMarker.length) : -1;
  return source.slice(start, end < 0 ? undefined : end);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

const manifest = await readJson(manifestPath);
const html = await readFile(htmlPath, 'utf8');
const labHtml = await readFile(labHtmlPath, 'utf8');
const content = await readFile(contentPath, 'utf8');
const reviewEvidence = await readJson(reviewEvidencePath);

if (manifest.schema !== 'water9/sandbox-index@1') fail(`unexpected schema: ${manifest.schema}`);
if (reviewEvidence?.schema !== 'water9/content-review-evidence-matrix@1') fail(`unexpected review evidence schema: ${reviewEvidence?.schema ?? 'missing'}`);
if (!Array.isArray(manifest.entries)) fail('entries must be an array');

const entries = manifest.entries ?? [];
const reviewEvidenceByRuntimeId = new Map((reviewEvidence?.rows ?? [])
  .filter((row) => row.runtimeId)
  .map((row) => [row.runtimeId, row]));
const byId = new Map();
const validReviewStages = new Set(['accepted', 'prototype', 'source-approved', 'source-review', 'reference']);
for (const entry of entries) {
  if (!entry.id) fail('entry missing id');
  if (!entry.name) fail(`${entry.id}: missing name`);
  if (!entry.kind) fail(`${entry.id}: missing kind`);
  if (!entry.url) fail(`${entry.id}: missing url`);
  if (!validReviewStages.has(entry.reviewStage ?? 'reference')) fail(`${entry.id}: invalid reviewStage ${entry.reviewStage}`);
  if (entry.url && !entry.url.includes('?sandbox=') && !entry.url.includes('?entity=')) {
    fail(`${entry.id}: url must target sandbox/entity route`);
  }
  if (!entry.previewCommand?.includes(`npm run sandbox:preview -- --id ${entry.id}`)) {
    fail(`${entry.id}: previewCommand must open this entity through sandbox:preview`);
  }
  if (!entry.pairedPreviewCommand?.includes(`npm run sandbox:preview -- --id ${entry.id} --with diver`)) {
    fail(`${entry.id}: pairedPreviewCommand must open this entity with diver`);
  }
  if (!entry.visualCheckCommand?.includes(`npm run sandbox:visual -- --ids ${entry.id}`)) {
    fail(`${entry.id}: visualCheckCommand must validate this entity`);
  }
  if (!entry.pairedVisualCheckCommand?.includes(`npm run sandbox:visual -- --ids ${entry.id}`) || !entry.pairedVisualCheckCommand?.includes('--with diver')) {
    fail(`${entry.id}: pairedVisualCheckCommand must validate this entity with diver`);
  }
  if (entry.productionBoundary?.schema !== 'water9/sandbox-production-boundary@1') {
    fail(`${entry.id}: missing sandbox production boundary`);
  }
  if (entry.productionBoundary?.reviewStage !== (entry.reviewStage ?? 'reference')) {
    fail(`${entry.id}: production boundary reviewStage mismatch`);
  }
  if (entry.productionBoundary?.acceptedForContentGate !== Boolean(entry.acceptedForContentGate)) {
    fail(`${entry.id}: production boundary acceptedForContentGate mismatch`);
  }
  if (entry.productionBoundary?.productionReady !== Boolean(entry.acceptedForContentGate)) {
    fail(`${entry.id}: production boundary productionReady mismatch`);
  }
  if (entry.acceptedForContentGate !== true && entry.productionBoundary?.previewOnly !== true) {
    fail(`${entry.id}: non-accepted preview must be marked preview-only`);
  }
  if (entry.acceptedForContentGate !== true && ['articulated', 'source'].includes(entry.kind) && !String(entry.productionBoundary?.manualReviewRequired ?? '').trim()) {
    fail(`${entry.id}: non-accepted ${entry.kind} preview must state required human review`);
  }
  if (!String(entry.productionBoundary?.claim ?? '').trim()) {
    fail(`${entry.id}: production boundary missing claim`);
  }
  if (!String(entry.reviewGateLabel ?? '').trim()) {
    fail(`${entry.id}: missing reviewGateLabel`);
  }
  if (!['accepted', 'preview-only', 'reference'].includes(entry.reviewGateSeverity ?? '')) {
    fail(`${entry.id}: invalid reviewGateSeverity ${entry.reviewGateSeverity ?? 'missing'}`);
  }
  if (entry.kind === 'articulated' && entry.acceptedForContentGate !== true && !String(entry.reviewGateLabel).includes('PREVIEW ONLY PROTOTYPE - NOT ACCEPTED')) {
    fail(`${entry.id}: prototype articulated reviewGateLabel must visibly disclose preview-only prototype status`);
  }
  if (entry.kind === 'source' && entry.acceptedForContentGate !== true && !String(entry.reviewGateLabel).includes('SOURCE REVIEW NEEDED')) {
    fail(`${entry.id}: source reviewGateLabel must visibly disclose source review need`);
  }
  if (byId.has(entry.id)) fail(`duplicate entry id: ${entry.id}`);
  byId.set(entry.id, entry);
}

for (const required of ['diver', 'barge-platform', 'bobbit', 'nest-egg', 'sub-tier1', 'sub-tier2', 'sub-tier3']) {
  if (!byId.has(required)) fail(`missing required preview entry: ${required}`);
}

const review = await readJson(articulatedReviewPath);
for (const creature of review.creatures ?? []) {
  const entry = byId.get(creature.id);
  if (!entry) fail(`missing articulated review creature in sandbox index: ${creature.id}`);
  if (entry && !entry.url.includes('?sandbox=')) fail(`${creature.id}: articulated entry must use sandbox URL`);
  if (entry && !entry.qualityStatus) fail(`${creature.id}: articulated entry must include qualityStatus`);
  if (entry && !['accepted', 'prototype'].includes(entry.reviewStage)) {
    fail(`${creature.id}: articulated entry reviewStage must be accepted/prototype, got ${entry.reviewStage ?? 'missing'}`);
  }
  const evidenceRow = reviewEvidenceByRuntimeId.get(creature.id);
  const strictAccepted = evidenceRow?.threatAccepted === true;
  if (entry && entry.acceptedForContentGate !== strictAccepted) {
    fail(`${creature.id}: acceptedForContentGate ${entry.acceptedForContentGate} does not match review evidence threatAccepted ${strictAccepted}`);
  }
  if (entry && entry.reviewStage === 'accepted' && !strictAccepted) {
    fail(`${creature.id}: accepted reviewStage requires strict review evidence threatAccepted`);
  }
  if (entry?.acceptedForContentGate && entry?.pipeline?.accepted !== true) {
    fail(`${creature.id}: gate-accepted entry must have pipeline.accepted true`);
  }
  if (entry?.acceptedForContentGate && entry?.pipeline?.sourceApproved !== true) {
    fail(`${creature.id}: gate-accepted entry must have pipeline.sourceApproved true`);
  }
  if (entry && entry.reviewStage === 'prototype' && !String(entry.notes ?? '').includes('quality: prototype')) {
    fail(`${creature.id}: prototype articulated entry notes must disclose prototype quality`);
  }
}

const sourceCandidates = await readJson(sourceCandidatePath);
if (sourceCandidates?.schema !== 'water9/source-candidates@1') fail(`unexpected source candidate schema: ${sourceCandidates?.schema ?? 'missing'}`);
for (const candidate of sourceCandidates.candidates ?? []) {
  if (!candidate.source) continue;
  const id = `source-${candidate.id}`;
  const entry = byId.get(id);
  if (!entry) fail(`missing source candidate preview entry: ${id}`);
  if (entry && entry.kind !== 'source') fail(`${id}: expected source kind, got ${entry.kind}`);
  if (entry && !entry.qualityStatus) fail(`${id}: source candidate preview entry must include qualityStatus`);
  if (entry && !['source-approved', 'source-review'].includes(entry.reviewStage)) {
    fail(`${id}: source candidate reviewStage must be source-approved/source-review, got ${entry.reviewStage ?? 'missing'}`);
  }
}

const fishAssetKeys = unique([...content.matchAll(/assetKey:\s*'([^']+)'/g)].map((match) => match[1]));
for (const key of fishAssetKeys) {
  const entry = byId.get(key);
  if (!entry) fail(`missing fish fauna preview entry: ${key}`);
  if (entry && entry.kind !== 'fish') fail(`${key}: expected fish kind, got ${entry.kind}`);
}

const shopSection = sectionBetween(content, 'export const shopItems', 'export const biomeFish');
const itemIds = unique([...shopSection.matchAll(/id:\s*'([^']+)'[\s\S]*?icon:\s*'[^']+'/g)].map((match) => match[1]));
for (const id of itemIds) {
  const entry = byId.get(id);
  if (!entry) fail(`missing shop item preview entry: ${id}`);
  if (entry && entry.kind !== 'item') fail(`${id}: expected item kind, got ${entry.kind}`);
}

if ((manifest.counts?.total ?? 0) !== entries.length) fail('counts.total does not match entry length');
if (manifest.contentPipeline?.schema !== 'water9/sandbox-content-pipeline-summary@1') fail('sandbox manifest missing content pipeline summary');
if ((manifest.contentPipeline?.summary?.targetThreats ?? 0) < 20) fail('content pipeline summary must include at least 20 target threats');
if ((manifest.contentPipeline?.summary?.missingRuntime ?? -1) < 0) fail('content pipeline summary missing runtime count');
if ((manifest.counts?.articulated ?? 0) !== entries.filter((entry) => entry.kind === 'articulated').length) {
  fail('counts.articulated does not match entries');
}
if ((manifest.counts?.previewOnly ?? 0) !== entries.filter((entry) => entry.productionBoundary?.previewOnly === true).length) {
  fail('counts.previewOnly does not match entries');
}
const actualReviewStageCounts = entries.reduce((counts, entry) => {
  const stage = entry.reviewStage ?? 'reference';
  counts[stage] = (counts[stage] ?? 0) + 1;
  return counts;
}, {});
for (const [stage, count] of Object.entries(actualReviewStageCounts)) {
  if ((manifest.counts?.byReviewStage?.[stage] ?? 0) !== count) {
    fail(`counts.byReviewStage.${stage} does not match entries`);
  }
}
for (const [stage, count] of Object.entries(manifest.counts?.byReviewStage ?? {})) {
  if ((actualReviewStageCounts[stage] ?? 0) !== count) {
    fail(`counts.byReviewStage.${stage} includes stale count`);
  }
  if (!html.includes(`data-stage-filter="${stage}"`)) fail(`sandbox html missing stage filter for ${stage}`);
}
if (!html.includes('data-stage-filter="all"')) fail('sandbox html missing all stage filter');
if (!html.includes('data-stage=')) fail('sandbox html missing per-row stage metadata');
if (!html.includes('Preview Command')) fail('sandbox html missing preview command column');
if (!html.includes('Paired Visual Check')) fail('sandbox html missing paired visual check column');
if (!html.includes('Review Banner')) fail('sandbox html missing review banner column');
if (!html.includes('PREVIEW ONLY PROTOTYPE - NOT ACCEPTED')) fail('sandbox html missing preview-only prototype banner');
if (!html.includes('SOURCE REVIEW NEEDED')) fail('sandbox html missing source review banner');
if (!html.includes('npm run sandbox:preview -- --id')) fail('sandbox html missing sandbox preview commands');
if (!html.includes('npm run sandbox:visual -- --ids')) fail('sandbox html missing sandbox visual commands');
for (const expected of [
  'Water 9 Sandbox Lab',
  'data-sandbox-lab',
  'data-entity-select',
  'data-entity-banner',
  'data-with-diver',
  'data-preview-frame',
  'data-preview-command',
  'data-visual-command',
  'data-new-threat-pipeline',
  'New Threat Pipeline',
  'runtime missing',
  'data-pipeline-next-action',
  'abyssal-gulper',
  'diver',
  'npm run sandbox:preview -- --id abyssal-gulper --with diver',
  'npm run sandbox:visual -- --ids abyssal-gulper --states idle,lunge,stunned --with diver',
]) {
  if (!labHtml.includes(expected)) fail(`sandbox lab html missing ${expected}`);
}
if (entries.length < 70) fail(`sandbox index is unexpectedly small: ${entries.length}`);

const summary = {
  entries: entries.length,
  articulated: entries.filter((entry) => entry.kind === 'articulated').length,
  fish: entries.filter((entry) => entry.kind === 'fish').length,
  flora: entries.filter((entry) => entry.kind === 'flora').length,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

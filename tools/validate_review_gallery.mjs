import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MIN_VISUAL_NOTE_LENGTH, distinctReviewNotes, meaningfulReviewText, reviewNoteHasEvidenceTerms } from './review_text_quality.mjs';
import { rigAcceptedStrict } from './content_quality_predicates.mjs';

const manifest = JSON.parse(await readFile(resolve('public/assets/generated/articulated-creatures.parts.json'), 'utf8'));
const reviewDir = resolve('public/review/articulated');
const failures = [];
const REQUIRED_VISUAL_CHECKS = [
  'single-source-cohesion',
  'readable-silhouette',
  'anatomy-cohesion',
  'production-visual-cohesion',
  'socket-seams',
  'motion-stability',
  'sandbox-behavior',
];
const REQUIRED_REVIEW_EVIDENCE = [
  { id: 'whole-source', flag: '--source-reviewed' },
  { id: 'contact-sheet', flag: '--contact-reviewed' },
  { id: 'phase-strip', flag: '--phase-reviewed' },
  { id: 'source-parity', flag: '--parity-reviewed' },
  { id: 'sandbox-preview', flag: '--sandbox-reviewed' },
];
const MIN_VISUAL_SCORE = 4;
const DISALLOWED_REVIEWERS = new Set(['codex', 'assistant', 'ai', 'agent', 'automation', 'bot', 'model']);
const RIG_VISUAL_NOTE_TERMS = {
  'single-source-cohesion': ['source', 'cohesion', 'parity', 'whole', 'same creature'],
  'readable-silhouette': ['silhouette', 'outline', 'scale', 'readable', 'shape'],
  'anatomy-cohesion': ['anatomy', 'orientation', 'part', 'jaw', 'body', 'tail', 'limb'],
  'production-visual-cohesion': ['production', 'placeholder', 'palette', 'lighting', 'material', 'cohesion'],
  'socket-seams': ['socket', 'seam', 'joint', 'overlay', 'connection'],
  'motion-stability': ['phase', 'motion', 'jitter', 'popping', 'frame', 'animation'],
  'sandbox-behavior': ['sandbox', 'idle', 'lunge', 'stunned', 'diver', 'behavior', 'motion'],
};

async function requireFile(label, path, minSize = 128) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minSize) failures.push(`${label}: missing or too small`);
  } catch {
    failures.push(`${label}: does not exist`);
  }
}

async function readJson(label, path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

function reviewItemAccepted(item) {
  return rigAcceptedStrict({ quality: item?.quality })
    && item.autoVisualCohesion?.status === 'pass'
    && (item.autoVisualCohesion?.failures ?? []).length === 0;
}

await requireFile('review index', resolve(reviewDir, 'index.html'), 512);
await requireFile('review manifest', resolve(reviewDir, 'review-manifest.json'), 512);
await requireFile('render cache', resolve(reviewDir, 'render-cache.json'), 128);
const reviewManifest = await readJson('review manifest', resolve(reviewDir, 'review-manifest.json'));
const renderCache = await readJson('render cache', resolve(reviewDir, 'render-cache.json'));

const runtimeCreatures = manifest.creatures ?? [];
const runtimeIds = new Set(runtimeCreatures.map((creature) => creature.id));
const reviewItems = Array.isArray(reviewManifest?.creatures) ? reviewManifest.creatures : [];
const reviewIds = new Set(reviewItems.map((item) => item.id));

if (reviewManifest && reviewManifest.schema !== 'water9/articulated-review@1') {
  failures.push(`review manifest schema is ${reviewManifest.schema ?? 'missing'}`);
}
if (renderCache && renderCache.schema !== 'water9/articulated-render-cache@1') {
  failures.push(`render cache schema is ${renderCache.schema ?? 'missing'}`);
}
if (reviewManifest && reviewManifest.creatureCount !== runtimeCreatures.length) {
  failures.push(`review manifest creatureCount ${reviewManifest.creatureCount} does not match runtime ${runtimeCreatures.length}`);
}
if (reviewManifest && reviewManifest.acceptedCount !== reviewItems.filter(reviewItemAccepted).length) {
  failures.push(`review manifest acceptedCount ${reviewManifest.acceptedCount} does not match strict accepted item count`);
}
for (const id of runtimeIds) {
  if (!reviewIds.has(id)) failures.push(`${id}: missing from review manifest`);
  const cacheEntry = renderCache?.creatures?.[id];
  if (!cacheEntry?.fingerprint) failures.push(`${id}: missing render-cache fingerprint`);
  if (cacheEntry?.contactFile !== `${id}-contact.png`) failures.push(`${id}: render-cache contactFile mismatch`);
  if (cacheEntry?.phaseFile !== `${id}-phase.png`) failures.push(`${id}: render-cache phaseFile mismatch`);
}
for (const item of reviewItems) {
  if (!runtimeIds.has(item.id)) failures.push(`${item.id}: review manifest item is not in runtime manifest`);
  const cacheEntry = renderCache?.creatures?.[item.id];
  if (!item.inputFingerprint) failures.push(`${item.id}: review manifest item is missing inputFingerprint`);
  if (item.inputFingerprint && cacheEntry?.fingerprint && item.inputFingerprint !== cacheEntry.fingerprint) {
    failures.push(`${item.id}: review manifest inputFingerprint does not match render cache fingerprint`);
  }
  await requireFile(`${item.id} contact sheet`, resolve(reviewDir, item.contactFile ?? `${item.id}-contact.png`), 1024);
  await requireFile(`${item.id} phase strip`, resolve(reviewDir, item.phaseFile ?? `${item.id}-phase.png`), 1024);
  await requireFile(`${item.id} contact thumbnail`, resolve(reviewDir, item.contactThumbFile ?? `thumbs/${item.id}-contact-thumb.png`), 512);
  await requireFile(`${item.id} phase thumbnail`, resolve(reviewDir, item.phaseThumbFile ?? `thumbs/${item.id}-phase-thumb.png`), 512);
  if (item.sourceThumbFile) await requireFile(`${item.id} source thumbnail`, resolve(reviewDir, item.sourceThumbFile), 512);
  if (item.sourceParityDebugFile) await requireFile(`${item.id} source parity overlay`, resolve(reviewDir, item.sourceParityDebugFile), 512);
  if (item.sourceParityThumbFile) await requireFile(`${item.id} source parity thumbnail`, resolve(reviewDir, item.sourceParityThumbFile), 512);
  if (item.planPreviewFile) await requireFile(`${item.id} plan preview`, resolve(reviewDir, item.planPreviewFile), 512);
  if (item.planPreviewThumbFile) await requireFile(`${item.id} plan preview thumbnail`, resolve(reviewDir, item.planPreviewThumbFile), 512);
  if (typeof item.sandboxUrl !== 'string' || !item.sandboxUrl.includes(`sandbox=${encodeURIComponent(item.id)}`)) {
    failures.push(`${item.id}: missing sandbox review URL`);
  }
  if (typeof item.dryRunCommand !== 'string' || !item.dryRunCommand.includes('--dry-run')) {
    failures.push(`${item.id}: missing dry-run acceptance command`);
  }
  if (item.dryRunCommand?.includes('--visual-check')) {
    failures.push(`${item.id}: dry-run acceptance command must not pre-fill visual approval flags`);
  }
  if (!item.dryRunCommand?.includes('<human-reviewer>')) {
    failures.push(`${item.id}: dry-run acceptance command must require an explicit human reviewer placeholder`);
  }
  if (!item.dryRunCommand?.includes('--source-candidate <approved-source-candidate-id>')) {
    failures.push(`${item.id}: dry-run acceptance command must require an approved source-candidate placeholder`);
  }
  const requiredFlags = new Set(item.requiredAcceptanceFlags ?? []);
  const checklistIds = new Set((item.manualVisualChecklist ?? []).map((check) => check.id));
  for (const check of REQUIRED_VISUAL_CHECKS) {
    if (!checklistIds.has(check)) failures.push(`${item.id}: missing manual visual check ${check}`);
    if (!requiredFlags.has(`--visual-check ${check}`)) failures.push(`${item.id}: requiredAcceptanceFlags missing visual check ${check}`);
  }
  const evidenceIds = new Set((item.reviewEvidenceChecklist ?? []).map((check) => check.id));
  for (const check of REQUIRED_REVIEW_EVIDENCE) {
    if (!evidenceIds.has(check.id)) failures.push(`${item.id}: missing review evidence check ${check.id}`);
    if (!requiredFlags.has(check.flag)) failures.push(`${item.id}: requiredAcceptanceFlags missing evidence flag ${check.flag}`);
  }
  const quality = item.quality ?? {};
  if (quality.sourceCohesion === 'single-source' && quality.backgroundKey === 'magenta' && !item.sourceUrl) {
    failures.push(`${item.id}: magenta single-source review item needs a public sourceUrl`);
  }
  if (quality.sourceCohesion === 'single-source' && quality.backgroundKey === 'magenta' && !item.sourceThumbFile) {
    failures.push(`${item.id}: magenta single-source review item needs a source thumbnail`);
  }
  if (quality.sourceCohesion === 'single-source' && quality.backgroundKey === 'magenta' && !item.sourceParity?.metrics) {
    failures.push(`${item.id}: magenta single-source review item needs source parity metrics`);
  }
  if (quality.sourceCohesion === 'single-source' && quality.backgroundKey === 'magenta' && !item.autoVisualCohesion) {
    failures.push(`${item.id}: magenta single-source review item needs automated visual-cohesion audit`);
  }
  if (item.autoVisualCohesion && item.autoVisualCohesion.status !== 'pass') {
    failures.push(`${item.id}: automated visual-cohesion status is ${item.autoVisualCohesion.status}, expected pass`);
  }
  if ((item.autoVisualCohesion?.failures ?? []).length) {
    failures.push(`${item.id}: automated visual-cohesion failures: ${item.autoVisualCohesion.failures.join('; ')}`);
  }
  if (quality.status === 'accepted' && !reviewItemAccepted(item)) {
    failures.push(`${item.id}: quality.status is accepted but strict review evidence is incomplete`);
  }
}

for (const creature of runtimeCreatures) {
  await requireFile(`${creature.id} contact sheet`, resolve(reviewDir, `${creature.id}-contact.png`), 1024);
  await requireFile(`${creature.id} phase strip`, resolve(reviewDir, `${creature.id}-phase.png`), 1024);
}

const summary = {
  creatures: runtimeCreatures.length,
  reviewItems: reviewItems.length,
  acceptedItems: reviewItems.filter(reviewItemAccepted).length,
  reviewDir,
  failures,
};
if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

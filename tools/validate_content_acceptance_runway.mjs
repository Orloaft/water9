import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MIN_VISUAL_NOTE_LENGTH, meaningfulReviewText, reviewNoteHasEvidenceTerms } from './review_text_quality.mjs';
import {
  sourceApprovedStrict,
  threatAcceptedForContentGate,
} from './content_quality_predicates.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const paths = {
  runway: resolve(String(args.get('json') ?? 'public/review/content-acceptance-runway.json')),
  html: resolve(String(args.get('html') ?? 'public/review/content-acceptance-runway.html')),
  markdown: resolve(String(args.get('md') ?? 'public/review/content-acceptance-runway.md')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  stageBoard: resolve(String(args.get('stage-board') ?? 'public/review/content-stage-board.json')),
  sourceReviewDossier: resolve(String(args.get('source-review-dossier') ?? 'public/review/source-candidates/source-review-dossier.json')),
  runtime: resolve(String(args.get('runtime') ?? 'public/assets/generated/articulated-creatures.parts.json')),
  articulatedReview: resolve(String(args.get('articulated-review') ?? 'public/review/articulated/review-manifest.json')),
  packetDir: resolve(String(args.get('packet-dir') ?? 'public/review/acceptance-packets')),
};

const failures = [];
const DISALLOWED_REVIEWERS = new Set(['codex', 'assistant', 'ai', 'agent', 'automation', 'bot', 'model']);
const SOURCE_VISUAL_CHECKS = [
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

async function readJson(label, path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

async function readText(label, path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    failures.push(`${label}: could not read file: ${error.message}`);
    return '';
  }
}

async function fileOk(label, path, minSize) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minSize) failures.push(`${label}: missing or too small`);
  } catch {
    failures.push(`${label}: missing`);
  }
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function includesText(text, value) {
  return text.includes(value) || text.includes(htmlEscape(value));
}

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'candidate';
}

function sourceImageValidationRecorded(candidate) {
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

function strictSourceApproved(candidate) {
  return sourceApprovedStrict(candidate);
}

function runtimeForCandidate(runtime, candidate) {
  return (runtime?.creatures ?? []).find((creature) => creature.quality?.sourceCandidateId === candidate.id)
    ?? (runtime?.creatures ?? []).find((creature) => candidate.riggedCreatureId && creature.id === candidate.riggedCreatureId)
    ?? (runtime?.creatures ?? []).find((creature) => creature.id === candidate.id)
    ?? null;
}

function reviewForRuntime(articulatedReview, runtimeCreature) {
  if (!runtimeCreature) return null;
  return (articulatedReview?.creatures ?? []).find((creature) => creature.id === runtimeCreature.id) ?? null;
}

const runway = await readJson('acceptance runway', paths.runway);
const sourceCandidates = await readJson('source candidates', paths.sourceCandidates);
const stageBoard = await readJson('stage board', paths.stageBoard);
const sourceReviewDossier = await readJson('source review dossier', paths.sourceReviewDossier);
const runtime = await readJson('runtime manifest', paths.runtime);
const articulatedReview = await readJson('articulated review', paths.articulatedReview);
const html = await readText('acceptance runway html', paths.html);
const markdown = await readText('acceptance runway markdown', paths.markdown);

await fileOk('acceptance runway html', paths.html, 4096);
await fileOk('acceptance runway markdown', paths.markdown, 1024);

if (runway?.schema !== 'water9/content-acceptance-runway@1') failures.push(`runway schema is ${runway?.schema ?? 'missing'}`);
if (sourceCandidates?.schema !== 'water9/source-candidates@1') failures.push(`source candidates schema is ${sourceCandidates?.schema ?? 'missing'}`);
if (stageBoard?.schema !== 'water9/content-stage-board@1') failures.push(`stage board schema is ${stageBoard?.schema ?? 'missing'}`);
if (sourceReviewDossier?.schema !== 'water9/source-review-dossier@1') failures.push(`source review dossier schema is ${sourceReviewDossier?.schema ?? 'missing'}`);
if (runtime?.schema !== 'asset-forge/sprite-parts@1') failures.push(`runtime schema is ${runtime?.schema ?? 'missing'}`);
if (articulatedReview?.schema !== 'water9/articulated-review@1') failures.push(`articulated review schema is ${articulatedReview?.schema ?? 'missing'}`);

const candidates = Array.isArray(sourceCandidates?.candidates) ? sourceCandidates.candidates : [];
const items = Array.isArray(runway?.items) ? runway.items : [];
const itemById = new Map(items.map((item) => [item.id, item]));
const stageById = new Map((stageBoard?.targets ?? []).map((target) => [target.id, target]));
const sourceReviewById = new Map((sourceReviewDossier?.items ?? []).map((item) => [item.id, item]));
const unmappedPrototypeThreats = Array.isArray(runway?.unmappedPrototypeThreats) ? runway.unmappedPrototypeThreats : [];

if (items.length !== candidates.length) failures.push(`runway items ${items.length} does not match source candidates ${candidates.length}`);
const ids = items.map((item) => item.id).filter(Boolean);
if (ids.length !== uniqueValues(ids).length) failures.push('acceptance runway has duplicate ids');
if ((runway?.summary?.candidates ?? -1) !== candidates.length) failures.push('summary candidate count mismatch');
if ((runway?.summary?.sourceImages ?? -1) !== candidates.filter((candidate) => candidate.source).length) failures.push('summary sourceImages mismatch');
const strictApprovedSources = candidates.filter(strictSourceApproved).length;
if ((runway?.summary?.approvedSources ?? -1) !== strictApprovedSources) failures.push('summary approvedSources mismatch with strict source approval predicate');
if ((runway?.summary?.targetThreats ?? 0) < 20) failures.push('targetThreats must be at least 20');
const strictGateComplete = (runway?.summary?.acceptedThreats ?? 0) >= (runway?.summary?.targetThreats ?? 20);
if (runway?.summary?.strictGateComplete !== strictGateComplete) failures.push('summary strictGateComplete mismatch');
if (runway?.summary?.finalGateStillRequired !== !strictGateComplete) failures.push('summary finalGateStillRequired mismatch');
const recommendedByStage = runway?.recommendedByStage ?? {};
if (!recommendedByStage || typeof recommendedByStage !== 'object' || Array.isArray(recommendedByStage)) {
  failures.push('recommendedByStage must be an object');
}
const expectedRecommended = new Map();
for (const item of items) {
  if (item.accepted || expectedRecommended.has(item.stage)) continue;
  expectedRecommended.set(item.stage, item);
}
for (const [stage, item] of expectedRecommended) {
  const recommended = recommendedByStage?.[stage];
  if (!recommended) {
    failures.push(`recommendedByStage missing ${stage}`);
    continue;
  }
  if (recommended.id !== item.id) failures.push(`recommendedByStage ${stage} should recommend ${item.id}, got ${recommended.id}`);
  if (recommended.nextAction !== item.nextAction) failures.push(`recommendedByStage ${stage} nextAction mismatch`);
  for (const expected of ['Recommended By Stage', stage, item.id, item.nextAction]) {
    if (!includesText(html, expected)) failures.push(`html missing recommended stage detail ${expected}`);
    if (!markdown.includes(expected)) failures.push(`markdown missing recommended stage detail ${expected}`);
  }
}

for (const candidate of candidates) {
  const item = itemById.get(candidate.id);
  if (!item) {
    failures.push(`${candidate.id}: missing from acceptance runway`);
    continue;
  }
  if (item.species !== candidate.species) failures.push(`${candidate.id}: species mismatch`);
  const stage = stageById.get(candidate.id);
  if (stage && item.stage !== stage.stage) failures.push(`${candidate.id}: stage mismatch`);
  if (item.hasSourceImage !== Boolean(candidate.source)) failures.push(`${candidate.id}: hasSourceImage mismatch`);
  if (item.sourceApproved !== strictSourceApproved(candidate)) failures.push(`${candidate.id}: sourceApproved mismatch with strict source approval predicate`);
  const runtimeCreature = runtimeForCandidate(runtime, candidate);
  const reviewCreature = reviewForRuntime(articulatedReview, runtimeCreature);
  const strictThreatAccepted = threatAcceptedForContentGate(candidate, runtimeCreature, reviewCreature);
  if (item.threatAccepted !== strictThreatAccepted) failures.push(`${candidate.id}: threatAccepted mismatch with strict content gate predicate`);
  if (item.accepted !== strictThreatAccepted) failures.push(`${candidate.id}: accepted mismatch with strict content gate predicate`);
  if (item.threatAccepted && !item.sourceApproved) failures.push(`${candidate.id}: threatAccepted requires strict source approval`);
  const review = sourceReviewById.get(candidate.id);
  if (item.sourceDossierApproved !== (review?.approved === true)) failures.push(`${candidate.id}: sourceDossierApproved mismatch`);
  if (!Array.isArray(item.blockers)) failures.push(`${candidate.id}: blockers must be an array`);
  if (!Array.isArray(item.commands?.source) || item.commands.source.length < 1) failures.push(`${candidate.id}: source commands missing`);
  if (!Array.isArray(item.commands?.rigging) || item.commands.rigging.length < 1) failures.push(`${candidate.id}: rigging commands missing`);
  if (!item.nextAction) failures.push(`${candidate.id}: nextAction missing`);
  const expectedPacketFile = `public/review/acceptance-packets/${safeFileName(candidate.id)}.md`;
  if (item.acceptancePacket?.file !== expectedPacketFile) failures.push(`${candidate.id}: acceptance packet file mismatch`);
  if (item.acceptancePacket?.stage !== item.stage) failures.push(`${candidate.id}: acceptance packet stage mismatch`);
  if (item.acceptancePacket?.nextAction !== item.nextAction) failures.push(`${candidate.id}: acceptance packet nextAction mismatch`);
  if (item.acceptancePacket?.commands?.nextAction !== item.nextAction) failures.push(`${candidate.id}: acceptance packet command nextAction mismatch`);
  if (!Array.isArray(item.acceptancePacket?.commands?.source) || item.acceptancePacket.commands.source.length !== item.commands.source.length) failures.push(`${candidate.id}: acceptance packet source command count mismatch`);
  if (!Array.isArray(item.acceptancePacket?.commands?.rigging) || item.acceptancePacket.commands.rigging.length !== item.commands.rigging.length) failures.push(`${candidate.id}: acceptance packet rigging command count mismatch`);
  if (item.acceptancePacket?.commands?.finalGate !== 'npm run content:gate') failures.push(`${candidate.id}: acceptance packet final gate command mismatch`);
  await fileOk(`${candidate.id} acceptance packet`, resolve(expectedPacketFile), 1024);
  const packetMarkdown = await readText(`${candidate.id} acceptance packet`, resolve(expectedPacketFile));
  for (const expected of [
    `Acceptance Packet: ${candidate.species} (${candidate.id})`,
    'This packet is the current production path',
    'Human Approval Boundary',
    item.stage,
    item.nextAction,
    'Source Path',
    'Rig And Acceptance Path',
    'npm run content:gate',
  ]) {
    if (!packetMarkdown.includes(expected)) failures.push(`${candidate.id}: acceptance packet missing ${expected}`);
  }
  for (const command of [...item.commands.source, ...item.commands.rigging].slice(0, 10)) {
    if (command && !packetMarkdown.includes(command)) failures.push(`${candidate.id}: acceptance packet missing command ${command}`);
  }
  if (!includesText(html, expectedPacketFile.replace('public/review/', ''))) failures.push(`${candidate.id}: html missing acceptance packet link`);
  if (!markdown.includes(expectedPacketFile)) failures.push(`${candidate.id}: markdown missing acceptance packet link`);
  if (!includesText(html, candidate.id)) failures.push(`${candidate.id}: html missing id`);
  if (!includesText(html, `id="${candidate.id}"`)) failures.push(`${candidate.id}: html missing stable candidate anchor`);
  if (!includesText(html, `data-acceptance-candidate="${candidate.id}"`)) failures.push(`${candidate.id}: html missing acceptance candidate marker`);
  if (!includesText(html, item.nextAction)) failures.push(`${candidate.id}: html missing next action`);
  if (!markdown.includes(candidate.id)) failures.push(`${candidate.id}: markdown missing id`);
  if (!candidate.source && !item.commands.source.some((command) => command.includes('source:session') || command.includes('source:inbox-capture'))) {
    failures.push(`${candidate.id}: source-image-needed candidate lacks generation/capture command`);
  }
  if (!candidate.source) {
    for (const expected of [
      `npm run source:inbox-capture -- --id ${candidate.id} --open`,
      `npm run source:recover-inline -- --id ${candidate.id} --image <saved-image-path> --copy --validate`,
      `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${candidate.id}`,
    ]) {
      if (!item.commands.source.includes(expected)) failures.push(`${candidate.id}: source commands missing target-aware command ${expected}`);
    }
  }
  if (candidate.source && !item.commands.source.some((command) => command.includes('source:accept'))) {
    failures.push(`${candidate.id}: sourced candidate lacks source acceptance command`);
  }
  for (const command of item.commands.source.filter((entry) => entry.includes('npm run source:accept'))) {
    if (!command.includes('--dry-run')) failures.push(`${candidate.id}: source acceptance command in acceptance runway must be dry-run only`);
  }
  if (!item.sourceApproved && item.nextAction?.includes('npm run source:accept') && !item.nextAction.includes('--dry-run')) {
    failures.push(`${candidate.id}: source-review nextAction must be a dry-run command`);
  }
  if (item.runtimeRegistered && !item.sandboxUrl) failures.push(`${candidate.id}: registered runtime lacks sandbox URL`);
  if (item.runtimeRegistered && !item.commands.rigging.some((command) => command.includes('sandbox:preview'))) {
    failures.push(`${candidate.id}: registered runtime lacks sandbox preview command`);
  }
  if (item.runtimeRegistered && !item.commands.rigging.some((command) => command.includes('sandbox:preview') && command.includes('--with diver'))) {
    failures.push(`${candidate.id}: registered runtime sandbox preview command must include --with diver`);
  }
  if (item.runtimeRegistered && !item.commands.rigging.some((command) => command.includes('sandbox:visual') && command.includes('--states idle,lunge,stunned') && command.includes('--with diver'))) {
    failures.push(`${candidate.id}: registered runtime sandbox visual command must include idle/lunge/stunned with diver`);
  }
  if (!item.commands.rigging.some((command) => command.includes('content:accept'))) {
    failures.push(`${candidate.id}: rigging commands lack content acceptance command`);
  }
  for (const command of item.commands.rigging.filter((entry) => entry.includes('content:accept'))) {
    if (!command.includes('--parity-reviewed')) failures.push(`${candidate.id}: content acceptance command must include --parity-reviewed`);
  }
}

for (const item of unmappedPrototypeThreats) {
  const expectedPacketFile = `public/review/acceptance-packets/unmapped-${safeFileName(item.id)}.md`;
  if (item.packet?.file !== expectedPacketFile) failures.push(`${item.id}: unmapped prototype packet file mismatch`);
  if (!Array.isArray(item.blockers) || !item.blockers.includes('prototype is not mapped to a source candidate')) {
    failures.push(`${item.id}: unmapped prototype missing source-candidate blocker`);
  }
  for (const [key, expected] of [
    ['preview', `npm run sandbox:preview -- --id ${item.id} --with diver --serve --open --visual`],
    ['visual', `npm run sandbox:visual -- --ids ${item.id} --states idle,lunge,stunned --with diver`],
    ['audit', `npm run content:acceptance-audit -- --id ${item.id}`],
    ['finalGate', 'npm run content:gate'],
  ]) {
    if (item.packet?.commands?.[key] !== expected) failures.push(`${item.id}: unmapped prototype packet command ${key} mismatch`);
  }
  await fileOk(`${item.id} unmapped prototype packet`, resolve(expectedPacketFile), 1024);
  const packetMarkdown = await readText(`${item.id} unmapped prototype packet`, resolve(expectedPacketFile));
  for (const expected of [
    `Unmapped Prototype Packet:`,
    item.id,
    'cannot count toward the strict 20-threat gate',
    'Required Migration',
    item.packet?.commands?.preview,
    item.packet?.commands?.visual,
    item.packet?.commands?.audit,
    'npm run content:gate',
  ]) {
    if (expected && !packetMarkdown.includes(expected)) failures.push(`${item.id}: unmapped prototype packet missing ${expected}`);
  }
  if (!includesText(html, expectedPacketFile.replace('public/review/', ''))) failures.push(`${item.id}: html missing unmapped prototype packet link`);
  if (!includesText(html, `id="${item.id}"`)) failures.push(`${item.id}: html missing stable unmapped prototype anchor`);
  if (!includesText(html, `data-unmapped-prototype="${item.id}"`)) failures.push(`${item.id}: html missing unmapped prototype marker`);
  if (!markdown.includes(expectedPacketFile)) failures.push(`${item.id}: markdown missing unmapped prototype packet link`);
}

for (const needle of [
  'Water 9 Acceptance Runway',
  'Human Approval Boundary',
  'magenta source art',
  'npm run content:acceptance-runway',
  'npm run content:acceptance-runway-check',
  'npm run content:gate',
  'Source Path',
  'Rig And Acceptance Path',
  'sandbox:preview',
  'content:accept',
  'strict gate complete',
  'final gate still required',
  'Unmapped Prototype Migration',
]) {
  if (!includesText(html, needle)) failures.push(`html missing required content: ${needle}`);
}
for (const needle of [
  'Water 9 Acceptance Runway',
  'Human Approval Boundary',
  'npm run content:acceptance-runway',
  'npm run content:gate',
  'Candidates',
  'Strict gate complete',
  'Final gate still required',
]) {
  if (!markdown.includes(needle)) failures.push(`markdown missing required content: ${needle}`);
}

const result = {
  json: paths.runway,
  html: paths.html,
  markdown: paths.markdown,
  candidates: items.length,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}

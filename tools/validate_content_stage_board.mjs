import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MIN_VISUAL_NOTE_LENGTH, distinctReviewNotes, meaningfulReviewText, reviewNoteHasEvidenceTerms } from './review_text_quality.mjs';
import {
  sourceApprovedStrict,
  sourceArtContractRecorded as strictSourceArtContractRecorded,
  sourceImageValidationRecorded as strictSourceImageValidationRecorded,
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

const boardPath = resolve(String(args.get('board') ?? 'public/review/content-stage-board.json'));
const markdownPath = resolve(String(args.get('markdown') ?? 'public/review/content-stage-board.md'));
const htmlPath = resolve(String(args.get('html') ?? 'public/review/content-stage-board.html'));
const sourceCandidatesPath = resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json'));
const runtimePath = resolve(String(args.get('runtime') ?? 'public/assets/generated/articulated-creatures.parts.json'));
const articulatedReviewPath = resolve(String(args.get('articulated-review') ?? 'public/review/articulated/review-manifest.json'));
const minTargets = Number(args.get('min-targets') ?? 20);
const MIN_SOURCE_VISUAL_SCORE = 4;
const DISALLOWED_REVIEWERS = new Set(['codex', 'assistant', 'ai', 'agent', 'automation', 'bot', 'model']);
const REQUIRED_SOURCE_CHECKS = [
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

async function readJson(label, path, failures) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

async function readText(label, path, failures) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    failures.push(`${label}: could not read file: ${error.message}`);
    return '';
  }
}

async function fileOk(path, minSize = 128) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size >= minSize;
  } catch {
    return false;
  }
}

const failures = [];
const board = await readJson('content stage board', boardPath, failures);
const sourceCandidates = await readJson('source candidates', sourceCandidatesPath, failures);
const runtime = await readJson('runtime manifest', runtimePath, failures);
const articulatedReview = await readJson('articulated review', articulatedReviewPath, failures);
const markdown = await readText('content stage board markdown', markdownPath, failures);
const html = await readText('content stage board html', htmlPath, failures);
const targets = Array.isArray(board?.targets) ? board.targets : [];
const sourceCandidateById = new Map((sourceCandidates?.candidates ?? []).map((candidate) => [candidate.id, candidate]));
const reviewById = new Map((articulatedReview?.creatures ?? []).map((creature) => [creature.id, creature]));

function reviewerAllowed(name) {
  const normalized = String(name ?? '').trim().toLowerCase();
  return Boolean(normalized) && !DISALLOWED_REVIEWERS.has(normalized);
}

function safeFileName(value) {
  return String(value ?? '').replace(/[^a-z0-9_-]/gi, '-');
}

function sourceImageValidationRecorded(candidate) {
  return strictSourceImageValidationRecorded(candidate);
}

function sourceArtContractRecorded(candidate) {
  return strictSourceArtContractRecorded(candidate);
}

function strictlySourceApproved(candidate) {
  return sourceApprovedStrict(candidate);
}

function runtimeForTarget(target, candidate) {
  return (runtime?.creatures ?? []).find((creature) => creature.id === target.rigId)
    ?? (runtime?.creatures ?? []).find((creature) => creature.quality?.sourceCandidateId === candidate?.id)
    ?? (runtime?.creatures ?? []).find((creature) => candidate?.riggedCreatureId && creature.id === candidate.riggedCreatureId)
    ?? null;
}

if (board?.schema !== 'water9/content-stage-board@1') failures.push(`board schema is ${board?.schema ?? 'missing'}`);
if (runtime?.schema !== 'asset-forge/sprite-parts@1') failures.push(`runtime schema is ${runtime?.schema ?? 'missing'}`);
if (articulatedReview?.schema !== 'water9/articulated-review@1') failures.push(`articulated review schema is ${articulatedReview?.schema ?? 'missing'}`);
if (targets.length < minTargets) failures.push(`board has ${targets.length} targets, expected at least ${minTargets}`);
if (board?.summary?.candidates !== targets.length) failures.push('summary candidate count does not match target list');
if (!board?.summary?.stageCounts || typeof board.summary.stageCounts !== 'object') failures.push('summary stageCounts is missing');
if (!board?.summary?.nextBottleneck) failures.push('summary nextBottleneck is missing');
if (!(await fileOk(markdownPath, 1024))) failures.push('stage board markdown is missing or too small');
if (!(await fileOk(htmlPath, 2048))) failures.push('stage board html is missing or too small');
if (!html.includes('Water 9 Content Stage Board')) failures.push('stage board html is missing the title');
if (!html.includes('Next bottleneck:')) failures.push('stage board html is missing the bottleneck summary');

const ids = new Set();
for (const target of targets) {
  const owner = target.id ?? 'unknown-target';
  if (!target.id) failures.push(`${owner}: missing id`);
  if (ids.has(target.id)) failures.push(`${owner}: duplicate target id`);
  ids.add(target.id);
  if (!target.species) failures.push(`${owner}: missing species`);
  if (!target.stage) failures.push(`${owner}: missing stage`);
  if (typeof target.hasSourceImage !== 'boolean') failures.push(`${owner}: hasSourceImage must be boolean`);
  if (typeof target.sourcePreviewComplete !== 'boolean') failures.push(`${owner}: sourcePreviewComplete must be boolean`);
  if (typeof target.sourceApproved !== 'boolean') failures.push(`${owner}: sourceApproved must be boolean`);
  if (typeof target.accepted !== 'boolean') failures.push(`${owner}: accepted must be boolean`);
  if (!Array.isArray(target.nextCommands)) failures.push(`${owner}: nextCommands must be an array`);
  if (!markdown.includes(target.id)) failures.push(`${owner}: markdown is missing target id`);
  if (!html.includes(target.id)) failures.push(`${owner}: html is missing target id`);

  if (!target.hasSourceImage) {
    const expectedAutoIngest = `npm run source:imagegen-status -- --id ${target.id} --ingest`;
    if (!target.nextCommands?.includes(expectedAutoIngest)) failures.push(`${owner}: missing validated auto-ingest next command`);
    if (!html.includes(expectedAutoIngest)) failures.push(`${owner}: html is missing validated auto-ingest next command`);
  }
  if (target.hasSourceImage && !target.sourcePreviewComplete && target.stage !== 'source-preview-needed') {
    failures.push(`${owner}: source image without preview should be staged as source-preview-needed`);
  }
  if (target.hasSourceImage && target.sourcePreviewComplete && !target.sourceApproved && !target.nextCommands?.includes('npm run source:preview-check')) {
    failures.push(`${owner}: source-review stage should keep source preview check in next commands`);
  }
  const candidate = sourceCandidateById.get(target.id);
  const strictSourceApproved = strictlySourceApproved(candidate);
  if (target.sourceApproved !== strictSourceApproved) {
    failures.push(`${owner}: sourceApproved ${target.sourceApproved} does not match strict source approval evidence ${strictSourceApproved}`);
  }
  const runtimeCreature = runtimeForTarget(target, candidate);
  const reviewCreature = runtimeCreature ? reviewById.get(runtimeCreature.id) : null;
  const strictThreatAccepted = threatAcceptedForContentGate(candidate, runtimeCreature, reviewCreature);
  if (target.accepted !== strictThreatAccepted) {
    failures.push(`${owner}: accepted ${target.accepted} does not match strict content gate predicate ${strictThreatAccepted}`);
  }
  if (target.accepted && !target.sourceApproved) failures.push(`${owner}: accepted requires strict source approval`);
  if (target.stage === 'accepted' && !strictThreatAccepted) failures.push(`${owner}: accepted stage requires strict content gate predicate`);
  if (target.hasSourceImage && !target.sourcePreviewComplete && !html.includes(`/?sandbox=source-${target.id}`)) {
    failures.push(`${owner}: html is missing source preview link`);
  }
  if (target.rigId && !html.includes(`/?sandbox=${target.rigId}`)) {
    failures.push(`${owner}: html is missing rig sandbox link`);
  }
  for (const command of target.nextCommands ?? []) {
    if (command.includes('sandbox:preview') && !command.includes('--with diver')) {
      failures.push(`${owner}: sandbox preview command must include --with diver`);
    }
    if (command.includes('sandbox:visual') && (!command.includes('--with diver') || !command.includes('--states idle,lunge,stunned'))) {
      failures.push(`${owner}: sandbox visual command must include idle/lunge/stunned with diver`);
    }
    if (command.includes('content:accept') && !command.includes('--parity-reviewed')) {
      failures.push(`${owner}: content acceptance command must include --parity-reviewed`);
    }
  }
}

const countedStages = {};
for (const target of targets) countedStages[target.stage] = (countedStages[target.stage] ?? 0) + 1;
for (const [stage, count] of Object.entries(board?.summary?.stageCounts ?? {})) {
  if (countedStages[stage] !== count) failures.push(`stage count mismatch for ${stage}: summary ${count}, targets ${countedStages[stage] ?? 0}`);
}

const summary = {
  board: boardPath,
  markdown: markdownPath,
  html: htmlPath,
  targets: targets.length,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

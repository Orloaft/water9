import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { MIN_VISUAL_NOTE_LENGTH, meaningfulReviewText } from './review_text_quality.mjs';
import { sourceApprovedStrict } from './content_quality_predicates.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const id = args.get('id');
const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const planPath = String(args.get('plan') ?? `tools/scratch/${id}-starter-plan.json`);
const previewPath = String(args.get('preview') ?? `public/review/articulated/${id}-plan-preview.png`);
const overwrite = args.has('overwrite');
const allowUnapproved = args.has('allow-unapproved') || args.has('allowUnapproved');

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
const DISALLOWED_REVIEWERS = new Set(['codex', 'assistant', 'ai', 'agent', 'automation', 'bot', 'model']);

function usage() {
  console.error('Usage: node tools/prepare_articulation_plan.mjs --id <approved-source-candidate-id> [--overwrite] [--allow-unapproved]');
}

function sourceApproved(candidate) {
  return sourceApprovedStrict(candidate);
}

function run(label, command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

if (!id) {
  usage();
  process.exit(1);
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const candidate = (manifest.candidates ?? []).find((item) => item.id === id);
if (!candidate) {
  console.error(`No source candidate found with id ${id}`);
  process.exit(1);
}
if (!candidate.source) {
  console.error(`${id}: source image is required before preparing an articulation plan`);
  process.exit(1);
}
if (!allowUnapproved && !sourceApproved(candidate)) {
  console.error(`${id}: source candidate must be approved before preparing an articulation plan.`);
  console.error('Use --allow-unapproved only for mechanical dry-run testing, not for promotion.');
  process.exit(1);
}

run('starter plan', 'python3', [
  'tools/create_articulation_starter_plan.py',
  '--id', id,
  '--manifest', manifestPath,
  '--out', planPath,
  ...(overwrite ? ['--overwrite'] : []),
]);
run('plan preview', 'python3', [
  'tools/render_articulation_plan_preview.py',
  '--plan', planPath,
  '--out', previewPath,
]);
run('plan check', 'python3', [
  'tools/validate_articulation_plan.py',
  '--plan', planPath,
]);
run('dry-run extraction', 'python3', [
  'tools/extract_articulated_from_plan.py',
  '--plan', planPath,
  '--dry-run',
]);

console.log(JSON.stringify({
  id,
  species: candidate.species,
  source: candidate.source,
  approved: sourceApproved(candidate),
  allowUnapproved,
  plan: planPath,
  preview: previewPath,
  dryRun: true,
  next: [
    'human crop/anchor/socket/motion review is required before real extraction',
    `npm run articulated:extract-plan -- --plan ${planPath}`,
    'npm run articulated:check',
    'npm run review:articulated:quick',
    `npm run sandbox:visual -- --ids ${id}`,
  ],
}, null, 2));

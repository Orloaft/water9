import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const queuePath = resolve(String(args.get('json') ?? 'public/review/content-human-signoff-queue.json'));
const timeoutMs = Number(args.get('timeout-ms') ?? 45000);
const failures = [];

const sourceNotes = {
  'whole-creature-cohesion': 'The whole source organism reads as a single cohesive creature design with matching lighting, palette, and body flow.',
  'part-continuity-cohesion': 'The part continuity around each joint and appendage keeps anatomy, proportion, and lighting consistent for extraction.',
  'readable-silhouette': 'The silhouette has a readable outline at gameplay scale, with the major body shape and threat profile easy to parse.',
  'no-collage-artifacts': 'The source does not show collage artifacts, stitched lighting, mismatched materials, or palette breaks between sections.',
  'non-placeholder-art-direction': 'The production art direction looks finished rather than placeholder, with coherent design intent and polished material treatment.',
  'crop-safe-anatomy': 'The crop leaves safe margins around anatomy, joints, appendages, and pivot areas needed for clean articulated extraction.',
  'clean-magenta-key': 'The magenta key background is clean around the creature border, with no obvious pink contamination or broken edge cleanup.',
  'gameplay-read': 'The gameplay danger read is clear because the attack verb, hazard direction, and hostile visual language are visible.',
  'neutral-riggable-pose': 'The neutral pose is riggable, with readable pivot zones and an attack frame direction that can animate without distortion.',
  'visible-attack-lane': 'The attack lane is visible through the mouth, spine, and forward direction, making the strike path readable in motion.',
};

const threatNotes = {
  'single-source-cohesion': 'The rig keeps source parity with the whole creature, and all visible parts still read as the same creature.',
  'readable-silhouette': 'The silhouette and outline remain readable at gameplay scale with the primary threat shape visible during motion.',
  'anatomy-cohesion': 'The anatomy orientation keeps jaw, body, tail, and limb parts connected with believable proportions.',
  'production-visual-cohesion': 'The assembled rig has production cohesion in palette, lighting, material, and does not read as placeholder art.',
  'socket-seams': 'The socket seams, joint overlays, and connection points hide broken edges during idle and attack poses.',
  'motion-stability': 'The phase strip shows stable motion without jitter, popping, frame drift, or distracting animation changes.',
  'sandbox-behavior': 'The sandbox preview shows idle, lunge, stunned, diver-facing behavior and credible motion in the underwater stage.',
};

function trimOutput(value) {
  const text = String(value ?? '').trim();
  return text.length > 2400 ? `${text.slice(0, 2400)}...` : text;
}

function runNode(label, nodeArgs) {
  const result = spawnSync(process.execPath, nodeArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024 * 16,
  });
  return {
    label,
    status: result.status,
    stdout: trimOutput(result.stdout),
    stderr: trimOutput(result.stderr),
    error: result.error?.message ?? null,
  };
}

async function sha256(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

function sourceAcceptArgs(item, reviewedBy) {
  const command = [
    'tools/accept_source_candidate.mjs',
    '--id', item.id,
    '--status', 'approved',
    '--reviewed-by', reviewedBy,
    '--note', `Human review policy smoke for ${item.species}; validates gate behavior without granting acceptance.`,
  ];
  for (const check of item.sourceChecks ?? []) command.push('--visual-check', check);
  for (const check of item.sourceChecks ?? []) command.push('--score', `${check}=4`);
  for (const check of item.sourceChecks ?? []) command.push('--visual-note', `${check}=${sourceNotes[check] ?? `${check} source evidence note with source, silhouette, key, and gameplay details.`}`);
  command.push('--source-reviewed', '--source-visual-board', 'public/review/source-visual-board.json', '--dry-run');
  return command;
}

function threatAcceptArgs(item, reviewedBy) {
  const command = [
    'tools/accept_articulated_creature.mjs',
    '--id', item.id,
    '--status', 'accepted',
    '--reviewed-by', reviewedBy,
    '--source-candidate', item.id,
    '--note', `Human review policy smoke for ${item.species}; validates rig gate behavior without granting acceptance.`,
  ];
  for (const check of item.threatChecks ?? []) command.push('--visual-check', check);
  for (const check of item.threatChecks ?? []) command.push('--score', `${check}=4`);
  for (const check of item.threatChecks ?? []) command.push('--visual-note', `${check}=${threatNotes[check] ?? `${check} rig evidence note with source parity, motion, sandbox, and production details.`}`);
  command.push('--source-reviewed', '--contact-reviewed', '--phase-reviewed', '--parity-reviewed', '--sandbox-reviewed', '--dry-run');
  return command;
}

function outputIncludes(result, text) {
  return `${result.stdout}\n${result.stderr}`.includes(text);
}

const sourceCandidatesPath = resolve('public/review/source-candidates/source-candidates.json');
const runtimePath = resolve('public/assets/generated/articulated-creatures.parts.json');
const sourceBefore = await sha256(sourceCandidatesPath);
const runtimeBefore = await sha256(runtimePath);

const queue = JSON.parse(await readFile(queuePath, 'utf8'));
const item = (queue.items ?? []).find((candidate) => candidate.mechanicallyReviewable);
if (queue.schema !== 'water9/content-human-signoff-queue@1') failures.push(`unexpected queue schema ${queue.schema ?? 'missing'}`);
if (!item) failures.push('no mechanically reviewable sign-off item available for policy smoke');

const checks = [];
if (item) {
  const sourceDryRun = runNode(`${item.id}: human source dry-run does not mutate`, sourceAcceptArgs(item, 'Human Dryrun Reviewer'));
  checks.push({ id: item.id, type: 'human-source-dry-run', status: sourceDryRun.status });
  if (sourceDryRun.status !== 0) failures.push(`${sourceDryRun.label} failed unexpectedly:\n${sourceDryRun.stderr || sourceDryRun.stdout || sourceDryRun.error || 'no output'}`);

  const sourceAiAttempt = runNode(`${item.id}: AI source approval blocked`, sourceAcceptArgs(item, 'Codex'));
  checks.push({ id: item.id, type: 'ai-source-approval-block', status: sourceAiAttempt.status });
  if (sourceAiAttempt.status === 0 || !outputIncludes(sourceAiAttempt, 'source review needs a human reviewer, not an AI/self reviewer')) {
    failures.push(`${sourceAiAttempt.label} did not reject AI/self reviewer as expected:\n${sourceAiAttempt.stderr || sourceAiAttempt.stdout || sourceAiAttempt.error || 'no output'}`);
  }

  const threatAiAttempt = runNode(`${item.id}: AI threat acceptance blocked`, threatAcceptArgs(item, 'Codex'));
  checks.push({ id: item.id, type: 'ai-threat-acceptance-block', status: threatAiAttempt.status });
  if (threatAiAttempt.status === 0 || !outputIncludes(threatAiAttempt, 'accepted visual review needs a human reviewer name')) {
    failures.push(`${threatAiAttempt.label} did not reject AI/self reviewer as expected:\n${threatAiAttempt.stderr || threatAiAttempt.stdout || threatAiAttempt.error || 'no output'}`);
  }

  const decisionCommands = (item.commands ?? []).filter((command) => String(command).includes('npm run source:accept ') || String(command).includes('npm run content:accept '));
  for (const command of decisionCommands) {
    const text = String(command);
    if (!text.includes('--dry-run')) failures.push(`${item.id}: rendered decision command is missing --dry-run: ${text}`);
    if (!text.includes('<human-reviewer>')) failures.push(`${item.id}: rendered decision command must keep human reviewer placeholder: ${text}`);
  }
}

const sourceAfter = await sha256(sourceCandidatesPath);
const runtimeAfter = await sha256(runtimePath);
if (sourceBefore !== sourceAfter) failures.push('source candidate manifest changed during dry-run policy smoke');
if (runtimeBefore !== runtimeAfter) failures.push('articulated runtime manifest changed during dry-run policy smoke');

const summary = {
  schema: 'water9/content-human-review-policy-smoke@1',
  queue: queuePath,
  target: item?.id ?? null,
  checks,
  dryRunManifestStable: sourceBefore === sourceAfter && runtimeBefore === runtimeAfter,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

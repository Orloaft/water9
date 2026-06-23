import { readFile } from 'node:fs/promises';
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
const limit = args.has('limit') ? Number(args.get('limit')) : Infinity;
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
    signal: result.signal,
    stdout: trimOutput(result.stdout),
    stderr: trimOutput(result.stderr),
    error: result.error?.message ?? null,
  };
}

function sourceAcceptArgs(item) {
  const command = [
    'tools/accept_source_candidate.mjs',
    '--id', item.id,
    '--status', 'approved',
    '--reviewed-by', 'Human Dryrun Reviewer',
    '--note', `Dry-run source approval smoke for ${item.species}; validates the evidence path without granting acceptance.`,
  ];
  for (const check of item.sourceChecks ?? []) command.push('--visual-check', check);
  for (const check of item.sourceChecks ?? []) command.push('--score', `${check}=4`);
  for (const check of item.sourceChecks ?? []) command.push('--visual-note', `${check}=${sourceNotes[check] ?? `${check} source evidence note with specific source, silhouette, magenta key, and gameplay details.`}`);
  command.push('--source-reviewed', '--source-visual-board', 'public/review/source-visual-board.json', '--dry-run');
  return command;
}

function threatAcceptArgs(item) {
  const command = [
    'tools/accept_articulated_creature.mjs',
    '--id', item.id,
    '--status', 'accepted',
    '--reviewed-by', 'Human Dryrun Reviewer',
    '--source-candidate', item.id,
    '--note', `Dry-run rig acceptance smoke for ${item.species}; validates rig evidence without granting acceptance.`,
  ];
  for (const check of item.threatChecks ?? []) command.push('--visual-check', check);
  for (const check of item.threatChecks ?? []) command.push('--score', `${check}=4`);
  for (const check of item.threatChecks ?? []) command.push('--visual-note', `${check}=${threatNotes[check] ?? `${check} rig evidence note with specific source parity, motion, sandbox, and production details.`}`);
  command.push('--source-reviewed', '--contact-reviewed', '--phase-reviewed', '--parity-reviewed', '--sandbox-reviewed', '--dry-run');
  return command;
}

function sourceBlockedAsExpected(result) {
  const text = `${result.stdout}\n${result.stderr}`;
  return result.status !== 0
    && text.includes('source candidate')
    && (
      text.includes('is not approved by the source-first review gate')
      || text.includes('is not approved in the review packet')
    );
}

const queue = JSON.parse(await readFile(queuePath, 'utf8'));
if (queue.schema !== 'water9/content-human-signoff-queue@1') {
  failures.push(`unexpected queue schema ${queue.schema ?? 'missing'}`);
}

const allItems = Array.isArray(queue.items) ? queue.items : [];
const items = allItems
  .filter((item) => item.mechanicallyReviewable)
  .slice(0, Number.isFinite(limit) ? limit : allItems.length);

if (!items.length) failures.push('no mechanically reviewable human sign-off items found');

const checks = [];
for (const item of items) {
  const sourceResult = runNode(`${item.id}: source approval dry-run`, sourceAcceptArgs(item));
  checks.push({
    id: item.id,
    type: 'source-approval-dry-run',
    expected: 'pass',
    status: sourceResult.status,
  });
  if (sourceResult.status !== 0) {
    failures.push(`${sourceResult.label} failed unexpectedly:\n${sourceResult.stderr || sourceResult.stdout || sourceResult.error || 'no output'}`);
  }

  const threatResult = runNode(`${item.id}: threat acceptance dry-run`, threatAcceptArgs(item));
  const shouldPassThreatDryRun = item.sourceApproved === true;
  checks.push({
    id: item.id,
    type: 'threat-acceptance-dry-run',
    expected: shouldPassThreatDryRun ? 'pass' : 'source-first-block',
    status: threatResult.status,
  });
  if (shouldPassThreatDryRun && threatResult.status !== 0) {
    failures.push(`${threatResult.label} failed unexpectedly for source-approved item:\n${threatResult.stderr || threatResult.stdout || threatResult.error || 'no output'}`);
  }
  if (!shouldPassThreatDryRun && !sourceBlockedAsExpected(threatResult)) {
    failures.push(`${threatResult.label} should stop at the source-first gate, got status ${threatResult.status}:\n${threatResult.stderr || threatResult.stdout || threatResult.error || 'no output'}`);
  }
}

const summary = {
  schema: 'water9/content-human-signoff-command-smoke@1',
  queue: queuePath,
  totalItems: allItems.length,
  checkedItems: items.length,
  sourceDryRuns: checks.filter((check) => check.type === 'source-approval-dry-run').length,
  threatDryRuns: checks.filter((check) => check.type === 'threat-acceptance-dry-run').length,
  sourceFirstBlocks: checks.filter((check) => check.expected === 'source-first-block').length,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

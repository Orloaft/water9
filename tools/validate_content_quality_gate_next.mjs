import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const paths = {
  json: resolve(String(args.get('json') ?? 'public/review/content-quality-gate-next.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-quality-gate-next.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-quality-gate-next.html')),
  matrix: resolve(String(args.get('matrix') ?? 'public/review/content-quality-gate-matrix.json')),
  sourceApprovalSession: resolve(String(args.get('source-approval-session') ?? 'public/review/source-candidates/source-approval-session.json')),
  visualFeedback: resolve(String(args.get('visual-feedback') ?? 'public/review/content-visual-feedback-ledger.json')),
  visualRegeneration: resolve(String(args.get('visual-regeneration') ?? 'public/review/content-visual-regeneration-queue.json')),
};
const failures = [];

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

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function includesRendered(text, value) {
  return text.includes(String(value ?? '')) || text.includes(htmlEscape(value));
}

const packet = await readJson('content quality gate next', paths.json);
const matrix = await readJson('content quality gate matrix', paths.matrix);
const sourceApprovalSession = await readJson('source approval session', paths.sourceApprovalSession);
const visualFeedback = await readJson('content visual feedback', paths.visualFeedback);
const visualRegeneration = await readJson('content visual regeneration', paths.visualRegeneration);
const markdown = await readText('content quality gate next markdown', paths.markdown);
const html = await readText('content quality gate next html', paths.html);
await fileOk('content quality gate next markdown', paths.markdown, 1024);
await fileOk('content quality gate next html', paths.html, 4096);

if (packet?.schema !== 'water9/content-quality-gate-next@1') failures.push(`unexpected packet schema ${packet?.schema ?? 'missing'}`);
if (matrix?.schema !== 'water9/content-quality-gate-matrix@1') failures.push(`unexpected matrix schema ${matrix?.schema ?? 'missing'}`);
if (packet?.policy?.focusedPacketDoesNotApprove !== true) failures.push('packet must state it does not approve');
if (packet?.policy?.humanSourceApprovalRequired !== true) failures.push('packet must require human source approval');
if (packet?.policy?.humanThreatAcceptanceRequired !== true) failures.push('packet must require human threat acceptance');
if (packet?.policy?.blockedPrototypesCannotCountTowardStrictGate !== true) failures.push('packet must prevent blocked prototypes from strict gate credit');

const approvalSessionTargetId = typeof sourceApprovalSession?.nextTarget === 'string'
  ? sourceApprovalSession.nextTarget
  : sourceApprovalSession?.nextTarget?.id;
const approvalSessionTarget = (matrix?.rows ?? []).find((row) => row.id === approvalSessionTargetId && row.nextGate !== 'accepted');
const expected = approvalSessionTarget
  ?? (matrix?.rows ?? []).find((row) => row.nextGate !== 'accepted' && row.sourceEvidenceComplete && row.runtimeEvidenceComplete)
  ?? (matrix?.rows ?? []).find((row) => row.nextGate !== 'accepted')
  ?? matrix?.rows?.[0];
const target = packet?.target;
if (!target) failures.push('packet missing target');
if (expected && target?.id !== expected.id) failures.push(`packet target ${target?.id ?? 'missing'} does not match expected ${expected.id}`);
if (approvalSessionTarget && packet?.selection?.strategy !== 'source-approval-session-next-target') failures.push('packet must use source approval session target when available');
if (approvalSessionTargetId && packet?.selection?.sourceApprovalSessionNextTarget !== approvalSessionTargetId) failures.push('packet selection must record source approval session target');
if (target?.strictGateEligible === true && packet?.policy?.strictGateStillRequired === true) failures.push('strict eligible target conflicts with strict gate policy');
if (target && target.sourceApproved !== true && target.nextGate !== 'human-source-approval' && target.sourceCriticRegenerationRequired !== true) failures.push('unapproved target should point to human-source-approval');
if (!Array.isArray(packet?.evidence) || packet.evidence.length < 10) failures.push('packet must include at least 10 evidence entries');
for (const label of ['source art', 'magenta key preview', 'source sandbox preview', 'articulation plan preview', 'source parity overlay', 'contact sheet', 'phase strip', 'sandbox idle', 'sandbox lunge', 'sandbox stunned']) {
  const item = packet?.evidence?.find((entry) => entry.label === label);
  if (!item?.url) failures.push(`packet missing evidence ${label}`);
}
if (!Array.isArray(packet?.requiredRead) || packet.requiredRead.length < 3) failures.push('packet requiredRead is incomplete');
if (!Array.isArray(packet?.contractReviewChecklist) || packet.contractReviewChecklist.length < 2) failures.push('packet contractReviewChecklist is incomplete');
for (const [key, value] of Object.entries(packet?.target?.commands ?? {})) {
  if (!String(value ?? '').includes('npm run')) failures.push(`target command ${key} is missing npm run`);
}
if (!String(packet?.target?.commands?.sourceApprovalDryRun ?? '').includes('--dry-run')) failures.push('source approval command must be dry-run');
if (!String(packet?.target?.commands?.threatAcceptanceDryRun ?? '').includes('--dry-run')) failures.push('threat acceptance command must be dry-run');
const openBlockingVisualFeedback = (visualFeedback?.items ?? []).filter((item) => item.open && item.severity === 'blocking');
const packetVisualBlockers = Array.isArray(packet?.globalVisualBlockers) ? packet.globalVisualBlockers : [];
if (packetVisualBlockers.length !== openBlockingVisualFeedback.length) failures.push('packet global visual blocker count must match open blocking feedback');
for (const item of openBlockingVisualFeedback) {
  const packetItem = packetVisualBlockers.find((blocker) => blocker.targetId === item.targetId);
  const regenerationItem = (visualRegeneration?.items ?? []).find((blocker) => blocker.targetId === item.targetId);
  if (!packetItem) {
    failures.push(`packet missing visual blocker ${item.targetId}`);
    continue;
  }
  if (packetItem.status !== item.status) failures.push(`${item.targetId}: packet visual blocker status mismatch`);
  if (packetItem.severity !== item.severity) failures.push(`${item.targetId}: packet visual blocker severity mismatch`);
  if (packetItem.countsTowardStrictGate !== false) failures.push(`${item.targetId}: packet visual blocker must not count toward strict gate`);
  if (packetItem.targetGateCandidate !== false) failures.push(`${item.targetId}: packet visual blocker must not be a target gate candidate`);
  if (regenerationItem && packetItem.regenerationPromptFile !== regenerationItem.promptFile) failures.push(`${item.targetId}: packet visual blocker regeneration prompt mismatch`);
}

for (const required of [
  'Water 9 Next Quality Gate Review',
  'This focused packet does not approve source art or accept a threat',
  'Human review and strict apply gates remain required',
  'Global Visual Blockers',
  'Rejected prototype work stays visible',
  'data-content-quality-gate-next',
  'data-quality-gate-next-target',
  'data-next-gate',
  'source art',
  'sandbox lunge',
  'npm run content:quality-gate-next',
  'npm run content:quality-gate-next-check',
]) {
  if (!markdown.includes(required) && !includesRendered(html, required)) failures.push(`rendered outputs missing ${required}`);
}
for (const item of packetVisualBlockers) {
  for (const required of [item.targetId, item.status, item.severity]) {
    if (!markdown.includes(required) && !includesRendered(html, required)) failures.push(`rendered outputs missing visual blocker detail ${required}`);
  }
}

if (target) {
  for (const required of [target.id, target.species, target.nextGate, `data-quality-gate-next-target="${target.id}"`]) {
    if (!markdown.includes(required) && !includesRendered(html, required)) failures.push(`rendered outputs missing target detail ${required}`);
  }
}

const result = {
  schema: 'water9/content-quality-gate-next-check@1',
  target: target?.id ?? null,
  nextGate: target?.nextGate ?? null,
  evidence: packet?.evidence?.filter((item) => item.url).length ?? 0,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}

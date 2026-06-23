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
  json: resolve(String(args.get('json') ?? 'public/review/source-candidates/source-workstation.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/source-candidates/source-workstation.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-workstation.html')),
  nextAction: resolve(String(args.get('next-action') ?? 'public/review/content-next-action.json')),
  sourceQueue: resolve(String(args.get('source-queue') ?? 'public/review/source-candidates/source-generation-queue.json')),
  rejections: resolve(String(args.get('rejections') ?? 'public/review/source-candidates/rejected-attempts.json')),
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

async function fileOk(label, path, minSize = 512) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minSize) failures.push(`${label}: missing or too small`);
  } catch {
    failures.push(`${label}: missing`);
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textIncludes(text, value) {
  return text.includes(value) || text.includes(htmlEscape(value));
}

const report = await readJson('source workstation', paths.json);
const nextAction = await readJson('content next action', paths.nextAction);
const sourceQueue = await readJson('source queue', paths.sourceQueue);
const rejected = await readJson('rejected attempts', paths.rejections);
const markdown = await readText('source workstation markdown', paths.markdown);
const html = await readText('source workstation html', paths.html);
await fileOk('source workstation markdown', paths.markdown, 2048);
await fileOk('source workstation html', paths.html, 4096);

if (report?.schema !== 'water9/source-workstation@1') failures.push(`unexpected schema ${report?.schema ?? 'missing'}`);
const target = report?.target ?? {};
const nextTarget = nextAction?.nextAction?.targetId;
if (!target.id) failures.push('target id is missing');

const queueItem = (sourceQueue?.candidates ?? []).find((item) => item.id === target.id);
const nextTargetIsQueued = nextTarget && (sourceQueue?.candidates ?? []).some((item) => item.id === nextTarget);
if (nextTargetIsQueued && target.id !== nextTarget) failures.push(`target ${target.id} does not match queued content next action target ${nextTarget}`);
const sourcePresentHistoricalTarget = target.doctorStatus === 'source-present';
if (!queueItem && !sourcePresentHistoricalTarget) failures.push(`${target.id}: target is missing from source generation queue`);
if (queueItem) {
  if (target.prompt !== queueItem.prompt) failures.push(`${target.id}: prompt does not match source generation queue`);
  if (target.promptFile !== queueItem.promptFile) failures.push(`${target.id}: promptFile does not match source generation queue`);
  if (target.expectedOutput !== queueItem.expectedOutput) failures.push(`${target.id}: expectedOutput does not match source generation queue`);
  if ((target.requiredRead ?? []).length < (queueItem.requiredRead ?? []).length) failures.push(`${target.id}: requiredRead is incomplete`);
  if ((target.contractReviewChecklist ?? []).length < (queueItem.contractReviewChecklist ?? []).length) failures.push(`${target.id}: review checklist is incomplete`);
}

const expectedInbox = `tools/source-inbox/${target.id}.png`;
const expectedFaunaInbox = `tools/source-inbox/fauna-${target.id}-whole-source.png`;
if (!Array.isArray(target.expectedInboxFiles) || !target.expectedInboxFiles.includes(expectedInbox) || !target.expectedInboxFiles.includes(expectedFaunaInbox)) {
  failures.push(`${target.id}: expected inbox filenames are incomplete`);
}
for (const command of [
  `npm run source:next-prompt -- --id ${target.id}`,
  `npm run source:inbox-capture -- --id ${target.id} --open`,
  'npm run source:inbox-capture',
  `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${target.id}`,
  `npm run source:ingest-current -- --id ${target.id} --dry-run`,
  `npm run source:ingest-current -- --id ${target.id} --apply`,
  `npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids ${target.id} --dry-run`,
  `npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids ${target.id}`,
  `npm run source:image-check -- --id ${target.id}`,
  'npm run source:preview-check',
  `npm run sandbox:preview -- --id ${target.id} --kind source --serve --open --visual`,
  'npm run source:review-dossier',
  'npm run source:review-dossier-check',
]) {
  if (!target.commands?.includes(command)) failures.push(`${target.id}: workstation target commands missing ${command}`);
}
if (!Array.isArray(target.operatorSequence) || target.operatorSequence.length < 5) failures.push(`${target.id}: operatorSequence is missing or too short`);
if (!Array.isArray(target.qualityGateCommands) || target.qualityGateCommands.length < 6) failures.push(`${target.id}: qualityGateCommands is missing or too short`);
for (const command of [
  `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${target.id}`,
  `npm run source:ingest-current -- --id ${target.id} --dry-run`,
  `npm run source:image-check -- --id ${target.id}`,
  'npm run source:preview-check',
  `npm run sandbox:preview -- --id ${target.id} --kind source --serve --open --visual`,
  'npm run source:review-dossier && npm run source:review-dossier-check',
  'npm run source:check',
]) {
  if (!target.qualityGateCommands?.includes(command)) failures.push(`${target.id}: qualityGateCommands missing ${command}`);
}

const rejectionCount = (rejected?.attempts ?? []).filter((attempt) => attempt.candidateId === target.id).length;
if ((report?.rejections ?? []).length !== rejectionCount) failures.push(`${target.id}: rejection history length mismatch`);
if (rejectionCount > 0 && !report.rejections?.[0]?.reason) failures.push(`${target.id}: latest rejection reason is missing`);
const missingArtifactRejections = (rejected?.attempts ?? []).filter((attempt) => (
  attempt.candidateId === target.id
  && (
    attempt.sourceImagegenMarker
    || /no (new |recoverable |accessible )?(saved |source )?(image )?file|did not create an accessible source image file|no project-bound artifact|inline/i.test(String(attempt.reason ?? ''))
  )
));
const captureEscalation = target.captureEscalation ?? {};
if (captureEscalation.schema !== 'water9/source-capture-escalation@1') failures.push(`${target.id}: captureEscalation schema is missing`);
if (captureEscalation.candidateId !== target.id) failures.push(`${target.id}: captureEscalation candidateId mismatch`);
if (captureEscalation.threshold !== 5) failures.push(`${target.id}: captureEscalation threshold must be 5`);
if (captureEscalation.missingArtifactAttempts !== missingArtifactRejections.length) failures.push(`${target.id}: captureEscalation missingArtifactAttempts mismatch`);
if (missingArtifactRejections.length >= 5 && captureEscalation.manualCaptureRequired !== true) failures.push(`${target.id}: manual capture must be required after 5 missing-artifact attempts`);
if (missingArtifactRejections.length >= 5 && captureEscalation.noMoreInlineRetries !== true) failures.push(`${target.id}: noMoreInlineRetries must be true after 5 missing-artifact attempts`);
if (captureEscalation.primaryCommand !== `npm run source:inbox-capture -- --id ${target.id} --open`) failures.push(`${target.id}: captureEscalation primaryCommand is not target-aware`);
if (captureEscalation.expectedInboxFile !== expectedInbox) failures.push(`${target.id}: captureEscalation expectedInboxFile mismatch`);
for (const command of [
  `npm run source:recover-inline -- --id ${target.id} --image <saved-image-path> --copy --validate`,
  `npm run source:recover-inline -- --id ${target.id} --data-url-stdin --copy --validate`,
  `npm run source:recover-inline -- --id ${target.id} --stdin-base64 --stdin-filename ${target.id}.png --copy --validate`,
]) {
  if (!captureEscalation.recoveryCommands?.includes(command)) failures.push(`${target.id}: captureEscalation recoveryCommands missing ${command}`);
}
for (const command of [
  `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${target.id}`,
  `npm run source:ingest-current -- --id ${target.id} --dry-run`,
  `npm run source:ingest-current -- --id ${target.id} --apply`,
]) {
  if (!captureEscalation.validationCommands?.includes(command)) failures.push(`${target.id}: captureEscalation validationCommands missing ${command}`);
}

for (const expected of [
  'Water 9 Source Workstation',
  target.id,
  target.species,
  expectedInbox,
  expectedFaunaInbox,
  'Generation Prompt',
  'Manual Capture Escalation',
  'Manual capture required',
  'No more inline retries',
  'Operator Sequence',
  'Quality Gate Commands',
  'Required Read',
  'Reject If',
  'Review Checklist',
  'Recent Rejections',
  'npm run source:workstation',
  'npm run source:workstation-check',
  'npm run source:workstation:preview',
  `npm run source:ingest-current -- --id ${target.id} --dry-run`,
  `npm run source:ingest-current -- --id ${target.id} --apply`,
  `npm run source:inbox-capture -- --id ${target.id} --open`,
  `http://127.0.0.1:5188/?id=${target.id}`,
  `npm run source:recover-inline -- --id ${target.id} --image <saved-image-path> --copy --validate`,
  `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${target.id}`,
  `npm run source:image-check -- --id ${target.id}`,
  'npm run source:preview-check',
  `npm run sandbox:preview -- --id ${target.id} --kind source --serve --open --visual`,
  'npm run source:review-dossier && npm run source:review-dossier-check',
]) {
  if (expected && !markdown.includes(expected)) failures.push(`markdown missing ${expected}`);
  if (expected && !textIncludes(html, expected)) failures.push(`html missing ${expected}`);
}
if (!String(target.prompt ?? '').includes('#ff00ff')) failures.push(`${target.id}: prompt must include magenta background requirement`);
if (!String(target.prompt ?? '').includes(target.species ?? '')) failures.push(`${target.id}: prompt must include species name`);
if (target.captureCommand !== `npm run source:inbox-capture -- --id ${target.id} --open`) failures.push(`${target.id}: captureCommand is not target-aware`);
if (target.captureUrl !== `http://127.0.0.1:5188/?id=${encodeURIComponent(target.id)}`) failures.push(`${target.id}: captureUrl is not target-aware`);

const summary = {
  schema: 'water9/source-workstation-check@1',
  target: target.id ?? null,
  doctorStatus: target.doctorStatus ?? null,
  queueRank: target.queueRank ?? null,
  rejections: report?.rejections?.length ?? 0,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

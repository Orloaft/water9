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
  json: resolve(String(args.get('json') ?? 'public/review/source-candidates/source-intake-doctor.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/source-candidates/source-intake-doctor.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-intake-doctor.html')),
  nextAction: resolve(String(args.get('next-action') ?? 'public/review/content-next-action.json')),
  sourceQueue: resolve(String(args.get('source-queue') ?? 'public/review/source-candidates/source-generation-queue.json')),
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

async function fileOk(label, path, minSize = 256) {
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

const report = await readJson('source intake doctor', paths.json);
const nextAction = await readJson('content next action', paths.nextAction);
const sourceQueue = await readJson('source queue', paths.sourceQueue);
const markdown = await readText('source intake doctor markdown', paths.markdown);
const html = await readText('source intake doctor html', paths.html);
await fileOk('source intake doctor markdown', paths.markdown, 512);
await fileOk('source intake doctor html', paths.html, 1024);

if (report?.schema !== 'water9/source-intake-doctor@1') failures.push(`unexpected schema ${report?.schema ?? 'missing'}`);
const target = report?.target ?? {};
const nextTargetId = nextAction?.nextAction?.targetId;
if (!target.id) failures.push('target id is missing');
const queue = Array.isArray(report?.queue) ? report.queue : [];
const sourceQueueIds = (sourceQueue?.candidates ?? []).map((candidate) => candidate.id);
const nextTargetIsQueued = nextTargetId && sourceQueueIds.includes(nextTargetId);
if (queue.length !== sourceQueueIds.length) failures.push(`doctor queue length ${queue.length} does not match source queue ${sourceQueueIds.length}`);
if (nextTargetIsQueued && target.id !== nextTargetId) failures.push(`target ${target.id} does not match queued content next action target ${nextTargetId}`);
if (sourceQueueIds.length && !queue.some((item) => item.id === target.id)) failures.push(`${target.id}: target is missing from doctor queue`);
for (const item of queue) {
  if (!sourceQueueIds.includes(item.id)) failures.push(`${item.id}: doctor queue item is not in source queue`);
  if (!Array.isArray(item.expectedInboxFiles) || item.expectedInboxFiles.length < 2) failures.push(`${item.id}: expected inbox filenames are missing`);
  if (!Array.isArray(item.commands) || item.commands.length < 1) failures.push(`${item.id}: commands are missing`);
  if (!['source-present', 'ready-to-ingest', 'inbox-blocked', 'missing-inbox-image'].includes(item.status)) failures.push(`${item.id}: unknown status ${item.status}`);
}
for (const expected of [
  'Water 9 Source Intake Doctor',
  target.id,
  `tools/source-inbox/${target.id}.png`,
  `npm run source:inbox-capture -- --id ${target.id} --open`,
  `npm run source:ingest-current -- --id ${target.id} --dry-run`,
  `npm run source:ingest-current -- --id ${target.id} --apply`,
  'npm run source:inbox-check',
]) {
  if (expected && !markdown.includes(expected)) failures.push(`markdown missing ${expected}`);
  if (expected && !textIncludes(html, expected)) failures.push(`html missing ${expected}`);
}
if (target.status === 'missing-inbox-image') {
  for (const command of [
    `npm run source:inbox-capture -- --id ${target.id} --open`,
    `npm run source:recover-inline -- --id ${target.id} --image <saved-image-path> --copy --validate`,
    `npm run source:ingest-current -- --id ${target.id} --dry-run`,
    `npm run source:ingest-current -- --id ${target.id} --apply`,
  ]) {
    if (!target.commands?.includes(command)) failures.push(`${target.id}: missing-image commands missing ${command}`);
  }
  if (target.commands?.includes('npm run source:inbox-capture')) {
    failures.push(`${target.id}: missing-image commands must not use generic source:inbox-capture`);
  }
}
for (const command of target.commands ?? []) {
  if (!markdown.includes(command)) failures.push(`markdown missing command ${command}`);
  if (!textIncludes(html, command)) failures.push(`html missing command ${command}`);
}

const summary = {
  json: paths.json,
  markdown: paths.markdown,
  html: paths.html,
  target: target.id ?? null,
  status: target.status ?? null,
  readyForIngest: Boolean(target.readyForIngest),
  queue: queue.length,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

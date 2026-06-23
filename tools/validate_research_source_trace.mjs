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
  trace: resolve(String(args.get('trace') ?? 'public/review/source-candidates/research-source-trace.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/source-candidates/research-source-trace.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/research-source-trace.html')),
  queue: resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json')),
  sprint: resolve(String(args.get('sprint') ?? 'public/review/source-candidates/source-generation-sprint.json')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
};
const minCandidates = Number(args.get('min-candidates') ?? 20);
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

async function fileOk(label, path, minSize = 128) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minSize) failures.push(`${label}: missing or too small`);
  } catch {
    failures.push(`${label}: missing`);
  }
}

const trace = await readJson('research source trace', paths.trace);
const queue = await readJson('source generation queue', paths.queue);
const sprint = await readJson('source generation sprint', paths.sprint);
const sourceCandidates = await readJson('source candidates', paths.sourceCandidates);
const markdown = await readText('research source trace markdown', paths.markdown);
const html = await readText('research source trace html', paths.html);
await fileOk('research source trace markdown', paths.markdown, 512);
await fileOk('research source trace html', paths.html, 4096);

if (trace?.schema !== 'water9/research-source-trace@1') failures.push(`unexpected trace schema ${trace?.schema ?? 'missing'}`);
if (queue?.schema !== 'water9/source-generation-queue@1') failures.push(`unexpected queue schema ${queue?.schema ?? 'missing'}`);
if (sprint?.schema !== 'water9/source-generation-sprint@1') failures.push(`unexpected sprint schema ${sprint?.schema ?? 'missing'}`);
if (sourceCandidates?.schema !== 'water9/source-candidates@1') failures.push(`unexpected source candidates schema ${sourceCandidates?.schema ?? 'missing'}`);

const records = Array.isArray(trace?.records) ? trace.records : [];
const queueCandidates = Array.isArray(queue?.candidates) ? queue.candidates : [];
const sprintIds = Array.isArray(sprint?.ids) ? sprint.ids : [];
const sourceCandidateIds = new Set((sourceCandidates?.candidates ?? []).map((candidate) => candidate.id));
const recordsById = new Map(records.map((record) => [record.id, record]));

if (records.length < minCandidates) failures.push(`only ${records.length}/${minCandidates} records in trace`);
if ((trace?.summary?.candidates ?? 0) !== records.length) failures.push('trace summary candidates mismatch');
if ((trace?.summary?.sourceCandidates ?? 0) !== sourceCandidateIds.size) failures.push('trace sourceCandidates summary mismatch');
if ((trace?.summary?.queued ?? 0) !== queueCandidates.length) failures.push('trace queued summary mismatch');
if ((trace?.summary?.sprint ?? 0) !== sprintIds.length) failures.push('trace sprint summary mismatch');
if ((trace?.summary?.queuedPromptAuditHardening ?? 0) !== records.filter((record) => record.inQueue && record.promptHasAuditHardening).length) {
  failures.push('trace queuedPromptAuditHardening summary mismatch');
}

for (const id of sourceCandidateIds) {
  if (!recordsById.has(id)) failures.push(`${id}: missing from research source trace`);
}
for (const record of records) {
  const owner = record.id ?? 'unknown-record';
  if (!record.id) failures.push(`${owner}: missing id`);
  if (!sourceCandidateIds.has(record.id)) failures.push(`${owner}: trace record is not a source candidate`);
  if (!record.species) failures.push(`${owner}: missing species`);
  if (!record.lane) failures.push(`${owner}: missing subagent lane`);
  if (!record.audited) failures.push(`${owner}: missing subagent audit finding`);
  if (!record.auditFile) failures.push(`${owner}: missing audit file`);
  if ((record.auditStrengths ?? 0) < 1) failures.push(`${owner}: audit strengths are missing`);
  if ((record.auditRisks ?? 0) < 1) failures.push(`${owner}: audit risks are missing`);
  if (!Array.isArray(record.referenceSearchTerms)) failures.push(`${owner}: referenceSearchTerms must be an array`);
  if (record.inQueue) {
    if (!record.queueHasAuditGuidance) failures.push(`${owner}: queued item is missing auditGuidance`);
    if (!record.promptFile) failures.push(`${owner}: queued item is missing promptFile`);
    if (!record.promptExists) failures.push(`${owner}: queued prompt file is missing`);
    if (!record.promptHasAuditHardening) failures.push(`${owner}: queued prompt is missing Research audit hardening section`);
    if (!record.promptHasSourcePoseRules) failures.push(`${owner}: queued prompt is missing Source pose contract section`);
    if (!record.promptHasCohesionLock) failures.push(`${owner}: queued prompt is missing Cohesion lock section`);
    if (!Array.isArray(record.qualityChecks) || !record.qualityChecks.includes('part-continuity-cohesion')) {
      failures.push(`${owner}: queued quality checks are missing part-continuity-cohesion`);
    }
    if (!record.nextCommand || !String(record.nextCommand).includes('source:imagegen-mark')) {
      failures.push(`${owner}: queued item is missing imagegen mark command`);
    }
  }
}

for (const item of queueCandidates) {
  const record = recordsById.get(item.id);
  if (!record) {
    failures.push(`${item.id}: queue item missing from trace`);
    continue;
  }
  if (!record.inQueue) failures.push(`${item.id}: trace does not mark queue item as inQueue`);
  if (record.queueRank !== item.rank) failures.push(`${item.id}: trace rank ${record.queueRank} does not match queue rank ${item.rank}`);
}
for (const id of sprintIds) {
  const record = recordsById.get(id);
  if (!record) failures.push(`${id}: sprint id missing from trace`);
  else if (!record.inQueue) failures.push(`${id}: sprint id is not traced to generation queue`);
}

for (const required of [
  'Research Source Trace',
  'npm run research:source-trace',
  'npm run research:source-trace-check',
  'npm run source:generation-queue',
]) {
  if (!markdown.includes(required)) failures.push(`markdown missing required content: ${required}`);
  if (!html.includes(required)) failures.push(`html missing required content: ${required}`);
}
for (const item of queueCandidates.slice(0, 8)) {
  if (!markdown.includes(item.id)) failures.push(`markdown missing queued item ${item.id}`);
  if (!html.includes(item.id)) failures.push(`html missing queued item ${item.id}`);
}

const summary = {
  trace: paths.trace,
  markdown: paths.markdown,
  html: paths.html,
  records: records.length,
  queued: queueCandidates.length,
  sprint: sprintIds.length,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

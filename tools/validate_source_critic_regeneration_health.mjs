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
  json: resolve(String(args.get('json') ?? 'public/review/source-candidates/source-critic-regeneration-health.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/source-candidates/source-critic-regeneration-health.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-critic-regeneration-health.html')),
  queue: resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-critic-regeneration-queue.json')),
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

function includesHtml(text, value) {
  return text.includes(value) || text.includes(htmlEscape(value));
}

const health = await readJson('critic regeneration health', paths.json);
const queue = await readJson('critic regeneration queue', paths.queue);
const markdown = await readText('critic regeneration health markdown', paths.markdown);
const html = await readText('critic regeneration health html', paths.html);
await fileOk('critic regeneration health markdown', paths.markdown, 1024);
await fileOk('critic regeneration health html', paths.html, 2048);

if (health?.schema !== 'water9/source-critic-regeneration-health@1') failures.push(`health schema is ${health?.schema ?? 'missing'}`);
if (queue?.schema !== 'water9/source-critic-regeneration-queue@1') failures.push(`queue schema is ${queue?.schema ?? 'missing'}`);
if (health?.policy?.doesNotApproveSources !== true) failures.push('health report must not approve sources');
if (health?.policy?.doesNotAcceptThreats !== true) failures.push('health report must not accept threats');
if (health?.policy?.distinctReplacementRequiredBeforeIngest !== true) failures.push('health report must require distinct replacements before ingest');
if (health?.policy?.replacementMustReturnToSourceReview !== true) failures.push('health report must require replacement return to source review');

const items = Array.isArray(health?.items) ? health.items : [];
const queueItems = Array.isArray(queue?.candidates) ? queue.candidates : [];
const byId = new Map(items.map((item) => [item.id, item]));
if (items.length !== queueItems.length) failures.push(`health item count ${items.length} does not match queue ${queueItems.length}`);
if ((health?.summary?.regenerateCandidates ?? -1) !== items.length) failures.push('summary regenerateCandidates mismatch');
if ((health?.summary?.distinctReplacementReady ?? -1) !== items.filter((item) => item.status === 'distinct-replacement-ready').length) failures.push('summary distinctReplacementReady mismatch');
if ((health?.summary?.appliedReplacements ?? -1) !== items.filter((item) => item.status === 'replacement-applied').length) failures.push('summary appliedReplacements mismatch');
if ((health?.summary?.validNoopReplacements ?? -1) !== items.filter((item) => item.status === 'valid-noop-replacement').length) failures.push('summary validNoopReplacements mismatch');
if ((health?.summary?.missingReplacements ?? -1) !== items.filter((item) => item.status === 'replacement-missing').length) failures.push('summary missingReplacements mismatch');
if ((health?.summary?.invalidReplacements ?? -1) !== items.filter((item) => item.status === 'replacement-invalid').length) failures.push('summary invalidReplacements mismatch');

for (const queueItem of queueItems) {
  const item = byId.get(queueItem.id);
  if (!item) {
    failures.push(`${queueItem.id}: missing health row`);
    continue;
  }
  if (item.species !== queueItem.species) failures.push(`${queueItem.id}: species mismatch`);
  if (!['distinct-replacement-ready', 'replacement-applied', 'valid-noop-replacement', 'replacement-missing', 'replacement-invalid'].includes(item.status)) {
    failures.push(`${queueItem.id}: invalid status ${item.status}`);
  }
  if (item.status === 'distinct-replacement-ready' && item.replacementMatchesCurrentSource) failures.push(`${queueItem.id}: distinct replacement cannot match current source`);
  if (item.status === 'replacement-applied' && item.replacementMatchesCurrentSource !== true) failures.push(`${queueItem.id}: applied replacement must match current source`);
  if (item.status === 'replacement-applied' && item.replacementApplied !== true) failures.push(`${queueItem.id}: applied replacement must set replacementApplied`);
  if (item.status === 'valid-noop-replacement' && item.replacementMatchesCurrentSource !== true) failures.push(`${queueItem.id}: no-op replacement must match current source`);
  if (item.status === 'replacement-missing' && item.inbox?.exists === true) failures.push(`${queueItem.id}: missing replacement cannot have inbox file`);
  if (item.status === 'replacement-invalid' && item.imageCheck?.passed === true) failures.push(`${queueItem.id}: invalid replacement cannot pass image check`);
  if (item.status === 'distinct-replacement-ready' && !String(item.commands?.dryRunReplace ?? '').includes(`--id ${item.id}`)) failures.push(`${queueItem.id}: ready row missing target dry-run replace command`);
  if (!Array.isArray(item.nextCommands) || item.nextCommands.length < 1) failures.push(`${queueItem.id}: missing nextCommands`);
  for (const command of item.nextCommands) {
    if (!markdown.includes(command) && !includesHtml(html, command)) failures.push(`${queueItem.id}: rendered outputs missing command ${command}`);
  }
  for (const value of [item.id, item.species, item.status, item.nextAction]) {
    if (value && !markdown.includes(String(value)) && !includesHtml(html, value)) failures.push(`${queueItem.id}: rendered outputs missing ${value}`);
  }
}

const expectedNext = items.find((item) => item.status === 'distinct-replacement-ready')?.id
  ?? items.find((item) => item.status === 'valid-noop-replacement')?.id
  ?? items.find((item) => item.status === 'replacement-missing')?.id
  ?? items.find((item) => item.status === 'replacement-invalid')?.id
  ?? null;
if ((health?.summary?.nextActionTarget ?? null) !== expectedNext) failures.push('summary nextActionTarget mismatch');
const nextItem = expectedNext ? byId.get(expectedNext) : null;
if ((health?.summary?.nextActionStatus ?? null) !== (nextItem?.status ?? null)) failures.push('summary nextActionStatus mismatch');
if (JSON.stringify(health?.nextCommands ?? []) !== JSON.stringify(nextItem?.nextCommands ?? [])) failures.push('top-level nextCommands must match next action target');

for (const required of [
  'Water 9 Critic Regeneration Health',
  'does not approve source art',
  'Distinct replacements ready',
  'Applied replacements',
  'Valid no-op replacements',
  'Missing replacements',
  'data-critic-regeneration-health',
]) {
  if (!markdown.includes(required) && !includesHtml(html, required)) failures.push(`rendered outputs missing ${required}`);
}

const result = {
  schema: 'water9/source-critic-regeneration-health-check@1',
  regenerateCandidates: health?.summary?.regenerateCandidates ?? null,
  distinctReplacementReady: health?.summary?.distinctReplacementReady ?? null,
  appliedReplacements: health?.summary?.appliedReplacements ?? null,
  validNoopReplacements: health?.summary?.validNoopReplacements ?? null,
  missingReplacements: health?.summary?.missingReplacements ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}

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
  runway: resolve(String(args.get('runway') ?? 'public/review/source-candidates/source-intake-runway.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/source-candidates/source-intake-runway.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-intake-runway.html')),
  sprint: resolve(String(args.get('sprint') ?? 'public/review/source-candidates/source-generation-sprint.json')),
  inbox: resolve(String(args.get('inbox') ?? 'public/review/source-inbox/manifest.json')),
  trace: resolve(String(args.get('trace') ?? 'public/review/source-candidates/research-source-trace.json')),
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

async function fileOk(label, path, minSize = 128) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minSize) failures.push(`${label}: missing or too small`);
  } catch {
    failures.push(`${label}: missing`);
  }
}

const runway = await readJson('source intake runway', paths.runway);
const sprint = await readJson('source generation sprint', paths.sprint);
const inbox = await readJson('source inbox review', paths.inbox);
const trace = await readJson('research source trace', paths.trace);
const markdown = await readText('source intake runway markdown', paths.markdown);
const html = await readText('source intake runway html', paths.html);
await fileOk('source intake runway markdown', paths.markdown, 512);
const sprintIdsForSize = Array.isArray(sprint?.ids) ? sprint.ids : [];
await fileOk('source intake runway html', paths.html, sprintIdsForSize.length ? 4096 : 2048);

if (runway?.schema !== 'water9/source-intake-runway@1') failures.push(`unexpected runway schema ${runway?.schema ?? 'missing'}`);
if (sprint?.schema !== 'water9/source-generation-sprint@1') failures.push(`unexpected sprint schema ${sprint?.schema ?? 'missing'}`);
if (inbox?.schema !== 'water9/source-inbox-review@1') failures.push(`unexpected inbox schema ${inbox?.schema ?? 'missing'}`);
if (trace?.schema !== 'water9/research-source-trace@1') failures.push(`unexpected trace schema ${trace?.schema ?? 'missing'}`);

const candidates = Array.isArray(runway?.candidates) ? runway.candidates : [];
const sprintIds = Array.isArray(sprint?.ids) ? sprint.ids : [];
const inboxById = new Map((inbox?.candidates ?? []).map((candidate) => [candidate.id, candidate]));
const traceById = new Map((trace?.records ?? []).map((record) => [record.id, record]));

if ((runway?.summary?.sprint ?? 0) !== sprintIds.length) failures.push('runway sprint summary does not match sprint ids');
if (candidates.length !== sprintIds.length) failures.push('runway candidate count does not match sprint ids');
if ((runway?.summary?.inboxReady ?? 0) !== candidates.filter((candidate) => candidate.inboxReady).length) failures.push('runway inboxReady summary mismatch');
if ((runway?.summary?.inboxMissing ?? 0) !== candidates.filter((candidate) => !candidate.inboxHasImage).length) failures.push('runway inboxMissing summary mismatch');
if ((runway?.summary?.promptsWithAuditHardening ?? 0) !== candidates.filter((candidate) => candidate.promptHasAuditHardening).length) failures.push('runway prompt hardening summary mismatch');

for (const id of sprintIds) {
  const candidate = candidates.find((item) => item.id === id);
  if (!candidate) {
    failures.push(`${id}: missing from source intake runway`);
    continue;
  }
  if (!inboxById.has(id)) failures.push(`${id}: runway candidate is missing from inbox review`);
  if (!traceById.has(id)) failures.push(`${id}: runway candidate is missing from research source trace`);
  if (!candidate.promptFile) failures.push(`${id}: runway candidate missing promptFile`);
  if (!candidate.contract) failures.push(`${id}: runway candidate missing contract`);
  if (!candidate.inboxTarget?.startsWith(sprint.inboxDir ?? 'tools/source-inbox')) failures.push(`${id}: inbox target does not live under sprint inbox dir`);
  if (!candidate.queueHasAuditGuidance) failures.push(`${id}: queued source candidate is missing audit guidance`);
  if (!candidate.promptHasAuditHardening) failures.push(`${id}: prompt is missing audit hardening`);
  const requiredCommandKeys = candidate.captureFirst
    ? ['mark', 'status', 'capture', 'recoveryScout', 'recoverFile', 'recoverDataUrl', 'recoverBase64', 'checkOne', 'ingestOneDryRun', 'ingestOne', 'previewCheck', 'sourceGallery', 'sourceCheck', 'acceptanceDryRun']
    : ['mark', 'status', 'autoIngest', 'capture', 'recoveryScout', 'recoverInline', 'recoverFile', 'recoverDataUrl', 'recoverBase64', 'checkOne', 'ingestOneDryRun', 'ingestOne', 'previewCheck', 'sourceGallery', 'sourceCheck', 'acceptanceDryRun'];
  for (const key of requiredCommandKeys) {
    if (!candidate.commands?.[key]) failures.push(`${id}: missing command ${key}`);
  }
  if (candidate.captureFirst && candidate.commands?.autoIngest) failures.push(`${id}: capture-first runway must not advertise autoIngest`);
  if (candidate.captureFirst && candidate.commands?.recoverInline) failures.push(`${id}: capture-first runway must not advertise generic recoverInline scan`);
  if (candidate.captureFirst && !candidate.commands?.ingestOneDryRun?.includes('source:ingest-current')) failures.push(`${id}: capture-first runway dry run must use source:ingest-current`);
  if (candidate.captureFirst && !candidate.commands?.ingestOne?.includes('source:ingest-current')) failures.push(`${id}: capture-first runway ingest must use source:ingest-current`);
  if (candidate.commands?.capture && !candidate.commands.capture.includes('--open')) failures.push(`${id}: capture command must open the capture page`);
  if (!markdown.includes(id)) failures.push(`markdown missing ${id}`);
  if (!html.includes(id)) failures.push(`html missing ${id}`);
  if (!html.includes(candidate.inboxTarget)) failures.push(`html missing inbox target for ${id}`);
}

for (const command of Object.values(runway?.commands ?? {})) {
  if (!command) continue;
  if (!markdown.includes(command)) failures.push(`markdown missing command: ${command}`);
  if (!html.includes(command)) failures.push(`html missing command: ${command}`);
}
const requiredContent = [
  'Source Intake Runway',
  'npm run source:sprint:preview',
  'npm run source:inbox-capture',
  'npm run source:imagegen-health',
  'npm run source:preview-check',
  'npm run source:check',
  'npm run source:gallery',
];
if (candidates.length) {
  requiredContent.push(
    'npm run source:accept -- --id',
    '--source-reviewed --dry-run',
  );
}
for (const required of requiredContent) {
  if (!markdown.includes(required)) failures.push(`markdown missing required content: ${required}`);
  if (!html.includes(required)) failures.push(`html missing required content: ${required}`);
}

const summary = {
  runway: paths.runway,
  markdown: paths.markdown,
  html: paths.html,
  candidates: candidates.length,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

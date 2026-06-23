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
  readiness: resolve(String(args.get('readiness') ?? 'public/review/source-candidates/source-ingest-readiness.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/source-candidates/source-ingest-readiness.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-ingest-readiness.html')),
  runbook: resolve(String(args.get('runbook') ?? 'public/review/source-candidates/source-acquisition-runbook.json')),
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

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function textIncludesHtml(text, value) {
  return text.includes(value) || text.includes(htmlEscape(value));
}

const readiness = await readJson('source ingest readiness', paths.readiness);
const runbook = await readJson('source acquisition runbook', paths.runbook);
const markdown = await readText('source ingest readiness markdown', paths.markdown);
const html = await readText('source ingest readiness html', paths.html);
const runbookIdsForSize = Array.isArray(runbook?.ids) ? runbook.ids : [];
await fileOk('source ingest readiness markdown', paths.markdown, runbookIdsForSize.length ? 1024 : 512);
await fileOk('source ingest readiness html', paths.html, runbookIdsForSize.length ? 2048 : 1024);

if (readiness?.schema !== 'water9/source-ingest-readiness@1') failures.push(`readiness schema is ${readiness?.schema ?? 'missing'}`);
if (runbook?.schema !== 'water9/source-acquisition-runbook@1') failures.push(`runbook schema is ${runbook?.schema ?? 'missing'}`);
const ids = Array.isArray(readiness?.ids) ? readiness.ids : [];
const runbookIds = Array.isArray(runbook?.ids) ? runbook.ids : [];
if (runbookIds.length && !ids.length) failures.push('readiness ids are missing');
if (ids.join(',') !== runbookIds.join(',')) failures.push('readiness ids do not match acquisition runbook ids');
const candidates = Array.isArray(readiness?.candidates) ? readiness.candidates : [];
if (candidates.length !== ids.length) failures.push('readiness candidate count does not match ids');
const computedSummary = {
  ready: candidates.filter((item) => item.status === 'ready').length,
  missing: candidates.filter((item) => item.status === 'missing').length,
  blocked: candidates.filter((item) => item.status === 'blocked').length,
};
for (const key of Object.keys(computedSummary)) {
  if (readiness?.summary?.[key] !== computedSummary[key]) failures.push(`summary.${key} mismatch`);
}
if (readiness?.batchReady !== (computedSummary.ready === candidates.length && candidates.length > 0)) {
  failures.push('batchReady does not match candidate statuses');
}
for (const required of [
  'Water 9 Source Ingest Readiness',
  'Batch Commands',
  'Targets',
  'npm run source:inbox-check',
  'npm run source:advance-inbox',
  'npm run source:ingest-batch',
  'npm run source:image-check',
  'npm run source:preview-check',
]) {
  if (!markdown.includes(required)) failures.push(`markdown missing ${required}`);
  if (!textIncludesHtml(html, required)) failures.push(`html missing ${required}`);
}
for (const id of ids) {
  const item = candidates.find((candidate) => candidate.id === id);
  if (!item) {
    failures.push(`${id}: missing readiness candidate`);
    continue;
  }
  if (!['ready', 'missing', 'blocked'].includes(item.status)) failures.push(`${id}: invalid status ${item.status}`);
  if (!Array.isArray(item.expectedFiles) || !item.expectedFiles.includes(`${readiness.inboxDir}/${id}.png`)) {
    failures.push(`${id}: missing primary expected file`);
  }
  if (!item.expectedFiles?.includes(`${readiness.inboxDir}/fauna-${id}-whole-source.png`)) {
    failures.push(`${id}: missing alternate expected file`);
  }
  if (!String(item.nextCommand ?? '').includes(id)) failures.push(`${id}: nextCommand must be target-aware`);
  for (const expectedCommand of [
    `npm run source:inbox-capture -- --id ${id} --open`,
    `npm run source:inbox-check -- --dir ${readiness.inboxDir} --strict --ids ${id}`,
    `npm run source:ingest-batch -- --dir ${readiness.inboxDir} --strict --ids ${id} --dry-run`,
    `npm run source:ingest-batch -- --dir ${readiness.inboxDir} --strict --ids ${id}`,
    `npm run sandbox:preview -- --id ${id} --kind source --serve --open --visual`,
  ]) {
    if (!Object.values(item.commands ?? []).includes(expectedCommand)) failures.push(`${id}: missing command ${expectedCommand}`);
    if (!markdown.includes(expectedCommand)) failures.push(`${id}: markdown missing command ${expectedCommand}`);
    if (!textIncludesHtml(html, expectedCommand)) failures.push(`${id}: html missing command ${expectedCommand}`);
  }
}

const summary = {
  schema: 'water9/source-ingest-readiness-check@1',
  ids,
  batchReady: readiness?.batchReady ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

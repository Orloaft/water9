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
  runbook: resolve(String(args.get('runbook') ?? 'public/review/source-candidates/source-acquisition-runbook.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/source-candidates/source-acquisition-runbook.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-acquisition-runbook.html')),
  sprint: resolve(String(args.get('sprint') ?? 'public/review/source-candidates/source-generation-sprint.json')),
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

const runbook = await readJson('source acquisition runbook', paths.runbook);
const sprint = await readJson('source generation sprint', paths.sprint);
const markdown = await readText('source acquisition runbook markdown', paths.markdown);
const html = await readText('source acquisition runbook html', paths.html);
await fileOk('source acquisition runbook markdown', paths.markdown, 1024);
await fileOk('source acquisition runbook html', paths.html, 2048);

if (runbook?.schema !== 'water9/source-acquisition-runbook@1') failures.push(`runbook schema is ${runbook?.schema ?? 'missing'}`);
if (sprint?.schema !== 'water9/source-generation-sprint@1') failures.push(`sprint schema is ${sprint?.schema ?? 'missing'}`);
const ids = Array.isArray(runbook?.ids) ? runbook.ids : [];
const sprintIds = Array.isArray(sprint?.ids) ? sprint.ids : [];
if (sprintIds.length && !ids.length) failures.push('runbook ids are missing');
if (ids.join(',') !== sprintIds.join(',')) failures.push(`runbook ids ${ids.join(',')} do not match sprint ids ${sprintIds.join(',')}`);
const candidates = Array.isArray(runbook?.candidates) ? runbook.candidates : [];
if (candidates.length !== ids.length) failures.push('runbook candidate count does not match ids');

for (const expected of [
  'Water 9 Source Acquisition Runbook',
  'Batch Procedure',
  'Batch Commands',
  'Acquisition Targets',
  'npm run source:imagegen-health',
  'npm run source:recovery-scout',
  'npm run source:inbox-check',
  'npm run source:ingest-batch',
  'npm run source:image-check',
  'npm run source:preview-check',
  'npm run source:review-dossier',
  'npm run content:goal-readiness',
]) {
  if (!markdown.includes(expected)) failures.push(`markdown missing ${expected}`);
  if (!textIncludesHtml(html, expected)) failures.push(`html missing ${expected}`);
}

const batchCommandText = Object.values(runbook?.batchCommands ?? {}).filter(Boolean).join('\n');
for (const expected of [
  'source:sprint',
  'source:inbox-review',
  'source:imagegen-health',
  'source:recovery-scout',
  'source:recovery-scout-check',
  'source:inbox-capture -- --ids',
  'source:generate-openai',
  'source:generate-openai-batch',
  'source:advance-inbox',
  'source:inbox-check',
  'source:ingest-batch',
  '--dry-run',
  'source:image-check',
  'source:preview-check',
  'source:review-dossier',
  'content:goal-readiness',
]) {
  if (!batchCommandText.includes(expected)) failures.push(`batch commands missing ${expected}`);
}
if (!String(runbook?.batchCommands?.batchCapture ?? '').includes('--open')) {
  failures.push('batchCapture command must open the capture page');
}

for (const id of ids) {
  const item = candidates.find((candidate) => candidate.id === id);
  const sprintCard = (sprint?.candidates ?? []).find((candidate) => candidate.id === id);
  if (!item) {
    failures.push(`${id}: missing runbook candidate`);
    continue;
  }
  if (item.captureFirst !== Boolean(sprintCard?.captureFirst)) failures.push(`${id}: captureFirst does not match sprint`);
  if (!Array.isArray(item.expectedInboxFiles) || !item.expectedInboxFiles.includes(`${runbook.inboxDir}/${id}.png`)) {
    failures.push(`${id}: missing primary expected inbox file`);
  }
  if (!item.expectedInboxFiles?.includes(`${runbook.inboxDir}/fauna-${id}-whole-source.png`)) {
    failures.push(`${id}: missing alternate expected inbox file`);
  }
  if (item.captureUrl !== `http://127.0.0.1:5188/?id=${encodeURIComponent(id)}`) failures.push(`${id}: captureUrl is not target-aware`);
  const expectedCommands = [
    ['printPrompt', `--id ${id}`],
    ['startSession', `--id ${id}`],
    ['captureInbox', `--id ${id}`],
    ['generateOpenAI', `--id ${id}`],
    ['generateOpenAIDryRun', `--id ${id}`],
    ['recoverSavedFile', `--id ${id}`],
    ['recoverDataUrl', `--id ${id}`],
    ['recoverBase64', `--id ${id}`],
    ['recoveryScout', `--id ${id}`],
    ['inboxCheck', `--ids ${id}`],
    ['ingestDryRun', `--id ${id}`],
    ['ingest', `--id ${id}`],
    ['sourcePreview', `--id ${id}`],
  ];
  if (!item.captureFirst) expectedCommands.splice(5, 0, ['recoverInline', `--id ${id}`]);
  for (const [key, expectedFragment] of expectedCommands) {
    const command = item.commands?.[key];
    if (!command) {
      failures.push(`${id}: missing command ${key}`);
      continue;
    }
    if (!command.includes(expectedFragment)) failures.push(`${id}: command ${key} missing ${expectedFragment}`);
    if ((key === 'ingestDryRun' || key === 'ingest') && !command.includes('source:ingest-current')) {
      failures.push(`${id}: command ${key} must use source:ingest-current for single-target capture`);
    }
    if (key === 'captureInbox' && !command.includes('--open')) failures.push(`${id}: captureInbox command must open the capture page`);
    if (!markdown.includes(command)) failures.push(`${id}: markdown missing command ${key}`);
    if (!textIncludesHtml(html, command)) failures.push(`${id}: html missing command ${key}`);
  }
  if (item.captureFirst && item.commands?.recoverInline) failures.push(`${id}: capture-first runbook must not advertise generic recoverInline`);
  if (!String(item.commands?.sourcePreview ?? '').includes('--kind source')) failures.push(`${id}: sourcePreview command must use source kind`);
  for (const expected of [
    id,
    item.species,
    item.captureUrl,
    `${runbook.inboxDir}/${id}.png`,
    `${runbook.inboxDir}/fauna-${id}-whole-source.png`,
  ]) {
    if (expected && !markdown.includes(expected)) failures.push(`${id}: markdown missing ${expected}`);
    if (expected && !textIncludesHtml(html, expected)) failures.push(`${id}: html missing ${expected}`);
  }
}

const summary = {
  schema: 'water9/source-acquisition-runbook-check@1',
  ids,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

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
  json: resolve(String(args.get('json') ?? 'tools/source-inbox/source-inbox-handoff.json')),
  markdown: resolve(String(args.get('markdown') ?? 'tools/source-inbox/HANDOFF.md')),
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

function expectIncludes(owner, text, expected) {
  if (!String(text ?? '').includes(expected)) failures.push(`${owner}: missing ${expected}`);
}

const handoff = await readJson('source inbox handoff', paths.json);
const sprint = await readJson('source generation sprint', paths.sprint);
const markdown = await readText('source inbox handoff markdown', paths.markdown);
await fileOk('source inbox handoff json', paths.json, 512);
await fileOk('source inbox handoff markdown', paths.markdown, 2048);

if (handoff?.schema !== 'water9/source-inbox-handoff@1') failures.push(`handoff schema is ${handoff?.schema ?? 'missing'}`);
if (sprint?.schema !== 'water9/source-generation-sprint@1') failures.push(`sprint schema is ${sprint?.schema ?? 'missing'}`);
if (handoff?.scope !== 'active-sprint') failures.push(`handoff default scope must be active-sprint, got ${handoff?.scope ?? 'missing'}`);

const scopeIds = Array.isArray(handoff?.scopeIds) ? handoff.scopeIds : [];
const sprintIds = Array.isArray(sprint?.ids) ? sprint.ids : [];
const scopeIdList = scopeIds.join(',');
if (sprintIds.length && !scopeIds.length) failures.push('handoff scopeIds are missing');
if (scopeIdList !== sprintIds.join(',')) failures.push(`handoff scope ids ${scopeIdList} do not match sprint ids ${sprintIds.join(',')}`);

const candidates = Array.isArray(handoff?.candidates) ? handoff.candidates : [];
if (candidates.length !== scopeIds.length) failures.push('handoff candidate count does not match scopeIds');
if (candidates.map((candidate) => candidate.id).join(',') !== scopeIdList) failures.push('handoff candidate order does not match scopeIds');

const expectedMarkdown = [
  '# Source Inbox Handoff',
  'Scope: `active-sprint`',
  `Scoped ids: \`${scopeIdList}\``,
  'Inbox files outside this handoff scope',
  'Inbox ingest is not source approval',
  'After ingest: inspect the source approval runway and visual board',
  'npm run source:approval-runway',
  'npm run source:visual-board',
  'npm run source:approval-runway:preview',
];
if (scopeIds.length) {
  expectedMarkdown.push(
    `npm run source:inbox-check -- --dir ${handoff?.inboxDir} --strict --ids ${scopeIdList}`,
    `npm run source:ingest-batch -- --dir ${handoff?.inboxDir} --strict --ids ${scopeIdList} --dry-run`,
    `npm run source:ingest-batch -- --dir ${handoff?.inboxDir} --strict --ids ${scopeIdList}`,
  );
} else {
  expectedMarkdown.push('Candidates in this handoff: `0`');
}
for (const expected of expectedMarkdown) {
  if (expected.includes('undefined')) continue;
  expectIncludes('markdown', markdown, expected);
}
if (markdown.includes(`npm run source:inbox-check -- --dir ${handoff?.inboxDir} --strict\n`)) {
  failures.push('markdown must not advertise unscoped strict inbox-check');
}
if (markdown.includes(`npm run source:ingest-batch -- --dir ${handoff?.inboxDir} --strict --dry-run`)) {
  failures.push('markdown must not advertise unscoped strict batch dry run');
}
if (markdown.includes(`npm run source:ingest-batch -- --dir ${handoff?.inboxDir} --strict\n`)) {
  failures.push('markdown must not advertise unscoped strict batch ingest');
}

for (const id of scopeIds) {
  const item = candidates.find((candidate) => candidate.id === id);
  if (!item) {
    failures.push(`${id}: missing from handoff candidates`);
    continue;
  }
  for (const expectedFile of [
    `${handoff.inboxDir}/${id}.png`,
    `${handoff.inboxDir}/fauna-${id}-whole-source.png`,
  ]) {
    if (![item.inboxFile, item.alternateInboxFile].includes(expectedFile)) failures.push(`${id}: missing inbox file ${expectedFile}`);
    expectIncludes(`${id} markdown`, markdown, expectedFile);
  }
  for (const expected of [
    `npm run source:inbox-check -- --dir ${handoff.inboxDir} --strict --ids ${id}`,
    `npm run source:ingest-current -- --id ${id} --dry-run`,
    `npm run source:ingest-current -- --id ${id} --apply`,
    `npm run sandbox:preview -- --id ${id} --kind source --serve --open --visual`,
    `npm run source:inbox-check -- --dir ${handoff.inboxDir} --strict --ids ${scopeIdList}`,
    `npm run source:ingest-batch -- --dir ${handoff.inboxDir} --strict --ids ${scopeIdList} --dry-run`,
    `npm run source:ingest-batch -- --dir ${handoff.inboxDir} --strict --ids ${scopeIdList}`,
    'npm run source:approval-runway',
    'npm run source:visual-board',
    'npm run source:approval-runway:preview',
  ]) {
    if (!Object.values(item.commands ?? {}).includes(expected)) failures.push(`${id}: commands missing ${expected}`);
    expectIncludes(`${id} markdown`, markdown, expected);
  }
}

const ignored = Array.isArray(handoff?.ignoredInboxImages) ? handoff.ignoredInboxImages : [];
for (const image of ignored) {
  if (image.inScope !== false) failures.push(`${image.path}: ignored inbox image must be out of scope`);
  if (!markdown.includes(image.path)) failures.push(`${image.path}: markdown must list ignored inbox image`);
}

const summary = {
  schema: 'water9/source-inbox-handoff-check@1',
  scope: handoff?.scope ?? null,
  scopeIds,
  ignoredInboxImages: ignored.length,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

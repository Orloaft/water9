import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const queuePath = resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json'));
const sprintPath = resolve(String(args.get('sprint') ?? 'public/review/source-candidates/source-generation-sprint.json'));
const contractIndexPath = resolve(String(args.get('contracts') ?? 'public/review/source-candidates/art-contracts.md'));
const inboxDir = String(args.get('dir') ?? args.get('inbox-dir') ?? 'tools/source-inbox');
const outPath = resolve(String(args.get('out') ?? `${inboxDir}/HANDOFF.md`));
const jsonOutPath = resolve(String(args.get('json-out') ?? `${inboxDir}/source-inbox-handoff.json`));
const limit = Number(args.get('limit') ?? 0);
const all = args.has('all');
const explicitIds = String(args.get('ids') ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'candidate';
}

function asRepoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

function inboxFile(candidate, extension = 'png') {
  return `${inboxDir}/${candidate.id}.${extension}`;
}

function alternateInboxFile(candidate, extension = 'png') {
  return `${inboxDir}/fauna-${candidate.id}-whole-source.${extension}`;
}

function shellIds(ids) {
  return ids.join(',');
}

function candidateIdsForFile(file) {
  const extension = extname(file).toLowerCase();
  if (!allowedExtensions.has(extension)) return [];
  const stem = file.slice(0, -extension.length);
  const ids = [stem];
  const match = stem.match(/^fauna-(.+)-whole-source$/);
  if (match) ids.push(match[1]);
  return [...new Set(ids)];
}

async function inboxImagesForScope(ids) {
  const scoped = new Set(ids);
  const images = [];
  let entries = [];
  try {
    entries = await readdir(resolve(inboxDir), { withFileTypes: true });
  } catch {
    return images;
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const possibleIds = candidateIdsForFile(entry.name);
    if (!possibleIds.length) continue;
    const path = resolve(inboxDir, entry.name);
    const info = await stat(path).catch(() => null);
    images.push({
      file: entry.name,
      path: asRepoRelative(path),
      candidateIds: possibleIds,
      inScope: possibleIds.some((id) => scoped.has(id)),
      bytes: info?.size ?? 0,
      mtime: info?.mtime?.toISOString?.() ?? null,
    });
  }
  return images.sort((left, right) => left.file.localeCompare(right.file));
}

function markdownList(items) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- None recorded.';
}

function packetFor(item, scopedIds) {
  const contract = `public/review/source-candidates/art-contracts/${safeFileName(item.id)}.md`;
  const idList = shellIds(scopedIds);
  return {
    rank: item.rank,
    id: item.id,
    species: item.species,
    status: item.status,
    inboxFile: inboxFile(item),
    alternateInboxFile: alternateInboxFile(item),
    expectedOutput: item.expectedOutput,
    contract,
    promptFile: item.promptFile,
    gameplayVerb: item.gameplayVerb ?? null,
    requiredRead: item.requiredRead ?? [],
    promptRisks: item.promptRisks ?? [],
    commands: {
      reviewContract: `sed -n '1,220p' ${contract}`,
      validateOne: `npm run source:inbox-check -- --dir ${inboxDir} --strict --ids ${item.id}`,
      dryRunOne: `npm run source:ingest-current -- --id ${item.id} --dry-run`,
      ingestOne: `npm run source:ingest-current -- --id ${item.id} --apply`,
      previewOne: `npm run sandbox:preview -- --id ${item.id} --kind source --serve --open --visual`,
      validateInbox: `npm run source:inbox-check -- --dir ${inboxDir} --strict --ids ${idList}`,
      dryRunBatchIngest: `npm run source:ingest-batch -- --dir ${inboxDir} --strict --ids ${idList} --dry-run`,
      batchIngest: `npm run source:ingest-batch -- --dir ${inboxDir} --strict --ids ${idList}`,
      validateSources: 'npm run source:check',
      buildGallery: 'npm run source:gallery',
      buildApprovalRunway: 'npm run source:approval-runway',
      buildVisualBoard: 'npm run source:visual-board',
      openApprovalRunway: 'npm run source:approval-runway:preview',
      rejectBadOutput: `npm run source:reject-attempt -- --id ${item.id} --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"`,
    },
  };
}

function markdownFor(report) {
  const { packets, queue, scopeIds, scope, inboxImages } = report;
  const scopedIdList = shellIds(scopeIds);
  const outsideScope = inboxImages.filter((image) => !image.inScope);
  const lines = [
    '# Source Inbox Handoff',
    '',
    `Queue: \`${asRepoRelative(queuePath)}\``,
    `Sprint: \`${asRepoRelative(sprintPath)}\``,
    `Contract index: \`${asRepoRelative(contractIndexPath)}\``,
    `Inbox: \`${inboxDir}\``,
    `Scope: \`${scope}\``,
    `Scoped ids: \`${scopedIdList}\``,
    `Candidates in this handoff: \`${packets.length}\``,
    '',
    'Purpose: generated source art must land as a real project-readable image before extraction, rigging, or acceptance. Review the contract first, generate one whole creature on a flat `#ff00ff` background, then place the selected image output in the exact inbox filename below. Inbox ingest is not source approval; it resets candidates to human-review state before `source:accept` can be used.',
    '',
    'Batch validation loop:',
    '',
    '```bash',
    `npm run source:inbox-check -- --dir ${inboxDir} --strict --ids ${scopedIdList}`,
    `npm run source:ingest-batch -- --dir ${inboxDir} --strict --ids ${scopedIdList} --dry-run`,
    `npm run source:ingest-batch -- --dir ${inboxDir} --strict --ids ${scopedIdList}`,
    'npm run source:check',
    'npm run source:gallery',
    'npm run source:approval-runway',
    'npm run source:visual-board',
    'npm run source:approval-runway:preview',
    '```',
    '',
    'After ingest: inspect the source approval runway and visual board before any `source:accept` approval command. Do not treat an inbox-selected image as approved content.',
    '',
    'Inbox files outside this handoff scope:',
    '',
    markdownList(outsideScope.map((image) => `\`${image.path}\` maps to \`${image.candidateIds.join(',')}\`; ignored by scoped batch commands.`)),
    '',
    '| Rank | Candidate | Contract | Inbox filename | Expected project output |',
    '| ---: | --- | --- | --- | --- |',
  ];

  for (const packet of packets) {
    lines.push(`| ${packet.rank} | \`${packet.id}\` ${packet.species} | [contract](${packet.contract}) | \`${packet.inboxFile}\` | \`${packet.expectedOutput}\` |`);
  }
  lines.push('');

  for (const packet of packets) {
    lines.push(`## ${packet.rank}. ${packet.species} (${packet.id})`);
    lines.push('');
    lines.push(`Contract: \`${packet.contract}\``);
    lines.push(`Prompt file: \`${packet.promptFile}\``);
    lines.push(`Required inbox filename: \`${packet.inboxFile}\``);
    lines.push(`Alternate accepted filename: \`${packet.alternateInboxFile}\``);
    lines.push(`Expected project output: \`${packet.expectedOutput}\``);
    lines.push('');
    lines.push('Gameplay read:');
    lines.push(packet.gameplayVerb ?? 'Not recorded.');
    lines.push('');
    lines.push('Required read:');
    lines.push(markdownList(packet.requiredRead));
    lines.push('');
    lines.push('Reject if:');
    lines.push(markdownList(packet.promptRisks));
    lines.push('');
    lines.push('Commands:');
    lines.push('```bash');
    lines.push(packet.commands.reviewContract);
    lines.push(packet.commands.validateOne);
    lines.push(packet.commands.dryRunOne);
    lines.push(packet.commands.ingestOne);
    lines.push(packet.commands.previewOne);
    lines.push('# scoped batch commands:');
    lines.push(packet.commands.validateInbox);
    lines.push(packet.commands.dryRunBatchIngest);
    lines.push(packet.commands.batchIngest);
    lines.push(packet.commands.validateSources);
    lines.push(packet.commands.buildGallery);
    lines.push('# post-ingest human source review:');
    lines.push(packet.commands.buildApprovalRunway);
    lines.push(packet.commands.buildVisualBoard);
    lines.push(packet.commands.openApprovalRunway);
    lines.push('# if the output fails visual review:');
    lines.push(packet.commands.rejectBadOutput);
    lines.push('```');
    lines.push('');
  }

  lines.push('## Queue Summary');
  lines.push('');
  lines.push(`- Schema: \`${queue.schema ?? 'missing'}\``);
  lines.push(`- Total queued candidates: \`${Array.isArray(queue.candidates) ? queue.candidates.length : 0}\``);
  lines.push(`- Handoff candidates listed: \`${packets.length}\``);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

const queue = await readJson(queuePath);
if (queue.schema !== 'water9/source-generation-queue@1') {
  throw new Error(`Unexpected source generation queue schema ${queue.schema ?? 'missing'}`);
}
const sprint = await readJson(sprintPath).catch(() => null);
if (!all && !explicitIds.length && sprint?.schema !== 'water9/source-generation-sprint@1') {
  throw new Error(`Unexpected source generation sprint schema ${sprint?.schema ?? 'missing'}`);
}

let candidates = Array.isArray(queue.candidates) ? queue.candidates : [];
let scope = 'active-sprint';
let scopeIds = explicitIds.length
  ? explicitIds
  : all
    ? candidates.map((candidate) => candidate.id)
    : Array.isArray(sprint?.ids) ? sprint.ids : [];
if (explicitIds.length) scope = 'explicit-ids';
else if (all) scope = 'all-queued';
const scopeSet = new Set(scopeIds);
if (scopeSet.size) candidates = candidates.filter((candidate) => scopeSet.has(candidate.id));
if (limit > 0) candidates = candidates.slice(0, limit);
scopeIds = candidates.map((candidate) => candidate.id);

const failures = [];
for (const candidate of candidates) {
  if (!candidate.id) failures.push('candidate missing id');
  if (!candidate.species) failures.push(`${candidate.id}: missing species`);
  if (!candidate.promptFile) failures.push(`${candidate.id}: missing promptFile`);
  if (!candidate.expectedOutput) failures.push(`${candidate.id}: missing expectedOutput`);
  if (!Array.isArray(candidate.requiredRead) || candidate.requiredRead.length < 3) failures.push(`${candidate.id}: needs at least 3 requiredRead entries`);
}
if (failures.length) {
  console.error(JSON.stringify({ queue: queuePath, failures }, null, 2));
  process.exit(1);
}

const packets = candidates.map((candidate) => packetFor(candidate, scopeIds));
const inboxImages = await inboxImagesForScope(scopeIds);
const report = {
  schema: 'water9/source-inbox-handoff@1',
  generatedFrom: asRepoRelative(queuePath),
  sprint: sprint ? asRepoRelative(sprintPath) : null,
  contractIndex: asRepoRelative(contractIndexPath),
  inboxDir,
  scope,
  scopeIds,
  inboxImages,
  ignoredInboxImages: inboxImages.filter((image) => !image.inScope),
  candidates: packets,
};
await mkdir(dirname(outPath), { recursive: true });
await mkdir(dirname(jsonOutPath), { recursive: true });
await writeFile(outPath, markdownFor({ ...report, packets, queue }));
await writeFile(jsonOutPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  schema: 'water9/source-inbox-handoff@1',
  outPath,
  jsonOutPath,
  inboxDir,
  scope,
  scopeIds,
  candidates: packets.length,
  ignoredInboxImages: report.ignoredInboxImages.length,
  top: packets.slice(0, 3).map((packet) => ({ id: packet.id, species: packet.species, inboxFile: packet.inboxFile, contract: packet.contract })),
  failures: [],
}, null, 2));

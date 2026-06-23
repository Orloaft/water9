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
  runway: resolve(String(args.get('json') ?? 'public/review/source-candidates/source-replace-runway.json')),
  markdown: resolve(String(args.get('md') ?? 'public/review/source-candidates/source-replace-runway.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-replace-runway.html')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  approvalRunway: resolve(String(args.get('approval-runway') ?? 'public/review/source-approval-runway.json')),
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

const runway = await readJson('source replace runway', paths.runway);
const sourceCandidates = await readJson('source candidates', paths.sourceCandidates);
const approvalRunway = await readJson('source approval runway', paths.approvalRunway);
const markdown = await readText('source replace runway markdown', paths.markdown);
const html = await readText('source replace runway html', paths.html);
await fileOk('source replace runway json', paths.runway, 1024);
await fileOk('source replace runway markdown', paths.markdown, 1024);
await fileOk('source replace runway html', paths.html, 4096);

if (runway?.schema !== 'water9/source-replace-runway@1') failures.push(`runway schema is ${runway?.schema ?? 'missing'}`);
if (sourceCandidates?.schema !== 'water9/source-candidates@1') failures.push(`source candidate schema is ${sourceCandidates?.schema ?? 'missing'}`);
if (approvalRunway?.schema !== 'water9/source-approval-runway@1') failures.push(`source approval runway schema is ${approvalRunway?.schema ?? 'missing'}`);

const items = Array.isArray(runway?.items) ? runway.items : [];
const candidates = Array.isArray(sourceCandidates?.candidates) ? sourceCandidates.candidates : [];
const approvalItems = Array.isArray(approvalRunway?.items) ? approvalRunway.items : [];
const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
const approvalById = new Map(approvalItems.map((item) => [item.id, item]));
const ids = items.map((item) => item.id).filter(Boolean);

if (items.length !== candidates.length) failures.push('replace runway item count does not match source candidates');
if (new Set(ids).size !== ids.length) failures.push('replace runway contains duplicate ids');
if ((runway?.summary?.candidates ?? -1) !== items.length) failures.push('summary candidates mismatch');
if ((runway?.summary?.sourcePresent ?? -1) !== items.filter((item) => item.sourcePresent).length) failures.push('summary sourcePresent mismatch');
if ((runway?.summary?.replaceable ?? -1) !== items.filter((item) => item.replaceable).length) failures.push('summary replaceable mismatch');
if ((runway?.summary?.humanApproved ?? -1) !== items.filter((item) => item.humanApproved).length) failures.push('summary humanApproved mismatch');
if ((runway?.summary?.promptFiles ?? -1) !== items.length) failures.push('summary promptFiles mismatch');
if (runway?.recommended && !items.some((item) => item.id === runway.recommended.id && item.replaceable)) failures.push('recommended replacement candidate must be replaceable');
if (!Array.isArray(runway?.replacementRules) || runway.replacementRules.length < 4) failures.push('replacement rules are missing or weak');

for (const item of items) {
  const candidate = candidateById.get(item.id);
  const approval = approvalById.get(item.id);
  if (!candidate) failures.push(`${item.id}: missing matching source candidate`);
  if (!approval) failures.push(`${item.id}: missing matching approval runway item`);
  if (item.species !== candidate?.species) failures.push(`${item.id}: species mismatch`);
  if (item.sourcePresent !== Boolean(candidate?.source)) failures.push(`${item.id}: sourcePresent mismatch`);
  const expectedHumanApproved = candidate?.status === 'approved' || candidate?.review?.status === 'approved' || approval?.humanApproved === true;
  if (item.humanApproved !== expectedHumanApproved) failures.push(`${item.id}: humanApproved mismatch`);
  if (item.replaceable !== (Boolean(candidate?.source) && !expectedHumanApproved)) failures.push(`${item.id}: replaceable mismatch`);
  if (item.existingSource !== (candidate?.source ?? null)) failures.push(`${item.id}: existingSource mismatch`);
  if (!String(item.prompt ?? '').includes('Replacement source target')) failures.push(`${item.id}: prompt missing replacement target`);
  if (!String(item.prompt ?? '').includes('pure #ff00ff')) failures.push(`${item.id}: prompt missing magenta key requirement`);
  if (!String(item.prompt ?? '').includes('Replacement rules')) failures.push(`${item.id}: prompt missing replacement rules`);
  if (!String(item.promptFile ?? '').startsWith('public/review/source-candidates/replace-runway-prompts/')) failures.push(`${item.id}: prompt file must be under replace runway prompts`);
  await fileOk(`${item.id}: prompt file`, resolve(item.promptFile ?? ''), 512);
  const commands = item.commands ?? {};
  const requiredCommands = [
    `npm run source:inbox-capture -- --id ${item.id} --open`,
    `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${item.id}`,
    `npm run source:ingest -- --id ${item.id} --image tools/source-inbox/${item.id}.png --copy --overwrite --dry-run`,
    `npm run source:ingest -- --id ${item.id} --image tools/source-inbox/${item.id}.png --copy --overwrite`,
    `npm run source:image-check -- --id ${item.id}`,
    `npm run sandbox:preview -- --id source-${item.id} --with diver --serve --open --visual`,
  ];
  for (const expected of requiredCommands) {
    if (!Object.values(commands).some((command) => String(command).includes(expected))) failures.push(`${item.id}: missing command ${expected}`);
    if (!includesHtml(html, expected)) failures.push(`${item.id}: html missing command ${expected}`);
  }
  if (!String(commands.dryRunReplace ?? '').includes('--overwrite --dry-run')) failures.push(`${item.id}: dry-run replacement must include --overwrite --dry-run`);
  if (!String(commands.applyReplace ?? '').includes('--overwrite')) failures.push(`${item.id}: apply replacement must include --overwrite`);
  if (String(commands.applyReplace ?? '').includes('--dry-run')) failures.push(`${item.id}: apply replacement command must not include --dry-run`);
  if (!String(commands.rebuildEvidence ?? '').includes('source:approval-runway')) failures.push(`${item.id}: rebuild evidence missing approval runway`);
  if (!String(commands.rebuildEvidence ?? '').includes('source:visual-board')) failures.push(`${item.id}: rebuild evidence missing visual board`);
  if (!String(commands.fullReviewLoop ?? '').includes(commands.dryRunReplace)) failures.push(`${item.id}: full loop missing dry-run replace`);
  if (!String(commands.fullReviewLoop ?? '').includes(commands.applyReplace)) failures.push(`${item.id}: full loop missing apply replace`);
  if (Object.values(commands).some((command) => String(command).includes('npm run source:accept'))) {
    failures.push(`${item.id}: replace runway must not render source acceptance commands`);
  }
  for (const expected of [
    item.id,
    item.species,
    item.promptFile,
    `data-source-replace-candidate="${item.id}"`,
    '/review/source-approval-runway.html',
    '/review/source-visual-board.html',
  ]) {
    if (!markdown.includes(item.id)) failures.push(`${item.id}: markdown missing id`);
    if (!includesHtml(html, expected)) failures.push(`${item.id}: html missing ${expected}`);
  }
}

for (const expected of [
  'Water 9 Source Replace Runway',
  'intentional overwrite',
  'rejects byte-identical no-op replacements',
  'does not approve source art',
  'Replacement Boundary',
  'Safe Replacement Loop',
  'source:ingest',
  '--overwrite',
  '--allow-identical-overwrite',
]) {
  if (!markdown.includes(expected)) failures.push(`markdown missing ${expected}`);
  if (!includesHtml(html, expected)) failures.push(`html missing ${expected}`);
}

const summary = {
  schema: 'water9/source-replace-runway-check@1',
  candidates: runway?.summary?.candidates ?? null,
  sourcePresent: runway?.summary?.sourcePresent ?? null,
  replaceable: runway?.summary?.replaceable ?? null,
  humanApproved: runway?.summary?.humanApproved ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

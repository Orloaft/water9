import { createHash } from 'node:crypto';
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
  board: resolve(String(args.get('json') ?? 'public/review/source-visual-board.json')),
  html: resolve(String(args.get('html') ?? 'public/review/source-visual-board.html')),
  markdown: resolve(String(args.get('md') ?? 'public/review/source-visual-board.md')),
  runway: resolve(String(args.get('runway') ?? 'public/review/source-approval-runway.json')),
  checklist: resolve(String(args.get('checklist') ?? 'public/review/source-approval-checklist.json')),
  planCoverage: resolve(String(args.get('plan-coverage') ?? 'public/review/content-plan-coverage.json')),
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

async function fileOk(label, path, minBytes = 512) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minBytes) failures.push(`${label}: missing or too small`);
  } catch {
    failures.push(`${label}: missing`);
  }
}

async function fileFingerprint(label, path) {
  try {
    const [info, buffer] = await Promise.all([stat(path), readFile(path)]);
    if (!info.isFile()) {
      failures.push(`${label}: not a file`);
      return null;
    }
    return {
      size: info.size,
      sha256: createHash('sha256').update(buffer).digest('hex'),
    };
  } catch {
    failures.push(`${label}: missing`);
    return null;
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
  return text.includes(String(value ?? '')) || text.includes(htmlEscape(value));
}

function pathForPublicUrl(url) {
  if (!url) return null;
  if (String(url).startsWith('/review/')) return resolve('public', String(url).slice(1));
  if (String(url).startsWith('/assets/')) return resolve('public', String(url).slice(1));
  if (String(url).startsWith('public/')) return resolve(String(url));
  return null;
}

const board = await readJson('source visual board', paths.board);
const runway = await readJson('source approval runway', paths.runway);
const checklist = await readJson('source approval checklist', paths.checklist);
const planCoverage = await readJson('content plan coverage', paths.planCoverage);
const html = await readText('source visual board html', paths.html);
const markdown = await readText('source visual board markdown', paths.markdown);
await fileOk('source visual board json', paths.board, 1024);
await fileOk('source visual board html', paths.html, 2048);
await fileOk('source visual board markdown', paths.markdown, 512);

if (board?.schema !== 'water9/source-visual-board@1') failures.push(`board schema is ${board?.schema ?? 'missing'}`);
if (runway?.schema !== 'water9/source-approval-runway@1') failures.push(`runway schema is ${runway?.schema ?? 'missing'}`);
if (checklist?.schema !== 'water9/source-approval-checklist@1') failures.push(`checklist schema is ${checklist?.schema ?? 'missing'}`);
if (planCoverage?.schema !== 'water9/content-plan-coverage@1') failures.push(`plan coverage schema is ${planCoverage?.schema ?? 'missing'}`);

const boardItems = Array.isArray(board?.items) ? board.items : [];
const runwayItems = Array.isArray(runway?.items) ? runway.items : [];
const checklistById = new Map((checklist?.items ?? []).map((item) => [item.id, item]));
const planById = new Map((planCoverage?.items ?? []).map((item) => [item.id, item]));
const boardIds = boardItems.map((item) => item.id).filter(Boolean);
const runwayIds = runwayItems.map((item) => item.id).filter(Boolean);
if (boardItems.length !== runwayItems.length) failures.push('board item count does not match runway');
if (new Set(boardIds).size !== boardIds.length) failures.push('source visual board contains duplicate ids');
for (const id of runwayIds) {
  if (!boardIds.includes(id)) failures.push(`${id}: missing from source visual board`);
}
for (const id of boardIds) {
  if (!runwayIds.includes(id)) failures.push(`${id}: source visual board id is not in runway`);
}
if ((board?.summary?.candidates ?? -1) !== boardItems.length) failures.push('board summary candidates mismatch');
if ((board?.summary?.acceptedThreats ?? -1) !== (planCoverage?.summary?.acceptedThreats ?? 0)) failures.push('accepted threat count mismatch');

for (const item of boardItems) {
  const runwayItem = runwayItems.find((entry) => entry.id === item.id);
  const checklistItem = checklistById.get(item.id);
  const plan = planById.get(item.id);
  if (!runwayItem) failures.push(`${item.id}: missing matching runway item`);
  if (!checklistItem) failures.push(`${item.id}: missing matching checklist item`);
  if (!plan) failures.push(`${item.id}: missing matching plan coverage item`);
  if (item.species !== runwayItem?.species) failures.push(`${item.id}: species mismatch`);
  if (item.readyForHumanReview !== runwayItem?.readyForHumanReview) failures.push(`${item.id}: readyForHumanReview mismatch`);
  if (item.humanApproved !== runwayItem?.humanApproved) failures.push(`${item.id}: humanApproved mismatch`);
  if (item.planPreviewPresent !== runwayItem?.planPreviewPresent) failures.push(`${item.id}: planPreviewPresent mismatch`);
  const expectedState = item.humanApproved ? 'approved-source' : item.readyForHumanReview ? 'awaiting-human-source-approval' : 'blocked-before-source-review';
  if (item.state !== expectedState) failures.push(`${item.id}: state ${item.state ?? 'missing'} expected ${expectedState}`);
  const mediaEntries = Object.entries(item.media ?? {});
  if (mediaEntries.length !== 4) failures.push(`${item.id}: expected four visual media entries`);
  for (const [label, url] of mediaEntries) {
    if (!url) failures.push(`${item.id}: missing media url ${label}`);
    if (url && !String(url).includes(item.id)) failures.push(`${item.id}: media ${label} URL does not contain candidate id`);
    const path = pathForPublicUrl(url);
    if (path) {
      await fileOk(`${item.id}: media ${label}`, path, 512);
      const stored = item.mediaEvidence?.[label];
      if (!stored?.sha256 || !stored?.size) failures.push(`${item.id}: media ${label} missing stored fingerprint`);
      const current = await fileFingerprint(`${item.id}: media ${label}`, path);
      if (stored?.sha256 && current?.sha256 && stored.sha256 !== current.sha256) failures.push(`${item.id}: media ${label} stored sha256 is stale`);
      if (stored?.size && current?.size && stored.size !== current.size) failures.push(`${item.id}: media ${label} stored size is stale`);
    }
  }
  if (!Array.isArray(item.requiredRead) || item.requiredRead.length < 3) failures.push(`${item.id}: requiredRead too weak for source board`);
  if (!Array.isArray(item.contractReviewChecklist) || item.contractReviewChecklist.length < 1) failures.push(`${item.id}: contract checklist missing`);
  if (item.requiredRead?.some((entry) => String(entry).startsWith('+'))) failures.push(`${item.id}: requiredRead must not be truncated`);
  if (item.contractReviewChecklist?.some((entry) => String(entry).startsWith('+'))) failures.push(`${item.id}: contractReviewChecklist must not be truncated`);
  if (Array.isArray(checklistItem?.contract?.requiredRead) && item.requiredRead.length !== checklistItem.contract.requiredRead.length) {
    failures.push(`${item.id}: requiredRead count does not match checklist`);
  }
  if (Array.isArray(checklistItem?.contract?.contractReviewChecklist) && item.contractReviewChecklist.length !== checklistItem.contract.contractReviewChecklist.length) {
    failures.push(`${item.id}: contractReviewChecklist count does not match checklist`);
  }
  if (!Array.isArray(item.blockers)) failures.push(`${item.id}: blockers must be an array`);
  if (!item.humanApproved && !item.blockers.includes('human source approval missing')) failures.push(`${item.id}: board must expose missing human source approval`);
  if (!String(item.links?.quickReview ?? '').includes(`/quick-reviews/${item.id}.html`)) failures.push(`${item.id}: quick review link missing or wrong`);
  if (String(item.links?.sourceSandbox ?? '').includes('/sandbox.html')) failures.push(`${item.id}: source sandbox link must use app root query URL, not /sandbox.html`);
  if (String(item.links?.runtimeSandbox ?? '').includes('/sandbox.html')) failures.push(`${item.id}: runtime sandbox link must use app root query URL, not /sandbox.html`);
  const expectedSourceSandbox = `/?entity=source-${item.id}&companion=diver`;
  if (item.links?.sourceSandbox !== expectedSourceSandbox) failures.push(`${item.id}: source sandbox link ${item.links?.sourceSandbox ?? 'missing'} expected ${expectedSourceSandbox}`);
  if (plan?.runtimeRegistered) {
    const expectedRuntimeSandbox = `/?sandbox=${plan.runtimeId ?? item.id}&companion=diver`;
    if (item.links?.runtimeSandbox !== expectedRuntimeSandbox) failures.push(`${item.id}: runtime sandbox link ${item.links?.runtimeSandbox ?? 'missing'} expected ${expectedRuntimeSandbox}`);
  }
  for (const expected of [
    item.id,
    item.species,
    `data-source-visual-board-candidate="${item.id}"`,
    item.media?.source,
    item.media?.keyPreview,
    item.media?.sandboxScreenshot,
    item.media?.planPreview,
    item.links?.sourceSandbox,
    item.links?.runtimeSandbox,
  ].filter(Boolean)) {
    if (!includesHtml(html, expected)) failures.push(`${item.id}: html missing ${expected}`);
  }
  if (!markdown.includes(item.id)) failures.push(`${item.id}: markdown missing id`);
}

for (const expected of [
  'Water 9 Source Visual Board',
  'visual review evidence, not production acceptance',
  'source',
  'magenta key',
  'sandbox source preview',
  'articulation plan preview',
]) {
  if (!includesHtml(html, expected)) failures.push(`html missing ${expected}`);
}
if (!markdown.includes('does not approve production content')) failures.push('markdown missing acceptance boundary');

const summary = {
  schema: 'water9/source-visual-board-check@1',
  candidates: board?.summary?.candidates ?? null,
  readyForHumanReview: board?.summary?.readyForHumanReview ?? null,
  humanApproved: board?.summary?.humanApproved ?? null,
  acceptedThreats: board?.summary?.acceptedThreats ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

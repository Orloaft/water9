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
  json: resolve(String(args.get('json') ?? 'public/review/content-human-adjudication-board.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-human-adjudication-board.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-human-adjudication-board.html')),
  signoff: resolve(String(args.get('signoff') ?? 'public/review/content-human-signoff-queue.json')),
  cockpit: resolve(String(args.get('cockpit') ?? 'public/review/content-review-cockpit/manifest.json')),
};
const minThreats = Number(args.get('min-threats') ?? 20);
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

function textIncludes(text, value) {
  return text.includes(String(value ?? '')) || text.includes(htmlEscape(value));
}

function assertDryRunCommand(owner, label, command, prefix) {
  const text = String(command ?? '');
  if (!text.includes(prefix)) failures.push(`${owner}: ${label} command must include ${prefix}`);
  if (!text.includes('--dry-run')) failures.push(`${owner}: ${label} command must be dry-run`);
}

const board = await readJson('human adjudication board', paths.json);
const signoff = await readJson('human sign-off queue', paths.signoff);
const cockpit = await readJson('content review cockpit', paths.cockpit);
const markdown = await readText('human adjudication board markdown', paths.markdown);
const html = await readText('human adjudication board html', paths.html);
await fileOk('human adjudication board markdown', paths.markdown, 1024);
await fileOk('human adjudication board html', paths.html, 4096);

if (board?.schema !== 'water9/content-human-adjudication-board@1') failures.push(`unexpected board schema ${board?.schema ?? 'missing'}`);
if (signoff?.schema !== 'water9/content-human-signoff-queue@1') failures.push(`unexpected sign-off schema ${signoff?.schema ?? 'missing'}`);
if (cockpit?.schema !== 'water9/content-review-cockpit@1') failures.push(`unexpected cockpit schema ${cockpit?.schema ?? 'missing'}`);

const items = Array.isArray(board?.items) ? board.items : [];
const signoffItems = Array.isArray(signoff?.items) ? signoff.items : [];
const cockpitPages = Array.isArray(cockpit?.pages) ? cockpit.pages : [];
const signoffById = new Map(signoffItems.map((item) => [item.id, item]));
const cockpitById = new Map(cockpitPages.map((item) => [item.id, item]));

if (items.length < minThreats) failures.push(`board has ${items.length} items, expected at least ${minThreats}`);
if (items.length !== signoffItems.length) failures.push(`board item count ${items.length} does not match sign-off ${signoffItems.length}`);
if ((board?.summary?.items ?? -1) !== items.length) failures.push('summary items mismatch');
if ((board?.summary?.targetThreats ?? -1) !== (signoff?.summary?.targetThreats ?? minThreats)) failures.push('summary targetThreats mismatch');
if ((board?.summary?.sourceReady ?? -1) !== items.filter((item) => item.sourceReady).length) failures.push('summary sourceReady mismatch');
if ((board?.summary?.sourceApprovalReady ?? -1) !== items.filter((item) => item.sourceApprovalReady && !item.sourceApproved).length) failures.push('summary sourceApprovalReady mismatch');
if ((board?.summary?.sourceCriticRegenerationRequired ?? -1) !== items.filter((item) => item.sourceCriticRegenerationRequired && !item.sourceApproved).length) failures.push('summary sourceCriticRegenerationRequired mismatch');
if ((board?.summary?.threatReady ?? -1) !== items.filter((item) => item.threatReady).length) failures.push('summary threatReady mismatch');
if ((board?.summary?.allMediaPresent ?? -1) !== items.filter((item) => item.media?.every((entry) => entry.present)).length) failures.push('summary allMediaPresent mismatch');
if ((board?.summary?.sourceApprovalCommands ?? -1) !== items.filter((item) => item.commands?.sourceApprovalDryRun?.includes('--dry-run')).length) failures.push('summary sourceApprovalCommands mismatch');
if ((board?.summary?.threatAcceptanceCommands ?? -1) !== items.filter((item) => item.commands?.threatAcceptanceDryRun?.includes('--dry-run')).length) failures.push('summary threatAcceptanceCommands mismatch');
if ((board?.summary?.sourcePreviewBoundaries ?? -1) !== items.filter((item) => item.previewBoundaries?.source?.productionBoundary?.schema === 'water9/sandbox-production-boundary@1').length) failures.push('summary sourcePreviewBoundaries mismatch');
if ((board?.summary?.runtimePreviewBoundaries ?? -1) !== items.filter((item) => item.previewBoundaries?.runtime?.productionBoundary?.schema === 'water9/sandbox-production-boundary@1').length) failures.push('summary runtimePreviewBoundaries mismatch');
if ((board?.summary?.previewOnlySources ?? -1) !== items.filter((item) => item.previewBoundaries?.source?.previewOnly === true).length) failures.push('summary previewOnlySources mismatch');
if ((board?.summary?.previewOnlyRuntimes ?? -1) !== items.filter((item) => item.previewBoundaries?.runtime?.previewOnly === true).length) failures.push('summary previewOnlyRuntimes mismatch');

for (const item of items) {
  const signoffItem = signoffById.get(item.id);
  const cockpitItem = cockpitById.get(item.id);
  if (!signoffItem) failures.push(`${item.id}: missing sign-off item`);
  if (!cockpitItem) failures.push(`${item.id}: missing cockpit item`);
  if (signoffItem && item.species !== signoffItem.species) failures.push(`${item.id}: species mismatch`);
  if (item.sourceApprovalReady !== Boolean(signoffItem?.sourceApprovalReady)) failures.push(`${item.id}: sourceApprovalReady mismatch`);
  if (item.sourceCriticRegenerationRequired !== Boolean(signoffItem?.sourceCriticRegenerationRequired)) failures.push(`${item.id}: sourceCriticRegenerationRequired mismatch`);
  if (item.sourceMechanicallyReady !== Boolean(signoffItem?.sourceMechanicallyReady)) failures.push(`${item.id}: sourceMechanicallyReady mismatch`);
  const expectedSourceReady = Boolean(signoffItem?.sourceApprovalReady) && item.media?.slice(0, 4).every((entry) => entry.present) && Boolean(item.commands?.sourceApprovalDryRun);
  if (item.sourceReady !== expectedSourceReady) failures.push(`${item.id}: sourceReady should follow approval runway readiness`);
  const expectedThreatReady = expectedSourceReady && signoffItem?.sourceApproved === true && Boolean(signoffItem?.rigEvidenceReady) && item.media?.every((entry) => entry.present) && Boolean(item.commands?.threatAcceptanceDryRun);
  if (item.threatReady !== expectedThreatReady) failures.push(`${item.id}: threatReady should require source-ready evidence first`);
  if (!Array.isArray(item.media) || item.media.length < 10) failures.push(`${item.id}: expected at least 10 media tiles`);
  for (const label of [
    'source art',
    'magenta key preview',
    'source sandbox preview',
    'articulation plan preview',
    'source parity overlay',
    'contact sheet',
    'phase strip',
    'sandbox idle',
    'sandbox lunge',
    'sandbox stunned',
  ]) {
    const media = item.media?.find((entry) => entry.label === label);
    if (!media?.url) failures.push(`${item.id}: missing media url for ${label}`);
    if (!media?.present) failures.push(`${item.id}: media not present for ${label}`);
  }
  if (!item.links?.cockpit?.includes(`/review/content-review-cockpit/${item.id}.html`)) failures.push(`${item.id}: cockpit link missing`);
  if (!item.links?.sourceSandbox?.includes(`source-${item.id}`)) failures.push(`${item.id}: source sandbox link missing`);
  if (!item.links?.runtimeSandbox?.includes(item.id)) failures.push(`${item.id}: runtime sandbox link missing`);
  assertDryRunCommand(item.id, 'source approval', item.commands?.sourceApprovalDryRun, `npm run source:accept -- --id ${item.id}`);
  assertDryRunCommand(item.id, 'threat acceptance', item.commands?.threatAcceptanceDryRun, `npm run content:accept -- --id ${item.id}`);
  if (String(item.commands?.sourcePreview ?? '').includes('npm run source:accept') || String(item.commands?.runtimePreview ?? '').includes('npm run content:accept')) {
    failures.push(`${item.id}: preview commands must not be decision commands`);
  }
  for (const [label, boundary] of [
    ['source', item.previewBoundaries?.source],
    ['runtime', item.previewBoundaries?.runtime],
  ]) {
    if (boundary?.productionBoundary?.schema !== 'water9/sandbox-production-boundary@1') failures.push(`${item.id}: missing ${label} sandbox production boundary`);
    if (boundary?.acceptedForContentGate !== boundary?.productionBoundary?.acceptedForContentGate) failures.push(`${item.id}: ${label} boundary acceptedForContentGate mismatch`);
    if (boundary?.productionBoundary?.productionReady !== boundary?.acceptedForContentGate) failures.push(`${item.id}: ${label} boundary productionReady mismatch`);
    if (boundary?.acceptedForContentGate !== true && boundary?.previewOnly !== true) failures.push(`${item.id}: ${label} non-accepted preview must be preview-only`);
    if (!String(boundary?.claim ?? '').trim()) failures.push(`${item.id}: ${label} preview boundary missing claim`);
    if (!String(boundary?.manualReviewRequired ?? '').trim()) failures.push(`${item.id}: ${label} preview boundary missing manualReviewRequired`);
  }
  for (const value of [
    item.id,
    item.species,
    item.commands?.sourcePreview,
    item.commands?.runtimePreview,
    item.commands?.sourceApprovalDryRun,
    item.commands?.threatAcceptanceDryRun,
    item.previewBoundaries?.source?.claim,
    item.previewBoundaries?.runtime?.claim,
    `data-human-adjudication="${item.id}"`,
  ]) {
    if (value && !markdown.includes(String(value)) && !textIncludes(html, value)) failures.push(`${item.id}: rendered outputs missing ${value}`);
  }
}

for (const required of [
  'Water9 Human Adjudication Board',
  'Dense human review board for the 20-threat gate',
  'Human Approval Boundary',
  'critic-regeneration',
  'approval-ready',
  'source preview boundary',
  'runtime preview boundary',
  'preview-only runtimes',
  'Automation can gather evidence and produce dry-run commands',
  'npm run content:human-adjudication-board',
  'npm run content:human-adjudication-board-check',
  'data-human-adjudication',
]) {
  if (!markdown.includes(required) && !textIncludes(html, required)) failures.push(`rendered outputs missing ${required}`);
}

const summary = {
  schema: 'water9/content-human-adjudication-board-check@1',
  items: items.length,
  sourceReady: board?.summary?.sourceReady ?? null,
  threatReady: board?.summary?.threatReady ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

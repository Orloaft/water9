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
  json: resolve(String(args.get('json') ?? 'public/review/source-candidates/source-regeneration-workspace.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/source-candidates/source-regeneration-workspace.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-regeneration-workspace.html')),
  sequencer: resolve(String(args.get('sequencer') ?? 'public/review/source-candidates/source-review-sequencer.json')),
  targetPacket: resolve(String(args.get('target-packet') ?? 'public/review/source-candidates/source-review-target-packet.json')),
  criticHealth: resolve(String(args.get('critic-health') ?? 'public/review/source-candidates/source-critic-regeneration-health.json')),
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
  return text.includes(String(value ?? '')) || text.includes(htmlEscape(value));
}

function isOverwriteIngest(command) {
  const text = String(command ?? '');
  return text.includes('source:ingest') && text.includes('--overwrite');
}

const workspace = await readJson('source regeneration workspace', paths.json);
const sequencer = await readJson('source review sequencer', paths.sequencer);
const targetPacket = await readJson('source review target packet', paths.targetPacket);
const criticHealth = await readJson('source critic regeneration health', paths.criticHealth);
const markdown = await readText('source regeneration workspace markdown', paths.markdown);
const html = await readText('source regeneration workspace html', paths.html);
await fileOk('source regeneration workspace markdown', paths.markdown, 1024);
await fileOk('source regeneration workspace html', paths.html, 2048);

if (workspace?.schema !== 'water9/source-regeneration-workspace@1') failures.push(`workspace schema is ${workspace?.schema ?? 'missing'}`);
if (sequencer?.schema !== 'water9/source-review-sequencer@1') failures.push(`sequencer schema is ${sequencer?.schema ?? 'missing'}`);
if (targetPacket?.schema !== 'water9/source-review-target-packet@1') failures.push(`target packet schema is ${targetPacket?.schema ?? 'missing'}`);
if (criticHealth?.schema !== 'water9/source-critic-regeneration-health@1') failures.push(`critic health schema is ${criticHealth?.schema ?? 'missing'}`);

for (const [key, expected] of Object.entries({
  doesNotApproveSources: true,
  doesNotAcceptThreats: true,
  previewOnlyDoesNotCountTowardGate: true,
  followsSourceReviewSequencer: true,
  distinctReplacementRequiredBeforeOverwriteIngest: true,
  noOverwriteIngestOutsideDistinctReady: true,
})) {
  if (workspace?.policy?.[key] !== expected) failures.push(`workspace policy ${key} must be ${expected}`);
}

const target = workspace?.target ?? {};
const expectedSequencerTarget = sequencer?.summary?.nextTarget ?? null;
const sequencerItem = (sequencer?.items ?? []).find((item) => item.id === expectedSequencerTarget) ?? null;
const healthItem = (criticHealth?.items ?? []).find((item) => item.id === target.id) ?? null;

if (target.id !== expectedSequencerTarget) failures.push(`workspace target must be sequencer next target ${expectedSequencerTarget}`);
if (targetPacket?.target?.id !== target.id) failures.push('workspace target must match source review target packet');
if (sequencerItem && target.lane !== sequencerItem.lane) failures.push('workspace lane mismatch with sequencer');
if ((workspace?.summary?.sequencerNextTarget ?? null) !== expectedSequencerTarget) failures.push('workspace summary sequencerNextTarget mismatch');
if ((workspace?.summary?.sequencerNextLane ?? null) !== (sequencer?.summary?.nextLane ?? null)) failures.push('workspace summary sequencerNextLane mismatch');
if ((workspace?.summary?.validNoopReplacements ?? -1) !== (criticHealth?.summary?.validNoopReplacements ?? -2)) failures.push('workspace validNoopReplacements mismatch');
if ((workspace?.summary?.missingReplacements ?? -1) !== (criticHealth?.summary?.missingReplacements ?? -2)) failures.push('workspace missingReplacements mismatch');
if ((workspace?.summary?.invalidReplacements ?? -1) !== (criticHealth?.summary?.invalidReplacements ?? -2)) failures.push('workspace invalidReplacements mismatch');
if (healthItem) {
  if (target.healthStatus !== healthItem.status) failures.push('workspace health status mismatch');
  if (Boolean(target.replacementMatchesCurrentSource) !== Boolean(healthItem.replacementMatchesCurrentSource)) failures.push('workspace no-op replacement flag mismatch');
  if (Boolean(target.distinctReplacementReady) !== Boolean(healthItem.distinctReplacementReady)) failures.push('workspace distinct replacement flag mismatch');
  if (target.source?.sha256 !== healthItem.source?.sha256) failures.push('workspace source sha mismatch with critic health');
  if (target.inbox?.sha256 !== healthItem.inbox?.sha256) failures.push('workspace inbox sha mismatch with critic health');
}
if (!target.promptText && target.lane?.startsWith('regenerate-')) failures.push('regeneration workspace must include prompt text');
if (!target.source?.path || !target.inbox?.path) failures.push('workspace must include source and inbox paths');
if (target.inbox?.exists && target.inboxPreview?.sha256 !== target.inbox?.sha256) failures.push('workspace inbox preview sha mismatch with inbox');
if (target.inbox?.exists && !target.links?.inboxReplacementPreview) failures.push('workspace must expose inbox replacement preview link');
if (!target.commands?.validateInbox) failures.push('workspace missing validateInbox command');
if (!target.commands?.rebuildHealth) failures.push('workspace missing rebuildHealth command');
if (!target.commands?.rebuildSequencer) failures.push('workspace missing rebuildSequencer command');
if (!target.commands?.rebuildTargetPacket) failures.push('workspace missing rebuildTargetPacket command');
if (!Array.isArray(target.commands?.safeNext) || target.commands.safeNext.length < 3) failures.push('workspace safeNext commands missing');

if (target.lane !== 'regenerate-distinct-ready') {
  for (const command of target.commands?.safeNext ?? []) {
    if (isOverwriteIngest(command)) failures.push('workspace must not expose overwrite ingest in safeNext outside distinct-ready lane');
  }
  if (markdown.includes('source:ingest') && markdown.includes('--overwrite --dry-run')) failures.push('markdown must not expose overwrite ingest outside distinct-ready lane');
  if (includesHtml(html, 'source:ingest') && includesHtml(html, '--overwrite --dry-run')) failures.push('html must not expose overwrite ingest outside distinct-ready lane');
}

for (const required of [
  'Water 9 Source Regeneration Workspace',
  'does not approve source art',
  'does not accept threats',
  'does not count preview-only work toward the 20-threat gate',
  'Command Boundary',
  'Source / Inbox Fingerprints',
  'Safe Next Commands',
  'Distinct Replacement Gate',
  'data-source-regeneration-workspace',
  `data-source-regeneration-target="${target.id}"`,
  target.id,
  target.species,
  target.lane,
  target.status,
  target.source?.path,
  target.inbox?.path,
  target.inboxPreview?.path,
  target.links?.inboxReplacementPreview,
  target.source?.sha256,
  target.inbox?.sha256,
  target.inboxPreview?.sha256,
  target.commands?.validateInbox,
  target.commands?.rebuildHealth,
  target.commands?.rebuildSequencer,
  target.commands?.rebuildTargetPacket,
]) {
  if (required && !markdown.includes(String(required)) && !includesHtml(html, required)) failures.push(`rendered outputs missing ${required}`);
}
for (const command of target.commands?.safeNext ?? []) {
  if (!markdown.includes(command) && !includesHtml(html, command)) failures.push(`rendered outputs missing safe command ${command}`);
}

const result = {
  schema: 'water9/source-regeneration-workspace-check@1',
  target: target.id ?? null,
  lane: target.lane ?? null,
  healthStatus: target.healthStatus ?? null,
  replacementMatchesCurrentSource: Boolean(target.replacementMatchesCurrentSource),
  distinctReplacementReady: Boolean(target.distinctReplacementReady),
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}

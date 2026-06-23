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
  json: resolve(String(args.get('json') ?? 'public/review/source-candidates/source-review-sequencer.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/source-candidates/source-review-sequencer.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-review-sequencer.html')),
  approvalRunway: resolve(String(args.get('approval-runway') ?? 'public/review/source-approval-runway.json')),
  criticHealth: resolve(String(args.get('critic-health') ?? 'public/review/source-candidates/source-critic-regeneration-health.json')),
};

const failures = [];
const LANE_ORDER = [
  'regenerate-distinct-ready',
  'regenerate-noop',
  'regenerate-missing',
  'regenerate-invalid',
  'approval-ready',
  'approved',
];

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

const sequencer = await readJson('source review sequencer', paths.json);
const approvalRunway = await readJson('source approval runway', paths.approvalRunway);
const criticHealth = await readJson('critic regeneration health', paths.criticHealth);
const markdown = await readText('source review sequencer markdown', paths.markdown);
const html = await readText('source review sequencer html', paths.html);
await fileOk('source review sequencer markdown', paths.markdown, 1024);
await fileOk('source review sequencer html', paths.html, 2048);

if (sequencer?.schema !== 'water9/source-review-sequencer@1') failures.push(`sequencer schema is ${sequencer?.schema ?? 'missing'}`);
if (approvalRunway?.schema !== 'water9/source-approval-runway@1') failures.push(`approval runway schema is ${approvalRunway?.schema ?? 'missing'}`);
if (criticHealth?.schema !== 'water9/source-critic-regeneration-health@1') failures.push(`critic health schema is ${criticHealth?.schema ?? 'missing'}`);
if (sequencer?.policy?.doesNotApproveSources !== true) failures.push('sequencer must not approve sources');
if (sequencer?.policy?.doesNotAcceptThreats !== true) failures.push('sequencer must not accept threats');
if (sequencer?.policy?.previewOnlyDoesNotCountTowardGate !== true) failures.push('sequencer must mark preview-only work outside the gate');
if (sequencer?.policy?.distinctReplacementRequiredBeforeIngest !== true) failures.push('sequencer must require distinct replacement before ingest');
if (sequencer?.policy?.dryRunOnlyApprovalCommands !== true) failures.push('sequencer must expose dry-run-only approval commands');

const items = Array.isArray(sequencer?.items) ? sequencer.items : [];
const approvalItems = Array.isArray(approvalRunway?.items) ? approvalRunway.items : [];
const healthItems = Array.isArray(criticHealth?.items) ? criticHealth.items : [];
const healthById = new Map(healthItems.map((item) => [item.id, item]));
if (items.length !== approvalItems.length) failures.push(`sequencer item count ${items.length} does not match approval runway ${approvalItems.length}`);
if ((sequencer?.summary?.totalCandidates ?? -1) !== items.length) failures.push('summary totalCandidates mismatch');

for (const lane of LANE_ORDER) {
  if ((sequencer?.summary?.lanes?.[lane] ?? -1) !== items.filter((item) => item.lane === lane).length) {
    failures.push(`summary lane count mismatch for ${lane}`);
  }
  if (!includesHtml(html, `data-source-review-sequencer-lane="${lane}"`)) failures.push(`html missing lane marker ${lane}`);
}

if ((sequencer?.summary?.approvalReady ?? -1) !== items.filter((item) => item.lane === 'approval-ready').length) failures.push('summary approvalReady mismatch');
if ((sequencer?.summary?.criticRegenerationRequired ?? -1) !== items.filter((item) => item.criticRegenerationRequired).length) failures.push('summary criticRegenerationRequired mismatch');
if ((sequencer?.summary?.distinctReplacementReady ?? -1) !== (criticHealth?.summary?.distinctReplacementReady ?? -2)) failures.push('summary distinctReplacementReady mismatch with health');
if ((sequencer?.summary?.validNoopReplacements ?? -1) !== (criticHealth?.summary?.validNoopReplacements ?? -2)) failures.push('summary validNoopReplacements mismatch with health');
if ((sequencer?.summary?.missingReplacements ?? -1) !== (criticHealth?.summary?.missingReplacements ?? -2)) failures.push('summary missingReplacements mismatch with health');
if ((sequencer?.summary?.invalidReplacements ?? -1) !== (criticHealth?.summary?.invalidReplacements ?? -2)) failures.push('summary invalidReplacements mismatch with health');
if ((sequencer?.summary?.approved ?? -1) !== items.filter((item) => item.humanApproved).length) failures.push('summary approved mismatch');
if ((sequencer?.summary?.countsTowardGate ?? -1) !== items.filter((item) => item.countsTowardGate).length) failures.push('summary countsTowardGate mismatch');

const expectedNext = items.find((item) => item.lane === 'regenerate-distinct-ready')
  ?? items.find((item) => item.lane === 'regenerate-noop')
  ?? items.find((item) => item.lane === 'regenerate-missing')
  ?? items.find((item) => item.lane === 'regenerate-invalid')
  ?? items.find((item) => item.lane === 'approval-ready')
  ?? null;
if ((sequencer?.summary?.nextTarget ?? null) !== (expectedNext?.id ?? null)) failures.push('summary nextTarget mismatch');
if ((sequencer?.summary?.nextLane ?? null) !== (expectedNext?.lane ?? null)) failures.push('summary nextLane mismatch');
if (JSON.stringify(sequencer?.nextCommands ?? []) !== JSON.stringify(expectedNext?.nextCommands ?? [])) failures.push('top-level nextCommands must match next target commands');

for (const approvalItem of approvalItems) {
  const item = items.find((row) => row.id === approvalItem.id);
  const health = healthById.get(approvalItem.id) ?? null;
  if (!item) {
    failures.push(`${approvalItem.id}: missing sequencer row`);
    continue;
  }
  if (item.species !== approvalItem.species) failures.push(`${approvalItem.id}: species mismatch`);
  if (!LANE_ORDER.includes(item.lane)) failures.push(`${approvalItem.id}: invalid lane ${item.lane}`);
  if (item.healthStatus !== (health?.status ?? null)) failures.push(`${approvalItem.id}: healthStatus mismatch`);
  if (health?.status === 'distinct-replacement-ready' && item.lane !== 'regenerate-distinct-ready') failures.push(`${approvalItem.id}: distinct replacement must be in regenerate-distinct-ready lane`);
  if (health?.status === 'replacement-applied' && item.lane !== 'approval-ready' && item.lane !== 'approved') failures.push(`${approvalItem.id}: applied replacement must return to approval-ready lane`);
  if (health?.status === 'valid-noop-replacement' && item.lane !== 'regenerate-noop') failures.push(`${approvalItem.id}: no-op replacement must be in regenerate-noop lane`);
  if (health?.status === 'replacement-missing' && item.lane !== 'regenerate-missing') failures.push(`${approvalItem.id}: missing replacement must be in regenerate-missing lane`);
  if (health?.status === 'replacement-invalid' && item.lane !== 'regenerate-invalid') failures.push(`${approvalItem.id}: invalid replacement must be in regenerate-invalid lane`);
  if (!health && approvalItem.readyForHumanReview && !approvalItem.humanApproved && item.lane !== 'approval-ready') failures.push(`${approvalItem.id}: approval-ready row lane mismatch`);
  if (!Array.isArray(item.nextCommands) || item.nextCommands.length < 1) failures.push(`${approvalItem.id}: missing nextCommands`);
  if (item.lane !== 'regenerate-distinct-ready') {
    for (const command of item.nextCommands ?? []) {
      if (/source:ingest\b/.test(command) && /--overwrite/.test(command)) failures.push(`${approvalItem.id}: non-distinct lane must not expose overwrite ingest`);
    }
  }
  if (item.lane === 'approval-ready') {
    const approvalCommands = (item.nextCommands ?? []).filter((command) => command.includes('source:accept'));
    if (!approvalCommands.length) failures.push(`${approvalItem.id}: approval-ready row missing dry-run source accept command`);
    if (approvalCommands.some((command) => !command.includes('--dry-run'))) failures.push(`${approvalItem.id}: approval command must be dry-run`);
  }
  for (const value of [item.id, item.species, item.lane, item.status, item.recommendedFirst]) {
    if (value && !markdown.includes(String(value)) && !includesHtml(html, value)) failures.push(`${approvalItem.id}: rendered outputs missing ${value}`);
  }
  if (!includesHtml(html, `data-source-review-sequencer-row="${item.id}"`)) failures.push(`${approvalItem.id}: html missing row marker`);
}

for (const required of [
  'Water 9 Source Review Sequencer',
  'does not approve source art',
  'does not accept threats',
  'Preview-only rows do not count toward the 20-threat gate',
  'data-source-review-sequencer',
  'regenerate-noop',
  'approval-ready',
]) {
  if (!markdown.includes(required) && !includesHtml(html, required)) failures.push(`rendered outputs missing ${required}`);
}

const result = {
  schema: 'water9/source-review-sequencer-check@1',
  candidates: sequencer?.summary?.totalCandidates ?? null,
  nextLane: sequencer?.summary?.nextLane ?? null,
  nextTarget: sequencer?.summary?.nextTarget ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}

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
  json: resolve(String(args.get('json') ?? 'public/review/source-candidates/source-review-target-packet.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/source-candidates/source-review-target-packet.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-review-target-packet.html')),
  sequencer: resolve(String(args.get('sequencer') ?? 'public/review/source-candidates/source-review-sequencer.json')),
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

const packet = await readJson('source review target packet', paths.json);
const sequencer = await readJson('source review sequencer', paths.sequencer);
const markdown = await readText('source review target packet markdown', paths.markdown);
const html = await readText('source review target packet html', paths.html);
await fileOk('source review target packet markdown', paths.markdown, 1024);
await fileOk('source review target packet html', paths.html, 2048);

if (packet?.schema !== 'water9/source-review-target-packet@1') failures.push(`packet schema is ${packet?.schema ?? 'missing'}`);
if (sequencer?.schema !== 'water9/source-review-sequencer@1') failures.push(`sequencer schema is ${sequencer?.schema ?? 'missing'}`);
if (packet?.policy?.doesNotApproveSources !== true) failures.push('packet must not approve sources');
if (packet?.policy?.doesNotAcceptThreats !== true) failures.push('packet must not accept threats');
if (packet?.policy?.previewOnlyDoesNotCountTowardGate !== true) failures.push('packet must keep preview-only work out of gate');
if (packet?.policy?.followsSourceReviewSequencer !== true) failures.push('packet must follow source review sequencer');
if (packet?.policy?.overwriteIngestOnlyWhenDistinctReplacementReady !== true) failures.push('packet must restrict overwrite ingest to distinct replacements');

const target = packet?.target ?? {};
const expected = (sequencer?.items ?? []).find((item) => item.id === sequencer?.summary?.nextTarget) ?? null;
if (!expected) failures.push('sequencer next target missing');
if (expected && target.id !== expected.id) failures.push(`packet target must be sequencer next target ${expected.id}`);
if (expected && target.lane !== expected.lane) failures.push('packet lane mismatch with sequencer');
if (expected && target.status !== expected.status) failures.push('packet status mismatch with sequencer');
if (expected && target.recommendedFirst !== (expected.recommendedFirst ?? expected.nextCommands?.[0] ?? null)) failures.push('packet recommendedFirst mismatch with sequencer');
if ((packet?.summary?.sequencerNextTarget ?? null) !== (sequencer?.summary?.nextTarget ?? null)) failures.push('summary sequencerNextTarget mismatch');
if ((packet?.summary?.sequencerNextLane ?? null) !== (sequencer?.summary?.nextLane ?? null)) failures.push('summary sequencerNextLane mismatch');
if ((packet?.summary?.approvalReady ?? -1) !== (sequencer?.summary?.approvalReady ?? -2)) failures.push('summary approvalReady mismatch');
if ((packet?.summary?.criticRegenerationRequired ?? -1) !== (sequencer?.summary?.criticRegenerationRequired ?? -2)) failures.push('summary criticRegenerationRequired mismatch');
if ((packet?.summary?.countsTowardGate ?? -1) !== (sequencer?.summary?.countsTowardGate ?? -2)) failures.push('summary countsTowardGate mismatch');
if (!Array.isArray(target.nextCommands) || target.nextCommands.length < 1) failures.push('target nextCommands missing');
if (target.lane !== 'regenerate-distinct-ready') {
  for (const command of target.nextCommands ?? []) {
    if (String(command).includes('source:ingest') && String(command).includes('--overwrite')) failures.push('packet must not expose overwrite ingest outside distinct-ready lane');
  }
}
if (target.lane?.startsWith('regenerate-') && !target.promptText) failures.push('regeneration target must include critic prompt text');
for (const key of ['source', 'keyPreview', 'sourcePreview', 'quickReview', 'reviewPacket', 'planPreview', 'sequencer']) {
  if (!target.links?.[key]) failures.push(`target links.${key} missing`);
}
for (const command of target.nextCommands ?? []) {
  if (!markdown.includes(command) && !includesHtml(html, command)) failures.push(`rendered outputs missing command ${command}`);
}
for (const required of [
  'Water 9 Source Review Target Packet',
  'does not approve source art',
  'does not accept threats',
  'does not count preview-only work toward the 20-threat gate',
  'Command Boundary',
  'Critic Prompt',
  'Quality Gate Boundary',
  'data-source-review-target-packet',
  `data-source-review-target="${target.id}"`,
  target.id,
  target.species,
  target.lane,
  target.status,
]) {
  if (required && !markdown.includes(String(required)) && !includesHtml(html, required)) failures.push(`rendered outputs missing ${required}`);
}

const result = {
  schema: 'water9/source-review-target-packet-check@1',
  target: target.id ?? null,
  lane: target.lane ?? null,
  failures,
};
if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}

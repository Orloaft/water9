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
  json: resolve(String(args.get('json') ?? 'public/review/content-visual-feedback-ledger.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-visual-feedback-ledger.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-visual-feedback-ledger.html')),
  input: resolve(String(args.get('input') ?? 'tools/audit/content-visual-feedback-input.json')),
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

function includesRendered(text, value) {
  return text.includes(String(value ?? '')) || text.includes(htmlEscape(value));
}

const report = await readJson('content visual feedback ledger', paths.json);
const input = await readJson('content visual feedback input', paths.input);
const markdown = await readText('content visual feedback markdown', paths.markdown);
const html = await readText('content visual feedback html', paths.html);

await fileOk('content visual feedback markdown', paths.markdown, 1024);
await fileOk('content visual feedback html', paths.html, 2048);

if (input?.schema !== 'water9/content-visual-feedback-input@1') failures.push(`unexpected input schema ${input?.schema ?? 'missing'}`);
if (report?.schema !== 'water9/content-visual-feedback-ledger@1') failures.push(`unexpected ledger schema ${report?.schema ?? 'missing'}`);
if (report?.policy?.visualFeedbackCanBlockPrototypePromotion !== true) failures.push('visual feedback must be able to block prototype promotion');
if (report?.policy?.blockedPrototypeCannotCountTowardStrictGate !== true) failures.push('blocked prototype must not count toward strict gate');
if (report?.policy?.prototypeScreenshotIsNotCapabilityProof !== true) failures.push('prototype screenshot policy missing');

const items = Array.isArray(report?.items) ? report.items : [];
if (items.length < 1) failures.push('visual feedback ledger must contain at least one record');
const serpent = items.find((item) => item.targetId === 'abyssal-serpent');
if (!serpent) failures.push('visual feedback ledger must record the abyssal-serpent cohesion rejection');
if (serpent) {
  if (serpent.status !== 'rejected-needs-cohesion-regeneration') failures.push('abyssal-serpent feedback status must block regeneration');
  if (serpent.severity !== 'blocking') failures.push('abyssal-serpent feedback severity must be blocking');
  if (!serpent.sandboxRegistered) failures.push('abyssal-serpent must be linked to sandbox entry');
  if (serpent.sandboxPreviewOnly !== true) failures.push('abyssal-serpent sandbox entry must remain preview-only');
  if (serpent.runtimePrototype !== true) failures.push('abyssal-serpent must be identified as runtime prototype');
  if (serpent.targetGateCandidate !== false) failures.push('abyssal-serpent must remain outside target gate candidates');
  if (serpent.countsTowardStrictGate !== false) failures.push('abyssal-serpent must not count toward strict gate');
  for (const check of ['whole-creature-cohesion', 'part-continuity-cohesion', 'non-placeholder-art-direction']) {
    if (!serpent.failedChecks?.includes(check)) failures.push(`abyssal-serpent missing failed check ${check}`);
  }
  if (!String(serpent.requiredAction ?? '').includes('Regenerate')) failures.push('abyssal-serpent required action must require regeneration');
}

if ((report?.summary?.records ?? -1) !== items.length) failures.push('summary records mismatch');
if ((report?.summary?.blockingRecords ?? -1) !== items.filter((item) => item.severity === 'blocking').length) failures.push('summary blockingRecords mismatch');
if ((report?.summary?.openRecords ?? -1) !== items.filter((item) => item.open).length) failures.push('summary openRecords mismatch');
if ((report?.summary?.countsTowardStrictGate ?? -1) !== 0) failures.push('visual feedback records must not count toward strict gate');

for (const required of [
  'Water 9 Visual Feedback Ledger',
  'blocked prototype cannot be used as proof',
  'abyssal-serpent',
  'rejected-needs-cohesion-regeneration',
  'whole-creature-cohesion',
  'data-content-visual-feedback-ledger',
]) {
  if (!markdown.includes(required) && !includesRendered(html, required)) failures.push(`rendered outputs missing ${required}`);
}

const result = {
  schema: 'water9/content-visual-feedback-ledger-check@1',
  records: report?.summary?.records ?? null,
  blockingRecords: report?.summary?.blockingRecords ?? null,
  unmappedPrototypeBlockers: report?.summary?.unmappedPrototypeBlockers ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}

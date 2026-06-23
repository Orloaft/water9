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
  json: resolve(String(args.get('json') ?? 'public/review/content-visual-regeneration-queue.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-visual-regeneration-queue.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-visual-regeneration-queue.html')),
  feedbackLedger: resolve(String(args.get('feedback-ledger') ?? 'public/review/content-visual-feedback-ledger.json')),
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

const report = await readJson('content visual regeneration queue', paths.json);
const feedbackLedger = await readJson('content visual feedback ledger', paths.feedbackLedger);
const markdown = await readText('content visual regeneration markdown', paths.markdown);
const html = await readText('content visual regeneration html', paths.html);

await fileOk('content visual regeneration markdown', paths.markdown, 1024);
await fileOk('content visual regeneration html', paths.html, 2048);

if (report?.schema !== 'water9/content-visual-regeneration-queue@1') failures.push(`unexpected queue schema ${report?.schema ?? 'missing'}`);
if (feedbackLedger?.schema !== 'water9/content-visual-feedback-ledger@1') failures.push(`unexpected feedback schema ${feedbackLedger?.schema ?? 'missing'}`);
if (report?.policy?.sourceFirstRegenerationRequired !== true) failures.push('queue must require source-first regeneration');
if (report?.policy?.promptDoesNotApproveArt !== true) failures.push('queue must state prompts do not approve art');
if (report?.policy?.blockedPrototypeCannotCountTowardStrictGate !== true) failures.push('queue must prevent blocked prototype strict-gate credit');
if (report?.policy?.mechanicalRigPrototypeIsNotArtDirection !== true) failures.push('queue must separate mechanical rig prototypes from art direction');
if (report?.policy?.cohesionFailureRequiresNewSource !== true) failures.push('queue must require new source for cohesion failures');

const items = Array.isArray(report?.items) ? report.items : [];
const openBlockingFeedback = (feedbackLedger?.items ?? []).filter((item) => item.open && item.severity === 'blocking');
if (items.length !== openBlockingFeedback.length) failures.push('queue items must match open blocking feedback records');
const serpent = items.find((item) => item.targetId === 'abyssal-serpent');
if (!serpent) failures.push('queue must include abyssal-serpent');
if (serpent) {
  if (serpent.status !== 'rejected-needs-cohesion-regeneration') failures.push('abyssal-serpent queue status mismatch');
  if (serpent.sandboxPreviewOnly !== true) failures.push('abyssal-serpent queue must preserve preview-only status');
  if (serpent.targetGateCandidate !== false) failures.push('abyssal-serpent queue must remain outside target gate');
  if (serpent.countsTowardStrictGate !== false) failures.push('abyssal-serpent queue must not count toward strict gate');
  for (const check of ['whole-creature-cohesion', 'part-continuity-cohesion', 'non-placeholder-art-direction']) {
    if (!serpent.failedChecks?.includes(check)) failures.push(`abyssal-serpent queue missing failed check ${check}`);
  }
  if (!String(serpent.commands?.previewWithDiver ?? '').includes('--with diver')) failures.push('abyssal-serpent queue must include diver-paired preview command');
  if (!String(serpent.commands?.openPrompt ?? '').includes(serpent.promptFile)) failures.push('abyssal-serpent openPrompt must point to prompt file');
  await fileOk('abyssal-serpent regeneration prompt', resolve(serpent.promptFile), 1024);
  const prompt = await readText('abyssal-serpent regeneration prompt', resolve(serpent.promptFile));
  for (const required of [
    'flat pure #ff00ff magenta background',
    'one cohesive full-source underwater threat',
    'Do not create a parts sheet',
    'mechanical rig test only',
    'not art direction',
    'Forbidden shortcuts:',
    'Do not merely repaint, upscale, re-time, socket-tune, or crop the rejected prototype.',
    'Do not assemble unrelated body parts into a collage',
    'one organism before rigging quality is evaluated',
    'whole-creature-cohesion',
    'part-continuity-cohesion',
    'non-placeholder-art-direction',
    'Human reviewer must approve the intact source',
  ]) {
    if (!prompt.includes(required)) failures.push(`abyssal-serpent prompt missing ${required}`);
  }
}

if ((report?.summary?.items ?? -1) !== items.length) failures.push('summary items mismatch');
if ((report?.summary?.blockingItems ?? -1) !== items.filter((item) => item.severity === 'blocking').length) failures.push('summary blockingItems mismatch');
if ((report?.summary?.countsTowardStrictGate ?? -1) !== 0) failures.push('visual regeneration queue must not count toward strict gate');

for (const required of [
  'Water 9 Visual Regeneration Queue',
  'source-first regeneration briefs',
  'These prompts do not approve art',
  'abyssal-serpent',
  'data-content-visual-regeneration-queue',
]) {
  if (!markdown.includes(required) && !includesRendered(html, required)) failures.push(`rendered outputs missing ${required}`);
}

const result = {
  schema: 'water9/content-visual-regeneration-queue-check@1',
  items: report?.summary?.items ?? null,
  blockingItems: report?.summary?.blockingItems ?? null,
  nextTargetId: report?.summary?.nextTargetId ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}

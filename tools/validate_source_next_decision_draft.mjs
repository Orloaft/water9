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
  json: resolve(String(args.get('json') ?? 'public/review/source-candidates/source-next-decision-draft.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/source-candidates/source-next-decision-draft.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-next-decision-draft.html')),
  sourceNextReview: resolve(String(args.get('source-next-review') ?? 'public/review/source-candidates/source-next-review.json')),
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

const report = await readJson('source next decision draft', paths.json);
const sourceNextReview = await readJson('source next review', paths.sourceNextReview);
const markdown = await readText('source next decision draft markdown', paths.markdown);
const html = await readText('source next decision draft html', paths.html);
await fileOk('source next decision draft markdown', paths.markdown, 1024);
await fileOk('source next decision draft html', paths.html, 4096);

if (report?.schema !== 'water9/source-next-decision-draft@1') failures.push(`unexpected draft schema ${report?.schema ?? 'missing'}`);
if (sourceNextReview?.schema !== 'water9/source-next-review@1') failures.push(`unexpected source next review schema ${sourceNextReview?.schema ?? 'missing'}`);
if (report?.policy?.draftDoesNotApproveSource !== true) failures.push('draft must state it does not approve source');
if (report?.policy?.humanAuthoredDecisionRequired !== true) failures.push('draft must require a human-authored decision');
if (report?.policy?.reviewedOnlyDecisionFileRequired !== true) failures.push('draft must require reviewed-only decision file');
if (report?.policy?.strictApplyStillRequired !== true) failures.push('draft must preserve strict apply requirement');

const expectedTarget = sourceNextReview?.target;
const target = report?.target;
const decisionFile = report?.decisionFile;
const decision = decisionFile?.decisions?.[0];
const expectedDecision = expectedTarget?.focusedDecisionStarter?.decisions?.[0];
if (!target) failures.push('draft missing target');
if (target?.id !== expectedTarget?.id) failures.push(`draft target ${target?.id ?? 'missing'} does not match source next review ${expectedTarget?.id ?? 'missing'}`);
if (target?.species !== expectedTarget?.species) failures.push('draft target species mismatch');
if (report?.reviewedDecisionFilename !== 'water9-source-cohesion-reviewed-decisions.json') failures.push('draft reviewed filename mismatch');
if (decisionFile?.schema !== 'water9/source-cohesion-decisions@1') failures.push('draft decisionFile schema mismatch');
if (decisionFile?.reviewer !== '<human-reviewer>') failures.push('draft decisionFile reviewer placeholder missing');
if (decisionFile?.reviewedAt !== '<YYYY-MM-DD>') failures.push('draft decisionFile reviewedAt placeholder missing');
if (decisionFile?.policy?.humanAuthored !== true) failures.push('draft decisionFile must preserve humanAuthored policy');
if (!Array.isArray(decisionFile?.decisions) || decisionFile.decisions.length !== 1) failures.push('draft decisionFile must contain exactly one decision');
if (decision?.id !== target?.id) failures.push('draft decision target mismatch');
if (decision?.status !== 'needs-review') failures.push('draft decision must default to needs-review');
if (decision?.overallNote !== '') failures.push('draft decision overallNote must default empty');
if (decision?.reviewer !== '<human-reviewer>') failures.push('draft decision reviewer placeholder missing');
if (decision?.reviewedAt !== '<YYYY-MM-DD>') failures.push('draft decision reviewedAt placeholder missing');
if (!Array.isArray(decision?.failedChecks) || decision.failedChecks.length !== 0) failures.push('draft decision failedChecks must default empty');
if (decision?.evidenceFingerprint?.digest !== expectedDecision?.evidenceFingerprint?.digest) failures.push('draft decision evidence fingerprint digest mismatch');
for (const key of ['source', 'keyPreview', 'sandboxScreenshot', 'planPreview']) {
  const media = decision?.evidenceFingerprint?.files?.[key];
  if (media?.exists !== true || !media?.sha256 || !media?.size) failures.push(`draft decision missing valid ${key} fingerprint`);
}
const visualChecks = Object.keys(decision?.visualChecks ?? {});
if (visualChecks.length < 10) failures.push('draft visual checks incomplete');
for (const check of visualChecks) {
  if (decision.visualChecks[check]?.score !== null) failures.push(`${check}: draft score must default null`);
  if (decision.visualChecks[check]?.note !== '') failures.push(`${check}: draft note must default empty`);
}
if (!String(report?.commands?.strictDryRun ?? '').includes('water9-source-cohesion-reviewed-decisions.json')) failures.push('strictDryRun must use reviewed-only decision file');
if (!String(report?.commands?.strictApply ?? '').includes('water9-source-cohesion-reviewed-decisions.json')) failures.push('strictApply must use reviewed-only decision file');
for (const command of [report?.commands?.strictDryRun, report?.commands?.strictApply]) {
  if (String(command ?? '').includes('water9-source-cohesion-decisions.json')) failures.push('draft commands must not use generic source cohesion decision file');
}

for (const required of [
  'Water 9 Next Source Decision Draft',
  'This focused draft does not approve source art',
  'human reviewer',
  'water9-source-cohesion-reviewed-decisions.json',
  'data-source-next-decision-draft',
  'data-source-next-decision-json',
  '"schema": "water9/source-cohesion-decisions@1"',
  '"status": "needs-review"',
  '"failedChecks": []',
  `data-source-next-decision-target="${target?.id}"`,
  target?.id,
  target?.species,
]) {
  if (!markdown.includes(required) && !includesRendered(html, required)) failures.push(`rendered output missing ${required}`);
}

const result = {
  schema: 'water9/source-next-decision-draft-check@1',
  target: target?.id ?? null,
  status: decision?.status ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}

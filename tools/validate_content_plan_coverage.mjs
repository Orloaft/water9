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
  report: resolve(String(args.get('json') ?? 'public/review/content-plan-coverage.json')),
  markdown: resolve(String(args.get('md') ?? 'public/review/content-plan-coverage.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-plan-coverage.html')),
  candidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  runtimeCoverage: resolve(String(args.get('runtime-coverage') ?? 'public/review/content-runtime-coverage.json')),
  acceptanceRunway: resolve(String(args.get('acceptance-runway') ?? 'public/review/content-acceptance-runway.json')),
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

function includesHtml(text, value) {
  const escaped = String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  return text.includes(value) || text.includes(escaped);
}

const report = await readJson('plan coverage report', paths.report);
const candidatesFile = await readJson('source candidates', paths.candidates);
const runtimeCoverage = await readJson('runtime coverage', paths.runtimeCoverage);
const runway = await readJson('acceptance runway', paths.acceptanceRunway);
const markdown = await readText('plan coverage markdown', paths.markdown);
const html = await readText('plan coverage html', paths.html);
await fileOk('plan coverage json', paths.report, 1024);
await fileOk('plan coverage markdown', paths.markdown, 1024);
await fileOk('plan coverage html', paths.html, 2048);

if (report?.schema !== 'water9/content-plan-coverage@1') failures.push(`plan coverage schema is ${report?.schema ?? 'missing'}`);
if (candidatesFile?.schema !== 'water9/source-candidates@1') failures.push(`source candidates schema is ${candidatesFile?.schema ?? 'missing'}`);
if (runtimeCoverage?.schema !== 'water9/content-runtime-coverage@1') failures.push(`runtime coverage schema is ${runtimeCoverage?.schema ?? 'missing'}`);
if (runway?.schema !== 'water9/content-acceptance-runway@1') failures.push(`acceptance runway schema is ${runway?.schema ?? 'missing'}`);

const candidates = candidatesFile?.candidates ?? [];
const runtimeById = new Map((runtimeCoverage?.items ?? []).map((item) => [item.id, item]));
const runwayById = new Map((runway?.items ?? []).map((item) => [item.id, item]));
const items = Array.isArray(report?.items) ? report.items : [];
const itemById = new Map(items.map((item) => [item.id, item]));
if (items.length !== candidates.length) failures.push(`plan coverage items ${items.length} does not match candidates ${candidates.length}`);

for (const candidate of candidates) {
  const item = itemById.get(candidate.id);
  const runtime = runtimeById.get(candidate.id);
  const runwayItem = runwayById.get(candidate.id);
  if (!item) {
    failures.push(`${candidate.id}: missing from plan coverage`);
    continue;
  }
  if (item.species !== candidate.species) failures.push(`${candidate.id}: species mismatch`);
  if (item.hasSource !== Boolean(candidate.source)) failures.push(`${candidate.id}: hasSource mismatch`);
  if (item.source !== (candidate.source ?? null)) failures.push(`${candidate.id}: source mismatch`);
  if (item.sourceApproved !== (runwayItem?.sourceApproved === true)) failures.push(`${candidate.id}: sourceApproved mismatch`);
  if (item.runtimeRegistered !== (runtime?.runtimeRegistered === true)) failures.push(`${candidate.id}: runtimeRegistered mismatch`);
  if (item.runtimeId !== (runtime?.runtimeId ?? null)) failures.push(`${candidate.id}: runtimeId mismatch`);
  if (item.accepted !== (runwayItem?.threatAccepted === true)) failures.push(`${candidate.id}: accepted mismatch`);
  if (item.plan !== `tools/scratch/${candidate.id}-starter-plan.json`) failures.push(`${candidate.id}: plan path mismatch`);
  if (item.planPreview !== `public/review/articulated/${candidate.id}-plan-preview.png`) failures.push(`${candidate.id}: plan preview path mismatch`);
  if (item.artifacts?.plan?.path !== item.plan) failures.push(`${candidate.id}: plan artifact path mismatch`);
  if (item.artifacts?.planPreview?.path !== item.planPreview) failures.push(`${candidate.id}: plan preview artifact path mismatch`);
  if (item.artifacts?.plan?.exists && (item.artifacts.plan.bytes ?? 0) < 512) failures.push(`${candidate.id}: plan artifact is too small`);
  if (item.artifacts?.planPreview?.exists && (item.artifacts.planPreview.bytes ?? 0) < 1024) failures.push(`${candidate.id}: plan preview artifact is too small`);
  if (!String(item.commands?.mechanicalPrepare ?? '').includes(`--id ${candidate.id}`)) failures.push(`${candidate.id}: mechanicalPrepare must target id`);
  if (!String(item.commands?.mechanicalPrepare ?? '').includes('--allow-unapproved')) failures.push(`${candidate.id}: mechanicalPrepare must include --allow-unapproved`);
  if (String(item.commands?.productionPrepare ?? '').includes('--allow-unapproved')) failures.push(`${candidate.id}: productionPrepare must not include --allow-unapproved`);
  if (!String(item.commands?.runtimePreview ?? '').includes('--with diver')) failures.push(`${candidate.id}: runtimePreview must include diver`);
  for (const expected of [candidate.id, candidate.species, item.commands.mechanicalPrepare]) {
    if (!markdown.includes(expected)) failures.push(`${candidate.id}: markdown missing ${expected}`);
    if (!includesHtml(html, expected)) failures.push(`${candidate.id}: html missing ${expected}`);
  }
}

const expectedMissingPlans = items.filter((item) => !item.artifacts?.plan?.exists).map((item) => item.id);
const expectedMissingPreviews = items.filter((item) => !item.artifacts?.planPreview?.exists).map((item) => item.id);
if ((report?.summary?.candidates ?? -1) !== items.length) failures.push('summary candidates mismatch');
if ((report?.summary?.sourceImages ?? -1) !== items.filter((item) => item.hasSource).length) failures.push('summary sourceImages mismatch');
if ((report?.summary?.approvedSources ?? -1) !== items.filter((item) => item.sourceApproved).length) failures.push('summary approvedSources mismatch');
if ((report?.summary?.planArtifacts ?? -1) !== items.filter((item) => item.artifacts?.plan?.exists).length) failures.push('summary planArtifacts mismatch');
if ((report?.summary?.planPreviews ?? -1) !== items.filter((item) => item.artifacts?.planPreview?.exists).length) failures.push('summary planPreviews mismatch');
if ((report?.summary?.missingPlanArtifacts ?? -1) !== expectedMissingPlans.length) failures.push('summary missingPlanArtifacts mismatch');
if ((report?.summary?.missingPlanPreviews ?? -1) !== expectedMissingPreviews.length) failures.push('summary missingPlanPreviews mismatch');
if ((report?.summary?.runtimeRegistered ?? -1) !== items.filter((item) => item.runtimeRegistered).length) failures.push('summary runtimeRegistered mismatch');
if ((report?.summary?.acceptedThreats ?? -1) !== items.filter((item) => item.accepted).length) failures.push('summary acceptedThreats mismatch');
if ((report?.missingPlanIds ?? []).join('|') !== expectedMissingPlans.join('|')) failures.push('missingPlanIds mismatch');
if ((report?.missingPlanPreviewIds ?? []).join('|') !== expectedMissingPreviews.join('|')) failures.push('missingPlanPreviewIds mismatch');
if (report?.commands?.mechanicalPrepareMissing && !String(report.commands.mechanicalPrepareMissing).includes('--allow-unapproved')) failures.push('mechanicalPrepareMissing must include --allow-unapproved');
if (report?.commands?.productionPrepareApproved && String(report.commands.productionPrepareApproved).includes('--allow-unapproved')) failures.push('productionPrepareApproved must not include --allow-unapproved');
for (const expected of [
  'Water 9 Plan Coverage',
  'Mechanical staging is not production acceptance',
  'Batch Commands',
  'Mechanical staging for candidates missing a plan or preview',
]) {
  if (!markdown.includes(expected)) failures.push(`markdown missing ${expected}`);
  if (!includesHtml(html, expected)) failures.push(`html missing ${expected}`);
}

const summary = {
  schema: 'water9/content-plan-coverage-check@1',
  candidates: report?.summary?.candidates ?? null,
  planArtifacts: report?.summary?.planArtifacts ?? null,
  planPreviews: report?.summary?.planPreviews ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

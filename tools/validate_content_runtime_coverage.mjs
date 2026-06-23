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
  report: resolve(String(args.get('json') ?? 'public/review/content-runtime-coverage.json')),
  markdown: resolve(String(args.get('md') ?? 'public/review/content-runtime-coverage.md')),
  candidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  runtime: resolve(String(args.get('runtime') ?? 'public/assets/generated/articulated-creatures.parts.json')),
  runway: resolve(String(args.get('acceptance-runway') ?? 'public/review/content-acceptance-runway.json')),
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

function runtimeForCandidate(runtime, candidate) {
  return (runtime?.creatures ?? []).find((creature) => (
    creature.quality?.sourceCandidateId === candidate.id
    || candidate.riggedCreatureId === creature.id
    || creature.id === candidate.id
  )) ?? null;
}

const report = await readJson('runtime coverage report', paths.report);
const candidatesFile = await readJson('source candidates', paths.candidates);
const runtime = await readJson('runtime manifest', paths.runtime);
const runway = await readJson('acceptance runway', paths.runway);
const markdown = await readText('runtime coverage markdown', paths.markdown);
await fileOk('runtime coverage json', paths.report, 1024);
await fileOk('runtime coverage markdown', paths.markdown, 1024);

if (report?.schema !== 'water9/content-runtime-coverage@1') failures.push(`runtime coverage schema is ${report?.schema ?? 'missing'}`);
if (candidatesFile?.schema !== 'water9/source-candidates@1') failures.push(`source candidates schema is ${candidatesFile?.schema ?? 'missing'}`);
if (!Array.isArray(runtime?.creatures)) failures.push('runtime manifest missing creatures[]');
if (runway?.schema !== 'water9/content-acceptance-runway@1') failures.push(`acceptance runway schema is ${runway?.schema ?? 'missing'}`);

const candidates = candidatesFile?.candidates ?? [];
const runwayById = new Map((runway?.items ?? []).map((item) => [item.id, item]));
const items = Array.isArray(report?.items) ? report.items : [];
if (items.length !== candidates.length) failures.push(`runtime coverage items ${items.length} does not match source candidates ${candidates.length}`);
const itemById = new Map(items.map((item) => [item.id, item]));
const expectedMissing = [];
const expectedRegistered = [];

for (const candidate of candidates) {
  const item = itemById.get(candidate.id);
  const runtimeCreature = runtimeForCandidate(runtime, candidate);
  const runwayItem = runwayById.get(candidate.id);
  if (!item) {
    failures.push(`${candidate.id}: missing from runtime coverage`);
    continue;
  }
  if (item.species !== candidate.species) failures.push(`${candidate.id}: species mismatch`);
  if (item.source !== (candidate.source ?? null)) failures.push(`${candidate.id}: source mismatch`);
  if (item.sourceApproved !== (runwayItem?.sourceApproved === true)) failures.push(`${candidate.id}: sourceApproved mismatch`);
  if (item.runtimeRegistered !== Boolean(runtimeCreature)) failures.push(`${candidate.id}: runtimeRegistered mismatch`);
  if (item.runtimeId !== (runtimeCreature?.id ?? null)) failures.push(`${candidate.id}: runtimeId mismatch`);
  if (item.runtimeQualityStatus !== (runtimeCreature?.quality?.status ?? null)) failures.push(`${candidate.id}: runtime quality status mismatch`);
  if (item.accepted !== (runwayItem?.threatAccepted === true)) failures.push(`${candidate.id}: accepted mismatch`);
  if (item.stage !== (runwayItem?.stage ?? null)) failures.push(`${candidate.id}: stage mismatch`);
  if (!String(item.riggingCommand ?? '').includes(`--id ${candidate.id}`)) failures.push(`${candidate.id}: rigging command must target candidate id`);
  if (runtimeCreature) expectedRegistered.push(candidate.id);
  else expectedMissing.push(candidate.id);
  for (const expected of [candidate.id, candidate.species, item.riggingCommand]) {
    if (expected && !markdown.includes(expected)) failures.push(`${candidate.id}: markdown missing ${expected}`);
  }
}

if (report?.summary?.candidates !== candidates.length) failures.push('summary candidates mismatch');
if (report?.summary?.sourceImages !== candidates.filter((candidate) => candidate.source).length) failures.push('summary sourceImages mismatch');
if (report?.summary?.approvedSources !== items.filter((item) => item.sourceApproved).length) failures.push('summary approvedSources mismatch');
if (report?.summary?.runtimeRegistered !== expectedRegistered.length) failures.push('summary runtimeRegistered mismatch');
if (report?.summary?.missingRuntime !== expectedMissing.length) failures.push('summary missingRuntime mismatch');
if (report?.summary?.acceptedThreats !== items.filter((item) => item.accepted).length) failures.push('summary acceptedThreats mismatch');
if ((report?.missingRuntimeIds ?? []).join('|') !== expectedMissing.join('|')) failures.push('missingRuntimeIds mismatch');
if ((report?.registeredRuntimeIds ?? []).join('|') !== expectedRegistered.join('|')) failures.push('registeredRuntimeIds mismatch');
for (const expected of [
  'Water 9 Runtime Coverage',
  'This report tracks whether each source candidate has a registered articulated runtime threat',
  'Missing Runtime',
  'Runtime registered',
  'Accepted threats',
]) {
  if (!markdown.includes(expected)) failures.push(`markdown missing ${expected}`);
}

const summary = {
  schema: 'water9/content-runtime-coverage-check@1',
  candidates: candidates.length,
  runtimeRegistered: report?.summary?.runtimeRegistered ?? null,
  missingRuntime: report?.summary?.missingRuntime ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

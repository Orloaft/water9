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
  doctor: resolve(String(args.get('json') ?? 'public/review/content-acceptance-doctor.json')),
  markdown: resolve(String(args.get('md') ?? 'public/review/content-acceptance-doctor.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-acceptance-doctor.html')),
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

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function includesHtml(text, value) {
  return text.includes(value) || text.includes(htmlEscape(value));
}

const doctor = await readJson('acceptance doctor', paths.doctor);
const runway = await readJson('acceptance runway', paths.acceptanceRunway);
const markdown = await readText('acceptance doctor markdown', paths.markdown);
const html = await readText('acceptance doctor html', paths.html);

await fileOk('acceptance doctor json', paths.doctor, 1024);
await fileOk('acceptance doctor markdown', paths.markdown, 1024);
await fileOk('acceptance doctor html', paths.html, 2048);

if (doctor?.schema !== 'water9/content-acceptance-doctor@1') failures.push(`doctor schema is ${doctor?.schema ?? 'missing'}`);
if (runway?.schema !== 'water9/content-acceptance-runway@1') failures.push(`runway schema is ${runway?.schema ?? 'missing'}`);

const doctorItems = Array.isArray(doctor?.items) ? doctor.items : [];
const runwayItems = Array.isArray(runway?.items) ? runway.items : [];
const doctorById = new Map(doctorItems.map((item) => [item.id, item]));
if (doctorItems.length !== runwayItems.length) failures.push(`doctor items ${doctorItems.length} does not match runway items ${runwayItems.length}`);
if ((doctor?.summary?.candidates ?? -1) !== runwayItems.length) failures.push('doctor summary candidates mismatch');
if ((doctor?.summary?.acceptedThreats ?? -1) !== (runway?.summary?.acceptedThreats ?? -2)) failures.push('doctor acceptedThreats mismatch');
if ((doctor?.summary?.targetThreats ?? -1) !== (runway?.summary?.targetThreats ?? -2)) failures.push('doctor targetThreats mismatch');
if ((doctor?.summary?.sourceBlocked ?? -1) !== doctorItems.filter((item) => item.sourceBlockers?.length > 0).length) failures.push('doctor sourceBlocked summary mismatch');
if ((doctor?.summary?.runtimeBlocked ?? -1) !== doctorItems.filter((item) => item.runtimeBlockers?.length > 0).length) failures.push('doctor runtimeBlocked summary mismatch');
if ((doctor?.summary?.acceptanceBlocked ?? -1) !== doctorItems.filter((item) => item.acceptanceBlockers?.length > 0).length) failures.push('doctor acceptanceBlocked summary mismatch');

for (const runwayItem of runwayItems) {
  const item = doctorById.get(runwayItem.id);
  if (!item) {
    failures.push(`${runwayItem.id}: missing from doctor`);
    continue;
  }
  if (item.species !== runwayItem.species) failures.push(`${runwayItem.id}: species mismatch`);
  if (item.stage !== runwayItem.stage) failures.push(`${runwayItem.id}: stage mismatch`);
  if (item.nextCommand !== runwayItem.nextAction) failures.push(`${runwayItem.id}: next command mismatch`);
  if (item.hasSourceImage !== Boolean(runwayItem.hasSourceImage)) failures.push(`${runwayItem.id}: hasSourceImage mismatch`);
  if (item.sourceApproved !== Boolean(runwayItem.sourceApproved)) failures.push(`${runwayItem.id}: sourceApproved mismatch`);
  if (item.runtimeRegistered !== Boolean(runwayItem.runtimeRegistered)) failures.push(`${runwayItem.id}: runtimeRegistered mismatch`);
  if (item.threatAccepted !== Boolean(runwayItem.threatAccepted)) failures.push(`${runwayItem.id}: threatAccepted mismatch`);
  if (!Array.isArray(item.sourceBlockers)) failures.push(`${runwayItem.id}: sourceBlockers must be an array`);
  if (!Array.isArray(item.runtimeBlockers)) failures.push(`${runwayItem.id}: runtimeBlockers must be an array`);
  if (!Array.isArray(item.acceptanceBlockers)) failures.push(`${runwayItem.id}: acceptanceBlockers must be an array`);
  if (!Array.isArray(item.allBlockers) || item.allBlockers.length !== item.sourceBlockers.length + item.runtimeBlockers.length + item.acceptanceBlockers.length) {
    failures.push(`${runwayItem.id}: allBlockers must combine blocker categories`);
  }
  if (!item.severity) failures.push(`${runwayItem.id}: severity missing`);
  if (!item.nextCommand) failures.push(`${runwayItem.id}: nextCommand missing`);
  if (!markdown.includes(runwayItem.id)) failures.push(`${runwayItem.id}: markdown missing id`);
  if (!includesHtml(html, `data-acceptance-doctor-candidate="${runwayItem.id}"`)) failures.push(`${runwayItem.id}: html missing candidate marker`);
  if (!includesHtml(html, item.nextCommand)) failures.push(`${runwayItem.id}: html missing next command`);
}

for (const expected of [
  'Water 9 Acceptance Doctor',
  'Read-only compact diagnostic report',
  'Source Blockers',
  'Runtime Blockers',
  'Acceptance Blockers',
  'npm run content:acceptance-doctor',
  'npm run content:acceptance-doctor-check',
]) {
  if (!markdown.includes(expected)) failures.push(`markdown missing ${expected}`);
  if (!includesHtml(html, expected)) failures.push(`html missing ${expected}`);
}

const result = {
  schema: 'water9/content-acceptance-doctor-check@1',
  candidates: doctor?.summary?.candidates ?? null,
  sourceBlocked: doctor?.summary?.sourceBlocked ?? null,
  runtimeBlocked: doctor?.summary?.runtimeBlocked ?? null,
  acceptanceBlocked: doctor?.summary?.acceptanceBlocked ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}

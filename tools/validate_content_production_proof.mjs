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
  json: resolve(String(args.get('json') ?? 'public/review/content-production-proof.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-production-proof.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-production-proof.html')),
  stageBoard: resolve(String(args.get('stage-board') ?? 'public/review/content-stage-board.json')),
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

const report = await readJson('production proof', paths.json);
const stageBoard = await readJson('stage board', paths.stageBoard);
const markdown = await readText('production proof markdown', paths.markdown);
const html = await readText('production proof html', paths.html);
await fileOk('production proof markdown', paths.markdown, 1024);
await fileOk('production proof html', paths.html, 4096);

if (report?.schema !== 'water9/content-production-proof@1') failures.push(`unexpected schema ${report?.schema ?? 'missing'}`);
if (stageBoard?.schema !== 'water9/content-stage-board@1') failures.push(`unexpected stage board schema ${stageBoard?.schema ?? 'missing'}`);
const items = Array.isArray(report?.items) ? report.items : [];
const stageTargets = Array.isArray(stageBoard?.targets) ? stageBoard.targets : [];
if (items.length < minThreats) failures.push(`items ${items.length} below ${minThreats}`);
if (items.length !== stageTargets.length) failures.push(`items ${items.length} do not match stage board targets ${stageTargets.length}`);
if ((report?.summary?.candidates ?? -1) !== items.length) failures.push('summary candidates mismatch');
if ((report?.summary?.targetThreats ?? -1) !== (stageBoard?.summary?.targetThreats ?? minThreats)) failures.push('summary targetThreats mismatch');
if ((report?.summary?.acceptedThreats ?? -1) !== items.filter((item) => item.countsTowardGoal).length) failures.push('summary acceptedThreats mismatch');
if ((report?.summary?.prototypeOnly ?? -1) !== items.filter((item) => item.productionStatus === 'prototype-only').length) failures.push('summary prototypeOnly mismatch');
if ((report?.summary?.humanReviewRequired ?? -1) !== items.filter((item) => !item.countsTowardGoal).length) failures.push('summary humanReviewRequired mismatch');
if (report?.summary?.strictProductionReady !== ((report?.summary?.acceptedThreats ?? 0) >= (report?.summary?.targetThreats ?? minThreats))) {
  failures.push('summary strictProductionReady mismatch');
}
if (report?.policy?.humanReviewerRequired !== true) failures.push('policy must require human reviewer');
if (report?.policy?.automationCannotAcceptProduction !== true) failures.push('policy must block automation production acceptance');
if (report?.policy?.prototypePreviewIsNotProductionAcceptance !== true) failures.push('policy must state prototype previews are not production acceptance');
if (!String(report?.policy?.acceptanceRule ?? '').includes('source art is human-approved')) failures.push('acceptance rule must mention source human approval');
if (!String(report?.policy?.acceptanceRule ?? '').includes('human threat acceptance')) failures.push('acceptance rule must mention human threat acceptance');

const stageById = new Map(stageTargets.map((item) => [item.id, item]));
for (const item of items) {
  const stage = stageById.get(item.id);
  if (!stage) failures.push(`${item.id}: missing stage board target`);
  if (stage && item.species !== stage.species) failures.push(`${item.id}: species mismatch`);
  if (item.countsTowardGoal && item.blockers.length > 0) failures.push(`${item.id}: accepted item cannot have blockers`);
  if (!item.countsTowardGoal && item.blockers.length < 1) failures.push(`${item.id}: blocked item must explain blockers`);
  if (item.rigStatus === 'prototype' && item.productionStatus !== 'prototype-only') failures.push(`${item.id}: prototype rig must be prototype-only`);
  if (item.productionStatus === 'prototype-only' && item.countsTowardGoal) failures.push(`${item.id}: prototype-only item cannot count toward gate`);
  if (!Array.isArray(item.commands) || !item.commands.some((command) => String(command).includes('npm run sandbox:preview'))) {
    failures.push(`${item.id}: missing sandbox preview command`);
  }
  if (!Array.isArray(item.commands) || !item.commands.some((command) => String(command).includes('npm run source:accept') && String(command).includes('--dry-run'))) {
    failures.push(`${item.id}: missing dry-run source approval command`);
  }
  if (!Array.isArray(item.commands) || !item.commands.some((command) => String(command).includes('npm run content:accept') && String(command).includes('--dry-run'))) {
    failures.push(`${item.id}: missing dry-run threat acceptance command`);
  }
  for (const required of [
    item.id,
    item.species,
    `data-production-proof="${item.id}"`,
    item.productionStatus,
  ]) {
    if (!markdown.includes(String(required)) && !includesRendered(html, required)) failures.push(`${item.id}: rendered outputs missing ${required}`);
  }
}

for (const required of [
  'Water9 Production Proof',
  'Prototype preview is not production acceptance',
  'Strict production ready',
  'Acceptance Rule',
  'npm run content:production-proof',
  'npm run content:production-proof-check',
  'data-production-proof',
]) {
  if (!markdown.includes(required) && !includesRendered(html, required)) failures.push(`rendered outputs missing ${required}`);
}

const summary = {
  schema: 'water9/content-production-proof-check@1',
  candidates: items.length,
  acceptedThreats: report?.summary?.acceptedThreats ?? null,
  strictProductionReady: report?.summary?.strictProductionReady ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

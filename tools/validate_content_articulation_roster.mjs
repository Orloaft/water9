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
  json: resolve(String(args.get('json') ?? 'public/review/content-articulation-roster.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-articulation-roster.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-articulation-roster.html')),
  signoff: resolve(String(args.get('signoff') ?? 'public/review/content-human-signoff-queue.json')),
  candidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  planCoverage: resolve(String(args.get('plan-coverage') ?? 'public/review/content-plan-coverage.json')),
  sandboxRoster: resolve(String(args.get('sandbox-roster') ?? 'public/review/content-sandbox-roster.json')),
  riggingPackIndex: resolve(String(args.get('rigging-pack-index') ?? 'public/review/rigging-packs/index.json')),
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

async function fileOk(label, path, minSize = 128) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minSize) failures.push(`${label}: missing or too small`);
    return info.isFile() && info.size >= minSize;
  } catch {
    failures.push(`${label}: missing`);
    return false;
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function textIncludes(text, value) {
  return text.includes(String(value ?? '')) || text.includes(htmlEscape(value));
}

function assertCommand(owner, label, command, expected) {
  const text = String(command ?? '');
  if (!text.includes(expected)) failures.push(`${owner}: ${label} command must include ${expected}`);
}

const roster = await readJson('content articulation roster', paths.json);
const signoff = await readJson('human sign-off queue', paths.signoff);
const candidates = await readJson('source candidates', paths.candidates);
const planCoverage = await readJson('plan coverage', paths.planCoverage);
const sandboxRoster = await readJson('sandbox roster', paths.sandboxRoster);
const riggingPackIndex = await readJson('rigging pack index', paths.riggingPackIndex);
const markdown = await readText('content articulation roster markdown', paths.markdown);
const html = await readText('content articulation roster html', paths.html);
await fileOk('content articulation roster markdown', paths.markdown, 1024);
await fileOk('content articulation roster html', paths.html, 4096);

if (roster?.schema !== 'water9/content-articulation-roster@1') failures.push(`unexpected roster schema ${roster?.schema ?? 'missing'}`);
if (signoff?.schema !== 'water9/content-human-signoff-queue@1') failures.push(`unexpected sign-off schema ${signoff?.schema ?? 'missing'}`);
if (candidates?.schema !== 'water9/source-candidates@1') failures.push(`unexpected source candidate schema ${candidates?.schema ?? 'missing'}`);
if (planCoverage?.schema !== 'water9/content-plan-coverage@1') failures.push(`unexpected plan coverage schema ${planCoverage?.schema ?? 'missing'}`);
if (sandboxRoster?.schema !== 'water9/content-sandbox-roster@1') failures.push(`unexpected sandbox roster schema ${sandboxRoster?.schema ?? 'missing'}`);
if (riggingPackIndex?.schema !== 'water9/rigging-focus-pack-index@1') failures.push(`unexpected rigging pack index schema ${riggingPackIndex?.schema ?? 'missing'}`);

const items = Array.isArray(roster?.items) ? roster.items : [];
const signoffItems = Array.isArray(signoff?.items) ? signoff.items : [];
const candidateById = new Map((candidates?.candidates ?? []).map((candidate) => [candidate.id, candidate]));
const planById = new Map((planCoverage?.items ?? []).map((item) => [item.id, item]));
const sandboxById = new Map((sandboxRoster?.items ?? []).map((item) => [item.id, item]));
const riggingPackById = new Map((riggingPackIndex?.packs ?? []).map((pack) => [pack.id, pack]));
const signoffById = new Map(signoffItems.map((item) => [item.id, item]));

if (items.length < minThreats) failures.push(`roster has ${items.length} items, expected at least ${minThreats}`);
if (items.length !== signoffItems.length) failures.push(`roster item count ${items.length} does not match sign-off ${signoffItems.length}`);
if ((roster?.summary?.items ?? -1) !== items.length) failures.push('summary items mismatch');
if ((roster?.summary?.targetThreats ?? -1) !== (signoff?.summary?.targetThreats ?? minThreats)) failures.push('summary targetThreats mismatch');
if ((roster?.summary?.mechanicallyReady ?? -1) !== items.filter((item) => item.mechanicallyReady).length) failures.push('summary mechanicallyReady mismatch');
if ((roster?.summary?.magentaSourceImages ?? -1) !== items.filter((item) => item.checks?.magentaKeyDeclared).length) failures.push('summary magentaSourceImages mismatch');
if ((roster?.summary?.starterPlans ?? -1) !== items.filter((item) => item.checks?.starterPlanPresent).length) failures.push('summary starterPlans mismatch');
if ((roster?.summary?.planPreviews ?? -1) !== items.filter((item) => item.checks?.planPreviewPresent).length) failures.push('summary planPreviews mismatch');
if ((roster?.summary?.sourceParity ?? -1) !== items.filter((item) => item.checks?.sourceParityPresent).length) failures.push('summary sourceParity mismatch');
if ((roster?.summary?.visualCohesionPasses ?? -1) !== items.filter((item) => item.checks?.visualCohesionPassed).length) failures.push('summary visualCohesionPasses mismatch');
if ((roster?.summary?.pairedRuntimeSandbox ?? -1) !== items.filter((item) => item.checks?.pairedRuntimeSandboxPresent).length) failures.push('summary pairedRuntimeSandbox mismatch');
if ((roster?.summary?.pairedSourceSandbox ?? -1) !== items.filter((item) => item.checks?.pairedSourceSandboxPresent).length) failures.push('summary pairedSourceSandbox mismatch');

for (const item of items) {
  const signoffItem = signoffById.get(item.id);
  const candidate = candidateById.get(item.id);
  const plan = planById.get(item.id);
  const sandbox = sandboxById.get(item.id);
  const riggingPack = riggingPackById.get(item.id);

  if (!signoffItem) failures.push(`${item.id}: missing sign-off item`);
  if (!candidate) failures.push(`${item.id}: missing source candidate`);
  if (!plan) failures.push(`${item.id}: missing plan coverage row`);
  if (!sandbox) failures.push(`${item.id}: missing sandbox roster row`);
  if (!riggingPack) failures.push(`${item.id}: missing rigging pack row`);
  if (signoffItem && item.species !== signoffItem.species) failures.push(`${item.id}: species mismatch`);
  if (candidate && item.source?.path !== candidate.source) failures.push(`${item.id}: source path mismatch`);
  if (candidate && item.source?.backgroundKey !== candidate.backgroundKey) failures.push(`${item.id}: background key mismatch`);
  if (candidate?.backgroundKey !== 'magenta') failures.push(`${item.id}: source candidate must declare magenta background key`);
  if (!item.checks?.magentaKeyDeclared) failures.push(`${item.id}: roster did not mark magenta key declared`);

  const expectedPlan = `tools/scratch/${item.id}-starter-plan.json`;
  assertCommand(item.id, 'mechanical prepare', item.commands?.mechanicalPrepare, `--id ${item.id}`);
  assertCommand(item.id, 'mechanical prepare', item.commands?.mechanicalPrepare, expectedPlan);
  assertCommand(item.id, 'plan check', item.commands?.planCheck, expectedPlan);
  assertCommand(item.id, 'plan preview', item.commands?.planPreview, expectedPlan);
  assertCommand(item.id, 'extract dry-run', item.commands?.extractDryRun, expectedPlan);
  assertCommand(item.id, 'extract dry-run', item.commands?.extractDryRun, '--dry-run');
  assertCommand(item.id, 'runtime sandbox', item.commands?.pairedSandboxPreview, `--id ${item.id}`);
  assertCommand(item.id, 'runtime sandbox', item.commands?.pairedSandboxPreview, '--with diver');
  assertCommand(item.id, 'source sandbox', item.commands?.sourceSandboxPreview, `--id source-${item.id}`);
  assertCommand(item.id, 'source sandbox', item.commands?.sourceSandboxPreview, '--with diver');
  assertCommand(item.id, 'paired visual', item.commands?.pairedSandboxVisual, `--ids ${item.id}`);
  assertCommand(item.id, 'paired visual', item.commands?.pairedSandboxVisual, '--with diver');

  const evidenceChecks = [
    ['source', item.artifacts?.source],
    ['key preview', item.artifacts?.keyPreview],
    ['art contract', item.artifacts?.artContract],
    ['starter plan', item.artifacts?.plan],
    ['plan preview', item.artifacts?.planPreview],
    ['source parity', item.artifacts?.sourceParity],
    ['contact sheet', item.artifacts?.contactSheet],
    ['phase strip', item.artifacts?.phaseStrip],
  ];
  for (const [label, artifact] of evidenceChecks) {
    if (!artifact?.exists) failures.push(`${item.id}: missing ${label} evidence`);
  }
  if (item.review?.visualCohesionStatus !== 'pass') failures.push(`${item.id}: visual cohesion must pass mechanical check`);
  if (!item.mechanicallyReady) failures.push(`${item.id}: item should be mechanically ready for human review`);

  for (const value of [
    item.id,
    item.species,
    item.source?.path,
    item.source?.backgroundKey,
    item.commands?.mechanicalPrepare,
    item.commands?.extractDryRun,
    item.commands?.pairedSandboxPreview,
    item.commands?.sourceSandboxPreview,
    `data-articulation-roster="${item.id}"`,
  ]) {
    if (value && !markdown.includes(String(value)) && !textIncludes(html, value)) failures.push(`${item.id}: rendered outputs missing ${value}`);
  }
}

for (const required of [
  'Water9 Content Articulation Roster',
  'Source-to-articulation quality path',
  'Previewable and extractable still does not mean accepted',
  'npm run content:articulation-roster',
  'npm run content:articulation-roster-check',
  'npm run articulated:extract-plan -- --plan <plan.json> --dry-run',
  'npm run articulated:source-parity',
  'npm run articulated:visual-cohesion',
]) {
  if (!markdown.includes(required) && !textIncludes(html, required)) failures.push(`rendered outputs missing ${required}`);
}

const summary = {
  schema: 'water9/content-articulation-roster-check@1',
  items: items.length,
  mechanicallyReady: roster?.summary?.mechanicallyReady ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

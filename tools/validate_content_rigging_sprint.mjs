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
  sprint: resolve(String(args.get('json') ?? 'public/review/content-rigging-sprint.json')),
  markdown: resolve(String(args.get('md') ?? 'public/review/content-rigging-sprint.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-rigging-sprint.html')),
  runtimeCoverage: resolve(String(args.get('runtime-coverage') ?? 'public/review/content-runtime-coverage.json')),
  riggingPacks: resolve(String(args.get('rigging-packs') ?? 'public/review/rigging-packs/index.json')),
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

const sprint = await readJson('rigging sprint', paths.sprint);
const runtimeCoverage = await readJson('runtime coverage', paths.runtimeCoverage);
const riggingPacks = await readJson('rigging packs', paths.riggingPacks);
const markdown = await readText('rigging sprint markdown', paths.markdown);
const html = await readText('rigging sprint html', paths.html);
await fileOk('rigging sprint json', paths.sprint, 1024);
await fileOk('rigging sprint markdown', paths.markdown, 1024);
await fileOk('rigging sprint html', paths.html, 2048);

if (sprint?.schema !== 'water9/content-rigging-sprint@1') failures.push(`rigging sprint schema is ${sprint?.schema ?? 'missing'}`);
if (runtimeCoverage?.schema !== 'water9/content-runtime-coverage@1') failures.push(`runtime coverage schema is ${runtimeCoverage?.schema ?? 'missing'}`);
if (riggingPacks?.schema !== 'water9/rigging-focus-pack-index@1') failures.push(`rigging packs schema is ${riggingPacks?.schema ?? 'missing'}`);

const missingRuntime = (runtimeCoverage?.items ?? []).filter((item) => !item.runtimeRegistered);
const items = Array.isArray(sprint?.items) ? sprint.items : [];
if ((sprint?.summary?.missingRuntimeTotal ?? -1) !== missingRuntime.length) failures.push('summary missingRuntimeTotal mismatch');
if ((sprint?.summary?.sprintSize ?? -1) !== items.length) failures.push('summary sprintSize mismatch');
if ((sprint?.summary?.sourceApprovedInSprint ?? -1) !== items.filter((item) => item.sourceApproved).length) failures.push('summary sourceApprovedInSprint mismatch');
if ((sprint?.summary?.planArtifactsStagedInSprint ?? -1) !== items.filter((item) => item.artifacts?.plan?.exists).length) failures.push('summary planArtifactsStagedInSprint mismatch');
if ((sprint?.summary?.planPreviewsStagedInSprint ?? -1) !== items.filter((item) => item.artifacts?.planPreview?.exists).length) failures.push('summary planPreviewsStagedInSprint mismatch');
if (items.length < 1 && missingRuntime.length > 0) failures.push('rigging sprint must include at least one missing-runtime candidate');
const missingIds = new Set(missingRuntime.map((item) => item.id));
const packIds = new Set((riggingPacks?.packs ?? []).map((pack) => pack.id));
const sprintCommands = sprint?.commands ?? {};

for (const key of ['sourceReviewAll', 'mechanicalDryRunAll', 'postRegisterCoverage']) {
  const command = sprintCommands[key];
  if (!String(command ?? '').trim()) failures.push(`sprint command ${key} is missing`);
  if (command && !markdown.includes(command)) failures.push(`markdown missing sprint command ${key}`);
  if (command && !includesHtml(html, command)) failures.push(`html missing sprint command ${key}`);
}
if (sprintCommands.productionPrepareApproved && sprintCommands.productionPrepareApproved.includes('--allow-unapproved')) {
  failures.push('productionPrepareApproved must not include --allow-unapproved');
}
if (sprintCommands.mechanicalDryRunAll && !sprintCommands.mechanicalDryRunAll.includes('--allow-unapproved')) {
  failures.push('mechanicalDryRunAll must include --allow-unapproved');
}
if (sprintCommands.postRegisterCoverage && !sprintCommands.postRegisterCoverage.includes('npm run content:runtime-coverage-check')) {
  failures.push('postRegisterCoverage must refresh and validate runtime coverage');
}

for (const item of items) {
  if (!missingIds.has(item.id)) failures.push(`${item.id}: sprint item is not missing runtime`);
  if (!packIds.has(item.id)) failures.push(`${item.id}: sprint item missing rigging focus pack`);
  if (item.plan !== `tools/scratch/${item.id}-starter-plan.json`) failures.push(`${item.id}: plan path mismatch`);
  if (item.planPreview !== `public/review/articulated/${item.id}-plan-preview.png`) failures.push(`${item.id}: plan preview path mismatch`);
  if (item.artifacts?.plan?.path !== item.plan) failures.push(`${item.id}: plan artifact path mismatch`);
  if (item.artifacts?.planPreview?.path !== item.planPreview) failures.push(`${item.id}: plan preview artifact path mismatch`);
  if (item.artifacts?.plan?.exists && (item.artifacts.plan.bytes ?? 0) < 512) failures.push(`${item.id}: plan artifact is too small`);
  if (item.artifacts?.planPreview?.exists && (item.artifacts.planPreview.bytes ?? 0) < 1024) failures.push(`${item.id}: plan preview artifact is too small`);
  for (const [key, command] of Object.entries(item.commands ?? {})) {
    if (!String(command ?? '').trim()) failures.push(`${item.id}: command ${key} is missing`);
    if (!markdown.includes(command)) failures.push(`${item.id}: markdown missing command ${key}`);
    if (!includesHtml(html, command)) failures.push(`${item.id}: html missing command ${key}`);
  }
  for (const expected of [
    item.id,
    item.species,
    `data-rigging-sprint-candidate="${item.id}"`,
    'Production Rigging Path',
    'Mechanical Dry Run Only',
    'plan artifact',
    'preview artifact',
    'Production extraction remains gated by human source approval',
  ]) {
    if (!includesHtml(html, expected)) failures.push(`${item.id}: html missing ${expected}`);
  }
  if (!item.commands?.productionPreparePlan?.includes(`--id ${item.id}`)) failures.push(`${item.id}: production prepare command must target id`);
  if (item.commands?.productionPreparePlan?.includes('--allow-unapproved')) failures.push(`${item.id}: production prepare command must not allow unapproved source`);
  if (!item.commands?.mechanicalDryRunPreparePlan?.includes('--allow-unapproved')) failures.push(`${item.id}: mechanical dry-run command must include --allow-unapproved`);
  if (!item.commands?.runtimeVisual?.includes('--with diver') || !item.commands?.runtimeVisual?.includes('--states idle,lunge,stunned')) {
    failures.push(`${item.id}: runtime visual command must cover idle/lunge/stunned with diver`);
  }
  if (!String(sprintCommands.sourceReviewAll ?? '').includes(item.commands.sourceReview)) failures.push(`${item.id}: sourceReviewAll missing source review command`);
  if (!String(sprintCommands.mechanicalDryRunAll ?? '').includes(item.commands.mechanicalDryRunPreparePlan)) failures.push(`${item.id}: mechanicalDryRunAll missing dry-run command`);
  if (item.sourceApproved && !String(sprintCommands.productionPrepareApproved ?? '').includes(item.commands.productionPreparePlan)) {
    failures.push(`${item.id}: productionPrepareApproved missing approved production plan command`);
  }
}

for (const expected of [
  'Water 9 Rigging Sprint',
  'Missing runtime total',
  'Production extraction is still gated by human source approval',
  'Sprint Commands',
  'Mechanical plan-prep smoke for the sprint',
  'Plan artifacts staged',
  'Plan previews staged',
]) {
  if (!markdown.includes(expected)) failures.push(`markdown missing ${expected}`);
}

const summary = {
  schema: 'water9/content-rigging-sprint-check@1',
  missingRuntimeTotal: sprint?.summary?.missingRuntimeTotal ?? null,
  sprintSize: sprint?.summary?.sprintSize ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

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
  handoff: resolve(String(args.get('json') ?? 'public/review/content-approved-runtime-handoff.json')),
  markdown: resolve(String(args.get('md') ?? 'public/review/content-approved-runtime-handoff.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-approved-runtime-handoff.html')),
  runtimeCoverage: resolve(String(args.get('runtime-coverage') ?? 'public/review/content-runtime-coverage.json')),
  planCoverage: resolve(String(args.get('plan-coverage') ?? 'public/review/content-plan-coverage.json')),
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
  return text.includes(value) || text.includes(htmlEscape(value));
}

function planPath(id) {
  return `tools/scratch/${id}-starter-plan.json`;
}

function planPreviewPath(id) {
  return `public/review/articulated/${id}-plan-preview.png`;
}

function expectedCommands(id) {
  const plan = planPath(id);
  const preview = planPreviewPath(id);
  return {
    sourceApprovalReview: `npm run source:approval-runway:preview -- --id ${id}`,
    preparePlan: `npm run articulated:prepare-plan -- --id ${id} --plan ${plan} --preview ${preview}`,
    planCheck: `npm run articulated:plan-check -- --plan ${plan}`,
    extractDryRun: `npm run articulated:extract-plan -- --plan ${plan} --dry-run`,
    extractAndRegister: `npm run articulated:extract-plan -- --plan ${plan}`,
    articulatedCheck: 'npm run articulated:check',
    sandboxIndex: 'npm run sandbox:index',
    runtimeCoverageCheck: 'npm run content:runtime-coverage && npm run content:runtime-coverage-check',
    sandboxPreview: `npm run sandbox:preview -- --id ${id} --with diver --serve --open --visual`,
    sandboxVisual: `npm run sandbox:visual -- --ids ${id} --states idle,lunge,stunned --with diver`,
  };
}

const handoff = await readJson('approved runtime handoff', paths.handoff);
const runtimeCoverage = await readJson('runtime coverage', paths.runtimeCoverage);
const planCoverage = await readJson('plan coverage', paths.planCoverage);
const markdown = await readText('approved runtime handoff markdown', paths.markdown);
const html = await readText('approved runtime handoff html', paths.html);
await fileOk('approved runtime handoff json', paths.handoff, 1024);
await fileOk('approved runtime handoff markdown', paths.markdown, 1024);
await fileOk('approved runtime handoff html', paths.html, 2048);

if (handoff?.schema !== 'water9/content-approved-runtime-handoff@1') failures.push(`handoff schema is ${handoff?.schema ?? 'missing'}`);
if (runtimeCoverage?.schema !== 'water9/content-runtime-coverage@1') failures.push(`runtime coverage schema is ${runtimeCoverage?.schema ?? 'missing'}`);
if (planCoverage?.schema !== 'water9/content-plan-coverage@1') failures.push(`plan coverage schema is ${planCoverage?.schema ?? 'missing'}`);

const runtimeItems = Array.isArray(runtimeCoverage?.items) ? runtimeCoverage.items : [];
const missingRuntime = runtimeItems.filter((item) => !item.runtimeRegistered);
const approvedMissingRuntime = missingRuntime.filter((item) => item.sourceApproved);
const planById = new Map((planCoverage?.items ?? []).map((item) => [item.id, item]));
const handoffItems = Array.isArray(handoff?.items) ? handoff.items : [];
const handoffById = new Map(handoffItems.map((item) => [item.id, item]));

if ((handoff?.summary?.candidates ?? -1) !== (runtimeCoverage?.summary?.candidates ?? -2)) failures.push('handoff candidate summary mismatch');
if ((handoff?.summary?.missingRuntime ?? -1) !== missingRuntime.length) failures.push('handoff missingRuntime summary mismatch');
if ((handoff?.summary?.approvedSourcesMissingRuntime ?? -1) !== approvedMissingRuntime.length) failures.push('handoff approvedSourcesMissingRuntime summary mismatch');
if ((handoff?.summary?.productionEligible ?? -1) !== approvedMissingRuntime.length) failures.push('handoff productionEligible summary mismatch');
if ((handoff?.summary?.riggingEligibleOnly ?? -1) !== approvedMissingRuntime.length) failures.push('handoff riggingEligibleOnly summary mismatch');
if ((handoff?.summary?.blockedUntilSourceApproval ?? -1) !== missingRuntime.filter((item) => !item.sourceApproved).length) failures.push('handoff blockedUntilSourceApproval summary mismatch');
if ((handoff?.approvedMissingRuntimeIds ?? []).join('|') !== approvedMissingRuntime.map((item) => item.id).join('|')) failures.push('handoff approvedMissingRuntimeIds mismatch');
if (handoffItems.length !== missingRuntime.length) failures.push('handoff item count must equal missing runtime count');

for (const runtimeItem of missingRuntime) {
  const item = handoffById.get(runtimeItem.id);
  const plan = planById.get(runtimeItem.id);
  if (!item) {
    failures.push(`${runtimeItem.id}: missing handoff item`);
    continue;
  }
  if (item.species !== runtimeItem.species) failures.push(`${runtimeItem.id}: species mismatch`);
  if (item.sourceApproved !== Boolean(runtimeItem.sourceApproved)) failures.push(`${runtimeItem.id}: sourceApproved mismatch`);
  if (item.runtimeRegistered !== false) failures.push(`${runtimeItem.id}: handoff item should be missing runtime`);
  if (item.productionEligible !== Boolean(runtimeItem.sourceApproved && !runtimeItem.runtimeRegistered)) failures.push(`${runtimeItem.id}: productionEligible mismatch`);
  if (item.riggingEligibleOnly !== Boolean(runtimeItem.sourceApproved && !runtimeItem.runtimeRegistered)) failures.push(`${runtimeItem.id}: riggingEligibleOnly mismatch`);
  if (item.acceptedForContentGate !== false) failures.push(`${runtimeItem.id}: missing-runtime handoff item cannot be accepted for content gate`);
  if (item.plan !== (plan?.plan ?? planPath(runtimeItem.id))) failures.push(`${runtimeItem.id}: plan path mismatch`);
  if (item.planPreview !== (plan?.planPreview ?? planPreviewPath(runtimeItem.id))) failures.push(`${runtimeItem.id}: plan preview path mismatch`);
  if (!item.sourceApproved && !item.blockers?.includes('strict human source approval missing')) failures.push(`${runtimeItem.id}: missing source approval blocker`);
  if (item.sourceApproved && item.blockers?.includes('strict human source approval missing')) failures.push(`${runtimeItem.id}: approved source should not be source-blocked`);
  const commands = expectedCommands(runtimeItem.id);
  for (const [key, expected] of Object.entries(commands)) {
    if (item.commands?.[key] !== expected) failures.push(`${runtimeItem.id}: command ${key} mismatch`);
    if (!markdown.includes(expected)) failures.push(`${runtimeItem.id}: markdown missing command ${key}`);
    if (!includesHtml(html, expected)) failures.push(`${runtimeItem.id}: html missing command ${key}`);
  }
  if (!includesHtml(html, `data-approved-runtime-handoff="${runtimeItem.id}"`)) failures.push(`${runtimeItem.id}: html missing handoff marker`);
  if (!markdown.includes(runtimeItem.id)) failures.push(`${runtimeItem.id}: markdown missing id`);
}

for (const expected of [
  'Water 9 Approved Source Runtime Handoff',
  'Read-only command matrix',
  'Approved Source To Runtime Chain',
  'Rigging eligible handoffs',
  'Accepted for content gate: 0',
  'npm run content:approved-runtime-handoff',
  'npm run content:approved-runtime-handoff-check',
  'npm run content:runtime-coverage && npm run content:runtime-coverage-check',
]) {
  if (!markdown.includes(expected)) failures.push(`markdown missing ${expected}`);
  if (!includesHtml(html, expected)) failures.push(`html missing ${expected}`);
}

const result = {
  schema: 'water9/content-approved-runtime-handoff-check@1',
  missingRuntime: missingRuntime.length,
  approvedSourcesMissingRuntime: approvedMissingRuntime.length,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}

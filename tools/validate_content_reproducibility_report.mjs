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
  report: resolve(String(args.get('json') ?? 'public/review/content-reproducibility.json')),
  markdown: resolve(String(args.get('md') ?? 'public/review/content-reproducibility.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-reproducibility.html')),
  articulationRoster: resolve(String(args.get('articulation-roster') ?? 'public/review/content-articulation-roster.json')),
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

const report = await readJson('content reproducibility report', paths.report);
const articulationRoster = await readJson('content articulation roster', paths.articulationRoster);
const markdown = await readText('content reproducibility markdown', paths.markdown);
const html = await readText('content reproducibility html', paths.html);

await fileOk('content reproducibility json', paths.report, 1024);
await fileOk('content reproducibility markdown', paths.markdown, 1024);
await fileOk('content reproducibility html', paths.html, 2048);

if (report?.schema !== 'water9/content-reproducibility@1') failures.push(`report schema is ${report?.schema ?? 'missing'}`);
if (articulationRoster?.schema !== 'water9/content-articulation-roster@1') failures.push(`articulation roster schema is ${articulationRoster?.schema ?? 'missing'}`);
if (report?.policy?.reportDoesNotApproveSources !== true) failures.push('report must state it does not approve sources');
if (report?.policy?.reportDoesNotAcceptThreats !== true) failures.push('report must state it does not accept threats');
if (report?.policy?.humanApprovalStillRequired !== true) failures.push('report must keep human approval requirement explicit');

const items = Array.isArray(report?.items) ? report.items : [];
const rosterItems = Array.isArray(articulationRoster?.items) ? articulationRoster.items : [];
if ((report?.summary?.items ?? -1) !== items.length) failures.push('summary items mismatch');
if ((report?.summary?.targetThreats ?? -1) !== (articulationRoster?.summary?.targetThreats ?? rosterItems.length)) failures.push('targetThreats mismatch with articulation roster');
if (items.length !== rosterItems.length) failures.push('item count mismatch with articulation roster');
if ((report?.summary?.reproducibleTargets ?? -1) !== items.filter((item) => item.reproducible).length) failures.push('summary reproducibleTargets mismatch');
if ((report?.summary?.magentaSources ?? -1) !== items.filter((item) => item.source?.backgroundKey === 'magenta').length) failures.push('summary magentaSources mismatch');
if ((report?.summary?.artContracts ?? -1) !== items.filter((item) => item.evidence?.artContract?.ok).length) failures.push('summary artContracts mismatch');
if ((report?.summary?.starterPlans ?? -1) !== items.filter((item) => item.evidence?.starterPlan?.ok).length) failures.push('summary starterPlans mismatch');
if ((report?.summary?.planPreviews ?? -1) !== items.filter((item) => item.evidence?.planPreview?.ok).length) failures.push('summary planPreviews mismatch');
if ((report?.summary?.runtimeRegistered ?? -1) !== items.filter((item) => item.runtime?.registered).length) failures.push('summary runtimeRegistered mismatch');

const byId = new Map(items.map((item) => [item.id, item]));
for (const rosterItem of rosterItems) {
  const item = byId.get(rosterItem.id);
  if (!item) {
    failures.push(`${rosterItem.id}: missing from reproducibility report`);
    continue;
  }
  if (item.species !== rosterItem.species) failures.push(`${rosterItem.id}: species mismatch`);
  if (item.source?.backgroundKey !== 'magenta') failures.push(`${rosterItem.id}: source background must be magenta`);
  for (const key of ['source', 'keyPreview', 'artContract', 'starterPlan', 'planPreview', 'sourceParity', 'contactSheet', 'phaseStrip']) {
    const evidence = item.evidence?.[key];
    if (evidence?.ok !== true) failures.push(`${rosterItem.id}: evidence ${key} is not ok`);
    if (!evidence?.path) failures.push(`${rosterItem.id}: evidence ${key} path missing`);
  }
  for (const key of ['sourceContracts', 'sourcePreview', 'mechanicalPrepare', 'planCheck', 'planPreview', 'extractDryRun', 'extractApply', 'sourceParity', 'visualCohesion', 'pairedSandboxPreview', 'pairedSandboxVisual']) {
    if (!String(item.commands?.[key] ?? '').trim()) failures.push(`${rosterItem.id}: command ${key} missing`);
  }
  if (!item.commands?.extractDryRun?.includes('--dry-run')) failures.push(`${rosterItem.id}: extractDryRun must include --dry-run`);
  if (item.commands?.extractApply?.includes('--dry-run')) failures.push(`${rosterItem.id}: extractApply must not include --dry-run`);
  if (!item.commands?.pairedSandboxPreview?.includes('--with diver')) failures.push(`${rosterItem.id}: pairedSandboxPreview must include diver`);
  if (!item.commands?.pairedSandboxVisual?.includes('--states idle,lunge,stunned') || !item.commands?.pairedSandboxVisual?.includes('--with diver')) {
    failures.push(`${rosterItem.id}: pairedSandboxVisual must include idle/lunge/stunned with diver`);
  }
  if (item.runtime?.registered !== true) failures.push(`${rosterItem.id}: runtime must be registered`);
  if (item.reproducible !== (item.blockers?.length === 0)) failures.push(`${rosterItem.id}: reproducible flag must match blockers`);
  if (!includesHtml(html, `data-reproducibility-target="${rosterItem.id}"`)) failures.push(`${rosterItem.id}: html missing target marker`);
  if (!markdown.includes(rosterItem.id)) failures.push(`${rosterItem.id}: markdown missing id`);
}

for (const expected of [
  'Water 9 Content Reproducibility',
  'does not approve source art or accept threats',
  'npm run content:reproducibility',
  'npm run content:reproducibility-check',
  'npm run articulated:extract-plan -- --plan tools/scratch/<id>-starter-plan.json --dry-run',
  'npm run sandbox:preview -- --id <id> --with diver --serve --open --visual',
]) {
  if (!markdown.includes(expected)) failures.push(`markdown missing ${expected}`);
  if (!includesHtml(html, expected) && !['npm run articulated:extract-plan -- --plan tools/scratch/<id>-starter-plan.json --dry-run', 'npm run sandbox:preview -- --id <id> --with diver --serve --open --visual'].includes(expected)) {
    failures.push(`html missing ${expected}`);
  }
}

const summary = {
  schema: 'water9/content-reproducibility-check@1',
  targetThreats: report?.summary?.targetThreats ?? null,
  reproducibleTargets: report?.summary?.reproducibleTargets ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

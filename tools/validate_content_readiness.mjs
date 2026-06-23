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
  json: resolve(String(args.get('json') ?? 'public/review/content-readiness.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-readiness.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-readiness.html')),
  stageBoard: resolve(String(args.get('stage-board') ?? 'public/review/content-stage-board.json')),
  sourceApprovalRunway: resolve(String(args.get('source-approval-runway') ?? 'public/review/source-approval-runway.json')),
  sourceCriticRegeneration: resolve(String(args.get('source-critic-regeneration') ?? 'public/review/source-candidates/source-critic-regeneration-queue.json')),
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

function includesRendered(text, value) {
  return text.includes(value) || text.includes(htmlEscape(value));
}

const report = await readJson('content readiness', paths.json);
const stageBoard = await readJson('content stage board', paths.stageBoard);
const sourceApprovalRunway = await readJson('source approval runway', paths.sourceApprovalRunway);
const sourceCriticRegeneration = await readJson('source critic regeneration queue', paths.sourceCriticRegeneration);
const markdown = await readText('content readiness markdown', paths.markdown);
const html = await readText('content readiness html', paths.html);
await fileOk('content readiness markdown', paths.markdown, 1024);
await fileOk('content readiness html', paths.html, 4096);

if (report?.schema !== 'water9/content-readiness@1') failures.push(`unexpected readiness schema ${report?.schema ?? 'missing'}`);
if (stageBoard?.schema !== 'water9/content-stage-board@1') failures.push(`unexpected stage board schema ${stageBoard?.schema ?? 'missing'}`);
if (sourceApprovalRunway?.schema !== 'water9/source-approval-runway@1') failures.push(`unexpected source approval runway schema ${sourceApprovalRunway?.schema ?? 'missing'}`);
if (sourceCriticRegeneration?.schema !== 'water9/source-critic-regeneration-queue@1') failures.push(`unexpected source critic regeneration schema ${sourceCriticRegeneration?.schema ?? 'missing'}`);

const summary = report?.summary ?? {};
if ((summary.targetThreats ?? 0) < minThreats) failures.push(`targetThreats ${summary.targetThreats ?? 'missing'} is below ${minThreats}`);
if ((summary.acceptedThreats ?? -1) !== (stageBoard?.summary?.acceptedThreats ?? -2)) failures.push('acceptedThreats does not match stage board');
const expectedStrictGateComplete = (summary.acceptedThreats ?? 0) >= minThreats;
if (summary.strictGateComplete !== expectedStrictGateComplete) {
  failures.push(`strictGateComplete ${summary.strictGateComplete ?? 'missing'} does not match acceptedThreats/minThreats`);
}
if ((summary.sourceCandidates ?? 0) < minThreats) failures.push(`sourceCandidates ${summary.sourceCandidates ?? 'missing'} is below ${minThreats}`);
if (!String(summary.nextBottleneck ?? '').trim()) failures.push('nextBottleneck is missing');
if ((summary.sourceMechanicallyReadyForHumanReview ?? -1) !== (sourceApprovalRunway?.summary?.mechanicallyReadyForHumanReview ?? -2)) failures.push('sourceMechanicallyReadyForHumanReview does not match source approval runway');
if ((summary.sourceApprovalReady ?? -1) !== (sourceApprovalRunway?.summary?.readyForHumanReview ?? -2)) failures.push('sourceApprovalReady does not match source approval runway');
if ((summary.sourceCriticRegenerationRequired ?? -1) !== (sourceApprovalRunway?.summary?.criticRegenerationRequired ?? -2)) failures.push('sourceCriticRegenerationRequired does not match source approval runway');
if ((summary.sourceCriticRegenerationQueued ?? -1) !== (sourceCriticRegeneration?.summary?.regenerateCandidates ?? -2)) failures.push('sourceCriticRegenerationQueued does not match critic regeneration queue');
if ((summary.sourceCriticRegenerationRequired ?? 0) > 0 && !String(summary.nextBottleneck ?? '').includes('critic')) {
  failures.push('nextBottleneck must mention critic regeneration while critic-blocked sources remain');
}
if (!Array.isArray(report?.qualityContract) || report.qualityContract.length < 4) failures.push('qualityContract is missing or too short');
if (!Array.isArray(report?.sourceGenerationPriority)) failures.push('sourceGenerationPriority must be an array');
if (!Array.isArray(report?.sourceCandidates) || report.sourceCandidates.length < minThreats) failures.push('sourceCandidates readiness list is incomplete');
if (!Array.isArray(report?.articulatedThreats)) failures.push('articulatedThreats readiness list must be an array');
if ((summary.acceptedThreats ?? 0) < minThreats && !report?.verticalSliceTarget) failures.push('verticalSliceTarget is required while strict gate is incomplete');

for (const item of report?.sourceGenerationPriority?.slice(0, 5) ?? []) {
  if (!item.id || !item.species) failures.push('source generation priority item missing id/species');
  if (!Array.isArray(item.nextCommands) || item.nextCommands.length < 1) failures.push(`${item.id}: priority item missing nextCommands`);
  if (!String(item.sourceArtContract ?? '').includes(`/${item.id}.md`)) failures.push(`${item.id}: missing source art contract path`);
}

for (const item of report?.sourceCandidates ?? []) {
  const approvalItem = (sourceApprovalRunway?.items ?? []).find((entry) => entry.id === item.id);
  if (!item.id || !item.species) failures.push('source readiness item missing id/species');
  if (!Array.isArray(item.blockers)) failures.push(`${item.id}: blockers must be an array`);
  if (!Array.isArray(item.nextCommands)) failures.push(`${item.id}: nextCommands must be an array`);
  if (item.blockers.length && item.nextCommands.length < 1) failures.push(`${item.id}: blocked source item needs next commands`);
  if (approvalItem) {
    if (item.mechanicallyReadyForHumanReview !== Boolean(approvalItem.mechanicallyReadyForHumanReview)) failures.push(`${item.id}: mechanical readiness does not match source approval runway`);
    if (item.approvalReady !== Boolean(approvalItem.readyForHumanReview)) failures.push(`${item.id}: approvalReady does not match source approval runway`);
    if (item.criticRegenerationRequired !== Boolean(approvalItem.criticRegenerationRequired)) failures.push(`${item.id}: criticRegenerationRequired does not match source approval runway`);
    if (approvalItem.criticRegenerationRequired) {
      if (!item.blockers.includes('critic regeneration required before human source approval')) failures.push(`${item.id}: missing critic regeneration blocker`);
      if (!item.nextCommands.some((command) => String(command).includes('source-critic-regeneration-queue.json'))) failures.push(`${item.id}: missing critic regeneration queue command`);
    }
    if (approvalItem.readyForHumanReview && !approvalItem.humanApproved && !item.nextCommands.some((command) => String(command).includes('source:accept'))) {
      failures.push(`${item.id}: approval-ready source item missing source approval command`);
    }
  }
}

for (const item of report?.articulatedThreats ?? []) {
  if (!item.id || !item.species) failures.push('threat readiness item missing id/species');
  if (!Array.isArray(item.blockers)) failures.push(`${item.id}: blockers must be an array`);
  if (!Array.isArray(item.nextCommands)) failures.push(`${item.id}: nextCommands must be an array`);
  if (item.blockers.length && item.nextCommands.length < 1) failures.push(`${item.id}: blocked threat item needs next commands`);
  for (const command of item.nextCommands ?? []) {
    if (command.includes('sandbox:preview') && !command.includes('--with diver')) {
      failures.push(`${item.id}: threat sandbox preview command must include --with diver`);
    }
    if (command.includes('sandbox:visual') && (!command.includes('--with diver') || !command.includes('--states idle,lunge,stunned'))) {
      failures.push(`${item.id}: threat sandbox visual command must include idle/lunge/stunned with diver`);
    }
  }
}

for (const required of [
  'Water 9 Content Readiness',
  'Water 9 Content Readiness Dossier',
  'Quality Contract',
  'Vertical Slice Target',
  'Source Generation Priority',
  'Recent Source Generation Rejections',
  'Source Candidate Readiness',
  'Articulated Threat Readiness',
  'Strict gate complete',
  'Source candidates approval-ready now',
  'Source candidates requiring critic regeneration',
  'npm run content:readiness && npm run content:readiness-check',
  'npm run content:gate',
]) {
  if (!includesRendered(markdown, required) && !includesRendered(html, required)) failures.push(`readiness artifacts missing required content: ${required}`);
}
if (!includesRendered(markdown, `Strict gate complete: \`${summary.strictGateComplete}\``) && !includesRendered(html, 'strict gate complete')) {
  failures.push('readiness artifacts missing rendered strictGateComplete value');
}
if ((summary.sourceCriticRegenerationRequired ?? 0) > 0 && !includesRendered(markdown, 'critic regeneration') && !includesRendered(html, 'critic regeneration')) {
  failures.push('readiness artifacts missing critic regeneration wording');
}

for (const target of [report?.verticalSliceTarget, ...(report?.sourceGenerationPriority?.slice(0, 3) ?? [])].filter(Boolean)) {
  if (!markdown.includes(target.id)) failures.push(`markdown missing target ${target.id}`);
  if (!html.includes(target.id)) failures.push(`html missing target ${target.id}`);
  for (const command of target.nextCommands ?? []) {
    if (!includesRendered(markdown, command) && !includesRendered(html, command)) {
      failures.push(`${target.id}: readiness artifacts missing command ${command}`);
    }
  }
}

const result = {
  json: paths.json,
  markdown: paths.markdown,
  html: paths.html,
  sourceCandidates: report?.sourceCandidates?.length ?? 0,
  articulatedThreats: report?.articulatedThreats?.length ?? 0,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}

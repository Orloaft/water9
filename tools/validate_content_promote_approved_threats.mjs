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
  json: resolve(String(args.get('json') ?? 'public/review/content-promote-approved-threats.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-promote-approved-threats.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-promote-approved-threats.html')),
  board: resolve(String(args.get('board') ?? 'public/review/content-human-adjudication-board.json')),
  threatDecisions: resolve(String(args.get('threat-decisions') ?? 'public/review/content-threat-acceptance-decision-template.json')),
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

const report = await readJson('promote approved threats', paths.json);
const board = await readJson('human adjudication board', paths.board);
const threatDecisions = await readJson('threat decisions', paths.threatDecisions);
const markdown = await readText('promote approved threats markdown', paths.markdown);
const html = await readText('promote approved threats html', paths.html);
await fileOk('promote approved threats markdown', paths.markdown, 1024);
await fileOk('promote approved threats html', paths.html, 4096);

if (report?.schema !== 'water9/content-promote-approved-threats@1') failures.push(`unexpected schema ${report?.schema ?? 'missing'}`);
if (board?.schema !== 'water9/content-human-adjudication-board@1') failures.push(`unexpected board schema ${board?.schema ?? 'missing'}`);
if (threatDecisions?.schema !== 'water9/content-threat-acceptance-decision-template@1') failures.push(`unexpected threat decision schema ${threatDecisions?.schema ?? 'missing'}`);
const items = Array.isArray(report?.items) ? report.items : [];
const boardItems = Array.isArray(board?.items) ? board.items : [];
const runtimeDecisionIds = new Set((threatDecisions?.decisions ?? []).map((item) => item.id));
const targetIds = new Set(boardItems.map((item) => item.id));
if (items.length < minThreats) failures.push(`items ${items.length} below ${minThreats}`);
if (items.length !== boardItems.length) failures.push(`items ${items.length} do not match board ${boardItems.length}`);
if ((report?.summary?.items ?? -1) !== items.length) failures.push('summary items mismatch');
if ((report?.summary?.targetThreats ?? -1) !== (board?.summary?.targetThreats ?? minThreats)) failures.push('summary targetThreats mismatch');
if ((report?.summary?.sourceApproved ?? -1) !== items.filter((item) => item.sourceApproved).length) failures.push('summary sourceApproved mismatch');
if ((report?.summary?.readyForThreatDecision ?? -1) !== items.filter((item) => item.readyForDecision).length) failures.push('summary readyForThreatDecision mismatch');
if ((report?.summary?.acceptedThreats ?? -1) !== items.filter((item) => item.threatAccepted).length) failures.push('summary acceptedThreats mismatch');
if ((report?.summary?.excludedNonTargetRigs ?? -1) !== [...runtimeDecisionIds].filter((id) => !targetIds.has(id)).length) failures.push('summary excludedNonTargetRigs mismatch');
if ((report?.summary?.runtimeMappedTargets ?? -1) !== items.filter((item) => item.runtimeMapped).length) failures.push('summary runtimeMappedTargets mismatch');
if (report?.policy?.targetOnly !== true) failures.push('policy targetOnly must be true');
if (report?.policy?.excludesNonTargetRuntimePrototypes !== true) failures.push('policy must exclude non-target runtime prototypes');
if (report?.policy?.humanAuthoredDecisionsRequired !== true) failures.push('policy must require human decisions');
if (report?.decisionFileTemplate?.schema !== 'water9/content-threat-acceptance-decisions@1') failures.push('decision file schema mismatch');
if (report?.decisionFileTemplate?.policy?.targetOnlyThreatGoal !== true) failures.push('decision file policy must be target-only');
if ((report?.decisionFileTemplate?.decisions ?? []).length !== items.length) failures.push('decision file count mismatch');

const boardById = new Map(boardItems.map((item) => [item.id, item]));
for (const item of items) {
  const boardItem = boardById.get(item.id);
  if (!boardItem) failures.push(`${item.id}: item missing from board`);
  if (boardItem && item.species !== boardItem.species) failures.push(`${item.id}: species mismatch`);
  if (!runtimeDecisionIds.has(item.id)) failures.push(`${item.id}: target is missing runtime threat decision mapping`);
  if (item.readyForDecision && item.blockers.length > 0) failures.push(`${item.id}: ready item cannot have blockers`);
  if (!item.readyForDecision && item.blockers.length < 1) failures.push(`${item.id}: blocked item must explain blockers`);
  if (!item.commands?.applyTargetDecisionsStrict?.includes('water9-target-threat-acceptance-decisions.json --strict')) failures.push(`${item.id}: missing strict target decision apply command`);
  if (!item.commands?.threatAcceptanceDryRun?.includes('--dry-run')) failures.push(`${item.id}: threat acceptance command must be dry-run`);
  const decision = report.decisionFileTemplate.decisions.find((entry) => entry.id === item.id);
  if (!decision) failures.push(`${item.id}: missing target-only decision`);
  if (decision?.sourceCandidateId !== item.id) failures.push(`${item.id}: decision sourceCandidateId must match target id`);
  if (decision?.status !== 'needs-review') failures.push(`${item.id}: target-only decision must start as needs-review`);
  for (const check of report.requiredChecks ?? []) {
    if (!decision?.visualChecks?.[check]) failures.push(`${item.id}: decision missing visual check ${check}`);
  }
  for (const value of [
    item.id,
    item.species,
    item.commands?.runtimePreview,
    item.commands?.threatAcceptanceDryRun,
    item.commands?.applyTargetDecisionsStrict,
    `data-promote-threat="${item.id}"`,
  ]) {
    if (value && !markdown.includes(String(value)) && !includesRendered(html, value)) failures.push(`${item.id}: rendered outputs missing ${value}`);
  }
}

for (const required of [
  'Water9 Promote Approved Threats',
  'Target-only promotion runway',
  'Download target-only threat decisions',
  'data-promote-approved-threats-workspace',
  'data-promote-threat-decisions',
  'npm run content:promote-approved-threats',
  'npm run content:promote-approved-threats-check',
  'npm run content:threat-decisions-apply -- --decisions water9-target-threat-acceptance-decisions.json --strict',
]) {
  if (!markdown.includes(required) && !includesRendered(html, required)) failures.push(`rendered outputs missing ${required}`);
}

const summary = {
  schema: 'water9/content-promote-approved-threats-check@1',
  items: items.length,
  sourceApproved: report?.summary?.sourceApproved ?? null,
  readyForThreatDecision: report?.summary?.readyForThreatDecision ?? null,
  excludedNonTargetRigs: report?.summary?.excludedNonTargetRigs ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

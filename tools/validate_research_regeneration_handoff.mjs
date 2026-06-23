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
  json: resolve(String(args.get('json') ?? 'public/review/source-candidates/research-regeneration-handoff.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/source-candidates/research-regeneration-handoff.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/research-regeneration-handoff.html')),
  workspace: resolve(String(args.get('workspace') ?? 'public/review/source-candidates/source-regeneration-workspace.json')),
  dispatch: resolve(String(args.get('dispatch') ?? 'public/review/source-candidates/research-dispatch-board.json')),
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

function includesRendered(text, value) {
  return text.includes(String(value ?? '')) || text.includes(htmlEscape(value));
}

const report = await readJson('research regeneration handoff', paths.json);
const workspace = await readJson('source regeneration workspace', paths.workspace);
const dispatchBoard = await readJson('research dispatch board', paths.dispatch);
const markdown = await readText('research regeneration handoff markdown', paths.markdown);
const html = await readText('research regeneration handoff html', paths.html);
await fileOk('research regeneration handoff markdown', paths.markdown, 1024);
await fileOk('research regeneration handoff html', paths.html, 2048);

if (report?.schema !== 'water9/research-regeneration-handoff@1') failures.push(`unexpected handoff schema ${report?.schema ?? 'missing'}`);
if (workspace?.schema !== 'water9/source-regeneration-workspace@1') failures.push(`unexpected workspace schema ${workspace?.schema ?? 'missing'}`);
if (dispatchBoard?.schema !== 'water9/research-dispatch-board@1') failures.push(`unexpected dispatch schema ${dispatchBoard?.schema ?? 'missing'}`);

for (const [key, expected] of Object.entries({
  readOnlyHandoff: true,
  doesNotApproveSources: true,
  doesNotAcceptThreats: true,
  previewOnlyDoesNotCountTowardGate: true,
  noOverwriteIngestOutsideDistinctReady: true,
})) {
  if (report?.policy?.[key] !== expected) failures.push(`policy ${key} must be ${expected}`);
}

const target = report?.target ?? {};
const expectedTarget = workspace?.target ?? {};
const dispatch = (dispatchBoard?.dispatches ?? []).find((item) => item.id === target.id) ?? null;
if (target.id !== expectedTarget.id) failures.push('handoff target must match current regeneration workspace target');
if (target.regenerationLane !== expectedTarget.lane) failures.push('handoff regeneration lane mismatch');
if (target.healthStatus !== expectedTarget.healthStatus) failures.push('handoff health status mismatch');
if (Boolean(target.replacementMatchesCurrentSource) !== Boolean(expectedTarget.replacementMatchesCurrentSource)) failures.push('handoff no-op flag mismatch');
if (Boolean(target.distinctReplacementReady) !== Boolean(expectedTarget.distinctReplacementReady)) failures.push('handoff distinct-ready flag mismatch');
if (!dispatch) failures.push(`${target.id}: missing dispatch row`);
if (dispatch && target.lane !== dispatch.lane) failures.push('handoff research lane mismatch with dispatch board');
if (dispatch && target.auditFile !== dispatch.auditFile) failures.push('handoff audit file mismatch with dispatch board');
if (dispatch && target.dispatchPacket !== dispatch.packet?.file) failures.push('handoff dispatch packet mismatch with dispatch board');
if (!report?.finding?.id || report.finding.id !== target.id) failures.push('handoff finding must match target');
if (!Array.isArray(report?.finding?.strengths) || report.finding.strengths.length < 1) failures.push('handoff finding strengths missing');
if (!Array.isArray(report?.finding?.sourceGenerationRisks) || report.finding.sourceGenerationRisks.length < 1) failures.push('handoff finding sourceGenerationRisks missing');
for (const key of ['biologicalAnchors', 'requiredRead', 'promptRisks', 'motionPhases']) {
  if (!Array.isArray(report?.finding?.suggestedResearchPatch?.[key]) || report.finding.suggestedResearchPatch[key].length < 1) {
    failures.push(`handoff finding suggestedResearchPatch.${key} missing`);
  }
}
if (!Array.isArray(report?.finding?.referenceSearchTerms) || report.finding.referenceSearchTerms.length < 2) failures.push('handoff referenceSearchTerms incomplete');
for (const key of ['includesSourceGenerationRisk', 'includesSuggestedBiologicalAnchor', 'includesSuggestedRequiredRead', 'includesSuggestedPromptRisk', 'includesSuggestedMotionPhase']) {
  if (typeof report?.promptAlignment?.[key] !== 'boolean') failures.push(`promptAlignment.${key} must be boolean`);
}
if (!Array.isArray(report?.commands) || report.commands.length < 6) failures.push('handoff commands missing');
for (const expected of [
  'npm run research:regeneration-handoff',
  'npm run research:regeneration-handoff-check',
  'npm run research:regeneration-handoff:serve-smoke',
  'npm run research:dispatch && npm run research:dispatch-check',
  'npm run research:audits',
  'npm run source:regeneration-workspace && npm run source:regeneration-workspace-check',
]) {
  if (!report?.commands?.includes(expected)) failures.push(`handoff commands missing ${expected}`);
}
if (target.regenerationLane !== 'regenerate-distinct-ready') {
  for (const command of report?.commands ?? []) {
    if (String(command).includes('source:ingest') && String(command).includes('--overwrite')) failures.push('handoff must not expose overwrite ingest outside distinct-ready lane');
  }
}

for (const required of [
  'Water 9 Research Regeneration Handoff',
  'does not approve source art',
  'does not accept threats',
  'does not count preview-only work toward the strict 20-threat gate',
  'Subagent Finding',
  'Source Generation Risks',
  'Suggested Prompt Patches',
  'Regeneration Prompt Alignment',
  'Safe Handoff Commands',
  'Command Boundary',
  'data-research-regeneration-handoff',
  `data-research-regeneration-target="${target.id}"`,
  target.id,
  target.species,
  target.lane,
  target.regenerationLane,
  target.healthStatus,
  target.auditFile,
  target.dispatchPacket,
  '/review/source-candidates/source-regeneration-workspace.html',
]) {
  if (required && !markdown.includes(String(required)) && !includesRendered(html, required)) failures.push(`rendered outputs missing ${required}`);
}
for (const command of report?.commands ?? []) {
  if (!markdown.includes(command) && !includesRendered(html, command)) failures.push(`rendered outputs missing command ${command}`);
}

const summary = {
  schema: 'water9/research-regeneration-handoff-check@1',
  target: target.id ?? null,
  lane: target.lane ?? null,
  regenerationLane: target.regenerationLane ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

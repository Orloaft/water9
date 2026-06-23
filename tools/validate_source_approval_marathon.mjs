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
  json: resolve(String(args.get('json') ?? 'public/review/source-candidates/source-approval-marathon.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/source-candidates/source-approval-marathon.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-approval-marathon.html')),
  approvalRunway: resolve(String(args.get('approval-runway') ?? 'public/review/source-approval-runway.json')),
  decisionTemplate: resolve(String(args.get('decision-template') ?? 'public/review/source-candidates/source-cohesion-decision-template.json')),
  cohortBoard: resolve(String(args.get('cohort-board') ?? 'public/review/content-cohort-cohesion-board.json')),
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

const report = await readJson('source approval marathon', paths.json);
const approvalRunway = await readJson('source approval runway', paths.approvalRunway);
const decisionTemplate = await readJson('source cohesion decision template', paths.decisionTemplate);
const cohortBoard = await readJson('cohort cohesion board', paths.cohortBoard);
const markdown = await readText('source approval marathon markdown', paths.markdown);
const html = await readText('source approval marathon html', paths.html);

await fileOk('source approval marathon markdown', paths.markdown, 1024);
await fileOk('source approval marathon html', paths.html, 4096);

if (report?.schema !== 'water9/source-approval-marathon@1') failures.push(`unexpected marathon schema ${report?.schema ?? 'missing'}`);
if (approvalRunway?.schema !== 'water9/source-approval-runway@1') failures.push(`unexpected approval runway schema ${approvalRunway?.schema ?? 'missing'}`);
if (decisionTemplate?.schema !== 'water9/source-cohesion-decision-template@1') failures.push(`unexpected decision template schema ${decisionTemplate?.schema ?? 'missing'}`);
if (cohortBoard?.schema !== 'water9/content-cohort-cohesion-board@1') failures.push(`unexpected cohort board schema ${cohortBoard?.schema ?? 'missing'}`);

if (report?.policy?.humanAuthoredDecisionsRequired !== true) failures.push('marathon must require human-authored decisions');
if (report?.policy?.automationCannotApproveSourceArt !== true) failures.push('marathon must state automation cannot approve source art');
if (report?.policy?.pageDoesNotApplyDecisions !== true) failures.push('marathon must not apply decisions');
if (report?.policy?.strictApplyGateRequired !== true) failures.push('marathon must require strict apply gate');
if (report?.policy?.acceptSourceCandidateRemainsFinalSourceGate !== true) failures.push('marathon must preserve accept_source_candidate as source gate');
if (report?.policy?.reviewPacketMustShowSourceAndRuntimeEvidence !== true) failures.push('marathon must require source and runtime review evidence');

const items = Array.isArray(report?.items) ? report.items : [];
const runwayItems = Array.isArray(approvalRunway?.items) ? approvalRunway.items : [];
const cohortItems = Array.isArray(cohortBoard?.items) ? cohortBoard.items : [];
const requiredChecks = decisionTemplate?.requiredCohesionChecks ?? Object.keys(decisionTemplate?.decisionFileTemplate?.decisions?.[0]?.visualChecks ?? {});
const requiredMediaTiles = [
  'source',
  'keyPreview',
  'sandboxScreenshot',
  'planPreview',
  'sourceParity',
  'contactSheet',
  'phaseStrip',
  'sandboxIdle',
  'sandboxLunge',
  'sandboxStunned',
];
if (items.length !== runwayItems.length) failures.push('marathon item count must match approval runway');
if ((report?.summary?.candidates ?? -1) !== items.length) failures.push('summary candidates mismatch');
if ((report?.summary?.readyForHumanReview ?? -1) !== items.filter((item) => item.readyForHumanReview && !item.humanApproved).length) failures.push('summary readyForHumanReview mismatch');
if ((report?.summary?.humanApproved ?? -1) !== items.filter((item) => item.humanApproved).length) failures.push('summary humanApproved mismatch');
if ((report?.summary?.requiredChecks ?? -1) !== requiredChecks.length) failures.push('summary requiredChecks mismatch');
if ((report?.summary?.requiredMediaTiles ?? -1) !== requiredMediaTiles.length) failures.push('summary requiredMediaTiles mismatch');
if ((report?.summary?.decisionStarters ?? -1) !== items.filter((item) => item.decisionStarter).length) failures.push('summary decisionStarters mismatch');
if ((report?.summary?.riskHigh ?? -1) !== items.filter((item) => item.riskLevel === 'high').length) failures.push('summary riskHigh mismatch');
if ((report?.summary?.riskMedium ?? -1) !== items.filter((item) => item.riskLevel === 'medium').length) failures.push('summary riskMedium mismatch');
if ((report?.summary?.riskHigh ?? -1) !== (cohortBoard?.summary?.riskHigh ?? -2)) failures.push('marathon high-risk count must match cohort board');
if ((report?.summary?.riskMedium ?? -1) !== (cohortBoard?.summary?.riskMedium ?? -2)) failures.push('marathon medium-risk count must match cohort board');

const runwayIds = new Set(runwayItems.map((item) => item.id));
const cohortIds = new Set(cohortItems.map((item) => item.id));
for (const item of items) {
  if (!runwayIds.has(item.id)) failures.push(`${item.id}: missing from approval runway`);
  if (!cohortIds.has(item.id)) failures.push(`${item.id}: missing from cohort board`);
  if (!item.readyForHumanReview) failures.push(`${item.id}: marathon should only contain mechanically ready approval candidates`);
  if (item.criticRegenerationRequired) failures.push(`${item.id}: critic regeneration still required`);
  for (const key of requiredMediaTiles) {
    if (!item.media?.[key]) failures.push(`${item.id}: missing media ${key}`);
  }
  if (!item.evidenceFingerprintDigest) failures.push(`${item.id}: missing evidence fingerprint digest`);
  const starter = item.decisionStarter;
  if (starter?.schema !== 'water9/source-cohesion-decisions@1') failures.push(`${item.id}: decision starter schema mismatch`);
  if (starter?.reviewer !== '<human-reviewer>') failures.push(`${item.id}: decision starter reviewer placeholder mismatch`);
  if (starter?.reviewedAt !== '<ISO-8601 timestamp>') failures.push(`${item.id}: decision starter reviewedAt placeholder mismatch`);
  if (starter?.policy?.humanAuthored !== true) failures.push(`${item.id}: decision starter must require humanAuthored`);
  if ((starter?.decisions ?? []).length !== 1) failures.push(`${item.id}: decision starter must contain one decision`);
  const decision = starter?.decisions?.[0];
  if (decision?.id !== item.id) failures.push(`${item.id}: decision starter target mismatch`);
  if (decision?.reviewer !== '<human-reviewer>') failures.push(`${item.id}: decision starter decision reviewer placeholder mismatch`);
  if (decision?.reviewedAt !== '<ISO-8601 timestamp>') failures.push(`${item.id}: decision starter decision reviewedAt placeholder mismatch`);
  if (decision?.status !== 'needs-review') failures.push(`${item.id}: decision starter must default needs-review`);
  if (decision?.overallNote !== '') failures.push(`${item.id}: decision starter overall note must default empty`);
  if (decision?.evidenceFingerprint?.digest !== item.evidenceFingerprintDigest) failures.push(`${item.id}: decision starter fingerprint mismatch`);
  const checks = Object.keys(decision?.visualChecks ?? {});
  for (const check of requiredChecks) {
    if (!checks.includes(check)) failures.push(`${item.id}: missing visual check ${check}`);
    if (decision?.visualChecks?.[check]?.score !== null) failures.push(`${item.id}: ${check} score must default null`);
    if (decision?.visualChecks?.[check]?.note !== '') failures.push(`${item.id}: ${check} note must default empty`);
  }
  if (!String(item.commands?.sourcePreview ?? '').includes(`source-${item.id}`)) failures.push(`${item.id}: source preview command mismatch`);
  if (!String(item.commands?.runtimePreview ?? '').includes(`--id ${item.id}`)) failures.push(`${item.id}: runtime preview command mismatch`);
  if (!String(item.commands?.strictDryRun ?? '').includes('water9-source-cohesion-reviewed-decisions.json')) failures.push(`${item.id}: strict dry-run command missing reviewed decision file`);
}

for (const required of [
  'Source Approval Marathon',
  'All approval-ready source candidates in one pass',
  'Human-authored decisions and strict apply remain mandatory',
  'does not approve source art',
  'data-source-approval-marathon',
  'data-approval-marathon-item',
  'data-source-decision-starter',
  'data-source-decision-form',
  'data-source-decision-status',
  'data-source-overall-note',
  'data-source-check-score',
  'data-source-check-note',
  'data-sync-source-decision',
  'data-approval-marathon-export',
  'data-build-reviewed-decisions',
  'data-reviewed-decision-warnings',
  'data-reviewed-decision-output',
  'reviewed-only decision file',
  'No reviewed decision warnings.',
  'Structured Human Decision',
  'Pending <code>needs-review</code> starters are excluded',
  'high-risk',
  'medium-risk',
  'water9-source-cohesion-reviewed-decisions.json',
  'contact sheet',
  'phase strip',
  'sandbox idle',
  'sandbox stunned',
]) {
  if (!markdown.includes(required) && !includesRendered(html, required)) failures.push(`rendered outputs missing ${required}`);
}

const result = {
  schema: 'water9/source-approval-marathon-check@1',
  candidates: report?.summary?.candidates ?? null,
  readyForHumanReview: report?.summary?.readyForHumanReview ?? null,
  decisionStarters: report?.summary?.decisionStarters ?? null,
  riskHigh: report?.summary?.riskHigh ?? null,
  riskMedium: report?.summary?.riskMedium ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}

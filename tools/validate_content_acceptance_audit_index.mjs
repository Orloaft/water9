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
  json: resolve(String(args.get('json') ?? 'public/review/content-acceptance-audits/index.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-acceptance-audits/index.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-acceptance-audits/index.html')),
  matrix: resolve(String(args.get('matrix') ?? 'public/review/content-review-evidence-matrix.json')),
};
const minThreats = Number(args.get('min-threats') ?? 20);
const failures = [];
const validStages = new Set([
  'missing-content',
  'source-evidence-needed',
  'human-source-review-needed',
  'rigging-needed',
  'threat-evidence-needed',
  'human-threat-review-needed',
  'accepted',
]);

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
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function includesRendered(text, value) {
  return text.includes(value) || text.includes(htmlEscape(value));
}

function expectedStage(audit) {
  if (audit?.source?.exists && !audit.source.mechanicalReady) return 'source-evidence-needed';
  if (audit?.source?.exists && !audit.source.approved) return 'human-source-review-needed';
  if (!audit?.threat?.exists) return 'rigging-needed';
  if (!audit.threat.mechanicalReady) return 'threat-evidence-needed';
  if (!audit.threat.accepted) return 'human-threat-review-needed';
  if (audit?.source?.exists && audit.source.approved && audit.threat.accepted) return 'accepted';
  return 'missing-content';
}

const report = await readJson('acceptance audit index', paths.json);
const matrix = await readJson('review evidence matrix', paths.matrix);
const markdown = await readText('acceptance audit index markdown', paths.markdown);
const html = await readText('acceptance audit index html', paths.html);

await fileOk('acceptance audit index json', paths.json, 1024);
await fileOk('acceptance audit index markdown', paths.markdown, 1024);
await fileOk('acceptance audit index html', paths.html, 2048);

if (report?.schema !== 'water9/content-acceptance-audit-index@1') failures.push(`unexpected schema ${report?.schema ?? 'missing'}`);
if (matrix?.schema !== 'water9/content-review-evidence-matrix@1') failures.push(`unexpected matrix schema ${matrix?.schema ?? 'missing'}`);
if (report?.summary?.targetThreats !== minThreats) failures.push(`summary targetThreats must be ${minThreats}`);
if (!Array.isArray(report?.items)) failures.push('items must be an array');
if ((report?.items?.length ?? 0) !== minThreats) failures.push(`items must contain exactly ${minThreats} audits`);
if (report?.summary?.auditedThreats !== report?.items?.length) failures.push('summary auditedThreats must match item count');
if (report?.summary?.matrixRows !== (matrix?.rows?.length ?? 0)) failures.push('summary matrixRows must match evidence matrix rows');
if (typeof report?.summary?.strictGateComplete !== 'boolean') failures.push('summary strictGateComplete must be boolean');
if (!String(report?.summary?.nextGate ?? '').trim()) failures.push('summary nextGate is missing');
if (!String(report?.commands?.sourceApprovalWorkspace ?? '').includes('npm run source:approval-runway')) failures.push('sourceApprovalWorkspace must build source approval runway');
if (!String(report?.commands?.sourceApprovalWorkspace ?? '').includes('npm run source:visual-board')) failures.push('sourceApprovalWorkspace must build source visual board');
if (!String(report?.commands?.sourceApprovalWorkspace ?? '').includes('npm run source:cohesion-decisions')) failures.push('sourceApprovalWorkspace must build source cohesion decisions');
if (!String(report?.commands?.sourceApprovalWorkspaceCheck ?? '').includes('npm run source:approval-runway-check')) failures.push('sourceApprovalWorkspaceCheck must validate source approval runway');
if (!String(report?.commands?.sourceApprovalWorkspaceCheck ?? '').includes('npm run source:visual-board-check')) failures.push('sourceApprovalWorkspaceCheck must validate source visual board');
if (!String(report?.commands?.sourceApprovalWorkspaceCheck ?? '').includes('npm run source:cohesion-decisions-check')) failures.push('sourceApprovalWorkspaceCheck must validate source cohesion decisions');
if (!String(report?.commands?.sourceApprovalDecisionDryRun ?? '').includes('npm run source:cohesion-decisions-apply')) failures.push('sourceApprovalDecisionDryRun must use source cohesion decision apply');
if (!String(report?.commands?.sourceApprovalDecisionDryRun ?? '').includes('water9-source-cohesion-reviewed-decisions.json')) failures.push('sourceApprovalDecisionDryRun must use reviewed-only source cohesion decisions');
if (String(report?.commands?.sourceApprovalDecisionDryRun ?? '').includes('water9-source-cohesion-decisions.json')) failures.push('sourceApprovalDecisionDryRun must not use generic source cohesion decisions');
if (!String(report?.commands?.sourceApprovalDecisionDryRun ?? '').includes('--strict')) failures.push('sourceApprovalDecisionDryRun must use strict mode');
if (String(report?.commands?.sourceApprovalDecisionDryRun ?? '').includes('--apply')) failures.push('sourceApprovalDecisionDryRun must not apply approvals');

for (const expected of [
  'Water 9 Content Acceptance Audit Index',
  'Preview-only evidence is not final acceptance',
  'Target threats',
  'Audited threats',
  'Source mechanical ready',
  'Threat mechanical ready',
  'Accepted toward gate',
  'Human Review Unlock Queue',
  'Source approval dry run',
  'Threat acceptance dry run',
  report?.commands?.sourceApprovalWorkspace,
  report?.commands?.sourceApprovalWorkspaceCheck,
  report?.commands?.sourceApprovalDecisionDryRun,
  report?.commands?.rebuild,
  report?.commands?.validate,
  report?.commands?.strictGoalGate,
]) {
  if (expected && !markdown.includes(expected)) failures.push(`markdown missing ${expected}`);
}

for (const expected of [
  'Water 9 Content Acceptance Audit Index',
  'Preview-only evidence is not final acceptance',
  'Target threats',
  'Source ready',
  'Threat ready',
  'Counts toward gate',
  'Human Review Unlock Queue',
  'Source Approval Dry Run',
  'Threat Acceptance Dry Run',
  'Batch Source Approval Workspace',
  '/review/source-approval-runway.html',
  '/review/source-visual-board.html',
  '/review/source-candidates/source-cohesion-decision-template.html',
  report?.commands?.sourceApprovalWorkspace,
  report?.commands?.sourceApprovalWorkspaceCheck,
  report?.commands?.sourceApprovalDecisionDryRun,
  report?.commands?.rebuild,
  report?.commands?.validate,
  report?.commands?.strictGoalGate,
]) {
  if (expected && !includesRendered(html, expected)) failures.push(`html missing ${expected}`);
}

const expectedRows = [...(matrix?.rows ?? [])]
  .filter((row) => row.id)
  .sort((a, b) => Number(a.rank ?? 9999) - Number(b.rank ?? 9999))
  .slice(0, minThreats);
const seen = new Set();
let sourceReady = 0;
let threatReady = 0;
let countsTowardGate = 0;
let acceptedThreats = 0;
const stageCounts = {};

for (const expectedRow of expectedRows) {
  const item = report?.items?.find((candidate) => candidate.id === expectedRow.id);
  if (!item) {
    failures.push(`${expectedRow.id}: missing from audit index`);
    continue;
  }
  if (seen.has(item.id)) failures.push(`${item.id}: duplicate audit index item`);
  seen.add(item.id);
  if (item.rank !== Number(expectedRow.rank)) failures.push(`${item.id}: rank does not match matrix`);
  if (item.species !== expectedRow.species) failures.push(`${item.id}: species does not match matrix`);
  if (!validStages.has(item.stage)) failures.push(`${item.id}: invalid stage ${item.stage}`);
  if (item.sourceMechanicalReady !== true) failures.push(`${item.id}: source mechanical evidence is not ready`);
  if (item.sourceApproved === true && item.threatMechanicalReady !== true) {
    failures.push(`${item.id}: threat mechanical evidence is not ready for an approved source`);
  }
  if (typeof item.sourceApproved !== 'boolean') failures.push(`${item.id}: sourceApproved must be boolean`);
  if (typeof item.threatAccepted !== 'boolean') failures.push(`${item.id}: threatAccepted must be boolean`);
  if (typeof item.countsTowardGate !== 'boolean') failures.push(`${item.id}: countsTowardGate must be boolean`);
  if (item.countsTowardGate !== (item.sourceApproved && item.threatAccepted)) failures.push(`${item.id}: countsTowardGate must require source and threat approval`);
  if (!Array.isArray(item.sourceBlockers)) failures.push(`${item.id}: sourceBlockers must be an array`);
  if (!Array.isArray(item.threatBlockers)) failures.push(`${item.id}: threatBlockers must be an array`);
  if (!item.auditJson || !item.auditMarkdown || !item.auditHtml) failures.push(`${item.id}: audit file paths are missing`);
  if (!item.auditHtmlHref || !item.auditMarkdownHref || !item.auditJsonHref) failures.push(`${item.id}: audit review hrefs are missing`);
  if (!String(item.nextAction ?? '').trim()) failures.push(`${item.id}: nextAction is missing`);
  if (!String(item.sourceApprovalCommandDryRun ?? '').includes('npm run source:accept')) failures.push(`${item.id}: sourceApprovalCommandDryRun must use source:accept`);
  if (!String(item.sourceApprovalCommandDryRun ?? '').includes('--dry-run')) failures.push(`${item.id}: sourceApprovalCommandDryRun must stay dry-run`);
  if (!String(item.sourceApprovalCommandDryRun ?? '').includes('--source-visual-board public/review/source-visual-board.json')) failures.push(`${item.id}: sourceApprovalCommandDryRun must reference source visual board`);
  if (!String(item.threatAcceptanceCommandDryRun ?? '').includes('npm run content:accept')) failures.push(`${item.id}: threatAcceptanceCommandDryRun must use content:accept`);
  if (!String(item.threatAcceptanceCommandDryRun ?? '').includes('--dry-run')) failures.push(`${item.id}: threatAcceptanceCommandDryRun must stay dry-run`);
  if (!String(item.sandboxHref ?? '').includes(`sandbox=${item.id}`)) failures.push(`${item.id}: sandbox href must target id`);
  if (!item.sourceReviewLinks?.approvalRunway || !item.sourceReviewLinks?.visualBoard || !item.sourceReviewLinks?.quickReview) {
    failures.push(`${item.id}: source review links are incomplete`);
  }
  if (!item.threatReviewLinks?.reviewGallery || !item.threatReviewLinks?.sandboxPreview || !item.threatReviewLinks?.pairedSandboxReport) {
    failures.push(`${item.id}: threat review links are incomplete`);
  }
  if (!markdown.includes(item.id)) failures.push(`markdown missing ${item.id}`);
  if (!includesRendered(html, item.id)) failures.push(`html missing ${item.id}`);
  if (!markdown.includes(item.sourceApprovalCommandDryRun ?? '<missing-source-command>')) failures.push(`${item.id}: markdown missing source approval dry-run command`);
  if (!markdown.includes(item.threatAcceptanceCommandDryRun ?? '<missing-threat-command>')) failures.push(`${item.id}: markdown missing threat acceptance dry-run command`);
  if (!includesRendered(html, item.sourceApprovalCommandDryRun ?? '<missing-source-command>')) failures.push(`${item.id}: html missing source approval dry-run command`);
  if (!includesRendered(html, item.threatAcceptanceCommandDryRun ?? '<missing-threat-command>')) failures.push(`${item.id}: html missing threat acceptance dry-run command`);
  if (!includesRendered(html, `data-source-approval-command="${item.id}"`)) failures.push(`${item.id}: html missing source approval command marker`);
  if (!includesRendered(html, `data-threat-acceptance-command="${item.id}"`)) failures.push(`${item.id}: html missing threat acceptance command marker`);

  const audit = await readJson(`${item.id} audit`, resolve(item.auditJson ?? 'missing'));
  await fileOk(`${item.id} audit json`, resolve(item.auditJson ?? 'missing'), 512);
  await fileOk(`${item.id} audit markdown`, resolve(item.auditMarkdown ?? 'missing'), 1024);
  await fileOk(`${item.id} audit html`, resolve(item.auditHtml ?? 'missing'), 2048);
  if (audit?.schema !== 'water9/content-acceptance-audit@1') failures.push(`${item.id}: audit schema is ${audit?.schema ?? 'missing'}`);
  if (audit?.id !== item.id) failures.push(`${item.id}: audit id mismatch`);
  if (audit?.stage !== item.stage) failures.push(`${item.id}: audit stage mismatch`);
  if (audit?.stage !== expectedStage(audit)) failures.push(`${item.id}: audit stage does not match evidence-derived stage`);
  if (audit?.source?.mechanicalReady !== item.sourceMechanicalReady) failures.push(`${item.id}: source mechanical ready mismatch`);
  if (audit?.threat?.mechanicalReady !== item.threatMechanicalReady) failures.push(`${item.id}: threat mechanical ready mismatch`);
  if (audit?.source?.approved !== item.sourceApproved) failures.push(`${item.id}: source approved mismatch`);
  if (audit?.threat?.accepted !== item.threatAccepted) failures.push(`${item.id}: threat accepted mismatch`);
  if (audit?.source?.approvalCommandDryRun !== item.sourceApprovalCommandDryRun) failures.push(`${item.id}: source approval dry-run command mismatch`);
  if (audit?.threat?.acceptanceCommandDryRun !== item.threatAcceptanceCommandDryRun) failures.push(`${item.id}: threat acceptance dry-run command mismatch`);
  if (audit?.reviewDisclosure?.countsTowardGate !== item.countsTowardGate) failures.push(`${item.id}: gate disclosure mismatch`);
  if (audit?.reviewDisclosure?.countsTowardGate !== true && !String(audit?.reviewDisclosure?.warning ?? '').includes('Preview-only')) {
    failures.push(`${item.id}: unaccepted audit must disclose preview-only status`);
  }
  if (audit?.source?.approvalCommandDryRun && !audit.source.approvalCommandDryRun.includes('--source-visual-board public/review/source-visual-board.json')) {
    failures.push(`${item.id}: source dry-run must reference source visual board`);
  }

  if (item.sourceMechanicalReady) sourceReady += 1;
  if (item.threatMechanicalReady) threatReady += 1;
  if (item.countsTowardGate) countsTowardGate += 1;
  if (item.sourceApproved && item.threatAccepted) acceptedThreats += 1;
  stageCounts[item.stage] = (stageCounts[item.stage] ?? 0) + 1;
}

if (seen.size !== minThreats) failures.push(`unique audited ids must be ${minThreats}`);
if (report?.summary?.sourceMechanicalReady !== sourceReady) failures.push('summary sourceMechanicalReady mismatch');
if (report?.summary?.threatMechanicalReady !== threatReady) failures.push('summary threatMechanicalReady mismatch');
if (report?.summary?.countsTowardGate !== countsTowardGate) failures.push('summary countsTowardGate mismatch');
if (report?.summary?.acceptedThreats !== acceptedThreats) failures.push('summary acceptedThreats mismatch');
if (JSON.stringify(report?.summary?.stageCounts ?? {}) !== JSON.stringify(stageCounts)) failures.push('summary stageCounts mismatch');
if (report?.summary?.strictGateComplete !== (countsTowardGate >= minThreats)) failures.push('summary strictGateComplete mismatch');

const summary = {
  schema: 'water9/content-acceptance-audit-index-check@1',
  auditedThreats: report?.items?.length ?? null,
  sourceMechanicalReady: sourceReady,
  threatMechanicalReady: threatReady,
  countsTowardGate,
  strictGateComplete: report?.summary?.strictGateComplete ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));

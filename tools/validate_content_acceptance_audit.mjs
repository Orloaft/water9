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
  json: resolve(String(args.get('json') ?? 'public/review/content-acceptance-audit.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-acceptance-audit.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-acceptance-audit.html')),
};

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

const report = await readJson('acceptance audit', paths.json);
const markdown = await readText('acceptance audit markdown', paths.markdown);
const html = await readText('acceptance audit html', paths.html);
await fileOk('acceptance audit json', paths.json, 512);
await fileOk('acceptance audit markdown', paths.markdown, 1024);
await fileOk('acceptance audit html', paths.html, 2048);

if (report?.schema !== 'water9/content-acceptance-audit@1') failures.push(`unexpected schema ${report?.schema ?? 'missing'}`);
if (!report?.id) failures.push('audit id is missing');
if (!validStages.has(report?.stage)) failures.push(`invalid audit stage ${report?.stage ?? 'missing'}`);
if (!String(report?.nextAction ?? '').trim()) failures.push('nextAction is missing');

for (const side of ['source', 'threat']) {
  const item = report?.[side] ?? {};
  if (typeof item.exists !== 'boolean') failures.push(`${side}.exists must be boolean`);
  if (typeof item.mechanicalReady !== 'boolean') failures.push(`${side}.mechanicalReady must be boolean`);
  if (!Array.isArray(item.blockers)) failures.push(`${side}.blockers must be an array`);
  if (!Array.isArray(item.warnings)) failures.push(`${side}.warnings must be an array`);
  if (!item.reviewLinks || typeof item.reviewLinks !== 'object') failures.push(`${side}.reviewLinks must be an object`);
}
if (typeof report?.source?.approved !== 'boolean') failures.push('source.approved must be boolean');
if (typeof report?.threat?.accepted !== 'boolean') failures.push('threat.accepted must be boolean');
if (!report?.reviewDisclosure || typeof report.reviewDisclosure !== 'object') {
  failures.push('reviewDisclosure is missing');
} else {
  const disclosure = report.reviewDisclosure;
  if (typeof disclosure.countsTowardGate !== 'boolean') failures.push('reviewDisclosure.countsTowardGate must be boolean');
  if (!String(disclosure.label ?? '').trim()) failures.push('reviewDisclosure.label is missing');
  if (!String(disclosure.warning ?? '').trim()) failures.push('reviewDisclosure.warning is missing');
  if (!String(disclosure.sourceClassification ?? '').trim()) failures.push('reviewDisclosure.sourceClassification is missing');
  if (!String(disclosure.threatClassification ?? '').trim()) failures.push('reviewDisclosure.threatClassification is missing');
  const expectedCountsTowardGate = report?.source?.approved === true && report?.threat?.accepted === true;
  if (disclosure.countsTowardGate !== expectedCountsTowardGate) {
    failures.push(`reviewDisclosure.countsTowardGate ${disclosure.countsTowardGate} does not match source/threat acceptance ${expectedCountsTowardGate}`);
  }
  if (!expectedCountsTowardGate && !String(disclosure.warning ?? '').includes('Preview-only')) {
    failures.push('unaccepted audit disclosure must warn that evidence is preview-only');
  }
}

const expectedStage = (() => {
  if (report?.source?.exists && !report.source.mechanicalReady) return 'source-evidence-needed';
  if (report?.source?.exists && !report.source.approved) return 'human-source-review-needed';
  if (!report?.threat?.exists) return 'rigging-needed';
  if (!report.threat.mechanicalReady) return 'threat-evidence-needed';
  if (!report.threat.accepted) return 'human-threat-review-needed';
  if (report?.source?.exists && report.source.approved && report.threat.accepted) return 'accepted';
  return 'missing-content';
})();
if (report?.stage !== expectedStage) failures.push(`stage ${report?.stage ?? 'missing'} does not match evidence-derived stage ${expectedStage}`);

for (const expected of [
  'Content Acceptance Audit',
  report?.id,
  report?.stage,
  'Gate disclosure',
  report?.reviewDisclosure?.label,
  report?.reviewDisclosure?.warning,
  report?.reviewDisclosure?.sourceClassification,
  report?.reviewDisclosure?.threatClassification,
  'Source Candidate',
  'Review links',
  'Articulated Threat',
  'Source approval dry-run command',
  'Threat acceptance dry-run command',
  'Next Action',
  report?.nextAction,
]) {
  if (expected && !markdown.includes(expected)) failures.push(`markdown missing ${expected}`);
}

for (const expected of [
  'Acceptance Audit',
  report?.id,
  report?.stage,
  'Gate Disclosure',
  report?.reviewDisclosure?.label,
  report?.reviewDisclosure?.warning,
  report?.reviewDisclosure?.sourceClassification,
  report?.reviewDisclosure?.threatClassification,
  'Source Candidate',
  'Source Review Links',
  'Articulated Threat',
  'Threat Review Links',
  'Source Blockers',
  'Threat Blockers',
  'Source Approval Dry Run',
  'Threat Acceptance Dry Run',
  'Sandbox Framing',
  report?.nextAction,
]) {
  if (expected && !includesRendered(html, expected)) failures.push(`html missing ${expected}`);
}

if (report?.source?.approvalCommandDryRun) {
  if (!report.source.approvalCommandDryRun.includes('npm run source:accept')) failures.push('source approval dry-run command must use source:accept');
  if (!report.source.approvalCommandDryRun.includes('--dry-run')) failures.push('source approval command must be a dry run');
  if (!report.source.approvalCommandDryRun.includes('--source-visual-board public/review/source-visual-board.json')) failures.push('source approval command must reference source visual board evidence');
  if (!markdown.includes(report.source.approvalCommandDryRun)) failures.push('markdown missing exact source approval dry-run command');
  if (!includesRendered(html, report.source.approvalCommandDryRun)) failures.push('html missing exact source approval dry-run command');
}
if (report?.threat?.acceptanceCommandDryRun) {
  if (!report.threat.acceptanceCommandDryRun.includes('npm run content:accept')) failures.push('threat acceptance dry-run command must use content:accept');
  if (!report.threat.acceptanceCommandDryRun.includes('--dry-run')) failures.push('threat acceptance command must be a dry run');
  if (!markdown.includes(report.threat.acceptanceCommandDryRun)) failures.push('markdown missing exact threat acceptance dry-run command');
  if (!includesRendered(html, report.threat.acceptanceCommandDryRun)) failures.push('html missing exact threat acceptance dry-run command');
}

if (report?.source?.exists) {
  for (const [key, expected] of Object.entries({
    approvalRunway: '/review/source-approval-runway.html',
    approvalChecklist: '/review/source-approval-checklist.json',
    visualBoard: '/review/source-visual-board.html',
    reviewDossier: '/review/source-candidates/source-review-dossier.html',
    reviewQueue: '/review/source-candidates/quick-reviews/index.html',
  })) {
    if (report.source.reviewLinks?.[key] !== expected) failures.push(`source.reviewLinks.${key} must be ${expected}`);
    if (!markdown.includes(expected)) failures.push(`markdown missing source review link ${expected}`);
    if (!includesRendered(html, expected)) failures.push(`html missing source review link ${expected}`);
  }
  for (const key of ['quickReview', 'source', 'thumbnail', 'keyPreview', 'sandboxScreenshot', 'planPreview', 'artContract']) {
    if (!report.source.reviewLinks?.[key]) failures.push(`source.reviewLinks.${key} is missing`);
  }
}

if (report?.threat?.exists) {
  for (const key of ['reviewGallery', 'sandboxPreview', 'planPreview', 'contactSheet', 'phaseStrip', 'sourceParity', 'pairedSandboxReport', 'pairedSandboxScreenshot']) {
    if (!report.threat.reviewLinks?.[key]) failures.push(`threat.reviewLinks.${key} is missing`);
  }
  for (const expected of [
    report.threat.reviewLinks?.reviewGallery,
    report.threat.reviewLinks?.sandboxPreview,
    report.threat.reviewLinks?.contactSheet,
    report.threat.reviewLinks?.phaseStrip,
    report.threat.reviewLinks?.sourceParity,
  ]) {
    if (expected && !markdown.includes(expected)) failures.push(`markdown missing threat review link ${expected}`);
    if (expected && !includesRendered(html, expected)) failures.push(`html missing threat review link ${expected}`);
  }
}

const summary = {
  schema: 'water9/content-acceptance-audit-check@1',
  id: report?.id ?? null,
  stage: report?.stage ?? null,
  sourceBlockers: report?.source?.blockers?.length ?? null,
  threatBlockers: report?.threat?.blockers?.length ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

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
  json: resolve(String(args.get('json') ?? 'public/review/content-subagent-audit-ledger.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-subagent-audit-ledger.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-subagent-audit-ledger.html')),
  input: resolve(String(args.get('input') ?? 'tools/audit/content-subagent-audit-ledger-input.json')),
  pairedVisualReport: resolve(String(args.get('paired-visual-report') ?? 'tools/scratch/sandbox-target-paired-visuals-report.json')),
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

const ledger = await readJson('content subagent audit ledger', paths.json);
const input = await readJson('content subagent audit ledger input', paths.input);
const pairedVisualReport = await readJson('paired visual report', paths.pairedVisualReport);
const markdown = await readText('content subagent audit ledger markdown', paths.markdown);
const html = await readText('content subagent audit ledger html', paths.html);
await fileOk('content subagent audit ledger markdown', paths.markdown, 1024);
await fileOk('content subagent audit ledger html', paths.html, 2048);

if (ledger?.schema !== 'water9/content-subagent-audit-ledger@1') failures.push(`unexpected ledger schema ${ledger?.schema ?? 'missing'}`);
if (input?.schema !== 'water9/content-subagent-audit-ledger-input@1') failures.push(`unexpected ledger input schema ${input?.schema ?? 'missing'}`);
if (ledger?.policy?.independentAuditsDoNotApproveContent !== true) failures.push('ledger policy must state independent audits do not approve content');
if (ledger?.policy?.humanSourceApprovalStillRequired !== true) failures.push('ledger policy must preserve human source approval requirement');
if (ledger?.policy?.strictThreatAcceptanceStillRequired !== true) failures.push('ledger policy must preserve strict threat acceptance requirement');

const audits = Array.isArray(ledger?.audits) ? ledger.audits : [];
if (audits.length < 3) failures.push(`ledger has ${audits.length} audits, expected at least 3`);
if ((ledger?.summary?.audits ?? -1) !== audits.length) failures.push('ledger audit summary mismatch');
if ((ledger?.summary?.completedAudits ?? -1) !== audits.filter((audit) => audit.status === 'completed').length) failures.push('ledger completed audit summary mismatch');
for (const scope of ['sandbox-preview-infrastructure', 'research-source-trace', 'source-approval-session-workflow']) {
  if (!audits.some((audit) => audit.scope === scope)) failures.push(`ledger missing scope ${scope}`);
  if (!ledger?.summary?.scopes?.includes(scope)) failures.push(`ledger summary missing scope ${scope}`);
}
for (const audit of audits) {
  if (!audit.id) failures.push('audit missing id');
  if (!String(audit.agentId ?? '').match(/^019/)) failures.push(`${audit.id}: audit missing concrete agent id`);
  if (!String(audit.agentNickname ?? '').trim()) failures.push(`${audit.id}: audit missing agent nickname`);
  if (audit.status !== 'completed') failures.push(`${audit.id}: audit status must be completed`);
  if (audit.repoAnchor !== '/mnt/nxt-dev/water9') failures.push(`${audit.id}: repoAnchor mismatch`);
  if (audit.editsMadeByAgent !== false) failures.push(`${audit.id}: explorer audit should record no direct edits`);
  for (const key of ['proven', 'gapsFound', 'inspectedFiles']) {
    if (!Array.isArray(audit[key]) || audit[key].length < 2) failures.push(`${audit.id}: ${key} must contain concrete entries`);
  }
}
if ((ledger?.currentEvidence?.sandboxEntries ?? 0) < 70) failures.push('ledger current evidence has too few sandbox entries');
if ((ledger?.currentEvidence?.pairedVisualChecked ?? 0) < minThreats * 2) failures.push('ledger current evidence must include paired runtime and source visual checks');
if (!ledger?.currentEvidence?.pairedVisualGeneratedAt) failures.push('ledger current evidence missing paired visual generatedAt');
if (ledger?.currentEvidence?.pairedVisualGeneratedAt !== pairedVisualReport?.generatedAt) failures.push('ledger paired visual generatedAt mismatch');
if ((ledger?.currentEvidence?.pairedVisualFailures ?? -1) !== 0) failures.push('ledger paired visual failures must be 0');
if ((ledger?.currentEvidence?.researchAuditedCandidates ?? 0) < minThreats) failures.push('ledger current evidence must include 20 audited research candidates');
if ((ledger?.currentEvidence?.humanApprovedSources ?? 0) !== 0 && ledger?.policy?.strictGateStillRequired === true) {
  failures.push('ledger humanApprovedSources is inconsistent with strict gate still required state');
}

for (const required of [
  'Water 9 Subagent Audit Ledger',
  'These audits do not approve source art',
  'sandbox-preview-infrastructure',
  'research-source-trace',
  'source-approval-session-workflow',
  'paired visual checked',
  'human-approved sources',
  'data-content-subagent-audit-ledger',
]) {
  if (!markdown.includes(required) && !includesRendered(html, required)) failures.push(`rendered outputs missing ${required}`);
}

const summary = {
  schema: 'water9/content-subagent-audit-ledger-check@1',
  audits: ledger?.summary?.audits ?? null,
  completedAudits: ledger?.summary?.completedAudits ?? null,
  pairedVisualGeneratedAt: ledger?.currentEvidence?.pairedVisualGeneratedAt ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

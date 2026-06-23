import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const paths = {
  input: resolve(String(args.get('input') ?? 'tools/audit/content-subagent-audit-ledger-input.json')),
  sandboxManifest: resolve(String(args.get('sandbox-manifest') ?? 'public/review/sandbox/manifest.json')),
  researchTrace: resolve(String(args.get('research-trace') ?? 'public/review/source-candidates/research-source-trace.json')),
  researchAudits: resolve(String(args.get('research-audits') ?? 'public/review/source-candidates/research-subagent-audits-summary.json')),
  sourceApprovalRunway: resolve(String(args.get('source-approval-runway') ?? 'public/review/source-approval-runway.json')),
  pairedVisualReport: resolve(String(args.get('paired-visual-report') ?? 'tools/scratch/sandbox-target-paired-visuals-report.json')),
  goalReadiness: resolve(String(args.get('goal-readiness') ?? 'public/review/content-goal-readiness.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-subagent-audit-ledger.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/content-subagent-audit-ledger.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-subagent-audit-ledger.html')),
};

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function list(items) {
  return (items ?? []).map((item) => `- ${item}`).join('\n') || '- none';
}

function markdown(report) {
  const lines = [
    '# Water 9 Subagent Audit Ledger',
    '',
    `Generated: \`${report.generatedAt}\``,
    `Recorded audits: \`${report.summary.audits}\``,
    `Completed audits: \`${report.summary.completedAudits}\``,
    `Scopes: \`${report.summary.scopes.join(', ')}\``,
    '',
    'This ledger records independent audit passes over the content pipeline. These audits do not approve source art, do not accept threats, and do not count preview-only work toward the strict 20-threat gate.',
    '',
    '## Current Evidence Snapshot',
    '',
    `- Sandbox entries: \`${report.currentEvidence.sandboxEntries}\``,
    `- Paired visual report generated: \`${report.currentEvidence.pairedVisualGeneratedAt ?? 'missing'}\``,
    `- Paired visual checked entries: \`${report.currentEvidence.pairedVisualChecked}\``,
    `- Research traced candidates: \`${report.currentEvidence.researchTraceCandidates}\``,
    `- Research audited candidates: \`${report.currentEvidence.researchAuditedCandidates}\``,
    `- Source approval-ready: \`${report.currentEvidence.sourceApprovalReady}\``,
    `- Human-approved sources: \`${report.currentEvidence.humanApprovedSources}\``,
    `- Strict goal complete: \`${report.currentEvidence.strictGoalComplete}\``,
    '',
    '## Audits',
    '',
  ];
  for (const audit of report.audits) {
    lines.push(
      `### ${audit.id}`,
      '',
      `- Agent: \`${audit.agentNickname}\` / \`${audit.agentId}\``,
      `- Scope: \`${audit.scope}\``,
      `- Status: \`${audit.status}\``,
      `- Repo anchor: \`${audit.repoAnchor}\``,
      `- Edits made by agent: \`${audit.editsMadeByAgent}\``,
      '',
      audit.summary,
      '',
      '**Proven**',
      '',
      list(audit.proven),
      '',
      '**Gaps Found**',
      '',
      list(audit.gapsFound),
      '',
      '**Gaps Closed This Pass**',
      '',
      list(audit.gapsClosedThisPass),
      '',
    );
  }
  lines.push(
    '## Commands',
    '',
    '```bash',
    'npm run content:subagent-audit-ledger',
    'npm run content:subagent-audit-ledger-check',
    'npm run content:goal-readiness-strict',
    '```',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function html(report) {
  const cards = report.audits.map((audit) => `<article class="card" data-subagent-audit="${htmlEscape(audit.id)}">
    <header><h2>${htmlEscape(audit.id)}</h2><strong>${htmlEscape(audit.status)}</strong></header>
    <dl>
      <dt>agent</dt><dd>${htmlEscape(audit.agentNickname)} <code>${htmlEscape(audit.agentId)}</code></dd>
      <dt>scope</dt><dd>${htmlEscape(audit.scope)}</dd>
      <dt>repo</dt><dd><code>${htmlEscape(audit.repoAnchor)}</code></dd>
      <dt>edits</dt><dd>${audit.editsMadeByAgent ? 'yes' : 'no'}</dd>
    </dl>
    <p>${htmlEscape(audit.summary)}</p>
    <h3>Proven</h3>
    <ul>${audit.proven.map((item) => `<li>${htmlEscape(item)}</li>`).join('')}</ul>
    <h3>Gaps Found</h3>
    <ul>${audit.gapsFound.map((item) => `<li>${htmlEscape(item)}</li>`).join('')}</ul>
    <h3>Gaps Closed This Pass</h3>
    <ul>${audit.gapsClosedThisPass.map((item) => `<li>${htmlEscape(item)}</li>`).join('')}</ul>
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Subagent Audit Ledger</title>
  <style>
    :root { color-scheme: dark; background:#061014; color:#d9edf0; font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    body { margin:0; padding:28px; background:#061014; }
    main { max-width:1160px; margin:0 auto; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4rem); letter-spacing:0; }
    h2 { margin:0; font-size:1.1rem; }
    h3 { margin:14px 0 8px; color:#99b5bd; font-size:.8rem; text-transform:uppercase; }
    p, li, dd { color:#bfd4d9; }
    code { color:#dff8ff; font-family:"SFMono-Regular",Consolas,monospace; overflow-wrap:anywhere; }
    .notice, .card, .summary { border:1px solid #294653; background:#0b1d24; border-radius:6px; padding:14px; }
    .notice { border-color:#6a5230; background:#1d1710; color:#f0d9aa; margin:14px 0; }
    .summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:8px; margin:18px 0; }
    .summary span { border:1px solid #203b46; background:#07171d; border-radius:5px; padding:8px 10px; }
    .card { margin:12px 0; }
    .card header { display:flex; justify-content:space-between; gap:12px; align-items:start; }
    dl { display:grid; grid-template-columns:90px 1fr; gap:5px 10px; margin:12px 0; }
    dt { color:#8fa8ae; }
    dd { margin:0; }
  </style>
</head>
<body>
  <main data-content-subagent-audit-ledger>
    <h1>Subagent Audit Ledger</h1>
    <p>Independent audit record for the Water 9 content pipeline.</p>
    <div class="notice">These audits do not approve source art, do not accept threats, and do not count preview-only work toward the strict 20-threat gate.</div>
    <section class="summary">
      <span>audits <strong>${report.summary.audits}</strong></span>
      <span>completed <strong>${report.summary.completedAudits}</strong></span>
      <span>paired visual checked <strong>${report.currentEvidence.pairedVisualChecked}</strong></span>
      <span>research audited <strong>${report.currentEvidence.researchAuditedCandidates}</strong></span>
      <span>human-approved sources <strong>${report.currentEvidence.humanApprovedSources}</strong></span>
      <span>strict complete <strong>${report.currentEvidence.strictGoalComplete}</strong></span>
    </section>
    ${cards}
  </main>
</body>
</html>
`;
}

const input = await readJson(paths.input, { audits: [], policy: {} });
if (input.schema !== 'water9/content-subagent-audit-ledger-input@1') {
  throw new Error(`Unexpected ledger input schema ${input.schema ?? 'missing'}`);
}
const sandboxManifest = await readJson(paths.sandboxManifest, { entries: [] });
const researchTrace = await readJson(paths.researchTrace, { summary: {} });
const researchAudits = await readJson(paths.researchAudits, { auditedCandidates: [] });
const sourceApprovalRunway = await readJson(paths.sourceApprovalRunway, { summary: {} });
const pairedVisualReport = await readJson(paths.pairedVisualReport, { checked: 0 });
const goalReadiness = await readJson(paths.goalReadiness, { strictGoalComplete: false });

const audits = input.audits ?? [];
const report = {
  schema: 'water9/content-subagent-audit-ledger@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    input: 'tools/audit/content-subagent-audit-ledger-input.json',
    sandboxManifest: 'public/review/sandbox/manifest.json',
    researchTrace: 'public/review/source-candidates/research-source-trace.json',
    researchAudits: 'public/review/source-candidates/research-subagent-audits-summary.json',
    sourceApprovalRunway: 'public/review/source-approval-runway.json',
    pairedVisualReport: 'tools/scratch/sandbox-target-paired-visuals-report.json',
    goalReadiness: 'public/review/content-goal-readiness.json',
  },
  policy: {
    ...input.policy,
    independentAuditsDoNotApproveContent: true,
    strictGateStillRequired: goalReadiness.strictGoalComplete !== true,
  },
  summary: {
    audits: audits.length,
    completedAudits: audits.filter((audit) => audit.status === 'completed').length,
    scopes: [...new Set(audits.map((audit) => audit.scope))].sort(),
    repoAnchors: [...new Set(audits.map((audit) => audit.repoAnchor))].sort(),
    editsMadeByAuditors: audits.filter((audit) => audit.editsMadeByAgent === true).length,
  },
  currentEvidence: {
    sandboxEntries: (sandboxManifest.entries ?? []).length,
    sandboxPreviewOnly: sandboxManifest.counts?.previewOnly ?? 0,
    pairedVisualGeneratedAt: pairedVisualReport.generatedAt ?? null,
    pairedVisualChecked: pairedVisualReport.checked ?? 0,
    pairedVisualFailures: (pairedVisualReport.failures ?? []).length,
    researchTraceCandidates: researchTrace.summary?.candidates ?? 0,
    researchAssignedToSubagents: researchTrace.summary?.assignedToSubagents ?? 0,
    researchAuditedCandidates: researchTrace.summary?.auditedCandidates ?? (researchAudits.auditedCandidates ?? []).length,
    sourceApprovalReady: sourceApprovalRunway.summary?.readyForHumanReview ?? 0,
    humanApprovedSources: sourceApprovalRunway.summary?.humanApproved ?? 0,
    strictGoalComplete: goalReadiness.strictGoalComplete === true,
    nextStage: goalReadiness.nextAction?.stage ?? null,
  },
  audits,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdown(report));
await writeFile(paths.outHtml, html(report));

console.log(JSON.stringify({
  schema: report.schema,
  audits: report.summary.audits,
  completedAudits: report.summary.completedAudits,
  scopes: report.summary.scopes,
  pairedVisualGeneratedAt: report.currentEvidence.pairedVisualGeneratedAt,
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
}, null, 2));

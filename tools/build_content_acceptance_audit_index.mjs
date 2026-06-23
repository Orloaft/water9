import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { relative, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const matrixPath = resolve(String(args.get('matrix') ?? 'public/review/content-review-evidence-matrix.json'));
const outDir = resolve(String(args.get('out-dir') ?? 'public/review/content-acceptance-audits'));
const jsonOut = resolve(String(args.get('json-out') ?? `${outDir}/index.json`));
const markdownOut = resolve(String(args.get('out') ?? `${outDir}/index.md`));
const htmlOut = resolve(String(args.get('html-out') ?? `${outDir}/index.html`));
const sandboxReportDir = String(args.get('sandbox-report-dir') ?? 'tools/scratch');
const minThreats = Number(args.get('min-threats') ?? 20);

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function reviewHref(path) {
  const absolute = resolve(path);
  const reviewRoot = resolve('public/review');
  const relativePath = relative(reviewRoot, absolute).replaceAll('\\', '/');
  return `/review/${relativePath}`;
}

function publicAssetPath(path) {
  return path.replaceAll('\\', '/');
}

function stageCounts(items) {
  const counts = {};
  for (const item of items) counts[item.stage] = (counts[item.stage] ?? 0) + 1;
  return counts;
}

function renderMarkdown(report) {
  const rows = report.items.map((item) => [
    item.rank,
    item.id,
    item.species,
    item.stage,
    item.sourceMechanicalReady ? 'yes' : 'no',
    item.sourceApproved ? 'yes' : 'no',
    item.threatMechanicalReady ? 'yes' : 'no',
    item.threatAccepted ? 'yes' : 'no',
    item.countsTowardGate ? 'yes' : 'no',
    `[audit](${item.auditMarkdownHref})`,
  ]);
  return [
    '# Water 9 Content Acceptance Audit Index',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'This index runs the strict single-threat acceptance audit for every mapped candidate threat. Preview-only evidence is not final acceptance.',
    '',
    '## Summary',
    '',
    `- Target threats: ${report.summary.targetThreats}`,
    `- Audited threats: ${report.summary.auditedThreats}`,
    `- Source mechanical ready: ${report.summary.sourceMechanicalReady}`,
    `- Threat mechanical ready: ${report.summary.threatMechanicalReady}`,
    `- Human source review needed: ${report.summary.humanSourceReviewNeeded}`,
    `- Human threat review needed: ${report.summary.humanThreatReviewNeeded}`,
    `- Accepted toward gate: ${report.summary.countsTowardGate}`,
    `- Strict gate complete: ${report.summary.strictGateComplete ? 'yes' : 'no'}`,
    `- Next gate: ${report.summary.nextGate}`,
    '',
    '## Commands',
    '',
    '```sh',
    report.commands.rebuild,
    report.commands.validate,
    report.commands.sourceApprovalWorkspace,
    report.commands.sourceApprovalWorkspaceCheck,
    report.commands.sourceApprovalDecisionDryRun,
    report.commands.strictGoalGate,
    '```',
    '',
    '## Human Review Unlock Queue',
    '',
    'These commands are dry runs. A human reviewer must inspect the linked evidence, replace placeholders with specific notes, and remove `--dry-run` only when the source art or rig is genuinely approved.',
    '',
    ...report.items.flatMap((item) => [
      `### ${item.rank}. ${item.species} (${item.id})`,
      '',
      'Source approval dry run:',
      '',
      '```sh',
      item.sourceApprovalCommandDryRun ?? '<missing>',
      '```',
      '',
      'Threat acceptance dry run:',
      '',
      '```sh',
      item.threatAcceptanceCommandDryRun ?? '<missing>',
      '```',
      '',
    ]),
    '',
    '## Audits',
    '',
    '| # | ID | Species | Stage | Source ready | Source approved | Threat ready | Threat accepted | Counts | Links |',
    '| - | - | - | - | - | - | - | - | - | - |',
    ...rows.map((row) => `| ${row.map((cell) => String(cell).replaceAll('|', '\\|')).join(' | ')} |`),
    '',
  ].join('\n');
}

function renderHtml(report) {
  const rows = report.items.map((item) => `
    <tr data-content-acceptance-audit="${htmlEscape(item.id)}">
      <td>${item.rank}</td>
      <td><code>${htmlEscape(item.id)}</code></td>
      <td>${htmlEscape(item.species)}</td>
      <td>${htmlEscape(item.stage)}</td>
      <td>${item.sourceMechanicalReady ? 'yes' : 'no'}</td>
      <td>${item.sourceApproved ? 'yes' : 'no'}</td>
      <td>${item.threatMechanicalReady ? 'yes' : 'no'}</td>
      <td>${item.threatAccepted ? 'yes' : 'no'}</td>
      <td>${item.countsTowardGate ? 'yes' : 'no'}</td>
      <td><a href="${htmlEscape(item.auditHtmlHref)}">audit</a> <a href="${htmlEscape(item.sandboxHref)}">sandbox</a></td>
    </tr>`).join('\n');
  const commandCards = report.items.map((item) => `
    <details class="command-card" data-source-approval-command="${htmlEscape(item.id)}" data-threat-acceptance-command="${htmlEscape(item.id)}">
      <summary>${item.rank}. ${htmlEscape(item.species)} <code>${htmlEscape(item.id)}</code></summary>
      <p>Dry-run commands only. Inspect evidence first, replace placeholders with specific review notes, then remove <code>--dry-run</code> only when approved.</p>
      <h3>Source Approval Dry Run</h3>
      <pre>${htmlEscape(item.sourceApprovalCommandDryRun ?? '<missing>')}</pre>
      <h3>Threat Acceptance Dry Run</h3>
      <pre>${htmlEscape(item.threatAcceptanceCommandDryRun ?? '<missing>')}</pre>
    </details>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Content Acceptance Audit Index</title>
  <style>
    :root { color-scheme: dark; background: #071014; color: #d8edf2; font-family: system-ui, sans-serif; }
    body { margin: 0; padding: 28px; }
    main { max-width: 1280px; margin: 0 auto; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin: 20px 0; }
    .stat { border: 1px solid #24434a; background: #0b1a20; padding: 12px; border-radius: 6px; }
    .label { color: #86aeb8; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
    .value { font-size: 20px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 13px; }
    th, td { border-bottom: 1px solid #1c353c; padding: 8px; text-align: left; vertical-align: top; }
    th { color: #9fc7cf; position: sticky; top: 0; background: #071014; }
    code, pre { background: #10242b; color: #e6f5f7; border-radius: 4px; }
    code { padding: 2px 4px; }
    pre { padding: 12px; overflow: auto; }
    details { border: 1px solid #1c353c; background: #09171c; border-radius: 6px; margin: 10px 0; padding: 10px; }
    summary { cursor: pointer; color: #d8edf2; }
    h3 { margin-bottom: 8px; color: #9fc7cf; font-size: 13px; text-transform: uppercase; }
    a { color: #89d7ff; }
    .warning { border-left: 3px solid #e6b450; padding-left: 12px; color: #f5db9b; }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Content Acceptance Audit Index</h1>
    <p class="warning">Preview-only evidence is not final acceptance. Items count toward the goal only after source and threat approval are both recorded.</p>
    <section class="summary">
      <div class="stat"><div class="label">Target threats</div><div class="value">${report.summary.targetThreats}</div></div>
      <div class="stat"><div class="label">Audited</div><div class="value">${report.summary.auditedThreats}</div></div>
      <div class="stat"><div class="label">Source ready</div><div class="value">${report.summary.sourceMechanicalReady}</div></div>
      <div class="stat"><div class="label">Threat ready</div><div class="value">${report.summary.threatMechanicalReady}</div></div>
      <div class="stat"><div class="label">Counts toward gate</div><div class="value">${report.summary.countsTowardGate}</div></div>
      <div class="stat"><div class="label">Next gate</div><div class="value">${htmlEscape(report.summary.nextGate)}</div></div>
    </section>
    <h2>Commands</h2>
    <pre>${htmlEscape([
      report.commands.rebuild,
      report.commands.validate,
      report.commands.sourceApprovalWorkspace,
      report.commands.sourceApprovalWorkspaceCheck,
      report.commands.sourceApprovalDecisionDryRun,
      report.commands.strictGoalGate,
    ].join('\n'))}</pre>
    <h2>Batch Source Approval Workspace</h2>
    <p>Use the source approval runway, source visual board, and source cohesion batch decisions before running any final source approval command.</p>
    <p><a href="/review/source-approval-runway.html">source approval runway</a> <a href="/review/source-visual-board.html">source visual board</a> <a href="/review/source-candidates/source-cohesion-decision-template.html">source cohesion batch decisions</a></p>
    <h2>Human Review Unlock Queue</h2>
    <p class="warning">These are dry-run commands. Automation can prepare evidence, but approval requires human review and specific written rationale.</p>
    ${commandCards}
    <h2>Audits</h2>
    <table>
      <thead>
        <tr><th>#</th><th>ID</th><th>Species</th><th>Stage</th><th>Source ready</th><th>Source approved</th><th>Threat ready</th><th>Threat accepted</th><th>Counts</th><th>Links</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
</body>
</html>
`;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

const matrix = await readJson(matrixPath);
const rows = [...(matrix.rows ?? [])]
  .filter((row) => row.id)
  .sort((a, b) => Number(a.rank ?? 9999) - Number(b.rank ?? 9999));

if (rows.length < minThreats) {
  console.error(`content acceptance audit index requires at least ${minThreats} matrix rows; found ${rows.length}`);
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

const items = [];
const auditErrors = [];
for (const row of rows.slice(0, minThreats)) {
  const auditBase = resolve(outDir, row.id);
  const auditJson = `${auditBase}.json`;
  const auditMarkdown = `${auditBase}.md`;
  const auditHtml = `${auditBase}.html`;
  const result = spawnSync(process.execPath, [
    'tools/content_acceptance_audit.mjs',
    '--id', row.id,
    '--json-out', auditJson,
    '--out', auditMarkdown,
    '--html-out', auditHtml,
    '--sandbox-report-dir', sandboxReportDir,
  ], { encoding: 'utf8' });
  if (result.status !== 0) {
    auditErrors.push({
      id: row.id,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    });
    continue;
  }
  const audit = await readJson(auditJson);
  items.push({
    rank: Number(row.rank ?? items.length + 1),
    id: row.id,
    species: row.species ?? audit.source?.species ?? row.id,
    stage: audit.stage,
    sourceMechanicalReady: audit.source?.mechanicalReady === true,
    sourceApproved: audit.source?.approved === true,
    threatMechanicalReady: audit.threat?.mechanicalReady === true,
    threatAccepted: audit.threat?.accepted === true,
    countsTowardGate: audit.reviewDisclosure?.countsTowardGate === true,
    sourceBlockers: audit.source?.blockers ?? [],
    threatBlockers: audit.threat?.blockers ?? [],
    nextAction: audit.nextAction,
    sourceApprovalCommandDryRun: audit.source?.approvalCommandDryRun ?? null,
    threatAcceptanceCommandDryRun: audit.threat?.acceptanceCommandDryRun ?? null,
    auditJson: publicAssetPath(relative(process.cwd(), auditJson)),
    auditMarkdown: publicAssetPath(relative(process.cwd(), auditMarkdown)),
    auditHtml: publicAssetPath(relative(process.cwd(), auditHtml)),
    auditJsonHref: reviewHref(auditJson),
    auditMarkdownHref: reviewHref(auditMarkdown),
    auditHtmlHref: reviewHref(auditHtml),
    sandboxHref: audit.threat?.reviewLinks?.sandboxPreview ?? `/?sandbox=${row.id}`,
    sourceReviewLinks: audit.source?.reviewLinks ?? {},
    threatReviewLinks: audit.threat?.reviewLinks ?? {},
  });
}

if (auditErrors.length) {
  console.error(JSON.stringify({ schema: 'water9/content-acceptance-audit-index-error@1', auditErrors }, null, 2));
  process.exit(1);
}

const summary = {
  targetThreats: minThreats,
  matrixRows: rows.length,
  auditedThreats: items.length,
  sourceMechanicalReady: items.filter((item) => item.sourceMechanicalReady).length,
  threatMechanicalReady: items.filter((item) => item.threatMechanicalReady).length,
  humanSourceReviewNeeded: items.filter((item) => item.stage === 'human-source-review-needed').length,
  humanThreatReviewNeeded: items.filter((item) => item.stage === 'human-threat-review-needed').length,
  countsTowardGate: items.filter((item) => item.countsTowardGate).length,
  acceptedThreats: items.filter((item) => item.sourceApproved && item.threatAccepted).length,
  strictGateComplete: items.length >= minThreats && items.slice(0, minThreats).every((item) => item.countsTowardGate),
  nextGate: items.some((item) => !item.sourceApproved) ? 'human-source-review' : items.some((item) => !item.threatAccepted) ? 'human-threat-review' : 'content-gate',
  stageCounts: stageCounts(items),
};

const report = {
  schema: 'water9/content-acceptance-audit-index@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    evidenceMatrix: publicAssetPath(relative(process.cwd(), matrixPath)),
    sandboxReportDir,
  },
  summary,
  commands: {
    rebuild: 'npm run content:acceptance-audit-index',
    validate: 'npm run content:acceptance-audit-index-check',
    sourceApprovalWorkspace: 'npm run source:approval-runway && npm run source:visual-board && npm run source:cohesion-decisions',
    sourceApprovalWorkspaceCheck: 'npm run source:approval-runway-check && npm run source:visual-board-check && npm run source:cohesion-decisions-check',
    sourceApprovalDecisionDryRun: 'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
    strictGoalGate: 'npm run content:goal-readiness-strict',
  },
  items,
};

await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownOut, renderMarkdown(report));
await writeFile(htmlOut, renderHtml(report));

console.log(JSON.stringify({
  schema: 'water9/content-acceptance-audit-index-build@1',
  jsonOut,
  markdownOut,
  htmlOut,
  summary,
}, null, 2));

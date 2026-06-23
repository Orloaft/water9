import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
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
  runtimeCoverage: resolve(String(args.get('runtime-coverage') ?? 'public/review/content-runtime-coverage.json')),
  planCoverage: resolve(String(args.get('plan-coverage') ?? 'public/review/content-plan-coverage.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-approved-runtime-handoff.json')),
  outMd: resolve(String(args.get('md-out') ?? 'public/review/content-approved-runtime-handoff.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-approved-runtime-handoff.html')),
};

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function fileSummary(path) {
  try {
    const info = await stat(path);
    return { path, exists: info.isFile(), bytes: info.size, mtimeMs: Math.round(info.mtimeMs) };
  } catch {
    return { path, exists: false, bytes: 0, mtimeMs: 0 };
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function commandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function planPath(id) {
  return `tools/scratch/${id}-starter-plan.json`;
}

function planPreviewPath(id) {
  return `public/review/articulated/${id}-plan-preview.png`;
}

function commandsFor(id) {
  const plan = planPath(id);
  const preview = planPreviewPath(id);
  return {
    sourceApprovalReview: `npm run source:approval-runway:preview -- --id ${id}`,
    preparePlan: `npm run articulated:prepare-plan -- --id ${id} --plan ${plan} --preview ${preview}`,
    planCheck: `npm run articulated:plan-check -- --plan ${plan}`,
    extractDryRun: `npm run articulated:extract-plan -- --plan ${plan} --dry-run`,
    extractAndRegister: `npm run articulated:extract-plan -- --plan ${plan}`,
    articulatedCheck: 'npm run articulated:check',
    sandboxIndex: 'npm run sandbox:index',
    runtimeCoverageCheck: 'npm run content:runtime-coverage && npm run content:runtime-coverage-check',
    sandboxPreview: `npm run sandbox:preview -- --id ${id} --with diver --serve --open --visual`,
    sandboxVisual: `npm run sandbox:visual -- --ids ${id} --states idle,lunge,stunned --with diver`,
  };
}

function markdownFor(report) {
  const rows = report.items.map((item) => `| ${item.id} | ${item.species} | ${item.sourceApproved ? 'yes' : 'no'} | ${item.riggingEligibleOnly ? 'yes' : 'no'} | ${item.acceptedForContentGate ? 'yes' : 'no'} | ${item.blockers.join('; ') || 'none'} |`).join('\n');
  const cards = report.items.map((item) => `## ${item.species} (${item.id})

- Source approved: \`${item.sourceApproved}\`
- Runtime registered: \`${item.runtimeRegistered}\`
- Rigging eligible only: \`${item.riggingEligibleOnly}\`
- Accepted for content gate: \`${item.acceptedForContentGate}\`
- Plan: \`${item.plan}\`
- Plan preview: \`${item.planPreview}\`
- Blockers: ${item.blockers.map((blocker) => `\`${blocker}\``).join(', ') || '`none`'}

\`\`\`bash
${Object.values(item.commands).join('\n')}
\`\`\`
`).join('\n');
  const emptyState = `## No Missing Runtime Handoffs

All current 20 source candidates already have runtime prototypes. This report intentionally remains present so the pipeline can prove the approved-source-to-runtime step is empty rather than missing.

Next verification commands:

\`\`\`bash
npm run content:runtime-coverage && npm run content:runtime-coverage-check
npm run sandbox:index && npm run sandbox:runtime-check
npm run content:approved-runtime-handoff-check
\`\`\`
`;
  return `# Water 9 Approved Source Runtime Handoff

Read-only command matrix for moving strict-approved source candidates into registered runtime creatures and paired-diver sandbox review.

## Summary

- Candidates: ${report.summary.candidates}
- Missing runtime: ${report.summary.missingRuntime}
- Approved sources missing runtime: ${report.summary.approvedSourcesMissingRuntime}
- Rigging eligible handoffs: ${report.summary.riggingEligibleOnly}
- Accepted for content gate: 0
- Blocked until source approval: ${report.summary.blockedUntilSourceApproval}

## Commands

\`\`\`bash
npm run content:approved-runtime-handoff
npm run content:approved-runtime-handoff-check
npm run content:runtime-coverage && npm run content:runtime-coverage-check
\`\`\`

## Handoff Matrix

| Candidate | Species | Source approved | Rigging eligible only | Accepted for gate | Blockers |
| --- | --- | ---: | ---: | ---: | --- |
${rows}

## Approved Source To Runtime Chain

${cards || emptyState}
`;
}

function htmlFor(report) {
  const cards = report.items.map((item) => `<article class="card" data-approved-runtime-handoff="${htmlEscape(item.id)}">
    <header>
      <div><h2>${htmlEscape(item.species)}</h2><code>${htmlEscape(item.id)}</code></div>
      <strong>${item.riggingEligibleOnly ? 'rigging eligible only' : 'blocked'}</strong>
    </header>
    <div class="badges">
      <span>source approved <strong>${item.sourceApproved}</strong></span>
      <span>runtime registered <strong>${item.runtimeRegistered}</strong></span>
      <span>plan artifact <strong>${item.artifacts.plan.exists ? 'present' : 'missing'}</strong></span>
      <span>preview artifact <strong>${item.artifacts.planPreview.exists ? 'present' : 'missing'}</strong></span>
    </div>
    <p>${htmlEscape(item.blockers.join('; ') || 'No blockers. Run the production handoff in order.')}</p>
    <h3>Approved Source To Runtime Chain</h3>
    ${commandBlock(Object.values(item.commands))}
  </article>`).join('\n');
  const emptyState = `<article class="card" data-approved-runtime-handoff="empty">
    <header>
      <div><h2>No Missing Runtime Handoffs</h2><code>empty-state</code></div>
      <strong>healthy empty state</strong>
    </header>
    <p>All current 20 source candidates already have runtime prototypes. This card proves the approved-source-to-runtime handoff is empty rather than absent.</p>
    <h3>Approved Source To Runtime Chain</h3>
    ${commandBlock([
      'npm run content:runtime-coverage && npm run content:runtime-coverage-check',
      'npm run sandbox:index && npm run sandbox:runtime-check',
      'npm run content:approved-runtime-handoff-check',
    ])}
  </article>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Approved Source Runtime Handoff</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0d1b20; --line:#29444b; --text:#e6f5f5; --muted:#91a9ae; --accent:#7adff6; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1360px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:0; font-size:18px; }
    h3 { margin:14px 0 8px; color:var(--muted); font-size:13px; text-transform:uppercase; }
    p { color:var(--muted); }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { margin:0; border:1px solid var(--line); background:#050b0d; padding:10px; overflow:auto; white-space:pre-wrap; }
    .summary, .badges { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }
    .summary span, .badges span { border:1px solid var(--line); background:#09171b; border-radius:5px; padding:7px 9px; color:var(--muted); }
    strong { color:var(--text); }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(380px,1fr)); gap:14px; align-items:start; }
    .card { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:14px; }
    .card header { display:flex; justify-content:space-between; gap:12px; align-items:start; }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Approved Source Runtime Handoff</h1>
    <p>Read-only command matrix for moving strict-approved source candidates into registered runtime creatures and paired-diver sandbox review.</p>
    <div class="summary">
      <span>missing runtime <strong>${report.summary.missingRuntime}</strong></span>
      <span>approved missing runtime <strong>${report.summary.approvedSourcesMissingRuntime}</strong></span>
      <span>Rigging eligible handoffs <strong>${report.summary.riggingEligibleOnly}</strong></span>
      <span>Accepted for content gate: 0</span>
      <span>blocked until source approval <strong>${report.summary.blockedUntilSourceApproval}</strong></span>
    </div>
    <section class="card">
      <h2>Report Commands</h2>
      ${commandBlock(['npm run content:approved-runtime-handoff', 'npm run content:approved-runtime-handoff-check', 'npm run content:runtime-coverage && npm run content:runtime-coverage-check'])}
    </section>
    <section class="grid">${cards || emptyState}</section>
  </main>
</body>
</html>
`;
}

const runtimeCoverage = await readJson(paths.runtimeCoverage);
const planCoverage = await readJson(paths.planCoverage);
if (runtimeCoverage.schema !== 'water9/content-runtime-coverage@1') throw new Error(`Unexpected runtime coverage schema ${runtimeCoverage.schema ?? 'missing'}`);
if (planCoverage.schema !== 'water9/content-plan-coverage@1') throw new Error(`Unexpected plan coverage schema ${planCoverage.schema ?? 'missing'}`);

const planById = new Map((planCoverage.items ?? []).map((item) => [item.id, item]));
const missingRuntime = (runtimeCoverage.items ?? []).filter((item) => !item.runtimeRegistered);
const items = await Promise.all(missingRuntime.map(async (item) => {
  const plan = planById.get(item.id);
  const commands = commandsFor(item.id);
  const riggingEligibleOnly = Boolean(item.sourceApproved && !item.runtimeRegistered);
  const blockers = [
    item.sourceApproved ? null : 'strict human source approval missing',
    item.runtimeRegistered ? 'runtime already registered' : null,
  ].filter(Boolean);
  return {
    id: item.id,
    species: item.species,
    sourceApproved: Boolean(item.sourceApproved),
    runtimeRegistered: Boolean(item.runtimeRegistered),
    productionEligible: riggingEligibleOnly,
    riggingEligibleOnly,
    acceptedForContentGate: false,
    plan: plan?.plan ?? planPath(item.id),
    planPreview: plan?.planPreview ?? planPreviewPath(item.id),
    artifacts: {
      plan: await fileSummary(plan?.plan ?? planPath(item.id)),
      planPreview: await fileSummary(plan?.planPreview ?? planPreviewPath(item.id)),
    },
    blockers,
    commands,
  };
}));

const report = {
  schema: 'water9/content-approved-runtime-handoff@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    runtimeCoverage: paths.runtimeCoverage,
    planCoverage: paths.planCoverage,
  },
  emptyState: {
    active: items.length === 0,
    reason: items.length === 0
      ? 'All current 20 source candidates already have runtime prototypes; no approved-source-to-runtime handoffs are queued.'
      : null,
    invariant: 'This report must exist even when empty so content infrastructure can prove the handoff queue is intentionally empty.',
    nextChecks: [
      'npm run content:runtime-coverage && npm run content:runtime-coverage-check',
      'npm run sandbox:index && npm run sandbox:runtime-check',
      'npm run content:approved-runtime-handoff-check',
    ],
    acceptanceBoundary: 'A runtime prototype is previewable content only; it does not count as one of the 20 accepted threats until source approval, rig acceptance, and the strict content gate all pass.',
  },
  summary: {
    candidates: runtimeCoverage.summary?.candidates ?? 0,
    missingRuntime: items.length,
    approvedSourcesMissingRuntime: items.filter((item) => item.sourceApproved).length,
    productionEligible: items.filter((item) => item.productionEligible).length,
    riggingEligibleOnly: items.filter((item) => item.riggingEligibleOnly).length,
    blockedUntilSourceApproval: items.filter((item) => !item.sourceApproved).length,
  },
  approvedMissingRuntimeIds: items.filter((item) => item.sourceApproved).map((item) => item.id),
  blockedUntilSourceApprovalIds: items.filter((item) => !item.sourceApproved).map((item) => item.id),
  items,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMd, markdownFor(report));
await writeFile(paths.outHtml, htmlFor(report));

console.log(JSON.stringify({
  schema: report.schema,
  json: paths.outJson,
  markdown: paths.outMd,
  html: paths.outHtml,
  summary: report.summary,
}, null, 2));

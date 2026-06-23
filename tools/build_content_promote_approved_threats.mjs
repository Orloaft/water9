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
  board: resolve(String(args.get('board') ?? 'public/review/content-human-adjudication-board.json')),
  threatDecisions: resolve(String(args.get('threat-decisions') ?? 'public/review/content-threat-acceptance-decision-template.json')),
  productionProof: resolve(String(args.get('production-proof') ?? 'public/review/content-production-proof.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-promote-approved-threats.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/content-promote-approved-threats.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-promote-approved-threats.html')),
};

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function checksTemplate(checks) {
  return Object.fromEntries(checks.map((check) => [check, { score: null, note: '' }]));
}

function blockersFor(item, proofItem) {
  const blockers = [];
  if (!item.sourceApproved) blockers.push('human source approval missing');
  if (!item.threatReady) blockers.push('threat evidence route is incomplete');
  if (!item.media?.every((entry) => entry.present)) blockers.push('review media missing');
  if (!item.commands?.threatAcceptanceDryRun?.includes('--dry-run')) blockers.push('threat acceptance dry-run missing');
  if (proofItem?.productionStatus === 'prototype-only') blockers.push('runtime proof is still prototype-only');
  return blockers;
}

function commandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function renderMarkdown(report) {
  const rows = report.items.map((item) => `| ${item.rank} | \`${item.id}\` ${item.species} | ${item.sourceApproved ? 'yes' : 'no'} | ${item.readyForDecision ? 'yes' : 'no'} | ${item.blockers.join('<br>') || 'none'} |`).join('\n');
  return `# Water9 Promote Approved Threats

Target-only promotion runway for the 20-threat goal. It excludes non-target prototype rigs and prepares a strict threat-acceptance decision file for the mapped 20 target threats only.

## Summary

- Target threats: ${report.summary.targetThreats}
- Target rows: ${report.summary.items}
- Source approved: ${report.summary.sourceApproved}
- Ready for threat decision: ${report.summary.readyForThreatDecision}
- Already accepted: ${report.summary.acceptedThreats}
- Excluded non-target prototype rigs: ${report.summary.excludedNonTargetRigs}

## Commands

\`\`\`bash
${report.commands.join('\n')}
\`\`\`

## Promotion Rows

| Rank | Target | Source approved | Ready | Blockers |
| ---: | --- | ---: | ---: | --- |
${rows}
`;
}

function renderHtml(report) {
  const cards = report.items.map((item) => `<article class="card" data-promote-threat="${htmlEscape(item.id)}">
    <header>
      <div><h2>${htmlEscape(item.species)}</h2><code>${htmlEscape(item.id)}</code></div>
      <strong>${item.readyForDecision ? 'ready' : 'blocked'}</strong>
    </header>
    <div class="badges">
      <span>source approved <strong>${item.sourceApproved}</strong></span>
      <span>threat ready <strong>${item.threatReady}</strong></span>
      <span>media <strong>${item.mediaPresent}/${item.mediaTotal}</strong></span>
      <span>production proof <strong>${htmlEscape(item.productionStatus)}</strong></span>
    </div>
    <p>${htmlEscape(item.blockers.join('; ') || 'Ready for human threat decision authoring.')}</p>
    <div class="links">
      <a href="${htmlEscape(item.links.cockpit ?? '#')}">cockpit</a>
      <a href="${htmlEscape(item.links.runtimeSandbox ?? '#')}">runtime sandbox</a>
      <a href="${htmlEscape(item.links.audit ?? '#')}">audit</a>
    </div>
    <h3>Target-Only Commands</h3>
    ${commandBlock([
      item.commands.runtimePreview,
      item.commands.threatAcceptanceDryRun,
      item.commands.applyTargetDecisionsStrict,
    ])}
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water9 Promote Approved Threats</title>
  <style>
    :root { color-scheme: dark; --bg:#061014; --panel:#0a1b21; --line:#28444f; --text:#e5f6f8; --muted:#9bb8c1; --warn:#e8c06f; --ok:#76e0bb; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1360px; margin:0 auto; padding:28px 18px 48px; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4rem); letter-spacing:0; }
    h2 { margin:0; font-size:1.1rem; }
    h3 { margin:12px 0 8px; color:var(--muted); font-size:.8rem; text-transform:uppercase; }
    p { color:var(--muted); }
    a { color:#7ee8ff; text-decoration:none; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; overflow-wrap:anywhere; }
    pre { margin:0; padding:10px; border:1px solid var(--line); background:#040c0f; white-space:pre-wrap; }
    textarea { width:100%; min-height:340px; border:1px solid var(--line); background:#040c0f; color:var(--text); border-radius:6px; padding:10px; font:12px/1.45 "SFMono-Regular",Consolas,monospace; }
    .notice { border:1px solid #6f5b2b; background:#1c170d; color:#efd99b; border-radius:6px; padding:12px; margin:16px 0; }
    .summary, .badges, .links { display:flex; flex-wrap:wrap; gap:8px; margin:12px 0; }
    .summary span, .badges span, .links a { border:1px solid var(--line); background:#081820; border-radius:5px; padding:8px 10px; color:var(--muted); }
    .workspace, .card { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:14px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(380px,1fr)); gap:12px; margin-top:14px; }
    .card header { display:flex; justify-content:space-between; gap:12px; align-items:start; }
    .card header strong { color:var(--warn); }
    .card[data-ready="true"] header strong { color:var(--ok); }
  </style>
</head>
<body>
  <main>
    <h1>Water9 Promote Approved Threats</h1>
    <p>Target-only promotion runway for the 20-threat goal. This excludes non-target prototype rigs and prepares strict human-authored threat acceptance decisions for the mapped 20 target threats.</p>
    <div class="notice">This page does not accept threats. It exports a 20-item decision file that must pass <code>content:threat-decisions-apply --strict</code>.</div>
    <div class="summary">
      <span>target rows <strong>${report.summary.items}</strong></span>
      <span>source approved <strong>${report.summary.sourceApproved}</strong></span>
      <span>ready for decision <strong>${report.summary.readyForThreatDecision}</strong></span>
      <span>excluded non-target rigs <strong>${report.summary.excludedNonTargetRigs}</strong></span>
    </div>
    <section class="workspace" data-promote-approved-threats-workspace>
      <h2>Target Threat Decision File</h2>
      ${commandBlock(report.commands)}
      <textarea data-promote-threat-decisions spellcheck="false">${htmlEscape(JSON.stringify(report.decisionFileTemplate, null, 2))}</textarea>
      <p><a href="#" data-promote-threat-decisions-download download="water9-target-threat-acceptance-decisions.json">Download target-only threat decisions</a></p>
    </section>
    <section class="grid">${cards}</section>
  </main>
  <script>
    const output = document.querySelector('[data-promote-threat-decisions]');
    const download = document.querySelector('[data-promote-threat-decisions-download]');
    function syncDownload() {
      const previous = download.dataset.objectUrl;
      if (previous) URL.revokeObjectURL(previous);
      const href = URL.createObjectURL(new Blob([output.value + '\\n'], { type: 'application/json' }));
      download.href = href;
      download.dataset.objectUrl = href;
    }
    output.addEventListener('input', syncDownload);
    syncDownload();
  </script>
</body>
</html>
`;
}

const board = await readJson(paths.board);
const threatDecisions = await readJson(paths.threatDecisions);
const productionProof = await readJson(paths.productionProof);
if (board.schema !== 'water9/content-human-adjudication-board@1') throw new Error(`unexpected board schema ${board.schema ?? 'missing'}`);
if (threatDecisions.schema !== 'water9/content-threat-acceptance-decision-template@1') throw new Error(`unexpected threat decision schema ${threatDecisions.schema ?? 'missing'}`);
if (productionProof.schema !== 'water9/content-production-proof@1') throw new Error(`unexpected production proof schema ${productionProof.schema ?? 'missing'}`);

const requiredChecks = threatDecisions.requiredChecks ?? [];
const targetIds = new Set((board.items ?? []).map((item) => item.id));
const allRuntimeDecisionIds = new Set((threatDecisions.decisions ?? []).map((item) => item.id));
const proofById = new Map((productionProof.items ?? []).map((item) => [item.id, item]));
const items = (board.items ?? []).map((item) => {
  const proofItem = proofById.get(item.id);
  const blockers = blockersFor(item, proofItem);
  return {
    id: item.id,
    species: item.species,
    rank: item.rank,
    sourceApproved: Boolean(item.sourceApproved),
    threatAccepted: Boolean(item.threatAccepted),
    threatReady: Boolean(item.threatReady),
    runtimeMapped: allRuntimeDecisionIds.has(item.id),
    productionStatus: proofItem?.productionStatus ?? 'unknown',
    readyForDecision: blockers.length === 0,
    blockers,
    mediaPresent: item.media.filter((entry) => entry.present).length,
    mediaTotal: item.media.length,
    links: item.links,
    commands: {
      runtimePreview: item.commands.runtimePreview,
      threatAcceptanceDryRun: item.commands.threatAcceptanceDryRun,
      applyTargetDecisionsStrict: 'npm run content:threat-decisions-apply -- --decisions water9-target-threat-acceptance-decisions.json --strict',
    },
  };
});

const decisionFileTemplate = {
  schema: 'water9/content-threat-acceptance-decisions@1',
  reviewer: '<human-reviewer>',
  reviewedAt: '<ISO-8601 timestamp>',
  policy: {
    humanAuthored: true,
    automationCannotAcceptThreats: true,
    inspectSourceContactPhaseParityAndSandbox: true,
    targetOnlyThreatGoal: true,
  },
  decisions: items.map((item) => ({
    id: item.id,
    species: item.species,
    status: 'needs-review',
    reviewer: '<human-reviewer>',
    sourceCandidateId: item.id,
    overallNote: '',
    visualChecks: checksTemplate(requiredChecks),
  })),
};

const report = {
  schema: 'water9/content-promote-approved-threats@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    board: 'public/review/content-human-adjudication-board.json',
    threatDecisions: 'public/review/content-threat-acceptance-decision-template.json',
    productionProof: 'public/review/content-production-proof.json',
  },
  policy: {
    targetOnly: true,
    excludesNonTargetRuntimePrototypes: true,
    humanAuthoredDecisionsRequired: true,
    strictThreatDecisionApplyRequired: true,
  },
  commands: [
    'npm run content:promote-approved-threats',
    'npm run content:promote-approved-threats-check',
    'npm run content:threat-decisions-apply -- --decisions water9-target-threat-acceptance-decisions.json --strict',
    'npm run content:goal-gate',
  ],
  summary: {
    targetThreats: board.summary?.targetThreats ?? 20,
    items: items.length,
    sourceApproved: items.filter((item) => item.sourceApproved).length,
    readyForThreatDecision: items.filter((item) => item.readyForDecision).length,
    acceptedThreats: items.filter((item) => item.threatAccepted).length,
    excludedNonTargetRigs: [...allRuntimeDecisionIds].filter((id) => !targetIds.has(id)).length,
    runtimeMappedTargets: items.filter((item) => item.runtimeMapped).length,
  },
  requiredChecks,
  decisionFileTemplate,
  items,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, renderMarkdown(report));
await writeFile(paths.outHtml, renderHtml(report));

console.log(JSON.stringify({
  schema: report.schema,
  items: report.summary.items,
  sourceApproved: report.summary.sourceApproved,
  readyForThreatDecision: report.summary.readyForThreatDecision,
  excludedNonTargetRigs: report.summary.excludedNonTargetRigs,
  outJson: paths.outJson,
  outMarkdown: paths.outMarkdown,
  outHtml: paths.outHtml,
}, null, 2));

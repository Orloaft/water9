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
  stageBoard: resolve(String(args.get('stage-board') ?? 'public/review/content-stage-board.json')),
  humanSignoff: resolve(String(args.get('human-signoff') ?? 'public/review/content-human-signoff-queue.json')),
  reviewSession: resolve(String(args.get('review-session') ?? 'public/review/content-review-session.json')),
  goalReadiness: resolve(String(args.get('goal-readiness') ?? 'public/review/content-goal-readiness.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-production-proof.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/content-production-proof.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-production-proof.html')),
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

function productionBlockers(stageTarget, signoffItem) {
  const blockers = [];
  if (!stageTarget?.sourceApproved && !signoffItem?.sourceApproved) blockers.push('human source approval missing');
  if (stageTarget?.rigStatus === 'prototype') blockers.push('runtime rig is still marked prototype');
  if (!stageTarget?.sandboxComplete) blockers.push('paired sandbox evidence missing or failing');
  if (!stageTarget?.accepted && !signoffItem?.threatAccepted) blockers.push('human threat acceptance missing');
  if (!signoffItem?.countsTowardGate) blockers.push('does not count toward the 20-threat gate');
  return blockers;
}

function renderMarkdown(report) {
  const lines = [
    '# Water9 Production Proof',
    '',
    'This report is the explicit production-readiness proof for the 20-threat content goal. Prototype previews, screenshots, generated parts, and sandbox motion are evidence only; they are not production acceptance.',
    '',
    `Strict production ready: \`${report.summary.strictProductionReady}\``,
    `Accepted threats: \`${report.summary.acceptedThreats}/${report.summary.targetThreats}\``,
    `Prototype-only rows: \`${report.summary.prototypeOnly}\``,
    `Human review rows: \`${report.summary.humanReviewRequired}\``,
    '',
    '## Acceptance Rule',
    '',
    report.policy.acceptanceRule,
    '',
    '## Commands',
    '',
    '```bash',
    ...report.commands,
    '```',
    '',
    '## Rows',
    '',
    '| Rank | Target | Status | Counts | Blockers |',
    '| ---: | --- | --- | --- | --- |',
  ];
  for (const item of report.items) {
    lines.push(`| ${item.rank} | \`${item.id}\` ${item.species} | \`${item.productionStatus}\` | ${item.countsTowardGoal ? 'yes' : 'no'} | ${item.blockers.join('<br>') || 'none'} |`);
  }
  return `${lines.join('\n')}\n`;
}

function renderHtml(report) {
  const rows = report.items.map((item) => `<article class="row" data-production-proof="${htmlEscape(item.id)}" data-production-status="${htmlEscape(item.productionStatus)}">
    <header>
      <div><strong>${htmlEscape(item.species)}</strong><code>${htmlEscape(item.id)}</code></div>
      <span>${item.countsTowardGoal ? 'counts' : 'blocked'}</span>
    </header>
    <dl>
      <dt>Status</dt><dd>${htmlEscape(item.productionStatus)}</dd>
      <dt>Source</dt><dd>${item.sourceApproved ? 'approved' : 'needs human approval'}</dd>
      <dt>Rig</dt><dd>${htmlEscape(item.rigStatus ?? 'missing')}</dd>
      <dt>Sandbox</dt><dd>${item.sandboxComplete ? 'complete' : 'blocked'}</dd>
      <dt>Threat</dt><dd>${item.threatAccepted ? 'accepted' : 'needs human acceptance'}</dd>
      <dt>Blockers</dt><dd>${htmlEscape(item.blockers.join('; ') || 'none')}</dd>
    </dl>
    <pre><code>${htmlEscape(item.commands.filter(Boolean).join('\n'))}</code></pre>
  </article>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water9 Production Proof</title>
  <style>
    :root { color-scheme: dark; --bg:#061014; --panel:#0a1b21; --line:#28444f; --text:#e5f6f8; --muted:#9bb8c1; --warn:#e8c06f; --ok:#76e0bb; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1320px; margin:0 auto; padding:28px 18px 48px; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4rem); letter-spacing:0; }
    p { max-width:920px; color:var(--muted); }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { margin:10px 0 0; padding:10px; border:1px solid var(--line); background:#040c0f; overflow:auto; white-space:pre-wrap; }
    .notice { border:1px solid #6f5b2b; background:#1c170d; color:#efd99b; border-radius:6px; padding:12px; margin:16px 0; }
    .summary { display:flex; flex-wrap:wrap; gap:8px; margin:16px 0 22px; }
    .summary span { border:1px solid var(--line); background:#081820; border-radius:5px; padding:8px 10px; color:var(--muted); }
    .summary strong { color:var(--text); }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:12px; }
    .row { border:1px solid var(--line); background:var(--panel); border-radius:6px; padding:13px; }
    .row header { display:flex; justify-content:space-between; gap:12px; margin-bottom:10px; }
    .row code { display:block; color:var(--muted); margin-top:2px; }
    .row header span { color:var(--warn); }
    .row[data-production-status="accepted"] header span { color:var(--ok); }
    dl { display:grid; grid-template-columns:92px 1fr; gap:4px 10px; margin:0; }
    dt { color:var(--muted); }
    dd { margin:0; }
  </style>
</head>
<body>
  <main>
    <h1>Water9 Production Proof</h1>
    <p>This is the explicit proof surface for the 20-threat goal. Prototype preview is not production acceptance; sandbox visuals are evidence only until strict human source approval and strict human threat acceptance both exist.</p>
    <div class="notice">Acceptance Rule: ${htmlEscape(report.policy.acceptanceRule)}</div>
    <pre><code>${htmlEscape(report.commands.join('\n'))}</code></pre>
    <div class="summary">
      <span>accepted threats <strong>${report.summary.acceptedThreats}/${report.summary.targetThreats}</strong></span>
      <span>prototype-only <strong>${report.summary.prototypeOnly}</strong></span>
      <span>human review required <strong>${report.summary.humanReviewRequired}</strong></span>
      <span>Strict production ready <strong>${report.summary.strictProductionReady}</strong></span>
    </div>
    <section class="grid">${rows}</section>
  </main>
</body>
</html>
`;
}

const stageBoard = await readJson(paths.stageBoard);
const humanSignoff = await readJson(paths.humanSignoff);
const reviewSession = await readJson(paths.reviewSession);
const goalReadiness = await readJson(paths.goalReadiness);
if (stageBoard.schema !== 'water9/content-stage-board@1') throw new Error(`unexpected stage board schema ${stageBoard.schema ?? 'missing'}`);
if (humanSignoff.schema !== 'water9/content-human-signoff-queue@1') throw new Error(`unexpected human signoff schema ${humanSignoff.schema ?? 'missing'}`);
if (reviewSession.schema !== 'water9/content-review-session@1') throw new Error(`unexpected review session schema ${reviewSession.schema ?? 'missing'}`);
if (goalReadiness.schema !== 'water9/content-goal-readiness@1') throw new Error(`unexpected goal readiness schema ${goalReadiness.schema ?? 'missing'}`);

const signoffById = new Map((humanSignoff.items ?? []).map((item) => [item.id, item]));
const sessionById = new Map((reviewSession.items ?? []).map((item) => [item.id, item]));
const items = (stageBoard.targets ?? []).map((target) => {
  const signoff = signoffById.get(target.id);
  const session = sessionById.get(target.id);
  const blockers = productionBlockers(target, signoff);
  const countsTowardGoal = blockers.length === 0 && Boolean(target.accepted || signoff?.countsTowardGate);
  return {
    rank: target.rank,
    id: target.id,
    species: target.species,
    sourceApproved: Boolean(target.sourceApproved || signoff?.sourceApproved),
    rigStatus: target.rigStatus ?? null,
    sandboxComplete: Boolean(target.sandboxComplete),
    threatAccepted: Boolean(target.accepted || signoff?.threatAccepted),
    countsTowardGoal,
    productionStatus: countsTowardGoal ? 'accepted' : (target.rigStatus === 'prototype' ? 'prototype-only' : 'human-review-required'),
    blockers,
    commands: [
      session?.commands?.sourcePreview,
      session?.commands?.runtimePreview,
      session?.commands?.sourceApprovalDryRun,
      session?.commands?.threatAcceptanceDryRun,
      target.nextCommands?.[0],
    ],
  };
});

const report = {
  schema: 'water9/content-production-proof@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    stageBoard: 'public/review/content-stage-board.json',
    humanSignoff: 'public/review/content-human-signoff-queue.json',
    reviewSession: 'public/review/content-review-session.json',
    goalReadiness: 'public/review/content-goal-readiness.json',
  },
  policy: {
    humanReviewerRequired: true,
    automationCannotAcceptProduction: true,
    acceptanceRule: 'A threat counts toward the 20-threat goal only when source art is human-approved, runtime rig evidence is no longer prototype-only, paired sandbox evidence is complete, and human threat acceptance records that it counts toward the gate.',
    prototypePreviewIsNotProductionAcceptance: true,
  },
  commands: [
    'npm run content:production-proof',
    'npm run content:production-proof-check',
    'npm run content:review-session',
    'npm run content:goal-readiness-strict',
    'npm run content:goal-gate',
  ],
  summary: {
    targetThreats: stageBoard.summary?.targetThreats ?? 20,
    candidates: items.length,
    acceptedThreats: items.filter((item) => item.countsTowardGoal).length,
    prototypeOnly: items.filter((item) => item.productionStatus === 'prototype-only').length,
    humanReviewRequired: items.filter((item) => !item.countsTowardGoal).length,
    strictProductionReady: items.filter((item) => item.countsTowardGoal).length >= (stageBoard.summary?.targetThreats ?? 20),
    nextStage: goalReadiness.nextAction?.stage ?? null,
  },
  prototypeQuarantine: goalReadiness.prototypeQuarantine ?? null,
  items,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, renderMarkdown(report));
await writeFile(paths.outHtml, renderHtml(report));

console.log(JSON.stringify({
  schema: report.schema,
  candidates: report.summary.candidates,
  acceptedThreats: report.summary.acceptedThreats,
  prototypeOnly: report.summary.prototypeOnly,
  strictProductionReady: report.summary.strictProductionReady,
  outJson: paths.outJson,
  outMarkdown: paths.outMarkdown,
  outHtml: paths.outHtml,
}, null, 2));

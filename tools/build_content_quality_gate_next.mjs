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
  matrix: resolve(String(args.get('matrix') ?? 'public/review/content-quality-gate-matrix.json')),
  reviewSession: resolve(String(args.get('review-session') ?? 'public/review/content-review-session.json')),
  sourceVisualBoard: resolve(String(args.get('source-visual-board') ?? 'public/review/source-visual-board.json')),
  sourceApprovalSession: resolve(String(args.get('source-approval-session') ?? 'public/review/source-candidates/source-approval-session.json')),
  visualFeedback: resolve(String(args.get('visual-feedback') ?? 'public/review/content-visual-feedback-ledger.json')),
  visualRegeneration: resolve(String(args.get('visual-regeneration') ?? 'public/review/content-visual-regeneration-queue.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-quality-gate-next.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/content-quality-gate-next.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-quality-gate-next.html')),
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

function mediaByLabel(sessionItem) {
  return Object.fromEntries((sessionItem?.media ?? []).map((item) => [item.label, item]));
}

function list(items) {
  return (items ?? []).map((item) => `- ${item}`).join('\n') || '- none';
}

function blockerLine(item) {
  const species = item.species ? `${item.species} / ` : '';
  return `${species}${item.targetId}: ${item.status} (${item.severity})`;
}

function markdown(report) {
  const target = report.target;
  return `# Water 9 Next Quality Gate Review

Generated: \`${report.generatedAt}\`

This focused packet does not approve source art or accept a threat. It packages the next actionable strict-gate row from the quality gate matrix.

## Target

- id: \`${target.id}\`
- species: ${target.species}
- next gate: \`${target.nextGate}\`
- source evidence complete: \`${target.sourceEvidenceComplete}\`
- runtime evidence complete: \`${target.runtimeEvidenceComplete}\`
- source approved: \`${target.sourceApproved}\`
- threat accepted: \`${target.threatAccepted}\`
- strict gate eligible: \`${target.strictGateEligible}\`

## Evidence

| Evidence | Link |
| --- | --- |
${report.evidence.map((item) => `| ${item.label} | ${item.url ?? 'missing'} |`).join('\n')}

## Required Source Read

${list(report.requiredRead)}

## Contract Checks

${list(report.contractReviewChecklist)}

## Global Visual Blockers

These records are not approvals and cannot count toward the strict gate. They are included here so the next approval packet cannot hide rejected prototype work.

${list(report.globalVisualBlockers.map(blockerLine))}

## Commands

\`\`\`bash
${Object.values(target.commands).filter(Boolean).join('\n')}
${report.commands.rebuild}
${report.commands.check}
${report.commands.serveSmoke}
\`\`\`
`;
}

function html(report) {
  const target = report.target;
  const evidence = report.evidence.map((item) => item.url
    ? `<a class="tile" href="${htmlEscape(item.url)}"><span>${htmlEscape(item.label)}</span><img src="${htmlEscape(item.url)}" alt="${htmlEscape(item.label)}"></a>`
    : `<div class="tile missing"><span>${htmlEscape(item.label)}</span><strong>missing</strong></div>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Next Quality Gate Review</title>
  <style>
    :root { color-scheme: dark; background:#061115; color:#dceff0; font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    body { margin:0; padding:26px; background:#061115; }
    main { max-width:1280px; margin:0 auto; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4.6rem); letter-spacing:0; }
    h2 { margin:18px 0 10px; }
    p, li, span { color:#bfd6da; }
    a { color:#c8f6ff; text-decoration-color:#67d7e6; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; overflow-wrap:anywhere; }
    pre { white-space:pre-wrap; border:1px solid #1d3a42; background:#041013; border-radius:6px; padding:10px; color:#dff8ff; }
    .notice, .summary, .panel { border:1px solid #294954; background:#0b1e24; border-radius:6px; padding:14px; }
    .notice { border-color:#6b5730; background:#1d1810; margin:14px 0; color:#f0d8a6; }
    .summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:8px; margin:18px 0; }
    .summary span { border:1px solid #203c45; background:#07171c; border-radius:5px; padding:8px; }
    .evidence { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; }
    .tile { display:block; border:1px solid #203c45; background:#07171c; border-radius:6px; overflow:hidden; min-height:120px; }
    .tile span { display:block; padding:8px; font-weight:700; }
    .tile img { display:block; width:100%; aspect-ratio:16/10; object-fit:contain; background:#02090b; }
    .missing { padding:12px; }
    .blockers { display:grid; gap:8px; padding:0; list-style:none; }
    .blockers li { border:1px solid #6b3730; background:#1d1010; border-radius:5px; padding:10px; color:#f1c0b6; }
  </style>
</head>
<body>
  <main data-content-quality-gate-next data-quality-gate-next-target="${htmlEscape(target.id)}" data-next-gate="${htmlEscape(target.nextGate)}">
    <h1>Next Quality Gate Review</h1>
    <p>Focused packet for the next actionable strict-gate target.</p>
    <div class="notice">This page does not approve source art or accept threats. Human review and strict apply gates remain required.</div>
    <section class="summary">
      <span>target <b>${htmlEscape(target.id)}</b></span>
      <span>species <b>${htmlEscape(target.species)}</b></span>
      <span>next gate <b>${htmlEscape(target.nextGate)}</b></span>
      <span>source evidence <b>${target.sourceEvidenceComplete ? 'complete' : 'missing'}</b></span>
      <span>runtime evidence <b>${target.runtimeEvidenceComplete ? 'complete' : 'missing'}</b></span>
      <span>source approved <b>${target.sourceApproved ? 'yes' : 'no'}</b></span>
      <span>strict eligible <b>${target.strictGateEligible ? 'yes' : 'no'}</b></span>
      <span>global blockers <b>${report.globalVisualBlockers.length}</b></span>
    </section>
    <h2>Evidence</h2>
    <section class="evidence">${evidence}</section>
    <section class="panel">
      <h2>Required Source Read</h2>
      <ul>${report.requiredRead.map((item) => `<li>${htmlEscape(item)}</li>`).join('')}</ul>
      <h2>Contract Checks</h2>
      <ul>${report.contractReviewChecklist.map((item) => `<li>${htmlEscape(item)}</li>`).join('')}</ul>
      <h2>Global Visual Blockers</h2>
      <p>Rejected prototype work stays visible here and cannot count toward the strict gate.</p>
      <ul class="blockers">${report.globalVisualBlockers.map((item) => `<li><b>${htmlEscape(item.targetId)}</b>: ${htmlEscape(item.status)} / ${htmlEscape(item.severity)}<br>${htmlEscape(item.summary)}</li>`).join('') || '<li>none</li>'}</ul>
      <h2>Commands</h2>
      <pre>${htmlEscape([
        ...Object.values(target.commands).filter(Boolean),
        report.commands.rebuild,
        report.commands.check,
        report.commands.serveSmoke,
      ].join('\n'))}</pre>
    </section>
  </main>
</body>
</html>
`;
}

const matrix = await readJson(paths.matrix, { rows: [], summary: {} });
const reviewSession = await readJson(paths.reviewSession, { items: [] });
const sourceVisualBoard = await readJson(paths.sourceVisualBoard, { items: [] });
const sourceApprovalSession = await readJson(paths.sourceApprovalSession, { nextTarget: null });
const visualFeedback = await readJson(paths.visualFeedback, { items: [], summary: {} });
const visualRegeneration = await readJson(paths.visualRegeneration, { items: [], summary: {} });

if (matrix?.schema !== 'water9/content-quality-gate-matrix@1') throw new Error(`unexpected matrix schema ${matrix?.schema ?? 'missing'}`);

const approvalSessionTargetId = typeof sourceApprovalSession.nextTarget === 'string'
  ? sourceApprovalSession.nextTarget
  : sourceApprovalSession.nextTarget?.id;
const approvalSessionTarget = (matrix.rows ?? []).find((row) => row.id === approvalSessionTargetId && row.nextGate !== 'accepted');
const target = approvalSessionTarget
  ?? (matrix.rows ?? []).find((row) => row.nextGate !== 'accepted' && row.sourceEvidenceComplete && row.runtimeEvidenceComplete)
  ?? (matrix.rows ?? []).find((row) => row.nextGate !== 'accepted')
  ?? matrix.rows?.[0]
  ?? null;
if (!target) throw new Error('no quality gate target available');

const sessionItem = (reviewSession.items ?? []).find((item) => item.id === target.id) ?? {};
const visualItem = (sourceVisualBoard.items ?? []).find((item) => item.id === target.id) ?? {};
const media = mediaByLabel(sessionItem);
const evidence = [
  { label: 'source art', url: media['source art']?.url },
  { label: 'magenta key preview', url: media['magenta key preview']?.url },
  { label: 'source sandbox preview', url: media['source sandbox preview']?.url },
  { label: 'articulation plan preview', url: media['articulation plan preview']?.url },
  { label: 'source parity overlay', url: media['source parity overlay']?.url },
  { label: 'contact sheet', url: media['contact sheet']?.url },
  { label: 'phase strip', url: media['phase strip']?.url },
  { label: 'sandbox idle', url: media['sandbox idle']?.url },
  { label: 'sandbox lunge', url: media['sandbox lunge']?.url },
  { label: 'sandbox stunned', url: media['sandbox stunned']?.url },
];
const globalVisualBlockers = (visualFeedback.items ?? [])
  .filter((item) => item.open && item.severity === 'blocking')
  .map((item) => {
    const regeneration = (visualRegeneration.items ?? []).find((queueItem) => queueItem.targetId === item.targetId);
    return {
      targetId: item.targetId,
      species: regeneration?.species ?? null,
      status: item.status,
      severity: item.severity,
      summary: item.summary,
      countsTowardStrictGate: Boolean(item.countsTowardStrictGate),
      targetGateCandidate: Boolean(item.targetGateCandidate),
      regenerationPromptFile: regeneration?.promptFile ?? null,
      commands: {
        preview: item.commands?.preview ?? null,
        pairedPreview: item.commands?.pairedPreview ?? null,
        openPrompt: regeneration?.commands?.openPrompt ?? null,
      },
    };
  });

const report = {
  schema: 'water9/content-quality-gate-next@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    matrix: 'public/review/content-quality-gate-matrix.json',
    reviewSession: 'public/review/content-review-session.json',
    sourceVisualBoard: 'public/review/source-visual-board.json',
    sourceApprovalSession: 'public/review/source-candidates/source-approval-session.json',
    visualFeedback: 'public/review/content-visual-feedback-ledger.json',
    visualRegeneration: 'public/review/content-visual-regeneration-queue.json',
  },
  policy: {
    focusedPacketDoesNotApprove: true,
    humanSourceApprovalRequired: true,
    humanThreatAcceptanceRequired: true,
    strictGateStillRequired: matrix.summary?.strictGoalComplete !== true,
    blockedPrototypesCannotCountTowardStrictGate: true,
  },
  matrixSummary: matrix.summary,
  selection: {
    strategy: approvalSessionTarget ? 'source-approval-session-next-target' : 'first-actionable-quality-gate-row',
    sourceApprovalSessionNextTarget: approvalSessionTargetId ?? null,
  },
  target,
  evidence,
  globalVisualBlockers,
  requiredRead: visualItem.requiredRead ?? [],
  contractReviewChecklist: visualItem.contractReviewChecklist ?? [],
  links: {
    matrix: '/review/content-quality-gate-matrix.html',
    reviewSession: '/review/content-review-session.html',
    contentCockpit: target.links?.cockpit ?? null,
    sourceQuickReview: target.links?.sourceQuickReview ?? null,
    sourceSandbox: target.links?.sourceSandbox ?? null,
    runtimeSandbox: target.links?.runtimeSandbox ?? null,
  },
  commands: {
    rebuild: 'npm run content:quality-gate-next',
    check: 'npm run content:quality-gate-next-check',
    serveSmoke: 'npm run content:quality-gate-next:serve-smoke',
  },
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdown(report));
await writeFile(paths.outHtml, html(report));

console.log(JSON.stringify({
  schema: report.schema,
  target: target.id,
  nextGate: target.nextGate,
  evidence: evidence.filter((item) => item.url).length,
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
}, null, 2));

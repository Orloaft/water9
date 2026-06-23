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
  qualityGateNext: resolve(String(args.get('quality-gate-next') ?? 'public/review/content-quality-gate-next.json')),
  reviewSession: resolve(String(args.get('review-session') ?? 'public/review/content-review-session.json')),
  threatDecisions: resolve(String(args.get('threat-decisions') ?? 'public/review/content-threat-acceptance-decision-template.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-runtime-cohesion-review.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/content-runtime-cohesion-review.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-runtime-cohesion-review.html')),
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

function commandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function markdown(report) {
  const mediaLines = report.media.map((item) => `- ${item.label}: ${item.url} (${item.present ? 'present' : 'missing'})`);
  return `# Water 9 Runtime Cohesion Review

Generated: \`${report.generatedAt}\`

Focused in-game cohesion packet for \`${report.target.id}\` ${report.target.species}. This page does not approve content automatically. It exists to prevent a rendered prototype or a single screenshot from being treated as proof of production-ready creature art.

## Gate Truth

- Next gate: \`${report.target.nextGate}\`
- Source approved: \`${report.target.sourceApproved}\`
- Threat accepted: \`${report.target.threatAccepted}\`
- Preview only: \`${report.target.previewOnly}\`
- Decision status: \`${report.decisionFile.decisions[0].status}\`

## Required Media

${mediaLines.join('\n')}

## Required Human Checks

${report.requiredChecks.map((check) => `- \`${check}\``).join('\n')}

## Decision File Draft

\`\`\`json
${JSON.stringify(report.decisionFile, null, 2)}
\`\`\`

## Commands

\`\`\`bash
${Object.values(report.commands).join('\n')}
\`\`\`
`;
}

function html(report) {
  const mediaTiles = report.media.map((item) => `<a class="tile" href="${htmlEscape(item.url)}" data-media-present="${item.present ? 'yes' : 'no'}">
    <span>${htmlEscape(item.label)}</span>
    <img src="${htmlEscape(item.url)}" alt="${htmlEscape(`${report.target.species} ${item.label}`)}" loading="lazy">
  </a>`).join('\n');
  const checks = report.requiredChecks.map((check) => `<label><span>${htmlEscape(check)}</span><input type="number" min="4" max="5" step="1" placeholder="4-5" data-runtime-check="${htmlEscape(check)}" data-check-field="score"><textarea spellcheck="true" data-runtime-check="${htmlEscape(check)}" data-check-field="note" placeholder="Specific evidence-based note from source, contact sheet, phase strip, parity overlay, and sandbox states."></textarea></label>`).join('\n');
  const decisionJson = JSON.stringify(report.decisionFile, null, 2);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Runtime Cohesion Review</title>
  <style>
    :root { color-scheme: dark; background:#061115; color:#e2f3f4; font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    * { box-sizing:border-box; }
    body { margin:0; padding:26px; background:#061115; }
    main { max-width:1320px; margin:0 auto; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4.2rem); letter-spacing:0; }
    h2 { margin:24px 0 10px; font-size:1.15rem; }
    p, li, span { color:#bfd5d9; }
    a { color:#83def1; text-decoration:none; }
    code, pre, textarea { font-family:"SFMono-Regular",Consolas,monospace; }
    pre, textarea, input { border:1px solid #294852; background:#041014; color:#e7fbff; border-radius:6px; padding:10px; }
    pre { white-space:pre-wrap; overflow:auto; }
    textarea { width:100%; min-height:90px; resize:vertical; }
    input { width:100%; }
    .notice, .panel { border:1px solid #294852; background:#0b1e24; border-radius:7px; padding:14px; }
    .notice { border-color:#73582d; background:#21180d; color:#f3d9a2; margin:14px 0; }
    .summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:8px; margin:16px 0; }
    .summary span { border:1px solid #223f49; background:#07171c; border-radius:6px; padding:9px; }
    .media { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; }
    .tile { display:block; border:1px solid #294852; background:#06151a; border-radius:7px; overflow:hidden; }
    .tile img { display:block; width:100%; aspect-ratio:16/10; object-fit:contain; background:#02090b; }
    .tile span { display:block; padding:8px 10px; font-weight:700; color:#dff7fb; }
    .checks { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:10px; }
    label span { display:block; margin-bottom:5px; color:#e2f3f4; }
  </style>
</head>
<body>
  <main data-runtime-cohesion-review data-runtime-cohesion-target="${htmlEscape(report.target.id)}">
    <h1>Runtime Cohesion Review</h1>
    <p>Focused in-game cohesion packet for ${htmlEscape(report.target.species)}.</p>
    <div class="notice">This page does not approve content automatically. A rendered prototype, isolated contact sheet, or attractive screenshot is not capability proof until a human reviews the source, motion, parity, and in-game sandbox together.</div>
    <section class="summary">
      <span>target <b>${htmlEscape(report.target.id)}</b></span>
      <span>next gate <b>${htmlEscape(report.target.nextGate)}</b></span>
      <span>source approved <b>${report.target.sourceApproved ? 'yes' : 'no'}</b></span>
      <span>threat accepted <b>${report.target.threatAccepted ? 'yes' : 'no'}</b></span>
      <span>preview only <b>${report.target.previewOnly ? 'yes' : 'no'}</b></span>
      <span>decision <b>${htmlEscape(report.decisionFile.decisions[0].status)}</b></span>
    </section>
    <h2>Evidence</h2>
    <section class="media">${mediaTiles}</section>
    <h2>Human Runtime Checks</h2>
    <section class="panel">
      <div class="checks">${checks}</div>
    </section>
    <h2>Decision JSON Draft</h2>
    <textarea readonly spellcheck="false" data-runtime-cohesion-decision-json>${htmlEscape(decisionJson)}</textarea>
    <h2>Commands</h2>
    ${commandBlock(Object.values(report.commands))}
  </main>
</body>
</html>
`;
}

const qualityGateNext = await readJson(paths.qualityGateNext);
const reviewSession = await readJson(paths.reviewSession);
const threatDecisions = await readJson(paths.threatDecisions);
if (qualityGateNext.schema !== 'water9/content-quality-gate-next@1') throw new Error(`unexpected quality gate next schema ${qualityGateNext.schema ?? 'missing'}`);
if (reviewSession.schema !== 'water9/content-review-session@1') throw new Error(`unexpected review session schema ${reviewSession.schema ?? 'missing'}`);
if (threatDecisions.schema !== 'water9/content-threat-acceptance-decision-template@1') throw new Error(`unexpected threat decisions schema ${threatDecisions.schema ?? 'missing'}`);

const target = qualityGateNext.target;
if (!target?.id) throw new Error('quality gate next target missing');
const item = (reviewSession.items ?? []).find((candidate) => candidate.id === target.id);
if (!item) throw new Error(`review session missing target ${target.id}`);
const threatDecision = (threatDecisions.decisions ?? []).find((decision) => decision.id === target.id);
const requiredChecks = threatDecisions.requiredChecks ?? item.threatChecks ?? [];
const decisionFile = {
  schema: 'water9/content-threat-acceptance-decisions@1',
  reviewer: '<human-reviewer>',
  reviewedAt: '<ISO-8601 timestamp>',
  policy: {
    humanAuthored: true,
    automationCannotAcceptThreats: true,
    inspectSourceContactPhaseParityAndSandbox: true,
    screenshotAloneIsNotApproval: true,
  },
  decisions: [{
    id: item.id,
    species: item.species,
    status: 'needs-review',
    reviewer: '<human-reviewer>',
    sourceCandidateId: item.id,
    overallNote: '',
    evidenceFingerprint: threatDecision?.evidenceFingerprint ?? item.threatDecision?.evidenceFingerprint ?? null,
    visualChecks: checksTemplate(requiredChecks),
  }],
};

const report = {
  schema: 'water9/content-runtime-cohesion-review@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    qualityGateNext: 'public/review/content-quality-gate-next.json',
    reviewSession: 'public/review/content-review-session.json',
    threatDecisions: 'public/review/content-threat-acceptance-decision-template.json',
  },
  policy: {
    humanReviewerRequired: true,
    automationCannotApprove: true,
    sourceApprovalMustPrecedeThreatAcceptance: true,
    inGameAssemblyEvidenceRequired: true,
    screenshotAloneIsNotCapabilityProof: true,
  },
  target: {
    id: item.id,
    species: item.species,
    nextGate: target.nextGate,
    sourceApproved: Boolean(target.sourceApproved),
    threatAccepted: Boolean(target.threatAccepted),
    previewOnly: Boolean(target.previewOnly),
    sourcePreviewBoundary: target.sourcePreviewBoundary,
    runtimePreviewBoundary: target.runtimePreviewBoundary,
  },
  media: item.media,
  requiredChecks,
  decisionFile,
  commands: {
    rebuild: 'npm run content:runtime-cohesion-review',
    check: 'npm run content:runtime-cohesion-review-check',
    serveSmoke: 'npm run content:runtime-cohesion-review:serve-smoke',
    sourcePreview: item.commands.sourcePreview,
    runtimePreview: item.commands.runtimePreview,
    sandboxVisual: `npm run sandbox:visual -- --ids ${item.id} --states idle,lunge,stunned --with diver`,
    strictDryRun: 'npm run content:threat-decisions-apply -- --decisions water9-threat-acceptance-reviewed-decisions.json --strict',
  },
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdown(report));
await writeFile(paths.outHtml, html(report));

console.log(JSON.stringify({
  schema: report.schema,
  target: report.target.id,
  nextGate: report.target.nextGate,
  media: report.media.length,
  checks: report.requiredChecks.length,
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
}, null, 2));

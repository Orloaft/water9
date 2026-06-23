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
  visualFeedback: resolve(String(args.get('visual-feedback') ?? 'public/review/content-visual-feedback-ledger.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-cohort-cohesion-board.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/content-cohort-cohesion-board.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-cohort-cohesion-board.html')),
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

function mediaMap(item) {
  return new Map((item?.media ?? []).map((entry) => [entry.label, entry]));
}

function pickMedia(map, labels) {
  return labels.map((label) => ({
    label,
    url: map.get(label)?.url ?? null,
    present: Boolean(map.get(label)?.present && map.get(label)?.url),
  }));
}

function commandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function tile(item, species) {
  const missing = !item.present || !item.url;
  if (missing) {
    return `<div class="tile missing"><span>${htmlEscape(item.label)}</span><strong>missing</strong></div>`;
  }
  return `<a class="tile" href="${htmlEscape(item.url)}" data-media-label="${htmlEscape(item.label)}">
    <span>${htmlEscape(item.label)}</span>
    <img src="${htmlEscape(item.url)}" alt="${htmlEscape(`${species} ${item.label}`)}" loading="lazy">
  </a>`;
}

function numberOrNull(value) {
  return Number.isFinite(value) ? Number(value) : null;
}

function sourceMetricSummary(sourceBoard) {
  const size = Array.isArray(sourceBoard.metrics?.size) ? sourceBoard.metrics.size : [];
  const subjectSize = Array.isArray(sourceBoard.metrics?.subjectSize) ? sourceBoard.metrics.subjectSize : [];
  const width = Number(size[0]);
  const height = Number(size[1]);
  const subjectWidth = Number(subjectSize[0]);
  const subjectHeight = Number(subjectSize[1]);
  return {
    size: Number.isFinite(width) && Number.isFinite(height) ? [width, height] : null,
    subjectSize: Number.isFinite(subjectWidth) && Number.isFinite(subjectHeight) ? [subjectWidth, subjectHeight] : null,
    subjectWidthRatio: Number.isFinite(width) && width > 0 && Number.isFinite(subjectWidth) ? Number((subjectWidth / width).toFixed(4)) : null,
    subjectHeightRatio: Number.isFinite(height) && height > 0 && Number.isFinite(subjectHeight) ? Number((subjectHeight / height).toFixed(4)) : null,
    backgroundRatio: numberOrNull(sourceBoard.metrics?.backgroundRatio),
    innerMagentaRatio: numberOrNull(sourceBoard.metrics?.innerMagentaRatio),
  };
}

function riskFlagsFor(metrics, item) {
  const flags = [];
  if (!metrics.size || !metrics.subjectSize) flags.push({ id: 'missing-source-metrics', severity: 'high', text: 'source metric evidence is missing' });
  if ((metrics.subjectWidthRatio ?? 0) > 0.92 || (metrics.subjectHeightRatio ?? 0) > 0.9) {
    flags.push({ id: 'crop-risk', severity: 'high', text: 'source subject is close to the image edge; inspect crop-safe anatomy before approval' });
  }
  if ((metrics.subjectWidthRatio ?? 1) < 0.38 && (metrics.subjectHeightRatio ?? 1) < 0.38) {
    flags.push({ id: 'underscale-risk', severity: 'medium', text: 'source subject is small relative to canvas; check gameplay readability' });
  }
  if ((metrics.innerMagentaRatio ?? 0) > 0.0015) {
    flags.push({ id: 'magenta-key-risk', severity: 'medium', text: 'source contains measurable internal magenta residue; inspect extraction safety' });
  }
  if ((metrics.backgroundRatio ?? 1) < 0.55) {
    flags.push({ id: 'crowded-source-risk', severity: 'medium', text: 'low background ratio suggests a crowded source; inspect silhouette separation' });
  }
  if ((metrics.backgroundRatio ?? 0) > 0.9) {
    flags.push({ id: 'sparse-source-risk', severity: 'low', text: 'very high background ratio suggests the source may be visually small or sparse' });
  }
  if (item.sourceApproved || item.threatAccepted || item.countsTowardGate) {
    flags.push({ id: 'unexpected-gate-credit', severity: 'high', text: 'cohort board expected preview-only rows while strict gate remains incomplete' });
  }
  return flags;
}

function riskLevel(flags) {
  if (flags.some((flag) => flag.severity === 'high')) return 'high';
  if (flags.some((flag) => flag.severity === 'medium')) return 'medium';
  if (flags.some((flag) => flag.severity === 'low')) return 'low';
  return 'clear';
}

function markdown(report) {
  const lines = [
    '# Water 9 Cohort Cohesion Board',
    '',
    `Generated: \`${report.generatedAt}\``,
    '',
    'This cohort board shows all 20 target threats with source and runtime evidence together. It does not approve content automatically; it exists to catch style drift, weak silhouettes, and source/runtime mismatch before final human acceptance.',
    '',
    '## Summary',
    '',
    `- Target threats: \`${report.summary.targetThreats}\``,
    `- Items: \`${report.summary.items}\``,
    `- Source approval-ready: \`${report.summary.sourceApprovalReady}\``,
    `- Source approved: \`${report.summary.sourceApproved}\``,
    `- Accepted threats: \`${report.summary.acceptedThreats}\``,
    `- Preview-only rows: \`${report.summary.previewOnlyRows}\``,
    `- Open visual blockers: \`${report.summary.openVisualBlockers}\``,
    `- High-risk source rows: \`${report.summary.riskHigh}\``,
    `- Medium-risk source rows: \`${report.summary.riskMedium}\``,
    '',
    '## Cohort Risk Triage',
    '',
    ...Object.entries(report.summary.riskFlags).map(([flag, count]) => `- \`${flag}\`: \`${count}\``),
    ...(Object.keys(report.summary.riskFlags).length ? [] : ['- `clear`: `all rows`']),
    '',
    '## Required Cohort Checks',
    '',
    ...report.requiredChecks.map((check) => `- \`${check}\``),
    '',
    '## Targets',
    '',
  ];
  for (const item of report.items) {
    lines.push(
      `### ${item.rank}. ${item.species} (${item.id})`,
      '',
      `- Route state: \`${item.routeState}\``,
      `- Source approved: \`${item.sourceApproved}\``,
      `- Threat accepted: \`${item.threatAccepted}\``,
      `- Counts toward gate: \`${item.countsTowardGate}\``,
      `- Source media present: \`${item.sourceMedia.filter((media) => media.present).length}/${item.sourceMedia.length}\``,
    `- Runtime media present: \`${item.runtimeMedia.filter((media) => media.present).length}/${item.runtimeMedia.length}\``,
      `- Risk level: \`${item.riskLevel}\``,
      `- Risk flags: \`${item.riskFlags.map((flag) => flag.id).join(', ') || 'none'}\``,
      `- Source preview: \`${item.commands.sourcePreview}\``,
      `- Runtime preview: \`${item.commands.runtimePreview}\``,
      '',
    );
  }
  lines.push(
    '## Commands',
    '',
    '```bash',
    Object.values(report.commands).join('\n'),
    '```',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function html(report) {
  const cards = report.items.map((item) => `<article class="target" data-cohort-target="${htmlEscape(item.id)}">
    <header>
      <div>
        <h2>${item.rank}. ${htmlEscape(item.species)}</h2>
        <code>${htmlEscape(item.id)}</code>
      </div>
      <strong>${htmlEscape(item.routeState)}</strong>
    </header>
    <section class="facts">
      <span>source approved <b>${item.sourceApproved ? 'yes' : 'no'}</b></span>
      <span>threat accepted <b>${item.threatAccepted ? 'yes' : 'no'}</b></span>
      <span>gate credit <b>${item.countsTowardGate ? 'yes' : 'no'}</b></span>
      <span>preview only <b>${item.previewOnly ? 'yes' : 'no'}</b></span>
      <span>risk <b>${htmlEscape(item.riskLevel)}</b></span>
    </section>
    <section class="risk">
      <h3>Mechanical Triage</h3>
      <p>subject ${item.sourceMetrics.subjectWidthRatio ?? 'n/a'} x ${item.sourceMetrics.subjectHeightRatio ?? 'n/a'}, background ${item.sourceMetrics.backgroundRatio ?? 'n/a'}, inner magenta ${item.sourceMetrics.innerMagentaRatio ?? 'n/a'}</p>
      <ul>${item.riskFlags.length ? item.riskFlags.map((flag) => `<li data-risk-flag="${htmlEscape(flag.id)}"><b>${htmlEscape(flag.id)}</b>: ${htmlEscape(flag.text)}</li>`).join('') : '<li data-risk-flag="clear">clear: no mechanical source-image risk flags</li>'}</ul>
    </section>
    <section class="media-pair">
      <div>
        <h3>Source Evidence</h3>
        <div class="media">${item.sourceMedia.map((media) => tile(media, item.species)).join('')}</div>
      </div>
      <div>
        <h3>Runtime Evidence</h3>
        <div class="media">${item.runtimeMedia.map((media) => tile(media, item.species)).join('')}</div>
      </div>
    </section>
    <details>
      <summary>Review contract</summary>
      <ul>${item.requiredRead.map((text) => `<li>${htmlEscape(text)}</li>`).join('')}</ul>
      <ul>${item.contractReviewChecklist.map((text) => `<li>${htmlEscape(text)}</li>`).join('')}</ul>
    </details>
    ${commandBlock([item.commands.sourcePreview, item.commands.runtimePreview, item.commands.sandboxVisual])}
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Cohort Cohesion Board</title>
  <style>
    :root { color-scheme: dark; background:#061115; color:#e2f3f4; font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    * { box-sizing:border-box; }
    body { margin:0; padding:26px; background:#061115; }
    main { max-width:1480px; margin:0 auto; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4.2rem); letter-spacing:0; }
    h2 { margin:0; font-size:1.25rem; }
    h3 { margin:0 0 8px; color:#a9c5cb; font-size:.8rem; text-transform:uppercase; }
    p, li, span { color:#bfd5d9; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { border:1px solid #294852; background:#041014; color:#e7fbff; border-radius:6px; padding:10px; overflow:auto; white-space:pre-wrap; }
    .notice, .target { border:1px solid #294852; background:#0b1e24; border-radius:7px; padding:14px; }
    .notice { border-color:#73582d; background:#21180d; color:#f3d9a2; margin:14px 0; }
    .summary, .facts { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:8px; margin:16px 0; }
    .summary span, .facts span { border:1px solid #223f49; background:#07171c; border-radius:6px; padding:9px; }
    .target { margin:16px 0; }
    .target header { display:flex; justify-content:space-between; gap:12px; align-items:start; }
    .media-pair { display:grid; grid-template-columns:repeat(auto-fit,minmax(360px,1fr)); gap:14px; }
    .risk { border:1px solid #234752; background:#07171c; border-radius:6px; padding:10px; margin:10px 0 14px; }
    .risk ul { margin:8px 0 0; padding-left:18px; }
    .risk p { margin:0; }
    .media { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:8px; }
    .tile { display:block; border:1px solid #294852; background:#06151a; border-radius:6px; overflow:hidden; min-height:130px; }
    .tile img { display:block; width:100%; aspect-ratio:16/10; object-fit:contain; background:#02090b; }
    .tile span { display:block; padding:7px 8px; font-weight:700; color:#dff7fb; }
    .missing { display:grid; place-items:center; color:#f3b6a5; }
    details { margin:12px 0; }
    summary { cursor:pointer; color:#dff7fb; }
    a { color:#83def1; text-decoration:none; }
  </style>
</head>
<body>
  <main data-content-cohort-cohesion-board>
    <h1>Cohort Cohesion Board</h1>
    <p>All target threats with source and runtime evidence together for cohort-level human review.</p>
    <div class="notice">This board does not approve content automatically. Preview-only rows cannot count toward the 20-threat gate.</div>
    <section class="summary">
      <span>targets <b>${report.summary.targetThreats}</b></span>
      <span>items <b>${report.summary.items}</b></span>
      <span>source ready <b>${report.summary.sourceApprovalReady}</b></span>
      <span>source approved <b>${report.summary.sourceApproved}</b></span>
      <span>accepted <b>${report.summary.acceptedThreats}</b></span>
      <span>visual blockers <b>${report.summary.openVisualBlockers}</b></span>
      <span>high risk <b>${report.summary.riskHigh}</b></span>
      <span>medium risk <b>${report.summary.riskMedium}</b></span>
    </section>
    <section class="notice"><b>Cohort Risk Triage</b>: mechanical source-image risk flags prioritize review attention; they do not approve or reject content automatically.</section>
    ${cards}
    <h2>Commands</h2>
    ${commandBlock(Object.values(report.commands))}
  </main>
</body>
</html>
`;
}

const matrix = await readJson(paths.matrix);
const reviewSession = await readJson(paths.reviewSession);
const sourceVisualBoard = await readJson(paths.sourceVisualBoard, { items: [], summary: {} });
const visualFeedback = await readJson(paths.visualFeedback, { items: [], summary: {} });
if (matrix?.schema !== 'water9/content-quality-gate-matrix@1') throw new Error(`unexpected matrix schema ${matrix?.schema ?? 'missing'}`);
if (reviewSession?.schema !== 'water9/content-review-session@1') throw new Error(`unexpected review session schema ${reviewSession?.schema ?? 'missing'}`);

const sourceLabels = ['source art', 'magenta key preview', 'source sandbox preview', 'articulation plan preview'];
const runtimeLabels = ['source parity overlay', 'contact sheet', 'phase strip', 'sandbox idle', 'sandbox lunge', 'sandbox stunned'];
const sourceBoardById = new Map((sourceVisualBoard.items ?? []).map((item) => [item.id, item]));
const sessionById = new Map((reviewSession.items ?? []).map((item) => [item.id, item]));
const rows = matrix.rows ?? [];
const items = rows.map((row, index) => {
  const session = sessionById.get(row.id) ?? {};
  const sourceBoard = sourceBoardById.get(row.id) ?? {};
  const media = mediaMap(session);
  const sourceMetrics = sourceMetricSummary(sourceBoard);
  const baseItem = {
    sourceApproved: Boolean(row.sourceApproved),
    threatAccepted: Boolean(row.threatAccepted),
    countsTowardGate: Boolean(row.countsTowardGate),
  };
  const riskFlags = riskFlagsFor(sourceMetrics, baseItem);
  return {
    rank: row.rank ?? index + 1,
    id: row.id,
    species: row.species,
    routeState: row.routeState ?? row.nextGate ?? 'unknown',
    sourceApproved: Boolean(row.sourceApproved),
    threatAccepted: Boolean(row.threatAccepted),
    countsTowardGate: Boolean(row.countsTowardGate),
    previewOnly: Boolean(row.previewOnly),
    sourceEvidenceComplete: Boolean(row.sourceEvidenceComplete),
    runtimeEvidenceComplete: Boolean(row.runtimeEvidenceComplete),
    sourceMetrics,
    riskLevel: riskLevel(riskFlags),
    riskFlags,
    sourceMedia: pickMedia(media, sourceLabels),
    runtimeMedia: pickMedia(media, runtimeLabels),
    requiredRead: sourceBoard.requiredRead ?? [],
    contractReviewChecklist: sourceBoard.contractReviewChecklist ?? [],
    commands: {
      sourcePreview: row.commands?.sourcePreview ?? session.commands?.sourcePreview ?? `npm run sandbox:preview -- --id source-${row.id} --with diver --serve --open --visual`,
      runtimePreview: row.commands?.runtimePreview ?? session.commands?.runtimePreview ?? `npm run sandbox:preview -- --id ${row.id} --with diver --serve --open --visual`,
      sandboxVisual: `npm run sandbox:visual -- --ids ${row.id} --states idle,lunge,stunned --with diver`,
    },
  };
});

const report = {
  schema: 'water9/content-cohort-cohesion-board@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    matrix: 'public/review/content-quality-gate-matrix.json',
    reviewSession: 'public/review/content-review-session.json',
    sourceVisualBoard: 'public/review/source-visual-board.json',
    visualFeedback: 'public/review/content-visual-feedback-ledger.json',
  },
  policy: {
    humanReviewerRequired: true,
    automationCannotApprove: true,
    allTargetsVisibleTogether: true,
    sourceAndRuntimeEvidenceTogether: true,
    previewOnlyCannotCountTowardGate: true,
  },
  summary: {
    targetThreats: matrix.summary?.targetThreats ?? rows.length,
    items: items.length,
    sourceApprovalReady: matrix.summary?.sourceApprovalReady ?? 0,
    sourceApproved: matrix.summary?.sourceApproved ?? 0,
    acceptedThreats: matrix.summary?.acceptedThreats ?? 0,
    previewOnlyRows: matrix.summary?.previewOnlyRows ?? items.filter((item) => item.previewOnly).length,
    sourceEvidenceComplete: matrix.summary?.sourceEvidenceComplete ?? 0,
    runtimeEvidenceComplete: matrix.summary?.runtimeEvidenceComplete ?? 0,
    openVisualBlockers: (visualFeedback.items ?? []).filter((item) => item.open && item.severity === 'blocking').length,
    riskHigh: items.filter((item) => item.riskLevel === 'high').length,
    riskMedium: items.filter((item) => item.riskLevel === 'medium').length,
    riskLow: items.filter((item) => item.riskLevel === 'low').length,
    riskClear: items.filter((item) => item.riskLevel === 'clear').length,
    riskFlags: items.reduce((counts, item) => {
      for (const flag of item.riskFlags) counts[flag.id] = (counts[flag.id] ?? 0) + 1;
      return counts;
    }, {}),
  },
  requiredChecks: reviewSession.sourceDecisionFileTemplate?.decisions?.[0]
    ? Object.keys(reviewSession.sourceDecisionFileTemplate.decisions[0].visualChecks ?? {})
    : [],
  runtimeRequiredChecks: reviewSession.threatDecisionFileTemplate?.decisions?.[0]
    ? Object.keys(reviewSession.threatDecisionFileTemplate.decisions[0].visualChecks ?? {})
    : [],
  items,
  commands: {
    rebuild: 'npm run content:cohort-cohesion-board',
    check: 'npm run content:cohort-cohesion-board-check',
    serveSmoke: 'npm run content:cohort-cohesion-board:serve-smoke',
    reviewSession: 'npm run content:review-session && npm run content:review-session-check',
    sourceVisualBoard: 'npm run source:visual-board && npm run source:visual-board-check',
    strictSourceApply: 'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
    strictThreatApply: 'npm run content:threat-decisions-apply -- --decisions water9-threat-acceptance-reviewed-decisions.json --strict',
  },
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdown(report));
await writeFile(paths.outHtml, html(report));

console.log(JSON.stringify({
  schema: report.schema,
  items: report.summary.items,
  targetThreats: report.summary.targetThreats,
  acceptedThreats: report.summary.acceptedThreats,
  openVisualBlockers: report.summary.openVisualBlockers,
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
}, null, 2));

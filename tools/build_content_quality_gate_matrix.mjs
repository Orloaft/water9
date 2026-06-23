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
  signoff: resolve(String(args.get('signoff') ?? 'public/review/content-human-signoff-queue.json')),
  reviewSession: resolve(String(args.get('review-session') ?? 'public/review/content-review-session.json')),
  articulationRoster: resolve(String(args.get('articulation-roster') ?? 'public/review/content-articulation-roster.json')),
  sourceApprovalRunway: resolve(String(args.get('source-approval-runway') ?? 'public/review/source-approval-runway.json')),
  sandboxManifest: resolve(String(args.get('sandbox-manifest') ?? 'public/review/sandbox/manifest.json')),
  goalReadiness: resolve(String(args.get('goal-readiness') ?? 'public/review/content-goal-readiness.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-quality-gate-matrix.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/content-quality-gate-matrix.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-quality-gate-matrix.html')),
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

function bool(value) {
  return value === true;
}

function nextGateFor(row) {
  if (row.sourceCriticRegenerationRequired) return 'source-regeneration';
  if (!row.sourceApproved) return 'human-source-approval';
  if (!row.threatAccepted) return 'human-threat-acceptance';
  return row.countsTowardGate ? 'accepted' : 'strict-gate-recheck';
}

function commandFromList(commands, needle) {
  return (commands ?? []).find((command) => String(command).includes(needle)) ?? null;
}

function evidenceStatus(media) {
  return Object.values(media).every(Boolean);
}

function markdown(report) {
  const lines = [
    '# Water 9 Quality Gate Matrix',
    '',
    `Generated: \`${report.generatedAt}\``,
    `Rows: \`${report.summary.rows}\``,
    `Accepted threats: \`${report.summary.acceptedThreats}/${report.summary.targetThreats}\``,
    `Strict goal complete: \`${report.summary.strictGoalComplete}\``,
    '',
    'This matrix is a human-review execution surface. It does not approve source art, does not accept threats, and does not convert preview-only evidence into strict gate credit.',
    '',
    '## Summary',
    '',
    `- Source evidence complete: \`${report.summary.sourceEvidenceComplete}/${report.summary.rows}\``,
    `- Runtime evidence complete: \`${report.summary.runtimeEvidenceComplete}/${report.summary.rows}\``,
    `- All evidence complete: \`${report.summary.allEvidenceComplete}/${report.summary.rows}\``,
    `- Human source approved: \`${report.summary.sourceApproved}/${report.summary.rows}\``,
    `- Human threat accepted: \`${report.summary.threatAccepted}/${report.summary.rows}\``,
    `- Strict gate eligible: \`${report.summary.strictGateEligible}/${report.summary.targetThreats}\``,
    '',
    '## Rows',
    '',
    '| Rank | Threat | Next Gate | Evidence | Source | Threat | Preview Boundary |',
    '| ---: | --- | --- | --- | --- | --- | --- |',
  ];
  for (const row of report.rows) {
    lines.push(`| ${row.rank} | \`${row.id}\` ${row.species} | \`${row.nextGate}\` | ${row.allEvidenceComplete ? 'complete' : 'missing'} | ${row.sourceApproved ? 'approved' : 'not approved'} | ${row.threatAccepted ? 'accepted' : 'not accepted'} | ${row.previewOnly ? 'preview-only' : 'accepted'} |`);
  }
  lines.push('', '## Focus Commands', '');
  for (const row of report.rows) {
    lines.push(`### \`${row.id}\``, '');
    lines.push(`- source review: \`${row.links.sourceQuickReview ?? 'missing'}\``);
    lines.push(`- content cockpit: \`${row.links.cockpit ?? 'missing'}\``);
    lines.push(`- source sandbox: \`${row.commands.sourcePreview ?? 'missing'}\``);
    lines.push(`- runtime sandbox: \`${row.commands.runtimePreview ?? 'missing'}\``);
    lines.push(`- source approval dry-run: \`${row.commands.sourceApprovalDryRun ?? 'missing'}\``);
    lines.push(`- threat acceptance dry-run: \`${row.commands.threatAcceptanceDryRun ?? 'missing'}\``);
    lines.push('');
  }
  lines.push(
    '## Verification',
    '',
    '```bash',
    'npm run content:quality-gate-matrix',
    'npm run content:quality-gate-matrix-check',
    'npm run content:quality-gate-matrix:serve-smoke',
    'npm run content:goal-readiness-strict',
    '```',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function html(report) {
  const cards = report.rows.map((row) => `<article class="row" data-quality-gate-row="${htmlEscape(row.id)}" data-next-gate="${htmlEscape(row.nextGate)}">
    <header>
      <h2>${row.rank}. ${htmlEscape(row.species)}</h2>
      <strong>${htmlEscape(row.nextGate)}</strong>
    </header>
    <div class="grid">
      <span>source evidence <b>${row.sourceEvidenceComplete ? 'yes' : 'no'}</b></span>
      <span>runtime evidence <b>${row.runtimeEvidenceComplete ? 'yes' : 'no'}</b></span>
      <span>source approved <b>${row.sourceApproved ? 'yes' : 'no'}</b></span>
      <span>threat accepted <b>${row.threatAccepted ? 'yes' : 'no'}</b></span>
      <span>strict credit <b>${row.strictGateEligible ? 'yes' : 'no'}</b></span>
      <span>preview-only <b>${row.previewOnly ? 'yes' : 'no'}</b></span>
    </div>
    <div class="links">
      <a href="${htmlEscape(row.links.sourceQuickReview ?? '#')}">source review</a>
      <a href="${htmlEscape(row.links.cockpit ?? '#')}">cockpit</a>
      <a href="${htmlEscape(row.links.sourceSandbox ?? '#')}">source sandbox</a>
      <a href="${htmlEscape(row.links.runtimeSandbox ?? '#')}">runtime sandbox</a>
    </div>
    <pre>${htmlEscape([
      row.commands.sourcePreview,
      row.commands.runtimePreview,
      row.commands.sourceApprovalDryRun,
      row.commands.threatAcceptanceDryRun,
    ].filter(Boolean).join('\n'))}</pre>
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Quality Gate Matrix</title>
  <style>
    :root { color-scheme: dark; background:#061115; color:#dceff0; font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    body { margin:0; padding:26px; background:#061115; }
    main { max-width:1240px; margin:0 auto; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4.6rem); letter-spacing:0; }
    h2 { margin:0; font-size:1rem; }
    p, span, a, li { color:#bfd6da; }
    a { text-decoration-color:#67d7e6; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; overflow-wrap:anywhere; }
    pre { white-space:pre-wrap; border:1px solid #1d3a42; background:#041013; border-radius:6px; padding:10px; color:#dff8ff; }
    .notice, .summary, .row { border:1px solid #294954; background:#0b1e24; border-radius:6px; padding:14px; }
    .notice { border-color:#6b5730; background:#1d1810; margin:14px 0; color:#f0d8a6; }
    .summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:8px; margin:18px 0; }
    .summary span, .grid span { border:1px solid #203c45; background:#07171c; border-radius:5px; padding:8px; }
    .row { margin:12px 0; }
    .row header { display:flex; justify-content:space-between; gap:12px; align-items:center; }
    .row strong { color:#ffe08a; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:8px; margin:12px 0; }
    .links { display:flex; flex-wrap:wrap; gap:12px; margin:10px 0; }
  </style>
</head>
<body>
  <main data-content-quality-gate-matrix data-strict-goal-complete="${report.summary.strictGoalComplete}" data-accepted-threats="${report.summary.acceptedThreats}">
    <h1>Quality Gate Matrix</h1>
    <p>Per-threat execution matrix for the strict 20-threat gate.</p>
    <div class="notice">This matrix does not approve source art, does not accept threats, and does not convert preview-only evidence into strict gate credit.</div>
    <section class="summary">
      <span>rows <b>${report.summary.rows}</b></span>
      <span>source evidence <b>${report.summary.sourceEvidenceComplete}</b></span>
      <span>runtime evidence <b>${report.summary.runtimeEvidenceComplete}</b></span>
      <span>all evidence <b>${report.summary.allEvidenceComplete}</b></span>
      <span>source approved <b>${report.summary.sourceApproved}</b></span>
      <span>threat accepted <b>${report.summary.threatAccepted}</b></span>
      <span>Strict gate eligible <b>${report.summary.strictGateEligible}</b></span>
    </section>
    ${cards}
  </main>
</body>
</html>
`;
}

const signoff = await readJson(paths.signoff, { items: [], summary: {} });
const reviewSession = await readJson(paths.reviewSession, { items: [], summary: {} });
const articulationRoster = await readJson(paths.articulationRoster, { items: [], summary: {} });
const sourceApprovalRunway = await readJson(paths.sourceApprovalRunway, { items: [], summary: {} });
const sandboxManifest = await readJson(paths.sandboxManifest, { entries: [] });
const goalReadiness = await readJson(paths.goalReadiness, { strictGoalComplete: false });

const reviewSessionById = new Map((reviewSession.items ?? []).map((item) => [item.id, item]));
const articulationById = new Map((articulationRoster.items ?? []).map((item) => [item.id, item]));
const approvalById = new Map((sourceApprovalRunway.items ?? []).map((item) => [item.id, item]));
const sandboxById = new Map((sandboxManifest.entries ?? []).map((item) => [item.id, item]));

const rows = (signoff.items ?? []).map((item, index) => {
  const session = reviewSessionById.get(item.id) ?? {};
  const articulation = articulationById.get(item.id) ?? {};
  const approval = approvalById.get(item.id) ?? {};
  const mediaByLabel = new Map((session.media ?? []).map((media) => [media.label, media]));
  const sourceBoundary = session.previewBoundaries?.source ?? sandboxById.get(`source-${item.id}`) ?? {};
  const runtimeBoundary = session.previewBoundaries?.runtime ?? sandboxById.get(item.id) ?? {};
  const sourceEvidence = {
    sourceArt: bool(mediaByLabel.get('source art')?.present),
    magentaKeyPreview: bool(mediaByLabel.get('magenta key preview')?.present),
    sourceSandboxPreview: bool(mediaByLabel.get('source sandbox preview')?.present),
    articulationPlanPreview: bool(mediaByLabel.get('articulation plan preview')?.present),
  };
  const runtimeEvidence = {
    sourceParityOverlay: bool(mediaByLabel.get('source parity overlay')?.present),
    contactSheet: bool(mediaByLabel.get('contact sheet')?.present),
    phaseStrip: bool(mediaByLabel.get('phase strip')?.present),
    sandboxIdle: bool(mediaByLabel.get('sandbox idle')?.present),
    sandboxLunge: bool(mediaByLabel.get('sandbox lunge')?.present),
    sandboxStunned: bool(mediaByLabel.get('sandbox stunned')?.present),
  };
  const commands = {
    sourcePreview: session.commands?.sourcePreview ?? articulation.commands?.sourceSandboxPreview ?? commandFromList(item.commands, `source-${item.id}`),
    runtimePreview: session.commands?.runtimePreview ?? articulation.commands?.pairedSandboxPreview ?? commandFromList(item.commands, `--id ${item.id}`),
    sourceApprovalDryRun: session.commands?.sourceApprovalDryRun ?? commandFromList(item.commands, 'npm run source:accept'),
    threatAcceptanceDryRun: session.commands?.threatAcceptanceDryRun ?? commandFromList(item.commands, 'npm run content:accept'),
  };
  const row = {
    rank: item.rank ?? index + 1,
    id: item.id,
    species: item.species,
    routeState: item.routeState ?? session.routeState ?? null,
    sourceCriticRegenerationRequired: bool(item.sourceCriticRegenerationRequired || approval.criticRegenerationRequired),
    sourceApprovalReady: bool(item.sourceApprovalReady || approval.readyForHumanReview),
    sourceApproved: bool(item.sourceApproved || approval.humanApproved),
    threatAccepted: bool(item.threatAccepted),
    countsTowardGate: bool(item.countsTowardGate),
    rigEvidenceReady: bool(item.rigEvidenceReady),
    sourceEvidence,
    runtimeEvidence,
    sourceEvidenceComplete: evidenceStatus(sourceEvidence),
    runtimeEvidenceComplete: evidenceStatus(runtimeEvidence),
    sourcePreviewBoundary: sourceBoundary.productionBoundary ?? sourceBoundary,
    runtimePreviewBoundary: runtimeBoundary.productionBoundary ?? runtimeBoundary,
    previewOnly: sourceBoundary.previewOnly === true || runtimeBoundary.previewOnly === true,
    commands,
    links: {
      sourceQuickReview: item.evidence?.sourceQuickReview ?? session.links?.sourceQuickReview ?? null,
      sourceApprovalRunway: item.evidence?.sourceApprovalRunway ?? '/review/source-approval-runway.html',
      cockpit: session.links?.cockpit ?? `/review/content-review-cockpit/${item.id}.html`,
      audit: session.links?.audit ?? item.evidence?.auditHtml ?? null,
      sourceSandbox: session.links?.sourceSandbox ?? articulation.sandbox?.sourceUrl ?? `/?entity=source-${item.id}&companion=diver`,
      runtimeSandbox: session.links?.runtimeSandbox ?? articulation.sandbox?.runtimeUrl ?? `/?sandbox=${item.id}&companion=diver`,
    },
  };
  row.allEvidenceComplete = row.sourceEvidenceComplete && row.runtimeEvidenceComplete;
  row.strictGateEligible = row.sourceApproved && row.threatAccepted && row.countsTowardGate;
  row.nextGate = nextGateFor(row);
  return row;
});

const summary = {
  targetThreats: signoff.summary?.targetThreats ?? 20,
  rows: rows.length,
  sourceEvidenceComplete: rows.filter((row) => row.sourceEvidenceComplete).length,
  runtimeEvidenceComplete: rows.filter((row) => row.runtimeEvidenceComplete).length,
  allEvidenceComplete: rows.filter((row) => row.allEvidenceComplete).length,
  sourceApprovalReady: rows.filter((row) => row.sourceApprovalReady && !row.sourceApproved).length,
  sourceCriticRegenerationRequired: rows.filter((row) => row.sourceCriticRegenerationRequired && !row.sourceApproved).length,
  sourceApproved: rows.filter((row) => row.sourceApproved).length,
  threatAccepted: rows.filter((row) => row.threatAccepted).length,
  strictGateEligible: rows.filter((row) => row.strictGateEligible).length,
  previewOnlyRows: rows.filter((row) => row.previewOnly).length,
  acceptedThreats: signoff.summary?.acceptedThreats ?? rows.filter((row) => row.threatAccepted).length,
  strictGoalComplete: goalReadiness.strictGoalComplete === true,
  nextStage: goalReadiness.nextAction?.stage ?? null,
};

const report = {
  schema: 'water9/content-quality-gate-matrix@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    signoff: 'public/review/content-human-signoff-queue.json',
    reviewSession: 'public/review/content-review-session.json',
    articulationRoster: 'public/review/content-articulation-roster.json',
    sourceApprovalRunway: 'public/review/source-approval-runway.json',
    sandboxManifest: 'public/review/sandbox/manifest.json',
    goalReadiness: 'public/review/content-goal-readiness.json',
  },
  policy: {
    humanSourceApprovalRequired: true,
    humanThreatAcceptanceRequired: true,
    previewOnlyEvidenceCannotCountTowardStrictGate: true,
    automationCannotApproveContent: true,
  },
  summary,
  rows,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdown(report));
await writeFile(paths.outHtml, html(report));

console.log(JSON.stringify({
  schema: report.schema,
  rows: report.summary.rows,
  sourceEvidenceComplete: report.summary.sourceEvidenceComplete,
  runtimeEvidenceComplete: report.summary.runtimeEvidenceComplete,
  sourceApproved: report.summary.sourceApproved,
  acceptedThreats: report.summary.acceptedThreats,
  strictGateEligible: report.summary.strictGateEligible,
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
}, null, 2));

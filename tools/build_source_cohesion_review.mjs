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
  quickReviews: resolve(String(args.get('quick-reviews') ?? 'public/review/source-candidates/quick-reviews/index.json')),
  approvalRunway: resolve(String(args.get('approval-runway') ?? 'public/review/source-approval-runway.json')),
  reviewDossier: resolve(String(args.get('review-dossier') ?? 'public/review/source-candidates/source-review-dossier.json')),
  planCoverage: resolve(String(args.get('plan-coverage') ?? 'public/review/content-plan-coverage.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-cohesion-review.json')),
  outMd: resolve(String(args.get('md-out') ?? 'public/review/source-candidates/source-cohesion-review.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-cohesion-review.html')),
};

const REQUIRED_COHESION_CHECKS = [
  {
    id: 'whole-creature-cohesion',
    label: 'Whole creature cohesion',
    evidence: 'The image reads as one designed organism, not a bundle of unrelated shapes.',
  },
  {
    id: 'part-continuity-cohesion',
    label: 'Part continuity cohesion',
    evidence: 'Limbs, joints, materials, lighting, and proportions remain continuous across riggable parts.',
  },
  {
    id: 'readable-silhouette',
    label: 'Readable silhouette',
    evidence: 'The creature is identifiable at gameplay scale and has a clear attack profile.',
  },
  {
    id: 'no-collage-artifacts',
    label: 'No collage artifacts',
    evidence: 'No pasted, mismatched, duplicate, or style-inconsistent fragments are visible.',
  },
  {
    id: 'non-placeholder-art-direction',
    label: 'Non-placeholder art direction',
    evidence: 'The art looks like production source material, not a temporary technical prototype.',
  },
  {
    id: 'clean-magenta-key',
    label: 'Clean magenta key',
    evidence: 'The pure magenta background can be removed without white/dark halos or lost anatomy.',
  },
  {
    id: 'neutral-riggable-pose',
    label: 'Neutral riggable pose',
    evidence: 'The pose exposes pivots, attack parts, and crop-safe margins for articulation.',
  },
];

const COHESION_FIRST_PRINCIPLES = [
  {
    id: 'full-source-concept-first',
    label: 'Full-source concept first',
    evidence: 'Approve the creature only after the intact source image reads as one coherent animal or organism before any limbs, parts, or animation frames are extracted.',
  },
  {
    id: 'mechanical-preview-is-not-art-approval',
    label: 'Mechanical rig preview is not art approval',
    evidence: 'A sandbox screenshot, contact sheet, or working articulation proves technical readiness only; it cannot rescue source art that lacks a unified silhouette, anatomy, palette, and material language.',
  },
  {
    id: 'reject-placeholder-cohesion',
    label: 'Reject placeholder cohesion',
    evidence: 'If the design reads as placeholder parts, unrelated pasted fragments, or a proof-of-concept assembly, reject it for regeneration rather than promoting it into the 20-threat gate.',
  },
];

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

function publicUrl(path) {
  if (!path) return null;
  if (path.startsWith('/')) return path;
  if (path.startsWith('public/')) return `/${path.slice('public/'.length)}`;
  return path;
}

function planPreviewUrl(path) {
  if (!path) return null;
  if (path.startsWith('public/review/')) return `/${path.slice('public/'.length)}`;
  return publicUrl(path);
}

function commandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function imageBlock(label, src) {
  if (!src) return `<div class="image missing"><span>${htmlEscape(label)} missing</span></div>`;
  return `<a class="image" href="${htmlEscape(src)}"><img src="${htmlEscape(src)}" alt="${htmlEscape(label)}"><span>${htmlEscape(label)}</span></a>`;
}

function markdownFor(report) {
  const rows = report.items.map((item) => `| ${item.id} | ${item.species} | ${item.readyForCohesionReview ? 'yes' : 'no'} | ${item.humanCohesionApproved ? 'yes' : 'no'} | ${item.productionEligible ? 'yes' : 'no'} | ${item.blockers.join('; ')} |`).join('\n');
  return `# Water 9 Source Cohesion Review

Generated: \`${report.generatedAt}\`

This board exists to prevent prototype screenshots from being treated as production art. Automation packages evidence; only a human can approve cohesion.

## Policy

- Prototype screenshots do not count toward the strict 20-threat gate.
- Human source approval is required before production rigging or threat acceptance.
- Every approved source must include specific notes for every required cohesion check.
- A passing sandbox/source preview is evidence, not approval.

## Cohesion-First Principles

${report.cohesionFirstPrinciples.map((principle) => `- **${principle.label}** \`${principle.id}\`: ${principle.evidence}`).join('\n')}

## Summary

- Candidates: ${report.summary.candidates}
- Ready for cohesion review: ${report.summary.readyForCohesionReview}
- Human cohesion approved: ${report.summary.humanCohesionApproved}
- Prototype locked: ${report.summary.prototypeLocked}
- Review evidence complete: ${report.summary.reviewEvidenceComplete}

## Required Checks

${report.requiredCohesionChecks.map((check) => `- \`${check.id}\`: ${check.evidence}`).join('\n')}

## Commands

\`\`\`bash
npm run source:cohesion-review && npm run source:cohesion-review-check
npm run source:approval-runway && npm run source:approval-runway-check
\`\`\`

## Candidates

| Candidate | Species | Ready | Approved | Production eligible | Blockers |
| --- | --- | ---: | ---: | ---: | --- |
${rows}
`;
}

function htmlFor(report) {
  const checkRows = report.requiredCohesionChecks.map((check) => `<li><strong>${htmlEscape(check.label)}</strong><code>${htmlEscape(check.id)}</code><span>${htmlEscape(check.evidence)}</span></li>`).join('\n');
  const principleRows = report.cohesionFirstPrinciples.map((principle) => `<li><strong>${htmlEscape(principle.label)}</strong><code>${htmlEscape(principle.id)}</code><span>${htmlEscape(principle.evidence)}</span></li>`).join('\n');
  const cards = report.items.map((item) => `<article class="card" id="${htmlEscape(item.id)}" data-source-cohesion-candidate="${htmlEscape(item.id)}">
    <header>
      <div><h2>${htmlEscape(item.species)}</h2><code>${htmlEscape(item.id)}</code></div>
      <strong>${item.humanCohesionApproved ? 'human approved' : item.readyForCohesionReview ? 'ready for review' : 'blocked'}</strong>
    </header>
    <p class="warning">${htmlEscape(item.reviewBoundary)}</p>
    <div class="media">
      ${imageBlock('source', item.links.source)}
      ${imageBlock('magenta key', item.links.keyPreview)}
      ${imageBlock('sandbox source preview', item.links.sandboxScreenshot)}
      ${imageBlock('plan preview', item.links.planPreview)}
    </div>
    <div class="badges">
      <span>ready <strong>${item.readyForCohesionReview}</strong></span>
      <span>evidence complete <strong>${item.evidenceComplete}</strong></span>
      <span>human cohesion approved <strong>${item.humanCohesionApproved}</strong></span>
      <span>production eligible <strong>${item.productionEligible}</strong></span>
    </div>
    <h3>Blockers</h3>
    <ul>${item.blockers.map((blocker) => `<li>${htmlEscape(blocker)}</li>`).join('')}</ul>
    <h3>Review Commands</h3>
    ${commandBlock([item.commands.quickReview, item.commands.sourceApproval, item.commands.sandboxSource, item.commands.accept, item.commands.reject])}
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Cohesion Review</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0d1b20; --line:#29444b; --text:#e6f5f5; --muted:#91a9ae; --accent:#7adff6; --warn:#e7bd6d; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1440px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:0; font-size:18px; }
    h3 { margin:14px 0 8px; color:var(--muted); font-size:13px; text-transform:uppercase; }
    p { color:var(--muted); }
    a { color:var(--accent); text-decoration:none; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { margin:0; border:1px solid var(--line); background:#050b0d; padding:10px; overflow:auto; white-space:pre-wrap; }
    .summary, .badges { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }
    .summary span, .badges span { border:1px solid var(--line); background:#09171b; border-radius:5px; padding:7px 9px; color:var(--muted); }
    strong { color:var(--text); }
    .policy, .checks, .card { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:14px; }
    .checks ul { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:8px; padding:0; margin:0; list-style:none; }
    .checks li { border:1px solid var(--line); background:#09171b; border-radius:5px; padding:10px; }
    .checks code, .checks span { display:block; margin-top:4px; color:var(--muted); }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(430px,1fr)); gap:14px; align-items:start; margin-top:14px; }
    .card header { display:flex; justify-content:space-between; gap:12px; align-items:start; }
    .media { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin:12px 0; }
    .image { display:flex; min-height:120px; flex-direction:column; justify-content:space-between; border:1px solid var(--line); background:#050b0d; overflow:hidden; }
    .image img { width:100%; height:120px; object-fit:contain; background:#050b0d; }
    .image span { padding:6px; color:var(--muted); font-size:12px; }
    .missing { align-items:center; justify-content:center; color:var(--warn); }
    .warning { color:var(--warn); }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Source Cohesion Review</h1>
    <p>Prototype-vs-production boundary for generated source art. Automation packages evidence; only a human can approve cohesion.</p>
    <div class="summary">
      <span>candidates <strong>${report.summary.candidates}</strong></span>
      <span>ready <strong>${report.summary.readyForCohesionReview}</strong></span>
      <span>human approved <strong>${report.summary.humanCohesionApproved}</strong></span>
      <span>prototype locked <strong>${report.summary.prototypeLocked}</strong></span>
      <span>evidence complete <strong>${report.summary.reviewEvidenceComplete}</strong></span>
    </div>
    <section class="policy">
      <h2>Policy</h2>
      <p>Prototype screenshots do not count toward the strict 20-threat gate. A passing sandbox preview is evidence, not approval. Production rigging requires human source approval with specific cohesion notes.</p>
      ${commandBlock(['npm run source:cohesion-review && npm run source:cohesion-review-check', 'npm run source:approval-runway && npm run source:approval-runway-check'])}
    </section>
    <section class="checks">
      <h2>Cohesion-First Principles</h2>
      <ul>${principleRows}</ul>
    </section>
    <section class="checks">
      <h2>Required Cohesion Checks</h2>
      <ul>${checkRows}</ul>
    </section>
    <section class="grid">${cards}</section>
  </main>
</body>
</html>
`;
}

const quickReviews = await readJson(paths.quickReviews);
const approvalRunway = await readJson(paths.approvalRunway);
const reviewDossier = await readJson(paths.reviewDossier);
const planCoverage = await readJson(paths.planCoverage);

if (quickReviews.schema !== 'water9/source-quick-review-index@1') throw new Error(`Unexpected quick review schema ${quickReviews.schema ?? 'missing'}`);
if (approvalRunway.schema !== 'water9/source-approval-runway@1') throw new Error(`Unexpected approval runway schema ${approvalRunway.schema ?? 'missing'}`);
if (reviewDossier.schema !== 'water9/source-review-dossier@1') throw new Error(`Unexpected review dossier schema ${reviewDossier.schema ?? 'missing'}`);
if (planCoverage.schema !== 'water9/content-plan-coverage@1') throw new Error(`Unexpected plan coverage schema ${planCoverage.schema ?? 'missing'}`);

const approvalById = new Map((approvalRunway.items ?? []).map((item) => [item.id, item]));
const dossierById = new Map((reviewDossier.items ?? []).map((item) => [item.id, item]));
const planById = new Map((planCoverage.items ?? []).map((item) => [item.id, item]));

const items = (quickReviews.reviews ?? []).map((review, index) => {
  const approval = approvalById.get(review.id) ?? {};
  const dossier = dossierById.get(review.id) ?? {};
  const plan = planById.get(review.id) ?? {};
  const links = {
    quickReview: review.href,
    source: review.links?.source ?? publicUrl(review.source),
    keyPreview: review.links?.keyPreview ?? null,
    sandboxScreenshot: review.links?.sandboxScreenshot ?? null,
    planPreview: planPreviewUrl(plan.planPreview),
    approvalRunway: '/review/source-approval-runway.html',
    reviewPacket: dossier.reviewPacket?.file ?? null,
  };
  const evidenceComplete = Boolean(
    links.source
    && links.keyPreview
    && links.sandboxScreenshot
    && links.planPreview
    && review.evidence?.imageValidationPassed === true
    && review.evidence?.sourcePreviewPassed === true,
  );
  const readyForCohesionReview = Boolean(review.readyForHumanReview && approval.planPreviewPresent && evidenceComplete);
  const humanCohesionApproved = Boolean(approval.humanApproved || review.evidence?.humanApproved === true || dossier.approved === true);
  const blockers = [
    evidenceComplete ? null : 'review evidence is incomplete',
    readyForCohesionReview ? null : 'candidate is not ready for human cohesion review',
    humanCohesionApproved ? null : 'human source cohesion approval is still missing',
  ].filter(Boolean);
  const acceptCommand = approval.acceptCommand ?? review.acceptCommand;
  return {
    rank: index + 1,
    id: review.id,
    species: review.species,
    reviewStatus: review.reviewStatus,
    readyForCohesionReview,
    evidenceComplete,
    humanCohesionApproved,
    productionEligible: humanCohesionApproved,
    reviewBoundary: humanCohesionApproved
      ? 'Human-approved source: this can move into production rigging checks.'
      : 'Prototype/source preview only: do not treat screenshots or mechanical previews as cohesive accepted content.',
    requiredCohesionChecks: REQUIRED_COHESION_CHECKS.map((check) => check.id),
    evidence: {
      imageValidationPassed: review.evidence?.imageValidationPassed === true,
      sourcePreviewPassed: review.evidence?.sourcePreviewPassed === true,
      planPreviewPresent: approval.planPreviewPresent === true,
      humanApproved: humanCohesionApproved,
    },
    links,
    blockers,
    commands: {
      quickReview: `npm run source:quick-review -- --id ${review.id}`,
      sourceApproval: `npm run source:approval-runway:preview -- --id ${review.id}`,
      sandboxSource: `npm run sandbox:preview -- --id ${review.id} --kind source --serve --open --visual`,
      accept: acceptCommand,
      reject: approval.rejectCommand ?? review.rejectCommand,
    },
  };
});

const report = {
  schema: 'water9/source-cohesion-review@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    quickReviews: paths.quickReviews,
    approvalRunway: paths.approvalRunway,
    reviewDossier: paths.reviewDossier,
    planCoverage: paths.planCoverage,
  },
  policy: {
    prototypeScreenshotsDoNotCount: true,
    automationCannotApproveCohesion: true,
    acceptedThreatRequiresHumanSourceApproval: true,
    sourceApprovalRequiresSpecificVisualNotes: true,
    cohesiveSourceBeforeRigging: true,
    mechanicalRigPreviewCannotSubstituteForArtApproval: true,
  },
  cohesionFirstPrinciples: COHESION_FIRST_PRINCIPLES,
  requiredCohesionChecks: REQUIRED_COHESION_CHECKS,
  summary: {
    candidates: items.length,
    readyForCohesionReview: items.filter((item) => item.readyForCohesionReview && !item.humanCohesionApproved).length,
    humanCohesionApproved: items.filter((item) => item.humanCohesionApproved).length,
    prototypeLocked: items.filter((item) => !item.humanCohesionApproved).length,
    reviewEvidenceComplete: items.filter((item) => item.evidenceComplete).length,
    productionEligible: items.filter((item) => item.productionEligible).length,
  },
  items,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMd, markdownFor(report));
await writeFile(paths.outHtml, htmlFor(report));

console.log(JSON.stringify({
  schema: report.schema,
  candidates: report.summary.candidates,
  readyForCohesionReview: report.summary.readyForCohesionReview,
  humanCohesionApproved: report.summary.humanCohesionApproved,
  prototypeLocked: report.summary.prototypeLocked,
  json: paths.outJson,
  markdown: paths.outMd,
  html: paths.outHtml,
}, null, 2));

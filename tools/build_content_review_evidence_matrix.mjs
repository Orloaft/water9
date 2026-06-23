import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  rigAcceptedStrict,
  sourceApprovedStrict,
  threatAcceptedForContentGate,
} from './content_quality_predicates.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const paths = {
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  sourceReviewDossier: resolve(String(args.get('source-review-dossier') ?? 'public/review/source-candidates/source-review-dossier.json')),
  sourceCohesionReview: resolve(String(args.get('source-cohesion-review') ?? 'public/review/source-candidates/source-cohesion-review.json')),
  sourceQuickReviews: resolve(String(args.get('source-quick-reviews') ?? 'public/review/source-candidates/quick-reviews/index.json')),
  acceptanceRunway: resolve(String(args.get('acceptance-runway') ?? 'public/review/content-acceptance-runway.json')),
  stageBoard: resolve(String(args.get('stage-board') ?? 'public/review/content-stage-board.json')),
  sandboxManifest: resolve(String(args.get('sandbox') ?? 'public/review/sandbox/manifest.json')),
  sandboxVisualReport: resolve(String(args.get('sandbox-visual-report') ?? 'tools/scratch/sandbox-visuals-report.json')),
  runtime: resolve(String(args.get('runtime') ?? 'public/assets/generated/articulated-creatures.parts.json')),
  articulatedReview: resolve(String(args.get('articulated-review') ?? 'public/review/articulated/review-manifest.json')),
  sourceParity: resolve(String(args.get('source-parity') ?? 'tools/scratch/articulated-source-parity.json')),
  visualCohesion: resolve(String(args.get('visual-cohesion') ?? 'tools/scratch/articulated-visual-cohesion.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-review-evidence-matrix.json')),
  outMd: resolve(String(args.get('md-out') ?? 'public/review/content-review-evidence-matrix.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-review-evidence-matrix.html')),
};

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mdEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function boolText(value) {
  return value ? 'yes' : 'no';
}

function runtimeForCandidate(runtimeCreatures, candidate) {
  return runtimeCreatures.find((creature) => creature.quality?.sourceCandidateId === candidate.id)
    ?? runtimeCreatures.find((creature) => candidate.riggedCreatureId && creature.id === candidate.riggedCreatureId)
    ?? runtimeCreatures.find((creature) => creature.id === candidate.id)
    ?? null;
}

function sourceReviewStatus(row) {
  if (!row.sourcePresent) return 'missing-source';
  if (!row.sourcePreviewPassed || !row.sourceImageValidationPassed) return 'source-evidence-incomplete';
  if (!row.sourceApproved) return 'needs-human-source-approval';
  return 'source-approved';
}

function rigReviewStatus(row) {
  if (!row.runtimeRegistered) return 'no-source-mapped-runtime';
  if (!row.mechanicalRigEvidenceComplete) return 'mechanical-rig-evidence-incomplete';
  if (!row.sandboxAllCatalogVisualPassed) return 'sandbox-visual-evidence-missing';
  if (!row.threatAccepted) return 'needs-human-rig-acceptance';
  return 'accepted-threat';
}

function blockersFor(row) {
  const blockers = [];
  if (!row.sourcePresent) blockers.push('source image missing');
  if (row.sourcePresent && !row.sourceImageValidationPassed) blockers.push('source image validation missing/failing');
  if (row.sourcePresent && !row.sourcePreviewPassed) blockers.push('source sandbox preview missing/failing');
  if (row.sourcePresent && !row.sourceApproved) blockers.push('human source approval missing');
  if (row.sourceApproved && !row.runtimeRegistered) blockers.push('source-approved candidate has no mapped runtime');
  if (row.runtimeRegistered && row.sourceParityPassed === false) {
    const metrics = row.sourceParityMetrics ?? {};
    const details = [
      Number.isFinite(metrics.iou) ? `iou ${Number(metrics.iou).toFixed(4)}` : null,
      Number.isFinite(metrics.outside) ? `outside ${Number(metrics.outside).toFixed(4)}` : null,
      Number.isFinite(metrics.missing) ? `missing ${Number(metrics.missing).toFixed(4)}` : null,
    ].filter(Boolean).join(', ');
    blockers.push(`source parity failed${details ? ` (${details})` : ''}`);
  }
  if (row.runtimeRegistered && !row.mechanicalRigEvidenceComplete) blockers.push('mechanical rig evidence incomplete');
  if (row.runtimeRegistered && !row.sandboxAllCatalogVisualPassed) blockers.push('sandbox visual evidence missing/failing');
  if (row.runtimeRegistered && !row.threatAccepted) blockers.push('human rig acceptance missing');
  return blockers;
}

function renderMarkdown(matrix) {
  const rows = matrix.rows.map((row) => `| ${row.rank} | \`${mdEscape(row.id)}\` | ${mdEscape(row.species)} | \`${mdEscape(row.sourceReviewStatus)}\` | \`${mdEscape(row.rigReviewStatus)}\` | ${row.runtimeId ? `\`${mdEscape(row.runtimeId)}\`` : 'none'} | ${boolText(row.mechanicalRigEvidenceComplete)} | ${boolText(row.threatAccepted)} | ${mdEscape(row.nextHumanGate)} |`).join('\n');
  return `# Water 9 Content Review Evidence Matrix

This matrix separates automation evidence from production approval. Automated checks prove only that files, previews, and mechanical rig evidence are present; they do not approve art direction.

## Summary

- Source candidates: ${matrix.summary.sourceCandidates}
- Source images: ${matrix.summary.sourceImages}
- Source approvals: ${matrix.summary.sourceApproved}
- Source-review ready: ${matrix.summary.sourceReviewReady}
- Runtime mapped candidates: ${matrix.summary.runtimeMappedCandidates}
- Unmapped prototype rigs: ${matrix.summary.unmappedPrototypeThreats}
- Mechanically complete mapped rigs: ${matrix.summary.mechanicallyCompleteMappedRigs}
- Human rig approvals: ${matrix.summary.acceptedThreats}
- Strict goal complete: ${matrix.summary.strictGoalComplete}
- Next human gate: ${matrix.summary.nextHumanGate}

## Matrix

| # | Candidate | Species | Source status | Rig status | Runtime | Mechanical rig evidence | Accepted | Next human gate |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
${rows}
`;
}

function renderHtml(matrix) {
  const pills = [
    ['source candidates', matrix.summary.sourceCandidates],
    ['source images', matrix.summary.sourceImages],
    ['source approvals', matrix.summary.sourceApproved],
    ['runtime mapped', matrix.summary.runtimeMappedCandidates],
    ['unmapped prototypes', matrix.summary.unmappedPrototypeThreats],
    ['mechanical mapped rigs', matrix.summary.mechanicallyCompleteMappedRigs],
    ['accepted threats', `${matrix.summary.acceptedThreats}/${matrix.summary.targetThreats}`],
  ].map(([label, value]) => `<span>${htmlEscape(label)} <strong>${htmlEscape(value)}</strong></span>`).join('');
  const cards = matrix.rows.map((row) => `<article class="card" id="${htmlEscape(row.id)}">
    <header>
      <div><h2>${htmlEscape(row.species)}</h2><code>${htmlEscape(row.id)}</code></div>
      <strong>${htmlEscape(row.nextHumanGate)}</strong>
    </header>
    <dl>
      <div><dt>source</dt><dd>${htmlEscape(row.sourceReviewStatus)}</dd></div>
      <div><dt>runtime</dt><dd>${row.runtimeId ? htmlEscape(row.runtimeId) : 'none'}</dd></div>
      <div><dt>rig</dt><dd>${htmlEscape(row.rigReviewStatus)}</dd></div>
      <div><dt>accepted</dt><dd>${boolText(row.threatAccepted)}</dd></div>
    </dl>
    <p>${htmlEscape(row.blockers.join('; ') || 'No blockers recorded.')}</p>
    <div class="links">
      ${row.sourceReviewPacket ? `<a href="${htmlEscape(row.sourceReviewPacket.replace('public/review/', ''))}">source packet</a>` : ''}
      ${row.quickReviewHref ? `<a href="${htmlEscape(row.quickReviewHref.replace('/review/', ''))}">quick review</a>` : ''}
      ${row.sandboxUrl ? `<a href="${htmlEscape(row.sandboxUrl)}">sandbox</a>` : ''}
      ${row.sourceParityDebugImage ? `<a href="${htmlEscape(row.sourceParityDebugImage)}">parity overlay</a>` : ''}
    </div>
    <pre><code>${htmlEscape(row.nextAction ?? 'No next action recorded.')}</code></pre>
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Content Review Evidence Matrix</title>
  <style>
    :root { color-scheme: dark; --bg:#061011; --panel:#0d1a1e; --line:#29454c; --text:#e5f4f5; --muted:#8fa7ac; --accent:#79dcf5; --warn:#f1c36b; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1380px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:30px; }
    h2 { margin:0; font-size:18px; }
    p { color:var(--muted); }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { margin:12px 0 0; padding:10px; border:1px solid var(--line); background:#050b0d; white-space:pre-wrap; overflow:auto; }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    .summary { display:flex; flex-wrap:wrap; gap:8px; margin:18px 0 24px; }
    .summary span { border:1px solid var(--line); background:#09171a; border-radius:5px; padding:7px 9px; color:var(--muted); }
    .summary strong { color:var(--text); margin-left:4px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(360px,1fr)); gap:14px; }
    .card { border:1px solid var(--line); border-radius:7px; background:var(--panel); padding:15px; }
    .card header { display:flex; justify-content:space-between; gap:14px; align-items:flex-start; margin-bottom:12px; }
    .card header strong { color:var(--warn); text-align:right; }
    dl { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin:0 0 10px; }
    dt { color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
    dd { margin:0; overflow-wrap:anywhere; }
    .links { display:flex; flex-wrap:wrap; gap:10px; }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Content Review Evidence Matrix</h1>
    <p>Automation evidence is separated from human approval. This page should make it explicit when a creature is only a prototype.</p>
    <div class="summary">${pills}</div>
    <p>Next human gate: <strong>${htmlEscape(matrix.summary.nextHumanGate)}</strong></p>
    <section class="grid">${cards}</section>
  </main>
</body>
</html>
`;
}

const [
  sourceCandidates,
  sourceReviewDossier,
  sourceCohesionReview,
  sourceQuickReviews,
  acceptanceRunway,
  stageBoard,
  sandboxManifest,
  sandboxVisualReport,
  runtime,
  articulatedReview,
  sourceParity,
  visualCohesion,
] = await Promise.all([
  readJson(paths.sourceCandidates, { candidates: [] }),
  readJson(paths.sourceReviewDossier, { items: [] }),
  readJson(paths.sourceCohesionReview, { items: [] }),
  readJson(paths.sourceQuickReviews, { ids: [], reviews: [] }),
  readJson(paths.acceptanceRunway, { items: [], unmappedPrototypeThreats: [], summary: {} }),
  readJson(paths.stageBoard, { targets: [] }),
  readJson(paths.sandboxManifest, { entries: [] }),
  readJson(paths.sandboxVisualReport, { results: [] }),
  readJson(paths.runtime, { creatures: [] }),
  readJson(paths.articulatedReview, { creatures: [] }),
  readJson(paths.sourceParity, { creatures: [] }),
  readJson(paths.visualCohesion, { creatures: [] }),
]);

const candidates = asArray(sourceCandidates.candidates);
const runtimeCreatures = asArray(runtime.creatures);
const sandboxEntryIds = new Set(asArray(sandboxManifest.entries).map((entry) => entry.id));
const sandboxVisualById = new Map(asArray(sandboxVisualReport.results).map((result) => [result.id, result]));
const sourceReviewById = new Map(asArray(sourceReviewDossier.items).map((item) => [item.id, item]));
const sourceCohesionById = new Map(asArray(sourceCohesionReview.items).map((item) => [item.id, item]));
const quickReviewById = new Map(asArray(sourceQuickReviews.reviews).map((item) => [item.id, item]));
const acceptanceById = new Map(asArray(acceptanceRunway.items).map((item) => [item.id, item]));
const stageById = new Map(asArray(stageBoard.targets).map((item) => [item.id, item]));
const articulatedReviewById = new Map(asArray(articulatedReview.creatures).map((item) => [item.id, item]));
const sourceParityById = new Map(asArray(sourceParity.creatures).map((item) => [item.id, item]));
const visualCohesionById = new Map(asArray(visualCohesion.creatures).map((item) => [item.id, item]));

const mappedRuntimeIds = new Set();
const rows = candidates.map((candidate, index) => {
  const runtimeCreature = runtimeForCandidate(runtimeCreatures, candidate);
  if (runtimeCreature) mappedRuntimeIds.add(runtimeCreature.id);
  const runtimeId = runtimeCreature?.id ?? null;
  const sourceReview = sourceReviewById.get(candidate.id) ?? null;
  const sourceCohesion = sourceCohesionById.get(candidate.id) ?? null;
  const quickReview = quickReviewById.get(candidate.id) ?? null;
  const acceptance = acceptanceById.get(candidate.id) ?? null;
  const stage = stageById.get(candidate.id) ?? null;
  const articulated = runtimeId ? articulatedReviewById.get(runtimeId) : null;
  const parity = runtimeId ? sourceParityById.get(runtimeId) : null;
  const cohesion = runtimeId ? visualCohesionById.get(runtimeId) : null;
  const sandboxVisual = runtimeId ? sandboxVisualById.get(runtimeId) : null;
  const sourcePresent = Boolean(candidate.source);
  const sourceApproved = sourceApprovedStrict(candidate);
  const sourceImageValidationPassed = sourceReview?.evidence?.imageValidationPassed === true;
  const sourcePreviewPassed = sourceReview?.evidence?.sourcePreviewPassed === true;
  const runtimeRegistered = Boolean(runtimeCreature);
  const sourceParityPassed = runtimeRegistered && parity && asArray(parity.failures).length === 0;
  const visualCohesionPassed = runtimeRegistered && cohesion && asArray(cohesion.failures).length === 0 && cohesion.status === 'pass';
  const articulatedReviewPresent = Boolean(articulated);
  const sandboxManifestPresent = runtimeRegistered && sandboxEntryIds.has(runtimeId);
  const sandboxAllCatalogVisualPassed = runtimeRegistered
    && sandboxVisual
    && asArray(sandboxVisual.failures).length === 0
    && asArray(sandboxVisual.states).length > 0;
  const threatAccepted = threatAcceptedForContentGate(candidate, runtimeCreature, articulated);
  const mechanicalRigEvidenceComplete = runtimeRegistered
    && sourceParityPassed
    && visualCohesionPassed
    && articulatedReviewPresent
    && sandboxManifestPresent;
  const row = {
    rank: index + 1,
    id: candidate.id,
    species: candidate.species,
    candidateStatus: candidate.status ?? null,
    stage: stage?.stage ?? acceptance?.stage ?? null,
    sourcePresent,
    sourcePath: candidate.source ?? null,
    sourceImageValidationPassed,
    sourcePreviewPassed,
    sourceReviewReady: sourceReview?.readyForHumanReview === true || sourceReview?.status === 'ready-for-human-review',
    sourceApproved,
    sourceReviewPacket: sourceReview?.reviewPacket?.file ?? null,
    sourceCohesionReady: sourceCohesion?.readyForCohesionReview === true,
    sourceCohesionApproved: sourceCohesion?.humanCohesionApproved === true,
    quickReviewHref: quickReview?.href ?? null,
    runtimeRegistered,
    runtimeId,
    runtimeStatus: runtimeCreature?.quality?.status ?? null,
    runtimeSourceCandidateId: runtimeCreature?.quality?.sourceCandidateId ?? null,
    sourceParityPassed,
    sourceParityMetrics: parity?.metrics ?? null,
    sourceParityFailures: asArray(parity?.failures),
    sourceParityDebugImage: parity?.debugImage ?? null,
    visualCohesionPassed,
    articulatedReviewPresent,
    sandboxManifestPresent,
    sandboxAllCatalogVisualPassed,
    sandboxUrl: articulated?.sandboxUrl ?? acceptance?.sandboxUrl ?? (runtimeId ? `/?sandbox=${runtimeId}` : null),
    mechanicalRigEvidenceComplete,
    threatAccepted,
    acceptancePacket: acceptance?.acceptancePacket?.file ?? null,
    nextAction: acceptance?.nextAction ?? stage?.nextCommands?.[0] ?? null,
  };
  row.sourceReviewStatus = sourceReviewStatus(row);
  row.rigReviewStatus = rigReviewStatus(row);
  row.blockers = blockersFor(row);
  row.nextHumanGate = row.threatAccepted
    ? 'none'
    : !row.sourceApproved
      ? 'human source approval'
      : !row.runtimeRegistered
        ? 'runtime rigging'
        : 'human rig acceptance';
  return row;
});

const unmappedPrototypeThreats = runtimeCreatures
  .filter((creature) => !mappedRuntimeIds.has(creature.id) && creature.quality?.status !== 'accepted')
  .map((creature) => ({
    id: creature.id,
    species: creature.species ?? creature.id,
    status: creature.quality?.status ?? null,
    sourceCandidateId: creature.quality?.sourceCandidateId ?? null,
    sandboxManifestPresent: sandboxEntryIds.has(creature.id),
  }));

const sourceReviewReady = rows.filter((row) => row.sourceReviewStatus === 'needs-human-source-approval').length;
const mechanicallyCompleteMappedRigs = rows.filter((row) => row.mechanicalRigEvidenceComplete).length;
const nextHumanGate = rows.find((row) => row.nextHumanGate !== 'none')?.nextHumanGate ?? 'none';
const matrix = {
  schema: 'water9/content-review-evidence-matrix@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: Object.fromEntries(await Promise.all(Object.entries(paths)
    .filter(([key]) => !key.startsWith('out'))
    .map(async ([key, path]) => [key, await fileSummary(path)]))),
  summary: {
    targetThreats: 20,
    sourceCandidates: rows.length,
    sourceImages: rows.filter((row) => row.sourcePresent).length,
    sourceReviewReady,
    sourceApproved: rows.filter((row) => row.sourceApproved).length,
    sourceCohesionReady: rows.filter((row) => row.sourceCohesionReady).length,
    sourceCohesionApproved: rows.filter((row) => row.sourceCohesionApproved).length,
    runtimeMappedCandidates: rows.filter((row) => row.runtimeRegistered).length,
    unmappedPrototypeThreats: unmappedPrototypeThreats.length,
    mechanicallyCompleteMappedRigs,
    acceptedThreats: rows.filter((row) => row.threatAccepted).length,
    strictGoalComplete: rows.filter((row) => row.threatAccepted).length >= 20,
    nextHumanGate,
  },
  unmappedPrototypeThreats,
  rows,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(matrix, null, 2)}\n`);
await writeFile(paths.outMd, renderMarkdown(matrix));
await writeFile(paths.outHtml, renderHtml(matrix));

console.log(JSON.stringify({
  schema: matrix.schema,
  jsonOut: paths.outJson,
  mdOut: paths.outMd,
  htmlOut: paths.outHtml,
  summary: matrix.summary,
}, null, 2));

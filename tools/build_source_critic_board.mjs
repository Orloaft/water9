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
  dispatch: resolve(String(args.get('dispatch') ?? 'public/review/source-candidates/research-dispatch-board.json')),
  visualBoard: resolve(String(args.get('visual-board') ?? 'public/review/source-visual-board.json')),
  cohesionReview: resolve(String(args.get('cohesion-review') ?? 'public/review/source-candidates/source-cohesion-review.json')),
  criticFindings: resolve(String(args.get('critic-findings') ?? 'public/review/source-candidates/source-critic-findings.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-critic-board.json')),
  outMd: resolve(String(args.get('md-out') ?? 'public/review/source-candidates/source-critic-board.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-critic-board.html')),
};

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readJsonOptional(path, fallback) {
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

function commandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function firstN(values, count) {
  return (Array.isArray(values) ? values : []).filter(Boolean).slice(0, count);
}

function advisoryStateFor(cohesion, finding) {
  if (cohesion?.humanCohesionApproved) return 'human-approved';
  if (finding?.recommendation === 'regenerate') return 'critic-recommends-regenerate';
  if (finding?.recommendation === 'ready-with-caution') return 'ready-with-caution';
  if (finding?.recommendation === 'ready') return 'ready-for-human-consideration';
  return 'needs-human-critique';
}

function approvalAdvice(dispatch, visual, cohesion, finding) {
  const risks = [
    ...firstN(finding?.cohesionRisks, 3),
    ...firstN(dispatch.promptRisks, 2),
    ...firstN(visual?.blockers, 1),
    ...firstN(cohesion?.blockers, 1),
  ].filter(Boolean);
  const checks = [
    ...firstN(visual?.contractReviewChecklist, 3),
    ...firstN(dispatch.requiredRead, 2),
    ...firstN(cohesion?.requiredCohesionChecks, 4).map((check) => `Human must score ${check} at 4-5 with a specific note before source approval.`),
  ].filter(Boolean);
  const animationRisk = firstN(dispatch.motionPhases, 1)[0]
    ? `Verify the rig can express: ${firstN(dispatch.motionPhases, 3).join(' -> ')}.`
    : `Verify crop-safe parts exist for ${firstN(dispatch.articulatableParts, 5).join(', ') || 'the stated attack motion'}.`;
  return {
    advisoryState: advisoryStateFor(cohesion, finding),
    readyForHumanReview: Boolean(cohesion?.readyForCohesionReview && visual?.readyForHumanReview),
    shouldRegenerateIfObserved: risks,
    reviewQuestions: checks,
    animationRisk: finding?.animationRisk ?? animationRisk,
    approvalBoundary: 'Advisory critic output only: this does not approve source art, does not accept a threat, and does not replace human visual review.',
  };
}

function markdownFor(report) {
  const rows = report.items.map((item) => `| ${item.id} | ${item.laneTitle} | ${item.subagentCritique.recommendation} | ${item.advisory.advisoryState} | ${item.advisory.shouldRegenerateIfObserved.length} | ${item.commands.sourcePreview} |`).join('\n');
  return `# Water 9 Source Critic Board

Advisory board for pre-approval critique. This does not approve source art or accept threats.

## Summary

- Candidates: ${report.summary.candidates}
- Lanes: ${report.summary.lanes}
- Ready for human review: ${report.summary.readyForHumanReview}
- Human approved: ${report.summary.humanApproved}
- Advisory-only rows: ${report.summary.advisoryOnly}
- Subagent findings: ${report.summary.subagentFindings}
- Regenerate recommendations: ${report.summary.regenerateRecommendations}
- Ready with caution recommendations: ${report.summary.readyWithCautionRecommendations}
- Ready recommendations: ${report.summary.readyRecommendations}

## Commands

\`\`\`bash
npm run source:critic-board
npm run source:critic-board-check
npm run source:critic-board:serve-smoke
\`\`\`

## Candidates

| Candidate | Lane | Subagent recommendation | Advisory state | Regen risks | Preview |
| --- | --- | --- | --- | ---: | --- |
${rows}
`;
}

function htmlFor(report) {
  const cards = report.items.map((item) => `<article data-source-critic="${htmlEscape(item.id)}">
    <header>
      <div>
        <h2>${htmlEscape(item.species)}</h2>
        <code>${htmlEscape(item.id)}</code>
      </div>
      <strong>${htmlEscape(item.advisory.advisoryState)}</strong>
    </header>
    <p>${htmlEscape(item.laneTitle)} · ${htmlEscape(item.advisory.approvalBoundary)}</p>
    <div class="media">
      ${Object.entries(item.media).map(([label, url]) => url ? `<a href="${htmlEscape(url)}">${htmlEscape(label)}</a>` : '').join('')}
    </div>
    <h3>Regenerate If Observed</h3>
    <ul>${item.advisory.shouldRegenerateIfObserved.map((risk) => `<li>${htmlEscape(risk)}</li>`).join('')}</ul>
    <h3>Subagent Critique</h3>
    <p><strong>${htmlEscape(item.subagentCritique.recommendation)}</strong> · ${htmlEscape(item.subagentCritique.lane)}</p>
    <ul>${item.subagentCritique.cohesionRisks.map((risk) => `<li>${htmlEscape(risk)}</li>`).join('')}</ul>
    <h3>Review Questions</h3>
    <ul>${item.advisory.reviewQuestions.map((question) => `<li>${htmlEscape(question)}</li>`).join('')}</ul>
    <h3>Animation Risk</h3>
    <p>${htmlEscape(item.advisory.animationRisk)}</p>
    <h3>Commands</h3>
    ${commandBlock(Object.values(item.commands))}
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Critic Board</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0d1b20; --line:#29444b; --text:#e6f5f5; --muted:#91a9ae; --accent:#7adff6; --warn:#f0c477; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1320px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:0; font-size:18px; }
    h3 { margin:14px 0 8px; color:var(--muted); font-size:13px; text-transform:uppercase; }
    p { color:var(--muted); }
    article { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:14px; margin:12px 0; }
    article header { display:flex; justify-content:space-between; gap:12px; align-items:start; }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { margin:0; border:1px solid var(--line); background:#050b0d; padding:10px; overflow:auto; white-space:pre-wrap; }
    .summary, .media { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }
    .summary span, .media a { border:1px solid var(--line); background:#09171b; border-radius:5px; padding:7px 9px; color:var(--muted); }
    strong { color:var(--warn); }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Source Critic Board</h1>
    <p>Advisory pre-approval critique board. It records lane-specific risks and review questions; it does not approve source art or accept threats.</p>
    ${commandBlock(['npm run source:critic-board', 'npm run source:critic-board-check', 'npm run source:critic-board:serve-smoke'])}
    <div class="summary">
      <span>candidates <strong>${report.summary.candidates}</strong></span>
      <span>lanes <strong>${report.summary.lanes}</strong></span>
      <span>ready for review <strong>${report.summary.readyForHumanReview}</strong></span>
      <span>human approved <strong>${report.summary.humanApproved}</strong></span>
      <span>regenerate <strong>${report.summary.regenerateRecommendations}</strong></span>
      <span>ready with caution <strong>${report.summary.readyWithCautionRecommendations}</strong></span>
    </div>
    ${cards}
  </main>
</body>
</html>
`;
}

const dispatch = await readJson(paths.dispatch);
const visualBoard = await readJson(paths.visualBoard);
const cohesionReview = await readJson(paths.cohesionReview);
const criticFindings = await readJsonOptional(paths.criticFindings, { schema: 'water9/source-critic-findings@1', items: [] });
if (dispatch.schema !== 'water9/research-dispatch-board@1') throw new Error(`Unexpected dispatch schema ${dispatch.schema ?? 'missing'}`);
if (visualBoard.schema !== 'water9/source-visual-board@1') throw new Error(`Unexpected visual board schema ${visualBoard.schema ?? 'missing'}`);
if (cohesionReview.schema !== 'water9/source-cohesion-review@1') throw new Error(`Unexpected cohesion review schema ${cohesionReview.schema ?? 'missing'}`);
if (criticFindings.schema !== 'water9/source-critic-findings@1') throw new Error(`Unexpected critic findings schema ${criticFindings.schema ?? 'missing'}`);

const visualById = new Map((visualBoard.items ?? []).map((item) => [item.id, item]));
const cohesionById = new Map((cohesionReview.items ?? []).map((item) => [item.id, item]));
const findingById = new Map((criticFindings.items ?? []).map((item) => [item.id, item]));
const items = (dispatch.dispatches ?? []).map((entry) => {
  const visual = visualById.get(entry.id);
  const cohesion = cohesionById.get(entry.id);
  const finding = findingById.get(entry.id);
  const advisory = approvalAdvice(entry, visual, cohesion, finding);
  return {
    id: entry.id,
    species: entry.species,
    lane: entry.lane,
    laneTitle: entry.laneTitle,
    sourceStatus: entry.sourceStatus,
    media: {
      source: visual?.media?.source ?? entry.sourceHref,
      keyPreview: visual?.media?.keyPreview ?? null,
      sandboxScreenshot: visual?.media?.sandboxScreenshot ?? null,
      planPreview: visual?.media?.planPreview ?? null,
      quickReview: cohesion?.links?.quickReview ?? null,
      runtimeSandbox: visual?.links?.runtimeSandbox ?? null,
    },
    evidence: {
      imageValidationPassed: Boolean(cohesion?.evidence?.imageValidationPassed),
      sourcePreviewPassed: Boolean(cohesion?.evidence?.sourcePreviewPassed),
      planPreviewPresent: Boolean(cohesion?.evidence?.planPreviewPresent),
      researchAudited: Boolean(entry.auditFile),
      humanApproved: Boolean(cohesion?.humanCohesionApproved),
    },
    sourceMetrics: visual?.metrics ?? null,
    biologicalAnchors: firstN(entry.biologicalAnchors, 5),
    requiredRead: firstN(entry.requiredRead, 5),
    articulatableParts: firstN(entry.articulatableParts, 8),
    motionPhases: firstN(entry.motionPhases, 6),
    subagentCritique: {
      present: Boolean(finding),
      lane: finding?.lane ?? entry.lane,
      recommendation: finding?.recommendation ?? 'unreviewed',
      cohesionRisks: firstN(finding?.cohesionRisks, 5),
      animationRisk: finding?.animationRisk ?? null,
    },
    advisory,
    commands: {
      rebuild: 'npm run source:critic-board && npm run source:critic-board-check',
      sandboxLab: `npm run sandbox:lab -- --id source-${entry.id} --with diver`,
      sourcePreview: `npm run sandbox:preview -- --id ${entry.id} --kind source --serve --open --visual`,
      quickReview: `npm run source:quick-review -- --id ${entry.id}`,
      sourceApprovalRunway: `npm run source:approval-runway:preview -- --id ${entry.id}`,
    },
  };
});

const laneSet = new Set(items.map((item) => item.lane));
const report = {
  schema: 'water9/source-critic-board@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    dispatch: paths.dispatch,
    visualBoard: paths.visualBoard,
    cohesionReview: paths.cohesionReview,
    criticFindings: paths.criticFindings,
  },
  policy: {
    advisoryOnly: true,
    doesNotApproveSources: true,
    doesNotAcceptThreats: true,
    humanApprovalStillRequired: true,
  },
  summary: {
    candidates: items.length,
    lanes: laneSet.size,
    readyForHumanReview: items.filter((item) => item.advisory.readyForHumanReview).length,
    humanApproved: items.filter((item) => item.evidence.humanApproved).length,
    advisoryOnly: items.filter((item) => item.advisory.approvalBoundary.includes('Advisory')).length,
    subagentFindings: items.filter((item) => item.subagentCritique.present).length,
    regenerateRecommendations: items.filter((item) => item.subagentCritique.recommendation === 'regenerate').length,
    readyWithCautionRecommendations: items.filter((item) => item.subagentCritique.recommendation === 'ready-with-caution').length,
    readyRecommendations: items.filter((item) => item.subagentCritique.recommendation === 'ready').length,
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
  lanes: report.summary.lanes,
  readyForHumanReview: report.summary.readyForHumanReview,
  json: paths.outJson,
  markdown: paths.outMd,
  html: paths.outHtml,
}, null, 2));

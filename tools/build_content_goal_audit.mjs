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
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-goal-audit.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/content-goal-audit.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-goal-audit.html')),
  packageJson: resolve('package.json'),
  sandboxManifest: resolve('public/review/sandbox/manifest.json'),
  contentReadiness: resolve('public/review/content-readiness.json'),
  contentGoalReadiness: resolve('public/review/content-goal-readiness.json'),
  contentStageBoard: resolve('public/review/content-stage-board.json'),
  sourceCandidates: resolve('public/review/source-candidates/source-candidates.json'),
  sourceImageReport: resolve('tools/scratch/source-candidate-images-report.json'),
  sourceReviewSequencer: resolve('public/review/source-candidates/source-review-sequencer.json'),
  sourceRegenerationWorkspace: resolve('public/review/source-candidates/source-regeneration-workspace.json'),
  contentVisualFeedback: resolve('public/review/content-visual-feedback-ledger.json'),
  contentVisualRegeneration: resolve('public/review/content-visual-regeneration-queue.json'),
  researchPack: resolve('public/review/source-candidates/research-subagent-pack.json'),
  researchAudits: resolve('public/review/source-candidates/research-subagent-audits-summary.json'),
  articulatedManifest: resolve('public/assets/generated/articulated-creatures.parts.json'),
};

async function readJson(path, fallback) {
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
  return commands.filter(Boolean).map((command) => `- \`${command}\``);
}

function requirement({ id, title, status, evidence, blockers = [], commands = [] }) {
  return {
    id,
    title,
    status,
    passed: status === 'passed',
    evidence,
    blockers,
    commands: [...new Set(commands.filter(Boolean))],
  };
}

function markdown(report) {
  const lines = [
    '# Water 9 Content Goal Audit',
    '',
    `Generated: \`${report.generatedAt}\``,
    `Goal complete: \`${report.complete}\``,
    `Strict goal complete: \`${report.strictGoalComplete}\``,
    `Accepted threats: \`${report.summary.acceptedThreats}/${report.summary.targetThreats}\``,
    '',
    'This audit maps the active goal to current evidence. Passing preview checks or mechanical image checks is not content acceptance.',
    '',
    '## Requirements',
    '',
    '| Requirement | Status | Evidence | Blockers |',
    '| --- | --- | --- | --- |',
  ];
  for (const item of report.requirements) {
    lines.push(`| ${item.title} | \`${item.status}\` | ${item.evidence.join('<br>')} | ${item.blockers.join('<br>') || 'none'} |`);
  }
  lines.push('', '## Commands', '');
  for (const item of report.requirements) {
    lines.push(`### ${item.title}`, '', ...commandBlock(item.commands), '');
  }
  lines.push(
    '## Hard Stop',
    '',
    report.hardStop,
    '',
    '```bash',
    'npm run content:goal-audit',
    'npm run content:goal-audit-check',
    'npm run content:goal-readiness-strict',
    'npm run content:gate',
    '```',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function html(report) {
  const rows = report.requirements.map((item) => `
    <section class="card" data-goal-audit-requirement="${htmlEscape(item.id)}">
      <header><h2>${htmlEscape(item.title)}</h2><strong class="${htmlEscape(item.status)}">${htmlEscape(item.status)}</strong></header>
      <h3>Evidence</h3>
      <ul>${item.evidence.map((entry) => `<li>${htmlEscape(entry)}</li>`).join('')}</ul>
      <h3>Blockers</h3>
      <ul>${(item.blockers.length ? item.blockers : ['none']).map((entry) => `<li>${htmlEscape(entry)}</li>`).join('')}</ul>
      <h3>Commands</h3>
      <pre>${htmlEscape(item.commands.join('\n'))}</pre>
    </section>
  `).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Content Goal Audit</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, system-ui, sans-serif; background: #061115; color: #d8ecec; }
    body { margin: 0; padding: 28px; }
    main { max-width: 1120px; margin: 0 auto; }
    h1 { margin: 0 0 8px; font-size: clamp(2rem, 5vw, 4.8rem); letter-spacing: 0; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin: 22px 0; }
    .summary div, .card { border: 1px solid #24464c; background: #0b1d22; border-radius: 6px; padding: 14px; }
    .card { margin: 12px 0; }
    .card header { display: flex; justify-content: space-between; gap: 16px; align-items: center; }
    h2 { margin: 0; font-size: 1.05rem; }
    h3 { margin: 14px 0 8px; font-size: .78rem; text-transform: uppercase; color: #91b8bd; }
    strong { color: #f0fbfb; }
    strong.passed { color: #78f0b2; }
    strong.partial { color: #ffd36c; }
    strong.incomplete { color: #ff8f8f; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #041012; border: 1px solid #1b393f; padding: 10px; border-radius: 6px; }
    li { margin: 5px 0; }
  </style>
</head>
<body>
  <main data-content-goal-audit data-content-goal-complete="${report.complete}" data-accepted-threats="${report.summary.acceptedThreats}">
    <h1>Water 9 Content Goal Audit</h1>
    <p>This audit maps the active goal to current evidence. Passing preview checks or mechanical image checks is not content acceptance.</p>
    <div class="summary">
      <div><span>goal complete</span><br><strong>${htmlEscape(report.complete)}</strong></div>
      <div><span>strict goal complete</span><br><strong>${htmlEscape(report.strictGoalComplete)}</strong></div>
      <div><span>accepted threats</span><br><strong>${report.summary.acceptedThreats}/${report.summary.targetThreats}</strong></div>
      <div><span>source approval ready</span><br><strong>${report.summary.sourceApprovalReady}</strong></div>
      <div><span>critic regeneration required</span><br><strong>${report.summary.sourceCriticRegenerationRequired}</strong></div>
    </div>
    ${rows}
    <section class="card">
      <header><h2>Hard Stop</h2><strong class="incomplete">enforced</strong></header>
      <p>${htmlEscape(report.hardStop)}</p>
    </section>
  </main>
</body>
</html>
`;
}

const packageJson = await readJson(paths.packageJson, { scripts: {} });
const sandboxManifest = await readJson(paths.sandboxManifest, { entries: [] });
const contentReadiness = await readJson(paths.contentReadiness, { summary: {} });
const contentGoalReadiness = await readJson(paths.contentGoalReadiness, { strictGoalComplete: false, sourceReview: {} });
const contentStageBoard = await readJson(paths.contentStageBoard, { summary: {}, targets: [] });
const sourceCandidates = await readJson(paths.sourceCandidates, { candidates: [] });
const sourceImageReport = await readJson(paths.sourceImageReport, { checkedImages: 0, failures: [] });
const sourceReviewSequencer = await readJson(paths.sourceReviewSequencer, { summary: {} });
const sourceRegenerationWorkspace = await readJson(paths.sourceRegenerationWorkspace, { target: {} });
const contentVisualFeedback = await readJson(paths.contentVisualFeedback, { summary: {}, items: [] });
const contentVisualRegeneration = await readJson(paths.contentVisualRegeneration, { summary: {}, items: [] });
const researchPack = await readJson(paths.researchPack, { assignments: [] });
const researchAudits = await readJson(paths.researchAudits, { auditedCandidates: [], failures: [] });
const articulatedManifest = await readJson(paths.articulatedManifest, { creatures: [] });

const targetThreats = contentReadiness.summary?.targetThreats ?? contentStageBoard.summary?.targetThreats ?? 20;
const acceptedThreats = contentReadiness.summary?.acceptedThreats ?? contentStageBoard.summary?.acceptedThreats ?? 0;
const sandboxEntries = sandboxManifest.entries ?? [];
const sandboxById = new Map(sandboxEntries.map((entry) => [entry.id, entry]));
const sourceCount = (sourceCandidates.candidates ?? []).filter((candidate) => candidate.source).length;
const sourceEntries = sandboxEntries.filter((entry) => entry.kind === 'source').length;
const runtimeTargets = (contentStageBoard.targets ?? []).filter((target) => target.rigId || target.id).length;
const assignments = researchPack.assignments ?? [];
const auditedCandidates = researchAudits.auditedCandidates ?? [];
const sourceApprovalReady = contentReadiness.summary?.sourceApprovalReady ?? sourceReviewSequencer.summary?.approvalReady ?? 0;
const sourceCriticRegenerationRequired = contentReadiness.summary?.sourceCriticRegenerationRequired ?? sourceReviewSequencer.summary?.criticRegenerationRequired ?? 0;
const strictGoalComplete = Boolean(contentGoalReadiness.strictGoalComplete);
const packageScripts = packageJson.scripts ?? {};
const visualFeedbackItems = contentVisualFeedback.items ?? [];
const visualFeedbackBlockingItems = visualFeedbackItems.filter((item) => item.severity === 'blocking' || String(item.status ?? '').includes('rejected')).length;
const visualRegenerationItems = contentVisualRegeneration.items ?? [];
const visualRegenerationBlockingItems = visualRegenerationItems.filter((item) => item.severity === 'blocking' || String(item.status ?? '').includes('rejected')).length;
const visualRegenerationGateCredit = contentVisualRegeneration.summary?.countsTowardStrictGate ?? visualRegenerationItems.filter((item) => item.countsTowardStrictGate).length;
const rejectedFeedbackIds = new Set(visualFeedbackItems.filter((item) => String(item.status ?? '').includes('rejected')).map((item) => item.targetId));
const regenerationIds = new Set(visualRegenerationItems.map((item) => item.targetId));
const rejectedFeedbackWithoutRegeneration = [...rejectedFeedbackIds].filter((id) => !regenerationIds.has(id));

const requirements = [
  requirement({
    id: 'quick-sandbox-preview',
    title: 'Quick sandbox preview for any entity',
    status: sandboxById.has('diver') && sandboxById.has('abyssal-gulper') && sourceEntries >= targetThreats && String(packageScripts['content:goal-preview-smoke'] ?? '').includes('sandbox:visual:paired:targets:quick') ? 'passed' : 'partial',
    evidence: [
      `sandbox manifest entries: ${sandboxEntries.length}`,
      `diver entry: ${sandboxById.has('diver')}`,
      `abyssal-gulper entry: ${sandboxById.has('abyssal-gulper')}`,
      `source preview entries: ${sourceEntries}`,
      `goal preview smoke uses quick paired target preview: ${String(packageScripts['content:goal-preview-smoke'] ?? '').includes('sandbox:visual:paired:targets:quick')}`,
    ],
    blockers: sandboxById.has('diver') && sandboxById.has('abyssal-gulper') ? [] : ['sandbox manifest must include diver and abyssal-gulper'],
    commands: [
      'npm run sandbox:preview -- --id abyssal-gulper --with diver --serve --open --visual',
      'npm run sandbox:lab -- --id abyssal-gulper --with diver',
      'npm run sandbox:visual:paired:targets:quick',
      'npm run content:goal-preview-smoke',
    ],
  }),
  requirement({
    id: 'subagent-research',
    title: 'Subagent research coverage for underwater fauna and flora',
    status: assignments.length >= 3 && auditedCandidates.length >= targetThreats && (researchAudits.failures ?? []).length === 0 ? 'passed' : 'partial',
    evidence: [
      `research assignments: ${assignments.length}`,
      `audited candidates: ${auditedCandidates.length}`,
      `audit failures: ${(researchAudits.failures ?? []).length}`,
    ],
    blockers: auditedCandidates.length >= targetThreats ? [] : [`${targetThreats - auditedCandidates.length} candidates still need subagent audit coverage`],
    commands: [
      'npm run research:subagent-pack',
      'npm run research:dispatch',
      'npm run research:audits',
      'npm run research:regeneration-handoff',
    ],
  }),
  requirement({
    id: 'imagen-magenta-source',
    title: 'Imagen/OpenAI source generation and magenta-key intake',
    status: sourceCount >= targetThreats && (sourceImageReport.failures ?? []).length === 0 && sourceCriticRegenerationRequired === 0 ? 'passed' : 'partial',
    evidence: [
      `source images present: ${sourceCount}/${targetThreats}`,
      `mechanically checked source images: ${sourceImageReport.checkedImages ?? sourceImageReport.metrics?.length ?? 0}`,
      `source image validation failures: ${(sourceImageReport.failures ?? []).length}`,
      `critic regeneration required: ${sourceCriticRegenerationRequired}`,
      `current regeneration target: ${sourceRegenerationWorkspace.target?.id ?? 'none'}`,
      `current replacement distinct-ready: ${Boolean(sourceRegenerationWorkspace.target?.distinctReplacementReady)}`,
    ],
    blockers: sourceCriticRegenerationRequired > 0
      ? [`${sourceCriticRegenerationRequired} source images require critic regeneration before human approval`]
      : [],
    commands: [
      'npm run source:generate-openai -- --id <candidate-id> --queue public/review/source-candidates/source-critic-regeneration-queue.json --overwrite',
      'npm run source:inbox-capture -- --id <candidate-id> --open',
      'npm run source:regeneration-workspace',
      'npm run source:regeneration-workspace-check',
      'python3 tools/validate_source_candidate_images.py --report tools/scratch/source-candidate-images-report.json',
    ],
  }),
  requirement({
    id: 'magenta-to-articulation',
    title: 'Magenta extraction into articulated in-game entities',
    status: runtimeTargets >= targetThreats && (articulatedManifest.creatures ?? []).length >= targetThreats && acceptedThreats >= targetThreats ? 'passed' : 'partial',
    evidence: [
      `stage-board runtime targets: ${runtimeTargets}/${targetThreats}`,
      `articulated manifest creatures: ${(articulatedManifest.creatures ?? []).length}`,
      `prototype creatures: ${(articulatedManifest.creatures ?? []).filter((creature) => creature?.quality?.status === 'prototype').length}`,
      `accepted threats: ${acceptedThreats}/${targetThreats}`,
    ],
    blockers: acceptedThreats >= targetThreats ? [] : [`${targetThreats - acceptedThreats} articulated threats still need strict human acceptance`],
    commands: [
      'npm run articulated:source-parity',
      'npm run articulated:visual-cohesion',
      'npm run content:acceptance-audit -- --id <runtime-id>',
      'npm run content:review-session',
    ],
  }),
  requirement({
    id: 'visual-rejection-regeneration',
    title: 'Rejected preview art is quarantined and routed to regeneration',
    status: visualFeedbackBlockingItems > 0 && rejectedFeedbackWithoutRegeneration.length === 0 && visualRegenerationGateCredit === 0 ? 'passed' : 'partial',
    evidence: [
      `visual feedback items: ${visualFeedbackItems.length}`,
      `blocking visual feedback items: ${visualFeedbackBlockingItems}`,
      `visual regeneration items: ${visualRegenerationItems.length}`,
      `visual regeneration blocking items: ${visualRegenerationBlockingItems}`,
      `regeneration strict gate credit: ${visualRegenerationGateCredit}`,
      `rejected feedback missing regeneration route: ${rejectedFeedbackWithoutRegeneration.length}`,
    ],
    blockers: [
      ...(visualFeedbackBlockingItems > 0 ? [] : ['no blocking visual feedback has been captured yet']),
      ...rejectedFeedbackWithoutRegeneration.map((id) => `${id} has rejected visual feedback but no regeneration queue item`),
      ...(visualRegenerationGateCredit === 0 ? [] : ['visual regeneration prototypes must not count toward the strict gate']),
    ],
    commands: [
      'npm run content:visual-feedback',
      'npm run content:visual-feedback-check',
      'npm run content:visual-regeneration',
      'npm run content:visual-regeneration-check',
      'npm run content:visual-regeneration:serve-smoke',
    ],
  }),
  requirement({
    id: 'rigorous-20-threat-gate',
    title: '20 new underwater threats pass rigorous quality gate',
    status: strictGoalComplete && acceptedThreats >= targetThreats ? 'passed' : 'incomplete',
    evidence: [
      `strict goal complete: ${strictGoalComplete}`,
      `accepted threats: ${acceptedThreats}/${targetThreats}`,
      `source approval-ready: ${sourceApprovalReady}`,
      `source critic regeneration required: ${sourceCriticRegenerationRequired}`,
      `source sequencer next lane: ${sourceReviewSequencer.summary?.nextLane ?? 'none'}`,
    ],
    blockers: strictGoalComplete && acceptedThreats >= targetThreats
      ? []
      : [
          `${targetThreats - acceptedThreats} threats still do not count toward the goal`,
          `${targetThreats - (contentReadiness.summary?.approvedSources ?? 0)} source images still need human approval`,
        ],
    commands: [
      'npm run content:goal-readiness-strict',
      'npm run content:gate',
      'npm run content:review-session',
      'npm run content:production-proof',
    ],
  }),
];

const complete = requirements.every((item) => item.status === 'passed') && strictGoalComplete && acceptedThreats >= targetThreats;
const report = {
  schema: 'water9/content-goal-audit@1',
  generatedAt: new Date().toISOString(),
  complete,
  strictGoalComplete,
  summary: {
    targetThreats,
    acceptedThreats,
    sandboxEntries: sandboxEntries.length,
    sourceEntries,
    sourceImages: sourceCount,
    sourceApprovalReady,
    sourceCriticRegenerationRequired,
    researchAssignments: assignments.length,
    auditedCandidates: auditedCandidates.length,
    runtimeTargets,
    articulatedCreatures: (articulatedManifest.creatures ?? []).length,
    visualFeedbackItems: visualFeedbackItems.length,
    visualFeedbackBlockingItems,
    visualRegenerationItems: visualRegenerationItems.length,
    visualRegenerationBlockingItems,
    visualRegenerationGateCredit,
    rejectedFeedbackWithoutRegeneration: rejectedFeedbackWithoutRegeneration.length,
  },
  hardStop: complete
    ? 'The strict 20-threat content goal is complete.'
    : 'Do not mark the goal complete: preview/research/source/rigging infrastructure exists, but strict human source approval and threat acceptance are not complete.',
  requirements,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdown(report));
await writeFile(paths.outHtml, html(report));

console.log(JSON.stringify({
  schema: report.schema,
  complete,
  strictGoalComplete,
  acceptedThreats,
  targetThreats,
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
}, null, 2));

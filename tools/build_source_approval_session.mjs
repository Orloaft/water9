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
  approvalRunway: resolve(String(args.get('approval-runway') ?? 'public/review/source-approval-runway.json')),
  cohesionDecisions: resolve(String(args.get('cohesion-decisions') ?? 'public/review/source-candidates/source-cohesion-decision-template.json')),
  nextReview: resolve(String(args.get('next-review') ?? 'public/review/source-candidates/source-next-review.json')),
  visualBoard: resolve(String(args.get('visual-board') ?? 'public/review/source-visual-board.json')),
  goalReadiness: resolve(String(args.get('goal-readiness') ?? 'public/review/content-goal-readiness.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-approval-session.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/source-candidates/source-approval-session.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-approval-session.html')),
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

function commandBlock(commands) {
  return commands.filter(Boolean).map((command) => `- \`${command}\``);
}

function htmlCommandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function publicHref(path) {
  if (!path) return null;
  if (path.startsWith('/')) return path;
  if (path.startsWith('public/')) return `/${path.slice('public/'.length)}`;
  return path;
}

function firstReadyItem(approvalRunway) {
  return (approvalRunway.items ?? []).find((item) => item.readyForHumanReview && !item.humanApproved) ?? null;
}

function buildReport({ approvalRunway, cohesionDecisions, nextReview, visualBoard, goalReadiness }) {
  const readyItems = (approvalRunway.items ?? []).filter((item) => item.readyForHumanReview && !item.humanApproved);
  const approvedItems = (approvalRunway.items ?? []).filter((item) => item.humanApproved);
  const blockedItems = (approvalRunway.items ?? []).filter((item) => !item.readyForHumanReview && !item.humanApproved);
  const templateDecisions = cohesionDecisions.decisionFileTemplate?.decisions ?? [];
  const target = firstReadyItem(approvalRunway);
  const targetDecision = templateDecisions.find((decision) => decision.id === target?.id) ?? null;
  const requiredChecks = cohesionDecisions.requiredCohesionChecks ?? [];
  const outputFile = 'water9-source-cohesion-reviewed-decisions.json';
  const strictApplyCommand = `npm run source:cohesion-decisions-apply -- --decisions ${outputFile} --strict`;
  const strictApplyCommandWithApply = `${strictApplyCommand} --apply`;
  const commands = {
    rebuildEvidence: 'npm run source:approval-session && npm run source:approval-session-check',
    openWorkbench: 'npm run source:approval-session:serve-smoke',
    focusedNextReview: 'npm run source:next-review && npm run source:next-review-check && npm run source:next-review:serve-smoke',
    focusedDecisionDraft: 'npm run source:next-decision-draft && npm run source:next-decision-draft-check && npm run source:next-decision-draft:serve-smoke',
    buildDecisionWorkspace: 'npm run source:cohesion-decisions && npm run source:cohesion-decisions-check',
    previewNextSource: target?.id ? `npm run sandbox:preview -- --id source-${target.id} --with diver --serve --open --visual` : null,
    previewNextRuntime: target?.id ? `npm run sandbox:preview -- --id ${target.id} --with diver --serve --open --visual` : null,
    strictApply: strictApplyCommand,
    strictApplyWithApply: strictApplyCommandWithApply,
  };
  const reviewSteps = [
    {
      id: 'open-session',
      title: 'Open this session',
      command: commands.openWorkbench,
      evidence: '/review/source-candidates/source-approval-session.html',
    },
    {
      id: 'review-focused-target',
      title: 'Review the focused next target',
      command: commands.focusedNextReview,
      evidence: '/review/source-candidates/source-next-review.html',
    },
    {
      id: 'prepare-focused-decision-draft',
      title: 'Prepare the focused decision draft',
      command: commands.focusedDecisionDraft,
      evidence: '/review/source-candidates/source-next-decision-draft.html',
    },
    {
      id: 'review-evidence',
      title: 'Inspect source evidence',
      command: commands.buildDecisionWorkspace,
      evidence: '/review/source-candidates/source-cohesion-decision-template.html',
    },
    {
      id: 'fill-decisions',
      title: 'Fill reviewer-authored decisions',
      command: null,
      evidence: outputFile,
    },
    {
      id: 'strict-dry-run',
      title: 'Run strict apply dry-run',
      command: strictApplyCommand,
      evidence: 'public/review/source-candidates/source-cohesion-decision-run-report.json',
    },
    {
      id: 'apply-reviewed-decisions',
      title: 'Apply only after dry-run succeeds',
      command: strictApplyCommandWithApply,
      evidence: 'source candidate approval metadata',
    },
  ];
  return {
    schema: 'water9/source-approval-session@1',
    generatedAt: new Date().toISOString(),
    generatedFrom: {
      approvalRunway: paths.approvalRunway,
      cohesionDecisions: paths.cohesionDecisions,
      nextReview: paths.nextReview,
      visualBoard: paths.visualBoard,
      goalReadiness: paths.goalReadiness,
    },
    policy: {
      humanAuthoredDecisionsRequired: true,
      automationCannotApproveSourceArt: true,
      wrapsExistingStrictApplyGate: true,
      keepsAcceptSourceCandidateAsFinalGate: true,
    },
    summary: {
      candidates: approvalRunway.summary?.candidates ?? 0,
      readyForHumanReview: readyItems.length,
      humanApproved: approvedItems.length,
      blockedBeforeHumanReview: blockedItems.length,
      requiredChecks: requiredChecks.length,
      templateDecisions: templateDecisions.length,
      nextTarget: target?.id ?? nextReview.target?.id ?? null,
      nextTargetSpecies: target?.species ?? nextReview.target?.species ?? null,
      strictGoalComplete: Boolean(goalReadiness.strictGoalComplete),
      goalNextStage: goalReadiness.nextAction?.stage ?? null,
    },
    links: {
      approvalSession: '/review/source-candidates/source-approval-session.html',
      decisionWorkspace: '/review/source-candidates/source-cohesion-decision-template.html',
      approvalRunway: '/review/source-approval-runway.html',
      visualBoard: '/review/source-visual-board.html',
      nextReview: '/review/source-candidates/source-next-review.html',
      nextDecisionDraft: '/review/source-candidates/source-next-decision-draft.html',
      goalReadiness: '/review/content-goal-readiness.md',
    },
    commands,
    reviewSteps,
    nextTarget: target ? {
      id: target.id,
      species: target.species,
      links: {
        source: target.links?.source ?? null,
        keyPreview: target.links?.keyPreview ?? null,
        sandboxScreenshot: target.links?.sandboxScreenshot ?? null,
        planPreview: target.links?.planPreview ?? null,
        quickReview: target.links?.quickReview ?? null,
        focusedNextReview: '/review/source-candidates/source-next-review.html',
        focusedDecisionDraft: '/review/source-candidates/source-next-decision-draft.html',
        liveSourceSandbox: target.links?.sourceSandboxLive ?? `/?entity=source-${target.id}&companion=diver`,
        liveRuntimeSandbox: target.links?.runtimeSandboxLive ?? `/?sandbox=${target.id}&companion=diver`,
      },
      commands: {
        quickReview: target.commands?.quickReview ?? null,
        sourcePreview: commands.previewNextSource,
        runtimePreview: commands.previewNextRuntime,
        focusedNextReview: commands.focusedNextReview,
        focusedDecisionDraft: commands.focusedDecisionDraft,
      },
      evidenceFingerprintDigest: targetDecision?.evidenceFingerprint?.digest ?? null,
    } : null,
    decisionOutput: {
      filename: outputFile,
      schema: 'water9/source-cohesion-decisions@1',
      sourceTemplate: publicHref('public/review/source-candidates/source-cohesion-decision-template.json'),
      requiredChecks,
      strictApplyCommand,
      strictApplyCommandWithApply,
    },
  };
}

function markdown(report) {
  const lines = [
    '# Water 9 Source Approval Session',
    '',
    `Generated: \`${report.generatedAt}\``,
    '',
    'First-class wrapper for the human source approval bottleneck. This page does not approve source art; it points reviewers into the existing batch decision workspace and the existing strict apply gate.',
    '',
    '## Summary',
    '',
    `- Candidates: ${report.summary.candidates}`,
    `- Ready for human review: ${report.summary.readyForHumanReview}`,
    `- Human approved: ${report.summary.humanApproved}`,
    `- Blocked before human review: ${report.summary.blockedBeforeHumanReview}`,
    `- Required checks per approved source: ${report.summary.requiredChecks}`,
    `- Next target: ${report.summary.nextTargetSpecies ?? 'none'} (${report.summary.nextTarget ?? 'none'})`,
    '',
    '## Policy',
    '',
    '- Decisions must be human-authored.',
    '- Automation cannot approve source art.',
    '- This session wraps the existing strict apply gate.',
    '- `tools/accept_source_candidate.mjs` remains the final source approval enforcement point.',
    '',
    '## Review Steps',
    '',
  ];
  for (const step of report.reviewSteps) {
    lines.push(`### ${step.title}`, '', `- Evidence: \`${step.evidence}\``, ...(step.command ? [`- Command: \`${step.command}\``] : []), '');
  }
  lines.push(
    '## Commands',
    '',
    ...commandBlock(Object.values(report.commands)),
    '',
    '## Decision Output',
    '',
    `- File: \`${report.decisionOutput.filename}\``,
    `- Schema: \`${report.decisionOutput.schema}\``,
    `- Strict dry-run: \`${report.decisionOutput.strictApplyCommand}\``,
    `- Strict apply: \`${report.decisionOutput.strictApplyCommandWithApply}\``,
    '',
  );
  return `${lines.join('\n')}\n`;
}

function imageTile(label, href) {
  if (!href) return `<div class="tile missing"><span>${htmlEscape(label)}</span><strong>missing</strong></div>`;
  return `<a class="tile" href="${htmlEscape(href)}"><img src="${htmlEscape(href)}" alt="${htmlEscape(label)}"><span>${htmlEscape(label)}</span></a>`;
}

function html(report) {
  const target = report.nextTarget;
  const stepCards = report.reviewSteps.map((step) => `<article class="card" data-source-approval-step="${htmlEscape(step.id)}">
      <h2>${htmlEscape(step.title)}</h2>
      <p>${htmlEscape(step.evidence)}</p>
      ${step.command ? htmlCommandBlock([step.command]) : ''}
    </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Approval Session</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, system-ui, sans-serif; background:#061115; color:#dceeee; }
    * { box-sizing:border-box; }
    body { margin:0; }
    main { max-width:1280px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4rem); letter-spacing:0; }
    h2 { margin:0 0 8px; font-size:1.05rem; }
    p { color:#99b9bd; }
    a { color:#79daf0; text-decoration:none; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { margin:0; white-space:pre-wrap; overflow-wrap:anywhere; border:1px solid #24464c; border-radius:6px; background:#041012; padding:10px; }
    .summary, .links, .commands { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:10px; margin:18px 0; }
    .summary span, .card, .policy { border:1px solid #24464c; background:#0b1d22; border-radius:6px; padding:14px; }
    .summary strong { display:block; font-size:1.4rem; color:#f5ffff; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:12px; margin:18px 0; }
    .tile { border:1px solid #24464c; background:#041012; border-radius:6px; overflow:hidden; min-height:160px; }
    .tile img { display:block; width:100%; aspect-ratio:16/10; object-fit:contain; background:#020607; }
    .tile span, .tile strong { display:block; padding:8px 10px; color:#99b9bd; }
    .missing { display:grid; place-items:center; }
    .steps { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:12px; }
    .warning { color:#ffd27a; }
  </style>
</head>
<body>
  <main data-source-approval-session data-next-target="${htmlEscape(report.summary.nextTarget ?? '')}">
    <h1>Water 9 Source Approval Session</h1>
    <p>Reviewer-facing wrapper for the approval-ready source queue. It preserves the human approval boundary and routes completed decisions through the strict apply command.</p>
    <div class="summary">
      <span>ready<strong>${report.summary.readyForHumanReview}</strong></span>
      <span>approved<strong>${report.summary.humanApproved}</strong></span>
      <span>blocked<strong>${report.summary.blockedBeforeHumanReview}</strong></span>
      <span>checks each<strong>${report.summary.requiredChecks}</strong></span>
    </div>
    <section class="policy">
      <h2>Policy</h2>
      <p class="warning">This page does not approve content automatically. A human reviewer must inspect evidence, author the decision file, run the strict dry-run, then explicitly apply reviewed decisions.</p>
      ${htmlCommandBlock([report.commands.buildDecisionWorkspace, report.commands.strictApply, report.commands.strictApplyWithApply])}
    </section>
    ${target ? `<section class="policy">
      <h2>Next Target: ${htmlEscape(target.species)}</h2>
      <p><code>${htmlEscape(target.id)}</code> · evidence fingerprint <code>${htmlEscape(target.evidenceFingerprintDigest ?? 'missing')}</code></p>
      <div class="grid">
        ${imageTile('source', target.links.source)}
        ${imageTile('magenta key', target.links.keyPreview)}
        ${imageTile('sandbox screenshot', target.links.sandboxScreenshot)}
        ${imageTile('plan preview', target.links.planPreview)}
      </div>
      <div class="links">
        <a href="${htmlEscape(target.links.quickReview ?? '#')}">quick review</a>
        <a href="${htmlEscape(target.links.focusedNextReview ?? report.links.nextReview)}">focused next review</a>
        <a href="${htmlEscape(target.links.focusedDecisionDraft ?? report.links.nextDecisionDraft)}">focused decision draft</a>
        <a href="${htmlEscape(target.links.liveSourceSandbox ?? '#')}">live source sandbox</a>
        <a href="${htmlEscape(target.links.liveRuntimeSandbox ?? '#')}">live runtime sandbox</a>
        <a href="${htmlEscape(report.links.decisionWorkspace)}">batch decision workspace</a>
      </div>
    </section>` : ''}
    <section>
      <h2>Review Steps</h2>
      <div class="steps">${stepCards}</div>
    </section>
  </main>
</body>
</html>
`;
}

const approvalRunway = await readJson(paths.approvalRunway, { summary: {}, items: [] });
const cohesionDecisions = await readJson(paths.cohesionDecisions, { summary: {}, decisionFileTemplate: {}, decisions: [] });
const nextReview = await readJson(paths.nextReview, { summary: {}, target: null });
const visualBoard = await readJson(paths.visualBoard, { summary: {}, items: [] });
const goalReadiness = await readJson(paths.goalReadiness, { strictGoalComplete: false, nextAction: {} });

const report = buildReport({ approvalRunway, cohesionDecisions, nextReview, visualBoard, goalReadiness });

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdown(report));
await writeFile(paths.outHtml, html(report));

console.log(JSON.stringify({
  schema: report.schema,
  readyForHumanReview: report.summary.readyForHumanReview,
  humanApproved: report.summary.humanApproved,
  nextTarget: report.summary.nextTarget,
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
}, null, 2));

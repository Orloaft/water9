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
  decisionTemplate: resolve(String(args.get('decision-template') ?? 'public/review/source-candidates/source-cohesion-decision-template.json')),
  cohortBoard: resolve(String(args.get('cohort-board') ?? 'public/review/content-cohort-cohesion-board.json')),
  visualBoard: resolve(String(args.get('visual-board') ?? 'public/review/source-visual-board.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-approval-marathon.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/source-candidates/source-approval-marathon.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-approval-marathon.html')),
};

const riskWeight = new Map([
  ['high', 0],
  ['medium', 1],
  ['low', 2],
  ['clear', 3],
  ['unknown', 4],
]);

const reviewMediaTiles = [
  ['source', 'source art'],
  ['keyPreview', 'magenta key'],
  ['sandboxScreenshot', 'source sandbox'],
  ['planPreview', 'plan preview'],
  ['sourceParity', 'source parity'],
  ['contactSheet', 'contact sheet'],
  ['phaseStrip', 'phase strip'],
  ['sandboxIdle', 'sandbox idle'],
  ['sandboxLunge', 'sandbox lunge'],
  ['sandboxStunned', 'sandbox stunned'],
];

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

function publicHref(path) {
  const text = String(path ?? '');
  if (!text) return null;
  if (text.startsWith('/')) return text;
  return text.startsWith('public/') ? `/${text.slice('public/'.length)}` : text;
}

function shortDigest(value) {
  const text = String(value ?? '');
  return text ? text.slice(0, 12) : 'missing';
}

function cloneDecision(decision) {
  return JSON.parse(JSON.stringify(decision));
}

function singleDecisionFile(template, decision) {
  const copied = cloneDecision(decision);
  copied.reviewer = '<human-reviewer>';
  copied.reviewedAt = '<ISO-8601 timestamp>';
  copied.status = 'needs-review';
  copied.overallNote = '';
  copied.failedChecks = [];
  for (const check of Object.keys(copied.visualChecks ?? {})) {
    copied.visualChecks[check].score = null;
    copied.visualChecks[check].note = '';
  }
  return {
    schema: template.decisionFileTemplate?.schema ?? 'water9/source-cohesion-decisions@1',
    reviewer: '<human-reviewer>',
    reviewedAt: '<ISO-8601 timestamp>',
    policy: template.decisionFileTemplate?.policy ?? {
      humanAuthored: true,
      automationCannotApproveCohesion: true,
      inspectSourceKeySandboxAndPlan: true,
    },
    instructions: [
      'This one-candidate starter is not approval evidence until edited by a human reviewer.',
      'Approve only after inspecting source art, magenta key preview, source sandbox preview, articulation plan preview, cohort risk flags, and runtime context.',
      'Approval requires status approved, an overall note, and score 4-5 plus specific evidence notes for every visual check.',
      'Rejection requires status rejected, failedChecks, and evidence notes explaining the failed checks.',
      'Run the strict apply command against the edited reviewed-only decision file.',
    ],
    decisions: [copied],
  };
}

function mediaFrom(runwayItem, cohortItem) {
  const sourceMedia = new Map((cohortItem?.sourceMedia ?? []).map((item) => [item.label, item]));
  const runtimeMedia = new Map((cohortItem?.runtimeMedia ?? []).map((item) => [item.label, item]));
  return {
    source: runwayItem.links?.source ?? sourceMedia.get('source art')?.url ?? null,
    keyPreview: runwayItem.links?.keyPreview ?? sourceMedia.get('magenta key preview')?.url ?? null,
    sandboxScreenshot: runwayItem.links?.sandboxScreenshot ?? sourceMedia.get('source sandbox preview')?.url ?? null,
    planPreview: runwayItem.links?.planPreview ?? sourceMedia.get('articulation plan preview')?.url ?? null,
    sourceParity: runtimeMedia.get('source parity overlay')?.url ?? null,
    contactSheet: runtimeMedia.get('contact sheet')?.url ?? null,
    phaseStrip: runtimeMedia.get('phase strip')?.url ?? null,
    sandboxIdle: runtimeMedia.get('sandbox idle')?.url ?? null,
    sandboxLunge: runtimeMedia.get('sandbox lunge')?.url ?? null,
    sandboxStunned: runtimeMedia.get('sandbox stunned')?.url ?? null,
  };
}

function imageTile(label, url) {
  if (!url) return `<div class="tile missing"><span>${htmlEscape(label)}</span><strong>missing</strong></div>`;
  return `<a class="tile" href="${htmlEscape(url)}"><img src="${htmlEscape(url)}" alt="${htmlEscape(label)}"><span>${htmlEscape(label)}</span></a>`;
}

function decisionControls(item, checks) {
  const checkRows = checks.map((check) => `<label class="check-row">
        <span><code>${htmlEscape(check)}</code></span>
        <input data-source-check-score="${htmlEscape(item.id)}" data-check="${htmlEscape(check)}" type="number" min="4" max="5" step="1" placeholder="4-5">
        <label class="failed"><input data-source-check-failed="${htmlEscape(item.id)}" data-check="${htmlEscape(check)}" type="checkbox"> failed</label>
        <textarea data-source-check-note="${htmlEscape(item.id)}" data-check="${htmlEscape(check)}" rows="2" spellcheck="true" placeholder="Specific evidence from source, key preview, source sandbox, plan preview, contact sheet, phase strip, and sandbox states."></textarea>
      </label>`).join('');
  return `<section class="decision-controls" data-source-decision-form="${htmlEscape(item.id)}">
      <h3>Structured Human Decision</h3>
      <div class="decision-topline">
        <label>Status
          <select data-source-decision-status="${htmlEscape(item.id)}">
            <option value="needs-review">needs-review</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
        </label>
        <button type="button" data-sync-source-decision="${htmlEscape(item.id)}">Sync JSON starter</button>
      </div>
      <label>Overall note
        <textarea data-source-overall-note="${htmlEscape(item.id)}" rows="3" spellcheck="true" placeholder="Approval or rejection rationale tied to the evidence tiles above."></textarea>
      </label>
      <div class="check-grid">${checkRows}</div>
    </section>`;
}

function buildReport({ approvalRunway, decisionTemplate, cohortBoard, visualBoard }) {
  const decisionsById = new Map((decisionTemplate.decisionFileTemplate?.decisions ?? decisionTemplate.decisions ?? []).map((decision) => [decision.id, decision]));
  const cohortById = new Map((cohortBoard.items ?? []).map((item) => [item.id, item]));
  const visualById = new Map((visualBoard.items ?? visualBoard.candidates ?? []).map((item) => [item.id, item]));
  const requiredChecks = decisionTemplate.requiredCohesionChecks ?? Object.keys(decisionTemplate.decisionFileTemplate?.decisions?.[0]?.visualChecks ?? {});
  const outputFile = 'water9-source-cohesion-reviewed-decisions.json';
  const strictApplyCommand = `npm run source:cohesion-decisions-apply -- --decisions ${outputFile} --strict`;
  const strictApplyCommandWithApply = `${strictApplyCommand} --apply`;
  const items = (approvalRunway.items ?? []).map((runwayItem) => {
    const decision = decisionsById.get(runwayItem.id);
    const cohortItem = cohortById.get(runwayItem.id);
    const visualItem = visualById.get(runwayItem.id);
    const decisionStarter = decision ? singleDecisionFile(decisionTemplate, decision) : null;
    const media = mediaFrom(runwayItem, cohortItem);
    const riskLevel = cohortItem?.riskLevel ?? 'unknown';
    return {
      id: runwayItem.id,
      species: runwayItem.species,
      rank: runwayItem.rank,
      readyForHumanReview: Boolean(runwayItem.readyForHumanReview),
      humanApproved: Boolean(runwayItem.humanApproved),
      criticRegenerationRequired: Boolean(runwayItem.criticRegenerationRequired),
      planPreviewPresent: Boolean(runwayItem.planPreviewPresent),
      riskLevel,
      riskFlags: cohortItem?.riskFlags ?? [],
      sourceMetrics: cohortItem?.sourceMetrics ?? runwayItem.metrics ?? null,
      evidenceFingerprintDigest: decision?.evidenceFingerprint?.digest ?? null,
      requiredRead: runwayItem.contract?.requiredRead ?? cohortItem?.requiredRead ?? [],
      contractReviewChecklist: runwayItem.contract?.contractReviewChecklist ?? cohortItem?.contractReviewChecklist ?? [],
      promptRisks: runwayItem.contract?.promptRisks ?? [],
      blockers: runwayItem.blockers ?? [],
      media,
      links: {
        quickReview: runwayItem.links?.quickReview ?? `/review/source-candidates/quick-reviews/${runwayItem.id}.html`,
        sourceSandbox: `/review/sandbox/lab.html?id=source-${runwayItem.id}&with=diver`,
        runtimeSandbox: `/review/sandbox/lab.html?id=${runwayItem.id}&with=diver`,
        visualBoard: '/review/source-visual-board.html',
        cohortBoard: '/review/content-cohort-cohesion-board.html',
        sourceApprovalRunway: '/review/source-approval-runway.html',
        sourceCohesionDecisionTemplate: '/review/source-candidates/source-cohesion-decision-template.html',
      },
      commands: {
        sourcePreview: `npm run sandbox:preview -- --id source-${runwayItem.id} --with diver --serve --open --visual`,
        runtimePreview: `npm run sandbox:preview -- --id ${runwayItem.id} --with diver --serve --open --visual`,
        strictDryRun: strictApplyCommand,
        strictApply: strictApplyCommandWithApply,
      },
      dryRunCommands: {
        accept: runwayItem.acceptCommandDryRun ?? runwayItem.acceptCommand ?? null,
        reject: runwayItem.rejectCommandDryRun ?? runwayItem.rejectCommand ?? null,
      },
      visualSummary: visualItem?.summary ?? null,
      decisionStarter,
    };
  }).sort((a, b) => {
    const riskDelta = (riskWeight.get(a.riskLevel) ?? 4) - (riskWeight.get(b.riskLevel) ?? 4);
    if (riskDelta) return riskDelta;
    return String(a.species).localeCompare(String(b.species));
  });
  return {
    schema: 'water9/source-approval-marathon@1',
    generatedAt: new Date().toISOString(),
    generatedFrom: {
      approvalRunway: 'public/review/source-approval-runway.json',
      decisionTemplate: 'public/review/source-candidates/source-cohesion-decision-template.json',
      cohortBoard: 'public/review/content-cohort-cohesion-board.json',
      visualBoard: 'public/review/source-visual-board.json',
    },
    policy: {
      humanAuthoredDecisionsRequired: true,
      automationCannotApproveSourceArt: true,
      pageDoesNotApplyDecisions: true,
      strictApplyGateRequired: true,
      acceptSourceCandidateRemainsFinalSourceGate: true,
      reviewPacketMustShowSourceAndRuntimeEvidence: true,
    },
    summary: {
      candidates: items.length,
      readyForHumanReview: items.filter((item) => item.readyForHumanReview && !item.humanApproved).length,
      humanApproved: items.filter((item) => item.humanApproved).length,
      criticRegenerationRequired: items.filter((item) => item.criticRegenerationRequired).length,
      requiredChecks: requiredChecks.length,
      requiredMediaTiles: reviewMediaTiles.length,
      decisionStarters: items.filter((item) => item.decisionStarter).length,
      riskHigh: items.filter((item) => item.riskLevel === 'high').length,
      riskMedium: items.filter((item) => item.riskLevel === 'medium').length,
      riskLow: items.filter((item) => item.riskLevel === 'low').length,
      riskClear: items.filter((item) => item.riskLevel === 'clear').length,
      nextTarget: items.find((item) => item.readyForHumanReview && !item.humanApproved)?.id ?? null,
    },
    reviewChecks: requiredChecks,
    reviewMediaTiles: reviewMediaTiles.map(([key, label]) => ({ key, label })),
    decisionOutput: {
      filename: outputFile,
      strictApplyCommand,
      strictApplyCommandWithApply,
      sourceTemplate: publicHref('public/review/source-candidates/source-cohesion-decision-template.json'),
    },
    commands: {
      rebuild: 'npm run source:approval-marathon && npm run source:approval-marathon-check',
      open: 'npm run source:approval-marathon:serve-smoke',
      buildDecisionTemplate: 'npm run source:cohesion-decisions && npm run source:cohesion-decisions-check',
      strictDryRun: strictApplyCommand,
      strictApply: strictApplyCommandWithApply,
    },
    items,
  };
}

function markdown(report) {
  const lines = [
    '# Water 9 Source Approval Marathon',
    '',
    `Generated: \`${report.generatedAt}\``,
    '',
    'A single review surface for the human source-approval bottleneck. This page does not approve source art and does not bypass the strict decision applicator.',
    '',
    '## Summary',
    '',
    `- Candidates: \`${report.summary.candidates}\``,
    `- Ready for human review: \`${report.summary.readyForHumanReview}\``,
    `- Human approved: \`${report.summary.humanApproved}\``,
    `- Decision starters: \`${report.summary.decisionStarters}\``,
    `- High-risk rows: \`${report.summary.riskHigh}\``,
    `- Medium-risk rows: \`${report.summary.riskMedium}\``,
    `- Strict dry-run: \`${report.decisionOutput.strictApplyCommand}\``,
    '',
    '## Required Checks',
    '',
    ...report.reviewChecks.map((check) => `- \`${check}\``),
    '',
  ];
  for (const item of report.items) {
    lines.push(
      `## ${item.species}`,
      '',
      `- ID: \`${item.id}\``,
      `- Risk: \`${item.riskLevel}\``,
      `- Risk flags: \`${item.riskFlags.join(', ') || 'none'}\``,
      `- Evidence fingerprint: \`${item.evidenceFingerprintDigest ?? 'missing'}\``,
      `- Source sandbox: \`${item.commands.sourcePreview}\``,
      `- Runtime sandbox: \`${item.commands.runtimePreview}\``,
      '',
    );
  }
  return `${lines.join('\n')}\n`;
}

function html(report) {
  const checkList = report.reviewChecks.map((check) => `<li><code>${htmlEscape(check)}</code></li>`).join('');
  const defaultDecisionFile = {
    schema: 'water9/source-cohesion-decisions@1',
    reviewer: '<human-reviewer>',
    reviewedAt: '<ISO-8601 timestamp>',
    policy: report.items.find((item) => item.decisionStarter)?.decisionStarter?.policy ?? {
      humanAuthored: true,
      automationCannotApproveCohesion: true,
      inspectSourceKeySandboxAndPlan: true,
    },
    decisions: [],
  };
  const cards = report.items.map((item) => `<article class="card" data-approval-marathon-item="${htmlEscape(item.id)}" data-risk="${htmlEscape(item.riskLevel)}">
    <header>
      <div>
        <h2>${htmlEscape(item.species)}</h2>
        <code>${htmlEscape(item.id)}</code>
      </div>
      <strong>${htmlEscape(item.riskLevel)}</strong>
    </header>
    <p>fingerprint <code>${htmlEscape(shortDigest(item.evidenceFingerprintDigest))}</code> · flags ${htmlEscape(item.riskFlags.join(', ') || 'none')}</p>
    <div class="media">
      ${reviewMediaTiles.map(([key, label]) => imageTile(label, item.media[key])).join('\n      ')}
    </div>
    <details>
      <summary>Contract review notes</summary>
      <h3>Required Read</h3>
      <ul>${item.requiredRead.map((entry) => `<li>${htmlEscape(entry)}</li>`).join('')}</ul>
      <h3>Contract Checks</h3>
      <ul>${item.contractReviewChecklist.map((entry) => `<li>${htmlEscape(entry)}</li>`).join('')}</ul>
      <h3>Prompt Risks</h3>
      <ul>${item.promptRisks.map((entry) => `<li>${htmlEscape(entry)}</li>`).join('')}</ul>
    </details>
    <details>
      <summary>Commands and reviewed-only JSON starter</summary>
      <pre><code>${htmlEscape([
        item.commands.sourcePreview,
        item.commands.runtimePreview,
        report.decisionOutput.strictApplyCommand,
        report.decisionOutput.strictApplyCommandWithApply,
      ].join('\n'))}</code></pre>
      ${decisionControls(item, report.reviewChecks)}
      <textarea data-source-decision-starter="${htmlEscape(item.id)}" spellcheck="false">${htmlEscape(JSON.stringify(item.decisionStarter, null, 2))}</textarea>
    </details>
    <nav>
      <a href="${htmlEscape(item.links.quickReview)}">quick review</a>
      <a href="${htmlEscape(item.links.sourceSandbox)}">source sandbox</a>
      <a href="${htmlEscape(item.links.runtimeSandbox)}">runtime sandbox</a>
      <a href="${htmlEscape(item.links.cohortBoard)}">cohort board</a>
    </nav>
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Approval Marathon</title>
  <style>
    :root { color-scheme: dark; background:#061014; color:#d9edf0; font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    * { box-sizing:border-box; }
    body { margin:0; background:#061014; }
    main { max-width:1440px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4rem); letter-spacing:0; }
    h2 { margin:0; font-size:1.1rem; }
    h3 { margin:14px 0 8px; color:#9fb4b9; font-size:.8rem; text-transform:uppercase; }
    p, li { color:#b8cbd2; }
    a { color:#7de5f5; text-decoration:none; }
    code, pre, textarea { font-family:"SFMono-Regular",Consolas,monospace; }
    pre, textarea, input, select, button { border:1px solid #294653; background:#050b0d; color:#d9edf0; border-radius:6px; padding:10px; }
    pre, textarea { white-space:pre-wrap; overflow:auto; width:100%; }
    textarea { min-height:280px; resize:vertical; }
    button { cursor:pointer; }
    input, select { min-height:38px; }
    .notice, .summary, .checks, .card { border:1px solid #294653; background:#0b1d24; border-radius:6px; padding:14px; }
    .notice { border-color:#704747; background:#1d1012; color:#f0b5aa; margin:14px 0; }
    .summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:8px; margin:18px 0; }
    .summary span { border:1px solid #203b46; background:#07171d; border-radius:5px; padding:8px 10px; }
    .summary strong { display:block; font-size:1.35rem; color:#fff; }
    .cards { display:grid; gap:14px; margin-top:18px; }
    .card header { display:flex; justify-content:space-between; gap:12px; align-items:start; }
    .media { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px; margin:12px 0; }
    .tile { border:1px solid #203b46; background:#03090b; border-radius:5px; overflow:hidden; min-height:140px; }
    .tile img { display:block; width:100%; aspect-ratio:16/10; object-fit:contain; background:#020607; }
    .tile span, .tile strong { display:block; padding:7px 9px; color:#9fb4b9; }
    .missing { display:grid; place-items:center; }
    nav { display:flex; flex-wrap:wrap; gap:10px; margin-top:10px; }
    details { margin-top:10px; }
    summary { cursor:pointer; color:#e9fbff; }
    .decision-controls { border:1px solid #203b46; background:#07171d; border-radius:6px; padding:12px; margin:12px 0; }
    .decision-controls textarea { min-height:72px; margin-top:6px; }
    .decision-topline { display:flex; flex-wrap:wrap; gap:10px; align-items:end; margin-bottom:10px; }
    .check-grid { display:grid; gap:8px; margin-top:10px; }
    .check-row { display:grid; grid-template-columns:minmax(180px,1fr) 88px 90px minmax(260px,2fr); gap:8px; align-items:start; }
    .check-row textarea { margin:0; }
    .failed { display:flex; gap:6px; align-items:center; color:#b8cbd2; }
    .export-warnings { border-color:#6c5630; background:#1c1608; color:#ffd891; min-height:48px; }
    @media (max-width: 900px) { .check-row { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <main data-source-approval-marathon>
    <h1>Source Approval Marathon</h1>
    <p>All approval-ready source candidates in one pass. Human-authored decisions and strict apply remain mandatory.</p>
    <div class="notice">This page packages evidence. It does not approve source art, does not accept threats, and does not count anything toward the strict gate by itself.</div>
    <section class="summary">
      <span>candidates<strong>${report.summary.candidates}</strong></span>
      <span>ready<strong>${report.summary.readyForHumanReview}</strong></span>
      <span>approved<strong>${report.summary.humanApproved}</strong></span>
      <span>starters<strong>${report.summary.decisionStarters}</strong></span>
      <span>high-risk<strong>${report.summary.riskHigh}</strong></span>
      <span>medium-risk<strong>${report.summary.riskMedium}</strong></span>
    </section>
    <section class="checks">
      <h2>Required Source Checks</h2>
      <ul>${checkList}</ul>
      <pre><code>${htmlEscape(Object.values(report.commands).join('\n'))}</code></pre>
    </section>
    <section class="checks" data-approval-marathon-export>
      <h2>Reviewed-Only Decision Export</h2>
      <p>After editing candidate JSON starters below, build a reviewed-only decision file. Pending <code>needs-review</code> starters are excluded.</p>
      <label>Reviewer <input data-reviewer-name value="&lt;human-reviewer&gt;"></label>
      <button type="button" data-build-reviewed-decisions>Build reviewed-only JSON</button>
      <a id="reviewed-decision-download" download="${htmlEscape(report.decisionOutput.filename)}">download reviewed decisions</a>
      <pre class="export-warnings" data-reviewed-decision-warnings>No reviewed decision warnings.</pre>
      <textarea data-reviewed-decision-output spellcheck="false">${htmlEscape(JSON.stringify(defaultDecisionFile, null, 2))}</textarea>
    </section>
    <section class="cards">${cards}</section>
  </main>
  <script>
    const fallbackDecisionFile = ${JSON.stringify(defaultDecisionFile)};
    const output = document.querySelector('[data-reviewed-decision-output]');
    const warningsOutput = document.querySelector('[data-reviewed-decision-warnings]');
    const reviewerInput = document.querySelector('[data-reviewer-name]');
    const download = document.querySelector('#reviewed-decision-download');
    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }
    function formHasStructuredInput(card) {
      const status = card.querySelector('[data-source-decision-status]')?.value ?? 'needs-review';
      if (status !== 'needs-review') return true;
      if ((card.querySelector('[data-source-overall-note]')?.value ?? '').trim()) return true;
      for (const field of card.querySelectorAll('[data-source-check-score], [data-source-check-note], [data-source-check-failed]')) {
        if (field.type === 'checkbox' ? field.checked : String(field.value ?? '').trim()) return true;
      }
      return false;
    }
    function applyStructuredForm(card, decision, reviewer, reviewedAt) {
      if (!decision) return decision;
      if (!formHasStructuredInput(card)) return decision;
      const copied = clone(decision);
      const status = card.querySelector('[data-source-decision-status]')?.value ?? copied.status ?? 'needs-review';
      copied.status = status;
      copied.reviewer = reviewer;
      copied.reviewedAt = reviewedAt;
      copied.overallNote = (card.querySelector('[data-source-overall-note]')?.value ?? '').trim();
      copied.failedChecks = [];
      for (const [check, field] of Object.entries(copied.visualChecks ?? {})) {
        const scoreInput = card.querySelector(\`[data-source-check-score][data-check="\${CSS.escape(check)}"]\`);
        const noteInput = card.querySelector(\`[data-source-check-note][data-check="\${CSS.escape(check)}"]\`);
        const failedInput = card.querySelector(\`[data-source-check-failed][data-check="\${CSS.escape(check)}"]\`);
        const scoreText = String(scoreInput?.value ?? '').trim();
        field.score = scoreText ? Number(scoreText) : null;
        field.note = String(noteInput?.value ?? '').trim();
        if (status === 'rejected' && failedInput?.checked) copied.failedChecks.push(check);
      }
      if (status === 'approved') copied.failedChecks = [];
      return copied;
    }
    function decisionWarnings(decision) {
      const warnings = [];
      if (!decision || !['approved', 'rejected'].includes(decision.status)) return warnings;
      const prefix = decision.id ?? 'unknown';
      if (!String(decision.overallNote ?? '').trim()) warnings.push(\`\${prefix}: reviewed decision is missing an overall note\`);
      if (decision.status === 'approved') {
        for (const [check, field] of Object.entries(decision.visualChecks ?? {})) {
          const score = Number(field?.score);
          if (!Number.isFinite(score) || score < 4 || score > 5) warnings.push(\`\${prefix}: approved \${check} score must be 4-5\`);
          if (!String(field?.note ?? '').trim()) warnings.push(\`\${prefix}: approved \${check} note is missing\`);
        }
      }
      if (decision.status === 'rejected') {
        const failedChecks = Array.isArray(decision.failedChecks) ? decision.failedChecks : [];
        if (!failedChecks.length) warnings.push(\`\${prefix}: rejected decision needs at least one failed check\`);
        for (const check of failedChecks) {
          if (!String(decision.visualChecks?.[check]?.note ?? '').trim()) warnings.push(\`\${prefix}: rejected \${check} failure note is missing\`);
        }
      }
      return warnings;
    }
    function syncStructuredDecision(card) {
      const textarea = card.querySelector('[data-source-decision-starter]');
      if (!textarea) return;
      const reviewer = reviewerInput?.value?.trim() || '<human-reviewer>';
      const reviewedAt = new Date().toISOString();
      const parsed = JSON.parse(textarea.value);
      const decision = parsed.decisions?.[0];
      if (!decision) return;
      parsed.reviewer = reviewer;
      parsed.reviewedAt = reviewedAt;
      parsed.decisions[0] = applyStructuredForm(card, decision, reviewer, reviewedAt);
      textarea.value = JSON.stringify(parsed, null, 2);
    }
    function normalizeDecisionFile() {
      const decisions = [];
      const failures = [];
      const reviewer = reviewerInput?.value?.trim() || '<human-reviewer>';
      const reviewedAt = new Date().toISOString();
      for (const textarea of document.querySelectorAll('[data-source-decision-starter]')) {
        try {
          const parsed = JSON.parse(textarea.value);
          const card = textarea.closest('[data-approval-marathon-item]');
          const decision = applyStructuredForm(card ?? document, parsed.decisions?.[0], reviewer, reviewedAt);
          if (!decision || decision.status === 'needs-review') continue;
          if (!['approved', 'rejected'].includes(decision.status)) {
            failures.push(\`\${textarea.dataset.sourceDecisionStarter}: unsupported status \${decision.status}\`);
            continue;
          }
          decision.reviewer = decision.reviewer && decision.reviewer !== '<human-reviewer>' ? decision.reviewer : reviewer;
          decision.reviewedAt = decision.reviewedAt && decision.reviewedAt !== '<ISO-8601 timestamp>' ? decision.reviewedAt : reviewedAt;
          failures.push(...decisionWarnings(decision));
          decisions.push(decision);
        } catch (error) {
          failures.push(\`\${textarea.dataset.sourceDecisionStarter}: \${error.message}\`);
        }
      }
      const file = {
        ...fallbackDecisionFile,
        reviewer,
        reviewedAt,
        decisions,
        browserExportWarnings: failures,
      };
      output.value = JSON.stringify(file, null, 2);
      if (warningsOutput) warningsOutput.textContent = failures.length ? failures.join('\\n') : 'No reviewed decision warnings.';
      const blob = new Blob([output.value + '\\n'], { type: 'application/json' });
      download.href = URL.createObjectURL(blob);
    }
    document.querySelectorAll('[data-sync-source-decision]').forEach((button) => {
      button.addEventListener('click', () => {
        const card = button.closest('[data-approval-marathon-item]');
        if (card) syncStructuredDecision(card);
      });
    });
    document.querySelector('[data-build-reviewed-decisions]')?.addEventListener('click', normalizeDecisionFile);
    normalizeDecisionFile();
  </script>
</body>
</html>
`;
}

const approvalRunway = await readJson(paths.approvalRunway, { items: [], summary: {} });
const decisionTemplate = await readJson(paths.decisionTemplate, { decisionFileTemplate: { decisions: [] }, requiredCohesionChecks: [] });
const cohortBoard = await readJson(paths.cohortBoard, { items: [], summary: {} });
const visualBoard = await readJson(paths.visualBoard, { items: [] });
const report = buildReport({ approvalRunway, decisionTemplate, cohortBoard, visualBoard });

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdown(report));
await writeFile(paths.outHtml, html(report));

console.log(JSON.stringify({
  schema: report.schema,
  candidates: report.summary.candidates,
  readyForHumanReview: report.summary.readyForHumanReview,
  decisionStarters: report.summary.decisionStarters,
  riskHigh: report.summary.riskHigh,
  riskMedium: report.summary.riskMedium,
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
}, null, 2));

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
  reviewDossier: resolve(String(args.get('review-dossier') ?? 'public/review/source-candidates/source-review-dossier.json')),
  planCoverage: resolve(String(args.get('plan-coverage') ?? 'public/review/content-plan-coverage.json')),
  criticRegeneration: resolve(String(args.get('critic-regeneration') ?? 'public/review/source-candidates/source-critic-regeneration-queue.json')),
  criticHealth: resolve(String(args.get('critic-health') ?? 'public/review/source-candidates/source-critic-regeneration-health.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-approval-runway.json')),
  outChecklist: resolve(String(args.get('checklist-out') ?? 'public/review/source-approval-checklist.json')),
  outMd: resolve(String(args.get('md-out') ?? 'public/review/source-approval-runway.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-approval-runway.html')),
};

const REQUIRED_VISUAL_CHECKS = [
  'whole-creature-cohesion',
  'part-continuity-cohesion',
  'readable-silhouette',
  'no-collage-artifacts',
  'non-placeholder-art-direction',
  'crop-safe-anatomy',
  'clean-magenta-key',
  'gameplay-read',
  'neutral-riggable-pose',
  'visible-attack-lane',
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

function dryRunSourceAccept(command) {
  const text = String(command ?? '').trim();
  if (!text || !text.includes('npm run source:accept')) return text;
  return text.includes('--dry-run') ? text : `${text} --dry-run`;
}

function buildReviewChecklist(report) {
  const evidenceLabels = [
    'source image',
    'magenta key preview',
    'sandbox source preview',
    'live sandbox lab',
    'live source sandbox',
    'live runtime sandbox',
    'articulation plan preview',
    'quick review packet',
  ];
  return {
    schema: 'water9/source-approval-checklist@1',
    generatedAt: report.generatedAt,
    generatedFrom: {
      runway: paths.outJson,
      quickReviews: paths.quickReviews,
      reviewDossier: paths.reviewDossier,
      planCoverage: paths.planCoverage,
    },
    requiredVisualChecks: REQUIRED_VISUAL_CHECKS,
    summary: {
      candidates: report.summary.candidates,
      readyForHumanReview: report.summary.readyForHumanReview,
      mechanicallyReadyForHumanReview: report.summary.mechanicallyReadyForHumanReview,
      criticRegenerationRequired: report.summary.criticRegenerationRequired,
      humanApproved: report.summary.humanApproved,
      pendingHumanApproval: report.items.filter((item) => item.readyForHumanReview && !item.humanApproved).length,
      blockedBeforeHumanApproval: report.items.filter((item) => !item.readyForHumanReview).length,
    },
    items: report.items.map((item) => {
      const requiredEvidence = [
        { label: 'source image', url: item.links.source, present: Boolean(item.links.source) },
        { label: 'magenta key preview', url: item.links.keyPreview, present: Boolean(item.links.keyPreview) },
        { label: 'sandbox source preview', url: item.links.sandboxScreenshot, present: Boolean(item.links.sandboxScreenshot) },
        { label: 'live sandbox lab', url: item.links.sandboxLab, present: Boolean(item.links.sandboxLab) },
        { label: 'live source sandbox', url: item.links.sourceSandboxLive, present: Boolean(item.links.sourceSandboxLive) },
        { label: 'live runtime sandbox', url: item.links.runtimeSandboxLive, present: Boolean(item.links.runtimeSandboxLive) },
        { label: 'articulation plan preview', url: item.links.planPreview, present: Boolean(item.links.planPreview) },
        { label: 'quick review packet', url: item.links.quickReview, present: Boolean(item.links.quickReview) },
      ];
      const missingEvidence = requiredEvidence.filter((evidence) => !evidence.present).map((evidence) => evidence.label);
      const blockers = [
        ...missingEvidence.map((label) => `${label} missing`),
        ...(item.criticRegenerationRequired ? ['critic regeneration required before human approval'] : []),
        ...(item.readyForHumanReview ? [] : ['source is not ready for human approval']),
        ...(item.humanApproved ? [] : ['human source approval missing']),
      ];
      return {
        rank: item.rank,
        id: item.id,
        species: item.species,
        readyForHumanReview: item.readyForHumanReview,
        mechanicallyReadyForHumanReview: item.mechanicallyReadyForHumanReview,
        criticRegenerationRequired: item.criticRegenerationRequired,
        criticRegeneration: item.criticRegeneration,
        criticRegenerationHealthStatus: item.criticRegenerationHealthStatus,
        humanApproved: item.humanApproved,
        state: item.humanApproved ? 'approved' : item.readyForHumanReview ? 'awaiting-human-source-approval' : 'blocked-before-human-review',
        requiredEvidence,
        requiredEvidenceLabels: evidenceLabels,
        requiredVisualChecks: REQUIRED_VISUAL_CHECKS,
        contract: item.contract ?? null,
        diagnostics: item.diagnostics ?? null,
        metrics: item.metrics,
        blockers,
        reviewWarning: item.reviewWarning,
        links: item.links,
        commands: {
          quickReview: item.commands.quickReview,
          accept: item.acceptCommand,
          acceptDryRun: item.acceptCommandDryRun,
          reject: item.rejectCommand,
          rejectDryRun: item.rejectCommandDryRun,
          sandboxLab: item.commands.sandboxLab,
          sourceSandboxLive: item.commands.sourceSandboxLive,
          runtimeSandboxLive: item.commands.runtimeSandboxLive,
          planCheck: item.commands.planCheck,
          productionPrepare: item.commands.productionPrepare,
        },
      };
    }),
  };
}

function markdownFor(report) {
  const rows = report.items.map((item) => `| ${item.id} | ${item.species} | ${item.mechanicallyReadyForHumanReview ? 'yes' : 'no'} | ${item.criticRegenerationRequired ? 'yes' : 'no'} | ${item.readyForHumanReview ? 'yes' : 'no'} | ${item.humanApproved ? 'yes' : 'no'} | ${item.planPreviewPresent ? 'yes' : 'no'} | \`${item.acceptCommandDryRun}\` |`).join('\n');
  return `# Water 9 Source Approval Runway

Generated: \`${report.generatedAt}\`

Human review queue for source images. This runway is for human source approval only. It combines source art, magenta key preview, sandbox source preview, and articulation plan preview. Automation can prove readiness; it cannot approve the art.

## Summary

- Candidates: ${report.summary.candidates}
- Mechanically ready for human review: ${report.summary.mechanicallyReadyForHumanReview}
- Critic regeneration required: ${report.summary.criticRegenerationRequired}
- Approval-ready after critic blockers: ${report.summary.readyForHumanReview}
- Human approved: ${report.summary.humanApproved}
- Plan previews present: ${report.summary.planPreviewsPresent}
- Missing plan previews: ${report.summary.missingPlanPreviews}

## Human Approval Boundary

The command below is a dry-run template. Use it to verify the selected candidate, but only run a real approval after a human has inspected the runway, visual board, source sandbox screenshot, magenta key, and articulation plan preview.

## Recommended Dry-Run Command

\`\`\`bash
${report.recommended?.acceptCommandDryRun ?? '# no source candidate is ready for review'}
\`\`\`

## Machine-Readable Checklist

- JSON: \`public/review/source-approval-checklist.json\`
- Schema: \`water9/source-approval-checklist@1\`
- Purpose: compact human review state for source images, required evidence, required visual checks, blockers, and approval commands.

## Visual Board

- HTML: \`public/review/source-visual-board.html\`
- Command: \`npm run source:visual-board && npm run source:visual-board-check\`
- Purpose: dense side-by-side source, key, sandbox, and plan-preview board for catching weak cohesion before approval.

## Critic Regeneration Blockers

- HTML: \`public/review/source-candidates/source-critic-regeneration-queue.html\`
- Command: \`npm run source:critic-regeneration && npm run source:critic-regeneration-check && npm run source:critic-regeneration:serve-smoke && npm run source:critic-regeneration-openai-smoke\`
- Purpose: candidates marked \`regenerate\` by subagent critic findings are blocked from human approval until replacement source art returns through this runway.

## Live Sandbox Review

Every runway item includes direct source-with-diver and runtime-with-diver sandbox commands. Use them to confirm scale, silhouette, and motion context before accepting source art.

## Candidates

| Candidate | Species | Mechanically ready | Critic regen | Approval-ready | Approved | Plan preview | Approval dry-run |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
${rows}
`;
}

function imageBlock(label, src) {
  if (!src) return `<div class="image missing"><span>${htmlEscape(label)} missing</span></div>`;
  return `<a class="image" href="${htmlEscape(src)}"><img src="${htmlEscape(src)}" alt="${htmlEscape(label)}"><span>${htmlEscape(label)}</span></a>`;
}

function reviewCommandBuilder(report) {
  const data = JSON.stringify({
    checks: REQUIRED_VISUAL_CHECKS,
    recommendedId: report.recommended?.id ?? report.items[0]?.id ?? null,
    candidates: report.items.map((item) => ({ id: item.id, species: item.species })),
  })
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
  const candidateOptions = report.items.map((item) => `<option value="${htmlEscape(item.id)}"${item.id === report.recommended?.id ? ' selected' : ''}>${htmlEscape(item.species)} (${htmlEscape(item.id)})</option>`).join('');
  const checkRows = REQUIRED_VISUAL_CHECKS.map((check) => `<div class="builder-check" data-builder-check="${htmlEscape(check)}">
        <label>${htmlEscape(check)} score
          <select data-score="${htmlEscape(check)}">
            <option value="4">4 - passes</option>
            <option value="5">5 - strong pass</option>
          </select>
        </label>
        <label>${htmlEscape(check)} failed for rejection
          <input data-failed-check="${htmlEscape(check)}" type="checkbox">
        </label>
        <label>${htmlEscape(check)} evidence note
          <textarea data-note="${htmlEscape(check)}" rows="2" placeholder="Specific visual evidence from source, key preview, sandbox screenshot, and plan preview."></textarea>
        </label>
      </div>`).join('\n');
  return `<section class="review-builder" data-source-approval-command-builder>
      <h2>Human Approval Command Builder</h2>
      <p>Use this after inspecting the source, magenta key, sandbox screenshot, visual board, and plan preview. This page only builds a post-review command; approval still requires a human to run it.</p>
      <div class="builder-grid">
        <label>Candidate
          <select data-candidate>${candidateOptions}</select>
        </label>
        <label>Reviewer
          <input data-reviewer type="text" placeholder="human reviewer name">
        </label>
        <label>Status
          <select data-status>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="needs-review">needs-review</option>
          </select>
        </label>
      </div>
      <label>Overall note
        <textarea data-overall-note rows="3" placeholder="Specific source-level rationale."></textarea>
      </label>
      <div class="builder-checks">${checkRows}</div>
      <div class="builder-actions">
        <button type="button" data-build-command>Build Command</button>
        <button type="button" data-copy-command>Copy Command</button>
        <a data-open-candidate href="#${htmlEscape(report.recommended?.id ?? report.items[0]?.id ?? '')}">Jump To Candidate</a>
      </div>
      <textarea data-command-output rows="8" spellcheck="false" aria-label="Generated source approval command"></textarea>
      <p class="builder-warning" data-builder-warning></p>
      <script type="application/json" data-source-approval-command-data>${data}</script>
    </section>`;
}

function builderScript() {
  return `<script>
    (() => {
      const root = document.querySelector('[data-source-approval-command-builder]');
      if (!root) return;
      const data = JSON.parse(root.querySelector('[data-source-approval-command-data]').textContent);
      const output = root.querySelector('[data-command-output]');
      const warning = root.querySelector('[data-builder-warning]');
      const candidateSelect = root.querySelector('[data-candidate]');
      const openCandidate = root.querySelector('[data-open-candidate]');
      const shellQuote = (value) => "'" + String(value ?? '').replaceAll("'", "'\\\\''") + "'";
      const updateCandidateLink = () => {
        openCandidate.href = '#' + encodeURIComponent(candidateSelect.value);
      };
      const build = () => {
        updateCandidateLink();
        const id = candidateSelect.value;
        const reviewer = root.querySelector('[data-reviewer]').value.trim();
        const status = root.querySelector('[data-status]').value;
        const note = root.querySelector('[data-overall-note]').value.trim();
        const missing = [];
        if (!reviewer) missing.push('reviewer');
        if (!note) missing.push('overall note');
        const command = [
          'npm run source:accept --',
          '--id', id,
          '--status', status,
          '--reviewed-by', shellQuote(reviewer || '<human-reviewer>'),
          '--note', shellQuote(note || '<specific source approval note>'),
        ];
        if (status === 'approved') {
          for (const check of data.checks) {
            const score = root.querySelector('[data-score="' + check + '"]')?.value || '4';
            const visualNote = root.querySelector('[data-note="' + check + '"]')?.value.trim() || '';
            if (!visualNote) missing.push(check + ' note');
            command.push('--visual-check', check);
            command.push('--score', check + '=' + score);
            command.push('--visual-note', shellQuote(check + '=' + (visualNote || '<specific rationale citing source evidence>')));
          }
          command.push('--source-reviewed');
          command.push('--source-visual-board', 'public/review/source-visual-board.json');
        } else if (status === 'rejected') {
          let failedCount = 0;
          for (const check of data.checks) {
            const failed = root.querySelector('[data-failed-check="' + check + '"]')?.checked === true;
            if (!failed) continue;
            failedCount += 1;
            const visualNote = root.querySelector('[data-note="' + check + '"]')?.value.trim() || '';
            if (!visualNote) missing.push(check + ' failure note');
            command.push('--failed-check', check);
            command.push('--visual-note', shellQuote(check + '=' + (visualNote || '<specific failure rationale citing source evidence>')));
          }
          if (!failedCount) missing.push('at least one failed check');
          command.push('--source-rejected');
          command.push('--source-visual-board', 'public/review/source-visual-board.json');
        }
        output.value = command.join(' ');
        warning.textContent = missing.length ? 'Missing: ' + missing.join(', ') : 'Command ready. Run it in a terminal after completing the review.';
      };
      root.querySelector('[data-build-command]').addEventListener('click', build);
      root.querySelector('[data-copy-command]').addEventListener('click', async () => {
        if (!output.value.trim()) build();
        await navigator.clipboard?.writeText(output.value);
        warning.textContent = 'Command copied.';
      });
      candidateSelect.addEventListener('change', build);
      root.querySelector('[data-status]').addEventListener('change', build);
      build();
    })();
  </script>`;
}

function htmlFor(report) {
  const cards = report.items.map((item) => `<article class="card" id="${htmlEscape(item.id)}" data-source-approval-candidate="${htmlEscape(item.id)}">
    <header>
      <div><h2>${htmlEscape(item.species)}</h2><code>${htmlEscape(item.id)}</code></div>
      <strong>${item.humanApproved ? 'approved' : item.readyForHumanReview ? 'ready' : 'blocked'}</strong>
    </header>
    <div class="media">
      ${imageBlock('source', item.links.source)}
      ${imageBlock('magenta key', item.links.keyPreview)}
      ${imageBlock('sandbox source preview', item.links.sandboxScreenshot)}
      ${imageBlock('plan preview', item.links.planPreview)}
    </div>
    <div class="badges">
      <span>image validation <strong>${item.evidence.imageValidationPassed}</strong></span>
      <span>source preview <strong>${item.evidence.sourcePreviewPassed}</strong></span>
      <span>plan preview <strong>${item.planPreviewPresent}</strong></span>
      <span>mechanically ready <strong>${item.mechanicallyReadyForHumanReview}</strong></span>
      <span>critic regeneration <strong>${item.criticRegenerationRequired}</strong></span>
      <span>human approved <strong>${item.humanApproved}</strong></span>
    </div>
    <p class="warning">${htmlEscape(item.reviewWarning)}</p>
    ${item.criticRegeneration ? `<h3>Critic Regeneration Blocker</h3>
    <p class="warning">${htmlEscape(item.criticRegeneration.reason)}</p>
    <div class="links">
      <a href="/review/source-candidates/source-critic-regeneration-queue.html">regeneration queue</a>
      ${item.criticRegeneration.promptFile ? `<a href="${htmlEscape(publicUrl(item.criticRegeneration.promptFile))}">prompt file</a>` : ''}
      ${item.criticRegeneration.sourceCriticBoard ? `<a href="${htmlEscape(item.criticRegeneration.sourceCriticBoard)}">critic board</a>` : ''}
    </div>
    ${commandBlock([item.criticRegeneration.commands?.generateOpenAiDryRun, item.criticRegeneration.commands?.dryRunReplace, item.criticRegeneration.commands?.sourcePreview])}` : ''}
    <h3>Live Sandbox Review</h3>
    <div class="links">
      <a href="${htmlEscape(item.links.sandboxLab)}">sandbox lab</a>
      <a href="${htmlEscape(item.links.sourceSandboxLive)}">source + diver</a>
      <a href="${htmlEscape(item.links.runtimeSandboxLive)}">runtime + diver</a>
    </div>
    ${commandBlock([item.commands.sandboxLab, item.commands.sourceSandboxLive, item.commands.runtimeSandboxLive])}
    <h3>Post-Review Dry-Run Commands</h3>
    ${commandBlock([item.acceptCommandDryRun, item.rejectCommandDryRun])}
    <details>
      <summary>Final command templates after human review</summary>
      ${commandBlock([item.acceptCommand, item.rejectCommand])}
    </details>
    <h3>Follow-Up Commands</h3>
    ${commandBlock([item.commands.quickReview, item.commands.planCheck, item.commands.productionPrepare])}
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Approval Runway</title>
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
    button, input, select, textarea { font:inherit; }
    input, select, textarea { width:100%; border:1px solid var(--line); border-radius:5px; background:#050b0d; color:var(--text); padding:8px; }
    textarea { resize:vertical; }
    button, .builder-actions a { border:1px solid var(--line); border-radius:5px; background:#12313a; color:var(--text); padding:9px 12px; cursor:pointer; text-decoration:none; }
    button:hover, .builder-actions a:hover { border-color:var(--accent); }
    .summary, .badges { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }
    .summary span, .badges span { border:1px solid var(--line); background:#09171b; border-radius:5px; padding:7px 9px; color:var(--muted); }
    .links { display:flex; flex-wrap:wrap; gap:10px; margin:8px 0 12px; }
    strong { color:var(--text); }
    label { display:grid; gap:5px; color:var(--muted); }
    label input, label select, label textarea { color:var(--text); }
    .review-builder { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:14px; margin:18px 0; }
    .review-builder h2 { margin-bottom:8px; }
    .builder-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; }
    .builder-checks { display:grid; gap:10px; margin:12px 0; }
    .builder-check { display:grid; grid-template-columns:minmax(180px,240px) minmax(160px,200px) 1fr; gap:10px; align-items:start; border-top:1px solid var(--line); padding-top:10px; }
    .builder-actions { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:10px 0; }
    .builder-warning { min-height:1.4em; color:var(--warn); }
    [data-command-output] { font-family:"SFMono-Regular",Consolas,monospace; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(430px,1fr)); gap:14px; align-items:start; }
    .card { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:14px; }
    .card header { display:flex; justify-content:space-between; gap:12px; align-items:start; }
    .media { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin:12px 0; }
    .image { display:flex; min-height:120px; flex-direction:column; justify-content:space-between; border:1px solid var(--line); background:#050b0d; color:var(--accent); text-decoration:none; overflow:hidden; }
    .image img { width:100%; height:120px; object-fit:contain; background:#050b0d; }
    .image span { padding:6px; color:var(--muted); font-size:12px; }
    .missing { align-items:center; justify-content:center; color:var(--warn); }
    .warning { color:var(--warn); }
    @media (max-width:720px) { .builder-check { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Source Approval Runway</h1>
    <p>Human review queue for source images. Automation can prove readiness; it cannot approve the art.</p>
    <section class="review-boundary">
      <h2>Human Approval Boundary</h2>
      <p><strong>Recommended Dry-Run Command</strong> templates verify candidate evidence only. Use the command builder for the final post-review command after a human has inspected the source, magenta key, sandbox screenshot, visual board, and plan preview.</p>
    </section>
    <section class="review-boundary">
      <h2>Critic Regeneration Blockers</h2>
      <p><strong>Approval-ready after critic blockers</strong> excludes candidates marked regenerate by the critic board. Those candidates must use the critic regeneration queue and return through source review before approval.</p>
    </section>
    <div class="summary">
      <span>candidates <strong>${report.summary.candidates}</strong></span>
      <span>mechanically ready <strong>${report.summary.mechanicallyReadyForHumanReview}</strong></span>
      <span>critic regen blockers <strong>${report.summary.criticRegenerationRequired}</strong></span>
      <span>approval-ready <strong>${report.summary.readyForHumanReview}</strong></span>
      <span>approved <strong>${report.summary.humanApproved}</strong></span>
      <span>plan previews <strong>${report.summary.planPreviewsPresent}</strong></span>
      <span>checklist <a href="/review/source-approval-checklist.json">JSON</a></span>
      <span>visual board <a href="/review/source-visual-board.html">HTML</a></span>
    </div>
    ${reviewCommandBuilder(report)}
    <section class="grid">${cards}</section>
  </main>
  ${builderScript()}
</body>
</html>
`;
}

const quickReviews = await readJson(paths.quickReviews);
const dossier = await readJson(paths.reviewDossier);
const planCoverage = await readJson(paths.planCoverage);
const criticRegeneration = await readJson(paths.criticRegeneration);
const criticHealth = await readJson(paths.criticHealth);
if (quickReviews.schema !== 'water9/source-quick-review-index@1') throw new Error(`Unexpected quick review schema ${quickReviews.schema ?? 'missing'}`);
if (dossier.schema !== 'water9/source-review-dossier@1') throw new Error(`Unexpected source review dossier schema ${dossier.schema ?? 'missing'}`);
if (planCoverage.schema !== 'water9/content-plan-coverage@1') throw new Error(`Unexpected plan coverage schema ${planCoverage.schema ?? 'missing'}`);
if (criticRegeneration.schema !== 'water9/source-critic-regeneration-queue@1') throw new Error(`Unexpected source critic regeneration schema ${criticRegeneration.schema ?? 'missing'}`);
if (criticHealth.schema !== 'water9/source-critic-regeneration-health@1') throw new Error(`Unexpected source critic health schema ${criticHealth.schema ?? 'missing'}`);

const dossierById = new Map((dossier.items ?? []).map((item) => [item.id, item]));
const planById = new Map((planCoverage.items ?? []).map((item) => [item.id, item]));
const criticRegenerationById = new Map((criticRegeneration.candidates ?? []).map((item) => [item.id, item]));
const criticHealthById = new Map((criticHealth.items ?? []).map((item) => [item.id, item]));
const items = (quickReviews.reviews ?? []).map((review, index) => {
  const dossierItem = dossierById.get(review.id) ?? {};
  const plan = planById.get(review.id) ?? {};
  const criticHealthItem = criticHealthById.get(review.id) ?? null;
  const criticBlocker = criticHealthItem?.status === 'replacement-applied'
    ? null
    : criticRegenerationById.get(review.id);
  const humanApproved = review.evidence?.humanApproved === true || dossierItem.approved === true;
  const mechanicallyReady = review.readyForHumanReview === true && plan.artifacts?.planPreview?.exists === true;
  const ready = mechanicallyReady && !criticBlocker;
  const sourceSandboxId = `source-${review.id}`;
  const criticRegenerationBlocker = criticBlocker
    ? {
        recommendation: criticBlocker.recommendation ?? 'regenerate',
        lane: criticBlocker.lane ?? null,
        reason: 'Not approved: source critic marked this candidate for regeneration before approval.',
        promptFile: criticBlocker.promptFile ?? null,
        sourceCriticBoard: criticBlocker.links?.sourceCriticBoard ?? '/review/source-candidates/source-critic-board.html',
        regenerationQueue: '/review/source-candidates/source-critic-regeneration-queue.html',
        commands: criticBlocker.commands ?? {},
      }
    : null;
  return {
    rank: index + 1,
    id: review.id,
    species: review.species,
    readyForHumanReview: ready,
    mechanicallyReadyForHumanReview: mechanicallyReady,
    criticRegenerationRequired: Boolean(criticBlocker),
    criticRegeneration: criticRegenerationBlocker,
    criticRegenerationHealthStatus: criticHealthItem?.status ?? null,
    humanApproved,
    planPreviewPresent: plan.artifacts?.planPreview?.exists === true,
    reviewWarning: humanApproved
      ? 'Approved source: continue with production plan prep and rigging review.'
      : criticRegenerationBlocker
        ? criticRegenerationBlocker.reason
        : 'Not approved: human reviewer must inspect source, key, sandbox preview, and plan preview before running approval.',
    evidence: review.evidence,
    metrics: review.metrics,
    contract: dossierItem.contract ?? null,
    diagnostics: {
      imageValidationMetric: dossierItem.imageValidationMetric ?? null,
      sourcePreview: dossierItem.sourcePreview ?? null,
      inputFingerprint: dossierItem.reviewItem?.inputFingerprint ?? null,
      requiredApprovalFlags: dossierItem.reviewItem?.requiredApprovalFlags ?? [],
    },
    blockers: review.blockers ?? [],
    links: {
      quickReview: review.href,
      source: review.links?.source ?? publicUrl(review.source),
      thumbnail: review.links?.thumbnail ?? null,
      keyPreview: review.links?.keyPreview ?? null,
      sandboxScreenshot: review.links?.sandboxScreenshot ?? null,
      sandboxLab: `/review/sandbox/lab.html?id=${sourceSandboxId}&with=diver`,
      sourceSandboxLive: `/?entity=${sourceSandboxId}&companion=diver`,
      runtimeSandboxLive: `/?sandbox=${review.id}&companion=diver`,
      planPreview: planPreviewUrl(plan.planPreview),
      reviewPacket: dossierItem.reviewPacket?.file ?? null,
    },
    acceptCommand: review.acceptCommand,
    acceptCommandDryRun: dryRunSourceAccept(review.acceptCommand),
    rejectCommand: review.rejectCommand,
    rejectCommandDryRun: dryRunSourceAccept(review.rejectCommand),
    commands: {
      quickReview: `npm run source:quick-review -- --id ${review.id}`,
      sandboxLab: `npm run sandbox:preview -- --id ${sourceSandboxId} --with diver --serve --open --visual`,
      sourceSandboxLive: `npm run sandbox:preview -- --id ${sourceSandboxId} --with diver --serve --open --visual`,
      runtimeSandboxLive: `npm run sandbox:preview -- --id ${review.id} --with diver --serve --open --visual`,
      planCheck: plan.commands?.planCheck ?? `npm run articulated:plan-check -- --plan tools/scratch/${review.id}-starter-plan.json`,
      productionPrepare: plan.commands?.productionPrepare ?? `npm run articulated:prepare-plan -- --id ${review.id}`,
    },
  };
});

const readyItems = items.filter((item) => item.readyForHumanReview && !item.humanApproved);
const report = {
  schema: 'water9/source-approval-runway@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    quickReviews: paths.quickReviews,
    reviewDossier: paths.reviewDossier,
    planCoverage: paths.planCoverage,
    criticRegeneration: paths.criticRegeneration,
    criticHealth: paths.criticHealth,
  },
  summary: {
    candidates: items.length,
    mechanicallyReadyForHumanReview: items.filter((item) => item.mechanicallyReadyForHumanReview && !item.humanApproved).length,
    criticRegenerationRequired: items.filter((item) => item.criticRegenerationRequired && !item.humanApproved).length,
    readyForHumanReview: readyItems.length,
    humanApproved: items.filter((item) => item.humanApproved).length,
    planPreviewsPresent: items.filter((item) => item.planPreviewPresent).length,
    missingPlanPreviews: items.filter((item) => !item.planPreviewPresent).length,
  },
  recommended: readyItems[0] ?? null,
  items,
};
const checklist = buildReviewChecklist(report);

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outChecklist, `${JSON.stringify(checklist, null, 2)}\n`);
await writeFile(paths.outMd, markdownFor(report));
await writeFile(paths.outHtml, htmlFor(report));

console.log(JSON.stringify({
  schema: report.schema,
  candidates: report.summary.candidates,
  readyForHumanReview: report.summary.readyForHumanReview,
  humanApproved: report.summary.humanApproved,
  planPreviewsPresent: report.summary.planPreviewsPresent,
  json: paths.outJson,
  checklist: paths.outChecklist,
  markdown: paths.outMd,
  html: paths.outHtml,
}, null, 2));

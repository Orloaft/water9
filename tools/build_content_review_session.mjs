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
  board: resolve(String(args.get('board') ?? 'public/review/content-human-adjudication-board.json')),
  sourceDecisions: resolve(String(args.get('source-decisions') ?? 'public/review/source-candidates/source-cohesion-decision-template.json')),
  threatDecisions: resolve(String(args.get('threat-decisions') ?? 'public/review/content-threat-acceptance-decision-template.json')),
  outJson: resolve(String(args.get('out-json') ?? 'public/review/content-review-session.json')),
  outMarkdown: resolve(String(args.get('out-md') ?? 'public/review/content-review-session.md')),
  outHtml: resolve(String(args.get('out-html') ?? 'public/review/content-review-session.html')),
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

function commandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function checksTemplate(checks) {
  return Object.fromEntries(checks.map((check) => [check, { score: null, note: '' }]));
}

function mediaTiles(item) {
  return item.media.map((entry) => `<a class="tile" href="${htmlEscape(entry.url)}" data-present="${entry.present ? 'yes' : 'no'}">
    <span>${htmlEscape(entry.label)}</span>
    <img src="${htmlEscape(entry.url)}" alt="${htmlEscape(`${item.species} ${entry.label}`)}" loading="lazy">
  </a>`).join('');
}

const board = await readJson(paths.board);
const sourceDecisions = await readJson(paths.sourceDecisions);
const threatDecisions = await readJson(paths.threatDecisions);
if (board.schema !== 'water9/content-human-adjudication-board@1') throw new Error(`unexpected board schema ${board.schema ?? 'missing'}`);
if (sourceDecisions.schema !== 'water9/source-cohesion-decision-template@1') throw new Error(`unexpected source decision schema ${sourceDecisions.schema ?? 'missing'}`);
if (threatDecisions.schema !== 'water9/content-threat-acceptance-decision-template@1') throw new Error(`unexpected threat decision schema ${threatDecisions.schema ?? 'missing'}`);

const sourceDecisionById = new Map((sourceDecisions.decisions ?? []).map((decision) => [decision.id, decision]));
const threatDecisionById = new Map((threatDecisions.decisions ?? []).map((decision) => [decision.id, decision]));
const sourceChecks = sourceDecisions.requiredCohesionChecks ?? [];
const threatChecks = threatDecisions.requiredChecks ?? [];

const items = (board.items ?? []).map((item) => {
  const sourceDecision = sourceDecisionById.get(item.id);
  const threatDecision = threatDecisionById.get(item.id);
  return {
    id: item.id,
    species: item.species,
    rank: item.rank,
    routeState: item.routeState,
    sourceReady: item.sourceReady,
    sourceApprovalReady: item.sourceApprovalReady,
    sourceCriticRegenerationRequired: item.sourceCriticRegenerationRequired,
    threatReady: item.threatReady,
    sourceApproved: item.sourceApproved,
    threatAccepted: item.threatAccepted,
    previewBoundaries: item.previewBoundaries ?? { source: null, runtime: null },
    media: item.media,
    links: item.links,
    sourceChecks,
    threatChecks,
    sourceDecision: {
      schema: sourceDecisions.decisionFileTemplate?.schema ?? 'water9/source-cohesion-decisions@1',
      status: 'needs-review',
      reviewer: '<human-reviewer>',
      overallNote: '',
      evidenceFingerprint: sourceDecision?.evidenceFingerprint ?? null,
      visualChecks: checksTemplate(sourceChecks),
    },
	    threatDecision: {
	      schema: threatDecisions.decisionFileTemplate?.schema ?? 'water9/content-threat-acceptance-decisions@1',
	      status: 'needs-review',
	      reviewer: '<human-reviewer>',
	      sourceCandidateId: item.id,
	      overallNote: '',
	      evidenceFingerprint: threatDecision?.evidenceFingerprint ?? null,
	      visualChecks: checksTemplate(threatChecks),
    },
    commands: {
      sourceApplyDryRun: 'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
      threatApplyDryRun: 'npm run content:threat-decisions-apply -- --decisions water9-threat-acceptance-decisions.json --strict',
      sourceApprovalDryRun: item.commands.sourceApprovalDryRun,
      threatAcceptanceDryRun: item.commands.threatAcceptanceDryRun,
      sourcePreview: item.commands.sourcePreview,
      runtimePreview: item.commands.runtimePreview,
    },
  };
});

const sourceDecisionFileTemplate = {
  schema: 'water9/source-cohesion-decisions@1',
  reviewer: '<human-reviewer>',
  reviewedAt: '<ISO-8601 timestamp>',
  policy: {
    humanAuthored: true,
    automationCannotApproveCohesion: true,
    inspectSourceKeySandboxAndPlan: true,
  },
  decisions: items.map((item) => ({
    id: item.id,
    species: item.species,
    status: 'needs-review',
    reviewer: '<human-reviewer>',
    overallNote: '',
    evidenceFingerprint: item.sourceDecision.evidenceFingerprint,
    failedChecks: [],
    visualChecks: checksTemplate(sourceChecks),
  })),
};

const threatDecisionFileTemplate = {
  schema: 'water9/content-threat-acceptance-decisions@1',
  reviewer: '<human-reviewer>',
  reviewedAt: '<ISO-8601 timestamp>',
  policy: {
    humanAuthored: true,
    automationCannotAcceptThreats: true,
    inspectSourceContactPhaseParityAndSandbox: true,
  },
  decisions: items.map((item) => ({
    id: item.id,
    species: item.species,
    status: 'needs-review',
    reviewer: '<human-reviewer>',
	    sourceCandidateId: item.id,
	    overallNote: '',
	    evidenceFingerprint: item.threatDecision.evidenceFingerprint,
	    visualChecks: checksTemplate(threatChecks),
	  })),
};

const report = {
  schema: 'water9/content-review-session@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    board: 'public/review/content-human-adjudication-board.json',
    sourceDecisions: 'public/review/source-candidates/source-cohesion-decision-template.json',
    threatDecisions: 'public/review/content-threat-acceptance-decision-template.json',
  },
  policy: {
    humanReviewerRequired: true,
    automationCannotApprove: true,
    sourceDecisionMustPrecedeThreatAcceptance: true,
  },
  workspace: {
    editableDecisionJson: true,
    perTargetDecisionControls: true,
    reviewedOnlyDecisionJson: true,
    storesDraftsInLocalStorage: true,
    strictValidatorsRemainRequired: true,
  },
  commands: [
    'npm run content:review-session',
    'npm run content:review-session-check',
    'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
    'npm run content:threat-decisions-apply -- --decisions water9-threat-acceptance-decisions.json --strict',
    'npm run content:threat-decisions-apply -- --decisions water9-threat-acceptance-reviewed-decisions.json --strict',
    'npm run content:goal-gate',
  ],
  summary: {
    targetThreats: board.summary?.targetThreats ?? 20,
    items: items.length,
    sourceReady: items.filter((item) => item.sourceReady).length,
    sourceApprovalReady: items.filter((item) => item.sourceApprovalReady && !item.sourceApproved).length,
    sourceCriticRegenerationRequired: items.filter((item) => item.sourceCriticRegenerationRequired && !item.sourceApproved).length,
    threatReady: items.filter((item) => item.threatReady).length,
    allMediaPresent: items.filter((item) => item.media.every((entry) => entry.present)).length,
    sourceChecks: sourceChecks.length,
    threatChecks: threatChecks.length,
    sourceApproved: items.filter((item) => item.sourceApproved).length,
    acceptedThreats: items.filter((item) => item.threatAccepted).length,
    sourcePreviewBoundaries: items.filter((item) => item.previewBoundaries.source?.productionBoundary?.schema === 'water9/sandbox-production-boundary@1').length,
    runtimePreviewBoundaries: items.filter((item) => item.previewBoundaries.runtime?.productionBoundary?.schema === 'water9/sandbox-production-boundary@1').length,
    previewOnlySources: items.filter((item) => item.previewBoundaries.source?.previewOnly === true).length,
    previewOnlyRuntimes: items.filter((item) => item.previewBoundaries.runtime?.previewOnly === true).length,
  },
  sourceDecisionFileTemplate,
  threatDecisionFileTemplate,
  items,
};

function renderMarkdown() {
  const lines = [
    '# Water9 Content Review Session',
    '',
    'Single-session workspace for human review of the 20-threat gate. It tracks per-target progress, source-review decisions, threat-acceptance decisions, evidence links, and strict apply commands.',
    '',
    'This page does not approve anything. It generates human-authored decision files that must pass strict validators before any final acceptance can occur.',
    '',
    `- Target threats: ${report.summary.targetThreats}`,
	    `- Source-ready rows: ${report.summary.sourceReady}/${report.summary.items}`,
	    `- Approval-ready sources: ${report.summary.sourceApprovalReady}/${report.summary.items}`,
	    `- Critic-regeneration sources: ${report.summary.sourceCriticRegenerationRequired}/${report.summary.items}`,
	    `- Threat-ready rows: ${report.summary.threatReady}/${report.summary.items}`,
	    `- Rows with all media: ${report.summary.allMediaPresent}/${report.summary.items}`,
	    `- Human-approved sources: ${report.summary.sourceApproved}/${report.summary.items}`,
	    `- Accepted threats: ${report.summary.acceptedThreats}/${report.summary.targetThreats}`,
	    `- Source preview boundaries: ${report.summary.sourcePreviewBoundaries}/${report.summary.items}`,
	    `- Runtime preview boundaries: ${report.summary.runtimePreviewBoundaries}/${report.summary.items}`,
	    `- Preview-only sources: ${report.summary.previewOnlySources}/${report.summary.items}`,
	    `- Preview-only runtimes: ${report.summary.previewOnlyRuntimes}/${report.summary.items}`,
	    '',
	    `Gate truth: ${report.summary.acceptedThreats >= report.summary.targetThreats ? 'complete' : 'not accepted yet. Ready means reviewable, not approved or accepted.'}`,
	    '',
	    '## Commands',
    '',
    ...report.commands.map((command) => `- \`${command}\``),
    '',
    '## Targets',
    '',
	    ...items.map((item) => `- \`${item.id}\` ${item.species}: source ${item.sourceReady ? 'ready' : 'blocked'} / ${item.sourceApproved ? 'approved' : 'not approved'}, threat ${item.threatReady ? 'ready' : 'blocked'} / ${item.threatAccepted ? 'accepted' : 'not accepted'}, source preview ${item.previewBoundaries.source?.claim ?? 'missing'}, runtime preview ${item.previewBoundaries.runtime?.claim ?? 'missing'}`),
	    '',
	  ];
  return `${lines.join('\n')}\n`;
}

function renderHtml() {
  function reviewCheckControls(kind, checks, includeFailed) {
    return `<details class="check-panel" data-${kind}-check-panel>
        <summary>${kind} checks</summary>
        <div class="check-grid">
          ${checks.map((check) => `<label><span>${htmlEscape(check)}</span><input data-${kind}-check="${htmlEscape(check)}" data-check-field="score" type="number" min="4" max="5" step="1" placeholder="4-5">${includeFailed ? `<label class="inline"><input data-${kind}-check="${htmlEscape(check)}" data-check-field="failed" type="checkbox"> failed on rejection</label>` : ''}<textarea data-${kind}-check="${htmlEscape(check)}" data-check-field="note" spellcheck="true" placeholder="Specific evidence-based note for ${htmlEscape(check)}."></textarea></label>`).join('')}
        </div>
      </details>`;
  }
  const cards = items.map((item) => `<article class="card" data-review-session-target="${htmlEscape(item.id)}">
    <header>
      <div><h2>${htmlEscape(item.species)}</h2><code>${htmlEscape(item.id)}</code></div>
      <label><input type="checkbox" data-progress="${htmlEscape(item.id)}"> reviewed</label>
    </header>
    <div class="badges">
      <span>source <strong>${item.sourceReady ? 'ready' : 'blocked'}</strong></span>
      <span>approval <strong>${item.sourceApprovalReady ? 'ready' : 'blocked'}</strong></span>
      <span>critic regeneration <strong>${item.sourceCriticRegenerationRequired ? 'yes' : 'no'}</strong></span>
      <span>threat <strong>${item.threatReady ? 'ready' : 'blocked'}</strong></span>
      <span>media <strong>${item.media.filter((entry) => entry.present).length}/${item.media.length}</strong></span>
    </div>
    <div class="boundary">
      <span>source preview boundary <strong>${htmlEscape(item.previewBoundaries.source?.claim ?? 'missing')}</strong></span>
      <span>runtime preview boundary <strong>${htmlEscape(item.previewBoundaries.runtime?.claim ?? 'missing')}</strong></span>
    </div>
    <div class="media">${mediaTiles(item)}</div>
    <div class="links">
      <a href="${htmlEscape(item.links.cockpit ?? '#')}">cockpit</a>
      <a href="${htmlEscape(item.links.sourceSandbox ?? '#')}">source sandbox</a>
      <a href="${htmlEscape(item.links.runtimeSandbox ?? '#')}">runtime sandbox</a>
      <a href="${htmlEscape(item.links.audit ?? '#')}">audit</a>
    </div>
    <div class="decision-controls" data-decision-controls="${htmlEscape(item.id)}">
      <label>source
        <select data-source-status="${htmlEscape(item.id)}">
          <option value="needs-review">needs review</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
        </select>
      </label>
	      <label>threat
	        <select data-threat-status="${htmlEscape(item.id)}">
	          <option value="needs-review">needs review</option>
	          <option value="accepted">accepted</option>
	          <option value="prototype">prototype</option>
	        </select>
	      </label>
      <label class="wide">source note
        <textarea data-source-note="${htmlEscape(item.id)}" spellcheck="true" placeholder="Human source review note with concrete visual evidence."></textarea>
      </label>
      <label class="wide">threat note
	        <textarea data-threat-note="${htmlEscape(item.id)}" spellcheck="true" placeholder="Human threat acceptance note after source, contact, phase, parity, and sandbox review."></textarea>
	      </label>
	      <div class="wide">${reviewCheckControls('source', item.sourceChecks, true)}</div>
	      <div class="wide">${reviewCheckControls('threat', item.threatChecks, false)}</div>
	    </div>
    <h3>Preview Commands</h3>
    ${commandBlock([item.commands.sourcePreview, item.commands.runtimePreview])}
    <h3>Dry-Run Decision Commands</h3>
    ${commandBlock([item.commands.sourceApprovalDryRun, item.commands.threatAcceptanceDryRun])}
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Water9 Content Review Session</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background:#061014; color:#e5f6f8; }
      body { margin:0; background:#061014; }
      main { max-width:1440px; margin:0 auto; padding:28px 18px 48px; }
      h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4.2rem); letter-spacing:0; }
      h2 { margin:0; font-size:1.1rem; }
      h3 { margin:12px 0 8px; color:#9db7c2; font-size:.82rem; text-transform:uppercase; }
      p { color:#aec3ca; line-height:1.45; }
      code, pre { color:#cfeef6; overflow-wrap:anywhere; font-family:"SFMono-Regular", Consolas, monospace; }
      pre { margin:0; border:1px solid #203b46; background:#041014; padding:10px; white-space:pre-wrap; }
      textarea { width:100%; min-height:260px; resize:vertical; border:1px solid #203b46; border-radius:6px; background:#041014; color:#d9f0f5; padding:10px; font:12px/1.45 "SFMono-Regular", Consolas, monospace; }
      input, select { border:1px solid #203b46; border-radius:5px; background:#041014; color:#d9f0f5; padding:7px 8px; }
      button { border:1px solid #244551; border-radius:5px; background:#0d2a34; color:#d9f0f5; padding:8px 10px; cursor:pointer; }
      .notice { border:1px solid #6a5230; border-radius:6px; background:#1d1710; color:#f0d9aa; padding:10px 12px; margin:16px 0; }
      .summary, .badges, .links, .boundary { display:flex; flex-wrap:wrap; gap:8px; margin:12px 0; }
      .summary span, .badges span, .boundary span { border:1px solid #294653; border-radius:6px; background:#0b1d24; padding:8px 10px; color:#bdd6df; }
      .boundary span { border-color:#6a5230; background:#1d1710; color:#f0d9aa; }
      .workspace, .card { border:1px solid #203b46; background:#081920; border-radius:8px; padding:14px; }
      .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(560px,1fr)); gap:14px; align-items:start; margin-top:14px; }
      .card header { display:flex; justify-content:space-between; gap:12px; align-items:start; }
      .media { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px; margin:12px 0; }
      .tile { display:block; min-height:106px; border:1px solid #1f3a45; background:#030a0d; text-decoration:none; overflow:hidden; }
      .tile span { display:block; padding:5px 6px; color:#9db7c2; font-size:.72rem; }
      .tile img { display:block; width:100%; height:90px; object-fit:contain; background:#050b0e; }
      .links a, .download { color:#7ee8ff; text-decoration:none; border:1px solid #244551; border-radius:5px; padding:6px 8px; }
      .columns { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
      .reviewer-row, .decision-controls { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin:12px 0; }
	      .decision-controls label, .reviewer-row label { display:grid; gap:5px; color:#9db7c2; font-size:.78rem; text-transform:uppercase; }
	      .decision-controls .wide { grid-column:1 / -1; }
	      .decision-controls textarea { min-height:82px; font-family:inherit; font-size:.85rem; }
	      .check-panel { grid-column:1 / -1; border:1px solid #1f3a45; border-radius:6px; padding:8px; background:#061219; }
	      .check-panel summary { cursor:pointer; color:#d9f0f5; font-weight:700; }
	      .check-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:8px; margin-top:8px; }
	      .check-grid textarea { min-height:74px; }
	      .inline { display:flex; align-items:center; gap:6px; margin:5px 0; color:#9db7c2; }
	      .inline input { width:auto; }
      @media (max-width:760px) { main { padding:18px 10px 32px; } .grid,.columns { grid-template-columns:1fr; } .media { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    </style>
  </head>
  <body>
    <main>
      <h1>Content Review Session</h1>
      <p>Single-session workspace for human review of the 20-threat gate. Review evidence, track progress, and export strict source and threat decision files.</p>
      <div class="notice">Human Approval Boundary: this page does not approve anything. It only generates human-authored decision files for strict validators.</div>
      <div class="notice">Gate truth: ${report.summary.acceptedThreats >= report.summary.targetThreats ? 'complete' : 'not accepted yet. Ready means reviewable, not approved or accepted.'}</div>
      <div class="summary">
        <span>${report.summary.sourceReady}/${report.summary.items} source-ready</span>
        <span>${report.summary.sourceApprovalReady}/${report.summary.items} approval-ready</span>
        <span>${report.summary.sourceCriticRegenerationRequired}/${report.summary.items} critic-regeneration</span>
        <span>${report.summary.threatReady}/${report.summary.items} threat-ready</span>
        <span>${report.summary.allMediaPresent}/${report.summary.items} all media present</span>
        <span>${report.summary.sourceApproved} approved sources</span>
        <span>${report.summary.acceptedThreats} accepted threats</span>
        <span>${report.summary.sourcePreviewBoundaries}/${report.summary.items} source boundaries</span>
        <span>${report.summary.runtimePreviewBoundaries}/${report.summary.items} runtime boundaries</span>
        <span>${report.summary.previewOnlyRuntimes}/${report.summary.items} preview-only runtimes</span>
      </div>
      <section class="workspace" data-review-session-workspace>
        <h2>Decision File Workspace</h2>
        <p>Use the target cards below for evidence review. The generated files start as pending decisions and must be filled with human notes, scores, and reviewer identity before strict apply commands can pass.</p>
        ${commandBlock(report.commands)}
        <div class="reviewer-row">
          <label>reviewer
            <input data-reviewer value="<human-reviewer>" spellcheck="false">
          </label>
          <label>reviewed at
            <input data-reviewed-at value="&lt;ISO-8601 timestamp&gt;" spellcheck="false">
          </label>
        </div>
        <p><button type="button" data-regenerate-decisions>Regenerate decision JSON from controls</button></p>
        <div class="columns">
          <div>
            <h3>Source Decision File</h3>
            <textarea id="source-decision-output" data-source-decision-output spellcheck="false"></textarea>
            <p><a class="download" id="source-decision-download" href="#" download="water9-source-cohesion-decisions.json">Download source decisions</a></p>
            <h3>Reviewed-Only Source File</h3>
            <textarea id="source-reviewed-decision-output" data-source-reviewed-decision-output spellcheck="false"></textarea>
            <p><a class="download" id="source-reviewed-decision-download" href="#" download="water9-source-cohesion-reviewed-decisions.json">Download reviewed-only source decisions</a></p>
          </div>
          <div>
            <h3>Threat Decision File</h3>
            <textarea id="threat-decision-output" data-threat-decision-output spellcheck="false"></textarea>
            <p><a class="download" id="threat-decision-download" href="#" download="water9-threat-acceptance-decisions.json">Download threat decisions</a></p>
            <h3>Reviewed-Only Threat File</h3>
            <textarea id="threat-reviewed-decision-output" data-threat-reviewed-decision-output spellcheck="false"></textarea>
            <p><a class="download" id="threat-reviewed-decision-download" href="#" download="water9-threat-acceptance-reviewed-decisions.json">Download reviewed-only threat decisions</a></p>
          </div>
        </div>
      </section>
      <section class="grid">${cards}</section>
    </main>
    <script>
      const sourceTemplate = ${JSON.stringify(sourceDecisionFileTemplate)};
      const threatTemplate = ${JSON.stringify(threatDecisionFileTemplate)};
      const sourceOutput = document.querySelector('[data-source-decision-output]');
      const threatOutput = document.querySelector('[data-threat-decision-output]');
      const sourceReviewedOutput = document.querySelector('[data-source-reviewed-decision-output]');
      const threatReviewedOutput = document.querySelector('[data-threat-reviewed-decision-output]');
      const sourceDownload = document.querySelector('#source-decision-download');
      const threatDownload = document.querySelector('#threat-decision-download');
      const sourceReviewedDownload = document.querySelector('#source-reviewed-decision-download');
      const threatReviewedDownload = document.querySelector('#threat-reviewed-decision-download');
      const reviewerInput = document.querySelector('[data-reviewer]');
      const reviewedAtInput = document.querySelector('[data-reviewed-at]');
      const regenerateButton = document.querySelector('[data-regenerate-decisions]');
      const progressInputs = [...document.querySelectorAll('[data-progress]')];
      const decisionControls = [...document.querySelectorAll('[data-decision-controls]')];
      const progressKey = 'water9.contentReviewSession.progress';
      const draftKey = 'water9.contentReviewSession.draft';
      function writeDownload(link, text) {
        const previous = link.dataset.objectUrl;
        if (previous) URL.revokeObjectURL(previous);
        const href = URL.createObjectURL(new Blob([text + '\\n'], { type: 'application/json' }));
        link.href = href;
        link.dataset.objectUrl = href;
      }
      function syncDownloads() {
        writeDownload(sourceDownload, sourceOutput.value);
        writeDownload(threatDownload, threatOutput.value);
        writeDownload(sourceReviewedDownload, sourceReviewedOutput.value);
        writeDownload(threatReviewedDownload, threatReviewedOutput.value);
      }
	      function draftFromControls() {
	        return {
	          reviewer: reviewerInput.value,
	          reviewedAt: reviewedAtInput.value,
	          targets: Object.fromEntries(decisionControls.map((node) => {
	            const id = node.dataset.decisionControls;
	            return [id, {
	              sourceStatus: node.querySelector('[data-source-status]').value,
	              threatStatus: node.querySelector('[data-threat-status]').value,
	              sourceNote: node.querySelector('[data-source-note]').value,
	              threatNote: node.querySelector('[data-threat-note]').value,
	              sourceChecks: readCheckDraft(node, 'source', sourceTemplate.decisions.find((decision) => decision.id === id)?.visualChecks ?? {}),
	              threatChecks: readCheckDraft(node, 'threat', threatTemplate.decisions.find((decision) => decision.id === id)?.visualChecks ?? {}),
	            }];
	          })),
	        };
	      }
	      function readCheckDraft(node, kind, checkTemplate) {
	        return Object.fromEntries(Object.keys(checkTemplate).map((check) => [check, {
	          score: node.querySelector(\`[data-\${kind}-check="\${CSS.escape(check)}"][data-check-field="score"]\`)?.value ?? '',
	          note: node.querySelector(\`[data-\${kind}-check="\${CSS.escape(check)}"][data-check-field="note"]\`)?.value ?? '',
	          failed: node.querySelector(\`[data-\${kind}-check="\${CSS.escape(check)}"][data-check-field="failed"]\`)?.checked === true,
	        }]));
	      }
	      function readVisualChecks(node, kind, checkTemplate) {
	        return Object.fromEntries(Object.keys(checkTemplate).map((check) => {
	          const scoreValue = node.querySelector(\`[data-\${kind}-check="\${CSS.escape(check)}"][data-check-field="score"]\`)?.value;
	          const note = node.querySelector(\`[data-\${kind}-check="\${CSS.escape(check)}"][data-check-field="note"]\`)?.value ?? '';
	          const failed = node.querySelector(\`[data-\${kind}-check="\${CSS.escape(check)}"][data-check-field="failed"]\`)?.checked === true;
	          const entry = { score: scoreValue ? Number(scoreValue) : null, note };
	          if (kind === 'source') entry.failed = failed;
	          return [check, entry];
	        }));
	      }
	      function readFailedChecks(node, checkTemplate) {
	        return Object.keys(checkTemplate).filter((check) => node.querySelector(\`[data-source-check="\${CSS.escape(check)}"][data-check-field="failed"]\`)?.checked === true);
	      }
	      function applyCheckDraft(node, kind, values) {
	        for (const [check, fields] of Object.entries(values ?? {})) {
	          const score = node.querySelector(\`[data-\${kind}-check="\${CSS.escape(check)}"][data-check-field="score"]\`);
	          const note = node.querySelector(\`[data-\${kind}-check="\${CSS.escape(check)}"][data-check-field="note"]\`);
	          const failed = node.querySelector(\`[data-\${kind}-check="\${CSS.escape(check)}"][data-check-field="failed"]\`);
	          if (score && typeof fields.score === 'string') score.value = fields.score;
	          if (note && typeof fields.note === 'string') note.value = fields.note;
	          if (failed) failed.checked = fields.failed === true;
	        }
	      }
	      function applyDraft(draft) {
        if (!draft || typeof draft !== 'object') return;
        if (draft.reviewer) reviewerInput.value = draft.reviewer;
        if (draft.reviewedAt) reviewedAtInput.value = draft.reviewedAt;
        for (const node of decisionControls) {
          const id = node.dataset.decisionControls;
          const target = draft.targets?.[id];
          if (!target) continue;
	          node.querySelector('[data-source-status]').value = target.sourceStatus ?? 'needs-review';
	          node.querySelector('[data-threat-status]').value = target.threatStatus ?? 'needs-review';
	          node.querySelector('[data-source-note]').value = target.sourceNote ?? '';
	          node.querySelector('[data-threat-note]').value = target.threatNote ?? '';
	          applyCheckDraft(node, 'source', target.sourceChecks);
	          applyCheckDraft(node, 'threat', target.threatChecks);
	        }
	      }
      function decisionById(template) {
        return new Map(template.decisions.map((decision) => [decision.id, decision]));
      }
      function buildSourceDecisionFile() {
        const draft = draftFromControls();
        const decisionsById = decisionById(sourceTemplate);
        return {
          ...sourceTemplate,
          reviewer: draft.reviewer,
          reviewedAt: draft.reviewedAt === '<ISO-8601 timestamp>' ? new Date().toISOString() : draft.reviewedAt,
	          decisions: sourceTemplate.decisions.map((decision) => {
	            const target = draft.targets[decision.id] ?? {};
	            const base = decisionsById.get(decision.id) ?? decision;
	            const node = document.querySelector(\`[data-decision-controls="\${CSS.escape(decision.id)}"]\`);
	            return {
	              ...base,
	              status: target.sourceStatus ?? 'needs-review',
	              reviewer: draft.reviewer,
	              overallNote: target.sourceNote ?? '',
	              failedChecks: node ? readFailedChecks(node, base.visualChecks ?? {}) : base.failedChecks ?? [],
	              visualChecks: node ? readVisualChecks(node, 'source', base.visualChecks ?? {}) : base.visualChecks,
	            };
	          }),
        };
      }
      function buildThreatDecisionFile() {
        const draft = draftFromControls();
        return {
          ...threatTemplate,
          reviewer: draft.reviewer,
          reviewedAt: draft.reviewedAt === '<ISO-8601 timestamp>' ? new Date().toISOString() : draft.reviewedAt,
	          decisions: threatTemplate.decisions.map((decision) => {
	            const target = draft.targets[decision.id] ?? {};
	            const node = document.querySelector(\`[data-decision-controls="\${CSS.escape(decision.id)}"]\`);
	            return {
	              ...decision,
	              status: target.threatStatus ?? 'needs-review',
	              reviewer: draft.reviewer,
	              overallNote: target.threatNote ?? '',
	              visualChecks: node ? readVisualChecks(node, 'threat', decision.visualChecks ?? {}) : decision.visualChecks,
	            };
	          }),
        };
      }
      function reviewedOnlyDecisionFile(file) {
        return {
          ...file,
          decisions: file.decisions.filter((decision) => decision.status !== 'needs-review'),
        };
      }
      function update() {
        const progress = Object.fromEntries(progressInputs.map((input) => [input.dataset.progress, input.checked]));
        localStorage.setItem(progressKey, JSON.stringify(progress));
        localStorage.setItem(draftKey, JSON.stringify(draftFromControls()));
        const sourceFile = buildSourceDecisionFile();
        const threatFile = buildThreatDecisionFile();
        sourceOutput.value = JSON.stringify(sourceFile, null, 2);
        threatOutput.value = JSON.stringify(threatFile, null, 2);
        sourceReviewedOutput.value = JSON.stringify(reviewedOnlyDecisionFile(sourceFile), null, 2);
        threatReviewedOutput.value = JSON.stringify(reviewedOnlyDecisionFile(threatFile), null, 2);
        syncDownloads();
      }
      const saved = JSON.parse(localStorage.getItem(progressKey) || '{}');
      for (const input of progressInputs) input.checked = saved[input.dataset.progress] === true;
      applyDraft(JSON.parse(localStorage.getItem(draftKey) || 'null'));
      if (reviewedAtInput.value === '<ISO-8601 timestamp>') reviewedAtInput.value = new Date().toISOString();
      for (const node of decisionControls) node.addEventListener('input', update);
      reviewerInput.addEventListener('input', update);
      reviewedAtInput.addEventListener('input', update);
      regenerateButton.addEventListener('click', update);
      for (const input of progressInputs) input.addEventListener('change', update);
      sourceOutput.addEventListener('input', syncDownloads);
      threatOutput.addEventListener('input', syncDownloads);
      sourceReviewedOutput.addEventListener('input', syncDownloads);
      threatReviewedOutput.addEventListener('input', syncDownloads);
      update();
    </script>
  </body>
</html>
`;
}

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, renderMarkdown());
await writeFile(paths.outHtml, renderHtml());

console.log(JSON.stringify({
  schema: report.schema,
  items: report.summary.items,
      sourceReady: report.summary.sourceReady,
      sourceApprovalReady: report.summary.sourceApprovalReady,
      sourceCriticRegenerationRequired: report.summary.sourceCriticRegenerationRequired,
      threatReady: report.summary.threatReady,
  outJson: paths.outJson,
  outMarkdown: paths.outMarkdown,
  outHtml: paths.outHtml,
}, null, 2));

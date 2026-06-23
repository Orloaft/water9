import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
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
  cohesionReview: resolve(String(args.get('cohesion-review') ?? 'public/review/source-candidates/source-cohesion-review.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-cohesion-decision-template.json')),
  outMd: resolve(String(args.get('md-out') ?? 'public/review/source-candidates/source-cohesion-decision-template.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-cohesion-decision-template.html')),
};

const SOURCE_APPROVAL_CHECKS = [
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

function commandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function decisionSnippet(decision, requiredChecks) {
  return JSON.stringify({
    id: decision.id,
    species: decision.species,
    status: 'needs-review',
    reviewer: '<human-reviewer>',
    overallNote: '',
    evidenceFingerprint: decision.evidenceFingerprint,
    failedChecks: [],
    visualChecks: decisionFields(requiredChecks),
  }, null, 2);
}

function decisionFields(requiredChecks) {
  return Object.fromEntries(requiredChecks.map((check) => [check, { score: null, note: '' }]));
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function localPathForEvidenceUrl(url) {
  if (!url) return null;
  const cleanUrl = String(url).split(/[?#]/)[0];
  if (cleanUrl.startsWith('/assets/')) return resolve('public', cleanUrl.slice(1));
  if (cleanUrl.startsWith('/review/')) return resolve('public', cleanUrl.slice(1));
  if (cleanUrl.startsWith('public/')) return resolve(cleanUrl);
  return null;
}

async function fileEvidence(label, url) {
  const path = localPathForEvidenceUrl(url);
  if (!path) return { label, url: url ?? null, path: null, exists: false, size: 0, sha256: null };
  try {
    const info = await stat(path);
    if (!info.isFile()) return { label, url, path, exists: false, size: 0, sha256: null };
    const sha256 = createHash('sha256').update(await readFile(path)).digest('hex');
    return { label, url, path, exists: true, size: info.size, sha256 };
  } catch {
    return { label, url, path, exists: false, size: 0, sha256: null };
  }
}

async function evidenceFingerprintFor(decision) {
  const files = Object.fromEntries(await Promise.all([
    ['source', decision.evidence.source],
    ['keyPreview', decision.evidence.keyPreview],
    ['sandboxScreenshot', decision.evidence.sandboxScreenshot],
    ['planPreview', decision.evidence.planPreview],
  ].map(async ([label, url]) => [label, await fileEvidence(label, url)])));
  const payload = {
    schema: 'water9/source-cohesion-evidence-fingerprint@1',
    id: decision.id,
    species: decision.species,
    files: Object.fromEntries(Object.entries(files).map(([label, file]) => [label, {
      url: file.url,
      exists: file.exists,
      size: file.size,
      sha256: file.sha256,
    }])),
  };
  return {
    ...payload,
    digest: createHash('sha256').update(stableJson(payload)).digest('hex'),
  };
}

function markdownFor(report) {
  const rows = report.decisions.map((decision) => `| ${decision.id} | ${decision.species} | ${decision.status} | ${decision.readyForCohesionReview ? 'yes' : 'no'} | ${decision.humanCohesionApproved ? 'yes' : 'no'} | ${decision.blockers.join('; ')} |`).join('\n');
  return `# Water 9 Source Cohesion Batch Decision Template

Generated: \`${report.generatedAt}\`

Water 9 Source Cohesion Batch Decisions

This file is a structured handoff for human source/cohesion review. This page does not approve content automatically. It does not approve anything by itself. A reviewer must inspect each source, key preview, sandbox preview, and plan preview before copying decisions into approval commands.

## Workflow

1. Open \`public/review/source-candidates/source-cohesion-decision-template.html\`.
2. Review each candidate's source, key preview, sandbox preview, and plan preview.
3. Copy \`decisionFileTemplate\` from the JSON output into a working review file.
4. Replace \`<human-reviewer>\`, set each decision to \`approved\` or \`rejected\`, and fill every score/note field.
5. Use each generated source approval command only after the notes are specific and human-authored.

## Commands

\`\`\`bash
npm run source:cohesion-decisions && npm run source:cohesion-decisions-check
npm run source:cohesion-decisions-apply
npm run source:cohesion-review && npm run source:cohesion-review-check
\`\`\`

## Required Checks

${report.requiredCohesionChecks.map((check) => `- \`${check}\``).join('\n')}

## Evidence Preview

The HTML handoff embeds source, magenta key, sandbox, and plan-preview images inline for each candidate. Use the markdown links and generated review pages when working outside the browser.

## Decision JSON Starter

Each HTML candidate card includes a copyable JSON starter for that one decision. Paste completed human-authored decisions into a working \`water9/source-cohesion-decisions@1\` file before running the dry-run/apply command.

## Summary

- Candidates: ${report.summary.candidates}
- Ready for cohesion review: ${report.summary.readyForCohesionReview}
- Human cohesion approved: ${report.summary.humanCohesionApproved}
- Prototype locked: ${report.summary.prototypeLocked}

## Decisions

| Candidate | Species | Default status | Ready | Approved | Blockers |
| --- | --- | --- | ---: | ---: | --- |
${rows}
`;
}

function htmlFor(report) {
  const workspaceJson = JSON.stringify(report.decisionFileTemplate);
  const rows = report.decisions.map((decision) => {
    const evidenceTiles = [
      ['source', decision.evidence.source],
      ['magenta key', decision.evidence.keyPreview],
      ['sandbox', decision.evidence.sandboxScreenshot],
      ['plan', decision.evidence.planPreview],
    ].filter(([, href]) => href).map(([label, href]) => `<a class="evidence-tile" href="${htmlEscape(href)}">
        <img src="${htmlEscape(href)}" alt="${htmlEscape(`${decision.species} ${label}`)}" loading="lazy">
        <span>${htmlEscape(label)}</span>
      </a>`).join('');
    return `<article class="card" data-source-cohesion-decision="${htmlEscape(decision.id)}">
    <header>
      <div><h2>${htmlEscape(decision.species)}</h2><code>${htmlEscape(decision.id)}</code></div>
      <strong>${htmlEscape(decision.status)}</strong>
    </header>
    <div class="links">
      <a href="${htmlEscape(decision.evidence.source)}">source</a>
      <a href="${htmlEscape(decision.evidence.keyPreview)}">magenta key</a>
      <a href="${htmlEscape(decision.evidence.sandboxScreenshot)}">sandbox preview</a>
      <a href="${htmlEscape(decision.evidence.planPreview)}">plan preview</a>
      <a href="${htmlEscape(decision.evidence.cohesionReview)}">cohesion page</a>
    </div>
    <h3>Evidence Preview</h3>
    <div class="evidence-grid">${evidenceTiles}</div>
    <p>${htmlEscape(decision.instructions)}</p>
    <h3>Required Fields</h3>
    <ul>${Object.keys(decision.visualChecks).map((check) => `<li><code>${htmlEscape(check)}</code> score 4-5 and a specific human note</li>`).join('')}</ul>
    <h3>Decision JSON Starter</h3>
    <textarea readonly spellcheck="false">${htmlEscape(decisionSnippet(decision, report.requiredCohesionChecks))}</textarea>
    <h3>Commands</h3>
    ${commandBlock([decision.commands.quickReview, decision.commands.sourceApproval, decision.commands.accept, decision.commands.reject])}
  </article>`;
  }).join('\n');
	  const formRows = report.decisions.map((decision) => `<article class="decision-form" data-decision-form="${htmlEscape(decision.id)}">
      <header>
        <div><strong>${htmlEscape(decision.species)}</strong><code>${htmlEscape(decision.id)}</code></div>
        <select data-field="status" aria-label="${htmlEscape(`${decision.species} decision status`)}">
          <option value="needs-review">needs review</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
        </select>
      </header>
      <label>Overall note <textarea data-field="overallNote" rows="3" spellcheck="true"></textarea></label>
      <details>
        <summary>Scores and visual notes</summary>
        <div class="check-grid">
          ${report.requiredCohesionChecks.map((check) => `<label><span>${htmlEscape(check)}</span><input data-check="${htmlEscape(check)}" data-check-field="score" type="number" min="4" max="5" step="1" placeholder="4-5"><label class="inline"><input data-check="${htmlEscape(check)}" data-check-field="failed" type="checkbox"> failed on rejection</label><textarea data-check="${htmlEscape(check)}" data-check-field="note" rows="2" spellcheck="true"></textarea></label>`).join('')}
        </div>
      </details>
    </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Cohesion Batch Decisions</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0d1b20; --line:#29444b; --text:#e6f5f5; --muted:#91a9ae; --accent:#7adff6; --warn:#e7bd6d; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1360px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:0; font-size:18px; }
    h3 { margin:14px 0 8px; color:var(--muted); font-size:13px; text-transform:uppercase; }
    p { color:var(--muted); }
    a { color:var(--accent); text-decoration:none; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { margin:0; border:1px solid var(--line); background:#050b0d; padding:10px; overflow:auto; white-space:pre-wrap; }
    textarea { width:100%; min-height:310px; resize:vertical; border:1px solid var(--line); border-radius:5px; background:#050b0d; color:var(--text); padding:10px; font:12px/1.45 "SFMono-Regular",Consolas,monospace; }
    input, select { width:100%; border:1px solid var(--line); border-radius:5px; background:#050b0d; color:var(--text); padding:7px 8px; font:13px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    label { display:block; color:var(--muted); }
    label span { display:block; margin-bottom:4px; color:var(--text); }
    .summary, .links { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }
    .summary span, .links a { border:1px solid var(--line); background:#09171b; border-radius:5px; padding:7px 9px; color:var(--muted); }
    strong { color:var(--text); }
    .policy, .card { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:14px; }
    .workspace { border:1px solid var(--line); background:#0a171c; border-radius:7px; padding:14px; margin:14px 0; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(430px,1fr)); gap:14px; align-items:start; margin-top:14px; }
    .card header { display:flex; justify-content:space-between; gap:12px; align-items:start; }
    .decision-form { border:1px solid #1f3942; background:#071318; border-radius:6px; padding:12px; }
    .decision-form header { display:grid; grid-template-columns:1fr 150px; gap:10px; align-items:start; margin-bottom:10px; }
	    .decision-form code { display:block; margin-top:3px; color:var(--muted); }
	    .decision-forms { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:10px; margin:12px 0; }
	    .review-toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:end; margin:12px 0; }
	    .review-toolbar label { min-width:210px; }
	    .review-toolbar button { border:1px solid var(--line); border-radius:5px; background:#10252d; color:var(--text); padding:8px 10px; cursor:pointer; }
	    .review-toolbar button:hover { border-color:var(--accent); }
	    .review-progress { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:8px; margin:12px 0; }
	    .review-progress span { border:1px solid var(--line); border-radius:5px; background:#071318; padding:8px 10px; color:var(--muted); }
	    .review-progress strong { display:block; font-size:18px; }
	    .check-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:8px; margin-top:10px; }
    .check-grid textarea { min-height:74px; margin-top:5px; }
    .inline { display:flex; align-items:center; gap:6px; margin:5px 0; color:var(--muted); }
    .inline input { width:auto; }
    .evidence-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-bottom:12px; }
    .evidence-tile { display:block; border:1px solid var(--line); border-radius:5px; overflow:hidden; background:#050b0d; }
    .evidence-tile img { display:block; width:100%; aspect-ratio:16/10; object-fit:contain; background:#020607; }
    .evidence-tile span { display:block; padding:6px 8px; color:var(--muted); }
    .warning { color:var(--warn); }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Source Cohesion Batch Decisions</h1>
    <p>Water 9 Source Cohesion Batch Decision Template</p>
    <p>Structured human-review handoff for approving or rejecting source cohesion in batches. This page does not approve content automatically.</p>
    <div class="summary">
      <span>candidates <strong>${report.summary.candidates}</strong></span>
      <span>ready <strong>${report.summary.readyForCohesionReview}</strong></span>
      <span>human approved <strong>${report.summary.humanCohesionApproved}</strong></span>
      <span>prototype locked <strong>${report.summary.prototypeLocked}</strong></span>
    </div>
    <section class="policy">
      <h2>Workflow</h2>
      <p class="warning">A filled decision file is review evidence only. The actual approval command still requires explicit human reviewer, notes, scores, and source-reviewed flags.</p>
      ${commandBlock(['npm run source:cohesion-decisions && npm run source:cohesion-decisions-check', 'npm run source:cohesion-decisions-apply', 'npm run source:cohesion-review && npm run source:cohesion-review-check'])}
    </section>
	    <section class="workspace" data-decision-workspace>
	      <h2>Batch Decision Workspace</h2>
	      <p>Fill the reviewer and candidate decisions after inspecting the evidence. The generated JSON is compatible with <code>npm run source:cohesion-decisions-apply -- --decisions &lt;decision-file.json&gt; --strict</code>.</p>
	      <label><span>Reviewer</span><input id="decision-reviewer" value="&lt;human-reviewer&gt;" autocomplete="off"></label>
	      <div class="review-progress" data-review-progress>
	        <span>reviewed <strong data-progress-count="reviewed">0</strong></span>
	        <span>approved <strong data-progress-count="approved">0</strong></span>
	        <span>rejected <strong data-progress-count="rejected">0</strong></span>
	        <span>needs review <strong data-progress-count="needs-review">0</strong></span>
	      </div>
	      <div class="review-toolbar">
	        <label><span>Filter</span><select data-review-filter>
	          <option value="all">all candidates</option>
	          <option value="needs-review">needs review</option>
	          <option value="approved">approved</option>
	          <option value="rejected">rejected</option>
	        </select></label>
	        <button type="button" data-clear-review-draft>Clear saved draft</button>
	      </div>
	      <div class="decision-forms">${formRows}</div>
      <h3>Generated Decision File</h3>
      <textarea id="decision-output" data-decision-output readonly spellcheck="false"></textarea>
      <p><a id="decision-download" href="#" download="water9-source-cohesion-reviewed-decisions.json">Download reviewed decision file</a></p>
      ${commandBlock(['npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict', 'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict --apply'])}
    </section>
    <section class="grid">${rows}</section>
  </main>
  <script>
    const baseDecisionFile = ${workspaceJson};
    const requiredChecks = ${JSON.stringify(report.requiredCohesionChecks)};
	    const output = document.querySelector('[data-decision-output]');
	    const reviewerInput = document.querySelector('#decision-reviewer');
	    const downloadLink = document.querySelector('#decision-download');
	    const forms = [...document.querySelectorAll('[data-decision-form]')];
	    const filterSelect = document.querySelector('[data-review-filter]');
	    const clearDraftButton = document.querySelector('[data-clear-review-draft]');
	    const draftKey = 'water9.sourceCohesionDecisionWorkspace.v1';
	    function matchingCard(id) {
	      return document.querySelector(\`[data-source-cohesion-decision="\${CSS.escape(id)}"]\`);
	    }
	    function readDecisionForm(form) {
      const id = form.getAttribute('data-decision-form');
      const base = baseDecisionFile.decisions.find((decision) => decision.id === id);
      const visualChecks = {};
      const failedChecks = [];
      for (const check of requiredChecks) {
        const scoreValue = form.querySelector(\`[data-check="\${CSS.escape(check)}"][data-check-field="score"]\`)?.value;
        const note = form.querySelector(\`[data-check="\${CSS.escape(check)}"][data-check-field="note"]\`)?.value ?? '';
        const failed = form.querySelector(\`[data-check="\${CSS.escape(check)}"][data-check-field="failed"]\`)?.checked === true;
        if (failed) failedChecks.push(check);
        visualChecks[check] = { score: scoreValue ? Number(scoreValue) : null, note, failed };
      }
      return {
        id,
        species: base?.species ?? id,
        status: form.querySelector('[data-field="status"]')?.value ?? 'needs-review',
        reviewer: reviewerInput.value,
        overallNote: form.querySelector('[data-field="overallNote"]')?.value ?? '',
        evidenceFingerprint: base?.evidenceFingerprint ?? null,
        failedChecks,
	        visualChecks,
	      };
	    }
	    function setCount(name, value) {
	      const node = document.querySelector(\`[data-progress-count="\${CSS.escape(name)}"]\`);
	      if (node) node.textContent = String(value);
	    }
	    function readDraftState() {
	      return {
	        reviewer: reviewerInput.value,
	        filter: filterSelect?.value ?? 'all',
	        decisions: Object.fromEntries(forms.map((form) => {
	          const id = form.getAttribute('data-decision-form');
	          const checks = {};
	          for (const check of requiredChecks) {
	            checks[check] = {
	              score: form.querySelector(\`[data-check="\${CSS.escape(check)}"][data-check-field="score"]\`)?.value ?? '',
	              note: form.querySelector(\`[data-check="\${CSS.escape(check)}"][data-check-field="note"]\`)?.value ?? '',
	              failed: form.querySelector(\`[data-check="\${CSS.escape(check)}"][data-check-field="failed"]\`)?.checked === true,
	            };
	          }
	          return [id, {
	            status: form.querySelector('[data-field="status"]')?.value ?? 'needs-review',
	            overallNote: form.querySelector('[data-field="overallNote"]')?.value ?? '',
	            checks,
	          }];
	        })),
	      };
	    }
	    function saveDraft() {
	      localStorage.setItem(draftKey, JSON.stringify(readDraftState()));
	    }
	    function applyDraft() {
	      let draft = null;
	      try {
	        draft = JSON.parse(localStorage.getItem(draftKey) ?? 'null');
	      } catch {
	        draft = null;
	      }
	      if (!draft || typeof draft !== 'object') return;
	      if (typeof draft.reviewer === 'string') reviewerInput.value = draft.reviewer;
	      if (filterSelect && typeof draft.filter === 'string') filterSelect.value = draft.filter;
	      for (const form of forms) {
	        const id = form.getAttribute('data-decision-form');
	        const decision = draft.decisions?.[id];
	        if (!decision) continue;
	        const status = form.querySelector('[data-field="status"]');
	        const overallNote = form.querySelector('[data-field="overallNote"]');
	        if (status && typeof decision.status === 'string') status.value = decision.status;
	        if (overallNote && typeof decision.overallNote === 'string') overallNote.value = decision.overallNote;
	        for (const check of requiredChecks) {
	          const fields = decision.checks?.[check];
	          if (!fields) continue;
	          const score = form.querySelector(\`[data-check="\${CSS.escape(check)}"][data-check-field="score"]\`);
	          const note = form.querySelector(\`[data-check="\${CSS.escape(check)}"][data-check-field="note"]\`);
	          const failed = form.querySelector(\`[data-check="\${CSS.escape(check)}"][data-check-field="failed"]\`);
	          if (score && typeof fields.score === 'string') score.value = fields.score;
	          if (note && typeof fields.note === 'string') note.value = fields.note;
	          if (failed) failed.checked = fields.failed === true;
	        }
	      }
	    }
	    function applyFilter(decisions) {
	      const filter = filterSelect?.value ?? 'all';
	      const byId = new Map(decisions.map((decision) => [decision.id, decision.status]));
	      for (const form of forms) {
	        const id = form.getAttribute('data-decision-form');
	        const status = byId.get(id) ?? 'needs-review';
	        const visible = filter === 'all' || filter === status;
	        form.hidden = !visible;
	        const card = matchingCard(id);
	        if (card) {
	          card.hidden = !visible;
	          card.dataset.reviewStatus = status;
	        }
	        form.dataset.reviewStatus = status;
	      }
	    }
	    function updateDecisionOutput() {
	      const decisions = forms.map(readDecisionForm);
	      const decisionFile = {
	        ...baseDecisionFile,
	        reviewer: reviewerInput.value,
	        reviewedAt: new Date().toISOString(),
	        decisions,
	      };
	      const approved = decisions.filter((decision) => decision.status === 'approved').length;
	      const rejected = decisions.filter((decision) => decision.status === 'rejected').length;
	      const needsReview = decisions.filter((decision) => decision.status === 'needs-review').length;
	      setCount('approved', approved);
	      setCount('rejected', rejected);
	      setCount('needs-review', needsReview);
	      setCount('reviewed', approved + rejected);
	      applyFilter(decisions);
	      const text = JSON.stringify(decisionFile, null, 2);
	      output.value = text;
      const blob = new Blob([text + '\\n'], { type: 'application/json' });
      const previous = downloadLink.dataset.objectUrl;
      if (previous) URL.revokeObjectURL(previous);
      const href = URL.createObjectURL(blob);
	      downloadLink.href = href;
	      downloadLink.dataset.objectUrl = href;
	      saveDraft();
	    }
	    applyDraft();
	    document.querySelector('[data-decision-workspace]').addEventListener('input', updateDecisionOutput);
	    filterSelect?.addEventListener('change', updateDecisionOutput);
	    clearDraftButton?.addEventListener('click', () => {
	      localStorage.removeItem(draftKey);
	      location.reload();
	    });
	    updateDecisionOutput();
  </script>
</body>
</html>
`;
}

const cohesionReview = await readJson(paths.cohesionReview);
if (cohesionReview.schema !== 'water9/source-cohesion-review@1') {
  throw new Error(`Unexpected cohesion review schema ${cohesionReview.schema ?? 'missing'}`);
}

const reviewChecks = (cohesionReview.requiredCohesionChecks ?? []).map((check) => check.id);
const requiredChecks = [...new Set([...SOURCE_APPROVAL_CHECKS, ...reviewChecks])];
const decisions = await Promise.all((cohesionReview.items ?? []).map(async (item) => {
  const decision = {
  id: item.id,
  species: item.species,
  status: item.humanCohesionApproved ? 'already-approved' : 'needs-human-decision',
  reviewer: '<human-reviewer>',
  overallNote: '',
  readyForCohesionReview: Boolean(item.readyForCohesionReview),
  humanCohesionApproved: Boolean(item.humanCohesionApproved),
  evidence: {
    source: item.links?.source,
    keyPreview: item.links?.keyPreview,
    sandboxScreenshot: item.links?.sandboxScreenshot,
    planPreview: item.links?.planPreview,
    cohesionReview: `/review/source-candidates/source-cohesion-review.html#${item.id}`,
  },
  visualChecks: decisionFields(requiredChecks),
  blockers: item.blockers ?? [],
  instructions: 'Approve only if the whole source reads as one cohesive, non-placeholder creature with clean keying and a neutral riggable pose.',
  commands: {
    quickReview: item.commands?.quickReview,
    sourceApproval: item.commands?.sourceApproval,
    accept: item.commands?.accept,
    reject: item.commands?.reject,
  },
  };
  return {
    ...decision,
    evidenceFingerprint: await evidenceFingerprintFor(decision),
  };
}));

const report = {
  schema: 'water9/source-cohesion-decision-template@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    cohesionReview: paths.cohesionReview,
  },
  decisionFileTemplate: {
    schema: 'water9/source-cohesion-decisions@1',
    reviewer: '<human-reviewer>',
    reviewedAt: '<ISO-8601 timestamp>',
    policy: {
      humanAuthored: true,
      automationCannotApproveCohesion: true,
      inspectSourceKeySandboxAndPlan: true,
    },
    decisions: decisions.map((decision) => ({
      id: decision.id,
      species: decision.species,
      status: 'needs-review',
      overallNote: '',
      evidenceFingerprint: decision.evidenceFingerprint,
      failedChecks: [],
      visualChecks: decision.visualChecks,
    })),
  },
  requiredCohesionChecks: requiredChecks,
  summary: {
    candidates: decisions.length,
    readyForCohesionReview: decisions.filter((decision) => decision.readyForCohesionReview && !decision.humanCohesionApproved).length,
    humanCohesionApproved: decisions.filter((decision) => decision.humanCohesionApproved).length,
    prototypeLocked: decisions.filter((decision) => !decision.humanCohesionApproved).length,
  },
  decisions,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMd, markdownFor(report));
await writeFile(paths.outHtml, htmlFor(report));

console.log(JSON.stringify({
  schema: report.schema,
  candidates: report.summary.candidates,
  readyForCohesionReview: report.summary.readyForCohesionReview,
  prototypeLocked: report.summary.prototypeLocked,
  json: paths.outJson,
  markdown: paths.outMd,
  html: paths.outHtml,
}, null, 2));

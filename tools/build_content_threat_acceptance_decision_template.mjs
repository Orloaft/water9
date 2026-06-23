import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { threatAcceptedForContentGate } from './content_quality_predicates.mjs';
import {
  buildThreatEvidenceFingerprint,
  latestSandboxResultFor,
  loadSandboxReports,
  loadSourceManifests,
} from './content_threat_evidence_fingerprint.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const paths = {
  review: resolve(String(args.get('review') ?? 'public/review/articulated/review-manifest.json')),
  runtime: resolve(String(args.get('runtime') ?? 'public/assets/generated/articulated-creatures.parts.json')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  stageBoard: resolve(String(args.get('stage-board') ?? 'public/review/content-stage-board.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-threat-acceptance-decision-template.json')),
  outMd: resolve(String(args.get('md-out') ?? 'public/review/content-threat-acceptance-decision-template.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-threat-acceptance-decision-template.html')),
};
const ALL_REGISTERED = args.has('all-registered');

const REQUIRED_CHECKS = [
  'single-source-cohesion',
  'readable-silhouette',
  'anatomy-cohesion',
  'production-visual-cohesion',
  'socket-seams',
  'motion-stability',
  'sandbox-behavior',
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

function checksTemplate() {
  return Object.fromEntries(REQUIRED_CHECKS.map((check) => [check, { score: null, note: '' }]));
}

function commandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function commandsFor(item) {
  const sourceCandidate = item.quality?.sourceCandidateId ?? item.sourceCandidateId ?? '<approved-source-candidate-id>';
  const evidenceDigest = item.evidenceFingerprint?.digest ?? '<current-evidence-fingerprint-digest>';
  return {
    review: `npm run review:articulated:quick && npm run review:check`,
    sandbox: `npm run sandbox:preview -- --id ${item.id} --with diver --serve --open --visual`,
    visual: `npm run sandbox:visual -- --ids ${item.id} --states idle,lunge,stunned --with diver`,
    audit: `npm run content:acceptance-audit -- --id ${item.id}`,
    acceptDryRun: `npm run content:accept -- --id ${item.id} --status accepted --reviewed-by <human-reviewer> --source-candidate ${sourceCandidate} --note '<specific rig approval note>' --evidence-fingerprint ${evidenceDigest} ${REQUIRED_CHECKS.map((check) => `--visual-check ${check}`).join(' ')} ${REQUIRED_CHECKS.map((check) => `--score ${check}=<4-5>`).join(' ')} ${REQUIRED_CHECKS.map((check) => `--visual-note ${check}='<specific rationale>'`).join(' ')} --source-reviewed --contact-reviewed --phase-reviewed --parity-reviewed --sandbox-reviewed --dry-run`,
  };
}

function markdownFor(report) {
  const rows = report.decisions.map((decision) => `| ${decision.id} | ${decision.species} | ${decision.status} | ${decision.sourceCandidateId ?? 'missing'} | ${decision.blockers.join('; ') || 'none'} |`).join('\n');
  return `# Water 9 Threat Acceptance Batch Decision Template

Water 9 Threat Acceptance Batch Decisions

This is a structured human-review handoff for ${report.scope.description}. This page does not approve content automatically.

## Commands

\`\`\`bash
npm run content:threat-decisions
npm run content:threat-decisions -- --all-registered
npm run content:threat-decisions-check
npm run content:acceptance-audit -- --id <threat-id>
npm run content:threat-decisions-apply -- --decisions water9-threat-acceptance-decisions.json --strict
\`\`\`

## Required Checks

${REQUIRED_CHECKS.map((check) => `- \`${check}\``).join('\n')}

## Decisions

| Threat | Species | Default status | Source candidate | Blockers |
| --- | --- | --- | --- | --- |
${rows}
`;
}

function htmlFor(report) {
  const forms = report.decisions.map((decision) => `<article class="decision-form" data-threat-decision-form="${htmlEscape(decision.id)}">
    <header>
      <div><strong>${htmlEscape(decision.species)}</strong><code>${htmlEscape(decision.id)}</code></div>
      <select data-field="status" aria-label="${htmlEscape(`${decision.species} status`)}">
        <option value="needs-review">needs review</option>
        <option value="accepted">accepted</option>
        <option value="prototype">prototype</option>
      </select>
    </header>
    <label>Source candidate <input data-field="sourceCandidateId" value="${htmlEscape(decision.sourceCandidateId ?? '<approved-source-candidate-id>')}" autocomplete="off"></label>
    <label>Overall note <textarea data-field="overallNote" rows="3" spellcheck="true"></textarea></label>
    <details>
      <summary>Scores and visual notes</summary>
      <div class="check-grid">
        ${REQUIRED_CHECKS.map((check) => `<label><span>${htmlEscape(check)}</span><input data-check="${htmlEscape(check)}" data-check-field="score" type="number" min="4" max="5" step="1" placeholder="4-5"><textarea data-check="${htmlEscape(check)}" data-check-field="note" rows="2" spellcheck="true"></textarea></label>`).join('')}
      </div>
    </details>
	    <h3>Evidence</h3>
	    <pre><code>evidence digest: ${htmlEscape(decision.evidenceFingerprint?.digest ?? 'missing')}</code></pre>
	    <div class="links">
	      ${Object.entries(decision.evidence).filter(([, value]) => value).map(([key, value]) => `<a href="${htmlEscape(value)}">${htmlEscape(key)}</a>`).join('')}
	    </div>
    <h3>Commands</h3>
    ${commandBlock(Object.values(decision.commands))}
  </article>`).join('\n');
  const baseJson = JSON.stringify(report.decisionFileTemplate);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Threat Acceptance Batch Decisions</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0d1b20; --line:#29444b; --text:#e6f5f5; --muted:#91a9ae; --accent:#7adff6; }
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
    input, select, textarea { width:100%; border:1px solid var(--line); border-radius:5px; background:#050b0d; color:var(--text); padding:7px 8px; }
    textarea { min-height:110px; resize:vertical; font:12px/1.45 "SFMono-Regular",Consolas,monospace; }
    label { display:block; color:var(--muted); margin-top:8px; }
    label span { display:block; margin-bottom:4px; color:var(--text); }
    .summary, .links { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }
    .summary span, .links a { border:1px solid var(--line); background:#09171b; border-radius:5px; padding:7px 9px; color:var(--muted); }
    .workspace, .decision-form { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:14px; }
    .decision-forms { display:grid; grid-template-columns:repeat(auto-fit,minmax(350px,1fr)); gap:12px; margin-top:14px; }
    .decision-form header { display:grid; grid-template-columns:1fr 150px; gap:10px; align-items:start; }
    .decision-form code { display:block; margin-top:3px; color:var(--muted); }
    .check-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:8px; margin-top:10px; }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Threat Acceptance Batch Decisions</h1>
    <p>Water 9 Threat Acceptance Batch Decision Template. Structured human-review handoff for ${htmlEscape(report.scope.description)} after source approval, rig evidence, and paired sandbox review. This page does not approve content automatically.</p>
    ${commandBlock([
      'npm run content:threat-decisions',
      'npm run content:threat-decisions -- --all-registered',
      'npm run content:threat-decisions-check',
      'npm run content:acceptance-audit -- --id <threat-id>',
      'npm run content:threat-decisions-apply -- --decisions water9-threat-acceptance-decisions.json --strict',
    ])}
    <div class="summary">
      <span>registered rigs <strong>${report.summary.registeredRigs}</strong></span>
      <span>scope <strong>${htmlEscape(report.scope.mode)}</strong></span>
      <span>target threats <strong>${report.scope.targetThreats}</strong></span>
      <span>accepted <strong>${report.summary.accepted}</strong></span>
      <span>needs review <strong>${report.summary.needsReview}</strong></span>
    </div>
    <section class="workspace" data-threat-decision-workspace>
      <h2>Batch Threat Decision Workspace</h2>
      <label>Reviewer <input id="threat-decision-reviewer" value="&lt;human-reviewer&gt;" autocomplete="off"></label>
      <div class="decision-forms">${forms}</div>
      <h3>Generated Decision File</h3>
      <textarea id="threat-decision-output" data-threat-decision-output readonly spellcheck="false"></textarea>
      <p><a id="threat-decision-download" href="#" download="water9-threat-acceptance-decisions.json">Download decision file</a></p>
    </section>
  </main>
  <script>
    const baseDecisionFile = ${baseJson};
    const requiredChecks = ${JSON.stringify(REQUIRED_CHECKS)};
    const forms = [...document.querySelectorAll('[data-threat-decision-form]')];
    const reviewer = document.querySelector('#threat-decision-reviewer');
    const output = document.querySelector('[data-threat-decision-output]');
    const download = document.querySelector('#threat-decision-download');
    function readForm(form) {
      const id = form.getAttribute('data-threat-decision-form');
      const base = baseDecisionFile.decisions.find((decision) => decision.id === id);
      const visualChecks = {};
      for (const check of requiredChecks) {
        const score = form.querySelector(\`[data-check="\${CSS.escape(check)}"][data-check-field="score"]\`)?.value;
        const note = form.querySelector(\`[data-check="\${CSS.escape(check)}"][data-check-field="note"]\`)?.value ?? '';
        visualChecks[check] = { score: score ? Number(score) : null, note };
      }
      return {
        id,
        species: base?.species ?? id,
        status: form.querySelector('[data-field="status"]')?.value ?? 'needs-review',
        reviewer: reviewer.value,
	        sourceCandidateId: form.querySelector('[data-field="sourceCandidateId"]')?.value ?? '',
	        overallNote: form.querySelector('[data-field="overallNote"]')?.value ?? '',
	        evidenceFingerprint: base?.evidenceFingerprint ?? null,
	        visualChecks,
	      };
    }
    function update() {
      const decisionFile = { ...baseDecisionFile, reviewer: reviewer.value, reviewedAt: new Date().toISOString(), decisions: forms.map(readForm) };
      const text = JSON.stringify(decisionFile, null, 2);
      output.value = text;
      const blob = new Blob([text + '\\n'], { type: 'application/json' });
      const previous = download.dataset.objectUrl;
      if (previous) URL.revokeObjectURL(previous);
      const href = URL.createObjectURL(blob);
      download.href = href;
      download.dataset.objectUrl = href;
    }
    document.querySelector('[data-threat-decision-workspace]').addEventListener('input', update);
    update();
  </script>
</body>
</html>
`;
}

const review = await readJson(paths.review);
if (review.schema !== 'water9/articulated-review@1') throw new Error(`Unexpected articulated review schema ${review.schema ?? 'missing'}`);
const runtime = await readJson(paths.runtime);
const sourceCandidates = await readJson(paths.sourceCandidates);
const stageBoard = await readJson(paths.stageBoard);
if (stageBoard.schema !== 'water9/content-stage-board@1') throw new Error(`Unexpected content stage board schema ${stageBoard.schema ?? 'missing'}`);
const runtimeById = new Map((runtime.creatures ?? []).map((creature) => [creature.id, creature]));
const sourceById = new Map((sourceCandidates.candidates ?? []).map((candidate) => [candidate.id, candidate]));
const sourceManifestById = await loadSourceManifests();
const sandboxReports = await loadSandboxReports();
const targetIds = (stageBoard.targets ?? []).map((target) => target.rigId ?? target.id).filter(Boolean);
const targetIdSet = new Set(targetIds);
const reviewCreatures = ALL_REGISTERED
  ? (review.creatures ?? [])
  : (review.creatures ?? []).filter((item) => targetIdSet.has(item.id));
const missingTargetIds = ALL_REGISTERED ? [] : targetIds.filter((id) => !reviewCreatures.some((item) => item.id === id));
if (!ALL_REGISTERED && missingTargetIds.length) {
  throw new Error(`Threat decision target scope is missing review creatures: ${missingTargetIds.join(', ')}`);
}

const decisions = await Promise.all(reviewCreatures.map(async (item) => {
  const runtimeCreature = runtimeById.get(item.id) ?? null;
  const sourceCandidateId = runtimeCreature?.quality?.sourceCandidateId ?? item.quality?.sourceCandidateId ?? item.sourceCandidateId ?? null;
  const sourceCandidate = sourceById.get(sourceCandidateId) ?? sourceById.get(item.id) ?? null;
  const sourceManifest = sourceManifestById.get(item.id) ?? null;
  const sandboxResult = latestSandboxResultFor(item.id, sandboxReports, { requireDiver: true });
  const evidenceFingerprint = await buildThreatEvidenceFingerprint({
    id: item.id,
    creature: runtimeCreature,
    sourceManifest,
    sourceCandidate,
    reviewItem: item,
    sandboxResult,
    runtimeManifestPath: paths.runtime,
    sourceCandidateManifestPath: paths.sourceCandidates,
    reviewManifestPath: paths.review,
  });
  const accepted = threatAcceptedForContentGate(sourceById.get(sourceCandidateId), runtimeCreature, item);
  const decision = {
    id: item.id,
    species: item.species,
    status: accepted ? 'already-accepted' : 'needs-review',
    sourceCandidateId,
    blockers: accepted ? [] : ['strict human source approval and threat acceptance missing'],
    evidence: {
      source: item.sourceUrl,
      contact: item.contactFile ? `/review/articulated/${item.contactFile}` : null,
      phase: item.phaseFile ? `/review/articulated/${item.phaseFile}` : null,
      sourceParity: item.sourceParityDebugFile ? `/review/articulated/${item.sourceParityDebugFile}` : null,
      sandbox: item.sandboxUrl,
	    },
	    visualChecks: checksTemplate(),
	    evidenceFingerprint,
	  };
  decision.commands = commandsFor({ ...item, evidenceFingerprint });
  return decision;
}));

const report = {
  schema: 'water9/content-threat-acceptance-decision-template@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: { review: paths.review, runtime: paths.runtime, sourceCandidates: paths.sourceCandidates, stageBoard: paths.stageBoard },
  scope: {
    mode: ALL_REGISTERED ? 'all-registered' : 'target-threats',
    description: ALL_REGISTERED ? 'all registered articulated rigs' : 'the 20 target threats required by the strict content gate',
    targetThreats: stageBoard.summary?.targetThreats ?? targetIds.length,
    targetIds,
    includedIds: decisions.map((decision) => decision.id),
    excludedRegisteredRigs: ALL_REGISTERED ? [] : (review.creatures ?? []).map((creature) => creature.id).filter((id) => !targetIdSet.has(id)),
  },
  requiredChecks: REQUIRED_CHECKS,
  decisionFileTemplate: {
    schema: 'water9/content-threat-acceptance-decisions@1',
    reviewer: '<human-reviewer>',
    reviewedAt: '<ISO-8601 timestamp>',
    policy: {
      humanAuthored: true,
      automationCannotAcceptThreats: true,
      inspectSourceContactPhaseParityAndSandbox: true,
    },
    decisions: decisions.map((decision) => ({
      id: decision.id,
      species: decision.species,
      status: 'needs-review',
	      sourceCandidateId: decision.sourceCandidateId ?? '<approved-source-candidate-id>',
	      overallNote: '',
	      evidenceFingerprint: decision.evidenceFingerprint,
	      visualChecks: checksTemplate(),
	    })),
  },
  summary: {
    registeredRigs: decisions.length,
    availableRegisteredRigs: (review.creatures ?? []).length,
    accepted: decisions.filter((decision) => decision.status === 'already-accepted').length,
    needsReview: decisions.filter((decision) => decision.status !== 'already-accepted').length,
  },
  decisions,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMd, markdownFor(report));
await writeFile(paths.outHtml, htmlFor(report));

console.log(JSON.stringify({
  schema: report.schema,
  registeredRigs: report.summary.registeredRigs,
  availableRegisteredRigs: report.summary.availableRegisteredRigs,
  scope: report.scope.mode,
  needsReview: report.summary.needsReview,
  json: paths.outJson,
  markdown: paths.outMd,
  html: paths.outHtml,
}, null, 2));

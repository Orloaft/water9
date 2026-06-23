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
  workspace: resolve(String(args.get('workspace') ?? 'public/review/source-candidates/source-regeneration-workspace.json')),
  dispatch: resolve(String(args.get('dispatch') ?? 'public/review/source-candidates/research-dispatch-board.json')),
  auditsSummary: resolve(String(args.get('audits-summary') ?? 'public/review/source-candidates/research-subagent-audits-summary.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/research-regeneration-handoff.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/source-candidates/research-regeneration-handoff.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/research-regeneration-handoff.html')),
};

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function repoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function listMarkdown(items) {
  return (items ?? []).length ? items.map((item) => `- ${item}`).join('\n') : '- none';
}

function listHtml(items) {
  return (items ?? []).length ? `<ul>${items.map((item) => `<li>${htmlEscape(item)}</li>`).join('')}</ul>` : '<ul><li>none</li></ul>';
}

function codeBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

async function auditFindingFor(dispatch) {
  if (!dispatch?.auditFile) return { audit: null, finding: null };
  const audit = await readJson(resolve(dispatch.auditFile), null);
  const finding = (audit?.findings ?? []).find((item) => item.id === dispatch.id) ?? null;
  return { audit, finding };
}

function handoffCommands(target, workspace) {
  const safeNext = workspace?.target?.commands?.safeNext ?? [];
  return [
    'npm run research:regeneration-handoff',
    'npm run research:regeneration-handoff-check',
    'npm run research:regeneration-handoff:serve-smoke',
    'npm run research:dispatch && npm run research:dispatch-check',
    'npm run research:audits',
    'npm run source:regeneration-workspace && npm run source:regeneration-workspace-check',
    ...safeNext,
  ].filter(Boolean);
}

function markdown(report) {
  const t = report.target;
  const f = report.finding;
  return `# Water 9 Research Regeneration Handoff

Generated: \`${report.generatedAt}\`

Focused handoff from subagent research findings into the current source-regeneration workspace. This page is read-only: it does not approve source art, does not accept threats, and does not count preview-only work toward the strict 20-threat gate.

## Target

- Candidate: \`${t.id}\` ${t.species}
- Lane: \`${t.lane}\`
- Regeneration lane: \`${t.regenerationLane}\`
- Health status: \`${t.healthStatus}\`
- Replacement matches current source: \`${t.replacementMatchesCurrentSource}\`
- Distinct replacement ready: \`${t.distinctReplacementReady}\`
- Audit file: \`${t.auditFile ?? 'missing'}\`
- Dispatch packet: \`${t.dispatchPacket ?? 'missing'}\`
- Workspace page: \`/review/source-candidates/source-regeneration-workspace.html\`

## Subagent Finding

### Strengths

${listMarkdown(f.strengths)}

### Source Generation Risks

${listMarkdown(f.sourceGenerationRisks)}

### Suggested Prompt Patches

Biological anchors:
${listMarkdown(f.suggestedResearchPatch?.biologicalAnchors)}

Required read:
${listMarkdown(f.suggestedResearchPatch?.requiredRead)}

Prompt risks:
${listMarkdown(f.suggestedResearchPatch?.promptRisks)}

Motion phases:
${listMarkdown(f.suggestedResearchPatch?.motionPhases)}

Reference search terms:
${listMarkdown(f.referenceSearchTerms)}

## Regeneration Prompt Alignment

- Prompt includes audit risk language: \`${report.promptAlignment.includesSourceGenerationRisk}\`
- Prompt includes suggested biological anchors: \`${report.promptAlignment.includesSuggestedBiologicalAnchor}\`
- Prompt includes suggested required read: \`${report.promptAlignment.includesSuggestedRequiredRead}\`
- Prompt includes suggested prompt risks: \`${report.promptAlignment.includesSuggestedPromptRisk}\`
- Prompt includes suggested motion phases: \`${report.promptAlignment.includesSuggestedMotionPhase}\`

## Safe Handoff Commands

\`\`\`bash
${report.commands.join('\n')}
\`\`\`

## Command Boundary

Overwrite ingest must remain absent until the source-regeneration workspace reports \`regenerate-distinct-ready\`. This handoff only tells the operator how subagent research should shape the next distinct image attempt.
`;
}

function html(report) {
  const t = report.target;
  const f = report.finding;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Research Regeneration Handoff</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background:#061014; color:#e5f6f8; }
    body { margin:0; background:#061014; }
    main { max-width:1320px; margin:0 auto; padding:28px 18px 48px; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4rem); letter-spacing:0; }
    h2 { margin:22px 0 10px; color:#dff4f8; }
    h3 { margin:16px 0 8px; color:#a8c8d0; text-transform:uppercase; font-size:12px; }
    p, li, td { color:#bdd4dc; line-height:1.45; }
    a { color:#91eaff; }
    code, pre { color:#d8f5fb; overflow-wrap:anywhere; font-family:"SFMono-Regular", Consolas, monospace; }
    pre { border:1px solid #203b46; border-radius:6px; background:#041014; padding:12px; white-space:pre-wrap; }
    .notice { border:1px solid #6a5230; border-radius:6px; background:#1d1710; color:#f0d9aa; padding:10px 12px; margin:16px 0; }
    .summary { display:flex; flex-wrap:wrap; gap:8px; margin:16px 0; }
    .summary span { border:1px solid #294653; border-radius:6px; background:#0b1d24; padding:8px 10px; color:#bdd6df; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:12px; }
    .card { border:1px solid #203b46; border-radius:6px; background:#081920; padding:14px; }
    table { width:100%; border-collapse:collapse; border:1px solid #203b46; background:#081920; }
    th, td { padding:8px 9px; border-bottom:1px solid #18303a; text-align:left; vertical-align:top; }
    th { background:#10242c; color:#e7f7fb; }
  </style>
</head>
<body>
  <main data-research-regeneration-handoff data-research-regeneration-target="${htmlEscape(t.id)}">
    <h1>Research Regeneration Handoff</h1>
    <p>Focused handoff from subagent research findings into the current source-regeneration workspace.</p>
    <div class="notice">This page is read-only. It does not approve source art, does not accept threats, and does not count preview-only work toward the strict 20-threat gate.</div>
    <div class="summary">
      <span>${htmlEscape(t.id)}</span>
      <span>${htmlEscape(t.species)}</span>
      <span>research lane ${htmlEscape(t.lane)}</span>
      <span>regeneration lane ${htmlEscape(t.regenerationLane)}</span>
      <span>health ${htmlEscape(t.healthStatus)}</span>
      <span>no-op ${t.replacementMatchesCurrentSource ? 'yes' : 'no'}</span>
      <span>distinct ready ${t.distinctReplacementReady ? 'yes' : 'no'}</span>
    </div>
    <h2>Subagent Finding</h2>
    <section class="grid">
      <article class="card"><h3>Strengths</h3>${listHtml(f.strengths)}</article>
      <article class="card"><h3>Source Generation Risks</h3>${listHtml(f.sourceGenerationRisks)}</article>
      <article class="card"><h3>Reference Search Terms</h3>${listHtml(f.referenceSearchTerms)}</article>
    </section>
    <h2>Suggested Prompt Patches</h2>
    <section class="grid">
      <article class="card"><h3>Biological Anchors</h3>${listHtml(f.suggestedResearchPatch?.biologicalAnchors)}</article>
      <article class="card"><h3>Required Read</h3>${listHtml(f.suggestedResearchPatch?.requiredRead)}</article>
      <article class="card"><h3>Prompt Risks</h3>${listHtml(f.suggestedResearchPatch?.promptRisks)}</article>
      <article class="card"><h3>Motion Phases</h3>${listHtml(f.suggestedResearchPatch?.motionPhases)}</article>
    </section>
    <h2>Regeneration Prompt Alignment</h2>
    <table>
      <tbody>
        <tr><th>Audit risk language</th><td>${report.promptAlignment.includesSourceGenerationRisk ? 'yes' : 'no'}</td></tr>
        <tr><th>Suggested biological anchors</th><td>${report.promptAlignment.includesSuggestedBiologicalAnchor ? 'yes' : 'no'}</td></tr>
        <tr><th>Suggested required read</th><td>${report.promptAlignment.includesSuggestedRequiredRead ? 'yes' : 'no'}</td></tr>
        <tr><th>Suggested prompt risks</th><td>${report.promptAlignment.includesSuggestedPromptRisk ? 'yes' : 'no'}</td></tr>
        <tr><th>Suggested motion phases</th><td>${report.promptAlignment.includesSuggestedMotionPhase ? 'yes' : 'no'}</td></tr>
      </tbody>
    </table>
    <h2>Evidence Links</h2>
    <ul>
      <li>Audit file: <code>${htmlEscape(t.auditFile ?? 'missing')}</code></li>
      <li>Dispatch packet: <code>${htmlEscape(t.dispatchPacket ?? 'missing')}</code></li>
      <li>Workspace page: <code>/review/source-candidates/source-regeneration-workspace.html</code></li>
      <li>Dispatch board: <code>/review/source-candidates/research-dispatch-board.html</code></li>
    </ul>
    <h2>Safe Handoff Commands</h2>
    ${codeBlock(report.commands)}
    <h2>Command Boundary</h2>
    <p>Overwrite ingest must remain absent until the source-regeneration workspace reports <code>regenerate-distinct-ready</code>.</p>
  </main>
</body>
</html>
`;
}

const workspace = await readJson(paths.workspace, { target: {} });
const dispatchBoard = await readJson(paths.dispatch, { dispatches: [] });
const auditsSummary = await readJson(paths.auditsSummary, { auditedCandidates: [] });
if (workspace?.schema !== 'water9/source-regeneration-workspace@1') throw new Error(`Unexpected workspace schema ${workspace?.schema ?? 'missing'}`);
if (dispatchBoard?.schema !== 'water9/research-dispatch-board@1') throw new Error(`Unexpected dispatch schema ${dispatchBoard?.schema ?? 'missing'}`);
if (auditsSummary?.schema !== 'water9/research-subagent-audits-summary@1') throw new Error(`Unexpected audits summary schema ${auditsSummary?.schema ?? 'missing'}`);

const targetId = String(args.get('id') ?? workspace.target?.id ?? '');
const dispatch = (dispatchBoard.dispatches ?? []).find((item) => item.id === targetId);
if (!dispatch) throw new Error(`No research dispatch found for ${targetId}`);
const { audit, finding } = await auditFindingFor(dispatch);
if (audit?.schema !== 'water9/subagent-research-audit@1') throw new Error(`Unexpected audit schema ${audit?.schema ?? 'missing'}`);
if (!finding) throw new Error(`No subagent finding found for ${targetId}`);

const promptText = workspace.target?.promptText ?? '';
const patch = finding.suggestedResearchPatch ?? {};
const includesAny = (values) => (values ?? []).some((value) => promptText.toLowerCase().includes(String(value).toLowerCase().slice(0, 48)));
const promptAlignment = {
  includesSourceGenerationRisk: includesAny(finding.sourceGenerationRisks),
  includesSuggestedBiologicalAnchor: includesAny(patch.biologicalAnchors),
  includesSuggestedRequiredRead: includesAny(patch.requiredRead),
  includesSuggestedPromptRisk: includesAny(patch.promptRisks),
  includesSuggestedMotionPhase: includesAny(patch.motionPhases),
};

const report = {
  schema: 'water9/research-regeneration-handoff@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    workspace: repoRelative(paths.workspace),
    dispatch: repoRelative(paths.dispatch),
    auditsSummary: repoRelative(paths.auditsSummary),
    auditFile: dispatch.auditFile,
  },
  artifacts: {
    json: repoRelative(paths.outJson),
    markdown: repoRelative(paths.outMarkdown),
    html: repoRelative(paths.outHtml),
  },
  policy: {
    readOnlyHandoff: true,
    doesNotApproveSources: true,
    doesNotAcceptThreats: true,
    previewOnlyDoesNotCountTowardGate: true,
    noOverwriteIngestOutsideDistinctReady: true,
  },
  target: {
    id: targetId,
    species: dispatch.species ?? workspace.target?.species,
    lane: dispatch.lane,
    regenerationLane: workspace.target?.lane,
    healthStatus: workspace.target?.healthStatus,
    replacementMatchesCurrentSource: Boolean(workspace.target?.replacementMatchesCurrentSource),
    distinctReplacementReady: Boolean(workspace.target?.distinctReplacementReady),
    auditFile: dispatch.auditFile,
    dispatchPacket: dispatch.packet?.file ?? null,
    workspacePage: '/review/source-candidates/source-regeneration-workspace.html',
  },
  finding,
  promptAlignment,
  commands: handoffCommands(targetId, workspace),
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdown(report));
await writeFile(paths.outHtml, html(report));

console.log(JSON.stringify({
  schema: report.schema,
  target: report.target.id,
  lane: report.target.lane,
  regenerationLane: report.target.regenerationLane,
  healthStatus: report.target.healthStatus,
  noOp: report.target.replacementMatchesCurrentSource,
  distinctReady: report.target.distinctReplacementReady,
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
}, null, 2));

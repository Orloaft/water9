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
  research: resolve(String(args.get('research') ?? 'public/review/source-candidates/research-briefs.json')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  pack: resolve(String(args.get('pack') ?? 'public/review/source-candidates/research-subagent-pack.json')),
  trace: resolve(String(args.get('trace') ?? 'public/review/source-candidates/research-source-trace.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/research-dispatch-board.json')),
  outMd: resolve(String(args.get('md-out') ?? 'public/review/source-candidates/research-dispatch-board.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/research-dispatch-board.html')),
  packetDir: resolve(String(args.get('packet-dir') ?? 'public/review/source-candidates/research-dispatch-packets')),
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

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'candidate';
}

function publicUrl(path) {
  if (!path) return null;
  const text = String(path);
  if (text.startsWith('public/')) return `/${text.slice('public/'.length)}`;
  return text;
}

function list(items) {
  return items?.length ? items.map((item) => `- ${item}`).join('\n') : '- None recorded.';
}

function htmlList(items) {
  return items?.length ? `<ul>${items.map((item) => `<li>${htmlEscape(item)}</li>`).join('')}</ul>` : '<ul><li>None recorded.</li></ul>';
}

function commandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function laneForCandidate(pack, id) {
  for (const assignment of pack.assignments ?? []) {
    if ((assignment.candidates ?? []).some((candidate) => candidate.id === id)) return assignment;
  }
  return null;
}

function promptFor(dispatch) {
  return `You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: ${dispatch.species} (${dispatch.id})
Lane: ${dispatch.lane ?? 'unassigned'}
Current source status: ${dispatch.sourceStatus}
Has source image: ${dispatch.hasSource}

Gameplay verb:
${dispatch.gameplayVerb}

Biological anchors:
${list(dispatch.biologicalAnchors)}

Required visual read:
${list(dispatch.requiredRead)}

Articulatable parts:
${list(dispatch.articulatableParts)}

Known prompt risks:
${list(dispatch.promptRisks)}

Reference search terms:
${list(dispatch.referenceSearchTerms)}

Preview/review commands available to the human operator:
${dispatch.commands.sourcePreview}
${dispatch.commands.sandboxLab}
${dispatch.commands.sourceApprovalRunway}

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "${dispatch.lane ?? '<lane-id>'}",
  "findings": [
    {
      "id": "${dispatch.id}",
      "strengths": ["specific source/articulation strength"],
      "sourceGenerationRisks": ["specific risk that could produce incohesive art"],
      "suggestedResearchPatch": {
        "biologicalAnchors": ["optional replacement/addition"],
        "requiredRead": ["optional replacement/addition"],
        "promptRisks": ["optional replacement/addition"],
        "motionPhases": ["optional replacement/addition"]
      },
      "referenceSearchTerms": ["stable biological reference keywords"]
    }
  ]
}
`;
}

function packetMarkdown(dispatch) {
  return `# Research Dispatch: ${dispatch.species} (${dispatch.id})

Lane: \`${dispatch.lane ?? 'unassigned'}\`

Status: \`${dispatch.sourceStatus}\`
Has source: \`${dispatch.hasSource}\`
Audit file: \`${dispatch.auditFile ?? 'missing'}\`

## Mission Prompt

\`\`\`text
${promptFor(dispatch).trim()}
\`\`\`

## Commands

\`\`\`bash
${Object.values(dispatch.commands).filter(Boolean).join('\n')}
\`\`\`

## Biological Anchors

${list(dispatch.biologicalAnchors)}

## Required Read

${list(dispatch.requiredRead)}

## Articulatable Parts

${list(dispatch.articulatableParts)}

## Prompt Risks

${list(dispatch.promptRisks)}

## Reference Search Terms

${list(dispatch.referenceSearchTerms)}
`;
}

function boardMarkdown(report) {
  const lines = [
    '# Water 9 Research Dispatch Board',
    '',
    `Generated: \`${report.generatedAt}\``,
    '',
    'Per-candidate subagent packets for dispatching focused underwater-fauna research to subagents. These packets are read-only review prompts; they do not approve source art or accepted threats.',
    '',
    '## Summary',
    '',
    `- Candidates: \`${report.summary.candidates}\``,
    `- Dispatch packets: \`${report.summary.dispatchPackets}\``,
    `- Assigned to lanes: \`${report.summary.assignedToLanes}\``,
    `- Audited candidates: \`${report.summary.auditedCandidates}\``,
    `- Source images present: \`${report.summary.hasSource}\``,
    '',
    '## Commands',
    '',
    '```bash',
    'npm run research:dispatch',
    'npm run research:dispatch-check',
    'npm run research:subagent-pack',
    'npm run research:source-trace',
    'npm run sandbox:lab -- --id abyssal-gulper --with diver',
    'npm run source:approval-runway:preview -- --id <candidate-id>',
    '```',
    '',
    '## Dispatch Packets',
    '',
    '| Candidate | Lane | Source | Audit | Packet |',
    '| --- | --- | ---: | ---: | --- |',
  ];
  for (const item of report.dispatches) {
    lines.push(`| \`${item.id}\` ${item.species} | \`${item.lane ?? 'unassigned'}\` | ${item.hasSource ? 'yes' : 'no'} | ${item.auditFile ? 'yes' : 'no'} | [packet](${item.packet.file}) |`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function boardHtml(report) {
  const rows = report.dispatches.map((item) => `<tr data-lane="${htmlEscape(item.lane ?? 'unassigned')}">
    <td><code>${htmlEscape(item.id)}</code><strong>${htmlEscape(item.species)}</strong></td>
    <td>${htmlEscape(item.lane ?? 'unassigned')}</td>
    <td>${item.hasSource ? 'yes' : 'no'}</td>
    <td>${item.auditFile ? 'yes' : 'no'}</td>
    <td><a href="${htmlEscape(item.packet.href)}">packet</a></td>
    <td>${commandBlock([item.commands.sandboxLab, item.commands.sourcePreview, item.commands.sourceApprovalRunway])}</td>
  </tr>`).join('\n');
  const cards = report.dispatches.map((item) => `<article class="card" id="${htmlEscape(item.id)}">
    <header>
      <div><h2>${htmlEscape(item.species)}</h2><code>${htmlEscape(item.id)}</code></div>
      <span>${htmlEscape(item.lane ?? 'unassigned')}</span>
    </header>
    <p>${htmlEscape(item.gameplayVerb)}</p>
    <h3>Reference Terms</h3>
    ${htmlList(item.referenceSearchTerms)}
    <h3>Dispatch Prompt</h3>
    <textarea readonly>${htmlEscape(item.prompt)}</textarea>
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Research Dispatch Board</title>
  <style>
    :root { color-scheme: dark; --bg:#061014; --panel:#0c1c22; --line:#294653; --text:#e5f6f8; --muted:#96aeb8; --accent:#7ee8ff; --warn:#f0d9aa; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); }
    main { max-width:1440px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:0; font-size:18px; }
    h3 { margin:14px 0 8px; color:var(--muted); font-size:12px; text-transform:uppercase; }
    p { color:var(--muted); line-height:1.45; }
    .notice { border:1px solid #6a5230; border-radius:6px; background:#1d1710; color:var(--warn); padding:10px 12px; margin:14px 0; }
    .summary { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }
    .summary span { border:1px solid var(--line); border-radius:6px; background:#0b1b22; padding:8px 10px; color:var(--muted); }
    table { width:100%; border-collapse:collapse; border:1px solid var(--line); background:var(--panel); margin:18px 0; }
    th, td { text-align:left; border-bottom:1px solid var(--line); padding:8px 10px; vertical-align:top; }
    th { color:var(--muted); font-size:12px; text-transform:uppercase; }
    code, pre, textarea { font-family:"SFMono-Regular",Consolas,monospace; }
    code { display:block; color:var(--muted); }
    pre { margin:0; border:1px solid var(--line); background:#050b0d; padding:8px; white-space:pre-wrap; overflow:auto; }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(360px,1fr)); gap:12px; }
    .card { border:1px solid var(--line); border-radius:7px; background:var(--panel); padding:14px; }
    .card header { display:flex; justify-content:space-between; gap:12px; }
    textarea { width:100%; min-height:220px; border:1px solid var(--line); border-radius:6px; background:#050b0d; color:var(--text); padding:10px; resize:vertical; }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Research Dispatch Board</h1>
    <p>Per-candidate subagent packets for fauna/flora research, source-art risks, articulation planning, and sandbox review handoff.</p>
    <div class="notice">Read-only dispatch surface. Research packets do not approve source art or count threats toward the strict gate.</div>
    ${commandBlock([
      'npm run research:dispatch',
      'npm run research:dispatch-check',
      'npm run sandbox:lab -- --id abyssal-gulper --with diver',
      'npm run source:approval-runway:preview -- --id <candidate-id>',
    ])}
    <section class="summary">
      <span>candidates <strong>${report.summary.candidates}</strong></span>
      <span>packets <strong>${report.summary.dispatchPackets}</strong></span>
      <span>lanes <strong>${report.summary.lanes}</strong></span>
      <span>audited <strong>${report.summary.auditedCandidates}</strong></span>
      <span>sources <strong>${report.summary.hasSource}</strong></span>
    </section>
    <table>
      <thead><tr><th>Candidate</th><th>Lane</th><th>Source</th><th>Audit</th><th>Packet</th><th>Commands</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <section class="grid">${cards}</section>
  </main>
</body>
</html>
`;
}

const research = await readJson(paths.research);
const sourceCandidates = await readJson(paths.sourceCandidates);
const pack = await readJson(paths.pack);
const trace = await readJson(paths.trace);
if (research.schema !== 'water9/threat-research-briefs@1') throw new Error(`Unexpected research schema ${research.schema ?? 'missing'}`);
if (sourceCandidates.schema !== 'water9/source-candidates@1') throw new Error(`Unexpected source candidate schema ${sourceCandidates.schema ?? 'missing'}`);
if (pack.schema !== 'water9/research-subagent-pack@1') throw new Error(`Unexpected research pack schema ${pack.schema ?? 'missing'}`);
if (trace.schema !== 'water9/research-source-trace@1') throw new Error(`Unexpected research trace schema ${trace.schema ?? 'missing'}`);

const sourceById = new Map((sourceCandidates.candidates ?? []).map((candidate) => [candidate.id, candidate]));
const traceById = new Map((trace.records ?? []).map((record) => [record.id, record]));
const dispatches = [];
for (const brief of research.briefs ?? []) {
  const source = sourceById.get(brief.id) ?? {};
  const traceRecord = traceById.get(brief.id) ?? {};
  const assignment = laneForCandidate(pack, brief.id);
  const packetFile = `public/review/source-candidates/research-dispatch-packets/${safeFileName(brief.id)}.md`;
  const dispatch = {
    id: brief.id,
    species: source.species ?? brief.species ?? brief.id,
    lane: assignment?.id ?? traceRecord.lane ?? null,
    laneTitle: assignment?.title ?? null,
    sourceStatus: source.status ?? brief.status ?? 'missing',
    hasSource: Boolean(source.source),
    source: source.source ?? null,
    sourceHref: publicUrl(source.source),
    auditFile: traceRecord.auditFile ?? null,
    gameplayVerb: brief.gameplayVerb ?? '',
    biologicalAnchors: brief.biologicalAnchors ?? [],
    requiredRead: brief.requiredRead ?? [],
    articulatableParts: brief.articulatableParts ?? [],
    promptRisks: brief.promptRisks ?? [],
    motionPhases: brief.motionPhases ?? [],
    referenceSearchTerms: traceRecord.referenceSearchTerms?.length ? traceRecord.referenceSearchTerms : brief.referenceSearchTerms ?? [],
    commands: {
      researchPack: 'npm run research:subagent-pack && npm run research:subagent-pack-check',
      sourceTrace: 'npm run research:source-trace && npm run research:source-trace-check',
      sandboxLab: `npm run sandbox:lab -- --id source-${brief.id} --with diver`,
      sourcePreview: `npm run sandbox:preview -- --id ${brief.id} --kind source --serve --open --visual`,
      sourceApprovalRunway: `npm run source:approval-runway:preview -- --id ${brief.id}`,
      nextPrompt: `npm run source:next-prompt -- --id ${brief.id}`,
      sourceAcceptDryRun: `npm run source:accept -- --id ${brief.id} --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run`,
    },
    packet: {
      file: packetFile,
      href: `/review/source-candidates/research-dispatch-packets/${safeFileName(brief.id)}.md`,
    },
  };
  dispatch.prompt = promptFor(dispatch);
  dispatches.push(dispatch);
}

dispatches.sort((a, b) => `${a.lane ?? 'zz'}:${a.species}`.localeCompare(`${b.lane ?? 'zz'}:${b.species}`));

await mkdir(paths.packetDir, { recursive: true });
for (const dispatch of dispatches) {
  await writeFile(resolve(dispatch.packet.file), packetMarkdown(dispatch));
}

const lanes = [...new Set(dispatches.map((dispatch) => dispatch.lane).filter(Boolean))].sort();
const report = {
  schema: 'water9/research-dispatch-board@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    research: paths.research,
    sourceCandidates: paths.sourceCandidates,
    pack: paths.pack,
    trace: paths.trace,
  },
  summary: {
    candidates: dispatches.length,
    dispatchPackets: dispatches.length,
    lanes: lanes.length,
    assignedToLanes: dispatches.filter((dispatch) => dispatch.lane).length,
    auditedCandidates: dispatches.filter((dispatch) => dispatch.auditFile).length,
    hasSource: dispatches.filter((dispatch) => dispatch.hasSource).length,
  },
  lanes,
  dispatches,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMd, boardMarkdown(report));
await writeFile(paths.outHtml, boardHtml(report));

console.log(JSON.stringify({
  schema: report.schema,
  candidates: report.summary.candidates,
  dispatchPackets: report.summary.dispatchPackets,
  lanes: report.summary.lanes,
  auditedCandidates: report.summary.auditedCandidates,
  hasSource: report.summary.hasSource,
  json: paths.outJson,
  markdown: paths.outMd,
  html: paths.outHtml,
}, null, 2));

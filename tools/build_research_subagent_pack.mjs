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

const researchPath = resolve(String(args.get('research') ?? 'public/review/source-candidates/research-briefs.json'));
const candidatePath = resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json'));
const outPath = resolve(String(args.get('out') ?? 'public/review/source-candidates/research-subagent-pack.md'));
const jsonOutPath = resolve(String(args.get('json-out') ?? 'public/review/source-candidates/research-subagent-pack.json'));
const htmlOutPath = resolve(String(args.get('html-out') ?? 'public/review/source-candidates/research-subagent-pack.html'));
const assignmentDir = resolve(String(args.get('assignment-dir') ?? 'public/review/source-candidates/research-subagent-assignments'));

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'assignment';
}

function markdownList(items) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- None recorded.';
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function commandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function listHtml(items) {
  return items?.length
    ? `<ul>${items.map((item) => `<li>${htmlEscape(item)}</li>`).join('')}</ul>`
    : '<ul><li>None recorded.</li></ul>';
}

function compactBrief(brief, candidate) {
  const id = brief.id;
  return {
    id,
    species: brief.species,
    status: brief.status,
    sourceCandidateStatus: candidate?.status ?? null,
    hasSource: Boolean(candidate?.source),
    commands: candidateCommands(id),
    depthBand: brief.depthBand,
    gameplayVerb: brief.gameplayVerb,
    biologicalAnchors: brief.biologicalAnchors ?? [],
    requiredRead: brief.requiredRead ?? [],
    articulatableParts: brief.articulatableParts ?? [],
    motionPhases: brief.motionPhases ?? [],
    promptRisks: brief.promptRisks ?? [],
  };
}

function candidateCommands(id) {
  return {
    prompt: `npm run source:next-prompt -- --id ${id}`,
    generationSession: `npm run source:session -- --id ${id}`,
    capture: `npm run source:inbox-capture -- --id ${id} --open`,
    recoverSavedFile: `npm run source:recover-inline -- --id ${id} --image <saved-image-path> --copy --validate`,
    inboxCheck: `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${id}`,
    ingestDryRun: `npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids ${id} --dry-run`,
    ingestApply: `npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids ${id}`,
    sourcePreview: `npm run sandbox:preview -- --id ${id} --kind source --serve --open --visual`,
  };
}

function assignmentCommands(items) {
  const ids = items.map((item) => item.id).join(',');
  const firstId = items[0]?.id ?? '<candidate-id>';
  return {
    firstPrompt: `npm run source:next-prompt -- --id ${firstId}`,
    firstSession: `npm run source:session -- --id ${firstId}`,
    firstCapture: `npm run source:inbox-capture -- --id ${firstId} --open`,
    checkAllInbox: `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${ids}`,
    ingestAllDryRun: `npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids ${ids} --dry-run`,
    ingestAllApply: `npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids ${ids}`,
  };
}

const MOBILE_WORDS = ['eel', 'fish', 'squid', 'moray', 'mantis', 'isopod', 'yeti', 'spider'];
const SESSILE_WORDS = ['sponge', 'coral', 'anemone', 'tunicate', 'kelp', 'mycelium', 'crown', 'shelf', 'pit'];
const COMPLEX_WORDS = ['siphonophore', 'colony', 'mycelium', 'black-coral-gate', 'thorn-fan-coralline', 'chain-vein'];

function textFor(item) {
  return `${item.id} ${item.species} ${item.depthBand} ${item.gameplayVerb} ${(item.biologicalAnchors ?? []).join(' ')} ${(item.requiredRead ?? []).join(' ')} ${(item.promptRisks ?? []).join(' ')}`.toLowerCase();
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function laneFor(item) {
  const text = textFor(item);
  const id = String(item.id ?? '').toLowerCase();
  const complex = includesAny(text, COMPLEX_WORDS);
  const sessile = includesAny(text, SESSILE_WORDS);
  const mobile = includesAny(text, MOBILE_WORDS);
  if (id.includes('chainmaw') || id.includes('saber') || id.includes('eel') || id.includes('squid') || id.includes('moray') || id.includes('isopod') || id.includes('mantis') || id.includes('yeti') || id.includes('spider')) return 'mobile-predator-motion';
  if (complex) return 'complex-colonial-forms';
  if (sessile) return 'sessile-ambush-hazards';
  if (mobile) return 'mobile-predator-motion';
  return 'general-threat-research';
}

function assignmentFor(id, title, focus, items) {
  return {
    id,
    title,
    focus,
    commands: assignmentCommands(items),
    outputSchema: {
      schema: 'water9/subagent-research-audit@1',
      lane: id,
      findings: [
        {
          id: '<candidate-id>',
          strengths: ['<specific strong read>'],
          sourceGenerationRisks: ['<specific risk>'],
          suggestedResearchPatch: {
            biologicalAnchors: ['<optional replacement/addition>'],
            requiredRead: ['<optional replacement/addition>'],
            promptRisks: ['<optional replacement/addition>'],
            motionPhases: ['<optional replacement/addition>'],
          },
          referenceSearchTerms: ['<stable biological reference keywords>'],
        },
      ],
    },
    candidates: items,
  };
}

function assignmentMarkdown(assignment) {
  const lines = [
    `# ${assignment.title}`,
    '',
    `Lane: \`${assignment.id}\``,
    '',
    'Focus:',
    assignment.focus,
    '',
    'Rules:',
    '- Do not edit files directly from a research assignment.',
    '- Keep output factual, compact, and candidate-id keyed.',
    '- Preserve the game design verb; propose patches only when they improve source generation or articulation.',
    '- Flag anything that risks collage-like source art, weak silhouette, or non-riggable anatomy.',
    '- Use the candidate command blocks to turn accepted research into source art capture, validation, and sandbox preview work.',
    '',
    'Lane source handoff:',
    '```bash',
    assignment.commands.firstPrompt,
    assignment.commands.firstSession,
    assignment.commands.firstCapture,
    assignment.commands.checkAllInbox,
    assignment.commands.ingestAllDryRun,
    assignment.commands.ingestAllApply,
    '```',
    '',
    'Expected JSON shape:',
    '```json',
    JSON.stringify(assignment.outputSchema, null, 2),
    '```',
    '',
    'Candidates:',
    '',
  ];
  for (const item of assignment.candidates) {
    lines.push(`## ${item.species} (${item.id})`);
    lines.push('');
    lines.push(`Status: \`${item.status}\`; source candidate: \`${item.sourceCandidateStatus ?? 'missing'}\`; has source: \`${item.hasSource}\``);
    lines.push(`Depth band: ${item.depthBand}`);
    lines.push('');
    lines.push('Gameplay verb:');
    lines.push(item.gameplayVerb);
    lines.push('');
    lines.push('Biological anchors:');
    lines.push(markdownList(item.biologicalAnchors));
    lines.push('');
    lines.push('Required read:');
    lines.push(markdownList(item.requiredRead));
    lines.push('');
    lines.push('Articulatable parts:');
    lines.push(markdownList(item.articulatableParts));
    lines.push('');
    lines.push('Prompt risks:');
    lines.push(markdownList(item.promptRisks));
    lines.push('');
    lines.push('Source handoff commands:');
    lines.push('```bash');
    lines.push(item.commands.prompt);
    lines.push(item.commands.generationSession);
    lines.push(item.commands.capture);
    lines.push(item.commands.recoverSavedFile);
    lines.push(item.commands.inboxCheck);
    lines.push(item.commands.ingestDryRun);
    lines.push(item.commands.ingestApply);
    lines.push(item.commands.sourcePreview);
    lines.push('```');
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function indexMarkdown(assignments) {
  const lines = [
    '# Water 9 Research Subagent Pack',
    '',
    'Use this pack to split underwater threat research across multiple subagents. Each assignment is read-only and returns candidate-keyed findings or patch suggestions that can be reviewed before touching the source-candidate manifests.',
    '',
    `Assignments: \`${assignments.length}\``,
    '',
    '| Assignment | Candidates | File |',
    '| --- | ---: | --- |',
  ];
  for (const assignment of assignments) {
    lines.push(`| ${assignment.title} | ${assignment.candidates.length} | [${assignment.file}](${assignment.file}) |`);
  }
  lines.push('');
  lines.push('Validation loop after applying any accepted research patches:');
  lines.push('');
  lines.push('```bash');
  lines.push('npm run research:check');
  lines.push('npm run research:import -- --all');
  lines.push('npm run source:generation-queue');
  lines.push('npm run source:contracts');
  lines.push('npm run source:inbox-pack');
  lines.push('npm run source:check');
  lines.push('npm run sandbox:preview -- --id <candidate-id> --kind source --serve --open --visual');
  lines.push('```');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function renderHtml(assignments) {
  const summaryRows = assignments.map((assignment) => `<tr>
    <td><a href="${htmlEscape(assignment.file.replace('public/review/source-candidates/', ''))}">${htmlEscape(assignment.title)}</a><code>${htmlEscape(assignment.id)}</code></td>
    <td>${assignment.candidates.length}</td>
    <td>${htmlEscape(assignment.focus)}</td>
  </tr>`).join('\n');
  const cards = assignments.map((assignment) => `<section class="card" id="${htmlEscape(assignment.id)}">
    <header>
      <div>
        <h2>${htmlEscape(assignment.title)}</h2>
        <code>${htmlEscape(assignment.id)}</code>
      </div>
      <a href="${htmlEscape(assignment.file.replace('public/review/source-candidates/', ''))}">assignment file</a>
    </header>
    <p>${htmlEscape(assignment.focus)}</p>
    <h3>Lane Source Handoff</h3>
    ${commandBlock([
      assignment.commands.firstPrompt,
      assignment.commands.firstSession,
      assignment.commands.firstCapture,
      assignment.commands.checkAllInbox,
      assignment.commands.ingestAllDryRun,
      assignment.commands.ingestAllApply,
    ])}
    <h3>Candidates</h3>
    <div class="candidate-grid">
      ${assignment.candidates.map((candidate) => `<article>
        <strong>${htmlEscape(candidate.species)}</strong>
        <code>${htmlEscape(candidate.id)}</code>
        <p>${htmlEscape(candidate.gameplayVerb)}</p>
        <h4>Required Read</h4>
        ${listHtml(candidate.requiredRead)}
        <h4>Source Handoff</h4>
        ${commandBlock([
          candidate.commands.prompt,
          candidate.commands.generationSession,
          candidate.commands.capture,
          candidate.commands.recoverSavedFile,
          candidate.commands.inboxCheck,
          candidate.commands.ingestDryRun,
          candidate.commands.ingestApply,
          candidate.commands.sourcePreview,
        ])}
      </article>`).join('')}
    </div>
  </section>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Research Subagent Pack</title>
  <style>
    :root { color-scheme: dark; --bg:#061013; --panel:#0c1b20; --line:#24424b; --text:#e2f5f6; --muted:#91aab0; --accent:#7ce5ff; --warn:#e7bd6d; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1340px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:0; font-size:18px; }
    h3 { margin:16px 0 8px; color:var(--warn); font-size:13px; text-transform:uppercase; }
    h4 { margin:12px 0 6px; color:var(--muted); font-size:12px; text-transform:uppercase; }
    p { color:var(--muted); }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    code { display:block; color:var(--muted); margin-top:3px; }
    pre { border:1px solid var(--line); background:#050b0d; padding:10px; overflow:auto; white-space:pre-wrap; }
    table { width:100%; border-collapse:collapse; margin:18px 0 24px; border:1px solid var(--line); background:var(--panel); }
    th, td { text-align:left; border-bottom:1px solid var(--line); padding:8px 10px; vertical-align:top; }
    th { color:var(--muted); font-size:12px; text-transform:uppercase; }
    .card { border:1px solid var(--line); background:var(--panel); border-radius:6px; padding:14px; margin:14px 0; }
    .card header { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
    .candidate-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:10px; }
    .candidate-grid article { border:1px solid var(--line); background:#08161a; border-radius:5px; padding:10px; }
    ul { margin:0; padding-left:18px; color:#bdd5d9; }
  </style>
</head>
<body>
  <main>
    <h1>Research Subagent Pack</h1>
    <p>Split underwater threat research across parallel read-only subagents, then validate/import accepted findings before regenerating source prompts.</p>
    ${commandBlock([
      'npm run research:subagent-pack',
      'npm run research:subagent-pack-check',
      'npm run research:check',
      'npm run research:import -- --all',
      'npm run source:generation-queue',
      'npm run source:contracts',
      'npm run source:check',
      'npm run sandbox:preview -- --id <candidate-id> --kind source --serve --open --visual',
    ])}
    <table>
      <thead><tr><th>Assignment</th><th>Candidates</th><th>Focus</th></tr></thead>
      <tbody>${summaryRows}</tbody>
    </table>
    ${cards}
  </main>
</body>
</html>
`;
}

const research = await readJson(researchPath);
if (research.schema !== 'water9/threat-research-briefs@1') {
  throw new Error(`Unexpected research schema ${research.schema ?? 'missing'}`);
}
const sourceCandidates = await readJson(candidatePath);
if (sourceCandidates.schema !== 'water9/source-candidates@1') {
  throw new Error(`Unexpected source candidate schema ${sourceCandidates.schema ?? 'missing'}`);
}

const candidatesById = new Map((sourceCandidates.candidates ?? []).map((candidate) => [candidate.id, candidate]));
const compact = (research.briefs ?? []).map((brief) => compactBrief(brief, candidatesById.get(brief.sourceCandidateId ?? brief.id)));
const lanes = new Map();
for (const item of compact) {
  const lane = laneFor(item);
  if (!lanes.has(lane)) lanes.set(lane, []);
  lanes.get(lane).push(item);
}

const laneDefinitions = [
  ['mobile-predator-motion', 'Mobile Predator Motion', 'Audit fish/eel/squid/crustacean threats for believable swimming, attack telegraph, readable side profile, and crop-safe articulated anatomy.'],
  ['sessile-ambush-hazards', 'Sessile Ambush Hazards', 'Audit fixed flora/fauna hazards for a strong rooted silhouette, clear danger mouth/spine/lure read, and separation between body and environment.'],
  ['complex-colonial-forms', 'Complex Colonial Forms', 'Audit colonial, chain, siphonophore, coral, and mycelium concepts for non-collage cohesion and simplified source-generation language.'],
  ['general-threat-research', 'General Threat Research', 'Audit any remaining threats for biological specificity, gameplay verb clarity, and riggable parts.'],
];

const assignments = laneDefinitions
  .map(([id, title, focus]) => assignmentFor(id, title, focus, lanes.get(id) ?? []))
  .filter((assignment) => assignment.candidates.length > 0)
  .map((assignment, index) => ({
    ...assignment,
    file: `public/review/source-candidates/research-subagent-assignments/${String(index + 1).padStart(2, '0')}-${safeFileName(assignment.id)}.md`,
  }));

await mkdir(dirname(outPath), { recursive: true });
await mkdir(dirname(jsonOutPath), { recursive: true });
await mkdir(dirname(htmlOutPath), { recursive: true });
await mkdir(assignmentDir, { recursive: true });
for (const assignment of assignments) {
  await writeFile(resolve(assignment.file), assignmentMarkdown(assignment));
}
await writeFile(outPath, indexMarkdown(assignments));
await writeFile(htmlOutPath, renderHtml(assignments));
await writeFile(jsonOutPath, `${JSON.stringify({
  schema: 'water9/research-subagent-pack@1',
  generatedFrom: {
    research: researchPath,
    sourceCandidates: candidatePath,
  },
  assignments,
}, null, 2)}\n`);

console.log(JSON.stringify({
  schema: 'water9/research-subagent-pack@1',
  outPath,
  jsonOutPath,
  htmlOutPath,
  assignmentDir,
  assignments: assignments.map((assignment) => ({ id: assignment.id, candidates: assignment.candidates.length, file: assignment.file })),
  failures: [],
}, null, 2));

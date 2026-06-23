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
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  criticBoard: resolve(String(args.get('critic-board') ?? 'public/review/source-candidates/source-critic-board.json')),
  replaceRunway: resolve(String(args.get('replace-runway') ?? 'public/review/source-candidates/source-replace-runway.json')),
  promptDir: resolve(String(args.get('prompt-dir') ?? 'public/review/source-candidates/critic-regeneration-prompts')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-critic-regeneration-queue.json')),
  outMarkdown: resolve(String(args.get('md-out') ?? 'public/review/source-candidates/source-critic-regeneration-queue.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-critic-regeneration-queue.html')),
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

function publicUrl(path) {
  if (!path) return null;
  if (path.startsWith('/')) return path;
  if (path.startsWith('public/')) return `/${path.slice('public/'.length)}`;
  return path;
}

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'candidate';
}

function commandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function listLines(title, items) {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  return [
    '',
    `${title}:`,
    ...(values.length ? values.map((item) => `- ${item}`) : ['- None recorded.']),
  ];
}

function htmlList(items) {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  return `<ul>${values.length ? values.map((item) => `<li>${htmlEscape(item)}</li>`).join('') : '<li>None recorded.</li>'}</ul>`;
}

function promptFor(candidate, criticItem) {
  return [
    `Critic regeneration target: ${candidate.species} (${candidate.id})`,
    '',
    'Regenerate this source image because a lane critic explicitly found it below the source-approval bar.',
    'Create one cohesive whole-source underwater threat on a flat pure #ff00ff magenta background.',
    'Do not create a parts sheet, animation strip, screenshot, UI icon, environmental prop, or collage.',
    'Preserve the gameplay verb and biological anchors, but redesign weak anatomy so it reads as one living organism.',
    '',
    candidate.prompt ?? '',
    ...listLines('Subagent cohesion failures to fix', criticItem.subagentCritique?.cohesionRisks),
    ...listLines('Subagent animation risk to solve', [criticItem.subagentCritique?.animationRisk]),
    ...listLines('Existing regenerate-if-observed risks', criticItem.advisory?.shouldRegenerateIfObserved),
    ...listLines('Required biological read', candidate.requiredRead),
    ...listLines('Crop-safe articulatable parts', candidate.articulatableParts),
    ...listLines('Prompt risks to avoid', candidate.promptRisks),
    '',
    'Hard acceptance bar:',
    '- One continuous organism with connected anatomy and consistent lighting, palette, scale, and material language.',
    '- Strong readable silhouette at small sprite scale.',
    '- Obvious attack lane and neutral riggable pose.',
    '- Clean magenta key, no white/black baked background, no particles, no prey, no text.',
    '- Every later-cropped part must have a visible root, hinge, socket, membrane, stalk, or soft tissue transition.',
  ].join('\n').trim();
}

function itemFor(candidate, criticItem, replaceItem, index) {
  const promptFile = `public/review/source-candidates/critic-regeneration-prompts/${String(index + 1).padStart(2, '0')}-${safeFileName(candidate.id)}.txt`;
  const prompt = promptFor(candidate, criticItem);
  return {
    rank: index + 1,
    id: candidate.id,
    species: candidate.species,
    status: candidate.status,
    recommendation: criticItem.subagentCritique.recommendation,
    lane: criticItem.subagentCritique.lane,
    source: candidate.source ?? criticItem.media?.source ?? null,
    promptFile,
    prompt,
    expectedInboxImage: `tools/source-inbox/${candidate.id}.png`,
    critic: {
      cohesionRisks: criticItem.subagentCritique.cohesionRisks,
      animationRisk: criticItem.subagentCritique.animationRisk,
      advisoryState: criticItem.advisory?.advisoryState ?? null,
    },
    links: {
      source: publicUrl(candidate.source ?? criticItem.media?.source),
      sourceCriticBoard: `/review/source-candidates/source-critic-board.html#${candidate.id}`,
      sourceReplaceRunway: `/review/source-candidates/source-replace-runway.html#${candidate.id}`,
      quickReview: criticItem.media?.quickReview ?? replaceItem?.links?.quickReview ?? null,
      planPreview: criticItem.media?.planPreview ?? replaceItem?.links?.planPreview ?? null,
      sandboxPreview: criticItem.media?.sandboxScreenshot ?? replaceItem?.links?.sandboxScreenshot ?? null,
      liveSourceSandbox: `/?entity=source-${candidate.id}&companion=diver`,
    },
    commands: {
      openPrompt: `sed -n '1,280p' ${promptFile}`,
      markImagegen: `npm run source:imagegen-mark -- --id ${candidate.id}`,
      checkImagegen: `npm run source:imagegen-status -- --id ${candidate.id}`,
      ingestImagegen: `npm run source:imagegen-status -- --id ${candidate.id} --ingest`,
      captureManual: `npm run source:inbox-capture -- --id ${candidate.id} --open`,
      recoverSavedImage: `npm run source:recover-inline -- --id ${candidate.id} --image <saved-image-path> --copy --validate`,
      generateOpenAiDryRun: `npm run source:generate-openai -- --id ${candidate.id} --queue public/review/source-candidates/source-critic-regeneration-queue.json --overwrite`,
      generateOpenAiApply: `npm run source:generate-openai -- --id ${candidate.id} --queue public/review/source-candidates/source-critic-regeneration-queue.json --apply --overwrite`,
      validateInbox: `python3 tools/validate_source_candidate_images.py --id ${candidate.id} --image tools/source-inbox/${candidate.id}.png`,
      dryRunReplace: `npm run source:ingest -- --id ${candidate.id} --image tools/source-inbox/${candidate.id}.png --copy --overwrite --dry-run`,
      applyReplace: `npm run source:ingest -- --id ${candidate.id} --image tools/source-inbox/${candidate.id}.png --copy --overwrite`,
      imageCheck: `npm run source:image-check -- --id ${candidate.id}`,
      sourcePreview: `npm run sandbox:preview -- --id source-${candidate.id} --with diver --serve --open --visual`,
      rebuildEvidence: 'npm run source:gallery && npm run source:preview-check && npm run content:plan-coverage && npm run content:plan-coverage-check && npm run source:review-dossier && npm run source:review-dossier-check && npm run source:approval-runway && npm run source:approval-runway-check && npm run source:visual-board && npm run source:visual-board-check && npm run source:critic-board && npm run source:critic-regeneration && npm run source:critic-regeneration-check',
    },
  };
}

function markdownFor(report) {
  const rows = report.candidates.map((item) => `| ${item.id} | ${item.species} | ${item.lane} | ${item.critic.cohesionRisks.length} | \`${item.commands.generateOpenAiDryRun}\` |`).join('\n');
  const next = report.nextCandidate;
  const nextBlock = next ? [
    '## Next Regeneration Target',
    '',
    `Species: **${next.species}** (\`${next.id}\`)`,
    '',
    `Lane: \`${next.lane}\``,
    '',
    'Execute this target first so critic-blocked source review can make measurable progress.',
    '',
    '```bash',
    next.commands.openPrompt,
    '# Imagegen/manual branch:',
    next.commands.markImagegen,
    next.commands.checkImagegen,
    next.commands.ingestImagegen,
    next.commands.captureManual,
    next.commands.recoverSavedImage,
    '# OpenAI branch:',
    next.commands.generateOpenAiDryRun,
    next.commands.generateOpenAiApply,
    '# Shared replacement/evidence branch:',
    next.commands.validateInbox,
    next.commands.dryRunReplace,
    next.commands.applyReplace,
    next.commands.imageCheck,
    next.commands.sourcePreview,
    next.commands.rebuildEvidence,
    '```',
    '',
  ].join('\n') : '';
  return `# Water 9 Critic Regeneration Queue

Generated: \`${report.generatedAt}\`

This queue is only for source candidates that a lane critic marked \`regenerate\`. It does not approve replacement art. It produces focused prompts and commands for replacing weak source images, then sends the result back through the normal source review gate.

## Summary

- Regeneration candidates: ${report.summary.regenerateCandidates}
- Lanes: ${report.summary.lanes}
- Prompt files: \`${report.promptDir}\`
- Next target: ${report.summary.nextCandidateId ?? 'none'}
- Human approval still required: ${report.policy.humanApprovalStillRequired}

${nextBlock}
## Standard Loop

\`\`\`bash
npm run source:critic-regeneration
npm run source:critic-regeneration-check
npm run source:imagegen-mark -- --id <candidate-id>
npm run source:imagegen-status -- --id <candidate-id>
npm run source:imagegen-status -- --id <candidate-id> --ingest
npm run source:inbox-capture -- --id <candidate-id> --open
npm run source:recover-inline -- --id <candidate-id> --image <saved-image-path> --copy --validate
npm run source:generate-openai -- --id <candidate-id> --queue public/review/source-candidates/source-critic-regeneration-queue.json --overwrite
npm run source:generate-openai -- --id <candidate-id> --queue public/review/source-candidates/source-critic-regeneration-queue.json --apply --overwrite
python3 tools/validate_source_candidate_images.py --id <candidate-id> --image tools/source-inbox/<candidate-id>.png
npm run source:ingest -- --id <candidate-id> --image tools/source-inbox/<candidate-id>.png --copy --overwrite --dry-run
npm run source:ingest -- --id <candidate-id> --image tools/source-inbox/<candidate-id>.png --copy --overwrite
npm run source:image-check -- --id <candidate-id>
npm run sandbox:preview -- --id source-<candidate-id> --with diver --serve --open --visual
npm run source:gallery && npm run source:preview-check && npm run content:plan-coverage && npm run content:plan-coverage-check && npm run source:review-dossier && npm run source:review-dossier-check && npm run source:approval-runway && npm run source:approval-runway-check && npm run source:visual-board && npm run source:visual-board-check && npm run source:critic-board && npm run source:critic-regeneration && npm run source:critic-regeneration-check
\`\`\`

## Candidates

| Candidate | Species | Lane | Critic risks | Dry run |
| --- | --- | --- | ---: | --- |
${rows}
`;
}

function imageBlock(label, src) {
  if (!src) return `<div class="image missing"><span>${htmlEscape(label)} missing</span></div>`;
  return `<a class="image" href="${htmlEscape(src)}"><img src="${htmlEscape(src)}" alt="${htmlEscape(label)}"><span>${htmlEscape(label)}</span></a>`;
}

function htmlFor(report) {
  const next = report.nextCandidate;
  const nextCard = next ? `<section class="next" id="next-regeneration-target">
    <header>
      <div><h2>Next Regeneration Target</h2><code>${htmlEscape(next.id)}</code></div>
      <strong>${htmlEscape(next.species)}</strong>
    </header>
    <p>${htmlEscape(next.lane)} · execute this target first, then rebuild evidence and return it to source approval.</p>
    <div class="media">
      ${imageBlock('current source', next.links.source)}
      ${imageBlock('sandbox preview', next.links.sandboxPreview)}
      ${imageBlock('plan preview', next.links.planPreview)}
    </div>
    <h3>Focused Command Loop</h3>
    ${commandBlock([
      next.commands.openPrompt,
      '# Imagegen/manual branch:',
      next.commands.markImagegen,
      next.commands.checkImagegen,
      next.commands.ingestImagegen,
      next.commands.captureManual,
      next.commands.recoverSavedImage,
      '# OpenAI branch:',
      next.commands.generateOpenAiDryRun,
      next.commands.generateOpenAiApply,
      '# Shared replacement/evidence branch:',
      next.commands.validateInbox,
      next.commands.dryRunReplace,
      next.commands.applyReplace,
      next.commands.imageCheck,
      next.commands.sourcePreview,
      next.commands.rebuildEvidence,
    ])}
  </section>` : '';
  const cards = report.candidates.map((item) => `<article id="${htmlEscape(item.id)}" data-critic-regeneration="${htmlEscape(item.id)}">
    <header>
      <div><h2>${htmlEscape(item.species)}</h2><code>${htmlEscape(item.id)}</code></div>
      <strong>${htmlEscape(item.recommendation)}</strong>
    </header>
    <p>${htmlEscape(item.lane)} · source replacement must return to human approval.</p>
    <div class="media">
      ${imageBlock('current source', item.links.source)}
      ${imageBlock('sandbox preview', item.links.sandboxPreview)}
      ${imageBlock('plan preview', item.links.planPreview)}
    </div>
    <div class="links">
      <a href="${htmlEscape(item.links.sourceCriticBoard)}">critic board</a>
      <a href="${htmlEscape(item.links.sourceReplaceRunway)}">replace runway</a>
      <a href="${htmlEscape(item.links.quickReview ?? '#')}">quick review</a>
      <a href="${htmlEscape(item.links.liveSourceSandbox)}">source + diver</a>
      <a href="${htmlEscape(publicUrl(item.promptFile))}">prompt</a>
    </div>
    <h3>Cohesion Failures To Fix</h3>
    ${htmlList(item.critic.cohesionRisks)}
    <h3>Animation Risk</h3>
    <p>${htmlEscape(item.critic.animationRisk)}</p>
    <h3>Commands</h3>
    ${commandBlock(Object.values(item.commands))}
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Critic Regeneration Queue</title>
  <style>
    :root { color-scheme: dark; --bg:#050b0d; --panel:#0d171b; --line:#28434a; --text:#e8f6f5; --muted:#95aaad; --accent:#74d8f1; --warn:#f0bd68; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1320px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:0; font-size:18px; }
    h3 { margin:16px 0 8px; color:var(--muted); font-size:12px; text-transform:uppercase; }
    p { color:var(--muted); }
    article { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:14px; margin:12px 0; }
    .next { border:1px solid var(--warn); background:#15120a; border-radius:7px; padding:14px; margin:18px 0; }
    article header { display:flex; justify-content:space-between; gap:12px; align-items:start; }
    .next header { display:flex; justify-content:space-between; gap:12px; align-items:start; }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { margin:0; border:1px solid var(--line); background:#030708; padding:10px; overflow:auto; white-space:pre-wrap; }
    strong { color:var(--warn); }
    .summary, .links { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }
    .summary span, .links a { border:1px solid var(--line); background:#071216; border-radius:5px; padding:7px 9px; color:var(--muted); }
    .media { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px; margin:14px 0; }
    .image { display:block; border:1px solid var(--line); background:#020506; min-height:120px; overflow:hidden; }
    .image img { display:block; width:100%; height:160px; object-fit:contain; image-rendering:auto; }
    .image span { display:block; padding:7px 9px; color:var(--muted); }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Critic Regeneration Queue</h1>
    <p>Focused replacement queue for source candidates with explicit regenerate findings. This does not approve any source art.</p>
    ${commandBlock(['npm run source:critic-regeneration', 'npm run source:critic-regeneration-check'])}
    <div class="summary">
      <span>regenerate candidates <strong>${report.summary.regenerateCandidates}</strong></span>
      <span>lanes <strong>${report.summary.lanes}</strong></span>
      <span>next target <strong>${htmlEscape(report.summary.nextCandidateId ?? 'none')}</strong></span>
      <span>human approval still required <strong>${report.policy.humanApprovalStillRequired}</strong></span>
    </div>
    ${nextCard}
    ${cards}
  </main>
</body>
</html>
`;
}

const sourceCandidates = await readJson(paths.sourceCandidates);
const criticBoard = await readJson(paths.criticBoard);
const replaceRunway = await readJson(paths.replaceRunway);
if (sourceCandidates.schema !== 'water9/source-candidates@1') throw new Error(`Unexpected source candidates schema ${sourceCandidates.schema ?? 'missing'}`);
if (criticBoard.schema !== 'water9/source-critic-board@1') throw new Error(`Unexpected source critic board schema ${criticBoard.schema ?? 'missing'}`);
if (replaceRunway.schema !== 'water9/source-replace-runway@1') throw new Error(`Unexpected source replace runway schema ${replaceRunway.schema ?? 'missing'}`);

const candidateById = new Map((sourceCandidates.candidates ?? []).map((candidate) => [candidate.id, candidate]));
const replaceById = new Map((replaceRunway.items ?? []).map((item) => [item.id, item]));
const criticItems = (criticBoard.items ?? []).filter((item) => item.subagentCritique?.recommendation === 'regenerate');
const candidates = criticItems.map((criticItem, index) => {
  const candidate = candidateById.get(criticItem.id);
  if (!candidate) throw new Error(`${criticItem.id}: missing source candidate`);
  return itemFor(candidate, criticItem, replaceById.get(criticItem.id), index);
});
const nextCandidate = candidates[0] ?? null;

await mkdir(paths.promptDir, { recursive: true });
for (const item of candidates) {
  await writeFile(resolve(item.promptFile), `${item.prompt}\n`);
}

const report = {
  schema: 'water9/source-critic-regeneration-queue@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    sourceCandidates: paths.sourceCandidates,
    criticBoard: paths.criticBoard,
    replaceRunway: paths.replaceRunway,
  },
  promptDir: 'public/review/source-candidates/critic-regeneration-prompts',
  policy: {
    advisoryOnly: true,
    doesNotApproveSources: true,
    doesNotAcceptThreats: true,
    humanApprovalStillRequired: true,
    replacementMustReturnToSourceReview: true,
  },
  summary: {
    regenerateCandidates: candidates.length,
    lanes: new Set(candidates.map((item) => item.lane)).size,
    promptFiles: candidates.length,
    nextCandidateId: nextCandidate?.id ?? null,
    nextCandidateSpecies: nextCandidate?.species ?? null,
    nextPromptFile: nextCandidate?.promptFile ?? null,
  },
  nextCandidate,
  candidates,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdownFor(report));
await writeFile(paths.outHtml, htmlFor(report));

console.log(JSON.stringify({
  schema: report.schema,
  regenerateCandidates: report.summary.regenerateCandidates,
  lanes: report.summary.lanes,
  nextCandidate: report.summary.nextCandidateId,
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
}, null, 2));

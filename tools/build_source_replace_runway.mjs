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
  approvalRunway: resolve(String(args.get('approval-runway') ?? 'public/review/source-approval-runway.json')),
  visualBoard: resolve(String(args.get('visual-board') ?? 'public/review/source-visual-board.json')),
  reviewDossier: resolve(String(args.get('review-dossier') ?? 'public/review/source-candidates/source-review-dossier.json')),
  rejections: resolve(String(args.get('rejections') ?? 'public/review/source-candidates/rejected-attempts.json')),
  promptDir: resolve(String(args.get('prompt-dir') ?? 'public/review/source-candidates/replace-runway-prompts')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-replace-runway.json')),
  outMarkdown: resolve(String(args.get('md-out') ?? 'public/review/source-candidates/source-replace-runway.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-replace-runway.html')),
};

const REPLACEMENT_RULES = [
  'This is a replacement source pass for an existing source-present candidate, not a first-pass missing-art lane.',
  'Generate one cohesive whole-source organism on pure #ff00ff, not a parts board, animation strip, screenshot, or collage.',
  'Preserve the gameplay verb and biological anchors, but improve whole-creature cohesion, silhouette, crop margins, and riggable anatomy.',
  'Do not reuse obvious placeholder geometry, mismatched copied fragments, environmental props, baked particles, text, UI marks, or a non-magenta background.',
  'Keep every intended articulatable appendage visibly connected to one body with readable hinge/root zones.',
];

async function readJson(path, fallback) {
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

function markdownList(items) {
  return (items ?? []).length ? items.map((item) => `- ${item}`).join('\n') : '- none';
}

function htmlList(items) {
  return `<ul>${(items ?? []).length ? items.map((item) => `<li>${htmlEscape(item)}</li>`).join('') : '<li>none</li>'}</ul>`;
}

function dryRunIngestCommand(id) {
  return `npm run source:ingest -- --id ${id} --image tools/source-inbox/${id}.png --copy --overwrite --dry-run`;
}

function applyIngestCommand(id) {
  return `npm run source:ingest -- --id ${id} --image tools/source-inbox/${id}.png --copy --overwrite`;
}

function promptFor(candidate, approvalItem, dossierItem, visualItem) {
  return [
    `Replacement source target: ${candidate.species} (${candidate.id})`,
    `Existing source to replace after review: ${candidate.source ?? 'none'}`,
    '',
    candidate.prompt ?? '',
    '',
    'Replacement rules:',
    ...REPLACEMENT_RULES.map((item) => `- ${item}`),
    '',
    'Gameplay verb:',
    `- ${candidate.gameplayVerb ?? approvalItem?.gameplayVerb ?? 'Preserve the existing threat behavior and readable attack lane.'}`,
    '',
    'Required read:',
    ...(candidate.requiredRead ?? []).map((item) => `- ${item}`),
    '',
    'Articulatable parts that must remain crop-safe:',
    ...(candidate.articulatableParts ?? []).map((item) => `- ${item}`),
    '',
    'Candidate-specific rejection risks:',
    ...(candidate.promptRisks ?? []).map((item) => `- ${item}`),
    '- Reject if the output feels like unrelated fragments assembled into one image rather than one organism.',
    '- Reject if the silhouette only works at full resolution and fails as a small game sprite.',
    '',
    'Evidence to inspect before replacing:',
    `- Current source: ${candidate.source ?? 'missing'}`,
    `- Current quick review: ${approvalItem?.links?.quickReview ?? 'missing'}`,
    `- Current visual board row: ${visualItem ? 'public/review/source-visual-board.html' : 'missing'}`,
    `- Current review packet: ${dossierItem?.reviewPacket?.file ?? 'missing'}`,
  ].join('\n').trim();
}

function latestRejectionsFor(id, attempts) {
  return (attempts ?? [])
    .filter((attempt) => attempt.candidateId === id)
    .slice()
    .sort((left, right) => String(right.rejectedAt ?? '').localeCompare(String(left.rejectedAt ?? '')))
    .slice(0, 3);
}

function itemFor(candidate, index, approvalItem, dossierItem, visualItem, attempts) {
  const id = candidate.id;
  const promptFile = `public/review/source-candidates/replace-runway-prompts/${String(index + 1).padStart(2, '0')}-${safeFileName(id)}.txt`;
  const sourcePresent = Boolean(candidate.source);
  const humanApproved = candidate.status === 'approved' || candidate.review?.status === 'approved' || approvalItem?.humanApproved === true;
  const latestRejections = latestRejectionsFor(id, attempts);
  const replaceable = sourcePresent && !humanApproved;
  const prompt = promptFor(candidate, approvalItem, dossierItem, visualItem);
  return {
    rank: index + 1,
    id,
    species: candidate.species,
    status: candidate.status,
    sourcePresent,
    humanApproved,
    replaceable,
    existingSource: candidate.source ?? null,
    promptFile,
    prompt,
    reason: replaceable
      ? 'Source exists and still awaits human approval; weak art can be intentionally regenerated and overwritten through this lane.'
      : humanApproved
        ? 'Source is human-approved; replacement requires intentionally moving it back to needs-review first.'
        : 'No current source exists; use the first-pass source generation queue instead.',
    links: {
      source: publicUrl(candidate.source),
      keyPreview: approvalItem?.links?.keyPreview ?? visualItem?.media?.keyPreview ?? null,
      sandboxScreenshot: approvalItem?.links?.sandboxScreenshot ?? visualItem?.media?.sandboxScreenshot ?? null,
      planPreview: approvalItem?.links?.planPreview ?? visualItem?.media?.planPreview ?? null,
      approvalRunway: `/review/source-approval-runway.html#${id}`,
      visualBoard: `/review/source-visual-board.html#${id}`,
      quickReview: approvalItem?.links?.quickReview ?? visualItem?.links?.quickReview ?? null,
      sourceSandboxLive: approvalItem?.links?.sourceSandboxLive ?? `/?entity=source-${id}&companion=diver`,
    },
    commands: {
      openPrompt: `sed -n '1,260p' ${promptFile}`,
      captureReplacement: `npm run source:inbox-capture -- --id ${id} --open`,
      validateInbox: `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${id}`,
      dryRunReplace: dryRunIngestCommand(id),
      applyReplace: applyIngestCommand(id),
      imageCheck: `npm run source:image-check -- --id ${id}`,
      sourcePreview: `npm run sandbox:preview -- --id source-${id} --with diver --serve --open --visual`,
      rebuildEvidence: 'npm run source:review-dossier && npm run source:review-dossier-check && npm run source:approval-runway && npm run source:approval-runway-check && npm run source:visual-board && npm run source:visual-board-check',
      fullReviewLoop: `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${id} && ${dryRunIngestCommand(id)} && ${applyIngestCommand(id)} && npm run source:image-check -- --id ${id} && npm run source:preview-check && npm run source:review-dossier && npm run source:approval-runway && npm run source:visual-board`,
    },
    latestRejections,
    requiredRead: candidate.requiredRead ?? [],
    promptRisks: candidate.promptRisks ?? [],
    articulatableParts: candidate.articulatableParts ?? [],
  };
}

function markdownFor(report) {
  const rows = report.items.map((item) => `| ${item.id} | ${item.species} | ${item.replaceable ? 'yes' : 'no'} | ${item.humanApproved ? 'yes' : 'no'} | \`${item.commands.dryRunReplace}\` |`).join('\n');
  return `# Water 9 Source Replace Runway

Generated: \`${report.generatedAt}\`

This runway is for replacing weak existing source art through an intentional overwrite workflow. It does not approve source art and it does not bypass human review. Replacement uses an explicit \`--overwrite\` ingest command, rejects byte-identical no-op replacements, then rebuilds the existing approval evidence.

## Summary

- Candidates: ${report.summary.candidates}
- Existing sources: ${report.summary.sourcePresent}
- Replaceable existing sources: ${report.summary.replaceable}
- Human approved sources: ${report.summary.humanApproved}
- Prompt files: \`${report.promptDir}\`

## Safe Replacement Loop

1. Inspect the current source, key preview, sandbox preview, visual board, and plan preview.
2. Generate a better whole-source organism from the replacement prompt.
3. Save it to \`tools/source-inbox/<id>.png\`.
4. Run the dry-run replacement command and inspect the report. The ingest guard refuses byte-identical replacements unless \`--allow-identical-overwrite\` is passed for an intentional metadata repair.
5. Apply replacement only if the dry run and image check are clean.
6. Rebuild source review evidence and return to the approval runway.

## Replacement Boundary

This page stages source-art replacement only. Human approval still happens in the source approval runway after regenerated evidence has been inspected.

## Candidates

| Candidate | Species | Replaceable | Approved | Dry-run replace |
| --- | --- | ---: | ---: | --- |
${rows}
`;
}

function imageBlock(label, src) {
  if (!src) return `<div class="image missing"><span>${htmlEscape(label)} missing</span></div>`;
  return `<a class="image" href="${htmlEscape(src)}"><img src="${htmlEscape(src)}" alt="${htmlEscape(label)}"><span>${htmlEscape(label)}</span></a>`;
}

function htmlFor(report) {
  const cards = report.items.map((item) => `<article class="card" id="${htmlEscape(item.id)}" data-source-replace-candidate="${htmlEscape(item.id)}" data-prompt-file="${htmlEscape(item.promptFile)}">
    <header>
      <div><h2>${htmlEscape(item.species)}</h2><code>${htmlEscape(item.id)}</code></div>
      <strong>${item.replaceable ? 'replaceable' : item.humanApproved ? 'approved' : 'first-pass'}</strong>
    </header>
    <p>${htmlEscape(item.reason)}</p>
    <div class="media">
      ${imageBlock('current source', item.links.source)}
      ${imageBlock('magenta key', item.links.keyPreview)}
      ${imageBlock('sandbox preview', item.links.sandboxScreenshot)}
      ${imageBlock('plan preview', item.links.planPreview)}
    </div>
    <div class="links">
      <a href="${htmlEscape(item.links.approvalRunway)}">approval runway</a>
      <a href="${htmlEscape(item.links.visualBoard)}">visual board</a>
      <a href="${htmlEscape(item.links.quickReview ?? '#')}">quick review</a>
      <a href="${htmlEscape(item.links.sourceSandboxLive)}">source + diver</a>
      <a href="${htmlEscape(publicUrl(item.promptFile))}">replacement prompt</a>
    </div>
    <p><strong>Prompt file:</strong> <code>${htmlEscape(item.promptFile)}</code></p>
    <h3>Replacement Commands</h3>
    ${commandBlock([
      item.commands.captureReplacement,
      item.commands.validateInbox,
      item.commands.dryRunReplace,
      item.commands.applyReplace,
      item.commands.imageCheck,
      item.commands.sourcePreview,
      item.commands.rebuildEvidence,
    ])}
    <h3>Full Loop</h3>
    ${commandBlock([item.commands.fullReviewLoop])}
    <details>
      <summary>Prompt risks</summary>
      ${htmlList(item.promptRisks)}
    </details>
    <details>
      <summary>Latest rejection notes</summary>
      ${htmlList(item.latestRejections.map((attempt) => `${attempt.rejectedAt ?? 'unknown'}: ${attempt.reason ?? 'no reason'}`))}
    </details>
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Replace Runway</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0d1b20; --line:#29444b; --text:#e6f5f5; --muted:#91a9ae; --accent:#7adff6; --warn:#e7bd6d; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1440px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:0; font-size:18px; }
    h3 { margin:16px 0 8px; color:var(--muted); font-size:13px; text-transform:uppercase; }
    p, li { color:var(--muted); }
    a { color:var(--accent); text-decoration:none; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { margin:0; border:1px solid var(--line); background:#050b0d; padding:10px; overflow:auto; white-space:pre-wrap; }
    .summary, .links { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }
    .summary span { border:1px solid var(--line); background:#09171b; border-radius:5px; padding:7px 9px; color:var(--muted); }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(430px,1fr)); gap:14px; align-items:start; }
    .card { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:14px; }
    .card header { display:flex; justify-content:space-between; gap:12px; align-items:start; }
    .media { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin:12px 0; }
    .image { display:flex; min-height:120px; flex-direction:column; justify-content:space-between; border:1px solid var(--line); background:#050b0d; color:var(--accent); text-decoration:none; overflow:hidden; }
    .image img { width:100%; height:120px; object-fit:contain; background:#050b0d; }
    .image span { padding:6px; color:var(--muted); font-size:12px; }
    .missing { align-items:center; justify-content:center; color:var(--warn); }
    .warning { color:var(--warn); }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Source Replace Runway</h1>
    <p>Regenerate weak existing source art with intentional overwrite, then rebuild evidence for human approval. This page does not approve source art.</p>
    <div class="summary">
      <span>candidates <strong>${report.summary.candidates}</strong></span>
      <span>existing sources <strong>${report.summary.sourcePresent}</strong></span>
      <span>replaceable <strong>${report.summary.replaceable}</strong></span>
      <span>approved <strong>${report.summary.humanApproved}</strong></span>
      <span>approval <a href="/review/source-approval-runway.html">runway</a></span>
      <span>visual <a href="/review/source-visual-board.html">board</a></span>
    </div>
    <section class="warning">
      <h2>Replacement Boundary</h2>
      <p>Every replacement command includes <code>--overwrite</code>, starts with a dry run, and rejects byte-identical no-op replacements. Use <code>--allow-identical-overwrite</code> only for an intentional metadata repair. Human approval still happens only in the source approval runway after regenerated evidence is reviewed.</p>
    </section>
    <section>
      <h2>Safe Replacement Loop</h2>
      <p>Inspect current evidence, generate a better cohesive whole-source organism, save it to the source inbox, dry-run the overwrite, apply only after validation confirms the image is distinct, then rebuild approval evidence.</p>
    </section>
    <section class="grid">${cards}</section>
  </main>
</body>
</html>
`;
}

const sourceCandidates = await readJson(paths.sourceCandidates, null);
const approvalRunway = await readJson(paths.approvalRunway, { items: [] });
const visualBoard = await readJson(paths.visualBoard, { items: [] });
const reviewDossier = await readJson(paths.reviewDossier, { items: [] });
const rejections = await readJson(paths.rejections, { attempts: [] });
if (sourceCandidates?.schema !== 'water9/source-candidates@1') throw new Error(`Unexpected source candidate schema ${sourceCandidates?.schema ?? 'missing'}`);
if (approvalRunway?.schema !== 'water9/source-approval-runway@1') throw new Error(`Unexpected source approval runway schema ${approvalRunway?.schema ?? 'missing'}`);

const approvalById = new Map((approvalRunway.items ?? []).map((item) => [item.id, item]));
const visualById = new Map((visualBoard.items ?? []).map((item) => [item.id, item]));
const dossierById = new Map((reviewDossier.items ?? []).map((item) => [item.id, item]));
const attempts = Array.isArray(rejections.attempts) ? rejections.attempts : [];
const items = (sourceCandidates.candidates ?? []).map((candidate, index) => itemFor(
  candidate,
  index,
  approvalById.get(candidate.id),
  dossierById.get(candidate.id),
  visualById.get(candidate.id),
  attempts,
));

await mkdir(paths.promptDir, { recursive: true });
for (const item of items) {
  await writeFile(resolve(item.promptFile), `${item.prompt}\n`);
}

const report = {
  schema: 'water9/source-replace-runway@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    sourceCandidates: paths.sourceCandidates,
    approvalRunway: paths.approvalRunway,
    visualBoard: paths.visualBoard,
    reviewDossier: paths.reviewDossier,
    rejections: paths.rejections,
  },
  promptDir: 'public/review/source-candidates/replace-runway-prompts',
  replacementRules: REPLACEMENT_RULES,
  summary: {
    candidates: items.length,
    sourcePresent: items.filter((item) => item.sourcePresent).length,
    replaceable: items.filter((item) => item.replaceable).length,
    humanApproved: items.filter((item) => item.humanApproved).length,
    promptFiles: items.length,
  },
  recommended: items.find((item) => item.replaceable) ?? null,
  items,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdownFor(report));
await writeFile(paths.outHtml, htmlFor(report));

console.log(JSON.stringify({
  schema: report.schema,
  candidates: report.summary.candidates,
  sourcePresent: report.summary.sourcePresent,
  replaceable: report.summary.replaceable,
  humanApproved: report.summary.humanApproved,
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
}, null, 2));

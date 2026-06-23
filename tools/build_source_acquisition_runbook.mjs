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
  sprint: resolve(String(args.get('sprint') ?? 'public/review/source-candidates/source-generation-sprint.json')),
  inboxReview: resolve(String(args.get('inbox-review') ?? 'public/review/source-inbox/manifest.json')),
  jsonOut: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-acquisition-runbook.json')),
  markdownOut: resolve(String(args.get('out') ?? 'public/review/source-candidates/source-acquisition-runbook.md')),
  htmlOut: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-acquisition-runbook.html')),
};

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
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

function codeBlock(commands) {
  return commands.filter(Boolean).join('\n');
}

function shellIds(ids) {
  return ids.join(',');
}

function expectedInboxFiles(inboxDir, id) {
  const dir = String(inboxDir ?? 'tools/source-inbox').replace(/\/$/, '');
  return [`${dir}/${id}.png`, `${dir}/fauna-${id}-whole-source.png`];
}

function commandsFor(card, inboxDir) {
  const id = card.id;
  const captureFirst = Boolean(card.captureFirst);
  return {
    printPrompt: card.commands?.printPrompt ?? `npm run source:next-prompt -- --id ${id}`,
    startSession: card.commands?.startSession ?? `npm run source:session -- --id ${id}`,
    captureInbox: card.commands?.captureInbox ?? `npm run source:inbox-capture -- --id ${id} --open`,
    ...(captureFirst ? {} : {
      recoverInline: card.commands?.recoverInline ?? `npm run source:recover-inline -- --id ${id} --copy --validate`,
    }),
    recoverSavedFile: card.commands?.recoverSavedFile ?? `npm run source:recover-inline -- --id ${id} --image <saved-image-path> --copy --validate`,
    recoverDataUrl: card.commands?.recoverDataUrl ?? `npm run source:recover-inline -- --id ${id} --data-url-stdin --copy --validate`,
    recoverBase64: card.commands?.recoverBase64 ?? `npm run source:recover-inline -- --id ${id} --stdin-base64 --stdin-filename ${id}.png --copy --validate`,
    recoveryScout: `npm run source:recovery-scout -- --id ${id}`,
    generateOpenAI: `npm run source:generate-openai -- --id ${id} --apply`,
    generateOpenAIDryRun: `npm run source:generate-openai -- --id ${id}`,
    inboxCheck: card.commands?.inboxCheck ?? `npm run source:inbox-check -- --dir ${inboxDir} --strict --ids ${id}`,
    ingestDryRun: `npm run source:ingest-current -- --id ${id} --dry-run`,
    ingest: `npm run source:ingest-current -- --id ${id} --apply`,
    sourcePreview: `npm run sandbox:preview -- --id ${id} --kind source --serve --open --visual`,
  };
}

function candidateSection(item) {
  const mode = item.captureFirst ? 'capture-first' : 'session-first';
  return [
    `### ${item.rank}. ${item.species} (${item.id})`,
    '',
    `Mode: \`${mode}\``,
    `Capture URL: \`${item.captureUrl}\``,
    `Inbox files: ${item.expectedInboxFiles.map((file) => `\`${file}\``).join(', ')}`,
    `Prompt file: \`${item.promptFile ?? 'missing'}\``,
    `Contract: \`${item.contract}\``,
    `Inbox status: \`${item.inboxStatus}\``,
    item.captureFirst ? `Capture warning: ${item.captureReason}` : '',
    '',
    '```bash',
    ...Object.values(item.commands),
    '```',
    '',
  ].filter((line) => line !== '').join('\n');
}

function renderMarkdown(runbook) {
  return [
    '# Water 9 Source Acquisition Runbook',
    '',
    `Generated: \`${runbook.generatedAt}\``,
    `Sprint ids: \`${runbook.ids.join(', ')}\``,
    `OpenAI API key available: \`${runbook.openaiApiKeyAvailable}\``,
    '',
    'This is the batch execution sheet for turning the active source-generation sprint into recoverable project-bound source images. It favors capture/manual-save for candidates with repeated missing-artifact attempts.',
    '',
    '## Batch Procedure',
    '',
    '1. Open the first target workstation or capture URL.',
    '2. Generate one cohesive whole-creature image on pure `#ff00ff` magenta.',
    '3. Save or capture it to one of the listed inbox filenames.',
    '4. Run focused inbox validation before ingesting.',
    '5. Run the batch dry-run, then apply only when every selected image passes.',
    '6. Rebuild source previews and review dossiers after ingestion.',
    '',
    '## Batch Commands',
    '',
    '```bash',
    ...Object.values(runbook.batchCommands),
    '```',
    '',
    '## Acquisition Targets',
    '',
    ...runbook.candidates.map(candidateSection),
  ].join('\n');
}

function renderHtml(runbook) {
  const rows = runbook.candidates.map((item) => `<tr>
    <td>${htmlEscape(item.rank)}</td>
    <td><strong>${htmlEscape(item.species)}</strong><code>${htmlEscape(item.id)}</code></td>
    <td>${htmlEscape(item.captureFirst ? 'capture-first' : 'session-first')}</td>
    <td><code>${htmlEscape(item.inboxStatus)}</code></td>
    <td><code>${htmlEscape(item.expectedInboxFiles.join(' or '))}</code></td>
    <td><a href="${htmlEscape(item.captureUrl)}">${htmlEscape(item.captureUrl)}</a></td>
  </tr>`).join('\n');
  const cards = runbook.candidates.map((item) => `<section class="card" id="${htmlEscape(item.id)}">
    <h2>${htmlEscape(item.species)}</h2>
    <p><code>${htmlEscape(item.id)}</code> · ${htmlEscape(item.captureFirst ? 'capture-first' : 'session-first')} · inbox ${htmlEscape(item.inboxStatus)}</p>
    ${item.captureFirst ? `<p class="warn">${htmlEscape(item.captureReason)}</p>` : ''}
    <dl>
      <div><dt>capture url</dt><dd><a href="${htmlEscape(item.captureUrl)}">${htmlEscape(item.captureUrl)}</a></dd></div>
      <div><dt>expected inbox</dt><dd>${item.expectedInboxFiles.map((file) => `<code>${htmlEscape(file)}</code>`).join(' ')}</dd></div>
      <div><dt>prompt</dt><dd><code>${htmlEscape(item.promptFile ?? 'missing')}</code></dd></div>
      <div><dt>contract</dt><dd><code>${htmlEscape(item.contract)}</code></dd></div>
    </dl>
    <pre><code>${htmlEscape(codeBlock(Object.values(item.commands)))}</code></pre>
  </section>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Acquisition Runbook</title>
  <style>
    :root { color-scheme: dark; --bg:#061114; --panel:#0d1e24; --line:#294751; --text:#e7f7f8; --muted:#9eb7bd; --accent:#83e8ff; --warn:#f0c66e; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1320px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:0; font-size:18px; }
    p { color:var(--muted); }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { border:1px solid var(--line); background:#050b0d; padding:10px; overflow:auto; white-space:pre-wrap; }
    table { width:100%; border-collapse:collapse; margin:18px 0 24px; border:1px solid var(--line); background:var(--panel); }
    th, td { text-align:left; border-bottom:1px solid var(--line); padding:8px 10px; vertical-align:top; }
    th { color:var(--muted); font-size:12px; text-transform:uppercase; }
    .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(380px,1fr)); gap:14px; }
    .card { border:1px solid var(--line); background:var(--panel); border-radius:6px; padding:14px; }
    .warn { color:var(--warn); }
    dl { display:grid; gap:7px; }
    dt { color:var(--muted); font-size:11px; text-transform:uppercase; }
    dd { margin:0; }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Source Acquisition Runbook</h1>
    <p>Batch execution sheet for the current source-generation sprint. Capture/manual-save keeps inline image generation recoverable inside the repo.</p>
    <h2>Batch Procedure</h2>
    <ol>
      <li>Open the first target workstation or capture URL.</li>
      <li>Generate one cohesive whole-creature image on pure <code>#ff00ff</code> magenta.</li>
      <li>Save or capture it to one of the listed inbox filenames.</li>
      <li>Run focused inbox validation before ingesting.</li>
      <li>Run the batch dry-run, then apply only when every selected image passes.</li>
      <li>Rebuild source previews and review dossiers after ingestion.</li>
    </ol>
    <h2>Batch Commands</h2>
    <pre><code>${htmlEscape(codeBlock(Object.values(runbook.batchCommands)))}</code></pre>
    <h2>Acquisition Targets</h2>
    <table>
      <thead><tr><th>Rank</th><th>Candidate</th><th>Mode</th><th>Inbox</th><th>Expected Files</th><th>Capture</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <section class="cards">${cards}</section>
  </main>
</body>
</html>
`;
}

const sprint = await readJson(paths.sprint);
if (sprint.schema !== 'water9/source-generation-sprint@1') {
  throw new Error(`Unexpected source-generation sprint schema ${sprint.schema ?? 'missing'}`);
}
const inboxReview = await readJson(paths.inboxReview).catch(() => ({ schema: null, candidates: [] }));
const inboxById = new Map((Array.isArray(inboxReview.candidates) ? inboxReview.candidates : []).map((item) => [item.id, item]));
const ids = Array.isArray(sprint.ids) ? sprint.ids : [];
const inboxDir = sprint.inboxDir ?? 'tools/source-inbox';
const candidates = (Array.isArray(sprint.candidates) ? sprint.candidates : []).map((card, index) => {
  const inboxItem = inboxById.get(card.id);
  const commands = commandsFor(card, inboxDir);
  return {
    id: card.id,
    species: card.species,
    rank: card.rank ?? index + 1,
    promptFile: card.promptFile,
    contract: card.contract,
    expectedOutput: card.expectedOutput,
    expectedInboxFiles: expectedInboxFiles(inboxDir, card.id),
    captureUrl: `http://127.0.0.1:5188/?id=${encodeURIComponent(card.id)}`,
    captureFirst: Boolean(card.captureFirst),
    captureReason: card.captureReason ?? null,
    missingArtifactAttempts: card.missingArtifactAttempts ?? 0,
    inboxStatus: inboxItem?.ready ? 'ready' : inboxItem?.inboxImage ? 'blocked' : 'missing',
    commands,
  };
});
const batchCommands = {
  rebuildSprint: 'npm run source:sprint',
  rebuildInboxReview: 'npm run source:inbox-review',
  imagegenHealth: 'npm run source:imagegen-health',
  recoveryScout: ids[0] ? `npm run source:recovery-scout -- --id ${ids[0]}` : null,
  recoveryScoutCheck: 'npm run source:recovery-scout-check',
  batchCapture: `npm run source:inbox-capture -- --ids ${shellIds(ids)}${ids[0] ? ` --id ${ids[0]}` : ''} --open`,
  batchOpenAIDryRun: `npm run source:generate-openai-batch -- --ids ${shellIds(ids)}`,
  batchOpenAIApply: `npm run source:generate-openai-batch -- --ids ${shellIds(ids)} --apply`,
  advanceInboxDryRun: `npm run source:advance-inbox -- --ids ${shellIds(ids)}`,
  advanceInboxApply: `npm run source:advance-inbox -- --ids ${shellIds(ids)} --apply`,
  firstOpenAIDryRun: ids[0] ? `npm run source:generate-openai -- --id ${ids[0]}` : null,
  firstOpenAIApply: ids[0] ? `npm run source:generate-openai -- --id ${ids[0]} --apply` : null,
  firstPrompt: candidates[0]?.commands.printPrompt ?? null,
  firstCapture: candidates[0]?.commands.captureInbox ?? 'npm run source:inbox-capture',
  firstRecoverDataUrl: candidates[0]?.commands.recoverDataUrl ?? null,
  firstRecoverBase64: candidates[0]?.commands.recoverBase64 ?? null,
  inboxCheck: sprint.commands?.inboxCheck ?? `npm run source:inbox-check -- --dir ${inboxDir} --strict --ids ${shellIds(ids)}`,
  ingestDryRun: sprint.commands?.inboxIngestDryRun ?? `npm run source:ingest-batch -- --dir ${inboxDir} --strict --ids ${shellIds(ids)} --dry-run`,
  ingestApply: sprint.commands?.inboxIngest ?? `npm run source:ingest-batch -- --dir ${inboxDir} --strict --ids ${shellIds(ids)}`,
  sourceImageCheck: 'npm run source:image-check',
  sourcePreviewCheck: 'npm run source:preview-check',
  reviewDossier: 'npm run source:review-dossier',
  goalReadiness: 'npm run content:goal-readiness',
};

const runbook = {
  schema: 'water9/source-acquisition-runbook@1',
  generatedAt: new Date().toISOString(),
  sprint: repoRelative(paths.sprint),
  inboxReview: repoRelative(paths.inboxReview),
  ids,
  inboxDir,
  openaiApiKeyAvailable: Boolean(process.env.OPENAI_API_KEY),
  captureFirstIds: candidates.filter((item) => item.captureFirst).map((item) => item.id),
  ready: candidates.filter((item) => item.inboxStatus === 'ready').length,
  missing: candidates.filter((item) => item.inboxStatus === 'missing').map((item) => item.id),
  blocked: candidates.filter((item) => item.inboxStatus === 'blocked').map((item) => item.id),
  batchCommands,
  candidates,
};

await mkdir(dirname(paths.jsonOut), { recursive: true });
await mkdir(dirname(paths.markdownOut), { recursive: true });
await mkdir(dirname(paths.htmlOut), { recursive: true });
await writeFile(paths.jsonOut, `${JSON.stringify(runbook, null, 2)}\n`);
await writeFile(paths.markdownOut, renderMarkdown(runbook));
await writeFile(paths.htmlOut, renderHtml(runbook));

console.log(JSON.stringify({
  schema: runbook.schema,
  ids,
  ready: runbook.ready,
  missing: runbook.missing.length,
  captureFirstIds: runbook.captureFirstIds,
  json: repoRelative(paths.jsonOut),
  markdown: repoRelative(paths.markdownOut),
  html: repoRelative(paths.htmlOut),
}, null, 2));

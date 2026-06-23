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

const queuePath = resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json'));
const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const rejectionPath = resolve(String(args.get('rejections') ?? 'public/review/source-candidates/rejected-attempts.json'));
const outPath = resolve(String(args.get('out') ?? 'public/review/source-candidates/source-generation-sprint.md'));
const jsonOutPath = resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-generation-sprint.json'));
const htmlOutPath = resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-generation-sprint.html'));
const inboxDir = String(args.get('source-inbox-dir') ?? 'tools/source-inbox').replace(/\/$/, '');
const limit = Math.max(1, Number(args.get('limit') ?? 5));
const offset = Math.max(0, Number(args.get('offset') ?? 0));
const explicitIds = String(args.get('ids') ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function repoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

function markdownList(items) {
  return items?.length ? items.map((item) => `- ${item}`).join('\n') : '- None.';
}

function shellIds(ids) {
  return ids.join(',');
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
    : '<ul><li>None.</li></ul>';
}

function rejectionKind(attempt) {
  if (attempt.copiedImage) return 'visual-rejection';
  if (attempt.sourceImagegenMarker || /no (new |recoverable |accessible )?(saved |source )?(image )?file|did not create an accessible source image file|no project-bound artifact|inline/i.test(String(attempt.reason ?? ''))) {
    return 'missing-artifact';
  }
  return 'unclassified';
}

function commandValues(commands) {
  return Object.values(commands ?? {}).filter((value) => typeof value === 'string' && value.trim());
}

function tableRowsFor(candidates) {
  if (candidates.length) {
    return candidates.map((card) => `<tr>
    <td>${htmlEscape(card.rank ?? '')}</td>
    <td><strong>${htmlEscape(card.species)}</strong><code>${htmlEscape(card.id)}</code></td>
    <td>${htmlEscape(card.score ?? '')}</td>
    <td>${htmlEscape(card.rejectionCount ?? 0)}</td>
    <td><code>${htmlEscape(card.inboxTarget)}</code></td>
    <td><a href="${htmlEscape(`art-contracts/${card.id}.md`)}">contract</a></td>
  </tr>`).join('\n');
  }
  return `<tr>
    <td colspan="6">No queued source candidates remain. Rebuild the queue after adding new missing source art.</td>
  </tr>`;
}

function renderHtml(sprint) {
  const commandSummary = commandBlock([
    sprint.commands.firstRecommended,
    sprint.commands.firstFallback,
    sprint.commands.firstRecoveryScout,
    sprint.commands.firstDataUrlRecovery,
    sprint.commands.firstBase64Recovery,
    sprint.commands.startFirstSession,
    '# run image generation for the first prompt',
    sprint.commands.checkFirstSession,
    sprint.commands.autoIngestFirstSession,
    '# fallback for manually saved/downloaded images:',
    sprint.commands.inboxCheck,
    sprint.commands.inboxIngestDryRun,
    sprint.commands.inboxIngest,
    sprint.commands.sourceCheck,
    sprint.commands.sourceGallery,
    sprint.commands.status,
  ]);
  const tableRows = tableRowsFor(sprint.candidates);
  const cards = sprint.candidates.map((card, index) => `<section class="card" id="${htmlEscape(card.id)}">
    <header>
      <span>${index + 1}</span>
      <div>
        <h2>${htmlEscape(card.species)}</h2>
        <code>${htmlEscape(card.id)}</code>
      </div>
    </header>
    <dl>
      <div><dt>inbox target</dt><dd><code>${htmlEscape(card.inboxTarget)}</code></dd></div>
      <div><dt>expected output</dt><dd><code>${htmlEscape(card.expectedOutput)}</code></dd></div>
      <div><dt>prompt file</dt><dd><code>${htmlEscape(card.promptFile ?? 'missing')}</code></dd></div>
      <div><dt>contract</dt><dd><a href="${htmlEscape(`art-contracts/${card.id}.md`)}">open contract</a></dd></div>
    </dl>
    <h3>Prompt</h3>
    <pre><code>${htmlEscape(card.prompt)}</code></pre>
    <h3>Required Read</h3>
    ${listHtml(card.requiredRead)}
    <h3>Source Pose Rules</h3>
    ${listHtml(card.sourcePoseRules)}
    <h3>Cohesion Lock</h3>
    ${listHtml(card.cohesionLock)}
    <h3>Quality Checks</h3>
    ${listHtml(card.qualityChecks)}
    <h3>Prompt Risks</h3>
    ${listHtml(card.promptRisks)}
    ${card.captureFirst ? `<h3>Capture First</h3><p>${htmlEscape(card.captureReason)}</p>` : ''}
    <h3>Candidate Commands</h3>
    ${commandBlock(commandValues(card.commands))}
  </section>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Generation Sprint</title>
  <style>
    :root { color-scheme: dark; --bg:#061013; --panel:#0c1b20; --line:#24424b; --text:#e2f5f6; --muted:#91aab0; --accent:#7ce5ff; --warn:#e7bd6d; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1340px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:0; font-size:18px; }
    h3 { margin:16px 0 7px; font-size:13px; color:var(--warn); text-transform:uppercase; }
    p { color:var(--muted); }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    code { color:var(--muted); }
    pre { border:1px solid var(--line); background:#050b0d; padding:10px; overflow:auto; white-space:pre-wrap; }
    table { width:100%; border-collapse:collapse; margin:18px 0 24px; border:1px solid var(--line); background:var(--panel); }
    th, td { text-align:left; border-bottom:1px solid var(--line); padding:8px 10px; vertical-align:top; }
    th { color:var(--muted); font-size:12px; text-transform:uppercase; }
    .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(380px,1fr)); gap:14px; }
    .card { border:1px solid var(--line); background:var(--panel); border-radius:6px; padding:14px; }
    .card header { display:flex; gap:10px; align-items:flex-start; }
    .card header span { flex:0 0 auto; width:28px; height:28px; display:grid; place-items:center; border:1px solid var(--line); color:var(--warn); }
    dl { display:grid; gap:7px; margin:14px 0; }
    dt { color:var(--muted); font-size:11px; text-transform:uppercase; }
    dd { margin:0; }
    ul { margin:0; padding-left:18px; color:#bdd5d9; }
  </style>
</head>
<body>
  <main>
    <h1>Source Generation Sprint</h1>
    <p>Generate this focused batch on clean <code>#ff00ff</code> magenta backgrounds, then validate the inbox before ingesting.</p>
    ${commandSummary}
    <table>
      <thead><tr><th>Rank</th><th>Candidate</th><th>Score</th><th>Rejections</th><th>Inbox Target</th><th>Contract</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <section class="cards">${cards}</section>
  </main>
</body>
</html>
`;
}

const queue = await readJson(queuePath);
if (queue.schema !== 'water9/source-generation-queue@1') {
  throw new Error(`Unexpected source-generation queue schema ${queue.schema ?? 'missing'}`);
}
const manifest = await readJson(manifestPath);
if (manifest.schema !== 'water9/source-candidates@1') {
  throw new Error(`Unexpected source candidate schema ${manifest.schema ?? 'missing'}`);
}
const rejectedAttempts = await readJson(rejectionPath).catch(() => ({ schema: 'water9/source-rejected-attempts@1', attempts: [] }));
const missingArtifactsById = new Map();
for (const attempt of Array.isArray(rejectedAttempts.attempts) ? rejectedAttempts.attempts : []) {
  if (rejectionKind(attempt) !== 'missing-artifact') continue;
  const candidateId = attempt.candidateId ?? 'unknown';
  missingArtifactsById.set(candidateId, (missingArtifactsById.get(candidateId) ?? 0) + 1);
}

const queued = Array.isArray(queue.candidates) ? queue.candidates : [];
const byId = new Map(queued.map((candidate) => [candidate.id, candidate]));
const selected = explicitIds.length
  ? explicitIds.map((id) => byId.get(id)).filter(Boolean)
  : queued.slice(offset, offset + limit);
const missingExplicitIds = explicitIds.filter((id) => !byId.has(id));
if (missingExplicitIds.length) {
  throw new Error(`Requested id(s) are not in the current source-generation queue: ${missingExplicitIds.join(', ')}`);
}

const ids = selected.map((candidate) => candidate.id);
const promptCards = [];
for (const candidate of selected) {
  const promptFromFile = candidate.promptFile ? await readFile(resolve(candidate.promptFile), 'utf8').catch(() => null) : null;
  promptCards.push({
    id: candidate.id,
    species: candidate.species,
    rank: candidate.rank,
    score: candidate.score,
    rejectionCount: candidate.rejectionCount ?? 0,
    missingArtifactAttempts: missingArtifactsById.get(candidate.id) ?? 0,
    promptFile: candidate.promptFile,
    contract: `public/review/source-candidates/art-contracts/${candidate.id}.md`,
    inboxTarget: `${inboxDir}/${candidate.id}.png`,
    expectedOutput: candidate.expectedOutput,
    depthBand: candidate.depthBand ?? null,
    gameplayVerb: candidate.gameplayVerb ?? null,
    prompt: (promptFromFile ?? candidate.prompt ?? '').trim(),
    requiredRead: candidate.requiredRead ?? [],
    sourcePoseRules: candidate.sourcePoseRules ?? [],
    cohesionLock: candidate.cohesionLock ?? [],
    qualityChecks: candidate.qualityChecks ?? [],
    promptRisks: candidate.promptRisks ?? [],
    auditGuidance: candidate.auditGuidance ?? null,
  });
}

const commands = {
  rebuildQueue: 'npm run source:generation-queue',
  firstRecommended: null,
  firstFallback: null,
  firstRecoveryScout: null,
  firstDataUrlRecovery: null,
  firstBase64Recovery: null,
  startFirstSession: ids[0] ? `npm run source:session -- --id ${ids[0]}` : null,
  checkFirstSession: ids[0] ? `npm run source:imagegen-status -- --id ${ids[0]}` : null,
  autoIngestFirstSession: ids[0] ? `npm run source:imagegen-status -- --id ${ids[0]} --ingest` : null,
  inboxCheck: ids.length ? `npm run source:inbox-check -- --dir ${inboxDir} --strict --ids ${shellIds(ids)}` : null,
  inboxIngestDryRun: ids.length ? `npm run source:ingest-batch -- --dir ${inboxDir} --strict --ids ${shellIds(ids)} --dry-run` : null,
  inboxIngest: ids.length ? `npm run source:ingest-batch -- --dir ${inboxDir} --strict --ids ${shellIds(ids)}` : null,
  sourceCheck: 'npm run source:check',
  sourceGallery: 'npm run source:gallery',
  status: 'npm run content:status -- --json',
};
function commandsForId(id, captureFirst) {
  const captureCommands = {
    captureInbox: `npm run source:inbox-capture -- --id ${id} --open`,
    recoveryScout: `npm run source:recovery-scout -- --id ${id}`,
    recoverSavedFile: `npm run source:recover-inline -- --id ${id} --image <saved-image-path> --copy --validate`,
    recoverDataUrl: `npm run source:recover-inline -- --id ${id} --data-url-stdin --copy --validate`,
    recoverBase64: `npm run source:recover-inline -- --id ${id} --stdin-base64 --stdin-filename ${id}.png --copy --validate`,
    inboxCheck: `npm run source:inbox-check -- --dir ${inboxDir} --strict --ids ${id}`,
    ingestDryRun: `npm run source:ingest-current -- --id ${id} --dry-run`,
    ingest: `npm run source:ingest-current -- --id ${id} --apply`,
  };
  const manualFallbackCommands = {
    recoverInline: `npm run source:recover-inline -- --id ${id} --copy --validate`,
  };
  const sessionCommands = {
    printPrompt: `npm run source:next-prompt -- --id ${id}`,
    startSession: `npm run source:session -- --id ${id}`,
    checkSession: `npm run source:imagegen-status -- --id ${id}`,
  };
  return captureFirst
    ? { ...captureCommands, ...sessionCommands }
    : {
        ...sessionCommands,
        autoIngestSession: `npm run source:imagegen-status -- --id ${id} --ingest`,
        ...captureCommands,
        ...manualFallbackCommands,
      };
}
const commandsById = Object.fromEntries(promptCards.map((card) => {
  const captureFirst = card.missingArtifactAttempts >= 3;
  return [card.id, commandsForId(card.id, captureFirst)];
}));
for (const card of promptCards) {
  card.captureFirst = card.missingArtifactAttempts >= 3;
  card.captureReason = card.captureFirst
    ? `Built-in image generation has ${card.missingArtifactAttempts} missing-artifact attempts for this candidate. Use the source inbox capture, explicit saved-file recovery, or stdin image-byte recovery first, then run focused inbox validation and batch ingest.`
    : null;
  card.commands = commandsById[card.id];
}
if (promptCards[0]?.captureFirst) {
  commands.firstRecommended = promptCards[0].commands.captureInbox;
  commands.firstFallback = promptCards[0].commands.recoverSavedFile;
  commands.firstRecoveryScout = promptCards[0].commands.recoveryScout;
  commands.firstDataUrlRecovery = promptCards[0].commands.recoverDataUrl;
  commands.firstBase64Recovery = promptCards[0].commands.recoverBase64;
  commands.autoIngestFirstSession = null;
}

const sprint = {
  schema: 'water9/source-generation-sprint@1',
  generatedAt: new Date().toISOString(),
  queue: repoRelative(queuePath),
  manifest: repoRelative(manifestPath),
  inboxDir,
  limit,
  offset,
  ids,
  candidates: promptCards,
  commands,
  commandsById,
};

const markdown = [
  '# Source Generation Sprint',
  '',
  `Generated: \`${sprint.generatedAt}\``,
  `Candidates: \`${ids.length}\``,
  `Inbox: \`${inboxDir}\``,
  '',
  promptCards.some((card) => card.captureFirst)
    ? 'Capture-first mode is active for candidates with repeated missing-artifact attempts. Use paste/drop/manual-save recovery before trying another generated-images auto-handoff.'
    : 'Auto-handoff is still allowed for this sprint, with source inbox capture as the fallback.',
  '',
  '## Workflow',
  '',
  ids.length
    ? '1. Generate one image per prompt below on a flat pure `#ff00ff` magenta background.'
    : '1. No queued source candidates remain. This sprint is intentionally idle until new missing source art is introduced.',
  ids.length
    ? (promptCards[0]?.captureFirst
      ? '2. The first target is capture-first: use the source inbox capture, recovery scout, or explicit saved-file/stdin recovery before ingesting.'
      : '2. For the active marked session, prefer the validated auto-ingest path when exactly one generated file appears.')
    : '2. Rebuild the queue after adding source-candidate requirements or missing source images.',
  ids.length
    ? '3. If generation only appears inline or as a manual download, save each image to its exact inbox target, for example `tools/source-inbox/gulper-eel-maw.png`.'
    : '3. Keep using `source:check`, `source:gallery`, and `content:status` to verify the completed source-candidate state.',
  ids.length ? '4. Run the focused inbox check before batch ingesting.' : '',
  ids.length ? '5. Ingest the batch only after all selected ids pass mechanical source-image validation.' : '',
  ids.length ? '6. Use the per-candidate commands below to advance each prompt independently without stale active markers.' : '',
  '',
  '```bash',
  commands.startFirstSession,
  '# run image generation for the first prompt',
  commands.checkFirstSession,
  commands.autoIngestFirstSession,
  '# fallback for manually saved/downloaded images:',
  commands.inboxCheck,
  commands.inboxIngestDryRun,
  commands.inboxIngest,
  commands.sourceCheck,
  commands.sourceGallery,
  commands.status,
  '```',
  '',
  '## Selected Candidates',
  '',
  '| Rank | Candidate | Score | Rejections | Inbox Target | Contract |',
  '| ---: | --- | ---: | ---: | --- | --- |',
  ...(promptCards.length
    ? promptCards.map((card) => `| ${card.rank ?? ''} | ${card.species} (\`${card.id}\`) | ${card.score ?? ''} | ${card.rejectionCount} | \`${card.inboxTarget}\` | [contract](${card.contract}) |`)
    : ['|  | No queued source candidates remain |  |  |  |  |']),
  '',
  ...promptCards.flatMap((card, index) => [
    `## ${index + 1}. ${card.species} (${card.id})`,
    '',
    `Rank: \`${card.rank ?? 'n/a'}\`; score: \`${card.score ?? 'n/a'}\`; previous rejections: \`${card.rejectionCount}\``,
    `Missing-artifact attempts: \`${card.missingArtifactAttempts}\`; capture first: \`${card.captureFirst ? 'yes' : 'no'}\``,
    `Inbox target: \`${card.inboxTarget}\``,
    `Expected project output: \`${card.expectedOutput}\``,
    `Prompt file: \`${card.promptFile ?? 'missing'}\``,
    `Art contract: \`${card.contract}\``,
    '',
    'Prompt:',
    '```text',
    card.prompt,
    '```',
    '',
    'Required read:',
    markdownList(card.requiredRead),
    '',
    'Source pose rules:',
    markdownList(card.sourcePoseRules),
    '',
    'Cohesion lock:',
    markdownList(card.cohesionLock),
    '',
    'Quality checks:',
    markdownList(card.qualityChecks),
    '',
    'Prompt risks:',
    markdownList(card.promptRisks),
    '',
    ...(card.captureFirst ? [
      'Capture-first warning:',
      card.captureReason,
      '',
    ] : []),
    'Candidate commands:',
    '```bash',
    ...commandValues(card.commands),
    '```',
    '',
  ]),
].join('\n');

await mkdir(dirname(jsonOutPath), { recursive: true });
await mkdir(dirname(htmlOutPath), { recursive: true });
await writeFile(jsonOutPath, `${JSON.stringify(sprint, null, 2)}\n`);
await writeFile(outPath, `${markdown}\n`);
await writeFile(htmlOutPath, renderHtml(sprint));

console.log(JSON.stringify({
  schema: sprint.schema,
  ids,
  markdown: repoRelative(outPath),
  json: repoRelative(jsonOutPath),
  html: repoRelative(htmlOutPath),
  inboxCheck: commands.inboxCheck,
  ingestDryRun: commands.inboxIngestDryRun,
}, null, 2));

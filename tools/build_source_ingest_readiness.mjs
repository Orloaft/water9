import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
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
  runbook: resolve(String(args.get('runbook') ?? 'public/review/source-candidates/source-acquisition-runbook.json')),
  sprint: resolve(String(args.get('sprint') ?? 'public/review/source-candidates/source-generation-sprint.json')),
  jsonOut: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-ingest-readiness.json')),
  markdownOut: resolve(String(args.get('out') ?? 'public/review/source-candidates/source-ingest-readiness.md')),
  htmlOut: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-ingest-readiness.html')),
};

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function fileInfo(path) {
  try {
    const info = await stat(path);
    return info.isFile() ? { path, bytes: info.size, mtime: info.mtime.toISOString() } : null;
  } catch {
    return null;
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

function validateSourceImage(id, path) {
  const result = spawnSync('python3', [
    'tools/validate_source_candidate_images.py',
    '--id',
    id,
    '--image',
    path,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  const output = result.stdout || result.stderr || '';
  let parsed = null;
  try {
    parsed = JSON.parse(output);
  } catch {
    parsed = null;
  }
  const failures = Array.isArray(parsed?.failures) ? [...parsed.failures] : [];
  if (result.status !== 0 && failures.length === 0) {
    failures.push(`${id}: source image validation failed without JSON output${output ? `: ${output.trim()}` : ''}`);
  }
  return {
    checked: true,
    metrics: parsed?.metrics?.[0] ?? null,
    failures,
  };
}

function shellIds(ids) {
  return ids.join(',');
}

function renderMarkdown(report) {
  const lines = [
    '# Water 9 Source Ingest Readiness',
    '',
    `Generated: \`${report.generatedAt}\``,
    `Batch ready: \`${report.batchReady}\``,
    `Ready: \`${report.summary.ready}\`; missing: \`${report.summary.missing}\`; blocked: \`${report.summary.blocked}\``,
    '',
    '## Batch Commands',
    '',
    '```bash',
    ...Object.values(report.batchCommands),
    '```',
    '',
    '## Targets',
    '',
    '| Rank | Candidate | Status | Present File | Validation | Next |',
    '| ---: | --- | --- | --- | --- | --- |',
  ];
  for (const item of report.candidates) {
    lines.push(`| ${item.rank} | ${item.species} (\`${item.id}\`) | \`${item.status}\` | ${item.presentFile ? `\`${item.presentFile.path}\`` : 'none'} | ${item.validationFailures.length ? item.validationFailures.join('<br>') : 'pass/none'} | \`${item.nextCommand}\` |`);
  }
  lines.push('', '## Target Commands', '');
  for (const item of report.candidates) {
    lines.push(
      `### ${item.species} (${item.id})`,
      '',
      '```bash',
      ...item.commands,
      '```',
      '',
    );
  }
  return `${lines.join('\n')}\n`;
}

function renderHtml(report) {
  const rows = report.candidates.map((item) => `<tr class="${htmlEscape(item.status)}">
    <td>${htmlEscape(item.rank)}</td>
    <td><strong>${htmlEscape(item.species)}</strong><code>${htmlEscape(item.id)}</code></td>
    <td><code>${htmlEscape(item.status)}</code></td>
    <td>${item.presentFile ? `<code>${htmlEscape(item.presentFile.path)}</code>` : 'none'}</td>
    <td>${item.validationFailures.length ? item.validationFailures.map((failure) => `<div>${htmlEscape(failure)}</div>`).join('') : 'pass/none'}</td>
    <td><code>${htmlEscape(item.nextCommand)}</code></td>
  </tr>`).join('\n');
  const cards = report.candidates.map((item) => `<section class="card ${htmlEscape(item.status)}" id="${htmlEscape(item.id)}">
    <h2>${htmlEscape(item.species)}</h2>
    <p><code>${htmlEscape(item.id)}</code> · ${htmlEscape(item.status)}</p>
    <dl>
      <div><dt>expected files</dt><dd>${item.expectedFiles.map((file) => `<code>${htmlEscape(file)}</code>`).join(' ')}</dd></div>
      <div><dt>present file</dt><dd>${item.presentFile ? `<code>${htmlEscape(item.presentFile.path)}</code>` : 'none'}</dd></div>
      <div><dt>validation</dt><dd>${item.validationFailures.length ? item.validationFailures.map((failure) => `<span>${htmlEscape(failure)}</span>`).join('') : 'pass/none'}</dd></div>
    </dl>
    <pre><code>${htmlEscape(item.commands.join('\n'))}</code></pre>
  </section>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Ingest Readiness</title>
  <style>
    :root { color-scheme: dark; --bg:#061114; --panel:#0d1e24; --line:#294751; --text:#e7f7f8; --muted:#9eb7bd; --accent:#83e8ff; --warn:#e5bb67; --good:#72d9a0; --bad:#df7b72; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1320px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:0; font-size:18px; }
    p { color:var(--muted); }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { border:1px solid var(--line); background:#050b0d; padding:10px; overflow:auto; white-space:pre-wrap; }
    table { width:100%; border-collapse:collapse; margin:18px 0 24px; border:1px solid var(--line); background:var(--panel); }
    th, td { text-align:left; border-bottom:1px solid var(--line); padding:8px 10px; vertical-align:top; }
    th { color:var(--muted); font-size:12px; text-transform:uppercase; }
    .summary { display:flex; flex-wrap:wrap; gap:10px; margin:18px 0; }
    .summary span { border:1px solid var(--line); background:var(--panel); padding:8px 10px; border-radius:6px; }
    .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(380px,1fr)); gap:14px; }
    .card { border:1px solid var(--line); background:var(--panel); border-radius:6px; padding:14px; }
    .ready { border-left:3px solid var(--good); }
    .missing { border-left:3px solid var(--warn); }
    .blocked { border-left:3px solid var(--bad); }
    dl { display:grid; gap:7px; }
    dt { color:var(--muted); font-size:11px; text-transform:uppercase; }
    dd { margin:0; display:flex; flex-wrap:wrap; gap:6px; }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Source Ingest Readiness</h1>
    <p>Non-destructive readiness check for the current source acquisition sprint.</p>
    <div class="summary">
      <span>batch ready: ${htmlEscape(report.batchReady)}</span>
      <span>ready: ${htmlEscape(report.summary.ready)}</span>
      <span>missing: ${htmlEscape(report.summary.missing)}</span>
      <span>blocked: ${htmlEscape(report.summary.blocked)}</span>
    </div>
    <h2>Batch Commands</h2>
    <pre><code>${htmlEscape(Object.values(report.batchCommands).join('\n'))}</code></pre>
    <h2>Targets</h2>
    <table>
      <thead><tr><th>Rank</th><th>Candidate</th><th>Status</th><th>Present File</th><th>Validation</th><th>Next</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <section class="cards">${cards}</section>
  </main>
</body>
</html>
`;
}

const runbook = await readJson(paths.runbook, { schema: null, ids: [], candidates: [], inboxDir: 'tools/source-inbox' });
const sprint = await readJson(paths.sprint, { schema: null, ids: [], candidates: [], commands: {}, inboxDir: runbook.inboxDir ?? 'tools/source-inbox' });
if (runbook.schema !== 'water9/source-acquisition-runbook@1') {
  throw new Error(`Unexpected source acquisition runbook schema ${runbook.schema ?? 'missing'}`);
}
if (sprint.schema !== 'water9/source-generation-sprint@1') {
  throw new Error(`Unexpected source generation sprint schema ${sprint.schema ?? 'missing'}`);
}

const inboxDir = runbook.inboxDir ?? sprint.inboxDir ?? 'tools/source-inbox';
const ids = Array.isArray(runbook.ids) && runbook.ids.length ? runbook.ids : sprint.ids;
const sprintById = new Map((sprint.candidates ?? []).map((item) => [item.id, item]));
const runbookById = new Map((runbook.candidates ?? []).map((item) => [item.id, item]));
const candidates = [];
for (const [index, id] of ids.entries()) {
  const runbookItem = runbookById.get(id) ?? {};
  const sprintItem = sprintById.get(id) ?? {};
  const expectedFiles = runbookItem.expectedInboxFiles ?? [`${inboxDir}/${id}.png`, `${inboxDir}/fauna-${id}-whole-source.png`];
  const presentFiles = [];
  for (const file of expectedFiles) {
    const info = await fileInfo(resolve(file));
    if (info) presentFiles.push({ path: repoRelative(info.path), bytes: info.bytes, mtime: info.mtime });
  }
  const validationFailures = [];
  let imageCheck = null;
  if (presentFiles.length === 1) {
    imageCheck = validateSourceImage(id, resolve(presentFiles[0].path));
    validationFailures.push(...imageCheck.failures);
  } else if (presentFiles.length > 1) {
    validationFailures.push(`${id}: multiple inbox files are present; keep one source image before ingest`);
  }
  const status = presentFiles.length === 0
    ? 'missing'
    : validationFailures.length
      ? 'blocked'
      : 'ready';
  const commands = [
    runbookItem.commands?.captureInbox ?? `npm run source:inbox-capture -- --id ${id} --open`,
    `npm run source:inbox-check -- --dir ${inboxDir} --strict --ids ${id}`,
    `npm run source:ingest-batch -- --dir ${inboxDir} --strict --ids ${id} --dry-run`,
    `npm run source:ingest-batch -- --dir ${inboxDir} --strict --ids ${id}`,
    `npm run sandbox:preview -- --id ${id} --kind source --serve --open --visual`,
  ];
  candidates.push({
    id,
    species: runbookItem.species ?? sprintItem.species ?? id,
    rank: runbookItem.rank ?? sprintItem.rank ?? index + 1,
    status,
    expectedFiles,
    presentFile: presentFiles[0] ?? null,
    presentFiles,
    imageCheck,
    validationFailures,
    commands,
    nextCommand: status === 'ready'
      ? `npm run source:ingest-batch -- --dir ${inboxDir} --strict --ids ${id} --dry-run`
      : runbookItem.commands?.captureInbox ?? `npm run source:inbox-capture -- --id ${id}`,
  });
}

const summary = {
  ready: candidates.filter((item) => item.status === 'ready').length,
  missing: candidates.filter((item) => item.status === 'missing').length,
  blocked: candidates.filter((item) => item.status === 'blocked').length,
};
const batchReady = summary.ready === candidates.length && candidates.length > 0;
const batchCommands = {
  rebuildRunbook: 'npm run source:acquisition-runbook',
  readiness: 'npm run source:ingest-readiness',
  readinessCheck: 'npm run source:ingest-readiness-check',
  inboxCheck: sprint.commands?.inboxCheck ?? `npm run source:inbox-check -- --dir ${inboxDir} --strict --ids ${shellIds(ids)}`,
  advanceDryRun: `npm run source:advance-inbox -- --ids ${shellIds(ids)}`,
  advanceApply: `npm run source:advance-inbox -- --ids ${shellIds(ids)} --apply`,
  ingestDryRun: sprint.commands?.inboxIngestDryRun ?? `npm run source:ingest-batch -- --dir ${inboxDir} --strict --ids ${shellIds(ids)} --dry-run`,
  ingestApply: sprint.commands?.inboxIngest ?? `npm run source:ingest-batch -- --dir ${inboxDir} --strict --ids ${shellIds(ids)}`,
  sourceImageCheck: 'npm run source:image-check',
  sourcePreviewCheck: 'npm run source:preview-check',
  reviewDossier: 'npm run source:review-dossier',
};
const report = {
  schema: 'water9/source-ingest-readiness@1',
  generatedAt: new Date().toISOString(),
  runbook: repoRelative(paths.runbook),
  sprint: repoRelative(paths.sprint),
  inboxDir,
  ids,
  batchReady,
  summary,
  batchCommands,
  candidates,
};

await mkdir(dirname(paths.jsonOut), { recursive: true });
await mkdir(dirname(paths.markdownOut), { recursive: true });
await mkdir(dirname(paths.htmlOut), { recursive: true });
await writeFile(paths.jsonOut, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.markdownOut, renderMarkdown(report));
await writeFile(paths.htmlOut, renderHtml(report));

console.log(JSON.stringify({
  schema: report.schema,
  batchReady,
  summary,
  json: repoRelative(paths.jsonOut),
  markdown: repoRelative(paths.markdownOut),
  html: repoRelative(paths.htmlOut),
}, null, 2));

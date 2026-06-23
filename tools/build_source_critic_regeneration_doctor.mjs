import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const paths = {
  queue: resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-critic-regeneration-queue.json')),
  inboxDir: resolve(String(args.get('dir') ?? 'tools/source-inbox')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-critic-regeneration-doctor.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/source-candidates/source-critic-regeneration-doctor.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-critic-regeneration-doctor.html')),
};

const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);

async function readJson(path, fallback) {
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

async function fileInfo(path) {
  try {
    const info = await stat(path);
    const sha256 = info.isFile()
      ? createHash('sha256').update(await readFile(path)).digest('hex')
      : null;
    return { exists: info.isFile(), size: info.size, sha256, path: repoRelative(path) };
  } catch {
    return { exists: false, size: 0, sha256: null, path: repoRelative(path) };
  }
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
    failures.push(`${id}: source image validation failed${output ? `: ${output.trim()}` : ''}`);
  }
  return {
    checked: true,
    passed: failures.length === 0,
    metric: parsed?.metrics?.[0] ?? null,
    failures,
  };
}

function candidateIdsForFile(file) {
  const extension = extname(file).toLowerCase();
  if (!allowedExtensions.has(extension)) return [];
  const stem = file.slice(0, -extension.length);
  const ids = [stem];
  const wholeSource = stem.match(/^fauna-(.+)-whole-source$/);
  if (wholeSource) ids.push(wholeSource[1]);
  return [...new Set(ids)];
}

async function inboxFilesFor(id) {
  let entries = [];
  try {
    entries = await readdir(paths.inboxDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!candidateIdsForFile(entry.name).includes(id)) continue;
    const path = resolve(paths.inboxDir, entry.name);
    const info = await fileInfo(path);
    const imageCheck = info.exists && info.size >= 512
      ? validateSourceImage(id, path)
      : { checked: false, passed: false, failures: ['missing or too small'] };
    files.push({ file: entry.name, ...info, imageCheck });
  }
  return files.sort((left, right) => left.file.localeCompare(right.file));
}

function commandsForTarget(item, status) {
  const commands = item.commands ?? {};
  if (status === 'replacement-ready-to-ingest') {
    return [
      commands.validateInbox,
      commands.dryRunReplace,
      commands.applyReplace,
      commands.imageCheck,
      commands.sourcePreview,
      commands.rebuildEvidence,
    ].filter(Boolean);
  }
  if (status === 'replacement-inbox-blocked') {
    return [
      commands.validateInbox,
      commands.captureManual,
      commands.recoverSavedImage,
      commands.markImagegen,
      commands.checkImagegen,
      commands.generateOpenAiDryRun,
    ].filter(Boolean);
  }
  return [
    commands.openPrompt,
    commands.markImagegen,
    commands.checkImagegen,
    commands.ingestImagegen,
    commands.captureManual,
    commands.recoverSavedImage,
    commands.generateOpenAiDryRun,
    commands.generateOpenAiApply,
  ].filter(Boolean);
}

async function targetFor(item, inboxFiles) {
  if (!item) {
    return {
      id: null,
      species: null,
      status: 'no-regeneration-needed',
      readyForReplacementIngest: false,
      inboxFiles: [],
      commands: [],
      failures: [],
    };
  }
  const currentSource = item.source ? await fileInfo(resolve(item.source)) : null;
  const validInboxFiles = inboxFiles.filter((file) => file.imageCheck?.passed);
  const distinctValidInboxFiles = validInboxFiles.filter((file) => !currentSource?.sha256 || file.sha256 !== currentSource.sha256);
  const replacementMatchesCurrentSource = validInboxFiles.length > 0 && distinctValidInboxFiles.length === 0 && Boolean(currentSource?.sha256);
  const status = distinctValidInboxFiles.length
    ? 'replacement-ready-to-ingest'
    : replacementMatchesCurrentSource
      ? 'replacement-matches-current-source'
    : inboxFiles.length
      ? 'replacement-inbox-blocked'
      : 'replacement-needed';
  return {
    id: item.id,
    species: item.species,
    lane: item.lane,
    status,
    readyForReplacementIngest: distinctValidInboxFiles.length > 0,
    replacementMatchesCurrentSource,
    currentSource,
    promptFile: item.promptFile,
    expectedInboxFiles: [
      item.expectedInboxImage ?? `tools/source-inbox/${item.id}.png`,
      `tools/source-inbox/fauna-${item.id}-whole-source.png`,
    ],
    inboxFiles,
    links: item.links ?? {},
    critic: item.critic ?? {},
    commands: commandsForTarget(item, status),
    allCommands: item.commands ?? {},
    failures: [
      ...inboxFiles.flatMap((file) => (file.imageCheck?.failures ?? []).map((failure) => `${file.file}: ${failure}`)),
      ...(replacementMatchesCurrentSource ? ['replacement inbox image is byte-identical to the current source; generate or capture a distinct replacement before overwrite'] : []),
    ],
  };
}

function commandBlock(commands) {
  return `<pre><code>${htmlEscape((commands ?? []).filter(Boolean).join('\n') || '# no commands')}</code></pre>`;
}

function markdown(report) {
  const target = report.target;
  return `${[
    '# Water 9 Critic Regeneration Doctor',
    '',
    `Generated: \`${report.generatedAt}\``,
    '',
    'This doctor focuses on the next critic-blocked source replacement. It does not approve source art or accept threats.',
    '',
    '## Target',
    '',
    `- Candidate: \`${target.id ?? 'none'}\` ${target.species ?? ''}`.trim(),
    `- Status: \`${target.status}\``,
    `- Ready for replacement ingest: \`${target.readyForReplacementIngest}\``,
    `- Replacement matches current source: \`${target.replacementMatchesCurrentSource ?? false}\``,
    `- Prompt file: \`${target.promptFile ?? 'none'}\``,
    '',
    '## Expected Replacement Files',
    '',
    ...(target.expectedInboxFiles ?? []).map((file) => `- \`${file}\``),
    '',
    '## Inbox Files',
    '',
    ...(target.inboxFiles ?? []).length
      ? target.inboxFiles.map((file) => `- \`${file.path}\` ${file.imageCheck?.passed ? 'pass' : 'blocked'}${file.sha256 && target.currentSource?.sha256 === file.sha256 ? ' (matches current source)' : ''}${(file.imageCheck?.failures ?? []).length ? `: ${file.imageCheck.failures.join('; ')}` : ''}`)
      : ['- No replacement inbox files found.'],
    '',
    '## Next Commands',
    '',
    '```bash',
    ...(target.commands ?? []),
    '```',
    '',
    '## Evidence Links',
    '',
    `- Queue: \`/review/source-candidates/source-critic-regeneration-queue.html#next-regeneration-target\``,
    `- Critic board: \`${target.links?.sourceCriticBoard ?? 'missing'}\``,
    `- Replace runway: \`${target.links?.sourceReplaceRunway ?? 'missing'}\``,
    `- Quick review: \`${target.links?.quickReview ?? 'missing'}\``,
    `- Live source sandbox: \`${target.links?.liveSourceSandbox ?? 'missing'}\``,
    '',
  ].join('\n')}\n`;
}

function html(report) {
  const target = report.target;
  const inboxRows = (target.inboxFiles ?? []).map((file) => `<tr>
    <td><code>${htmlEscape(file.path)}</code></td>
    <td>${htmlEscape(file.size)}</td>
    <td>${file.imageCheck?.passed ? 'pass' : 'blocked'}${file.sha256 && target.currentSource?.sha256 === file.sha256 ? ' / matches current source' : ''}</td>
    <td>${htmlEscape((file.imageCheck?.failures ?? []).join('; ') || 'none')}</td>
  </tr>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Critic Regeneration Doctor</title>
  <style>
    :root { color-scheme: dark; --bg:#050b0d; --panel:#0c171b; --line:#28464f; --text:#e8f6f5; --muted:#93aaad; --accent:#7bdff2; --warn:#f0bd68; --good:#79d9a2; --bad:#e07c72; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1180px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:18px 0 8px; font-size:16px; color:var(--muted); text-transform:uppercase; }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { border:1px solid var(--line); background:#030708; padding:10px; overflow:auto; white-space:pre-wrap; }
    .panel { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:14px; margin:14px 0; }
    .status { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }
    .status span { border:1px solid var(--line); background:#071216; padding:7px 9px; border-radius:5px; color:var(--muted); }
    .ready { color:var(--good); }
    .blocked { color:var(--bad); }
    table { width:100%; border-collapse:collapse; border:1px solid var(--line); background:#071216; }
    th, td { padding:8px 10px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
    th { color:var(--muted); font-size:12px; text-transform:uppercase; }
    .links { display:flex; flex-wrap:wrap; gap:8px; }
    .links a { border:1px solid var(--line); border-radius:5px; padding:7px 9px; }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Critic Regeneration Doctor</h1>
    <p>This doctor focuses on the next critic-blocked source replacement. It does not approve source art or accept threats.</p>
    <section class="panel" data-critic-regeneration-doctor="${htmlEscape(target.id ?? 'none')}">
      <h2>Target</h2>
      <div class="status">
        <span>candidate <strong>${htmlEscape(target.id ?? 'none')}</strong></span>
        <span>species <strong>${htmlEscape(target.species ?? 'none')}</strong></span>
        <span>status <strong class="${target.readyForReplacementIngest ? 'ready' : 'blocked'}">${htmlEscape(target.status)}</strong></span>
        <span>ready for replacement ingest <strong>${htmlEscape(target.readyForReplacementIngest)}</strong></span>
        <span>matches current source <strong>${htmlEscape(target.replacementMatchesCurrentSource ?? false)}</strong></span>
      </div>
      <p>Prompt: <code>${htmlEscape(target.promptFile ?? 'none')}</code></p>
    </section>
    <section class="panel">
      <h2>Expected Replacement Files</h2>
      <ul>${(target.expectedInboxFiles ?? []).map((file) => `<li><code>${htmlEscape(file)}</code></li>`).join('')}</ul>
    </section>
    <section class="panel">
      <h2>Inbox Files</h2>
      <table>
        <thead><tr><th>File</th><th>Bytes</th><th>Validation</th><th>Failures</th></tr></thead>
        <tbody>${inboxRows || '<tr><td colspan="4">No replacement inbox files found.</td></tr>'}</tbody>
      </table>
    </section>
    <section class="panel">
      <h2>Next Commands</h2>
      ${commandBlock(target.commands)}
    </section>
    <section class="panel">
      <h2>Evidence Links</h2>
      <div class="links">
        <a href="/review/source-candidates/source-critic-regeneration-queue.html#next-regeneration-target">queue</a>
        <a href="${htmlEscape(target.links?.sourceCriticBoard ?? '#')}">critic board</a>
        <a href="${htmlEscape(target.links?.sourceReplaceRunway ?? '#')}">replace runway</a>
        <a href="${htmlEscape(target.links?.quickReview ?? '#')}">quick review</a>
        <a href="${htmlEscape(target.links?.liveSourceSandbox ?? '#')}">source + diver</a>
      </div>
    </section>
  </main>
</body>
</html>
`;
}

const queue = await readJson(paths.queue, { schema: null, summary: {}, candidates: [] });
if (queue.schema !== 'water9/source-critic-regeneration-queue@1') {
  throw new Error(`Unexpected critic regeneration queue schema ${queue.schema ?? 'missing'}`);
}
const next = queue.nextCandidate ?? (queue.candidates ?? [])[0] ?? null;
const inboxFiles = next?.id ? await inboxFilesFor(next.id) : [];
const target = await targetFor(next, inboxFiles);
const report = {
  schema: 'water9/source-critic-regeneration-doctor@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    queue: paths.queue,
    inboxDir: repoRelative(paths.inboxDir),
  },
  policy: {
    advisoryOnly: true,
    doesNotApproveSources: true,
    doesNotAcceptThreats: true,
    replacementMustReturnToSourceReview: true,
  },
  summary: {
    regenerateCandidates: queue.summary?.regenerateCandidates ?? (queue.candidates ?? []).length,
    nextCandidateId: target.id,
    nextCandidateSpecies: target.species,
    status: target.status,
    readyForReplacementIngest: target.readyForReplacementIngest,
    inboxFiles: target.inboxFiles.length,
    validInboxFiles: target.inboxFiles.filter((file) => file.imageCheck?.passed).length,
    replacementMatchesCurrentSource: Boolean(target.replacementMatchesCurrentSource),
  },
  target,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdown(report));
await writeFile(paths.outHtml, html(report));

console.log(JSON.stringify({
  schema: report.schema,
  target: report.summary.nextCandidateId,
  status: report.summary.status,
  readyForReplacementIngest: report.summary.readyForReplacementIngest,
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
}, null, 2));

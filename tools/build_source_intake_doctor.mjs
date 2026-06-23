import { spawnSync } from 'node:child_process';
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
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-intake-doctor.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/source-candidates/source-intake-doctor.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-intake-doctor.html')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  sourceQueue: resolve(String(args.get('source-queue') ?? 'public/review/source-candidates/source-generation-queue.json')),
  nextAction: resolve(String(args.get('next-action') ?? 'public/review/content-next-action.json')),
  inboxDir: resolve(String(args.get('dir') ?? 'tools/source-inbox')),
  generatedDir: resolve(String(args.get('generated-dir') ?? 'public/assets/generated')),
};

const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function asRepoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function fileInfo(path) {
  try {
    const info = await stat(path);
    return { exists: info.isFile(), size: info.size, path: asRepoRelative(path) };
  } catch {
    return { exists: false, size: 0, path: asRepoRelative(path) };
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
  const failures = Array.isArray(parsed?.failures) ? parsed.failures : [];
  if (result.status !== 0 && !failures.length) failures.push(`${id}: source image validation failed${output ? `: ${output.trim()}` : ''}`);
  return {
    checked: true,
    passed: failures.length === 0,
    metric: parsed?.metrics?.[0] ?? null,
    failures,
  };
}

function expectedInboxFiles(id) {
  return [`${id}.png`, `fauna-${id}-whole-source.png`];
}

function candidateIdsForFile(file) {
  const extension = extname(file).toLowerCase();
  if (!allowedExtensions.has(extension)) return [];
  const stem = file.slice(0, -extension.length);
  const ids = [stem];
  const match = stem.match(/^fauna-(.+)-whole-source$/);
  if (match) ids.push(match[1]);
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
    files.push({ file: entry.name, ...info });
  }
  return files.sort((left, right) => left.file.localeCompare(right.file));
}

async function buildCandidateDoctor(candidate, queueItem, rank) {
  const id = candidate.id;
  const inboxFiles = await inboxFilesFor(id);
  const validatedInboxFiles = inboxFiles.map((file) => ({
    ...file,
    imageCheck: file.exists && file.size >= 512 ? validateSourceImage(id, resolve(file.path)) : { checked: false, passed: false, failures: ['missing or too small'] },
  }));
  const readyInboxFiles = validatedInboxFiles.filter((file) => file.imageCheck?.passed);
  const outputCandidates = ['.png', '.jpg', '.jpeg', '.webp'].map((extension) => resolve(paths.generatedDir, `fauna-${id}-whole-source${extension}`));
  const generatedSources = [];
  for (const path of outputCandidates) {
    const info = await fileInfo(path);
    if (info.exists) generatedSources.push(info);
  }
  const status = candidate.source
    ? 'source-present'
    : readyInboxFiles.length
      ? 'ready-to-ingest'
      : inboxFiles.length
        ? 'inbox-blocked'
        : 'missing-inbox-image';
  const commands = readyInboxFiles.length
    ? [
      `npm run source:ingest-batch -- --dir ${asRepoRelative(paths.inboxDir)} --strict --ids ${id} --dry-run`,
      `npm run source:ingest-batch -- --dir ${asRepoRelative(paths.inboxDir)} --strict --ids ${id}`,
      'npm run source:check',
      'npm run source:gallery',
    ]
    : candidate.source
      ? [
        `npm run sandbox:preview -- --id source-${id} --with diver --serve --open --visual`,
        'npm run source:review-dossier',
        'npm run source:review-dossier-check',
      ]
      : [
        'npm run source:sprint:preview',
        `npm run source:next-prompt -- --id ${id}`,
        `npm run source:inbox-capture -- --id ${id} --open`,
        `npm run source:recover-inline -- --id ${id} --image <saved-image-path> --copy --validate`,
        `npm run source:recover-inline -- --id ${id} --copy --validate`,
        `npm run source:inbox-check -- --dir ${asRepoRelative(paths.inboxDir)} --strict --ids ${id}`,
        `npm run source:ingest-current -- --id ${id} --dry-run`,
        `npm run source:ingest-current -- --id ${id} --apply`,
      ];
  return {
    id,
    rank,
    species: candidate.species,
    status,
    queueRank: queueItem?.rank ?? null,
    source: candidate.source ?? null,
    expectedInboxFiles: expectedInboxFiles(id).map((file) => `${asRepoRelative(paths.inboxDir)}/${file}`),
    inboxFiles: validatedInboxFiles,
    generatedSources,
    promptFile: queueItem?.promptFile ?? null,
    contractFile: `public/review/source-candidates/art-contracts/${id}.md`,
    commands,
    readyForIngest: readyInboxFiles.length > 0,
    failures: validatedInboxFiles.flatMap((file) => (file.imageCheck?.failures ?? []).map((failure) => `${file.file}: ${failure}`)),
  };
}

function markdown(report) {
  const target = report.target;
  const utilityCommands = [
    `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${target.id}`,
    `npm run source:inbox-capture -- --id ${target.id} --open`,
    `npm run source:ingest-current -- --id ${target.id} --dry-run`,
    `npm run source:ingest-current -- --id ${target.id} --apply`,
  ];
  const lines = [
    '# Water 9 Source Intake Doctor',
    '',
    `Generated: \`${report.generatedAt}\``,
    '',
    '## Current Target',
    '',
    `- Candidate: \`${target.id}\` ${target.species}`,
    `- Status: \`${target.status}\``,
    `- Source: \`${target.source ?? 'none'}\``,
    `- Ready for ingest: \`${target.readyForIngest}\``,
    '',
    '### Expected Inbox Files',
    '',
    ...target.expectedInboxFiles.map((file) => `- \`${file}\``),
    '',
    '### Commands',
    '',
    '```bash',
    ...target.commands,
    '```',
    '',
    '### Intake Utilities',
    '',
    '```bash',
    ...utilityCommands,
    '```',
    '',
    '## Queue Snapshot',
    '',
    '| Rank | Candidate | Status | Source | Inbox |',
    '| ---: | --- | --- | --- | --- |',
    ...report.queue.map((item) => `| ${item.rank} | \`${item.id}\` ${item.species} | \`${item.status}\` | ${item.source ? 'yes' : 'no'} | ${item.inboxFiles.length} |`),
  ];
  return `${lines.join('\n')}\n`;
}

function html(report) {
  const target = report.target;
  const utilityCommands = [
    `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${target.id}`,
    `npm run source:inbox-capture -- --id ${target.id} --open`,
    `npm run source:ingest-current -- --id ${target.id} --dry-run`,
    `npm run source:ingest-current -- --id ${target.id} --apply`,
  ];
  const rows = report.queue.map((item) => `<tr>
    <td>${item.rank}</td>
    <td><code>${htmlEscape(item.id)}</code><br>${htmlEscape(item.species)}</td>
    <td>${htmlEscape(item.status)}</td>
    <td>${item.source ? htmlEscape(item.source) : 'none'}</td>
    <td>${item.inboxFiles.length}</td>
  </tr>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Intake Doctor</title>
  <style>
    :root { color-scheme: dark; font-family: system-ui, sans-serif; background:#071316; color:#e4f4f6; }
    body { margin:0; }
    main { max-width:1180px; margin:0 auto; padding:26px 16px 48px; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4rem); }
    p, li { color:#aac0c7; }
    code, pre { background:#061014; color:#dffbff; border-radius:5px; }
    code { padding:1px 4px; }
    pre { padding:12px; border:1px solid #24414a; overflow:auto; }
    .panel { border:1px solid #294955; border-radius:8px; background:#0c2026; padding:16px; margin:16px 0; }
    .status { display:flex; flex-wrap:wrap; gap:10px; }
    .status span { border:1px solid #315766; border-radius:6px; padding:8px 10px; }
    table { width:100%; border-collapse:collapse; margin-top:16px; }
    th, td { text-align:left; padding:8px; border-bottom:1px solid #203b45; vertical-align:top; }
    th { color:#dffbff; }
  </style>
</head>
<body>
  <main>
    <h1>Source Intake Doctor</h1>
    <p>Focused status for the next source-image bottleneck. Use this before ingesting generated magenta source art.</p>
    <section class="panel">
      <h2>${htmlEscape(target.species)} <code>${htmlEscape(target.id)}</code></h2>
      <div class="status">
        <span>status <strong>${htmlEscape(target.status)}</strong></span>
        <span>ready for ingest <strong>${target.readyForIngest}</strong></span>
        <span>inbox files <strong>${target.inboxFiles.length}</strong></span>
      </div>
      <h3>Expected Inbox Files</h3>
      <ul>${target.expectedInboxFiles.map((file) => `<li><code>${htmlEscape(file)}</code></li>`).join('')}</ul>
      <h3>Commands</h3>
      <pre><code>${htmlEscape(target.commands.join('\n'))}</code></pre>
      <h3>Intake Utilities</h3>
      <pre><code>${htmlEscape(utilityCommands.join('\n'))}</code></pre>
    </section>
    <section class="panel">
      <h2>Queue Snapshot</h2>
      <table><thead><tr><th>Rank</th><th>Candidate</th><th>Status</th><th>Source</th><th>Inbox</th></tr></thead><tbody>${rows}</tbody></table>
    </section>
  </main>
</body>
</html>
`;
}

const sourceCandidates = await readJson(paths.sourceCandidates, { candidates: [] });
const sourceQueue = await readJson(paths.sourceQueue, { candidates: [] });
const nextAction = await readJson(paths.nextAction, { nextAction: {} });
const candidatesById = new Map((sourceCandidates.candidates ?? []).map((candidate) => [candidate.id, candidate]));
const queueItems = Array.isArray(sourceQueue.candidates) ? sourceQueue.candidates : [];
const queueById = new Map(queueItems.map((item) => [item.id, item]));
const requestedTargetId = String(args.get('id') ?? '').trim();
const nextTargetId = String(nextAction.nextAction?.targetId ?? '').trim();
const nextTargetIsQueued = nextTargetId && queueById.has(nextTargetId);
const targetId = requestedTargetId || (nextTargetIsQueued ? nextTargetId : queueItems[0]?.id ?? nextTargetId);
const targetCandidate = candidatesById.get(targetId);
if (!targetCandidate) throw new Error(`No source candidate found for target ${targetId || '(missing)'}`);

const queue = [];
for (const [index, item] of queueItems.entries()) {
  const candidate = candidatesById.get(item.id);
  if (!candidate) continue;
  queue.push(await buildCandidateDoctor(candidate, item, index + 1));
}
const target = queue.find((item) => item.id === targetId) ?? await buildCandidateDoctor(targetCandidate, queueById.get(targetId), 1);
const report = {
  schema: 'water9/source-intake-doctor@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    sourceCandidates: paths.sourceCandidates,
    sourceQueue: paths.sourceQueue,
    nextAction: paths.nextAction,
    inboxDir: paths.inboxDir,
  },
  target,
  queue,
  failures: [],
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdown(report));
await writeFile(paths.outHtml, html(report));

console.log(JSON.stringify({
  schema: report.schema,
  target: {
    id: target.id,
    status: target.status,
    readyForIngest: target.readyForIngest,
  },
  jsonOut: asRepoRelative(paths.outJson),
  markdownOut: asRepoRelative(paths.outMarkdown),
  htmlOut: asRepoRelative(paths.outHtml),
}, null, 2));

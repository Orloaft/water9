import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
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
  inbox: resolve(String(args.get('inbox') ?? 'public/review/source-inbox/manifest.json')),
  trace: resolve(String(args.get('trace') ?? 'public/review/source-candidates/research-source-trace.json')),
  rejections: resolve(String(args.get('rejections') ?? 'public/review/source-candidates/rejected-attempts.json')),
  imagegenMarker: resolve(String(args.get('imagegen-marker') ?? 'tools/scratch/source-imagegen-handoff-marker.json')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-intake-runway.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/source-candidates/source-intake-runway.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-intake-runway.html')),
};

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function fileInfo(path) {
  try {
    const info = await stat(path);
    return info.isFile() ? { exists: true, bytes: info.size, mtime: info.mtime.toISOString() } : { exists: false };
  } catch {
    return { exists: false };
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

function rejectionKind(attempt) {
  if (attempt.copiedImage) return 'visual-rejection';
  if (attempt.sourceImagegenMarker || /no (new |recoverable |accessible )?(saved |source )?(image )?file|did not create an accessible source image file|no project-bound artifact|inline/i.test(String(attempt.reason ?? ''))) {
    return 'missing-artifact';
  }
  return 'unclassified';
}

function commandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function markdownList(items) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- None.';
}

const REQUIRED_SOURCE_VISUAL_CHECKS = [
  'whole-creature-cohesion',
  'part-continuity-cohesion',
  'readable-silhouette',
  'no-collage-artifacts',
  'non-placeholder-art-direction',
  'crop-safe-anatomy',
  'clean-magenta-key',
  'gameplay-read',
  'neutral-riggable-pose',
  'visible-attack-lane',
];

function sourceAcceptanceDryRunCommand(id) {
  return [
    `npm run source:accept -- --id ${id} --status approved --reviewed-by <human-reviewer>`,
    "  --note '<specific source approval note>'",
    `  ${REQUIRED_SOURCE_VISUAL_CHECKS.map((check) => `--visual-check ${check}`).join(' ')}`,
    `  ${REQUIRED_SOURCE_VISUAL_CHECKS.map((check) => `--score ${check}=<4-5>`).join(' ')}`,
    `  ${REQUIRED_SOURCE_VISUAL_CHECKS.map((check) => `--visual-note ${check}='<specific rationale>'`).join(' ')}`,
    '  --source-reviewed --dry-run',
  ].join(' \\\n');
}

const sprint = await readJson(paths.sprint, { schema: null, ids: [], candidates: [], commands: {}, inboxDir: 'tools/source-inbox' });
const inbox = await readJson(paths.inbox, { schema: null, candidates: [] });
const trace = await readJson(paths.trace, { schema: null, records: [] });
const rejections = await readJson(paths.rejections, { schema: null, attempts: [] });
const marker = await readJson(paths.imagegenMarker, { schema: null });
const sourceCandidates = await readJson(paths.sourceCandidates, { schema: null, candidates: [] });

const sourceById = new Map((sourceCandidates.candidates ?? []).map((candidate) => [candidate.id, candidate]));
const inboxById = new Map((inbox.candidates ?? []).map((candidate) => [candidate.id, candidate]));
const traceById = new Map((trace.records ?? []).map((record) => [record.id, record]));
const attemptsById = new Map();
for (const attempt of rejections.attempts ?? []) {
  const list = attemptsById.get(attempt.candidateId) ?? [];
  list.push(attempt);
  attemptsById.set(attempt.candidateId, list);
}

const candidates = [];
for (const sprintCandidate of sprint.candidates ?? []) {
  const id = sprintCandidate.id;
  const inboxItem = inboxById.get(id) ?? null;
  const traceItem = traceById.get(id) ?? null;
  const sourceCandidate = sourceById.get(id) ?? null;
  const attempts = attemptsById.get(id) ?? [];
  const missingArtifactAttempts = attempts.filter((attempt) => rejectionKind(attempt) === 'missing-artifact');
  const visualRejections = attempts.filter((attempt) => rejectionKind(attempt) === 'visual-rejection');
  const inboxTarget = sprintCandidate.inboxTarget ?? `${sprint.inboxDir ?? 'tools/source-inbox'}/${id}.png`;
  const inboxFile = inboxItem?.inboxImage?.path ?? inboxTarget;
  candidates.push({
    id,
    species: sprintCandidate.species,
    rank: sprintCandidate.rank,
    score: sprintCandidate.score,
    status: sourceCandidate?.status ?? sprintCandidate.status ?? null,
    hasSource: Boolean(sourceCandidate?.source),
    source: sourceCandidate?.source ?? null,
    inboxTarget,
    inboxFile,
    inboxReady: inboxItem?.ready === true,
    inboxHasImage: Boolean(inboxItem?.inboxImage),
    inboxValidationFailures: inboxItem?.validationFailures ?? [],
    promptFile: sprintCandidate.promptFile,
    contract: sprintCandidate.contract ?? `public/review/source-candidates/art-contracts/${id}.md`,
    expectedOutput: sprintCandidate.expectedOutput,
    promptHasAuditHardening: traceItem?.promptHasAuditHardening === true,
    queueHasAuditGuidance: traceItem?.queueHasAuditGuidance === true,
    lane: traceItem?.lane ?? null,
    audited: traceItem?.audited === true,
    missingArtifactAttempts: missingArtifactAttempts.length,
    visualRejections: visualRejections.length,
    activeMarker: marker?.schema === 'water9/source-imagegen-handoff-marker@1' && marker.candidateId === id,
    captureFirst: sprintCandidate.captureFirst === true || missingArtifactAttempts.length >= 3,
    commands: {
      mark: `npm run source:imagegen-mark -- --id ${id}`,
      status: `npm run source:imagegen-status -- --id ${id}`,
      ...(sprintCandidate.captureFirst === true || missingArtifactAttempts.length >= 3 ? {} : {
        autoIngest: `npm run source:imagegen-status -- --id ${id} --ingest`,
        recoverInline: `npm run source:recover-inline -- --id ${id} --copy --validate`,
      }),
      capture: `npm run source:inbox-capture -- --id ${id} --open`,
      recoveryScout: `npm run source:recovery-scout -- --id ${id}`,
      recoverFile: `npm run source:recover-inline -- --id ${id} --image <saved-image-path> --copy --validate`,
      recoverDataUrl: `npm run source:recover-inline -- --id ${id} --data-url-stdin --copy --validate`,
      recoverBase64: `npm run source:recover-inline -- --id ${id} --stdin-base64 --stdin-filename ${id}.png --copy --validate`,
      checkOne: `npm run source:inbox-check -- --dir ${sprint.inboxDir ?? 'tools/source-inbox'} --strict --ids ${id}`,
      ingestOneDryRun: `npm run source:ingest-current -- --id ${id} --dry-run`,
      ingestOne: `npm run source:ingest-current -- --id ${id} --apply`,
      previewCheck: 'npm run source:preview-check',
      sourceGallery: 'npm run source:gallery',
      sourceCheck: 'npm run source:check',
      acceptanceDryRun: sourceAcceptanceDryRunCommand(id),
    },
  });
}

const inboxDir = sprint.inboxDir ?? 'tools/source-inbox';
const sprintIds = candidates.map((candidate) => candidate.id);
const activeMarkerCandidateId = marker?.schema === 'water9/source-imagegen-handoff-marker@1'
  ? marker.candidateId ?? null
  : null;
const activeMarkerCandidate = activeMarkerCandidateId
  ? sourceById.get(activeMarkerCandidateId) ?? null
  : null;
const activeMarkerInSprint = activeMarkerCandidateId
  ? sprintIds.includes(activeMarkerCandidateId)
  : false;
const activeMarkerHasSource = Boolean(activeMarkerCandidate?.source);
const report = {
  schema: 'water9/source-intake-runway@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    sprint: repoRelative(paths.sprint),
    inbox: repoRelative(paths.inbox),
    trace: repoRelative(paths.trace),
    rejections: repoRelative(paths.rejections),
    imagegenMarker: repoRelative(paths.imagegenMarker),
    sourceCandidates: repoRelative(paths.sourceCandidates),
  },
  summary: {
    sprint: candidates.length,
    inboxReady: candidates.filter((candidate) => candidate.inboxReady).length,
    inboxMissing: candidates.filter((candidate) => !candidate.inboxHasImage).length,
    inboxBlocked: candidates.filter((candidate) => candidate.inboxHasImage && !candidate.inboxReady).length,
    promptsWithAuditHardening: candidates.filter((candidate) => candidate.promptHasAuditHardening).length,
    activeMarker: activeMarkerCandidateId,
    activeMarkerInSprint,
    activeMarkerHasSource,
    activeMarkerIsHistorical: Boolean(activeMarkerCandidateId && (!activeMarkerInSprint || activeMarkerHasSource)),
    currentTarget: sprintIds[0] ?? null,
    missingArtifactAttempts: candidates.reduce((total, candidate) => total + candidate.missingArtifactAttempts, 0),
    visualRejections: candidates.reduce((total, candidate) => total + candidate.visualRejections, 0),
    openaiApiKeyAvailable: Boolean(process.env.OPENAI_API_KEY),
  },
  commands: {
    openSprint: 'npm run source:sprint:preview',
    capture: 'npm run source:inbox-capture',
    imagegenHealth: 'npm run source:imagegen-health',
    inboxCheck: sprint.commands?.inboxCheck ?? `npm run source:inbox-check -- --dir ${inboxDir} --strict --ids ${sprintIds.join(',')}`,
    inboxIngestDryRun: sprint.commands?.inboxIngestDryRun ?? `npm run source:ingest-batch -- --dir ${inboxDir} --strict --ids ${sprintIds.join(',')} --dry-run`,
    inboxIngest: sprint.commands?.inboxIngest ?? `npm run source:ingest-batch -- --dir ${inboxDir} --strict --ids ${sprintIds.join(',')}`,
    previewCheck: 'npm run source:preview-check',
    sourceCheck: 'npm run source:check',
    sourceGallery: 'npm run source:gallery',
    status: 'npm run content:status -- --json',
  },
  candidates,
};

function markdown(report) {
  const lines = [
    '# Source Intake Runway',
    '',
    `Generated: \`${report.generatedAt}\``,
    '',
    '## Summary',
    '',
    `- Sprint candidates: \`${report.summary.sprint}\``,
    `- Inbox ready: \`${report.summary.inboxReady}\``,
    `- Inbox missing: \`${report.summary.inboxMissing}\``,
    `- Inbox blocked: \`${report.summary.inboxBlocked}\``,
    `- Prompts with audit hardening: \`${report.summary.promptsWithAuditHardening}/${report.summary.sprint}\``,
    `- Active imagegen marker: \`${report.summary.activeMarker ?? 'none'}\``,
    `- Active marker in current sprint: \`${report.summary.activeMarkerInSprint}\``,
    `- Active marker has source: \`${report.summary.activeMarkerHasSource}\``,
    `- Active marker is historical: \`${report.summary.activeMarkerIsHistorical}\``,
    `- Current target: \`${report.summary.currentTarget ?? 'none'}\``,
    `- OpenAI API key available: \`${report.summary.openaiApiKeyAvailable}\``,
    '',
    '## Batch Commands',
    '',
    '```bash',
    report.commands.openSprint,
    report.commands.capture,
    report.commands.imagegenHealth,
    report.commands.inboxCheck,
    report.commands.inboxIngestDryRun,
    report.commands.inboxIngest,
    report.commands.previewCheck,
    report.commands.sourceCheck,
    report.commands.sourceGallery,
    report.commands.status,
    '```',
    '',
    '## Candidates',
    '',
  ];
  for (const candidate of report.candidates) {
    lines.push(`### ${candidate.rank}. ${candidate.species} (${candidate.id})`);
    lines.push('');
    lines.push(`- Inbox target: \`${candidate.inboxTarget}\``);
    lines.push(`- Prompt file: \`${candidate.promptFile}\``);
    lines.push(`- Contract: \`${candidate.contract}\``);
    lines.push(`- Audit hardening: \`${candidate.promptHasAuditHardening}\``);
    lines.push(`- Missing-artifact attempts: \`${candidate.missingArtifactAttempts}\``);
    lines.push(`- Visual rejections: \`${candidate.visualRejections}\``);
    lines.push(`- Capture first: \`${candidate.captureFirst}\``);
    lines.push('');
    lines.push('Commands:');
    lines.push('```bash');
    lines.push(...Object.values(candidate.commands).filter(Boolean));
    lines.push('```');
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function html(report) {
  const cards = report.candidates.map((candidate) => `<article class="card ${candidate.inboxReady ? 'ready' : candidate.inboxHasImage ? 'blocked' : 'missing'}" id="${htmlEscape(candidate.id)}">
    <header>
      <div><h2>${htmlEscape(candidate.species)}</h2><code>${htmlEscape(candidate.id)}</code></div>
      <strong>${candidate.inboxReady ? 'ready' : candidate.inboxHasImage ? 'blocked' : 'missing'}</strong>
    </header>
    <dl>
      <div><dt>inbox target</dt><dd><code>${htmlEscape(candidate.inboxTarget)}</code></dd></div>
      <div><dt>prompt</dt><dd><a href="${htmlEscape(candidate.promptFile?.replace('public/review/source-candidates/', '') ?? '#')}">open prompt</a></dd></div>
      <div><dt>contract</dt><dd><a href="${htmlEscape(candidate.contract?.replace('public/review/source-candidates/', '') ?? '#')}">open contract</a></dd></div>
      <div><dt>audit</dt><dd>${candidate.promptHasAuditHardening ? 'hardened' : 'missing hardening'} · ${htmlEscape(candidate.lane ?? 'missing lane')}</dd></div>
      <div><dt>attempts</dt><dd>${candidate.missingArtifactAttempts} missing-artifact · ${candidate.visualRejections} visual rejection</dd></div>
    </dl>
    ${candidate.inboxValidationFailures.length ? `<ul class="failures">${candidate.inboxValidationFailures.map((failure) => `<li>${htmlEscape(failure)}</li>`).join('')}</ul>` : ''}
    ${commandBlock(Object.values(candidate.commands))}
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Intake Runway</title>
  <style>
    :root { color-scheme: dark; --bg:#061013; --panel:#0c1b20; --line:#24424b; --text:#e2f5f6; --muted:#91aab0; --accent:#7ce5ff; --good:#7ee29c; --warn:#e7bd6d; --bad:#db6a83; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1340px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:0; font-size:18px; }
    p { color:var(--muted); }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    code { color:var(--muted); }
    pre { border:1px solid var(--line); background:#050b0d; padding:10px; overflow:auto; white-space:pre-wrap; }
    .metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px; margin:18px 0; }
    .metrics div { border:1px solid var(--line); background:var(--panel); padding:10px; }
    .metrics strong { display:block; font-size:22px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(380px,1fr)); gap:14px; margin-top:18px; }
    .card { border:1px solid var(--line); background:var(--panel); border-radius:6px; padding:14px; }
    .card.ready { border-color:var(--good); }
    .card.blocked { border-color:var(--warn); }
    .card.missing { border-color:#385866; }
    header { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
    header strong { color:var(--warn); text-transform:uppercase; font-size:12px; }
    .ready header strong { color:var(--good); }
    dl { display:grid; gap:7px; margin:14px 0; }
    dt { color:var(--muted); font-size:11px; text-transform:uppercase; }
    dd { margin:0; }
    .failures { color:var(--bad); }
  </style>
</head>
<body>
  <main>
    <h1>Source Intake Runway</h1>
    <p>Focused intake surface for turning generated magenta-background source art into validated project files.</p>
    <section class="metrics">
      <div><span>Sprint</span><strong>${report.summary.sprint}</strong></div>
      <div><span>Ready</span><strong>${report.summary.inboxReady}</strong></div>
      <div><span>Missing</span><strong>${report.summary.inboxMissing}</strong></div>
      <div><span>Audit-hardened</span><strong>${report.summary.promptsWithAuditHardening}/${report.summary.sprint}</strong></div>
      <div><span>Current target</span><strong>${htmlEscape(report.summary.currentTarget ?? 'none')}</strong></div>
      <div><span>Marker historical</span><strong>${report.summary.activeMarkerIsHistorical ? 'yes' : 'no'}</strong></div>
    </section>
    ${commandBlock(Object.values(report.commands))}
    <section class="grid">${cards}</section>
  </main>
</body>
</html>
`;
}

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdown(report));
await writeFile(paths.outHtml, html(report));

console.log(JSON.stringify({
  schema: report.schema,
  jsonOut: repoRelative(paths.outJson),
  markdownOut: repoRelative(paths.outMarkdown),
  htmlOut: repoRelative(paths.outHtml),
  summary: report.summary,
}, null, 2));

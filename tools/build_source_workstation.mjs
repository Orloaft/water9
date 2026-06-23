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
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-workstation.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/source-candidates/source-workstation.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-workstation.html')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  sourceQueue: resolve(String(args.get('source-queue') ?? 'public/review/source-candidates/source-generation-queue.json')),
  sourceDoctor: resolve(String(args.get('source-doctor') ?? 'public/review/source-candidates/source-intake-doctor.json')),
  nextAction: resolve(String(args.get('next-action') ?? 'public/review/content-next-action.json')),
  rejections: resolve(String(args.get('rejections') ?? 'public/review/source-candidates/rejected-attempts.json')),
};
const MANUAL_CAPTURE_THRESHOLD = 5;

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

function listMarkdown(items) {
  return (items ?? []).map((item) => `- ${item}`).join('\n');
}

function listHtml(items) {
  return `<ul>${(items ?? []).map((item) => `<li>${htmlEscape(item)}</li>`).join('')}</ul>`;
}

function commandsFor(id) {
  return [
    `npm run source:next-prompt -- --id ${id}`,
    `npm run source:inbox-capture -- --id ${id} --open`,
    'npm run source:inbox-capture',
    `npm run source:recover-inline -- --id ${id} --image <saved-image-path> --copy --validate`,
    `npm run source:recover-inline -- --id ${id} --data-url-stdin --copy --validate`,
    `npm run source:recover-inline -- --id ${id} --stdin-base64 --stdin-filename ${id}.png --copy --validate`,
    `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${id}`,
    `npm run source:ingest-current -- --id ${id} --dry-run`,
    `npm run source:ingest-current -- --id ${id} --apply`,
    `npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids ${id} --dry-run`,
    `npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids ${id}`,
    `npm run source:image-check -- --id ${id}`,
    'npm run source:preview-check',
    `npm run sandbox:preview -- --id ${id} --kind source --serve --open --visual`,
    'npm run source:review-dossier',
    'npm run source:review-dossier-check',
    'npm run source:quick-review-all -- --no-build',
    'npm run source:check',
    'npm run source:gallery',
  ];
}

function operatorSequenceFor(id, captureEscalation) {
  const manualCaptureSteps = captureEscalation.manualCaptureRequired ? [
    `Do not start another built-in inline image generation for ${id} as the primary path; ${captureEscalation.missingArtifactAttempts} attempts have produced no recoverable project file.`,
    `Open npm run source:inbox-capture -- --id ${id} --open before generating so the rendered image can be pasted, dropped, or selected into tools/source-inbox/${id}.png immediately.`,
  ] : [];
  return [
    ...manualCaptureSteps,
    `Open the current prompt with npm run source:next-prompt -- --id ${id}.`,
    `Generate one cohesive whole-source creature on pure #ff00ff and save it as tools/source-inbox/${id}.png.`,
    'If the image is only available inline, use source:recover-inline instead of attempting more unrecoverable generations.',
    `Run npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${id}; do not ingest until it passes.`,
    `Run npm run source:ingest-current -- --id ${id} --dry-run, then apply with --apply if the dry run is clean.`,
    `Run npm run source:image-check -- --id ${id}, npm run source:preview-check, and the source sandbox preview before human review.`,
    'Reject outputs with weak silhouette, detached parts, non-magenta background, crop-hostile anatomy, or non-riggable pose.',
  ];
}

function qualityGateCommandsFor(id) {
  return [
    `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${id}`,
    `npm run source:ingest-current -- --id ${id} --dry-run`,
    `npm run source:image-check -- --id ${id}`,
    'npm run source:preview-check',
    `npm run sandbox:preview -- --id ${id} --kind source --serve --open --visual`,
    'npm run source:review-dossier && npm run source:review-dossier-check',
    'npm run source:check',
    'npm run content:status -- --json',
  ];
}

function inboxFilesFor(id) {
  return [
    `tools/source-inbox/${id}.png`,
    `tools/source-inbox/fauna-${id}-whole-source.png`,
  ];
}

function rejectionKind(attempt) {
  if (attempt.copiedImage) return 'visual-rejection';
  if (/no (new |recoverable |accessible )?(saved |source )?(image )?file|did not create an accessible source image file|no project-bound artifact|inline/i.test(String(attempt.reason ?? ''))) {
    return 'missing-artifact';
  }
  return 'other';
}

function missingArtifactAttemptsFor(id, attempts) {
  return (attempts ?? []).filter((attempt) => attempt.candidateId === id && rejectionKind(attempt) === 'missing-artifact');
}

function captureEscalationFor(id, attempts) {
  const missing = missingArtifactAttemptsFor(id, attempts);
  const manualCaptureRequired = missing.length >= MANUAL_CAPTURE_THRESHOLD;
  return {
    schema: 'water9/source-capture-escalation@1',
    candidateId: id,
    threshold: MANUAL_CAPTURE_THRESHOLD,
    missingArtifactAttempts: missing.length,
    manualCaptureRequired,
    noMoreInlineRetries: manualCaptureRequired,
    reason: manualCaptureRequired
      ? `Built-in inline generation has produced ${missing.length} missing-artifact attempts for ${id}; capture/save the rendered image into the source inbox before any ingest step.`
      : `Manual capture escalation starts at ${MANUAL_CAPTURE_THRESHOLD} missing-artifact attempts.`,
    primaryCommand: `npm run source:inbox-capture -- --id ${id} --open`,
    expectedInboxFile: `tools/source-inbox/${id}.png`,
    recoveryCommands: [
      `npm run source:recover-inline -- --id ${id} --image <saved-image-path> --copy --validate`,
      `npm run source:recover-inline -- --id ${id} --data-url-stdin --copy --validate`,
      `npm run source:recover-inline -- --id ${id} --stdin-base64 --stdin-filename ${id}.png --copy --validate`,
    ],
    validationCommands: [
      `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${id}`,
      `npm run source:ingest-current -- --id ${id} --dry-run`,
      `npm run source:ingest-current -- --id ${id} --apply`,
    ],
  };
}

function buildMarkdown(report) {
  const target = report.target;
  const latest = report.rejections.slice(0, 5);
  return `# Water 9 Source Workstation

Generated: \`${report.generatedAt}\`

## Target

- Candidate: \`${target.id}\` ${target.species}
- Status: \`${target.status}\`
- Doctor status: \`${target.doctorStatus}\`
- Queue rank: \`${target.queueRank ?? 'none'}\`
- Expected output: \`${target.expectedOutput ?? 'none'}\`
- Prompt file: \`${target.promptFile ?? 'none'}\`
- Capture UI: \`${target.captureUrl}\`
- Manual capture required: \`${target.captureEscalation.manualCaptureRequired}\`
- Missing artifact attempts: \`${target.captureEscalation.missingArtifactAttempts}/${target.captureEscalation.threshold}\`

## Manual Capture Escalation

- Required: \`${target.captureEscalation.manualCaptureRequired}\`
- No more inline retries: \`${target.captureEscalation.noMoreInlineRetries}\`
- Reason: ${target.captureEscalation.reason}
- Primary command: \`${target.captureEscalation.primaryCommand}\`
- Expected inbox file: \`${target.captureEscalation.expectedInboxFile}\`

### Recovery Commands

\`\`\`bash
${target.captureEscalation.recoveryCommands.join('\n')}
\`\`\`

### Capture Validation Commands

\`\`\`bash
${target.captureEscalation.validationCommands.join('\n')}
\`\`\`

## Inbox Targets

${listMarkdown(target.expectedInboxFiles)}

## Commands

\`\`\`bash
${target.commands.join('\n')}
\`\`\`

## Operator Sequence

${listMarkdown(target.operatorSequence)}

## Quality Gate Commands

\`\`\`bash
${target.qualityGateCommands.join('\n')}
\`\`\`

## Page Utilities

\`\`\`bash
npm run source:workstation
npm run source:workstation-check
npm run source:workstation:preview
npm run source:ingest-current -- --id ${target.id} --dry-run
npm run source:ingest-current -- --id ${target.id} --apply
\`\`\`

## Required Read

${listMarkdown(target.requiredRead)}

## Reject If

${listMarkdown(target.promptRisks)}

## Review Checklist

${listMarkdown(target.contractReviewChecklist)}

## Articulatable Parts

${listMarkdown(target.articulatableParts)}

## Generation Prompt

\`\`\`text
${target.prompt}
\`\`\`

## Recent Rejections

${latest.length ? latest.map((item) => `- \`${item.rejectedAt}\` \`${item.kind}\`: ${item.reason}`).join('\n') : '- none'}
`;
}

function buildHtml(report) {
  const target = report.target;
  const latest = report.rejections.slice(0, 8);
  const rejectionRows = latest.map((item) => `<tr>
    <td><code>${htmlEscape(item.rejectedAt)}</code></td>
    <td>${htmlEscape(item.kind)}</td>
    <td>${htmlEscape(item.reason)}</td>
  </tr>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Workstation</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0b1c21; --line:#294a54; --text:#e5f7f8; --muted:#9ab4ba; --accent:#75ddf3; --warn:#e2bd72; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1280px; margin:0 auto; padding:26px 18px 52px; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4rem); }
    h2 { margin:0 0 10px; font-size:18px; }
    p, li, td { color:var(--muted); }
    a { color:var(--accent); }
    code, pre, textarea { font-family:"SFMono-Regular",Consolas,monospace; }
    code { color:#dffbff; }
    pre, textarea { width:100%; margin:0; padding:12px; border:1px solid var(--line); border-radius:6px; background:#050b0d; color:var(--text); overflow:auto; }
    textarea { min-height:320px; resize:vertical; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:14px; margin:18px 0; }
    .panel { border:1px solid var(--line); border-radius:7px; background:var(--panel); padding:15px; }
    .status { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }
    .status span { border:1px solid var(--line); border-radius:5px; padding:7px 9px; color:var(--muted); }
    .status strong { color:var(--text); margin-left:4px; }
    .escalation { border-color:${target.captureEscalation.manualCaptureRequired ? '#e2bd72' : 'var(--line)'}; background:${target.captureEscalation.manualCaptureRequired ? '#211907' : 'var(--panel)'}; }
    .escalation h2 { color:${target.captureEscalation.manualCaptureRequired ? '#ffe3a4' : 'var(--text)'}; }
    table { width:100%; border-collapse:collapse; }
    th, td { text-align:left; vertical-align:top; border-bottom:1px solid #203942; padding:8px; }
    th { color:var(--text); }
  </style>
</head>
<body>
  <main>
    <h1>Source Workstation</h1>
    <p>Single-target page for generating, saving, validating, and ingesting the current source-image blocker.</p>
    <section class="panel">
      <h2>${htmlEscape(target.species)} <code>${htmlEscape(target.id)}</code></h2>
      <div class="status">
        <span>status <strong>${htmlEscape(target.status)}</strong></span>
        <span>doctor <strong>${htmlEscape(target.doctorStatus)}</strong></span>
        <span>queue rank <strong>${htmlEscape(target.queueRank ?? 'none')}</strong></span>
        <span>rejections <strong>${report.rejections.length}</strong></span>
        <span>manual capture <strong>${htmlEscape(String(target.captureEscalation.manualCaptureRequired))}</strong></span>
      </div>
      <p>Expected output: <code>${htmlEscape(target.expectedOutput ?? 'none')}</code></p>
      <p>Prompt file: <code>${htmlEscape(target.promptFile ?? 'none')}</code></p>
    </section>
    <section class="panel escalation">
      <h2>Manual Capture Escalation</h2>
      <p>${htmlEscape(target.captureEscalation.reason)}</p>
      <p><strong>Manual capture required:</strong> ${htmlEscape(String(target.captureEscalation.manualCaptureRequired))}</p>
      <p><strong>No more inline retries:</strong> ${htmlEscape(String(target.captureEscalation.noMoreInlineRetries))}</p>
      <div class="status">
        <span>missing artifacts <strong>${htmlEscape(`${target.captureEscalation.missingArtifactAttempts}/${target.captureEscalation.threshold}`)}</strong></span>
        <span>no more inline retries <strong>${htmlEscape(String(target.captureEscalation.noMoreInlineRetries))}</strong></span>
      </div>
      <p>Primary command: <code>${htmlEscape(target.captureEscalation.primaryCommand)}</code></p>
      <p>Expected inbox file: <code>${htmlEscape(target.captureEscalation.expectedInboxFile)}</code></p>
      <pre><code>${htmlEscape([...target.captureEscalation.recoveryCommands, ...target.captureEscalation.validationCommands].join('\n'))}</code></pre>
    </section>
    <section class="grid">
      <article class="panel"><h2>Inbox Targets</h2>${listHtml(target.expectedInboxFiles)}</article>
      <article class="panel"><h2>Commands</h2><pre><code>${htmlEscape(target.commands.join('\n'))}</code></pre></article>
      <article class="panel"><h2>Operator Sequence</h2>${listHtml(target.operatorSequence)}</article>
      <article class="panel"><h2>Quality Gate Commands</h2><pre><code>${htmlEscape(target.qualityGateCommands.join('\n'))}</code></pre></article>
      <article class="panel"><h2>Page Utilities</h2><pre><code>npm run source:workstation
npm run source:workstation-check
npm run source:workstation:preview
npm run source:ingest-current -- --id ${target.id} --dry-run
npm run source:ingest-current -- --id ${target.id} --apply</code></pre></article>
      <article class="panel"><h2>Capture UI</h2><p>Start the capture server with the target preselected:</p><pre><code>${htmlEscape(target.captureCommand)}</code></pre><p>Default local URL after the server starts: <a href="${htmlEscape(target.captureUrl)}">${htmlEscape(target.captureUrl)}</a></p></article>
    </section>
    <section class="grid">
      <article class="panel"><h2>Required Read</h2>${listHtml(target.requiredRead)}</article>
      <article class="panel"><h2>Reject If</h2>${listHtml(target.promptRisks)}</article>
      <article class="panel"><h2>Review Checklist</h2>${listHtml(target.contractReviewChecklist)}</article>
      <article class="panel"><h2>Articulatable Parts</h2>${listHtml(target.articulatableParts)}</article>
    </section>
    <section class="panel">
      <h2>Generation Prompt</h2>
      <textarea spellcheck="false">${htmlEscape(target.prompt)}</textarea>
    </section>
    <section class="panel">
      <h2>Recent Rejections</h2>
      <table><thead><tr><th>When</th><th>Kind</th><th>Reason</th></tr></thead><tbody>${rejectionRows || '<tr><td colspan="3">none</td></tr>'}</tbody></table>
    </section>
  </main>
</body>
</html>
`;
}

const sourceCandidates = await readJson(paths.sourceCandidates, { candidates: [] });
const sourceQueue = await readJson(paths.sourceQueue, { candidates: [] });
const sourceDoctor = await readJson(paths.sourceDoctor, { target: {}, queue: [] });
const nextAction = await readJson(paths.nextAction, { nextAction: {} });
const rejected = await readJson(paths.rejections, { attempts: [] });

const candidates = Array.isArray(sourceCandidates.candidates) ? sourceCandidates.candidates : [];
const queue = Array.isArray(sourceQueue.candidates) ? sourceQueue.candidates : [];
const queueIds = new Set(queue.map((item) => item.id));
const requestedTargetId = String(args.get('id') ?? '').trim();
const nextTargetId = String(nextAction.nextAction?.targetId ?? '').trim();
const doctorTargetId = String(sourceDoctor.target?.id ?? '').trim();
const targetId = requestedTargetId
  || (nextTargetId && queueIds.has(nextTargetId) ? nextTargetId : '')
  || (doctorTargetId && queueIds.has(doctorTargetId) ? doctorTargetId : '')
  || queue[0]?.id
  || nextTargetId
  || doctorTargetId;
const candidate = candidates.find((item) => item.id === targetId);
const queueItem = queue.find((item) => item.id === targetId);
if (!candidate) throw new Error(`No source candidate found for target ${targetId || '(missing)'}`);

const prompt = queueItem?.prompt ?? candidate.prompt ?? '';
const captureEscalation = captureEscalationFor(candidate.id, rejected.attempts ?? []);
const target = {
  id: candidate.id,
  species: candidate.species,
  status: candidate.status,
  doctorStatus: sourceDoctor.target?.id === candidate.id ? sourceDoctor.target?.status ?? 'unknown' : 'not-current-doctor-target',
  queueRank: queueItem?.rank ?? null,
  expectedOutput: queueItem?.expectedOutput ?? (candidate.id ? `public/assets/generated/fauna-${candidate.id}-whole-source.png` : null),
  promptFile: queueItem?.promptFile ?? null,
  expectedInboxFiles: inboxFilesFor(candidate.id),
  captureCommand: `npm run source:inbox-capture -- --id ${candidate.id} --open`,
  captureUrl: `http://127.0.0.1:5188/?id=${encodeURIComponent(candidate.id)}`,
  captureEscalation,
  commands: commandsFor(candidate.id),
  operatorSequence: operatorSequenceFor(candidate.id, captureEscalation),
  qualityGateCommands: qualityGateCommandsFor(candidate.id),
  requiredRead: queueItem?.requiredRead ?? candidate.requiredRead ?? [],
  promptRisks: queueItem?.promptRisks ?? candidate.promptRisks ?? [],
  contractReviewChecklist: queueItem?.contractReviewChecklist ?? candidate.contractReviewChecklist ?? [],
  articulatableParts: queueItem?.articulatableParts ?? candidate.articulatableParts ?? [],
  prompt,
};

const rejections = (rejected.attempts ?? [])
  .filter((attempt) => attempt.candidateId === target.id)
  .map((attempt) => ({
    id: attempt.id,
    rejectedAt: attempt.rejectedAt,
    reason: attempt.reason,
    copiedImage: attempt.copiedImage ?? null,
    originalImage: attempt.originalImage ?? null,
    kind: rejectionKind(attempt),
  }))
  .sort((left, right) => String(right.rejectedAt).localeCompare(String(left.rejectedAt)));

const report = {
  schema: 'water9/source-workstation@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: Object.fromEntries(Object.entries(paths).filter(([key]) => !key.startsWith('out')).map(([key, value]) => [key, asRepoRelative(value)])),
  target,
  rejections,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, buildMarkdown(report));
await writeFile(paths.outHtml, buildHtml(report));

console.log(JSON.stringify({
  schema: report.schema,
  target: target.id,
  doctorStatus: target.doctorStatus,
  rejections: rejections.length,
  jsonOut: asRepoRelative(paths.outJson),
  markdownOut: asRepoRelative(paths.outMarkdown),
  htmlOut: asRepoRelative(paths.outHtml),
}, null, 2));

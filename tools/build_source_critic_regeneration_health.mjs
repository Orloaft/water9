import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
  queue: resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-critic-regeneration-queue.json')),
  manifest: resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-critic-regeneration-health.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/source-candidates/source-critic-regeneration-health.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-critic-regeneration-health.html')),
};

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function repoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function fileInfo(path) {
  try {
    const bytes = await readFile(path);
    const info = await stat(path);
    return {
      exists: info.isFile(),
      size: info.size,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      path: repoRelative(path),
    };
  } catch {
    return {
      exists: false,
      size: 0,
      sha256: null,
      path: repoRelative(path),
    };
  }
}

function validateImage(id, imagePath) {
  const result = spawnSync('python3', [
    'tools/validate_source_candidate_images.py',
    '--id',
    id,
    '--image',
    imagePath,
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
    failures.push(`${id}: image validation failed${output ? `: ${output.trim()}` : ''}`);
  }
  return {
    checked: true,
    passed: failures.length === 0,
    metric: parsed?.metrics?.[0] ?? null,
    failures,
  };
}

async function replacementState(candidate, manifestCandidate) {
  const source = await fileInfo(candidate.source);
  const expectedInboxPath = candidate.expectedInboxImage ?? `tools/source-inbox/${candidate.id}.png`;
  const inbox = await fileInfo(expectedInboxPath);
  const imageCheck = inbox.exists && inbox.size >= 512
    ? validateImage(candidate.id, expectedInboxPath)
    : { checked: false, passed: false, metric: null, failures: inbox.exists ? ['replacement file is too small'] : ['replacement file is missing'] };
  const matchesCurrentSource = Boolean(inbox.exists && source.exists && inbox.sha256 && source.sha256 && inbox.sha256 === source.sha256);
  const ingest = manifestCandidate?.sourceIngest ?? {};
  const replacementApplied = Boolean(
    matchesCurrentSource
      && imageCheck.passed
      && ingest.originalSha256
      && ingest.sourceSha256
      && ingest.previousSourceSha256
      && ingest.originalSha256 === inbox.sha256
      && ingest.sourceSha256 === source.sha256
      && ingest.previousSourceSha256 !== source.sha256,
  );
  const distinctReplacementReady = Boolean(inbox.exists && imageCheck.passed && !matchesCurrentSource);
  const status = distinctReplacementReady
    ? 'distinct-replacement-ready'
    : replacementApplied
      ? 'replacement-applied'
      : imageCheck.passed && matchesCurrentSource
      ? 'valid-noop-replacement'
      : inbox.exists
        ? 'replacement-invalid'
        : 'replacement-missing';
  const nextAction = distinctReplacementReady
    ? 'run dry-run replacement ingest, then apply only after checking the replacement source preview'
    : replacementApplied
      ? 'replacement is already applied; return this source to the human approval runway'
    : matchesCurrentSource
      ? 'generate or capture a new distinct replacement; current inbox file is a no-op'
      : inbox.exists
        ? 'fix or replace the inbox image before ingest'
        : 'generate or manually capture the replacement image';
  return {
    id: candidate.id,
    species: candidate.species,
    rank: candidate.rank,
    lane: candidate.lane,
    status,
    distinctReplacementReady,
    replacementApplied,
    replacementMatchesCurrentSource: matchesCurrentSource,
    source,
    inbox,
    imageCheck,
    sourceIngest: manifestCandidate?.sourceIngest ?? null,
    nextAction,
    promptFile: candidate.promptFile,
    links: candidate.links ?? {},
    commands: {
      openPrompt: candidate.commands?.openPrompt ?? null,
      markImagegen: candidate.commands?.markImagegen ?? null,
      checkImagegen: candidate.commands?.checkImagegen ?? null,
      ingestImagegen: candidate.commands?.ingestImagegen ?? null,
      captureManual: candidate.commands?.captureManual ?? null,
      recoverSavedImage: candidate.commands?.recoverSavedImage ?? null,
      generateOpenAiDryRun: candidate.commands?.generateOpenAiDryRun ?? null,
      generateOpenAiApply: candidate.commands?.generateOpenAiApply ?? null,
      validateInbox: candidate.commands?.validateInbox ?? null,
      dryRunReplace: candidate.commands?.dryRunReplace ?? null,
      applyReplace: candidate.commands?.applyReplace ?? null,
      sourcePreview: candidate.commands?.sourcePreview ?? null,
      rebuildEvidence: candidate.commands?.rebuildEvidence ?? null,
    },
  };
}

function nextCommandsFor(item) {
  if (item.status === 'distinct-replacement-ready') {
    return [
      item.commands.validateInbox,
      item.commands.dryRunReplace,
      item.commands.sourcePreview,
      item.commands.applyReplace,
      item.commands.rebuildEvidence,
    ].filter(Boolean);
  }
  if (item.status === 'replacement-applied') {
    return [
      'npm run source:gallery',
      'npm run source:preview-check',
      'npm run source:review-dossier && npm run source:review-dossier-check',
      'npm run source:approval-runway && npm run source:approval-runway-check',
      'npm run source:visual-board && npm run source:visual-board-check',
    ];
  }
  if (item.status === 'valid-noop-replacement') {
    return [
      item.commands.openPrompt,
      item.commands.markImagegen,
      item.commands.checkImagegen,
      item.commands.ingestImagegen,
      item.commands.captureManual,
      item.commands.recoverSavedImage,
      item.commands.generateOpenAiDryRun,
      item.commands.generateOpenAiApply,
    ].filter(Boolean);
  }
  return [
    item.commands.openPrompt,
    item.commands.captureManual,
    item.commands.recoverSavedImage,
    item.commands.markImagegen,
    item.commands.checkImagegen,
    item.commands.generateOpenAiDryRun,
  ].filter(Boolean);
}

function markdown(report) {
  const rows = report.items.map((item) => `| \`${item.id}\` | ${item.species} | ${item.status} | ${item.inbox.exists ? 'yes' : 'no'} | ${item.imageCheck.passed ? 'yes' : 'no'} | ${item.replacementMatchesCurrentSource ? 'yes' : 'no'} | ${item.nextAction} |`).join('\n');
  const commands = report.nextCommands.length ? report.nextCommands : ['# no critic-regeneration commands available'];
  const perCandidateCommands = report.items.map((item) => [
    `### \`${item.id}\` ${item.species}`,
    '',
    `Status: \`${item.status}\``,
    '',
    '```bash',
    ...(item.nextCommands.length ? item.nextCommands : ['# no commands']),
    '```',
    '',
  ].join('\n')).join('\n');
  return `# Water 9 Critic Regeneration Health

Generated: \`${report.generatedAt}\`

Queue-wide replacement health for critic-blocked source candidates. This report does not approve source art or accept threats.

Evidence JSON: \`${report.artifacts?.json ?? 'public/review/source-candidates/source-critic-regeneration-health.json'}\`

## Summary

- Regeneration candidates: ${report.summary.regenerateCandidates}
- Distinct replacements ready: ${report.summary.distinctReplacementReady}
- Applied replacements ready for source review: ${report.summary.appliedReplacements}
- Valid no-op replacements: ${report.summary.validNoopReplacements}
- Missing replacements: ${report.summary.missingReplacements}
- Invalid replacements: ${report.summary.invalidReplacements}
- Next actionable target: \`${report.summary.nextActionTarget ?? 'none'}\`

## Next Commands

\`\`\`bash
${commands.join('\n')}
\`\`\`

## Candidates

| ID | Species | Status | Inbox | Valid | Matches Current | Next Action |
| --- | --- | --- | --- | --- | --- | --- |
${rows}

## Per-Candidate Commands

${perCandidateCommands}
`;
}

function html(report) {
  const rows = report.items.map((item) => `<tr data-critic-regeneration-health-row="${htmlEscape(item.id)}" data-status="${htmlEscape(item.status)}">
    <td><code>${htmlEscape(item.id)}</code></td>
    <td>${htmlEscape(item.species)}</td>
    <td>${htmlEscape(item.status)}</td>
    <td>${item.inbox.exists ? 'yes' : 'no'}</td>
    <td>${item.imageCheck.passed ? 'yes' : 'no'}</td>
    <td>${item.replacementMatchesCurrentSource ? 'yes' : 'no'}</td>
    <td>${htmlEscape(item.nextAction)}</td>
    <td><pre><code>${htmlEscape(item.nextCommands.join('\n') || 'none')}</code></pre></td>
  </tr>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Critic Regeneration Health</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background:#061014; color:#e5f6f8; }
    body { margin:0; background:#061014; }
    main { max-width:1280px; margin:0 auto; padding:28px 18px 48px; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4rem); letter-spacing:0; }
    p, td { color:#bdd4dc; line-height:1.45; }
    code, pre { color:#cfeef6; overflow-wrap:anywhere; font-family:"SFMono-Regular", Consolas, monospace; }
    pre { border:1px solid #203b46; background:#041014; padding:10px; white-space:pre-wrap; }
    .notice { border:1px solid #6a5230; border-radius:6px; background:#1d1710; color:#f0d9aa; padding:10px 12px; margin:16px 0; }
    .summary { display:flex; flex-wrap:wrap; gap:8px; margin:16px 0; }
    .summary span { border:1px solid #294653; border-radius:6px; background:#0b1d24; padding:8px 10px; color:#bdd6df; }
    table { width:100%; border-collapse:collapse; border:1px solid #203b46; background:#081920; }
    th, td { padding:8px 9px; border-bottom:1px solid #18303a; text-align:left; vertical-align:top; }
    th { background:#10242c; color:#e7f7fb; }
  </style>
</head>
<body>
  <main data-critic-regeneration-health>
    <h1>Critic Regeneration Health</h1>
    <p>Queue-wide replacement health for critic-blocked source candidates.</p>
    <p>Evidence JSON: <code>${htmlEscape(report.artifacts?.json ?? 'public/review/source-candidates/source-critic-regeneration-health.json')}</code></p>
    <div class="notice">This report does not approve source art or accept threats. Distinct replacements must return to source review.</div>
    <div class="summary">
      <span>${report.summary.regenerateCandidates} regenerate candidates</span>
      <span>Distinct replacements ready ${report.summary.distinctReplacementReady}</span>
      <span>Applied replacements ${report.summary.appliedReplacements}</span>
      <span>Valid no-op replacements ${report.summary.validNoopReplacements}</span>
      <span>Missing replacements ${report.summary.missingReplacements}</span>
      <span>Invalid replacements ${report.summary.invalidReplacements}</span>
      <span>next ${htmlEscape(report.summary.nextActionTarget ?? 'none')}</span>
    </div>
    <h2>Next Commands</h2>
    <pre><code>${htmlEscape(report.nextCommands.join('\n') || '# no commands')}</code></pre>
    <table>
      <thead><tr><th>ID</th><th>Species</th><th>Status</th><th>Inbox</th><th>Valid</th><th>Matches Current</th><th>Next Action</th><th>First Command</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
</body>
</html>
`;
}

const queue = await readJson(paths.queue);
const manifest = await readJson(paths.manifest);
if (queue.schema !== 'water9/source-critic-regeneration-queue@1') throw new Error(`Unexpected queue schema ${queue.schema ?? 'missing'}`);
if (manifest.schema !== 'water9/source-candidates@1') throw new Error(`Unexpected source candidate schema ${manifest.schema ?? 'missing'}`);
const manifestById = new Map((manifest.candidates ?? []).map((candidate) => [candidate.id, candidate]));
const items = [];
for (const candidate of queue.candidates ?? []) {
  const item = await replacementState(candidate, manifestById.get(candidate.id) ?? null);
  items.push({ ...item, nextCommands: nextCommandsFor(item) });
}
const nextActionTarget = items.find((item) => item.distinctReplacementReady)?.id
  ?? items.find((item) => item.status === 'valid-noop-replacement')?.id
  ?? items.find((item) => item.status === 'replacement-missing')?.id
  ?? items.find((item) => item.status === 'replacement-invalid')?.id
  ?? null;
const nextActionItem = items.find((item) => item.id === nextActionTarget) ?? null;
const report = {
  schema: 'water9/source-critic-regeneration-health@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: repoRelative(paths.queue),
  artifacts: {
    json: repoRelative(paths.outJson),
    markdown: repoRelative(paths.outMarkdown),
    html: repoRelative(paths.outHtml),
  },
  policy: {
    doesNotApproveSources: true,
    doesNotAcceptThreats: true,
    distinctReplacementRequiredBeforeIngest: true,
    replacementMustReturnToSourceReview: true,
  },
  summary: {
    regenerateCandidates: items.length,
    distinctReplacementReady: items.filter((item) => item.status === 'distinct-replacement-ready').length,
    appliedReplacements: items.filter((item) => item.status === 'replacement-applied').length,
    validNoopReplacements: items.filter((item) => item.status === 'valid-noop-replacement').length,
    missingReplacements: items.filter((item) => item.status === 'replacement-missing').length,
    invalidReplacements: items.filter((item) => item.status === 'replacement-invalid').length,
    nextActionTarget,
    nextActionStatus: nextActionItem?.status ?? null,
  },
  nextCommands: nextActionItem?.nextCommands ?? [],
  items,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdown(report));
await writeFile(paths.outHtml, html(report));

console.log(JSON.stringify({
  schema: report.schema,
  regenerateCandidates: report.summary.regenerateCandidates,
  distinctReplacementReady: report.summary.distinctReplacementReady,
  appliedReplacements: report.summary.appliedReplacements,
  validNoopReplacements: report.summary.validNoopReplacements,
  missingReplacements: report.summary.missingReplacements,
  invalidReplacements: report.summary.invalidReplacements,
  nextActionTarget: report.summary.nextActionTarget,
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
}, null, 2));

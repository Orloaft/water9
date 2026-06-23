import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { extname, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const inboxDir = resolve(String(args.get('dir') ?? args.get('inbox-dir') ?? 'tools/source-inbox'));
const queuePath = resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json'));
const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const outDir = resolve(String(args.get('out-dir') ?? 'public/review/source-inbox'));
const jsonOutPath = resolve(String(args.get('json-out') ?? `${outDir}/manifest.json`));
const htmlOutPath = resolve(String(args.get('html-out') ?? `${outDir}/index.html`));
const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const captureCommand = 'npm run source:inbox-capture';

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function asRepoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

function publicUrl(path) {
  const relative = asRepoRelative(path);
  return `/${relative.split('/').map(encodeURIComponent).join('/')}`;
}

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
    return info.isFile() ? info : null;
  } catch {
    return null;
  }
}

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'candidate';
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

function validateImage(id, path) {
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
  try {
    const parsed = JSON.parse(output);
    return {
      checked: true,
      metrics: parsed.metrics?.[0] ?? null,
      failures: parsed.failures ?? [],
    };
  } catch {
    return {
      checked: true,
      metrics: null,
      failures: [`image validation did not return JSON${output ? `: ${output.trim()}` : ''}`],
    };
  }
}

async function loadInboxFiles(candidatesById) {
  const matched = new Map();
  const skipped = [];
  let files = [];
  try {
    files = await readdir(inboxDir, { withFileTypes: true });
  } catch (error) {
    return { matched, skipped, failures: [`could not read source inbox ${asRepoRelative(inboxDir)}: ${error.message}`] };
  }

  const failures = [];
  for (const entry of files) {
    if (!entry.isFile()) continue;
    const file = entry.name;
    const extension = extname(file).toLowerCase();
    const path = resolve(inboxDir, file);
    if (!allowedExtensions.has(extension)) {
      skipped.push({ file, reason: 'not a source image extension' });
      continue;
    }
    const id = candidateIdsForFile(file).find((candidateId) => candidatesById.has(candidateId));
    if (!id) {
      skipped.push({ file, reason: 'does not map to a source candidate id' });
      continue;
    }
    if (matched.has(id)) {
      failures.push(`${id}: multiple inbox files found (${matched.get(id).file}, ${file})`);
      continue;
    }
    const info = await fileInfo(path);
    const imageCheck = info?.size ? validateImage(id, path) : { checked: false, metrics: null, failures: ['missing or empty image file'] };
    matched.set(id, {
      file,
      path: asRepoRelative(path),
      url: publicUrl(path),
      bytes: info?.size ?? 0,
      extension,
      imageCheck,
    });
  }
  return { matched, skipped, failures };
}

function expectedInboxNames(id) {
  return [`${id}.png`, `fauna-${id}-whole-source.png`];
}

function reviewCard(item) {
  const candidate = item.candidate;
  const inbox = item.inboxImage;
  const statusClass = inbox
    ? item.validationFailures.length ? 'blocked' : 'ready'
    : 'missing';
  const requiredRows = (candidate.requiredRead ?? []).map((line) => `<li>${htmlEscape(line)}</li>`).join('');
  const riskRows = (candidate.promptRisks ?? []).map((line) => `<li>${htmlEscape(line)}</li>`).join('');
  const imageBlock = inbox
    ? `<a class="source-image" href="${htmlEscape(inbox.url)}"><img src="${htmlEscape(inbox.url)}" alt="${htmlEscape(candidate.species)} inbox source image"></a>`
    : '<div class="source-missing">No inbox image yet</div>';
  const metrics = inbox?.imageCheck?.metrics;
  const metricRows = metrics ? [
    `size ${metrics.size?.join(' x ') ?? 'unknown'}`,
    `border magenta ${metrics.borderMagenta ?? 'n/a'}`,
    `background ${metrics.backgroundRatio ?? 'n/a'}`,
    `inner magenta ${metrics.innerMagentaRatio ?? 'n/a'}`,
  ] : ['not checked'];
  const failureRows = item.validationFailures.length
    ? item.validationFailures.map((failure) => `<li>${htmlEscape(failure)}</li>`).join('')
    : '<li>none</li>';
  return `
    <article class="card ${statusClass}" id="${htmlEscape(item.id)}">
      <header>
        <div>
          <h2>${htmlEscape(candidate.species ?? item.id)}</h2>
          <p><code>${htmlEscape(item.id)}</code> · rank ${htmlEscape(candidate.rank ?? 'n/a')} · ${htmlEscape(candidate.depthBand ?? 'unassigned')}</p>
        </div>
        <strong>${statusClass}</strong>
      </header>
      ${imageBlock}
      <p class="verb">${htmlEscape(candidate.gameplayVerb ?? '')}</p>
      <dl>
        <div><dt>expected inbox</dt><dd>${expectedInboxNames(item.id).map((name) => `<code>${htmlEscape(name)}</code>`).join(' ')}</dd></div>
        <div><dt>contract</dt><dd><a href="../source-candidates/art-contracts/${htmlEscape(safeFileName(item.id))}.md">open contract</a></dd></div>
        <div><dt>prompt</dt><dd><a href="../source-candidates/generation-queue-prompts/${htmlEscape(String(candidate.rank ?? '').padStart(2, '0'))}-${htmlEscape(item.id)}.txt">open prompt</a></dd></div>
        <div><dt>metrics</dt><dd>${metricRows.map((row) => `<span>${htmlEscape(row)}</span>`).join('')}</dd></div>
      </dl>
      <section><h3>Required Read</h3><ul>${requiredRows || '<li>none recorded</li>'}</ul></section>
      <section><h3>Reject If</h3><ul>${riskRows || '<li>none recorded</li>'}</ul></section>
      <section><h3>Validation Failures</h3><ul>${failureRows}</ul></section>
      <pre><code>${htmlEscape(inbox
        ? `npm run source:ingest -- --id ${item.id} --image ${inbox.path} --copy --dry-run\nnpm run source:ingest -- --id ${item.id} --image ${inbox.path} --copy`
        : `npm run source:session -- --id ${item.id}\n# paste/drop/select a generated image into the local capture page:\nnpm run source:inbox-capture -- --id ${item.id} --open\n# after saving/downloading an inline generated image:\nnpm run source:recover-inline -- --id ${item.id} --copy --validate\n# or choose a saved file explicitly:\nnpm run source:recover-inline -- --id ${item.id} --image <saved-image-path> --copy --validate\nnpm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${item.id}\nnpm run source:ingest-current -- --id ${item.id} --dry-run\nnpm run source:ingest-current -- --id ${item.id} --apply`)}</code></pre>
    </article>`;
}

function renderHtml(report) {
  const cards = report.candidates.map(reviewCard).join('\n');
  const skippedRows = report.skipped.length
    ? report.skipped.map((item) => `<li><code>${htmlEscape(item.file)}</code>: ${htmlEscape(item.reason)}</li>`).join('')
    : '<li>none</li>';
  const recommendedBlock = report.recommendedCaptureCommand
    ? `<p>Recommended next capture: <code>${htmlEscape(report.recommendedCaptureCommand)}</code></p>`
    : '';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Water 9 Source Inbox Review</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #071316; color: #e5f4f7; }
      body { margin: 0; background: #071316; }
      main { max-width: 1320px; margin: 0 auto; padding: 26px 16px 56px; }
      h1 { margin: 0 0 8px; font-size: clamp(2rem, 5vw, 4rem); letter-spacing: 0; }
      p { color: #a8c1c8; line-height: 1.45; }
      .summary { display: flex; flex-wrap: wrap; gap: 10px; margin: 18px 0; }
      .summary span { border: 1px solid #284651; border-radius: 6px; background: #0d2026; padding: 8px 10px; color: #d4ecf1; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 14px; }
      .card { border: 1px solid #24414b; border-radius: 8px; background: #0b1d23; padding: 14px; }
      .card.ready { border-color: #4fbf95; }
      .card.blocked { border-color: #d78755; }
      .card.missing { border-color: #385866; }
      header { display: flex; justify-content: space-between; gap: 12px; align-items: start; }
      h2 { margin: 0; font-size: 1.1rem; }
      h3 { margin: 12px 0 6px; font-size: 0.86rem; color: #d5edf2; }
      code, pre { background: #061014; color: #d7fbff; border-radius: 5px; }
      code { padding: 1px 4px; }
      pre { padding: 10px; overflow: auto; border: 1px solid #1f3b45; }
      a { color: #83e8ff; text-decoration: none; }
      a:hover { text-decoration: underline; }
      .source-image, .source-missing { display: grid; place-items: center; min-height: 190px; margin: 12px 0; border: 1px solid #213b45; border-radius: 6px; background: #050d10; overflow: hidden; }
      .source-image img { display: block; width: 100%; max-height: 320px; object-fit: contain; image-rendering: auto; }
      .source-missing { color: #77949d; }
      .verb { min-height: 3.8em; }
      dl { display: grid; gap: 7px; margin: 10px 0; }
      dt { color: #7f9ca5; font-size: 0.78rem; text-transform: uppercase; }
      dd { margin: 2px 0 0; display: flex; flex-wrap: wrap; gap: 6px; }
      ul { margin: 0; padding-left: 18px; color: #bdd3d9; }
      @media (max-width: 740px) { main { padding: 18px 10px 36px; } .grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main>
      <h1>Source Inbox Review</h1>
      <p>Review generated whole-source creature images before ingestion, extraction, rigging, or acceptance. Images must be cohesive single-creature designs on clean magenta backgrounds.</p>
      <p>For inline-only generated images, run <code>${htmlEscape(report.captureCommand)}</code> and paste, drop, or select the image into the local capture page.</p>
      ${recommendedBlock}
      <div class="summary">
        <span>${report.candidates.length} queued candidates</span>
        <span>${report.ready} ready</span>
        <span>${report.blocked} blocked</span>
        <span>${report.missing} missing images</span>
        <span>${report.failures.length} failures</span>
      </div>
      <section>
        <h2>Skipped Inbox Files</h2>
        <ul>${skippedRows}</ul>
      </section>
      <section class="grid">
        ${cards}
      </section>
    </main>
  </body>
</html>
`;
}

const queue = await readJson(queuePath, { schema: null, candidates: [] });
const manifest = await readJson(manifestPath, { schema: null, candidates: [] });
const sourceCandidates = Array.isArray(manifest.candidates) ? manifest.candidates : [];
const sourceById = new Map(sourceCandidates.map((candidate) => [candidate.id, candidate]));
const queuedCandidates = Array.isArray(queue.candidates) ? queue.candidates : [];
const candidatesById = new Map(queuedCandidates.map((candidate) => [candidate.id, candidate]));
const inbox = await loadInboxFiles(candidatesById);
const failures = [...inbox.failures];

const candidates = queuedCandidates.map((candidate) => {
  const sourceCandidate = sourceById.get(candidate.id) ?? {};
  const inboxImage = inbox.matched.get(candidate.id) ?? null;
  const validationFailures = [];
  if (!sourceById.has(candidate.id)) validationFailures.push('candidate is missing from source-candidates manifest');
  if (sourceCandidate.source) validationFailures.push(`candidate already has source ${sourceCandidate.source}`);
  if (inboxImage?.imageCheck?.failures?.length) validationFailures.push(...inboxImage.imageCheck.failures);
  return {
    id: candidate.id,
    candidate: { ...candidate, ...sourceCandidate, rank: candidate.rank },
    inboxImage,
    validationFailures,
    ready: Boolean(inboxImage) && validationFailures.length === 0,
  };
});

const firstMissing = candidates.find((candidate) => !candidate.inboxImage) ?? null;
const firstReady = candidates.find((candidate) => candidate.ready) ?? null;
const firstAction = firstMissing ?? firstReady ?? candidates[0] ?? null;
const recommendedCaptureCommand = firstAction ? `${captureCommand} -- --id ${firstAction.id} --open` : `${captureCommand} --open`;
const recommendedCheckCommand = firstAction ? `npm run source:inbox-check -- --dir ${asRepoRelative(inboxDir)} --strict --ids ${firstAction.id}` : null;
const recommendedDryRunCommand = firstAction ? `npm run source:ingest-current -- --id ${firstAction.id} --dry-run` : null;
const recommendedApplyCommand = firstAction ? `npm run source:ingest-current -- --id ${firstAction.id} --apply` : null;

for (const [id] of inbox.matched) {
  if (!candidatesById.has(id)) failures.push(`${id}: inbox image does not belong to current generation queue`);
}

const report = {
  schema: 'water9/source-inbox-review@1',
  generatedAt: new Date().toISOString(),
  inboxDir: asRepoRelative(inboxDir),
  queue: asRepoRelative(queuePath),
  sourceManifest: asRepoRelative(manifestPath),
  candidates,
  ready: candidates.filter((candidate) => candidate.ready).length,
  blocked: candidates.filter((candidate) => candidate.inboxImage && !candidate.ready).length,
  missing: candidates.filter((candidate) => !candidate.inboxImage).length,
  skipped: inbox.skipped,
  failures,
  captureCommand,
  recommendedTargetId: firstAction?.id ?? null,
  recommendedTargetStatus: firstAction
    ? firstAction.ready
      ? 'ready'
      : firstAction.inboxImage
        ? 'blocked'
        : 'missing'
    : null,
  recommendedCaptureCommand,
  recommendedCommands: {
    capture: recommendedCaptureCommand,
    check: recommendedCheckCommand,
    dryRun: recommendedDryRunCommand,
    apply: recommendedApplyCommand,
  },
};

await mkdir(outDir, { recursive: true });
await writeFile(jsonOutPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(htmlOutPath, renderHtml(report));

console.log(JSON.stringify({
  schema: report.schema,
  html: asRepoRelative(htmlOutPath),
  json: asRepoRelative(jsonOutPath),
  candidates: candidates.length,
  ready: report.ready,
  blocked: report.blocked,
  missing: report.missing,
  recommendedTargetId: report.recommendedTargetId,
  failures,
}, null, 2));

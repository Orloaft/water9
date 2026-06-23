import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { MIN_VISUAL_NOTE_LENGTH, meaningfulReviewText } from './review_text_quality.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const outDir = resolve(String(args.get('out-dir') ?? 'public/review/source-candidates'));
const thumbDir = resolve(outDir, 'thumbs');
const keyPreviewDir = resolve(outDir, 'key-previews');
const indexPath = resolve(outDir, 'index.html');
const reviewManifestPath = resolve(outDir, 'review-manifest.json');
const rejectionPath = resolve(String(args.get('rejections') ?? 'public/review/source-candidates/rejected-attempts.json'));
const KEY_PREVIEW_MAGENTA_THRESHOLD = 12;
const KEY_PREVIEW_PANEL_HEIGHT = 420;

const SOURCE_VISUAL_CHECKLIST = [
  { id: 'whole-creature-cohesion', flag: 'visual-check whole-creature-cohesion', label: 'Whole creature cohesion', detail: 'The source reads as one organism before any parts are cut.' },
  { id: 'part-continuity-cohesion', flag: 'visual-check part-continuity-cohesion', label: 'Part continuity cohesion', detail: 'Crop-intended parts visibly connect to the same anatomy with compatible proportions, lighting, and material treatment.' },
  { id: 'readable-silhouette', flag: 'visual-check readable-silhouette', label: 'Readable silhouette', detail: 'The outline is recognizable at game scale without relying on detail noise.' },
  { id: 'no-collage-artifacts', flag: 'visual-check no-collage-artifacts', label: 'No collage artifacts', detail: 'Lighting, material language, and anatomy do not look stitched from unrelated pieces.' },
  { id: 'non-placeholder-art-direction', flag: 'visual-check non-placeholder-art-direction', label: 'Non-placeholder art direction', detail: 'The source has a cohesive production-intent creature design, not proof-of-concept shapes or temporary stand-ins.' },
  { id: 'crop-safe-anatomy', flag: 'visual-check crop-safe-anatomy', label: 'Crop-safe anatomy', detail: 'Appendages and joints have enough margin and mass to become articulated parts.' },
  { id: 'clean-magenta-key', flag: 'visual-check clean-magenta-key', label: 'Clean magenta key', detail: 'The background is flat magenta and the body avoids magenta/pink values that will key out.' },
  { id: 'gameplay-read', flag: 'visual-check gameplay-read', label: 'Gameplay read', detail: 'The visual design communicates its gameplay verb and danger shape.' },
  { id: 'neutral-riggable-pose', flag: 'visual-check neutral-riggable-pose', label: 'Neutral riggable pose', detail: 'The source pose preserves pivots and crop zones without baking in the peak attack frame.' },
  { id: 'visible-attack-lane', flag: 'visual-check visible-attack-lane', label: 'Visible attack lane', detail: 'The creature anatomy makes its attack direction and gameplay lane readable before animation.' },
];
const MIN_VISUAL_SCORE = 4;

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function publicUrlFromSource(source) {
  if (!source) return null;
  if (source.startsWith('public/')) return `/${source.slice('public/'.length)}`;
  if (source.startsWith('/')) return source;
  return null;
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

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function fileFingerprint(path) {
  const info = await fileInfo(path);
  if (!info?.isFile()) return { path, exists: false };
  return { path, exists: true, size: info.size, mtimeMs: Math.round(info.mtimeMs) };
}

async function sha256File(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function fileShaFingerprint(path) {
  const info = await fileInfo(path);
  if (!info?.isFile()) return { path, exists: false };
  return {
    path,
    exists: true,
    size: info.size,
    mtimeMs: Math.round(info.mtimeMs),
    sha256: await sha256File(path),
  };
}

async function candidateFingerprint(candidate) {
  const sourceFile = candidate.source ? await fileFingerprint(resolve(candidate.source)) : null;
  const payload = {
    tool: 'water9-source-candidate-review@2',
    candidate,
    sourceFile,
  };
  return createHash('sha256').update(stableJson(payload)).digest('hex');
}

function makeThumbnail(inputPath, outputPath, maxWidth = 720, maxHeight = 420) {
  const result = spawnSync(
    'python3',
    [
      'tools/make_review_thumbnail.py',
      '--input', inputPath,
      '--output', outputPath,
      '--max-width', String(maxWidth),
      '--max-height', String(maxHeight),
    ],
    { encoding: 'utf8', stdio: 'pipe' },
  );
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    throw new Error(`failed to make source candidate thumbnail for ${inputPath}`);
  }
}

function makeKeyPreview(inputPath, outputPath, label) {
  const result = spawnSync(
    'python3',
    [
      'tools/render_source_key_preview.py',
      '--source', inputPath,
      '--output', outputPath,
      '--label', label,
      '--magenta-threshold', String(KEY_PREVIEW_MAGENTA_THRESHOLD),
      '--panel-height', String(KEY_PREVIEW_PANEL_HEIGHT),
    ],
    { encoding: 'utf8', stdio: 'pipe' },
  );
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    throw new Error(`failed to make source candidate key preview for ${inputPath}`);
  }
}

async function keyPreviewEvidence(candidate, sourcePath, keyPreviewFile) {
  if (!candidate.source || !sourcePath || !keyPreviewFile) return null;
  const keyPreviewPath = resolve(outDir, keyPreviewFile);
  return {
    schema: 'water9/source-key-preview@1',
    id: candidate.id,
    source: candidate.source,
    keyPreviewFile,
    generatedAt: new Date().toISOString(),
    renderer: {
      tool: 'tools/render_source_key_preview.py',
      magentaThreshold: KEY_PREVIEW_MAGENTA_THRESHOLD,
      panelHeight: KEY_PREVIEW_PANEL_HEIGHT,
    },
    sourceFingerprint: await fileShaFingerprint(sourcePath),
    keyPreviewFingerprint: await fileShaFingerprint(keyPreviewPath),
  };
}

function requiredApprovalFlags() {
  return [
    ...SOURCE_VISUAL_CHECKLIST.map((check) => `--${check.flag}`),
    ...SOURCE_VISUAL_CHECKLIST.map((check) => `--score ${check.id}=<4-5>`),
    ...SOURCE_VISUAL_CHECKLIST.map((check) => `--visual-note ${check.id}='<specific rationale>'`),
    '--source-reviewed',
    '--source-visual-board public/review/source-visual-board.json',
  ];
}

function requiredRejectionFlags() {
  return [
    '--failed-check whole-creature-cohesion',
    "--visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>'",
    '--source-rejected',
    '--source-visual-board public/review/source-visual-board.json',
  ];
}

function reviewApproved(candidate) {
  const review = candidate.review ?? {};
  const reviewer = String(review.reviewedBy ?? '').trim().toLowerCase();
  const disallowed = new Set(['codex', 'assistant', 'ai', 'agent', 'automation', 'bot', 'model']);
  return (candidate.status === 'approved' || candidate.status === 'rigged')
    && review.status === 'approved'
    && candidate.sourceCohesion === 'single-source'
    && candidate.backgroundKey === 'magenta'
    && Boolean(String(review.reviewedBy ?? '').trim())
    && Boolean(String(review.reviewedAt ?? '').trim())
    && !disallowed.has(reviewer)
    && meaningfulReviewText(review.note)
    && SOURCE_VISUAL_CHECKLIST.every((check) => review.visualChecklist?.[check.id] === true)
    && SOURCE_VISUAL_CHECKLIST.every((check) => Number.isFinite(review.visualScores?.[check.id]) && review.visualScores[check.id] >= MIN_VISUAL_SCORE && review.visualScores[check.id] <= 5)
    && SOURCE_VISUAL_CHECKLIST.every((check) => meaningfulReviewText(review.visualNotes?.[check.id], MIN_VISUAL_NOTE_LENGTH))
    && review.reviewEvidence?.['whole-source'] === true
    && review.reviewEvidence?.['source-preview'] === true
    && review.reviewEvidence?.['source-image-validation'] === true
    && review.imageValidation?.schema === 'water9/source-image-validation@1'
    && review.imageValidation?.metric?.id === candidate.id
    && review.imageValidation?.metric?.source === candidate.source
    && review.imageValidation?.metric?.checked === true
    && Array.isArray(review.imageValidation?.metric?.failures)
    && review.imageValidation.metric.failures.length === 0
    && Boolean(review.imageValidation?.metric?.sourceFingerprint?.sha256);
}

await mkdir(outDir, { recursive: true });
await mkdir(thumbDir, { recursive: true });
await mkdir(keyPreviewDir, { recursive: true });

const manifest = await readJson(manifestPath, { schema: 'water9/source-candidates@1', candidates: [] });
const rejectionManifest = await readJson(rejectionPath, { schema: 'water9/source-rejected-attempts@1', attempts: [] });
const candidates = Array.isArray(manifest.candidates) ? manifest.candidates : [];
const rejectedAttempts = Array.isArray(rejectionManifest.attempts) ? rejectionManifest.attempts : [];
const rejectedByCandidate = new Map();
for (const attempt of rejectedAttempts) {
  const list = rejectedByCandidate.get(attempt.candidateId) ?? [];
  list.push(attempt);
  rejectedByCandidate.set(attempt.candidateId, list);
}
function rejectionKind(attempt) {
  if (attempt.copiedImage) return 'visual-rejection';
  if (attempt.sourceImagegenMarker || /no (new |recoverable |accessible )?(saved |source )?(image )?file|did not create an accessible source image file|no project-bound artifact|inline/i.test(String(attempt.reason ?? ''))) {
    return 'missing-artifact';
  }
  return 'unclassified';
}

function rejectionStats(attempts) {
  const stats = { total: attempts.length, missingArtifact: 0, visualRejection: 0, unclassified: 0 };
  for (const attempt of attempts) {
    const kind = rejectionKind(attempt);
    if (kind === 'missing-artifact') stats.missingArtifact += 1;
    else if (kind === 'visual-rejection') stats.visualRejection += 1;
    else stats.unclassified += 1;
  }
  return stats;
}
const reviewItems = [];
let thumbnails = 0;

for (const candidate of candidates) {
  const sourcePath = candidate.source ? resolve(candidate.source) : null;
  const sourceInfo = sourcePath ? await fileInfo(sourcePath) : null;
  const sourceThumbFile = sourceInfo ? `thumbs/${candidate.id}-source-thumb.png` : null;
  const keyPreviewFile = sourceInfo ? `key-previews/${candidate.id}-key-preview.png` : null;
  if (sourceInfo && sourceThumbFile) {
    makeThumbnail(sourcePath, resolve(outDir, sourceThumbFile));
    thumbnails += 1;
  }
  if (sourceInfo && keyPreviewFile) {
    makeKeyPreview(sourcePath, resolve(outDir, keyPreviewFile), `${candidate.species ?? candidate.id} (${candidate.id})`);
  }
  const candidateRejections = rejectedByCandidate.get(candidate.id) ?? [];
  const item = {
    id: candidate.id,
    species: candidate.species,
    status: candidate.status ?? 'draft',
    depthBand: candidate.depthBand ?? null,
    gameplayVerb: candidate.gameplayVerb ?? null,
    source: candidate.source ?? null,
    sourceUrl: publicUrlFromSource(candidate.source),
    sourceThumbFile,
    keyPreviewFile,
    keyPreviewEvidence: sourceInfo && keyPreviewFile ? await keyPreviewEvidence(candidate, sourcePath, keyPreviewFile) : null,
    sourceBytes: sourceInfo?.size ?? 0,
    inputFingerprint: await candidateFingerprint(candidate),
    sourceCohesion: candidate.sourceCohesion ?? null,
    backgroundKey: candidate.backgroundKey ?? null,
    brief: candidate.brief ?? [],
    requiredRead: candidate.requiredRead ?? [],
    prompt: candidate.prompt ?? '',
    articulatableParts: candidate.articulatableParts ?? [],
    promptRisks: candidate.promptRisks ?? [],
    researchBriefId: candidate.researchBriefId ?? null,
    notes: candidate.notes ?? '',
    review: candidate.review ?? null,
    rejectedAttempts: candidateRejections,
    rejectionStats: rejectionStats(candidateRejections),
    approved: reviewApproved(candidate),
    manualVisualChecklist: SOURCE_VISUAL_CHECKLIST,
    requiredApprovalFlags: requiredApprovalFlags(),
    acceptCommand: `npm run source:accept -- --id ${candidate.id} --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' ${requiredApprovalFlags().join(' ')}`,
    rejectCommand: `npm run source:accept -- --id ${candidate.id} --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' ${requiredRejectionFlags().join(' ')}`,
  };
  reviewItems.push(item);
}

await writeFile(reviewManifestPath, `${JSON.stringify({
  schema: 'water9/source-candidate-review@1',
  generatedFrom: manifestPath,
  candidateCount: reviewItems.length,
  approvedCount: reviewItems.filter((item) => item.approved).length,
  thumbnails,
  rejectedAttempts: rejectedAttempts.length,
  candidates: reviewItems,
}, null, 2)}\n`);

const rows = reviewItems.map((item) => {
  const checkRows = (item.manualVisualChecklist ?? []).map((check) => {
    const recorded = item.review?.visualChecklist?.[check.id] === true;
    return `<li class="${recorded ? 'recorded' : 'pending'}"><span>${recorded ? 'recorded' : 'review'}</span><strong>${htmlEscape(check.label)}</strong><p>${htmlEscape(check.detail)}</p></li>`;
  }).join('');
  const flagRows = (item.requiredApprovalFlags ?? []).map((flag) => `<li><code>${htmlEscape(flag)}</code></li>`).join('');
  const briefRows = (item.brief ?? []).map((line) => `<li>${htmlEscape(line)}</li>`).join('');
  const requiredRows = (item.requiredRead ?? []).map((line) => `<li>${htmlEscape(line)}</li>`).join('');
  const partRows = (item.articulatableParts ?? []).map((line) => `<li>${htmlEscape(line)}</li>`).join('');
  const riskRows = (item.promptRisks ?? []).map((line) => `<li>${htmlEscape(line)}</li>`).join('');
  const rejectedRows = (item.rejectedAttempts ?? []).map((attempt) => {
    const imageLink = attempt.copiedImage ? `<a href="/${htmlEscape(attempt.copiedImage.replace(/^public\//, ''))}">image</a>` : 'no saved image';
    const kind = rejectionKind(attempt);
    const marker = attempt.sourceImagegenMarker
      ? `<p class="marker">marker: ${htmlEscape(attempt.sourceImagegenMarker.createdAt ?? 'unknown')} · previous files: ${htmlEscape(attempt.sourceImagegenMarker.previousFileCount ?? 'unknown')}</p>`
      : '';
    return `<li class="${htmlEscape(kind)}"><strong>${htmlEscape(attempt.rejectedAt)}</strong> · ${htmlEscape(kind)} · ${imageLink}<p>${htmlEscape(attempt.reason)}</p>${marker}</li>`;
  }).join('');
  const missingArtifactHelp = item.rejectionStats.missingArtifact
    ? `<section class="artifact-help"><h3>Missing Artifact Recovery</h3><p>${item.rejectionStats.missingArtifact} generation attempt(s) rendered without a recoverable project file. Use the capture page or explicit recovery path before rejecting future inline outputs.</p><pre><code>npm run source:inbox-capture
npm run source:recover-inline -- --id ${htmlEscape(item.id)} --copy --validate
npm run source:recover-inline -- --id ${htmlEscape(item.id)} --image &lt;saved-image-path&gt; --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${htmlEscape(item.id)}</code></pre></section>`
    : '';
  const sourceBlock = item.sourceUrl
    ? `<section class="image-block"><h3>Whole Source</h3><a href="${htmlEscape(item.sourceUrl)}"><img src="./${htmlEscape(item.sourceThumbFile ?? item.sourceUrl)}" alt="${htmlEscape(item.species)} whole source"></a></section>`
    : '<section class="missing-source"><h3>Whole Source</h3><p>No source image queued yet. This candidate is still a brief, not art.</p></section>';
  const keyPreviewBlock = item.keyPreviewFile
    ? `<section class="image-block"><h3>Chroma Key Preview</h3><a href="./${htmlEscape(item.keyPreviewFile)}"><img src="./${htmlEscape(item.keyPreviewFile)}" alt="${htmlEscape(item.species)} chroma key preview"></a></section>`
    : '';
  return `
    <article class="candidate ${htmlEscape(item.status)}" id="${htmlEscape(item.id)}">
      <header>
        <div>
          <h2>${htmlEscape(item.species ?? item.id)}</h2>
          <p>${htmlEscape(item.id)} · ${htmlEscape(item.depthBand ?? 'unassigned')} · ${htmlEscape(item.status)}</p>
        </div>
        <span class="badge">${item.approved ? 'source approved' : htmlEscape(item.status)}</span>
      </header>
      <dl>
        <div><dt>cohesion</dt><dd>${htmlEscape(item.sourceCohesion ?? 'missing')}</dd></div>
        <div><dt>background</dt><dd>${htmlEscape(item.backgroundKey ?? 'missing')}</dd></div>
        <div><dt>source bytes</dt><dd>${item.sourceBytes}</dd></div>
        <div><dt>reviewed by</dt><dd>${htmlEscape(item.review?.reviewedBy ?? 'none')}</dd></div>
      </dl>
      <p class="verb">${htmlEscape(item.gameplayVerb ?? '')}</p>
      ${item.researchBriefId ? `<p class="verb">Research brief: <code>${htmlEscape(item.researchBriefId)}</code></p>` : ''}
      ${sourceBlock}
      ${keyPreviewBlock}
      <section><h3>Required First Read</h3><ul>${requiredRows}</ul></section>
      <section><h3>Brief</h3><ul>${briefRows}</ul></section>
      ${partRows ? `<section><h3>Articulatable Parts</h3><ul>${partRows}</ul></section>` : ''}
      ${riskRows ? `<section><h3>Prompt Risks</h3><ul>${riskRows}</ul></section>` : ''}
      ${rejectedRows ? `<section class="rejections"><h3>Rejected Generation Attempts</h3><p class="verb">missing artifact: ${item.rejectionStats.missingArtifact}; visual rejection: ${item.rejectionStats.visualRejection}; unclassified: ${item.rejectionStats.unclassified}</p><ul>${rejectedRows}</ul></section>` : ''}
      ${missingArtifactHelp}
      <section><h3>Source Visual Checks</h3><ul>${checkRows}</ul></section>
      <section><h3>Required Approval Flags</h3><ul>${flagRows}</ul></section>
      <section class="commands"><h3>Commands</h3><pre><code>${htmlEscape(item.acceptCommand)}
${htmlEscape(item.rejectCommand)}</code></pre><p>Add each visual-check flag only after inspecting that exact source-art property.</p></section>
      ${item.prompt ? `<section class="prompt"><h3>Prompt Seed</h3><pre><code>${htmlEscape(item.prompt)}</code></pre></section>` : ''}
      ${item.notes ? `<section><h3>Notes</h3><p>${htmlEscape(item.notes)}</p></section>` : ''}
    </article>`;
}).join('\n');

const allRejectionStats = rejectionStats(rejectedAttempts);
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Candidates</title>
  <style>
    :root { color-scheme: dark; --bg:#061015; --panel:#0b1b22; --line:#254452; --text:#d8f2ef; --muted:#8bb0b6; --accent:#78d5d1; --warn:#e2bd68; --bad:#db6a83; --good:#7ee29c; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; }
    main { max-width:1320px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 6px; font-size:28px; }
    .summary { color:var(--muted); margin:0 0 22px; }
    .candidate { border-top:1px solid var(--line); padding:22px 0 34px; }
    header { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:14px; }
    h2 { margin:0; font-size:22px; }
    header p { margin:2px 0 0; color:var(--muted); }
    .badge { color:var(--warn); border:1px solid var(--line); border-radius:999px; padding:4px 10px; }
    .approved .badge, .rigged .badge { color:var(--good); }
    dl { display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:10px; margin:0 0 16px; }
    dt { color:var(--muted); font-size:12px; text-transform:uppercase; }
    dd { margin:0; }
    section { margin:16px 0; }
    h3 { margin:0 0 8px; font-size:15px; color:var(--accent); }
    ul { margin:0; padding-left:18px; }
    li { margin:4px 0; }
    .pending span, .recorded span { display:inline-block; width:72px; color:var(--muted); }
    .recorded span { color:var(--good); }
    .image-block img { max-width:100%; max-height:420px; object-fit:contain; background:#160018; border:1px solid var(--line); }
    .missing-source { border:1px dashed var(--line); padding:14px; color:var(--muted); }
    .rejections { border-left:3px solid var(--bad); padding-left:12px; }
    .rejections p { margin:4px 0 0; color:var(--muted); }
    .rejections li.missing-artifact strong { color:var(--warn); }
    .marker { font-size:12px; }
    .artifact-help { border:1px solid var(--line); background:#071920; padding:12px; }
    pre { overflow:auto; background:#031014; border:1px solid var(--line); padding:12px; }
    code { color:#bfe9e4; }
    .verb { color:var(--muted); max-width:880px; }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Source Candidates</h1>
    <p class="summary">${reviewItems.filter((item) => item.approved).length}/${reviewItems.length} whole-source candidates approved before rigging. ${rejectedAttempts.length} rejected generation attempts logged: ${allRejectionStats.missingArtifact} missing artifact, ${allRejectionStats.visualRejection} visual rejection, ${allRejectionStats.unclassified} unclassified. Generated from <code>${htmlEscape(manifestPath)}</code>.</p>
    ${rows || '<p>No source candidates queued yet.</p>'}
  </main>
</body>
</html>`;

await writeFile(indexPath, html);
console.log(JSON.stringify({ outDir, candidates: reviewItems.length, approved: reviewItems.filter((item) => item.approved).length, thumbnails, rejectedAttempts: rejectedAttempts.length }, null, 2));

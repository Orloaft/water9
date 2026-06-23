import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { basename, resolve } from 'node:path';
import { MIN_VISUAL_NOTE_LENGTH, distinctReviewNotes, meaningfulReviewText, reviewNoteHasEvidenceTerms } from './review_text_quality.mjs';
import { rigAcceptedStrict } from './content_quality_predicates.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  if (args.has(key)) {
    const existing = args.get(key);
    args.set(key, Array.isArray(existing) ? [...existing, value] : [existing, value]);
  } else {
    args.set(key, value);
  }
}

function valuesFor(key) {
  const value = args.get(key);
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function shellSingleQuote(value) {
  return `'${String(value).replaceAll(`'`, `'\''`)}'`;
}

function publicUrlFromSource(source) {
  if (!source) return null;
  if (source.startsWith('public/')) return `/${source.slice('public/'.length)}`;
  if (source.startsWith('/')) return source;
  return null;
}

const MANUAL_VISUAL_CHECKLIST = [
  { id: 'single-source-cohesion', label: 'Single-source cohesion', detail: 'The whole source reads as one designed creature, not a collage of parts.' },
  { id: 'readable-silhouette', label: 'Readable silhouette', detail: 'The creature remains identifiable at sandbox/game scale.' },
  { id: 'anatomy-cohesion', label: 'Anatomy cohesion', detail: 'Head, body, limbs, fins, and tail keep believable orientation and proportion.' },
  { id: 'production-visual-cohesion', label: 'Production visual cohesion', detail: 'The assembled creature looks like production-intent art, not a placeholder or proof-of-concept rig.' },
  { id: 'socket-seams', label: 'Socket seams', detail: 'Joints, socket overlays, and damaged states do not show broken seams.' },
  { id: 'motion-stability', label: 'Motion stability', detail: 'The phase strip avoids jitter, frame popping, and disconnected part motion.' },
  { id: 'sandbox-behavior', label: 'Sandbox behavior', detail: 'The browser sandbox feels alive and non-placeholder in idle, lunge, and stun poses.' },
];
const MIN_VISUAL_SCORE = 4;
const VISUAL_SCORE_RUBRIC = [
  { score: 5, label: 'Strong', detail: 'Cohesive enough to ship without visual follow-up.' },
  { score: 4, label: 'Accepted', detail: 'Cohesive enough to count toward the 20-threat goal, with only minor polish risk.' },
  { score: 3, label: 'Prototype', detail: 'Useful technical pass, but visual cohesion is not good enough to count.' },
  { score: 2, label: 'Weak', detail: 'Major anatomy, silhouette, seam, or motion issues.' },
  { score: 1, label: 'Reject', detail: 'Placeholder, collage-like, unreadable, or misleading as production art.' },
];

const REVIEW_EVIDENCE_CHECKLIST = [
  { id: 'whole-source', flag: 'source-reviewed', label: 'Whole source inspected', detail: 'The magenta-background source reads as one cohesive creature before cutting.' },
  { id: 'contact-sheet', flag: 'contact-reviewed', label: 'Contact sheet inspected', detail: 'Static poses preserve the original silhouette and believable anatomy.' },
  { id: 'phase-strip', flag: 'phase-reviewed', label: 'Phase strip inspected', detail: 'Looped motion avoids jitter, popping, and disconnected part drift.' },
  { id: 'source-parity', flag: 'parity-reviewed', label: 'Source parity inspected', detail: 'The source-parity overlay confirms extracted parts still read as the approved whole-source creature.' },
  { id: 'sandbox-preview', flag: 'sandbox-reviewed', label: 'Sandbox inspected', detail: 'The browser preview works in idle, lunge, and stunned states at game scale.' },
];
const RIG_VISUAL_NOTE_TERMS = {
  'single-source-cohesion': ['source', 'cohesion', 'parity', 'whole', 'same creature'],
  'readable-silhouette': ['silhouette', 'outline', 'scale', 'readable', 'shape'],
  'anatomy-cohesion': ['anatomy', 'orientation', 'part', 'jaw', 'body', 'tail', 'limb'],
  'production-visual-cohesion': ['production', 'placeholder', 'palette', 'lighting', 'material', 'cohesion'],
  'socket-seams': ['socket', 'seam', 'joint', 'overlay', 'connection'],
  'motion-stability': ['phase', 'motion', 'jitter', 'popping', 'frame', 'animation'],
  'sandbox-behavior': ['sandbox', 'idle', 'lunge', 'stunned', 'diver', 'behavior', 'motion'],
};

function requiredAcceptanceFlags() {
  return [
    ...MANUAL_VISUAL_CHECKLIST.map((check) => `--visual-check ${check.id}`),
    ...MANUAL_VISUAL_CHECKLIST.map((check) => `--score ${check.id}=<4-5>`),
    ...MANUAL_VISUAL_CHECKLIST.map((check) => `--visual-note ${check.id}='<specific rationale>'`),
    ...REVIEW_EVIDENCE_CHECKLIST.map((check) => `--${check.flag}`),
  ];
}

async function optionalStat(path) {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

async function readJsonIfExists(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
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
  const info = await optionalStat(path);
  if (!info?.isFile()) return { path, exists: false };
  return { path, exists: true, size: info.size, mtimeMs: Math.round(info.mtimeMs) };
}

function textureNamesFor(creature) {
  const names = new Set();
  for (const part of creature.parts ?? []) {
    for (const key of ['texture', 'damagedTexture', 'detachedTexture']) {
      if (part[key]) names.add(part[key]);
    }
  }
  for (const overlay of creature.socketOverlays ?? []) {
    for (const key of ['texture', 'severedTexture']) {
      if (overlay[key]) names.add(overlay[key]);
    }
  }
  return [...names].sort();
}

async function creatureFingerprint(creature, sourceManifest) {
  const textureFiles = await Promise.all(textureNamesFor(creature).map((file) => fileFingerprint(resolve(generatedDir, file))));
  const sourceFile = sourceManifest?.source ? await fileFingerprint(resolve(sourceManifest.source)) : null;
  const sourceManifestFile = sourceManifest?._file ? await fileFingerprint(resolve(generatedDir, sourceManifest._file)) : null;
  const payload = {
    tool: 'water9-review-gallery@2',
    creature,
    sourceManifest,
    sourceFile,
    sourceManifestFile,
    textureFiles,
  };
  return createHash('sha256').update(stableJson(payload)).digest('hex');
}

async function outputFresh(inputPath, outputPath) {
  const input = await optionalStat(inputPath);
  const output = await optionalStat(outputPath);
  return Boolean(input?.isFile() && output?.isFile() && output.mtimeMs >= input.mtimeMs && output.size > 512);
}

async function ensureThumbnail(inputPath, outputPath, maxWidth, maxHeight) {
  if (incremental && await outputFresh(inputPath, outputPath)) return false;
  makeThumbnail(inputPath, outputPath, maxWidth, maxHeight);
  return true;
}

async function copyReviewAsset(inputPath, outputPath) {
  if (incremental && await outputFresh(inputPath, outputPath)) return false;
  await copyFile(inputPath, outputPath);
  return true;
}

async function existingFile(path) {
  try {
    const info = await stat(path);
    return info.isFile();
  } catch {
    return false;
  }
}

function makeThumbnail(inputPath, outputPath, maxWidth, maxHeight) {
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
    throw new Error(`failed to make review thumbnail for ${inputPath}`);
  }
}

async function loadSourceManifests(generatedDir) {
  const manifests = new Map();
  const files = await readdir(generatedDir);
  for (const file of files.filter((candidate) => candidate.endsWith('.articulated.json'))) {
    const path = resolve(generatedDir, file);
    const data = JSON.parse(await readFile(path, 'utf8'));
    if (data.runtimeCreatureId) manifests.set(data.runtimeCreatureId, { ...data, _file: file });
  }
  return manifests;
}

const manifestPath = resolve('public/assets/generated/articulated-creatures.parts.json');
const generatedDir = resolve('public/assets/generated');
const outDir = resolve(String(args.get('out-dir') ?? 'public/review/articulated'));
const thumbDir = resolve(outDir, 'thumbs');
const parityDir = resolve(outDir, 'source-parity');
const renderCachePath = resolve(outDir, 'render-cache.json');
const requestedIds = valuesFor('creature-id');
const skipRender = args.has('skip-render');
const incremental = args.has('incremental');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const sourceManifests = await loadSourceManifests(generatedDir);
const parityReportPath = resolve(String(args.get('source-parity-report') ?? 'tools/scratch/articulated-source-parity.json'));
const sourceParityReport = await readJsonIfExists(parityReportPath, { creatures: [] });
const sourceParityById = new Map((Array.isArray(sourceParityReport.creatures) ? sourceParityReport.creatures : [])
  .filter((entry) => entry?.id)
  .map((entry) => [entry.id, entry]));
const visualCohesionReportPath = resolve(String(args.get('visual-cohesion-report') ?? 'tools/scratch/articulated-visual-cohesion.json'));
const visualCohesionReport = await readJsonIfExists(visualCohesionReportPath, { creatures: [] });
const visualCohesionById = new Map((Array.isArray(visualCohesionReport.creatures) ? visualCohesionReport.creatures : [])
  .filter((entry) => entry?.id)
  .map((entry) => [entry.id, entry]));
let creatures = manifest.creatures ?? [];
if (requestedIds.length) {
  const wanted = new Set(requestedIds);
  creatures = creatures.filter((creature) => wanted.has(creature.id));
  const found = new Set(creatures.map((creature) => creature.id));
  const missing = [...wanted].filter((id) => !found.has(id));
  if (missing.length) throw new Error(`unknown creature id(s): ${missing.join(', ')}`);
}
if (!creatures.length) throw new Error('no articulated creatures to review');
await mkdir(outDir, { recursive: true });
await mkdir(thumbDir, { recursive: true });
await mkdir(parityDir, { recursive: true });

const renderCache = await readJsonIfExists(renderCachePath, { schema: 'water9/articulated-render-cache@1', creatures: {} });
const nextRenderCache = { schema: 'water9/articulated-render-cache@1', creatures: {} };
const renderStats = { rendered: 0, skipped: 0, thumbnails: 0, parityImages: 0 };

for (const creature of creatures) {
  const sourceManifest = sourceManifests.get(creature.id);
  const contact = resolve(outDir, `${creature.id}-contact.png`);
  const phase = resolve(outDir, `${creature.id}-phase.png`);
  const fingerprint = await creatureFingerprint(creature, sourceManifest);
  const cached = renderCache.creatures?.[creature.id];
  const hasOutputs = Boolean((await optionalStat(contact))?.isFile() && (await optionalStat(phase))?.isFile());
  const canSkip = incremental && cached?.fingerprint === fingerprint && hasOutputs;
  if (!skipRender && !canSkip) {
    const result = spawnSync(
      'python3',
      [
        'tools/render_articulated_contact_sheet.py',
        '--creature-id', creature.id,
        '--out', contact,
        '--phase-strip-out', phase,
      ],
      { encoding: 'utf8', stdio: 'pipe' },
    );
    if (result.status !== 0) {
      process.stderr.write(result.stdout ?? '');
      process.stderr.write(result.stderr ?? '');
      throw new Error(`failed to render review sheet for ${creature.id}`);
    }
    renderStats.rendered += 1;
  } else if (canSkip) {
    renderStats.skipped += 1;
  }
  nextRenderCache.creatures[creature.id] = {
    fingerprint,
    contactFile: `${creature.id}-contact.png`,
    phaseFile: `${creature.id}-phase.png`,
    updatedAt: new Date().toISOString(),
  };
}

const reviewItems = [];
for (const creature of creatures) {
  const quality = creature.quality ?? {};
  const sourceManifest = sourceManifests.get(creature.id);
  const inputFingerprint = await creatureFingerprint(creature, sourceManifest);
  const sourceUrl = publicUrlFromSource(sourceManifest?.source);
  const sourcePath = sourceManifest?.source ? resolve(sourceManifest.source) : null;
  const contactFile = `${creature.id}-contact.png`;
  const phaseFile = `${creature.id}-phase.png`;
  const contactPath = resolve(outDir, contactFile);
  const phasePath = resolve(outDir, phaseFile);
  const planPreviewFile = await existingFile(resolve(outDir, `${creature.id}-plan-preview.png`)) ? `${creature.id}-plan-preview.png` : null;
  const planPreviewThumbFile = planPreviewFile ? `thumbs/${creature.id}-plan-preview-thumb.png` : null;
  const sourceThumbFile = sourcePath && await existingFile(sourcePath) ? `thumbs/${creature.id}-source-thumb.png` : null;
  const contactThumbFile = `thumbs/${creature.id}-contact-thumb.png`;
  const phaseThumbFile = `thumbs/${creature.id}-phase-thumb.png`;
  if (planPreviewFile && planPreviewThumbFile && await ensureThumbnail(resolve(outDir, planPreviewFile), resolve(outDir, planPreviewThumbFile), 1200, 720)) renderStats.thumbnails += 1;
  if (sourceThumbFile && await ensureThumbnail(sourcePath, resolve(outDir, sourceThumbFile), 720, 360)) renderStats.thumbnails += 1;
  if (await ensureThumbnail(contactPath, resolve(outDir, contactThumbFile), 1200, 320)) renderStats.thumbnails += 1;
  if (await ensureThumbnail(phasePath, resolve(outDir, phaseThumbFile), 1200, 220)) renderStats.thumbnails += 1;
  const sourceParity = sourceParityById.get(creature.id) ?? null;
  const autoVisualCohesion = visualCohesionById.get(creature.id) ?? null;
  const parityDebugSource = sourceParity?.debugImage ? resolve(sourceParity.debugImage) : null;
  const parityDebugFile = parityDebugSource && await existingFile(parityDebugSource) ? `source-parity/${creature.id}-source-parity.png` : null;
  const parityDebugPath = parityDebugFile ? resolve(outDir, parityDebugFile) : null;
  if (parityDebugSource && parityDebugPath && await copyReviewAsset(parityDebugSource, parityDebugPath)) renderStats.parityImages += 1;
  const parityThumbFile = parityDebugPath && await existingFile(parityDebugPath) ? `thumbs/${creature.id}-source-parity-thumb.png` : null;
  if (parityThumbFile && await ensureThumbnail(parityDebugPath, resolve(outDir, parityThumbFile), 720, 720)) renderStats.thumbnails += 1;
  const contactInfo = await stat(contactPath);
  const phaseInfo = await stat(phasePath);
  const sourceThumbInfo = sourceThumbFile ? await stat(resolve(outDir, sourceThumbFile)) : null;
  const planPreviewInfo = planPreviewFile ? await stat(resolve(outDir, planPreviewFile)) : null;
  const planPreviewThumbInfo = planPreviewThumbFile ? await stat(resolve(outDir, planPreviewThumbFile)) : null;
  const contactThumbInfo = await stat(resolve(outDir, contactThumbFile));
  const phaseThumbInfo = await stat(resolve(outDir, phaseThumbFile));
  const requiredFlags = requiredAcceptanceFlags();
  const acceptCommand = `npm run content:accept -- --id ${creature.id} --status accepted --reviewed-by <human-reviewer> --source-candidate <approved-source-candidate-id> --note ${shellSingleQuote('Specific approval note after inspecting source, contact sheet, phase strip, source parity, sandbox, and source-candidate provenance.')}`;
  const dryRunCommand = `${acceptCommand} --dry-run`;
  reviewItems.push({
    id: creature.id,
    species: creature.species,
    minBiome: creature.minBiome,
    rarity: creature.rarity,
    spawn: creature.spawn,
    parts: creature.parts?.length ?? 0,
    sockets: creature.socketOverlays?.length ?? 0,
    quality,
    manualVisualChecklist: MANUAL_VISUAL_CHECKLIST,
    visualScoreRubric: VISUAL_SCORE_RUBRIC,
    reviewEvidenceChecklist: REVIEW_EVIDENCE_CHECKLIST,
    requiredAcceptanceFlags: requiredFlags,
    sourceParity,
    autoVisualCohesion,
    sourceParityDebugFile: parityDebugFile,
    sourceParityThumbFile: parityThumbFile,
    sourceManifest: sourceManifest?._file ?? null,
    source: sourceManifest?.source ?? null,
    sourceUrl,
    sourceThumbFile,
    planPreviewFile,
    planPreviewThumbFile,
    sandboxUrl: `/?sandbox=${encodeURIComponent(creature.id)}`,
    contactFile,
    contactThumbFile,
    phaseFile,
    phaseThumbFile,
    contactBytes: contactInfo.size,
    phaseBytes: phaseInfo.size,
    sourceThumbBytes: sourceThumbInfo?.size ?? 0,
    inputFingerprint,
    planPreviewBytes: planPreviewInfo?.size ?? 0,
    planPreviewThumbBytes: planPreviewThumbInfo?.size ?? 0,
    contactThumbBytes: contactThumbInfo.size,
    phaseThumbBytes: phaseThumbInfo.size,
    acceptCommand,
    dryRunCommand,
  });
}

await writeFile(resolve(outDir, 'review-manifest.json'), JSON.stringify({
  schema: 'water9/articulated-review@1',
  generatedFrom: basename(manifestPath),
  incremental,
  renderStats,
  creatureCount: reviewItems.length,
  acceptedCount: reviewItems.filter(reviewItemAccepted).length,
  creatures: reviewItems,
}, null, 2) + '\n');
await writeFile(renderCachePath, JSON.stringify(nextRenderCache, null, 2) + '\n');

function reviewItemAccepted(item) {
  return rigAcceptedStrict({ quality: item?.quality })
    && item.autoVisualCohesion?.status === 'pass'
    && (item.autoVisualCohesion?.failures ?? []).length === 0;
}

const rows = reviewItems.map((item) => {
  const quality = item.quality ?? {};
  const accepted = reviewItemAccepted(item);
  const badgeClass = accepted ? 'accepted' : quality.sourceCohesion === 'legacy-composite' ? 'legacy' : 'prototype';
  const visualChecklistRows = (item.manualVisualChecklist ?? []).map((check) => {
    const recorded = quality.visualChecklist?.[check.id] === true;
    const score = quality.visualScores?.[check.id] ?? null;
    const scoreOk = Number.isFinite(score) && score >= MIN_VISUAL_SCORE && score <= 5;
    const visualNote = String(quality.visualNotes?.[check.id] ?? '').trim();
    const noteOk = meaningfulReviewText(visualNote, MIN_VISUAL_NOTE_LENGTH);
    return `<li class="${recorded && scoreOk && noteOk ? 'recorded' : 'pending'}"><span>${recorded && scoreOk && noteOk ? `score ${score}` : 'review'}</span><strong>${htmlEscape(check.label)}</strong><p>${htmlEscape(check.detail)}</p>${visualNote ? `<p class="review-note">${htmlEscape(visualNote)}</p>` : '<p class="review-note missing">Needs a specific visual-note rationale.</p>'}</li>`;
  }).join('');
  const evidenceRows = (item.reviewEvidenceChecklist ?? []).map((check) => {
    const recorded = quality.reviewEvidence?.[check.id] === true;
    return `<li class="${recorded ? 'recorded' : 'pending'}"><span>${recorded ? 'recorded' : 'review'}</span><strong>${htmlEscape(check.label)}</strong><p>${htmlEscape(check.detail)}</p></li>`;
  }).join('');
  const requiredFlagRows = (item.requiredAcceptanceFlags ?? []).map((flag) => `<li><code>${htmlEscape(flag)}</code></li>`).join('');
  const scoreRows = (item.visualScoreRubric ?? []).map((row) => `<li><strong>${row.score} - ${htmlEscape(row.label)}</strong><p>${htmlEscape(row.detail)}</p></li>`).join('');
  const parity = item.sourceParity;
  const parityMetrics = parity?.metrics ?? null;
  const parityFailures = parity?.failures ?? [];
  const sourceParityBlock = parity ? `<section class="source-parity ${parityFailures.length ? 'parity-fail' : 'parity-pass'}"><h3>Source Parity</h3><dl><div><dt>IoU</dt><dd>${htmlEscape(parityMetrics?.iou ?? 'n/a')}</dd></div><div><dt>outside</dt><dd>${htmlEscape(parityMetrics?.outside ?? 'n/a')}</dd></div><div><dt>missing</dt><dd>${htmlEscape(parityMetrics?.missing ?? 'n/a')}</dd></div><div><dt>aspect drift</dt><dd>${htmlEscape(parityMetrics?.aspectDrift ?? 'n/a')}</dd></div><div><dt>centroid drift</dt><dd>${htmlEscape(parityMetrics?.centroidDrift ?? 'n/a')}</dd></div></dl>${parityFailures.length ? `<ul class="parity-failures">${parityFailures.map((failure) => `<li>${htmlEscape(failure)}</li>`).join('')}</ul>` : '<p class="parity-ok">Automated alpha parity passed. This is necessary evidence, not visual acceptance.</p>'}${item.sourceParityDebugFile ? `<a href="./${htmlEscape(item.sourceParityDebugFile)}"><img src="./${htmlEscape(item.sourceParityThumbFile ?? item.sourceParityDebugFile)}" alt="${htmlEscape(item.species)} source parity overlay"></a><p class="parity-legend">White is overlap, red is assembled-only, teal is source-only.</p>` : ''}</section>` : '<section class="source-parity parity-fail"><h3>Source Parity</h3><p>Missing source-parity report. Run <code>npm run articulated:source-parity</code> before visual review.</p></section>';
  const autoCohesion = item.autoVisualCohesion;
  const autoCohesionFailures = autoCohesion?.failures ?? [];
  const autoCohesionWarnings = autoCohesion?.warnings ?? [];
  const autoCohesionMetrics = autoCohesion?.metrics?.palette ?? null;
  const autoCohesionBlock = autoCohesion ? `<section class="auto-cohesion ${autoCohesionFailures.length ? 'cohesion-fail' : 'cohesion-pass'}"><h3>Automated Visual Cohesion</h3><dl><div><dt>status</dt><dd>${htmlEscape(autoCohesion.status ?? 'missing')}</dd></div><div><dt>parts checked</dt><dd>${htmlEscape(autoCohesion.partsChecked ?? 0)}</dd></div><div><dt>palette median</dt><dd>${htmlEscape(autoCohesionMetrics?.medianDistance ?? 'n/a')}</dd></div><div><dt>palette max</dt><dd>${htmlEscape(autoCohesionMetrics?.maxDistance ?? 'n/a')}</dd></div></dl>${autoCohesionFailures.length ? `<ul class="cohesion-failures">${autoCohesionFailures.map((failure) => `<li>${htmlEscape(failure)}</li>`).join('')}</ul>` : '<p class="parity-ok">No hard matte, padding, blank-part, or sparse-alpha failures. Human review is still required for actual art direction.</p>'}${autoCohesionWarnings.length ? `<ul class="cohesion-warnings">${autoCohesionWarnings.map((warning) => `<li>${htmlEscape(warning)}</li>`).join('')}</ul>` : ''}</section>` : '<section class="auto-cohesion cohesion-fail"><h3>Automated Visual Cohesion</h3><p>Missing cohesion report. Run <code>npm run articulated:visual-cohesion</code> before visual review.</p></section>';
  const planPreviewBlock = item.planPreviewFile
    ? `<section class="image-block plan-preview-block"><h3>Articulation Plan Preview</h3><a href="./${htmlEscape(item.planPreviewFile)}"><img src="./${htmlEscape(item.planPreviewThumbFile ?? item.planPreviewFile)}" alt="${htmlEscape(item.species)} articulation crop and anchor preview"></a><p class="parity-legend">Plan preview shows source crops, socket crops, anchor points, and parent/child links before extraction.</p></section>`
    : '';
  return `
    <article class="creature ${badgeClass}" id="${htmlEscape(item.id)}">
      <header>
        <div>
          <h2>${htmlEscape(item.species)}</h2>
          <p>${htmlEscape(item.id)} · biome ${htmlEscape(item.minBiome)} · ${htmlEscape(item.rarity)}</p>
        </div>
        <span class="badge">${htmlEscape(quality.status ?? 'unknown')}</span>
      </header>
      <dl>
        <div><dt>cohesion</dt><dd>${htmlEscape(quality.sourceCohesion ?? 'missing')}</dd></div>
        <div><dt>background</dt><dd>${htmlEscape(quality.backgroundKey ?? 'missing')}</dd></div>
        <div><dt>parts</dt><dd>${item.parts}</dd></div>
        <div><dt>sockets</dt><dd>${item.sockets}</dd></div>
        <div><dt>reviewed by</dt><dd>${htmlEscape(quality.reviewedBy ?? 'none')}</dd></div>
      </dl>
      <nav>
        <a href="${htmlEscape(item.sandboxUrl)}">Open sandbox</a>
        ${item.sourceUrl ? `<a href="${htmlEscape(item.sourceUrl)}">Whole source</a>` : ''}
        <a href="./review-manifest.json">Review JSON</a>
      </nav>
      <section class="commands">
        <h3>Acceptance Command</h3>
        <pre><code>${htmlEscape(item.dryRunCommand)}</code></pre>
        <p>This command intentionally omits approval flags. Add the required flags below one by one only after the source, contact sheet, phase strip, and sandbox have actually been inspected.</p>
      </section>
      <section class="visual-checklist">
        <h3>Manual Visual Checks</h3>
        <ul>${visualChecklistRows}</ul>
      </section>
      <section class="score-rubric">
        <h3>Visual Score Rubric</h3>
        <p>Accepted content requires every visual check to score ${MIN_VISUAL_SCORE} or 5 and include a specific visual-note rationale. A score of 3 means technical prototype only.</p>
        <ul>${scoreRows}</ul>
      </section>
      <section class="review-evidence">
        <h3>Review Evidence</h3>
        <ul>${evidenceRows}</ul>
      </section>
      <section class="acceptance-flags">
        <h3>Required Acceptance Flags</h3>
        <ul>${requiredFlagRows}</ul>
      </section>
      ${item.sourceUrl ? `<section class="image-block source-block"><h3>Whole Source</h3><a href="${htmlEscape(item.sourceUrl)}"><img src="./${htmlEscape(item.sourceThumbFile ?? item.sourceUrl)}" alt="${htmlEscape(item.species)} whole source thumbnail"></a></section>` : ''}
      ${planPreviewBlock}
      ${autoCohesionBlock}
      ${sourceParityBlock}
      <section class="image-block">
        <h3>Contact Sheet</h3>
        <a href="./${htmlEscape(item.contactFile)}"><img src="./${htmlEscape(item.contactThumbFile ?? item.contactFile)}" alt="${htmlEscape(item.species)} contact sheet thumbnail"></a>
      </section>
      <section class="image-block">
        <h3>Phase Strip</h3>
        <a href="./${htmlEscape(item.phaseFile)}"><img src="./${htmlEscape(item.phaseThumbFile ?? item.phaseFile)}" alt="${htmlEscape(item.species)} phase strip thumbnail"></a>
      </section>
    </article>`;
}).join('\n');

const acceptedCount = reviewItems.filter(reviewItemAccepted).length;
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Articulated Review</title>
  <style>
    :root { color-scheme: dark; --bg:#061015; --panel:#0b1b22; --line:#254452; --text:#d8f2ef; --muted:#8bb0b6; --accent:#78d5d1; --warn:#e2bd68; --bad:#db6a83; --good:#7ee29c; }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; }
    main { max-width:1440px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 6px; font-size:28px; letter-spacing:0; }
    .summary { margin:0 0 22px; color:var(--muted); }
    .creature { border-top:1px solid var(--line); padding:22px 0 34px; }
    header { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:14px; }
    h2 { margin:0; font-size:22px; }
    header p { margin:2px 0 0; color:var(--muted); }
    .badge { border:1px solid var(--line); border-radius:999px; padding:5px 10px; color:var(--accent); text-transform:uppercase; font-size:12px; letter-spacing:.08em; }
    .accepted .badge { color:var(--good); }
    .legacy .badge { color:var(--bad); }
    dl { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:8px; margin:0 0 14px; }
    dl div { background:var(--panel); border:1px solid rgba(120,213,209,.12); padding:9px 10px; }
    dt { color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.08em; }
    dd { margin:2px 0 0; }
    nav { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:16px; }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    .image-block { margin-top:16px; }
    h3 { margin:0 0 8px; color:var(--muted); font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:.08em; }
    img { display:block; width:100%; height:auto; border:1px solid var(--line); background:#020609; image-rendering:auto; }
    .source-block img { max-height:420px; object-fit:contain; }
    .commands { margin:12px 0 18px; }
    .visual-checklist, .score-rubric, .review-evidence, .acceptance-flags, .source-parity, .auto-cohesion { margin:12px 0 18px; }
    .visual-checklist ul, .score-rubric ul, .review-evidence ul { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:8px; padding:0; margin:0; list-style:none; }
    .visual-checklist li, .score-rubric li, .review-evidence li { border:1px solid rgba(120,213,209,.14); background:var(--panel); padding:10px; }
    .visual-checklist li span, .review-evidence li span { display:inline-block; margin:0 8px 6px 0; color:var(--warn); font-size:11px; text-transform:uppercase; letter-spacing:.08em; }
    .visual-checklist li.recorded span, .review-evidence li.recorded span { color:var(--good); }
    .visual-checklist strong, .score-rubric strong, .review-evidence strong { display:inline; }
    .visual-checklist p, .score-rubric p, .review-evidence p { margin:2px 0 0; color:var(--muted); }
    .acceptance-flags ul { display:flex; flex-wrap:wrap; gap:8px; padding:0; margin:0; list-style:none; }
    .acceptance-flags li { border:1px solid rgba(120,213,209,.14); background:#020609; padding:6px 8px; }
    .source-parity { border:1px solid rgba(120,213,209,.14); background:rgba(11,27,34,.64); padding:12px; }
    .auto-cohesion { border:1px solid rgba(120,213,209,.14); background:rgba(11,27,34,.64); padding:12px; }
    .source-parity dl, .auto-cohesion dl { margin-bottom:10px; }
    .source-parity img { margin-top:10px; }
    .parity-ok, .parity-legend { margin:6px 0 0; color:var(--muted); }
    .parity-fail { border-color:rgba(219,106,131,.44); }
    .cohesion-fail { border-color:rgba(219,106,131,.44); }
    .parity-failures, .cohesion-failures { margin:6px 0 0; color:var(--bad); }
    .cohesion-warnings { margin:6px 0 0; color:var(--warn); }
    pre { overflow:auto; margin:8px 0 6px; padding:10px; background:#020609; border:1px solid var(--line); color:var(--text); }
    .commands p { margin:0; color:var(--muted); }
    code { color:var(--accent); }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Articulated Review</h1>
    <p class="summary">${acceptedCount}/${reviewItems.length} shown creatures accepted. Generated from <code>${htmlEscape(basename(manifestPath))}</code>. Rendered ${renderStats.rendered}, skipped ${renderStats.skipped}, thumbnails refreshed ${renderStats.thumbnails}.</p>
    ${rows}
  </main>
</body>
</html>
`;
await writeFile(resolve(outDir, 'index.html'), html);
console.log(JSON.stringify({ outDir, creatures: reviewItems.map((item) => item.id), acceptedCount, incremental, renderStats }, null, 2));

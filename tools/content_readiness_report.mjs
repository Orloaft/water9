import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { MIN_VISUAL_NOTE_LENGTH, distinctReviewNotes, meaningfulReviewText, reviewNoteHasEvidenceTerms } from './review_text_quality.mjs';
import {
  rigAcceptedStrict,
  sourceApprovedStrict,
  sourceImageValidationRecorded as strictSourceImageValidationRecorded,
} from './content_quality_predicates.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const minThreats = Number(args.get('min-threats') ?? 20);
const jsonOut = resolve(String(args.get('json-out') ?? 'public/review/content-readiness.json'));
const markdownOut = resolve(String(args.get('out') ?? 'public/review/content-readiness.md'));
const htmlOut = resolve(String(args.get('html-out') ?? 'public/review/content-readiness.html'));
const generatedDir = resolve('public/assets/generated');
const paths = {
  sourceCandidates: resolve('public/review/source-candidates/source-candidates.json'),
  sourceReview: resolve('public/review/source-candidates/review-manifest.json'),
  sourceRejections: resolve('public/review/source-candidates/rejected-attempts.json'),
  sourceGenerationQueue: resolve('public/review/source-candidates/source-generation-queue.json'),
  sourceApprovalRunway: resolve('public/review/source-approval-runway.json'),
  sourceCriticRegeneration: resolve('public/review/source-candidates/source-critic-regeneration-queue.json'),
  articulatedRuntime: resolve('public/assets/generated/articulated-creatures.parts.json'),
  articulatedReview: resolve('public/review/articulated/review-manifest.json'),
  sandboxIndex: resolve('public/review/sandbox/manifest.json'),
  sandboxReport: resolve('tools/scratch/sandbox-visuals-report.json'),
  sandboxReportDir: resolve('tools/scratch'),
};

const DISALLOWED_REVIEWERS = new Set(['codex', 'assistant', 'ai', 'agent', 'automation', 'bot', 'model']);
const MIN_ARTICULATED_VISUAL_SCORE = 4;
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
const MIN_SOURCE_VISUAL_SCORE = 4;
const REQUIRED_ARTICULATED_VISUAL_CHECKS = [
  'single-source-cohesion',
  'readable-silhouette',
  'anatomy-cohesion',
  'production-visual-cohesion',
  'socket-seams',
  'motion-stability',
  'sandbox-behavior',
];
const REQUIRED_ARTICULATED_EVIDENCE = [
  'whole-source',
  'contact-sheet',
  'phase-strip',
  'source-parity',
  'sandbox-preview',
];
const SOURCE_VISUAL_NOTE_TERMS = {
  'whole-creature-cohesion': ['whole', 'source', 'organism', 'creature', 'cohesion', 'single'],
  'part-continuity-cohesion': ['part', 'continuity', 'joint', 'anatomy', 'proportion', 'lighting'],
  'readable-silhouette': ['silhouette', 'outline', 'readable', 'scale', 'shape'],
  'no-collage-artifacts': ['collage', 'artifact', 'lighting', 'material', 'palette', 'stitched'],
  'non-placeholder-art-direction': ['production', 'placeholder', 'art direction', 'design', 'finished'],
  'crop-safe-anatomy': ['crop', 'margin', 'joint', 'appendage', 'pivot', 'anatomy'],
  'clean-magenta-key': ['magenta', 'key', 'background', 'border', 'pink'],
  'gameplay-read': ['gameplay', 'danger', 'verb', 'attack', 'hazard', 'read'],
  'neutral-riggable-pose': ['neutral', 'pose', 'riggable', 'pivot', 'attack frame'],
  'visible-attack-lane': ['attack', 'lane', 'direction', 'mouth', 'spine', 'strike'],
};
const RIG_VISUAL_NOTE_TERMS = {
  'single-source-cohesion': ['source', 'cohesion', 'parity', 'whole', 'same creature'],
  'readable-silhouette': ['silhouette', 'outline', 'scale', 'readable', 'shape'],
  'anatomy-cohesion': ['anatomy', 'orientation', 'part', 'jaw', 'body', 'tail', 'limb'],
  'production-visual-cohesion': ['production', 'placeholder', 'palette', 'lighting', 'material', 'cohesion'],
  'socket-seams': ['socket', 'seam', 'joint', 'overlay', 'connection'],
  'motion-stability': ['phase', 'motion', 'jitter', 'popping', 'frame', 'animation'],
  'sandbox-behavior': ['sandbox', 'idle', 'lunge', 'stunned', 'diver', 'behavior', 'motion'],
};
const REQUIRED_SANDBOX_STATES = ['idle', 'lunge', 'stunned'];
const QUALITY_CONTRACT = [
  'whole-source art must be one cohesive creature design, not a collage or placeholder assembly',
  'source image must use a clean magenta background suitable for extraction',
  'silhouette must communicate the gameplay verb before animation is considered',
  'extracted parts must preserve anatomy and socket seams without visible matte artifacts',
  'sandbox evidence must show idle, lunge, and stunned states with stable motion and no frame jitter',
  'acceptance requires human review; automation and Codex cannot approve final threat quality',
];
const CLEAR_VERB_WORDS = [
  'dash',
  'strike',
  'striker',
  'bite',
  'inhale',
  'suction',
  'clamp',
  'lunge',
  'trap',
  'ambusher',
  'sentinel',
  'lane',
  'tripwire',
  'snare',
  'grappler',
  'pinning',
];
const SIMPLE_SILHOUETTE_WORDS = [
  'eel',
  'viperfish',
  'gulper',
  'isopod',
  'mantis',
  'sponge',
  'anemone',
  'tunicate',
  'moray',
  'squid',
];
const COMPLEXITY_RISK_WORDS = ['colony', 'siphonophore', 'coral', 'fan', 'gate', 'mycelium', 'chain', 'curtain'];
const CURATED_SOURCE_PRIORITY = new Map([
  ['glass-sponge-sentinel', 'curated priority: sessile lane-control read and previous generated attempts lacked only a saved artifact'],
  ['saber-viperfish', 'curated priority: simple dash-striker silhouette with clear jaw/body/tail articulation'],
  ['gulper-eel-maw', 'curated priority: strong mouth-pouch silhouette and inhale gameplay read'],
]);

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    return { ...fallback, _error: error.message };
  }
}

async function fileOk(path, minSize = 128) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size >= minSize;
  } catch {
    return false;
  }
}

async function findSandboxReportPaths() {
  const pathsByName = new Map([[paths.sandboxReport, paths.sandboxReport]]);
  let entries = [];
  try {
    entries = await readdir(paths.sandboxReportDir, { withFileTypes: true });
  } catch {
    return [...pathsByName.values()];
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!/^sandbox.*report.*\.json$/.test(entry.name) && !/^sandbox-visuals.*report.*\.json$/.test(entry.name)) continue;
    const path = resolve(paths.sandboxReportDir, entry.name);
    pathsByName.set(path, path);
  }
  return [...pathsByName.values()].sort();
}

async function loadSandboxReports() {
  const reports = [];
  for (const path of await findSandboxReportPaths()) {
    const report = await readJson(path, { schema: null, results: [] });
    if (report.schema !== 'water9/sandbox-visual-check@1') continue;
    const info = await stat(path).catch(() => null);
    reports.push({ path, report, mtimeMs: info?.mtimeMs ?? 0 });
  }
  return reports;
}

async function fileFingerprint(path) {
  try {
    const info = await stat(path);
    if (!info.isFile()) return { path, exists: false };
    return { path, exists: true, size: info.size, mtimeMs: Math.round(info.mtimeMs) };
  } catch {
    return { path, exists: false };
  }
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function sourceCandidateFingerprint(candidate) {
  const sourceFile = candidate.source ? await fileFingerprint(resolve(candidate.source)) : null;
  const payload = {
    tool: 'water9-source-candidate-review@2',
    candidate,
    sourceFile,
  };
  return createHash('sha256').update(stableJson(payload)).digest('hex');
}

function textureNamesFor(creature) {
  const names = new Set();
  for (const part of creature?.parts ?? []) {
    for (const key of ['texture', 'damagedTexture', 'detachedTexture']) {
      if (part[key]) names.add(part[key]);
    }
  }
  for (const overlay of creature?.socketOverlays ?? []) {
    for (const key of ['texture', 'severedTexture']) {
      if (overlay[key]) names.add(overlay[key]);
    }
  }
  return [...names].sort();
}

async function creatureFingerprint(tool, creature, sourceManifest) {
  const textureFiles = await Promise.all(textureNamesFor(creature).map((file) => fileFingerprint(resolve(generatedDir, file))));
  const sourceFile = sourceManifest?.source ? await fileFingerprint(resolve(sourceManifest.source)) : null;
  const sourceManifestFile = sourceManifest?._file ? await fileFingerprint(resolve(generatedDir, sourceManifest._file)) : null;
  const payload = {
    tool,
    creature,
    sourceManifest,
    sourceFile,
    sourceManifestFile,
    textureFiles,
  };
  return createHash('sha256').update(stableJson(payload)).digest('hex');
}

function sourceApproved(candidate) {
  return sourceApprovedStrict(candidate);
}

function sourceImageValidationRecorded(candidate) {
  return strictSourceImageValidationRecorded(candidate);
}

function acceptedThreat(creature) {
  return rigAcceptedStrict(creature);
}

async function loadSourceManifests() {
  const manifests = new Map();
  let files = [];
  try {
    files = await readdir(generatedDir);
  } catch {
    return manifests;
  }
  for (const file of files.filter((candidate) => candidate.endsWith('.articulated.json'))) {
    const path = resolve(generatedDir, file);
    const data = await readJson(path, null);
    if (data?.runtimeCreatureId) manifests.set(data.runtimeCreatureId, { ...data, _file: file });
  }
  return manifests;
}

function sourceNextCommands(candidate) {
  const starterPlan = `tools/scratch/${candidate.id}-starter-plan.json`;
  const planPreview = `public/review/articulated/${candidate.id}-plan-preview.png`;
  if (!candidate.source) {
    return [
      'npm run source:contracts',
      'npm run source:inbox-pack',
      `# review public/review/source-candidates/art-contracts/${candidate.id}.md before generation`,
      `npm run source:next-prompt -- --id ${candidate.id}`,
      `npm run source:imagegen-mark -- --id ${candidate.id}`,
      '# use the capture UI for pasted, dropped, downloaded, or manually saved output:',
      'npm run source:inbox-capture',
      `# if the output appears inline only, recover it into tools/source-inbox/${candidate.id}.png:`,
      `npm run source:recover-inline -- --id ${candidate.id} --copy --validate`,
      `npm run source:recover-inline -- --id ${candidate.id} --image <saved-image-path> --copy --validate`,
      'npm run source:inbox-check -- --dir tools/source-inbox --strict',
      'npm run source:ingest-batch -- --dir tools/source-inbox --strict --dry-run',
      'npm run source:ingest-batch -- --dir tools/source-inbox --strict',
      '# if using the generated-images handoff instead:',
      'npm run source:imagegen-status',
      `npm run source:imagegen-status -- --ingest --dry-run --id ${candidate.id}`,
      `npm run source:imagegen-status -- --ingest --id ${candidate.id}`,
      `npm run source:imagegen-status -- --reject-missing --id ${candidate.id}`,
      `npm run source:image-check -- --id ${candidate.id}`,
      'npm run source:gallery',
    ];
  }
  if (!sourceApproved(candidate)) {
    return [
      `npm run source:image-check -- --id ${candidate.id}`,
      'npm run source:gallery',
      `npm run source:accept -- --id ${candidate.id} --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' ${REQUIRED_SOURCE_VISUAL_CHECKS.map((check) => `--visual-check ${check}`).join(' ')} ${REQUIRED_SOURCE_VISUAL_CHECKS.map((check) => `--score ${check}=<4-5>`).join(' ')} ${REQUIRED_SOURCE_VISUAL_CHECKS.map((check) => `--visual-note ${check}='<specific rationale>'`).join(' ')} --source-reviewed`,
      'npm run source:gallery',
      'npm run source:check',
    ];
  }
  return [
    `npm run articulated:prepare-plan -- --id ${candidate.id} --overwrite`,
    `npm run articulated:plan-preview -- --plan ${starterPlan} --out ${planPreview}`,
    `npm run articulated:plan-check -- --plan ${starterPlan}`,
    `npm run articulated:extract-plan -- --plan ${starterPlan} --dry-run`,
  ];
}

function approvalRunwayCommands(approvalItem) {
  if (!approvalItem) return [];
  if (approvalItem.criticRegenerationRequired) {
    return [
      approvalItem.criticRegeneration?.commands?.openPrompt,
      approvalItem.criticRegeneration?.commands?.generateOpenAiDryRun,
      approvalItem.criticRegeneration?.commands?.generateOpenAiApply,
      approvalItem.criticRegeneration?.commands?.validateInbox,
      approvalItem.criticRegeneration?.commands?.dryRunReplace,
      approvalItem.criticRegeneration?.commands?.applyReplace,
      approvalItem.criticRegeneration?.commands?.imageCheck,
      approvalItem.criticRegeneration?.commands?.sourcePreview,
      approvalItem.criticRegeneration?.commands?.rebuildEvidence,
    ].filter(Boolean);
  }
  if (approvalItem.readyForHumanReview && !approvalItem.humanApproved) {
    return [
      approvalItem.commands?.quickReview,
      approvalItem.commands?.sandboxLab,
      approvalItem.commands?.planCheck,
      approvalItem.acceptCommandDryRun,
      approvalItem.acceptCommand,
      approvalItem.rejectCommandDryRun,
    ].filter(Boolean);
  }
  return [];
}

function regexEscape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function keywordHits(text, words) {
  return words.filter((word) => {
    const pattern = new RegExp(`(^|[^a-z0-9])${regexEscape(word)}([^a-z0-9]|$)`, 'i');
    return pattern.test(text);
  });
}

function scoreSourceGenerationCandidate(item) {
  const candidate = item.candidate;
  const text = `${candidate.id} ${candidate.species} ${candidate.gameplayVerb ?? ''} ${(candidate.requiredRead ?? []).join(' ')} ${(candidate.promptRisks ?? []).join(' ')}`.toLowerCase();
  const articulatableParts = Array.isArray(candidate.articulatableParts) ? candidate.articulatableParts.length : 0;
  let score = 0;
  const reasons = [];
  const curatedReason = CURATED_SOURCE_PRIORITY.get(candidate.id);
  if (curatedReason) {
    score += 26;
    reasons.push(curatedReason);
  }
  if (!item.hasSource) {
    score += 40;
    reasons.push('missing source image');
  }
  if (articulatableParts >= 10) {
    score += 12;
    reasons.push(`${articulatableParts} articulatable parts`);
  }
  const verbHits = keywordHits(text, CLEAR_VERB_WORDS);
  if (verbHits.length) {
    score += Math.min(18, verbHits.length * 3);
    reasons.push(`clear gameplay verbs: ${verbHits.slice(0, 4).join(', ')}`);
  }
  const silhouetteHits = keywordHits(text, SIMPLE_SILHOUETTE_WORDS);
  if (silhouetteHits.length) {
    score += Math.min(18, silhouetteHits.length * 4);
    reasons.push(`readable biological silhouette cues: ${silhouetteHits.slice(0, 3).join(', ')}`);
  }
  const riskHits = keywordHits(text, COMPLEXITY_RISK_WORDS);
  if (riskHits.length) {
    score -= Math.min(18, riskHits.length * 4);
    reasons.push(`complexity risk: ${riskHits.slice(0, 3).join(', ')}`);
  }
  if ((candidate.promptRisks ?? []).length > 5) {
    score -= 4;
    reasons.push('extra prompt risks');
  }
  return {
    id: candidate.id,
    species: candidate.species,
    score,
    reasons,
    qualityContract: QUALITY_CONTRACT,
    sourceArtContract: `public/review/source-candidates/art-contracts/${candidate.id}.md`,
    nextCommands: sourceNextCommands(candidate),
  };
}

function sourceReviewTarget(item) {
  return {
    id: item.id,
    species: item.species,
    score: item.hasSource ? 10 : 0,
    reasons: item.blockers.length ? item.blockers : ['source candidate is the next strict-gate blocker'],
    qualityContract: QUALITY_CONTRACT,
    sourceArtContract: `public/review/source-candidates/art-contracts/${item.id}.md`,
    nextCommands: item.nextCommands,
  };
}

async function sourceReadiness(candidate, reviewItem, latestRejection, approvalItem) {
  const blockers = [];
  const hasSource = Boolean(candidate.source) && await fileOk(resolve(candidate.source), 512);
  if (!hasSource) blockers.push('missing whole-source image');
  if (!hasSource && latestRejection) blockers.push(`latest generation attempt rejected: ${latestRejection.reason}`);
  if (!reviewItem) blockers.push('missing source gallery review item');
  if (reviewItem && candidate.source && !reviewItem.sourceThumbFile) blockers.push('missing source thumbnail');
  if (reviewItem?.sourceThumbFile && !(await fileOk(resolve('public/review/source-candidates', reviewItem.sourceThumbFile), 512))) blockers.push('source thumbnail file missing or too small');
  if (reviewItem && candidate.source && !reviewItem.keyPreviewFile) blockers.push('missing chroma-key preview');
  if (reviewItem?.keyPreviewFile && !(await fileOk(resolve('public/review/source-candidates', reviewItem.keyPreviewFile), 1024))) blockers.push('chroma-key preview file missing or too small');
  if (reviewItem) {
    const expectedFingerprint = await sourceCandidateFingerprint(candidate);
    if (!reviewItem.inputFingerprint) blockers.push('missing source review fingerprint');
    else if (reviewItem.inputFingerprint !== expectedFingerprint) blockers.push('stale source review fingerprint');
  }
  if (approvalItem?.criticRegenerationRequired) blockers.push('critic regeneration required before human source approval');
  if (approvalItem && !approvalItem.mechanicallyReadyForHumanReview) blockers.push('source approval runway is not mechanically ready');
  if (candidate.source && !sourceApproved(candidate)) blockers.push('not approved by human source review');
  if (sourceApproved(candidate) && candidate.status !== 'rigged') blockers.push('approved source needs articulation starter plan and extraction');
  if (candidate.status === 'rigged' && !candidate.riggedCreatureId) blockers.push('rigged status missing riggedCreatureId');
  return {
    candidate,
    id: candidate.id,
    species: candidate.species,
    status: candidate.status,
    hasSource,
    approved: sourceApproved(candidate),
    mechanicallyReadyForHumanReview: Boolean(approvalItem?.mechanicallyReadyForHumanReview),
    approvalReady: Boolean(approvalItem?.readyForHumanReview),
    criticRegenerationRequired: Boolean(approvalItem?.criticRegenerationRequired),
    criticRegeneration: approvalItem?.criticRegeneration ?? null,
    humanApproved: Boolean(approvalItem?.humanApproved),
    latestRejection,
    blockers,
    nextCommands: approvalRunwayCommands(approvalItem).length
      ? approvalRunwayCommands(approvalItem)
      : sourceNextCommands(candidate),
  };
}

function qualityRecordsAgree(runtimeQuality, reviewQuality) {
  if (!runtimeQuality || !reviewQuality) return false;
  for (const key of ['status', 'sourceCohesion', 'backgroundKey', 'reviewedBy', 'reviewedAt', 'acceptanceNote', 'sourceCandidateId']) {
    if (String(runtimeQuality[key] ?? '') !== String(reviewQuality[key] ?? '')) return false;
  }
  return REQUIRED_ARTICULATED_VISUAL_CHECKS.every((check) => runtimeQuality.visualChecklist?.[check] === reviewQuality.visualChecklist?.[check])
    && REQUIRED_ARTICULATED_VISUAL_CHECKS.every((check) => Number(runtimeQuality.visualScores?.[check]) === Number(reviewQuality.visualScores?.[check]))
    && REQUIRED_ARTICULATED_VISUAL_CHECKS.every((check) => String(runtimeQuality.visualNotes?.[check] ?? '') === String(reviewQuality.visualNotes?.[check] ?? ''))
    && REQUIRED_ARTICULATED_EVIDENCE.every((check) => runtimeQuality.reviewEvidence?.[check] === reviewQuality.reviewEvidence?.[check]);
}

function threatNextCommands(creature) {
  if (acceptedThreat(creature)) return [];
  const sourceCandidate = creature.quality?.sourceCandidateId ?? '<approved-source-candidate-id>';
  return [
    `npm run review:articulated:quick`,
    `npm run sandbox:preview -- --id ${creature.id} --with diver --visual`,
    `npm run sandbox:visual -- --ids ${creature.id} --states idle,lunge,stunned --with diver`,
    `npm run content:accept -- --id ${creature.id} --status accepted --reviewed-by <human-reviewer> --source-candidate ${sourceCandidate} --note '<specific rig approval note>' --visual-check single-source-cohesion --visual-check readable-silhouette --visual-check anatomy-cohesion --visual-check production-visual-cohesion --visual-check socket-seams --visual-check motion-stability --visual-check sandbox-behavior --score single-source-cohesion=<4-5> --score readable-silhouette=<4-5> --score anatomy-cohesion=<4-5> --score production-visual-cohesion=<4-5> --score socket-seams=<4-5> --score motion-stability=<4-5> --score sandbox-behavior=<4-5> --visual-note single-source-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note anatomy-cohesion='<specific rationale>' --visual-note production-visual-cohesion='<specific rationale>' --visual-note socket-seams='<specific rationale>' --visual-note motion-stability='<specific rationale>' --visual-note sandbox-behavior='<specific rationale>' --source-reviewed --contact-reviewed --phase-reviewed --parity-reviewed --sandbox-reviewed --dry-run`,
  ];
}

async function threatReadiness(creature, reviewItem, sourceManifest, sourceCandidate, sandboxResult) {
  const blockers = [];
  if (!sourceManifest) blockers.push('missing articulated source manifest');
  if (!reviewItem) blockers.push('missing articulated review item');
  if (!reviewItem?.inputFingerprint) blockers.push('missing articulated review fingerprint');
  else {
    const expected = await creatureFingerprint('water9-review-gallery@2', creature, sourceManifest);
    if (reviewItem.inputFingerprint !== expected) blockers.push('stale articulated review fingerprint');
  }
  if (!sandboxResult) blockers.push('missing sandbox visual result');
  if (sandboxResult && sandboxResult.companion !== 'diver') blockers.push('sandbox visual result was not captured with diver companion');
  if (sandboxResult && !sandboxResult.assetFingerprint) blockers.push('missing sandbox asset fingerprint');
  else if (sandboxResult) {
    const expected = await creatureFingerprint('water9-sandbox-visual@2', creature, sourceManifest);
    if (sandboxResult.assetFingerprint !== expected) blockers.push('stale sandbox asset fingerprint');
  }
  const states = new Set((sandboxResult?.states ?? []).map((state) => state.state));
  for (const state of REQUIRED_SANDBOX_STATES) {
    if (!states.has(state)) blockers.push(`missing sandbox ${state} state capture`);
  }
  if (!sourceCandidate) blockers.push('missing linked approved source candidate');
  else if (!sourceApproved(sourceCandidate)) blockers.push('linked source candidate is not approved');
  if (creature.quality?.status !== 'accepted') blockers.push(`quality.status is ${creature.quality?.status ?? 'missing'}, expected accepted`);
  if (reviewItem?.quality && !qualityRecordsAgree(creature.quality, reviewItem.quality)) blockers.push('runtime/review quality metadata mismatch');
  if (!acceptedThreat(creature)) blockers.push('not accepted by strict quality metadata');
  return {
    id: creature.id,
    species: creature.species,
    qualityStatus: creature.quality?.status ?? 'missing',
    accepted: acceptedThreat(creature) && blockers.length === 0,
    blockers,
    nextCommands: threatNextCommands(creature),
  };
}

function markdownList(items) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- None.';
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function commandBlock(commands) {
  return `<pre><code>${htmlEscape((commands ?? []).filter(Boolean).join('\n') || '# no commands')}</code></pre>`;
}

function blockerList(items) {
  return (items ?? []).length
    ? `<ul>${items.map((item) => `<li>${htmlEscape(item)}</li>`).join('')}</ul>`
    : '<p class="muted">No blockers recorded.</p>';
}

function readinessCard(item, kind) {
  const status = kind === 'source'
    ? `source: ${item.hasSource}; approved: ${item.approved}; approval-ready: ${item.approvalReady}; critic regeneration: ${item.criticRegenerationRequired}`
    : `quality: ${item.qualityStatus}; accepted: ${item.accepted}`;
  return `<article class="card">
    <header><h3>${htmlEscape(item.species)}</h3><code>${htmlEscape(item.id)}</code></header>
    <p class="muted">${htmlEscape(status)}</p>
    <h4>Blockers</h4>
    ${blockerList(item.blockers)}
    <h4>Next Commands</h4>
    ${commandBlock(item.nextCommands)}
  </article>`;
}

function reportHtml(report) {
  const priority = (report.sourceGenerationPriority ?? []).slice(0, 8).map((item) => `<article class="card">
    <header><h3>${htmlEscape(item.species)}</h3><code>${htmlEscape(item.id)}</code></header>
    <p>Score <strong>${htmlEscape(item.score)}</strong></p>
    <h4>Reasons</h4>
    ${blockerList(item.reasons)}
    <p><a href="${htmlEscape(item.sourceArtContract.replace('public/review/', ''))}">source-art contract</a></p>
    ${commandBlock(item.nextCommands)}
  </article>`).join('\n');
  const sourceRows = report.sourceCandidates
    .filter((item) => item.blockers.length)
    .slice(0, 20)
    .map((item) => readinessCard(item, 'source'))
    .join('\n');
  const threatRows = report.articulatedThreats
    .filter((item) => item.blockers.length)
    .slice(0, 20)
    .map((item) => readinessCard(item, 'threat'))
    .join('\n');
  const rejectionRows = (report.recentSourceRejections ?? []).slice(0, 8)
    .map((item) => `<li><strong>${htmlEscape(item.species ?? item.candidateId)}</strong> <code>${htmlEscape(item.candidateId)}</code>: ${htmlEscape(item.reason)} <span>${htmlEscape(item.rejectedAt)}</span></li>`)
    .join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Content Readiness Dossier</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0c1c21; --line:#24424a; --text:#e2f5f6; --muted:#94adb2; --accent:#74ddf5; --warn:#e7bd6d; --bad:#e0788b; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1360px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:30px 0 12px; }
    h3 { margin:0; font-size:18px; }
    h4 { margin:14px 0 6px; color:var(--muted); text-transform:uppercase; font-size:11px; }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { margin:8px 0 0; padding:10px; border:1px solid var(--line); background:#050b0d; overflow:auto; white-space:pre-wrap; }
    ul { margin:8px 0 0; padding-left:20px; }
    li { margin:4px 0; }
    .muted { color:var(--muted); }
    .summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:10px; margin:18px 0; }
    .summary div { border:1px solid var(--line); background:#09171b; padding:10px; }
    .summary strong { display:block; font-size:22px; color:var(--text); }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:14px; }
    .card { border:1px solid var(--line); background:var(--panel); border-radius:6px; padding:14px; }
    .card header { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
    .card li { color:var(--warn); }
    .contract li { color:var(--text); }
    .rejections li { color:var(--bad); }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Content Readiness Dossier</h1>
    <p class="muted">Strict 20-threat gate evidence, blockers, and next commands. This is readiness reporting only; it does not approve content.</p>
    <section class="summary">
      <div><span>source images</span><strong>${report.summary.sourceImages}/${report.summary.targetThreats}</strong></div>
      <div><span>source approval-ready</span><strong>${report.summary.sourceApprovalReady}/${report.summary.targetThreats}</strong></div>
      <div><span>critic regeneration</span><strong>${report.summary.sourceCriticRegenerationRequired}</strong></div>
      <div><span>approved sources</span><strong>${report.summary.approvedSources}/${report.summary.targetThreats}</strong></div>
      <div><span>registered threats</span><strong>${report.summary.registeredThreats}</strong></div>
      <div><span>accepted threats</span><strong>${report.summary.acceptedThreats}/${report.summary.targetThreats}</strong></div>
      <div><span>strict gate complete</span><strong>${report.summary.strictGateComplete ? 'yes' : 'no'}</strong></div>
      <div><span>next bottleneck</span><strong>${htmlEscape(report.summary.nextBottleneck)}</strong></div>
    </section>
    ${commandBlock(['npm run content:readiness && npm run content:readiness-check', 'npm run content:gate'])}
    <h2>Quality Contract</h2>
    <section class="card contract">${blockerList(report.qualityContract)}</section>
    <h2>Vertical Slice Target</h2>
    <section class="card">
      ${report.verticalSliceTarget ? `<h3>${htmlEscape(report.verticalSliceTarget.species)}</h3><code>${htmlEscape(report.verticalSliceTarget.id)}</code><p>Score <strong>${htmlEscape(report.verticalSliceTarget.score)}</strong></p>${blockerList(report.verticalSliceTarget.reasons)}${commandBlock(report.verticalSliceTarget.nextCommands)}` : '<p class="muted">No missing-source candidate is available.</p>'}
    </section>
    <h2>Source Generation Priority</h2>
    <section class="grid">${priority || '<p class="muted">No missing-source candidates.</p>'}</section>
    <h2>Recent Source Rejections</h2>
    <section class="card rejections"><ul>${rejectionRows || '<li>No rejected source generation attempts.</li>'}</ul></section>
    <h2>Source Candidate Readiness</h2>
    <section class="grid">${sourceRows || '<p class="muted">No source candidate blockers.</p>'}</section>
    <h2>Articulated Threat Readiness</h2>
    <section class="grid">${threatRows || '<p class="muted">No articulated threat blockers.</p>'}</section>
  </main>
</body>
</html>
`;
}

function reportMarkdown(report) {
  const verticalSlice = report.verticalSliceTarget;
  const priorityRows = (report.sourceGenerationPriority ?? [])
    .slice(0, 6)
    .map((item, index) => [
      `### ${index + 1}. ${item.species} (${item.id})`,
      '',
      `Score: \`${item.score}\``,
      '',
      'Reasons:',
      markdownList(item.reasons),
      '',
      `Source-art contract: \`${item.sourceArtContract}\``,
      '',
      'Next commands:',
      '```bash',
      item.nextCommands.join('\n'),
      '```',
    ].join('\n')).join('\n\n');
  const sourceRows = report.sourceCandidates
    .filter((item) => item.blockers.length)
    .slice(0, 20)
    .map((item) => [
      `### ${item.species} (${item.id})`,
      '',
      `Status: \`${item.status}\`; source: \`${item.hasSource}\`; approved: \`${item.approved}\``,
      '',
      'Blockers:',
      markdownList(item.blockers),
      '',
      'Next commands:',
      '```bash',
      item.nextCommands.join('\n'),
      '```',
    ].join('\n')).join('\n\n');
  const threatRows = report.articulatedThreats
    .filter((item) => item.blockers.length)
    .slice(0, 20)
    .map((item) => [
      `### ${item.species} (${item.id})`,
      '',
      `Quality: \`${item.qualityStatus}\`; accepted: \`${item.accepted}\``,
      '',
      'Blockers:',
      markdownList(item.blockers),
      '',
      'Next commands:',
      '```bash',
      item.nextCommands.join('\n'),
      '```',
    ].join('\n')).join('\n\n');
  const rejectionRows = (report.recentSourceRejections ?? [])
    .slice(0, 8)
    .map((item) => [
      `- **${item.species}** (\`${item.candidateId}\`) at \`${item.rejectedAt}\`: ${item.reason}`,
    ].join('\n')).join('\n');
  return `${[
    '# Water 9 Content Readiness',
    '',
    `Target accepted threats: \`${report.summary.targetThreats}\``,
    `Source candidates with source image: \`${report.summary.sourceImages}/${report.summary.targetThreats}\``,
    `Source candidates mechanically ready for review: \`${report.summary.sourceMechanicallyReadyForHumanReview}/${report.summary.targetThreats}\``,
    `Source candidates approval-ready now: \`${report.summary.sourceApprovalReady}/${report.summary.targetThreats}\``,
    `Source candidates requiring critic regeneration: \`${report.summary.sourceCriticRegenerationRequired}\``,
    `Approved source candidates: \`${report.summary.approvedSources}/${report.summary.targetThreats}\``,
    `Source generation queue: \`${report.summary.sourceGenerationQueued}\` candidates`,
    `Rejected source generation attempts: \`${report.summary.rejectedSourceAttempts}\``,
    `Registered articulated threats: \`${report.summary.registeredThreats}\``,
    `Accepted articulated threats: \`${report.summary.acceptedThreats}/${report.summary.targetThreats}\``,
    `Strict gate complete: \`${report.summary.strictGateComplete}\``,
    `Sandbox visual reports: \`${report.summary.sandboxReports}\`; unique checked ids: \`${report.summary.sandboxUniqueChecked}/${report.summary.sandboxIndexEntries}\`; failures: \`${report.summary.sandboxFailures}\``,
    '',
    `Next bottleneck: **${report.summary.nextBottleneck}**`,
    '',
    '## Quality Contract',
    '',
    markdownList(report.qualityContract ?? []),
    '',
    '## Current Vertical Slice Target',
    '',
    verticalSlice
      ? [
        `Species: **${verticalSlice.species}** (\`${verticalSlice.id}\`)`,
        '',
        `Score: \`${verticalSlice.score}\``,
        '',
        'Why this target:',
        markdownList(verticalSlice.reasons),
        '',
        'First proof required:',
        '- one accepted source image',
        '- one validated articulation plan',
        '- one sandbox preview showing idle, lunge, and stunned states',
        '- one human acceptance pass against the quality contract',
      ].join('\n')
      : 'No missing-source candidate is available.',
    '',
    '## Source Generation Priority',
    '',
    priorityRows || 'No missing-source candidates.',
    '',
    '## Recent Source Generation Rejections',
    '',
    rejectionRows || 'No rejected source generation attempts.',
    '',
    '## Source Candidate Readiness',
    '',
    sourceRows || 'No source candidate blockers.',
    '',
    '## Articulated Threat Readiness',
    '',
    threatRows || 'No articulated threat blockers.',
    '',
  ].join('\n')}\n`;
}

const sourceCandidates = await readJson(paths.sourceCandidates, { candidates: [] });
const sourceReview = await readJson(paths.sourceReview, { candidates: [] });
const sourceRejections = await readJson(paths.sourceRejections, { attempts: [] });
const sourceGenerationQueue = await readJson(paths.sourceGenerationQueue, { candidates: [] });
const sourceApprovalRunway = await readJson(paths.sourceApprovalRunway, { summary: {}, items: [] });
const sourceCriticRegeneration = await readJson(paths.sourceCriticRegeneration, { summary: {}, items: [] });
const runtime = await readJson(paths.articulatedRuntime, { creatures: [] });
const articulatedReview = await readJson(paths.articulatedReview, { creatures: [] });
const sandboxIndex = await readJson(paths.sandboxIndex, { entries: [] });
const sandboxReports = await loadSandboxReports();
const sourceManifests = await loadSourceManifests();
const candidates = Array.isArray(sourceCandidates.candidates) ? sourceCandidates.candidates : [];
const sourceReviewById = new Map((sourceReview.candidates ?? []).map((item) => [item.id, item]));
const sourceApprovalById = new Map((sourceApprovalRunway.items ?? []).map((item) => [item.id, item]));
const rejectedAttempts = Array.isArray(sourceRejections.attempts) ? sourceRejections.attempts : [];
const latestRejectionByCandidate = new Map();
for (const attempt of rejectedAttempts) {
  if (!attempt.candidateId) continue;
  const current = latestRejectionByCandidate.get(attempt.candidateId);
  if (!current || String(attempt.rejectedAt ?? '') > String(current.rejectedAt ?? '')) {
    latestRejectionByCandidate.set(attempt.candidateId, attempt);
  }
}
const queuedSourceGeneration = Array.isArray(sourceGenerationQueue.candidates) ? sourceGenerationQueue.candidates : [];
const creatures = Array.isArray(runtime.creatures) ? runtime.creatures : [];
const threatReviewById = new Map((articulatedReview.creatures ?? []).map((item) => [item.id, item]));
const sandboxResults = sandboxReports.flatMap(({ path, report, mtimeMs }) => (report.results ?? []).map((item) => ({ ...item, reportPath: path, reportMtimeMs: mtimeMs })));
const sandboxIndexEntries = Array.isArray(sandboxIndex.entries) ? sandboxIndex.entries : [];
const sandboxById = new Map();
for (const result of sandboxResults) {
  if (!result.id) continue;
  if (result.kind === 'articulated' && result.companion !== 'diver') continue;
  const current = sandboxById.get(result.id);
  if (!current || result.reportMtimeMs > current.reportMtimeMs) {
    sandboxById.set(result.id, result);
  }
}
const sourceCandidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));

const sourceReadinessItems = await Promise.all(candidates.map((candidate) => sourceReadiness(
  candidate,
  sourceReviewById.get(candidate.id),
  latestRejectionByCandidate.get(candidate.id) ?? null,
  sourceApprovalById.get(candidate.id) ?? null,
)));
const threatReadinessItems = await Promise.all(creatures.map((creature) => {
  const sourceCandidateId = creature.quality?.sourceCandidateId ?? sourceManifests.get(creature.id)?.sourceCandidateId ?? sourceManifests.get(creature.id)?.quality?.sourceCandidateId;
  return threatReadiness(
    creature,
    threatReviewById.get(creature.id),
    sourceManifests.get(creature.id),
    sourceCandidateById.get(sourceCandidateId),
    sandboxById.get(creature.id),
  );
}));

const summary = {
  targetThreats: minThreats,
  sourceCandidates: sourceReadinessItems.length,
  sourceImages: sourceReadinessItems.filter((item) => item.hasSource).length,
  sourceMechanicallyReadyForHumanReview: sourceApprovalRunway.summary?.mechanicallyReadyForHumanReview ?? sourceReadinessItems.filter((item) => item.mechanicallyReadyForHumanReview).length,
  sourceApprovalReady: sourceApprovalRunway.summary?.readyForHumanReview ?? sourceReadinessItems.filter((item) => item.approvalReady).length,
  sourceCriticRegenerationRequired: sourceApprovalRunway.summary?.criticRegenerationRequired ?? sourceReadinessItems.filter((item) => item.criticRegenerationRequired).length,
  sourceCriticRegenerationQueued: sourceCriticRegeneration.summary?.regenerateCandidates ?? (sourceCriticRegeneration.items ?? []).length,
  approvedSources: sourceReadinessItems.filter((item) => item.approved).length,
  sourceGenerationQueued: queuedSourceGeneration.length,
  rejectedSourceAttempts: rejectedAttempts.length,
  registeredThreats: threatReadinessItems.length,
  acceptedThreats: threatReadinessItems.filter((item) => item.accepted).length,
  sandboxReports: sandboxReports.length,
  sandboxUniqueChecked: new Set(sandboxResults.map((item) => item.id).filter(Boolean)).size,
  sandboxIndexEntries: sandboxIndexEntries.length,
  sandboxFailures: sandboxResults.flatMap((item) => item.failures ?? []).length,
};
summary.strictGateComplete = summary.acceptedThreats >= minThreats;
summary.nextBottleneck = (() => {
  if (summary.sourceImages < minThreats) return `generate and ingest ${minThreats - summary.sourceImages} more source images`;
  if (summary.approvedSources < minThreats && summary.sourceCriticRegenerationRequired > 0) {
    return `regenerate ${summary.sourceCriticRegenerationRequired} critic-blocked source candidates; ${summary.sourceApprovalReady} source candidates are approval-ready; ${minThreats - summary.approvedSources} still need human approval`;
  }
  if (summary.approvedSources < minThreats) return `approve ${minThreats - summary.approvedSources} source candidates (${summary.sourceApprovalReady} approval-ready)`;
  if (summary.registeredThreats < minThreats) return `rig ${minThreats - summary.registeredThreats} approved source candidates`;
  if (summary.acceptedThreats < minThreats) return `accept ${minThreats - summary.acceptedThreats} articulated threats`;
  return 'strict target reached';
})();

const report = {
  schema: 'water9/content-readiness@1',
  generatedAt: new Date().toISOString(),
  summary,
  qualityContract: QUALITY_CONTRACT,
  sourceGenerationPriority: sourceReadinessItems
    .filter((item) => !item.hasSource)
    .map(scoreSourceGenerationCandidate)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id)),
  sourceCandidates: sourceReadinessItems,
  recentSourceRejections: [...rejectedAttempts]
    .sort((left, right) => String(right.rejectedAt ?? '').localeCompare(String(left.rejectedAt ?? '')))
    .slice(0, 12),
  articulatedThreats: threatReadinessItems,
};
const nextBlockedSource = sourceReadinessItems.find((item) => item.blockers.length);
report.verticalSliceTarget = report.sourceGenerationPriority[0]
  ?? (nextBlockedSource ? sourceReviewTarget(nextBlockedSource) : null);

await mkdir(dirname(jsonOut), { recursive: true });
await mkdir(dirname(markdownOut), { recursive: true });
await mkdir(dirname(htmlOut), { recursive: true });
await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownOut, reportMarkdown(report));
await writeFile(htmlOut, reportHtml(report));

console.log(JSON.stringify({
  jsonOut,
  markdownOut,
  htmlOut,
  summary,
}, null, 2));

import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { MIN_VISUAL_NOTE_LENGTH, distinctReviewNotes, meaningfulReviewText, reviewNoteHasEvidenceTerms } from './review_text_quality.mjs';
import { rigAcceptedStrict, sourceApprovedStrict } from './content_quality_predicates.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const id = String(args.get('id') ?? '').trim();
const explicitSourceCandidateId = String(args.get('source-candidate') ?? args.get('sourceCandidate') ?? '').trim();
const outDir = resolve(String(args.get('out-dir') ?? 'public/review/exemplar-packs'));
const jsonOut = resolve(String(args.get('json-out') ?? `${outDir}/${id || 'exemplar'}.json`));
const markdownOut = resolve(String(args.get('out') ?? `${outDir}/${id || 'exemplar'}.md`));
const generatedDir = resolve('public/assets/generated');
const sandboxBaseUrl = String(args.get('base-url') ?? 'http://127.0.0.1:5177').replace(/\/$/, '');

const REQUIRED_SOURCE_CHECKS = [
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

const REQUIRED_THREAT_CHECKS = [
  'single-source-cohesion',
  'readable-silhouette',
  'anatomy-cohesion',
  'production-visual-cohesion',
  'socket-seams',
  'motion-stability',
  'sandbox-behavior',
];
const MIN_VISUAL_SCORE = 4;

const REQUIRED_THREAT_EVIDENCE = ['whole-source', 'contact-sheet', 'phase-strip', 'source-parity', 'sandbox-preview'];
const REQUIRED_SANDBOX_STATES = ['idle', 'lunge', 'stunned'];
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

function usage() {
  console.error('Usage: node tools/build_content_exemplar_pack.mjs --id <articulated-creature-id> [--source-candidate <id>]');
}

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function fileStatus(path, minSize = 128) {
  if (!path) return { path: null, exists: false, ok: false };
  try {
    const info = await stat(resolve(path));
    return { path, exists: info.isFile(), ok: info.isFile() && info.size >= minSize, bytes: info.size };
  } catch {
    return { path, exists: false, ok: false };
  }
}

function relativeReviewPath(base, file) {
  return file ? `${base.replace(/\/$/, '')}/${file.replace(/^\//, '')}` : null;
}

function absoluteSandboxUrl(entry) {
  if (!entry?.url) return `${sandboxBaseUrl}/?sandbox=${encodeURIComponent(id)}`;
  return `${sandboxBaseUrl}${entry.url.startsWith('/') ? entry.url : `/${entry.url}`}`;
}

function sourceApprovalCommand(candidate) {
  if (!candidate) return null;
  return [
    `npm run source:accept -- --id ${candidate.id} --status approved --reviewed-by <human-reviewer> \\`,
    `  --note '<specific source approval note>' \\`,
    `  ${REQUIRED_SOURCE_CHECKS.map((check) => `--visual-check ${check}`).join(' ')} \\`,
    `  ${REQUIRED_SOURCE_CHECKS.map((check) => `--score ${check}=<4-5>`).join(' ')} \\`,
    `  ${REQUIRED_SOURCE_CHECKS.map((check) => `--visual-note ${check}='<specific rationale>'`).join(' ')} \\`,
    '  --source-reviewed --dry-run',
  ].join('\n');
}

function threatAcceptanceCommand(creatureId, sourceCandidateId) {
  return [
    `npm run content:accept -- --id ${creatureId} --status accepted --reviewed-by <human-reviewer> \\`,
    `  --source-candidate ${sourceCandidateId || '<approved-source-candidate-id>'} \\`,
    `  --note '<specific rig approval note>' \\`,
    `  ${REQUIRED_THREAT_CHECKS.map((check) => `--visual-check ${check}`).join(' ')} \\`,
    `  ${REQUIRED_THREAT_CHECKS.map((check) => `--score ${check}=<4-5>`).join(' ')} \\`,
    `  ${REQUIRED_THREAT_CHECKS.map((check) => `--visual-note ${check}='<specific rationale>'`).join(' ')} \\`,
    '  --source-reviewed --contact-reviewed --phase-reviewed --parity-reviewed --sandbox-reviewed --dry-run',
  ].join('\n');
}

function checklistStatus(record, checks) {
  return Object.fromEntries(checks.map((check) => [check, record?.[check] === true]));
}

function allTrue(record) {
  return Object.values(record ?? {}).every((value) => value === true);
}

function sourceApproved(candidate) {
  return sourceApprovedStrict(candidate);
}

function threatAccepted(creature) {
  return rigAcceptedStrict(creature);
}

async function loadArticulatedSourceManifest(creatureId) {
  let files = [];
  try {
    files = await readdir(generatedDir);
  } catch {
    return null;
  }
  for (const file of files.filter((candidate) => candidate.endsWith('.articulated.json'))) {
    const path = resolve(generatedDir, file);
    const data = await readJson(path);
    if (data?.runtimeCreatureId === creatureId) return { ...data, _file: file, _path: path };
  }
  return null;
}

async function loadSandboxResults(creatureId) {
  const reportDir = resolve(String(args.get('sandbox-report-dir') ?? 'tools/scratch'));
  let entries = [];
  try {
    entries = await readdir(reportDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const results = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!/^sandbox.*report.*\.json$/.test(entry.name) && !/^sandbox-visuals.*report.*\.json$/.test(entry.name)) continue;
    const path = resolve(reportDir, entry.name);
    const report = await readJson(path);
    if (report?.schema !== 'water9/sandbox-visual-check@1') continue;
    const info = await stat(path).catch(() => null);
    for (const result of report.results ?? []) {
      if (result.id !== creatureId) continue;
      results.push({ ...result, reportPath: path, reportMtimeMs: info?.mtimeMs ?? 0 });
    }
  }
  return results.sort((left, right) => right.reportMtimeMs - left.reportMtimeMs);
}

function sandboxStateSummary(result) {
  const states = new Map((result?.states ?? []).map((state) => [state.state, state]));
  return Object.fromEntries(REQUIRED_SANDBOX_STATES.map((stateName) => {
    const state = states.get(stateName);
    return [stateName, {
      present: Boolean(state),
      screenshotPath: state?.screenshotPath ?? null,
      failures: state?.failures ?? [],
      framing: state?.framing ?? null,
    }];
  }));
}

function missingThreatReviewItems(threat) {
  const missing = [];
  if (!threat.reviewItem) missing.push('articulated review item');
  if (!threat.reviewItem?.sourceThumbFile) missing.push('whole-source thumbnail');
  if (!threat.reviewItem?.contactFile) missing.push('contact sheet');
  if (!threat.reviewItem?.phaseFile) missing.push('phase strip');
  if (!threat.sandboxResult) missing.push('sandbox visual result');
  for (const [state, summary] of Object.entries(threat.sandboxStates ?? {})) {
    if (!summary.present) missing.push(`sandbox ${state} state`);
    if (summary.failures.length) missing.push(`sandbox ${state} failures`);
  }
  return missing;
}

function markdownList(items) {
  if (!items.length) return '- None.';
  return items.map((item) => `- ${item}`).join('\n');
}

function markdownChecklist(checks) {
  return Object.entries(checks).map(([check, passed]) => `- ${passed ? '[x]' : '[ ]'} ${check}`).join('\n');
}

function markdownFor(pack) {
  const lines = [
    `# Exemplar Review Pack: ${pack.name ?? pack.id}`,
    '',
    `Generated: \`${pack.generatedAt}\``,
    `Runtime id: \`${pack.id}\``,
    `Source candidate: \`${pack.sourceCandidate?.id ?? 'missing'}\``,
    `Sandbox URL: ${pack.sandbox.url}`,
    '',
    '## Verdict',
    '',
    `- Source approved: \`${pack.sourceCandidate?.approved ?? false}\``,
    `- Threat accepted: \`${pack.threat.accepted}\``,
    `- Ready for strict gate: \`${pack.readyForStrictGate}\``,
    '',
    '## Blockers',
    '',
    markdownList(pack.blockers),
    '',
    '## Commands',
    '',
    '```bash',
    pack.commands.preview,
    pack.commands.visualCheck,
    pack.commands.reviewGallery,
    pack.commands.sourceGallery,
    pack.commands.acceptanceAudit,
    '```',
    '',
    '### Source Approval Dry Run',
    '',
    '```bash',
    pack.commands.sourceApprovalDryRun ?? '# no source candidate found',
    '```',
    '',
    '### Threat Acceptance Dry Run',
    '',
    '```bash',
    pack.commands.threatAcceptanceDryRun,
    '```',
    '',
    '## Source Checklist',
    '',
    markdownChecklist(pack.sourceCandidate?.visualChecklist ?? {}),
    '',
    '## Threat Checklist',
    '',
    markdownChecklist(pack.threat.visualChecklist),
    '',
    '## Threat Evidence',
    '',
    markdownChecklist(pack.threat.reviewEvidence),
    '',
    '## Review Files',
    '',
    markdownList(pack.reviewFiles.map((file) => `\`${file.label}\`: \`${file.path ?? 'missing'}\` (${file.ok ? 'ok' : 'missing/stale'})`)),
    '',
    '## Sandbox States',
    '',
    ...Object.entries(pack.threat.sandboxStates).flatMap(([state, summary]) => [
      `### ${state}`,
      '',
      `- Present: \`${summary.present}\``,
      `- Screenshot: \`${summary.screenshotPath ?? 'missing'}\``,
      `- Failures: \`${summary.failures.length}\``,
      '',
    ]),
    '## Human Review Standard',
    '',
    '- Reject the source if it only works when explained verbally.',
    '- Reject the rig if the assembled creature looks like unrelated parts moving together.',
    '- Reject motion that jitters, pops, flips anatomy, or hides the gameplay read.',
    '- Accept only when the sandbox view reads as production-intent art at game scale.',
    '',
  ];
  return `${lines.join('\n')}\n`;
}

if (!id) {
  usage();
  process.exit(1);
}

const runtime = await readJson(resolve(generatedDir, 'articulated-creatures.parts.json'), { creatures: [] });
const creature = (runtime.creatures ?? []).find((candidate) => candidate.id === id);
const sourceManifest = await loadArticulatedSourceManifest(id);
const sourceCandidatesManifest = await readJson(resolve('public/review/source-candidates/source-candidates.json'), { candidates: [] });
const sourceReview = await readJson(resolve('public/review/source-candidates/review-manifest.json'), { candidates: [] });
const articulatedReview = await readJson(resolve('public/review/articulated/review-manifest.json'), { creatures: [] });
const sandboxIndex = await readJson(resolve('public/review/sandbox/manifest.json'), { entries: [] });
const sandboxEntry = (sandboxIndex.entries ?? []).find((entry) => entry.id === id);
const sandboxResults = await loadSandboxResults(id);
const sandboxResult = sandboxResults[0] ?? null;

const sourceCandidateId = explicitSourceCandidateId
  || sourceManifest?.sourceCandidateId
  || creature?.quality?.sourceCandidateId
  || id;
const sourceCandidate = (sourceCandidatesManifest.candidates ?? []).find((candidate) => candidate.id === sourceCandidateId)
  ?? (sourceCandidatesManifest.candidates ?? []).find((candidate) => candidate.riggedCreatureId === id)
  ?? (sourceManifest?.source ? (sourceCandidatesManifest.candidates ?? []).find((candidate) => candidate.source === sourceManifest.source) : null);
const sourceReviewItem = (sourceReview.candidates ?? []).find((candidate) => candidate.id === sourceCandidate?.id);
const articulatedReviewItem = (articulatedReview.creatures ?? []).find((candidate) => candidate.id === id);

const sourceThumb = relativeReviewPath('public/review/source-candidates', sourceReviewItem?.sourceThumbFile);
const keyPreview = relativeReviewPath('public/review/source-candidates', sourceReviewItem?.keyPreviewFile);
const contactSheet = relativeReviewPath('public/review/articulated', articulatedReviewItem?.contactFile);
const phaseStrip = relativeReviewPath('public/review/articulated', articulatedReviewItem?.phaseFile);
const sourceParity = relativeReviewPath('public/review/articulated', articulatedReviewItem?.sourceParityDebugFile);

const reviewFiles = [
  { label: 'whole source', path: sourceCandidate?.source ?? sourceManifest?.source ?? null, ...(await fileStatus(sourceCandidate?.source ?? sourceManifest?.source, 512)) },
  { label: 'source thumbnail', path: sourceThumb, ...(await fileStatus(sourceThumb, 512)) },
  { label: 'key preview', path: keyPreview, ...(await fileStatus(keyPreview, 1024)) },
  { label: 'contact sheet', path: contactSheet, ...(await fileStatus(contactSheet, 1024)) },
  { label: 'phase strip', path: phaseStrip, ...(await fileStatus(phaseStrip, 1024)) },
  { label: 'source parity overlay', path: sourceParity, ...(await fileStatus(sourceParity, 512)) },
];

const sourceChecklist = checklistStatus(sourceCandidate?.review?.visualChecklist, REQUIRED_SOURCE_CHECKS);
const threatChecklist = checklistStatus(creature?.quality?.visualChecklist, REQUIRED_THREAT_CHECKS);
const threatEvidence = checklistStatus(creature?.quality?.reviewEvidence, REQUIRED_THREAT_EVIDENCE);
const threat = {
  exists: Boolean(creature),
  accepted: threatAccepted(creature),
  quality: creature?.quality ?? null,
  visualChecklist: threatChecklist,
  reviewEvidence: threatEvidence,
  reviewItem: articulatedReviewItem ?? null,
  sandboxResult: sandboxResult ? {
    reportPath: sandboxResult.reportPath,
    screenshotPath: sandboxResult.screenshotPath ?? null,
    failures: sandboxResult.failures ?? [],
  } : null,
  sandboxStates: sandboxStateSummary(sandboxResult),
};

const blockers = [];
if (!creature) blockers.push(`runtime creature ${id} is missing`);
if (!sourceManifest) blockers.push(`articulated source manifest for ${id} is missing`);
if (!sourceCandidate) blockers.push(`source candidate ${sourceCandidateId} is missing`);
if (sourceCandidate && !sourceApproved(sourceCandidate)) blockers.push(`source candidate ${sourceCandidate.id} is not human-approved`);
for (const file of reviewFiles) {
  if (!file.ok) blockers.push(`${file.label} evidence missing or too small`);
}
for (const missing of missingThreatReviewItems(threat)) blockers.push(missing);
if (!threat.accepted) blockers.push(`${id} is not accepted by the strict threat gate`);

const pack = {
  schema: 'water9/content-exemplar-pack@1',
  generatedAt: new Date().toISOString(),
  id,
  name: creature?.species ?? sourceManifest?.displayName ?? id,
  sourceCandidate: sourceCandidate ? {
    id: sourceCandidate.id,
    species: sourceCandidate.species,
    status: sourceCandidate.status,
    source: sourceCandidate.source ?? null,
    approved: sourceApproved(sourceCandidate),
    visualChecklist: sourceChecklist,
    reviewEvidence: {
      'whole-source': sourceCandidate.review?.reviewEvidence?.['whole-source'] === true,
      'source-preview': sourceCandidate.review?.reviewEvidence?.['source-preview'] === true,
      'source-image-validation': sourceCandidate.review?.reviewEvidence?.['source-image-validation'] === true,
    },
    reviewItem: sourceReviewItem ?? null,
  } : null,
  threat,
  sandbox: {
    entry: sandboxEntry ?? null,
    url: absoluteSandboxUrl(sandboxEntry),
  },
  reviewFiles,
  blockers,
  readyForStrictGate: blockers.length === 0 && sourceApproved(sourceCandidate) && threat.accepted,
  commands: {
    preview: `npm run sandbox:preview -- --id ${id} --with diver --serve --open --visual`,
    visualCheck: `npm run sandbox:visual -- --ids ${id} --states idle,lunge,stunned --with diver --report tools/scratch/sandbox-visuals-${id}-report.json --out-dir tools/scratch/sandbox-visuals-${id}`,
    reviewGallery: 'npm run review:articulated:quick',
    sourceGallery: 'npm run source:gallery',
    acceptanceAudit: `npm run content:acceptance-audit -- --id ${id}`,
    sourceApprovalDryRun: sourceApprovalCommand(sourceCandidate),
    threatAcceptanceDryRun: threatAcceptanceCommand(id, sourceCandidate?.id),
  },
};

await mkdir(dirname(jsonOut), { recursive: true });
await mkdir(dirname(markdownOut), { recursive: true });
await writeFile(jsonOut, `${JSON.stringify(pack, null, 2)}\n`);
await writeFile(markdownOut, markdownFor(pack));

console.log(JSON.stringify({
  id,
  jsonOut,
  markdownOut,
  sourceApproved: pack.sourceCandidate?.approved ?? false,
  threatAccepted: pack.threat.accepted,
  blockers: pack.blockers.length,
  readyForStrictGate: pack.readyForStrictGate,
}, null, 2));

import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { MIN_VISUAL_NOTE_LENGTH, distinctReviewNotes, meaningfulReviewText, reviewNoteHasEvidenceTerms } from './review_text_quality.mjs';
import {
  rigAcceptedStrict,
  sourceApprovedStrict,
  sourceArtContractRecorded as strictSourceArtContractRecorded,
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

const jsonOnly = args.has('json');
const minThreats = Number(args.get('min-threats') ?? 20);
const paths = {
  research: resolve(String(args.get('research') ?? 'public/review/source-candidates/research-briefs.json')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  sourceReview: resolve(String(args.get('source-review') ?? 'public/review/source-candidates/review-manifest.json')),
  sourceReviewDossier: resolve(String(args.get('source-review-dossier') ?? 'public/review/source-candidates/source-review-dossier.json')),
  sourceRejections: resolve(String(args.get('source-rejections') ?? 'public/review/source-candidates/rejected-attempts.json')),
  researchAudits: resolve(String(args.get('research-audits') ?? 'public/review/source-candidates/research-subagent-audits-summary.json')),
  researchSourceTrace: resolve(String(args.get('research-source-trace') ?? 'public/review/source-candidates/research-source-trace.json')),
  riggingPackIndex: resolve(String(args.get('rigging-pack-index') ?? 'public/review/rigging-packs/index.json')),
  sourceGenerationQueue: resolve(String(args.get('source-generation-queue') ?? 'public/review/source-candidates/source-generation-queue.json')),
  sourceGenerationSprint: resolve(String(args.get('source-generation-sprint') ?? 'public/review/source-candidates/source-generation-sprint.json')),
  sourceAcquisitionRunbook: resolve(String(args.get('source-acquisition-runbook') ?? 'public/review/source-candidates/source-acquisition-runbook.json')),
  sourceIngestReadiness: resolve(String(args.get('source-ingest-readiness') ?? 'public/review/source-candidates/source-ingest-readiness.json')),
  sourceInboxReview: resolve(String(args.get('source-inbox-review') ?? 'public/review/source-inbox/manifest.json')),
  sourceImagegenMarker: resolve(String(args.get('source-imagegen-marker') ?? 'tools/scratch/source-imagegen-handoff-marker.json')),
  prompts: resolve(String(args.get('prompts') ?? 'public/review/source-candidates/imagen-prompts.jsonl')),
  runtime: resolve(String(args.get('runtime') ?? 'public/assets/generated/articulated-creatures.parts.json')),
  articulatedReview: resolve(String(args.get('articulated-review') ?? 'public/review/articulated/review-manifest.json')),
  acceptanceRunway: resolve(String(args.get('acceptance-runway') ?? 'public/review/content-acceptance-runway.json')),
  sandboxIndex: resolve(String(args.get('sandbox-index') ?? 'public/review/sandbox/manifest.json')),
  sandboxReport: resolve(String(args.get('sandbox-report') ?? 'tools/scratch/sandbox-visuals-report.json')),
  sandboxReportDir: resolve(String(args.get('sandbox-report-dir') ?? 'tools/scratch')),
  sourcePreviewReport: resolve(String(args.get('source-preview-report') ?? 'tools/scratch/source-preview-visuals-report.json')),
  acceptanceLedger: resolve(String(args.get('acceptance-ledger') ?? 'public/review/content-acceptance-ledger.json')),
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

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    return { ...fallback, _error: error.message };
  }
}

async function readLines(path) {
  try {
    const text = await readFile(path, 'utf8');
    return text.split('\n').filter((line) => line.trim()).length;
  } catch {
    return 0;
  }
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'candidate';
}

function qualityHash(quality) {
  return createHash('sha256').update(stableJson(quality ?? null)).digest('hex');
}

function asRepoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

async function fileExists(path, minSize = 128) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size >= minSize;
  } catch {
    return false;
  }
}

async function imageFileInfo(path, minSize = 512) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size >= minSize
      ? { path, bytes: info.size, mtime: info.mtime.toISOString() }
      : null;
  } catch {
    return null;
  }
}

async function findInboxImage(inboxDir, id) {
  const extensions = ['.png', '.jpg', '.jpeg', '.webp'];
  for (const extension of extensions) {
    const path = resolve(inboxDir, `${id}${extension}`);
    const info = await imageFileInfo(path);
    if (info) return info;
  }
  return null;
}

async function findSandboxReportPaths() {
  const pathsByName = new Map([
    [paths.sandboxReport, paths.sandboxReport],
    [paths.sourcePreviewReport, paths.sourcePreviewReport],
  ]);
  let entries = [];
  try {
    entries = await readdir(paths.sandboxReportDir, { withFileTypes: true });
  } catch {
    return [...pathsByName.values()];
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (
      !/^sandbox.*report.*\.json$/.test(entry.name)
      && !/^sandbox-visuals.*report.*\.json$/.test(entry.name)
      && !/^[a-z0-9_-]+-visuals-report\.json$/.test(entry.name)
    ) continue;
    const path = resolve(paths.sandboxReportDir, entry.name);
    pathsByName.set(path, path);
  }
  return [...pathsByName.values()].sort();
}

async function loadSandboxReports() {
  const reports = [];
  for (const path of await findSandboxReportPaths()) {
    const report = await readJson(path, { schema: null, results: [], _error: 'missing' });
    if (report.schema !== 'water9/sandbox-visual-check@1') continue;
    reports.push({ path, report });
  }
  return reports;
}

function countByStatus(items) {
  const counts = {};
  for (const item of items) counts[item.status ?? 'missing'] = (counts[item.status ?? 'missing'] ?? 0) + 1;
  return counts;
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

function approvedSourceCandidate(candidate) {
  return sourceApprovedStrict(candidate);
}

function sourceArtContractRecorded(candidate) {
  return strictSourceArtContractRecorded(candidate);
}

function sourceImageValidationRecorded(candidate) {
  return strictSourceImageValidationRecorded(candidate);
}

function acceptedThreat(creature) {
  return rigAcceptedStrict(creature);
}

function ledgerBackedThreat(creature, ledgerById) {
  if (!acceptedThreat(creature)) return false;
  const entry = ledgerById.get(creature.id);
  return Boolean(entry)
    && entry.status === 'accepted'
    && entry.decision === 'human-approved'
    && entry.tool === 'tools/accept_articulated_creature.mjs'
    && entry.qualitySha256 === qualityHash(creature.quality)
    && String(entry.sourceCandidateId ?? '') === String(creature.quality?.sourceCandidateId ?? '')
    && String(entry.reviewedBy ?? '') === String(creature.quality?.reviewedBy ?? '')
    && String(entry.reviewedAt ?? '') === String(creature.quality?.reviewedAt ?? '')
    && String(entry.acceptanceNote ?? '') === String(creature.quality?.acceptanceNote ?? '');
}

const research = await readJson(paths.research, { schema: null, briefs: [] });
const researchAudits = await readJson(paths.researchAudits, { schema: null, auditFiles: 0, auditedLanes: [], auditedCandidates: [], missingLanes: [], missingCandidates: [] });
const researchSourceTrace = await readJson(paths.researchSourceTrace, { schema: null, summary: {}, records: [] });
const riggingPackIndex = await readJson(paths.riggingPackIndex, { schema: null, packs: [] });
const sourceCandidates = await readJson(paths.sourceCandidates, { schema: null, candidates: [] });
const sourceReview = await readJson(paths.sourceReview, { schema: null, candidates: [] });
const sourceReviewDossier = await readJson(paths.sourceReviewDossier, { schema: null, summary: {}, recommendedReview: null });
const sourceRejections = await readJson(paths.sourceRejections, { schema: null, attempts: [] });
const sourceGenerationQueue = await readJson(paths.sourceGenerationQueue, { schema: null, candidates: [] });
const sourceGenerationSprint = await readJson(paths.sourceGenerationSprint, { schema: null, ids: [], candidates: [], commands: {}, inboxDir: 'tools/source-inbox' });
const sourceAcquisitionRunbook = await readJson(paths.sourceAcquisitionRunbook, { schema: null, ids: [], candidates: [], batchCommands: {} });
const sourceIngestReadiness = await readJson(paths.sourceIngestReadiness, { schema: null, ids: [], candidates: [], summary: {}, batchCommands: {} });
const sourceInboxReview = await readJson(paths.sourceInboxReview, { schema: null, candidates: [] });
const sourceImagegenMarker = await readJson(paths.sourceImagegenMarker, { schema: null });
const runtime = await readJson(paths.runtime, { schema: null, creatures: [] });
const articulatedReview = await readJson(paths.articulatedReview, { schema: null, creatures: [] });
const acceptanceRunway = await readJson(paths.acceptanceRunway, { schema: null, summary: {}, recommendedByStage: {} });
const acceptanceLedger = await readJson(paths.acceptanceLedger, { schema: null, entries: [] });
const sandboxIndex = await readJson(paths.sandboxIndex, { schema: null, entries: [] });
const sandboxReport = await readJson(paths.sandboxReport, { schema: null, results: [] });
const sandboxReports = await loadSandboxReports();
const briefs = Array.isArray(research.briefs) ? research.briefs : [];
const candidates = Array.isArray(sourceCandidates.candidates) ? sourceCandidates.candidates : [];
const sourceReviewItems = Array.isArray(sourceReview.candidates) ? sourceReview.candidates : [];
const rejectedAttempts = Array.isArray(sourceRejections.attempts) ? sourceRejections.attempts : [];
const queuedSourceGeneration = Array.isArray(sourceGenerationQueue.candidates) ? sourceGenerationQueue.candidates : [];
const sourceInboxReviewItems = Array.isArray(sourceInboxReview.candidates) ? sourceInboxReview.candidates : [];
const sprintIds = Array.isArray(sourceGenerationSprint.ids) ? sourceGenerationSprint.ids : [];
const sprintInboxDir = sourceGenerationSprint.inboxDir ?? 'tools/source-inbox';
const sprintCards = Array.isArray(sourceGenerationSprint.candidates) ? sourceGenerationSprint.candidates : [];
const captureFirstCards = sprintCards.filter((card) => card.captureFirst === true);
const sprintFirstCard = sprintCards[0] ?? null;
function sprintCommand(key, fallback = null) {
  const commands = sourceGenerationSprint.commands ?? {};
  return Object.prototype.hasOwnProperty.call(commands, key) ? commands[key] : fallback;
}
const creatures = Array.isArray(runtime.creatures) ? runtime.creatures : [];
const acceptanceLedgerEntries = Array.isArray(acceptanceLedger.entries) ? acceptanceLedger.entries : [];
const acceptanceLedgerById = new Map(acceptanceLedgerEntries.map((entry) => [entry.id, entry]));
const reviewCreatures = Array.isArray(articulatedReview.creatures) ? articulatedReview.creatures : [];
const sandboxIndexEntries = Array.isArray(sandboxIndex.entries) ? sandboxIndex.entries : [];
const sandboxIndexById = new Map(sandboxIndexEntries.map((entry) => [entry.id, entry]));
const sandboxResults = Array.isArray(sandboxReport.results) ? sandboxReport.results : [];
const aggregateSandboxResults = sandboxReports.flatMap(({ report }) => Array.isArray(report.results) ? report.results : []);
const uniqueSandboxIds = new Set(aggregateSandboxResults.map((result) => result.id).filter(Boolean));
const sandboxKinds = {};
for (const id of uniqueSandboxIds) {
  const result = aggregateSandboxResults.find((item) => item.id === id);
  const kind = sandboxIndexById.get(id)?.kind ?? result?.kind ?? 'unknown';
  sandboxKinds[kind] = (sandboxKinds[kind] ?? 0) + 1;
}
const sourceImageChecks = await Promise.all(candidates.map(async (candidate) => ({
  id: candidate.id,
  hasSource: Boolean(candidate.source) && await fileExists(resolve(candidate.source), 512),
})));
const riggingPackEntries = Array.isArray(riggingPackIndex.packs) ? riggingPackIndex.packs : [];
const riggingPackDetails = await Promise.all(riggingPackEntries.map(async (entry) => ({
  entry,
  pack: await readJson(resolve(entry.json ?? ''), { schema: null, commands: {}, blockers: [] }),
})));
const recommendedRiggingPack = riggingPackDetails.find(({ pack }) => pack.stage !== 'accepted') ?? riggingPackDetails[0] ?? null;
const sourcePreviewIds = candidates
  .filter((candidate) => candidate.source)
  .map((candidate) => `source-${candidate.id}`);
const sourcePreviewIdSet = new Set(sourcePreviewIds);
const sourcePreviewResults = aggregateSandboxResults.filter((result) => sourcePreviewIdSet.has(result.id));
const sourcePreviewResultIds = new Set(sourcePreviewResults.map((result) => result.id));
const sourcePreviewFailures = sourcePreviewResults.flatMap((result) => result.failures ?? []);
const sprintInboxChecks = await Promise.all(sprintIds.map(async (id) => {
  const image = await findInboxImage(sprintInboxDir, id);
  return {
    id,
    hasInboxImage: Boolean(image),
    path: image ? asRepoRelative(image.path) : null,
    bytes: image?.bytes ?? null,
    mtime: image?.mtime ?? null,
  };
}));

const qualityAcceptedThreats = creatures.filter(acceptedThreat);
const acceptedThreats = creatures.filter((creature) => ledgerBackedThreat(creature, acceptanceLedgerById));
const approvedSources = candidates.filter(approvedSourceCandidate);
const sourceRejectionStats = rejectionStats(rejectedAttempts);
const missingArtifactAttemptsByCandidate = new Map();
for (const attempt of rejectedAttempts.filter((item) => rejectionKind(item) === 'missing-artifact')) {
  const candidateId = attempt.candidateId ?? 'unknown';
  const list = missingArtifactAttemptsByCandidate.get(candidateId) ?? [];
  list.push(attempt);
  missingArtifactAttemptsByCandidate.set(candidateId, list);
}
const activeMarkerCandidateId = sourceImagegenMarker?.schema === 'water9/source-imagegen-handoff-marker@1'
  ? sourceImagegenMarker.candidateId ?? null
  : null;
const currentSourceQueueTarget = queuedSourceGeneration[0]?.id ?? null;
const queuedSourceIds = new Set(queuedSourceGeneration.map((candidate) => candidate.id));
const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
const activeMarkerCandidate = activeMarkerCandidateId ? candidateById.get(activeMarkerCandidateId) ?? null : null;
const activeMarkerInQueue = activeMarkerCandidateId ? queuedSourceIds.has(activeMarkerCandidateId) : false;
const activeMarkerHasSource = Boolean(activeMarkerCandidate?.source);
const activeMarkerIsHistorical = Boolean(activeMarkerCandidateId && (!activeMarkerInQueue || activeMarkerHasSource));
const activeMarkerMissingAttempts = activeMarkerCandidateId
  ? (missingArtifactAttemptsByCandidate.get(activeMarkerCandidateId) ?? [])
  : [];
const allMissingArtifactAttempts = rejectedAttempts.filter((item) => rejectionKind(item) === 'missing-artifact');
const activeBlockerMissingArtifactAttempts = allMissingArtifactAttempts.filter((attempt) => {
  const candidate = candidateById.get(attempt.candidateId);
  return queuedSourceIds.has(attempt.candidateId) && !candidate?.source;
});
const historicalMissingArtifactAttempts = allMissingArtifactAttempts.filter((attempt) => !activeBlockerMissingArtifactAttempts.includes(attempt));
const summary = {
  targetThreats: minThreats,
  research: {
    schema: research.schema ?? null,
    briefs: briefs.length,
    statuses: countByStatus(briefs),
    subagentAudits: {
      schema: researchAudits.schema ?? null,
      files: researchAudits.auditFiles ?? 0,
      auditedLanes: researchAudits.auditedLanes?.length ?? 0,
      missingLanes: researchAudits.missingLanes?.length ?? 0,
      auditedCandidates: researchAudits.auditedCandidates?.length ?? 0,
      missingCandidates: researchAudits.missingCandidates?.length ?? 0,
    },
    sourceTrace: {
      schema: researchSourceTrace.schema ?? null,
      records: researchSourceTrace.summary?.candidates ?? researchSourceTrace.records?.length ?? 0,
      assignedToSubagents: researchSourceTrace.summary?.assignedToSubagents ?? 0,
      auditedCandidates: researchSourceTrace.summary?.auditedCandidates ?? 0,
      queued: researchSourceTrace.summary?.queued ?? 0,
      queuedWithAuditGuidance: researchSourceTrace.summary?.queuedWithAuditGuidance ?? 0,
      queuedPromptAuditHardening: researchSourceTrace.summary?.queuedPromptAuditHardening ?? 0,
      sprint: researchSourceTrace.summary?.sprint ?? 0,
      html: 'public/review/source-candidates/research-source-trace.html',
      rebuildCommand: 'npm run research:source-trace',
      validateCommand: 'npm run research:source-trace-check',
    },
  },
  sourceCandidates: {
    schema: sourceCandidates.schema ?? null,
    candidates: candidates.length,
    statuses: countByStatus(candidates),
    withSourceImage: sourceImageChecks.filter((item) => item.hasSource).length,
    approved: approvedSources.length,
    reviewItems: sourceReviewItems.length,
    reviewDossier: {
      schema: sourceReviewDossier.schema ?? null,
      pendingReview: sourceReviewDossier.summary?.pendingReview ?? null,
      readyForHumanReview: sourceReviewDossier.summary?.readyForHumanReview ?? null,
      reviewBlocked: sourceReviewDossier.summary?.reviewBlocked ?? null,
      reviewPackets: (sourceReviewDossier.items ?? []).filter((item) => item.hasSource && item.reviewPacket?.file).length,
      recommendedReview: sourceReviewDossier.recommendedReview ?? null,
      recommendedPacket: sourceReviewDossier.recommendedReview?.id
        ? (sourceReviewDossier.items ?? []).find((item) => item.id === sourceReviewDossier.recommendedReview.id)?.reviewPacket ?? null
        : null,
      readyReviewQueue: sourceReviewDossier.readyReviewQueue ?? [],
      rebuildCommand: 'npm run source:review-dossier',
      validateCommand: 'npm run source:review-dossier-check',
    },
    rejectedAttempts: rejectedAttempts.length,
    rejectionStats: sourceRejectionStats,
  },
  sourcePreviews: {
    expected: sourcePreviewIds.length,
    checked: sourcePreviewResultIds.size,
    missing: sourcePreviewIds.filter((id) => !sourcePreviewResultIds.has(id)),
    failures: sourcePreviewFailures.length,
    report: asRepoRelative(paths.sourcePreviewReport),
  },
  riggingPacks: {
    schema: riggingPackIndex.schema ?? null,
    packs: riggingPackEntries.length,
    sourceImageCoverage: sourceImageChecks.filter((item) => item.hasSource).length,
    stageCounts: riggingPackEntries.reduce((counts, entry) => {
      counts[entry.stage ?? 'unknown'] = (counts[entry.stage ?? 'unknown'] ?? 0) + 1;
      return counts;
    }, {}),
    runtimeRegistered: riggingPackEntries.filter((entry) => entry.runtimeRegistered === true).length,
    threatAccepted: riggingPackEntries.filter((entry) => entry.threatAccepted === true).length,
    recommended: recommendedRiggingPack
      ? {
        id: recommendedRiggingPack.entry.id,
        species: recommendedRiggingPack.entry.species,
        stage: recommendedRiggingPack.pack.stage ?? recommendedRiggingPack.entry.stage ?? null,
        packet: recommendedRiggingPack.entry.markdown ?? null,
        blockers: recommendedRiggingPack.pack.blockers ?? [],
        sourcePreviewCommand: recommendedRiggingPack.pack.commands?.sourcePreview ?? null,
        runtimePreviewCommand: recommendedRiggingPack.pack.commands?.runtimePreview ?? null,
        sandboxVisualCommand: recommendedRiggingPack.pack.commands?.sandboxVisual ?? null,
        acceptanceAuditCommand: recommendedRiggingPack.pack.commands?.acceptanceAudit ?? null,
      }
      : null,
    rebuildCommand: 'npm run content:rigging-pack',
    validateCommand: 'npm run content:rigging-pack-check',
  },
  prompts: {
    jsonlRecords: await readLines(paths.prompts),
  },
  sourceGenerationQueue: {
    schema: sourceGenerationQueue.schema ?? null,
    candidates: queuedSourceGeneration.length,
    top: queuedSourceGeneration.slice(0, 3).map((item) => item.id),
  },
  sourceGenerationSprint: {
    schema: sourceGenerationSprint.schema ?? null,
    ids: sprintIds,
    captureFirstIds: captureFirstCards.map((card) => card.id),
    firstTarget: sprintFirstCard ? {
      id: sprintFirstCard.id,
      species: sprintFirstCard.species,
      captureFirst: Boolean(sprintFirstCard.captureFirst),
      missingArtifactAttempts: sprintFirstCard.missingArtifactAttempts ?? 0,
      captureReason: sprintFirstCard.captureReason ?? null,
      recommendedFirst: sprintFirstCard.commands?.captureInbox ?? sprintCommand('firstRecommended'),
      recommendedFallback: sprintFirstCard.commands?.recoverSavedFile ?? sprintCommand('firstFallback'),
    } : null,
    inboxDir: sprintInboxDir,
    inboxReady: sprintInboxChecks.filter((item) => item.hasInboxImage).length,
    inboxMissing: sprintInboxChecks.filter((item) => !item.hasInboxImage).map((item) => item.id),
    inboxImages: sprintInboxChecks,
    commands: {
      firstRecommended: sprintCommand('firstRecommended', sprintFirstCard?.commands?.captureInbox ?? null),
      firstFallback: sprintCommand('firstFallback', sprintFirstCard?.commands?.recoverSavedFile ?? null),
      firstRecoveryScout: sprintCommand('firstRecoveryScout', sprintFirstCard?.commands?.recoveryScout ?? null),
      firstDataUrlRecovery: sprintCommand('firstDataUrlRecovery', sprintFirstCard?.commands?.recoverDataUrl ?? null),
      firstBase64Recovery: sprintCommand('firstBase64Recovery', sprintFirstCard?.commands?.recoverBase64 ?? null),
      startFirstSession: sprintCommand('startFirstSession'),
      checkFirstSession: sprintCommand('checkFirstSession', sprintIds[0] ? `npm run source:imagegen-status -- --id ${sprintIds[0]}` : null),
      autoIngestFirstSession: sprintCommand('autoIngestFirstSession', sprintFirstCard?.captureFirst ? null : (sprintIds[0] ? `npm run source:imagegen-status -- --id ${sprintIds[0]} --ingest` : null)),
      inboxCapture: sprintFirstCard?.commands?.captureInbox ?? 'npm run source:inbox-capture',
      inboxCheck: sprintCommand('inboxCheck'),
      inboxIngestDryRun: sprintCommand('inboxIngestDryRun'),
      recoverInline: sprintFirstCard?.captureFirst ? null : (sprintFirstCard?.commands?.recoverInline ?? (sprintIds[0] ? `npm run source:recover-inline -- --id ${sprintIds[0]} --copy --validate` : null)),
      recoverSavedFile: sprintFirstCard?.commands?.recoverSavedFile ?? null,
    },
    activeMarker: sourceImagegenMarker?.schema === 'water9/source-imagegen-handoff-marker@1'
      ? {
        candidateId: sourceImagegenMarker.candidateId ?? null,
        createdAt: sourceImagegenMarker.createdAt ?? null,
        generatedDir: sourceImagegenMarker.generatedDir ?? null,
        inCurrentQueue: activeMarkerInQueue,
        hasSource: activeMarkerHasSource,
        historical: activeMarkerIsHistorical,
        currentQueueTarget: currentSourceQueueTarget,
      }
      : null,
  },
  sourceAcquisitionRunbook: {
    schema: sourceAcquisitionRunbook.schema ?? null,
    ids: Array.isArray(sourceAcquisitionRunbook.ids) ? sourceAcquisitionRunbook.ids : [],
    ready: sourceAcquisitionRunbook.ready ?? 0,
    missing: sourceAcquisitionRunbook.missing ?? [],
    blocked: sourceAcquisitionRunbook.blocked ?? [],
    captureFirstIds: sourceAcquisitionRunbook.captureFirstIds ?? [],
    openaiApiKeyAvailable: Boolean(sourceAcquisitionRunbook.openaiApiKeyAvailable),
    markdown: 'public/review/source-candidates/source-acquisition-runbook.md',
    html: 'public/review/source-candidates/source-acquisition-runbook.html',
    rebuildCommand: 'npm run source:acquisition-runbook',
    validateCommand: 'npm run source:acquisition-runbook-check',
    batchCaptureCommand: sourceAcquisitionRunbook.batchCommands?.batchCapture ?? null,
    batchOpenAIDryRunCommand: sourceAcquisitionRunbook.batchCommands?.batchOpenAIDryRun ?? null,
    batchOpenAIApplyCommand: sourceAcquisitionRunbook.batchCommands?.batchOpenAIApply ?? null,
    advanceInboxDryRunCommand: sourceAcquisitionRunbook.batchCommands?.advanceInboxDryRun ?? null,
    advanceInboxApplyCommand: sourceAcquisitionRunbook.batchCommands?.advanceInboxApply ?? null,
    firstOpenAIDryRunCommand: sourceAcquisitionRunbook.batchCommands?.firstOpenAIDryRun ?? null,
    firstOpenAIApplyCommand: sourceAcquisitionRunbook.batchCommands?.firstOpenAIApply ?? null,
    firstCaptureCommand: sourceAcquisitionRunbook.batchCommands?.firstCapture ?? null,
    inboxCheckCommand: sourceAcquisitionRunbook.batchCommands?.inboxCheck ?? null,
    ingestDryRunCommand: sourceAcquisitionRunbook.batchCommands?.ingestDryRun ?? null,
    sourcePreviewCheckCommand: sourceAcquisitionRunbook.batchCommands?.sourcePreviewCheck ?? null,
  },
  sourceIngestReadiness: {
    schema: sourceIngestReadiness.schema ?? null,
    ids: Array.isArray(sourceIngestReadiness.ids) ? sourceIngestReadiness.ids : [],
    batchReady: Boolean(sourceIngestReadiness.batchReady),
    ready: sourceIngestReadiness.summary?.ready ?? 0,
    missing: sourceIngestReadiness.summary?.missing ?? 0,
    blocked: sourceIngestReadiness.summary?.blocked ?? 0,
    markdown: 'public/review/source-candidates/source-ingest-readiness.md',
    html: 'public/review/source-candidates/source-ingest-readiness.html',
    rebuildCommand: 'npm run source:ingest-readiness',
    validateCommand: 'npm run source:ingest-readiness-check',
    inboxCheckCommand: sourceIngestReadiness.batchCommands?.inboxCheck ?? null,
    ingestDryRunCommand: sourceIngestReadiness.batchCommands?.ingestDryRun ?? null,
    ingestApplyCommand: sourceIngestReadiness.batchCommands?.ingestApply ?? null,
  },
  sourceImagegen: {
    activeMarker: activeMarkerCandidateId
      ? {
        candidateId: activeMarkerCandidateId,
        createdAt: sourceImagegenMarker.createdAt ?? null,
        generatedDir: sourceImagegenMarker.generatedDir ?? null,
        missingArtifactAttemptsForCandidate: activeMarkerMissingAttempts.length,
        inCurrentQueue: activeMarkerInQueue,
        hasSource: activeMarkerHasSource,
        historical: activeMarkerIsHistorical,
        currentQueueTarget: currentSourceQueueTarget,
      }
      : null,
    openaiApiKeyAvailable: Boolean(process.env.OPENAI_API_KEY),
    missingArtifactAttempts: activeBlockerMissingArtifactAttempts.length,
    historicalMissingArtifactAttempts: historicalMissingArtifactAttempts.length,
    allMissingArtifactAttempts: sourceRejectionStats.missingArtifact,
    missingArtifactAttemptsByCandidate: [...missingArtifactAttemptsByCandidate.entries()]
      .map(([candidateId, attempts]) => ({
        candidateId,
        attempts: attempts.length,
        hasSource: Boolean(candidateById.get(candidateId)?.source),
        inCurrentQueue: queuedSourceIds.has(candidateId),
        latestAt: attempts.map((attempt) => attempt.rejectedAt).filter(Boolean).sort().at(-1) ?? null,
      }))
      .sort((left, right) => Number(right.inCurrentQueue) - Number(left.inCurrentQueue) || right.attempts - left.attempts || left.candidateId.localeCompare(right.candidateId))
      .slice(0, 8),
    healthCommand: 'npm run source:imagegen-health',
    recommendedAction: (() => {
      if (!activeMarkerCandidateId) {
        return 'Use source:imagegen-mark before generation and source:imagegen-status --ingest only when a recoverable file appears.';
      }
      if (activeMarkerIsHistorical) {
        return `The active imagegen marker for ${activeMarkerCandidateId} is historical; continue with current missing-source target ${currentSourceQueueTarget ?? 'none'}.`;
      }
      if (activeMarkerMissingAttempts.length >= 3) {
        return `Built-in image generation is not producing project-recoverable files for current target ${activeMarkerCandidateId}; use source:inbox-capture/manual save, or provide OPENAI_API_KEY and explicitly choose CLI fallback.`;
      }
      return `Continue source generation for ${activeMarkerCandidateId}; ingest only after a project-recoverable file appears.`;
    })(),
  },
  sourceInboxReview: {
    schema: sourceInboxReview.schema ?? null,
    candidates: sourceInboxReviewItems.length,
    ready: sourceInboxReview.ready ?? sourceInboxReviewItems.filter((item) => item.ready).length,
    blocked: sourceInboxReview.blocked ?? sourceInboxReviewItems.filter((item) => item.inboxImage && !item.ready).length,
    missing: sourceInboxReview.missing ?? sourceInboxReviewItems.filter((item) => !item.inboxImage).length,
    failures: Array.isArray(sourceInboxReview.failures) ? sourceInboxReview.failures.length : 0,
    reviewUrl: 'public/review/source-inbox/index.html',
    captureCommand: sourceInboxReview.captureCommand ?? 'npm run source:inbox-capture',
    recommendedTargetId: sourceInboxReview.recommendedTargetId ?? null,
    recommendedTargetStatus: sourceInboxReview.recommendedTargetStatus ?? null,
    recommendedCaptureCommand: sourceInboxReview.recommendedCaptureCommand ?? null,
    recommendedCommands: sourceInboxReview.recommendedCommands ?? null,
  },
  articulatedThreats: {
    schema: runtime.schema ?? null,
    registered: creatures.length,
    prototypes: creatures.filter((creature) => creature.quality?.status === 'prototype').length,
    qualityAccepted: qualityAcceptedThreats.length,
    accepted: acceptedThreats.length,
    acceptanceLedger: {
      schema: acceptanceLedger.schema ?? null,
      entries: acceptanceLedgerEntries.length,
      ledgerBackedAccepted: acceptedThreats.length,
    },
    reviewItems: reviewCreatures.length,
  },
  acceptanceRunway: {
    schema: acceptanceRunway.schema ?? null,
    candidates: acceptanceRunway.summary?.candidates ?? null,
    stageCounts: acceptanceRunway.summary?.stageCounts ?? {},
    candidatePackets: (acceptanceRunway.items ?? []).filter((item) => item.acceptancePacket?.file).length,
    unmappedPrototypeThreats: acceptanceRunway.summary?.unmappedPrototypeThreats ?? null,
    unmappedPrototypePackets: (acceptanceRunway.unmappedPrototypeThreats ?? []).filter((item) => item.packet?.file).length,
    recommendedByStage: acceptanceRunway.recommendedByStage ?? {},
    rebuildCommand: 'npm run content:acceptance-runway',
    validateCommand: 'npm run content:acceptance-runway-check',
  },
  sandbox: {
    schema: sandboxReport.schema ?? null,
    checked: sandboxResults.length,
    failures: sandboxResults.flatMap((result) => result.failures ?? []).length,
    reports: sandboxReports.length,
    aggregateChecked: aggregateSandboxResults.length,
    uniqueChecked: uniqueSandboxIds.size,
    indexEntries: sandboxIndexEntries.length,
    coverageRatio: sandboxIndexEntries.length ? Number((uniqueSandboxIds.size / sandboxIndexEntries.length).toFixed(3)) : null,
    byKind: sandboxKinds,
    aggregateFailures: aggregateSandboxResults.flatMap((result) => result.failures ?? []).length,
  },
};

summary.nextBottleneck = (() => {
  if (summary.sourceCandidates.candidates < minThreats) return `queue ${minThreats - summary.sourceCandidates.candidates} more source candidates`;
  if (summary.sourceCandidates.withSourceImage < minThreats) return `generate and ingest ${minThreats - summary.sourceCandidates.withSourceImage} more source images`;
  if (summary.sourcePreviews.checked < summary.sourcePreviews.expected || summary.sourcePreviews.failures > 0) return `fix source preview coverage for ${summary.sourcePreviews.missing.join(', ') || `${summary.sourcePreviews.failures} failing source previews`}`;
  if (summary.sourceCandidates.approved < minThreats) return `approve ${minThreats - summary.sourceCandidates.approved} source images after human review`;
  if (summary.articulatedThreats.registered < minThreats) return `rig ${minThreats - summary.articulatedThreats.registered} more approved source candidates`;
  if (summary.articulatedThreats.accepted < minThreats) return `accept ${minThreats - summary.articulatedThreats.accepted} rigged threats after full visual/sandbox review`;
  return 'strict content gate target reached';
})();

if (jsonOnly) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`Water9 content pipeline status`);
  console.log(`- Research briefs: ${summary.research.briefs} ${JSON.stringify(summary.research.statuses)}`);
  console.log(`- Research subagent audits: ${summary.research.subagentAudits.files} files, ${summary.research.subagentAudits.auditedLanes} lanes audited, ${summary.research.subagentAudits.missingCandidates} candidates missing audit`);
  console.log(`- Research source trace: ${summary.research.sourceTrace.queuedWithAuditGuidance}/${summary.research.sourceTrace.queued} queued prompts carry audit guidance, ${summary.research.sourceTrace.queuedPromptAuditHardening}/${summary.research.sourceTrace.queued} prompt files hardened`);
  console.log(`- Source candidates: ${summary.sourceCandidates.candidates} ${JSON.stringify(summary.sourceCandidates.statuses)}`);
  console.log(`- Source images ingested: ${summary.sourceCandidates.withSourceImage}/${minThreats}`);
  console.log(`- Source preview visuals: ${summary.sourcePreviews.checked}/${summary.sourcePreviews.expected} checked, failures: ${summary.sourcePreviews.failures}`);
  console.log(`- Rigging focus packs: ${summary.riggingPacks.packs}/${summary.riggingPacks.sourceImageCoverage} source images covered, stages: ${JSON.stringify(summary.riggingPacks.stageCounts)}`);
  if (summary.riggingPacks.recommended) {
    console.log(`- Rigging focus recommended packet: ${summary.riggingPacks.recommended.id} (${summary.riggingPacks.recommended.stage})`);
    if (summary.riggingPacks.recommended.sourcePreviewCommand) console.log(`- Rigging source preview: ${summary.riggingPacks.recommended.sourcePreviewCommand}`);
    if (summary.riggingPacks.recommended.runtimePreviewCommand) console.log(`- Rigging runtime preview: ${summary.riggingPacks.recommended.runtimePreviewCommand}`);
  }
  console.log(`- Source candidates approved: ${summary.sourceCandidates.approved}/${minThreats}`);
  console.log(`- Rejected source generation attempts: ${summary.sourceCandidates.rejectedAttempts} (${summary.sourceCandidates.rejectionStats.missingArtifact} missing artifact, ${summary.sourceCandidates.rejectionStats.visualRejection} visual, ${summary.sourceCandidates.rejectionStats.unclassified} unclassified)`);
  console.log(`- Source imagegen health: ${summary.sourceImagegen.recommendedAction}`);
  console.log(`- Source imagegen health command: ${summary.sourceImagegen.healthCommand}`);
  console.log(`- Imagen prompt records: ${summary.prompts.jsonlRecords}`);
  console.log(`- Source generation queue: ${summary.sourceGenerationQueue.candidates} candidates, top: ${summary.sourceGenerationQueue.top.join(', ') || 'none'}`);
  console.log(`- Source sprint inbox: ${summary.sourceGenerationSprint.inboxReady}/${summary.sourceGenerationSprint.ids.length} ready, missing: ${summary.sourceGenerationSprint.inboxMissing.join(', ') || 'none'}`);
  console.log(`- Source acquisition runbook: ${summary.sourceAcquisitionRunbook.ready}/${summary.sourceAcquisitionRunbook.ids.length} ready, capture-first: ${summary.sourceAcquisitionRunbook.captureFirstIds.join(', ') || 'none'}`);
  console.log(`- Source ingest readiness: ${summary.sourceIngestReadiness.ready}/${summary.sourceIngestReadiness.ids.length} ready, missing: ${summary.sourceIngestReadiness.missing}, blocked: ${summary.sourceIngestReadiness.blocked}`);
  if (summary.sourceGenerationSprint.firstTarget) {
    console.log(`- Source sprint first target: ${summary.sourceGenerationSprint.firstTarget.id}, capture-first: ${summary.sourceGenerationSprint.firstTarget.captureFirst ? 'yes' : 'no'}, missing-artifact attempts: ${summary.sourceGenerationSprint.firstTarget.missingArtifactAttempts}`);
    if (summary.sourceGenerationSprint.firstTarget.recommendedFirst) {
      console.log(`- Source sprint recommended first command: ${summary.sourceGenerationSprint.firstTarget.recommendedFirst}`);
    }
  }
  console.log(`- Source inbox review: ${summary.sourceInboxReview.ready}/${summary.sourceInboxReview.candidates} ready, ${summary.sourceInboxReview.blocked} blocked, ${summary.sourceInboxReview.missing} missing`);
  console.log(`- Source inbox capture: ${summary.sourceInboxReview.captureCommand}`);
  if (summary.sourceGenerationSprint.activeMarker) {
    console.log(`- Active source image marker: ${summary.sourceGenerationSprint.activeMarker.candidateId} at ${summary.sourceGenerationSprint.activeMarker.createdAt}`);
  }
  console.log(`- Articulated threats registered: ${summary.articulatedThreats.registered}`);
  console.log(`- Articulated threats accepted: ${summary.articulatedThreats.accepted}/${minThreats}`);
  console.log(`- Sandbox visual results: ${summary.sandbox.checked}, failures: ${summary.sandbox.failures}`);
  console.log(`- Sandbox visual aggregate: ${summary.sandbox.uniqueChecked}/${summary.sandbox.indexEntries} unique ids across ${summary.sandbox.reports} reports, failures: ${summary.sandbox.aggregateFailures}`);
  console.log(`- Next bottleneck: ${summary.nextBottleneck}`);
}

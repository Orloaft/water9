import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { basename, dirname, extname, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const defaultGeneratedDir = resolve(String(`${process.env.CODEX_HOME ?? `${homedir()}/.codex`}/generated_images`));
const markerPath = resolve(String(args.get('marker') ?? 'tools/scratch/source-imagegen-handoff-marker.json'));
const id = args.get('id') ?? args.get('candidate');
const mode = args.has('mark') ? 'mark' : args.has('status') ? 'status' : args.has('latest') ? 'latest' : args.has('health') ? 'health' : null;
const rejectMissing = args.has('reject-missing') || args.has('rejectMissing') || args.has('reject-no-file') || args.has('rejectNoFile');
const ingestHandoff = args.has('ingest') || args.has('ingest-handoff') || args.has('ingestHandoff');
const allowGeneratedDirDrift = args.has('allow-generated-dir-drift') || args.has('allowGeneratedDirDrift');
const dryRun = args.has('dry-run') || args.has('dryRun');
const overwrite = args.has('overwrite');
const skipImageCheck = args.has('skip-image-check') || args.has('skipImageCheck');
const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const sourceQueuePath = resolve(String(args.get('source-queue') ?? args.get('sourceQueue') ?? 'public/review/source-candidates/source-generation-queue.json'));
const rejectionPath = resolve(String(args.get('rejections') ?? 'public/review/source-candidates/rejected-attempts.json'));
const projectGeneratedDir = resolve(String(args.get('project-generated-dir') ?? 'public/assets/generated'));
const sourceInboxDir = resolve(String(args.get('source-inbox-dir') ?? 'tools/source-inbox'));
const captureHost = String(args.get('capture-host') ?? args.get('captureHost') ?? '127.0.0.1');
const capturePort = Number(args.get('capture-port') ?? args.get('capturePort') ?? 5188);
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const MANUAL_CAPTURE_THRESHOLD = 5;

function usage() {
  console.error('Usage: node tools/source_imagegen_handoff.mjs --mark --id <candidate-id>');
  console.error('   or: node tools/source_imagegen_handoff.mjs --status [--ingest] [--reject-missing] [--reason <text>]');
  console.error('   or: node tools/source_imagegen_handoff.mjs --latest');
  console.error('   or: node tools/source_imagegen_handoff.mjs --health');
}

function isImage(path) {
  const lower = path.toLowerCase();
  return [...imageExtensions].some((extension) => lower.endsWith(extension));
}

async function walkImages(dir) {
  const results = [];
  async function walk(path) {
    let entries;
    try {
      entries = await readdir(path, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const child = resolve(path, entry.name);
      if (entry.isDirectory()) {
        await walk(child);
      } else if (entry.isFile() && isImage(child)) {
        const info = await stat(child);
        results.push({
          path: child,
          size: info.size,
          mtimeMs: Math.round(info.mtimeMs),
          mtime: info.mtime.toISOString(),
        });
      }
    }
  }
  await walk(dir);
  return results.sort((left, right) => right.mtimeMs - left.mtimeMs || left.path.localeCompare(right.path));
}

function summarize(files) {
  const newest = files[0] ?? null;
  return {
    count: files.length,
    newest,
    files,
  };
}

function safeTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

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

async function recordMissingHandoffRejection(marker, generatedDir) {
  const candidateId = marker.candidateId;
  const reason = String(args.get('reason') ?? args.get('reject-reason') ?? `No new image file appeared under ${generatedDir} after image generation.`);
  if (reason.trim().length < 24) throw new Error('--reason must explain the missing image artifact');

  const manifest = await readJson(manifestPath, null);
  if (manifest?.schema !== 'water9/source-candidates@1') {
    throw new Error(`Unexpected source candidate schema ${manifest?.schema ?? 'missing'}`);
  }
  const candidate = (manifest.candidates ?? []).find((entry) => entry.id === candidateId);
  if (!candidate) throw new Error(`No source candidate found with id ${candidateId}`);

  const rejections = await readJson(rejectionPath, { schema: 'water9/source-rejected-attempts@1', attempts: [] });
  if (rejections.schema !== 'water9/source-rejected-attempts@1') {
    throw new Error(`Unexpected rejection manifest schema ${rejections.schema ?? 'missing'}`);
  }
  rejections.attempts = Array.isArray(rejections.attempts) ? rejections.attempts : [];
  const duplicate = rejections.attempts.find((attempt) => (
    attempt.candidateId === candidateId
    && attempt.sourceImagegenMarker?.createdAt === marker.createdAt
    && attempt.sourceImagegenMarker?.generatedDir === generatedDir
  ));
  if (duplicate) return { attempt: duplicate, duplicate: true };

  const rejectedAt = new Date();
  const attempt = {
    id: `${candidateId}-${safeTimestamp(rejectedAt)}`,
    candidateId,
    species: candidate.species,
    rejectedAt: rejectedAt.toISOString(),
    attemptKind: 'missing-artifact',
    reason,
    originalImage: null,
    copiedImage: null,
    sourceBytes: null,
    candidateStatusAtRejection: candidate.status,
    promptSnapshot: candidate.prompt,
    requiredRead: candidate.requiredRead ?? [],
    promptRisks: candidate.promptRisks ?? [],
    sourceImagegenMarker: {
      markerPath,
      createdAt: marker.createdAt,
      generatedDir,
      previousFileCount: marker.fileCount,
      newestBefore: marker.newestBefore ?? null,
    },
  };
  rejections.attempts.push(attempt);
  if (!dryRun) {
    await mkdir(dirname(rejectionPath), { recursive: true });
    await writeFile(rejectionPath, `${JSON.stringify(rejections, null, 2)}\n`);
  }
  return { attempt, duplicate: false };
}

function manualInboxPath(candidateId) {
  return resolve(sourceInboxDir, `${candidateId}.png`);
}

function captureUrl(candidateId) {
  return `http://${captureHost}:${capturePort}/?id=${encodeURIComponent(candidateId)}`;
}

function singleTargetPostCaptureCommands(candidateId) {
  return [
    `npm run source:inbox-check -- --dir ${asRepoRelative(sourceInboxDir)} --strict --ids ${candidateId}`,
    `npm run source:ingest-current -- --id ${candidateId} --dry-run`,
    `npm run source:ingest-current -- --id ${candidateId} --apply`,
    `npm run sandbox:preview -- --id ${candidateId} --kind source --serve --open --visual`,
    'npm run source:review-dossier && npm run source:review-dossier-check',
  ];
}

function manualInboxInstructions(candidateId, missingArtifactAttempts = 0) {
  const inboxPath = asRepoRelative(manualInboxPath(candidateId));
  const manualCaptureRequired = missingArtifactAttempts >= MANUAL_CAPTURE_THRESHOLD;
  return {
    schema: 'water9/source-manual-inbox@1',
    target: inboxPath,
    captureUrl: captureUrl(candidateId),
    threshold: MANUAL_CAPTURE_THRESHOLD,
    missingArtifactAttempts,
    manualCaptureRequired,
    noMoreInlineRetries: manualCaptureRequired,
    note: manualCaptureRequired
      ? 'Capture-first hard stop is active. Do not retry inline auto-handoff; capture/save a real image into the source inbox, then run the single-target ingest lane.'
      : 'If the built-in image rendered only inline, open the capture page, paste or drop the image, then ingest it after validation.',
    inlineProgrammaticAccess: false,
    inlineRecoveryRequires: [
      'a saved image file passed with --image',
      'an image data URL piped to --data-url-stdin',
      'raw image base64 piped to --stdin-base64 with --stdin-filename',
      'a pasted/dropped/selected image in source:inbox-capture',
    ],
    commands: [
      `npm run source:inbox-capture -- --id ${candidateId} --open`,
      `npm run source:recover-inline -- --id ${candidateId} --image <saved-image-path> --copy --validate`,
      `npm run source:recover-inline -- --id ${candidateId} --data-url-stdin --copy --validate`,
      `npm run source:recover-inline -- --id ${candidateId} --stdin-base64 --stdin-filename ${candidateId}.png --copy --validate`,
      ...singleTargetPostCaptureCommands(candidateId),
      'npm run source:check',
      'npm run source:gallery',
    ],
  };
}

async function readOptionalMarker() {
  try {
    const data = JSON.parse(await readFile(markerPath, 'utf8'));
    return data?.schema === 'water9/source-imagegen-handoff-marker@1' ? data : null;
  } catch {
    return null;
  }
}

function rejectionKind(attempt) {
  if (attempt.copiedImage) return 'visual-rejection';
  if (attempt.sourceImagegenMarker || /no (new |recoverable |accessible )?(saved |source )?(image )?file|did not create an accessible source image file|no project-bound artifact|inline/i.test(String(attempt.reason ?? ''))) {
    return 'missing-artifact';
  }
  return 'unclassified';
}

async function buildHealthReport(generatedFiles) {
  const marker = await readOptionalMarker();
  const rejections = await readJson(rejectionPath, { schema: 'water9/source-rejected-attempts@1', attempts: [] });
  const manifest = await readJson(manifestPath, { schema: null, candidates: [] });
  const sourceQueue = await readJson(sourceQueuePath, { schema: null, candidates: [] });
  const sourceById = new Map((manifest.candidates ?? []).map((candidate) => [candidate.id, candidate]));
  const queuedSourceIds = new Set((sourceQueue.candidates ?? []).map((candidate) => candidate.id));
  const currentQueueTarget = sourceQueue.candidates?.[0]?.id ?? null;
  const attempts = Array.isArray(rejections.attempts) ? rejections.attempts : [];
  const missingArtifacts = attempts.filter((attempt) => rejectionKind(attempt) === 'missing-artifact');
  const activeBlockerMissingArtifacts = missingArtifacts.filter((attempt) => {
    const candidate = sourceById.get(attempt.candidateId);
    return queuedSourceIds.has(attempt.candidateId) && !candidate?.source;
  });
  const historicalMissingArtifacts = missingArtifacts.filter((attempt) => !activeBlockerMissingArtifacts.includes(attempt));
  const byCandidate = new Map();
  for (const attempt of missingArtifacts) {
    const candidateId = attempt.candidateId ?? 'unknown';
    const list = byCandidate.get(candidateId) ?? [];
    list.push(attempt);
    byCandidate.set(candidateId, list);
  }
  const activeCandidateMissingArtifacts = marker?.candidateId
    ? (byCandidate.get(marker.candidateId) ?? [])
    : [];
  const activeMarkerCandidate = marker?.candidateId ? sourceById.get(marker.candidateId) ?? null : null;
  const activeMarkerInQueue = marker?.candidateId ? queuedSourceIds.has(marker.candidateId) : false;
  const activeMarkerHasSource = Boolean(activeMarkerCandidate?.source);
  const activeMarkerIsHistorical = Boolean(marker?.candidateId && (!activeMarkerInQueue || activeMarkerHasSource));
  const newest = generatedFiles[0] ?? null;
  const builtInRecoverable = generatedFiles.length > 0;
  const cliFallbackAvailable = Boolean(process.env.OPENAI_API_KEY);
  return {
    schema: 'water9/source-imagegen-health@1',
    generatedAt: new Date().toISOString(),
    generatedDir,
    markerPath,
    generatedFiles: generatedFiles.length,
    newest,
    openaiApiKeyAvailable: cliFallbackAvailable,
    activeMarker: marker ? {
      candidateId: marker.candidateId,
      createdAt: marker.createdAt,
      generatedDir: marker.generatedDir ?? null,
      previousFileCount: marker.fileCount ?? null,
      newestBefore: marker.newestBefore ?? null,
      missingArtifactAttemptsForCandidate: activeCandidateMissingArtifacts.length,
      status: activeMarkerCandidate?.status ?? null,
      hasSource: activeMarkerHasSource,
      inCurrentQueue: activeMarkerInQueue,
      historical: activeMarkerIsHistorical,
      currentQueueTarget,
      manualInbox: manualInboxInstructions(marker.candidateId, activeCandidateMissingArtifacts.length),
    } : null,
    missingArtifactAttempts: missingArtifacts.length,
    historicalMissingArtifactAttempts: historicalMissingArtifacts.length,
    activeBlockerMissingArtifactAttempts: activeBlockerMissingArtifacts.length,
    missingArtifactAttemptsByCandidate: [...byCandidate.entries()]
      .map(([candidateId, list]) => ({
        candidateId,
        attempts: list.length,
        hasSource: Boolean(sourceById.get(candidateId)?.source),
        inCurrentQueue: queuedSourceIds.has(candidateId),
        latestAt: list.map((attempt) => attempt.rejectedAt).filter(Boolean).sort().at(-1) ?? null,
      }))
      .sort((left, right) => Number(right.inCurrentQueue) - Number(left.inCurrentQueue) || right.attempts - left.attempts || left.candidateId.localeCompare(right.candidateId)),
    recommendedAction: (() => {
      if (marker && activeMarkerIsHistorical) {
        return `The active marker for ${marker.candidateId} is historical; continue with current missing-source target ${currentQueueTarget ?? 'none'}.`;
      }
      if (marker && activeCandidateMissingArtifacts.length >= 3 && !cliFallbackAvailable) {
        return `Built-in image generation has repeatedly produced no recoverable file for ${marker.candidateId}. Use source:inbox-capture/manual save for inline output, or provide OPENAI_API_KEY and explicitly choose CLI fallback.`;
      }
      if (marker && activeCandidateMissingArtifacts.length >= 3 && cliFallbackAvailable) {
        return `Built-in image generation has repeatedly produced no recoverable file for ${marker.candidateId}. Ask before switching to CLI fallback, then ingest the saved output through tools/source-inbox.`;
      }
      if (!builtInRecoverable) {
        return 'No generated image files are visible in the configured generated directory. Use source:inbox-capture/manual save if the client renders images inline only.';
      }
      return 'Generated image files are visible; use source:imagegen-mark before generation and source:imagegen-status --ingest after generation.';
    })(),
  };
}

async function ingestHandoffImage(marker, handoffFile) {
  const candidateId = marker.candidateId;
  const manifest = await readJson(manifestPath, null);
  if (manifest?.schema !== 'water9/source-candidates@1') {
    throw new Error(`Unexpected source candidate schema ${manifest?.schema ?? 'missing'}`);
  }
  const candidate = (manifest.candidates ?? []).find((entry) => entry.id === candidateId);
  if (!candidate) throw new Error(`No source candidate found with id ${candidateId}`);
  if (candidate.status === 'approved' || candidate.status === 'rigged') {
    throw new Error(`Refusing to replace source image for ${candidateId} while status is ${candidate.status}; set it back to needs-review intentionally first.`);
  }
  if (candidate.source && !overwrite) {
    throw new Error(`Refusing to replace existing source ${candidate.source} for ${candidateId}; pass --overwrite only if replacing intentionally.`);
  }
  const inputPath = resolve(handoffFile.path);
  const info = await stat(inputPath);
  if (!info.isFile() || info.size < 512) throw new Error(`handoff image ${inputPath} is missing or too small`);
  const extension = extname(inputPath).toLowerCase();
  if (!imageExtensions.has(extension)) throw new Error(`handoff image ${inputPath} must use one of: ${[...imageExtensions].join(', ')}`);
  const imageCheck = validateSourceImage(candidateId, inputPath);
  if (imageCheck.failures.length) {
    throw new Error(`handoff image failed mechanical source validation: ${imageCheck.failures.join('; ')}`);
  }

  const finalPath = resolve(projectGeneratedDir, `fauna-${candidateId}-whole-source${extension}`);
  if (!candidate.source && !overwrite) {
    try {
      const existing = await stat(finalPath);
      if (existing.isFile() && existing.size >= 512) {
        throw new Error(`Refusing to overwrite existing destination ${asRepoRelative(finalPath)}; pass --overwrite only if replacing intentionally.`);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  if (!dryRun) {
    await mkdir(projectGeneratedDir, { recursive: true });
    await copyFile(inputPath, finalPath);
  }
  candidate.source = asRepoRelative(finalPath);
  candidate.status = 'needs-review';
  candidate.sourceCohesion = 'single-source';
  candidate.backgroundKey = 'magenta';
  candidate.review = null;
  candidate.riggedCreatureId = undefined;
  candidate.riggedAt = undefined;
  candidate.sourceIngestedAt = new Date().toISOString();
  candidate.sourceIngest = {
    originalPath: asRepoRelative(inputPath),
    copiedIntoProject: true,
    sourceBytes: info.size,
    sourceFile: basename(finalPath),
    sourceImagegenMarker: {
      markerPath,
      createdAt: marker.createdAt,
      generatedDir: marker.generatedDir ?? null,
    },
    imageCheck,
  };
  if (!dryRun) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return {
    id: candidateId,
    source: candidate.source,
    status: candidate.status,
    copiedIntoProject: true,
    originalPath: asRepoRelative(inputPath),
    dryRun,
    imageCheck,
    next: [
      `npm run source:image-check -- --id ${candidateId}`,
      'npm run source:gallery',
      'inspect public/review/source-candidates/index.html before approval',
    ],
  };
}

function validateSourceImage(candidateId, imagePath) {
  if (skipImageCheck) return { checked: false, skipped: true, failures: [] };
  const result = spawnSync('python3', [
    'tools/validate_source_candidate_images.py',
    '--id',
    candidateId,
    '--image',
    imagePath,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  let parsed = null;
  const output = result.stdout || result.stderr || '';
  try {
    parsed = JSON.parse(output);
  } catch {
    parsed = null;
  }
  const failures = Array.isArray(parsed?.failures) ? [...parsed.failures] : [];
  if (result.status !== 0 && failures.length === 0) {
    failures.push(`${candidateId}: image validation failed without JSON output${output ? `: ${output.trim()}` : ''}`);
  }
  return {
    checked: true,
    skipped: false,
    metrics: parsed?.metrics?.[0] ?? null,
    failures,
  };
}

if (!mode) {
  usage();
  process.exit(1);
}

let marker = null;
if (mode === 'status') {
  marker = JSON.parse(await readFile(markerPath, 'utf8'));
  if (marker.schema !== 'water9/source-imagegen-handoff-marker@1') {
    throw new Error(`Unexpected marker schema ${marker.schema ?? 'missing'}`);
  }
  if (id && id !== marker.candidateId) {
    throw new Error(`--id ${id} does not match marker candidateId ${marker.candidateId}; rerun npm run source:imagegen-mark -- --id ${id} before generating.`);
  }
}

const generatedDir = resolve(String(args.get('generated-dir') ?? marker?.generatedDir ?? defaultGeneratedDir));
const files = await walkImages(generatedDir);
const generatedDirOverridden = args.has('generated-dir');
const generatedDirDrift = Boolean(marker?.generatedDir) && resolve(marker.generatedDir) !== generatedDir;

if (mode === 'latest') {
  console.log(JSON.stringify({
    generatedDir,
    ...summarize(files.slice(0, Number(args.get('limit') ?? 10))),
  }, null, 2));
  process.exit(0);
}

if (mode === 'health') {
  console.log(JSON.stringify(await buildHealthReport(files), null, 2));
  process.exit(0);
}

if (mode === 'mark') {
  if (!id) {
    usage();
    process.exit(1);
  }
  const createdAt = new Date();
  const marker = {
    schema: 'water9/source-imagegen-handoff-marker@1',
    candidateId: id,
    generatedDir,
    markerPath,
    createdAt: createdAt.toISOString(),
    createdAtMs: createdAt.getTime(),
    fileCount: files.length,
    newestBefore: files[0] ?? null,
    knownFiles: files.map((file) => file.path),
    knownSignatures: Object.fromEntries(files.map((file) => [file.path, { size: file.size, mtimeMs: file.mtimeMs }])),
  };
  await mkdir(dirname(markerPath), { recursive: true });
  await writeFile(markerPath, `${JSON.stringify(marker, null, 2)}\n`);
  console.log(JSON.stringify({
    marked: true,
    candidateId: id,
    markerPath,
    generatedDir,
    fileCount: files.length,
    newestBefore: marker.newestBefore,
    next: [
      'run image generation',
      'npm run source:imagegen-status',
      `npm run source:inbox-capture -- --id ${id} --open`,
      `npm run source:ingest -- --id ${id} --image <new-image-path> --copy`,
    ],
  }, null, 2));
  process.exit(0);
}

const known = new Set(marker.knownFiles ?? []);
const knownSignatures = marker.knownSignatures ?? {};
const newFiles = files.filter((file) => !known.has(file.path));
const modifiedFiles = files.filter((file) => {
  const before = knownSignatures[file.path];
  return before && (before.size !== file.size || before.mtimeMs !== file.mtimeMs);
});
const handoffFiles = [...newFiles, ...modifiedFiles].sort((left, right) => right.mtimeMs - left.mtimeMs || left.path.localeCompare(right.path));
let missingRejection = null;
let ingested = null;
if ((ingestHandoff || rejectMissing) && generatedDirDrift && !allowGeneratedDirDrift) {
  throw new Error(`Refusing to use handoff because generatedDir drifted from ${marker.generatedDir} to ${generatedDir}; pass --allow-generated-dir-drift only if intentional.`);
}
const statusMissingArtifacts = marker?.candidateId
  ? (await readJson(rejectionPath, { schema: 'water9/source-rejected-attempts@1', attempts: [] })).attempts
    ?.filter((attempt) => attempt.candidateId === marker.candidateId && rejectionKind(attempt) === 'missing-artifact').length ?? 0
  : 0;
const captureFirstHardStop = statusMissingArtifacts >= MANUAL_CAPTURE_THRESHOLD;
if (ingestHandoff && handoffFiles.length === 0) {
  const suffix = captureFirstHardStop
    ? ` Capture-first hard stop is active after ${statusMissingArtifacts} missing-artifact attempts; use source:inbox-capture or explicit source:recover-inline --image/stdin, then source:ingest-current.`
    : ' Rerun with --reject-missing to record a missing image artifact.';
  throw new Error(`Refusing to auto-ingest because no handoff files were detected.${suffix}`);
}
if (ingestHandoff && handoffFiles.length > 1) {
  throw new Error(`Refusing to auto-ingest because ${handoffFiles.length} handoff files were detected; inspect status output and ingest one file explicitly.`);
}
if (ingestHandoff && handoffFiles.length === 1) {
  ingested = await ingestHandoffImage(marker, handoffFiles[0]);
}
if (rejectMissing && handoffFiles.length === 0) {
  missingRejection = await recordMissingHandoffRejection(marker, generatedDir);
}

console.log(JSON.stringify({
  candidateId: marker.candidateId,
  markerPath,
  generatedDir,
  markedGeneratedDir: marker.generatedDir ?? null,
  scannedGeneratedDir: generatedDir,
  generatedDirOverridden,
  generatedDirDrift,
  markedAt: marker.createdAt,
  previousFileCount: marker.fileCount,
  currentFileCount: files.length,
  newFileCount: newFiles.length,
  newFiles,
  modifiedFileCount: modifiedFiles.length,
  modifiedFiles,
  handoffFileCount: handoffFiles.length,
  handoffFiles,
  inlineProgrammaticAccess: false,
  noRecoverableFileReason: handoffFiles.length === 0
    ? 'No generated image file was visible to repository tooling. Inline chat-rendered images require manual save, pasted upload, dropped upload, selected file upload, or an explicit --image path.'
    : null,
  ingestHandoff,
  ingested,
  autoIngest: {
    requested: ingestHandoff,
    performed: Boolean(ingested),
    dryRun,
    overwrite,
    selectedFile: ingestHandoff && handoffFiles.length === 1 ? handoffFiles[0].path : null,
    outputPath: ingested?.source ?? null,
  },
  rejectMissing,
  rejectedMissingArtifact: Boolean(missingRejection),
  rejectReason: missingRejection?.attempt?.reason ?? null,
  dryRun,
  missingRejection: missingRejection ? {
    rejected: missingRejection.attempt.id,
    duplicate: missingRejection.duplicate,
    candidateId: missingRejection.attempt.candidateId,
    species: missingRejection.attempt.species,
    rejectedAt: missingRejection.attempt.rejectedAt,
    reason: missingRejection.attempt.reason,
    attemptKind: missingRejection.attempt.attemptKind ?? null,
  } : null,
  newestCurrent: files[0] ?? null,
  captureUrl: captureUrl(marker.candidateId),
  captureFirstHardStop,
  missingArtifactAttemptsForCandidate: statusMissingArtifacts,
  manualInbox: manualInboxInstructions(marker.candidateId, statusMissingArtifacts),
  ingestCommand: handoffFiles[0]
    ? `npm run source:ingest -- --id ${marker.candidateId} --image ${handoffFiles[0].path} --copy`
    : null,
  rejectNoFileCommand: handoffFiles.length
    ? null
    : `npm run source:imagegen-status -- --id ${marker.candidateId} --reject-missing --reason "No new image file appeared under ${generatedDir} after image generation."`,
}, null, 2));

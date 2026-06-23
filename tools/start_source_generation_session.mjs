import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const queuePath = resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json'));
const rejectionPath = resolve(String(args.get('rejections') ?? 'public/review/source-candidates/rejected-attempts.json'));
const markerPath = resolve(String(args.get('marker') ?? 'tools/scratch/source-imagegen-handoff-marker.json'));
const sessionPath = resolve(String(args.get('out') ?? 'tools/scratch/source-generation-session.json'));
const generatedDir = resolve(String(args.get('generated-dir') ?? `${process.env.CODEX_HOME ?? `${homedir()}/.codex`}/generated_images`));
const sourceInboxDir = resolve(String(args.get('source-inbox-dir') ?? 'tools/source-inbox'));
const id = args.get('id');
const jsonOnly = args.has('json');
const noMark = args.has('no-mark') || args.has('noMark');
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);

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
      if (entry.isDirectory()) await walk(child);
      else if (entry.isFile() && isImage(child)) {
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

async function readJson(path, fallback = null) {
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

function markdownList(items) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- None recorded.';
}

function rejectionKind(attempt) {
  if (attempt.copiedImage) return 'visual-rejection';
  if (attempt.sourceImagegenMarker || /no (new |recoverable |accessible )?(saved |source )?(image )?file|did not create an accessible source image file|no project-bound artifact|inline/i.test(String(attempt.reason ?? ''))) {
    return 'missing-artifact';
  }
  return 'unclassified';
}

const manifest = await readJson(manifestPath);
if (manifest?.schema !== 'water9/source-candidates@1') {
  throw new Error(`Unexpected source candidate schema ${manifest?.schema ?? 'missing'}`);
}
const queue = await readJson(queuePath, { candidates: [] });
if (queue?.schema !== 'water9/source-generation-queue@1') {
  throw new Error(`Unexpected source generation queue schema ${queue?.schema ?? 'missing'}`);
}
const rejections = await readJson(rejectionPath, { schema: 'water9/source-rejected-attempts@1', attempts: [] });

const queued = Array.isArray(queue.candidates) ? queue.candidates : [];
const manifestCandidates = Array.isArray(manifest.candidates) ? manifest.candidates : [];
const manifestCandidate = id ? manifestCandidates.find((entry) => entry.id === id) : null;
if (id && !manifestCandidate) {
  console.error(JSON.stringify({
    found: false,
    id,
    manifest: manifestPath,
    reason: 'candidate is not in source candidate manifest',
  }, null, 2));
  process.exit(1);
}
if (manifestCandidate?.source && !args.has('include-existing-source')) {
  throw new Error(`${manifestCandidate.id} already has source ${manifestCandidate.source}; pass --include-existing-source only if intentionally replacing workflow context.`);
}
const candidate = id ? queued.find((entry) => entry.id === id) : queued[0];
if (!candidate) {
  console.error(JSON.stringify({
    found: false,
    id: id ?? null,
    queue: queuePath,
    reason: id ? 'candidate is not currently queued for source generation' : 'source generation queue is empty',
    next: ['npm run source:generation-queue', 'npm run content:readiness'],
  }, null, 2));
  process.exit(1);
}

const files = await walkImages(generatedDir);
const promptFromFile = candidate.promptFile ? await readFile(resolve(candidate.promptFile), 'utf8').catch(() => null) : null;
const missingArtifactAttempts = (Array.isArray(rejections.attempts) ? rejections.attempts : [])
  .filter((attempt) => attempt.candidateId === candidate.id && rejectionKind(attempt) === 'missing-artifact')
  .length;
const captureFirst = missingArtifactAttempts >= 3;
const captureReason = captureFirst
  ? `Built-in image generation has ${missingArtifactAttempts} missing-artifact attempts for ${candidate.id}. Use source inbox capture or explicit saved-file recovery before trying another generated-images auto-handoff.`
  : null;
const createdAt = new Date();
const marker = {
  schema: 'water9/source-imagegen-handoff-marker@1',
  candidateId: candidate.id,
  generatedDir,
  markerPath,
  createdAt: createdAt.toISOString(),
  createdAtMs: createdAt.getTime(),
  fileCount: files.length,
  newestBefore: files[0] ?? null,
  knownFiles: files.map((file) => file.path),
  knownSignatures: Object.fromEntries(files.map((file) => [file.path, { size: file.size, mtimeMs: file.mtimeMs }])),
};
if (!noMark) {
  await mkdir(dirname(markerPath), { recursive: true });
  await writeFile(markerPath, `${JSON.stringify(marker, null, 2)}\n`);
}

const manualInboxTarget = asRepoRelative(resolve(sourceInboxDir, `${candidate.id}.png`));
const payload = {
  schema: 'water9/source-generation-session@1',
  candidateId: candidate.id,
  species: candidate.species,
  rank: candidate.rank,
  marked: !noMark,
  markerPath,
  generatedDir,
  previousFileCount: files.length,
  newestBefore: files[0] ?? null,
  missingArtifactAttempts,
  captureFirst,
  captureReason,
  promptFile: candidate.promptFile,
  contract: `public/review/source-candidates/art-contracts/${candidate.id}.md`,
  expectedProjectOutput: candidate.expectedOutput,
  manualInboxTarget,
  prompt: promptFromFile?.trim() || candidate.prompt,
  basePrompt: candidate.prompt,
  requiredRead: candidate.requiredRead ?? [],
  sourcePoseRules: candidate.sourcePoseRules ?? [],
  qualityChecks: candidate.qualityChecks ?? [],
  promptRisks: candidate.promptRisks ?? [],
  auditGuidance: candidate.auditGuidance ?? null,
  commands: {
    recommendedFirst: captureFirst
      ? `npm run source:inbox-capture -- --id ${candidate.id} --open`
      : `npm run source:imagegen-status -- --id ${candidate.id}`,
    recommendedFallback: captureFirst
      ? `npm run source:recover-inline -- --id ${candidate.id} --image <saved-image-path> --copy --validate`
      : `npm run source:inbox-capture -- --id ${candidate.id} --open`,
    status: `npm run source:imagegen-status -- --id ${candidate.id}`,
    autoIngestIfFileAppears: `npm run source:imagegen-status -- --id ${candidate.id} --ingest`,
    recoverInlineFromDownloads: `npm run source:recover-inline -- --id ${candidate.id} --copy --validate`,
    recoverInlineExplicitImage: `npm run source:recover-inline -- --id ${candidate.id} --image <saved-image-path> --copy --validate`,
    openInboxCapture: `npm run source:inbox-capture -- --id ${candidate.id} --open`,
    rejectMissing: `npm run source:imagegen-status -- --id ${candidate.id} --reject-missing --reason "No new image file appeared under ${generatedDir} after image generation."`,
    inboxCheck: `npm run source:inbox-check -- --dir ${asRepoRelative(sourceInboxDir)} --strict --ids ${candidate.id}`,
    inboxIngestDryRun: `npm run source:ingest-batch -- --dir ${asRepoRelative(sourceInboxDir)} --strict --ids ${candidate.id} --dry-run`,
    inboxIngest: `npm run source:ingest-batch -- --dir ${asRepoRelative(sourceInboxDir)} --strict --ids ${candidate.id}`,
    ingestCurrentDryRun: `npm run source:ingest-current -- --id ${candidate.id} --dry-run`,
    ingestCurrentApply: `npm run source:ingest-current -- --id ${candidate.id} --apply`,
    sourceCheck: 'npm run source:check',
    sourceGallery: 'npm run source:gallery',
  },
};

await mkdir(dirname(sessionPath), { recursive: true });
await writeFile(sessionPath, `${JSON.stringify(payload, null, 2)}\n`);

if (jsonOnly) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`Source generation session: ${payload.candidateId} (${payload.species})`);
  console.log(`Marked: ${payload.marked ? 'yes' : 'no'}  Marker: ${asRepoRelative(markerPath)}`);
  console.log(`Generated dir: ${payload.generatedDir}`);
  console.log(`Prompt file: ${payload.promptFile}`);
  console.log(`Contract: ${payload.contract}`);
  console.log(`Manual inbox target: ${payload.manualInboxTarget}`);
  console.log(`Expected project output: ${payload.expectedProjectOutput}`);
  if (payload.captureFirst) {
    console.log(`Capture first: yes (${payload.missingArtifactAttempts} missing-artifact attempts)`);
    console.log(payload.captureReason);
    console.log(`Recommended first command: ${payload.commands.recommendedFirst}`);
    console.log(`Recommended fallback: ${payload.commands.recommendedFallback}`);
  } else {
    console.log(`Capture first: no (${payload.missingArtifactAttempts} missing-artifact attempts)`);
  }
  console.log('');
  console.log('PROMPT');
  console.log(payload.prompt);
  console.log('');
  console.log('REQUIRED READ');
  console.log(markdownList(payload.requiredRead));
  console.log('');
  console.log('SOURCE POSE RULES');
  console.log(markdownList(payload.sourcePoseRules));
  console.log('');
  console.log('QUALITY CHECKS');
  console.log(markdownList(payload.qualityChecks));
  console.log('');
  if (payload.auditGuidance) {
    console.log('RESEARCH AUDIT HARDENING');
    const patch = payload.auditGuidance.suggestedResearchPatch ?? {};
    console.log(markdownList([
      `Lane: ${payload.auditGuidance.lane}`,
      ...(patch.biologicalAnchors ?? []).map((item) => `Biological anchor: ${item}`),
      ...(patch.requiredRead ?? []).map((item) => `Extra required read: ${item}`),
      ...(payload.auditGuidance.sourceGenerationRisks ?? []).map((item) => `Avoid: ${item}`),
      ...(patch.promptRisks ?? []).map((item) => `Avoid: ${item}`),
      ...(patch.motionPhases ?? []).map((item) => `Motion phase: ${item}`),
    ]));
    console.log('');
  }
  console.log('AFTER GENERATION');
  if (payload.captureFirst) {
    console.log('# Capture-first mode is active for this candidate.');
    console.log(payload.commands.recommendedFirst);
    console.log(payload.commands.recommendedFallback);
    console.log(payload.commands.inboxCheck);
    console.log(payload.commands.inboxIngestDryRun);
    console.log(payload.commands.inboxIngest);
    console.log('# Optional generated-images auto-handoff only if a project-readable file appears:');
  }
  console.log(payload.commands.status);
  console.log(payload.commands.autoIngestIfFileAppears);
  console.log(`# If the image only appears inline, save/download it, then recover it to: ${payload.manualInboxTarget}`);
  console.log(`# Or open a local paste/drop capture page:`);
  console.log(payload.commands.openInboxCapture);
  console.log(payload.commands.recoverInlineFromDownloads);
  console.log(payload.commands.recoverInlineExplicitImage);
  console.log(payload.commands.inboxCheck);
  console.log(payload.commands.inboxIngestDryRun);
  console.log(payload.commands.inboxIngest);
  console.log(payload.commands.ingestCurrentDryRun);
  console.log(payload.commands.ingestCurrentApply);
  console.log(payload.commands.sourceCheck);
  console.log(payload.commands.sourceGallery);
  console.log(`# If no file can be recovered: ${payload.commands.rejectMissing}`);
}

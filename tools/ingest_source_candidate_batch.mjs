import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { sourceImageMetadata } from './source_image_metadata.mjs';
import { archiveExistingSource } from './source_replacement_archive.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const dir = args.get('dir') ?? args.get('input-dir');
const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const queuePath = resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json'));
const generatedDir = resolve(String(args.get('generated-dir') ?? 'public/assets/generated'));
const replacementArchiveDir = resolve(String(args.get('replacement-archive-dir') ?? 'public/review/source-candidates/replacement-archive'));
const reportPath = resolve(String(args.get('report') ?? 'tools/scratch/source-ingest-batch-report.json'));
const dryRun = args.has('dry-run') || args.has('dryRun');
const overwrite = args.has('overwrite');
const allowIdenticalOverwrite = args.has('allow-identical-overwrite') || args.has('allowIdenticalOverwrite');
const strict = args.has('strict');
const skipImageCheck = args.has('skip-image-check');
const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const requestedIds = new Set(String(args.get('ids') ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean));

function usage() {
  console.error('Usage: node tools/ingest_source_candidate_batch.mjs --dir <image-directory> [--strict] [--overwrite] [--dry-run] [--allow-identical-overwrite]');
  console.error('Expected image names: <candidate-id>.png or fauna-<candidate-id>-whole-source.png');
}

if (!dir) {
  usage();
  process.exit(1);
}

function asRepoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

function candidateIdsForFile(file) {
  const extension = extname(file).toLowerCase();
  if (!allowedExtensions.has(extension)) return [];
  const stem = file.slice(0, -extension.length);
  const ids = [stem];
  const match = stem.match(/^fauna-(.+)-whole-source$/);
  if (match) ids.push(match[1]);
  return ids;
}

async function validImage(path) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size >= 512;
  } catch {
    return false;
  }
}

async function readJson(label, path, failures) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

function validateSourceImage(id, path) {
  if (skipImageCheck) return { checked: false, skipped: true, failures: [] };
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
  let parsed = null;
  const output = result.stdout || result.stderr || '';
  try {
    parsed = JSON.parse(output);
  } catch {
    parsed = null;
  }
  const imageFailures = Array.isArray(parsed?.failures) ? parsed.failures : [];
  if (result.status !== 0 && !imageFailures.length) {
    imageFailures.push(`${id}: image validation failed without JSON output${output ? `: ${output.trim()}` : ''}`);
  }
  return {
    checked: true,
    skipped: false,
    metrics: parsed?.metrics?.[0] ?? null,
    failures: imageFailures,
  };
}

async function writeReport(report) {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

const inputDir = resolve(String(dir));
const failures = [];
const warnings = [];
let files = [];
try {
  files = await readdir(inputDir, { withFileTypes: true });
} catch (error) {
  failures.push(`input directory ${inputDir}: could not read directory: ${error.message}`);
}

const manifest = await readJson('source candidate manifest', manifestPath, failures);
const queue = await readJson('source generation queue', queuePath, failures);
if (manifest && manifest.schema !== 'water9/source-candidates@1') {
  failures.push(`Unexpected source candidate schema ${manifest.schema ?? 'missing'}`);
}
const candidates = Array.isArray(manifest?.candidates) ? manifest.candidates : [];
const queueItems = Array.isArray(queue?.candidates) ? queue.candidates : [];
const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
const queueById = new Map(queueItems.map((item) => [item.id, item]));
for (const id of requestedIds) {
  if (!candidatesById.has(id)) failures.push(`${id}: requested batch id is not a source candidate`);
  if (!queueById.has(id)) failures.push(`${id}: requested batch id is not in the current source-generation queue`);
}

const byCandidateId = new Map();
const skipped = [];
for (const entry of files) {
  if (!entry.isFile()) continue;
  const file = entry.name;
  const extension = extname(file).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    skipped.push({ file, reason: 'not a supported image extension' });
    continue;
  }

  const possibleIds = candidateIdsForFile(file);
  const id = possibleIds.find((candidateId) => candidatesById.has(candidateId));
  if (!id) {
    const message = `${file}: does not map to a source candidate id`;
    if (strict) failures.push(message);
    else warnings.push(message);
    skipped.push({ file, reason: 'unknown candidate id' });
    continue;
  }
  if (requestedIds.size && !requestedIds.has(id)) {
    skipped.push({ file, reason: 'not requested by --ids' });
    continue;
  }
  if (byCandidateId.has(id)) {
    failures.push(`${id}: multiple input files map to this candidate (${byCandidateId.get(id).file}, ${file})`);
    continue;
  }
  byCandidateId.set(id, { file, extension, inputPath: resolve(inputDir, file) });
}

const ingested = [];
const matched = [];

for (const [id, input] of byCandidateId) {
  const candidate = candidatesById.get(id);
  if (!candidate) continue;
  const { file, extension, inputPath } = input;
  const queued = queueById.has(candidate.id);
  const finalPath = resolve(generatedDir, `fauna-${candidate.id}-whole-source${extension}`);
  const item = {
    id: candidate.id,
    species: candidate.species,
    file,
    inputPath: asRepoRelative(inputPath),
    queued,
    rank: queueById.get(candidate.id)?.rank ?? null,
    outputPath: asRepoRelative(finalPath),
    imageCheck: null,
    inputSha256: null,
    previousSourceSha256: null,
    identicalToPreviousSource: false,
    identicalOverwriteAllowed: allowIdenticalOverwrite,
  };
  matched.push(item);

  if (!queued) {
    const message = `${candidate.id}: image maps to a candidate that is not in the current source generation queue`;
    if (strict) failures.push(message);
    else warnings.push(message);
  }
  if (!(await validImage(inputPath))) {
    failures.push(`${candidate.id}: ${inputPath} is missing or too small`);
    continue;
  }
  item.imageCheck = validateSourceImage(candidate.id, inputPath);
  failures.push(...item.imageCheck.failures);
  if (item.imageCheck.failures.length) {
    skipped.push({ id: candidate.id, reason: 'source image failed mechanical magenta/background validation' });
    continue;
  }
  if ((candidate.status === 'approved' || candidate.status === 'rigged') && !overwrite) {
    failures.push(`${candidate.id}: status is ${candidate.status}; refusing batch ingest without --overwrite`);
    skipped.push({ id: candidate.id, reason: `status is ${candidate.status}; pass --overwrite to replace` });
    continue;
  }
  if (candidate.source && !overwrite) {
    const message = `${candidate.id}: source already set to ${candidate.source}; pass --overwrite to replace`;
    if (strict) failures.push(message);
    else warnings.push(message);
    skipped.push({ id: candidate.id, reason: `source already set to ${candidate.source}; pass --overwrite to replace` });
    continue;
  }
  const inputMetadata = await sourceImageMetadata(inputPath);
  const currentMetadata = candidate.source && overwrite
    ? await sourceImageMetadata(resolve(candidate.source))
    : null;
  item.inputSha256 = inputMetadata.sha256;
  item.previousSourceSha256 = currentMetadata?.sha256 ?? null;
  item.identicalToPreviousSource = Boolean(currentMetadata?.sha256 && inputMetadata.sha256 === currentMetadata.sha256);
  if (item.identicalToPreviousSource && !allowIdenticalOverwrite) {
    failures.push(`${candidate.id}: Refusing byte-identical overwrite; replacement source matches current source ${candidate.source}. Generate or capture a distinct replacement before ingest, or pass --allow-identical-overwrite only for an intentional metadata repair.`);
    skipped.push({ id: candidate.id, reason: 'byte-identical overwrite refused by distinct replacement guard' });
    continue;
  }

  const replacementArchive = candidate.source && overwrite && dryRun
    ? await archiveExistingSource({
        candidate,
        candidateId: candidate.id,
        replacementInputPath: inputPath,
        archiveDir: replacementArchiveDir,
        dryRun: true,
        reason: 'batch source ingest overwrite',
      })
    : null;
  ingested.push({ ...item, source: asRepoRelative(finalPath), replacementArchive });
}

for (const id of requestedIds) {
  if (!byCandidateId.has(id)) failures.push(`${id}: missing input image for requested batch id`);
}

matched.sort((left, right) => (left.rank ?? 9999) - (right.rank ?? 9999) || left.id.localeCompare(right.id));
ingested.sort((left, right) => (left.rank ?? 9999) - (right.rank ?? 9999) || left.id.localeCompare(right.id));

if (failures.length) {
  const report = {
    inputDir,
    manifest: manifestPath,
    queue: queuePath,
    generatedDir,
    dryRun,
    strict,
    overwrite,
    requestedIds: [...requestedIds],
    matched: matched.length,
    candidatesToIngest: ingested.length,
    matchedImages: matched,
    ingested: [],
    skipped,
    warnings,
    failures,
    report: asRepoRelative(reportPath),
    next: ['fix failures before ingesting generated images'],
  };
  await writeReport(report);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

if (!dryRun) {
  await mkdir(generatedDir, { recursive: true });
  for (const item of ingested) {
    const candidate = candidatesById.get(item.id);
    if (!candidate) continue;
    const sourceInputPath = resolve(inputDir, item.file);
    const finalPath = resolve(item.outputPath);
    const replacementArchive = item.replacementArchive ?? (candidate.source && overwrite
      ? await archiveExistingSource({
          candidate,
          candidateId: candidate.id,
          replacementInputPath: sourceInputPath,
          archiveDir: replacementArchiveDir,
          dryRun: false,
          reason: 'batch source ingest overwrite',
        })
      : null);
    item.replacementArchive = replacementArchive;
    await copyFile(sourceInputPath, finalPath);
    const inputMetadata = await sourceImageMetadata(sourceInputPath);
    const finalMetadata = await sourceImageMetadata(finalPath);
    candidate.source = item.source;
    candidate.status = 'needs-review';
    candidate.sourceCohesion = 'single-source';
    candidate.backgroundKey = 'magenta';
    candidate.review = null;
    candidate.riggedCreatureId = undefined;
    candidate.riggedAt = undefined;
    candidate.sourceIngestedAt = new Date().toISOString();
    candidate.sourceIngest = {
      originalPath: item.inputPath,
      copiedIntoProject: true,
      originalBytes: inputMetadata.bytes,
      originalSha256: inputMetadata.sha256,
      sourceBytes: finalMetadata.bytes,
      sourceSha256: finalMetadata.sha256,
      sourceWidth: finalMetadata.width,
      sourceHeight: finalMetadata.height,
      sourceFile: `fauna-${candidate.id}-whole-source${extname(item.file).toLowerCase()}`,
      identicalToPreviousSource: item.identicalToPreviousSource,
      previousSourceSha256: item.previousSourceSha256,
      identicalOverwriteAllowed: allowIdenticalOverwrite,
      replacementArchive,
    };
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

const report = {
  inputDir,
  manifest: manifestPath,
  queue: queuePath,
  generatedDir,
  dryRun,
  strict,
  overwrite,
  allowIdenticalOverwrite,
  requestedIds: [...requestedIds],
  matched: matched.length,
  candidatesToIngest: ingested.length,
  matchedImages: matched,
  ingested,
  skipped,
  warnings,
  failures,
  report: asRepoRelative(reportPath),
  next: [
    matched.length === 0
      ? 'drop generated source images into the inbox using <candidate-id>.png or fauna-<candidate-id>-whole-source.png filenames'
      : `npm run source:ingest-batch -- --dir ${asRepoRelative(inputDir)} --strict`,
    'npm run source:check',
    'npm run source:gallery',
    'inspect public/review/source-candidates/index.html before approval',
  ],
};
await writeReport(report);
console.log(JSON.stringify(report, null, 2));

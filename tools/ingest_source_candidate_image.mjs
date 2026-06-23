import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { basename, extname, resolve } from 'node:path';
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

const id = args.get('id');
const image = args.get('image') ?? args.get('source');
const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const copyIntoProject = args.has('copy');
const dryRun = args.has('dry-run') || args.has('dryRun');
const overwrite = args.has('overwrite');
const allowIdenticalOverwrite = args.has('allow-identical-overwrite') || args.has('allowIdenticalOverwrite');
const skipImageCheck = args.has('skip-image-check') || args.has('skipImageCheck');
const generatedDir = resolve(String(args.get('generated-dir') ?? 'public/assets/generated'));
const replacementArchiveDir = resolve(String(args.get('replacement-archive-dir') ?? 'public/review/source-candidates/replacement-archive'));
const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function usage() {
  console.error('Usage: node tools/ingest_source_candidate_image.mjs --id <candidate-id> --image <path> [--copy] [--dry-run] [--overwrite] [--allow-identical-overwrite]');
}

if (!id || !image) {
  usage();
  process.exit(1);
}

async function requireImage(path) {
  const info = await stat(path);
  if (!info.isFile() || info.size < 512) throw new Error(`source image ${path} is missing or too small`);
  const extension = extname(path).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    throw new Error(`source image ${path} must use one of: ${[...allowedExtensions].join(', ')}`);
  }
  return { info, extension };
}

function asRepoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
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
  const output = result.stdout || result.stderr || '';
  let parsed = null;
  try {
    parsed = JSON.parse(output);
  } catch {
    parsed = null;
  }
  const failures = Array.isArray(parsed?.failures) ? [...parsed.failures] : [];
  if (result.status !== 0 && failures.length === 0) {
    failures.push(`${candidateId}: source image validation failed without JSON output${output ? `: ${output.trim()}` : ''}`);
  }
  return {
    checked: true,
    skipped: false,
    metrics: parsed?.metrics?.[0] ?? null,
    failures,
  };
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.schema !== 'water9/source-candidates@1') {
  throw new Error(`Unexpected source candidate schema ${manifest.schema ?? 'missing'}`);
}
const candidate = (manifest.candidates ?? []).find((entry) => entry.id === id);
if (!candidate) throw new Error(`No source candidate found with id ${id}`);
if (candidate.status === 'approved' || candidate.status === 'rigged') {
  throw new Error(`Refusing to replace source image for ${id} while status is ${candidate.status}; set it back to needs-review intentionally first`);
}
if (candidate.source && !overwrite) {
  throw new Error(`Refusing to replace existing source ${candidate.source} for ${id}; pass --overwrite only if replacing intentionally`);
}

const inputPath = resolve(String(image));
const { info, extension } = await requireImage(inputPath);
const imageCheck = validateSourceImage(id, inputPath);
if (imageCheck.failures.length) {
  throw new Error(`source image failed mechanical magenta/background validation: ${imageCheck.failures.join('; ')}`);
}
const inputMetadata = await sourceImageMetadata(inputPath);
const currentMetadata = candidate.source && overwrite
  ? await sourceImageMetadata(resolve(candidate.source))
  : null;
const identicalToCurrentSource = Boolean(currentMetadata?.sha256 && inputMetadata.sha256 === currentMetadata.sha256);
if (identicalToCurrentSource && !allowIdenticalOverwrite) {
  throw new Error(`Refusing byte-identical overwrite for ${id}; replacement source matches current source ${candidate.source}. Generate or capture a distinct replacement before ingest, or pass --allow-identical-overwrite only for an intentional metadata repair.`);
}
let finalPath = inputPath;
const replacementArchive = candidate.source && overwrite
  ? await archiveExistingSource({
      candidate,
      candidateId: id,
      replacementInputPath: inputPath,
      archiveDir: replacementArchiveDir,
      dryRun,
      reason: 'direct source ingest overwrite',
    })
  : null;
if (copyIntoProject) {
  await mkdir(generatedDir, { recursive: true });
  finalPath = resolve(generatedDir, `fauna-${id}-whole-source${extension}`);
  if (!dryRun) await copyFile(inputPath, finalPath);
}
const finalMetadata = dryRun && copyIntoProject
  ? { ...inputMetadata, path: finalPath }
  : await sourceImageMetadata(finalPath);

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
  copiedIntoProject: copyIntoProject,
  sourceBytes: info.size,
  sourceSha256: finalMetadata.sha256,
  sourceWidth: finalMetadata.width,
  sourceHeight: finalMetadata.height,
  originalBytes: inputMetadata.bytes,
  originalSha256: inputMetadata.sha256,
  sourceFile: basename(finalPath),
  imageCheck,
  identicalToPreviousSource: identicalToCurrentSource,
  previousSourceSha256: currentMetadata?.sha256 ?? null,
  identicalOverwriteAllowed: allowIdenticalOverwrite,
  replacementArchive,
};

if (!dryRun) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  id,
  source: candidate.source,
  status: candidate.status,
  copiedIntoProject: copyIntoProject,
  dryRun,
  imageCheck,
  identicalToPreviousSource: identicalToCurrentSource,
  identicalOverwriteAllowed: allowIdenticalOverwrite,
  replacementArchive,
  next: [
    `python3 tools/validate_source_candidate_images.py --id ${id}`,
    'npm run source:gallery',
    'inspect public/review/source-candidates/index.html before approval',
  ],
}, null, 2));

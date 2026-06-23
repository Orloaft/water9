import { spawnSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const inboxDir = resolve(String(args.get('dir') ?? args.get('input-dir') ?? 'tools/source-inbox'));
const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const queuePath = resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json'));
const overwrite = args.has('overwrite');
const strict = args.has('strict');
const requireAll = args.has('require-all');
const skipImageCheck = args.has('skip-image-check');
const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const requestedIds = new Set(String(args.get('ids') ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean));

async function readJson(label, path, failures) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
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
  return [...new Set(ids)];
}

async function imageInfo(path) {
  try {
    const info = await stat(path);
    return { exists: info.isFile(), size: info.size };
  } catch {
    return { exists: false, size: 0 };
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

const failures = [];
const warnings = [];
const manifest = await readJson('source candidate manifest', manifestPath, failures);
const queue = await readJson('source generation queue', queuePath, failures);
const candidates = Array.isArray(manifest?.candidates) ? manifest.candidates : [];
const queueItems = Array.isArray(queue?.candidates) ? queue.candidates : [];
const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
const queueById = new Map(queueItems.map((item) => [item.id, item]));
for (const id of requestedIds) {
  if (!candidatesById.has(id)) failures.push(`${id}: requested inbox id is not a source candidate`);
  if (!queueById.has(id)) failures.push(`${id}: requested inbox id is not in the current source-generation queue`);
}

let files = [];
try {
  files = await readdir(inboxDir, { withFileTypes: true });
} catch (error) {
  failures.push(`inbox ${inboxDir}: could not read directory: ${error.message}`);
}

const matched = [];
const skipped = [];
const byCandidate = new Map();

for (const entry of files) {
  if (!entry.isFile()) continue;
  const file = entry.name;
  const extension = extname(file).toLowerCase();
  const filePath = resolve(inboxDir, file);
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
  if (byCandidate.has(id)) {
    failures.push(`${id}: multiple inbox files map to this candidate (${byCandidate.get(id).file}, ${file})`);
    continue;
  }

  const candidate = candidatesById.get(id);
  const queued = queueById.has(id);
  if (!queued) {
    const message = `${id}: image maps to a candidate that is not in the current source generation queue`;
    if (strict) failures.push(message);
    else warnings.push(message);
  }
  if (candidate.source && !overwrite) {
    const message = `${id}: candidate already has source ${candidate.source}; pass --overwrite only if replacing intentionally`;
    if (strict) failures.push(message);
    else warnings.push(message);
  }
  if ((candidate.status === 'approved' || candidate.status === 'rigged') && !overwrite) {
    failures.push(`${id}: candidate status is ${candidate.status}; refusing inbox ingest without --overwrite`);
  }

  const info = await imageInfo(filePath);
  if (!info.exists || info.size < 512) failures.push(`${id}: ${file} is missing or too small`);
  const imageCheck = info.exists && info.size >= 512
    ? validateSourceImage(id, filePath)
    : { checked: false, skipped: false, failures: [] };
  failures.push(...imageCheck.failures);

  const item = {
    id,
    species: candidate.species,
    file,
    path: asRepoRelative(filePath),
    size: info.size,
    imageCheck,
    queued,
    rank: queueById.get(id)?.rank ?? null,
    expectedOutput: `public/assets/generated/fauna-${id}-whole-source${extension}`,
    ingestCommand: `npm run source:ingest -- --id ${id} --image ${asRepoRelative(filePath)} --copy`,
  };
  matched.push(item);
  byCandidate.set(id, item);
}

if (requireAll || requestedIds.size) {
  const requiredItems = requestedIds.size
    ? [...requestedIds].map((id) => ({ id }))
    : queueItems;
  for (const item of requiredItems) {
    if (!byCandidate.has(item.id)) failures.push(`${item.id}: missing inbox image for ${requestedIds.size ? 'requested' : 'queued'} candidate`);
  }
}

matched.sort((left, right) => (left.rank ?? 9999) - (right.rank ?? 9999) || left.id.localeCompare(right.id));
const summary = {
  inboxDir,
  queue: queuePath,
  requestedIds: [...requestedIds],
  matched: matched.length,
  queuedCandidates: queueItems.length,
  readyForBatchIngest: failures.length === 0 && matched.length > 0,
  matchedImages: matched,
  skipped,
  warnings,
  failures,
  next: failures.length
    ? ['fix failures before ingesting generated images']
    : matched.length === 0
      ? ['drop generated source images into the inbox using <candidate-id>.png or fauna-<candidate-id>-whole-source.png filenames']
    : [
      `npm run source:ingest-batch -- --dir ${asRepoRelative(inboxDir)} --strict --dry-run`,
      `npm run source:ingest-batch -- --dir ${asRepoRelative(inboxDir)} --strict`,
      'npm run source:check',
      'npm run source:gallery',
    ],
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

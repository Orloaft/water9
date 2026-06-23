import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const id = args.get('id');
const image = args.get('image');
const reason = args.get('reason');
const attemptKind = String(args.get('attempt-kind') ?? args.get('attemptKind') ?? (image ? 'visual-failure' : 'missing-artifact'));
const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const rejectionPath = resolve(String(args.get('rejections') ?? 'public/review/source-candidates/rejected-attempts.json'));
const rejectedDir = resolve(String(args.get('rejected-dir') ?? 'public/review/source-candidates/rejected'));
const dryRun = args.has('dry-run') || args.has('dryRun');
const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const attemptKinds = new Set(['visual-failure', 'missing-artifact', 'tooling-failure']);
const MIN_REASON_LENGTH = 24;

function usage() {
  console.error('Usage: node tools/reject_source_candidate_attempt.mjs --id <candidate-id> --reason <text> --attempt-kind visual-failure|missing-artifact|tooling-failure [--image <path>] [--dry-run]');
  console.error('Use visual-failure with --image for bad generated art. Use missing-artifact when no accessible file was produced. Use tooling-failure for generation/capture failures unrelated to visual quality.');
}

if (!id || !reason || !attemptKinds.has(attemptKind)) {
  usage();
  process.exit(1);
}
if (String(reason).trim().length < MIN_REASON_LENGTH) {
  console.error(`Rejected attempt reason must be at least ${MIN_REASON_LENGTH} characters and explain the failure.`);
  process.exit(1);
}
if (attemptKind === 'visual-failure' && !image) {
  console.error('visual-failure rejected attempts require --image <path>.');
  process.exit(1);
}
if (attemptKind === 'missing-artifact' && image) {
  console.error('missing-artifact rejected attempts must not include --image; use --attempt-kind visual-failure for bad visible outputs.');
  process.exit(1);
}

function asRepoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

function safeTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

async function readRejections() {
  try {
    return JSON.parse(await readFile(rejectionPath, 'utf8'));
  } catch {
    return { schema: 'water9/source-rejected-attempts@1', attempts: [] };
  }
}

async function requireImage(path) {
  const absolute = resolve(path);
  const info = await stat(absolute);
  if (!info.isFile() || info.size < 512) throw new Error(`rejected image ${path} is missing or too small`);
  const extension = extname(absolute).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    throw new Error(`rejected image ${path} must use one of: ${[...allowedExtensions].join(', ')}`);
  }
  return { absolute, info, extension };
}

async function fileFingerprint(path) {
  try {
    const absolute = resolve(path);
    const info = await stat(absolute);
    if (!info.isFile()) return { path: asRepoRelative(absolute), exists: false };
    return {
      path: asRepoRelative(absolute),
      exists: true,
      size: info.size,
      mtimeMs: Math.round(info.mtimeMs),
      sha256: createHash('sha256').update(await readFile(absolute)).digest('hex'),
    };
  } catch {
    return { path: asRepoRelative(path), exists: false };
  }
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.schema !== 'water9/source-candidates@1') {
  throw new Error(`Unexpected source candidate schema ${manifest.schema ?? 'missing'}`);
}
const candidate = (manifest.candidates ?? []).find((entry) => entry.id === id);
if (!candidate) throw new Error(`No source candidate found with id ${id}`);

const rejectedAt = new Date();
let copiedImage = null;
let originalImage = null;
let sourceBytes = null;
let originalImageFingerprint = null;
let copiedImageFingerprint = null;
if (image) {
  const input = await requireImage(String(image));
  originalImage = asRepoRelative(input.absolute);
  sourceBytes = input.info.size;
  originalImageFingerprint = await fileFingerprint(input.absolute);
  const target = resolve(rejectedDir, `${id}-${safeTimestamp(rejectedAt)}${input.extension}`);
  copiedImage = asRepoRelative(target);
  if (!dryRun) {
    await mkdir(rejectedDir, { recursive: true });
    await copyFile(input.absolute, target);
    copiedImageFingerprint = await fileFingerprint(target);
  } else {
    copiedImageFingerprint = { path: copiedImage, exists: false, dryRun: true };
  }
}

const rejections = await readRejections();
if (rejections.schema !== 'water9/source-rejected-attempts@1') {
  throw new Error(`Unexpected rejection manifest schema ${rejections.schema ?? 'missing'}`);
}
const attempt = {
  id: `${id}-${safeTimestamp(rejectedAt)}`,
  candidateId: id,
  species: candidate.species,
  rejectedAt: rejectedAt.toISOString(),
  attemptKind,
  reason: String(reason),
  originalImage,
  copiedImage,
  sourceBytes,
  originalImageFingerprint,
  copiedImageFingerprint,
  candidateStatusAtRejection: candidate.status,
  promptSnapshot: candidate.prompt,
  requiredRead: candidate.requiredRead ?? [],
  promptRisks: candidate.promptRisks ?? [],
};
rejections.attempts = Array.isArray(rejections.attempts) ? rejections.attempts : [];
rejections.attempts.push(attempt);

if (!dryRun) {
  await mkdir(resolve(rejectionPath, '..'), { recursive: true });
  await writeFile(rejectionPath, `${JSON.stringify(rejections, null, 2)}\n`);
}

console.log(JSON.stringify({
  rejected: attempt.id,
  candidateId: id,
  species: candidate.species,
  attemptKind,
  copiedImage,
  copiedImageSha256: copiedImageFingerprint?.sha256 ?? null,
  dryRun,
}, null, 2));

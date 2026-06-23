import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, extname, resolve } from 'node:path';

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

const markerPath = resolve(String(args.get('marker') ?? 'tools/scratch/source-imagegen-handoff-marker.json'));
const explicitId = String(args.get('id') ?? args.get('candidate') ?? '').trim();
const explicitImage = String(args.get('image') ?? '').trim();
const targetDir = resolve(String(args.get('target-dir') ?? args.get('targetDir') ?? 'tools/source-inbox'));
const scratchDir = resolve(String(args.get('scratch-dir') ?? args.get('scratchDir') ?? 'tools/scratch/source-inline-recovery'));
const copy = args.has('copy');
const overwrite = args.has('overwrite');
const allowEmpty = args.has('allow-empty') || args.has('allowEmpty');
const validate = args.has('validate') || args.has('check');
const dataUrlStdin = args.has('data-url-stdin') || args.has('dataUrlStdin');
const base64Stdin = args.has('stdin-base64') || args.has('stdinBase64');
const stdinFilename = String(args.get('stdin-filename') ?? args.get('stdinFilename') ?? 'source.png').trim();
const scanDirs = valuesFor('dir').length
  ? valuesFor('dir').flatMap((value) => String(value).split(',').map((item) => item.trim()).filter(Boolean))
  : [`${homedir()}/Downloads`];
const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const mimeExtensions = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/jpg', '.jpg'],
  ['image/webp', '.webp'],
]);

function asRepoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function isImage(path) {
  return allowedExtensions.has(extname(path).toLowerCase());
}

async function readStdinText() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8').trim();
}

function decodeBase64Payload(payload, label) {
  const compact = payload.replace(/\s+/g, '');
  if (!compact) throw new Error(`${label} stdin payload is empty`);
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) throw new Error(`${label} stdin payload is not valid base64 text`);
  const buffer = Buffer.from(compact, 'base64');
  if (buffer.length < 512) throw new Error(`${label} stdin payload decoded to ${buffer.length} bytes, which is too small to be a source image`);
  return buffer;
}

function parseDataUrlPayload(text) {
  const match = text.match(/^data:([^;,]+);base64,(.+)$/is);
  if (!match) throw new Error('stdin payload is not a supported data URL; expected data:image/<type>;base64,<payload>');
  const mimeType = match[1].toLowerCase();
  const extension = mimeExtensions.get(mimeType);
  if (!extension) throw new Error(`stdin data URL MIME type ${mimeType} is not supported`);
  return {
    buffer: decodeBase64Payload(match[2], 'data-url'),
    extension,
    file: `stdin-data-url${extension}`,
    mimeType,
    stdinMode: 'data-url',
  };
}

function parseRawBase64Payload(text) {
  const extension = extname(stdinFilename || 'source.png').toLowerCase() || '.png';
  if (!allowedExtensions.has(extension)) {
    throw new Error(`--stdin-filename must end with a supported image extension: ${[...allowedExtensions].join(', ')}`);
  }
  return {
    buffer: decodeBase64Payload(text, 'base64'),
    extension,
    file: stdinFilename || `stdin-base64${extension}`,
    mimeType: null,
    stdinMode: 'base64',
  };
}

async function stdinImageInfo(candidateId) {
  if (!dataUrlStdin && !base64Stdin) return null;
  if (dataUrlStdin && base64Stdin) throw new Error('pass only one stdin image mode: --data-url-stdin or --stdin-base64');
  if (explicitImage) throw new Error('pass either --image or a stdin image mode, not both');
  const parsed = dataUrlStdin
    ? parseDataUrlPayload(await readStdinText())
    : parseRawBase64Payload(await readStdinText());
  const path = resolve(scratchDir, `${candidateId}-stdin-${Date.now()}${parsed.extension}`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, parsed.buffer);
  const info = await stat(path);
  return {
    path,
    file: parsed.file,
    bytes: info.size,
    mtimeMs: Math.round(info.mtimeMs),
    mtime: info.mtime.toISOString(),
    source: 'stdin',
    stdinMode: parsed.stdinMode,
    mimeType: parsed.mimeType,
  };
}

async function walkImages(dir) {
  const results = [];
  async function walk(path) {
    let entries = [];
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
          file: basename(child),
          bytes: info.size,
          mtimeMs: Math.round(info.mtimeMs),
          mtime: info.mtime.toISOString(),
        });
      }
    }
  }
  await walk(resolve(dir));
  return results;
}

async function fileInfo(path) {
  const info = await stat(path);
  if (!info.isFile()) throw new Error(`${path} is not a file`);
  if (!isImage(path)) throw new Error(`${path} is not a supported image: ${[...allowedExtensions].join(', ')}`);
  if (info.size < 512) throw new Error(`${path} is too small to be a source image`);
  return {
    path: resolve(path),
    file: basename(path),
    bytes: info.size,
    mtimeMs: Math.round(info.mtimeMs),
    mtime: info.mtime.toISOString(),
  };
}

function validateSourceImage(id, path) {
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
    metrics: parsed?.metrics?.[0] ?? null,
    failures: imageFailures,
  };
}

const marker = await readJson(markerPath, null);
if (!marker || marker.schema !== 'water9/source-imagegen-handoff-marker@1') {
  console.error(JSON.stringify({
    found: false,
    markerPath,
    failures: [`could not read source imagegen marker at ${asRepoRelative(markerPath)}`],
    next: ['run npm run source:session -- --id <candidate-id> before image generation'],
  }, null, 2));
  process.exit(1);
}

const candidateId = explicitId || marker.candidateId;
if (!candidateId) {
  console.error(JSON.stringify({
    found: false,
    markerPath,
    failures: ['candidate id is missing; pass --id <candidate-id>'],
  }, null, 2));
  process.exit(1);
}
if (explicitId && marker.candidateId && explicitId !== marker.candidateId) {
  console.error(JSON.stringify({
    found: false,
    markerPath,
    failures: [`--id ${explicitId} does not match marker candidateId ${marker.candidateId}`],
  }, null, 2));
  process.exit(1);
}

let candidates = [];
if (dataUrlStdin || base64Stdin) {
  candidates = [await stdinImageInfo(candidateId)];
} else if (explicitImage) {
  candidates = [await fileInfo(explicitImage)];
} else {
  const files = (await Promise.all(scanDirs.map((dir) => walkImages(dir)))).flat();
  candidates = files
    .filter((file) => file.mtimeMs >= Number(marker.createdAtMs ?? 0))
    .sort((left, right) => right.mtimeMs - left.mtimeMs || left.path.localeCompare(right.path));
}

const extension = extname(candidates[0]?.path ?? '.png').toLowerCase() || '.png';
const target = resolve(targetDir, `${candidateId}${extension}`);
const failures = [];
if (!candidates.length) {
  failures.push(`no candidate image found after marker time ${marker.createdAt ?? 'missing'}`);
}
if (candidates.length > 1 && !explicitImage) {
  failures.push(`found ${candidates.length} images after marker; pass --image <path> to choose one explicitly`);
}
if (candidates.length === 1 && !overwrite) {
  try {
    const existing = await stat(target);
    if (existing.isFile()) failures.push(`target ${asRepoRelative(target)} already exists; pass --overwrite to replace`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const imageCheck = candidates.length === 1 && validate
  ? validateSourceImage(candidateId, candidates[0].path)
  : { checked: false, metrics: null, failures: [] };
if (imageCheck.failures.length) {
  failures.push(...imageCheck.failures);
}

if (failures.length) {
  const summary = {
    schema: 'water9/source-inline-recovery@1',
    candidateId,
    markerPath: asRepoRelative(markerPath),
    markedAt: marker.createdAt ?? null,
    scanDirs: scanDirs.map(asRepoRelative),
    stdinMode: dataUrlStdin ? 'data-url' : base64Stdin ? 'base64' : null,
    target: asRepoRelative(target),
    copyRequested: copy,
    copied: false,
    imageCheck,
    candidates: candidates.map((candidate) => ({ ...candidate, path: asRepoRelative(candidate.path) })),
    failures,
    next: allowEmpty
      ? ['save the inline image into Downloads or pass --image <path> after saving it manually']
      : [
          'save the inline image into Downloads, then rerun with --copy',
          'or pass --image <path> --copy',
          'or pipe an image data URL with --data-url-stdin --copy',
          'or pipe raw base64 with --stdin-base64 --stdin-filename <name>.png --copy',
        ],
  };
  const output = JSON.stringify(summary, null, 2);
  if (allowEmpty && !copy && failures.every((failure) => failure.startsWith('no candidate image'))) {
    console.log(output);
    process.exit(0);
  }
  console.error(output);
  process.exit(1);
}

if (copy) {
  await mkdir(dirname(target), { recursive: true });
  await copyFile(candidates[0].path, target);
}

const summary = {
  schema: 'water9/source-inline-recovery@1',
  candidateId,
  markerPath: asRepoRelative(markerPath),
  markedAt: marker.createdAt ?? null,
  scanDirs: scanDirs.map(asRepoRelative),
  stdinMode: dataUrlStdin ? 'data-url' : base64Stdin ? 'base64' : null,
  selected: { ...candidates[0], path: asRepoRelative(candidates[0].path) },
  target: asRepoRelative(target),
  copyRequested: copy,
  copied: copy,
  imageCheck,
  next: [
    `npm run source:inbox-check -- --dir ${asRepoRelative(targetDir)} --strict --ids ${candidateId}`,
    `npm run source:ingest-batch -- --dir ${asRepoRelative(targetDir)} --strict --ids ${candidateId} --dry-run`,
    `npm run source:ingest-batch -- --dir ${asRepoRelative(targetDir)} --strict --ids ${candidateId}`,
    'npm run source:check',
    'npm run source:gallery',
  ],
};
console.log(JSON.stringify(summary, null, 2));

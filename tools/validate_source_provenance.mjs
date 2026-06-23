import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { sourceImageMetadata } from './source_image_metadata.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const candidateId = args.get('id');
const repair = args.has('repair');

function asRepoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

function expectEqual(failures, owner, field, actual, expected) {
  if (actual !== expected) failures.push(`${owner}: sourceIngest.${field} is ${actual ?? 'missing'}, expected ${expected ?? 'missing'}`);
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.schema !== 'water9/source-candidates@1') {
  throw new Error(`Unexpected source candidate schema ${manifest.schema ?? 'missing'}`);
}

let candidates = Array.isArray(manifest.candidates) ? manifest.candidates : [];
if (candidateId) candidates = candidates.filter((candidate) => candidate.id === candidateId);
if (candidateId && candidates.length === 0) {
  console.error(JSON.stringify({ manifest: manifestPath, candidateId, failures: [`candidate ${candidateId} was not found`] }, null, 2));
  process.exit(1);
}

const checked = [];
const repaired = [];
const failures = [];

for (const candidate of candidates) {
  if (!candidate.source) {
    checked.push({ id: candidate.id, checked: false, reason: 'no source' });
    continue;
  }
  const owner = candidate.id ?? 'unknown-candidate';
  let metadata = null;
  try {
    metadata = await sourceImageMetadata(resolve(candidate.source));
  } catch (error) {
    failures.push(`${owner}: could not inspect source ${candidate.source}: ${error.message}`);
    checked.push({ id: owner, checked: false, source: candidate.source });
    continue;
  }

  const expected = {
    sourceBytes: metadata.bytes,
    sourceSha256: metadata.sha256,
    sourceWidth: metadata.width,
    sourceHeight: metadata.height,
    sourceFile: basename(candidate.source),
  };
  const sourceIngest = candidate.sourceIngest && typeof candidate.sourceIngest === 'object'
    ? candidate.sourceIngest
    : {};
  const itemFailures = [];
  for (const [field, expectedValue] of Object.entries(expected)) {
    expectEqual(itemFailures, owner, field, sourceIngest[field], expectedValue);
  }

  if (itemFailures.length && repair) {
    candidate.sourceIngest = {
      ...sourceIngest,
      copiedIntoProject: sourceIngest.copiedIntoProject ?? true,
      sourceFile: expected.sourceFile,
      sourceBytes: expected.sourceBytes,
      sourceSha256: expected.sourceSha256,
      sourceWidth: expected.sourceWidth,
      sourceHeight: expected.sourceHeight,
      repairedAt: new Date().toISOString(),
      repairedFrom: asRepoRelative(manifestPath),
    };
    repaired.push(owner);
  } else {
    failures.push(...itemFailures);
  }

  checked.push({
    id: owner,
    checked: true,
    source: candidate.source,
    bytes: metadata.bytes,
    sha256: metadata.sha256,
    width: metadata.width,
    height: metadata.height,
    failures: itemFailures,
  });
}

if (repair && repaired.length) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const summary = {
  schema: 'water9/source-provenance-check@1',
  manifest: manifestPath,
  candidateId: candidateId ?? null,
  repair,
  candidates: candidates.length,
  checkedImages: checked.filter((item) => item.checked).length,
  repaired,
  checked,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));

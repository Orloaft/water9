import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { rigAcceptedStrict } from './content_quality_predicates.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const paths = {
  ledger: resolve(String(args.get('ledger') ?? 'public/review/content-acceptance-ledger.json')),
  runtime: resolve(String(args.get('runtime') ?? 'public/assets/generated/articulated-creatures.parts.json')),
  generatedDir: resolve(String(args.get('generated-dir') ?? 'public/assets/generated')),
};
const minAccepted = Number(args.get('min-accepted') ?? 0);
const DISALLOWED_REVIEWERS = new Set(['codex', 'assistant', 'ai', 'agent', 'automation', 'bot', 'model']);
const failures = [];

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function readJson(label, path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return fallback;
  }
}

async function fileOk(path, minSize = 128) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size >= minSize;
  } catch {
    return false;
  }
}

async function loadSourceManifests() {
  const manifests = new Map();
  let files = [];
  try {
    files = await readdir(paths.generatedDir);
  } catch (error) {
    failures.push(`generated dir: could not list ${paths.generatedDir}: ${error.message}`);
    return manifests;
  }
  for (const file of files.filter((candidate) => candidate.endsWith('.articulated.json'))) {
    const path = resolve(paths.generatedDir, file);
    const data = await readJson(`source manifest ${file}`, path, null);
    if (data?.runtimeCreatureId) manifests.set(data.runtimeCreatureId, { ...data, _file: file, _path: path });
  }
  return manifests;
}

function qualityHash(quality) {
  return sha256(stableJson(quality ?? null));
}

function qualityLooksHumanAccepted(quality) {
  return rigAcceptedStrict({ quality });
}

function validateLedgerEntry(entry, runtimeById, sourceManifests, seenIds) {
  const id = String(entry?.id ?? '').trim();
  if (!id) {
    failures.push('ledger entry is missing id');
    return false;
  }
  if (seenIds.has(id)) failures.push(`${id}: duplicate ledger entry`);
  seenIds.add(id);
  if (entry.schema && entry.schema !== 'water9/content-acceptance-ledger-entry@1') {
    failures.push(`${id}: entry schema ${entry.schema} is not water9/content-acceptance-ledger-entry@1`);
  }
  if (entry.status !== 'accepted') failures.push(`${id}: ledger status ${entry.status ?? 'missing'} is not accepted`);
  if (entry.decision !== 'human-approved') failures.push(`${id}: ledger decision ${entry.decision ?? 'missing'} is not human-approved`);
  if (entry.tool !== 'tools/accept_articulated_creature.mjs') {
    failures.push(`${id}: ledger tool ${entry.tool ?? 'missing'} did not come from tools/accept_articulated_creature.mjs`);
  }
  if (!String(entry.recordedAt ?? '').trim()) failures.push(`${id}: ledger recordedAt is missing`);

  const creature = runtimeById.get(id);
  if (!creature) {
    failures.push(`${id}: ledger entry has no runtime creature`);
    return false;
  }
  const sourceManifest = sourceManifests.get(id);
  if (!sourceManifest) {
    failures.push(`${id}: ledger entry has no articulated source manifest`);
  }
  const quality = creature.quality ?? {};
  if (!qualityLooksHumanAccepted(quality)) failures.push(`${id}: runtime quality is not a human accepted record`);
  if (sourceManifest?.quality && qualityHash(sourceManifest.quality) !== qualityHash(quality)) {
    failures.push(`${id}: source manifest quality does not match runtime quality`);
  }
  if (String(entry.sourceCandidateId ?? '') !== String(quality.sourceCandidateId ?? '')) {
    failures.push(`${id}: ledger sourceCandidateId ${entry.sourceCandidateId ?? 'missing'} does not match runtime ${quality.sourceCandidateId ?? 'missing'}`);
  }
  if (String(entry.reviewedBy ?? '') !== String(quality.reviewedBy ?? '')) {
    failures.push(`${id}: ledger reviewedBy does not match runtime quality`);
  }
  if (String(entry.reviewedAt ?? '') !== String(quality.reviewedAt ?? '')) {
    failures.push(`${id}: ledger reviewedAt does not match runtime quality`);
  }
  if (String(entry.acceptanceNote ?? '') !== String(quality.acceptanceNote ?? '')) {
    failures.push(`${id}: ledger acceptanceNote does not match runtime quality`);
  }
  const expectedQualitySha = qualityHash(quality);
  if (entry.qualitySha256 !== expectedQualitySha) {
    failures.push(`${id}: ledger qualitySha256 is stale or missing`);
  }
  if (entry.sourceManifest && sourceManifest?._file && entry.sourceManifest !== `public/assets/generated/${sourceManifest._file}`) {
    failures.push(`${id}: ledger sourceManifest ${entry.sourceManifest} does not match public/assets/generated/${sourceManifest._file}`);
  }
  return qualityLooksHumanAccepted(quality)
    && entry.status === 'accepted'
    && entry.decision === 'human-approved'
    && entry.qualitySha256 === expectedQualitySha;
}

const ledger = await readJson('acceptance ledger', paths.ledger, { schema: null, entries: [] });
const runtime = await readJson('runtime articulated manifest', paths.runtime, { schema: null, creatures: [] });
const sourceManifests = await loadSourceManifests();
const creatures = Array.isArray(runtime?.creatures) ? runtime.creatures : [];
const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
if (ledger?.schema !== 'water9/content-acceptance-ledger@1') {
  failures.push(`acceptance ledger schema ${ledger?.schema ?? 'missing'} is not water9/content-acceptance-ledger@1`);
}
if (!Array.isArray(ledger?.entries)) failures.push('acceptance ledger entries must be an array');
if (!(await fileOk(paths.ledger, 64))) failures.push('acceptance ledger file is missing or too small');

const runtimeById = new Map(creatures.map((creature) => [creature.id, creature]));
const seenIds = new Set();
let validAcceptedEntries = 0;
for (const entry of entries) {
  if (validateLedgerEntry(entry, runtimeById, sourceManifests, seenIds)) validAcceptedEntries += 1;
}

const runtimeAcceptedIds = creatures
  .filter((creature) => rigAcceptedStrict(creature))
  .map((creature) => creature.id)
  .sort();
for (const id of runtimeAcceptedIds) {
  if (!seenIds.has(id)) {
    failures.push(`${id}: runtime creature is accepted but missing from content acceptance ledger`);
  }
}
if (validAcceptedEntries < minAccepted) {
  failures.push(`valid accepted ledger entries ${validAcceptedEntries} below required ${minAccepted}`);
}

const summary = {
  schema: 'water9/content-acceptance-ledger-check@1',
  ledger: paths.ledger,
  entries: entries.length,
  validAcceptedEntries,
  runtimeAccepted: runtimeAcceptedIds.length,
  targetThreats: ledger?.targetThreats ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const paths = {
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  runtime: resolve(String(args.get('runtime') ?? 'public/assets/generated/articulated-creatures.parts.json')),
  exceptions: resolve(String(args.get('exceptions') ?? 'public/review/content-runtime-roster-exceptions.json')),
  evidenceMatrix: resolve(String(args.get('evidence-matrix') ?? 'public/review/content-review-evidence-matrix.json')),
};

const failures = [];

async function readJson(label, path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueValues(values) {
  return [...new Set(values)];
}

const sourceCandidates = await readJson('source candidates', paths.sourceCandidates);
const runtime = await readJson('runtime manifest', paths.runtime);
const exceptions = await readJson('runtime roster exceptions', paths.exceptions);
const evidenceMatrix = await readJson('review evidence matrix', paths.evidenceMatrix);

if (sourceCandidates?.schema !== 'water9/source-candidates@1') failures.push(`unexpected source candidates schema ${sourceCandidates?.schema ?? 'missing'}`);
if (runtime?.schema !== 'asset-forge/sprite-parts@1') failures.push(`unexpected runtime schema ${runtime?.schema ?? 'missing'}`);
if (exceptions?.schema !== 'water9/content-runtime-roster-exceptions@1') failures.push(`unexpected exceptions schema ${exceptions?.schema ?? 'missing'}`);
if (evidenceMatrix?.schema !== 'water9/content-review-evidence-matrix@1') failures.push(`unexpected evidence matrix schema ${evidenceMatrix?.schema ?? 'missing'}`);

const candidates = asArray(sourceCandidates?.candidates);
const candidateIds = new Set(candidates.map((candidate) => candidate.id));
const runtimeCreatures = asArray(runtime?.creatures);
const exceptionItems = asArray(exceptions?.exceptions);
const exceptionById = new Map(exceptionItems.map((item) => [item.id, item]));
const matrixRows = asArray(evidenceMatrix?.rows);

if (candidates.length < 20) failures.push(`active source-candidate roster has ${candidates.length}/20 candidates`);
const exceptionIds = exceptionItems.map((item) => item.id).filter(Boolean);
if (exceptionIds.length !== uniqueValues(exceptionIds).length) failures.push('runtime roster exceptions contain duplicate ids');

const mappedRuntimeIds = new Set();
for (const creature of runtimeCreatures) {
  const sourceCandidateId = creature.quality?.sourceCandidateId;
  if (sourceCandidateId) {
    if (!candidateIds.has(sourceCandidateId)) {
      failures.push(`${creature.id}: quality.sourceCandidateId ${sourceCandidateId} is not in the active 20-threat roster`);
    } else {
      mappedRuntimeIds.add(creature.id);
    }
  } else if (candidateIds.has(creature.id)) {
    mappedRuntimeIds.add(creature.id);
  }
}

const unmappedRuntimePrototypes = runtimeCreatures.filter((creature) => !mappedRuntimeIds.has(creature.id) && creature.quality?.status !== 'accepted');
for (const creature of unmappedRuntimePrototypes) {
  const exception = exceptionById.get(creature.id);
  if (!exception) {
    failures.push(`${creature.id}: unmapped runtime prototype lacks a roster exception`);
    continue;
  }
  if (exception.countsTowardGoal !== false) failures.push(`${creature.id}: roster exception must set countsTowardGoal false`);
  if (!exception.outOfGoalReason && !exception.supersededBy) failures.push(`${creature.id}: roster exception must include outOfGoalReason or supersededBy`);
  if (exception.supersededBy && !candidateIds.has(exception.supersededBy)) {
    failures.push(`${creature.id}: supersededBy ${exception.supersededBy} is not an active source candidate`);
  }
}

for (const exception of exceptionItems) {
  const creature = runtimeCreatures.find((item) => item.id === exception.id);
  if (!creature) {
    failures.push(`${exception.id}: roster exception references missing runtime creature`);
    continue;
  }
  if (mappedRuntimeIds.has(exception.id)) failures.push(`${exception.id}: roster exception should not exist for mapped runtime creature`);
}

if ((evidenceMatrix?.summary?.runtimeMappedCandidates ?? -1) !== mappedRuntimeIds.size) {
  failures.push('evidence matrix runtimeMappedCandidates mismatch with roster integrity mapping');
}
if ((evidenceMatrix?.summary?.unmappedPrototypeThreats ?? -1) !== unmappedRuntimePrototypes.length) {
  failures.push('evidence matrix unmappedPrototypeThreats mismatch with roster integrity mapping');
}
for (const row of matrixRows) {
  if (!candidateIds.has(row.id)) failures.push(`${row.id}: evidence matrix row is not in active source-candidate roster`);
  if (row.runtimeId && !mappedRuntimeIds.has(row.runtimeId)) failures.push(`${row.id}: evidence matrix runtimeId ${row.runtimeId} is not mapped by roster integrity rules`);
}

if (failures.length) {
  console.error(JSON.stringify({
    schema: 'water9/content-runtime-roster-integrity@1',
    failures,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  schema: 'water9/content-runtime-roster-integrity@1',
  sourceCandidates: candidates.length,
  runtimeCreatures: runtimeCreatures.length,
  mappedRuntime: mappedRuntimeIds.size,
  unmappedRuntimePrototypes: unmappedRuntimePrototypes.length,
  exceptions: exceptionItems.length,
  failures: [],
}, null, 2));

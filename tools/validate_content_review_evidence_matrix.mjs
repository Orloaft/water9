import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  rigAcceptedStrict,
  sourceApprovedStrict,
  threatAcceptedForContentGate,
} from './content_quality_predicates.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const paths = {
  matrix: resolve(String(args.get('json') ?? 'public/review/content-review-evidence-matrix.json')),
  html: resolve(String(args.get('html') ?? 'public/review/content-review-evidence-matrix.html')),
  markdown: resolve(String(args.get('md') ?? 'public/review/content-review-evidence-matrix.md')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  acceptanceRunway: resolve(String(args.get('acceptance-runway') ?? 'public/review/content-acceptance-runway.json')),
  sandboxManifest: resolve(String(args.get('sandbox') ?? 'public/review/sandbox/manifest.json')),
  runtime: resolve(String(args.get('runtime') ?? 'public/assets/generated/articulated-creatures.parts.json')),
  articulatedReview: resolve(String(args.get('articulated-review') ?? 'public/review/articulated/review-manifest.json')),
  sourceParity: resolve(String(args.get('source-parity') ?? 'tools/scratch/articulated-source-parity.json')),
  visualCohesion: resolve(String(args.get('visual-cohesion') ?? 'tools/scratch/articulated-visual-cohesion.json')),
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

async function readText(label, path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    failures.push(`${label}: could not read file: ${error.message}`);
    return '';
  }
}

async function fileOk(label, path, minSize) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minSize) failures.push(`${label}: missing or too small`);
  } catch {
    failures.push(`${label}: missing`);
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function includesText(text, value) {
  return text.includes(value) || text.includes(htmlEscape(value));
}

function runtimeForCandidate(runtimeCreatures, candidate) {
  return runtimeCreatures.find((creature) => creature.quality?.sourceCandidateId === candidate.id)
    ?? runtimeCreatures.find((creature) => candidate.riggedCreatureId && creature.id === candidate.riggedCreatureId)
    ?? runtimeCreatures.find((creature) => creature.id === candidate.id)
    ?? null;
}

const matrix = await readJson('content review evidence matrix', paths.matrix);
const sourceCandidates = await readJson('source candidates', paths.sourceCandidates);
const acceptanceRunway = await readJson('acceptance runway', paths.acceptanceRunway);
const sandboxManifest = await readJson('sandbox manifest', paths.sandboxManifest);
const runtime = await readJson('runtime manifest', paths.runtime);
const articulatedReview = await readJson('articulated review', paths.articulatedReview);
const sourceParity = await readJson('source parity', paths.sourceParity);
const visualCohesion = await readJson('visual cohesion', paths.visualCohesion);
const html = await readText('content review evidence matrix html', paths.html);
const markdown = await readText('content review evidence matrix markdown', paths.markdown);

await fileOk('content review evidence matrix html', paths.html, 4096);
await fileOk('content review evidence matrix markdown', paths.markdown, 1024);

if (matrix?.schema !== 'water9/content-review-evidence-matrix@1') failures.push(`unexpected matrix schema ${matrix?.schema ?? 'missing'}`);
if (sourceCandidates?.schema !== 'water9/source-candidates@1') failures.push(`unexpected source candidates schema ${sourceCandidates?.schema ?? 'missing'}`);
if (acceptanceRunway?.schema !== 'water9/content-acceptance-runway@1') failures.push(`unexpected acceptance runway schema ${acceptanceRunway?.schema ?? 'missing'}`);
if (sandboxManifest?.schema !== 'water9/sandbox-index@1') failures.push(`unexpected sandbox schema ${sandboxManifest?.schema ?? 'missing'}`);
if (articulatedReview?.schema !== 'water9/articulated-review@1') failures.push(`unexpected articulated review schema ${articulatedReview?.schema ?? 'missing'}`);

const candidates = asArray(sourceCandidates?.candidates);
const rows = asArray(matrix?.rows);
const runtimeCreatures = asArray(runtime?.creatures);
const sandboxIds = new Set(asArray(sandboxManifest?.entries).map((entry) => entry.id));
const acceptanceById = new Map(asArray(acceptanceRunway?.items).map((item) => [item.id, item]));
const articulatedById = new Map(asArray(articulatedReview?.creatures).map((item) => [item.id, item]));
const sourceParityById = new Map(asArray(sourceParity?.creatures).map((item) => [item.id, item]));
const visualCohesionById = new Map(asArray(visualCohesion?.creatures).map((item) => [item.id, item]));
const rowById = new Map(rows.map((row) => [row.id, row]));

if (rows.length !== candidates.length) failures.push(`matrix rows ${rows.length} does not match candidates ${candidates.length}`);
const rowIds = rows.map((row) => row.id).filter(Boolean);
if (rowIds.length !== uniqueValues(rowIds).length) failures.push('matrix has duplicate candidate rows');
if ((matrix?.summary?.sourceCandidates ?? -1) !== candidates.length) failures.push('summary sourceCandidates mismatch');
if ((matrix?.summary?.sourceImages ?? -1) !== candidates.filter((candidate) => candidate.source).length) failures.push('summary sourceImages mismatch');
if ((matrix?.summary?.sourceApproved ?? -1) !== candidates.filter(sourceApprovedStrict).length) failures.push('summary sourceApproved mismatch');

let expectedMappedRuntime = 0;
let expectedMechanicallyComplete = 0;
let expectedAccepted = 0;
const mappedRuntimeIds = new Set();
for (const candidate of candidates) {
  const row = rowById.get(candidate.id);
  if (!row) {
    failures.push(`${candidate.id}: missing matrix row`);
    continue;
  }
  const runtimeCreature = runtimeForCandidate(runtimeCreatures, candidate);
  const runtimeId = runtimeCreature?.id ?? null;
  const articulated = runtimeId ? articulatedById.get(runtimeId) : null;
  const parity = runtimeId ? sourceParityById.get(runtimeId) : null;
  const cohesion = runtimeId ? visualCohesionById.get(runtimeId) : null;
  const accepted = threatAcceptedForContentGate(candidate, runtimeCreature, articulated);
  const mechanical = Boolean(runtimeCreature)
    && Boolean(articulated)
    && Boolean(parity)
    && asArray(parity?.failures).length === 0
    && Boolean(cohesion)
    && cohesion.status === 'pass'
    && asArray(cohesion?.failures).length === 0
    && sandboxIds.has(runtimeId);

  if (runtimeCreature) {
    expectedMappedRuntime += 1;
    mappedRuntimeIds.add(runtimeId);
  }
  if (mechanical) expectedMechanicallyComplete += 1;
  if (accepted) expectedAccepted += 1;

  if (row.species !== candidate.species) failures.push(`${candidate.id}: species mismatch`);
  if (row.sourcePresent !== Boolean(candidate.source)) failures.push(`${candidate.id}: sourcePresent mismatch`);
  if (row.sourceApproved !== sourceApprovedStrict(candidate)) failures.push(`${candidate.id}: sourceApproved mismatch`);
  if (row.runtimeRegistered !== Boolean(runtimeCreature)) failures.push(`${candidate.id}: runtimeRegistered mismatch`);
  if ((row.runtimeId ?? null) !== runtimeId) failures.push(`${candidate.id}: runtimeId mismatch`);
  if (row.mechanicalRigEvidenceComplete !== mechanical) failures.push(`${candidate.id}: mechanicalRigEvidenceComplete mismatch`);
  if (row.threatAccepted !== accepted) failures.push(`${candidate.id}: threatAccepted mismatch`);
  if (row.threatAccepted && !row.sourceApproved) failures.push(`${candidate.id}: threatAccepted requires sourceApproved`);
  if (!Array.isArray(row.blockers)) failures.push(`${candidate.id}: blockers must be an array`);
  if (!row.nextHumanGate) failures.push(`${candidate.id}: nextHumanGate missing`);
  const acceptance = acceptanceById.get(candidate.id);
  if ((row.acceptancePacket ?? null) !== (acceptance?.acceptancePacket?.file ?? null)) failures.push(`${candidate.id}: acceptance packet mismatch`);
  if (row.threatAccepted && row.nextHumanGate !== 'none') failures.push(`${candidate.id}: accepted threat should not have a next human gate`);
  if (!row.threatAccepted && row.nextHumanGate === 'none') failures.push(`${candidate.id}: non-accepted threat must name next human gate`);
  for (const expected of [candidate.id, candidate.species, row.nextHumanGate]) {
    if (!includesText(html, expected)) failures.push(`html missing ${expected}`);
    if (!markdown.includes(candidate.id)) failures.push(`markdown missing ${candidate.id}`);
  }
}

const expectedUnmapped = runtimeCreatures.filter((creature) => !mappedRuntimeIds.has(creature.id) && creature.quality?.status !== 'accepted').length;
if ((matrix?.summary?.runtimeMappedCandidates ?? -1) !== expectedMappedRuntime) failures.push('summary runtimeMappedCandidates mismatch');
if ((matrix?.summary?.unmappedPrototypeThreats ?? -1) !== expectedUnmapped) failures.push('summary unmappedPrototypeThreats mismatch');
if ((matrix?.summary?.mechanicallyCompleteMappedRigs ?? -1) !== expectedMechanicallyComplete) failures.push('summary mechanicallyCompleteMappedRigs mismatch');
if ((matrix?.summary?.acceptedThreats ?? -1) !== expectedAccepted) failures.push('summary acceptedThreats mismatch');
if (matrix?.summary?.strictGoalComplete !== (expectedAccepted >= (matrix?.summary?.targetThreats ?? 20))) failures.push('summary strictGoalComplete mismatch');
if (!html.includes('Automation evidence is separated from human approval')) failures.push('html missing automation boundary copy');
if (!markdown.includes('Automated checks prove only')) failures.push('markdown missing automation boundary copy');

if (failures.length) {
  console.error(JSON.stringify({
    schema: 'water9/content-review-evidence-matrix-validation@1',
    failures,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  schema: 'water9/content-review-evidence-matrix-validation@1',
  rows: rows.length,
  runtimeMappedCandidates: matrix?.summary?.runtimeMappedCandidates ?? 0,
  unmappedPrototypeThreats: matrix?.summary?.unmappedPrototypeThreats ?? 0,
  acceptedThreats: matrix?.summary?.acceptedThreats ?? 0,
  failures: [],
}, null, 2));

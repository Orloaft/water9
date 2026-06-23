import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const id = args.get('id');
const importAll = args.has('all');
const statusFilter = String(args.get('status') ?? 'ready');
const dryRun = args.has('dry-run') || args.has('dryRun');
const overwrite = args.has('overwrite');
const researchPath = resolve(String(args.get('research') ?? 'public/review/source-candidates/research-briefs.json'));
const candidatePath = resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json'));

function usage() {
  console.error('Usage: node tools/import_research_brief_to_source_candidate.mjs --id <brief-id> [--dry-run] [--overwrite]');
  console.error('   or: node tools/import_research_brief_to_source_candidate.mjs --all [--status ready|candidate-queued] [--dry-run] [--overwrite]');
}

if ((!id && !importAll) || (id && importAll)) {
  usage();
  process.exit(1);
}

function candidateFromBrief(brief) {
  return {
    id: brief.sourceCandidateId ?? brief.id,
    species: brief.species,
    status: 'draft',
    source: null,
    sourceCohesion: 'single-source',
    backgroundKey: 'magenta',
    researchBriefId: brief.id,
    depthBand: brief.depthBand,
    gameplayVerb: brief.gameplayVerb,
    requiredRead: brief.requiredRead,
    brief: [
      ...brief.biologicalAnchors.map((anchor) => `Anchor: ${anchor}`),
      ...brief.motionPhases.map((phase) => `Motion: ${phase}`),
    ],
    articulatableParts: brief.articulatableParts,
    prompt: brief.promptSeed,
    promptRisks: brief.promptRisks,
    notes: 'Draft source candidate imported from structured research brief. Do not rig until whole-source art passes source-candidate review.',
  };
}

const research = JSON.parse(await readFile(researchPath, 'utf8'));
const candidates = JSON.parse(await readFile(candidatePath, 'utf8'));
if (research.schema !== 'water9/threat-research-briefs@1') throw new Error(`Unexpected research schema ${research.schema ?? 'missing'}`);
if (candidates.schema !== 'water9/source-candidates@1') throw new Error(`Unexpected source candidate schema ${candidates.schema ?? 'missing'}`);
if (!Array.isArray(research.briefs)) throw new Error('Research manifest needs a briefs array');
if (!Array.isArray(candidates.candidates)) candidates.candidates = [];

const briefs = importAll
  ? research.briefs.filter((entry) => entry.status === statusFilter)
  : [research.briefs.find((entry) => entry.id === id)];
if (briefs.some((entry) => !entry)) throw new Error(`No research brief found with id ${id}`);
if (!briefs.length) {
  console.log(JSON.stringify({ dryRun, importAll, statusFilter, imported: [] }, null, 2));
  process.exit(0);
}

const imported = [];
for (const brief of briefs) {
  if (!['ready', 'candidate-queued'].includes(brief.status)) {
    throw new Error(`Research brief ${brief.id} must be ready before import; current status is ${brief.status}`);
  }
  const candidate = candidateFromBrief(brief);
  const existingIndex = candidates.candidates.findIndex((entry) => entry.id === candidate.id);
  if (existingIndex >= 0 && !overwrite && !importAll) {
    throw new Error(`Source candidate ${candidate.id} already exists; pass --overwrite to replace it`);
  }
  if (existingIndex >= 0 && overwrite) {
    candidates.candidates[existingIndex] = { ...candidates.candidates[existingIndex], ...candidate };
  } else if (existingIndex < 0) {
    candidates.candidates.push(candidate);
  }
  brief.status = 'candidate-queued';
  brief.sourceCandidateId = candidate.id;
  imported.push({
    id: brief.id,
    sourceCandidateId: candidate.id,
    overwritten: existingIndex >= 0 && overwrite,
    skippedExisting: existingIndex >= 0 && !overwrite,
  });
}
if (!dryRun) {
  await writeFile(candidatePath, `${JSON.stringify(candidates, null, 2)}\n`);
  await writeFile(researchPath, `${JSON.stringify(research, null, 2)}\n`);
}
console.log(JSON.stringify({ dryRun, importAll, statusFilter: importAll ? statusFilter : null, imported }, null, 2));

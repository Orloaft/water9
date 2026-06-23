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

const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const queuePath = resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json'));
const id = args.get('id');
const jsonOnly = args.has('json');
const includeExistingSource = args.has('include-existing-source');
const statusFilter = String(args.get('status') ?? 'draft,needs-review')
  .split(',')
  .map((status) => status.trim())
  .filter(Boolean);
const SOURCE_POSE_RULES = [
  'Generate a neutral riggable source pose, not the peak attack impact frame.',
  'Attack direction must still be obvious from the creature silhouette, mouth/claw/spine orientation, or lure/eye aim.',
  'Primary pivots and hinge zones must be visible: jaw pivots, limb roots, fin roots, tail base, stalk base, or equivalent anatomy.',
  'Major appendages must be separated enough for later cropping, with small overlaps allowed only where anatomy connects.',
  'Default pose must show both the idle read and the attack telegraph read without baking in trails, particles, prey, or damage effects.',
];

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.schema !== 'water9/source-candidates@1') {
  throw new Error(`Unexpected source candidate schema ${manifest.schema ?? 'missing'}`);
}
const queue = JSON.parse(await readFile(queuePath, 'utf8').catch(() => '{"candidates":[]}'));
const queued = Array.isArray(queue.candidates) ? queue.candidates : [];

const candidates = Array.isArray(manifest.candidates) ? manifest.candidates : [];
const queuedCandidate = id
  ? queued.find((entry) => entry.id === id)
  : queued.find((entry) => statusFilter.includes(entry.status) && (!entry.hasSource || includeExistingSource));
const candidate = id
  ? candidates.find((entry) => entry.id === id)
  : queuedCandidate
    ? candidates.find((entry) => entry.id === queuedCandidate.id)
    : candidates.find((entry) => statusFilter.includes(entry.status) && (!entry.source || includeExistingSource));

if (!candidate) {
  console.error(JSON.stringify({ manifest: manifestPath, id: id ?? null, found: false }, null, 2));
  process.exit(1);
}
const hardenedPrompt = queuedCandidate?.promptFile
  ? await readFile(resolve(queuedCandidate.promptFile), 'utf8').catch(() => null)
  : null;

const payload = {
  id: candidate.id,
  species: candidate.species,
  status: candidate.status,
  hasSource: Boolean(candidate.source),
  rank: queuedCandidate?.rank ?? null,
  promptFile: queuedCandidate?.promptFile ?? null,
  outputSuggestion: `public/assets/generated/fauna-${candidate.id}-whole-source.png`,
  ingestCommand: `npm run source:ingest -- --id ${candidate.id} --image <image-path> --copy`,
  imageCheckCommand: `npm run source:image-check -- --id ${candidate.id}`,
  prompt: hardenedPrompt?.trim() || queuedCandidate?.prompt || candidate.prompt,
  basePrompt: candidate.prompt,
  requiredRead: queuedCandidate?.requiredRead ?? candidate.requiredRead ?? [],
  sourcePoseRules: queuedCandidate?.sourcePoseRules ?? SOURCE_POSE_RULES,
  qualityChecks: queuedCandidate?.qualityChecks ?? [],
  articulatableParts: queuedCandidate?.articulatableParts ?? candidate.articulatableParts ?? [],
  promptRisks: queuedCandidate?.promptRisks ?? candidate.promptRisks ?? [],
  auditGuidance: queuedCandidate?.auditGuidance ?? null,
};

if (jsonOnly) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`Candidate: ${payload.id} (${payload.species})`);
  console.log(`Output: ${payload.outputSuggestion}`);
  if (payload.rank) console.log(`Queue rank: ${payload.rank}`);
  if (payload.promptFile) console.log(`Prompt file: ${payload.promptFile}`);
  console.log(`Ingest: ${payload.ingestCommand}`);
  console.log(`Check: ${payload.imageCheckCommand}`);
  console.log('');
  console.log('PROMPT');
  console.log(payload.prompt);
  console.log('');
  console.log('REQUIRED READ');
  for (const item of payload.requiredRead) console.log(`- ${item}`);
  console.log('');
  console.log('SOURCE POSE RULES');
  for (const item of payload.sourcePoseRules) console.log(`- ${item}`);
  console.log('');
  if (payload.auditGuidance) {
    console.log('RESEARCH AUDIT HARDENING');
    const patch = payload.auditGuidance.suggestedResearchPatch ?? {};
    const items = [
      `Lane: ${payload.auditGuidance.lane}`,
      ...(patch.biologicalAnchors ?? []).map((item) => `Biological anchor: ${item}`),
      ...(patch.requiredRead ?? []).map((item) => `Extra required read: ${item}`),
      ...(payload.auditGuidance.sourceGenerationRisks ?? []).map((item) => `Avoid: ${item}`),
      ...(patch.promptRisks ?? []).map((item) => `Avoid: ${item}`),
      ...(patch.motionPhases ?? []).map((item) => `Motion phase: ${item}`),
    ];
    for (const item of items) console.log(`- ${item}`);
    console.log('');
  }
  console.log('PROMPT RISKS');
  for (const item of payload.promptRisks) console.log(`- ${item}`);
}

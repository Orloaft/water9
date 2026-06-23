import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

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
const outPath = resolve(String(args.get('out') ?? 'public/review/source-candidates/source-handoff-pack.md'));
const jsonOutPath = resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-handoff-pack.json'));
const includeExistingSource = args.has('include-existing-source');
const statusFilter = String(args.get('status') ?? 'draft,needs-review')
  .split(',')
  .map((status) => status.trim())
  .filter(Boolean);
const limit = Number(args.get('limit') ?? 0);
const SOURCE_POSE_RULES = [
  'Generate a neutral riggable source pose, not the peak attack impact frame.',
  'Attack direction must still be obvious from the creature silhouette, mouth/claw/spine orientation, or lure/eye aim.',
  'Primary pivots and hinge zones must be visible: jaw pivots, limb roots, fin roots, tail base, stalk base, or equivalent anatomy.',
  'Major appendages must be separated enough for later cropping, with small overlaps allowed only where anatomy connects.',
  'Default pose must show both the idle read and the attack telegraph read without baking in trails, particles, prey, or damage effects.',
];

function commandFor(candidate, command, extra = '') {
  return `npm run ${command} -- --id ${candidate.id}${extra}`;
}

function expectedOutput(candidate) {
  return `public/assets/generated/fauna-${candidate.id}-whole-source.png`;
}

async function candidatePacket(candidate, queueItem = null) {
  const output = expectedOutput(candidate);
  const hardenedPrompt = queueItem?.promptFile
    ? await readFile(resolve(queueItem.promptFile), 'utf8').catch(() => null)
    : null;
  return {
    rank: queueItem?.rank ?? null,
    id: candidate.id,
    species: candidate.species,
    status: candidate.status,
    hasSource: Boolean(candidate.source),
    source: candidate.source ?? null,
    depthBand: candidate.depthBand ?? null,
    gameplayVerb: candidate.gameplayVerb ?? null,
    outputSuggestion: output,
    promptFile: queueItem?.promptFile ?? null,
    qualityChecks: queueItem?.qualityChecks ?? [],
    auditGuidance: queueItem?.auditGuidance ?? null,
    commands: {
      markBeforeGeneration: commandFor(candidate, 'source:imagegen-mark'),
      checkForGeneratedFile: commandFor(candidate, 'source:imagegen-status'),
      autoIngestGeneratedFile: commandFor(candidate, 'source:imagegen-status', ' --ingest'),
      ingestGeneratedFile: commandFor(candidate, 'source:ingest', ' --image <image-path> --copy'),
      logRejectedAttempt: commandFor(candidate, 'source:reject-attempt', ' --attempt-kind visual-failure --image <bad-output-path> --reason "<concrete visual failure after inspecting the generated source image>"'),
      logNoFileAttempt: commandFor(candidate, 'source:reject-attempt', ' --attempt-kind missing-artifact --reason "No new image file appeared after image generation."'),
      focusedImageCheck: commandFor(candidate, 'source:image-check'),
      buildSourceGallery: 'npm run source:gallery',
      sourceCandidateCheck: 'npm run source:check',
    },
    prompt: hardenedPrompt?.trim() || queueItem?.prompt || candidate.prompt,
    basePrompt: candidate.prompt,
    sourcePoseRules: queueItem?.sourcePoseRules ?? SOURCE_POSE_RULES,
    requiredRead: queueItem?.requiredRead ?? candidate.requiredRead ?? [],
    articulatableParts: queueItem?.articulatableParts ?? candidate.articulatableParts ?? [],
    promptRisks: queueItem?.promptRisks ?? candidate.promptRisks ?? [],
  };
}

function markdownList(items) {
  if (!items.length) return '- None recorded.';
  return items.map((item) => `- ${item}`).join('\n');
}

function markdownFor(packets, manifest) {
  const lines = [
    '# Water 9 Source Image Handoff Pack',
    '',
    `Manifest: \`${manifestPath}\``,
    `Statuses: \`${statusFilter.join(',')}\``,
    `Include existing source images: \`${includeExistingSource}\``,
    `Candidates: \`${packets.length}\``,
    '',
    'Use each packet as a strict handoff for whole-creature source generation on a pure `#ff00ff` magenta background. Do not ingest outputs that miss the required read; log them as rejected attempts instead.',
    '',
  ];

  for (const [index, packet] of packets.entries()) {
    lines.push(`## ${index + 1}. ${packet.species} (${packet.id})`);
    lines.push('');
    lines.push(`- Status: \`${packet.status}\``);
    if (packet.rank) lines.push(`- Queue rank: \`${packet.rank}\``);
    if (packet.promptFile) lines.push(`- Hardened prompt file: \`${packet.promptFile}\``);
    lines.push(`- Depth band: ${packet.depthBand ?? 'not recorded'}`);
    lines.push(`- Gameplay verb: ${packet.gameplayVerb ?? 'not recorded'}`);
    lines.push(`- Expected output: \`${packet.outputSuggestion}\``);
    lines.push('');
    lines.push('### Commands');
    lines.push('');
    lines.push('```bash');
    lines.push(packet.commands.markBeforeGeneration);
    lines.push('# run image generation with the prompt below');
    lines.push(packet.commands.checkForGeneratedFile);
    lines.push('# if exactly one generated file appears, this validates and ingests it safely:');
    lines.push(packet.commands.autoIngestGeneratedFile);
    lines.push('# otherwise ingest a specific file explicitly:');
    lines.push(packet.commands.ingestGeneratedFile);
    lines.push(packet.commands.focusedImageCheck);
    lines.push(packet.commands.buildSourceGallery);
    lines.push(packet.commands.sourceCandidateCheck);
    lines.push('# if the output fails visual review:');
    lines.push(packet.commands.logRejectedAttempt);
    lines.push('# if no output file appears:');
    lines.push(packet.commands.logNoFileAttempt);
    lines.push('```');
    lines.push('');
    lines.push('### Prompt');
    lines.push('');
    lines.push('```text');
    lines.push(packet.prompt ?? '');
    lines.push('```');
    lines.push('');
    lines.push('### Required Read');
    lines.push('');
    lines.push(markdownList(packet.requiredRead));
    lines.push('');
    lines.push('### Source Pose Rules');
    lines.push('');
    lines.push(markdownList(packet.sourcePoseRules));
    lines.push('');
    if (packet.auditGuidance) {
      const patch = packet.auditGuidance.suggestedResearchPatch ?? {};
      lines.push('### Research Audit Hardening');
      lines.push('');
      lines.push(markdownList([
        `Lane: ${packet.auditGuidance.lane}`,
        ...(patch.biologicalAnchors ?? []).map((item) => `Biological anchor: ${item}`),
        ...(patch.requiredRead ?? []).map((item) => `Extra required read: ${item}`),
        ...(packet.auditGuidance.sourceGenerationRisks ?? []).map((item) => `Avoid: ${item}`),
        ...(patch.promptRisks ?? []).map((item) => `Avoid: ${item}`),
        ...(patch.motionPhases ?? []).map((item) => `Motion phase: ${item}`),
      ]));
      lines.push('');
    }
    lines.push('### Articulatable Parts');
    lines.push('');
    lines.push(markdownList(packet.articulatableParts));
    lines.push('');
    lines.push('### Prompt Risks');
    lines.push('');
    lines.push(markdownList(packet.promptRisks));
    lines.push('');
  }

  lines.push('## Source Manifest Summary');
  lines.push('');
  lines.push(`- Schema: \`${manifest.schema ?? 'missing'}\``);
  lines.push(`- Total manifest candidates: \`${Array.isArray(manifest.candidates) ? manifest.candidates.length : 0}\``);
  lines.push(`- Handoff candidates in this pack: \`${packets.length}\``);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.schema !== 'water9/source-candidates@1') {
  throw new Error(`Unexpected source candidate schema ${manifest.schema ?? 'missing'}`);
}

const queue = JSON.parse(await readFile(queuePath, 'utf8').catch(() => '{"candidates":[]}'));
const queueById = new Map((queue.candidates ?? []).map((candidate) => [candidate.id, candidate]));
let candidates = (manifest.candidates ?? []).filter((candidate) => {
  if (!statusFilter.includes(candidate.status)) return false;
  if (candidate.source && !includeExistingSource) return false;
  return true;
});
if (limit > 0) candidates = candidates.slice(0, limit);
candidates = candidates.sort((left, right) => {
  const leftRank = queueById.get(left.id)?.rank ?? Number.POSITIVE_INFINITY;
  const rightRank = queueById.get(right.id)?.rank ?? Number.POSITIVE_INFINITY;
  return leftRank - rightRank || left.id.localeCompare(right.id);
});

const failures = [];
for (const candidate of candidates) {
  const owner = candidate.id ?? 'unknown-candidate';
  if (!candidate.id) failures.push(`${owner}: missing id`);
  if (!candidate.species) failures.push(`${owner}: missing species`);
  if (!candidate.prompt) failures.push(`${owner}: missing prompt`);
  if (!String(candidate.prompt ?? '').includes('#ff00ff')) failures.push(`${owner}: prompt must name #ff00ff`);
  if (!String(candidate.prompt ?? '').toLowerCase().includes('magenta')) failures.push(`${owner}: prompt must name magenta background`);
  if (!Array.isArray(candidate.requiredRead) || candidate.requiredRead.length < 3) failures.push(`${owner}: needs at least 3 requiredRead checks`);
}

if (failures.length) {
  console.error(JSON.stringify({ manifest: manifestPath, failures }, null, 2));
  process.exit(1);
}

const packets = await Promise.all(candidates.map((candidate) => candidatePacket(candidate, queueById.get(candidate.id) ?? null)));
await mkdir(dirname(outPath), { recursive: true });
await mkdir(dirname(jsonOutPath), { recursive: true });
await writeFile(outPath, markdownFor(packets, manifest));
await writeFile(jsonOutPath, `${JSON.stringify({
  schema: 'water9/source-handoff-pack@1',
  manifest: manifestPath,
  queue: queuePath,
  statuses: statusFilter,
  includeExistingSource,
  candidates: packets,
}, null, 2)}\n`);

console.log(JSON.stringify({
  manifest: manifestPath,
  outPath,
  jsonOutPath,
  statuses: statusFilter,
  includeExistingSource,
  candidates: packets.length,
  failures: [],
}, null, 2));

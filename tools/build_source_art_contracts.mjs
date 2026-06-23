import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

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
const auditDir = resolve(String(args.get('audit-dir') ?? 'public/review/source-candidates/research-subagent-audits'));
const outDir = resolve(String(args.get('out-dir') ?? 'public/review/source-candidates/art-contracts'));
const indexOut = resolve(String(args.get('index-out') ?? 'public/review/source-candidates/art-contracts.md'));
const idFilter = args.has('id') ? new Set(String(args.get('id')).split(',').map((id) => id.trim()).filter(Boolean)) : null;

const GLOBAL_REJECTS = [
  'collage of unrelated animal parts instead of one physically coherent creature',
  'detached mouth, detached limbs, duplicate bodies, loose props, bubbles, prey, water vortex, floor plane, cast shadow, or text',
  'black, white, transparent, textured, gradient, or shadowed background instead of flat #ff00ff magenta',
  'silhouette that fails to communicate the gameplay verb at small sprite scale',
  'parts too thin, overlapped, hidden, or ambiguous to crop into articulated sprites',
  'lighting, palette, or rendering style that changes between body regions',
  'full attack impact pose, motion smear, or VFX-heavy action frame that hides the neutral riggable anatomy',
];
const SOURCE_POSE_RULES = [
  'Generate a neutral riggable source pose, not the peak attack impact frame.',
  'Attack direction must still be obvious from species-appropriate anatomy: jaws, oral disc, osculum, spines, fins, lures, eyes, claws, or body aim.',
  'Primary pivots and crop zones must be visible: jaw pivots, limb roots, fin roots, tail base, stalk base, rim folds, throat valves, or equivalent anatomy.',
  'Major appendages, valves, rims, plates, or tentacles must be separated enough for later cropping, with small overlaps allowed only where anatomy connects.',
  'Default pose must show both the idle read and the attack telegraph read without baking in trails, particles, prey, or damage effects.',
];
const COHESION_LOCK = [
  'One-source proof: render one continuous organism in one neutral source pose, not a parts board, variants sheet, or disconnected thumbnails.',
  'Connection proof: every crop-intended appendage must visibly grow from or overlap the same body with a readable hinge, socket, root, or skin transition.',
  'Style proof: all body regions and crop-intended organs must share one palette, line weight, lighting direction, material language, and shadow logic.',
  'Proportion proof: body parts must look like they belong to the same animal when articulated; reject mismatched copied fragments or arbitrary size jumps.',
  'Production proof: reject outputs that read as placeholder shapes, collage kitbash, props, UI icons, environmental rocks, duplicate creatures, or loose weapons.',
];

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'candidate';
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readJsonOptional(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function readAuditGuidance(dir) {
  const byId = new Map();
  let files = [];
  try {
    files = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return byId;
    throw error;
  }
  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith('.json')) continue;
    const audit = await readJsonOptional(resolve(dir, file.name), null);
    if (audit?.schema !== 'water9/subagent-research-audit@1') continue;
    for (const finding of audit.findings ?? []) {
      if (!finding?.id) continue;
      byId.set(finding.id, {
        lane: audit.lane,
        strengths: finding.strengths ?? [],
        sourceGenerationRisks: finding.sourceGenerationRisks ?? [],
        suggestedResearchPatch: finding.suggestedResearchPatch ?? null,
        referenceSearchTerms: finding.referenceSearchTerms ?? [],
      });
    }
  }
  return byId;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function markdownList(items) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- None recorded.';
}

function auditPromptLines(guidance) {
  if (!guidance) return [];
  const patch = guidance.suggestedResearchPatch ?? {};
  const lines = [
    '',
    'Research audit hardening:',
    `- Lane: ${guidance.lane}`,
  ];
  for (const item of patch.biologicalAnchors ?? []) lines.push(`- Biological anchor: ${item}`);
  for (const item of patch.requiredRead ?? []) lines.push(`- Extra required read: ${item}`);
  for (const item of [...(guidance.sourceGenerationRisks ?? []), ...(patch.promptRisks ?? [])]) lines.push(`- Avoid: ${item}`);
  for (const item of patch.motionPhases ?? []) lines.push(`- Preserve motion phase readability: ${item}`);
  for (const item of guidance.referenceSearchTerms ?? []) lines.push(`- Reference search term: ${item}`);
  return lines;
}

function auditMarkdownItems(guidance) {
  return auditPromptLines(guidance)
    .filter((line) => line && line !== 'Research audit hardening:')
    .map((line) => line.replace(/^- /, ''));
}

function expectedOutput(candidate) {
  return `public/assets/generated/fauna-${candidate.id}-whole-source.png`;
}

function commandFor(candidate, command, extra = '') {
  return `npm run ${command} -- --id ${candidate.id}${extra}`;
}

function compactPrompt(candidate) {
  return [
    candidate.prompt ?? '',
    ...auditPromptLines(candidate.auditGuidance),
    '',
    'Source pose contract:',
    ...SOURCE_POSE_RULES.map((item) => `- ${item}`),
    '',
    'Cohesion lock:',
    ...COHESION_LOCK.map((item) => `- ${item}`),
    '',
    'Non-negotiable pass/fail requirements:',
    ...asArray(candidate.requiredRead).map((item) => `- ${item}`),
    '',
    'Candidate-specific contract checks:',
    ...asArray(candidate.contractReviewChecklist).map((item) => `- ${item}`),
    '',
    'Reject immediately if:',
    ...asArray(candidate.promptRisks).map((item) => `- ${item}`),
    ...GLOBAL_REJECTS.map((item) => `- ${item}`),
  ].join('\n').trim();
}

function contractFor(candidate, rank = null) {
  const fileBase = safeFileName(candidate.id);
  return {
    schema: 'water9/source-art-contract@1',
    generatedFrom: basename(manifestPath),
    id: candidate.id,
    species: candidate.species,
    rank,
    status: candidate.status,
    depthBand: candidate.depthBand ?? null,
    gameplayVerb: candidate.gameplayVerb ?? null,
    expectedOutput: expectedOutput(candidate),
    source: candidate.source ?? null,
    sourceCohesion: candidate.sourceCohesion ?? null,
    backgroundKey: candidate.backgroundKey ?? null,
    requiredRead: asArray(candidate.requiredRead),
    articulatableParts: asArray(candidate.articulatableParts),
    promptRisks: asArray(candidate.promptRisks),
    contractReviewChecklist: asArray(candidate.contractReviewChecklist),
    auditGuidance: candidate.auditGuidance ?? null,
    sourcePoseRules: SOURCE_POSE_RULES,
    cohesionLock: COHESION_LOCK,
    globalRejects: GLOBAL_REJECTS,
    generationPrompt: compactPrompt(candidate),
    reviewChecklist: [
      'Single creature: every visible part belongs to one connected anatomy.',
      'Part continuity: all crop-intended appendages have compatible proportions, visible connection zones, and one lighting/material treatment.',
      'Design read: the silhouette and largest features match the gameplay verb.',
      'Extraction read: required articulated parts are visible, separated, and thick enough for clean crops.',
      'Pose read: neutral source pose preserves visible pivots, attack direction, and crop-safe appendages.',
      'Source hygiene: flat #ff00ff background, no baked environment, no cast shadow, no text.',
      'Style cohesion: one palette, one lighting model, one rendering style across the full creature.',
      'Small-sprite read: the creature remains recognizable when scaled down in the sandbox.',
      ...asArray(candidate.contractReviewChecklist),
    ],
    commands: {
      markBeforeGeneration: commandFor(candidate, 'source:imagegen-mark'),
      checkGeneratedFile: commandFor(candidate, 'source:imagegen-status'),
      autoIngestGeneratedFile: commandFor(candidate, 'source:imagegen-status', ' --ingest'),
      ingestGeneratedFile: commandFor(candidate, 'source:ingest', ' --image <image-path> --copy'),
      rejectGeneratedFile: commandFor(candidate, 'source:reject-attempt', ' --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"'),
      rejectMissingGeneratedFile: 'npm run source:imagegen-status -- --reject-missing',
      validateImage: commandFor(candidate, 'source:image-check'),
      buildGallery: 'npm run source:gallery',
      validateSources: 'npm run source:check',
    },
    files: {
      markdown: `public/review/source-candidates/art-contracts/${fileBase}.md`,
      json: `public/review/source-candidates/art-contracts/${fileBase}.json`,
    },
  };
}

function markdownFor(contract) {
  const lines = [
    `# ${contract.species}`,
    '',
    `Candidate: \`${contract.id}\``,
    `Status: \`${contract.status}\``,
    contract.rank == null ? null : `Generation rank: \`${contract.rank}\``,
    `Expected output: \`${contract.expectedOutput}\``,
    `Depth band: ${contract.depthBand ?? 'not recorded'}`,
    '',
    '## Gameplay Read',
    '',
    contract.gameplayVerb ?? 'Not recorded.',
    '',
    '## Required Read',
    '',
    markdownList(contract.requiredRead),
    '',
    '## Articulatable Parts',
    '',
    markdownList(contract.articulatableParts),
    '',
    '## Source Pose Rules',
    '',
    markdownList(contract.sourcePoseRules),
    '',
    '## Cohesion Lock',
    '',
    markdownList(contract.cohesionLock),
    '',
    contract.auditGuidance ? '## Research Audit Hardening' : null,
    contract.auditGuidance ? '' : null,
    contract.auditGuidance ? markdownList(auditMarkdownItems(contract.auditGuidance)) : null,
    contract.auditGuidance ? '' : null,
    '## Reject If',
    '',
    markdownList([...contract.promptRisks, ...contract.globalRejects]),
    '',
    '## Review Checklist',
    '',
    markdownList(contract.reviewChecklist),
    '',
    '## Generation Prompt',
    '',
    '```text',
    contract.generationPrompt,
    '```',
    '',
    '## Commands',
    '',
    '```bash',
    contract.commands.markBeforeGeneration,
    '# run image generation from the prompt above',
    contract.commands.checkGeneratedFile,
    '# if exactly one generated file appears, this validates and ingests it safely:',
    contract.commands.autoIngestGeneratedFile,
    '# otherwise ingest a specific file explicitly:',
    contract.commands.ingestGeneratedFile,
    contract.commands.validateImage,
    contract.commands.buildGallery,
    contract.commands.validateSources,
    '# if the output is visually bad:',
    contract.commands.rejectGeneratedFile,
    '# if no generated file is accessible:',
    contract.commands.rejectMissingGeneratedFile,
    '```',
    '',
  ].filter((line) => line != null);
  return `${lines.join('\n')}\n`;
}

function indexMarkdown(contracts) {
  const lines = [
    '# Water 9 Source Art Contracts',
    '',
    'These contracts are the source-art handoff sheets for generated underwater threats. They are deliberately stricter than the prompt files: if a generated image does not satisfy the contract, reject it before extraction or rigging.',
    '',
    `Contracts: \`${contracts.length}\``,
    '',
    '| Rank | Candidate | Species | Status | Contract | Expected output |',
    '| ---: | --- | --- | --- | --- | --- |',
  ];
  for (const contract of contracts) {
    lines.push(`| ${contract.rank ?? ''} | \`${contract.id}\` | ${contract.species} | \`${contract.status}\` | [md](${contract.files.markdown}) / [json](${contract.files.json}) | \`${contract.expectedOutput}\` |`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

const manifest = await readJson(manifestPath);
if (manifest?.schema !== 'water9/source-candidates@1') {
  throw new Error(`Unexpected source candidate schema ${manifest?.schema ?? 'missing'}`);
}

const queue = await readJson(queuePath).catch(() => ({ candidates: [] }));
const queueRanks = new Map((queue.candidates ?? []).map((candidate) => [candidate.id, candidate.rank]));
const auditGuidance = await readAuditGuidance(auditDir);
let candidates = manifest.candidates ?? [];
if (idFilter) candidates = candidates.filter((candidate) => idFilter.has(candidate.id));
candidates = candidates.map((candidate) => ({ ...candidate, auditGuidance: auditGuidance.get(candidate.id) ?? null }));

const failures = [];
for (const id of idFilter ?? []) {
  if (!candidates.some((candidate) => candidate.id === id)) failures.push(`unknown candidate id ${id}`);
}
for (const candidate of candidates) {
  if (!candidate.id) failures.push('candidate missing id');
  if (!candidate.species) failures.push(`${candidate.id}: missing species`);
  if (!candidate.prompt) failures.push(`${candidate.id}: missing prompt`);
  if (!String(candidate.prompt ?? '').includes('#ff00ff')) failures.push(`${candidate.id}: generation prompt must include #ff00ff`);
  if ((candidate.sourceCohesion ?? '') !== 'single-source') failures.push(`${candidate.id}: sourceCohesion must be single-source`);
  if ((candidate.backgroundKey ?? '') !== 'magenta') failures.push(`${candidate.id}: backgroundKey must be magenta`);
  if (asArray(candidate.requiredRead).length < 3) failures.push(`${candidate.id}: needs at least 3 requiredRead entries`);
  if (asArray(candidate.articulatableParts).length < 5) failures.push(`${candidate.id}: needs at least 5 articulatableParts entries`);
}
if (failures.length) {
  console.error(JSON.stringify({ manifest: manifestPath, failures }, null, 2));
  process.exit(1);
}

const contracts = candidates
  .map((candidate) => contractFor(candidate, queueRanks.get(candidate.id) ?? null))
  .sort((left, right) => {
    if (left.rank != null && right.rank != null) return left.rank - right.rank;
    if (left.rank != null) return -1;
    if (right.rank != null) return 1;
    return left.id.localeCompare(right.id);
  });

await mkdir(outDir, { recursive: true });
await mkdir(dirname(indexOut), { recursive: true });
for (const contract of contracts) {
  const fileBase = safeFileName(contract.id);
  await writeFile(resolve(outDir, `${fileBase}.json`), `${JSON.stringify(contract, null, 2)}\n`);
  await writeFile(resolve(outDir, `${fileBase}.md`), markdownFor(contract));
}
await writeFile(indexOut, indexMarkdown(contracts));

console.log(JSON.stringify({
  schema: 'water9/source-art-contracts@1',
  outDir,
  indexOut,
  manifest: manifestPath,
  queue: queuePath,
  contracts: contracts.length,
  first: contracts.slice(0, 3).map((contract) => ({ id: contract.id, species: contract.species, rank: contract.rank, file: `${basename(outDir)}/${safeFileName(contract.id)}.md` })),
  failures: [],
}, null, 2));

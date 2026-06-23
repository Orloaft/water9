import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const readinessPath = resolve(String(args.get('readiness') ?? 'public/review/content-readiness.json'));
const rejectedPath = resolve(String(args.get('rejections') ?? 'public/review/source-candidates/rejected-attempts.json'));
const queuePath = resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json'));
const markdownPath = resolve(String(args.get('markdown') ?? 'public/review/source-candidates/source-generation-queue.md'));
const htmlPath = resolve(String(args.get('html') ?? 'public/review/source-candidates/source-generation-queue.html'));
const auditDir = resolve(String(args.get('audit-dir') ?? 'public/review/source-candidates/research-subagent-audits'));

const QUALITY_CHECKS = [
  'whole-creature-cohesion',
  'part-continuity-cohesion',
  'readable-silhouette',
  'no-collage-artifacts',
  'non-placeholder-art-direction',
  'crop-safe-anatomy',
  'clean-magenta-key',
  'gameplay-read',
  'neutral-riggable-pose',
  'visible-attack-lane',
];
const SOURCE_POSE_RULES = [
  'Generate a single neutral pre-attack source pose, not a sequence, contact sheet, or multiple animation frames.',
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
const SOURCE_ART_RECIPE = [
  'Shared render recipe: orthographic 2D browser-game sprite source, crisp silhouette, controlled painterly edges, no photographic texture collage.',
  'Lighting recipe: one cool upper-left rim light and one muted lower-body shadow logic across the entire organism.',
  'Detail recipe: medium detail density only; no hairline critical anatomy, noisy lace mesh, loose sparkle fields, or unresolved texture fuzz.',
  'Glow recipe: cyan or cold blue biological glow may mark anatomy, but glow halos, pulses, beams, clouds, and attack flashes are separate VFX, not base source art.',
  '64px crop proof: every required hinge, root, mouth rim, fin, tendril, spine, claw, or crop-intended appendage must remain visible after downscale.',
];

async function readJson(label, path, failures) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
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

async function requireFile(label, path, failures, minSize = 16) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minSize) failures.push(`${label}: missing or too small`);
  } catch {
    failures.push(`${label}: does not exist`);
  }
}

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'candidate';
}

function expectedOutput(candidate) {
  return `public/assets/generated/fauna-${candidate.id}-whole-source.png`;
}

function commandFor(candidate, command, extra = '') {
  return `npm run ${command} -- --id ${candidate.id}${extra}`;
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
  for (const item of patch.motionPhases ?? []) lines.push(`- Rig-only motion note, do not render as a sequence or VFX: ${item}`);
  for (const item of guidance.referenceSearchTerms ?? []) lines.push(`- Reference search term: ${item}`);
  return lines;
}

function promptTextFor(candidate) {
  return [
    candidate.prompt ?? '',
    ...auditPromptLines(candidate.auditGuidance),
    '',
    'Source pose contract:',
    ...SOURCE_POSE_RULES.map((item) => `- ${item}`),
    '',
    'Shared source art recipe:',
    ...SOURCE_ART_RECIPE.map((item) => `- ${item}`),
    '',
    'Cohesion lock:',
    ...COHESION_LOCK.map((item) => `- ${item}`),
    '',
    'Required read:',
    ...(candidate.requiredRead ?? []).map((item) => `- ${item}`),
    '',
    'Candidate-specific contract checks:',
    ...(candidate.contractReviewChecklist ?? []).map((item) => `- ${item}`),
    '',
    'Reject if any of these are true:',
    ...(candidate.promptRisks ?? []).map((item) => `- ${item}`),
    '- The subject is a collage, detached prop assembly, duplicate creature, or placeholder design.',
    '- The background is not a clean, flat #ff00ff magenta key.',
    '- The silhouette does not communicate the gameplay verb at small sprite scale.',
    '- The source is a full attack impact frame that hides pivots, limb roots, crop-safe appendages, or neutral riggable anatomy.',
  ].join('\n').trim();
}

function expectedPacket(candidate, rank, score, rejectionCount, auditGuidance) {
  const promptFile = `public/review/source-candidates/generation-queue-prompts/${String(rank).padStart(2, '0')}-${safeFileName(candidate.id)}.txt`;
  return {
    rank,
    id: candidate.id,
    species: candidate.species,
    status: candidate.status,
    hasSource: Boolean(candidate.source),
    source: candidate.source ?? null,
    score,
    rejectionCount,
    promptFile,
    expectedOutput: expectedOutput(candidate),
    depthBand: candidate.depthBand ?? null,
    gameplayVerb: candidate.gameplayVerb ?? null,
    qualityChecks: QUALITY_CHECKS,
    sourcePoseRules: SOURCE_POSE_RULES,
    sourceArtRecipe: SOURCE_ART_RECIPE,
    cohesionLock: COHESION_LOCK,
    commands: {
      markBeforeGeneration: commandFor(candidate, 'source:imagegen-mark'),
      checkGeneratedFile: commandFor(candidate, 'source:imagegen-status'),
      autoIngestGeneratedFile: commandFor(candidate, 'source:imagegen-status', ' --ingest'),
      ingestGeneratedFile: commandFor(candidate, 'source:ingest', ' --image <image-path> --copy'),
      checkImage: commandFor(candidate, 'source:image-check'),
      buildGallery: 'npm run source:gallery',
      validateSources: 'npm run source:check',
      rejectBadOutput: commandFor(candidate, 'source:reject-attempt', ' --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"'),
      rejectNoFile: commandFor(candidate, 'source:reject-attempt', ' --attempt-kind missing-artifact --reason "No accessible image file appeared after generation."'),
    },
    prompt: candidate.prompt,
    requiredRead: candidate.requiredRead ?? [],
    articulatableParts: candidate.articulatableParts ?? [],
    promptRisks: candidate.promptRisks ?? [],
    contractReviewChecklist: candidate.contractReviewChecklist ?? [],
    auditGuidance: auditGuidance ?? null,
  };
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function packetsEqual(left, right) {
  return stableJson(left) === stableJson(right);
}

const failures = [];
const manifest = await readJson('source candidate manifest', manifestPath, failures);
const readiness = await readJson('content readiness report', readinessPath, failures);
const rejected = await readJson('source rejected attempts manifest', rejectedPath, failures);
const queue = await readJson('source generation queue', queuePath, failures);
await requireFile('source generation queue markdown', markdownPath, failures, 128);
await requireFile('source generation queue html', htmlPath, failures, 2048);
const auditGuidance = await readAuditGuidance(auditDir);
const queueHtml = await readFile(htmlPath, 'utf8').catch(() => '');

if (manifest?.schema !== 'water9/source-candidates@1') failures.push(`source candidate schema is ${manifest?.schema ?? 'missing'}`);
if (readiness?.schema !== 'water9/content-readiness@1') failures.push(`readiness schema is ${readiness?.schema ?? 'missing'}`);
if (rejected?.schema !== 'water9/source-rejected-attempts@1') failures.push(`rejected attempts schema is ${rejected?.schema ?? 'missing'}`);
if (queue?.schema !== 'water9/source-generation-queue@1') failures.push(`queue schema is ${queue?.schema ?? 'missing'}`);

const rejectionCounts = new Map();
for (const attempt of rejected?.attempts ?? []) {
  rejectionCounts.set(attempt.candidateId, (rejectionCounts.get(attempt.candidateId) ?? 0) + 1);
}

const priority = new Map((readiness?.sourceGenerationPriority ?? []).map((item, index) => [item.id, { score: item.score ?? 0, index }]));
let expectedCandidates = (manifest?.candidates ?? [])
  .filter((candidate) => !candidate.source)
  .filter((candidate) => candidate.status === 'draft' || candidate.status === 'needs-review');

expectedCandidates = expectedCandidates.sort((left, right) => {
  const leftPriority = priority.get(left.id);
  const rightPriority = priority.get(right.id);
  if (leftPriority && rightPriority) return rightPriority.score - leftPriority.score || leftPriority.index - rightPriority.index;
  if (leftPriority) return -1;
  if (rightPriority) return 1;
  return left.id.localeCompare(right.id);
});

const expectedQueue = expectedCandidates.map((candidate, index) => {
  const priorityInfo = priority.get(candidate.id);
  return expectedPacket(candidate, index + 1, priorityInfo?.score ?? 0, rejectionCounts.get(candidate.id) ?? 0, auditGuidance.get(candidate.id));
});
const actualQueue = Array.isArray(queue?.candidates) ? queue.candidates : [];
const promptDirPath = resolve(String(args.get('prompt-dir') ?? queue?.promptDir ?? 'public/review/source-candidates/generation-queue-prompts'));

if (actualQueue.length !== expectedQueue.length) {
  failures.push(`queue has ${actualQueue.length} candidates, expected ${expectedQueue.length}; rerun npm run source:generation-queue`);
}

const actualIds = actualQueue.map((item) => item.id);
const expectedIds = expectedQueue.map((item) => item.id);
if (actualIds.join(',') !== expectedIds.join(',')) {
  failures.push(`queue id order is stale; expected ${expectedIds.join(',')}, got ${actualIds.join(',')}`);
}

for (let index = 0; index < Math.max(actualQueue.length, expectedQueue.length); index += 1) {
  const actual = actualQueue[index];
  const expected = expectedQueue[index];
  if (!actual || !expected) continue;
  if (!packetsEqual(actual, expected)) failures.push(`${actual.id}: queue packet is stale; rerun npm run source:generation-queue`);
  if (actual.commands?.autoIngestGeneratedFile !== commandFor(expected, 'source:imagegen-status', ' --ingest')) {
    failures.push(`${actual.id}: queue packet is missing validated auto-ingest command`);
  }
  if (!actual.qualityChecks?.includes('part-continuity-cohesion')) {
    failures.push(`${actual.id}: queue packet is missing part-continuity-cohesion quality check`);
  }
  if (!String(actual.commands?.rejectBadOutput ?? '').includes('--attempt-kind visual-failure') || !String(actual.commands?.rejectBadOutput ?? '').includes('--image <bad-output-path>')) {
    failures.push(`${actual.id}: queue packet rejectBadOutput must be an explicit visual-failure attempt with image evidence`);
  }
  if (!String(actual.commands?.rejectNoFile ?? '').includes('--attempt-kind missing-artifact')) {
    failures.push(`${actual.id}: queue packet rejectNoFile must be an explicit missing-artifact attempt`);
  }
  if (!Array.isArray(actual.cohesionLock) || actual.cohesionLock.length < COHESION_LOCK.length) {
    failures.push(`${actual.id}: queue packet is missing cohesion lock`);
  }
  if (actual.auditGuidance && (!Array.isArray(actual.contractReviewChecklist) || actual.contractReviewChecklist.length < 2)) {
    failures.push(`${actual.id}: audited queue candidate needs at least 2 candidate-specific contract checks`);
  }
  try {
    const markdown = await readFile(markdownPath, 'utf8');
    if (!markdown.includes(commandFor(expected, 'source:imagegen-status', ' --ingest'))) {
      failures.push(`${actual.id}: queue markdown is missing validated auto-ingest command`);
    }
  } catch {
    // requireFile already recorded markdown failures.
  }
  const promptPath = resolve(actual.promptFile ?? '');
  await requireFile(`${actual.id} prompt file`, promptPath, failures, 128);
  if (!queueHtml.includes(actual.id)) failures.push(`${actual.id}: queue html is missing candidate id`);
  if (!queueHtml.includes(`tools/source-inbox/${actual.id}.png`)) failures.push(`${actual.id}: queue html is missing inbox target`);
  if (!queueHtml.includes(commandFor(expected, 'source:imagegen-status', ' --ingest'))) {
    failures.push(`${actual.id}: queue html is missing validated auto-ingest command`);
  }
  if (!queueHtml.includes(actual.commands.rejectBadOutput)) failures.push(`${actual.id}: queue html is missing reject bad output command`);
  if (!queueHtml.includes(actual.commands.rejectNoFile)) failures.push(`${actual.id}: queue html is missing reject no-file command`);
  if (!queueHtml.includes('Cohesion Lock')) failures.push(`${actual.id}: queue html is missing cohesion lock section`);
  try {
    const promptText = (await readFile(promptPath, 'utf8')).trim();
    const expectedPrompt = promptTextFor(expected).trim();
    if (promptText !== expectedPrompt) failures.push(`${actual.id}: prompt file does not match queue packet`);
  } catch {
    // requireFile already recorded the missing prompt.
  }
}

try {
  const expectedPromptFiles = new Set(expectedQueue.map((item) => basename(item.promptFile)));
  const promptFiles = await readdir(promptDirPath, { withFileTypes: true });
  for (const file of promptFiles) {
    if (!file.isFile() || !file.name.endsWith('.txt')) continue;
    if (!expectedPromptFiles.has(file.name)) failures.push(`stale prompt file ${file.name}; rerun npm run source:generation-queue`);
  }
} catch (error) {
  failures.push(`prompt directory ${promptDirPath} could not be read: ${error.message}`);
}

const markdown = await readFile(markdownPath, 'utf8').catch(() => '');
for (const item of expectedQueue.slice(0, 5)) {
  if (!markdown.includes(item.id)) failures.push(`markdown queue is missing ${item.id}`);
  if (!markdown.includes(item.promptFile)) failures.push(`markdown queue is missing prompt path for ${item.id}`);
}
for (const needle of [
  'Water 9 Source Acquisition Board',
  '#ff00ff',
  'npm run source:inbox-capture',
  'npm run source:ingest-batch -- --dir tools/source-inbox --strict',
  'npm run source:check',
]) {
  if (!queueHtml.includes(needle)) failures.push(`queue html is missing required content: ${needle}`);
}

const summary = {
  queue: queuePath,
  candidates: actualQueue.length,
  expectedCandidates: expectedQueue.length,
  top: actualQueue.slice(0, 3).map((item) => item.id),
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

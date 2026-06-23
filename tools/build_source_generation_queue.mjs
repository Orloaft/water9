import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
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
const readinessPath = resolve(String(args.get('readiness') ?? 'public/review/content-readiness.json'));
const rejectedPath = resolve(String(args.get('rejections') ?? 'public/review/source-candidates/rejected-attempts.json'));
const outPath = resolve(String(args.get('out') ?? 'public/review/source-candidates/source-generation-queue.md'));
const jsonOutPath = resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-generation-queue.json'));
const htmlOutPath = resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-generation-queue.html'));
const promptDir = resolve(String(args.get('prompt-dir') ?? 'public/review/source-candidates/generation-queue-prompts'));
const auditDir = resolve(String(args.get('audit-dir') ?? 'public/review/source-candidates/research-subagent-audits'));
const limit = Number(args.get('limit') ?? 0);
const includeExistingSource = args.has('include-existing-source');

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

async function readJson(path, fallback) {
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
    const audit = await readJson(resolve(dir, file.name), null);
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

function expectedOutput(candidate) {
  return `public/assets/generated/fauna-${candidate.id}-whole-source.png`;
}

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'candidate';
}

function commandFor(candidate, command, extra = '') {
  return `npm run ${command} -- --id ${candidate.id}${extra}`;
}

function markdownList(items) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- None recorded.';
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function htmlList(items) {
  return items?.length
    ? `<ul>${items.map((item) => `<li>${htmlEscape(item)}</li>`).join('')}</ul>`
    : '<ul><li>None recorded.</li></ul>';
}

function commandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
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

function auditMarkdownItems(guidance) {
  return auditPromptLines(guidance)
    .filter((line) => line && line !== 'Research audit hardening:')
    .map((line) => line.replace(/^- /, ''));
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

function packetFor(candidate, rank, score, rejectionCount, auditGuidance) {
  const promptFile = `${String(rank).padStart(2, '0')}-${safeFileName(candidate.id)}.txt`;
  const output = expectedOutput(candidate);
  return {
    rank,
    id: candidate.id,
    species: candidate.species,
    status: candidate.status,
    hasSource: Boolean(candidate.source),
    source: candidate.source ?? null,
    score,
    rejectionCount,
    promptFile: `public/review/source-candidates/generation-queue-prompts/${promptFile}`,
    expectedOutput: output,
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

function markdownFor(queue) {
  const lines = [
    '# Water 9 Source Generation Queue',
    '',
    `Candidates queued: \`${queue.length}\``,
    `Prompt directory: \`${promptDir}\``,
    '',
    'Use this queue for Imagen/source-art work. Generate one whole-source creature image at a time on a flat `#ff00ff` magenta background. Ingest only outputs that pass the required read and quality checks; otherwise log a rejected attempt.',
    '',
    '## Standard Loop',
    '',
    '```bash',
    'npm run source:generation-queue',
    'npm run source:imagegen-mark -- --id <candidate-id>',
    '# run image generation from the prompt file',
    'npm run source:imagegen-status -- --id <candidate-id>',
    '# if exactly one generated file appears, this validates and ingests it safely:',
    'npm run source:imagegen-status -- --id <candidate-id> --ingest',
    '# otherwise ingest a specific file explicitly:',
    'npm run source:ingest -- --id <candidate-id> --image <image-path> --copy',
    'npm run source:image-check -- --id <candidate-id>',
    'npm run source:gallery',
    'npm run source:check',
    '```',
    '',
  ];

  for (const item of queue) {
    lines.push(`## ${item.rank}. ${item.species} (${item.id})`);
    lines.push('');
    lines.push(`- Score: \`${item.score}\``);
    lines.push(`- Status: \`${item.status}\``);
    lines.push(`- Rejected attempts: \`${item.rejectionCount}\``);
    lines.push(`- Prompt file: \`${item.promptFile}\``);
    lines.push(`- Expected output: \`${item.expectedOutput}\``);
    lines.push(`- Gameplay verb: ${item.gameplayVerb ?? 'not recorded'}`);
    lines.push('');
    lines.push('Commands:');
    lines.push('```bash');
    lines.push(item.commands.markBeforeGeneration);
    lines.push('# run image generation from the prompt file');
    lines.push(item.commands.checkGeneratedFile);
    lines.push('# if exactly one generated file appears, this validates and ingests it safely:');
    lines.push(item.commands.autoIngestGeneratedFile);
    lines.push('# otherwise ingest a specific file explicitly:');
    lines.push(item.commands.ingestGeneratedFile);
    lines.push(item.commands.checkImage);
    lines.push(item.commands.buildGallery);
    lines.push(item.commands.validateSources);
    lines.push('# if the output fails visual review:');
    lines.push(item.commands.rejectBadOutput);
    lines.push('# if no accessible output file appears:');
    lines.push(item.commands.rejectNoFile);
    lines.push('```');
    lines.push('');
    lines.push('Quality checks:');
    lines.push(markdownList(item.qualityChecks));
    lines.push('');
    lines.push('Source pose rules:');
    lines.push(markdownList(item.sourcePoseRules));
    lines.push('');
    lines.push('Cohesion lock:');
    lines.push(markdownList(item.cohesionLock));
    lines.push('');
    if (item.auditGuidance) {
      lines.push('Research audit hardening:');
      lines.push(markdownList(auditMarkdownItems(item.auditGuidance)));
      lines.push('');
    }
    lines.push('Required read:');
    lines.push(markdownList(item.requiredRead));
    lines.push('');
    if (item.contractReviewChecklist.length) {
      lines.push('Candidate-specific contract checks:');
      lines.push(markdownList(item.contractReviewChecklist));
      lines.push('');
    }
    lines.push('Articulatable parts:');
    lines.push(markdownList(item.articulatableParts));
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function renderHtml(queue) {
  const cards = queue.map((item) => {
    const promptFileName = `${String(item.rank).padStart(2, '0')}-${safeFileName(item.id)}.txt`;
    return `<article class="card" id="${htmlEscape(item.id)}">
      <header>
        <span>${htmlEscape(item.rank)}</span>
        <div>
          <h2>${htmlEscape(item.species)}</h2>
          <code>${htmlEscape(item.id)}</code>
        </div>
      </header>
      <dl>
        <div><dt>score</dt><dd>${htmlEscape(item.score)}</dd></div>
        <div><dt>previous rejections</dt><dd>${htmlEscape(item.rejectionCount)}</dd></div>
        <div><dt>inbox target</dt><dd><code>tools/source-inbox/${htmlEscape(item.id)}.png</code></dd></div>
        <div><dt>expected output</dt><dd><code>${htmlEscape(item.expectedOutput)}</code></dd></div>
        <div><dt>prompt file</dt><dd><a href="${htmlEscape(`generation-queue-prompts/${promptFileName}`)}">${htmlEscape(promptFileName)}</a></dd></div>
        <div><dt>contract</dt><dd><a href="${htmlEscape(`art-contracts/${item.id}.md`)}">open art contract</a></dd></div>
      </dl>
      <h3>Prompt</h3>
      <pre><code>${htmlEscape(promptTextFor(item))}</code></pre>
      <h3>Source Pose Rules</h3>
      ${htmlList(item.sourcePoseRules)}
      <h3>Cohesion Lock</h3>
      ${htmlList(item.cohesionLock)}
      <h3>Quality Checks</h3>
      ${htmlList(item.qualityChecks)}
      <h3>Prompt Risks</h3>
      ${htmlList(item.promptRisks)}
      <h3>Commands</h3>
      ${commandBlock([
        item.commands.markBeforeGeneration,
        '# run image generation from the prompt above',
        item.commands.checkGeneratedFile,
        item.commands.autoIngestGeneratedFile,
        'npm run source:inbox-capture',
        `npm run source:recover-inline -- --id ${item.id} --copy --validate`,
        `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${item.id}`,
        `npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids ${item.id} --dry-run`,
        `npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids ${item.id}`,
        item.commands.checkImage,
        item.commands.buildGallery,
        item.commands.validateSources,
        '# if the output fails visual review:',
        item.commands.rejectBadOutput,
        '# if no accessible output file appears:',
        item.commands.rejectNoFile,
      ])}
    </article>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Acquisition Board</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0d1b20; --line:#29444b; --text:#e6f5f5; --muted:#91a9ae; --accent:#7adff6; --warn:#f0bd6b; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1360px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2, h3 { margin:0 0 8px; }
    h2 { font-size:18px; }
    h3 { margin-top:14px; font-size:13px; color:var(--warn); text-transform:uppercase; letter-spacing:.04em; }
    p { margin:0 0 12px; color:var(--muted); }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { margin:8px 0 0; padding:10px; border:1px solid var(--line); background:#050b0d; overflow:auto; white-space:pre-wrap; }
    .summary { display:flex; flex-wrap:wrap; gap:9px; margin:18px 0 24px; }
    .summary span { border:1px solid var(--line); background:#09171b; border-radius:5px; padding:7px 9px; color:var(--muted); }
    .summary strong { color:var(--text); margin-left:4px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(390px,1fr)); gap:14px; }
    .card { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:15px; }
    .card header { display:flex; gap:10px; align-items:flex-start; margin-bottom:12px; }
    .card header span { flex:0 0 auto; width:30px; height:30px; display:grid; place-items:center; border:1px solid var(--line); color:var(--warn); }
    dl { display:grid; gap:7px; margin:14px 0; }
    dt { color:var(--muted); font-size:11px; text-transform:uppercase; }
    dd { margin:0; overflow-wrap:anywhere; }
    ul { margin:0; padding-left:18px; color:#bdd5d9; }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Source Acquisition Board</h1>
    <p>Generate every missing whole-source creature image on a flat <code>#ff00ff</code> magenta background. Use this board when the five-item sprint is too narrow.</p>
    <div class="summary">
      <span>queued candidates <strong>${queue.length}</strong></span>
      <span>prompt dir <strong>${htmlEscape(promptDir)}</strong></span>
      <span>inbox <strong>tools/source-inbox</strong></span>
    </div>
    ${commandBlock([
      'npm run source:generation-queue',
      'npm run source:inbox-capture',
      'npm run source:inbox-review',
      'npm run source:inbox-check -- --dir tools/source-inbox --strict',
      'npm run source:ingest-batch -- --dir tools/source-inbox --strict --dry-run',
      'npm run source:ingest-batch -- --dir tools/source-inbox --strict',
      'npm run source:check',
    ])}
    <section class="grid">${cards}</section>
  </main>
</body>
</html>
`;
}

const manifest = await readJson(manifestPath, null);
if (manifest?.schema !== 'water9/source-candidates@1') {
  throw new Error(`Unexpected source candidate schema ${manifest?.schema ?? 'missing'}`);
}

const readiness = await readJson(readinessPath, { sourceGenerationPriority: [] });
const rejected = await readJson(rejectedPath, { attempts: [] });
const auditGuidance = await readAuditGuidance(auditDir);
const rejectionCounts = new Map();
for (const attempt of rejected.attempts ?? []) {
  rejectionCounts.set(attempt.candidateId, (rejectionCounts.get(attempt.candidateId) ?? 0) + 1);
}

const candidatesById = new Map((manifest.candidates ?? []).map((candidate) => [candidate.id, candidate]));
const priority = new Map((readiness.sourceGenerationPriority ?? []).map((item, index) => [item.id, { score: item.score ?? 0, index }]));
let candidates = (manifest.candidates ?? [])
  .filter((candidate) => includeExistingSource || !candidate.source)
  .filter((candidate) => candidate.status === 'draft' || candidate.status === 'needs-review');

candidates = candidates.sort((left, right) => {
  const leftPriority = priority.get(left.id);
  const rightPriority = priority.get(right.id);
  if (leftPriority && rightPriority) return rightPriority.score - leftPriority.score || leftPriority.index - rightPriority.index;
  if (leftPriority) return -1;
  if (rightPriority) return 1;
  return left.id.localeCompare(right.id);
});
if (limit > 0) candidates = candidates.slice(0, limit);

const failures = [];
for (const candidate of candidates) {
  if (!candidate.id) failures.push('candidate missing id');
  if (!candidate.species) failures.push(`${candidate.id}: missing species`);
  if (!candidate.prompt) failures.push(`${candidate.id}: missing prompt`);
  if (!String(candidate.prompt ?? '').includes('#ff00ff')) failures.push(`${candidate.id}: prompt must include #ff00ff`);
  if (!Array.isArray(candidate.requiredRead) || candidate.requiredRead.length < 3) failures.push(`${candidate.id}: needs at least 3 requiredRead entries`);
  if (!candidatesById.has(candidate.id)) failures.push(`${candidate.id}: missing from candidatesById`);
}
if (failures.length) {
  console.error(JSON.stringify({ manifest: manifestPath, failures }, null, 2));
  process.exit(1);
}

const queue = candidates.map((candidate, index) => {
  const priorityInfo = priority.get(candidate.id);
  return packetFor(candidate, index + 1, priorityInfo?.score ?? 0, rejectionCounts.get(candidate.id) ?? 0, auditGuidance.get(candidate.id));
});

await mkdir(dirname(outPath), { recursive: true });
await mkdir(dirname(jsonOutPath), { recursive: true });
await mkdir(dirname(htmlOutPath), { recursive: true });
await mkdir(promptDir, { recursive: true });
const expectedPromptFiles = new Set(queue.map((item) => `${String(item.rank).padStart(2, '0')}-${safeFileName(item.id)}.txt`));
const existingPromptFiles = await readdir(promptDir, { withFileTypes: true });
for (const file of existingPromptFiles) {
  if (!file.isFile() || !file.name.endsWith('.txt') || expectedPromptFiles.has(file.name)) continue;
  await unlink(resolve(promptDir, file.name));
}
for (const item of queue) {
  await writeFile(resolve(promptDir, `${String(item.rank).padStart(2, '0')}-${safeFileName(item.id)}.txt`), `${promptTextFor(item)}\n`);
}
await writeFile(outPath, markdownFor(queue));
await writeFile(htmlOutPath, renderHtml(queue));
await writeFile(jsonOutPath, `${JSON.stringify({
  schema: 'water9/source-generation-queue@1',
  generatedAt: new Date().toISOString(),
  manifest: manifestPath,
  readiness: readinessPath,
  auditDir,
  promptDir,
  html: htmlOutPath,
  includeExistingSource,
  candidates: queue,
}, null, 2)}\n`);

console.log(JSON.stringify({
  outPath,
  jsonOutPath,
  htmlOutPath,
  promptDir,
  candidates: queue.length,
  top: queue.slice(0, 3).map((item) => ({ id: item.id, species: item.species, score: item.score, promptFile: item.promptFile })),
  failures: [],
}, null, 2));

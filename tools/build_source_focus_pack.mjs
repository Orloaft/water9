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

const id = String(args.get('id') ?? '').trim();
const buildAll = args.has('all');
const queuePath = resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json'));
const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const rejectionsPath = resolve(String(args.get('rejections') ?? 'public/review/source-candidates/rejected-attempts.json'));
const outDir = resolve(String(args.get('out-dir') ?? 'public/review/source-candidates/focus-packs'));

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function markdownList(items) {
  return items?.length ? items.map((item) => `- ${item}`).join('\n') : '- None recorded.';
}

function commandBlock(command) {
  return ['```bash', command, '```'].join('\n');
}

function sourceApprovalDryRun(candidate) {
  const checks = [
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
  return [
    `npm run source:accept -- --id ${candidate.id} --status approved --reviewed-by <human-reviewer> \\`,
    `  --note '<specific source approval note>' \\`,
    `  ${checks.map((check) => `--visual-check ${check}`).join(' ')} \\`,
    `  ${checks.map((check) => `--score ${check}=<4-5>`).join(' ')} \\`,
    `  ${checks.map((check) => `--visual-note ${check}='<specific rationale>'`).join(' ')} \\`,
    '  --source-reviewed --dry-run',
  ].join('\n');
}

function markdownFor(pack) {
  const lines = [
    `# Source Focus Pack: ${pack.species} (${pack.id})`,
    '',
    `Generated: \`${pack.generatedAt}\``,
    `Queue rank: \`${pack.rank ?? 'unranked'}\``,
    `Status: \`${pack.status}\``,
    `Expected output: \`${pack.expectedOutput}\``,
    `Inbox target: \`${pack.inboxTarget}\``,
    `Contract: \`${pack.contract}\``,
    '',
    '## Why This Is Next',
    '',
    `- Score: \`${pack.score}\``,
    `- Existing rejected attempts: \`${pack.rejections.length}\``,
    `- Depth band: ${pack.depthBand ?? 'not recorded'}`,
    `- Gameplay verb: ${pack.gameplayVerb ?? 'not recorded'}`,
    '',
    '## Generate',
    '',
    commandBlock(pack.commands.session),
    '',
    'Use the prompt below exactly. If generation only appears inline, save or paste it through the capture/recovery flow before ingest.',
    '',
    '```text',
    pack.prompt,
    '```',
    '',
    '## Required Read',
    '',
    markdownList(pack.requiredRead),
    '',
    '## Source Pose Rules',
    '',
    markdownList(pack.sourcePoseRules),
    '',
    '## Quality Checks',
    '',
    markdownList(pack.qualityChecks),
    '',
    '## Research Audit Hardening',
    '',
    markdownList(pack.auditHardening),
    '',
    '## Reject If',
    '',
    markdownList(pack.rejectIf),
    '',
    '## After Generation',
    '',
    commandBlock([
      pack.commands.status,
      pack.commands.autoIngest,
      '# Preferred for pasted, dropped, downloaded, or manually saved output:',
      pack.commands.inboxCapture,
      `# If the output appears inline only, recover it into ${pack.inboxTarget}:`,
      pack.commands.recoverInline,
      pack.commands.recoverInlineExplicitImage,
      pack.commands.inboxCheck,
      pack.commands.inboxIngestDryRun,
      pack.commands.inboxIngest,
      pack.commands.sourceCheck,
      pack.commands.sourceGallery,
    ].join('\n')),
    '',
    '## Human Source Approval Dry Run',
    '',
    commandBlock(pack.commands.sourceApprovalDryRun),
    '',
    '## Previous Rejections',
    '',
    markdownList(pack.rejections.map((attempt) => `${attempt.rejectedAt ?? attempt.createdAt ?? 'unknown time'}: ${attempt.reason ?? 'no reason recorded'}`)),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function indexMarkdownFor(packs) {
  const lines = [
    '# Source Focus Pack Index',
    '',
    `Generated: \`${new Date().toISOString()}\``,
    `Packs: \`${packs.length}\``,
    '',
    '| Rank | Candidate | Score | Rejections | Packet |',
    '| ---: | --- | ---: | ---: | --- |',
  ];
  for (const pack of packs) {
    lines.push(`| ${pack.rank ?? ''} | ${pack.species} (\`${pack.id}\`) | ${pack.score} | ${pack.rejections.length} | [md](${pack.id}.md) |`);
  }
  if (!packs.length) {
    lines.push('|  | No queued source candidates remain. |  |  |  |');
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function packFor(candidate, manifest, rejected) {
  const manifestCandidate = (manifest.candidates ?? []).find((entry) => entry.id === candidate.id);
  if (!manifestCandidate) throw new Error(`${candidate.id} is missing from source candidate manifest`);
  const prompt = candidate.promptFile
    ? (await readFile(resolve(candidate.promptFile), 'utf8')).trim()
    : candidate.prompt;
  const patch = candidate.auditGuidance?.suggestedResearchPatch ?? {};
  const auditHardening = candidate.auditGuidance
    ? [
        `Lane: ${candidate.auditGuidance.lane}`,
        ...(patch.biologicalAnchors ?? []).map((item) => `Biological anchor: ${item}`),
        ...(patch.requiredRead ?? []).map((item) => `Extra required read: ${item}`),
        ...(candidate.auditGuidance.sourceGenerationRisks ?? []).map((item) => `Avoid: ${item}`),
        ...(patch.promptRisks ?? []).map((item) => `Avoid: ${item}`),
        ...(patch.motionPhases ?? []).map((item) => `Motion phase: ${item}`),
        ...(candidate.auditGuidance.referenceSearchTerms ?? []).map((item) => `Reference search term: ${item}`),
      ]
    : [];
  const attemptRejections = (rejected.attempts ?? []).filter((attempt) => attempt.candidateId === candidate.id);
  const inboxTarget = `tools/source-inbox/${candidate.id}.png`;
  return {
    schema: 'water9/source-focus-pack@1',
    generatedAt: new Date().toISOString(),
    id: candidate.id,
    species: candidate.species,
    rank: candidate.rank ?? null,
    score: candidate.score ?? 0,
    status: candidate.status,
    depthBand: candidate.depthBand ?? null,
    gameplayVerb: candidate.gameplayVerb ?? null,
    promptFile: candidate.promptFile ?? null,
    expectedOutput: candidate.expectedOutput,
    inboxTarget,
    contract: `public/review/source-candidates/art-contracts/${candidate.id}.md`,
    prompt,
    requiredRead: candidate.requiredRead ?? [],
    sourcePoseRules: candidate.sourcePoseRules ?? [],
    qualityChecks: candidate.qualityChecks ?? [],
    articulatableParts: candidate.articulatableParts ?? [],
    auditHardening,
    rejectIf: [
      ...(candidate.promptRisks ?? []),
      'The subject reads as a collage, detached prop assembly, duplicate creature, or placeholder design.',
      'The source bakes in VFX, prey, UI, shadows, bubbles, or environment that should be separate.',
      'The background is not a clean, flat #ff00ff magenta key.',
      'The image hides pivots, limb roots, crop-safe appendages, or neutral riggable anatomy.',
    ],
    rejections: attemptRejections,
    commands: {
      session: `npm run source:session -- --id ${candidate.id}`,
      status: `npm run source:imagegen-status -- --id ${candidate.id}`,
      autoIngest: `npm run source:imagegen-status -- --id ${candidate.id} --ingest`,
      rejectMissing: `npm run source:imagegen-status -- --id ${candidate.id} --reject-missing --reason "No recoverable generated file appeared."`,
      inboxCapture: 'npm run source:inbox-capture',
      recoverInline: `npm run source:recover-inline -- --id ${candidate.id} --copy --validate`,
      recoverInlineExplicitImage: `npm run source:recover-inline -- --id ${candidate.id} --image <saved-image-path> --copy --validate`,
      inboxCheck: 'npm run source:inbox-check -- --dir tools/source-inbox --strict',
      inboxIngestDryRun: 'npm run source:ingest-batch -- --dir tools/source-inbox --strict --dry-run',
      inboxIngest: 'npm run source:ingest-batch -- --dir tools/source-inbox --strict',
      sourceCheck: 'npm run source:check',
      sourceGallery: 'npm run source:gallery',
      sourceApprovalDryRun: sourceApprovalDryRun(candidate),
    },
  };
}

async function writePack(pack) {
  const outJson = resolve(String(args.get('json-out') ?? `${outDir}/${pack.id}.json`));
  const outMarkdown = resolve(String(args.get('out') ?? `${outDir}/${pack.id}.md`));
  await mkdir(dirname(outJson), { recursive: true });
  await mkdir(dirname(outMarkdown), { recursive: true });
  await writeFile(outJson, `${JSON.stringify(pack, null, 2)}\n`);
  await writeFile(outMarkdown, markdownFor(pack));
  return { jsonOut: outJson, markdownOut: outMarkdown };
}

const queue = await readJson(queuePath, { candidates: [] });
if (queue?.schema !== 'water9/source-generation-queue@1') {
  throw new Error(`Unexpected queue schema ${queue?.schema ?? 'missing'}`);
}
const manifest = await readJson(manifestPath, { candidates: [] });
if (manifest?.schema !== 'water9/source-candidates@1') {
  throw new Error(`Unexpected source manifest schema ${manifest?.schema ?? 'missing'}`);
}
const rejected = await readJson(rejectionsPath, { attempts: [] });
const queued = Array.isArray(queue.candidates) ? queue.candidates : [];
const candidatesToBuild = buildAll ? queued : [id ? queued.find((entry) => entry.id === id) : queued[0]].filter(Boolean);
if (!candidatesToBuild.length) {
  if (buildAll) {
    await mkdir(outDir, { recursive: true });
    const indexJson = resolve(outDir, 'index.json');
    const indexMarkdown = resolve(outDir, 'index.md');
    const index = {
      schema: 'water9/source-focus-pack-index@1',
      generatedAt: new Date().toISOString(),
      queue: queuePath,
      packs: [],
    };
    await writeFile(indexJson, `${JSON.stringify(index, null, 2)}\n`);
    await writeFile(indexMarkdown, indexMarkdownFor([]));
    console.log(JSON.stringify({
      built: 0,
      ids: [],
      first: null,
      indexOut: indexMarkdown,
    }, null, 2));
    process.exit(0);
  }
  console.error(JSON.stringify({
    found: false,
    id: id || null,
    queue: queuePath,
    reason: id ? 'candidate is not queued for source generation' : 'source generation queue is empty',
  }, null, 2));
  process.exit(1);
}
const packs = [];
const outputs = [];
for (const candidate of candidatesToBuild) {
  const pack = await packFor(candidate, manifest, rejected);
  packs.push(pack);
  outputs.push(await writePack(pack));
}

if (buildAll) {
  const indexJson = resolve(outDir, 'index.json');
  const indexMarkdown = resolve(outDir, 'index.md');
  const index = {
    schema: 'water9/source-focus-pack-index@1',
    generatedAt: new Date().toISOString(),
    queue: queuePath,
    packs: packs.map((pack) => ({
      id: pack.id,
      species: pack.species,
      rank: pack.rank,
      score: pack.score,
      rejections: pack.rejections.length,
      markdown: `${outDir.replace(`${process.cwd()}/`, '')}/${pack.id}.md`,
      json: `${outDir.replace(`${process.cwd()}/`, '')}/${pack.id}.json`,
    })),
  };
  await writeFile(indexJson, `${JSON.stringify(index, null, 2)}\n`);
  await writeFile(indexMarkdown, indexMarkdownFor(packs));
}

console.log(JSON.stringify({
  built: packs.length,
  ids: packs.map((pack) => pack.id),
  first: packs[0]?.id ?? null,
  jsonOut: outputs[0]?.jsonOut ?? null,
  markdownOut: outputs[0]?.markdownOut ?? null,
  indexOut: buildAll ? resolve(outDir, 'index.md') : null,
}, null, 2));

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { MIN_VISUAL_NOTE_LENGTH, distinctReviewNotes, meaningfulReviewText, reviewNoteHasEvidenceTerms } from './review_text_quality.mjs';
import { rigAcceptedStrict, sourceApprovedStrict } from './content_quality_predicates.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const id = String(args.get('id') ?? '').trim();
const outDir = resolve(String(args.get('out-dir') ?? 'public/review/rigging-packs'));
const sourceManifestPath = resolve(String(args.get('source-manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const runtimePath = resolve(String(args.get('runtime') ?? 'public/assets/generated/articulated-creatures.parts.json'));

const SOURCE_CHECKS = [
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
const MIN_SOURCE_VISUAL_SCORE = 4;
const THREAT_CHECKS = [
  'single-source-cohesion',
  'readable-silhouette',
  'anatomy-cohesion',
  'production-visual-cohesion',
  'socket-seams',
  'motion-stability',
  'sandbox-behavior',
];
const MIN_VISUAL_SCORE = 4;
const SOURCE_VISUAL_NOTE_TERMS = {
  'whole-creature-cohesion': ['whole', 'source', 'organism', 'creature', 'cohesion', 'single'],
  'part-continuity-cohesion': ['part', 'continuity', 'joint', 'anatomy', 'proportion', 'lighting'],
  'readable-silhouette': ['silhouette', 'outline', 'readable', 'scale', 'shape'],
  'no-collage-artifacts': ['collage', 'artifact', 'lighting', 'material', 'palette', 'stitched'],
  'non-placeholder-art-direction': ['production', 'placeholder', 'art direction', 'design', 'finished'],
  'crop-safe-anatomy': ['crop', 'margin', 'joint', 'appendage', 'pivot', 'anatomy'],
  'clean-magenta-key': ['magenta', 'key', 'background', 'border', 'pink'],
  'gameplay-read': ['gameplay', 'danger', 'verb', 'attack', 'hazard', 'read'],
  'neutral-riggable-pose': ['neutral', 'pose', 'riggable', 'pivot', 'attack frame'],
  'visible-attack-lane': ['attack', 'lane', 'direction', 'mouth', 'spine', 'strike'],
};
const RIG_VISUAL_NOTE_TERMS = {
  'single-source-cohesion': ['source', 'cohesion', 'parity', 'whole', 'same creature'],
  'readable-silhouette': ['silhouette', 'outline', 'scale', 'readable', 'shape'],
  'anatomy-cohesion': ['anatomy', 'orientation', 'part', 'jaw', 'body', 'tail', 'limb'],
  'production-visual-cohesion': ['production', 'placeholder', 'palette', 'lighting', 'material', 'cohesion'],
  'socket-seams': ['socket', 'seam', 'joint', 'overlay', 'connection'],
  'motion-stability': ['phase', 'motion', 'jitter', 'popping', 'frame', 'animation'],
  'sandbox-behavior': ['sandbox', 'idle', 'lunge', 'stunned', 'diver', 'behavior', 'motion'],
};

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function sourceApproved(candidate) {
  return sourceApprovedStrict(candidate);
}

function threatAccepted(creature) {
  return rigAcceptedStrict(creature);
}

function sourceApprovalCommand(candidate) {
  return [
    `npm run source:accept -- --id ${candidate.id} --status approved --reviewed-by <human-reviewer> \\`,
    `  --note '<specific source approval note>' \\`,
    `  ${SOURCE_CHECKS.map((check) => `--visual-check ${check}`).join(' ')} \\`,
    `  ${SOURCE_CHECKS.map((check) => `--score ${check}=<4-5>`).join(' ')} \\`,
    `  ${SOURCE_CHECKS.map((check) => `--visual-note ${check}='<specific rationale>'`).join(' ')} \\`,
    '  --source-reviewed --dry-run',
  ].join('\n');
}

function threatAcceptanceCommand(creatureId, candidate) {
  return [
    `npm run content:accept -- --id ${creatureId} --status accepted --reviewed-by <human-reviewer> \\`,
    `  --source-candidate ${candidate.id} \\`,
    `  --note '<specific rig approval note>' \\`,
    `  ${THREAT_CHECKS.map((check) => `--visual-check ${check}`).join(' ')} \\`,
    `  ${THREAT_CHECKS.map((check) => `--score ${check}=<4-5>`).join(' ')} \\`,
    `  ${THREAT_CHECKS.map((check) => `--visual-note ${check}='<specific rationale>'`).join(' ')} \\`,
    '  --source-reviewed --contact-reviewed --phase-reviewed --parity-reviewed --sandbox-reviewed --dry-run',
  ].join('\n');
}

function markdownList(items) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- None.';
}

function commandBlock(value) {
  return ['```bash', value, '```'].join('\n');
}

function stageFor(candidate, runtimeCreature) {
  if (!candidate.source) return 'source-image-needed';
  if (!sourceApproved(candidate)) return 'human-source-review-needed';
  if (!runtimeCreature) return 'articulation-plan-needed';
  if (!threatAccepted(runtimeCreature)) return 'human-rig-review-needed';
  return 'accepted';
}

function markdownFor(pack) {
  const lines = [
    `# Rigging Focus Pack: ${pack.species} (${pack.id})`,
    '',
    `Generated: \`${pack.generatedAt}\``,
    `Stage: \`${pack.stage}\``,
    `Source: \`${pack.source ?? 'missing'}\``,
    `Runtime creature: \`${pack.runtimeCreatureId ?? 'not registered'}\``,
    '',
    '## Blockers',
    '',
    markdownList(pack.blockers),
    '',
    '## Source Review',
    '',
    commandBlock(pack.commands.sourceGallery),
    '',
    commandBlock(pack.commands.sourcePreview),
    '',
    commandBlock(pack.commands.sourceApprovalDryRun),
    '',
    '## Articulation Plan',
    '',
    commandBlock([
      pack.commands.preparePlan,
      pack.commands.planPreview,
      pack.commands.planCheck,
      pack.commands.extractDryRun,
      pack.commands.extract,
    ].join('\n')),
    '',
    '## Review And Acceptance',
    '',
    commandBlock([
      pack.commands.articulatedCheck,
      pack.commands.reviewGallery,
      pack.commands.runtimePreview,
      pack.commands.sandboxVisual,
      pack.commands.quickReview,
      pack.commands.acceptanceAudit,
      pack.commands.threatAcceptanceDryRun,
    ].join('\n')),
    '',
    '## Required Human Checks',
    '',
    'Source:',
    markdownList(SOURCE_CHECKS),
    '',
    'Threat:',
    markdownList(THREAT_CHECKS),
    '',
    `Threat visual scores: every threat check must be scored \`${MIN_VISUAL_SCORE}\` or \`5\`; a score of \`3\` remains prototype-only.`,
    '',
  ];
  return `${lines.join('\n')}\n`;
}

const sourceManifest = await readJson(sourceManifestPath, { candidates: [] });
if (sourceManifest.schema !== 'water9/source-candidates@1') {
  throw new Error(`Unexpected source manifest schema ${sourceManifest.schema ?? 'missing'}`);
}
const runtime = await readJson(runtimePath, { creatures: [] });
const candidates = (sourceManifest.candidates ?? []).filter((candidate) => id ? candidate.id === id : Boolean(candidate.source));
if (!candidates.length) {
  console.error(JSON.stringify({
    found: false,
    id: id || null,
    reason: id ? 'source candidate not found or has no source context' : 'no source candidates with images found',
  }, null, 2));
  process.exit(1);
}

const packs = [];
for (const candidate of candidates) {
  const runtimeCreature = (runtime.creatures ?? []).find((creature) => creature.quality?.sourceCandidateId === candidate.id || candidate.riggedCreatureId === creature.id);
  const runtimeCreatureId = runtimeCreature?.id ?? candidate.riggedCreatureId ?? candidate.id;
  const planPath = `tools/scratch/${candidate.id}-starter-plan.json`;
  const planPreviewPath = `public/review/articulated/${candidate.id}-plan-preview.png`;
  const blockers = [];
  if (!candidate.source) blockers.push('source image is missing');
  if (candidate.source && !sourceApproved(candidate)) blockers.push('source candidate needs human approval');
  if (sourceApproved(candidate) && !runtimeCreature) blockers.push('no runtime articulated creature is registered yet');
  if (runtimeCreature && !threatAccepted(runtimeCreature)) blockers.push('runtime creature needs human rig acceptance');
  const pack = {
    schema: 'water9/rigging-focus-pack@1',
    generatedAt: new Date().toISOString(),
    id: candidate.id,
    species: candidate.species,
    source: candidate.source ?? null,
    sourceApproved: sourceApproved(candidate),
    runtimeCreatureId,
    runtimeRegistered: Boolean(runtimeCreature),
    threatAccepted: threatAccepted(runtimeCreature),
    stage: stageFor(candidate, runtimeCreature),
    blockers,
    commands: {
      sourceGallery: 'npm run source:gallery',
      sourcePreview: `npm run sandbox:preview -- --id ${candidate.id} --kind source --best --serve --open --visual`,
      sourceApprovalDryRun: sourceApprovalCommand(candidate),
      preparePlan: `npm run articulated:prepare-plan -- --id ${candidate.id} --plan ${planPath} --preview ${planPreviewPath}`,
      planPreview: `npm run articulated:plan-preview -- --plan ${planPath} --out ${planPreviewPath}`,
      planCheck: `npm run articulated:plan-check -- --plan ${planPath}`,
      extractDryRun: `npm run articulated:extract-plan -- --plan ${planPath} --dry-run`,
      extract: `npm run articulated:extract-plan -- --plan ${planPath}`,
      articulatedCheck: 'npm run articulated:check',
      reviewGallery: 'npm run review:articulated:quick',
      runtimePreview: `npm run sandbox:preview -- --id ${runtimeCreatureId} --with diver --serve --open --visual`,
      sandboxVisual: `npm run sandbox:visual -- --ids ${runtimeCreatureId} --states idle,lunge,stunned --with diver`,
      quickReview: `npm run content:quick-review -- --id ${runtimeCreatureId}`,
      acceptanceAudit: `npm run content:acceptance-audit -- --id ${runtimeCreatureId}`,
      threatAcceptanceDryRun: threatAcceptanceCommand(runtimeCreatureId, candidate),
    },
  };
  const jsonOut = resolve(outDir, `${candidate.id}.json`);
  const markdownOut = resolve(outDir, `${candidate.id}.md`);
  await mkdir(dirname(jsonOut), { recursive: true });
  await writeFile(jsonOut, `${JSON.stringify(pack, null, 2)}\n`);
  await writeFile(markdownOut, markdownFor(pack));
  packs.push({ ...pack, jsonOut, markdownOut });
}

const index = {
  schema: 'water9/rigging-focus-pack-index@1',
  generatedAt: new Date().toISOString(),
  packs: packs.map((pack) => ({
    id: pack.id,
    species: pack.species,
    stage: pack.stage,
    sourceApproved: pack.sourceApproved,
    runtimeRegistered: pack.runtimeRegistered,
    threatAccepted: pack.threatAccepted,
    markdown: `public/review/rigging-packs/${pack.id}.md`,
    json: `public/review/rigging-packs/${pack.id}.json`,
  })),
};
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
const stageCounts = index.packs.reduce((counts, pack) => {
  counts[pack.stage] = (counts[pack.stage] ?? 0) + 1;
  return counts;
}, {});
await writeFile(resolve(outDir, 'index.md'), `${[
  '# Rigging Focus Pack Index',
  '',
  `Generated: \`${index.generatedAt}\``,
  `Packs: \`${index.packs.length}\``,
  '',
  '## Stage Counts',
  '',
  ...Object.entries(stageCounts).map(([stage, count]) => `- \`${stage}\`: \`${count}\``),
  '',
  '| Candidate | Stage | Source Approved | Runtime Registered | Threat Accepted | Packet |',
  '| --- | --- | ---: | ---: | ---: | --- |',
  ...index.packs.map((pack) => `| ${pack.species} (\`${pack.id}\`) | \`${pack.stage}\` | ${pack.sourceApproved ? 'yes' : 'no'} | ${pack.runtimeRegistered ? 'yes' : 'no'} | ${pack.threatAccepted ? 'yes' : 'no'} | [md](${pack.id}.md) |`),
  '',
].join('\n')}`);

console.log(JSON.stringify({
  built: packs.length,
  ids: packs.map((pack) => pack.id),
  stages: Object.fromEntries(packs.map((pack) => [pack.id, pack.stage])),
  index: resolve(outDir, 'index.md'),
}, null, 2));

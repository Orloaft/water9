import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  MIN_VISUAL_NOTE_LENGTH,
  distinctReviewNotes,
  meaningfulReviewText,
  reviewNoteHasEvidenceTerms,
} from './review_text_quality.mjs';
import {
  rigAcceptedStrict,
  sourceApprovedStrict,
  sourceImageValidationRecorded as strictSourceImageValidationRecorded,
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
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  stageBoard: resolve(String(args.get('stage-board') ?? 'public/review/content-stage-board.json')),
  sourceReviewDossier: resolve(String(args.get('source-review-dossier') ?? 'public/review/source-candidates/source-review-dossier.json')),
  sourceGenerationSprint: resolve(String(args.get('source-generation-sprint') ?? 'public/review/source-candidates/source-generation-sprint.json')),
  riggingPacks: resolve(String(args.get('rigging-packs') ?? 'public/review/rigging-packs/index.json')),
  runtime: resolve(String(args.get('runtime') ?? 'public/assets/generated/articulated-creatures.parts.json')),
  articulatedReview: resolve(String(args.get('articulated-review') ?? 'public/review/articulated/review-manifest.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-acceptance-runway.json')),
  outMd: resolve(String(args.get('md-out') ?? 'public/review/content-acceptance-runway.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-acceptance-runway.html')),
  packetDir: resolve(String(args.get('packet-dir') ?? 'public/review/acceptance-packets')),
};

const DISALLOWED_REVIEWERS = new Set(['codex', 'assistant', 'ai', 'agent', 'automation', 'bot', 'model']);
const SOURCE_VISUAL_CHECKS = [
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
const RIG_VISUAL_CHECKS = [
  'single-source-cohesion',
  'readable-silhouette',
  'anatomy-cohesion',
  'production-visual-cohesion',
  'socket-seams',
  'motion-stability',
  'sandbox-behavior',
];
const RIG_VISUAL_NOTE_TERMS = {
  'single-source-cohesion': ['source', 'cohesion', 'parity', 'whole', 'same creature'],
  'readable-silhouette': ['silhouette', 'outline', 'scale', 'readable', 'shape'],
  'anatomy-cohesion': ['anatomy', 'orientation', 'part', 'jaw', 'body', 'tail', 'limb'],
  'production-visual-cohesion': ['production', 'placeholder', 'palette', 'lighting', 'material', 'cohesion'],
  'socket-seams': ['socket', 'seam', 'joint', 'overlay', 'connection'],
  'motion-stability': ['phase', 'motion', 'jitter', 'popping', 'frame', 'animation'],
  'sandbox-behavior': ['sandbox', 'idle', 'lunge', 'stunned', 'diver', 'behavior', 'motion'],
};
const RIG_REVIEW_EVIDENCE = ['whole-source', 'contact-sheet', 'phase-strip', 'source-parity', 'sandbox-preview'];

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function fileSummary(path) {
  try {
    const info = await stat(path);
    return { path, exists: info.isFile(), bytes: info.size, mtimeMs: Math.round(info.mtimeMs) };
  } catch {
    return { path, exists: false, bytes: 0, mtimeMs: 0 };
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mdEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'candidate';
}

function stageRank(stage) {
  const ranks = {
    'source-image-needed': 10,
    'source-review-needed': 20,
    'prototype-needs-approved-source': 30,
    'articulation-plan-needed': 40,
    'human-rig-review-needed': 50,
    accepted: 90,
  };
  return ranks[stage] ?? 60;
}

function runtimeForCandidate(runtime, candidate) {
  return (runtime.creatures ?? []).find((creature) => creature.quality?.sourceCandidateId === candidate.id || candidate.riggedCreatureId === creature.id || creature.id === candidate.id) ?? null;
}

function reviewForRuntime(articulatedReview, runtimeCreature) {
  if (!runtimeCreature) return null;
  return (articulatedReview.creatures ?? []).find((creature) => creature.id === runtimeCreature.id) ?? null;
}

function sourceImageValidationRecorded(candidate) {
  return strictSourceImageValidationRecorded(candidate);
}

function strictSourceApproved(candidate) {
  return sourceApprovedStrict(candidate);
}

function acceptedQuality(quality) {
  return rigAcceptedStrict({ quality });
}

function strictThreatAccepted(candidate, runtimeCreature, reviewItem) {
  return threatAcceptedForContentGate(candidate, runtimeCreature, reviewItem);
}

function genericThreatAcceptCommand(runtimeId, candidateId) {
  return `npm run content:accept -- --id ${runtimeId} --status accepted --source-candidate ${candidateId} --reviewed-by <human-reviewer> --note '<specific rig approval note>' --visual-check single-source-cohesion --visual-check readable-silhouette --visual-check anatomy-cohesion --visual-check production-visual-cohesion --visual-check socket-seams --visual-check motion-stability --visual-check sandbox-behavior --score single-source-cohesion=<4-5> --score readable-silhouette=<4-5> --score anatomy-cohesion=<4-5> --score production-visual-cohesion=<4-5> --score socket-seams=<4-5> --score motion-stability=<4-5> --score sandbox-behavior=<4-5> --visual-note single-source-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note anatomy-cohesion='<specific rationale>' --visual-note production-visual-cohesion='<specific rationale>' --visual-note socket-seams='<specific rationale>' --visual-note motion-stability='<specific rationale>' --visual-note sandbox-behavior='<specific rationale>' --source-reviewed --contact-reviewed --phase-reviewed --parity-reviewed --sandbox-reviewed --dry-run`;
}

function dryRunSourceAccept(command) {
  const text = String(command ?? '').trim();
  if (!text || !text.includes('npm run source:accept')) return text;
  return text.includes('--dry-run') ? text : `${text} --dry-run`;
}

function sourceCommands(candidate, sourceDossierItem, sourceSprintCard) {
  if (!candidate.source) {
    const captureCommand = sourceSprintCard?.commands?.captureInbox ?? `npm run source:inbox-capture -- --id ${candidate.id} --open`;
    const recoverCommand = sourceSprintCard?.commands?.recoverSavedFile ?? `npm run source:recover-inline -- --id ${candidate.id} --image <saved-image-path> --copy --validate`;
    const checkCommand = sourceSprintCard?.commands?.inboxCheck ?? `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${candidate.id}`;
    const dryRunCommand = sourceSprintCard?.commands?.ingestDryRun ?? `npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids ${candidate.id} --dry-run`;
    const ingestCommand = sourceSprintCard?.commands?.ingest ?? `npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids ${candidate.id}`;
    const commands = [
      `npm run source:session -- --id ${candidate.id}`,
      captureCommand,
      recoverCommand,
      checkCommand,
      dryRunCommand,
      ingestCommand,
      'npm run source:check',
    ];
    return sourceSprintCard?.captureFirst ? [captureCommand, ...commands.filter((command) => command !== captureCommand)] : commands;
  }
  return [
    'npm run source:gallery',
    'npm run source:image-check',
    'npm run source:preview-check',
    'npm run source:review-dossier',
    'npm run source:approval-runway && npm run source:approval-runway-check && npm run source:approval-runway:preview',
    'npm run source:visual-board && npm run source:visual-board-check',
    dryRunSourceAccept(sourceDossierItem?.acceptCommand ?? `npm run source:accept -- --id ${candidate.id} --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed`),
  ];
}

function rigCommands(candidate, runtimeCreature, reviewItem) {
  const runtimeId = runtimeCreature?.id ?? candidate.riggedCreatureId ?? candidate.id;
  return [
    `npm run content:rigging-pack -- --id ${candidate.id}`,
    `npm run articulated:prepare-plan -- --id ${candidate.id} --plan tools/scratch/${candidate.id}-starter-plan.json --preview public/review/articulated/${candidate.id}-plan-preview.png`,
    `npm run sandbox:preview -- --id ${runtimeId} --with diver --serve --open --visual`,
    `npm run sandbox:visual -- --ids ${runtimeId} --states idle,lunge,stunned --with diver`,
    'npm run review:articulated:quick && npm run review:check',
    genericThreatAcceptCommand(runtimeId, candidate.id),
  ];
}

function nextActionFor(item) {
  if (!item.hasSourceImage) return item.commands.source[0];
  if (!item.sourceApproved) return item.commands.source[item.commands.source.length - 1];
  if (!item.runtimeRegistered) return item.commands.rigging[0];
  if (!item.threatAccepted) return item.commands.rigging[item.commands.rigging.length - 1];
  return 'npm run content:gate';
}

function runwayActionSummary(item) {
  return {
    id: item.id,
    species: item.species,
    stage: item.stage,
    nextAction: item.nextAction,
    blockers: item.blockers,
    sourceApproved: item.sourceApproved,
    runtimeRegistered: item.runtimeRegistered,
    runtimeId: item.runtimeId,
    sandboxUrl: item.sandboxUrl,
  };
}

function acceptancePacketFor(item) {
  return {
    file: `public/review/acceptance-packets/${safeFileName(item.id)}.md`,
    stage: item.stage,
    nextAction: item.nextAction,
    sourceReviewPacket: item.sourceReviewPacket ?? null,
    commands: {
      nextAction: item.nextAction,
      source: item.commands.source,
      rigging: item.commands.rigging,
      finalGate: 'npm run content:gate',
    },
  };
}

function markdownCommandBlock(commands) {
  return `\`\`\`bash\n${commands.filter(Boolean).join('\n')}\n\`\`\``;
}

function renderAcceptancePacket(item) {
  return `# Acceptance Packet: ${item.species} (${item.id})

Stage: \`${item.stage}\`

This packet is the current production path for moving this candidate toward the strict 20-threat gate. It does not grant approval by itself.

## Human Approval Boundary

Source approval commands in this packet are dry-run templates. A real source approval must be generated from the source approval runway after a human inspects the source, magenta key preview, sandbox source preview, visual board, and articulation plan preview.

## Current State

- Source image: \`${item.hasSourceImage}\`
- Source approved: \`${item.sourceApproved}\`
- Runtime registered: \`${item.runtimeRegistered}\`
- Runtime id: \`${item.runtimeId ?? 'none'}\`
- Threat accepted: \`${item.threatAccepted}\`
- Source review packet: ${item.sourceReviewPacket ? `\`${item.sourceReviewPacket}\`` : 'none yet'}
- Rigging pack: ${item.riggingPackHref ? `\`${item.riggingPackHref}\`` : 'none yet'}
- Sandbox URL: ${item.sandboxUrl ? `\`${item.sandboxUrl}\`` : 'none yet'}

## Blockers

${item.blockers.length ? item.blockers.map((blocker) => `- ${blocker}`).join('\n') : '- None recorded.'}

## Next Action

${markdownCommandBlock([item.nextAction])}

## Source Path

${markdownCommandBlock(item.commands.source)}

## Rig And Acceptance Path

${markdownCommandBlock(item.commands.rigging)}

## Final Gate

${markdownCommandBlock(['npm run content:gate'])}
`;
}

function unmappedPrototypePacketFor(creature) {
  return {
    file: `public/review/acceptance-packets/unmapped-${safeFileName(creature.id)}.md`,
    id: creature.id,
    species: creature.species ?? creature.id,
    status: creature.quality?.status ?? null,
    sourceCandidateId: creature.quality?.sourceCandidateId ?? null,
    sandboxUrl: `/?sandbox=${creature.id}`,
    blockers: [
      'prototype is not mapped to a source candidate',
      'strict gate requires approved magenta source art before rig acceptance',
    ],
    commands: {
      preview: `npm run sandbox:preview -- --id ${creature.id} --with diver --serve --open --visual`,
      visual: `npm run sandbox:visual -- --ids ${creature.id} --states idle,lunge,stunned --with diver`,
      audit: `npm run content:acceptance-audit -- --id ${creature.id}`,
      sourceQueue: 'Create or select a source-candidate id, then capture/recover/ingest magenta source art before attempting acceptance.',
      finalGate: 'npm run content:gate',
    },
  };
}

function renderUnmappedPrototypePacket(packet) {
  return `# Unmapped Prototype Packet: ${packet.species} (${packet.id})

Status: \`${packet.status ?? 'unknown'}\`

This prototype is visible in sandbox tooling, but it cannot count toward the strict 20-threat gate until it is recreated or linked through an approved source candidate with magenta-background source art.

## Blockers

${packet.blockers.map((blocker) => `- ${blocker}`).join('\n')}

## Current Preview

- Sandbox URL: \`${packet.sandboxUrl}\`

${markdownCommandBlock([
  packet.commands.preview,
  packet.commands.visual,
  packet.commands.audit,
])}

## Required Migration

1. Create or select a source-candidate id for this design.
2. Generate/capture/recover a cohesive magenta-background whole-source image.
3. Ingest it through the source inbox pipeline.
4. Pass source review with a human reviewer.
5. Rebuild/confirm the articulated rig from that approved source.
6. Run paired diver sandbox visual checks for idle, lunge, and stunned.
7. Run \`content:accept\` only after source, contact sheet, phase strip, and sandbox behavior are reviewed.

## Final Gate

${markdownCommandBlock([packet.commands.finalGate])}
`;
}

function recommendedByStageFor(items) {
  const byStage = {};
  for (const item of items) {
    if (item.accepted || byStage[item.stage]) continue;
    byStage[item.stage] = runwayActionSummary(item);
  }
  return byStage;
}

function renderMarkdown(runway) {
  const rows = runway.items.map((item) => `| ${mdEscape(item.id)} | ${mdEscape(item.species)} | ${mdEscape(item.stage)} | ${item.runtimeId ? mdEscape(item.runtimeId) : 'none'} | ${item.acceptancePacket ? mdEscape(item.acceptancePacket.file) : 'missing'} | ${mdEscape(item.nextAction)} |`).join('\n');
  return `# Water 9 Acceptance Runway

Generated production path for moving source candidates into accepted underwater threats.

## Human Approval Boundary

Source approval actions shown here are dry-run templates. Real source approval must come from the source approval runway after human visual review.

## Summary

- Target threats: ${runway.summary.targetThreats}
- Accepted threats: ${runway.summary.acceptedThreats}
- Strict gate complete: ${runway.summary.strictGateComplete}
- Final gate still required: ${runway.summary.finalGateStillRequired}
- Source images: ${runway.summary.sourceImages}
- Source approvals: ${runway.summary.approvedSources}
- Runtime registered: ${runway.summary.runtimeRegistered}
- Unmapped prototypes: ${runway.summary.unmappedPrototypeThreats}

## Commands

\`\`\`sh
npm run content:acceptance-runway
npm run content:acceptance-runway-check
npm run content:gate
\`\`\`

## Recommended By Stage

${Object.entries(runway.recommendedByStage).map(([stage, item]) => `### ${stage}

- Candidate: ${item.species} (${item.id})
- Next action: \`${item.nextAction}\`
- Blockers: ${item.blockers.join('; ') || 'none'}
`).join('\n')}

## Candidates

| Candidate | Species | Stage | Runtime | Packet | Next Action |
| --- | --- | --- | --- | --- | --- |
${rows}

## Unmapped Prototype Packets

${runway.unmappedPrototypeThreats.length ? runway.unmappedPrototypeThreats.map((item) => `- \`${item.id}\`: \`${item.packet.file}\``).join('\n') : '- None.'}
`;
}

function commandList(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function renderHtml(runway) {
  const stagePills = Object.entries(runway.summary.stageCounts)
    .map(([stage, count]) => `<span>${htmlEscape(stage)} <strong>${count}</strong></span>`)
    .join('');
  const cards = runway.items.map((item) => `<article class="card" id="${htmlEscape(item.id)}" data-acceptance-candidate="${htmlEscape(item.id)}">
    <header>
      <div><h2>${htmlEscape(item.species)}</h2><code>${htmlEscape(item.id)}</code></div>
      <strong>${htmlEscape(item.stage)}</strong>
    </header>
    <p>${htmlEscape(item.blockers.join('; ') || 'No blockers recorded.')}</p>
    <div class="links">
      ${item.sourceReviewHref ? `<a href="${htmlEscape(item.sourceReviewHref)}">source review</a>` : ''}
      ${item.acceptancePacket ? `<a href="${htmlEscape(item.acceptancePacket.file.replace('public/review/', ''))}">acceptance packet</a>` : ''}
      ${item.riggingPackHref ? `<a href="${htmlEscape(item.riggingPackHref)}">rigging pack</a>` : ''}
      ${item.sandboxUrl ? `<a href="${htmlEscape(item.sandboxUrl)}">sandbox</a>` : ''}
    </div>
    <h3>Next Action</h3>
    ${commandList([item.nextAction])}
    <h3>Source Path</h3>
    ${commandList(item.commands.source)}
    <h3>Rig And Acceptance Path</h3>
    ${commandList(item.commands.rigging)}
  </article>`).join('\n');
  const recommendedCards = Object.entries(runway.recommendedByStage)
    .map(([stage, item]) => `<article class="card">
      <header>
        <div><h2>${htmlEscape(stage)}</h2><code>${htmlEscape(item.id)} ${htmlEscape(item.species)}</code></div>
        <strong>recommended</strong>
      </header>
      <p>${htmlEscape(item.blockers.join('; ') || 'No blockers recorded.')}</p>
      <h3>Next Action</h3>
      ${commandList([item.nextAction])}
    </article>`)
    .join('\n');
  const unmappedCards = runway.unmappedPrototypeThreats.map((item) => `<article class="card" id="${htmlEscape(item.id)}" data-unmapped-prototype="${htmlEscape(item.id)}">
    <header>
      <div><h2>${htmlEscape(item.id)}</h2><code>${htmlEscape(item.status ?? 'unknown')}</code></div>
      <strong>unmapped prototype</strong>
    </header>
    <p>${htmlEscape(item.blockers.join('; '))}</p>
    <div class="links">
      <a href="${htmlEscape(item.packet.file.replace('public/review/', ''))}">migration packet</a>
      <a href="${htmlEscape(item.sandboxUrl)}">sandbox</a>
    </div>
    <h3>Preview Evidence</h3>
    ${commandList([item.packet.commands.preview, item.packet.commands.visual, item.packet.commands.audit])}
  </article>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Acceptance Runway</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0d1b20; --line:#29444b; --text:#e6f5f5; --muted:#91a9ae; --accent:#7adff6; --warn:#f0bd6b; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1360px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2, h3 { margin:0 0 8px; }
    h2 { font-size:18px; }
    h3 { margin-top:14px; font-size:13px; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; }
    p { margin:0 0 12px; color:var(--muted); }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { margin:8px 0 0; padding:10px; border:1px solid var(--line); background:#050b0d; overflow:auto; white-space:pre-wrap; }
    .summary { display:flex; flex-wrap:wrap; gap:9px; margin:18px 0 24px; }
    .summary span { border:1px solid var(--line); background:#09171b; border-radius:5px; padding:7px 9px; color:var(--muted); }
    .summary strong { color:var(--text); margin-left:4px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(360px,1fr)); gap:14px; }
    .card { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:15px; }
    .card header { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; margin-bottom:10px; }
    .card header strong { color:var(--warn); }
    .links { display:flex; flex-wrap:wrap; gap:10px; margin:8px 0; }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Acceptance Runway</h1>
    <p>Candidate-by-candidate path from magenta source art to articulated, sandbox-tested, human-accepted underwater threats.</p>
    <section class="card">
      <h2>Human Approval Boundary</h2>
      <p>Source approval actions shown here are dry-run templates. Real source approval must be generated from the source approval runway after human review of the source, magenta key preview, sandbox source preview, visual board, and articulation plan preview.</p>
    </section>
    <div class="summary">
      <span>accepted threats <strong>${runway.summary.acceptedThreats}/${runway.summary.targetThreats}</strong></span>
      <span>strict gate complete <strong>${runway.summary.strictGateComplete ? 'yes' : 'no'}</strong></span>
      <span>final gate still required <strong>${runway.summary.finalGateStillRequired ? 'yes' : 'no'}</strong></span>
      <span>source images <strong>${runway.summary.sourceImages}</strong></span>
      <span>approved sources <strong>${runway.summary.approvedSources}</strong></span>
      <span>runtime registered <strong>${runway.summary.runtimeRegistered}</strong></span>
      <span>unmapped prototypes <strong>${runway.summary.unmappedPrototypeThreats}</strong></span>
    </div>
    ${commandList([
      'npm run content:acceptance-runway',
      'npm run content:acceptance-runway-check',
      'npm run content:gate',
    ])}
    <div class="summary">${stagePills}</div>
    <h2>Recommended By Stage</h2>
    <section class="grid">${recommendedCards}</section>
    <h2>Unmapped Prototype Migration</h2>
    <section class="grid">${unmappedCards || '<p>No unmapped prototypes.</p>'}</section>
    <h2>All Candidates</h2>
    <section class="grid">${cards}</section>
  </main>
</body>
</html>
`;
}

const sourceCandidates = await readJson(paths.sourceCandidates, { candidates: [] });
const stageBoard = await readJson(paths.stageBoard, { targets: [], summary: {} });
const sourceReviewDossier = await readJson(paths.sourceReviewDossier, { items: [], summary: {} });
const sourceGenerationSprint = await readJson(paths.sourceGenerationSprint, { candidates: [] });
const riggingPacks = await readJson(paths.riggingPacks, { packs: [] });
const runtime = await readJson(paths.runtime, { creatures: [] });
const articulatedReview = await readJson(paths.articulatedReview, { creatures: [] });

const stageById = new Map((stageBoard.targets ?? []).map((target) => [target.id, target]));
const sourceDossierById = new Map((sourceReviewDossier.items ?? []).map((item) => [item.id, item]));
const sourceSprintById = new Map((sourceGenerationSprint.candidates ?? []).map((item) => [item.id, item]));
const rigPackById = new Map((riggingPacks.packs ?? []).map((pack) => [pack.id, pack]));
const candidates = Array.isArray(sourceCandidates.candidates) ? sourceCandidates.candidates : [];

const items = candidates.map((candidate) => {
  const stageTarget = stageById.get(candidate.id) ?? {};
  const sourceDossierItem = sourceDossierById.get(candidate.id) ?? null;
  const sourceSprintCard = sourceSprintById.get(candidate.id) ?? null;
  const runtimeCreature = runtimeForCandidate(runtime, candidate);
  const reviewItem = reviewForRuntime(articulatedReview, runtimeCreature);
  const rigPack = rigPackById.get(candidate.id) ?? null;
  const stage = stageTarget.stage ?? (candidate.source ? 'source-review-needed' : 'source-image-needed');
  const sourceApproved = strictSourceApproved(candidate);
  const threatAccepted = strictThreatAccepted(candidate, runtimeCreature, reviewItem);
  const blockers = [];
  if (!candidate.source) blockers.push('source image is missing');
  if (candidate.source && !sourceApproved) blockers.push('strict human source approval is missing');
  if (sourceApproved && !runtimeCreature) blockers.push('articulated runtime creature is missing');
  if (runtimeCreature && !threatAccepted) blockers.push('strict human rig acceptance is missing');
  if (runtimeCreature && !reviewItem?.sandboxUrl) blockers.push('articulated review sandbox link is missing');
  const item = {
    id: candidate.id,
    species: candidate.species,
    stage,
    stageRank: Number(stageTarget.rank ?? 9999),
    accepted: threatAccepted,
    hasSourceImage: Boolean(candidate.source),
    sourceApproved,
    sourceDossierApproved: sourceDossierItem?.approved === true,
    runtimeRegistered: Boolean(runtimeCreature),
    runtimeId: runtimeCreature?.id ?? candidate.riggedCreatureId ?? null,
    threatAccepted,
    sourceReviewHref: 'source-candidates/source-review-dossier.html',
    sourceReviewPacket: sourceDossierItem?.reviewPacket?.file ?? null,
    riggingPackHref: rigPack ? `rigging-packs/${candidate.id}.md` : null,
    sandboxUrl: reviewItem?.sandboxUrl ?? (runtimeCreature ? `/?sandbox=${runtimeCreature.id}` : null),
    blockers,
    commands: {
      source: sourceCommands(candidate, sourceDossierItem, sourceSprintCard),
      rigging: rigCommands(candidate, runtimeCreature, reviewItem),
    },
  };
  item.acceptancePacket = acceptancePacketFor(item);
  item.nextAction = nextActionFor(item);
  item.acceptancePacket.nextAction = item.nextAction;
  item.acceptancePacket.commands.nextAction = item.nextAction;
  return item;
}).sort((left, right) => stageRank(left.stage) - stageRank(right.stage) || left.stageRank - right.stageRank || left.id.localeCompare(right.id));

const mappedRuntimeIds = new Set(items.map((item) => item.runtimeId).filter(Boolean));
const unmappedPrototypeThreats = (runtime.creatures ?? []).filter((creature) => creature.quality?.status !== 'accepted' && !mappedRuntimeIds.has(creature.id));
const unmappedPrototypeItems = unmappedPrototypeThreats.map((creature) => {
  const packet = unmappedPrototypePacketFor(creature);
  return {
    id: creature.id,
    status: creature.quality?.status ?? null,
    sourceCandidateId: creature.quality?.sourceCandidateId ?? null,
    sandboxUrl: `/?sandbox=${creature.id}`,
    blockers: packet.blockers,
    packet,
  };
});
const stageCounts = items.reduce((counts, item) => {
  counts[item.stage] = (counts[item.stage] ?? 0) + 1;
  return counts;
}, {});

const runway = {
  schema: 'water9/content-acceptance-runway@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: Object.fromEntries(await Promise.all(Object.entries(paths)
    .filter(([key]) => !key.startsWith('out'))
    .map(async ([key, path]) => [key, await fileSummary(path)]))),
  summary: {
    targetThreats: 20,
    candidates: items.length,
    acceptedThreats: items.filter((item) => item.threatAccepted).length,
    sourceImages: items.filter((item) => item.hasSourceImage).length,
    approvedSources: items.filter((item) => item.sourceApproved).length,
    runtimeRegistered: items.filter((item) => item.runtimeRegistered).length,
    unmappedPrototypeThreats: unmappedPrototypeThreats.length,
    stageCounts,
    nextBottleneck: stageBoard.summary?.nextBottleneck ?? 'unknown',
  },
  recommendedByStage: recommendedByStageFor(items),
  unmappedPrototypeThreats: unmappedPrototypeItems,
  items,
};
runway.summary.strictGateComplete = runway.summary.acceptedThreats >= runway.summary.targetThreats;
runway.summary.finalGateStillRequired = !runway.summary.strictGateComplete;

await mkdir(dirname(paths.outJson), { recursive: true });
await mkdir(paths.packetDir, { recursive: true });
for (const item of items) {
  await writeFile(resolve(item.acceptancePacket.file), renderAcceptancePacket(item));
}
for (const item of unmappedPrototypeItems) {
  await writeFile(resolve(item.packet.file), renderUnmappedPrototypePacket(item.packet));
}
await writeFile(paths.outJson, `${JSON.stringify(runway, null, 2)}\n`);
await writeFile(paths.outMd, renderMarkdown(runway));
await writeFile(paths.outHtml, renderHtml(runway));

console.log(JSON.stringify({
  schema: runway.schema,
  jsonOut: paths.outJson,
  mdOut: paths.outMd,
  htmlOut: paths.outHtml,
  summary: runway.summary,
}, null, 2));

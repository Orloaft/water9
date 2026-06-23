import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const paths = {
  jsonOut: resolve(String(args.get('json-out') ?? 'public/review/content-goal-readiness.json')),
  markdownOut: resolve(String(args.get('out') ?? 'public/review/content-goal-readiness.md')),
  articulatedManifest: resolve(String(args.get('articulated-manifest') ?? 'public/assets/generated/articulated-creatures.parts.json')),
  sourceApprovalRunway: resolve(String(args.get('source-approval-runway') ?? 'public/review/source-approval-runway.json')),
  sourceCriticRegeneration: resolve(String(args.get('source-critic-regeneration') ?? 'public/review/source-candidates/source-critic-regeneration-queue.json')),
  sourceCriticRegenerationHealth: resolve(String(args.get('source-critic-regeneration-health') ?? 'public/review/source-candidates/source-critic-regeneration-health.json')),
  sourceReviewSequencer: resolve(String(args.get('source-review-sequencer') ?? 'public/review/source-candidates/source-review-sequencer.json')),
  sourceRegenerationWorkspace: resolve(String(args.get('source-regeneration-workspace') ?? 'public/review/source-candidates/source-regeneration-workspace.json')),
};

function runStatus() {
  const result = spawnSync(process.execPath, ['tools/content_pipeline_status.mjs', '--json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`content_pipeline_status failed with ${result.status}: ${result.stderr || result.stdout}`);
  }
  const jsonStart = result.stdout.indexOf('{');
  if (jsonStart < 0) throw new Error('content_pipeline_status did not print JSON');
  return JSON.parse(result.stdout.slice(jsonStart));
}

function milestone(id, label, current, target, blockers, nextCommands = []) {
  return {
    id,
    label,
    current,
    target,
    complete: current >= target && blockers.length === 0,
    blockers,
    nextCommands: [...new Set(nextCommands.filter(Boolean))],
  };
}

function nextActionFor(status, milestones) {
  const incomplete = milestones.find((item) => !item.complete);
  if (!incomplete) {
    return {
      stage: 'complete',
      title: 'Strict 20-threat content goal is ready',
      commands: ['npm run content:gate'],
      blockers: [],
    };
  }
  return {
    stage: incomplete.id,
    title: incomplete.blockers[0] ?? incomplete.label,
    commands: incomplete.nextCommands,
    blockers: incomplete.blockers,
  };
}

function dryRunSourceAccept(command) {
  const text = String(command ?? '').trim();
  if (!text || !text.includes('npm run source:accept')) return text;
  return text.includes('--dry-run') ? text : `${text} --dry-run`;
}

async function readJsonOptional(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function loadPrototypeQuarantine() {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(paths.articulatedManifest, 'utf8'));
  } catch {
    manifest = { creatures: [] };
  }
  const creatures = Array.isArray(manifest?.creatures) ? manifest.creatures : [];
  const prototypes = creatures
    .filter((creature) => creature?.quality?.status === 'prototype')
    .map((creature) => ({
      id: creature.id,
      species: creature.species,
      status: creature.quality?.status ?? null,
      sourceCandidateId: creature.quality?.sourceCandidateId ?? null,
      notCountedTowardGoal: true,
      blocker: 'prototype rig requires approved single-source art and strict human rig acceptance',
      previewCommand: `npm run sandbox:preview -- --id ${creature.id} --with diver --serve --open --visual`,
      auditCommand: `npm run content:acceptance-audit -- --id ${creature.id}`,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    policy: 'Prototype rigs are sandbox-only evidence. They do not count toward the 20-threat goal until strict source approval and strict rig acceptance are recorded by a human reviewer.',
    count: prototypes.length,
    notCountedTowardGoal: prototypes.length,
    ids: prototypes.map((item) => item.id),
    samples: prototypes.slice(0, 8),
  };
}

function markdown(report) {
  const lines = [
    '# Water9 Content Goal Readiness',
    '',
    `Generated: \`${report.generatedAt}\``,
    '',
    `Strict goal complete: \`${report.strictGoalComplete}\``,
    `Next stage: \`${report.nextAction.stage}\``,
    `Next action: ${report.nextAction.title}`,
    '',
    '## Human Approval Boundary',
    '',
    'Top-level readiness only exposes source approval dry-runs and reviewed-only decision exports. A real approval must be run by a human after inspecting the source approval runway, visual board, sandbox source preview, magenta key, and articulation plan preview.',
    '',
    '## Critic Regeneration Health',
    '',
    `- Distinct replacements ready: \`${report.sourceReview.criticRegenerationHealth?.distinctReplacementReady ?? 'unknown'}\``,
    `- Applied replacements: \`${report.sourceReview.criticRegenerationHealth?.appliedReplacements ?? 'unknown'}\``,
    `- Valid no-op replacements: \`${report.sourceReview.criticRegenerationHealth?.validNoopReplacements ?? 'unknown'}\``,
    `- Missing replacements: \`${report.sourceReview.criticRegenerationHealth?.missingReplacements ?? 'unknown'}\``,
    `- Invalid replacements: \`${report.sourceReview.criticRegenerationHealth?.invalidReplacements ?? 'unknown'}\``,
    `- Next health target: \`${report.sourceReview.criticRegenerationHealth?.nextActionTarget ?? 'none'}\``,
    `- Next health status: \`${report.sourceReview.criticRegenerationHealth?.nextActionStatus ?? 'unknown'}\``,
    '',
    '## Source Review Sequencer',
    '',
    `- Next lane: \`${report.sourceReview.sequencer?.nextLane ?? 'none'}\``,
    `- Next target: \`${report.sourceReview.sequencer?.nextTarget ?? 'none'}\``,
    `- Approval-ready: \`${report.sourceReview.sequencer?.approvalReady ?? 'unknown'}\``,
    `- Critic regeneration required: \`${report.sourceReview.sequencer?.criticRegenerationRequired ?? 'unknown'}\``,
    `- Valid no-op replacements: \`${report.sourceReview.sequencer?.validNoopReplacements ?? 'unknown'}\``,
    `- Missing replacements: \`${report.sourceReview.sequencer?.missingReplacements ?? 'unknown'}\``,
    '',
    '## Source Regeneration Workspace',
    '',
    `- Target: \`${report.sourceReview.regenerationWorkspace?.target ?? 'none'}\``,
    `- Lane: \`${report.sourceReview.regenerationWorkspace?.lane ?? 'none'}\``,
    `- Health status: \`${report.sourceReview.regenerationWorkspace?.healthStatus ?? 'none'}\``,
    `- Replacement matches current source: \`${report.sourceReview.regenerationWorkspace?.replacementMatchesCurrentSource ?? 'unknown'}\``,
    `- Distinct replacement ready: \`${report.sourceReview.regenerationWorkspace?.distinctReplacementReady ?? 'unknown'}\``,
    `- Source SHA-256: \`${report.sourceReview.regenerationWorkspace?.sourceSha256 ?? 'missing'}\``,
    `- Inbox SHA-256: \`${report.sourceReview.regenerationWorkspace?.inboxSha256 ?? 'missing'}\``,
    `- Workspace page: \`/review/source-candidates/source-regeneration-workspace.html\``,
    '',
    '## Next Commands',
    '',
    '```bash',
    ...(report.nextAction.commands.length ? report.nextAction.commands : ['npm run content:status -- --json']),
    '```',
    '',
    '## Milestones',
    '',
    '| Stage | Current | Target | Complete | Blockers |',
    '| --- | ---: | ---: | --- | --- |',
  ];
  for (const item of report.milestones) {
    lines.push(`| ${item.label} | ${item.current} | ${item.target} | ${item.complete ? 'yes' : 'no'} | ${item.blockers.join('<br>') || 'none'} |`);
  }
  lines.push(
    '',
    '## Prototype Quarantine',
    '',
    report.prototypeQuarantine.policy,
    '',
    `Quarantined prototypes: \`${report.prototypeQuarantine.count}\``,
    '',
    '| Prototype | Source Candidate | Preview | Audit |',
    '| --- | --- | --- | --- |',
  );
  for (const item of report.prototypeQuarantine.samples) {
    lines.push(`| \`${item.id}\` ${item.species ?? ''} | ${item.sourceCandidateId ? `\`${item.sourceCandidateId}\`` : 'missing'} | \`${item.previewCommand}\` | \`${item.auditCommand}\` |`);
  }
  lines.push(
    '',
    '## Verification',
    '',
    '```bash',
    'npm run content:goal-readiness',
    'npm run content:goal-readiness-check',
    'npm run content:goal-readiness-strict',
    'npm run content:gate',
    '```',
    '',
  );
  return `${lines.join('\n')}\n`;
}

const status = runStatus();
const prototypeQuarantine = await loadPrototypeQuarantine();
const sourceApprovalRunway = await readJsonOptional(paths.sourceApprovalRunway, { items: [], summary: {} });
const sourceCriticRegeneration = await readJsonOptional(paths.sourceCriticRegeneration, { candidates: [], summary: {} });
const sourceCriticRegenerationHealth = await readJsonOptional(paths.sourceCriticRegenerationHealth, { items: [], summary: {}, nextCommands: [] });
const sourceReviewSequencer = await readJsonOptional(paths.sourceReviewSequencer, { items: [], summary: {}, nextCommands: [] });
const sourceRegenerationWorkspace = await readJsonOptional(paths.sourceRegenerationWorkspace, { summary: {}, target: {}, nextCommands: [] });
const target = Number(status.targetThreats ?? 20);
const approvalRunwayItems = Array.isArray(sourceApprovalRunway?.items) ? sourceApprovalRunway.items : [];
const readyQueue = approvalRunwayItems
  .filter((item) => item.readyForHumanReview === true && item.humanApproved !== true)
  .map((item) => ({
    rank: item.rank,
    id: item.id,
    packet: item.links?.quickReview ?? null,
    sourcePreviewCommand: `npm run sandbox:preview -- --id ${item.id} --kind source --with diver --serve --open --visual`,
    acceptCommand: item.acceptCommand,
  }));
const criticRegenerationItems = Array.isArray(sourceCriticRegeneration?.candidates) ? sourceCriticRegeneration.candidates : [];
const sequencerItems = Array.isArray(sourceReviewSequencer?.items) ? sourceReviewSequencer.items : [];
const activeCriticRegenerationItems = sequencerItems.filter((item) => String(item?.lane ?? '').startsWith('regenerate-'));
const activeCriticRegenerationIds = activeCriticRegenerationItems.map((item) => item.id);
const criticRegenerationCount = Number.isFinite(Number(sourceReviewSequencer?.summary?.criticRegenerationRequired))
  ? Number(sourceReviewSequencer.summary.criticRegenerationRequired)
  : Number.isFinite(Number(sourceApprovalRunway?.summary?.criticRegenerationRequired))
    ? Number(sourceApprovalRunway.summary.criticRegenerationRequired)
    : activeCriticRegenerationItems.length || (sourceCriticRegeneration?.summary?.regenerateCandidates ?? criticRegenerationItems.length);
const firstCriticRegeneration = criticRegenerationItems.find((item) => activeCriticRegenerationIds.includes(item.id)) ?? null;
const firstCriticRegenerationHealth = firstCriticRegeneration
  ? (sourceCriticRegenerationHealth?.items ?? []).find((item) => item.id === firstCriticRegeneration.id) ?? null
  : null;
const criticRegenerationHealthCommands = (firstCriticRegenerationHealth?.nextCommands?.length
  ? firstCriticRegenerationHealth.nextCommands
  : sourceCriticRegenerationHealth?.nextCommands) ?? [];
const sequencerCommands = [
  'npm run source:review-sequencer',
  'npm run source:review-sequencer-check',
  'npm run source:review-sequencer:serve-smoke',
  ...(sourceReviewSequencer?.nextCommands ?? []),
];
const regenerationWorkspaceCommands = [
  'npm run source:regeneration-workspace',
  'npm run source:regeneration-workspace-check',
  'npm run source:regeneration-workspace:serve-smoke',
  ...(sourceRegenerationWorkspace?.target?.commands?.safeNext ?? []),
];
const firstReadyReview = readyQueue[0] ?? null;
const sprintCommands = status.sourceGenerationSprint?.commands ?? {};
const acquisitionRunbook = status.sourceAcquisitionRunbook ?? {};
const ingestReadiness = status.sourceIngestReadiness ?? {};
const sprintIds = status.sourceGenerationSprint?.ids ?? [];
const milestones = [
  milestone(
    'research',
    'Research and subagent audits',
    Math.min(status.research?.briefs ?? 0, status.research?.subagentAudits?.auditedCandidates ?? 0),
    target,
    (status.research?.briefs ?? 0) >= target && (status.research?.subagentAudits?.auditedCandidates ?? 0) >= target
      ? []
      : [`research coverage is ${status.research?.briefs ?? 0}/${target}; audited candidates ${status.research?.subagentAudits?.auditedCandidates ?? 0}/${target}`],
    ['npm run research:subagent-pack', 'npm run research:subagent-pack-check', 'npm run research:check'],
  ),
  milestone(
    'source-images',
    'Recoverable source images',
    status.sourceCandidates?.withSourceImage ?? 0,
    target,
    (status.sourceCandidates?.withSourceImage ?? 0) >= target
      ? []
      : [`${target - (status.sourceCandidates?.withSourceImage ?? 0)} source images are still missing`],
    [
      acquisitionRunbook.rebuildCommand,
      acquisitionRunbook.validateCommand,
      ingestReadiness.rebuildCommand,
      ingestReadiness.validateCommand,
      acquisitionRunbook.batchOpenAIDryRunCommand,
      acquisitionRunbook.batchOpenAIApplyCommand,
      acquisitionRunbook.advanceInboxDryRunCommand,
      acquisitionRunbook.advanceInboxApplyCommand,
      acquisitionRunbook.firstCaptureCommand,
      acquisitionRunbook.batchCaptureCommand,
      acquisitionRunbook.inboxCheckCommand,
      ingestReadiness.inboxCheckCommand,
      acquisitionRunbook.ingestDryRunCommand,
      ingestReadiness.ingestDryRunCommand,
      status.sourceInboxReview?.recommendedCaptureCommand,
      sprintCommands.inboxCheck,
      sprintCommands.inboxIngestDryRun,
      sprintCommands.recoverSavedFile,
      'npm run source:workstation',
      'npm run source:workstation-check',
    ],
  ),
  milestone(
    'source-review',
    'Human-approved source images',
    status.sourceCandidates?.approved ?? 0,
    target,
    (status.sourceCandidates?.approved ?? 0) >= target
      ? []
      : [`${target - (status.sourceCandidates?.approved ?? 0)} source images still need human approval; ${readyQueue.length} are approval-ready; ${criticRegenerationCount} require critic regeneration first`],
    [
      ...sequencerCommands,
      ...regenerationWorkspaceCommands,
      'npm run source:critic-regeneration',
      'npm run source:critic-regeneration-check',
      'npm run source:critic-regeneration:serve-smoke',
      'npm run source:critic-regeneration-openai-smoke',
      'npm run source:critic-regeneration-health',
      'npm run source:critic-regeneration-health-check',
      'npm run source:critic-regeneration-health:serve-smoke',
      ...criticRegenerationHealthCommands,
      firstCriticRegenerationHealth?.status === 'distinct-replacement-ready' ? firstCriticRegeneration?.commands?.sourcePreview : null,
      'npm run source:approval-runway',
      'npm run source:approval-runway-check',
      'npm run source:approval-runway:preview',
      'npm run source:approval-session',
      'npm run source:approval-session-check',
      'npm run source:approval-session:serve-smoke',
      'npm run source:visual-board',
      'npm run source:visual-board-check',
      'npm run content:review-session',
      'npm run content:review-session-check',
      'npm run content:review-session:serve-smoke',
      'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
      firstReadyReview?.sourcePreviewCommand,
      dryRunSourceAccept(firstReadyReview?.acceptCommand),
      'npm run source:review-dossier',
      'npm run source:review-dossier-check',
    ],
  ),
  milestone(
    'rigging',
    'Registered articulated threats',
    status.articulatedThreats?.registered ?? 0,
    target,
    (status.articulatedThreats?.registered ?? 0) >= target
      ? []
      : [`${target - (status.articulatedThreats?.registered ?? 0)} articulated runtime threats are still missing`],
    [
      status.riggingPacks?.recommended?.sourcePreviewCommand,
      status.riggingPacks?.recommended?.runtimePreviewCommand,
      status.riggingPacks?.recommended?.sandboxVisualCommand,
      'npm run content:rigging-pack',
      'npm run content:rigging-pack-check',
    ],
  ),
  milestone(
    'sandbox',
    'Sandbox preview coverage',
    status.sandbox?.uniqueChecked ?? 0,
    status.sandbox?.indexEntries ?? target,
    (status.sandbox?.aggregateFailures ?? 0) === 0 && (status.sandbox?.coverageRatio ?? 0) >= 1
      ? []
      : [`sandbox coverage is ${status.sandbox?.uniqueChecked ?? 0}/${status.sandbox?.indexEntries ?? 'unknown'} with ${status.sandbox?.aggregateFailures ?? 0} failures`],
    ['npm run sandbox:index', 'npm run sandbox:visual:all'],
  ),
  milestone(
    'acceptance',
    'Accepted threats',
    status.articulatedThreats?.accepted ?? 0,
    target,
    (status.articulatedThreats?.accepted ?? 0) >= target
      ? []
      : [`${target - (status.articulatedThreats?.accepted ?? 0)} threats still need strict human acceptance`],
    [
      status.riggingPacks?.recommended?.runtimePreviewCommand,
      status.riggingPacks?.recommended?.acceptanceAuditCommand,
      'npm run content:gate',
    ],
  ),
];

const strictGoalComplete = milestones.every((item) => item.complete);
const report = {
  schema: 'water9/content-goal-readiness@1',
  generatedAt: new Date().toISOString(),
  targetThreats: target,
  strictGoalComplete,
  nextBottleneck: status.nextBottleneck ?? null,
  nextAction: nextActionFor(status, milestones),
  sourceReview: {
    approved: status.sourceCandidates?.approved ?? 0,
    approvalReady: readyQueue.length,
    mechanicallyReadyForHumanReview: sourceApprovalRunway?.summary?.mechanicallyReadyForHumanReview ?? null,
    criticRegenerationRequired: criticRegenerationCount,
    criticRegenerationIds: activeCriticRegenerationIds,
    criticRegenerationHealth: {
      distinctReplacementReady: sourceCriticRegenerationHealth?.summary?.distinctReplacementReady ?? null,
      appliedReplacements: sourceCriticRegenerationHealth?.summary?.appliedReplacements ?? null,
      validNoopReplacements: sourceCriticRegenerationHealth?.summary?.validNoopReplacements ?? null,
      missingReplacements: sourceCriticRegenerationHealth?.summary?.missingReplacements ?? null,
      invalidReplacements: sourceCriticRegenerationHealth?.summary?.invalidReplacements ?? null,
      nextActionTarget: sourceCriticRegenerationHealth?.summary?.nextActionTarget ?? null,
      nextActionStatus: sourceCriticRegenerationHealth?.summary?.nextActionStatus ?? null,
    },
    sequencer: {
      nextLane: sourceReviewSequencer?.summary?.nextLane ?? null,
      nextTarget: sourceReviewSequencer?.summary?.nextTarget ?? null,
      approvalReady: sourceReviewSequencer?.summary?.approvalReady ?? null,
      criticRegenerationRequired: sourceReviewSequencer?.summary?.criticRegenerationRequired ?? null,
      distinctReplacementReady: sourceReviewSequencer?.summary?.distinctReplacementReady ?? null,
      validNoopReplacements: sourceReviewSequencer?.summary?.validNoopReplacements ?? null,
      missingReplacements: sourceReviewSequencer?.summary?.missingReplacements ?? null,
      invalidReplacements: sourceReviewSequencer?.summary?.invalidReplacements ?? null,
      countsTowardGate: sourceReviewSequencer?.summary?.countsTowardGate ?? null,
    },
    regenerationWorkspace: {
      target: sourceRegenerationWorkspace?.target?.id ?? null,
      species: sourceRegenerationWorkspace?.target?.species ?? null,
      lane: sourceRegenerationWorkspace?.target?.lane ?? null,
      healthStatus: sourceRegenerationWorkspace?.target?.healthStatus ?? null,
      replacementMatchesCurrentSource: Boolean(sourceRegenerationWorkspace?.target?.replacementMatchesCurrentSource),
      distinctReplacementReady: Boolean(sourceRegenerationWorkspace?.target?.distinctReplacementReady),
      sourcePath: sourceRegenerationWorkspace?.target?.source?.path ?? null,
      sourceSha256: sourceRegenerationWorkspace?.target?.source?.sha256 ?? null,
      inboxPath: sourceRegenerationWorkspace?.target?.inbox?.path ?? null,
      inboxSha256: sourceRegenerationWorkspace?.target?.inbox?.sha256 ?? null,
      page: '/review/source-candidates/source-regeneration-workspace.html',
    },
  },
  sourceSprintIds: sprintIds,
  readyReviewQueue: readyQueue.map((item) => ({
    rank: item.rank,
    id: item.id,
    packet: item.packet,
    approvalRunwayPreviewCommand: 'npm run source:approval-runway:preview',
    visualBoardCommand: 'npm run source:visual-board',
    sourcePreviewCommand: item.sourcePreviewCommand,
    acceptCommand: item.acceptCommand,
    acceptCommandDryRun: dryRunSourceAccept(item.acceptCommand),
  })),
  prototypeQuarantine,
  milestones,
};

await mkdir(dirname(paths.jsonOut), { recursive: true });
await writeFile(paths.jsonOut, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.markdownOut, markdown(report));

console.log(JSON.stringify({
  schema: report.schema,
  strictGoalComplete,
  nextStage: report.nextAction.stage,
  jsonOut: paths.jsonOut,
  markdownOut: paths.markdownOut,
}, null, 2));

import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const jsonPath = resolve(String(args.get('json') ?? 'public/review/content-next-action.json'));
const markdownPath = resolve(String(args.get('markdown') ?? 'public/review/content-next-action.md'));
const stageBoardPath = resolve(String(args.get('stage-board') ?? 'public/review/content-stage-board.json'));
const sourceApprovalRunwayPath = resolve(String(args.get('source-approval-runway') ?? 'public/review/source-approval-runway.json'));
const sourceCriticRegenerationPath = resolve(String(args.get('source-critic-regeneration') ?? 'public/review/source-candidates/source-critic-regeneration-queue.json'));
const sourceCriticRegenerationHealthPath = resolve(String(args.get('source-critic-regeneration-health') ?? 'public/review/source-candidates/source-critic-regeneration-health.json'));
const sourceReviewSequencerPath = resolve(String(args.get('source-review-sequencer') ?? 'public/review/source-candidates/source-review-sequencer.json'));
const sourceRegenerationWorkspacePath = resolve(String(args.get('source-regeneration-workspace') ?? 'public/review/source-candidates/source-regeneration-workspace.json'));
const visualRegenerationQueuePath = resolve(String(args.get('visual-regeneration-queue') ?? 'public/review/content-visual-regeneration-queue.json'));
const failures = [];

async function readJson(label, path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

async function readText(label, path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    failures.push(`${label}: could not read file: ${error.message}`);
    return '';
  }
}

async function fileOk(label, path, minSize = 128) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minSize) failures.push(`${label}: missing or too small`);
  } catch {
    failures.push(`${label}: missing`);
  }
}

const report = await readJson('content next action report', jsonPath);
const stageBoard = await readJson('content stage board', stageBoardPath);
const sourceApprovalRunway = await readJson('source approval runway', sourceApprovalRunwayPath);
const sourceCriticRegeneration = await readJson('source critic regeneration queue', sourceCriticRegenerationPath);
const sourceCriticRegenerationHealth = await readJson('source critic regeneration health', sourceCriticRegenerationHealthPath);
const sourceReviewSequencer = await readJson('source review sequencer', sourceReviewSequencerPath);
const sourceRegenerationWorkspace = await readJson('source regeneration workspace', sourceRegenerationWorkspacePath);
const visualRegenerationQueue = await readJson('visual regeneration queue', visualRegenerationQueuePath);
const markdown = await readText('content next action markdown', markdownPath);
await fileOk('content next action markdown', markdownPath, 512);

if (report?.schema !== 'water9/content-next-action@1') failures.push(`unexpected report schema ${report?.schema ?? 'missing'}`);
if (stageBoard?.schema !== 'water9/content-stage-board@1') failures.push(`unexpected stage board schema ${stageBoard?.schema ?? 'missing'}`);
if (sourceApprovalRunway?.schema !== 'water9/source-approval-runway@1') failures.push(`unexpected source approval runway schema ${sourceApprovalRunway?.schema ?? 'missing'}`);
if (sourceCriticRegeneration?.schema !== 'water9/source-critic-regeneration-queue@1') failures.push(`unexpected source critic regeneration schema ${sourceCriticRegeneration?.schema ?? 'missing'}`);
if (sourceCriticRegenerationHealth?.schema !== 'water9/source-critic-regeneration-health@1') failures.push(`unexpected source critic regeneration health schema ${sourceCriticRegenerationHealth?.schema ?? 'missing'}`);
if (sourceReviewSequencer?.schema !== 'water9/source-review-sequencer@1') failures.push(`unexpected source review sequencer schema ${sourceReviewSequencer?.schema ?? 'missing'}`);
if (sourceRegenerationWorkspace?.schema !== 'water9/source-regeneration-workspace@1') failures.push(`unexpected source regeneration workspace schema ${sourceRegenerationWorkspace?.schema ?? 'missing'}`);
if (visualRegenerationQueue?.schema !== 'water9/content-visual-regeneration-queue@1') failures.push(`unexpected visual regeneration queue schema ${visualRegenerationQueue?.schema ?? 'missing'}`);
if ((report?.summary?.targetThreats ?? 0) !== (stageBoard?.summary?.targetThreats ?? 0)) failures.push('targetThreats mismatch with stage board');
if ((report?.summary?.acceptedThreats ?? -1) !== (stageBoard?.summary?.acceptedThreats ?? -2)) failures.push('acceptedThreats mismatch with stage board');
if (report?.summary?.nextBottleneck !== stageBoard?.summary?.nextBottleneck) failures.push('nextBottleneck mismatch with stage board');
if ((report?.summary?.sourceReviewReadyForHumanReview ?? -1) !== (sourceApprovalRunway?.summary?.readyForHumanReview ?? -2)) failures.push('sourceReviewReadyForHumanReview mismatch with approval runway');
if ((report?.summary?.sourceReviewMechanicallyReadyForHumanReview ?? -1) !== (sourceApprovalRunway?.summary?.mechanicallyReadyForHumanReview ?? -2)) failures.push('sourceReviewMechanicallyReadyForHumanReview mismatch with approval runway');
if ((report?.summary?.sourceReviewCriticRegenerationRequired ?? -1) !== (sourceApprovalRunway?.summary?.criticRegenerationRequired ?? -2)) failures.push('sourceReviewCriticRegenerationRequired mismatch with approval runway');
if ((report?.summary?.sourceCriticRegenerationNextTarget ?? null) !== (sourceCriticRegeneration?.summary?.nextCandidateId ?? null)) failures.push('sourceCriticRegenerationNextTarget mismatch with critic regeneration queue');
if ((report?.summary?.sourceCriticRegenerationNextTargetSpecies ?? null) !== (sourceCriticRegeneration?.summary?.nextCandidateSpecies ?? null)) failures.push('sourceCriticRegenerationNextTargetSpecies mismatch with critic regeneration queue');
if ((report?.summary?.sourceCriticRegenerationHealthNextStatus ?? null) !== (sourceCriticRegenerationHealth?.summary?.nextActionStatus ?? null)) failures.push('sourceCriticRegenerationHealthNextStatus mismatch with health report');
if ((report?.summary?.sourceCriticRegenerationHealthDistinctReady ?? null) !== (sourceCriticRegenerationHealth?.summary?.distinctReplacementReady ?? null)) failures.push('sourceCriticRegenerationHealthDistinctReady mismatch with health report');
if ((report?.summary?.sourceCriticRegenerationHealthNoop ?? null) !== (sourceCriticRegenerationHealth?.summary?.validNoopReplacements ?? null)) failures.push('sourceCriticRegenerationHealthNoop mismatch with health report');
if ((report?.summary?.sourceCriticRegenerationHealthMissing ?? null) !== (sourceCriticRegenerationHealth?.summary?.missingReplacements ?? null)) failures.push('sourceCriticRegenerationHealthMissing mismatch with health report');
if ((report?.summary?.sourceReviewSequencerNextLane ?? null) !== (sourceReviewSequencer?.summary?.nextLane ?? null)) failures.push('sourceReviewSequencerNextLane mismatch with sequencer');
if ((report?.summary?.sourceReviewSequencerNextTarget ?? null) !== (sourceReviewSequencer?.summary?.nextTarget ?? null)) failures.push('sourceReviewSequencerNextTarget mismatch with sequencer');
if ((report?.summary?.sourceReviewSequencerApprovalReady ?? null) !== (sourceReviewSequencer?.summary?.approvalReady ?? null)) failures.push('sourceReviewSequencerApprovalReady mismatch with sequencer');
if ((report?.summary?.sourceReviewSequencerCriticRegenerationRequired ?? null) !== (sourceReviewSequencer?.summary?.criticRegenerationRequired ?? null)) failures.push('sourceReviewSequencerCriticRegenerationRequired mismatch with sequencer');
if ((report?.summary?.sourceReviewSequencerDistinctReady ?? null) !== (sourceReviewSequencer?.summary?.distinctReplacementReady ?? null)) failures.push('sourceReviewSequencerDistinctReady mismatch with sequencer');
if ((report?.summary?.sourceReviewSequencerNoop ?? null) !== (sourceReviewSequencer?.summary?.validNoopReplacements ?? null)) failures.push('sourceReviewSequencerNoop mismatch with sequencer');
if ((report?.summary?.sourceReviewSequencerMissing ?? null) !== (sourceReviewSequencer?.summary?.missingReplacements ?? null)) failures.push('sourceReviewSequencerMissing mismatch with sequencer');
if ((report?.summary?.sourceRegenerationWorkspaceTarget ?? null) !== (sourceRegenerationWorkspace?.target?.id ?? null)) failures.push('sourceRegenerationWorkspaceTarget mismatch with workspace');
if ((report?.summary?.sourceRegenerationWorkspaceLane ?? null) !== (sourceRegenerationWorkspace?.target?.lane ?? null)) failures.push('sourceRegenerationWorkspaceLane mismatch with workspace');
if ((report?.summary?.sourceRegenerationWorkspaceHealthStatus ?? null) !== (sourceRegenerationWorkspace?.target?.healthStatus ?? null)) failures.push('sourceRegenerationWorkspaceHealthStatus mismatch with workspace');
if (Boolean(report?.summary?.sourceRegenerationWorkspaceNoop) !== Boolean(sourceRegenerationWorkspace?.target?.replacementMatchesCurrentSource)) failures.push('sourceRegenerationWorkspaceNoop mismatch with workspace');
if (Boolean(report?.summary?.sourceRegenerationWorkspaceDistinctReady) !== Boolean(sourceRegenerationWorkspace?.target?.distinctReplacementReady)) failures.push('sourceRegenerationWorkspaceDistinctReady mismatch with workspace');
if ((report?.summary?.visualRegenerationItems ?? null) !== (visualRegenerationQueue?.summary?.items ?? null)) failures.push('visualRegenerationItems mismatch with queue');
if ((report?.summary?.visualRegenerationBlockingItems ?? null) !== (visualRegenerationQueue?.summary?.blockingItems ?? null)) failures.push('visualRegenerationBlockingItems mismatch with queue');
if ((report?.summary?.visualRegenerationNextTarget ?? null) !== (visualRegenerationQueue?.summary?.nextTargetId ?? null)) failures.push('visualRegenerationNextTarget mismatch with queue');
if ((report?.summary?.visualRegenerationStrictGateCredit ?? null) !== (visualRegenerationQueue?.summary?.countsTowardStrictGate ?? null)) failures.push('visualRegenerationStrictGateCredit mismatch with queue');

const topTargets = Array.isArray(report?.topTargets) ? report.topTargets : [];
if (!topTargets.length && (stageBoard?.summary?.acceptedThreats ?? 0) < (stageBoard?.summary?.targetThreats ?? 20)) {
  failures.push('topTargets must not be empty while content gate is incomplete');
}
const nextAction = report?.nextAction ?? {};
if (!nextAction.kind) failures.push('nextAction missing kind');
if (!nextAction.title) failures.push('nextAction missing title');
if (!Array.isArray(nextAction.commands) || nextAction.commands.length < 1) failures.push('nextAction commands are missing');
if (!Array.isArray(nextAction.acceptanceCriteria) || nextAction.acceptanceCriteria.length < 1) failures.push('nextAction acceptance criteria are missing');
const parallelSourceReviewTarget = report?.parallelActions?.sourceReview?.targetId ?? null;
const approvalReadySourceReviewTarget = sourceApprovalRunway?.recommended?.id ?? (sourceApprovalRunway?.items ?? []).find((item) => item.readyForHumanReview === true && item.humanApproved !== true)?.id ?? null;
const firstTopIsSourceReview = ['source-review-needed', 'prototype-needs-approved-source'].includes(topTargets[0]?.stage);
if (topTargets[0] && nextAction.targetId !== topTargets[0].id) {
  if (!(firstTopIsSourceReview && nextAction.kind === 'source-review' && nextAction.targetId === parallelSourceReviewTarget)) {
    failures.push('nextAction target must match first top target or the recommended parallel source-review target');
  }
}
if (topTargets[0] && nextAction.stage !== topTargets[0].stage) failures.push('nextAction stage must match first top target stage');
if (topTargets[0] && !nextAction.gateTruth) failures.push('nextAction missing gateTruth');
if (nextAction.gateTruth?.countsTowardGate === true && nextAction.gateTruth?.accepted !== true) {
  failures.push('gateTruth countsTowardGate can only be true for accepted content');
}
if (topTargets[0] && nextAction.gateTruth?.countsTowardGate !== true && !String(nextAction.gateTruth?.reviewWarning ?? '').includes('Not accepted')) {
  failures.push('incomplete next action must carry an explicit not-accepted warning');
}

for (const command of nextAction.commands ?? []) {
  if (!markdown.includes(command)) failures.push(`markdown missing next command: ${command}`);
}
if (nextAction.gateTruth?.reviewWarning && !markdown.includes(nextAction.gateTruth.reviewWarning)) {
  failures.push('markdown missing gate truth warning');
}
for (const target of topTargets) {
  if (!markdown.includes(target.id)) failures.push(`markdown missing top target ${target.id}`);
}
for (const required of ['Water9 Content Next Action', '## Next Action', '### Commands', '### Acceptance Criteria', '## Top Queue']) {
  if (!markdown.includes(required)) failures.push(`markdown missing section ${required}`);
}
if (nextAction.kind === 'source-image' && !nextAction.commands.some((command) => command.includes('source:inbox') || command.includes('source:recover-inline') || command.includes('source:ingest'))) {
  failures.push('source-image next action must include inbox/recovery/ingest commands');
}
if (nextAction.kind === 'source-image' && (nextAction.missingArtifactAttempts ?? 0) >= 3) {
  const expectedCapture = `npm run source:inbox-capture -- --id ${nextAction.targetId} --open`;
  const expectedRecoverSaved = `npm run source:recover-inline -- --id ${nextAction.targetId} --image <saved-image-path> --copy --validate`;
  const expectedCaptureUrl = `http://127.0.0.1:5188/?id=${encodeURIComponent(nextAction.targetId)}`;
  const expectedInboxTarget = `tools/source-inbox/${nextAction.targetId}.png`;
  const expectedAlternateInboxTarget = `tools/source-inbox/fauna-${nextAction.targetId}-whole-source.png`;
  const expectedOutput = `public/assets/generated/fauna-${nextAction.targetId}-whole-source.png`;
  if (nextAction.captureFirst !== true) failures.push('repeated missing-artifact source target must be marked captureFirst');
  if (!String(nextAction.captureReason ?? '').includes('missing-artifact attempts')) failures.push('capture-first next action missing reason');
  if (nextAction.recommendedFirst !== expectedCapture) failures.push(`capture-first recommendedFirst must use target-aware capture: ${nextAction.recommendedFirst}`);
  if (nextAction.recommendedFallback !== expectedRecoverSaved) failures.push(`capture-first recommendedFallback must be explicit saved-file recovery: ${nextAction.recommendedFallback}`);
  if (nextAction.commands?.[0] !== expectedCapture) failures.push(`capture-first first command must be ${expectedCapture}`);
  if ((nextAction.commands ?? []).includes('npm run source:inbox-capture')) failures.push('capture-first commands must not use generic source:inbox-capture');
  if (nextAction.capture?.captureCommand !== expectedCapture) failures.push('capture-first capture.captureCommand must be target-aware');
  if (nextAction.capture?.captureUrl !== expectedCaptureUrl) failures.push(`capture-first capture.captureUrl must be ${expectedCaptureUrl}`);
  if (nextAction.capture?.inboxTarget !== expectedInboxTarget) failures.push(`capture-first capture.inboxTarget must be ${expectedInboxTarget}`);
  if (nextAction.capture?.alternateInboxTarget !== expectedAlternateInboxTarget) failures.push(`capture-first capture.alternateInboxTarget must be ${expectedAlternateInboxTarget}`);
  if (nextAction.capture?.expectedOutput !== expectedOutput) failures.push(`capture-first capture.expectedOutput must be ${expectedOutput}`);
  if (!String(nextAction.capture?.promptFile ?? '').includes(`${nextAction.targetId}`)) failures.push('capture-first capture.promptFile must be target-specific');
  if (nextAction.capture?.recoveryCommand !== expectedRecoverSaved) failures.push('capture-first capture.recoveryCommand must match saved-file recovery');
  for (const required of [
    'Capture first',
    '### Capture Target',
    'Capture UI',
    'Inbox target',
    'Expected output',
    'Prompt file',
    'Missing artifact attempts',
    'Recommended first',
    expectedCapture,
    expectedRecoverSaved,
    expectedCaptureUrl,
    expectedInboxTarget,
    expectedAlternateInboxTarget,
    expectedOutput,
    nextAction.capture?.promptFile,
  ]) {
    if (!markdown.includes(required)) failures.push(`markdown missing capture-first detail ${required}`);
  }
}
if (nextAction.kind === 'source-review') {
  for (const expected of [
    'npm run source:approval-runway',
    'npm run source:approval-runway-check',
    'npm run source:approval-runway:preview',
    'npm run source:approval-session',
    'npm run source:approval-session-check',
    'npm run source:approval-session:serve-smoke',
    'npm run source:approval-marathon',
    'npm run source:approval-marathon-check',
    'npm run source:approval-marathon-workspace-smoke',
    'npm run source:approval-marathon-full-batch-smoke',
    'npm run content:synthetic-decision-guards-check',
    'npm run source:visual-board',
    'npm run source:visual-board-check',
    'npm run source:cohesion-decisions',
    'npm run source:cohesion-decisions-check',
    'npm run content:review-session',
    'npm run content:review-session-check',
    'npm run content:review-session:serve-smoke',
    'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
    `npm run sandbox:preview -- --id source-${nextAction.targetId} --with diver --serve --open --visual`,
    `npm run sandbox:preview -- --id ${nextAction.targetId} --with diver --serve --open --visual`,
  ]) {
    if (!(nextAction.commands ?? []).includes(expected)) failures.push(`source-review nextAction commands missing ${expected}`);
    if (!markdown.includes(expected)) failures.push(`markdown missing source-review nextAction command ${expected}`);
  }
  if (!(nextAction.acceptanceCriteria ?? []).some((criterion) => String(criterion).includes('source approval session'))) {
    failures.push('source-review nextAction acceptance criteria must mention source approval session');
  }
  if (!(nextAction.acceptanceCriteria ?? []).some((criterion) => String(criterion).includes('source approval runway'))) {
    failures.push('source-review nextAction acceptance criteria must mention source approval runway');
  }
  if (!(nextAction.acceptanceCriteria ?? []).some((criterion) => String(criterion).includes('batch decision workspace'))) {
    failures.push('source-review nextAction acceptance criteria must mention batch decision workspace');
  }
  if (!(nextAction.acceptanceCriteria ?? []).some((criterion) => String(criterion).includes('full-batch dry-run guard'))) {
    failures.push('source-review nextAction acceptance criteria must mention full-batch dry-run guard');
  }
  if (!(nextAction.acceptanceCriteria ?? []).some((criterion) => String(criterion).includes('reviewed-only source decisions'))) {
    failures.push('source-review nextAction acceptance criteria must mention reviewed-only source decisions');
  }
  if (!(nextAction.acceptanceCriteria ?? []).some((criterion) => String(criterion).includes('live diver-paired'))) {
    failures.push('source-review nextAction acceptance criteria must mention live diver-paired previews');
  }
  for (const command of (nextAction.commands ?? []).filter((entry) => String(entry).includes('npm run source:accept'))) {
    if (!String(command).includes('--dry-run')) failures.push('source-review nextAction source:accept command must be dry-run only');
    if (!String(command).includes('--source-visual-board public/review/source-visual-board.json')) failures.push('source-review nextAction source:accept command must require source visual board evidence');
  }
}
if ((report?.summary?.sourceReviewReadyForHumanReview ?? 0) > 0) {
  const sourceReviewSequencerAction = report?.parallelActions?.sourceReviewSequencer;
  const expectedSequencerTarget = sourceReviewSequencer?.summary?.nextTarget ?? null;
  const expectedSequencerItem = expectedSequencerTarget
    ? (sourceReviewSequencer?.items ?? []).find((item) => item.id === expectedSequencerTarget) ?? null
    : null;
  if (!sourceReviewSequencerAction) failures.push('ready source reviews must expose a parallel sourceReviewSequencer action');
  if (sourceReviewSequencerAction && expectedSequencerItem) {
    if (sourceReviewSequencerAction.kind !== 'source-review-sequencer') failures.push(`parallel sourceReviewSequencer kind mismatch: ${sourceReviewSequencerAction.kind}`);
    if (sourceReviewSequencerAction.targetId !== expectedSequencerItem.id) failures.push(`parallel sourceReviewSequencer target must be ${expectedSequencerItem.id}`);
    if (sourceReviewSequencerAction.lane !== expectedSequencerItem.lane) failures.push('parallel sourceReviewSequencer lane mismatch');
    if (sourceReviewSequencerAction.status !== expectedSequencerItem.status) failures.push('parallel sourceReviewSequencer status mismatch');
    if (sourceReviewSequencerAction.recommendedFirst !== (expectedSequencerItem.recommendedFirst ?? expectedSequencerItem.nextCommands?.[0])) failures.push('parallel sourceReviewSequencer recommendedFirst mismatch');
    for (const expectedCommand of [
      'npm run source:review-sequencer',
      'npm run source:review-sequencer-check',
      'npm run source:review-sequencer:serve-smoke',
      ...(expectedSequencerItem.nextCommands ?? []),
    ]) {
      if (!(sourceReviewSequencerAction.commands ?? []).includes(expectedCommand)) failures.push(`parallel sourceReviewSequencer commands missing ${expectedCommand}`);
      if (!markdown.includes(expectedCommand)) failures.push(`markdown missing parallel sourceReviewSequencer command ${expectedCommand}`);
    }
    if (expectedSequencerItem.lane !== 'regenerate-distinct-ready') {
      for (const command of sourceReviewSequencerAction.commands ?? []) {
        if (String(command).includes('source:ingest') && String(command).includes('--overwrite')) failures.push('parallel sourceReviewSequencer must not expose overwrite ingest outside distinct-ready lane');
      }
    }
    for (const [key, expected] of Object.entries({
      sequencer: '/review/source-candidates/source-review-sequencer.html',
      approvalRunway: '/review/source-approval-runway.html',
      contentReviewSession: '/review/content-review-session.html',
    })) {
      if (sourceReviewSequencerAction.evidenceLinks?.[key] !== expected) failures.push(`parallel sourceReviewSequencer evidenceLinks.${key} must be ${expected}`);
    }
    if (!sourceReviewSequencerAction.evidenceLinks?.sourcePreview) failures.push('parallel sourceReviewSequencer sourcePreview link missing');
    for (const key of ['totalCandidates', 'approvalReady', 'criticRegenerationRequired', 'distinctReplacementReady', 'validNoopReplacements', 'missingReplacements', 'invalidReplacements', 'countsTowardGate']) {
      if (sourceReviewSequencerAction.evidenceSummary?.[key] == null) failures.push(`parallel sourceReviewSequencer evidenceSummary.${key} missing`);
    }
    for (const required of [
      '## Parallel Source Review Sequencer',
      '### Source Review Sequencer Evidence',
      '### Source Review Sequencer Counts',
      '### Source Review Sequencer Command Boundary',
      '### Source Review Sequencer Commands',
      '### Source Review Sequencer Acceptance Criteria',
      '/review/source-candidates/source-review-sequencer.html',
      expectedSequencerItem.id,
      expectedSequencerItem.lane,
    ]) {
      if (!markdown.includes(required)) failures.push(`markdown missing parallel sourceReviewSequencer detail ${required}`);
    }
  }
  const sourceRegenerationWorkspaceAction = report?.parallelActions?.sourceRegenerationWorkspace;
  const expectedWorkspaceTarget = sourceRegenerationWorkspace?.target ?? null;
  if (!sourceRegenerationWorkspaceAction) failures.push('ready source reviews must expose a parallel sourceRegenerationWorkspace action');
  if (sourceRegenerationWorkspaceAction && expectedWorkspaceTarget?.id) {
    if (sourceRegenerationWorkspaceAction.kind !== 'source-regeneration-workspace') failures.push(`parallel sourceRegenerationWorkspace kind mismatch: ${sourceRegenerationWorkspaceAction.kind}`);
    if (sourceRegenerationWorkspaceAction.targetId !== expectedWorkspaceTarget.id) failures.push(`parallel sourceRegenerationWorkspace target must be ${expectedWorkspaceTarget.id}`);
    if (sourceRegenerationWorkspaceAction.lane !== expectedWorkspaceTarget.lane) failures.push('parallel sourceRegenerationWorkspace lane mismatch');
    if (sourceRegenerationWorkspaceAction.status !== expectedWorkspaceTarget.status) failures.push('parallel sourceRegenerationWorkspace status mismatch');
    if (sourceRegenerationWorkspaceAction.healthStatus !== expectedWorkspaceTarget.healthStatus) failures.push('parallel sourceRegenerationWorkspace health status mismatch');
    if (Boolean(sourceRegenerationWorkspaceAction.replacementMatchesCurrentSource) !== Boolean(expectedWorkspaceTarget.replacementMatchesCurrentSource)) failures.push('parallel sourceRegenerationWorkspace no-op flag mismatch');
    if (Boolean(sourceRegenerationWorkspaceAction.distinctReplacementReady) !== Boolean(expectedWorkspaceTarget.distinctReplacementReady)) failures.push('parallel sourceRegenerationWorkspace distinct-ready flag mismatch');
    for (const expectedCommand of [
      'npm run source:regeneration-workspace',
      'npm run source:regeneration-workspace-check',
      'npm run source:regeneration-workspace:serve-smoke',
      ...(expectedWorkspaceTarget.commands?.safeNext ?? []),
    ]) {
      if (!(sourceRegenerationWorkspaceAction.commands ?? []).includes(expectedCommand)) failures.push(`parallel sourceRegenerationWorkspace commands missing ${expectedCommand}`);
      if (!markdown.includes(expectedCommand)) failures.push(`markdown missing parallel sourceRegenerationWorkspace command ${expectedCommand}`);
    }
    if (expectedWorkspaceTarget.lane !== 'regenerate-distinct-ready') {
      for (const command of sourceRegenerationWorkspaceAction.commands ?? []) {
        if (String(command).includes('source:ingest') && String(command).includes('--overwrite')) failures.push('parallel sourceRegenerationWorkspace must not expose overwrite ingest outside distinct-ready lane');
      }
    }
    for (const [key, expected] of Object.entries({
      workspace: '/review/source-candidates/source-regeneration-workspace.html',
      targetPacket: '/review/source-candidates/source-review-target-packet.html',
      sequencer: '/review/source-candidates/source-review-sequencer.html',
      criticRegenerationHealth: '/review/source-candidates/source-critic-regeneration-health.html',
    })) {
      if (sourceRegenerationWorkspaceAction.evidenceLinks?.[key] !== expected) failures.push(`parallel sourceRegenerationWorkspace evidenceLinks.${key} must be ${expected}`);
    }
    for (const key of ['sourcePath', 'sourceSha256', 'inboxPath', 'inboxSha256', 'validNoopReplacements', 'missingReplacements', 'invalidReplacements']) {
      if (sourceRegenerationWorkspaceAction.evidenceSummary?.[key] == null) failures.push(`parallel sourceRegenerationWorkspace evidenceSummary.${key} missing`);
    }
    if (sourceRegenerationWorkspaceAction.evidenceSummary?.sourceSha256 !== expectedWorkspaceTarget.source?.sha256) failures.push('parallel sourceRegenerationWorkspace source sha mismatch');
    if (sourceRegenerationWorkspaceAction.evidenceSummary?.inboxSha256 !== expectedWorkspaceTarget.inbox?.sha256) failures.push('parallel sourceRegenerationWorkspace inbox sha mismatch');
    for (const required of [
      '## Parallel: Source Regeneration Workspace',
      '### Regeneration Workspace Evidence',
      '### Regeneration Workspace Fingerprints',
      '### Regeneration Workspace Commands',
      '### Regeneration Workspace Acceptance Criteria',
      '/review/source-candidates/source-regeneration-workspace.html',
      expectedWorkspaceTarget.id,
      expectedWorkspaceTarget.lane,
      expectedWorkspaceTarget.source?.sha256,
      expectedWorkspaceTarget.inbox?.sha256,
    ]) {
      if (required && !markdown.includes(required)) failures.push(`markdown missing parallel sourceRegenerationWorkspace detail ${required}`);
    }
  }
  const sourceReview = report?.parallelActions?.sourceReview;
  if (!sourceReview) failures.push('ready source reviews must be exposed as a parallel sourceReview action');
  if (sourceReview) {
    if (sourceReview.kind !== 'source-review') failures.push(`parallel sourceReview kind mismatch: ${sourceReview.kind}`);
    if (!sourceReview.targetId) failures.push('parallel sourceReview missing targetId');
    if (approvalReadySourceReviewTarget && sourceReview.targetId !== approvalReadySourceReviewTarget) failures.push(`parallel sourceReview target must be first approval-ready runway target ${approvalReadySourceReviewTarget}`);
    if (sourceReview.status !== 'ready-for-human-review') failures.push(`parallel sourceReview status should be ready-for-human-review: ${sourceReview.status}`);
    if (sourceReview.recommendedFirst !== 'npm run source:approval-session:serve-smoke') failures.push(`parallel sourceReview recommendedFirst mismatch: ${sourceReview.recommendedFirst}`);
    if (!String(sourceReview.acceptCommand ?? '').includes(`npm run source:accept -- --id ${sourceReview.targetId}`)) failures.push('parallel sourceReview acceptCommand must be target-aware');
    if (!String(sourceReview.acceptCommandDryRun ?? '').includes(`npm run source:accept -- --id ${sourceReview.targetId}`) || !String(sourceReview.acceptCommandDryRun ?? '').includes('--dry-run')) failures.push('parallel sourceReview acceptCommandDryRun must be target-aware dry-run');
    if (!String(sourceReview.acceptCommandDryRun ?? '').includes('--source-visual-board public/review/source-visual-board.json')) failures.push('parallel sourceReview acceptCommandDryRun must require source visual board evidence');
    if (!String(sourceReview.rejectCommand ?? '').includes(`npm run source:accept -- --id ${sourceReview.targetId} --status rejected`)) failures.push('parallel sourceReview rejectCommand must be target-aware');
    if (!String(sourceReview.rejectCommandDryRun ?? '').includes(`npm run source:accept -- --id ${sourceReview.targetId} --status rejected`) || !String(sourceReview.rejectCommandDryRun ?? '').includes('--dry-run')) failures.push('parallel sourceReview rejectCommandDryRun must be target-aware dry-run');
    if (!String(sourceReview.rejectCommandDryRun ?? '').includes('--source-visual-board public/review/source-visual-board.json')) failures.push('parallel sourceReview rejectCommandDryRun must require source visual board evidence');
    const evidenceLinks = sourceReview.evidenceLinks ?? {};
    for (const [key, expected] of Object.entries({
      approvalRunway: '/review/source-approval-runway.html',
      approvalSession: '/review/source-candidates/source-approval-session.html',
      approvalChecklist: '/review/source-approval-checklist.json',
      visualBoard: '/review/source-visual-board.html',
      batchDecisionWorkspace: '/review/source-candidates/source-cohesion-decision-template.html',
      batchDecisionTemplate: '/review/source-candidates/source-cohesion-decision-template.json',
      contentReviewSession: '/review/content-review-session.html',
      reviewDossier: '/review/source-candidates/source-review-dossier.html',
      reviewQueue: '/review/source-candidates/quick-reviews/index.html',
      sandboxLab: `/review/sandbox/lab.html?id=source-${sourceReview.targetId}&with=diver`,
      sourceSandboxLive: `/?entity=source-${sourceReview.targetId}&companion=diver`,
      runtimeSandboxLive: `/?sandbox=${sourceReview.targetId}&companion=diver`,
    })) {
      if (evidenceLinks[key] !== expected) failures.push(`parallel sourceReview evidenceLinks.${key} must be ${expected}`);
    }
    for (const key of ['quickReview', 'source', 'keyPreview', 'sandboxScreenshot', 'planPreview', 'contractMarkdown']) {
      if (!evidenceLinks[key]) failures.push(`parallel sourceReview evidenceLinks.${key} is missing`);
    }
    const evidenceSummary = sourceReview.evidenceSummary ?? {};
    for (const key of ['approvalRunwayReady', 'visualBoardReady', 'sourceDossierReady', 'humanApproved']) {
      if (evidenceSummary[key] == null) failures.push(`parallel sourceReview evidenceSummary.${key} is missing`);
    }
    for (const requiredCommand of [
      'npm run source:approval-runway',
      'npm run source:approval-runway-check',
      'npm run source:approval-runway:preview',
      'npm run source:approval-session',
      'npm run source:approval-session-check',
      'npm run source:approval-session:serve-smoke',
      'npm run source:approval-marathon',
      'npm run source:approval-marathon-check',
      'npm run source:approval-marathon-workspace-smoke',
      'npm run source:approval-marathon-full-batch-smoke',
      'npm run content:synthetic-decision-guards-check',
      'npm run source:visual-board',
      'npm run source:visual-board-check',
      'npm run source:cohesion-decisions',
      'npm run source:cohesion-decisions-check',
      'npm run content:review-session',
      'npm run content:review-session-check',
      'npm run content:review-session:serve-smoke',
      'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
      'npm run source:review-dossier',
      'npm run source:review-dossier-check',
      `npm run sandbox:preview -- --id source-${sourceReview.targetId} --with diver --serve --open --visual`,
      `npm run sandbox:preview -- --id ${sourceReview.targetId} --with diver --serve --open --visual`,
    ]) {
      if (!(sourceReview.commands ?? []).includes(requiredCommand)) failures.push(`parallel sourceReview commands missing ${requiredCommand}`);
    }
    if (!(sourceReview.acceptanceCriteria ?? []).some((criterion) => String(criterion).includes('sandbox lab'))) {
      failures.push('parallel sourceReview acceptance criteria must mention sandbox lab review');
    }
    if (!(sourceReview.acceptanceCriteria ?? []).some((criterion) => String(criterion).includes('batch decision workspace'))) {
      failures.push('parallel sourceReview acceptance criteria must mention batch decision workspace');
    }
    if (!(sourceReview.acceptanceCriteria ?? []).some((criterion) => String(criterion).includes('full-batch dry-run guard'))) {
      failures.push('parallel sourceReview acceptance criteria must mention full-batch dry-run guard');
    }
    if (!(sourceReview.acceptanceCriteria ?? []).some((criterion) => String(criterion).includes('reviewed-only source decisions'))) {
      failures.push('parallel sourceReview acceptance criteria must mention reviewed-only source decisions');
    }
    for (const command of sourceReview.commands ?? []) {
      if (!markdown.includes(command)) failures.push(`markdown missing parallel sourceReview command: ${command}`);
      if (String(command).includes('npm run source:accept') && !String(command).includes('--dry-run')) failures.push('parallel sourceReview markdown decision commands must be dry-run only');
      if (String(command).includes('npm run source:accept') && !String(command).includes('--source-visual-board public/review/source-visual-board.json')) failures.push('parallel sourceReview markdown decision commands must require source visual board evidence');
    }
    for (const required of [
      '## Parallel Source Review',
      '### Source Review Evidence',
      '### Source Review Counts',
      '### Source Review Command Boundary',
      '### Source Review Commands',
      '### Source Review Acceptance Criteria',
      '/review/source-approval-runway.html',
      '/review/source-visual-board.html',
      '/review/source-candidates/source-cohesion-decision-template.html',
      '/review/source-candidates/source-cohesion-decision-template.json',
      '/review/content-review-session.html',
      '/review/source-candidates/source-review-dossier.html',
      `/review/sandbox/lab.html?id=source-${sourceReview.targetId}&with=diver`,
      `/?entity=source-${sourceReview.targetId}&companion=diver`,
      `/?sandbox=${sourceReview.targetId}&companion=diver`,
      sourceReview.targetId,
      sourceReview.acceptCommandDryRun,
    ]) {
      if (!markdown.includes(required)) failures.push(`markdown missing parallel sourceReview detail ${required}`);
    }
  }
}
if ((sourceCriticRegeneration?.summary?.regenerateCandidates ?? 0) > 0) {
  const criticRegeneration = report?.parallelActions?.criticRegeneration;
  const expected = sourceCriticRegeneration?.nextCandidate ?? null;
  const expectedHealth = expected
    ? (sourceCriticRegenerationHealth?.items ?? []).find((item) => item.id === expected.id) ?? null
    : null;
  if (!criticRegeneration) failures.push('critic regeneration queue must be exposed as a parallel criticRegeneration action');
  if (criticRegeneration && expected) {
    if (criticRegeneration.kind !== 'source-critic-regeneration') failures.push(`parallel criticRegeneration kind mismatch: ${criticRegeneration.kind}`);
    if (criticRegeneration.targetId !== expected.id) failures.push(`parallel criticRegeneration target must be ${expected.id}`);
    if (criticRegeneration.status !== (expectedHealth?.status ?? 'unknown')) failures.push(`parallel criticRegeneration status mismatch: ${criticRegeneration.status}`);
    if (criticRegeneration.promptFile !== expected.promptFile) failures.push('parallel criticRegeneration promptFile mismatch');
    const expectedCommands = expectedHealth?.nextCommands?.length ? expectedHealth.nextCommands : [
      expected.commands?.openPrompt,
      expected.commands?.markImagegen,
      expected.commands?.checkImagegen,
      expected.commands?.ingestImagegen,
      expected.commands?.captureManual,
      expected.commands?.recoverSavedImage,
      expected.commands?.generateOpenAiDryRun,
      expected.commands?.generateOpenAiApply,
    ].filter(Boolean);
    if (criticRegeneration.recommendedFirst !== expectedCommands[0]) failures.push('parallel criticRegeneration recommendedFirst must match health next command');
    for (const [key, expectedLink] of Object.entries({
      queue: '/review/source-candidates/source-critic-regeneration-queue.html#next-regeneration-target',
      health: '/review/source-candidates/source-critic-regeneration-health.html',
      sourceCriticBoard: expected.links?.sourceCriticBoard,
      sourceReplaceRunway: expected.links?.sourceReplaceRunway,
      quickReview: expected.links?.quickReview,
      source: expected.links?.source,
      sandboxPreview: expected.links?.sandboxPreview,
      planPreview: expected.links?.planPreview,
      liveSourceSandbox: expected.links?.liveSourceSandbox,
    })) {
      if (expectedLink && criticRegeneration.evidenceLinks?.[key] !== expectedLink) failures.push(`parallel criticRegeneration evidenceLinks.${key} mismatch`);
    }
    for (const key of ['regenerateCandidates', 'lanes', 'promptFiles']) {
      if (criticRegeneration.evidenceSummary?.[key] == null) failures.push(`parallel criticRegeneration evidenceSummary.${key} is missing`);
    }
    for (const key of ['distinctReplacementReady', 'validNoopReplacements', 'missingReplacements', 'invalidReplacements', 'nextActionStatus']) {
      if (criticRegeneration.evidenceSummary?.[key] == null) failures.push(`parallel criticRegeneration evidenceSummary.${key} is missing`);
    }
    if (expectedHealth?.status !== 'distinct-replacement-ready' && (criticRegeneration.commands ?? []).some((command) => String(command).includes('source:ingest') && String(command).includes('--overwrite'))) {
      failures.push('parallel criticRegeneration must not recommend overwrite ingest before a distinct replacement is ready');
    }
    if (expectedHealth?.status === 'distinct-replacement-ready' && !(criticRegeneration.commands ?? []).some((command) => String(command).includes('--overwrite --dry-run'))) {
      failures.push('parallel criticRegeneration must recommend dry-run overwrite when distinct replacement is ready');
    }
    for (const requiredCommand of expectedCommands) {
      if (!(criticRegeneration.commands ?? []).includes(requiredCommand)) failures.push(`parallel criticRegeneration commands missing ${requiredCommand}`);
      if (!markdown.includes(requiredCommand)) failures.push(`markdown missing parallel criticRegeneration command ${requiredCommand}`);
    }
    for (const required of [
      '## Parallel Critic Regeneration',
      '### Critic Regeneration Evidence',
      '### Critic Regeneration Counts',
      '### Critic Regeneration Command Boundary',
      '### Critic Regeneration Commands',
      '### Critic Regeneration Acceptance Criteria',
      '/review/source-candidates/source-critic-regeneration-queue.html#next-regeneration-target',
      '/review/source-candidates/source-critic-regeneration-health.html',
      expected.id,
    ]) {
      if (!markdown.includes(required)) failures.push(`markdown missing parallel criticRegeneration detail ${required}`);
    }
    if (!(criticRegeneration.acceptanceCriteria ?? []).some((criterion) => String(criterion).includes('returns to human source approval'))) {
      failures.push('parallel criticRegeneration acceptance criteria must mention returning to human source approval');
    }
  }
}
if ((visualRegenerationQueue?.summary?.items ?? 0) > 0) {
  const visualRegeneration = report?.parallelActions?.visualRegeneration;
  const expected = visualRegenerationQueue?.items?.[0] ?? null;
  if (!visualRegeneration) failures.push('visual regeneration queue must be exposed as a parallel visualRegeneration action');
  if (visualRegeneration && expected) {
    if (visualRegeneration.kind !== 'visual-regeneration') failures.push(`parallel visualRegeneration kind mismatch: ${visualRegeneration.kind}`);
    if (visualRegeneration.targetId !== expected.targetId) failures.push(`parallel visualRegeneration target must be ${expected.targetId}`);
    if (visualRegeneration.status !== expected.status) failures.push('parallel visualRegeneration status mismatch');
    if (visualRegeneration.severity !== expected.severity) failures.push('parallel visualRegeneration severity mismatch');
    if (visualRegeneration.promptFile !== expected.promptFile) failures.push('parallel visualRegeneration promptFile mismatch');
    if (visualRegeneration.sandboxPreviewOnly !== true) failures.push('parallel visualRegeneration must preserve preview-only status');
    if (visualRegeneration.targetGateCandidate !== false) failures.push('parallel visualRegeneration must remain outside target gate candidates');
    if (visualRegeneration.countsTowardStrictGate !== false) failures.push('parallel visualRegeneration must not count toward strict gate');
    for (const check of ['whole-creature-cohesion', 'part-continuity-cohesion', 'non-placeholder-art-direction']) {
      if (!visualRegeneration.failedChecks?.includes(check)) failures.push(`parallel visualRegeneration missing failed check ${check}`);
    }
    if (visualRegeneration.recommendedFirst !== expected.commands?.openPrompt) failures.push('parallel visualRegeneration recommendedFirst must open prompt');
    for (const [key, expectedLink] of Object.entries({
      queue: '/review/content-visual-regeneration-queue.html',
      feedbackLedger: '/review/content-visual-feedback-ledger.html',
      promptFile: expected.promptFile,
      prototypeSandbox: `/?sandbox=${expected.targetId}`,
      pairedPrototypeSandbox: `/?sandbox=${expected.targetId}&companion=diver`,
    })) {
      if (visualRegeneration.evidenceLinks?.[key] !== expectedLink) failures.push(`parallel visualRegeneration evidenceLinks.${key} mismatch`);
    }
    for (const [key, expectedValue] of Object.entries({
      items: visualRegenerationQueue.summary?.items,
      blockingItems: visualRegenerationQueue.summary?.blockingItems,
      unmappedPrototypeItems: visualRegenerationQueue.summary?.unmappedPrototypeItems,
      countsTowardStrictGate: visualRegenerationQueue.summary?.countsTowardStrictGate,
    })) {
      if (visualRegeneration.evidenceSummary?.[key] !== expectedValue) failures.push(`parallel visualRegeneration evidenceSummary.${key} mismatch`);
    }
    for (const expectedCommand of [
      expected.commands?.openPrompt,
      expected.commands?.previewPrototype,
      expected.commands?.previewWithDiver,
      expected.commands?.rebuildFeedback,
      expected.commands?.rebuildQueue,
      'npm run content:visual-regeneration:serve-smoke',
    ].filter(Boolean)) {
      if (!(visualRegeneration.commands ?? []).includes(expectedCommand)) failures.push(`parallel visualRegeneration commands missing ${expectedCommand}`);
      if (!markdown.includes(expectedCommand)) failures.push(`markdown missing parallel visualRegeneration command ${expectedCommand}`);
    }
    for (const required of [
      '## Parallel Visual Regeneration',
      '### Visual Regeneration Evidence',
      '### Visual Regeneration Counts',
      '### Visual Regeneration Failed Checks',
      '### Visual Regeneration Command Boundary',
      '### Visual Regeneration Commands',
      '### Visual Regeneration Acceptance Criteria',
      '/review/content-visual-regeneration-queue.html',
      '/review/content-visual-feedback-ledger.html',
      expected.targetId,
      expected.promptFile,
      'full-source concept stage',
    ]) {
      if (!markdown.includes(required)) failures.push(`markdown missing parallel visualRegeneration detail ${required}`);
    }
    if (!(visualRegeneration.acceptanceCriteria ?? []).some((criterion) => String(criterion).includes('pure #ff00ff magenta'))) {
      failures.push('parallel visualRegeneration acceptance criteria must mention pure magenta source regeneration');
    }
    if (!(visualRegeneration.acceptanceCriteria ?? []).some((criterion) => String(criterion).includes('zero strict-gate credit'))) {
      failures.push('parallel visualRegeneration acceptance criteria must preserve zero strict-gate credit');
    }
  }
}

const summary = {
  json: jsonPath,
  markdown: markdownPath,
  nextAction: {
    kind: nextAction.kind ?? null,
    targetId: nextAction.targetId ?? null,
    stage: nextAction.stage ?? null,
  },
  topTargets: topTargets.length,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

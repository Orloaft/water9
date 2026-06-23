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

const paths = {
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-next-action.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/content-next-action.md')),
  stageBoard: resolve(String(args.get('stage-board') ?? 'public/review/content-stage-board.json')),
  status: resolve(String(args.get('status') ?? 'tools/scratch/content-status-latest.json')),
  sourceQueue: resolve(String(args.get('source-queue') ?? 'public/review/source-candidates/source-generation-queue.json')),
  sourceSprint: resolve(String(args.get('source-sprint') ?? 'public/review/source-candidates/source-generation-sprint.json')),
  sourceInbox: resolve(String(args.get('source-inbox') ?? 'public/review/source-inbox/manifest.json')),
  sourceReviewDossier: resolve(String(args.get('source-review-dossier') ?? 'public/review/source-candidates/source-review-dossier.json')),
  sourceApprovalRunway: resolve(String(args.get('source-approval-runway') ?? 'public/review/source-approval-runway.json')),
  sourceApprovalSession: resolve(String(args.get('source-approval-session') ?? 'public/review/source-candidates/source-approval-session.json')),
  sourceVisualBoard: resolve(String(args.get('source-visual-board') ?? 'public/review/source-visual-board.json')),
  sourceCriticRegeneration: resolve(String(args.get('source-critic-regeneration') ?? 'public/review/source-candidates/source-critic-regeneration-queue.json')),
  sourceCriticRegenerationHealth: resolve(String(args.get('source-critic-regeneration-health') ?? 'public/review/source-candidates/source-critic-regeneration-health.json')),
  sourceReviewSequencer: resolve(String(args.get('source-review-sequencer') ?? 'public/review/source-candidates/source-review-sequencer.json')),
  sourceRegenerationWorkspace: resolve(String(args.get('source-regeneration-workspace') ?? 'public/review/source-candidates/source-regeneration-workspace.json')),
  visualRegenerationQueue: resolve(String(args.get('visual-regeneration-queue') ?? 'public/review/content-visual-regeneration-queue.json')),
  sourceRejections: resolve(String(args.get('source-rejections') ?? 'public/review/source-candidates/rejected-attempts.json')),
  workbench: resolve(String(args.get('workbench') ?? 'public/review/content-workbench.json')),
};

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function rejectionKind(attempt) {
  if (attempt.copiedImage) return 'visual-rejection';
  if (attempt.sourceImagegenMarker || /no (new |recoverable |accessible )?(saved |source )?(image )?file|did not create an accessible source image file|no project-bound artifact|inline/i.test(String(attempt.reason ?? ''))) {
    return 'missing-artifact';
  }
  return 'unclassified';
}

function dryRunSourceAccept(command) {
  let text = String(command ?? '').trim();
  if (!text || !text.includes('npm run source:accept')) return text;
  if ((text.includes('--source-reviewed') || text.includes('--source-rejected')) && !text.includes('--source-visual-board')) {
    text = `${text} --source-visual-board public/review/source-visual-board.json`;
  }
  return text.includes('--dry-run') ? text : `${text} --dry-run`;
}

function commandsForSourceImageTarget(target, context) {
  const missingArtifacts = context.missingArtifactsByCandidate.get(target.id) ?? [];
  const builtInIsFailing = missingArtifacts.length >= 3;
  const captureCommand = `npm run source:inbox-capture -- --id ${target.id} --open`;
  const recoverSavedFileCommand = `npm run source:recover-inline -- --id ${target.id} --image <saved-image-path> --copy --validate`;
  const recoverDataUrlCommand = `npm run source:recover-inline -- --id ${target.id} --data-url-stdin --copy --validate`;
  const recoverBase64Command = `npm run source:recover-inline -- --id ${target.id} --stdin-base64 --stdin-filename ${target.id}.png --copy --validate`;
  if (builtInIsFailing && !context.openaiApiKeyAvailable) {
    return [
      captureCommand,
      'npm run source:sprint:preview',
      `# Save/download the inline generated ${target.species} image manually into tools/source-inbox/${target.id}.png`,
      recoverSavedFileCommand,
      `# Or pipe inline image bytes directly if the client exposes them:`,
      recoverDataUrlCommand,
      recoverBase64Command,
      `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${target.id}`,
      `npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids ${target.id} --dry-run`,
      `npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids ${target.id}`,
      'npm run source:check',
      'npm run source:gallery',
    ];
  }
  if (builtInIsFailing && context.openaiApiKeyAvailable) {
    return [
      'npm run source:imagegen-health',
      '# Built-in handoff is repeatedly not recoverable. Explicitly choose CLI fallback before using it.',
      `npm run source:next-prompt -- --id ${target.id}`,
      `npm run source:ingest -- --id ${target.id} --image <cli-generated-image-path> --copy`,
      'npm run source:check',
      'npm run source:gallery',
    ];
  }
  return target.nextCommands ?? [];
}

function sourceImageCaptureDetails(target, context) {
  if (!target?.id) return null;
  const queueItem = context.sourceQueueById?.get(target.id) ?? {};
  const inboxTarget = `tools/source-inbox/${target.id}.png`;
  return {
    captureCommand: `npm run source:inbox-capture -- --id ${target.id} --open`,
    captureUrl: `http://127.0.0.1:5188/?id=${encodeURIComponent(target.id)}`,
    inboxTarget,
    alternateInboxTarget: `tools/source-inbox/fauna-${target.id}-whole-source.png`,
    expectedOutput: queueItem.expectedOutput ?? `public/assets/generated/fauna-${target.id}-whole-source.png`,
    promptFile: queueItem.promptFile ?? null,
    recoveryCommand: `npm run source:recover-inline -- --id ${target.id} --image <saved-image-path> --copy --validate`,
    recoveryDataUrlCommand: `npm run source:recover-inline -- --id ${target.id} --data-url-stdin --copy --validate`,
    recoveryBase64Command: `npm run source:recover-inline -- --id ${target.id} --stdin-base64 --stdin-filename ${target.id}.png --copy --validate`,
  };
}

function actionForTarget(target, context) {
  const gateTruth = target
    ? {
      accepted: Boolean(target.accepted),
      countsTowardGate: Boolean(target.accepted),
      reviewWarning: target.accepted
        ? null
        : 'Not accepted: this target is not production content and cannot count toward the 20-threat goal until source review, rig evidence, paired diver sandbox evidence, and human acceptance all pass.',
    }
    : null;
  if (!target) {
    return {
      kind: 'none',
      title: 'No incomplete target found',
      commands: ['npm run content:gate'],
      blocker: null,
      gateTruth,
    };
  }
  if (target.stage === 'source-image-needed') {
    const missingArtifacts = context.missingArtifactsByCandidate.get(target.id) ?? [];
  const builtInIsFailing = missingArtifacts.length >= 3;
  const captureFirst = builtInIsFailing;
  const captureCommand = `npm run source:inbox-capture -- --id ${target.id} --open`;
  const recoverSavedFileCommand = `npm run source:recover-inline -- --id ${target.id} --image <saved-image-path> --copy --validate`;
    return {
      kind: 'source-image',
      title: `Get a project-recoverable source image for ${target.species}`,
      targetId: target.id,
      stage: target.stage,
      captureFirst,
      missingArtifactAttempts: missingArtifacts.length,
      captureReason: captureFirst
        ? `Built-in image generation has ${missingArtifacts.length} missing-artifact attempts for ${target.id}; use a target-aware capture or explicit saved-file recovery path before trying more inline generation.`
        : null,
      recommendedFirst: captureFirst ? captureCommand : target.nextCommands?.[0] ?? captureCommand,
      recommendedFallback: recoverSavedFileCommand,
      capture: sourceImageCaptureDetails(target, context),
      blocker: builtInIsFailing
        ? `Built-in image generation has ${missingArtifacts.length} missing-artifact attempts for ${target.id}.`
        : target.latestRejection?.reason ?? null,
      gateTruth,
      commands: commandsForSourceImageTarget(target, context),
      acceptanceCriteria: [
        `tools/source-inbox/${target.id}.png exists or source candidate has a project source image`,
        `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${target.id} passes before ingest`,
        'npm run source:check passes after ingest',
        'npm run source:gallery refreshes the review manifest',
      ],
    };
  }
  if (target.stage === 'source-review-needed' || target.stage === 'prototype-needs-approved-source') {
    const sourceSandboxId = `source-${target.id}`;
    return {
      kind: 'source-review',
      title: `Human-review source art for ${target.species}`,
      targetId: target.id,
      stage: target.stage,
      blocker: 'Source image exists but is not approved by the source-first gate.',
      gateTruth,
      commands: [
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
        `npm run sandbox:preview -- --id ${sourceSandboxId} --with diver --serve --open --visual`,
        `npm run sandbox:preview -- --id ${target.id} --with diver --serve --open --visual`,
        ...(target.nextCommands ?? []).map(dryRunSourceAccept),
      ],
      acceptanceCriteria: [
        'human reviewer starts from the source approval session, then inspects source approval runway and source visual board',
        'human reviewer can run the 20-candidate source approval marathon smoke and full-batch dry-run guard before trusting exported decisions',
        'human reviewer can use the source cohesion batch decision workspace or content review session to produce strict decision files',
        'human reviewer can export reviewed-only source decisions for incremental strict approval without pending rows',
        'human reviewer opens live diver-paired source and runtime sandbox previews for scale and motion context',
        'source approval command is run by a human reviewer, not automation',
        'source review includes scores 4-5 and check-specific notes',
        'source preview and source-image validation evidence are current',
      ],
    };
  }
  if (target.stage === 'rigging-needed') {
    return {
      kind: 'rigging',
      title: `Prepare and extract articulated rig for ${target.species}`,
      targetId: target.id,
      stage: target.stage,
      blocker: null,
      gateTruth,
      commands: target.nextCommands ?? [],
      acceptanceCriteria: [
        'articulation plan validates',
        'extracted parts match the approved source image',
        'runtime manifest registers the new creature',
      ],
    };
  }
  return {
    kind: 'acceptance',
    title: `Advance ${target.species} through rig/sandbox acceptance`,
    targetId: target.id,
    stage: target.stage,
    blocker: target.stage,
    gateTruth,
    commands: target.nextCommands ?? [],
    acceptanceCriteria: [
      'review gallery is fresh',
      'sandbox visual report includes required states',
      'human acceptance review records required scores, notes, and evidence',
    ],
  };
}

function sourceReviewParallelAction(sourceReviewDossier, sourceApprovalRunway, sourceVisualBoard) {
  const runwayRecommended = sourceApprovalRunway?.recommended ?? (sourceApprovalRunway?.items ?? []).find((item) => item.readyForHumanReview === true && item.humanApproved !== true) ?? null;
  if (!runwayRecommended) return null;
  const recommended = (sourceReviewDossier?.items ?? []).find((item) => item.id === runwayRecommended.id) ?? {};
  const sourceSandboxId = `source-${runwayRecommended.id}`;
  const runtimeSandboxId = runwayRecommended.id;
  const evidenceLinks = {
    approvalRunway: '/review/source-approval-runway.html',
    approvalSession: '/review/source-candidates/source-approval-session.html',
    approvalChecklist: '/review/source-approval-checklist.json',
    visualBoard: '/review/source-visual-board.html',
    batchDecisionWorkspace: '/review/source-candidates/source-cohesion-decision-template.html',
    batchDecisionTemplate: '/review/source-candidates/source-cohesion-decision-template.json',
    contentReviewSession: '/review/content-review-session.html',
    reviewDossier: '/review/source-candidates/source-review-dossier.html',
    reviewQueue: '/review/source-candidates/quick-reviews/index.html',
    sandboxLab: `/review/sandbox/lab.html?id=${sourceSandboxId}&with=diver`,
    sourceSandboxLive: `/?entity=${sourceSandboxId}&companion=diver`,
    runtimeSandboxLive: `/?sandbox=${runtimeSandboxId}&companion=diver`,
    quickReview: runwayRecommended?.links?.quickReview ?? `/review/source-candidates/quick-reviews/${runwayRecommended.id}.html`,
    source: runwayRecommended?.links?.source ?? (recommended.source ? `/${recommended.source.replace(/^public\//, '')}` : null),
    keyPreview: runwayRecommended?.links?.keyPreview ?? null,
    sandboxScreenshot: runwayRecommended?.links?.sandboxScreenshot ?? null,
    planPreview: runwayRecommended?.links?.planPreview ?? null,
    reviewPacket: runwayRecommended?.links?.reviewPacket ?? null,
    contractMarkdown: runwayRecommended?.contract?.contractMarkdown ?? recommended.contractMarkdown ?? null,
  };
  return {
    kind: 'source-review',
    title: `Human-review source art for ${runwayRecommended.species ?? recommended.species}`,
    targetId: runwayRecommended.id,
    status: runwayRecommended.readyForHumanReview === true ? 'ready-for-human-review' : runwayRecommended.status ?? recommended.status ?? 'needs-review',
    source: recommended.source ?? runwayRecommended.links?.source ?? null,
    evidenceLinks,
    evidenceSummary: {
      approvalRunwayReady: sourceApprovalRunway?.summary?.readyForHumanReview ?? null,
      visualBoardReady: sourceVisualBoard?.summary?.readyForHumanReview ?? null,
      sourceDossierReady: sourceReviewDossier?.summary?.readyForHumanReview ?? null,
      humanApproved: sourceApprovalRunway?.summary?.humanApproved ?? null,
    },
    blocker: Array.isArray(runwayRecommended.blockers) ? runwayRecommended.blockers.join('; ') || null : Array.isArray(recommended.blockers) ? recommended.blockers.join('; ') || null : null,
    recommendedFirst: 'npm run source:approval-session:serve-smoke',
    acceptCommand: runwayRecommended.acceptCommand ?? recommended.acceptCommand,
    acceptCommandDryRun: dryRunSourceAccept(runwayRecommended.acceptCommand ?? recommended.acceptCommand),
    rejectCommand: runwayRecommended.rejectCommand ?? recommended.rejectCommand,
    rejectCommandDryRun: dryRunSourceAccept(runwayRecommended.rejectCommand ?? recommended.rejectCommand),
    commands: [
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
      `npm run sandbox:preview -- --id ${sourceSandboxId} --with diver --serve --open --visual`,
      `npm run sandbox:preview -- --id ${runtimeSandboxId} --with diver --serve --open --visual`,
      dryRunSourceAccept(runwayRecommended.acceptCommand ?? recommended.acceptCommand),
      dryRunSourceAccept(runwayRecommended.rejectCommand ?? recommended.rejectCommand),
    ].filter(Boolean),
    acceptanceCriteria: [
      'human reviewer starts from the source approval session, then inspects source approval runway and source visual board',
      'human reviewer can run the 20-candidate source approval marathon smoke and full-batch dry-run guard before trusting exported decisions',
      'human reviewer can fill the batch decision workspace or content review session and run the strict source cohesion decision dry-run before applying approvals',
      'human reviewer can export reviewed-only source decisions for incremental strict approval without pending rows',
      'human reviewer opens the sandbox lab and live diver-paired source/runtime previews for scale and motion context',
      'human reviewer inspects whole source thumbnail, magenta key preview, source sandbox screenshot, plan preview, and art contract',
      'approval uses required 4-5 visual scores and specific notes for every source review check',
      'automation, assistant, bot, or model reviewer names are rejected by source:accept',
    ],
  };
}

function criticRegenerationParallelAction(sourceCriticRegeneration, sourceCriticRegenerationHealth) {
  const next = sourceCriticRegeneration?.nextCandidate ?? null;
  if (!next) return null;
  const healthItem = (sourceCriticRegenerationHealth?.items ?? []).find((item) => item.id === next.id) ?? null;
  const healthStatus = healthItem?.status ?? 'unknown';
  const commands = (healthItem?.nextCommands?.length ? healthItem.nextCommands : [
    next.commands?.openPrompt,
    next.commands?.markImagegen,
    next.commands?.checkImagegen,
    next.commands?.ingestImagegen,
    next.commands?.captureManual,
    next.commands?.recoverSavedImage,
    next.commands?.generateOpenAiDryRun,
    next.commands?.generateOpenAiApply,
  ]).filter(Boolean);
  return {
    kind: 'source-critic-regeneration',
    title: `Regenerate critic-blocked source art for ${next.species}`,
    targetId: next.id,
    species: next.species,
    status: healthStatus,
    lane: next.lane,
    blocker: healthStatus === 'distinct-replacement-ready'
      ? 'Lane critic marked this source below the approval bar; a distinct replacement is ready for dry-run ingest and must return through source approval.'
      : healthStatus === 'valid-noop-replacement'
        ? 'Lane critic marked this source below the approval bar; current inbox replacement is byte-identical to the source and must be regenerated before ingest.'
        : healthStatus === 'replacement-missing'
          ? 'Lane critic marked this source below the approval bar; no replacement inbox image exists yet.'
          : 'Lane critic marked this source below the approval bar; replacement must be fixed before ingest.',
    recommendedFirst: commands[0] ?? next.commands?.openPrompt ?? 'npm run source:critic-regeneration',
    promptFile: next.promptFile,
    evidenceLinks: {
      queue: '/review/source-candidates/source-critic-regeneration-queue.html#next-regeneration-target',
      health: '/review/source-candidates/source-critic-regeneration-health.html',
      sourceCriticBoard: next.links?.sourceCriticBoard ?? `/review/source-candidates/source-critic-board.html#${next.id}`,
      sourceReplaceRunway: next.links?.sourceReplaceRunway ?? `/review/source-candidates/source-replace-runway.html#${next.id}`,
      quickReview: next.links?.quickReview ?? `/review/source-candidates/quick-reviews/${next.id}.html`,
      source: next.links?.source ?? null,
      sandboxPreview: next.links?.sandboxPreview ?? null,
      planPreview: next.links?.planPreview ?? null,
      liveSourceSandbox: next.links?.liveSourceSandbox ?? `/?entity=source-${next.id}&companion=diver`,
    },
    evidenceSummary: {
      regenerateCandidates: sourceCriticRegeneration?.summary?.regenerateCandidates ?? null,
      lanes: sourceCriticRegeneration?.summary?.lanes ?? null,
      promptFiles: sourceCriticRegeneration?.summary?.promptFiles ?? null,
      distinctReplacementReady: sourceCriticRegenerationHealth?.summary?.distinctReplacementReady ?? null,
      validNoopReplacements: sourceCriticRegenerationHealth?.summary?.validNoopReplacements ?? null,
      missingReplacements: sourceCriticRegenerationHealth?.summary?.missingReplacements ?? null,
      invalidReplacements: sourceCriticRegenerationHealth?.summary?.invalidReplacements ?? null,
      nextActionStatus: healthStatus,
    },
    commands,
    acceptanceCriteria: [
      'replacement source is generated from the critic-regeneration prompt, not the stale rejected prompt',
      'replacement image must be distinct from the current source before any overwrite ingest is recommended',
      'replacement image is ingested with overwrite only after the health report marks it distinct-replacement-ready and dry-run replacement passes',
      'source image check, source preview, approval runway, visual board, critic board, and regeneration queue are rebuilt after replacement',
      'replacement returns to human source approval; critic regeneration never approves content by itself',
    ],
  };
}

function sourceReviewSequencerParallelAction(sourceReviewSequencer) {
  const nextTarget = sourceReviewSequencer?.summary?.nextTarget ?? null;
  if (!nextTarget) return null;
  const nextItem = (sourceReviewSequencer?.items ?? []).find((item) => item.id === nextTarget) ?? null;
  if (!nextItem) return null;
  return {
    kind: 'source-review-sequencer',
    title: `Route source-review work through ${nextItem.species}`,
    targetId: nextItem.id,
    species: nextItem.species,
    lane: nextItem.lane,
    status: nextItem.status,
    healthStatus: nextItem.healthStatus,
    recommendedFirst: nextItem.recommendedFirst ?? nextItem.nextCommands?.[0] ?? 'npm run source:review-sequencer',
    evidenceLinks: {
      sequencer: '/review/source-candidates/source-review-sequencer.html',
      approvalRunway: nextItem.links?.sourceApprovalRunway ?? '/review/source-approval-runway.html',
      criticRegenerationHealth: nextItem.links?.criticRegenerationHealth ?? '/review/source-candidates/source-critic-regeneration-health.html',
      contentReviewSession: nextItem.links?.contentReviewSession ?? '/review/content-review-session.html',
      sourcePreview: nextItem.links?.sourcePreview ?? null,
      quickReview: nextItem.links?.quickReview ?? null,
      reviewPacket: nextItem.links?.reviewPacket ?? null,
      planPreview: nextItem.links?.planPreview ?? null,
    },
    evidenceSummary: {
      totalCandidates: sourceReviewSequencer?.summary?.totalCandidates ?? null,
      approvalReady: sourceReviewSequencer?.summary?.approvalReady ?? null,
      criticRegenerationRequired: sourceReviewSequencer?.summary?.criticRegenerationRequired ?? null,
      distinctReplacementReady: sourceReviewSequencer?.summary?.distinctReplacementReady ?? null,
      validNoopReplacements: sourceReviewSequencer?.summary?.validNoopReplacements ?? null,
      missingReplacements: sourceReviewSequencer?.summary?.missingReplacements ?? null,
      invalidReplacements: sourceReviewSequencer?.summary?.invalidReplacements ?? null,
      countsTowardGate: sourceReviewSequencer?.summary?.countsTowardGate ?? null,
    },
    commands: [
      'npm run source:review-sequencer',
      'npm run source:review-sequencer-check',
      'npm run source:review-sequencer:serve-smoke',
      ...(nextItem.nextCommands ?? []),
    ].filter(Boolean),
    acceptanceCriteria: [
      'the sequencer lane matches critic-regeneration health and source approval state',
      'non-distinct replacement lanes do not expose overwrite ingest commands',
      'approval-ready rows expose dry-run source acceptance only',
      'the next target is reviewed in source-review-sequencer.html before any lower-level command is applied',
      'the sequencer does not approve source art or accept threats; it only routes the next safe review action',
    ],
  };
}

function sourceRegenerationWorkspaceParallelAction(sourceRegenerationWorkspace) {
  const target = sourceRegenerationWorkspace?.target ?? null;
  if (!target?.id) return null;
  return {
    kind: 'source-regeneration-workspace',
    title: `Regenerate distinct source art for ${target.species}`,
    targetId: target.id,
    species: target.species,
    lane: target.lane,
    status: target.status,
    healthStatus: target.healthStatus,
    replacementMatchesCurrentSource: Boolean(target.replacementMatchesCurrentSource),
    distinctReplacementReady: Boolean(target.distinctReplacementReady),
    recommendedFirst: target.commands?.safeNext?.[0] ?? 'npm run source:regeneration-workspace',
    evidenceLinks: {
      workspace: '/review/source-candidates/source-regeneration-workspace.html',
      targetPacket: target.links?.targetPacket ?? '/review/source-candidates/source-review-target-packet.html',
      sequencer: target.links?.sequencer ?? '/review/source-candidates/source-review-sequencer.html',
      criticRegenerationHealth: target.links?.criticRegenerationHealth ?? '/review/source-candidates/source-critic-regeneration-health.html',
      source: target.links?.source ?? null,
      sourcePreview: target.links?.sourcePreview ?? null,
      quickReview: target.links?.quickReview ?? null,
      planPreview: target.links?.planPreview ?? null,
    },
    evidenceSummary: {
      sourcePath: target.source?.path ?? null,
      sourceSha256: target.source?.sha256 ?? null,
      sourceSize: target.source?.size ?? null,
      inboxPath: target.inbox?.path ?? null,
      inboxSha256: target.inbox?.sha256 ?? null,
      inboxSize: target.inbox?.size ?? null,
      validNoopReplacements: sourceRegenerationWorkspace?.summary?.validNoopReplacements ?? null,
      missingReplacements: sourceRegenerationWorkspace?.summary?.missingReplacements ?? null,
      invalidReplacements: sourceRegenerationWorkspace?.summary?.invalidReplacements ?? null,
    },
    commands: [
      'npm run source:regeneration-workspace',
      'npm run source:regeneration-workspace-check',
      'npm run source:regeneration-workspace:serve-smoke',
      ...(target.commands?.safeNext ?? []),
    ].filter(Boolean),
    acceptanceCriteria: [
      'the replacement candidate is visually distinct from the current source before overwrite ingest appears',
      'the workspace source and inbox fingerprints prove whether the candidate is a no-op',
      'safe commands do not expose overwrite ingest outside regenerate-distinct-ready',
      'critic health, sequencer, target packet, and workspace are rebuilt after every replacement attempt',
      'regeneration returns to source review; it does not approve source art or accept threats',
    ],
  };
}

function visualRegenerationParallelAction(visualRegenerationQueue) {
  const next = visualRegenerationQueue?.items?.[0] ?? null;
  if (!next) return null;
  return {
    kind: 'visual-regeneration',
    title: `Regenerate cohesive source-first art for ${next.species}`,
    targetId: next.targetId,
    species: next.species,
    status: next.status,
    severity: next.severity,
    promptFile: next.promptFile,
    sandboxPreviewOnly: Boolean(next.sandboxPreviewOnly),
    targetGateCandidate: Boolean(next.targetGateCandidate),
    countsTowardStrictGate: Boolean(next.countsTowardStrictGate),
    failedChecks: next.failedChecks ?? [],
    blocker: 'Runtime prototype failed art-direction review and must restart from a cohesive full-source concept.',
    recommendedFirst: next.commands?.openPrompt ?? 'npm run content:visual-regeneration',
    evidenceLinks: {
      queue: '/review/content-visual-regeneration-queue.html',
      feedbackLedger: '/review/content-visual-feedback-ledger.html',
      promptFile: next.promptFile ?? null,
      prototypeSandbox: `/?sandbox=${next.targetId}`,
      pairedPrototypeSandbox: `/?sandbox=${next.targetId}&companion=diver`,
    },
    evidenceSummary: {
      items: visualRegenerationQueue?.summary?.items ?? null,
      blockingItems: visualRegenerationQueue?.summary?.blockingItems ?? null,
      unmappedPrototypeItems: visualRegenerationQueue?.summary?.unmappedPrototypeItems ?? null,
      countsTowardStrictGate: visualRegenerationQueue?.summary?.countsTowardStrictGate ?? null,
      nextTargetId: visualRegenerationQueue?.summary?.nextTargetId ?? null,
    },
    commands: [
      next.commands?.openPrompt,
      next.commands?.previewPrototype,
      next.commands?.previewWithDiver,
      next.commands?.rebuildFeedback,
      next.commands?.rebuildQueue,
      'npm run content:visual-regeneration:serve-smoke',
    ].filter(Boolean),
    acceptanceCriteria: [
      'new art starts as a full-source concept on pure #ff00ff magenta, not as a parts sheet or assembled prototype',
      'human reviewer confirms whole-creature cohesion, part-continuity cohesion, and non-placeholder art direction before extraction',
      'regenerated source returns through magenta-key cleanup, source approval, articulation, paired-diver sandbox preview, and final threat acceptance',
      'blocked runtime prototype remains preview-only and contributes zero strict-gate credit until all gates pass',
    ],
  };
}

function markdown(report) {
  const lines = [
    '# Water9 Content Next Action',
    '',
    `Generated: \`${report.generatedAt}\``,
    '',
    '## Summary',
    '',
    `- Accepted threats: \`${report.summary.acceptedThreats}/${report.summary.targetThreats}\``,
    `- Source images: \`${report.summary.sourceImages}/${report.summary.targetThreats}\``,
    `- Next bottleneck: \`${report.summary.nextBottleneck}\``,
    `- Active source imagegen missing artifacts: \`${report.summary.sourceImagegenActiveMissingArtifacts}\``,
    `- Historical source imagegen missing artifacts: \`${report.summary.sourceImagegenHistoricalMissingArtifacts}\``,
    `- OpenAI API key available for CLI fallback: \`${report.summary.openaiApiKeyAvailable}\``,
    `- Source reviews pending: \`${report.summary.sourceReviewPending ?? 'unknown'}\``,
    `- Source reviews ready for human review: \`${report.summary.sourceReviewReadyForHumanReview ?? 'unknown'}\``,
    `- Source reviews mechanically ready: \`${report.summary.sourceReviewMechanicallyReadyForHumanReview ?? 'unknown'}\``,
    `- Source reviews requiring critic regeneration: \`${report.summary.sourceReviewCriticRegenerationRequired ?? 'unknown'}\``,
    `- Next critic regeneration target: \`${report.summary.sourceCriticRegenerationNextTarget ?? 'none'}\``,
    `- Source review sequencer next lane: \`${report.summary.sourceReviewSequencerNextLane ?? 'none'}\``,
    `- Source review sequencer next target: \`${report.summary.sourceReviewSequencerNextTarget ?? 'none'}\``,
    '',
    '## Next Action',
    '',
    `- Type: \`${report.nextAction.kind}\``,
    `- Target: \`${report.nextAction.targetId ?? 'none'}\``,
    `- Stage: \`${report.nextAction.stage ?? 'none'}\``,
    `- Title: ${report.nextAction.title}`,
  ];
  if (report.nextAction.blocker) lines.push(`- Blocker: ${report.nextAction.blocker}`);
  if (report.nextAction.captureFirst != null) lines.push(`- Capture first: \`${report.nextAction.captureFirst ? 'yes' : 'no'}\``);
  if (report.nextAction.missingArtifactAttempts != null) lines.push(`- Missing artifact attempts: \`${report.nextAction.missingArtifactAttempts}\``);
  if (report.nextAction.captureReason) lines.push(`- Capture reason: ${report.nextAction.captureReason}`);
  if (report.nextAction.recommendedFirst) lines.push(`- Recommended first: \`${report.nextAction.recommendedFirst}\``);
  if (report.nextAction.recommendedFallback) lines.push(`- Recommended fallback: \`${report.nextAction.recommendedFallback}\``);
  if (report.nextAction.capture) {
    lines.push(
      '',
      '### Capture Target',
      '',
      `- Capture UI: \`${report.nextAction.capture.captureUrl}\``,
      `- Capture command: \`${report.nextAction.capture.captureCommand}\``,
      `- Inbox target: \`${report.nextAction.capture.inboxTarget}\``,
      `- Alternate inbox target: \`${report.nextAction.capture.alternateInboxTarget}\``,
      `- Expected output: \`${report.nextAction.capture.expectedOutput}\``,
      `- Prompt file: \`${report.nextAction.capture.promptFile ?? 'none'}\``,
      `- Saved-file recovery: \`${report.nextAction.capture.recoveryCommand}\``,
    );
  }
  if (report.nextAction.gateTruth?.reviewWarning) lines.push(`- Gate truth: ${report.nextAction.gateTruth.reviewWarning}`);
  lines.push(
    '',
    '### Command Boundary',
    '',
    'Source review commands in this report are preview/check commands or dry-run templates. Real approval must be run by a human after inspecting the source approval runway and visual board.',
    '',
    '### Commands',
    '',
    '```bash',
    ...(report.nextAction.commands ?? []),
    '```',
    '',
    '### Acceptance Criteria',
    '',
  );
  for (const criterion of report.nextAction.acceptanceCriteria ?? []) lines.push(`- ${criterion}`);
  const sourceReviewSequencerAction = report.parallelActions?.sourceReviewSequencer;
  if (sourceReviewSequencerAction) {
    lines.push(
      '',
      '## Parallel Source Review Sequencer',
      '',
      `- Target: \`${sourceReviewSequencerAction.targetId}\``,
      `- Lane: \`${sourceReviewSequencerAction.lane}\``,
      `- Status: \`${sourceReviewSequencerAction.status}\``,
      `- Health status: \`${sourceReviewSequencerAction.healthStatus ?? 'none'}\``,
      `- Title: ${sourceReviewSequencerAction.title}`,
      `- Recommended first: \`${sourceReviewSequencerAction.recommendedFirst}\``,
      '',
      '### Source Review Sequencer Evidence',
      '',
      `- Sequencer: \`${sourceReviewSequencerAction.evidenceLinks?.sequencer ?? 'missing'}\``,
      `- Approval runway: \`${sourceReviewSequencerAction.evidenceLinks?.approvalRunway ?? 'missing'}\``,
      `- Critic regeneration health: \`${sourceReviewSequencerAction.evidenceLinks?.criticRegenerationHealth ?? 'missing'}\``,
      `- Content review session: \`${sourceReviewSequencerAction.evidenceLinks?.contentReviewSession ?? 'missing'}\``,
      `- Source preview: \`${sourceReviewSequencerAction.evidenceLinks?.sourcePreview ?? 'missing'}\``,
      `- Quick review: \`${sourceReviewSequencerAction.evidenceLinks?.quickReview ?? 'missing'}\``,
      `- Review packet: \`${sourceReviewSequencerAction.evidenceLinks?.reviewPacket ?? 'missing'}\``,
      `- Plan preview: \`${sourceReviewSequencerAction.evidenceLinks?.planPreview ?? 'missing'}\``,
      '',
      '### Source Review Sequencer Counts',
      '',
      `- Total candidates: \`${sourceReviewSequencerAction.evidenceSummary?.totalCandidates ?? 'unknown'}\``,
      `- Approval-ready: \`${sourceReviewSequencerAction.evidenceSummary?.approvalReady ?? 'unknown'}\``,
      `- Critic regeneration required: \`${sourceReviewSequencerAction.evidenceSummary?.criticRegenerationRequired ?? 'unknown'}\``,
      `- Distinct replacements ready: \`${sourceReviewSequencerAction.evidenceSummary?.distinctReplacementReady ?? 'unknown'}\``,
      `- Valid no-op replacements: \`${sourceReviewSequencerAction.evidenceSummary?.validNoopReplacements ?? 'unknown'}\``,
      `- Missing replacements: \`${sourceReviewSequencerAction.evidenceSummary?.missingReplacements ?? 'unknown'}\``,
      `- Invalid replacements: \`${sourceReviewSequencerAction.evidenceSummary?.invalidReplacements ?? 'unknown'}\``,
      `- Counts toward gate: \`${sourceReviewSequencerAction.evidenceSummary?.countsTowardGate ?? 'unknown'}\``,
      '',
      '### Source Review Sequencer Command Boundary',
      '',
      'The sequencer chooses the safest next source-review lane. It does not approve source art or accept threats.',
      '',
      '### Source Review Sequencer Commands',
      '',
      '```bash',
      ...(sourceReviewSequencerAction.commands ?? []),
      '```',
      '',
      '### Source Review Sequencer Acceptance Criteria',
      '',
    );
    for (const criterion of sourceReviewSequencerAction.acceptanceCriteria ?? []) lines.push(`- ${criterion}`);
  }
  const sourceRegenerationWorkspaceAction = report.parallelActions?.sourceRegenerationWorkspace;
  if (sourceRegenerationWorkspaceAction) {
    lines.push(
      '',
      '## Parallel: Source Regeneration Workspace',
      '',
      `- Target: \`${sourceRegenerationWorkspaceAction.targetId}\``,
      `- Lane: \`${sourceRegenerationWorkspaceAction.lane}\``,
      `- Status: \`${sourceRegenerationWorkspaceAction.status}\``,
      `- Health status: \`${sourceRegenerationWorkspaceAction.healthStatus ?? 'none'}\``,
      `- Replacement matches current source: \`${sourceRegenerationWorkspaceAction.replacementMatchesCurrentSource}\``,
      `- Distinct replacement ready: \`${sourceRegenerationWorkspaceAction.distinctReplacementReady}\``,
      `- Title: ${sourceRegenerationWorkspaceAction.title}`,
      `- Recommended first: \`${sourceRegenerationWorkspaceAction.recommendedFirst}\``,
      '',
      '### Regeneration Workspace Evidence',
      '',
      `- Workspace: \`${sourceRegenerationWorkspaceAction.evidenceLinks?.workspace ?? 'missing'}\``,
      `- Target packet: \`${sourceRegenerationWorkspaceAction.evidenceLinks?.targetPacket ?? 'missing'}\``,
      `- Sequencer: \`${sourceRegenerationWorkspaceAction.evidenceLinks?.sequencer ?? 'missing'}\``,
      `- Critic regeneration health: \`${sourceRegenerationWorkspaceAction.evidenceLinks?.criticRegenerationHealth ?? 'missing'}\``,
      `- Source preview: \`${sourceRegenerationWorkspaceAction.evidenceLinks?.sourcePreview ?? 'missing'}\``,
      `- Source image: \`${sourceRegenerationWorkspaceAction.evidenceLinks?.source ?? 'missing'}\``,
      `- Quick review: \`${sourceRegenerationWorkspaceAction.evidenceLinks?.quickReview ?? 'missing'}\``,
      `- Plan preview: \`${sourceRegenerationWorkspaceAction.evidenceLinks?.planPreview ?? 'missing'}\``,
      '',
      '### Regeneration Workspace Fingerprints',
      '',
      `- Source path: \`${sourceRegenerationWorkspaceAction.evidenceSummary?.sourcePath ?? 'missing'}\``,
      `- Source SHA-256: \`${sourceRegenerationWorkspaceAction.evidenceSummary?.sourceSha256 ?? 'missing'}\``,
      `- Inbox path: \`${sourceRegenerationWorkspaceAction.evidenceSummary?.inboxPath ?? 'missing'}\``,
      `- Inbox SHA-256: \`${sourceRegenerationWorkspaceAction.evidenceSummary?.inboxSha256 ?? 'missing'}\``,
      '',
      '### Regeneration Workspace Commands',
      '',
      '```bash',
      ...(sourceRegenerationWorkspaceAction.commands ?? []),
      '```',
      '',
      '### Regeneration Workspace Acceptance Criteria',
      '',
    );
    for (const criterion of sourceRegenerationWorkspaceAction.acceptanceCriteria ?? []) lines.push(`- ${criterion}`);
  }
  const sourceReviewAction = report.parallelActions?.sourceReview;
  if (sourceReviewAction) {
    lines.push(
      '',
      '## Parallel Source Review',
      '',
      `- Target: \`${sourceReviewAction.targetId}\``,
      `- Status: \`${sourceReviewAction.status}\``,
      `- Title: ${sourceReviewAction.title}`,
    );
    if (sourceReviewAction.blocker) lines.push(`- Blocker: ${sourceReviewAction.blocker}`);
    lines.push(`- Recommended first: \`${sourceReviewAction.recommendedFirst}\``);
    lines.push(
      '',
      '### Source Review Evidence',
      '',
      `- Approval runway: \`${sourceReviewAction.evidenceLinks?.approvalRunway ?? 'missing'}\``,
      `- Approval checklist: \`${sourceReviewAction.evidenceLinks?.approvalChecklist ?? 'missing'}\``,
      `- Visual board: \`${sourceReviewAction.evidenceLinks?.visualBoard ?? 'missing'}\``,
      `- Batch decision workspace: \`${sourceReviewAction.evidenceLinks?.batchDecisionWorkspace ?? 'missing'}\``,
      `- Batch decision template: \`${sourceReviewAction.evidenceLinks?.batchDecisionTemplate ?? 'missing'}\``,
      `- Content review session: \`${sourceReviewAction.evidenceLinks?.contentReviewSession ?? 'missing'}\``,
      `- Review dossier: \`${sourceReviewAction.evidenceLinks?.reviewDossier ?? 'missing'}\``,
      `- Review queue: \`${sourceReviewAction.evidenceLinks?.reviewQueue ?? 'missing'}\``,
      `- Sandbox lab: \`${sourceReviewAction.evidenceLinks?.sandboxLab ?? 'missing'}\``,
      `- Live source sandbox: \`${sourceReviewAction.evidenceLinks?.sourceSandboxLive ?? 'missing'}\``,
      `- Live runtime sandbox: \`${sourceReviewAction.evidenceLinks?.runtimeSandboxLive ?? 'missing'}\``,
      `- Quick review: \`${sourceReviewAction.evidenceLinks?.quickReview ?? 'missing'}\``,
      `- Source image: \`${sourceReviewAction.evidenceLinks?.source ?? 'missing'}\``,
      `- Key preview: \`${sourceReviewAction.evidenceLinks?.keyPreview ?? 'missing'}\``,
      `- Sandbox screenshot: \`${sourceReviewAction.evidenceLinks?.sandboxScreenshot ?? 'missing'}\``,
      `- Plan preview: \`${sourceReviewAction.evidenceLinks?.planPreview ?? 'missing'}\``,
      `- Art contract: \`${sourceReviewAction.evidenceLinks?.contractMarkdown ?? 'missing'}\``,
    );
    lines.push(
      '',
      '### Source Review Counts',
      '',
      `- Approval runway ready: \`${sourceReviewAction.evidenceSummary?.approvalRunwayReady ?? 'unknown'}\``,
      `- Visual board ready: \`${sourceReviewAction.evidenceSummary?.visualBoardReady ?? 'unknown'}\``,
      `- Dossier ready: \`${sourceReviewAction.evidenceSummary?.sourceDossierReady ?? 'unknown'}\``,
      `- Human approved: \`${sourceReviewAction.evidenceSummary?.humanApproved ?? 'unknown'}\``,
    );
    lines.push(
      '',
      '### Source Review Command Boundary',
      '',
      'The listed source review decision commands are dry-runs. Use the source approval runway command builder for the final human approval command after review.',
      '',
      '### Source Review Commands',
      '',
      '```bash',
      ...(sourceReviewAction.commands ?? []),
      '```',
      '',
      '### Source Review Acceptance Criteria',
      '',
    );
    for (const criterion of sourceReviewAction.acceptanceCriteria ?? []) lines.push(`- ${criterion}`);
  }
  const criticRegenerationAction = report.parallelActions?.criticRegeneration;
  if (criticRegenerationAction) {
    lines.push(
      '',
      '## Parallel Critic Regeneration',
      '',
      `- Target: \`${criticRegenerationAction.targetId}\``,
      `- Status: \`${criticRegenerationAction.status}\``,
      `- Lane: \`${criticRegenerationAction.lane}\``,
      `- Title: ${criticRegenerationAction.title}`,
      `- Blocker: ${criticRegenerationAction.blocker}`,
      `- Recommended first: \`${criticRegenerationAction.recommendedFirst}\``,
      `- Prompt file: \`${criticRegenerationAction.promptFile ?? 'missing'}\``,
      '',
      '### Critic Regeneration Evidence',
      '',
      `- Queue: \`${criticRegenerationAction.evidenceLinks?.queue ?? 'missing'}\``,
      `- Health: \`${criticRegenerationAction.evidenceLinks?.health ?? 'missing'}\``,
      `- Critic board: \`${criticRegenerationAction.evidenceLinks?.sourceCriticBoard ?? 'missing'}\``,
      `- Replace runway: \`${criticRegenerationAction.evidenceLinks?.sourceReplaceRunway ?? 'missing'}\``,
      `- Quick review: \`${criticRegenerationAction.evidenceLinks?.quickReview ?? 'missing'}\``,
      `- Source image: \`${criticRegenerationAction.evidenceLinks?.source ?? 'missing'}\``,
      `- Sandbox preview: \`${criticRegenerationAction.evidenceLinks?.sandboxPreview ?? 'missing'}\``,
      `- Plan preview: \`${criticRegenerationAction.evidenceLinks?.planPreview ?? 'missing'}\``,
      `- Live source sandbox: \`${criticRegenerationAction.evidenceLinks?.liveSourceSandbox ?? 'missing'}\``,
      '',
      '### Critic Regeneration Counts',
      '',
      `- Regenerate candidates: \`${criticRegenerationAction.evidenceSummary?.regenerateCandidates ?? 'unknown'}\``,
      `- Lanes: \`${criticRegenerationAction.evidenceSummary?.lanes ?? 'unknown'}\``,
      `- Prompt files: \`${criticRegenerationAction.evidenceSummary?.promptFiles ?? 'unknown'}\``,
      `- Distinct replacements ready: \`${criticRegenerationAction.evidenceSummary?.distinctReplacementReady ?? 'unknown'}\``,
      `- Valid no-op replacements: \`${criticRegenerationAction.evidenceSummary?.validNoopReplacements ?? 'unknown'}\``,
      `- Missing replacements: \`${criticRegenerationAction.evidenceSummary?.missingReplacements ?? 'unknown'}\``,
      `- Invalid replacements: \`${criticRegenerationAction.evidenceSummary?.invalidReplacements ?? 'unknown'}\``,
      `- Next health status: \`${criticRegenerationAction.evidenceSummary?.nextActionStatus ?? 'unknown'}\``,
      '',
      '### Critic Regeneration Command Boundary',
      '',
      'Regeneration commands can replace source files, but they do not approve source art or accept threats. Rebuilt replacements must return to human source approval.',
      '',
      '### Critic Regeneration Commands',
      '',
      '```bash',
      ...(criticRegenerationAction.commands ?? []),
      '```',
      '',
      '### Critic Regeneration Acceptance Criteria',
      '',
    );
    for (const criterion of criticRegenerationAction.acceptanceCriteria ?? []) lines.push(`- ${criterion}`);
  }
  const visualRegenerationAction = report.parallelActions?.visualRegeneration;
  if (visualRegenerationAction) {
    lines.push(
      '',
      '## Parallel Visual Regeneration',
      '',
      `- Target: \`${visualRegenerationAction.targetId}\``,
      `- Status: \`${visualRegenerationAction.status}\``,
      `- Severity: \`${visualRegenerationAction.severity}\``,
      `- Title: ${visualRegenerationAction.title}`,
      `- Blocker: ${visualRegenerationAction.blocker}`,
      `- Prompt file: \`${visualRegenerationAction.promptFile ?? 'missing'}\``,
      `- Sandbox preview-only: \`${visualRegenerationAction.sandboxPreviewOnly}\``,
      `- Target gate candidate: \`${visualRegenerationAction.targetGateCandidate}\``,
      `- Counts toward strict gate: \`${visualRegenerationAction.countsTowardStrictGate}\``,
      `- Recommended first: \`${visualRegenerationAction.recommendedFirst}\``,
      '',
      '### Visual Regeneration Evidence',
      '',
      `- Queue: \`${visualRegenerationAction.evidenceLinks?.queue ?? 'missing'}\``,
      `- Feedback ledger: \`${visualRegenerationAction.evidenceLinks?.feedbackLedger ?? 'missing'}\``,
      `- Prompt file: \`${visualRegenerationAction.evidenceLinks?.promptFile ?? 'missing'}\``,
      `- Prototype sandbox: \`${visualRegenerationAction.evidenceLinks?.prototypeSandbox ?? 'missing'}\``,
      `- Paired prototype sandbox: \`${visualRegenerationAction.evidenceLinks?.pairedPrototypeSandbox ?? 'missing'}\``,
      '',
      '### Visual Regeneration Counts',
      '',
      `- Queue items: \`${visualRegenerationAction.evidenceSummary?.items ?? 'unknown'}\``,
      `- Blocking items: \`${visualRegenerationAction.evidenceSummary?.blockingItems ?? 'unknown'}\``,
      `- Unmapped prototype items: \`${visualRegenerationAction.evidenceSummary?.unmappedPrototypeItems ?? 'unknown'}\``,
      `- Strict gate credit: \`${visualRegenerationAction.evidenceSummary?.countsTowardStrictGate ?? 'unknown'}\``,
      '',
      '### Visual Regeneration Failed Checks',
      '',
    );
    for (const check of visualRegenerationAction.failedChecks ?? []) lines.push(`- ${check}`);
    lines.push(
      '',
      '### Visual Regeneration Command Boundary',
      '',
      'Visual regeneration restarts failed runtime prototypes at the full-source concept stage. It does not approve art or accept threats.',
      '',
      '### Visual Regeneration Commands',
      '',
      '```bash',
      ...(visualRegenerationAction.commands ?? []),
      '```',
      '',
      '### Visual Regeneration Acceptance Criteria',
      '',
    );
    for (const criterion of visualRegenerationAction.acceptanceCriteria ?? []) lines.push(`- ${criterion}`);
  }
  lines.push('', '## Top Queue', '', '| Rank | Candidate | Stage | Source | Rig | Accepted |', '| ---: | --- | --- | --- | --- | --- |');
  for (const target of report.topTargets) {
    lines.push(`| ${target.rank} | \`${target.id}\` ${target.species} | \`${target.stage}\` | ${target.hasSourceImage ? 'yes' : 'no'} | ${target.rigId ? `\`${target.rigId}\`` : 'no'} | ${target.accepted ? 'yes' : 'no'} |`);
  }
  return `${lines.join('\n')}\n`;
}

const stageBoard = await readJson(paths.stageBoard, { schema: null, summary: {}, targets: [] });
const sourceQueue = await readJson(paths.sourceQueue, { schema: null, candidates: [] });
const sourceSprint = await readJson(paths.sourceSprint, { schema: null, ids: [], commands: {} });
const sourceInbox = await readJson(paths.sourceInbox, { schema: null, ready: 0, missing: 0, candidates: [] });
const sourceReviewDossier = await readJson(paths.sourceReviewDossier, { schema: null, summary: {}, recommendedReview: null });
const sourceApprovalRunway = await readJson(paths.sourceApprovalRunway, { schema: null, summary: {}, recommended: null });
const sourceVisualBoard = await readJson(paths.sourceVisualBoard, { schema: null, summary: {}, items: [] });
const sourceCriticRegeneration = await readJson(paths.sourceCriticRegeneration, { schema: null, summary: {}, nextCandidate: null });
const sourceCriticRegenerationHealth = await readJson(paths.sourceCriticRegenerationHealth, { schema: null, summary: {}, items: [] });
const sourceReviewSequencer = await readJson(paths.sourceReviewSequencer, { schema: null, summary: {}, items: [] });
const sourceRegenerationWorkspace = await readJson(paths.sourceRegenerationWorkspace, { schema: null, summary: {}, target: null });
const visualRegenerationQueue = await readJson(paths.visualRegenerationQueue, { schema: null, summary: {}, items: [] });
const sourceRejections = await readJson(paths.sourceRejections, { schema: null, attempts: [] });
const workbench = await readJson(paths.workbench, { schema: null, summary: {} });

const rejectedAttempts = Array.isArray(sourceRejections.attempts) ? sourceRejections.attempts : [];
const missingArtifactsByCandidate = new Map();
for (const attempt of rejectedAttempts.filter((item) => rejectionKind(item) === 'missing-artifact')) {
  const list = missingArtifactsByCandidate.get(attempt.candidateId) ?? [];
  list.push(attempt);
  missingArtifactsByCandidate.set(attempt.candidateId, list);
}

const targets = Array.isArray(stageBoard.targets) ? stageBoard.targets : [];
const topTargets = targets.filter((target) => !target.accepted).slice(0, 8);
const firstTopTarget = topTargets[0] ?? null;
const approvalReadySourceReview = sourceApprovalRunway?.recommended ?? (sourceApprovalRunway?.items ?? []).find((item) => item.readyForHumanReview === true && item.humanApproved !== true) ?? null;
const recommendedSourceReviewTarget = approvalReadySourceReview?.id
  ? targets.find((target) => target.id === approvalReadySourceReview.id && !target.accepted)
  : null;
const firstTopIsSourceReview = ['source-review-needed', 'prototype-needs-approved-source'].includes(firstTopTarget?.stage);
const nextTarget = firstTopIsSourceReview && recommendedSourceReviewTarget ? recommendedSourceReviewTarget : firstTopTarget;
const sourceQueueById = new Map((sourceQueue.candidates ?? []).map((candidate) => [candidate.id, candidate]));
const context = {
  openaiApiKeyAvailable: Boolean(process.env.OPENAI_API_KEY),
  missingArtifactsByCandidate,
  sourceQueueById,
};
const nextAction = actionForTarget(nextTarget, context);
const historicalMissingArtifacts = rejectedAttempts.filter((item) => rejectionKind(item) === 'missing-artifact').length;
const report = {
  schema: 'water9/content-next-action@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    stageBoard: paths.stageBoard,
    sourceQueue: paths.sourceQueue,
    sourceSprint: paths.sourceSprint,
    sourceInbox: paths.sourceInbox,
    sourceReviewDossier: paths.sourceReviewDossier,
    sourceApprovalRunway: paths.sourceApprovalRunway,
    sourceVisualBoard: paths.sourceVisualBoard,
    sourceReviewSequencer: paths.sourceReviewSequencer,
    sourceRegenerationWorkspace: paths.sourceRegenerationWorkspace,
    visualRegenerationQueue: paths.visualRegenerationQueue,
    sourceRejections: paths.sourceRejections,
    workbench: paths.workbench,
  },
  summary: {
    targetThreats: stageBoard.summary?.targetThreats ?? 20,
    acceptedThreats: stageBoard.summary?.acceptedThreats ?? 0,
    sourceImages: workbench.summary?.sourceImages ?? null,
    nextBottleneck: stageBoard.summary?.nextBottleneck ?? 'unknown',
    sourceImagegenMissingArtifacts: nextAction.kind === 'source-image' ? nextAction.missingArtifactAttempts ?? 0 : 0,
    sourceImagegenActiveMissingArtifacts: nextAction.kind === 'source-image' ? nextAction.missingArtifactAttempts ?? 0 : 0,
    sourceImagegenHistoricalMissingArtifacts: workbench.summary?.sourceImagegenHistoricalMissingArtifacts ?? historicalMissingArtifacts,
    openaiApiKeyAvailable: Boolean(process.env.OPENAI_API_KEY),
    sourceQueue: sourceQueue.candidates?.length ?? 0,
    sourceSprint: sourceSprint.ids ?? [],
    sourceInboxReady: sourceInbox.ready ?? 0,
    sourceInboxMissing: sourceInbox.missing ?? 0,
    sourceReviewPending: sourceReviewDossier.summary?.pendingReview ?? null,
    sourceReviewReadyForHumanReview: sourceApprovalRunway.summary?.readyForHumanReview ?? null,
    sourceReviewMechanicallyReadyForHumanReview: sourceApprovalRunway.summary?.mechanicallyReadyForHumanReview ?? null,
    sourceReviewCriticRegenerationRequired: sourceApprovalRunway.summary?.criticRegenerationRequired ?? null,
    sourceCriticRegenerationNextTarget: sourceCriticRegeneration.summary?.nextCandidateId ?? null,
    sourceCriticRegenerationNextTargetSpecies: sourceCriticRegeneration.summary?.nextCandidateSpecies ?? null,
    sourceCriticRegenerationHealthNextStatus: sourceCriticRegenerationHealth.summary?.nextActionStatus ?? null,
    sourceCriticRegenerationHealthDistinctReady: sourceCriticRegenerationHealth.summary?.distinctReplacementReady ?? null,
    sourceCriticRegenerationHealthNoop: sourceCriticRegenerationHealth.summary?.validNoopReplacements ?? null,
    sourceCriticRegenerationHealthMissing: sourceCriticRegenerationHealth.summary?.missingReplacements ?? null,
    sourceReviewSequencerNextLane: sourceReviewSequencer.summary?.nextLane ?? null,
    sourceReviewSequencerNextTarget: sourceReviewSequencer.summary?.nextTarget ?? null,
    sourceReviewSequencerApprovalReady: sourceReviewSequencer.summary?.approvalReady ?? null,
    sourceReviewSequencerCriticRegenerationRequired: sourceReviewSequencer.summary?.criticRegenerationRequired ?? null,
    sourceReviewSequencerDistinctReady: sourceReviewSequencer.summary?.distinctReplacementReady ?? null,
    sourceReviewSequencerNoop: sourceReviewSequencer.summary?.validNoopReplacements ?? null,
    sourceReviewSequencerMissing: sourceReviewSequencer.summary?.missingReplacements ?? null,
    sourceRegenerationWorkspaceTarget: sourceRegenerationWorkspace.target?.id ?? null,
    sourceRegenerationWorkspaceLane: sourceRegenerationWorkspace.target?.lane ?? null,
    sourceRegenerationWorkspaceHealthStatus: sourceRegenerationWorkspace.target?.healthStatus ?? null,
    sourceRegenerationWorkspaceNoop: Boolean(sourceRegenerationWorkspace.target?.replacementMatchesCurrentSource),
    sourceRegenerationWorkspaceDistinctReady: Boolean(sourceRegenerationWorkspace.target?.distinctReplacementReady),
    visualRegenerationItems: visualRegenerationQueue.summary?.items ?? null,
    visualRegenerationBlockingItems: visualRegenerationQueue.summary?.blockingItems ?? null,
    visualRegenerationNextTarget: visualRegenerationQueue.summary?.nextTargetId ?? null,
    visualRegenerationStrictGateCredit: visualRegenerationQueue.summary?.countsTowardStrictGate ?? null,
  },
  nextAction,
  parallelActions: {
    sourceReviewSequencer: sourceReviewSequencerParallelAction(sourceReviewSequencer),
    sourceRegenerationWorkspace: sourceRegenerationWorkspaceParallelAction(sourceRegenerationWorkspace),
    sourceReview: sourceReviewParallelAction(sourceReviewDossier, sourceApprovalRunway, sourceVisualBoard),
    criticRegeneration: criticRegenerationParallelAction(sourceCriticRegeneration, sourceCriticRegenerationHealth),
    visualRegeneration: visualRegenerationParallelAction(visualRegenerationQueue),
  },
  topTargets,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdown(report));

console.log(JSON.stringify({
  schema: report.schema,
  jsonOut: paths.outJson,
  markdownOut: paths.outMarkdown,
  nextAction: {
    kind: report.nextAction.kind,
    targetId: report.nextAction.targetId,
    stage: report.nextAction.stage,
    blocker: report.nextAction.blocker,
  },
}, null, 2));

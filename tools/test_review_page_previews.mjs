import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readFile } from 'node:fs/promises';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const host = String(args.get('host') ?? '127.0.0.1');
let port = Number(args.get('port') ?? 5190);

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

const sourceQueue = await readJson('public/review/source-candidates/source-generation-queue.json', { candidates: [] });
const acceptanceRunway = await readJson('public/review/content-acceptance-runway.json', { summary: {}, items: [] });
const approvedRuntimeHandoff = await readJson('public/review/content-approved-runtime-handoff.json', { summary: {}, emptyState: {} });
const sourceReviewQueue = await readJson('public/review/source-candidates/quick-reviews/index.json', { reviews: [] });
const sourceApprovalRunway = await readJson('public/review/source-approval-runway.json', { items: [] });
const sourceApprovalSession = await readJson('public/review/source-candidates/source-approval-session.json', { nextTarget: null, summary: {}, reviewSteps: [] });
const sourceApprovalMarathon = await readJson('public/review/source-candidates/source-approval-marathon.json', { items: [], summary: {} });
const sourceReplaceRunway = await readJson('public/review/source-candidates/source-replace-runway.json', { items: [] });
const sourceVisualBoard = await readJson('public/review/source-visual-board.json', { items: [] });
const sourceCriticBoard = await readJson('public/review/source-candidates/source-critic-board.json', { items: [] });
const sourceCriticRegeneration = await readJson('public/review/source-candidates/source-critic-regeneration-queue.json', { candidates: [] });
const sourceCriticRegenerationDoctor = await readJson('public/review/source-candidates/source-critic-regeneration-doctor.json', { target: {} });
const sourceCriticRegenerationHealth = await readJson('public/review/source-candidates/source-critic-regeneration-health.json', { items: [], summary: {} });
const sourceReviewSequencer = await readJson('public/review/source-candidates/source-review-sequencer.json', { items: [], summary: {} });
const sourceReviewTargetPacket = await readJson('public/review/source-candidates/source-review-target-packet.json', { target: {}, summary: {} });
const sourceRegenerationWorkspace = await readJson('public/review/source-candidates/source-regeneration-workspace.json', { target: {}, summary: {} });
const researchRegenerationHandoff = await readJson('public/review/source-candidates/research-regeneration-handoff.json', { target: {}, finding: {}, commands: [] });
const sourceNextReview = await readJson('public/review/source-candidates/source-next-review.json', { target: null });
const sourceNextDecisionDraft = await readJson('public/review/source-candidates/source-next-decision-draft.json', { target: {}, decisionFile: { decisions: [] } });
const sourceCohesionReview = await readJson('public/review/source-candidates/source-cohesion-review.json', { items: [] });
const sourceCohesionDecisions = await readJson('public/review/source-candidates/source-cohesion-decision-template.json', { decisions: [] });
const threatAcceptanceDecisions = await readJson('public/review/content-threat-acceptance-decision-template.json', { decisions: [] });
const acceptanceAuditIndex = await readJson('public/review/content-acceptance-audits/index.json', { items: [] });
const humanSignoff = await readJson('public/review/content-human-signoff-queue.json', { items: [] });
const humanAdjudicationBoard = await readJson('public/review/content-human-adjudication-board.json', { items: [] });
const contentReviewSession = await readJson('public/review/content-review-session.json', { items: [] });
const contentProductionProof = await readJson('public/review/content-production-proof.json', { items: [] });
const contentPromoteApprovedThreats = await readJson('public/review/content-promote-approved-threats.json', { items: [] });
const contentSandboxRoster = await readJson('public/review/content-sandbox-roster.json', { items: [] });
const contentArticulationRoster = await readJson('public/review/content-articulation-roster.json', { items: [] });
const contentReproducibility = await readJson('public/review/content-reproducibility.json', { items: [] });
const contentSubagentAuditLedger = await readJson('public/review/content-subagent-audit-ledger.json', { audits: [], summary: {} });
const contentGoalAudit = await readJson('public/review/content-goal-audit.json', { summary: {}, requirements: [] });
const contentQualityGateMatrix = await readJson('public/review/content-quality-gate-matrix.json', { rows: [], summary: {} });
const contentQualityGateNext = await readJson('public/review/content-quality-gate-next.json', { target: {}, evidence: [] });
const runtimeCohesionReview = await readJson('public/review/content-runtime-cohesion-review.json', { target: {}, media: [], requiredChecks: [], decisionFile: { decisions: [] } });
const cohortCohesionBoard = await readJson('public/review/content-cohort-cohesion-board.json', { items: [], summary: {}, commands: {} });
const sourceWorkstation = await readJson('public/review/source-candidates/source-workstation.json', { target: null, preview: {} });
const workstationTargetId = typeof sourceWorkstation.target === 'string'
  ? sourceWorkstation.target
  : sourceWorkstation.target?.id;
const queueTarget = sourceQueue.candidates?.[0]?.id ?? workstationTargetId ?? 'glass-sponge-sentinel';
const workstationTarget = workstationTargetId ?? queueTarget;
const workstationPreviewUrl = sourceWorkstation.preview?.url ?? sourceWorkstation.target?.captureUrl ?? `http://127.0.0.1:5188/?id=${workstationTarget}`;
const sourceReviewTarget = sourceReviewQueue.reviews?.[0] ?? {};
const sourceApprovalTarget = sourceApprovalRunway.recommended ?? sourceApprovalRunway.items?.[0] ?? {};
const sourceApprovalSessionTarget = sourceApprovalSession.nextTarget ?? {};
const sourceApprovalMarathonTarget = sourceApprovalMarathon.items?.[0] ?? {};
const sourceReplaceTarget = sourceReplaceRunway.recommended ?? sourceReplaceRunway.items?.find((item) => item.replaceable) ?? sourceReplaceRunway.items?.[0] ?? {};
const acceptanceRunwayRecommended = acceptanceRunway.recommendedByStage?.[acceptanceRunway.summary?.nextBottleneck] ?? Object.values(acceptanceRunway.recommendedByStage ?? {})[0] ?? acceptanceRunway.items?.[0] ?? {};
const acceptanceRunwayTarget = acceptanceRunway.items?.find((item) => item.id === acceptanceRunwayRecommended.id) ?? acceptanceRunwayRecommended;
const acceptanceRuntimeId = acceptanceRunwayTarget.runtimeId ?? acceptanceRunwayTarget.id;
const sourceVisualBoardTarget = sourceVisualBoard.items?.[0] ?? {};
const sourceCriticBoardTarget = sourceCriticBoard.items?.[0] ?? {};
const sourceCriticRegenerationTarget = sourceCriticRegeneration.candidates?.[0] ?? {};
const sourceCriticRegenerationDoctorTarget = sourceCriticRegenerationDoctor.target ?? {};
const sourceCriticRegenerationHealthTarget = sourceCriticRegenerationHealth.items?.find((item) => item.id === sourceCriticRegenerationHealth.summary?.nextActionTarget)
  ?? sourceCriticRegenerationHealth.items?.[0]
  ?? {};
const sourceReviewSequencerTarget = sourceReviewSequencer.items?.find((item) => item.id === sourceReviewSequencer.summary?.nextTarget)
  ?? sourceReviewSequencer.items?.[0]
  ?? {};
const sourceReviewTargetPacketTarget = sourceReviewTargetPacket.target ?? {};
const sourceRegenerationWorkspaceTarget = sourceRegenerationWorkspace.target ?? {};
const researchRegenerationHandoffTarget = researchRegenerationHandoff.target ?? {};
const sourceNextReviewTarget = sourceNextReview.target ?? {};
const sourceNextDecisionDraftTarget = sourceNextDecisionDraft.target ?? {};
const sourceCohesionTarget = sourceCohesionReview.items?.[0] ?? {};
const sourceCohesionDecisionTarget = sourceCohesionDecisions.decisions?.[0] ?? {};
const threatAcceptanceDecisionTarget = threatAcceptanceDecisions.decisions?.[0] ?? {};
const acceptanceAuditTarget = acceptanceAuditIndex.items?.[0] ?? {};
const humanSignoffTarget = humanSignoff.items?.[0] ?? {};
const humanAdjudicationTarget = humanAdjudicationBoard.items?.[0] ?? {};
const contentReviewSessionTarget = contentReviewSession.items?.[0] ?? {};
const contentProductionProofTarget = contentProductionProof.items?.[0] ?? {};
const contentPromoteApprovedThreatsTarget = contentPromoteApprovedThreats.items?.[0] ?? {};
const contentSandboxRosterTarget = contentSandboxRoster.items?.[0] ?? {};
const contentArticulationRosterTarget = contentArticulationRoster.items?.[0] ?? {};
const contentReproducibilityTarget = contentReproducibility.items?.[0] ?? {};
const contentSubagentAudit = contentSubagentAuditLedger.audits?.find((audit) => audit.scope === 'source-approval-session-workflow') ?? contentSubagentAuditLedger.audits?.[0] ?? {};
const contentGoalAuditRequirement = contentGoalAudit.requirements?.find((item) => item.id === 'rigorous-20-threat-gate') ?? contentGoalAudit.requirements?.[0] ?? {};
const contentQualityGateRow = contentQualityGateMatrix.rows?.[0] ?? {};
const contentQualityGateNextTarget = contentQualityGateNext.target ?? {};
const runtimeCohesionTarget = runtimeCohesionReview.target ?? {};
const hasSourceGenerationQueue = (sourceQueue.candidates?.length ?? 0) > 0;
const acceptanceRunwayStageChecks = hasSourceGenerationQueue
  ? ['source-image-needed']
  : [acceptanceRunway.summary?.nextBottleneck ?? 'prototype-needs-approved-source', 'strict human source approval is missing'];
const sourceGenerationQueueChecks = hasSourceGenerationQueue
  ? [`tools/source-inbox/${queueTarget}.png`, '#ff00ff']
  : ['queued candidates <strong>0</strong>', 'npm run source:ingest-batch -- --dir tools/source-inbox --strict'];
const runtimeHandoffChecks = approvedRuntimeHandoff.emptyState?.active
  ? [
      'All current 20 source candidates already have runtime prototypes',
      'approved-source-to-runtime handoff is empty',
      'npm run content:runtime-coverage &amp;&amp; npm run content:runtime-coverage-check',
      'npm run sandbox:index &amp;&amp; npm run sandbox:runtime-check',
    ]
  : [
      'npm run sandbox:preview',
      '--with diver',
      'npm run sandbox:visual',
      '--states idle,lunge,stunned',
    ];

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function includesHtml(html, value) {
  return html.includes(value) || html.includes(htmlEscape(value));
}

const pages = [
  {
    path: '/review/sandbox/lab.html?id=abyssal-gulper&with=diver',
    title: 'Water 9 Sandbox Lab',
    required: [
      'Water 9 Sandbox Lab',
      'data-sandbox-lab',
      'data-entity-select',
      'data-with-diver',
      'data-preview-frame',
      'abyssal-gulper',
      'npm run sandbox:preview -- --id abyssal-gulper --with diver',
    ],
  },
  {
    path: '/review/content-acceptance-runway.html',
    title: 'Water 9 Acceptance Runway',
    required: [
      'Water 9 Acceptance Runway',
      'npm run content:acceptance-runway',
      'npm run content:acceptance-runway-check',
      'npm run content:gate',
      'npm run sandbox:preview',
      'npm run content:accept',
      acceptanceRunwayTarget.id,
      acceptanceRunwayTarget.species,
      acceptanceRunwayTarget.sandboxUrl,
      `npm run sandbox:preview -- --id ${acceptanceRuntimeId} --with diver --serve --open --visual`,
      `npm run sandbox:visual -- --ids ${acceptanceRuntimeId} --states idle,lunge,stunned --with diver`,
      `npm run content:accept -- --id ${acceptanceRuntimeId}`,
      '--sandbox-reviewed',
      '--parity-reviewed',
      ...acceptanceRunwayStageChecks,
    ],
  },
  {
    path: '/review/content-acceptance-audits/index.html',
    title: 'Water 9 Content Acceptance Audit Index',
    required: [
      'Water 9 Content Acceptance Audit Index',
      'Preview-only evidence is not final acceptance',
      'Target threats',
      'Source ready',
      'Threat ready',
      'Counts toward gate',
      'Human Review Unlock Queue',
      'Source Approval Dry Run',
      'Threat Acceptance Dry Run',
      'Batch Source Approval Workspace',
      '/review/source-approval-runway.html',
      '/review/source-visual-board.html',
      '/review/source-candidates/source-cohesion-decision-template.html',
      'npm run source:approval-runway &amp;&amp; npm run source:visual-board &amp;&amp; npm run source:cohesion-decisions',
      'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
      'npm run content:acceptance-audit-index',
      'npm run content:acceptance-audit-index-check',
      'npm run content:goal-readiness-strict',
      'npm run source:accept -- --id',
      'npm run content:accept -- --id',
      acceptanceAuditTarget.id,
      acceptanceAuditTarget.species,
      acceptanceAuditTarget.auditHtmlHref,
      acceptanceAuditTarget.sandboxHref?.replaceAll('&', '&amp;'),
      `data-content-acceptance-audit="${acceptanceAuditTarget.id}"`,
      `data-source-approval-command="${acceptanceAuditTarget.id}"`,
      `data-threat-acceptance-command="${acceptanceAuditTarget.id}"`,
    ].filter(Boolean),
  },
  {
    path: '/review/content-human-signoff-queue.html',
    title: 'Water9 Human Content Sign-Off Queue',
    required: [
      'Water9 Human Content Sign-Off Queue',
      'Human-only approval surface for the 20-threat gate',
      'human reviewer required; dry-run commands only',
      'npm run content:human-signoff',
      'npm run content:human-signoff-check',
      'npm run content:goal-gate',
      'npm run source:accept -- --id',
      'npm run content:accept -- --id',
      'data-human-signoff-route',
      humanSignoffTarget.id,
      humanSignoffTarget.species,
      humanSignoffTarget.evidence?.sourceQuickReview,
      humanSignoffTarget.evidence?.contactThumb,
      humanSignoffTarget.evidence?.phaseThumb,
      humanSignoffTarget.evidence?.sourceParityThumb,
      humanSignoffTarget.evidence?.auditHtml,
      `data-human-signoff-route="${humanSignoffTarget.id}"`,
    ].filter(Boolean),
  },
  {
    path: '/review/content-human-adjudication-board.html',
    title: 'Water9 Human Adjudication Board',
    required: [
      'Water9 Human Adjudication Board',
      'Dense human review board for the 20-threat gate',
      'Human Approval Boundary',
      'Automation can gather evidence and produce dry-run commands',
      'npm run content:human-adjudication-board',
      'npm run content:human-adjudication-board-check',
      'data-human-adjudication',
      humanAdjudicationTarget.id,
      humanAdjudicationTarget.species,
      humanAdjudicationTarget.links?.cockpit,
      humanAdjudicationTarget.links?.sourceSandbox,
      humanAdjudicationTarget.links?.runtimeSandbox,
      humanAdjudicationTarget.commands?.sourcePreview,
      humanAdjudicationTarget.commands?.runtimePreview,
      humanAdjudicationTarget.commands?.sourceApprovalDryRun,
      humanAdjudicationTarget.commands?.threatAcceptanceDryRun,
      `data-human-adjudication="${humanAdjudicationTarget.id}"`,
    ].filter(Boolean),
  },
  {
    path: '/review/content-review-session.html',
    title: 'Water9 Content Review Session',
    required: [
      'Water9 Content Review Session',
      'Single-session workspace for human review of the 20-threat gate',
      'Human Approval Boundary',
      'Download source decisions',
      'Download reviewed-only source decisions',
      'Download threat decisions',
      'Download reviewed-only threat decisions',
      'Regenerate decision JSON from controls',
      'Gate truth:',
      'not accepted yet. Ready means reviewable, not approved or accepted.',
      'data-reviewer',
      'data-reviewed-at',
      'data-regenerate-decisions',
      'data-source-decision-output',
      'data-threat-decision-output',
      'data-source-reviewed-decision-output',
      'data-threat-reviewed-decision-output',
      'data-source-check',
      'data-threat-check',
      'data-decision-controls',
      'npm run content:review-session',
      'npm run content:review-session-check',
      'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
      'npm run content:threat-decisions-apply -- --decisions water9-threat-acceptance-decisions.json --strict',
      'npm run content:threat-decisions-apply -- --decisions water9-threat-acceptance-reviewed-decisions.json --strict',
      'data-review-session-target',
      contentReviewSessionTarget.id,
      contentReviewSessionTarget.species,
      contentReviewSessionTarget.commands?.sourcePreview,
      contentReviewSessionTarget.commands?.runtimePreview,
      contentReviewSessionTarget.commands?.sourceApprovalDryRun,
      contentReviewSessionTarget.commands?.threatAcceptanceDryRun,
      `data-review-session-target="${contentReviewSessionTarget.id}"`,
    ].filter(Boolean),
  },
  {
    path: '/review/content-production-proof.html',
    title: 'Water9 Production Proof',
    required: [
      'Water9 Production Proof',
      'Prototype preview is not production acceptance',
      'Acceptance Rule',
      'Strict production ready',
      'npm run content:production-proof',
      'npm run content:production-proof-check',
      'data-production-proof',
      contentProductionProofTarget.id,
      contentProductionProofTarget.species,
      contentProductionProofTarget.productionStatus,
      contentProductionProofTarget.commands?.find((command) => String(command).includes('npm run sandbox:preview')),
      contentProductionProofTarget.commands?.find((command) => String(command).includes('npm run source:accept')),
      contentProductionProofTarget.commands?.find((command) => String(command).includes('npm run content:accept')),
      `data-production-proof="${contentProductionProofTarget.id}"`,
    ].filter(Boolean),
  },
  {
    path: '/review/content-promote-approved-threats.html',
    title: 'Water9 Promote Approved Threats',
    required: [
      'Water9 Promote Approved Threats',
      'Target-only promotion runway',
      'Download target-only threat decisions',
      'data-promote-approved-threats-workspace',
      'data-promote-threat-decisions',
      'npm run content:promote-approved-threats',
      'npm run content:promote-approved-threats-check',
      'npm run content:threat-decisions-apply -- --decisions water9-target-threat-acceptance-decisions.json --strict',
      'data-promote-threat',
      contentPromoteApprovedThreatsTarget.id,
      contentPromoteApprovedThreatsTarget.species,
      contentPromoteApprovedThreatsTarget.commands?.runtimePreview,
      contentPromoteApprovedThreatsTarget.commands?.threatAcceptanceDryRun,
      contentPromoteApprovedThreatsTarget.commands?.applyTargetDecisionsStrict,
      `data-promote-threat="${contentPromoteApprovedThreatsTarget.id}"`,
    ].filter(Boolean),
  },
  {
    path: '/review/content-sandbox-roster.html',
    title: 'Water9 Content Sandbox Roster',
    required: [
      'Water9 Content Sandbox Roster',
      'Quick launch surface for all 20 target threats',
      'Previewable does not mean accepted',
      'npm run content:sandbox-roster',
      'npm run content:sandbox-roster-check',
      'npm run sandbox:preview -- --id &lt;entity-id&gt; --with diver --serve --open --visual',
      'data-sandbox-roster',
      contentSandboxRosterTarget.id,
      contentSandboxRosterTarget.species,
      contentSandboxRosterTarget.runtime?.url,
      contentSandboxRosterTarget.runtime?.pairedUrl,
      contentSandboxRosterTarget.source?.url,
      contentSandboxRosterTarget.source?.pairedUrl,
      contentSandboxRosterTarget.runtime?.pairedPreviewCommand,
      contentSandboxRosterTarget.runtime?.pairedVisualCheckCommand,
      contentSandboxRosterTarget.source?.pairedPreviewCommand,
      contentSandboxRosterTarget.source?.pairedVisualCheckCommand,
      `data-sandbox-roster="${contentSandboxRosterTarget.id}"`,
    ].filter(Boolean),
  },
  {
    path: '/review/content-articulation-roster.html',
    title: 'Water9 Content Articulation Roster',
    required: [
      'Water9 Content Articulation Roster',
      'Source-to-articulation quality path',
      'Previewable and extractable still does not mean accepted',
      'npm run content:articulation-roster',
      'npm run content:articulation-roster-check',
      'npm run articulated:extract-plan -- --plan &lt;plan.json&gt; --dry-run',
      'npm run articulated:source-parity',
      'npm run articulated:visual-cohesion',
      'data-articulation-roster',
      contentArticulationRosterTarget.id,
      contentArticulationRosterTarget.species,
      contentArticulationRosterTarget.source?.path,
      contentArticulationRosterTarget.source?.backgroundKey,
      contentArticulationRosterTarget.commands?.mechanicalPrepare,
      contentArticulationRosterTarget.commands?.extractDryRun,
      contentArticulationRosterTarget.commands?.pairedSandboxPreview,
      contentArticulationRosterTarget.commands?.sourceSandboxPreview,
      `data-articulation-roster="${contentArticulationRosterTarget.id}"`,
    ].filter(Boolean),
  },
  {
    path: '/review/content-reproducibility.html',
    title: 'Water 9 Content Reproducibility',
    required: [
      'Water 9 Content Reproducibility',
      'Target-scoped audit for regenerating magenta source art into articulated runtime previews',
      'does not approve source art or accept threats',
      'npm run content:reproducibility',
      'npm run content:reproducibility-check',
      'npm run articulated:extract-plan -- --plan tools/scratch/&lt;id&gt;-starter-plan.json --dry-run',
      'npm run sandbox:preview -- --id &lt;id&gt; --with diver --serve --open --visual',
      'data-reproducibility-target',
      contentReproducibilityTarget.id,
      contentReproducibilityTarget.species,
      contentReproducibilityTarget.source?.backgroundKey,
      contentReproducibilityTarget.commands?.extractDryRun,
      contentReproducibilityTarget.commands?.pairedSandboxPreview,
      contentReproducibilityTarget.commands?.pairedSandboxVisual,
      `data-reproducibility-target="${contentReproducibilityTarget.id}"`,
    ].filter(Boolean),
  },
  {
    path: '/review/content-subagent-audit-ledger.html',
    title: 'Water 9 Subagent Audit Ledger',
    required: [
      'Water 9 Subagent Audit Ledger',
      'These audits do not approve source art',
      'Independent audit record',
      'sandbox-preview-infrastructure',
      'research-source-trace',
      'source-approval-session-workflow',
      'paired visual checked',
      'human-approved sources',
      'data-content-subagent-audit-ledger',
      contentSubagentAudit.id,
      contentSubagentAudit.agentId,
      contentSubagentAudit.agentNickname,
      contentSubagentAudit.scope,
    ].filter(Boolean),
  },
  {
    path: '/review/content-goal-audit.html',
    title: 'Water 9 Content Goal Audit',
    required: [
      'Water 9 Content Goal Audit',
      'Passing preview checks or mechanical image checks is not content acceptance',
      'Quick sandbox preview for any entity',
      'Subagent research coverage for underwater fauna and flora',
      'Imagen/OpenAI source generation and magenta-key intake',
      'Magenta extraction into articulated in-game entities',
      '20 new underwater threats pass rigorous quality gate',
      'Do not mark the goal complete',
      'data-content-goal-audit',
      'data-accepted-threats',
      `data-content-goal-complete="${contentGoalAudit.complete}"`,
      String(contentGoalAudit.summary?.acceptedThreats ?? 0),
      String(contentGoalAudit.summary?.targetThreats ?? 20),
      contentGoalAuditRequirement.id,
      contentGoalAuditRequirement.status,
      'npm run content:goal-readiness-strict',
    ].filter(Boolean),
  },
  {
    path: '/review/content-quality-gate-matrix.html',
    title: 'Water 9 Quality Gate Matrix',
    required: [
      'Water 9 Quality Gate Matrix',
      'Per-threat execution matrix',
      'does not approve source art',
      'does not accept threats',
      'preview-only evidence',
      'Strict gate eligible',
      'human-source-approval',
      'data-content-quality-gate-matrix',
      'data-strict-goal-complete',
      'data-accepted-threats',
      contentQualityGateRow.id,
      contentQualityGateRow.species,
      contentQualityGateRow.nextGate,
      contentQualityGateRow.commands?.sourcePreview,
      contentQualityGateRow.commands?.runtimePreview,
      contentQualityGateRow.commands?.sourceApprovalDryRun,
      contentQualityGateRow.commands?.threatAcceptanceDryRun,
      `data-quality-gate-row="${contentQualityGateRow.id}"`,
    ].filter(Boolean),
  },
  {
    path: '/review/content-quality-gate-next.html',
    title: 'Water 9 Next Quality Gate Review',
    required: [
      'Water 9 Next Quality Gate Review',
      'Focused packet for the next actionable strict-gate target',
      'does not approve source art',
      'Human review and strict apply gates remain required',
      'Global Visual Blockers',
      'Rejected prototype work stays visible',
      contentQualityGateNext.globalVisualBlockers?.[0]?.targetId,
      contentQualityGateNext.globalVisualBlockers?.[0]?.status,
      'data-content-quality-gate-next',
      'data-quality-gate-next-target',
      'data-next-gate',
      'source art',
      'sandbox lunge',
      contentQualityGateNextTarget.id,
      contentQualityGateNextTarget.species,
      contentQualityGateNextTarget.nextGate,
      contentQualityGateNextTarget.commands?.sourcePreview,
      contentQualityGateNextTarget.commands?.runtimePreview,
      contentQualityGateNextTarget.commands?.sourceApprovalDryRun,
      contentQualityGateNextTarget.commands?.threatAcceptanceDryRun,
      `data-quality-gate-next-target="${contentQualityGateNextTarget.id}"`,
    ].filter(Boolean),
  },
  {
    path: '/review/content-runtime-cohesion-review.html',
    title: 'Water 9 Runtime Cohesion Review',
    required: [
      'Water 9 Runtime Cohesion Review',
      'This page does not approve content automatically',
      'not capability proof',
      'data-runtime-cohesion-review',
      `data-runtime-cohesion-target="${runtimeCohesionTarget.id}"`,
      'data-runtime-cohesion-decision-json',
      '"schema": "water9/content-threat-acceptance-decisions@1"',
      '"status": "needs-review"',
      'source art',
      'source parity overlay',
      'contact sheet',
      'phase strip',
      'sandbox idle',
      'sandbox lunge',
      'sandbox stunned',
      'production-visual-cohesion',
      'sandbox-behavior',
      runtimeCohesionTarget.id,
      runtimeCohesionTarget.species,
      runtimeCohesionReview.commands?.runtimePreview,
      runtimeCohesionReview.commands?.sandboxVisual,
      runtimeCohesionReview.commands?.strictDryRun,
    ].filter(Boolean),
  },
  {
    path: '/review/content-cohort-cohesion-board.html',
    title: 'Water 9 Cohort Cohesion Board',
    required: [
      'Water 9 Cohort Cohesion Board',
      'This board does not approve content automatically',
      'Preview-only rows cannot count toward the 20-threat gate',
      'Cohort Risk Triage',
      'Mechanical Triage',
      'data-risk-flag',
      'data-content-cohort-cohesion-board',
      'data-cohort-target',
      'Source Evidence',
      'Runtime Evidence',
      'source art',
      'source parity overlay',
      'sandbox stunned',
      cohortCohesionBoard.items?.[0]?.id,
      cohortCohesionBoard.items?.[0]?.species,
      cohortCohesionBoard.commands?.rebuild,
      cohortCohesionBoard.commands?.check,
      cohortCohesionBoard.commands?.serveSmoke,
    ].filter(Boolean),
  },
  {
    path: '/review/content-acceptance-doctor.html',
    title: 'Water 9 Acceptance Doctor',
    required: [
      'Water 9 Acceptance Doctor',
      'Read-only compact diagnostic report',
      'Source Blockers',
      'Runtime Blockers',
      'Acceptance Blockers',
      'npm run content:acceptance-doctor',
      'npm run content:acceptance-doctor-check',
    ],
  },
  {
    path: '/review/content-approved-runtime-handoff.html',
    title: 'Water 9 Approved Source Runtime Handoff',
    required: [
      'Water 9 Approved Source Runtime Handoff',
      'Read-only command matrix',
      'Approved Source To Runtime Chain',
      'npm run content:approved-runtime-handoff',
      'npm run content:approved-runtime-handoff-check',
      ...runtimeHandoffChecks,
    ],
  },
  {
    path: '/review/source-candidates/source-generation-queue.html',
    title: 'Water 9 Source Acquisition Board',
    required: [
      'Water 9 Source Acquisition Board',
      'npm run source:generation-queue',
      'npm run source:inbox-capture',
      'npm run source:ingest-batch -- --dir tools/source-inbox --strict',
      'npm run source:check',
      ...sourceGenerationQueueChecks,
    ],
  },
  {
    path: '/review/source-candidates/source-review-dossier.html',
    title: 'Water 9 Source Review Dossier',
    required: [
      'Water 9 Source Review Dossier',
      'npm run source:gallery',
      'npm run source:image-check',
      'npm run source:preview-check',
      'npm run source:review-dossier',
      'npm run source:accept -- --id',
      'magenta key preview',
    ],
  },
  {
    path: '/review/source-candidates/research-dispatch-board.html',
    title: 'Water 9 Research Dispatch Board',
    required: [
      'Water 9 Research Dispatch Board',
      'Per-candidate subagent packets',
      'npm run research:dispatch',
      'npm run research:dispatch-check',
      'npm run sandbox:lab -- --id abyssal-gulper --with diver',
      'source:approval-runway:preview',
    ],
  },
  {
    path: '/review/source-approval-runway.html',
    title: 'Water 9 Source Approval Runway',
    required: [
      'Water 9 Source Approval Runway',
      'Human review queue for source images',
      'Automation can prove readiness; it cannot approve the art',
      'Human Approval Command Builder',
      'data-source-approval-command-builder',
      'data-build-command',
      'data-command-output',
      'plan preview',
      sourceApprovalTarget.id,
      sourceApprovalTarget.species,
      sourceApprovalTarget.links?.source,
      sourceApprovalTarget.links?.keyPreview,
      sourceApprovalTarget.links?.sandboxScreenshot,
      sourceApprovalTarget.links?.sandboxLab,
      sourceApprovalTarget.links?.sourceSandboxLive,
      sourceApprovalTarget.links?.runtimeSandboxLive,
      sourceApprovalTarget.links?.planPreview,
      'Live Sandbox Review',
      'sandbox lab',
      'source + diver',
      'runtime + diver',
      `npm run sandbox:preview -- --id source-${sourceApprovalTarget.id} --with diver --serve --open --visual`,
      `npm run sandbox:preview -- --id ${sourceApprovalTarget.id} --with diver --serve --open --visual`,
    ].filter(Boolean),
  },
  {
    path: '/review/source-candidates/source-approval-session.html',
    title: 'Water 9 Source Approval Session',
    required: [
      'Water 9 Source Approval Session',
      'This page does not approve content automatically',
      'data-source-approval-session',
      'data-source-approval-step',
      'review-focused-target',
      'focused next review',
      'source-next-review.html',
      'prepare-focused-decision-draft',
      'focused decision draft',
      'source-next-decision-draft.html',
      'batch decision workspace',
      'source-cohesion-decision-template.html',
      'water9-source-cohesion-reviewed-decisions.json',
      'npm run source:next-review &amp;&amp; npm run source:next-review-check &amp;&amp; npm run source:next-review:serve-smoke',
      'npm run source:next-decision-draft &amp;&amp; npm run source:next-decision-draft-check &amp;&amp; npm run source:next-decision-draft:serve-smoke',
      'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
      sourceApprovalSessionTarget.id,
      sourceApprovalSessionTarget.species,
      sourceApprovalSessionTarget.links?.source,
      sourceApprovalSessionTarget.links?.keyPreview,
      sourceApprovalSessionTarget.links?.sandboxScreenshot,
      sourceApprovalSessionTarget.links?.planPreview,
      sourceApprovalSessionTarget.evidenceFingerprintDigest,
    ].filter(Boolean),
  },
  {
    path: '/review/source-candidates/source-approval-marathon.html',
    title: 'Water 9 Source Approval Marathon',
    required: [
      'Source Approval Marathon',
      'All approval-ready source candidates in one pass',
      'Human-authored decisions and strict apply remain mandatory',
      'does not approve source art',
      'data-source-approval-marathon',
      'data-approval-marathon-item',
      'data-source-decision-starter',
      'data-approval-marathon-export',
      'data-build-reviewed-decisions',
      'data-reviewed-decision-output',
      'reviewed-only decision file',
      'high-risk',
      'medium-risk',
      'water9-source-cohesion-reviewed-decisions.json',
      sourceApprovalMarathonTarget.id,
      sourceApprovalMarathonTarget.species,
      sourceApprovalMarathonTarget.evidenceFingerprintDigest,
      sourceApprovalMarathonTarget.commands?.sourcePreview,
      sourceApprovalMarathonTarget.commands?.runtimePreview,
    ].filter(Boolean),
  },
  {
    path: '/review/source-candidates/source-replace-runway.html',
    title: 'Water 9 Source Replace Runway',
    required: [
      'Water 9 Source Replace Runway',
      'intentional overwrite',
      'rejects byte-identical no-op replacements',
      'does not approve source art',
      'Replacement Boundary',
      'data-source-replace-candidate',
      sourceReplaceTarget.id,
      sourceReplaceTarget.species,
      sourceReplaceTarget.promptFile,
      sourceReplaceTarget.links?.source,
      sourceReplaceTarget.links?.keyPreview,
      sourceReplaceTarget.links?.sandboxScreenshot,
      sourceReplaceTarget.links?.planPreview,
      sourceReplaceTarget.commands?.captureReplacement,
      sourceReplaceTarget.commands?.validateInbox,
      sourceReplaceTarget.commands?.dryRunReplace,
      sourceReplaceTarget.commands?.applyReplace,
      sourceReplaceTarget.commands?.imageCheck,
      sourceReplaceTarget.commands?.sourcePreview,
      '--overwrite',
      '--allow-identical-overwrite',
      '--dry-run',
      '/review/source-approval-runway.html',
      '/review/source-visual-board.html',
    ].filter(Boolean),
  },
  {
    path: '/review/source-candidates/source-next-review.html',
    title: 'Water9 Next Source Review',
    required: [
      'Next Source Review',
      'Focused source-approval packet',
      'does not approve content',
      'Gate truth:',
      'not approved yet',
      'Dry-Run Commands',
      'Focused Decision JSON Starter',
      'data-source-next-review',
      `data-source-next-review-target="${sourceNextReviewTarget.id}"`,
      `data-focused-decision-starter="${sourceNextReviewTarget.id}"`,
      'data-source-next-review-decision-json',
      '"schema": "water9/source-cohesion-decisions@1"',
      '"reviewer": "<human-reviewer>"',
      '"status": "needs-review"',
      sourceNextReviewTarget.id,
      sourceNextReviewTarget.species,
      sourceNextReviewTarget.media?.source,
      sourceNextReviewTarget.media?.keyPreview,
      sourceNextReviewTarget.media?.sandboxScreenshot,
      sourceNextReviewTarget.media?.planPreview,
      sourceNextReviewTarget.commands?.sourcePreview,
      sourceNextReviewTarget.commands?.runtimePreview,
      sourceNextReviewTarget.commands?.acceptDryRun,
      sourceNextReviewTarget.commands?.rejectDryRun,
      '--dry-run',
      '--source-visual-board public/review/source-visual-board.json',
    ].filter(Boolean),
  },
  {
    path: '/review/source-candidates/source-next-decision-draft.html',
    title: 'Water 9 Next Source Decision Draft',
    required: [
      'Water 9 Next Source Decision Draft',
      'This focused draft does not approve source art',
      'Focused reviewed-only decision draft',
      'water9-source-cohesion-reviewed-decisions.json',
      'data-source-next-decision-draft',
      `data-source-next-decision-target="${sourceNextDecisionDraftTarget.id}"`,
      'data-source-next-decision-json',
      '"schema": "water9/source-cohesion-decisions@1"',
      '"status": "needs-review"',
      '"failedChecks": []',
      sourceNextDecisionDraftTarget.id,
      sourceNextDecisionDraftTarget.species,
      sourceNextDecisionDraftTarget.media?.source,
      sourceNextDecisionDraftTarget.media?.keyPreview,
      sourceNextDecisionDraftTarget.media?.sandboxScreenshot,
      sourceNextDecisionDraftTarget.media?.planPreview,
      sourceNextDecisionDraft.commands?.strictDryRun,
      sourceNextDecisionDraft.commands?.strictApply,
    ].filter(Boolean),
  },
  {
    path: '/review/source-visual-board.html',
    title: 'Water 9 Source Visual Board',
    required: [
      'Water 9 Source Visual Board',
      'This board exists to expose weak cohesion before approval',
      'visual review evidence, not production acceptance',
      'ready for human source review',
      'next gate',
      'magenta key',
      'sandbox source preview',
      'articulation plan preview',
      'data-source-visual-board-candidate',
      sourceVisualBoardTarget.id,
      sourceVisualBoardTarget.species,
      sourceVisualBoardTarget.media?.source,
      sourceVisualBoardTarget.media?.keyPreview,
      sourceVisualBoardTarget.media?.sandboxScreenshot,
      sourceVisualBoardTarget.media?.planPreview,
      sourceVisualBoardTarget.links?.quickReview,
      sourceVisualBoardTarget.links?.sourceRunway,
    ].filter(Boolean),
  },
  {
    path: '/review/source-candidates/source-critic-board.html',
    title: 'Water 9 Source Critic Board',
    required: [
      'Water 9 Source Critic Board',
      'Advisory pre-approval critique board',
      'does not approve source art or accept threats',
      'Regenerate If Observed',
      'Review Questions',
      'Animation Risk',
      'npm run source:critic-board',
      'npm run source:critic-board-check',
      'data-source-critic',
      sourceCriticBoardTarget.id,
      sourceCriticBoardTarget.species,
      sourceCriticBoardTarget.laneTitle,
      sourceCriticBoardTarget.media?.source,
      sourceCriticBoardTarget.media?.quickReview,
      sourceCriticBoardTarget.commands?.sourcePreview,
      `data-source-critic="${sourceCriticBoardTarget.id}"`,
    ].filter(Boolean),
  },
  {
    path: '/review/source-candidates/source-critic-regeneration-queue.html',
    title: 'Water 9 Critic Regeneration Queue',
    required: [
      'Water 9 Critic Regeneration Queue',
      'Focused replacement queue for source candidates with explicit regenerate findings',
      'This does not approve any source art',
      'Cohesion Failures To Fix',
      'Animation Risk',
      'npm run source:critic-regeneration',
      'npm run source:critic-regeneration-check',
      'source-critic-regeneration-queue.json',
      'data-critic-regeneration',
      sourceCriticRegenerationTarget.id,
      sourceCriticRegenerationTarget.species,
      sourceCriticRegenerationTarget.lane,
      sourceCriticRegenerationTarget.links?.source,
      sourceCriticRegenerationTarget.links?.sandboxPreview,
      sourceCriticRegenerationTarget.links?.planPreview,
      sourceCriticRegenerationTarget.commands?.generateOpenAiDryRun,
      sourceCriticRegenerationTarget.commands?.dryRunReplace,
      sourceCriticRegenerationTarget.commands?.sourcePreview,
      `data-critic-regeneration="${sourceCriticRegenerationTarget.id}"`,
    ].filter(Boolean),
  },
  {
    path: '/review/source-candidates/source-critic-regeneration-doctor.html',
    title: 'Water 9 Critic Regeneration Doctor',
    required: [
      'Water 9 Critic Regeneration Doctor',
      'does not approve source art',
      'Expected Replacement Files',
      'Inbox Files',
      'Next Commands',
      'tools/source-inbox',
      'source-critic-regeneration-queue.html#next-regeneration-target',
      sourceCriticRegenerationDoctorTarget.id,
      sourceCriticRegenerationDoctorTarget.species,
      sourceCriticRegenerationDoctorTarget.status,
      sourceCriticRegenerationDoctorTarget.promptFile,
      sourceCriticRegenerationDoctorTarget.commands?.[0],
      `data-critic-regeneration-doctor="${sourceCriticRegenerationDoctorTarget.id}"`,
    ].filter(Boolean),
  },
  {
    path: '/review/source-candidates/source-critic-regeneration-health.html',
    title: 'Water 9 Critic Regeneration Health',
    required: [
      'Water 9 Critic Regeneration Health',
      'does not approve source art',
      'Distinct replacements ready',
      'Valid no-op replacements',
      'Missing replacements',
      'data-critic-regeneration-health',
      sourceCriticRegenerationHealthTarget.id,
      sourceCriticRegenerationHealthTarget.species,
      sourceCriticRegenerationHealthTarget.status,
      sourceCriticRegenerationHealthTarget.nextAction,
      sourceCriticRegenerationHealthTarget.nextCommands?.[0],
      `data-critic-regeneration-health-row="${sourceCriticRegenerationHealthTarget.id}"`,
    ].filter(Boolean),
  },
  {
    path: '/review/source-candidates/source-review-sequencer.html',
    title: 'Water 9 Source Review Sequencer',
    required: [
      'Water 9 Source Review Sequencer',
      'does not approve source art',
      'does not accept threats',
      'Preview-only rows do not count toward the 20-threat gate',
      'data-source-review-sequencer',
      'regenerate-noop',
      'approval-ready',
      sourceReviewSequencerTarget.id,
      sourceReviewSequencerTarget.species,
      sourceReviewSequencerTarget.lane,
      sourceReviewSequencerTarget.status,
      sourceReviewSequencerTarget.nextCommands?.[0],
      `data-source-review-sequencer-row="${sourceReviewSequencerTarget.id}"`,
    ].filter(Boolean),
  },
  {
    path: '/review/source-candidates/source-review-target-packet.html',
    title: 'Water 9 Source Review Target Packet',
    required: [
      'Water 9 Source Review Target Packet',
      'does not approve source art',
      'does not accept threats',
      'does not count preview-only work toward the 20-threat gate',
      'Command Boundary',
      'Critic Prompt',
      'Quality Gate Boundary',
      'data-source-review-target-packet',
      sourceReviewTargetPacketTarget.id,
      sourceReviewTargetPacketTarget.species,
      sourceReviewTargetPacketTarget.lane,
      sourceReviewTargetPacketTarget.status,
      sourceReviewTargetPacketTarget.nextCommands?.[0],
      `data-source-review-target="${sourceReviewTargetPacketTarget.id}"`,
    ].filter(Boolean),
  },
  {
    path: '/review/source-candidates/source-regeneration-workspace.html',
    title: 'Water 9 Source Regeneration Workspace',
    required: [
      'Water 9 Source Regeneration Workspace',
      'does not approve source art',
      'does not accept threats',
      'does not count preview-only work toward the 20-threat gate',
      'Command Boundary',
      'Source / Inbox Fingerprints',
      'Safe Next Commands',
      'Distinct Replacement Gate',
      'data-source-regeneration-workspace',
      sourceRegenerationWorkspaceTarget.id,
      sourceRegenerationWorkspaceTarget.species,
      sourceRegenerationWorkspaceTarget.lane,
      sourceRegenerationWorkspaceTarget.status,
      sourceRegenerationWorkspaceTarget.source?.sha256,
      sourceRegenerationWorkspaceTarget.inbox?.sha256,
      sourceRegenerationWorkspaceTarget.commands?.safeNext?.[0],
      `data-source-regeneration-target="${sourceRegenerationWorkspaceTarget.id}"`,
    ].filter(Boolean),
  },
  {
    path: '/review/source-candidates/research-regeneration-handoff.html',
    title: 'Water 9 Research Regeneration Handoff',
    required: [
      'Water 9 Research Regeneration Handoff',
      'does not approve source art',
      'does not accept threats',
      'does not count preview-only work toward the strict 20-threat gate',
      'Subagent Finding',
      'Source Generation Risks',
      'Suggested Prompt Patches',
      'Regeneration Prompt Alignment',
      'Safe Handoff Commands',
      'Command Boundary',
      'data-research-regeneration-handoff',
      researchRegenerationHandoffTarget.id,
      researchRegenerationHandoffTarget.species,
      researchRegenerationHandoffTarget.lane,
      researchRegenerationHandoffTarget.regenerationLane,
      researchRegenerationHandoffTarget.healthStatus,
      researchRegenerationHandoffTarget.auditFile,
      researchRegenerationHandoffTarget.dispatchPacket,
      researchRegenerationHandoff.commands?.[0],
      `data-research-regeneration-target="${researchRegenerationHandoffTarget.id}"`,
    ].filter(Boolean),
  },
  {
    path: '/review/source-candidates/source-cohesion-review.html',
    title: 'Water 9 Source Cohesion Review',
    required: [
      'Water 9 Source Cohesion Review',
      'Prototype-vs-production boundary',
      'Prototype screenshots do not count toward the strict 20-threat gate',
      'Automation packages evidence; only a human can approve cohesion',
      'npm run source:cohesion-review',
      'npm run source:cohesion-review-check',
      sourceCohesionTarget.id,
      sourceCohesionTarget.species,
      sourceCohesionTarget.links?.source,
      sourceCohesionTarget.links?.keyPreview,
      sourceCohesionTarget.links?.sandboxScreenshot,
      sourceCohesionTarget.links?.planPreview,
    ].filter(Boolean),
  },
  {
    path: '/review/source-candidates/source-cohesion-decision-template.html',
    title: 'Water 9 Source Cohesion Batch Decisions',
    required: [
      'Water 9 Source Cohesion Batch Decisions',
      'Structured human-review handoff',
      'This page does not approve content automatically',
      'Evidence Preview',
      'Decision JSON Starter',
      'Batch Decision Workspace',
      'data-decision-workspace',
      'data-decision-output',
      'Download reviewed decision file',
      'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
      'npm run source:cohesion-decisions',
      'npm run source:cohesion-decisions-check',
      'npm run source:cohesion-decisions-apply',
      sourceCohesionDecisionTarget.id,
      sourceCohesionDecisionTarget.species,
      sourceCohesionDecisionTarget.evidence?.source,
      sourceCohesionDecisionTarget.evidence?.keyPreview,
      sourceCohesionDecisionTarget.evidence?.sandboxScreenshot,
      sourceCohesionDecisionTarget.evidence?.planPreview,
    ].filter(Boolean),
  },
  {
    path: '/review/content-threat-acceptance-decision-template.html',
    title: 'Water 9 Threat Acceptance Batch Decisions',
    required: [
      'Water 9 Threat Acceptance Batch Decisions',
      'Structured human-review handoff',
      'This page does not approve content automatically',
      'Batch Threat Decision Workspace',
      'data-threat-decision-workspace',
      'data-threat-decision-output',
      'Download decision file',
      'npm run content:threat-decisions',
      'npm run content:threat-decisions-check',
      'npm run content:threat-decisions-apply -- --decisions water9-threat-acceptance-decisions.json --strict',
      'npm run content:acceptance-audit -- --id',
      'npm run content:accept -- --id',
      '--source-reviewed',
      '--contact-reviewed',
      '--phase-reviewed',
      '--parity-reviewed',
      '--sandbox-reviewed',
      threatAcceptanceDecisionTarget.id,
      threatAcceptanceDecisionTarget.species,
      threatAcceptanceDecisionTarget.evidence?.source,
      threatAcceptanceDecisionTarget.evidence?.sandbox,
    ].filter(Boolean),
  },
  {
    path: '/review/source-candidates/quick-reviews/index.html',
    title: 'Water 9 Source Quick Reviews',
    required: [
      'Water 9 Source Quick Reviews',
      'Human source-approval review index',
      'Accept command',
      'Reject command',
      sourceReviewTarget.id,
      sourceReviewTarget.species,
      sourceReviewTarget.href,
      sourceReviewTarget.links?.source,
      sourceReviewTarget.links?.keyPreview,
      sourceReviewTarget.links?.sandboxScreenshot,
      sourceReviewTarget.links?.planPreview,
    ].filter(Boolean),
  },
  {
    path: '/review/source-candidates/source-workstation.html',
    title: 'Water 9 Source Workstation',
    required: [
      'Source Workstation',
      'Generation Prompt',
      'Required Read',
      'Recent Rejections',
      'npm run source:workstation',
      'npm run source:inbox-capture',
      `npm run source:inbox-capture -- --id ${workstationTarget} --open`,
      workstationPreviewUrl,
      `tools/source-inbox/${workstationTarget}.png`,
      '#ff00ff',
    ],
  },
];

const only = String(args.get('only') ?? '').trim();
const selectedPages = only
  ? pages.filter((page) => page.path === only || page.path.endsWith(only) || page.title === only)
  : pages;
if (only && selectedPages.length === 0) {
  console.error(JSON.stringify({
    schema: 'water9/review-page-preview-smoke@1',
    baseUrl: null,
    pages: [],
    failures: [`no review smoke page matched --only ${only}`],
  }, null, 2));
  process.exit(1);
}

async function portAvailable(candidatePort) {
  return new Promise((resolveAvailable) => {
    const server = createServer();
    server.once('error', () => resolveAvailable(false));
    server.once('listening', () => server.close(() => resolveAvailable(true)));
    server.listen(candidatePort, host);
  });
}

async function findOpenPort(start) {
  for (let candidate = start; candidate < start + 100; candidate += 1) {
    if (await portAvailable(candidate)) return candidate;
  }
  throw new Error(`No open port found from ${start} to ${start + 99}`);
}

async function waitForServer(baseUrl, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 180));
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function startServer() {
  port = await findOpenPort(port);
  const child = spawn('node_modules/.bin/vite', ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });
  try {
    await waitForServer(`http://${host}:${port}`);
  } catch (error) {
    child.kill('SIGTERM');
    throw new Error(`${error.message}\nVite output:\n${output}`);
  }
  return child;
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  await new Promise((resolveStop) => {
    const killGroup = (signal) => {
      try {
        process.kill(-child.pid, signal);
      } catch {
        try { child.kill(signal); } catch { /* Already stopped. */ }
      }
    };
    const timer = setTimeout(() => {
      if (child.exitCode === null) killGroup('SIGKILL');
      resolveStop();
    }, 1500);
    child.once('exit', () => {
      clearTimeout(timer);
      resolveStop();
    });
    killGroup('SIGTERM');
  });
}

const failures = [];
let child = null;
try {
  child = await startServer();
  const baseUrl = `http://${host}:${port}`;
  for (const page of selectedPages) {
    const url = `${baseUrl}${page.path}`;
    const response = await fetch(url);
    if (!response.ok) {
      failures.push(`${page.path}: HTTP ${response.status}`);
      continue;
    }
    const html = await response.text();
    for (const expected of page.required) {
      if (!includesHtml(html, expected)) failures.push(`${page.path}: missing ${expected}`);
    }
  }
  console.log(JSON.stringify({
    schema: 'water9/review-page-preview-smoke@1',
    baseUrl,
    pages: selectedPages.map((page) => page.path),
    failures,
  }, null, 2));
} catch (error) {
  failures.push(error.message);
  console.error(JSON.stringify({
    schema: 'water9/review-page-preview-smoke@1',
    baseUrl: null,
    pages: selectedPages.map((page) => page.path),
    failures,
  }, null, 2));
  process.exitCode = 1;
} finally {
  await stop(child);
}

if (failures.length) process.exitCode = 1;

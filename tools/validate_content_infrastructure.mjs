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

const minThreats = Number(args.get('min-threats') ?? 20);
const paths = {
  packageJson: resolve('package.json'),
  reviewPagePreviewTest: resolve('tools/test_review_page_previews.mjs'),
  contentReviewSessionWorkspaceSmokeTest: resolve('tools/test_content_review_session_workspace.mjs'),
  contentReviewSessionStrictRoundtripSmokeTest: resolve('tools/test_content_review_session_strict_roundtrip.mjs'),
  sandboxPairedTargetVisualSmokeTest: resolve('tools/test_sandbox_paired_target_visuals.mjs'),
  sandboxPreviewAuditTest: resolve('tools/test_sandbox_preview_audit.mjs'),
  sourceApprovalRunwayPreviewTest: resolve('tools/test_source_approval_runway_preview.mjs'),
  sourceReplaceRunwayPreviewTest: resolve('tools/test_source_replace_runway_preview.mjs'),
  sourceReplacementArchiveTest: resolve('tools/test_source_replacement_archive.mjs'),
  threatEvidenceFingerprintModule: resolve('tools/content_threat_evidence_fingerprint.mjs'),
  threatDecisionApplyTool: resolve('tools/apply_content_threat_acceptance_decisions.mjs'),
  threatDecisionApplySmokeTest: resolve('tools/test_content_threat_acceptance_decision_apply_smoke.mjs'),
  syntheticDecisionGuardsValidator: resolve('tools/validate_synthetic_decision_guards.mjs'),
  threatAcceptTool: resolve('tools/accept_articulated_creature.mjs'),
  threatGateTool: resolve('tools/validate_content_gate.mjs'),
  contentAcceptanceRunwayPreviewTest: resolve('tools/test_content_acceptance_runway_preview.mjs'),
  sourceCohesionDecisionApplySmokeTest: resolve('tools/test_source_cohesion_decision_apply_smoke.mjs'),
  sandboxManifest: resolve(String(args.get('sandbox') ?? 'public/review/sandbox/manifest.json')),
  sandboxQuickstart: resolve(String(args.get('sandbox-quickstart') ?? 'public/review/sandbox/quickstart.json')),
  sandboxQuickstartMarkdown: resolve(String(args.get('sandbox-quickstart-markdown') ?? 'public/review/sandbox/quickstart.md')),
  sandboxQuickstartHtml: resolve(String(args.get('sandbox-quickstart-html') ?? 'public/review/sandbox/quickstart.html')),
  sandboxVisualReport: resolve(String(args.get('sandbox-visual-report') ?? 'tools/scratch/sandbox-visuals-report.json')),
  sandboxPairedVisualReport: resolve(String(args.get('sandbox-paired-visual-report') ?? 'tools/scratch/sandbox-paired-visuals-report.json')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  sourceReview: resolve(String(args.get('source-review') ?? 'public/review/source-candidates/review-manifest.json')),
  sourceRejections: resolve(String(args.get('source-rejections') ?? 'public/review/source-candidates/rejected-attempts.json')),
  sourceReviewDossier: resolve(String(args.get('source-review-dossier') ?? 'public/review/source-candidates/source-review-dossier.json')),
  sourceReviewDossierHtml: resolve(String(args.get('source-review-dossier-html') ?? 'public/review/source-candidates/source-review-dossier.html')),
  sourceApprovalRunway: resolve(String(args.get('source-approval-runway') ?? 'public/review/source-approval-runway.json')),
  sourceApprovalChecklist: resolve(String(args.get('source-approval-checklist') ?? 'public/review/source-approval-checklist.json')),
  sourceApprovalRunwayHtml: resolve(String(args.get('source-approval-runway-html') ?? 'public/review/source-approval-runway.html')),
  sourceApprovalSession: resolve(String(args.get('source-approval-session') ?? 'public/review/source-candidates/source-approval-session.json')),
  sourceApprovalSessionMarkdown: resolve(String(args.get('source-approval-session-markdown') ?? 'public/review/source-candidates/source-approval-session.md')),
  sourceApprovalSessionHtml: resolve(String(args.get('source-approval-session-html') ?? 'public/review/source-candidates/source-approval-session.html')),
  sourceApprovalMarathon: resolve(String(args.get('source-approval-marathon') ?? 'public/review/source-candidates/source-approval-marathon.json')),
  sourceApprovalMarathonMarkdown: resolve(String(args.get('source-approval-marathon-markdown') ?? 'public/review/source-candidates/source-approval-marathon.md')),
  sourceApprovalMarathonHtml: resolve(String(args.get('source-approval-marathon-html') ?? 'public/review/source-candidates/source-approval-marathon.html')),
  sourceApprovalMarathonWorkspaceSmokeTest: resolve('tools/test_source_approval_marathon_workspace.mjs'),
  sourceApprovalMarathonFullBatchSmokeTest: resolve('tools/test_source_approval_marathon_full_batch_workspace.mjs'),
  sourceReplaceRunway: resolve(String(args.get('source-replace-runway') ?? 'public/review/source-candidates/source-replace-runway.json')),
  sourceReplaceRunwayMarkdown: resolve(String(args.get('source-replace-runway-markdown') ?? 'public/review/source-candidates/source-replace-runway.md')),
  sourceReplaceRunwayHtml: resolve(String(args.get('source-replace-runway-html') ?? 'public/review/source-candidates/source-replace-runway.html')),
  sourceVisualBoard: resolve(String(args.get('source-visual-board') ?? 'public/review/source-visual-board.json')),
  sourceVisualBoardMarkdown: resolve(String(args.get('source-visual-board-markdown') ?? 'public/review/source-visual-board.md')),
  sourceVisualBoardHtml: resolve(String(args.get('source-visual-board-html') ?? 'public/review/source-visual-board.html')),
  sourceCriticBoard: resolve(String(args.get('source-critic-board') ?? 'public/review/source-candidates/source-critic-board.json')),
  sourceCriticBoardMarkdown: resolve(String(args.get('source-critic-board-markdown') ?? 'public/review/source-candidates/source-critic-board.md')),
  sourceCriticBoardHtml: resolve(String(args.get('source-critic-board-html') ?? 'public/review/source-candidates/source-critic-board.html')),
  sourceCriticRegeneration: resolve(String(args.get('source-critic-regeneration') ?? 'public/review/source-candidates/source-critic-regeneration-queue.json')),
  sourceCriticRegenerationMarkdown: resolve(String(args.get('source-critic-regeneration-markdown') ?? 'public/review/source-candidates/source-critic-regeneration-queue.md')),
  sourceCriticRegenerationHtml: resolve(String(args.get('source-critic-regeneration-html') ?? 'public/review/source-candidates/source-critic-regeneration-queue.html')),
  sourceCriticRegenerationDoctor: resolve(String(args.get('source-critic-regeneration-doctor') ?? 'public/review/source-candidates/source-critic-regeneration-doctor.json')),
  sourceCriticRegenerationDoctorMarkdown: resolve(String(args.get('source-critic-regeneration-doctor-markdown') ?? 'public/review/source-candidates/source-critic-regeneration-doctor.md')),
  sourceCriticRegenerationDoctorHtml: resolve(String(args.get('source-critic-regeneration-doctor-html') ?? 'public/review/source-candidates/source-critic-regeneration-doctor.html')),
  sourceCriticRegenerationHealth: resolve(String(args.get('source-critic-regeneration-health') ?? 'public/review/source-candidates/source-critic-regeneration-health.json')),
  sourceCriticRegenerationHealthMarkdown: resolve(String(args.get('source-critic-regeneration-health-markdown') ?? 'public/review/source-candidates/source-critic-regeneration-health.md')),
  sourceCriticRegenerationHealthHtml: resolve(String(args.get('source-critic-regeneration-health-html') ?? 'public/review/source-candidates/source-critic-regeneration-health.html')),
  sourceReviewSequencer: resolve(String(args.get('source-review-sequencer') ?? 'public/review/source-candidates/source-review-sequencer.json')),
  sourceReviewSequencerMarkdown: resolve(String(args.get('source-review-sequencer-markdown') ?? 'public/review/source-candidates/source-review-sequencer.md')),
  sourceReviewSequencerHtml: resolve(String(args.get('source-review-sequencer-html') ?? 'public/review/source-candidates/source-review-sequencer.html')),
  sourceReviewTargetPacket: resolve(String(args.get('source-review-target-packet') ?? 'public/review/source-candidates/source-review-target-packet.json')),
  sourceReviewTargetPacketMarkdown: resolve(String(args.get('source-review-target-packet-markdown') ?? 'public/review/source-candidates/source-review-target-packet.md')),
  sourceReviewTargetPacketHtml: resolve(String(args.get('source-review-target-packet-html') ?? 'public/review/source-candidates/source-review-target-packet.html')),
  sourceRegenerationWorkspace: resolve(String(args.get('source-regeneration-workspace') ?? 'public/review/source-candidates/source-regeneration-workspace.json')),
  sourceRegenerationWorkspaceMarkdown: resolve(String(args.get('source-regeneration-workspace-markdown') ?? 'public/review/source-candidates/source-regeneration-workspace.md')),
  sourceRegenerationWorkspaceHtml: resolve(String(args.get('source-regeneration-workspace-html') ?? 'public/review/source-candidates/source-regeneration-workspace.html')),
  sourceCohesionReview: resolve(String(args.get('source-cohesion-review') ?? 'public/review/source-candidates/source-cohesion-review.json')),
  sourceCohesionReviewHtml: resolve(String(args.get('source-cohesion-review-html') ?? 'public/review/source-candidates/source-cohesion-review.html')),
  sourceCohesionDecisions: resolve(String(args.get('source-cohesion-decisions') ?? 'public/review/source-candidates/source-cohesion-decision-template.json')),
  sourceCohesionDecisionsHtml: resolve(String(args.get('source-cohesion-decisions-html') ?? 'public/review/source-candidates/source-cohesion-decision-template.html')),
  sourceCohesionDecisionRun: resolve(String(args.get('source-cohesion-decision-run') ?? 'public/review/source-candidates/source-cohesion-decision-run-report.json')),
  sourceReviewQueue: resolve(String(args.get('source-review-queue') ?? 'public/review/source-candidates/quick-reviews/index.json')),
  sourceReviewQueueHtml: resolve(String(args.get('source-review-queue-html') ?? 'public/review/source-candidates/quick-reviews/index.html')),
  sourceQueue: resolve(String(args.get('source-queue') ?? 'public/review/source-candidates/source-generation-queue.json')),
  sourceQueueHtml: resolve(String(args.get('source-queue-html') ?? 'public/review/source-candidates/source-generation-queue.html')),
  sourceSprint: resolve(String(args.get('source-sprint') ?? 'public/review/source-candidates/source-generation-sprint.json')),
  sourceAcquisitionRunbook: resolve(String(args.get('source-acquisition-runbook') ?? 'public/review/source-candidates/source-acquisition-runbook.json')),
  sourceAcquisitionRunbookMarkdown: resolve(String(args.get('source-acquisition-runbook-markdown') ?? 'public/review/source-candidates/source-acquisition-runbook.md')),
  sourceAcquisitionRunbookHtml: resolve(String(args.get('source-acquisition-runbook-html') ?? 'public/review/source-candidates/source-acquisition-runbook.html')),
  sourceRecoveryScout: resolve(String(args.get('source-recovery-scout') ?? 'public/review/source-candidates/source-recovery-scout.json')),
  sourceRecoveryScoutMarkdown: resolve(String(args.get('source-recovery-scout-markdown') ?? 'public/review/source-candidates/source-recovery-scout.md')),
  sourceRecoveryScoutHtml: resolve(String(args.get('source-recovery-scout-html') ?? 'public/review/source-candidates/source-recovery-scout.html')),
  sourceIngestReadiness: resolve(String(args.get('source-ingest-readiness') ?? 'public/review/source-candidates/source-ingest-readiness.json')),
  sourceIngestReadinessMarkdown: resolve(String(args.get('source-ingest-readiness-markdown') ?? 'public/review/source-candidates/source-ingest-readiness.md')),
  sourceIngestReadinessHtml: resolve(String(args.get('source-ingest-readiness-html') ?? 'public/review/source-candidates/source-ingest-readiness.html')),
  sourceInboxHandoff: resolve(String(args.get('source-inbox-handoff') ?? 'tools/source-inbox/source-inbox-handoff.json')),
  sourceInboxHandoffMarkdown: resolve(String(args.get('source-inbox-handoff-markdown') ?? 'tools/source-inbox/HANDOFF.md')),
  sourceInboxReview: resolve(String(args.get('source-inbox-review') ?? 'public/review/source-inbox/manifest.json')),
  sourceIntakeRunway: resolve(String(args.get('source-intake-runway') ?? 'public/review/source-candidates/source-intake-runway.json')),
  sourceIntakeRunwayHtml: resolve(String(args.get('source-intake-runway-html') ?? 'public/review/source-candidates/source-intake-runway.html')),
  sourceIntakeDoctor: resolve(String(args.get('source-intake-doctor') ?? 'public/review/source-candidates/source-intake-doctor.json')),
  sourceIntakeDoctorHtml: resolve(String(args.get('source-intake-doctor-html') ?? 'public/review/source-candidates/source-intake-doctor.html')),
  sourceIntakeDoctorMarkdown: resolve(String(args.get('source-intake-doctor-markdown') ?? 'public/review/source-candidates/source-intake-doctor.md')),
  sourceWorkstation: resolve(String(args.get('source-workstation') ?? 'public/review/source-candidates/source-workstation.json')),
  sourceWorkstationHtml: resolve(String(args.get('source-workstation-html') ?? 'public/review/source-candidates/source-workstation.html')),
  sourceWorkstationMarkdown: resolve(String(args.get('source-workstation-markdown') ?? 'public/review/source-candidates/source-workstation.md')),
  sourceNextReview: resolve(String(args.get('source-next-review') ?? 'public/review/source-candidates/source-next-review.json')),
  sourceNextReviewHtml: resolve(String(args.get('source-next-review-html') ?? 'public/review/source-candidates/source-next-review.html')),
  sourceNextDecisionDraft: resolve(String(args.get('source-next-decision-draft') ?? 'public/review/source-candidates/source-next-decision-draft.json')),
  sourceNextDecisionDraftMarkdown: resolve(String(args.get('source-next-decision-draft-markdown') ?? 'public/review/source-candidates/source-next-decision-draft.md')),
  sourceNextDecisionDraftHtml: resolve(String(args.get('source-next-decision-draft-html') ?? 'public/review/source-candidates/source-next-decision-draft.html')),
  sourceImageReport: resolve(String(args.get('source-image-report') ?? 'tools/scratch/source-candidate-images-report.json')),
  researchPack: resolve(String(args.get('research-pack') ?? 'public/review/source-candidates/research-subagent-pack.json')),
  researchPackHtml: resolve(String(args.get('research-pack-html') ?? 'public/review/source-candidates/research-subagent-pack.html')),
  researchAudits: resolve(String(args.get('research-audits') ?? 'public/review/source-candidates/research-subagent-audits-summary.json')),
  researchDispatch: resolve(String(args.get('research-dispatch') ?? 'public/review/source-candidates/research-dispatch-board.json')),
  researchDispatchHtml: resolve(String(args.get('research-dispatch-html') ?? 'public/review/source-candidates/research-dispatch-board.html')),
  researchSourceTrace: resolve(String(args.get('research-source-trace') ?? 'public/review/source-candidates/research-source-trace.json')),
  researchSourceTraceHtml: resolve(String(args.get('research-source-trace-html') ?? 'public/review/source-candidates/research-source-trace.html')),
  riggingPackIndex: resolve(String(args.get('rigging-pack-index') ?? 'public/review/rigging-packs/index.json')),
  riggingPackIndexMarkdown: resolve(String(args.get('rigging-pack-index-markdown') ?? 'public/review/rigging-packs/index.md')),
  contentReadiness: resolve(String(args.get('content-readiness') ?? 'public/review/content-readiness.json')),
  contentReadinessHtml: resolve(String(args.get('content-readiness-html') ?? 'public/review/content-readiness.html')),
  contentGoalReadiness: resolve(String(args.get('content-goal-readiness') ?? 'public/review/content-goal-readiness.json')),
  contentGoalReadinessMarkdown: resolve(String(args.get('content-goal-readiness-markdown') ?? 'public/review/content-goal-readiness.md')),
  contentGoalAudit: resolve(String(args.get('content-goal-audit') ?? 'public/review/content-goal-audit.json')),
  contentGoalAuditMarkdown: resolve(String(args.get('content-goal-audit-markdown') ?? 'public/review/content-goal-audit.md')),
  contentGoalAuditHtml: resolve(String(args.get('content-goal-audit-html') ?? 'public/review/content-goal-audit.html')),
  contentQualityGateMatrix: resolve(String(args.get('content-quality-gate-matrix') ?? 'public/review/content-quality-gate-matrix.json')),
  contentQualityGateMatrixMarkdown: resolve(String(args.get('content-quality-gate-matrix-markdown') ?? 'public/review/content-quality-gate-matrix.md')),
  contentQualityGateMatrixHtml: resolve(String(args.get('content-quality-gate-matrix-html') ?? 'public/review/content-quality-gate-matrix.html')),
  contentQualityGateNext: resolve(String(args.get('content-quality-gate-next') ?? 'public/review/content-quality-gate-next.json')),
  contentQualityGateNextMarkdown: resolve(String(args.get('content-quality-gate-next-markdown') ?? 'public/review/content-quality-gate-next.md')),
  contentQualityGateNextHtml: resolve(String(args.get('content-quality-gate-next-html') ?? 'public/review/content-quality-gate-next.html')),
  contentSubagentAuditLedger: resolve(String(args.get('content-subagent-audit-ledger') ?? 'public/review/content-subagent-audit-ledger.json')),
  contentSubagentAuditLedgerMarkdown: resolve(String(args.get('content-subagent-audit-ledger-markdown') ?? 'public/review/content-subagent-audit-ledger.md')),
  contentSubagentAuditLedgerHtml: resolve(String(args.get('content-subagent-audit-ledger-html') ?? 'public/review/content-subagent-audit-ledger.html')),
  contentVisualFeedbackLedger: resolve(String(args.get('content-visual-feedback-ledger') ?? 'public/review/content-visual-feedback-ledger.json')),
  contentVisualFeedbackLedgerMarkdown: resolve(String(args.get('content-visual-feedback-ledger-markdown') ?? 'public/review/content-visual-feedback-ledger.md')),
  contentVisualFeedbackLedgerHtml: resolve(String(args.get('content-visual-feedback-ledger-html') ?? 'public/review/content-visual-feedback-ledger.html')),
  contentVisualRegenerationQueue: resolve(String(args.get('content-visual-regeneration-queue') ?? 'public/review/content-visual-regeneration-queue.json')),
  contentVisualRegenerationQueueMarkdown: resolve(String(args.get('content-visual-regeneration-queue-markdown') ?? 'public/review/content-visual-regeneration-queue.md')),
  contentVisualRegenerationQueueHtml: resolve(String(args.get('content-visual-regeneration-queue-html') ?? 'public/review/content-visual-regeneration-queue.html')),
  acceptanceRunway: resolve(String(args.get('acceptance-runway') ?? 'public/review/content-acceptance-runway.json')),
  acceptanceRunwayHtml: resolve(String(args.get('acceptance-runway-html') ?? 'public/review/content-acceptance-runway.html')),
  reviewEvidenceMatrix: resolve(String(args.get('review-evidence-matrix') ?? 'public/review/content-review-evidence-matrix.json')),
  reviewEvidenceMatrixHtml: resolve(String(args.get('review-evidence-matrix-html') ?? 'public/review/content-review-evidence-matrix.html')),
  reviewCockpit: resolve(String(args.get('review-cockpit') ?? 'public/review/content-review-cockpit/manifest.json')),
  reviewCockpitHtml: resolve(String(args.get('review-cockpit-html') ?? 'public/review/content-review-cockpit/index.html')),
  runtimeRosterExceptions: resolve(String(args.get('runtime-roster-exceptions') ?? 'public/review/content-runtime-roster-exceptions.json')),
  acceptanceDoctor: resolve(String(args.get('acceptance-doctor') ?? 'public/review/content-acceptance-doctor.json')),
  acceptanceDoctorMarkdown: resolve(String(args.get('acceptance-doctor-markdown') ?? 'public/review/content-acceptance-doctor.md')),
  acceptanceDoctorHtml: resolve(String(args.get('acceptance-doctor-html') ?? 'public/review/content-acceptance-doctor.html')),
  threatAcceptanceDecisions: resolve(String(args.get('threat-acceptance-decisions') ?? 'public/review/content-threat-acceptance-decision-template.json')),
  threatAcceptanceDecisionsMarkdown: resolve(String(args.get('threat-acceptance-decisions-markdown') ?? 'public/review/content-threat-acceptance-decision-template.md')),
  threatAcceptanceDecisionsHtml: resolve(String(args.get('threat-acceptance-decisions-html') ?? 'public/review/content-threat-acceptance-decision-template.html')),
  threatAcceptanceDecisionRun: resolve(String(args.get('threat-acceptance-decision-run') ?? 'public/review/content-threat-acceptance-decision-run-report.json')),
  approvedRuntimeHandoff: resolve(String(args.get('approved-runtime-handoff') ?? 'public/review/content-approved-runtime-handoff.json')),
  approvedRuntimeHandoffMarkdown: resolve(String(args.get('approved-runtime-handoff-markdown') ?? 'public/review/content-approved-runtime-handoff.md')),
  approvedRuntimeHandoffHtml: resolve(String(args.get('approved-runtime-handoff-html') ?? 'public/review/content-approved-runtime-handoff.html')),
  runtimeCoverage: resolve(String(args.get('runtime-coverage') ?? 'public/review/content-runtime-coverage.json')),
  runtimeCoverageMarkdown: resolve(String(args.get('runtime-coverage-markdown') ?? 'public/review/content-runtime-coverage.md')),
  planCoverage: resolve(String(args.get('plan-coverage') ?? 'public/review/content-plan-coverage.json')),
  planCoverageMarkdown: resolve(String(args.get('plan-coverage-markdown') ?? 'public/review/content-plan-coverage.md')),
  planCoverageHtml: resolve(String(args.get('plan-coverage-html') ?? 'public/review/content-plan-coverage.html')),
  verticalSlice: resolve(String(args.get('vertical-slice') ?? 'public/review/content-vertical-slice-runway.json')),
  verticalSliceMarkdown: resolve(String(args.get('vertical-slice-markdown') ?? 'public/review/content-vertical-slice-runway.md')),
  verticalSliceHtml: resolve(String(args.get('vertical-slice-html') ?? 'public/review/content-vertical-slice-runway.html')),
  humanSignoff: resolve(String(args.get('human-signoff') ?? 'public/review/content-human-signoff-queue.json')),
  humanSignoffMarkdown: resolve(String(args.get('human-signoff-markdown') ?? 'public/review/content-human-signoff-queue.md')),
  humanSignoffHtml: resolve(String(args.get('human-signoff-html') ?? 'public/review/content-human-signoff-queue.html')),
  humanAdjudicationBoard: resolve(String(args.get('human-adjudication-board') ?? 'public/review/content-human-adjudication-board.json')),
  humanAdjudicationBoardMarkdown: resolve(String(args.get('human-adjudication-board-markdown') ?? 'public/review/content-human-adjudication-board.md')),
  humanAdjudicationBoardHtml: resolve(String(args.get('human-adjudication-board-html') ?? 'public/review/content-human-adjudication-board.html')),
  contentReviewSession: resolve(String(args.get('content-review-session') ?? 'public/review/content-review-session.json')),
  contentReviewSessionMarkdown: resolve(String(args.get('content-review-session-markdown') ?? 'public/review/content-review-session.md')),
  contentReviewSessionHtml: resolve(String(args.get('content-review-session-html') ?? 'public/review/content-review-session.html')),
  contentProductionProof: resolve(String(args.get('content-production-proof') ?? 'public/review/content-production-proof.json')),
  contentProductionProofMarkdown: resolve(String(args.get('content-production-proof-markdown') ?? 'public/review/content-production-proof.md')),
  contentProductionProofHtml: resolve(String(args.get('content-production-proof-html') ?? 'public/review/content-production-proof.html')),
  contentPromoteApprovedThreats: resolve(String(args.get('content-promote-approved-threats') ?? 'public/review/content-promote-approved-threats.json')),
  contentPromoteApprovedThreatsMarkdown: resolve(String(args.get('content-promote-approved-threats-markdown') ?? 'public/review/content-promote-approved-threats.md')),
  contentPromoteApprovedThreatsHtml: resolve(String(args.get('content-promote-approved-threats-html') ?? 'public/review/content-promote-approved-threats.html')),
  runtimeCohesionReview: resolve(String(args.get('runtime-cohesion-review') ?? 'public/review/content-runtime-cohesion-review.json')),
  runtimeCohesionReviewMarkdown: resolve(String(args.get('runtime-cohesion-review-markdown') ?? 'public/review/content-runtime-cohesion-review.md')),
  runtimeCohesionReviewHtml: resolve(String(args.get('runtime-cohesion-review-html') ?? 'public/review/content-runtime-cohesion-review.html')),
  contentSandboxRoster: resolve(String(args.get('content-sandbox-roster') ?? 'public/review/content-sandbox-roster.json')),
  contentSandboxRosterMarkdown: resolve(String(args.get('content-sandbox-roster-markdown') ?? 'public/review/content-sandbox-roster.md')),
  contentSandboxRosterHtml: resolve(String(args.get('content-sandbox-roster-html') ?? 'public/review/content-sandbox-roster.html')),
  contentArticulationRoster: resolve(String(args.get('content-articulation-roster') ?? 'public/review/content-articulation-roster.json')),
  contentArticulationRosterMarkdown: resolve(String(args.get('content-articulation-roster-markdown') ?? 'public/review/content-articulation-roster.md')),
  contentArticulationRosterHtml: resolve(String(args.get('content-articulation-roster-html') ?? 'public/review/content-articulation-roster.html')),
  contentReproducibility: resolve(String(args.get('content-reproducibility') ?? 'public/review/content-reproducibility.json')),
  contentReproducibilityMarkdown: resolve(String(args.get('content-reproducibility-markdown') ?? 'public/review/content-reproducibility.md')),
  contentReproducibilityHtml: resolve(String(args.get('content-reproducibility-html') ?? 'public/review/content-reproducibility.html')),
  riggingSprint: resolve(String(args.get('rigging-sprint') ?? 'public/review/content-rigging-sprint.json')),
  riggingSprintMarkdown: resolve(String(args.get('rigging-sprint-markdown') ?? 'public/review/content-rigging-sprint.md')),
  riggingSprintHtml: resolve(String(args.get('rigging-sprint-html') ?? 'public/review/content-rigging-sprint.html')),
  acceptanceAudit: resolve(String(args.get('acceptance-audit') ?? 'public/review/content-acceptance-audit.json')),
  acceptanceAuditMarkdown: resolve(String(args.get('acceptance-audit-markdown') ?? 'public/review/content-acceptance-audit.md')),
  acceptanceAuditHtml: resolve(String(args.get('acceptance-audit-html') ?? 'public/review/content-acceptance-audit.html')),
  acceptanceAuditIndex: resolve(String(args.get('acceptance-audit-index') ?? 'public/review/content-acceptance-audits/index.json')),
  acceptanceAuditIndexMarkdown: resolve(String(args.get('acceptance-audit-index-markdown') ?? 'public/review/content-acceptance-audits/index.md')),
  acceptanceAuditIndexHtml: resolve(String(args.get('acceptance-audit-index-html') ?? 'public/review/content-acceptance-audits/index.html')),
  workbench: resolve(String(args.get('workbench') ?? 'public/review/content-workbench.json')),
  workbenchHtml: resolve(String(args.get('workbench-html') ?? 'public/review/content-workbench.html')),
  stageBoard: resolve(String(args.get('stage-board') ?? 'public/review/content-stage-board.json')),
  nextAction: resolve(String(args.get('next-action') ?? 'public/review/content-next-action.json')),
  nextActionMarkdown: resolve(String(args.get('next-action-markdown') ?? 'public/review/content-next-action.md')),
  articulatedReview: resolve(String(args.get('articulated-review') ?? 'public/review/articulated/review-manifest.json')),
  visualCohesion: resolve(String(args.get('visual-cohesion') ?? 'tools/scratch/articulated-visual-cohesion.json')),
  runtime: resolve(String(args.get('runtime') ?? 'public/assets/generated/articulated-creatures.parts.json')),
};

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
    return info.isFile() && info.size >= minSize;
  } catch {
    failures.push(`${label}: missing`);
    return false;
  }
}

function countLines(text) {
  return text.split('\n').filter((line) => line.trim()).length;
}

function requireScript(packageJson, name) {
  if (!packageJson?.scripts?.[name]) failures.push(`package.json missing script ${name}`);
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function textIncludesHtml(text, value) {
  return text.includes(value) || text.includes(htmlEscape(value));
}

function requireCommandText(owner, commands, expected) {
  if (!commands.includes(expected)) failures.push(`${owner}: missing command ${expected}`);
}

function assertDryRunDecisionCommands(owner, commands) {
  for (const command of Array.isArray(commands) ? commands : []) {
    const text = String(command ?? '');
    if ((text.includes('npm run source:accept') || text.includes('npm run content:accept')) && !text.includes('--dry-run')) {
      failures.push(`${owner}: decision command must be dry-run only`);
    }
  }
}

function assertRenderedDryRunDecisionCommands(owner, text) {
  for (const line of String(text ?? '').split(/\n/)) {
    if ((line.includes('npm run source:accept') || line.includes('npm run content:accept')) && !line.includes('--dry-run')) {
      failures.push(`${owner}: rendered decision command must be dry-run only`);
    }
  }
}

function rejectionKind(attempt) {
  if (attempt.copiedImage) return 'visual-rejection';
  if (attempt.sourceImagegenMarker || /no (new |recoverable |accessible )?(saved |source )?(image )?file|did not create an accessible source image file|no project-bound artifact|inline/i.test(String(attempt.reason ?? ''))) {
    return 'missing-artifact';
  }
  return 'unclassified';
}

const packageJson = await readJson('package.json', paths.packageJson);
const reviewPagePreviewTest = await readText('review page preview smoke test', paths.reviewPagePreviewTest);
const contentReviewSessionWorkspaceSmokeTest = await readText('content review session workspace smoke test', paths.contentReviewSessionWorkspaceSmokeTest);
const contentReviewSessionStrictRoundtripSmokeTest = await readText('content review session strict roundtrip smoke test', paths.contentReviewSessionStrictRoundtripSmokeTest);
const sandboxPairedTargetVisualSmokeTest = await readText('sandbox paired target visual smoke test', paths.sandboxPairedTargetVisualSmokeTest);
const sourceApprovalRunwayPreviewTest = await readText('source approval runway preview smoke test', paths.sourceApprovalRunwayPreviewTest);
const sourceApprovalMarathonWorkspaceSmokeTest = await readText('source approval marathon workspace smoke test', paths.sourceApprovalMarathonWorkspaceSmokeTest);
const sourceApprovalMarathonFullBatchSmokeTest = await readText('source approval marathon full batch workspace smoke test', paths.sourceApprovalMarathonFullBatchSmokeTest);
const sourceReplaceRunwayPreviewTest = await readText('source replace runway preview smoke test', paths.sourceReplaceRunwayPreviewTest);
const sourceReplacementArchiveTest = await readText('source replacement archive smoke test', paths.sourceReplacementArchiveTest);
const threatEvidenceFingerprintModule = await readText('threat evidence fingerprint module', paths.threatEvidenceFingerprintModule);
const threatDecisionApplyTool = await readText('threat decision apply tool', paths.threatDecisionApplyTool);
const threatDecisionApplySmokeTest = await readText('threat decision apply smoke test', paths.threatDecisionApplySmokeTest);
const syntheticDecisionGuardsValidator = await readText('synthetic decision guards validator', paths.syntheticDecisionGuardsValidator);
const threatAcceptTool = await readText('threat accept tool', paths.threatAcceptTool);
const threatGateTool = await readText('threat gate tool', paths.threatGateTool);
const contentAcceptanceRunwayPreviewTest = await readText('content acceptance runway preview smoke test', paths.contentAcceptanceRunwayPreviewTest);
const sourceCohesionDecisionApplySmokeTest = await readText('source cohesion decision apply smoke test', paths.sourceCohesionDecisionApplySmokeTest);
const sandbox = await readJson('sandbox manifest', paths.sandboxManifest);
const sandboxQuickstart = await readJson('sandbox quickstart', paths.sandboxQuickstart);
const sandboxQuickstartMarkdown = await readText('sandbox quickstart markdown', paths.sandboxQuickstartMarkdown);
const sandboxQuickstartHtml = await readText('sandbox quickstart html', paths.sandboxQuickstartHtml);
const sandboxVisual = await readJson('sandbox visual report', paths.sandboxVisualReport);
const sandboxPairedVisual = await readJson('sandbox paired visual report', paths.sandboxPairedVisualReport);
const sourceCandidates = await readJson('source candidates', paths.sourceCandidates);
const sourceReview = await readJson('source review manifest', paths.sourceReview);
const sourceRejections = await readJson('source rejected attempts', paths.sourceRejections);
const sourceReviewDossier = await readJson('source review dossier', paths.sourceReviewDossier);
const sourceApprovalRunway = await readJson('source approval runway', paths.sourceApprovalRunway);
const sourceApprovalChecklist = await readJson('source approval checklist', paths.sourceApprovalChecklist);
const sourceApprovalSession = await readJson('source approval session', paths.sourceApprovalSession);
const sourceApprovalMarathon = await readJson('source approval marathon', paths.sourceApprovalMarathon);
const sourceReplaceRunway = await readJson('source replace runway', paths.sourceReplaceRunway);
const sourceVisualBoard = await readJson('source visual board', paths.sourceVisualBoard);
const sourceCriticBoard = await readJson('source critic board', paths.sourceCriticBoard);
const sourceCriticRegeneration = await readJson('source critic regeneration queue', paths.sourceCriticRegeneration);
const sourceCriticRegenerationDoctor = await readJson('source critic regeneration doctor', paths.sourceCriticRegenerationDoctor);
const sourceCriticRegenerationHealth = await readJson('source critic regeneration health', paths.sourceCriticRegenerationHealth);
const sourceReviewSequencer = await readJson('source review sequencer', paths.sourceReviewSequencer);
const sourceReviewTargetPacket = await readJson('source review target packet', paths.sourceReviewTargetPacket);
const sourceRegenerationWorkspace = await readJson('source regeneration workspace', paths.sourceRegenerationWorkspace);
const sourceCriticRegenerationQueueItems = Array.isArray(sourceCriticRegeneration?.candidates) ? sourceCriticRegeneration.candidates : [];
const sourceCriticRegenerationById = new Map(sourceCriticRegenerationQueueItems.map((item) => [item.id, item]));
const sourceCriticRegenerationHealthItems = Array.isArray(sourceCriticRegenerationHealth?.items) ? sourceCriticRegenerationHealth.items : [];
const sourceCriticRegenerationHealthById = new Map(sourceCriticRegenerationHealthItems.map((item) => [item.id, item]));
const activeCriticRegenerationIds = new Set(
  (Array.isArray(sourceReviewSequencer?.items) ? sourceReviewSequencer.items : [])
    .filter((item) => String(item?.lane ?? '').startsWith('regenerate-'))
    .map((item) => item.id),
);
const sourceCohesionReview = await readJson('source cohesion review', paths.sourceCohesionReview);
const sourceCohesionDecisions = await readJson('source cohesion decisions', paths.sourceCohesionDecisions);
const sourceCohesionDecisionRun = await readJson('source cohesion decision run', paths.sourceCohesionDecisionRun);
const sourceReviewQueue = await readJson('source review queue', paths.sourceReviewQueue);
const sourceQueue = await readJson('source generation queue', paths.sourceQueue);
const sourceSprint = await readJson('source generation sprint', paths.sourceSprint);
const sourceAcquisitionRunbook = await readJson('source acquisition runbook', paths.sourceAcquisitionRunbook);
const sourceRecoveryScout = await readJson('source recovery scout', paths.sourceRecoveryScout);
const sourceIngestReadiness = await readJson('source ingest readiness', paths.sourceIngestReadiness);
const sourceInboxHandoff = await readJson('source inbox handoff', paths.sourceInboxHandoff);
const sourceInboxReview = await readJson('source inbox review', paths.sourceInboxReview);
const sourceIntakeRunway = await readJson('source intake runway', paths.sourceIntakeRunway);
const sourceIntakeDoctor = await readJson('source intake doctor', paths.sourceIntakeDoctor);
const sourceWorkstation = await readJson('source workstation', paths.sourceWorkstation);
const sourceNextReview = await readJson('source next review', paths.sourceNextReview);
const sourceNextDecisionDraft = await readJson('source next decision draft', paths.sourceNextDecisionDraft);
const sourceImageReport = await readJson('source image validation report', paths.sourceImageReport);
const researchPack = await readJson('research subagent pack', paths.researchPack);
const researchAudits = await readJson('research subagent audits', paths.researchAudits);
const researchDispatch = await readJson('research dispatch board', paths.researchDispatch);
const researchSourceTrace = await readJson('research source trace', paths.researchSourceTrace);
const riggingPackIndex = await readJson('rigging focus pack index', paths.riggingPackIndex);
const contentReadiness = await readJson('content readiness', paths.contentReadiness);
const contentGoalReadiness = await readJson('content goal readiness', paths.contentGoalReadiness);
const contentGoalAudit = await readJson('content goal audit', paths.contentGoalAudit);
const contentQualityGateMatrix = await readJson('content quality gate matrix', paths.contentQualityGateMatrix);
const contentQualityGateNext = await readJson('content quality gate next', paths.contentQualityGateNext);
const contentSubagentAuditLedger = await readJson('content subagent audit ledger', paths.contentSubagentAuditLedger);
const contentVisualFeedbackLedger = await readJson('content visual feedback ledger', paths.contentVisualFeedbackLedger);
const contentVisualRegenerationQueue = await readJson('content visual regeneration queue', paths.contentVisualRegenerationQueue);
const acceptanceRunway = await readJson('acceptance runway', paths.acceptanceRunway);
const reviewEvidenceMatrix = await readJson('review evidence matrix', paths.reviewEvidenceMatrix);
const reviewCockpit = await readJson('review cockpit', paths.reviewCockpit);
const runtimeRosterExceptions = await readJson('runtime roster exceptions', paths.runtimeRosterExceptions);
const acceptanceDoctor = await readJson('acceptance doctor', paths.acceptanceDoctor);
const threatAcceptanceDecisions = await readJson('threat acceptance decisions', paths.threatAcceptanceDecisions);
const threatAcceptanceDecisionRun = await readJson('threat acceptance decision run', paths.threatAcceptanceDecisionRun);
const approvedRuntimeHandoff = await readJson('approved runtime handoff', paths.approvedRuntimeHandoff);
const runtimeCoverage = await readJson('runtime coverage', paths.runtimeCoverage);
const planCoverage = await readJson('plan coverage', paths.planCoverage);
const verticalSlice = await readJson('vertical slice runway', paths.verticalSlice);
const humanSignoff = await readJson('human sign-off queue', paths.humanSignoff);
const humanAdjudicationBoard = await readJson('human adjudication board', paths.humanAdjudicationBoard);
const contentReviewSession = await readJson('content review session', paths.contentReviewSession);
const contentProductionProof = await readJson('content production proof', paths.contentProductionProof);
const contentPromoteApprovedThreats = await readJson('content promote approved threats', paths.contentPromoteApprovedThreats);
const runtimeCohesionReview = await readJson('runtime cohesion review', paths.runtimeCohesionReview);
const contentSandboxRoster = await readJson('content sandbox roster', paths.contentSandboxRoster);
const contentArticulationRoster = await readJson('content articulation roster', paths.contentArticulationRoster);
const contentReproducibility = await readJson('content reproducibility', paths.contentReproducibility);
const riggingSprint = await readJson('rigging sprint', paths.riggingSprint);
const acceptanceAudit = await readJson('acceptance audit', paths.acceptanceAudit);
const acceptanceAuditIndex = await readJson('acceptance audit index', paths.acceptanceAuditIndex);
const workbench = await readJson('content workbench', paths.workbench);
const stageBoard = await readJson('content stage board', paths.stageBoard);
const nextAction = await readJson('content next action', paths.nextAction);
const articulatedReview = await readJson('articulated review manifest', paths.articulatedReview);
const visualCohesion = await readJson('articulated visual cohesion report', paths.visualCohesion);
const runtime = await readJson('articulated runtime manifest', paths.runtime);
const workbenchHtml = await readText('content workbench html', paths.workbenchHtml);
const planCoverageMarkdown = await readText('plan coverage markdown', paths.planCoverageMarkdown);
const planCoverageHtml = await readText('plan coverage html', paths.planCoverageHtml);
const verticalSliceMarkdown = await readText('vertical slice runway markdown', paths.verticalSliceMarkdown);
const verticalSliceHtml = await readText('vertical slice runway html', paths.verticalSliceHtml);
const humanSignoffMarkdown = await readText('human sign-off markdown', paths.humanSignoffMarkdown);
const humanSignoffHtml = await readText('human sign-off html', paths.humanSignoffHtml);
const humanAdjudicationBoardMarkdown = await readText('human adjudication board markdown', paths.humanAdjudicationBoardMarkdown);
const humanAdjudicationBoardHtml = await readText('human adjudication board html', paths.humanAdjudicationBoardHtml);
const contentReviewSessionMarkdown = await readText('content review session markdown', paths.contentReviewSessionMarkdown);
const contentReviewSessionHtml = await readText('content review session html', paths.contentReviewSessionHtml);
const contentProductionProofMarkdown = await readText('content production proof markdown', paths.contentProductionProofMarkdown);
const contentProductionProofHtml = await readText('content production proof html', paths.contentProductionProofHtml);
const contentPromoteApprovedThreatsMarkdown = await readText('content promote approved threats markdown', paths.contentPromoteApprovedThreatsMarkdown);
const runtimeCohesionReviewMarkdown = await readText('runtime cohesion review markdown', paths.runtimeCohesionReviewMarkdown);
const runtimeCohesionReviewHtml = await readText('runtime cohesion review html', paths.runtimeCohesionReviewHtml);
const contentPromoteApprovedThreatsHtml = await readText('content promote approved threats html', paths.contentPromoteApprovedThreatsHtml);
const contentSandboxRosterMarkdown = await readText('content sandbox roster markdown', paths.contentSandboxRosterMarkdown);
const contentSandboxRosterHtml = await readText('content sandbox roster html', paths.contentSandboxRosterHtml);
const contentArticulationRosterMarkdown = await readText('content articulation roster markdown', paths.contentArticulationRosterMarkdown);
const contentArticulationRosterHtml = await readText('content articulation roster html', paths.contentArticulationRosterHtml);
const contentReproducibilityMarkdown = await readText('content reproducibility markdown', paths.contentReproducibilityMarkdown);
const contentReproducibilityHtml = await readText('content reproducibility html', paths.contentReproducibilityHtml);
const sourceReviewDossierHtml = await readText('source review dossier html', paths.sourceReviewDossierHtml);
const sourceApprovalRunwayHtml = await readText('source approval runway html', paths.sourceApprovalRunwayHtml);
const sourceApprovalSessionMarkdown = await readText('source approval session markdown', paths.sourceApprovalSessionMarkdown);
const sourceApprovalSessionHtml = await readText('source approval session html', paths.sourceApprovalSessionHtml);
const sourceApprovalMarathonMarkdown = await readText('source approval marathon markdown', paths.sourceApprovalMarathonMarkdown);
const sourceApprovalMarathonHtml = await readText('source approval marathon html', paths.sourceApprovalMarathonHtml);
const sourceReplaceRunwayMarkdown = await readText('source replace runway markdown', paths.sourceReplaceRunwayMarkdown);
const sourceReplaceRunwayHtml = await readText('source replace runway html', paths.sourceReplaceRunwayHtml);
const sourceVisualBoardMarkdown = await readText('source visual board markdown', paths.sourceVisualBoardMarkdown);
const sourceVisualBoardHtml = await readText('source visual board html', paths.sourceVisualBoardHtml);
const sourceCriticBoardMarkdown = await readText('source critic board markdown', paths.sourceCriticBoardMarkdown);
const sourceCriticBoardHtml = await readText('source critic board html', paths.sourceCriticBoardHtml);
const sourceCriticRegenerationMarkdown = await readText('source critic regeneration markdown', paths.sourceCriticRegenerationMarkdown);
const sourceCriticRegenerationHtml = await readText('source critic regeneration html', paths.sourceCriticRegenerationHtml);
const sourceCriticRegenerationDoctorMarkdown = await readText('source critic regeneration doctor markdown', paths.sourceCriticRegenerationDoctorMarkdown);
const sourceCriticRegenerationDoctorHtml = await readText('source critic regeneration doctor html', paths.sourceCriticRegenerationDoctorHtml);
const sourceCriticRegenerationHealthMarkdown = await readText('source critic regeneration health markdown', paths.sourceCriticRegenerationHealthMarkdown);
const sourceCriticRegenerationHealthHtml = await readText('source critic regeneration health html', paths.sourceCriticRegenerationHealthHtml);
const sourceReviewSequencerMarkdown = await readText('source review sequencer markdown', paths.sourceReviewSequencerMarkdown);
const sourceReviewSequencerHtml = await readText('source review sequencer html', paths.sourceReviewSequencerHtml);
const sourceReviewTargetPacketMarkdown = await readText('source review target packet markdown', paths.sourceReviewTargetPacketMarkdown);
const sourceReviewTargetPacketHtml = await readText('source review target packet html', paths.sourceReviewTargetPacketHtml);
const sourceRegenerationWorkspaceMarkdown = await readText('source regeneration workspace markdown', paths.sourceRegenerationWorkspaceMarkdown);
const sourceRegenerationWorkspaceHtml = await readText('source regeneration workspace html', paths.sourceRegenerationWorkspaceHtml);
const sourceCohesionReviewHtml = await readText('source cohesion review html', paths.sourceCohesionReviewHtml);
const sourceCohesionDecisionsHtml = await readText('source cohesion decisions html', paths.sourceCohesionDecisionsHtml);
const sourceReviewQueueHtml = await readText('source review queue html', paths.sourceReviewQueueHtml);
const sourceQueueHtml = await readText('source generation queue html', paths.sourceQueueHtml);
const sourceAcquisitionRunbookMarkdown = await readText('source acquisition runbook markdown', paths.sourceAcquisitionRunbookMarkdown);
const sourceAcquisitionRunbookHtml = await readText('source acquisition runbook html', paths.sourceAcquisitionRunbookHtml);
const sourceRecoveryScoutMarkdown = await readText('source recovery scout markdown', paths.sourceRecoveryScoutMarkdown);
const sourceRecoveryScoutHtml = await readText('source recovery scout html', paths.sourceRecoveryScoutHtml);
const sourceIngestReadinessMarkdown = await readText('source ingest readiness markdown', paths.sourceIngestReadinessMarkdown);
const sourceIngestReadinessHtml = await readText('source ingest readiness html', paths.sourceIngestReadinessHtml);
const sourceInboxHandoffMarkdown = await readText('source inbox handoff markdown', paths.sourceInboxHandoffMarkdown);
const researchSourceTraceHtml = await readText('research source trace html', paths.researchSourceTraceHtml);
const researchDispatchHtml = await readText('research dispatch html', paths.researchDispatchHtml);
const contentReadinessHtml = await readText('content readiness html', paths.contentReadinessHtml);
const contentGoalReadinessMarkdown = await readText('content goal readiness markdown', paths.contentGoalReadinessMarkdown);
const contentGoalAuditMarkdown = await readText('content goal audit markdown', paths.contentGoalAuditMarkdown);
const contentGoalAuditHtml = await readText('content goal audit html', paths.contentGoalAuditHtml);
const contentQualityGateMatrixMarkdown = await readText('content quality gate matrix markdown', paths.contentQualityGateMatrixMarkdown);
const contentQualityGateMatrixHtml = await readText('content quality gate matrix html', paths.contentQualityGateMatrixHtml);
const contentQualityGateNextMarkdown = await readText('content quality gate next markdown', paths.contentQualityGateNextMarkdown);
const contentQualityGateNextHtml = await readText('content quality gate next html', paths.contentQualityGateNextHtml);
const contentSubagentAuditLedgerMarkdown = await readText('content subagent audit ledger markdown', paths.contentSubagentAuditLedgerMarkdown);
const contentSubagentAuditLedgerHtml = await readText('content subagent audit ledger html', paths.contentSubagentAuditLedgerHtml);
const contentVisualFeedbackLedgerMarkdown = await readText('content visual feedback ledger markdown', paths.contentVisualFeedbackLedgerMarkdown);
const contentVisualFeedbackLedgerHtml = await readText('content visual feedback ledger html', paths.contentVisualFeedbackLedgerHtml);
const contentVisualRegenerationQueueMarkdown = await readText('content visual regeneration queue markdown', paths.contentVisualRegenerationQueueMarkdown);
const contentVisualRegenerationQueueHtml = await readText('content visual regeneration queue html', paths.contentVisualRegenerationQueueHtml);
const acceptanceRunwayHtml = await readText('acceptance runway html', paths.acceptanceRunwayHtml);
const reviewEvidenceMatrixHtml = await readText('review evidence matrix html', paths.reviewEvidenceMatrixHtml);
const reviewCockpitHtml = await readText('review cockpit html', paths.reviewCockpitHtml);
const acceptanceDoctorMarkdown = await readText('acceptance doctor markdown', paths.acceptanceDoctorMarkdown);
const acceptanceDoctorHtml = await readText('acceptance doctor html', paths.acceptanceDoctorHtml);
const threatAcceptanceDecisionsMarkdown = await readText('threat acceptance decisions markdown', paths.threatAcceptanceDecisionsMarkdown);
const threatAcceptanceDecisionsHtml = await readText('threat acceptance decisions html', paths.threatAcceptanceDecisionsHtml);
const approvedRuntimeHandoffMarkdown = await readText('approved runtime handoff markdown', paths.approvedRuntimeHandoffMarkdown);
const approvedRuntimeHandoffHtml = await readText('approved runtime handoff html', paths.approvedRuntimeHandoffHtml);
const runtimeCoverageMarkdown = await readText('runtime coverage markdown', paths.runtimeCoverageMarkdown);
const riggingSprintMarkdown = await readText('rigging sprint markdown', paths.riggingSprintMarkdown);
const riggingSprintHtml = await readText('rigging sprint html', paths.riggingSprintHtml);
const acceptanceAuditMarkdown = await readText('acceptance audit markdown', paths.acceptanceAuditMarkdown);
const acceptanceAuditHtml = await readText('acceptance audit html', paths.acceptanceAuditHtml);
const acceptanceAuditIndexMarkdown = await readText('acceptance audit index markdown', paths.acceptanceAuditIndexMarkdown);
const acceptanceAuditIndexHtml = await readText('acceptance audit index html', paths.acceptanceAuditIndexHtml);
const sourceIntakeRunwayHtml = await readText('source intake runway html', paths.sourceIntakeRunwayHtml);
const sourceIntakeDoctorHtml = await readText('source intake doctor html', paths.sourceIntakeDoctorHtml);
const sourceIntakeDoctorMarkdown = await readText('source intake doctor markdown', paths.sourceIntakeDoctorMarkdown);
const sourceWorkstationHtml = await readText('source workstation html', paths.sourceWorkstationHtml);
const sourceWorkstationMarkdown = await readText('source workstation markdown', paths.sourceWorkstationMarkdown);
const sourceNextReviewHtml = await readText('source next review html', paths.sourceNextReviewHtml);
const sourceNextDecisionDraftMarkdown = await readText('source next decision draft markdown', paths.sourceNextDecisionDraftMarkdown);
const sourceNextDecisionDraftHtml = await readText('source next decision draft html', paths.sourceNextDecisionDraftHtml);
const researchPackHtml = await readText('research subagent pack html', paths.researchPackHtml);
const nextActionMarkdown = await readText('content next action markdown', paths.nextActionMarkdown);
const promptText = await readText('imagen prompts jsonl', resolve('public/review/source-candidates/imagen-prompts.jsonl'));
const sandboxPreviewAuditTest = await readText('sandbox preview audit test', paths.sandboxPreviewAuditTest);

for (const script of [
  'sandbox:preview',
  'sandbox:preview-check',
  'sandbox:lab',
  'sandbox:lab-check',
  'sandbox:lab-smoke',
  'sandbox:preview-audit',
  'sandbox:index:check',
  'sandbox:quickstart',
  'sandbox:quickstart-check',
  'sandbox:check',
  'sandbox:visual:all',
  'sandbox:visual:paired',
  'sandbox:visual:paired:targets',
  'sandbox:visual:paired:targets:quick',
  'sandbox:visual:paired:all:quick',
  'research:subagent-pack',
  'research:audits',
  'research:dispatch',
  'research:dispatch-check',
  'research:source-trace',
  'research:source-trace-check',
  'source:session',
  'source:imagegen-health',
  'source:inbox-capture',
  'source:ingest-batch',
  'source:generate-openai',
  'source:generate-openai-smoke',
  'source:generate-openai-batch',
  'source:generate-openai-batch-smoke',
  'source:advance-inbox',
  'source:advance-inbox-smoke',
  'source:acquisition-runbook',
  'source:acquisition-runbook-check',
  'source:recovery-scout',
  'source:recovery-scout-check',
  'source:ingest-readiness',
  'source:ingest-readiness-check',
  'source:image-check',
  'source:preview-paired-check',
  'source:review-dossier',
  'source:review-dossier-check',
  'source:approval-runway',
  'source:approval-runway-check',
  'source:replace-runway',
  'source:replace-runway-check',
  'source:replace-runway:preview',
  'source:replace-runway:preview-check',
  'source:replace-runway:serve-smoke',
  'source:visual-board',
  'source:visual-board-check',
  'source:visual-board:serve-smoke',
  'source:critic-board',
  'source:critic-board-check',
  'source:critic-board:serve-smoke',
  'source:critic-regeneration',
  'source:critic-regeneration-check',
  'source:critic-regeneration:serve-smoke',
  'source:critic-regeneration-openai-smoke',
  'source:critic-regeneration-doctor',
  'source:critic-regeneration-doctor-check',
  'source:critic-regeneration-doctor:serve-smoke',
  'source:critic-regeneration-health',
  'source:critic-regeneration-health-check',
  'source:critic-regeneration-health:serve-smoke',
  'source:review-sequencer',
  'source:review-sequencer-check',
  'source:review-sequencer:serve-smoke',
  'source:review-target-packet',
  'source:review-target-packet-check',
  'source:review-target-packet:serve-smoke',
  'source:regeneration-workspace',
  'source:regeneration-workspace-check',
  'source:regeneration-workspace:serve-smoke',
  'source:cohesion-review',
  'source:cohesion-review-check',
  'source:cohesion-decisions',
  'source:cohesion-decisions-check',
  'source:cohesion-decisions-workspace-smoke',
  'source:cohesion-decisions-apply-smoke',
  'source:cohesion-decisions-apply',
  'source:approval-decisions',
  'source:approval-decisions-check',
  'source:approval-decisions-workspace-smoke',
  'source:approval-decisions-apply-smoke',
  'source:approval-decisions-apply',
  'source:approval-runway:preview',
  'source:approval-runway:preview-check',
  'source:approval-runway:serve-smoke',
  'source:approval-session',
  'source:approval-session-check',
  'source:approval-session:serve-smoke',
  'source:approval-marathon',
  'source:approval-marathon-check',
  'source:approval-marathon-workspace-smoke',
  'source:approval-marathon-full-batch-smoke',
  'source:approval-marathon:serve-smoke',
  'content:synthetic-decision-guards-check',
  'source:quick-review-all',
  'source:quick-review-all-check',
  'source:review-queue',
  'source:review-queue-check',
  'source:review-queue:preview',
  'source:review-queue:preview-check',
  'source:review-queue:serve-smoke',
  'source:intake-runway',
  'source:intake-runway-check',
  'source:intake-doctor',
  'source:intake-doctor-check',
  'source:workstation',
  'source:workstation-check',
  'source:inbox-pack',
  'source:inbox-pack-check',
  'source:workstation:preview',
  'source:workstation:preview-check',
  'source:workstation:serve-smoke',
  'source:next-review',
  'source:next-review-check',
  'source:next-review:serve-smoke',
  'source:ingest-current',
  'source:ingest-current-smoke',
  'source:replacement-archive-smoke',
  'source:check',
  'articulated:visual-cohesion',
  'content:readiness',
  'content:readiness-check',
  'content:strict-gate-negative-smoke',
  'content:goal-readiness',
  'content:goal-readiness-check',
  'content:goal-readiness-strict',
  'content:goal-audit',
  'content:goal-audit-check',
  'content:goal-audit:serve-smoke',
  'content:subagent-audit-ledger',
  'content:subagent-audit-ledger-check',
  'content:subagent-audit-ledger:serve-smoke',
  'content:visual-feedback',
  'content:visual-feedback-check',
  'content:visual-feedback:serve-smoke',
  'content:visual-regeneration',
  'content:visual-regeneration-check',
  'content:visual-regeneration:serve-smoke',
  'content:rigging-pack',
  'content:rigging-pack-check',
  'content:status-smoke',
  'content:quality-predicate-smoke',
  'content:goal-gate',
  'content:acceptance-runway',
  'content:acceptance-runway-check',
  'content:review-evidence',
  'content:review-evidence-check',
  'content:review-cockpit',
  'content:review-cockpit-check',
  'content:review-cockpit:serve-smoke',
  'content:runtime-roster-check',
  'content:acceptance-runway:preview',
  'content:acceptance-runway:preview-check',
  'content:acceptance-runway:serve-smoke',
  'content:acceptance-doctor',
  'content:acceptance-doctor-check',
  'content:threat-decisions',
  'content:threat-decisions-check',
  'content:threat-decisions-workspace-smoke',
  'content:threat-decisions-apply',
  'content:threat-decisions-apply-smoke',
  'content:approved-runtime-handoff',
  'content:approved-runtime-handoff-check',
  'content:runtime-coverage',
  'content:runtime-coverage-check',
  'content:plan-coverage',
  'content:plan-coverage-check',
  'content:vertical-slice',
  'content:vertical-slice-check',
  'content:human-signoff',
  'content:human-signoff-check',
  'content:human-signoff-command-smoke',
  'content:human-review-policy-smoke',
  'content:human-signoff:serve-smoke',
  'content:human-adjudication-board',
  'content:human-adjudication-board-check',
  'content:human-adjudication-board:serve-smoke',
  'content:review-session',
  'content:review-session-check',
  'content:review-session-workspace-smoke',
  'content:review-session-strict-roundtrip-smoke',
  'content:review-session:serve-smoke',
  'content:production-proof',
  'content:production-proof-check',
  'content:production-proof:serve-smoke',
  'content:promote-approved-threats',
  'content:promote-approved-threats-check',
  'content:promote-approved-threats:serve-smoke',
  'content:sandbox-roster',
  'content:sandbox-roster-check',
  'content:sandbox-roster:serve-smoke',
  'content:articulation-roster',
  'content:articulation-roster-check',
  'content:articulation-roster:serve-smoke',
  'content:reproducibility',
  'content:reproducibility-check',
  'content:reproducibility:serve-smoke',
  'content:rigging-sprint',
  'content:rigging-sprint-check',
  'content:rigging-sprint:preview',
  'content:rigging-sprint:preview-check',
  'content:rigging-sprint:serve-smoke',
  'content:acceptance-audit',
  'content:acceptance-audit-check',
  'content:acceptance-audit-index',
  'content:acceptance-audit-index-check',
  'content:acceptance-audit-index:serve-smoke',
  'content:workbench',
  'content:workbench-check',
  'content:review-pages:serve-smoke',
  'content:next',
  'content:next-check',
  'content:gate:smoke',
  'content:gate',
]) {
  requireScript(packageJson, script);
}
const contentNextScript = packageJson?.scripts?.['content:next'] ?? '';
if (!contentNextScript.includes('npm run source:review-sequencer')) failures.push('content:next must rebuild source review sequencer');
if (!contentNextScript.includes('npm run source:regeneration-workspace')) failures.push('content:next must rebuild source regeneration workspace');
if (!contentNextScript.includes('npm run source:approval-session')) failures.push('content:next must rebuild source approval session');
if (!contentNextScript.includes('npm run source:approval-marathon')) failures.push('content:next must rebuild source approval marathon');
if (!contentNextScript.includes('npm run content:visual-feedback')) failures.push('content:next must rebuild content visual feedback');
if (!contentNextScript.includes('npm run content:visual-regeneration')) failures.push('content:next must rebuild content visual regeneration');
const contentGoalReadinessScript = packageJson?.scripts?.['content:goal-readiness'] ?? '';
function commandIndex(script, command) {
  return String(script ?? '').indexOf(command);
}
function requireOrderedScriptCommand(scriptName, script, earlier, later) {
  const earlyIndex = commandIndex(script, earlier);
  const lateIndex = commandIndex(script, later);
  if (earlyIndex < 0) failures.push(`${scriptName} must include ${earlier}`);
  if (lateIndex < 0) failures.push(`${scriptName} must include ${later}`);
  if (earlyIndex >= 0 && lateIndex >= 0 && earlyIndex > lateIndex) {
    failures.push(`${scriptName} must run ${earlier} before ${later}`);
  }
}
if (!contentGoalReadinessScript.includes('npm run source:critic-regeneration-health')) failures.push('content:goal-readiness must rebuild source critic regeneration health');
if (!contentGoalReadinessScript.includes('npm run source:critic-regeneration-health-check')) failures.push('content:goal-readiness must validate source critic regeneration health');
if (!contentGoalReadinessScript.includes('npm run source:review-sequencer')) failures.push('content:goal-readiness must rebuild source review sequencer');
if (!contentGoalReadinessScript.includes('npm run source:review-sequencer-check')) failures.push('content:goal-readiness must validate source review sequencer');
if (!contentGoalReadinessScript.includes('npm run source:review-target-packet')) failures.push('content:goal-readiness must rebuild source review target packet');
if (!contentGoalReadinessScript.includes('npm run source:review-target-packet-check')) failures.push('content:goal-readiness must validate source review target packet');
if (!contentGoalReadinessScript.includes('npm run source:next-review')) failures.push('content:goal-readiness must rebuild source next review');
if (!contentGoalReadinessScript.includes('npm run source:next-review-check')) failures.push('content:goal-readiness must validate source next review');
if (!contentGoalReadinessScript.includes('npm run source:next-decision-draft')) failures.push('content:goal-readiness must rebuild source next decision draft');
if (!contentGoalReadinessScript.includes('npm run source:next-decision-draft-check')) failures.push('content:goal-readiness must validate source next decision draft');
if (!contentGoalReadinessScript.includes('npm run source:regeneration-workspace')) failures.push('content:goal-readiness must rebuild source regeneration workspace');
if (!contentGoalReadinessScript.includes('npm run source:regeneration-workspace-check')) failures.push('content:goal-readiness must validate source regeneration workspace');
if (!contentGoalReadinessScript.includes('npm run source:approval-session')) failures.push('content:goal-readiness must rebuild source approval session');
if (!contentGoalReadinessScript.includes('npm run source:approval-marathon')) failures.push('content:goal-readiness must rebuild source approval marathon');
if (!contentGoalReadinessScript.includes('npm run content:goal-audit')) failures.push('content:goal-readiness must rebuild content goal audit');
if (!contentGoalReadinessScript.includes('npm run content:quality-gate-matrix')) failures.push('content:goal-readiness must rebuild content quality gate matrix');
if (!contentGoalReadinessScript.includes('npm run content:quality-gate-next')) failures.push('content:goal-readiness must rebuild content quality gate next packet');
if (!contentGoalReadinessScript.includes('npm run content:runtime-cohesion-review')) failures.push('content:goal-readiness must rebuild runtime cohesion review packet');
if (!contentGoalReadinessScript.includes('npm run content:subagent-audit-ledger')) failures.push('content:goal-readiness must rebuild content subagent audit ledger');
if (!contentGoalReadinessScript.includes('npm run content:visual-feedback')) failures.push('content:goal-readiness must rebuild content visual feedback ledger');
if (!contentGoalReadinessScript.includes('npm run content:visual-regeneration')) failures.push('content:goal-readiness must rebuild content visual regeneration queue');
requireOrderedScriptCommand('content:goal-readiness', contentGoalReadinessScript, 'npm run source:critic-regeneration-health', 'npm run source:review-sequencer');
requireOrderedScriptCommand('content:goal-readiness', contentGoalReadinessScript, 'npm run source:review-sequencer', 'npm run source:review-target-packet');
requireOrderedScriptCommand('content:goal-readiness', contentGoalReadinessScript, 'npm run source:review-target-packet', 'npm run source:next-review');
requireOrderedScriptCommand('content:goal-readiness', contentGoalReadinessScript, 'npm run source:next-review', 'npm run source:next-decision-draft');
requireOrderedScriptCommand('content:goal-readiness', contentGoalReadinessScript, 'npm run source:next-decision-draft', 'npm run source:regeneration-workspace');
requireOrderedScriptCommand('content:goal-readiness', contentGoalReadinessScript, 'npm run source:regeneration-workspace', 'node tools/build_content_goal_readiness.mjs');
requireOrderedScriptCommand('content:goal-readiness', contentGoalReadinessScript, 'node tools/build_content_goal_readiness.mjs', 'npm run source:approval-session');
requireOrderedScriptCommand('content:goal-readiness', contentGoalReadinessScript, 'npm run source:approval-session', 'npm run source:approval-marathon');
requireOrderedScriptCommand('content:goal-readiness', contentGoalReadinessScript, 'npm run source:approval-marathon', 'npm run content:subagent-audit-ledger');
requireOrderedScriptCommand('content:goal-readiness', contentGoalReadinessScript, 'npm run content:subagent-audit-ledger', 'npm run content:visual-feedback');
requireOrderedScriptCommand('content:goal-readiness', contentGoalReadinessScript, 'npm run content:visual-feedback', 'npm run content:visual-regeneration');
requireOrderedScriptCommand('content:goal-readiness', contentGoalReadinessScript, 'npm run content:visual-regeneration', 'npm run content:goal-audit');
requireOrderedScriptCommand('content:goal-readiness', contentGoalReadinessScript, 'npm run content:goal-audit', 'npm run content:quality-gate-matrix');
requireOrderedScriptCommand('content:goal-readiness', contentGoalReadinessScript, 'npm run content:quality-gate-matrix', 'npm run content:quality-gate-next');
requireOrderedScriptCommand('content:goal-readiness', contentGoalReadinessScript, 'npm run content:quality-gate-next', 'npm run content:runtime-cohesion-review');
const contentGoalReadinessCheckScript = packageJson?.scripts?.['content:goal-readiness-check'] ?? '';
if (!contentGoalReadinessCheckScript.includes('npm run source:next-decision-draft-check')) failures.push('content:goal-readiness-check must validate source next decision draft');
if (!contentGoalReadinessCheckScript.includes('npm run source:approval-session-check')) failures.push('content:goal-readiness-check must validate source approval session');
if (!contentGoalReadinessCheckScript.includes('npm run source:approval-marathon-check')) failures.push('content:goal-readiness-check must validate source approval marathon');
if (!contentGoalReadinessCheckScript.includes('npm run source:approval-marathon-workspace-smoke')) failures.push('content:goal-readiness-check must run source approval marathon workspace smoke');
if (!contentGoalReadinessCheckScript.includes('npm run source:approval-marathon-full-batch-smoke')) failures.push('content:goal-readiness-check must run source approval marathon full-batch smoke');
if (!contentGoalReadinessCheckScript.includes('npm run content:review-session-strict-roundtrip-smoke')) failures.push('content:goal-readiness-check must run content review session strict roundtrip smoke');
if (!contentGoalReadinessCheckScript.includes('npm run content:threat-decisions-apply-smoke')) failures.push('content:goal-readiness-check must run threat decision apply smoke');
if (!contentGoalReadinessCheckScript.includes('npm run content:synthetic-decision-guards-check')) failures.push('content:goal-readiness-check must validate synthetic decision guards');
if (!contentGoalReadinessCheckScript.includes('npm run content:goal-audit-check')) failures.push('content:goal-readiness-check must validate content goal audit');
if (!contentGoalReadinessCheckScript.includes('npm run content:quality-gate-matrix-check')) failures.push('content:goal-readiness-check must validate content quality gate matrix');
if (!contentGoalReadinessCheckScript.includes('npm run content:strict-gate-negative-smoke')) failures.push('content:goal-readiness-check must run strict gate negative smoke');
if (!contentGoalReadinessCheckScript.includes('npm run content:quality-gate-next-check')) failures.push('content:goal-readiness-check must validate content quality gate next packet');
if (!contentGoalReadinessCheckScript.includes('npm run content:runtime-cohesion-review-check')) failures.push('content:goal-readiness-check must validate runtime cohesion review packet');
if (!contentGoalReadinessCheckScript.includes('npm run content:subagent-audit-ledger-check')) failures.push('content:goal-readiness-check must validate content subagent audit ledger');
if (!contentGoalReadinessCheckScript.includes('npm run content:visual-feedback-check')) failures.push('content:goal-readiness-check must validate content visual feedback ledger');
if (!contentGoalReadinessCheckScript.includes('npm run content:visual-regeneration-check')) failures.push('content:goal-readiness-check must validate content visual regeneration queue');
requireOrderedScriptCommand('content:goal-readiness-check', contentGoalReadinessCheckScript, 'npm run content:subagent-audit-ledger-check', 'npm run content:visual-feedback-check');
requireOrderedScriptCommand('content:goal-readiness-check', contentGoalReadinessCheckScript, 'npm run source:approval-session-check', 'npm run source:approval-marathon-check');
requireOrderedScriptCommand('content:goal-readiness-check', contentGoalReadinessCheckScript, 'npm run source:approval-marathon-check', 'npm run source:approval-marathon-workspace-smoke');
requireOrderedScriptCommand('content:goal-readiness-check', contentGoalReadinessCheckScript, 'npm run source:approval-marathon-workspace-smoke', 'npm run source:approval-marathon-full-batch-smoke');
requireOrderedScriptCommand('content:goal-readiness-check', contentGoalReadinessCheckScript, 'npm run source:approval-marathon-full-batch-smoke', 'npm run content:review-session-strict-roundtrip-smoke');
requireOrderedScriptCommand('content:goal-readiness-check', contentGoalReadinessCheckScript, 'npm run content:review-session-strict-roundtrip-smoke', 'npm run content:threat-decisions-apply-smoke');
requireOrderedScriptCommand('content:goal-readiness-check', contentGoalReadinessCheckScript, 'npm run content:threat-decisions-apply-smoke', 'npm run content:synthetic-decision-guards-check');
requireOrderedScriptCommand('content:goal-readiness-check', contentGoalReadinessCheckScript, 'npm run content:synthetic-decision-guards-check', 'npm run content:subagent-audit-ledger-check');
requireOrderedScriptCommand('content:goal-readiness-check', contentGoalReadinessCheckScript, 'npm run content:visual-feedback-check', 'npm run content:visual-regeneration-check');
if (!packageJson?.scripts?.['content:runtime-cohesion-review']?.includes('build_content_runtime_cohesion_review.mjs')) failures.push('content:runtime-cohesion-review script missing builder');
if (!packageJson?.scripts?.['content:runtime-cohesion-review-check']?.includes('validate_content_runtime_cohesion_review.mjs')) failures.push('content:runtime-cohesion-review-check script missing validator');
if (!packageJson?.scripts?.['content:runtime-cohesion-review:serve-smoke']?.includes('/review/content-runtime-cohesion-review.html')) failures.push('content:runtime-cohesion-review:serve-smoke must target runtime cohesion page');
requireOrderedScriptCommand('content:goal-readiness-check', contentGoalReadinessCheckScript, 'npm run content:visual-regeneration-check', 'npm run content:goal-audit-check');
requireOrderedScriptCommand('content:goal-readiness-check', contentGoalReadinessCheckScript, 'npm run content:goal-audit-check', 'npm run content:quality-gate-matrix-check');
requireOrderedScriptCommand('content:goal-readiness-check', contentGoalReadinessCheckScript, 'npm run content:quality-gate-matrix-check', 'npm run content:strict-gate-negative-smoke');
requireOrderedScriptCommand('content:goal-readiness-check', contentGoalReadinessCheckScript, 'npm run content:strict-gate-negative-smoke', 'npm run content:quality-gate-next-check');
requireOrderedScriptCommand('content:goal-readiness-check', contentGoalReadinessCheckScript, 'npm run content:quality-gate-matrix-check', 'npm run content:quality-gate-next-check');
const contentGoalAuditServeSmokeScript = packageJson?.scripts?.['content:goal-audit:serve-smoke'] ?? '';
if (!contentGoalAuditServeSmokeScript.includes('/review/content-goal-audit.html')) failures.push('content:goal-audit:serve-smoke must target the content goal audit page');
const contentQualityGateMatrixServeSmokeScript = packageJson?.scripts?.['content:quality-gate-matrix:serve-smoke'] ?? '';
if (!contentQualityGateMatrixServeSmokeScript.includes('/review/content-quality-gate-matrix.html')) failures.push('content:quality-gate-matrix:serve-smoke must target the quality gate matrix page');
const contentQualityGateNextServeSmokeScript = packageJson?.scripts?.['content:quality-gate-next:serve-smoke'] ?? '';
if (!contentQualityGateNextServeSmokeScript.includes('/review/content-quality-gate-next.html')) failures.push('content:quality-gate-next:serve-smoke must target the next quality gate page');
const contentSubagentAuditLedgerServeSmokeScript = packageJson?.scripts?.['content:subagent-audit-ledger:serve-smoke'] ?? '';
if (!contentSubagentAuditLedgerServeSmokeScript.includes('/review/content-subagent-audit-ledger.html')) failures.push('content:subagent-audit-ledger:serve-smoke must target the subagent audit ledger page');
const contentVisualFeedbackLedgerServeSmokeScript = packageJson?.scripts?.['content:visual-feedback:serve-smoke'] ?? '';
if (!contentVisualFeedbackLedgerServeSmokeScript.includes('/review/content-visual-feedback-ledger.html')) failures.push('content:visual-feedback:serve-smoke must target the visual feedback ledger page');
const contentVisualRegenerationQueueServeSmokeScript = packageJson?.scripts?.['content:visual-regeneration:serve-smoke'] ?? '';
if (!contentVisualRegenerationQueueServeSmokeScript.includes('/review/content-visual-regeneration-queue.html')) failures.push('content:visual-regeneration:serve-smoke must target the visual regeneration queue page');
const pairedVisualScript = packageJson?.scripts?.['sandbox:visual:paired'] ?? '';
if (!pairedVisualScript.includes('--ids abyssal-gulper')) failures.push('sandbox:visual:paired must target abyssal-gulper');
if (!pairedVisualScript.includes('--with diver')) failures.push('sandbox:visual:paired must render with diver companion');
if (!pairedVisualScript.includes('--states idle,lunge,stunned')) failures.push('sandbox:visual:paired must cover idle,lunge,stunned');
const targetPairedVisualScript = packageJson?.scripts?.['sandbox:visual:paired:targets'] ?? '';
if (!targetPairedVisualScript.includes('tools/test_sandbox_paired_target_visuals.mjs')) failures.push('sandbox:visual:paired:targets must run target paired visual smoke');
const quickTargetPairedVisualScript = packageJson?.scripts?.['sandbox:visual:paired:targets:quick'] ?? '';
if (!quickTargetPairedVisualScript.includes('tools/test_sandbox_paired_target_visuals.mjs')) failures.push('sandbox:visual:paired:targets:quick must run target paired visual smoke');
if (!quickTargetPairedVisualScript.includes('--include-sources')) failures.push('sandbox:visual:paired:targets:quick must include matching source previews');
if (!quickTargetPairedVisualScript.includes('--no-artifacts')) failures.push('sandbox:visual:paired:targets:quick must use no-artifacts mode');
const quickAllPairedVisualScript = packageJson?.scripts?.['sandbox:visual:paired:all:quick'] ?? '';
if (!quickAllPairedVisualScript.includes('tools/check_sandbox_visuals.mjs')) failures.push('sandbox:visual:paired:all:quick must use sandbox visual checker');
if (!quickAllPairedVisualScript.includes('--all-catalog')) failures.push('sandbox:visual:paired:all:quick must cover the full sandbox catalog');
if (!quickAllPairedVisualScript.includes('--with diver')) failures.push('sandbox:visual:paired:all:quick must render with diver companion');
if (!quickAllPairedVisualScript.includes('--no-artifacts')) failures.push('sandbox:visual:paired:all:quick must use no-artifacts mode');
const sandboxPreviewAuditScript = packageJson?.scripts?.['sandbox:preview-audit'] ?? '';
if (!sandboxPreviewAuditScript.includes('tools/test_sandbox_preview_audit.mjs')) failures.push('sandbox:preview-audit must run preview audit test');
for (const expected of [
  'water9/sandbox-preview-audit@1',
  'readOnly: true',
  'tools/validate_sandbox_index.mjs',
  'tools/validate_sandbox_quickstart.mjs',
  'tools/preview_sandbox_lab.mjs',
  'tools/validate_sandbox_runtime_catalog.mjs',
  'tools/preview_sandbox_entity.mjs',
  'tools/check_sandbox_visuals.mjs',
  'gulper',
  'source-gulper-eel-maw',
  '--with',
  'diver',
  '--no-artifacts',
  'idle,lunge,stunned',
]) {
  if (!sandboxPreviewAuditTest.includes(expected)) failures.push(`sandbox preview audit must assert ${expected}`);
}
for (const expected of [
  'water9/sandbox-target-paired-visuals-smoke@1',
  'public/review/content-stage-board.json',
  'stageBoard.targets',
  'includeSources',
  'noArtifacts',
  'source-${target.id}',
  '--no-artifacts',
  '--with',
  'diver',
  'idle,lunge,stunned',
  'tools/check_sandbox_visuals.mjs',
]) {
  if (!sandboxPairedTargetVisualSmokeTest.includes(expected)) failures.push(`sandbox paired target visual smoke must assert ${expected}`);
}
const contentSmokeScript = packageJson?.scripts?.['content:gate:smoke'] ?? '';
const contentInfraFullScript = packageJson?.scripts?.['content:infra-gate:full'] ?? '';
const contentWorkbenchScript = packageJson?.scripts?.['content:workbench'] ?? '';
const sourceCheckScript = packageJson?.scripts?.['source:check'] ?? '';
const contentGoalGateScript = packageJson?.scripts?.['content:goal-gate'] ?? '';
const contentGoalPreviewSmokeScript = packageJson?.scripts?.['content:goal-preview-smoke'] ?? '';
for (const [name, script] of Object.entries(packageJson?.scripts ?? {})) {
  if (String(script).includes('--allow-prototypes') && !name.includes('smoke')) {
    failures.push(`${name}: --allow-prototypes is only allowed in smoke scripts`);
  }
}
if (!contentSmokeScript.includes('npm run sandbox:preview-check')) failures.push('content:gate:smoke must run sandbox:preview-check');
if (!contentInfraFullScript.includes('npm run sandbox:preview-check')) failures.push('content:infra-gate:full must run sandbox:preview-check');
if (!contentSmokeScript.includes('npm run sandbox:quickstart')) failures.push('content:gate:smoke must run sandbox:quickstart');
if (!contentSmokeScript.includes('npm run sandbox:quickstart-check')) failures.push('content:gate:smoke must run sandbox:quickstart-check');
if (!contentInfraFullScript.includes('npm run sandbox:quickstart')) failures.push('content:infra-gate:full must run sandbox:quickstart');
if (!contentInfraFullScript.includes('npm run sandbox:quickstart-check')) failures.push('content:infra-gate:full must run sandbox:quickstart-check');
if (!contentWorkbenchScript.includes('npm run sandbox:quickstart')) failures.push('content:workbench must run sandbox:quickstart');
if (!contentSmokeScript.includes('npm run sandbox:lab-check')) failures.push('content:gate:smoke must run sandbox:lab-check');
if (!contentSmokeScript.includes('npm run sandbox:lab-smoke')) failures.push('content:gate:smoke must run sandbox:lab-smoke');
if (!contentInfraFullScript.includes('npm run sandbox:lab-check')) failures.push('content:infra-gate:full must run sandbox:lab-check');
if (!contentInfraFullScript.includes('npm run sandbox:lab-smoke')) failures.push('content:infra-gate:full must run sandbox:lab-smoke');
if (!contentGoalGateScript.includes('npm run content:goal-preview-smoke')) failures.push('content:goal-gate must run content:goal-preview-smoke');
if (!contentSmokeScript.includes('npm run content:goal-preview-smoke')) failures.push('content:gate:smoke must run content:goal-preview-smoke');
if (!contentGoalGateScript.includes('npm run content:review-session-workspace-smoke')) failures.push('content:goal-gate must run content:review-session-workspace-smoke');
if (!contentSmokeScript.includes('npm run content:review-session-workspace-smoke')) failures.push('content:gate:smoke must run content:review-session-workspace-smoke');
if (!contentInfraFullScript.includes('npm run content:review-session-workspace-smoke')) failures.push('content:infra-gate:full must run content:review-session-workspace-smoke');
if (!contentGoalGateScript.includes('npm run content:review-session-strict-roundtrip-smoke')) failures.push('content:goal-gate must run content:review-session-strict-roundtrip-smoke');
if (!contentSmokeScript.includes('npm run content:review-session-strict-roundtrip-smoke')) failures.push('content:gate:smoke must run content:review-session-strict-roundtrip-smoke');
if (!contentInfraFullScript.includes('npm run content:review-session-strict-roundtrip-smoke')) failures.push('content:infra-gate:full must run content:review-session-strict-roundtrip-smoke');
for (const expected of [
  'water9/content-review-session-workspace-smoke@1',
  'data-source-check',
  'data-threat-check',
  'sourceChecks',
  'threatChecks',
  'reviewedOnlySource',
  'reviewedOnlyThreat',
  'data-source-reviewed-decision-output',
  'data-threat-reviewed-decision-output',
  'failedChecks',
  'water9.contentReviewSession.draft',
]) {
  if (!contentReviewSessionWorkspaceSmokeTest.includes(expected)) failures.push(`content review session workspace smoke must assert ${expected}`);
}
for (const expected of [
  'water9/content-review-session-strict-roundtrip-smoke@1',
  'data-source-reviewed-decision-output',
  'data-threat-reviewed-decision-output',
  'tools/apply_source_cohesion_decisions.mjs',
  'tools/apply_content_threat_acceptance_decisions.mjs',
  '--strict',
  'sourceReport',
  'threatReport',
  'sourceApplyGuardReport',
  'threatApplyGuardReport',
  'sourceApproved',
  'threatAccepted',
  'sourceApplyGuardBlocked',
  'threatApplyGuardBlocked',
  'threatBlockedBySourceGate',
  '--source-reviewed',
  'dryRunOnly',
  'smokeTestArtifact',
  '--apply',
  'decision file policy.dryRunOnly forbids --apply',
  'source roundtrip dryRunOnly apply guard unexpectedly exited 0',
  'threat roundtrip dryRunOnly apply guard unexpectedly exited 0',
  'source roundtrip dryRunOnly apply guard allowed an applied result',
  'threat roundtrip dryRunOnly apply guard allowed an applied result',
  'content-review-session-source-roundtrip.json',
  'content-review-session-threat-roundtrip.json',
  'content-review-session-source-roundtrip-apply-guard-report.json',
  'content-review-session-threat-roundtrip-apply-guard-report.json',
]) {
  if (!contentReviewSessionStrictRoundtripSmokeTest.includes(expected)) failures.push(`content review session strict roundtrip smoke must assert ${expected}`);
}
for (const expected of [
  'npm run sandbox:index:check',
  'npm run sandbox:quickstart-check',
  'npm run sandbox:preview-audit',
  'npm run sandbox:preview-check',
  'npm run sandbox:lab-check',
  'npm run sandbox:lab-smoke',
  'npm run sandbox:runtime-check',
  'npm run source:preview-check',
  'npm run source:preview-paired-check',
  'npm run sandbox:visual:paired:targets:quick',
  'npm run content:review-pages:serve-smoke',
  'npm run content:review-cockpit:serve-smoke',
]) {
  if (!contentGoalPreviewSmokeScript.includes(expected)) failures.push(`content:goal-preview-smoke missing ${expected}`);
}
requireOrderedScriptCommand('content:goal-preview-smoke', contentGoalPreviewSmokeScript, 'npm run sandbox:quickstart-check', 'npm run sandbox:preview-audit');
requireOrderedScriptCommand('content:goal-preview-smoke', contentGoalPreviewSmokeScript, 'npm run sandbox:preview-audit', 'npm run sandbox:preview-check');
if (!contentSmokeScript.includes('npm run content:quality-predicate-smoke')) failures.push('content:gate:smoke must run content:quality-predicate-smoke');
if (!contentInfraFullScript.includes('npm run content:quality-predicate-smoke')) failures.push('content:infra-gate:full must run content:quality-predicate-smoke');
if (!contentSmokeScript.includes('npm run content:acceptance-audit')) failures.push('content:gate:smoke must run content:acceptance-audit');
if (!contentSmokeScript.includes('npm run content:acceptance-audit-check')) failures.push('content:gate:smoke must run content:acceptance-audit-check');
if (!contentSmokeScript.includes('npm run content:acceptance-audit-index')) failures.push('content:gate:smoke must run content:acceptance-audit-index');
if (!contentSmokeScript.includes('npm run content:acceptance-audit-index-check')) failures.push('content:gate:smoke must run content:acceptance-audit-index-check');
if (!contentSmokeScript.includes('npm run content:acceptance-audit-index:serve-smoke')) failures.push('content:gate:smoke must run content:acceptance-audit-index:serve-smoke');
if (!contentInfraFullScript.includes('npm run content:acceptance-audit')) failures.push('content:infra-gate:full must run content:acceptance-audit');
if (!contentInfraFullScript.includes('npm run content:acceptance-audit-check')) failures.push('content:infra-gate:full must run content:acceptance-audit-check');
if (!contentInfraFullScript.includes('npm run content:acceptance-audit-index')) failures.push('content:infra-gate:full must run content:acceptance-audit-index');
if (!contentInfraFullScript.includes('npm run content:acceptance-audit-index-check')) failures.push('content:infra-gate:full must run content:acceptance-audit-index-check');
if (!contentInfraFullScript.includes('npm run content:acceptance-audit-index:serve-smoke')) failures.push('content:infra-gate:full must run content:acceptance-audit-index:serve-smoke');
if (!contentWorkbenchScript.includes('npm run content:acceptance-doctor')) failures.push('content:workbench must run content:acceptance-doctor');
if (!contentWorkbenchScript.includes('npm run content:acceptance-audit-index')) failures.push('content:workbench must run content:acceptance-audit-index');
if (!contentWorkbenchScript.includes('npm run content:review-evidence')) failures.push('content:workbench must run content:review-evidence');
if (!contentWorkbenchScript.includes('npm run content:review-cockpit')) failures.push('content:workbench must run content:review-cockpit');
if (!contentWorkbenchScript.includes('npm run content:threat-decisions')) failures.push('content:workbench must run content:threat-decisions');
if (!contentWorkbenchScript.includes('npm run content:threat-decisions-apply')) failures.push('content:workbench must run content:threat-decisions-apply');
if (!contentWorkbenchScript.includes('npm run content:approved-runtime-handoff')) failures.push('content:workbench must run content:approved-runtime-handoff');
if (!contentWorkbenchScript.includes('npm run content:vertical-slice')) failures.push('content:workbench must run content:vertical-slice');
if (!contentWorkbenchScript.includes('npm run content:human-signoff')) failures.push('content:workbench must run content:human-signoff');
if (!contentWorkbenchScript.includes('npm run content:human-adjudication-board')) failures.push('content:workbench must run content:human-adjudication-board');
if (!contentWorkbenchScript.includes('npm run content:review-session')) failures.push('content:workbench must run content:review-session');
if (!contentWorkbenchScript.includes('npm run content:production-proof')) failures.push('content:workbench must run content:production-proof');
if (!contentWorkbenchScript.includes('npm run content:promote-approved-threats')) failures.push('content:workbench must run content:promote-approved-threats');
if (!contentWorkbenchScript.includes('npm run content:runtime-cohesion-review')) failures.push('content:workbench must run content:runtime-cohesion-review');
if (!contentWorkbenchScript.includes('npm run content:sandbox-roster')) failures.push('content:workbench must run content:sandbox-roster');
if (!contentWorkbenchScript.includes('npm run content:articulation-roster')) failures.push('content:workbench must run content:articulation-roster');
if (!contentWorkbenchScript.includes('npm run content:reproducibility')) failures.push('content:workbench must run content:reproducibility');
if (!contentGoalGateScript.includes('npm run content:reproducibility')) failures.push('content:goal-gate must run content:reproducibility');
if (!contentGoalGateScript.includes('npm run content:reproducibility-check')) failures.push('content:goal-gate must run content:reproducibility-check');
if (!contentWorkbenchScript.includes('npm run source:visual-board')) failures.push('content:workbench must build source:visual-board');
if (!contentWorkbenchScript.includes('npm run source:critic-board')) failures.push('content:workbench must build source:critic-board');
if (!contentWorkbenchScript.includes('npm run source:critic-regeneration')) failures.push('content:workbench must build source:critic-regeneration');
if (!contentWorkbenchScript.includes('npm run source:critic-regeneration-health')) failures.push('content:workbench must build source:critic-regeneration-health');
if (!contentWorkbenchScript.includes('npm run source:review-sequencer')) failures.push('content:workbench must build source:review-sequencer');
if (!contentWorkbenchScript.includes('npm run source:review-target-packet')) failures.push('content:workbench must build source:review-target-packet');
if (!contentWorkbenchScript.includes('npm run source:regeneration-workspace')) failures.push('content:workbench must build source:regeneration-workspace');
if (!contentWorkbenchScript.includes('npm run source:next-decision-draft')) failures.push('content:workbench must build source:next-decision-draft');
if (!contentWorkbenchScript.includes('npm run source:approval-session')) failures.push('content:workbench must build source:approval-session');
if (!contentWorkbenchScript.includes('npm run source:approval-marathon')) failures.push('content:workbench must build source:approval-marathon');
if (!contentWorkbenchScript.includes('npm run content:goal-readiness')) failures.push('content:workbench must rebuild content goal readiness and goal audit');
if (!contentWorkbenchScript.includes('npm run source:replace-runway')) failures.push('content:workbench must build source:replace-runway');
if (!reviewPagePreviewTest.includes("path: '/review/content-human-signoff-queue.html'")) failures.push('content review page smoke must open human sign-off queue');
if (!reviewPagePreviewTest.includes("path: '/review/content-human-adjudication-board.html'")) failures.push('content review page smoke must open human adjudication board');
if (!reviewPagePreviewTest.includes("path: '/review/content-review-session.html'")) failures.push('content review page smoke must open content review session');
if (!reviewPagePreviewTest.includes("path: '/review/content-sandbox-roster.html'")) failures.push('content review page smoke must open content sandbox roster');
if (!reviewPagePreviewTest.includes("path: '/review/content-articulation-roster.html'")) failures.push('content review page smoke must open content articulation roster');
if (!reviewPagePreviewTest.includes("path: '/review/content-reproducibility.html'")) failures.push('content review page smoke must open content reproducibility');
if (!reviewPagePreviewTest.includes("path: '/review/source-candidates/source-regeneration-workspace.html'")) failures.push('content review page smoke must open source regeneration workspace');
for (const expected of [
  'Water9 Human Content Sign-Off Queue',
  'Human-only approval surface for the 20-threat gate',
  'human reviewer required; dry-run commands only',
  'npm run content:human-signoff',
  'npm run content:human-signoff-check',
  'npm run content:goal-gate',
  'data-human-signoff-route',
]) {
  if (!reviewPagePreviewTest.includes(expected)) failures.push(`content review page smoke must assert human sign-off evidence: ${expected}`);
}
for (const expected of [
  'Water9 Human Adjudication Board',
  'Dense human review board for the 20-threat gate',
  'Human Approval Boundary',
  'Automation can gather evidence and produce dry-run commands',
  'npm run content:human-adjudication-board',
  'npm run content:human-adjudication-board-check',
  'data-human-adjudication',
  'humanAdjudicationTarget.commands?.sourceApprovalDryRun',
  'humanAdjudicationTarget.commands?.threatAcceptanceDryRun',
]) {
  if (!reviewPagePreviewTest.includes(expected)) failures.push(`content review page smoke must assert human adjudication board evidence: ${expected}`);
}
for (const expected of [
  'Water9 Content Review Session',
  'Single-session workspace for human review of the 20-threat gate',
  'Human Approval Boundary',
  'Download source decisions',
  'Download reviewed-only source decisions',
  'Download threat decisions',
  'Download reviewed-only threat decisions',
  'Regenerate decision JSON from controls',
  'data-reviewer',
  'data-reviewed-at',
  'data-regenerate-decisions',
  'data-source-decision-output',
  'data-threat-decision-output',
  'data-source-reviewed-decision-output',
  'data-threat-reviewed-decision-output',
  'data-source-check',
  'data-threat-check',
  'Gate truth:',
  'not accepted yet. Ready means reviewable, not approved or accepted.',
  'data-decision-controls',
  'npm run content:review-session',
  'npm run content:review-session-check',
  'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
  'npm run content:threat-decisions-apply -- --decisions water9-threat-acceptance-reviewed-decisions.json --strict',
  'data-review-session-target',
  'contentReviewSessionTarget.commands?.sourceApprovalDryRun',
  'contentReviewSessionTarget.commands?.threatAcceptanceDryRun',
]) {
  if (!reviewPagePreviewTest.includes(expected)) failures.push(`content review page smoke must assert content review session evidence: ${expected}`);
}
for (const expected of [
  'Water9 Production Proof',
  'Prototype preview is not production acceptance',
  'Acceptance Rule',
  'Strict production ready',
  'npm run content:production-proof',
  'npm run content:production-proof-check',
  'data-production-proof',
  'contentProductionProofTarget.commands?.find',
]) {
  if (!reviewPagePreviewTest.includes(expected)) failures.push(`content review page smoke must assert production proof evidence: ${expected}`);
}
for (const expected of [
  'Water9 Promote Approved Threats',
  'Target-only promotion runway',
  'Download target-only threat decisions',
  'data-promote-approved-threats-workspace',
  'data-promote-threat-decisions',
  'npm run content:promote-approved-threats',
  'npm run content:promote-approved-threats-check',
  'water9-target-threat-acceptance-decisions.json --strict',
  'contentPromoteApprovedThreatsTarget.commands?.applyTargetDecisionsStrict',
]) {
  if (!reviewPagePreviewTest.includes(expected)) failures.push(`content review page smoke must assert promote approved threats evidence: ${expected}`);
}
for (const expected of [
  'Water9 Content Sandbox Roster',
  'Quick launch surface for all 20 target threats',
  'Previewable does not mean accepted',
  'npm run content:sandbox-roster',
  'npm run content:sandbox-roster-check',
  'data-sandbox-roster',
  'contentSandboxRosterTarget.runtime?.pairedPreviewCommand',
  'contentSandboxRosterTarget.source?.pairedVisualCheckCommand',
]) {
  if (!reviewPagePreviewTest.includes(expected)) failures.push(`content review page smoke must assert content sandbox roster evidence: ${expected}`);
}
for (const expected of [
  'Water9 Content Articulation Roster',
  'Source-to-articulation quality path',
  'Previewable and extractable still does not mean accepted',
  'npm run content:articulation-roster',
  'npm run content:articulation-roster-check',
  'data-articulation-roster',
  'contentArticulationRosterTarget.commands?.mechanicalPrepare',
  'contentArticulationRosterTarget.commands?.extractDryRun',
]) {
  if (!reviewPagePreviewTest.includes(expected)) failures.push(`content review page smoke must assert content articulation roster evidence: ${expected}`);
}
if (!sourceCheckScript.includes('npm run source:preview-paired-check')) failures.push('source:check must run source:preview-paired-check');
if (!sourceCheckScript.includes('npm run source:visual-board')) failures.push('source:check must run source:visual-board');
if (!sourceCheckScript.includes('npm run source:visual-board-check')) failures.push('source:check must run source:visual-board-check');
if (!sourceCheckScript.includes('npm run source:visual-board:serve-smoke')) failures.push('source:check must run source:visual-board:serve-smoke');
if (!sourceCheckScript.includes('npm run source:next-review')) failures.push('source:check must run source:next-review');
if (!sourceCheckScript.includes('npm run source:next-review-check')) failures.push('source:check must run source:next-review-check');
if (!packageJson?.scripts?.['source:next-decision-draft']?.includes('build_source_next_decision_draft.mjs')) failures.push('source:next-decision-draft script missing builder');
if (!packageJson?.scripts?.['source:next-decision-draft-check']?.includes('validate_source_next_decision_draft.mjs')) failures.push('source:next-decision-draft-check script missing validator');
if (!packageJson?.scripts?.['source:next-decision-draft:serve-smoke']?.includes('/review/source-candidates/source-next-decision-draft.html')) failures.push('source:next-decision-draft:serve-smoke must target decision draft page');
if (!sourceCheckScript.includes('build_source_replace_runway.mjs')) failures.push('source:check must build source replace runway');
if (!sourceCheckScript.includes('validate_source_replace_runway.mjs')) failures.push('source:check must validate source replace runway');
if (!sourceCheckScript.includes('test_source_replace_runway_preview.mjs')) failures.push('source:check must smoke source replace runway preview');
if (!sourceCheckScript.includes('npm run source:replacement-archive-smoke')) failures.push('source:check must run source replacement archive smoke script');
for (const expected of ['source-replacement-archive@1', '--overwrite', 'archivedImage', 'replacementInput']) {
  if (!sourceReplacementArchiveTest.includes(expected)) failures.push(`source replacement archive smoke must assert ${expected}`);
}
for (const expected of ['content-threat-acceptance-evidence-fingerprint@1', 'buildThreatEvidenceFingerprint', 'latestSandboxResultFor', 'sandbox-idle-screenshot']) {
  if (!threatEvidenceFingerprintModule.includes(expected)) failures.push(`threat evidence fingerprint module must include ${expected}`);
}
for (const expected of ['THREAT_EVIDENCE_FINGERPRINT_SCHEMA', 'strict accepted decision requires threat evidence fingerprint digest', 'threat evidence fingerprint is stale', '--evidence-fingerprint', 'content-visual-feedback-ledger.json', 'open blocking visual feedback']) {
  if (!threatDecisionApplyTool.includes(expected)) failures.push(`threat decision apply must enforce ${expected}`);
}
for (const expected of ['missing-fingerprint-smoke', 'stale-fingerprint-smoke', 'visual-feedback-blocker-smoke', 'strict accepted decision requires threat evidence fingerprint digest', 'threat evidence fingerprint is stale', 'open blocking visual feedback']) {
  if (!threatDecisionApplySmokeTest.includes(expected)) failures.push(`threat decision apply smoke must cover ${expected}`);
}
for (const expected of ['--evidence-fingerprint', 'accepted threat evidence fingerprint is stale', 'evidenceFingerprint: currentEvidenceFingerprint', 'content-visual-feedback-ledger.json', 'open blocking visual feedback']) {
  if (!threatAcceptTool.includes(expected)) failures.push(`threat accept tool must record/enforce ${expected}`);
}
for (const expected of ['THREAT_EVIDENCE_FINGERPRINT_SCHEMA', 'acceptance ledger evidenceFingerprint', 'buildThreatEvidenceFingerprint']) {
  if (!threatGateTool.includes(expected)) failures.push(`content gate must validate ${expected}`);
}
if (!sourceCheckScript.includes('node tools/test_source_cohesion_decision_workspace.mjs')) failures.push('source:check must run source cohesion decision workspace smoke');
if (!sourceCheckScript.includes('node tools/test_source_cohesion_decision_apply_smoke.mjs')) failures.push('source:check must run source cohesion decision apply smoke');
if (!contentSmokeScript.includes('npm run source:recovery-scout')) failures.push('content:gate:smoke must run source:recovery-scout');
if (!contentSmokeScript.includes('npm run source:recovery-scout-check')) failures.push('content:gate:smoke must run source:recovery-scout-check');
if (!contentInfraFullScript.includes('npm run source:recovery-scout')) failures.push('content:infra-gate:full must run source:recovery-scout');
if (!contentInfraFullScript.includes('npm run source:recovery-scout-check')) failures.push('content:infra-gate:full must run source:recovery-scout-check');
if (!contentSmokeScript.includes('npm run source:inbox-pack')) failures.push('content:gate:smoke must run source:inbox-pack');
if (!contentSmokeScript.includes('npm run source:inbox-pack-check')) failures.push('content:gate:smoke must run source:inbox-pack-check');
if (!contentInfraFullScript.includes('npm run source:inbox-pack')) failures.push('content:infra-gate:full must run source:inbox-pack');
if (!contentInfraFullScript.includes('npm run source:inbox-pack-check')) failures.push('content:infra-gate:full must run source:inbox-pack-check');
if (!contentSmokeScript.includes('npm run source:next-review')) failures.push('content:gate:smoke must run source:next-review');
if (!contentSmokeScript.includes('npm run source:next-review-check')) failures.push('content:gate:smoke must run source:next-review-check');
if (!contentSmokeScript.includes('npm run source:next-review:serve-smoke')) failures.push('content:gate:smoke must run source:next-review:serve-smoke');
if (!contentInfraFullScript.includes('npm run source:next-review')) failures.push('content:infra-gate:full must run source:next-review');
if (!contentInfraFullScript.includes('npm run source:next-review-check')) failures.push('content:infra-gate:full must run source:next-review-check');
if (!contentInfraFullScript.includes('npm run source:next-review:serve-smoke')) failures.push('content:infra-gate:full must run source:next-review:serve-smoke');
if (!reviewPagePreviewTest.includes("path: '/review/source-candidates/source-next-decision-draft.html'")) failures.push('content review page smoke must open source next decision draft');
if (!reviewPagePreviewTest.includes('data-source-next-decision-draft')) failures.push('content review page smoke must assert source next decision draft marker');
if (!reviewPagePreviewTest.includes('data-source-next-decision-json')) failures.push('content review page smoke must assert source next decision JSON marker');
if (!reviewPagePreviewTest.includes("path: '/review/content-runtime-cohesion-review.html'")) failures.push('content review page smoke must open runtime cohesion review');
if (!reviewPagePreviewTest.includes('data-runtime-cohesion-review')) failures.push('content review page smoke must assert runtime cohesion marker');
if (!reviewPagePreviewTest.includes('data-runtime-cohesion-decision-json')) failures.push('content review page smoke must assert runtime cohesion decision JSON marker');
if (!contentSmokeScript.includes('npm run research:dispatch')) failures.push('content:gate:smoke must run research:dispatch');
if (!contentSmokeScript.includes('npm run research:dispatch-check')) failures.push('content:gate:smoke must run research:dispatch-check');
if (!contentInfraFullScript.includes('npm run research:dispatch')) failures.push('content:infra-gate:full must run research:dispatch');
if (!contentInfraFullScript.includes('npm run research:dispatch-check')) failures.push('content:infra-gate:full must run research:dispatch-check');
if (!contentSmokeScript.includes('npm run source:approval-runway:preview-check')) failures.push('content:gate:smoke must run source:approval-runway:preview-check');
if (!contentSmokeScript.includes('npm run source:approval-runway:serve-smoke')) failures.push('content:gate:smoke must run source:approval-runway:serve-smoke');
if (!contentInfraFullScript.includes('npm run source:approval-runway:preview-check')) failures.push('content:infra-gate:full must run source:approval-runway:preview-check');
if (!contentInfraFullScript.includes('npm run source:approval-runway:serve-smoke')) failures.push('content:infra-gate:full must run source:approval-runway:serve-smoke');
if (!contentSmokeScript.includes('npm run source:approval-marathon')) failures.push('content:gate:smoke must rebuild source approval marathon');
if (!contentSmokeScript.includes('npm run source:approval-marathon-check')) failures.push('content:gate:smoke must validate source approval marathon');
if (!contentSmokeScript.includes('npm run source:approval-marathon-workspace-smoke')) failures.push('content:gate:smoke must smoke-test the source approval marathon workspace');
if (!contentSmokeScript.includes('npm run source:approval-marathon-full-batch-smoke')) failures.push('content:gate:smoke must smoke-test full-batch source approval marathon decisions');
if (!contentSmokeScript.includes('npm run source:replace-runway')) failures.push('content:gate:smoke must run source:replace-runway');
if (!contentSmokeScript.includes('npm run source:replace-runway-check')) failures.push('content:gate:smoke must run source:replace-runway-check');
if (!contentSmokeScript.includes('npm run source:replace-runway:preview-check')) failures.push('content:gate:smoke must run source:replace-runway:preview-check');
if (!contentSmokeScript.includes('npm run source:replace-runway:serve-smoke')) failures.push('content:gate:smoke must run source:replace-runway:serve-smoke');
if (!contentInfraFullScript.includes('npm run source:replace-runway')) failures.push('content:infra-gate:full must run source:replace-runway');
if (!contentInfraFullScript.includes('npm run source:replace-runway-check')) failures.push('content:infra-gate:full must run source:replace-runway-check');
if (!contentInfraFullScript.includes('npm run source:replace-runway:preview-check')) failures.push('content:infra-gate:full must run source:replace-runway:preview-check');
if (!contentInfraFullScript.includes('npm run source:replace-runway:serve-smoke')) failures.push('content:infra-gate:full must run source:replace-runway:serve-smoke');
if (!contentSmokeScript.includes('npm run source:visual-board')) failures.push('content:gate:smoke must run source:visual-board');
if (!contentSmokeScript.includes('npm run source:visual-board-check')) failures.push('content:gate:smoke must run source:visual-board-check');
if (!contentSmokeScript.includes('npm run source:visual-board:serve-smoke')) failures.push('content:gate:smoke must run source:visual-board:serve-smoke');
if (!contentInfraFullScript.includes('npm run source:visual-board')) failures.push('content:infra-gate:full must run source:visual-board');
if (!contentInfraFullScript.includes('npm run source:visual-board-check')) failures.push('content:infra-gate:full must run source:visual-board-check');
if (!contentInfraFullScript.includes('npm run source:visual-board:serve-smoke')) failures.push('content:infra-gate:full must run source:visual-board:serve-smoke');
if (!reviewPagePreviewTest.includes("path: '/review/source-visual-board.html'")) failures.push('content review page smoke must open source visual board');
if (!reviewPagePreviewTest.includes("path: '/review/source-candidates/source-critic-board.html'")) failures.push('content review page smoke must open source critic board');
if (!reviewPagePreviewTest.includes("path: '/review/source-candidates/source-critic-regeneration-queue.html'")) failures.push('content review page smoke must open source critic regeneration queue');
if (!reviewPagePreviewTest.includes("path: '/review/source-candidates/source-critic-regeneration-doctor.html'")) failures.push('content review page smoke must open source critic regeneration doctor');
if (!reviewPagePreviewTest.includes("path: '/review/source-candidates/source-critic-regeneration-health.html'")) failures.push('content review page smoke must open source critic regeneration health');
if (!reviewPagePreviewTest.includes("path: '/review/source-candidates/source-review-sequencer.html'")) failures.push('content review page smoke must open source review sequencer');
if (!reviewPagePreviewTest.includes("path: '/review/source-candidates/source-review-target-packet.html'")) failures.push('content review page smoke must open source review target packet');
if (!reviewPagePreviewTest.includes("path: '/review/source-candidates/source-approval-session.html'")) failures.push('content review page smoke must open source approval session');
if (!reviewPagePreviewTest.includes("path: '/review/source-candidates/source-approval-marathon.html'")) failures.push('content review page smoke must open source approval marathon');
if (!reviewPagePreviewTest.includes('data-critic-regeneration')) failures.push('content review page smoke must assert source critic regeneration markers');
if (!reviewPagePreviewTest.includes('data-critic-regeneration-doctor')) failures.push('content review page smoke must assert source critic regeneration doctor markers');
if (!reviewPagePreviewTest.includes('data-critic-regeneration-health')) failures.push('content review page smoke must assert source critic regeneration health markers');
if (!reviewPagePreviewTest.includes('data-source-review-sequencer')) failures.push('content review page smoke must assert source review sequencer markers');
if (!reviewPagePreviewTest.includes('data-source-review-target-packet')) failures.push('content review page smoke must assert source review target packet markers');
if (!reviewPagePreviewTest.includes('data-source-approval-session')) failures.push('content review page smoke must assert source approval session marker');
if (!reviewPagePreviewTest.includes('review-focused-target')) failures.push('content review page smoke must assert source approval session focused target step');
if (!reviewPagePreviewTest.includes('data-source-approval-marathon')) failures.push('content review page smoke must assert source approval marathon marker');
if (!reviewPagePreviewTest.includes('data-source-decision-starter')) failures.push('content review page smoke must assert source approval marathon decision starter marker');
for (const expected of [
  'source-approval-marathon-workspace-smoke',
  'data-source-approval-marathon',
  'data-source-decision-starter',
  'data-source-decision-status',
  'data-source-check-score',
  'data-source-check-failed',
  'data-sync-source-decision',
  'structured decision sync did not update starter status',
  'structured rejection sync did not preserve failed check',
  'incomplete structured approval did not show missing overall note warning',
  'incomplete structured approval did not show missing score warning',
  'incomplete structured approval did not export browser warnings',
  'final reviewed decision warnings did not clear',
  'data-build-reviewed-decisions',
  'data-reviewed-decision-warnings',
  'data-reviewed-decision-output',
  'reviewed-only export included an untouched needs-review starter',
  'reviewed decision download link did not receive blob URL',
  'tools/apply_source_cohesion_decisions.mjs',
  '--strict',
  'source-approval-marathon-workspace-reviewed-decisions.json',
  'dryRunOnly',
  'smokeTestArtifact',
  'strict apply approved result must be dry-run',
  'strict apply approved result missing --source-reviewed',
  'strict apply rejected result missing --source-rejected',
  'strict apply rejected result missing failed check',
]) {
  if (!sourceApprovalMarathonWorkspaceSmokeTest.includes(expected)) failures.push(`source approval marathon workspace smoke must assert ${expected}`);
}
for (const expected of [
  'source-approval-marathon-full-batch-workspace-smoke',
  'tools/scratch/source-approval-marathon-full-batch-reviewed-decisions.json',
  'tools/scratch/source-approval-marathon-full-batch-strict-report.json',
  'tools/scratch/source-approval-marathon-full-batch-apply-guard-report.json',
  'full-batch smoke expects 20 source approval candidates',
  'Full Batch Human Reviewer',
  'dryRunOnly',
  'smokeTestArtifact',
  'data-source-decision-status',
  'data-source-check-score',
  'data-source-check-note',
  'data-build-reviewed-decisions',
  'browserExportWarnings',
  'No reviewed decision warnings.',
  'tools/apply_source_cohesion_decisions.mjs',
  '--strict',
  'full-batch strict report must be dry-run',
  'full-batch strict result must be dry-run',
  'full-batch strict result missing --source-reviewed',
  'full-batch strict approved count',
  '--apply',
  'decision file policy.dryRunOnly forbids --apply',
  'full-batch dryRunOnly apply guard unexpectedly exited 0',
  'full-batch dryRunOnly apply guard did not record applyRequested true',
  'full-batch dryRunOnly apply guard report should not be applied',
  'full-batch dryRunOnly apply guard allowed an applied result',
]) {
  if (!sourceApprovalMarathonFullBatchSmokeTest.includes(expected)) failures.push(`source approval marathon full-batch smoke must assert ${expected}`);
}
if (!reviewPagePreviewTest.includes("path: '/review/source-candidates/source-next-review.html'")) failures.push('content review page smoke must open source next review');
if (!reviewPagePreviewTest.includes('data-source-next-review-target')) failures.push('content review page smoke must assert source next review target marker');
if (!reviewPagePreviewTest.includes('data-source-next-review-decision-json')) failures.push('content review page smoke must assert source next review focused decision JSON');
if (!reviewPagePreviewTest.includes('data-source-visual-board-candidate')) failures.push('content review page smoke must assert source visual board candidate markers');
if (!reviewPagePreviewTest.includes('data-source-critic')) failures.push('content review page smoke must assert source critic board markers');
if (!reviewPagePreviewTest.includes("path: '/review/source-candidates/source-replace-runway.html'")) failures.push('content review page smoke must open source replace runway');
if (!reviewPagePreviewTest.includes('data-source-replace-candidate')) failures.push('content review page smoke must assert source replace candidate markers');
for (const expected of ['--overwrite', 'dryRunReplace', 'applyReplace', 'does not approve source art', 'rejects byte-identical no-op replacements']) {
  if (!reviewPagePreviewTest.includes(expected)) failures.push(`content review page smoke must assert source replace evidence: ${expected}`);
  if (!sourceReplaceRunwayPreviewTest.includes(expected)) failures.push(`source replace runway smoke must assert replacement evidence: ${expected}`);
}
for (const expected of [
  'missingFingerprintDecision',
  'staleFingerprintDecision',
  'invalidMediaFingerprintDecision',
  'strict decision requires source cohesion evidence fingerprint',
  'source cohesion evidence fingerprint is stale',
  'strict decision evidence fingerprint is missing valid source media evidence',
]) {
  if (!sourceCohesionDecisionApplySmokeTest.includes(expected)) failures.push(`source cohesion decision apply smoke must cover strict fingerprint negative case: ${expected}`);
}
for (const expected of [
  'decision file policy.dryRunOnly forbids --apply',
  'applyRequested',
  'applied: APPLY && !fileLevelFailures.length',
]) {
  if (!threatDecisionApplyTool.includes(expected)) failures.push(`threat decision apply tool must enforce dryRunOnly guard: ${expected}`);
}
for (const expected of [
  'dryRunOnly',
  'smokeTestArtifact',
  'content-threat-acceptance-decisions-apply-guard-report.json',
  '--apply',
  'decision file policy.dryRunOnly forbids --apply',
  'dryRunOnly threat apply guard unexpectedly exited 0',
  'dryRunOnly threat apply guard did not record applyRequested true',
  'dryRunOnly threat apply guard report should not be applied',
  'dryRunOnly threat apply guard allowed an applied result',
]) {
  if (!threatDecisionApplySmokeTest.includes(expected)) failures.push(`threat acceptance decision apply smoke must assert dryRunOnly guard: ${expected}`);
}
for (const expected of [
  'water9/synthetic-decision-guards-check@1',
  'source-approval-marathon-workspace-reviewed-decisions.json',
  'source-approval-marathon-workspace-apply-guard-report.json',
  'source-approval-marathon-full-batch-reviewed-decisions.json',
  'source-approval-marathon-full-batch-apply-guard-report.json',
  'content-review-session-source-roundtrip.json',
  'content-review-session-source-roundtrip-apply-guard-report.json',
  'content-review-session-threat-roundtrip.json',
  'content-review-session-threat-roundtrip-apply-guard-report.json',
  'content-threat-acceptance-decisions-apply-smoke.json',
  'content-threat-acceptance-decisions-apply-guard-report.json',
  'policy.dryRunOnly',
  'policy.smokeTestArtifact',
  'applyRequested true',
  'decision file policy.dryRunOnly forbids --apply',
  'guard report contains applied result',
]) {
  if (!syntheticDecisionGuardsValidator.includes(expected)) failures.push(`synthetic decision guards validator must assert ${expected}`);
}
for (const expected of [
  'sourceApprovalTarget.links?.sandboxLab',
  'sourceApprovalTarget.links?.sourceSandboxLive',
  'sourceApprovalTarget.links?.runtimeSandboxLive',
  'Live Sandbox Review',
  '`npm run sandbox:preview -- --id source-${sourceApprovalTarget.id} --with diver --serve --open --visual`',
  '`npm run sandbox:preview -- --id ${sourceApprovalTarget.id} --with diver --serve --open --visual`',
]) {
  if (!reviewPagePreviewTest.includes(expected)) failures.push(`content review page smoke must assert source approval live sandbox evidence: ${expected}`);
}
for (const expected of [
  'acceptanceRuntimeId',
  '`npm run sandbox:preview -- --id ${acceptanceRuntimeId} --with diver --serve --open --visual`',
  '`npm run sandbox:visual -- --ids ${acceptanceRuntimeId} --states idle,lunge,stunned --with diver`',
  '`npm run content:accept -- --id ${acceptanceRuntimeId}`',
  '--sandbox-reviewed',
  '--parity-reviewed',
]) {
  if (!reviewPagePreviewTest.includes(expected)) failures.push(`content review page smoke must assert acceptance runway exact runtime commands: ${expected}`);
}
for (const expected of [
  'first.links?.sandboxLab',
  'first.links?.sourceSandboxLive',
  'first.links?.runtimeSandboxLive',
  'checklistFirst?.links?.sandboxLab',
  'checklistFirst?.links?.sourceSandboxLive',
  'checklistFirst?.links?.runtimeSandboxLive',
  'Live Sandbox Review',
  '`npm run sandbox:preview -- --id source-${first.id} --with diver --serve --open --visual`',
  '`npm run sandbox:preview -- --id ${first.id} --with diver --serve --open --visual`',
]) {
  if (!sourceApprovalRunwayPreviewTest.includes(expected)) failures.push(`source approval runway smoke must assert live sandbox review evidence: ${expected}`);
}
for (const expected of [
  'expectedPreviewCommand',
  'expectedVisualCommand',
  'expectedAcceptCommandPrefix',
  '`npm run sandbox:preview -- --id ${runtimeId} --with diver --serve --open --visual`',
  '`npm run sandbox:visual -- --ids ${runtimeId} --states idle,lunge,stunned --with diver`',
  '`npm run content:accept -- --id ${runtimeId}`',
  '--sandbox-reviewed',
  '--parity-reviewed',
]) {
  if (!contentAcceptanceRunwayPreviewTest.includes(expected)) failures.push(`acceptance runway smoke must assert exact paired runtime review commands: ${expected}`);
}
if (!contentSmokeScript.includes('npm run source:cohesion-review')) failures.push('content:gate:smoke must run source:cohesion-review');
if (!contentSmokeScript.includes('npm run source:cohesion-review-check')) failures.push('content:gate:smoke must run source:cohesion-review-check');
if (!contentInfraFullScript.includes('npm run source:cohesion-review')) failures.push('content:infra-gate:full must run source:cohesion-review');
if (!contentInfraFullScript.includes('npm run source:cohesion-review-check')) failures.push('content:infra-gate:full must run source:cohesion-review-check');
if (!contentSmokeScript.includes('npm run source:cohesion-decisions')) failures.push('content:gate:smoke must run source:cohesion-decisions');
if (!contentSmokeScript.includes('npm run source:cohesion-decisions-check')) failures.push('content:gate:smoke must run source:cohesion-decisions-check');
if (!contentSmokeScript.includes('npm run source:cohesion-decisions-apply')) failures.push('content:gate:smoke must run source:cohesion-decisions-apply');
if (!contentInfraFullScript.includes('npm run source:cohesion-decisions')) failures.push('content:infra-gate:full must run source:cohesion-decisions');
if (!contentInfraFullScript.includes('npm run source:cohesion-decisions-check')) failures.push('content:infra-gate:full must run source:cohesion-decisions-check');
if (!contentInfraFullScript.includes('npm run source:cohesion-decisions-apply')) failures.push('content:infra-gate:full must run source:cohesion-decisions-apply');
if (!contentSmokeScript.includes('npm run content:review-evidence')) failures.push('content:gate:smoke must run content:review-evidence');
if (!contentSmokeScript.includes('npm run content:review-evidence-check')) failures.push('content:gate:smoke must run content:review-evidence-check');
if (!contentSmokeScript.includes('npm run content:review-cockpit')) failures.push('content:gate:smoke must run content:review-cockpit');
if (!contentSmokeScript.includes('npm run content:review-cockpit-check')) failures.push('content:gate:smoke must run content:review-cockpit-check');
if (!contentSmokeScript.includes('npm run content:review-cockpit:serve-smoke')) failures.push('content:gate:smoke must run content:review-cockpit:serve-smoke');
if (!contentSmokeScript.includes('npm run content:runtime-roster-check')) failures.push('content:gate:smoke must run content:runtime-roster-check');
if (!contentSmokeScript.includes('npm run content:quality-gate-matrix')) failures.push('content:gate:smoke must rebuild content quality gate matrix');
if (!contentSmokeScript.includes('npm run content:quality-gate-matrix-check')) failures.push('content:gate:smoke must validate content quality gate matrix');
if (!contentSmokeScript.includes('npm run content:strict-gate-negative-smoke')) failures.push('content:gate:smoke must run strict gate negative smoke');
if (!contentSmokeScript.includes('npm run content:vertical-slice')) failures.push('content:gate:smoke must run content:vertical-slice');
if (!contentSmokeScript.includes('npm run content:vertical-slice-check')) failures.push('content:gate:smoke must run content:vertical-slice-check');
if (!contentSmokeScript.includes('npm run content:human-signoff')) failures.push('content:gate:smoke must run content:human-signoff');
if (!contentSmokeScript.includes('npm run content:sandbox-roster')) failures.push('content:gate:smoke must run content:sandbox-roster');
if (!contentSmokeScript.includes('npm run content:sandbox-roster-check')) failures.push('content:gate:smoke must run content:sandbox-roster-check');
if (!contentSmokeScript.includes('npm run content:sandbox-roster:serve-smoke')) failures.push('content:gate:smoke must run content:sandbox-roster:serve-smoke');
if (!contentSmokeScript.includes('npm run content:articulation-roster')) failures.push('content:gate:smoke must run content:articulation-roster');
if (!contentSmokeScript.includes('npm run content:articulation-roster-check')) failures.push('content:gate:smoke must run content:articulation-roster-check');
if (!contentSmokeScript.includes('npm run content:articulation-roster:serve-smoke')) failures.push('content:gate:smoke must run content:articulation-roster:serve-smoke');
if (!contentSmokeScript.includes('npm run content:human-adjudication-board')) failures.push('content:gate:smoke must run content:human-adjudication-board');
if (!contentSmokeScript.includes('npm run content:human-adjudication-board-check')) failures.push('content:gate:smoke must run content:human-adjudication-board-check');
if (!contentSmokeScript.includes('npm run content:human-adjudication-board:serve-smoke')) failures.push('content:gate:smoke must run content:human-adjudication-board:serve-smoke');
if (!contentSmokeScript.includes('npm run content:review-session')) failures.push('content:gate:smoke must run content:review-session');
if (!contentSmokeScript.includes('npm run content:review-session-check')) failures.push('content:gate:smoke must run content:review-session-check');
if (!contentSmokeScript.includes('npm run content:review-session:serve-smoke')) failures.push('content:gate:smoke must run content:review-session:serve-smoke');
if (!contentSmokeScript.includes('npm run content:threat-decisions')) failures.push('content:gate:smoke must rebuild threat acceptance decisions');
if (!contentSmokeScript.includes('npm run content:threat-decisions-check')) failures.push('content:gate:smoke must validate threat acceptance decisions');
if (!contentSmokeScript.includes('npm run content:threat-decisions-apply-smoke')) failures.push('content:gate:smoke must smoke-test strict threat decision apply');
if (!contentSmokeScript.includes('npm run content:synthetic-decision-guards-check')) failures.push('content:gate:smoke must validate synthetic decision dry-run guards');
if (!contentSmokeScript.includes('npm run content:production-proof')) failures.push('content:gate:smoke must run content:production-proof');
if (!contentSmokeScript.includes('npm run content:production-proof-check')) failures.push('content:gate:smoke must run content:production-proof-check');
if (!contentSmokeScript.includes('npm run content:production-proof:serve-smoke')) failures.push('content:gate:smoke must run content:production-proof:serve-smoke');
if (!contentSmokeScript.includes('npm run content:promote-approved-threats')) failures.push('content:gate:smoke must run content:promote-approved-threats');
if (!contentSmokeScript.includes('npm run content:promote-approved-threats-check')) failures.push('content:gate:smoke must run content:promote-approved-threats-check');
if (!contentSmokeScript.includes('npm run content:promote-approved-threats:serve-smoke')) failures.push('content:gate:smoke must run content:promote-approved-threats:serve-smoke');
if (!contentSmokeScript.includes('npm run content:human-signoff-check')) failures.push('content:gate:smoke must run content:human-signoff-check');
if (!contentSmokeScript.includes('npm run content:human-signoff-command-smoke')) failures.push('content:gate:smoke must run content:human-signoff-command-smoke');
if (!contentSmokeScript.includes('npm run content:human-review-policy-smoke')) failures.push('content:gate:smoke must run content:human-review-policy-smoke');
requireOrderedScriptCommand('content:gate:smoke', contentSmokeScript, 'npm run source:approval-marathon', 'npm run source:approval-marathon-check');
requireOrderedScriptCommand('content:gate:smoke', contentSmokeScript, 'npm run source:approval-marathon-check', 'npm run source:approval-marathon-workspace-smoke');
requireOrderedScriptCommand('content:gate:smoke', contentSmokeScript, 'npm run source:approval-marathon-workspace-smoke', 'npm run source:approval-marathon-full-batch-smoke');
requireOrderedScriptCommand('content:gate:smoke', contentSmokeScript, 'npm run source:approval-marathon-full-batch-smoke', 'npm run source:replace-runway');
requireOrderedScriptCommand('content:gate:smoke', contentSmokeScript, 'npm run content:review-session-strict-roundtrip-smoke', 'npm run content:threat-decisions');
requireOrderedScriptCommand('content:gate:smoke', contentSmokeScript, 'npm run content:threat-decisions-apply-smoke', 'npm run content:synthetic-decision-guards-check');
requireOrderedScriptCommand('content:gate:smoke', contentSmokeScript, 'npm run content:synthetic-decision-guards-check', 'npm run content:production-proof');
requireOrderedScriptCommand('content:gate:smoke', contentSmokeScript, 'npm run content:quality-gate-matrix', 'npm run content:quality-gate-matrix-check');
requireOrderedScriptCommand('content:gate:smoke', contentSmokeScript, 'npm run content:quality-gate-matrix-check', 'npm run content:strict-gate-negative-smoke');
requireOrderedScriptCommand('content:gate:smoke', contentSmokeScript, 'npm run content:strict-gate-negative-smoke', 'npm run content:runtime-roster-check');
if (!contentInfraFullScript.includes('npm run content:review-evidence')) failures.push('content:infra-gate:full must run content:review-evidence');
if (!contentInfraFullScript.includes('npm run content:review-evidence-check')) failures.push('content:infra-gate:full must run content:review-evidence-check');
if (!contentInfraFullScript.includes('npm run content:review-cockpit')) failures.push('content:infra-gate:full must run content:review-cockpit');
if (!contentInfraFullScript.includes('npm run content:review-cockpit-check')) failures.push('content:infra-gate:full must run content:review-cockpit-check');
if (!contentInfraFullScript.includes('npm run content:review-cockpit:serve-smoke')) failures.push('content:infra-gate:full must run content:review-cockpit:serve-smoke');
if (!contentInfraFullScript.includes('npm run content:runtime-roster-check')) failures.push('content:infra-gate:full must run content:runtime-roster-check');
if (!contentInfraFullScript.includes('npm run content:vertical-slice')) failures.push('content:infra-gate:full must run content:vertical-slice');
if (!contentInfraFullScript.includes('npm run content:vertical-slice-check')) failures.push('content:infra-gate:full must run content:vertical-slice-check');
if (!contentInfraFullScript.includes('npm run content:human-signoff')) failures.push('content:infra-gate:full must run content:human-signoff');
if (!contentInfraFullScript.includes('npm run content:sandbox-roster')) failures.push('content:infra-gate:full must run content:sandbox-roster');
if (!contentInfraFullScript.includes('npm run content:sandbox-roster-check')) failures.push('content:infra-gate:full must run content:sandbox-roster-check');
if (!contentInfraFullScript.includes('npm run content:sandbox-roster:serve-smoke')) failures.push('content:infra-gate:full must run content:sandbox-roster:serve-smoke');
if (!contentInfraFullScript.includes('npm run content:articulation-roster')) failures.push('content:infra-gate:full must run content:articulation-roster');
if (!contentInfraFullScript.includes('npm run content:articulation-roster-check')) failures.push('content:infra-gate:full must run content:articulation-roster-check');
if (!contentInfraFullScript.includes('npm run content:articulation-roster:serve-smoke')) failures.push('content:infra-gate:full must run content:articulation-roster:serve-smoke');
if (!contentInfraFullScript.includes('npm run content:human-adjudication-board')) failures.push('content:infra-gate:full must run content:human-adjudication-board');
if (!contentInfraFullScript.includes('npm run content:human-adjudication-board-check')) failures.push('content:infra-gate:full must run content:human-adjudication-board-check');
if (!contentInfraFullScript.includes('npm run content:human-adjudication-board:serve-smoke')) failures.push('content:infra-gate:full must run content:human-adjudication-board:serve-smoke');
if (!contentInfraFullScript.includes('npm run content:review-session')) failures.push('content:infra-gate:full must run content:review-session');
if (!contentInfraFullScript.includes('npm run content:review-session-check')) failures.push('content:infra-gate:full must run content:review-session-check');
if (!contentInfraFullScript.includes('npm run content:review-session:serve-smoke')) failures.push('content:infra-gate:full must run content:review-session:serve-smoke');
if (!contentInfraFullScript.includes('npm run content:production-proof')) failures.push('content:infra-gate:full must run content:production-proof');
if (!contentInfraFullScript.includes('npm run content:production-proof-check')) failures.push('content:infra-gate:full must run content:production-proof-check');
if (!contentInfraFullScript.includes('npm run content:production-proof:serve-smoke')) failures.push('content:infra-gate:full must run content:production-proof:serve-smoke');
if (!contentInfraFullScript.includes('npm run content:promote-approved-threats')) failures.push('content:infra-gate:full must run content:promote-approved-threats');
if (!contentInfraFullScript.includes('npm run content:promote-approved-threats-check')) failures.push('content:infra-gate:full must run content:promote-approved-threats-check');
if (!contentInfraFullScript.includes('npm run content:promote-approved-threats:serve-smoke')) failures.push('content:infra-gate:full must run content:promote-approved-threats:serve-smoke');
if (!contentInfraFullScript.includes('npm run content:human-signoff-check')) failures.push('content:infra-gate:full must run content:human-signoff-check');
if (!contentInfraFullScript.includes('npm run content:human-signoff-command-smoke')) failures.push('content:infra-gate:full must run content:human-signoff-command-smoke');
if (!contentInfraFullScript.includes('npm run content:human-review-policy-smoke')) failures.push('content:infra-gate:full must run content:human-review-policy-smoke');
if (!contentGoalGateScript.includes('npm run research:check')) failures.push('content:goal-gate must run research:check before strict acceptance checks');
if (!contentGoalGateScript.includes('npm run sandbox:index')) failures.push('content:goal-gate must rebuild the sandbox index');
if (!contentGoalGateScript.includes('npm run source:approval-marathon')) failures.push('content:goal-gate must rebuild source approval marathon');
if (!contentGoalGateScript.includes('npm run source:approval-marathon-check')) failures.push('content:goal-gate must validate source approval marathon');
if (!contentGoalGateScript.includes('npm run source:approval-marathon-workspace-smoke')) failures.push('content:goal-gate must smoke-test the source approval marathon workspace');
if (!contentGoalGateScript.includes('npm run source:approval-marathon-full-batch-smoke')) failures.push('content:goal-gate must smoke-test full-batch source approval marathon decisions');
if (!contentGoalGateScript.includes('npm run source:approval-decisions')) failures.push('content:goal-gate must rebuild source approval decisions');
if (!contentGoalGateScript.includes('npm run source:approval-decisions-check')) failures.push('content:goal-gate must validate source approval decisions');
if (!contentGoalGateScript.includes('npm run source:approval-decisions-workspace-smoke')) failures.push('content:goal-gate must smoke-test the source approval decision workspace');
if (!contentGoalGateScript.includes('npm run source:approval-decisions-apply-smoke')) failures.push('content:goal-gate must smoke-test strict source approval decision apply');
if (!contentGoalGateScript.includes('npm run content:vertical-slice')) failures.push('content:goal-gate must rebuild the vertical slice runway');
if (!contentGoalGateScript.includes('npm run content:human-signoff')) failures.push('content:goal-gate must rebuild the human sign-off queue');
if (!contentGoalGateScript.includes('npm run content:sandbox-roster')) failures.push('content:goal-gate must rebuild the content sandbox roster');
if (!contentGoalGateScript.includes('npm run content:sandbox-roster-check')) failures.push('content:goal-gate must validate the content sandbox roster');
if (!contentGoalGateScript.includes('npm run content:articulation-roster')) failures.push('content:goal-gate must rebuild the content articulation roster');
if (!contentGoalGateScript.includes('npm run content:articulation-roster-check')) failures.push('content:goal-gate must validate the content articulation roster');
if (!contentGoalGateScript.includes('npm run content:human-adjudication-board')) failures.push('content:goal-gate must rebuild the human adjudication board');
if (!contentGoalGateScript.includes('npm run content:human-adjudication-board-check')) failures.push('content:goal-gate must validate the human adjudication board');
if (!contentGoalGateScript.includes('npm run content:review-session')) failures.push('content:goal-gate must rebuild the content review session');
if (!contentGoalGateScript.includes('npm run content:review-session-check')) failures.push('content:goal-gate must validate the content review session');
if (!contentGoalGateScript.includes('npm run content:threat-decisions')) failures.push('content:goal-gate must rebuild threat acceptance decisions');
if (!contentGoalGateScript.includes('npm run content:threat-decisions-check')) failures.push('content:goal-gate must validate threat acceptance decisions');
if (!contentGoalGateScript.includes('npm run content:threat-decisions-apply-smoke')) failures.push('content:goal-gate must smoke-test strict threat decision apply');
if (!contentGoalGateScript.includes('npm run content:synthetic-decision-guards-check')) failures.push('content:goal-gate must validate synthetic decision dry-run guards');
if (!contentGoalGateScript.includes('npm run content:production-proof')) failures.push('content:goal-gate must rebuild production proof');
if (!contentGoalGateScript.includes('npm run content:production-proof-check')) failures.push('content:goal-gate must validate production proof');
if (!contentGoalGateScript.includes('npm run content:promote-approved-threats')) failures.push('content:goal-gate must rebuild promote approved threats');
if (!contentGoalGateScript.includes('npm run content:promote-approved-threats-check')) failures.push('content:goal-gate must validate promote approved threats');
if (!contentGoalGateScript.includes('npm run content:human-signoff-check')) failures.push('content:goal-gate must validate the human sign-off queue');
if (!contentGoalGateScript.includes('npm run content:human-signoff-command-smoke')) failures.push('content:goal-gate must smoke-test human sign-off dry-run commands');
if (!contentGoalGateScript.includes('npm run content:human-review-policy-smoke')) failures.push('content:goal-gate must smoke-test human review policy enforcement');
if (!contentGoalGateScript.includes('npm run content:strict-gate-negative-smoke')) failures.push('content:goal-gate must run strict gate negative smoke');
if (!contentGoalGateScript.includes('npm run content:goal-readiness-strict')) failures.push('content:goal-gate must run content:goal-readiness-strict');
if (!contentGoalGateScript.includes('npm run content:gate')) failures.push('content:goal-gate must run content:gate');
requireOrderedScriptCommand('content:goal-gate', contentGoalGateScript, 'npm run source:approval-marathon', 'npm run source:approval-marathon-check');
requireOrderedScriptCommand('content:goal-gate', contentGoalGateScript, 'npm run source:approval-marathon-check', 'npm run source:approval-marathon-workspace-smoke');
requireOrderedScriptCommand('content:goal-gate', contentGoalGateScript, 'npm run source:approval-marathon-workspace-smoke', 'npm run source:approval-marathon-full-batch-smoke');
requireOrderedScriptCommand('content:goal-gate', contentGoalGateScript, 'npm run source:approval-marathon-full-batch-smoke', 'npm run source:approval-decisions');
requireOrderedScriptCommand('content:goal-gate', contentGoalGateScript, 'npm run content:review-session-strict-roundtrip-smoke', 'npm run content:threat-decisions');
requireOrderedScriptCommand('content:goal-gate', contentGoalGateScript, 'npm run content:threat-decisions-apply-smoke', 'npm run content:synthetic-decision-guards-check');
requireOrderedScriptCommand('content:goal-gate', contentGoalGateScript, 'npm run content:synthetic-decision-guards-check', 'npm run content:production-proof');
requireOrderedScriptCommand('content:goal-gate', contentGoalGateScript, 'npm run content:human-review-policy-smoke', 'npm run content:strict-gate-negative-smoke');
requireOrderedScriptCommand('content:goal-gate', contentGoalGateScript, 'npm run content:strict-gate-negative-smoke', 'npm run content:goal-readiness-strict');
if (!contentInfraFullScript.includes('npm run content:goal-gate')) failures.push('content:infra-gate:full must run content:goal-gate as the final strict acceptance gate');

if (sandbox?.schema !== 'water9/sandbox-index@1') failures.push(`sandbox manifest schema is ${sandbox?.schema ?? 'missing'}`);
const sandboxEntries = Array.isArray(sandbox?.entries) ? sandbox.entries : [];
const sandboxIds = sandboxEntries.map((entry) => entry.id).filter(Boolean);
if (sandboxEntries.length < 1) failures.push('sandbox manifest has no entries');
if (sandboxIds.length !== uniqueValues(sandboxIds).length) failures.push('sandbox manifest has duplicate ids');
if (!sandboxIds.includes('diver')) failures.push('sandbox manifest must include diver');
if (!sandboxIds.some((id) => String(id).includes('gulper'))) failures.push('sandbox manifest must include a gulper entity');
for (const kind of ['articulated', 'diver', 'fish', 'flora', 'item', 'object', 'ore', 'source']) {
  if (!sandboxEntries.some((entry) => entry.kind === kind)) failures.push(`sandbox manifest has no ${kind} entries`);
}
const diverEntry = sandboxEntries.find((entry) => entry.id === 'diver');
if (!diverEntry?.url?.includes('entity=diver')) failures.push('sandbox manifest diver entry must expose direct diver preview URL');
for (const entry of sandboxEntries) {
  if (!entry.previewCommand?.includes(`npm run sandbox:preview -- --id ${entry.id}`)) {
    failures.push(`${entry.id}: sandbox entry missing target-aware previewCommand`);
  }
  if (!entry.pairedPreviewCommand?.includes(`npm run sandbox:preview -- --id ${entry.id} --with diver`)) {
    failures.push(`${entry.id}: sandbox entry missing paired diver previewCommand`);
  }
  if (!entry.visualCheckCommand?.includes(`npm run sandbox:visual -- --ids ${entry.id}`)) {
    failures.push(`${entry.id}: sandbox entry missing visualCheckCommand`);
  }
  if (!entry.pairedVisualCheckCommand?.includes(`npm run sandbox:visual -- --ids ${entry.id}`) || !entry.pairedVisualCheckCommand?.includes('--with diver')) {
    failures.push(`${entry.id}: sandbox entry missing paired diver visualCheckCommand`);
  }
  if (entry.productionBoundary?.schema !== 'water9/sandbox-production-boundary@1') failures.push(`${entry.id}: sandbox entry missing production boundary`);
  if (entry.productionBoundary?.reviewStage !== (entry.reviewStage ?? 'reference')) failures.push(`${entry.id}: sandbox production boundary reviewStage mismatch`);
  if (entry.productionBoundary?.acceptedForContentGate !== Boolean(entry.acceptedForContentGate)) failures.push(`${entry.id}: sandbox production boundary acceptedForContentGate mismatch`);
  if (entry.productionBoundary?.productionReady !== Boolean(entry.acceptedForContentGate)) failures.push(`${entry.id}: sandbox production boundary productionReady mismatch`);
  if (entry.acceptedForContentGate !== true && entry.productionBoundary?.previewOnly !== true) failures.push(`${entry.id}: sandbox non-accepted preview must be marked preview-only`);
  if (entry.acceptedForContentGate !== true && ['articulated', 'source'].includes(entry.kind) && !String(entry.productionBoundary?.manualReviewRequired ?? '').trim()) {
    failures.push(`${entry.id}: sandbox non-accepted ${entry.kind} preview must state required human review`);
  }
  if (!String(entry.productionBoundary?.claim ?? '').trim()) failures.push(`${entry.id}: sandbox production boundary missing claim`);
  if (entry.id === 'diver') continue;
  if (!String(entry.pairedUrl ?? '').includes('companion=diver')) {
    failures.push(`${entry.id}: sandbox entry missing paired diver preview URL`);
  }
}
const gulperEntry = sandboxEntries.find((entry) => String(entry.id).includes('gulper'));
if (!gulperEntry?.pairedUrl?.includes('companion=diver')) failures.push('sandbox manifest gulper entry must expose paired diver preview URL');

if (sandboxQuickstart?.schema !== 'water9/sandbox-quickstart@1') failures.push(`sandbox quickstart schema is ${sandboxQuickstart?.schema ?? 'missing'}`);
await fileOk('sandbox quickstart markdown', paths.sandboxQuickstartMarkdown, 1024);
await fileOk('sandbox quickstart html', paths.sandboxQuickstartHtml, 2048);
const sandboxQuickstartEntries = Array.isArray(sandboxQuickstart?.entries) ? sandboxQuickstart.entries : [];
const sandboxQuickstartById = new Map(sandboxQuickstartEntries.map((entry) => [entry.id, entry]));
if (sandboxQuickstartEntries.length !== sandboxEntries.length) failures.push('sandbox quickstart entry count must match sandbox manifest');
if ((sandboxQuickstart?.summary?.entries ?? -1) !== sandboxQuickstartEntries.length) failures.push('sandbox quickstart summary entries mismatch');
if ((sandboxQuickstart?.summary?.articulated ?? -1) !== sandboxQuickstartEntries.filter((entry) => entry.kind === 'articulated').length) failures.push('sandbox quickstart summary articulated mismatch');
if ((sandboxQuickstart?.summary?.previewOnly ?? -1) !== sandboxQuickstartEntries.filter((entry) => entry.productionBoundary?.previewOnly === true).length) failures.push('sandbox quickstart summary previewOnly mismatch');
for (const entry of sandboxEntries) {
  const quickstart = sandboxQuickstartById.get(entry.id);
  if (!quickstart) {
    failures.push(`${entry.id}: missing from sandbox quickstart`);
    continue;
  }
  if (quickstart.url !== entry.url) failures.push(`${entry.id}: sandbox quickstart url mismatch`);
  if (!String(quickstart.pairedUrl ?? '').includes('companion=diver')) failures.push(`${entry.id}: sandbox quickstart missing paired diver URL`);
  if (!String(quickstart.previewCommand ?? '').includes(`npm run sandbox:preview -- --id ${entry.id}`)) failures.push(`${entry.id}: sandbox quickstart missing target-aware preview command`);
  if (!String(quickstart.pairedPreviewCommand ?? '').includes(`npm run sandbox:preview -- --id ${entry.id} --with diver`)) failures.push(`${entry.id}: sandbox quickstart missing paired diver preview command`);
  if (!String(quickstart.pairedVisualCheckCommand ?? '').includes(`npm run sandbox:visual -- --ids ${entry.id}`) || !String(quickstart.pairedVisualCheckCommand ?? '').includes('--with diver')) {
    failures.push(`${entry.id}: sandbox quickstart missing paired diver visual command`);
  }
  if (quickstart.productionBoundary?.schema !== 'water9/sandbox-production-boundary@1') failures.push(`${entry.id}: sandbox quickstart missing production boundary`);
  if (quickstart.productionBoundary?.reviewStage !== quickstart.reviewStage) failures.push(`${entry.id}: sandbox quickstart production boundary reviewStage mismatch`);
  if (quickstart.productionBoundary?.productionReady !== Boolean(quickstart.acceptedForContentGate)) failures.push(`${entry.id}: sandbox quickstart production boundary readiness mismatch`);
  if (quickstart.acceptedForContentGate !== true && quickstart.productionBoundary?.previewOnly !== true) failures.push(`${entry.id}: sandbox quickstart non-accepted preview must be preview-only`);
  if (!String(quickstart.productionBoundary?.claim ?? '').trim()) failures.push(`${entry.id}: sandbox quickstart production boundary missing claim`);
  if (!textIncludesHtml(sandboxQuickstartHtml, `data-sandbox-quickstart-entry="${entry.id}"`)) failures.push(`${entry.id}: sandbox quickstart html missing entry marker`);
  if (!sandboxQuickstartMarkdown.includes(`\`${entry.id}\``)) failures.push(`${entry.id}: sandbox quickstart markdown missing entry`);
}
for (const requiredId of ['diver', 'abyssal-gulper', 'gulper-eel-maw', 'source-gulper-eel-maw']) {
  if (!sandboxQuickstartById.has(requiredId)) failures.push(`sandbox quickstart missing required id ${requiredId}`);
}
for (const expected of [
  'Water 9 Sandbox Quickstart',
  'Canonical launch commands for every registered Water 9 sandbox entity',
  'Previewable does not mean accepted',
  'Production Boundary',
  'Preview-only:',
  'npm run sandbox:preview -- --id abyssal-gulper --with diver --serve --open --visual',
  'npm run sandbox:preview -- --id gulper-eel-maw --with diver --serve --open --visual',
]) {
  if (!sandboxQuickstartMarkdown.includes(expected)) failures.push(`sandbox quickstart markdown missing ${expected}`);
  if (!textIncludesHtml(sandboxQuickstartHtml, expected)) failures.push(`sandbox quickstart html missing ${expected}`);
}

if (sandboxVisual?.schema !== 'water9/sandbox-visual-check@1') failures.push(`sandbox visual report schema is ${sandboxVisual?.schema ?? 'missing'}`);
if (sandboxVisual?.selection?.allCatalog !== true) failures.push('sandbox visual report must come from --all-catalog');
if ((sandboxVisual?.checked ?? 0) !== sandboxEntries.length) {
  failures.push(`sandbox visual checked ${sandboxVisual?.checked ?? 'missing'} entries, expected ${sandboxEntries.length}`);
}
if ((sandboxVisual?.availableEntries ?? 0) !== sandboxEntries.length) {
  failures.push(`sandbox visual availableEntries ${sandboxVisual?.availableEntries ?? 'missing'}, expected ${sandboxEntries.length}`);
}
if (Array.isArray(sandboxVisual?.failures) && sandboxVisual.failures.length) failures.push(...sandboxVisual.failures.map((failure) => `sandbox visual: ${failure}`));
const visualResults = Array.isArray(sandboxVisual?.results) ? sandboxVisual.results : [];
const visualIds = new Set(visualResults.map((result) => result.id));
for (const id of sandboxIds) {
  if (!visualIds.has(id)) failures.push(`${id}: missing from all-catalog sandbox visual report`);
}
for (const result of visualResults) {
  if (!result.id) failures.push('sandbox visual result missing id');
  if (!Array.isArray(result.states) || result.states.length < 1) failures.push(`${result.id}: visual result has no states`);
  for (const state of result.states ?? []) {
    if (!state.screenshotPath) failures.push(`${result.id}.${state.state ?? 'unknown'}: missing screenshot path`);
    else await fileOk(`${result.id}.${state.state ?? 'unknown'} screenshot`, resolve(state.screenshotPath), 1024);
    if (Array.isArray(state.failures) && state.failures.length) failures.push(...state.failures.map((failure) => `${result.id}.${state.state}: ${failure}`));
  }
}

if (sandboxPairedVisual?.schema !== 'water9/sandbox-visual-check@1') failures.push(`sandbox paired visual report schema is ${sandboxPairedVisual?.schema ?? 'missing'}`);
if (sandboxPairedVisual?.selection?.companion !== 'diver') failures.push('sandbox paired visual report must be generated with --with diver');
const pairedResults = Array.isArray(sandboxPairedVisual?.results) ? sandboxPairedVisual.results : [];
const pairedGulper = pairedResults.find((result) => result.id === 'abyssal-gulper' || String(result.id).includes('gulper'));
if (!pairedGulper) failures.push('sandbox paired visual report must include a gulper preview');
if (pairedGulper && !String(pairedGulper.url ?? '').includes('companion=diver')) failures.push('paired gulper visual URL must include companion=diver');
for (const state of pairedGulper?.states ?? []) {
  if (state.snapshot?.companion !== 'diver') failures.push(`paired gulper ${state.state}: snapshot companion must be diver`);
  if (state.snapshot?.hasDiver !== true) failures.push(`paired gulper ${state.state}: snapshot must prove diver rendered`);
  if (Array.isArray(state.failures) && state.failures.length) failures.push(...state.failures.map((failure) => `paired gulper ${state.state}: ${failure}`));
  if (state.screenshotPath) await fileOk(`paired gulper ${state.state} screenshot`, resolve(state.screenshotPath), 1024);
}

if (sourceCandidates?.schema !== 'water9/source-candidates@1') failures.push(`source candidates schema is ${sourceCandidates?.schema ?? 'missing'}`);
const candidates = Array.isArray(sourceCandidates?.candidates) ? sourceCandidates.candidates : [];
if (candidates.length < minThreats) failures.push(`only ${candidates.length}/${minThreats} source candidates`);
const candidateIds = candidates.map((candidate) => candidate.id).filter(Boolean);
const missingSourceCount = candidates.filter((candidate) => !candidate.source).length;
if (candidateIds.length !== uniqueValues(candidateIds).length) failures.push('source candidates have duplicate ids');
if ((sourceReview?.candidates?.length ?? 0) !== candidates.length) failures.push('source review item count does not match source candidate count');
const sourceReviewManifestItems = Array.isArray(sourceReview?.candidates) ? sourceReview.candidates : [];
const sourceReviewManifestById = new Map(sourceReviewManifestItems.map((item) => [item.id, item]));
for (const candidate of candidates.filter((item) => item.source)) {
  const item = sourceReviewManifestById.get(candidate.id);
  if (!item) {
    failures.push(`${candidate.id}: source review manifest missing item`);
    continue;
  }
  if (!item.keyPreviewFile) failures.push(`${candidate.id}: source review manifest missing key preview file`);
  if (item.keyPreviewEvidence?.schema !== 'water9/source-key-preview@1') failures.push(`${candidate.id}: source review manifest missing fingerprinted key preview evidence`);
  if (item.keyPreviewEvidence?.source !== candidate.source) failures.push(`${candidate.id}: key preview evidence source mismatch`);
  if (item.keyPreviewEvidence?.keyPreviewFile !== item.keyPreviewFile) failures.push(`${candidate.id}: key preview evidence file mismatch`);
  if (!item.keyPreviewEvidence?.sourceFingerprint?.sha256) failures.push(`${candidate.id}: key preview evidence missing source sha256`);
  if (!item.keyPreviewEvidence?.keyPreviewFingerprint?.sha256) failures.push(`${candidate.id}: key preview evidence missing preview sha256`);
}
if (missingSourceCount > 0 && countLines(promptText) < missingSourceCount) {
  failures.push('imagen prompt jsonl does not cover missing source-image candidates');
}

if (sourceQueue?.schema !== 'water9/source-generation-queue@1') failures.push(`source generation queue schema is ${sourceQueue?.schema ?? 'missing'}`);
await fileOk('source generation queue html', paths.sourceQueueHtml, missingSourceCount > 0 ? 4096 : 512);
const queueCandidates = Array.isArray(sourceQueue?.candidates) ? sourceQueue.candidates : [];
if (missingSourceCount > 0 && queueCandidates.length < 1) failures.push('source generation queue is empty while source images are missing');
for (const item of queueCandidates) {
  if (!candidateIds.includes(item.id)) failures.push(`${item.id}: queue item is not a source candidate`);
  if (!item.prompt || String(item.prompt).length < 200) failures.push(`${item.id}: queue prompt is too short`);
  if (!Array.isArray(item.qualityChecks) || !item.qualityChecks.includes('part-continuity-cohesion')) {
    failures.push(`${item.id}: queue item missing cohesion quality checks`);
  }
  if (!Array.isArray(item.contractReviewChecklist) || item.contractReviewChecklist.length < 2) {
    failures.push(`${item.id}: queue item missing candidate-specific contract checks`);
  }
  if (!sourceQueueHtml.includes(item.id)) failures.push(`${item.id}: source generation queue html missing candidate`);
  if (!sourceQueueHtml.includes(`tools/source-inbox/${item.id}.png`)) failures.push(`${item.id}: source generation queue html missing inbox target`);
}
if (!sourceQueueHtml.includes('Water 9 Source Acquisition Board')) failures.push('source generation queue html missing title');
if (!sourceQueueHtml.includes('npm run source:inbox-capture')) failures.push('source generation queue html missing inbox capture command');

if (sourceSprint?.schema !== 'water9/source-generation-sprint@1') failures.push(`source generation sprint schema is ${sourceSprint?.schema ?? 'missing'}`);
const sprintIds = Array.isArray(sourceSprint?.ids) ? sourceSprint.ids : [];
if (missingSourceCount > 0 && sprintIds.length < 1) failures.push('source generation sprint is empty');
for (const id of sprintIds) {
  if (!queueCandidates.some((candidate) => candidate.id === id)) failures.push(`${id}: sprint id is not in source generation queue`);
}
const sprintCommands = Object.values(sourceSprint?.commands ?? {}).filter(Boolean).join('\n');
const requiredSprintCommands = sprintIds.length
  ? ['source:imagegen-status', 'source:inbox-check', 'source:ingest-batch', 'source:check']
  : ['source:check'];
for (const expected of requiredSprintCommands) {
  requireCommandText('source sprint commands', sprintCommands, expected);
}
for (const id of sprintIds) {
  const card = (sourceSprint?.candidates ?? []).find((candidate) => candidate.id === id);
  const perCandidateCommands = card?.commands ?? sourceSprint?.commandsById?.[id] ?? {};
  const missingArtifactAttempts = (sourceRejections?.attempts ?? []).filter((attempt) => attempt.candidateId === id && rejectionKind(attempt) === 'missing-artifact').length;
  if (missingArtifactAttempts >= 3 && card?.captureFirst !== true) {
    failures.push(`${id}: source sprint must be capture-first after ${missingArtifactAttempts} missing-artifact attempts`);
  }
  if (card?.captureFirst && Object.keys(perCandidateCommands)[0] !== 'captureInbox') {
    failures.push(`${id}: source sprint capture-first command order must start with captureInbox`);
  }
  const requiredSprintCommandKeys = card?.captureFirst
    ? ['captureInbox', 'recoveryScout', 'recoverSavedFile', 'recoverDataUrl', 'recoverBase64', 'inboxCheck', 'ingestDryRun', 'ingest', 'printPrompt', 'startSession', 'checkSession']
    : ['startSession', 'checkSession', 'autoIngestSession', 'printPrompt', 'captureInbox', 'recoveryScout', 'recoverInline', 'recoverSavedFile', 'recoverDataUrl', 'recoverBase64', 'inboxCheck', 'ingestDryRun', 'ingest'];
  for (const key of requiredSprintCommandKeys) {
    const command = perCandidateCommands[key];
    if (!command) {
      failures.push(`${id}: source sprint missing per-candidate command ${key}`);
      continue;
    }
    if (!command.includes(id)) failures.push(`${id}: source sprint per-candidate command ${key} does not include candidate id`);
  }
  if (card?.captureFirst && perCandidateCommands.autoIngestSession) {
    failures.push(`${id}: capture-first source sprint must not advertise autoIngestSession`);
  }
  if (card?.captureFirst && perCandidateCommands.recoverInline) {
    failures.push(`${id}: capture-first source sprint must not advertise generic recoverInline`);
  }
  if (card?.captureFirst && !perCandidateCommands.ingestDryRun?.includes('source:ingest-current')) {
    failures.push(`${id}: capture-first source sprint dry run must use source:ingest-current`);
  }
  if (card?.captureFirst && !perCandidateCommands.ingest?.includes('source:ingest-current')) {
    failures.push(`${id}: capture-first source sprint ingest must use source:ingest-current`);
  }
}

if (sourceInboxHandoff?.schema !== 'water9/source-inbox-handoff@1') failures.push(`source inbox handoff schema is ${sourceInboxHandoff?.schema ?? 'missing'}`);
await fileOk('source inbox handoff markdown', paths.sourceInboxHandoffMarkdown, sprintIds.length ? 2048 : 512);
const inboxHandoffIds = Array.isArray(sourceInboxHandoff?.scopeIds) ? sourceInboxHandoff.scopeIds : [];
const inboxHandoffCandidates = Array.isArray(sourceInboxHandoff?.candidates) ? sourceInboxHandoff.candidates : [];
if (sourceInboxHandoff?.scope !== 'active-sprint') failures.push(`source inbox handoff scope must default to active-sprint, got ${sourceInboxHandoff?.scope ?? 'missing'}`);
if (inboxHandoffIds.join(',') !== sprintIds.join(',')) failures.push('source inbox handoff scope ids do not match source sprint ids');
if (inboxHandoffCandidates.map((item) => item.id).join(',') !== sprintIds.join(',')) failures.push('source inbox handoff candidate order does not match source sprint ids');
const inboxHandoffIdList = inboxHandoffIds.join(',');
const expectedInboxHandoffMarkdown = [
  'Scope: `active-sprint`',
  `Scoped ids: \`${inboxHandoffIdList}\``,
  'Inbox files outside this handoff scope',
];
if (sprintIds.length) {
  expectedInboxHandoffMarkdown.push(
    `npm run source:inbox-check -- --dir ${sourceInboxHandoff?.inboxDir} --strict --ids ${inboxHandoffIdList}`,
    `npm run source:ingest-batch -- --dir ${sourceInboxHandoff?.inboxDir} --strict --ids ${inboxHandoffIdList} --dry-run`,
    `npm run source:ingest-batch -- --dir ${sourceInboxHandoff?.inboxDir} --strict --ids ${inboxHandoffIdList}`,
  );
}
for (const expected of expectedInboxHandoffMarkdown) {
  if (expected.includes('undefined')) continue;
  if (!sourceInboxHandoffMarkdown.includes(expected)) failures.push(`source inbox handoff markdown missing ${expected}`);
}
if (sourceInboxHandoffMarkdown.includes(`npm run source:inbox-check -- --dir ${sourceInboxHandoff?.inboxDir} --strict\n`)) {
  failures.push('source inbox handoff must not advertise unscoped inbox-check');
}
if (sourceInboxHandoffMarkdown.includes(`npm run source:ingest-batch -- --dir ${sourceInboxHandoff?.inboxDir} --strict --dry-run`)) {
  failures.push('source inbox handoff must not advertise unscoped batch dry-run');
}
for (const id of inboxHandoffIds) {
  const item = inboxHandoffCandidates.find((candidate) => candidate.id === id);
  if (!item) {
    failures.push(`${id}: missing from source inbox handoff`);
    continue;
  }
  for (const expectedCommand of [
    `npm run source:inbox-check -- --dir ${sourceInboxHandoff.inboxDir} --strict --ids ${id}`,
    `npm run source:ingest-current -- --id ${id} --dry-run`,
    `npm run source:ingest-current -- --id ${id} --apply`,
    `npm run sandbox:preview -- --id ${id} --kind source --serve --open --visual`,
    `npm run source:inbox-check -- --dir ${sourceInboxHandoff.inboxDir} --strict --ids ${inboxHandoffIdList}`,
    `npm run source:ingest-batch -- --dir ${sourceInboxHandoff.inboxDir} --strict --ids ${inboxHandoffIdList} --dry-run`,
    `npm run source:ingest-batch -- --dir ${sourceInboxHandoff.inboxDir} --strict --ids ${inboxHandoffIdList}`,
  ]) {
    if (!Object.values(item.commands ?? {}).includes(expectedCommand)) failures.push(`${id}: source inbox handoff missing command ${expectedCommand}`);
    if (!sourceInboxHandoffMarkdown.includes(expectedCommand)) failures.push(`${id}: source inbox handoff markdown missing command ${expectedCommand}`);
  }
}
for (const image of sourceInboxHandoff?.ignoredInboxImages ?? []) {
  if (image.inScope !== false) failures.push(`${image.path}: source inbox ignored image must be out of scope`);
  if (!sourceInboxHandoffMarkdown.includes(image.path)) failures.push(`${image.path}: source inbox handoff markdown must list ignored image`);
}

if (sourceAcquisitionRunbook?.schema !== 'water9/source-acquisition-runbook@1') failures.push(`source acquisition runbook schema is ${sourceAcquisitionRunbook?.schema ?? 'missing'}`);
await fileOk('source acquisition runbook markdown', paths.sourceAcquisitionRunbookMarkdown, 1024);
await fileOk('source acquisition runbook html', paths.sourceAcquisitionRunbookHtml, 2048);
const runbookIds = Array.isArray(sourceAcquisitionRunbook?.ids) ? sourceAcquisitionRunbook.ids : [];
if (runbookIds.join(',') !== sprintIds.join(',')) failures.push('source acquisition runbook ids do not match source sprint ids');
const runbookCandidates = Array.isArray(sourceAcquisitionRunbook?.candidates) ? sourceAcquisitionRunbook.candidates : [];
if (runbookCandidates.length !== sprintIds.length) failures.push('source acquisition runbook candidate count does not match sprint');
const runbookBatchCommands = Object.values(sourceAcquisitionRunbook?.batchCommands ?? {}).filter(Boolean).join('\n');
for (const expected of [
  'source:sprint',
  'source:inbox-review',
  'source:imagegen-health',
  'source:recovery-scout',
  'source:recovery-scout-check',
  'source:inbox-capture -- --ids',
  'source:generate-openai',
  'source:generate-openai-batch',
  'source:advance-inbox',
  'source:inbox-check',
  'source:ingest-batch',
  '--dry-run',
  'source:image-check',
  'source:preview-check',
  'source:review-dossier',
  'content:goal-readiness',
]) {
  requireCommandText('source acquisition runbook batch commands', runbookBatchCommands, expected);
}
for (const required of [
  'Water 9 Source Acquisition Runbook',
  'Batch Procedure',
  'Batch Commands',
  'Acquisition Targets',
  'npm run source:inbox-check',
  'npm run source:recovery-scout',
  'npm run source:ingest-batch',
  'npm run source:preview-check',
]) {
  if (!sourceAcquisitionRunbookMarkdown.includes(required)) failures.push(`source acquisition runbook markdown missing ${required}`);
  if (!textIncludesHtml(sourceAcquisitionRunbookHtml, required)) failures.push(`source acquisition runbook html missing ${required}`);
}
for (const id of sprintIds) {
  const item = runbookCandidates.find((candidate) => candidate.id === id);
  const sprintCard = (sourceSprint?.candidates ?? []).find((candidate) => candidate.id === id);
  if (!item) {
    failures.push(`${id}: missing from source acquisition runbook`);
    continue;
  }
  if (item.captureFirst !== Boolean(sprintCard?.captureFirst)) failures.push(`${id}: source acquisition runbook captureFirst mismatch`);
  if (!Array.isArray(item.expectedInboxFiles) || !item.expectedInboxFiles.includes(`${sourceAcquisitionRunbook.inboxDir}/${id}.png`)) {
    failures.push(`${id}: source acquisition runbook missing primary inbox target`);
  }
  if (!item.expectedInboxFiles?.includes(`${sourceAcquisitionRunbook.inboxDir}/fauna-${id}-whole-source.png`)) {
    failures.push(`${id}: source acquisition runbook missing alternate inbox target`);
  }
  if (item.captureUrl !== `http://127.0.0.1:5188/?id=${encodeURIComponent(id)}`) failures.push(`${id}: source acquisition runbook captureUrl is not target-aware`);
  for (const expectedCommand of [
    `npm run source:next-prompt -- --id ${id}`,
    `npm run source:session -- --id ${id}`,
    `npm run source:inbox-capture -- --id ${id} --open`,
    `npm run source:generate-openai -- --id ${id} --apply`,
    `npm run source:generate-openai -- --id ${id}`,
    `npm run source:recover-inline -- --id ${id} --image <saved-image-path> --copy --validate`,
    `npm run source:recover-inline -- --id ${id} --data-url-stdin --copy --validate`,
    `npm run source:recover-inline -- --id ${id} --stdin-base64 --stdin-filename ${id}.png --copy --validate`,
    `npm run source:recovery-scout -- --id ${id}`,
    `npm run source:inbox-check -- --dir ${sourceAcquisitionRunbook.inboxDir} --strict --ids ${id}`,
    `npm run source:ingest-current -- --id ${id} --dry-run`,
    `npm run source:ingest-current -- --id ${id} --apply`,
    `npm run sandbox:preview -- --id ${id} --kind source --serve --open --visual`,
  ]) {
    if (!Object.values(item.commands ?? {}).includes(expectedCommand)) failures.push(`${id}: source acquisition runbook missing command ${expectedCommand}`);
    if (!sourceAcquisitionRunbookMarkdown.includes(expectedCommand)) failures.push(`${id}: source acquisition runbook markdown missing command ${expectedCommand}`);
    if (!textIncludesHtml(sourceAcquisitionRunbookHtml, expectedCommand)) failures.push(`${id}: source acquisition runbook html missing command ${expectedCommand}`);
  }
  if (item.captureFirst && item.commands?.recoverInline) {
    failures.push(`${id}: capture-first source acquisition runbook must not advertise generic recoverInline`);
  }
  if (!String(item.commands?.ingestDryRun ?? '').includes('source:ingest-current')) failures.push(`${id}: single-target dry-run ingest must use source:ingest-current`);
  if (!String(item.commands?.ingest ?? '').includes('source:ingest-current')) failures.push(`${id}: single-target apply ingest must use source:ingest-current`);
}

if (sourceRecoveryScout?.schema !== 'water9/source-recovery-scout@1') failures.push(`source recovery scout schema is ${sourceRecoveryScout?.schema ?? 'missing'}`);
await fileOk('source recovery scout markdown', paths.sourceRecoveryScoutMarkdown, 512);
await fileOk('source recovery scout html', paths.sourceRecoveryScoutHtml, 1024);
const recoveryTarget = sourceRecoveryScout?.targetId ?? '';
if (!recoveryTarget) failures.push('source recovery scout targetId is missing');
if (nextAction?.nextAction?.kind === 'source-image-needed' && nextAction?.nextAction?.targetId && recoveryTarget !== nextAction.nextAction.targetId) {
  failures.push(`source recovery scout target ${recoveryTarget} does not match next action target ${nextAction.nextAction.targetId}`);
}
if (typeof sourceRecoveryScout?.manualCaptureRequired !== 'boolean') failures.push('source recovery scout manualCaptureRequired must be boolean');
if (!String(sourceRecoveryScout?.manualCaptureReason ?? '').trim()) failures.push('source recovery scout manualCaptureReason is missing');
for (const expectedCommand of [
  `npm run source:inbox-capture -- --id ${recoveryTarget} --open`,
  `npm run source:recover-inline -- --id ${recoveryTarget} --image <saved-image-path> --copy --validate`,
  `npm run source:recover-inline -- --id ${recoveryTarget} --data-url-stdin --copy --validate`,
  `npm run source:recover-inline -- --id ${recoveryTarget} --stdin-base64 --stdin-filename ${recoveryTarget}.png --copy --validate`,
  `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${recoveryTarget}`,
  `npm run source:ingest-current -- --id ${recoveryTarget} --dry-run`,
  `npm run source:ingest-current -- --id ${recoveryTarget} --apply`,
]) {
  if (expectedCommand.includes('undefined')) continue;
  if (!Object.values(sourceRecoveryScout?.commands ?? {}).includes(expectedCommand)) failures.push(`source recovery scout missing command ${expectedCommand}`);
  if (!sourceRecoveryScoutMarkdown.includes(expectedCommand)) failures.push(`source recovery scout markdown missing command ${expectedCommand}`);
  if (!textIncludesHtml(sourceRecoveryScoutHtml, expectedCommand)) failures.push(`source recovery scout html missing command ${expectedCommand}`);
}
for (const expected of ['Water 9 Source Recovery Scout', recoveryTarget, sourceRecoveryScout?.status, 'Manual capture required', 'Candidate Files']) {
  if (expected && !sourceRecoveryScoutMarkdown.includes(expected)) failures.push(`source recovery scout markdown missing ${expected}`);
  if (expected === 'Manual capture required') {
    if (!/manual capture required/i.test(sourceRecoveryScoutHtml)) failures.push(`source recovery scout html missing ${expected}`);
  } else if (expected && !textIncludesHtml(sourceRecoveryScoutHtml, expected)) {
    failures.push(`source recovery scout html missing ${expected}`);
  }
}

if (sourceIngestReadiness?.schema !== 'water9/source-ingest-readiness@1') failures.push(`source ingest readiness schema is ${sourceIngestReadiness?.schema ?? 'missing'}`);
await fileOk('source ingest readiness markdown', paths.sourceIngestReadinessMarkdown, sprintIds.length ? 1024 : 512);
await fileOk('source ingest readiness html', paths.sourceIngestReadinessHtml, sprintIds.length ? 2048 : 1024);
const readinessIds = Array.isArray(sourceIngestReadiness?.ids) ? sourceIngestReadiness.ids : [];
if (readinessIds.join(',') !== sprintIds.join(',')) failures.push('source ingest readiness ids do not match source sprint ids');
const readinessCandidates = Array.isArray(sourceIngestReadiness?.candidates) ? sourceIngestReadiness.candidates : [];
if (readinessCandidates.length !== sprintIds.length) failures.push('source ingest readiness candidate count does not match sprint');
const readinessSummary = {
  ready: readinessCandidates.filter((item) => item.status === 'ready').length,
  missing: readinessCandidates.filter((item) => item.status === 'missing').length,
  blocked: readinessCandidates.filter((item) => item.status === 'blocked').length,
};
for (const key of Object.keys(readinessSummary)) {
  if (sourceIngestReadiness?.summary?.[key] !== readinessSummary[key]) failures.push(`source ingest readiness summary.${key} mismatch`);
}
if (sourceIngestReadiness?.batchReady !== (readinessSummary.ready === readinessCandidates.length && readinessCandidates.length > 0)) {
  failures.push('source ingest readiness batchReady mismatch');
}
const readinessBatchCommands = Object.values(sourceIngestReadiness?.batchCommands ?? {}).filter(Boolean).join('\n');
for (const expected of [
  'source:ingest-readiness',
  'source:ingest-readiness-check',
  'source:inbox-check',
  'source:advance-inbox',
  'source:ingest-batch',
  '--dry-run',
  'source:image-check',
  'source:preview-check',
  'source:review-dossier',
]) {
  requireCommandText('source ingest readiness batch commands', readinessBatchCommands, expected);
}
for (const required of [
  'Water 9 Source Ingest Readiness',
  'Batch Commands',
  'Targets',
  'npm run source:inbox-check',
  'npm run source:advance-inbox',
  'npm run source:ingest-batch',
  'npm run source:image-check',
  'npm run source:preview-check',
]) {
  if (!sourceIngestReadinessMarkdown.includes(required)) failures.push(`source ingest readiness markdown missing ${required}`);
  if (!textIncludesHtml(sourceIngestReadinessHtml, required)) failures.push(`source ingest readiness html missing ${required}`);
}
for (const id of sprintIds) {
  const item = readinessCandidates.find((candidate) => candidate.id === id);
  if (!item) {
    failures.push(`${id}: missing from source ingest readiness`);
    continue;
  }
  if (!['ready', 'missing', 'blocked'].includes(item.status)) failures.push(`${id}: source ingest readiness invalid status ${item.status}`);
  if (!Array.isArray(item.expectedFiles) || !item.expectedFiles.includes(`${sourceIngestReadiness.inboxDir}/${id}.png`)) {
    failures.push(`${id}: source ingest readiness missing primary inbox file`);
  }
  if (!item.expectedFiles?.includes(`${sourceIngestReadiness.inboxDir}/fauna-${id}-whole-source.png`)) {
    failures.push(`${id}: source ingest readiness missing alternate inbox file`);
  }
  for (const expectedCommand of [
    `npm run source:inbox-capture -- --id ${id} --open`,
    `npm run source:inbox-check -- --dir ${sourceIngestReadiness.inboxDir} --strict --ids ${id}`,
    `npm run source:ingest-batch -- --dir ${sourceIngestReadiness.inboxDir} --strict --ids ${id} --dry-run`,
    `npm run source:ingest-batch -- --dir ${sourceIngestReadiness.inboxDir} --strict --ids ${id}`,
    `npm run sandbox:preview -- --id ${id} --kind source --serve --open --visual`,
  ]) {
    if (!Object.values(item.commands ?? {}).includes(expectedCommand)) failures.push(`${id}: source ingest readiness missing command ${expectedCommand}`);
    if (!sourceIngestReadinessMarkdown.includes(expectedCommand)) failures.push(`${id}: source ingest readiness markdown missing command ${expectedCommand}`);
    if (!textIncludesHtml(sourceIngestReadinessHtml, expectedCommand)) failures.push(`${id}: source ingest readiness html missing command ${expectedCommand}`);
  }
}

if (sourceInboxReview?.schema !== 'water9/source-inbox-review@1') failures.push(`source inbox review schema is ${sourceInboxReview?.schema ?? 'missing'}`);
if (sourceInboxReview?.captureCommand !== 'npm run source:inbox-capture') failures.push('source inbox review must expose capture command');
const inboxCandidates = Array.isArray(sourceInboxReview?.candidates) ? sourceInboxReview.candidates : [];
if (inboxCandidates.length !== queueCandidates.length) failures.push('source inbox review count does not match generation queue count');
const recommendedInboxTarget = inboxCandidates.find((candidate) => !candidate.inboxImage) ?? inboxCandidates.find((candidate) => candidate.ready) ?? inboxCandidates[0] ?? null;
if (recommendedInboxTarget) {
  const expectedCapture = `npm run source:inbox-capture -- --id ${recommendedInboxTarget.id} --open`;
  const expectedCheck = `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${recommendedInboxTarget.id}`;
  if (sourceInboxReview.recommendedTargetId !== recommendedInboxTarget.id) failures.push(`source inbox review recommendedTargetId must be ${recommendedInboxTarget.id}`);
  if (sourceInboxReview.recommendedCaptureCommand !== expectedCapture) failures.push(`source inbox review recommendedCaptureCommand must be ${expectedCapture}`);
  if (sourceInboxReview.recommendedCommands?.capture !== expectedCapture) failures.push('source inbox review recommendedCommands.capture mismatch');
  if (sourceInboxReview.recommendedCommands?.check !== expectedCheck) failures.push('source inbox review recommendedCommands.check mismatch');
}
for (const item of inboxCandidates) {
  if (!queueCandidates.some((candidate) => candidate.id === item.id)) failures.push(`${item.id}: inbox review item is not in source generation queue`);
}
if (sourceIntakeRunway?.schema !== 'water9/source-intake-runway@1') failures.push(`source intake runway schema is ${sourceIntakeRunway?.schema ?? 'missing'}`);
await fileOk('source intake runway html', paths.sourceIntakeRunwayHtml, sprintIds.length ? 4096 : 2048);
const intakeCandidates = Array.isArray(sourceIntakeRunway?.candidates) ? sourceIntakeRunway.candidates : [];
if ((sourceIntakeRunway?.summary?.sprint ?? 0) !== sprintIds.length) failures.push('source intake runway sprint count mismatch');
if (intakeCandidates.length !== sprintIds.length) failures.push('source intake runway candidate count does not match sprint');
if (sprintIds.length && (sourceIntakeRunway?.summary?.promptsWithAuditHardening ?? 0) !== sprintIds.length) failures.push('source intake runway prompts are not all audit-hardened');
for (const id of sprintIds) {
  const item = intakeCandidates.find((candidate) => candidate.id === id);
  if (!item) {
    failures.push(`${id}: missing from source intake runway`);
    continue;
  }
  if (!item.promptHasAuditHardening) failures.push(`${id}: source intake runway missing prompt audit hardening`);
  if (!item.queueHasAuditGuidance) failures.push(`${id}: source intake runway missing queue audit guidance`);
  if (!item.inboxTarget?.startsWith(sourceSprint.inboxDir ?? 'tools/source-inbox')) failures.push(`${id}: source intake runway inbox target does not match sprint inbox`);
}
if (!sourceIntakeRunwayHtml.includes('Source Intake Runway')) failures.push('source intake runway html missing title');
if (!sourceIntakeRunwayHtml.includes('npm run source:inbox-capture')) failures.push('source intake runway html missing capture command');
if (!sourceIntakeRunwayHtml.includes('npm run source:imagegen-health')) failures.push('source intake runway html missing imagegen health command');
if (!sourceIntakeRunwayHtml.includes('npm run source:preview-check')) failures.push('source intake runway html missing source preview command');
if (sprintIds.length && !sourceIntakeRunwayHtml.includes('npm run source:accept -- --id')) failures.push('source intake runway html missing source acceptance command');

if (sourceIntakeDoctor?.schema !== 'water9/source-intake-doctor@1') failures.push(`source intake doctor schema is ${sourceIntakeDoctor?.schema ?? 'missing'}`);
await fileOk('source intake doctor html', paths.sourceIntakeDoctorHtml, 1024);
await fileOk('source intake doctor markdown', paths.sourceIntakeDoctorMarkdown, 512);
const doctorTarget = sourceIntakeDoctor?.target ?? {};
const doctorQueue = Array.isArray(sourceIntakeDoctor?.queue) ? sourceIntakeDoctor.queue : [];
if (!doctorTarget.id) failures.push('source intake doctor target is missing');
if (nextAction?.nextAction?.kind === 'source-image' && nextAction?.nextAction?.targetId && doctorTarget.id !== nextAction.nextAction.targetId) {
  failures.push(`source intake doctor target ${doctorTarget.id} does not match next action target ${nextAction.nextAction.targetId}`);
}
if (doctorQueue.length !== queueCandidates.length) failures.push('source intake doctor queue count does not match source generation queue');
if (queueCandidates.length && !doctorQueue.some((item) => item.id === doctorTarget.id)) failures.push(`${doctorTarget.id}: source intake doctor target is missing from queue`);
for (const item of doctorQueue) {
  if (!queueCandidates.some((candidate) => candidate.id === item.id)) failures.push(`${item.id}: source intake doctor queue item is not in source generation queue`);
  if (!Array.isArray(item.expectedInboxFiles) || !item.expectedInboxFiles.includes(`tools/source-inbox/${item.id}.png`)) {
    failures.push(`${item.id}: source intake doctor missing primary inbox file`);
  }
  if (!Array.isArray(item.commands) || item.commands.length < 1) failures.push(`${item.id}: source intake doctor missing next commands`);
}
for (const expected of [
  'Water 9 Source Intake Doctor',
  doctorTarget.id,
  `tools/source-inbox/${doctorTarget.id}.png`,
  'npm run source:inbox-capture',
  'npm run source:inbox-check',
]) {
  if (expected && !sourceIntakeDoctorMarkdown.includes(expected)) failures.push(`source intake doctor markdown missing ${expected}`);
  if (expected && !sourceIntakeDoctorHtml.includes(expected.replace(/&/g, '&amp;'))) failures.push(`source intake doctor html missing ${expected}`);
}

if (sourceWorkstation?.schema !== 'water9/source-workstation@1') failures.push(`source workstation schema is ${sourceWorkstation?.schema ?? 'missing'}`);
await fileOk('source workstation html', paths.sourceWorkstationHtml, 4096);
await fileOk('source workstation markdown', paths.sourceWorkstationMarkdown, 2048);
const workstationTarget = sourceWorkstation?.target ?? {};
if (!workstationTarget.id) failures.push('source workstation target is missing');
if (nextAction?.nextAction?.kind === 'source-image' && nextAction?.nextAction?.targetId && workstationTarget.id !== nextAction.nextAction.targetId) {
  failures.push(`source workstation target ${workstationTarget.id} does not match next action target ${nextAction.nextAction.targetId}`);
}
if (workstationTarget.id && workstationTarget.doctorStatus !== doctorTarget.status) {
  failures.push(`source workstation doctor status ${workstationTarget.doctorStatus ?? 'missing'} does not match source intake doctor ${doctorTarget.status ?? 'missing'}`);
}
const workstationQueueItem = queueCandidates.find((item) => item.id === workstationTarget.id);
if (!workstationQueueItem && workstationTarget.doctorStatus !== 'source-present') failures.push(`${workstationTarget.id}: source workstation target is missing from source generation queue`);
if (workstationQueueItem) {
  if (workstationTarget.prompt !== workstationQueueItem.prompt) failures.push(`${workstationTarget.id}: source workstation prompt does not match source generation queue`);
  if (workstationTarget.promptFile !== workstationQueueItem.promptFile) failures.push(`${workstationTarget.id}: source workstation prompt file does not match source generation queue`);
  if (workstationTarget.expectedOutput !== workstationQueueItem.expectedOutput) failures.push(`${workstationTarget.id}: source workstation expected output does not match source generation queue`);
  if ((workstationTarget.requiredRead?.length ?? 0) < (workstationQueueItem.requiredRead?.length ?? 0)) failures.push(`${workstationTarget.id}: source workstation required read is incomplete`);
  if ((workstationTarget.contractReviewChecklist?.length ?? 0) < (workstationQueueItem.contractReviewChecklist?.length ?? 0)) failures.push(`${workstationTarget.id}: source workstation review checklist is incomplete`);
}
const workstationRejections = Array.isArray(sourceWorkstation?.rejections) ? sourceWorkstation.rejections : [];
const expectedWorkstationRejections = (sourceReview?.candidates ?? [])
  .find((item) => item.id === workstationTarget.id)
  ?.rejectedAttempts?.length ?? workstationRejections.length;
if (workstationRejections.length < expectedWorkstationRejections) failures.push(`${workstationTarget.id}: source workstation rejection history is incomplete`);
for (const expected of [
  'Water 9 Source Workstation',
  workstationTarget.id,
  workstationTarget.species,
  `tools/source-inbox/${workstationTarget.id}.png`,
  `tools/source-inbox/fauna-${workstationTarget.id}-whole-source.png`,
  `npm run source:inbox-capture -- --id ${workstationTarget.id} --open`,
  `npm run source:ingest-current -- --id ${workstationTarget.id} --dry-run`,
  `npm run source:ingest-current -- --id ${workstationTarget.id} --apply`,
  `http://127.0.0.1:5188/?id=${workstationTarget.id}`,
  'Generation Prompt',
  'Required Read',
  'Reject If',
  'Recent Rejections',
  `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${workstationTarget.id}`,
]) {
  if (expected && !sourceWorkstationMarkdown.includes(expected)) failures.push(`source workstation markdown missing ${expected}`);
  if (expected && !sourceWorkstationHtml.includes(expected.replace(/&/g, '&amp;'))) failures.push(`source workstation html missing ${expected}`);
}
if (workstationTarget.captureCommand !== `npm run source:inbox-capture -- --id ${workstationTarget.id} --open`) failures.push(`${workstationTarget.id}: source workstation captureCommand is not target-aware`);
if (workstationTarget.captureUrl !== `http://127.0.0.1:5188/?id=${encodeURIComponent(workstationTarget.id)}`) failures.push(`${workstationTarget.id}: source workstation captureUrl is not target-aware`);

if (sourceImageReport?.schema !== 'water9/source-image-validation@1') failures.push(`source image validation schema is ${sourceImageReport?.schema ?? 'missing'}`);
if ((sourceImageReport?.candidates ?? 0) !== candidates.length) failures.push('source image validation candidate count mismatch');
const sourceImages = candidates.filter((candidate) => candidate.source);
if ((sourceImageReport?.checkedImages ?? 0) !== sourceImages.length) failures.push('source image validation checkedImages mismatch');
for (const metric of sourceImageReport?.metrics ?? []) {
  if (metric.checked && (metric.failures ?? []).length) failures.push(`${metric.id}: source image validation failure ${metric.failures.join('; ')}`);
}

if (sourceReviewDossier?.schema !== 'water9/source-review-dossier@1') failures.push(`source review dossier schema is ${sourceReviewDossier?.schema ?? 'missing'}`);
await fileOk('source review dossier html', paths.sourceReviewDossierHtml, 4096);
if ((sourceReviewDossier?.summary?.candidateCount ?? 0) !== candidates.length) failures.push('source review dossier candidate count mismatch');
if ((sourceReviewDossier?.summary?.sourceImages ?? 0) !== sourceImages.length) failures.push('source review dossier source image count mismatch');
const sourceReviewItems = Array.isArray(sourceReviewDossier?.items) ? sourceReviewDossier.items : [];
const expectedReviewReady = sourceReviewItems.filter((item) => item.hasSource && !item.approved && item.evidence?.imageValidationPassed === true && item.evidence?.sourcePreviewPassed === true).length;
const expectedReviewBlocked = sourceReviewItems.filter((item) => item.hasSource && !item.approved && !(item.evidence?.imageValidationPassed === true && item.evidence?.sourcePreviewPassed === true)).length;
if ((sourceReviewDossier?.summary?.readyForHumanReview ?? -1) !== expectedReviewReady) failures.push('source review dossier readyForHumanReview mismatch');
if ((sourceReviewDossier?.summary?.reviewBlocked ?? -1) !== expectedReviewBlocked) failures.push('source review dossier reviewBlocked mismatch');
const readyReviewQueue = Array.isArray(sourceReviewDossier?.readyReviewQueue) ? sourceReviewDossier.readyReviewQueue : [];
const expectedReadyQueue = sourceReviewItems.filter((item) => item.hasSource && !item.approved && item.evidence?.imageValidationPassed === true && item.evidence?.sourcePreviewPassed === true);
if (readyReviewQueue.length !== expectedReadyQueue.length) failures.push(`source review dossier readyReviewQueue length ${readyReviewQueue.length} does not match ready review items ${expectedReadyQueue.length}`);
for (const [index, item] of expectedReadyQueue.entries()) {
  const queueItem = readyReviewQueue[index];
  if (!queueItem) continue;
  if (queueItem.rank !== index + 1) failures.push(`${item.id}: source review queue rank mismatch`);
  if (queueItem.id !== item.id) failures.push(`${item.id}: source review queue order/id mismatch`);
  if (queueItem.packet !== item.reviewPacket?.file) failures.push(`${item.id}: source review queue packet mismatch`);
  if (!queueItem.sourcePreviewCommand?.includes(`npm run sandbox:preview -- --id ${item.id} --kind source`)) failures.push(`${item.id}: source review queue missing source preview command`);
  if (!queueItem.acceptCommand?.includes(`npm run source:accept -- --id ${item.id}`)) failures.push(`${item.id}: source review queue missing accept command`);
  if (!queueItem.acceptCommand?.includes('--source-visual-board public/review/source-visual-board.json')) failures.push(`${item.id}: source review queue accept command missing source visual board evidence`);
  for (const expected of ['Ready Review Queue', queueItem.id, queueItem.packet, queueItem.sourcePreviewCommand, queueItem.acceptCommand]) {
    if (expected && !sourceReviewDossierHtml.includes(expected) && !sourceReviewDossierHtml.includes(htmlEscape(expected))) {
      failures.push(`${item.id}: source review dossier html missing ready queue detail ${expected}`);
    }
  }
}
const expectedRecommendedReview = sourceReviewItems.find((item) => item.hasSource && !item.approved && item.evidence?.imageValidationPassed === true && item.evidence?.sourcePreviewPassed === true)
  ?? sourceReviewItems.find((item) => item.hasSource && !item.approved)
  ?? null;
if (expectedRecommendedReview) {
  if (sourceReviewDossier.recommendedReview?.id !== expectedRecommendedReview.id) failures.push(`source review dossier recommendedReview must be ${expectedRecommendedReview.id}`);
  if (!sourceReviewDossier.recommendedReview?.acceptCommand?.includes(`npm run source:accept -- --id ${expectedRecommendedReview.id}`)) failures.push('source review dossier recommendedReview accept command is missing or wrong');
  if (!sourceReviewDossierHtml.includes('Recommended Review')) failures.push('source review dossier html missing recommended review section');
  if (!textIncludesHtml(sourceReviewDossierHtml, sourceReviewDossier.recommendedReview.acceptCommand)) failures.push('source review dossier html missing recommended accept command');
}
for (const candidate of sourceImages) {
  const item = sourceReviewItems.find((entry) => entry.id === candidate.id);
  if (!item) {
    failures.push(`${candidate.id}: missing from source review dossier`);
    continue;
  }
  if (!item.sourceThumbFile) failures.push(`${candidate.id}: source review dossier missing thumbnail`);
  if (!item.keyPreviewFile) failures.push(`${candidate.id}: source review dossier missing key preview`);
  if (item.evidence?.imageValidationPassed !== true) failures.push(`${candidate.id}: source review dossier image validation is not passing`);
  if (item.evidence?.sourcePreviewPassed !== true) failures.push(`${candidate.id}: source review dossier source preview is not passing`);
  if (item.approved !== true && !item.blockers?.includes('human source approval is still missing')) {
    failures.push(`${candidate.id}: source review dossier does not preserve missing human approval blocker`);
  }
  const expectedPacketFile = `public/review/source-candidates/source-review-packets/${candidate.id}.md`;
  if (item.reviewPacket?.file !== expectedPacketFile) failures.push(`${candidate.id}: source review dossier packet path mismatch`);
  if (!item.reviewPacket?.commands?.sourcePreview?.includes(`npm run sandbox:preview -- --id ${candidate.id} --kind source --serve --open --visual`)) {
    failures.push(`${candidate.id}: source review packet missing target-aware source preview command`);
  }
  if (item.reviewPacket?.commands?.accept !== item.acceptCommand) failures.push(`${candidate.id}: source review packet accept command mismatch`);
  if (item.reviewPacket?.commands?.reject !== item.rejectCommand) failures.push(`${candidate.id}: source review packet reject command mismatch`);
  for (const required of ['--source-rejected', '--source-visual-board public/review/source-visual-board.json', '--failed-check ', '--visual-note ']) {
    if (!String(item.rejectCommand ?? '').includes(required)) failures.push(`${candidate.id}: source review reject command missing ${required}`);
  }
  if (!textIncludesHtml(sourceReviewDossierHtml, expectedPacketFile)) failures.push(`${candidate.id}: source review dossier html missing packet link`);
  const packetMarkdown = await readText(`${candidate.id} source review packet`, resolve(expectedPacketFile));
  for (const expected of [
    `Source Review Packet: ${candidate.species} (${candidate.id})`,
    'Passing automation is not approval.',
    item.reviewPacket?.commands?.sourcePreview,
    item.acceptCommand,
    item.rejectCommand,
  ]) {
    if (expected && !packetMarkdown.includes(expected)) failures.push(`${candidate.id}: source review packet missing ${expected}`);
  }
}
if (!sourceReviewDossierHtml.includes('Water 9 Source Review Dossier')) failures.push('source review dossier html missing title');
if (!sourceReviewDossierHtml.includes('npm run source:accept -- --id')) failures.push('source review dossier html missing source acceptance command');
if (!sourceReviewDossierHtml.includes('magenta key preview')) failures.push('source review dossier html missing key preview section');
if (!sourceReviewDossierHtml.includes('Source Preview Command')) failures.push('source review dossier html missing source preview command section');

if (sourceNextReview?.schema !== 'water9/source-next-review@1') failures.push(`source next review schema is ${sourceNextReview?.schema ?? 'missing'}`);
await fileOk('source next review html', paths.sourceNextReviewHtml, 4096);
const sourceNextReviewReadyItems = (sourceApprovalRunway?.items ?? []).filter((item) => item.readyForHumanReview === true && item.humanApproved !== true);
const expectedSourceNextReviewTarget = sourceNextReviewReadyItems[0] ?? null;
if ((sourceNextReview?.summary?.candidates ?? -1) !== (sourceReviewDossier?.summary?.candidateCount ?? -2)) failures.push('source next review candidate count mismatch');
if ((sourceNextReview?.summary?.mechanicallyReadyForHumanReview ?? -1) !== (sourceApprovalRunway?.summary?.mechanicallyReadyForHumanReview ?? -2)) failures.push('source next review mechanicallyReadyForHumanReview mismatch');
if ((sourceNextReview?.summary?.criticRegenerationRequired ?? -1) !== (sourceApprovalRunway?.summary?.criticRegenerationRequired ?? -2)) failures.push('source next review criticRegenerationRequired mismatch');
if ((sourceNextReview?.summary?.readyForHumanReview ?? -1) !== (sourceApprovalRunway?.summary?.readyForHumanReview ?? -2)) failures.push('source next review readyForHumanReview mismatch');
if ((sourceNextReview?.summary?.humanApproved ?? -1) !== (sourceApprovalRunway?.summary?.humanApproved ?? -2)) failures.push('source next review humanApproved mismatch');
if (expectedSourceNextReviewTarget && sourceNextReview?.target?.id !== expectedSourceNextReviewTarget.id) failures.push(`source next review target must be ${expectedSourceNextReviewTarget.id}`);
if (sourceNextReview?.target) {
  const target = sourceNextReview.target;
  const runwayTarget = (sourceApprovalRunway?.items ?? []).find((item) => item.id === target.id);
  if (runwayTarget?.criticRegenerationRequired) failures.push(`${target.id}: source next review target must not require critic regeneration`);
  if (target.readyForHumanReview !== true) failures.push(`${target.id}: source next review target must be approval-ready`);
  for (const key of ['source', 'keyPreview', 'sandboxScreenshot', 'planPreview']) {
    if (!target.media?.[key]) failures.push(`${target.id}: source next review missing media.${key}`);
    if (target.media?.[key] && !textIncludesHtml(sourceNextReviewHtml, target.media[key])) failures.push(`${target.id}: source next review html missing media.${key}`);
  }
  for (const key of ['acceptDryRun', 'rejectDryRun', 'sourcePreview', 'runtimePreview', 'batchApplyStrict']) {
    if (!target.commands?.[key]) failures.push(`${target.id}: source next review missing commands.${key}`);
    if (target.commands?.[key] && !textIncludesHtml(sourceNextReviewHtml, target.commands[key])) failures.push(`${target.id}: source next review html missing commands.${key}`);
  }
  if (!String(target.commands?.acceptDryRun ?? '').includes('--dry-run')) failures.push(`${target.id}: source next review accept command must be dry-run`);
  if (!String(target.commands?.rejectDryRun ?? '').includes('--dry-run')) failures.push(`${target.id}: source next review reject command must be dry-run`);
  if (!String(target.commands?.acceptDryRun ?? '').includes('--source-visual-board public/review/source-visual-board.json')) failures.push(`${target.id}: source next review accept command must require source visual board`);
  if (!String(target.commands?.rejectDryRun ?? '').includes('--source-visual-board public/review/source-visual-board.json')) failures.push(`${target.id}: source next review reject command must require source visual board`);
  const starter = target.focusedDecisionStarter;
  const starterDecision = starter?.decisions?.[0];
  if (starter?.schema !== 'water9/source-cohesion-decisions@1') failures.push(`${target.id}: source next review focused decision starter schema mismatch`);
  if (starter?.reviewer !== '<human-reviewer>') failures.push(`${target.id}: source next review focused decision starter missing reviewer placeholder`);
  if (starter?.reviewedAt !== '<YYYY-MM-DD>') failures.push(`${target.id}: source next review focused decision starter missing reviewedAt placeholder`);
  if (starter?.policy?.humanAuthored !== true) failures.push(`${target.id}: source next review focused decision starter must preserve humanAuthored policy`);
  if (starter?.policy?.automationCannotApproveCohesion !== true) failures.push(`${target.id}: source next review focused decision starter must preserve automation boundary policy`);
  if (starter?.policy?.inspectSourceKeySandboxAndPlan !== true) failures.push(`${target.id}: source next review focused decision starter must preserve source/key/sandbox/plan policy`);
  if (!Array.isArray(starter?.instructions) || starter.instructions.length < 3) failures.push(`${target.id}: source next review focused decision starter missing instructions`);
  if (!Array.isArray(starter?.decisions) || starter.decisions.length !== 1) failures.push(`${target.id}: source next review focused decision starter must contain one decision`);
  if (starterDecision?.id !== target.id) failures.push(`${target.id}: source next review focused decision starter id mismatch`);
  if (starterDecision?.status !== 'needs-review') failures.push(`${target.id}: source next review focused decision starter must default needs-review`);
  if (starterDecision?.reviewer !== '<human-reviewer>') failures.push(`${target.id}: source next review focused decision starter decision missing reviewer placeholder`);
  if (!starterDecision?.evidenceFingerprint?.digest) failures.push(`${target.id}: source next review focused decision starter missing evidence digest`);
  if (Object.keys(starterDecision?.visualChecks ?? {}).length < 10) failures.push(`${target.id}: source next review focused decision starter visual checks incomplete`);
  if (!textIncludesHtml(sourceNextReviewHtml, `data-source-next-review-target="${target.id}"`)) failures.push(`${target.id}: source next review html missing target marker`);
  if (!textIncludesHtml(sourceNextReviewHtml, `data-focused-decision-starter="${target.id}"`)) failures.push(`${target.id}: source next review html missing focused decision marker`);
  for (const required of ['Next Source Review', 'Focused source-approval packet', 'Gate truth:', 'not approved yet', 'Dry-Run Commands', 'Focused Decision JSON Starter', 'data-source-next-review-decision-json', '"schema": "water9/source-cohesion-decisions@1"', '"reviewer": "<human-reviewer>"', '"status": "needs-review"']) {
    if (!textIncludesHtml(sourceNextReviewHtml, required)) failures.push(`source next review html missing ${required}`);
  }
}

if (sourceNextDecisionDraft?.schema !== 'water9/source-next-decision-draft@1') failures.push(`source next decision draft schema is ${sourceNextDecisionDraft?.schema ?? 'missing'}`);
await fileOk('source next decision draft markdown', paths.sourceNextDecisionDraftMarkdown, 1024);
await fileOk('source next decision draft html', paths.sourceNextDecisionDraftHtml, 4096);
if (sourceNextDecisionDraft?.policy?.draftDoesNotApproveSource !== true) failures.push('source next decision draft must state it does not approve source');
if (sourceNextDecisionDraft?.policy?.humanAuthoredDecisionRequired !== true) failures.push('source next decision draft must require human-authored decision');
if (sourceNextDecisionDraft?.policy?.reviewedOnlyDecisionFileRequired !== true) failures.push('source next decision draft must require reviewed-only decision file');
if (sourceNextDecisionDraft?.target?.id !== (sourceNextReview?.target?.id ?? null)) failures.push('source next decision draft target mismatch with source next review');
if (sourceNextDecisionDraft?.target?.species !== (sourceNextReview?.target?.species ?? null)) failures.push('source next decision draft species mismatch with source next review');
if (sourceNextDecisionDraft?.reviewedDecisionFilename !== 'water9-source-cohesion-reviewed-decisions.json') failures.push('source next decision draft reviewed filename mismatch');
const sourceNextDraftDecisionFile = sourceNextDecisionDraft?.decisionFile;
const sourceNextDraftDecision = sourceNextDraftDecisionFile?.decisions?.[0];
const sourceNextReviewDecision = sourceNextReview?.target?.focusedDecisionStarter?.decisions?.[0];
if (sourceNextDraftDecisionFile?.schema !== 'water9/source-cohesion-decisions@1') failures.push('source next decision draft decisionFile schema mismatch');
if (sourceNextDraftDecisionFile?.reviewer !== '<human-reviewer>') failures.push('source next decision draft reviewer placeholder missing');
if (sourceNextDraftDecisionFile?.policy?.humanAuthored !== true) failures.push('source next decision draft must preserve humanAuthored policy');
if (!Array.isArray(sourceNextDraftDecisionFile?.decisions) || sourceNextDraftDecisionFile.decisions.length !== 1) failures.push('source next decision draft must contain exactly one decision');
if (sourceNextDraftDecision?.id !== sourceNextDecisionDraft?.target?.id) failures.push('source next decision draft decision id mismatch');
if (sourceNextDraftDecision?.status !== 'needs-review') failures.push('source next decision draft decision must default needs-review');
if (sourceNextDraftDecision?.evidenceFingerprint?.digest !== sourceNextReviewDecision?.evidenceFingerprint?.digest) failures.push('source next decision draft evidence digest mismatch');
if (Object.keys(sourceNextDraftDecision?.visualChecks ?? {}).length < 10) failures.push('source next decision draft visual checks incomplete');
if (!String(sourceNextDecisionDraft?.commands?.strictDryRun ?? '').includes('water9-source-cohesion-reviewed-decisions.json')) failures.push('source next decision draft strictDryRun must use reviewed-only decision file');
if (String(sourceNextDecisionDraft?.commands?.strictDryRun ?? '').includes('water9-source-cohesion-decisions.json')) failures.push('source next decision draft strictDryRun must not use generic decision file');
for (const required of [
  'Water 9 Next Source Decision Draft',
  'This focused draft does not approve source art',
  'water9-source-cohesion-reviewed-decisions.json',
  'data-source-next-decision-draft',
  'data-source-next-decision-json',
  '"schema": "water9/source-cohesion-decisions@1"',
  '"status": "needs-review"',
  '"failedChecks": []',
  `data-source-next-decision-target="${sourceNextDecisionDraft?.target?.id}"`,
]) {
  if (!sourceNextDecisionDraftMarkdown.includes(required) && !textIncludesHtml(sourceNextDecisionDraftHtml, required)) failures.push(`source next decision draft output missing ${required}`);
}

if (sourceApprovalRunway?.schema !== 'water9/source-approval-runway@1') failures.push(`source approval runway schema is ${sourceApprovalRunway?.schema ?? 'missing'}`);
if (sourceApprovalChecklist?.schema !== 'water9/source-approval-checklist@1') failures.push(`source approval checklist schema is ${sourceApprovalChecklist?.schema ?? 'missing'}`);
await fileOk('source approval runway html', paths.sourceApprovalRunwayHtml, 4096);
const sourceApprovalItems = Array.isArray(sourceApprovalRunway?.items) ? sourceApprovalRunway.items : [];
const sourceApprovalChecklistItems = Array.isArray(sourceApprovalChecklist?.items) ? sourceApprovalChecklist.items : [];
const sourceApprovalChecklistById = new Map(sourceApprovalChecklistItems.map((item) => [item.id, item]));
const sourceApprovalPlanItems = Array.isArray(planCoverage?.items) ? planCoverage.items : [];
if ((sourceApprovalRunway?.summary?.candidates ?? -1) !== sourceReviewItems.length) failures.push('source approval runway candidate count mismatch');
if ((sourceApprovalRunway?.summary?.mechanicallyReadyForHumanReview ?? -1) !== sourceApprovalItems.filter((item) => item.mechanicallyReadyForHumanReview && !item.humanApproved).length) failures.push('source approval runway mechanically ready count mismatch');
if ((sourceApprovalRunway?.summary?.criticRegenerationRequired ?? -1) !== sourceApprovalItems.filter((item) => item.criticRegenerationRequired && !item.humanApproved).length) failures.push('source approval runway critic regeneration count mismatch');
if ((sourceApprovalRunway?.summary?.readyForHumanReview ?? -1) !== sourceApprovalItems.filter((item) => item.readyForHumanReview && !item.humanApproved).length) failures.push('source approval runway ready count mismatch');
if ((sourceApprovalRunway?.summary?.humanApproved ?? -1) !== sourceApprovalItems.filter((item) => item.humanApproved).length) failures.push('source approval runway approved count mismatch');
if ((sourceApprovalRunway?.summary?.planPreviewsPresent ?? -1) !== sourceApprovalItems.filter((item) => item.planPreviewPresent).length) failures.push('source approval runway plan preview count mismatch');
if ((sourceApprovalChecklist?.summary?.candidates ?? -1) !== sourceApprovalItems.length) failures.push('source approval checklist candidate count mismatch');
if ((sourceApprovalChecklist?.summary?.mechanicallyReadyForHumanReview ?? -1) !== sourceApprovalItems.filter((item) => item.mechanicallyReadyForHumanReview && !item.humanApproved).length) failures.push('source approval checklist mechanically ready count mismatch');
if ((sourceApprovalChecklist?.summary?.criticRegenerationRequired ?? -1) !== sourceApprovalItems.filter((item) => item.criticRegenerationRequired && !item.humanApproved).length) failures.push('source approval checklist critic regeneration count mismatch');
if ((sourceApprovalChecklist?.summary?.pendingHumanApproval ?? -1) !== sourceApprovalItems.filter((item) => item.readyForHumanReview && !item.humanApproved).length) failures.push('source approval checklist pending count mismatch');
for (const item of sourceApprovalItems) {
  const reviewItem = sourceReviewItems.find((entry) => entry.id === item.id);
  const planItem = sourceApprovalPlanItems.find((entry) => entry.id === item.id);
  const checklistItem = sourceApprovalChecklistById.get(item.id);
  const healthItem = sourceCriticRegenerationHealthById.get(item.id) ?? null;
  const regenerationItem = healthItem?.status === 'replacement-applied'
    ? null
    : sourceCriticRegenerationById.get(item.id);
  const mechanicallyReady = reviewItem?.evidence?.imageValidationPassed === true && reviewItem?.evidence?.sourcePreviewPassed === true && planItem?.artifacts?.planPreview?.exists === true;
  const criticRegenerationRequired = Boolean(regenerationItem);
  if (!reviewItem) failures.push(`${item.id}: source approval runway missing review dossier match`);
  if (!planItem) failures.push(`${item.id}: source approval runway missing plan coverage match`);
  if (!checklistItem) failures.push(`${item.id}: source approval checklist missing item`);
  if (item.mechanicallyReadyForHumanReview !== mechanicallyReady) failures.push(`${item.id}: source approval runway mechanicallyReadyForHumanReview mismatch`);
  if (item.criticRegenerationRequired !== criticRegenerationRequired) failures.push(`${item.id}: source approval runway criticRegenerationRequired mismatch`);
  if ((item.criticRegenerationHealthStatus ?? null) !== (healthItem?.status ?? null)) failures.push(`${item.id}: source approval runway criticRegenerationHealthStatus mismatch`);
  if (item.readyForHumanReview !== (mechanicallyReady && !criticRegenerationRequired)) {
    failures.push(`${item.id}: source approval runway readyForHumanReview mismatch`);
  }
  if (criticRegenerationRequired) {
    if (!item.criticRegeneration) failures.push(`${item.id}: source approval runway missing critic regeneration blocker`);
    if (item.criticRegeneration?.recommendation !== 'regenerate') failures.push(`${item.id}: source approval runway critic regeneration recommendation must be regenerate`);
    if (item.criticRegeneration?.promptFile !== regenerationItem?.promptFile) failures.push(`${item.id}: source approval runway critic regeneration promptFile mismatch`);
    if (!String(item.criticRegeneration?.commands?.generateOpenAiDryRun ?? '').includes('--queue public/review/source-candidates/source-critic-regeneration-queue.json')) failures.push(`${item.id}: source approval runway critic regeneration OpenAI command missing queue`);
    if (!String(item.criticRegeneration?.commands?.sourcePreview ?? '').includes('--with diver')) failures.push(`${item.id}: source approval runway critic regeneration preview missing diver`);
  } else if (item.criticRegeneration) {
    failures.push(`${item.id}: source approval runway has unexpected critic regeneration blocker`);
  }
  const quickReviewItem = (sourceReviewQueue?.reviews ?? []).find((entry) => entry.id === item.id);
  if (item.humanApproved !== (reviewItem?.approved === true || quickReviewItem?.evidence?.humanApproved === true)) failures.push(`${item.id}: source approval runway humanApproved mismatch`);
	  if (item.planPreviewPresent !== (planItem?.artifacts?.planPreview?.exists === true)) failures.push(`${item.id}: source approval runway planPreviewPresent mismatch`);
	  if (!item.links?.source || !item.links?.keyPreview || !item.links?.sandboxScreenshot || !item.links?.planPreview) failures.push(`${item.id}: source approval runway missing evidence link`);
	  const approvalRuntimeId = planItem?.runtimeId ?? item.id;
	  const expectedSandboxLab = `/review/sandbox/lab.html?id=source-${item.id}&with=diver`;
	  const expectedSourceSandboxLive = `/?entity=source-${item.id}&companion=diver`;
	  const expectedRuntimeSandboxLive = `/?sandbox=${approvalRuntimeId}&companion=diver`;
	  const expectedSourceLivePreview = `npm run sandbox:preview -- --id source-${item.id} --with diver --serve --open --visual`;
	  const expectedRuntimeLivePreview = `npm run sandbox:preview -- --id ${approvalRuntimeId} --with diver --serve --open --visual`;
	  if (item.links?.sandboxLab !== expectedSandboxLab) failures.push(`${item.id}: source approval runway sandboxLab link must be ${expectedSandboxLab}`);
	  if (item.links?.sourceSandboxLive !== expectedSourceSandboxLive) failures.push(`${item.id}: source approval runway sourceSandboxLive link must be ${expectedSourceSandboxLive}`);
	  if (item.links?.runtimeSandboxLive !== expectedRuntimeSandboxLive) failures.push(`${item.id}: source approval runway runtimeSandboxLive link must be ${expectedRuntimeSandboxLive}`);
	  if (item.commands?.sandboxLab !== expectedSourceLivePreview) failures.push(`${item.id}: source approval runway sandboxLab command must be ${expectedSourceLivePreview}`);
	  if (item.commands?.sourceSandboxLive !== expectedSourceLivePreview) failures.push(`${item.id}: source approval runway sourceSandboxLive command must be ${expectedSourceLivePreview}`);
	  if (item.commands?.runtimeSandboxLive !== expectedRuntimeLivePreview) failures.push(`${item.id}: source approval runway runtimeSandboxLive command must be ${expectedRuntimeLivePreview}`);
	  if (!String(item.acceptCommand ?? '').includes(`npm run source:accept -- --id ${item.id}`)) failures.push(`${item.id}: source approval runway accept command mismatch`);
  if (!String(item.acceptCommand ?? '').includes('--source-reviewed')) failures.push(`${item.id}: source approval runway accept command must require --source-reviewed`);
  if (!String(item.acceptCommand ?? '').includes('--source-visual-board public/review/source-visual-board.json')) failures.push(`${item.id}: source approval runway accept command must require source visual board evidence`);
  if (!String(item.acceptCommandDryRun ?? '').includes(`npm run source:accept -- --id ${item.id}`)) failures.push(`${item.id}: source approval runway dry-run accept command mismatch`);
  if (!String(item.acceptCommandDryRun ?? '').includes('--dry-run')) failures.push(`${item.id}: source approval runway dry-run accept command must include --dry-run`);
  if (!String(item.rejectCommandDryRun ?? '').includes(`npm run source:accept -- --id ${item.id}`)) failures.push(`${item.id}: source approval runway dry-run reject command mismatch`);
  if (!String(item.rejectCommandDryRun ?? '').includes('--dry-run')) failures.push(`${item.id}: source approval runway dry-run reject command must include --dry-run`);
  for (const required of ['--source-rejected', '--source-visual-board public/review/source-visual-board.json', '--failed-check ', '--visual-note ']) {
    if (!String(item.rejectCommand ?? '').includes(required)) failures.push(`${item.id}: source approval reject command missing ${required}`);
    if (!String(item.rejectCommandDryRun ?? '').includes(required)) failures.push(`${item.id}: source approval dry-run reject command missing ${required}`);
  }
  for (const check of ['whole-creature-cohesion', 'part-continuity-cohesion', 'readable-silhouette', 'no-collage-artifacts', 'non-placeholder-art-direction', 'crop-safe-anatomy', 'clean-magenta-key', 'gameplay-read', 'neutral-riggable-pose', 'visible-attack-lane']) {
    if (!String(item.acceptCommand ?? '').includes(`--visual-check ${check}`)) failures.push(`${item.id}: source approval accept command missing visual check ${check}`);
    if (!String(item.acceptCommand ?? '').includes(`--score ${check}=`)) failures.push(`${item.id}: source approval accept command missing score ${check}`);
    if (!String(item.acceptCommand ?? '').includes(`--visual-note ${check}=`)) failures.push(`${item.id}: source approval accept command missing visual note ${check}`);
    if (checklistItem && (!Array.isArray(checklistItem.requiredVisualChecks) || !checklistItem.requiredVisualChecks.includes(check))) {
      failures.push(`${item.id}: source approval checklist missing visual check ${check}`);
    }
  }
	  if (checklistItem) {
    if (checklistItem.readyForHumanReview !== item.readyForHumanReview) failures.push(`${item.id}: source approval checklist readyForHumanReview mismatch`);
    if (checklistItem.mechanicallyReadyForHumanReview !== item.mechanicallyReadyForHumanReview) failures.push(`${item.id}: source approval checklist mechanicallyReadyForHumanReview mismatch`);
    if (checklistItem.criticRegenerationRequired !== item.criticRegenerationRequired) failures.push(`${item.id}: source approval checklist criticRegenerationRequired mismatch`);
    if (JSON.stringify(checklistItem.criticRegeneration ?? null) !== JSON.stringify(item.criticRegeneration ?? null)) failures.push(`${item.id}: source approval checklist criticRegeneration mismatch`);
	    if (checklistItem.commands?.accept !== item.acceptCommand) failures.push(`${item.id}: source approval checklist accept command mismatch`);
	    if (checklistItem.commands?.acceptDryRun !== item.acceptCommandDryRun) failures.push(`${item.id}: source approval checklist accept dry-run command mismatch`);
	    if (checklistItem.commands?.rejectDryRun !== item.rejectCommandDryRun) failures.push(`${item.id}: source approval checklist reject dry-run command mismatch`);
	    if (checklistItem.links?.sandboxLab !== expectedSandboxLab) failures.push(`${item.id}: source approval checklist sandboxLab link must be ${expectedSandboxLab}`);
	    if (checklistItem.links?.sourceSandboxLive !== expectedSourceSandboxLive) failures.push(`${item.id}: source approval checklist sourceSandboxLive link must be ${expectedSourceSandboxLive}`);
	    if (checklistItem.links?.runtimeSandboxLive !== expectedRuntimeSandboxLive) failures.push(`${item.id}: source approval checklist runtimeSandboxLive link must be ${expectedRuntimeSandboxLive}`);
	    if (checklistItem.commands?.sandboxLab !== expectedSourceLivePreview) failures.push(`${item.id}: source approval checklist sandboxLab command must be ${expectedSourceLivePreview}`);
	    if (checklistItem.commands?.sourceSandboxLive !== expectedSourceLivePreview) failures.push(`${item.id}: source approval checklist sourceSandboxLive command must be ${expectedSourceLivePreview}`);
	    if (checklistItem.commands?.runtimeSandboxLive !== expectedRuntimeLivePreview) failures.push(`${item.id}: source approval checklist runtimeSandboxLive command must be ${expectedRuntimeLivePreview}`);
	    const requiredEvidenceLabels = checklistItem.requiredEvidenceLabels ?? [];
	    for (const label of ['live sandbox lab', 'live source sandbox', 'live runtime sandbox']) {
	      if (!requiredEvidenceLabels.includes(label)) failures.push(`${item.id}: source approval checklist missing required evidence label ${label}`);
	    }
	    const requiredEvidence = Array.isArray(checklistItem.requiredEvidence) ? checklistItem.requiredEvidence : [];
	    for (const [label, expectedUrl] of [
	      ['live sandbox lab', expectedSandboxLab],
	      ['live source sandbox', expectedSourceSandboxLive],
	      ['live runtime sandbox', expectedRuntimeSandboxLive],
	    ]) {
	      const evidence = requiredEvidence.find((entry) => entry.label === label);
	      if (!evidence) failures.push(`${item.id}: source approval checklist missing required evidence ${label}`);
	      else if (evidence.url !== expectedUrl) failures.push(`${item.id}: source approval checklist ${label} url must be ${expectedUrl}`);
	    }
	    if (!checklistItem.contract?.contractMarkdown || !Array.isArray(checklistItem.contract?.requiredRead)) failures.push(`${item.id}: source approval checklist missing contract snapshot`);
	    if (!checklistItem.diagnostics?.imageValidationMetric?.sourceFingerprint?.sha256) failures.push(`${item.id}: source approval checklist missing source fingerprint`);
    if (checklistItem.diagnostics?.sourcePreview?.hasPreviewSprite !== true) failures.push(`${item.id}: source approval checklist missing source preview sprite proof`);
    if (!Array.isArray(checklistItem.blockers) || (!item.humanApproved && !checklistItem.blockers.includes('human source approval missing'))) {
      failures.push(`${item.id}: source approval checklist missing human approval blocker`);
    }
    if (criticRegenerationRequired && !checklistItem.blockers.includes('critic regeneration required before human approval')) {
      failures.push(`${item.id}: source approval checklist missing critic regeneration blocker`);
    }
  }
  if (!String(item.reviewWarning ?? '').includes(item.humanApproved ? 'Approved source' : 'Not approved')) failures.push(`${item.id}: source approval runway missing approval warning`);
	  if (!textIncludesHtml(sourceApprovalRunwayHtml, `data-source-approval-candidate="${item.id}"`)) failures.push(`${item.id}: source approval runway html missing candidate marker`);
	  if (!textIncludesHtml(sourceApprovalRunwayHtml, item.acceptCommand)) failures.push(`${item.id}: source approval runway html missing accept command`);
	  if (!textIncludesHtml(sourceApprovalRunwayHtml, item.acceptCommandDryRun)) failures.push(`${item.id}: source approval runway html missing dry-run accept command`);
	  for (const expected of [
	    expectedSandboxLab,
	    expectedSourceSandboxLive,
	    expectedRuntimeSandboxLive,
	    expectedSourceLivePreview,
	    expectedRuntimeLivePreview,
	  ]) {
	    if (!textIncludesHtml(sourceApprovalRunwayHtml, expected)) failures.push(`${item.id}: source approval runway html missing live sandbox review evidence ${expected}`);
	  }
	}
if (!sourceApprovalRunwayHtml.includes('Water 9 Source Approval Runway')) failures.push('source approval runway html missing title');
if (!sourceApprovalRunwayHtml.includes('Automation can prove readiness; it cannot approve the art')) failures.push('source approval runway html missing approval boundary');
if (!sourceApprovalRunwayHtml.includes('post-review command')) failures.push('source approval runway html missing post-review command boundary');
if (!textIncludesHtml(sourceApprovalRunwayHtml, 'source-visual-board.html')) failures.push('source approval runway html missing source visual board link');
for (const expected of [
  'Human Approval Command Builder',
  'data-source-approval-command-builder',
  'data-build-command',
  'data-copy-command',
  'data-command-output',
]) {
  if (!textIncludesHtml(sourceApprovalRunwayHtml, expected)) failures.push(`source approval runway html missing ${expected}`);
}

if (sourceApprovalSession?.schema !== 'water9/source-approval-session@1') failures.push(`source approval session schema is ${sourceApprovalSession?.schema ?? 'missing'}`);
await fileOk('source approval session markdown', paths.sourceApprovalSessionMarkdown, 1024);
await fileOk('source approval session html', paths.sourceApprovalSessionHtml, 2048);
if (sourceApprovalSession?.policy?.humanAuthoredDecisionsRequired !== true) failures.push('source approval session must require human-authored decisions');
if (sourceApprovalSession?.policy?.automationCannotApproveSourceArt !== true) failures.push('source approval session must state automation cannot approve source art');
if (sourceApprovalSession?.policy?.wrapsExistingStrictApplyGate !== true) failures.push('source approval session must wrap strict apply gate');
if (sourceApprovalSession?.policy?.keepsAcceptSourceCandidateAsFinalGate !== true) failures.push('source approval session must keep accept source candidate as final gate');
const sourceApprovalReadyItems = sourceApprovalItems.filter((item) => item.readyForHumanReview && !item.humanApproved);
const sourceApprovalApprovedItems = sourceApprovalItems.filter((item) => item.humanApproved);
const sourceApprovalBlockedItems = sourceApprovalItems.filter((item) => !item.readyForHumanReview && !item.humanApproved);
if ((sourceApprovalSession?.summary?.candidates ?? -1) !== sourceApprovalItems.length) failures.push('source approval session candidate count mismatch');
if ((sourceApprovalSession?.summary?.readyForHumanReview ?? -1) !== sourceApprovalReadyItems.length) failures.push('source approval session readyForHumanReview mismatch');
if ((sourceApprovalSession?.summary?.humanApproved ?? -1) !== sourceApprovalApprovedItems.length) failures.push('source approval session humanApproved mismatch');
if ((sourceApprovalSession?.summary?.blockedBeforeHumanReview ?? -1) !== sourceApprovalBlockedItems.length) failures.push('source approval session blockedBeforeHumanReview mismatch');
if ((sourceApprovalSession?.summary?.requiredChecks ?? -1) !== (sourceCohesionDecisions?.requiredCohesionChecks?.length ?? -2)) failures.push('source approval session requiredChecks mismatch');
if ((sourceApprovalSession?.summary?.templateDecisions ?? -1) !== (sourceCohesionDecisions?.decisionFileTemplate?.decisions?.length ?? -2)) failures.push('source approval session templateDecisions mismatch');
const expectedSourceApprovalSessionTarget = sourceApprovalReadyItems[0] ?? null;
if ((sourceApprovalSession?.summary?.nextTarget ?? null) !== (expectedSourceApprovalSessionTarget?.id ?? sourceNextReview?.target?.id ?? null)) failures.push('source approval session nextTarget mismatch');
if (expectedSourceApprovalSessionTarget && !sourceApprovalSession?.nextTarget?.evidenceFingerprintDigest) failures.push('source approval session next target missing evidence fingerprint digest');
if (!String(sourceApprovalSession?.commands?.focusedNextReview ?? '').includes('npm run source:next-review && npm run source:next-review-check && npm run source:next-review:serve-smoke')) {
  failures.push('source approval session focused next review command mismatch');
}
if (!String(sourceApprovalSession?.commands?.focusedDecisionDraft ?? '').includes('npm run source:next-decision-draft && npm run source:next-decision-draft-check && npm run source:next-decision-draft:serve-smoke')) {
  failures.push('source approval session focused decision draft command mismatch');
}
if (expectedSourceApprovalSessionTarget && sourceApprovalSession?.nextTarget?.links?.focusedNextReview !== '/review/source-candidates/source-next-review.html') {
  failures.push('source approval session next target must link focused next review page');
}
if (expectedSourceApprovalSessionTarget && !String(sourceApprovalSession?.nextTarget?.commands?.focusedNextReview ?? '').includes('source:next-review')) {
  failures.push('source approval session next target must expose focused next review command');
}
if (expectedSourceApprovalSessionTarget && sourceApprovalSession?.nextTarget?.links?.focusedDecisionDraft !== '/review/source-candidates/source-next-decision-draft.html') {
  failures.push('source approval session next target must link focused decision draft page');
}
if (expectedSourceApprovalSessionTarget && !String(sourceApprovalSession?.nextTarget?.commands?.focusedDecisionDraft ?? '').includes('source:next-decision-draft')) {
  failures.push('source approval session next target must expose focused decision draft command');
}
if (!String(sourceApprovalSession?.decisionOutput?.strictApplyCommand ?? '').includes('npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict')) {
  failures.push('source approval session strict apply command mismatch');
}
if (String(sourceApprovalSession?.decisionOutput?.strictApplyCommand ?? '').includes('--apply')) failures.push('source approval session strict dry-run command must not include --apply');
if (!String(sourceApprovalSession?.decisionOutput?.strictApplyCommandWithApply ?? '').includes('--apply')) failures.push('source approval session apply command must include --apply');
for (const id of ['open-session', 'review-focused-target', 'prepare-focused-decision-draft', 'review-evidence', 'fill-decisions', 'strict-dry-run', 'apply-reviewed-decisions']) {
  if (!(sourceApprovalSession?.reviewSteps ?? []).some((step) => step.id === id)) failures.push(`source approval session missing review step ${id}`);
}
for (const expected of [
  'Water 9 Source Approval Session',
  'This page does not approve content automatically',
  'human reviewer must inspect evidence',
  'focused next review',
  'source-next-review.html',
  'npm run source:next-review && npm run source:next-review-check && npm run source:next-review:serve-smoke',
  'focused decision draft',
  'source-next-decision-draft.html',
  'npm run source:next-decision-draft && npm run source:next-decision-draft-check && npm run source:next-decision-draft:serve-smoke',
  'batch decision workspace',
  'source-cohesion-decision-template.html',
  'water9-source-cohesion-reviewed-decisions.json',
  'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
  'data-source-approval-session',
  'data-source-approval-step',
]) {
  if (!sourceApprovalSessionMarkdown.includes(expected) && !textIncludesHtml(sourceApprovalSessionHtml, expected)) failures.push(`source approval session outputs missing ${expected}`);
}

if (sourceApprovalMarathon?.schema !== 'water9/source-approval-marathon@1') failures.push(`source approval marathon schema is ${sourceApprovalMarathon?.schema ?? 'missing'}`);
await fileOk('source approval marathon markdown', paths.sourceApprovalMarathonMarkdown, 1024);
await fileOk('source approval marathon html', paths.sourceApprovalMarathonHtml, 4096);
if (sourceApprovalMarathon?.policy?.humanAuthoredDecisionsRequired !== true) failures.push('source approval marathon must require human-authored decisions');
if (sourceApprovalMarathon?.policy?.automationCannotApproveSourceArt !== true) failures.push('source approval marathon must state automation cannot approve source art');
if (sourceApprovalMarathon?.policy?.pageDoesNotApplyDecisions !== true) failures.push('source approval marathon must not apply decisions');
if (sourceApprovalMarathon?.policy?.strictApplyGateRequired !== true) failures.push('source approval marathon must require strict apply gate');
if (sourceApprovalMarathon?.policy?.acceptSourceCandidateRemainsFinalSourceGate !== true) failures.push('source approval marathon must preserve accept source candidate as final gate');
if (sourceApprovalMarathon?.policy?.reviewPacketMustShowSourceAndRuntimeEvidence !== true) failures.push('source approval marathon must require source and runtime evidence tiles');
const sourceApprovalMarathonItems = Array.isArray(sourceApprovalMarathon?.items) ? sourceApprovalMarathon.items : [];
const sourceApprovalMarathonRequiredMedia = [
  'source',
  'keyPreview',
  'sandboxScreenshot',
  'planPreview',
  'sourceParity',
  'contactSheet',
  'phaseStrip',
  'sandboxIdle',
  'sandboxLunge',
  'sandboxStunned',
];
if ((sourceApprovalMarathon?.summary?.candidates ?? -1) !== sourceApprovalItems.length) failures.push('source approval marathon candidate count mismatch');
if ((sourceApprovalMarathon?.summary?.readyForHumanReview ?? -1) !== sourceApprovalReadyItems.length) failures.push('source approval marathon readyForHumanReview mismatch');
if ((sourceApprovalMarathon?.summary?.humanApproved ?? -1) !== sourceApprovalApprovedItems.length) failures.push('source approval marathon humanApproved mismatch');
if ((sourceApprovalMarathon?.summary?.criticRegenerationRequired ?? -1) !== sourceApprovalItems.filter((item) => item.criticRegenerationRequired).length) failures.push('source approval marathon criticRegenerationRequired mismatch');
if ((sourceApprovalMarathon?.summary?.requiredChecks ?? -1) !== (sourceCohesionDecisions?.requiredCohesionChecks?.length ?? -2)) failures.push('source approval marathon requiredChecks mismatch');
if ((sourceApprovalMarathon?.summary?.requiredMediaTiles ?? -1) !== sourceApprovalMarathonRequiredMedia.length) failures.push('source approval marathon requiredMediaTiles mismatch');
if ((sourceApprovalMarathon?.summary?.decisionStarters ?? -1) !== sourceApprovalMarathonItems.filter((item) => item.decisionStarter).length) failures.push('source approval marathon decisionStarters mismatch');
if ((sourceApprovalMarathon?.summary?.riskHigh ?? -1) !== sourceApprovalMarathonItems.filter((item) => item.riskLevel === 'high').length) failures.push('source approval marathon riskHigh mismatch');
if ((sourceApprovalMarathon?.summary?.riskMedium ?? -1) !== sourceApprovalMarathonItems.filter((item) => item.riskLevel === 'medium').length) failures.push('source approval marathon riskMedium mismatch');
if ((sourceApprovalMarathon?.summary?.nextTarget ?? null) !== (sourceApprovalMarathonItems.find((item) => item.readyForHumanReview && !item.humanApproved)?.id ?? null)) failures.push('source approval marathon nextTarget mismatch');
for (const item of sourceApprovalMarathonItems) {
  if (!sourceApprovalItems.some((entry) => entry.id === item.id)) failures.push(`${item.id}: source approval marathon missing approval runway match`);
  if (!item.readyForHumanReview) failures.push(`${item.id}: source approval marathon item must be ready for human review`);
  if (item.criticRegenerationRequired) failures.push(`${item.id}: source approval marathon item must not require critic regeneration`);
  for (const key of sourceApprovalMarathonRequiredMedia) {
    if (!item.media?.[key]) failures.push(`${item.id}: source approval marathon missing media ${key}`);
  }
  if (!item.evidenceFingerprintDigest) failures.push(`${item.id}: source approval marathon missing evidence fingerprint digest`);
  if (!String(item.commands?.sourcePreview ?? '').includes(`source-${item.id}`)) failures.push(`${item.id}: source approval marathon source preview command mismatch`);
  if (!String(item.commands?.runtimePreview ?? '').includes(`--id ${item.id}`)) failures.push(`${item.id}: source approval marathon runtime preview command mismatch`);
  if (!String(item.commands?.strictDryRun ?? '').includes('water9-source-cohesion-reviewed-decisions.json')) failures.push(`${item.id}: source approval marathon strict dry-run must use reviewed decision file`);
  const starter = item.decisionStarter;
  if (starter?.schema !== 'water9/source-cohesion-decisions@1') failures.push(`${item.id}: source approval marathon starter schema mismatch`);
  if (starter?.reviewer !== '<human-reviewer>') failures.push(`${item.id}: source approval marathon starter reviewer placeholder mismatch`);
  if (starter?.reviewedAt !== '<ISO-8601 timestamp>') failures.push(`${item.id}: source approval marathon starter reviewedAt placeholder mismatch`);
  if (starter?.policy?.humanAuthored !== true) failures.push(`${item.id}: source approval marathon starter must require human authoring`);
  if ((starter?.decisions ?? []).length !== 1) failures.push(`${item.id}: source approval marathon starter must contain exactly one decision`);
  const decision = starter?.decisions?.[0];
  if (decision?.id !== item.id) failures.push(`${item.id}: source approval marathon starter decision id mismatch`);
  if (decision?.reviewer !== '<human-reviewer>') failures.push(`${item.id}: source approval marathon starter decision reviewer placeholder mismatch`);
  if (decision?.reviewedAt !== '<ISO-8601 timestamp>') failures.push(`${item.id}: source approval marathon starter decision reviewedAt placeholder mismatch`);
  if (decision?.status !== 'needs-review') failures.push(`${item.id}: source approval marathon starter must default needs-review`);
  if (decision?.overallNote !== '') failures.push(`${item.id}: source approval marathon starter overall note must default empty`);
  if (decision?.evidenceFingerprint?.digest !== item.evidenceFingerprintDigest) failures.push(`${item.id}: source approval marathon starter fingerprint mismatch`);
  for (const check of sourceCohesionDecisions?.requiredCohesionChecks ?? []) {
    if (!decision?.visualChecks?.[check]) failures.push(`${item.id}: source approval marathon starter missing check ${check}`);
  }
}
for (const expected of [
  'Source Approval Marathon',
  'All approval-ready source candidates in one pass',
  'Human-authored decisions and strict apply remain mandatory',
  'does not approve source art',
  'data-source-approval-marathon',
  'data-approval-marathon-item',
  'data-source-decision-starter',
  'data-source-decision-form',
  'data-source-decision-status',
  'data-source-overall-note',
  'data-source-check-score',
  'data-source-check-note',
  'data-sync-source-decision',
  'data-approval-marathon-export',
  'data-build-reviewed-decisions',
  'data-reviewed-decision-warnings',
  'data-reviewed-decision-output',
  'reviewed-only decision file',
  'No reviewed decision warnings.',
  'Structured Human Decision',
  'high-risk',
  'medium-risk',
  'water9-source-cohesion-reviewed-decisions.json',
  'contact sheet',
  'phase strip',
  'sandbox idle',
  'sandbox stunned',
]) {
  if (!sourceApprovalMarathonMarkdown.includes(expected) && !textIncludesHtml(sourceApprovalMarathonHtml, expected)) failures.push(`source approval marathon outputs missing ${expected}`);
}

if (sourceReplaceRunway?.schema !== 'water9/source-replace-runway@1') failures.push(`source replace runway schema is ${sourceReplaceRunway?.schema ?? 'missing'}`);
await fileOk('source replace runway markdown', paths.sourceReplaceRunwayMarkdown, 1024);
await fileOk('source replace runway html', paths.sourceReplaceRunwayHtml, 4096);
const sourceReplaceItems = Array.isArray(sourceReplaceRunway?.items) ? sourceReplaceRunway.items : [];
const sourceReplaceIds = sourceReplaceItems.map((item) => item.id).filter(Boolean);
if (new Set(sourceReplaceIds).size !== sourceReplaceIds.length) failures.push('source replace runway contains duplicate ids');
if ((sourceReplaceRunway?.summary?.candidates ?? -1) !== candidates.length) failures.push('source replace runway candidate count mismatch');
if ((sourceReplaceRunway?.summary?.sourcePresent ?? -1) !== sourceReplaceItems.filter((item) => item.sourcePresent).length) failures.push('source replace runway source-present count mismatch');
if ((sourceReplaceRunway?.summary?.replaceable ?? -1) !== sourceReplaceItems.filter((item) => item.replaceable).length) failures.push('source replace runway replaceable count mismatch');
if ((sourceReplaceRunway?.summary?.humanApproved ?? -1) !== sourceReplaceItems.filter((item) => item.humanApproved).length) failures.push('source replace runway human-approved count mismatch');
if (!sourceReplaceRunwayMarkdown.includes('Safe Replacement Loop')) failures.push('source replace runway markdown missing safe replacement loop');
if (!sourceReplaceRunwayMarkdown.includes('does not approve source art')) failures.push('source replace runway markdown missing approval boundary');
if (!sourceReplaceRunwayHtml.includes('Water 9 Source Replace Runway')) failures.push('source replace runway html missing title');
if (!sourceReplaceRunwayHtml.includes('Replacement Boundary')) failures.push('source replace runway html missing replacement boundary');
if (sourceReplaceRunwayHtml.includes('npm run source:accept')) failures.push('source replace runway html must not render source acceptance commands');
for (const item of sourceReplaceItems) {
  const candidate = candidates.find((entry) => entry.id === item.id);
  const approvalItem = sourceApprovalItems.find((entry) => entry.id === item.id);
  if (!candidate) failures.push(`${item.id}: source replace runway missing source candidate match`);
  if (!approvalItem) failures.push(`${item.id}: source replace runway missing source approval match`);
  const expectedApproved = candidate?.status === 'approved' || candidate?.review?.status === 'approved' || approvalItem?.humanApproved === true;
  if (item.humanApproved !== expectedApproved) failures.push(`${item.id}: source replace runway humanApproved mismatch`);
  if (item.sourcePresent !== Boolean(candidate?.source)) failures.push(`${item.id}: source replace runway sourcePresent mismatch`);
  if (item.replaceable !== (Boolean(candidate?.source) && !expectedApproved)) failures.push(`${item.id}: source replace runway replaceable mismatch`);
  if (item.existingSource !== (candidate?.source ?? null)) failures.push(`${item.id}: source replace runway existingSource mismatch`);
  if (!String(item.promptFile ?? '').startsWith('public/review/source-candidates/replace-runway-prompts/')) failures.push(`${item.id}: source replace runway prompt path mismatch`);
  await fileOk(`${item.id}: source replace prompt`, resolve(item.promptFile ?? ''), 512);
  for (const expected of [
    `data-source-replace-candidate="${item.id}"`,
    item.species,
    item.promptFile,
    `npm run source:inbox-capture -- --id ${item.id} --open`,
    `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${item.id}`,
    `npm run source:ingest -- --id ${item.id} --image tools/source-inbox/${item.id}.png --copy --overwrite --dry-run`,
    `npm run source:ingest -- --id ${item.id} --image tools/source-inbox/${item.id}.png --copy --overwrite`,
    `npm run source:image-check -- --id ${item.id}`,
    `npm run sandbox:preview -- --id source-${item.id} --with diver --serve --open --visual`,
  ]) {
    if (expected && !textIncludesHtml(sourceReplaceRunwayHtml, expected)) failures.push(`${item.id}: source replace runway html missing ${expected}`);
  }
  if (!String(item.commands?.dryRunReplace ?? '').includes('--overwrite --dry-run')) failures.push(`${item.id}: source replace dry-run command missing --overwrite --dry-run`);
  if (!String(item.commands?.applyReplace ?? '').includes('--overwrite')) failures.push(`${item.id}: source replace apply command missing --overwrite`);
  if (String(item.commands?.applyReplace ?? '').includes('--dry-run')) failures.push(`${item.id}: source replace apply command must not include --dry-run`);
  if (!String(item.commands?.rebuildEvidence ?? '').includes('source:approval-runway')) failures.push(`${item.id}: source replace rebuild evidence missing approval runway`);
  if (!String(item.commands?.rebuildEvidence ?? '').includes('source:visual-board')) failures.push(`${item.id}: source replace rebuild evidence missing visual board`);
}

if (sourceVisualBoard?.schema !== 'water9/source-visual-board@1') failures.push(`source visual board schema is ${sourceVisualBoard?.schema ?? 'missing'}`);
await fileOk('source visual board markdown', paths.sourceVisualBoardMarkdown, 512);
await fileOk('source visual board html', paths.sourceVisualBoardHtml, 4096);
const sourceVisualBoardItems = Array.isArray(sourceVisualBoard?.items) ? sourceVisualBoard.items : [];
const sourceVisualBoardIds = sourceVisualBoardItems.map((item) => item.id).filter(Boolean);
const sourceApprovalIds = sourceApprovalItems.map((item) => item.id).filter(Boolean);
if ((sourceVisualBoard?.summary?.candidates ?? -1) !== sourceApprovalItems.length) failures.push('source visual board candidate count mismatch');
if (new Set(sourceVisualBoardIds).size !== sourceVisualBoardIds.length) failures.push('source visual board contains duplicate ids');
for (const id of sourceApprovalIds) {
  if (!sourceVisualBoardIds.includes(id)) failures.push(`${id}: missing from source visual board`);
}
for (const id of sourceVisualBoardIds) {
  if (!sourceApprovalIds.includes(id)) failures.push(`${id}: source visual board id is not in source approval runway`);
}
if ((sourceVisualBoard?.summary?.readyForHumanReview ?? -1) !== sourceApprovalItems.filter((item) => item.readyForHumanReview && !item.humanApproved).length) failures.push('source visual board ready count mismatch');
if ((sourceVisualBoard?.summary?.humanApproved ?? -1) !== sourceApprovalItems.filter((item) => item.humanApproved).length) failures.push('source visual board approved count mismatch');
if ((sourceVisualBoard?.summary?.acceptedThreats ?? -1) !== (planCoverage?.summary?.acceptedThreats ?? 0)) failures.push('source visual board accepted-threat count mismatch');
if (!sourceVisualBoardHtml.includes('Water 9 Source Visual Board')) failures.push('source visual board html missing title');
if (!sourceVisualBoardHtml.includes('visual review evidence, not production acceptance')) failures.push('source visual board html missing acceptance boundary');
if (!sourceVisualBoardMarkdown.includes('does not approve production content')) failures.push('source visual board markdown missing acceptance boundary');
for (const item of sourceVisualBoardItems) {
  const approvalItem = sourceApprovalItems.find((entry) => entry.id === item.id);
  const checklistItem = sourceApprovalChecklistById.get(item.id);
  if (!approvalItem) failures.push(`${item.id}: source visual board missing approval runway match`);
  if (!checklistItem) failures.push(`${item.id}: source visual board missing checklist match`);
  if (item.species !== approvalItem?.species) failures.push(`${item.id}: source visual board species mismatch`);
  if (item.readyForHumanReview !== approvalItem?.readyForHumanReview) failures.push(`${item.id}: source visual board readyForHumanReview mismatch`);
  if (item.humanApproved !== approvalItem?.humanApproved) failures.push(`${item.id}: source visual board humanApproved mismatch`);
  if (item.planPreviewPresent !== approvalItem?.planPreviewPresent) failures.push(`${item.id}: source visual board planPreviewPresent mismatch`);
  const media = item.media ?? {};
  for (const label of ['source', 'keyPreview', 'sandboxScreenshot', 'planPreview']) {
    if (!media[label]) failures.push(`${item.id}: source visual board missing media ${label}`);
    if (media[label] && !String(media[label]).includes(item.id)) failures.push(`${item.id}: source visual board media ${label} URL does not contain candidate id`);
    if (media[label] && !item.mediaEvidence?.[label]?.sha256) failures.push(`${item.id}: source visual board media ${label} missing fingerprint`);
    if (media[label] && !textIncludesHtml(sourceVisualBoardHtml, media[label])) failures.push(`${item.id}: source visual board html missing media ${label}`);
  }
  if (!Array.isArray(item.requiredRead) || item.requiredRead.length < 3) failures.push(`${item.id}: source visual board requiredRead too weak`);
  if (!Array.isArray(item.contractReviewChecklist) || item.contractReviewChecklist.length < 1) failures.push(`${item.id}: source visual board missing contract checklist`);
  if (item.requiredRead?.some((entry) => String(entry).startsWith('+'))) failures.push(`${item.id}: source visual board requiredRead must not be truncated`);
  if (item.contractReviewChecklist?.some((entry) => String(entry).startsWith('+'))) failures.push(`${item.id}: source visual board contractReviewChecklist must not be truncated`);
  if (Array.isArray(checklistItem?.contract?.requiredRead) && item.requiredRead.length !== checklistItem.contract.requiredRead.length) {
    failures.push(`${item.id}: source visual board requiredRead count does not match checklist`);
  }
  if (Array.isArray(checklistItem?.contract?.contractReviewChecklist) && item.contractReviewChecklist.length !== checklistItem.contract.contractReviewChecklist.length) {
    failures.push(`${item.id}: source visual board contractReviewChecklist count does not match checklist`);
  }
  if (!item.humanApproved && !Array.isArray(item.blockers)) failures.push(`${item.id}: source visual board blockers must be an array`);
  if (!item.humanApproved && !item.blockers?.includes('human source approval missing')) failures.push(`${item.id}: source visual board must expose missing human approval blocker`);
  if (!String(item.links?.quickReview ?? '').includes(`/quick-reviews/${item.id}.html`)) failures.push(`${item.id}: source visual board quick review link mismatch`);
  if (String(item.links?.sourceSandbox ?? '').includes('/sandbox.html')) failures.push(`${item.id}: source visual board source sandbox link must use app root query URL`);
  if (String(item.links?.runtimeSandbox ?? '').includes('/sandbox.html')) failures.push(`${item.id}: source visual board runtime sandbox link must use app root query URL`);
  const expectedSourceSandbox = `/?entity=source-${item.id}&companion=diver`;
  if (item.links?.sourceSandbox !== expectedSourceSandbox) failures.push(`${item.id}: source visual board source sandbox link mismatch`);
  const visualBoardPlan = Array.isArray(planCoverage?.items) ? planCoverage.items.find((entry) => entry.id === item.id) : null;
  if (visualBoardPlan?.runtimeRegistered) {
    const expectedRuntimeSandbox = `/?sandbox=${visualBoardPlan.runtimeId ?? item.id}&companion=diver`;
    if (item.links?.runtimeSandbox !== expectedRuntimeSandbox) failures.push(`${item.id}: source visual board runtime sandbox link mismatch`);
  }
  if (!textIncludesHtml(sourceVisualBoardHtml, `data-source-visual-board-candidate="${item.id}"`)) failures.push(`${item.id}: source visual board html missing candidate marker`);
  if (!textIncludesHtml(sourceVisualBoardHtml, item.links?.sourceSandbox)) failures.push(`${item.id}: source visual board html missing source sandbox link`);
  if (item.links?.runtimeSandbox && !textIncludesHtml(sourceVisualBoardHtml, item.links.runtimeSandbox)) failures.push(`${item.id}: source visual board html missing runtime sandbox link`);
if (!sourceVisualBoardMarkdown.includes(item.id)) failures.push(`${item.id}: source visual board markdown missing id`);
}
if (sourceVisualBoardItems.length !== sourceApprovalItems.length) failures.push('source visual board item count does not match source approval runway');

if (sourceCriticBoard?.schema !== 'water9/source-critic-board@1') failures.push(`source critic board schema is ${sourceCriticBoard?.schema ?? 'missing'}`);
await fileOk('source critic board markdown', paths.sourceCriticBoardMarkdown, 1024);
await fileOk('source critic board html', paths.sourceCriticBoardHtml, 4096);
if (sourceCriticBoard?.policy?.advisoryOnly !== true) failures.push('source critic board must be advisory-only');
if (sourceCriticBoard?.policy?.doesNotApproveSources !== true) failures.push('source critic board must not approve sources');
if (sourceCriticBoard?.policy?.doesNotAcceptThreats !== true) failures.push('source critic board must not accept threats');
if (sourceCriticBoard?.policy?.humanApprovalStillRequired !== true) failures.push('source critic board must require human approval');
const sourceCriticBoardItems = Array.isArray(sourceCriticBoard?.items) ? sourceCriticBoard.items : [];
if ((sourceCriticBoard?.summary?.candidates ?? -1) !== sourceCriticBoardItems.length) failures.push('source critic board candidate count mismatch');
if (sourceCriticBoardItems.length !== sourceVisualBoardItems.length) failures.push('source critic board item count must match source visual board');
if ((sourceCriticBoard?.summary?.lanes ?? -1) !== new Set(sourceCriticBoardItems.map((item) => item.lane)).size) failures.push('source critic board lane count mismatch');
if ((sourceCriticBoard?.summary?.readyForHumanReview ?? -1) !== sourceCriticBoardItems.filter((item) => item.advisory?.readyForHumanReview).length) failures.push('source critic board ready count mismatch');
if ((sourceCriticBoard?.summary?.advisoryOnly ?? -1) !== sourceCriticBoardItems.filter((item) => String(item.advisory?.approvalBoundary ?? '').includes('Advisory')).length) failures.push('source critic board advisory count mismatch');
if ((sourceCriticBoard?.summary?.subagentFindings ?? -1) !== sourceCriticBoardItems.filter((item) => item.subagentCritique?.present).length) failures.push('source critic board subagent finding count mismatch');
if ((sourceCriticBoard?.summary?.regenerateRecommendations ?? -1) !== sourceCriticBoardItems.filter((item) => item.subagentCritique?.recommendation === 'regenerate').length) failures.push('source critic board regenerate recommendation count mismatch');
if ((sourceCriticBoard?.summary?.readyWithCautionRecommendations ?? -1) !== sourceCriticBoardItems.filter((item) => item.subagentCritique?.recommendation === 'ready-with-caution').length) failures.push('source critic board ready-with-caution recommendation count mismatch');
if ((sourceCriticBoard?.summary?.readyRecommendations ?? -1) !== sourceCriticBoardItems.filter((item) => item.subagentCritique?.recommendation === 'ready').length) failures.push('source critic board ready recommendation count mismatch');
const sourceCriticBoardIds = sourceCriticBoardItems.map((item) => item.id).filter(Boolean);
for (const id of sourceVisualBoardIds) {
  if (!sourceCriticBoardIds.includes(id)) failures.push(`${id}: missing from source critic board`);
}
for (const item of sourceCriticBoardItems) {
  if (!sourceVisualBoardIds.includes(item.id)) failures.push(`${item.id}: source critic board id is not in source visual board`);
  if (!item.species || !item.lane || !item.laneTitle) failures.push(`${item.id}: source critic board missing identity or lane metadata`);
  if (!item.media?.source || !item.media?.quickReview) failures.push(`${item.id}: source critic board missing source or quick-review media`);
  if (item.evidence?.researchAudited !== true) failures.push(`${item.id}: source critic board missing research audit evidence`);
  if (item.evidence?.imageValidationPassed !== true) failures.push(`${item.id}: source critic board image validation must pass`);
  if (item.evidence?.sourcePreviewPassed !== true) failures.push(`${item.id}: source critic board source preview must pass`);
  if (!Array.isArray(item.advisory?.shouldRegenerateIfObserved) || item.advisory.shouldRegenerateIfObserved.length < 2) failures.push(`${item.id}: source critic board must list at least two regeneration risks`);
  if (!Array.isArray(item.advisory?.reviewQuestions) || item.advisory.reviewQuestions.length < 4) failures.push(`${item.id}: source critic board must list at least four review questions`);
  if (!String(item.advisory?.animationRisk ?? '').trim()) failures.push(`${item.id}: source critic board missing animation risk`);
  if (!String(item.advisory?.approvalBoundary ?? '').includes('does not approve source art')) failures.push(`${item.id}: source critic board missing approval boundary`);
  if (item.subagentCritique?.present !== true) failures.push(`${item.id}: source critic board missing subagent critique`);
  if (!['ready', 'ready-with-caution', 'regenerate'].includes(item.subagentCritique?.recommendation)) failures.push(`${item.id}: source critic board has invalid subagent recommendation`);
  if (!Array.isArray(item.subagentCritique?.cohesionRisks) || item.subagentCritique.cohesionRisks.length < 2) failures.push(`${item.id}: source critic board subagent critique must list at least two cohesion risks`);
  if (!String(item.subagentCritique?.animationRisk ?? '').trim()) failures.push(`${item.id}: source critic board subagent critique missing animation risk`);
  if (item.subagentCritique?.recommendation === 'regenerate' && item.advisory?.advisoryState !== 'critic-recommends-regenerate') failures.push(`${item.id}: source critic board regenerate item must use critic-recommends-regenerate state`);
  if (item.subagentCritique?.recommendation === 'ready-with-caution' && item.advisory?.advisoryState !== 'ready-with-caution') failures.push(`${item.id}: source critic board caution item must use ready-with-caution state`);
  if (item.subagentCritique?.recommendation === 'ready' && item.advisory?.advisoryState !== 'ready-for-human-consideration') failures.push(`${item.id}: source critic board ready item must use ready-for-human-consideration state`);
  for (const key of ['rebuild', 'sandboxLab', 'sourcePreview', 'quickReview', 'sourceApprovalRunway']) {
    if (!String(item.commands?.[key] ?? '').trim()) failures.push(`${item.id}: source critic board command ${key} missing`);
  }
  if (!textIncludesHtml(sourceCriticBoardHtml, `data-source-critic="${item.id}"`)) failures.push(`${item.id}: source critic board html missing candidate marker`);
  if (!sourceCriticBoardMarkdown.includes(item.id)) failures.push(`${item.id}: source critic board markdown missing id`);
}
for (const required of [
  'Water 9 Source Critic Board',
  'Advisory board for pre-approval critique',
  'does not approve source art or accept threats',
  'npm run source:critic-board',
  'npm run source:critic-board-check',
  'Regenerate If Observed',
  'Review Questions',
  'Animation Risk',
]) {
  if (!sourceCriticBoardMarkdown.includes(required) && !textIncludesHtml(sourceCriticBoardHtml, required)) failures.push(`source critic board rendered outputs missing ${required}`);
}

if (sourceCriticRegeneration?.schema !== 'water9/source-critic-regeneration-queue@1') failures.push(`source critic regeneration queue schema is ${sourceCriticRegeneration?.schema ?? 'missing'}`);
await fileOk('source critic regeneration markdown', paths.sourceCriticRegenerationMarkdown, 1024);
await fileOk('source critic regeneration html', paths.sourceCriticRegenerationHtml, 4096);
if (sourceCriticRegeneration?.policy?.advisoryOnly !== true) failures.push('source critic regeneration queue must be advisory-only');
if (sourceCriticRegeneration?.policy?.doesNotApproveSources !== true) failures.push('source critic regeneration queue must not approve sources');
if (sourceCriticRegeneration?.policy?.doesNotAcceptThreats !== true) failures.push('source critic regeneration queue must not accept threats');
if (sourceCriticRegeneration?.policy?.humanApprovalStillRequired !== true) failures.push('source critic regeneration queue must require human approval');
if (sourceCriticRegeneration?.policy?.replacementMustReturnToSourceReview !== true) failures.push('source critic regeneration replacements must return to source review');
const sourceCriticRegenerationItems = Array.isArray(sourceCriticRegeneration?.candidates) ? sourceCriticRegeneration.candidates : [];
const criticRegenerateItems = sourceCriticBoardItems.filter((item) => item.subagentCritique?.recommendation === 'regenerate');
if ((sourceCriticRegeneration?.summary?.regenerateCandidates ?? -1) !== sourceCriticRegenerationItems.length) failures.push('source critic regeneration candidate count mismatch');
if (sourceCriticRegenerationItems.length !== criticRegenerateItems.length) failures.push('source critic regeneration queue must match critic-board regenerate count');
if ((sourceCriticRegeneration?.summary?.lanes ?? -1) !== new Set(sourceCriticRegenerationItems.map((item) => item.lane)).size) failures.push('source critic regeneration lane count mismatch');
if ((sourceCriticRegeneration?.summary?.promptFiles ?? -1) !== sourceCriticRegenerationItems.length) failures.push('source critic regeneration prompt file count mismatch');
for (const item of criticRegenerateItems) {
  if (!sourceCriticRegenerationItems.some((candidate) => candidate.id === item.id)) failures.push(`${item.id}: missing from source critic regeneration queue`);
}
for (const item of sourceCriticRegenerationItems) {
  if (!criticRegenerateItems.some((candidate) => candidate.id === item.id)) failures.push(`${item.id}: source critic regeneration item is not a critic-board regenerate item`);
  if (item.recommendation !== 'regenerate') failures.push(`${item.id}: source critic regeneration recommendation must be regenerate`);
  if (!String(item.prompt ?? '').includes('Subagent cohesion failures to fix')) failures.push(`${item.id}: source critic regeneration prompt missing subagent critique section`);
  if (!String(item.commands?.generateOpenAiDryRun ?? '').includes('--queue public/review/source-candidates/source-critic-regeneration-queue.json')) failures.push(`${item.id}: source critic regeneration OpenAI command must use queue`);
  if (!String(item.commands?.generateOpenAiApply ?? '').includes('--apply --overwrite')) failures.push(`${item.id}: source critic regeneration apply command must explicitly overwrite`);
  if (!String(item.commands?.dryRunReplace ?? '').includes('--overwrite --dry-run')) failures.push(`${item.id}: source critic regeneration dry-run replace command missing overwrite dry-run`);
  if (!String(item.commands?.sourcePreview ?? '').includes('--with diver')) failures.push(`${item.id}: source critic regeneration preview must include diver`);
  if (!textIncludesHtml(sourceCriticRegenerationHtml, `data-critic-regeneration="${item.id}"`)) failures.push(`${item.id}: source critic regeneration html missing marker`);
  if (!sourceCriticRegenerationMarkdown.includes(item.id)) failures.push(`${item.id}: source critic regeneration markdown missing id`);
}
for (const required of [
  'Water 9 Critic Regeneration Queue',
  'npm run source:critic-regeneration',
  'npm run source:critic-regeneration-check',
  'source-critic-regeneration-queue.json',
]) {
  if (!sourceCriticRegenerationMarkdown.includes(required) && !textIncludesHtml(sourceCriticRegenerationHtml, required)) failures.push(`source critic regeneration rendered outputs missing ${required}`);
}
if (sourceCriticRegenerationDoctor?.schema !== 'water9/source-critic-regeneration-doctor@1') failures.push(`source critic regeneration doctor schema is ${sourceCriticRegenerationDoctor?.schema ?? 'missing'}`);
await fileOk('source critic regeneration doctor markdown', paths.sourceCriticRegenerationDoctorMarkdown, 1024);
await fileOk('source critic regeneration doctor html', paths.sourceCriticRegenerationDoctorHtml, 2048);
if (sourceCriticRegenerationDoctor?.policy?.doesNotApproveSources !== true) failures.push('source critic regeneration doctor must not approve sources');
if (sourceCriticRegenerationDoctor?.policy?.doesNotAcceptThreats !== true) failures.push('source critic regeneration doctor must not accept threats');
if (sourceCriticRegenerationDoctor?.policy?.replacementMustReturnToSourceReview !== true) failures.push('source critic regeneration doctor replacements must return to source review');
if ((sourceCriticRegenerationDoctor?.summary?.regenerateCandidates ?? -1) !== (sourceCriticRegeneration?.summary?.regenerateCandidates ?? -2)) failures.push('source critic regeneration doctor regenerateCandidates mismatch');
if ((sourceCriticRegenerationDoctor?.summary?.nextCandidateId ?? null) !== (sourceCriticRegeneration?.summary?.nextCandidateId ?? null)) failures.push('source critic regeneration doctor nextCandidateId mismatch');
if ((sourceCriticRegenerationDoctor?.summary?.nextCandidateSpecies ?? null) !== (sourceCriticRegeneration?.summary?.nextCandidateSpecies ?? null)) failures.push('source critic regeneration doctor nextCandidateSpecies mismatch');
const criticDoctorTarget = sourceCriticRegenerationDoctor?.target ?? {};
if (criticDoctorTarget.id !== (sourceCriticRegeneration?.nextCandidate?.id ?? null)) failures.push('source critic regeneration doctor target mismatch with queue next candidate');
if (!['replacement-needed', 'replacement-inbox-blocked', 'replacement-ready-to-ingest', 'replacement-matches-current-source', 'no-regeneration-needed'].includes(criticDoctorTarget.status)) failures.push(`source critic regeneration doctor status invalid: ${criticDoctorTarget.status}`);
if ((sourceCriticRegenerationDoctor?.summary?.status ?? null) !== criticDoctorTarget.status) failures.push('source critic regeneration doctor summary status mismatch');
if ((sourceCriticRegenerationDoctor?.summary?.readyForReplacementIngest ?? null) !== Boolean(criticDoctorTarget.readyForReplacementIngest)) failures.push('source critic regeneration doctor readyForReplacementIngest mismatch');
if ((sourceCriticRegenerationDoctor?.summary?.replacementMatchesCurrentSource ?? null) !== Boolean(criticDoctorTarget.replacementMatchesCurrentSource)) failures.push('source critic regeneration doctor replacementMatchesCurrentSource mismatch');
for (const required of [
  'Water 9 Critic Regeneration Doctor',
  'does not approve source art',
  'tools/source-inbox',
  '/review/source-candidates/source-critic-regeneration-queue.html#next-regeneration-target',
  criticDoctorTarget.id,
  criticDoctorTarget.status,
]) {
  if (required && !sourceCriticRegenerationDoctorMarkdown.includes(required) && !textIncludesHtml(sourceCriticRegenerationDoctorHtml, required)) {
    failures.push(`source critic regeneration doctor rendered outputs missing ${required}`);
  }
}
for (const command of criticDoctorTarget.commands ?? []) {
  if (!sourceCriticRegenerationDoctorMarkdown.includes(command) && !textIncludesHtml(sourceCriticRegenerationDoctorHtml, command)) {
    failures.push(`source critic regeneration doctor rendered outputs missing command ${command}`);
  }
}

if (sourceCriticRegenerationHealth?.schema !== 'water9/source-critic-regeneration-health@1') failures.push(`source critic regeneration health schema is ${sourceCriticRegenerationHealth?.schema ?? 'missing'}`);
await fileOk('source critic regeneration health markdown', paths.sourceCriticRegenerationHealthMarkdown, 1024);
await fileOk('source critic regeneration health html', paths.sourceCriticRegenerationHealthHtml, 2048);
if (sourceCriticRegenerationHealth?.policy?.doesNotApproveSources !== true) failures.push('source critic regeneration health must not approve sources');
if (sourceCriticRegenerationHealth?.policy?.doesNotAcceptThreats !== true) failures.push('source critic regeneration health must not accept threats');
if (sourceCriticRegenerationHealth?.policy?.distinctReplacementRequiredBeforeIngest !== true) failures.push('source critic regeneration health must require distinct replacements before ingest');
if (sourceCriticRegenerationHealth?.policy?.replacementMustReturnToSourceReview !== true) failures.push('source critic regeneration health replacements must return to source review');
if ((sourceCriticRegenerationHealth?.summary?.regenerateCandidates ?? -1) !== sourceCriticRegenerationHealthItems.length) failures.push('source critic regeneration health candidate count mismatch');
if (sourceCriticRegenerationHealthItems.length !== sourceCriticRegenerationItems.length) failures.push('source critic regeneration health must match queue item count');
if ((sourceCriticRegenerationHealth?.summary?.distinctReplacementReady ?? -1) !== sourceCriticRegenerationHealthItems.filter((item) => item.status === 'distinct-replacement-ready').length) failures.push('source critic regeneration health distinct-ready count mismatch');
if ((sourceCriticRegenerationHealth?.summary?.appliedReplacements ?? -1) !== sourceCriticRegenerationHealthItems.filter((item) => item.status === 'replacement-applied').length) failures.push('source critic regeneration health applied count mismatch');
if ((sourceCriticRegenerationHealth?.summary?.validNoopReplacements ?? -1) !== sourceCriticRegenerationHealthItems.filter((item) => item.status === 'valid-noop-replacement').length) failures.push('source critic regeneration health no-op count mismatch');
if ((sourceCriticRegenerationHealth?.summary?.missingReplacements ?? -1) !== sourceCriticRegenerationHealthItems.filter((item) => item.status === 'replacement-missing').length) failures.push('source critic regeneration health missing count mismatch');
if ((sourceCriticRegenerationHealth?.summary?.invalidReplacements ?? -1) !== sourceCriticRegenerationHealthItems.filter((item) => item.status === 'replacement-invalid').length) failures.push('source critic regeneration health invalid count mismatch');
const nextHealthActionItem = sourceCriticRegenerationHealthItems.find((item) => item.status !== 'replacement-applied') ?? null;
if ((sourceCriticRegenerationHealth?.summary?.nextActionTarget ?? null) !== (nextHealthActionItem?.id ?? null)) failures.push('source critic regeneration health nextActionTarget mismatch');
if ((sourceCriticRegenerationHealth?.summary?.nextActionStatus ?? null) !== (nextHealthActionItem?.status ?? null)) failures.push('source critic regeneration health nextActionStatus mismatch');
for (const item of sourceCriticRegenerationHealthItems) {
  if (!sourceCriticRegenerationItems.some((candidate) => candidate.id === item.id)) failures.push(`${item.id}: source critic regeneration health item is not in queue`);
  if (!['distinct-replacement-ready', 'replacement-applied', 'valid-noop-replacement', 'replacement-missing', 'replacement-invalid'].includes(item.status)) failures.push(`${item.id}: source critic regeneration health invalid status ${item.status}`);
  if (item.status === 'distinct-replacement-ready' && item.distinctReplacementReady !== true) failures.push(`${item.id}: distinct-ready health item must set distinctReplacementReady`);
  if (item.status === 'replacement-applied' && item.replacementApplied !== true) failures.push(`${item.id}: applied health item must set replacementApplied`);
  if (item.status === 'replacement-applied' && item.replacementMatchesCurrentSource !== true) failures.push(`${item.id}: applied replacement must match current source`);
  if (item.status === 'valid-noop-replacement' && item.replacementMatchesCurrentSource !== true) failures.push(`${item.id}: no-op replacement must match current source`);
  if (item.status === 'replacement-missing' && item.inbox?.exists !== false) failures.push(`${item.id}: missing replacement must have no inbox file`);
  if (item.status === 'replacement-invalid' && item.imageCheck?.passed !== false) failures.push(`${item.id}: invalid replacement must fail image check`);
  if (item.distinctReplacementReady && item.replacementMatchesCurrentSource) failures.push(`${item.id}: replacement cannot be both distinct and matching current source`);
  if (!Array.isArray(item.nextCommands) || item.nextCommands.length < 1) failures.push(`${item.id}: source critic regeneration health missing next commands`);
  if (!textIncludesHtml(sourceCriticRegenerationHealthHtml, `data-critic-regeneration-health-row="${item.id}"`)) failures.push(`${item.id}: source critic regeneration health html missing marker`);
  if (!sourceCriticRegenerationHealthMarkdown.includes(item.id)) failures.push(`${item.id}: source critic regeneration health markdown missing id`);
  for (const command of item.nextCommands ?? []) {
    if (!sourceCriticRegenerationHealthMarkdown.includes(command) && !textIncludesHtml(sourceCriticRegenerationHealthHtml, command)) {
      failures.push(`${item.id}: source critic regeneration health rendered outputs missing command ${command}`);
    }
  }
}
for (const required of [
  'Water 9 Critic Regeneration Health',
  'does not approve source art',
  'Distinct replacements ready',
  'Valid no-op replacements',
  'Missing replacements',
  'source-critic-regeneration-health.json',
]) {
  if (!sourceCriticRegenerationHealthMarkdown.includes(required) && !textIncludesHtml(sourceCriticRegenerationHealthHtml, required)) failures.push(`source critic regeneration health rendered outputs missing ${required}`);
}

if (sourceReviewSequencer?.schema !== 'water9/source-review-sequencer@1') failures.push(`source review sequencer schema is ${sourceReviewSequencer?.schema ?? 'missing'}`);
await fileOk('source review sequencer markdown', paths.sourceReviewSequencerMarkdown, 1024);
await fileOk('source review sequencer html', paths.sourceReviewSequencerHtml, 2048);
if (sourceReviewSequencer?.policy?.doesNotApproveSources !== true) failures.push('source review sequencer must not approve sources');
if (sourceReviewSequencer?.policy?.doesNotAcceptThreats !== true) failures.push('source review sequencer must not accept threats');
if (sourceReviewSequencer?.policy?.previewOnlyDoesNotCountTowardGate !== true) failures.push('source review sequencer must keep preview-only rows out of the gate');
if (sourceReviewSequencer?.policy?.distinctReplacementRequiredBeforeIngest !== true) failures.push('source review sequencer must require distinct replacement before ingest');
if (sourceReviewSequencer?.policy?.dryRunOnlyApprovalCommands !== true) failures.push('source review sequencer must use dry-run-only approval commands');
const sourceReviewSequencerItems = Array.isArray(sourceReviewSequencer?.items) ? sourceReviewSequencer.items : [];
if ((sourceReviewSequencer?.summary?.totalCandidates ?? -1) !== sourceReviewSequencerItems.length) failures.push('source review sequencer candidate count mismatch');
if (sourceReviewSequencerItems.length !== sourceApprovalItems.length) failures.push('source review sequencer must match source approval item count');
if ((sourceReviewSequencer?.summary?.distinctReplacementReady ?? -1) !== (sourceCriticRegenerationHealth?.summary?.distinctReplacementReady ?? -2)) failures.push('source review sequencer distinct-ready count mismatch');
if ((sourceReviewSequencer?.summary?.validNoopReplacements ?? -1) !== (sourceCriticRegenerationHealth?.summary?.validNoopReplacements ?? -2)) failures.push('source review sequencer no-op count mismatch');
if ((sourceReviewSequencer?.summary?.missingReplacements ?? -1) !== (sourceCriticRegenerationHealth?.summary?.missingReplacements ?? -2)) failures.push('source review sequencer missing count mismatch');
if ((sourceReviewSequencer?.summary?.invalidReplacements ?? -1) !== (sourceCriticRegenerationHealth?.summary?.invalidReplacements ?? -2)) failures.push('source review sequencer invalid count mismatch');
if ((sourceReviewSequencer?.summary?.approvalReady ?? -1) !== sourceReviewSequencerItems.filter((item) => item.lane === 'approval-ready').length) failures.push('source review sequencer approval-ready count mismatch');
if ((sourceReviewSequencer?.summary?.approved ?? -1) !== sourceReviewSequencerItems.filter((item) => item.humanApproved).length) failures.push('source review sequencer approved count mismatch');
if ((sourceReviewSequencer?.summary?.countsTowardGate ?? -1) !== sourceReviewSequencerItems.filter((item) => item.countsTowardGate).length) failures.push('source review sequencer gate count mismatch');
const sourceReviewSequencerHealthById = new Map(sourceCriticRegenerationHealthItems.map((item) => [item.id, item]));
const sourceReviewSequencerExpectedNext = sourceReviewSequencerItems.find((item) => item.lane === 'regenerate-distinct-ready')
  ?? sourceReviewSequencerItems.find((item) => item.lane === 'regenerate-noop')
  ?? sourceReviewSequencerItems.find((item) => item.lane === 'regenerate-missing')
  ?? sourceReviewSequencerItems.find((item) => item.lane === 'regenerate-invalid')
  ?? sourceReviewSequencerItems.find((item) => item.lane === 'approval-ready')
  ?? null;
if ((sourceReviewSequencer?.summary?.nextTarget ?? null) !== (sourceReviewSequencerExpectedNext?.id ?? null)) failures.push('source review sequencer nextTarget mismatch');
if ((sourceReviewSequencer?.summary?.nextLane ?? null) !== (sourceReviewSequencerExpectedNext?.lane ?? null)) failures.push('source review sequencer nextLane mismatch');
for (const item of sourceReviewSequencerItems) {
  const health = sourceReviewSequencerHealthById.get(item.id) ?? null;
  if (!sourceApprovalItems.some((candidate) => candidate.id === item.id)) failures.push(`${item.id}: source review sequencer item is not in approval runway`);
  if (!['regenerate-distinct-ready', 'regenerate-noop', 'regenerate-missing', 'regenerate-invalid', 'approval-ready', 'approved'].includes(item.lane)) failures.push(`${item.id}: source review sequencer invalid lane ${item.lane}`);
  if (item.healthStatus !== (health?.status ?? null)) failures.push(`${item.id}: source review sequencer health status mismatch`);
  if (health?.status === 'distinct-replacement-ready' && item.lane !== 'regenerate-distinct-ready') failures.push(`${item.id}: distinct replacement must be in regenerate-distinct-ready lane`);
  if (health?.status === 'valid-noop-replacement' && item.lane !== 'regenerate-noop') failures.push(`${item.id}: no-op replacement must be in regenerate-noop lane`);
  if (health?.status === 'replacement-missing' && item.lane !== 'regenerate-missing') failures.push(`${item.id}: missing replacement must be in regenerate-missing lane`);
  if (health?.status === 'replacement-invalid' && item.lane !== 'regenerate-invalid') failures.push(`${item.id}: invalid replacement must be in regenerate-invalid lane`);
  if (!Array.isArray(item.nextCommands) || item.nextCommands.length < 1) failures.push(`${item.id}: source review sequencer missing next commands`);
  if (item.lane !== 'regenerate-distinct-ready') {
    for (const command of item.nextCommands ?? []) {
      if (/source:ingest\b/.test(command) && /--overwrite/.test(command)) failures.push(`${item.id}: sequencer non-distinct lane must not expose overwrite ingest`);
    }
  }
  if (item.lane === 'approval-ready' && !item.nextCommands.some((command) => command.includes('source:accept') && command.includes('--dry-run'))) failures.push(`${item.id}: sequencer approval-ready row missing dry-run source accept command`);
  if (!textIncludesHtml(sourceReviewSequencerHtml, `data-source-review-sequencer-row="${item.id}"`)) failures.push(`${item.id}: source review sequencer html missing row marker`);
  if (!sourceReviewSequencerMarkdown.includes(item.id)) failures.push(`${item.id}: source review sequencer markdown missing id`);
}
for (const required of [
  'Water 9 Source Review Sequencer',
  'does not approve source art',
  'does not accept threats',
  'Preview-only rows do not count toward the 20-threat gate',
  'source-review-sequencer.json',
  'regenerate-noop',
  'approval-ready',
]) {
  if (!sourceReviewSequencerMarkdown.includes(required) && !textIncludesHtml(sourceReviewSequencerHtml, required)) failures.push(`source review sequencer rendered outputs missing ${required}`);
}

if (sourceReviewTargetPacket?.schema !== 'water9/source-review-target-packet@1') failures.push(`source review target packet schema is ${sourceReviewTargetPacket?.schema ?? 'missing'}`);
await fileOk('source review target packet markdown', paths.sourceReviewTargetPacketMarkdown, 1024);
await fileOk('source review target packet html', paths.sourceReviewTargetPacketHtml, 2048);
if (sourceReviewTargetPacket?.policy?.doesNotApproveSources !== true) failures.push('source review target packet must not approve sources');
if (sourceReviewTargetPacket?.policy?.doesNotAcceptThreats !== true) failures.push('source review target packet must not accept threats');
if (sourceReviewTargetPacket?.policy?.previewOnlyDoesNotCountTowardGate !== true) failures.push('source review target packet must keep preview-only work out of gate');
if (sourceReviewTargetPacket?.policy?.followsSourceReviewSequencer !== true) failures.push('source review target packet must follow sequencer');
if ((sourceReviewTargetPacket?.target?.id ?? null) !== (sourceReviewSequencer?.summary?.nextTarget ?? null)) failures.push('source review target packet must target sequencer next target');
if ((sourceReviewTargetPacket?.target?.lane ?? null) !== (sourceReviewSequencer?.summary?.nextLane ?? null)) failures.push('source review target packet lane must match sequencer next lane');
if (sourceReviewTargetPacket?.target?.lane !== 'regenerate-distinct-ready') {
  for (const command of sourceReviewTargetPacket?.target?.nextCommands ?? []) {
    if (String(command).includes('source:ingest') && String(command).includes('--overwrite')) failures.push('source review target packet must not expose overwrite ingest outside distinct-ready lane');
  }
}
for (const command of sourceReviewTargetPacket?.target?.nextCommands ?? []) {
  if (!sourceReviewTargetPacketMarkdown.includes(command) && !textIncludesHtml(sourceReviewTargetPacketHtml, command)) failures.push(`source review target packet rendered outputs missing command ${command}`);
}
for (const required of [
  'Water 9 Source Review Target Packet',
  'does not approve source art',
  'does not accept threats',
  'Command Boundary',
  'Critic Prompt',
  'Quality Gate Boundary',
  'data-source-review-target-packet',
  sourceReviewTargetPacket?.target?.id,
  sourceReviewTargetPacket?.target?.lane,
]) {
  if (required && !sourceReviewTargetPacketMarkdown.includes(String(required)) && !textIncludesHtml(sourceReviewTargetPacketHtml, required)) failures.push(`source review target packet rendered outputs missing ${required}`);
}

if (sourceRegenerationWorkspace?.schema !== 'water9/source-regeneration-workspace@1') failures.push(`source regeneration workspace schema is ${sourceRegenerationWorkspace?.schema ?? 'missing'}`);
await fileOk('source regeneration workspace markdown', paths.sourceRegenerationWorkspaceMarkdown, 1024);
await fileOk('source regeneration workspace html', paths.sourceRegenerationWorkspaceHtml, 2048);
if (sourceRegenerationWorkspace?.policy?.doesNotApproveSources !== true) failures.push('source regeneration workspace must not approve sources');
if (sourceRegenerationWorkspace?.policy?.doesNotAcceptThreats !== true) failures.push('source regeneration workspace must not accept threats');
if (sourceRegenerationWorkspace?.policy?.previewOnlyDoesNotCountTowardGate !== true) failures.push('source regeneration workspace must keep preview-only work out of gate');
if (sourceRegenerationWorkspace?.policy?.followsSourceReviewSequencer !== true) failures.push('source regeneration workspace must follow sequencer');
if (sourceRegenerationWorkspace?.policy?.distinctReplacementRequiredBeforeOverwriteIngest !== true) failures.push('source regeneration workspace must require distinct replacement before overwrite ingest');
if (sourceRegenerationWorkspace?.policy?.noOverwriteIngestOutsideDistinctReady !== true) failures.push('source regeneration workspace must block overwrite ingest outside distinct-ready');
if ((sourceRegenerationWorkspace?.target?.id ?? null) !== (sourceReviewSequencer?.summary?.nextTarget ?? null)) failures.push('source regeneration workspace must target sequencer next target');
if ((sourceRegenerationWorkspace?.target?.id ?? null) !== (sourceReviewTargetPacket?.target?.id ?? null)) failures.push('source regeneration workspace must match source review target packet');
if ((sourceRegenerationWorkspace?.target?.lane ?? null) !== (sourceReviewSequencer?.summary?.nextLane ?? null)) failures.push('source regeneration workspace lane must match sequencer next lane');
const sourceRegenerationHealthItem = sourceCriticRegenerationHealthItems.find((item) => item.id === sourceRegenerationWorkspace?.target?.id) ?? null;
if (sourceRegenerationHealthItem) {
  if ((sourceRegenerationWorkspace?.target?.healthStatus ?? null) !== sourceRegenerationHealthItem.status) failures.push('source regeneration workspace health status mismatch');
  if (Boolean(sourceRegenerationWorkspace?.target?.replacementMatchesCurrentSource) !== Boolean(sourceRegenerationHealthItem.replacementMatchesCurrentSource)) failures.push('source regeneration workspace no-op flag mismatch');
  if (Boolean(sourceRegenerationWorkspace?.target?.distinctReplacementReady) !== Boolean(sourceRegenerationHealthItem.distinctReplacementReady)) failures.push('source regeneration workspace distinct-ready flag mismatch');
  if ((sourceRegenerationWorkspace?.target?.source?.sha256 ?? null) !== (sourceRegenerationHealthItem.source?.sha256 ?? null)) failures.push('source regeneration workspace source sha mismatch');
  if ((sourceRegenerationWorkspace?.target?.inbox?.sha256 ?? null) !== (sourceRegenerationHealthItem.inbox?.sha256 ?? null)) failures.push('source regeneration workspace inbox sha mismatch');
}
if (!Array.isArray(sourceRegenerationWorkspace?.target?.commands?.safeNext) || sourceRegenerationWorkspace.target.commands.safeNext.length < 3) failures.push('source regeneration workspace safe commands missing');
if (sourceRegenerationWorkspace?.target?.lane !== 'regenerate-distinct-ready') {
  for (const command of sourceRegenerationWorkspace?.target?.commands?.safeNext ?? []) {
    if (String(command).includes('source:ingest') && String(command).includes('--overwrite')) failures.push('source regeneration workspace must not expose overwrite ingest outside distinct-ready lane');
  }
}
for (const command of sourceRegenerationWorkspace?.target?.commands?.safeNext ?? []) {
  if (!sourceRegenerationWorkspaceMarkdown.includes(command) && !textIncludesHtml(sourceRegenerationWorkspaceHtml, command)) failures.push(`source regeneration workspace rendered outputs missing safe command ${command}`);
}
for (const required of [
  'Water 9 Source Regeneration Workspace',
  'does not approve source art',
  'does not accept threats',
  'does not count preview-only work toward the 20-threat gate',
  'Command Boundary',
  'Source / Inbox Fingerprints',
  'Safe Next Commands',
  'Distinct Replacement Gate',
  'data-source-regeneration-workspace',
  sourceRegenerationWorkspace?.target?.id,
  sourceRegenerationWorkspace?.target?.lane,
  sourceRegenerationWorkspace?.target?.source?.sha256,
  sourceRegenerationWorkspace?.target?.inbox?.sha256,
  sourceRegenerationWorkspace?.target?.commands?.validateInbox,
  sourceRegenerationWorkspace?.target?.commands?.rebuildHealth,
  sourceRegenerationWorkspace?.target?.commands?.rebuildSequencer,
  sourceRegenerationWorkspace?.target?.commands?.rebuildTargetPacket,
]) {
  if (required && !sourceRegenerationWorkspaceMarkdown.includes(String(required)) && !textIncludesHtml(sourceRegenerationWorkspaceHtml, required)) failures.push(`source regeneration workspace rendered outputs missing ${required}`);
}

const sourceReviewQueueItems = Array.isArray(sourceReviewQueue?.reviews) ? sourceReviewQueue.reviews : [];
if (sourceCohesionReview?.schema !== 'water9/source-cohesion-review@1') failures.push(`source cohesion review schema is ${sourceCohesionReview?.schema ?? 'missing'}`);
await fileOk('source cohesion review html', paths.sourceCohesionReviewHtml, 4096);
const sourceCohesionItems = Array.isArray(sourceCohesionReview?.items) ? sourceCohesionReview.items : [];
if (sourceCohesionReview?.policy?.prototypeScreenshotsDoNotCount !== true) failures.push('source cohesion review policy must reject prototype screenshots as acceptance evidence');
if (sourceCohesionReview?.policy?.automationCannotApproveCohesion !== true) failures.push('source cohesion review policy must state automation cannot approve cohesion');
if (sourceCohesionReview?.policy?.acceptedThreatRequiresHumanSourceApproval !== true) failures.push('source cohesion review policy must require human source approval for accepted threats');
if ((sourceCohesionReview?.summary?.candidates ?? -1) !== sourceReviewQueueItems.length) failures.push('source cohesion review candidate count mismatch');
if ((sourceCohesionReview?.summary?.readyForCohesionReview ?? -1) !== sourceCohesionItems.filter((item) => item.readyForCohesionReview && !item.humanCohesionApproved).length) {
  failures.push('source cohesion review ready count mismatch');
}
if ((sourceCohesionReview?.summary?.humanCohesionApproved ?? -1) !== sourceCohesionItems.filter((item) => item.humanCohesionApproved).length) {
  failures.push('source cohesion review approved count mismatch');
}
if ((sourceCohesionReview?.summary?.prototypeLocked ?? -1) !== sourceCohesionItems.filter((item) => !item.humanCohesionApproved).length) {
  failures.push('source cohesion review prototype locked count mismatch');
}
for (const check of [
  'whole-creature-cohesion',
  'part-continuity-cohesion',
  'readable-silhouette',
  'no-collage-artifacts',
  'non-placeholder-art-direction',
  'clean-magenta-key',
  'neutral-riggable-pose',
]) {
  if (!sourceCohesionReview?.requiredCohesionChecks?.some((item) => item.id === check)) failures.push(`source cohesion review missing required check ${check}`);
  if (!textIncludesHtml(sourceCohesionReviewHtml, check)) failures.push(`source cohesion review html missing check ${check}`);
}
for (const item of sourceCohesionItems) {
  const quickReview = sourceReviewQueueItems.find((entry) => entry.id === item.id);
  const approvalItem = sourceApprovalItems.find((entry) => entry.id === item.id);
  if (!quickReview) failures.push(`${item.id}: source cohesion review missing quick review match`);
  if (!approvalItem) failures.push(`${item.id}: source cohesion review missing approval runway match`);
  const evidenceComplete = Boolean(
    item.links?.source
    && item.links?.keyPreview
    && item.links?.sandboxScreenshot
    && item.links?.planPreview
    && quickReview?.evidence?.imageValidationPassed === true
    && quickReview?.evidence?.sourcePreviewPassed === true,
  );
  if (item.evidenceComplete !== evidenceComplete) failures.push(`${item.id}: source cohesion review evidenceComplete mismatch`);
  if (item.readyForCohesionReview !== Boolean(quickReview?.readyForHumanReview && approvalItem?.planPreviewPresent && evidenceComplete)) {
    failures.push(`${item.id}: source cohesion review readiness mismatch`);
  }
  if (item.humanCohesionApproved !== Boolean(approvalItem?.humanApproved || quickReview?.evidence?.humanApproved === true)) {
    failures.push(`${item.id}: source cohesion review human approval mismatch`);
  }
  if (item.productionEligible !== item.humanCohesionApproved) failures.push(`${item.id}: source cohesion production eligibility must mirror human approval`);
  if (!item.humanCohesionApproved && !String(item.reviewBoundary ?? '').includes('Prototype/source preview only')) {
    failures.push(`${item.id}: source cohesion review missing prototype boundary`);
  }
  if (!String(item.commands?.accept ?? '').includes('--source-reviewed')) failures.push(`${item.id}: source cohesion accept command must require --source-reviewed`);
  if (!textIncludesHtml(sourceCohesionReviewHtml, `data-source-cohesion-candidate="${item.id}"`)) failures.push(`${item.id}: source cohesion html missing candidate marker`);
  if (!textIncludesHtml(sourceCohesionReviewHtml, item.commands?.accept)) failures.push(`${item.id}: source cohesion html missing accept command`);
}
for (const expected of [
  'Water 9 Source Cohesion Review',
  'Prototype screenshots do not count toward the strict 20-threat gate',
  'Automation packages evidence; only a human can approve cohesion',
  'npm run source:cohesion-review && npm run source:cohesion-review-check',
]) {
  if (!textIncludesHtml(sourceCohesionReviewHtml, expected)) failures.push(`source cohesion review html missing ${expected}`);
}

if (sourceCohesionDecisions?.schema !== 'water9/source-cohesion-decision-template@1') failures.push(`source cohesion decisions schema is ${sourceCohesionDecisions?.schema ?? 'missing'}`);
await fileOk('source cohesion decisions html', paths.sourceCohesionDecisionsHtml, 4096);
const sourceCohesionDecisionItems = Array.isArray(sourceCohesionDecisions?.decisions) ? sourceCohesionDecisions.decisions : [];
const sourceCohesionDecisionFileItems = Array.isArray(sourceCohesionDecisions?.decisionFileTemplate?.decisions) ? sourceCohesionDecisions.decisionFileTemplate.decisions : [];
if (sourceCohesionDecisions?.decisionFileTemplate?.schema !== 'water9/source-cohesion-decisions@1') failures.push('source cohesion decisions template schema mismatch');
if (sourceCohesionDecisions?.decisionFileTemplate?.policy?.humanAuthored !== true) failures.push('source cohesion decisions template must require human-authored evidence');
if (sourceCohesionDecisionItems.length !== sourceCohesionItems.length) failures.push('source cohesion decisions count mismatch with cohesion review');
if (sourceCohesionDecisionFileItems.length !== sourceCohesionItems.length) failures.push('source cohesion decisionFileTemplate count mismatch with cohesion review');
if ((sourceCohesionDecisions?.summary?.candidates ?? -1) !== sourceCohesionDecisionItems.length) failures.push('source cohesion decisions summary candidate count mismatch');
if ((sourceCohesionDecisions?.summary?.prototypeLocked ?? -1) !== sourceCohesionDecisionItems.filter((item) => !item.humanCohesionApproved).length) {
  failures.push('source cohesion decisions prototype locked count mismatch');
}
const sourceCohesionDecisionById = new Map(sourceCohesionDecisionItems.map((item) => [item.id, item]));
const sourceCohesionDecisionFileById = new Map(sourceCohesionDecisionFileItems.map((item) => [item.id, item]));
for (const item of sourceCohesionItems) {
  const decision = sourceCohesionDecisionById.get(item.id);
  const fileDecision = sourceCohesionDecisionFileById.get(item.id);
  if (!decision) {
    failures.push(`${item.id}: missing from source cohesion decisions`);
    continue;
  }
  if (!fileDecision) failures.push(`${item.id}: missing from source cohesion decisionFileTemplate`);
  if (decision.species !== item.species) failures.push(`${item.id}: source cohesion decision species mismatch`);
  if (decision.readyForCohesionReview !== item.readyForCohesionReview) failures.push(`${item.id}: source cohesion decision readiness mismatch`);
  for (const key of ['source', 'keyPreview', 'sandboxScreenshot', 'planPreview', 'cohesionReview']) {
    if (!decision.evidence?.[key]) failures.push(`${item.id}: source cohesion decisions missing evidence ${key}`);
    if (decision.evidence?.[key] && !textIncludesHtml(sourceCohesionDecisionsHtml, decision.evidence[key])) failures.push(`${item.id}: source cohesion decisions html missing evidence ${key}`);
  }
  if (decision.evidenceFingerprint?.schema !== 'water9/source-cohesion-evidence-fingerprint@1') failures.push(`${item.id}: source cohesion decisions missing evidence fingerprint schema`);
  if (!decision.evidenceFingerprint?.digest) failures.push(`${item.id}: source cohesion decisions missing evidence fingerprint digest`);
  if (fileDecision?.evidenceFingerprint?.digest !== decision.evidenceFingerprint?.digest) failures.push(`${item.id}: source cohesion decisionFileTemplate evidence fingerprint mismatch`);
  for (const key of ['source', 'keyPreview', 'sandboxScreenshot', 'planPreview']) {
    const media = decision.evidenceFingerprint?.files?.[key];
    if (media?.exists !== true) failures.push(`${item.id}: source cohesion evidence fingerprint missing existing ${key}`);
    if (!media?.sha256) failures.push(`${item.id}: source cohesion evidence fingerprint missing sha256 for ${key}`);
    if (!media?.size) failures.push(`${item.id}: source cohesion evidence fingerprint missing size for ${key}`);
  }
  for (const check of item.requiredCohesionChecks ?? []) {
    if (!Object.hasOwn(decision.visualChecks ?? {}, check)) failures.push(`${item.id}: source cohesion decisions missing visual check ${check}`);
    if (!Object.hasOwn(fileDecision?.visualChecks ?? {}, check)) failures.push(`${item.id}: source cohesion decisionFileTemplate missing visual check ${check}`);
  }
  if (fileDecision?.status !== 'needs-review') failures.push(`${item.id}: source cohesion decisionFileTemplate should default to needs-review`);
  if (!textIncludesHtml(sourceCohesionDecisionsHtml, `data-source-cohesion-decision="${item.id}"`)) failures.push(`${item.id}: source cohesion decisions html missing item marker`);
  if (decision.evidenceFingerprint?.digest && !textIncludesHtml(sourceCohesionDecisionsHtml, decision.evidenceFingerprint.digest)) {
    failures.push(`${item.id}: source cohesion decisions html missing evidence fingerprint digest`);
  }
}
for (const expected of [
  'Water 9 Source Cohesion Batch Decisions',
  'This page does not approve content automatically',
  'Evidence Preview',
  'Decision JSON Starter',
  'Batch Decision Workspace',
  'data-decision-workspace',
  'data-decision-output',
  'Download reviewed decision file',
  'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
  'npm run source:cohesion-decisions && npm run source:cohesion-decisions-check',
  'npm run source:cohesion-decisions-apply',
]) {
  if (!textIncludesHtml(sourceCohesionDecisionsHtml, expected)) failures.push(`source cohesion decisions html missing ${expected}`);
}
if (sourceCohesionDecisionRun?.schema !== 'water9/source-cohesion-decision-run@1') failures.push(`source cohesion decision run schema is ${sourceCohesionDecisionRun?.schema ?? 'missing'}`);
if ((sourceCohesionDecisionRun?.decisions ?? -1) !== sourceCohesionDecisionFileItems.length) failures.push('source cohesion decision run count mismatch with decision template');
if ((sourceCohesionDecisionRun?.pending ?? -1) !== sourceCohesionDecisionFileItems.filter((item) => item.status === 'needs-review').length) failures.push('source cohesion decision run pending count mismatch');
if ((sourceCohesionDecisionRun?.approved ?? -1) !== sourceCohesionDecisionFileItems.filter((item) => item.status === 'approved').length) failures.push('source cohesion decision run approved count mismatch');
if ((sourceCohesionDecisionRun?.rejected ?? -1) !== sourceCohesionDecisionFileItems.filter((item) => item.status === 'rejected').length) failures.push('source cohesion decision run rejected count mismatch');
if (!Array.isArray(sourceCohesionDecisionRun?.failures)) failures.push('source cohesion decision run failures must be an array');

if (sourceReviewQueue?.schema !== 'water9/source-quick-review-index@1') failures.push(`source review queue schema is ${sourceReviewQueue?.schema ?? 'missing'}`);
await fileOk('source review queue html', paths.sourceReviewQueueHtml, 4096);
if (sourceReviewQueueItems.length !== readyReviewQueue.length) failures.push(`source review queue length ${sourceReviewQueueItems.length} does not match ready review queue ${readyReviewQueue.length}`);
if ((sourceReviewQueue?.summary?.readyForHumanReview ?? -1) !== expectedReviewReady) failures.push('source review queue readyForHumanReview mismatch');
for (const [index, item] of readyReviewQueue.entries()) {
  const queueItem = sourceReviewQueueItems[index];
  if (!queueItem) continue;
  if (queueItem.rank !== index + 1) failures.push(`${item.id}: visual source review queue rank mismatch`);
  if (queueItem.id !== item.id) failures.push(`${item.id}: visual source review queue id/order mismatch`);
  if (queueItem.readyForHumanReview !== true) failures.push(`${item.id}: visual source review queue item should be readyForHumanReview`);
  if (queueItem.evidence?.imageValidationPassed !== true) failures.push(`${item.id}: visual source review queue image evidence is not passing`);
  if (queueItem.evidence?.sourcePreviewPassed !== true) failures.push(`${item.id}: visual source review queue preview evidence is not passing`);
  for (const expected of [
    item.id,
    item.species,
    queueItem.links?.source,
    queueItem.links?.keyPreview,
    queueItem.links?.sandboxScreenshot,
    queueItem.links?.planPreview,
    queueItem.acceptCommand,
    'Open Review',
    'Accept command',
    'Reject command',
    'image pass',
    'preview pass',
    'plan',
  ]) {
    if (expected && !textIncludesHtml(sourceReviewQueueHtml, expected)) {
      failures.push(`${item.id}: source review queue html missing ${expected}`);
    }
  }
}

if (riggingPackIndex?.schema !== 'water9/rigging-focus-pack-index@1') failures.push(`rigging focus pack index schema is ${riggingPackIndex?.schema ?? 'missing'}`);
await fileOk('rigging focus pack index markdown', paths.riggingPackIndexMarkdown, 128);
const riggingPacks = Array.isArray(riggingPackIndex?.packs) ? riggingPackIndex.packs : [];
if (riggingPacks.length !== sourceImages.length) failures.push(`rigging focus pack count ${riggingPacks.length} does not match source image count ${sourceImages.length}`);
for (const candidate of sourceImages) {
  const entry = riggingPacks.find((pack) => pack.id === candidate.id);
  if (!entry) {
    failures.push(`${candidate.id}: missing from rigging focus pack index`);
    continue;
  }
  const pack = await readJson(`${candidate.id} rigging focus pack`, resolve(`public/review/rigging-packs/${candidate.id}.json`));
  const markdown = await readText(`${candidate.id} rigging focus pack markdown`, resolve(`public/review/rigging-packs/${candidate.id}.md`));
  if (pack?.schema !== 'water9/rigging-focus-pack@1') failures.push(`${candidate.id}: rigging focus pack schema is ${pack?.schema ?? 'missing'}`);
  const expectedSourcePreview = `npm run sandbox:preview -- --id ${candidate.id} --kind source --best --serve --open --visual`;
  const runtimeId = pack?.runtimeCreatureId ?? entry.runtimeCreatureId ?? candidate.riggedCreatureId ?? candidate.id;
  const expectedRuntimePreview = `npm run sandbox:preview -- --id ${runtimeId} --with diver --serve --open --visual`;
  const expectedSandboxVisual = `npm run sandbox:visual -- --ids ${runtimeId} --states idle,lunge,stunned --with diver`;
  for (const [key, expected] of [
    ['sourcePreview', expectedSourcePreview],
    ['runtimePreview', expectedRuntimePreview],
    ['sandboxVisual', expectedSandboxVisual],
  ]) {
    if (pack?.commands?.[key] !== expected) failures.push(`${candidate.id}: rigging focus pack ${key} must be ${expected}`);
    if (!markdown.includes(expected)) failures.push(`${candidate.id}: rigging focus pack markdown missing ${key} command`);
  }
  for (const required of [
    '## Source Review',
    '## Articulation Plan',
    '## Review And Acceptance',
    'Threat visual scores',
  ]) {
    if (!markdown.includes(required)) failures.push(`${candidate.id}: rigging focus pack markdown missing ${required}`);
  }
}

if (researchPack?.schema !== 'water9/research-subagent-pack@1') failures.push(`research pack schema is ${researchPack?.schema ?? 'missing'}`);
await fileOk('research subagent pack html', paths.researchPackHtml, 4096);
const assignments = Array.isArray(researchPack?.assignments) ? researchPack.assignments : [];
if (assignments.length < 3) failures.push(`research pack has only ${assignments.length} assignments`);
const assignedIds = assignments.flatMap((assignment) => assignment.candidates ?? []).map((candidate) => candidate.id);
if (assignedIds.length < minThreats) failures.push(`research pack assigns only ${assignedIds.length}/${minThreats} candidates`);
if (assignedIds.length !== uniqueValues(assignedIds).length) failures.push('research pack has duplicate candidate assignments');
for (const assignment of assignments) {
  const owner = assignment.id ?? 'unknown-research-assignment';
  for (const [key, expected] of [
    ['firstPrompt', 'npm run source:next-prompt -- --id '],
    ['firstSession', 'npm run source:session -- --id '],
    ['firstCapture', 'npm run source:inbox-capture -- --id '],
    ['checkAllInbox', 'npm run source:inbox-check -- --dir tools/source-inbox --strict --ids '],
    ['ingestAllDryRun', 'npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids '],
    ['ingestAllApply', 'npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids '],
  ]) {
    if (!String(assignment.commands?.[key] ?? '').includes(expected)) failures.push(`${owner}: research pack missing ${key} command`);
  }
  if (!String(assignment.commands?.ingestAllDryRun ?? '').includes('--dry-run')) failures.push(`${owner}: research pack ingestAllDryRun is not a dry run`);
  for (const candidate of assignment.candidates ?? []) {
    const candidateOwner = `${owner}:${candidate.id ?? 'unknown-candidate'}`;
    for (const expectedCommand of [
      `npm run source:next-prompt -- --id ${candidate.id}`,
      `npm run source:session -- --id ${candidate.id}`,
      `npm run source:inbox-capture -- --id ${candidate.id} --open`,
      `npm run source:recover-inline -- --id ${candidate.id} --image <saved-image-path> --copy --validate`,
      `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${candidate.id}`,
      `npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids ${candidate.id} --dry-run`,
      `npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids ${candidate.id}`,
      `npm run sandbox:preview -- --id ${candidate.id} --kind source --serve --open --visual`,
    ]) {
      if (!Object.values(candidate.commands ?? {}).includes(expectedCommand)) failures.push(`${candidateOwner}: research pack missing command ${expectedCommand}`);
      if (!textIncludesHtml(researchPackHtml, expectedCommand)) failures.push(`${candidateOwner}: research pack html missing command ${expectedCommand}`);
    }
  }
}
for (const required of [
  'Research Subagent Pack',
  'Lane Source Handoff',
  'Source Handoff',
  'npm run sandbox:preview -- --id <candidate-id> --kind source --serve --open --visual',
]) {
  if (!textIncludesHtml(researchPackHtml, required)) failures.push(`research pack html missing ${required}`);
}
if (researchAudits?.schema !== 'water9/research-subagent-audits-summary@1') failures.push(`research audit schema is ${researchAudits?.schema ?? 'missing'}`);
if ((researchAudits?.missingLanes?.length ?? 0) > 0) failures.push(`research audits missing lanes: ${researchAudits.missingLanes.join(', ')}`);
if ((researchAudits?.missingCandidates?.length ?? 0) > 0) failures.push(`research audits missing candidates: ${researchAudits.missingCandidates.join(', ')}`);
if ((researchAudits?.auditedCandidates?.length ?? 0) < minThreats) failures.push(`research audits cover only ${researchAudits?.auditedCandidates?.length ?? 0}/${minThreats} candidates`);
if (researchDispatch?.schema !== 'water9/research-dispatch-board@1') failures.push(`research dispatch schema is ${researchDispatch?.schema ?? 'missing'}`);
await fileOk('research dispatch html', paths.researchDispatchHtml, 4096);
const dispatches = Array.isArray(researchDispatch?.dispatches) ? researchDispatch.dispatches : [];
if (dispatches.length < minThreats) failures.push(`research dispatch covers only ${dispatches.length}/${minThreats} candidates`);
if ((researchDispatch?.summary?.dispatchPackets ?? -1) !== dispatches.length) failures.push('research dispatch summary packet count mismatch');
if ((researchDispatch?.summary?.assignedToLanes ?? 0) < minThreats) failures.push('research dispatch does not assign all candidates to lanes');
if ((researchDispatch?.summary?.auditedCandidates ?? 0) < minThreats) failures.push('research dispatch does not cover all subagent audits');
const dispatchById = new Map(dispatches.map((item) => [item.id, item]));
for (const candidate of candidates) {
  const dispatch = dispatchById.get(candidate.id);
  if (!dispatch) {
    failures.push(`${candidate.id}: missing from research dispatch board`);
    continue;
  }
  if (!dispatch.packet?.file || !dispatch.packet?.href) failures.push(`${candidate.id}: research dispatch missing packet`);
  if (!String(dispatch.prompt ?? '').includes('water9/subagent-research-audit@1')) failures.push(`${candidate.id}: research dispatch prompt missing output schema`);
  for (const expectedCommand of [
    `npm run sandbox:lab -- --id source-${candidate.id} --with diver`,
    `npm run sandbox:preview -- --id ${candidate.id} --kind source --serve --open --visual`,
    `npm run source:approval-runway:preview -- --id ${candidate.id}`,
  ]) {
    if (!Object.values(dispatch.commands ?? {}).includes(expectedCommand)) failures.push(`${candidate.id}: research dispatch missing command ${expectedCommand}`);
    if (!textIncludesHtml(researchDispatchHtml, expectedCommand)) failures.push(`${candidate.id}: research dispatch html missing command ${expectedCommand}`);
  }
}
for (const required of [
  'Water 9 Research Dispatch Board',
  'Per-candidate subagent packets',
  'npm run research:dispatch',
  'npm run research:dispatch-check',
  'npm run sandbox:lab -- --id abyssal-gulper --with diver',
]) {
  if (!textIncludesHtml(researchDispatchHtml, required)) failures.push(`research dispatch html missing ${required}`);
}
if (researchSourceTrace?.schema !== 'water9/research-source-trace@1') failures.push(`research source trace schema is ${researchSourceTrace?.schema ?? 'missing'}`);
await fileOk('research source trace html', paths.researchSourceTraceHtml, 4096);
const traceRecords = Array.isArray(researchSourceTrace?.records) ? researchSourceTrace.records : [];
const traceById = new Map(traceRecords.map((record) => [record.id, record]));
if ((researchSourceTrace?.summary?.candidates ?? 0) !== candidates.length) failures.push('research source trace candidate count mismatch');
if ((researchSourceTrace?.summary?.queued ?? 0) !== queueCandidates.length) failures.push('research source trace queued count mismatch');
if ((researchSourceTrace?.summary?.sprint ?? 0) !== sprintIds.length) failures.push('research source trace sprint count mismatch');
if ((researchSourceTrace?.summary?.assignedToSubagents ?? 0) < minThreats) failures.push('research source trace does not assign all candidates to subagents');
if ((researchSourceTrace?.summary?.auditedCandidates ?? 0) < minThreats) failures.push('research source trace does not include audits for all candidates');
if ((researchSourceTrace?.summary?.queuedWithAuditGuidance ?? 0) !== queueCandidates.length) failures.push('research source trace queued items are not all carrying audit guidance');
if ((researchSourceTrace?.summary?.queuedPromptAuditHardening ?? 0) !== queueCandidates.length) failures.push('research source trace queued prompt files are not all audit-hardened');
for (const candidate of candidates) {
  const trace = traceById.get(candidate.id);
  if (!trace) {
    failures.push(`${candidate.id}: missing from research source trace`);
    continue;
  }
  if (!trace.lane) failures.push(`${candidate.id}: research source trace missing lane`);
  if (!trace.audited) failures.push(`${candidate.id}: research source trace missing subagent audit`);
}
for (const item of queueCandidates) {
  const trace = traceById.get(item.id);
  if (!trace?.inQueue) failures.push(`${item.id}: research source trace does not mark queue membership`);
  if (!trace?.queueHasAuditGuidance) failures.push(`${item.id}: research source trace missing audit guidance for queued item`);
  if (!trace?.promptHasAuditHardening) failures.push(`${item.id}: research source trace missing prompt audit hardening`);
  if (!trace?.promptHasSourcePoseRules) failures.push(`${item.id}: research source trace missing source pose rules`);
  if (!trace?.promptHasCohesionLock) failures.push(`${item.id}: research source trace missing cohesion lock`);
}
if (!researchSourceTraceHtml.includes('Research Source Trace')) failures.push('research source trace html missing title');
if (!researchSourceTraceHtml.includes('npm run research:source-trace-check')) failures.push('research source trace html missing validation command');

if (contentReadiness?.schema !== 'water9/content-readiness@1') failures.push(`content readiness schema is ${contentReadiness?.schema ?? 'missing'}`);
await fileOk('content readiness html', paths.contentReadinessHtml, 4096);
if ((contentReadiness?.summary?.targetThreats ?? 0) < minThreats) failures.push('content readiness targetThreats is below requirement');
if ((contentReadiness?.summary?.acceptedThreats ?? -1) !== (stageBoard?.summary?.acceptedThreats ?? -2)) failures.push('content readiness acceptedThreats mismatch with stage board');
if (!String(contentReadiness?.summary?.nextBottleneck ?? '').trim()) failures.push('content readiness bottleneck is missing');
if ((contentReadiness?.summary?.sourceMechanicallyReadyForHumanReview ?? -1) !== (sourceApprovalRunway?.summary?.mechanicallyReadyForHumanReview ?? -2)) failures.push('content readiness sourceMechanicallyReadyForHumanReview mismatch with source approval runway');
if ((contentReadiness?.summary?.sourceApprovalReady ?? -1) !== (sourceApprovalRunway?.summary?.readyForHumanReview ?? -2)) failures.push('content readiness sourceApprovalReady mismatch with source approval runway');
if ((contentReadiness?.summary?.sourceCriticRegenerationRequired ?? -1) !== (sourceApprovalRunway?.summary?.criticRegenerationRequired ?? -2)) failures.push('content readiness sourceCriticRegenerationRequired mismatch with source approval runway');
if ((contentReadiness?.summary?.sourceCriticRegenerationQueued ?? -1) !== (sourceCriticRegeneration?.summary?.regenerateCandidates ?? -2)) failures.push('content readiness sourceCriticRegenerationQueued mismatch with critic regeneration queue');
if ((contentReadiness?.summary?.sourceCriticRegenerationRequired ?? 0) > 0 && !String(contentReadiness?.summary?.nextBottleneck ?? '').includes('critic')) failures.push('content readiness bottleneck must mention critic regeneration while critic-blocked sources remain');
if (!Array.isArray(contentReadiness?.sourceCandidates) || contentReadiness.sourceCandidates.length < minThreats) failures.push('content readiness source candidate list is incomplete');
if (!Array.isArray(contentReadiness?.articulatedThreats)) failures.push('content readiness articulated threat list is missing');
if (!contentReadinessHtml.includes('Water 9 Content Readiness Dossier')) failures.push('content readiness html missing title');
if (!contentReadinessHtml.includes('npm run content:gate')) failures.push('content readiness html missing strict gate command');
if (!contentReadinessHtml.includes('Source Candidate Readiness')) failures.push('content readiness html missing source readiness section');
if (!contentReadinessHtml.includes('Articulated Threat Readiness')) failures.push('content readiness html missing threat readiness section');
if (!textIncludesHtml(contentReadinessHtml, 'source approval-ready')) failures.push('content readiness html missing source approval-ready count');
if (!textIncludesHtml(contentReadinessHtml, 'critic regeneration')) failures.push('content readiness html missing critic regeneration count');

if (contentGoalReadiness?.schema !== 'water9/content-goal-readiness@1') failures.push(`content goal readiness schema is ${contentGoalReadiness?.schema ?? 'missing'}`);
await fileOk('content goal readiness markdown', paths.contentGoalReadinessMarkdown, 512);
if ((contentGoalReadiness?.targetThreats ?? 0) < minThreats) failures.push('content goal readiness targetThreats is below requirement');
const goalMilestones = Array.isArray(contentGoalReadiness?.milestones) ? contentGoalReadiness.milestones : [];
for (const id of ['research', 'source-images', 'source-review', 'rigging', 'sandbox', 'acceptance']) {
  if (!goalMilestones.some((item) => item.id === id)) failures.push(`content goal readiness missing milestone ${id}`);
}
const firstIncompleteGoalMilestone = goalMilestones.find((item) => item.complete !== true);
if (contentGoalReadiness?.strictGoalComplete !== !firstIncompleteGoalMilestone) failures.push('content goal readiness strictGoalComplete mismatch');
if (firstIncompleteGoalMilestone && contentGoalReadiness?.nextAction?.stage !== firstIncompleteGoalMilestone.id) {
  failures.push('content goal readiness nextAction does not match first incomplete milestone');
}
if (!Array.isArray(contentGoalReadiness?.nextAction?.commands) || contentGoalReadiness.nextAction.commands.length < 1) failures.push('content goal readiness nextAction commands are missing');
if (contentGoalReadiness?.nextAction?.stage === 'source-images') {
  const commands = contentGoalReadiness.nextAction.commands ?? [];
  if (!commands.some((command) => String(command).includes('source:generate-openai-batch'))) failures.push('content goal readiness source-images nextAction missing source:generate-openai-batch');
  if (!commands.some((command) => String(command).includes('source:inbox-capture') && String(command).includes('--ids'))) failures.push('content goal readiness source-images nextAction missing batch source:inbox-capture --ids');
  if (!commands.some((command) => String(command).includes('source:ingest-batch') && String(command).includes('--dry-run'))) failures.push('content goal readiness source-images nextAction missing batch ingest dry-run');
}
if (contentGoalReadiness?.nextAction?.stage === 'source-review') {
  const commands = contentGoalReadiness.nextAction.commands ?? [];
  for (const expected of [
    'npm run source:critic-regeneration-health',
    'npm run source:critic-regeneration-health-check',
    'npm run source:critic-regeneration-health:serve-smoke',
    'npm run source:review-sequencer',
    'npm run source:review-sequencer-check',
    'npm run source:review-sequencer:serve-smoke',
    'npm run source:regeneration-workspace',
    'npm run source:regeneration-workspace-check',
    'npm run source:regeneration-workspace:serve-smoke',
    'npm run content:review-session',
    'npm run content:review-session-check',
    'npm run content:review-session:serve-smoke',
    'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
  ]) {
    if (!commands.includes(expected)) failures.push(`content goal readiness source-review commands missing ${expected}`);
  }
  if ((sourceCriticRegenerationHealth?.summary?.distinctReplacementReady ?? 0) > 0) {
    if (!commands.some((command) => String(command).includes('source:ingest') && String(command).includes('--overwrite --dry-run'))) {
      failures.push('content goal readiness source-review missing dry-run overwrite while distinct replacement is ready');
    }
  } else if (commands.some((command) => String(command).includes('source:ingest') && String(command).includes('--overwrite'))) {
    failures.push('content goal readiness source-review must not recommend overwrite ingest while no distinct critic replacement is ready');
  }
  for (const command of commands.filter((entry) => String(entry).includes('npm run source:accept'))) {
    if (!String(command).includes('--dry-run')) failures.push('content goal readiness source-review source:accept commands must be dry-run only');
  }
}
for (const required of [
  'Water9 Content Goal Readiness',
  'Strict goal complete',
  'Next stage',
  'Human Approval Boundary',
  'reviewed-only decision exports',
  'critic regeneration',
  'Critic Regeneration Health',
  'Source Review Sequencer',
  'Source Regeneration Workspace',
  'Valid no-op replacements',
  'Replacement matches current source',
  'Workspace page',
  'Next Commands',
  'Milestones',
  'npm run content:goal-readiness-strict',
  'npm run content:gate',
]) {
  if (!contentGoalReadinessMarkdown.includes(required)) failures.push(`content goal readiness markdown missing ${required}`);
}
for (const command of contentGoalReadiness?.nextAction?.commands ?? []) {
  if (!contentGoalReadinessMarkdown.includes(command)) failures.push(`content goal readiness markdown missing next command ${command}`);
}
if ((contentGoalReadiness?.sourceReview?.approvalReady ?? -1) !== sourceApprovalItems.filter((item) => item.readyForHumanReview && !item.humanApproved).length) {
  failures.push('content goal readiness sourceReview approvalReady mismatch with source approval runway');
}
if ((contentGoalReadiness?.sourceReview?.criticRegenerationRequired ?? -1) !== activeCriticRegenerationIds.size) {
  failures.push('content goal readiness sourceReview criticRegenerationRequired mismatch with active critic regeneration lanes');
}
if ((contentGoalReadiness?.sourceReview?.criticRegenerationHealth?.distinctReplacementReady ?? -1) !== (sourceCriticRegenerationHealth?.summary?.distinctReplacementReady ?? -2)) {
  failures.push('content goal readiness sourceReview criticRegenerationHealth distinctReplacementReady mismatch');
}
if ((contentGoalReadiness?.sourceReview?.criticRegenerationHealth?.validNoopReplacements ?? -1) !== (sourceCriticRegenerationHealth?.summary?.validNoopReplacements ?? -2)) {
  failures.push('content goal readiness sourceReview criticRegenerationHealth validNoopReplacements mismatch');
}
if ((contentGoalReadiness?.sourceReview?.criticRegenerationHealth?.missingReplacements ?? -1) !== (sourceCriticRegenerationHealth?.summary?.missingReplacements ?? -2)) {
  failures.push('content goal readiness sourceReview criticRegenerationHealth missingReplacements mismatch');
}
if ((contentGoalReadiness?.sourceReview?.criticRegenerationHealth?.invalidReplacements ?? -1) !== (sourceCriticRegenerationHealth?.summary?.invalidReplacements ?? -2)) {
  failures.push('content goal readiness sourceReview criticRegenerationHealth invalidReplacements mismatch');
}
if ((contentGoalReadiness?.sourceReview?.criticRegenerationHealth?.nextActionStatus ?? null) !== (sourceCriticRegenerationHealth?.summary?.nextActionStatus ?? null)) {
  failures.push('content goal readiness sourceReview criticRegenerationHealth nextActionStatus mismatch');
}
if ((contentGoalReadiness?.sourceReview?.sequencer?.nextLane ?? null) !== (sourceReviewSequencer?.summary?.nextLane ?? null)) {
  failures.push('content goal readiness sourceReview sequencer nextLane mismatch');
}
if ((contentGoalReadiness?.sourceReview?.sequencer?.nextTarget ?? null) !== (sourceReviewSequencer?.summary?.nextTarget ?? null)) {
  failures.push('content goal readiness sourceReview sequencer nextTarget mismatch');
}
if ((contentGoalReadiness?.sourceReview?.sequencer?.approvalReady ?? null) !== (sourceReviewSequencer?.summary?.approvalReady ?? null)) {
  failures.push('content goal readiness sourceReview sequencer approvalReady mismatch');
}
if ((contentGoalReadiness?.sourceReview?.sequencer?.criticRegenerationRequired ?? null) !== (sourceReviewSequencer?.summary?.criticRegenerationRequired ?? null)) {
  failures.push('content goal readiness sourceReview sequencer criticRegenerationRequired mismatch');
}
if ((contentGoalReadiness?.sourceReview?.sequencer?.validNoopReplacements ?? null) !== (sourceReviewSequencer?.summary?.validNoopReplacements ?? null)) {
  failures.push('content goal readiness sourceReview sequencer validNoopReplacements mismatch');
}
if ((contentGoalReadiness?.sourceReview?.sequencer?.missingReplacements ?? null) !== (sourceReviewSequencer?.summary?.missingReplacements ?? null)) {
  failures.push('content goal readiness sourceReview sequencer missingReplacements mismatch');
}
if ((contentGoalReadiness?.sourceReview?.regenerationWorkspace?.target ?? null) !== (sourceRegenerationWorkspace?.target?.id ?? null)) {
  failures.push('content goal readiness sourceReview regenerationWorkspace target mismatch');
}
if ((contentGoalReadiness?.sourceReview?.regenerationWorkspace?.lane ?? null) !== (sourceRegenerationWorkspace?.target?.lane ?? null)) {
  failures.push('content goal readiness sourceReview regenerationWorkspace lane mismatch');
}
if ((contentGoalReadiness?.sourceReview?.regenerationWorkspace?.healthStatus ?? null) !== (sourceRegenerationWorkspace?.target?.healthStatus ?? null)) {
  failures.push('content goal readiness sourceReview regenerationWorkspace healthStatus mismatch');
}
if (Boolean(contentGoalReadiness?.sourceReview?.regenerationWorkspace?.replacementMatchesCurrentSource) !== Boolean(sourceRegenerationWorkspace?.target?.replacementMatchesCurrentSource)) {
  failures.push('content goal readiness sourceReview regenerationWorkspace no-op flag mismatch');
}
if (Boolean(contentGoalReadiness?.sourceReview?.regenerationWorkspace?.distinctReplacementReady) !== Boolean(sourceRegenerationWorkspace?.target?.distinctReplacementReady)) {
  failures.push('content goal readiness sourceReview regenerationWorkspace distinct-ready flag mismatch');
}
if ((contentGoalReadiness?.sourceReview?.regenerationWorkspace?.sourceSha256 ?? null) !== (sourceRegenerationWorkspace?.target?.source?.sha256 ?? null)) {
  failures.push('content goal readiness sourceReview regenerationWorkspace sourceSha256 mismatch');
}
if ((contentGoalReadiness?.sourceReview?.regenerationWorkspace?.inboxSha256 ?? null) !== (sourceRegenerationWorkspace?.target?.inbox?.sha256 ?? null)) {
  failures.push('content goal readiness sourceReview regenerationWorkspace inboxSha256 mismatch');
}
if ((contentGoalReadiness?.readyReviewQueue ?? []).length !== sourceApprovalItems.filter((item) => item.readyForHumanReview && !item.humanApproved).length) {
  failures.push('content goal readiness readyReviewQueue length mismatch with source approval runway');
}
if (contentGoalReadiness?.strictGoalComplete === true && (contentReadiness?.summary?.acceptedThreats ?? 0) < minThreats) {
  failures.push('content goal readiness cannot be complete while accepted threats are below target');
}

if (contentGoalAudit?.schema !== 'water9/content-goal-audit@1') failures.push(`content goal audit schema is ${contentGoalAudit?.schema ?? 'missing'}`);
await fileOk('content goal audit markdown', paths.contentGoalAuditMarkdown, 1024);
await fileOk('content goal audit html', paths.contentGoalAuditHtml, 2048);
if ((contentGoalAudit?.summary?.targetThreats ?? 0) < minThreats) failures.push('content goal audit targetThreats is below requirement');
if ((contentGoalAudit?.summary?.acceptedThreats ?? -1) !== (contentReadiness?.summary?.acceptedThreats ?? -2)) failures.push('content goal audit acceptedThreats mismatch with content readiness');
if (contentGoalAudit?.strictGoalComplete !== contentGoalReadiness?.strictGoalComplete) failures.push('content goal audit strictGoalComplete mismatch with goal readiness');
if (contentGoalAudit?.complete === true && ((contentGoalAudit?.summary?.acceptedThreats ?? 0) < minThreats || contentGoalAudit?.strictGoalComplete !== true)) {
  failures.push('content goal audit must not report complete before strict gate evidence is complete');
}
const goalAuditRequirements = Array.isArray(contentGoalAudit?.requirements) ? contentGoalAudit.requirements : [];
const goalAuditById = new Map(goalAuditRequirements.map((item) => [item.id, item]));
for (const id of ['quick-sandbox-preview', 'subagent-research', 'imagen-magenta-source', 'magenta-to-articulation', 'visual-rejection-regeneration', 'rigorous-20-threat-gate']) {
  if (!goalAuditById.has(id)) failures.push(`content goal audit missing requirement ${id}`);
}
if (goalAuditById.get('quick-sandbox-preview')?.status !== 'passed') failures.push('content goal audit quick sandbox preview requirement should pass');
if (goalAuditById.get('subagent-research')?.status !== 'passed') failures.push('content goal audit subagent research requirement should pass');
if ((contentGoalAudit?.summary?.sourceCriticRegenerationRequired ?? 0) > 0 && goalAuditById.get('imagen-magenta-source')?.status === 'passed') {
  failures.push('content goal audit imagen/magenta requirement must not pass while critic regeneration is required');
}
if ((contentGoalAudit?.summary?.acceptedThreats ?? 0) < minThreats && goalAuditById.get('rigorous-20-threat-gate')?.status !== 'incomplete') {
  failures.push('content goal audit rigorous gate requirement must be incomplete while accepted threats are below target');
}
if ((contentGoalAudit?.summary?.visualFeedbackItems ?? -1) !== (contentVisualFeedbackLedger?.items ?? []).length) failures.push('content goal audit visualFeedbackItems mismatch');
if ((contentGoalAudit?.summary?.visualRegenerationItems ?? -1) !== (contentVisualRegenerationQueue?.items ?? []).length) failures.push('content goal audit visualRegenerationItems mismatch');
if ((contentGoalAudit?.summary?.visualRegenerationGateCredit ?? -1) !== (contentVisualRegenerationQueue?.summary?.countsTowardStrictGate ?? 0)) failures.push('content goal audit visualRegenerationGateCredit mismatch');
if ((contentGoalAudit?.summary?.visualRegenerationGateCredit ?? 0) !== 0) failures.push('content goal audit visual regeneration must have zero strict gate credit');
for (const required of [
  'Water 9 Content Goal Audit',
  'Passing preview checks or mechanical image checks is not content acceptance',
  'Quick sandbox preview for any entity',
  'Subagent research coverage for underwater fauna and flora',
  'Imagen/OpenAI source generation and magenta-key intake',
  'Magenta extraction into articulated in-game entities',
  'Rejected preview art is quarantined and routed to regeneration',
  '20 new underwater threats pass rigorous quality gate',
  'Do not mark the goal complete',
  'regeneration strict gate credit',
  'npm run content:goal-readiness-strict',
]) {
  if (!contentGoalAuditMarkdown.includes(required) && !textIncludesHtml(contentGoalAuditHtml, required)) failures.push(`content goal audit outputs missing ${required}`);
}
if (!contentGoalAuditHtml.includes('data-content-goal-audit')) failures.push('content goal audit html missing data-content-goal-audit marker');

if (contentQualityGateMatrix?.schema !== 'water9/content-quality-gate-matrix@1') failures.push(`content quality gate matrix schema is ${contentQualityGateMatrix?.schema ?? 'missing'}`);
await fileOk('content quality gate matrix markdown', paths.contentQualityGateMatrixMarkdown, 1024);
await fileOk('content quality gate matrix html', paths.contentQualityGateMatrixHtml, 4096);
if (contentQualityGateMatrix?.policy?.humanSourceApprovalRequired !== true) failures.push('content quality gate matrix must require human source approval');
if (contentQualityGateMatrix?.policy?.humanThreatAcceptanceRequired !== true) failures.push('content quality gate matrix must require human threat acceptance');
if (contentQualityGateMatrix?.policy?.previewOnlyEvidenceCannotCountTowardStrictGate !== true) failures.push('content quality gate matrix must prevent preview-only strict gate credit');
if (contentQualityGateMatrix?.policy?.automationCannotApproveContent !== true) failures.push('content quality gate matrix must state automation cannot approve content');
const qualityGateRows = Array.isArray(contentQualityGateMatrix?.rows) ? contentQualityGateMatrix.rows : [];
const qualityGateSignoffItems = Array.isArray(humanSignoff?.items) ? humanSignoff.items : [];
const qualityGateSessionItems = Array.isArray(contentReviewSession?.items) ? contentReviewSession.items : [];
const qualityGateSignoffById = new Map(qualityGateSignoffItems.map((item) => [item.id, item]));
const qualityGateSessionById = new Map(qualityGateSessionItems.map((item) => [item.id, item]));
const qualityGateSourceApprovalNextId = typeof sourceApprovalSession?.nextTarget === 'string'
  ? sourceApprovalSession.nextTarget
  : sourceApprovalSession?.nextTarget?.id;
if (qualityGateRows.length < minThreats) failures.push('content quality gate matrix must include at least 20 rows');
if (qualityGateRows.length !== qualityGateSignoffItems.length) failures.push('content quality gate matrix row count must match sign-off queue');
if ((contentQualityGateMatrix?.summary?.rows ?? -1) !== qualityGateRows.length) failures.push('content quality gate matrix summary rows mismatch');
if ((contentQualityGateMatrix?.summary?.targetThreats ?? -1) !== (humanSignoff?.summary?.targetThreats ?? minThreats)) failures.push('content quality gate matrix targetThreats mismatch');
if ((contentQualityGateMatrix?.summary?.acceptedThreats ?? -1) !== (humanSignoff?.summary?.acceptedThreats ?? 0)) failures.push('content quality gate matrix acceptedThreats mismatch');
if ((contentQualityGateMatrix?.summary?.sourceEvidenceComplete ?? -1) !== qualityGateRows.filter((row) => row.sourceEvidenceComplete).length) failures.push('content quality gate matrix sourceEvidenceComplete mismatch');
if ((contentQualityGateMatrix?.summary?.runtimeEvidenceComplete ?? -1) !== qualityGateRows.filter((row) => row.runtimeEvidenceComplete).length) failures.push('content quality gate matrix runtimeEvidenceComplete mismatch');
if ((contentQualityGateMatrix?.summary?.allEvidenceComplete ?? -1) !== qualityGateRows.filter((row) => row.allEvidenceComplete).length) failures.push('content quality gate matrix allEvidenceComplete mismatch');
if ((contentQualityGateMatrix?.summary?.sourceApproved ?? -1) !== qualityGateRows.filter((row) => row.sourceApproved).length) failures.push('content quality gate matrix sourceApproved mismatch');
if ((contentQualityGateMatrix?.summary?.threatAccepted ?? -1) !== qualityGateRows.filter((row) => row.threatAccepted).length) failures.push('content quality gate matrix threatAccepted mismatch');
if ((contentQualityGateMatrix?.summary?.strictGateEligible ?? -1) !== qualityGateRows.filter((row) => row.strictGateEligible).length) failures.push('content quality gate matrix strictGateEligible mismatch');
for (const row of qualityGateRows) {
  const signoffItem = qualityGateSignoffById.get(row.id);
  const sessionItem = qualityGateSessionById.get(row.id);
  if (!signoffItem) failures.push(`${row.id}: content quality gate row missing sign-off item`);
  if (!sessionItem) failures.push(`${row.id}: content quality gate row missing review session item`);
  if (signoffItem && row.species !== signoffItem.species) failures.push(`${row.id}: content quality gate species mismatch`);
  if (row.sourceApproved !== Boolean(signoffItem?.sourceApproved)) failures.push(`${row.id}: content quality gate sourceApproved mismatch`);
  if (row.threatAccepted !== Boolean(signoffItem?.threatAccepted)) failures.push(`${row.id}: content quality gate threatAccepted mismatch`);
  if (row.countsTowardGate !== Boolean(signoffItem?.countsTowardGate)) failures.push(`${row.id}: content quality gate countsTowardGate mismatch`);
  if (row.strictGateEligible !== (row.sourceApproved && row.threatAccepted && row.countsTowardGate)) failures.push(`${row.id}: content quality gate strictGateEligible must require source approval and threat acceptance`);
  if (!row.sourceApproved && !row.sourceCriticRegenerationRequired && row.nextGate !== 'human-source-approval') failures.push(`${row.id}: content quality gate nextGate should require human source approval`);
  if (!row.sourceEvidenceComplete) failures.push(`${row.id}: content quality gate source evidence should be complete before human review`);
  if (!row.runtimeEvidenceComplete) failures.push(`${row.id}: content quality gate runtime evidence should be complete before human review`);
  if (row.sourcePreviewBoundary?.schema !== 'water9/sandbox-production-boundary@1') failures.push(`${row.id}: content quality gate source preview boundary missing`);
  if (row.runtimePreviewBoundary?.schema !== 'water9/sandbox-production-boundary@1') failures.push(`${row.id}: content quality gate runtime preview boundary missing`);
  if (!String(row.commands?.sourceApprovalDryRun ?? '').includes(`npm run source:accept -- --id ${row.id}`) || !String(row.commands?.sourceApprovalDryRun ?? '').includes('--dry-run')) failures.push(`${row.id}: content quality gate source approval dry-run missing`);
  if (!String(row.commands?.threatAcceptanceDryRun ?? '').includes(`npm run content:accept -- --id ${row.id}`) || !String(row.commands?.threatAcceptanceDryRun ?? '').includes('--dry-run')) failures.push(`${row.id}: content quality gate threat acceptance dry-run missing`);
}
for (const required of [
  'Water 9 Quality Gate Matrix',
  'This matrix is a human-review execution surface',
  'does not approve source art',
  'does not accept threats',
  'preview-only evidence',
  'Strict gate eligible',
  'human-source-approval',
  'data-content-quality-gate-matrix',
  'data-strict-goal-complete',
  'data-accepted-threats',
]) {
  if (!contentQualityGateMatrixMarkdown.includes(required) && !textIncludesHtml(contentQualityGateMatrixHtml, required)) failures.push(`content quality gate matrix outputs missing ${required}`);
}

if (contentQualityGateNext?.schema !== 'water9/content-quality-gate-next@1') failures.push(`content quality gate next schema is ${contentQualityGateNext?.schema ?? 'missing'}`);
await fileOk('content quality gate next markdown', paths.contentQualityGateNextMarkdown, 1024);
await fileOk('content quality gate next html', paths.contentQualityGateNextHtml, 4096);
if (contentQualityGateNext?.policy?.focusedPacketDoesNotApprove !== true) failures.push('content quality gate next must state it does not approve content');
if (contentQualityGateNext?.policy?.humanSourceApprovalRequired !== true) failures.push('content quality gate next must require human source approval');
if (contentQualityGateNext?.policy?.humanThreatAcceptanceRequired !== true) failures.push('content quality gate next must require human threat acceptance');
if (contentQualityGateNext?.policy?.blockedPrototypesCannotCountTowardStrictGate !== true) failures.push('content quality gate next must prevent blocked prototypes from strict gate credit');
const expectedQualityGateNextFromApprovalSession = qualityGateRows.find((row) => row.id === qualityGateSourceApprovalNextId && row.nextGate !== 'accepted');
const expectedQualityGateNext = expectedQualityGateNextFromApprovalSession
  ?? qualityGateRows.find((row) => row.nextGate !== 'accepted' && row.sourceEvidenceComplete && row.runtimeEvidenceComplete)
  ?? qualityGateRows.find((row) => row.nextGate !== 'accepted')
  ?? qualityGateRows[0];
const qualityGateNextTarget = contentQualityGateNext?.target;
if (!qualityGateNextTarget) failures.push('content quality gate next missing target');
if (expectedQualityGateNext && qualityGateNextTarget?.id !== expectedQualityGateNext.id) {
  failures.push(`content quality gate next target ${qualityGateNextTarget?.id ?? 'missing'} does not match expected ${expectedQualityGateNext.id}`);
}
if (expectedQualityGateNextFromApprovalSession && contentQualityGateNext?.selection?.strategy !== 'source-approval-session-next-target') {
  failures.push('content quality gate next must follow source approval session target when available');
}
if (qualityGateSourceApprovalNextId && contentQualityGateNext?.selection?.sourceApprovalSessionNextTarget !== qualityGateSourceApprovalNextId) {
  failures.push('content quality gate next selection must record source approval session target');
}
if (!Array.isArray(contentQualityGateNext?.evidence) || contentQualityGateNext.evidence.length < 10) failures.push('content quality gate next must include at least 10 evidence entries');
for (const label of ['source art', 'magenta key preview', 'source sandbox preview', 'articulation plan preview', 'source parity overlay', 'contact sheet', 'phase strip', 'sandbox idle', 'sandbox lunge', 'sandbox stunned']) {
  const evidence = contentQualityGateNext?.evidence?.find((entry) => entry.label === label);
  if (!evidence?.url) failures.push(`content quality gate next missing evidence ${label}`);
}
if (!String(qualityGateNextTarget?.commands?.sourceApprovalDryRun ?? '').includes('--dry-run')) failures.push('content quality gate next source approval command must be dry-run');
if (!String(qualityGateNextTarget?.commands?.threatAcceptanceDryRun ?? '').includes('--dry-run')) failures.push('content quality gate next threat acceptance command must be dry-run');
const qualityGateNextVisualBlockers = Array.isArray(contentQualityGateNext?.globalVisualBlockers) ? contentQualityGateNext.globalVisualBlockers : [];
const qualityGateOpenBlockingVisualFeedback = (contentVisualFeedbackLedger?.items ?? []).filter((item) => item.open && item.severity === 'blocking');
if (qualityGateNextVisualBlockers.length !== qualityGateOpenBlockingVisualFeedback.length) {
  failures.push('content quality gate next visual blocker count must match open blocking feedback');
}
for (const item of qualityGateOpenBlockingVisualFeedback) {
  const packetItem = qualityGateNextVisualBlockers.find((blocker) => blocker.targetId === item.targetId);
  const regenerationItem = (contentVisualRegenerationQueue?.items ?? []).find((blocker) => blocker.targetId === item.targetId);
  if (!packetItem) {
    failures.push(`content quality gate next missing visual blocker ${item.targetId}`);
    continue;
  }
  if (packetItem.status !== item.status) failures.push(`${item.targetId}: content quality gate next visual blocker status mismatch`);
  if (packetItem.severity !== item.severity) failures.push(`${item.targetId}: content quality gate next visual blocker severity mismatch`);
  if (packetItem.countsTowardStrictGate !== false) failures.push(`${item.targetId}: content quality gate next visual blocker must not count toward strict gate`);
  if (packetItem.targetGateCandidate !== false) failures.push(`${item.targetId}: content quality gate next visual blocker must not be a target gate candidate`);
  if (regenerationItem && packetItem.regenerationPromptFile !== regenerationItem.promptFile) failures.push(`${item.targetId}: content quality gate next visual blocker regeneration prompt mismatch`);
}
for (const required of [
  'Water 9 Next Quality Gate Review',
  'This focused packet does not approve source art or accept a threat',
  'Human review and strict apply gates remain required',
  'Global Visual Blockers',
  'Rejected prototype work stays visible',
  'data-content-quality-gate-next',
  'data-quality-gate-next-target',
  'data-next-gate',
  'source art',
  'sandbox lunge',
  'npm run content:quality-gate-next',
  'npm run content:quality-gate-next-check',
]) {
  if (!contentQualityGateNextMarkdown.includes(required) && !textIncludesHtml(contentQualityGateNextHtml, required)) failures.push(`content quality gate next outputs missing ${required}`);
}
for (const item of qualityGateNextVisualBlockers) {
  for (const required of [item.targetId, item.status, item.severity]) {
    if (!contentQualityGateNextMarkdown.includes(required) && !textIncludesHtml(contentQualityGateNextHtml, required)) failures.push(`content quality gate next outputs missing visual blocker detail ${required}`);
  }
}
if (qualityGateNextTarget) {
  for (const required of [
    qualityGateNextTarget.id,
    qualityGateNextTarget.species,
    qualityGateNextTarget.nextGate,
    `data-quality-gate-next-target="${qualityGateNextTarget.id}"`,
  ]) {
    if (!contentQualityGateNextMarkdown.includes(required) && !textIncludesHtml(contentQualityGateNextHtml, required)) failures.push(`content quality gate next outputs missing target detail ${required}`);
  }
}

if (runtimeCohesionReview?.schema !== 'water9/content-runtime-cohesion-review@1') failures.push(`runtime cohesion review schema is ${runtimeCohesionReview?.schema ?? 'missing'}`);
await fileOk('runtime cohesion review markdown', paths.runtimeCohesionReviewMarkdown, 1024);
await fileOk('runtime cohesion review html', paths.runtimeCohesionReviewHtml, 4096);
if (runtimeCohesionReview?.policy?.humanReviewerRequired !== true) failures.push('runtime cohesion review must require human reviewer');
if (runtimeCohesionReview?.policy?.automationCannotApprove !== true) failures.push('runtime cohesion review must state automation cannot approve');
if (runtimeCohesionReview?.policy?.inGameAssemblyEvidenceRequired !== true) failures.push('runtime cohesion review must require in-game assembly evidence');
if (runtimeCohesionReview?.policy?.screenshotAloneIsNotCapabilityProof !== true) failures.push('runtime cohesion review must reject screenshot-only proof');
if (runtimeCohesionReview?.target?.id !== qualityGateNextTarget?.id) failures.push('runtime cohesion target must match quality gate next target');
if (runtimeCohesionReview?.target?.species !== qualityGateNextTarget?.species) failures.push('runtime cohesion species must match quality gate next target');
if (runtimeCohesionReview?.target?.nextGate !== qualityGateNextTarget?.nextGate) failures.push('runtime cohesion nextGate must match quality gate next target');
for (const label of ['source art', 'magenta key preview', 'source sandbox preview', 'articulation plan preview', 'source parity overlay', 'contact sheet', 'phase strip', 'sandbox idle', 'sandbox lunge', 'sandbox stunned']) {
  const media = runtimeCohesionReview?.media?.find((entry) => entry.label === label);
  if (!media?.url || media.present !== true) failures.push(`runtime cohesion review missing present media ${label}`);
}
for (const check of ['single-source-cohesion', 'readable-silhouette', 'anatomy-cohesion', 'production-visual-cohesion', 'socket-seams', 'motion-stability', 'sandbox-behavior']) {
  if (!(runtimeCohesionReview?.requiredChecks ?? []).includes(check)) failures.push(`runtime cohesion review missing required check ${check}`);
  if (!runtimeCohesionReview?.decisionFile?.decisions?.[0]?.visualChecks?.[check]) failures.push(`runtime cohesion review decision missing check ${check}`);
}
if (runtimeCohesionReview?.decisionFile?.schema !== 'water9/content-threat-acceptance-decisions@1') failures.push('runtime cohesion review decision file schema mismatch');
if (runtimeCohesionReview?.decisionFile?.policy?.humanAuthored !== true) failures.push('runtime cohesion review decision file must require human authoring');
if (runtimeCohesionReview?.decisionFile?.decisions?.[0]?.status !== 'needs-review') failures.push('runtime cohesion review decision must default needs-review');
if (!runtimeCohesionReview?.decisionFile?.decisions?.[0]?.evidenceFingerprint?.digest) failures.push('runtime cohesion review decision missing evidence digest');
if (!String(runtimeCohesionReview?.commands?.strictDryRun ?? '').includes('water9-threat-acceptance-reviewed-decisions.json')) failures.push('runtime cohesion review strict dry-run must use reviewed-only decisions');
for (const expected of [
  'Water 9 Runtime Cohesion Review',
  'This page does not approve content automatically',
  'not capability proof',
  'data-runtime-cohesion-review',
  'data-runtime-cohesion-decision-json',
  '"schema": "water9/content-threat-acceptance-decisions@1"',
  '"status": "needs-review"',
  'production-visual-cohesion',
  'sandbox-behavior',
]) {
  if (!runtimeCohesionReviewMarkdown.includes(expected) && !textIncludesHtml(runtimeCohesionReviewHtml, expected)) failures.push(`runtime cohesion review outputs missing ${expected}`);
}

if (contentSubagentAuditLedger?.schema !== 'water9/content-subagent-audit-ledger@1') failures.push(`content subagent audit ledger schema is ${contentSubagentAuditLedger?.schema ?? 'missing'}`);
await fileOk('content subagent audit ledger markdown', paths.contentSubagentAuditLedgerMarkdown, 1024);
await fileOk('content subagent audit ledger html', paths.contentSubagentAuditLedgerHtml, 2048);
if (contentSubagentAuditLedger?.policy?.independentAuditsDoNotApproveContent !== true) failures.push('content subagent audit ledger must state independent audits do not approve content');
if (contentSubagentAuditLedger?.policy?.humanSourceApprovalStillRequired !== true) failures.push('content subagent audit ledger must preserve human source approval requirement');
if (contentSubagentAuditLedger?.policy?.strictThreatAcceptanceStillRequired !== true) failures.push('content subagent audit ledger must preserve strict threat acceptance requirement');
const subagentAudits = Array.isArray(contentSubagentAuditLedger?.audits) ? contentSubagentAuditLedger.audits : [];
if (subagentAudits.length < 3) failures.push('content subagent audit ledger must include at least three independent audit records');
if ((contentSubagentAuditLedger?.summary?.completedAudits ?? -1) !== subagentAudits.filter((audit) => audit.status === 'completed').length) {
  failures.push('content subagent audit ledger completed audit summary mismatch');
}
for (const scope of ['sandbox-preview-infrastructure', 'research-source-trace', 'source-approval-session-workflow']) {
  if (!subagentAudits.some((audit) => audit.scope === scope)) failures.push(`content subagent audit ledger missing scope ${scope}`);
  if (!contentSubagentAuditLedger?.summary?.scopes?.includes(scope)) failures.push(`content subagent audit ledger summary missing scope ${scope}`);
}
for (const audit of subagentAudits) {
  if (!String(audit.agentId ?? '').match(/^019/)) failures.push(`${audit.id ?? 'content subagent audit'} missing concrete subagent id`);
  if (audit.repoAnchor !== '/mnt/nxt-dev/water9') failures.push(`${audit.id ?? 'content subagent audit'} repo anchor mismatch`);
  if (audit.editsMadeByAgent !== false) failures.push(`${audit.id ?? 'content subagent audit'} must record no direct edits by explorer subagent`);
}
if ((contentSubagentAuditLedger?.currentEvidence?.pairedVisualChecked ?? 0) < minThreats * 2) failures.push('content subagent audit ledger must include paired runtime/source visual coverage');
if ((contentSubagentAuditLedger?.currentEvidence?.pairedVisualFailures ?? -1) !== 0) failures.push('content subagent audit ledger paired visual failures must be zero');
if ((contentSubagentAuditLedger?.currentEvidence?.researchAuditedCandidates ?? 0) < minThreats) failures.push('content subagent audit ledger must include audited research coverage for 20 threats');
if (contentSubagentAuditLedger?.currentEvidence?.strictGoalComplete !== contentGoalReadiness?.strictGoalComplete) failures.push('content subagent audit ledger strictGoalComplete mismatch with goal readiness');
for (const required of [
  'Water 9 Subagent Audit Ledger',
  'These audits do not approve source art',
  'sandbox-preview-infrastructure',
  'research-source-trace',
  'source-approval-session-workflow',
  'paired visual checked',
  'human-approved sources',
]) {
  if (!contentSubagentAuditLedgerMarkdown.includes(required) && !textIncludesHtml(contentSubagentAuditLedgerHtml, required)) failures.push(`content subagent audit ledger outputs missing ${required}`);
}
if (!contentSubagentAuditLedgerHtml.includes('data-content-subagent-audit-ledger')) failures.push('content subagent audit ledger html missing data-content-subagent-audit-ledger marker');

if (contentVisualFeedbackLedger?.schema !== 'water9/content-visual-feedback-ledger@1') failures.push(`content visual feedback ledger schema is ${contentVisualFeedbackLedger?.schema ?? 'missing'}`);
await fileOk('content visual feedback ledger markdown', paths.contentVisualFeedbackLedgerMarkdown, 1024);
await fileOk('content visual feedback ledger html', paths.contentVisualFeedbackLedgerHtml, 2048);
if (contentVisualFeedbackLedger?.policy?.visualFeedbackCanBlockPrototypePromotion !== true) failures.push('content visual feedback ledger must allow visual feedback to block prototype promotion');
if (contentVisualFeedbackLedger?.policy?.blockedPrototypeCannotCountTowardStrictGate !== true) failures.push('content visual feedback ledger must prevent blocked prototypes from counting toward strict gate');
if (contentVisualFeedbackLedger?.policy?.prototypeScreenshotIsNotCapabilityProof !== true) failures.push('content visual feedback ledger must state prototype screenshots are not capability proof');
if (contentVisualFeedbackLedger?.policy?.mechanicalRigPrototypeIsNotArtDirection !== true) failures.push('content visual feedback ledger must separate mechanical rig prototypes from art direction');
if (contentVisualFeedbackLedger?.policy?.cohesionFailureRequiresNewSource !== true) failures.push('content visual feedback ledger must require new source work for cohesion failures');
const visualFeedbackItems = Array.isArray(contentVisualFeedbackLedger?.items) ? contentVisualFeedbackLedger.items : [];
const serpentFeedback = visualFeedbackItems.find((item) => item.targetId === 'abyssal-serpent');
if (!serpentFeedback) {
  failures.push('content visual feedback ledger must record the abyssal-serpent cohesion rejection');
} else {
  if (serpentFeedback.status !== 'rejected-needs-cohesion-regeneration') failures.push('abyssal-serpent feedback status must require cohesion regeneration');
  if (serpentFeedback.severity !== 'blocking') failures.push('abyssal-serpent feedback severity must be blocking');
  if (serpentFeedback.sandboxRegistered !== true) failures.push('abyssal-serpent feedback must link to sandbox entry');
  if (serpentFeedback.sandboxPreviewOnly !== true) failures.push('abyssal-serpent feedback must preserve preview-only sandbox boundary');
  if (serpentFeedback.runtimePrototype !== true) failures.push('abyssal-serpent feedback must identify runtime prototype status');
  if (serpentFeedback.targetGateCandidate !== false) failures.push('abyssal-serpent feedback must remain outside target gate candidates');
  if (serpentFeedback.countsTowardStrictGate !== false) failures.push('abyssal-serpent feedback must not count toward strict gate');
  if (!String(serpentFeedback.summary ?? '').includes('mechanical rig proof-of-concept')) failures.push('abyssal-serpent feedback must identify the preview as mechanical proof-of-concept only');
  if (!String(serpentFeedback.requiredAction ?? '').includes('one organism before rigging quality is evaluated')) failures.push('abyssal-serpent feedback must require organism-level proof before rigging review');
  if (!(serpentFeedback.notes ?? []).some((note) => String(note).includes('Do not salvage this by only tuning sockets'))) failures.push('abyssal-serpent feedback must forbid socket-only salvage');
  for (const check of ['whole-creature-cohesion', 'part-continuity-cohesion', 'non-placeholder-art-direction']) {
    if (!serpentFeedback.failedChecks?.includes(check)) failures.push(`abyssal-serpent feedback missing failed check ${check}`);
  }
}
if ((contentVisualFeedbackLedger?.summary?.countsTowardStrictGate ?? -1) !== 0) failures.push('content visual feedback ledger records must not count toward strict gate');
if ((contentVisualFeedbackLedger?.summary?.unmappedPrototypeBlockers ?? 0) < 1) failures.push('content visual feedback ledger must include at least one unmapped prototype blocker');
for (const required of [
  'Water 9 Visual Feedback Ledger',
  'blocked prototype cannot be used as proof',
  'mechanical rig proof-of-concept',
  'abyssal-serpent',
  'rejected-needs-cohesion-regeneration',
  'whole-creature-cohesion',
]) {
  if (!contentVisualFeedbackLedgerMarkdown.includes(required) && !textIncludesHtml(contentVisualFeedbackLedgerHtml, required)) failures.push(`content visual feedback ledger outputs missing ${required}`);
}
if (!contentVisualFeedbackLedgerHtml.includes('data-content-visual-feedback-ledger')) failures.push('content visual feedback ledger html missing data-content-visual-feedback-ledger marker');

if (contentVisualRegenerationQueue?.schema !== 'water9/content-visual-regeneration-queue@1') failures.push(`content visual regeneration queue schema is ${contentVisualRegenerationQueue?.schema ?? 'missing'}`);
await fileOk('content visual regeneration queue markdown', paths.contentVisualRegenerationQueueMarkdown, 1024);
await fileOk('content visual regeneration queue html', paths.contentVisualRegenerationQueueHtml, 2048);
if (contentVisualRegenerationQueue?.policy?.sourceFirstRegenerationRequired !== true) failures.push('content visual regeneration queue must require source-first regeneration');
if (contentVisualRegenerationQueue?.policy?.promptDoesNotApproveArt !== true) failures.push('content visual regeneration queue must state prompts do not approve art');
if (contentVisualRegenerationQueue?.policy?.blockedPrototypeCannotCountTowardStrictGate !== true) failures.push('content visual regeneration queue must prevent blocked prototype strict-gate credit');
if (contentVisualRegenerationQueue?.policy?.mechanicalRigPrototypeIsNotArtDirection !== true) failures.push('content visual regeneration queue must separate mechanical rig prototypes from art direction');
if (contentVisualRegenerationQueue?.policy?.cohesionFailureRequiresNewSource !== true) failures.push('content visual regeneration queue must require new source work for cohesion failures');
const visualRegenerationItems = Array.isArray(contentVisualRegenerationQueue?.items) ? contentVisualRegenerationQueue.items : [];
const openBlockingVisualFeedback = visualFeedbackItems.filter((item) => item.open && item.severity === 'blocking');
if (visualRegenerationItems.length !== openBlockingVisualFeedback.length) failures.push('content visual regeneration queue item count must match open blocking visual feedback records');
const serpentRegeneration = visualRegenerationItems.find((item) => item.targetId === 'abyssal-serpent');
if (!serpentRegeneration) {
  failures.push('content visual regeneration queue must include abyssal-serpent');
} else {
  if (serpentRegeneration.status !== 'rejected-needs-cohesion-regeneration') failures.push('abyssal-serpent regeneration status mismatch');
  if (serpentRegeneration.sandboxPreviewOnly !== true) failures.push('abyssal-serpent regeneration must preserve preview-only status');
  if (serpentRegeneration.targetGateCandidate !== false) failures.push('abyssal-serpent regeneration must stay outside target gate candidates');
  if (serpentRegeneration.countsTowardStrictGate !== false) failures.push('abyssal-serpent regeneration must not count toward strict gate');
  if (!String(serpentRegeneration.commands?.previewWithDiver ?? '').includes('--with diver')) failures.push('abyssal-serpent regeneration must include paired diver preview command');
  await fileOk('abyssal-serpent regeneration prompt', resolve(serpentRegeneration.promptFile ?? 'missing'), 1024);
  let serpentPrompt = '';
  try {
    serpentPrompt = await readFile(resolve(serpentRegeneration.promptFile ?? 'missing'), 'utf8');
  } catch {
    failures.push('abyssal-serpent regeneration prompt could not be read');
  }
  for (const required of [
    'flat pure #ff00ff magenta background',
    'one cohesive full-source underwater threat',
    'Do not create a parts sheet',
    'mechanical rig test only',
    'not art direction',
    'Forbidden shortcuts:',
    'Do not merely repaint, upscale, re-time, socket-tune, or crop the rejected prototype.',
    'Do not assemble unrelated body parts into a collage',
    'whole-creature-cohesion',
    'Human reviewer must approve the intact source',
  ]) {
    if (!serpentPrompt.includes(required)) failures.push(`abyssal-serpent regeneration prompt missing ${required}`);
  }
}
if ((contentVisualRegenerationQueue?.summary?.countsTowardStrictGate ?? -1) !== 0) failures.push('content visual regeneration queue must not count toward strict gate');
for (const required of [
  'Water 9 Visual Regeneration Queue',
  'source-first regeneration briefs',
  'These prompts do not approve art',
  'abyssal-serpent',
]) {
  if (!contentVisualRegenerationQueueMarkdown.includes(required) && !textIncludesHtml(contentVisualRegenerationQueueHtml, required)) failures.push(`content visual regeneration queue outputs missing ${required}`);
}
if (!contentVisualRegenerationQueueHtml.includes('data-content-visual-regeneration-queue')) failures.push('content visual regeneration queue html missing data-content-visual-regeneration-queue marker');

if (acceptanceRunway?.schema !== 'water9/content-acceptance-runway@1') failures.push(`acceptance runway schema is ${acceptanceRunway?.schema ?? 'missing'}`);
await fileOk('acceptance runway html', paths.acceptanceRunwayHtml, 4096);
const acceptanceItems = Array.isArray(acceptanceRunway?.items) ? acceptanceRunway.items : [];
if ((acceptanceRunway?.summary?.targetThreats ?? 0) < minThreats) failures.push('acceptance runway targetThreats is below requirement');
if (!acceptanceRunwayHtml.includes('Human Approval Boundary')) failures.push('acceptance runway html missing human approval boundary');
if ((acceptanceRunway?.summary?.candidates ?? 0) !== candidates.length) failures.push('acceptance runway candidate count mismatch');
if (acceptanceItems.length !== candidates.length) failures.push('acceptance runway item count mismatch');
const acceptanceCandidatePackets = acceptanceItems.filter((item) => item.acceptancePacket?.file).length;
if (acceptanceCandidatePackets !== acceptanceItems.length) failures.push('acceptance runway must expose one acceptance packet per candidate');
const acceptanceUnmapped = Array.isArray(acceptanceRunway?.unmappedPrototypeThreats) ? acceptanceRunway.unmappedPrototypeThreats : [];
if ((acceptanceRunway?.summary?.unmappedPrototypeThreats ?? 0) !== acceptanceUnmapped.length) failures.push('acceptance runway unmapped prototype count mismatch');
if (acceptanceUnmapped.filter((item) => item.packet?.file).length !== acceptanceUnmapped.length) failures.push('acceptance runway must expose one migration packet per unmapped prototype');
const acceptanceRecommendedByStage = acceptanceRunway?.recommendedByStage ?? {};
for (const item of acceptanceItems) {
  if (item.accepted || acceptanceRecommendedByStage[item.stage]) continue;
  failures.push(`acceptance runway recommendedByStage missing ${item.stage}`);
}
for (const [stage, recommended] of Object.entries(acceptanceRecommendedByStage)) {
  const expected = acceptanceItems.find((item) => !item.accepted && item.stage === stage);
  if (!expected) {
    failures.push(`acceptance runway recommendedByStage has unexpected stage ${stage}`);
    continue;
  }
  if (recommended.id !== expected.id) failures.push(`acceptance runway recommendedByStage ${stage} should be ${expected.id}`);
  if (recommended.nextAction !== expected.nextAction) failures.push(`acceptance runway recommendedByStage ${stage} nextAction mismatch`);
  if (recommended.nextAction?.includes('npm run source:accept') && !recommended.nextAction.includes('--dry-run')) {
    failures.push(`acceptance runway recommendedByStage ${stage} source approval nextAction must be dry-run only`);
  }
  if (!acceptanceRunwayHtml.includes('Recommended By Stage')) failures.push('acceptance runway html missing Recommended By Stage section');
  if (!textIncludesHtml(acceptanceRunwayHtml, recommended.nextAction)) failures.push(`acceptance runway html missing recommended next action for ${stage}`);
}
for (const candidate of candidates) {
  const item = acceptanceItems.find((entry) => entry.id === candidate.id);
  if (!item) {
    failures.push(`${candidate.id}: missing from acceptance runway`);
    continue;
  }
  if (!Array.isArray(item.commands?.source) || item.commands.source.length < 1) failures.push(`${candidate.id}: acceptance runway missing source commands`);
  for (const command of (item.commands?.source ?? []).filter((entry) => String(entry).includes('npm run source:accept'))) {
    if (!String(command).includes('--dry-run')) failures.push(`${candidate.id}: acceptance runway source approval commands must be dry-run only`);
  }
  if (item.nextAction?.includes('npm run source:accept') && !item.nextAction.includes('--dry-run')) {
    failures.push(`${candidate.id}: acceptance runway source approval nextAction must be dry-run only`);
  }
  if (!item.acceptancePacket?.file) failures.push(`${candidate.id}: acceptance runway missing acceptance packet`);
  else {
    const packetText = await readText(`${candidate.id} acceptance packet`, resolve(item.acceptancePacket.file));
    if (!packetText.includes(item.nextAction)) failures.push(`${candidate.id}: acceptance packet missing next action`);
    if (!packetText.includes('Human Approval Boundary')) failures.push(`${candidate.id}: acceptance packet missing human approval boundary`);
    if (!packetText.includes('npm run content:gate')) failures.push(`${candidate.id}: acceptance packet missing final gate command`);
  }
  if (!candidate.source) {
    for (const expectedCommand of [
      `npm run source:inbox-capture -- --id ${candidate.id} --open`,
      `npm run source:recover-inline -- --id ${candidate.id} --image <saved-image-path> --copy --validate`,
      `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${candidate.id}`,
    ]) {
      if (!item.commands.source.includes(expectedCommand)) failures.push(`${candidate.id}: acceptance runway missing target-aware source command ${expectedCommand}`);
    }
  }
	  if (!Array.isArray(item.commands?.rigging) || item.commands.rigging.length < 1) failures.push(`${candidate.id}: acceptance runway missing rigging commands`);
	  if (!item.commands.rigging.some((command) => command.includes('content:accept'))) failures.push(`${candidate.id}: acceptance runway missing content:accept command`);
	  for (const command of item.commands.rigging.filter((entry) => entry.includes('content:accept'))) {
	    if (!command.includes('--parity-reviewed')) failures.push(`${candidate.id}: acceptance runway content:accept command must include --parity-reviewed`);
	  }
	  if (item.runtimeRegistered && !item.commands.rigging.some((command) => command.includes('sandbox:preview'))) failures.push(`${candidate.id}: acceptance runway missing sandbox preview command`);
	  if (item.runtimeRegistered && !item.commands.rigging.some((command) => command.includes('sandbox:preview') && command.includes('--with diver'))) {
	    failures.push(`${candidate.id}: acceptance runway sandbox preview command must include --with diver`);
	  }
	  if (item.runtimeRegistered && !item.commands.rigging.some((command) => command.includes('sandbox:visual') && command.includes('--states idle,lunge,stunned') && command.includes('--with diver'))) {
	    failures.push(`${candidate.id}: acceptance runway sandbox visual command must include idle/lunge/stunned with diver`);
	  }
	  if (item.runtimeRegistered) {
	    const runtimeId = item.runtimeId ?? item.id;
	    const expectedRuntimePreview = `npm run sandbox:preview -- --id ${runtimeId} --with diver --serve --open --visual`;
	    const expectedRuntimeVisual = `npm run sandbox:visual -- --ids ${runtimeId} --states idle,lunge,stunned --with diver`;
	    const expectedAcceptPrefix = `npm run content:accept -- --id ${runtimeId}`;
	    if (!item.commands.rigging.includes(expectedRuntimePreview)) failures.push(`${candidate.id}: acceptance runway missing exact runtime preview command ${expectedRuntimePreview}`);
	    if (!item.commands.rigging.includes(expectedRuntimeVisual)) failures.push(`${candidate.id}: acceptance runway missing exact runtime visual command ${expectedRuntimeVisual}`);
	    if (!item.commands.rigging.some((command) => command.startsWith(expectedAcceptPrefix))) failures.push(`${candidate.id}: acceptance runway missing exact content accept command for runtime id ${runtimeId}`);
	    if (!item.commands.rigging.some((command) => command.startsWith(expectedAcceptPrefix) && command.includes('--sandbox-reviewed') && command.includes('--parity-reviewed'))) {
	      failures.push(`${candidate.id}: acceptance runway content accept command must include sandbox and parity review gates`);
	    }
	    for (const expected of [expectedRuntimePreview, expectedRuntimeVisual, expectedAcceptPrefix, '--sandbox-reviewed', '--parity-reviewed']) {
	      if (!textIncludesHtml(acceptanceRunwayHtml, expected)) failures.push(`${candidate.id}: acceptance runway html missing exact runtime review evidence ${expected}`);
	    }
	  }
	}
for (const item of acceptanceUnmapped) {
  if (!item.packet?.file) {
    failures.push(`${item.id}: acceptance runway missing unmapped prototype packet`);
    continue;
  }
  const packetText = await readText(`${item.id} unmapped prototype packet`, resolve(item.packet.file));
  for (const expected of [
    'cannot count toward the strict 20-threat gate',
    `npm run sandbox:preview -- --id ${item.id} --with diver --serve --open --visual`,
    `npm run sandbox:visual -- --ids ${item.id} --states idle,lunge,stunned --with diver`,
    `npm run content:acceptance-audit -- --id ${item.id}`,
  ]) {
    if (!packetText.includes(expected)) failures.push(`${item.id}: unmapped prototype packet missing ${expected}`);
  }
}
if (!acceptanceRunwayHtml.includes('Water 9 Acceptance Runway')) failures.push('acceptance runway html missing title');
if (!acceptanceRunwayHtml.includes('npm run content:accept')) failures.push('acceptance runway html missing content acceptance command');
if (!acceptanceRunwayHtml.includes('npm run sandbox:preview')) failures.push('acceptance runway html missing sandbox preview command');
if (!acceptanceRunwayHtml.includes('Unmapped Prototype Migration')) failures.push('acceptance runway html missing unmapped prototype migration section');

if (reviewEvidenceMatrix?.schema !== 'water9/content-review-evidence-matrix@1') failures.push(`review evidence matrix schema is ${reviewEvidenceMatrix?.schema ?? 'missing'}`);
await fileOk('review evidence matrix html', paths.reviewEvidenceMatrixHtml, 4096);
const reviewEvidenceRows = Array.isArray(reviewEvidenceMatrix?.rows) ? reviewEvidenceMatrix.rows : [];
if ((reviewEvidenceMatrix?.summary?.sourceCandidates ?? -1) !== candidates.length) failures.push('review evidence matrix source candidate count mismatch');
if ((reviewEvidenceMatrix?.summary?.sourceImages ?? -1) !== sourceImages.length) failures.push('review evidence matrix source image count mismatch');
if ((reviewEvidenceMatrix?.summary?.runtimeMappedCandidates ?? -1) !== (acceptanceRunway?.summary?.runtimeRegistered ?? -2)) failures.push('review evidence matrix runtime mapped count mismatch with acceptance runway');
if ((reviewEvidenceMatrix?.summary?.unmappedPrototypeThreats ?? -1) !== (acceptanceRunway?.summary?.unmappedPrototypeThreats ?? -2)) failures.push('review evidence matrix unmapped prototype count mismatch with acceptance runway');
if ((reviewEvidenceMatrix?.summary?.acceptedThreats ?? -1) !== (acceptanceRunway?.summary?.acceptedThreats ?? -2)) failures.push('review evidence matrix accepted threat count mismatch with acceptance runway');
if (reviewEvidenceRows.length !== candidates.length) failures.push('review evidence matrix row count mismatch');
if (!reviewEvidenceMatrixHtml.includes('Automation evidence is separated from human approval')) failures.push('review evidence matrix html missing automation boundary copy');
if (!reviewEvidenceMatrixHtml.includes('prototype')) failures.push('review evidence matrix html must expose prototype state');
for (const candidate of candidates) {
  const row = reviewEvidenceRows.find((item) => item.id === candidate.id);
  const runwayItem = acceptanceItems.find((item) => item.id === candidate.id);
  if (!row) {
    failures.push(`${candidate.id}: missing from review evidence matrix`);
    continue;
  }
  if (row.species !== candidate.species) failures.push(`${candidate.id}: review evidence species mismatch`);
  if (row.sourcePresent !== Boolean(candidate.source)) failures.push(`${candidate.id}: review evidence sourcePresent mismatch`);
  if (row.runtimeRegistered !== Boolean(runwayItem?.runtimeRegistered)) failures.push(`${candidate.id}: review evidence runtimeRegistered mismatch with acceptance runway`);
  if ((row.runtimeId ?? null) !== (runwayItem?.runtimeId ?? null)) failures.push(`${candidate.id}: review evidence runtimeId mismatch with acceptance runway`);
  if (row.threatAccepted !== Boolean(runwayItem?.threatAccepted)) failures.push(`${candidate.id}: review evidence threatAccepted mismatch with acceptance runway`);
  if (!Array.isArray(row.blockers)) failures.push(`${candidate.id}: review evidence blockers must be an array`);
  if (!row.nextHumanGate) failures.push(`${candidate.id}: review evidence nextHumanGate missing`);
  if (!textIncludesHtml(reviewEvidenceMatrixHtml, candidate.id)) failures.push(`${candidate.id}: review evidence html missing candidate`);
}

if (reviewCockpit?.schema !== 'water9/content-review-cockpit@1') failures.push(`review cockpit schema is ${reviewCockpit?.schema ?? 'missing'}`);
await fileOk('review cockpit html', paths.reviewCockpitHtml, 4096);
const reviewCockpitPages = Array.isArray(reviewCockpit?.pages) ? reviewCockpit.pages : [];
if ((reviewCockpit?.summary?.candidates ?? -1) !== candidates.length) failures.push('review cockpit candidate count mismatch');
if (reviewCockpitPages.length !== candidates.length) failures.push('review cockpit page count mismatch');
if ((reviewCockpit?.summary?.runtimeMappedCandidates ?? -1) !== (reviewEvidenceMatrix?.summary?.runtimeMappedCandidates ?? -2)) failures.push('review cockpit runtime mapped count mismatch with evidence matrix');
if ((reviewCockpit?.summary?.unmappedPrototypeThreats ?? -1) !== (reviewEvidenceMatrix?.summary?.unmappedPrototypeThreats ?? -2)) failures.push('review cockpit unmapped prototype count mismatch with evidence matrix');
if ((reviewCockpit?.summary?.acceptedThreats ?? -1) !== (reviewEvidenceMatrix?.summary?.acceptedThreats ?? -2)) failures.push('review cockpit accepted threat count mismatch with evidence matrix');
if (!reviewCockpitHtml.includes('Prototype evidence is not acceptance')) failures.push('review cockpit html missing prototype/acceptance boundary copy');
if (!reviewCockpitHtml.includes('Human Approval Boundary')) failures.push('review cockpit html missing human approval boundary copy');
for (const candidate of candidates) {
  const page = reviewCockpitPages.find((item) => item.id === candidate.id);
  const row = reviewEvidenceRows.find((item) => item.id === candidate.id);
  if (!page) {
    failures.push(`${candidate.id}: missing from review cockpit`);
    continue;
  }
  if (page.species !== candidate.species) failures.push(`${candidate.id}: review cockpit species mismatch`);
  if (row && page.nextHumanGate !== row.nextHumanGate) failures.push(`${candidate.id}: review cockpit nextHumanGate mismatch with evidence matrix`);
  if ((page.mediaCount ?? 0) < (row?.runtimeRegistered ? 8 : 4)) failures.push(`${candidate.id}: review cockpit has insufficient evidence media`);
  if (!Array.isArray(page.commands)) failures.push(`${candidate.id}: review cockpit missing command manifest`);
  assertDryRunDecisionCommands(`${candidate.id} review cockpit manifest`, page.commands);
  if (!textIncludesHtml(reviewCockpitHtml, candidate.id)) failures.push(`${candidate.id}: review cockpit index missing candidate`);
  if (page.href) {
    const pagePath = resolve('public/review/content-review-cockpit', page.href);
    await fileOk(`${candidate.id} review cockpit page`, pagePath, 2048);
    const pageText = await readText(`${candidate.id} review cockpit page`, pagePath);
    if (!pageText.includes('Human Approval Boundary')) failures.push(`${candidate.id}: review cockpit page missing human approval boundary copy`);
    assertRenderedDryRunDecisionCommands(`${candidate.id} review cockpit page`, pageText);
  }
}

if (runtimeRosterExceptions?.schema !== 'water9/content-runtime-roster-exceptions@1') failures.push(`runtime roster exceptions schema is ${runtimeRosterExceptions?.schema ?? 'missing'}`);
const runtimeCreaturesForRoster = Array.isArray(runtime?.creatures) ? runtime.creatures : [];
const mappedRuntimeIdsForRoster = new Set(reviewEvidenceRows.map((row) => row.runtimeId).filter(Boolean));
const rosterExceptionItems = Array.isArray(runtimeRosterExceptions?.exceptions) ? runtimeRosterExceptions.exceptions : [];
const rosterExceptionIds = rosterExceptionItems.map((item) => item.id).filter(Boolean);
if (rosterExceptionIds.length !== uniqueValues(rosterExceptionIds).length) failures.push('runtime roster exceptions contain duplicate ids');
const unmappedRuntimeForRoster = runtimeCreaturesForRoster.filter((creature) => !mappedRuntimeIdsForRoster.has(creature.id) && creature.quality?.status !== 'accepted');
if (rosterExceptionItems.length !== unmappedRuntimeForRoster.length) failures.push('runtime roster exception count mismatch with unmapped runtime prototypes');
for (const creature of unmappedRuntimeForRoster) {
  const exception = rosterExceptionItems.find((item) => item.id === creature.id);
  if (!exception) {
    failures.push(`${creature.id}: unmapped runtime prototype missing roster exception`);
    continue;
  }
  if (exception.countsTowardGoal !== false) failures.push(`${creature.id}: runtime roster exception must set countsTowardGoal false`);
  if (!exception.outOfGoalReason && !exception.supersededBy) failures.push(`${creature.id}: runtime roster exception missing outOfGoalReason or supersededBy`);
}
for (const exception of rosterExceptionItems) {
  if (!runtimeCreaturesForRoster.some((creature) => creature.id === exception.id)) failures.push(`${exception.id}: runtime roster exception references missing runtime creature`);
  if (mappedRuntimeIdsForRoster.has(exception.id)) failures.push(`${exception.id}: runtime roster exception must not exist for mapped active-goal runtime`);
}

if (acceptanceDoctor?.schema !== 'water9/content-acceptance-doctor@1') failures.push(`acceptance doctor schema is ${acceptanceDoctor?.schema ?? 'missing'}`);
await fileOk('acceptance doctor markdown', paths.acceptanceDoctorMarkdown, 1024);
await fileOk('acceptance doctor html', paths.acceptanceDoctorHtml, 4096);
const acceptanceDoctorItems = Array.isArray(acceptanceDoctor?.items) ? acceptanceDoctor.items : [];
if ((acceptanceDoctor?.summary?.targetThreats ?? 0) < minThreats) failures.push('acceptance doctor targetThreats is below requirement');
if ((acceptanceDoctor?.summary?.candidates ?? -1) !== acceptanceItems.length) failures.push('acceptance doctor candidate count mismatch');
if (acceptanceDoctorItems.length !== acceptanceItems.length) failures.push('acceptance doctor item count mismatch');
if ((acceptanceDoctor?.summary?.acceptedThreats ?? -1) !== (acceptanceRunway?.summary?.acceptedThreats ?? -2)) failures.push('acceptance doctor acceptedThreats mismatch with acceptance runway');
if ((acceptanceDoctor?.summary?.sourceBlocked ?? -1) !== acceptanceDoctorItems.filter((item) => (item.sourceBlockers ?? []).length > 0).length) failures.push('acceptance doctor sourceBlocked summary mismatch');
if ((acceptanceDoctor?.summary?.runtimeBlocked ?? -1) !== acceptanceDoctorItems.filter((item) => (item.runtimeBlockers ?? []).length > 0).length) failures.push('acceptance doctor runtimeBlocked summary mismatch');
if ((acceptanceDoctor?.summary?.acceptanceBlocked ?? -1) !== acceptanceDoctorItems.filter((item) => (item.acceptanceBlockers ?? []).length > 0).length) failures.push('acceptance doctor acceptanceBlocked summary mismatch');
if ((acceptanceDoctor?.summary?.missingRuntime ?? -1) !== (runtimeCoverage?.summary?.missingRuntime ?? -2)) failures.push('acceptance doctor missingRuntime mismatch with runtime coverage');
for (const item of acceptanceDoctorItems) {
  const runwayItem = acceptanceItems.find((entry) => entry.id === item.id);
  if (!runwayItem) {
    failures.push(`${item.id ?? 'unknown'}: acceptance doctor item missing from acceptance runway`);
    continue;
  }
  if (item.species !== runwayItem.species) failures.push(`${item.id}: acceptance doctor species mismatch`);
  if (item.stage !== runwayItem.stage) failures.push(`${item.id}: acceptance doctor stage mismatch`);
  if (item.hasSourceImage !== Boolean(runwayItem.hasSourceImage)) failures.push(`${item.id}: acceptance doctor hasSourceImage mismatch`);
  if (item.sourceApproved !== Boolean(runwayItem.sourceApproved)) failures.push(`${item.id}: acceptance doctor sourceApproved mismatch`);
  if (item.runtimeRegistered !== Boolean(runwayItem.runtimeRegistered)) failures.push(`${item.id}: acceptance doctor runtimeRegistered mismatch`);
  if (item.threatAccepted !== Boolean(runwayItem.threatAccepted)) failures.push(`${item.id}: acceptance doctor threatAccepted mismatch`);
  if (!Array.isArray(item.sourceBlockers) || !Array.isArray(item.runtimeBlockers) || !Array.isArray(item.acceptanceBlockers)) {
    failures.push(`${item.id}: acceptance doctor blockers must be arrays`);
  }
  if (!String(item.severity ?? '').trim()) failures.push(`${item.id}: acceptance doctor missing severity`);
  if (!String(item.nextCommand ?? '').trim()) failures.push(`${item.id}: acceptance doctor missing next command`);
  if (!acceptanceDoctorMarkdown.includes(item.id)) failures.push(`${item.id}: acceptance doctor markdown missing id`);
  if (!textIncludesHtml(acceptanceDoctorHtml, `data-acceptance-doctor-candidate="${item.id}"`)) failures.push(`${item.id}: acceptance doctor html missing candidate marker`);
  if (!textIncludesHtml(acceptanceDoctorHtml, item.nextCommand)) failures.push(`${item.id}: acceptance doctor html missing next command`);
}
for (const expected of [
  'Water 9 Acceptance Doctor',
  'Read-only compact diagnostic report',
  'Source Blockers',
  'Runtime Blockers',
  'Acceptance Blockers',
  'npm run content:acceptance-doctor',
  'npm run content:acceptance-doctor-check',
]) {
  if (!acceptanceDoctorMarkdown.includes(expected)) failures.push(`acceptance doctor markdown missing ${expected}`);
  if (!textIncludesHtml(acceptanceDoctorHtml, expected)) failures.push(`acceptance doctor html missing ${expected}`);
}

if (threatAcceptanceDecisions?.schema !== 'water9/content-threat-acceptance-decision-template@1') failures.push(`threat acceptance decisions schema is ${threatAcceptanceDecisions?.schema ?? 'missing'}`);
await fileOk('threat acceptance decisions markdown', paths.threatAcceptanceDecisionsMarkdown, 512);
await fileOk('threat acceptance decisions html', paths.threatAcceptanceDecisionsHtml, 2048);
if (threatAcceptanceDecisions?.decisionFileTemplate?.schema !== 'water9/content-threat-acceptance-decisions@1') failures.push('threat acceptance decisions decisionFileTemplate schema mismatch');
if (threatAcceptanceDecisions?.decisionFileTemplate?.policy?.humanAuthored !== true) failures.push('threat acceptance decisions must require human authored decision files');
if (threatAcceptanceDecisions?.decisionFileTemplate?.policy?.automationCannotAcceptThreats !== true) failures.push('threat acceptance decisions must disclose automation cannot accept threats');
const threatAcceptanceDecisionItems = Array.isArray(threatAcceptanceDecisions?.decisions) ? threatAcceptanceDecisions.decisions : [];
const threatAcceptanceDecisionFileItems = Array.isArray(threatAcceptanceDecisions?.decisionFileTemplate?.decisions) ? threatAcceptanceDecisions.decisionFileTemplate.decisions : [];
const reviewCreatures = Array.isArray(articulatedReview?.creatures) ? articulatedReview.creatures : [];
const threatDecisionTargetIds = (stageBoard?.targets ?? []).map((target) => target.rigId ?? target.id).filter(Boolean);
const threatDecisionTargetIdSet = new Set(threatDecisionTargetIds);
const scopedReviewCreatures = threatAcceptanceDecisions?.scope?.mode === 'all-registered'
  ? reviewCreatures
  : reviewCreatures.filter((creature) => threatDecisionTargetIdSet.has(creature.id));
const threatAcceptanceRequiredChecks = Array.isArray(threatAcceptanceDecisions?.requiredChecks) ? threatAcceptanceDecisions.requiredChecks : [];
const requiredThreatAcceptanceChecks = [
  'single-source-cohesion',
  'readable-silhouette',
  'anatomy-cohesion',
  'production-visual-cohesion',
  'socket-seams',
  'motion-stability',
  'sandbox-behavior',
];
if (threatAcceptanceDecisions?.scope?.mode !== 'target-threats') failures.push(`threat acceptance decisions default scope must be target-threats, got ${threatAcceptanceDecisions?.scope?.mode ?? 'missing'}`);
if ((threatAcceptanceDecisions?.scope?.targetThreats ?? -1) !== (stageBoard?.summary?.targetThreats ?? minThreats)) failures.push('threat acceptance decisions targetThreats mismatch with stage board');
if ((threatAcceptanceDecisions?.summary?.registeredRigs ?? -1) !== scopedReviewCreatures.length) failures.push('threat acceptance decisions registeredRigs mismatch with scoped articulated review');
if ((threatAcceptanceDecisions?.summary?.availableRegisteredRigs ?? -1) !== reviewCreatures.length) failures.push('threat acceptance decisions availableRegisteredRigs mismatch with articulated review');
if (threatAcceptanceDecisionItems.length !== scopedReviewCreatures.length) failures.push('threat acceptance decisions item count mismatch with scoped articulated review');
if (threatAcceptanceDecisionFileItems.length !== scopedReviewCreatures.length) failures.push('threat acceptance decisions decisionFileTemplate count mismatch with scoped articulated review');
for (const id of threatDecisionTargetIds) {
  if (!(threatAcceptanceDecisions?.scope?.includedIds ?? []).includes(id)) failures.push(`${id}: missing from threat acceptance target scope`);
}
const expectedExcludedRigs = reviewCreatures.map((creature) => creature.id).filter((id) => !threatDecisionTargetIdSet.has(id));
for (const id of expectedExcludedRigs) {
  if (!(threatAcceptanceDecisions?.scope?.excludedRegisteredRigs ?? []).includes(id)) failures.push(`${id}: missing from threat acceptance excludedRegisteredRigs`);
}
for (const check of requiredThreatAcceptanceChecks) {
  if (!threatAcceptanceRequiredChecks.includes(check)) failures.push(`threat acceptance decisions missing required check ${check}`);
  if (!threatAcceptanceDecisionsMarkdown.includes(check)) failures.push(`threat acceptance decisions markdown missing check ${check}`);
  if (!textIncludesHtml(threatAcceptanceDecisionsHtml, check)) failures.push(`threat acceptance decisions html missing check ${check}`);
}
for (const creature of scopedReviewCreatures) {
  const item = threatAcceptanceDecisionItems.find((entry) => entry.id === creature.id);
  const fileItem = threatAcceptanceDecisionFileItems.find((entry) => entry.id === creature.id);
  if (!item) {
    failures.push(`${creature.id}: missing from threat acceptance decisions`);
    continue;
  }
	  if (!fileItem) failures.push(`${creature.id}: missing from threat acceptance decisionFileTemplate`);
	  if (item.species !== creature.species) failures.push(`${creature.id}: threat acceptance species mismatch`);
	  if (fileItem?.status !== 'needs-review') failures.push(`${creature.id}: threat acceptance decisionFileTemplate should default to needs-review`);
	  if (item.evidenceFingerprint?.schema !== 'water9/content-threat-acceptance-evidence-fingerprint@1') failures.push(`${creature.id}: threat acceptance evidence fingerprint schema missing`);
	  if (!item.evidenceFingerprint?.digest) failures.push(`${creature.id}: threat acceptance evidence fingerprint digest missing`);
	  if (fileItem?.evidenceFingerprint?.digest !== item.evidenceFingerprint?.digest) failures.push(`${creature.id}: threat acceptance decisionFileTemplate fingerprint mismatch`);
	  for (const key of ['contact', 'phase', 'sourceParity']) {
	    const media = item.evidenceFingerprint?.files?.[key];
	    if (media?.exists !== true || !media.sha256 || !media.size) failures.push(`${creature.id}: threat acceptance evidence fingerprint missing valid ${key}`);
	  }
	  if (item.evidenceFingerprint?.digest && !textIncludesHtml(threatAcceptanceDecisionsHtml, item.evidenceFingerprint.digest)) failures.push(`${creature.id}: threat acceptance html missing evidence fingerprint digest`);
	  for (const check of requiredThreatAcceptanceChecks) {
    if (!Object.hasOwn(item.visualChecks ?? {}, check)) failures.push(`${creature.id}: threat acceptance item missing visual check ${check}`);
    if (!Object.hasOwn(fileItem?.visualChecks ?? {}, check)) failures.push(`${creature.id}: threat acceptance decisionFileTemplate missing visual check ${check}`);
    if (!String(item.commands?.acceptDryRun ?? '').includes(`--visual-check ${check}`)) failures.push(`${creature.id}: threat acceptance dry-run missing visual check ${check}`);
    if (!String(item.commands?.acceptDryRun ?? '').includes(`--score ${check}=<4-5>`)) failures.push(`${creature.id}: threat acceptance dry-run missing score ${check}`);
    if (!String(item.commands?.acceptDryRun ?? '').includes(`--visual-note ${check}=`)) failures.push(`${creature.id}: threat acceptance dry-run missing visual note ${check}`);
  }
	  for (const flag of ['--evidence-fingerprint', '--source-reviewed', '--contact-reviewed', '--phase-reviewed', '--parity-reviewed', '--sandbox-reviewed', '--dry-run']) {
	    if (!String(item.commands?.acceptDryRun ?? '').includes(flag)) failures.push(`${creature.id}: threat acceptance dry-run missing ${flag}`);
	  }
  if (!String(item.commands?.sandbox ?? '').includes(`--id ${creature.id}`) || !String(item.commands?.sandbox ?? '').includes('--with diver')) failures.push(`${creature.id}: threat acceptance missing paired sandbox command`);
  if (!String(item.commands?.visual ?? '').includes('--states idle,lunge,stunned') || !String(item.commands?.visual ?? '').includes('--with diver')) failures.push(`${creature.id}: threat acceptance missing paired visual command`);
  if (!String(item.commands?.audit ?? '').includes(`npm run content:acceptance-audit -- --id ${creature.id}`)) failures.push(`${creature.id}: threat acceptance missing audit command`);
  if (!textIncludesHtml(threatAcceptanceDecisionsHtml, `data-threat-decision-form="${creature.id}"`)) failures.push(`${creature.id}: threat acceptance html missing decision form`);
  if (!threatAcceptanceDecisionsMarkdown.includes(creature.id)) failures.push(`${creature.id}: threat acceptance markdown missing id`);
}
for (const expected of [
  'Water 9 Threat Acceptance Batch Decision Template',
  'Water 9 Threat Acceptance Batch Decisions',
  'This page does not approve content automatically',
  'the 20 target threats required by the strict content gate',
  'Batch Threat Decision Workspace',
  'data-threat-decision-workspace',
  'data-threat-decision-output',
  'Download decision file',
  'npm run content:threat-decisions',
  'npm run content:threat-decisions -- --all-registered',
  'npm run content:threat-decisions-check',
  'npm run content:threat-decisions-apply -- --decisions water9-threat-acceptance-decisions.json --strict',
]) {
  if (!['Batch Threat Decision Workspace', 'data-threat-decision-workspace', 'data-threat-decision-output', 'Download decision file'].includes(expected) && !threatAcceptanceDecisionsMarkdown.includes(expected)) {
    failures.push(`threat acceptance decisions markdown missing ${expected}`);
  }
  if (!textIncludesHtml(threatAcceptanceDecisionsHtml, expected)) failures.push(`threat acceptance decisions html missing ${expected}`);
}

if (threatAcceptanceDecisionRun?.schema !== 'water9/content-threat-acceptance-decision-run@1') failures.push(`threat acceptance decision run schema is ${threatAcceptanceDecisionRun?.schema ?? 'missing'}`);
if ((threatAcceptanceDecisionRun?.decisions ?? -1) !== threatAcceptanceDecisionFileItems.length) failures.push('threat acceptance decision run count mismatch with decision template');
if ((threatAcceptanceDecisionRun?.accepted ?? -1) !== 0) failures.push('default threat acceptance decision run must not accept threats');
if ((threatAcceptanceDecisionRun?.pending ?? -1) !== threatAcceptanceDecisionFileItems.length) failures.push('default threat acceptance decision run should leave template decisions pending');
if (threatAcceptanceDecisionRun?.applied !== false) failures.push('default threat acceptance decision run must not apply changes');
if ((threatAcceptanceDecisionRun?.failures ?? []).length) failures.push(`threat acceptance decision run has failures: ${threatAcceptanceDecisionRun.failures.join('; ')}`);
for (const item of threatAcceptanceDecisionRun?.results ?? []) {
  if (item.status === 'accepted' && item.applied !== true && !String(item.command ?? '').includes('--dry-run')) {
    failures.push(`${item.id}: accepted threat decision dry-run command missing --dry-run`);
  }
  if (item.status === 'accepted' && !String(item.command ?? '').includes('tools/accept_articulated_creature.mjs')) {
    failures.push(`${item.id}: accepted threat decision command missing accept_articulated_creature tool`);
  }
  if (item.status === 'accepted' && !String(item.command ?? '').includes('--source-reviewed')) {
    failures.push(`${item.id}: accepted threat decision command missing source-reviewed evidence flag`);
  }
}

if (runtimeCoverage?.schema !== 'water9/content-runtime-coverage@1') failures.push(`runtime coverage schema is ${runtimeCoverage?.schema ?? 'missing'}`);
await fileOk('runtime coverage markdown', paths.runtimeCoverageMarkdown, 1024);
const runtimeCoverageItems = Array.isArray(runtimeCoverage?.items) ? runtimeCoverage.items : [];
if (runtimeCoverageItems.length !== candidates.length) failures.push('runtime coverage item count mismatch');
const runtimeCoverageRegistered = runtimeCoverageItems.filter((item) => item.runtimeRegistered).length;
const runtimeCoverageMissing = runtimeCoverageItems.filter((item) => !item.runtimeRegistered).length;
if ((runtimeCoverage?.summary?.candidates ?? -1) !== candidates.length) failures.push('runtime coverage summary candidates mismatch');
if ((runtimeCoverage?.summary?.runtimeRegistered ?? -1) !== runtimeCoverageRegistered) failures.push('runtime coverage summary runtimeRegistered mismatch');
if ((runtimeCoverage?.summary?.missingRuntime ?? -1) !== runtimeCoverageMissing) failures.push('runtime coverage summary missingRuntime mismatch');
if ((runtimeCoverage?.summary?.acceptedThreats ?? -1) !== runtimeCoverageItems.filter((item) => item.accepted).length) failures.push('runtime coverage summary acceptedThreats mismatch');
for (const candidate of candidates) {
  const item = runtimeCoverageItems.find((entry) => entry.id === candidate.id);
  if (!item) {
    failures.push(`${candidate.id}: missing from runtime coverage`);
    continue;
  }
  if (!String(item.riggingCommand ?? '').includes(`--id ${candidate.id}`)) failures.push(`${candidate.id}: runtime coverage rigging command must target candidate id`);
  if (!runtimeCoverageMarkdown.includes(candidate.id)) failures.push(`${candidate.id}: runtime coverage markdown missing candidate id`);
  if (!runtimeCoverageMarkdown.includes(item.riggingCommand)) failures.push(`${candidate.id}: runtime coverage markdown missing rigging command`);
}
if (!runtimeCoverageMarkdown.includes('Water 9 Runtime Coverage')) failures.push('runtime coverage markdown missing title');
if (!runtimeCoverageMarkdown.includes('Missing Runtime')) failures.push('runtime coverage markdown missing Missing Runtime section');

if (planCoverage?.schema !== 'water9/content-plan-coverage@1') failures.push(`plan coverage schema is ${planCoverage?.schema ?? 'missing'}`);
await fileOk('plan coverage markdown', paths.planCoverageMarkdown, 1024);
await fileOk('plan coverage html', paths.planCoverageHtml, 2048);
const planCoverageItems = Array.isArray(planCoverage?.items) ? planCoverage.items : [];
if ((planCoverage?.summary?.candidates ?? -1) !== candidates.length) failures.push('plan coverage summary candidates mismatch');
if ((planCoverage?.summary?.sourceImages ?? -1) !== candidates.filter((candidate) => candidate.source).length) failures.push('plan coverage summary sourceImages mismatch');
if ((planCoverage?.summary?.approvedSources ?? -1) !== planCoverageItems.filter((item) => item.sourceApproved).length) failures.push('plan coverage summary approvedSources mismatch');
if ((planCoverage?.summary?.planArtifacts ?? -1) !== planCoverageItems.filter((item) => item.artifacts?.plan?.exists).length) failures.push('plan coverage summary planArtifacts mismatch');
if ((planCoverage?.summary?.planPreviews ?? -1) !== planCoverageItems.filter((item) => item.artifacts?.planPreview?.exists).length) failures.push('plan coverage summary planPreviews mismatch');
if ((planCoverage?.summary?.runtimeRegistered ?? -1) !== runtimeCoverageItems.filter((item) => item.runtimeRegistered).length) failures.push('plan coverage summary runtimeRegistered mismatch');
if ((planCoverage?.summary?.acceptedThreats ?? -1) !== runtimeCoverageItems.filter((item) => item.accepted).length) failures.push('plan coverage summary acceptedThreats mismatch');
const planCoverageById = new Map(planCoverageItems.map((item) => [item.id, item]));
for (const candidate of candidates) {
  const item = planCoverageById.get(candidate.id);
  const runtimeItem = runtimeCoverageItems.find((entry) => entry.id === candidate.id);
  if (!item) {
    failures.push(`${candidate.id}: missing from plan coverage`);
    continue;
  }
  if (item.species !== candidate.species) failures.push(`${candidate.id}: plan coverage species mismatch`);
  if (item.hasSource !== Boolean(candidate.source)) failures.push(`${candidate.id}: plan coverage hasSource mismatch`);
  if (item.source !== (candidate.source ?? null)) failures.push(`${candidate.id}: plan coverage source mismatch`);
  if (item.runtimeRegistered !== Boolean(runtimeItem?.runtimeRegistered)) failures.push(`${candidate.id}: plan coverage runtimeRegistered mismatch`);
  if (item.runtimeId !== (runtimeItem?.runtimeId ?? null)) failures.push(`${candidate.id}: plan coverage runtimeId mismatch`);
  if (item.accepted !== Boolean(runtimeItem?.accepted)) failures.push(`${candidate.id}: plan coverage accepted mismatch`);
  if (item.plan !== `tools/scratch/${candidate.id}-starter-plan.json`) failures.push(`${candidate.id}: plan coverage plan path mismatch`);
  if (item.planPreview !== `public/review/articulated/${candidate.id}-plan-preview.png`) failures.push(`${candidate.id}: plan coverage preview path mismatch`);
  if (item.artifacts?.plan?.path !== item.plan) failures.push(`${candidate.id}: plan coverage plan artifact path mismatch`);
  if (item.artifacts?.planPreview?.path !== item.planPreview) failures.push(`${candidate.id}: plan coverage preview artifact path mismatch`);
  if (item.artifacts?.plan?.exists && (item.artifacts.plan.bytes ?? 0) < 512) failures.push(`${candidate.id}: plan coverage plan artifact is too small`);
  if (item.artifacts?.planPreview?.exists && (item.artifacts.planPreview.bytes ?? 0) < 1024) failures.push(`${candidate.id}: plan coverage preview artifact is too small`);
  if (!String(item.commands?.mechanicalPrepare ?? '').includes(`--id ${candidate.id}`)) failures.push(`${candidate.id}: plan coverage mechanical prepare must target id`);
  if (!String(item.commands?.mechanicalPrepare ?? '').includes('--allow-unapproved')) failures.push(`${candidate.id}: plan coverage mechanical prepare must allow unapproved for staging`);
  if (String(item.commands?.productionPrepare ?? '').includes('--allow-unapproved')) failures.push(`${candidate.id}: plan coverage production prepare must not allow unapproved`);
  if (!String(item.commands?.runtimePreview ?? '').includes('--with diver')) failures.push(`${candidate.id}: plan coverage runtime preview must include diver`);
  if (!planCoverageMarkdown.includes(candidate.id)) failures.push(`${candidate.id}: plan coverage markdown missing candidate id`);
  if (!textIncludesHtml(planCoverageHtml, `data-plan-coverage-candidate="${candidate.id}"`)) failures.push(`${candidate.id}: plan coverage html missing candidate marker`);
}
if (!planCoverageMarkdown.includes('Water 9 Plan Coverage')) failures.push('plan coverage markdown missing title');
if (!planCoverageMarkdown.includes('Mechanical staging is not production acceptance')) failures.push('plan coverage markdown missing staging disclosure');
if (!planCoverageHtml.includes('Mechanical staging is not production acceptance')) failures.push('plan coverage html missing staging disclosure');

if (verticalSlice?.schema !== 'water9/content-vertical-slice-runway@1') failures.push(`vertical slice runway schema is ${verticalSlice?.schema ?? 'missing'}`);
await fileOk('vertical slice runway markdown', paths.verticalSliceMarkdown, 1024);
await fileOk('vertical slice runway html', paths.verticalSliceHtml, 4096);
const verticalSliceItems = Array.isArray(verticalSlice?.items) ? verticalSlice.items : [];
const verticalSliceTargets = Array.isArray(stageBoard?.targets) ? stageBoard.targets : [];
if ((verticalSlice?.summary?.threats ?? -1) !== verticalSliceTargets.length) failures.push('vertical slice summary threats mismatch');
if ((verticalSlice?.summary?.targetThreats ?? -1) !== (stageBoard?.summary?.targetThreats ?? 20)) failures.push('vertical slice targetThreats mismatch');
if ((verticalSlice?.summary?.acceptedThreats ?? -1) !== verticalSliceTargets.filter((target) => target.accepted).length) failures.push('vertical slice acceptedThreats mismatch');
if ((verticalSlice?.summary?.mechanicallyReviewable ?? -1) !== verticalSliceItems.filter((item) => item.mechanicallyReviewable).length) failures.push('vertical slice mechanicallyReviewable mismatch');
if (verticalSlice?.summary?.allRoutesHaveContract !== verticalSliceItems.every((item) => item.contract?.ready)) failures.push('vertical slice allRoutesHaveContract mismatch');
if (verticalSlice?.summary?.allRoutesHaveSourceEvidence !== verticalSliceItems.every((item) => item.source?.ready)) failures.push('vertical slice allRoutesHaveSourceEvidence mismatch');
if (verticalSlice?.summary?.allRoutesHavePlans !== verticalSliceItems.every((item) => item.plan?.ready)) failures.push('vertical slice allRoutesHavePlans mismatch');
if (verticalSlice?.summary?.allRoutesHaveRigQualityEvidence !== verticalSliceItems.every((item) => item.rigQuality?.ready)) failures.push('vertical slice allRoutesHaveRigQualityEvidence mismatch');
if (verticalSlice?.summary?.allRoutesHaveSandbox !== verticalSliceItems.every((item) => item.runtime?.ready)) failures.push('vertical slice allRoutesHaveSandbox mismatch');
if (verticalSlice?.summary?.allRoutesHaveRuntimeVisualEvidence !== verticalSliceItems.every((item) => item.runtimeVisual?.ready)) failures.push('vertical slice allRoutesHaveRuntimeVisualEvidence mismatch');
if (verticalSlice?.summary?.allRoutesHaveAcceptanceAudits !== verticalSliceItems.every((item) => item.audit?.ready)) failures.push('vertical slice allRoutesHaveAcceptanceAudits mismatch');
const verticalSliceById = new Map(verticalSliceItems.map((item) => [item.id, item]));
const verticalSliceRigById = new Map((articulatedReview?.creatures ?? []).map((item) => [item.id, item]));
const verticalSliceCohesionById = new Map((visualCohesion?.creatures ?? []).map((item) => [item.id, item]));
const verticalSliceReviewFlags = ['--source-reviewed', '--contact-reviewed', '--phase-reviewed', '--parity-reviewed', '--sandbox-reviewed'];
const verticalSliceVisualChecks = [
  '--visual-check single-source-cohesion',
  '--visual-check readable-silhouette',
  '--visual-check anatomy-cohesion',
  '--visual-check production-visual-cohesion',
  '--visual-check socket-seams',
  '--visual-check motion-stability',
  '--visual-check sandbox-behavior',
];
async function verticalSliceEvidenceOk(owner, evidence, minSize = 512) {
  const evidencePath = evidence?.path ?? evidence?.absolute;
  if (!evidence?.exists || !evidencePath) {
    failures.push(`${owner}: evidence missing`);
    return;
  }
  if ((evidence.bytes ?? evidence.size ?? 0) < minSize) failures.push(`${owner}: evidence too small`);
  await fileOk(owner, evidencePath, minSize);
}
for (const target of verticalSliceTargets) {
  const item = verticalSliceById.get(target.id);
  if (!item) {
    failures.push(`${target.id}: vertical slice route missing`);
    continue;
  }
  const sourceEntry = sandboxQuickstartById.get(`source-${target.id}`);
  const runtimeEntry = sandboxQuickstartById.get(target.rigId ?? target.id);
  const rig = verticalSliceRigById.get(target.rigId ?? target.id);
  const cohesion = verticalSliceCohesionById.get(target.rigId ?? target.id);
  if (!rig) failures.push(`${target.id}: vertical slice missing articulated review manifest entry`);
  if (!cohesion) failures.push(`${target.id}: vertical slice missing visual cohesion entry`);
  if (item.rank !== target.rank) failures.push(`${target.id}: vertical slice rank mismatch`);
  if (item.species !== target.species) failures.push(`${target.id}: vertical slice species mismatch`);
  if (item.stage !== target.stage) failures.push(`${target.id}: vertical slice stage mismatch`);
  if (item.acceptance?.accepted !== Boolean(target.accepted)) failures.push(`${target.id}: vertical slice accepted mismatch`);
  if (!item.contract?.ready) failures.push(`${target.id}: vertical slice contract not ready`);
  if (!item.source?.ready) failures.push(`${target.id}: vertical slice source evidence not ready`);
  if (!item.sourceReview?.readyForHumanReview) failures.push(`${target.id}: vertical slice source review not ready`);
  if (item.sourceReview?.humanApproved !== Boolean(target.sourceApproved)) failures.push(`${target.id}: vertical slice source approval mismatch`);
  if (!item.plan?.ready) failures.push(`${target.id}: vertical slice plan not ready`);
  if (!item.rigQuality?.ready) failures.push(`${target.id}: vertical slice rig quality evidence not ready`);
  if (!item.runtime?.ready) failures.push(`${target.id}: vertical slice runtime not ready`);
  if (!item.runtimeVisual?.ready) failures.push(`${target.id}: vertical slice runtime visual evidence not ready`);
  if (!item.audit?.ready) failures.push(`${target.id}: vertical slice audit evidence not ready`);
  if (item.runtimeVisual?.companion !== 'diver') failures.push(`${target.id}: vertical slice runtime visual must be paired with diver`);
  for (const state of ['idle', 'lunge', 'stunned']) {
    if (!(item.runtimeVisual?.states ?? []).includes(state)) failures.push(`${target.id}: vertical slice runtime visual missing ${state}`);
  }
  if (item.audit?.countsTowardGate !== Boolean(target.accepted)) failures.push(`${target.id}: vertical slice audit countsTowardGate mismatch`);
  if (item.rigQuality?.status !== rig?.quality?.status) failures.push(`${target.id}: vertical slice rig quality status mismatch`);
  if (item.rigQuality?.autoVisualCohesion?.status !== (rig?.autoVisualCohesion?.status ?? cohesion?.status)) failures.push(`${target.id}: vertical slice automated cohesion status mismatch`);
  if (item.rigQuality?.autoVisualCohesion?.status !== 'pass') failures.push(`${target.id}: vertical slice automated cohesion must pass`);
  if (item.rigQuality?.autoVisualCohesion?.productionStatus !== 'requires-human-review') failures.push(`${target.id}: vertical slice must preserve human production-review boundary`);
  if (!item.rigQuality?.humanReviewRequired) failures.push(`${target.id}: vertical slice rig quality must require human review`);
  if ((item.rigQuality?.sourceParity?.failures ?? []).length) failures.push(`${target.id}: vertical slice source parity failures are present`);
  for (const flag of verticalSliceReviewFlags) {
    if (!(item.rigQuality?.requiredAcceptanceFlags ?? []).includes(flag)) failures.push(`${target.id}: vertical slice missing acceptance review flag ${flag}`);
  }
  for (const flag of verticalSliceVisualChecks) {
    if (!(item.rigQuality?.requiredAcceptanceFlags ?? []).includes(flag)) failures.push(`${target.id}: vertical slice missing visual check ${flag}`);
  }
  if (!(item.commands ?? []).includes(sourceEntry?.pairedPreviewCommand)) failures.push(`${target.id}: vertical slice missing source paired preview command`);
  if (!(item.commands ?? []).includes(runtimeEntry?.pairedPreviewCommand)) failures.push(`${target.id}: vertical slice missing runtime paired preview command`);
  if (!(item.commands ?? []).includes(runtimeEntry?.pairedVisualCheckCommand)) failures.push(`${target.id}: vertical slice missing runtime paired visual command`);
  if (!(item.commands ?? []).some((command) => String(command).includes('content-candidate-paired-visuals-report.json'))) failures.push(`${target.id}: vertical slice missing content candidate paired visual report command`);
  if (!(item.commands ?? []).some((command) => String(command).includes('npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview'))) {
    failures.push(`${target.id}: vertical slice missing articulated rig quality refresh command`);
  }
  if (!(item.commands ?? []).some((command) => String(command).includes('npm run content:acceptance-audit'))) failures.push(`${target.id}: vertical slice missing acceptance audit command`);
  for (const command of item.commands ?? []) {
    if ((String(command).includes('npm run source:accept ') || String(command).includes('npm run content:accept ')) && !String(command).includes('--dry-run')) {
      failures.push(`${target.id}: vertical slice decision commands must be dry-run`);
    }
    if (!verticalSliceMarkdown.includes(command)) failures.push(`${target.id}: vertical slice markdown missing command ${command}`);
  }
  await verticalSliceEvidenceOk(`${target.id}: vertical slice rig contact sheet`, item.rigQuality?.evidence?.contactSheet);
  await verticalSliceEvidenceOk(`${target.id}: vertical slice rig contact thumbnail`, item.rigQuality?.evidence?.contactThumb);
  await verticalSliceEvidenceOk(`${target.id}: vertical slice rig phase strip`, item.rigQuality?.evidence?.phaseStrip);
  await verticalSliceEvidenceOk(`${target.id}: vertical slice rig phase thumbnail`, item.rigQuality?.evidence?.phaseThumb);
  await verticalSliceEvidenceOk(`${target.id}: vertical slice rig source parity`, item.rigQuality?.evidence?.sourceParity);
  await verticalSliceEvidenceOk(`${target.id}: vertical slice rig source parity thumbnail`, item.rigQuality?.evidence?.sourceParityThumb);
  if (!verticalSliceMarkdown.includes(target.id)) failures.push(`${target.id}: vertical slice markdown missing id`);
  if (!textIncludesHtml(verticalSliceHtml, `data-vertical-slice-route="${target.id}"`)) failures.push(`${target.id}: vertical slice html missing route marker`);
  if (!textIncludesHtml(verticalSliceHtml, item.runtimeVisual?.screenshotPath)) failures.push(`${target.id}: vertical slice html missing runtime visual screenshot path`);
  for (const rigMedia of [
    item.rigQuality?.media?.contactThumb,
    item.rigQuality?.media?.phaseThumb,
    item.rigQuality?.media?.sourceParityThumb,
  ]) {
    if (rigMedia && !textIncludesHtml(verticalSliceHtml, rigMedia)) failures.push(`${target.id}: vertical slice html missing rig quality media ${rigMedia}`);
  }
  if (item.audit?.htmlHref && !textIncludesHtml(verticalSliceHtml, item.audit.htmlHref)) failures.push(`${target.id}: vertical slice html missing audit link`);
}
if (!verticalSliceMarkdown.includes('Water9 Content Vertical Slice Runway')) failures.push('vertical slice markdown missing title');
if (!verticalSliceMarkdown.includes('Prototype screenshots do not count as accepted content')) failures.push('vertical slice markdown missing prototype disclosure');
if (!verticalSliceHtml.includes('Per-threat proof chain')) failures.push('vertical slice html missing proof chain copy');
if (!verticalSliceHtml.includes('Runtime Visuals')) failures.push('vertical slice html missing runtime visuals section');
if (!verticalSliceHtml.includes('Rig Quality')) failures.push('vertical slice html missing rig quality section');
if (!verticalSliceHtml.includes('human production approval still required')) failures.push('vertical slice html missing human production review disclosure');
if (!textIncludesHtml(verticalSliceHtml, 'npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview')) failures.push('vertical slice html missing rig quality refresh command');
if (!verticalSliceHtml.includes('Acceptance Audit')) failures.push('vertical slice html missing acceptance audit section');
if (!verticalSliceHtml.includes('npm run content:goal-gate')) failures.push('vertical slice html missing final gate command');

if (humanSignoff?.schema !== 'water9/content-human-signoff-queue@1') failures.push(`human sign-off queue schema is ${humanSignoff?.schema ?? 'missing'}`);
await fileOk('human sign-off markdown', paths.humanSignoffMarkdown, 1024);
await fileOk('human sign-off html', paths.humanSignoffHtml, 4096);
const humanSignoffItems = Array.isArray(humanSignoff?.items) ? humanSignoff.items : [];
if ((humanSignoff?.summary?.items ?? -1) !== humanSignoffItems.length) failures.push('human sign-off summary items mismatch');
if ((humanSignoff?.summary?.targetThreats ?? -1) !== (verticalSlice?.summary?.targetThreats ?? 20)) failures.push('human sign-off targetThreats mismatch');
if (humanSignoffItems.length !== verticalSliceItems.length) failures.push('human sign-off item count must match vertical slice runway');
if ((humanSignoff?.summary?.readyForSourceSignoff ?? -1) !== humanSignoffItems.filter((item) => item.sourceApprovalReady && !item.sourceApproved).length) failures.push('human sign-off readyForSourceSignoff mismatch');
if ((humanSignoff?.summary?.sourceRegenerationRequired ?? -1) !== humanSignoffItems.filter((item) => item.sourceCriticRegenerationRequired && !item.sourceApproved).length) failures.push('human sign-off sourceRegenerationRequired mismatch');
if ((humanSignoff?.summary?.sourceBlockedBeforeSignoff ?? -1) !== humanSignoffItems.filter((item) => !item.sourceApprovalReady && !item.sourceApproved).length) failures.push('human sign-off sourceBlockedBeforeSignoff mismatch');
if ((humanSignoff?.summary?.readyForThreatSignoff ?? -1) !== humanSignoffItems.filter((item) => item.sourceApproved && !item.threatAccepted).length) failures.push('human sign-off readyForThreatSignoff mismatch');
if ((humanSignoff?.summary?.acceptedThreats ?? -1) !== humanSignoffItems.filter((item) => item.threatAccepted).length) failures.push('human sign-off acceptedThreats mismatch');
if (humanSignoff?.summary?.allItemsHaveDryRunCommands !== humanSignoffItems.every((item) => (item.commands ?? []).every((command) => {
  const text = String(command ?? '');
  return !(text.includes('npm run source:accept ') || text.includes('npm run content:accept ')) || text.includes('--dry-run');
}))) failures.push('human sign-off dry-run summary mismatch');
const humanSignoffById = new Map(humanSignoffItems.map((item) => [item.id, item]));
for (const target of verticalSliceTargets) {
  const item = humanSignoffById.get(target.id);
  const vertical = verticalSliceById.get(target.id);
  if (!item) {
    failures.push(`${target.id}: human sign-off item missing`);
    continue;
  }
  if (item.rank !== target.rank) failures.push(`${target.id}: human sign-off rank mismatch`);
  if (item.species !== target.species) failures.push(`${target.id}: human sign-off species mismatch`);
  if (item.routeState !== vertical?.routeState) failures.push(`${target.id}: human sign-off routeState mismatch`);
  if (item.sourceApproved !== Boolean(vertical?.sourceReview?.humanApproved)) failures.push(`${target.id}: human sign-off source approval mismatch`);
  const approvalItem = sourceApprovalItems.find((entry) => entry.id === target.id);
  if (item.sourceApprovalReady !== Boolean(item.sourceApproved || approvalItem?.readyForHumanReview)) failures.push(`${target.id}: human sign-off sourceApprovalReady mismatch`);
  if (item.sourceMechanicallyReady !== Boolean(approvalItem?.mechanicallyReadyForHumanReview)) failures.push(`${target.id}: human sign-off sourceMechanicallyReady mismatch`);
  if (item.sourceCriticRegenerationRequired !== Boolean(approvalItem?.criticRegenerationRequired)) failures.push(`${target.id}: human sign-off sourceCriticRegenerationRequired mismatch`);
  if (item.threatAccepted !== Boolean(vertical?.acceptance?.accepted)) failures.push(`${target.id}: human sign-off threat acceptance mismatch`);
  if (!item.policy?.humanReviewerRequired || !item.policy?.automationCannotApprove || !item.policy?.commandsAreDryRunOnly) failures.push(`${target.id}: human sign-off policy is incomplete`);
  if (!item.evidence?.sourceQuickReview || !item.evidence?.contactSheet || !item.evidence?.phaseStrip || !item.evidence?.sourceParity || !item.evidence?.auditHtml) failures.push(`${target.id}: human sign-off evidence links are incomplete`);
  if (!(item.commands ?? []).some((command) => String(command).includes('npm run source:accept ') && String(command).includes('--dry-run'))) failures.push(`${target.id}: human sign-off missing source dry-run command`);
  if (!(item.commands ?? []).some((command) => String(command).includes('npm run content:accept ') && String(command).includes('--dry-run'))) failures.push(`${target.id}: human sign-off missing threat dry-run command`);
  if (item.sourceCriticRegenerationRequired) {
    if (!item.blockers?.includes('critic regeneration required before human source approval')) failures.push(`${target.id}: human sign-off missing critic regeneration blocker`);
    if (!(item.commands ?? []).some((command) => String(command).includes('source-critic-regeneration-queue.json'))) failures.push(`${target.id}: human sign-off missing critic regeneration command`);
  }
  for (const command of item.commands ?? []) {
    if ((String(command).includes('npm run source:accept ') || String(command).includes('npm run content:accept ')) && !String(command).includes('--dry-run')) {
      failures.push(`${target.id}: human sign-off command must remain dry-run`);
    }
    if (!humanSignoffMarkdown.includes(command)) failures.push(`${target.id}: human sign-off markdown missing command ${command}`);
  }
  if (!textIncludesHtml(humanSignoffHtml, `data-human-signoff-route="${target.id}"`)) failures.push(`${target.id}: human sign-off html missing route marker`);
}
if (!humanSignoffMarkdown.includes('Water9 Human Content Sign-Off Queue')) failures.push('human sign-off markdown missing title');
if (!humanSignoffMarkdown.includes('Automation can package evidence and run dry-runs; it cannot approve source art or accept threats.')) failures.push('human sign-off markdown missing automation boundary');
if (!humanSignoffHtml.includes('human reviewer required; dry-run commands only')) failures.push('human sign-off html missing policy copy');
if (!humanSignoffMarkdown.includes('Source regeneration required') && !humanSignoffHtml.includes('critic regeneration')) failures.push('human sign-off rendered outputs missing critic regeneration count');
if (!textIncludesHtml(humanSignoffHtml, 'npm run content:human-signoff && npm run content:human-signoff-check')) failures.push('human sign-off html missing check command');
if (!humanSignoffHtml.includes('content:goal-gate') && !humanSignoffHtml.includes('content:goal-gate')) failures.push('human sign-off html missing final gate command');

if (humanAdjudicationBoard?.schema !== 'water9/content-human-adjudication-board@1') failures.push(`human adjudication board schema is ${humanAdjudicationBoard?.schema ?? 'missing'}`);
await fileOk('human adjudication board markdown', paths.humanAdjudicationBoardMarkdown, 1024);
await fileOk('human adjudication board html', paths.humanAdjudicationBoardHtml, 4096);
const humanAdjudicationItems = Array.isArray(humanAdjudicationBoard?.items) ? humanAdjudicationBoard.items : [];
if ((humanAdjudicationBoard?.summary?.items ?? -1) !== humanAdjudicationItems.length) failures.push('human adjudication board summary items mismatch');
if ((humanAdjudicationBoard?.summary?.targetThreats ?? -1) !== (humanSignoff?.summary?.targetThreats ?? minThreats)) failures.push('human adjudication board targetThreats mismatch');
if (humanAdjudicationItems.length !== humanSignoffItems.length) failures.push('human adjudication board item count must match human sign-off queue');
if ((humanAdjudicationBoard?.summary?.sourceReady ?? -1) !== humanAdjudicationItems.filter((item) => item.sourceReady).length) failures.push('human adjudication board sourceReady summary mismatch');
if ((humanAdjudicationBoard?.summary?.sourceApprovalReady ?? -1) !== humanAdjudicationItems.filter((item) => item.sourceApprovalReady && !item.sourceApproved).length) failures.push('human adjudication board sourceApprovalReady summary mismatch');
if ((humanAdjudicationBoard?.summary?.sourceCriticRegenerationRequired ?? -1) !== humanAdjudicationItems.filter((item) => item.sourceCriticRegenerationRequired && !item.sourceApproved).length) failures.push('human adjudication board sourceCriticRegenerationRequired summary mismatch');
if ((humanAdjudicationBoard?.summary?.threatReady ?? -1) !== humanAdjudicationItems.filter((item) => item.threatReady).length) failures.push('human adjudication board threatReady summary mismatch');
if ((humanAdjudicationBoard?.summary?.allMediaPresent ?? -1) !== humanAdjudicationItems.filter((item) => item.media?.every((entry) => entry.present)).length) failures.push('human adjudication board allMediaPresent summary mismatch');
if ((humanAdjudicationBoard?.summary?.sourceApprovalCommands ?? -1) !== humanAdjudicationItems.filter((item) => item.commands?.sourceApprovalDryRun?.includes('--dry-run')).length) failures.push('human adjudication board sourceApprovalCommands summary mismatch');
if ((humanAdjudicationBoard?.summary?.threatAcceptanceCommands ?? -1) !== humanAdjudicationItems.filter((item) => item.commands?.threatAcceptanceDryRun?.includes('--dry-run')).length) failures.push('human adjudication board threatAcceptanceCommands summary mismatch');
if ((humanAdjudicationBoard?.summary?.sourcePreviewBoundaries ?? -1) !== humanAdjudicationItems.filter((item) => item.previewBoundaries?.source?.productionBoundary?.schema === 'water9/sandbox-production-boundary@1').length) failures.push('human adjudication board sourcePreviewBoundaries summary mismatch');
if ((humanAdjudicationBoard?.summary?.runtimePreviewBoundaries ?? -1) !== humanAdjudicationItems.filter((item) => item.previewBoundaries?.runtime?.productionBoundary?.schema === 'water9/sandbox-production-boundary@1').length) failures.push('human adjudication board runtimePreviewBoundaries summary mismatch');
if ((humanAdjudicationBoard?.summary?.previewOnlySources ?? -1) !== humanAdjudicationItems.filter((item) => item.previewBoundaries?.source?.previewOnly === true).length) failures.push('human adjudication board previewOnlySources summary mismatch');
if ((humanAdjudicationBoard?.summary?.previewOnlyRuntimes ?? -1) !== humanAdjudicationItems.filter((item) => item.previewBoundaries?.runtime?.previewOnly === true).length) failures.push('human adjudication board previewOnlyRuntimes summary mismatch');
const humanAdjudicationById = new Map(humanAdjudicationItems.map((item) => [item.id, item]));
for (const signoffItem of humanSignoffItems) {
  const item = humanAdjudicationById.get(signoffItem.id);
  if (!item) {
    failures.push(`${signoffItem.id}: human adjudication board item missing`);
    continue;
  }
  if (item.species !== signoffItem.species) failures.push(`${signoffItem.id}: human adjudication board species mismatch`);
  if (item.sourceApprovalReady !== Boolean(signoffItem.sourceApprovalReady)) failures.push(`${signoffItem.id}: human adjudication board sourceApprovalReady mismatch`);
  if (item.sourceCriticRegenerationRequired !== Boolean(signoffItem.sourceCriticRegenerationRequired)) failures.push(`${signoffItem.id}: human adjudication board sourceCriticRegenerationRequired mismatch`);
  const expectedSourceReady = Boolean(signoffItem.sourceApprovalReady) && item.media?.slice(0, 4).every((entry) => entry.present) && Boolean(item.commands?.sourceApprovalDryRun);
  if (item.sourceReady !== expectedSourceReady) failures.push(`${signoffItem.id}: human adjudication board sourceReady should follow approval runway`);
  const expectedThreatReady = expectedSourceReady && signoffItem.sourceApproved === true && Boolean(signoffItem.rigEvidenceReady) && item.media?.every((entry) => entry.present) && Boolean(item.commands?.threatAcceptanceDryRun);
  if (item.threatReady !== expectedThreatReady) failures.push(`${signoffItem.id}: human adjudication board threatReady should require source-ready evidence`);
  for (const label of ['source art', 'magenta key preview', 'source sandbox preview', 'articulation plan preview', 'source parity overlay', 'contact sheet', 'phase strip', 'sandbox idle', 'sandbox lunge', 'sandbox stunned']) {
    const media = item.media?.find((entry) => entry.label === label);
    if (!media?.url || !media?.present) failures.push(`${signoffItem.id}: human adjudication board missing ${label}`);
    if (media?.url && !textIncludesHtml(humanAdjudicationBoardHtml, media.url)) failures.push(`${signoffItem.id}: human adjudication board html missing ${label} url`);
  }
  for (const [label, command, expected] of [
    ['source preview', item.commands?.sourcePreview, `npm run sandbox:preview -- --id source-${signoffItem.id}`],
    ['runtime preview', item.commands?.runtimePreview, `npm run sandbox:preview -- --id ${signoffItem.id}`],
    ['source approval dry-run', item.commands?.sourceApprovalDryRun, `npm run source:accept -- --id ${signoffItem.id}`],
    ['threat acceptance dry-run', item.commands?.threatAcceptanceDryRun, `npm run content:accept -- --id ${signoffItem.id}`],
  ]) {
    if (!String(command ?? '').includes(expected)) failures.push(`${signoffItem.id}: human adjudication board ${label} command must include ${expected}`);
    if (label.includes('dry-run') && !String(command ?? '').includes('--dry-run')) failures.push(`${signoffItem.id}: human adjudication board ${label} command must be dry-run`);
    if (command && !humanAdjudicationBoardMarkdown.includes(command) && !textIncludesHtml(humanAdjudicationBoardHtml, command)) failures.push(`${signoffItem.id}: human adjudication board rendered outputs missing ${label} command`);
  }
  for (const [label, boundary] of [
    ['source', item.previewBoundaries?.source],
    ['runtime', item.previewBoundaries?.runtime],
  ]) {
    if (boundary?.productionBoundary?.schema !== 'water9/sandbox-production-boundary@1') failures.push(`${signoffItem.id}: human adjudication board missing ${label} sandbox production boundary`);
    if (boundary?.acceptedForContentGate !== boundary?.productionBoundary?.acceptedForContentGate) failures.push(`${signoffItem.id}: human adjudication board ${label} boundary acceptedForContentGate mismatch`);
    if (boundary?.productionBoundary?.productionReady !== boundary?.acceptedForContentGate) failures.push(`${signoffItem.id}: human adjudication board ${label} boundary productionReady mismatch`);
    if (boundary?.acceptedForContentGate !== true && boundary?.previewOnly !== true) failures.push(`${signoffItem.id}: human adjudication board ${label} preview must be preview-only`);
    if (!String(boundary?.claim ?? '').trim()) failures.push(`${signoffItem.id}: human adjudication board ${label} preview boundary missing claim`);
    if (!String(boundary?.manualReviewRequired ?? '').trim()) failures.push(`${signoffItem.id}: human adjudication board ${label} preview boundary missing manualReviewRequired`);
    if (boundary?.claim && !humanAdjudicationBoardMarkdown.includes(boundary.claim) && !textIncludesHtml(humanAdjudicationBoardHtml, boundary.claim)) failures.push(`${signoffItem.id}: human adjudication board rendered outputs missing ${label} boundary claim`);
  }
  if (!textIncludesHtml(humanAdjudicationBoardHtml, `data-human-adjudication="${signoffItem.id}"`)) failures.push(`${signoffItem.id}: human adjudication board html missing row marker`);
}
for (const required of [
  'Water9 Human Adjudication Board',
  'Dense human review board for the 20-threat gate',
  'Human Approval Boundary',
  'critic-regeneration',
  'approval-ready',
  'source preview boundary',
  'runtime preview boundary',
  'preview-only runtimes',
  'Automation can gather evidence and produce dry-run commands',
  'npm run content:human-adjudication-board',
  'npm run content:human-adjudication-board-check',
]) {
  if (!humanAdjudicationBoardMarkdown.includes(required) && !textIncludesHtml(humanAdjudicationBoardHtml, required)) failures.push(`human adjudication board rendered outputs missing ${required}`);
}

if (contentReviewSession?.schema !== 'water9/content-review-session@1') failures.push(`content review session schema is ${contentReviewSession?.schema ?? 'missing'}`);
await fileOk('content review session markdown', paths.contentReviewSessionMarkdown, 1024);
await fileOk('content review session html', paths.contentReviewSessionHtml, 4096);
const contentReviewSessionItems = Array.isArray(contentReviewSession?.items) ? contentReviewSession.items : [];
if ((contentReviewSession?.summary?.items ?? -1) !== contentReviewSessionItems.length) failures.push('content review session summary items mismatch');
if ((contentReviewSession?.summary?.targetThreats ?? -1) !== (humanAdjudicationBoard?.summary?.targetThreats ?? minThreats)) failures.push('content review session targetThreats mismatch');
if (contentReviewSessionItems.length !== humanAdjudicationItems.length) failures.push('content review session item count must match human adjudication board');
if ((contentReviewSession?.summary?.sourceReady ?? -1) !== contentReviewSessionItems.filter((item) => item.sourceReady).length) failures.push('content review session sourceReady summary mismatch');
if ((contentReviewSession?.summary?.sourceApprovalReady ?? -1) !== contentReviewSessionItems.filter((item) => item.sourceApprovalReady && !item.sourceApproved).length) failures.push('content review session sourceApprovalReady summary mismatch');
if ((contentReviewSession?.summary?.sourceCriticRegenerationRequired ?? -1) !== contentReviewSessionItems.filter((item) => item.sourceCriticRegenerationRequired && !item.sourceApproved).length) failures.push('content review session sourceCriticRegenerationRequired summary mismatch');
if ((contentReviewSession?.summary?.threatReady ?? -1) !== contentReviewSessionItems.filter((item) => item.threatReady).length) failures.push('content review session threatReady summary mismatch');
if ((contentReviewSession?.summary?.allMediaPresent ?? -1) !== contentReviewSessionItems.filter((item) => item.media?.every((entry) => entry.present)).length) failures.push('content review session allMediaPresent summary mismatch');
if ((contentReviewSession?.summary?.sourceApproved ?? -1) !== contentReviewSessionItems.filter((item) => item.sourceApproved).length) failures.push('content review session sourceApproved summary mismatch');
if ((contentReviewSession?.summary?.acceptedThreats ?? -1) !== contentReviewSessionItems.filter((item) => item.threatAccepted).length) failures.push('content review session acceptedThreats summary mismatch');
if ((contentReviewSession?.summary?.sourcePreviewBoundaries ?? -1) !== contentReviewSessionItems.filter((item) => item.previewBoundaries?.source?.productionBoundary?.schema === 'water9/sandbox-production-boundary@1').length) failures.push('content review session sourcePreviewBoundaries summary mismatch');
if ((contentReviewSession?.summary?.runtimePreviewBoundaries ?? -1) !== contentReviewSessionItems.filter((item) => item.previewBoundaries?.runtime?.productionBoundary?.schema === 'water9/sandbox-production-boundary@1').length) failures.push('content review session runtimePreviewBoundaries summary mismatch');
if ((contentReviewSession?.summary?.previewOnlySources ?? -1) !== contentReviewSessionItems.filter((item) => item.previewBoundaries?.source?.previewOnly === true).length) failures.push('content review session previewOnlySources summary mismatch');
if ((contentReviewSession?.summary?.previewOnlyRuntimes ?? -1) !== contentReviewSessionItems.filter((item) => item.previewBoundaries?.runtime?.previewOnly === true).length) failures.push('content review session previewOnlyRuntimes summary mismatch');
if (contentReviewSession?.sourceDecisionFileTemplate?.schema !== 'water9/source-cohesion-decisions@1') failures.push('content review session source decision template schema mismatch');
if (contentReviewSession?.workspace?.editableDecisionJson !== true) failures.push('content review session must expose editable decision JSON');
if (contentReviewSession?.workspace?.perTargetDecisionControls !== true) failures.push('content review session must expose per-target decision controls');
if (contentReviewSession?.workspace?.reviewedOnlyDecisionJson !== true) failures.push('content review session must expose reviewed-only decision JSON');
if (contentReviewSession?.workspace?.strictValidatorsRemainRequired !== true) failures.push('content review session must require strict validators after export');
if (contentReviewSession?.sourceDecisionFileTemplate?.policy?.humanAuthored !== true) failures.push('content review session source decision template must be human-authored');
if (contentReviewSession?.sourceDecisionFileTemplate?.policy?.automationCannotApproveCohesion !== true) failures.push('content review session source decision template must block automation source approval');
if ((contentReviewSession?.sourceDecisionFileTemplate?.decisions ?? []).length !== contentReviewSessionItems.length) failures.push('content review session source decision template count mismatch');
if (contentReviewSession?.threatDecisionFileTemplate?.schema !== 'water9/content-threat-acceptance-decisions@1') failures.push('content review session threat decision template schema mismatch');
if (contentReviewSession?.threatDecisionFileTemplate?.policy?.humanAuthored !== true) failures.push('content review session threat decision template must be human-authored');
if (contentReviewSession?.threatDecisionFileTemplate?.policy?.automationCannotAcceptThreats !== true) failures.push('content review session threat decision template must block automation threat acceptance');
if ((contentReviewSession?.threatDecisionFileTemplate?.decisions ?? []).length !== contentReviewSessionItems.length) failures.push('content review session threat decision template count mismatch');
const humanAdjudicationByIdForSession = new Map(humanAdjudicationItems.map((item) => [item.id, item]));
for (const item of contentReviewSessionItems) {
  const boardItem = humanAdjudicationByIdForSession.get(item.id);
  if (!boardItem) failures.push(`${item.id}: content review session item missing from human adjudication board`);
  if (boardItem && item.species !== boardItem.species) failures.push(`${item.id}: content review session species mismatch`);
  if (boardItem && item.sourceReady !== boardItem.sourceReady) failures.push(`${item.id}: content review session sourceReady mismatch`);
  if (boardItem && item.sourceApprovalReady !== boardItem.sourceApprovalReady) failures.push(`${item.id}: content review session sourceApprovalReady mismatch`);
  if (boardItem && item.sourceCriticRegenerationRequired !== boardItem.sourceCriticRegenerationRequired) failures.push(`${item.id}: content review session sourceCriticRegenerationRequired mismatch`);
  if (boardItem && item.threatReady !== boardItem.threatReady) failures.push(`${item.id}: content review session threatReady mismatch`);
	  if (!item.media?.every((entry) => entry.present)) failures.push(`${item.id}: content review session media should all be present`);
	  if (!item.sourceDecision?.evidenceFingerprint?.digest) failures.push(`${item.id}: content review session source evidence fingerprint missing`);
	  if (!item.threatDecision?.evidenceFingerprint?.digest) failures.push(`${item.id}: content review session threat evidence fingerprint missing`);
	  if (item.threatDecision?.sourceCandidateId !== item.id) failures.push(`${item.id}: content review session threat sourceCandidateId should default to target id`);
	  if (!contentReviewSessionMarkdown.includes(`${item.sourceApproved ? 'approved' : 'not approved'}`)) failures.push(`${item.id}: content review session markdown missing source approval truth`);
	  if (!contentReviewSessionMarkdown.includes(`${item.threatAccepted ? 'accepted' : 'not accepted'}`)) failures.push(`${item.id}: content review session markdown missing threat acceptance truth`);
  for (const [label, boundary] of [
    ['source', item.previewBoundaries?.source],
    ['runtime', item.previewBoundaries?.runtime],
  ]) {
    const boardBoundary = boardItem?.previewBoundaries?.[label];
    if (boundary?.productionBoundary?.schema !== 'water9/sandbox-production-boundary@1') failures.push(`${item.id}: content review session missing ${label} sandbox production boundary`);
    if (boardBoundary && boundary?.claim !== boardBoundary.claim) failures.push(`${item.id}: content review session ${label} boundary claim mismatch`);
    if (boundary?.acceptedForContentGate !== boundary?.productionBoundary?.acceptedForContentGate) failures.push(`${item.id}: content review session ${label} boundary acceptedForContentGate mismatch`);
    if (boundary?.productionBoundary?.productionReady !== boundary?.acceptedForContentGate) failures.push(`${item.id}: content review session ${label} boundary productionReady mismatch`);
    if (boundary?.acceptedForContentGate !== true && boundary?.previewOnly !== true) failures.push(`${item.id}: content review session ${label} preview must be preview-only`);
    if (!String(boundary?.claim ?? '').trim()) failures.push(`${item.id}: content review session ${label} preview boundary missing claim`);
    if (!String(boundary?.manualReviewRequired ?? '').trim()) failures.push(`${item.id}: content review session ${label} preview boundary missing manualReviewRequired`);
    if (boundary?.claim && !contentReviewSessionMarkdown.includes(boundary.claim) && !textIncludesHtml(contentReviewSessionHtml, boundary.claim)) failures.push(`${item.id}: content review session rendered outputs missing ${label} boundary claim`);
  }
  for (const [label, command, expected] of [
    ['source apply', item.commands?.sourceApplyDryRun, 'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict'],
    ['threat apply', item.commands?.threatApplyDryRun, 'npm run content:threat-decisions-apply -- --decisions water9-threat-acceptance-decisions.json --strict'],
    ['source approval', item.commands?.sourceApprovalDryRun, `npm run source:accept -- --id ${item.id}`],
    ['threat acceptance', item.commands?.threatAcceptanceDryRun, `npm run content:accept -- --id ${item.id}`],
  ]) {
    if (!String(command ?? '').includes(expected)) failures.push(`${item.id}: content review session ${label} command must include ${expected}`);
    if ((label === 'source approval' || label === 'threat acceptance') && !String(command ?? '').includes('--dry-run')) failures.push(`${item.id}: content review session ${label} command must be dry-run`);
  }
  if (!textIncludesHtml(contentReviewSessionHtml, `data-review-session-target="${item.id}"`)) failures.push(`${item.id}: content review session html missing row marker`);
  if (!textIncludesHtml(contentReviewSessionHtml, `data-decision-controls="${item.id}"`)) failures.push(`${item.id}: content review session html missing decision controls marker`);
  if (!textIncludesHtml(contentReviewSessionHtml, `data-source-status="${item.id}"`)) failures.push(`${item.id}: content review session html missing source status control`);
  if (!textIncludesHtml(contentReviewSessionHtml, `data-threat-status="${item.id}"`)) failures.push(`${item.id}: content review session html missing threat status control`);
  if (!textIncludesHtml(contentReviewSessionHtml, 'data-source-check=')) failures.push(`${item.id}: content review session html missing source per-check controls`);
  if (!textIncludesHtml(contentReviewSessionHtml, 'data-threat-check=')) failures.push(`${item.id}: content review session html missing threat per-check controls`);
}
for (const required of [
  'Water9 Content Review Session',
  'Single-session workspace for human review of the 20-threat gate',
  'Human Approval Boundary',
  'Gate truth:',
  'not accepted yet. Ready means reviewable, not approved or accepted.',
  'Human-approved sources:',
  'Approval-ready sources:',
  'Critic-regeneration sources:',
  'Accepted threats:',
  'Source preview boundaries:',
  'Runtime preview boundaries:',
  'source preview boundary',
  'runtime preview boundary',
  'preview-only runtimes',
  'Download source decisions',
  'Download reviewed-only source decisions',
  'Download threat decisions',
  'Download reviewed-only threat decisions',
  'Regenerate decision JSON from controls',
  'data-reviewer',
  'data-reviewed-at',
  'data-regenerate-decisions',
  'data-source-reviewed-decision-output',
  'data-threat-reviewed-decision-output',
  'npm run content:review-session',
  'npm run content:review-session-check',
  'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
  'npm run content:threat-decisions-apply -- --decisions water9-threat-acceptance-reviewed-decisions.json --strict',
]) {
  if (!contentReviewSessionMarkdown.includes(required) && !textIncludesHtml(contentReviewSessionHtml, required)) failures.push(`content review session rendered outputs missing ${required}`);
}

if (contentProductionProof?.schema !== 'water9/content-production-proof@1') failures.push(`content production proof schema is ${contentProductionProof?.schema ?? 'missing'}`);
await fileOk('content production proof markdown', paths.contentProductionProofMarkdown, 1024);
await fileOk('content production proof html', paths.contentProductionProofHtml, 4096);
const contentProductionProofItems = Array.isArray(contentProductionProof?.items) ? contentProductionProof.items : [];
const stageTargetsForProductionProof = Array.isArray(stageBoard?.targets) ? stageBoard.targets : [];
if ((contentProductionProof?.summary?.candidates ?? -1) !== contentProductionProofItems.length) failures.push('content production proof summary candidates mismatch');
if ((contentProductionProof?.summary?.targetThreats ?? -1) !== (stageBoard?.summary?.targetThreats ?? minThreats)) failures.push('content production proof targetThreats mismatch');
if (contentProductionProofItems.length !== stageTargetsForProductionProof.length) failures.push('content production proof item count must match stage board');
if ((contentProductionProof?.summary?.acceptedThreats ?? -1) !== contentProductionProofItems.filter((item) => item.countsTowardGoal).length) failures.push('content production proof acceptedThreats summary mismatch');
if ((contentProductionProof?.summary?.prototypeOnly ?? -1) !== contentProductionProofItems.filter((item) => item.productionStatus === 'prototype-only').length) failures.push('content production proof prototypeOnly summary mismatch');
if ((contentProductionProof?.summary?.humanReviewRequired ?? -1) !== contentProductionProofItems.filter((item) => !item.countsTowardGoal).length) failures.push('content production proof humanReviewRequired summary mismatch');
if (contentProductionProof?.summary?.strictProductionReady !== ((contentProductionProof?.summary?.acceptedThreats ?? 0) >= (contentProductionProof?.summary?.targetThreats ?? minThreats))) failures.push('content production proof strictProductionReady summary mismatch');
if (contentProductionProof?.policy?.humanReviewerRequired !== true) failures.push('content production proof must require a human reviewer');
if (contentProductionProof?.policy?.automationCannotAcceptProduction !== true) failures.push('content production proof must block automation production acceptance');
if (contentProductionProof?.policy?.prototypePreviewIsNotProductionAcceptance !== true) failures.push('content production proof must state prototype previews are not production acceptance');
const stageByIdForProductionProof = new Map(stageTargetsForProductionProof.map((target) => [target.id, target]));
for (const item of contentProductionProofItems) {
  const target = stageByIdForProductionProof.get(item.id);
  if (!target) failures.push(`${item.id}: production proof item missing from stage board`);
  if (target && item.species !== target.species) failures.push(`${item.id}: production proof species mismatch`);
  if (item.countsTowardGoal && item.blockers?.length > 0) failures.push(`${item.id}: production proof accepted item cannot have blockers`);
  if (!item.countsTowardGoal && (!Array.isArray(item.blockers) || item.blockers.length < 1)) failures.push(`${item.id}: production proof blocked item must explain blockers`);
  if (item.rigStatus === 'prototype' && item.productionStatus !== 'prototype-only') failures.push(`${item.id}: production proof prototype rig must be prototype-only`);
  if (item.productionStatus === 'prototype-only' && item.countsTowardGoal) failures.push(`${item.id}: production proof prototype-only item cannot count`);
  if (!textIncludesHtml(contentProductionProofHtml, `data-production-proof="${item.id}"`)) failures.push(`${item.id}: production proof html missing row marker`);
  for (const command of item.commands ?? []) {
    if (command && !contentProductionProofMarkdown.includes(command) && !textIncludesHtml(contentProductionProofHtml, command)) failures.push(`${item.id}: production proof rendered outputs missing command ${command}`);
  }
}
for (const required of [
  'Water9 Production Proof',
  'Prototype preview is not production acceptance',
  'Acceptance Rule',
  'Strict production ready',
  'npm run content:production-proof',
  'npm run content:production-proof-check',
]) {
  if (!contentProductionProofMarkdown.includes(required) && !textIncludesHtml(contentProductionProofHtml, required)) failures.push(`content production proof rendered outputs missing ${required}`);
}

if (contentPromoteApprovedThreats?.schema !== 'water9/content-promote-approved-threats@1') failures.push(`content promote approved threats schema is ${contentPromoteApprovedThreats?.schema ?? 'missing'}`);
await fileOk('content promote approved threats markdown', paths.contentPromoteApprovedThreatsMarkdown, 1024);
await fileOk('content promote approved threats html', paths.contentPromoteApprovedThreatsHtml, 4096);
const contentPromoteApprovedThreatsItems = Array.isArray(contentPromoteApprovedThreats?.items) ? contentPromoteApprovedThreats.items : [];
const allThreatDecisionIdsForPromotion = new Set((threatAcceptanceDecisions?.decisions ?? []).map((item) => item.id));
const targetIdsForPromotion = new Set(humanAdjudicationItems.map((item) => item.id));
if ((contentPromoteApprovedThreats?.summary?.items ?? -1) !== contentPromoteApprovedThreatsItems.length) failures.push('content promote approved threats summary items mismatch');
if ((contentPromoteApprovedThreats?.summary?.targetThreats ?? -1) !== (humanAdjudicationBoard?.summary?.targetThreats ?? minThreats)) failures.push('content promote approved threats targetThreats mismatch');
if (contentPromoteApprovedThreatsItems.length !== humanAdjudicationItems.length) failures.push('content promote approved threats item count must match human adjudication board');
if ((contentPromoteApprovedThreats?.summary?.sourceApproved ?? -1) !== contentPromoteApprovedThreatsItems.filter((item) => item.sourceApproved).length) failures.push('content promote approved threats sourceApproved summary mismatch');
if ((contentPromoteApprovedThreats?.summary?.readyForThreatDecision ?? -1) !== contentPromoteApprovedThreatsItems.filter((item) => item.readyForDecision).length) failures.push('content promote approved threats readyForThreatDecision summary mismatch');
if ((contentPromoteApprovedThreats?.summary?.acceptedThreats ?? -1) !== contentPromoteApprovedThreatsItems.filter((item) => item.threatAccepted).length) failures.push('content promote approved threats acceptedThreats summary mismatch');
if ((contentPromoteApprovedThreats?.summary?.excludedNonTargetRigs ?? -1) !== [...allThreatDecisionIdsForPromotion].filter((id) => !targetIdsForPromotion.has(id)).length) failures.push('content promote approved threats excludedNonTargetRigs summary mismatch');
if ((contentPromoteApprovedThreats?.summary?.runtimeMappedTargets ?? -1) !== contentPromoteApprovedThreatsItems.filter((item) => item.runtimeMapped).length) failures.push('content promote approved threats runtimeMappedTargets summary mismatch');
if (contentPromoteApprovedThreats?.policy?.targetOnly !== true) failures.push('content promote approved threats must be target-only');
if (contentPromoteApprovedThreats?.policy?.excludesNonTargetRuntimePrototypes !== true) failures.push('content promote approved threats must exclude non-target prototypes');
if (contentPromoteApprovedThreats?.decisionFileTemplate?.policy?.targetOnlyThreatGoal !== true) failures.push('content promote approved threats decision file must be target-only');
if ((contentPromoteApprovedThreats?.decisionFileTemplate?.decisions ?? []).length !== contentPromoteApprovedThreatsItems.length) failures.push('content promote approved threats decision count mismatch');
const promoteBoardById = new Map(humanAdjudicationItems.map((item) => [item.id, item]));
for (const item of contentPromoteApprovedThreatsItems) {
  const boardItem = promoteBoardById.get(item.id);
  if (!boardItem) failures.push(`${item.id}: promote runway item missing from human adjudication board`);
  if (boardItem && item.species !== boardItem.species) failures.push(`${item.id}: promote runway species mismatch`);
  if (!allThreatDecisionIdsForPromotion.has(item.id)) failures.push(`${item.id}: promote runway target missing runtime threat decision mapping`);
  if (!item.readyForDecision && (!Array.isArray(item.blockers) || item.blockers.length < 1)) failures.push(`${item.id}: promote runway blocked item must explain blockers`);
  if (!item.commands?.applyTargetDecisionsStrict?.includes('water9-target-threat-acceptance-decisions.json --strict')) failures.push(`${item.id}: promote runway missing strict target apply command`);
  if (!item.commands?.threatAcceptanceDryRun?.includes('--dry-run')) failures.push(`${item.id}: promote runway threat acceptance command must be dry-run`);
  if (!textIncludesHtml(contentPromoteApprovedThreatsHtml, `data-promote-threat="${item.id}"`)) failures.push(`${item.id}: promote runway html missing row marker`);
}
for (const required of [
  'Water9 Promote Approved Threats',
  'Target-only promotion runway',
  'Download target-only threat decisions',
  'data-promote-approved-threats-workspace',
  'data-promote-threat-decisions',
  'npm run content:promote-approved-threats',
  'npm run content:promote-approved-threats-check',
  'water9-target-threat-acceptance-decisions.json --strict',
]) {
  if (!contentPromoteApprovedThreatsMarkdown.includes(required) && !textIncludesHtml(contentPromoteApprovedThreatsHtml, required)) failures.push(`content promote approved threats rendered outputs missing ${required}`);
}

if (contentSandboxRoster?.schema !== 'water9/content-sandbox-roster@1') failures.push(`content sandbox roster schema is ${contentSandboxRoster?.schema ?? 'missing'}`);
await fileOk('content sandbox roster markdown', paths.contentSandboxRosterMarkdown, 1024);
await fileOk('content sandbox roster html', paths.contentSandboxRosterHtml, 4096);
const sandboxById = new Map(sandboxEntries.map((entry) => [entry.id, entry]));
const contentSandboxRosterItems = Array.isArray(contentSandboxRoster?.items) ? contentSandboxRoster.items : [];
if ((contentSandboxRoster?.summary?.items ?? -1) !== contentSandboxRosterItems.length) failures.push('content sandbox roster summary items mismatch');
if ((contentSandboxRoster?.summary?.targetThreats ?? -1) !== (humanSignoff?.summary?.targetThreats ?? minThreats)) failures.push('content sandbox roster targetThreats mismatch');
if (contentSandboxRosterItems.length !== humanSignoffItems.length) failures.push('content sandbox roster item count must match human sign-off queue');
if ((contentSandboxRoster?.summary?.sandboxReady ?? -1) !== contentSandboxRosterItems.filter((item) => item.sandboxReady).length) failures.push('content sandbox roster sandboxReady summary mismatch');
if ((contentSandboxRoster?.summary?.runtimePreviews ?? -1) !== contentSandboxRosterItems.filter((item) => item.runtime?.previewCommand).length) failures.push('content sandbox roster runtimePreviews summary mismatch');
if ((contentSandboxRoster?.summary?.sourcePreviews ?? -1) !== contentSandboxRosterItems.filter((item) => item.source?.previewCommand).length) failures.push('content sandbox roster sourcePreviews summary mismatch');
const contentSandboxRosterById = new Map(contentSandboxRosterItems.map((item) => [item.id, item]));
for (const signoffItem of humanSignoffItems) {
  const item = contentSandboxRosterById.get(signoffItem.id);
  if (!item) {
    failures.push(`${signoffItem.id}: content sandbox roster item missing`);
    continue;
  }
  if (item.species !== signoffItem.species) failures.push(`${signoffItem.id}: content sandbox roster species mismatch`);
  if (item.stage !== signoffItem.stage) failures.push(`${signoffItem.id}: content sandbox roster stage mismatch`);
  if (!sandboxById.has(signoffItem.id)) failures.push(`${signoffItem.id}: sandbox manifest missing runtime entry for content roster`);
  if (!sandboxById.has(`source-${signoffItem.id}`)) failures.push(`${signoffItem.id}: sandbox manifest missing source entry for content roster`);
  if (item.sandboxReady !== Boolean(item.runtime && item.source)) failures.push(`${signoffItem.id}: content sandbox roster sandboxReady mismatch`);
  for (const [label, command, expected] of [
    ['runtime preview', item.runtime?.previewCommand, `npm run sandbox:preview -- --id ${signoffItem.id}`],
    ['runtime paired preview', item.runtime?.pairedPreviewCommand, `npm run sandbox:preview -- --id ${signoffItem.id} --with diver`],
    ['runtime visual', item.runtime?.visualCheckCommand, `npm run sandbox:visual -- --ids ${signoffItem.id}`],
    ['runtime paired visual', item.runtime?.pairedVisualCheckCommand, `npm run sandbox:visual -- --ids ${signoffItem.id}`],
    ['source preview', item.source?.previewCommand, `npm run sandbox:preview -- --id source-${signoffItem.id}`],
    ['source paired preview', item.source?.pairedPreviewCommand, `npm run sandbox:preview -- --id source-${signoffItem.id} --with diver`],
    ['source visual', item.source?.visualCheckCommand, `npm run sandbox:visual -- --ids source-${signoffItem.id}`],
    ['source paired visual', item.source?.pairedVisualCheckCommand, `npm run sandbox:visual -- --ids source-${signoffItem.id}`],
  ]) {
    if (!String(command ?? '').includes(expected)) failures.push(`${signoffItem.id}: content sandbox roster ${label} command must include ${expected}`);
    if (label.includes('paired') && !String(command ?? '').includes('--with diver')) failures.push(`${signoffItem.id}: content sandbox roster ${label} command must include --with diver`);
    if (command && !contentSandboxRosterMarkdown.includes(command)) failures.push(`${signoffItem.id}: content sandbox roster markdown missing ${label} command`);
    if (command && !textIncludesHtml(contentSandboxRosterHtml, command)) failures.push(`${signoffItem.id}: content sandbox roster html missing ${label} command`);
  }
  if (!textIncludesHtml(contentSandboxRosterHtml, `data-sandbox-roster="${signoffItem.id}"`)) failures.push(`${signoffItem.id}: content sandbox roster html missing row marker`);
}
for (const required of [
  'Water9 Content Sandbox Roster',
  'Quick launch surface for all 20 target threats',
  'Previewable does not mean accepted',
  'npm run content:sandbox-roster',
  'npm run content:sandbox-roster-check',
]) {
  if (!contentSandboxRosterMarkdown.includes(required) && !textIncludesHtml(contentSandboxRosterHtml, required)) failures.push(`content sandbox roster rendered outputs missing ${required}`);
}

if (contentArticulationRoster?.schema !== 'water9/content-articulation-roster@1') failures.push(`content articulation roster schema is ${contentArticulationRoster?.schema ?? 'missing'}`);
await fileOk('content articulation roster markdown', paths.contentArticulationRosterMarkdown, 1024);
await fileOk('content articulation roster html', paths.contentArticulationRosterHtml, 4096);
const contentArticulationRosterItems = Array.isArray(contentArticulationRoster?.items) ? contentArticulationRoster.items : [];
if ((contentArticulationRoster?.summary?.items ?? -1) !== contentArticulationRosterItems.length) failures.push('content articulation roster summary items mismatch');
if ((contentArticulationRoster?.summary?.targetThreats ?? -1) !== (humanSignoff?.summary?.targetThreats ?? minThreats)) failures.push('content articulation roster targetThreats mismatch');
if (contentArticulationRosterItems.length !== humanSignoffItems.length) failures.push('content articulation roster item count must match human sign-off queue');
if ((contentArticulationRoster?.summary?.mechanicallyReady ?? -1) !== contentArticulationRosterItems.filter((item) => item.mechanicallyReady).length) failures.push('content articulation roster mechanicallyReady summary mismatch');
if ((contentArticulationRoster?.summary?.magentaSourceImages ?? -1) !== contentArticulationRosterItems.filter((item) => item.checks?.magentaKeyDeclared).length) failures.push('content articulation roster magentaSourceImages summary mismatch');
if ((contentArticulationRoster?.summary?.starterPlans ?? -1) !== contentArticulationRosterItems.filter((item) => item.checks?.starterPlanPresent).length) failures.push('content articulation roster starterPlans summary mismatch');
if ((contentArticulationRoster?.summary?.planPreviews ?? -1) !== contentArticulationRosterItems.filter((item) => item.checks?.planPreviewPresent).length) failures.push('content articulation roster planPreviews summary mismatch');
if ((contentArticulationRoster?.summary?.sourceParity ?? -1) !== contentArticulationRosterItems.filter((item) => item.checks?.sourceParityPresent).length) failures.push('content articulation roster sourceParity summary mismatch');
if ((contentArticulationRoster?.summary?.visualCohesionPasses ?? -1) !== contentArticulationRosterItems.filter((item) => item.checks?.visualCohesionPassed).length) failures.push('content articulation roster visualCohesionPasses summary mismatch');
const contentArticulationRosterById = new Map(contentArticulationRosterItems.map((item) => [item.id, item]));
for (const signoffItem of humanSignoffItems) {
  const item = contentArticulationRosterById.get(signoffItem.id);
  const planItem = planCoverageById.get(signoffItem.id);
  if (!item) {
    failures.push(`${signoffItem.id}: content articulation roster item missing`);
    continue;
  }
  if (item.species !== signoffItem.species) failures.push(`${signoffItem.id}: content articulation roster species mismatch`);
  if (item.source?.backgroundKey !== 'magenta') failures.push(`${signoffItem.id}: content articulation roster source must be magenta-keyed`);
  if (!item.mechanicallyReady) failures.push(`${signoffItem.id}: content articulation roster should be mechanically ready for human review`);
  if (!item.checks?.keyPreviewPresent) failures.push(`${signoffItem.id}: content articulation roster key preview missing`);
  if (!item.checks?.artContractPresent) failures.push(`${signoffItem.id}: content articulation roster art contract missing`);
  if (!item.checks?.starterPlanPresent) failures.push(`${signoffItem.id}: content articulation roster starter plan missing`);
  if (!item.checks?.planPreviewPresent) failures.push(`${signoffItem.id}: content articulation roster plan preview missing`);
  if (!item.checks?.sourceParityPresent) failures.push(`${signoffItem.id}: content articulation roster source parity missing`);
  if (!item.checks?.visualCohesionPassed) failures.push(`${signoffItem.id}: content articulation roster visual cohesion not passing`);
  if (!item.checks?.pairedRuntimeSandboxPresent) failures.push(`${signoffItem.id}: content articulation roster paired runtime sandbox missing`);
  if (!item.checks?.pairedSourceSandboxPresent) failures.push(`${signoffItem.id}: content articulation roster paired source sandbox missing`);
  if (planItem && item.artifacts?.plan?.path !== planItem.plan) failures.push(`${signoffItem.id}: content articulation roster plan path mismatch`);
  for (const [label, command, expected] of [
    ['mechanical prepare', item.commands?.mechanicalPrepare, `--id ${signoffItem.id}`],
    ['plan check', item.commands?.planCheck, `tools/scratch/${signoffItem.id}-starter-plan.json`],
    ['plan preview', item.commands?.planPreview, `tools/scratch/${signoffItem.id}-starter-plan.json`],
    ['extract dry-run', item.commands?.extractDryRun, `tools/scratch/${signoffItem.id}-starter-plan.json`],
    ['runtime paired preview', item.commands?.pairedSandboxPreview, `npm run sandbox:preview -- --id ${signoffItem.id} --with diver`],
    ['source paired preview', item.commands?.sourceSandboxPreview, `npm run sandbox:preview -- --id source-${signoffItem.id} --with diver`],
  ]) {
    if (!String(command ?? '').includes(expected)) failures.push(`${signoffItem.id}: content articulation roster ${label} command must include ${expected}`);
    if (command && !contentArticulationRosterMarkdown.includes(command)) failures.push(`${signoffItem.id}: content articulation roster markdown missing ${label} command`);
    if (command && !textIncludesHtml(contentArticulationRosterHtml, command)) failures.push(`${signoffItem.id}: content articulation roster html missing ${label} command`);
  }
  if (!String(item.commands?.extractDryRun ?? '').includes('--dry-run')) failures.push(`${signoffItem.id}: content articulation roster extract command must be dry-run`);
  if (!textIncludesHtml(contentArticulationRosterHtml, `data-articulation-roster="${signoffItem.id}"`)) failures.push(`${signoffItem.id}: content articulation roster html missing row marker`);
}
for (const required of [
  'Water9 Content Articulation Roster',
  'Source-to-articulation quality path',
  'Previewable and extractable still does not mean accepted',
  'npm run content:articulation-roster',
  'npm run content:articulation-roster-check',
  'npm run articulated:extract-plan -- --plan <plan.json> --dry-run',
]) {
  if (!contentArticulationRosterMarkdown.includes(required) && !textIncludesHtml(contentArticulationRosterHtml, required)) failures.push(`content articulation roster rendered outputs missing ${required}`);
}

if (contentReproducibility?.schema !== 'water9/content-reproducibility@1') failures.push(`content reproducibility schema is ${contentReproducibility?.schema ?? 'missing'}`);
await fileOk('content reproducibility markdown', paths.contentReproducibilityMarkdown, 1024);
await fileOk('content reproducibility html', paths.contentReproducibilityHtml, 4096);
if (contentReproducibility?.policy?.reportDoesNotApproveSources !== true) failures.push('content reproducibility must state it does not approve sources');
if (contentReproducibility?.policy?.reportDoesNotAcceptThreats !== true) failures.push('content reproducibility must state it does not accept threats');
if (contentReproducibility?.policy?.humanApprovalStillRequired !== true) failures.push('content reproducibility must keep human approval requirement explicit');
const contentReproducibilityItems = Array.isArray(contentReproducibility?.items) ? contentReproducibility.items : [];
if ((contentReproducibility?.summary?.items ?? -1) !== contentReproducibilityItems.length) failures.push('content reproducibility summary items mismatch');
if ((contentReproducibility?.summary?.targetThreats ?? -1) !== (contentArticulationRoster?.summary?.targetThreats ?? minThreats)) failures.push('content reproducibility targetThreats mismatch');
if (contentReproducibilityItems.length !== contentArticulationRosterItems.length) failures.push('content reproducibility item count must match content articulation roster');
if ((contentReproducibility?.summary?.reproducibleTargets ?? -1) !== contentReproducibilityItems.filter((item) => item.reproducible).length) failures.push('content reproducibility reproducibleTargets summary mismatch');
if ((contentReproducibility?.summary?.magentaSources ?? -1) !== contentReproducibilityItems.filter((item) => item.source?.backgroundKey === 'magenta').length) failures.push('content reproducibility magentaSources summary mismatch');
if ((contentReproducibility?.summary?.runtimeRegistered ?? -1) !== contentReproducibilityItems.filter((item) => item.runtime?.registered).length) failures.push('content reproducibility runtimeRegistered summary mismatch');
const contentReproducibilityById = new Map(contentReproducibilityItems.map((item) => [item.id, item]));
for (const rosterItem of contentArticulationRosterItems) {
  const item = contentReproducibilityById.get(rosterItem.id);
  if (!item) {
    failures.push(`${rosterItem.id}: missing from content reproducibility`);
    continue;
  }
  if (item.species !== rosterItem.species) failures.push(`${rosterItem.id}: content reproducibility species mismatch`);
  if (item.source?.backgroundKey !== 'magenta') failures.push(`${rosterItem.id}: content reproducibility source background must be magenta`);
  if (item.runtime?.registered !== true) failures.push(`${rosterItem.id}: content reproducibility runtime must be registered`);
  if (item.reproducible !== (item.blockers?.length === 0)) failures.push(`${rosterItem.id}: content reproducibility reproducible flag mismatch`);
  for (const key of ['source', 'keyPreview', 'artContract', 'starterPlan', 'planPreview', 'sourceParity', 'contactSheet', 'phaseStrip']) {
    if (item.evidence?.[key]?.ok !== true) failures.push(`${rosterItem.id}: content reproducibility evidence ${key} not ok`);
  }
  for (const key of ['sourceContracts', 'sourcePreview', 'mechanicalPrepare', 'planCheck', 'planPreview', 'extractDryRun', 'extractApply', 'sourceParity', 'visualCohesion', 'pairedSandboxPreview', 'pairedSandboxVisual']) {
    if (!String(item.commands?.[key] ?? '').trim()) failures.push(`${rosterItem.id}: content reproducibility command ${key} missing`);
  }
  if (!item.commands?.extractDryRun?.includes('--dry-run')) failures.push(`${rosterItem.id}: content reproducibility extract dry-run missing --dry-run`);
  if (item.commands?.extractApply?.includes('--dry-run')) failures.push(`${rosterItem.id}: content reproducibility extract apply still has --dry-run`);
  if (!String(item.commands?.pairedSandboxPreview ?? '').includes('--with diver')) failures.push(`${rosterItem.id}: content reproducibility paired preview must include diver`);
  if (!textIncludesHtml(contentReproducibilityHtml, `data-reproducibility-target="${rosterItem.id}"`)) failures.push(`${rosterItem.id}: content reproducibility html missing target marker`);
  if (!contentReproducibilityMarkdown.includes(rosterItem.id)) failures.push(`${rosterItem.id}: content reproducibility markdown missing target id`);
}
for (const required of [
  'Water 9 Content Reproducibility',
  'does not approve source art or accept threats',
  'npm run content:reproducibility',
  'npm run content:reproducibility-check',
  'npm run articulated:extract-plan -- --plan tools/scratch/<id>-starter-plan.json --dry-run',
  'npm run sandbox:preview -- --id <id> --with diver --serve --open --visual',
]) {
  if (!contentReproducibilityMarkdown.includes(required) && !textIncludesHtml(contentReproducibilityHtml, required)) failures.push(`content reproducibility rendered outputs missing ${required}`);
}

if (approvedRuntimeHandoff?.schema !== 'water9/content-approved-runtime-handoff@1') failures.push(`approved runtime handoff schema is ${approvedRuntimeHandoff?.schema ?? 'missing'}`);
await fileOk('approved runtime handoff markdown', paths.approvedRuntimeHandoffMarkdown, 1024);
await fileOk('approved runtime handoff html', paths.approvedRuntimeHandoffHtml, 2048);
const approvedRuntimeHandoffItems = Array.isArray(approvedRuntimeHandoff?.items) ? approvedRuntimeHandoff.items : [];
const approvedRuntimeMissingItems = runtimeCoverageItems.filter((item) => !item.runtimeRegistered);
const approvedRuntimeEligibleItems = approvedRuntimeMissingItems.filter((item) => item.sourceApproved);
if ((approvedRuntimeHandoff?.summary?.missingRuntime ?? -1) !== approvedRuntimeMissingItems.length) failures.push('approved runtime handoff missingRuntime summary mismatch');
if ((approvedRuntimeHandoff?.summary?.approvedSourcesMissingRuntime ?? -1) !== approvedRuntimeEligibleItems.length) failures.push('approved runtime handoff approvedSourcesMissingRuntime summary mismatch');
if ((approvedRuntimeHandoff?.summary?.productionEligible ?? -1) !== approvedRuntimeEligibleItems.length) failures.push('approved runtime handoff productionEligible summary mismatch');
if ((approvedRuntimeHandoff?.summary?.riggingEligibleOnly ?? -1) !== approvedRuntimeEligibleItems.length) failures.push('approved runtime handoff riggingEligibleOnly summary mismatch');
if (approvedRuntimeHandoffItems.length !== approvedRuntimeMissingItems.length) failures.push('approved runtime handoff item count mismatch');
const approvedRuntimeHandoffById = new Map(approvedRuntimeHandoffItems.map((item) => [item.id, item]));
for (const runtimeItem of approvedRuntimeMissingItems) {
  const item = approvedRuntimeHandoffById.get(runtimeItem.id);
  if (!item) {
    failures.push(`${runtimeItem.id}: missing from approved runtime handoff`);
    continue;
  }
  if (item.species !== runtimeItem.species) failures.push(`${runtimeItem.id}: approved runtime handoff species mismatch`);
  if (item.sourceApproved !== Boolean(runtimeItem.sourceApproved)) failures.push(`${runtimeItem.id}: approved runtime handoff sourceApproved mismatch`);
  if (item.runtimeRegistered !== false) failures.push(`${runtimeItem.id}: approved runtime handoff should only contain missing runtime items`);
  if (item.productionEligible !== Boolean(runtimeItem.sourceApproved)) failures.push(`${runtimeItem.id}: approved runtime handoff productionEligible mismatch`);
  if (item.riggingEligibleOnly !== Boolean(runtimeItem.sourceApproved)) failures.push(`${runtimeItem.id}: approved runtime handoff riggingEligibleOnly mismatch`);
  if (item.acceptedForContentGate !== false) failures.push(`${runtimeItem.id}: approved runtime handoff must not imply content gate acceptance`);
  for (const key of ['preparePlan', 'planCheck', 'extractDryRun', 'extractAndRegister', 'articulatedCheck', 'sandboxIndex', 'runtimeCoverageCheck', 'sandboxPreview', 'sandboxVisual']) {
    const command = item.commands?.[key];
    if (!String(command ?? '').trim()) failures.push(`${runtimeItem.id}: approved runtime handoff missing command ${key}`);
    if (key !== 'articulatedCheck' && key !== 'sandboxIndex' && key !== 'runtimeCoverageCheck' && !String(command ?? '').includes(runtimeItem.id)) {
      failures.push(`${runtimeItem.id}: approved runtime handoff command ${key} must target id`);
    }
    if (key === 'sandboxPreview' && !String(command ?? '').includes('--with diver')) failures.push(`${runtimeItem.id}: approved runtime handoff sandboxPreview must include --with diver`);
    if (key === 'sandboxVisual' && (!String(command ?? '').includes('--with diver') || !String(command ?? '').includes('--states idle,lunge,stunned'))) {
      failures.push(`${runtimeItem.id}: approved runtime handoff sandboxVisual must include paired diver idle/lunge/stunned states`);
    }
    if (command && !approvedRuntimeHandoffMarkdown.includes(command)) failures.push(`${runtimeItem.id}: approved runtime handoff markdown missing command ${key}`);
    if (command && !textIncludesHtml(approvedRuntimeHandoffHtml, command)) failures.push(`${runtimeItem.id}: approved runtime handoff html missing command ${key}`);
  }
  if (!textIncludesHtml(approvedRuntimeHandoffHtml, `data-approved-runtime-handoff="${runtimeItem.id}"`)) failures.push(`${runtimeItem.id}: approved runtime handoff html missing item marker`);
}
for (const expected of [
  'Water 9 Approved Source Runtime Handoff',
  'Read-only command matrix',
  'Approved Source To Runtime Chain',
  'npm run content:approved-runtime-handoff',
  'npm run content:approved-runtime-handoff-check',
]) {
  if (!approvedRuntimeHandoffMarkdown.includes(expected)) failures.push(`approved runtime handoff markdown missing ${expected}`);
  if (!textIncludesHtml(approvedRuntimeHandoffHtml, expected)) failures.push(`approved runtime handoff html missing ${expected}`);
}

if (riggingSprint?.schema !== 'water9/content-rigging-sprint@1') failures.push(`rigging sprint schema is ${riggingSprint?.schema ?? 'missing'}`);
await fileOk('rigging sprint markdown', paths.riggingSprintMarkdown, 1024);
await fileOk('rigging sprint html', paths.riggingSprintHtml, 2048);
const riggingSprintItems = Array.isArray(riggingSprint?.items) ? riggingSprint.items : [];
if ((riggingSprint?.summary?.missingRuntimeTotal ?? -1) !== runtimeCoverageMissing) failures.push('rigging sprint missingRuntimeTotal mismatch');
if ((riggingSprint?.summary?.sprintSize ?? -1) !== riggingSprintItems.length) failures.push('rigging sprint summary sprintSize mismatch');
if ((riggingSprint?.summary?.planArtifactsStagedInSprint ?? -1) !== riggingSprintItems.filter((item) => item.artifacts?.plan?.exists).length) failures.push('rigging sprint planArtifactsStagedInSprint mismatch');
if ((riggingSprint?.summary?.planPreviewsStagedInSprint ?? -1) !== riggingSprintItems.filter((item) => item.artifacts?.planPreview?.exists).length) failures.push('rigging sprint planPreviewsStagedInSprint mismatch');
if (runtimeCoverageMissing > 0 && riggingSprintItems.length < 1) failures.push('rigging sprint must include at least one missing-runtime candidate');
const runtimeMissingIds = new Set(runtimeCoverageItems.filter((item) => !item.runtimeRegistered).map((item) => item.id));
const riggingSprintCommands = riggingSprint?.commands ?? {};
for (const key of ['sourceReviewAll', 'mechanicalDryRunAll', 'postRegisterCoverage']) {
  const command = String(riggingSprintCommands[key] ?? '');
  if (!command.trim()) failures.push(`rigging sprint command ${key} is missing`);
  if (command && !riggingSprintMarkdown.includes(command)) failures.push(`rigging sprint markdown missing command ${key}`);
  if (command && !textIncludesHtml(riggingSprintHtml, command)) failures.push(`rigging sprint html missing command ${key}`);
}
if (String(riggingSprintCommands.productionPrepareApproved ?? '').includes('--allow-unapproved')) failures.push('rigging sprint productionPrepareApproved must not allow unapproved');
if (String(riggingSprintCommands.mechanicalDryRunAll ?? '') && !String(riggingSprintCommands.mechanicalDryRunAll).includes('--allow-unapproved')) {
  failures.push('rigging sprint mechanicalDryRunAll must include --allow-unapproved');
}
if (String(riggingSprintCommands.postRegisterCoverage ?? '') && !String(riggingSprintCommands.postRegisterCoverage).includes('npm run content:runtime-coverage-check')) {
  failures.push('rigging sprint postRegisterCoverage must validate runtime coverage');
}
for (const item of riggingSprintItems) {
  if (!runtimeMissingIds.has(item.id)) failures.push(`${item.id}: rigging sprint item is not missing runtime`);
  if (!String(item.commands?.productionPreparePlan ?? '').includes(`--id ${item.id}`)) failures.push(`${item.id}: rigging sprint production prepare command must target id`);
  if (item.artifacts?.plan?.path !== item.plan) failures.push(`${item.id}: rigging sprint plan artifact path mismatch`);
  if (item.artifacts?.planPreview?.path !== item.planPreview) failures.push(`${item.id}: rigging sprint plan preview artifact path mismatch`);
  if (item.artifacts?.plan?.exists && (item.artifacts.plan.bytes ?? 0) < 512) failures.push(`${item.id}: rigging sprint plan artifact is too small`);
  if (item.artifacts?.planPreview?.exists && (item.artifacts.planPreview.bytes ?? 0) < 1024) failures.push(`${item.id}: rigging sprint plan preview artifact is too small`);
  if (String(item.commands?.productionPreparePlan ?? '').includes('--allow-unapproved')) failures.push(`${item.id}: rigging sprint production prepare must not allow unapproved`);
  if (!String(item.commands?.mechanicalDryRunPreparePlan ?? '').includes('--allow-unapproved')) failures.push(`${item.id}: rigging sprint mechanical dry-run must include --allow-unapproved`);
  if (!String(item.commands?.runtimeVisual ?? '').includes('--with diver')) failures.push(`${item.id}: rigging sprint runtime visual must include diver`);
  if (!String(item.commands?.runtimeVisual ?? '').includes('--states idle,lunge,stunned')) failures.push(`${item.id}: rigging sprint runtime visual must include idle/lunge/stunned`);
  if (!riggingSprintMarkdown.includes(item.id)) failures.push(`${item.id}: rigging sprint markdown missing item id`);
  if (!textIncludesHtml(riggingSprintHtml, `data-rigging-sprint-candidate="${item.id}"`)) failures.push(`${item.id}: rigging sprint html missing candidate marker`);
  if (!String(riggingSprintCommands.sourceReviewAll ?? '').includes(item.commands?.sourceReview ?? '<missing>')) failures.push(`${item.id}: rigging sprint sourceReviewAll missing item command`);
  if (!String(riggingSprintCommands.mechanicalDryRunAll ?? '').includes(item.commands?.mechanicalDryRunPreparePlan ?? '<missing>')) failures.push(`${item.id}: rigging sprint mechanicalDryRunAll missing item command`);
}
if (!riggingSprintMarkdown.includes('Water 9 Rigging Sprint')) failures.push('rigging sprint markdown missing title');
if (!riggingSprintHtml.includes('Mechanical Dry Run Only')) failures.push('rigging sprint html missing mechanical dry-run section');
if (!riggingSprintHtml.includes('Sprint Commands')) failures.push('rigging sprint html missing Sprint Commands section');
if (!riggingSprintMarkdown.includes('Plan artifacts staged')) failures.push('rigging sprint markdown missing plan artifact summary');
if (!riggingSprintHtml.includes('plan artifacts staged')) failures.push('rigging sprint html missing plan artifact summary');

if (acceptanceAudit?.schema !== 'water9/content-acceptance-audit@1') failures.push(`acceptance audit schema is ${acceptanceAudit?.schema ?? 'missing'}`);
await fileOk('acceptance audit markdown', paths.acceptanceAuditMarkdown, 1024);
await fileOk('acceptance audit html', paths.acceptanceAuditHtml, 2048);
if (!acceptanceAudit?.id) failures.push('acceptance audit id is missing');
if (!acceptanceAudit?.stage) failures.push('acceptance audit stage is missing');
if (!String(acceptanceAudit?.nextAction ?? '').trim()) failures.push('acceptance audit nextAction is missing');
const auditDisclosure = acceptanceAudit?.reviewDisclosure ?? {};
if (typeof auditDisclosure.countsTowardGate !== 'boolean') failures.push('acceptance audit reviewDisclosure.countsTowardGate must be boolean');
if (!String(auditDisclosure.label ?? '').trim()) failures.push('acceptance audit reviewDisclosure.label is missing');
if (!String(auditDisclosure.warning ?? '').trim()) failures.push('acceptance audit reviewDisclosure.warning is missing');
if (!String(auditDisclosure.sourceClassification ?? '').trim()) failures.push('acceptance audit source classification is missing');
if (!String(auditDisclosure.threatClassification ?? '').trim()) failures.push('acceptance audit threat classification is missing');
if (auditDisclosure.countsTowardGate === true && (acceptanceAudit?.source?.approved !== true || acceptanceAudit?.threat?.accepted !== true)) {
  failures.push('acceptance audit can only count toward gate when source and threat are accepted');
}
if (auditDisclosure.countsTowardGate !== true && !String(auditDisclosure.warning ?? '').includes('Preview-only')) {
  failures.push('acceptance audit must warn preview-only evidence is not accepted');
}
for (const expected of [
  'Content Acceptance Audit',
  acceptanceAudit?.id,
  acceptanceAudit?.stage,
  'Gate disclosure',
  auditDisclosure.label,
  auditDisclosure.warning,
  auditDisclosure.sourceClassification,
  auditDisclosure.threatClassification,
  'Source Candidate',
  'Articulated Threat',
  'Source approval dry-run command',
  'Threat acceptance dry-run command',
  acceptanceAudit?.nextAction,
]) {
  if (expected && !acceptanceAuditMarkdown.includes(expected)) failures.push(`acceptance audit markdown missing ${expected}`);
}
for (const expected of [
  'Acceptance Audit',
  acceptanceAudit?.id,
  acceptanceAudit?.stage,
  'Gate Disclosure',
  auditDisclosure.label,
  auditDisclosure.warning,
  auditDisclosure.sourceClassification,
  auditDisclosure.threatClassification,
  'Source Blockers',
  'Threat Blockers',
  'Source Approval Dry Run',
  'Threat Acceptance Dry Run',
  'Sandbox Framing',
  acceptanceAudit?.nextAction,
]) {
  if (expected && !textIncludesHtml(acceptanceAuditHtml, expected)) failures.push(`acceptance audit html missing ${expected}`);
}
if (acceptanceAudit?.source?.approvalCommandDryRun && !acceptanceAudit.source.approvalCommandDryRun.includes('npm run source:accept')) {
  failures.push('acceptance audit source dry-run command must use source:accept');
}
if (acceptanceAudit?.threat?.acceptanceCommandDryRun && !acceptanceAudit.threat.acceptanceCommandDryRun.includes('npm run content:accept')) {
  failures.push('acceptance audit threat dry-run command must use content:accept');
}

if (acceptanceAuditIndex?.schema !== 'water9/content-acceptance-audit-index@1') {
  failures.push(`acceptance audit index schema is ${acceptanceAuditIndex?.schema ?? 'missing'}`);
}
await fileOk('acceptance audit index markdown', paths.acceptanceAuditIndexMarkdown, 1024);
await fileOk('acceptance audit index html', paths.acceptanceAuditIndexHtml, 2048);
if ((acceptanceAuditIndex?.summary?.targetThreats ?? 0) !== minThreats) {
  failures.push(`acceptance audit index targetThreats must be ${minThreats}`);
}
if ((acceptanceAuditIndex?.summary?.matrixRows ?? -1) !== (reviewEvidenceMatrix?.rows?.length ?? -2)) {
  failures.push('acceptance audit index matrixRows must match review evidence matrix');
}
if ((acceptanceAuditIndex?.items?.length ?? 0) !== minThreats) {
  failures.push(`acceptance audit index must contain ${minThreats} item audits`);
}
if ((acceptanceAuditIndex?.summary?.auditedThreats ?? -1) !== (acceptanceAuditIndex?.items?.length ?? -2)) {
  failures.push('acceptance audit index auditedThreats must match item count');
}
if (typeof acceptanceAuditIndex?.summary?.strictGateComplete !== 'boolean') {
  failures.push('acceptance audit index strictGateComplete must be boolean');
}
if (!String(acceptanceAuditIndex?.summary?.nextGate ?? '').trim()) {
  failures.push('acceptance audit index nextGate is missing');
}
for (const expected of [
  'Water 9 Content Acceptance Audit Index',
  'Preview-only evidence is not final acceptance',
  'Target threats',
  'Source mechanical ready',
  'Threat mechanical ready',
  acceptanceAuditIndex?.commands?.rebuild,
  acceptanceAuditIndex?.commands?.validate,
  acceptanceAuditIndex?.commands?.strictGoalGate,
]) {
  if (expected && !acceptanceAuditIndexMarkdown.includes(expected)) failures.push(`acceptance audit index markdown missing ${expected}`);
}
for (const expected of [
  'Water 9 Content Acceptance Audit Index',
  'Preview-only evidence is not final acceptance',
  'Target threats',
  'Source ready',
  'Threat ready',
  'Counts toward gate',
  acceptanceAuditIndex?.commands?.rebuild,
  acceptanceAuditIndex?.commands?.validate,
  acceptanceAuditIndex?.commands?.strictGoalGate,
]) {
  if (expected && !textIncludesHtml(acceptanceAuditIndexHtml, expected)) failures.push(`acceptance audit index html missing ${expected}`);
}
const auditIndexItems = acceptanceAuditIndex?.items ?? [];
const auditIndexSeen = new Set();
let auditIndexSourceReady = 0;
let auditIndexThreatReady = 0;
let auditIndexCountsTowardGate = 0;
let auditIndexAcceptedThreats = 0;
const auditIndexStageCounts = {};
const auditIndexRows = [...(reviewEvidenceMatrix?.rows ?? [])]
  .filter((row) => row.id)
  .sort((a, b) => Number(a.rank ?? 9999) - Number(b.rank ?? 9999))
  .slice(0, minThreats);
for (const row of auditIndexRows) {
  const item = auditIndexItems.find((candidate) => candidate.id === row.id);
  if (!item) {
    failures.push(`${row.id}: acceptance audit index missing item`);
    continue;
  }
  if (auditIndexSeen.has(item.id)) failures.push(`${item.id}: duplicate acceptance audit index item`);
  auditIndexSeen.add(item.id);
  if (item.rank !== Number(row.rank)) failures.push(`${item.id}: acceptance audit index rank mismatch`);
  if (item.species !== row.species) failures.push(`${item.id}: acceptance audit index species mismatch`);
  if (!item.stage) failures.push(`${item.id}: acceptance audit index stage is missing`);
  if (item.sourceMechanicalReady !== true) failures.push(`${item.id}: acceptance audit index source mechanical evidence is not ready`);
  if (item.sourceApproved === true && item.threatMechanicalReady !== true) {
    failures.push(`${item.id}: acceptance audit index threat mechanical evidence is not ready for an approved source`);
  }
  if (item.countsTowardGate !== (item.sourceApproved === true && item.threatAccepted === true)) {
    failures.push(`${item.id}: acceptance audit index countsTowardGate must require source and threat approval`);
  }
  if (!String(item.nextAction ?? '').trim()) failures.push(`${item.id}: acceptance audit index nextAction is missing`);
  if (!String(item.sandboxHref ?? '').includes(`sandbox=${item.id}`)) failures.push(`${item.id}: acceptance audit index sandbox link must target id`);
  if (!item.sourceReviewLinks?.approvalRunway || !item.sourceReviewLinks?.visualBoard || !item.sourceReviewLinks?.quickReview) {
    failures.push(`${item.id}: acceptance audit index source review links incomplete`);
  }
  if (!item.threatReviewLinks?.reviewGallery || !item.threatReviewLinks?.sandboxPreview || !item.threatReviewLinks?.pairedSandboxReport) {
    failures.push(`${item.id}: acceptance audit index threat review links incomplete`);
  }
  if (!acceptanceAuditIndexMarkdown.includes(item.id)) failures.push(`acceptance audit index markdown missing ${item.id}`);
  if (!textIncludesHtml(acceptanceAuditIndexHtml, item.id)) failures.push(`acceptance audit index html missing ${item.id}`);
  await fileOk(`${item.id} acceptance audit json`, resolve(item.auditJson ?? 'missing'), 512);
  await fileOk(`${item.id} acceptance audit markdown`, resolve(item.auditMarkdown ?? 'missing'), 1024);
  await fileOk(`${item.id} acceptance audit html`, resolve(item.auditHtml ?? 'missing'), 2048);
  if (item.sourceMechanicalReady) auditIndexSourceReady += 1;
  if (item.threatMechanicalReady) auditIndexThreatReady += 1;
  if (item.countsTowardGate) auditIndexCountsTowardGate += 1;
  if (item.sourceApproved && item.threatAccepted) auditIndexAcceptedThreats += 1;
  auditIndexStageCounts[item.stage] = (auditIndexStageCounts[item.stage] ?? 0) + 1;
}
if (auditIndexSeen.size !== minThreats) failures.push(`acceptance audit index unique audited ids must be ${minThreats}`);
if (acceptanceAuditIndex?.summary?.sourceMechanicalReady !== auditIndexSourceReady) failures.push('acceptance audit index sourceMechanicalReady summary mismatch');
if (acceptanceAuditIndex?.summary?.threatMechanicalReady !== auditIndexThreatReady) failures.push('acceptance audit index threatMechanicalReady summary mismatch');
if (acceptanceAuditIndex?.summary?.countsTowardGate !== auditIndexCountsTowardGate) failures.push('acceptance audit index countsTowardGate summary mismatch');
if (acceptanceAuditIndex?.summary?.acceptedThreats !== auditIndexAcceptedThreats) failures.push('acceptance audit index acceptedThreats summary mismatch');
if (JSON.stringify(acceptanceAuditIndex?.summary?.stageCounts ?? {}) !== JSON.stringify(auditIndexStageCounts)) {
  failures.push('acceptance audit index stageCounts summary mismatch');
}
if (acceptanceAuditIndex?.summary?.strictGateComplete !== (auditIndexCountsTowardGate >= minThreats)) {
  failures.push('acceptance audit index strictGateComplete summary mismatch');
}

if (workbench?.schema !== 'water9/content-workbench@1') failures.push(`workbench schema is ${workbench?.schema ?? 'missing'}`);
await fileOk('content workbench html', paths.workbenchHtml, 4096);
if (!workbenchHtml.includes('Sandbox Quickstart')) failures.push('workbench html missing Sandbox Quickstart card');
if (!workbenchHtml.includes('sandbox/quickstart.html')) failures.push('workbench html missing sandbox quickstart link');
if (!textIncludesHtml(workbenchHtml, 'npm run sandbox:quickstart && npm run sandbox:quickstart-check')) failures.push('workbench html missing sandbox quickstart command');
const workbenchSummary = workbench?.summary ?? {};
const workbenchPacketCount = (sourceReviewDossier?.items ?? []).filter((item) => item.hasSource && item.reviewPacket?.file).length;
if ((workbenchSummary.sourceReviewDossierPackets ?? 0) !== workbenchPacketCount) failures.push('workbench summary sourceReviewDossierPackets mismatch');
if ((workbenchSummary.riggingSprintPlanArtifactsStaged ?? -1) !== (riggingSprint?.summary?.planArtifactsStagedInSprint ?? -2)) {
  failures.push('workbench summary riggingSprintPlanArtifactsStaged mismatch');
}
if ((workbenchSummary.riggingSprintPlanPreviewsStaged ?? -1) !== (riggingSprint?.summary?.planPreviewsStagedInSprint ?? -2)) {
  failures.push('workbench summary riggingSprintPlanPreviewsStaged mismatch');
}
if ((workbenchSummary.planCoverageCandidates ?? -1) !== (planCoverage?.summary?.candidates ?? -2)) failures.push('workbench summary planCoverageCandidates mismatch');
if ((workbenchSummary.planCoveragePlanArtifacts ?? -1) !== (planCoverage?.summary?.planArtifacts ?? -2)) failures.push('workbench summary planCoveragePlanArtifacts mismatch');
if ((workbenchSummary.planCoveragePlanPreviews ?? -1) !== (planCoverage?.summary?.planPreviews ?? -2)) failures.push('workbench summary planCoveragePlanPreviews mismatch');
if ((workbenchSummary.verticalSliceThreats ?? -1) !== (verticalSlice?.summary?.threats ?? -2)) failures.push('workbench summary verticalSliceThreats mismatch');
if ((workbenchSummary.verticalSliceMechanicallyReviewable ?? -1) !== (verticalSlice?.summary?.mechanicallyReviewable ?? -2)) failures.push('workbench summary verticalSliceMechanicallyReviewable mismatch');
if ((workbenchSummary.verticalSliceAcceptedThreats ?? -1) !== (verticalSlice?.summary?.acceptedThreats ?? -2)) failures.push('workbench summary verticalSliceAcceptedThreats mismatch');
if (workbenchSummary.verticalSliceNextBlocker !== (verticalSlice?.summary?.nextBlocker ?? 'unknown')) failures.push('workbench summary verticalSliceNextBlocker mismatch');
if ((workbenchSummary.verticalSliceRigQualityEvidence ?? -1) !== verticalSliceItems.filter((item) => item.rigQuality?.ready).length) failures.push('workbench summary verticalSliceRigQualityEvidence mismatch');
if ((workbenchSummary.verticalSliceRuntimeVisualEvidence ?? -1) !== verticalSliceItems.filter((item) => item.runtimeVisual?.ready).length) failures.push('workbench summary verticalSliceRuntimeVisualEvidence mismatch');
if ((workbenchSummary.verticalSliceAcceptanceAudits ?? -1) !== verticalSliceItems.filter((item) => item.audit?.ready).length) failures.push('workbench summary verticalSliceAcceptanceAudits mismatch');
if ((workbenchSummary.humanSignoffTargetThreats ?? -1) !== (humanSignoff?.summary?.targetThreats ?? -2)) failures.push('workbench summary humanSignoffTargetThreats mismatch');
if ((workbenchSummary.humanSignoffReadyForSourceSignoff ?? -1) !== (humanSignoff?.summary?.readyForSourceSignoff ?? -2)) failures.push('workbench summary humanSignoffReadyForSourceSignoff mismatch');
if ((workbenchSummary.humanSignoffSourceRegenerationRequired ?? -1) !== (humanSignoff?.summary?.sourceRegenerationRequired ?? -2)) failures.push('workbench summary humanSignoffSourceRegenerationRequired mismatch');
if ((workbenchSummary.humanSignoffSourceBlockedBeforeSignoff ?? -1) !== (humanSignoff?.summary?.sourceBlockedBeforeSignoff ?? -2)) failures.push('workbench summary humanSignoffSourceBlockedBeforeSignoff mismatch');
if ((workbenchSummary.humanSignoffReadyForThreatSignoff ?? -1) !== (humanSignoff?.summary?.readyForThreatSignoff ?? -2)) failures.push('workbench summary humanSignoffReadyForThreatSignoff mismatch');
if ((workbenchSummary.humanSignoffAcceptedThreats ?? -1) !== (humanSignoff?.summary?.acceptedThreats ?? -2)) failures.push('workbench summary humanSignoffAcceptedThreats mismatch');
if (workbenchSummary.humanSignoffNextGate !== (humanSignoff?.summary?.nextGate ?? 'unknown')) failures.push('workbench summary humanSignoffNextGate mismatch');
if ((workbenchSummary.sourceApprovalRunwayCandidates ?? -1) !== (sourceApprovalRunway?.summary?.candidates ?? -2)) failures.push('workbench summary sourceApprovalRunwayCandidates mismatch');
if ((workbenchSummary.sourceApprovalRunwayMechanicallyReady ?? -1) !== (sourceApprovalRunway?.summary?.mechanicallyReadyForHumanReview ?? -2)) failures.push('workbench summary sourceApprovalRunwayMechanicallyReady mismatch');
if ((workbenchSummary.sourceApprovalRunwayCriticBlocked ?? -1) !== (sourceApprovalRunway?.summary?.criticRegenerationRequired ?? -2)) failures.push('workbench summary sourceApprovalRunwayCriticBlocked mismatch');
if ((workbenchSummary.sourceApprovalRunwayReady ?? -1) !== (sourceApprovalRunway?.summary?.readyForHumanReview ?? -2)) failures.push('workbench summary sourceApprovalRunwayReady mismatch');
if ((workbenchSummary.sourceApprovalRunwayApproved ?? -1) !== (sourceApprovalRunway?.summary?.humanApproved ?? -2)) failures.push('workbench summary sourceApprovalRunwayApproved mismatch');
if (workbenchSummary.sourceNextDecisionDraftTarget !== (sourceNextDecisionDraft?.target?.id ?? null)) failures.push('workbench summary sourceNextDecisionDraftTarget mismatch');
if (workbenchSummary.sourceNextDecisionDraftTargetSpecies !== (sourceNextDecisionDraft?.target?.species ?? null)) failures.push('workbench summary sourceNextDecisionDraftTargetSpecies mismatch');
if (workbenchSummary.sourceNextDecisionDraftStatus !== (sourceNextDecisionDraft?.decisionFile?.decisions?.[0]?.status ?? null)) failures.push('workbench summary sourceNextDecisionDraftStatus mismatch');
if ((workbenchSummary.sourceApprovalSessionCandidates ?? -1) !== (sourceApprovalSession?.summary?.candidates ?? -2)) failures.push('workbench summary sourceApprovalSessionCandidates mismatch');
if ((workbenchSummary.sourceApprovalSessionReady ?? -1) !== (sourceApprovalSession?.summary?.readyForHumanReview ?? -2)) failures.push('workbench summary sourceApprovalSessionReady mismatch');
if ((workbenchSummary.sourceApprovalSessionApproved ?? -1) !== (sourceApprovalSession?.summary?.humanApproved ?? -2)) failures.push('workbench summary sourceApprovalSessionApproved mismatch');
if (workbenchSummary.sourceApprovalSessionNextTarget !== (sourceApprovalSession?.summary?.nextTarget ?? 'none')) failures.push('workbench summary sourceApprovalSessionNextTarget mismatch');
if (workbenchSummary.sourceApprovalSessionNextTargetSpecies !== (sourceApprovalSession?.summary?.nextTargetSpecies ?? 'none')) failures.push('workbench summary sourceApprovalSessionNextTargetSpecies mismatch');
if ((workbenchSummary.sourceApprovalSessionRequiredChecks ?? -1) !== (sourceApprovalSession?.summary?.requiredChecks ?? -2)) failures.push('workbench summary sourceApprovalSessionRequiredChecks mismatch');
if (workbenchSummary.sourceApprovalSessionStrictCommand !== (sourceApprovalSession?.decisionOutput?.strictApplyCommand ?? null)) failures.push('workbench summary sourceApprovalSessionStrictCommand mismatch');
if ((workbenchSummary.sourceApprovalMarathonCandidates ?? -1) !== (sourceApprovalMarathon?.summary?.candidates ?? -2)) failures.push('workbench summary sourceApprovalMarathonCandidates mismatch');
if ((workbenchSummary.sourceApprovalMarathonReady ?? -1) !== (sourceApprovalMarathon?.summary?.readyForHumanReview ?? -2)) failures.push('workbench summary sourceApprovalMarathonReady mismatch');
if ((workbenchSummary.sourceApprovalMarathonApproved ?? -1) !== (sourceApprovalMarathon?.summary?.humanApproved ?? -2)) failures.push('workbench summary sourceApprovalMarathonApproved mismatch');
if ((workbenchSummary.sourceApprovalMarathonDecisionStarters ?? -1) !== (sourceApprovalMarathon?.summary?.decisionStarters ?? -2)) failures.push('workbench summary sourceApprovalMarathonDecisionStarters mismatch');
if ((workbenchSummary.sourceApprovalMarathonRiskHigh ?? -1) !== (sourceApprovalMarathon?.summary?.riskHigh ?? -2)) failures.push('workbench summary sourceApprovalMarathonRiskHigh mismatch');
if ((workbenchSummary.sourceApprovalMarathonRiskMedium ?? -1) !== (sourceApprovalMarathon?.summary?.riskMedium ?? -2)) failures.push('workbench summary sourceApprovalMarathonRiskMedium mismatch');
if ((workbenchSummary.readinessSourceMechanicallyReadyForHumanReview ?? -1) !== (contentReadiness?.summary?.sourceMechanicallyReadyForHumanReview ?? -2)) failures.push('workbench summary readinessSourceMechanicallyReadyForHumanReview mismatch');
if ((workbenchSummary.readinessSourceApprovalReady ?? -1) !== (contentReadiness?.summary?.sourceApprovalReady ?? -2)) failures.push('workbench summary readinessSourceApprovalReady mismatch');
if ((workbenchSummary.readinessSourceCriticRegenerationRequired ?? -1) !== (contentReadiness?.summary?.sourceCriticRegenerationRequired ?? -2)) failures.push('workbench summary readinessSourceCriticRegenerationRequired mismatch');
if ((workbenchSummary.readinessSourceCriticRegenerationQueued ?? -1) !== (contentReadiness?.summary?.sourceCriticRegenerationQueued ?? -2)) failures.push('workbench summary readinessSourceCriticRegenerationQueued mismatch');
if ((workbenchSummary.sourceReplaceRunwayCandidates ?? -1) !== (sourceReplaceRunway?.summary?.candidates ?? -2)) failures.push('workbench summary sourceReplaceRunwayCandidates mismatch');
if ((workbenchSummary.sourceReplaceRunwaySourcePresent ?? -1) !== (sourceReplaceRunway?.summary?.sourcePresent ?? -2)) failures.push('workbench summary sourceReplaceRunwaySourcePresent mismatch');
if ((workbenchSummary.sourceReplaceRunwayReplaceable ?? -1) !== (sourceReplaceRunway?.summary?.replaceable ?? -2)) failures.push('workbench summary sourceReplaceRunwayReplaceable mismatch');
if ((workbenchSummary.sourceReplaceRunwayHumanApproved ?? -1) !== (sourceReplaceRunway?.summary?.humanApproved ?? -2)) failures.push('workbench summary sourceReplaceRunwayHumanApproved mismatch');
if ((workbenchSummary.sourceVisualBoardCandidates ?? -1) !== (sourceVisualBoard?.summary?.candidates ?? -2)) failures.push('workbench summary sourceVisualBoardCandidates mismatch');
if ((workbenchSummary.sourceVisualBoardReady ?? -1) !== (sourceVisualBoard?.summary?.readyForHumanReview ?? -2)) failures.push('workbench summary sourceVisualBoardReady mismatch');
if ((workbenchSummary.sourceVisualBoardApproved ?? -1) !== (sourceVisualBoard?.summary?.humanApproved ?? -2)) failures.push('workbench summary sourceVisualBoardApproved mismatch');
if ((workbenchSummary.sourceVisualBoardAcceptedThreats ?? -1) !== (sourceVisualBoard?.summary?.acceptedThreats ?? -2)) failures.push('workbench summary sourceVisualBoardAcceptedThreats mismatch');
if ((workbenchSummary.sourceCriticBoardCandidates ?? -1) !== (sourceCriticBoard?.summary?.candidates ?? -2)) failures.push('workbench summary sourceCriticBoardCandidates mismatch');
if ((workbenchSummary.sourceCriticBoardLanes ?? -1) !== (sourceCriticBoard?.summary?.lanes ?? -2)) failures.push('workbench summary sourceCriticBoardLanes mismatch');
if ((workbenchSummary.sourceCriticBoardReady ?? -1) !== (sourceCriticBoard?.summary?.readyForHumanReview ?? -2)) failures.push('workbench summary sourceCriticBoardReady mismatch');
if ((workbenchSummary.sourceCriticBoardAdvisoryOnly ?? -1) !== (sourceCriticBoard?.summary?.advisoryOnly ?? -2)) failures.push('workbench summary sourceCriticBoardAdvisoryOnly mismatch');
if ((workbenchSummary.sourceCriticBoardSubagentFindings ?? -1) !== (sourceCriticBoard?.summary?.subagentFindings ?? -2)) failures.push('workbench summary sourceCriticBoardSubagentFindings mismatch');
if ((workbenchSummary.sourceCriticBoardRegenerate ?? -1) !== (sourceCriticBoard?.summary?.regenerateRecommendations ?? -2)) failures.push('workbench summary sourceCriticBoardRegenerate mismatch');
if ((workbenchSummary.sourceCriticBoardReadyWithCaution ?? -1) !== (sourceCriticBoard?.summary?.readyWithCautionRecommendations ?? -2)) failures.push('workbench summary sourceCriticBoardReadyWithCaution mismatch');
if ((workbenchSummary.sourceCriticBoardReadyRecommendation ?? -1) !== (sourceCriticBoard?.summary?.readyRecommendations ?? -2)) failures.push('workbench summary sourceCriticBoardReadyRecommendation mismatch');
if ((workbenchSummary.sourceCriticRegenerationCandidates ?? -1) !== (sourceCriticRegeneration?.summary?.regenerateCandidates ?? -2)) failures.push('workbench summary sourceCriticRegenerationCandidates mismatch');
if ((workbenchSummary.sourceCriticRegenerationLanes ?? -1) !== (sourceCriticRegeneration?.summary?.lanes ?? -2)) failures.push('workbench summary sourceCriticRegenerationLanes mismatch');
if ((workbenchSummary.sourceCriticRegenerationPromptFiles ?? -1) !== (sourceCriticRegeneration?.summary?.promptFiles ?? -2)) failures.push('workbench summary sourceCriticRegenerationPromptFiles mismatch');
if (workbenchSummary.sourceCriticRegenerationNextTarget !== (sourceCriticRegeneration?.summary?.nextCandidateId ?? 'none')) failures.push('workbench summary sourceCriticRegenerationNextTarget mismatch');
if (workbenchSummary.sourceCriticRegenerationNextTargetSpecies !== (sourceCriticRegeneration?.summary?.nextCandidateSpecies ?? 'none')) failures.push('workbench summary sourceCriticRegenerationNextTargetSpecies mismatch');
if ((workbenchSummary.sourceCriticRegenerationNextPromptFile ?? null) !== (sourceCriticRegeneration?.summary?.nextPromptFile ?? null)) failures.push('workbench summary sourceCriticRegenerationNextPromptFile mismatch');
if (workbenchSummary.sourceCriticRegenerationDoctorTarget !== (sourceCriticRegenerationDoctor?.summary?.nextCandidateId ?? 'none')) failures.push('workbench summary sourceCriticRegenerationDoctorTarget mismatch');
if (workbenchSummary.sourceCriticRegenerationDoctorTargetSpecies !== (sourceCriticRegenerationDoctor?.summary?.nextCandidateSpecies ?? 'none')) failures.push('workbench summary sourceCriticRegenerationDoctorTargetSpecies mismatch');
if (workbenchSummary.sourceCriticRegenerationDoctorStatus !== (sourceCriticRegenerationDoctor?.summary?.status ?? 'unknown')) failures.push('workbench summary sourceCriticRegenerationDoctorStatus mismatch');
if (Boolean(workbenchSummary.sourceCriticRegenerationDoctorReady) !== Boolean(sourceCriticRegenerationDoctor?.summary?.readyForReplacementIngest)) failures.push('workbench summary sourceCriticRegenerationDoctorReady mismatch');
if (Boolean(workbenchSummary.sourceCriticRegenerationDoctorMatchesCurrentSource) !== Boolean(sourceCriticRegenerationDoctor?.summary?.replacementMatchesCurrentSource)) failures.push('workbench summary sourceCriticRegenerationDoctorMatchesCurrentSource mismatch');
if ((workbenchSummary.sourceCriticRegenerationDoctorInboxFiles ?? -1) !== (sourceCriticRegenerationDoctor?.summary?.inboxFiles ?? -2)) failures.push('workbench summary sourceCriticRegenerationDoctorInboxFiles mismatch');
if ((workbenchSummary.sourceCriticRegenerationHealthCandidates ?? -1) !== (sourceCriticRegenerationHealth?.summary?.regenerateCandidates ?? -2)) failures.push('workbench summary sourceCriticRegenerationHealthCandidates mismatch');
if ((workbenchSummary.sourceCriticRegenerationHealthDistinctReady ?? -1) !== (sourceCriticRegenerationHealth?.summary?.distinctReplacementReady ?? -2)) failures.push('workbench summary sourceCriticRegenerationHealthDistinctReady mismatch');
if ((workbenchSummary.sourceCriticRegenerationHealthNoop ?? -1) !== (sourceCriticRegenerationHealth?.summary?.validNoopReplacements ?? -2)) failures.push('workbench summary sourceCriticRegenerationHealthNoop mismatch');
if ((workbenchSummary.sourceCriticRegenerationHealthMissing ?? -1) !== (sourceCriticRegenerationHealth?.summary?.missingReplacements ?? -2)) failures.push('workbench summary sourceCriticRegenerationHealthMissing mismatch');
if ((workbenchSummary.sourceCriticRegenerationHealthInvalid ?? -1) !== (sourceCriticRegenerationHealth?.summary?.invalidReplacements ?? -2)) failures.push('workbench summary sourceCriticRegenerationHealthInvalid mismatch');
if (workbenchSummary.sourceCriticRegenerationHealthNextTarget !== (sourceCriticRegenerationHealth?.summary?.nextActionTarget ?? 'none')) failures.push('workbench summary sourceCriticRegenerationHealthNextTarget mismatch');
if (workbenchSummary.sourceCriticRegenerationHealthNextStatus !== (sourceCriticRegenerationHealth?.summary?.nextActionStatus ?? 'none')) failures.push('workbench summary sourceCriticRegenerationHealthNextStatus mismatch');
if ((workbenchSummary.sourceReviewSequencerTotal ?? -1) !== (sourceReviewSequencer?.summary?.totalCandidates ?? -2)) failures.push('workbench summary sourceReviewSequencerTotal mismatch');
if ((workbenchSummary.sourceReviewSequencerApprovalReady ?? -1) !== (sourceReviewSequencer?.summary?.approvalReady ?? -2)) failures.push('workbench summary sourceReviewSequencerApprovalReady mismatch');
if ((workbenchSummary.sourceReviewSequencerCriticRegenerationRequired ?? -1) !== (sourceReviewSequencer?.summary?.criticRegenerationRequired ?? -2)) failures.push('workbench summary sourceReviewSequencerCriticRegenerationRequired mismatch');
if ((workbenchSummary.sourceReviewSequencerDistinctReady ?? -1) !== (sourceReviewSequencer?.summary?.distinctReplacementReady ?? -2)) failures.push('workbench summary sourceReviewSequencerDistinctReady mismatch');
if ((workbenchSummary.sourceReviewSequencerNoop ?? -1) !== (sourceReviewSequencer?.summary?.validNoopReplacements ?? -2)) failures.push('workbench summary sourceReviewSequencerNoop mismatch');
if ((workbenchSummary.sourceReviewSequencerMissing ?? -1) !== (sourceReviewSequencer?.summary?.missingReplacements ?? -2)) failures.push('workbench summary sourceReviewSequencerMissing mismatch');
if ((workbenchSummary.sourceReviewSequencerInvalid ?? -1) !== (sourceReviewSequencer?.summary?.invalidReplacements ?? -2)) failures.push('workbench summary sourceReviewSequencerInvalid mismatch');
if ((workbenchSummary.sourceReviewSequencerApproved ?? -1) !== (sourceReviewSequencer?.summary?.approved ?? -2)) failures.push('workbench summary sourceReviewSequencerApproved mismatch');
if ((workbenchSummary.sourceReviewSequencerCountsTowardGate ?? -1) !== (sourceReviewSequencer?.summary?.countsTowardGate ?? -2)) failures.push('workbench summary sourceReviewSequencerCountsTowardGate mismatch');
if (workbenchSummary.sourceReviewSequencerNextLane !== (sourceReviewSequencer?.summary?.nextLane ?? 'none')) failures.push('workbench summary sourceReviewSequencerNextLane mismatch');
if (workbenchSummary.sourceReviewSequencerNextTarget !== (sourceReviewSequencer?.summary?.nextTarget ?? 'none')) failures.push('workbench summary sourceReviewSequencerNextTarget mismatch');
if (workbenchSummary.sourceReviewTargetPacketTarget !== (sourceReviewTargetPacket?.target?.id ?? 'none')) failures.push('workbench summary sourceReviewTargetPacketTarget mismatch');
if (workbenchSummary.sourceReviewTargetPacketSpecies !== (sourceReviewTargetPacket?.target?.species ?? 'none')) failures.push('workbench summary sourceReviewTargetPacketSpecies mismatch');
if (workbenchSummary.sourceReviewTargetPacketLane !== (sourceReviewTargetPacket?.target?.lane ?? 'none')) failures.push('workbench summary sourceReviewTargetPacketLane mismatch');
if (workbenchSummary.sourceReviewTargetPacketStatus !== (sourceReviewTargetPacket?.target?.status ?? 'none')) failures.push('workbench summary sourceReviewTargetPacketStatus mismatch');
if (workbenchSummary.sourceRegenerationWorkspaceTarget !== (sourceRegenerationWorkspace?.target?.id ?? 'none')) failures.push('workbench summary sourceRegenerationWorkspaceTarget mismatch');
if (workbenchSummary.sourceRegenerationWorkspaceSpecies !== (sourceRegenerationWorkspace?.target?.species ?? 'none')) failures.push('workbench summary sourceRegenerationWorkspaceSpecies mismatch');
if (workbenchSummary.sourceRegenerationWorkspaceLane !== (sourceRegenerationWorkspace?.target?.lane ?? 'none')) failures.push('workbench summary sourceRegenerationWorkspaceLane mismatch');
if (workbenchSummary.sourceRegenerationWorkspaceHealthStatus !== (sourceRegenerationWorkspace?.target?.healthStatus ?? 'none')) failures.push('workbench summary sourceRegenerationWorkspaceHealthStatus mismatch');
if (Boolean(workbenchSummary.sourceRegenerationWorkspaceNoop) !== Boolean(sourceRegenerationWorkspace?.target?.replacementMatchesCurrentSource)) failures.push('workbench summary sourceRegenerationWorkspaceNoop mismatch');
if (Boolean(workbenchSummary.sourceRegenerationWorkspaceDistinctReady) !== Boolean(sourceRegenerationWorkspace?.target?.distinctReplacementReady)) failures.push('workbench summary sourceRegenerationWorkspaceDistinctReady mismatch');
if ((workbenchSummary.visualRegenerationItems ?? -1) !== (contentVisualRegenerationQueue?.summary?.items ?? -2)) failures.push('workbench summary visualRegenerationItems mismatch');
if ((workbenchSummary.visualRegenerationBlockingItems ?? -1) !== (contentVisualRegenerationQueue?.summary?.blockingItems ?? -2)) failures.push('workbench summary visualRegenerationBlockingItems mismatch');
if (workbenchSummary.visualRegenerationNextTarget !== (contentVisualRegenerationQueue?.summary?.nextTargetId ?? 'none')) failures.push('workbench summary visualRegenerationNextTarget mismatch');
if ((workbenchSummary.visualRegenerationNextPromptFile ?? null) !== (contentVisualRegenerationQueue?.summary?.nextPromptFile ?? null)) failures.push('workbench summary visualRegenerationNextPromptFile mismatch');
if ((workbenchSummary.visualRegenerationStrictGateCredit ?? -1) !== (contentVisualRegenerationQueue?.summary?.countsTowardStrictGate ?? -2)) failures.push('workbench summary visualRegenerationStrictGateCredit mismatch');
if (workbenchSummary.sourceNextReviewTarget !== (sourceNextReview?.target?.id ?? null)) failures.push('workbench summary sourceNextReviewTarget mismatch');
if (workbenchSummary.sourceNextReviewTargetSpecies !== (sourceNextReview?.target?.species ?? null)) failures.push('workbench summary sourceNextReviewTargetSpecies mismatch');
if ((workbenchSummary.sourceNextReviewReady ?? -1) !== (sourceNextReview?.summary?.readyForHumanReview ?? -2)) failures.push('workbench summary sourceNextReviewReady mismatch');
if ((workbenchSummary.sourceNextReviewHumanApproved ?? -1) !== (sourceNextReview?.summary?.humanApproved ?? -2)) failures.push('workbench summary sourceNextReviewHumanApproved mismatch');
if ((workbenchSummary.acceptanceDoctorCandidates ?? -1) !== (acceptanceDoctor?.summary?.candidates ?? -2)) failures.push('workbench summary acceptanceDoctorCandidates mismatch');
if ((workbenchSummary.acceptanceDoctorSourceBlocked ?? -1) !== (acceptanceDoctor?.summary?.sourceBlocked ?? -2)) failures.push('workbench summary acceptanceDoctorSourceBlocked mismatch');
if ((workbenchSummary.acceptanceDoctorRuntimeBlocked ?? -1) !== (acceptanceDoctor?.summary?.runtimeBlocked ?? -2)) failures.push('workbench summary acceptanceDoctorRuntimeBlocked mismatch');
if ((workbenchSummary.acceptanceDoctorAcceptanceBlocked ?? -1) !== (acceptanceDoctor?.summary?.acceptanceBlocked ?? -2)) failures.push('workbench summary acceptanceDoctorAcceptanceBlocked mismatch');
if ((workbenchSummary.acceptanceDoctorMissingRuntime ?? -1) !== (acceptanceDoctor?.summary?.missingRuntime ?? -2)) failures.push('workbench summary acceptanceDoctorMissingRuntime mismatch');
if (workbenchSummary.acceptanceDoctorNextBottleneck !== acceptanceDoctor?.summary?.nextBottleneck) failures.push('workbench summary acceptanceDoctorNextBottleneck mismatch');
if ((workbenchSummary.threatAcceptanceDecisionRigs ?? -1) !== (threatAcceptanceDecisions?.summary?.registeredRigs ?? -2)) failures.push('workbench summary threatAcceptanceDecisionRigs mismatch');
if ((workbenchSummary.threatAcceptanceDecisionAccepted ?? -1) !== (threatAcceptanceDecisions?.summary?.accepted ?? -2)) failures.push('workbench summary threatAcceptanceDecisionAccepted mismatch');
if ((workbenchSummary.threatAcceptanceDecisionNeedsReview ?? -1) !== (threatAcceptanceDecisions?.summary?.needsReview ?? -2)) failures.push('workbench summary threatAcceptanceDecisionNeedsReview mismatch');
if ((workbenchSummary.threatAcceptanceDecisionRunDecisions ?? -1) !== (threatAcceptanceDecisionRun?.decisions ?? -2)) failures.push('workbench summary threatAcceptanceDecisionRunDecisions mismatch');
if ((workbenchSummary.threatAcceptanceDecisionRunAccepted ?? -1) !== (threatAcceptanceDecisionRun?.accepted ?? -2)) failures.push('workbench summary threatAcceptanceDecisionRunAccepted mismatch');
if ((workbenchSummary.threatAcceptanceDecisionRunPrototype ?? -1) !== (threatAcceptanceDecisionRun?.prototype ?? -2)) failures.push('workbench summary threatAcceptanceDecisionRunPrototype mismatch');
if ((workbenchSummary.threatAcceptanceDecisionRunPending ?? -1) !== (threatAcceptanceDecisionRun?.pending ?? -2)) failures.push('workbench summary threatAcceptanceDecisionRunPending mismatch');
if ((workbenchSummary.threatAcceptanceDecisionRunFailures ?? -1) !== (threatAcceptanceDecisionRun?.failures?.length ?? -2)) failures.push('workbench summary threatAcceptanceDecisionRunFailures mismatch');
if ((workbenchSummary.approvedRuntimeHandoffMissingRuntime ?? -1) !== (approvedRuntimeHandoff?.summary?.missingRuntime ?? -2)) failures.push('workbench summary approvedRuntimeHandoffMissingRuntime mismatch');
if ((workbenchSummary.approvedRuntimeHandoffApprovedMissingRuntime ?? -1) !== (approvedRuntimeHandoff?.summary?.approvedSourcesMissingRuntime ?? -2)) failures.push('workbench summary approvedRuntimeHandoffApprovedMissingRuntime mismatch');
if ((workbenchSummary.approvedRuntimeHandoffEligible ?? -1) !== (approvedRuntimeHandoff?.summary?.productionEligible ?? -2)) failures.push('workbench summary approvedRuntimeHandoffEligible mismatch');
if ((workbenchSummary.approvedRuntimeHandoffRiggingEligibleOnly ?? -1) !== (approvedRuntimeHandoff?.summary?.riggingEligibleOnly ?? -2)) failures.push('workbench summary approvedRuntimeHandoffRiggingEligibleOnly mismatch');
if ((workbenchSummary.approvedRuntimeHandoffBlockedUntilSourceApproval ?? -1) !== (approvedRuntimeHandoff?.summary?.blockedUntilSourceApproval ?? -2)) failures.push('workbench summary approvedRuntimeHandoffBlockedUntilSourceApproval mismatch');
if (!workbenchHtml.includes('packetized evidence')) failures.push('workbench html missing packetized source review wording');
if (!workbenchHtml.includes('Next Source Review')) failures.push('workbench html missing Next Source Review card');
if (!workbenchHtml.includes('source-candidates/source-next-review.html')) failures.push('workbench html missing source next review link');
if (!textIncludesHtml(workbenchHtml, 'npm run source:next-review && npm run source:next-review-check')) failures.push('workbench html missing source next review command');
if (!textIncludesHtml(workbenchHtml, 'npm run source:next-review:serve-smoke')) failures.push('workbench html missing source next review serve smoke command');
if (!workbenchHtml.includes('Source Approval Runway')) failures.push('workbench html missing Source Approval Runway card');
if (!textIncludesHtml(workbenchHtml, 'npm run source:approval-runway && npm run source:approval-runway-check && npm run source:approval-runway:preview')) failures.push('workbench html missing source approval runway preview command');
if (!workbenchHtml.includes('approval-ready after')) failures.push('workbench html missing source approval stricter blocker copy');
if (!workbenchHtml.includes('mechanically ready')) failures.push('workbench html missing source approval mechanically ready copy');
if (!workbenchHtml.includes('Source Approval Session')) failures.push('workbench html missing Source Approval Session card');
if (!workbenchHtml.includes('source-candidates/source-approval-session.html')) failures.push('workbench html missing source approval session link');
if (!textIncludesHtml(workbenchHtml, 'npm run source:approval-session && npm run source:approval-session-check && npm run source:approval-session:serve-smoke')) failures.push('workbench html missing source approval session command');
if (!workbenchHtml.includes('human-authored batch decisions')) failures.push('workbench html missing source approval session batch-decision copy');
if (!workbenchHtml.includes('Source Approval Marathon')) failures.push('workbench html missing Source Approval Marathon card');
if (!workbenchHtml.includes('source-candidates/source-approval-marathon.html')) failures.push('workbench html missing source approval marathon link');
if (!textIncludesHtml(workbenchHtml, 'npm run source:approval-marathon && npm run source:approval-marathon-check')) failures.push('workbench html missing source approval marathon command');
if (!textIncludesHtml(workbenchHtml, 'npm run source:approval-marathon:serve-smoke')) failures.push('workbench html missing source approval marathon serve smoke command');
if (!workbenchHtml.includes('reviewed-only decision starters')) failures.push('workbench html missing source approval marathon decision starter copy');
if (!workbenchHtml.includes('risk triage')) failures.push('workbench html missing source approval marathon risk copy');
if (!workbenchHtml.includes('Source Replace Runway')) failures.push('workbench html missing Source Replace Runway card');
if (!workbenchHtml.includes('source-candidates/source-replace-runway.html')) failures.push('workbench html missing source replace runway link');
if (!textIncludesHtml(workbenchHtml, 'npm run source:replace-runway && npm run source:replace-runway-check && npm run source:replace-runway:preview')) failures.push('workbench html missing source replace runway preview command');
if (!workbenchHtml.includes('explicit --overwrite replacement loop')) failures.push('workbench html missing source replace runway overwrite copy');
if (!workbenchHtml.includes('Source Visual Board')) failures.push('workbench html missing Source Visual Board card');
if (!workbenchHtml.includes('source-visual-board.html')) failures.push('workbench html missing source visual board link');
if (!textIncludesHtml(workbenchHtml, 'npm run source:visual-board && npm run source:visual-board-check && npm run source:visual-board:serve-smoke')) failures.push('workbench html missing source visual board command');
if (!workbenchHtml.includes('Source Critic Board')) failures.push('workbench html missing Source Critic Board card');
if (!workbenchHtml.includes('source-candidates/source-critic-board.html')) failures.push('workbench html missing source critic board link');
if (!textIncludesHtml(workbenchHtml, 'npm run source:critic-board && npm run source:critic-board-check && npm run source:critic-board:serve-smoke')) failures.push('workbench html missing source critic board command');
if (!workbenchHtml.includes('lane-specific advisory risks')) failures.push('workbench html missing source critic board copy');
if (!workbenchHtml.includes('Critic Regeneration Queue')) failures.push('workbench html missing Critic Regeneration Queue card');
if (!workbenchHtml.includes('source-candidates/source-critic-regeneration-queue.html')) failures.push('workbench html missing source critic regeneration queue link');
if (!workbenchHtml.includes('source-candidates/source-critic-regeneration-queue.html#next-regeneration-target')) failures.push('workbench html missing source critic regeneration next-target link');
if (!textIncludesHtml(workbenchHtml, 'npm run source:critic-regeneration && npm run source:critic-regeneration-check && npm run source:critic-regeneration:serve-smoke && npm run source:critic-regeneration-openai-smoke')) failures.push('workbench html missing source critic regeneration command');
if (!workbenchHtml.includes('critic-rejected source candidates')) failures.push('workbench html missing source critic regeneration copy');
if (!workbenchHtml.includes('Next:')) failures.push('workbench html missing source critic regeneration next-target copy');
if (!workbenchHtml.includes('Critic Regeneration Doctor')) failures.push('workbench html missing Critic Regeneration Doctor card');
if (!workbenchHtml.includes('source-candidates/source-critic-regeneration-doctor.html')) failures.push('workbench html missing source critic regeneration doctor link');
if (!textIncludesHtml(workbenchHtml, 'npm run source:critic-regeneration-doctor && npm run source:critic-regeneration-doctor-check && npm run source:critic-regeneration-doctor:serve-smoke')) failures.push('workbench html missing source critic regeneration doctor command');
if (!workbenchHtml.includes('replacement ingest ready')) failures.push('workbench html missing source critic regeneration doctor copy');
if (!workbenchHtml.includes('matches current source')) failures.push('workbench html missing source critic regeneration doctor current-source copy');
if (!workbenchHtml.includes('Critic Regeneration Health')) failures.push('workbench html missing Critic Regeneration Health card');
if (!workbenchHtml.includes('source-candidates/source-critic-regeneration-health.html')) failures.push('workbench html missing source critic regeneration health link');
if (!textIncludesHtml(workbenchHtml, 'npm run source:critic-regeneration-health && npm run source:critic-regeneration-health-check && npm run source:critic-regeneration-health:serve-smoke')) failures.push('workbench html missing source critic regeneration health command');
if (!workbenchHtml.includes('distinct replacements ready')) failures.push('workbench html missing source critic regeneration health distinct-ready copy');
if (!workbenchHtml.includes('valid no-op')) failures.push('workbench html missing source critic regeneration health no-op copy');
if (!workbenchHtml.includes('missing replacements')) failures.push('workbench html missing source critic regeneration health missing-replacements copy');
if (!workbenchHtml.includes('Source Review Sequencer')) failures.push('workbench html missing Source Review Sequencer card');
if (!workbenchHtml.includes('source-candidates/source-review-sequencer.html')) failures.push('workbench html missing source review sequencer link');
if (!textIncludesHtml(workbenchHtml, 'npm run source:review-sequencer && npm run source:review-sequencer-check && npm run source:review-sequencer:serve-smoke')) failures.push('workbench html missing source review sequencer command');
if (!workbenchHtml.includes('deterministic lanes')) failures.push('workbench html missing source review sequencer deterministic lane copy');
if (!workbenchHtml.includes('dry-run-only source decisions')) failures.push('workbench html missing source review sequencer dry-run copy');
if (!workbenchHtml.includes('Source Review Target Packet')) failures.push('workbench html missing Source Review Target Packet card');
if (!workbenchHtml.includes('source-candidates/source-review-target-packet.html')) failures.push('workbench html missing source review target packet link');
if (!textIncludesHtml(workbenchHtml, 'npm run source:review-target-packet && npm run source:review-target-packet-check && npm run source:review-target-packet:serve-smoke')) failures.push('workbench html missing source review target packet command');
if (!workbenchHtml.includes('One focused packet')) failures.push('workbench html missing source review target packet copy');
if (!workbenchHtml.includes('Source Regeneration Workspace')) failures.push('workbench html missing Source Regeneration Workspace card');
if (!workbenchHtml.includes('source-candidates/source-regeneration-workspace.html')) failures.push('workbench html missing source regeneration workspace link');
if (!textIncludesHtml(workbenchHtml, 'npm run source:regeneration-workspace && npm run source:regeneration-workspace-check && npm run source:regeneration-workspace:serve-smoke')) failures.push('workbench html missing source regeneration workspace command');
if (!workbenchHtml.includes('Focused replacement workspace')) failures.push('workbench html missing source regeneration workspace copy');
if (!workbenchHtml.includes('no-op replacement')) failures.push('workbench html missing source regeneration no-op copy');
if (!workbenchHtml.includes('Content Goal Audit')) failures.push('workbench html missing Content Goal Audit card');
if (!workbenchHtml.includes('content-goal-audit.html')) failures.push('workbench html missing content goal audit link');
if (!textIncludesHtml(workbenchHtml, 'npm run content:goal-readiness && npm run content:goal-readiness-check')) failures.push('workbench html missing content goal readiness command');
if (!textIncludesHtml(workbenchHtml, 'npm run content:goal-audit:serve-smoke')) failures.push('workbench html missing content goal audit serve smoke command');
if (!workbenchHtml.includes('Objective hard stop')) failures.push('workbench html missing content goal audit hard-stop copy');
if (!workbenchHtml.includes('Visual Regeneration Queue')) failures.push('workbench html missing Visual Regeneration Queue card');
if (!workbenchHtml.includes('content-visual-regeneration-queue.html')) failures.push('workbench html missing visual regeneration queue link');
if (!textIncludesHtml(workbenchHtml, 'npm run content:visual-regeneration && npm run content:visual-regeneration-check && npm run content:visual-regeneration:serve-smoke')) failures.push('workbench html missing visual regeneration queue command');
if (!workbenchHtml.includes('blocked runtime prototypes')) failures.push('workbench html missing visual regeneration blocked prototype copy');
if (!workbenchHtml.includes('source-first regeneration prompts')) failures.push('workbench html missing visual regeneration source-first copy');
if (!workbenchHtml.includes('strict-gate credit')) failures.push('workbench html missing visual regeneration strict-gate copy');
if (!workbenchHtml.includes('Acceptance Doctor')) failures.push('workbench html missing Acceptance Doctor card');
if (!workbenchHtml.includes('content-acceptance-doctor.html')) failures.push('workbench html missing acceptance doctor link');
if (!textIncludesHtml(workbenchHtml, 'npm run content:acceptance-doctor && npm run content:acceptance-doctor-check')) failures.push('workbench html missing acceptance doctor command');
if (!workbenchHtml.includes('Threat Acceptance Decisions')) failures.push('workbench html missing Threat Acceptance Decisions card');
if (!workbenchHtml.includes('content-threat-acceptance-decision-template.html')) failures.push('workbench html missing threat acceptance decisions link');
if (!textIncludesHtml(workbenchHtml, 'npm run content:threat-decisions && npm run content:threat-decisions-check')) failures.push('workbench html missing threat acceptance decisions command');
if (!textIncludesHtml(workbenchHtml, 'npm run content:threat-decisions-workspace-smoke')) failures.push('workbench html missing threat acceptance workspace smoke command');
if (!textIncludesHtml(workbenchHtml, 'npm run content:threat-decisions-apply')) failures.push('workbench html missing threat acceptance decisions apply command');
if (!workbenchHtml.includes('Approved Source Runtime Handoff')) failures.push('workbench html missing Approved Source Runtime Handoff card');
if (!workbenchHtml.includes('content-approved-runtime-handoff.html')) failures.push('workbench html missing approved runtime handoff link');
if (!textIncludesHtml(workbenchHtml, 'npm run content:approved-runtime-handoff && npm run content:approved-runtime-handoff-check')) failures.push('workbench html missing approved runtime handoff command');
if (!workbenchHtml.includes('Plan Coverage')) failures.push('workbench html missing Plan Coverage card');
if (!textIncludesHtml(workbenchHtml, 'npm run content:plan-coverage && npm run content:plan-coverage-check')) failures.push('workbench html missing plan coverage command');
if (!workbenchHtml.includes('Vertical Slice Runway')) failures.push('workbench html missing Vertical Slice Runway card');
if (!workbenchHtml.includes('content-vertical-slice-runway.html')) failures.push('workbench html missing vertical slice runway link');
if (!textIncludesHtml(workbenchHtml, 'npm run content:vertical-slice && npm run content:vertical-slice-check')) failures.push('workbench html missing vertical slice runway command');
if (!workbenchHtml.includes('contract-source-key-plan-rig-quality-runtime-visual-audit route')) failures.push('workbench html missing vertical slice route copy');
if (!workbenchHtml.includes('contact, phase, source-parity, and cohesion evidence')) failures.push('workbench html missing vertical slice rig-quality evidence copy');
if (!workbenchHtml.includes('Human Sign-Off Queue')) failures.push('workbench html missing Human Sign-Off Queue card');
if (!workbenchHtml.includes('content-human-signoff-queue.html')) failures.push('workbench html missing human sign-off queue link');
if (!textIncludesHtml(workbenchHtml, 'npm run content:human-signoff && npm run content:human-signoff-check')) failures.push('workbench html missing human sign-off queue command');
if (!workbenchHtml.includes('ready for human source sign-off')) failures.push('workbench html missing human sign-off queue copy');
if ((workbenchSummary.humanAdjudicationItems ?? -1) !== (humanAdjudicationBoard?.summary?.items ?? -2)) failures.push('workbench summary humanAdjudicationItems mismatch');
if ((workbenchSummary.humanAdjudicationSourceReady ?? -1) !== (humanAdjudicationBoard?.summary?.sourceReady ?? -2)) failures.push('workbench summary humanAdjudicationSourceReady mismatch');
if ((workbenchSummary.humanAdjudicationSourceApprovalReady ?? -1) !== (humanAdjudicationBoard?.summary?.sourceApprovalReady ?? -2)) failures.push('workbench summary humanAdjudicationSourceApprovalReady mismatch');
if ((workbenchSummary.humanAdjudicationSourceCriticRegenerationRequired ?? -1) !== (humanAdjudicationBoard?.summary?.sourceCriticRegenerationRequired ?? -2)) failures.push('workbench summary humanAdjudicationSourceCriticRegenerationRequired mismatch');
if ((workbenchSummary.humanAdjudicationThreatReady ?? -1) !== (humanAdjudicationBoard?.summary?.threatReady ?? -2)) failures.push('workbench summary humanAdjudicationThreatReady mismatch');
if ((workbenchSummary.humanAdjudicationAllMediaPresent ?? -1) !== (humanAdjudicationBoard?.summary?.allMediaPresent ?? -2)) failures.push('workbench summary humanAdjudicationAllMediaPresent mismatch');
if ((workbenchSummary.humanAdjudicationSourceApprovalCommands ?? -1) !== (humanAdjudicationBoard?.summary?.sourceApprovalCommands ?? -2)) failures.push('workbench summary humanAdjudicationSourceApprovalCommands mismatch');
if ((workbenchSummary.humanAdjudicationThreatAcceptanceCommands ?? -1) !== (humanAdjudicationBoard?.summary?.threatAcceptanceCommands ?? -2)) failures.push('workbench summary humanAdjudicationThreatAcceptanceCommands mismatch');
if ((workbenchSummary.humanAdjudicationSourcePreviewBoundaries ?? -1) !== (humanAdjudicationBoard?.summary?.sourcePreviewBoundaries ?? -2)) failures.push('workbench summary humanAdjudicationSourcePreviewBoundaries mismatch');
if ((workbenchSummary.humanAdjudicationRuntimePreviewBoundaries ?? -1) !== (humanAdjudicationBoard?.summary?.runtimePreviewBoundaries ?? -2)) failures.push('workbench summary humanAdjudicationRuntimePreviewBoundaries mismatch');
if ((workbenchSummary.humanAdjudicationPreviewOnlySources ?? -1) !== (humanAdjudicationBoard?.summary?.previewOnlySources ?? -2)) failures.push('workbench summary humanAdjudicationPreviewOnlySources mismatch');
if ((workbenchSummary.humanAdjudicationPreviewOnlyRuntimes ?? -1) !== (humanAdjudicationBoard?.summary?.previewOnlyRuntimes ?? -2)) failures.push('workbench summary humanAdjudicationPreviewOnlyRuntimes mismatch');
if (!workbenchHtml.includes('Human Adjudication Board')) failures.push('workbench html missing Human Adjudication Board card');
if (!workbenchHtml.includes('content-human-adjudication-board.html')) failures.push('workbench html missing human adjudication board link');
if (!textIncludesHtml(workbenchHtml, 'npm run content:human-adjudication-board && npm run content:human-adjudication-board-check')) failures.push('workbench html missing human adjudication board command');
if (!workbenchHtml.includes('source-ready after')) failures.push('workbench html missing human adjudication board copy');
if (!workbenchHtml.includes('preview-boundary claims')) failures.push('workbench html missing human adjudication preview-boundary copy');
if ((workbenchSummary.contentReviewSessionItems ?? -1) !== (contentReviewSession?.summary?.items ?? -2)) failures.push('workbench summary contentReviewSessionItems mismatch');
if ((workbenchSummary.contentReviewSessionSourceReady ?? -1) !== (contentReviewSession?.summary?.sourceReady ?? -2)) failures.push('workbench summary contentReviewSessionSourceReady mismatch');
if ((workbenchSummary.contentReviewSessionSourceApprovalReady ?? -1) !== (contentReviewSession?.summary?.sourceApprovalReady ?? -2)) failures.push('workbench summary contentReviewSessionSourceApprovalReady mismatch');
if ((workbenchSummary.contentReviewSessionSourceCriticRegenerationRequired ?? -1) !== (contentReviewSession?.summary?.sourceCriticRegenerationRequired ?? -2)) failures.push('workbench summary contentReviewSessionSourceCriticRegenerationRequired mismatch');
if ((workbenchSummary.contentReviewSessionThreatReady ?? -1) !== (contentReviewSession?.summary?.threatReady ?? -2)) failures.push('workbench summary contentReviewSessionThreatReady mismatch');
if ((workbenchSummary.contentReviewSessionAllMediaPresent ?? -1) !== (contentReviewSession?.summary?.allMediaPresent ?? -2)) failures.push('workbench summary contentReviewSessionAllMediaPresent mismatch');
if ((workbenchSummary.contentReviewSessionSourcePreviewBoundaries ?? -1) !== (contentReviewSession?.summary?.sourcePreviewBoundaries ?? -2)) failures.push('workbench summary contentReviewSessionSourcePreviewBoundaries mismatch');
if ((workbenchSummary.contentReviewSessionRuntimePreviewBoundaries ?? -1) !== (contentReviewSession?.summary?.runtimePreviewBoundaries ?? -2)) failures.push('workbench summary contentReviewSessionRuntimePreviewBoundaries mismatch');
if ((workbenchSummary.contentReviewSessionPreviewOnlySources ?? -1) !== (contentReviewSession?.summary?.previewOnlySources ?? -2)) failures.push('workbench summary contentReviewSessionPreviewOnlySources mismatch');
if ((workbenchSummary.contentReviewSessionPreviewOnlyRuntimes ?? -1) !== (contentReviewSession?.summary?.previewOnlyRuntimes ?? -2)) failures.push('workbench summary contentReviewSessionPreviewOnlyRuntimes mismatch');
if ((workbenchSummary.contentReviewSessionSourceChecks ?? -1) !== (contentReviewSession?.summary?.sourceChecks ?? -2)) failures.push('workbench summary contentReviewSessionSourceChecks mismatch');
if ((workbenchSummary.contentReviewSessionThreatChecks ?? -1) !== (contentReviewSession?.summary?.threatChecks ?? -2)) failures.push('workbench summary contentReviewSessionThreatChecks mismatch');
if (!workbenchHtml.includes('Content Review Session')) failures.push('workbench html missing Content Review Session card');
if (!workbenchHtml.includes('content-review-session.html')) failures.push('workbench html missing content review session link');
if (!textIncludesHtml(workbenchHtml, 'npm run content:review-session && npm run content:review-session-check')) failures.push('workbench html missing content review session command');
if (!workbenchHtml.includes('one session workspace with source and threat decision-file exports')) failures.push('workbench html missing content review session copy');
if (!workbenchHtml.includes('source/runtime preview-boundary claims')) failures.push('workbench html missing content review session preview-boundary copy');
if ((workbenchSummary.contentProductionProofCandidates ?? -1) !== (contentProductionProof?.summary?.candidates ?? -2)) failures.push('workbench summary contentProductionProofCandidates mismatch');
if ((workbenchSummary.contentProductionProofAcceptedThreats ?? -1) !== (contentProductionProof?.summary?.acceptedThreats ?? -2)) failures.push('workbench summary contentProductionProofAcceptedThreats mismatch');
if ((workbenchSummary.contentProductionProofPrototypeOnly ?? -1) !== (contentProductionProof?.summary?.prototypeOnly ?? -2)) failures.push('workbench summary contentProductionProofPrototypeOnly mismatch');
if ((workbenchSummary.contentProductionProofHumanReviewRequired ?? -1) !== (contentProductionProof?.summary?.humanReviewRequired ?? -2)) failures.push('workbench summary contentProductionProofHumanReviewRequired mismatch');
if (Boolean(workbenchSummary.contentProductionProofStrictReady) !== Boolean(contentProductionProof?.summary?.strictProductionReady)) failures.push('workbench summary contentProductionProofStrictReady mismatch');
if (!workbenchHtml.includes('Production Proof')) failures.push('workbench html missing Production Proof card');
if (!workbenchHtml.includes('content-production-proof.html')) failures.push('workbench html missing production proof link');
if (!textIncludesHtml(workbenchHtml, 'npm run content:production-proof && npm run content:production-proof-check')) failures.push('workbench html missing production proof command');
if (!workbenchHtml.includes('remain prototype-only')) failures.push('workbench html missing production proof copy');
if ((workbenchSummary.contentPromoteApprovedThreatsItems ?? -1) !== (contentPromoteApprovedThreats?.summary?.items ?? -2)) failures.push('workbench summary contentPromoteApprovedThreatsItems mismatch');
if ((workbenchSummary.contentPromoteApprovedThreatsSourceApproved ?? -1) !== (contentPromoteApprovedThreats?.summary?.sourceApproved ?? -2)) failures.push('workbench summary contentPromoteApprovedThreatsSourceApproved mismatch');
if ((workbenchSummary.contentPromoteApprovedThreatsReady ?? -1) !== (contentPromoteApprovedThreats?.summary?.readyForThreatDecision ?? -2)) failures.push('workbench summary contentPromoteApprovedThreatsReady mismatch');
if ((workbenchSummary.contentPromoteApprovedThreatsExcluded ?? -1) !== (contentPromoteApprovedThreats?.summary?.excludedNonTargetRigs ?? -2)) failures.push('workbench summary contentPromoteApprovedThreatsExcluded mismatch');
if (!workbenchHtml.includes('Promote Approved Threats')) failures.push('workbench html missing Promote Approved Threats card');
if (!workbenchHtml.includes('content-promote-approved-threats.html')) failures.push('workbench html missing promote approved threats link');
if (!textIncludesHtml(workbenchHtml, 'npm run content:promote-approved-threats && npm run content:promote-approved-threats-check')) failures.push('workbench html missing promote approved threats command');
if (!workbenchHtml.includes('non-target prototype rigs are excluded')) failures.push('workbench html missing promote approved threats copy');
if (workbenchSummary.runtimeCohesionReviewTarget !== (runtimeCohesionReview?.target?.id ?? null)) failures.push('workbench summary runtimeCohesionReviewTarget mismatch');
if (workbenchSummary.runtimeCohesionReviewSpecies !== (runtimeCohesionReview?.target?.species ?? null)) failures.push('workbench summary runtimeCohesionReviewSpecies mismatch');
if (workbenchSummary.runtimeCohesionReviewNextGate !== (runtimeCohesionReview?.target?.nextGate ?? null)) failures.push('workbench summary runtimeCohesionReviewNextGate mismatch');
if ((workbenchSummary.runtimeCohesionReviewMedia ?? -1) !== (runtimeCohesionReview?.media ?? []).filter((item) => item.present).length) failures.push('workbench summary runtimeCohesionReviewMedia mismatch');
if ((workbenchSummary.runtimeCohesionReviewRequiredMedia ?? -1) !== (runtimeCohesionReview?.media ?? []).length) failures.push('workbench summary runtimeCohesionReviewRequiredMedia mismatch');
if ((workbenchSummary.runtimeCohesionReviewChecks ?? -1) !== (runtimeCohesionReview?.requiredChecks ?? []).length) failures.push('workbench summary runtimeCohesionReviewChecks mismatch');
if (!workbenchHtml.includes('Runtime Cohesion Review')) failures.push('workbench html missing Runtime Cohesion Review card');
if (!workbenchHtml.includes('content-runtime-cohesion-review.html')) failures.push('workbench html missing runtime cohesion review link');
if (!textIncludesHtml(workbenchHtml, 'npm run content:runtime-cohesion-review && npm run content:runtime-cohesion-review-check')) failures.push('workbench html missing runtime cohesion review command');
if (!textIncludesHtml(workbenchHtml, 'npm run content:runtime-cohesion-review:serve-smoke')) failures.push('workbench html missing runtime cohesion review serve-smoke command');
if (!workbenchHtml.includes('Focused in-game cohesion packet')) failures.push('workbench html missing runtime cohesion review copy');
if ((workbenchSummary.contentSandboxRosterItems ?? -1) !== (contentSandboxRoster?.summary?.items ?? -2)) failures.push('workbench summary contentSandboxRosterItems mismatch');
if ((workbenchSummary.contentSandboxRosterReady ?? -1) !== (contentSandboxRoster?.summary?.sandboxReady ?? -2)) failures.push('workbench summary contentSandboxRosterReady mismatch');
if ((workbenchSummary.contentSandboxRosterRuntimePreviews ?? -1) !== (contentSandboxRoster?.summary?.runtimePreviews ?? -2)) failures.push('workbench summary contentSandboxRosterRuntimePreviews mismatch');
if ((workbenchSummary.contentSandboxRosterSourcePreviews ?? -1) !== (contentSandboxRoster?.summary?.sourcePreviews ?? -2)) failures.push('workbench summary contentSandboxRosterSourcePreviews mismatch');
if ((workbenchSummary.contentSandboxRosterPairedRuntimePreviews ?? -1) !== (contentSandboxRoster?.summary?.pairedRuntimePreviews ?? -2)) failures.push('workbench summary contentSandboxRosterPairedRuntimePreviews mismatch');
if ((workbenchSummary.contentSandboxRosterPairedSourcePreviews ?? -1) !== (contentSandboxRoster?.summary?.pairedSourcePreviews ?? -2)) failures.push('workbench summary contentSandboxRosterPairedSourcePreviews mismatch');
if (!workbenchHtml.includes('Content Sandbox Roster')) failures.push('workbench html missing Content Sandbox Roster card');
if (!workbenchHtml.includes('content-sandbox-roster.html')) failures.push('workbench html missing content sandbox roster link');
if (!textIncludesHtml(workbenchHtml, 'npm run content:sandbox-roster && npm run content:sandbox-roster-check')) failures.push('workbench html missing content sandbox roster command');
if (!workbenchHtml.includes('target threats have source, runtime, paired-diver preview, and visual-check commands')) failures.push('workbench html missing content sandbox roster copy');
if ((workbenchSummary.contentArticulationRosterItems ?? -1) !== (contentArticulationRoster?.summary?.items ?? -2)) failures.push('workbench summary contentArticulationRosterItems mismatch');
if ((workbenchSummary.contentArticulationRosterReady ?? -1) !== (contentArticulationRoster?.summary?.mechanicallyReady ?? -2)) failures.push('workbench summary contentArticulationRosterReady mismatch');
if ((workbenchSummary.contentArticulationRosterMagentaSources ?? -1) !== (contentArticulationRoster?.summary?.magentaSourceImages ?? -2)) failures.push('workbench summary contentArticulationRosterMagentaSources mismatch');
if ((workbenchSummary.contentArticulationRosterStarterPlans ?? -1) !== (contentArticulationRoster?.summary?.starterPlans ?? -2)) failures.push('workbench summary contentArticulationRosterStarterPlans mismatch');
if ((workbenchSummary.contentArticulationRosterPlanPreviews ?? -1) !== (contentArticulationRoster?.summary?.planPreviews ?? -2)) failures.push('workbench summary contentArticulationRosterPlanPreviews mismatch');
if ((workbenchSummary.contentArticulationRosterSourceParity ?? -1) !== (contentArticulationRoster?.summary?.sourceParity ?? -2)) failures.push('workbench summary contentArticulationRosterSourceParity mismatch');
if ((workbenchSummary.contentArticulationRosterVisualCohesionPasses ?? -1) !== (contentArticulationRoster?.summary?.visualCohesionPasses ?? -2)) failures.push('workbench summary contentArticulationRosterVisualCohesionPasses mismatch');
if (!workbenchHtml.includes('Content Articulation Roster')) failures.push('workbench html missing Content Articulation Roster card');
if (!workbenchHtml.includes('content-articulation-roster.html')) failures.push('workbench html missing content articulation roster link');
if (!textIncludesHtml(workbenchHtml, 'npm run content:articulation-roster && npm run content:articulation-roster-check')) failures.push('workbench html missing content articulation roster command');
if (!workbenchHtml.includes('target threats have source-to-articulation evidence staged')) failures.push('workbench html missing content articulation roster copy');
if ((workbenchSummary.contentReproducibilityTargets ?? -1) !== (contentReproducibility?.summary?.targetThreats ?? -2)) failures.push('workbench summary contentReproducibilityTargets mismatch');
if ((workbenchSummary.contentReproducibilityItems ?? -1) !== (contentReproducibility?.summary?.items ?? -2)) failures.push('workbench summary contentReproducibilityItems mismatch');
if ((workbenchSummary.contentReproducibilityReady ?? -1) !== (contentReproducibility?.summary?.reproducibleTargets ?? -2)) failures.push('workbench summary contentReproducibilityReady mismatch');
if ((workbenchSummary.contentReproducibilityMagentaSources ?? -1) !== (contentReproducibility?.summary?.magentaSources ?? -2)) failures.push('workbench summary contentReproducibilityMagentaSources mismatch');
if ((workbenchSummary.contentReproducibilityRuntimeRegistered ?? -1) !== (contentReproducibility?.summary?.runtimeRegistered ?? -2)) failures.push('workbench summary contentReproducibilityRuntimeRegistered mismatch');
if (!workbenchHtml.includes('Content Reproducibility')) failures.push('workbench html missing Content Reproducibility card');
if (!workbenchHtml.includes('content-reproducibility.html')) failures.push('workbench html missing content reproducibility link');
if (!textIncludesHtml(workbenchHtml, 'npm run content:reproducibility && npm run content:reproducibility-check')) failures.push('workbench html missing content reproducibility command');
if (!workbenchHtml.includes('Reproducible still does not mean visually approved')) failures.push('workbench html missing content reproducibility approval boundary copy');
if (!workbenchHtml.includes('rigging plans staged')) failures.push('workbench html missing rigging plans staged summary');
if (!workbenchHtml.includes('plan previews are staged')) failures.push('workbench html missing rigging plan preview staged copy');
const quickPreviews = Array.isArray(workbench?.quickPreviews) ? workbench.quickPreviews : [];
if (!quickPreviews.some((entry) => entry.id === 'diver')) failures.push('workbench quick previews missing diver');
if (!quickPreviews.some((entry) => String(entry.id).includes('gulper'))) failures.push('workbench quick previews missing gulper');
for (const entry of quickPreviews) {
  if (!entry.acceptanceState) failures.push(`${entry.id ?? 'unknown'}: workbench quick preview missing acceptanceState`);
  if (!entry.qualityStatus) failures.push(`${entry.id ?? 'unknown'}: workbench quick preview missing qualityStatus`);
  if (entry.countsTowardGate === true && entry.acceptanceState !== 'accepted-threat') {
    failures.push(`${entry.id}: workbench quick preview can only count toward gate when accepted`);
  }
  if (entry.id !== 'diver' && entry.acceptanceState !== 'accepted-threat' && !String(entry.reviewWarning ?? '').includes('preview only')) {
    failures.push(`${entry.id}: workbench quick preview missing prototype/source warning`);
  }
  if (entry.reviewWarning && !workbenchHtml.includes(entry.reviewWarning)) {
    failures.push(`${entry.id}: workbench html missing quick preview warning`);
  }
  if (entry.id !== 'diver') {
    if (!String(entry.previewUrl ?? entry.pairedUrl ?? '').includes('companion=diver')) failures.push(`${entry.id}: workbench quick preview missing paired diver URL`);
    if (!String(entry.previewCommand ?? '').includes('--with diver')) failures.push(`${entry.id}: workbench quick preview command missing --with diver`);
  }
}
for (const target of workbench?.nextTargets ?? []) {
  if (target.countsTowardGate === true && target.accepted !== true) {
    failures.push(`${target.id}: workbench next target can only count toward gate when accepted`);
  }
  if (target.accepted !== true && !String(target.reviewWarning ?? '').includes('Not accepted')) {
    failures.push(`${target.id}: workbench next target missing not-accepted warning`);
  }
  if (target.reviewWarning && !workbenchHtml.includes(target.reviewWarning)) {
    failures.push(`${target.id}: workbench html missing next target warning`);
  }
}
if (!workbenchHtml.includes('Source Imagegen Health')) failures.push('workbench html missing Source Imagegen Health card');
if (!workbenchHtml.includes('npm run source:imagegen-health')) failures.push('workbench html missing source:imagegen-health command');
if (!workbenchHtml.includes('Research Source Trace')) failures.push('workbench html missing Research Source Trace card');
if (!workbenchHtml.includes('npm run research:source-trace')) failures.push('workbench html missing research:source-trace command');
if (!workbenchHtml.includes('Source Intake Runway')) failures.push('workbench html missing Source Intake Runway card');
if (!workbenchHtml.includes('npm run source:intake-runway')) failures.push('workbench html missing source:intake-runway command');
if (!workbenchHtml.includes('Source Intake Doctor')) failures.push('workbench html missing Source Intake Doctor card');
if (!workbenchHtml.includes('source-candidates/source-intake-doctor.html')) failures.push('workbench html missing source intake doctor link');
if (!workbenchHtml.includes('npm run source:intake-doctor')) failures.push('workbench html missing source:intake-doctor command');
if (!workbenchHtml.includes('Source Workstation')) failures.push('workbench html missing Source Workstation card');
if (!workbenchHtml.includes('source-candidates/source-workstation.html')) failures.push('workbench html missing source workstation link');
if (!workbenchHtml.includes('npm run source:workstation')) failures.push('workbench html missing source:workstation command');
if (!workbenchHtml.includes('Source Acquisition Board')) failures.push('workbench html missing Source Acquisition Board card');
if (!workbenchHtml.includes('npm run source:generation-queue')) failures.push('workbench html missing source:generation-queue command');
if (!workbenchHtml.includes('Content Readiness Dossier')) failures.push('workbench html missing Content Readiness Dossier card');
if (!workbenchHtml.includes('npm run content:readiness')) failures.push('workbench html missing content:readiness command');
if (!workbenchHtml.includes('Acceptance Runway')) failures.push('workbench html missing Acceptance Runway card');
if (!workbenchHtml.includes('npm run content:acceptance-runway')) failures.push('workbench html missing content:acceptance-runway command');
if (!workbenchHtml.includes('Source Review Dossier')) failures.push('workbench html missing Source Review Dossier card');
if (!workbenchHtml.includes('npm run source:review-dossier')) failures.push('workbench html missing source:review-dossier command');
if (!workbenchHtml.includes('Next Source Decision Draft')) failures.push('workbench html missing Next Source Decision Draft card');
if (!workbenchHtml.includes('source-candidates/source-next-decision-draft.html')) failures.push('workbench html missing source next decision draft link');
if (!textIncludesHtml(workbenchHtml, 'npm run source:next-decision-draft && npm run source:next-decision-draft-check')) failures.push('workbench html missing source next decision draft command');
if (!textIncludesHtml(workbenchHtml, 'npm run source:next-decision-draft:serve-smoke')) failures.push('workbench html missing source next decision draft serve-smoke command');
if (!workbenchHtml.includes('Focused reviewed-only decision draft')) failures.push('workbench html missing source next decision draft reviewed-only copy');
if (!workbenchHtml.includes('Source Cohesion Batch Decisions')) failures.push('workbench html missing Source Cohesion Batch Decisions card');
if (!workbenchHtml.includes('source-candidates/source-cohesion-decision-template.html')) failures.push('workbench html missing source cohesion decision template link');
if (!workbenchHtml.includes('source approval batch-decision fields')) failures.push('workbench html missing source approval batch-decision wording');
if (!textIncludesHtml(workbenchHtml, 'npm run source:approval-decisions && npm run source:approval-decisions-check')) failures.push('workbench html missing source approval decisions build/check command');
if (!textIncludesHtml(workbenchHtml, 'npm run source:approval-decisions-workspace-smoke')) failures.push('workbench html missing source approval decisions workspace smoke command');
if (!textIncludesHtml(workbenchHtml, 'npm run source:approval-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict')) {
  failures.push('workbench html missing reviewed-only strict source approval decisions dry-run command');
}
if (textIncludesHtml(workbenchHtml, 'npm run source:approval-decisions-apply -- --decisions water9-source-cohesion-decisions.json --strict')) {
  failures.push('workbench html must not advertise generic source approval decisions file');
}
if (!(workbench?.gateCommands ?? []).includes('npm run source:approval-decisions && npm run source:approval-decisions-check && npm run source:approval-decisions-workspace-smoke')) {
  failures.push('workbench gateCommands missing source approval decision build/check/workspace smoke command');
}
if (!(workbench?.gateCommands ?? []).includes('npm run source:next-decision-draft && npm run source:next-decision-draft-check && npm run source:next-decision-draft:serve-smoke')) {
  failures.push('workbench gateCommands missing source next decision draft build/check/serve-smoke command');
}
if (!(workbench?.gateCommands ?? []).includes('npm run source:approval-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict')) {
  failures.push('workbench gateCommands missing reviewed-only strict source approval decision dry-run command');
}
if ((workbench?.gateCommands ?? []).includes('npm run source:approval-decisions-apply -- --decisions water9-source-cohesion-decisions.json --strict')) {
  failures.push('workbench gateCommands must not advertise generic source approval decisions file');
}
if (!(workbench?.gateCommands ?? []).includes('npm run content:reproducibility && npm run content:reproducibility-check')) {
  failures.push('workbench gateCommands missing content reproducibility command');
}
if (!(workbench?.gateCommands ?? []).includes('npm run content:runtime-cohesion-review && npm run content:runtime-cohesion-review-check && npm run content:runtime-cohesion-review:serve-smoke')) {
  failures.push('workbench gateCommands missing runtime cohesion review command');
}
if (!(workbench?.gateCommands ?? []).includes('npm run source:approval-marathon && npm run source:approval-marathon-check && npm run source:approval-marathon-workspace-smoke && npm run source:approval-marathon-full-batch-smoke')) {
  failures.push('workbench gateCommands missing source approval marathon full-batch smoke command');
}
if (!(workbench?.gateCommands ?? []).includes('npm run content:synthetic-decision-guards-check')) {
  failures.push('workbench gateCommands missing synthetic decision guard check command');
}
if (!workbench?.launchCommands?.includes('npm run sandbox:preview -- --id gulper --kind articulated --with diver --serve --open --visual')) {
  failures.push('workbench launchCommands missing shorthand curated-alias gulper preview');
}
for (const command of workbench?.launchCommands ?? []) {
  if (!workbenchHtml.includes(command)) failures.push(`workbench html missing launch command ${command}`);
}

if (stageBoard?.schema !== 'water9/content-stage-board@1') failures.push(`stage board schema is ${stageBoard?.schema ?? 'missing'}`);
if ((stageBoard?.summary?.targetThreats ?? 0) < minThreats) failures.push('stage board targetThreats is below requirement');
if (nextAction?.schema !== 'water9/content-next-action@1') failures.push(`content next action schema is ${nextAction?.schema ?? 'missing'}`);
await fileOk('content next action markdown', paths.nextActionMarkdown, 512);
if ((nextAction?.summary?.targetThreats ?? 0) !== (stageBoard?.summary?.targetThreats ?? 0)) failures.push('content next action targetThreats mismatch with stage board');
if ((nextAction?.summary?.acceptedThreats ?? -1) !== (stageBoard?.summary?.acceptedThreats ?? -2)) failures.push('content next action acceptedThreats mismatch with stage board');
if (nextAction?.summary?.nextBottleneck !== stageBoard?.summary?.nextBottleneck) failures.push('content next action bottleneck mismatch with stage board');
if ((nextAction?.summary?.sourceReviewReadyForHumanReview ?? -1) !== (sourceApprovalRunway?.summary?.readyForHumanReview ?? -2)) failures.push('content next action sourceReviewReadyForHumanReview mismatch with approval runway');
if ((nextAction?.summary?.sourceReviewMechanicallyReadyForHumanReview ?? -1) !== (sourceApprovalRunway?.summary?.mechanicallyReadyForHumanReview ?? -2)) failures.push('content next action sourceReviewMechanicallyReadyForHumanReview mismatch with approval runway');
if ((nextAction?.summary?.sourceReviewCriticRegenerationRequired ?? -1) !== (sourceApprovalRunway?.summary?.criticRegenerationRequired ?? -2)) failures.push('content next action sourceReviewCriticRegenerationRequired mismatch with approval runway');
if ((nextAction?.summary?.sourceCriticRegenerationNextTarget ?? null) !== (sourceCriticRegeneration?.summary?.nextCandidateId ?? null)) failures.push('content next action sourceCriticRegenerationNextTarget mismatch with critic regeneration queue');
if ((nextAction?.summary?.sourceCriticRegenerationNextTargetSpecies ?? null) !== (sourceCriticRegeneration?.summary?.nextCandidateSpecies ?? null)) failures.push('content next action sourceCriticRegenerationNextTargetSpecies mismatch with critic regeneration queue');
if ((nextAction?.summary?.sourceCriticRegenerationHealthNextStatus ?? null) !== (sourceCriticRegenerationHealth?.summary?.nextActionStatus ?? null)) failures.push('content next action sourceCriticRegenerationHealthNextStatus mismatch with health report');
if ((nextAction?.summary?.sourceCriticRegenerationHealthDistinctReady ?? null) !== (sourceCriticRegenerationHealth?.summary?.distinctReplacementReady ?? null)) failures.push('content next action sourceCriticRegenerationHealthDistinctReady mismatch with health report');
if ((nextAction?.summary?.sourceCriticRegenerationHealthNoop ?? null) !== (sourceCriticRegenerationHealth?.summary?.validNoopReplacements ?? null)) failures.push('content next action sourceCriticRegenerationHealthNoop mismatch with health report');
if ((nextAction?.summary?.sourceCriticRegenerationHealthMissing ?? null) !== (sourceCriticRegenerationHealth?.summary?.missingReplacements ?? null)) failures.push('content next action sourceCriticRegenerationHealthMissing mismatch with health report');
if ((nextAction?.summary?.sourceReviewSequencerNextLane ?? null) !== (sourceReviewSequencer?.summary?.nextLane ?? null)) failures.push('content next action sourceReviewSequencerNextLane mismatch with sequencer');
if ((nextAction?.summary?.sourceReviewSequencerNextTarget ?? null) !== (sourceReviewSequencer?.summary?.nextTarget ?? null)) failures.push('content next action sourceReviewSequencerNextTarget mismatch with sequencer');
if ((nextAction?.summary?.sourceReviewSequencerApprovalReady ?? null) !== (sourceReviewSequencer?.summary?.approvalReady ?? null)) failures.push('content next action sourceReviewSequencerApprovalReady mismatch with sequencer');
if ((nextAction?.summary?.sourceReviewSequencerCriticRegenerationRequired ?? null) !== (sourceReviewSequencer?.summary?.criticRegenerationRequired ?? null)) failures.push('content next action sourceReviewSequencerCriticRegenerationRequired mismatch with sequencer');
if ((nextAction?.summary?.sourceReviewSequencerNoop ?? null) !== (sourceReviewSequencer?.summary?.validNoopReplacements ?? null)) failures.push('content next action sourceReviewSequencerNoop mismatch with sequencer');
if ((nextAction?.summary?.sourceReviewSequencerMissing ?? null) !== (sourceReviewSequencer?.summary?.missingReplacements ?? null)) failures.push('content next action sourceReviewSequencerMissing mismatch with sequencer');
if ((nextAction?.summary?.sourceRegenerationWorkspaceTarget ?? null) !== (sourceRegenerationWorkspace?.target?.id ?? null)) failures.push('content next action sourceRegenerationWorkspaceTarget mismatch with workspace');
if ((nextAction?.summary?.sourceRegenerationWorkspaceLane ?? null) !== (sourceRegenerationWorkspace?.target?.lane ?? null)) failures.push('content next action sourceRegenerationWorkspaceLane mismatch with workspace');
if ((nextAction?.summary?.sourceRegenerationWorkspaceHealthStatus ?? null) !== (sourceRegenerationWorkspace?.target?.healthStatus ?? null)) failures.push('content next action sourceRegenerationWorkspaceHealthStatus mismatch with workspace');
if (Boolean(nextAction?.summary?.sourceRegenerationWorkspaceNoop) !== Boolean(sourceRegenerationWorkspace?.target?.replacementMatchesCurrentSource)) failures.push('content next action sourceRegenerationWorkspaceNoop mismatch with workspace');
if (Boolean(nextAction?.summary?.sourceRegenerationWorkspaceDistinctReady) !== Boolean(sourceRegenerationWorkspace?.target?.distinctReplacementReady)) failures.push('content next action sourceRegenerationWorkspaceDistinctReady mismatch with workspace');
const nextTopTargets = Array.isArray(nextAction?.topTargets) ? nextAction.topTargets : [];
const nextActionBody = nextAction?.nextAction ?? {};
if (!nextTopTargets.length && (stageBoard?.summary?.acceptedThreats ?? 0) < minThreats) failures.push('content next action must include top targets while gate is incomplete');
const nextParallelSourceReviewTarget = nextAction?.parallelActions?.sourceReview?.targetId ?? null;
const approvalReadySourceReviewTarget = sourceApprovalRunway?.recommended?.id ?? (sourceApprovalRunway?.items ?? []).find((item) => item.readyForHumanReview === true && item.humanApproved !== true)?.id ?? null;
const nextTopIsSourceReview = ['source-review-needed', 'prototype-needs-approved-source'].includes(nextTopTargets[0]?.stage);
if (nextTopTargets[0] && nextActionBody.targetId !== nextTopTargets[0].id) {
  if (!(nextTopIsSourceReview && nextActionBody.kind === 'source-review' && nextActionBody.targetId === nextParallelSourceReviewTarget)) {
    failures.push('content next action target must match first top target or recommended source-review target');
  }
}
if (nextTopTargets[0] && nextActionBody.stage !== nextTopTargets[0].stage) failures.push('content next action stage must match first top target');
if (!Array.isArray(nextActionBody.commands) || nextActionBody.commands.length < 1) failures.push('content next action commands are missing');
if (!Array.isArray(nextActionBody.acceptanceCriteria) || nextActionBody.acceptanceCriteria.length < 1) failures.push('content next action acceptance criteria are missing');
if (nextTopTargets[0] && !nextActionBody.gateTruth) failures.push('content next action missing gateTruth');
if (nextActionBody.gateTruth?.countsTowardGate === true && nextActionBody.gateTruth?.accepted !== true) {
  failures.push('content next action gateTruth can only count toward gate when accepted');
}
if (nextTopTargets[0] && nextActionBody.gateTruth?.countsTowardGate !== true && !String(nextActionBody.gateTruth?.reviewWarning ?? '').includes('Not accepted')) {
  failures.push('content next action missing not-accepted gateTruth warning');
}
for (const section of ['Water9 Content Next Action', '## Next Action', '### Commands', '### Acceptance Criteria', '## Top Queue']) {
  if (!nextActionMarkdown.includes(section)) failures.push(`content next action markdown missing section ${section}`);
}
for (const command of nextActionBody.commands ?? []) {
  if (!nextActionMarkdown.includes(command)) failures.push(`content next action markdown missing command ${command}`);
}
if (nextActionBody.gateTruth?.reviewWarning && !nextActionMarkdown.includes(nextActionBody.gateTruth.reviewWarning)) {
  failures.push('content next action markdown missing gateTruth warning');
}
if (nextActionBody.kind === 'source-image' && !nextActionBody.commands.some((command) => command.includes('source:inbox') || command.includes('source:recover-inline') || command.includes('source:ingest'))) {
  failures.push('source-image next action must include inbox/recovery/ingest commands');
}
if (nextActionBody.kind === 'source-image' && (nextActionBody.missingArtifactAttempts ?? 0) >= 3) {
  const expectedCapture = `npm run source:inbox-capture -- --id ${nextActionBody.targetId} --open`;
  const expectedRecoverSaved = `npm run source:recover-inline -- --id ${nextActionBody.targetId} --image <saved-image-path> --copy --validate`;
  const expectedCaptureUrl = `http://127.0.0.1:5188/?id=${encodeURIComponent(nextActionBody.targetId)}`;
  const expectedInboxTarget = `tools/source-inbox/${nextActionBody.targetId}.png`;
  const expectedAlternateInboxTarget = `tools/source-inbox/fauna-${nextActionBody.targetId}-whole-source.png`;
  const expectedOutput = `public/assets/generated/fauna-${nextActionBody.targetId}-whole-source.png`;
  if (nextActionBody.captureFirst !== true) failures.push('content next action repeated missing-artifact target must be capture-first');
  if (!String(nextActionBody.captureReason ?? '').includes('missing-artifact attempts')) failures.push('content next action capture-first reason missing repeated artifact context');
  if (nextActionBody.recommendedFirst !== expectedCapture) failures.push(`content next action recommendedFirst must be target-aware: ${nextActionBody.recommendedFirst}`);
  if (nextActionBody.recommendedFallback !== expectedRecoverSaved) failures.push(`content next action recommendedFallback must be explicit saved-file recovery: ${nextActionBody.recommendedFallback}`);
  if (nextActionBody.commands?.[0] !== expectedCapture) failures.push(`content next action capture-first first command must be ${expectedCapture}`);
  if ((nextActionBody.commands ?? []).includes('npm run source:inbox-capture')) failures.push('content next action capture-first commands must not use generic source:inbox-capture');
  if (nextActionBody.capture?.captureCommand !== expectedCapture) failures.push('content next action capture command must be target-aware');
  if (nextActionBody.capture?.captureUrl !== expectedCaptureUrl) failures.push(`content next action capture URL must be ${expectedCaptureUrl}`);
  if (nextActionBody.capture?.inboxTarget !== expectedInboxTarget) failures.push(`content next action inbox target must be ${expectedInboxTarget}`);
  if (nextActionBody.capture?.alternateInboxTarget !== expectedAlternateInboxTarget) failures.push(`content next action alternate inbox target must be ${expectedAlternateInboxTarget}`);
  if (nextActionBody.capture?.expectedOutput !== expectedOutput) failures.push(`content next action expected output must be ${expectedOutput}`);
  if (!String(nextActionBody.capture?.promptFile ?? '').includes(`${nextActionBody.targetId}`)) failures.push('content next action prompt file must be target-specific');
  if (nextActionBody.capture?.recoveryCommand !== expectedRecoverSaved) failures.push('content next action recovery command must match saved-file recovery');
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
    nextActionBody.capture?.promptFile,
  ]) {
    if (!nextActionMarkdown.includes(required)) failures.push(`content next action markdown missing capture-first detail ${required}`);
  }
}
if (nextActionBody.kind === 'source-review') {
  for (const expected of [
    'npm run source:approval-runway',
    'npm run source:approval-runway-check',
    'npm run source:approval-session',
    'npm run source:approval-session-check',
    'npm run source:approval-session:serve-smoke',
    'npm run source:approval-marathon',
    'npm run source:approval-marathon-check',
    'npm run source:approval-marathon-workspace-smoke',
    'npm run source:approval-marathon-full-batch-smoke',
    'npm run content:synthetic-decision-guards-check',
	    'npm run source:approval-runway:preview',
	    'npm run source:visual-board',
	    'npm run source:visual-board-check',
	    'npm run source:cohesion-decisions',
	    'npm run source:cohesion-decisions-check',
  'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
	    'npm run content:review-session',
	    'npm run content:review-session-check',
	    'npm run content:review-session:serve-smoke',
	    'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
	  ]) {
	    if (!(nextActionBody.commands ?? []).includes(expected)) failures.push(`content next action source-review commands missing ${expected}`);
	    if (!nextActionMarkdown.includes(expected)) failures.push(`content next action markdown missing source-review command ${expected}`);
	  }
	  if (!(nextActionBody.acceptanceCriteria ?? []).some((criterion) => String(criterion).includes('source approval runway'))) {
	    failures.push('content next action source-review criteria must mention source approval runway');
	  }
	  if (!(nextActionBody.acceptanceCriteria ?? []).some((criterion) => String(criterion).includes('source approval session'))) {
	    failures.push('content next action source-review criteria must mention source approval session');
	  }
	  if (!(nextActionBody.acceptanceCriteria ?? []).some((criterion) => String(criterion).includes('batch decision workspace'))) {
	    failures.push('content next action source-review criteria must mention batch decision workspace');
	  }
	  if (!(nextActionBody.acceptanceCriteria ?? []).some((criterion) => String(criterion).includes('full-batch dry-run guard'))) {
	    failures.push('content next action source-review criteria must mention full-batch dry-run guard');
	  }
	  if (!(nextActionBody.acceptanceCriteria ?? []).some((criterion) => String(criterion).includes('reviewed-only source decisions'))) {
	    failures.push('content next action source-review criteria must mention reviewed-only source decisions');
	  }
	  for (const command of (nextActionBody.commands ?? []).filter((entry) => String(entry).includes('npm run source:accept'))) {
	    if (!String(command).includes('--dry-run')) failures.push('content next action source-review source:accept commands must be dry-run only');
	    if (!String(command).includes('--source-visual-board public/review/source-visual-board.json')) failures.push('content next action source-review source:accept commands must require source visual board evidence');
	  }
  if (!nextActionMarkdown.includes('### Command Boundary')) failures.push('content next action markdown missing command boundary');
}
if ((nextAction?.summary?.sourceReviewReadyForHumanReview ?? 0) > 0) {
  const sequencerAction = nextAction.parallelActions?.sourceReviewSequencer;
  const expectedSequencerTarget = sourceReviewSequencer?.summary?.nextTarget ?? null;
  const expectedSequencerItem = expectedSequencerTarget
    ? sourceReviewSequencerItems.find((item) => item.id === expectedSequencerTarget) ?? null
    : null;
  if (!sequencerAction) failures.push('content next action missing parallel sourceReviewSequencer action');
  if (sequencerAction && expectedSequencerItem) {
    if (sequencerAction.kind !== 'source-review-sequencer') failures.push(`content next action parallel sourceReviewSequencer kind is ${sequencerAction.kind}`);
    if (sequencerAction.targetId !== expectedSequencerItem.id) failures.push(`content next action parallel sourceReviewSequencer target must be ${expectedSequencerItem.id}`);
    if (sequencerAction.lane !== expectedSequencerItem.lane) failures.push('content next action parallel sourceReviewSequencer lane mismatch');
    if (sequencerAction.status !== expectedSequencerItem.status) failures.push('content next action parallel sourceReviewSequencer status mismatch');
    for (const expectedCommand of [
      'npm run source:review-sequencer',
      'npm run source:review-sequencer-check',
      'npm run source:review-sequencer:serve-smoke',
      ...(expectedSequencerItem.nextCommands ?? []),
    ]) {
      if (!(sequencerAction.commands ?? []).includes(expectedCommand)) failures.push(`content next action parallel sourceReviewSequencer commands missing ${expectedCommand}`);
      if (!nextActionMarkdown.includes(expectedCommand)) failures.push(`content next action markdown missing parallel sourceReviewSequencer command ${expectedCommand}`);
    }
    if (expectedSequencerItem.lane !== 'regenerate-distinct-ready' && (sequencerAction.commands ?? []).some((command) => String(command).includes('source:ingest') && String(command).includes('--overwrite'))) {
      failures.push('content next action parallel sourceReviewSequencer must not recommend overwrite ingest outside distinct-ready lane');
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
      if (!nextActionMarkdown.includes(required)) failures.push(`content next action markdown missing parallel sourceReviewSequencer detail ${required}`);
    }
  }
  const sourceReviewAction = nextAction.parallelActions?.sourceReview;
  if (!sourceReviewAction) failures.push('content next action missing parallel sourceReview action');
  if (sourceReviewAction) {
    if (sourceReviewAction.kind !== 'source-review') failures.push(`content next action parallel sourceReview kind is ${sourceReviewAction.kind}`);
    if (!sourceReviewAction.targetId) failures.push('content next action parallel sourceReview missing targetId');
    if (approvalReadySourceReviewTarget && sourceReviewAction.targetId !== approvalReadySourceReviewTarget) failures.push(`content next action parallel sourceReview target must be ${approvalReadySourceReviewTarget}`);
    if (sourceReviewAction.status !== 'ready-for-human-review') failures.push(`content next action parallel sourceReview status is ${sourceReviewAction.status}`);
    if (sourceReviewAction.recommendedFirst !== 'npm run source:approval-session:serve-smoke') failures.push('content next action parallel sourceReview recommendedFirst mismatch');
    if (!sourceReviewAction.acceptCommand?.includes(`npm run source:accept -- --id ${sourceReviewAction.targetId}`)) failures.push('content next action parallel sourceReview acceptCommand missing or wrong');
	    if (!sourceReviewAction.acceptCommandDryRun?.includes(`npm run source:accept -- --id ${sourceReviewAction.targetId}`) || !sourceReviewAction.acceptCommandDryRun?.includes('--dry-run')) failures.push('content next action parallel sourceReview acceptCommandDryRun missing or wrong');
	    if (!sourceReviewAction.acceptCommandDryRun?.includes('--source-visual-board public/review/source-visual-board.json')) failures.push('content next action parallel sourceReview acceptCommandDryRun must require source visual board evidence');
	    if (!sourceReviewAction.rejectCommand?.includes(`npm run source:accept -- --id ${sourceReviewAction.targetId} --status rejected`)) failures.push('content next action parallel sourceReview rejectCommand missing or wrong');
	    if (!sourceReviewAction.rejectCommandDryRun?.includes(`npm run source:accept -- --id ${sourceReviewAction.targetId} --status rejected`) || !sourceReviewAction.rejectCommandDryRun?.includes('--dry-run')) failures.push('content next action parallel sourceReview rejectCommandDryRun missing or wrong');
	    if (!sourceReviewAction.rejectCommandDryRun?.includes('--source-visual-board public/review/source-visual-board.json')) failures.push('content next action parallel sourceReview rejectCommandDryRun must require source visual board evidence');
    for (const required of ['--source-rejected', '--source-visual-board public/review/source-visual-board.json', '--failed-check ', '--visual-note ']) {
      if (!String(sourceReviewAction.rejectCommand ?? '').includes(required)) failures.push(`content next action parallel sourceReview rejectCommand missing ${required}`);
      if (!String(sourceReviewAction.rejectCommandDryRun ?? '').includes(required)) failures.push(`content next action parallel sourceReview rejectCommandDryRun missing ${required}`);
    }
    const evidenceLinks = sourceReviewAction.evidenceLinks ?? {};
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
	    })) {
      if (evidenceLinks[key] !== expected) failures.push(`content next action parallel sourceReview evidenceLinks.${key} mismatch`);
    }
    for (const key of ['quickReview', 'source', 'keyPreview', 'sandboxScreenshot', 'planPreview', 'contractMarkdown']) {
      if (!evidenceLinks[key]) failures.push(`content next action parallel sourceReview evidenceLinks.${key} missing`);
    }
    for (const key of ['approvalRunwayReady', 'visualBoardReady', 'sourceDossierReady', 'humanApproved']) {
      if (sourceReviewAction.evidenceSummary?.[key] == null) failures.push(`content next action parallel sourceReview evidenceSummary.${key} missing`);
    }
    for (const requiredCommand of [
      'npm run source:approval-runway',
      'npm run source:approval-runway-check',
      'npm run source:approval-session',
      'npm run source:approval-session-check',
      'npm run source:approval-session:serve-smoke',
      'npm run source:approval-marathon',
      'npm run source:approval-marathon-check',
      'npm run source:approval-marathon-workspace-smoke',
      'npm run source:approval-marathon-full-batch-smoke',
      'npm run content:synthetic-decision-guards-check',
	      'npm run source:approval-runway:preview',
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
	    ]) {
      if (!(sourceReviewAction.commands ?? []).includes(requiredCommand)) failures.push(`content next action parallel sourceReview commands missing ${requiredCommand}`);
    }
    for (const command of sourceReviewAction.commands ?? []) {
	      if (!nextActionMarkdown.includes(command)) failures.push(`content next action markdown missing parallel sourceReview command ${command}`);
	      if (String(command).includes('npm run source:accept') && !String(command).includes('--dry-run')) failures.push('content next action parallel sourceReview decision commands must be dry-run only');
	      if (String(command).includes('npm run source:accept') && !String(command).includes('--source-visual-board public/review/source-visual-board.json')) failures.push('content next action parallel sourceReview decision commands must require source visual board evidence');
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
	      sourceReviewAction.targetId,
	    ]) {
      if (!nextActionMarkdown.includes(required)) failures.push(`content next action markdown missing parallel sourceReview detail ${required}`);
    }
  }
}
if ((sourceCriticRegeneration?.summary?.regenerateCandidates ?? 0) > 0) {
  const criticRegenerationAction = nextAction.parallelActions?.criticRegeneration;
  const expectedCriticRegeneration = sourceCriticRegeneration?.nextCandidate ?? null;
  const expectedCriticRegenerationHealth = expectedCriticRegeneration
    ? sourceCriticRegenerationHealthItems.find((item) => item.id === expectedCriticRegeneration.id) ?? null
    : null;
  if (!criticRegenerationAction) failures.push('content next action missing parallel criticRegeneration action');
  if (criticRegenerationAction && expectedCriticRegeneration) {
    if (criticRegenerationAction.kind !== 'source-critic-regeneration') failures.push(`content next action parallel criticRegeneration kind is ${criticRegenerationAction.kind}`);
    if (criticRegenerationAction.targetId !== expectedCriticRegeneration.id) failures.push(`content next action parallel criticRegeneration target must be ${expectedCriticRegeneration.id}`);
    if (criticRegenerationAction.status !== (expectedCriticRegenerationHealth?.status ?? 'unknown')) failures.push(`content next action parallel criticRegeneration status is ${criticRegenerationAction.status}`);
    if (criticRegenerationAction.promptFile !== expectedCriticRegeneration.promptFile) failures.push('content next action parallel criticRegeneration promptFile mismatch');
    const expectedCriticRegenerationCommands = expectedCriticRegenerationHealth?.nextCommands?.length
      ? expectedCriticRegenerationHealth.nextCommands
      : [
        expectedCriticRegeneration.commands?.openPrompt,
        expectedCriticRegeneration.commands?.markImagegen,
        expectedCriticRegeneration.commands?.checkImagegen,
        expectedCriticRegeneration.commands?.ingestImagegen,
        expectedCriticRegeneration.commands?.captureManual,
        expectedCriticRegeneration.commands?.recoverSavedImage,
        expectedCriticRegeneration.commands?.generateOpenAiDryRun,
        expectedCriticRegeneration.commands?.generateOpenAiApply,
      ].filter(Boolean);
    if (criticRegenerationAction.recommendedFirst !== expectedCriticRegenerationCommands[0]) failures.push('content next action parallel criticRegeneration recommendedFirst mismatch');
    for (const [key, expected] of Object.entries({
      queue: '/review/source-candidates/source-critic-regeneration-queue.html#next-regeneration-target',
      health: '/review/source-candidates/source-critic-regeneration-health.html',
      sourceCriticBoard: expectedCriticRegeneration.links?.sourceCriticBoard,
      sourceReplaceRunway: expectedCriticRegeneration.links?.sourceReplaceRunway,
      quickReview: expectedCriticRegeneration.links?.quickReview,
      source: expectedCriticRegeneration.links?.source,
      sandboxPreview: expectedCriticRegeneration.links?.sandboxPreview,
      planPreview: expectedCriticRegeneration.links?.planPreview,
      liveSourceSandbox: expectedCriticRegeneration.links?.liveSourceSandbox,
    })) {
      if (expected && criticRegenerationAction.evidenceLinks?.[key] !== expected) failures.push(`content next action parallel criticRegeneration evidenceLinks.${key} mismatch`);
    }
    for (const key of ['regenerateCandidates', 'lanes', 'promptFiles']) {
      if (criticRegenerationAction.evidenceSummary?.[key] == null) failures.push(`content next action parallel criticRegeneration evidenceSummary.${key} missing`);
    }
    for (const key of ['distinctReplacementReady', 'validNoopReplacements', 'missingReplacements', 'invalidReplacements', 'nextActionStatus']) {
      if (criticRegenerationAction.evidenceSummary?.[key] == null) failures.push(`content next action parallel criticRegeneration evidenceSummary.${key} missing`);
    }
    if (expectedCriticRegenerationHealth?.status !== 'distinct-replacement-ready' && (criticRegenerationAction.commands ?? []).some((command) => String(command).includes('source:ingest') && String(command).includes('--overwrite'))) {
      failures.push('content next action parallel criticRegeneration must not recommend overwrite ingest before distinct replacement is ready');
    }
    if (expectedCriticRegenerationHealth?.status === 'distinct-replacement-ready' && !(criticRegenerationAction.commands ?? []).some((command) => String(command).includes('--overwrite --dry-run'))) {
      failures.push('content next action parallel criticRegeneration must recommend dry-run overwrite when distinct replacement is ready');
    }
    for (const requiredCommand of expectedCriticRegenerationCommands) {
      if (!(criticRegenerationAction.commands ?? []).includes(requiredCommand)) failures.push(`content next action parallel criticRegeneration commands missing ${requiredCommand}`);
      if (!nextActionMarkdown.includes(requiredCommand)) failures.push(`content next action markdown missing parallel criticRegeneration command ${requiredCommand}`);
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
      expectedCriticRegeneration.id,
    ]) {
      if (!nextActionMarkdown.includes(required)) failures.push(`content next action markdown missing parallel criticRegeneration detail ${required}`);
    }
    if (!(criticRegenerationAction.acceptanceCriteria ?? []).some((criterion) => String(criterion).includes('returns to human source approval'))) {
      failures.push('content next action parallel criticRegeneration acceptance criteria must mention returning to human source approval');
    }
  }
}
if (runtime?.schema !== 'asset-forge/sprite-parts@1') failures.push(`runtime manifest schema is ${runtime?.schema ?? 'missing'}`);
if (visualCohesion?.schema !== 'water9/articulated-visual-cohesion@1') failures.push(`articulated visual cohesion schema is ${visualCohesion?.schema ?? 'missing'}`);
const runtimeCreatures = Array.isArray(runtime?.creatures) ? runtime.creatures : [];
const cohesionCreatures = Array.isArray(visualCohesion?.creatures) ? visualCohesion.creatures : [];
const cohesionById = new Map(cohesionCreatures.map((creature) => [creature.id, creature]));
if ((visualCohesion?.creatureCount ?? 0) !== runtimeCreatures.length) failures.push('articulated visual cohesion count does not match runtime creature count');
if ((visualCohesion?.failedCount ?? 0) !== cohesionCreatures.filter((creature) => creature.status === 'fail').length) failures.push('articulated visual cohesion failedCount mismatch');
if ((visualCohesion?.productionAcceptedCount ?? 0) !== cohesionCreatures.filter((creature) => creature.productionAccepted === true).length) {
  failures.push('articulated visual cohesion productionAcceptedCount mismatch');
}
if ((visualCohesion?.humanReviewRequiredCount ?? 0) !== cohesionCreatures.filter((creature) => creature.productionAccepted !== true).length) {
  failures.push('articulated visual cohesion humanReviewRequiredCount mismatch');
}
for (const creature of runtimeCreatures) {
  const item = cohesionById.get(creature.id);
  if (!item) {
    failures.push(`${creature.id}: missing from articulated visual cohesion report`);
    continue;
  }
  if (item.status !== 'pass') failures.push(`${creature.id}: articulated visual cohesion status is ${item.status}, expected pass`);
  if ((item.failures ?? []).length) failures.push(`${creature.id}: articulated visual cohesion failures: ${item.failures.join('; ')}`);
  if ((item.partsChecked ?? 0) < (creature.parts?.length ?? 0)) {
    failures.push(`${creature.id}: articulated visual cohesion checked ${item.partsChecked ?? 0} parts, expected at least ${creature.parts?.length ?? 0}`);
  }
}

const summary = {
  schema: 'water9/content-infrastructure-check@1',
  targetThreats: minThreats,
  sandbox: {
    entries: sandboxEntries.length,
    visualChecked: sandboxVisual?.checked ?? 0,
    allCatalog: sandboxVisual?.selection?.allCatalog === true,
    failures: Array.isArray(sandboxVisual?.failures) ? sandboxVisual.failures.length : null,
  },
  source: {
    candidates: candidates.length,
    withSource: sourceImages.length,
    queue: queueCandidates.length,
    sprint: sprintIds.length,
    inboxItems: inboxCandidates.length,
    intakeItems: intakeCandidates.length,
    doctorTarget: doctorTarget.id ?? null,
    doctorStatus: doctorTarget.status ?? null,
    workstationTarget: workstationTarget.id ?? null,
    workstationRejections: workstationRejections.length,
    checkedImages: sourceImageReport?.checkedImages ?? 0,
    cohesionReviewReady: sourceCohesionReview?.summary?.readyForCohesionReview ?? 0,
    cohesionApproved: sourceCohesionReview?.summary?.humanCohesionApproved ?? 0,
    cohesionPrototypeLocked: sourceCohesionReview?.summary?.prototypeLocked ?? 0,
    cohesionDecisionTemplateCandidates: sourceCohesionDecisions?.summary?.candidates ?? 0,
    cohesionDecisionTemplateReady: sourceCohesionDecisions?.summary?.readyForCohesionReview ?? 0,
  },
  riggingPacks: {
    packs: riggingPacks.length,
    sourceImageCoverage: sourceImages.length,
  },
  research: {
    assignments: assignments.length,
    assignedCandidates: uniqueValues(assignedIds).length,
    auditedCandidates: researchAudits?.auditedCandidates?.length ?? 0,
    traceRecords: traceRecords.length,
    queuedWithAuditGuidance: researchSourceTrace?.summary?.queuedWithAuditGuidance ?? 0,
  },
  workbench: {
    quickPreviews: quickPreviews.length,
    nextTargets: workbench?.nextTargets?.length ?? 0,
  },
  readiness: {
    sourceImages: contentReadiness?.summary?.sourceImages ?? 0,
    approvedSources: contentReadiness?.summary?.approvedSources ?? 0,
    acceptedThreats: contentReadiness?.summary?.acceptedThreats ?? 0,
    nextBottleneck: contentReadiness?.summary?.nextBottleneck ?? null,
  },
  goalReadiness: {
    strictGoalComplete: contentGoalReadiness?.strictGoalComplete ?? null,
    nextStage: contentGoalReadiness?.nextAction?.stage ?? null,
    milestones: goalMilestones.length,
  },
  acceptanceRunway: {
    candidates: acceptanceRunway?.summary?.candidates ?? 0,
    runtimeRegistered: acceptanceRunway?.summary?.runtimeRegistered ?? 0,
    unmappedPrototypeThreats: acceptanceRunway?.summary?.unmappedPrototypeThreats ?? 0,
  },
  reviewEvidence: {
    rows: reviewEvidenceMatrix?.rows?.length ?? 0,
    sourceCandidates: reviewEvidenceMatrix?.summary?.sourceCandidates ?? 0,
    runtimeMappedCandidates: reviewEvidenceMatrix?.summary?.runtimeMappedCandidates ?? 0,
    unmappedPrototypeThreats: reviewEvidenceMatrix?.summary?.unmappedPrototypeThreats ?? 0,
    mechanicallyCompleteMappedRigs: reviewEvidenceMatrix?.summary?.mechanicallyCompleteMappedRigs ?? 0,
    acceptedThreats: reviewEvidenceMatrix?.summary?.acceptedThreats ?? 0,
    nextHumanGate: reviewEvidenceMatrix?.summary?.nextHumanGate ?? null,
  },
  reviewCockpit: {
    pages: reviewCockpit?.pages?.length ?? 0,
    runtimeMappedCandidates: reviewCockpit?.summary?.runtimeMappedCandidates ?? 0,
    unmappedPrototypeThreats: reviewCockpit?.summary?.unmappedPrototypeThreats ?? 0,
    acceptedThreats: reviewCockpit?.summary?.acceptedThreats ?? 0,
  },
  runtimeRoster: {
    exceptions: runtimeRosterExceptions?.exceptions?.length ?? 0,
    mappedRuntime: reviewEvidenceMatrix?.summary?.runtimeMappedCandidates ?? 0,
    unmappedRuntimePrototypes: reviewEvidenceMatrix?.summary?.unmappedPrototypeThreats ?? 0,
  },
  nextAction: {
    kind: nextActionBody.kind ?? null,
    targetId: nextActionBody.targetId ?? null,
    stage: nextActionBody.stage ?? null,
    topTargets: nextTopTargets.length,
  },
  visualCohesion: {
    creatures: visualCohesion?.creatureCount ?? 0,
    failed: visualCohesion?.failedCount ?? null,
    warnings: visualCohesion?.warningCount ?? null,
    productionAccepted: visualCohesion?.productionAcceptedCount ?? null,
    humanReviewRequired: visualCohesion?.humanReviewRequiredCount ?? null,
    automatedCheckScope: visualCohesion?.automatedCheckScope ?? null,
  },
  content: {
    registeredThreats: runtimeCreatures.length,
    acceptedThreats: contentReadiness?.summary?.acceptedThreats ?? stageBoard?.summary?.acceptedThreats ?? 0,
    finalGateStillRequired: true,
  },
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

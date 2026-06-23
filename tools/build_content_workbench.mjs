import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
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
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-workbench.json')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-workbench.html')),
  contentReadiness: resolve(String(args.get('content-readiness') ?? 'public/review/content-readiness.json')),
  acceptanceRunway: resolve(String(args.get('acceptance-runway') ?? 'public/review/content-acceptance-runway.json')),
  acceptanceAuditIndex: resolve(String(args.get('acceptance-audit-index') ?? 'public/review/content-acceptance-audits/index.json')),
  reviewEvidenceMatrix: resolve(String(args.get('review-evidence-matrix') ?? 'public/review/content-review-evidence-matrix.json')),
  reviewCockpit: resolve(String(args.get('review-cockpit') ?? 'public/review/content-review-cockpit/manifest.json')),
  acceptanceDoctor: resolve(String(args.get('acceptance-doctor') ?? 'public/review/content-acceptance-doctor.json')),
  threatAcceptanceDecisions: resolve(String(args.get('threat-acceptance-decisions') ?? 'public/review/content-threat-acceptance-decision-template.json')),
  approvedRuntimeHandoff: resolve(String(args.get('approved-runtime-handoff') ?? 'public/review/content-approved-runtime-handoff.json')),
  planCoverage: resolve(String(args.get('plan-coverage') ?? 'public/review/content-plan-coverage.json')),
  verticalSlice: resolve(String(args.get('vertical-slice') ?? 'public/review/content-vertical-slice-runway.json')),
  humanSignoff: resolve(String(args.get('human-signoff') ?? 'public/review/content-human-signoff-queue.json')),
  humanAdjudicationBoard: resolve(String(args.get('human-adjudication-board') ?? 'public/review/content-human-adjudication-board.json')),
  contentReviewSession: resolve(String(args.get('content-review-session') ?? 'public/review/content-review-session.json')),
  contentProductionProof: resolve(String(args.get('content-production-proof') ?? 'public/review/content-production-proof.json')),
  contentPromoteApprovedThreats: resolve(String(args.get('content-promote-approved-threats') ?? 'public/review/content-promote-approved-threats.json')),
  contentGoalAudit: resolve(String(args.get('content-goal-audit') ?? 'public/review/content-goal-audit.json')),
  runtimeCohesionReview: resolve(String(args.get('runtime-cohesion-review') ?? 'public/review/content-runtime-cohesion-review.json')),
  cohortCohesionBoard: resolve(String(args.get('cohort-cohesion-board') ?? 'public/review/content-cohort-cohesion-board.json')),
  contentSandboxRoster: resolve(String(args.get('content-sandbox-roster') ?? 'public/review/content-sandbox-roster.json')),
  contentArticulationRoster: resolve(String(args.get('content-articulation-roster') ?? 'public/review/content-articulation-roster.json')),
  contentReproducibility: resolve(String(args.get('content-reproducibility') ?? 'public/review/content-reproducibility.json')),
  riggingSprint: resolve(String(args.get('rigging-sprint') ?? 'public/review/content-rigging-sprint.json')),
  stageBoard: resolve(String(args.get('stage-board') ?? 'public/review/content-stage-board.json')),
  sandboxManifest: resolve(String(args.get('sandbox') ?? 'public/review/sandbox/manifest.json')),
  sourceInbox: resolve(String(args.get('source-inbox') ?? 'public/review/source-inbox/manifest.json')),
  sourceIntakeRunway: resolve(String(args.get('source-intake-runway') ?? 'public/review/source-candidates/source-intake-runway.json')),
  sourceIntakeDoctor: resolve(String(args.get('source-intake-doctor') ?? 'public/review/source-candidates/source-intake-doctor.json')),
  sourceWorkstation: resolve(String(args.get('source-workstation') ?? 'public/review/source-candidates/source-workstation.json')),
  sourceQueue: resolve(String(args.get('source-queue') ?? 'public/review/source-candidates/source-generation-queue.json')),
  sourceSprint: resolve(String(args.get('source-sprint') ?? 'public/review/source-candidates/source-generation-sprint.json')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  sourceNextReview: resolve(String(args.get('source-next-review') ?? 'public/review/source-candidates/source-next-review.json')),
  sourceNextDecisionDraft: resolve(String(args.get('source-next-decision-draft') ?? 'public/review/source-candidates/source-next-decision-draft.json')),
  sourceReviewDossier: resolve(String(args.get('source-review-dossier') ?? 'public/review/source-candidates/source-review-dossier.json')),
  sourceApprovalRunway: resolve(String(args.get('source-approval-runway') ?? 'public/review/source-approval-runway.json')),
  sourceApprovalSession: resolve(String(args.get('source-approval-session') ?? 'public/review/source-candidates/source-approval-session.json')),
  sourceApprovalMarathon: resolve(String(args.get('source-approval-marathon') ?? 'public/review/source-candidates/source-approval-marathon.json')),
  sourceReplaceRunway: resolve(String(args.get('source-replace-runway') ?? 'public/review/source-candidates/source-replace-runway.json')),
  sourceVisualBoard: resolve(String(args.get('source-visual-board') ?? 'public/review/source-visual-board.json')),
  sourceCriticBoard: resolve(String(args.get('source-critic-board') ?? 'public/review/source-candidates/source-critic-board.json')),
  sourceCriticRegeneration: resolve(String(args.get('source-critic-regeneration') ?? 'public/review/source-candidates/source-critic-regeneration-queue.json')),
  sourceCriticRegenerationDoctor: resolve(String(args.get('source-critic-regeneration-doctor') ?? 'public/review/source-candidates/source-critic-regeneration-doctor.json')),
  sourceCriticRegenerationHealth: resolve(String(args.get('source-critic-regeneration-health') ?? 'public/review/source-candidates/source-critic-regeneration-health.json')),
  sourceReviewSequencer: resolve(String(args.get('source-review-sequencer') ?? 'public/review/source-candidates/source-review-sequencer.json')),
  sourceReviewTargetPacket: resolve(String(args.get('source-review-target-packet') ?? 'public/review/source-candidates/source-review-target-packet.json')),
  sourceRegenerationWorkspace: resolve(String(args.get('source-regeneration-workspace') ?? 'public/review/source-candidates/source-regeneration-workspace.json')),
  visualRegenerationQueue: resolve(String(args.get('visual-regeneration-queue') ?? 'public/review/content-visual-regeneration-queue.json')),
  sourceCohesionReview: resolve(String(args.get('source-cohesion-review') ?? 'public/review/source-candidates/source-cohesion-review.json')),
  sourceCohesionDecisions: resolve(String(args.get('source-cohesion-decisions') ?? 'public/review/source-candidates/source-cohesion-decision-template.json')),
  sourceCohesionDecisionRun: resolve(String(args.get('source-cohesion-decision-run') ?? 'public/review/source-candidates/source-cohesion-decision-run-report.json')),
  threatAcceptanceDecisionRun: resolve(String(args.get('threat-acceptance-decision-run') ?? 'public/review/content-threat-acceptance-decision-run-report.json')),
  sourceQuickReviews: resolve(String(args.get('source-quick-reviews') ?? 'public/review/source-candidates/quick-reviews/index.json')),
  sourceRejections: resolve(String(args.get('source-rejections') ?? 'public/review/source-candidates/rejected-attempts.json')),
  sourceImagegenMarker: resolve(String(args.get('source-imagegen-marker') ?? 'tools/scratch/source-imagegen-handoff-marker.json')),
  researchSubagentPack: resolve(String(args.get('research-subagent-pack') ?? 'public/review/source-candidates/research-subagent-pack.json')),
  researchDispatch: resolve(String(args.get('research-dispatch') ?? 'public/review/source-candidates/research-dispatch-board.json')),
  researchSourceTrace: resolve(String(args.get('research-source-trace') ?? 'public/review/source-candidates/research-source-trace.json')),
  articulatedReview: resolve(String(args.get('articulated-review') ?? 'public/review/articulated/review-manifest.json')),
};

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

function pageCard({ title, href, body, command }) {
  return `<article class="card">
    <h2><a href="${htmlEscape(href)}">${htmlEscape(title)}</a></h2>
    <p>${htmlEscape(body)}</p>
    ${command ? `<pre><code>${htmlEscape(command)}</code></pre>` : ''}
  </article>`;
}

function commandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function previewLink(entry) {
  const href = entry.previewUrl ?? entry.pairedUrl ?? entry.url;
  const warning = entry.reviewWarning ? `<p class="warning">${htmlEscape(entry.reviewWarning)}</p>` : '';
  return `<a href="${htmlEscape(href)}"><strong>${htmlEscape(entry.name ?? entry.id)}</strong><span>${htmlEscape(entry.id)} · ${htmlEscape(entry.kind)} · ${htmlEscape(entry.acceptanceState ?? 'preview')}</span></a>${warning}${commandBlock([entry.previewCommand])}`;
}

function rejectionKind(attempt) {
  if (attempt.copiedImage) return 'visual-rejection';
  if (attempt.sourceImagegenMarker || /no (new |recoverable |accessible )?(saved |source )?(image )?file|did not create an accessible source image file|no project-bound artifact|inline/i.test(String(attempt.reason ?? ''))) {
    return 'missing-artifact';
  }
  return 'unclassified';
}

function renderHtml(workbench) {
  const summary = workbench.summary;
  const pages = [
    pageCard({
      title: 'Entity Sandbox Index',
      href: 'sandbox/index.html',
      body: `Open any registered preview entity. ${summary.sandboxEntries} entries, ${summary.articulatedPreviews} articulated threats.`,
      command: 'npm run sandbox:index && npm run sandbox:index:check',
    }),
    pageCard({
      title: 'Sandbox Quickstart',
      href: 'sandbox/quickstart.html',
      body: 'Canonical direct, paired-diver, and visual-check commands for every registered sandbox entity, including gulper and diver scale previews.',
      command: 'npm run sandbox:quickstart && npm run sandbox:quickstart-check',
    }),
    pageCard({
      title: 'Entity Sandbox Lab',
      href: 'sandbox/lab.html?id=abyssal-gulper&with=diver',
      body: 'Embedded single-page preview station for quickly switching between entities, paired diver scale checks, and visual-check commands.',
      command: 'npm run sandbox:lab -- --id abyssal-gulper --with diver',
    }),
    pageCard({
      title: 'Content Stage Board',
      href: 'content-stage-board.html',
      body: `Current production queue and exact next commands. Bottleneck: ${summary.nextBottleneck}.`,
      command: 'npm run content:stage-board && npm run content:stage-board-check',
    }),
    pageCard({
      title: 'Content Readiness Dossier',
      href: 'content-readiness.html',
      body: `Strict gate dossier: ${summary.readinessAcceptedThreats}/${summary.readinessTargetThreats} accepted, ${summary.readinessSourceApprovalReady} source candidates approval-ready, ${summary.readinessSourceCriticRegenerationRequired} require critic regeneration, next blocker is ${summary.readinessNextBottleneck}.`,
      command: 'npm run content:readiness && npm run content:readiness-check',
    }),
    pageCard({
      title: 'Acceptance Runway',
      href: 'content-acceptance-runway.html',
      body: `${summary.acceptanceRunwayCandidates} candidates and ${summary.acceptanceRunwayUnmappedPrototypePackets} unmapped prototypes have packetized paths to source review, rigging, sandbox preview, and final acceptance decisions.`,
      command: 'npm run content:acceptance-runway && npm run content:acceptance-runway-check',
    }),
    pageCard({
      title: 'Batch Acceptance Audit',
      href: 'content-acceptance-audits/index.html',
      body: `${summary.acceptanceAuditIndexAuditedThreats}/${summary.acceptanceAuditIndexTargetThreats} mapped threats have strict per-threat audits; ${summary.acceptanceAuditIndexSourceMechanicalReady} source packages and ${summary.acceptanceAuditIndexThreatMechanicalReady} threat rigs are mechanically ready, with ${summary.acceptanceAuditIndexCountsTowardGate} counting toward the final gate. Next gate: ${summary.acceptanceAuditIndexNextGate}.`,
      command: 'npm run content:acceptance-audit-index && npm run content:acceptance-audit-index-check',
    }),
    pageCard({
      title: 'Review Evidence Matrix',
      href: 'content-review-evidence-matrix.html',
      body: `${summary.reviewEvidenceRuntimeMappedCandidates}/${summary.reviewEvidenceSourceCandidates} source candidates have mapped runtime rigs; ${summary.reviewEvidenceUnmappedPrototypeThreats} prototype rigs are explicitly marked unmapped, and ${summary.reviewEvidenceAcceptedThreats}/${summary.targetThreats} threats are human-accepted.`,
      command: 'npm run content:review-evidence && npm run content:review-evidence-check',
    }),
    pageCard({
      title: 'Candidate Review Cockpit',
      href: 'content-review-cockpit/index.html',
      body: `${summary.reviewCockpitPages} candidate pages compose source art, key preview, source preview, plan preview, parity overlays, and sandbox state screenshots for one-threat review.`,
      command: 'npm run content:review-cockpit && npm run content:review-cockpit-check',
    }),
    pageCard({
      title: 'Acceptance Doctor',
      href: 'content-acceptance-doctor.html',
      body: `${summary.acceptanceDoctorSourceBlocked} source-blocked, ${summary.acceptanceDoctorRuntimeBlocked} runtime-blocked, and ${summary.acceptanceDoctorAcceptanceBlocked} acceptance-blocked rows. Next blocker: ${summary.acceptanceDoctorNextBottleneck}.`,
      command: 'npm run content:acceptance-doctor && npm run content:acceptance-doctor-check',
    }),
    pageCard({
      title: 'Threat Acceptance Decisions',
      href: 'content-threat-acceptance-decision-template.html',
      body: `${summary.threatAcceptanceDecisionRigs} registered articulated rigs have structured final threat-decision fields; latest run has ${summary.threatAcceptanceDecisionRunPending} pending, ${summary.threatAcceptanceDecisionRunAccepted} accepted, and ${summary.threatAcceptanceDecisionRunPrototype} prototype decisions.`,
      command: 'npm run content:threat-decisions && npm run content:threat-decisions-check\nnpm run content:threat-decisions-workspace-smoke\nnpm run content:threat-decisions-apply',
    }),
    pageCard({
      title: 'Approved Source Runtime Handoff',
      href: 'content-approved-runtime-handoff.html',
      body: `${summary.approvedRuntimeHandoffRiggingEligibleOnly} approved sources are rigging-eligible only; ${summary.approvedRuntimeHandoffBlockedUntilSourceApproval} missing-runtime candidates are still source-blocked.`,
      command: 'npm run content:approved-runtime-handoff && npm run content:approved-runtime-handoff-check',
    }),
    pageCard({
      title: 'Plan Coverage',
      href: 'content-plan-coverage.html',
      body: `${summary.planCoveragePlanArtifacts}/${summary.planCoverageCandidates} starter plans and ${summary.planCoveragePlanPreviews}/${summary.planCoverageCandidates} plan previews are staged across all source candidates.`,
      command: 'npm run content:plan-coverage && npm run content:plan-coverage-check',
    }),
    pageCard({
      title: 'Vertical Slice Runway',
      href: 'content-vertical-slice-runway.html',
      body: `${summary.verticalSliceMechanicallyReviewable}/${summary.verticalSliceThreats} threats have a complete contract-source-key-plan-rig-quality-runtime-visual-audit route; ${summary.verticalSliceRigQualityEvidence} include contact, phase, source-parity, and cohesion evidence. Next blocker is ${summary.verticalSliceNextBlocker}.`,
      command: 'npm run content:vertical-slice && npm run content:vertical-slice-check',
    }),
    pageCard({
      title: 'Human Sign-Off Queue',
      href: 'content-human-signoff-queue.html',
      body: `${summary.humanSignoffReadyForSourceSignoff} candidates are ready for human source sign-off, ${summary.humanSignoffSourceRegenerationRequired} require critic regeneration first, and ${summary.humanSignoffReadyForThreatSignoff} are ready for final threat sign-off; ${summary.humanSignoffAcceptedThreats}/${summary.humanSignoffTargetThreats} count toward the gate. Next gate: ${summary.humanSignoffNextGate}.`,
      command: 'npm run content:human-signoff && npm run content:human-signoff-check',
    }),
    pageCard({
      title: 'Human Adjudication Board',
      href: 'content-human-adjudication-board.html',
      body: `${summary.humanAdjudicationSourceReady}/${summary.humanAdjudicationItems} source-ready after ${summary.humanAdjudicationSourceCriticRegenerationRequired} critic-regeneration blockers, and ${summary.humanAdjudicationThreatReady}/${summary.humanAdjudicationItems} threat-ready rows expose all media, paired sandbox links, preview-boundary claims, and dry-run-only decision commands for human review.`,
      command: 'npm run content:human-adjudication-board && npm run content:human-adjudication-board-check',
    }),
    pageCard({
      title: 'Content Review Session',
      href: 'content-review-session.html',
      body: `${summary.contentReviewSessionItems} target threats are available in one session workspace with source and threat decision-file exports plus source/runtime preview-boundary claims for strict human review.`,
      command: 'npm run content:review-session && npm run content:review-session-check',
    }),
    pageCard({
      title: 'Production Proof',
      href: 'content-production-proof.html',
      body: `${summary.contentProductionProofAcceptedThreats}/${summary.targetThreats} threats are production-accepted; ${summary.contentProductionProofPrototypeOnly} remain prototype-only and ${summary.contentProductionProofHumanReviewRequired} require human review before they can count.`,
      command: 'npm run content:production-proof && npm run content:production-proof-check',
    }),
    pageCard({
      title: 'Promote Approved Threats',
      href: 'content-promote-approved-threats.html',
      body: `${summary.contentPromoteApprovedThreatsReady}/${summary.contentPromoteApprovedThreatsItems} target threats are ready for final threat-decision authoring; ${summary.contentPromoteApprovedThreatsExcluded} non-target prototype rigs are excluded from this runway.`,
      command: 'npm run content:promote-approved-threats && npm run content:promote-approved-threats-check',
    }),
    pageCard({
      title: 'Content Goal Audit',
      href: 'content-goal-audit.html',
      body: `Objective hard stop: ${summary.contentGoalAuditPassedRequirements}/${summary.contentGoalAuditRequirements} requirements passed, ${summary.contentGoalAuditAcceptedThreats}/${summary.contentGoalAuditTargetThreats} accepted threats, complete: ${summary.contentGoalAuditComplete}.`,
      command: 'npm run content:goal-readiness && npm run content:goal-readiness-check\nnpm run content:goal-audit:serve-smoke',
    }),
    pageCard({
      title: 'Runtime Cohesion Review',
      href: 'content-runtime-cohesion-review.html',
      body: summary.runtimeCohesionReviewTarget
        ? `Focused in-game cohesion packet for ${summary.runtimeCohesionReviewSpecies} (${summary.runtimeCohesionReviewTarget}); ${summary.runtimeCohesionReviewMedia}/${summary.runtimeCohesionReviewRequiredMedia} media present, next gate ${summary.runtimeCohesionReviewNextGate}.`
        : 'Focused in-game cohesion packet for the next quality-gate target.',
      command: 'npm run content:runtime-cohesion-review && npm run content:runtime-cohesion-review-check\nnpm run content:runtime-cohesion-review:serve-smoke',
    }),
    pageCard({
      title: 'Cohort Cohesion Board',
      href: 'content-cohort-cohesion-board.html',
      body: `${summary.cohortCohesionBoardItems}/${summary.cohortCohesionBoardTargetThreats} target threats are visible with source and runtime evidence together; ${summary.cohortCohesionBoardAcceptedThreats} accepted, ${summary.cohortCohesionBoardOpenVisualBlockers} open visual blockers, ${summary.cohortCohesionBoardRiskHigh} high-risk and ${summary.cohortCohesionBoardRiskMedium} medium-risk source rows.`,
      command: 'npm run content:cohort-cohesion-board && npm run content:cohort-cohesion-board-check\nnpm run content:cohort-cohesion-board:serve-smoke',
    }),
    pageCard({
      title: 'Content Sandbox Roster',
      href: 'content-sandbox-roster.html',
      body: `${summary.contentSandboxRosterReady}/${summary.contentSandboxRosterItems} target threats have source, runtime, paired-diver preview, and visual-check commands staged for quick review.`,
      command: 'npm run content:sandbox-roster && npm run content:sandbox-roster-check',
    }),
    pageCard({
      title: 'Content Articulation Roster',
      href: 'content-articulation-roster.html',
      body: `${summary.contentArticulationRosterReady}/${summary.contentArticulationRosterItems} target threats have source-to-articulation evidence staged, including magenta-key source, plan, extract dry-run, parity/cohesion, and paired-diver sandbox routes.`,
      command: 'npm run content:articulation-roster && npm run content:articulation-roster-check',
    }),
    pageCard({
      title: 'Content Reproducibility',
      href: 'content-reproducibility.html',
      body: `${summary.contentReproducibilityReady}/${summary.contentReproducibilityTargets} target threats have a repeatable magenta-source to articulated runtime preview path. Reproducible still does not mean visually approved.`,
      command: 'npm run content:reproducibility && npm run content:reproducibility-check',
    }),
    pageCard({
      title: 'Rigging Sprint',
      href: 'content-rigging-sprint.html',
      body: `${summary.riggingSprintSize}/${summary.riggingSprintMissingRuntimeTotal} missing-runtime candidates are queued; ${summary.riggingSprintPlanArtifactsStaged}/${summary.riggingSprintSize} starter plans and ${summary.riggingSprintPlanPreviewsStaged}/${summary.riggingSprintSize} plan previews are staged.`,
      command: 'npm run content:rigging-sprint && npm run content:rigging-sprint-check\nnpm run content:rigging-sprint:preview',
    }),
    pageCard({
      title: 'Source Inbox Review',
      href: 'source-inbox/index.html',
      body: `${summary.sourceInboxReady} inbox images ready, ${summary.sourceInboxMissing} still missing.`,
      command: 'npm run source:inbox-review && npm run source:inbox-review-check',
    }),
    pageCard({
      title: 'Source Intake Runway',
      href: 'source-candidates/source-intake-runway.html',
      body: `${summary.sourceIntakeReady}/${summary.sourceIntakeSprint} sprint images ready; ${summary.sourceIntakeMissing} still need recoverable source files.`,
      command: 'npm run source:intake-runway && npm run source:intake-runway-check',
    }),
    pageCard({
      title: 'Source Intake Doctor',
      href: 'source-candidates/source-intake-doctor.html',
      body: `Focused diagnosis for ${summary.sourceIntakeDoctorTarget}: ${summary.sourceIntakeDoctorStatus}.`,
      command: 'npm run source:intake-doctor && npm run source:intake-doctor-check',
    }),
    pageCard({
      title: 'Source Workstation',
      href: 'source-candidates/source-workstation.html',
      body: `Single-target generation workspace for ${summary.sourceWorkstationTarget}, with ${summary.sourceWorkstationRejections} rejection records and full prompt context.`,
      command: 'npm run source:workstation && npm run source:workstation-check\nnpm run source:workstation:preview',
    }),
    pageCard({
      title: 'Research Subagent Pack',
      href: 'source-candidates/research-subagent-pack.html',
      body: `${summary.researchAssignments} parallel research lanes covering ${summary.researchAssignedCandidates} candidate threats.`,
      command: 'npm run research:subagent-pack && npm run research:subagent-pack-check',
    }),
    pageCard({
      title: 'Research Dispatch Board',
      href: 'source-candidates/research-dispatch-board.html',
      body: `${summary.researchDispatchPackets}/${summary.researchDispatchCandidates} candidate packets are ready for focused read-only subagent review; ${summary.researchDispatchAuditedCandidates} already have audit evidence.`,
      command: 'npm run research:dispatch && npm run research:dispatch-check',
    }),
    pageCard({
      title: 'Research Source Trace',
      href: 'source-candidates/research-source-trace.html',
      body: `${summary.researchTraceQueuedWithAuditGuidance}/${summary.sourceQueue} queued source prompts carry subagent audit guidance.`,
      command: 'npm run research:source-trace && npm run research:source-trace-check',
    }),
    pageCard({
      title: 'Source Acquisition Board',
      href: 'source-candidates/source-generation-queue.html',
      body: `${summary.sourceQueue} missing-source candidates with copyable prompts, inbox targets, capture commands, and validation commands.`,
      command: 'npm run source:generation-queue && npm run source:generation-queue:check',
    }),
    pageCard({
      title: 'Source Generation Sprint',
      href: 'source-candidates/source-generation-sprint.html',
      body: 'Focused first batch for the missing source-image bottleneck, including prompts, inbox targets, and ingest commands.',
      command: 'npm run source:sprint:preview',
    }),
    pageCard({
      title: 'Source Imagegen Health',
      href: 'source-candidates/source-generation-sprint.html',
      body: summary.sourceImagegenRecommendedAction,
      command: 'npm run source:imagegen-health',
    }),
    pageCard({
      title: 'Next Source Review',
      href: 'source-candidates/source-next-review.html',
      body: summary.sourceNextReviewTarget
        ? `Review ${summary.sourceNextReviewTargetSpecies} next: source, magenta key, sandbox screenshot, plan preview, contract checks, and dry-run approve/reject commands in one focused packet.`
        : 'Focused source-review packet for the next human decision.',
      command: 'npm run source:next-review && npm run source:next-review-check\nnpm run source:next-review:serve-smoke',
    }),
    pageCard({
      title: 'Next Source Decision Draft',
      href: 'source-candidates/source-next-decision-draft.html',
      body: summary.sourceNextDecisionDraftTarget
        ? `Focused reviewed-only decision draft for ${summary.sourceNextDecisionDraftTargetSpecies} (${summary.sourceNextDecisionDraftTarget}); status ${summary.sourceNextDecisionDraftStatus}.`
        : 'Focused reviewed-only source decision draft for the next human approval target.',
      command: 'npm run source:next-decision-draft && npm run source:next-decision-draft-check\nnpm run source:next-decision-draft:serve-smoke',
    }),
    pageCard({
      title: 'Source Review Dossier',
      href: 'source-candidates/source-review-dossier.html',
      body: `${summary.sourceReviewDossierPending} source images await human approval; ${summary.sourceReviewDossierPackets} have packetized evidence, contract checks, preview commands, and accept/reject commands.`,
      command: 'npm run source:review-dossier && npm run source:review-dossier-check',
    }),
    pageCard({
      title: 'Source Approval Runway',
      href: 'source-approval-runway.html',
      body: `${summary.sourceApprovalRunwayReady}/${summary.sourceApprovalRunwayCandidates} candidates are approval-ready after ${summary.sourceApprovalRunwayCriticBlocked} critic-regeneration blockers; ${summary.sourceApprovalRunwayMechanicallyReady} are mechanically ready with source, key, sandbox, and plan-preview evidence.`,
      command: 'npm run source:approval-runway && npm run source:approval-runway-check && npm run source:approval-runway:preview',
    }),
    pageCard({
      title: 'Source Approval Session',
      href: 'source-candidates/source-approval-session.html',
      body: `${summary.sourceApprovalSessionReady}/${summary.sourceApprovalSessionCandidates} source candidates are ready for human-authored batch decisions; next target ${summary.sourceApprovalSessionNextTargetSpecies} (${summary.sourceApprovalSessionNextTarget}) routes through the strict reviewed-decision apply command.`,
      command: 'npm run source:approval-session && npm run source:approval-session-check && npm run source:approval-session:serve-smoke',
    }),
    pageCard({
      title: 'Source Approval Marathon',
      href: 'source-candidates/source-approval-marathon.html',
      body: `${summary.sourceApprovalMarathonReady}/${summary.sourceApprovalMarathonCandidates} approval-ready sources are staged in one pass with ${summary.sourceApprovalMarathonDecisionStarters} reviewed-only decision starters; risk triage shows ${summary.sourceApprovalMarathonRiskHigh} high-risk and ${summary.sourceApprovalMarathonRiskMedium} medium-risk rows.`,
      command: 'npm run source:approval-marathon && npm run source:approval-marathon-check && npm run source:approval-marathon:serve-smoke\nnpm run source:approval-marathon-workspace-smoke\nnpm run source:approval-marathon-full-batch-smoke\nnpm run content:synthetic-decision-guards-check',
    }),
    pageCard({
      title: 'Source Replace Runway',
      href: 'source-candidates/source-replace-runway.html',
      body: `${summary.sourceReplaceRunwayReplaceable}/${summary.sourceReplaceRunwayCandidates} source-present candidates can be regenerated through an explicit --overwrite replacement loop before returning to human approval.`,
      command: 'npm run source:replace-runway && npm run source:replace-runway-check && npm run source:replace-runway:preview',
    }),
    pageCard({
      title: 'Source Visual Board',
      href: 'source-visual-board.html',
      body: `${summary.sourceVisualBoardCandidates} candidates are shown with source, magenta key, sandbox preview, and articulation plan preview. This is the dense cohesion review board before source approval.`,
      command: 'npm run source:visual-board && npm run source:visual-board-check && npm run source:visual-board:serve-smoke',
    }),
    pageCard({
      title: 'Source Critic Board',
      href: 'source-candidates/source-critic-board.html',
      body: `${summary.sourceCriticBoardCandidates} candidates have lane-specific advisory risks, with ${summary.sourceCriticBoardRegenerate} regenerate calls, ${summary.sourceCriticBoardReadyWithCaution} caution calls, and ${summary.sourceCriticBoardReadyRecommendation} ready calls before any source can be approved.`,
      command: 'npm run source:critic-board && npm run source:critic-board-check && npm run source:critic-board:serve-smoke',
    }),
    pageCard({
      title: 'Critic Regeneration Queue',
      href: 'source-candidates/source-critic-regeneration-queue.html#next-regeneration-target',
      body: `${summary.sourceCriticRegenerationCandidates} critic-rejected source candidates have focused replacement prompts and OpenAI/imagegen commands before returning to source approval. Next: ${summary.sourceCriticRegenerationNextTargetSpecies} (${summary.sourceCriticRegenerationNextTarget}).`,
      command: 'npm run source:critic-regeneration && npm run source:critic-regeneration-check && npm run source:critic-regeneration:serve-smoke && npm run source:critic-regeneration-openai-smoke',
    }),
    pageCard({
      title: 'Critic Regeneration Doctor',
      href: 'source-candidates/source-critic-regeneration-doctor.html',
      body: `Next replacement target ${summary.sourceCriticRegenerationDoctorTargetSpecies} (${summary.sourceCriticRegenerationDoctorTarget}) is ${summary.sourceCriticRegenerationDoctorStatus}; replacement ingest ready: ${summary.sourceCriticRegenerationDoctorReady}; matches current source: ${summary.sourceCriticRegenerationDoctorMatchesCurrentSource}.`,
      command: 'npm run source:critic-regeneration-doctor && npm run source:critic-regeneration-doctor-check && npm run source:critic-regeneration-doctor:serve-smoke',
    }),
    pageCard({
      title: 'Critic Regeneration Health',
      href: 'source-candidates/source-critic-regeneration-health.html',
      body: `${summary.sourceCriticRegenerationHealthDistinctReady}/${summary.sourceCriticRegenerationHealthCandidates} critic-blocked candidates have distinct replacements ready; ${summary.sourceCriticRegenerationHealthNoop} are valid no-op inbox files and ${summary.sourceCriticRegenerationHealthMissing} are missing replacements. Next action target: ${summary.sourceCriticRegenerationHealthNextTarget}.`,
      command: 'npm run source:critic-regeneration-health && npm run source:critic-regeneration-health-check && npm run source:critic-regeneration-health:serve-smoke',
    }),
    pageCard({
      title: 'Source Review Sequencer',
      href: 'source-candidates/source-review-sequencer.html',
      body: `${summary.sourceReviewSequencerTotal} source candidates are routed into deterministic lanes; next target ${summary.sourceReviewSequencerNextTarget} is in ${summary.sourceReviewSequencerNextLane}. This page keeps no-op regeneration, approval-ready review, and dry-run-only source decisions separate.`,
      command: 'npm run source:review-sequencer && npm run source:review-sequencer-check && npm run source:review-sequencer:serve-smoke',
    }),
    pageCard({
      title: 'Source Review Target Packet',
      href: 'source-candidates/source-review-target-packet.html',
      body: `One focused packet for ${summary.sourceReviewTargetPacketSpecies} (${summary.sourceReviewTargetPacketTarget}) in ${summary.sourceReviewTargetPacketLane}; status: ${summary.sourceReviewTargetPacketStatus}.`,
      command: 'npm run source:review-target-packet && npm run source:review-target-packet-check && npm run source:review-target-packet:serve-smoke',
    }),
    pageCard({
      title: 'Source Regeneration Workspace',
      href: 'source-candidates/source-regeneration-workspace.html',
      body: `Focused replacement workspace for ${summary.sourceRegenerationWorkspaceSpecies} (${summary.sourceRegenerationWorkspaceTarget}) in ${summary.sourceRegenerationWorkspaceLane}; no-op replacement: ${summary.sourceRegenerationWorkspaceNoop}, distinct ready: ${summary.sourceRegenerationWorkspaceDistinctReady}.`,
      command: 'npm run source:regeneration-workspace && npm run source:regeneration-workspace-check && npm run source:regeneration-workspace:serve-smoke',
    }),
    pageCard({
      title: 'Visual Regeneration Queue',
      href: 'content-visual-regeneration-queue.html',
      body: `${summary.visualRegenerationItems} blocked runtime prototypes have source-first regeneration prompts; next target ${summary.visualRegenerationNextTarget} remains preview-only and contributes ${summary.visualRegenerationStrictGateCredit} strict-gate credit.`,
      command: 'npm run content:visual-regeneration && npm run content:visual-regeneration-check && npm run content:visual-regeneration:serve-smoke',
    }),
    pageCard({
      title: 'Source Cohesion Review',
      href: 'source-candidates/source-cohesion-review.html',
      body: `${summary.sourceCohesionReviewReady}/${summary.sourceCohesionReviewCandidates} candidates are ready for human cohesion review; ${summary.sourceCohesionReviewPrototypeLocked} remain prototype-locked until approved.`,
      command: 'npm run source:cohesion-review && npm run source:cohesion-review-check',
    }),
    pageCard({
      title: 'Source Cohesion Batch Decisions',
      href: 'source-candidates/source-cohesion-decision-template.html',
      body: `${summary.sourceCohesionDecisionTemplateCandidates} source candidates have structured source approval batch-decision fields; latest dry-run report has ${summary.sourceCohesionDecisionRunPending} pending, ${summary.sourceCohesionDecisionRunApproved} approved, and ${summary.sourceCohesionDecisionRunRejected} rejected decisions.`,
      command: 'npm run source:approval-decisions && npm run source:approval-decisions-check\nnpm run source:approval-decisions-workspace-smoke\nnpm run source:approval-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
    }),
    pageCard({
      title: 'Source Quick Reviews',
      href: 'source-candidates/quick-reviews/index.html',
      body: `${summary.sourceQuickReviewsReady}/${summary.sourceQuickReviews} ready source images have focused quick-review pages with source art, key preview, sandbox screenshot, checklist, and accept/reject commands.`,
      command: 'npm run source:quick-review-all && npm run source:quick-review-all-check',
    }),
    pageCard({
      title: 'Source Candidate Gallery',
      href: 'source-candidates/index.html',
      body: 'Review whole-source images, chroma previews, prompt risks, and approval state.',
      command: 'npm run source:gallery',
    }),
    pageCard({
      title: 'Articulated Review Gallery',
      href: 'articulated/index.html',
      body: 'Inspect contact sheets, phase strips, source parity, and sandbox links for rigs.',
      command: 'npm run review:articulated:quick && npm run review:check',
    }),
    pageCard({
      title: 'Rigging Packs',
      href: 'rigging-packs/index.md',
      body: 'Use approved source candidates to prepare extraction and articulation work.',
      command: 'npm run content:rigging-pack && npm run content:rigging-pack-check',
    }),
  ].join('\n');

  const previewRows = workbench.quickPreviews.map((entry) => `<li>${previewLink(entry)}</li>`).join('\n');
  const queueRows = workbench.nextTargets.map((target) => `<article class="target">
    <header><strong>${htmlEscape(target.species)}</strong><span>${htmlEscape(target.stage)}</span></header>
    <code>${htmlEscape(target.id)}</code>
    ${target.reviewWarning ? `<p class="warning">${htmlEscape(target.reviewWarning)}</p>` : ''}
    <p>${[
      target.sourcePreviewUrl ? `<a href="${htmlEscape(target.sourcePreviewUrl)}">source preview</a>` : '',
      target.rigPreviewUrl ? `<a href="${htmlEscape(target.rigPreviewUrl)}">rig sandbox</a>` : '',
    ].filter(Boolean).join(' ')}</p>
    ${commandBlock([...target.previewCommands, ...target.nextCommands.slice(0, 8)])}
  </article>`).join('\n');
  const stagePills = Object.entries(summary.stageCounts)
    .map(([stage, count]) => `<span>${htmlEscape(stage)} <strong>${count}</strong></span>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Content Workbench</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0c1c21; --line:#24424a; --text:#e2f5f6; --muted:#94adb2; --accent:#74ddf5; --warn:#e7bd6d; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1340px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:0 0 8px; font-size:17px; }
    p { margin:0 0 12px; color:var(--muted); }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    code { color:var(--muted); }
    pre { margin:10px 0 0; padding:10px; border:1px solid var(--line); background:#050b0d; overflow:auto; white-space:pre-wrap; }
    .summary { display:flex; flex-wrap:wrap; gap:9px; margin:18px 0 24px; }
    .summary span { border:1px solid var(--line); background:#09171b; border-radius:5px; padding:7px 9px; color:var(--muted); }
    .summary strong { color:var(--text); margin-left:4px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(310px,1fr)); gap:14px; margin-bottom:24px; }
    .card, .target { border:1px solid var(--line); background:var(--panel); border-radius:6px; padding:14px; }
    .target header { display:flex; justify-content:space-between; gap:10px; }
    .target header span { color:var(--warn); }
    .previews { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:8px; padding:0; margin:0 0 24px; list-style:none; }
    .previews a { display:block; border:1px solid var(--line); background:#09171b; border-radius:5px; padding:10px; }
    .previews span { display:block; color:var(--muted); margin-top:2px; }
    .warning { color:#f0c477; }
    .section-title { margin:28px 0 10px; }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Content Workbench</h1>
    <p>One generated entry point for previewing entities, moving source art through the magenta-background pipeline, and checking the strict 20-threat acceptance gate.</p>
    ${commandBlock(workbench.launchCommands)}
    <div class="summary">
      <span>accepted threats <strong>${summary.acceptedThreats}/${summary.targetThreats}</strong></span>
      <span>registered prototypes <strong>${summary.prototypeThreats}</strong></span>
      <span>source candidates <strong>${summary.sourceCandidates}</strong></span>
      <span>source images <strong>${summary.sourceImages}</strong></span>
      <span>active imagegen blockers <strong>${summary.sourceImagegenActiveBlockerMissingArtifacts}</strong></span>
      <span>historical imagegen misses <strong>${summary.sourceImagegenHistoricalMissingArtifacts}</strong></span>
      <span>sandbox entries <strong>${summary.sandboxEntries}</strong></span>
      <span>rigging plans staged <strong>${summary.riggingSprintPlanArtifactsStaged}/${summary.riggingSprintSize}</strong></span>
      <span>next bottleneck <strong>${htmlEscape(summary.nextBottleneck)}</strong></span>
    </div>
    <div class="summary">${stagePills}</div>
    <section class="grid">${pages}</section>
    <h2 class="section-title">Quick Entity Previews</h2>
    <ul class="previews">${previewRows}</ul>
    <h2 class="section-title">Next Production Targets</h2>
    <section class="grid">${queueRows}</section>
    <h2 class="section-title">Gate Commands</h2>
    ${commandBlock(workbench.gateCommands)}
  </main>
</body>
</html>
`;
}

const contentReadiness = await readJson(paths.contentReadiness, { summary: {}, sourceCandidates: [], articulatedThreats: [] });
const acceptanceRunway = await readJson(paths.acceptanceRunway, { summary: {}, items: [] });
const acceptanceAuditIndex = await readJson(paths.acceptanceAuditIndex, { summary: {}, items: [] });
const reviewEvidenceMatrix = await readJson(paths.reviewEvidenceMatrix, { summary: {}, rows: [] });
const reviewCockpit = await readJson(paths.reviewCockpit, { summary: {}, pages: [] });
const acceptanceDoctor = await readJson(paths.acceptanceDoctor, { summary: {}, items: [] });
const threatAcceptanceDecisions = await readJson(paths.threatAcceptanceDecisions, { summary: {}, decisions: [] });
const approvedRuntimeHandoff = await readJson(paths.approvedRuntimeHandoff, { summary: {}, items: [] });
const planCoverage = await readJson(paths.planCoverage, { summary: {}, items: [] });
const verticalSlice = await readJson(paths.verticalSlice, { summary: {}, items: [] });
const humanSignoff = await readJson(paths.humanSignoff, { summary: {}, items: [] });
const humanAdjudicationBoard = await readJson(paths.humanAdjudicationBoard, { summary: {}, items: [] });
const contentReviewSession = await readJson(paths.contentReviewSession, { summary: {}, items: [] });
const contentProductionProof = await readJson(paths.contentProductionProof, { summary: {}, items: [] });
const contentPromoteApprovedThreats = await readJson(paths.contentPromoteApprovedThreats, { summary: {}, items: [] });
const contentGoalAudit = await readJson(paths.contentGoalAudit, { summary: {}, requirements: [] });
const runtimeCohesionReview = await readJson(paths.runtimeCohesionReview, { target: null, media: [], requiredChecks: [] });
const cohortCohesionBoard = await readJson(paths.cohortCohesionBoard, { summary: {}, items: [] });
const contentSandboxRoster = await readJson(paths.contentSandboxRoster, { summary: {}, items: [] });
const contentArticulationRoster = await readJson(paths.contentArticulationRoster, { summary: {}, items: [] });
const contentReproducibility = await readJson(paths.contentReproducibility, { summary: {}, items: [] });
const riggingSprint = await readJson(paths.riggingSprint, { summary: {}, items: [] });
const stageBoard = await readJson(paths.stageBoard, { summary: {}, targets: [] });
const sandbox = await readJson(paths.sandboxManifest, { entries: [], counts: {} });
const sourceInbox = await readJson(paths.sourceInbox, { candidates: [], ready: 0, missing: 0, blocked: 0 });
const sourceIntakeRunway = await readJson(paths.sourceIntakeRunway, { summary: {}, candidates: [] });
const sourceIntakeDoctor = await readJson(paths.sourceIntakeDoctor, { target: {}, queue: [] });
const sourceWorkstation = await readJson(paths.sourceWorkstation, { target: {}, rejections: [] });
const sourceQueue = await readJson(paths.sourceQueue, { candidates: [] });
const sourceSprint = await readJson(paths.sourceSprint, { ids: [], commands: {} });
const sourceCandidates = await readJson(paths.sourceCandidates, { candidates: [] });
const sourceNextReview = await readJson(paths.sourceNextReview, { summary: {}, target: null });
const sourceNextDecisionDraft = await readJson(paths.sourceNextDecisionDraft, { target: null, decisionFile: { decisions: [] } });
const sourceReviewDossier = await readJson(paths.sourceReviewDossier, { summary: {}, items: [] });
const sourceApprovalRunway = await readJson(paths.sourceApprovalRunway, { summary: {}, items: [] });
const sourceApprovalSession = await readJson(paths.sourceApprovalSession, { summary: {}, decisionOutput: {}, nextTarget: null });
const sourceApprovalMarathon = await readJson(paths.sourceApprovalMarathon, { summary: {}, items: [] });
const sourceReplaceRunway = await readJson(paths.sourceReplaceRunway, { summary: {}, items: [] });
const sourceVisualBoard = await readJson(paths.sourceVisualBoard, { summary: {}, items: [] });
const sourceCriticBoard = await readJson(paths.sourceCriticBoard, { summary: {}, items: [] });
const sourceCriticRegeneration = await readJson(paths.sourceCriticRegeneration, { summary: {}, candidates: [] });
const sourceCriticRegenerationDoctor = await readJson(paths.sourceCriticRegenerationDoctor, { summary: {}, target: {} });
const sourceCriticRegenerationHealth = await readJson(paths.sourceCriticRegenerationHealth, { summary: {}, items: [] });
const sourceReviewSequencer = await readJson(paths.sourceReviewSequencer, { summary: {}, items: [] });
const sourceReviewTargetPacket = await readJson(paths.sourceReviewTargetPacket, { summary: {}, target: null });
const sourceRegenerationWorkspace = await readJson(paths.sourceRegenerationWorkspace, { summary: {}, target: null });
const visualRegenerationQueue = await readJson(paths.visualRegenerationQueue, { summary: {}, items: [] });
const sourceCohesionReview = await readJson(paths.sourceCohesionReview, { summary: {}, items: [] });
const sourceCohesionDecisions = await readJson(paths.sourceCohesionDecisions, { summary: {}, decisions: [] });
const sourceCohesionDecisionRun = await readJson(paths.sourceCohesionDecisionRun, { schema: null, decisions: 0, approved: 0, rejected: 0, pending: 0, failures: [] });
const threatAcceptanceDecisionRun = await readJson(paths.threatAcceptanceDecisionRun, { schema: null, decisions: 0, accepted: 0, prototype: 0, pending: 0, failures: [] });
const sourceQuickReviews = await readJson(paths.sourceQuickReviews, { schema: null, summary: {}, reviews: [] });
const sourceRejections = await readJson(paths.sourceRejections, { attempts: [] });
const sourceImagegenMarker = await readJson(paths.sourceImagegenMarker, { schema: null });
const researchSubagentPack = await readJson(paths.researchSubagentPack, { assignments: [] });
const researchDispatch = await readJson(paths.researchDispatch, { summary: {}, dispatches: [] });
const researchSourceTrace = await readJson(paths.researchSourceTrace, { schema: null, summary: {}, records: [] });
const articulatedReview = await readJson(paths.articulatedReview, { creatures: [] });

const sandboxEntries = Array.isArray(sandbox.entries) ? sandbox.entries : [];
const candidateList = Array.isArray(sourceCandidates.candidates) ? sourceCandidates.candidates : [];
const reviewCreatures = Array.isArray(articulatedReview.creatures) ? articulatedReview.creatures : [];
const stageTargets = Array.isArray(stageBoard.targets) ? stageBoard.targets : [];
const stageTargetByRigId = new Map(stageTargets
  .filter((target) => target?.rigId)
  .map((target) => [target.rigId, target]));
const quickPreviewIds = ['diver', 'abyssal-gulper', 'source-brine-crown'];
const quickPreviews = [];
function previewCommandFor(id) {
  const companionFlag = id === 'diver' ? '' : ' --with diver';
  return `npm run sandbox:preview -- --id ${id}${companionFlag} --serve --open --visual`;
}
function reviewStateForPreview(entry) {
  if (entry.id === 'diver') {
    return {
      acceptanceState: 'player-reference',
      qualityStatus: 'reference',
      reviewWarning: null,
      countsTowardGate: false,
    };
  }
  if (entry.kind === 'articulated') {
    const review = reviewCreatures.find((creature) => creature.id === entry.id);
    const stageTarget = stageTargetByRigId.get(entry.id);
    const countsTowardGate = Boolean(stageTarget?.accepted);
    const qualityStatus = stageTarget?.rigStatus ?? review?.quality?.status ?? entry.qualityStatus ?? 'unreviewed';
    return {
      acceptanceState: countsTowardGate ? 'accepted-threat' : 'prototype-preview-only',
      qualityStatus,
      reviewWarning: countsTowardGate
        ? null
        : 'Prototype preview only: do not treat this screenshot as cohesive accepted content until human source, motion, and sandbox review passes.',
      countsTowardGate,
    };
  }
  if (entry.kind === 'source') {
    const candidateId = String(entry.id).replace(/^source-/, '');
    const candidate = candidateList.find((item) => item.id === candidateId);
    const reviewStatus = candidate?.review?.status ?? candidate?.status ?? 'unreviewed';
    const approved = reviewStatus === 'approved' || candidate?.status === 'approved' || candidate?.status === 'rigged';
    return {
      acceptanceState: approved ? 'approved-source' : 'source-review-needed',
      qualityStatus: reviewStatus,
      reviewWarning: approved
        ? null
        : 'Source preview only: inspect the whole image, chroma key, and contract checklist before rigging.',
      countsTowardGate: false,
    };
  }
  return {
    acceptanceState: 'sandbox-preview',
    qualityStatus: entry.kind ?? 'unknown',
    reviewWarning: 'Sandbox preview only: this entry is not a strict content-gate acceptance record.',
    countsTowardGate: false,
  };
}
function withPreviewCommand(entry) {
  return {
    ...entry,
    previewUrl: entry.id === 'diver' ? entry.url : entry.pairedUrl ?? entry.url,
    previewCommand: previewCommandFor(entry.id),
    ...reviewStateForPreview(entry),
  };
}
for (const id of quickPreviewIds) {
  const entry = sandboxEntries.find((candidate) => candidate.id === id);
  if (entry) quickPreviews.push(withPreviewCommand(entry));
}
for (const entry of sandboxEntries.filter((candidate) => candidate.kind === 'articulated').slice(0, 6)) {
  if (!quickPreviews.some((candidate) => candidate.id === entry.id)) quickPreviews.push(withPreviewCommand(entry));
}
for (const entry of sandboxEntries.filter((candidate) => candidate.kind === 'source').slice(0, 4)) {
  if (!quickPreviews.some((candidate) => candidate.id === entry.id)) quickPreviews.push(withPreviewCommand(entry));
}

const rejectedAttempts = Array.isArray(sourceRejections.attempts) ? sourceRejections.attempts : [];
const missingArtifactAttempts = rejectedAttempts.filter((attempt) => rejectionKind(attempt) === 'missing-artifact');
const activeMarkerCandidateId = sourceImagegenMarker.schema === 'water9/source-imagegen-handoff-marker@1'
  ? sourceImagegenMarker.candidateId ?? null
  : null;
const currentSourceQueueTarget = sourceQueue.candidates?.[0]?.id ?? null;
const queuedSourceIds = new Set((sourceQueue.candidates ?? []).map((candidate) => candidate.id));
const activeMarkerCandidate = activeMarkerCandidateId
  ? candidateList.find((candidate) => candidate.id === activeMarkerCandidateId) ?? null
  : null;
const activeMarkerInQueue = activeMarkerCandidateId ? queuedSourceIds.has(activeMarkerCandidateId) : false;
const activeMarkerHasSource = Boolean(activeMarkerCandidate?.source);
const activeMarkerIsCurrentTarget = Boolean(activeMarkerCandidateId && activeMarkerCandidateId === currentSourceQueueTarget);
const activeMarkerMissingArtifactAttempts = activeMarkerCandidateId
  ? missingArtifactAttempts.filter((attempt) => attempt.candidateId === activeMarkerCandidateId)
  : [];
const activeBlockerMissingArtifactAttempts = missingArtifactAttempts.filter((attempt) => {
  const candidate = candidateList.find((item) => item.id === attempt.candidateId);
  return queuedSourceIds.has(attempt.candidateId) && !candidate?.source;
});
const sourceImagegenRecommendedAction = (() => {
  if (!activeMarkerCandidateId) {
    return 'Use source:imagegen-mark before generation and source:imagegen-status --ingest only when a project-recoverable file appears.';
  }
  if (activeMarkerHasSource || !activeMarkerInQueue) {
    return `The active imagegen marker for ${activeMarkerCandidateId} is historical; continue with current missing-source target ${currentSourceQueueTarget ?? 'none'}.`;
  }
  if (activeMarkerMissingArtifactAttempts.length >= 3) {
    return `Built-in image generation has ${activeMarkerMissingArtifactAttempts.length} missing-artifact attempts for current target ${activeMarkerCandidateId}. Use source inbox capture/manual save, or set OPENAI_API_KEY and explicitly choose CLI fallback.`;
  }
  return `Continue source generation for ${activeMarkerCandidateId}; ingest only after a project-recoverable file appears.`;
})();
const acceptedThreats = stageBoard.summary?.acceptedThreats ?? contentReadiness.summary?.acceptedThreats ?? 0;
const prototypeThreats = reviewCreatures.filter((creature) => creature.quality?.status === 'prototype').length;
const researchAssignments = Array.isArray(researchSubagentPack.assignments) ? researchSubagentPack.assignments : [];
const nextTargets = stageTargets
  .filter((target) => !target.accepted)
  .slice(0, 6)
  .map((target) => ({
    id: target.id,
    species: target.species,
    stage: target.stage,
    accepted: Boolean(target.accepted),
    reviewWarning: target.accepted
      ? null
      : 'Not accepted: this target cannot count toward the 20-threat goal until the source-first gate, rigging evidence, paired diver sandbox, and human acceptance review all pass.',
    countsTowardGate: Boolean(target.accepted),
    sourcePreviewUrl: target.hasSourceImage ? `/?sandbox=source-${target.id}&companion=diver` : null,
    rigPreviewUrl: target.rigId ? `/?sandbox=${target.rigId}&companion=diver` : null,
    previewCommands: [
      target.hasSourceImage ? previewCommandFor(`source-${target.id}`) : null,
      target.rigId ? previewCommandFor(target.rigId) : null,
    ].filter(Boolean),
    nextCommands: target.nextCommands ?? [],
  }));

const workbench = {
  schema: 'water9/content-workbench@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: Object.fromEntries(await Promise.all(Object.entries(paths)
    .filter(([key]) => !key.startsWith('out'))
    .map(async ([key, path]) => [key, await fileSummary(path)]))),
  summary: {
    targetThreats: stageBoard.summary?.targetThreats ?? 20,
    acceptedThreats,
    prototypeThreats,
    sourceCandidates: candidateList.length,
    sourceImages: candidateList.filter((candidate) => candidate.source).length,
    sourceNextReviewTarget: sourceNextReview.target?.id ?? null,
    sourceNextReviewTargetSpecies: sourceNextReview.target?.species ?? null,
    sourceNextReviewReady: sourceNextReview.summary?.readyForHumanReview ?? 0,
    sourceNextReviewHumanApproved: sourceNextReview.summary?.humanApproved ?? 0,
    sourceNextDecisionDraftTarget: sourceNextDecisionDraft.target?.id ?? null,
    sourceNextDecisionDraftTargetSpecies: sourceNextDecisionDraft.target?.species ?? null,
    sourceNextDecisionDraftStatus: sourceNextDecisionDraft.decisionFile?.decisions?.[0]?.status ?? null,
    sourceReviewDossierCandidates: sourceReviewDossier.summary?.candidateCount ?? 0,
    sourceReviewDossierSourceImages: sourceReviewDossier.summary?.sourceImages ?? 0,
    sourceReviewDossierPending: sourceReviewDossier.summary?.pendingReview ?? 0,
    sourceReviewDossierApproved: sourceReviewDossier.summary?.approvedSources ?? 0,
    sourceReviewDossierPackets: (sourceReviewDossier.items ?? []).filter((item) => item.hasSource && item.reviewPacket?.file).length,
    sourceApprovalRunwayCandidates: sourceApprovalRunway.summary?.candidates ?? 0,
    sourceApprovalRunwayMechanicallyReady: sourceApprovalRunway.summary?.mechanicallyReadyForHumanReview ?? 0,
    sourceApprovalRunwayCriticBlocked: sourceApprovalRunway.summary?.criticRegenerationRequired ?? 0,
    sourceApprovalRunwayReady: sourceApprovalRunway.summary?.readyForHumanReview ?? 0,
    sourceApprovalRunwayApproved: sourceApprovalRunway.summary?.humanApproved ?? 0,
    sourceApprovalRunwayPlanPreviews: sourceApprovalRunway.summary?.planPreviewsPresent ?? 0,
    sourceApprovalSessionCandidates: sourceApprovalSession.summary?.candidates ?? 0,
    sourceApprovalSessionReady: sourceApprovalSession.summary?.readyForHumanReview ?? 0,
    sourceApprovalSessionApproved: sourceApprovalSession.summary?.humanApproved ?? 0,
    sourceApprovalSessionNextTarget: sourceApprovalSession.summary?.nextTarget ?? 'none',
    sourceApprovalSessionNextTargetSpecies: sourceApprovalSession.summary?.nextTargetSpecies ?? 'none',
    sourceApprovalSessionRequiredChecks: sourceApprovalSession.summary?.requiredChecks ?? 0,
    sourceApprovalSessionStrictCommand: sourceApprovalSession.decisionOutput?.strictApplyCommand ?? null,
    sourceApprovalMarathonCandidates: sourceApprovalMarathon.summary?.candidates ?? 0,
    sourceApprovalMarathonReady: sourceApprovalMarathon.summary?.readyForHumanReview ?? 0,
    sourceApprovalMarathonApproved: sourceApprovalMarathon.summary?.humanApproved ?? 0,
    sourceApprovalMarathonDecisionStarters: sourceApprovalMarathon.summary?.decisionStarters ?? 0,
    sourceApprovalMarathonRiskHigh: sourceApprovalMarathon.summary?.riskHigh ?? 0,
    sourceApprovalMarathonRiskMedium: sourceApprovalMarathon.summary?.riskMedium ?? 0,
    sourceReplaceRunwayCandidates: sourceReplaceRunway.summary?.candidates ?? 0,
    sourceReplaceRunwaySourcePresent: sourceReplaceRunway.summary?.sourcePresent ?? 0,
    sourceReplaceRunwayReplaceable: sourceReplaceRunway.summary?.replaceable ?? 0,
    sourceReplaceRunwayHumanApproved: sourceReplaceRunway.summary?.humanApproved ?? 0,
    sourceVisualBoardCandidates: sourceVisualBoard.summary?.candidates ?? 0,
    sourceVisualBoardReady: sourceVisualBoard.summary?.readyForHumanReview ?? 0,
    sourceVisualBoardApproved: sourceVisualBoard.summary?.humanApproved ?? 0,
    sourceVisualBoardAcceptedThreats: sourceVisualBoard.summary?.acceptedThreats ?? 0,
    sourceCriticBoardCandidates: sourceCriticBoard.summary?.candidates ?? 0,
    sourceCriticBoardLanes: sourceCriticBoard.summary?.lanes ?? 0,
    sourceCriticBoardReady: sourceCriticBoard.summary?.readyForHumanReview ?? 0,
    sourceCriticBoardAdvisoryOnly: sourceCriticBoard.summary?.advisoryOnly ?? 0,
    sourceCriticBoardSubagentFindings: sourceCriticBoard.summary?.subagentFindings ?? 0,
    sourceCriticBoardRegenerate: sourceCriticBoard.summary?.regenerateRecommendations ?? 0,
    sourceCriticBoardReadyWithCaution: sourceCriticBoard.summary?.readyWithCautionRecommendations ?? 0,
    sourceCriticBoardReadyRecommendation: sourceCriticBoard.summary?.readyRecommendations ?? 0,
    sourceCriticRegenerationCandidates: sourceCriticRegeneration.summary?.regenerateCandidates ?? 0,
    sourceCriticRegenerationLanes: sourceCriticRegeneration.summary?.lanes ?? 0,
    sourceCriticRegenerationPromptFiles: sourceCriticRegeneration.summary?.promptFiles ?? 0,
    sourceCriticRegenerationNextTarget: sourceCriticRegeneration.summary?.nextCandidateId ?? 'none',
    sourceCriticRegenerationNextTargetSpecies: sourceCriticRegeneration.summary?.nextCandidateSpecies ?? 'none',
    sourceCriticRegenerationNextPromptFile: sourceCriticRegeneration.summary?.nextPromptFile ?? null,
    sourceCriticRegenerationDoctorTarget: sourceCriticRegenerationDoctor.summary?.nextCandidateId ?? 'none',
    sourceCriticRegenerationDoctorTargetSpecies: sourceCriticRegenerationDoctor.summary?.nextCandidateSpecies ?? 'none',
    sourceCriticRegenerationDoctorStatus: sourceCriticRegenerationDoctor.summary?.status ?? 'unknown',
    sourceCriticRegenerationDoctorReady: Boolean(sourceCriticRegenerationDoctor.summary?.readyForReplacementIngest),
    sourceCriticRegenerationDoctorMatchesCurrentSource: Boolean(sourceCriticRegenerationDoctor.summary?.replacementMatchesCurrentSource),
    sourceCriticRegenerationDoctorInboxFiles: sourceCriticRegenerationDoctor.summary?.inboxFiles ?? 0,
    sourceCriticRegenerationHealthCandidates: sourceCriticRegenerationHealth.summary?.regenerateCandidates ?? 0,
    sourceCriticRegenerationHealthDistinctReady: sourceCriticRegenerationHealth.summary?.distinctReplacementReady ?? 0,
    sourceCriticRegenerationHealthNoop: sourceCriticRegenerationHealth.summary?.validNoopReplacements ?? 0,
    sourceCriticRegenerationHealthMissing: sourceCriticRegenerationHealth.summary?.missingReplacements ?? 0,
    sourceCriticRegenerationHealthInvalid: sourceCriticRegenerationHealth.summary?.invalidReplacements ?? 0,
    sourceCriticRegenerationHealthNextTarget: sourceCriticRegenerationHealth.summary?.nextActionTarget ?? 'none',
    sourceCriticRegenerationHealthNextStatus: sourceCriticRegenerationHealth.summary?.nextActionStatus ?? 'none',
    sourceReviewSequencerTotal: sourceReviewSequencer.summary?.totalCandidates ?? 0,
    sourceReviewSequencerApprovalReady: sourceReviewSequencer.summary?.approvalReady ?? 0,
    sourceReviewSequencerCriticRegenerationRequired: sourceReviewSequencer.summary?.criticRegenerationRequired ?? 0,
    sourceReviewSequencerDistinctReady: sourceReviewSequencer.summary?.distinctReplacementReady ?? 0,
    sourceReviewSequencerNoop: sourceReviewSequencer.summary?.validNoopReplacements ?? 0,
    sourceReviewSequencerMissing: sourceReviewSequencer.summary?.missingReplacements ?? 0,
    sourceReviewSequencerInvalid: sourceReviewSequencer.summary?.invalidReplacements ?? 0,
    sourceReviewSequencerApproved: sourceReviewSequencer.summary?.approved ?? 0,
    sourceReviewSequencerCountsTowardGate: sourceReviewSequencer.summary?.countsTowardGate ?? 0,
    sourceReviewSequencerNextLane: sourceReviewSequencer.summary?.nextLane ?? 'none',
    sourceReviewSequencerNextTarget: sourceReviewSequencer.summary?.nextTarget ?? 'none',
    sourceReviewTargetPacketTarget: sourceReviewTargetPacket.target?.id ?? 'none',
    sourceReviewTargetPacketSpecies: sourceReviewTargetPacket.target?.species ?? 'none',
    sourceReviewTargetPacketLane: sourceReviewTargetPacket.target?.lane ?? 'none',
    sourceReviewTargetPacketStatus: sourceReviewTargetPacket.target?.status ?? 'none',
    sourceRegenerationWorkspaceTarget: sourceRegenerationWorkspace.target?.id ?? 'none',
    sourceRegenerationWorkspaceSpecies: sourceRegenerationWorkspace.target?.species ?? 'none',
    sourceRegenerationWorkspaceLane: sourceRegenerationWorkspace.target?.lane ?? 'none',
    sourceRegenerationWorkspaceHealthStatus: sourceRegenerationWorkspace.target?.healthStatus ?? 'none',
    sourceRegenerationWorkspaceNoop: Boolean(sourceRegenerationWorkspace.target?.replacementMatchesCurrentSource),
    sourceRegenerationWorkspaceDistinctReady: Boolean(sourceRegenerationWorkspace.target?.distinctReplacementReady),
    visualRegenerationItems: visualRegenerationQueue.summary?.items ?? 0,
    visualRegenerationBlockingItems: visualRegenerationQueue.summary?.blockingItems ?? 0,
    visualRegenerationNextTarget: visualRegenerationQueue.summary?.nextTargetId ?? 'none',
    visualRegenerationNextPromptFile: visualRegenerationQueue.summary?.nextPromptFile ?? null,
    visualRegenerationStrictGateCredit: visualRegenerationQueue.summary?.countsTowardStrictGate ?? 0,
    sourceCohesionReviewCandidates: sourceCohesionReview.summary?.candidates ?? 0,
    sourceCohesionReviewReady: sourceCohesionReview.summary?.readyForCohesionReview ?? 0,
    sourceCohesionReviewApproved: sourceCohesionReview.summary?.humanCohesionApproved ?? 0,
    sourceCohesionReviewPrototypeLocked: sourceCohesionReview.summary?.prototypeLocked ?? 0,
    sourceCohesionReviewEvidenceComplete: sourceCohesionReview.summary?.reviewEvidenceComplete ?? 0,
    sourceCohesionDecisionTemplateCandidates: sourceCohesionDecisions.summary?.candidates ?? 0,
    sourceCohesionDecisionTemplateReady: sourceCohesionDecisions.summary?.readyForCohesionReview ?? 0,
    sourceCohesionDecisionTemplatePrototypeLocked: sourceCohesionDecisions.summary?.prototypeLocked ?? 0,
    sourceCohesionDecisionRunDecisions: sourceCohesionDecisionRun.decisions ?? 0,
    sourceCohesionDecisionRunApproved: sourceCohesionDecisionRun.approved ?? 0,
    sourceCohesionDecisionRunRejected: sourceCohesionDecisionRun.rejected ?? 0,
    sourceCohesionDecisionRunPending: sourceCohesionDecisionRun.pending ?? 0,
    sourceCohesionDecisionRunFailures: sourceCohesionDecisionRun.failures?.length ?? 0,
    sourceQuickReviews: sourceQuickReviews.summary?.reviews ?? sourceQuickReviews.reviews?.length ?? 0,
    sourceQuickReviewsReady: sourceQuickReviews.summary?.readyForHumanReview ?? 0,
    sourceImagegenMissingArtifacts: activeBlockerMissingArtifactAttempts.length,
    sourceImagegenHistoricalMissingArtifacts: Math.max(0, missingArtifactAttempts.length - activeBlockerMissingArtifactAttempts.length),
    sourceImagegenActiveBlockerMissingArtifacts: activeBlockerMissingArtifactAttempts.length,
    sourceImagegenActiveCandidate: activeMarkerCandidateId,
    sourceImagegenActiveCandidateInQueue: activeMarkerInQueue,
    sourceImagegenActiveCandidateHasSource: activeMarkerHasSource,
    sourceImagegenActiveCandidateIsCurrentTarget: activeMarkerIsCurrentTarget,
    sourceImagegenCurrentTarget: currentSourceQueueTarget,
    sourceImagegenActiveCandidateMissingArtifacts: activeMarkerMissingArtifactAttempts.length,
    sourceImagegenRecommendedAction,
    openaiApiKeyAvailable: Boolean(process.env.OPENAI_API_KEY),
    sourceQueue: sourceQueue.candidates?.length ?? 0,
    sourceSprint: sourceSprint.ids ?? [],
    researchAssignments: researchAssignments.length,
    researchAssignedCandidates: researchAssignments.reduce((total, assignment) => total + (assignment.candidates?.length ?? 0), 0),
    researchDispatchCandidates: researchDispatch.summary?.candidates ?? 0,
    researchDispatchPackets: researchDispatch.summary?.dispatchPackets ?? 0,
    researchDispatchAuditedCandidates: researchDispatch.summary?.auditedCandidates ?? 0,
    researchDispatchSourceImages: researchDispatch.summary?.hasSource ?? 0,
    researchTraceRecords: researchSourceTrace.summary?.candidates ?? researchSourceTrace.records?.length ?? 0,
    researchTraceAuditedCandidates: researchSourceTrace.summary?.auditedCandidates ?? 0,
    researchTraceQueuedWithAuditGuidance: researchSourceTrace.summary?.queuedWithAuditGuidance ?? 0,
    researchTraceQueuedPromptAuditHardening: researchSourceTrace.summary?.queuedPromptAuditHardening ?? 0,
    sourceInboxReady: sourceInbox.ready ?? 0,
    sourceInboxMissing: sourceInbox.missing ?? 0,
    sourceInboxBlocked: sourceInbox.blocked ?? 0,
    sourceIntakeSprint: sourceIntakeRunway.summary?.sprint ?? 0,
    sourceIntakeReady: sourceIntakeRunway.summary?.inboxReady ?? 0,
    sourceIntakeMissing: sourceIntakeRunway.summary?.inboxMissing ?? 0,
    sourceIntakeBlocked: sourceIntakeRunway.summary?.inboxBlocked ?? 0,
    sourceIntakeDoctorTarget: sourceIntakeDoctor.target?.id ?? 'none',
    sourceIntakeDoctorStatus: sourceIntakeDoctor.target?.status ?? 'unknown',
    sourceIntakeDoctorReadyForIngest: Boolean(sourceIntakeDoctor.target?.readyForIngest),
    sourceIntakeDoctorQueue: sourceIntakeDoctor.queue?.length ?? 0,
    sourceWorkstationTarget: sourceWorkstation.target?.id ?? 'none',
    sourceWorkstationDoctorStatus: sourceWorkstation.target?.doctorStatus ?? 'unknown',
    sourceWorkstationRejections: sourceWorkstation.rejections?.length ?? 0,
    sandboxEntries: sandbox.counts?.total ?? sandboxEntries.length,
    articulatedPreviews: sandbox.counts?.articulated ?? sandboxEntries.filter((entry) => entry.kind === 'articulated').length,
    stageCounts: stageBoard.summary?.stageCounts ?? {},
    nextBottleneck: stageBoard.summary?.nextBottleneck ?? 'unknown',
    readinessTargetThreats: contentReadiness.summary?.targetThreats ?? 0,
    readinessAcceptedThreats: contentReadiness.summary?.acceptedThreats ?? 0,
    readinessSourceImages: contentReadiness.summary?.sourceImages ?? 0,
    readinessSourceMechanicallyReadyForHumanReview: contentReadiness.summary?.sourceMechanicallyReadyForHumanReview ?? 0,
    readinessSourceApprovalReady: contentReadiness.summary?.sourceApprovalReady ?? 0,
    readinessSourceCriticRegenerationRequired: contentReadiness.summary?.sourceCriticRegenerationRequired ?? 0,
    readinessSourceCriticRegenerationQueued: contentReadiness.summary?.sourceCriticRegenerationQueued ?? 0,
    readinessApprovedSources: contentReadiness.summary?.approvedSources ?? 0,
    readinessNextBottleneck: contentReadiness.summary?.nextBottleneck ?? 'unknown',
    acceptanceRunwayCandidates: acceptanceRunway.summary?.candidates ?? 0,
    acceptanceRunwayRuntimeRegistered: acceptanceRunway.summary?.runtimeRegistered ?? 0,
    acceptanceRunwayUnmappedPrototypes: acceptanceRunway.summary?.unmappedPrototypeThreats ?? 0,
    acceptanceRunwayCandidatePackets: (acceptanceRunway.items ?? []).filter((item) => item.acceptancePacket?.file).length,
    acceptanceRunwayUnmappedPrototypePackets: (acceptanceRunway.unmappedPrototypeThreats ?? []).filter((item) => item.packet?.file).length,
    acceptanceAuditIndexTargetThreats: acceptanceAuditIndex.summary?.targetThreats ?? 0,
    acceptanceAuditIndexAuditedThreats: acceptanceAuditIndex.summary?.auditedThreats ?? 0,
    acceptanceAuditIndexSourceMechanicalReady: acceptanceAuditIndex.summary?.sourceMechanicalReady ?? 0,
    acceptanceAuditIndexThreatMechanicalReady: acceptanceAuditIndex.summary?.threatMechanicalReady ?? 0,
    acceptanceAuditIndexCountsTowardGate: acceptanceAuditIndex.summary?.countsTowardGate ?? 0,
    acceptanceAuditIndexStrictGateComplete: Boolean(acceptanceAuditIndex.summary?.strictGateComplete),
    acceptanceAuditIndexNextGate: acceptanceAuditIndex.summary?.nextGate ?? 'unknown',
    reviewEvidenceSourceCandidates: reviewEvidenceMatrix.summary?.sourceCandidates ?? 0,
    reviewEvidenceSourceImages: reviewEvidenceMatrix.summary?.sourceImages ?? 0,
    reviewEvidenceSourceApproved: reviewEvidenceMatrix.summary?.sourceApproved ?? 0,
    reviewEvidenceRuntimeMappedCandidates: reviewEvidenceMatrix.summary?.runtimeMappedCandidates ?? 0,
    reviewEvidenceUnmappedPrototypeThreats: reviewEvidenceMatrix.summary?.unmappedPrototypeThreats ?? 0,
    reviewEvidenceMechanicallyCompleteMappedRigs: reviewEvidenceMatrix.summary?.mechanicallyCompleteMappedRigs ?? 0,
    reviewEvidenceAcceptedThreats: reviewEvidenceMatrix.summary?.acceptedThreats ?? 0,
    reviewEvidenceNextHumanGate: reviewEvidenceMatrix.summary?.nextHumanGate ?? 'unknown',
    reviewCockpitPages: reviewCockpit.summary?.candidates ?? reviewCockpit.pages?.length ?? 0,
    reviewCockpitRuntimeMappedCandidates: reviewCockpit.summary?.runtimeMappedCandidates ?? 0,
    reviewCockpitUnmappedPrototypeThreats: reviewCockpit.summary?.unmappedPrototypeThreats ?? 0,
    reviewCockpitAcceptedThreats: reviewCockpit.summary?.acceptedThreats ?? 0,
    acceptanceDoctorCandidates: acceptanceDoctor.summary?.candidates ?? 0,
    acceptanceDoctorSourceBlocked: acceptanceDoctor.summary?.sourceBlocked ?? 0,
    acceptanceDoctorRuntimeBlocked: acceptanceDoctor.summary?.runtimeBlocked ?? 0,
    acceptanceDoctorAcceptanceBlocked: acceptanceDoctor.summary?.acceptanceBlocked ?? 0,
    acceptanceDoctorMissingRuntime: acceptanceDoctor.summary?.missingRuntime ?? 0,
    acceptanceDoctorNextBottleneck: acceptanceDoctor.summary?.nextBottleneck ?? 'unknown',
    threatAcceptanceDecisionRigs: threatAcceptanceDecisions.summary?.registeredRigs ?? 0,
    threatAcceptanceDecisionAccepted: threatAcceptanceDecisions.summary?.accepted ?? 0,
    threatAcceptanceDecisionNeedsReview: threatAcceptanceDecisions.summary?.needsReview ?? 0,
    threatAcceptanceDecisionRunDecisions: threatAcceptanceDecisionRun.decisions ?? 0,
    threatAcceptanceDecisionRunAccepted: threatAcceptanceDecisionRun.accepted ?? 0,
    threatAcceptanceDecisionRunPrototype: threatAcceptanceDecisionRun.prototype ?? 0,
    threatAcceptanceDecisionRunPending: threatAcceptanceDecisionRun.pending ?? 0,
    threatAcceptanceDecisionRunFailures: threatAcceptanceDecisionRun.failures?.length ?? 0,
    approvedRuntimeHandoffMissingRuntime: approvedRuntimeHandoff.summary?.missingRuntime ?? 0,
    approvedRuntimeHandoffApprovedMissingRuntime: approvedRuntimeHandoff.summary?.approvedSourcesMissingRuntime ?? 0,
    approvedRuntimeHandoffEligible: approvedRuntimeHandoff.summary?.productionEligible ?? 0,
    approvedRuntimeHandoffRiggingEligibleOnly: approvedRuntimeHandoff.summary?.riggingEligibleOnly ?? approvedRuntimeHandoff.summary?.productionEligible ?? 0,
    approvedRuntimeHandoffBlockedUntilSourceApproval: approvedRuntimeHandoff.summary?.blockedUntilSourceApproval ?? 0,
    planCoverageCandidates: planCoverage.summary?.candidates ?? 0,
    planCoveragePlanArtifacts: planCoverage.summary?.planArtifacts ?? 0,
    planCoveragePlanPreviews: planCoverage.summary?.planPreviews ?? 0,
    planCoverageMissingPlanArtifacts: planCoverage.summary?.missingPlanArtifacts ?? 0,
    planCoverageMissingPlanPreviews: planCoverage.summary?.missingPlanPreviews ?? 0,
    verticalSliceThreats: verticalSlice.summary?.threats ?? 0,
    verticalSliceMechanicallyReviewable: verticalSlice.summary?.mechanicallyReviewable ?? 0,
    verticalSliceAcceptedThreats: verticalSlice.summary?.acceptedThreats ?? 0,
    verticalSliceNextBlocker: verticalSlice.summary?.nextBlocker ?? 'unknown',
    verticalSliceRigQualityEvidence: verticalSlice.summary?.allRoutesHaveRigQualityEvidence ? verticalSlice.summary?.threats ?? 0 : (verticalSlice.items ?? []).filter((item) => item.rigQuality?.ready).length,
    verticalSliceRuntimeVisualEvidence: verticalSlice.summary?.allRoutesHaveRuntimeVisualEvidence ? verticalSlice.summary?.threats ?? 0 : (verticalSlice.items ?? []).filter((item) => item.runtimeVisual?.ready).length,
    verticalSliceAcceptanceAudits: verticalSlice.summary?.allRoutesHaveAcceptanceAudits ? verticalSlice.summary?.threats ?? 0 : (verticalSlice.items ?? []).filter((item) => item.audit?.ready).length,
    humanSignoffTargetThreats: humanSignoff.summary?.targetThreats ?? 0,
    humanSignoffReadyForSourceSignoff: humanSignoff.summary?.readyForSourceSignoff ?? 0,
    humanSignoffSourceRegenerationRequired: humanSignoff.summary?.sourceRegenerationRequired ?? 0,
    humanSignoffSourceBlockedBeforeSignoff: humanSignoff.summary?.sourceBlockedBeforeSignoff ?? 0,
    humanSignoffReadyForThreatSignoff: humanSignoff.summary?.readyForThreatSignoff ?? 0,
    humanSignoffAcceptedThreats: humanSignoff.summary?.acceptedThreats ?? 0,
    humanSignoffNextGate: humanSignoff.summary?.nextGate ?? 'unknown',
    humanAdjudicationItems: humanAdjudicationBoard.summary?.items ?? 0,
    humanAdjudicationSourceReady: humanAdjudicationBoard.summary?.sourceReady ?? 0,
    humanAdjudicationSourceApprovalReady: humanAdjudicationBoard.summary?.sourceApprovalReady ?? 0,
    humanAdjudicationSourceCriticRegenerationRequired: humanAdjudicationBoard.summary?.sourceCriticRegenerationRequired ?? 0,
    humanAdjudicationThreatReady: humanAdjudicationBoard.summary?.threatReady ?? 0,
    humanAdjudicationAllMediaPresent: humanAdjudicationBoard.summary?.allMediaPresent ?? 0,
    humanAdjudicationSourceApprovalCommands: humanAdjudicationBoard.summary?.sourceApprovalCommands ?? 0,
    humanAdjudicationThreatAcceptanceCommands: humanAdjudicationBoard.summary?.threatAcceptanceCommands ?? 0,
    humanAdjudicationSourcePreviewBoundaries: humanAdjudicationBoard.summary?.sourcePreviewBoundaries ?? 0,
    humanAdjudicationRuntimePreviewBoundaries: humanAdjudicationBoard.summary?.runtimePreviewBoundaries ?? 0,
    humanAdjudicationPreviewOnlySources: humanAdjudicationBoard.summary?.previewOnlySources ?? 0,
    humanAdjudicationPreviewOnlyRuntimes: humanAdjudicationBoard.summary?.previewOnlyRuntimes ?? 0,
    contentReviewSessionItems: contentReviewSession.summary?.items ?? 0,
    contentReviewSessionSourceReady: contentReviewSession.summary?.sourceReady ?? 0,
    contentReviewSessionSourceApprovalReady: contentReviewSession.summary?.sourceApprovalReady ?? 0,
    contentReviewSessionSourceCriticRegenerationRequired: contentReviewSession.summary?.sourceCriticRegenerationRequired ?? 0,
    contentReviewSessionThreatReady: contentReviewSession.summary?.threatReady ?? 0,
    contentReviewSessionAllMediaPresent: contentReviewSession.summary?.allMediaPresent ?? 0,
    contentReviewSessionSourcePreviewBoundaries: contentReviewSession.summary?.sourcePreviewBoundaries ?? 0,
    contentReviewSessionRuntimePreviewBoundaries: contentReviewSession.summary?.runtimePreviewBoundaries ?? 0,
    contentReviewSessionPreviewOnlySources: contentReviewSession.summary?.previewOnlySources ?? 0,
    contentReviewSessionPreviewOnlyRuntimes: contentReviewSession.summary?.previewOnlyRuntimes ?? 0,
    contentReviewSessionSourceChecks: contentReviewSession.summary?.sourceChecks ?? 0,
    contentReviewSessionThreatChecks: contentReviewSession.summary?.threatChecks ?? 0,
    contentProductionProofCandidates: contentProductionProof.summary?.candidates ?? 0,
    contentProductionProofAcceptedThreats: contentProductionProof.summary?.acceptedThreats ?? 0,
    contentProductionProofPrototypeOnly: contentProductionProof.summary?.prototypeOnly ?? 0,
    contentProductionProofHumanReviewRequired: contentProductionProof.summary?.humanReviewRequired ?? 0,
    contentProductionProofStrictReady: Boolean(contentProductionProof.summary?.strictProductionReady),
    contentPromoteApprovedThreatsItems: contentPromoteApprovedThreats.summary?.items ?? 0,
    contentPromoteApprovedThreatsSourceApproved: contentPromoteApprovedThreats.summary?.sourceApproved ?? 0,
    contentPromoteApprovedThreatsReady: contentPromoteApprovedThreats.summary?.readyForThreatDecision ?? 0,
    contentPromoteApprovedThreatsExcluded: contentPromoteApprovedThreats.summary?.excludedNonTargetRigs ?? 0,
    contentGoalAuditComplete: Boolean(contentGoalAudit.complete),
    contentGoalAuditStrictGoalComplete: Boolean(contentGoalAudit.strictGoalComplete),
    contentGoalAuditRequirements: (contentGoalAudit.requirements ?? []).length,
    contentGoalAuditPassedRequirements: (contentGoalAudit.requirements ?? []).filter((item) => item.status === 'passed').length,
    contentGoalAuditAcceptedThreats: contentGoalAudit.summary?.acceptedThreats ?? 0,
    contentGoalAuditTargetThreats: contentGoalAudit.summary?.targetThreats ?? 0,
    contentGoalAuditVisualRegenerationGateCredit: contentGoalAudit.summary?.visualRegenerationGateCredit ?? 0,
    runtimeCohesionReviewTarget: runtimeCohesionReview.target?.id ?? null,
    runtimeCohesionReviewSpecies: runtimeCohesionReview.target?.species ?? null,
    runtimeCohesionReviewNextGate: runtimeCohesionReview.target?.nextGate ?? null,
    runtimeCohesionReviewMedia: (runtimeCohesionReview.media ?? []).filter((item) => item.present).length,
    runtimeCohesionReviewRequiredMedia: (runtimeCohesionReview.media ?? []).length,
    runtimeCohesionReviewChecks: (runtimeCohesionReview.requiredChecks ?? []).length,
    cohortCohesionBoardItems: cohortCohesionBoard.summary?.items ?? 0,
    cohortCohesionBoardTargetThreats: cohortCohesionBoard.summary?.targetThreats ?? 0,
    cohortCohesionBoardAcceptedThreats: cohortCohesionBoard.summary?.acceptedThreats ?? 0,
    cohortCohesionBoardSourceApproved: cohortCohesionBoard.summary?.sourceApproved ?? 0,
    cohortCohesionBoardOpenVisualBlockers: cohortCohesionBoard.summary?.openVisualBlockers ?? 0,
    cohortCohesionBoardRiskHigh: cohortCohesionBoard.summary?.riskHigh ?? 0,
    cohortCohesionBoardRiskMedium: cohortCohesionBoard.summary?.riskMedium ?? 0,
    contentSandboxRosterItems: contentSandboxRoster.summary?.items ?? 0,
    contentSandboxRosterReady: contentSandboxRoster.summary?.sandboxReady ?? 0,
    contentSandboxRosterRuntimePreviews: contentSandboxRoster.summary?.runtimePreviews ?? 0,
    contentSandboxRosterSourcePreviews: contentSandboxRoster.summary?.sourcePreviews ?? 0,
    contentSandboxRosterPairedRuntimePreviews: contentSandboxRoster.summary?.pairedRuntimePreviews ?? 0,
    contentSandboxRosterPairedSourcePreviews: contentSandboxRoster.summary?.pairedSourcePreviews ?? 0,
    contentArticulationRosterItems: contentArticulationRoster.summary?.items ?? 0,
    contentArticulationRosterReady: contentArticulationRoster.summary?.mechanicallyReady ?? 0,
    contentArticulationRosterMagentaSources: contentArticulationRoster.summary?.magentaSourceImages ?? 0,
    contentArticulationRosterStarterPlans: contentArticulationRoster.summary?.starterPlans ?? 0,
    contentArticulationRosterPlanPreviews: contentArticulationRoster.summary?.planPreviews ?? 0,
    contentArticulationRosterSourceParity: contentArticulationRoster.summary?.sourceParity ?? 0,
    contentArticulationRosterVisualCohesionPasses: contentArticulationRoster.summary?.visualCohesionPasses ?? 0,
    contentReproducibilityTargets: contentReproducibility.summary?.targetThreats ?? 0,
    contentReproducibilityItems: contentReproducibility.summary?.items ?? 0,
    contentReproducibilityReady: contentReproducibility.summary?.reproducibleTargets ?? 0,
    contentReproducibilityMagentaSources: contentReproducibility.summary?.magentaSources ?? 0,
    contentReproducibilityRuntimeRegistered: contentReproducibility.summary?.runtimeRegistered ?? 0,
    riggingSprintMissingRuntimeTotal: riggingSprint.summary?.missingRuntimeTotal ?? 0,
    riggingSprintSize: riggingSprint.summary?.sprintSize ?? 0,
    riggingSprintSourceApproved: riggingSprint.summary?.sourceApprovedInSprint ?? 0,
    riggingSprintPlanArtifactsStaged: riggingSprint.summary?.planArtifactsStagedInSprint ?? 0,
    riggingSprintPlanPreviewsStaged: riggingSprint.summary?.planPreviewsStagedInSprint ?? 0,
  },
  pages: [
    'public/review/content-workbench.html',
    'public/review/content-readiness.html',
    'public/review/content-acceptance-runway.html',
    'public/review/content-acceptance-audits/index.html',
    'public/review/content-acceptance-doctor.html',
    'public/review/content-threat-acceptance-decision-template.html',
    'public/review/content-approved-runtime-handoff.html',
    'public/review/content-plan-coverage.html',
    'public/review/content-vertical-slice-runway.html',
    'public/review/content-human-signoff-queue.html',
    'public/review/content-human-adjudication-board.html',
    'public/review/content-review-session.html',
    'public/review/content-production-proof.html',
    'public/review/content-promote-approved-threats.html',
    'public/review/content-goal-audit.html',
    'public/review/content-runtime-cohesion-review.html',
    'public/review/content-sandbox-roster.html',
    'public/review/content-articulation-roster.html',
    'public/review/content-reproducibility.html',
    'public/review/content-rigging-sprint.html',
    'public/review/sandbox/index.html',
    'public/review/content-stage-board.html',
    'public/review/source-inbox/index.html',
    'public/review/source-candidates/source-intake-runway.html',
    'public/review/source-candidates/source-intake-doctor.html',
    'public/review/source-candidates/source-workstation.html',
    'public/review/source-candidates/research-subagent-pack.html',
    'public/review/source-candidates/research-source-trace.html',
    'public/review/source-candidates/source-generation-queue.html',
    'public/review/source-candidates/source-generation-sprint.html',
    'public/review/source-candidates/source-next-review.html',
    'public/review/source-candidates/source-next-decision-draft.html',
    'public/review/source-candidates/source-review-dossier.html',
    'public/review/source-approval-runway.html',
    'public/review/source-candidates/source-approval-session.html',
    'public/review/source-candidates/source-replace-runway.html',
    'public/review/source-candidates/source-critic-board.html',
    'public/review/source-candidates/source-critic-regeneration-queue.html',
    'public/review/content-visual-regeneration-queue.html',
    'public/review/source-candidates/source-cohesion-review.html',
    'public/review/source-candidates/source-cohesion-decision-template.html',
    'public/review/source-candidates/quick-reviews/index.html',
    'public/review/source-candidates/index.html',
    'public/review/articulated/index.html',
  ],
  quickPreviews,
  nextTargets,
  sourceSprintCommands: sourceSprint.commands ?? {},
  gateCommands: [
    'npm run sandbox:index && npm run sandbox:index:check',
    'npm run content:readiness && npm run content:readiness-check',
    'npm run content:acceptance-runway && npm run content:acceptance-runway-check',
    'npm run content:acceptance-audit-index && npm run content:acceptance-audit-index-check',
    'npm run content:acceptance-doctor && npm run content:acceptance-doctor-check',
    'npm run content:threat-decisions && npm run content:threat-decisions-check',
    'npm run content:threat-decisions-apply',
    'npm run content:approved-runtime-handoff && npm run content:approved-runtime-handoff-check',
    'npm run content:vertical-slice && npm run content:vertical-slice-check',
    'npm run content:human-adjudication-board && npm run content:human-adjudication-board-check',
    'npm run content:review-session && npm run content:review-session-check',
    'npm run content:production-proof && npm run content:production-proof-check',
    'npm run content:promote-approved-threats && npm run content:promote-approved-threats-check',
    'npm run content:goal-readiness && npm run content:goal-readiness-check',
    'npm run content:runtime-cohesion-review && npm run content:runtime-cohesion-review-check && npm run content:runtime-cohesion-review:serve-smoke',
    'npm run content:sandbox-roster && npm run content:sandbox-roster-check',
    'npm run content:articulation-roster && npm run content:articulation-roster-check',
    'npm run content:reproducibility && npm run content:reproducibility-check',
    'npm run content:rigging-sprint && npm run content:rigging-sprint-check',
    'npm run source:intake-runway && npm run source:intake-runway-check',
    'npm run source:intake-doctor && npm run source:intake-doctor-check',
    'npm run source:workstation && npm run source:workstation-check',
    'npm run research:source-trace && npm run research:source-trace-check',
    'npm run source:generation-queue && npm run source:generation-queue:check',
    'npm run source:next-review && npm run source:next-review-check',
    'npm run source:next-decision-draft && npm run source:next-decision-draft-check && npm run source:next-decision-draft:serve-smoke',
    'npm run source:review-dossier && npm run source:review-dossier-check',
    'npm run source:approval-session && npm run source:approval-session-check && npm run source:approval-session:serve-smoke',
    'npm run source:approval-marathon && npm run source:approval-marathon-check && npm run source:approval-marathon-workspace-smoke && npm run source:approval-marathon-full-batch-smoke',
    'npm run content:synthetic-decision-guards-check',
    'npm run source:quick-review-all && npm run source:quick-review-all-check',
    'npm run source:approval-decisions && npm run source:approval-decisions-check && npm run source:approval-decisions-workspace-smoke',
    'npm run source:approval-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
    'npm run source:critic-board && npm run source:critic-board-check',
    'npm run source:critic-regeneration && npm run source:critic-regeneration-check && npm run source:critic-regeneration:serve-smoke && npm run source:critic-regeneration-openai-smoke',
    'npm run content:visual-regeneration && npm run content:visual-regeneration-check && npm run content:visual-regeneration:serve-smoke',
    'npm run source:check',
    'npm run source:preview-check',
    'npm run content:stage-board && npm run content:stage-board-check',
    'npm run content:gate:smoke',
    'npm run content:gate',
  ],
  launchCommands: [
    'npm run content:workbench:preview',
    'npm run content:workbench:preview-check',
    'npm run sandbox:preview -- --id gulper --kind articulated --with diver --serve --open --visual',
  ],
};

await mkdir(dirname(paths.outJson), { recursive: true });
await mkdir(dirname(paths.outHtml), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(workbench, null, 2)}\n`);
await writeFile(paths.outHtml, renderHtml(workbench));

console.log(JSON.stringify({
  schema: workbench.schema,
  jsonOut: paths.outJson,
  htmlOut: paths.outHtml,
  summary: workbench.summary,
}, null, 2));

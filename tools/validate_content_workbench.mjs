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

const jsonPath = resolve(String(args.get('json') ?? 'public/review/content-workbench.json'));
const htmlPath = resolve(String(args.get('html') ?? 'public/review/content-workbench.html'));
const contentReadinessPath = resolve(String(args.get('content-readiness') ?? 'public/review/content-readiness.json'));
const acceptanceRunwayPath = resolve(String(args.get('acceptance-runway') ?? 'public/review/content-acceptance-runway.json'));
const acceptanceAuditIndexPath = resolve(String(args.get('acceptance-audit-index') ?? 'public/review/content-acceptance-audits/index.json'));
const reviewEvidenceMatrixPath = resolve(String(args.get('review-evidence-matrix') ?? 'public/review/content-review-evidence-matrix.json'));
const reviewCockpitPath = resolve(String(args.get('review-cockpit') ?? 'public/review/content-review-cockpit/manifest.json'));
const acceptanceDoctorPath = resolve(String(args.get('acceptance-doctor') ?? 'public/review/content-acceptance-doctor.json'));
const threatAcceptanceDecisionsPath = resolve(String(args.get('threat-acceptance-decisions') ?? 'public/review/content-threat-acceptance-decision-template.json'));
const approvedRuntimeHandoffPath = resolve(String(args.get('approved-runtime-handoff') ?? 'public/review/content-approved-runtime-handoff.json'));
const planCoveragePath = resolve(String(args.get('plan-coverage') ?? 'public/review/content-plan-coverage.json'));
const verticalSlicePath = resolve(String(args.get('vertical-slice') ?? 'public/review/content-vertical-slice-runway.json'));
const humanSignoffPath = resolve(String(args.get('human-signoff') ?? 'public/review/content-human-signoff-queue.json'));
const humanAdjudicationBoardPath = resolve(String(args.get('human-adjudication-board') ?? 'public/review/content-human-adjudication-board.json'));
const contentReviewSessionPath = resolve(String(args.get('content-review-session') ?? 'public/review/content-review-session.json'));
const contentProductionProofPath = resolve(String(args.get('content-production-proof') ?? 'public/review/content-production-proof.json'));
const contentPromoteApprovedThreatsPath = resolve(String(args.get('content-promote-approved-threats') ?? 'public/review/content-promote-approved-threats.json'));
const contentGoalAuditPath = resolve(String(args.get('content-goal-audit') ?? 'public/review/content-goal-audit.json'));
const runtimeCohesionReviewPath = resolve(String(args.get('runtime-cohesion-review') ?? 'public/review/content-runtime-cohesion-review.json'));
const cohortCohesionBoardPath = resolve(String(args.get('cohort-cohesion-board') ?? 'public/review/content-cohort-cohesion-board.json'));
const contentSandboxRosterPath = resolve(String(args.get('content-sandbox-roster') ?? 'public/review/content-sandbox-roster.json'));
const contentArticulationRosterPath = resolve(String(args.get('content-articulation-roster') ?? 'public/review/content-articulation-roster.json'));
const contentReproducibilityPath = resolve(String(args.get('content-reproducibility') ?? 'public/review/content-reproducibility.json'));
const riggingSprintPath = resolve(String(args.get('rigging-sprint') ?? 'public/review/content-rigging-sprint.json'));
const stageBoardPath = resolve(String(args.get('stage-board') ?? 'public/review/content-stage-board.json'));
const sandboxPath = resolve(String(args.get('sandbox') ?? 'public/review/sandbox/manifest.json'));
const researchDispatchPath = resolve(String(args.get('research-dispatch') ?? 'public/review/source-candidates/research-dispatch-board.json'));
const researchSourceTracePath = resolve(String(args.get('research-source-trace') ?? 'public/review/source-candidates/research-source-trace.json'));
const sourceIntakeRunwayPath = resolve(String(args.get('source-intake-runway') ?? 'public/review/source-candidates/source-intake-runway.json'));
const sourceIntakeDoctorPath = resolve(String(args.get('source-intake-doctor') ?? 'public/review/source-candidates/source-intake-doctor.json'));
const sourceWorkstationPath = resolve(String(args.get('source-workstation') ?? 'public/review/source-candidates/source-workstation.json'));
const sourceNextReviewPath = resolve(String(args.get('source-next-review') ?? 'public/review/source-candidates/source-next-review.json'));
const sourceNextDecisionDraftPath = resolve(String(args.get('source-next-decision-draft') ?? 'public/review/source-candidates/source-next-decision-draft.json'));
const sourceReviewDossierPath = resolve(String(args.get('source-review-dossier') ?? 'public/review/source-candidates/source-review-dossier.json'));
const sourceApprovalRunwayPath = resolve(String(args.get('source-approval-runway') ?? 'public/review/source-approval-runway.json'));
const sourceApprovalSessionPath = resolve(String(args.get('source-approval-session') ?? 'public/review/source-candidates/source-approval-session.json'));
const sourceApprovalMarathonPath = resolve(String(args.get('source-approval-marathon') ?? 'public/review/source-candidates/source-approval-marathon.json'));
const sourceReplaceRunwayPath = resolve(String(args.get('source-replace-runway') ?? 'public/review/source-candidates/source-replace-runway.json'));
const sourceVisualBoardPath = resolve(String(args.get('source-visual-board') ?? 'public/review/source-visual-board.json'));
const sourceCriticBoardPath = resolve(String(args.get('source-critic-board') ?? 'public/review/source-candidates/source-critic-board.json'));
const sourceCriticRegenerationPath = resolve(String(args.get('source-critic-regeneration') ?? 'public/review/source-candidates/source-critic-regeneration-queue.json'));
const sourceCriticRegenerationDoctorPath = resolve(String(args.get('source-critic-regeneration-doctor') ?? 'public/review/source-candidates/source-critic-regeneration-doctor.json'));
const sourceCriticRegenerationHealthPath = resolve(String(args.get('source-critic-regeneration-health') ?? 'public/review/source-candidates/source-critic-regeneration-health.json'));
const sourceReviewSequencerPath = resolve(String(args.get('source-review-sequencer') ?? 'public/review/source-candidates/source-review-sequencer.json'));
const sourceReviewTargetPacketPath = resolve(String(args.get('source-review-target-packet') ?? 'public/review/source-candidates/source-review-target-packet.json'));
const sourceRegenerationWorkspacePath = resolve(String(args.get('source-regeneration-workspace') ?? 'public/review/source-candidates/source-regeneration-workspace.json'));
const sourceCohesionReviewPath = resolve(String(args.get('source-cohesion-review') ?? 'public/review/source-candidates/source-cohesion-review.json'));
const sourceCohesionDecisionsPath = resolve(String(args.get('source-cohesion-decisions') ?? 'public/review/source-candidates/source-cohesion-decision-template.json'));
const sourceCohesionDecisionRunPath = resolve(String(args.get('source-cohesion-decision-run') ?? 'public/review/source-candidates/source-cohesion-decision-run-report.json'));
const threatAcceptanceDecisionRunPath = resolve(String(args.get('threat-acceptance-decision-run') ?? 'public/review/content-threat-acceptance-decision-run-report.json'));
const sourceQuickReviewsPath = resolve(String(args.get('source-quick-reviews') ?? 'public/review/source-candidates/quick-reviews/index.json'));
const minThreats = Number(args.get('min-threats') ?? 20);
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

async function fileOk(label, path, minSize) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minSize) failures.push(`${label}: missing or too small`);
  } catch {
    failures.push(`${label}: missing`);
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function htmlIncludes(value) {
  return html.includes(value) || html.includes(htmlEscape(value));
}

const workbench = await readJson('content workbench', jsonPath);
const contentReadiness = await readJson('content readiness', contentReadinessPath);
const acceptanceRunway = await readJson('acceptance runway', acceptanceRunwayPath);
const acceptanceAuditIndex = await readJson('acceptance audit index', acceptanceAuditIndexPath);
const reviewEvidenceMatrix = await readJson('review evidence matrix', reviewEvidenceMatrixPath);
const reviewCockpit = await readJson('review cockpit', reviewCockpitPath);
const acceptanceDoctor = await readJson('acceptance doctor', acceptanceDoctorPath);
const threatAcceptanceDecisions = await readJson('threat acceptance decisions', threatAcceptanceDecisionsPath);
const approvedRuntimeHandoff = await readJson('approved runtime handoff', approvedRuntimeHandoffPath);
const planCoverage = await readJson('plan coverage', planCoveragePath);
const verticalSlice = await readJson('vertical slice runway', verticalSlicePath);
const humanSignoff = await readJson('human sign-off queue', humanSignoffPath);
const humanAdjudicationBoard = await readJson('human adjudication board', humanAdjudicationBoardPath);
const contentReviewSession = await readJson('content review session', contentReviewSessionPath);
const contentProductionProof = await readJson('content production proof', contentProductionProofPath);
const contentPromoteApprovedThreats = await readJson('content promote approved threats', contentPromoteApprovedThreatsPath);
const contentGoalAudit = await readJson('content goal audit', contentGoalAuditPath);
const runtimeCohesionReview = await readJson('runtime cohesion review', runtimeCohesionReviewPath);
const cohortCohesionBoard = await readJson('cohort cohesion board', cohortCohesionBoardPath);
const contentSandboxRoster = await readJson('content sandbox roster', contentSandboxRosterPath);
const contentArticulationRoster = await readJson('content articulation roster', contentArticulationRosterPath);
const contentReproducibility = await readJson('content reproducibility', contentReproducibilityPath);
const riggingSprint = await readJson('rigging sprint', riggingSprintPath);
const stageBoard = await readJson('content stage board', stageBoardPath);
const sandbox = await readJson('sandbox manifest', sandboxPath);
const researchDispatch = await readJson('research dispatch board', researchDispatchPath);
const researchSourceTrace = await readJson('research source trace', researchSourceTracePath);
const sourceIntakeRunway = await readJson('source intake runway', sourceIntakeRunwayPath);
const sourceIntakeDoctor = await readJson('source intake doctor', sourceIntakeDoctorPath);
const sourceWorkstation = await readJson('source workstation', sourceWorkstationPath);
const sourceNextReview = await readJson('source next review', sourceNextReviewPath);
const sourceNextDecisionDraft = await readJson('source next decision draft', sourceNextDecisionDraftPath);
const sourceReviewDossier = await readJson('source review dossier', sourceReviewDossierPath);
const sourceApprovalRunway = await readJson('source approval runway', sourceApprovalRunwayPath);
const sourceApprovalSession = await readJson('source approval session', sourceApprovalSessionPath);
const sourceApprovalMarathon = await readJson('source approval marathon', sourceApprovalMarathonPath);
const sourceReplaceRunway = await readJson('source replace runway', sourceReplaceRunwayPath);
const sourceVisualBoard = await readJson('source visual board', sourceVisualBoardPath);
const sourceCriticBoard = await readJson('source critic board', sourceCriticBoardPath);
const sourceCriticRegeneration = await readJson('source critic regeneration queue', sourceCriticRegenerationPath);
const sourceCriticRegenerationDoctor = await readJson('source critic regeneration doctor', sourceCriticRegenerationDoctorPath);
const sourceCriticRegenerationHealth = await readJson('source critic regeneration health', sourceCriticRegenerationHealthPath);
const sourceReviewSequencer = await readJson('source review sequencer', sourceReviewSequencerPath);
const sourceReviewTargetPacket = await readJson('source review target packet', sourceReviewTargetPacketPath);
const sourceRegenerationWorkspace = await readJson('source regeneration workspace', sourceRegenerationWorkspacePath);
const sourceCohesionReview = await readJson('source cohesion review', sourceCohesionReviewPath);
const sourceCohesionDecisions = await readJson('source cohesion decision template', sourceCohesionDecisionsPath);
const sourceCohesionDecisionRun = await readJson('source cohesion decision run', sourceCohesionDecisionRunPath);
const threatAcceptanceDecisionRun = await readJson('threat acceptance decision run', threatAcceptanceDecisionRunPath);
const sourceQuickReviews = await readJson('source quick reviews', sourceQuickReviewsPath);
const html = await readText('content workbench html', htmlPath);
await fileOk('content workbench html', htmlPath, 4096);

if (workbench?.schema !== 'water9/content-workbench@1') failures.push(`unexpected workbench schema ${workbench?.schema ?? 'missing'}`);
if (contentReadiness?.schema !== 'water9/content-readiness@1') failures.push(`unexpected readiness schema ${contentReadiness?.schema ?? 'missing'}`);
if (acceptanceRunway?.schema !== 'water9/content-acceptance-runway@1') failures.push(`unexpected acceptance runway schema ${acceptanceRunway?.schema ?? 'missing'}`);
if (acceptanceAuditIndex?.schema !== 'water9/content-acceptance-audit-index@1') failures.push(`unexpected acceptance audit index schema ${acceptanceAuditIndex?.schema ?? 'missing'}`);
if (reviewEvidenceMatrix?.schema !== 'water9/content-review-evidence-matrix@1') failures.push(`unexpected review evidence matrix schema ${reviewEvidenceMatrix?.schema ?? 'missing'}`);
if (reviewCockpit?.schema !== 'water9/content-review-cockpit@1') failures.push(`unexpected review cockpit schema ${reviewCockpit?.schema ?? 'missing'}`);
if (acceptanceDoctor?.schema !== 'water9/content-acceptance-doctor@1') failures.push(`unexpected acceptance doctor schema ${acceptanceDoctor?.schema ?? 'missing'}`);
if (threatAcceptanceDecisions?.schema !== 'water9/content-threat-acceptance-decision-template@1') failures.push(`unexpected threat acceptance decisions schema ${threatAcceptanceDecisions?.schema ?? 'missing'}`);
if (approvedRuntimeHandoff?.schema !== 'water9/content-approved-runtime-handoff@1') failures.push(`unexpected approved runtime handoff schema ${approvedRuntimeHandoff?.schema ?? 'missing'}`);
if (planCoverage?.schema !== 'water9/content-plan-coverage@1') failures.push(`unexpected plan coverage schema ${planCoverage?.schema ?? 'missing'}`);
if (verticalSlice?.schema !== 'water9/content-vertical-slice-runway@1') failures.push(`unexpected vertical slice runway schema ${verticalSlice?.schema ?? 'missing'}`);
if (humanSignoff?.schema !== 'water9/content-human-signoff-queue@1') failures.push(`unexpected human sign-off queue schema ${humanSignoff?.schema ?? 'missing'}`);
if (humanAdjudicationBoard?.schema !== 'water9/content-human-adjudication-board@1') failures.push(`unexpected human adjudication board schema ${humanAdjudicationBoard?.schema ?? 'missing'}`);
if (contentReviewSession?.schema !== 'water9/content-review-session@1') failures.push(`unexpected content review session schema ${contentReviewSession?.schema ?? 'missing'}`);
if (contentGoalAudit?.schema !== 'water9/content-goal-audit@1') failures.push(`unexpected content goal audit schema ${contentGoalAudit?.schema ?? 'missing'}`);
if (runtimeCohesionReview?.schema !== 'water9/content-runtime-cohesion-review@1') failures.push(`unexpected runtime cohesion review schema ${runtimeCohesionReview?.schema ?? 'missing'}`);
if (contentSandboxRoster?.schema !== 'water9/content-sandbox-roster@1') failures.push(`unexpected content sandbox roster schema ${contentSandboxRoster?.schema ?? 'missing'}`);
if (contentArticulationRoster?.schema !== 'water9/content-articulation-roster@1') failures.push(`unexpected content articulation roster schema ${contentArticulationRoster?.schema ?? 'missing'}`);
if (contentReproducibility?.schema !== 'water9/content-reproducibility@1') failures.push(`unexpected content reproducibility schema ${contentReproducibility?.schema ?? 'missing'}`);
if (riggingSprint?.schema !== 'water9/content-rigging-sprint@1') failures.push(`unexpected rigging sprint schema ${riggingSprint?.schema ?? 'missing'}`);
if (stageBoard?.schema !== 'water9/content-stage-board@1') failures.push(`unexpected stage board schema ${stageBoard?.schema ?? 'missing'}`);
if (sandbox?.schema !== 'water9/sandbox-index@1') failures.push(`unexpected sandbox schema ${sandbox?.schema ?? 'missing'}`);
if (researchDispatch?.schema !== 'water9/research-dispatch-board@1') failures.push(`unexpected research dispatch schema ${researchDispatch?.schema ?? 'missing'}`);
if (researchSourceTrace?.schema !== 'water9/research-source-trace@1') failures.push(`unexpected research source trace schema ${researchSourceTrace?.schema ?? 'missing'}`);
if (sourceIntakeRunway?.schema !== 'water9/source-intake-runway@1') failures.push(`unexpected source intake runway schema ${sourceIntakeRunway?.schema ?? 'missing'}`);
if (sourceIntakeDoctor?.schema !== 'water9/source-intake-doctor@1') failures.push(`unexpected source intake doctor schema ${sourceIntakeDoctor?.schema ?? 'missing'}`);
if (sourceWorkstation?.schema !== 'water9/source-workstation@1') failures.push(`unexpected source workstation schema ${sourceWorkstation?.schema ?? 'missing'}`);
if (sourceNextReview?.schema !== 'water9/source-next-review@1') failures.push(`unexpected source next review schema ${sourceNextReview?.schema ?? 'missing'}`);
if (sourceNextDecisionDraft?.schema !== 'water9/source-next-decision-draft@1') failures.push(`unexpected source next decision draft schema ${sourceNextDecisionDraft?.schema ?? 'missing'}`);
if (sourceReviewDossier?.schema !== 'water9/source-review-dossier@1') failures.push(`unexpected source review dossier schema ${sourceReviewDossier?.schema ?? 'missing'}`);
if (sourceApprovalRunway?.schema !== 'water9/source-approval-runway@1') failures.push(`unexpected source approval runway schema ${sourceApprovalRunway?.schema ?? 'missing'}`);
if (sourceApprovalSession?.schema !== 'water9/source-approval-session@1') failures.push(`unexpected source approval session schema ${sourceApprovalSession?.schema ?? 'missing'}`);
if (sourceApprovalMarathon?.schema !== 'water9/source-approval-marathon@1') failures.push(`unexpected source approval marathon schema ${sourceApprovalMarathon?.schema ?? 'missing'}`);
if (sourceReplaceRunway?.schema !== 'water9/source-replace-runway@1') failures.push(`unexpected source replace runway schema ${sourceReplaceRunway?.schema ?? 'missing'}`);
if (sourceVisualBoard?.schema !== 'water9/source-visual-board@1') failures.push(`unexpected source visual board schema ${sourceVisualBoard?.schema ?? 'missing'}`);
if (sourceCriticBoard?.schema !== 'water9/source-critic-board@1') failures.push(`unexpected source critic board schema ${sourceCriticBoard?.schema ?? 'missing'}`);
if (sourceCohesionReview?.schema !== 'water9/source-cohesion-review@1') failures.push(`unexpected source cohesion review schema ${sourceCohesionReview?.schema ?? 'missing'}`);
if (sourceCohesionDecisions?.schema !== 'water9/source-cohesion-decision-template@1') failures.push(`unexpected source cohesion decision template schema ${sourceCohesionDecisions?.schema ?? 'missing'}`);
if (sourceCohesionDecisionRun?.schema !== 'water9/source-cohesion-decision-run@1') failures.push(`unexpected source cohesion decision run schema ${sourceCohesionDecisionRun?.schema ?? 'missing'}`);
if (threatAcceptanceDecisionRun?.schema !== 'water9/content-threat-acceptance-decision-run@1') failures.push(`unexpected threat acceptance decision run schema ${threatAcceptanceDecisionRun?.schema ?? 'missing'}`);
if (sourceQuickReviews?.schema !== 'water9/source-quick-review-index@1') failures.push(`unexpected source quick reviews schema ${sourceQuickReviews?.schema ?? 'missing'}`);
if (sourceCriticRegenerationHealth?.schema !== 'water9/source-critic-regeneration-health@1') failures.push(`unexpected source critic regeneration health schema ${sourceCriticRegenerationHealth?.schema ?? 'missing'}`);
if (sourceReviewSequencer?.schema !== 'water9/source-review-sequencer@1') failures.push(`unexpected source review sequencer schema ${sourceReviewSequencer?.schema ?? 'missing'}`);
if (sourceReviewTargetPacket?.schema !== 'water9/source-review-target-packet@1') failures.push(`unexpected source review target packet schema ${sourceReviewTargetPacket?.schema ?? 'missing'}`);
if (sourceRegenerationWorkspace?.schema !== 'water9/source-regeneration-workspace@1') failures.push(`unexpected source regeneration workspace schema ${sourceRegenerationWorkspace?.schema ?? 'missing'}`);

const summary = workbench?.summary ?? {};
if ((summary.targetThreats ?? 0) < minThreats) failures.push(`targetThreats ${summary.targetThreats ?? 'missing'} is below ${minThreats}`);
if (summary.nextBottleneck !== stageBoard?.summary?.nextBottleneck) failures.push('workbench nextBottleneck does not match stage board');
if (JSON.stringify(summary.stageCounts ?? {}) !== JSON.stringify(stageBoard?.summary?.stageCounts ?? {})) {
  failures.push('workbench stageCounts do not match stage board');
}
if ((summary.sandboxEntries ?? 0) !== (sandbox?.counts?.total ?? sandbox?.entries?.length)) failures.push('workbench sandbox entry count does not match sandbox manifest');
if ((summary.researchDispatchCandidates ?? 0) !== (researchDispatch?.summary?.candidates ?? 0)) failures.push('workbench researchDispatchCandidates does not match research dispatch board');
if ((summary.researchDispatchPackets ?? 0) !== (researchDispatch?.summary?.dispatchPackets ?? 0)) failures.push('workbench researchDispatchPackets does not match research dispatch board');
if ((summary.researchDispatchAuditedCandidates ?? 0) !== (researchDispatch?.summary?.auditedCandidates ?? 0)) failures.push('workbench researchDispatchAuditedCandidates does not match research dispatch board');
if ((summary.researchDispatchSourceImages ?? 0) !== (researchDispatch?.summary?.hasSource ?? 0)) failures.push('workbench researchDispatchSourceImages does not match research dispatch board');
if ((summary.researchTraceRecords ?? 0) !== (researchSourceTrace?.summary?.candidates ?? 0)) failures.push('workbench researchTraceRecords does not match research source trace');
if ((summary.researchTraceAuditedCandidates ?? 0) !== (researchSourceTrace?.summary?.auditedCandidates ?? 0)) failures.push('workbench researchTraceAuditedCandidates does not match research source trace');
if ((summary.researchTraceQueuedWithAuditGuidance ?? 0) !== (researchSourceTrace?.summary?.queuedWithAuditGuidance ?? 0)) failures.push('workbench researchTraceQueuedWithAuditGuidance does not match research source trace');
if ((summary.researchTraceQueuedPromptAuditHardening ?? 0) !== (researchSourceTrace?.summary?.queuedPromptAuditHardening ?? 0)) failures.push('workbench researchTraceQueuedPromptAuditHardening does not match research source trace');
if ((summary.sourceIntakeSprint ?? 0) !== (sourceIntakeRunway?.summary?.sprint ?? 0)) failures.push('workbench sourceIntakeSprint does not match source intake runway');
if ((summary.sourceIntakeReady ?? 0) !== (sourceIntakeRunway?.summary?.inboxReady ?? 0)) failures.push('workbench sourceIntakeReady does not match source intake runway');
if ((summary.sourceIntakeMissing ?? 0) !== (sourceIntakeRunway?.summary?.inboxMissing ?? 0)) failures.push('workbench sourceIntakeMissing does not match source intake runway');
if ((summary.sourceIntakeBlocked ?? 0) !== (sourceIntakeRunway?.summary?.inboxBlocked ?? 0)) failures.push('workbench sourceIntakeBlocked does not match source intake runway');
if (summary.sourceIntakeDoctorTarget !== (sourceIntakeDoctor?.target?.id ?? 'none')) failures.push('workbench sourceIntakeDoctorTarget does not match source intake doctor');
if (summary.sourceIntakeDoctorStatus !== (sourceIntakeDoctor?.target?.status ?? 'unknown')) failures.push('workbench sourceIntakeDoctorStatus does not match source intake doctor');
if (Boolean(summary.sourceIntakeDoctorReadyForIngest) !== Boolean(sourceIntakeDoctor?.target?.readyForIngest)) failures.push('workbench sourceIntakeDoctorReadyForIngest does not match source intake doctor');
if ((summary.sourceIntakeDoctorQueue ?? 0) !== (sourceIntakeDoctor?.queue?.length ?? 0)) failures.push('workbench sourceIntakeDoctorQueue does not match source intake doctor');
if (summary.sourceWorkstationTarget !== (sourceWorkstation?.target?.id ?? 'none')) failures.push('workbench sourceWorkstationTarget does not match source workstation');
if (summary.sourceWorkstationDoctorStatus !== (sourceWorkstation?.target?.doctorStatus ?? 'unknown')) failures.push('workbench sourceWorkstationDoctorStatus does not match source workstation');
if ((summary.sourceWorkstationRejections ?? 0) !== (sourceWorkstation?.rejections?.length ?? 0)) failures.push('workbench sourceWorkstationRejections does not match source workstation');
if (summary.sourceNextReviewTarget !== (sourceNextReview?.target?.id ?? null)) failures.push('workbench sourceNextReviewTarget does not match source next review');
if (summary.sourceNextReviewTargetSpecies !== (sourceNextReview?.target?.species ?? null)) failures.push('workbench sourceNextReviewTargetSpecies does not match source next review');
if ((summary.sourceNextReviewReady ?? 0) !== (sourceNextReview?.summary?.readyForHumanReview ?? 0)) failures.push('workbench sourceNextReviewReady does not match source next review');
if ((summary.sourceNextReviewHumanApproved ?? 0) !== (sourceNextReview?.summary?.humanApproved ?? 0)) failures.push('workbench sourceNextReviewHumanApproved does not match source next review');
if (!html.includes('Next Source Review')) failures.push('workbench html missing Next Source Review card');
if (!html.includes('source-candidates/source-next-review.html')) failures.push('workbench html missing source next review link');
if (!htmlIncludes('npm run source:next-review && npm run source:next-review-check')) failures.push('workbench html missing source next review command');
if (!htmlIncludes('npm run source:next-review:serve-smoke')) failures.push('workbench html missing source next review serve smoke command');
if (!html.includes('one focused packet')) failures.push('workbench html missing source next review focused packet copy');
if (summary.sourceNextDecisionDraftTarget !== (sourceNextDecisionDraft?.target?.id ?? null)) failures.push('workbench sourceNextDecisionDraftTarget does not match source next decision draft');
if (summary.sourceNextDecisionDraftTargetSpecies !== (sourceNextDecisionDraft?.target?.species ?? null)) failures.push('workbench sourceNextDecisionDraftTargetSpecies does not match source next decision draft');
if (summary.sourceNextDecisionDraftStatus !== (sourceNextDecisionDraft?.decisionFile?.decisions?.[0]?.status ?? null)) failures.push('workbench sourceNextDecisionDraftStatus does not match source next decision draft');
if (!html.includes('Next Source Decision Draft')) failures.push('workbench html missing Next Source Decision Draft card');
if (!html.includes('source-candidates/source-next-decision-draft.html')) failures.push('workbench html missing source next decision draft link');
if (!htmlIncludes('npm run source:next-decision-draft && npm run source:next-decision-draft-check')) failures.push('workbench html missing source next decision draft command');
if (!htmlIncludes('npm run source:next-decision-draft:serve-smoke')) failures.push('workbench html missing source next decision draft serve smoke command');
if (!html.includes('Focused reviewed-only decision draft')) failures.push('workbench html missing source next decision draft reviewed-only copy');
if ((summary.sourceReviewDossierCandidates ?? 0) !== (sourceReviewDossier?.summary?.candidateCount ?? 0)) failures.push('workbench sourceReviewDossierCandidates does not match source review dossier');
if ((summary.sourceReviewDossierSourceImages ?? 0) !== (sourceReviewDossier?.summary?.sourceImages ?? 0)) failures.push('workbench sourceReviewDossierSourceImages does not match source review dossier');
if ((summary.sourceReviewDossierPending ?? 0) !== (sourceReviewDossier?.summary?.pendingReview ?? 0)) failures.push('workbench sourceReviewDossierPending does not match source review dossier');
if ((summary.sourceReviewDossierApproved ?? 0) !== (sourceReviewDossier?.summary?.approvedSources ?? 0)) failures.push('workbench sourceReviewDossierApproved does not match source review dossier');
const sourceReviewPacketCount = (sourceReviewDossier?.items ?? []).filter((item) => item.hasSource && item.reviewPacket?.file).length;
if ((summary.sourceReviewDossierPackets ?? 0) !== sourceReviewPacketCount) failures.push('workbench sourceReviewDossierPackets does not match source review dossier');
if (!html.includes('packetized evidence')) failures.push('workbench html missing source review packetized evidence copy');
if ((summary.sourceApprovalRunwayCandidates ?? 0) !== (sourceApprovalRunway?.summary?.candidates ?? 0)) failures.push('workbench sourceApprovalRunwayCandidates does not match source approval runway');
if ((summary.sourceApprovalRunwayMechanicallyReady ?? 0) !== (sourceApprovalRunway?.summary?.mechanicallyReadyForHumanReview ?? 0)) failures.push('workbench sourceApprovalRunwayMechanicallyReady does not match source approval runway');
if ((summary.sourceApprovalRunwayCriticBlocked ?? 0) !== (sourceApprovalRunway?.summary?.criticRegenerationRequired ?? 0)) failures.push('workbench sourceApprovalRunwayCriticBlocked does not match source approval runway');
if ((summary.sourceApprovalRunwayReady ?? 0) !== (sourceApprovalRunway?.summary?.readyForHumanReview ?? 0)) failures.push('workbench sourceApprovalRunwayReady does not match source approval runway');
if ((summary.sourceApprovalRunwayApproved ?? 0) !== (sourceApprovalRunway?.summary?.humanApproved ?? 0)) failures.push('workbench sourceApprovalRunwayApproved does not match source approval runway');
if ((summary.sourceApprovalRunwayPlanPreviews ?? 0) !== (sourceApprovalRunway?.summary?.planPreviewsPresent ?? 0)) failures.push('workbench sourceApprovalRunwayPlanPreviews does not match source approval runway');
if (!html.includes('Source Approval Runway')) failures.push('workbench html missing Source Approval Runway card');
if (!html.includes('source-approval-runway.html')) failures.push('workbench html missing source approval runway link');
if (!htmlIncludes('npm run source:approval-runway && npm run source:approval-runway-check && npm run source:approval-runway:preview')) failures.push('workbench html missing source approval runway preview command');
if (!html.includes('approval-ready after')) failures.push('workbench html missing source approval stricter blocker copy');
if (!html.includes('mechanically ready')) failures.push('workbench html missing source approval mechanically ready copy');
if ((summary.sourceApprovalSessionCandidates ?? 0) !== (sourceApprovalSession?.summary?.candidates ?? 0)) failures.push('workbench sourceApprovalSessionCandidates does not match source approval session');
if ((summary.sourceApprovalSessionReady ?? 0) !== (sourceApprovalSession?.summary?.readyForHumanReview ?? 0)) failures.push('workbench sourceApprovalSessionReady does not match source approval session');
if ((summary.sourceApprovalSessionApproved ?? 0) !== (sourceApprovalSession?.summary?.humanApproved ?? 0)) failures.push('workbench sourceApprovalSessionApproved does not match source approval session');
if (summary.sourceApprovalSessionNextTarget !== (sourceApprovalSession?.summary?.nextTarget ?? 'none')) failures.push('workbench sourceApprovalSessionNextTarget does not match source approval session');
if (summary.sourceApprovalSessionNextTargetSpecies !== (sourceApprovalSession?.summary?.nextTargetSpecies ?? 'none')) failures.push('workbench sourceApprovalSessionNextTargetSpecies does not match source approval session');
if ((summary.sourceApprovalSessionRequiredChecks ?? 0) !== (sourceApprovalSession?.summary?.requiredChecks ?? 0)) failures.push('workbench sourceApprovalSessionRequiredChecks does not match source approval session');
if (summary.sourceApprovalSessionStrictCommand !== (sourceApprovalSession?.decisionOutput?.strictApplyCommand ?? null)) failures.push('workbench sourceApprovalSessionStrictCommand does not match source approval session');
if (!html.includes('Source Approval Session')) failures.push('workbench html missing Source Approval Session card');
if (!html.includes('source-candidates/source-approval-session.html')) failures.push('workbench html missing source approval session link');
if (!htmlIncludes('npm run source:approval-session && npm run source:approval-session-check && npm run source:approval-session:serve-smoke')) failures.push('workbench html missing source approval session command');
if (!html.includes('human-authored batch decisions')) failures.push('workbench html missing source approval session batch-decision copy');
if ((summary.sourceApprovalMarathonCandidates ?? 0) !== (sourceApprovalMarathon?.summary?.candidates ?? 0)) failures.push('workbench sourceApprovalMarathonCandidates does not match source approval marathon');
if ((summary.sourceApprovalMarathonReady ?? 0) !== (sourceApprovalMarathon?.summary?.readyForHumanReview ?? 0)) failures.push('workbench sourceApprovalMarathonReady does not match source approval marathon');
if ((summary.sourceApprovalMarathonApproved ?? 0) !== (sourceApprovalMarathon?.summary?.humanApproved ?? 0)) failures.push('workbench sourceApprovalMarathonApproved does not match source approval marathon');
if ((summary.sourceApprovalMarathonDecisionStarters ?? 0) !== (sourceApprovalMarathon?.summary?.decisionStarters ?? 0)) failures.push('workbench sourceApprovalMarathonDecisionStarters does not match source approval marathon');
if ((summary.sourceApprovalMarathonRiskHigh ?? 0) !== (sourceApprovalMarathon?.summary?.riskHigh ?? 0)) failures.push('workbench sourceApprovalMarathonRiskHigh does not match source approval marathon');
if ((summary.sourceApprovalMarathonRiskMedium ?? 0) !== (sourceApprovalMarathon?.summary?.riskMedium ?? 0)) failures.push('workbench sourceApprovalMarathonRiskMedium does not match source approval marathon');
if (!html.includes('Source Approval Marathon')) failures.push('workbench html missing Source Approval Marathon card');
if (!html.includes('source-candidates/source-approval-marathon.html')) failures.push('workbench html missing source approval marathon link');
if (!htmlIncludes('npm run source:approval-marathon && npm run source:approval-marathon-check')) failures.push('workbench html missing source approval marathon command');
if (!htmlIncludes('npm run source:approval-marathon:serve-smoke')) failures.push('workbench html missing source approval marathon serve smoke command');
if (!htmlIncludes('npm run source:approval-marathon-workspace-smoke')) failures.push('workbench html missing source approval marathon workspace smoke command');
if (!htmlIncludes('npm run source:approval-marathon-full-batch-smoke')) failures.push('workbench html missing source approval marathon full-batch smoke command');
if (!htmlIncludes('npm run content:synthetic-decision-guards-check')) failures.push('workbench html missing synthetic decision guard check command');
if (!html.includes('reviewed-only decision starters')) failures.push('workbench html missing source approval marathon decision starter copy');
if (!html.includes('risk triage')) failures.push('workbench html missing source approval marathon risk copy');
if ((summary.sourceReplaceRunwayCandidates ?? 0) !== (sourceReplaceRunway?.summary?.candidates ?? 0)) failures.push('workbench sourceReplaceRunwayCandidates does not match source replace runway');
if ((summary.sourceReplaceRunwaySourcePresent ?? 0) !== (sourceReplaceRunway?.summary?.sourcePresent ?? 0)) failures.push('workbench sourceReplaceRunwaySourcePresent does not match source replace runway');
if ((summary.sourceReplaceRunwayReplaceable ?? 0) !== (sourceReplaceRunway?.summary?.replaceable ?? 0)) failures.push('workbench sourceReplaceRunwayReplaceable does not match source replace runway');
if ((summary.sourceReplaceRunwayHumanApproved ?? 0) !== (sourceReplaceRunway?.summary?.humanApproved ?? 0)) failures.push('workbench sourceReplaceRunwayHumanApproved does not match source replace runway');
if (!html.includes('Source Replace Runway')) failures.push('workbench html missing Source Replace Runway card');
if (!html.includes('source-candidates/source-replace-runway.html')) failures.push('workbench html missing source replace runway link');
if (!htmlIncludes('npm run source:replace-runway && npm run source:replace-runway-check && npm run source:replace-runway:preview')) failures.push('workbench html missing source replace runway preview command');
if (!html.includes('explicit --overwrite replacement loop')) failures.push('workbench html missing source replace runway overwrite copy');
if ((summary.sourceVisualBoardCandidates ?? 0) !== (sourceVisualBoard?.summary?.candidates ?? 0)) failures.push('workbench sourceVisualBoardCandidates does not match source visual board');
if ((summary.sourceVisualBoardReady ?? 0) !== (sourceVisualBoard?.summary?.readyForHumanReview ?? 0)) failures.push('workbench sourceVisualBoardReady does not match source visual board');
if ((summary.sourceVisualBoardApproved ?? 0) !== (sourceVisualBoard?.summary?.humanApproved ?? 0)) failures.push('workbench sourceVisualBoardApproved does not match source visual board');
if ((summary.sourceVisualBoardAcceptedThreats ?? 0) !== (sourceVisualBoard?.summary?.acceptedThreats ?? 0)) failures.push('workbench sourceVisualBoardAcceptedThreats does not match source visual board');
if (!html.includes('Source Visual Board')) failures.push('workbench html missing Source Visual Board card');
if (!html.includes('source-visual-board.html')) failures.push('workbench html missing source visual board link');
if (!htmlIncludes('npm run source:visual-board && npm run source:visual-board-check && npm run source:visual-board:serve-smoke')) failures.push('workbench html missing source visual board command');
if ((summary.sourceCriticBoardCandidates ?? 0) !== (sourceCriticBoard?.summary?.candidates ?? 0)) failures.push('workbench sourceCriticBoardCandidates does not match source critic board');
if ((summary.sourceCriticBoardLanes ?? 0) !== (sourceCriticBoard?.summary?.lanes ?? 0)) failures.push('workbench sourceCriticBoardLanes does not match source critic board');
if ((summary.sourceCriticBoardReady ?? 0) !== (sourceCriticBoard?.summary?.readyForHumanReview ?? 0)) failures.push('workbench sourceCriticBoardReady does not match source critic board');
if ((summary.sourceCriticBoardAdvisoryOnly ?? 0) !== (sourceCriticBoard?.summary?.advisoryOnly ?? 0)) failures.push('workbench sourceCriticBoardAdvisoryOnly does not match source critic board');
if ((summary.sourceCriticBoardSubagentFindings ?? 0) !== (sourceCriticBoard?.summary?.subagentFindings ?? 0)) failures.push('workbench sourceCriticBoardSubagentFindings does not match source critic board');
if ((summary.sourceCriticBoardRegenerate ?? 0) !== (sourceCriticBoard?.summary?.regenerateRecommendations ?? 0)) failures.push('workbench sourceCriticBoardRegenerate does not match source critic board');
if ((summary.sourceCriticBoardReadyWithCaution ?? 0) !== (sourceCriticBoard?.summary?.readyWithCautionRecommendations ?? 0)) failures.push('workbench sourceCriticBoardReadyWithCaution does not match source critic board');
if ((summary.sourceCriticBoardReadyRecommendation ?? 0) !== (sourceCriticBoard?.summary?.readyRecommendations ?? 0)) failures.push('workbench sourceCriticBoardReadyRecommendation does not match source critic board');
if (!html.includes('Source Critic Board')) failures.push('workbench html missing Source Critic Board card');
if (!html.includes('source-candidates/source-critic-board.html')) failures.push('workbench html missing source critic board link');
if (!htmlIncludes('npm run source:critic-board && npm run source:critic-board-check && npm run source:critic-board:serve-smoke')) failures.push('workbench html missing source critic board command');
if (!html.includes('lane-specific advisory risks')) failures.push('workbench html missing source critic board copy');
if (!html.includes('regenerate calls')) failures.push('workbench html missing source critic board regenerate-count copy');
if (sourceCriticRegeneration?.schema !== 'water9/source-critic-regeneration-queue@1') failures.push(`unexpected source critic regeneration schema ${sourceCriticRegeneration?.schema ?? 'missing'}`);
if ((summary.sourceCriticRegenerationCandidates ?? 0) !== (sourceCriticRegeneration?.summary?.regenerateCandidates ?? 0)) failures.push('workbench sourceCriticRegenerationCandidates does not match critic regeneration queue');
if ((summary.sourceCriticRegenerationLanes ?? 0) !== (sourceCriticRegeneration?.summary?.lanes ?? 0)) failures.push('workbench sourceCriticRegenerationLanes does not match critic regeneration queue');
if ((summary.sourceCriticRegenerationPromptFiles ?? 0) !== (sourceCriticRegeneration?.summary?.promptFiles ?? 0)) failures.push('workbench sourceCriticRegenerationPromptFiles does not match critic regeneration queue');
if (summary.sourceCriticRegenerationNextTarget !== (sourceCriticRegeneration?.summary?.nextCandidateId ?? 'none')) failures.push('workbench sourceCriticRegenerationNextTarget does not match critic regeneration queue');
if (summary.sourceCriticRegenerationNextTargetSpecies !== (sourceCriticRegeneration?.summary?.nextCandidateSpecies ?? 'none')) failures.push('workbench sourceCriticRegenerationNextTargetSpecies does not match critic regeneration queue');
if ((summary.sourceCriticRegenerationNextPromptFile ?? null) !== (sourceCriticRegeneration?.summary?.nextPromptFile ?? null)) failures.push('workbench sourceCriticRegenerationNextPromptFile does not match critic regeneration queue');
if ((summary.sourceCriticRegenerationCandidates ?? 0) !== (summary.sourceCriticBoardRegenerate ?? 0)) failures.push('critic regeneration queue must match critic board regenerate count');
if (sourceCriticRegenerationDoctor?.schema !== 'water9/source-critic-regeneration-doctor@1') failures.push(`unexpected source critic regeneration doctor schema ${sourceCriticRegenerationDoctor?.schema ?? 'missing'}`);
if (summary.sourceCriticRegenerationDoctorTarget !== (sourceCriticRegenerationDoctor?.summary?.nextCandidateId ?? 'none')) failures.push('workbench sourceCriticRegenerationDoctorTarget does not match critic regeneration doctor');
if (summary.sourceCriticRegenerationDoctorTargetSpecies !== (sourceCriticRegenerationDoctor?.summary?.nextCandidateSpecies ?? 'none')) failures.push('workbench sourceCriticRegenerationDoctorTargetSpecies does not match critic regeneration doctor');
if (summary.sourceCriticRegenerationDoctorStatus !== (sourceCriticRegenerationDoctor?.summary?.status ?? 'unknown')) failures.push('workbench sourceCriticRegenerationDoctorStatus does not match critic regeneration doctor');
if (Boolean(summary.sourceCriticRegenerationDoctorReady) !== Boolean(sourceCriticRegenerationDoctor?.summary?.readyForReplacementIngest)) failures.push('workbench sourceCriticRegenerationDoctorReady does not match critic regeneration doctor');
if (Boolean(summary.sourceCriticRegenerationDoctorMatchesCurrentSource) !== Boolean(sourceCriticRegenerationDoctor?.summary?.replacementMatchesCurrentSource)) failures.push('workbench sourceCriticRegenerationDoctorMatchesCurrentSource does not match critic regeneration doctor');
if ((summary.sourceCriticRegenerationDoctorInboxFiles ?? 0) !== (sourceCriticRegenerationDoctor?.summary?.inboxFiles ?? 0)) failures.push('workbench sourceCriticRegenerationDoctorInboxFiles does not match critic regeneration doctor');
if (!html.includes('Critic Regeneration Queue')) failures.push('workbench html missing Critic Regeneration Queue card');
if (!html.includes('source-candidates/source-critic-regeneration-queue.html')) failures.push('workbench html missing critic regeneration queue link');
if (!html.includes('source-candidates/source-critic-regeneration-queue.html#next-regeneration-target')) failures.push('workbench html missing critic regeneration next-target link');
if (!htmlIncludes('npm run source:critic-regeneration && npm run source:critic-regeneration-check && npm run source:critic-regeneration:serve-smoke && npm run source:critic-regeneration-openai-smoke')) failures.push('workbench html missing critic regeneration command');
if (!html.includes('critic-rejected source candidates')) failures.push('workbench html missing critic regeneration copy');
if (!html.includes('Next:')) failures.push('workbench html missing critic regeneration next-target copy');
if (!html.includes('Critic Regeneration Doctor')) failures.push('workbench html missing Critic Regeneration Doctor card');
if (!html.includes('source-candidates/source-critic-regeneration-doctor.html')) failures.push('workbench html missing critic regeneration doctor link');
if (!htmlIncludes('npm run source:critic-regeneration-doctor && npm run source:critic-regeneration-doctor-check && npm run source:critic-regeneration-doctor:serve-smoke')) failures.push('workbench html missing critic regeneration doctor command');
if (!html.includes('replacement ingest ready')) failures.push('workbench html missing critic regeneration doctor readiness copy');
if (!html.includes('matches current source')) failures.push('workbench html missing critic regeneration doctor current-source copy');
if ((summary.sourceCriticRegenerationHealthCandidates ?? 0) !== (sourceCriticRegenerationHealth?.summary?.regenerateCandidates ?? 0)) failures.push('workbench sourceCriticRegenerationHealthCandidates does not match critic regeneration health');
if ((summary.sourceCriticRegenerationHealthDistinctReady ?? 0) !== (sourceCriticRegenerationHealth?.summary?.distinctReplacementReady ?? 0)) failures.push('workbench sourceCriticRegenerationHealthDistinctReady does not match critic regeneration health');
if ((summary.sourceCriticRegenerationHealthNoop ?? 0) !== (sourceCriticRegenerationHealth?.summary?.validNoopReplacements ?? 0)) failures.push('workbench sourceCriticRegenerationHealthNoop does not match critic regeneration health');
if ((summary.sourceCriticRegenerationHealthMissing ?? 0) !== (sourceCriticRegenerationHealth?.summary?.missingReplacements ?? 0)) failures.push('workbench sourceCriticRegenerationHealthMissing does not match critic regeneration health');
if ((summary.sourceCriticRegenerationHealthInvalid ?? 0) !== (sourceCriticRegenerationHealth?.summary?.invalidReplacements ?? 0)) failures.push('workbench sourceCriticRegenerationHealthInvalid does not match critic regeneration health');
if (summary.sourceCriticRegenerationHealthNextTarget !== (sourceCriticRegenerationHealth?.summary?.nextActionTarget ?? 'none')) failures.push('workbench sourceCriticRegenerationHealthNextTarget does not match critic regeneration health');
if (summary.sourceCriticRegenerationHealthNextStatus !== (sourceCriticRegenerationHealth?.summary?.nextActionStatus ?? 'none')) failures.push('workbench sourceCriticRegenerationHealthNextStatus does not match critic regeneration health');
if ((sourceCriticRegenerationHealth?.summary?.regenerateCandidates ?? -1) !== (sourceCriticRegeneration?.summary?.regenerateCandidates ?? -2)) failures.push('critic regeneration health must match queue regenerate count');
if ((sourceCriticRegenerationHealth?.summary?.validNoopReplacements ?? 0) > 0 && !html.includes('valid no-op')) failures.push('workbench html missing critic regeneration no-op replacement copy');
if (!html.includes('Critic Regeneration Health')) failures.push('workbench html missing Critic Regeneration Health card');
if (!html.includes('source-candidates/source-critic-regeneration-health.html')) failures.push('workbench html missing critic regeneration health link');
if (!htmlIncludes('npm run source:critic-regeneration-health && npm run source:critic-regeneration-health-check && npm run source:critic-regeneration-health:serve-smoke')) failures.push('workbench html missing critic regeneration health command');
if (!html.includes('distinct replacements ready')) failures.push('workbench html missing critic regeneration health distinct-ready copy');
if (!html.includes('missing replacements')) failures.push('workbench html missing critic regeneration health missing-replacements copy');
if ((summary.sourceReviewSequencerTotal ?? -1) !== (sourceReviewSequencer?.summary?.totalCandidates ?? -2)) failures.push('workbench sourceReviewSequencerTotal does not match sequencer');
if ((summary.sourceReviewSequencerApprovalReady ?? -1) !== (sourceReviewSequencer?.summary?.approvalReady ?? -2)) failures.push('workbench sourceReviewSequencerApprovalReady does not match sequencer');
if ((summary.sourceReviewSequencerCriticRegenerationRequired ?? -1) !== (sourceReviewSequencer?.summary?.criticRegenerationRequired ?? -2)) failures.push('workbench sourceReviewSequencerCriticRegenerationRequired does not match sequencer');
if ((summary.sourceReviewSequencerDistinctReady ?? -1) !== (sourceReviewSequencer?.summary?.distinctReplacementReady ?? -2)) failures.push('workbench sourceReviewSequencerDistinctReady does not match sequencer');
if ((summary.sourceReviewSequencerNoop ?? -1) !== (sourceReviewSequencer?.summary?.validNoopReplacements ?? -2)) failures.push('workbench sourceReviewSequencerNoop does not match sequencer');
if ((summary.sourceReviewSequencerMissing ?? -1) !== (sourceReviewSequencer?.summary?.missingReplacements ?? -2)) failures.push('workbench sourceReviewSequencerMissing does not match sequencer');
if ((summary.sourceReviewSequencerInvalid ?? -1) !== (sourceReviewSequencer?.summary?.invalidReplacements ?? -2)) failures.push('workbench sourceReviewSequencerInvalid does not match sequencer');
if ((summary.sourceReviewSequencerApproved ?? -1) !== (sourceReviewSequencer?.summary?.approved ?? -2)) failures.push('workbench sourceReviewSequencerApproved does not match sequencer');
if ((summary.sourceReviewSequencerCountsTowardGate ?? -1) !== (sourceReviewSequencer?.summary?.countsTowardGate ?? -2)) failures.push('workbench sourceReviewSequencerCountsTowardGate does not match sequencer');
if (summary.sourceReviewSequencerNextLane !== (sourceReviewSequencer?.summary?.nextLane ?? 'none')) failures.push('workbench sourceReviewSequencerNextLane does not match sequencer');
if (summary.sourceReviewSequencerNextTarget !== (sourceReviewSequencer?.summary?.nextTarget ?? 'none')) failures.push('workbench sourceReviewSequencerNextTarget does not match sequencer');
if ((sourceReviewSequencer?.summary?.totalCandidates ?? -1) !== (sourceApprovalRunway?.summary?.candidates ?? -2)) failures.push('source review sequencer must match source approval runway count');
if ((sourceReviewSequencer?.summary?.validNoopReplacements ?? -1) !== (sourceCriticRegenerationHealth?.summary?.validNoopReplacements ?? -2)) failures.push('source review sequencer no-op count must match critic health');
if (!html.includes('Source Review Sequencer')) failures.push('workbench html missing Source Review Sequencer card');
if (!html.includes('source-candidates/source-review-sequencer.html')) failures.push('workbench html missing source review sequencer link');
if (!htmlIncludes('npm run source:review-sequencer && npm run source:review-sequencer-check && npm run source:review-sequencer:serve-smoke')) failures.push('workbench html missing source review sequencer command');
if (!html.includes('deterministic lanes')) failures.push('workbench html missing source review sequencer lane copy');
if (!html.includes('dry-run-only source decisions')) failures.push('workbench html missing source review sequencer dry-run copy');
if (summary.sourceReviewTargetPacketTarget !== (sourceReviewTargetPacket?.target?.id ?? 'none')) failures.push('workbench sourceReviewTargetPacketTarget does not match target packet');
if (summary.sourceReviewTargetPacketSpecies !== (sourceReviewTargetPacket?.target?.species ?? 'none')) failures.push('workbench sourceReviewTargetPacketSpecies does not match target packet');
if (summary.sourceReviewTargetPacketLane !== (sourceReviewTargetPacket?.target?.lane ?? 'none')) failures.push('workbench sourceReviewTargetPacketLane does not match target packet');
if (summary.sourceReviewTargetPacketStatus !== (sourceReviewTargetPacket?.target?.status ?? 'none')) failures.push('workbench sourceReviewTargetPacketStatus does not match target packet');
if ((sourceReviewTargetPacket?.target?.id ?? null) !== (sourceReviewSequencer?.summary?.nextTarget ?? null)) failures.push('source review target packet must follow sequencer next target');
if (!html.includes('Source Review Target Packet')) failures.push('workbench html missing Source Review Target Packet card');
if (!html.includes('source-candidates/source-review-target-packet.html')) failures.push('workbench html missing source review target packet link');
if (!htmlIncludes('npm run source:review-target-packet && npm run source:review-target-packet-check && npm run source:review-target-packet:serve-smoke')) failures.push('workbench html missing source review target packet command');
if (!html.includes('One focused packet')) failures.push('workbench html missing source review target packet copy');
if (summary.sourceRegenerationWorkspaceTarget !== (sourceRegenerationWorkspace?.target?.id ?? 'none')) failures.push('workbench sourceRegenerationWorkspaceTarget does not match regeneration workspace');
if (summary.sourceRegenerationWorkspaceSpecies !== (sourceRegenerationWorkspace?.target?.species ?? 'none')) failures.push('workbench sourceRegenerationWorkspaceSpecies does not match regeneration workspace');
if (summary.sourceRegenerationWorkspaceLane !== (sourceRegenerationWorkspace?.target?.lane ?? 'none')) failures.push('workbench sourceRegenerationWorkspaceLane does not match regeneration workspace');
if (summary.sourceRegenerationWorkspaceHealthStatus !== (sourceRegenerationWorkspace?.target?.healthStatus ?? 'none')) failures.push('workbench sourceRegenerationWorkspaceHealthStatus does not match regeneration workspace');
if (Boolean(summary.sourceRegenerationWorkspaceNoop) !== Boolean(sourceRegenerationWorkspace?.target?.replacementMatchesCurrentSource)) failures.push('workbench sourceRegenerationWorkspaceNoop does not match regeneration workspace');
if (Boolean(summary.sourceRegenerationWorkspaceDistinctReady) !== Boolean(sourceRegenerationWorkspace?.target?.distinctReplacementReady)) failures.push('workbench sourceRegenerationWorkspaceDistinctReady does not match regeneration workspace');
if ((sourceRegenerationWorkspace?.target?.id ?? null) !== (sourceReviewSequencer?.summary?.nextTarget ?? null)) failures.push('source regeneration workspace must follow sequencer next target');
if (!html.includes('Source Regeneration Workspace')) failures.push('workbench html missing Source Regeneration Workspace card');
if (!html.includes('source-candidates/source-regeneration-workspace.html')) failures.push('workbench html missing source regeneration workspace link');
if (!htmlIncludes('npm run source:regeneration-workspace && npm run source:regeneration-workspace-check && npm run source:regeneration-workspace:serve-smoke')) failures.push('workbench html missing source regeneration workspace command');
if (!html.includes('Focused replacement workspace')) failures.push('workbench html missing source regeneration workspace copy');
if (!html.includes('no-op replacement')) failures.push('workbench html missing source regeneration no-op copy');
if ((summary.sourceCohesionReviewCandidates ?? 0) !== (sourceCohesionReview?.summary?.candidates ?? 0)) failures.push('workbench sourceCohesionReviewCandidates does not match source cohesion review');
if ((summary.sourceCohesionReviewReady ?? 0) !== (sourceCohesionReview?.summary?.readyForCohesionReview ?? 0)) failures.push('workbench sourceCohesionReviewReady does not match source cohesion review');
if ((summary.sourceCohesionReviewApproved ?? 0) !== (sourceCohesionReview?.summary?.humanCohesionApproved ?? 0)) failures.push('workbench sourceCohesionReviewApproved does not match source cohesion review');
if ((summary.sourceCohesionReviewPrototypeLocked ?? 0) !== (sourceCohesionReview?.summary?.prototypeLocked ?? 0)) failures.push('workbench sourceCohesionReviewPrototypeLocked does not match source cohesion review');
if ((summary.sourceCohesionReviewEvidenceComplete ?? 0) !== (sourceCohesionReview?.summary?.reviewEvidenceComplete ?? 0)) failures.push('workbench sourceCohesionReviewEvidenceComplete does not match source cohesion review');
if (!html.includes('Source Cohesion Review')) failures.push('workbench html missing Source Cohesion Review card');
if (!html.includes('source-candidates/source-cohesion-review.html')) failures.push('workbench html missing source cohesion review link');
if (!htmlIncludes('npm run source:cohesion-review && npm run source:cohesion-review-check')) failures.push('workbench html missing source cohesion review command');
if ((summary.sourceCohesionDecisionTemplateCandidates ?? 0) !== (sourceCohesionDecisions?.summary?.candidates ?? 0)) failures.push('workbench sourceCohesionDecisionTemplateCandidates does not match source cohesion decisions');
if ((summary.sourceCohesionDecisionTemplateReady ?? 0) !== (sourceCohesionDecisions?.summary?.readyForCohesionReview ?? 0)) failures.push('workbench sourceCohesionDecisionTemplateReady does not match source cohesion decisions');
if ((summary.sourceCohesionDecisionTemplatePrototypeLocked ?? 0) !== (sourceCohesionDecisions?.summary?.prototypeLocked ?? 0)) failures.push('workbench sourceCohesionDecisionTemplatePrototypeLocked does not match source cohesion decisions');
if ((summary.sourceCohesionDecisionRunDecisions ?? 0) !== (sourceCohesionDecisionRun?.decisions ?? 0)) failures.push('workbench sourceCohesionDecisionRunDecisions does not match source cohesion decision run');
if ((summary.sourceCohesionDecisionRunApproved ?? 0) !== (sourceCohesionDecisionRun?.approved ?? 0)) failures.push('workbench sourceCohesionDecisionRunApproved does not match source cohesion decision run');
if ((summary.sourceCohesionDecisionRunRejected ?? 0) !== (sourceCohesionDecisionRun?.rejected ?? 0)) failures.push('workbench sourceCohesionDecisionRunRejected does not match source cohesion decision run');
if ((summary.sourceCohesionDecisionRunPending ?? 0) !== (sourceCohesionDecisionRun?.pending ?? 0)) failures.push('workbench sourceCohesionDecisionRunPending does not match source cohesion decision run');
if ((summary.sourceCohesionDecisionRunFailures ?? 0) !== (sourceCohesionDecisionRun?.failures?.length ?? 0)) failures.push('workbench sourceCohesionDecisionRunFailures does not match source cohesion decision run');
if ((sourceCohesionDecisionRun?.decisions ?? 0) !== (sourceCohesionDecisions?.decisionFileTemplate?.decisions?.length ?? -1)) failures.push('source cohesion decision run count does not match decision template');
if (!html.includes('Source Cohesion Batch Decisions')) failures.push('workbench html missing Source Cohesion Batch Decisions card');
if (!html.includes('source-candidates/source-cohesion-decision-template.html')) failures.push('workbench html missing source cohesion decision template link');
if (!html.includes('source approval batch-decision fields')) failures.push('workbench html missing source approval batch-decision wording');
if (!htmlIncludes('npm run source:approval-decisions && npm run source:approval-decisions-check')) failures.push('workbench html missing source approval decisions command');
if (!htmlIncludes('npm run source:approval-decisions-workspace-smoke')) failures.push('workbench html missing source approval decisions workspace smoke command');
if (!htmlIncludes('npm run source:approval-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict')) failures.push('workbench html missing reviewed-only strict source approval decisions dry-run command');
if (htmlIncludes('npm run source:approval-decisions-apply -- --decisions water9-source-cohesion-decisions.json --strict')) failures.push('workbench html must not advertise generic source approval decisions file');
if (!html.includes('latest dry-run report')) failures.push('workbench html missing source cohesion decision run report wording');
if ((summary.sourceQuickReviews ?? 0) !== (sourceQuickReviews?.summary?.reviews ?? 0)) failures.push('workbench sourceQuickReviews does not match quick review index');
if ((summary.sourceQuickReviewsReady ?? 0) !== (sourceQuickReviews?.summary?.readyForHumanReview ?? 0)) failures.push('workbench sourceQuickReviewsReady does not match quick review index');
if (!html.includes('focused quick-review pages')) failures.push('workbench html missing source quick-review copy');
if ((summary.readinessTargetThreats ?? 0) !== (contentReadiness?.summary?.targetThreats ?? 0)) failures.push('workbench readinessTargetThreats does not match content readiness');
if ((summary.readinessAcceptedThreats ?? 0) !== (contentReadiness?.summary?.acceptedThreats ?? 0)) failures.push('workbench readinessAcceptedThreats does not match content readiness');
if ((summary.readinessSourceImages ?? 0) !== (contentReadiness?.summary?.sourceImages ?? 0)) failures.push('workbench readinessSourceImages does not match content readiness');
if ((summary.readinessSourceMechanicallyReadyForHumanReview ?? 0) !== (contentReadiness?.summary?.sourceMechanicallyReadyForHumanReview ?? 0)) failures.push('workbench readinessSourceMechanicallyReadyForHumanReview does not match content readiness');
if ((summary.readinessSourceApprovalReady ?? 0) !== (contentReadiness?.summary?.sourceApprovalReady ?? 0)) failures.push('workbench readinessSourceApprovalReady does not match content readiness');
if ((summary.readinessSourceCriticRegenerationRequired ?? 0) !== (contentReadiness?.summary?.sourceCriticRegenerationRequired ?? 0)) failures.push('workbench readinessSourceCriticRegenerationRequired does not match content readiness');
if ((summary.readinessSourceCriticRegenerationQueued ?? 0) !== (contentReadiness?.summary?.sourceCriticRegenerationQueued ?? 0)) failures.push('workbench readinessSourceCriticRegenerationQueued does not match content readiness');
if ((summary.readinessApprovedSources ?? 0) !== (contentReadiness?.summary?.approvedSources ?? 0)) failures.push('workbench readinessApprovedSources does not match content readiness');
if (summary.readinessNextBottleneck !== contentReadiness?.summary?.nextBottleneck) failures.push('workbench readinessNextBottleneck does not match content readiness');
if (!html.includes('source candidates approval-ready')) failures.push('workbench html missing content readiness approval-ready copy');
if (!html.includes('require critic regeneration')) failures.push('workbench html missing content readiness critic regeneration copy');
if ((summary.acceptanceRunwayCandidates ?? 0) !== (acceptanceRunway?.summary?.candidates ?? 0)) failures.push('workbench acceptanceRunwayCandidates does not match acceptance runway');
if ((summary.acceptanceRunwayRuntimeRegistered ?? 0) !== (acceptanceRunway?.summary?.runtimeRegistered ?? 0)) failures.push('workbench acceptanceRunwayRuntimeRegistered does not match acceptance runway');
if ((summary.acceptanceRunwayUnmappedPrototypes ?? 0) !== (acceptanceRunway?.summary?.unmappedPrototypeThreats ?? 0)) failures.push('workbench acceptanceRunwayUnmappedPrototypes does not match acceptance runway');
const acceptanceCandidatePackets = (acceptanceRunway?.items ?? []).filter((item) => item.acceptancePacket?.file).length;
const acceptanceUnmappedPackets = (acceptanceRunway?.unmappedPrototypeThreats ?? []).filter((item) => item.packet?.file).length;
if ((summary.acceptanceRunwayCandidatePackets ?? 0) !== acceptanceCandidatePackets) failures.push('workbench acceptanceRunwayCandidatePackets does not match acceptance runway');
if ((summary.acceptanceRunwayUnmappedPrototypePackets ?? 0) !== acceptanceUnmappedPackets) failures.push('workbench acceptanceRunwayUnmappedPrototypePackets does not match acceptance runway');
if (!html.includes('packetized paths')) failures.push('workbench html missing packetized acceptance runway wording');
if ((summary.acceptanceAuditIndexTargetThreats ?? 0) !== (acceptanceAuditIndex?.summary?.targetThreats ?? 0)) failures.push('workbench acceptanceAuditIndexTargetThreats does not match acceptance audit index');
if ((summary.acceptanceAuditIndexAuditedThreats ?? 0) !== (acceptanceAuditIndex?.summary?.auditedThreats ?? 0)) failures.push('workbench acceptanceAuditIndexAuditedThreats does not match acceptance audit index');
if ((summary.acceptanceAuditIndexSourceMechanicalReady ?? 0) !== (acceptanceAuditIndex?.summary?.sourceMechanicalReady ?? 0)) failures.push('workbench acceptanceAuditIndexSourceMechanicalReady does not match acceptance audit index');
if ((summary.acceptanceAuditIndexThreatMechanicalReady ?? 0) !== (acceptanceAuditIndex?.summary?.threatMechanicalReady ?? 0)) failures.push('workbench acceptanceAuditIndexThreatMechanicalReady does not match acceptance audit index');
if ((summary.acceptanceAuditIndexCountsTowardGate ?? 0) !== (acceptanceAuditIndex?.summary?.countsTowardGate ?? 0)) failures.push('workbench acceptanceAuditIndexCountsTowardGate does not match acceptance audit index');
if (Boolean(summary.acceptanceAuditIndexStrictGateComplete) !== Boolean(acceptanceAuditIndex?.summary?.strictGateComplete)) failures.push('workbench acceptanceAuditIndexStrictGateComplete does not match acceptance audit index');
if (summary.acceptanceAuditIndexNextGate !== (acceptanceAuditIndex?.summary?.nextGate ?? 'unknown')) failures.push('workbench acceptanceAuditIndexNextGate does not match acceptance audit index');
if (!html.includes('Batch Acceptance Audit')) failures.push('workbench html missing Batch Acceptance Audit card');
if (!html.includes('content-acceptance-audits/index.html')) failures.push('workbench html missing acceptance audit index link');
if (!htmlIncludes('npm run content:acceptance-audit-index && npm run content:acceptance-audit-index-check')) failures.push('workbench html missing acceptance audit index command');
if (!html.includes('strict per-threat audits')) failures.push('workbench html missing batch acceptance audit copy');
if ((summary.reviewEvidenceSourceCandidates ?? 0) !== (reviewEvidenceMatrix?.summary?.sourceCandidates ?? 0)) failures.push('workbench reviewEvidenceSourceCandidates does not match review evidence matrix');
if ((summary.reviewEvidenceSourceImages ?? 0) !== (reviewEvidenceMatrix?.summary?.sourceImages ?? 0)) failures.push('workbench reviewEvidenceSourceImages does not match review evidence matrix');
if ((summary.reviewEvidenceSourceApproved ?? 0) !== (reviewEvidenceMatrix?.summary?.sourceApproved ?? 0)) failures.push('workbench reviewEvidenceSourceApproved does not match review evidence matrix');
if ((summary.reviewEvidenceRuntimeMappedCandidates ?? 0) !== (reviewEvidenceMatrix?.summary?.runtimeMappedCandidates ?? 0)) failures.push('workbench reviewEvidenceRuntimeMappedCandidates does not match review evidence matrix');
if ((summary.reviewEvidenceUnmappedPrototypeThreats ?? 0) !== (reviewEvidenceMatrix?.summary?.unmappedPrototypeThreats ?? 0)) failures.push('workbench reviewEvidenceUnmappedPrototypeThreats does not match review evidence matrix');
if ((summary.reviewEvidenceMechanicallyCompleteMappedRigs ?? 0) !== (reviewEvidenceMatrix?.summary?.mechanicallyCompleteMappedRigs ?? 0)) failures.push('workbench reviewEvidenceMechanicallyCompleteMappedRigs does not match review evidence matrix');
if ((summary.reviewEvidenceAcceptedThreats ?? 0) !== (reviewEvidenceMatrix?.summary?.acceptedThreats ?? 0)) failures.push('workbench reviewEvidenceAcceptedThreats does not match review evidence matrix');
if (summary.reviewEvidenceNextHumanGate !== (reviewEvidenceMatrix?.summary?.nextHumanGate ?? 'unknown')) failures.push('workbench reviewEvidenceNextHumanGate does not match review evidence matrix');
if (!html.includes('Review Evidence Matrix')) failures.push('workbench html missing Review Evidence Matrix card');
if (!html.includes('content-review-evidence-matrix.html')) failures.push('workbench html missing review evidence matrix link');
if (!htmlIncludes('npm run content:review-evidence && npm run content:review-evidence-check')) failures.push('workbench html missing review evidence matrix command');
if ((summary.reviewCockpitPages ?? 0) !== (reviewCockpit?.summary?.candidates ?? 0)) failures.push('workbench reviewCockpitPages does not match review cockpit');
if ((summary.reviewCockpitRuntimeMappedCandidates ?? 0) !== (reviewCockpit?.summary?.runtimeMappedCandidates ?? 0)) failures.push('workbench reviewCockpitRuntimeMappedCandidates does not match review cockpit');
if ((summary.reviewCockpitUnmappedPrototypeThreats ?? 0) !== (reviewCockpit?.summary?.unmappedPrototypeThreats ?? 0)) failures.push('workbench reviewCockpitUnmappedPrototypeThreats does not match review cockpit');
if ((summary.reviewCockpitAcceptedThreats ?? 0) !== (reviewCockpit?.summary?.acceptedThreats ?? 0)) failures.push('workbench reviewCockpitAcceptedThreats does not match review cockpit');
if (!html.includes('Candidate Review Cockpit')) failures.push('workbench html missing Candidate Review Cockpit card');
if (!html.includes('content-review-cockpit/index.html')) failures.push('workbench html missing review cockpit link');
if (!htmlIncludes('npm run content:review-cockpit && npm run content:review-cockpit-check')) failures.push('workbench html missing review cockpit command');
if ((summary.acceptanceDoctorCandidates ?? 0) !== (acceptanceDoctor?.summary?.candidates ?? 0)) failures.push('workbench acceptanceDoctorCandidates does not match acceptance doctor');
if ((summary.acceptanceDoctorSourceBlocked ?? 0) !== (acceptanceDoctor?.summary?.sourceBlocked ?? 0)) failures.push('workbench acceptanceDoctorSourceBlocked does not match acceptance doctor');
if ((summary.acceptanceDoctorRuntimeBlocked ?? 0) !== (acceptanceDoctor?.summary?.runtimeBlocked ?? 0)) failures.push('workbench acceptanceDoctorRuntimeBlocked does not match acceptance doctor');
if ((summary.acceptanceDoctorAcceptanceBlocked ?? 0) !== (acceptanceDoctor?.summary?.acceptanceBlocked ?? 0)) failures.push('workbench acceptanceDoctorAcceptanceBlocked does not match acceptance doctor');
if ((summary.acceptanceDoctorMissingRuntime ?? 0) !== (acceptanceDoctor?.summary?.missingRuntime ?? 0)) failures.push('workbench acceptanceDoctorMissingRuntime does not match acceptance doctor');
if (summary.acceptanceDoctorNextBottleneck !== acceptanceDoctor?.summary?.nextBottleneck) failures.push('workbench acceptanceDoctorNextBottleneck does not match acceptance doctor');
if (!html.includes('Acceptance Doctor')) failures.push('workbench html missing Acceptance Doctor card');
if (!html.includes('content-acceptance-doctor.html')) failures.push('workbench html missing acceptance doctor link');
if (!htmlIncludes('npm run content:acceptance-doctor && npm run content:acceptance-doctor-check')) failures.push('workbench html missing acceptance doctor command');
if ((summary.threatAcceptanceDecisionRigs ?? 0) !== (threatAcceptanceDecisions?.summary?.registeredRigs ?? 0)) failures.push('workbench threatAcceptanceDecisionRigs does not match threat acceptance decisions');
if ((summary.threatAcceptanceDecisionAccepted ?? 0) !== (threatAcceptanceDecisions?.summary?.accepted ?? 0)) failures.push('workbench threatAcceptanceDecisionAccepted does not match threat acceptance decisions');
if ((summary.threatAcceptanceDecisionNeedsReview ?? 0) !== (threatAcceptanceDecisions?.summary?.needsReview ?? 0)) failures.push('workbench threatAcceptanceDecisionNeedsReview does not match threat acceptance decisions');
if ((summary.threatAcceptanceDecisionRunDecisions ?? 0) !== (threatAcceptanceDecisionRun?.decisions ?? 0)) failures.push('workbench threatAcceptanceDecisionRunDecisions does not match threat acceptance decision run');
if ((summary.threatAcceptanceDecisionRunAccepted ?? 0) !== (threatAcceptanceDecisionRun?.accepted ?? 0)) failures.push('workbench threatAcceptanceDecisionRunAccepted does not match threat acceptance decision run');
if ((summary.threatAcceptanceDecisionRunPrototype ?? 0) !== (threatAcceptanceDecisionRun?.prototype ?? 0)) failures.push('workbench threatAcceptanceDecisionRunPrototype does not match threat acceptance decision run');
if ((summary.threatAcceptanceDecisionRunPending ?? 0) !== (threatAcceptanceDecisionRun?.pending ?? 0)) failures.push('workbench threatAcceptanceDecisionRunPending does not match threat acceptance decision run');
if ((summary.threatAcceptanceDecisionRunFailures ?? 0) !== (threatAcceptanceDecisionRun?.failures?.length ?? 0)) failures.push('workbench threatAcceptanceDecisionRunFailures does not match threat acceptance decision run');
if (!html.includes('Threat Acceptance Decisions')) failures.push('workbench html missing Threat Acceptance Decisions card');
if (!html.includes('content-threat-acceptance-decision-template.html')) failures.push('workbench html missing threat acceptance decision template link');
if (!htmlIncludes('npm run content:threat-decisions && npm run content:threat-decisions-check')) failures.push('workbench html missing threat acceptance decisions command');
if (!htmlIncludes('npm run content:threat-decisions-workspace-smoke')) failures.push('workbench html missing threat acceptance workspace smoke command');
if (!htmlIncludes('npm run content:threat-decisions-apply')) failures.push('workbench html missing threat acceptance decisions apply command');
if ((summary.approvedRuntimeHandoffMissingRuntime ?? 0) !== (approvedRuntimeHandoff?.summary?.missingRuntime ?? 0)) failures.push('workbench approvedRuntimeHandoffMissingRuntime does not match handoff');
if ((summary.approvedRuntimeHandoffApprovedMissingRuntime ?? 0) !== (approvedRuntimeHandoff?.summary?.approvedSourcesMissingRuntime ?? 0)) failures.push('workbench approvedRuntimeHandoffApprovedMissingRuntime does not match handoff');
if ((summary.approvedRuntimeHandoffEligible ?? 0) !== (approvedRuntimeHandoff?.summary?.productionEligible ?? 0)) failures.push('workbench approvedRuntimeHandoffEligible does not match handoff');
if ((summary.approvedRuntimeHandoffRiggingEligibleOnly ?? 0) !== (approvedRuntimeHandoff?.summary?.riggingEligibleOnly ?? approvedRuntimeHandoff?.summary?.productionEligible ?? 0)) failures.push('workbench approvedRuntimeHandoffRiggingEligibleOnly does not match handoff');
if ((summary.approvedRuntimeHandoffBlockedUntilSourceApproval ?? 0) !== (approvedRuntimeHandoff?.summary?.blockedUntilSourceApproval ?? 0)) failures.push('workbench approvedRuntimeHandoffBlockedUntilSourceApproval does not match handoff');
if (!html.includes('Approved Source Runtime Handoff')) failures.push('workbench html missing Approved Source Runtime Handoff card');
if (!html.includes('content-approved-runtime-handoff.html')) failures.push('workbench html missing approved runtime handoff link');
if (!htmlIncludes('npm run content:approved-runtime-handoff && npm run content:approved-runtime-handoff-check')) failures.push('workbench html missing approved runtime handoff command');
if ((summary.planCoverageCandidates ?? 0) !== (planCoverage?.summary?.candidates ?? 0)) failures.push('workbench planCoverageCandidates does not match plan coverage');
if ((summary.planCoveragePlanArtifacts ?? 0) !== (planCoverage?.summary?.planArtifacts ?? 0)) failures.push('workbench planCoveragePlanArtifacts does not match plan coverage');
if ((summary.planCoveragePlanPreviews ?? 0) !== (planCoverage?.summary?.planPreviews ?? 0)) failures.push('workbench planCoveragePlanPreviews does not match plan coverage');
if ((summary.planCoverageMissingPlanArtifacts ?? 0) !== (planCoverage?.summary?.missingPlanArtifacts ?? 0)) failures.push('workbench planCoverageMissingPlanArtifacts does not match plan coverage');
if ((summary.planCoverageMissingPlanPreviews ?? 0) !== (planCoverage?.summary?.missingPlanPreviews ?? 0)) failures.push('workbench planCoverageMissingPlanPreviews does not match plan coverage');
if (!html.includes('Plan Coverage')) failures.push('workbench html missing Plan Coverage card');
if (!html.includes('content-plan-coverage.html')) failures.push('workbench html missing plan coverage link');
if (!htmlIncludes('npm run content:plan-coverage && npm run content:plan-coverage-check')) failures.push('workbench html missing plan coverage command');
if ((summary.verticalSliceThreats ?? 0) !== (verticalSlice?.summary?.threats ?? 0)) failures.push('workbench verticalSliceThreats does not match vertical slice runway');
if ((summary.verticalSliceMechanicallyReviewable ?? 0) !== (verticalSlice?.summary?.mechanicallyReviewable ?? 0)) failures.push('workbench verticalSliceMechanicallyReviewable does not match vertical slice runway');
if ((summary.verticalSliceAcceptedThreats ?? 0) !== (verticalSlice?.summary?.acceptedThreats ?? 0)) failures.push('workbench verticalSliceAcceptedThreats does not match vertical slice runway');
if (summary.verticalSliceNextBlocker !== (verticalSlice?.summary?.nextBlocker ?? 'unknown')) failures.push('workbench verticalSliceNextBlocker does not match vertical slice runway');
const verticalSliceRuntimeVisualEvidence = (verticalSlice?.items ?? []).filter((item) => item.runtimeVisual?.ready).length;
const verticalSliceRigQualityEvidence = (verticalSlice?.items ?? []).filter((item) => item.rigQuality?.ready).length;
const verticalSliceAcceptanceAudits = (verticalSlice?.items ?? []).filter((item) => item.audit?.ready).length;
if ((summary.verticalSliceRigQualityEvidence ?? 0) !== verticalSliceRigQualityEvidence) failures.push('workbench verticalSliceRigQualityEvidence does not match vertical slice runway');
if ((summary.verticalSliceRuntimeVisualEvidence ?? 0) !== verticalSliceRuntimeVisualEvidence) failures.push('workbench verticalSliceRuntimeVisualEvidence does not match vertical slice runway');
if ((summary.verticalSliceAcceptanceAudits ?? 0) !== verticalSliceAcceptanceAudits) failures.push('workbench verticalSliceAcceptanceAudits does not match vertical slice runway');
if (!html.includes('Vertical Slice Runway')) failures.push('workbench html missing Vertical Slice Runway card');
if (!html.includes('content-vertical-slice-runway.html')) failures.push('workbench html missing vertical slice runway link');
if (!htmlIncludes('npm run content:vertical-slice && npm run content:vertical-slice-check')) failures.push('workbench html missing vertical slice runway command');
if (!html.includes('contract-source-key-plan-rig-quality-runtime-visual-audit route')) failures.push('workbench html missing vertical slice route copy');
if (!html.includes('contact, phase, source-parity, and cohesion evidence')) failures.push('workbench html missing vertical slice rig-quality copy');
if ((summary.humanSignoffTargetThreats ?? 0) !== (humanSignoff?.summary?.targetThreats ?? 0)) failures.push('workbench humanSignoffTargetThreats does not match sign-off queue');
if ((summary.humanSignoffReadyForSourceSignoff ?? 0) !== (humanSignoff?.summary?.readyForSourceSignoff ?? 0)) failures.push('workbench humanSignoffReadyForSourceSignoff does not match sign-off queue');
if ((summary.humanSignoffSourceRegenerationRequired ?? 0) !== (humanSignoff?.summary?.sourceRegenerationRequired ?? 0)) failures.push('workbench humanSignoffSourceRegenerationRequired does not match sign-off queue');
if ((summary.humanSignoffSourceBlockedBeforeSignoff ?? 0) !== (humanSignoff?.summary?.sourceBlockedBeforeSignoff ?? 0)) failures.push('workbench humanSignoffSourceBlockedBeforeSignoff does not match sign-off queue');
if ((summary.humanSignoffReadyForThreatSignoff ?? 0) !== (humanSignoff?.summary?.readyForThreatSignoff ?? 0)) failures.push('workbench humanSignoffReadyForThreatSignoff does not match sign-off queue');
if ((summary.humanSignoffAcceptedThreats ?? 0) !== (humanSignoff?.summary?.acceptedThreats ?? 0)) failures.push('workbench humanSignoffAcceptedThreats does not match sign-off queue');
if (summary.humanSignoffNextGate !== (humanSignoff?.summary?.nextGate ?? 'unknown')) failures.push('workbench humanSignoffNextGate does not match sign-off queue');
if (!html.includes('Human Sign-Off Queue')) failures.push('workbench html missing Human Sign-Off Queue card');
if (!html.includes('content-human-signoff-queue.html')) failures.push('workbench html missing human sign-off queue link');
if (!htmlIncludes('npm run content:human-signoff && npm run content:human-signoff-check')) failures.push('workbench html missing human sign-off queue command');
if (!html.includes('ready for human source sign-off')) failures.push('workbench html missing human sign-off queue copy');
if ((summary.humanAdjudicationItems ?? 0) !== (humanAdjudicationBoard?.summary?.items ?? 0)) failures.push('workbench humanAdjudicationItems does not match human adjudication board');
if ((summary.humanAdjudicationSourceReady ?? 0) !== (humanAdjudicationBoard?.summary?.sourceReady ?? 0)) failures.push('workbench humanAdjudicationSourceReady does not match human adjudication board');
if ((summary.humanAdjudicationSourceApprovalReady ?? 0) !== (humanAdjudicationBoard?.summary?.sourceApprovalReady ?? 0)) failures.push('workbench humanAdjudicationSourceApprovalReady does not match human adjudication board');
if ((summary.humanAdjudicationSourceCriticRegenerationRequired ?? 0) !== (humanAdjudicationBoard?.summary?.sourceCriticRegenerationRequired ?? 0)) failures.push('workbench humanAdjudicationSourceCriticRegenerationRequired does not match human adjudication board');
if ((summary.humanAdjudicationThreatReady ?? 0) !== (humanAdjudicationBoard?.summary?.threatReady ?? 0)) failures.push('workbench humanAdjudicationThreatReady does not match human adjudication board');
if ((summary.humanAdjudicationAllMediaPresent ?? 0) !== (humanAdjudicationBoard?.summary?.allMediaPresent ?? 0)) failures.push('workbench humanAdjudicationAllMediaPresent does not match human adjudication board');
if ((summary.humanAdjudicationSourceApprovalCommands ?? 0) !== (humanAdjudicationBoard?.summary?.sourceApprovalCommands ?? 0)) failures.push('workbench humanAdjudicationSourceApprovalCommands does not match human adjudication board');
if ((summary.humanAdjudicationThreatAcceptanceCommands ?? 0) !== (humanAdjudicationBoard?.summary?.threatAcceptanceCommands ?? 0)) failures.push('workbench humanAdjudicationThreatAcceptanceCommands does not match human adjudication board');
if ((summary.humanAdjudicationSourcePreviewBoundaries ?? 0) !== (humanAdjudicationBoard?.summary?.sourcePreviewBoundaries ?? 0)) failures.push('workbench humanAdjudicationSourcePreviewBoundaries does not match human adjudication board');
if ((summary.humanAdjudicationRuntimePreviewBoundaries ?? 0) !== (humanAdjudicationBoard?.summary?.runtimePreviewBoundaries ?? 0)) failures.push('workbench humanAdjudicationRuntimePreviewBoundaries does not match human adjudication board');
if ((summary.humanAdjudicationPreviewOnlySources ?? 0) !== (humanAdjudicationBoard?.summary?.previewOnlySources ?? 0)) failures.push('workbench humanAdjudicationPreviewOnlySources does not match human adjudication board');
if ((summary.humanAdjudicationPreviewOnlyRuntimes ?? 0) !== (humanAdjudicationBoard?.summary?.previewOnlyRuntimes ?? 0)) failures.push('workbench humanAdjudicationPreviewOnlyRuntimes does not match human adjudication board');
if (!html.includes('Human Adjudication Board')) failures.push('workbench html missing Human Adjudication Board card');
if (!html.includes('content-human-adjudication-board.html')) failures.push('workbench html missing human adjudication board link');
if (!htmlIncludes('npm run content:human-adjudication-board && npm run content:human-adjudication-board-check')) failures.push('workbench html missing human adjudication board command');
if (!html.includes('source-ready after')) failures.push('workbench html missing human adjudication board copy');
if ((summary.contentReviewSessionItems ?? 0) !== (contentReviewSession?.summary?.items ?? 0)) failures.push('workbench contentReviewSessionItems does not match content review session');
if ((summary.contentReviewSessionSourceReady ?? 0) !== (contentReviewSession?.summary?.sourceReady ?? 0)) failures.push('workbench contentReviewSessionSourceReady does not match content review session');
if ((summary.contentReviewSessionSourceApprovalReady ?? 0) !== (contentReviewSession?.summary?.sourceApprovalReady ?? 0)) failures.push('workbench contentReviewSessionSourceApprovalReady does not match content review session');
if ((summary.contentReviewSessionSourceCriticRegenerationRequired ?? 0) !== (contentReviewSession?.summary?.sourceCriticRegenerationRequired ?? 0)) failures.push('workbench contentReviewSessionSourceCriticRegenerationRequired does not match content review session');
if ((summary.contentReviewSessionThreatReady ?? 0) !== (contentReviewSession?.summary?.threatReady ?? 0)) failures.push('workbench contentReviewSessionThreatReady does not match content review session');
if ((summary.contentReviewSessionAllMediaPresent ?? 0) !== (contentReviewSession?.summary?.allMediaPresent ?? 0)) failures.push('workbench contentReviewSessionAllMediaPresent does not match content review session');
if ((summary.contentReviewSessionSourcePreviewBoundaries ?? 0) !== (contentReviewSession?.summary?.sourcePreviewBoundaries ?? 0)) failures.push('workbench contentReviewSessionSourcePreviewBoundaries does not match content review session');
if ((summary.contentReviewSessionRuntimePreviewBoundaries ?? 0) !== (contentReviewSession?.summary?.runtimePreviewBoundaries ?? 0)) failures.push('workbench contentReviewSessionRuntimePreviewBoundaries does not match content review session');
if ((summary.contentReviewSessionPreviewOnlySources ?? 0) !== (contentReviewSession?.summary?.previewOnlySources ?? 0)) failures.push('workbench contentReviewSessionPreviewOnlySources does not match content review session');
if ((summary.contentReviewSessionPreviewOnlyRuntimes ?? 0) !== (contentReviewSession?.summary?.previewOnlyRuntimes ?? 0)) failures.push('workbench contentReviewSessionPreviewOnlyRuntimes does not match content review session');
if ((summary.contentReviewSessionSourceChecks ?? 0) !== (contentReviewSession?.summary?.sourceChecks ?? 0)) failures.push('workbench contentReviewSessionSourceChecks does not match content review session');
if ((summary.contentReviewSessionThreatChecks ?? 0) !== (contentReviewSession?.summary?.threatChecks ?? 0)) failures.push('workbench contentReviewSessionThreatChecks does not match content review session');
if (!html.includes('Content Review Session')) failures.push('workbench html missing Content Review Session card');
if (!html.includes('content-review-session.html')) failures.push('workbench html missing content review session link');
if (!htmlIncludes('npm run content:review-session && npm run content:review-session-check')) failures.push('workbench html missing content review session command');
if (!html.includes('one session workspace with source and threat decision-file exports')) failures.push('workbench html missing content review session copy');
if ((summary.contentProductionProofCandidates ?? 0) !== (contentProductionProof?.summary?.candidates ?? 0)) failures.push('workbench contentProductionProofCandidates does not match production proof');
if ((summary.contentProductionProofAcceptedThreats ?? 0) !== (contentProductionProof?.summary?.acceptedThreats ?? 0)) failures.push('workbench contentProductionProofAcceptedThreats does not match production proof');
if ((summary.contentProductionProofPrototypeOnly ?? 0) !== (contentProductionProof?.summary?.prototypeOnly ?? 0)) failures.push('workbench contentProductionProofPrototypeOnly does not match production proof');
if ((summary.contentProductionProofHumanReviewRequired ?? 0) !== (contentProductionProof?.summary?.humanReviewRequired ?? 0)) failures.push('workbench contentProductionProofHumanReviewRequired does not match production proof');
if (Boolean(summary.contentProductionProofStrictReady) !== Boolean(contentProductionProof?.summary?.strictProductionReady)) failures.push('workbench contentProductionProofStrictReady does not match production proof');
if (!html.includes('Production Proof')) failures.push('workbench html missing Production Proof card');
if (!html.includes('content-production-proof.html')) failures.push('workbench html missing production proof link');
if (!htmlIncludes('npm run content:production-proof && npm run content:production-proof-check')) failures.push('workbench html missing production proof command');
if (!html.includes('remain prototype-only')) failures.push('workbench html missing production proof copy');
if ((summary.contentPromoteApprovedThreatsItems ?? 0) !== (contentPromoteApprovedThreats?.summary?.items ?? 0)) failures.push('workbench contentPromoteApprovedThreatsItems does not match promote runway');
if ((summary.contentPromoteApprovedThreatsSourceApproved ?? 0) !== (contentPromoteApprovedThreats?.summary?.sourceApproved ?? 0)) failures.push('workbench contentPromoteApprovedThreatsSourceApproved does not match promote runway');
if ((summary.contentPromoteApprovedThreatsReady ?? 0) !== (contentPromoteApprovedThreats?.summary?.readyForThreatDecision ?? 0)) failures.push('workbench contentPromoteApprovedThreatsReady does not match promote runway');
if ((summary.contentPromoteApprovedThreatsExcluded ?? 0) !== (contentPromoteApprovedThreats?.summary?.excludedNonTargetRigs ?? 0)) failures.push('workbench contentPromoteApprovedThreatsExcluded does not match promote runway');
if (!html.includes('Promote Approved Threats')) failures.push('workbench html missing Promote Approved Threats card');
if (!html.includes('content-promote-approved-threats.html')) failures.push('workbench html missing promote approved threats link');
if (!htmlIncludes('npm run content:promote-approved-threats && npm run content:promote-approved-threats-check')) failures.push('workbench html missing promote approved threats command');
if (!html.includes('non-target prototype rigs are excluded')) failures.push('workbench html missing promote approved threats copy');
if (Boolean(summary.contentGoalAuditComplete) !== Boolean(contentGoalAudit?.complete)) failures.push('workbench contentGoalAuditComplete does not match goal audit');
if (Boolean(summary.contentGoalAuditStrictGoalComplete) !== Boolean(contentGoalAudit?.strictGoalComplete)) failures.push('workbench contentGoalAuditStrictGoalComplete does not match goal audit');
if ((summary.contentGoalAuditRequirements ?? 0) !== (contentGoalAudit?.requirements?.length ?? 0)) failures.push('workbench contentGoalAuditRequirements does not match goal audit');
if ((summary.contentGoalAuditPassedRequirements ?? 0) !== (contentGoalAudit?.requirements ?? []).filter((item) => item.status === 'passed').length) failures.push('workbench contentGoalAuditPassedRequirements does not match goal audit');
if ((summary.contentGoalAuditAcceptedThreats ?? 0) !== (contentGoalAudit?.summary?.acceptedThreats ?? 0)) failures.push('workbench contentGoalAuditAcceptedThreats does not match goal audit');
if ((summary.contentGoalAuditTargetThreats ?? 0) !== (contentGoalAudit?.summary?.targetThreats ?? 0)) failures.push('workbench contentGoalAuditTargetThreats does not match goal audit');
if ((summary.contentGoalAuditVisualRegenerationGateCredit ?? 0) !== (contentGoalAudit?.summary?.visualRegenerationGateCredit ?? 0)) failures.push('workbench contentGoalAuditVisualRegenerationGateCredit does not match goal audit');
if (!html.includes('Content Goal Audit')) failures.push('workbench html missing Content Goal Audit card');
if (!html.includes('content-goal-audit.html')) failures.push('workbench html missing content goal audit link');
if (!htmlIncludes('npm run content:goal-readiness && npm run content:goal-readiness-check')) failures.push('workbench html missing content goal readiness command');
if (!htmlIncludes('npm run content:goal-audit:serve-smoke')) failures.push('workbench html missing content goal audit serve smoke command');
if (!html.includes('Objective hard stop')) failures.push('workbench html missing content goal audit hard-stop copy');
if (summary.runtimeCohesionReviewTarget !== (runtimeCohesionReview?.target?.id ?? null)) failures.push('workbench runtimeCohesionReviewTarget does not match runtime cohesion review');
if (summary.runtimeCohesionReviewSpecies !== (runtimeCohesionReview?.target?.species ?? null)) failures.push('workbench runtimeCohesionReviewSpecies does not match runtime cohesion review');
if (summary.runtimeCohesionReviewNextGate !== (runtimeCohesionReview?.target?.nextGate ?? null)) failures.push('workbench runtimeCohesionReviewNextGate does not match runtime cohesion review');
if ((summary.runtimeCohesionReviewMedia ?? -1) !== (runtimeCohesionReview?.media ?? []).filter((item) => item.present).length) failures.push('workbench runtimeCohesionReviewMedia does not match runtime cohesion review');
if ((summary.runtimeCohesionReviewRequiredMedia ?? -1) !== (runtimeCohesionReview?.media ?? []).length) failures.push('workbench runtimeCohesionReviewRequiredMedia does not match runtime cohesion review');
if ((summary.runtimeCohesionReviewChecks ?? -1) !== (runtimeCohesionReview?.requiredChecks ?? []).length) failures.push('workbench runtimeCohesionReviewChecks does not match runtime cohesion review');
if (!html.includes('Runtime Cohesion Review')) failures.push('workbench html missing Runtime Cohesion Review card');
if (!html.includes('content-runtime-cohesion-review.html')) failures.push('workbench html missing runtime cohesion review link');
if (!htmlIncludes('npm run content:runtime-cohesion-review && npm run content:runtime-cohesion-review-check')) failures.push('workbench html missing runtime cohesion review command');
if (!htmlIncludes('npm run content:runtime-cohesion-review:serve-smoke')) failures.push('workbench html missing runtime cohesion review serve smoke command');
if (!html.includes('Focused in-game cohesion packet')) failures.push('workbench html missing runtime cohesion review copy');
if (cohortCohesionBoard?.schema !== 'water9/content-cohort-cohesion-board@1') failures.push(`unexpected cohort cohesion board schema ${cohortCohesionBoard?.schema ?? 'missing'}`);
if ((summary.cohortCohesionBoardItems ?? 0) !== (cohortCohesionBoard?.summary?.items ?? 0)) failures.push('workbench cohortCohesionBoardItems does not match cohort board');
if ((summary.cohortCohesionBoardTargetThreats ?? 0) !== (cohortCohesionBoard?.summary?.targetThreats ?? 0)) failures.push('workbench cohortCohesionBoardTargetThreats does not match cohort board');
if ((summary.cohortCohesionBoardAcceptedThreats ?? 0) !== (cohortCohesionBoard?.summary?.acceptedThreats ?? 0)) failures.push('workbench cohortCohesionBoardAcceptedThreats does not match cohort board');
if ((summary.cohortCohesionBoardSourceApproved ?? 0) !== (cohortCohesionBoard?.summary?.sourceApproved ?? 0)) failures.push('workbench cohortCohesionBoardSourceApproved does not match cohort board');
if ((summary.cohortCohesionBoardOpenVisualBlockers ?? 0) !== (cohortCohesionBoard?.summary?.openVisualBlockers ?? 0)) failures.push('workbench cohortCohesionBoardOpenVisualBlockers does not match cohort board');
if ((summary.cohortCohesionBoardRiskHigh ?? 0) !== (cohortCohesionBoard?.summary?.riskHigh ?? 0)) failures.push('workbench cohortCohesionBoardRiskHigh does not match cohort board');
if ((summary.cohortCohesionBoardRiskMedium ?? 0) !== (cohortCohesionBoard?.summary?.riskMedium ?? 0)) failures.push('workbench cohortCohesionBoardRiskMedium does not match cohort board');
if (!html.includes('Cohort Cohesion Board')) failures.push('workbench html missing Cohort Cohesion Board card');
if (!html.includes('content-cohort-cohesion-board.html')) failures.push('workbench html missing cohort cohesion board link');
if (!htmlIncludes('npm run content:cohort-cohesion-board && npm run content:cohort-cohesion-board-check')) failures.push('workbench html missing cohort cohesion board command');
if (!htmlIncludes('npm run content:cohort-cohesion-board:serve-smoke')) failures.push('workbench html missing cohort cohesion board serve smoke command');
if (!html.includes('source and runtime evidence together')) failures.push('workbench html missing cohort cohesion board copy');
if (!html.includes('high-risk') || !html.includes('medium-risk')) failures.push('workbench html missing cohort cohesion risk copy');
if ((summary.contentSandboxRosterItems ?? 0) !== (contentSandboxRoster?.summary?.items ?? 0)) failures.push('workbench contentSandboxRosterItems does not match content sandbox roster');
if ((summary.contentSandboxRosterReady ?? 0) !== (contentSandboxRoster?.summary?.sandboxReady ?? 0)) failures.push('workbench contentSandboxRosterReady does not match content sandbox roster');
if ((summary.contentSandboxRosterRuntimePreviews ?? 0) !== (contentSandboxRoster?.summary?.runtimePreviews ?? 0)) failures.push('workbench contentSandboxRosterRuntimePreviews does not match content sandbox roster');
if ((summary.contentSandboxRosterSourcePreviews ?? 0) !== (contentSandboxRoster?.summary?.sourcePreviews ?? 0)) failures.push('workbench contentSandboxRosterSourcePreviews does not match content sandbox roster');
if ((summary.contentSandboxRosterPairedRuntimePreviews ?? 0) !== (contentSandboxRoster?.summary?.pairedRuntimePreviews ?? 0)) failures.push('workbench contentSandboxRosterPairedRuntimePreviews does not match content sandbox roster');
if ((summary.contentSandboxRosterPairedSourcePreviews ?? 0) !== (contentSandboxRoster?.summary?.pairedSourcePreviews ?? 0)) failures.push('workbench contentSandboxRosterPairedSourcePreviews does not match content sandbox roster');
if (!html.includes('Content Sandbox Roster')) failures.push('workbench html missing Content Sandbox Roster card');
if (!html.includes('content-sandbox-roster.html')) failures.push('workbench html missing content sandbox roster link');
if (!htmlIncludes('npm run content:sandbox-roster && npm run content:sandbox-roster-check')) failures.push('workbench html missing content sandbox roster command');
if (!html.includes('target threats have source, runtime, paired-diver preview, and visual-check commands')) failures.push('workbench html missing content sandbox roster copy');
if ((summary.contentArticulationRosterItems ?? 0) !== (contentArticulationRoster?.summary?.items ?? 0)) failures.push('workbench contentArticulationRosterItems does not match content articulation roster');
if ((summary.contentArticulationRosterReady ?? 0) !== (contentArticulationRoster?.summary?.mechanicallyReady ?? 0)) failures.push('workbench contentArticulationRosterReady does not match content articulation roster');
if ((summary.contentArticulationRosterMagentaSources ?? 0) !== (contentArticulationRoster?.summary?.magentaSourceImages ?? 0)) failures.push('workbench contentArticulationRosterMagentaSources does not match content articulation roster');
if ((summary.contentArticulationRosterStarterPlans ?? 0) !== (contentArticulationRoster?.summary?.starterPlans ?? 0)) failures.push('workbench contentArticulationRosterStarterPlans does not match content articulation roster');
if ((summary.contentArticulationRosterPlanPreviews ?? 0) !== (contentArticulationRoster?.summary?.planPreviews ?? 0)) failures.push('workbench contentArticulationRosterPlanPreviews does not match content articulation roster');
if ((summary.contentArticulationRosterSourceParity ?? 0) !== (contentArticulationRoster?.summary?.sourceParity ?? 0)) failures.push('workbench contentArticulationRosterSourceParity does not match content articulation roster');
if ((summary.contentArticulationRosterVisualCohesionPasses ?? 0) !== (contentArticulationRoster?.summary?.visualCohesionPasses ?? 0)) failures.push('workbench contentArticulationRosterVisualCohesionPasses does not match content articulation roster');
if (!html.includes('Content Articulation Roster')) failures.push('workbench html missing Content Articulation Roster card');
if (!html.includes('content-articulation-roster.html')) failures.push('workbench html missing content articulation roster link');
if (!htmlIncludes('npm run content:articulation-roster && npm run content:articulation-roster-check')) failures.push('workbench html missing content articulation roster command');
if (!html.includes('target threats have source-to-articulation evidence staged')) failures.push('workbench html missing content articulation roster copy');
if ((summary.contentReproducibilityTargets ?? 0) !== (contentReproducibility?.summary?.targetThreats ?? 0)) failures.push('workbench contentReproducibilityTargets does not match content reproducibility');
if ((summary.contentReproducibilityItems ?? 0) !== (contentReproducibility?.summary?.items ?? 0)) failures.push('workbench contentReproducibilityItems does not match content reproducibility');
if ((summary.contentReproducibilityReady ?? 0) !== (contentReproducibility?.summary?.reproducibleTargets ?? 0)) failures.push('workbench contentReproducibilityReady does not match content reproducibility');
if ((summary.contentReproducibilityMagentaSources ?? 0) !== (contentReproducibility?.summary?.magentaSources ?? 0)) failures.push('workbench contentReproducibilityMagentaSources does not match content reproducibility');
if ((summary.contentReproducibilityRuntimeRegistered ?? 0) !== (contentReproducibility?.summary?.runtimeRegistered ?? 0)) failures.push('workbench contentReproducibilityRuntimeRegistered does not match content reproducibility');
if (!html.includes('Content Reproducibility')) failures.push('workbench html missing Content Reproducibility card');
if (!html.includes('content-reproducibility.html')) failures.push('workbench html missing content reproducibility link');
if (!htmlIncludes('npm run content:reproducibility && npm run content:reproducibility-check')) failures.push('workbench html missing content reproducibility command');
if (!html.includes('Reproducible still does not mean visually approved')) failures.push('workbench html missing content reproducibility approval boundary copy');
if ((summary.riggingSprintMissingRuntimeTotal ?? 0) !== (riggingSprint?.summary?.missingRuntimeTotal ?? 0)) failures.push('workbench riggingSprintMissingRuntimeTotal does not match rigging sprint');
if ((summary.riggingSprintSize ?? 0) !== (riggingSprint?.summary?.sprintSize ?? 0)) failures.push('workbench riggingSprintSize does not match rigging sprint');
if ((summary.riggingSprintSourceApproved ?? 0) !== (riggingSprint?.summary?.sourceApprovedInSprint ?? 0)) failures.push('workbench riggingSprintSourceApproved does not match rigging sprint');
if ((summary.riggingSprintPlanArtifactsStaged ?? 0) !== (riggingSprint?.summary?.planArtifactsStagedInSprint ?? 0)) failures.push('workbench riggingSprintPlanArtifactsStaged does not match rigging sprint');
if ((summary.riggingSprintPlanPreviewsStaged ?? 0) !== (riggingSprint?.summary?.planPreviewsStagedInSprint ?? 0)) failures.push('workbench riggingSprintPlanPreviewsStaged does not match rigging sprint');
if (!html.includes('missing-runtime candidates are queued')) failures.push('workbench html missing rigging sprint copy');
if (!html.includes('starter plans') || !html.includes('plan previews are staged')) failures.push('workbench html missing staged rigging artifact copy');
if (!Array.isArray(workbench?.quickPreviews) || workbench.quickPreviews.length < 4) failures.push('quickPreviews must include at least four entries');
if (!workbench?.quickPreviews?.some((entry) => entry.id === 'diver')) failures.push('quickPreviews must include diver');
if (!workbench?.quickPreviews?.some((entry) => String(entry.id).includes('gulper'))) failures.push('quickPreviews must include a gulper preview');
for (const entry of workbench?.quickPreviews ?? []) {
  if (!entry.acceptanceState) failures.push(`${entry.id ?? 'unknown-preview'}: missing acceptanceState`);
  if (!entry.qualityStatus) failures.push(`${entry.id ?? 'unknown-preview'}: missing qualityStatus`);
  if (entry.id !== 'diver' && entry.acceptanceState !== 'accepted-threat' && !String(entry.reviewWarning ?? '').includes('Prototype preview only') && !String(entry.reviewWarning ?? '').includes('Source preview only')) {
    failures.push(`${entry.id}: non-accepted quick preview must carry explicit prototype/source warning`);
  }
  if (entry.countsTowardGate === true && entry.acceptanceState !== 'accepted-threat') {
    failures.push(`${entry.id}: only accepted threats can count toward the gate`);
  }
  if (!entry.url || (!entry.url.includes('?sandbox=') && !entry.url.includes('?entity='))) {
    failures.push(`${entry.id ?? 'unknown-preview'}: preview url must target sandbox/entity route`);
  }
  const expectedCommand = entry.id === 'diver'
    ? `npm run sandbox:preview -- --id ${entry.id} --serve --open --visual`
    : `npm run sandbox:preview -- --id ${entry.id} --with diver --serve --open --visual`;
  if (entry.previewCommand !== expectedCommand) failures.push(`${entry.id}: previewCommand should be ${expectedCommand}`);
  const expectedUrl = entry.id === 'diver' ? entry.url : entry.previewUrl ?? entry.pairedUrl;
  if (entry.id !== 'diver' && !String(expectedUrl ?? '').includes('companion=diver')) {
    failures.push(`${entry.id}: quick preview must use paired diver URL`);
  }
  if (!htmlIncludes(expectedUrl ?? entry.url)) failures.push(`${entry.id}: html is missing quick preview URL`);
  if (!htmlIncludes(expectedCommand)) failures.push(`${entry.id}: html is missing quick preview command`);
  if (entry.reviewWarning && !htmlIncludes(entry.reviewWarning)) failures.push(`${entry.id}: html is missing quick preview review warning`);
  if (!htmlIncludes(entry.acceptanceState)) failures.push(`${entry.id}: html is missing acceptance state`);
}

if (!Array.isArray(workbench?.nextTargets) || workbench.nextTargets.length < 1) failures.push('nextTargets must not be empty while gate is incomplete');
for (const target of workbench?.nextTargets ?? []) {
  if (!target.id || !target.stage) failures.push(`${target.id ?? 'unknown-target'}: missing target id or stage`);
  if (target.countsTowardGate === true && !target.accepted) failures.push(`${target.id}: only accepted targets can count toward gate`);
  if (target.countsTowardGate !== true && !String(target.reviewWarning ?? '').includes('Not accepted')) {
    failures.push(`${target.id}: incomplete target must carry not-accepted warning`);
  }
  if (!Array.isArray(target.nextCommands) || target.nextCommands.length < 1) failures.push(`${target.id}: missing next commands`);
  if (target.id && !html.includes(target.id)) failures.push(`${target.id}: html is missing next target`);
  if (target.reviewWarning && !htmlIncludes(target.reviewWarning)) failures.push(`${target.id}: html is missing target review warning`);
  if (target.sourcePreviewUrl && !htmlIncludes(target.sourcePreviewUrl)) failures.push(`${target.id}: html is missing source preview URL`);
  if (target.rigPreviewUrl && !htmlIncludes(target.rigPreviewUrl)) failures.push(`${target.id}: html is missing rig preview URL`);
  if (!Array.isArray(target.previewCommands)) failures.push(`${target.id}: previewCommands must be an array`);
  for (const command of target.previewCommands ?? []) {
    if (!command.startsWith('npm run sandbox:preview -- --id ')) failures.push(`${target.id}: invalid preview command ${command}`);
    if (!command.includes('--with diver')) failures.push(`${target.id}: preview command must include paired diver companion`);
    if (!htmlIncludes(command)) failures.push(`${target.id}: html is missing preview command ${command}`);
  }
}

const requiredHtml = [
  'Water 9 Content Workbench',
  'npm run content:workbench:preview',
  'npm run content:workbench:preview-check',
  'sandbox/index.html',
  'Sandbox Quickstart',
  'sandbox/quickstart.html',
  'npm run sandbox:quickstart && npm run sandbox:quickstart-check',
  'sandbox/lab.html?id=abyssal-gulper&with=diver',
  'npm run sandbox:lab -- --id abyssal-gulper --with diver',
  'content-stage-board.html',
  'content-readiness.html',
  'npm run content:readiness && npm run content:readiness-check',
  'content-acceptance-runway.html',
  'npm run content:acceptance-runway && npm run content:acceptance-runway-check',
  'content-acceptance-audits/index.html',
  'npm run content:acceptance-audit-index && npm run content:acceptance-audit-index-check',
  'content-acceptance-doctor.html',
  'npm run content:acceptance-doctor && npm run content:acceptance-doctor-check',
  'content-threat-acceptance-decision-template.html',
  'npm run content:threat-decisions && npm run content:threat-decisions-check',
  'npm run content:threat-decisions-workspace-smoke',
  'npm run content:threat-decisions-apply',
  'content-approved-runtime-handoff.html',
  'npm run content:approved-runtime-handoff && npm run content:approved-runtime-handoff-check',
  'content-plan-coverage.html',
  'npm run content:plan-coverage && npm run content:plan-coverage-check',
  'content-vertical-slice-runway.html',
  'npm run content:vertical-slice && npm run content:vertical-slice-check',
  'content-human-signoff-queue.html',
  'npm run content:human-signoff && npm run content:human-signoff-check',
  'content-reproducibility.html',
  'npm run content:reproducibility && npm run content:reproducibility-check',
  'content-production-proof.html',
  'npm run content:production-proof && npm run content:production-proof-check',
  'content-promote-approved-threats.html',
  'npm run content:promote-approved-threats && npm run content:promote-approved-threats-check',
  'content-runtime-cohesion-review.html',
  'npm run content:runtime-cohesion-review && npm run content:runtime-cohesion-review-check',
  'npm run content:runtime-cohesion-review:serve-smoke',
  'content-rigging-sprint.html',
  'npm run content:rigging-sprint && npm run content:rigging-sprint-check',
  'source-inbox/index.html',
  'source-candidates/source-intake-runway.html',
  'npm run source:intake-runway && npm run source:intake-runway-check',
  'source-candidates/source-intake-doctor.html',
  'npm run source:intake-doctor && npm run source:intake-doctor-check',
  'source-candidates/source-workstation.html',
  'npm run source:workstation && npm run source:workstation-check',
  'source-candidates/research-subagent-pack.html',
  'npm run research:subagent-pack && npm run research:subagent-pack-check',
  'source-candidates/research-dispatch-board.html',
  'npm run research:dispatch && npm run research:dispatch-check',
  'source-candidates/research-source-trace.html',
  'npm run research:source-trace && npm run research:source-trace-check',
  'source-candidates/source-generation-sprint.html',
  'npm run source:sprint:preview',
  'source-candidates/source-generation-queue.html',
  'npm run source:generation-queue && npm run source:generation-queue:check',
  'source-candidates/source-review-dossier.html',
  'npm run source:review-dossier && npm run source:review-dossier-check',
  'source-approval-runway.html',
  'npm run source:approval-runway && npm run source:approval-runway-check && npm run source:approval-runway:preview',
  'source-candidates/source-replace-runway.html',
  'npm run source:replace-runway && npm run source:replace-runway-check && npm run source:replace-runway:preview',
  'source-candidates/source-critic-board.html',
  'npm run source:critic-board && npm run source:critic-board-check && npm run source:critic-board:serve-smoke',
  'source-candidates/source-critic-regeneration-queue.html',
  'npm run source:critic-regeneration && npm run source:critic-regeneration-check && npm run source:critic-regeneration:serve-smoke && npm run source:critic-regeneration-openai-smoke',
  'source-candidates/source-critic-regeneration-health.html',
  'npm run source:critic-regeneration-health && npm run source:critic-regeneration-health-check && npm run source:critic-regeneration-health:serve-smoke',
  'source-candidates/source-review-sequencer.html',
  'npm run source:review-sequencer && npm run source:review-sequencer-check && npm run source:review-sequencer:serve-smoke',
  'source-candidates/source-review-target-packet.html',
  'npm run source:review-target-packet && npm run source:review-target-packet-check && npm run source:review-target-packet:serve-smoke',
  'source-candidates/source-cohesion-review.html',
  'npm run source:cohesion-review && npm run source:cohesion-review-check',
  'source-candidates/source-cohesion-decision-template.html',
  'source-candidates/source-approval-marathon.html',
  'npm run source:approval-marathon && npm run source:approval-marathon-check',
  'npm run source:approval-marathon-workspace-smoke',
  'npm run source:approval-marathon-full-batch-smoke',
  'npm run content:synthetic-decision-guards-check',
  'npm run source:approval-decisions && npm run source:approval-decisions-check',
  'npm run source:approval-decisions-workspace-smoke',
  'npm run source:approval-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
  'source-candidates/quick-reviews/index.html',
  'npm run source:quick-review-all && npm run source:quick-review-all-check',
  'source-candidates/index.html',
  'articulated/index.html',
  'npm run sandbox:index && npm run sandbox:index:check',
  'npm run source:check',
  'npm run source:preview-check',
  'npm run content:gate:smoke',
  'npm run content:gate',
];
for (const needle of requiredHtml) {
  if (!htmlIncludes(needle)) failures.push(`html is missing required content: ${needle}`);
}
for (const command of workbench?.gateCommands ?? []) {
  if (!htmlIncludes(command)) failures.push(`html is missing gate command: ${command}`);
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
if (!Array.isArray(workbench?.launchCommands) || workbench.launchCommands.length < 2) {
  failures.push('launchCommands must include preview and preview-check commands');
}
if (!workbench?.launchCommands?.includes('npm run sandbox:preview -- --id gulper --kind articulated --with diver --serve --open --visual')) {
  failures.push('launchCommands must include shorthand curated-alias gulper sandbox preview');
}
for (const command of workbench?.launchCommands ?? []) {
  if (!htmlIncludes(command)) failures.push(`html is missing launch command: ${command}`);
}

const result = {
  json: jsonPath,
  html: htmlPath,
  quickPreviews: workbench?.quickPreviews?.length ?? 0,
  nextTargets: workbench?.nextTargets?.length ?? 0,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}

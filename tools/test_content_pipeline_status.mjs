import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['tools/content_pipeline_status.mjs', '--json'], {
  cwd: process.cwd(),
  encoding: 'utf8',
});

const failures = [];
if (result.status !== 0) {
  failures.push(`content_pipeline_status exited ${result.status}: ${result.stderr || result.stdout}`);
}

let status = null;
try {
  const jsonStart = result.stdout.indexOf('{');
  status = JSON.parse(jsonStart >= 0 ? result.stdout.slice(jsonStart) : result.stdout);
} catch (error) {
  failures.push(`could not parse status JSON: ${error.message}`);
}

const sprint = status?.sourceGenerationSprint ?? {};
const firstTarget = sprint.firstTarget ?? {};
const expectedFirstId = firstTarget.id ?? sprint.ids?.[0] ?? null;
const sprintIds = (sprint.ids ?? []).join(',');
if (!Array.isArray(sprint.captureFirstIds)) failures.push('sourceGenerationSprint.captureFirstIds must be an array');
if ((sprint.ids ?? []).length && !expectedFirstId) failures.push('sourceGenerationSprint must expose a first target');
const firstIsCaptureFirst = expectedFirstId ? sprint.captureFirstIds?.includes(expectedFirstId) === true : false;
if (expectedFirstId && firstTarget.id === expectedFirstId) {
  if (firstTarget.captureFirst !== firstIsCaptureFirst) failures.push(`first target captureFirst mismatch for ${expectedFirstId}`);
  if (firstIsCaptureFirst) {
    if ((firstTarget.missingArtifactAttempts ?? 0) < 3) failures.push('capture-first target must include repeated missing-artifact count');
    if (firstTarget.recommendedFirst !== `npm run source:inbox-capture -- --id ${expectedFirstId} --open`) {
      failures.push(`capture-first recommendedFirst is wrong: ${firstTarget.recommendedFirst}`);
    }
    if (!String(firstTarget.recommendedFallback ?? '').includes('--image <saved-image-path>')) {
      failures.push(`capture-first recommendedFallback should use explicit saved-file recovery: ${firstTarget.recommendedFallback}`);
    }
  } else {
    if ((firstTarget.missingArtifactAttempts ?? 0) !== 0) failures.push('session-first target should not report repeated missing-artifact attempts');
    if (firstTarget.recommendedFirst != null && firstTarget.recommendedFirst !== `npm run source:inbox-capture -- --id ${expectedFirstId} --open`) {
      failures.push(`session-first recommendedFirst is unexpected: ${firstTarget.recommendedFirst}`);
    }
  }
}
if (expectedFirstId && sprint.commands?.inboxCapture !== `npm run source:inbox-capture -- --id ${expectedFirstId} --open`) {
  failures.push(`status inboxCapture should be target-aware for the first sprint target: ${sprint.commands?.inboxCapture}`);
}
if (firstIsCaptureFirst && !String(sprint.commands?.recoverSavedFile ?? '').includes('--image <saved-image-path>')) {
  failures.push('capture-first status commands should expose explicit saved-file recovery');
}
if (expectedFirstId && !firstIsCaptureFirst && sprint.commands?.autoIngestFirstSession !== `npm run source:imagegen-status -- --id ${expectedFirstId} --ingest`) {
  failures.push(`session-first status should expose auto ingest for first target: ${sprint.commands?.autoIngestFirstSession}`);
}
const runbook = status?.sourceAcquisitionRunbook ?? {};
if (runbook.schema !== 'water9/source-acquisition-runbook@1') {
  failures.push(`source acquisition runbook schema missing from status: ${runbook.schema}`);
}
if (!Array.isArray(runbook.ids) || runbook.ids.join(',') !== (sprint.ids ?? []).join(',')) {
  failures.push('source acquisition runbook ids should match source sprint ids');
}
if (expectedFirstId && runbook.captureFirstIds?.includes(expectedFirstId) !== firstIsCaptureFirst) {
  failures.push(`source acquisition runbook capture-first state mismatch for ${expectedFirstId}`);
}
if (expectedFirstId && runbook.firstCaptureCommand !== `npm run source:inbox-capture -- --id ${expectedFirstId} --open`) {
  failures.push(`source acquisition runbook firstCaptureCommand is wrong: ${runbook.firstCaptureCommand}`);
}
if (!String(runbook.batchCaptureCommand ?? '').includes(`npm run source:inbox-capture -- --ids ${sprintIds}`)) {
  failures.push(`source acquisition runbook batchCaptureCommand is wrong: ${runbook.batchCaptureCommand}`);
}
if (!String(runbook.batchOpenAIDryRunCommand ?? '').includes(`npm run source:generate-openai-batch -- --ids ${sprintIds}`)) {
  failures.push(`source acquisition runbook batchOpenAIDryRunCommand is wrong: ${runbook.batchOpenAIDryRunCommand}`);
}
if (!String(runbook.batchOpenAIApplyCommand ?? '').includes(`npm run source:generate-openai-batch -- --ids ${sprintIds}`) || !String(runbook.batchOpenAIApplyCommand ?? '').includes('--apply')) {
  failures.push(`source acquisition runbook batchOpenAIApplyCommand is wrong: ${runbook.batchOpenAIApplyCommand}`);
}
if (expectedFirstId && runbook.firstOpenAIDryRunCommand !== `npm run source:generate-openai -- --id ${expectedFirstId}`) {
  failures.push(`source acquisition runbook firstOpenAIDryRunCommand is wrong: ${runbook.firstOpenAIDryRunCommand}`);
}
if (expectedFirstId && runbook.firstOpenAIApplyCommand !== `npm run source:generate-openai -- --id ${expectedFirstId} --apply`) {
  failures.push(`source acquisition runbook firstOpenAIApplyCommand is wrong: ${runbook.firstOpenAIApplyCommand}`);
}
const expectedRunbookInboxCheck = `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${(sprint.ids ?? []).join(',')}`;
if (runbook.inboxCheckCommand !== expectedRunbookInboxCheck) {
  failures.push(`source acquisition runbook inboxCheckCommand is wrong: ${runbook.inboxCheckCommand}`);
}
if (!String(runbook.ingestDryRunCommand ?? '').includes('--dry-run')) {
  failures.push('source acquisition runbook should expose dry-run ingest command');
}
if (runbook.rebuildCommand !== 'npm run source:acquisition-runbook' || runbook.validateCommand !== 'npm run source:acquisition-runbook-check') {
  failures.push('source acquisition runbook should expose rebuild and validation commands');
}
const ingestReadiness = status?.sourceIngestReadiness ?? {};
if (ingestReadiness.schema !== 'water9/source-ingest-readiness@1') {
  failures.push(`source ingest readiness schema missing from status: ${ingestReadiness.schema}`);
}
if (!Array.isArray(ingestReadiness.ids) || ingestReadiness.ids.join(',') !== (sprint.ids ?? []).join(',')) {
  failures.push('source ingest readiness ids should match source sprint ids');
}
if (ingestReadiness.batchReady !== false) {
  failures.push('source ingest readiness should not report batchReady while current sprint images are missing');
}
if (ingestReadiness.ready !== 0 || ingestReadiness.missing !== (sprint.ids ?? []).length || ingestReadiness.blocked !== 0) {
  failures.push(`source ingest readiness counts are wrong: ready ${ingestReadiness.ready}, missing ${ingestReadiness.missing}, blocked ${ingestReadiness.blocked}`);
}
if (ingestReadiness.rebuildCommand !== 'npm run source:ingest-readiness' || ingestReadiness.validateCommand !== 'npm run source:ingest-readiness-check') {
  failures.push('source ingest readiness should expose rebuild and validation commands');
}
if (ingestReadiness.inboxCheckCommand !== expectedRunbookInboxCheck) {
  failures.push(`source ingest readiness inboxCheckCommand is wrong: ${ingestReadiness.inboxCheckCommand}`);
}
if (!String(ingestReadiness.ingestDryRunCommand ?? '').includes('--dry-run')) {
  failures.push('source ingest readiness should expose dry-run ingest command');
}
const inbox = status?.sourceInboxReview ?? {};
if (expectedFirstId && inbox.recommendedTargetId !== expectedFirstId) {
  failures.push(`source inbox review should recommend ${expectedFirstId} first: ${inbox.recommendedTargetId}`);
}
if (expectedFirstId && inbox.recommendedCaptureCommand !== `npm run source:inbox-capture -- --id ${expectedFirstId} --open`) {
  failures.push(`source inbox recommendedCaptureCommand should be target-aware: ${inbox.recommendedCaptureCommand}`);
}
if (expectedFirstId && inbox.recommendedCommands?.check !== `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${expectedFirstId}`) {
  failures.push(`source inbox recommended check command is wrong: ${inbox.recommendedCommands?.check}`);
}
const reviewDossier = status?.sourceCandidates?.reviewDossier ?? {};
if (reviewDossier.schema !== 'water9/source-review-dossier@1') {
  failures.push(`source review dossier schema missing from status: ${reviewDossier.schema}`);
}
if ((reviewDossier.pendingReview ?? 0) < 1) {
  failures.push('source review dossier should report pending source reviews');
}
if (!reviewDossier.recommendedReview?.id) {
  failures.push('source review dossier should expose recommendedReview in status');
}
if ((reviewDossier.reviewPackets ?? 0) < (reviewDossier.readyForHumanReview ?? 0)) {
  failures.push('source review dossier status should expose review packets for ready source images');
}
if (!String(reviewDossier.recommendedReview?.acceptCommand ?? '').includes(`npm run source:accept -- --id ${reviewDossier.recommendedReview?.id}`)) {
  failures.push('recommendedReview acceptCommand should be target-aware');
}
if (reviewDossier.recommendedPacket?.file && !String(reviewDossier.recommendedPacket.commands?.sourcePreview ?? '').includes(`npm run sandbox:preview -- --id ${reviewDossier.recommendedReview?.id} --kind source`)) {
  failures.push('recommendedPacket should expose a target-aware source sandbox preview command');
}
if (!reviewDossier.recommendedPacket?.file) {
  failures.push('source review dossier should expose recommendedPacket in status');
}
if (!Array.isArray(reviewDossier.readyReviewQueue)) {
  failures.push('source review dossier status should expose readyReviewQueue');
}
if ((reviewDossier.readyReviewQueue?.length ?? -1) !== (reviewDossier.readyForHumanReview ?? -2)) {
  failures.push(`readyReviewQueue should match readyForHumanReview count: ${reviewDossier.readyReviewQueue?.length}/${reviewDossier.readyForHumanReview}`);
}
for (const queueItem of reviewDossier.readyReviewQueue ?? []) {
  if (!queueItem.id || !queueItem.packet) failures.push('readyReviewQueue item should include id and packet');
  if (!String(queueItem.sourcePreviewCommand ?? '').includes(`npm run sandbox:preview -- --id ${queueItem.id} --kind source`)) {
    failures.push(`${queueItem.id}: readyReviewQueue should include source preview command`);
  }
  if (!String(queueItem.acceptCommand ?? '').includes(`npm run source:accept -- --id ${queueItem.id}`)) {
    failures.push(`${queueItem.id}: readyReviewQueue should include target-aware accept command`);
  }
}
const riggingPacks = status?.riggingPacks ?? {};
if (riggingPacks.schema !== 'water9/rigging-focus-pack-index@1') {
  failures.push(`rigging focus pack index schema missing from status: ${riggingPacks.schema}`);
}
if ((riggingPacks.packs ?? 0) !== (riggingPacks.sourceImageCoverage ?? -1)) {
  failures.push(`rigging focus packs should cover every source image: ${riggingPacks.packs}/${riggingPacks.sourceImageCoverage}`);
}
if ((riggingPacks.packs ?? 0) < 1) {
  failures.push('rigging focus packs should report at least one source-image packet');
}
if (!riggingPacks.recommended?.id) {
  failures.push('rigging focus packs should expose a recommended packet');
}
if (riggingPacks.recommended?.id) {
  if (!String(riggingPacks.recommended.sourcePreviewCommand ?? '').includes(`npm run sandbox:preview -- --id ${riggingPacks.recommended.id} --kind source --best --serve --open --visual`)) {
    failures.push('recommended rigging pack should expose source browser preview command');
  }
  if (!String(riggingPacks.recommended.runtimePreviewCommand ?? '').includes('--with diver --serve --open --visual')) {
    failures.push('recommended rigging pack should expose paired diver runtime browser preview command');
  }
  if (!String(riggingPacks.recommended.sandboxVisualCommand ?? '').includes('--states idle,lunge,stunned --with diver')) {
    failures.push('recommended rigging pack should expose paired idle/lunge/stunned visual command');
  }
}
const runway = status?.acceptanceRunway ?? {};
if (runway.schema !== 'water9/content-acceptance-runway@1') {
  failures.push(`acceptance runway schema missing from status: ${runway.schema}`);
}
if ((runway.candidatePackets ?? 0) !== (runway.candidates ?? 0)) {
  failures.push(`acceptance runway should expose one candidate packet per candidate: ${runway.candidatePackets}/${runway.candidates}`);
}
if ((runway.unmappedPrototypeThreats ?? 0) > 0 && (runway.unmappedPrototypePackets ?? 0) !== runway.unmappedPrototypeThreats) {
  failures.push(`acceptance runway should expose one unmapped prototype packet per unmapped prototype: ${runway.unmappedPrototypePackets}/${runway.unmappedPrototypeThreats}`);
}
const sourceImageRecommendation = runway.recommendedByStage?.['source-image-needed'];
if (expectedFirstId && sourceImageRecommendation?.id !== expectedFirstId) {
  failures.push(`acceptance runway source-image-needed should recommend ${expectedFirstId}: ${sourceImageRecommendation?.id}`);
}
const expectedSourceImageNextAction = firstIsCaptureFirst
  ? `npm run source:inbox-capture -- --id ${expectedFirstId} --open`
  : `npm run source:session -- --id ${expectedFirstId}`;
if (expectedFirstId && sourceImageRecommendation?.nextAction !== expectedSourceImageNextAction) {
  failures.push(`acceptance runway source-image-needed nextAction should be ${firstIsCaptureFirst ? 'capture-first' : 'session-first'}: ${sourceImageRecommendation?.nextAction}`);
}

const summary = {
  schema: 'water9/content-pipeline-status-smoke@1',
  firstTarget: firstTarget.id ?? null,
  captureFirstIds: sprint.captureFirstIds ?? [],
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

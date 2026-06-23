import {
  MIN_VISUAL_NOTE_LENGTH,
  distinctReviewNotes,
  meaningfulReviewText,
  reviewNoteHasEvidenceTerms,
} from './review_text_quality.mjs';

export const DISALLOWED_REVIEWERS = new Set(['codex', 'assistant', 'ai', 'agent', 'automation', 'bot', 'model']);

export const REQUIRED_SOURCE_CHECKS = [
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

export const REQUIRED_RIG_CHECKS = [
  'single-source-cohesion',
  'readable-silhouette',
  'anatomy-cohesion',
  'production-visual-cohesion',
  'socket-seams',
  'motion-stability',
  'sandbox-behavior',
];

export const REQUIRED_RIG_EVIDENCE = ['whole-source', 'contact-sheet', 'phase-strip', 'source-parity', 'sandbox-preview'];
export const MIN_SOURCE_VISUAL_SCORE = 4;
export const MIN_RIG_VISUAL_SCORE = 4;

export const SOURCE_VISUAL_NOTE_TERMS = {
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

export const RIG_VISUAL_NOTE_TERMS = {
  'single-source-cohesion': ['source', 'cohesion', 'parity', 'whole', 'same creature'],
  'readable-silhouette': ['silhouette', 'outline', 'scale', 'readable', 'shape'],
  'anatomy-cohesion': ['anatomy', 'orientation', 'part', 'jaw', 'body', 'tail', 'limb'],
  'production-visual-cohesion': ['production', 'placeholder', 'palette', 'lighting', 'material', 'cohesion'],
  'socket-seams': ['socket', 'seam', 'joint', 'overlay', 'connection'],
  'motion-stability': ['phase', 'motion', 'jitter', 'popping', 'frame', 'animation'],
  'sandbox-behavior': ['sandbox', 'idle', 'lunge', 'stunned', 'diver', 'behavior', 'motion'],
};

export function reviewerAllowed(name) {
  const normalized = String(name ?? '').trim().toLowerCase();
  return Boolean(normalized) && !DISALLOWED_REVIEWERS.has(normalized);
}

export function safeFileName(value) {
  return String(value ?? '').replace(/[^a-z0-9_-]/gi, '-');
}

export function sourceImageValidationRecorded(candidate) {
  const validation = candidate?.review?.imageValidation;
  const metric = validation?.metric;
  return validation?.schema === 'water9/source-image-validation@1'
    && Boolean(String(validation.generatedAt ?? '').trim())
    && Boolean(String(validation.report ?? '').trim())
    && Boolean(validation.reportFingerprint?.sha256)
    && Boolean(validation.sourceFingerprint?.sha256)
    && Boolean(validation.validationFingerprint)
    && metric?.id === candidate?.id
    && metric?.source === candidate?.source
    && metric?.checked === true
    && Boolean(metric?.sourceFingerprint?.sha256)
    && metric.sourceFingerprint.sha256 === validation.sourceFingerprint.sha256
    && metric.validationFingerprint === validation.validationFingerprint
    && Array.isArray(metric?.failures)
    && metric.failures.length === 0
    && Array.isArray(metric?.size)
    && Array.isArray(metric?.subjectBBox)
    && Array.isArray(metric?.subjectSize)
    && Number(metric?.detail?.colorEntropy) >= 3
    && Number(metric?.detail?.quantizedColorBins) >= 64
    && Number(metric?.detail?.edgeDensity) >= 0.015
    && Number(metric?.detail?.averageLocalContrast) >= 1.5
    && Number(metric?.connectivity?.largestComponentRatio) >= 0.75
    && Number(metric?.connectivity?.significantComponents) <= 6;
}

export function sourceArtContractRecorded(candidate) {
  const evidence = candidate?.review?.artContract;
  const fileBase = safeFileName(candidate?.id);
  return evidence?.schema === 'water9/source-art-contract-review@1'
    && evidence.id === candidate?.id
    && evidence.json === `public/review/source-candidates/art-contracts/${fileBase}.json`
    && evidence.markdown === `public/review/source-candidates/art-contracts/${fileBase}.md`
    && evidence.expectedOutput === `public/assets/generated/fauna-${candidate?.id}-whole-source.png`
    && Boolean(evidence.jsonFingerprint?.sha256)
    && Boolean(evidence.markdownFingerprint?.sha256)
    && Boolean(String(evidence.recordedAt ?? '').trim());
}

export function sourcePlanCoverageRecorded(candidate) {
  const evidence = candidate?.review?.planCoverage;
  return evidence?.schema === 'water9/source-plan-coverage-review@1'
    && evidence.id === candidate?.id
    && evidence.report === 'public/review/content-plan-coverage.json'
    && Boolean(String(evidence.recordedAt ?? '').trim())
    && Boolean(String(evidence.plan ?? '').trim())
    && Boolean(String(evidence.planPreview ?? '').trim())
    && Boolean(evidence.planFingerprint?.sha256)
    && Boolean(evidence.previewFingerprint?.sha256)
    && Boolean(String(evidence.commands?.planCheck ?? '').includes('--plan'))
    && Boolean(String(evidence.commands?.productionPrepare ?? '').includes(`--id ${candidate?.id}`))
    && !String(evidence.commands?.productionPrepare ?? '').includes('--allow-unapproved');
}

export function sourceVisualBoardRecorded(candidate) {
  const evidence = candidate?.review?.sourceVisualBoard;
  const media = evidence?.media ?? {};
  return evidence?.schema === 'water9/source-visual-board-review@1'
    && evidence.id === candidate?.id
    && evidence.report === 'public/review/source-visual-board.json'
    && evidence.readyForHumanReview === true
    && Boolean(String(evidence.recordedAt ?? '').trim())
    && Number(evidence.requiredReadCount) >= 3
    && Number(evidence.contractReviewChecklistCount) >= 1
    && ['source', 'keyPreview', 'sandboxScreenshot', 'planPreview'].every((label) => (
      Boolean(String(media[label]?.url ?? '').includes(candidate?.id))
      && Boolean(String(media[label]?.path ?? '').trim())
      && Boolean(media[label]?.fingerprint?.sha256)
    ));
}

export function sourceApprovedStrict(candidate) {
  const review = candidate?.review ?? {};
  return Boolean(candidate)
    && Boolean(candidate.source)
    && (candidate.status === 'approved' || candidate.status === 'rigged')
    && review.status === 'approved'
    && candidate.sourceCohesion === 'single-source'
    && candidate.backgroundKey === 'magenta'
    && reviewerAllowed(review.reviewedBy)
    && Boolean(String(review.reviewedAt ?? '').trim())
    && meaningfulReviewText(review.note)
    && REQUIRED_SOURCE_CHECKS.every((check) => review.visualChecklist?.[check] === true)
    && REQUIRED_SOURCE_CHECKS.every((check) => {
      const score = Number(review.visualScores?.[check]);
      return Number.isFinite(score) && score >= MIN_SOURCE_VISUAL_SCORE && score <= 5;
    })
    && REQUIRED_SOURCE_CHECKS.every((check) => meaningfulReviewText(review.visualNotes?.[check], MIN_VISUAL_NOTE_LENGTH))
    && REQUIRED_SOURCE_CHECKS.every((check) => reviewNoteHasEvidenceTerms(review.visualNotes?.[check], SOURCE_VISUAL_NOTE_TERMS[check]))
    && distinctReviewNotes(review.visualNotes, REQUIRED_SOURCE_CHECKS).ok
    && review.reviewEvidence?.['whole-source'] === true
    && review.reviewEvidence?.['source-preview'] === true
    && review.reviewEvidence?.['source-image-validation'] === true
    && review.reviewEvidence?.['source-art-contract'] === true
    && review.reviewEvidence?.['articulation-plan-preview'] === true
    && review.reviewEvidence?.['source-visual-board'] === true
    && sourceArtContractRecorded(candidate)
    && sourceImageValidationRecorded(candidate)
    && sourcePlanCoverageRecorded(candidate)
    && sourceVisualBoardRecorded(candidate);
}

export function rigAcceptedStrict(creature) {
  const quality = creature?.quality ?? {};
  return quality.status === 'accepted'
    && quality.sourceCohesion === 'single-source'
    && quality.backgroundKey === 'magenta'
    && reviewerAllowed(quality.reviewedBy)
    && Boolean(String(quality.reviewedAt ?? '').trim())
    && String(quality.sourceCandidateId ?? '').trim().length > 0
    && meaningfulReviewText(quality.acceptanceNote)
    && REQUIRED_RIG_CHECKS.every((check) => quality.visualChecklist?.[check] === true)
    && REQUIRED_RIG_CHECKS.every((check) => {
      const score = Number(quality.visualScores?.[check]);
      return Number.isFinite(score) && score >= MIN_RIG_VISUAL_SCORE && score <= 5;
    })
    && REQUIRED_RIG_CHECKS.every((check) => meaningfulReviewText(quality.visualNotes?.[check], MIN_VISUAL_NOTE_LENGTH))
    && REQUIRED_RIG_CHECKS.every((check) => reviewNoteHasEvidenceTerms(quality.visualNotes?.[check], RIG_VISUAL_NOTE_TERMS[check]))
    && distinctReviewNotes(quality.visualNotes, REQUIRED_RIG_CHECKS).ok
    && REQUIRED_RIG_EVIDENCE.every((check) => quality.reviewEvidence?.[check] === true);
}

export function threatAcceptedForContentGate(candidate, runtimeCreature, reviewCreature) {
  const candidateId = String(candidate?.id ?? '').trim();
  const runtimeId = String(runtimeCreature?.id ?? '').trim();
  const reviewId = String(reviewCreature?.id ?? '').trim();
  const runtimeSourceId = String(runtimeCreature?.quality?.sourceCandidateId ?? '').trim();
  const reviewSourceId = String(reviewCreature?.quality?.sourceCandidateId ?? '').trim();
  return Boolean(candidateId)
    && Boolean(runtimeId)
    && runtimeId === reviewId
    && runtimeSourceId === candidateId
    && reviewSourceId === candidateId
    && sourceApprovedStrict(candidate)
    && rigAcceptedStrict(runtimeCreature)
    && rigAcceptedStrict(reviewCreature);
}

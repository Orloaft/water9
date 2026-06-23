import assert from 'node:assert/strict';
import {
  REQUIRED_RIG_CHECKS,
  REQUIRED_RIG_EVIDENCE,
  REQUIRED_SOURCE_CHECKS,
  rigAcceptedStrict,
  sourceApprovedStrict,
  threatAcceptedForContentGate,
} from './content_quality_predicates.mjs';

function sourceNotes() {
  return {
    'whole-creature-cohesion': 'The whole source organism reads as one single cohesive creature with matching lighting.',
    'part-continuity-cohesion': 'Every part has continuity through the joint anatomy, proportions, and lighting.',
    'readable-silhouette': 'The silhouette has a readable outline and scale at gameplay size.',
    'no-collage-artifacts': 'No collage artifact remains; material, palette, and lighting are consistent.',
    'non-placeholder-art-direction': 'The production art direction is finished and not placeholder construction.',
    'crop-safe-anatomy': 'The crop preserves appendage margins, pivot space, and complete anatomy.',
    'clean-magenta-key': 'The magenta key background is clean with no pink border contamination.',
    'gameplay-read': 'The gameplay danger read is clear through the attack verb and hazard shape.',
    'neutral-riggable-pose': 'The neutral pose is riggable with visible pivots and an attack frame lane.',
    'visible-attack-lane': 'The attack lane direction is visible from the mouth and strike posture.',
  };
}

function rigNotes() {
  return {
    'single-source-cohesion': 'The whole source parity confirms the same creature and cohesive rig.',
    'readable-silhouette': 'The silhouette outline remains readable at scale in the contact sheet.',
    'anatomy-cohesion': 'The anatomy orientation keeps part, jaw, body, tail, and limb relationships stable.',
    'production-visual-cohesion': 'The production palette, lighting, material, and cohesion avoid placeholder reads.',
    'socket-seams': 'Each socket seam and joint overlay connection is covered during motion.',
    'motion-stability': 'The phase motion avoids jitter, popping frame changes, and animation drift.',
    'sandbox-behavior': 'The sandbox shows idle, lunge, stunned behavior with diver scale context.',
  };
}

function validSourceCandidate() {
  const id = 'test-abyss-lurker';
  const source = `public/assets/generated/fauna-${id}-whole-source.png`;
  const validationFingerprint = 'source-validation-sha';
  const sourceFingerprint = { sha256: 'source-sha', size: 4096 };
  return {
    id,
    source,
    status: 'approved',
    sourceCohesion: 'single-source',
    backgroundKey: 'magenta',
    review: {
      status: 'approved',
      reviewedBy: 'human-reviewer',
      reviewedAt: '2026-06-17T00:00:00.000Z',
      note: 'Human reviewer confirms this is cohesive finished creature source art.',
      visualChecklist: Object.fromEntries(REQUIRED_SOURCE_CHECKS.map((check) => [check, true])),
      visualScores: Object.fromEntries(REQUIRED_SOURCE_CHECKS.map((check) => [check, 4])),
      visualNotes: sourceNotes(),
      reviewEvidence: {
        'whole-source': true,
        'source-preview': true,
        'source-image-validation': true,
        'source-art-contract': true,
        'articulation-plan-preview': true,
        'source-visual-board': true,
      },
      artContract: {
        schema: 'water9/source-art-contract-review@1',
        id,
        json: `public/review/source-candidates/art-contracts/${id}.json`,
        markdown: `public/review/source-candidates/art-contracts/${id}.md`,
        expectedOutput: source,
        jsonFingerprint: { sha256: 'contract-json-sha' },
        markdownFingerprint: { sha256: 'contract-md-sha' },
        recordedAt: '2026-06-17T00:00:00.000Z',
      },
      planCoverage: {
        schema: 'water9/source-plan-coverage-review@1',
        recordedAt: '2026-06-17T00:00:00.000Z',
        id,
        report: 'public/review/content-plan-coverage.json',
        stage: 'prototype-needs-approved-source',
        runtimeRegistered: true,
        runtimeId: id,
        plan: `tools/scratch/${id}-starter-plan.json`,
        planPreview: `public/review/articulated/${id}-plan-preview.png`,
        planFingerprint: { sha256: 'plan-sha' },
        previewFingerprint: { sha256: 'preview-sha' },
        commands: {
          planCheck: `npm run articulated:plan-check -- --plan tools/scratch/${id}-starter-plan.json`,
          planPreview: `npm run articulated:plan-preview -- --plan tools/scratch/${id}-starter-plan.json --out public/review/articulated/${id}-plan-preview.png`,
          productionPrepare: `npm run articulated:prepare-plan -- --id ${id} --plan tools/scratch/${id}-starter-plan.json --preview public/review/articulated/${id}-plan-preview.png`,
        },
      },
      sourceVisualBoard: {
        schema: 'water9/source-visual-board-review@1',
        recordedAt: '2026-06-17T00:00:00.000Z',
        id,
        report: 'public/review/source-visual-board.json',
        state: 'awaiting-human-source-approval',
        readyForHumanReview: true,
        requiredReadCount: 5,
        contractReviewChecklistCount: 3,
        media: {
          source: {
            url: `/assets/generated/fauna-${id}-whole-source.png`,
            path: `public/assets/generated/fauna-${id}-whole-source.png`,
            fingerprint: { sha256: 'source-media-sha' },
          },
          keyPreview: {
            url: `/review/source-candidates/key-previews/${id}-key-preview.png`,
            path: `public/review/source-candidates/key-previews/${id}-key-preview.png`,
            fingerprint: { sha256: 'key-media-sha' },
          },
          sandboxScreenshot: {
            url: `/review/source-candidates/quick-reviews/${id}-source-preview.png`,
            path: `public/review/source-candidates/quick-reviews/${id}-source-preview.png`,
            fingerprint: { sha256: 'sandbox-media-sha' },
          },
          planPreview: {
            url: `/review/articulated/${id}-plan-preview.png`,
            path: `public/review/articulated/${id}-plan-preview.png`,
            fingerprint: { sha256: 'plan-media-sha' },
          },
        },
      },
      imageValidation: {
        schema: 'water9/source-image-validation@1',
        generatedAt: '2026-06-17T00:00:00.000Z',
        report: 'tools/scratch/source-candidate-images-report.json',
        reportFingerprint: { sha256: 'report-sha' },
        sourceFingerprint,
        validationFingerprint,
        metric: {
          id,
          source,
          checked: true,
          sourceFingerprint,
          validationFingerprint,
          failures: [],
          size: [1024, 1024],
          subjectBBox: [64, 64, 896, 896],
          subjectSize: [832, 832],
          detail: {
            colorEntropy: 3.5,
            quantizedColorBins: 80,
            edgeDensity: 0.03,
            averageLocalContrast: 2,
          },
          connectivity: {
            largestComponentRatio: 0.86,
            significantComponents: 3,
          },
        },
      },
    },
  };
}

function validRig() {
  return {
    id: 'test-abyss-lurker',
    quality: {
      status: 'accepted',
      sourceCohesion: 'single-source',
      backgroundKey: 'magenta',
      reviewedBy: 'human-reviewer',
      reviewedAt: '2026-06-17T00:00:00.000Z',
      sourceCandidateId: 'test-abyss-lurker',
      acceptanceNote: 'Human reviewer confirms the assembled rig is cohesive and game-ready.',
      visualChecklist: Object.fromEntries(REQUIRED_RIG_CHECKS.map((check) => [check, true])),
      visualScores: Object.fromEntries(REQUIRED_RIG_CHECKS.map((check) => [check, 4])),
      visualNotes: rigNotes(),
      reviewEvidence: Object.fromEntries(REQUIRED_RIG_EVIDENCE.map((check) => [check, true])),
    },
  };
}

const source = validSourceCandidate();
assert.equal(sourceApprovedStrict(source), true, 'complete strict source evidence should pass');

const withoutArtContract = structuredClone(source);
delete withoutArtContract.review.artContract;
assert.equal(sourceApprovedStrict(withoutArtContract), false, 'source without art-contract evidence must fail');

const withoutPlanCoverage = structuredClone(source);
delete withoutPlanCoverage.review.planCoverage;
assert.equal(sourceApprovedStrict(withoutPlanCoverage), false, 'source without plan-preview evidence must fail');

const withoutVisualBoard = structuredClone(source);
delete withoutVisualBoard.review.sourceVisualBoard;
assert.equal(sourceApprovedStrict(withoutVisualBoard), false, 'source without source visual board evidence must fail');

const weakDetail = structuredClone(source);
weakDetail.review.imageValidation.metric.detail.colorEntropy = 1.2;
assert.equal(sourceApprovedStrict(weakDetail), false, 'source with weak image detail metrics must fail');

const automationReviewer = structuredClone(source);
automationReviewer.review.reviewedBy = 'codex';
assert.equal(sourceApprovedStrict(automationReviewer), false, 'source approved by automation must fail');

const rig = validRig();
assert.equal(rigAcceptedStrict(rig), true, 'complete strict rig evidence should pass');
assert.equal(threatAcceptedForContentGate(source, rig, structuredClone(rig)), true, 'strict source plus matching runtime/review rigs should pass the content gate');

const missingEvidence = structuredClone(rig);
delete missingEvidence.quality.reviewEvidence['sandbox-preview'];
assert.equal(rigAcceptedStrict(missingEvidence), false, 'rig without sandbox evidence must fail');
assert.equal(threatAcceptedForContentGate(source, missingEvidence, structuredClone(rig)), false, 'runtime rig missing evidence must fail the content gate');

const unapprovedSource = structuredClone(source);
unapprovedSource.status = 'needs-review';
assert.equal(threatAcceptedForContentGate(unapprovedSource, rig, structuredClone(rig)), false, 'accepted rigs with an unapproved source must fail the content gate');

const mismatchedReviewRig = structuredClone(rig);
mismatchedReviewRig.quality.sourceCandidateId = 'different-source';
assert.equal(threatAcceptedForContentGate(source, rig, mismatchedReviewRig), false, 'runtime and review rig source ids must agree for the content gate');

const reusedRigNotes = structuredClone(rig);
reusedRigNotes.quality.visualNotes['motion-stability'] = reusedRigNotes.quality.visualNotes['sandbox-behavior'];
assert.equal(rigAcceptedStrict(reusedRigNotes), false, 'duplicated rig notes must fail');

console.log(JSON.stringify({
  ok: true,
  sourceChecks: REQUIRED_SOURCE_CHECKS.length,
  rigChecks: REQUIRED_RIG_CHECKS.length,
  rigEvidence: REQUIRED_RIG_EVIDENCE.length,
}, null, 2));

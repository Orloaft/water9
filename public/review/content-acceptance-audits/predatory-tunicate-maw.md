# Content Acceptance Audit: predatory-tunicate-maw

Generated: `2026-06-18T17:07:16.039Z`
Overall stage: `human-source-review-needed`
Gate disclosure: `Not Accepted`; counts toward 20-threat gate: `false`

Preview-only or incomplete evidence. Do not treat screenshots, sandbox motion, or prototype rigs as production-quality accepted content.

Source classification: `source-preview-only-human-review-required`
Threat classification: `prototype-preview-only-human-acceptance-required`

## Source Candidate

Status: `needs-review`; mechanical ready: `true`; approved: `false`
Source preview report: `/mnt/nxt-dev/water9/tools/scratch/sandbox-target-paired-visuals-report.json`

Review links:
- approvalRunway: `/review/source-approval-runway.html`
- approvalChecklist: `/review/source-approval-checklist.json`
- visualBoard: `/review/source-visual-board.html`
- reviewDossier: `/review/source-candidates/source-review-dossier.html`
- reviewQueue: `/review/source-candidates/quick-reviews/index.html`
- quickReview: `/review/source-candidates/quick-reviews/predatory-tunicate-maw.html`
- source: `/assets/generated/fauna-predatory-tunicate-maw-whole-source.png`
- thumbnail: `/review/source-candidates/thumbs/predatory-tunicate-maw-source-thumb.png`
- keyPreview: `/review/source-candidates/key-previews/predatory-tunicate-maw-key-preview.png`
- sandboxScreenshot: `/review/source-candidates/quick-reviews/predatory-tunicate-maw-source-preview.png`
- planPreview: `/review/articulated/predatory-tunicate-maw-plan-preview.png`
- reviewPacket: `public/review/source-candidates/source-review-packets/predatory-tunicate-maw.md`
- artContract: `public/review/source-candidates/art-contracts/predatory-tunicate-maw.md`

Blockers:
- None.

Warnings:
- human source approval has not been recorded

Source approval dry-run command:
```bash
npm run source:accept -- --id predatory-tunicate-maw --status approved --reviewed-by <human-reviewer> \
  --note '<specific source approval note>' \
  --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane \
  --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> \
  --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' \
  --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
```

## Articulated Threat

Quality: `prototype`; mechanical ready: `true`; accepted: `false`

Review links:
- reviewGallery: `/review/articulated/index.html`
- sandboxPreview: `/?sandbox=predatory-tunicate-maw&with=diver`
- source: `/assets/generated/fauna-predatory-tunicate-maw-whole-source.png`
- sourceThumb: `/review/articulated/thumbs/predatory-tunicate-maw-source-thumb.png`
- planPreview: `/review/articulated/predatory-tunicate-maw-plan-preview.png`
- contactSheet: `/review/articulated/predatory-tunicate-maw-contact.png`
- phaseStrip: `/review/articulated/predatory-tunicate-maw-phase.png`
- sourceParity: `/review/articulated/source-parity/predatory-tunicate-maw-source-parity.png`
- sourceParityThumb: `/review/articulated/thumbs/predatory-tunicate-maw-source-parity-thumb.png`
- pairedSandboxReport: `/mnt/nxt-dev/water9/tools/scratch/sandbox-target-paired-visuals-report.json`
- pairedSandboxScreenshot: `/mnt/nxt-dev/water9/tools/scratch/sandbox-target-paired-visuals/predatory-tunicate-maw__prototype__with-diver__idle.png`

Blockers:
- linked source candidate is not human-approved

Warnings:
- quality.status is prototype, not accepted

Sandbox framing:
```json
{
  "idle": {
    "width": 960,
    "height": 640,
    "ignoredTop": 109,
    "ignoredBottom": 115,
    "bbox": [
      10,
      109,
      742,
      497
    ],
    "widthRatio": 0.7635,
    "heightRatio": 0.6078,
    "areaRatio": 0.4641,
    "foregroundRatio": 0.0327
  },
  "lunge": {
    "width": 960,
    "height": 640,
    "ignoredTop": 109,
    "ignoredBottom": 115,
    "bbox": [
      10,
      109,
      740,
      499
    ],
    "widthRatio": 0.7615,
    "heightRatio": 0.6109,
    "areaRatio": 0.4652,
    "foregroundRatio": 0.0329
  },
  "stunned": {
    "width": 960,
    "height": 640,
    "ignoredTop": 109,
    "ignoredBottom": 115,
    "bbox": [
      10,
      109,
      738,
      509
    ],
    "widthRatio": 0.7594,
    "heightRatio": 0.6266,
    "areaRatio": 0.4758,
    "foregroundRatio": 0.0148
  }
}
```

Threat acceptance dry-run command:
```bash
npm run content:accept -- --id predatory-tunicate-maw --status accepted --reviewed-by <human-reviewer> \
  --source-candidate predatory-tunicate-maw \
  --note '<specific rig approval note>' \
  --visual-check single-source-cohesion --visual-check readable-silhouette --visual-check anatomy-cohesion --visual-check production-visual-cohesion --visual-check socket-seams --visual-check motion-stability --visual-check sandbox-behavior \
  --score single-source-cohesion=<4-5> --score readable-silhouette=<4-5> --score anatomy-cohesion=<4-5> --score production-visual-cohesion=<4-5> --score socket-seams=<4-5> --score motion-stability=<4-5> --score sandbox-behavior=<4-5> \
  --visual-note single-source-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note anatomy-cohesion='<specific rationale>' --visual-note production-visual-cohesion='<specific rationale>' --visual-note socket-seams='<specific rationale>' --visual-note motion-stability='<specific rationale>' --visual-note sandbox-behavior='<specific rationale>' \
  --source-reviewed --contact-reviewed --phase-reviewed --parity-reviewed --sandbox-reviewed --dry-run
```

## Next Action

A human reviewer must inspect the source gallery and run the source approval dry-run command without --dry-run when satisfied.


# Content Acceptance Audit: vent-claw-yeti

Generated: `2026-06-18T17:07:15.615Z`
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
- quickReview: `/review/source-candidates/quick-reviews/vent-claw-yeti.html`
- source: `/assets/generated/fauna-vent-claw-yeti-whole-source.png`
- thumbnail: `/review/source-candidates/thumbs/vent-claw-yeti-source-thumb.png`
- keyPreview: `/review/source-candidates/key-previews/vent-claw-yeti-key-preview.png`
- sandboxScreenshot: `/review/source-candidates/quick-reviews/vent-claw-yeti-source-preview.png`
- planPreview: `/review/articulated/vent-claw-yeti-plan-preview.png`
- reviewPacket: `public/review/source-candidates/source-review-packets/vent-claw-yeti.md`
- artContract: `public/review/source-candidates/art-contracts/vent-claw-yeti.md`

Blockers:
- None.

Warnings:
- human source approval has not been recorded

Source approval dry-run command:
```bash
npm run source:accept -- --id vent-claw-yeti --status approved --reviewed-by <human-reviewer> \
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
- sandboxPreview: `/?sandbox=vent-claw-yeti&with=diver`
- source: `/assets/generated/fauna-vent-claw-yeti-whole-source.png`
- sourceThumb: `/review/articulated/thumbs/vent-claw-yeti-source-thumb.png`
- planPreview: `/review/articulated/vent-claw-yeti-plan-preview.png`
- contactSheet: `/review/articulated/vent-claw-yeti-contact.png`
- phaseStrip: `/review/articulated/vent-claw-yeti-phase.png`
- sourceParity: `/review/articulated/source-parity/vent-claw-yeti-source-parity.png`
- sourceParityThumb: `/review/articulated/thumbs/vent-claw-yeti-source-parity-thumb.png`
- pairedSandboxReport: `/mnt/nxt-dev/water9/tools/scratch/sandbox-target-paired-visuals-report.json`
- pairedSandboxScreenshot: `/mnt/nxt-dev/water9/tools/scratch/sandbox-target-paired-visuals/vent-claw-yeti__prototype__with-diver__idle.png`

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
      822,
      521
    ],
    "widthRatio": 0.8469,
    "heightRatio": 0.6453,
    "areaRatio": 0.5465,
    "foregroundRatio": 0.017
  },
  "lunge": {
    "width": 960,
    "height": 640,
    "ignoredTop": 109,
    "ignoredBottom": 115,
    "bbox": [
      10,
      109,
      842,
      513
    ],
    "widthRatio": 0.8677,
    "heightRatio": 0.6328,
    "areaRatio": 0.5491,
    "foregroundRatio": 0.0163
  },
  "stunned": {
    "width": 960,
    "height": 640,
    "ignoredTop": 109,
    "ignoredBottom": 115,
    "bbox": [
      10,
      109,
      834,
      499
    ],
    "widthRatio": 0.8594,
    "heightRatio": 0.6109,
    "areaRatio": 0.525,
    "foregroundRatio": 0.0142
  }
}
```

Threat acceptance dry-run command:
```bash
npm run content:accept -- --id vent-claw-yeti --status accepted --reviewed-by <human-reviewer> \
  --source-candidate vent-claw-yeti \
  --note '<specific rig approval note>' \
  --visual-check single-source-cohesion --visual-check readable-silhouette --visual-check anatomy-cohesion --visual-check production-visual-cohesion --visual-check socket-seams --visual-check motion-stability --visual-check sandbox-behavior \
  --score single-source-cohesion=<4-5> --score readable-silhouette=<4-5> --score anatomy-cohesion=<4-5> --score production-visual-cohesion=<4-5> --score socket-seams=<4-5> --score motion-stability=<4-5> --score sandbox-behavior=<4-5> \
  --visual-note single-source-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note anatomy-cohesion='<specific rationale>' --visual-note production-visual-cohesion='<specific rationale>' --visual-note socket-seams='<specific rationale>' --visual-note motion-stability='<specific rationale>' --visual-note sandbox-behavior='<specific rationale>' \
  --source-reviewed --contact-reviewed --phase-reviewed --parity-reviewed --sandbox-reviewed --dry-run
```

## Next Action

A human reviewer must inspect the source gallery and run the source approval dry-run command without --dry-run when satisfied.


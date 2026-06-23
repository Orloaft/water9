# Source Quick Review: Thorn Fan Coralline (thorn-fan-coralline)

Generated: `2026-06-18T17:06:58.339Z`
Review status: `ready-for-human-review`
Ready for human source review: `true`

This page consolidates source-review evidence only. It does not approve the source; a human still has to run `npm run source:accept` with specific scores and notes.

## Evidence

- Source: `public/assets/generated/fauna-thorn-fan-coralline-whole-source.png`
- Source image: /assets/generated/fauna-thorn-fan-coralline-whole-source.png
- Thumbnail: /review/source-candidates/thumbs/thorn-fan-coralline-source-thumb.png
- Magenta key preview: /review/source-candidates/key-previews/thorn-fan-coralline-key-preview.png
- Sandbox screenshot: /review/source-candidates/quick-reviews/thorn-fan-coralline-source-preview.png
- Articulation plan preview: /review/articulated/thorn-fan-coralline-plan-preview.png
- Contract: `public/review/source-candidates/art-contracts/thorn-fan-coralline.md`

## Metrics

- Image validation failures: none
- Source size: 1536x1024
- Subject size: 1270x899
- Background ratio: 0.6601
- Inner magenta ratio: 0
- Preview failures: none

## Blockers

- human source approval is still missing

## Approval Checklist

| Check | Visual flag | Score flag | Note flag |
| --- | --- | --- | --- |
| whole-creature-cohesion | yes | yes | yes |
| part-continuity-cohesion | yes | yes | yes |
| readable-silhouette | yes | yes | yes |
| no-collage-artifacts | yes | yes | yes |
| non-placeholder-art-direction | yes | yes | yes |
| crop-safe-anatomy | yes | yes | yes |
| clean-magenta-key | yes | yes | yes |
| gameplay-read | yes | yes | yes |
| neutral-riggable-pose | yes | yes | yes |
| visible-attack-lane | yes | yes | yes |

## Candidate Contract Checks

- Thick primary ribs dominate the silhouette; fine branches remain secondary and do not become lace noise.
- Left and right fan lobes grow from one rooted stalk spine with visible hinge knots and shared coralline plates.
- Raised stinging polyps are sparse anatomy on the ribs, not dotted texture or detached bead rows.

## Reject Risks

- Avoid background reef scenery; the fan must read as an enemy entity.
- Avoid thin lace branches that disappear at small sprite size.
- Avoid perfect ornamental symmetry that feels like a decorative logo.
- Avoid detached coral chunks or separate fan colonies.
- Keep current streaks, sting flashes, and impact sparks as separate VFX assets.

## Commands

```bash
npm run sandbox:preview -- --id thorn-fan-coralline --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:accept -- --id thorn-fan-coralline --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id thorn-fan-coralline --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```


# Source Quick Review: Hadal Trencher Isopod (hadal-trencher-isopod)

Generated: `2026-06-18T17:06:58.329Z`
Review status: `ready-for-human-review`
Ready for human source review: `true`

This page consolidates source-review evidence only. It does not approve the source; a human still has to run `npm run source:accept` with specific scores and notes.

## Evidence

- Source: `public/assets/generated/fauna-hadal-trencher-isopod-whole-source.png`
- Source image: /assets/generated/fauna-hadal-trencher-isopod-whole-source.png
- Thumbnail: /review/source-candidates/thumbs/hadal-trencher-isopod-source-thumb.png
- Magenta key preview: /review/source-candidates/key-previews/hadal-trencher-isopod-key-preview.png
- Sandbox screenshot: /review/source-candidates/quick-reviews/hadal-trencher-isopod-source-preview.png
- Articulation plan preview: /review/articulated/hadal-trencher-isopod-plan-preview.png
- Contract: `public/review/source-candidates/art-contracts/hadal-trencher-isopod.md`

## Metrics

- Image validation failures: none
- Source size: 1822x935
- Subject size: 1683x638
- Background ratio: 0.6148
- Inner magenta ratio: 0.00001
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

- Trencher silhouette read: reject if the output reads as a generic crab, beetle, or submarine drone instead of one low isopod with a broad armored body.
- Burrow-latch read: head shield, digging claws, leg banks, and rear plates must visibly connect to the same body with crop-safe hinge roots.
- Scale and armor read: dorsal plates and trenching claws must share one palette and lighting style without mismatched pasted shell fragments.

## Reject Risks

- Avoid making it look like a land beetle; keep marine isopod proportions and flattened body logic.
- Avoid overly tiny legs hidden under the shell; they need to rig clearly.
- Avoid perfect trilobite symmetry or fossil styling that reads as extinct decoration.
- Avoid magenta, hot pink, or purple body colors that conflict with the chroma key.
- Keep sand burst, impact dust, and burrow opening as separate VFX rather than source art.

## Commands

```bash
npm run sandbox:preview -- --id hadal-trencher-isopod --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:accept -- --id hadal-trencher-isopod --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id hadal-trencher-isopod --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```


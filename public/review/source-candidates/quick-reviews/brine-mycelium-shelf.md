# Source Quick Review: Brine Mycelium Shelf (brine-mycelium-shelf)

Generated: `2026-06-18T17:06:58.338Z`
Review status: `ready-for-human-review`
Ready for human source review: `true`

This page consolidates source-review evidence only. It does not approve the source; a human still has to run `npm run source:accept` with specific scores and notes.

## Evidence

- Source: `public/assets/generated/fauna-brine-mycelium-shelf-whole-source.png`
- Source image: /assets/generated/fauna-brine-mycelium-shelf-whole-source.png
- Thumbnail: /review/source-candidates/thumbs/brine-mycelium-shelf-source-thumb.png
- Magenta key preview: /review/source-candidates/key-previews/brine-mycelium-shelf-key-preview.png
- Sandbox screenshot: /review/source-candidates/quick-reviews/brine-mycelium-shelf-source-preview.png
- Articulation plan preview: /review/articulated/brine-mycelium-shelf-plan-preview.png
- Contract: `public/review/source-candidates/art-contracts/brine-mycelium-shelf.md`

## Metrics

- Image validation failures: none
- Source size: 1536x1024
- Subject size: 1070x572
- Background ratio: 0.6966
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

- Shelf plates grow from one low mycelial root mat through visible hinge-root webs; no individual mushroom caps or stems.
- Spore sac, plates, pores, and filament fringe read as one underwater biofilm organism, not a rock or coral slab.
- Plate lips are thick enough for crop-safe articulation and are not hidden by fuzzy texture or baked spore clouds.

## Reject Risks

- Avoid terrestrial mushroom caps with stems; keep the form encrusting and underwater-adapted.
- Avoid making the source look like an inert rock or coral slab.
- Avoid dense fuzzy texture that hides the main plates and hinge zones.
- Avoid baked spore clouds or fog covering the anatomy.
- Avoid magenta, hot pink, or purple fungal tissue near the key color.

## Commands

```bash
npm run sandbox:preview -- --id brine-mycelium-shelf --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:accept -- --id brine-mycelium-shelf --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id brine-mycelium-shelf --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```


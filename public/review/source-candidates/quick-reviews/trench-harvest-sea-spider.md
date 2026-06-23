# Source Quick Review: Trench Harvest Sea Spider (trench-harvest-sea-spider)

Generated: `2026-06-18T17:06:58.332Z`
Review status: `ready-for-human-review`
Ready for human source review: `true`

This page consolidates source-review evidence only. It does not approve the source; a human still has to run `npm run source:accept` with specific scores and notes.

## Evidence

- Source: `public/assets/generated/fauna-trench-harvest-sea-spider-whole-source.png`
- Source image: /assets/generated/fauna-trench-harvest-sea-spider-whole-source.png
- Thumbnail: /review/source-candidates/thumbs/trench-harvest-sea-spider-source-thumb.png
- Magenta key preview: /review/source-candidates/key-previews/trench-harvest-sea-spider-key-preview.png
- Sandbox screenshot: /review/source-candidates/quick-reviews/trench-harvest-sea-spider-source-preview.png
- Articulation plan preview: /review/articulated/trench-harvest-sea-spider-plan-preview.png
- Contract: `public/review/source-candidates/art-contracts/trench-harvest-sea-spider.md`

## Metrics

- Image validation failures: none
- Source size: 1536x1024
- Subject size: 1114x819
- Background ratio: 0.9147
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

- Six to eight crop-safe legs remain visibly rooted in a tiny central pycnogonid body with marine joint anatomy.
- Forward proboscis is soft and tapered biological feeding tissue, not a rigid gun barrel, stinger, or weapon.
- Reject spider eyes, fangs, webbing, terrestrial abdomen bulb, hair-thin limbs, or disconnected leg fragments.

## Reject Risks

- Avoid a terrestrial spider read; keep pycnogonid tiny-body and marine proboscis anatomy.
- Avoid making legs hair-thin; every limb needs usable thickness for articulation.
- Avoid web strands, silk, or horror-web language because sea spiders do not use webs.
- Avoid a gun-like proboscis; it should be soft biological feeding anatomy.
- Avoid magenta highlights on joints, eyes, or siphon effects.

## Commands

```bash
npm run sandbox:preview -- --id trench-harvest-sea-spider --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:accept -- --id trench-harvest-sea-spider --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id trench-harvest-sea-spider --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```


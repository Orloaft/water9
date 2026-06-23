# Source Review Packet: Trench Harvest Sea Spider (trench-harvest-sea-spider)

Status: `ready-for-human-review`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

- thumbnail available
- magenta key preview available
- image validation passed
- source sandbox render check passed (not approval)
- human approval missing

## Links

- Source: `public/assets/generated/fauna-trench-harvest-sea-spider-whole-source.png`
- Thumbnail: `thumbs/trench-harvest-sea-spider-source-thumb.png`
- Magenta key preview: `key-previews/trench-harvest-sea-spider-key-preview.png`
- Sandbox screenshot: `/mnt/nxt-dev/water9/tools/scratch/source-preview-visuals/source-trench-harvest-sea-spider__source-review__idle.png`
- Contract: `public/review/source-candidates/art-contracts/trench-harvest-sea-spider.md`

## Blockers

- human source approval is still missing

## Required Read

- One cohesive sea-spider-inspired arthropod, not a land spider or insect.
- Tiny central body with long articulated legs is the first silhouette read.
- Forward proboscis must read as a biological siphon and not a weapon barrel.
- Legs are separated enough for rigging, with thick joints and clear contact claws.
- No webbing, carcass, seafloor, drifting particles, shadows, blood clouds, or environmental props baked in.

## Candidate Checks

- Six to eight crop-safe legs remain visibly rooted in a tiny central pycnogonid body with marine joint anatomy.
- Forward proboscis is soft and tapered biological feeding tissue, not a rigid gun barrel, stinger, or weapon.
- Reject spider eyes, fangs, webbing, terrestrial abdomen bulb, hair-thin limbs, or disconnected leg fragments.

## Riggable Parts

- tiny knuckled central body
- small forward head nub
- soft forward proboscis siphon
- left long front stepping leg
- right long front stepping leg
- left long middle pinning leg
- right long middle pinning leg
- left long rear bracing leg
- right long rear bracing leg
- hooked terminal claw cluster
- dorsal rounded egg-sac lump
- cold siphon glow overlay

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
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:accept -- --id trench-harvest-sea-spider --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id trench-harvest-sea-spider --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```

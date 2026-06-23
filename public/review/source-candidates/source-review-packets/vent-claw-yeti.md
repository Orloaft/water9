# Source Review Packet: Vent-Claw Yeti (vent-claw-yeti)

Status: `ready-for-human-review`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

- thumbnail available
- magenta key preview available
- image validation passed
- source sandbox render check passed (not approval)
- human approval missing

## Links

- Source: `public/assets/generated/fauna-vent-claw-yeti-whole-source.png`
- Thumbnail: `thumbs/vent-claw-yeti-source-thumb.png`
- Magenta key preview: `key-previews/vent-claw-yeti-key-preview.png`
- Sandbox screenshot: `/mnt/nxt-dev/water9/tools/scratch/source-preview-visuals/source-vent-claw-yeti__source-review__idle.png`
- Contract: `public/review/source-candidates/art-contracts/vent-claw-yeti.md`

## Blockers

- human source approval is still missing

## Required Read

- One whole crab-like arthropod, not a furry mammal, lobster, or humanoid monster.
- Oversized bristled claws are the first read and clearly indicate grab range.
- Main carapace, abdomen tuck, legs, claws, and antennae stay connected as one riggable body.
- Bristles read as clustered biological setae, not smoke, fur clouds, or flame.
- No vent chimney, lava plume, bubbles, floor plane, cast shadow, or environmental lighting baked in.

## Candidate Checks

- Oversized claws attach to the squat-lobster carapace through visible shoulder and elbow joints.
- Bacterial setae are grouped rows on claw surfaces, not mammal fur, cloud fluff, or a white monster silhouette.
- Reject humanoid arms, vent chimney props, beach-crab proportions, or loose bristle noise hiding crop zones.

## Riggable Parts

- main carapace torso
- abdomen tuck
- left upper claw arm
- left bristled claw hand
- right upper claw arm
- right bristled claw hand
- front walking leg pair
- middle walking leg pair
- rear walking leg pair
- left antenna
- right antenna
- setae glow overlay clusters

## Reject Risks

- Avoid mammal-like fur; the bristles are crab setae and bacterial mats.
- Avoid a normal beach crab silhouette; emphasize deep-sea squat posture and huge farming claws.
- Avoid making the vent heat or smoke part of the body silhouette.
- Avoid thin bristles that turn into noise; use readable grouped tufts.
- Avoid magenta or pink glows inside the creature that could key out.

## Commands

```bash
npm run sandbox:preview -- --id vent-claw-yeti --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:accept -- --id vent-claw-yeti --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id vent-claw-yeti --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```

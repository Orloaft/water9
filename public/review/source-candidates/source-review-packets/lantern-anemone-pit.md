# Source Review Packet: Lantern Anemone Pit (lantern-anemone-pit)

Status: `ready-for-human-review`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

- thumbnail available
- magenta key preview available
- image validation passed
- source sandbox render check passed (not approval)
- human approval missing

## Links

- Source: `public/assets/generated/fauna-lantern-anemone-pit-whole-source.png`
- Thumbnail: `thumbs/lantern-anemone-pit-source-thumb.png`
- Magenta key preview: `key-previews/lantern-anemone-pit-key-preview.png`
- Sandbox screenshot: `/mnt/nxt-dev/water9/tools/scratch/source-preview-visuals/source-lantern-anemone-pit__source-review__idle.png`
- Contract: `public/review/source-candidates/art-contracts/lantern-anemone-pit.md`

## Blockers

- human source approval is still missing

## Required Read

- One anchored anemone organism, not a decorative coral flower cluster.
- Central mouth pit is the first danger read when open.
- Two rings of thick petal-tentacles are broad enough for sprite-scale articulation.
- Lure bulbs, mouth rim, column base, and outer petals are visually connected.
- Danger is communicated through clamp posture, stinging bulbs, and mouth depth rather than gore or particles.

## Candidate Checks

- Predator read: reject if the output reads as a cute flower, plant icon, or decorative coral instead of one anchored cnidarian ambusher.
- Mouth-depth read: central pit, lip ring, column base, and petal-tentacle roots must remain visible and physically connected.
- VFX separation read: reject baked halos, sting sparks, digestive clouds, or detached shadow inserts in the source image.

## Riggable Parts

- buried column base
- outer pedal disc skirt
- central mouth pit
- upper lip ring
- left outer petal-tentacle
- right outer petal-tentacle
- front inner petal-tentacle
- rear inner petal-tentacle
- lure bulb cluster
- stinging bead tips
- integrated retraction fold ridges

## Reject Risks

- Avoid a cute decorative flower; it must read as a dangerous sessile predator.
- Avoid making the tentacles hair-thin or too numerous for articulation.
- Avoid literal teeth, metal jaws, or land-plant leaves.
- Avoid magenta or pink glow that conflicts with the chroma key background.
- Keep lure halos, sting sparks, and digestive clouds separate from the base source.

## Commands

```bash
npm run sandbox:preview -- --id lantern-anemone-pit --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:accept -- --id lantern-anemone-pit --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id lantern-anemone-pit --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```

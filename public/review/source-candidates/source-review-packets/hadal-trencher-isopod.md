# Source Review Packet: Hadal Trencher Isopod (hadal-trencher-isopod)

Status: `ready-for-human-review`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

- thumbnail available
- magenta key preview available
- image validation passed
- source sandbox render check passed (not approval)
- human approval missing

## Links

- Source: `public/assets/generated/fauna-hadal-trencher-isopod-whole-source.png`
- Thumbnail: `thumbs/hadal-trencher-isopod-source-thumb.png`
- Magenta key preview: `key-previews/hadal-trencher-isopod-key-preview.png`
- Sandbox screenshot: `/mnt/nxt-dev/water9/tools/scratch/source-preview-visuals/source-hadal-trencher-isopod__source-review__idle.png`
- Contract: `public/review/source-candidates/art-contracts/hadal-trencher-isopod.md`

## Blockers

- human source approval is still missing

## Required Read

- One cohesive full-body isopod-like threat, not a generic beetle, trilobite, or crab.
- Segmented armored back is the first read, with the head and shove direction clearly visible.
- Legs, antennae, plates, and mouthparts are thick enough to crop and rig at sprite scale.
- Defensive curl and forward lunge shapes must be visually plausible from the same anatomy.
- No sand clouds, seafloor, burrow hole, shadows, haze, or loose debris baked into the source.

## Candidate Checks

- Trencher silhouette read: reject if the output reads as a generic crab, beetle, or submarine drone instead of one low isopod with a broad armored body.
- Burrow-latch read: head shield, digging claws, leg banks, and rear plates must visibly connect to the same body with crop-safe hinge roots.
- Scale and armor read: dorsal plates and trenching claws must share one palette and lighting style without mismatched pasted shell fragments.

## Riggable Parts

- broad forward head shield
- central overlapping thorax plate stack
- rear curled abdomen plate stack
- left heavy sensory antenna
- right heavy sensory antenna
- left blunt mandible plate
- right blunt mandible plate
- front compact walking leg pair
- middle compact walking leg pair
- rear anchoring walking leg pair
- left and right side shield flanges
- rear curled tail fan plate

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
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:accept -- --id hadal-trencher-isopod --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id hadal-trencher-isopod --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```

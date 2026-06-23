# Source Review Packet: Thorn Fan Coralline (thorn-fan-coralline)

Status: `ready-for-human-review`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

- thumbnail available
- magenta key preview available
- image validation passed
- source sandbox render check passed (not approval)
- human approval missing

## Links

- Source: `public/assets/generated/fauna-thorn-fan-coralline-whole-source.png`
- Thumbnail: `thumbs/thorn-fan-coralline-source-thumb.png`
- Magenta key preview: `key-previews/thorn-fan-coralline-key-preview.png`
- Sandbox screenshot: `/mnt/nxt-dev/water9/tools/scratch/source-preview-visuals/source-thorn-fan-coralline__source-review__idle.png`
- Contract: `public/review/source-candidates/art-contracts/thorn-fan-coralline.md`

## Blockers

- human source approval is still missing

## Required Read

- One rooted fan-shaped reef organism, not background coral decoration.
- Thick thorn ribs and central stalk define the first silhouette at game scale.
- Left and right fan lobes have separable branch groups for folding and lashing.
- Stinging polyp beads sit on the ribs without becoming noisy dotted texture.
- No reef wall, seabed, lighting shaft, fish, bubbles, or baked current lines in the source.

## Candidate Checks

- Thick primary ribs dominate the silhouette; fine branches remain secondary and do not become lace noise.
- Left and right fan lobes grow from one rooted stalk spine with visible hinge knots and shared coralline plates.
- Raised stinging polyps are sparse anatomy on the ribs, not dotted texture or detached bead rows.

## Riggable Parts

- rooted reef foot
- central stalk spine
- left fan lobe
- right fan lobe
- upper rib cluster
- lower rib cluster
- front thorn rake
- rear support ribs
- stinging polyp bead rows
- armored coralline plates
- fold hinge knots
- integrated warning-color wall tissue

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
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:accept -- --id thorn-fan-coralline --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id thorn-fan-coralline --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```

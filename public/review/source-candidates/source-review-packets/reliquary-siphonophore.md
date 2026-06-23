# Source Review Packet: Reliquary Siphonophore (reliquary-siphonophore)

Status: `ready-for-human-review`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

- thumbnail available
- magenta key preview available
- image validation passed
- source sandbox render check passed (not approval)
- human approval missing

## Links

- Source: `public/assets/generated/fauna-reliquary-siphonophore-whole-source.png`
- Thumbnail: `thumbs/reliquary-siphonophore-source-thumb.png`
- Magenta key preview: `key-previews/reliquary-siphonophore-key-preview.png`
- Sandbox screenshot: `/mnt/nxt-dev/water9/tools/scratch/source-preview-visuals/source-reliquary-siphonophore__source-review__idle.png`
- Contract: `public/review/source-candidates/art-contracts/reliquary-siphonophore.md`

## Blockers

- human source approval is still missing

## Required Read

- One cohesive whole-source organism on pure #ff00ff magenta, centered with generous crop margin.
- Vertical chandelier or reliquary colony with a clear top, spine, bell clusters, and dangling hazard zone.
- Tripwire tendrils are broad enough to crop, rig, and see at 64px; avoid hair-thin jelly threads.
- Safe gap is visually plausible: tendrils hang in separate arcs rather than one opaque curtain.
- Ruin/reliquary flavor stays organic shell, glass, and pearl shapes, not a literal lantern, cage, or metal object.

## Candidate Checks

- Top float, nectophores, zooids, polyps, and tendrils are joined by translucent soft membranes into one colony.
- No chandelier, cage, reliquary, pearl necklace, candle, metal, or jewelry read remains in the silhouette.
- Broad tripwire tendrils are crop-safe and biologically attached, not loose strings or bead chains.

## Riggable Parts

- top gas float / crest
- central colony spine torso
- stacked nectophore bell clusters
- left lateral bell fin
- right lateral bell fin
- connected zooid/bract chain with visible membranes
- front feeding polyp cluster
- rear feeding polyp cluster
- four broad tripwire tendrils with bulb tips
- anatomical lure bead
- sting-tip bead anatomy
- separate tripwire pulse / contact spark VFX

## Reject Risks

- Avoid a generic jellyfish umbrella; require siphonophore colony structure with float, bells, zooids, and tendrils.
- Avoid loose collage parts; all visible anatomy must belong to one continuous whole-source organism.
- Avoid hair-thin tentacles that cannot be cropped or socketed; use a few broad readable tripwire tendrils.
- Avoid literal metal chandeliers, cages, church relics, candles, or jewelry.
- Keep glow, sting pulses, and contact sparks as separate VFX so they do not cover the base anatomy.
- Keep pure magenta only in the background; avoid magenta internal glow that breaks chroma keying.

## Commands

```bash
npm run sandbox:preview -- --id reliquary-siphonophore --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:accept -- --id reliquary-siphonophore --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id reliquary-siphonophore --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```

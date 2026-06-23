# Source Review Packet: Chain Vein Siphonophore (chain-vein-siphonophore)

Status: `ready-for-human-review`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

- thumbnail available
- magenta key preview available
- image validation passed
- source sandbox render check passed (not approval)
- human approval missing

## Links

- Source: `public/assets/generated/fauna-chain-vein-siphonophore-whole-source.png`
- Thumbnail: `thumbs/chain-vein-siphonophore-source-thumb.png`
- Magenta key preview: `key-previews/chain-vein-siphonophore-key-preview.png`
- Sandbox screenshot: `/mnt/nxt-dev/water9/tools/scratch/source-preview-visuals/source-chain-vein-siphonophore__source-review__idle.png`
- Contract: `public/review/source-candidates/art-contracts/chain-vein-siphonophore.md`

## Blockers

- human source approval is still missing

## Required Read

- One continuous colonial organism, not separate beads or loose jellyfish pieces.
- Continuous soft colony stem, swimming bells, feeding cluster, and stinging lines are all visible.
- Tripwire tendrils are few, broad, and separated enough to rig.
- The safe gap between hanging lines remains readable at sprite scale.
- All anatomy stays isolated on pure magenta with no water haze, shadows, plankton, or baked glow clouds.

## Candidate Checks

- All bells, bracts, polyps, and tendrils attach to one continuous soft colony stem; no literal chain links or wire.
- Tentilla swellings remain organic tissue on broad tendrils, not pearl beads, jewelry, hooks, or detached ornaments.
- The vertical tripwire silhouette keeps visible safe gaps while preserving one connected siphonophore organism.

## Riggable Parts

- front float bract
- continuous soft colony stem
- upper nectophore bell pair
- middle nectophore bell pair
- lower nectophore bell pair
- left shield bract
- right shield bract
- feeding polyp cluster
- four broad stinging tendrils
- tentilla bead nodes
- terminal lure bulb
- sting bead tissue accents

## Reject Risks

- Avoid making it a single jellyfish umbrella; it must read as a siphonophore colony.
- Avoid detached beads or pearls that do not connect to the central stem.
- Avoid literal chains, wires, hooks, or mechanical trip mines.
- Avoid overly thin tendrils that disappear at 64px.
- Keep pure magenta only in the background and avoid magenta internal glow.
- Keep electric arcs and contact sparks separate from the base sprite.

## Commands

```bash
npm run sandbox:preview -- --id chain-vein-siphonophore --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:accept -- --id chain-vein-siphonophore --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id chain-vein-siphonophore --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```

# Source Review Packet: Brine Mycelium Shelf (brine-mycelium-shelf)

Status: `ready-for-human-review`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

- thumbnail available
- magenta key preview available
- image validation passed
- source sandbox render check passed (not approval)
- human approval missing

## Links

- Source: `public/assets/generated/fauna-brine-mycelium-shelf-whole-source.png`
- Thumbnail: `thumbs/brine-mycelium-shelf-source-thumb.png`
- Magenta key preview: `key-previews/brine-mycelium-shelf-key-preview.png`
- Sandbox screenshot: `/mnt/nxt-dev/water9/tools/scratch/source-preview-visuals/source-brine-mycelium-shelf__source-review__idle.png`
- Contract: `public/review/source-candidates/art-contracts/brine-mycelium-shelf.md`

## Blockers

- human source approval is still missing

## Required Read

- One living encrusting shelf organism, not a pile of land mushrooms dropped underwater.
- Layered shelf plates and central spore pores are readable before surface texture detail.
- Mycelial root web visibly ties the plates into one anchored threat.
- Several large plates have clear hinge zones for extension and recoil animation.
- No wreck wall, cave surface, fog, spore cloud, or environmental substrate baked into the source.

## Candidate Checks

- Shelf plates grow from one low mycelial root mat through visible hinge-root webs; no individual mushroom caps or stems.
- Spore sac, plates, pores, and filament fringe read as one underwater biofilm organism, not a rock or coral slab.
- Plate lips are thick enough for crop-safe articulation and are not hidden by fuzzy texture or baked spore clouds.

## Riggable Parts

- mycelial root mat
- central swollen spore sac
- upper shelf plate
- lower shelf plate
- left feeding plate
- right feeding plate
- front brittle plate lip
- spore pore cluster
- filament whisker fringe
- cracked crust overlays
- integrated warning-color tissue patches

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
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:accept -- --id brine-mycelium-shelf --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id brine-mycelium-shelf --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```

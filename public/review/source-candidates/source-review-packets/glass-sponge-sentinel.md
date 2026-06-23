# Source Review Packet: Glass Sponge Sentinel (glass-sponge-sentinel)

Status: `ready-for-human-review`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

- thumbnail available
- magenta key preview available
- image validation passed
- source sandbox render check passed (not approval)
- human approval missing

## Links

- Source: `public/assets/generated/fauna-glass-sponge-sentinel-whole-source.png`
- Thumbnail: `thumbs/glass-sponge-sentinel-source-thumb.png`
- Magenta key preview: `key-previews/glass-sponge-sentinel-key-preview.png`
- Sandbox screenshot: `/mnt/nxt-dev/water9/tools/scratch/source-preview-visuals/source-glass-sponge-sentinel__source-review__idle.png`
- Contract: `public/review/source-candidates/art-contracts/glass-sponge-sentinel.md`

## Blockers

- human source approval is still missing

## Required Read

- One vase-like glass sponge organism, not a generic coral fan or separate sponge colony.
- Large central osculum throat is the first danger read.
- Bold cross-braced lattice ribs remain readable at game scale rather than dissolving into lace noise.
- Needle-cone petals and rim spicules are thick enough to crop and articulate.
- Anchored base, throat, rim, and needle petals share one lighting and material language.

## Candidate Checks

- Sessile sponge read: reject if the output reads as a crystal turret, cannon, coral fan, or free-floating weapon instead of one anchored vase-like sponge.
- Rim attachment read: needle-petal shutters and spicule crown must visibly grow from the flared rim with no detached shards or projectile pieces in the source.
- Lattice readability read: cross-braced ribs must be bold enough to survive 64px preview without dissolving into lace noise.

## Riggable Parts

- root rock/base anchor
- lower stalk or foot collar
- main vase body torso
- front lattice rib group
- rear lattice rib group
- left rim plate
- right rim plate
- central osculum/throat valve head
- three brittle needle-cone petals
- outer spicule crown
- integrated cracked rim plates

## Reject Risks

- Avoid a generic coral fan or sea plant; it must read as one vase-like glass sponge organism.
- Avoid metal turrets, guns, cannons, crystals, or sci-fi machinery; needles are biological silica spicules.
- Avoid dense lace detail that becomes noise at sprite scale; use bold crop-safe ribs and a few large needle petals.
- Avoid multiple separate sponge colonies; generate one cohesive whole-source creature with one clear silhouette.
- Keep pure magenta only in the background and keep all anatomy fully inside the crop.

## Commands

```bash
npm run sandbox:preview -- --id glass-sponge-sentinel --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:accept -- --id glass-sponge-sentinel --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id glass-sponge-sentinel --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```

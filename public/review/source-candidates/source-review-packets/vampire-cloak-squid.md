# Source Review Packet: Vampire Cloak Squid (vampire-cloak-squid)

Status: `ready-for-human-review`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

- thumbnail available
- magenta key preview available
- image validation passed
- source sandbox render check passed (not approval)
- human approval missing

## Links

- Source: `public/assets/generated/fauna-vampire-cloak-squid-whole-source.png`
- Thumbnail: `thumbs/vampire-cloak-squid-source-thumb.png`
- Magenta key preview: `key-previews/vampire-cloak-squid-key-preview.png`
- Sandbox screenshot: `/mnt/nxt-dev/water9/tools/scratch/source-preview-visuals/source-vampire-cloak-squid__source-review__idle.png`
- Contract: `public/review/source-candidates/art-contracts/vampire-cloak-squid.md`

## Blockers

- human source approval is still missing

## Required Read

- One whole cephalopod with mantle, eyes, arms, and webbing clearly connected.
- Cloak web and arm crown are the main gameplay read, not loose tentacles.
- Eight arms are grouped into riggable clusters without becoming a tangled mass.
- Photophore spots are visible but do not cover the anatomy.
- No ink cloud, particles, water background, shadows, or cropped-off arms baked into the source.

## Candidate Checks

- Compact mantle, two large blue eyes, fin pair, eight webbed arms, cirri fringe, and cyan photophores read as vampire squid anatomy.
- Reject external shell, nautilus head, octopus sucker rows, fantasy lure organs, bat cape, fangs, or humanoid vampire styling.
- The cloak membrane remains one connected webbed arm structure with crop-safe arm clusters and no tangles hiding pivots.

## Riggable Parts

- compact dark mantle body
- large pale left eye
- large pale right eye
- broad cloak web membrane
- front webbed arm pair
- left webbed arm pair
- right webbed arm pair
- rear webbed arm pair
- soft arm spine and cirri fringe
- cyan photophore tip lights
- small mantle fin pair
- central mouth and beak shadow

## Reject Risks

- Avoid bat wings, fangs, capes, or humanoid vampire styling; keep it biological.
- Avoid squid tentacle tangles that obscure the eight-arm cloak structure.
- Avoid magenta or pink photophores that conflict with the background.
- Avoid a giant octopus silhouette; compact mantle and webbed arms should identify vampire squid.
- Keep ink, flash bursts, and stun effects separate from the base anatomy.
- Reject nautilus shells, beak-like nautilus heads, octopus sucker rows, amber lure organs, and external shell spirals.

## Commands

```bash
npm run sandbox:preview -- --id vampire-cloak-squid --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:accept -- --id vampire-cloak-squid --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id vampire-cloak-squid --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```

# Source Review Packet: Coronate Sting Crown (coronate-sting-crown)

Status: `ready-for-human-review`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

- thumbnail available
- magenta key preview available
- image validation passed
- source sandbox render check passed (not approval)
- human approval missing

## Links

- Source: `public/assets/generated/fauna-coronate-sting-crown-whole-source.png`
- Thumbnail: `thumbs/coronate-sting-crown-source-thumb.png`
- Magenta key preview: `key-previews/coronate-sting-crown-key-preview.png`
- Sandbox screenshot: `/mnt/nxt-dev/water9/tools/scratch/source-preview-visuals/source-coronate-sting-crown__source-review__idle.png`
- Contract: `public/review/source-candidates/art-contracts/coronate-sting-crown.md`

## Blockers

- human source approval is still missing

## Required Read

- One cohesive jellyfish organism, not a swarm or decorative cluster.
- Crown-shaped lappet rim and domed bell are the first read at game scale.
- Oral arms are thick, separated, and crop-safe for articulation.
- Tentacle danger zone is visible without becoming a hair-thin curtain.
- Bioluminescent sting cues stay on anatomy, with no baked bubbles, haze, water column, or impact particles.

## Candidate Checks

- Deep bell groove and chunky coronate lappet rim are visible; reject smooth generic umbrella jellyfish.
- Exactly four thick readable tentacles trail from the bell with visible underside roots; no hair curtain, swarm, or many-thread noise.
- Oral arms, lappets, bell skirt, and tentacles remain one cnidarian body with clear crop-safe hinge zones.

## Riggable Parts

- domed bell cap
- lower bell skirt
- segmented crown lappets
- central oral trunk
- front oral arm
- left oral arm
- right oral arm
- rear oral arms
- four thick trailing tentacles
- sting bead tip cluster
- subtle translucent bell rim anatomy

## Reject Risks

- Avoid a generic umbrella jellyfish; crown lappets and deep bell groove must be obvious.
- Avoid hair-thin tentacle noise that cannot be cut or rigged.
- Avoid magenta, pink, or purple body colors that conflict with chroma keying.
- Avoid multiple jellyfish or a decorative swarm.
- Keep sting flashes, shock rings, and bubbles as separate VFX rather than baked source art.

## Commands

```bash
npm run sandbox:preview -- --id coronate-sting-crown --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:accept -- --id coronate-sting-crown --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id coronate-sting-crown --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```

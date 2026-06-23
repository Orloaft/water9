# Source Review Packet: Black Coral Gate (black-coral-gate)

Status: `ready-for-human-review`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

- thumbnail available
- magenta key preview available
- image validation passed
- source sandbox render check passed (not approval)
- human approval missing

## Links

- Source: `public/assets/generated/fauna-black-coral-gate-whole-source.png`
- Thumbnail: `thumbs/black-coral-gate-source-thumb.png`
- Magenta key preview: `key-previews/black-coral-gate-key-preview.png`
- Sandbox screenshot: `/mnt/nxt-dev/water9/tools/scratch/source-preview-visuals/source-black-coral-gate__source-review__idle.png`
- Contract: `public/review/source-candidates/art-contracts/black-coral-gate.md`

## Blockers

- human source approval is still missing

## Required Read

- One cohesive whole-source organism on pure magenta, not separate coral chunks glued onto stone ruins.
- Open arch / portcullis silhouette is the first read, with the bite line clearly visible at game scale.
- Left and right rooted pillars share one material language and connect through a living crown bridge.
- Crop-safe thick bars, hinge knots, root mats, and latch jaws have visible margins for later cutting.
- Danger read comes from closing thorn-bars, glowing hinge polyps, and clamp teeth, not baked-in particles or scenery.

## Candidate Checks

- Both side pillars and crown bridge are visibly fused by living branching coral tissue, not stone architecture.
- Trap bars grow from the same crown with soft polyp hinge knots; no detached prop bars or portcullis hardware.
- Thorn arms, roots, crown, and clamp spines share one black-coral palette and lighting direction.

## Riggable Parts

- left root mat
- right root mat
- left pillar trunk
- right pillar trunk
- upper crown bridge torso
- central descending portcullis bar cluster
- near folding thorn gate arm
- far folding thorn gate arm
- left hinge polyp knot
- right hinge polyp knot
- lower clamp teeth / latch spines
- glow-polyp warning overlay

## Reject Risks

- Avoid a literal stone ruin gate with coral decoration; the gate must be the organism.
- Avoid detached bars or symmetrical prop pieces that feel assembled instead of grown.
- Avoid thin hairlike coral branches that cannot be cropped or read at game scale.
- Avoid magenta, hot pink, or purple body values that will conflict with the chroma key.
- Keep bubbles, slam VFX, rubble, sand, and lighting effects separate from the base source.

## Commands

```bash
npm run sandbox:preview -- --id black-coral-gate --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:accept -- --id black-coral-gate --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id black-coral-gate --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```

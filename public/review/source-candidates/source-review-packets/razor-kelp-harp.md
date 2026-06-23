# Source Review Packet: Razor Kelp Harp (razor-kelp-harp)

Status: `ready-for-human-review`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

- thumbnail available
- magenta key preview available
- image validation passed
- source sandbox render check passed (not approval)
- human approval missing

## Links

- Source: `public/assets/generated/fauna-razor-kelp-harp-whole-source.png`
- Thumbnail: `thumbs/razor-kelp-harp-source-thumb.png`
- Magenta key preview: `key-previews/razor-kelp-harp-key-preview.png`
- Sandbox screenshot: `/mnt/nxt-dev/water9/tools/scratch/source-preview-visuals/source-razor-kelp-harp__source-review__idle.png`
- Contract: `public/review/source-candidates/art-contracts/razor-kelp-harp.md`

## Blockers

- human source approval is still missing

## Required Read

- One cohesive kelp-like ambusher, not a loose pile of seaweed strips.
- Root holdfast and central crown are visible so the entity reads as anchored and sessile.
- Five to seven broad serrated blade-fronds create clear danger lanes at sprite scale.
- Gas bladders, hinge knots, and curled blade tips remain crop-safe for later articulation.
- No water column, sand floor, bubbles, shadows, or detached plant debris baked into the source.

## Candidate Checks

- A single holdfast root and central crown node are visible as the shared origin for the whole creature.
- Every serrated blade grows from the crown node with a readable hinge knot; no loose seaweed strips or debris.
- Blade lanes form a crop-safe kelp ambush fan with no literal harp strings, floor, current streaks, or slash VFX baked in.

## Riggable Parts

- single organic bull-kelp holdfast tissue pad
- central crown node
- left outer blade-frond
- left inner blade-frond
- front cutting blade-frond
- right inner blade-frond
- right outer blade-frond
- gas bladder cluster
- integrated serrated blade edges
- curling tip hooks
- root tendril skirt

## Reject Risks

- Avoid thin spaghetti seaweed that cannot be cropped or rigged.
- Avoid a generic plant clump; the holdfast, crown, and blade lanes must define one creature.
- Avoid magenta, hot pink, or purple body colors that may key out with the background.
- Avoid loose detached strips or floating debris that look like separate props.
- Keep slash trails, bubbles, and water distortion as separate VFX rather than baked art.

## Commands

```bash
npm run sandbox:preview -- --id razor-kelp-harp --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:accept -- --id razor-kelp-harp --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id razor-kelp-harp --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```

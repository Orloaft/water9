# Source Review Packet: Saber Viperfish (saber-viperfish)

Status: `ready-for-human-review`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

- thumbnail available
- magenta key preview available
- image validation passed
- source sandbox render check passed (not approval)
- human approval missing

## Links

- Source: `public/assets/generated/fauna-saber-viperfish-whole-source.png`
- Thumbnail: `thumbs/saber-viperfish-source-thumb.png`
- Magenta key preview: `key-previews/saber-viperfish-key-preview.png`
- Sandbox screenshot: `/mnt/nxt-dev/water9/tools/scratch/source-preview-visuals/source-saber-viperfish__source-review__idle.png`
- Contract: `public/review/source-candidates/art-contracts/saber-viperfish.md`

## Blockers

- human source approval is still missing

## Required Read

- One whole viperfish-like vertebrate, not a barracuda, dragon, or metal spear device.
- Oversized saber teeth and unhinged jaw are the first danger read.
- Photophore belly chain, dorsal lure spine, fins, tail, and skull share one biological material language.
- Teeth are large readable fang shapes rather than many tiny noisy needles.
- No motion streaks, target reticle, bubbles, prey fish, lighting beams, or shadow baked into the source.

## Candidate Checks

- Dash predator read: reject if the output reads as a decorative eel or generic fish without an obvious forward bite/lunge axis.
- Jaw crop read: saber teeth, upper and lower jaw plates, skull hinge, body, fins, and tail must remain connected while leaving magenta negative space around crop edges.
- Small-scale silhouette read: long body, oversized mouth, saber teeth, and tail must remain readable at sprite scale without excess fins, duplicate heads, or loose tooth props.

## Riggable Parts

- armored skull wedge
- upper saber tooth row
- lower hinged jaw plate
- dark throat cavity plate
- left reflective eye plate
- right reflective eye plate
- dorsal lure spine
- photophore belly chain
- segmented body trunk
- left pectoral fin blade
- right pectoral fin blade
- forked tail fin

## Reject Risks

- Avoid a generic toothy fish; the jaw hinge, saber teeth, photophore chain, and dorsal lure must define it.
- Avoid too many tiny teeth that become visual noise; use fewer large crop-safe fangs.
- Avoid metal blades, harpoons, armor plating, or sci-fi weapon cues.
- Avoid baked dash trails or impact sparks that should be generated separately.
- Avoid magenta or hot pink light sources inside the creature.

## Commands

```bash
npm run sandbox:preview -- --id saber-viperfish --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:accept -- --id saber-viperfish --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id saber-viperfish --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```

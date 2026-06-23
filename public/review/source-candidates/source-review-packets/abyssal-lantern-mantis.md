# Source Review Packet: Abyssal Lantern Mantis (abyssal-lantern-mantis)

Status: `ready-for-human-review`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

- thumbnail available
- magenta key preview available
- image validation passed
- source sandbox render check passed (not approval)
- human approval missing

## Links

- Source: `public/assets/generated/fauna-abyssal-lantern-mantis-whole-source.png`
- Thumbnail: `thumbs/abyssal-lantern-mantis-source-thumb.png`
- Magenta key preview: `key-previews/abyssal-lantern-mantis-key-preview.png`
- Sandbox screenshot: `/mnt/nxt-dev/water9/tools/scratch/source-preview-visuals/source-abyssal-lantern-mantis__source-review__idle.png`
- Contract: `public/review/source-candidates/art-contracts/abyssal-lantern-mantis.md`

## Blockers

- human source approval is still missing

## Required Read

- One full-body mantis-shrimp-like predator with clear head, torso, abdomen, and tail fan.
- Coiled raptorial arms are the first danger read and must show punch direction.
- Eye stalks, antennae, strike arms, walking limbs, and tail fan need crop-safe separation.
- The creature should feel biological and crustacean, not a robot, gun, or armored fish.
- No punch streaks, shock rings, cave wall, bubbles, shadows, or light cones baked into the source.

## Candidate Checks

- Strike-arm read: reject if the raptorial appendages become spear tips, drills, guns, or mismatched weapon arms instead of paired blunt smasher clubs.
- Crustacean anatomy read: head, thorax, abdomen, walking limbs, eye stalks, and tail fan must remain one continuous mantis-shrimp body.
- Glow restraint read: cyan lantern spots must be small biological eye-stalk markings, not neon armor panels or baked aim beams.

## Riggable Parts

- plated forward head carapace
- left raised compound eye stalk
- right raised compound eye stalk
- left long antenna whip
- right long antenna whip
- compressed thorax torso plates
- left folded blunt-club raptorial strike arm
- right folded blunt-club raptorial strike arm
- small underside walking limb cluster
- rear segmented abdomen chain
- broad stabilizing tail fan

## Reject Risks

- Avoid robotic boxing gloves, cannons, drills, or mechanical pistons.
- Avoid spearer-style needle arms; this candidate uses blunt smasher clubs for a single clear attack read.
- Avoid tropical rainbow saturation that fights the abyssal threat tone.
- Avoid fish-like fins replacing the crustacean legs and plated abdomen.
- Avoid making the eye glow magenta or hot pink.
- Keep punch trails, shock rings, and aim beams as separate VFX.

## Commands

```bash
npm run sandbox:preview -- --id abyssal-lantern-mantis --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:accept -- --id abyssal-lantern-mantis --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id abyssal-lantern-mantis --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```

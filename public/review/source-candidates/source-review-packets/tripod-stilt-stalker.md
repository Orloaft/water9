# Source Review Packet: Tripod Stilt Stalker (tripod-stilt-stalker)

Status: `ready-for-human-review`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

- thumbnail available
- magenta key preview available
- image validation passed
- source sandbox render check passed (not approval)
- human approval missing

## Links

- Source: `public/assets/generated/fauna-tripod-stilt-stalker-whole-source.png`
- Thumbnail: `thumbs/tripod-stilt-stalker-source-thumb.png`
- Magenta key preview: `key-previews/tripod-stilt-stalker-key-preview.png`
- Sandbox screenshot: `/mnt/nxt-dev/water9/tools/scratch/source-preview-visuals/source-tripod-stilt-stalker__source-review__idle.png`
- Contract: `public/review/source-candidates/art-contracts/tripod-stilt-stalker.md`

## Blockers

- human source approval is still missing

## Required Read

- One whole tripodfish-like vertebrate, not a crab, spider, or walking machine.
- Three long stilt fin rays are the first silhouette read and clearly support the body.
- Upturned head, sensory pectoral rays, dorsal fin, body trunk, and tail stilt connect as one fish.
- Stilts and sensory rays are thick and separated enough for crop-safe articulation.
- No seabed, sand cloud, planted shadow, bubbles, particles, or floor contact marks baked into the source.

## Candidate Checks

- Three supports are translucent tapered fin rays with subtle membranes, not feet, knees, insect legs, or metal rods.
- The body remains a fish axis above the rays with readable head, trunk, dorsal fin, pectoral rays, and tail membrane.
- No seabed, floor contact marks, sediment mound, or prop supports are baked into the isolated source art.

## Riggable Parts

- narrow head capsule
- upturned mouth plate
- left glassy eye spot
- right glassy eye spot
- slender body torso
- small dorsal sail fin
- left pectoral sensory ray
- right pectoral sensory ray
- left pelvic tripod stilt
- right pelvic tripod stilt
- rear caudal tripod stilt
- thin tail membrane flag

## Reject Risks

- Avoid making the stilts look like insect legs or metal rods; they are elongated fish fin rays.
- Avoid including a floor plane or sediment mound because the source must remain isolated.
- Avoid hair-thin rays that cannot be selected, cropped, or animated cleanly.
- Avoid turning the fish into a spider silhouette; keep the head, trunk, fins, and tail readable.
- Avoid magenta, hot pink, or purple tissue near the background key color.

## Commands

```bash
npm run sandbox:preview -- --id tripod-stilt-stalker --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:accept -- --id tripod-stilt-stalker --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id tripod-stilt-stalker --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```

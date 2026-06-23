# Source Review Packet: Gulper Eel Maw (gulper-eel-maw)

Status: `ready-for-human-review`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

- thumbnail available
- magenta key preview available
- image validation passed
- source sandbox render check passed (not approval)
- human approval missing

## Links

- Source: `public/assets/generated/fauna-gulper-eel-maw-whole-source.png`
- Thumbnail: `thumbs/gulper-eel-maw-source-thumb.png`
- Magenta key preview: `key-previews/gulper-eel-maw-key-preview.png`
- Sandbox screenshot: `/mnt/nxt-dev/water9/tools/scratch/source-preview-visuals/source-gulper-eel-maw__source-review__idle.png`
- Contract: `public/review/source-candidates/art-contracts/gulper-eel-maw.md`

## Blockers

- human source approval is still missing

## Required Read

- One cohesive whole eel-like vertebrate, not a worm, snake, or loose floating mouth.
- Strict flat side-profile creature sheet pose: one continuous left-to-right eel spine line, mouth and head on the right, single whip tail on the left.
- Large lateral pelican-eel gape and throat pouch occupy the front 35-45% of the creature; connected eel body and tail occupy the rear 55-65%.
- Long whip tail, tiny head hinges, throat membrane, and lure tip remain connected as one riggable body.
- Jaw hoops and pouch membrane are thick enough to crop and animate at sprite scale.
- Visible continuous anatomy chain: upper jaw hoop and lower jaw hoop pivot on the same tiny skull collar, skull collar connects to narrow neck, neck connects to ribbon body, ribbon body tapers into one whip tail with cyan lure bulb.
- Lateral-axis read: all major anatomy follows one side-profile eel axis from mouth/right to tail/left; reject if the image reads as radial, front-facing, mirrored, or multi-limbed.
- No water vortex, prey fish, bubbles, blackwater haze, floor plane, or cast shadow baked into the source.

## Candidate Checks

- Lateral-axis read: all major anatomy follows one side-profile eel axis from mouth/right to tail/left; reject if the image reads as radial, front-facing, mirrored, or multi-limbed.
- Spatial ratio read: mouth pouch occupies roughly the front 35-45% while connected body and tail occupy the rear 55-65%, preventing a detached maw or portal-creature read.
- Rig crop read: jaw hoops, pouch membrane, pectoral fins, tail base, and tail lure have visible magenta negative space around their outer edges while remaining connected at the roots.

## Riggable Parts

- upper hinged jaw hoop
- lower hinged jaw hoop
- expandable throat pouch membrane
- small skull hinge collar
- dark inner mouth plate
- narrow eel neck segment
- front ribbon body segment
- rear whip tail segment
- tail-tip lure bulb
- left tiny pectoral fin
- right tiny pectoral fin
- gill slit seam plates

## Reject Risks

- Avoid a generic snake or leech; keep the tiny skull, huge mouth pouch, and long eel body visible.
- Avoid a detached monster mouth, front-facing circular portal mouth, extra eel heads, duplicated body segments, or tentacled radial creature; all jaw and pouch structures must connect to the body.
- Avoid centered radial composition, mirrored front-facing views, circular portal mouths, starburst layouts, repeated curled appendages, or any multi-limbed silhouette.
- Avoid armor plates, horns, spikes, teeth crowns, suction-cup pores, crab anatomy, octopus anatomy, or tentacle anatomy; keep plain soft pelican-eel biology.
- Avoid making suction currents part of the base sprite; pull effects should be separate VFX.
- Avoid bright magenta, hot pink, or purple anatomy that conflicts with chroma keying.
- Avoid over-detailing the black body so the hinge zones and lure remain readable.

## Commands

```bash
npm run sandbox:preview -- --id gulper-eel-maw --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:accept -- --id gulper-eel-maw --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id gulper-eel-maw --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```

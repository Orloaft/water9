# Source Review Packet: Reef Lion Moray (reef-lion-moray)

Status: `ready-for-human-review`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

- thumbnail available
- magenta key preview available
- image validation passed
- source sandbox render check passed (not approval)
- human approval missing

## Links

- Source: `public/assets/generated/fauna-reef-lion-moray-whole-source.png`
- Thumbnail: `thumbs/reef-lion-moray-source-thumb.png`
- Magenta key preview: `key-previews/reef-lion-moray-key-preview.png`
- Sandbox screenshot: `/mnt/nxt-dev/water9/tools/scratch/source-preview-visuals/source-reef-lion-moray__source-review__idle.png`
- Contract: `public/review/source-candidates/art-contracts/reef-lion-moray.md`

## Blockers

- human source approval is still missing

## Required Read

- One cohesive vertebrate hybrid, not a separate eel wrapped in decorative lionfish fins.
- Moray head and flared venom spine fan are the first reads at game scale.
- Eel torso, jaws, pectoral fans, dorsal spines, tail coil, and cheek frills remain visibly connected.
- Spines and fin membranes are broad enough to crop and animate without becoming noisy feathers.
- No reef wall, cave hole, coral scenery, sand plume, shadow, bubbles, or poison cloud baked into the source.

## Candidate Checks

- Attachment read: pectoral fans must root behind the gill pouch and dorsal spines must root along the eel back; reject loose pasted fin sheets.
- Vertebrate continuity read: head, throat, torso coil, tail, jaws, cheek frills, and fins must share one continuous eel body axis.
- Fin readability read: venom rays must be broad crop-safe biological fins, not feathers, wings, ornamental dragon frills, or noisy hairlines.

## Riggable Parts

- blunt moray head plate
- upper hooked jaw plate
- lower hinged jaw plate
- inner bite mouth plate
- throat gill pouch
- sinuous eel torso coil
- folding dorsal venom spine fan
- left striped pectoral fan
- right striped pectoral fan
- cheek frill whisker cluster
- banded tail coil segment
- tail blade fin

## Reject Risks

- Avoid a collage of eel plus loose lionfish fins; the hybrid must read as one continuous vertebrate.
- Avoid thin hairlike spines that disappear at sprite scale; use broad crop-safe venom rays.
- Avoid including reef scenery, cave darkness, or coral props in the isolated source.
- Avoid making the fins look like decorative wings instead of biological pectoral and dorsal fins.
- Avoid magenta, hot pink, or purple warning stripes that could interfere with keying.

## Commands

```bash
npm run sandbox:preview -- --id reef-lion-moray --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:accept -- --id reef-lion-moray --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id reef-lion-moray --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```

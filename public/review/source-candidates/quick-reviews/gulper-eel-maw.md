# Source Quick Review: Gulper Eel Maw (gulper-eel-maw)

Generated: `2026-06-18T17:06:58.339Z`
Review status: `ready-for-human-review`
Ready for human source review: `true`

This page consolidates source-review evidence only. It does not approve the source; a human still has to run `npm run source:accept` with specific scores and notes.

## Evidence

- Source: `public/assets/generated/fauna-gulper-eel-maw-whole-source.png`
- Source image: /assets/generated/fauna-gulper-eel-maw-whole-source.png
- Thumbnail: /review/source-candidates/thumbs/gulper-eel-maw-source-thumb.png
- Magenta key preview: /review/source-candidates/key-previews/gulper-eel-maw-key-preview.png
- Sandbox screenshot: /review/source-candidates/quick-reviews/gulper-eel-maw-source-preview.png
- Articulation plan preview: /review/articulated/gulper-eel-maw-plan-preview.png
- Contract: `public/review/source-candidates/art-contracts/gulper-eel-maw.md`

## Metrics

- Image validation failures: none
- Source size: 1536x1024
- Subject size: 1435x418
- Background ratio: 0.8711
- Inner magenta ratio: 0
- Preview failures: none

## Blockers

- human source approval is still missing

## Approval Checklist

| Check | Visual flag | Score flag | Note flag |
| --- | --- | --- | --- |
| whole-creature-cohesion | yes | yes | yes |
| part-continuity-cohesion | yes | yes | yes |
| readable-silhouette | yes | yes | yes |
| no-collage-artifacts | yes | yes | yes |
| non-placeholder-art-direction | yes | yes | yes |
| crop-safe-anatomy | yes | yes | yes |
| clean-magenta-key | yes | yes | yes |
| gameplay-read | yes | yes | yes |
| neutral-riggable-pose | yes | yes | yes |
| visible-attack-lane | yes | yes | yes |

## Candidate Contract Checks

- Lateral-axis read: all major anatomy follows one side-profile eel axis from mouth/right to tail/left; reject if the image reads as radial, front-facing, mirrored, or multi-limbed.
- Spatial ratio read: mouth pouch occupies roughly the front 35-45% while connected body and tail occupy the rear 55-65%, preventing a detached maw or portal-creature read.
- Rig crop read: jaw hoops, pouch membrane, pectoral fins, tail base, and tail lure have visible magenta negative space around their outer edges while remaining connected at the roots.

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
npm run source:accept -- --id gulper-eel-maw --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id gulper-eel-maw --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```


# Source Quick Review: Reef Lion Moray (reef-lion-moray)

Generated: `2026-06-18T17:06:58.342Z`
Review status: `ready-for-human-review`
Ready for human source review: `true`

This page consolidates source-review evidence only. It does not approve the source; a human still has to run `npm run source:accept` with specific scores and notes.

## Evidence

- Source: `public/assets/generated/fauna-reef-lion-moray-whole-source.png`
- Source image: /assets/generated/fauna-reef-lion-moray-whole-source.png
- Thumbnail: /review/source-candidates/thumbs/reef-lion-moray-source-thumb.png
- Magenta key preview: /review/source-candidates/key-previews/reef-lion-moray-key-preview.png
- Sandbox screenshot: /review/source-candidates/quick-reviews/reef-lion-moray-source-preview.png
- Articulation plan preview: /review/articulated/reef-lion-moray-plan-preview.png
- Contract: `public/review/source-candidates/art-contracts/reef-lion-moray.md`

## Metrics

- Image validation failures: none
- Source size: 1536x1024
- Subject size: 1438x408
- Background ratio: 0.8064
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

- Attachment read: pectoral fans must root behind the gill pouch and dorsal spines must root along the eel back; reject loose pasted fin sheets.
- Vertebrate continuity read: head, throat, torso coil, tail, jaws, cheek frills, and fins must share one continuous eel body axis.
- Fin readability read: venom rays must be broad crop-safe biological fins, not feathers, wings, ornamental dragon frills, or noisy hairlines.

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
npm run source:accept -- --id reef-lion-moray --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id reef-lion-moray --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```


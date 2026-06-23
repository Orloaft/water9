# Source Quick Review: Glass Sponge Sentinel (glass-sponge-sentinel)

Generated: `2026-06-18T17:06:58.326Z`
Review status: `ready-for-human-review`
Ready for human source review: `true`

This page consolidates source-review evidence only. It does not approve the source; a human still has to run `npm run source:accept` with specific scores and notes.

## Evidence

- Source: `public/assets/generated/fauna-glass-sponge-sentinel-whole-source.png`
- Source image: /assets/generated/fauna-glass-sponge-sentinel-whole-source.png
- Thumbnail: /review/source-candidates/thumbs/glass-sponge-sentinel-source-thumb.png
- Magenta key preview: /review/source-candidates/key-previews/glass-sponge-sentinel-key-preview.png
- Sandbox screenshot: /review/source-candidates/quick-reviews/glass-sponge-sentinel-source-preview.png
- Articulation plan preview: /review/articulated/glass-sponge-sentinel-plan-preview.png
- Contract: `public/review/source-candidates/art-contracts/glass-sponge-sentinel.md`

## Metrics

- Image validation failures: none
- Source size: 1536x1024
- Subject size: 519x667
- Background ratio: 0.8542
- Inner magenta ratio: 0.00081
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

- Sessile sponge read: reject if the output reads as a crystal turret, cannon, coral fan, or free-floating weapon instead of one anchored vase-like sponge.
- Rim attachment read: needle-petal shutters and spicule crown must visibly grow from the flared rim with no detached shards or projectile pieces in the source.
- Lattice readability read: cross-braced ribs must be bold enough to survive 64px preview without dissolving into lace noise.

## Reject Risks

- Avoid a generic coral fan or sea plant; it must read as one vase-like glass sponge organism.
- Avoid metal turrets, guns, cannons, crystals, or sci-fi machinery; needles are biological silica spicules.
- Avoid dense lace detail that becomes noise at sprite scale; use bold crop-safe ribs and a few large needle petals.
- Avoid multiple separate sponge colonies; generate one cohesive whole-source creature with one clear silhouette.
- Keep pure magenta only in the background and keep all anatomy fully inside the crop.

## Commands

```bash
npm run sandbox:preview -- --id glass-sponge-sentinel --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:accept -- --id glass-sponge-sentinel --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id glass-sponge-sentinel --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```


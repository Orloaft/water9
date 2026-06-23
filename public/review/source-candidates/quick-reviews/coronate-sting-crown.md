# Source Quick Review: Coronate Sting Crown (coronate-sting-crown)

Generated: `2026-06-18T17:06:58.332Z`
Review status: `ready-for-human-review`
Ready for human source review: `true`

This page consolidates source-review evidence only. It does not approve the source; a human still has to run `npm run source:accept` with specific scores and notes.

## Evidence

- Source: `public/assets/generated/fauna-coronate-sting-crown-whole-source.png`
- Source image: /assets/generated/fauna-coronate-sting-crown-whole-source.png
- Thumbnail: /review/source-candidates/thumbs/coronate-sting-crown-source-thumb.png
- Magenta key preview: /review/source-candidates/key-previews/coronate-sting-crown-key-preview.png
- Sandbox screenshot: /review/source-candidates/quick-reviews/coronate-sting-crown-source-preview.png
- Articulation plan preview: /review/articulated/coronate-sting-crown-plan-preview.png
- Contract: `public/review/source-candidates/art-contracts/coronate-sting-crown.md`

## Metrics

- Image validation failures: none
- Source size: 1536x1024
- Subject size: 728x918
- Background ratio: 0.733
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

- Deep bell groove and chunky coronate lappet rim are visible; reject smooth generic umbrella jellyfish.
- Exactly four thick readable tentacles trail from the bell with visible underside roots; no hair curtain, swarm, or many-thread noise.
- Oral arms, lappets, bell skirt, and tentacles remain one cnidarian body with clear crop-safe hinge zones.

## Reject Risks

- Avoid a generic umbrella jellyfish; crown lappets and deep bell groove must be obvious.
- Avoid hair-thin tentacle noise that cannot be cut or rigged.
- Avoid magenta, pink, or purple body colors that conflict with chroma keying.
- Avoid multiple jellyfish or a decorative swarm.
- Keep sting flashes, shock rings, and bubbles as separate VFX rather than baked source art.

## Commands

```bash
npm run sandbox:preview -- --id coronate-sting-crown --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:accept -- --id coronate-sting-crown --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id coronate-sting-crown --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```


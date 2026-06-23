# Source Quick Review: Predatory Tunicate Maw (predatory-tunicate-maw)

Generated: `2026-06-18T17:06:58.335Z`
Review status: `ready-for-human-review`
Ready for human source review: `true`

This page consolidates source-review evidence only. It does not approve the source; a human still has to run `npm run source:accept` with specific scores and notes.

## Evidence

- Source: `public/assets/generated/fauna-predatory-tunicate-maw-whole-source.png`
- Source image: /assets/generated/fauna-predatory-tunicate-maw-whole-source.png
- Thumbnail: /review/source-candidates/thumbs/predatory-tunicate-maw-source-thumb.png
- Magenta key preview: /review/source-candidates/key-previews/predatory-tunicate-maw-key-preview.png
- Sandbox screenshot: /review/source-candidates/quick-reviews/predatory-tunicate-maw-source-preview.png
- Articulation plan preview: /review/articulated/predatory-tunicate-maw-plan-preview.png
- Contract: `public/review/source-candidates/art-contracts/predatory-tunicate-maw.md`

## Metrics

- Image validation failures: none
- Source size: 1584x1072
- Subject size: 924x888
- Background ratio: 0.7719
- Inner magenta ratio: 0.00006
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

- The mouth reads as soft paired siphon lips with rounded rim papillae, not hard jaws, teeth, beak, clam shell, or flytrap petals.
- Flexible stalk, anchor foot, tunic body, mouth lips, side siphon, and organ sac remain one soft tunicate organism.
- Translucency preserves a readable silhouette at game scale and avoids pink or magenta tissue near the chroma key.

## Reject Risks

- Avoid making it a clam, venus flytrap plant, or fantasy mouth monster; preserve tunicate softness and siphon anatomy.
- Avoid hard teeth, bones, metal jaws, or mechanical hinges.
- Avoid transparency so faint that the silhouette disappears at game scale.
- Avoid magenta, hot pink, or purple body tones that interfere with chroma keying.
- Keep mucus strands, bite impacts, and prey silhouettes as separate VFX.
- Reject teeth, angler lures, tentacles, plant petals, clam shells, and pink or magenta tissue near the key color.

## Commands

```bash
npm run sandbox:preview -- --id predatory-tunicate-maw --kind source --serve --open --visual
npm run source:image-check
npm run source:preview-check
npm run source:accept -- --id predatory-tunicate-maw --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id predatory-tunicate-maw --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```


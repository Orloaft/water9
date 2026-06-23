# Source Review Packet: Predatory Tunicate Maw (predatory-tunicate-maw)

Status: `ready-for-human-review`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

- thumbnail available
- magenta key preview available
- image validation passed
- source sandbox render check passed (not approval)
- human approval missing

## Links

- Source: `public/assets/generated/fauna-predatory-tunicate-maw-whole-source.png`
- Thumbnail: `thumbs/predatory-tunicate-maw-source-thumb.png`
- Magenta key preview: `key-previews/predatory-tunicate-maw-key-preview.png`
- Sandbox screenshot: `/mnt/nxt-dev/water9/tools/scratch/source-preview-visuals/source-predatory-tunicate-maw__source-review__idle.png`
- Contract: `public/review/source-candidates/art-contracts/predatory-tunicate-maw.md`

## Blockers

- human source approval is still missing

## Required Read

- One rooted soft-bodied tunicate creature, not a plant, clam, or anemone.
- Large open siphon mouth is the first danger read.
- Upper and lower mouth lobes are thick and separated for hinge animation.
- Stalk, anchor foot, tunic body, and internal folds remain connected as one organism.
- No surrounding rock wall, sediment, prey fish, particles, or shadows baked into the source.

## Candidate Checks

- The mouth reads as soft paired siphon lips with rounded rim papillae, not hard jaws, teeth, beak, clam shell, or flytrap petals.
- Flexible stalk, anchor foot, tunic body, mouth lips, side siphon, and organ sac remain one soft tunicate organism.
- Translucency preserves a readable silhouette at game scale and avoids pink or magenta tissue near the chroma key.

## Riggable Parts

- anchor foot pad
- flexible stalk
- main translucent tunic body
- upper siphon jaw lobe
- lower siphon jaw lobe
- left lip ridge
- right lip ridge
- inner filter fold fan
- internal organ sac
- small side siphon
- rim toothlike papillae
- soft siphon lip membrane

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
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:accept -- --id predatory-tunicate-maw --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json
npm run source:accept -- --id predatory-tunicate-maw --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json
```

# Water 9 Source Review Sequencer

Generated: `2026-06-18T17:21:08.263Z`

Deterministic routing for source-review work. This page coordinates approval-ready candidates with critic-regeneration health so the pipeline does not confuse placeholder, no-op, or unreviewed art with production progress.

This sequencer does not approve source art, does not accept threats, and never counts preview-only work toward the 20-threat quality gate.

## Summary

- Candidates: 20
- Approval-ready: 20
- Critic regeneration required: 0
- Distinct replacements ready: 0
- No-op replacements: 0
- Missing replacements: 0
- Invalid replacements: 0
- Approved sources: 0
- Counts toward gate: 0
- Next lane: `approval-ready`
- Next target: `brine-crown`

## Lane Counts

- regenerate-distinct-ready: 0
- regenerate-noop: 0
- regenerate-missing: 0
- regenerate-invalid: 0
- approval-ready: 20
- approved: 0

## Next Commands

```bash
npm run source:quick-review -- --id brine-crown
npm run sandbox:preview -- --id source-brine-crown --with diver --serve --open --visual
npm run sandbox:preview -- --id brine-crown --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/brine-crown-starter-plan.json
npm run source:accept -- --id brine-crown --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
```

## Candidates

| ID | Species | Lane | Health | Counts toward gate | Recommended first command |
| --- | --- | --- | --- | ---: | --- |
| `brine-crown` | Brine Crown | approval-ready | replacement-applied | no | `npm run source:quick-review -- --id brine-crown` |
| `glass-sponge-sentinel` | Glass Sponge Sentinel | approval-ready | none | no | `npm run source:quick-review -- --id glass-sponge-sentinel` |
| `black-coral-gate` | Black Coral Gate | approval-ready | replacement-applied | no | `npm run source:quick-review -- --id black-coral-gate` |
| `reliquary-siphonophore` | Reliquary Siphonophore | approval-ready | none | no | `npm run source:quick-review -- --id reliquary-siphonophore` |
| `hadal-trencher-isopod` | Hadal Trencher Isopod | approval-ready | none | no | `npm run source:quick-review -- --id hadal-trencher-isopod` |
| `vent-claw-yeti` | Vent-Claw Yeti | approval-ready | replacement-applied | no | `npm run source:quick-review -- --id vent-claw-yeti` |
| `abyssal-lantern-mantis` | Abyssal Lantern Mantis | approval-ready | none | no | `npm run source:quick-review -- --id abyssal-lantern-mantis` |
| `trench-harvest-sea-spider` | Trench Harvest Sea Spider | approval-ready | replacement-applied | no | `npm run source:quick-review -- --id trench-harvest-sea-spider` |
| `coronate-sting-crown` | Coronate Sting Crown | approval-ready | none | no | `npm run source:quick-review -- --id coronate-sting-crown` |
| `chain-vein-siphonophore` | Chain Vein Siphonophore | approval-ready | replacement-applied | no | `npm run source:quick-review -- --id chain-vein-siphonophore` |
| `vampire-cloak-squid` | Vampire Cloak Squid | approval-ready | replacement-applied | no | `npm run source:quick-review -- --id vampire-cloak-squid` |
| `predatory-tunicate-maw` | Predatory Tunicate Maw | approval-ready | replacement-applied | no | `npm run source:quick-review -- --id predatory-tunicate-maw` |
| `razor-kelp-harp` | Razor Kelp Harp | approval-ready | none | no | `npm run source:quick-review -- --id razor-kelp-harp` |
| `lantern-anemone-pit` | Lantern Anemone Pit | approval-ready | replacement-applied | no | `npm run source:quick-review -- --id lantern-anemone-pit` |
| `brine-mycelium-shelf` | Brine Mycelium Shelf | approval-ready | none | no | `npm run source:quick-review -- --id brine-mycelium-shelf` |
| `thorn-fan-coralline` | Thorn Fan Coralline | approval-ready | none | no | `npm run source:quick-review -- --id thorn-fan-coralline` |
| `gulper-eel-maw` | Gulper Eel Maw | approval-ready | replacement-applied | no | `npm run source:quick-review -- --id gulper-eel-maw` |
| `saber-viperfish` | Saber Viperfish | approval-ready | none | no | `npm run source:quick-review -- --id saber-viperfish` |
| `tripod-stilt-stalker` | Tripod Stilt Stalker | approval-ready | none | no | `npm run source:quick-review -- --id tripod-stilt-stalker` |
| `reef-lion-moray` | Reef Lion Moray | approval-ready | none | no | `npm run source:quick-review -- --id reef-lion-moray` |

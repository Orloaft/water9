# Water 9 Source Replace Runway

Generated: `2026-06-18T17:07:17.201Z`

This runway is for replacing weak existing source art through an intentional overwrite workflow. It does not approve source art and it does not bypass human review. Replacement uses an explicit `--overwrite` ingest command, rejects byte-identical no-op replacements, then rebuilds the existing approval evidence.

## Summary

- Candidates: 20
- Existing sources: 20
- Replaceable existing sources: 20
- Human approved sources: 0
- Prompt files: `public/review/source-candidates/replace-runway-prompts`

## Safe Replacement Loop

1. Inspect the current source, key preview, sandbox preview, visual board, and plan preview.
2. Generate a better whole-source organism from the replacement prompt.
3. Save it to `tools/source-inbox/<id>.png`.
4. Run the dry-run replacement command and inspect the report. The ingest guard refuses byte-identical replacements unless `--allow-identical-overwrite` is passed for an intentional metadata repair.
5. Apply replacement only if the dry run and image check are clean.
6. Rebuild source review evidence and return to the approval runway.

## Replacement Boundary

This page stages source-art replacement only. Human approval still happens in the source approval runway after regenerated evidence has been inspected.

## Candidates

| Candidate | Species | Replaceable | Approved | Dry-run replace |
| --- | --- | ---: | ---: | --- |
| brine-crown | Brine Crown | yes | no | `npm run source:ingest -- --id brine-crown --image tools/source-inbox/brine-crown.png --copy --overwrite --dry-run` |
| glass-sponge-sentinel | Glass Sponge Sentinel | yes | no | `npm run source:ingest -- --id glass-sponge-sentinel --image tools/source-inbox/glass-sponge-sentinel.png --copy --overwrite --dry-run` |
| black-coral-gate | Black Coral Gate | yes | no | `npm run source:ingest -- --id black-coral-gate --image tools/source-inbox/black-coral-gate.png --copy --overwrite --dry-run` |
| reliquary-siphonophore | Reliquary Siphonophore | yes | no | `npm run source:ingest -- --id reliquary-siphonophore --image tools/source-inbox/reliquary-siphonophore.png --copy --overwrite --dry-run` |
| hadal-trencher-isopod | Hadal Trencher Isopod | yes | no | `npm run source:ingest -- --id hadal-trencher-isopod --image tools/source-inbox/hadal-trencher-isopod.png --copy --overwrite --dry-run` |
| vent-claw-yeti | Vent-Claw Yeti | yes | no | `npm run source:ingest -- --id vent-claw-yeti --image tools/source-inbox/vent-claw-yeti.png --copy --overwrite --dry-run` |
| abyssal-lantern-mantis | Abyssal Lantern Mantis | yes | no | `npm run source:ingest -- --id abyssal-lantern-mantis --image tools/source-inbox/abyssal-lantern-mantis.png --copy --overwrite --dry-run` |
| trench-harvest-sea-spider | Trench Harvest Sea Spider | yes | no | `npm run source:ingest -- --id trench-harvest-sea-spider --image tools/source-inbox/trench-harvest-sea-spider.png --copy --overwrite --dry-run` |
| coronate-sting-crown | Coronate Sting Crown | yes | no | `npm run source:ingest -- --id coronate-sting-crown --image tools/source-inbox/coronate-sting-crown.png --copy --overwrite --dry-run` |
| chain-vein-siphonophore | Chain Vein Siphonophore | yes | no | `npm run source:ingest -- --id chain-vein-siphonophore --image tools/source-inbox/chain-vein-siphonophore.png --copy --overwrite --dry-run` |
| vampire-cloak-squid | Vampire Cloak Squid | yes | no | `npm run source:ingest -- --id vampire-cloak-squid --image tools/source-inbox/vampire-cloak-squid.png --copy --overwrite --dry-run` |
| predatory-tunicate-maw | Predatory Tunicate Maw | yes | no | `npm run source:ingest -- --id predatory-tunicate-maw --image tools/source-inbox/predatory-tunicate-maw.png --copy --overwrite --dry-run` |
| razor-kelp-harp | Razor Kelp Harp | yes | no | `npm run source:ingest -- --id razor-kelp-harp --image tools/source-inbox/razor-kelp-harp.png --copy --overwrite --dry-run` |
| lantern-anemone-pit | Lantern Anemone Pit | yes | no | `npm run source:ingest -- --id lantern-anemone-pit --image tools/source-inbox/lantern-anemone-pit.png --copy --overwrite --dry-run` |
| brine-mycelium-shelf | Brine Mycelium Shelf | yes | no | `npm run source:ingest -- --id brine-mycelium-shelf --image tools/source-inbox/brine-mycelium-shelf.png --copy --overwrite --dry-run` |
| thorn-fan-coralline | Thorn Fan Coralline | yes | no | `npm run source:ingest -- --id thorn-fan-coralline --image tools/source-inbox/thorn-fan-coralline.png --copy --overwrite --dry-run` |
| gulper-eel-maw | Gulper Eel Maw | yes | no | `npm run source:ingest -- --id gulper-eel-maw --image tools/source-inbox/gulper-eel-maw.png --copy --overwrite --dry-run` |
| saber-viperfish | Saber Viperfish | yes | no | `npm run source:ingest -- --id saber-viperfish --image tools/source-inbox/saber-viperfish.png --copy --overwrite --dry-run` |
| tripod-stilt-stalker | Tripod Stilt Stalker | yes | no | `npm run source:ingest -- --id tripod-stilt-stalker --image tools/source-inbox/tripod-stilt-stalker.png --copy --overwrite --dry-run` |
| reef-lion-moray | Reef Lion Moray | yes | no | `npm run source:ingest -- --id reef-lion-moray --image tools/source-inbox/reef-lion-moray.png --copy --overwrite --dry-run` |

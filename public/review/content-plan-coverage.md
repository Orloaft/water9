# Water 9 Plan Coverage

Generated: `2026-06-18T17:06:59.784Z`

This report tracks whether each source candidate has tangible articulation staging artifacts. Mechanical staging is not production acceptance; plans created with `--allow-unapproved` are staging evidence only and do not approve source art, runtime quality, or threat acceptance.

## Summary

- Candidates: 20
- Source images: 20
- Approved sources: 0
- Starter plans: 20
- Plan previews: 20
- Missing starter plans: 0
- Missing plan previews: 0
- Runtime registered: 20
- Accepted threats: 0

## Batch Commands

Mechanical staging for candidates missing a plan or preview:

```bash
# all candidates already have starter plans and previews
```

Validate every existing starter plan:

```bash
npm run articulated:plan-check -- --plan tools/scratch/brine-crown-starter-plan.json && npm run articulated:plan-check -- --plan tools/scratch/glass-sponge-sentinel-starter-plan.json && npm run articulated:plan-check -- --plan tools/scratch/black-coral-gate-starter-plan.json && npm run articulated:plan-check -- --plan tools/scratch/reliquary-siphonophore-starter-plan.json && npm run articulated:plan-check -- --plan tools/scratch/hadal-trencher-isopod-starter-plan.json && npm run articulated:plan-check -- --plan tools/scratch/vent-claw-yeti-starter-plan.json && npm run articulated:plan-check -- --plan tools/scratch/abyssal-lantern-mantis-starter-plan.json && npm run articulated:plan-check -- --plan tools/scratch/trench-harvest-sea-spider-starter-plan.json && npm run articulated:plan-check -- --plan tools/scratch/coronate-sting-crown-starter-plan.json && npm run articulated:plan-check -- --plan tools/scratch/chain-vein-siphonophore-starter-plan.json && npm run articulated:plan-check -- --plan tools/scratch/vampire-cloak-squid-starter-plan.json && npm run articulated:plan-check -- --plan tools/scratch/predatory-tunicate-maw-starter-plan.json && npm run articulated:plan-check -- --plan tools/scratch/razor-kelp-harp-starter-plan.json && npm run articulated:plan-check -- --plan tools/scratch/lantern-anemone-pit-starter-plan.json && npm run articulated:plan-check -- --plan tools/scratch/brine-mycelium-shelf-starter-plan.json && npm run articulated:plan-check -- --plan tools/scratch/thorn-fan-coralline-starter-plan.json && npm run articulated:plan-check -- --plan tools/scratch/gulper-eel-maw-starter-plan.json && npm run articulated:plan-check -- --plan tools/scratch/saber-viperfish-starter-plan.json && npm run articulated:plan-check -- --plan tools/scratch/tripod-stilt-stalker-starter-plan.json && npm run articulated:plan-check -- --plan tools/scratch/reef-lion-moray-starter-plan.json
```

Production plan prep for human-approved sources only:

```bash
# no source candidates are approved yet
```

## Candidates

| Candidate | Species | Source | Approved source | Plan | Preview | Runtime | Accepted | Mechanical staging command |
| --- | --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| brine-crown | Brine Crown | yes | no | yes | yes | brine-crown | no | `npm run articulated:prepare-plan -- --id brine-crown --plan tools/scratch/brine-crown-starter-plan.json --preview public/review/articulated/brine-crown-plan-preview.png --allow-unapproved` |
| glass-sponge-sentinel | Glass Sponge Sentinel | yes | no | yes | yes | glass-sponge-sentinel | no | `npm run articulated:prepare-plan -- --id glass-sponge-sentinel --plan tools/scratch/glass-sponge-sentinel-starter-plan.json --preview public/review/articulated/glass-sponge-sentinel-plan-preview.png --allow-unapproved` |
| black-coral-gate | Black Coral Gate | yes | no | yes | yes | black-coral-gate | no | `npm run articulated:prepare-plan -- --id black-coral-gate --plan tools/scratch/black-coral-gate-starter-plan.json --preview public/review/articulated/black-coral-gate-plan-preview.png --allow-unapproved` |
| reliquary-siphonophore | Reliquary Siphonophore | yes | no | yes | yes | reliquary-siphonophore | no | `npm run articulated:prepare-plan -- --id reliquary-siphonophore --plan tools/scratch/reliquary-siphonophore-starter-plan.json --preview public/review/articulated/reliquary-siphonophore-plan-preview.png --allow-unapproved` |
| hadal-trencher-isopod | Hadal Trencher Isopod | yes | no | yes | yes | hadal-trencher-isopod | no | `npm run articulated:prepare-plan -- --id hadal-trencher-isopod --plan tools/scratch/hadal-trencher-isopod-starter-plan.json --preview public/review/articulated/hadal-trencher-isopod-plan-preview.png --allow-unapproved` |
| vent-claw-yeti | Vent-Claw Yeti | yes | no | yes | yes | vent-claw-yeti | no | `npm run articulated:prepare-plan -- --id vent-claw-yeti --plan tools/scratch/vent-claw-yeti-starter-plan.json --preview public/review/articulated/vent-claw-yeti-plan-preview.png --allow-unapproved` |
| abyssal-lantern-mantis | Abyssal Lantern Mantis | yes | no | yes | yes | abyssal-lantern-mantis | no | `npm run articulated:prepare-plan -- --id abyssal-lantern-mantis --plan tools/scratch/abyssal-lantern-mantis-starter-plan.json --preview public/review/articulated/abyssal-lantern-mantis-plan-preview.png --allow-unapproved` |
| trench-harvest-sea-spider | Trench Harvest Sea Spider | yes | no | yes | yes | trench-harvest-sea-spider | no | `npm run articulated:prepare-plan -- --id trench-harvest-sea-spider --plan tools/scratch/trench-harvest-sea-spider-starter-plan.json --preview public/review/articulated/trench-harvest-sea-spider-plan-preview.png --allow-unapproved` |
| coronate-sting-crown | Coronate Sting Crown | yes | no | yes | yes | coronate-sting-crown | no | `npm run articulated:prepare-plan -- --id coronate-sting-crown --plan tools/scratch/coronate-sting-crown-starter-plan.json --preview public/review/articulated/coronate-sting-crown-plan-preview.png --allow-unapproved` |
| chain-vein-siphonophore | Chain Vein Siphonophore | yes | no | yes | yes | chain-vein-siphonophore | no | `npm run articulated:prepare-plan -- --id chain-vein-siphonophore --plan tools/scratch/chain-vein-siphonophore-starter-plan.json --preview public/review/articulated/chain-vein-siphonophore-plan-preview.png --allow-unapproved` |
| vampire-cloak-squid | Vampire Cloak Squid | yes | no | yes | yes | vampire-cloak-squid | no | `npm run articulated:prepare-plan -- --id vampire-cloak-squid --plan tools/scratch/vampire-cloak-squid-starter-plan.json --preview public/review/articulated/vampire-cloak-squid-plan-preview.png --allow-unapproved` |
| predatory-tunicate-maw | Predatory Tunicate Maw | yes | no | yes | yes | predatory-tunicate-maw | no | `npm run articulated:prepare-plan -- --id predatory-tunicate-maw --plan tools/scratch/predatory-tunicate-maw-starter-plan.json --preview public/review/articulated/predatory-tunicate-maw-plan-preview.png --allow-unapproved` |
| razor-kelp-harp | Razor Kelp Harp | yes | no | yes | yes | razor-kelp-harp | no | `npm run articulated:prepare-plan -- --id razor-kelp-harp --plan tools/scratch/razor-kelp-harp-starter-plan.json --preview public/review/articulated/razor-kelp-harp-plan-preview.png --allow-unapproved` |
| lantern-anemone-pit | Lantern Anemone Pit | yes | no | yes | yes | lantern-anemone-pit | no | `npm run articulated:prepare-plan -- --id lantern-anemone-pit --plan tools/scratch/lantern-anemone-pit-starter-plan.json --preview public/review/articulated/lantern-anemone-pit-plan-preview.png --allow-unapproved` |
| brine-mycelium-shelf | Brine Mycelium Shelf | yes | no | yes | yes | brine-mycelium-shelf | no | `npm run articulated:prepare-plan -- --id brine-mycelium-shelf --plan tools/scratch/brine-mycelium-shelf-starter-plan.json --preview public/review/articulated/brine-mycelium-shelf-plan-preview.png --allow-unapproved` |
| thorn-fan-coralline | Thorn Fan Coralline | yes | no | yes | yes | thorn-fan-coralline | no | `npm run articulated:prepare-plan -- --id thorn-fan-coralline --plan tools/scratch/thorn-fan-coralline-starter-plan.json --preview public/review/articulated/thorn-fan-coralline-plan-preview.png --allow-unapproved` |
| gulper-eel-maw | Gulper Eel Maw | yes | no | yes | yes | gulper-eel-maw | no | `npm run articulated:prepare-plan -- --id gulper-eel-maw --plan tools/scratch/gulper-eel-maw-starter-plan.json --preview public/review/articulated/gulper-eel-maw-plan-preview.png --allow-unapproved` |
| saber-viperfish | Saber Viperfish | yes | no | yes | yes | saber-viperfish | no | `npm run articulated:prepare-plan -- --id saber-viperfish --plan tools/scratch/saber-viperfish-starter-plan.json --preview public/review/articulated/saber-viperfish-plan-preview.png --allow-unapproved` |
| tripod-stilt-stalker | Tripod Stilt Stalker | yes | no | yes | yes | tripod-stilt-stalker | no | `npm run articulated:prepare-plan -- --id tripod-stilt-stalker --plan tools/scratch/tripod-stilt-stalker-starter-plan.json --preview public/review/articulated/tripod-stilt-stalker-plan-preview.png --allow-unapproved` |
| reef-lion-moray | Reef Lion Moray | yes | no | yes | yes | reef-lion-moray | no | `npm run articulated:prepare-plan -- --id reef-lion-moray --plan tools/scratch/reef-lion-moray-starter-plan.json --preview public/review/articulated/reef-lion-moray-plan-preview.png --allow-unapproved` |

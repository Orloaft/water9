# Water9 Content Vertical Slice Runway

Generated: `2026-06-18T17:07:21.550Z`

This is the per-creature route from source contract to magenta-key evidence, articulation plan, paired sandbox preview, and final human acceptance. Prototype screenshots do not count as accepted content.

Threats: `20`
Mechanically reviewable routes: `20/20`
Accepted threats: `0/20`
Next blocker: `awaiting-human-source-approval`

## Commands

```bash
npm run content:vertical-slice
npm run content:vertical-slice-check
npm run source:contracts && npm run source:contracts-check
npm run source:visual-board && npm run source:visual-board-check
npm run content:plan-coverage && npm run content:plan-coverage-check
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:quickstart && npm run sandbox:quickstart-check
npm run sandbox:visual -- --ids <runtime-id> --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run content:acceptance-audit-index && npm run content:acceptance-audit-index-check
npm run content:goal-gate
```

## Routes

| Rank | Candidate | State | Contract | Source/Key | Plan | Rig Quality | Runtime Sandbox | Runtime Visuals | Audit | Blockers |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `abyssal-lantern-mantis` Abyssal Lantern Mantis | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |
| 2 | `black-coral-gate` Black Coral Gate | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |
| 3 | `brine-crown` Brine Crown | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |
| 4 | `brine-mycelium-shelf` Brine Mycelium Shelf | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |
| 5 | `chain-vein-siphonophore` Chain Vein Siphonophore | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |
| 6 | `coronate-sting-crown` Coronate Sting Crown | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |
| 7 | `glass-sponge-sentinel` Glass Sponge Sentinel | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |
| 8 | `gulper-eel-maw` Gulper Eel Maw | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |
| 9 | `hadal-trencher-isopod` Hadal Trencher Isopod | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |
| 10 | `lantern-anemone-pit` Lantern Anemone Pit | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |
| 11 | `predatory-tunicate-maw` Predatory Tunicate Maw | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |
| 12 | `razor-kelp-harp` Razor Kelp Harp | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |
| 13 | `reef-lion-moray` Reef Lion Moray | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |
| 14 | `reliquary-siphonophore` Reliquary Siphonophore | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |
| 15 | `saber-viperfish` Saber Viperfish | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |
| 16 | `thorn-fan-coralline` Thorn Fan Coralline | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |
| 17 | `trench-harvest-sea-spider` Trench Harvest Sea Spider | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |
| 18 | `tripod-stilt-stalker` Tripod Stilt Stalker | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |
| 19 | `vampire-cloak-squid` Vampire Cloak Squid | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |
| 20 | `vent-claw-yeti` Vent-Claw Yeti | `awaiting-human-source-approval` | yes | yes | yes | yes | yes | yes | yes | human source approval missing<br>human threat acceptance missing |

## Route Commands

### Abyssal Lantern Mantis

Candidate: `abyssal-lantern-mantis`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id abyssal-lantern-mantis
npm run sandbox:preview -- --id source-abyssal-lantern-mantis --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/abyssal-lantern-mantis-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/abyssal-lantern-mantis-starter-plan.json --out public/review/articulated/abyssal-lantern-mantis-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/abyssal-lantern-mantis-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id abyssal-lantern-mantis --with diver --serve --open --visual
npm run sandbox:visual -- --ids abyssal-lantern-mantis --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids abyssal-lantern-mantis --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id abyssal-lantern-mantis --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id abyssal-lantern-mantis
npm run content:goal-gate
```

### Black Coral Gate

Candidate: `black-coral-gate`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id black-coral-gate
npm run sandbox:preview -- --id source-black-coral-gate --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/black-coral-gate-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/black-coral-gate-starter-plan.json --out public/review/articulated/black-coral-gate-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/black-coral-gate-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id black-coral-gate --with diver --serve --open --visual
npm run sandbox:visual -- --ids black-coral-gate --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids black-coral-gate --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id black-coral-gate --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id black-coral-gate
npm run content:goal-gate
```

### Brine Crown

Candidate: `brine-crown`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id brine-crown
npm run sandbox:preview -- --id source-brine-crown --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/brine-crown-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/brine-crown-starter-plan.json --out public/review/articulated/brine-crown-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/brine-crown-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id brine-crown --with diver --serve --open --visual
npm run sandbox:visual -- --ids brine-crown --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids brine-crown --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id brine-crown --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id brine-crown
npm run content:goal-gate
```

### Brine Mycelium Shelf

Candidate: `brine-mycelium-shelf`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id brine-mycelium-shelf
npm run sandbox:preview -- --id source-brine-mycelium-shelf --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/brine-mycelium-shelf-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/brine-mycelium-shelf-starter-plan.json --out public/review/articulated/brine-mycelium-shelf-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/brine-mycelium-shelf-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id brine-mycelium-shelf --with diver --serve --open --visual
npm run sandbox:visual -- --ids brine-mycelium-shelf --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids brine-mycelium-shelf --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id brine-mycelium-shelf --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id brine-mycelium-shelf
npm run content:goal-gate
```

### Chain Vein Siphonophore

Candidate: `chain-vein-siphonophore`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id chain-vein-siphonophore
npm run sandbox:preview -- --id source-chain-vein-siphonophore --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/chain-vein-siphonophore-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/chain-vein-siphonophore-starter-plan.json --out public/review/articulated/chain-vein-siphonophore-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/chain-vein-siphonophore-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id chain-vein-siphonophore --with diver --serve --open --visual
npm run sandbox:visual -- --ids chain-vein-siphonophore --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids chain-vein-siphonophore --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id chain-vein-siphonophore --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id chain-vein-siphonophore
npm run content:goal-gate
```

### Coronate Sting Crown

Candidate: `coronate-sting-crown`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id coronate-sting-crown
npm run sandbox:preview -- --id source-coronate-sting-crown --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/coronate-sting-crown-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/coronate-sting-crown-starter-plan.json --out public/review/articulated/coronate-sting-crown-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/coronate-sting-crown-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id coronate-sting-crown --with diver --serve --open --visual
npm run sandbox:visual -- --ids coronate-sting-crown --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids coronate-sting-crown --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id coronate-sting-crown --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id coronate-sting-crown
npm run content:goal-gate
```

### Glass Sponge Sentinel

Candidate: `glass-sponge-sentinel`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id glass-sponge-sentinel
npm run sandbox:preview -- --id source-glass-sponge-sentinel --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/glass-sponge-sentinel-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/glass-sponge-sentinel-starter-plan.json --out public/review/articulated/glass-sponge-sentinel-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/glass-sponge-sentinel-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id glass-sponge-sentinel --with diver --serve --open --visual
npm run sandbox:visual -- --ids glass-sponge-sentinel --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids glass-sponge-sentinel --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id glass-sponge-sentinel --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id glass-sponge-sentinel
npm run content:goal-gate
```

### Gulper Eel Maw

Candidate: `gulper-eel-maw`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id gulper-eel-maw
npm run sandbox:preview -- --id source-gulper-eel-maw --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/gulper-eel-maw-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/gulper-eel-maw-starter-plan.json --out public/review/articulated/gulper-eel-maw-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/gulper-eel-maw-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id gulper-eel-maw --with diver --serve --open --visual
npm run sandbox:visual -- --ids gulper-eel-maw --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids gulper-eel-maw --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id gulper-eel-maw --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id gulper-eel-maw
npm run content:goal-gate
```

### Hadal Trencher Isopod

Candidate: `hadal-trencher-isopod`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id hadal-trencher-isopod
npm run sandbox:preview -- --id source-hadal-trencher-isopod --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/hadal-trencher-isopod-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/hadal-trencher-isopod-starter-plan.json --out public/review/articulated/hadal-trencher-isopod-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/hadal-trencher-isopod-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id hadal-trencher-isopod --with diver --serve --open --visual
npm run sandbox:visual -- --ids hadal-trencher-isopod --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids hadal-trencher-isopod --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id hadal-trencher-isopod --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id hadal-trencher-isopod
npm run content:goal-gate
```

### Lantern Anemone Pit

Candidate: `lantern-anemone-pit`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id lantern-anemone-pit
npm run sandbox:preview -- --id source-lantern-anemone-pit --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/lantern-anemone-pit-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/lantern-anemone-pit-starter-plan.json --out public/review/articulated/lantern-anemone-pit-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/lantern-anemone-pit-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id lantern-anemone-pit --with diver --serve --open --visual
npm run sandbox:visual -- --ids lantern-anemone-pit --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids lantern-anemone-pit --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id lantern-anemone-pit --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id lantern-anemone-pit
npm run content:goal-gate
```

### Predatory Tunicate Maw

Candidate: `predatory-tunicate-maw`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id predatory-tunicate-maw
npm run sandbox:preview -- --id source-predatory-tunicate-maw --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/predatory-tunicate-maw-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/predatory-tunicate-maw-starter-plan.json --out public/review/articulated/predatory-tunicate-maw-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/predatory-tunicate-maw-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id predatory-tunicate-maw --with diver --serve --open --visual
npm run sandbox:visual -- --ids predatory-tunicate-maw --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids predatory-tunicate-maw --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id predatory-tunicate-maw --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id predatory-tunicate-maw
npm run content:goal-gate
```

### Razor Kelp Harp

Candidate: `razor-kelp-harp`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id razor-kelp-harp
npm run sandbox:preview -- --id source-razor-kelp-harp --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/razor-kelp-harp-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/razor-kelp-harp-starter-plan.json --out public/review/articulated/razor-kelp-harp-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/razor-kelp-harp-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id razor-kelp-harp --with diver --serve --open --visual
npm run sandbox:visual -- --ids razor-kelp-harp --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids razor-kelp-harp --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id razor-kelp-harp --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id razor-kelp-harp
npm run content:goal-gate
```

### Reef Lion Moray

Candidate: `reef-lion-moray`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id reef-lion-moray
npm run sandbox:preview -- --id source-reef-lion-moray --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/reef-lion-moray-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/reef-lion-moray-starter-plan.json --out public/review/articulated/reef-lion-moray-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/reef-lion-moray-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id reef-lion-moray --with diver --serve --open --visual
npm run sandbox:visual -- --ids reef-lion-moray --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids reef-lion-moray --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id reef-lion-moray --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id reef-lion-moray
npm run content:goal-gate
```

### Reliquary Siphonophore

Candidate: `reliquary-siphonophore`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id reliquary-siphonophore
npm run sandbox:preview -- --id source-reliquary-siphonophore --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/reliquary-siphonophore-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/reliquary-siphonophore-starter-plan.json --out public/review/articulated/reliquary-siphonophore-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/reliquary-siphonophore-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id reliquary-siphonophore --with diver --serve --open --visual
npm run sandbox:visual -- --ids reliquary-siphonophore --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids reliquary-siphonophore --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id reliquary-siphonophore --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id reliquary-siphonophore
npm run content:goal-gate
```

### Saber Viperfish

Candidate: `saber-viperfish`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id saber-viperfish
npm run sandbox:preview -- --id source-saber-viperfish --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/saber-viperfish-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/saber-viperfish-starter-plan.json --out public/review/articulated/saber-viperfish-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/saber-viperfish-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id saber-viperfish --with diver --serve --open --visual
npm run sandbox:visual -- --ids saber-viperfish --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids saber-viperfish --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id saber-viperfish --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id saber-viperfish
npm run content:goal-gate
```

### Thorn Fan Coralline

Candidate: `thorn-fan-coralline`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id thorn-fan-coralline
npm run sandbox:preview -- --id source-thorn-fan-coralline --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/thorn-fan-coralline-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/thorn-fan-coralline-starter-plan.json --out public/review/articulated/thorn-fan-coralline-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/thorn-fan-coralline-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id thorn-fan-coralline --with diver --serve --open --visual
npm run sandbox:visual -- --ids thorn-fan-coralline --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids thorn-fan-coralline --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id thorn-fan-coralline --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id thorn-fan-coralline
npm run content:goal-gate
```

### Trench Harvest Sea Spider

Candidate: `trench-harvest-sea-spider`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id trench-harvest-sea-spider
npm run sandbox:preview -- --id source-trench-harvest-sea-spider --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/trench-harvest-sea-spider-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/trench-harvest-sea-spider-starter-plan.json --out public/review/articulated/trench-harvest-sea-spider-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/trench-harvest-sea-spider-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id trench-harvest-sea-spider --with diver --serve --open --visual
npm run sandbox:visual -- --ids trench-harvest-sea-spider --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids trench-harvest-sea-spider --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id trench-harvest-sea-spider --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id trench-harvest-sea-spider
npm run content:goal-gate
```

### Tripod Stilt Stalker

Candidate: `tripod-stilt-stalker`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id tripod-stilt-stalker
npm run sandbox:preview -- --id source-tripod-stilt-stalker --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/tripod-stilt-stalker-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/tripod-stilt-stalker-starter-plan.json --out public/review/articulated/tripod-stilt-stalker-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/tripod-stilt-stalker-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id tripod-stilt-stalker --with diver --serve --open --visual
npm run sandbox:visual -- --ids tripod-stilt-stalker --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids tripod-stilt-stalker --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id tripod-stilt-stalker --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id tripod-stilt-stalker
npm run content:goal-gate
```

### Vampire Cloak Squid

Candidate: `vampire-cloak-squid`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id vampire-cloak-squid
npm run sandbox:preview -- --id source-vampire-cloak-squid --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/vampire-cloak-squid-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/vampire-cloak-squid-starter-plan.json --out public/review/articulated/vampire-cloak-squid-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/vampire-cloak-squid-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id vampire-cloak-squid --with diver --serve --open --visual
npm run sandbox:visual -- --ids vampire-cloak-squid --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids vampire-cloak-squid --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id vampire-cloak-squid --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id vampire-cloak-squid
npm run content:goal-gate
```

### Vent-Claw Yeti

Candidate: `vent-claw-yeti`

```bash
npm run source:contracts && npm run source:contracts-check
npm run source:image-check -- --id vent-claw-yeti
npm run sandbox:preview -- --id source-vent-claw-yeti --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/vent-claw-yeti-starter-plan.json
npm run articulated:plan-preview -- --plan tools/scratch/vent-claw-yeti-starter-plan.json --out public/review/articulated/vent-claw-yeti-plan-preview.png
npm run articulated:extract-plan -- --plan tools/scratch/vent-claw-yeti-starter-plan.json --dry-run
npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview
npm run sandbox:preview -- --id vent-claw-yeti --with diver --serve --open --visual
npm run sandbox:visual -- --ids vent-claw-yeti --states idle,lunge,stunned --with diver
npm run sandbox:visual -- --ids vent-claw-yeti --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json
npm run source:accept -- --id vent-claw-yeti --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:acceptance-audit -- --id vent-claw-yeti
npm run content:goal-gate
```


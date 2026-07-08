# Source Art Slice 1 Report

Session key: `fauna-flora-procedural-quality-cleanup-source-art-slice-1`

## Preflight

- Preflight command: `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`
- Preflight HEAD: `03b2dad`
- Repo path used: `/mnt/nxt-dev/water9`

## Dirty-Start Classification

Dirty at start: yes. The repo already had broad unrelated modified gameplay/package/review files, unrelated generated fauna assets, and many untracked run directories. Relevant pre-existing dirty scope included the untracked cleanup run directory and untracked `tools/audit_curated_fauna_flora_assets.mjs`. I preserved unrelated dirty state and staged only explicit slice paths.

## Implementation Summary

- Replaced all 11 known `procedural_drawn_png` runtime keys.
- Added `tools/build_source_art_slice_1_assets.py`, which crops, chroma-keys, trims, resizes, transforms, and packs existing tracked bitmap/source art. It does not use `ImageDraw` or construct source art from procedural shapes.
- Added source slices/composites under `public/assets/source/fauna-flora-source-art-slice-1/`.
- Added `public/assets/source/fauna-flora-source-art-slice-1-manifest.json`.
- Updated `tools/audit_curated_fauna_flora_assets.mjs` so repaired slice assets classify as `source_sheet_slice` or `derived_from_existing_bitmap`.

## Repaired Assets

| Asset key | Before | After | Source art | Runtime path |
| --- | --- | --- | --- | --- |
| `biolume-crystal` | `procedural_drawn_png` | `source_sheet_slice` | `public/assets/source/fauna-flora-source-art-slice-1/biolume-crystal-source.png` from `assets/biolumineassets.png` | `public/assets/generated/biolume-crystal.png` |
| `biolume-rock-0` | `procedural_drawn_png` | `source_sheet_slice` | `public/assets/source/fauna-flora-source-art-slice-1/biolume-rock-0-source.png` from `assets/biolumineassets.png` | `public/assets/generated/biolume-rock-0.png` |
| `biolume-rock-1` | `procedural_drawn_png` | `source_sheet_slice` | `public/assets/source/fauna-flora-source-art-slice-1/biolume-rock-1-source.png` from `assets/biolumineassets.png` | `public/assets/generated/biolume-rock-1.png` |
| `flora-oxygen-bulb` | `procedural_drawn_png` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-1/flora-oxygen-bulb-source.png` from `public/assets/generated/env-flora-oxygen-bloom.png` | `public/assets/generated/flora-oxygen-bulb.png` |
| `flora-oxygen-kelp` | `procedural_drawn_png` | `source_sheet_slice` | `public/assets/source/fauna-flora-source-art-slice-1/flora-oxygen-kelp-source.png` from `assets/oxygengivingassets.png` | `public/assets/generated/flora-oxygen-kelp.png` |
| `fauna-abyss-hatchet-school` | `procedural_drawn_png` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-1/fauna-abyss-hatchet-school-source.png` from `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-blackwater-hatchet.png` | `public/assets/generated/fauna-abyss-hatchet-school.png` and `.frames.json` |
| `fauna-abyss-lantern-swarm` | `procedural_drawn_png` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-1/fauna-abyss-lantern-swarm-source.png` from `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-cyan-pulse-lanternfish.png` | `public/assets/generated/fauna-abyss-lantern-swarm.png` and `.frames.json` |
| `fauna-abyss-microfish` | `procedural_drawn_png` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-1/fauna-abyss-microfish-source.png` from `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-blue-lantern-goby.png` | `public/assets/generated/fauna-abyss-microfish.png` and `.frames.json` |
| `fauna-abyss-snipe-eel` | `procedural_drawn_png` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-1/fauna-abyss-snipe-eel-source.png` from `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-knifecrest-snipe-eel.png` | `public/assets/generated/fauna-abyss-snipe-eel.png` and `.frames.json` |
| `fauna-abyss-static-fry` | `procedural_drawn_png` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-1/fauna-abyss-static-fry-source.png` from `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-blue-lantern-goby.png` | `public/assets/generated/fauna-abyss-static-fry.png` and `.frames.json` |
| `fauna-abyss-viperfish` | `procedural_drawn_png` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-1/fauna-abyss-viperfish-source.png` from `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-abyss-viperfish-bespoke.png` | `public/assets/generated/fauna-abyss-viperfish.png` and `.frames.json` |

## Audit Counts

Before:

- Assets: 167
- `procedural_drawn_png`: 11
- `unknown_provenance`: 29
- `source_sheet_slice`: 21
- `derived_from_existing_bitmap`: 106
- Hard failures: 45
- Blocked queue: 40

After:

- Assets: 167
- `procedural_drawn_png`: 0
- `unknown_provenance`: 29
- `source_sheet_slice`: 25
- `derived_from_existing_bitmap`: 113
- Hard failures: 34
- Blocked queue: 29

Audit remains hard-failing as intended because remaining unknown-provenance assets and pre-existing untracked runtime assets still fail the gate.

## Remaining BLOCKED_ASSET_QUEUE

All remaining blocked assets have the same reason: no approved source-derived replacement was found in this slice; repair requires image generation, a source-sheet slice, or human-provided art.

- `fauna-deep-gulper-eel` - `unknown_provenance` - `public/assets/generated/fauna-deep-gulper-eel.png`
- `fauna-shallow-lantern-fry` - `unknown_provenance` - `public/assets/generated/fauna-shallow-lantern-fry.png`
- `fauna-abyss-abyss-jelly` - `unknown_provenance` - `public/assets/generated/fauna-abyss-abyss-jelly.png`
- `fauna-abyss-anglerfish` - `unknown_provenance` - `public/assets/generated/fauna-abyss-anglerfish.png`
- `fauna-abyss-bigfin-squid` - `unknown_provenance` - `public/assets/generated/fauna-abyss-bigfin-squid.png`
- `fauna-abyss-black-swallower` - `unknown_provenance` - `public/assets/generated/fauna-abyss-black-swallower.png`
- `fauna-abyss-frilled-shark` - `unknown_provenance` - `public/assets/generated/fauna-abyss-frilled-shark.png`
- `fauna-abyss-hadal-shrimp` - `unknown_provenance` - `public/assets/generated/fauna-abyss-hadal-shrimp.png`
- `fauna-abyss-medusa` - `unknown_provenance` - `public/assets/generated/fauna-abyss-medusa.png`
- `fauna-abyss-mirror-fry` - `unknown_provenance` - `public/assets/generated/fauna-abyss-mirror-fry.png`
- `fauna-abyss-vampire-squid` - `unknown_provenance` - `public/assets/generated/fauna-abyss-vampire-squid.png`
- `fauna-deep-ash-minnow` - `unknown_provenance` - `public/assets/generated/fauna-deep-ash-minnow.png`
- `fauna-deep-barreleye` - `unknown_provenance` - `public/assets/generated/fauna-deep-barreleye.png`
- `fauna-deep-deep-shrimp` - `unknown_provenance` - `public/assets/generated/fauna-deep-deep-shrimp.png`
- `fauna-deep-glass-squid` - `unknown_provenance` - `public/assets/generated/fauna-deep-glass-squid.png`
- `fauna-deep-hatchetfish` - `unknown_provenance` - `public/assets/generated/fauna-deep-hatchetfish.png`
- `fauna-deep-lanternfish` - `unknown_provenance` - `public/assets/generated/fauna-deep-lanternfish.png`
- `fauna-deep-sea-spider` - `unknown_provenance` - `public/assets/generated/fauna-deep-sea-spider.png`
- `fauna-deep-tripodfish` - `unknown_provenance` - `public/assets/generated/fauna-deep-tripodfish.png`
- `fauna-deep-vampire-squid` - `unknown_provenance` - `public/assets/generated/fauna-deep-vampire-squid.png`
- `fauna-shallow-blue-ring-octopus` - `unknown_provenance` - `public/assets/generated/fauna-shallow-blue-ring-octopus.png`
- `fauna-shallow-comb-jelly` - `unknown_provenance` - `public/assets/generated/fauna-shallow-comb-jelly.png`
- `fauna-shallow-glass-ray` - `unknown_provenance` - `public/assets/generated/fauna-shallow-glass-ray.png`
- `fauna-shallow-jellyfish` - `unknown_provenance` - `public/assets/generated/fauna-shallow-jellyfish.png`
- `fauna-shallow-mantis-shrimp` - `unknown_provenance` - `public/assets/generated/fauna-shallow-mantis-shrimp.png`
- `fauna-shallow-nautilus` - `unknown_provenance` - `public/assets/generated/fauna-shallow-nautilus.png`
- `fauna-shallow-octopus` - `unknown_provenance` - `public/assets/generated/fauna-shallow-octopus.png`
- `fauna-shallow-snap-shrimp` - `unknown_provenance` - `public/assets/generated/fauna-shallow-snap-shrimp.png`
- `fauna-shallow-squid` - `unknown_provenance` - `public/assets/generated/fauna-shallow-squid.png`

Additional hard failures not in `BLOCKED_ASSET_QUEUE`: 4 prior terrain-edge flora replacements and `fauna-abyss-mantle-crawler` still carry `runtime_untracked`; they are source-derived but fail until tracked.

## Runtime Proof

Proof command:

- `node runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/capture-source-art-slice-1-proof.mjs` - pass, port 5180, 11 captures, 0 failures.

Proof metadata:

- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/source-art-slice-1-normal-play-proof.json`

Normal-play canvas captures:

- `canvas-special-flora-oxygen-kelp.png` and `canvas-special-flora-oxygen-kelp-grayscale.png`
- `canvas-special-flora-oxygen-bulb.png` and `canvas-special-flora-oxygen-bulb-grayscale.png`
- `canvas-special-flora-biolume-rock-0.png` and `canvas-special-flora-biolume-rock-0-grayscale.png`
- `canvas-special-flora-biolume-rock-1.png` and `canvas-special-flora-biolume-rock-1-grayscale.png`
- `canvas-special-flora-biolume-crystal.png` and `canvas-special-flora-biolume-crystal-grayscale.png`
- `canvas-abyss-fauna-viperfish.png` and `canvas-abyss-fauna-viperfish-grayscale.png`
- `canvas-abyss-fauna-lantern-swarm.png` and `canvas-abyss-fauna-lantern-swarm-grayscale.png`
- `canvas-hadal-fauna-static-fry.png` and `canvas-hadal-fauna-static-fry-grayscale.png`
- `canvas-hadal-fauna-hatchet-school.png` and `canvas-hadal-fauna-hatchet-school-grayscale.png`
- `canvas-hadal-fauna-microfish.png` and `canvas-hadal-fauna-microfish-grayscale.png`
- `canvas-hadal-fauna-snipe-eel.png` and `canvas-hadal-fauna-snipe-eel-grayscale.png`

Visual inspection helpers:

- `source-art-slice-1-runtime-contact.png`
- `source-art-slice-1-runtime-contact-gray.png`
- `source-art-slice-1-normal-play-contact.png`
- `source-art-slice-1-normal-play-contact-gray.png`

Visual inspection notes: special-room flora read as anchored painted/cutout assets in normal terrain context. Abyss small fauna are subtle at honest gameplay scale but now show source-derived fish/eel silhouettes instead of dots, triangles, or line-only procedural marks.

## Verification

- `node tools/audit_curated_fauna_flora_assets.mjs` - expected fail. `procedural_drawn_png` is 0; remaining hard failures: 34.
- `npx tsc --noEmit --pretty false` - pass.
- `npm run build` - pass. Vite emitted the existing unresolved runtime asset URL/chunk-size warnings.
- `node runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/capture-source-art-slice-1-proof.mjs` - pass on port 5180.

## Commit

Commit: `bae84d7` (`Replace procedural fauna flora source art slice 1`).

Note: this hash line was written to the on-disk report after the commit, because a commit cannot contain its own final hash. The committed report has the same contents except this post-commit hash note.

# Source Art Slice 2 Report

Session key: `fauna-flora-procedural-quality-cleanup-source-art-slice-2`

## Preflight

- Preflight command: `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`
- Preflight HEAD: `bae84d7`
- Repo path used: `/mnt/nxt-dev/water9`

## Dirty-Start Classification

Dirty at start: yes. Existing dirty state included unrelated gameplay/source modifications, package/review files, untracked run directories, prior flora proof artifacts, and unrelated generated asset files. This slice preserved unrelated state and stages only explicit source-art slice 2 paths.

## Implementation Summary

- Repaired 12 `unknown_provenance` runtime fauna keys using tracked bitmap source art.
- Added `tools/build_source_art_slice_2_assets.py`, which trims/chroma-keys/resizes/packs existing tracked bitmaps only. It does not use PIL/ImageDraw line, ellipse, glow, or shape construction as source art.
- Added source cutouts under `public/assets/source/fauna-flora-source-art-slice-2/`.
- Added `public/assets/source/fauna-flora-source-art-slice-2-manifest.json`.
- Updated `tools/audit_curated_fauna_flora_assets.mjs` to include slice 2 source evidence in audit output.

## Repaired Assets

| Asset key | Before | After | Source art | Runtime path |
| --- | --- | --- | --- | --- |
| `fauna-deep-gulper-eel` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-2/fauna-deep-gulper-eel-source.png` from `public/assets/generated/fauna-abyssal-gulper-v2-chroma.png` | `public/assets/generated/fauna-deep-gulper-eel.png` and `.frames.json` |
| `fauna-shallow-lantern-fry` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-2/fauna-shallow-lantern-fry-source.png` from `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-halo-dot-lanternfish.png` | `public/assets/generated/fauna-shallow-lantern-fry.png` and `.frames.json` |
| `fauna-shallow-squid` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-2/fauna-shallow-squid-source.png` from `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-kelp-arrow-squid.png` | `public/assets/generated/fauna-shallow-squid.png` and `.frames.json` |
| `fauna-shallow-nautilus` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-2/fauna-shallow-nautilus-source.png` from `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-glass-helm-nautilus.png` | `public/assets/generated/fauna-shallow-nautilus.png` and `.frames.json` |
| `fauna-shallow-jellyfish` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-2/fauna-shallow-jellyfish-source.png` from `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-prism-bell-jelly.png` | `public/assets/generated/fauna-shallow-jellyfish.png` and `.frames.json` |
| `fauna-deep-hatchetfish` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-2/fauna-deep-hatchetfish-source.png` from `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-rustscale-hatchetfish.png` | `public/assets/generated/fauna-deep-hatchetfish.png` and `.frames.json` |
| `fauna-deep-barreleye` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-2/fauna-deep-barreleye-source.png` from `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-lumen-brow-barreleye.png` | `public/assets/generated/fauna-deep-barreleye.png` and `.frames.json` |
| `fauna-deep-glass-squid` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-2/fauna-deep-glass-squid-source.png` from `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-velvet-glass-cuttle.png` | `public/assets/generated/fauna-deep-glass-squid.png` and `.frames.json` |
| `fauna-deep-lanternfish` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-2/fauna-deep-lanternfish-source.png` from `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-cyan-pulse-lanternfish.png` | `public/assets/generated/fauna-deep-lanternfish.png` and `.frames.json` |
| `fauna-deep-vampire-squid` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-2/fauna-deep-vampire-squid-source.png` from `public/assets/generated/fauna-vampire-cloak-squid-whole-source.png` | `public/assets/generated/fauna-deep-vampire-squid.png` and `.frames.json` |
| `fauna-abyss-anglerfish` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-2/fauna-abyss-anglerfish-source.png` from `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-ancient-mask-angler.png` | `public/assets/generated/fauna-abyss-anglerfish.png` and `.frames.json` |
| `fauna-abyss-vampire-squid` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-2/fauna-abyss-vampire-squid-source.png` from `public/assets/generated/fauna-vampire-cloak-squid-whole-source.png` | `public/assets/generated/fauna-abyss-vampire-squid.png` and `.frames.json` |

## Audit Counts

Before:

- Assets: 167
- `procedural_drawn_png`: 0
- `unknown_provenance`: 29
- `source_sheet_slice`: 25
- `derived_from_existing_bitmap`: 113
- Hard failures: 34
- Blocked queue: 29

After:

- Assets: 167
- `procedural_drawn_png`: 0
- `unknown_provenance`: 17
- `source_sheet_slice`: 25
- `derived_from_existing_bitmap`: 125
- Hard failures: 22
- Blocked queue: 17

Audit remains hard-failing as intended because the remaining unknown-provenance assets and pre-existing untracked runtime assets still fail the gate.

## Remaining BLOCKED_ASSET_QUEUE

These remain blocked because I did not find credible species-specific source art in this slice. They require image generation, a source-sheet slice, or human-provided art; I did not create procedural stand-ins.

- `fauna-abyss-abyss-jelly`
- `fauna-abyss-bigfin-squid`
- `fauna-abyss-black-swallower`
- `fauna-abyss-frilled-shark`
- `fauna-abyss-hadal-shrimp`
- `fauna-abyss-medusa`
- `fauna-abyss-mirror-fry`
- `fauna-deep-ash-minnow`
- `fauna-deep-deep-shrimp`
- `fauna-deep-sea-spider`
- `fauna-deep-tripodfish`
- `fauna-shallow-blue-ring-octopus`
- `fauna-shallow-comb-jelly`
- `fauna-shallow-glass-ray`
- `fauna-shallow-mantis-shrimp`
- `fauna-shallow-octopus`
- `fauna-shallow-snap-shrimp`

Additional hard failures not in `BLOCKED_ASSET_QUEUE`: prior untracked terrain-edge flora replacements and `fauna-abyss-mantle-crawler` still carry `runtime_untracked`.

## Runtime Proof

Proof command:

- `node runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/capture-source-art-slice-2-proof.mjs` - pass, port 5180, 12 captures, 0 failures.

Proof metadata:

- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/source-art-slice-2-normal-play-proof.json`

Normal-play canvas captures:

- `canvas-mid-fauna-gulper-eel.png` and `canvas-mid-fauna-gulper-eel-grayscale.png`
- `canvas-surface-fauna-lantern-fry.png` and `canvas-surface-fauna-lantern-fry-grayscale.png`
- `canvas-surface-fauna-squid.png` and `canvas-surface-fauna-squid-grayscale.png`
- `canvas-surface-fauna-nautilus.png` and `canvas-surface-fauna-nautilus-grayscale.png`
- `canvas-surface-fauna-jellyfish.png` and `canvas-surface-fauna-jellyfish-grayscale.png`
- `canvas-mid-fauna-hatchetfish.png` and `canvas-mid-fauna-hatchetfish-grayscale.png`
- `canvas-mid-fauna-barreleye.png` and `canvas-mid-fauna-barreleye-grayscale.png`
- `canvas-mid-fauna-glass-squid.png` and `canvas-mid-fauna-glass-squid-grayscale.png`
- `canvas-mid-fauna-lanternfish.png` and `canvas-mid-fauna-lanternfish-grayscale.png`
- `canvas-mid-fauna-vampire-squid.png` and `canvas-mid-fauna-vampire-squid-grayscale.png`
- `canvas-hadal-fauna-anglerfish.png` and `canvas-hadal-fauna-anglerfish-grayscale.png`
- `canvas-hadal-fauna-vampire-squid.png` and `canvas-hadal-fauna-vampire-squid-grayscale.png`

Visual inspection helpers:

- `source-art-slice-2-runtime-source-contact.png`
- `source-art-slice-2-normal-play-contact.png`
- `source-art-slice-2-normal-play-contact-gray.png`

Visual inspection notes: the repaired assets render as bitmap-derived silhouettes in live canvas proof rather than dots/lines/triangles/fallback shapes. Some mid/deep captures are naturally dark and crowded at gameplay scale, but each proof record confirms the expected `assetKey`, runtime path, source path, runtime hash, and frame manifest source.

## Verification

- `python3 tools/build_source_art_slice_2_assets.py` - pass, wrote 12 source-derived fauna replacements.
- `node tools/audit_curated_fauna_flora_assets.mjs` - expected fail. `unknown_provenance` dropped from 29 to 17; remaining hard failures: 22.
- `npx tsc --noEmit --pretty false` - pass.
- `npm run build` - pass. Vite emitted the existing unresolved runtime asset URL and chunk-size warnings.
- `node runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/capture-source-art-slice-2-proof.mjs` - pass on port 5180.

## Commit

Commit: `040c18b` (`Replace unknown fauna source art slice 2`).

Note: this hash line was written to the on-disk report after the commit, because a commit cannot contain its own final hash. The committed report has the same contents except this post-commit hash note.

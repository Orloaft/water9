# Source Art Slice 4 Report

Session key: `fauna-flora-procedural-quality-cleanup-source-art-slice-4`

## Preflight

- Preflight command: `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`
- Preflight HEAD: `0f5ea96`
- Repo path used: `/mnt/nxt-dev/water9`

## Dirty-Start Classification

Dirty at start: yes. Existing dirty state included unrelated modified source files, package/review files, prior slice reports/inventory modifications, prior generated asset changes, untracked flora/mantle-crawler runtime replacements, and untracked run directories/proof artifacts. This slice preserves unrelated state and will stage only explicit source-art slice 4 paths plus owned audit/source/runtime/proof files.

## Starting Audit

- Command: `node tools/audit_curated_fauna_flora_assets.mjs`
- Result: expected fail.
- Counts: `source_sheet_slice: 25`, `unknown_provenance: 9`, `derived_from_existing_bitmap: 133`
- Totals: `assets: 167`, `fauna: 137`, `flora: 30`, `offenders: 19`, `blocked: 9`
- Hard failures: `14`

Starting blockers:

- `fauna-abyss-abyss-jelly`
- `fauna-abyss-bigfin-squid`
- `fauna-abyss-black-swallower`
- `fauna-abyss-frilled-shark`
- `fauna-abyss-hadal-shrimp`
- `fauna-abyss-medusa`
- `fauna-abyss-mirror-fry`
- `fauna-deep-ash-minnow`
- `fauna-deep-deep-shrimp`
- runtime-untracked repaired assets: `terrain-edge-flora-moon-sponge`, `terrain-edge-flora-sting-anemone`, `terrain-edge-flora-vent-coral`, `terrain-edge-flora-ember-bloom`, `fauna-abyss-mantle-crawler`

## Implementation Summary

- Repaired the 9 remaining `unknown_provenance` fauna keys with source-backed bitmap art.
- Added `tools/build_source_art_slice_4_assets.py`, which only trims/chroma-keys/resizes/re-packs existing bitmap sources. It does not draw organism art with PIL/ImageDraw lines, ellipses, polygons, glows, random particles, or shape composition.
- Added `public/assets/source/fauna-flora-source-art-slice-4/` cutouts and `public/assets/source/fauna-flora-source-art-slice-4-manifest.json` with tracked source lineage for each repaired fauna key.
- Updated runtime frame manifests so each repaired fauna sheet points back to the slice 4 source cutout.
- Updated `tools/audit_curated_fauna_flora_assets.mjs` to load and report slice 4 source evidence.
- Resolved runtime-untracked audit failures for the four repaired terrain-edge flora files and `fauna-abyss-mantle-crawler` by explicitly adding those runtime assets to git tracking.
- No new generated art was used in this slice; all slice 4 fauna replacements derive from existing tracked/generated bitmap source art already present in the repo.

## Repaired Assets

| Asset key | Before | After | Source art | Runtime path |
| --- | --- | --- | --- | --- |
| `fauna-abyss-abyss-jelly` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-4/fauna-abyss-abyss-jelly-source.png` from Prism Bell Jelly exploration bitmap | `public/assets/generated/fauna-abyss-abyss-jelly.png` and `.frames.json` |
| `fauna-abyss-bigfin-squid` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-4/fauna-abyss-bigfin-squid-source.png` from Velvet Lantern Cuttle whole-source bitmap | `public/assets/generated/fauna-abyss-bigfin-squid.png` and `.frames.json` |
| `fauna-abyss-black-swallower` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-4/fauna-abyss-black-swallower-source.png` from Abyssal Gulper v2 whole-source bitmap | `public/assets/generated/fauna-abyss-black-swallower.png` and `.frames.json` |
| `fauna-abyss-frilled-shark` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-4/fauna-abyss-frilled-shark-source.png` from Onyx Frillshark Fry exploration bitmap | `public/assets/generated/fauna-abyss-frilled-shark.png` and `.frames.json` |
| `fauna-abyss-hadal-shrimp` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-4/fauna-abyss-hadal-shrimp-source.png` from Chimney Ghost Shrimp exploration bitmap | `public/assets/generated/fauna-abyss-hadal-shrimp.png` and `.frames.json` |
| `fauna-abyss-medusa` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-4/fauna-abyss-medusa-source.png` from Chain Vein Siphonophore whole-source bitmap | `public/assets/generated/fauna-abyss-medusa.png` and `.frames.json` |
| `fauna-abyss-mirror-fry` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-4/fauna-abyss-mirror-fry-source.png` from Mirrorbone Hatchetfish exploration bitmap | `public/assets/generated/fauna-abyss-mirror-fry.png` and `.frames.json` |
| `fauna-deep-ash-minnow` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-4/fauna-deep-ash-minnow-source.png` from Saberfin Smelt exploration bitmap | `public/assets/generated/fauna-deep-ash-minnow.png` and `.frames.json` |
| `fauna-deep-deep-shrimp` | `unknown_provenance` | `derived_from_existing_bitmap` | `public/assets/source/fauna-flora-source-art-slice-4/fauna-deep-deep-shrimp-source.png` from Opal Fan Shrimp exploration bitmap | `public/assets/generated/fauna-deep-deep-shrimp.png` and `.frames.json` |

Runtime tracking repairs:

- `fauna-abyss-mantle-crawler`
- `terrain-edge-flora-moon-sponge`
- `terrain-edge-flora-sting-anemone`
- `terrain-edge-flora-vent-coral`
- `terrain-edge-flora-ember-bloom`

## Audit Counts

Before:

- `source_sheet_slice`: 25
- `unknown_provenance`: 9
- `derived_from_existing_bitmap`: 133
- Hard failures: 14
- Blocked queue: 9

After:

- `source_sheet_slice`: 25
- `derived_from_existing_bitmap`: 142
- `unknown_provenance`: 0
- Hard failures: 0
- Blocked queue: 0

Final command: `node tools/audit_curated_fauna_flora_assets.mjs` - pass.

## Runtime Proof

Proof command:

- `node runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/capture-source-art-slice-4-proof.mjs` - pass, port 5180, 14 captures, 0 failures.

Proof metadata:

- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/source-art-slice-4-normal-play-proof.json`

Normal-play contact sheets:

- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/source-art-slice-4-normal-play-contact.png`
- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/source-art-slice-4-normal-play-contact-gray.png`
- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/source-art-slice-4-runtime-source-contact.png`

Normal-play canvas captures include color and grayscale pairs for:

- `canvas-slice4-deep-fauna-ash-minnow`
- `canvas-slice4-deep-fauna-deep-shrimp`
- `canvas-slice4-abyss-fauna-mirror-fry`
- `canvas-slice4-abyss-fauna-hadal-shrimp`
- `canvas-slice4-abyss-fauna-abyss-jelly`
- `canvas-slice4-abyss-fauna-bigfin-squid`
- `canvas-slice4-abyss-fauna-frilled-shark`
- `canvas-slice4-abyss-fauna-black-swallower`
- `canvas-slice4-hadal-fauna-medusa`
- `canvas-slice4-special-fauna-mantle-crawler`
- `canvas-slice4-surface-flora-moon-sponge`
- `canvas-slice4-surface-flora-sting-anemone`
- `canvas-slice4-mid-flora-vent-coral`
- `canvas-slice4-mid-flora-ember-bloom`

Visual inspection notes: the live `#game canvas` captures show the repaired assets loaded in normal gameplay at surface, mid, abyss, and hadal/special-room depths. Grayscale contact sheet remains readable. Some abyss captures are intentionally dark at gameplay scale, but the silhouettes are present and the proof JSON records expected `assetKey`, runtime path/hash, and frame-manifest source path for the repaired source-backed fauna.

## Verification

- `python3 tools/build_source_art_slice_4_assets.py` - pass.
- `node tools/audit_curated_fauna_flora_assets.mjs` - pass.
- `npx tsc --noEmit --pretty false` - pass.
- `npm run build` - pass. Vite emitted existing unresolved runtime asset URL warnings and chunk-size warning.
- `node runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/capture-source-art-slice-4-proof.mjs` - pass.

## Commit

Pending. This report will be updated with the commit hash after commit if needed.

# Water9 Fauna Animation Upgrade Implementation Report

Status: implementation complete; visual acceptance not claimed.

## Scope

- Upgraded all 100 normal-gameplay `fauna-exp-*` runtime fauna to 4-frame, 8 fps loops.
- Regenerated packed sheets, loose `-0` through `-3` frames, frame manifests, and `small-life.manifest.json`.
- Kept runtime/content source out of scope: this pass did not edit `src/content.ts`, `src/helpers.ts`, or tracked `fauna-abyss-viperfish*` files.
- No imagegen was used. Existing 2026-07-04 alpha/source cutouts were sufficient for local morphotype-specific frame construction.

## Builder Changes

- `tools/build_exploration_fauna_runtime_assets.py` now defaults to new-fauna-only rebuilds.
- Legacy `fauna-abyss-viperfish` rebuild is gated behind `--include-viperfish` so the builder no longer overwrites the pre-existing dirty tracked viperfish files by default.
- Added morphotype-specific motion:
  - fish: whole-body counter-wave, stronger tail beat, fin/body silhouette shifts
  - long/eel/needle/ribbon: whole-spine wave with head/tail phase offset
  - squid/cuttle: mantle breathing plus arm/tentacle and fin sweep
  - nautilus/clam: coherent shell with opening/body/tentacle motion
  - jelly: bell pulse/squash plus tentacle drag
  - crustacean: abdomen/body sway plus leg/claw/antenna cadence
  - seahorse/garden eel: vertical curl and fin shimmer
  - flat/ray/flounder: wing/body undulation
- Added pack-time loop margin normalization so stronger motion does not clip frame cells.

## Static Metrics

- Metrics JSON: `runs/water9-fauna-animation-upgrade-2026-07-05/frame-quality-metrics.json`
- New fauna count: 100.
- New-fauna alpha-motion distribution: min 0.173, median 0.323, mean 0.338, max 0.553.
- Benchmark alpha-motion distribution: min 0.106, median 0.260, mean 0.283, max 0.522.
- New-fauna area-drift distribution: min 0.008, median 0.081, mean 0.083, max 0.526.
- Diagnostic flags after final rebuild: 26 `near-duplicate-frames`, 1 `low-area-drift`, 0 `low-alpha-motion`.
- Named failure sample metrics:
  - `fauna-exp-nacre-thorn-clam`: alpha 0.355, no flags
  - `fauna-exp-saffron-paddle-cuttle`: alpha 0.242, no flags
  - `fauna-exp-prism-bell-jelly`: alpha 0.203, no flags
  - `fauna-exp-glass-helm-nautilus`: alpha 0.216, no flags

## Proof Artifacts

Static proof:
- Exact implementation path inventory: `runs/water9-fauna-animation-upgrade-2026-07-05/changed-files-implementation.txt`
- `runs/water9-fauna-animation-upgrade-2026-07-05/proof/named-failures-after-vs-benchmark-contact-sheet.png`
- `runs/water9-fauna-animation-upgrade-2026-07-05/proof/named-failures-after-vs-benchmark-contact-sheet-grayscale.png`
- `runs/water9-fauna-animation-upgrade-2026-07-05/proof/all-new-fauna-morphotype-contact-sheet.png`
- `runs/water9-fauna-animation-upgrade-2026-07-05/proof/all-new-fauna-morphotype-contact-sheet-grayscale.png`
- `runs/water9-fauna-animation-upgrade-2026-07-05/proof/new-fauna-builder-contact-sheet.png`

Live normal-play `#game canvas` proof:
- Raw capture JSON: `runs/water9-fauna-animation-upgrade-2026-07-05/live-canvas/live-canvas-raw.json`
- Selection/report JSON: `runs/water9-fauna-animation-upgrade-2026-07-05/live-canvas/live-canvas-selection.json`
- Crop contact sheet: `runs/water9-fauna-animation-upgrade-2026-07-05/live-canvas/live-contact-sheet-color.png`
- Crop grayscale sheet: `runs/water9-fauna-animation-upgrade-2026-07-05/live-canvas/live-contact-sheet-grayscale.png`
- Depth-route whole-canvas sheet: `runs/water9-fauna-animation-upgrade-2026-07-05/live-canvas/live-depth-route-contact-sheet-color.png`
- Depth-route grayscale sheet: `runs/water9-fauna-animation-upgrade-2026-07-05/live-canvas/live-depth-route-contact-sheet-grayscale.png`
- Per-frame canvas/runtime screenshots and crops: `runs/water9-fauna-animation-upgrade-2026-07-05/live-canvas/`

Live proof details:
- Used Vite on `http://127.0.0.1:5181/`; port 5180 was busy and was left alone.
- Captured 96 actual gameplay `#game canvas` frames across 12 route stops: B1 120/620/1260m, B2 760/1120/1540m, B3 820/1320/1860m, B4 900/1580/2180m.
- Runtime errors: 0.
- Browser resource proof recorded 74 `fauna-exp-*` generated asset resource URLs per scenario.

## Verification

- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `d7aed9a`
- `python3 -m py_compile tools/build_exploration_fauna_runtime_assets.py` -> passed with no output
- `python3 tools/build_exploration_fauna_runtime_assets.py` ->
  - `wrote 100 generated fauna sheets with 4 frames at 8 fps`
  - `wrote runs/water9-fauna-animation-upgrade-2026-07-05/proof/new-fauna-builder-contact-sheet.png`
- `node tools/build_small_life_manifest.mjs` -> `wrote /mnt/nxt-dev/water9/public/assets/generated/small-life.manifest.json (155 entries)`
- `npm run small-life:validate` -> passed; reported existing loose-frame legacy warnings and `small-life validation passed (155 manifest entries)`
- `npx tsc --noEmit --pretty false` -> passed with no output
- `npm run build` -> passed; Vite emitted existing runtime asset resolution warnings plus chunk-size warning, then `built in 2.31s`
- Live capture command -> `captures: 96`, `runtimeErrors: 0`, resource proof counts 74 for each of four scenarios

## Upgrade Coverage

- Fully upgraded: all 100 `fauna-exp-*` entries in `public/assets/generated/exploration-life-2026-07-04/manifest.json`.
- Blocked on source/imagegen: none.
- Exceptions to 4 frames at 8 fps: none for `fauna-exp-*`.

## Caveats

- Visual acceptance is intentionally left to the manager.
- The live crop selector found 7 unique visible experimental asset keys in-frame; the full live route still captured actual gameplay canvas at all required depth bands, and browser resource proof shows generated `fauna-exp-*` assets loaded by the runtime.
- The worktree had pre-existing dirty tracked files before this lane: `src/content.ts`, `src/helpers.ts`, `public/assets/generated/fauna-abyss-viperfish*`, and older review/run artifacts. They remain dirty and were not reverted.
- `runs/water9-fauna-animation-upgrade-2026-07-05/triage-*` files are read-only triage/planning artifacts present in the run directory; this implementation pass did not rely on them for acceptance.
- No files were staged and no commit was made.

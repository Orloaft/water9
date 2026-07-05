# Biome 2 Overlay Scout

## Status: read-only scout complete

Report completed: `2026-07-04T21:58:37-04:00`

Playwright acceptance gate added: `2026-07-04T22:12:16-04:00`

Playwright frame-cadence addendum: `2026-07-04T22:25:21-04:00`

## Preflight: exact command output

```sh
$ git -C /mnt/nxt-dev/water9 rev-parse --short HEAD
7776913
```

Repo confirmation:

```sh
$ pwd
/mnt/nxt-dev/water9
$ git rev-parse --show-toplevel
/mnt/nxt-dev/water9
```

## Dirty status summary

HEAD remained `7776913`.

Initial dirty summary before capture included modified `package.json`, `src/helpers.ts`, `src/hud.ts`, `src/scene-playtest.ts`, `src/scene-rendering.ts`, `src/scene.ts`, `src/styles.css`, `src/types.ts`, plus many pre-existing untracked `runs/`, `tools/`, and generated background/source assets. During the run, `src/scene-combat.ts` and `src/scene-entities.ts` also appeared modified and Vite reported source reloads, consistent with concurrent work. I did not edit source, stage, commit, or kill any process.

Scout-written artifacts are confined to:

- `runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-scout.md`
- `runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-capture.mjs`
- `runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-proof/`
- `runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright.spec.mjs`
- `runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright.log`
- `runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright-proof/`
- `runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright-output/`

## Proof paths

Proof was captured from actual `#game canvas` normal-play runtime on port `5181`; no listener remained on `5180-5199` after the run.

- Proof JSON: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-proof/biome2-overlay-proof.json`
- Contact sheet: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-proof/biome2-overlay-contact-sheet.png`
- Near barge color: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-proof/b2-entry-barge-surface-water-on.png`
- Near barge grayscale: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-proof/b2-entry-barge-surface-water-on-grayscale.png`
- Good landmark color: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-proof/b2-upper-good-landmark-260m-water-on.png`
- Good landmark grayscale: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-proof/b2-upper-good-landmark-260m-water-on-grayscale.png`
- Deep overlay color: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-proof/b2-deep-overlay-760m-water-on.png`
- Deep overlay grayscale: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-proof/b2-deep-overlay-760m-water-on-grayscale.png`
- Same-location water-column-off color: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-proof/b2-deep-overlay-760m-water-column-off.png`
- Same-location water-column-off grayscale: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-proof/b2-deep-overlay-760m-water-column-off-grayscale.png`

## Playwright e2e acceptance gate

Hard gate passed. The follow-up proof uses Playwright Test to drive live normal-play Water9 at `?playtest=1&biome=2&perf=1`; every color capture below is a Playwright element screenshot of live `#game canvas`. Grayscale files are derived from those same canvas pixels. The proof JSON/contact sheet now also record an in-page `requestAnimationFrame` frame-cadence sample for each capture.

Command:

```sh
$ npx playwright test runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright.spec.mjs --reporter=list --workers=1 --timeout=120000 --output runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright-output
```

Exit status: `0`

Pass/fail output was saved to:

- `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright.log`

Key pass/fail lines:

```txt
Running 1 test using 1 worker
1 passed (41.0s)
```

The run used port `5181`. A post-run `ss -ltnp` check showed no listener on ports `5180-5199`.

Playwright proof paths:

- Proof JSON: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright-proof/biome2-overlay-playwright-proof.json`
- Contact sheet PNG: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright-proof/biome2-overlay-playwright-contact-sheet.png`
- Contact sheet HTML: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright-proof/biome2-overlay-playwright-contact-sheet.html`
- Near barge color: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright-proof/b2-gate-near-barge-surface-water-on.png`
- Near barge grayscale: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright-proof/b2-gate-near-barge-surface-water-on-grayscale.png`
- Good landmark depth color: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright-proof/b2-gate-good-landmark-reachable-260m-water-on.png`
- Good landmark depth grayscale: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright-proof/b2-gate-good-landmark-reachable-260m-water-on-grayscale.png`
- Threshold color: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright-proof/b2-gate-threshold-mid-530m-water-on.png`
- Threshold grayscale: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright-proof/b2-gate-threshold-mid-530m-water-on-grayscale.png`
- Deep overlay color: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright-proof/b2-gate-deep-overlay-760m-water-on.png`
- Deep overlay grayscale: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright-proof/b2-gate-deep-overlay-760m-water-on-grayscale.png`

Gate capture summary:

- Near barge: target `0 m`, actual `0 m`, `activeBand=surface`, stage `dock`, color file `605665` bytes.
- Good landmark depth: target `260 m`, actual `390 m`, `activeBand=upper`, stage `reachable`, color file `584825` bytes.
- Threshold: target `530 m`, actual `624 m`, `activeBand=mid`, stage `reachableImmediate`, color file `647821` bytes.
- Deep overlay: target `760 m`, actual `798 m`, `activeBand=mid`, stage `reachableImmediate`, color file `592908` bytes.

## Frame-time/FPS addendum

The Playwright proof now exposes frame cadence from a `requestAnimationFrame` sampler after each saved canvas still. All four B2 captures were flagged as obvious misses for smooth 60fps in this harness run:

- Near barge: `40.9` avg fps, `24.44 ms` avg frame, `33.4 ms` p95, `50.0 ms` max, sampled `0-0 m`, flagged.
- Good landmark depth: `11.9` avg fps, `84.09 ms` avg frame, `100.0 ms` p95, `133.4 ms` max, sampled `390-390 m`, flagged.
- Threshold: `22.7` avg fps, `44.05 ms` avg frame, `50.1 ms` p95, `66.7 ms` max, sampled `630-630 m`, flagged.
- Deep overlay: `22.9` avg fps, `43.65 ms` avg frame, `50.1 ms` p95, `66.6 ms` max, sampled `798-798 m`, flagged.

Internal perf telemetry in the same proof did not show a single catastrophic average update/draw cost: `frame.total` averaged about `11.63/8.95/12.42/11.49 ms` for near/good/threshold/deep, with `draw.total` averaging about `8.86/7.44/10.12/9.22 ms`. It does show spikes up to `42.06 ms` draw at the threshold capture and `25.61 ms` draw at deep overlay, plus a `95.53 ms` `frame.total` max near the barge. Treat the rAF cadence as a real proof-run smoothness warning, but not yet as a root-cause-isolated source-side FPS diagnosis.

## Near-barge finding

Confirmed. At the biome 2 barge/entry (`depth=0`, `activeBand=surface`), the runtime renders `water9-biome-landmark-brine-shelf-gpt` directly under the barge at alpha `1`. The asset is visually strong, detailed, and photographic compared with the barge/entry presentation, so it reads like a foreground floor plate instead of distant atmosphere.

Likely cause:

- `src/helpers.ts:622-635` puts `biome-brine-vent-sulfide-shelf` into biome 2 `surface`, `upper`, `mid`, and `lower` pools even though the manifest asset is a mid-band shelf.
- `src/helpers.ts:795-814` makes biome 2 surface authored landmarks full alpha and very large (`surface` height multiplier `1.62`, width multiplier `1.98`).
- `src/helpers.ts:1404-1430` has a special immediate surface anchor branch that centers the authored landmark in the first viewport (`localY = viewHeight * 0.52`) and returns only that anchor.

## Good-landmark-depth finding

Confirmed. The same B2 shelf looks acceptable after descending into upper biome 2. The capture requested `260 m`; the normal reachable-water staging landed at `depth=390`, `activeBand=upper`. The asset rendered as background scenery with lower alphas (`0.337`, `0.350`, `0.222`, `0.328` in the proof JSON), behind terrain/lamp context, and reads as a distant brine shelf rather than an entry-floor pasted under the barge.

## Deep grayscale/semi-transparent overlay finding

Confirmed. In mid biome 2 (`activeBand=mid`), the water-column-on captures show large semi-transparent green-gray rectangular bands/blocks at the screen sides and across the scene. The initial same-location capture around `558 m` with `window.__WATER_COLUMN_DISABLED__ = true` removes those blocks while leaving the same background landmark/terrain context. The final Playwright gate keeps mid-band color/grayscale captures at `624 m` and `798 m`. This isolates the bad overlay to the water-column pass rather than the landmark art.

Proof metrics from the final run:

- Water on: visible layers `mid-broad-fog-mottle` alpha `0.028`, `mid-sediment-flecks` alpha `0.019`, `mid-plankton-speckle` alpha `0.012`; final Playwright saturation averages were about `0.4191` at threshold and `0.4365` at deep overlay.
- Water off: visible water layers `0`; saturation average `0.4417`.

Likely cause:

- `src/helpers.ts:1064-1070` switches to `mid` at `depth >= 520`.
- `src/helpers.ts:1115-1119` makes B2 mid water-column masks much stronger than upper (`haze: 1.32`, `sediment: 1.86`).
- `src/helpers.ts:1297-1311` enables a B2-mid post-darkness veil (`alpha: 0.078`, `particleAlpha: 0.032`, `bandCount: 18`, `particleCount: 140`).
- `src/scene-rendering.ts:136-155` converts source masks into white alpha textures from luma, which exposes rectangular mask structure when the source has broad blocks.
- `src/scene-rendering.ts:256-301` draws those masks as full-screen tile sprites, tinted and alpha-capped at up to `0.04`.
- `src/scene-rendering.ts:350-360` adds extra B2-mid broad ribbons before darkness.
- `src/scene-rendering.ts:3655-3698` then calls `drawPostDarknessWaterColumnVeil()` after the darkness mask, so any B2-mid veil/bands sit over the final lit readability pass.
- `src/scene-rendering.ts:3710-3768` adds the B2-mid guarded screen veil and broad/horizontal bands over the scene.

The most visible rectangular artifacts in the proof look like the full-screen alpha-mask tile sprites, while the post-darkness veil likely compounds the gray, screen-wide readability wash.

## Recommended fix checklist

1. Remove `biome-brine-vent-sulfide-shelf` from the biome 2 `surface` pool, or gate surface authored landmarks until the player is below the barge/entry depth.
2. If B2 needs a surface cue, use a much lower-alpha, shallower-specific asset; do not use the full mid shelf at surface alpha `1` with `1.62x` viewport height.
3. Reduce B2-mid water-column mask strength, especially sediment/haze, and add an edge/coverage guard so source mask rectangles cannot become visible full-screen panes.
4. Move or reduce the B2-mid post-darkness veil so it does not sit over the lamp/readability pass; keep it out of the central play/lamp region and avoid broad screen fills.
5. Add a small regression capture set: B2 surface/entry, B2 upper good-depth, B2 mid water-on, B2 mid water-off, plus grayscale versions.

## Caveats/blockers

- The Playwright gate now records frame-cadence data, but it is a proof-run warning rather than the main hard FPS gate. Every B2 capture was flagged below smooth 60fps by the in-page rAF sampler.
- The final Playwright gate uses immediate reachable-water staging for the two mid-band moments to avoid normal-play sinking into lower B2 before the still is saved. The threshold target `530 m` landed at actual `624 m`, which is still mid-band and after the `depth >= 520` code cutoff; exact adjacent stills at `510/520 m` are still not part of the hard gate because exact centerline staging can collide with generated terrain.
- The final deep water-off comparison is same-location/same-band and isolates the water-column pass, but normal play continued for a moment and a creature contact indicator appears in that off capture.
- No source changes, staging, or commits were made by this scout.

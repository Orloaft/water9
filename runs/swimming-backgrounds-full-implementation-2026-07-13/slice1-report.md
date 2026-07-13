# Swimming Backgrounds Slice 1 — Readability and Cutoff Continuity

Status: **implemented and committed with measured acceptance misses**

Date: 2026-07-13
Branch: `swimming-backgrounds`
Starting HEAD: `04f9e4d`

## Scope and worktree classification

This report covers only Slice 1. No new art, movement/camera work, default-diver
change, or Slice 2–4 composition work was included.

- Pre-existing tracked dirt was the manager-authored final `REPORTED 2026-07-13`
  tick in `runs/swimming-backgrounds-adversarial-appraisal-2026-07-13.md`.
- Pre-existing untracked dirt was the manager-authored full-implementation ledger
  and Slice 1 prompt. Those files are included unchanged except for the ledger's
  accurate Slice 1 implementation/proof status.

## Root cause and implementation

Cutoff discontinuity came from independent special cases: band selection, a
second renderer-side band fade, one-off transition-deep landmark logic, and
separately stepped clear/scenic/water/darkness/veil decisions. Lamp gloom also
used narrow filled strips whose 3.7x presentation exposed the step edges.

- Added one exported continuous depth-band descriptor for all four ordinary
  boundaries (120, 520, 1040, and 1440 m), each 160 m wide. Clear color,
  painterly/scenic alpha, water-column layers, ambient/darkness, post-darkness
  veil, and outgoing/incoming anchor slots now consume that descriptor. Removed
  the duplicate scenic fade.
- Generalized outgoing/incoming landmark slots and kept the same preferred
  landmark identity across a transition. The deterministic 1 m sweep measured
  maximum per-step alpha change `0.053874` and maximum screen-position change
  `0 px` at play scale 3.7.
- Replaced the old 4-world-pixel strip lamp build with twelve bounded vector
  occlusion layers. The beam, diver field, flares, biolume rooms, and at most
  four nearest actionable threats are holes in the same Canvas path; no new
  full-screen multipass was added. The water-column sprite budget remains at
  most one visible sprite.
- Added a small soft diver-local separation field independent of beam direction.
  Protected-corridor attenuation applies only to background/scenic/landmark and
  veil contributions; foreground terrain and actionable threats remain present.
- Added a normal-play cutoff teleport helper that selects an open-water column
  without modifying terrain and locks both sides of a captured pair to that same
  X coordinate.

## Verification

- `npm run build`: PASS. Only the existing unresolved-at-build asset and chunk
  size warnings remain.
- `npm run water9:depth-band-continuity-smoke`: PASS; 2,576 profiles across four
  biomes/four cutoffs at 1 m spacing. Width `160 m`; max alpha delta `0.053874`;
  max clear-channel delta `1`; max anchor position delta `0 px`.
- `npm run water9:lighting-visibility-smoke` on port 5194: PASS.
- `npm run water9:save-load-smoke` on port 5195: PASS.
- `npm run water9:presentation-smoke` on port 5198: FAIL on its existing sonar
  panel visibility assertions for desktop and narrow layouts; Slice 1 does not
  change sonar UI.
- `npx tsc --noEmit`: inherited exit 2 both before and after, with the same 49
  output lines/error families. Changed-file line numbers shifted; no new error
  family appeared. Baseline and after logs are in the artifact manifest.

## Normal-play visual evidence

All eight frames are actual `#game canvas` normal-play DeepdiveScene captures at
1440x900 with one Canvas renderer, live HUD, and `Abyssal Salvage` runtime
identity. Color and page-grayscale versions are present. Metrics sample only the
Canvas backing store, excluding the live DOM HUD.

| Pair frame | Actual depth | Mean luma | Below luma 24 | Diver edge | Threat edge |
|---|---:|---:|---:|---:|---:|
| B1 target 110 | 108 m | 48.65 | 0.16% | 157.33 | n/a |
| B1 target 130 | 132 m | 49.24 | 0.16% | 167.68 | n/a |
| B2 target 510 | 510 m | 31.72 | 22.70% | 105.90 | n/a |
| B2 target 530 | 528 m | 30.80 | 28.01% | 103.07 | n/a |
| B3 target 1030 | 1032 m | 18.36 | 75.57% | 20.78 | n/a |
| B3 target 1050 | 1050 m | 20.03 | 74.42% | 67.59 | n/a |
| B4 target 1430 | 1428 m | 26.67 | 53.14% | 70.78 | n/a |
| B4 target 1450 | 1452 m | 25.60 | 64.18% | 66.50 | 1.72 |

Results:

- Deep-frame darkness ceiling: PASS, maximum `75.57%` below luma 24 (target
  <=80%).
- Adjacent mean-luma continuity: PASS, maximum delta `1.67` (target <=8).
- Adjacent below-luma-24 continuity: MISS, B4 delta `11.04` percentage points
  (target <=10); other pairs were `0`, `5.31`, and `1.15`.
- Diver/actionable-threat edge contrast: MISS, 6/8 frames (`75%`) passed the
  25-luma combined frame criterion (target 95%). B3 1030 diver contrast was
  `20.78`; the B4 1450 actionable threat was `1.72`. Large hostile silhouettes
  can still overlap/merge with the deep scene even though corridor contributors
  are attenuated. The capture and metric were not relabeled PASS.
- Interaction text: `NOT_PRESENT` in this cutoff matrix, so the 4.5:1 condition
  was not exercised. Transient combat floating text was deliberately not
  misclassified as interaction text.

## Settled 25-second B4 Canvas gate

Command used a 5-second warmup and 25-second probe on port 5193. Final report:

- independent rAF: p95 `33.3 ms` MISS, p99 `33.4 ms` MISS, `2.14%` over
  33.34 ms MISS; no sample over 50 ms.
- game frame rAF summary: p95 `20.0 ms`, p99 `20.0 ms`, `0%` over 33.34 ms.
- `outer.frameTotal`: p95 `3.7 ms` PASS (target <=8 ms), p99 `4.9 ms`.
- background/water/anchor/darkness combined: p95 `0.5 ms` PASS (target <=1 ms):
  parallax `0.1`, water `0.1`, anchors `0.1`, darkness `0.2` ms.
- post-warmup long tasks over 50 ms: `0` PASS.

The gate also reports an inherited scenario-quality caveat: its requested 1650 m
reachable teleport resolved to 582 m and its final view had zero visible
articulated parts, so it classified the run `mixed-or-unenclosed`. The rAF miss
therefore remains real evidence, but is not attributable to the affected render
passes, whose combined p95 is 0.5 ms. `draw.total` had a 10.5 ms isolated maximum
and also missed the smoke's inherited 8 ms maximum assertion.

## Evidence and remaining recommendation

- Durable manifest:
  `runs/swimming-backgrounds-full-implementation-2026-07-13/slice1-artifacts.json`
- Artifact root:
  `/home/orlovboros/artifacts/managers/water9/swimming-backgrounds-full-implementation-2026-07-13/slice1/`
- Deterministic continuity report:
  `runs/swimming-backgrounds-full-implementation-2026-07-13/slice1-continuity-smoke.json`

Slice 2 should retain this blend descriptor as the sole transition authority and
focus its composition/landmark grammar on protected negative space. Before
promoting the integrated work, explicitly address large-hostile overlap/scale
and interaction-text staging in Slice 4, and repair the B4 gate's deep staging so
the remaining independent-rAF cadence miss can be measured in a genuinely busy
deep view.

# Swimming Backgrounds Slice 2 — Composition and Landmark Grammar

Status: **implemented; manager visual grading pending**

Date: 2026-07-13

Branch: `swimming-backgrounds`

Starting HEAD: `8aa7f4f`

## Scope and design

Slice 2 replaces band-selected landmark rerolls with a seed/location-sticky,
data-driven composition grammar. Slice 1's `activeBandBlend` remains the sole
depth-transition authority and retains its 160 m (minimum 120 m) crossfades.
Matching outgoing/incoming slots collapse to one rendered bitmap during a
crossfade, so a cutoff cannot double the composition or pop its family.

| Biome | Grammar / negative-space axis | Scale | Visible crop | Opacity | Slots | Corridor radius |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | luminous organic shelves / broad center | 0.78–1.00 | 0.62–0.92 | 0.16–0.34 | 1 dominant + 1 supporting | 62 px |
| B2 | lateral brine shelves and vent-plume horizon | 0.76–0.96 | 0.66–0.94 | 0.18–0.38 | 1 + 1 | 62 px |
| B3 | sparse black-coral/structural ribs / vertical void | 0.72–0.94 | 0.54–0.82 | 0.18–0.34 | 1 + 1 | 64 px |
| B4 | repeated monumental side axes guiding travel | 0.70–0.90 | 0.48–0.76 | 0.20–0.40 | 1 + 1 | 66 px |

Every biome has a 0.45 maximum projected area for any non-event landmark and a
0.05 maximum corridor overlap. Placement reserves the player/interact corridor
before accepting a slot. Stable keys use the biome, world seed, 2048-world-pixel
location cell, and composition role; asset selection does not depend on the
depth band. The renderer continues to use one visible water-column sprite.

The old B4 full-view procedural ruin-plane fill/diagonals were removed. B4 now
uses side-cropped bitmap axes and an elongated, bounded player separation field
instead of the rejected circular field. The existing darkness pass also cuts
bounded holes for the two deep composition slots and nearby normal/articulated
threats. This adds no full-screen pass, does not brighten the biome globally,
and preserves terrain, objectives, prompts, and actor draw order.

## Existing runtime bitmap curation

No art was generated or commissioned. Each pool has three already-resident
runtime bitmaps:

- B1: living-coral terrace, shell-survey terrace, reef arch.
- B2: sulfide/brine shelf, vent-brine curtain, organic vent garden.
- B3: black-coral ribs, transition rib field, pressure ribs wide.
- B4: vault/causeway lattice, drowned signal station, collapsed sub elevator.

All 39 normal-play captures rendered both composition slots from live texture
keys with positive source dimensions (39/39 residency). The exact texture key,
source dimensions, crop, screen bounds, seed/location key, and slot role are in
`visual-evidence.json` and the artifact manifest.

Asset gaps are real rather than hidden: B2 has one bespoke natural brine shelf;
its other two choices are generic transition assets. B3 has one bespoke
black-coral bitmap and two more abstract transition rib assets. They provide
three stable identities, but visual cohesion and blind recognition still need
manager judgment and may justify future art outside this slice.

## Deterministic gates

`npm run water9:background-composition-smoke` sampled 4 biomes × 12 seeds × 2
locations (96 frames) and 192 cutoff comparisons:

- maximum projected landmark area: **0.185294** against 0.45;
- maximum corridor overlap: **0**; intersection frequency **0/96 (0%)** against 5%;
- revisit identity misses: **0**;
- across-chunk identity misses: **0**;
- cutoff identity misses: **0/192**;
- maximum dominant/supporting count: **1/1**;
- runtime residency: both slots loaded and rendered in every biome fixture;
- old B4 procedural ruin plane absent; one-visible-sprite water-column and
  threat-protection assertions pass.

## Normal-play visual evidence

The capture set contains 39 live `#game canvas` normal-play views at 1440×900,
all with HUD/runtime identity, plus 39 full-viewport grayscale companions. It
covers seeds 101/202/303 at 110, 760, and 1450 m in all four biomes, plus exact
B3 1030/1050 and B4 1430 regression staging (B4 1450 is in the matrix). Twelve
HUD-free 760 m cards are shuffled into a separately keyed recognition index.

Measured across the 39 frames:

- maximum actually visible landmark area: **0.128998 (12.8998%)**;
- corridor overlap: **0/39 (0%)**;
- runtime bitmap residency: **39/39**;
- unique dominant asset identities at the three representative mid-depth seeds:
  **B1=3, B2=3, B3=3, B4=3**.

Regression views:

| View | Actual depth | Max landmark area | Corridor | Diver edge | Threat edge | Result |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| B3 seed 202 / 1030 | 1032 m | 0.046020 | 0 | 51.41 | 1.00 | old full-view form absent |
| B3 seed 202 / 1050 | 1050 m | 0.046020 | 0 | 12.78 | 6.27 | same sticky rib family across cutoff |
| B4 seed 202 / 1430 | 1428 m | 0.055878 | 0 | 18.70 | 4.86 | side axes; circular field absent |
| B4 seed 202 / 1450 | 1458 m | 0.055878 | 0 | 15.99 | 1.00 minimum (one threat was 14.30) | same sticky ruin family |

The rejected B3 landmark therefore falls from a screen-filling read to at most
4.602% in the exact pair. B4 stays below 5.588% in its exact pair and leaves the
protected axis clear in grayscale. These are worker measurements, not manager
visual acceptance.

The threat fix is deliberately local: nearby B4 fish and articulated threats
receive a larger hole in the existing darkness mask. One deep B4 sample reaches
43.37 edge contrast, but the full matrix still contains intrinsically dark fish
at 0.79–4.86. That residual miss is explicitly carried to Slice 4's authorized
interaction/threat separation work; no global biome brightening or gamey outline
was introduced here. B3 also contains low-contrast threat samples despite the
background landmark staying clear.

No human recognition grades or three-reviewer evidence were obtained. The
shuffled index and separate answer sheet are delivered for manager grading; the
three unique runtime identities per biome are not claimed as human recognition.

## Verification

| Check | Result |
| --- | --- |
| `npm run build` | PASS; inherited unresolved-asset and large-chunk warnings only |
| Slice 1 depth continuity | PASS: 2,576 profiles, max alpha delta 0.053874, max clear-channel delta 1, max anchor-position delta 0 px |
| Slice 1 lighting visibility | PASS |
| background composition smoke | PASS: all numeric gates above |
| biome creature balance | PASS |
| save/load smoke | PASS, including corrupt-save isolation |
| presentation smoke | inherited FAIL: desktop and narrow sonar panel not visible |
| `npx tsc --noEmit` | inherited exit 2 before/after: same 49 output lines / 25 diagnostics |
| broad perf guardrails, solo | inherited/noisy FAIL: collision assertion plus cadence/long-task gates |
| short B4 dense sample | whole-frame FAIL, but background composite p95 0.9 ms; anchors p95 0.1 ms; darkness p95 0.5 ms; outer-frame p95 8.9 ms; 0 long tasks |

The final B4 sample's failed assertions were independent-rAF p95 33.4 ms/p99
33.5 ms, 11.34% over 33.34 ms, outer-frame max 26.8 ms, and draw p95/max
5.1/18.5 ms. These gates were not weakened. The measured Slice 2 background
work remains within the 0.9 ms composite p95, while broader cadence optimization
remains Slice 4 work.

## Evidence paths

- Artifact root: `/home/orlovboros/artifacts/managers/water9/swimming-backgrounds-full-implementation-2026-07-13/slice2/`
- Manifest: `runs/swimming-backgrounds-full-implementation-2026-07-13/slice2-artifacts.json`
- Measurements: `.../slice2/visual-evidence.json`
- Shuffled recognition gallery/index: `.../slice2/recognition-index.html` and `.../slice2/recognition-index.json`
- Separate answer key: `.../slice2/recognition-answer-key.json`
- Deterministic smoke: `runs/swimming-backgrounds-full-implementation-2026-07-13/slice2-composition-smoke.json`

The manifest covers 105 files / 32,190,836 bytes and records absolute and
relative paths, SHA-256 hashes, byte sizes, roles, seeds, target/actual depths,
regression labels, and capture provenance where applicable.

## Carry-forward to Slice 4

- Evaluate localized interaction/threat separation for the remaining dark B4
  fish (and B3 threat samples) without lifting whole-biome brightness.
- Trace the broader B4 cadence misses; background anchors/darkness are already
  separately measured, so optimize only from trace evidence.
- Have the manager grade the shuffled recognition sheet. If B2/B3 fail, treat
  the generic transition-pool limitation as an asset gap rather than faking
  additional procedural variety.
- Recheck prompt/objective samples when Slice 4's interaction-aware dimming is
  implemented; Slice 2 does not alter prompt or objective rendering.

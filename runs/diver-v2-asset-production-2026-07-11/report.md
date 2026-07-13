# Diver v2 pixel-production correction

- Date: 2026-07-11
- Repository/HEAD: `/mnt/nxt-dev/water9` at `72f2bae`
- Scope: asset correction only; no game source edits, recapture, integration, or runtime claim
- Status: **COMPLETE**
- Readiness: **READY_FOR_MANAGER_ART_REVIEW**

## Outcome

The rejected first pixel pass was preserved under `artifacts/rejected-first-pass/`. The
selected high-resolution master was preserved byte-for-byte at
`artifacts/master/selected-master-board.png` (SHA-256
`8ce864742dda5cdf8f8c6b0ba43e5b7acb263e72515138468f4fd91455c43014`). The production
art was then redrawn from shared native pixel primitives: 31 body cells and 9 modular scanner
attachments. Four separate scanner-effect references remain separate and non-integrated.

The corrected four-key gate is
`artifacts/review/corrected-key-gate-before-after-master.png`. It compares the unchanged
master, preserved rejected keys, and corrected keys at 1×, 2×, 30, 44, and 60 px. Only after
that gate visibly passed were the same primitives propagated to every in-between.

## What changed

The new upright construction is one interlocking mass: twin-cylinder pack, shoulder plates,
33×32 helmet, six-pixel neck ring, broad chest/rubber joint block, waist, and hip belt. Arms
and legs are 9–10 px assemblies with explicit 4–6 px elbows/knees, heavy gloves, boots, and
fins. Brass, rubber, steel, and cyan glass are described with disciplined 2–4 px clusters
inside broad readable fields, without painterly dust.

Hover keeps helmet/torso roots fixed while boots and arms settle asymmetrically by one pixel.
Cruise is a 113×51 (2.22:1) coherent horizontal silhouette with a tucked brace, working arm,
pack/torso/helmet chain, paired thick legs, knee caps, and distinct fin phases.

The scanner head grew from a tiny floating cyan bar into a 20×13 px glove-overlapping
industrial tool with steel housing, cyan display, brass emitter, and connector. Deploy, lock,
and recover use distinct working-arm, brace-arm, and attachment placements. The complete
named-rejection audit is in `artifacts/spec/visual-inspection.md`, with side-by-side evidence
in the focused key gate and preserved first-pass directory.

## Preserved contract and lineage

- Cell: 128×96 RGBA; authored right-facing; nearest-neighbor reviews.
- Safe bounds: inclusive `(8,8)-(120,88)`.
- Pivot `(56,48)` and nominal sockets front hand `(78,47)`, back hand `(65,45)`, backpack
  `(37,39)`, effect origin `(91,47)`.
- Exactly 20 allowed opaque colors; body/attachment alpha is binary and transparent RGB zero.
- Required clips: idle 6, accel 4, cruise 8, decel 4, deploy 3, hold 4, recover 2.
- Unchanged master generation prompt and reference lineage remain in `prompt-ledger.json` and
  `source-lineage.json`; the correction authorship and rejected-pass lineage were appended.
- `artifact-hashes.json` records SHA-256 for the selected master, scripts, every production
  PNG, every regenerated review PNG, manifest, palette JSON, and GPL palette.

Key corrected hashes:

| Artifact | SHA-256 |
|---|---|
| `idle_hover_00.png` | `ab85e4891aee5b1a5e72abc4f6baaa86659098474224fb02db72effb76da3d60` |
| `swim_cruise_00.png` | `db6f43f5152b9a6bd6baf06a91aab4f68780a8d2c48be1f3c1ca897fa6130458` |
| `scanner_deploy_02.png` | `4c650a12b9d431923ee61fc4c05e6102c59ca57dd585219f253aa57d93172bb9` |
| `scanner_scan_hold_00.png` | `61d321e0fde27d0b2ced649df2c53bede9c1af19880004afdedf227f745f43d8` |

## Validation

`python3 validate_assets.py` returns **PASS: 0 errors, 0 warnings; 31 body frames**.

It verifies frame counts/names, 128×96 dimensions, binary alpha, transparent RGB/corners,
20-color membership, safe bounds, pivots/sockets, manifest coverage/orphans, connected
clusters, attachment/effect coverage, and loop root deviation. Idle, cruise, and scanner-hold
helmet/torso metadata deviations are all `0×0 px`.

## Blunt art verdict

**READY_FOR_MANAGER_ART_REVIEW.** This is a material redraw, not a validator-only pass or a
label/effect enlargement. The old schematic/stick-limb failure is removed, cruise now meets
the compact horizontal target, scanner intent reads without HUD/effect, and the 30 px proof
retains anatomy/action. It is still not runtime-accepted. Authentic canvas placement,
mirroring behavior, event timing, sockets, and surface/mid/deep/grayscale contrast remain a
separate integration gate.

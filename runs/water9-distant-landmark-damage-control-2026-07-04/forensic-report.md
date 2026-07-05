# Water9 Distant Landmark Forensic Report

Status: DONE

## Repo State

- Required preflight HEAD: `7776913`
- Repo path verified: `/mnt/nxt-dev/water9`
- Repo dirty: yes.
- Current dirty state includes modified `package.json`, `src/helpers.ts`, `src/hud.ts`, `src/scene-playtest.ts`, `src/scene-rendering.ts`, `src/scene.ts`, `src/styles.css`, `src/types.ts`, plus many untracked `public/assets/generated/background-phase3/`, `runs/`, `tools/build_*`, `tools/review_*`, and `tools/source-inbox/` files.
- Audit mode note: no source/game/assets were edited. The only write was this requested report under `runs/water9-distant-landmark-damage-control-2026-07-04/`.

## Best Matching Prior Proofs

Primary source: `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/`

- B1 surface 119:
  - `/mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome1-depth119-canvas.png`
  - Supporting upper-band match: `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome1-benchmark-upper-shell-survey-runtime-canvas.png`
- B1 upper 180:
  - `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome1-benchmark-upper-shell-survey-runtime-canvas.png`
- B2 mid 760:
  - `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome2-mid-vent-sulfide-shelf-runtime-canvas.png`
- B3 lower 1260:
  - `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome3-lower-black-coral-ribs-runtime-canvas.png`
- B4 lower 1260:
  - `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome4-lower-vault-causeway-runtime-canvas.png`
- Best overview/contact proof:
  - `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome-background-contact-sheet.png`

These are real `#game canvas` captures, not generated-only review sheets. The run report says they were captured from the Water9 runtime at `http://127.0.0.1:5237/`, canvas `1280x800`, HEAD `7776913`, with `backgroundReview` metadata and a provenance file.

## Likely Good Asset/Code Path

Good proof run/report:

- `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/report.md`
- `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome-background-provenance.json`

Good runtime renderer path:

- `src/helpers.ts`
  - `painterlyBackgroundManifest`
  - `environmentVisualProfileFor`
  - `environmentAnchorSilhouettesFor`
  - `biomeLandmarkPools`
- `src/scene-rendering.ts`
  - `drawParallax`
  - `drawBackgroundAnchors`
- `src/scene-playtest.ts`
  - playtest `backgroundReview` and depth/camera staging commands used by the proof scripts.

Good assets identified by provenance:

- B1: `biome-shallows-shell-survey-terrace`
  - `/mnt/nxt-dev/water9/public/assets/generated/background-phase3/water9-biome-landmark-shallows-shell-survey-terrace.png`
  - Also mixes with `kelp-curtain-cluster`, `reef-arch-distance`, `cable-buoy-chain`, and normal Phase 11 far/mid transition anchors in the good B1 upper provenance.
- B2: `biome-brine-vent-sulfide-shelf`
  - `/mnt/nxt-dev/water9/public/assets/generated/background-phase3/water9-biome-landmark-brine-vent-sulfide-shelf.png`
  - This is the important one. The July 3 B2 good proof provenance names `biome-brine-vent-sulfide-shelf` twice as the visible anchor.
- B3: `biome-midnight-black-coral-ribs`
  - `/mnt/nxt-dev/water9/public/assets/generated/background-phase3/water9-biome-landmark-midnight-black-coral-ribs.png`
  - Current manifest notes say this was restored to use `/mnt/nxt-dev/water9/tools/source-inbox/water9-phase11-transition-mid-collapsed-gantry-brine-reef-gpt-source.png`.
- B4: `biome-ruins-vault-causeway-lattice`
  - `/mnt/nxt-dev/water9/public/assets/generated/background-phase3/water9-biome-landmark-ruins-vault-causeway-lattice.png`
  - Current manifest notes say this was restored to use `/mnt/nxt-dev/water9/tools/source-inbox/water9-phase11-transition-far-drowned-signal-station-gpt-source.png`.

## Likely Breaking Changes

Rejected visual direction confirmed by:

- `/mnt/nxt-dev/water9/runs/water9-painterly-landmark-visual-recovery-2026-07-04/water9-painterly-landmark-visual-recovery-contact-sheet.png`

Likely breaks:

- B2 asset ID replacement:
  - `tools/build_biome2_brine_shelf_gpt_asset.py` reads `/mnt/nxt-dev/water9/tools/source-inbox/water9-biome2-brine-vertical-chimney-gpt-source.png`, writes `water9-biome-landmark-brine-vertical-chimney-gpt.png`, and inserts `biome-brine-vertical-chimney-gpt`.
  - `src/helpers.ts` now maps B2 pools to `biome-brine-vertical-chimney-gpt` in surface/upper/mid/lower.
  - Current manifest contains `biome-brine-vertical-chimney-gpt`; current manifest does not contain the good proof's `biome-brine-vent-sulfide-shelf`.
  - Result: the good dark horizontal B2 shelf/ledge proof was replaced by a tall chimney/cathedral-like cutout.
- Proof/review scripts changed the target framing:
  - `tools/review_immediate_biome_landmark_proof.mjs` and `tools/review_painterly_landmark_visual_recovery.mjs` default to first-water depth around `12`/surface and expect the vertical B2 asset.
  - Those scripts produce proofs of huge immediate landmarks rather than the requested B1 119/180, B2 760, B3/B4 1260 distant background read.
- Oversized anchor placement:
  - In `src/helpers.ts`, authored biome landmarks get large height multipliers: B2 `3.25`, B3 `3.72`, B4 `3.36`; surface immediate landmarks use viewport-height sizing.
  - In `src/scene-rendering.ts`, B2 mid filters down to a single `biome-brine-vertical-chimney-gpt` anchor, emphasizing the pasted-chimney read.
  - The rejected sheet shows this at surface depth: B2/B3/B4 become huge foreground-like bitmap cutouts.
- B1 flat/vector look:
  - The B1 asset itself is `water9-biome-landmark-shallows-shell-survey-terrace.png`, but the rejected visual recovery sheet uses it at first-water/surface scale, producing flat shell-arch/vector-looking forms instead of the subtle top/background shelf seen at 119/180.

## Smallest Restoration Prompt

Restore the subtle distant landmark look using the July 3 runtime proofs as the reference. Work only in `/mnt/nxt-dev/water9`; first run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`, `pwd`, and `git rev-parse --show-toplevel`, then preserve unrelated dirty work. Do not run destructive git commands. Make the smallest code/manifest changes needed so normal gameplay `#game canvas` at B1 surface 119 and upper 180, B2 mid 760, B3 lower 1260, and B4 lower 1260 matches `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome-background-contact-sheet.png`, not the oversized `/mnt/nxt-dev/water9/runs/water9-painterly-landmark-visual-recovery-2026-07-04/water9-painterly-landmark-visual-recovery-contact-sheet.png`. In particular, restore B2 mid to the prior `biome-brine-vent-sulfide-shelf` asset/code path instead of `biome-brine-vertical-chimney-gpt`, keep B1 as a hazy top/background shelf at 119/180, and tune B3/B4 lower placement/scale/opacity to the wide distant 1260 proofs. Produce normal gameplay `#game canvas` color and grayscale captures for all target bands and a short report. Do not claim acceptance; manager will visually inspect.


# Biome 1 Landmark Transition Audit

Status: COMPLETE - read-only audit, no game code/assets changed

Retry marker: b1-retry-2026-07-06-a5a8dc2b

Preflight HEAD: 2c4ff8d

## B1 Landmark Count Table

| Category | Count | Runtime status | Details |
| --- | ---: | --- | --- |
| B1 authored bitmap landmark variants that can appear in normal gameplay | 1 | Active | `biome-shallows-organic-reef-shelf`, texture `water9-biome-landmark-shallows-organic-reef-shelf`; in the B1 pool for `surface`, `upper`, `mid`, `lower`, and `transitionDeep` in `src/helpers.ts:615`. |
| B1 authored bitmap landmark variants in inventory but not normal gameplay | 1 | Present but unreachable | `biome-shallows-shell-survey-terrace`, texture `water9-biome-landmark-shallows-shell-survey-terrace`; manifest notes say it was rejected from runtime for flat shell arches, circular pads, and rectangular linework. No current B1 pool references it. |
| B1 decorative bitmap band plates | 1 source asset, 4 active synthetic band entries | Active outside surface | `biome1-organic-shallow-reef-band` is reused as `biome1-organic-upper/mid/lower/transitionDeep-reef-band` with per-band opacity `0.42/0.34/0.28/0.22` in `src/helpers.ts:784`. This is decorative background, not an anchor landmark. |
| Generic Phase 3/procedural landmark cutouts usable by B1 normal gameplay | 0 | Blocked for B1 | `genericPainterlyLandmarksForBand` exists, but B1 non-surface candidate selection is forced to `normalBiome1OrganicLandmarks`; surface returns only the authored B1 pool. |
| Generated/procedural fallback shapes drawn as landmarks in B1 normal gameplay | 0 | Not used | Procedural anchor fallback code remains for other/unstrict paths, but B1 has an available strict organic landmark, so it never enters the generic/procedural selection path. |
| Normal visible B1 anchors per 1280x800 gameplay view in proof | 2 | Observed | All three normal-play captures reported two `biome-shallows-organic-reef-shelf` anchors. Surface exact band would produce one immediate anchor, but the normal reachable capture landed at depth 120 and therefore used the upper band. |

## Current Rules

- Asset loading: every manifest asset whose status is `ready` is loaded from `public/assets/generated/background-phase3/background-phase3.manifest.json`; `rejected` assets are not given a render texture key.
- B1 pool: `src/helpers.ts:611`-`631` routes all B1 bands to `biome-shallows-organic-reef-shelf`.
- B1 old standout: `background-phase3.manifest.json:391` keeps `biome-shallows-shell-survey-terrace` on disk, but manifest notes mark it rejected from runtime. It is not in the active B1 pool.
- Depth bands: `src/helpers.ts:1071`-`1080` selects `surface <120m`, `upper 120-519m`, `mid 520-1039m`, `lower 1040-1439m`, `transitionDeep >=1440m`. The transitionDeep profile data starts at 1260m, but actual band selection does not switch until 1440m.
- B1 anchor selection: non-surface B1 uses only the organic landmark, with spacing `980`, odd slots skipped, and deterministic hash placement; no random variant choice exists because the pool has one asset.
- Surface behavior: if the active band is exactly `surface`, the first B1 authored landmark is returned as a single immediate anchor with alpha `0.26`, height `0.36 * viewHeight`, and width multiplier `2.7`.
- Layering: parallax band images render first; B1 organic anchors get a soft-edge texture and render at depth `-6.77`, in front of ordinary background anchors and most water-column sprites, but behind gameplay terrain/entities.
- Fog/darkness: B1 water-column sprite alphas are capped low (`<=0.032` haze, `<=0.019` sediment). Darkness starts after 140m and reached `0.354` at captured 558m and `0.446` at captured 666m.

## Normal-Play Proof Paths

Proof script:

- `runs/water9-biome-landmark-transition-audit-2026-07-06/b1/capture-b1-proof.mjs`

Proof JSON:

- `runs/water9-biome-landmark-transition-audit-2026-07-06/b1/b1-landmark-transition-proof.json`

Captures:

- `runs/water9-biome-landmark-transition-audit-2026-07-06/b1/b1-surface-very-shallow-depth119-normal-gameplay-canvas.png`
- `runs/water9-biome-landmark-transition-audit-2026-07-06/b1/b1-surface-very-shallow-depth119-normal-gameplay-canvas-grayscale.png`
- `runs/water9-biome-landmark-transition-audit-2026-07-06/b1/b1-mid-depth760-normal-gameplay-canvas.png`
- `runs/water9-biome-landmark-transition-audit-2026-07-06/b1/b1-mid-depth760-normal-gameplay-canvas-grayscale.png`
- `runs/water9-biome-landmark-transition-audit-2026-07-06/b1/b1-lower-before-b2-cutoff-depth1260-normal-gameplay-canvas.png`
- `runs/water9-biome-landmark-transition-audit-2026-07-06/b1/b1-lower-before-b2-cutoff-depth1260-normal-gameplay-canvas-grayscale.png`

Proof summary:

| Requested capture | Actual runtime depth/band | Anchor evidence | Caveat |
| --- | --- | --- | --- |
| 119m surface/very shallow | 120m / upper | 2 organic shelf anchors, alphas `0.265`, `0.215`; organic upper band alpha `0.215` | Landed exactly at the upper cutoff, so this does not prove the special single surface-immediate anchor. |
| 760m mid-B1 | 558m / mid | 2 organic shelf anchors, alphas `0.324`, `0.206`; organic mid band alpha `0.129` | Normal reachable-water helper placed a shallower open-water point than requested. |
| 1260m before B1->B2/late cutoff | 666m / mid | 2 organic shelf anchors, alphas `0.322`, `0.268`; organic mid band alpha `0.127` | Lower/cutoff normal-play proof is BLOCKED: `teleportToReachableDepth` could not find/place open water at the requested lower depth in this generated B1 map and landed at 666m. |

All captures are direct `#game canvas` PNGs from `?playtest=1&biome=1&renderer=canvas` with `start`, `dive`, `teleportToReachableDepth`, `centerCameraOnPlayer`, and no `backgroundReview` staging.

## Why Alex May No Longer See The Former Standout Landmark

1. Highest confidence: the old standout is no longer in the B1 runtime pool. `biome-shallows-shell-survey-terrace` remains in the manifest, but B1 selection now references only `biome-shallows-organic-reef-shelf`.
2. High confidence: the old standout was intentionally replaced by the organic B1 pass. Prior reports say shell/arch/circular/rectangular reads were rejected, and the manifest notes explicitly describe the shell-survey asset as rejected from runtime.
3. High confidence: B1 now has one active landmark variant, so there is no seed/random chance of getting an alternate memorable/sweet B1 landmark. The same organic shelf repeats.
4. Medium confidence: the normal first-water experience can skip the special surface-immediate composition. The surface path applies only below 120m; the proof landed at 120m and used upper-band repeated anchors instead.
5. Medium confidence: mid-depth darkness and gameplay terrain can make the organic shelf subtle. The B1 organic anchor is in front of most fog, but it is still behind terrain and darkness masking.
6. Lower confidence: the old asset might look absent because it is present on disk and loaded historically, but current generic-landmark fallback and Phase 3 upper landmarks are explicitly bypassed for B1 normal bands.

## Recommended Smallest First Slice

The smallest B1-specific fix candidate is not to touch shared transition logic. Add or replace a single B1-only authored bitmap landmark in the `biomeLandmarkPools[1]` path, preserving the B1 organic band plate and the current guard that blocks generic Phase 3/Phase 11 assets from B1.

Candidate order:

1. Replace `biome-shallows-organic-reef-shelf` with a stronger B1-specific organic/painterly landmark that keeps the accepted no-hatches/no-hard-rectangles/no-shell-arch constraints.
2. If the earlier sweet shell-survey read is desired, repaint it into an organic shallow landmark and add it as a second B1-only pool variant rather than restoring the rejected asset as-is.
3. Add deterministic first-water proof/fix around the `surface <120m` cutoff so normal entry reliably shows a memorable B1 landmark instead of immediately falling into repeated upper anchors.
4. Only after the asset is accepted, tune B1-only anchor alpha/size/framing. Do not solve this first with global fog or parallax changes.

## Verification Commands

- `pwd && git rev-parse --show-toplevel && git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`
- `node runs/water9-biome-landmark-transition-audit-2026-07-06/b1/capture-b1-proof.mjs`
- `node -e "const p=require('./runs/water9-biome-landmark-transition-audit-2026-07-06/b1/b1-landmark-transition-proof.json'); console.log(p.head, p.selectedPort, p.outputs.map(o=>[o.key,o.environment.stateDepth,o.environment.activeBand.id,o.environment.anchors.map(a=>a.assetId)]))"`
- `ss -ltnp | rg ':(5180|5181|5182|5183|5184|5185|5186|5187|5188|5189|5190|5191|5192|5193|5194|5195|5196|5197|5198|5199)\\b' || true`

## Caveats / Blockers

- The repo had unrelated pre-existing fauna/viperfish dirt; this audit did not modify it.
- Only files under this B1 run directory were written.
- The capture script briefly started Vite on allowed port `5180` and was manually stopped after writing proof because the wrapper process lingered after signalling its server. A follow-up `ss` check showed no listeners on `5180-5199`.
- The late-depth normal-play proof is incomplete for lower/cutoff depth because the normal reachable-water placement landed at 666m. Code audit covers the lower/transition rules, but visual lower/cutoff proof should be rerun with a seed/map or staging method that can reach B1 open water at 1040m+ without changing game code.

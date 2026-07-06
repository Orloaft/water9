# Water9 Biome Landmark Transition Audit - Manager Synthesis

Date: 2026-07-06
Repo HEAD verified: `2c4ff8d`
Scope: audit only; no game code or art assets changed.

## Bottom Line

Alex's read is valid. B1 no longer has the former memorable shallow shell/survey landmark in the runtime pool, and the deeper biomes have hard identity switches where one normal biome landmark gives way to busy shared transition landmark pools.

The strongest first fix should be B1-specific: restore or replace a memorable shallow landmark in the active B1 pool and make first-water presentation reliably show it. The strongest systemic follow-up is lower-to-transitionDeep smoothing: fade outgoing biome-specific landmarks while fading in capped transition anchors, instead of snapping from one landmark language to another at 1440m.

## Landmark Counts By Biome

| Biome | Normal-play active authored landmark identity | Normal band count | Entry / surface issue | Transition-deep issue |
| --- | --- | ---: | --- | --- |
| B1 Shallows | `biome-shallows-organic-reef-shelf` | 1 | The former `biome-shallows-shell-survey-terrace` exists on disk but is manifest-rejected and unreachable in normal runtime. First-water proof landed at 120m/upper and showed repeated organic shelf anchors, not the special surface-immediate composition. | B1 keeps the same organic shelf, but band/fog/plate tuning still steps at transitionDeep. |
| B2 Brine | `biome-brine-vent-sulfide-shelf` | 1 | Surface has 0 anchors, then upper introduces the shelf abruptly. | Lower B2 is a dim single shelf; transitionDeep swaps to multiple large Phase 11 industrial anchors. |
| B3 Midnight | `biome-midnight-black-coral-ribs` | 1 authored B3 asset, lower band only | Entry has 0 authored B3 anchors; upper/mid rely on generic Phase 3 assets or none. | The black-coral identity disappears at transitionDeep and shared station/rib assets take over before B4. |
| B4 Ruins | `biome-ruins-vault-causeway-lattice` | 1 | Entry immediately shows a huge ruins anchor with no gentle ramp. | Lower B4 over-damps the ruins, then transitionDeep mixes ruins with Phase 8/10/11 station/gantry assets. |

## Transition Diagnosis

- Shared active bands hard switch at `<120`, `<520`, `<1040`, and `<1440` meters.
- The configured blend windows exist in profile data, but by the time the active band changes, blend progress is already mostly or fully clamped.
- Landmark selection keys off the active band, so lower-to-transitionDeep is effectively a step change.
- Normal bands often have one biome-authored anchor; transitionDeep can compute around seven anchors from shared/transition pools.
- Biome travel itself is a scene restart with a new seed, not an in-world crossfade.

## Visual Verdict

- B1 shallow proof is too empty and does not show the old sweet landmark. The visible organic shelf reads subtle and terrain-like rather than as a signature landmark.
- B2's worst jump is lower -> transitionDeep: dim single brine shelf to large industrial silhouettes.
- B3's worst issue is identity absence: no authored B3 signature at entry/upper/mid, then the one authored black-coral landmark only appears in lower and vanishes in transitionDeep.
- B4's issue is inconsistent readability: immediate giant ruins at entry, near-invisible ruins in lower, then busy mixed transition assets.

## Recommended Work Order

1. B1 signature restoration: add or replace one B1-only authored bitmap landmark in the active `biomeLandmarkPools[1]` path. If using the old shell/survey concept, repaint it to satisfy the current organic/no-hard-shape constraints instead of restoring the rejected asset as-is.
2. B1 first-water proof fix: make normal entry reliably exercise the intended surface-immediate landmark presentation below the 120m cutoff.
3. Transition smoothing: during lower -> transitionDeep, render both outgoing normal biome anchors and incoming transition anchors with depth-based opacity ramps.
4. Transition cap/selection guard: cap transitionDeep anchors to one or two per viewport per biome and prefer biome-specific transition pools before global Phase 11 fallbacks.
5. B3 bridge: let `biome-midnight-black-coral-ribs` appear at low alpha in upper/mid and fade through transitionDeep so B3 has a continuous identity.
6. B4 readability ramp: reduce instant entry dominance, undo the overly severe lower-band ruins multiplier, and avoid a sudden station collage in transitionDeep.

## Proof Artifacts

- B1: `b1/report.md`, `b1/b1-landmark-transition-proof.json`, three color/grayscale canvas capture pairs.
- B2: `b2/report.md`, `b2/b2-landmark-transition-proof.json`, normal and exact-depth capture pairs, plus manager contact sheet.
- B3: `b3/report.md`, `b3/b3-transition-canvas-proof.json`, boundary and lower-landmark capture pairs.
- B4: `b4/report.md`, `b4/b4-landmark-transition-proof.json`, entry/lower/transition capture pairs.
- Cross-biome transitions: `transitions/report.md`, `transitions/transition-canvas-proof.json`, 18 staged runtime `#game canvas` captures.

## Caveats

- B1 lower/cutoff normal-play visual proof is incomplete: reachable-water placement landed requested deep captures at shallower mid-B1 depths. Code audit still confirms the lower/transition rules.
- Several deeper exact-depth proofs use playtest staging to hit representative depths. They are real runtime `#game canvas` captures, but not hand-played traversal.
- Existing unrelated source dirt was present before the audit and was not touched.

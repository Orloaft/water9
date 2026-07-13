# Swimming Backgrounds Slice 3 — Swimming and Camera Feel

Status: **implemented with measured game-feel passes; visual acceptance reserved for manager**

Date: 2026-07-13

Branch: `swimming-backgrounds`

Starting HEAD: `edfbe27f83ddf8b887d113d9560aba66ffd97f2b`

## Scope and baseline

This slice changes only swimming response, legacy-diver animation intent,
camera lead/settle, the no-lead accessibility path, focused verification, and
normal-play evidence. It does not add art, promote a V3 diver, alter Slice 1
band/lighting behavior, alter Slice 2 composition grammar, add interaction
dimming, or optimize B4 speculatively.

The appraisal's coarse normal-play samples measured the inherited behavior as
approximately 280 ms to the 106 px/s cap, 160 ms through zero on reversal, and
500 ms to about 5% speed on release. A deterministic 1 ms reproduction of the
checked-in formula (300 px/s² thrust, held drag 1.45 s⁻¹, idle drag 2.65 s⁻¹,
106 px/s clamp) measured 427 ms to 90%, 286 ms through zero, and 869 ms below
10%. The differing methods are retained rather than collapsed into one claim.
The inherited camera lead and settle were both zero: the main camera was
hard-centered on the player every frame.

## Implementation

- Added `src/swimming-feel.ts` as the single pure authority for normalized input,
  thrust, held/coast drag, top-speed clamping, named animation intent, bounded
  camera lead, and a critically damped spring. The final no-upgrade curve uses
  285 px/s² thrust, 1.35 s⁻¹ propulsive drag, 2.55 s⁻¹ coast drag, and the
  existing 106 px/s cap. Keyboard and controller still merge into one control
  vector, then pass through the same normalization and curve.
- Motion now carries independent `phase` (`idle`, `acceleration`, `cruise`,
  `coast`, `brake`), vertical intent, and one of eight input directions. Legacy
  animation mapping is `swim` for acceleration, `boost` for cruise,
  `hover` for level coast/brake, and the authored `ascend`/`descend` sheets for
  cardinal vertical intent. The default remains the legacy diver; all V3
  query-gated paths are unchanged.
- Camera target is velocity-weighted from 15% to 90% speed and capped at 5% of
  the viewport (inside the required 3–7% band). It is view-only: simulation,
  collision, targets, reach, and player coordinates are not offset. Releasing
  input targets zero while physical velocity continues to coast. The exact
  critically damped update uses angular frequency 32, clamps crossings, and
  snaps subpixel rest to exact zero.
- Pointer mining now converts the pointer's screen position through the current
  authoritative camera at action time. Controller tool reach remains derived
  from player position/facing in world space. The focused invariant probe uses
  actual camera transforms, a real mineable tile, an open-water collision
  point, a solid collision point, and all eight directions.
- Added `Swimming camera lead` to title Options and the in-dive pause menu.
  Disabling it immediately clears the spring and centers the camera. The
  independent `water9.accessibility.v1` local-storage record persists through
  reload and save/load operations without coupling accessibility to one save.
- Added bounded playtest telemetry and an existing-water swim-lane selector for
  reproducible proof. The selector only searches the generated collision field;
  it reports `terrainModified: false` and does not carve or alter the world.

## Verification and measurements

| Measure | Inherited appraisal | Inherited formula replay | Final deterministic | Final normal-play sampled |
| --- | ---: | ---: | ---: | ---: |
| Acceleration | cap at ~280 ms | 90% at 427 ms | **446 ms** | **465.7 ms** |
| Reversal through zero | ~160 ms | 286 ms | **302 ms** | **315.7 ms** |
| Coast below 10% | by ~500 ms | 869 ms | **903 ms** | **916.2 ms** |
| Cardinal/diagonal spread | not isolated | normalized | **0%** | eight directions captured |
| Camera lead | 0% | 0% | **5.0%** | **5.0%** |
| Camera settle below 0.5 px | none | none | **221 ms** | **233.5 ms** |

The focused smoke passed twelve exact-zero resting samples. No-lead cleared a
nonzero active offset immediately and persisted both disabled and re-enabled
states across full page reloads. The actual eight-direction invariant probe
measured maximum world transform/reach drift below `5e-13`, preserved the same
real mining target (`2,7`), and preserved both open-water `false` and solid
terrain `true` collision outcomes under centered and 5%-led cameras.

| Check | Result |
| --- | --- |
| `npm run build` | PASS; inherited unresolved-at-build assets and large-chunk warning only |
| `npm run water9:swimming-camera-feel-smoke` | PASS; all motion, direction, animation, camera, persistence, and invariance gates above |
| save/load smoke | PASS |
| controller/sonar smoke | PASS |
| biome creature balance | PASS |
| Slice 1 depth continuity | PASS: 2,576 profiles; max alpha delta 0.053874; clear-channel delta 1; anchor motion 0 px |
| Slice 1 lighting visibility | PASS |
| Slice 2 composition | PASS: 96 frames/192 cutoff comparisons; max projected area 0.185294; corridor overlap 0; identity misses 0 |
| `npx tsc --noEmit --pretty false` | inherited exit 2; same 25 diagnostics/error families as Slice 2, with changed-file line shifts only |

### Strict sustained B4 non-regression

The unweakened 5-second warmup + 25-second Canvas probe remains **FAIL** on
presentation cadence and is not relabeled:

- independent rAF p50/p95/p99/max: `16.7/33.4/33.4/33.5 ms`; `9.43%`
  over 33.34 ms; no sample over 50 ms;
- `outer.frameTotal` p95/p99/max: `4.8/6.2/17.6 ms` (p95 gate passes);
- `draw.total` p95/max: `1.0/9.1 ms` (isolated max misses the inherited 8 ms
  assertion);
- combined parallax/water/landmark/darkness p95: `0.7 ms` (passes 1 ms);
- post-warmup long tasks: zero.

The command again requested 1650 m but resolved to 552 m and classified the
scenario `mixed-or-unenclosed`. It still contained 156 fish, 10 articulated
creatures/94 parts, and nine visible articulated parts. These results support
only non-regression accounting, not a Slice 3 performance fix.

## Runtime evidence

The accepted archive contains 83 capture/telemetry files plus 14 verification
files. All visual frames come from the normal-play `DeepdiveScene` with forced
Canvas renderer, one `#game canvas`, live Water9 HUD/runtime identity, and no
review harness or `backgroundReview` mode.

- 24 gameplay-scale canvas frames and 24 matching HUD/runtime frames cover all
  eight directions at acceleration, cruise, and coast.
- East motion sequences cover acceleration, reversal, release/coast, camera
  lead/settle, and immediate/no-lead rest with synchronized player/camera
  telemetry in `runtime-evidence.json`.
- Twelve surface/mid/deep frames cover B1 110 m, B2 760 m, and B4 1450 m in
  color and grayscale, both canvas-only and HUD/runtime versions.
- The manifest hashes 97 files / 31,228,912 bytes with SHA-256, roles, sizes,
  capture provenance, and zero accepted runtime/capture errors.

Paths:

- artifact root:
  `/home/orlovboros/artifacts/managers/water9/swimming-backgrounds-full-implementation-2026-07-13/slice3/`
- synchronized telemetry: `.../slice3/runtime-evidence.json`
- eight-direction frames: `.../slice3/directions/`
- motion/lead/no-lead sequence: `.../slice3/motion-sequence/`
- surface/mid/deep color/grayscale: `.../slice3/bands/`
- strict and regression outputs: `.../slice3/verification/`
- durable manifest:
  `runs/swimming-backgrounds-full-implementation-2026-07-13/slice3-artifacts.json`
- focused durable smoke:
  `runs/swimming-backgrounds-full-implementation-2026-07-13/slice3-motion-camera-smoke.json`

These are worker captures and measurements, not visual acceptance.

## Caveats and Slice 4 carry-forward

- The legacy package has honest horizontal `swim`/`boost`, upright
  `hover`, and cardinal `ascend`/`descend` sequences. It has no separate
  directional braking sheet, no directional coast family, and no diagonal
  vertical sheet. Coast and level brake therefore share `hover`; diagonals use
  rotated horizontal acceleration/cruise assets; cardinal vertical art
  overrides phase-specific art. Telemetry retains the exact phase/direction,
  but the missing visual distinctions are documented rather than invented.
- The upright hover transition is deliberately truthful to existing art and
  may read more strongly than a bespoke directional coast would. Manager visual
  review should decide whether a future, separately authorized legacy-family
  animation extension is warranted. No V3 promotion or new/generated art is in
  this slice.
- The surface/mid/deep frames are regression evidence only. Deep B3/B4 threat
  separation, interaction-aware dimming, and manager recognition grading remain
  Slice 4 work.
- The sustained B4 presentation miss and unreliable 1650 m staging remain Slice
  4 carry-forward. The current internal/background timings do not justify
  speculative optimization in this slice.

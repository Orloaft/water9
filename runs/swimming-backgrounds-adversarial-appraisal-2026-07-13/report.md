# Swimming Backgrounds Adversarial Appraisal

Status: **complete proposal; no product changes implemented**.

Date: 2026-07-13
Branch appraised: `swimming-backgrounds` at checkpoint base
`40a950ecac59fe784231299f732c5010dcceef9c`
Runtime: actual `DeepdiveScene`, Canvas renderer, normal play, live DOM HUD,
one `#game canvas`, port 5180 only

## Executive verdict

Water9 already has one credible visual benchmark: B1 surface play. Its coral
shelf, open-water negative space, readable diver, and strong HUD/minimap make
the world feel authored and navigable. The quality does not survive descent.
B2 mid and the exact B3/B4 cutoff captures frequently collapse into near-black
frames, hard lamp geometry, oversized painterly forms, or interaction clutter.
The deeper backgrounds are content-rich but not compositionally controlled.

Swimming is responsive, but it currently reads more like frictional top-down
movement than water. The unupgraded diver reaches top speed in about 280 ms,
reverses through zero in about 160 ms, and nearly stops within 500 ms. A hard
per-frame camera center and a five-state speed animation selector remove most
of the visual evidence of acceleration, inertia, or vertical swimming. The
next pass should therefore be a **readability and continuity slice**, not an
asset-production pass: control deep luminance and lamp geometry, interpolate
all depth-band transitions, impose background composition budgets, and add
automated gates before producing more art.

## Top five

1. **Critical — deep readability fails the play field.** B3 before and B4
   after put 85.31% and 89.76% of canvas pixels below luma 24. In grayscale,
   the player, terrain, landmarks, threats, and interaction prompts compete
   inside the same narrow value range.
2. **High — background scale and layering are uncontrolled at play-camera
   scale.** Deep exact-band frames can be dominated by screen-filling landmark,
   architecture, creature, or terrain forms; landmarks stop working as stable
   navigation references.
3. **High — ordinary band cutoffs still behave as state changes.** The B2
   upper-to-mid pair changes from 6.37% to 79.28% pixels below luma 24 and from
   three visible water layers to two. Only lower-to-transitionDeep has bespoke
   crossfade logic.
4. **High — movement, animation, and camera do not sell underwater mass.** The
   mechanic is predictable and usable, but acceleration, reversal, coasting,
   animation selection, and camera lock all converge on an overly immediate
   feel.
5. **High — visual ambition is spending unproven performance headroom.** This
   short B2 headless sample had cheap instrumented draw stages, yet prior
   committed B4 long-run evidence still misses presentation cadence. Adding
   more full-screen effects or sprites before a B4 gate would be unsafe.

## Checkpoint and retention result

The recovered `ux-work` checkpoint was committed as
`40a950ecac59fe784231299f732c5010dcceef9c` (`chore(runs): checkpoint durable
appraisal records`) and pushed normally. Local `HEAD`, `origin/ux-work`, and
`git ls-remote origin refs/heads/ux-work` were byte-for-byte equal at that
commit before `swimming-backgrounds` was created. No force push, rebase, merge,
reset, deletion, or wholesale staging was used.

Exactly 195 durable paths were committed in that checkpoint: 57 Markdown
records; 112 structured JSON measurements at or below 1 MiB; 15 archive
manifests; four Python scripts; three MJS scripts; one text marker; one SHA-256
list; one GPL palette; and the narrow `.gitignore` update. No PNG, status/log
file, or file over 1 MiB was staged. The largest committed measurement was
1,018,950 bytes.

The 608 prior bulky artifacts remain in their original run paths and also in
`/home/orlovboros/artifacts/managers/water9/<run-slug>/`. They total
187,369,407 bytes. Recovery verified every original/archive pair against all
15 committed manifests: existence, byte count, and SHA-256 all matched. The
narrow ignore rules cover only those archived PNG, status, and individually
named oversized JSON files.

This appraisal generated its new evidence directly in the prescribed archive
root rather than placing bulky captures in the repository. Its committed
manifest is
`runs/swimming-backgrounds-adversarial-appraisal-2026-07-13.artifacts.json`:
38 files, comprising 32 PNGs, three JSON measurements, and three reproduction
scripts. Each archive file was SHA-256 verified after creation. Originals are
preserved; two failed deep-capture series are retained as `rejected-comparison`
evidence rather than replaced or hidden.

## Evidence method and index

All accepted frames are 1440×900 captures of the actual `#game canvas` while
the normal `DeepdiveScene` was running. Runtime identity in every accepted set
is title `Abyssal Salvage`, branch/base `swimming-backgrounds` /
`40a950ecac59fe784231299f732c5010dcceef9c`, Canvas renderer, one game canvas,
and visible live HUD. Captures used normal keyboard input and a playtest depth
teleport; they did not use `backgroundReview`, terrain edits, pause, a
clear-water harness, or a replacement scene. B3/B4 used normal playtest
upgrade/refill commands to survive the requested depth.

The requested “biome cutoff” pairs are the depth-band cutoffs shared by each
biome; biome-to-biome travel itself loads a discrete new biome rather than
placing two biome palettes on adjacent world coordinates. B1/B2 used nearby
reachable water and therefore landed beyond the exact targets after swimming.
B3/B4 used exact direct depth placement in the normal scene. Direct placement
can put the diver inside unusually dense generated content, so those frames are
valid composition stress tests at the requested band but are not evidence that
every earned traversal frame is equally crowded.

| Accepted proof | Actual depth / band | Motion | Canvas metrics | Archive files |
| --- | --- | --- | --- | --- |
| B1 before | 108 m / surface | east, 106 px/s | mean 49.08; below-24 0.15% | `b1-110m-cutoff-before-{color,grayscale}.png` |
| B1 after | 162 m / upper | southeast, 75/75 px/s | mean 47.61; below-24 0.11% | `b1-130m-cutoff-after-{color,grayscale}.png` |
| B2 before | 510 m / upper | east, about 98 px/s | mean 28.44; below-24 6.37% | `b2-510m-cutoff-before-{color,grayscale}.png` |
| B2 after | 558 m / mid | southwest, -75/-75 px/s | mean 16.07; below-24 79.28% | `b2-530m-cutoff-after-{color,grayscale}.png` |
| B3 before | 1026 m / mid | west, -82 px/s | mean 15.94; below-24 85.31% | `b3-1030m-cutoff-before-stable-{color,grayscale}.png` |
| B3 after | 1044 m / lower | east, 101 px/s plus interaction impulse | mean 19.32; below-24 78.03% | `b3-1050m-cutoff-after-stable-{color,grayscale}.png` |
| B4 before | 1428 m / lower | west, -73 px/s | mean 15.89; below-24 77.64% | `b4-1430m-cutoff-before-stable-{color,grayscale}.png` |
| B4 after | 1458 m / transitionDeep | east, 92 px/s plus interaction impulse | mean 14.20; below-24 89.76% | `b4-1450m-cutoff-after-stable-{color,grayscale}.png` |

`runtime-evidence.json` holds B1/B2 state, canvas metrics, a short performance
sample, and the initial B3/B4 attempts. `runtime-deep-stable.json` is the final
B3/B4 acceptance record. `runtime-deep-recovery.json` documents the rejected
deep correction and the clean B1 movement probe. All three report zero runtime
errors. The archive manifest records the exact hashes and roles.

## Observed runtime facts

- **B1 is the strongest internal benchmark.** Its surface frame has a readable
  value hierarchy: bright diver and HUD, mid-value coral shelf, darker open
  water, and enough negative space to understand direction. The minimap and
  depth/oxygen/hull UI remain legible without overpowering play.
- B1 upper preserves that hierarchy but repeats and enlarges the same coral
  language. B2 upper similarly presents a wide painterly brine shelf; it is
  more authored than empty procedural water but already consumes much of the
  field.
- Crossing B2 upper→mid changes mean luma by 12.37 and below-24 coverage by
  72.91 percentage points. The visible water-layer count falls from three to
  two. This is a cutoff, not a gentle deepening.
- B3 mid shows no visible landmark anchor; B3 lower shows one. Both stay very
  dark. B4 lower and transitionDeep show three anchors, but their monumental
  forms, terrain, enemies, lamp, and interaction text stack in the same frame.
- The lamp reads as a hard, blocky wedge, especially in B2/B4 grayscale. It
  reveals local content but does not provide a soft priority halo around the
  diver or a stable medium-value navigation corridor.
- The clean open-water B1 probe measured rest 0; east 25 px/s at 80 ms, 94 at
  160 ms, and the 106 px/s cap at 280 ms. Reversing from +106 yielded +67 at
  80 ms, -36 at 160 ms, and -106 at 280 ms. Releasing from -106 yielded -81 at
  100 ms, -25 at 250 ms, -5 at 500 ms, and -1 at 1000 ms.
- The camera remained centered on the diver. Direction changes create no
  look-ahead, settle, or spatial anticipation. Animation keys changed among
  swim/boost frames but did not express distinct acceleration, braking,
  coasting, or vertical-stroke states.
- The short B2 headless sample measured 568 Canvas frames: rAF p50 16.7 ms,
  p95 16.8 ms, p99 99.9 ms, with 2.64% over 33.34 ms and no observed long task.
  Internal `outer.frameTotal` was p95 4.7/p99 6.3 ms; `draw.total` p95 0.7 ms;
  parallax, water column, and anchors each p95 0.1 ms; darkness p95 0.2 ms.
  This short sample is not representative of sustained B4 load. The committed
  B4 25-second matrix in
  `runs/water9-adversarial-performance-framerate-review-2026-07-10/runtime-matrix.md`
  records presentation p95/p99 of 33.4/33.4 ms and 158 frames over 33.34 ms
  despite much lower instrumented CPU time.

## Code facts

- The render stack is clear color → parallax → water column → world/props/
  entities → player → darkness (`src/scene-rendering.ts:21-61`). Transition
  terrain is still drawn at alpha 0.48 and edges 0.24
  (`src/scene-rendering.ts:17-18`, `src/scene-rendering.ts:64-70`).
- Parallax chooses one profile, cover-scales it, fades by band, and hard-hides
  layers at alpha ≤0.04 (`src/scene-rendering.ts:92-133`). Water volume uses a
  one-sprite budget (`src/scene-rendering.ts:208-217`) and band-specific
  branches (`src/scene-rendering.ts:332-430`).
- Landmark assets are placed through a camera-relative parallax transform and
  receive immediate per-frame position/alpha updates
  (`src/scene-rendering.ts:432-473`). Normal placement has a one-landmark
  budget (`src/helpers.ts:1588-1665`), but deep size and alpha boosts can make
  individual assets enormous (`src/helpers.ts:1781-1835`). Width multipliers
  reach 3.85 for normal B2 and 2.05 for B4 (`src/helpers.ts:947-966`).
- Landmark vocabulary is thin: B1 reuses one living-coral asset across bands;
  B2 has one normal shelf asset; B3 has no surface/upper/mid landmark and one
  lower asset; B4 relies on the vault family plus transition variants
  (`src/helpers.ts:739-831`).
- Active IDs switch at 120/520/1040/1440 m. Only lower→transitionDeep receives
  special 1360–1520 blending (`src/helpers.ts:987-995`,
  `src/helpers.ts:1234-1275`). Scenic/background alpha is keyed to active IDs
  (`src/helpers.ts:1991-2123`), and only that special pair gets explicit
  outgoing/incoming landmark crossfade (`src/helpers.ts:1919-1963`).
- Darkness draws a full-screen fill, then builds the beam out of horizontal
  four-world-pixel strips plus a halo (`src/scene-rendering.ts:3937-3990`). At
  the 3.7× play camera, those strips become visually stepped. A second
  post-darkness veil can add broad bands and particles, including a B4 lower
  screen veil (`src/scene-rendering.ts:3992-4059`). The nominal biome
  visibility-cue function is empty (`src/scene-rendering.ts:4062-4064`).
- Light radius/beam/half-width are only 72/150/32 world pixels before lamp
  upgrades (`src/helpers.ts:3248-3257`). Darkness/ambient are depth-threshold
  functions (`src/helpers.ts:3264-3277`), while clear colors also step by
  biome/depth (`src/helpers.ts:3319-3337`).
- Movement normalizes input, applies thrust 300, exponential drag 1.45 while
  held and 2.65 while idle, clamps speed, and turns facing at 6.2 held / 2.8
  coasting (`src/scene.ts:1056-1072`, `src/scene.ts:1110-1138`). Base top speed
  is 106 (`src/helpers.ts:2697-2699`).
- The normal camera update is immediately followed by `centerOn(player)` every
  frame (`src/scene.ts:365-388`). Play zoom is 1.85 × a multiplier of 2
  (`src/scene.ts:638-644`, `src/constants.ts:12`).
- The animation selector has only die, mine, idle, boost, and swim states
  (`src/helpers.ts:2567-2571`). The default URL still selects the legacy diver;
  V3 is behind explicit query gates (`src/scene-rendering.ts:3595-3619`).
- The HUD supplies depth, gauges, tools, navigation, and minimap
  (`src/hud.ts:80-118`, `src/hud.ts:1228-1250`). It is currently a strength,
  not the source of world readability loss.

## Hypotheses to test, not asserted facts

- The mismatch between cheap instrumented draw stages and poor B4 presentation
  cadence may be browser/compositor scheduling, asset upload, garbage
  collection, or uninstrumented work. A trace is needed before attribution.
- A moderate camera lead and slower reversal should improve perceived water
  mass, but excessive lag could harm aiming or cause motion sickness.
- Some direct-depth clutter may be seed- and placement-specific. A seeded
  traversal matrix is needed to establish frequency.
- Raising global exposure alone may improve metrics while destroying horror
  intent. The likely solution is local value hierarchy and silhouettes, not a
  blanket brightness increase.

## Ranked findings

### P0 — Deep play-field readability

The current deep look is dark without being reliably legible. Darkness is
allowed to erase both navigation structure and hazard silhouettes, then the
lamp reveals a narrow stepped wedge. B3/B4 routinely exceed the proposed 80%
dark-pixel ceiling, and their grayscale frames lack a stable medium-value layer
between black background and bright HUD.

**Direction:** reserve three value roles: background atmosphere, navigable
terrain/landmark silhouettes, and player/threat/interactable priority. Give the
diver a small soft local separation halo independent of the directional beam.
Keep deep ambient dark, but cap post-darkness veils and background art inside a
player-centered readability zone.

### P0 — Band continuity and pop-in

The B2 cutoff is the clearest runtime failure. Current code partially solves
only lower→transitionDeep; other boundaries switch active palettes, scenic
weights, anchors, and effects as discrete IDs.

**Direction:** replace special-case transition logic with one continuous band
blend descriptor used by clear color, painterly layers, water volume, darkness,
veil, and landmark slots. Keep outgoing landmark identity sticky until the
incoming anchor is compositionally ready.

### P1 — Background composition and biome identity

The system has many layers but too few compositional rules. Scaling one asset
to several screen widths creates texture, not a navigational landmark. B1 has a
coherent organic shelf grammar; B2/B3/B4 need distinct silhouette, negative-
space, motion, and landmark grammars that survive grayscale and darkness.

**Direction:** define per-biome composition budgets: maximum occupied screen
area, one dominant landmark, one supporting layer, protected player corridor,
and a small stable asset pool with seed-sticky placement. Use B1 surface as the
quality bar, not as art to copy.

### P1 — Swimming, animation, and camera

Input is reliable, but the measured response is too quick to communicate water
weight. Hard camera centering also makes parallax read as surface movement
rather than depth-separated space.

**Direction:** tune acceleration/reversal/coast as a single feel curve; add
acceleration, cruise, braking/coast, and vertical animation intent; introduce a
small velocity-weighted lead with bounded spring settle. Keep aiming and
collision deterministic.

### P1 — Performance risk

The existing one-sprite water budget and cheap B2 internal stages are good.
The sustained B4 cadence failure means the visual plan must improve composition
by reallocating layers, not stacking more full-screen passes.

**Direction:** require the B4 long-run presentation gate for every slice. Add a
trace only if presentation and internal timings diverge; do not guess at the
bottleneck.

### P2 — Interaction/readability collisions

Deep enemies, interaction impulses, prompts, terrain, landmark imagery, and
the lamp can all occupy the same focal region. This is most obvious in the B4
after frame.

**Direction:** dim background landmarks locally behind actionable entities and
prompts, protect threat silhouettes, and prevent landmark focal points from
spawning inside the player interaction corridor.

## Target direction

The visual target is **authored descent with protected play space**:

- B1: luminous organic shelves and broad navigable negative space.
- B2: lateral brine shelves and vent plumes, with the shelf acting as a stable
  horizon rather than a full-screen painting.
- B3: sparse black-coral ribs and long vertical voids; navigation comes from
  silhouette rhythm and controlled particulate motion, not exposure.
- B4: monumental ruin axes and repeated architectural alignment, cropped and
  layered to guide travel rather than swallowing the diver.
- Across all biomes: continuous depth change, stable landmarks, a soft local
  diver separation field, directional lamp for search, and parallax that
  responds subtly to velocity/camera lead.

## Phased implementation slices

### Slice 1 — Readability and cutoff continuity (recommended first)

Touch the existing environment/lighting paths only. Introduce one generalized
band blend value; feed it to clear color, scenic alpha, water effects, darkness,
veil, and anchor slots. Replace strip-built lamp edges with a smooth bounded
mask or sufficiently fine geometry. Add a small soft diver separation halo and
player-zone attenuation for background/veil layers. Do not add new art.

Deliver a deterministic capture matrix at 110/130, 510/530, 1030/1050, and
1430/1450 m for all four biomes, color and grayscale, plus the B4 performance
run. This slice attacks the P0 problems and creates a trustworthy visual gate
for all later work.

### Slice 2 — Composition and landmark grammar

Add per-biome occupied-area, scale, crop, and protected-corridor budgets. Make
landmark slots seed-sticky across chunks and boundaries. Curate two or three
recognizable silhouettes per biome and validate blind biome recognition.
Reuse or crop current art before commissioning assets.

### Slice 3 — Swimming and camera feel

Tune thrust/drag/turn together to the game-feel gates below. Add bounded camera
lead/spring behavior and expose acceleration/cruise/coast/vertical animation
intent. Evaluate the legacy and V3 diver deliberately; do not silently change
the default character family inside a movement patch.

### Slice 4 — Interaction polish and sustained performance

Add local background dimming behind threats/prompts, validate landmark spawn
exclusion around interaction corridors, then optimize only bottlenecks proven
by the B4 trace. Finish with a seeded traversal matrix and accessibility review.

## Do now / later / avoid

**Do now:** generalized band interpolation; soft diver separation; smoother
lamp edge; background occupied-area/player-corridor budgets; deterministic
cutoff and B4 cadence captures.

**Later:** additional landmark silhouettes; camera lead; expanded animation
intent; interaction-aware local dimming; new biome-specific assets after the
composition grammar proves them necessary.

**Avoid:** global exposure boosts; another full-screen veil; more simultaneous
water sprites; screen-width multipliers as a substitute for composition;
random landmark replacement at cutoffs; camera lag without aiming tests;
promoting V3 implicitly; art production before grayscale and B4 gates pass.

## Acceptance gates

### Visual and navigation

- Capture the actual normal-play `#game canvas` with live HUD/runtime identity,
  color and grayscale, at every matrix point. No review-only rendering harness.
- In a HUD-excluded play-field ROI, no required deep frame may exceed 80% of
  pixels below luma 24; adjacent cutoff frames may differ by at most 8 mean-
  luma points and 10 percentage points of below-24 coverage.
- Diver and actionable threat silhouettes must maintain at least 25 luma
  points of edge contrast against their immediate background in 95% of sampled
  frames. Interaction text must meet WCAG 4.5:1 against its composited backing.
- No non-event background landmark may occupy more than 45% of the viewport or
  overlap the protected player corridor in more than 5% of seeded frames.
- Three reviewers shown HUD-free, depth-matched frames must identify all four
  biomes at least 80% correctly. Each biome needs a unique landmark silhouette
  visible in at least two of three representative seeds.
- Across a cutoff, outgoing/incoming scenic and landmark identity must blend
  over at least 120 m with no single-frame alpha jump above 0.20 and no visible
  position pop over 4 screen pixels.

### Game feel

- With no upgrades in open water, reach 90% top speed in 350–500 ms, reverse
  through zero in 250–400 ms, and coast below 10% top speed in 700–1000 ms.
- Cardinal and diagonal terminal speeds must remain within 3%; collision and
  mining aim must remain deterministic.
- Camera lead must stay within 3–7% of the viewport, settle in 150–250 ms after
  release, and show no one-pixel resting jitter. A no-lead accessibility option
  must remain possible if testing finds motion discomfort.
- Eight-direction capture review must show distinct acceleration, cruise,
  coast/brake, and vertical intent without changing the character identity.

### Performance

- In a settled 25-second B4 Canvas run, presentation rAF must be p95 ≤17.5 ms,
  p99 ≤25 ms, fewer than 1% of frames over 33.34 ms, and no long task over
  50 ms after warm-up.
- `outer.frameTotal` p95 must be ≤8 ms. Combined background, water-column,
  landmark, and darkness drawing must remain ≤1 ms p95 on the reference host.
- Retain the current one-visible-sprite water-column budget unless trace-backed
  evidence justifies a change. No new unbounded full-screen multipass effect.

## Risks and decisions required

1. Decide how much deep horror may trade away route readability. This proposal
   assumes danger can stay dark while the immediate play field remains legible.
2. Confirm B1 surface as the internal art-direction benchmark.
3. Choose whether B4 should feel monumental through negative-space axes or
   through frequent screen-filling structures; the latter conflicts with play
   clarity at current zoom.
4. Decide whether to keep the legacy diver as default for the feel pass or
   explicitly promote a validated V3 set in a separate decision.
5. Approve bounded camera lead only after aiming and motion-comfort testing.
6. Treat sustained B4 presentation cadence as a release gate even when internal
   instrumentation appears inexpensive.

## Recommended first implementation slice

Implement Slice 1 as a narrow, art-neutral change: generalized band blending,
smooth lamp falloff, a soft local player separation field, and background/veil
attenuation inside a protected play corridor. Pair it with the deterministic
cutoff capture matrix and sustained B4 cadence test. This is the smallest slice
that can improve the worst runtime evidence without committing to new assets,
a new diver, or speculative optimization.

## Validation and caveats

- `npm run build` passed. Vite retained its existing unresolved public-asset
  URL and large-chunk warnings. `npx tsc --noEmit --pretty false` reported 25
  errors in existing product sources, including the story-progress literal
  typing cluster, undefined `resetOxygenWarnings`, and playtest command typing.
  This proposal changes no product source, so the type-check result is recorded
  as an inherited repository caveat rather than repaired on this branch.
- Browser connector startup was blocked by local OpenClaw gateway pairing/scope
  approval. The repository-installed Playwright package was used directly and
  produced the required runtime/browser evidence.
- All capture servers used port 5180. Each script terminated only the Vite
  process it created, and no listener remained on ports 5180–5199 afterward.
- Initial reachable-water B3/B4 attempts did not reach the requested bands; the
  first direct correction encountered death/interaction before completing B4.
  Both series are preserved and rejected in the manifest. The final stable
  direct series supplies the accepted B3/B4 proof.
- Product source was not modified. This branch contains proposal/reporting and
  evidence metadata only.

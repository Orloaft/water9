# B4 Busy/Deep Performance Proposal

## Recommendation

Do not start by reducing B4 gameplay content. The next safe slice should first enclose the missing work in telemetry and make the B4 busy/deep repro a repeatable smoke. The current data says Water9's measured `Scene.update` work is not the whole stall: rAF and Long Task API see repeated `50-83ms` main-thread frames while `frame.total` after the scenario only reports about `9-16ms`.

After that instrumentation lands, optimize the entity/contact work that is already proven to be heavy: B4 simulates `156` fish and `10` articulated creatures / `94` parts, and the repro accumulated about `3.6M` terrain contact samples during the capture. That is enough churn to hurt the frame directly and to trigger GC or renderer costs outside the current metric envelope.

## Evidence

| Evidence | Why it matters |
| --- | --- |
| Repro: `visually-busy-high-entity-deep-area`, biome 4, `teleportToReachableDepth(1650)`, `teleportToArticulated`, hold `ArrowRight+ArrowDown`. | Exact failing path from `adversarial-60fps-appraisal.json`. |
| rAF summary: p50 `50ms`, p95 `66.7ms`, p99 `83.3ms`, max `83.4ms`, `75%` over `33.34ms`, `29.63%` over `50ms`. | This is a real player-visible frame cadence failure. |
| Long tasks: `40` recent `self` tasks, max `73ms`, many in the `53-68ms` range. | Browser main thread is blocked for whole tasks, not just sampler noise. |
| After-capture Water9 perf: `frame.total avg=10.36 max=16.61`, `update.total avg=7.09 max=14.2`, `draw.total avg=2.02 max=4.67`. | The current `frame.total` envelope misses the work causing most rAF/Long Task stalls. |
| Terrain was clean: dirty chunks `0`, dirty tiles `0`, `draw.world max=2.75`, sonar closed, `draw.bigSonarMap=null`. | The previous terrain redraw and sonar chart culprits are unlikely for this B4 failure. |
| Entity metrics: `update.fish count=156 avg=4.68 max=6.34`, `update.articulated count=10 parts=94 avg=1.85 max=7.74`. | Largest measured gameplay slices are global entity simulation. |
| Terrain contact samples rose from `1,828,482` to `5,425,614` during the repro, about `3,597,132` new samples. | Strong signal that entity collision/steering contact probes dominate measured CPU and may create allocation/GC pressure. |
| [src/scene.ts](../../src/scene.ts) lines 248-375 wraps `frame.total` inside `Scene.update`. | Anything before Phaser calls `update`, after it returns, or in browser render/paint/GC is outside the metric. |
| [src/main.ts](../../src/main.ts) lines 29-35 force `Phaser.CANVAS` unless `?renderer=webgl` is passed. | The actual Phaser renderer runs after `Scene.update`; canvas rendering cost can appear in rAF/Long Task but not `draw.total`. |
| [src/scene-rendering.ts](../../src/scene-rendering.ts) lines 21-58 measure draw commands, not Phaser's renderer. | `draw.total` is display-object mutation time, not final canvas/WebGL render time. |
| [src/scene-entities.ts](../../src/scene-entities.ts) lines 67-108 updates every fish every frame; lines 452-580 do feeler/contact probes. | B4 fish simulation is global and contact-heavy. |
| [src/terrain-mask.ts](../../src/terrain-mask.ts) lines 135-215 allocate sample arrays for AABB/capsule contacts; line 255 counts all samples. | Contact probes are allocation-heavy in hot paths. |
| [src/scene-articulated.ts](../../src/scene-articulated.ts) lines 773-865 updates all articulated creatures; lines 872-939 tier budgets; lines 1255-1305 terrain correction; lines 1312-1465 allocate maps/sets/vectors and solve spine dynamics. | Articulated simulation has budget logic but still allocates and performs part/contact work on full steps. |
| [src/content.ts](../../src/content.ts) lines 259-287 defines dense B4 fish roster; [src/articulated.ts](../../src/articulated.ts) lines 236-239 sets B4 articulated budget to `10`. | The B4 entity count is intentional content density, not a test artifact. |

## Ranked Cause Matrix

1. **Missing post-`Scene.update` work: Phaser renderer, canvas presentation, browser paint, or GC.**
   - Confidence: proven by metrics for the mismatch; exact sub-cause still requires instrumentation.
   - Why: rAF and Long Task API repeatedly see `50ms+` tasks while `frame.total`, `update.total`, and `draw.total` stay much lower. `frame.total` begins inside `Scene.update`, and Phaser's renderer is outside it.

2. **B4 entity simulation and terrain-contact probing.**
   - Confidence: proven as a measured cost center; strongly suggested as a contributor to missed frames.
   - Why: `update.fish` and `update.articulated` are the largest measured slices, B4 has `156` fish and `94` articulated parts, and contact samples increased by about `3.6M` during the capture.
   - Limit: measured entity work alone does not fully explain `66-83ms` rAF deltas.

3. **Allocation churn causing GC outside the measured envelope.**
   - Confidence: strongly suggested by code, still speculative until GC/memory telemetry is added.
   - Why: hot paths allocate arrays/objects in `terrainMaskContactForAabb`, `terrainMaskContactForCapsule`, `updateArticulatedParts`, and `scanNearbyLife`/`nearestLife`. GC pauses can show as Long Task/rAF stalls without being charged to the JS slice that allocated.

4. **Phaser Canvas renderer/display-list traversal or texture state churn.**
   - Confidence: strongly suggested by the measurement boundary and Canvas default; needs renderer timing and a canvas-vs-webgl comparison.
   - Why: `draw.total` mutates many sprites/graphics but does not include Phaser's final render. The repro URL did not pass `renderer=webgl`, so it ran Canvas.

5. **Passive sonar/contact scan paths.**
   - Confidence: low-to-medium.
   - Why: sonar chart was closed and `draw.bigSonarMap` was null, but passive reveal still runs every `0.18s` and `scanNearbyLife` computes nearest life before checking `scanningHeld`. This is probably not the main every-frame stall, but it is cheap to instrument and may contribute to allocation churn.

## Frame Total vs Long Task Mismatch

`frame.total` currently wraps the body of `DeepdiveScene.update()` only. It includes Water9 update/draw command submission, `updateAudio`, periodic `renderHud`, and `updatePerfHud`, but it does not include the full browser/Phaser frame.

Likely missing from the envelope:

- Phaser's work before calling the scene update: input plugin polling, scene manager overhead, timers/events.
- Phaser's renderer after scene update returns, especially Canvas render traversal/presentation.
- Browser canvas presentation, layout/paint/compositing, and event processing around the rAF task.
- GC pauses caused by allocations inside measured update/draw code.
- Any timers or async callbacks that run in the same browser task but outside `Scene.update`.

Instrument first in:

- [src/main.ts](../../src/main.ts): after creating `new Phaser.Game`, attach outer loop probes to Phaser game events if available, or a lightweight rAF-to-rAF probe that records pre-step, post-step, pre-render, post-render timings.
- [src/perf.ts](../../src/perf.ts): store true raw max and percentiles for outer frame, scene update, render, post-update gap, long tasks since last frame, and optional memory deltas when `performance.memory` exists.
- [src/scene.ts](../../src/scene.ts): split existing `frame.total` into named submetrics for `controls/input`, `player`, `loose/flora`, `fish`, `articulated`, `systems/sonar`, `camera/propQueue`, `draw.commandSubmit`, `audio`, `hud`.
- [src/hud.ts](../../src/hud.ts) and [src/scene-rendering.ts](../../src/scene-rendering.ts): add explicit metrics for `renderHud`, `drawSonarMap`, and any command submission that is not currently inside a submetric.

Also change the perf summary so `maxMs` is not only a decayed maximum. Keep the decayed value if useful, but add true `windowMaxMs` and p95/p99 over the ring buffer.

## Implementation Plan

### Phase 1: Enclose the Missing Work

Files likely involved: [src/main.ts](../../src/main.ts), [src/perf.ts](../../src/perf.ts), [src/scene.ts](../../src/scene.ts), and a B4 smoke under `tools/` or `runs/`.

Work:

- Add outer frame telemetry that correlates rAF delta, scene update, Phaser render/post-render, long tasks, and current entity/contact counts.
- Add or adapt a repeatable B4 smoke for the exact repro: `?playtest=1&biome=4&perf=1&perfHud=0`, `teleportToReachableDepth(1650)`, `teleportToArticulated`, hold `ArrowRight+ArrowDown`.
- Run the smoke in Canvas and, if possible, WebGL using `renderer=webgl` to isolate renderer sensitivity.
- Keep gameplay untouched.

Risk: low. Main risk is telemetry overhead or using Phaser event names incorrectly. Gate all new work behind perf/playtest mode.

Phase 1 acceptance:

- Smoke reports rAF summary plus `outer.frame`, `scene.update`, `phaser.render` or equivalent render-gap metric, long tasks since last frame, `terrainContactSamples/frame`, fish count, articulated count/parts, visible counts, dirty chunks/tiles, sonar open/cache state.
- The report can classify the B4 failure as update-bound, render-bound, GC/allocation-bound, or still mixed.
- Normal shallow/mid/deep smokes remain steady and build passes.

### Phase 2: Reduce Proven Entity/Contact CPU

Files likely involved: [src/scene-entities.ts](../../src/scene-entities.ts), [src/terrain-mask.ts](../../src/terrain-mask.ts), [src/scene.ts](../../src/scene.ts), [src/scene-playtest.ts](../../src/scene-playtest.ts).

Work:

- Add range/budget tiers for fish simulation: full simulation near camera/player/aggro, lower-frequency or simplified updates for distant inactive fish.
- Skip legacy feeler/contact steering for distant fish that cannot interact with the player this frame.
- Reuse contact sample buffers or replace per-call `points` arrays with fixed scratch buffers.
- Move `scanNearbyLife`'s `!scanningHeld` return before `nearestLife`, unless a caller needs preselection while not scanning.

Risk: medium. Fish ambience, hostile pursuit, and scan targets must still feel alive when the player approaches.

Phase 2 acceptance:

- Same B4 entity counts remain available in the world unless intentionally culled only from simulation tiers.
- `update.fish avg <= 2.5ms`, `update.fish max <= 4ms` in the B4 repro.
- `terrainContactSamples/frame` drops by at least 60% in the B4 repro.
- No loss of fish collision, scanning, hostile aggro, or B4 visual density near the player.

### Phase 3: Reduce Articulated Allocation and Full-Step Cost

Files likely involved: [src/scene-articulated.ts](../../src/scene-articulated.ts), [src/articulated.ts](../../src/articulated.ts), maybe generated manifest handling.

Work:

- Cache per-creature part maps, manifest maps, and sorted spine manifests instead of rebuilding maps/sets/arrays inside `updateArticulatedParts`.
- Avoid `new Phaser.Math.Vector2` in per-part/per-frame paths where scalar math is enough.
- Add telemetry by articulated tier: full/near/far/offscreen counts, full steps, skipped steps, terrain passes.
- Tune full/near/offscreen budgets only after telemetry shows which tier is active in the repro.

Risk: medium. Articulated pose fidelity and combat hit geometry are user-visible and mechanically important.

Phase 3 acceptance:

- `update.articulated avg <= 1.2ms`, `max <= 3ms` in the B4 repro with `10` creatures / about `94` parts.
- Large threat visuals, bite contacts, grabbing, terrain correction, and damage review smokes still pass.

### Phase 4: Renderer/Display Churn if Phase 1 Shows Render-Bound Stalls

Files likely involved: [src/main.ts](../../src/main.ts), [src/scene-rendering.ts](../../src/scene-rendering.ts), [src/scene-articulated.ts](../../src/scene-articulated.ts), [src/styles.css](../../src/styles.css).

Work:

- If WebGL solves the repro, consider making WebGL the default where supported or offering a guarded fallback.
- If Canvas must remain default, reduce active display-list traversal: deactivate or pool distant sprites, avoid redundant `setTexture`, `setFrame`, `setDisplaySize`, `setDepth`, `clearTint` calls when values are unchanged, and split graphics layers so unchanged layers are not cleared/redrawn every frame.

Risk: medium-to-high. Renderer defaults can change browser compatibility; display-list culling can create visual pop-in if range margins are too tight.

Phase 4 acceptance:

- `phaser.render` or render-gap p95 is under `6ms` in the B4 repro.
- No sprite disappearance, stale frame, tint, depth, darkness tell, sonar, or HUD regression in screenshots.

## Final Acceptance Metrics for the B4 Repro

Use the same scenario: biome 4, `teleportToReachableDepth(1650)`, `teleportToArticulated`, hold `ArrowRight+ArrowDown`, `1280x800`, sonar closed, no terrain dirty work expected.

Target steady-state metrics:

- rAF p95 `<= 20ms`.
- rAF p99 `<= 33.34ms`.
- rAF max `<= 50ms`.
- Frames over `33.34ms <= 1%`.
- Frames over `50ms = 0`.
- Long Task API: no repeated settled-gameplay `self` tasks over `50ms`; any single outlier must be explained by correlated telemetry.
- `update.total` p95 `<= 10ms`, max `<= 16ms`.
- `draw.total` command-submit p95 `<= 5ms`, max `<= 8ms`.
- Renderer/post-update gap p95 `<= 6ms` if Phase 1 adds that metric.
- `update.fish` avg `<= 2.5ms`, max `<= 4ms` after Phase 2.
- `update.articulated` avg `<= 1.2ms`, max `<= 3ms` after Phase 3.
- Entity context preserved: B4 still reports roughly `156` fish and `10` articulated creatures / `94` parts before any intentional content rebalance.
- Visual/gameplay preservation: B4 ambient density, hostile interactions, articulated threat motion, scan/sample behavior, sonar closed state, no dirty terrain redraws, and no obvious screenshot regressions.

## First Implementation Worker Prompt

```
Before any work, run:
git -C /mnt/nxt-dev/water9 rev-parse --short HEAD
If it fails, stop and report MOUNT_DOWN.

You are codex-dev working for mgr-water9 on Water9.
Repo: /mnt/nxt-dev/water9
Goal: implement the first safe B4 performance slice: telemetry and a repeatable B4 busy/deep perf smoke only. Do not optimize gameplay yet.

Context:
- Current B4 failure: scenario "visually-busy-high-entity-deep-area", biome 4, playtest URL with perf, teleportToReachableDepth(1650), teleportToArticulated, hold ArrowRight+ArrowDown.
- rAF failed at p95 66.7ms / p99 83.3ms / max 83.4ms, with repeated Long Task API self tasks 53-73ms.
- Water9 metrics stayed much lower after capture: frame.total max about 16.61ms, update.total max 14.2ms, draw.total max 4.67ms.
- Likely missing work is outside Scene.update: Phaser renderer, canvas presentation, browser/GC, or timers/events.
- Relevant files: src/main.ts, src/perf.ts, src/scene.ts, src/hud.ts, src/scene-rendering.ts, existing perf/adversarial smoke scripts under tools/ and runs/.

Tasks:
1. Anchor with pwd and git rev-parse --show-toplevel before edits.
2. Add perf-mode-only outer frame telemetry that correlates rAF delta, Scene.update duration, post-update/render gap or Phaser render duration, long tasks since last frame, terrainContactSamples/frame, fish/articulated counts, visible counts, terrain dirty chunks/tiles, sonar open/cache state.
3. Keep gameplay behavior unchanged. Telemetry must be disabled outside perf/debug/playtest mode.
4. Add or adapt a repeatable B4 smoke for the exact repro. Use only ports 5180-5199. Do not kill unrelated processes.
5. Run build and the new B4 smoke. If possible, run both Canvas default and renderer=webgl variants to classify renderer sensitivity.
6. Report whether the missing 50-83ms work is update-bound, render-bound, GC/allocation-bound, or still not enclosed. Include paths to any JSON artifacts.

Acceptance:
- Build passes.
- B4 smoke emits rAF summary, Water9 update/draw metrics, new outer/render-gap metrics, long tasks, entity counts, dirty terrain, sonar state, and contact-sample deltas.
- Existing gameplay/source behavior remains unchanged apart from telemetry/smoke code.
- No commits unless explicitly requested.
```

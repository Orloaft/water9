# Water9 Telemetry Audit

Starting HEAD: `44dc5c0`

Blunt verdict: **mostly sufficient with caveats**. The B4 work added the right telemetry family to catch the old `frame.total` blind spot: independent rAF, Phaser outer step/render timings, Long Task API, and per-frame gameplay context. But the current smoke scripts still mostly **record** this evidence instead of enforcing it. A perf-matrix can still miss real 60fps failures if it treats smoke exit status or `frame.total` averages as acceptance.

## Findings

1. **High: several "perf" smokes pass even when their own rAF evidence would reject 60fps.**
   - `tools/test_b4_busy_deep_perf_smoke.mjs:249-289` sets `ok` from `errors.length === 0 && frames.length > 30`; it records `independentRaf`, `frameSummary`, `outer.*`, and Long Tasks, but does not fail on p95/p99/max, frames over 33/50ms, Long Tasks, or a non-`steady` classification.
   - `tools/test_deep_diagonal_swim_perf_smoke.mjs:154-189` samples four depths for only 2600ms each and only asserts that at least one band has more than 30 samples. It records hitches in the report but does not reject them.
   - `tools/test_sonar_tool_overhaul_smoke.mjs:190-307` records normal/open sonar rAF summaries but asserts only functional sonar visibility and `draw.bigSonarMap` presence/absence.
   - `tools/test_mining_perf_smoke.mjs:129-142` captures only the short post-mining window and rejects `draw.world`/dirty chunk regressions, not frame cadence.
   - `tools/test_perf_guardrails.mjs:100-110` checks metric presence and local refresh counters, not rAF, Long Tasks, or outer-frame thresholds.

2. **High: `frame.total` is no longer enough and should not be used as a pass/fail proxy.**
   - `src/scene.ts:248-375` wraps `frame.total` around `DeepdiveScene.update()`. It includes Water9 update/draw command submission, audio/HUD calls on paths that execute them, and early loading/menu branches, but it does not include Phaser's final renderer work after scene update, browser paint/compositing, GPU waits, or GC attribution.
   - `src/scene-rendering.ts:21-60` measures Water9 draw command submission (`draw.world`, `draw.fish`, `draw.sub`, etc.), not final Canvas/WebGL presentation.
   - Prior local evidence shows why this matters: the B4 proposal recorded rAF p95 `66.7ms` and repeated Long Tasks while `frame.total` max was only about `16.61ms` (`runs/water9-b4-performance-proposal-2026-07-09/b4-performance-proposal.md:13-22`, `51-61`).

3. **Medium: B4 outer-frame telemetry closes the earlier gap for detection, but not full attribution.**
   - `src/main.ts:30-35` defaults to Phaser Canvas and allows `?renderer=webgl`; `src/main.ts:53-54` installs outer telemetry.
   - `src/perf.ts:214-256` records Phaser `PRE_STEP`, `POST_STEP`, `PRE_RENDER`, and `POST_RENDER` timings as `outer.rafDelta`, `outer.step`, `outer.postStepToRender`, `outer.render`, and `outer.frameTotal`.
   - This is enough to show whether a hitch is update-bound, render-bound, post-step gap-bound, or outside the measured Phaser frame. It still does not isolate browser compositor/GPU presentation after `POST_RENDER`, nor does it identify GC except indirectly via Long Tasks and memory deltas.

4. **Medium: the frame buffer has useful context, but snapshots can hide older spikes.**
   - `src/perf.ts:264-330` stores per-frame rAF delta, last update/draw, camera, visible/total entities, fish/articulated tiers, dirty terrain, sonar/cache state, memory, and Long Tasks since the previous frame.
   - `src/perf.ts:333-360` exports only the last 180 frames and last 40 Long Tasks even though the live buffer capacity is 720 (`src/perf.ts:101-107`, `343-344`). Long runs can lose the exact context for earlier hitches unless the harness exports promptly.
   - Metric summaries now include true/window max and p50/p95/p99 (`src/perf.ts:345-356`), which is a major improvement over decayed max alone.

5. **Medium: WebGL fallback remains a separate unaccepted path.**
   - The B4 implementation report says default Canvas was steady, but `renderer=webgl` had rAF p95 `83.4ms`, `61.43%` frames over 50ms, and 40 Long Tasks over 50ms while measured outer work stayed small (`runs/water9-b4-performance-implementation-2026-07-09/worker-report.md:29-38`, `42-51`, `83-87`).
   - `tools/test_b4_busy_deep_perf_smoke.mjs:7-35` can run Canvas or WebGL, but the script itself does not reject bad WebGL cadence. Do not use WebGL results to support default Canvas, and do not claim WebGL fallback quality from current evidence.

6. **Medium: startup/loading is sampled, but should be judged separately from steady gameplay.**
   - `tools/test_loading_swim_perf_smoke.mjs:157-191` samples the start transition with a 1800ms rAF probe and transition DOM snapshots.
   - It then samples swimming for 6500ms (`tools/test_loading_swim_perf_smoke.mjs:217-248`) and rejects only more than four frames over 50ms plus loose `frame.total`/`draw.total` averages. That catches catastrophic starts but is too loose for a "consistent 60fps" claim.
   - Prior report explicitly separated startup/worldgen from gameplay because loading produced huge rAF gaps (`runs/water9-adversarial-60fps-postfix-review-2026-07-09/worker-report.md:21-32`, `54`).

7. **Low/Medium: save/load restore has no perf coverage.**
   - `tools/test_save_load_smoke.mjs:89-147` validates state round-trip and corrupt-save behavior, but runs without `?perf=1` (`tools/test_save_load_smoke.mjs:10`) and has no rAF probe. Save/load transition restore can still cause a one-off hitch without being visible in the perf matrix.

## What The Metrics Measure

- `frame.total`: Water9's `DeepdiveScene.update()` body only. Useful for app-side CPU attribution, not proof of presented frame cadence.
- `update.*`: named simulation slices inside `frame.total`, including fish/articulated/sub systems where wrapped.
- `draw.*`: Water9's command submission and canvas/HUD helper work where wrapped, not Phaser's final renderer or browser presentation.
- `outer.rafDelta`: Phaser game-loop delta. Good cadence signal when cross-checked against an independent page rAF probe.
- `outer.step`: Phaser step duration from `PRE_STEP` to `POST_STEP`.
- `outer.render`: Phaser render phase from `PRE_RENDER` to `POST_RENDER`.
- `outer.postStepToRender`: gap between step completion and render start.
- `outer.frameTotal`: `PRE_STEP` to `POST_RENDER`, not rAF-to-rAF and not post-render browser compositor/GPU time.
- Long Task API: high-signal main-thread stalls over the browser threshold, but browser-dependent and not a complete GPU/compositor measure.
- `memory`: Chromium-only `performance.memory` snapshot/delta when present; useful for allocation/GC suspicion, not a GC event trace.

Outside the envelope: browser paint/compositing after Phaser `POST_RENDER`, GPU waits, tab/background throttling, OS/headless scheduler behavior, some GC attribution, async/timer work not correlated to a frame unless it appears as a Long Task, and real-device thermal/driver variance.

## B4 Gap Closure

The B4 outer-frame metrics close the earlier **detection** gap. If `frame.total` is low but rAF or Long Tasks are bad, the matrix now has enough evidence to reject the run and classify it as render-bound, update-bound, browser/GC-bound, or still unenclosed. It does not fully close **root-cause attribution** for compositor/GPU/GC: those still require interpreting rAF + Long Tasks + outer timings together.

## Smoke Coverage

- Loading/startup: covered as a transition, but thresholds are loose and startup should not be mixed with steady gameplay.
- Surface/mid/deep bands: deep diagonal covers 360/780/1140/1500m, but each band is short and currently not threshold-gated.
- B4 density/threat visibility: covered by the B4 smoke with Canvas/WebGL selector, entity/visible/tier telemetry, screenshots, and independent rAF. Threshold enforcement is missing.
- Deep diagonal terrain/cache traversal: sampled across depths with screenshots and cause scoring, but not rejected on p95/max hitches.
- Mining invalidation: checks `draw.world`, dirty chunks/tiles, and screenshots after repeated mining. It does not prove steady cadence during and after terrain invalidation.
- Sonar overlay open/close: sonar tool smoke samples normal and open-use rAF, screenshots overlay, and checks closed/open behavior. It does not reject bad rAF; controller smoke is functional only.
- Save/load restore: functional smoke exists, but no perf mode/rAF/Long Task coverage.
- Background tab/throttling: intentionally not covered; headless foreground Playwright results should not be generalized to background behavior.

## Trust Hierarchy

1. **Actual `#game canvas` proof during normal play plus independent rAF deltas and Long Task API** for the same interval. This is the acceptance layer.
2. **Perf frame buffer `rafDeltaMs`/`outer.rafDelta` with frame context**: camera/depth/entities/terrain/sonar/longTasks. Trust it when it agrees with independent rAF.
3. **`outer.step`, `outer.render`, `outer.postStepToRender`, `outer.frameTotal`, memory deltas** for classification and triage.
4. **Internal `frame.total`, `update.*`, `draw.*`** for attribution only. They can explain a failure; they cannot clear a run when rAF/Long Tasks fail.
5. **HUD averages and decayed `maxMs`** are lowest trust. Prefer exported p95/p99/windowMax/trueMax.

When metrics disagree: reject on rAF/Long Task/canvas proof first, then use internal metrics to decide where to look.

## Acceptance Thresholds

Use these for steady gameplay intervals, not loading/worldgen:

- Independent rAF and `outer.rafDelta` both present, with at least 180 exported frames per scenario; for matrix claims prefer 300+ frames or 5s+ per scenario.
- rAF p95 `<= 20ms`.
- rAF p99 `<= 33.34ms`.
- rAF max `<= 50ms`.
- Frames over `33.34ms <= 1%`.
- Frames over `50ms = 0`.
- No repeated settled-gameplay Long Tasks `>= 50ms`; any single outlier must have a correlated explanation.
- `outer.frameTotal` p95 should stay comfortably under the frame budget; investigate if p95 exceeds `12ms` or max exceeds `20ms`.
- `update.total` p95 `<= 10ms`, max `<= 16ms`.
- `draw.total` command-submit p95 `<= 5ms`, max `<= 8ms`.
- `outer.render` or `outer.postStepToRender` p95 `<= 6ms`; higher means renderer/gap-bound even if `frame.total` is fine.
- B4-specific: preserve roughly the expected B4 entity context and visible threat proof, with no repeated Long Tasks and no WebGL claim unless the WebGL variant independently passes the same thresholds.

Startup/loading acceptance should be separate: no unbounded UI freeze, loading overlay covers blocked startup state, and the first settled gameplay interval must pass the steady thresholds after readiness.

## Additional Gaps To Add Later

- Add threshold failures to B4, deep diagonal, sonar, mining, and loading smokes instead of relying on report interpretation.
- Add a save/load perf smoke with `?perf=1`, independent rAF, Long Tasks, before/load/after restore frame buffer export, and a canvas proof after restore.
- Make deep diagonal require enough samples in every depth band, not just one band.
- Extend mining to hold movement through terrain invalidation for 3-5s and reject cadence failures, not just dirty chunk/draw-world regressions.
- Add a focused Canvas vs WebGL comparison gate that marks WebGL as unsupported/bad when it fails, instead of letting the script pass with bad metrics.
- Export full frame buffer or hitch-window slices around worst rAF frames so older spikes are not lost from `perfSnapshot`.

## Caveats / Blockers

- I did not run the perf matrix in this lane; this is a read-only source/report audit. At audit time the current run `json/` directory had no JSON results, and `perf-matrix-report.md` was still a stub.
- Worktree had pre-existing untracked run artifacts, plus this audit report under the requested run directory. I did not touch source.
- Headless Chromium is useful for regression detection but not a complete substitute for foreground real-browser/device validation, especially for compositor/GPU and WebGL behavior.

## Return Block

- Status: complete.
- Audit path: `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/telemetry-audit.md`
- Highest-risk blind spot: perf scripts record rAF/Long Task failures but often do not fail on them, especially B4/WebGL/deep diagonal/sonar/mining.
- Can current perf-matrix results support a 60fps claim if they pass: **only if the manager manually verifies the exported rAF/Long Task/canvas evidence against thresholds**. Exit-code pass alone is not enough.
- Suggested next improvement: add shared threshold enforcement over independent rAF, `outer.rafDelta`, Long Tasks, and worst-frame context, then wire it into every perf smoke.

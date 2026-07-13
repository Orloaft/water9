# Water9 adversarial performance/framerate review — telemetry/code audit

Status: **COMPLETE (read-only code/telemetry audit)**  
Repo/HEAD: `/mnt/nxt-dev/water9` @ `9c88409`

## Findings (ranked)

### 1. Critical / high confidence — `frame.total` is not a frame-time metric, and several pass conditions can hide visibly bad rAF

Evidence:

- `frame.total` starts and stops entirely inside `DeepdiveScene.update()`: it encloses game update, the explicit scene draw-command construction, audio, HUD calls, and perf-HUD work, but it ends before Phaser's renderer runs (`src/scene.ts:248-376`).
- The actual Phaser render interval is measured separately as `outer.render`, and `outer.frameTotal` spans `PRE_STEP` through `POST_RENDER` (`src/perf.ts:214-256`). Consequently, low `frame.total`/`draw.total` can coexist with expensive Canvas rasterization, browser compositing, or delayed presentation.
- `outer.rafDelta` is Phaser's event `delta`, not an independently timestamped presentation sample (`src/perf.ts:217-225`). The independent browser probe is the only current signal based directly on rAF callback timestamps (`tools/perf_assertions.mjs:37-74`), and even that measures callback cadence, not compositor presentation/drop events.
- Metric `avgMs` is an exponential moving average, and `maxMs` decays by `0.995` per sample; only `trueMaxMs` is monotonic (`src/perf.ts:203-209`). Yet loading uses the EMA for `frame.total`/`draw.total` (`tools/test_loading_swim_perf_smoke.mjs:280-285`) and mining asserts decaying `draw.world.maxMs` instead of `trueMaxMs` (`tools/test_mining_perf_smoke.mjs:145-151`). A transient hitch can age out of those checks.
- The Perf HUD foregrounds `frame.total`, `update.total`, and `draw.total`, but does not display independent rAF, `outer.frameTotal`, or `outer.render` (`src/perf.ts:387-406`). This is the highest-risk operator-facing false reassurance.
- `recordPerfFrame()` runs after `outer.frameTotal` is recorded, then filters/reduces fish and articulated arrays, allocates nested objects, snapshots memory, and appends frame data (`src/perf.ts:243-255`, `src/perf.ts:264-330`). That telemetry overhead affects the following rAF gap but is excluded from the enclosing `outer.frameTotal`, weakening correlation between the internal frame record and the hitch it may help cause.

Why this matters: A player can see >20 ms pacing misses, >33.34 ms doubled frames, or >50 ms stalls while the prominent internal metrics remain green. Canvas/GPU/compositor cost and post-render telemetry are specifically outside `frame.total`.

Verify/falsify:

1. For every runtime band, compare raw independent-rAF deltas against per-frame `frame.total`, `outer.frameTotal`, `outer.render`, and `outer.postStepToRender`, aligned by timestamp rather than only aggregate percentiles.
2. Add a synthetic 35–60 ms stall after `POST_RENDER`; current `frame.total` and the just-recorded `outer.frameTotal` should remain low while the next independent-rAF delta spikes.
3. Replace all performance assertions that consume `avgMs`/`maxMs` with window p95/p99/`trueMaxMs` and raw over-threshold counts.

### 2. Critical / high confidence — startup and restore transition stutters are recorded but barely gated

Evidence:

- Startup performs world terrain generation, a full 104 x 420 world build, an 832 x 3360 terrain-mask build/normalization, environment population, per-species fauna/flora creation, rooms, and articulated creation in synchronous step bodies (`src/constants.ts:3-5`, `src/scene-worldgen.ts:50-128`, `src/terrain-mask.ts:30-50`, `src/scene.ts:406-492`). `delayedCall(0)` separates steps, but any individual synchronous step can still consume a whole long frame (`src/scene.ts:495-511`).
- The loading smoke captures `startupRaf`, but its assertions only validate overlay/readiness and then apply cadence thresholds to the later settled swim (`tools/test_loading_swim_perf_smoke.mjs:197-225`, `tools/test_loading_swim_perf_smoke.mjs:275-292`). There is no startup p95/p99/max or >33/>50 assertion.
- Save/load transition is allowed an independent-rAF gap up to 1000 ms and only rejects Long Tasks at 1000 ms (`tools/test_save_load_perf_smoke.mjs:245-251`). Thus a 100–900 ms restore freeze passes. Strict cadence is applied only after a 500 ms settle and subsequent swim (`tools/test_save_load_perf_smoke.mjs:223-258`).
- Restore synchronously applies saved world/state, clears terrain caches, forces terrain dirty, reveals sonar, and recenters the camera (`src/save-load.ts:187-208`, `src/save-load.ts:215-220`), making first-restored-frame terrain and sonar work plausible hitch sources.

Why this matters: First impression, biome changes, and restore are highly visible even if steady play is excellent. Current reports can contain proof of a severe transition stall and still say pass.

Verify/falsify: Apply the standard 20/33.34/50 ms bands independently to (a) click-to-ready startup, (b) the first 2 seconds after ready, (c) load-command-to-first-presented-gameplay, and (d) the first 2 seconds after restore. Attribute each worst rAF gap to the named `worldgen.*`/`saveLoad.*` step and the first `draw.world`/sonar rebuild.

### 3. High / high confidence — default Canvas plus full per-frame scene reconstruction is the most plausible settled-render bottleneck

Evidence:

- Normal gameplay explicitly forces Phaser Canvas unless `?renderer=webgl` is supplied; AUTO is effectively unused for the main game (`src/main.ts:30-36`).
- Every active gameplay update calls `draw()` (`src/scene.ts:345-368`). `draw()` clears six Graphics objects, rebuilds multiple procedural layers, updates sprites, and invokes terrain, props, effects, fish, articulated creatures, sub, darkness, and overlays every frame (`src/scene-rendering.ts:21-61`). Many paths are not individually instrumented: bobbit burrows, boat, docking indicator, hazards, eggs, larvae, flora, player, flares, visibility cues, pings, and game-over.
- `drawWorld()` avoids work only while both terrain bounds and dirtiness are unchanged. Crossing a tile boundary changes `boundsKey`; mining invalidates it explicitly. A redraw clears three Graphics objects and regenerates visible terrain mask fill/boundaries/fringe/fray, terrain placements, ore, and fractures (`src/scene-rendering.ts:492-550`, `src/scene-rendering.ts:611-650`). Terrain chunks cache placement discovery, not the Graphics raster/commands for the visible terrain (`src/scene-rendering.ts:1044-1102`).
- Default Canvas means `draw.total` mostly measures issuing/mutating display-list commands; the Canvas renderer's actual raster cost lands in `outer.render`, after `frame.total`. This is exactly the mismatch in Finding 1.
- The B4 script can run WebGL only through an environment switch, defaults to Canvas, and has no package.json script at all (`tools/test_b4_busy_deep_perf_smoke.mjs:14-42`; `package.json` has no B4 entry). The application itself still defaults to Canvas.

Why this matters: Camera motion repeatedly crosses tile bounds, so even settled swimming can trigger large procedural redraw bursts. On Canvas, the many Graphics paths and large clears can plausibly create >20 ms frames; a terrain/ore rebuild or heavy raster can cross 33.34 ms, and combined invalidation/GC can cross 50 ms.

Verify/falsify: Run identical seed/path/viewport/DPR bands under Canvas and WebGL. Correlate >20 ms rAF frames with `draw.world`, `outer.render`, camera tile-bound changes, dirty counts, and Canvas renderer. A WebGL-only improvement with similar `draw.total` but lower `outer.render` confirms renderer/raster pressure.

### 4. High / medium-high confidence — B4 entity budgeting is valuable but fragile and under-asserted

Evidence:

- B4 declares 154 legacy fish before articulated/flora/hazards, and the update loop still visits every fish each frame for timers/tiering; all fish are also visited in draw for visibility (`src/content.ts:259-287`, `src/scene-entities.ts:71-133`, `src/scene-rendering.ts:3385-3422`). Flora similarly updates every entity and draw-tests every entity each frame (`src/scene-entities.ts:403-430`, `src/scene-rendering.ts:3496-3554`).
- Recent fish throttling depends on hard-coded camera/player margins and a 0.22 s distant interval (`src/scene-entities.ts:89-153`). Sonar marks nearby hostiles aggro, forcing them back to full simulation (`src/scene-sonar.ts:29-53`, `src/scene-entities.ts:136-153`). A normal B4 swim without sonar does not exercise that budget collapse.
- Articulated simulation budgets are distance/state based, but every creature/part still gets timer work, and full/engaged creatures run part posing, terrain correction (three passes), joint stress, grab resolution, and part proximity checks (`src/scene-articulated.ts:808-906`, `src/scene-articulated.ts:913-980`, `src/scene-articulated.ts:1354-1450`). B4 allows ten articulated spawns (`src/articulated.ts:236-238`, `src/scene-articulated.ts:751-805`).
- The B4 report records tier counters but does not assert a maximum full-step/terrain-pass budget, entity population floor, visible part density, or expected throttling ratio (`tools/test_b4_busy_deep_perf_smoke.mjs:137-162`, `tools/test_b4_busy_deep_perf_smoke.mjs:240-278`). It teleports to one articulated creature, so it does not prove the locally densest multi-threat/hostile/particle scene (`tools/test_b4_busy_deep_perf_smoke.mjs:217-234`).
- The recent lookup cache is keyed only by parts/manifests array lengths. If same-length arrays are replaced or IDs change, stale maps can persist (`src/scene-articulated.ts:1354-1409`; cache introduced by commit `44dc5c0`). This is primarily a correctness fragility, but a fallback/regression can also restore repeated map/find work.

Why this matters: Entity optimization passes can regress without making current smoke fail, especially during sonar aggro, combat, multiple articulated threats, detachable parts, flares/particles, or controller input. Update-bound bursts can cross 20/33 ms; combined terrain correction and allocation/GC are credible >50 ms cases.

Verify/falsify: Add a deterministic maximum-density B4 fixture with population/visible-part floors; pulse sonar, engage multiple hostiles, mine or detonate, deploy flares, and pilot the highest-part sub. Assert tier/terrain-pass ceilings and independent-rAF bands for both renderers.

### 5. High / high confidence — sonar caching is correctly gated in code, but its performance regression test can pass with bad cadence

Evidence:

- The compact HUD map is used during normal swim. The full chart is called only when `state.sonarMapOpen` (`src/scene-rendering.ts:4069-4073`), and ordinary-swim tests correctly reject any `draw.bigSonarMap` samples (`tools/test_sonar_minimap_performance_restore_smoke.mjs:180-187`). This gating is sound.
- The HUD static-cache key includes exact player tile, sonar reveal revision, and terrain revision (`src/scene-rendering.ts:4208-4261`). Passive reveal runs every 0.18 s (`src/scene.ts:890-896`), each changed reveal increments the revision and immediately redraws sonar (`src/scene-sonar.ts:91-106`). The HUD is also redrawn by periodic `renderHud()` (about every 90 ms) because `renderHud` unconditionally calls it (`src/scene.ts:370-375`, `src/hud.ts:13-118`). This creates periodic main-thread Canvas work and cache rebuilds during movement.
- A sonar ping calls draw through reveal, explicitly before status, again after `renderHud`, while the ping animation redraws every frame for its lifetime (`src/scene-sonar.ts:25-61`, `src/scene-entities.ts:1198-1213`). That is a bursty path not covered by ordinary closed-map swimming.
- Full-chart cache invalidates for reveal/terrain revisions and each 0.1 zoom bucket, then allocates/resizes a world raster and iterates all revealed keys (`src/scene-rendering.ts:4371-4451`). Opening/panning/zooming the map is paused gameplay but remains player-visible UI pacing.
- The minimap restore smoke collects independent rAF for three normal bands and the full chart, but never calls `assertSteadyGameplayCadence`; it asserts only sample count for normal swim and no cadence threshold at all for full chart (`tools/test_sonar_minimap_performance_restore_smoke.mjs:152-201`, `tools/test_sonar_minimap_performance_restore_smoke.mjs:235-273`). It is also absent from package.json.

Why this matters: The restored compact map can remain visually/functionally correct while periodic cache invalidation or ping/full-chart rebuilds cause palpable stutter. This is a fragile recent fix (commit `9c88409`) with a false-pass performance smoke.

Verify/falsify: Apply standard cadence assertions separately to normal swim, passive-reveal boundary crossings, a live sonar-ping burst, full-chart first open, and repeated zoom-bucket changes after a near-fully-revealed save. Record cache hit/miss and build time for both HUD and big-map caches; currently only big-map stats reach the frame buffer.

## False confidence risks

- `frame.total` and `draw.total` omit Phaser renderer/compositor/presentation cost; the Perf HUD displays these rather than the outer/rAF measures.
- EMA `avgMs` smooths hitches, decaying `maxMs` forgets them, and some tests assert those fields instead of p99/true max/raw threshold counts.
- Independent rAF measures callback cadence, not actual displayed presentation. Compositor/GPU dropped frames need tracing/presentation telemetry.
- Startup rAF is reported but not asserted. Save/load permits nearly a one-second freeze.
- Sonar minimap/full-chart rAF is reported but not asserted.
- B4 tier/entity statistics are descriptive only. A low-density random spawn or isolated teleport can pass without exercising the intended worst case.
- Headless Chromium at 1280 x 800, DPR 1 does not cover Tauri/desktop, high-DPR resize, integrated GPU, power-saving, or background-to-foreground behavior.
- Most perf scenarios use keyboard input. Controller polling reconstructs controller state and allocates button/axis arrays each gameplay frame (`src/scene.ts:674-788`), but the controller smoke has functional assertions only (`tools/test_sonar_map_controller_smoke.mjs:260-307`).
- Functional save/load smoke has no performance observer (`tools/test_save_load_smoke.mjs:76-155`), while the perf smoke validates only the later settled swim strictly.
- Telemetry itself filters/reduces full entity lists and allocates frame records after the measured outer frame, which can perturb rAF and misattribute its own cost.
- `perfSnapshot()` exports only the last 180 frames even though capacity is 720 (`src/perf.ts:333-360`); long or multi-phase captures can silently discard the lead-in/worst causal frame unless exported promptly.

## Likely next fix targets (if runtime matrix still finds drops)

### 1. Renderer and procedural draw path

Exact targets: `src/main.ts:30-36` (`forceCanvasRenderer` / Phaser game config); `src/scene-rendering.ts:21-61` (`draw`); `src/scene-rendering.ts:492-550` (`drawWorld`); `src/scene-rendering.ts:611-650` (terrain mask body/fill).

Action direction: Prefer/validate WebGL or AUTO for normal runtime, then retain terrain graphics/raster by chunk or scroll viewport rather than clearing/rebuilding procedural Graphics on every tile-bound change. Add metrics for currently unmeasured draw branches.

Expected impact: Largest reduction in `outer.render` and independent-rAF >20/>33 ms counts; smaller `draw.world` spikes. This is the top target if drops are render-bound or Canvas-only.

### 2. Sonar redraw/cache invalidation cadence

Exact targets: `src/scene.ts:890-896` (`updatePassiveSonarReveal`); `src/scene-sonar.ts:9-61`, `src/scene-sonar.ts:91-106`; `src/hud.ts:13-118` (`renderHud`); `src/scene-rendering.ts:4069-4261` (HUD map/cache); `src/scene-rendering.ts:4274-4451` (full map/cache).

Action direction: Decouple HUD DOM render from sonar redraw, coalesce multiple ping/reveal/status redraw requests into one rAF, key HUD terrain cache by a coarser moving window/incremental reveal patch, and instrument HUD cache hits/build times. Reuse full-chart rasters across pan; debounce/rebuild zoom buckets deliberately.

Expected impact: Removes periodic/bursty >20 ms frames during normal swim and sonar use; prevents >33/>50 ms first-open/zoom spikes on heavily revealed saves.

### 3. Dense entity update/draw and combat fixture

Exact targets: `src/scene-entities.ts:71-184` (`updateFish`/tiering); `src/scene-entities.ts:403-430` (`updateFlora`); `src/scene-articulated.ts:808-980` (`updateArticulatedCreatures`/budget); `src/scene-articulated.ts:1354-1450` (`updateArticulatedParts`); `src/scene-rendering.ts:3385-3554`, `src/scene-articulated.ts:1941-2025` (draw loops).

Action direction: Spatially index/cull before per-entity timer/distance work, make full-sim and terrain-pass budgets explicit per frame, avoid repeated linear manifest/part searches in articulated drawing, and create a deterministic locally dense sonar-aggro/combat/mining fixture.

Expected impact: Reduces `update.fish`, `update.articulated`, `draw.fish`, `draw.articulated`, allocation/GC, and rAF tail latency. This becomes target #1 instead when runtime evidence is update-bound rather than render-bound.

## Coverage gaps

Missing/enforcement gaps:

- No startup cadence assertion despite captured startup data.
- No strict restore-transition cadence bands; current 1000 ms ceiling is not a framerate guardrail.
- No cadence assertions in the sonar minimap/full-chart performance restore script.
- B4, deep-diagonal, mining, and sonar-minimap scripts are not exposed as package.json scripts; only loading, save/load perf, and the older guardrail are readily runnable.
- No deterministic seed matrix or density floor for B4; no multi-hostile sonar-aggro + articulated + mining/effects composite.
- No high-DPR/resize, Tauri, integrated-GPU, or background/resume scenario.
- No controller-input cadence scenario; controller functional coverage does not measure its per-frame polling/allocation cost.
- No dynamite/large mutation, rapid continuous mining while moving across terrain bounds, flare/particle saturation, or highest-part sub combined scenario.
- No fully/mostly revealed full sonar chart first-open and repeated zoom-bucket pacing assertion.

Missing raw metrics/capture bands:

- Actual presentation/dropped-frame or compositor/GPU tracing; rAF callback cadence is only a proxy.
- Raw long-frame sequence aligned by timestamps to internal phase metrics. Aggregate metric windows are insufficient for causal attribution.
- Per-frame threshold counts for internal `outer.render`, `outer.frameTotal`, update, draw, terrain, sonar, HUD/DOM, audio, input, flora, effects, and player/sub paths.
- HUD sonar cache hit/miss/build time; only big-sonar cache stats are exported.
- GC/allocation attribution and telemetry-overhead timing.
- Separate first-open, first-movement, steady-state, mutation burst, and post-restore capture bands.

## Artifact / notes index

- `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/telemetry-audit.md` — this audit; the only artifact written by this lane.

## Files inspected

- `/mnt/nxt-dev/water9/package.json`
- `/mnt/nxt-dev/water9/src/main.ts`
- `/mnt/nxt-dev/water9/src/constants.ts`
- `/mnt/nxt-dev/water9/src/content.ts`
- `/mnt/nxt-dev/water9/src/perf.ts`
- `/mnt/nxt-dev/water9/src/scene.ts`
- `/mnt/nxt-dev/water9/src/scene-rendering.ts`
- `/mnt/nxt-dev/water9/src/scene-sonar.ts`
- `/mnt/nxt-dev/water9/src/scene-worldgen.ts`
- `/mnt/nxt-dev/water9/src/scene-entities.ts`
- `/mnt/nxt-dev/water9/src/scene-articulated.ts`
- `/mnt/nxt-dev/water9/src/scene-combat.ts`
- `/mnt/nxt-dev/water9/src/scene-economy.ts`
- `/mnt/nxt-dev/water9/src/terrain-mask.ts`
- `/mnt/nxt-dev/water9/src/articulated.ts`
- `/mnt/nxt-dev/water9/src/hud.ts`
- `/mnt/nxt-dev/water9/src/save-load.ts`
- `/mnt/nxt-dev/water9/src/scene-playtest.ts`
- `/mnt/nxt-dev/water9/tools/perf_assertions.mjs`
- `/mnt/nxt-dev/water9/tools/test_perf_guardrails.mjs`
- `/mnt/nxt-dev/water9/tools/test_loading_swim_perf_smoke.mjs`
- `/mnt/nxt-dev/water9/tools/test_deep_diagonal_swim_perf_smoke.mjs`
- `/mnt/nxt-dev/water9/tools/test_b4_busy_deep_perf_smoke.mjs`
- `/mnt/nxt-dev/water9/tools/test_mining_perf_smoke.mjs`
- `/mnt/nxt-dev/water9/tools/test_sonar_minimap_performance_restore_smoke.mjs`
- `/mnt/nxt-dev/water9/tools/test_sonar_map_controller_smoke.mjs`
- `/mnt/nxt-dev/water9/tools/test_save_load_perf_smoke.mjs`
- `/mnt/nxt-dev/water9/tools/test_save_load_smoke.mjs`
- Relevant diffs/history for commits `44dc5c0`, `05b2c12`, `5b6cf4d`, and `9c88409`.

## Caveats / blockers

- This lane was explicitly read-only and did not launch a dev server or collect new runtime samples. Threshold-risk statements are code-based hypotheses intended to direct the runtime matrix, not claims that a specific device currently misses them.
- Headless/runtime behavior, Phaser delta smoothing details, compositor presentation, GPU driver behavior, and Tauri packaging cannot be proven from source inspection alone.
- Existing unrelated tracked and untracked run artifacts were present before this audit and were preserved.

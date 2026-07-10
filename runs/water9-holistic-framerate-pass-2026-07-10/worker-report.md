# Water9 Holistic Framerate Pass — Worker Report

Status: **PARTIAL**

Baseline: `9c88409`

## Verdict

This pass improves measurement truth, sonar/HUD cadence, deep traversal, and terrain redraw frequency, but it does **not** meet the requested holistic acceptance bar. Startup, restore, and repeated dense B4 still fail strict raw independent-rAF gates. Thresholds were not relaxed and failing transition windows were not hidden.

## Root causes confirmed or falsified

- **Confirmed:** `frame.total` is only the scene update callback, not full frame/presentation time. New app-owned rAF samples are timestamp-aligned to preceding post-render frames and export post-render-to-rAF plus telemetry overhead.
- **Confirmed:** ordinary HUD DOM refresh destroyed/rebuilt the compact sonar canvas and coupled DOM cadence to sonar redraw. The live canvas is now retained across HUD markup updates; redraw requests coalesce to one presentation callback. Surface, mid, deep, and full-chart sonar all pass afterward.
- **Confirmed:** exact viewport tile bounds caused repeated full procedural terrain clears/rebuilds. A padded four-tile snapped retained window reduces crossing frequency without changing terrain data, mining invalidation, or biome composition.
- **Confirmed:** startup remains synchronous and severe (`1183.3 ms` max, 7 frames over 50 ms). Measurement enforcement now rejects it.
- **Confirmed:** restore remains bursty (`p95/p99/max 83.3/83.3/83.3 ms`, 3 frames over 50 ms). Measurement enforcement now rejects it.
- **Confirmed:** dense B4 has high variance outside measured CPU spans. Three Canvas repeats have rAF p95 `33.3/33.3/33.3 ms` even though outer-frame p95 remains low; the app-owned rAF makes this discrepancy visible per frame.
- **Falsified for this environment:** WebGL as a validated default. Headless Chromium/Phaser fails before gameplay with `Framebuffer Unsupported`; Canvas remains the safe default and explicit fallback.
- **Partly confirmed:** terrain rebuilds explain isolated CPU tails (up to `21.2 ms` in a deep run) but do not fully explain sustained B4 doubled presentation frames.

## Architectural changes

- `src/perf.ts`: independent rAF instrumentation, aligned start/post-render/presentation timestamps, post-render telemetry cost, raw-window p95/p99/true max and >20/>33.34/>50 counts, full 720-frame export, cheaper one-pass entity visibility sampling, 30-frame heap sampling, and a truthful Perf HUD headed by presentation cadence and outer frame/render cost.
- `src/scene-rendering.ts`: retained padded/snapped terrain bounds; coalesced sonar draws; compact/full chart cache hit/miss/build telemetry.
- `src/hud.ts`, `src/scene-sonar.ts`, `src/scene-entities.ts`, `src/scene-economy.ts`, `src/scene.ts`: retain the compact sonar canvas across DOM refreshes and route reveal/ping/status/navigation requests through one rAF-coalesced draw.
- Performance smokes: removed EMA/decaying-max acceptance checks, added strict startup/restore gates, sonar cadence assertions, B4 density/visibility floors and explicit ceilings of 8 full articulated simulations / 18 terrain-correction passes, and exposed deep/B4/mining/sonar scripts through `package.json`. The ceilings are enforced as regression gates rather than runtime truncation so encounter behavior is preserved.

## Raw cadence comparison (1280x800, DPR 1)

Counts are `>20 / >33.34 / >50`. “Before” is the July 10 adversarial matrix where an identical band exists.

| Phase / renderer | Before p95 / p99 / max ms; counts | Current p95 / p99 / max ms; counts | Result |
|---|---|---|---|
| Startup click-to-ready / Canvas | `1983.3 / n/a / 1983.3`; only 6 samples, 2 >50 reported | `1183.3 / 1183.3 / 1183.3`; `9 / 8 / 7` | FAIL |
| First settled swim / Canvas | `16.8 / 33.3 / 33.4`; `9 / 2 / 0` | `33.4 / 33.4 / 50.0`; `75 / 28 / 0` | FAIL, high runtime variance |
| Load-to-first-presented gameplay / Canvas | prior gate allowed 1000 ms; no strict distribution | `83.3 / 83.3 / 83.3`; `7 / 5 / 3` | FAIL |
| First post-restore settled swim / Canvas | no strict comparable band | `33.3 / 33.4 / 33.4`; `29 / 9 / 0` | FAIL |
| Mining / Canvas | `16.7 / 16.8 / 50.0`; `2 / 2 / 0` | `16.7 / 16.8 / 33.4`; `2 / 2 / 0` | cadence PASS; raw draw.world max gate FAIL (`5.3 ms`) |
| Deep 360 m / Canvas | `16.8 / 33.4 / 33.4`; `7 / 4 / 0` | `16.8 / 16.8 / 33.3`; `1 / 0 / 0` | presentation PASS; draw budget FAIL |
| Deep 780 m / Canvas | `33.4 / 33.4 / 50.0`; `37 / 20 / 0` | `16.8 / 16.8 / 33.4`; `2 / 1 / 0` | presentation PASS; one 21.2 ms terrain rebuild |
| Deep 1140 m / Canvas | `33.3 / 33.4 / 50.0`; `17 / 5 / 0` | `16.7 / 16.8 / 16.8`; `0 / 0 / 0` | PASS |
| Deep 1500 m / Canvas | `33.3 / 33.4 / 50.0`; `18 / 7 / 0` | `16.7 / 33.4 / 33.5`; `5 / 3 / 0` | narrow FAIL (1.29% >33.34) |
| Sonar surface / Canvas | no separate prior raw band | `16.7 / 16.8 / 16.8`; `0 / 0 / 0` | PASS |
| Sonar mid / Canvas | no separate prior raw band | `16.7 / 16.8 / 16.8`; `0 / 0 / 0` | PASS |
| Sonar deep / Canvas | prior normal sonar aggregate `16.7 / 16.8 / 16.8`; `0 / 0 / 0` | `16.8 / 16.8 / 16.8`; `0 / 0 / 0` | PASS |
| Full sonar chart pan / Canvas | `16.7 / 16.8 / 16.8`; `0 / 0 / 0` | `16.7 / 16.8 / 16.8`; `0 / 0 / 0` | PASS |
| Dense B4 Canvas repeat 1 | repeats: p95 `33.4`, >33.34 `21` | `33.3 / 33.4 / 33.4`; `22 / 8 / 0` | FAIL |
| Dense B4 Canvas repeat 2 | repeats: p95 `33.4`, max `100` | `33.3 / 33.4 / 50.0`; `33 / 9 / 0` | FAIL |
| Dense B4 Canvas repeat 3 | repeats: p95 `33.3`, >33.34 `6` | `33.3 / 33.4 / 33.4`; `16 / 7 / 0` | FAIL |
| Dense B4 WebGL | prior/current environment blocked | no samples; `Framebuffer Unsupported` | UNSUPPORTED |

B4 density fixture current maxima: fish `156`, articulated `10`, parts `90`, visible parts `9`, full steps `8`, terrain passes `10`. Population and visibility floors pass; cadence does not.

## Verification

- PASS — `npm run build` (asset-resolution and chunk-size warnings unchanged).
- PASS — `git diff --check`.
- BLOCKED by pre-existing repository errors — `npx tsc --noEmit --pretty false`; touched files add no reported diagnostics, while existing story/save/playtest/type errors remain.
- PASS — `npm run water9:articulated-sim-budget-smoke`.
- PASS — sonar minimap/full-chart smoke, including readability and cadence at surface/mid/deep.
- MIXED/FAIL — deep diagonal: raw presentation passes 3/4 bands; strict CPU tail and 1500 m cadence gates fail.
- FAIL — B4 Canvas repeats 1–3.
- UNSUPPORTED — B4 WebGL startup.
- FAIL — loading/first-settled swim, strict startup gate.
- FAIL — save/load transition and post-restore swim.
- MIXED — mining cadence passes; raw `draw.world` maximum gate fails.

## Artifact manifest and visual review

- Deep diagonal report and live color/grayscale captures: `runs/water9-holistic-framerate-pass-2026-07-10/artifacts/deep-diagonal/` (360/780/1140/1500 m).
- Sonar surface/mid/deep and full-chart color/grayscale captures: `runs/water9-holistic-framerate-pass-2026-07-10/artifacts/sonar-fixed/`.
- Dense B4 repeats and color/grayscale live captures: `artifacts/b4-canvas-1/`, `b4-canvas-2/`, `b4-canvas-3/`.
- WebGL failure: `artifacts/b4-webgl/report.json` and `command.log`.
- Startup, save/load, and mining reports/captures: `artifacts/loading/`, `artifacts/save-load/`, `artifacts/mining/`.

Manual inspection confirms normal runtime/HUD identity, preserved biome palette/readability, terrain seams, B3 deep wreck presentation, and B4 ruin/large-creature composition. No bitmap/generated art changed. Existing 360/780/1140/1500 bands provide broad biome-depth proof, but this partial pass did not add narrowly adjacent new captures around every visual cutoff; that remains a verification gap.

## Remaining risks and blockers

- Startup world generation must be split into genuinely bounded work units; loading overlay coverage does not make a 1.18 s main-thread stall acceptable.
- Restore needs phased terrain/sonar/state application and a first-presented-gameplay marker.
- Dense B4 needs further presentation-path diagnosis (browser trace/compositor evidence) and a complete sonar-aggro + mining/detonation + flare + highest-part-sub composite fixture; current density fixture covers roster/visibility/budgets but not every requested simultaneous action.
- Full-chart first-open and repeated heavily-revealed zoom-bucket phases need dedicated separately timed gates; current sonar smoke strictly covers normal bands and chart pan.
- WebGL cannot be validated in this environment; AUTO/default must not change until a supported runtime comparison passes.
- High-DPR, Tauri/desktop, integrated GPU, and compositor presentation/drop telemetry remain unsupported.
- Two early smoke invocations used legacy environment variable names and rewrote untracked prior B4 proof artifacts. Tracked prior deep artifacts were restored exactly before staging; current durable proof is isolated under this run directory.

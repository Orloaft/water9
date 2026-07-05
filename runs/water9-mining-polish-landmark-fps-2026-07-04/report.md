# water9 mining polish + landmark/fps report

Status: implemented

Task key: `mining-polish-v1`

Preflight output: `7776913`

Report path:
`/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/report.md`

## Reference Check

The itch.io references were used only for interaction feel:

- Deep Dive: underwater treasure/search-light readability in dark water.
  `https://raptor9999.itch.io/deep-dive`
- Drill Diver: hold-to-drill action with immediate visible drill feedback.
  `https://tech-hutch.itch.io/drill-diver`
- Rust Bucket: resource drilling loop, aiming/searchlight, return tension.
  `https://sleepicacti.itch.io/rust-bucket`

No external assets were copied.

## Changed Files

Implementation:

- `src/helpers.ts`
- `src/scene-rendering.ts`
- `src/scene.ts`
- `src/scene-combat.ts`
- `src/scene-entities.ts`
- `src/scene-playtest.ts`
- `src/types.ts`

Run artifacts:

- `runs/water9-mining-polish-landmark-fps-2026-07-04/report.md`
- `runs/water9-mining-polish-landmark-fps-2026-07-04/capture-mining-polish-proof.mjs`
- `runs/water9-mining-polish-landmark-fps-2026-07-04/mining-landmark-fps-playwright.spec.mjs`
- `runs/water9-mining-polish-landmark-fps-2026-07-04/proof-before/`
- `runs/water9-mining-polish-landmark-fps-2026-07-04/landmark-proof-after/`
- `runs/water9-mining-polish-landmark-fps-2026-07-04/mining-proof/`
- `runs/water9-mining-polish-landmark-fps-2026-07-04/playwright-acceptance-proof/`
- `runs/water9-mining-polish-landmark-fps-2026-07-04/mining-landmark-fps-playwright-output/`
- `runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright-proof/`
- `runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright-output/`
- `runs/water9-mining-polish-landmark-fps-2026-07-04/perf-guardrails-smoke.json`
- `runs/water9-mining-polish-landmark-fps-2026-07-04/perf-guardrails-smoke-playwright-gate.json`

The run directory also contains earlier scout artifacts for B1 landmark/FPS and
B2 overlay inspection. The final Playwright visual acceptance proof for this
slice is in `playwright-acceptance-proof/`, with earlier supporting proof in
`landmark-proof-after/` and `mining-proof/`.

## B1 Landmark

Before changing code, the normal play water-column capture showed the B1
surface proof had no B1 landmark anchor and no rendered bitmap anchor:

- `proof-before/after-b1-surface-119-color.png`
- `proof-before/after-b1-surface-119-grayscale.png`
- `proof-before/after-captures.json`

The B1 upper-depth landmark still existed, and B2/B3/B4 landmark captures were
still present. The regression was specific to the B1 surface/shallow normal
play route: the surface band did not include the accepted B1 organic landmark,
and the water-column layering made the upper-band version too easy to lose.

Changes:

- Restored the B1 organic reef landmark into the biome 1 surface landmark pool.
- Raised the biome 1 surface authored landmark alpha from hidden to readable.
- Drew B1 organic background anchors above the broad water-column pass while
  keeping them behind the tile/water foreground.
- Used the existing generated organic reef asset with a runtime soft-edge
  texture route; B2/B3/B4 asset routing was left intact.

After proof:

- `landmark-proof-after/after-b1-surface-119-color.png`
- `landmark-proof-after/after-b1-surface-119-grayscale.png`
- `landmark-proof-after/after-b1-upper-180-color.png`
- `landmark-proof-after/after-b1-upper-180-grayscale.png`
- `landmark-proof-after/contact-sheet.png`
- `landmark-proof-after/after-captures.json`

After metadata for `b1-surface-119` shows anchor
`surface-biome-1-immediate` using asset
`biome-shallows-organic-reef-shelf`, rendered as
`water9-biome-landmark-shallows-organic-reef-shelf-soft-edge-220` at alpha
`0.26`. B2/B3/B4 after captures still render their accepted landmark assets.

## FPS / Seam

The initial B1 scout in this run recorded the user-facing symptom: water-on
normal play was substantially slower than water-off in the same B1 proof scene
and the landmark read as broad sheets behind water haze.

I did not reproduce a deterministic terrain texture seam in the focused mining
and landmark captures. The actionable issues found were render-order/readability
for the B1 landmark and avoidable per-frame work in the water-column/render path
plus uncapped mining feedback risk.

Changes:

- Compute the environment visual profile once per draw and pass it to
  foreground terrain presentation, parallax, and water-column drawing instead
  of recomputing it in each path.
- Compact terrain break effects in place instead of allocating a new array each
  frame.
- Cap terrain break/contact/glint effects at 72 and throttle drill contact
  chips so held drilling cannot create unbounded particles.
- Keep ore pickup rendering as a normal draw path with no generated bitmap
  dependency.

Final performance proof:

- `mining-proof/performance-diagnostics.json`
- `mining-proof/performance-scene-after-mining.png`
- `perf-guardrails-smoke.json`

`performance-diagnostics.json` after repeated mining: `frame.total` average
`10.05ms`, last `8.0ms`; `draw.total` average `7.49ms`, last `7.2ms`; local
prop refresh processed 8 local updates with no repeated full terrain scan.

`perf-guardrails-smoke.json`: passed, `fullScansDuringRepeatedMining: 0`,
`processedLocalRefreshes: 8`, `frame.total` average `11.52ms`, last `10.6ms`.

## Mining Lifecycle

Before:

- Ore was just another terrain tile during drilling.
- Breaking/cutting terrain could leave valuable ore feeling like it disappeared.
- Pickup relied on transient loose-item behavior, so clusters could appear to
  only partly collect.
- Drill contact had limited physical feedback while the drill was held against
  terrain.

After:

- Embedded/covered: ore remains a terrain tile while the surrounding cut face is
  intact.
- Drilling/contact: held drilling emits capped terrain chips and ore glints tied
  to drill contact.
- Exposed pickup: when a valuable ore tile breaks, it spawns a deterministic
  visible exposed ore nugget with `life: Infinity`, a short pickup delay, a
  stable source tile, and readable glow/facet rendering.
- Collected: diver contact and existing mining-sub pickup/vacuum conventions
  collect the visible ore exactly once. `item.collected` is set before cargo is
  mutated to guard against double collection.

Mining proof from actual `#game canvas`:

- `mining-proof/mining-01-before-drill.png`
- `mining-proof/mining-02-drill-contact-particles.png`
- `mining-proof/mining-03-exposed-ore-pickup.png`
- `mining-proof/mining-04-after-pickup.png`
- `mining-proof/mining-04-after-pickup-full-page.png`
- `mining-proof/mining-polish-contact-sheet.png`
- `mining-proof/mining-proof.json`

The proof staged a copper tile at source tile `(56, 19)`. Before drilling,
cargo was `0` and loose items were `0`. After drilling, a visible copper ore
nugget existed with value `14`, `exposed: true`, source tile `(56, 19)`, and
infinite life. Collection changed cargo/value from `0/0` to `1/14`, removed
the valuable loose item, and a second collection pass left cargo/value at
`1/14`.

## Playwright Acceptance Gate

Alex's follow-up made normal-play Playwright visual proof a hard gate. I added
and ran a slice-specific Playwright spec that starts Vite, drives the live
`?playtest=1` normal page, screenshots the actual `#game canvas`, and writes
machine-readable proof plus a manager-inspectable contact sheet.

Primary gate:

- Spec: `mining-landmark-fps-playwright.spec.mjs`
- Proof JSON:
  `playwright-acceptance-proof/mining-landmark-fps-playwright-proof.json`
- Contact sheet:
  `playwright-acceptance-proof/mining-landmark-fps-playwright-contact-sheet.png`
- HTML contact sheet:
  `playwright-acceptance-proof/mining-landmark-fps-playwright-contact-sheet.html`
- Playwright output:
  `mining-landmark-fps-playwright-output/.last-run.json`
- Video: none captured; this gate uses still sequences/contact sheets.

B1 landmark `#game canvas` artifacts from the Playwright gate:

- `playwright-acceptance-proof/b1-surface-119-water-on.png`
- `playwright-acceptance-proof/b1-surface-119-water-on-grayscale.png`
- `playwright-acceptance-proof/b1-upper-180-water-on.png`
- `playwright-acceptance-proof/b1-upper-180-water-on-grayscale.png`

The passing proof reports both B1 captures rendering
`water9-biome-landmark-shallows-organic-reef-shelf-soft-edge-220` with 4 visible
water-column layers. B1 rAF cadence at `b1-upper-180-water-on`: 49 frames,
`32.65ms` average, `33.4ms` p95, `50ms` max, about `30.6` average FPS.

Mining `#game canvas` artifacts from the Playwright gate:

- `playwright-acceptance-proof/mining-01-before-drill.png`
- `playwright-acceptance-proof/mining-02-drill-contact-particles.png`
- `playwright-acceptance-proof/mining-03-exposed-ore-pickup.png`
- `playwright-acceptance-proof/mining-04-after-pickup.png`
- `playwright-acceptance-proof/mining-04-after-pickup-full-page.png`

The Playwright proof confirms `0` cargo before drilling, a drill-contact frame
with `terrainBreakEffects: 1`, exposed copper with `life: "infinite"` and
source tile `(56, 19)`, first collection changing cargo/value to `1/14`, and
second collection leaving cargo/value unchanged.

FPS/seam `#game canvas` artifacts from the Playwright gate:

- `playwright-acceptance-proof/perf-seam-after-repeated-mining.png`
- `playwright-acceptance-proof/perf-seam-after-repeated-mining-grayscale.png`

The Playwright FPS/seam scene reports 34 rAF frames, `47.06ms` average,
`50.1ms` p95, `66.7ms` max, about `21.3` average FPS, with `8` local prop
refreshes and `0` full scans during local refresh. The saved color/grayscale
frames are the visual proof for manager inspection.

Supporting B2 normal-play Playwright gate:

- Spec: `biome2-overlay-playwright.spec.mjs`
- Proof JSON:
  `biome2-overlay-playwright-proof/biome2-overlay-playwright-proof.json`
- Contact sheet:
  `biome2-overlay-playwright-proof/biome2-overlay-playwright-contact-sheet.png`

This gate passed and captured B2 surface/upper/mid/deep color and grayscale
`#game canvas` frames. Its frame-cadence diagnostics still flag obvious 60 FPS
misses in headless capture, especially the B2 reachable landmark scene
(`84.09ms` average). That is recorded here because worker self-verdict is not
acceptance; manager visual inspection and the saved cadence data should decide
whether more performance work is required.

## Verification

Commands run:

```sh
git -C /mnt/nxt-dev/water9 rev-parse --short HEAD
```

Output: `7776913`

```sh
WATER_COLUMN_PROOF_DIR=/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/proof-before WATER_COLUMN_PROOF_MODE=after WATER_COLUMN_PROOF_PORT=5180 node runs/water9-water-column-atmosphere-v1-2026-07-04/capture-water-column-proof.mjs
```

Output summary: completed on port `5180`; B1 surface had no landmark anchors
or rendered bitmap anchors before this slice.

```sh
WATER_COLUMN_PROOF_DIR=/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/landmark-proof-after WATER_COLUMN_PROOF_MODE=paired WATER_COLUMN_PROOF_PORT=5180 node runs/water9-water-column-atmosphere-v1-2026-07-04/capture-water-column-proof.mjs
```

Output summary: `Water-column proof paired complete`; B1 surface, B1 upper,
B2, B3, and B4 color/grayscale captures written under
`landmark-proof-after/`.

```sh
node runs/water9-mining-polish-landmark-fps-2026-07-04/capture-mining-polish-proof.mjs
```

Output summary: `Mining polish proof complete`; screenshots, contact sheet,
mining lifecycle JSON, and performance diagnostics written under
`mining-proof/`.

```sh
npm run build
```

Output summary from the final rerun: passed. Vite still reports the pre-existing
unresolved `/assets/generated/...` runtime asset warnings and the existing large
chunk warning.

```text
dist/index.html                     0.39 kB | gzip:   0.27 kB
dist/assets/index-DAer6w86.css     38.89 kB | gzip:   7.38 kB
dist/assets/index-xX_DxuJa.js   1,799.28 kB | gzip: 503.46 kB
✓ built in 1.24s
```

```sh
npx playwright test runs/water9-mining-polish-landmark-fps-2026-07-04/mining-landmark-fps-playwright.spec.mjs --reporter=list --workers=1 --timeout=180000 --output runs/water9-mining-polish-landmark-fps-2026-07-04/mining-landmark-fps-playwright-output
```

Initial output: failed in the new spec because the drill-particle assertion read
a delayed snapshot where `terrainBreakEffects` had already reached `0`.

```text
1) ... mining-landmark-fps-playwright.spec.mjs ... captures normal-play B1 landmark, mining, and FPS/seam proof from #game canvas
Error: terrain break/contact effects visible
Expected: > 0
Received: 0
```

I corrected the spec timing to capture/assert the immediate drill frame, then
reran the exact command. Final output:

```text
✓ 1 runs/water9-mining-polish-landmark-fps-2026-07-04/mining-landmark-fps-playwright.spec.mjs:530:1 › captures normal-play B1 landmark, mining, and FPS/seam proof from #game canvas (1.0m)
1 passed (1.1m)
```

Final `.last-run.json`:

```json
{ "status": "passed", "failedTests": [] }
```

Primary Playwright output paths:

- `playwright-acceptance-proof/mining-landmark-fps-playwright-proof.json`
- `playwright-acceptance-proof/mining-landmark-fps-playwright-contact-sheet.png`
- `mining-landmark-fps-playwright-output/.last-run.json`

```sh
PERF_GUARDRAIL_OUT_DIR=/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04 PERF_GUARDRAIL_REPORT=/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/perf-guardrails-smoke.json PERF_GUARDRAIL_PORT=5191 npm run water9:perf-guardrails-smoke
```

Output:

```text
Water9 perf guardrails smoke passed.
Report: /mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/perf-guardrails-smoke.json
```

```sh
PERF_GUARDRAIL_OUT_DIR=/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04 PERF_GUARDRAIL_REPORT=/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/perf-guardrails-smoke-playwright-gate.json PERF_GUARDRAIL_PORT=5191 npm run water9:perf-guardrails-smoke
```

Final output:

```text
Water9 perf guardrails smoke passed.
Report: /mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/perf-guardrails-smoke-playwright-gate.json
```

Final perf-smoke JSON summary: `ok: true`, `processedLocalRefreshes: 8`,
`fullScansDuringRepeatedMining: 0`, final `frame.total` average `12.27ms`,
last `9.8ms`, final `draw.total` average `8.62ms`, last `7.3ms`.

```sh
npx playwright test runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright.spec.mjs --reporter=list --workers=1 --timeout=120000 --output runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright-output
```

Final output:

```text
✓ 1 runs/water9-mining-polish-landmark-fps-2026-07-04/biome2-overlay-playwright.spec.mjs:429:1 › captures normal-play biome 2 overlay proof from #game canvas (35.2s)
1 passed (36.2s)
```

Final `.last-run.json`:

```json
{ "status": "passed", "failedTests": [] }
```

Supporting Playwright output paths:

- `biome2-overlay-playwright-proof/biome2-overlay-playwright-proof.json`
- `biome2-overlay-playwright-proof/biome2-overlay-playwright-contact-sheet.png`
- `biome2-overlay-playwright-output/.last-run.json`

Post-proof port check:

```sh
ss -ltnp '( sport >= :5180 and sport <= :5199 )' || true
```

Output:

```text
State Recv-Q Send-Q Local Address:Port Peer Address:PortProcess
```

No listeners remained in `5180-5199`.

## Dirty Status / Commit

No files were staged. No commit was made because the task explicitly said to
leave changes dirty unless repo instructions or the manager ledger clearly
required a commit.

The worktree was already dirty before this slice. Pre-existing dirty paths
included `package.json`, `src/hud.ts`, `src/styles.css`, and many previous run
and tool artifacts. This slice touched the implementation paths listed above
and added the `runs/water9-mining-polish-landmark-fps-2026-07-04/` artifacts.

## Caveats / Risks

- The B1 surface landmark is now present and readable in the proof, but the
  source organic reef bitmap still contains broad horizontal massing. The
  runtime soft-edge route reduces the rectangular read, but a dedicated asset
  repaint would make it cleaner.
- Headless frame metrics include cold-start/worldgen outliers. The steady
  post-mining telemetry frame and draw timings are good, and the perf guardrail
  smoke passed, but Playwright rAF cadence still shows visible drops in some
  normal-play scenes. Treat the saved FPS/seam screenshots and JSON cadence
  data as acceptance inputs rather than a worker self-verdict.
- The proof command uses playtest staging commands only to set up deterministic
  positions and invoke the real `mineAt`/`updateLooseItems` paths; screenshots
  are actual normal `#game canvas` captures.

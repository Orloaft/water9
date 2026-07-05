# Water9 Ore Pass-Through Mining Fix - 2026-07-05

## Summary

Fixed the ore pass-through regression by resolving ore tiles whose terrain-mask core has already been opened by mining tunnel carving. The ore tile now routes through the existing `breakTile` path, so the world tile/visual is cleared and a loose valuable ore item is spawned instead of leaving a pass-through ghost ore.

Stable ore anchoring from `7636082` is preserved: adjacent terrain mining keeps the copper deposit anchored at `copper:56:19` with unchanged world position.

## Root Cause

`carveMiningTunnel` could remove enough terrain-mask density through an ore tile for the tunnel to be effectively opened, while `mineTargets` still selected a neighboring tile and the ore never reached `breakTile`. Because rendering keys off the ore world tile, the visual ore remained even though the mask had been carved open.

## Fix

- `src/scene-combat.ts` now scans the small impact neighborhood after mining damage resolves.
- Any ore tile with an opened core (`>= 0.56`) or break-open solid ratio (`<= 0.34`) is released through `breakTile`.
- The existing open-core thresholds in `breakTile` were named and reused, preserving the prior direct-ore break behavior.

## Evidence

Pre-fix reproduction:

- `pre-fix-ghost-open-core-reproduction.json`
- Seed `7`, upper-left offset mining, 7 repeats.
- Before fix: target tile stayed `copper`, `openCoreRatio: 0.688`, `centerDensity: 84`, `looseValuable: 0`, status `Chipped Copper.`

Fixed proof:

- `proof-summary.json`
- `ore-pass-01-before-visible-ore.png`
- `ore-pass-02-after-offset-mining-no-ghost.png`
- `ore-pass-03-after-collect-cargo.png`
- `ore-pass-04-adjacent-anchor-regression.png`

Key fixed assertions:

- Pass-through ore tile after mining: `tile: water`, `solidRatio: 0`, `openCoreRatio: 1`, `contact: null`, `looseValuableCount: 1`.
- Collection after spawn: cargo increased from `0` to `1`, cargo value from `0` to `14`.
- Direct ore mining: target tile became `water`, loose Copper spawned, collection increased cargo.
- Adjacent terrain mining: copper stayed at key `copper:56:19`; anchor root and world position remained unchanged.

## Verification

- PASS: `npm run build`
- PASS: `npx tsc --noEmit --pretty false`
- PASS: `node runs/water9-ore-pass-through-mining-fix-2026-07-05/capture-ore-pass-through-proof.mjs`
- PASS: `PLAYTEST_URL=http://127.0.0.1:5180 npm run terrain:progressive-mining-review`
- PASS: `PERF_GUARDRAIL_PORT=5192 PERF_GUARDRAIL_OUT_DIR=runs/water9-ore-pass-through-mining-fix-2026-07-05 PERF_GUARDRAIL_REPORT=runs/water9-ore-pass-through-mining-fix-2026-07-05/perf-guardrails-smoke.json npm run water9:perf-guardrails-smoke`
- FAIL, unrelated broad playtest timeout: `PLAYTEST_URL=http://127.0.0.1:5180 PLAYTEST_OUT=runs/water9-ore-pass-through-mining-fix-2026-07-05/playtest-report.json PLAYTEST_SCREENSHOT_DIR=runs/water9-ore-pass-through-mining-fix-2026-07-05/playtest-screenshots npm run playtest`
  - Failure: `page.waitForFunction: Timeout 10000ms exceeded`
  - Location: `tools/playtest.mjs:113`, called at `tools/playtest.mjs:1284` while running `command('setBiome', 4)` before the articulated review block.
  - This failure occurred after the ore-focused proof, progressive mining review, build, typecheck, and perf smoke had passed.

Note: `water9:perf-guardrails-smoke` was rerun after two seed/staging-sensitive failures on `submarine mask-aware terrain collision did not register`; the final run passed and wrote `perf-guardrails-smoke.json`.

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
- `ore-pass-05-before-second-visible-quartz.png`
- `ore-pass-06-after-second-node-direct-mineable.png`

Key fixed assertions:

- Pass-through ore tile after mining: `tile: water`, `solidRatio: 0`, `openCoreRatio: 1`, `contact: null`, `looseValuableCount: 1`.
- Collection after spawn: cargo increased from `0` to `1`, cargo value from `0` to `14`.
- Second visible ore-node case: adjacent Quartz started as `tile: quartz`, `solidRatio: 1`, `openCoreRatio: 0`, `contact.count: 21`; after direct mining it became `tile: water`, `solidRatio: 0`, `openCoreRatio: 1`, `contact: null`, `looseValuableCount: 1`; collection increased cargo from `1` to `2` and cargo value from `14` to `46`.
- Direct ore mining: target tile became `water`, loose Copper spawned, collection increased cargo.
- Adjacent terrain mining: copper stayed at key `copper:56:19`; anchor root and world position remained unchanged.

## Viperfish Asset Triage

Alex's abyssal viperfish asset note is separable from ore mining, but not safe to promote in this lane.

- Normal gameplay `Abyssal Viperfish` is still a regular fish entry in `src/content.ts` using `assetKey: fauna-abyss-viperfish`, loaded through `src/helpers.ts`, with assets `public/assets/generated/fauna-abyss-viperfish.png`, `public/assets/generated/fauna-abyss-viperfish.frames.json`, and `public/assets/generated/fauna-abyss-viperfish-{0,1,2}.png`.
- A higher-fidelity `saber-viperfish` articulated candidate exists in `public/assets/generated/fauna-saber-viperfish.articulated.json` and `public/assets/generated/articulated-creatures.parts.json`, but its quality status is still `prototype`.
- `public/review/content-acceptance-audits/saber-viperfish.json` and `public/review/acceptance-packets/saber-viperfish.md` both say human source approval and rig acceptance are still missing.
- Recommendation: follow up with a dedicated asset/content task to decide whether accepted `saber-viperfish` replaces the regular fish sprite or becomes a normal articulated spawn, complete/provide the required approvals, update `src/content.ts`, `src/scene-worldgen.ts`, and/or the articulated manifest, then capture sandbox plus normal-runtime proof.

Triage artifact: `viperfish-asset-triage.json`.

## Verification

- PASS: `npm run build`
- PASS: `npx tsc --noEmit --pretty false`
- PASS: `node runs/water9-ore-pass-through-mining-fix-2026-07-05/capture-ore-pass-through-proof.mjs` after expanding proof to `proof-summary.json` schema `water9-ore-pass-through-mining-fix-proof@2`
- PASS: `PLAYTEST_URL=http://127.0.0.1:5180 npm run terrain:progressive-mining-review`
- PASS: `PERF_GUARDRAIL_PORT=5192 PERF_GUARDRAIL_OUT_DIR=runs/water9-ore-pass-through-mining-fix-2026-07-05 PERF_GUARDRAIL_REPORT=runs/water9-ore-pass-through-mining-fix-2026-07-05/perf-guardrails-smoke.json npm run water9:perf-guardrails-smoke`
- FAIL, unrelated broad playtest timeout: `PLAYTEST_URL=http://127.0.0.1:5180 PLAYTEST_OUT=runs/water9-ore-pass-through-mining-fix-2026-07-05/playtest-report.json PLAYTEST_SCREENSHOT_DIR=runs/water9-ore-pass-through-mining-fix-2026-07-05/playtest-screenshots npm run playtest`
  - Failure: `page.waitForFunction: Timeout 10000ms exceeded`
  - Location: `tools/playtest.mjs:113`, called at `tools/playtest.mjs:1284` while running `command('setBiome', 4)` before the articulated review block.
  - This failure occurred after the ore-focused proof, progressive mining review, build, typecheck, and perf smoke had passed.

Note: `water9:perf-guardrails-smoke` was rerun after two seed/staging-sensitive failures on `submarine mask-aware terrain collision did not register`; the final run passed and wrote `perf-guardrails-smoke.json`.

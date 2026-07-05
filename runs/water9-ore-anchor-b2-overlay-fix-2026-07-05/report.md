# Water9 Ore Anchor + B2 Overlay Fix

Status: accepted

## Summary

- Started from `9f6ffa1` on `ux-work`.
- Gameplay ore rendering now uses stable resource-tile components for cluster root/bounds. Mutable terrain-mask carving can affect exposure/solid ratio, but it no longer re-roots or moves a still-existing ore tile's visible anchor.
- Mining target selection now prefers a visible nearby ore tile when the cutter impact is inside the ore visual footprint, so a visible ore hit damages the resource tile and can release the expected loose cargo.
- Biome 2 mid-band no longer applies the whole-scene `0.08 / 0.025 / 0.08` foreground terrain alpha wash. The separate `transitionDeep` alpha behavior remains unchanged.
- Decorative terrain material stamp pools no longer include `terrain-stamp-ore-*` stamps, reducing ore-like non-gameplay art in normal mineable terrain.

## Proof

- Proof script: `runs/water9-ore-anchor-b2-overlay-fix-2026-07-05/capture-proof.mjs`
- Proof summary: `runs/water9-ore-anchor-b2-overlay-fix-2026-07-05/proof-summary.json`
- Ore screenshots:
  - `ore-01-before-adjacent-mining.png`
  - `ore-02-after-adjacent-rock-mining.png`
  - `ore-03-after-direct-ore-break.png`
- Biome 2 screenshots:
  - color/grayscale pairs for 504m, 510m, 522m, 636m, 690m, 1026m, 1038m, 1044m, and 1440m transition-deep control.

Ore proof highlights:

- Visible ore deposits: `2` before adjacent mining, `2` after adjacent rock mining, `1` after direct copper break.
- Copper anchor stayed fixed after adjacent mining: tile `(56,19)`, world `(1356.139,470.653)` before and after.
- Direct ore break produced loose `copper`, value `14`, `sourceTileX: 56`, `sourceTileY: 19`; collection then reported `Recovered loose Copper worth 14 credits.` and cargo `1`.

B2 proof highlights:

- Runtime foreground layer alphas at 522m, 636m, 690m, 1026m, and 1038m are all `terrain=1`, `terrainEdges=1`, `oreOverburden=1`.
- Lower control at 1044m is also `1 / 1 / 1`.
- Transition-deep control at 1440m remains `terrain=0.48`, `terrainEdges=0.24`, `oreOverburden=0.48`.

## Verification

- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `9f6ffa1`
- `npm run build` -> passed. Vite emitted existing unresolved runtime asset warnings and the existing large chunk warning.
- `npx tsc --noEmit --pretty false` -> passed.
- `node runs/water9-ore-anchor-b2-overlay-fix-2026-07-05/capture-proof.mjs` -> passed on Vite port `5180`.
- `npm run terrain:progressive-mining-review` -> first failed without a dev server because the script defaults to `127.0.0.1:5175`; rerun with Vite on `5180` and `PLAYTEST_URL=http://127.0.0.1:5180/` passed. JSON: `terrain-progressive-mining-review/terrain-progressive-mining-review.json`.
- `npm run water9:perf-guardrails-smoke` -> passed. JSON: `perf-guardrails-smoke.json`.
- `npm run playtest` -> first failed without a dev server because the script defaults to `localhost:5175`; rerun with Vite on `5180` completed but exited `1` with unrelated articulated review failures. Summary: `playtest-failure-summary.json`.

## Caveats

- The full `npm run playtest` failure is outside this fix area: the failure set is articulated creature visual/attack/stun evidence, including missing in-frame articulated parts, blocking pause-menu evidence, and articulated attack/stun assertions. The large generated full report/screens were summarized instead of committed.

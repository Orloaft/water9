# B4 Biome Landmark Transition Audit - 2026-07-06

## Status

COMPLETE

## Preflight HEAD

- Required command: `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`
- Result: `2c4ff8d`
- Repo verified: `/mnt/nxt-dev/water9`
- Scope: read-only game/code audit; no game code changed. This run directory only contains report/proof artifacts.

## B4 Landmark Count Table

| B4 band / context | Normal gameplay landmark candidates | Unique normal-play landmark assets | Anchors computed per viewport | Render status |
| --- | --- | ---: | ---: | --- |
| `surface` / first water | `biome-ruins-vault-causeway-lattice` | 1 | 1 immediate anchor | Rendered as bitmap anchor with B4 soft-edge/tint path. |
| `upper` | `biome-ruins-vault-causeway-lattice` | 1 | Budgeted to 1 | Same B4 bitmap; no generated/procedural fallback shape. |
| `mid` | `biome-ruins-vault-causeway-lattice` | 1 | Budgeted to 1 | Same B4 bitmap; no generated/procedural fallback shape. |
| `lower` | `biome-ruins-vault-causeway-lattice` duplicated in pool | 1 | Budgeted to 1 | Same B4 bitmap, but actual draw alpha is further multiplied by `0.06`, making it very subdued in lower B4. |
| `transitionDeep` | B4 pool: `biome-ruins-vault-causeway-lattice`, `phase10-transition-drowned-signal-station`, `phase8-transition-collapsed-sub-elevator`; fallback generic Phase 11: `phase11-transition-far-drowned-signal-station`, `phase11-transition-mid-collapsed-gantry-brine-reef`, `phase11-transition-near-pipe-cable-cathedral` | 6 reachable by current selection order | Multiple slot anchors; proof computed 7, culling decides what draws | Mixed authored/GPT bitmap landmarks; no procedural shape fallback in the current draw path. |
| Decorative non-landmark layers | `phase3` band plates, `phase11-transition-deep-gpt-band`, `parallax-deep-*`, water-column masks/veil | N/A | N/A | Background/fog/veil only; not counted as landmarks. |

## Transition Observations

- Biome travel is a hard route change: `travelToNextBiome()` resets `depth`, `maxDepth`, cargo/scan state, rerolls `rng.seed`, increments `state.biome`, restarts the scene, and shows the biome loading transition. There is no underwater B3-to-B4 cross-fade; the loading/reset makes this an authored jump, not a continuous swim-by transition.
- B4 first-water entry is readable but abrupt: the `surface` band immediately returns one huge B4 ruins anchor with no depth ramp. The authored surface size multipliers make it wider than the viewport, then rendering applies the B4 soft-edge path and `0.2` alpha multiplier.
- B4 lower is quieter than B3 lower: metadata reports one B4 ruins anchor at alpha `0.096`, but the draw path multiplies lower-band B4 ruins anchors by `0.06`, so the displayed ruins signal is faint compared with the preceding B3 lower capture.
- B4 `transitionDeep` changes character again: strict single-biome-anchor budgeting is disabled for `transitionDeep`, so the runtime can mix B4 ruins, Phase 10, Phase 8, and Phase 11 transition landmarks across slots. In proof this produced 7 computed anchors, including repeated Phase 10/Phase 11 station assets.
- Depth bands are global, not biome-specific: active bands are selected at `<120 surface`, `<520 upper`, `<1040 mid`, `<1440 lower`, else `transitionDeep`, with blend windows on the band profiles.
- Randomization is deterministic per scene seed and slot: anchor selection uses `hash(..., rng.seed + offsets)`. Travel to B4 rerolls `rng.seed`, so exact B4 landmark slots differ per run.
- Culling occurs in `drawBackgroundAnchors()` after anchor generation. Offscreen anchors can appear in proof metadata but are skipped if their parallax-adjusted y range is outside the camera with an 80px margin.
- Fog/occlusion: B4 lower enables the post-darkness `cold-ruin-veil` (`alpha 0.066`, 17 broad bands, 108 particles) and uses the deepest darkness curve, so lower B4 intentionally buries landmarks behind gloom. `transitionDeep` reduces darkness mask opacity but raises the transition band plate alpha.

## Proof Paths

- Proof JSON: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-transition-audit-2026-07-06/b4/b4-landmark-transition-proof.json`
- B3 before B4 lower: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-transition-audit-2026-07-06/b4/b3-before-b4-lower-game-canvas.png`
- B4 entry/surface: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-transition-audit-2026-07-06/b4/b4-entry-surface-game-canvas.png`
- B4 lower/deeper: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-transition-audit-2026-07-06/b4/b4-deeper-lower-game-canvas.png`
- B4 transitionDeep: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-transition-audit-2026-07-06/b4/b4-transition-deep-game-canvas.png`
- Grayscale pairs are present beside each capture with `-grayscale.png` suffix.
- Capture script: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-transition-audit-2026-07-06/b4/capture-b4-proof.mjs`

## Jarring Causes Ranked

1. Hard biome route reset: B3 assets disappear and B4 assets/seed appear after scene restart, with no cross-biome visual continuity besides the loading panel.
2. B4 surface anchor has no first-water ramp; it appears immediately at surface band with a giant viewport-scale structure.
3. B4 lower over-damps its only B4-specific landmark by multiplying the already-low anchor alpha by `0.06`, so the lower band can feel like the readable B4 identity drops away.
4. B4 `transitionDeep` mixes several station/gantry families, so deeper B4 can swap from the single ruins identity into a busy station collage.
5. Lower B4 veil/darkness improves mood but makes asset readability inconsistent between entry, lower, and transitionDeep.

## Recommended Smallest First Slice

Add a B4-specific landmark visibility ramp instead of new art: keep the current asset pool, but tune the B4 ruins draw multiplier/depth ramp so entry is not instantly full-size and lower B4 does not collapse to near-invisible. The smallest target is `drawBackgroundAnchors()` B4 ruins alpha handling plus, if needed, a B4-specific entry-depth alpha ramp in `environmentAnchorSilhouettesFor()`.

## Verification Commands

- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `2c4ff8d`
- `PLAYTEST_URL=http://127.0.0.1:5181/ node runs/water9-biome-landmark-transition-audit-2026-07-06/b4/capture-b4-proof.mjs` -> wrote proof JSON and 8 PNG captures.
- `npx tsc --noEmit --pretty false` -> PASS.
- `jq -r '.outputs[] | [.key,.background.activeBand.activeBand,.background.anchorCount,([.background.anchors[].assetId]|join(",")),.canvas.stats.lumaAverage,.colorPath] | @tsv' runs/water9-biome-landmark-transition-audit-2026-07-06/b4/b4-landmark-transition-proof.json`

## Caveats / Blockers

- No capture blocker: actual `#game canvas` proof was captured with Playwright on dev port `5181`.
- The proof uses the normal `?playtest=1&biome=N` game route, then playtest commands for repeatable positioning and overlay cleanup. It is normal runtime rendering, but not a hand-played descent.
- `git status` shows pre-existing dirty source (`src/helpers.ts`) outside this run lane; this audit did not modify source code.

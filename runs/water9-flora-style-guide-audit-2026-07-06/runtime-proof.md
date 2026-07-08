# Water9 Flora Runtime Canvas Proof

Generated: 2026-07-06
Repo: `/mnt/nxt-dev/water9`
HEAD: `03b2dad`
Dev server: `http://127.0.0.1:5180/`, shut down with `SIGTERM` (`exitCode: 143`, `serverShutdown: true`)

## Method

I reused the existing Water9 Playwright/playtest path instead of a review-only harness:

- `tools/test_edge_flora_playtest.mjs` for flora snapshot/anchor proof patterns.
- `runs/water9-biome-landmark-transition-audit-2026-07-06/b2/capture-b2-proof.mjs` for the Vite + Playwright + `#game canvas` capture pattern.
- Normal `?playtest=1&biome=N&renderer=canvas` runtime, with `start`, `dive`, `teleportToFlora` or `teleportToReachableDepth`, `centerCameraOnPlayer`, and `clearProofOverlays`.

Every key capture has:

- a live `#game canvas` color PNG,
- a live `#game canvas` grayscale PNG,
- a viewport PNG with HUD and gameplay identity,
- JSON metadata in `flora-runtime-proof.json`.

## Runtime Artifacts

Primary report data:

- `runs/water9-flora-style-guide-audit-2026-07-06/flora-runtime-proof.json`
- `runs/water9-flora-style-guide-audit-2026-07-06/flora-runtime-contact-sheet.png`
- `runs/water9-flora-style-guide-audit-2026-07-06/flora-runtime-contact-sheet.html`
- `runs/water9-flora-style-guide-audit-2026-07-06/capture-flora-runtime-proof.mjs`
- `runs/water9-flora-style-guide-audit-2026-07-06/dev-server-shutdown.json`

Captured canvas pairs:

| Band | Capture | Color | Grayscale | HUD/context |
| --- | --- | --- | --- | --- |
| B1 surface/shallow | scannable Glass Kelp, scanTarget `Glass Kelp`, actual depth 156m | `canvas-b1-surface-scannable-glass-kelp.png` | `canvas-b1-surface-scannable-glass-kelp-grayscale.png` | `viewport-b1-surface-scannable-glass-kelp.png` |
| B2 mid/brine shelf | scannable Vent Coral, scanTarget `Vent Coral`, actual depth 714m | `canvas-b2-mid-scannable-vent-coral.png` | `canvas-b2-mid-scannable-vent-coral-grayscale.png` | `viewport-b2-mid-scannable-vent-coral.png` |
| B3 deep | scannable Crown Polyp, scanTarget `Crown Polyp`, actual depth 864m | `canvas-b3-deep-scannable-crown-polyp.png` | `canvas-b3-deep-scannable-crown-polyp-grayscale.png` | `viewport-b3-deep-scannable-crown-polyp.png` |
| B4 abyss | scannable Oracle Polyp, scanTarget `Oracle Polyp`, actual depth 1278m | `canvas-b4-abyss-scannable-oracle-polyp.png` | `canvas-b4-abyss-scannable-oracle-polyp-grayscale.png` | `viewport-b4-abyss-scannable-oracle-polyp.png` |
| B1 shallow | decorative terrain flora context, actual depth 180m | `canvas-b1-shallow-decorative-terrain-flora.png` | `canvas-b1-shallow-decorative-terrain-flora-grayscale.png` | `viewport-b1-shallow-decorative-terrain-flora.png` |
| B2 mid/brine shelf | decorative terrain flora context, requested 760m, actual reachable depth 522m | `canvas-b2-mid-brine-shelf-decorative-terrain-flora.png` | `canvas-b2-mid-brine-shelf-decorative-terrain-flora-grayscale.png` | `viewport-b2-mid-brine-shelf-decorative-terrain-flora.png` |
| B3 deep | decorative terrain flora/fringe context, requested 1260m, actual reachable depth 492m | `canvas-b3-deep-decorative-terrain-flora.png` | `canvas-b3-deep-decorative-terrain-flora-grayscale.png` | `viewport-b3-deep-decorative-terrain-flora.png` |
| B4 abyss | decorative terrain flora context, requested 1500m, actual reachable depth 582m | `canvas-b4-abyss-decorative-terrain-flora.png` | `canvas-b4-abyss-decorative-terrain-flora-grayscale.png` | `viewport-b4-abyss-decorative-terrain-flora.png` |
| B2 upper cutoff | decorative cutoff sample, actual depth 180m | `canvas-b2-upper-cutoff-180-decorative-terrain-flora.png` | `canvas-b2-upper-cutoff-180-decorative-terrain-flora-grayscale.png` | `viewport-b2-upper-cutoff-180-decorative-terrain-flora.png` |
| B2 transition cutoff | decorative cutoff sample, requested 1500m, actual reachable depth 642m | `canvas-b2-transition-cutoff-1500-decorative-terrain-flora.png` | `canvas-b2-transition-cutoff-1500-decorative-terrain-flora-grayscale.png` | `viewport-b2-transition-cutoff-1500-decorative-terrain-flora.png` |

Capture count: 10 color `#game canvas` captures, 10 grayscale variants, 10 HUD/context viewport captures, 1 contact sheet.

## Runtime Visual Verdict

The decorative terrain flora works better in-context than the current scannable flora because it behaves like habitat, not like a detached pickup. It is edge-oriented, partially embedded in rock, lower contrast, smaller, repeated, and palette-matched to the terrain band. In grayscale, the decorative stamps/fringes usually remain readable as ledge texture and cave growth because their value relationships follow the terrain rim and silhouette.

The scannable flora proves functional targetability, but its current read is heavier and more token-like. The scan reward text dominates several captures, and the sprites themselves sit at foreground scale with stronger color/value separation than the terrain. In B1, Glass Kelp reads as a bright isolated object beside a terrain wall rather than as growth rooted into the local shelf. In B2, Vent Coral has better context because two corals appear near the same wall, but the active scan label becomes the main readable element. In B3/B4, Crown Polyp and Oracle Polyp keep a distinctive silhouette, but the high chroma foreground sprite plus scan text makes them feel like quest objects more than environmental flora.

Target traits to carry forward from decorative flora:

- Root the silhouette into the terrain normal and let the base disappear under the rim/fringe.
- Use clustered/repeated forms instead of one centered specimen where the plant should read as habitat.
- Keep value contrast readable in grayscale, but avoid outline-like foreground contrast unless it is an active scan affordance.
- Let biome palette drive color: brine shelf flora should share the terrain's amber/black value structure, B3 should use muted purple/lumen accents, and B4 should be sparse cyan/violet against ruin darkness.
- Separate interaction affordance from base art: scanner arcs/pulses can identify a target without the plant itself needing to look like UI.

## Caveats

- The playtest API proves scannable state for the four scannable captures through `scanTarget` and captured scan completion text. It does not expose a direct "this visible decorative terrain prop is non-scannable" flag for every visible stamp. The strongest metadata evidence is the terrain stamp pool in `flora-runtime-proof.json`; visual evidence is in the canvas/contact sheet.
- `teleportToReachableDepth` did not always land at the requested decorative-only depth because it chooses reachable open water. The deeper B3/B4 band proof is therefore strongest in the scannable captures (`864m`, `1278m`), while decorative-only B3/B4 captures landed shallower (`492m`, `582m`).
- Existing repo dirt was present before this lane. I did not edit source, stage, or commit.

## Git Status After

```text
 M public/review/water9-progression-measurement.json
 M runs/water9-fauna-rarity-balance-2026-07-06/fauna-rarity-audit.json
 M src/helpers.ts
 M src/scene-sub.ts
 M tools/check_fauna_rarity_balance.mjs
 M tools/measure_progression.mjs
 M tools/test_progression_tuning_smoke.mjs
?? runs/water9-flora-style-guide-audit-2026-07-06.flora-inventory.prompt.md
?? runs/water9-flora-style-guide-audit-2026-07-06.flora-runtime-proof.prompt.md
?? runs/water9-flora-style-guide-audit-2026-07-06.flora-style-appraisal.prompt.md
?? runs/water9-flora-style-guide-audit-2026-07-06.md
?? runs/water9-flora-style-guide-audit-2026-07-06/
?? runs/water9-scan-reward-balance-audit-2026-07-06.formula-code-audit.prompt.md
?? runs/water9-scan-reward-balance-audit-2026-07-06.md
?? runs/water9-scan-reward-balance-audit-2026-07-06.progression-proposal.prompt.md
?? runs/water9-scan-reward-balance-audit-2026-07-06.roster-payout-audit.prompt.md
?? runs/water9-scan-reward-balance-audit-2026-07-06/
?? runs/water9-scan-reward-rebalance-2026-07-06.md
?? runs/water9-scan-reward-rebalance-2026-07-06.prompt.md
```

Only this lane's new runtime artifacts were written by me, all under `runs/water9-flora-style-guide-audit-2026-07-06/`.

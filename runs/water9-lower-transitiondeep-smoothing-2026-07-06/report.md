Status: DONE

Preflight HEAD: d4c863d

## Dirty-start classification and commit safety

Initial `git status --short`:

```text
 M public/assets/generated/fauna-abyss-viperfish-0.png
 M public/assets/generated/fauna-abyss-viperfish-1.png
 M public/assets/generated/fauna-abyss-viperfish-2.png
 M public/assets/generated/fauna-abyss-viperfish.frames.json
 M public/assets/generated/fauna-abyss-viperfish.png
 M runs/water9-fauna-animation-upgrade-2026-07-05.md
 M src/content.ts
 M src/helpers.ts
?? public/assets/generated/exploration-life-2026-07-04/alpha/fauna-abyss-viperfish-bespoke.png
?? public/assets/generated/exploration-life-2026-07-04/source/fauna-abyss-viperfish-bespoke-source-chroma.png
?? public/review/exploration-life-2026-07-04/fauna-abyss-viperfish-bespoke-final-alpha-preview.png
?? public/review/exploration-life-2026-07-04/fauna-abyss-viperfish-bespoke-key-preview.png
?? public/review/exploration-life-2026-07-04/runtime-animation-contact-sheet.png
?? public/review/exploration-life-2026-07-04/runtime-contact-sheet.png
?? runs/water9-b1-signature-landmark-restore-2026-07-06/report.md
?? runs/water9-biome-landmark-transition-audit-2026-07-06/
?? runs/water9-fauna-behavior-classes-2026-07-05.behavior-scout.prompt.md
?? runs/water9-fauna-behavior-classes-2026-07-05.md
?? runs/water9-fauna-behavior-classes-2026-07-05/
?? runs/water9-ore-anchor-b2-overlay-fix-2026-07-05.md
?? runs/water9-ore-anchor-b2-overlay-fix-2026-07-05.prompt.md
```

Pre-existing dirt was unrelated fauna/generated asset work, fauna run ledgers, `src/content.ts`, audit/B1 run ledgers, and a `src/helpers.ts` hunk that only renames/derives sprite sheet base lists for generated fauna content. That pre-existing `src/helpers.ts` hunk was left unstaged. Staging used explicit paths only plus partial staging for the assigned `src/helpers.ts` hunks.

## What changed

- `src/helpers.ts`
  - Added a lower -> `transitionDeep` visual blend window from 1360m to 1520m around the 1440m cutoff.
  - Kept the active semantic threshold at 1440m while blending profile colors, alpha metrics, and `activeBandBlend` progress through the window.
  - Rendered outgoing lower-band anchors with a fade-out ramp and incoming `transitionDeep` anchors with a fade-in ramp during the blend.
  - Capped incoming transition anchors during the blend to two visible anchors per viewport.
  - Preferred local biome transition pools first, with a visible fallback if the preferred local pick is offscreen.
  - Smoothed band plate visibility, `layerAlphaScale`, overlay alpha/density, and darkness multipliers through this cutoff.
- `src/scene-rendering.ts`
  - Smoothed terrain, terrain-edge, and ore-overburden alpha through the same blend progress instead of stepping at 1440m.
- `src/scene-playtest.ts`
  - Added proof metadata for lower-to-transitionDeep blend state, outgoing/incoming anchor counts, and per-anchor ramp role/alpha.
- `runs/water9-lower-transitiondeep-smoothing-2026-07-06/`
  - Added focused capture script, raw color/grayscale canvas captures, proof JSON, and contact sheet.

## Transition smoothing details

- Blend window: 1360m-1520m, centered on the existing 1440m lower -> `transitionDeep` cutoff.
- Ramp: smoothstep progress from 0 to 1 across the window.
- Outgoing lower anchors: rendered from the lower-band pool with alpha `1 - progress`.
- Incoming transition anchors: rendered from the `transitionDeep` pool with alpha `progress`.
- Incoming cap: max 2 visible incoming transition anchors per viewport during the blend.
- Post-blend: normal `transitionDeep` behavior resumes at progress 1, so the cap only applies to the cutoff smoothing window.

## Proof paths and capture notes

- Proof JSON: `runs/water9-lower-transitiondeep-smoothing-2026-07-06/lower-transitiondeep-smoothing-proof.json`
- Contact sheet: `runs/water9-lower-transitiondeep-smoothing-2026-07-06/lower-transitiondeep-smoothing-contact-sheet.png`
- Capture script: `runs/water9-lower-transitiondeep-smoothing-2026-07-06/capture-transitiondeep-smoothing.mjs`
- Raw color/grayscale `#game canvas` captures:
  - B2: `b2-1340m-*`, `b2-1380m-*`, `b2-1440m-*`, `b2-1500m-*`, `b2-1560m-*`
  - B3: `b3-1340m-*`, `b3-1380m-*`, `b3-1440m-*`, `b3-1500m-*`, `b3-1560m-*`
  - B4: `b4-1340m-*`, `b4-1380m-*`, `b4-1440m-*`, `b4-1500m-*`, `b4-1560m-*`

The proof uses Playwright against the live runtime `#game canvas` with `?playtest=1&biome=<n>&renderer=canvas` and the existing `backgroundReview` playtest command. It stages exact cutoff depths: 1340m lower before blend, 1380m blend entry, 1440m cutoff/mid-blend, 1500m late blend, and 1560m transition after blend.

Final proof metadata summary:

```text
runtimeErrors 0
B2 in-blend: outgoing=1, incoming=2, incoming asset phase11-transition-near-pipe-cable-cathedral
B3 in-blend: outgoing=1, incoming=2, incoming asset phase11-transition-far-drowned-signal-station
B4 in-blend: outgoing=1, incoming=2, incoming assets biome-ruins-vault-causeway-lattice / phase10-transition-drowned-signal-station
blendAssertionFailures 0
```

## Manager visual acceptance notes to check

- B2 should no longer snap from one brine shelf into a seven-anchor industrial collage at 1440m; the shelf persists while one sparse transition silhouette fades in.
- B3 should keep the black-coral identity during the cutoff while a single far transition station/rib form fades in.
- B4 should keep the vault/causeway read through the cutoff, with transition structure appearing gradually rather than replacing it.
- Grayscale contact sheet should show no sudden value-wall or full collage inside the 1380m/1440m/1500m blend captures.

## Verification commands and results

```text
git -C /mnt/nxt-dev/water9 rev-parse --short HEAD
-> d4c863d

npm run build
-> passed; Vite emitted existing unresolved /assets/generated/*.png runtime URL warnings and the existing >500kB chunk warning.

npm run dev -- --port 5180 --strictPort
PLAYTEST_URL=http://localhost:5180/ node runs/water9-lower-transitiondeep-smoothing-2026-07-06/capture-transitiondeep-smoothing.mjs
-> passed; 15 color captures, 15 grayscale captures, proof JSON, contact sheet; runtimeErrors=0.

for p in $(seq 5180 5199); do ss -ltn "sport = :$p"; done
-> no listeners remained after stopping the 5180 Vite server.
```

## Commit

Commit hash: 0ef046b

## Caveats/blockers

- This is intentionally not full biome-travel seed persistence. It fixes the lower -> `transitionDeep` visual cutoff by blending visual state and anchor sets at the cutoff.
- After the 1520m blend end, normal `transitionDeep` anchor density can return. The cap is scoped to the smoothing window only.
- The repo still contains unrelated pre-existing dirty fauna/content/helper work outside this slice.

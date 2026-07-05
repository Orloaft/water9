# Water9 Fauna Animation Appraisal: Live Canvas Lane

## Summary Verdict

Complete with caveats. Live normal-play `#game canvas` proof shows the established neutral benchmarks still read better at gameplay scale: Nautilus, Reef Squid, Glass Squid, and Abyss Vampire Squid keep distinct silhouettes in color and grayscale. The new `fauna-exp-*` entries are present in runtime and animate, but many rely on tiny frame deltas; at gameplay scale they often read as sliding sprites with stiff bodies, and several dark or thin species collapse in grayscale.

## Capture Method

- Repo/head: `/mnt/nxt-dev/water9` at `d7aed9a`.
- Server: `npm run dev -- --port 5180 --strictPort` on `http://127.0.0.1:5180/`.
- Route: normal game scene, `?playtest=1&renderer=canvas&debug=1&biome=N`; sandbox/review pages were not used for acceptance proof.
- Hooks: dev playtest API used only to start/dive, set biome/depth, clear blocking overlays, and collect snapshots/seeds. Corrected b1/b2 supplements export the true canvas bitmap via `#game canvas.toDataURL()`; matching `*-runtime.png` screenshots preserve HUD/depth/player context.
- Coverage: primary sweep across b1 620/900/1260m, b2 760/1120/1540m, b3 820/1320/1860m, b4 900/1580/2180m; corrected b1/b2 subject passes for Nautilus/Reef Squid/Glass Squid and nearby new fauna.

## Initial Repo State

Initial `git status --short` showed pre-existing dirty fauna work: modified `src/content.ts`, `src/helpers.ts`, `public/assets/generated/fauna-abyss-viperfish*`, and `small-life.manifest.json`; many untracked `public/assets/generated/fauna-exp-*` frame/manifest/atlas files, review images, `tools/build_exploration_fauna_runtime_assets.py`, and pre-existing run files. I treated all of that as user/other-worker work and did not revert or edit it.

## Benchmark Observations From Live Canvas

- Nautilus: best shallow benchmark in the sheet. Shell shape remains recognizable in grayscale, and frame motion reads as a creature rather than a plain translation.
- Reef Squid: clear squid silhouette and good facing/readability beside the player lamp. Motion feels more coherent than most new small fish.
- Glass Squid: readable mid-depth benchmark; body/appendage silhouette survives grayscale better than the thin new eels and small schooling fish.
- Abyss Vampire Squid: remains readable at deeper scale, though darker than the shallow/mid benchmarks.

## New-Fauna Observations From Live Canvas

- Surface/shallow: Kelp Arrow Squid is one of the better new entries because its squid shape remains legible near the Reef Squid benchmark. Blue Lantern Goby, Silver Hinge Crab, Brightscale Halfbeak, Lumeneye Squirrelfish, Tideglass Cardinal, and Amber Snout Boxfish are visible but their animation reads mostly as sprite translation at gameplay scale.
- Mid/deep: Glass Helm Nautilus and Moonmask Lionfish hold shape well. Copper Ribbon Eel, Blackwater Hatchet, and Cyan Pulse Lanternfish lose contrast quickly; Saffron Paddle Cuttle is identifiable but frame motion is subtle compared with the benchmark squid/cuttle-like read.
- Abyss/deeper: Glassjaw Viperfish, Saberfin Smelt, Anchorfin Eel, and related b3/b4 new entries appear in normal runtime captures. The stronger issue is readability: dark, narrow bodies are hard to separate from terrain/water in grayscale, and low-amplitude animation makes them feel stiff.

## Named Visual Failures

- Stiffness / sliding: several `fauna-exp-*` entries move across the screen while their body frame changes are very small. The frame-diff metrics in `live-canvas-selection.json` show low median luma deltas for Blue Lantern Goby, Ivory Spined Cardinal, Saberfin Smelt, and Saffron Paddle Cuttle.
- Low grayscale readability: Blackwater Hatchet, Brightscale Halfbeak, Tideglass Cardinal, Saberfin Smelt, and eel-like forms are close to background values in the grayscale sheet.
- Movement-pattern mismatch: circle/glide subjects such as Kelp Arrow Squid, Copper Ribbon Eel, and Saffron Paddle Cuttle show path motion more clearly than internal swimming motion.
- Scale/facing risk: small school fish and thin-body new fauna are often too small to judge frame craft at the player camera scale.
- Capture caveat: corrected clean-canvas bitmap export is strongest for biomes 1 and 2. The deeper b3/b4 evidence is still live runtime proof from the primary/supplemental sweeps, but later clean reruns for b3/b4 hit fish-roster wait timeouts.

## Proof Paths

- Color contact sheet: `/mnt/nxt-dev/water9/runs/water9-fauna-animation-appraisal-2026-07-05/live-canvas-captures/live-contact-sheet-color.png`
- Grayscale contact sheet: `/mnt/nxt-dev/water9/runs/water9-fauna-animation-appraisal-2026-07-05/live-canvas-captures/live-contact-sheet-grayscale.png`
- Machine summary: `/mnt/nxt-dev/water9/runs/water9-fauna-animation-appraisal-2026-07-05/live-canvas-summary.json`
- Selection/crops/metrics: `/mnt/nxt-dev/water9/runs/water9-fauna-animation-appraisal-2026-07-05/live-canvas-selection.json`
- Raw full sweep metadata: `/mnt/nxt-dev/water9/runs/water9-fauna-animation-appraisal-2026-07-05/live-canvas-raw.json`
- Corrected b1 metadata: `/mnt/nxt-dev/water9/runs/water9-fauna-animation-appraisal-2026-07-05/live-canvas-supplemental-b1-fixed.json`
- Corrected b2 metadata: `/mnt/nxt-dev/water9/runs/water9-fauna-animation-appraisal-2026-07-05/live-canvas-supplemental-b2-fixed.json`
- Deeper supplemental metadata: `/mnt/nxt-dev/water9/runs/water9-fauna-animation-appraisal-2026-07-05/live-canvas-supplemental.json`
- Representative sequences: `live-canvas-captures/supp-b1-fauna-shallow-nautilus-d262-f00..f07-canvas.png`, `supp-b1-fauna-exp-kelp-arrow-squid-d318-f00..f07-canvas.png`, `supp-b2-fauna-deep-glass-squid-d386-f00..f07-canvas.png`, `b3-abyss-exp-d1320-f00..f07-canvas.png`, `b4-deeper-exp-d900-f00..f07-canvas.png`.
- Matching HUD/runtime context screenshots use the same basenames with `-runtime.png`.

## Confidence And Caveats

Confidence: medium-high for b1/b2 benchmark-vs-new appraisal, medium for b3/b4 because the proof is live runtime but less cleanly re-exported. I would not accept the whole new fauna batch on animation quality yet; the strongest next fix is to increase visible per-frame deformation and grayscale contrast for the small/thin `fauna-exp-*` entries.

## Verification Performed

- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`
- `git -C /mnt/nxt-dev/water9 status --short`
- `npm run dev -- --port 5180 --strictPort`
- `WATER9_URL=http://127.0.0.1:5180/ node runs/water9-fauna-animation-appraisal-2026-07-05/live-canvas-capture.mjs`
- `WATER9_URL=http://127.0.0.1:5180/ node runs/water9-fauna-animation-appraisal-2026-07-05/live-canvas-supplemental.mjs`
- `WATER9_URL=http://127.0.0.1:5180/ SUPP_BIOMES=1 SUPP_SUFFIX=-b1-fixed node runs/water9-fauna-animation-appraisal-2026-07-05/live-canvas-supplemental.mjs`
- `WATER9_URL=http://127.0.0.1:5180/ SUPP_BIOMES=2 SUPP_SUFFIX=-b2-fixed node runs/water9-fauna-animation-appraisal-2026-07-05/live-canvas-supplemental.mjs`
- `python3 runs/water9-fauna-animation-appraisal-2026-07-05/build-live-contact-sheets.py`

## Git State After Investigation

After investigation, `git status --short` still shows the same pre-existing fauna source/asset dirt plus the run artifact directory `runs/water9-fauna-animation-appraisal-2026-07-05/`. No source/assets/config/package/test files were edited by this lane; only report/JSON/scripts/screenshots/crops/contact sheets under the run directory were written.

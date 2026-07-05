# Water9 Biome 1 Organic Landmark Replacement - 2026-07-04

## Result

- Status: PASS.
- HEAD: `7776913`.
- Commit: none. I did not commit because the repo started with broad dirty tracked files and untracked generated asset/tool/run directories; `src/helpers.ts` and the background manifest both already sat inside that dirty workspace, so committing would not create a clean boundary for only this task.
- Build result: `npm run build` passed. Vite repeated the existing unresolved `/assets/generated/...` runtime URL warnings and the existing large chunk warning.
- Proof port: `5180`.
- Server cleanup status: the proof Vite server was SIGTERM'd by the capture script; `ss -ltnp` showed no listeners on ports `5180-5199` afterward.

## Dirty Status

- Before: repo was already dirty. Tracked modifications were present in `package.json`, `src/helpers.ts`, `src/hud.ts`, `src/scene-playtest.ts`, `src/scene-rendering.ts`, `src/scene.ts`, `src/styles.css`, and `src/types.ts`, with many untracked generated asset/tool/run directories from previous passes.
- After: repo remains dirty by design. This pass added/updated B1 organic background assets, the background manifest, `src/helpers.ts`, `tools/build_biome1_organic_shallow_background.py`, and this run directory. No reset, checkout, clean, broad revert, broad add, or staging was used.

## Root Cause

- The previous pass removed the flat shell-arch placeholder but routed B1 normal upper/mid/lower gameplay through Phase 11 transition bitmap band/landmark assets.
- Those Phase 11 assets rendered visible circular hatch/porthole forms, rectangular linework, and industrial station/gantry silhouettes, which are explicitly blacklisted for B1.

## Changed Files

- `src/helpers.ts`: B1 normal/transition-deep background routing now uses B1 organic bitmap IDs only: `biome1-organic-shallow-reef-band` for band plates and `biome-shallows-organic-reef-shelf` for anchored distant scenery. B1 no longer pulls Phase 11 transition assets for these bands.
- `tools/build_biome1_organic_shallow_background.py`: deterministic builder that composites existing shallow painterly/parallax sources into the B1 organic band plate and transparent reef shelf landmark.
- `public/assets/generated/background-phase3/background-phase3.manifest.json`: added the two B1 organic bitmap manifest entries.
- `public/assets/generated/background-phase3/water9-biome1-organic-shallow-reef-band.png`: live bitmap band plate.
- `public/assets/generated/background-phase3/water9-biome-landmark-shallows-organic-reef-shelf.png`: live transparent organic reef/overhang shelf bitmap.
- `runs/water9-biome1-organic-landmark-replacement-2026-07-04/*`: proof script, report, asset previews, normal gameplay color/grayscale captures, contact sheet, and proof JSON.

## Proof

- Combined color/grayscale contact sheet: `runs/water9-biome1-organic-landmark-replacement-2026-07-04/water9-biome1-organic-landmark-replacement-contact-sheet.png`
- Proof metadata: `runs/water9-biome1-organic-landmark-replacement-2026-07-04/water9-biome1-organic-landmark-replacement-proof.json`
- B1 surface/shallow color: `runs/water9-biome1-organic-landmark-replacement-2026-07-04/water9-b1-surface-shallow-depth119-normal-gameplay-canvas.png`
- B1 surface/shallow grayscale: `runs/water9-biome1-organic-landmark-replacement-2026-07-04/water9-b1-surface-shallow-depth119-normal-gameplay-canvas-grayscale.png`
- B1 upper/shallow-adjacent color: `runs/water9-biome1-organic-landmark-replacement-2026-07-04/water9-b1-upper-shallow-adjacent-depth180-normal-gameplay-canvas.png`
- B1 upper/shallow-adjacent grayscale: `runs/water9-biome1-organic-landmark-replacement-2026-07-04/water9-b1-upper-shallow-adjacent-depth180-normal-gameplay-canvas-grayscale.png`
- B2-B4 preservation captures: `water9-b2-preserve-mid-depth760-*`, `water9-b3-preserve-lower-depth1260-*`, and `water9-b4-preserve-lower-depth1260-*` in this run directory.

Runtime metadata in the proof JSON shows B1 loaded:

- Anchor asset: `biome-shallows-organic-reef-shelf`
- Rendered anchor texture: `water9-biome-landmark-shallows-organic-reef-shelf`
- Layer texture: `water9-biome1-organic-shallow-reef-band`
- B1 forbidden runtime texture summary: `true` for no `phase11-`, no `shell-survey`, and no `reef-arch` texture IDs in B1 layers or rendered anchors.

## Visual Verdict

- Flat shell arches: none visible in B1 proof.
- Circular hatches/pads/portholes/rings: none visible in B1 proof.
- Rectangular panels/frames/windows/hard right-angle linework: none visible in B1 proof.
- Industrial/wreck silhouettes: none visible in B1 proof.
- Visual read: B1 is now a quiet hazy shallow reef/overhang shelf background using live bitmap textures from the runtime, not procedural primitive stand-ins.
- Controller debug UI: absent over the sonar map in proof captures; proof DOM probe did not find the disconnected-controller overlay text.
- ESC menu `+1k credits` testing button: still present in `src/hud.ts` (`data-gold`, label `+1k credits`).

## Caveats

- The proof script uses normal `?playtest=1&biome=` gameplay pages and captures `#game canvas`, but it uses playtest teleport commands to position the player. Requested B1 depths 119/180 m captured at runtime-reported 174/270 m, matching the earlier proof-script depth offset pattern.
- B2-B4 were preserved through shared manifest/rendering changes and captured in the same contact sheet. B3/B4 still use their existing deeper Phase 11 transition assets by design; the Phase 11 removal here is B1-specific.
- The repo remains dirty and uncommitted to preserve unrelated pre-existing work.

## Forbidden Shape Verdict

- Flat shell arches: NO.
- Circular hatches/pads/portholes/rings: NO.
- Rectangular panels/frames/windows/hard right-angle linework: NO.
- Industrial/wreck silhouettes: NO.

# Water9 Biome 1 Procedural Landmark Removal - 2026-07-04

## Result

- Status: FAIL.
- HEAD: `7776913`.
- Commit: none. I did not commit because the repo started with broad dirty/untracked work from earlier background runs and the prior worker's implementation edits; staging that safely would require a separate explicit commit boundary.
- Build: `npm run build` passed. Vite emitted the existing unresolved `/assets/generated/...` runtime URL warnings and the existing large chunk warning.
- Proof port: final combined proof metadata reports `http://127.0.0.1:5181/`, which is inside the Water9 allowed range `5180-5199`. I verified no Water9 proof/dev server remained listening after proof.

## Dirty Status

- Before: repo was already dirty. Modified tracked files included `package.json`, `src/helpers.ts`, `src/hud.ts`, `src/scene-playtest.ts`, `src/scene-rendering.ts`, `src/scene.ts`, `src/styles.css`, and `src/types.ts`; many generated asset, tool, and run directories were also untracked.
- After: still dirty by design. Same broad pre-existing work remains, with this task's report/proof files under `runs/water9-biome1-procedural-landmark-removal-2026-07-04/` updated. No reset, checkout, clean, or broad revert was used.

## Root Cause

- The stalled runtime path had moved backgrounds toward image-backed `environmentVisualProfileFor` / `environmentAnchorSilhouettesFor`, but biome 1 normal bands could still merge generic Phase 3 landmark cutouts through `painterlyLandmarksForBand`.
- That meant the rejected shell/arch/circle/rectangular landmark family remained reachable by normal B1 landmark selection instead of making B1 normal gameplay strictly use generated bitmap distant background art.

## Changed Files

- `src/helpers.ts`: added the final B1-only guard in `environmentAnchorSilhouettesFor` so biome 1 non-transition bands use only `normalBiomePhase11Landmarks` as landmark candidates. This excludes the rejected B1 shell-survey terrace and generic Phase 3 arch/cutout landmarks from normal B1 runtime selection.
- `runs/water9-biome1-procedural-landmark-removal-2026-07-04/report.md`: completed this report.
- `runs/water9-biome1-procedural-landmark-removal-2026-07-04/*`: regenerated normal gameplay proof PNG/HTML/JSON artifacts.

Prior worker edits in `package.json`, `src/hud.ts`, `src/scene-playtest.ts`, `src/scene-rendering.ts`, `src/scene.ts`, `src/styles.css`, `src/types.ts`, and generated background assets were preserved.

## Proof

- Combined B1-B4 color/grayscale contact sheet: `runs/water9-biome1-procedural-landmark-removal-2026-07-04/water9-biome1-procedural-landmark-removal-contact-sheet.png`
- Combined proof metadata: `runs/water9-biome1-procedural-landmark-removal-2026-07-04/water9-biome1-procedural-landmark-removal-proof.json`
- B1 shallow color: `runs/water9-biome1-procedural-landmark-removal-2026-07-04/water9-b1-shallow-depth119-normal-gameplay-canvas.png`
- B1 shallow grayscale: `runs/water9-biome1-procedural-landmark-removal-2026-07-04/water9-b1-shallow-depth119-normal-gameplay-canvas-grayscale.png`
- B1 upper color: `runs/water9-biome1-procedural-landmark-removal-2026-07-04/water9-b1-upper-depth180-normal-gameplay-canvas.png`
- B1 upper grayscale: `runs/water9-biome1-procedural-landmark-removal-2026-07-04/water9-b1-upper-depth180-normal-gameplay-canvas-grayscale.png`
- B2 preservation color/grayscale: `water9-b2-preserve-mid-depth760-normal-gameplay-canvas.png`, `water9-b2-preserve-mid-depth760-normal-gameplay-canvas-grayscale.png`
- B3 preservation color/grayscale: `water9-b3-preserve-lower-depth1260-normal-gameplay-canvas.png`, `water9-b3-preserve-lower-depth1260-normal-gameplay-canvas-grayscale.png`
- B4 preservation color/grayscale: `water9-b4-preserve-lower-depth1260-normal-gameplay-canvas.png`, `water9-b4-preserve-lower-depth1260-normal-gameplay-canvas-grayscale.png`

Runtime metadata in the combined proof:

- B1 shallow rendered bitmap textures: `water9-phase11-transition-far-drowned-signal-station-gpt`, `water9-phase11-transition-mid-collapsed-gantry-brine-reef-gpt`.
- B1 upper rendered bitmap textures: `water9-phase11-transition-far-drowned-signal-station-gpt`, `water9-phase11-transition-mid-collapsed-gantry-brine-reef-gpt`.
- B2 preservation rendered bitmap texture: `water9-biome-landmark-brine-shelf-gpt`.
- B4 preservation rendered bitmap textures: `water9-biome-landmark-ruins-vault-causeway-lattice`, `water9-phase11-transition-far-drowned-signal-station-gpt`.
- B3 combined-row anchors were present but offscreen for that random proof seed; the isolated B3 proof `water9-biome1-procedural-landmark-removal-proof-b3-preserve-lower-depth1260.json` records rendered texture `water9-phase11-transition-far-drowned-signal-station-gpt`.

## Visual Acceptance

- Rejected flat shell arches: the old flat procedural shell-arch composition is no longer the B1 runtime selection.
- Rejected oval/circular pads: NOT ACCEPTED. The B1 proof still has prominent generated circular hatch/porthole forms in the distant background.
- Rejected rectangular linework/frame: NOT ACCEPTED. The B1 proof still has prominent generated rectangular/industrial linework in the distant background.
- B1 normal gameplay now loads generated bitmap distant background art, with live runtime texture keys proving Phase 11 GPT bitmap assets are loaded, but the resulting visual still overlaps Alex's named rejection enough that manager acceptance is FAIL.
- Controller debug UI remains absent over the sonar map in the proof captures.
- ESC menu `+1k credits` testing button remains in the preserved prior worker HUD edit.

## Caveats

- The proof script teleports to reachable water, so requested labels and actual captured depths differ in the generated map: B1 requested 119/180 m captured at 174/270 m; B2 requested 760 m captured at 1140 m; B3/B4 requested 1260 m captured at 1890 m. The screenshots are still actual normal gameplay `#game canvas` captures, not review harness captures.
- Earlier proof attempts started Water9-owned Vite on forbidden port `5277`. I stopped those `5277` capture/server processes; those images are invalid as acceptance evidence. The proof paths listed above were regenerated/combined from an allowed-port run reporting `5181`.
- The repo remains dirty and uncommitted to avoid sweeping unrelated/pre-existing work into this task.

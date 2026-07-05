Status: read-only scout complete

Preflight:

```text
$ git -C /mnt/nxt-dev/water9 rev-parse --short HEAD
7776913

$ pwd
/mnt/nxt-dev/water9

$ git rev-parse --show-toplevel
/mnt/nxt-dev/water9

$ date -Is
2026-07-04T21:37:56-04:00

$ ss scan, ports 5180-5199 before capture
<no listeners printed>
```

Current dirty status summary:

- Tracked modified: `package.json`, `src/helpers.ts`, `src/hud.ts`, `src/scene-playtest.ts`, `src/scene-rendering.ts`, `src/scene.ts`, `src/styles.css`, `src/types.ts`.
- Many untracked prior run artifact directories and generated asset/tool files are present.
- This scout added only untracked proof/report artifacts under `runs/water9-mining-polish-landmark-fps-2026-07-04/`.

Relevant running port:

- Selected proof port: `5180`.
- Post-run `ss` scan of `5180-5199`: no listeners printed.

B1 landmark finding: present in runtime metadata, visually missing/washed out in normal play.

- Proof JSON: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/landmark-fps-proof.json`
- Contact sheet: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/landmark-fps-contact-sheet.png`
- B1 upper, water off: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/b1-upper-180-water-off-normal-canvas.png`
- B1 upper, water on: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/b1-upper-180-water-on-normal-canvas.png`
- B1 upper, water on grayscale: `/mnt/nxt-dev/water9/runs/water9-mining-polish-landmark-fps-2026-07-04/b1-upper-180-water-on-normal-canvas-grayscale.png`

Runtime says the landmark is being created: the B1 upper normal capture has 4 rendered `water9-biome-landmark-shallows-organic-reef-shelf` anchors with sprite alphas `0.266`, `0.197`, `0.159`, `0.165`. Their screen bounds are enormous, roughly `1390-1974px` wide, so the asset reads as a faint full-screen wash rather than a discrete distant landmark. In the actual `#game canvas` captures, the landmark is not recognizable even with the water column disabled, and the enabled water-column pass further covers it with broad bands.

One additional routing issue: exact surface-band B1 has no landmark by construction (`biomeLandmarkPools[1].surface = []`, and `normalBiome1OrganicBands` excludes `surface`). My normal-play target at 119 m drifted to the upper band before capture, so the run did show anchors; at exact `<120 m`, the code path would show none.

FPS/seam finding:

- Verification command: `node runs/water9-mining-polish-landmark-fps-2026-07-04/capture-landmark-fps.mjs`
- Same B1 upper normal scene, same page, raw `requestAnimationFrame` smoke:
- `water-off`: 71 frames, `25.59 ms` average frame, `33.4 ms` p95, about `39.1 fps` average.
- `water-on`: 47 frames, `38.3 ms` average frame, `50.1 ms` p95, about `26.1 fps` average.
- This is a headless canvas smoke, not a hardware benchmark, but the relative drop is large in the reported scene.

Visible seam/tiling interpretation:

- I did not find a classic scenic `repeatY` violation in playtest metadata; B1 scenic layers report `scenicRepeatYViolation: false`.
- The visible failure in the water-on grayscale is horizontal banding/striping over the whole B1 upper view. The exact source is the shallow `drawWaterColumnVolumeGraphics` path plus four water-column tile sprites (`upper-broad-fog-mottle`, `upper-sediment-flecks`, `upper-plankton-speckle`, `upper-soft-caustic-ribbons`) rendered in front of the B1 landmark.
- The B1 organic landmark source itself is also low-contrast: manifest alpha stats say `transparentPixels: 44800`, `semiTransparentPixels: 620800`, `opaquePixels: 0`; a local alpha audit found fully transparent source rows `244-278`. That is not necessarily a tile repeat seam, but it contributes to the landmark reading as layered horizontal haze rather than a solid landmark silhouette.

Likely root cause and files/functions:

- `src/scene-rendering.ts:34-35`: `draw()` renders `drawParallax()` first, then `drawWaterColumn()`.
- `src/scene-rendering.ts:404-439`: `drawBackgroundAnchors()` creates B1 landmark sprites at depth `-7.3`.
- `src/scene-rendering.ts:257-302`: `drawWaterColumn()` sets `parallaxBackdrop` to depth `-6.79` and water-column tile sprites to `-6.76 + i * 0.03`, so water atmosphere renders in front of the already-faint landmark.
- `src/scene-rendering.ts:304-400`: `drawWaterColumnVolumeGraphics()` draws the shallow B1 per-frame mottle/ribbon/particle graphics that are visible as broad horizontal bands.
- `src/helpers.ts:602-604`, `src/helpers.ts:606-621`, `src/helpers.ts:770-778`: B1 organic landmark routing excludes the `surface` band and only starts at `upper`.
- `src/helpers.ts:1550-1664`: B1 biome-landmark sizing/alpha creates very large anchors with low effective contrast.
- `public/assets/generated/background-phase3/background-phase3.manifest.json:460-495`: B1 landmark asset is all semi-transparent/transparent and has `safeOpacity: 0.2`.

Recommended implementation checklist:

1. Put the B1 landmark back in front of the background water haze, or split the water column into behind-anchor haze and only very subtle foreground particulate. Minimal test: make B1 upper water-column depths lower than `-7.3`, or render anchors after the water-column background pass.
2. Rebuild or retune `water9-biome-landmark-shallows-organic-reef-shelf.png` so it has a readable distant silhouette, not a mostly transparent full-rect wash. Remove/feather the mid alpha gap if it remains visible after depth-order fixes.
3. Reframe B1 landmark placement so normal play gets one readable distant landmark instead of several huge overlapping low-alpha sheets. Consider increasing B1 spacing, shrinking the authored width multiplier, and raising alpha only after the source art is cleaned up.
4. If Alex expects the landmark in very shallow B1, include a surface-band B1 landmark path or lower the band threshold/routing so `<120 m` is not blank by design.
5. Add `measurePerf(this, 'draw.waterColumn', ...)` around the water-column path, then reduce shallow graphics counts or cache the procedural haze to a reusable texture/render texture. The smoke implicates the new water-column draw path as the FPS drop.
6. Reduce the straight full-width shallow ribbons in `drawWaterColumnVolumeGraphics`; use softer, lower-alpha nonparallel haze so the effect does not read as horizontal seams.

Caveats/blockers:

- Read-only scout only. No source edits, no staging, no commit.
- The FPS numbers are from headless Chromium/canvas renderer; use them as relative evidence, not final hardware telemetry.
- The capture uses playtest commands to position the player, then captures actual normal `#game canvas` frames without `backgroundReview` terrain clearing.

# Environment Rework

Water9 now separates environment collision from environment presentation.

The terrain grid remains the collision, mining, and sonar substrate. The visible
environment adds source-sheet-derived object props for cave edges, ore clusters,
wall flora, and cave hazards. This moves the read away from colored square
mining tiles and toward dark continuous cave walls with attached resources.

## Current Implementation

- Collision and mining still use `Tile` cells.
- Ore cells render as host rock through `tileTextureKey`, then receive an
  `EnvironmentProp` mineral cluster overlay.
- Rock edge props are generated from water-adjacent solid cells in worldgen and
  are denser/larger than the old decal pass.
- Flora uses species-specific environment sprite keys instead of four generic
  shallow/deep sprites.
- Preview: `/review/environment-rework-preview.html`.
- Asset builder: `npm run assets:environment-rework`.
- Source manifest:
  `public/assets/source/environment-cave-wall-source-manifest.json`.
- Imagegen/manual capture target:
  `tools/source-inbox/environment-cave-wall-source.png`.
- Handoff instructions:
  `tools/source-inbox/ENVIRONMENT_HANDOFF.md`.

## Source Sheet Lane

`npm run assets:environment-rework` prefers an Imagegen/manual-capture sheet at
`tools/source-inbox/environment-cave-wall-source.png`. If that file is absent,
it builds a marked fallback source sheet at
`public/assets/source/environment-cave-wall-source-fallback.png`, copies the
active source to `public/assets/source/environment-cave-wall-source-current.png`,
then slices every environment runtime PNG from the same 5x6 source grid.

This keeps environment art on the same source-first path as creature art:
generate or capture one coherent sheet, validate it visually, then slice it into
runtime props. The fallback is a committed implementation artifact, not the final
human-approved art target.

## Visual Target

- Large irregular cave silhouettes should dominate over tile repetition.
- Minerals should read as deposits attached to rock faces, not as colored blocks.
- Flora should read as specific cave organisms with unique silhouettes.
- Hazard flora and rare cave features should look integrated into the cave wall.

## Next Art Pass

Replace the fallback source sheet with a captured/approved Imagegen sheet at the
inbox path, rerun `npm run assets:environment-rework`, and inspect the preview.
The runtime filenames stay stable, so the art can improve without code churn.

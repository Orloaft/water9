# Environment Rework

Water9 now separates environment collision from environment presentation.

The terrain grid remains the collision, mining, and sonar substrate. The visible
environment adds object-layer props for cave edges and ore clusters, plus
species-specific flora sprites. This moves the read away from colored square
mining tiles and toward Barotrauma-style cave walls with attached resources.

## Current Implementation

- Collision and mining still use `Tile` cells.
- Ore cells render as host rock through `tileTextureKey`, then receive an
  `EnvironmentProp` mineral cluster overlay.
- Rock edge props are generated from water-adjacent solid cells in worldgen.
- Flora uses species-specific environment sprite keys instead of four generic
  shallow/deep sprites.
- Preview: `/review/environment-rework-preview.html`.
- Asset builder: `npm run assets:environment-rework`.

## Visual Target

- Large irregular cave silhouettes should dominate over tile repetition.
- Minerals should read as deposits attached to rock faces, not as colored blocks.
- Flora should read as specific cave organisms with unique silhouettes.
- Hazard flora and rare cave features should look integrated into the cave wall.

## Next Art Pass

The included assets are deterministic project-local sprites. They establish the
runtime architecture and art direction, but the final production pass should
replace the deterministic sprites with approved Imagegen cutouts using the same
asset names and dimensions.

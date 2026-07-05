# Water9 Phase 11 Normal Entry Patch Proof

Actual #game canvas captures were taken at 1280x800 for biome 1 and biome 2 at depths 119, 120, 160, and 220.

| Biome | Depth | Band | Phase 11 anchors | Alpha min | Alpha max | Max left offscreen fraction | Max top offscreen fraction |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 119 | surface | 0 | 0 | 0 |  |  |
| 1 | 120 | upper | 7 | 0 | 0 | 0.086 | 0 |
| 1 | 160 | upper | 7 | 0.062 | 0.121 | 0.086 | 0 |
| 1 | 220 | upper | 7 | 0.207 | 0.401 | 0.086 | 0 |
| 2 | 119 | surface | 0 | 0 | 0 |  |  |
| 2 | 120 | upper | 7 | 0 | 0 | 0.077 | 0 |
| 2 | 160 | upper | 7 | 0.061 | 0.14 | 0.077 | 0 |
| 2 | 220 | upper | 7 | 0.202 | 0.464 | 0.077 | 0 |

Transition-deep control: biome 3 depth 1500 remains active band transitionDeep with 6 Phase 11 anchors; the implementation gates placement/ramp on normalPhase11Asset, so transition-deep authored framing is not globally reframed.

## Screenshots

- /mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome1-depth119-canvas.png
- /mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome1-depth120-canvas.png
- /mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome1-depth160-canvas.png
- /mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome1-depth220-canvas.png
- /mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome2-depth119-canvas.png
- /mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome2-depth120-canvas.png
- /mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome2-depth160-canvas.png
- /mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome2-depth220-canvas.png

## Artifacts

- /mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/phase11-normal-entry-metrics.json
- /mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/phase11-normal-entry-patch-report.md

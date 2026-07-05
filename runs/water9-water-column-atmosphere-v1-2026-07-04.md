# Water9 Water Column Atmosphere V1 - 2026-07-04

Goal: implement the first water-visual improvement slice from the research proposal: a live water-column atmosphere pass that makes Water9's water read as layered volume during normal play.

Repo: `/mnt/nxt-dev/water9`

Preflight required in worker prompt:
"Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else."

Current manager preflight: `7776913`

Spawned worker:
- taskName: `water-column-atmosphere-v1-impl`
- childSessionKey: `agent:mgr-water9:subagent:12b94dfa-78c8-41c1-b86a-9c04fa8de340`
- runId: `2ab5f575-f8d4-4131-9537-1071bc87d4e9`

Spawned revision worker:
- taskName: `water-column-atmosphere-v1-revision1`
- childSessionKey: `agent:mgr-water9:subagent:f888c967-38c5-4387-a439-ac5f81aa7b46`
- runId: `0c40c5c0-02c3-4a7d-bba9-185aa2d54839`

Revision continuation:
- taskName: `water-column-atmosphere-v1-revision2`
- childSessionKey: `agent:mgr-water9:subagent:f888c967-38c5-4387-a439-ac5f81aa7b46`
- note: same active revision worker, continued after manager rejection of `proof-revision1/contact-sheet.png`

## Checklist

- [x] `water-column-atmosphere-v1-impl` — implement live water-column atmosphere and write early report stub — expected artifacts:
  - `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/report.md`
  - `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof/`
  - `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof/provenance.json`
  - `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof/contact-sheet.png`
  - build output recorded in report
- [x] `water-column-atmosphere-v1-revision1` — fix manager rejection from pass 1 — expected artifacts:
  - `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/report-revision1.md`
  - `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof-revision1/`
  - `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof-revision1/provenance.json`
  - `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof-revision1/contact-sheet.png`
  - build output recorded in revision report
- [x] `water-column-atmosphere-v1-revision2` — continue same worker after manager visual rejection of revision1 — expected artifacts:
  - `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/report-revision2.md`
  - `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof-revision2/`
  - `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof-revision2/provenance.json`
  - `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof-revision2/contact-sheet.png`
  - build output recorded in revision2 report

## Iteration Notes

- 2026-07-04 pass 1: rejected by manager visual inspection. Build/provenance/proof were structurally valid, but B1 still read too flat, B2 remained dominated by the vertical lamp-cone composition, and B4 still exposed hard rectangular bitmap bounds.
- 2026-07-04 revision1 proof-preview: rejected by manager visual inspection before completion report. `proof-revision1/contact-sheet.png` exists, but `report-revision1.md` is absent. B1 is improved but still mostly flat/tiling-prone, B2 remains a near-unchanged lamp shaft, and B4 still shows the bright rectangular ruin/window. Continue the active revision worker into revision2 instead of stopping.
- 2026-07-04 revision2: accepted by manager visual inspection after individual PNG and contact sheet review. B1 now reads as layered shallow water, B2 has a real horizontal sediment/brine field beyond the lamp cone, B3 remains readable instead of blank/lamp-only, and B4 is dimmed/veiled enough to avoid the rejected bright hard-crop read. Build passed per `report-revision2.md`; proof is actual normal gameplay `#game canvas`.

## Acceptance Rule

Manager visual inspection is required before acceptance. Worker self-verdicts, metrics, asset loaded status, and build success are supporting evidence only.

Required proof:
- Actual normal gameplay `#game canvas`, not asset previews or contact-sheet-only evidence.
- Color and grayscale before/after captures at:
  - B1 surface 119 m
  - B1 upper 180 m
  - B2 mid 760 m
  - B3 lower 1260 m
  - B4 lower 1260 m
- Provenance must include HEAD, git status before/after, port in 5180-5199, viewport, source selector, biome/depth, active band, visible water-column textures/layers, alpha, offsets/drift, and loaded status.
- Inspect individual PNGs first, then the contact sheet.

Reject if:
- water still reads as a flat gradient or empty color field
- effects obscure player, ore, terrain, enemies, sonar, mining targets, or HUD-critical in-canvas state
- caustics remain strong in deep bands
- texture tiling/repetition is obvious
- grayscale readability collapses
- B2 reverts to vertical shaft/chimney/lamp-cone read
- B3 becomes blank or lamp-only
- B4 shows hard rectangular bitmap bounds
- proof is not live `#game canvas`

## Notes

The repo is already dirty from landmark/runtime work. The worker must preserve unrelated dirty work and must not commit or broad-stage anything.

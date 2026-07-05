# Water9 Fauna Animation Appraisal - 2026-07-05

## Goal

Appraise the 100 newly added `fauna-exp-*` runtime fauna against established neutral fauna such as Nautilus, cuttlefish, and squid, with emphasis on frame quality, live `#game canvas` readability, and whether the new fauna were acceptable as shipped.

## Checklist

- [x] Runtime inventory - expected artifacts: `runs/water9-fauna-animation-appraisal-2026-07-05/inventory-runtime-report.md`, `runs/water9-fauna-animation-appraisal-2026-07-05/fauna-runtime-inventory.json` - verified and reported 2026-07-05.
- [x] Static frame audit - expected artifacts: `runs/water9-fauna-animation-appraisal-2026-07-05/frame-quality-report.md`, `runs/water9-fauna-animation-appraisal-2026-07-05/frame-quality-metrics.json`, `runs/water9-fauna-animation-appraisal-2026-07-05/frame-proof/` - verified and reported 2026-07-05.
- [x] Articulated/runtime motion audit - expected artifacts: `runs/water9-fauna-animation-appraisal-2026-07-05/articulated-motion-report.md`, `runs/water9-fauna-animation-appraisal-2026-07-05/articulated-proof/` - verified and reported 2026-07-05.
- [x] Live normal-play `#game canvas` proof - session key `agent:mgr-water9:subagent:64ec0482-c97b-4fbd-925d-9aba54c3ae64` - expected artifacts: `runs/water9-fauna-animation-appraisal-2026-07-05/live-canvas-report.md`, `runs/water9-fauna-animation-appraisal-2026-07-05/live-canvas-summary.json`, `runs/water9-fauna-animation-appraisal-2026-07-05/live-canvas-captures/` - verified 2026-07-05; superseded by the accepted upgrade pass.
- [x] Manager synthesis - original appraisal rejected the new fauna animation quality and led directly to `runs/water9-fauna-animation-upgrade-2026-07-05.md`.

## Acceptance Rule

Acceptance required runtime inventory proof, static frame proof, grayscale readability proof, actual normal-play `#game canvas` captures across representative depth bands, and manager visual inspection against Nautilus/squid/cuttlefish benchmarks. Metrics and worker verdicts were supporting evidence only.

## Manager Notes

- 2026-07-05: Runtime inventory confirmed 138 normal-gameplay fish entries, including 100 `fauna-exp-*` entries with manifests/base PNGs, plus 37 articulated manifest entries. Risk was visual quality, not missing runtime integration.
- 2026-07-05: Static audit found the new/modified fauna sets used 3 frames and many read as static paintings with tiny warps or tail twitches. Named weak cases included Nacre Thorn Clam, Saffron Paddle Cuttle, Prism Bell Jelly, Snowcap Snailfish, Lumen Brow Barreleye, and Glass Helm Nautilus.
- 2026-07-05: Articulated audit did not accept articulated fauna for the content gate. There were 37 articulated manifests, but validation failures and spawn-budget misses remained.
- 2026-07-05: Late live-canvas proof verified on disk after the upgrade pass was already accepted. It captured 336 indexed runtime frames, produced color/grayscale contact sheets, and reinforced the original rejection: benchmarks remained more readable at gameplay scale, while many pre-upgrade `fauna-exp-*` entries looked stiff, slid, or collapsed in grayscale. This finding is historical and superseded by the accepted 4-frame upgrade documented in `runs/water9-fauna-animation-upgrade-2026-07-05.md`.

# Water9 Blue Ring Octopus Runtime Motion Fix - 2026-07-08

Goal: Blue Ring Octopus in Biome 1 should visibly animate during normal gameplay instead of reading static to Alex.

Checklist:
- [x] runtime-motion-fix — session `water9-blue-ring-octopus-runtime-motion-fix-2026-07-08`, run `b90d3465-c91b-4983-8f37-f1110d4238df`, child `agent:mgr-water9:subagent:38036bc4-46e0-4e43-bc13-d46698e7ec23` — expected artifacts:
  - `runs/water9-blue-ring-octopus-runtime-motion-fix-2026-07-08/worker-report.md`
  - live `#game canvas` before/after or current/fixed proof captures
  - same-octopus animation sequence/contact sheet at gameplay scale
  - grayscale readability proof
  - focused smoke JSON proving frame advancement / visible motion

Acceptance rule:
- Reproduce the current static-looking Blue Ring Octopus issue in normal Biome 1 gameplay before fixing, or explain precisely why the current proof is insufficient.
- Fix the runtime behavior and/or sprite frames so the Blue Ring Octopus reads as visibly alive at normal gameplay scale.
- Proof must come from actual live `#game canvas` captures in Biome 1 normal play, tracking the same Blue Ring Octopus across multiple timestamps.
- Include a grayscale pass and a numeric/visual diff showing meaningful motion between frames.
- The motion must be stronger than the previous compact crawl/breath pass: visible arm/tentacle crawl, mantle pulse, ring shimmer, or swimming/body bob must be apparent in a contact sheet without relying on zoom-only crops.
- Preserve Blue Ring Octopus identity and avoid jitter, anchor drift, or silhouette popping.

Parent verification:
- 2026-07-08: `npm run build` PASS.
- 2026-07-08: focused smoke PASS after parent harness fix, output in `runs/water9-blue-ring-octopus-runtime-motion-fix-2026-07-08/parent-verify-2/`.
- Runtime frame sequence: `2 -> 0 -> 1 -> 3`; max grayscale changed ratio `0.6431`; max mean luma delta `19.324`.
- Visual contact sheets inspected in color and grayscale.
- REPORTED 2026-07-08

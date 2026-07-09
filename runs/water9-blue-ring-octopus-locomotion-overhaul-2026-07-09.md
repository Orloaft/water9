# Blue Ring Octopus Locomotion Overhaul - 2026-07-09

Goal: replace the current Blue Ring Octopus twitch/shimmer cycle with generated frames that read as octopus locomotion at normal gameplay scale.

Current HEAD at manager preflight: `89121a1`

Dirty-start note:
- `src/scene-playtest.ts`, `src/scene-rendering.ts`, and `tools/test_blue_ring_octopus_animation_smoke.mjs` already contain the previous runtime-clock fix.
- Previous proof/run folders are untracked.
- This worker must preserve unrelated dirt and only change Blue Ring Octopus generated/source assets, manifests, focused proof artifacts, and any narrowly required generation helper.

Checklist:
- [x] `blue-ring-octopus-locomotion-v1` — session key `agent:mgr-water9:subagent:eb4ca74a-fcc9-4fff-bc39-ac0e2e8648e6`, run id `24fc21a4-16e0-47dd-819a-bbb4a1fad3b7` — VERIFIED 2026-07-09; REPORTED 2026-07-09 — expected artifacts:
  - `/mnt/nxt-dev/water9/runs/water9-blue-ring-octopus-locomotion-overhaul-2026-07-09/worker-report.md`
  - before/after frame sheet or GIF proving silhouette movement
  - updated runtime frame PNGs and spritesheet/manifests if accepted by worker
  - normal-play `#game canvas` screenshots/crops in color and grayscale
  - focused smoke JSON

Parent verification:
- Visual inspection accepted `/mnt/nxt-dev/water9/runs/water9-blue-ring-octopus-locomotion-overhaul-2026-07-09/blue-ring-octopus-before-after-sheet.png`, the normal-play crop contact sheet, and the grayscale crop contact sheet. The old asset reads as a four-frame twitch/shimmer; the new asset reads as a six-frame octopus propulsion cycle with gather, jet elongation/trailing arms, flare, and settle poses.
- `npm run build` PASS on 2026-07-09 with the existing Vite public asset URL warnings and chunk-size warning.
- Parent focused smoke PASS on 2026-07-09 using port 5181:
  `/mnt/nxt-dev/water9/runs/water9-blue-ring-octopus-locomotion-overhaul-2026-07-09/parent-verify/blue-ring-octopus-normal-play-smoke.json`

Acceptance rule:
- Reject if the animation still reads as only a slight twitch, ring shimmer, or in-place wobble.
- Required read: an octopus propulsion cycle with clear arm gather/flare, trailing arms, mantle squeeze/elongation, and distinct silhouette changes across frames.
- Proof must use actual normal-play `#game canvas` captures in Biome 1 at gameplay scale, plus cropped contact sheets and grayscale readability proof.
- Proof must demonstrate the live runtime loaded the new generated frames, not stale source art or a procedural stand-in.
- Manager visual inspection is required before reporting accepted.

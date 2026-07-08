# Water9 Blue Ring Octopus Animation

Goal: Improve the Blue-ring Octopus so it no longer reads like a static octopus in normal gameplay; it should have visibly readable multi-frame motion comparable to the better mollusk/fauna sprites.

Status: completed and reported.

Checklist:

- [x] `blue-ring-octopus-animation-v1` — `agent:mgr-water9:subagent:aab3c89d-b601-41b6-8cd3-ab0b0796c9c7` / `7d4ae6b9-1f6f-48ce-a66d-c56d051a0ee6` — REPORTED 2026-07-08 — expected artifacts:
  - runtime asset/frame changes for `fauna-shallow-blue-ring-octopus`
  - focused proof screenshots/video/contact sheet under this run folder
  - worker report under this run folder
  - build/smoke verification results

Acceptance rule:

- Blue Ring Octopus must still read as a Blue-ring Octopus at gameplay scale: compact octopus silhouette, blue rings, hostile shallow fauna identity.
- Animation must be visibly non-static during normal play, not only in a review harness. At least two distinct frames must be readable at game scale, ideally with mantle breathing, arm curl/pulse, or ring shimmer.
- No gross jitter, size popping, anchor drift, transparent-edge artifacts, broken magenta key, or loss of collision/gameplay behavior.
- Required proof: actual `#game canvas` captures during normal play at Blue Ring spawn depths, before/after or frame-sequence proof, grayscale readability pass, and manager visual inspection before reporting accepted.
